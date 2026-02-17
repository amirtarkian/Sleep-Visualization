import Foundation

func formatDuration(minutes: Double) -> String {
    let hrs = Int(minutes) / 60
    let mins = Int(minutes.rounded()) % 60
    if hrs == 0 { return "\(mins)m" }
    return mins == 0 ? "\(hrs)h" : "\(hrs)h \(mins)m"
}

func formatTime(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "h:mm a"
    return formatter.string(from: date)
}

func formatNightDate(_ nightDate: String) -> String {
    let inputFormatter = DateFormatter()
    inputFormatter.dateFormat = "yyyy-MM-dd"
    guard let date = inputFormatter.date(from: nightDate) else { return nightDate }
    let outputFormatter = DateFormatter()
    outputFormatter.dateFormat = "EEE, MMM d"
    return outputFormatter.string(from: date)
}

func formatPercent(_ value: Double) -> String {
    "\(Int(value.rounded()))%"
}

func formatBpm(_ value: Double?) -> String {
    guard let value else { return "—" }
    return "\(Int(value.rounded())) bpm"
}

func formatMs(_ value: Double?) -> String {
    guard let value else { return "—" }
    return "\(Int(value.rounded())) ms"
}

func formatMinutesAsTime(_ minutesFromMidnight: Double) -> String {
    var mins = minutesFromMidnight
    if mins < 0 { mins += 24 * 60 }
    let hrs = Int(mins) / 60 % 24
    let m = Int(mins.rounded()) % 60
    let period = hrs >= 12 ? "PM" : "AM"
    let h = hrs % 12 == 0 ? 12 : hrs % 12
    return String(format: "%d:%02d %@", h, m, period)
}
