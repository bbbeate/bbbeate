<!--
  TextInput — bare html input at a world coord. transparent bg + no border so
  it looks like you're writing directly on the canvas. left-anchored — the
  click point is where the first character starts.
-->
<script>
  import { onMount, tick } from 'svelte'
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
    onCommit?.((value ?? '').trim())
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

  onMount(async () => {
    await tick()
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
    class="text-editor"
    type="text"
    autocomplete="off"
    spellcheck="false"
    style="color: {color}; caret-color: {color}; font-size: {scaledFont}px;"
    enterkeyhint="done"
    onkeydown={onKey}
    onblur={() => setTimeout(submit, 100)}
  />
</form>

<style>
  .text-edit-overlay {
    position: fixed;
    transform: translateY(-50%);
    z-index: 200;
    margin: 0;
    padding: 0;
  }
  .text-editor {
    background: transparent;
    border: none;
    outline: none;
    padding: 0;
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1;
    /* explicit width so the input is actually clickable / focusable.
       caret sits at the left edge = click point; text grows to the right. */
    width: 16em;
    max-width: 80vw;
    text-align: left;
  }
  .text-editor:focus { outline: none; }
</style>
