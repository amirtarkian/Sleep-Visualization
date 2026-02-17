import SwiftUI
import Charts

struct StageDonutChart: View {
    let stats: SleepStats

    private struct StageSlice: Identifiable {
        let id = UUID()
        let stage: String
        let minutes: Double
        let color: Color
    }

    private var slices: [StageSlice] {
        [
            StageSlice(stage: "Deep", minutes: stats.deepMinutes, color: StageColor.deep),
            StageSlice(stage: "Core", minutes: stats.coreMinutes, color: StageColor.core),
            StageSlice(stage: "REM", minutes: stats.remMinutes, color: StageColor.rem),
            StageSlice(stage: "Awake", minutes: stats.awakeMinutes, color: StageColor.awake),
        ].filter { $0.minutes > 0 }
    }

    var body: some View {
        VStack(spacing: 12) {
            Text("STAGE DISTRIBUTION")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)
            Chart(slices) { slice in
                SectorMark(angle: .value("Duration", slice.minutes), innerRadius: .ratio(0.6), angularInset: 2)
                    .foregroundStyle(slice.color)
            }
            .frame(height: 150)
            HStack(spacing: 16) {
                ForEach(slices) { slice in
                    HStack(spacing: 4) {
                        Circle().fill(slice.color).frame(width: 8, height: 8)
                        Text("\(slice.stage) \(formatDuration(minutes: slice.minutes))")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
