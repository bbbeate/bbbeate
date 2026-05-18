// localStorage persistence for the canvas draft. throttled writes; loads once
// on app mount. only handles raw shape — undo stack is intentionally not
// persisted (you start each session with a fresh history but your drawings
// stay).
import { get } from 'svelte/store'
import {
  strokes, bgColor, fgColor, camera,
  brushColor, brushSize, eraserSize,
  DEFAULT_BG, DEFAULT_FG, BRUSH_SIZES, ERASER_SIZES,
} from './paint-store.js'

const KEY = 'bbbeate-space-v1'
const SAVE_THROTTLE_MS = 400

let saveTimer = null

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (Array.isArray(data.strokes)) strokes.set(data.strokes)
    if (typeof data.bg === 'string') bgColor.set(data.bg)
    if (typeof data.fg === 'string') fgColor.set(data.fg)
    if (data.camera && typeof data.camera.x === 'number') camera.set(data.camera)
    if (typeof data.brushColor === 'string' || data.brushColor === null) brushColor.set(data.brushColor)
    if (BRUSH_SIZES.includes(data.brushSize)) brushSize.set(data.brushSize)
    if (ERASER_SIZES.includes(data.eraserSize)) eraserSize.set(data.eraserSize)
  } catch {}
}

export function scheduleSave() {
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(flush, SAVE_THROTTLE_MS)
}

export function flush() {
  saveTimer = null
  try {
    const data = {
      strokes: get(strokes),
      bg: get(bgColor),
      fg: get(fgColor),
      camera: get(camera),
      brushColor: get(brushColor),
      brushSize: get(brushSize),
      eraserSize: get(eraserSize),
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {}
}

export function clearAll() {
  strokes.set([])
  bgColor.set(DEFAULT_BG)
  fgColor.set(DEFAULT_FG)
  try { localStorage.removeItem(KEY) } catch {}
}

// subscribe everything that should auto-save
export function startAutoSave() {
  const unsubs = [
    strokes.subscribe(scheduleSave),
    bgColor.subscribe(scheduleSave),
    fgColor.subscribe(scheduleSave),
    camera.subscribe(scheduleSave),
    brushColor.subscribe(scheduleSave),
    brushSize.subscribe(scheduleSave),
    eraserSize.subscribe(scheduleSave),
  ]
  return () => unsubs.forEach((fn) => fn())
}
