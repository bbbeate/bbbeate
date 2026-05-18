# space

infinite-zoom paint canvas pwa. svelte + vite.

90s-skin paint toolbar (bg / fg-text / brush / eraser), spinning discoball,
undo, save (coming soon). draws to an svg world with a camera-driven
viewbox, so zoom + pan have no fixed bounds. drawings persist locally.

## dev

```bash
pnpm dev    # :5173
pnpm build
```

## controls

- bottom-left toolbar: pick a tool
- top-left: menu (≡) + undo (↶). menu has redo + save
- top-right: discoball — click for sparkles, or X to exit paint
- no tool selected → drag to pan, pinch/wheel+cmd to zoom
- brush/eraser/fg → single touch acts, two-finger zooms
- double-tap canvas, esc, or X → exit paint
- cmd/ctrl+z undo, cmd/ctrl+shift+z (or ctrl+y) redo

## status

v1 = local only (everything autosaves to localStorage).
save button shows "cummin' soon" — online backend is next.
