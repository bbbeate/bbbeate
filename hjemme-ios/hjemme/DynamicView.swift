import SwiftUI

private let minColors = 2
private let maxColors = 5

struct DynamicView: View {
    @ObservedObject var api: HueAPI
    @State private var error: String?

    private var config: DynamicSettings { api.settings.dynamic }

    var body: some View {
        if let rooms = api.rooms {
            VStack(spacing: 16) {
                HStack(spacing: 8) {
                    ForEach(Array(config.colors.enumerated()), id: \.offset) { i, color in
                        VStack(spacing: 4) {
                            ColorSwatch(hex: color) { newColor in
                                update { $0.colors[i] = newColor }
                            }
                            .frame(width: 52, height: 52)
                            if config.colors.count > minColors {
                                ChipButton(label: "-", active: false) { removeColor(i) }
                                    .frame(width: 52)
                            }
                        }
                    }
                    if config.colors.count < maxColors {
                        ChipButton(label: "+", active: false) { addColor() }
                            .frame(width: 52)
                    }
                }

                FlowChips(items: [("all", "alle")] + rooms.map { ($0.id, $0.name) }, isActive: { config.targets.contains($0) }) { id in
                    toggleTarget(id)
                }

                SettingRow(label: "fart", value: "\(config.speed)s") {
                    BarSlider(value: Binding(
                        get: { Double(config.speed) },
                        set: { value in update { $0.speed = Int(value) } }
                    ), range: 2...120, step: 1)
                }

                SettingRow(label: "styrke", value: "\(config.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(config.brightness) },
                        set: { value in update { $0.brightness = Int(value) } }
                    ), range: 1...100, step: 1)
                }

                ChipButton(label: api.dynamicState.running ? "stopp" : "start", active: api.dynamicState.running) {
                    Task {
                        if api.dynamicState.running {
                            await api.stopDynamicAndClear()
                        } else {
                            await start()
                        }
                    }
                }

                if let error = error {
                    Text(error).foregroundStyle(Theme.second)
                }
            }
            .padding(.horizontal, 24)
            .foregroundStyle(Theme.first)
        } else {
            ProgressView("laster...")
                .padding(.top, 48)
        }
    }

    private func start() async {
        do {
            try await api.startDynamic()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func update(_ change: (inout DynamicSettings) -> Void) {
        let previous = api.settings.dynamic
        change(&api.settings.dynamic)
        guard api.dynamicState.running, previous != api.settings.dynamic else { return }
        Task { await start() }
    }

    private func removeColor(_ i: Int) {
        update { $0.colors.remove(at: i) }
    }

    private func addColor() {
        update { $0.colors.append("#ffffff") }
    }

    private func toggleTarget(_ id: String) {
        if id == "all" {
            update { $0.targets = ["all"] }
            return
        }
        let current = config.targets.filter { $0 != "all" }
        let next = current.contains(id) ? current.filter { $0 != id } : current + [id]
        update { $0.targets = next.isEmpty ? ["all"] : next }
    }
}

struct FlowChips: View {
    let items: [(String, String)]
    let isActive: (String) -> Bool
    let onTap: (String) -> Void

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], spacing: 8) {
            ForEach(items, id: \.0) { id, label in
                ChipButton(label: label, active: isActive(id)) { onTap(id) }
            }
        }
    }
}
