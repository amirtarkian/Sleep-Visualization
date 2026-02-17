import SwiftUI
import SwiftData
import BackgroundTasks

@main
struct Amir_SleepAppApp: App {
    @State private var syncManager = SyncManager()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environment(syncManager)
                .preferredColorScheme(.dark)
        }
        .modelContainer(for: [SleepSession.self, ReadinessRecord.self])
    }

    init() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.sleepviz.sync",
            using: nil
        ) { task in
            self.handleBackgroundSync(task: task as! BGAppRefreshTask)
        }
    }

    private func handleBackgroundSync(task: BGAppRefreshTask) {
        task.expirationHandler = { task.setTaskCompleted(success: false) }
        Amir_SleepAppApp.scheduleNextBackgroundSync()
        Task {
            task.setTaskCompleted(success: true)
        }
    }

    static func scheduleNextBackgroundSync() {
        let request = BGAppRefreshTaskRequest(identifier: "com.sleepviz.sync")
        request.earliestBeginDate = Date(timeIntervalSinceNow: 4 * 60 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }
}
