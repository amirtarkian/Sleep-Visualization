import Foundation

enum SleepScoringEngine {

    private static func clamp(_ value: Double, min: Double, max: Double) -> Double {
        Swift.max(min, Swift.min(max, value))
    }

    private static func linearScale(_ value: Double, min: Double, max: Double) -> Double {
        clamp(((value - min) / (max - min)) * 100, min: 0, max: 100)
    }

    // MARK: - Sub-Score Functions

    static func scoreDuration(totalSleepMinutes: Double) -> Int {
        let hours = totalSleepMinutes / 60.0
        if hours >= 7 && hours <= 9 { return 100 }
        if hours < 7 { return Int(linearScale(hours, min: 5, max: 7).rounded()) }
        return Int(linearScale(11 - hours, min: 0, max: 2).rounded())
    }

    static func scoreEfficiency(efficiency: Double) -> Int {
        if efficiency >= 85 { return 100 }
        return Int(linearScale(efficiency, min: 65, max: 85).rounded())
    }

    static func scoreDeepSleep(deepPercent: Double) -> Int {
        if deepPercent >= 10 && deepPercent <= 25 { return 100 }
        if deepPercent < 10 { return Int(linearScale(deepPercent, min: 0, max: 10).rounded()) }
        return Int(linearScale(40 - deepPercent, min: 0, max: 15).rounded())
    }

    static func scoreRem(remPercent: Double) -> Int {
        if remPercent >= 20 && remPercent <= 25 { return 100 }
        if remPercent < 20 { return Int(linearScale(remPercent, min: 0, max: 20).rounded()) }
        return Int(linearScale(40 - remPercent, min: 0, max: 15).rounded())
    }

    static func scoreLatency(latencyMinutes: Double) -> Int {
        if latencyMinutes >= 10 && latencyMinutes <= 20 { return 100 }
        if latencyMinutes < 5 { return 70 }
        if latencyMinutes < 10 {
            // 5-10 min: linear from 70 to 100
            return Int((70 + (latencyMinutes - 5) / 5 * 30).rounded())
        }
        // >20 min: linear from 100 to 0 at 45 min
        return Int(clamp(100 - ((latencyMinutes - 20) / 25) * 100, min: 0, max: 100).rounded())
    }

    static func scoreWaso(wasoMinutes: Double) -> Int {
        if wasoMinutes <= 20 { return 100 }
        return Int(clamp(100 - ((wasoMinutes - 20) / 40) * 100, min: 0, max: 100).rounded())
    }

    static func scoreTiming(midpointMinutesFromMidnight: Double) -> Int {
        // Optimal range: 0-180 minutes from midnight (midnight to 3AM)
        if midpointMinutesFromMidnight >= 0 && midpointMinutesFromMidnight <= 180 { return 100 }
        // Each hour (60 minutes) outside the range = -25 points
        let minutesOutside: Double
        if midpointMinutesFromMidnight < 0 {
            minutesOutside = -midpointMinutesFromMidnight
        } else {
            minutesOutside = midpointMinutesFromMidnight - 180
        }
        let penalty = (minutesOutside / 60.0) * 25
        return Int(clamp(100 - penalty, min: 0, max: 100).rounded())
    }

    static func scoreRestoration(sleepingHR: Double, restingHR: Double) -> Int {
        guard restingHR > 0 else { return 50 }
        let dropPercent = ((restingHR - sleepingHR) / restingHR) * 100
        if dropPercent >= 10 { return 100 }
        if dropPercent >= 0 {
            // 0% drop = 50, 10% drop = 100, linear between
            return Int((50 + dropPercent * 5).rounded())
        }
        // HR rise (negative drop): return 30
        return 30
    }

    // MARK: - Composite Score

    static func computeSleepScore(
        totalSleepTime: Double,
        sleepEfficiency: Double,
        deepPercent: Double,
        remPercent: Double,
        sleepLatency: Double,
        waso: Double,
        hasStages: Bool,
        midpointMinutesFromMidnight: Double,
        sleepingHR: Double,
        restingHR: Double
    ) -> SleepScoreData {
        let duration = Double(scoreDuration(totalSleepMinutes: totalSleepTime))
        let efficiency = Double(scoreEfficiency(efficiency: sleepEfficiency))
        let latency = Double(scoreLatency(latencyMinutes: sleepLatency))
        let wasoScore = Double(scoreWaso(wasoMinutes: waso))
        let timingScore = Double(scoreTiming(midpointMinutesFromMidnight: midpointMinutesFromMidnight))
        let restorationScore = Double(scoreRestoration(sleepingHR: sleepingHR, restingHR: restingHR))

        let deep = hasStages ? Double(scoreDeepSleep(deepPercent: deepPercent)) : 0
        let rem = hasStages ? Double(scoreRem(remPercent: remPercent)) : 0

        let overall: Double
        if hasStages {
            overall = duration * ScoreWeights.duration
                + efficiency * ScoreWeights.efficiency
                + deep * ScoreWeights.deepSleep
                + rem * ScoreWeights.rem
                + latency * ScoreWeights.latency
                + wasoScore * ScoreWeights.waso
                + timingScore * ScoreWeights.timing
                + restorationScore * ScoreWeights.restoration
        } else {
            overall = duration * ScoreWeightsFallback.duration
                + efficiency * ScoreWeightsFallback.efficiency
                + latency * ScoreWeightsFallback.latency
                + wasoScore * ScoreWeightsFallback.waso
                + timingScore * ScoreWeightsFallback.timing
                + restorationScore * ScoreWeightsFallback.restoration
        }

        return SleepScoreData(
            overall: Int(clamp(overall, min: 0, max: 100).rounded()),
            duration: Int(duration.rounded()),
            efficiency: Int(efficiency.rounded()),
            deepSleep: Int(deep.rounded()),
            rem: Int(rem.rounded()),
            latency: Int(latency.rounded()),
            waso: Int(wasoScore.rounded()),
            timing: Int(timingScore.rounded()),
            restoration: Int(restorationScore.rounded()),
            isFallback: !hasStages
        )
    }
}
