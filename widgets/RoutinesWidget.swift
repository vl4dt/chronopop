import WidgetKit
import SwiftUI

struct RoutineEntry: TimelineEntry {
    let date: Date
    let nextRoutineTitle: String
    let nextRoutineTime: String
    let routinesLeft: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> RoutineEntry {
        RoutineEntry(date: Date(), nextRoutineTitle: "Morning Stretch", nextRoutineTime: "08:00", routinesLeft: 3)
    }

    func getSnapshot(in context: Context, completion: @escaping (RoutineEntry) -> ()) {
        let entry = RoutineEntry(date: Date(), nextRoutineTitle: "Morning Stretch", nextRoutineTime: "08:00", routinesLeft: 3)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [RoutineEntry] = []
        let entry = RoutineEntry(date: Date(), nextRoutineTitle: "Loading...", nextRoutineTime: "--:--", routinesLeft: 0)
        entries.append(entry)

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct RoutinesWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.purple)
                Text("Next Routine")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
            }
            
            Text(entry.nextRoutineTitle)
                .font(.headline)
            
            Text(entry.nextRoutineTime)
                .font(.subheadline)
                .foregroundColor(.purple)
            
            Spacer()
            
            HStack {
                Text("\(entry.routinesLeft) remaining today")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(Color.black.opacity(0.1), for: .widget)
    }
}

struct RoutinesWidget: Widget {
    let kind: String = "RoutinesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            RoutinesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Chronopop Routines")
        .description("Track your current daily routines and therapies.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
