import SwiftUI
import Charts

struct BiometricChartsView: View {
    let sessions: [SleepSession]

    private struct BioPoint: Identifiable {
        let id = UUID()
        let date: String
        let value: Double
        let movingAvg: Double?
    }

    private var sorted: [SleepSession] {
        sessions.sorted { $0.nightDate < $1.nightDate }
    }

    private func bioData(extractor: (SleepSession) -> Double?) -> [BioPoint] {
        let s = sorted
        let values = s.map { extractor($0) }
        return s.enumerated().compactMap { index, session in
            guard let val = values[index] else { return nil }
            let start = max(0, index - 6)
            let window = values[start...index].compactMap { $0 }
            let ma = window.count >= 3 ? window.reduce(0, +) / Double(window.count) : nil
            return BioPoint(date: session.nightDate, value: val, movingAvg: ma)
        }
    }

    var body: some View {
        let hrv = bioData { $0.biometrics.avgHrv }
        let hr = bioData { $0.biometrics.minHeartRate }
        let spo2 = bioData { $0.biometrics.avgSpo2 }

        VStack(spacing: 16) {
            if hrv.count >= 2 {
                bioChart(title: "HRV", data: hrv, color: Color(hex: "#a78bfa"), avgColor: Color(hex: "#8b5cf6"), unit: "ms")
            }
            if hr.count >= 2 {
                bioChart(title: "RESTING HEART RATE", data: hr, color: Color(hex: "#f87171"), avgColor: Color(hex: "#ef4444"), unit: "bpm")
            }
            if spo2.count >= 2 {
                bioChart(title: "BLOOD OXYGEN (SpO2)", data: spo2, color: Color(hex: "#22d3ee"), avgColor: Color(hex: "#06b6d4"), unit: "%", yDomain: 90...100, referenceBand: (95, 100))
            }
        }
    }

    @ViewBuilder
    private func bioChart(title: String, data: [BioPoint], color: Color, avgColor: Color, unit: String, yDomain: ClosedRange<Double>? = nil, referenceBand: (Double, Double)? = nil) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            Chart {
                if let band = referenceBand {
                    RectangleMark(yStart: .value("Low", band.0), yEnd: .value("High", band.1))
                        .foregroundStyle(Color(hex: "#22c55e").opacity(0.08))
                }
                ForEach(data) { point in
                    LineMark(x: .value("Date", point.date), y: .value(unit, point.value))
                        .foregroundStyle(color.opacity(0.6))
                        .interpolationMethod(.catmullRom)
                    if let ma = point.movingAvg {
                        LineMark(x: .value("Date", point.date), y: .value("7d Avg", ma))
                            .foregroundStyle(avgColor)
                            .lineStyle(StrokeStyle(lineWidth: 2))
                            .interpolationMethod(.catmullRom)
                    }
                }
            }
            .chartXAxis(.hidden)
            .if(yDomain != nil) { chart in
                chart.chartYScale(domain: yDomain!)
            }
            .frame(height: 150)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}

private extension View {
    @ViewBuilder
    func `if`(_ condition: Bool, transform: (Self) -> some View) -> some View {
        if condition { transform(self) } else { self }
    }
}
