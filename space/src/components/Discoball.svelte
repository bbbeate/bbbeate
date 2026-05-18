<!--
  Discoball — top-right. spinning button; click summons a random disco overlay
  (kk parity). while painting, swaps to an X exit button.
-->
<script>
  import { mode, exitPaint } from '../lib/paint-store.js'

  $: paintActive = $mode === 'brush' || $mode === 'eraser' || $mode === 'fg'

  function rand(min, max) { return Math.random() * (max - min) + min }

  function summonDisco() {
    const o = document.createElement('div')
    o.className = 'disco-overlay'
    const img = document.createElement('img')
    img.src = '/discoball.gif'
    img.alt = ''
    o.appendChild(img)
    o.style.setProperty('--x', `${Math.floor(rand(15, 85))}vw`)
    o.style.setProperty('--y', `${Math.floor(rand(20, 80))}vh`)
    o.style.setProperty('--size', `${Math.floor(rand(120, 260))}px`)
    o.style.setProperty('--hue', `${Math.floor(rand(0, 360))}deg`)
    o.style.setProperty('--end-scale', rand(1.2, 2.4).toFixed(2))
    document.body.appendChild(o)
    setTimeout(() => o.remove(), 3000)
  }
</script>

{#if paintActive}
  <button class="kk-btn exit" type="button" aria-label="avslutt tegning" onclick={exitPaint}>
    X
  </button>
{:else}
  <button class="discoball" type="button" aria-label="disco" onclick={summonDisco}>
    <img src="/discoball.gif" alt="" />
  </button>
{/if}

<style>
  .discoball, .exit {
    position: fixed;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 100;
    -webkit-tap-highlight-color: transparent;
  }
  .discoball {
    width: 56px;
    height: 56px;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
    animation: spin 6s linear infinite;
  }
  .discoball img { width: 100%; height: 100%; display: block; }

  .exit {
    width: 44px;
    height: 44px;
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    color: #000;
    cursor: pointer;
    font-weight: 700;
    font-family: 'Tahoma', 'Geneva', 'Verdana', sans-serif;
  }
  .exit:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 640px) {
    .discoball, .exit {
      top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
      right: calc(env(safe-area-inset-right, 0px) + 0.5rem);
    }
    .discoball { width: 44px; height: 44px; }
    .exit { width: 38px; height: 38px; }
  }

  :global(.disco-overlay) {
    position: fixed;
    top: var(--y, 50%);
    left: var(--x, 50%);
    width: var(--size, 140px);
    height: var(--size, 140px);
    pointer-events: none;
    z-index: 50;
    animation: disco-float 3s ease-out forwards;
  }
  :global(.disco-overlay img) {
    width: 100%;
    height: 100%;
    filter: hue-rotate(var(--hue, 0deg)) saturate(1.4);
  }
  @keyframes disco-float {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
    20% { opacity: 1; }
    to { opacity: 0; transform: translate(-50%, -50%) scale(var(--end-scale, 1.5)); }
  }
</style>
