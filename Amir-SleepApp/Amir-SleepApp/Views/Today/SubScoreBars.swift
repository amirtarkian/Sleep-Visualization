import SwiftUI

struct SubScoreBars: View {
    let score: SleepScoreData

    private struct SubScore: Identifiable {
        let id = UUID()
        let name: String
        let value: Int
        let icon: String
    }

    private var subScores: [SubScore] {
        var items = [
            SubScore(name: "Duration", value: score.duration, icon: "clock"),
            SubScore(name: "Efficiency", value: score.efficiency, icon: "gauge.with.dots.needle.33percent"),
        ]
        if !score.isFallback {
            items.append(contentsOf: [
                SubScore(name: "Deep Sleep", value: score.deepSleep, icon: "waveform.path.ecg"),
                SubScore(name: "REM Sleep", value: score.rem, icon: "brain"),
            ])
        }
        items.append(contentsOf: [
            SubScore(name: "Latency", value: score.latency, icon: "hourglass"),
            SubScore(name: "WASO", value: score.waso, icon: "eye"),
            SubScore(name: "Timing", value: score.timing, icon: "moon.stars"),
            SubScore(name: "Restoration", value: score.restoration, icon: "heart.circle"),
        ])
        return items
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SCORE BREAKDOWN")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            ForEach(subScores) { sub in
                HStack(spacing: 12) {
                    Image(systemName: sub.icon)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 16)
                    Text(sub.name)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 80, alignment: .leading)
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(AppTheme.cardBackground)
                                .frame(height: 8)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(getScoreInfo(sub.value).color)
                                .frame(width: geo.size.width * CGFloat(sub.value) / 100, height: 8)
                        }
                    }
                    .frame(height: 8)
                    Text("\(sub.value)")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(width: 30, alignment: .trailing)
                }
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
