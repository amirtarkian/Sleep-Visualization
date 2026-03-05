import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(SyncManager.self) private var syncManager
    @Environment(\.modelContext) private var modelContext
    @State private var showClearConfirmation = false

    var body: some View {
        NavigationStack {
            List {
                Section("Health Data") {
                    HStack {
                        Label("HealthKit", systemImage: "heart.fill")
                        Spacer()
                        if HealthKitService.shared.isAvailable {
                            Text("Connected").foregroundStyle(.green)
                        } else {
                            Text("Not Available").foregroundStyle(.red)
                        }
                    }
                    HStack {
                        Label("Last Sync", systemImage: "arrow.clockwise")
                        Spacer()
                        if let date = syncManager.lastSyncDate {
                            Text(date, style: .relative).foregroundStyle(AppTheme.textSecondary)
                        } else {
                            Text("Never").foregroundStyle(AppTheme.textTertiary)
                        }
                    }
                    Button {
                        Task { await syncManager.sync(modelContext: modelContext) }
                    } label: {
                        Label("Sync Now", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .disabled(syncManager.isSyncing)
                }
                Section("Scoring") {
                    NavigationLink {
                        scoringInfoView
                    } label: {
                        Label("How Scoring Works", systemImage: "info.circle")
                    }
                }
                Section("Data") {
                    Button(role: .destructive) { showClearConfirmation = true } label: {
                        Label("Clear Cached Data", systemImage: "trash")
                    }
                }
                Section("About") {
                    HStack { Text("Version"); Spacer(); Text("1.0.0").foregroundStyle(AppTheme.textSecondary) }
                }
            }
            .navigationTitle("Settings")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .confirmationDialog("Clear all cached sleep data?", isPresented: $showClearConfirmation) {
                Button("Clear Data", role: .destructive) { clearAllData() }
            } message: {
                Text("This removes cached scores and sessions. Data can be re-synced from HealthKit.")
            }
        }
    }

    private var scoringInfoView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Sleep Score").font(.title2.bold())
                Text("Your sleep score (0-100) is computed from eight weighted sub-scores:").foregroundStyle(AppTheme.textSecondary)
                ForEach([
                    ("Duration (30%)", "7-9 hours is ideal"),
                    ("Efficiency (15%)", "85%+ time asleep vs in bed"),
                    ("Deep Sleep (12%)", "10-25% of total sleep"),
                    ("REM Sleep (10%)", "20-25% of total sleep"),
                    ("Latency (8%)", "10-20 minutes to fall asleep is optimal"),
                    ("WASO (8%)", "20 minutes or less awake after falling asleep"),
                    ("Timing (8%)", "Sleep midpoint between midnight and 3AM"),
                    ("Restoration (9%)", "Heart rate drops 10%+ below resting during sleep"),
                ], id: \.0) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.0).font(.subheadline.bold())
                        Text(item.1).font(.caption).foregroundStyle(AppTheme.textSecondary)
                    }
                }
                Divider().padding(.vertical)
                Text("Readiness Score").font(.title2.bold())
                Text("Your readiness score (0-100) measures recovery based on:").foregroundStyle(AppTheme.textSecondary)
                ForEach([
                    ("HRV (50%)", "Heart rate variability vs your 7-day baseline"),
                    ("Resting HR (30%)", "Resting heart rate vs your 7-day baseline"),
                    ("Sleep Score (20%)", "Last night's sleep quality"),
                ], id: \.0) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.0).font(.subheadline.bold())
                        Text(item.1).font(.caption).foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .padding()
        }
        .background(AppTheme.background)
        .navigationTitle("Scoring Info")
    }

    private func clearAllData() {
        try? modelContext.delete(model: SleepSession.self)
        try? modelContext.delete(model: ReadinessRecord.self)
        try? modelContext.save()
    }
}
