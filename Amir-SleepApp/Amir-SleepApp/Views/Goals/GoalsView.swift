import SwiftUI
import SwiftData

struct GoalsView: View {
    @Environment(SupabaseService.self) private var supabaseService
    @Query(sort: \SleepSession.nightDate, order: .forward) private var sessions: [SleepSession]

    @AppStorage("goal_durationTargetMin") private var durationTargetMin: Double = 480
    @AppStorage("goal_scoreTarget") private var scoreTarget: Int = 75
    @AppStorage("goal_bedtimeStartMin") private var bedtimeStartMin: Int = 1350
    @AppStorage("goal_bedtimeEndMin") private var bedtimeEndMin: Int = 1380

    @State private var showSettings = false

    // MARK: - Computed Properties

    private var goalConfig: SleepGoalConfig {
        SleepGoalConfig(
            durationTargetMin: durationTargetMin,
            scoreTarget: scoreTarget,
            bedtimeStartMin: bedtimeStartMin,
            bedtimeEndMin: bedtimeEndMin
        )
    }

    private var durationStreak: Int {
        let target = durationTargetMin
        return GoalsEngine.computeStreak(sessions: sessions) { session in
            GoalsEngine.checkDurationGoalMet(session: session, target: target)
        }
    }

    private var scoreStreak: Int {
        let target = scoreTarget
        return GoalsEngine.computeStreak(sessions: sessions) { session in
            GoalsEngine.checkScoreGoalMet(session: session, target: target)
        }
    }

    private var bedtimeStreak: Int {
        let start = bedtimeStartMin
        let end = bedtimeEndMin
        return GoalsEngine.computeStreak(sessions: sessions) { session in
            GoalsEngine.checkBedtimeGoalMet(session: session, startMin: start, endMin: end)
        }
    }

    private var optimalBedtime: OptimalBedtime? {
        GoalsEngine.computeOptimalBedtime(sessions: sessions)
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerSection
                    streakCardsSection
                    calendarSection
                    optimalBedtimeSection
                    settingsButton
                }
                .padding()
            }
            .background(AppTheme.background)
            .navigationTitle("Goals")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showSettings) {
                GoalSettingsSheet(
                    durationTargetMin: $durationTargetMin,
                    scoreTarget: $scoreTarget,
                    bedtimeStartMin: $bedtimeStartMin,
                    bedtimeEndMin: $bedtimeEndMin,
                    onSave: syncGoalsToSupabase
                )
            }
            .task {
                await fetchGoalsFromSupabase()
            }
        }
    }

    // MARK: - Sections

    private var headerSection: some View {
        VStack(spacing: 4) {
            Text("Sleep Goals")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.textPrimary)
            Text("Track your consistency and build healthy habits")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }

    private var streakCardsSection: some View {
        VStack(spacing: 12) {
            Text("CURRENT STREAKS")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 12) {
                streakCard(
                    title: "Duration",
                    streak: durationStreak,
                    icon: "clock.fill",
                    iconColor: .blue,
                    subtitle: "\(formatDuration(minutes: durationTargetMin))+ goal"
                )
                streakCard(
                    title: "Score",
                    streak: scoreStreak,
                    icon: "star.fill",
                    iconColor: .yellow,
                    subtitle: "\(scoreTarget)+ goal"
                )
            }

            streakCard(
                title: "Bedtime",
                streak: bedtimeStreak,
                icon: "moon.fill",
                iconColor: .purple,
                subtitle: "\(formatMinutesOfDay(bedtimeStartMin))–\(formatMinutesOfDay(bedtimeEndMin))"
            )
        }
    }

    private var calendarSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("DURATION GOAL")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            StreakCalendar(days: buildCalendarDays())
        }
    }

    @ViewBuilder
    private var optimalBedtimeSection: some View {
        if let optimal = optimalBedtime {
            VStack(alignment: .leading, spacing: 8) {
                Text("OPTIMAL BEDTIME")
                    .font(.caption.bold())
                    .foregroundStyle(AppTheme.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                HStack(spacing: 16) {
                    Image(systemName: "sparkles")
                        .font(.title2)
                        .foregroundStyle(.yellow)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Based on your best nights")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        let startText = formatHourMinute(hour: optimal.startHour, minute: optimal.startMinute)
                        let endText = formatHourMinute(hour: optimal.endHour, minute: optimal.endMinute)
                        Text("\(startText) – \(endText)")
                            .font(.title3.bold())
                            .foregroundStyle(AppTheme.textPrimary)
                    }

                    Spacer()
                }
                .padding()
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
            }
        }
    }

    private var settingsButton: some View {
        Button {
            showSettings = true
        } label: {
            Label("Edit Goals", systemImage: "slider.horizontal.3")
                .font(.subheadline.bold())
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color(hex: "#3b82f6"))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Helpers

    private func streakCard(title: String, streak: Int, icon: String, iconColor: Color, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(iconColor)
                Text(title)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(streak)")
                    .font(.title.bold())
                    .foregroundStyle(AppTheme.textPrimary)
                Text(streak == 1 ? "day" : "days")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(AppTheme.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }

    private func buildCalendarDays() -> [Bool?] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        // Build a lookup from nightDate -> session
        var sessionsByDate: [String: SleepSession] = [:]
        for session in sessions {
            sessionsByDate[session.nightDate] = session
        }

        var result: [Bool?] = []
        let target = durationTargetMin
        for daysAgo in stride(from: 29, through: 0, by: -1) {
            guard let date = calendar.date(byAdding: .day, value: -daysAgo, to: today) else {
                result.append(nil)
                continue
            }
            let dateStr = formatter.string(from: date)
            if let session = sessionsByDate[dateStr] {
                let met = GoalsEngine.checkDurationGoalMet(session: session, target: target)
                result.append(met)
            } else {
                result.append(nil)
            }
        }
        return result
    }

    private func formatMinutesOfDay(_ minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        let period = h >= 12 ? "PM" : "AM"
        let displayH = h % 12 == 0 ? 12 : h % 12
        return String(format: "%d:%02d %@", displayH, m, period)
    }

    private func formatHourMinute(hour: Int, minute: Int) -> String {
        let period = hour >= 12 ? "PM" : "AM"
        let displayH = hour % 12 == 0 ? 12 : hour % 12
        return String(format: "%d:%02d %@", displayH, minute, period)
    }

    // MARK: - Supabase Sync

    private func syncGoalsToSupabase() {
        Task {
            let payload: [String: Any] = [
                "duration_target_min": durationTargetMin,
                "score_target": scoreTarget,
                "bedtime_start_min": bedtimeStartMin,
                "bedtime_end_min": bedtimeEndMin
            ]
            try? await supabaseService.pushGoals(payload)
        }
    }

    private func fetchGoalsFromSupabase() async {
        guard let data = try? await supabaseService.fetchGoals() else { return }
        if let val = data["duration_target_min"] as? Double {
            durationTargetMin = val
        }
        if let val = data["score_target"] as? Int {
            scoreTarget = val
        }
        if let val = data["bedtime_start_min"] as? Int {
            bedtimeStartMin = val
        }
        if let val = data["bedtime_end_min"] as? Int {
            bedtimeEndMin = val
        }
    }
}

// MARK: - Goal Settings Sheet

private struct GoalSettingsSheet: View {
    @Environment(\.dismiss) private var dismiss

    @Binding var durationTargetMin: Double
    @Binding var scoreTarget: Int
    @Binding var bedtimeStartMin: Int
    @Binding var bedtimeEndMin: Int

    var onSave: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    durationSection
                    scoreSection
                    bedtimeSection
                }
                .padding()
            }
            .background(AppTheme.background)
            .navigationTitle("Edit Goals")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave()
                        dismiss()
                    }
                    .bold()
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private var durationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SLEEP DURATION")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            VStack(spacing: 8) {
                HStack {
                    Text("Target")
                        .foregroundStyle(AppTheme.textSecondary)
                    Spacer()
                    Text(formatDuration(minutes: durationTargetMin))
                        .font(.headline)
                        .foregroundStyle(AppTheme.textPrimary)
                }
                Slider(value: $durationTargetMin, in: 300...600, step: 15)
                    .tint(Color(hex: "#3b82f6"))
            }
            .padding()
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
        }
    }

    private var scoreSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SLEEP SCORE")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            VStack(spacing: 8) {
                HStack {
                    Text("Target")
                        .foregroundStyle(AppTheme.textSecondary)
                    Spacer()
                    Text("\(scoreTarget)")
                        .font(.headline)
                        .foregroundStyle(AppTheme.textPrimary)
                }
                let scoreBinding = Binding<Double>(
                    get: { Double(scoreTarget) },
                    set: { scoreTarget = Int($0) }
                )
                Slider(value: scoreBinding, in: 50...100, step: 5)
                    .tint(Color(hex: "#3b82f6"))
            }
            .padding()
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
        }
    }

    private var bedtimeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("BEDTIME WINDOW")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            VStack(spacing: 12) {
                bedtimeRow(label: "Earliest", value: $bedtimeStartMin)
                Divider().overlay(AppTheme.cardBorder)
                bedtimeRow(label: "Latest", value: $bedtimeEndMin)
            }
            .padding()
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
        }
    }

    private func bedtimeRow(label: String, value: Binding<Int>) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(formatMinutesAsTimeLocal(value.wrappedValue))
                .font(.headline)
                .foregroundStyle(AppTheme.textPrimary)
        }
        .contentShape(Rectangle())
        .overlay(
            HStack {
                Spacer()
                Stepper("", value: value, in: 1200...1500, step: 15)
                    .labelsHidden()
            }
            .opacity(0.01)
        )
    }

    private func formatMinutesAsTimeLocal(_ minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        let period = h >= 12 ? "PM" : "AM"
        let displayH = h % 12 == 0 ? 12 : h % 12
        return String(format: "%d:%02d %@", displayH, m, period)
    }
}
