import Foundation

enum ReadinessEngine {

    static func scoreHRV(current: Double, baseline: Double) -> Int {
        guard baseline > 0 else { return 50 }
        let ratio = current / baseline
        if ratio >= 1.15 { return 100 }
        if ratio <= 0.85 { return 40 }
        if ratio >= 1.0 {
            return Int((70 + (ratio - 1.0) / 0.15 * 30).rounded())
        } else {
            return Int((40 + (ratio - 0.85) / 0.15 * 30).rounded())
        }
    }

    static func scoreRestingHR(current: Double, baseline: Double) -> Int {
        guard baseline > 0 else { return 50 }
        let diff = current - baseline
        if diff <= -5 { return 100 }
        if diff >= 5 { return 40 }
        return Int((80 - diff * 8).rounded())
    }

    static func computeReadinessScore(
        hrvCurrent: Double,
        hrvBaseline: Double,
        restingHRCurrent: Double,
        restingHRBaseline: Double,
        sleepScore: Int
    ) -> Int {
        let hrvScore = Double(scoreHRV(current: hrvCurrent, baseline: hrvBaseline))
        let hrScore = Double(scoreRestingHR(current: restingHRCurrent, baseline: restingHRBaseline))
        let sleepContribution = Double(sleepScore)

        let overall = hrvScore * 0.50 + hrScore * 0.30 + sleepContribution * 0.20
        return Int(min(100, max(0, overall)).rounded())
    }
}
