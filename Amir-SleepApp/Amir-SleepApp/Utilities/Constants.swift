import SwiftUI

// MARK: - Stage Colors
enum StageColor {
    static let awake = Color(hex: "#ef4444")
    static let rem = Color(hex: "#a78bfa")
    static let core = Color(hex: "#60a5fa")
    static let deep = Color(hex: "#1e40af")
}

// MARK: - Score Thresholds
struct ScoreInfo {
    let label: String
    let color: Color
}

func getScoreInfo(_ score: Int) -> ScoreInfo {
    switch score {
    case 85...100: return ScoreInfo(label: "Optimal", color: Color(hex: "#22c55e"))
    case 70...84:  return ScoreInfo(label: "Good", color: Color(hex: "#3b82f6"))
    case 55...69:  return ScoreInfo(label: "Fair", color: Color(hex: "#eab308"))
    default:       return ScoreInfo(label: "Needs Improvement", color: Color(hex: "#ef4444"))
    }
}

// MARK: - Score Weights
enum ScoreWeights {
    static let duration = 0.30
    static let efficiency = 0.15
    static let deepSleep = 0.12
    static let rem = 0.10
    static let latency = 0.08
    static let waso = 0.08
    static let timing = 0.08
    static let restoration = 0.09
}

enum ScoreWeightsFallback {
    static let duration = 0.40
    static let efficiency = 0.25
    static let latency = 0.10
    static let waso = 0.10
    static let timing = 0.08
    static let restoration = 0.07
}

// MARK: - Thresholds
let gapMergeThreshold: TimeInterval = 3 * 60 * 60 // 3 hours in seconds
let nightCutoffHour = 6 // before 6AM = previous night

// MARK: - App Theme
enum AppTheme {
    static let background = Color(hex: "#0D0D0D")
    static let cardBackground = Color(hex: "#1A1A1A")
    static let cardBorder = Color.white.opacity(0.08)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.6)
    static let textTertiary = Color.white.opacity(0.4)
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
