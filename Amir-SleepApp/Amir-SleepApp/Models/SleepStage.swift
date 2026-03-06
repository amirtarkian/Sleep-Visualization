import Foundation

enum SleepStageType: String, Codable, CaseIterable {
    case awake
    case rem
    case core
    case deep
}

struct SleepStageInterval: Codable, Identifiable {
    var id: UUID = UUID()
    let stage: SleepStageType
    let startDate: Date
    let endDate: Date

    var durationMinutes: Double {
        endDate.timeIntervalSince(startDate) / 60.0
    }
}

struct SleepScoreData: Codable {
    let overall: Int
    let duration: Int
    let efficiency: Int
    let deepSleep: Int
    let rem: Int
    let latency: Int
    let waso: Int
    let timing: Int
    let restoration: Int
    let isFallback: Bool
}

struct SleepStats: Codable {
    let timeInBed: Double
    let totalSleepTime: Double
    let sleepEfficiency: Double
    let sleepLatency: Double
    let waso: Double
    let deepMinutes: Double
    let remMinutes: Double
    let coreMinutes: Double
    let awakeMinutes: Double
    let deepPercent: Double
    let remPercent: Double
    let corePercent: Double
    let awakePercent: Double
}
