// fit.js — camera utilities used by "f" hotkey, meny → se alt, and the
// auto-fit on initial load. centered here so App + Menu share the same
// behavior.
import { get } from 'svelte/store'
import { camera, savedBatches, strokes } from './paint-store.js'
import { strokesBBox, fitCameraToBBox } from './geo.js'

export function fitAll() {
  const all = [
    ...get(savedBatches).flatMap((b) => b.strokes || []),
    ...get(strokes),
  ]
  const bbox = strokesBBox(all)
  if (!bbox) return false
  camera.set(fitCameraToBBox(bbox, window.innerWidth, window.innerHeight))
  return true
}
