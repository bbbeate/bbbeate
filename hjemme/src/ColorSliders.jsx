import { useState } from 'react'
import { hexToHsv, hsToHex } from './color.js'

const HUE_TRACK = 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'

export default function ColorSliders({ value, onChange }) {
  const [hs, setHs] = useState(() => hexToHsv(value))

  const update = (patch) => {
    const next = { ...hs, ...patch }
    setHs(next)
    onChange(hsToHex(next.h, next.s))
  }

  return (
    <>
      <label className="setting-row">
        <span>farge</span>
        <input
          type="range"
          className="gradient"
          min="0"
          max="359"
          value={hs.h}
          style={{ '--track': HUE_TRACK }}
          onChange={e => update({ h: parseInt(e.target.value) })}
        />
      </label>
      <label className="setting-row">
        <span>metning</span>
        <input
          type="range"
          className="gradient"
          min="0"
          max="100"
          value={hs.s}
          style={{ '--track': `linear-gradient(to right, #fff, ${hsToHex(hs.h, 100)})` }}
          onChange={e => update({ s: parseInt(e.target.value) })}
        />
      </label>
    </>
  )
}
