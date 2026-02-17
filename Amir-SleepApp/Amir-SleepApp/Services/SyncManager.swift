import Foundation
import SwiftData
import HealthKit

@MainActor
@Observable
final class SyncManager {
    var isSyncing = false
    var lastSyncDate: Date?
    var syncError: String?

    private let healthKit = HealthKitService.shared

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

                let score = SleepScoringEngine.computeSleepScore(
                    totalSleepTime: stats.totalSleepTime,
                    sleepEfficiency: stats.sleepEfficiency,
                    deepPercent: stats.deepPercent,
                    remPercent: stats.remPercent,
                    sleepLatency: stats.sleepLatency,
                    waso: stats.waso,
                    hasStages: !stages.isEmpty
                )

                let biometrics = await fetchBiometrics(from: sessionStart, to: sessionEnd)

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
    }
}
