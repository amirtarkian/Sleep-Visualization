import SwiftUI

struct InsightCardsView: View {
    let insights: [Insight]

    private func icon(for category: InsightCategory) -> String {
        switch category {
        case .correlation: return "link"
        case .pattern: return "arrow.triangle.2.circlepath"
        case .biometric: return "heart.fill"
        }
    }

    private func directionColor(_ direction: InsightDirection) -> Color {
        switch direction {
        case .positive: return Color(hex: "#22c55e")
        case .negative: return Color(hex: "#ef4444")
        case .neutral: return AppTheme.textTertiary
        }
    }

    private func directionArrow(_ direction: InsightDirection) -> String {
        switch direction {
        case .positive: return "\u{25B2}"
        case .negative: return "\u{25BC}"
        case .neutral: return "\u{2014}"
        }
    }

    var body: some View {
        if insights.isEmpty { EmptyView() } else {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(insights) { insight in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                Image(systemName: icon(for: insight.category))
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textTertiary)
                                Text(insight.title)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(AppTheme.textPrimary)
                                    .lineLimit(1)
                                Text(directionArrow(insight.direction))
                                    .font(.caption2)
                                    .foregroundStyle(directionColor(insight.direction))
                            }
                            Text(insight.description)
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                                .lineLimit(3)
                        }
                        .padding(12)
                        .frame(width: 260, alignment: .leading)
                        .background(AppTheme.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}
