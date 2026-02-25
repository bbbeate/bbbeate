# bbbeate

personal apps at [bbbeate.no](https://bbbeate.no). pnpm, vite, gh-pages.

## apps

| app | what | stack |
|-----|------|-------|
| [musikk](musikk/) | spotify library browser with bpm/energy filters | rust + react |
| [liste](liste/) | simple list app with gist storage | react |
| [hjemme](hjemme/) | hue light controller | react, pwa |
| [hvaskjer](hvaskjer/) | news aggregator | react |
| [tunes](tunes/) | music discovery | react |
| [spaces](spaces/) | 3d space visualization | vanilla js, pwa |
| [space](space/) | 3d space explorer | vanilla js, pwa |
| [leser](leser/) | pdf text extraction pipeline | python |

## utilities

| dir | what |
|-----|------|
| [cors-proxy](cors-proxy/) | cloudflare worker cors proxy |
| [rass](rass/) | flic button -> hue light controller (pi) |
| [shared](shared/) | shared css and assets |

## dev

```bash
cd <app> && pnpm dev    # js apps
cd <app> && pnpm build
```

deploy: push to main (gh-pages)
