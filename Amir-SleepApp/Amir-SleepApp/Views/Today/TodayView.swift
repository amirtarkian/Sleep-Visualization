import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(SyncManager.self) private var syncManager
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var sessions: [SleepSession]

    private var latestSession: SleepSession? { sessions.first }

    private var greeting: (title: String, subtitle: String) {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12:
            return ("Good morning, Amir", "Here's how you slept last night")
        case 12..<17:
            return ("Good afternoon, Amir", "Your sleep at a glance")
        case 17..<21:
            return ("Good evening, Amir", "Wind down and review your sleep")
        default:
            return ("Good night, Amir", "Time to rest — here's your sleep summary")
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let session = latestSession {
                    VStack(spacing: 24) {
                        VStack(spacing: 4) {
                            Text(greeting.title)
                                .font(.title2.bold())
                                .foregroundStyle(AppTheme.textPrimary)
                            Text(greeting.subtitle)
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 8)

                        ScoreRing(
                            score: session.score.overall,
                            label: getScoreInfo(session.score.overall).label,
                            size: 220
                        )

                        lastNightCard(session)
                        SubScoreBars(score: session.score)
                        insightCard(session)
                        CoachingTipsCard(tips: CoachingEngine.generateTips(sessions: sessions.reversed()))
                    }
                    .padding()
                } else {
                    emptyState
                }
            }
            .background(AppTheme.background)
            .navigationTitle("Sleep Score")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .refreshable {
                await syncManager.sync(modelContext: modelContext)
            }
        }
    }

    private func lastNightCard(_ session: SleepSession) -> some View {
        VStack(spacing: 12) {
            Text("LAST NIGHT")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack {
                StatCard(title: "Bedtime", value: formatTime(session.startDate), icon: "moon.fill", iconColor: .purple)
                StatCard(title: "Wake", value: formatTime(session.endDate), icon: "sun.max.fill", iconColor: .yellow)
            }

            StatCard(title: "Total Sleep", value: formatDuration(minutes: session.stats.totalSleepTime), icon: "clock.fill", iconColor: .blue)
        }
    }

    private func insightCard(_ session: SleepSession) -> some View {
        let avgDuration = sessions.prefix(7).map(\.stats.totalSleepTime).reduce(0, +) / max(Double(min(sessions.count, 7)), 1)
        let diff = session.stats.totalSleepTime - avgDuration
        let insight: String
        if abs(diff) < 15 {
            insight = "Your sleep duration was close to your weekly average."
        } else if diff > 0 {
            insight = "You slept \(formatDuration(minutes: diff)) more than your weekly average."
        } else {
            insight = "You slept \(formatDuration(minutes: abs(diff))) less than your weekly average."
        }

        return VStack(alignment: .leading, spacing: 8) {
            Label("Insight", systemImage: "lightbulb.fill")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
            Text(insight)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "moon.zzz.fill")
                .font(.system(size: 60))
                .foregroundStyle(AppTheme.textTertiary)
            Text("No Sleep Data")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.textPrimary)
            Text("Wear your Apple Watch to bed and sleep data will appear here automatically.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            if syncManager.isSyncing {
                ProgressView().tint(.white).padding(.top)
            }
        }
        .padding(.top, 100)
    }
}
