# hjemme

hue light controller pwa.

## dev

```bash
pnpm dev    # :5173
pnpm build
```

## tabs

- **alt** - all-lights presets. tap = apply, long press / double click = settings (changes apply live)
- **rom** - one box per hue room. tap = on/off, long press = ambient/farge + styrke
- **dynamisk** - (only with `?solopp=true`) cycle 2-5 colors over all lights or chosen rooms. the loop runs in the dev server (`api/hue-dynamic.js`), so it keeps going when the phone sleeps, and stops on server restart or when a manual command touches the same lights
