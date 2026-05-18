<!--
  ColorPicker — 90s-chrome HSV picker (modal). port of kk's SkinColorPicker.
  applies the picked color to whichever target is active in $mode. bg picks
  go through undo (opSetBg) so they can be undone.
-->
<script>
  import { onMount } from 'svelte'
  import {
    pickerOpen, mode,
    applyToTarget, currentColorFor,
    hexToRgb, rgbToHex, rgbToHsv, hsvToRgb,
  } from '../lib/paint-store.js'
  import { pushOp, opSetBg } from '../lib/undo.js'

  let h = $state(0)
  let s = $state(1)
  let v = $state(1)
  let svEl = $state(null)
  let hueEl = $state(null)
  let dragging = null

  pickerOpen.subscribe((isOpen) => { if (isOpen) seedFromCurrent() })

  function pickerTarget() {
    return $mode === 'bg' || $mode === 'fg' || $mode === 'brush' ? $mode : null
  }

  function seedFromCurrent() {
    const target = pickerTarget()
    if (!target) return
    const rgb = hexToRgb(currentColorFor(target))
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
    h = hsv.h; s = hsv.s; v = hsv.v
  }

  let rgb = $derived(hsvToRgb(h, s, v))
  let hex = $derived(rgbToHex(rgb.r, rgb.g, rgb.b))
  let hueRgb = $derived(hsvToRgb(h, 1, 1))
  let hueColor = $derived(rgbToHex(hueRgb.r, hueRgb.g, hueRgb.b))

  function clamp01(n) { return Math.max(0, Math.min(1, n)) }
  function pickSV(e) {
    if (!svEl) return
    const r = svEl.getBoundingClientRect()
    s = clamp01((e.clientX - r.left) / r.width)
    v = 1 - clamp01((e.clientY - r.top) / r.height)
  }
  function pickHue(e) {
    if (!hueEl) return
    const r = hueEl.getBoundingClientRect()
    h = clamp01((e.clientX - r.left) / r.width) * 360
  }
  function svDown(e) {
    dragging = 'sv'
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pickSV(e)
  }
  function hueDown(e) {
    dragging = 'hue'
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pickHue(e)
  }
  function move(e) {
    if (dragging === 'sv') pickSV(e)
    else if (dragging === 'hue') pickHue(e)
  }
  function endDrag() { dragging = null }

  function commit() {
    const target = pickerTarget()
    if (target === 'bg') {
      pushOp(opSetBg(hex))
    } else if (target) {
      applyToTarget(target, hex)
    }
    pickerOpen.set(false)
  }
  function cancel() { pickerOpen.set(false) }

  function handleHexInput(e) {
    const value = e.target.value.trim()
    if (!/^#?[0-9a-fA-F]{6}$/.test(value)) return
    const rgb2 = hexToRgb(value.startsWith('#') ? value : '#' + value)
    const hsv2 = rgbToHsv(rgb2.r, rgb2.g, rgb2.b)
    h = hsv2.h; s = hsv2.s; v = hsv2.v
  }

  function handleKey(e) {
    if (!$pickerOpen) return
    if (e.key === 'Escape') cancel()
    if (e.key === 'Enter') commit()
  }

  onMount(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })
</script>

{#if $pickerOpen}
  <div
    class="cp-overlay"
    role="presentation"
    onpointerdown={(e) => { if (e.target === e.currentTarget) cancel() }}
  >
    <div
      class="cp"
      role="dialog"
      tabindex="-1"
      aria-label="velg farge"
      onpointermove={move}
      onpointerup={endDrag}
      onpointercancel={endDrag}
    >
      <div class="cp-titlebar">
        <span class="cp-title">Velg farge</span>
        <button type="button" class="cp-x" onclick={cancel} aria-label="lukk">×</button>
      </div>

      <div class="cp-body">
        <div class="cp-preview" style="background:{hex};"></div>
        <div
          class="cp-sv"
          bind:this={svEl}
          style="background:
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, {hueColor});"
          onpointerdown={svDown}
          role="slider"
          tabindex="0"
          aria-label="metning og lyshet"
          aria-valuenow={Math.round(s * 100)}
        >
          <div class="cp-sv-cursor" style="left:{s * 100}%; top:{(1 - v) * 100}%;"></div>
        </div>
      </div>

      <div
        class="cp-hue"
        bind:this={hueEl}
        onpointerdown={hueDown}
        role="slider"
        tabindex="0"
        aria-label="fargetone"
        aria-valuenow={Math.round(h)}
      >
        <div class="cp-hue-cursor" style="left:{(h / 360) * 100}%;"></div>
      </div>

      <div class="cp-actions">
        <input type="text" class="cp-hex" value={hex} oninput={handleHexInput} spellcheck="false" />
        <button type="button" class="kk-btn" onclick={commit}>OK</button>
        <button type="button" class="kk-btn" onclick={cancel}>Avbryt</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .cp-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.001);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .cp {
    width: 320px;
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff, 4px 4px 0 rgba(0, 0, 0, 0.3);
    font-family: 'Tahoma', 'Geneva', 'Verdana', sans-serif;
    font-size: 12px;
    color: #000;
    user-select: none;
  }
  .cp-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 4px 3px 6px;
    background: linear-gradient(to right, #000080, #1084d0);
    color: #fff;
    font-weight: 700;
    font-size: 11px;
  }
  .cp-title { letter-spacing: 0.05em; }
  .cp-x {
    width: 18px;
    height: 16px;
    background: #c0c0c0;
    color: #000;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    font-weight: 700;
    font-size: 12px;
  }
  .cp-x:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }

  .cp-body { display: flex; gap: 8px; padding: 8px; }
  .cp-preview { width: 60px; height: 140px; border: 2px inset #c0c0c0; flex-shrink: 0; }

  .cp-sv {
    flex: 1; height: 140px; position: relative;
    border: 2px inset #c0c0c0; cursor: crosshair; touch-action: none;
  }
  .cp-sv-cursor {
    position: absolute; width: 12px; height: 12px;
    border: 2px solid #fff; border-radius: 50%;
    transform: translate(-50%, -50%); pointer-events: none;
    box-shadow: 0 0 0 1px #000;
  }

  .cp-hue {
    margin: 0 8px; height: 18px; position: relative;
    border: 2px inset #c0c0c0; cursor: pointer;
    background: linear-gradient(
      to right,
      #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%
    );
    touch-action: none;
  }
  .cp-hue-cursor {
    position: absolute; top: -3px; bottom: -3px; width: 6px;
    background: #fff; border: 1px solid #000;
    transform: translateX(-50%); pointer-events: none;
  }

  .cp-actions { display: flex; gap: 6px; padding: 8px; align-items: center; }
  .cp-hex {
    flex: 1;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px; padding: 3px 6px;
    background: #fff; border: 2px inset #c0c0c0; color: #000;
    text-transform: uppercase; min-width: 0;
  }
  .cp-hex:focus { outline: 1px dotted #000; }

  .kk-btn {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    color: #000;
    font-family: 'Tahoma', 'Geneva', 'Verdana', sans-serif;
    cursor: pointer;
    padding: 3px 12px;
  }
  .kk-btn:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }
</style>
