import SwiftUI
import SwiftData

enum ReportPeriod: String, CaseIterable {
    case weekly = "Weekly"
    case monthly = "Monthly"

    var days: Int {
        switch self {
        case .weekly: return 7
        case .monthly: return 30
        }
    }
}

struct ReportsView: View {
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var allSessions: [SleepSession]
    @State private var selectedPeriod: ReportPeriod = .weekly

    private var filteredSessions: [SleepSession] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -selectedPeriod.days, to: Date()) ?? Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let cutoffString = formatter.string(from: cutoff)
        return allSessions.filter { $0.nightDate >= cutoffString }
    }

    private var report: SleepReport {
        let sessions = filteredSessions
        switch selectedPeriod {
        case .weekly:
            return ReportEngine.generateWeeklyReport(sessions: sessions)
        case .monthly:
            return ReportEngine.generateMonthlyReport(sessions: sessions)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    periodPicker
                        .padding(.horizontal)
                    if filteredSessions.isEmpty {
                        emptyState
                    } else {
                        ReportCard(report: report, isMonthly: selectedPeriod == .monthly)
                    }
                }
                .padding()
            }
            .background(AppTheme.background)
            .navigationTitle("Reports")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private var periodPicker: some View {
        Picker("Report Period", selection: $selectedPeriod) {
            ForEach(ReportPeriod.allCases, id: \.self) { period in
                Text(period.rawValue).tag(period)
            }
        }
        .pickerStyle(.segmented)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.bar.doc.horizontal")
                .font(.system(size: 60))
                .foregroundStyle(AppTheme.textTertiary)
            Text("No Report Data")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.textPrimary)
            Text("Sleep at least a few nights to generate a \(selectedPeriod.rawValue.lowercased()) report.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .padding(.top, 80)
    }
}
