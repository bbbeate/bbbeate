import SwiftUI
import UIKit

struct CIExy {
    let x: Double
    let y: Double
}

func hexToXy(_ hex: String) -> CIExy {
    let clean = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    let scanner = Scanner(string: clean)
    var rgb: UInt64 = 0
    scanner.scanHexInt64(&rgb)

    let r = Double((rgb >> 16) & 0xFF) / 255.0
    let g = Double((rgb >> 8) & 0xFF) / 255.0
    let b = Double(rgb & 0xFF) / 255.0

    let rr = r > 0.04045 ? pow((r + 0.055) / 1.055, 2.4) : r / 12.92
    let gg = g > 0.04045 ? pow((g + 0.055) / 1.055, 2.4) : g / 12.92
    let bb = b > 0.04045 ? pow((b + 0.055) / 1.055, 2.4) : b / 12.92

    let X = rr * 0.4124 + gg * 0.3576 + bb * 0.1805
    let Y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722
    let Z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505

    let sum = X + Y + Z
    if sum == 0 { return CIExy(x: 0, y: 0) }
    return CIExy(x: X / sum, y: Y / sum)
}

func mirekToColor(_ mirek: Int) -> Color {
    let t = Double(mirek - 153) / Double(500 - 153)
    let r = 255.0
    let g = 180.0 + (255.0 - 180.0) * (1.0 - t)
    let b = 100.0 + (200.0 - 100.0) * (1.0 - t)
    return Color(red: r / 255, green: g / 255, blue: b / 255)
}

func hexToColor(_ hex: String) -> Color {
    let clean = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    let scanner = Scanner(string: clean)
    var rgb: UInt64 = 0
    scanner.scanHexInt64(&rgb)
    return Color(
        red: Double((rgb >> 16) & 0xFF) / 255.0,
        green: Double((rgb >> 8) & 0xFF) / 255.0,
        blue: Double(rgb & 0xFF) / 255.0
    )
}

func colorToHex(_ color: Color) -> String {
    let uiColor = UIColor(color)
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
    return String(format: "#%02x%02x%02x", Int(r * 255), Int(g * 255), Int(b * 255))
}
