import SwiftUI

struct BiometricsCards: View {
    let biometrics: BiometricSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("BIOMETRICS")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                StatCard(title: "Avg Heart Rate", value: formatBpm(biometrics.avgHeartRate), subtitle: biometrics.minHeartRate.map { "Min: \(formatBpm($0))" }, icon: "heart.fill", iconColor: .red)
                StatCard(title: "HRV", value: formatMs(biometrics.avgHrv), icon: "waveform.path.ecg", iconColor: .green)
                StatCard(title: "Blood Oxygen", value: biometrics.avgSpo2.map { formatPercent($0) } ?? "—", icon: "lungs.fill", iconColor: .cyan)
                StatCard(title: "Respiratory Rate", value: biometrics.avgRespiratoryRate.map { "\(Int($0.rounded())) brpm" } ?? "—", icon: "wind", iconColor: .teal)
            }
        }
    }
}
