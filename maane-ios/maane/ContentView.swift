import Combine
import SwiftUI

struct ContentView: View {
    @StateObject private var location = LocationManager()
    @StateObject private var sky = SkyModel()
    @State private var now = Date()
    @AppStorage("mode") private var mode = ViewMode.camera
    @State private var riseSet: (rise: Date?, set: Date?) = (nil, nil)

    private let ticker = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    private var state: MoonState? {
        guard let coord = location.location?.coordinate else { return nil }
        return Astro.moon(at: now, latitude: coord.latitude, longitude: coord.longitude)
    }

    var body: some View {
        ZStack {
            SkyView(state: state, showCamera: mode == .camera, model: sky)
                .ignoresSafeArea()

            if mode == .map, let coord = location.location?.coordinate, let state {
                MapPane(coordinate: coord, moonAzimuth: state.moon.azimuth)
                    .ignoresSafeArea()
            }

            if let state {
                VStack {
                    header(state)
                    Spacer()
                    ViewPicker(selection: $mode)
                    footer(state)
                }
                .padding()

                if mode != .map, !sky.moonOnScreen {
                    EdgeArrow(angle: sky.arrowAngle)
                }
            } else {
                Text(location.denied ? "slå på posisjon i innstillinger" : "venter på posisjon...")
                    .foregroundStyle(Theme.first)
                    .padding()
                    .background(.ultraThinMaterial, in: Capsule())
            }
        }
        .onAppear { location.start() }
        .onReceive(ticker) {
            now = $0
            refreshRiseSet()
        }
        .onChange(of: location.location) { refreshRiseSet() }
    }

    private func header(_ state: MoonState) -> some View {
        HStack(spacing: 14) {
            MoonGlyph(illumination: state.illumination, waxing: state.waxing,
                      southern: (location.location?.coordinate.latitude ?? 0) < 0)
                .frame(width: 44, height: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text(state.phaseName)
                    .font(.headline)
                Text("\(Int((state.illumination * 100).rounded()))% opplyst")
                    .font(.subheadline)
                    .foregroundStyle(Theme.second)
            }
            Spacer()
        }
        .foregroundStyle(Theme.first)
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func footer(_ state: MoonState) -> some View {
        VStack(spacing: 4) {
            Text("høyde \(Int(state.moon.altitude.rounded()))° · \(Int(state.moon.azimuth.rounded()))° \(Astro.compassName(state.moon.azimuth))")
            Text("opp \(clock(riseSet.rise)) · ned \(clock(riseSet.set))")
                .foregroundStyle(Theme.second)
            Text(compassLine)
                .foregroundStyle(Theme.second)
            if state.moon.altitude < 0 {
                Text("under horisonten")
                    .foregroundStyle(Theme.second)
            }
        }
        .font(.subheadline.monospacedDigit())
        .foregroundStyle(Theme.first)
        .padding(12)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var compassLine: String {
        let accuracy = location.headingAccuracy.map { "kompass ±\($0)°" } ?? "kompass ukjent"
        guard sky.headingOffset != 0 else { return accuracy }
        return "\(accuracy) · justert \(sky.headingOffset > 0 ? "+" : "")\(sky.headingOffset)°"
    }

    private func refreshRiseSet() {
        guard let coord = location.location?.coordinate else { return }
        riseSet = Astro.riseSet(on: Date(), latitude: coord.latitude, longitude: coord.longitude)
    }

    private func clock(_ date: Date?) -> String {
        date?.formatted(date: .omitted, time: .shortened) ?? "ingen"
    }
}

enum ViewMode: String, CaseIterable {
    case camera, none, map

    var label: String {
        switch self {
        case .camera: "kamera"
        case .none: "ingen"
        case .map: "kart"
        }
    }
}

struct ViewPicker: View {
    @Binding var selection: ViewMode

    var body: some View {
        HStack(spacing: 4) {
            ForEach(ViewMode.allCases, id: \.self) { mode in
                Button(mode.label) { selection = mode }
                    .font(.subheadline)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .foregroundStyle(selection == mode ? Theme.background : Theme.first)
                    .background(selection == mode ? Theme.first : .clear, in: Capsule())
            }
        }
        .padding(4)
        .background(.ultraThinMaterial, in: Capsule())
    }
}

struct EdgeArrow: View {
    let angle: Double

    var body: some View {
        GeometryReader { geo in
            let rx = geo.size.width / 2 - 40
            let ry = geo.size.height / 2 - 140
            Image(systemName: "arrowtriangle.right.fill")
                .font(.system(size: 28))
                .foregroundStyle(Theme.first)
                .rotationEffect(.radians(angle))
                .position(x: geo.size.width / 2 + rx * cos(angle),
                          y: geo.size.height / 2 + ry * sin(angle))
        }
        .allowsHitTesting(false)
    }
}

struct MoonGlyph: View {
    let illumination: Double
    let waxing: Bool
    let southern: Bool

    var body: some View {
        Canvas { context, size in
            let r = min(size.width, size.height) / 2
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let side: Double = (waxing != southern) ? 1 : -1
            let disc = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
            context.fill(disc, with: .color(Theme.first.opacity(0.15)))

            var lit = Path()
            let steps = 48
            for i in 0...steps {
                let t = Double.pi * Double(i) / Double(steps)
                let p = CGPoint(x: c.x + side * r * sin(t), y: c.y - r * cos(t))
                i == 0 ? lit.move(to: p) : lit.addLine(to: p)
            }
            for i in stride(from: steps, through: 0, by: -1) {
                let t = Double.pi * Double(i) / Double(steps)
                lit.addLine(to: CGPoint(x: c.x + side * r * (1 - 2 * illumination) * sin(t), y: c.y - r * cos(t)))
            }
            lit.closeSubpath()
            context.fill(lit, with: .color(Theme.first))
        }
    }
}
