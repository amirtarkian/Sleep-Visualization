import Foundation

struct CoachingTip: Identifiable {
    let id: String
    let title: String
    let message: String
    let priority: Int
    enum TipType { case warning, info, positive }
    let type: TipType
}

enum CoachingEngine {
    /// Generates up to 3 prioritized coaching tips based on recent sleep sessions.
    /// Expects sessions sorted chronologically (oldest first).
    static func generateTips(sessions: [SleepSession]) -> [CoachingTip] {
        guard let latest = sessions.last else { return [] }
        var tips: [CoachingTip] = []
        let recent3 = Array(sessions.suffix(3))
        let recent7 = Array(sessions.suffix(7))

        // Deep sleep < 10% for 3+ nights
        if recent3.count >= 3, recent3.allSatisfy({ $0.stats.deepPercent < 10 }) {
            tips.append(.init(id: "low-deep", title: "Low Deep Sleep",
                message: "Your deep sleep has been below 10% recently. Try keeping your room at 65-68\u{00B0}F and avoiding alcohol before bed.",
                priority: 1, type: .warning))
        }
        // Efficiency < 85%
        if latest.stats.sleepEfficiency < 85 {
            tips.append(.init(id: "low-eff", title: "Low Sleep Efficiency",
                message: "You\u{2019}re spending too much time awake in bed. Go to bed only when sleepy.",
                priority: 2, type: .warning))
        }
        // Latency > 30 min
        if latest.stats.sleepLatency > 30 {
            tips.append(.init(id: "high-lat", title: "Slow Sleep Onset",
                message: "Taking over 30 minutes to fall asleep. Try a wind-down routine with no screens 30 min before bed.",
                priority: 3, type: .warning))
        }
        // Latency < 5 min (sleep debt)
        if latest.stats.sleepLatency < 5 && latest.stats.sleepLatency > 0 {
            tips.append(.init(id: "sleep-debt", title: "Possible Sleep Debt",
                message: "Falling asleep in under 5 minutes may indicate sleep deprivation. Try adding 30 minutes to your sleep time.",
                priority: 2, type: .warning))
        }
        // Inconsistent bedtime (std dev > 60 min over 5+ nights)
        if recent7.count >= 5 {
            let bedtimes: [Double] = recent7.map { s in
                let cal = Calendar.current
                let h = cal.component(.hour, from: s.startDate)
                let m = cal.component(.minute, from: s.startDate)
                let totalMin = h * 60 + m
                return Double(h < 12 ? totalMin + 1440 : totalMin)
            }
            let count = Double(bedtimes.count)
            let mean = bedtimes.reduce(0.0, +) / count
            let variance: Double = bedtimes.reduce(0.0) { acc, val in
                let diff = val - mean
                return acc + diff * diff
            } / count
            let stdDev = sqrt(variance)
            if stdDev > 60 {
                tips.append(.init(id: "inconsistent", title: "Inconsistent Bedtime",
                    message: "Your bedtime varies by over an hour. A consistent schedule helps your circadian rhythm.",
                    priority: 4, type: .info))
            }
        }
        // Declining trend (first 3 vs last 3 of 7-day window)
        if recent7.count >= 7 {
            let first3 = Double(recent7.prefix(3).reduce(0) { $0 + $1.score.overall }) / 3
            let last3 = Double(recent7.suffix(3).reduce(0) { $0 + $1.score.overall }) / 3
            if last3 < first3 - 10 {
                tips.append(.init(id: "declining", title: "Sleep Quality Declining",
                    message: "Your sleep score has trended down. Check recent changes to stress, caffeine, or exercise.",
                    priority: 2, type: .warning))
            }
        }
        // Excellent sleep (85+)
        if latest.score.overall >= 85 {
            tips.append(.init(id: "excellent", title: "Excellent Sleep!",
                message: "Great sleep last night! Keep it up.", priority: 10, type: .positive))
        }
        return Array(tips.sorted { $0.priority < $1.priority }.prefix(3))
    }
}
