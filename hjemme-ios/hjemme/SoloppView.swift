import SwiftUI

struct SoloppView: View {
    @ObservedObject var api: HueAPI
    @Binding var isPresented: ModalType?

    let presets = ["06:30", "07:00", "07:30", "08:00", "08:30", "09:00",
                   "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"]

    @State private var customTime = Date()
    @State private var showCustom = false

    var activePreset: String? {
        guard api.wakeState.enabled else { return nil }
        if presets.contains(api.wakeState.time) { return api.wakeState.time }
        return "custom"
    }

    var body: some View {
        VStack(spacing: 16) {
            Text("solopp")
                .font(.title2)
                .fontWeight(.medium)

            if api.wakeState.loading {
                ProgressView("laster...")
            } else {
                // Time presets grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                    ForEach(presets, id: \.self) { time in
                        Button(action: {
                            Task {
                                if activePreset == time {
                                    await api.setWakeTime(nil)
                                    AlarmManager.shared.cancelAlarm()
                                } else {
                                    await api.setWakeTime(time)
                                    AlarmManager.shared.syncWithWakeState(api.wakeState)
                                }
                            }
                        }) {
                            Text(time)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(activePreset == time ? Theme.first : Color.clear)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Theme.first, lineWidth: 1)
                                )
                                .foregroundStyle(activePreset == time ? Theme.background : Theme.first)
                        }
                    }
                }

                // Custom time button
                Button(action: {
                    if activePreset == "custom" {
                        Task {
                            await api.setWakeTime(nil)
                            AlarmManager.shared.cancelAlarm()
                        }
                    } else {
                        showCustom.toggle()
                    }
                }) {
                    Text(activePreset == "custom" ? api.wakeState.time : "egendefinert")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(activePreset == "custom" ? Theme.first : Color.clear)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Theme.first, lineWidth: 1)
                        )
                        .foregroundStyle(activePreset == "custom" ? Theme.background : Theme.first)
                }

                // Custom time picker
                if showCustom || activePreset == "custom" {
                    DatePicker("tid", selection: $customTime, displayedComponents: .hourAndMinute)
                        .labelsHidden()
                        .datePickerStyle(.wheel)
                        .frame(height: 100)
                        .clipped()
                        .onChange(of: customTime) {
                            let formatter = DateFormatter()
                            formatter.dateFormat = "HH:mm"
                            let timeStr = formatter.string(from: customTime)
                            Task {
                                await api.setWakeTime(timeStr)
                                AlarmManager.shared.syncWithWakeState(api.wakeState)
                            }
                        }
                }

                // Duration slider
                SettingRow(label: "varighet", value: "\(api.wakeState.duration) min") {
                    BarSlider(value: Binding(
                        get: { Double(api.wakeState.duration) },
                        set: { api.wakeState.duration = Int($0) }
                    ), range: 5...60, step: 1, onEditingChanged: {
                        Task { await api.updateWakeDuration(api.wakeState.duration) }
                    })
                }

                // Alarm status
                if api.wakeState.enabled {
                    HStack(spacing: 6) {
                        Image(systemName: "alarm.fill")
                            .foregroundStyle(Theme.first)
                        Text("alarm satt til \(api.wakeState.time)")
                            .font(.caption)
                            .foregroundStyle(Theme.second)
                    }
                    .padding(.top, 4)
                }
            }
        }
    }
}
