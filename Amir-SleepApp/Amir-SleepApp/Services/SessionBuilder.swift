import Foundation
import HealthKit

enum SessionBuilder {

    static func computeStats(
        startDate: Date,
        endDate: Date,
        stages: [SleepStageInterval]
    ) -> SleepStats {
        let timeInBed = endDate.timeIntervalSince(startDate) / 60.0

        var deepMinutes = 0.0
        var remMinutes = 0.0
        var coreMinutes = 0.0
        var awakeMinutes = 0.0

        for stage in stages {
            let duration = stage.endDate.timeIntervalSince(stage.startDate) / 60.0
            switch stage.stage {
            case .deep: deepMinutes += duration
            case .rem: remMinutes += duration
            case .core: coreMinutes += duration
            case .awake: awakeMinutes += duration
            }
        }

        let totalSleepTime = deepMinutes + remMinutes + coreMinutes
        let sleepEfficiency = timeInBed > 0 ? (totalSleepTime / timeInBed) * 100 : 0

        var sleepLatency = 0.0
        if !stages.isEmpty {
            let sorted = stages.sorted { $0.startDate < $1.startDate }
            if let firstSleep = sorted.first(where: { $0.stage != .awake }) {
                sleepLatency = firstSleep.startDate.timeIntervalSince(startDate) / 60.0
            }
        }

        var waso = 0.0
        if !stages.isEmpty {
            let sorted = stages.sorted { $0.startDate < $1.startDate }
            if let firstSleepIndex = sorted.firstIndex(where: { $0.stage != .awake }) {
                for i in (firstSleepIndex + 1)..<sorted.count {
                    if sorted[i].stage == .awake {
                        waso += sorted[i].endDate.timeIntervalSince(sorted[i].startDate) / 60.0
                    }
                }
            }
        }

        let hasStages = !stages.isEmpty
        let safeTST = max(hasStages ? totalSleepTime : timeInBed * 0.85, 1)

        return SleepStats(
            timeInBed: timeInBed,
            totalSleepTime: hasStages ? totalSleepTime : (timeInBed * 0.85).rounded(),
            sleepEfficiency: hasStages ? (sleepEfficiency * 10).rounded() / 10 : 85,
            sleepLatency: hasStages ? sleepLatency : 12,
            waso: hasStages ? waso : (timeInBed * 0.05).rounded(),
            deepMinutes: deepMinutes,
            remMinutes: remMinutes,
            coreMinutes: coreMinutes,
            awakeMinutes: awakeMinutes,
            deepPercent: hasStages ? ((deepMinutes / safeTST) * 1000).rounded() / 10 : 0,
            remPercent: hasStages ? ((remMinutes / safeTST) * 1000).rounded() / 10 : 0,
            corePercent: hasStages ? ((coreMinutes / safeTST) * 1000).rounded() / 10 : 0,
            awakePercent: hasStages ? ((awakeMinutes / safeTST) * 1000).rounded() / 10 : 0
        )
    }

    static func mapSleepStage(_ value: Int) -> SleepStageType? {
        switch value {
        case HKCategoryValueSleepAnalysis.asleepCore.rawValue: return .core
        case HKCategoryValueSleepAnalysis.asleepDeep.rawValue: return .deep
        case HKCategoryValueSleepAnalysis.asleepREM.rawValue: return .rem
        case HKCategoryValueSleepAnalysis.awake.rawValue: return .awake
        case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue: return .core
        default: return nil
        }
    }

    static func groupIntoSessions(
        samples: [HKCategorySample]
    ) -> [[HKCategorySample]] {
        let sorted = samples.sorted { $0.startDate < $1.startDate }
        var groups: [[HKCategorySample]] = []
        var current: [HKCategorySample] = []

        for sample in sorted {
            if let last = current.last {
                let gap = sample.startDate.timeIntervalSince(last.endDate)
                if gap > gapMergeThreshold {
                    groups.append(current)
                    current = [sample]
                } else {
                    current.append(sample)
                }
            } else {
                current.append(sample)
            }
        }
        if !current.isEmpty { groups.append(current) }
        return groups
    }
}
