export function mirekToHex(mirek) {
  const t = (mirek - 153) / (500 - 153)
  const r = 255
  const g = Math.round(180 + (255 - 180) * (1 - t))
  const b = Math.round(100 + (200 - 100) * (1 - t))
  return `rgb(${r}, ${g}, ${b})`
}

export function hexToXy(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`invalid hex color: ${hex}`)
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const rr = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  const gg = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  const bb = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  const X = rr * 0.4124 + gg * 0.3576 + bb * 0.1805
  const Y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722
  const Z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505

  const sum = X + Y + Z
  return sum === 0 ? { x: 0, y: 0 } : { x: X / sum, y: Y / sum }
}

export function hexToHsv(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`invalid hex color: ${hex}`)
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d !== 0 && max === r) h = 60 * (((g - b) / d) % 6)
  else if (d !== 0 && max === g) h = 60 * ((b - r) / d + 2)
  else if (d !== 0) h = 60 * ((r - g) / d + 4)
  if (h < 0) h += 360
  return { h: Math.round(h), s: max === 0 ? 0 : Math.round((d / max) * 100) }
}

export function hsToHex(h, s) {
  const channel = n => {
    const k = (n + h / 60) % 6
    const value = 1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1))
    return Math.round(value * 255).toString(16).padStart(2, '0')
  }
  return `#${channel(5)}${channel(3)}${channel(1)}`
}
