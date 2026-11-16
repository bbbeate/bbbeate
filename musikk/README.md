# musikk

spotify library with audio features from reccobeats. query by bpm, energy, danceability etc.

also keeps the "bbbeates top 50" playlist growing: every night it adds any track from your 1 year top 50 (`long_term`) that isn't in the playlist yet. it never removes tracks, so the playlist holds every song that has ever been in your top 50.

## setup

1. create spotify app at https://developer.spotify.com/dashboard
2. set redirect uri to `https://musikk.bbbeate.space/callback`
3. export credentials (on the pi they live in `~/bbbeate/.env`):
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

# add new top 50 tracks to the playlist (--dry-run lists them without adding)
cargo run -- top50
```

`auth` prints a spotify url and waits on :1670 for the callback via `musikk.bbbeate.space`, so stop `musikk.service` while you run it. you only have to redo it if spotify revokes the token (password change, app access removed, or new scopes added). rotated refresh tokens get saved automatically.

the playlist is found by name the first time and its id is kept in the `config` table (`top50_playlist_id`), so renaming it later is fine.

## api

```
GET /api/tracks?tempo_min=120&tempo_max=130&energy_min=0.7&sort=danceability&limit=100
GET /api/tracks/:spotify_id
GET /api/stats
POST /api/sync
```

## pi deployment

the pi (aarch64, `ssh pi`) builds from its own checkout at `~/bbbeate`:

```bash
ssh pi
cd ~/bbbeate && git pull && cd musikk && cargo build --release
sudo systemctl restart musikk
```

- `musikk.service` (see `musikk.service`) runs `musikk serve` on :1670, cloudflared tunnels `musikk.bbbeate.space` to it
- nightly cron (`crontab -e`). cron uses `/bin/sh` (dash), so load the env with `.` and `set -a`, not `source`:

```
0 3 * * * cd /home/bbbeate/bbbeate/musikk && set -a && . /home/bbbeate/bbbeate/.env && set +a && ./target/release/musikk sync --backfill >> sync.log 2>&1; ./target/release/musikk top50 >> sync.log 2>&1
```

- logs: `~/bbbeate/musikk/sync.log`, service logs via `journalctl -u musikk`
