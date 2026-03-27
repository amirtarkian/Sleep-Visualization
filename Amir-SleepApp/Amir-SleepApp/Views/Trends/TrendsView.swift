import SwiftUI
import SwiftData

struct TrendsView: View {
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var allSessions: [SleepSession]
    @State private var period: TimePeriod = .month

    private var filteredSessions: [SleepSession] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -period.days, to: Date())!
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let cutoffString = formatter.string(from: cutoff)
        return allSessions.filter { $0.nightDate >= cutoffString }
    }

    private var insights: [Insight] {
        InsightsEngine.computeInsights(sessions: filteredSessions)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PeriodSelector(selection: $period).padding(.horizontal)
                    if filteredSessions.isEmpty {
                        Text("No data for this period").foregroundStyle(AppTheme.textSecondary).padding(.top, 60)
                    } else {
                        InsightCardsView(insights: insights)
                        ScoreTrendChart(sessions: filteredSessions)
                        DurationBarChart(sessions: filteredSessions)
                        BedtimeChart(sessions: filteredSessions)
                        StageAreaChart(sessions: filteredSessions)
                        BiometricChartsView(sessions: filteredSessions)
                    }
                }
                .padding()
            }
            .background(AppTheme.background)
            .navigationTitle("Trends")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}
