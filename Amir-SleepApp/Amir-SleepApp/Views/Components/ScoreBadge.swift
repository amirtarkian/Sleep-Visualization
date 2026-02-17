import SwiftUI

struct ScoreBadge: View {
    let score: Int
    private var info: ScoreInfo { getScoreInfo(score) }

    var body: some View {
        Text(info.label)
            .font(.caption.bold())
            .foregroundStyle(info.color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(info.color.opacity(0.15))
            .clipShape(Capsule())
    }
}
