import Foundation
import SwiftData

@Model
final class SleepSession {
    @Attribute(.unique) var id: UUID
    var nightDate: String
    var startDate: Date
    var endDate: Date
    var stagesData: Data
    var scoreData: Data
    var statsData: Data
    var biometricsData: Data
    var isFallback: Bool
    var lastSyncedAt: Date

    init(
        id: UUID = UUID(),
        nightDate: String,
        startDate: Date,
        endDate: Date,
        stages: [SleepStageInterval],
        score: SleepScoreData,
        stats: SleepStats,
        biometrics: BiometricSummary,
        isFallback: Bool,
        lastSyncedAt: Date = Date()
    ) {
        self.id = id
        self.nightDate = nightDate
        self.startDate = startDate
        self.endDate = endDate
        self.stagesData = (try? JSONEncoder().encode(stages)) ?? Data()
        self.scoreData = (try? JSONEncoder().encode(score)) ?? Data()
        self.statsData = (try? JSONEncoder().encode(stats)) ?? Data()
        self.biometricsData = (try? JSONEncoder().encode(biometrics)) ?? Data()
        self.isFallback = isFallback
        self.lastSyncedAt = lastSyncedAt
    }

    var stages: [SleepStageInterval] {
        (try? JSONDecoder().decode([SleepStageInterval].self, from: stagesData)) ?? []
    }

    var score: SleepScoreData {
        (try? JSONDecoder().decode(SleepScoreData.self, from: scoreData)) ?? SleepScoreData(
            overall: 0, duration: 0, efficiency: 0, deepSleep: 0,
            rem: 0, latency: 0, waso: 0, isFallback: true
        )
    }

    var stats: SleepStats {
        (try? JSONDecoder().decode(SleepStats.self, from: statsData)) ?? SleepStats(
            timeInBed: 0, totalSleepTime: 0, sleepEfficiency: 0, sleepLatency: 0,
            waso: 0, deepMinutes: 0, remMinutes: 0, coreMinutes: 0, awakeMinutes: 0,
            deepPercent: 0, remPercent: 0, corePercent: 0, awakePercent: 0
        )
    }

    var biometrics: BiometricSummary {
        (try? JSONDecoder().decode(BiometricSummary.self, from: biometricsData)) ?? BiometricSummary()
    }
}
