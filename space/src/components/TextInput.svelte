<!--
  TextInput — invisible html input at a world coord. no box, no bg — just the
  caret + text in the current fg color, so typing feels like writing on the
  canvas. left-anchored so the click point is where the first character
  starts.
-->
<script>
  import { onMount } from 'svelte'
  import { camera } from '../lib/paint-store.js'
  import { worldToScreen } from '../lib/geo.js'

  let { wx, wy, color, fontSize = 28, initial = '', onCommit, onCancel } = $props()

  let input = $state(null)
  let value = $state(initial)
  let handled = false

  let pos = $derived(worldToScreen($camera, wx, wy))
  let scaledFont = $derived(fontSize * $camera.zoom)

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
    style="color: {color}; caret-color: {color}; font-size: {scaledFont}px;"
    enterkeyhint="done"
    onkeydown={onKey}
    onblur={() => setTimeout(submit, 100)}
  />
</form>

<style>
  .text-edit-overlay {
    position: fixed;
    /* click point = caret/start of text. vertically centered, horizontally
       left-anchored so the first character appears AT the click. */
    transform: translateY(-50%);
    z-index: 200;
    margin: 0;
    padding: 0;
  }
  .text-input {
    background: transparent;
    border: none;
    outline: none;
    padding: 0;
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    text-align: left;
    /* the input grows as you type; no min width so the caret sits right at
       the click point */
    width: auto;
    min-width: 1ch;
  }
  .text-input:focus { outline: none; }
</style>
