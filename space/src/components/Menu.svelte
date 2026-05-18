<!--
  Menu — top-left ≡ button. opens a 90s-style panel with redo + save. save
  triggers the "cummin' soon" dialog (no backend yet).
-->
<script>
  import { menuOpen, dialogOpen } from '../lib/paint-store.js'
  import { redo, canRedo } from '../lib/undo.js'

  function toggle() {
    menuOpen.update((v) => !v)
  }

  function doRedo() {
    redo()
    menuOpen.set(false)
  }

  function doSave() {
    dialogOpen.set('cummin-soon')
    menuOpen.set(false)
  }

  function onWindowClick(e) {
    if (!$menuOpen) return
    if (e.target.closest('.menu-root')) return
    menuOpen.set(false)
  }
</script>

<svelte:window onclick={onWindowClick} />

<div class="menu-root">
  <button type="button" class="kk-btn menu-btn" aria-label="meny" onclick={toggle}>
    <span class="bars">≡</span>
  </button>

  {#if $menuOpen}
    <div class="kk-panel menu-panel">
      <div class="kk-panel-title">MENY</div>
      <button
        type="button"
        class="kk-btn menu-item"
        disabled={!$canRedo}
        onclick={doRedo}
      >
        <img src="/redo.png" alt="" class="menu-icon" />
        <span>gjør om</span>
      </button>
      <button type="button" class="kk-btn menu-item" onclick={doSave}>
        <img src="/save.png" alt="" class="menu-icon" />
        <span>lagre</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .menu-root {
    position: fixed;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .kk-btn {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    color: #000;
    font-family: 'Tahoma', 'Geneva', 'Verdana', sans-serif;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .kk-btn:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }
  .kk-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .menu-btn {
    width: 44px;
    height: 44px;
    font-size: 24px;
    line-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .bars { transform: translateY(-2px); }

  .kk-panel {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 140px;
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

  .menu-item {
    padding: 6px 10px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
  }
  .menu-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
    filter: invert(1) brightness(0);
  }
  .menu-item:disabled .menu-icon { opacity: 0.5; }

  @media (max-width: 640px) {
    .menu-root {
      top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
      left: calc(env(safe-area-inset-left, 0px) + 0.5rem);
    }
    .menu-btn { width: 38px; height: 38px; font-size: 22px; }
  }
</style>
