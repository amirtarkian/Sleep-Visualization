import SwiftUI
import Charts

struct BedtimeChart: View {
    let sessions: [SleepSession]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let bedtime: Double
        let wake: Double
    }

    private var dataPoints: [DataPoint] {
        sessions.sorted { $0.nightDate < $1.nightDate }.map { session in
            DataPoint(date: session.nightDate, bedtime: bedtimeMinutes(session.startDate), wake: Double(minutesFromMidnight(session.endDate)))
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("BEDTIME & WAKE TIME").font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            Chart {
                ForEach(dataPoints) { point in
                    PointMark(x: .value("Date", point.date), y: .value("Time", point.bedtime))
                        .foregroundStyle(.purple).symbolSize(30)
                    PointMark(x: .value("Date", point.date), y: .value("Time", point.wake))
                        .foregroundStyle(.yellow).symbolSize(30)
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let mins = value.as(Double.self) { Text(formatMinutesAsTime(mins)).font(.caption2).foregroundStyle(AppTheme.textTertiary) }
                    }
                }
            }
            .frame(height: 180)
            HStack(spacing: 16) {
                HStack(spacing: 4) { Circle().fill(.purple).frame(width: 8, height: 8); Text("Bedtime").font(.caption).foregroundStyle(AppTheme.textSecondary) }
                HStack(spacing: 4) { Circle().fill(.yellow).frame(width: 8, height: 8); Text("Wake").font(.caption).foregroundStyle(AppTheme.textSecondary) }
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
