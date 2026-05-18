<!--
  SaveDialog — 90s modal: "signér" + name input + lagre/avbryt. on lagre,
  bundles the current draft strokes + bgcolor + timestamp into a batch and
  PATCHes the gist. on success: drafts clear (they're now in savedBatches).
-->
<script>
  import { onMount } from 'svelte'
  import {
    dialogOpen, savingState,
    strokes, savedBatches, bgColor,
    nextId,
  } from '../lib/paint-store.js'
  import { saveBatch } from '../lib/gist.js'
  import { clearHistory } from '../lib/undo.js'

  const MAX_LEN = 160
  const STORAGE_KEY = 'bbbeate-space-signature'

  let signature = $state('')
  let errorMsg = $state('')

  // remember last-used name so you don't retype it every save
  function loadRemembered() {
    try { return localStorage.getItem(STORAGE_KEY) || '' } catch { return '' }
  }
  function rememberName(name) {
    try { localStorage.setItem(STORAGE_KEY, name) } catch {}
  }

  $effect(() => {
    if ($dialogOpen === 'signér') {
      signature = loadRemembered()
      errorMsg = ''
    }
  })

  function close() {
    if ($savingState === 'saving') return
    dialogOpen.set(null)
  }

  async function commit() {
    const name = signature.trim().slice(0, MAX_LEN)
    if (!name) { errorMsg = 'skriv navnet ditt'; return }
    if ($strokes.length === 0) { errorMsg = 'ingenting å lagre'; return }

    savingState.set('saving')
    errorMsg = ''

    const batch = {
      id: nextId(),
      signature: name,
      timestamp: new Date().toISOString(),
      bgColor: $bgColor,
      strokes: $strokes,
    }

    try {
      await saveBatch(batch)
      rememberName(name)
      // success — move drafts into savedBatches, clear drafts + undo history
      savedBatches.update((b) => [...b, batch])
      strokes.set([])
      clearHistory()
      savingState.set('idle')
      dialogOpen.set(null)
    } catch (e) {
      savingState.set('error')
      errorMsg = String(e.message || e)
    }
  }

  function onKey(e) {
    if ($dialogOpen !== 'signér') return
    if (e.key === 'Escape') close()
    if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT') commit()
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
</script>

{#if $dialogOpen === 'signér'}
  <div
    class="overlay"
    role="presentation"
    onpointerdown={(e) => { if (e.target === e.currentTarget) close() }}
  >
    <div class="dialog" role="dialog" aria-label="signér og lagre">
      <div class="titlebar">
        <span class="title">signér og lagre</span>
        <button type="button" class="x" onclick={close} aria-label="lukk">×</button>
      </div>
      <form
        class="body"
        onsubmit={(e) => { e.preventDefault(); commit() }}
      >
        <label class="label" for="sig-input">signér med navnet ditt:</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input
          id="sig-input"
          class="text-input"
          type="text"
          maxlength={MAX_LEN}
          bind:value={signature}
          autocomplete="off"
          spellcheck="false"
          placeholder="navn"
          autofocus
          disabled={$savingState === 'saving'}
        />
        <div class="meta">
          {signature.length} / {MAX_LEN}
        </div>
        {#if errorMsg}
          <div class="error">{errorMsg}</div>
        {/if}
        <div class="actions">
          <button type="button" class="btn" onclick={close} disabled={$savingState === 'saving'}>
            avbryt
          </button>
          <button type="submit" class="btn btn-primary" disabled={$savingState === 'saving'}>
            {$savingState === 'saving' ? 'lagrer…' : 'lagre'}
          </button>
        </div>
      </form>
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
    width: 340px;
    max-width: calc(100vw - 32px);
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
    flex-direction: column;
    gap: 6px;
    padding: 14px 14px 12px;
    font-size: 13px;
  }
  .label { user-select: text; }
  .text-input {
    background: #fff;
    border: 2px inset #c0c0c0;
    padding: 4px 6px;
    font-family: inherit;
    font-size: 13px;
    color: #000;
    outline: none;
    user-select: text;
  }
  .meta {
    font-size: 10px;
    color: #555;
    text-align: right;
  }
  .error {
    color: #b00020;
    font-size: 12px;
    padding: 2px 0;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding-top: 4px;
  }
  .btn {
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    color: #000;
    cursor: pointer;
    padding: 4px 18px;
    font-family: inherit;
    font-size: 12px;
    min-width: 70px;
  }
  .btn:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-primary { font-weight: 700; }
</style>
