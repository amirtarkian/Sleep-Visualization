import Testing
@testable import Amir_SleepApp

struct ReportEngineTests {

    private func makeSession(
        nightDate: String = "2024-01-15",
        overall: Int = 75,
        totalSleepTime: Double = 450
    ) -> SleepSession {
        let stats = SleepStats(
            timeInBed: 480, totalSleepTime: totalSleepTime, sleepEfficiency: 90,
            sleepLatency: 10, waso: 15, deepMinutes: 90, remMinutes: 90,
            coreMinutes: 240, awakeMinutes: 30, deepPercent: 20,
            remPercent: 20, corePercent: 53, awakePercent: 7
        )
        let score = SleepScoreData(
            overall: overall, duration: 80, efficiency: 80, deepSleep: 80,
            rem: 80, latency: 80, waso: 80, timing: 80, restoration: 80,
            isFallback: false
        )
        let start = Calendar.current.date(from: DateComponents(year: 2024, month: 1, day: 15, hour: 23))!
        return SleepSession(
            nightDate: nightDate, startDate: start,
            endDate: start.addingTimeInterval(8 * 3600),
            stages: [], score: score, stats: stats,
            biometrics: BiometricSummary(), isFallback: false
        )
    }

    @Test func emptySessionsReturnsEmptyReport() {
        let report = ReportEngine.generateWeeklyReport(sessions: [])
        #expect(report.avgScore == 0)
        #expect(report.bestNight == nil)
        #expect(report.insights.isEmpty)
    }

    @Test func weeklyReportComputesAverages() {
        let sessions = [makeSession(overall: 70), makeSession(overall: 80)]
        let report = ReportEngine.generateWeeklyReport(sessions: sessions)
        #expect(report.avgScore == 75)
        #expect(report.nightCount == 2)
    }

    @Test func bestAndWorstNightsIdentified() {
        let sessions = [
            makeSession(overall: 60),
            makeSession(overall: 90),
            makeSession(overall: 75),
        ]
        let report = ReportEngine.generateWeeklyReport(sessions: sessions)
        #expect(report.bestNight?.score.overall == 90)
        #expect(report.worstNight?.score.overall == 60)
    }

    @Test func trendStable_smallDifference() {
        let sessions = (0..<6).map { _ in makeSession(overall: 75) }
        let report = ReportEngine.generateWeeklyReport(sessions: sessions)
        #expect(report.trendDirection == .stable)
    }

    @Test func trendImproving_largeDifference() {
        var sessions: [SleepSession] = []
        for i in 0..<8 {
            sessions.append(makeSession(overall: i < 4 ? 60 : 80))
        }
        let report = ReportEngine.generateMonthlyReport(sessions: sessions)
        #expect(report.trendDirection == .improving)
    }

    @Test func trendDeclining_largeDifference() {
        var sessions: [SleepSession] = []
        for i in 0..<8 {
            sessions.append(makeSession(overall: i < 4 ? 80 : 60))
        }
        let report = ReportEngine.generateMonthlyReport(sessions: sessions)
        #expect(report.trendDirection == .declining)
    }

    @Test func monthlyReportIncludesWeeklyBreakdown() {
        let sessions = (0..<10).map { i in
            makeSession(nightDate: "2024-01-\(String(format: "%02d", i + 1))")
        }
        let report = ReportEngine.generateMonthlyReport(sessions: sessions)
        #expect(!report.weeklyBreakdown.isEmpty)
    }
}
