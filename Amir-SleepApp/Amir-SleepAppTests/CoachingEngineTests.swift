import Testing
@testable import Amir_SleepApp

struct CoachingEngineTests {

    private func makeSession(
        deepPercent: Double = 15,
        sleepEfficiency: Double = 90,
        sleepLatency: Double = 10,
        overall: Int = 75,
        startDate: Date = Calendar.current.date(from: DateComponents(year: 2024, month: 1, day: 15, hour: 23))!
    ) -> SleepSession {
        let stats = SleepStats(
            timeInBed: 480, totalSleepTime: 450, sleepEfficiency: sleepEfficiency,
            sleepLatency: sleepLatency, waso: 15, deepMinutes: 90, remMinutes: 90,
            coreMinutes: 240, awakeMinutes: 30, deepPercent: deepPercent,
            remPercent: 20, corePercent: 53, awakePercent: 7
        )
        let score = SleepScoreData(
            overall: overall, duration: 80, efficiency: 80, deepSleep: 80,
            rem: 80, latency: 80, waso: 80, timing: 80, restoration: 80,
            isFallback: false
        )
        return SleepSession(
            nightDate: "2024-01-15", startDate: startDate,
            endDate: startDate.addingTimeInterval(8 * 3600),
            stages: [], score: score, stats: stats,
            biometrics: BiometricSummary(), isFallback: false
        )
    }

    @Test func emptySessionsReturnsEmpty() {
        let tips = CoachingEngine.generateTips(sessions: [])
        #expect(tips.isEmpty)
    }

    @Test func lowDeepSleepTriggersWarning() {
        let sessions = (0..<3).map { _ in makeSession(deepPercent: 5) }
        let tips = CoachingEngine.generateTips(sessions: sessions)
        #expect(tips.contains { $0.id == "low-deep" })
    }

    @Test func lowEfficiencyTriggersWarning() {
        let sessions = [makeSession(sleepEfficiency: 70)]
        let tips = CoachingEngine.generateTips(sessions: sessions)
        #expect(tips.contains { $0.id == "low-eff" })
    }

    @Test func highLatencyTriggersWarning() {
        let sessions = [makeSession(sleepLatency: 35)]
        let tips = CoachingEngine.generateTips(sessions: sessions)
        #expect(tips.contains { $0.id == "high-lat" })
    }

    @Test func sleepDebtTriggersWarning() {
        let sessions = [makeSession(sleepLatency: 3)]
        let tips = CoachingEngine.generateTips(sessions: sessions)
        #expect(tips.contains { $0.id == "sleep-debt" })
    }

    @Test func excellentSleepTriggersPositive() {
        let sessions = [makeSession(overall: 90)]
        let tips = CoachingEngine.generateTips(sessions: sessions)
        #expect(tips.contains { $0.id == "excellent" })
    }

    @Test func maxThreeTipsReturned() {
        let sessions = (0..<3).map { _ in
            makeSession(deepPercent: 5, sleepEfficiency: 70, sleepLatency: 35, overall: 90)
        }
        let tips = CoachingEngine.generateTips(sessions: sessions)
        #expect(tips.count <= 3)
    }

    @Test func tipsAreSortedByPriority() {
        let sessions = (0..<3).map { _ in
            makeSession(deepPercent: 5, sleepEfficiency: 70)
        }
        let tips = CoachingEngine.generateTips(sessions: sessions)
        if tips.count >= 2 {
            #expect(tips[0].priority <= tips[1].priority)
        }
    }
}
