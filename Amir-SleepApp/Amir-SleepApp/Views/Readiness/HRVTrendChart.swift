import SwiftUI
import Charts

struct HRVTrendChart: View {
    let sessions: [SleepSession]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let hrv: Double
    }

    private var dataPoints: [DataPoint] {
        sessions.reversed().compactMap { session in
            guard let hrv = session.biometrics.avgHrv else { return nil }
            return DataPoint(date: session.nightDate, hrv: hrv)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("HRV TREND").font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            if dataPoints.isEmpty {
                Text("No HRV data available").font(.caption).foregroundStyle(AppTheme.textTertiary).frame(height: 150)
            } else {
                Chart(dataPoints) { point in
                    LineMark(x: .value("Date", point.date), y: .value("HRV", point.hrv))
                        .foregroundStyle(.green)
                        .interpolationMethod(.catmullRom)
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel { Text("\(value.as(Int.self) ?? 0) ms").font(.caption2).foregroundStyle(AppTheme.textTertiary) }
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
