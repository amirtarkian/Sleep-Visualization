import XCTest
@testable import Amir_SleepApp

final class InsightsEngineTests: XCTestCase {

    private func makeSession(
        nightDate: String,
        overall: Int = 75,
        totalSleepTime: Double = 450,
        deepPercent: Double = 18,
        startHour: Int = 23,
        avgHrv: Double? = 45,
        minHeartRate: Double? = 52,
        avgSpo2: Double? = 96.5
    ) -> SleepSession {
        let cal = Calendar.current
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let baseDate = formatter.date(from: nightDate)!
        let start = cal.date(bySettingHour: startHour, minute: 0, second: 0, of: baseDate)!
        let end = cal.date(byAdding: .minute, value: Int(totalSleepTime) + 30, to: start)!

        return SleepSession(
            nightDate: nightDate,
            startDate: start,
            endDate: end,
            stages: [],
            score: SleepScoreData(
                overall: overall, duration: 80, efficiency: 85, deepSleep: 70,
                rem: 70, latency: 80, waso: 80, timing: 90, restoration: 75, isFallback: false
            ),
            stats: SleepStats(
                timeInBed: totalSleepTime + 30, totalSleepTime: totalSleepTime,
                sleepEfficiency: 93, sleepLatency: 12, waso: 15,
                deepMinutes: 80, remMinutes: 90, coreMinutes: 250, awakeMinutes: 30,
                deepPercent: deepPercent, remPercent: 20, corePercent: 55, awakePercent: 7
            ),
            biometrics: BiometricSummary(
                avgHeartRate: 62, minHeartRate: minHeartRate,
                maxHeartRate: 85, avgHrv: avgHrv,
                avgSpo2: avgSpo2, avgRespiratoryRate: 14
            ),
            isFallback: false
        )
    }

    private func dateRange(from start: String, count: Int) -> [String] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let base = formatter.date(from: start)!
        return (0..<count).map { i in
            formatter.string(from: Calendar.current.date(byAdding: .day, value: i, to: base)!)
        }
    }

    func testReturnsEmptyForTooFewSessions() {
        let sessions = dateRange(from: "2026-01-01", count: 5).map { makeSession(nightDate: $0) }
        XCTAssertTrue(InsightsEngine.computeInsights(sessions: sessions).isEmpty)
    }

    func testReturnsAtMost5Insights() {
        let sessions = dateRange(from: "2026-01-01", count: 30).enumerated().map { i, d in
            makeSession(nightDate: d, overall: 50 + (i % 3 == 0 ? 30 : 0), avgHrv: 30 + Double(i) * 0.5)
        }
        let insights = InsightsEngine.computeInsights(sessions: sessions)
        XCTAssertLessThanOrEqual(insights.count, 5)
    }

    func testDetectsSleepStreak() {
        let sessions = dateRange(from: "2026-01-01", count: 14).map { makeSession(nightDate: $0, overall: 80) }
        let insights = InsightsEngine.computeInsights(sessions: sessions)
        XCTAssertTrue(insights.contains { $0.id == "pat-streak" })
    }

    func testDetectsHrvTrend() {
        let sessions = dateRange(from: "2026-01-01", count: 14).enumerated().map { i, d in
            makeSession(nightDate: d, avgHrv: 30 + Double(i) * 2)
        }
        let insights = InsightsEngine.computeInsights(sessions: sessions)
        let hrv = insights.first { $0.id == "bio-hrv" }
        XCTAssertNotNil(hrv)
        XCTAssertEqual(hrv?.direction, .positive)
    }

    func testDetectsLowSpo2() {
        let sessions = dateRange(from: "2026-01-01", count: 14).map { makeSession(nightDate: $0, avgSpo2: 93) }
        let insights = InsightsEngine.computeInsights(sessions: sessions)
        XCTAssertTrue(insights.contains { $0.id == "bio-spo2-low" })
    }

    func testDetectsRecoveryPattern() {
        let sessions = dateRange(from: "2026-01-01", count: 20).enumerated().map { i, d in
            makeSession(nightDate: d, overall: i % 2 == 0 ? 50 : 80)
        }
        let insights = InsightsEngine.computeInsights(sessions: sessions)
        XCTAssertTrue(insights.contains { $0.id == "pat-recovery" })
    }

    func testAllInsightsHaveRequiredFields() {
        let sessions = dateRange(from: "2026-01-01", count: 30).enumerated().map { i, d in
            makeSession(nightDate: d, overall: 50 + i, avgHrv: 30 + Double(i))
        }
        let insights = InsightsEngine.computeInsights(sessions: sessions)
        for insight in insights {
            XCTAssertFalse(insight.id.isEmpty)
            XCTAssertFalse(insight.title.isEmpty)
            XCTAssertFalse(insight.description.isEmpty)
            XCTAssertGreaterThan(insight.significance, 0)
            XCTAssertLessThanOrEqual(insight.significance, 1)
        }
    }
}
