// single source of truth for paint state. svelte stores + helpers.
// tool mode + color targets, a world-space camera (for infinite svg zoom),
// and the in-memory undo stack. persistence (localStorage) lives in
// persistence.js.
import { writable, derived, get } from 'svelte/store'

// ─── palette + sizes ───────────────────────────────────────────────────────
export const PAINT_COLORS = [
  '#000000', '#ffffff', '#8b1a1a', '#e63946', '#f4a261',
  '#f9d423', '#52b788', '#4dabf7', '#3949ab', '#a259c4',
  '#b07854', '#f7b3c2', '#d4a374', '#ece4c1', '#cce75e',
  '#a8dde0', '#7c9eb2', '#c8b8e0',
]
export const BRUSH_SIZES = [8, 16, 28]
export const ERASER_SIZES = [10, 24, 44, 60]
export const DEFAULT_BG = '#f2ecdc'
export const DEFAULT_FG = '#0f0e0c'

// ─── ui + tool state ───────────────────────────────────────────────────────
export const mode = writable(null)            // 'bg' | 'fg' | 'brush' | 'eraser' | null
export const panelOpen = writable(false)
export const pickerOpen = writable(false)
export const menuOpen = writable(false)
export const dialogOpen = writable(null)      // 'signér' | null
export const savingState = writable('idle')   // 'idle' | 'saving' | 'error'

export const brushColor = writable(null)
export const brushSize = writable(BRUSH_SIZES[0])
export const eraserSize = writable(ERASER_SIZES[1])

export const bgColor = writable(DEFAULT_BG)
export const fgColor = writable(DEFAULT_FG)

// ─── world state ───────────────────────────────────────────────────────────
// strokes: my unsaved drafts (editable, erasable). array of
//   {id, kind:'brush'|'text', color, size?, pts?, text?, x?, y?, fontSize?}
export const strokes = writable([])

// savedBatches: published batches from anyone (incl. me). read-only locally.
// shape: [{id, signature, timestamp, bgColor, strokes:[...]}, ...]
export const savedBatches = writable([])

// camera describes the viewport in world coords:
//   svg viewBox = `${camera.x} ${camera.y} ${vw/zoom} ${vh/zoom}`
export const camera = writable({ x: 0, y: 0, zoom: 1 })

// pendingText: floating text-entry state. null when not editing.
//   {wx, wy, color, editing?: existing stroke}
export const pendingText = writable(null)

// ─── color target helpers ──────────────────────────────────────────────────
export function currentColorFor(target) {
  if (target === 'brush') return get(brushColor) ?? get(fgColor)
  if (target === 'fg') return get(fgColor)
  if (target === 'bg') return get(bgColor)
  return get(fgColor)
}

export function applyToTarget(target, hex) {
  if (target === 'brush') return brushColor.set(hex)
  if (target === 'fg') return fgColor.set(hex ?? DEFAULT_FG)
  if (target === 'bg') return bgColor.set(hex ?? DEFAULT_BG)
}

// ─── shared exits ──────────────────────────────────────────────────────────
export function exitPaint() {
  mode.set(null)
  panelOpen.set(false)
}

// ─── ids ───────────────────────────────────────────────────────────────────
// short non-cryptographic id, fine for undo targeting
export function nextId() {
  return Math.random().toString(36).slice(2, 10)
}

// ─── color math (shared by picker) ─────────────────────────────────────────
export function hexToRgb(hex) {
  const x = hex.replace('#', '')
  const n = parseInt(x.length === 3 ? x.split('').map((c) => c + c).join('') : x, 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
}
export function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}
export function hsvToRgb(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60)      [r, g, b] = [c, x, 0]
  else if (h < 120)[r, g, b] = [x, c, 0]
  else if (h < 180)[r, g, b] = [0, c, x]
  else if (h < 240)[r, g, b] = [0, x, c]
  else if (h < 300)[r, g, b] = [x, 0, c]
  else             [r, g, b] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}
