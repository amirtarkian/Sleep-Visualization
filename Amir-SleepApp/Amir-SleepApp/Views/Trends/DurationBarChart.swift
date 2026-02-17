import SwiftUI
import Charts

struct DurationBarChart: View {
    let sessions: [SleepSession]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SLEEP DURATION").font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            let sorted = sessions.sorted { $0.nightDate < $1.nightDate }
            Chart {
                ForEach(sorted, id: \.id) { session in
                    BarMark(x: .value("Date", session.nightDate), y: .value("Hours", session.stats.totalSleepTime / 60))
                        .foregroundStyle(.blue.opacity(0.7))
                }
                RuleMark(y: .value("Goal", 8))
                    .foregroundStyle(.green.opacity(0.5))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))
            }
            .chartXAxis(.hidden)
            .chartYAxisLabel("Hours")
            .frame(height: 180)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
