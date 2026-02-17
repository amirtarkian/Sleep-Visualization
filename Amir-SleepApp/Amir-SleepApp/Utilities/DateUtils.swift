import Foundation

/// Get the "night of" date for a sleep session.
/// If sleep started before nightCutoffHour (6AM), it belongs to the previous day.
func getNightDate(from startDate: Date) -> String {
    let calendar = Calendar.current
    let hour = calendar.component(.hour, from: startDate)
    let date = hour < nightCutoffHour
        ? calendar.date(byAdding: .day, value: -1, to: startDate)!
        : startDate
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
}

/// Circular mean for times that cross midnight.
/// Input: array of minutes from midnight (negative values for before midnight).
func circularMeanTime(_ timesInMinutes: [Double]) -> Double {
    guard !timesInMinutes.isEmpty else { return 0 }
    let minutesInDay = 24.0 * 60.0
    var sinSum = 0.0
    var cosSum = 0.0
    for t in timesInMinutes {
        let angle = (t / minutesInDay) * 2.0 * .pi
        sinSum += sin(angle)
        cosSum += cos(angle)
    }
    sinSum /= Double(timesInMinutes.count)
    cosSum /= Double(timesInMinutes.count)
    var mean = (atan2(sinSum, cosSum) / (2.0 * .pi)) * minutesInDay
    if mean < -360 { mean += minutesInDay }
    if mean > minutesInDay { mean -= minutesInDay }
    return mean
}

/// Convert a Date to minutes from midnight.
func minutesFromMidnight(_ date: Date) -> Int {
    let calendar = Calendar.current
    return calendar.component(.hour, from: date) * 60 + calendar.component(.minute, from: date)
}

/// Get bedtime minutes, treating times between 6PM-midnight as negative.
func bedtimeMinutes(_ date: Date) -> Double {
    let mins = Double(minutesFromMidnight(date))
    return mins >= 18 * 60 ? mins - 24 * 60 : mins
}
