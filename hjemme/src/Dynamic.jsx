import { useState } from 'react'
import { startDynamic, stopDynamic } from './hue.js'
import ColorSliders from './ColorSliders.jsx'

const MIN_COLORS = 2
const MAX_COLORS = 5

function resolveTargets(targets, rooms, allLightsGroup) {
  if (targets.includes('all')) return [allLightsGroup]
  return targets.map(id => {
    const room = rooms.find(r => r.id === id)
    if (!room) throw new Error(`rom finnes ikke lenger: ${id}`)
    return room.groupRid
  })
}

export default function Dynamic({ config, onConfigChange, running, onRunningChange, rooms, allLightsGroup }) {
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(0)

  if (!rooms) return <p className="loading">laster...</p>

  const start = async (c) => {
    try {
      const targets = resolveTargets(c.targets, rooms, allLightsGroup)
      await startDynamic({ colors: c.colors, targets, speed: c.speed, brightness: c.brightness })
      onRunningChange({ running: true, targets })
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  const stop = async () => {
    await stopDynamic()
    onRunningChange({ running: false, targets: [] })
  }

  const update = (patch) => {
    const next = { ...config, ...patch }
    onConfigChange(next)
    if (running) start(next)
  }

  const setColor = (i, color) => update({ colors: config.colors.map((c, j) => j === i ? color : c) })
  const removeColor = (i) => {
    update({ colors: config.colors.filter((_, j) => j !== i) })
    setSelected(0)
  }
  const addColor = () => {
    update({ colors: [...config.colors, '#ffffff'] })
    setSelected(config.colors.length)
  }

  const toggleTarget = (id) => {
    if (id === 'all') return update({ targets: ['all'] })
    const selected = config.targets.filter(t => t !== 'all')
    const next = selected.includes(id) ? selected.filter(t => t !== id) : [...selected, id]
    update({ targets: next.length ? next : ['all'] })
  }

  return (
    <div className="panel">
      <div className="dynamic-colors">
        {config.colors.map((color, i) => (
          <div key={i} className="dynamic-color">
            <button
              className={`swatch ${selected === i ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelected(i)}
            />
            {config.colors.length > MIN_COLORS && <button className="chip" onClick={() => removeColor(i)}>-</button>}
          </div>
        ))}
        {config.colors.length < MAX_COLORS && <button className="chip" onClick={addColor}>+</button>}
      </div>

      <ColorSliders key={selected} value={config.colors[selected]} onChange={color => setColor(selected, color)} />

      <div className="chips">
        {[{ id: 'all', name: 'alle' }, ...rooms].map(room => (
          <button
            key={room.id}
            className={`chip ${config.targets.includes(room.id) ? 'active' : ''}`}
            onClick={() => toggleTarget(room.id)}
          >
            {room.name}
          </button>
        ))}
      </div>

      <label className="setting-row">
        <span>fart</span>
        <input
          type="range"
          min="2"
          max="120"
          value={config.speed}
          onChange={e => update({ speed: parseInt(e.target.value) })}
        />
        <span className="value">{config.speed}s</span>
      </label>

      <label className="setting-row">
        <span>styrke</span>
        <input
          type="range"
          min="1"
          max="100"
          value={config.brightness}
          onChange={e => update({ brightness: parseInt(e.target.value) })}
        />
        <span className="value">{config.brightness}%</span>
      </label>

      <button className={`toggle wide ${running ? 'active' : ''}`} onClick={() => running ? stop() : start(config)}>
        {running ? 'stopp' : 'start'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
