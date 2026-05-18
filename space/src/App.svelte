<!--
  App — root layout. mounts canvas + all chrome. wires up persistence and
  shared-canvas load on mount.
-->
<script>
  import { onMount } from 'svelte'
  import Canvas from './components/Canvas.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import Menu from './components/Menu.svelte'
  import Discoball from './components/Discoball.svelte'
  import ColorPicker from './components/ColorPicker.svelte'
  import SaveDialog from './components/SaveDialog.svelte'
  import { load, startAutoSave, flush } from './lib/persistence.js'
  import { savedBatches, bgColor } from './lib/paint-store.js'
  import { loadCanvas } from './lib/gist.js'

  onMount(() => {
    load()
    const stopAutoSave = startAutoSave()
    const onUnload = () => flush()
    window.addEventListener('beforeunload', onUnload)

    // pull the shared canvas (everyone's saved batches). non-blocking — if it
    // fails (offline, gist down), we still render your local drafts.
    loadCanvas()
      .then((canvas) => {
        savedBatches.set(canvas.batches)
        // bg = whichever bg was set by the most recent save. when this user
        // saves, their bg becomes the next initial for everyone.
        const last = canvas.batches[canvas.batches.length - 1]
        if (last?.bgColor) bgColor.set(last.bgColor)
      })
      .catch((e) => console.warn('shared canvas load failed:', e))

    return () => {
      stopAutoSave()
      window.removeEventListener('beforeunload', onUnload)
    }
  })
</script>

<Canvas />
<Toolbar />
<Menu />
<Discoball />
<ColorPicker />
<SaveDialog />
