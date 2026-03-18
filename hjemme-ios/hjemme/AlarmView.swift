import SwiftUI

struct AlarmView: View {
    @ObservedObject var alarm = AlarmManager.shared
    @State private var pulse = false

    var body: some View {
        ZStack {
            // Sunrise gradient background
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.05, blue: 0.2),
                    Color(red: 0.95, green: 0.5, blue: 0.2),
                    Color(red: 0.95, green: 0.8, blue: 0.4),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 40) {
                Spacer()

                // Time display
                Text(currentTime())
                    .font(.system(size: 72, weight: .thin, design: .default))
                    .foregroundStyle(Theme.first)
                    .shadow(radius: 4)

                Text("god morgen")
                    .font(.title2)
                    .foregroundStyle(Theme.second)

                Spacer()

                // Snooze button
                Button(action: { alarm.snooze() }) {
                    Text("snooze \(alarm.snoozeDuration) min")
                        .font(.title3)
                        .foregroundStyle(Theme.first)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 16)
                        .background(
                            Capsule()
                                .fill(Theme.first.opacity(0.2))
                                .overlay(Capsule().stroke(Theme.first.opacity(0.3), lineWidth: 1))
                        )
                }

                // Dismiss button
                Button(action: { alarm.dismiss() }) {
                    Circle()
                        .fill(Theme.first.opacity(pulse ? 0.3 : 0.15))
                        .frame(width: 100, height: 100)
                        .overlay(
                            Image(systemName: "sun.max.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(Theme.first)
                        )
                        .scaleEffect(pulse ? 1.1 : 1.0)
                }
                .padding(.bottom, 60)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
        .statusBarHidden()
    }

    func currentTime() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: Date())
    }
}
