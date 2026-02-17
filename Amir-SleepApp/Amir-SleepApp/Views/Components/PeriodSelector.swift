import SwiftUI

enum TimePeriod: String, CaseIterable {
    case week = "7d"
    case month = "30d"
    case quarter = "90d"

    var days: Int {
        switch self {
        case .week: 7
        case .month: 30
        case .quarter: 90
        }
    }
}

struct PeriodSelector: View {
    @Binding var selection: TimePeriod

    var body: some View {
        Picker("Period", selection: $selection) {
            ForEach(TimePeriod.allCases, id: \.self) { period in
                Text(period.rawValue).tag(period)
            }
        }
        .pickerStyle(.segmented)
    }
}
