import SwiftUI
import UIKit

struct BoomBlasterView: View {
    @ObservedObject var api: HueAPI
    @State private var lastCommand: String?
    @State private var isLoading = false

    private let buttonLayout: [(icon: String, command: String, label: String)] = [
        ("power", "power", "power"),
        ("speaker.wave.2.fill", "source", "source"),
        ("play.fill", "play_pause", "play/pause"),
        ("light.max", "lights", "lights"),
        ("backward.fill", "prev", "forrige"),
        ("forward.fill", "next", "neste"),
        ("speaker.plus.fill", "vol_up", "vol +"),
        ("speaker.minus.fill", "vol_down", "vol -"),
        ("speaker.slash.fill", "mute", "mute"),
        ("moon.fill", "sleep", "sleep"),
    ]

    var body: some View {
        VStack(spacing: 16) {
            Text("boomblaster")
                .font(.title2)
                .fontWeight(.medium)
                .foregroundStyle(Theme.first)

            Text("JVC RV-NB300DAB")
                .font(.caption)
                .foregroundStyle(Theme.second)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12)
            ], spacing: 12) {
                ForEach(buttonLayout, id: \.command) { item in
                    BoomButton(
                        icon: item.icon,
                        label: item.label,
                        isActive: lastCommand == item.command
                    ) {
                        sendCommand(item.command)
                    }
                }
            }

            if isLoading {
                ProgressView()
                    .tint(Theme.first)
                    .padding(.top, 4)
            }
        }
    }

    func sendCommand(_ command: String) {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        lastCommand = command
        isLoading = true

        Task {
            let success = await api.boomBlasterCommand(command)
            await MainActor.run {
                isLoading = false
                if !success {
                    let errorGen = UINotificationFeedbackGenerator()
                    errorGen.notificationOccurred(.error)
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    if lastCommand == command {
                        lastCommand = nil
                    }
                }
            }
        }
    }
}

struct BoomButton: View {
    let icon: String
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.title2)
                Text(label)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundStyle(Theme.first)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isActive ? Theme.first.opacity(0.15) : Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Theme.first, lineWidth: 1)
            )
        }
    }
}
