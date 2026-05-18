<!--
  UndoButton — sits next to the menu (top-left). disabled state when no
  undoable ops on the stack. desktop also has cmd/ctrl+z, handled by Canvas.
-->
<script>
  import { undo, canUndo } from '../lib/undo.js'
</script>

<button
  type="button"
  class="kk-btn undo"
  aria-label="angre"
  disabled={!$canUndo}
  onclick={undo}
>
  <img src="/undo.png" alt="" />
</button>

<style>
  .kk-btn {
    position: fixed;
    top: 0.75rem;
    left: calc(0.75rem + 44px + 6px); /* sits right of the ≡ button */
    z-index: 100;
    width: 44px;
    height: 44px;
    background: #c0c0c0;
    border: 2px outset #c0c0c0;
    box-shadow: inset 1px 1px 0 #fff;
    color: #000;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .kk-btn:active { border-style: inset; box-shadow: inset 1px 1px 0 #808080; }
  .kk-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .kk-btn img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: invert(1) brightness(0);
  }
  @media (max-width: 640px) {
    .kk-btn {
      top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
      left: calc(env(safe-area-inset-left, 0px) + 0.5rem + 38px + 6px);
      width: 38px;
      height: 38px;
    }
  }
</style>
