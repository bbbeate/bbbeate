import SwiftUI
import UIKit

struct ColorField: View {
    let hex: String
    let onChange: (String) -> Void

    var body: some View {
        SettingRow(label: "farge") {
            ColorSwatch(hex: hex, onChange: onChange)
                .frame(height: 36)
        }
    }
}

struct ColorSwatch: View {
    let hex: String
    let onChange: (String) -> Void
    @State private var showPicker = false

    var body: some View {
        Button(action: { showPicker = true }) {
            RoundedRectangle(cornerRadius: 8)
                .fill(hexToColor(hex))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.first, lineWidth: 1))
        }
        .sheet(isPresented: $showPicker) {
            SystemColorPicker(hex: hex, onChange: onChange)
                .presentationDetents([.medium, .large])
        }
    }
}

struct SystemColorPicker: UIViewControllerRepresentable {
    let hex: String
    let onChange: (String) -> Void

    func makeUIViewController(context: Context) -> UIColorPickerViewController {
        let picker = UIColorPickerViewController()
        picker.supportsAlpha = false
        picker.selectedColor = UIColor(hexToColor(hex))
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ picker: UIColorPickerViewController, context: Context) {
        context.coordinator.onChange = onChange
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onChange: onChange)
    }

    final class Coordinator: NSObject, UIColorPickerViewControllerDelegate {
        var onChange: (String) -> Void

        init(onChange: @escaping (String) -> Void) {
            self.onChange = onChange
        }

        func colorPickerViewController(_ picker: UIColorPickerViewController, didSelect color: UIColor, continuously: Bool) {
            onChange(colorToHex(Color(color)))
        }
    }
}

struct AmbientSlider: View {
    let mirek: Int
    let onChange: (Int) -> Void

    var body: some View {
        VStack(spacing: 12) {
            SettingRow(label: "ambient") {
                BarSlider(value: Binding(
                    get: { Double(mirek) },
                    set: { onChange(Int($0)) }
                ), range: 153...500, step: 1)
            }
            HStack {
                Text("kald").font(.caption).foregroundStyle(Theme.second)
                Spacer()
                Text("varm").font(.caption).foregroundStyle(Theme.second)
            }
            .padding(.leading, 92)
            .padding(.top, -8)
        }
    }
}

struct ModeSwitch: View {
    let mode: LightMode
    let onChange: (LightMode) -> Void

    var body: some View {
        HStack(spacing: 8) {
            ForEach([(LightMode.ambient, "ambient"), (LightMode.color, "farge")], id: \.0) { option, label in
                ChipButton(label: label, active: mode == option) { onChange(option) }
            }
        }
    }
}
