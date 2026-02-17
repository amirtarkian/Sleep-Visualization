import Foundation
import HealthKit

final class HealthKitService {
    private let store = HKHealthStore()

    static let shared = HealthKitService()
    private init() {}

    var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    private var readTypes: Set<HKObjectType> {
        Set([
            HKCategoryType(.sleepAnalysis),
            HKQuantityType(.heartRate),
            HKQuantityType(.heartRateVariabilitySDNN),
            HKQuantityType(.oxygenSaturation),
            HKQuantityType(.respiratoryRate),
            HKQuantityType(.restingHeartRate),
        ])
    }

    func requestAuthorization() async throws {
        try await store.requestAuthorization(toShare: [], read: readTypes)
    }

    func fetchSleepSamples(from startDate: Date, to endDate: Date) async throws -> [HKCategorySample] {
        let sleepType = HKCategoryType(.sleepAnalysis)
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKCategorySample]) ?? [])
            }
            store.execute(query)
        }
    }

    func fetchQuantitySamples(
        type: HKQuantityTypeIdentifier,
        from startDate: Date,
        to endDate: Date,
        unit: HKUnit
    ) async throws -> [(date: Date, value: Double)] {
        let quantityType = HKQuantityType(type)
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: quantityType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let results = (samples as? [HKQuantitySample])?.map { sample in
                    (date: sample.startDate, value: sample.quantity.doubleValue(for: unit))
                } ?? []
                continuation.resume(returning: results)
            }
            store.execute(query)
        }
    }

    func fetchHeartRate(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .heartRate, from: startDate, to: endDate, unit: .count().unitDivided(by: .minute()))
    }

    func fetchHRV(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .heartRateVariabilitySDNN, from: startDate, to: endDate, unit: .secondUnit(with: .milli))
    }

    func fetchSpO2(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .oxygenSaturation, from: startDate, to: endDate, unit: .percent())
    }

    func fetchRespiratoryRate(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .respiratoryRate, from: startDate, to: endDate, unit: .count().unitDivided(by: .minute()))
    }

    func fetchRestingHeartRate(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .restingHeartRate, from: startDate, to: endDate, unit: .count().unitDivided(by: .minute()))
    }
}
