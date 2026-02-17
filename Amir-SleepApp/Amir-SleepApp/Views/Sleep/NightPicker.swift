import SwiftUI

struct NightPicker: View {
    let nightDates: [String]
    @Binding var selectedIndex: Int

    var body: some View {
        HStack {
            Button {
                withAnimation { selectedIndex = min(selectedIndex + 1, nightDates.count - 1) }
            } label: {
                Image(systemName: "chevron.left")
                    .foregroundStyle(selectedIndex < nightDates.count - 1 ? .white : AppTheme.textTertiary)
            }
            .disabled(selectedIndex >= nightDates.count - 1)

            Spacer()

            if nightDates.indices.contains(selectedIndex) {
                Text(formatNightDate(nightDates[selectedIndex]))
                    .font(.headline)
                    .foregroundStyle(.white)
            }

            Spacer()

            Button {
                withAnimation { selectedIndex = max(selectedIndex - 1, 0) }
            } label: {
                Image(systemName: "chevron.right")
                    .foregroundStyle(selectedIndex > 0 ? .white : AppTheme.textTertiary)
            }
            .disabled(selectedIndex <= 0)
        }
        .padding(.horizontal)
    }
}
