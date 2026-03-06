import Foundation
import SwiftData
import HealthKit

@MainActor
@Observable
final class SyncManager {
    var isSyncing = false
    var lastSyncDate: Date?
    var syncError: String?

    /// Set by the app entry point so synced data is pushed to Supabase.
    var supabaseService: SupabaseService?

    private let healthKit = HealthKitService.shared

    init() {
        lastSyncDate = UserDefaults.standard.object(forKey: "lastSyncDate") as? Date
    }

    func sync(modelContext: ModelContext) async {
        guard !isSyncing else { return }
        isSyncing = true
        syncError = nil

        do {
            let endDate = Date()
            let startDate = lastSyncDate ?? Calendar.current.date(byAdding: .day, value: -90, to: endDate)!

            let sleepSamples = try await healthKit.fetchSleepSamples(from: startDate, to: endDate)

            let stageSamples = sleepSamples.filter { sample in
                let value = sample.value
                return value != HKCategoryValueSleepAnalysis.inBed.rawValue
            }

            let groups = SessionBuilder.groupIntoSessions(samples: stageSamples)

            for group in groups {
                guard let first = group.first else { continue }
                let sessionStart = first.startDate
                let sessionEnd = group.map(\.endDate).max() ?? first.endDate
                let nightDate = getNightDate(from: sessionStart)

                let existing = try modelContext.fetch(
                    FetchDescriptor<SleepSession>(
                        predicate: #Predicate { $0.nightDate == nightDate }
                    )
                )
                if !existing.isEmpty { continue }

                let stages: [SleepStageInterval] = group.compactMap { sample in
                    guard let stage = SessionBuilder.mapSleepStage(sample.value) else { return nil }
                    return SleepStageInterval(stage: stage, startDate: sample.startDate, endDate: sample.endDate)
                }

                let stats = SessionBuilder.computeStats(startDate: sessionStart, endDate: sessionEnd, stages: stages)

                let biometrics = await fetchBiometrics(from: sessionStart, to: sessionEnd)

                // Compute sleep midpoint as minutes from midnight
                let midpoint = sessionStart.addingTimeInterval(sessionEnd.timeIntervalSince(sessionStart) / 2)
                let midpointComponents = Calendar.current.dateComponents([.hour, .minute], from: midpoint)
                let midpointHour = midpointComponents.hour ?? 0
                let midpointMinute = midpointComponents.minute ?? 0
                let rawMinutes = Double(midpointHour * 60 + midpointMinute)
                // Normalize: hours after midnight are 0+, hours before midnight (e.g. 11PM = 23:00) become negative
                let midpointMinutesFromMidnight = rawMinutes <= 720 ? rawMinutes : rawMinutes - 1440

                // Fetch resting HR for restoration sub-score
                let restingHRStart = Calendar.current.date(byAdding: .day, value: -7, to: sessionStart)!
                let restingHRSamples = (try? await healthKit.fetchRestingHeartRate(from: restingHRStart, to: sessionEnd)) ?? []
                let restingHR = restingHRSamples.isEmpty ? 0 : restingHRSamples.map(\.value).reduce(0, +) / Double(restingHRSamples.count)

                let score = SleepScoringEngine.computeSleepScore(
                    totalSleepTime: stats.totalSleepTime,
                    sleepEfficiency: stats.sleepEfficiency,
                    deepPercent: stats.deepPercent,
                    remPercent: stats.remPercent,
                    sleepLatency: stats.sleepLatency,
                    waso: stats.waso,
                    hasStages: !stages.isEmpty,
                    midpointMinutesFromMidnight: midpointMinutesFromMidnight,
                    sleepingHR: biometrics.avgHeartRate ?? 0,
                    restingHR: restingHR
                )

                let session = SleepSession(
                    nightDate: nightDate,
                    startDate: sessionStart,
                    endDate: sessionEnd,
                    stages: stages,
                    score: score,
                    stats: stats,
                    biometrics: biometrics,
                    isFallback: stages.isEmpty
                )
                modelContext.insert(session)

                // Push to Supabase
                if let supabase = supabaseService {
                    let payload: [String: Any] = [
                        "night_date": nightDate,
                        "start_date": ISO8601DateFormatter().string(from: sessionStart),
                        "end_date": ISO8601DateFormatter().string(from: sessionEnd),
                        "time_in_bed": stats.timeInBed,
                        "total_sleep_time": stats.totalSleepTime,
                        "sleep_efficiency": stats.sleepEfficiency,
                        "sleep_latency": stats.sleepLatency,
                        "waso": stats.waso,
                        "deep_minutes": stats.deepMinutes,
                        "rem_minutes": stats.remMinutes,
                        "core_minutes": stats.coreMinutes,
                        "awake_minutes": stats.awakeMinutes,
                        "deep_percent": stats.deepPercent,
                        "rem_percent": stats.remPercent,
                        "core_percent": stats.corePercent,
                        "awake_percent": stats.awakePercent,
                        "score_overall": score.overall,
                        "score_duration": score.duration,
                        "score_efficiency": score.efficiency,
                        "score_deep": score.deepSleep,
                        "score_rem": score.rem,
                        "score_latency": score.latency,
                        "score_waso": score.waso,
                        "score_timing": score.timing,
                        "score_restoration": score.restoration,
                        "is_fallback": stages.isEmpty,
                        "avg_heart_rate": biometrics.avgHeartRate as Any,
                        "min_heart_rate": biometrics.minHeartRate as Any,
                        "avg_hrv": biometrics.avgHrv as Any,
                        "avg_spo2": biometrics.avgSpo2 as Any,
                        "avg_respiratory_rate": biometrics.avgRespiratoryRate as Any,
                        "resting_heart_rate": restingHR,
                        "source_name": "Apple Watch",
                    ]
                    try? await supabase.pushSleepSession(payload)
                }
            }

            try await computeReadinessScores(modelContext: modelContext)

            try modelContext.save()
            lastSyncDate = endDate
            UserDefaults.standard.set(endDate, forKey: "lastSyncDate")

        } catch {
            syncError = error.localizedDescription
        }

        isSyncing = false
    }

    private func fetchBiometrics(from start: Date, to end: Date) async -> BiometricSummary {
        var summary = BiometricSummary()

        if let hrSamples = try? await healthKit.fetchHeartRate(from: start, to: end), !hrSamples.isEmpty {
            let values = hrSamples.map(\.value)
            summary.avgHeartRate = values.reduce(0, +) / Double(values.count)
            summary.minHeartRate = values.min()
            summary.maxHeartRate = values.max()
        }

        if let hrvSamples = try? await healthKit.fetchHRV(from: start, to: end), !hrvSamples.isEmpty {
            summary.avgHrv = hrvSamples.map(\.value).reduce(0, +) / Double(hrvSamples.count)
        }

        if let spo2Samples = try? await healthKit.fetchSpO2(from: start, to: end), !spo2Samples.isEmpty {
            summary.avgSpo2 = spo2Samples.map(\.value).reduce(0, +) / Double(spo2Samples.count) * 100
        }

        if let rrSamples = try? await healthKit.fetchRespiratoryRate(from: start, to: end), !rrSamples.isEmpty {
            summary.avgRespiratoryRate = rrSamples.map(\.value).reduce(0, +) / Double(rrSamples.count)
        }

        return summary
    }

    private func computeReadinessScores(modelContext: ModelContext) async throws {
        let descriptor = FetchDescriptor<SleepSession>(
            sortBy: [SortDescriptor(\.nightDate, order: .reverse)]
        )
        let sessions = try modelContext.fetch(descriptor)
        guard let latest = sessions.first else { return }

        let nightDate = latest.nightDate
        let biometrics = latest.biometrics

        let existing = try modelContext.fetch(
            FetchDescriptor<ReadinessRecord>(
                predicate: #Predicate { $0.date == nightDate }
            )
        )
        if !existing.isEmpty { return }

        let recentSessions = Array(sessions.prefix(7))
        let hrvValues = recentSessions.compactMap(\.biometrics.avgHrv)
        let hrvBaseline = hrvValues.isEmpty ? 0 : hrvValues.reduce(0, +) / Double(hrvValues.count)
        let hrvCurrent = biometrics.avgHrv ?? hrvBaseline

        let endDate = Date()
        let startDate7d = Calendar.current.date(byAdding: .day, value: -7, to: endDate)!
        let restingHRSamples = (try? await healthKit.fetchRestingHeartRate(from: startDate7d, to: endDate)) ?? []
        let restingHRBaseline = restingHRSamples.isEmpty ? 0 : restingHRSamples.map(\.value).reduce(0, +) / Double(restingHRSamples.count)
        let restingHRCurrent = restingHRSamples.last?.value ?? restingHRBaseline

        let sleepScore = latest.score.overall

        let readinessScore = ReadinessEngine.computeReadinessScore(
            hrvCurrent: hrvCurrent,
            hrvBaseline: hrvBaseline,
            restingHRCurrent: restingHRCurrent,
            restingHRBaseline: restingHRBaseline,
            sleepScore: sleepScore
        )

        let record = ReadinessRecord(
            date: nightDate,
            score: readinessScore,
            hrvBaseline: hrvBaseline,
            hrvCurrent: hrvCurrent,
            restingHRBaseline: restingHRBaseline,
            restingHRCurrent: restingHRCurrent,
            sleepScoreContribution: sleepScore
        )
        modelContext.insert(record)

        // Push readiness record to Supabase
        if let supabase = supabaseService {
            let payload: [String: Any] = [
                "date": nightDate,
                "score": readinessScore,
                "hrv_baseline": hrvBaseline,
                "hrv_current": hrvCurrent,
                "resting_hr_baseline": restingHRBaseline,
                "resting_hr_current": restingHRCurrent,
                "sleep_score_contribution": sleepScore,
            ]
            try? await supabase.pushReadinessRecord(payload)
        }
    }
}
