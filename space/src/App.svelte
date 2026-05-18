<!--
  App — root layout. mounts canvas + all chrome. wires up persistence on
  mount.
-->
<script>
  import { onMount } from 'svelte'
  import Canvas from './components/Canvas.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import Menu from './components/Menu.svelte'
  import UndoButton from './components/UndoButton.svelte'
  import Discoball from './components/Discoball.svelte'
  import ColorPicker from './components/ColorPicker.svelte'
  import ComingSoonDialog from './components/ComingSoonDialog.svelte'
  import { load, startAutoSave, flush } from './lib/persistence.js'

  onMount(() => {
    load()
    const stopAutoSave = startAutoSave()
    const onUnload = () => flush()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      stopAutoSave()
      window.removeEventListener('beforeunload', onUnload)
    }
  })
</script>

<Canvas />
<Toolbar />
<Menu />
<UndoButton />
<Discoball />
<ColorPicker />
<ComingSoonDialog />
