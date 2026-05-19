<!--
  App — root layout. mounts canvas + all chrome. wires up persistence and
  shared-canvas load on mount. on first load (no local drafts and no local
  camera state), auto-fits the camera to show whatever is saved.
-->
<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import Canvas from './components/Canvas.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import Menu from './components/Menu.svelte'
  import Discoball from './components/Discoball.svelte'
  import ColorPicker from './components/ColorPicker.svelte'
  import SaveDialog from './components/SaveDialog.svelte'
  import { load, startAutoSave, flush } from './lib/persistence.js'
  import { savedBatches, bgColor, strokes } from './lib/paint-store.js'
  import { loadCanvas } from './lib/gist.js'
  import { fitAll } from './lib/fit.js'

  function onKey(e) {
    const t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault()
      fitAll()
    }
  }

  onMount(() => {
    load()
    const stopAutoSave = startAutoSave()
    const onUnload = () => flush()
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('keydown', onKey)

    // pull the shared canvas (everyone's saved batches). non-blocking — if it
    // fails (offline, gist down), we still render local drafts.
    loadCanvas()
      .then((canvas) => {
        savedBatches.set(canvas.batches)
        const last = canvas.batches[canvas.batches.length - 1]
        if (last?.bgColor) bgColor.set(last.bgColor)
        // always auto-fit on load if there are no local drafts (i.e. you're
        // not in the middle of something). frames whatever's on the canvas
        // so it's visible without panning around.
        if (get(strokes).length === 0) fitAll()
      })
      .catch((e) => console.warn('shared canvas load failed:', e))

    return () => {
      stopAutoSave()
      window.removeEventListener('beforeunload', onUnload)
      window.removeEventListener('keydown', onKey)
    }
  })
</script>

<Canvas />
<Toolbar />
<Menu />
<Discoball />
<ColorPicker />
<SaveDialog />
