import { useState, useRef, useEffect } from 'react'
import './App.css'

const USERNAME = import.meta.env.VITE_HUE_USERNAME
const ALL_LIGHTS_GROUP = '3f7d742d-7bbe-4abc-bc4e-593fe15783de'

const STORAGE_KEY = 'hjemme-settings'

const defaultSettings = {
  on: { mirek: 300, brightness: 100 },
  night: { color: '#ff9933', brightness: 27 },
  orange: { color: '#ff6600', brightness: 100 }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

async function hueCommand(body) {
  await fetch(`/hue-api/clip/v2/resource/grouped_light/${ALL_LIGHTS_GROUP}`, {
    method: 'PUT',
    headers: {
      'hue-application-key': USERNAME,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

const allOff = () => hueCommand({ on: { on: false } })

function mirekToHex(mirek) {
  const t = (mirek - 153) / (500 - 153)
  const r = 255
  const g = Math.round(180 + (255 - 180) * (1 - t))
  const b = Math.round(100 + (200 - 100) * (1 - t))
  return `rgb(${r}, ${g}, ${b})`
}

function hexToXy(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const rr = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  const gg = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  const bb = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  const X = rr * 0.4124 + gg * 0.3576 + bb * 0.1805
  const Y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722
  const Z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505

  const sum = X + Y + Z
  return sum === 0 ? { x: 0, y: 0 } : { x: X / sum, y: Y / sum }
}

function haptic() {
  if (navigator.vibrate) navigator.vibrate(50)
}

function HueButton({ className, emoji, onPress, onOptions, style }) {
  const timeout = useRef(null)
  const didLongPress = useRef(false)
  const clickCount = useRef(0)
  const clickTimeout = useRef(null)

  // Touch: long press = options, tap = action
  const handleTouchStart = () => {
    didLongPress.current = false
    timeout.current = setTimeout(() => {
      didLongPress.current = true
      haptic()
      onOptions()
    }, 500)
  }

  const handleTouchEnd = (e) => {
    e.preventDefault() // Prevent click from firing
    clearTimeout(timeout.current)
    if (!didLongPress.current) onPress()
  }

  const handleTouchCancel = () => clearTimeout(timeout.current)

  // Mouse: double click = options, single click = action
  const handleClick = () => {
    clickCount.current++
    if (clickCount.current === 1) {
      clickTimeout.current = setTimeout(() => {
        if (clickCount.current === 1) onPress()
        clickCount.current = 0
      }, 300)
    } else if (clickCount.current === 2) {
      clearTimeout(clickTimeout.current)
      clickCount.current = 0
      onOptions()
    }
  }

  return (
    <button
      className={`hue-button ${className}`}
      style={style}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {emoji}
    </button>
  )
}

function App() {
  const [modal, setModal] = useState(null)
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const openModal = (type) => setModal(type)
  const closeModal = () => setModal(null)

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const allOn = () => hueCommand({
    on: { on: true },
    dimming: { brightness: settings.on.brightness },
    color_temperature: { mirek: settings.on.mirek }
  })

  const nightMode = () => {
    const xy = hexToXy(settings.night.color)
    hueCommand({
      on: { on: true },
      dimming: { brightness: settings.night.brightness },
      color: { xy }
    })
  }

  const orangeMode = () => {
    const xy = hexToXy(settings.orange.color)
    hueCommand({
      on: { on: true },
      dimming: { brightness: settings.orange.brightness },
      color: { xy }
    })
  }

  return (
    <div className="container">
      <HueButton className="off" emoji="🌑" onPress={allOff} onOptions={() => openModal('off')} />
      <HueButton className="on" emoji="🌕" onPress={allOn} onOptions={() => openModal('on')} style={{ backgroundColor: mirekToHex(settings.on.mirek) }} />
      <HueButton className="night" emoji="🌛" onPress={nightMode} onOptions={() => openModal('night')} style={{ backgroundColor: settings.night.color }} />
      <HueButton className="orange" emoji="" onPress={orangeMode} onOptions={() => openModal('orange')} style={{ backgroundColor: settings.orange.color }} />

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>

            {modal === 'off' && (
              <p className="nei-text">nei betyr nei</p>
            )}

            {modal === 'on' && (
              <>
                <h2>🌕</h2>
                <label className="setting-row">
                  <span>ambient</span>
                  <input
                    type="range"
                    min="153"
                    max="500"
                    value={settings.on.mirek}
                    onChange={e => updateSetting('on', { ...settings.on, mirek: parseInt(e.target.value) })}
                  />
                </label>
                <div className="temp-labels">
                  <span>kald</span>
                  <span>varm</span>
                </div>
                <label className="setting-row">
                  <span>styrke</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.on.brightness}
                    onChange={e => updateSetting('on', { ...settings.on, brightness: parseInt(e.target.value) })}
                  />
                  <span className="value">{settings.on.brightness}%</span>
                </label>
              </>
            )}

            {modal === 'night' && (
              <>
                <h2>🌛</h2>
                <label className="setting-row">
                  <span>farge</span>
                  <input
                    type="color"
                    value={settings.night.color}
                    onChange={e => updateSetting('night', { ...settings.night, color: e.target.value })}
                  />
                </label>
                <label className="setting-row">
                  <span>styrke</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.night.brightness}
                    onChange={e => updateSetting('night', { ...settings.night, brightness: parseInt(e.target.value) })}
                  />
                  <span className="value">{settings.night.brightness}%</span>
                </label>
              </>
            )}

            {modal === 'orange' && (
              <>
                <h2></h2>
                <label className="setting-row">
                  <span>farge</span>
                  <input
                    type="color"
                    value={settings.orange.color}
                    onChange={e => updateSetting('orange', { ...settings.orange, color: e.target.value })}
                  />
                </label>
                <label className="setting-row">
                  <span>styrke</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.orange.brightness}
                    onChange={e => updateSetting('orange', { ...settings.orange, brightness: parseInt(e.target.value) })}
                  />
                  <span className="value">{settings.orange.brightness}%</span>
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
