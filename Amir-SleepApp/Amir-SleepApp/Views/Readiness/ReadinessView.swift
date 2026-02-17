import SwiftUI
import SwiftData

struct ReadinessView: View {
    @Query(sort: \ReadinessRecord.date, order: .reverse) private var records: [ReadinessRecord]
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var sessions: [SleepSession]

    private var latest: ReadinessRecord? { records.first }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let record = latest {
                    VStack(spacing: 24) {
                        ScoreRing(score: record.score, label: getScoreInfo(record.score).label, size: 200, accentColor: Color(hex: "#f59e0b"))
                            .padding(.top, 20)
                        contributingFactors(record)
                        HRVTrendChart(sessions: Array(sessions.prefix(30)))
                        RestingHRChart(records: Array(records.prefix(30)))
                    }
                    .padding()
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "heart.text.clipboard")
                            .font(.system(size: 60))
                            .foregroundStyle(AppTheme.textTertiary)
                        Text("No Readiness Data")
                            .font(.title2.bold())
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("Sleep data with HRV measurements is needed to compute readiness.")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .padding(.top, 100)
                }
            }
            .background(AppTheme.background)
            .navigationTitle("Readiness")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func contributingFactors(_ record: ReadinessRecord) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("CONTRIBUTING FACTORS")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
            factorRow(title: "HRV", current: formatMs(record.hrvCurrent), baseline: formatMs(record.hrvBaseline), icon: "waveform.path.ecg", color: .green)
            factorRow(title: "Resting HR", current: formatBpm(record.restingHRCurrent), baseline: formatBpm(record.restingHRBaseline), icon: "heart.fill", color: .red)
            factorRow(title: "Sleep Score", current: "\(record.sleepScoreContribution)", baseline: nil, icon: "moon.fill", color: .purple)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private func factorRow(title: String, current: String, baseline: String?, icon: String, color: Color) -> some View {
        HStack {
            Image(systemName: icon).foregroundStyle(color).frame(width: 20)
            Text(title).font(.subheadline).foregroundStyle(AppTheme.textSecondary)
            Spacer()
            VStack(alignment: .trailing) {
                Text(current).font(.subheadline.bold()).foregroundStyle(.white)
                if let baseline {
                    Text("Baseline: \(baseline)").font(.caption2).foregroundStyle(AppTheme.textTertiary)
                }
            }
        }
    }
}
