import Testing
@testable import Amir_SleepApp

struct GoalsEngineTests {

    private func makeSession(
        totalSleepTime: Double = 480,
        overall: Int = 80,
        startHour: Int = 23,
        startMinute: Int = 0
    ) -> SleepSession {
        let cal = Calendar.current
        let startDate = cal.date(from: DateComponents(year: 2024, month: 1, day: 15, hour: startHour, minute: startMinute))!
        let stats = SleepStats(
            timeInBed: 500, totalSleepTime: totalSleepTime, sleepEfficiency: 90,
            sleepLatency: 10, waso: 15, deepMinutes: 90, remMinutes: 90,
            coreMinutes: 240, awakeMinutes: 30, deepPercent: 20,
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

    @Test func durationGoalMet() {
        let session = makeSession(totalSleepTime: 480)
        #expect(GoalsEngine.checkDurationGoalMet(session: session, target: 480))
        #expect(GoalsEngine.checkDurationGoalMet(session: session, target: 420))
        #expect(!GoalsEngine.checkDurationGoalMet(session: session, target: 500))
    }

    @Test func scoreGoalMet() {
        let session = makeSession(overall: 80)
        #expect(GoalsEngine.checkScoreGoalMet(session: session, target: 75))
        #expect(GoalsEngine.checkScoreGoalMet(session: session, target: 80))
        #expect(!GoalsEngine.checkScoreGoalMet(session: session, target: 85))
    }

    @Test func bedtimeGoalMet_evening() {
        let session = makeSession(startHour: 22, startMinute: 30)
        #expect(GoalsEngine.checkBedtimeGoalMet(session: session, startMin: 1320, endMin: 1380))
    }

    @Test func bedtimeGoalMet_afterMidnight() {
        let session = makeSession(startHour: 0, startMinute: 30)
        #expect(GoalsEngine.checkBedtimeGoalMet(session: session, startMin: 1440, endMin: 1500))
    }

    @Test func streakCounting() {
        let sessions = [
            makeSession(overall: 80),
            makeSession(overall: 80),
            makeSession(overall: 60),
            makeSession(overall: 80),
            makeSession(overall: 80),
        ]
        let streak = GoalsEngine.computeStreak(sessions: sessions) { s in
            GoalsEngine.checkScoreGoalMet(session: s, target: 75)
        }
        #expect(streak == 2)
    }

    @Test func streakAllMet() {
        let sessions = (0..<5).map { _ in makeSession(overall: 80) }
        let streak = GoalsEngine.computeStreak(sessions: sessions) { s in
            GoalsEngine.checkScoreGoalMet(session: s, target: 75)
        }
        #expect(streak == 5)
    }

    @Test func optimalBedtime_insufficientData() {
        let sessions = (0..<3).map { _ in makeSession() }
        #expect(GoalsEngine.computeOptimalBedtime(sessions: sessions) == nil)
    }

    @Test func optimalBedtime_sufficientData() {
        let sessions = (0..<10).map { _ in makeSession(startHour: 22, startMinute: 30) }
        let result = GoalsEngine.computeOptimalBedtime(sessions: sessions)
        #expect(result != nil)
        #expect(result!.startHour == 22)
    }
}
