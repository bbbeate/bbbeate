import SwiftUI

private let offColor = Color(red: 0.1, green: 0.1, blue: 0.1)

struct RoomsView: View {
    @ObservedObject var api: HueAPI
    let onOpen: (Room) -> Void

    let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        if let rooms = api.rooms {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(rooms) { room in
                    let color = api.roomSetting(room.id).displayColor
                    HueButton(
                        emoji: room.name,
                        backgroundColor: room.on ? color : offColor,
                        onPress: { Task { await api.toggleRoom(room) } },
                        onLongPress: { onOpen(room) },
                        fontSize: 36,
                        textColor: room.on ? offColor : color
                    )
                }
            }
            .padding(.horizontal, 12)
        } else {
            ProgressView("laster...")
                .padding(.top, 48)
        }
    }
}

struct RoomSettingsView: View {
    @ObservedObject var api: HueAPI
    let room: Room

    var body: some View {
        let setting = api.roomSetting(room.id)
        VStack(spacing: 12) {
            Text(room.name)
                .font(.system(size: 36))

            ModeSwitch(mode: setting.mode) { mode in
                Task { await api.updateRoomLight(room) { $0.mode = mode } }
            }

            switch setting.mode {
            case .ambient:
                AmbientSlider(mirek: setting.mirek) { mirek in
                    Task { await api.updateRoomLight(room) { $0.mirek = mirek } }
                }
            case .color:
                ColorField(hex: setting.color) { color in
                    Task { await api.updateRoomLight(room) { $0.color = color } }
                }
            }

            SettingRow(label: "styrke", value: "\(room.brightness)%") {
                BarSlider(value: Binding(
                    get: { Double(room.brightness) },
                    set: { value in Task { await api.setRoomBrightness(room, Int(value)) } }
                ), range: 1...100, step: 1)
            }
        }
    }
}

struct ChipButton: View {
    let label: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .foregroundStyle(active ? Theme.background : Theme.first)
                .background(active ? Theme.first : Theme.background)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.first, lineWidth: 1))
                .cornerRadius(8)
        }
    }
}
