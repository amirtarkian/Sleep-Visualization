import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(SyncManager.self) private var syncManager
    @Environment(SupabaseService.self) private var supabaseService
    @Environment(\.modelContext) private var modelContext
    @Query private var allSessions: [SleepSession]
    @State private var showClearConfirmation = false
    @State private var showSignOutConfirmation = false
    @State private var showResyncConfirmation = false
    @State private var isResyncInProgress = false

    var body: some View {
        NavigationStack {
            List {
                // MARK: - Account
                Section("Account") {
                    if supabaseService.isAuthenticated {
                        HStack {
                            Label("Email", systemImage: "person.circle")
                            Spacer()
                            Text(supabaseService.userEmail ?? "Unknown")
                                .foregroundStyle(AppTheme.textSecondary)
                                .lineLimit(1)
                        }
                        Button(role: .destructive) {
                            showSignOutConfirmation = true
                        } label: {
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } else {
                        HStack {
                            Label("Status", systemImage: "person.circle")
                            Spacer()
                            Text("Not signed in")
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                    }
                }

                // MARK: - Health Data
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

                // MARK: - Supabase Sync Status
                if supabaseService.isAuthenticated {
                    Section("Cloud Sync") {
                        HStack {
                            Label("Sessions Synced", systemImage: "cloud.fill")
                            Spacer()
                            Text("\(allSessions.count)")
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        HStack {
                            Label("Last Push", systemImage: "arrow.up.circle")
                            Spacer()
                            if let date = syncManager.lastSyncDate {
                                Text(date, style: .relative)
                                    .foregroundStyle(AppTheme.textSecondary)
                            } else {
                                Text("Never")
                                    .foregroundStyle(AppTheme.textTertiary)
                            }
                        }
                        Button {
                            showResyncConfirmation = true
                        } label: {
                            if isResyncInProgress {
                                HStack {
                                    ProgressView()
                                        .controlSize(.small)
                                    Text("Resyncing...")
                                }
                            } else {
                                Label("Force Resync", systemImage: "arrow.clockwise.circle")
                            }
                        }
                        .disabled(isResyncInProgress || syncManager.isSyncing)
                    }
                }

                // MARK: - Scoring
                Section("Scoring") {
                    NavigationLink {
                        scoringInfoView
                    } label: {
                        Label("How Scoring Works", systemImage: "info.circle")
                    }
                }

                // MARK: - Data
                Section("Data") {
                    Button(role: .destructive) { showClearConfirmation = true } label: {
                        Label("Clear Cached Data", systemImage: "trash")
                    }
                }

                // MARK: - About
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
            .confirmationDialog("Sign out?", isPresented: $showSignOutConfirmation) {
                Button("Sign Out", role: .destructive) {
                    Task {
                        try? await supabaseService.signOut()
                    }
                }
            } message: {
                Text("You will need to sign in again to sync data to the cloud.")
            }
            .confirmationDialog("Force resync all data?", isPresented: $showResyncConfirmation) {
                Button("Resync", role: .destructive) {
                    Task { await forceResync() }
                }
            } message: {
                Text("This will clear all cached data and re-sync from HealthKit, then push to Supabase.")
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

    private func forceResync() async {
        isResyncInProgress = true

        // Clear all local data
        clearAllData()

        // Reset the last sync date so SyncManager fetches the full 90-day window
        syncManager.lastSyncDate = nil
        UserDefaults.standard.removeObject(forKey: "lastSyncDate")

        // Re-sync from HealthKit (which also pushes to Supabase)
        await syncManager.sync(modelContext: modelContext)

        isResyncInProgress = false
    }
}
