<!--
  Toolbar — bottom-left 4-tool toolbar (bg/fg/brush/eraser) + the panel that
  opens above it (swatches + sizes). port of kk's SkinToolbar, minus the kk-
  specific css-var stuff (we just write to bg/fg stores directly).
-->
<script>
  import { get } from 'svelte/store'
  import {
    mode, panelOpen, pickerOpen,
    brushColor, brushSize, eraserSize, bgColor, fgColor,
    PAINT_COLORS, BRUSH_SIZES, ERASER_SIZES,
    applyToTarget, exitPaint,
  } from '../lib/paint-store.js'
  import { pushOp, opSetBg, opClearAll } from '../lib/undo.js'

  $: selectedHex =
    $mode === 'brush' ? $brushColor :
    $mode === 'bg' ? $bgColor :
    $mode === 'fg' ? $fgColor : null
  $: isSelected = (hex) =>
    selectedHex !== null && selectedHex.toLowerCase() === hex.toLowerCase()

  const TITLES = { bg: 'BAKGRUNN', fg: 'TEKST', brush: 'PENSEL', eraser: 'VISKELÆR' }

  function selectTool(m) {
    if ($mode === m) {
      exitPaint()
    } else {
      mode.set(m)
      panelOpen.set(true)
    }
  }

  // bg gets the undo-tracked setter (it's a discrete change); brush/fg do not
  // (they're just settings that take effect on the next stroke / text)
  function pickColor(target, hex) {
    if (target === 'bg') {
      pushOp(opSetBg(hex ?? '#f2ecdc'))
    } else {
      applyToTarget(target, hex)
    }
  }

  function clearAll() {
    pushOp(opClearAll())
  }
</script>

<div class="kk-skin">
  {#if $panelOpen && $mode}
    <div class="kk-panel">
      <div class="kk-panel-title">{TITLES[$mode]}</div>

      {#if $mode === 'bg' || $mode === 'fg' || $mode === 'brush'}
        <div class="kk-swatches">
          <button
            type="button"
            class="kk-swatch"
            class:kk-swatch-default={$mode !== 'brush'}
            class:kk-swatch-selected={selectedHex === null && $mode === 'brush'}
            style={$mode === 'brush' ? `background:${$fgColor}` : ''}
            aria-label="standard"
            onclick={() => pickColor($mode, null)}
          ></button>
          <button
            type="button"
            class="kk-swatch kk-swatch-picker"
            aria-label="velg farge"
            onclick={() => pickerOpen.set(true)}
          ></button>
          {#each PAINT_COLORS as hex}
            <button
              type="button"
              class="kk-swatch"
              class:kk-swatch-selected={isSelected(hex)}
              style="background:{hex}"
              aria-label={hex}
              onclick={() => pickColor($mode, hex)}
            ></button>
          {/each}
        </div>
      {/if}

      {#if $mode === 'brush'}
        <div class="kk-sizes">
          {#each BRUSH_SIZES as s}
            <button
              type="button"
              class="kk-size"
              class:kk-size-selected={s === $brushSize}
              aria-label={`pensel ${s}px`}
              onclick={() => brushSize.set(s)}
            >
              <span
                class="kk-size-dot"
                style="width:{s}px;height:{s}px;background:{$brushColor ?? $fgColor};"
              ></span>
            </button>
          {/each}
        </div>
      {/if}

      {#if $mode === 'eraser'}
        <div class="kk-sizes">
          {#each ERASER_SIZES as s}
            <button
              type="button"
              class="kk-size kk-size-eraser"
              class:kk-size-selected={s === $eraserSize}
              aria-label={`viskelær ${s}px`}
              onclick={() => eraserSize.set(s)}
            >
              <span class="kk-size-dot kk-size-square" style="width:{s}px;height:{s}px;"></span>
            </button>
          {/each}
        </div>
        <button type="button" class="kk-btn kk-clear-all" onclick={clearAll}>fjern alt</button>
      {/if}
    </div>
  {/if}

  <div class="kk-toolbar">
    <button
      type="button"
      class="kk-tool"
      class:kk-tool-active={$mode === 'bg' && $panelOpen}
      onclick={() => selectTool('bg')}
      aria-label="bakgrunnsfarge"
    >
      <img src="/paint-bucket.png" alt="" />
    </button>
    <button
      type="button"
      class="kk-tool"
      class:kk-tool-active={$mode === 'fg' && $panelOpen}
      onclick={() => selectTool('fg')}
      aria-label="tekstfarge"
    >
      <img src="/paint-A.png" alt="" />
    </button>
    <button
      type="button"
      class="kk-tool"
      class:kk-tool-active={$mode === 'brush'}
      onclick={() => selectTool('brush')}
      aria-label="pensel"
    >
      <img src="/paint-brush.png" alt="" />
    </button>
    <button
      type="button"
      class="kk-tool"
      class:kk-tool-active={$mode === 'eraser'}
      onclick={() => selectTool('eraser')}
      aria-label="viskelær"
    >
      <img src="/paint-eraser.png" alt="" />
    </button>
  </div>
</div>

<style>
  .kk-skin {
    position: fixed;
    bottom: 1.5rem;
    left: 1.5rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .kk-toolbar {
    display: flex;
    flex-direction: row;
    padding: 3px;
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
  }

  .kk-tool {
    width: 36px;
    height: 36px;
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    padding: 2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 1px 1px 0 #fff;
    -webkit-tap-highlight-color: transparent;
  }
  .kk-tool + .kk-tool { margin-left: 2px; }
  .kk-tool:active,
  .kk-tool-active {
    border-style: inset;
    box-shadow: inset 1px 1px 0 #808080;
  }
  .kk-tool img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .kk-panel {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-self: flex-start;
  }
  .kk-panel-title {
    margin: -6px -6px 0 -6px;
    padding: 3px 6px;
    background: linear-gradient(to right, #000080, #1084d0);
    color: #fff;
    font-family: 'Tahoma', 'Geneva', 'Verdana', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.05em;
    user-select: none;
  }

  .kk-swatches {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 2px;
  }
  .kk-swatch {
    width: 18px;
    height: 18px;
    border: 1px solid #404040;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .kk-swatch:focus { outline: none; }
  .kk-swatch:focus-visible { outline: 2px solid #000; outline-offset: -1px; }
  .kk-swatch:active { outline: 1px solid #fff; outline-offset: -2px; }
  .kk-swatch-selected {
    outline: 2px solid #000;
    outline-offset: -1px;
    box-shadow: inset 0 0 0 1px #fff;
  }
  .kk-swatch-default {
    background:
      linear-gradient(45deg, transparent 45%, #404040 45%, #404040 55%, transparent 55%),
      #fff;
  }
  .kk-swatch-picker {
    background: linear-gradient(
      to right,
      #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000
    );
  }

  .kk-sizes { display: flex; gap: 4px; align-items: flex-end; }
  .kk-size {
    width: 52px;
    height: 52px;
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .kk-size-selected, .kk-size:active {
    border-style: inset;
    box-shadow: inset 1px 1px 0 #808080;
  }
  .kk-size-dot {
    display: inline-block;
    border-radius: 50%;
    border: 1px solid #000;
    max-width: calc(100% - 6px);
    max-height: calc(100% - 6px);
  }
  .kk-size-eraser { width: 72px; height: 72px; }
  .kk-size-square { border-radius: 0; background: #fff; }

  .kk-btn {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    color: #000;
    font-family: 'Tahoma', 'Geneva', 'Verdana', sans-serif;
    cursor: pointer;
  }
  .kk-btn:active {
    border-style: inset;
    box-shadow: inset 1px 1px 0 #808080;
  }
  .kk-clear-all { width: 100%; font-size: 12px; padding: 4px 8px; }

  @media (max-width: 640px) {
    .kk-skin {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
      left: calc(env(safe-area-inset-left, 0px) + 0.75rem);
      gap: 4px;
    }
    .kk-tool { width: 30px; height: 30px; }
    .kk-swatch { width: 28px; height: 28px; }
    .kk-size { width: 44px; height: 44px; }
    .kk-size-eraser { width: 60px; height: 60px; }
  }
</style>
