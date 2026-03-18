import Foundation
import AVFoundation
import UserNotifications
import UIKit

class AlarmManager: NSObject, ObservableObject {
    static let shared = AlarmManager()

    @Published var isAlarming = false
    @Published var snoozeDuration: Int {
        didSet { UserDefaults.standard.set(snoozeDuration, forKey: "snoozeDuration") }
    }
    @Published var songBookmark: Data? {
        didSet {
            if let data = songBookmark {
                UserDefaults.standard.set(data, forKey: "alarmSongBookmark")
            } else {
                UserDefaults.standard.removeObject(forKey: "alarmSongBookmark")
            }
        }
    }
    @Published var songName: String {
        didSet { UserDefaults.standard.set(songName, forKey: "alarmSongName") }
    }

    private var audioPlayer: AVAudioPlayer?
    private var alarmTimer: Timer?

    override init() {
        self.snoozeDuration = UserDefaults.standard.object(forKey: "snoozeDuration") as? Int ?? 5
        self.songBookmark = UserDefaults.standard.data(forKey: "alarmSongBookmark")
        self.songName = UserDefaults.standard.string(forKey: "alarmSongName") ?? "standard"
        super.init()
    }

    // MARK: - Song file management

    func saveSongBookmark(from url: URL) {
        guard url.startAccessingSecurityScopedResource() else { return }
        defer { url.stopAccessingSecurityScopedResource() }

        if let bookmark = try? url.bookmarkData(options: .minimalBookmark, includingResourceValuesForKeys: nil, relativeTo: nil) {
            songBookmark = bookmark
            songName = url.deletingPathExtension().lastPathComponent
        }
    }

    func getSongURL() -> URL? {
        guard let bookmark = songBookmark else { return nil }
        var isStale = false
        guard let url = try? URL(resolvingBookmarkData: bookmark, bookmarkDataIsStale: &isStale) else { return nil }
        if isStale {
            saveSongBookmark(from: url)
        }
        return url
    }

    // MARK: - Audio session

    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        // playAndRecord + defaultToSpeaker forces phone speaker even when bluetooth is connected
        try? session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try? session.setActive(true, options: [])
        try? session.overrideOutputAudioPort(.speaker)
    }

    // MARK: - Schedule alarm

    func scheduleAlarm(hour: Int, minute: Int) {
        cancelAlarm()

        // Schedule notification (wakes app if in background)
        let content = UNMutableNotificationContent()
        content.title = "solopp"
        content.body = "god morgen"
        content.interruptionLevel = .timeSensitive
        content.categoryIdentifier = "ALARM"

        // Use custom sound if available (30s max for notification sound)
        if let url = getSongURL(), url.startAccessingSecurityScopedResource() {
            // Copy to notification sounds directory for notification use
            let soundsDir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first!
                .appendingPathComponent("Sounds")
            try? FileManager.default.createDirectory(at: soundsDir, withIntermediateDirectories: true)
            let dest = soundsDir.appendingPathComponent("alarm.\(url.pathExtension)")
            try? FileManager.default.removeItem(at: dest)
            try? FileManager.default.copyItem(at: url, to: dest)
            url.stopAccessingSecurityScopedResource()
            content.sound = UNNotificationSound(named: UNNotificationSoundName("alarm.\(url.pathExtension)"))
        } else {
            content.sound = UNNotificationSound.defaultCritical
        }

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "hjemme-solopp", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)

        // Also schedule a local timer if app is in foreground
        scheduleLocalTimer(hour: hour, minute: minute)
    }

    private func scheduleLocalTimer(hour: Int, minute: Int) {
        alarmTimer?.invalidate()

        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: Date())
        components.hour = hour
        components.minute = minute
        components.second = 0

        guard var fireDate = calendar.date(from: components) else { return }
        if fireDate <= Date() {
            fireDate = calendar.date(byAdding: .day, value: 1, to: fireDate)!
        }

        let interval = fireDate.timeIntervalSinceNow
        alarmTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
            self?.triggerAlarm()
        }
    }

    // MARK: - Trigger alarm (play song)

    func triggerAlarm() {
        configureAudioSession()

        if let url = getSongURL() {
            _ = url.startAccessingSecurityScopedResource()
            audioPlayer = try? AVAudioPlayer(contentsOf: url)
        } else {
            // Fallback: system sound
            audioPlayer = nil
        }

        audioPlayer?.numberOfLoops = -1 // loop forever
        audioPlayer?.volume = 1.0
        audioPlayer?.play()

        DispatchQueue.main.async {
            self.isAlarming = true
        }
    }

    // MARK: - Dismiss / Snooze

    func dismiss() {
        audioPlayer?.stop()
        audioPlayer = nil

        if let url = getSongURL() {
            url.stopAccessingSecurityScopedResource()
        }

        DispatchQueue.main.async {
            self.isAlarming = false
        }
    }

    func snooze() {
        dismiss()

        // Re-trigger after snooze duration
        let snoozeSeconds = Double(snoozeDuration * 60)
        alarmTimer = Timer.scheduledTimer(withTimeInterval: snoozeSeconds, repeats: false) { [weak self] _ in
            self?.triggerAlarm()
        }
    }

    // MARK: - Cancel scheduled alarm

    func cancelAlarm() {
        alarmTimer?.invalidate()
        alarmTimer = nil
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["hjemme-solopp"])
        dismiss()
    }

    // MARK: - Sync with solopp

    func syncWithWakeState(_ wakeState: WakeState) {
        if wakeState.enabled {
            let parts = wakeState.time.split(separator: ":").map { Int($0) ?? 0 }
            if parts.count == 2 {
                scheduleAlarm(hour: parts[0], minute: parts[1])
            }
        } else {
            cancelAlarm()
        }
    }
}
