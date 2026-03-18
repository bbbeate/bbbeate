import SwiftUI
import UIKit

struct HueButton: View {
    let emoji: String
    let backgroundColor: Color
    let onPress: () -> Void
    let onLongPress: () -> Void
    var overlayText: String? = nil

    @State private var isPressed = false
    @State private var didLongPress = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(backgroundColor)

            if let text = overlayText {
                Text(text)
                    .font(.title2)
                    .fontWeight(.medium)
                    .foregroundStyle(Theme.first)
            } else {
                Text(emoji)
                    .font(.system(size: 60))
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .onLongPressGesture(minimumDuration: 0.5, pressing: { pressing in
            isPressed = pressing
            if !pressing {
                if didLongPress {
                    didLongPress = false
                } else {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    onPress()
                }
            }
        }, perform: {
            didLongPress = true
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            onLongPress()
        })
    }
}

struct SoloppButton: View {
    let wakeState: WakeState
    let onPress: () -> Void

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.clear)
                .overlay(
                    Image("solopp")
                        .resizable()
                        .scaledToFill()
                )
                .clipShape(RoundedRectangle(cornerRadius: 8))

            if wakeState.enabled {
                Text(wakeState.time)
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundStyle(Theme.first)
                    .shadow(radius: 2)
            } else {
                Image(systemName: "sunrise.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Theme.first)
                    .shadow(radius: 2)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .onTapGesture { onPress() }
    }
}
