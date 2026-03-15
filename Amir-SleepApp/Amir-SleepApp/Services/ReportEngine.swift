import Foundation

// MARK: - Report Types

enum TrendDirection: String {
    case improving = "Improving"
    case declining = "Declining"
    case stable = "Stable"
}

struct WeeklyBreakdownEntry: Identifiable {
    let id = UUID()
    let weekLabel: String
    let avgScore: Int
    let avgDuration: Double
    let nightCount: Int
}

struct SleepReport {
    let avgScore: Int
    let avgDuration: Double
    let bestNight: SleepSession?
    let worstNight: SleepSession?
    let trendDirection: TrendDirection
    let insights: [String]
    let recommendations: [String]
    let weeklyBreakdown: [WeeklyBreakdownEntry]
    let avgEfficiency: Double
    let avgDeepMinutes: Double
    let avgRemMinutes: Double
    let avgCoreMinutes: Double
    let avgAwakeMinutes: Double
    let nightCount: Int
}

// MARK: - Report Engine

enum ReportEngine {

    // MARK: - Weekly Report

    static func generateWeeklyReport(sessions: [SleepSession]) -> SleepReport {
        generateReport(sessions: sessions, includeWeeklyBreakdown: false)
    }

    // MARK: - Monthly Report

    static func generateMonthlyReport(sessions: [SleepSession]) -> SleepReport {
        generateReport(sessions: sessions, includeWeeklyBreakdown: true)
    }

    // MARK: - Core Report Generation

    private static func generateReport(sessions: [SleepSession], includeWeeklyBreakdown: Bool) -> SleepReport {
        guard !sessions.isEmpty else {
            return SleepReport(
                avgScore: 0, avgDuration: 0,
                bestNight: nil, worstNight: nil,
                trendDirection: .stable,
                insights: [], recommendations: [],
                weeklyBreakdown: [],
                avgEfficiency: 0, avgDeepMinutes: 0, avgRemMinutes: 0,
                avgCoreMinutes: 0, avgAwakeMinutes: 0, nightCount: 0
            )
        }

        let count = Double(sessions.count)

        // Averages
        let totalScore = sessions.reduce(0) { $0 + $1.score.overall }
        let avgScore = Int(Double(totalScore) / count)

        let totalDuration = sessions.reduce(0.0) { $0 + $1.stats.totalSleepTime }
        let avgDuration = totalDuration / count

        let avgEfficiency = sessions.reduce(0.0) { $0 + $1.stats.sleepEfficiency } / count
        let avgDeepMinutes = sessions.reduce(0.0) { $0 + $1.stats.deepMinutes } / count
        let avgRemMinutes = sessions.reduce(0.0) { $0 + $1.stats.remMinutes } / count
        let avgCoreMinutes = sessions.reduce(0.0) { $0 + $1.stats.coreMinutes } / count
        let avgAwakeMinutes = sessions.reduce(0.0) { $0 + $1.stats.awakeMinutes } / count

        // Best & worst nights
        let bestNight = sessions.max(by: { $0.score.overall < $1.score.overall })
        let worstNight = sessions.min(by: { $0.score.overall < $1.score.overall })

        // Trend direction
        let trendDirection = computeTrend(sessions: sessions)

        // Insights
        let insights = generateInsights(sessions: sessions, avgScore: avgScore, avgDuration: avgDuration)

        // Recommendations
        let recommendations = generateRecommendations(
            avgScore: avgScore,
            avgEfficiency: avgEfficiency,
            avgDeepMinutes: avgDeepMinutes,
            avgDuration: avgDuration
        )

        // Weekly breakdown (monthly only)
        let weeklyBreakdown: [WeeklyBreakdownEntry]
        if includeWeeklyBreakdown {
            weeklyBreakdown = buildWeeklyBreakdown(sessions: sessions)
        } else {
            weeklyBreakdown = []
        }

        return SleepReport(
            avgScore: avgScore,
            avgDuration: avgDuration,
            bestNight: bestNight,
            worstNight: worstNight,
            trendDirection: trendDirection,
            insights: insights,
            recommendations: recommendations,
            weeklyBreakdown: weeklyBreakdown,
            avgEfficiency: avgEfficiency,
            avgDeepMinutes: avgDeepMinutes,
            avgRemMinutes: avgRemMinutes,
            avgCoreMinutes: avgCoreMinutes,
            avgAwakeMinutes: avgAwakeMinutes,
            nightCount: sessions.count
        )
    }

    // MARK: - Trend

    private static func computeTrend(sessions: [SleepSession]) -> TrendDirection {
        guard sessions.count >= 4 else { return .stable }
        let half = sessions.count / 2
        let firstHalf = sessions.prefix(half)
        let secondHalf = sessions.suffix(half)
        let firstAvg = Double(firstHalf.reduce(0) { $0 + $1.score.overall }) / Double(firstHalf.count)
        let secondAvg = Double(secondHalf.reduce(0) { $0 + $1.score.overall }) / Double(secondHalf.count)
        let diff = secondAvg - firstAvg
        if diff > 5 { return .improving }
        if diff < -5 { return .declining }
        return .stable
    }

    // MARK: - Insights

    private static func generateInsights(sessions: [SleepSession], avgScore: Int, avgDuration: Double) -> [String] {
        var insights: [String] = []

        // Weekend vs weekday comparison
        let calendar = Calendar.current
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        var weekdayScores: [Int] = []
        var weekendScores: [Int] = []

        for session in sessions {
            if let date = dateFormatter.date(from: session.nightDate) {
                let weekday = calendar.component(.weekday, from: date)
                let isWeekend = (weekday == 1 || weekday == 7) // Sun = 1, Sat = 7
                if isWeekend {
                    weekendScores.append(session.score.overall)
                } else {
                    weekdayScores.append(session.score.overall)
                }
            }
        }

        if !weekdayScores.isEmpty && !weekendScores.isEmpty {
            let weekdayAvg = Double(weekdayScores.reduce(0, +)) / Double(weekdayScores.count)
            let weekendAvg = Double(weekendScores.reduce(0, +)) / Double(weekendScores.count)
            let diff = weekendAvg - weekdayAvg
            if diff > 5 {
                insights.append("You sleep better on weekends (score \(Int(weekendAvg)) vs \(Int(weekdayAvg)) on weekdays).")
            } else if diff < -5 {
                insights.append("You sleep better on weekdays (score \(Int(weekdayAvg)) vs \(Int(weekendAvg)) on weekends).")
            } else {
                insights.append("Your sleep quality is consistent between weekdays and weekends.")
            }
        }

        // Best bedtime correlation
        let sessionsWithScores: [(bedtimeMinutes: Double, score: Int)] = sessions.compactMap { session in
            let hour = calendar.component(.hour, from: session.startDate)
            let minute = calendar.component(.minute, from: session.startDate)
            let totalMinutes = hour * 60 + minute
            let adjusted = Double(hour < 12 ? totalMinutes + 1440 : totalMinutes)
            return (bedtimeMinutes: adjusted, score: session.score.overall)
        }

        if sessionsWithScores.count >= 3 {
            // Find top-scoring sessions and their average bedtime
            let sorted = sessionsWithScores.sorted { $0.score > $1.score }
            let topCount = max(sorted.count / 3, 1)
            let topSessions = sorted.prefix(topCount)
            let avgBedtime = topSessions.reduce(0.0) { $0 + $1.bedtimeMinutes } / Double(topSessions.count)
            let bedtimeString = formatMinutesAsTime(avgBedtime >= 1440 ? avgBedtime - 1440 : avgBedtime)
            insights.append("Your best nights correlate with a bedtime around \(bedtimeString).")
        }

        // Duration insight
        let durationHrs = avgDuration / 60.0
        if durationHrs < 7 {
            insights.append("Your average sleep duration is under 7 hours. Adults typically need 7-9 hours.")
        } else if durationHrs > 9 {
            insights.append("Your average sleep duration exceeds 9 hours, which may indicate oversleeping.")
        } else {
            let formatted = formatDuration(minutes: avgDuration)
            insights.append("Your average sleep of \(formatted) is within the recommended 7-9 hour range.")
        }

        return insights
    }

    // MARK: - Recommendations

    private static func generateRecommendations(
        avgScore: Int,
        avgEfficiency: Double,
        avgDeepMinutes: Double,
        avgDuration: Double
    ) -> [String] {
        var recs: [String] = []

        if avgScore < 70 {
            recs.append("Focus on sleep consistency -- go to bed and wake up at the same time daily.")
        }

        if avgEfficiency < 85 {
            recs.append("Your sleep efficiency is low. Only go to bed when you feel sleepy.")
        }

        if avgDeepMinutes < 30 {
            recs.append("Deep sleep is low. Keep your room cool (65-68 F) and avoid alcohol before bed.")
        }

        if avgDuration < 420 { // Less than 7 hours
            recs.append("Try to extend your sleep window by going to bed 30 minutes earlier.")
        }

        if avgScore >= 80 && avgEfficiency >= 90 {
            recs.append("Great sleep habits! Maintain your current routine.")
        }

        if recs.isEmpty {
            recs.append("Keep up your current sleep routine and monitor trends over time.")
        }

        return recs
    }

    // MARK: - Weekly Breakdown

    private static func buildWeeklyBreakdown(sessions: [SleepSession]) -> [WeeklyBreakdownEntry] {
        let calendar = Calendar.current
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let labelFormatter = DateFormatter()
        labelFormatter.dateFormat = "MMM d"

        // Group sessions by (year, weekOfYear) to handle year boundaries
        struct YearWeek: Hashable { let year: Int; let week: Int }
        var weekBuckets: [YearWeek: [SleepSession]] = [:]
        var weekStartDates: [YearWeek: Date] = [:]

        for session in sessions {
            guard let date = dateFormatter.date(from: session.nightDate) else { continue }
            let components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
            let key = YearWeek(year: components.yearForWeekOfYear ?? 0, week: components.weekOfYear ?? 0)
            weekBuckets[key, default: []].append(session)
            if weekStartDates[key] == nil {
                weekStartDates[key] = date
            } else if let existing = weekStartDates[key], date < existing {
                weekStartDates[key] = date
            }
        }

        // Sort by start date and build entries
        let sortedWeeks = weekBuckets.keys.sorted { key1, key2 in
            let date1 = weekStartDates[key1] ?? Date.distantPast
            let date2 = weekStartDates[key2] ?? Date.distantPast
            return date1 < date2
        }

        return sortedWeeks.map { weekKey in
            let bucket = weekBuckets[weekKey] ?? []
            let startDate = weekStartDates[weekKey] ?? Date()
            let weekLabel = "Week of \(labelFormatter.string(from: startDate))"
            let count = Double(bucket.count)
            let avgScoreVal = Int(Double(bucket.reduce(0) { $0 + $1.score.overall }) / max(count, 1))
            let avgDur = bucket.reduce(0.0) { $0 + $1.stats.totalSleepTime } / max(count, 1)
            return WeeklyBreakdownEntry(
                weekLabel: weekLabel,
                avgScore: avgScoreVal,
                avgDuration: avgDur,
                nightCount: bucket.count
            )
        }
    }
}
