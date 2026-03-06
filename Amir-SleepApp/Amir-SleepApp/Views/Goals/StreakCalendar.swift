import SwiftUI

/// A 30-day calendar grid showing goal adherence.
/// Each day is a colored circle: green = met, red = missed, gray = no data.
struct StreakCalendar: View {
    /// One entry per day for the last 30 days, ordered oldest-first.
    /// `nil` means no data, `true` means goal met, `false` means missed.
    let days: [Bool?]

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("LAST 30 DAYS")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(Array(days.enumerated()), id: \.offset) { index, met in
                    Circle()
                        .fill(circleColor(for: met))
                        .frame(width: 28, height: 28)
                        .overlay(
                            dayLabel(for: index)
                        )
                }
            }

            HStack(spacing: 16) {
                legendItem(color: Color(hex: "#22c55e"), label: "Met")
                legendItem(color: Color(hex: "#ef4444"), label: "Missed")
                legendItem(color: AppTheme.textTertiary.opacity(0.3), label: "No data")
            }
            .font(.caption2)
            .foregroundStyle(AppTheme.textSecondary)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private func circleColor(for met: Bool?) -> Color {
        guard let met else {
            return AppTheme.textTertiary.opacity(0.3)
        }
        return met ? Color(hex: "#22c55e") : Color(hex: "#ef4444")
    }

    private func dayLabel(for index: Int) -> some View {
        let daysAgo = days.count - 1 - index
        let date = Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date()) ?? Date()
        let day = Calendar.current.component(.day, from: date)
        return Text("\(day)")
            .font(.system(size: 9, weight: .medium))
            .foregroundStyle(AppTheme.textPrimary.opacity(0.7))
    }

    private func legendItem(color: Color, label: String) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label)
        }
    }
}
