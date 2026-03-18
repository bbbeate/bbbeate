import SwiftUI

struct ContentView: View {
    @StateObject private var api = HueAPI.shared
    @StateObject private var alarm = AlarmManager.shared
    @State private var activeModal: ModalType?
    @State private var showBoomBlaster = false

    let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        ZStack {
            if alarm.isAlarming {
                AlarmView(alarm: alarm)
                    .transition(.opacity)
            } else {
                mainView
            }
        }
        .animation(.easeInOut(duration: 0.3), value: alarm.isAlarming)
        .task {
            async let s: () = api.loadSettings()
            async let w: () = api.loadWakeState()
            _ = await (s, w)
        }
    }

    var mainView: some View {
        ZStack {
            Theme.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 12) {
                    // Main light control grid
                    LazyVGrid(columns: columns, spacing: 12) {
                        // Off
                        HueButton(
                            emoji: "\u{1F311}",
                            backgroundColor: Color(red: 0.1, green: 0.1, blue: 0.1),
                            onPress: { Task { await api.allOff() } },
                            onLongPress: { activeModal = .off }
                        )

                        // On
                        HueButton(
                            emoji: "\u{1F315}",
                            backgroundColor: mirekToColor(api.settings.on.mirek),
                            onPress: { Task { await api.allOn() } },
                            onLongPress: { activeModal = .on }
                        )

                        // Night
                        HueButton(
                            emoji: "\u{1F31B}",
                            backgroundColor: hexToColor(api.settings.night.color),
                            onPress: { Task { await api.nightMode() } },
                            onLongPress: { activeModal = .night }
                        )

                        // Orange
                        HueButton(
                            emoji: "",
                            backgroundColor: hexToColor(api.settings.orange.color),
                            onPress: { Task { await api.orangeMode() } },
                            onLongPress: { activeModal = .orange }
                        )

                        // Sparkle
                        HueButton(
                            emoji: "\u{2728}",
                            backgroundColor: mirekToColor(api.settings.sparkle.mirek),
                            onPress: { Task { await api.sparkleMode() } },
                            onLongPress: { activeModal = .sparkle }
                        )

                        // Solopp
                        SoloppButton(
                            wakeState: api.wakeState,
                            onPress: { activeModal = .wake }
                        )
                    }
                    .padding(.horizontal, 12)

                    // BoomBlaster toggle
                    Button(action: { withAnimation { showBoomBlaster.toggle() } }) {
                        HStack {
                            Image(systemName: "hifispeaker.2.fill")
                            Text("boomblaster")
                        }
                        .font(.callout)
                        .foregroundStyle(Theme.second)
                        .padding(.vertical, 12)
                    }

                    if showBoomBlaster {
                        BoomBlasterView(api: api)
                            .padding(.horizontal, 12)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    // Config button
                    Button(action: { activeModal = .config }) {
                        Image(systemName: "gearshape")
                            .font(.callout)
                            .foregroundStyle(Theme.second)
                            .padding(.vertical, 8)
                    }
                }
                .padding(.vertical, 12)
            }

            // Modal overlay
            if let modal = activeModal {
                SettingsModal(type: modal, api: api, isPresented: $activeModal)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: activeModal)
    }
}

#Preview {
    ContentView()
        .preferredColorScheme(.dark)
}
