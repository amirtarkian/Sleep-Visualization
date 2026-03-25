import Foundation

enum InsightCategory: String, Codable {
    case correlation, pattern, biometric
}

enum InsightDirection: String, Codable {
    case positive, negative, neutral
}

struct Insight: Identifiable, Codable {
    let id: String
    let category: InsightCategory
    let title: String
    let description: String
    let significance: Double
    let metric: String
    let direction: InsightDirection
}

enum InsightsEngine {

    static func computeInsights(sessions: [SleepSession]) -> [Insight] {
        guard sessions.count >= 7 else { return [] }

        let sorted = sessions.sorted { $0.nightDate < $1.nightDate }
        var insights: [Insight] = []

        // Correlations
        insights += bedtimeCorrelation(sorted)
        insights += durationCorrelation(sorted)
        insights += consistencyCorrelation(sorted)
        insights += weekendCorrelation(sorted)
        insights += deepSleepCorrelation(sorted)

        // Patterns
        insights += weekendEffect(sorted)
        insights += streakDetection(sorted)
        insights += recoveryPattern(sorted)
        insights += trendMomentum(sorted)

        // Biometrics
        insights += hrvTrend(sorted)
        insights += restingHrTrend(sorted)
        insights += spo2Stability(sorted)

        return insights
            .filter { $0.significance > 0.1 }
            .sorted { $0.significance > $1.significance }
            .prefix(5)
            .map { $0 }
    }

    // MARK: - Correlations

    private static func bedtimeCorrelation(_ sessions: [SleepSession]) -> [Insight] {
        var early: [Int] = []
        var mid: [Int] = []
        var late: [Int] = []

        for s in sessions {
            let bt = bedtimeMinutes(s.startDate)
            let score = s.score.overall
            if bt <= -90 { early.append(score) }
            else if bt <= 0 { mid.append(score) }
            else { late.append(score) }
        }

        let buckets = [
            ("before 10:30pm", early),
            ("between 10:30pm-midnight", mid),
            ("after midnight", late)
        ].filter { $0.1.count >= 3 }
         .map { (label: $0.0, avg: avg($0.1.map { Double($0) })) }
         .sorted { $0.avg > $1.avg }

        guard buckets.count >= 2 else { return [] }
        let diff = buckets.first!.avg - buckets.last!.avg
        guard diff >= 3 else { return [] }

        return [Insight(
            id: "corr-bedtime",
            category: .correlation,
            title: "Best Bedtime Window",
            description: "You score \(Int(diff.rounded())) pts higher \(buckets.first!.label) vs. \(buckets.last!.label).",
            significance: min(diff / 20, 1),
            metric: "bedtime",
            direction: .positive
        )]
    }

    private static func durationCorrelation(_ sessions: [SleepSession]) -> [Insight] {
        let ideal = sessions.filter { $0.stats.totalSleepTime >= 420 && $0.stats.totalSleepTime <= 540 }
        let outside = sessions.filter { $0.stats.totalSleepTime < 420 || $0.stats.totalSleepTime > 540 }
        guard ideal.count >= 3, outside.count >= 3 else { return [] }

        let idealAvg = avg(ideal.map { Double($0.score.overall) })
        let outsideAvg = avg(outside.map { Double($0.score.overall) })
        let diff = idealAvg - outsideAvg
        guard diff >= 3 else { return [] }

        return [Insight(
            id: "corr-duration",
            category: .correlation,
            title: "Duration Sweet Spot",
            description: "Nights with 7-9h sleep score \(Int(diff.rounded())) pts higher than shorter/longer nights.",
            significance: min(diff / 20, 1),
            metric: "duration",
            direction: .positive
        )]
    }

    private static func consistencyCorrelation(_ sessions: [SleepSession]) -> [Insight] {
        guard sessions.count >= 14 else { return [] }

        var weeks: [(variance: Double, avgScore: Double)] = []
        var i = 0
        while i + 7 <= sessions.count {
            let week = Array(sessions[i..<i+7])
            let bedtimes = week.map { bedtimeMinutes($0.startDate) }
            let meanBt = bedtimes.reduce(0.0, +) / Double(bedtimes.count)
            let variance = bedtimes.reduce(0.0) { $0 + ($1 - meanBt) * ($1 - meanBt) } / Double(bedtimes.count)
            let score = avg(week.map { Double($0.score.overall) })
            weeks.append((variance, score))
            i += 7
        }

        guard weeks.count >= 2 else { return [] }
        let medVar = medianValue(weeks.map { $0.variance })
        let consistent = weeks.filter { $0.variance <= medVar }
        let inconsistent = weeks.filter { $0.variance > medVar }
        guard !consistent.isEmpty, !inconsistent.isEmpty else { return [] }

        let diff = avg(consistent.map { $0.avgScore }) - avg(inconsistent.map { $0.avgScore })
        guard diff >= 2 else { return [] }

        return [Insight(
            id: "corr-consistency",
            category: .correlation,
            title: "Consistency Pays Off",
            description: "Weeks with regular bedtimes average \(Int(diff.rounded())) pts higher.",
            significance: min(diff / 15, 1),
            metric: "consistency",
            direction: .positive
        )]
    }

    private static func weekendCorrelation(_ sessions: [SleepSession]) -> [Insight] {
        let cal = Calendar.current
        let weekday = sessions.filter { s in
            guard let d = dateFromNight(s.nightDate) else { return false }
            let wd = cal.component(.weekday, from: d)
            return wd >= 2 && wd <= 5
        }
        let weekend = sessions.filter { s in
            guard let d = dateFromNight(s.nightDate) else { return false }
            let wd = cal.component(.weekday, from: d)
            return wd == 6 || wd == 7 || wd == 1
        }
        guard weekday.count >= 3, weekend.count >= 3 else { return [] }

        let wdAvg = avg(weekday.map { Double($0.score.overall) })
        let weAvg = avg(weekend.map { Double($0.score.overall) })
        let diff = abs(wdAvg - weAvg)
        guard diff >= 3 else { return [] }

        let better = wdAvg > weAvg ? "weeknights" : "weekends"
        let worse = wdAvg > weAvg ? "weekends" : "weeknights"

        return [Insight(
            id: "corr-weekend",
            category: .correlation,
            title: "Weekday vs. Weekend",
            description: "You score \(Int(diff.rounded())) pts higher on \(better) than \(worse).",
            significance: min(diff / 15, 1),
            metric: "weekend",
            direction: wdAvg > weAvg ? .negative : .positive
        )]
    }

    private static func deepSleepCorrelation(_ sessions: [SleepSession]) -> [Insight] {
        guard sessions.count >= 10 else { return [] }

        var pairs: [(deep: Double, nextScore: Int)] = []
        for i in 0..<sessions.count - 1 {
            if sessions[i].stats.deepPercent > 0 {
                pairs.append((sessions[i].stats.deepPercent, sessions[i+1].score.overall))
            }
        }
        guard pairs.count >= 7 else { return [] }

        let medDeep = medianValue(pairs.map { $0.deep })
        let high = pairs.filter { $0.deep >= medDeep }
        let low = pairs.filter { $0.deep < medDeep }

        let diff = avg(high.map { Double($0.nextScore) }) - avg(low.map { Double($0.nextScore) })
        guard diff >= 3 else { return [] }

        return [Insight(
            id: "corr-deep-lag",
            category: .correlation,
            title: "Deep Sleep Carryover",
            description: "Nights after high deep sleep (>\(Int(medDeep.rounded()))%) score \(Int(diff.rounded())) pts higher.",
            significance: min(diff / 15, 1),
            metric: "deepSleep",
            direction: .positive
        )]
    }

    // MARK: - Patterns

    private static func weekendEffect(_ sessions: [SleepSession]) -> [Insight] {
        let cal = Calendar.current
        let friSat = sessions.filter { s in
            guard let d = dateFromNight(s.nightDate) else { return false }
            let wd = cal.component(.weekday, from: d)
            return wd == 6 || wd == 7
        }
        let other = sessions.filter { s in
            guard let d = dateFromNight(s.nightDate) else { return false }
            let wd = cal.component(.weekday, from: d)
            return wd != 6 && wd != 7
        }
        guard friSat.count >= 3, other.count >= 5 else { return [] }

        let friSatDeep = avg(friSat.map { $0.stats.deepPercent })
        let otherDeep = avg(other.map { $0.stats.deepPercent })
        let diff = otherDeep - friSatDeep
        guard abs(diff) >= 2 else { return [] }

        let desc = diff > 0
            ? "Deep sleep drops \(String(format: "%.1f", diff))% on Fri/Sat nights vs. weeknights."
            : "Deep sleep rises \(String(format: "%.1f", abs(diff)))% on Fri/Sat nights vs. weeknights."

        return [Insight(
            id: "pat-weekend-deep",
            category: .pattern,
            title: "Weekend Effect",
            description: desc,
            significance: min(abs(diff) / 10, 1),
            metric: "deepSleep",
            direction: diff > 0 ? .negative : .positive
        )]
    }

    private static func streakDetection(_ sessions: [SleepSession]) -> [Insight] {
        var maxStreak = 0
        var current = 0
        for s in sessions {
            if s.score.overall >= 70 {
                current += 1
                maxStreak = max(maxStreak, current)
            } else {
                current = 0
            }
        }
        guard maxStreak >= 5 else { return [] }

        return [Insight(
            id: "pat-streak",
            category: .pattern,
            title: "Sleep Streak",
            description: "\(maxStreak)-night streak of \"Good\" or better sleep (score \u{2265}70).",
            significance: min(Double(maxStreak) / 14, 1),
            metric: "score",
            direction: .positive
        )]
    }

    private static func recoveryPattern(_ sessions: [SleepSession]) -> [Insight] {
        guard sessions.count >= 10 else { return [] }

        var recoveries: [Double] = []
        for i in 0..<sessions.count - 1 {
            if sessions[i].score.overall < 60 {
                recoveries.append(Double(sessions[i+1].score.overall - sessions[i].score.overall))
            }
        }
        guard recoveries.count >= 3 else { return [] }

        let avgRec = avg(recoveries)
        guard avgRec >= 5 else { return [] }

        return [Insight(
            id: "pat-recovery",
            category: .pattern,
            title: "Bounce-Back Sleeper",
            description: "After a poor night (<60), you recover by ~\(Int(avgRec.rounded())) pts the next night.",
            significance: min(avgRec / 20, 1),
            metric: "score",
            direction: .positive
        )]
    }

    private static func trendMomentum(_ sessions: [SleepSession]) -> [Insight] {
        guard sessions.count >= 14 else { return [] }

        var avgs: [Double] = []
        for i in 6..<sessions.count {
            let window = sessions[(i-6)...i]
            avgs.append(avg(window.map { Double($0.score.overall) }))
        }
        guard avgs.count >= 3 else { return [] }

        var deltas: [Double] = []
        for i in 1..<avgs.count {
            deltas.append(avgs[i] - avgs[i-1])
        }

        let recentDelta = avg(Array(deltas.suffix(7)))
        guard abs(recentDelta) >= 0.3 else { return [] }

        let accelerating = recentDelta > 0
        return [Insight(
            id: "pat-momentum",
            category: .pattern,
            title: accelerating ? "Building Momentum" : "Losing Momentum",
            description: accelerating
                ? "Your 7-day average is climbing (+\(String(format: "%.1f", recentDelta)) pts/night)."
                : "Your 7-day average is slipping (\(String(format: "%.1f", recentDelta)) pts/night).",
            significance: min(abs(recentDelta) / 2, 1),
            metric: "score",
            direction: accelerating ? .positive : .negative
        )]
    }

    // MARK: - Biometrics

    private static func hrvTrend(_ sessions: [SleepSession]) -> [Insight] {
        let data = sessions.compactMap { $0.biometrics.avgHrv }
        guard data.count >= 7 else { return [] }

        let slope = linearSlope(data)
        guard abs(slope) >= 0.05 else { return [] }

        let totalChange = slope * Double(data.count)
        let rising = slope > 0

        return [Insight(
            id: "bio-hrv",
            category: .biometric,
            title: rising ? "HRV Trending Up" : "HRV Trending Down",
            description: rising
                ? "HRV improved ~\(Int(abs(totalChange).rounded()))ms over this period."
                : "HRV declined ~\(Int(abs(totalChange).rounded()))ms over this period.",
            significance: min(abs(totalChange) / 15, 1),
            metric: "hrv",
            direction: rising ? .positive : .negative
        )]
    }

    private static func restingHrTrend(_ sessions: [SleepSession]) -> [Insight] {
        let data = sessions.compactMap { $0.biometrics.minHeartRate }
        guard data.count >= 7 else { return [] }

        let slope = linearSlope(data)
        guard abs(slope) >= 0.05 else { return [] }

        let totalChange = slope * Double(data.count)
        let improving = slope < 0

        return [Insight(
            id: "bio-rhr",
            category: .biometric,
            title: improving ? "Resting HR Improving" : "Resting HR Rising",
            description: improving
                ? "Resting HR dropped ~\(Int(abs(totalChange).rounded())) bpm over this period."
                : "Resting HR rose ~\(Int(abs(totalChange).rounded())) bpm over this period.",
            significance: min(abs(totalChange) / 10, 1),
            metric: "restingHr",
            direction: improving ? .positive : .negative
        )]
    }

    private static func spo2Stability(_ sessions: [SleepSession]) -> [Insight] {
        let data = sessions.compactMap { $0.biometrics.avgSpo2 }
        guard data.count >= 7 else { return [] }

        let mean = avg(data)
        let variance = data.reduce(0.0) { $0 + ($1 - mean) * ($1 - mean) } / Double(data.count)
        let stdDev = sqrt(variance)

        if mean < 95 {
            return [Insight(
                id: "bio-spo2-low",
                category: .biometric,
                title: "SpO2 Below Normal",
                description: "Average SpO2 is \(String(format: "%.1f", mean))% (normal: \u{2265}95%). Consider consulting a physician.",
                significance: min((95 - mean) / 5, 1),
                metric: "spo2",
                direction: .negative
            )]
        }

        guard stdDev >= 1 else { return [] }

        return [Insight(
            id: "bio-spo2-var",
            category: .biometric,
            title: "SpO2 Variability",
            description: "SpO2 fluctuates \u{00B1}\(String(format: "%.1f", stdDev))% between nights (avg \(String(format: "%.1f", mean))%).",
            significance: min(stdDev / 3, 1),
            metric: "spo2",
            direction: .negative
        )]
    }

    // MARK: - Utilities

    private static func avg(_ values: [Double]) -> Double {
        guard !values.isEmpty else { return 0 }
        return values.reduce(0, +) / Double(values.count)
    }

    private static func medianValue(_ values: [Double]) -> Double {
        guard !values.isEmpty else { return 0 }
        let sorted = values.sorted()
        let mid = sorted.count / 2
        return sorted.count % 2 != 0 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2
    }

    private static func linearSlope(_ values: [Double]) -> Double {
        let n = Double(values.count)
        guard n >= 2 else { return 0 }
        var sumX = 0.0, sumY = 0.0, sumXY = 0.0, sumXX = 0.0
        for (i, v) in values.enumerated() {
            let x = Double(i)
            sumX += x; sumY += v; sumXY += x * v; sumXX += x * x
        }
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    }

    private static func bedtimeMinutes(_ date: Date) -> Double {
        let mins = Double(Calendar.current.component(.hour, from: date) * 60 + Calendar.current.component(.minute, from: date))
        return mins >= 18 * 60 ? mins - 24 * 60 : mins
    }

    private static func dateFromNight(_ nightDate: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: nightDate)
    }
}
