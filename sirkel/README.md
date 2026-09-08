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
- **Feed:** posts (`author · date`, expand to read) are a synced `Y.Array`. Delete your own posts.
- **Colors:** `tekst` and `bakgrunn` color inputs restyle your own view (device-local, saved to `localStorage`). Defaults come from `shared/colors.css`.
- **Peers:** the header shows how many friends are connected (via y-webrtc awareness).

## Signaling (cross-device)

y-webrtc needs a signaling server to introduce peers across devices — it only relays connection metadata, never your posts or key (those stay E2EE). Same-machine tabs work without it.

Set the signaling URL via root `.env`:

```
VITE_SIGNALING_URL=wss://your-worker.example.workers.dev
```

Falls back to a public y-webrtc signaling server when unset. Comma-separate for multiple.

## Deploy

Served at `bbbeate.space/sirkel/`. On merge to main the workflow builds `sirkel/` into `combined_dist/sirkel/`.
