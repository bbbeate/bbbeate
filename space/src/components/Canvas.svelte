<!--
  Canvas — full-viewport svg, world-coord storage, camera-driven viewBox.
   - strokes are reactive (svg paths re-render automatically)
   - pan/zoom: no tool selected → drag pans, two-finger / wheel zooms
   - brush tool: single pointer draws, two-finger pinch still zooms
   - eraser tool: drag deletes strokes that intersect; one undo step per drag
   - fg tool: tap places a text input at that world coord
   - double-tap exits paint mode
-->
<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import {
    strokes, savedBatches, camera, mode, panelOpen, pickerOpen, dialogOpen, menuOpen,
    brushColor, brushSize, eraserSize, fgColor, bgColor,
    nextId, exitPaint, currentColorFor,
  } from '../lib/paint-store.js'
  import {
    screenToWorld, zoomAt, clampZoom, eraserHitsStroke, strokeToPathD,
    distance, midpoint,
  } from '../lib/geo.js'
  import {
    pushOp, pushInverse, opAddStroke, opRemoveStrokes, opReplaceStroke,
    undo, redo,
  } from '../lib/undo.js'
  import TextInput from './TextInput.svelte'

  const DBL_TAP_MS = 320
  const DBL_TAP_DIST = 30
  const TEXT_DEFAULT_FONT_SIZE = 28

  let svg
  let vw = 0
  let vh = 0
  let pendingText = null // {wx, wy, color, editing?:Stroke}

  // pointers currently down on this svg
  const pointers = new Map() // id → {x, y, startX, startY, kind}

  // active brush stroke (the most recently pushed stroke, if we're drawing)
  let activeStroke = null

  // erase-drag state — collect removals so one drag = one undo step
  let eraseDragRemoved = [] // strokes removed during current drag
  let eraseDragActive = false

  // pan state
  let panLast = null

  // tap tracking for double-tap-to-exit
  let lastTapTime = 0
  let lastTapX = 0
  let lastTapY = 0

  $: viewBox = `${$camera.x} ${$camera.y} ${vw / $camera.zoom} ${vh / $camera.zoom}`

  // ─── sizing ──────────────────────────────────────────────────────────────
  function measure() {
    if (!svg) return
    const r = svg.getBoundingClientRect()
    vw = Math.max(1, r.width)
    vh = Math.max(1, r.height)
  }

  // svg-local screen coords (excluding any page scroll / svg offset)
  function localScreen(clientX, clientY) {
    const r = svg.getBoundingClientRect()
    return [clientX - r.left, clientY - r.top]
  }

  // ─── pointer plumbing ────────────────────────────────────────────────────
  function trackPointerDown(e) {
    const [sx, sy] = localScreen(e.clientX, e.clientY)
    pointers.set(e.pointerId, { x: sx, y: sy, startX: sx, startY: sy, kind: e.pointerType })
  }
  function trackPointerMove(e) {
    const p = pointers.get(e.pointerId)
    if (!p) return
    const [sx, sy] = localScreen(e.clientX, e.clientY)
    p.x = sx
    p.y = sy
  }
  function trackPointerUp(e) {
    pointers.delete(e.pointerId)
  }

  // ─── pan / pinch (used when no tool selected, or as gesture in tool mode) ─
  let pinch = null // {dist, mid, cam}

  function beginPinchIfNeeded() {
    if (pointers.size !== 2) {
      pinch = null
      return
    }
    const [a, b] = [...pointers.values()]
    pinch = {
      dist: distance(a, b),
      mid: midpoint(a, b),
      cam: { ...get(camera) },
    }
  }

  function maybeUpdatePinch() {
    if (!pinch || pointers.size !== 2) return
    const [a, b] = [...pointers.values()]
    const d = distance(a, b)
    const m = midpoint(a, b)
    if (pinch.dist > 0) {
      const factor = d / pinch.dist
      // anchor at pinch mid in svg-local screen coords, then add the pan
      // delta between mid moves so the canvas slides with the fingers
      const next = zoomAt(pinch.cam, pinch.mid[0], pinch.mid[1], factor)
      const dx = (m[0] - pinch.mid[0]) / next.zoom
      const dy = (m[1] - pinch.mid[1]) / next.zoom
      camera.set({ zoom: next.zoom, x: next.x - dx, y: next.y - dy })
    }
  }

  // ─── tool: brush ─────────────────────────────────────────────────────────
  function startBrush(e) {
    const [sx, sy] = localScreen(e.clientX, e.clientY)
    const [wx, wy] = screenToWorld(get(camera), sx, sy)
    const color = get(brushColor) ?? get(fgColor)
    const size = get(brushSize) / get(camera).zoom // size given in screen-px feel
    activeStroke = {
      id: nextId(),
      kind: 'brush',
      color,
      // store size in screen-px (matches user expectation); render multiplies
      // by 1 since svg vector-effect handles scaling — see template
      size: get(brushSize),
      pts: [wx, wy],
    }
    strokes.update((s) => [...s, activeStroke])
  }

  function extendBrush(e) {
    if (!activeStroke) return
    const [sx, sy] = localScreen(e.clientX, e.clientY)
    const [wx, wy] = screenToWorld(get(camera), sx, sy)
    // trigger reactivity by reassigning the strokes array
    activeStroke.pts.push(wx, wy)
    strokes.update((s) => s.slice())
  }

  function endBrush() {
    if (!activeStroke) return
    const stroke = activeStroke
    activeStroke = null
    // already in store — register the inverse for undo
    pushInverse(() => {
      strokes.update((s) => s.filter((x) => x.id !== stroke.id))
      return opAddStroke(stroke)
    })
  }

  // ─── tool: eraser ────────────────────────────────────────────────────────
  function eraserStep(e) {
    const [sx, sy] = localScreen(e.clientX, e.clientY)
    const [wx, wy] = screenToWorld(get(camera), sx, sy)
    const radius = get(eraserSize) / 2 / get(camera).zoom
    const current = get(strokes)
    const hits = []
    const survivors = []
    for (const s of current) {
      if (eraserHitsStroke(s, wx, wy, radius)) hits.push(s)
      else survivors.push(s)
    }
    if (hits.length) {
      eraseDragRemoved.push(...hits)
      strokes.set(survivors)
    }
  }

  function endEraseDrag() {
    if (!eraseDragActive) return
    eraseDragActive = false
    if (eraseDragRemoved.length === 0) return
    const removed = eraseDragRemoved
    eraseDragRemoved = []
    // forward already applied — register inverse
    pushInverse(() => {
      strokes.update((s) => [...s, ...removed])
      return opRemoveStrokes(removed)
    })
  }

  // ─── tool: fg/text ───────────────────────────────────────────────────────
  function placeTextInputAt(e) {
    const [sx, sy] = localScreen(e.clientX, e.clientY)
    const [wx, wy] = screenToWorld(get(camera), sx, sy)
    pendingText = { wx, wy, color: get(fgColor) }
  }

  function commitText(text) {
    if (!pendingText) return
    const t = pendingText
    pendingText = null
    if (!text) return
    if (t.editing) {
      const oldStroke = t.editing
      const newStroke = { ...oldStroke, text, color: t.color }
      pushOp(opReplaceStroke(oldStroke, newStroke))
    } else {
      const stroke = {
        id: nextId(),
        kind: 'text',
        text,
        x: t.wx,
        y: t.wy,
        color: t.color,
        fontSize: TEXT_DEFAULT_FONT_SIZE,
      }
      pushOp(opAddStroke(stroke))
    }
  }

  function cancelText() {
    pendingText = null
  }

  // edit existing text on click (only when no paint tool active)
  function editText(stroke, e) {
    if (get(mode)) return // tools active → eraser/etc handles it
    e.stopPropagation()
    pendingText = { wx: stroke.x, wy: stroke.y, color: stroke.color, editing: stroke }
  }

  // ─── pointer routing ─────────────────────────────────────────────────────
  function onPointerDown(e) {
    if (get(pickerOpen) || get(dialogOpen) || get(menuOpen)) return
    if (e.target.closest('.text-edit-overlay')) return

    e.preventDefault()
    svg.setPointerCapture?.(e.pointerId)
    trackPointerDown(e)

    // double-tap-to-exit (paint mode only)
    if (get(mode) === 'brush' || get(mode) === 'eraser' || get(mode) === 'fg') {
      const now = Date.now()
      const dx = e.clientX - lastTapX
      const dy = e.clientY - lastTapY
      const isDbl = now - lastTapTime < DBL_TAP_MS && Math.hypot(dx, dy) < DBL_TAP_DIST
      lastTapTime = now
      lastTapX = e.clientX
      lastTapY = e.clientY
      if (isDbl) {
        if (activeStroke) {
          const id = activeStroke.id
          strokes.update((s) => s.filter((x) => x.id !== id))
          activeStroke = null
        }
        exitPaint()
        return
      }
    }

    // close any open color/size panel on first interaction
    panelOpen.set(false)

    // 2+ pointers → cancel any in-flight single-pointer op, switch to pinch
    if (pointers.size >= 2) {
      if (activeStroke) {
        const id = activeStroke.id
        strokes.update((s) => s.filter((x) => x.id !== id))
        activeStroke = null
      }
      panLast = null
      beginPinchIfNeeded()
      return
    }

    const m = get(mode)
    if (m === 'brush') {
      startBrush(e)
    } else if (m === 'eraser') {
      eraseDragActive = true
      eraseDragRemoved = []
      eraserStep(e)
    } else if (m === 'fg') {
      placeTextInputAt(e)
    } else {
      // no tool → pan
      const [sx, sy] = localScreen(e.clientX, e.clientY)
      panLast = { x: sx, y: sy }
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return
    trackPointerMove(e)

    if (pinch) {
      maybeUpdatePinch()
      return
    }

    const m = get(mode)
    if (m === 'brush' && activeStroke) {
      extendBrush(e)
    } else if (m === 'eraser' && eraseDragActive) {
      eraserStep(e)
    } else if (!m && panLast) {
      const [sx, sy] = localScreen(e.clientX, e.clientY)
      const dx = (sx - panLast.x) / get(camera).zoom
      const dy = (sy - panLast.y) / get(camera).zoom
      camera.update((c) => ({ ...c, x: c.x - dx, y: c.y - dy }))
      panLast = { x: sx, y: sy }
    }
  }

  function onPointerUp(e) {
    trackPointerUp(e)

    if (pinch) {
      if (pointers.size < 2) pinch = null
      // when going from 2→1 fingers, kill the pan baseline so the remaining
      // finger doesn't snap the canvas
      panLast = null
      return
    }

    const m = get(mode)
    if (m === 'brush') endBrush()
    else if (m === 'eraser') endEraseDrag()
    panLast = null
  }

  function onPointerCancel(e) {
    onPointerUp(e)
  }

  // wheel: pan by default, zoom with cmd/ctrl
  function onWheel(e) {
    if (get(pickerOpen) || get(dialogOpen) || get(menuOpen)) return
    const [sx, sy] = localScreen(e.clientX, e.clientY)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * 0.0015)
      camera.set(zoomAt(get(camera), sx, sy, factor))
    } else {
      e.preventDefault()
      const c = get(camera)
      camera.set({ ...c, x: c.x + e.deltaX / c.zoom, y: c.y + e.deltaY / c.zoom })
    }
  }

  // ─── keyboard ────────────────────────────────────────────────────────────
  function onKey(e) {
    // never hijack while typing in an input
    const t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      undo()
    } else if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
      e.preventDefault()
      redo()
    } else if (e.key === 'Escape') {
      if (pendingText) { pendingText = null; return }
      if (get(menuOpen)) { menuOpen.set(false); return }
      exitPaint()
    }
  }

  onMount(() => {
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(svg)
    window.addEventListener('keydown', onKey)
    return () => {
      ro.disconnect()
      window.removeEventListener('keydown', onKey)
    }
  })

  // cursor hint — eraser uses a custom png pointer so it's obvious you're erasing
  $: cursor =
    $mode === 'brush' ? 'crosshair' :
    $mode === 'eraser' ? `url('/paint-eraser-cursor.png') 4 28, cell` :
    $mode === 'fg' ? 'text' :
    $mode === null ? 'grab' : 'default'
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg
  bind:this={svg}
  class="canvas"
  role="img"
  aria-label="tegnefelt"
  {viewBox}
  preserveAspectRatio="xMidYMid slice"
  style="background: {$bgColor}; cursor: {cursor}; touch-action: none;"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerCancel}
  onwheel={onWheel}
>
  <!-- saved (published) batches — read-only, drawn first so drafts sit on top -->
  {#each $savedBatches as batch (batch.id)}
    {#each batch.strokes as stroke (stroke.id)}
      {#if stroke.kind === 'brush'}
        <path
          d={strokeToPathD(stroke.pts)}
          stroke={stroke.color}
          stroke-width={stroke.size}
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      {:else if stroke.kind === 'text'}
        <text
          x={stroke.x}
          y={stroke.y}
          fill={stroke.color}
          font-size={stroke.fontSize}
          font-family="system-ui, -apple-system, sans-serif"
          text-anchor="start"
          dominant-baseline="middle"
          style="user-select: none; pointer-events: none;"
        >{stroke.text}</text>
      {/if}
    {/each}
  {/each}

  <!-- my drafts — editable + erasable -->
  {#each $strokes as stroke (stroke.id)}
    {#if stroke.kind === 'brush'}
      <path
        d={strokeToPathD(stroke.pts)}
        stroke={stroke.color}
        stroke-width={stroke.size}
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    {:else if stroke.kind === 'text'}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <text
        x={stroke.x}
        y={stroke.y}
        fill={stroke.color}
        font-size={stroke.fontSize}
        font-family="system-ui, -apple-system, sans-serif"
        text-anchor="start"
        dominant-baseline="middle"
        style="cursor: pointer; user-select: none;"
        onpointerdown={(e) => editText(stroke, e)}
      >{stroke.text}</text>
    {/if}
  {/each}
</svg>

{#if pendingText}
  <TextInput
    wx={pendingText.wx}
    wy={pendingText.wy}
    color={pendingText.color}
    initial={pendingText.editing?.text ?? ''}
    onCommit={commitText}
    onCancel={cancelText}
  />
{/if}

<style>
  .canvas {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
    /* svg drawing surface should never page-scroll */
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
</style>
