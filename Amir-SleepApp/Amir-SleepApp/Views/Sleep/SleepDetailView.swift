import SwiftUI
import SwiftData

struct SleepDetailView: View {
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var sessions: [SleepSession]
    @State private var selectedIndex = 0

    private var selectedSession: SleepSession? {
        sessions.indices.contains(selectedIndex) ? sessions[selectedIndex] : nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let session = selectedSession {
                    VStack(spacing: 20) {
                        NightPicker(nightDates: sessions.map(\.nightDate), selectedIndex: $selectedIndex)
                        HypnogramView(stages: session.stages, sessionStart: session.startDate, sessionEnd: session.endDate)
                        if session.stats.deepMinutes + session.stats.remMinutes + session.stats.coreMinutes + session.stats.awakeMinutes > 0 {
                            StageDonutChart(stats: session.stats)
                        }
                        BiometricsCards(biometrics: session.biometrics)
                        SubScoreBars(score: session.score)
                    }
                    .padding()
                } else {
                    Text("No sleep data available")
                        .foregroundStyle(AppTheme.textSecondary)
                        .padding(.top, 100)
                }
            }
            .background(AppTheme.background)
            .navigationTitle("Sleep Detail")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}
