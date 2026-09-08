# sirkel — design

Zero-data-backend, local-first, E2EE text feed for me and a few friends. Data lives only in each device's IndexedDB and travels peer-to-peer over encrypted WebRTC. v1 is feed-only.

## Goals

- Post short texts (author + date + body) that sync across friends' devices with no central data store.
- Everything encrypted end-to-end; a shared secret gates the room.
- Each person themes their own view (text + bg color), device-local.
- Dead simple, matches the bbbeate app aesthetic (minimal dark UI).

## Non-goals (v1 / YAGNI)

Calendar, post editing, media, notifications, HSV color picker, synced theming, accounts.

## Stack

- Build: `vite@^6.2.0`, vanilla TypeScript (no UI framework).
- CRDT + local persistence: `yjs@^13.6.23` + `y-indexeddb@^9.0.12`.
- P2P transport + E2EE: `y-webrtc@^10.3.0` (built-in password encryption).
- Styling: plain CSS, `shared/colors.css` vars.
- Node 22 (repo pin `22.22.2`), pnpm. Deployed under `base: '/sirkel/'`.

## Architecture

Single Y.Doc per room. Local IndexedDB persistence + WebRTC provider are the only I/O. UI reads from Yjs via `.observe()` and awareness change events; no app state outside Yjs + a little localStorage for personal prefs.

```
localStorage (device-local)          Y.Doc (room, synced)
  username                             feed: Y.Array<Post>
  textColor, bgColor          awareness: { user } per peer

  IndexeddbPersistence(doc)  <-- offline cache
  WebrtcProvider(doc, {password:key, signaling:[WORKER_URL]})  <-- E2EE p2p
```

### Files

- **`package.json`** — deps above, `dev`/`build`/`preview` scripts. `"name": "sirkel"`, `"type": "module"`.
- **`index.html`** — `<meta name="robots" content="noindex, nofollow">`, viewport + PWA-ish meta matching other apps, the keyhole SVG gate markup, mounts `#app`, loads `/src/main.ts`.
- **`src/sync.ts`** — the only non-trivial module. `connect(room, key)` creates the Y.Doc, wires `IndexeddbPersistence` and `WebrtcProvider` (`{ password: key, signaling: [...] }`), and returns `{ doc, feed, provider, awareness }`. Also exports `Post` shape helpers (`addPost`, `deletePost`) and awareness helpers (`setUser`, `onPeers`). Signaling URL read from an env/const, overridable.
- **`src/main.ts`** — UI wiring only: keyhole gate → username prompt (if unset) → render feed + composer + color controls + peer indicator. Subscribes to `feed.observe` and awareness; re-renders. No business logic beyond calling `sync.ts`.
- **`src/style.css`** — dark, minimal; `:root` reads `--text`/`--bg` overridable by personal prefs; falls back to `shared/colors.css` (`--first` text, `--background` bg).

### vite.config.js

`base: '/sirkel/'`, `envDir: '..'`, `@shared` alias to `../shared` (matches sibling apps), dev `server.port` unique + `strictPort`.

## Data flow

**Room entry**
1. Load. If `location.hash` has `room=<uuid>&key=<secret>` → `connect(room, key)`.
2. Else show centered **keyhole SVG**. Click → `prompt()` for room uuid, then secret → write `location.hash = #room=…&key=…` (link becomes shareable) → `connect`.
3. Missing/blank key → stay on keyhole.

**Profile**
- On first connect, if no `username` in localStorage → `prompt()` once → store → `setUser(name)` into awareness.

**Posting**
- Composer textarea + **post** button → `addPost({id: crypto.randomUUID(), user, text, ts: Date.now()})` pushed to `feed` Y.Array.
- Feed renders newest-first. Each row **collapsed to `author · date`**; click toggles expanded body. Own posts show a small delete affordance → `deletePost(id)` (remove by matching id).

**Colors (device-local, not synced)**
- Two `<input type="color">`: **tekst** and **bakgrunn**. On input → set `--text`/`--bg` on `:root` and persist to localStorage. Loaded on boot; default to `shared/colors.css` values. Applies to whole view including all posts.

**Peers**
- `provider.awareness` change → live list of connected usernames + count shown as the connection indicator.

## Signaling (separate deliverable)

y-webrtc needs a signaling server to introduce peers (metadata only — never sees post data or the room key; those are E2EE end-to-end). Local browser tabs peer without it; cross-device needs one.

- Deliverable: a Cloudflare Worker + Durable Object implementing y-webrtc's tiny ws relay protocol (`subscribe` / `unsubscribe` / `publish` per topic, `ping`/`pong`). Written as its own spec, deployed by the user (mirrors the astro mistral-worker pattern). URL then wired into `sync.ts`.
- Until deployed: fall back to y-webrtc public defaults so local/dev works.

## Deploy wiring (on merge to main)

1. `.github/workflows/deploy.yml` — add install + build steps for `./sirkel`, and `mkdir -p combined_dist/sirkel && cp -r ./sirkel/dist/* combined_dist/sirkel/`.
2. `spaces/public/404.html` — add `/sirkel/` redirect branch.
3. `space/vite.config.js` — SW uses `navigateFallback: null`, so no denylist entry needed; no change required (verify at wire-up time).

## Success criteria

- Two browser tabs (same room+key) post and see each other's texts live, offline-capable via IndexedDB.
- No user data leaves the device except E2EE over WebRTC.
- Wrong/missing key → no access to room content.
- Personal text/bg colors persist per device and restyle the whole view.
- Page is `noindex,nofollow`.
