//
//  DailyHistoryWidgetExtension.swift
//  DailyHistoryWidgetExtension
//
//  Created by Dogaru Stefan-Razvan on 29.04.2026.
//

import WidgetKit
import SwiftUI

private enum WidgetAPI {
    static let baseURL = "https://daily-history-server-dev-development.up.railway.app/api/v1"
    static let endpoint = "/daily-content/guest"
}

// UIImage is Sendable on iOS 17+; store it directly so the view never calls UIImage(data:)
// on the render thread, which can silently fail in widget extension sandboxes.
struct DailyHistoryEntry: TimelineEntry {
    let date: Date
    let title: String
    let year: String
    let narrative: String
    let imageURL: String
    let backgroundImage: UIImage?
}

private struct DailyGuestResponse: Decodable {
    let events: [DailyGuestEvent]?
}

private struct DailyGuestEvent: Decodable {
    let title: String?
    let titleTranslations: [String: String]?
    let narrative: String?
    let narrativeTranslations: [String: String]?
    let eventDate: String?
    let event_date: String?
    let year: String?
    let gallery: [String]?
}

private struct EventOfDay {
    let title: String
    let year: String
    let narrative: String
    let imageURL: String
}

private func pickImageURL(from gallery: [String]?) -> String {
    (gallery ?? []).first(where: { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) ?? ""
}

private func parseYear(from event: DailyGuestEvent) -> String {
    let raw = event.eventDate ?? event.event_date ?? event.year ?? ""
    guard !raw.isEmpty else { return "" }
    return String(raw.prefix(4))
}

private func mapEvent(_ event: DailyGuestEvent) -> EventOfDay {
    let title = event.titleTranslations?["en"] ?? event.title ?? ""
    let narrativeRaw = event.narrativeTranslations?["en"] ?? event.narrative ?? "Open Daily History to refresh today's event."
    return EventOfDay(
        title: title,
        year: parseYear(from: event),
        narrative: String(narrativeRaw.prefix(140)),
        imageURL: pickImageURL(from: event.gallery)
    )
}

private func fallbackEvent() -> EventOfDay {
    EventOfDay(title: "", year: "", narrative: "Unable to load today's event right now.", imageURL: "")
}

private func makeWidgetDeepLink(for event: EventOfDay) -> URL? {
    var components = URLComponents()
    components.scheme = "dailyhistorymobile"
    components.host = "widget"
    components.queryItems = [
        URLQueryItem(name: "title", value: event.title),
        URLQueryItem(name: "year", value: event.year),
        URLQueryItem(name: "narrative", value: event.narrative),
        URLQueryItem(name: "image", value: event.imageURL)
    ]
    return components.url
}

private func firstEvent(from data: Data) -> EventOfDay? {
    let decoder = JSONDecoder()
    if let response = try? decoder.decode(DailyGuestResponse.self, from: data),
       let first = response.events?.first { return mapEvent(first) }
    if let list = try? decoder.decode([DailyGuestEvent].self, from: data),
       let first = list.first { return mapEvent(first) }
    if let single = try? decoder.decode(DailyGuestEvent.self, from: data) { return mapEvent(single) }
    return nil
}

private func makeGuestURL() -> URL? {
    let date = ISO8601DateFormatter().string(from: Date()).split(separator: "T").first ?? ""
    var components = URLComponents(string: WidgetAPI.baseURL + WidgetAPI.endpoint)
    components?.queryItems = [URLQueryItem(name: "date", value: String(date))]
    return components?.url
}

// Downloads image and creates a UIImage on the background thread (safe), resized to
// max 400 px so the widget process stays within the ~30 MB memory budget.
private func fetchImage(from urlString: String, completion: @escaping (UIImage?) -> Void) {
    guard !urlString.isEmpty, let url = URL(string: urlString) else {
        completion(nil)
        return
    }
    var req = URLRequest(url: url)
    req.timeoutInterval = 12
    URLSession(configuration: .ephemeral).dataTask(with: req) { data, _, _ in
        guard let data, let image = UIImage(data: data) else {
            completion(nil)
            return
        }
        let maxDim: CGFloat = 400
        let sz = image.size
        let ratio = min(maxDim / sz.width, maxDim / sz.height, 1.0)
        guard ratio < 1.0 else {
            completion(image)
            return
        }
        let newSize = CGSize(width: (sz.width * ratio).rounded(), height: (sz.height * ratio).rounded())
        let resized = UIGraphicsImageRenderer(size: newSize).image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        completion(resized)
    }.resume()
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> DailyHistoryEntry {
        DailyHistoryEntry(date: Date(), title: "", year: "1945",
                          narrative: "A major historical event happened on this day.",
                          imageURL: "", backgroundImage: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (DailyHistoryEntry) -> Void) {
        completion(DailyHistoryEntry(date: Date(), title: "", year: "",
                                     narrative: "Loading today's event...",
                                     imageURL: "", backgroundImage: nil))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyHistoryEntry>) -> Void) {
        guard let url = makeGuestURL() else {
            let e = fallbackEvent()
            let entry = DailyHistoryEntry(date: Date(), title: e.title, year: e.year,
                                          narrative: e.narrative, imageURL: e.imageURL, backgroundImage: nil)
            completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
            return
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 10
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        URLSession(configuration: .ephemeral).dataTask(with: request) { data, _, _ in
            let event = data.flatMap(firstEvent(from:)) ?? fallbackEvent()

            fetchImage(from: event.imageURL) { bgImage in
                let entry = DailyHistoryEntry(
                    date: Date(),
                    title: event.title,
                    year: event.year,
                    narrative: event.narrative,
                    imageURL: event.imageURL,
                    backgroundImage: bgImage
                )
                completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
            }
        }.resume()
    }
}

struct DailyHistoryWidgetExtensionEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: DailyHistoryEntry

    // MARK: - "ON THIS DAY" glass pill

    @ViewBuilder
    private var onThisDayPill: some View {
        Text("ON THIS DAY")
            .font(.system(size: family == .systemLarge ? 10 : 9, weight: .semibold))
            .tracking(1.5)
            .foregroundStyle(.white.opacity(0.82))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(.white.opacity(0.12), in: Capsule())
            .overlay(Capsule().stroke(.white.opacity(0.25), lineWidth: 1))
    }

    // MARK: - Frosted glass card (medium / large)

    @ViewBuilder
    private var glassCard: some View {
        VStack(
            alignment: family == .systemLarge ? .center : .leading,
            spacing: family == .systemLarge ? 8 : 4
        ) {
            if !entry.title.isEmpty {
                Text(entry.title)
                    .font(family == .systemLarge
                          ? .system(size: 15, weight: .medium)
                          : .system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.92))
                    .lineLimit(family == .systemLarge ? 3 : 2)
                    .multilineTextAlignment(family == .systemLarge ? .center : .leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity,
                           alignment: family == .systemLarge ? .center : .leading)
            }
            if !entry.year.isEmpty {
                Text(entry.year)
                    .font(family == .systemLarge
                          ? .system(size: 36, weight: .heavy, design: .rounded)
                          : .system(size: 24, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: family == .systemLarge ? .infinity : nil,
                           alignment: family == .systemLarge ? .center : .leading)
            }
        }
        .padding(.horizontal, family == .systemLarge ? 16 : 12)
        .padding(.vertical, family == .systemLarge ? 14 : 10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial,
                    in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(.white.opacity(0.2), lineWidth: 1)
        )
        .padding(.horizontal, family == .systemLarge ? 16 : 12)
        .padding(.bottom, family == .systemLarge ? 16 : 12)
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            onThisDayPill
                .frame(maxWidth: .infinity,
                       alignment: family == .systemMedium ? .leading : .center)
                .padding(.horizontal, family == .systemSmall ? 0 : 12)
                .padding(.top, family == .systemLarge ? 14 : 10)

            Spacer(minLength: 0)

            if family == .systemSmall {
                if !entry.year.isEmpty {
                    Text(entry.year)
                        .font(.system(size: 32, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.6), radius: 6, x: 0, y: 1)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, 12)
                }
            } else {
                glassCard
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(makeWidgetDeepLink(for: EventOfDay(
            title: entry.title, year: entry.year,
            narrative: entry.narrative, imageURL: entry.imageURL)))
        .containerBackground(for: .widget) {
            ZStack {
                Color(red: 0.05, green: 0.05, blue: 0.10)
                if let img = entry.backgroundImage {
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFill()
                }
                LinearGradient(
                    colors: [.black.opacity(0.5), .black.opacity(0.05), .black.opacity(0.3)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
    }
}

struct DailyHistoryWidgetExtension: Widget {
    let kind: String = "DailyHistoryWidgetExtension"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DailyHistoryWidgetExtensionEntryView(entry: entry)
        }
        .configurationDisplayName("On This Day")
        .description("Today's historical event with photo background.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

#Preview(as: .systemSmall) {
    DailyHistoryWidgetExtension()
} timeline: {
    DailyHistoryEntry(
        date: .now,
        title: "Moon landing broadcast reaches millions",
        year: "1969",
        narrative: "On this day, global television audiences followed one of history's most iconic moments.",
        imageURL: "",
        backgroundImage: nil
    )
}
