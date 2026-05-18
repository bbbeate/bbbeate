// camera math + eraser hit-tests. world units = svg user units.
//
// camera describes the viewport in world space:
//   viewBox = `${camera.x} ${camera.y} ${vw/zoom} ${vh/zoom}`
// so screen→world is just (sx/zoom + camera.x, sy/zoom + camera.y) given the
// svg element fills the viewport at css size vw×vh.

export function screenToWorld(camera, sx, sy) {
  return [sx / camera.zoom + camera.x, sy / camera.zoom + camera.y]
}

export function worldToScreen(camera, wx, wy) {
  return [(wx - camera.x) * camera.zoom, (wy - camera.y) * camera.zoom]
}

// zoom around a screen-space anchor (keeps the point under the cursor fixed)
export function zoomAt(camera, anchorScreenX, anchorScreenY, factor) {
  const [wx, wy] = screenToWorld(camera, anchorScreenX, anchorScreenY)
  const zoom = clampZoom(camera.zoom * factor)
  return {
    zoom,
    x: wx - anchorScreenX / zoom,
    y: wy - anchorScreenY / zoom,
  }
}

const ZOOM_MIN = 1e-3
const ZOOM_MAX = 1e3
export function clampZoom(z) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z))
}

// point-to-segment squared distance (in world units)
function distSqToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) {
    const ex = px - ax, ey = py - ay
    return ex * ex + ey * ey
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx, cy = ay + t * dy
  const ex = px - cx, ey = py - cy
  return ex * ex + ey * ey
}

// true if eraser circle (world coords, world radius) overlaps the stroke
export function eraserHitsStroke(stroke, ex, ey, eraseRadius) {
  if (stroke.kind === 'brush') {
    const halfStroke = (stroke.size || 0) / 2
    const r = eraseRadius + halfStroke
    const r2 = r * r
    const p = stroke.pts
    if (!p || p.length < 2) return false
    // single-point "dot" stroke
    if (p.length === 2) {
      const dx = ex - p[0], dy = ey - p[1]
      return dx * dx + dy * dy <= r2
    }
    for (let i = 0; i < p.length - 2; i += 2) {
      if (distSqToSegment(ex, ey, p[i], p[i + 1], p[i + 2], p[i + 3]) <= r2) return true
    }
    return false
  }
  if (stroke.kind === 'text') {
    // text is left-anchored (x = leftmost) and vertically centered on y.
    // bbox is approximate (font-metric without measure). good enough for
    // eraser hit-testing; not used for layout.
    const fs = stroke.fontSize || 24
    const w = (stroke.text?.length || 1) * fs * 0.6
    const h = fs * 1.2
    const minX = stroke.x, maxX = stroke.x + w
    const minY = stroke.y - h / 2, maxY = stroke.y + h / 2
    const cx = Math.max(minX, Math.min(ex, maxX))
    const cy = Math.max(minY, Math.min(ey, maxY))
    const dx = ex - cx, dy = ey - cy
    return dx * dx + dy * dy <= eraseRadius * eraseRadius
  }
  return false
}

// build an svg `d` attribute from a flat [x,y,...] points array
export function strokeToPathD(pts) {
  if (!pts || pts.length < 2) return ''
  let d = `M ${pts[0]} ${pts[1]}`
  if (pts.length === 2) {
    // single dot — draw a tiny line so stroke-linecap renders it as a circle
    d += ` L ${pts[0] + 0.001} ${pts[1] + 0.001}`
    return d
  }
  for (let i = 2; i < pts.length; i += 2) d += ` L ${pts[i]} ${pts[i + 1]}`
  return d
}

// midpoint between two pointer positions (used for pinch anchor)
export function midpoint(a, b) {
  return [(a.x + b.x) / 2, (a.y + b.y) / 2]
}

export function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y
  return Math.hypot(dx, dy)
}
