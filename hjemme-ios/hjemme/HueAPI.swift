import Foundation

class HueAPI: ObservableObject {
    static let shared = HueAPI()

    // Pi tunnel base URL - all requests go through here
    let baseURL = "https://hjemme.bbbeate.space"

    // Hue resource IDs
    let allLightsGroup = "3f7d742d-7bbe-4abc-bc4e-593fe15783de"
    let nattlys1 = "d539b9a8-8ece-4a4b-838b-354ae5375b37"
    let nattlys2 = "3d005f56-dbae-486a-afaf-feb45b657b2d"
    let wakeName = "hjemme solopp"

    // Hue API key (from Secrets.swift, gitignored)
    let hueUsername = Secrets.hueApiKey

    @Published var settings: LightSettings
    @Published var wakeState = WakeState()

    init() {
        self.settings = LightSettings()
    }

    // MARK: - Hue API v2

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 15
        return URLSession(configuration: config)
    }()

    func hueRequest(_ method: String, path: String, body: [String: Any]? = nil) async throws -> [String: Any] {
        let url = URL(string: "\(baseURL)/hue-api/clip/v2/resource\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(hueUsername, forHTTPHeaderField: "hue-application-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        print("[hue] \(method) \(path)")
        do {
            let (data, response) = try await session.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            print("[hue] \(method) \(path) -> \(status) (\(data.count) bytes)")
            if status >= 400 {
                print("[hue] body: \(String(data: data, encoding: .utf8) ?? "?")")
            }
            return (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        } catch {
            print("[hue] \(method) \(path) FAILED: \(error)")
            throw error
        }
    }

    @discardableResult
    func hueCommand(_ body: [String: Any]) async -> [String: Any]? {
        try? await hueRequest("PUT", path: "/grouped_light/\(allLightsGroup)", body: body)
    }

    @discardableResult
    func lightCommand(_ lightId: String, body: [String: Any]) async -> [String: Any]? {
        try? await hueRequest("PUT", path: "/light/\(lightId)", body: body)
    }

    // MARK: - Light modes

    func allOff() async {
        await hueCommand(["on": ["on": false]])
    }

    func allOn() async {
        await hueCommand([
            "on": ["on": true],
            "dimming": ["brightness": settings.on.brightness],
            "color_temperature": ["mirek": settings.on.mirek]
        ])
    }

    func nightMode() async {
        let xy = hexToXy(settings.night.color)
        await hueCommand([
            "on": ["on": true],
            "dimming": ["brightness": settings.night.brightness],
            "color": ["xy": ["x": xy.x, "y": xy.y]]
        ])
    }

    func orangeMode() async {
        let xy = hexToXy(settings.orange.color)
        await hueCommand([
            "on": ["on": true],
            "dimming": ["brightness": settings.orange.brightness],
            "color": ["xy": ["x": xy.x, "y": xy.y]]
        ])
    }

    func sparkleMode() async {
        let nattlysBody: [String: Any] = [
            "on": ["on": true],
            "dimming": ["brightness": settings.sparkle.brightness],
            "color_temperature": ["mirek": settings.sparkle.mirek]
        ]
        _ = await hueCommand(["on": ["on": false]])
        async let l1 = lightCommand(nattlys1, body: nattlysBody)
        async let l2 = lightCommand(nattlys2, body: nattlysBody)
        _ = await (l1, l2)
    }

    // MARK: - Settings persistence (via Pi API)

    func loadSettings() async {
        guard let url = URL(string: "\(baseURL)/api/settings") else { return }
        do {
            let (data, _) = try await session.data(from: url)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                await MainActor.run {
                    if let on = json["on"] as? [String: Any] {
                        settings.on.mirek = on["mirek"] as? Int ?? 300
                        settings.on.brightness = on["brightness"] as? Int ?? 100
                    }
                    if let night = json["night"] as? [String: Any] {
                        settings.night.color = night["color"] as? String ?? "#ff9933"
                        settings.night.brightness = night["brightness"] as? Int ?? 27
                    }
                    if let orange = json["orange"] as? [String: Any] {
                        settings.orange.color = orange["color"] as? String ?? "#ff6600"
                        settings.orange.brightness = orange["brightness"] as? Int ?? 100
                    }
                    if let sparkle = json["sparkle"] as? [String: Any] {
                        settings.sparkle.mirek = sparkle["mirek"] as? Int ?? 300
                        settings.sparkle.brightness = sparkle["brightness"] as? Int ?? 50
                    }
                }
            }
        } catch {}
    }

    func saveSettings() async {
        guard let url = URL(string: "\(baseURL)/api/settings") else { return }
        let payload: [String: Any] = [
            "on": ["mirek": settings.on.mirek, "brightness": settings.on.brightness],
            "night": ["color": settings.night.color, "brightness": settings.night.brightness],
            "orange": ["color": settings.orange.color, "brightness": settings.orange.brightness],
            "sparkle": ["mirek": settings.sparkle.mirek, "brightness": settings.sparkle.brightness]
        ]
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        _ = try? await session.data(for: request)
    }

    // MARK: - Solopp (wake-up light)

    func loadWakeState() async {
        do {
            let instances = try await hueRequest("GET", path: "/behavior_instance")
            guard let data = instances["data"] as? [[String: Any]] else { return }
            let instance = data.first { item in
                (item["metadata"] as? [String: Any])?["name"] as? String == wakeName
            }

            if let instance = instance,
               let cfg = instance["configuration"] as? [String: Any],
               let when = cfg["when"] as? [String: Any],
               let timePoint = when["time_point"] as? [String: Any],
               let time = timePoint["time"] as? [String: Any],
               let hour = time["hour"] as? Int,
               let minute = time["minute"] as? Int,
               let fadeIn = cfg["fade_in_duration"] as? [String: Any],
               let seconds = fadeIn["seconds"] as? Int,
               let id = instance["id"] as? String {
                let enabled = instance["enabled"] as? Bool ?? false
                let timeStr = String(format: "%02d:%02d", hour, minute)
                let duration = seconds / 60

                await MainActor.run {
                    wakeState = WakeState(
                        enabled: enabled,
                        time: timeStr,
                        duration: duration,
                        instanceId: id,
                        loading: false
                    )
                }
            } else {
                // Create new instance
                await createWakeInstance()
            }
        } catch {
            await MainActor.run { wakeState.loading = false }
        }
    }

    private func createWakeInstance() async {
        do {
            let scripts = try await hueRequest("GET", path: "/behavior_script")
            guard let data = scripts["data"] as? [[String: Any]] else {
                await MainActor.run { wakeState.loading = false }
                return
            }
            let wakeScript = data.first { item in
                (item["description"] as? String)?.contains("wake up") == true
            }
            guard let scriptId = wakeScript?["id"] as? String else {
                await MainActor.run { wakeState.loading = false }
                return
            }

            let body: [String: Any] = [
                "type": "behavior_instance",
                "script_id": scriptId,
                "enabled": false,
                "metadata": ["name": wakeName],
                "configuration": [
                    "end_brightness": 100,
                    "fade_in_duration": ["seconds": 27 * 60],
                    "style": "basic",
                    "when": [
                        "time_point": [
                            "type": "time",
                            "time": ["hour": 7, "minute": 0]
                        ]
                    ],
                    "where": [["group": ["rid": allLightsGroup, "rtype": "zone"]]]
                ]
            ]

            let res = try await hueRequest("POST", path: "/behavior_instance", body: body)
            if let resData = res["data"] as? [[String: Any]],
               let rid = resData.first?["rid"] as? String {
                await MainActor.run {
                    wakeState = WakeState(
                        enabled: false,
                        time: "07:00",
                        duration: 27,
                        instanceId: rid,
                        loading: false
                    )
                }
            } else {
                await MainActor.run { wakeState.loading = false }
            }
        } catch {
            await MainActor.run { wakeState.loading = false }
        }
    }

    func setWakeTime(_ time: String?) async {
        guard let instanceId = wakeState.instanceId else { return }

        if time == nil {
            _ = try? await hueRequest("PUT", path: "/behavior_instance/\(instanceId)", body: ["enabled": false])
            await MainActor.run { wakeState.enabled = false }
            return
        }

        do {
            let current = try await hueRequest("GET", path: "/behavior_instance/\(instanceId)")
            guard let data = current["data"] as? [[String: Any]],
                  var cfg = data.first?["configuration"] as? [String: Any] else { return }

            let parts = time!.split(separator: ":").map { Int($0) ?? 0 }
            if var when = cfg["when"] as? [String: Any],
               var timePoint = when["time_point"] as? [String: Any] {
                timePoint["time"] = ["hour": parts[0], "minute": parts[1]]
                when["time_point"] = timePoint
                cfg["when"] = when
            }

            _ = try await hueRequest("PUT", path: "/behavior_instance/\(instanceId)", body: [
                "enabled": true,
                "configuration": cfg
            ])

            await MainActor.run {
                wakeState.enabled = true
                wakeState.time = time!
            }
        } catch {}
    }

    func updateWakeDuration(_ duration: Int) async {
        guard let instanceId = wakeState.instanceId else { return }
        do {
            let current = try await hueRequest("GET", path: "/behavior_instance/\(instanceId)")
            guard let data = current["data"] as? [[String: Any]],
                  var cfg = data.first?["configuration"] as? [String: Any] else { return }

            cfg["fade_in_duration"] = ["seconds": duration * 60]

            _ = try await hueRequest("PUT", path: "/behavior_instance/\(instanceId)", body: [
                "configuration": cfg
            ])

            await MainActor.run { wakeState.duration = duration }
        } catch {}
    }

    // MARK: - BoomBlaster

    func boomBlasterButtons() async -> [String] {
        guard let url = URL(string: "\(baseURL)/api/boomBlaster") else { return [] }
        do {
            let (data, _) = try await session.data(from: url)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let buttons = json["buttons"] as? [String] {
                return buttons
            }
        } catch {}
        return []
    }

    func boomBlasterCommand(_ command: String) async -> Bool {
        guard let url = URL(string: "\(baseURL)/api/boomBlaster/\(command)") else { return false }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        do {
            let (data, _) = try await session.data(for: request)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               json["ok"] as? Bool == true {
                return true
            }
        } catch {}
        return false
    }
}

// MARK: - Models

struct OnSettings {
    var mirek: Int = 300
    var brightness: Int = 100
}

struct ColorSettings {
    var color: String
    var brightness: Int

    init(color: String = "#ff9933", brightness: Int = 27) {
        self.color = color
        self.brightness = brightness
    }
}

struct SparkleSettings {
    var mirek: Int = 300
    var brightness: Int = 50
}

struct LightSettings {
    var on = OnSettings()
    var night = ColorSettings(color: "#ff9933", brightness: 27)
    var orange = ColorSettings(color: "#ff6600", brightness: 100)
    var sparkle = SparkleSettings()
}

struct WakeState {
    var enabled = false
    var time = "07:00"
    var duration = 27
    var instanceId: String? = nil
    var loading = true
}
