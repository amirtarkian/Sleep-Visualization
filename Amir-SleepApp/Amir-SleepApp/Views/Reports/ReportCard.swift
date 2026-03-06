import SwiftUI

struct ReportCard: View {
    let report: SleepReport
    let isMonthly: Bool

    var body: some View {
        VStack(spacing: 20) {
            summaryHeader
            keyStatsGrid
            if report.bestNight != nil || report.worstNight != nil {
                bestWorstSection
            }
            stageAveragesSection
            insightsSection
            recommendationsSection
            if isMonthly && !report.weeklyBreakdown.isEmpty {
                weeklyBreakdownSection
            }
        }
    }

    // MARK: - Summary Header

    private var summaryHeader: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(isMonthly ? "Monthly Report" : "Weekly Report")
                    .font(.title3.bold())
                    .foregroundStyle(AppTheme.textPrimary)
                Text("\(report.nightCount) nights analyzed")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
            trendBadge
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private var trendBadge: some View {
        let icon: String
        let color: Color
        switch report.trendDirection {
        case .improving:
            icon = "arrow.up.right"
            color = Color(hex: "#22c55e")
        case .declining:
            icon = "arrow.down.right"
            color = Color(hex: "#ef4444")
        case .stable:
            icon = "arrow.right"
            color = Color(hex: "#eab308")
        }
        return HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption.bold())
            Text(report.trendDirection.rawValue)
                .font(.caption.bold())
        }
        .foregroundStyle(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.15))
        .clipShape(Capsule())
    }

    // MARK: - Key Stats Grid

    private var keyStatsGrid: some View {
        let scoreColor = getScoreInfo(report.avgScore).color
        return VStack(spacing: 12) {
            Text("KEY STATS")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 12) {
                StatCard(
                    title: "Avg Score",
                    value: "\(report.avgScore)",
                    icon: "star.fill",
                    iconColor: scoreColor
                )
                StatCard(
                    title: "Avg Duration",
                    value: formatDuration(minutes: report.avgDuration),
                    icon: "clock.fill",
                    iconColor: .blue
                )
            }
            StatCard(
                title: "Avg Efficiency",
                value: formatPercent(report.avgEfficiency),
                icon: "bolt.fill",
                iconColor: .yellow
            )
        }
    }

    // MARK: - Best / Worst Nights

    private var bestWorstSection: some View {
        VStack(spacing: 12) {
            if let best = report.bestNight {
                nightHighlightCard(
                    label: "BEST NIGHT",
                    session: best,
                    accentColor: Color(hex: "#22c55e")
                )
            }
            if let worst = report.worstNight {
                nightHighlightCard(
                    label: "WORST NIGHT",
                    session: worst,
                    accentColor: Color(hex: "#ef4444")
                )
            }
        }
    }

    private func nightHighlightCard(label: String, session: SleepSession, accentColor: Color) -> some View {
        HStack {
            RoundedRectangle(cornerRadius: 2)
                .fill(accentColor)
                .frame(width: 4)
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.caption.bold())
                    .foregroundStyle(accentColor)
                Text(formatNightDate(session.nightDate))
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textPrimary)
                Text("Score: \(session.score.overall) \u{2022} \(formatDuration(minutes: session.stats.totalSleepTime))")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
            Text("\(session.score.overall)")
                .font(.title2.bold())
                .foregroundStyle(getScoreInfo(session.score.overall).color)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    // MARK: - Stage Averages

    private var stageAveragesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("STAGE AVERAGES")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
            stageRow(label: "Deep", minutes: report.avgDeepMinutes, color: StageColor.deep)
            stageRow(label: "REM", minutes: report.avgRemMinutes, color: StageColor.rem)
            stageRow(label: "Core", minutes: report.avgCoreMinutes, color: StageColor.core)
            stageRow(label: "Awake", minutes: report.avgAwakeMinutes, color: StageColor.awake)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private func stageRow(label: String, minutes: Double, color: Color) -> some View {
        HStack {
            Circle().fill(color).frame(width: 10, height: 10)
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(formatDuration(minutes: minutes))
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.textPrimary)
        }
    }

    // MARK: - Insights

    private var insightsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Insights", systemImage: "lightbulb.fill")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
            if report.insights.isEmpty {
                Text("Not enough data to generate insights.")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
            } else {
                ForEach(Array(report.insights.enumerated()), id: \.offset) { _, insight in
                    insightRow(insight)
                }
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private func insightRow(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "circle.fill")
                .font(.system(size: 5))
                .foregroundStyle(AppTheme.textTertiary)
                .padding(.top, 6)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }

    // MARK: - Recommendations

    private var recommendationsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Recommendations", systemImage: "checkmark.seal.fill")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
            if report.recommendations.isEmpty {
                Text("Keep up your current sleep habits!")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
            } else {
                ForEach(Array(report.recommendations.enumerated()), id: \.offset) { _, rec in
                    recommendationRow(rec)
                }
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private func recommendationRow(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "arrow.right.circle.fill")
                .font(.caption)
                .foregroundStyle(Color(hex: "#3b82f6"))
                .padding(.top, 2)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textPrimary)
        }
    }

    // MARK: - Weekly Breakdown

    private var weeklyBreakdownSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("WEEKLY BREAKDOWN")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
            ForEach(report.weeklyBreakdown) { entry in
                weeklyBreakdownRow(entry)
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private func weeklyBreakdownRow(_ entry: WeeklyBreakdownEntry) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.weekLabel)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textPrimary)
                Text("\(entry.nightCount) nights")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textTertiary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(entry.avgScore)")
                    .font(.subheadline.bold())
                    .foregroundStyle(getScoreInfo(entry.avgScore).color)
                Text(formatDuration(minutes: entry.avgDuration))
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding(.vertical, 4)
    }
}
