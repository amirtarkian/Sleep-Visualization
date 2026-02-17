import SwiftUI

struct HypnogramView: View {
    let stages: [SleepStageInterval]
    let sessionStart: Date
    let sessionEnd: Date

    private let stageOrder: [SleepStageType] = [.awake, .rem, .core, .deep]
    private let stageLabels = ["Awake", "REM", "Core", "Deep"]

    private func stageColor(for stage: SleepStageType) -> Color {
        switch stage {
        case .awake: StageColor.awake
        case .rem: StageColor.rem
        case .core: StageColor.core
        case .deep: StageColor.deep
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SLEEP STAGES")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            GeometryReader { geo in
                let totalDuration = sessionEnd.timeIntervalSince(sessionStart)
                let width = geo.size.width - 50
                let height = geo.size.height

                HStack(spacing: 0) {
                    VStack(spacing: 0) {
                        ForEach(Array(stageLabels.enumerated()), id: \.offset) { _, label in
                            Text(label)
                                .font(.system(size: 9))
                                .foregroundStyle(AppTheme.textTertiary)
                                .frame(maxHeight: .infinity)
                        }
                    }
                    .frame(width: 45)

                    Canvas { context, size in
                        for stage in stages {
                            let startOffset = stage.startDate.timeIntervalSince(sessionStart)
                            let duration = stage.endDate.timeIntervalSince(stage.startDate)
                            let x = (startOffset / totalDuration) * Double(width)
                            let w = (duration / totalDuration) * Double(width)
                            let stageIndex = stageOrder.firstIndex(of: stage.stage) ?? 0
                            let stepH = Double(size.height) / Double(stageOrder.count)
                            let y = stepH * Double(stageIndex)
                            let rect = CGRect(x: x, y: y, width: max(w, 1), height: stepH)
                            context.fill(Path(rect), with: .color(stageColor(for: stage.stage)))
                        }
                    }
                    .frame(width: width, height: height)
                }
            }
            .frame(height: 120)

            HStack {
                Text(formatTime(sessionStart))
                Spacer()
                Text(formatTime(sessionEnd))
            }
            .font(.caption2)
            .foregroundStyle(AppTheme.textTertiary)
            .padding(.leading, 45)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
