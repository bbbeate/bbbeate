import SwiftUI

// shared/colors.css mapped to swift
// dark:  --first: #b7b7ff  --second: #a5a5ff  --background: #242424
// light: --first: #4a4aff  --second: #3636cc  --background: #d3d3ff

struct Theme {
    static let first = Color("first")
    static let second = Color("second")
    static let background = Color("background")
}

// custom slider: thin | thumb in theme color, no white dot
struct BarSliderStyle: ViewModifier {
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double
    let onChanged: (() -> Void)?

    func body(content: Content) -> some View {
        GeometryReader { geo in
            let pct = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
            let w = geo.size.width

            ZStack(alignment: .leading) {
                // track
                RoundedRectangle(cornerRadius: 1)
                    .fill(Theme.first.opacity(0.2))
                    .frame(height: 2)

                // filled track
                RoundedRectangle(cornerRadius: 1)
                    .fill(Theme.first.opacity(0.5))
                    .frame(width: max(0, pct * w), height: 2)

                // thumb: thin bar
                RoundedRectangle(cornerRadius: 1)
                    .fill(Theme.first)
                    .frame(width: 3, height: 20)
                    .offset(x: max(0, min(pct * w - 1.5, w - 3)))
            }
            .frame(height: 20)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { drag in
                        let pct = max(0, min(1, drag.location.x / w))
                        let raw = range.lowerBound + pct * (range.upperBound - range.lowerBound)
                        let stepped = (raw / step).rounded() * step
                        value = max(range.lowerBound, min(range.upperBound, stepped))
                    }
                    .onEnded { _ in
                        onChanged?()
                    }
            )
        }
        .frame(height: 20)
    }
}

struct BarSlider: View {
    @Binding var value: Double
    var range: ClosedRange<Double> = 0...1
    var step: Double = 1
    var onEditingChanged: (() -> Void)? = nil

    var body: some View {
        Color.clear
            .modifier(BarSliderStyle(value: $value, range: range, step: step, onChanged: onEditingChanged))
    }
}
