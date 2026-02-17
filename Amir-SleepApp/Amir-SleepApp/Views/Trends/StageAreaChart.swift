import SwiftUI
import Charts

struct StageAreaChart: View {
    let sessions: [SleepSession]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let stage: String
        let percent: Double
    }

    private var dataPoints: [DataPoint] {
        sessions.sorted { $0.nightDate < $1.nightDate }.flatMap { session in
            [
                DataPoint(date: session.nightDate, stage: "Deep", percent: session.stats.deepPercent),
                DataPoint(date: session.nightDate, stage: "Core", percent: session.stats.corePercent),
                DataPoint(date: session.nightDate, stage: "REM", percent: session.stats.remPercent),
                DataPoint(date: session.nightDate, stage: "Awake", percent: session.stats.awakePercent),
            ]
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("STAGE COMPOSITION").font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            Chart(dataPoints) { point in
                AreaMark(x: .value("Date", point.date), y: .value("Percent", point.percent), stacking: .standard)
                    .foregroundStyle(by: .value("Stage", point.stage))
            }
            .chartForegroundStyleScale(["Deep": StageColor.deep, "Core": StageColor.core, "REM": StageColor.rem, "Awake": StageColor.awake])
            .chartXAxis(.hidden)
            .frame(height: 180)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
