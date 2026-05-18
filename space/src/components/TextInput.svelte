<!--
  TextInput — floating html input rendered at a world coord. converts world→
  screen each frame so it tracks pan/zoom while it's open.
-->
<script>
  import { onMount } from 'svelte'
  import { camera } from '../lib/paint-store.js'
  import { worldToScreen } from '../lib/geo.js'

  let { wx, wy, color, initial = '', onCommit, onCancel } = $props()

  let input = $state(null)
  let value = $state(initial)
  let handled = false

  let pos = $derived(worldToScreen($camera, wx, wy))

  function submit() {
    if (handled) return
    handled = true
    onCommit?.(value.trim())
  }

  function cancel() {
    if (handled) return
    handled = true
    onCancel?.()
  }

  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }

  onMount(() => {
    input?.focus()
    if (initial) input?.select()
  })
</script>

<form
  class="text-edit-overlay"
  style="left: {pos[0]}px; top: {pos[1]}px;"
  onsubmit={(e) => { e.preventDefault(); submit() }}
>
  <input
    bind:this={input}
    bind:value
    class="text-input"
    style="color: {color}; caret-color: {color};"
    enterkeyhint="done"
    onkeydown={onKey}
    onblur={() => setTimeout(submit, 100)}
  />
</form>

<style>
  .text-edit-overlay {
    position: fixed;
    transform: translate(-50%, -50%);
    z-index: 200;
    margin: 0;
    padding: 0;
  }
  .text-input {
    background: rgba(255,255,255,0.92);
    border: 2px solid #000;
    padding: 4px 8px;
    font-size: 1.5rem;
    font-family: system-ui, -apple-system, sans-serif;
    text-align: center;
    outline: none;
    border-radius: 2px;
    min-width: 4ch;
  }
</style>
