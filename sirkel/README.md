# sirkel

Zero-data-backend, local-first, end-to-end-encrypted text feed for a small group of friends. Posts live only in each device's IndexedDB and sync peer-to-peer over encrypted WebRTC. No central data store.

## Stack

vite (vanilla ts) · yjs + y-indexeddb (local persistence) · y-webrtc (E2EE p2p).

## Run

```
cd sirkel && pnpm install && pnpm dev
```

Open two browser tabs — they peer via BroadcastChannel and sync instantly, no signaling server needed for same-machine testing.

## How it works

- **Room + key:** access is `/#room=<uuid>&key=<secret>`. The key encrypts all peer traffic (y-webrtc password). No key in the URL → a keyhole gate prompts for room + secret, then writes the hash so the link is shareable.
- **Threaded feed:** every post/reply is one flat `Y.Array` item `{id, parentId, user, title, text, ts}`; the tree is built from `parentId`, so replies nest infinitely. **Append-only** — nothing can be deleted from the shared feed.
- **Drill-in navigation:** the feed lists top-level posts collapsed to a header (`date: user` left, `title` right). Tap a post to open it — it becomes the single boxed node at top with its replies flat below; tap a reply to drill deeper, tap the top box to go back up. Reply with the sticky input at the bottom.
- **Unread dots:** a `●` marks posts/replies you haven't opened yet (tracked per-room in `localStorage`).
- **Appearance (device-local):** `tekst`/`bakgrunn` colors, a font picker (`ttt`), and a size stepper (`Tt`, 3–27). Saved to `localStorage`; color defaults from `shared/colors.css`.
- **Download / forget:** `last ned` exports the whole thread as an indented `.txt`; `slett min kopi` wipes this room's IndexedDB on your own device only (rejoining re-syncs from peers who still have it).
- **Peers:** the header shows your name (click to change) and how many friends are connected (y-webrtc awareness).

## Signaling (cross-device)

y-webrtc needs a signaling server to introduce peers across devices — it only relays connection metadata, never your posts or key (those stay E2EE). Same-machine tabs work without it.

Set the signaling URL via root `.env`:

```
VITE_SIGNALING_URL=wss://your-worker.example.workers.dev
```

Falls back to a public y-webrtc signaling server when unset. Comma-separate for multiple.

## Deploy

Served at `bbbeate.space/sirkel/`. On merge to main the workflow builds `sirkel/` into `combined_dist/sirkel/`.
