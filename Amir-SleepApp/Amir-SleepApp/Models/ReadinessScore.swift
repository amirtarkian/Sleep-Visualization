import Foundation
import SwiftData

@Model
final class ReadinessRecord {
    @Attribute(.unique) var id: UUID
    var date: String
    var score: Int
    var hrvBaseline: Double
    var hrvCurrent: Double
    var restingHRBaseline: Double
    var restingHRCurrent: Double
    var sleepScoreContribution: Int
    var lastSyncedAt: Date

    init(
        id: UUID = UUID(),
        date: String,
        score: Int,
        hrvBaseline: Double,
        hrvCurrent: Double,
        restingHRBaseline: Double,
        restingHRCurrent: Double,
        sleepScoreContribution: Int,
        lastSyncedAt: Date = Date()
    ) {
        self.id = id
        self.date = date
        self.score = score
        self.hrvBaseline = hrvBaseline
        self.hrvCurrent = hrvCurrent
        self.restingHRBaseline = restingHRBaseline
        self.restingHRCurrent = restingHRCurrent
        self.sleepScoreContribution = sleepScoreContribution
        self.lastSyncedAt = lastSyncedAt
    }
}
