import SwiftUI

struct CoachingTipsCard: View {
    let tips: [CoachingTip]

    var body: some View {
        if !tips.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Today's Tips")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                ForEach(tips) { tip in
                    HStack(alignment: .top, spacing: 12) {
                        tipIcon(tip.type)
                            .font(.system(size: 16))
                            .frame(width: 20)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(tip.title)
                                .font(.subheadline).fontWeight(.medium)
                                .foregroundColor(.white)
                            Text(tip.message)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                        }
                    }
                    .padding(12)
                    .background(AppTheme.cardBackground)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder))
                }
            }
        }
    }

    @ViewBuilder
    private func tipIcon(_ type: CoachingTip.TipType) -> some View {
        switch type {
        case .warning: Image(systemName: "exclamationmark.triangle.fill").foregroundColor(.orange)
        case .info: Image(systemName: "lightbulb.fill").foregroundColor(.blue)
        case .positive: Image(systemName: "star.fill").foregroundColor(.green)
        }
    }
}
