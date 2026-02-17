import Foundation

enum SleepScoringEngine {

    private static func clamp(_ value: Double, min: Double, max: Double) -> Double {
        Swift.max(min, Swift.min(max, value))
    }

    private static func linearScale(_ value: Double, min: Double, max: Double) -> Double {
        clamp(((value - min) / (max - min)) * 100, min: 0, max: 100)
    }

    static func scoreDuration(totalSleepMinutes: Double) -> Int {
        let hours = totalSleepMinutes / 60.0
        if hours >= 7 && hours <= 9 { return 100 }
        if hours < 7 { return Int(linearScale(hours, min: 4, max: 7).rounded()) }
        return Int((linearScale(11 - hours, min: 0, max: 2) * 100 / 100).rounded())
    }

    static func scoreEfficiency(efficiency: Double) -> Int {
        if efficiency >= 90 { return 100 }
        return Int(linearScale(efficiency, min: 60, max: 90).rounded())
    }

    static func scoreDeepSleep(deepPercent: Double) -> Int {
        if deepPercent >= 15 && deepPercent <= 25 { return 100 }
        if deepPercent < 15 { return Int(linearScale(deepPercent, min: 0, max: 15).rounded()) }
        return Int(linearScale(40 - deepPercent, min: 0, max: 15).rounded())
    }

    static func scoreRem(remPercent: Double) -> Int {
        if remPercent >= 20 && remPercent <= 30 { return 100 }
        if remPercent < 20 { return Int(linearScale(remPercent, min: 0, max: 20).rounded()) }
        return Int(linearScale(45 - remPercent, min: 0, max: 15).rounded())
    }

    static func scoreLatency(latencyMinutes: Double) -> Int {
        if latencyMinutes <= 15 { return 100 }
        return Int(clamp(100 - ((latencyMinutes - 15) / 45) * 100, min: 0, max: 100).rounded())
    }

    static func scoreWaso(wasoMinutes: Double) -> Int {
        if wasoMinutes <= 10 { return 100 }
        return Int(clamp(100 - ((wasoMinutes - 10) / 50) * 100, min: 0, max: 100).rounded())
    }

    static func computeSleepScore(
        totalSleepTime: Double,
        sleepEfficiency: Double,
        deepPercent: Double,
        remPercent: Double,
        sleepLatency: Double,
        waso: Double,
        hasStages: Bool
    ) -> SleepScoreData {
        let duration = Double(scoreDuration(totalSleepMinutes: totalSleepTime))
        let efficiency = Double(scoreEfficiency(efficiency: sleepEfficiency))
        let latency = Double(scoreLatency(latencyMinutes: sleepLatency))
        let wasoScore = Double(scoreWaso(wasoMinutes: waso))

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
        } else {
            overall = duration * ScoreWeightsFallback.duration
                + efficiency * ScoreWeightsFallback.efficiency
                + latency * ScoreWeightsFallback.latency
                + wasoScore * ScoreWeightsFallback.waso
        }

        return SleepScoreData(
            overall: Int(clamp(overall, min: 0, max: 100).rounded()),
            duration: Int(duration.rounded()),
            efficiency: Int(efficiency.rounded()),
            deepSleep: Int(deep.rounded()),
            rem: Int(rem.rounded()),
            latency: Int(latency.rounded()),
            waso: Int(wasoScore.rounded()),
            isFallback: !hasStages
        )
    }
}
