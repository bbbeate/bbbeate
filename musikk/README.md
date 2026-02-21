# musikk

spotify library with audio features from reccobeats. query by bpm, energy, danceability etc.

## setup

1. create spotify app at https://developer.spotify.com/dashboard
2. set redirect uri to `http://localhost:1670/callback`
3. export credentials:
```bash
export SPOTIFY_CLIENT_ID=xxx
export SPOTIFY_CLIENT_SECRET=xxx
```

## frontend dev

```bash
cd web && pnpm dev      # runs on :1671, proxies api to :1670
cd web && pnpm build    # builds to static/
```

## commands

```bash
# authenticate with spotify
cargo run -- auth

# sync library (first run fetches all tracks + audio features)
cargo run -- sync

# check stats
cargo run -- stats

# start server
cargo run -- serve

# dry run sync
cargo run -- sync --dry-run
```

## api

```
GET /api/tracks?tempo_min=120&tempo_max=130&energy_min=0.7&sort=danceability&limit=100
GET /api/tracks/:spotify_id
GET /api/stats
POST /api/sync
```

## pi deployment

```bash
# build for pi
rustup target add armv7-unknown-linux-gnueabihf
cargo build --release --target armv7-unknown-linux-gnueabihf

# copy binary
scp target/armv7-unknown-linux-gnueabihf/release/musikk pi:/home/bbbeate/musikk/
```

systemd units in plan for auto-start and nightly sync.
