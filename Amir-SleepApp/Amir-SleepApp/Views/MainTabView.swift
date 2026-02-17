import SwiftUI

struct MainTabView: View {
    @Environment(SyncManager.self) private var syncManager
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        TabView {
            Tab("Today", systemImage: "moon.fill") {
                TodayView()
            }
            Tab("Sleep", systemImage: "bed.double.fill") {
                SleepDetailView()
            }
            Tab("Readiness", systemImage: "heart.fill") {
                ReadinessView()
            }
            Tab("Trends", systemImage: "chart.line.uptrend.xyaxis") {
                TrendsView()
            }
            Tab("Settings", systemImage: "gearshape.fill") {
                SettingsView()
            }
        }
        .tint(.white)
        .task {
            if HealthKitService.shared.isAvailable {
                try? await HealthKitService.shared.requestAuthorization()
                await syncManager.sync(modelContext: modelContext)
            }
        }
    }
}
