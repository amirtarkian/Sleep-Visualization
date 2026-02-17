import SwiftUI

struct ScoreRing: View {
    let score: Int
    let label: String?
    var size: CGFloat = 200
    var lineWidth: CGFloat = 16
    var accentColor: Color? = nil

    @State private var animatedProgress: Double = 0

    private var progress: Double { Double(score) / 100.0 }
    private var scoreColor: Color { accentColor ?? getScoreInfo(score).color }

    var body: some View {
        ZStack {
            Circle()
                .stroke(AppTheme.cardBackground, lineWidth: lineWidth)

            Circle()
                .trim(from: 0, to: animatedProgress)
                .stroke(
                    AngularGradient(
                        colors: [scoreColor.opacity(0.6), scoreColor],
                        center: .center,
                        startAngle: .degrees(0),
                        endAngle: .degrees(360 * animatedProgress)
                    ),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            VStack(spacing: 4) {
                Text("\(score)")
                    .font(.system(size: size * 0.25, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .contentTransition(.numericText())

                if let label {
                    Text(label)
                        .font(.system(size: size * 0.07, weight: .medium))
                        .foregroundStyle(scoreColor)
                }
            }
        }
        .frame(width: size, height: size)
        .onAppear {
            withAnimation(.easeOut(duration: 1.2)) {
                animatedProgress = progress
            }
        }
        .onChange(of: score) { _, _ in
            withAnimation(.easeOut(duration: 0.8)) {
                animatedProgress = progress
            }
        }
    }
}
