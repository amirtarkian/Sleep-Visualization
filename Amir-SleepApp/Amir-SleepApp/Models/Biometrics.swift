import Foundation

struct BiometricSummary: Codable {
    var avgHeartRate: Double?
    var minHeartRate: Double?
    var maxHeartRate: Double?
    var avgHrv: Double?
    var avgSpo2: Double?
    var avgRespiratoryRate: Double?
}
