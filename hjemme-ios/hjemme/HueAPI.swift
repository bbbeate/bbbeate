import Foundation
import SwiftUI

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

    @Published var settings: LightSettings {
        didSet { if settingsLoaded { scheduleSave() } }
    }
    @Published var wakeState = WakeState()
    @Published var rooms: [Room]? = nil
    @Published var dynamicState = DynamicState()

    private var settingsLoaded = false
    private var rawSettings: [String: Any] = [:]
    private var saveTask: Task<Void, Never>?
    private var inflight = Set<String>()
    private var pending: [String: [String: Any]] = [:]
    private let liveTransition: [String: Any] = ["duration": 100]

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

    @MainActor
    func livePut(_ path: String, body: [String: Any]) {
        if inflight.contains(path) {
            pending[path] = body
            return
        }
        inflight.insert(path)
        Task { @MainActor in
            _ = try? await hueRequest("PUT", path: path, body: body)
            inflight.remove(path)
            if let next = pending.removeValue(forKey: path) {
                livePut(path, body: next)
            }
        }
    }

    // MARK: - Light modes

    func ambientBody(mirek: Int, brightness: Int) -> [String: Any] {
        [
            "on": ["on": true],
            "dimming": ["brightness": brightness],
            "color_temperature": ["mirek": mirek]
        ]
    }

    func colorBody(hex: String, brightness: Int) -> [String: Any] {
        let xy = hexToXy(hex)
        return [
            "on": ["on": true],
            "dimming": ["brightness": brightness],
            "color": ["xy": ["x": xy.x, "y": xy.y]]
        ]
    }

    func modeBody(_ mode: ModalType) -> [String: Any] {
        switch mode {
        case .on: return ambientBody(mirek: settings.on.mirek, brightness: settings.on.brightness)
        case .night: return ambientBody(mirek: settings.night.mirek, brightness: settings.night.brightness)
        case .orange: return colorBody(hex: settings.orange.color, brightness: settings.orange.brightness)
        case .sparkle: return ambientBody(mirek: settings.sparkle.mirek, brightness: settings.sparkle.brightness)
        default: preconditionFailure("no light body for \(mode)")
        }
    }

    func allOff() async {
        await releaseDynamic()
        await hueCommand(["on": ["on": false]])
    }

    func allOn() async {
        await releaseDynamic()
        await hueCommand(modeBody(.on))
    }

    func nightMode() async {
        await releaseDynamic()
        await hueCommand(modeBody(.night))
    }

    func orangeMode() async {
        await releaseDynamic()
        await hueCommand(modeBody(.orange))
    }

    func sparkleMode() async {
        await releaseDynamic()
        let nattlysBody = modeBody(.sparkle)
        _ = await hueCommand(["on": ["on": false]])
        async let l1 = lightCommand(nattlys1, body: nattlysBody)
        async let l2 = lightCommand(nattlys2, body: nattlysBody)
        _ = await (l1, l2)
    }

    @MainActor
    func previewMode(_ mode: ModalType) async {
        await releaseDynamic()
        var body = modeBody(mode)
        body["dynamics"] = liveTransition
        if mode == .sparkle {
            livePut("/light/\(nattlys1)", body: body)
            livePut("/light/\(nattlys2)", body: body)
        } else {
            livePut("/grouped_light/\(allLightsGroup)", body: body)
        }
    }

    // MARK: - Rooms

    func fetchRooms() async {
        guard let roomsRes = try? await hueRequest("GET", path: "/room"),
              let groupsRes = try? await hueRequest("GET", path: "/grouped_light"),
              let roomData = roomsRes["data"] as? [[String: Any]],
              let groupData = groupsRes["data"] as? [[String: Any]] else { return }
        let groupById = Dictionary(uniqueKeysWithValues: groupData.compactMap { g in
            (g["id"] as? String).map { ($0, g) }
        })
        let parsed: [Room] = roomData.compactMap { room in
            guard let id = room["id"] as? String,
                  let name = (room["metadata"] as? [String: Any])?["name"] as? String,
                  let services = room["services"] as? [[String: Any]],
                  let groupRid = services.first(where: { $0["rtype"] as? String == "grouped_light" })?["rid"] as? String,
                  let group = groupById[groupRid] else {
                print("[hue] skipping unparseable room: \(room["id"] ?? "?")")
                return nil
            }
            let on = (group["on"] as? [String: Any])?["on"] as? Bool ?? false
            let brightness = (group["dimming"] as? [String: Any])?["brightness"] as? Double ?? 100
            return Room(id: id, name: name, groupRid: groupRid, on: on, brightness: Int(brightness.rounded()))
        }
        await MainActor.run { rooms = parsed }
    }

    func roomSetting(_ roomId: String) -> RoomSetting {
        settings.rooms[roomId] ?? RoomSetting()
    }

    @MainActor
    private func patchRoom(_ roomId: String, _ patch: (inout Room) -> Void) {
        guard let index = rooms?.firstIndex(where: { $0.id == roomId }) else { return }
        patch(&rooms![index])
    }

    @MainActor
    private func sendRoom(_ room: Room, body: [String: Any]) async {
        await releaseDynamic(room.groupRid)
        var live = body
        live["dynamics"] = liveTransition
        livePut("/grouped_light/\(room.groupRid)", body: live)
    }

    @MainActor
    func toggleRoom(_ room: Room) async {
        patchRoom(room.id) { $0.on = !room.on }
        await sendRoom(room, body: ["on": ["on": !room.on]])
    }

    @MainActor
    func updateRoomLight(_ room: Room, _ change: (inout RoomSetting) -> Void) async {
        var setting = roomSetting(room.id)
        change(&setting)
        settings.rooms[room.id] = setting
        patchRoom(room.id) { $0.on = true }
        var body: [String: Any] = ["on": ["on": true]]
        switch setting.mode {
        case .ambient:
            body["color_temperature"] = ["mirek": setting.mirek]
        case .color:
            let xy = hexToXy(setting.color)
            body["color"] = ["xy": ["x": xy.x, "y": xy.y]]
        }
        await sendRoom(room, body: body)
    }

    @MainActor
    func setRoomBrightness(_ room: Room, _ brightness: Int) async {
        patchRoom(room.id) { $0.on = true; $0.brightness = brightness }
        await sendRoom(room, body: ["on": ["on": true], "dimming": ["brightness": brightness]])
    }

    // MARK: - Dynamic (color cycle runs on the pi)

    func loadDynamicState() async {
        guard let url = URL(string: "\(baseURL)/api/dynamic"),
              let (data, _) = try? await session.data(from: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        let state = DynamicState(running: json["running"] as? Bool ?? false, targets: json["targets"] as? [String] ?? [])
        await MainActor.run { dynamicState = state }
    }

    func dynamicTargets(_ targets: [String]) throws -> [String] {
        if targets.contains("all") { return [allLightsGroup] }
        return try targets.map { id in
            guard let room = rooms?.first(where: { $0.id == id }) else {
                throw DynamicError.message("rom finnes ikke lenger: \(id)")
            }
            return room.groupRid
        }
    }

    @MainActor
    func startDynamic() async throws {
        let config = settings.dynamic
        let targets = try dynamicTargets(config.targets)
        guard let url = URL(string: "\(baseURL)/api/dynamic") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "colors": config.colors,
            "targets": targets,
            "speed": config.speed,
            "brightness": config.brightness
        ])
        let (data, response) = try await session.data(for: request)
        if (response as? HTTPURLResponse)?.statusCode != 200 {
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            throw DynamicError.message(json?["error"] as? String ?? "kunne ikke starte")
        }
        dynamicState = DynamicState(running: true, targets: targets)
    }

    func stopDynamic() async {
        guard let url = URL(string: "\(baseURL)/api/dynamic") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        _ = try? await session.data(for: request)
    }

    @MainActor
    func stopDynamicAndClear() async {
        dynamicState = DynamicState()
        await stopDynamic()
    }

    func releaseDynamic(_ groupRid: String? = nil) async {
        let state = await MainActor.run { dynamicState }
        guard state.running else { return }
        let overlaps = (groupRid.map { state.targets.contains($0) } ?? true) || state.targets.contains(allLightsGroup)
        guard overlaps else { return }
        await stopDynamicAndClear()
    }

    // MARK: - Settings persistence (via Pi API)

    func loadSettings() async {
        guard let url = URL(string: "\(baseURL)/api/settings"),
              let (data, _) = try? await session.data(from: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        await MainActor.run {
            rawSettings = json
            settings = LightSettings(json: json)
            settingsLoaded = true
        }
    }

    private func scheduleSave() {
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(nanoseconds: 400_000_000)
            guard !Task.isCancelled else { return }
            await saveSettings()
        }
    }

    func saveSettings() async {
        guard let url = URL(string: "\(baseURL)/api/settings") else { return }
        let payload = await MainActor.run { () -> [String: Any] in
            rawSettings.merge(settings.json) { _, new in new }
            return rawSettings
        }
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

struct NightSettings {
    var mirek = 454
    var brightness = 27
}

struct SparkleSettings {
    var mirek: Int = 300
    var brightness: Int = 50
}

enum LightMode: String {
    case ambient, color
}

struct RoomSetting {
    var mode: LightMode = .ambient
    var color: String = "#ffcc66"
    var mirek: Int = 300

    init() {}

    init(json: Any) {
        if let legacyColor = json as? String {
            mode = .color
            color = legacyColor
            return
        }
        guard let dict = json as? [String: Any] else { return }
        if let raw = dict["mode"] as? String {
            guard let parsed = LightMode(rawValue: raw) else { preconditionFailure("unknown room mode: \(raw)") }
            mode = parsed
        }
        color = dict["color"] as? String ?? color
        mirek = dict["mirek"] as? Int ?? mirek
    }

    var json: [String: Any] {
        ["mode": mode.rawValue, "color": color, "mirek": mirek]
    }

    var displayColor: Color {
        mode == .ambient ? mirekToColor(mirek) : hexToColor(color)
    }
}

struct DynamicSettings: Equatable {
    var colors = ["#ff0066", "#6600ff", "#00ccff"]
    var targets = ["all"]
    var speed = 10
    var brightness = 70
}

struct LightSettings {
    var on = OnSettings()
    var night = NightSettings()
    var orange = ColorSettings(color: "#ff6600", brightness: 100)
    var sparkle = SparkleSettings()
    var rooms: [String: RoomSetting] = [:]
    var dynamic = DynamicSettings()

    init() {}

    init(json: [String: Any]) {
        if let on = json["on"] as? [String: Any] {
            self.on.mirek = on["mirek"] as? Int ?? self.on.mirek
            self.on.brightness = on["brightness"] as? Int ?? self.on.brightness
        }
        if let night = json["night"] as? [String: Any] {
            self.night.mirek = night["mirek"] as? Int ?? self.night.mirek
            self.night.brightness = night["brightness"] as? Int ?? self.night.brightness
        }
        if let orange = json["orange"] as? [String: Any] {
            self.orange.color = orange["color"] as? String ?? self.orange.color
            self.orange.brightness = orange["brightness"] as? Int ?? self.orange.brightness
        }
        if let sparkle = json["sparkle"] as? [String: Any] {
            self.sparkle.mirek = sparkle["mirek"] as? Int ?? self.sparkle.mirek
            self.sparkle.brightness = sparkle["brightness"] as? Int ?? self.sparkle.brightness
        }
        if let rooms = json["rooms"] as? [String: Any] {
            self.rooms = rooms.mapValues { RoomSetting(json: $0) }
        }
        if let dynamic = json["dynamic"] as? [String: Any] {
            self.dynamic.colors = dynamic["colors"] as? [String] ?? self.dynamic.colors
            self.dynamic.targets = dynamic["targets"] as? [String] ?? self.dynamic.targets
            self.dynamic.speed = dynamic["speed"] as? Int ?? self.dynamic.speed
            self.dynamic.brightness = dynamic["brightness"] as? Int ?? self.dynamic.brightness
        }
    }

    var json: [String: Any] {
        [
            "on": ["mirek": on.mirek, "brightness": on.brightness],
            "night": ["mirek": night.mirek, "brightness": night.brightness],
            "orange": ["color": orange.color, "brightness": orange.brightness],
            "sparkle": ["mirek": sparkle.mirek, "brightness": sparkle.brightness],
            "rooms": rooms.mapValues { $0.json },
            "dynamic": [
                "colors": dynamic.colors,
                "targets": dynamic.targets,
                "speed": dynamic.speed,
                "brightness": dynamic.brightness
            ]
        ]
    }
}

struct Room: Identifiable {
    let id: String
    let name: String
    let groupRid: String
    var on: Bool
    var brightness: Int
}

struct DynamicState {
    var running = false
    var targets: [String] = []
}

enum DynamicError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        if case .message(let text) = self { return text }
        return nil
    }
}

struct WakeState {
    var enabled = false
    var time = "07:00"
    var duration = 27
    var instanceId: String? = nil
    var loading = true
}
