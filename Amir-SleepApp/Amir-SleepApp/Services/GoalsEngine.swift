import Foundation

struct SleepGoalConfig: Codable {
    var durationTargetMin: Double = 480
    var scoreTarget: Int = 75
    var bedtimeStartMin: Int = 1350  // 22:30
    var bedtimeEndMin: Int = 1380    // 23:00
}

struct OptimalBedtime {
    let startHour: Int
    let startMinute: Int
    let endHour: Int
    let endMinute: Int
}

enum GoalsEngine {

    // MARK: - Goal Checks

    static func checkDurationGoalMet(session: SleepSession, target: Double) -> Bool {
        session.stats.totalSleepTime >= target
    }

    static func checkScoreGoalMet(session: SleepSession, target: Int) -> Bool {
        session.score.overall >= target
    }

    static func checkBedtimeGoalMet(session: SleepSession, startMin: Int, endMin: Int) -> Bool {
        let cal = Calendar.current
        let h = cal.component(.hour, from: session.startDate)
        let m = cal.component(.minute, from: session.startDate)
        let raw = h * 60 + m
        // Normalize: hours before noon (e.g. 00:30 = 30) get +1440 for evening comparison
        let bedtimeMin = h < 12 ? raw + 1440 : raw
        return bedtimeMin >= startMin && bedtimeMin <= endMin
    }

    // MARK: - Streaks

    static func computeStreak(sessions: [SleepSession], check: (SleepSession) -> Bool) -> Int {
        var streak = 0
        for session in sessions.reversed() {
            if check(session) {
                streak += 1
            } else {
                break
            }
        }
        return streak
    }

    // MARK: - Optimal Bedtime

    static func computeOptimalBedtime(sessions: [SleepSession]) -> OptimalBedtime? {
        guard sessions.count >= 7 else { return nil }

        let sorted = sessions.sorted { $0.score.overall > $1.score.overall }
        let topCount = max(3, sessions.count / 3)
        let top = Array(sorted.prefix(topCount))

        let bedtimes: [Int] = top.map { session -> Int in
            let cal = Calendar.current
            let h = cal.component(.hour, from: session.startDate)
            let m = cal.component(.minute, from: session.startDate)
            // Normalize: hours before noon are "next day" (add 1440 to sort correctly)
            let raw = h * 60 + m
            return h < 12 ? raw + 1440 : raw
        }.sorted()

        guard let first = bedtimes.first, let last = bedtimes.last else { return nil }

        let earliest = first % 1440
        let latest = last % 1440

        return OptimalBedtime(
            startHour: earliest / 60,
            startMinute: earliest % 60,
            endHour: latest / 60,
            endMinute: latest % 60
        )
    }
}
