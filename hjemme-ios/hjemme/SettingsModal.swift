import SwiftUI
import UniformTypeIdentifiers

enum ModalType: Identifiable, Hashable {
    case off, on, night, orange, sparkle, wake, boomblaster, config
    case room(String)

    var id: Self { self }
}

struct SettingsModal: View {
    let type: ModalType
    @ObservedObject var api: HueAPI
    @Binding var isPresented: ModalType?

    var body: some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .onTapGesture { isPresented = nil }

            VStack(spacing: 16) {
                HStack {
                    Spacer()
                    Button(action: { isPresented = nil }) {
                        Image(systemName: "xmark")
                            .font(.title2)
                            .foregroundStyle(Theme.second)
                    }
                }

                content
            }
            .padding(24)
            .foregroundStyle(Theme.first)
            .background(Theme.background)
            .cornerRadius(12)
            .padding(32)
        }
    }

    @ViewBuilder
    var content: some View {
        switch type {
        case .off:
            Text("nei betyr nei")
                .font(.title2)
                .italic()
                .foregroundStyle(Theme.second)
                .padding(.vertical, 24)

        case .on:
            VStack(spacing: 12) {
                Text("\u{1F315}")
                    .font(.system(size: 48))

                AmbientSlider(mirek: api.settings.on.mirek) { mirek in
                    api.settings.on.mirek = mirek
                    Task { await api.previewMode(.on) }
                }

                SettingRow(label: "styrke", value: "\(api.settings.on.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.on.brightness) },
                        set: { api.settings.on.brightness = Int($0); Task { await api.previewMode(.on) } }
                    ), range: 1...100, step: 1)
                }
            }

        case .night:
            VStack(spacing: 12) {
                Text("\u{1F31B}")
                    .font(.system(size: 48))

                AmbientSlider(mirek: api.settings.night.mirek) { mirek in
                    api.settings.night.mirek = mirek
                    Task { await api.previewMode(.night) }
                }

                SettingRow(label: "styrke", value: "\(api.settings.night.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.night.brightness) },
                        set: { api.settings.night.brightness = Int($0); Task { await api.previewMode(.night) } }
                    ), range: 1...100, step: 1)
                }
            }

        case .orange:
            VStack(spacing: 12) {
                ColorField(hex: api.settings.orange.color) { color in
                    api.settings.orange.color = color
                    Task { await api.previewMode(.orange) }
                }

                SettingRow(label: "styrke", value: "\(api.settings.orange.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.orange.brightness) },
                        set: { api.settings.orange.brightness = Int($0); Task { await api.previewMode(.orange) } }
                    ), range: 1...100, step: 1)
                }
            }

        case .sparkle:
            VStack(spacing: 12) {
                Text("\u{2728}")
                    .font(.system(size: 48))

                AmbientSlider(mirek: api.settings.sparkle.mirek) { mirek in
                    api.settings.sparkle.mirek = mirek
                    Task { await api.previewMode(.sparkle) }
                }

                SettingRow(label: "styrke", value: "\(api.settings.sparkle.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.sparkle.brightness) },
                        set: { api.settings.sparkle.brightness = Int($0); Task { await api.previewMode(.sparkle) } }
                    ), range: 1...100, step: 1)
                }
            }

        case .wake:
            SoloppView(api: api, isPresented: $isPresented)

        case .boomblaster:
            BoomBlasterView(api: api)

        case .config:
            ConfigView()

        case .room(let roomId):
            if let room = api.rooms?.first(where: { $0.id == roomId }) {
                RoomSettingsView(api: api, room: room)
            }
        }
    }
}

struct ConfigView: View {
    @ObservedObject var alarm = AlarmManager.shared
    @State private var showFilePicker = false

    var body: some View {
        VStack(spacing: 16) {
            Text("innstillinger")
                .font(.title2)

            VStack(alignment: .leading, spacing: 12) {
                Text("alarm")
                    .font(.caption)
                    .foregroundStyle(Theme.second)

                HStack {
                    Text("sang")
                        .frame(width: 80, alignment: .leading)
                    Button(action: { showFilePicker = true }) {
                        HStack {
                            Image(systemName: "music.note")
                            Text(alarm.songName)
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Theme.first, lineWidth: 1)
                        )
                    }
                    .foregroundStyle(Theme.first)
                }

                SettingRow(label: "snooze", value: "\(alarm.snoozeDuration) min") {
                    BarSlider(value: Binding(
                        get: { Double(alarm.snoozeDuration) },
                        set: { alarm.snoozeDuration = Int($0) }
                    ), range: 1...30, step: 1)
                }

                Button(action: {
                    alarm.triggerAlarm()
                }) {
                    HStack {
                        Image(systemName: "play.circle")
                        Text("test alarm")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Theme.first, lineWidth: 1)
                    )
                }
                .foregroundStyle(Theme.first)
            }
        }
        .fileImporter(
            isPresented: $showFilePicker,
            allowedContentTypes: [.audio, .mp3, .mpeg4Audio, .wav, .aiff],
            allowsMultipleSelection: false
        ) { result in
            if case .success(let urls) = result, let url = urls.first {
                alarm.saveSongBookmark(from: url)
            }
        }
    }
}

struct SettingRow<Content: View>: View {
    let label: String
    var value: String? = nil
    @ViewBuilder let content: () -> Content

    var body: some View {
        HStack(spacing: 12) {
            Text(label)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .frame(width: 80, alignment: .leading)
            content()
            if let value = value {
                Text(value)
                    .frame(width: 40, alignment: .trailing)
                    .font(.callout)
            }
        }
    }
}
