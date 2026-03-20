import ActivityKit
import WidgetKit
import SwiftUI

struct PomodoroAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic data that changes during the activity
        var endTime: Date
        var isPaused: Bool
        var sessionType: String // "Work" or "Break"
    }

    // Static data that doesn't change
    var totalDuration: Int
}

@main
struct PomodoroLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PomodoroAttributes.self) { context in
            // Lock Screen UI
            VStack {
                HStack {
                    Image(systemName: "timer")
                        .foregroundColor(.orange)
                    Text("Chronopop Focus")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(context.state.sessionType)
                        .font(.caption)
                        .padding(4)
                        .background(Color.orange.opacity(0.2))
                        .cornerRadius(4)
                }
                
                HStack {
                    VStack(alignment: .leading) {
                        Text(context.state.isPaused ? "Paused" : "Remaining")
                            .font(.caption2)
                        Text(context.state.endTime, style: .timer)
                            .font(.system(size: 32, weight: .bold, design: .monospaced))
                    }
                    Spacer()
                }
            }
            .padding()
            .activityBackgroundTint(Color.black.opacity(0.8))
            .activitySystemActionTint(Color.orange)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    Label("Focus", systemImage: "timer")
                        .foregroundColor(.orange)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.endTime, style: .timer)
                        .font(.title2)
                        .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.bottom) {
                     Text(context.state.sessionType)
                        .font(.caption)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundColor(.orange)
            } compactTrailing: {
                Text(context.state.endTime, style: .timer)
                    .monospacedDigit()
            } minimal: {
                Image(systemName: "timer")
                    .foregroundColor(.orange)
            }
        }
    }
}
