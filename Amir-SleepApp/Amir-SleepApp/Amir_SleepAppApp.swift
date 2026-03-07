import SwiftUI
import SwiftData
import BackgroundTasks

@main
struct Amir_SleepAppApp: App {
    @State private var syncManager = SyncManager()
    @State private var supabaseService = SupabaseService()
    let modelContainer: ModelContainer

    init() {
        do {
            modelContainer = try ModelContainer(for: SleepSession.self, ReadinessRecord.self)
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.sleepviz.sync",
            using: nil
        ) { task in
            self.handleBackgroundSync(task: task as! BGAppRefreshTask)
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if supabaseService.isAuthenticated {
                    MainTabView()
                } else {
                    SignInView()
                }
            }
            .environment(syncManager)
            .environment(supabaseService)
            .preferredColorScheme(.dark)
            .task {
                syncManager.supabaseService = supabaseService
                await supabaseService.checkSession()
            }
        }
        .modelContainer(modelContainer)
    }

    private func handleBackgroundSync(task: BGAppRefreshTask) {
        task.expirationHandler = { task.setTaskCompleted(success: false) }
        Amir_SleepAppApp.scheduleNextBackgroundSync()
        Task { @MainActor in
            let context = ModelContext(modelContainer)
            await syncManager.sync(modelContext: context)
            task.setTaskCompleted(success: syncManager.syncError == nil)
        }
    }

    static func scheduleNextBackgroundSync() {
        let request = BGAppRefreshTaskRequest(identifier: "com.sleepviz.sync")
        request.earliestBeginDate = Date(timeIntervalSinceNow: 4 * 60 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }
}
