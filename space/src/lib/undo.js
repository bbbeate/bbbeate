// in-memory undo/redo. each entry stores both the forward and inverse op so
// we can swap stacks. the doc state lives in svelte stores; an "op" is a fn
// that mutates the relevant store and returns its inverse.
//
// usage:
//   pushOp(() => { strokes.update(s => [...s, newStroke]); return () => removeById(newStroke.id) })
//   undo(); redo()
import { writable, get } from 'svelte/store'
import { strokes, bgColor } from './paint-store.js'

const undoStack = []
const redoStack = []

export const canUndo = writable(false)
export const canRedo = writable(false)

function refresh() {
  canUndo.set(undoStack.length > 0)
  canRedo.set(redoStack.length > 0)
}

// op = () => inverse op fn. apply op now, remember inverse on stack.
export function pushOp(op) {
  const inverse = op()
  if (typeof inverse !== 'function') return
  undoStack.push(inverse)
  redoStack.length = 0
  refresh()
}

// register an already-applied change with its inverse — useful for ops that
// were applied incrementally (drag-erase, mid-stroke append) where the
// "forward" was a side effect.
export function pushInverse(inverse) {
  if (typeof inverse !== 'function') return
  undoStack.push(inverse)
  redoStack.length = 0
  refresh()
}

export function undo() {
  const inverse = undoStack.pop()
  if (!inverse) return
  const redoFn = inverse()
  if (typeof redoFn === 'function') redoStack.push(redoFn)
  refresh()
}

export function redo() {
  const op = redoStack.pop()
  if (!op) return
  const inverse = op()
  if (typeof inverse === 'function') undoStack.push(inverse)
  refresh()
}

export function clearHistory() {
  undoStack.length = 0
  redoStack.length = 0
  refresh()
}

// ─── op helpers (used by Canvas + Toolbar) ─────────────────────────────────

export function opAddStroke(stroke) {
  return () => {
    strokes.update((s) => [...s, stroke])
    return () => {
      strokes.update((s) => s.filter((x) => x.id !== stroke.id))
      return opAddStroke(stroke)
    }
  }
}

export function opRemoveStrokes(removed) {
  // removed: array of strokes (preserves their original order in the world)
  return () => {
    const ids = new Set(removed.map((r) => r.id))
    strokes.update((s) => s.filter((x) => !ids.has(x.id)))
    return () => {
      strokes.update((s) => [...s, ...removed])
      return opRemoveStrokes(removed)
    }
  }
}

export function opReplaceStroke(oldStroke, newStroke) {
  return () => {
    strokes.update((s) => s.map((x) => (x.id === oldStroke.id ? newStroke : x)))
    return () => {
      strokes.update((s) => s.map((x) => (x.id === newStroke.id ? oldStroke : x)))
      return opReplaceStroke(oldStroke, newStroke)
    }
  }
}

export function opSetBg(newBg) {
  const old = get(bgColor)
  return () => {
    bgColor.set(newBg)
    return () => {
      bgColor.set(old)
      return opSetBg(newBg)
    }
  }
}

export function opClearAll() {
  const snapshot = get(strokes)
  return () => {
    strokes.set([])
    return () => {
      strokes.set(snapshot)
      return opClearAll()
    }
  }
}
