<!--
  Toolbar — bottom-left 90s-skin paint toolbar (bg / fg-text / brush /
  eraser + undo). the panel above hosts swatches + brush sizes. eraser has
  no panel; "fjern alt" lives in the meny.
-->
<script>
  import {
    mode, panelOpen, pickerOpen,
    brushColor, brushSize, bgColor, fgColor,
    PAINT_COLORS, BRUSH_SIZES,
    applyToTarget, exitPaint,
  } from '../lib/paint-store.js'
  import { pushOp, opSetBg, undo, canUndo } from '../lib/undo.js'

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
      // eraser has no settings panel — just activate it
      panelOpen.set(m !== 'eraser')
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
</script>

<div class="skin">
  {#if $panelOpen && $mode}
    <div class="panel">
      <div class="panel-title">{TITLES[$mode]}</div>

      {#if $mode === 'bg' || $mode === 'fg' || $mode === 'brush'}
        <div class="swatches">
          <button
            type="button"
            class="swatch"
            class:swatch-default={$mode !== 'brush'}
            class:swatch-selected={selectedHex === null && $mode === 'brush'}
            style={$mode === 'brush' ? `background:${$fgColor}` : ''}
            aria-label="standard"
            onclick={() => pickColor($mode, null)}
          ></button>
          <button
            type="button"
            class="swatch swatch-picker"
            aria-label="velg farge"
            onclick={() => pickerOpen.set(true)}
          ></button>
          {#each PAINT_COLORS as hex}
            <button
              type="button"
              class="swatch"
              class:swatch-selected={isSelected(hex)}
              style="background:{hex}"
              aria-label={hex}
              onclick={() => pickColor($mode, hex)}
            ></button>
          {/each}
        </div>
      {/if}

      {#if $mode === 'brush'}
        <div class="sizes">
          {#each BRUSH_SIZES as s}
            <button
              type="button"
              class="size"
              class:size-selected={s === $brushSize}
              aria-label={`pensel ${s}px`}
              onclick={() => brushSize.set(s)}
            >
              <span
                class="size-dot"
                style="width:{s}px;height:{s}px;background:{$brushColor ?? $fgColor};"
              ></span>
            </button>
          {/each}
        </div>
      {/if}

    </div>
  {/if}

  <div class="toolbar">
    <button
      type="button"
      class="tool"
      class:tool-active={$mode === 'bg' && $panelOpen}
      onclick={() => selectTool('bg')}
      aria-label="bakgrunnsfarge"
    >
      <img src="/paint-bucket.png" alt="" />
    </button>
    <button
      type="button"
      class="tool"
      class:tool-active={$mode === 'fg' && $panelOpen}
      onclick={() => selectTool('fg')}
      aria-label="tekstfarge"
    >
      <img src="/paint-A.png" alt="" />
    </button>
    <button
      type="button"
      class="tool"
      class:tool-active={$mode === 'brush'}
      onclick={() => selectTool('brush')}
      aria-label="pensel"
    >
      <img src="/paint-brush.png" alt="" />
    </button>
    <button
      type="button"
      class="tool"
      class:tool-active={$mode === 'eraser'}
      onclick={() => selectTool('eraser')}
      aria-label="viskelær"
    >
      <img src="/paint-eraser.png" alt="" />
    </button>
    <button
      type="button"
      class="tool"
      onclick={undo}
      disabled={!$canUndo}
      aria-label="angre"
    >
      <img src="/undo.png" alt="" class="undo-icon" />
    </button>
  </div>
</div>

<style>
  .skin {
    position: fixed;
    bottom: 1.5rem;
    left: 1.5rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .toolbar {
    display: flex;
    flex-direction: row;
    padding: 3px;
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
  }

  .tool {
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
  .tool + .tool { margin-left: 2px; }
  .tool:active,
  .tool-active {
    border-style: inset;
    box-shadow: inset 1px 1px 0 #808080;
  }
  .tool img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .tool:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  /* undo icon is high-contrast linework — don't pixelate, and force solid
     black via filter (the asset itself is blue). slightly smaller than the
     chunky paint icons so it doesn't feel heavy. */
  .undo-icon {
    image-rendering: auto !important;
    width: 70% !important;
    height: 70% !important;
    filter: brightness(0);
  }
  .panel {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-self: flex-start;
  }
  .panel-title {
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

  .swatches {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 2px;
  }
  .swatch {
    width: 18px;
    height: 18px;
    border: 1px solid #404040;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .swatch:focus { outline: none; }
  .swatch:focus-visible { outline: 2px solid #000; outline-offset: -1px; }
  .swatch:active { outline: 1px solid #fff; outline-offset: -2px; }
  .swatch-selected {
    outline: 2px solid #000;
    outline-offset: -1px;
    box-shadow: inset 0 0 0 1px #fff;
  }
  .swatch-default {
    background:
      linear-gradient(45deg, transparent 45%, #404040 45%, #404040 55%, transparent 55%),
      #fff;
  }
  .swatch-picker {
    background: linear-gradient(
      to right,
      #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000
    );
  }

  .sizes { display: flex; gap: 4px; align-items: flex-end; }
  .size {
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
  .size-selected, .size:active {
    border-style: inset;
    box-shadow: inset 1px 1px 0 #808080;
  }
  .size-dot {
    display: inline-block;
    border-radius: 50%;
    border: 1px solid #000;
    max-width: calc(100% - 6px);
    max-height: calc(100% - 6px);
  }
  @media (max-width: 640px) {
    .skin {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
      left: calc(env(safe-area-inset-left, 0px) + 0.75rem);
      gap: 4px;
    }
    .tool { width: 30px; height: 30px; }
    .swatch { width: 28px; height: 28px; }
    .size { width: 44px; height: 44px; }
  }
</style>
