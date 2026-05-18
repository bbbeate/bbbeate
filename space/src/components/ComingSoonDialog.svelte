<!--
  ComingSoonDialog — the 90s modal shown when the user taps "lagre" in v1.
  no backend yet; saving online is "cummin' soon".
-->
<script>
  import { dialogOpen } from '../lib/paint-store.js'
  import { onMount } from 'svelte'

  function close() { dialogOpen.set(null) }

  function onKey(e) {
    if (!$dialogOpen) return
    if (e.key === 'Escape' || e.key === 'Enter') close()
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
</script>

{#if $dialogOpen === 'cummin-soon'}
  <div
    class="overlay"
    role="presentation"
    onpointerdown={(e) => { if (e.target === e.currentTarget) close() }}
  >
    <div class="dialog" role="dialog" aria-label="cummin' soon">
      <div class="titlebar">
        <span class="title">lagre</span>
        <button type="button" class="x" onclick={close} aria-label="lukk">×</button>
      </div>
      <div class="body">
        <img class="icon" src="/save.png" alt="" />
        <div class="text">
          <p><strong>cummin' soon</strong></p>
          <p>online lagring kommer snart. tegningene dine ligger trygt i nettleseren din til da.</p>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="kk-btn" onclick={close}>ok</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.001);
    -webkit-tap-highlight-color: transparent;
  }
  .dialog {
    width: 320px;
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff, 4px 4px 0 rgba(0,0,0,0.3);
    font-family: 'Tahoma', 'Geneva', 'Verdana', sans-serif;
    color: #000;
    user-select: none;
  }
  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 4px 3px 6px;
    background: linear-gradient(to right, #000080, #1084d0);
    color: #fff;
    font-weight: 700;
    font-size: 11px;
  }
  .title { letter-spacing: 0.05em; }
  .x {
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
  .x:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }

  .body {
    display: flex;
    gap: 12px;
    padding: 14px 12px;
    font-size: 13px;
    align-items: flex-start;
  }
  .icon {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    image-rendering: pixelated;
  }
  .text p { margin: 0 0 6px 0; line-height: 1.4; }
  .text p:last-child { margin-bottom: 0; }

  .actions {
    display: flex;
    justify-content: flex-end;
    padding: 0 12px 12px;
  }
  .kk-btn {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    color: #000;
    cursor: pointer;
    padding: 4px 18px;
    font-family: inherit;
    font-size: 12px;
  }
  .kk-btn:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }
</style>
