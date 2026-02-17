import SwiftUI
import Charts

struct ScoreTrendChart: View {
    let sessions: [SleepSession]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let score: Int
        let movingAvg: Double?
    }

    private var dataPoints: [DataPoint] {
        let sorted = sessions.sorted { $0.nightDate < $1.nightDate }
        return sorted.enumerated().map { index, session in
            let start = max(0, index - 6)
            let window = sorted[start...index]
            let avg = Double(window.map(\.score.overall).reduce(0, +)) / Double(window.count)
            return DataPoint(date: session.nightDate, score: session.score.overall, movingAvg: window.count >= 3 ? avg : nil)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SLEEP SCORE").font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            Chart {
                ForEach(dataPoints) { point in
                    LineMark(x: .value("Date", point.date), y: .value("Score", point.score))
                        .foregroundStyle(.blue.opacity(0.5))
                        .interpolationMethod(.catmullRom)
                    if let avg = point.movingAvg {
                        LineMark(x: .value("Date", point.date), y: .value("7d Avg", avg))
                            .foregroundStyle(.blue)
                            .lineStyle(StrokeStyle(lineWidth: 2))
                            .interpolationMethod(.catmullRom)
                    }
                }
            }
            .chartXAxis(.hidden)
            .chartYScale(domain: 0...100)
            .frame(height: 180)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
