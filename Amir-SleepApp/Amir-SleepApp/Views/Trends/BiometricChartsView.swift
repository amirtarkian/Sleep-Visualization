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

    private func bioData(extractor: (SleepSession) -> Double?) -> [BioPoint] {
        let sorted = sessions.sorted { $0.nightDate < $1.nightDate }
        let values = sorted.map { extractor($0) }
        return sorted.enumerated().compactMap { index, session in
            guard let val = values[index] else { return nil }
            let start = max(0, index - 6)
            let window = values[start...index].compactMap { $0 }
            let ma = window.count >= 3 ? window.reduce(0, +) / Double(window.count) : nil
            return BioPoint(date: session.nightDate, value: val, movingAvg: ma)
        }
    }

    private var hrvData: [BioPoint] { bioData { $0.biometrics.avgHrv } }
    private var hrData: [BioPoint] { bioData { $0.biometrics.minHeartRate } }
    private var spo2Data: [BioPoint] { bioData { $0.biometrics.avgSpo2 } }

    var body: some View {
        VStack(spacing: 16) {
            if hrvData.count >= 2 {
                bioChart(title: "HRV", data: hrvData, color: Color(hex: "#a78bfa"), avgColor: Color(hex: "#8b5cf6"), unit: "ms")
            }
            if hrData.count >= 2 {
                bioChart(title: "RESTING HEART RATE", data: hrData, color: Color(hex: "#f87171"), avgColor: Color(hex: "#ef4444"), unit: "bpm")
            }
            if spo2Data.count >= 2 {
                spo2Chart()
            }
        }
    }

    @ViewBuilder
    private func bioChart(title: String, data: [BioPoint], color: Color, avgColor: Color, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            Chart {
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
            .frame(height: 150)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    @ViewBuilder
    private func spo2Chart() -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("BLOOD OXYGEN (SpO2)").font(.caption.bold()).foregroundStyle(AppTheme.textTertiary)
            Chart {
                RectangleMark(yStart: .value("Low", 95), yEnd: .value("High", 100))
                    .foregroundStyle(Color(hex: "#22c55e").opacity(0.08))
                ForEach(spo2Data) { point in
                    LineMark(x: .value("Date", point.date), y: .value("%", point.value))
                        .foregroundStyle(Color(hex: "#22d3ee").opacity(0.6))
                        .interpolationMethod(.catmullRom)
                    if let ma = point.movingAvg {
                        LineMark(x: .value("Date", point.date), y: .value("7d Avg", ma))
                            .foregroundStyle(Color(hex: "#06b6d4"))
                            .lineStyle(StrokeStyle(lineWidth: 2))
                            .interpolationMethod(.catmullRom)
                    }
                }
            }
            .chartXAxis(.hidden)
            .chartYScale(domain: 90...100)
            .frame(height: 150)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
