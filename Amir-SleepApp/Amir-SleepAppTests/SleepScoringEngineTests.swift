import Testing
@testable import Amir_SleepApp

struct SleepScoringEngineTests {

    // MARK: - Duration

    @Test func scoreDuration_idealRange_returns100() {
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 420) == 100)
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 480) == 100)
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 540) == 100)
    }

    @Test func scoreDuration_tooShort_scales() {
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 300) == 0)
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 360) == 50)
    }

    @Test func scoreDuration_tooLong_scales() {
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 600) == 50)
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 660) == 0)
    }

    // MARK: - Efficiency

    @Test func scoreEfficiency_above85_returns100() {
        #expect(SleepScoringEngine.scoreEfficiency(efficiency: 90) == 100)
        #expect(SleepScoringEngine.scoreEfficiency(efficiency: 85) == 100)
    }

    @Test func scoreEfficiency_below85_scales() {
        #expect(SleepScoringEngine.scoreEfficiency(efficiency: 75) == 50)
        #expect(SleepScoringEngine.scoreEfficiency(efficiency: 65) == 0)
    }

    // MARK: - Deep Sleep

    @Test func scoreDeepSleep_idealRange_returns100() {
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 10) == 100)
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 20) == 100)
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 25) == 100)
    }

    @Test func scoreDeepSleep_tooLow_scales() {
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 0) == 0)
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 5) == 50)
    }

    // MARK: - REM

    @Test func scoreRem_idealRange_returns100() {
        #expect(SleepScoringEngine.scoreRem(remPercent: 20) == 100)
        #expect(SleepScoringEngine.scoreRem(remPercent: 25) == 100)
    }

    @Test func scoreRem_tooLow_scales() {
        #expect(SleepScoringEngine.scoreRem(remPercent: 0) == 0)
        #expect(SleepScoringEngine.scoreRem(remPercent: 10) == 50)
    }

    // MARK: - Latency

    @Test func scoreLatency_idealRange_returns100() {
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 10) == 100)
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 15) == 100)
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 20) == 100)
    }

    @Test func scoreLatency_veryFast_returns70() {
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 3) == 70)
    }

    @Test func scoreLatency_slow_scales() {
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 45) == 0)
    }

    // MARK: - WASO

    @Test func scoreWaso_under20_returns100() {
        #expect(SleepScoringEngine.scoreWaso(wasoMinutes: 10) == 100)
        #expect(SleepScoringEngine.scoreWaso(wasoMinutes: 20) == 100)
    }

    @Test func scoreWaso_over20_scales() {
        #expect(SleepScoringEngine.scoreWaso(wasoMinutes: 40) == 50)
        #expect(SleepScoringEngine.scoreWaso(wasoMinutes: 60) == 0)
    }

    // MARK: - Timing

    @Test func scoreTiming_optimal_returns100() {
        #expect(SleepScoringEngine.scoreTiming(midpointMinutesFromMidnight: 0) == 100)
        #expect(SleepScoringEngine.scoreTiming(midpointMinutesFromMidnight: 90) == 100)
        #expect(SleepScoringEngine.scoreTiming(midpointMinutesFromMidnight: 180) == 100)
    }

    @Test func scoreTiming_outsideRange_penalizes() {
        #expect(SleepScoringEngine.scoreTiming(midpointMinutesFromMidnight: -60) == 75)
        #expect(SleepScoringEngine.scoreTiming(midpointMinutesFromMidnight: 240) == 75)
    }

    // MARK: - Restoration

    @Test func scoreRestoration_goodDrop_returns100() {
        #expect(SleepScoringEngine.scoreRestoration(sleepingHR: 63, restingHR: 70) == 100)
    }

    @Test func scoreRestoration_noDrop_returns50() {
        #expect(SleepScoringEngine.scoreRestoration(sleepingHR: 70, restingHR: 70) == 50)
    }

    @Test func scoreRestoration_hrRise_returns30() {
        #expect(SleepScoringEngine.scoreRestoration(sleepingHR: 75, restingHR: 70) == 30)
    }

    @Test func scoreRestoration_zeroRestingHR_returns50() {
        #expect(SleepScoringEngine.scoreRestoration(sleepingHR: 60, restingHR: 0) == 50)
    }

    // MARK: - Composite Score

    @Test func computeSleepScore_withStages_returnsAllSubScores() {
        let score = SleepScoringEngine.computeSleepScore(
            totalSleepTime: 480, sleepEfficiency: 90, deepPercent: 15,
            remPercent: 22, sleepLatency: 15, waso: 10, hasStages: true,
            midpointMinutesFromMidnight: 90, sleepingHR: 55, restingHR: 65
        )
        #expect(score.overall > 0 && score.overall <= 100)
        #expect(score.duration == 100)
        #expect(score.efficiency == 100)
        #expect(score.deepSleep == 100)
        #expect(score.rem == 100)
        #expect(score.isFallback == false)
    }

    @Test func computeSleepScore_noStages_usesFallbackWeights() {
        let score = SleepScoringEngine.computeSleepScore(
            totalSleepTime: 480, sleepEfficiency: 90, deepPercent: 15,
            remPercent: 22, sleepLatency: 15, waso: 10, hasStages: false,
            midpointMinutesFromMidnight: 90, sleepingHR: 55, restingHR: 65
        )
        #expect(score.deepSleep == 0)
        #expect(score.rem == 0)
        #expect(score.isFallback == true)
        #expect(score.overall > 0)
    }
}
