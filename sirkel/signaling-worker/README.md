# sirkel signaling worker

A Cloudflare Worker + Durable Object implementing y-webrtc's signaling protocol. It introduces peers to each other so their browsers can open a direct WebRTC connection. It relays only connection metadata (subscribe / publish / ping over WebSocket per topic) — it never sees your posts or the room key, which are end-to-end encrypted between browsers.

## Protocol

A tiny WebSocket pub/sub, matching `y-webrtc`'s reference server:

- `{type:"subscribe", topics:[...]}` — join topics (peers subscribe to a topic per room).
- `{type:"unsubscribe", topics:[...]}` — leave topics.
- `{type:"publish", topic, ...}` — the whole message is broadcast to every socket subscribed to `topic`.
- `{type:"ping"}` → `{type:"pong"}` — keepalive.

A single global Durable Object holds `topic -> sockets`. Fine for a small friend group.

## Deploy

```
cd sirkel/signaling-worker
npx wrangler login      # once
npx wrangler deploy
```

Wrangler prints the URL, e.g. `https://sirkel-signaling.<your-subdomain>.workers.dev`.

## Wire into the app

Use the `wss://` form of that URL in the repo root `.env`:

```
VITE_SIGNALING_URL=wss://sirkel-signaling.<your-subdomain>.workers.dev
```

Rebuild sirkel. Multiple servers can be comma-separated. Until this is set, the app falls back to a public y-webrtc signaling server (works but can be flaky).

## Verify

```
curl https://sirkel-signaling.<your-subdomain>.workers.dev
# -> "sirkel signaling ok"
```

Then open the app on two different devices with the same `#room=...&key=...` and confirm the peer count rises and posts sync.

## Cost

Durable Objects run on the Workers free plan (SQLite-backed classes). A friend group's traffic stays well within free limits.
