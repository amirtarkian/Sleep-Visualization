import SwiftUI
import Charts

struct RestingHRChart: View {
    let records: [ReadinessRecord]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let hr: Double
    }

    private var dataPoints: [DataPoint] {
        records.reversed().map { DataPoint(date: $0.date, hr: $0.restingHRCurrent) }.filter { $0.hr > 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("RESTING HEART RATE").font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            if dataPoints.isEmpty {
                Text("No resting HR data available").font(.caption).foregroundStyle(AppTheme.textTertiary).frame(height: 150)
            } else {
                Chart(dataPoints) { point in
                    LineMark(x: .value("Date", point.date), y: .value("HR", point.hr))
                        .foregroundStyle(.red)
                        .interpolationMethod(.catmullRom)
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel { Text("\(value.as(Int.self) ?? 0) bpm").font(.caption2).foregroundStyle(AppTheme.textTertiary) }
                    }
                }
                .frame(height: 150)
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
