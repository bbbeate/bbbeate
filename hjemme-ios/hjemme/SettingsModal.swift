import SwiftUI
import UniformTypeIdentifiers

enum ModalType: Identifiable {
    case off, on, night, orange, sparkle, wake, boomblaster, config

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

                SettingRow(label: "ambient") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.on.mirek) },
                        set: { api.settings.on.mirek = Int($0) }
                    ), range: 153...500, step: 1, onEditingChanged: {
                        Task { await api.saveSettings() }
                    })
                }
                HStack {
                    Text("kald").font(.caption).foregroundStyle(Theme.second)
                    Spacer()
                    Text("varm").font(.caption).foregroundStyle(Theme.second)
                }
                .padding(.horizontal, 70)
                .padding(.top, -8)

                SettingRow(label: "styrke", value: "\(api.settings.on.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.on.brightness) },
                        set: { api.settings.on.brightness = Int($0) }
                    ), range: 1...100, step: 1, onEditingChanged: {
                        Task { await api.saveSettings() }
                    })
                }
            }

        case .night:
            VStack(spacing: 12) {
                Text("\u{1F31B}")
                    .font(.system(size: 48))

                SettingRow(label: "farge") {
                    ColorPicker("", selection: Binding(
                        get: { hexToColor(api.settings.night.color) },
                        set: { api.settings.night.color = colorToHex($0) }
                    ))
                    .labelsHidden()
                }

                SettingRow(label: "styrke", value: "\(api.settings.night.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.night.brightness) },
                        set: { api.settings.night.brightness = Int($0) }
                    ), range: 1...100, step: 1, onEditingChanged: {
                        Task { await api.saveSettings() }
                    })
                }
            }

        case .orange:
            VStack(spacing: 12) {
                SettingRow(label: "farge") {
                    ColorPicker("", selection: Binding(
                        get: { hexToColor(api.settings.orange.color) },
                        set: { api.settings.orange.color = colorToHex($0) }
                    ))
                    .labelsHidden()
                }

                SettingRow(label: "styrke", value: "\(api.settings.orange.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.orange.brightness) },
                        set: { api.settings.orange.brightness = Int($0) }
                    ), range: 1...100, step: 1, onEditingChanged: {
                        Task { await api.saveSettings() }
                    })
                }
            }

        case .sparkle:
            VStack(spacing: 12) {
                Text("\u{2728}")
                    .font(.system(size: 48))

                SettingRow(label: "ambient") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.sparkle.mirek) },
                        set: { api.settings.sparkle.mirek = Int($0) }
                    ), range: 153...500, step: 1, onEditingChanged: {
                        Task { await api.saveSettings() }
                    })
                }
                HStack {
                    Text("kald").font(.caption).foregroundStyle(Theme.second)
                    Spacer()
                    Text("varm").font(.caption).foregroundStyle(Theme.second)
                }
                .padding(.horizontal, 70)
                .padding(.top, -8)

                SettingRow(label: "styrke", value: "\(api.settings.sparkle.brightness)%") {
                    BarSlider(value: Binding(
                        get: { Double(api.settings.sparkle.brightness) },
                        set: { api.settings.sparkle.brightness = Int($0) }
                    ), range: 1...100, step: 1, onEditingChanged: {
                        Task { await api.saveSettings() }
                    })
                }
            }

        case .wake:
            SoloppView(api: api, isPresented: $isPresented)

        case .boomblaster:
            BoomBlasterView(api: api)

        case .config:
            ConfigView()
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
                .frame(width: 60, alignment: .leading)
            content()
            if let value = value {
                Text(value)
                    .frame(width: 40, alignment: .trailing)
                    .font(.callout)
            }
        }
    }
}
