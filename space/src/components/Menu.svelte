<!--
  Menu — bottom-right MENY button. opens a 90s panel above it (animated) with
  redo + save. save fires the "cummin' soon" dialog (no backend yet).
-->
<script>
  import { menuOpen, dialogOpen, strokes } from '../lib/paint-store.js'
  import { redo, canRedo } from '../lib/undo.js'

  function toggle() { menuOpen.update((v) => !v) }
  function close() { menuOpen.set(false) }

  function doRedo() { redo(); close() }
  function doSave() {
    dialogOpen.set('signér')
    close()
  }

  function onWindowClick(e) {
    if (!$menuOpen) return
    if (e.target.closest('.menu-root')) return
    close()
  }
</script>

<svelte:window onclick={onWindowClick} />

<div class="menu-root">
  <nav class="panel" class:panel-open={$menuOpen}>
    <button
      type="button"
      class="item"
      disabled={!$canRedo}
      onclick={doRedo}
    >
      <img src="/redo.png" alt="" class="icon" />
      <span>gjør om</span>
    </button>
    <button
      type="button"
      class="item"
      disabled={$strokes.length === 0}
      onclick={doSave}
    >
      <img src="/save.png" alt="" class="icon save-icon" />
      <span>lagre</span>
    </button>
  </nav>

  <button
    type="button"
    class="btn toggle"
    class:toggle-open={$menuOpen}
    aria-label={$menuOpen ? 'lukk meny' : 'åpne meny'}
    onclick={toggle}
  >
    {$menuOpen ? 'X' : 'MENY'}
  </button>
</div>

<style>
  .menu-root {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .btn {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    color: #000;
    font-family: 'Tahoma', 'Geneva', 'Verdana', sans-serif;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }

  .toggle {
    min-width: 64px;
    height: 46px;
    padding: 0 1rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    line-height: 1;
    font-size: 13px;
  }
  .toggle-open { /* nothing extra, but here for future tweaks */ }

  /* panel grows upward from bottom-right, like kk's MENY */
  .panel {
    display: flex;
    flex-direction: column;
    background: #c0c0c0;
    border: 3px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    padding: 0 6px;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transform: translateY(8px) scale(0.97);
    transform-origin: bottom right;
    transition:
      max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease,
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      padding 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .panel-open {
    max-height: 300px;
    opacity: 1;
    padding: 8px 6px;
    transform: translateY(0) scale(1);
  }

  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    padding: 6px 12px;
    font-family: 'Tahoma', 'Geneva', sans-serif;
    font-size: 12px;
    color: #000;
    cursor: pointer;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .item:hover:not(:disabled) {
    background: #000080;
    color: #fff;
  }
  .item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .item:hover:not(:disabled) .icon { filter: invert(1); }

  .icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
    filter: invert(1) brightness(0);
  }
  /* the save floppy already has color; don't invert it */
  .save-icon { filter: none; }
  .item:hover:not(:disabled) .save-icon { filter: none; }
  .item:disabled .icon { opacity: 0.5; }

  @media (max-width: 640px) {
    .menu-root {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
      right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
    }
    .toggle {
      height: 40px;
      min-width: 56px;
      padding: 0 0.75rem;
      font-size: 12px;
    }
  }
</style>
