import { useState, useRef, useEffect } from 'react'
import './App.css'

const USERNAME = import.meta.env.VITE_HUE_USERNAME
const ALL_LIGHTS_GROUP = '3f7d742d-7bbe-4abc-bc4e-593fe15783de'

const defaultSettings = {
  on: { mirek: 300, brightness: 100 },
  night: { color: '#ff9933', brightness: 27 },
  orange: { color: '#ff6600', brightness: 100 }
}

async function loadSettingsFromApi() {
  try {
    const res = await fetch('/api/settings')
    const data = await res.json()
    return { ...defaultSettings, ...data }
  } catch {
    return defaultSettings
  }
}

async function saveSettingsToApi(settings) {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
}

const WAKE_NAME = 'hjemme solopp'

async function hueApiV2(method, path, body) {
  const res = await fetch(`/hue-api/clip/v2/resource${path}`, {
    method,
    headers: {
      'hue-application-key': USERNAME,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

async function getWakeInstance() {
  const instances = await hueApiV2('GET', '/behavior_instance')
  return instances.data?.find(i => i.metadata?.name === WAKE_NAME)
}

async function getOrCreateWakeInstance() {
  let instance = await getWakeInstance()
  if (instance) return instance

  // Get the wake_up behavior script
  const scripts = await hueApiV2('GET', '/behavior_script')
  const wakeUpScript = scripts.data?.find(s => s.description?.includes('wake up'))
  if (!wakeUpScript) return null

  // Get room ID from existing wake instances
  const instances = await hueApiV2('GET', '/behavior_instance')
  const wakeInstances = instances.data?.filter(i => i.script_id === wakeUpScript.id)
  const roomId = wakeInstances[0]?.configuration?.where?.[0]?.group?.rid || '967aae17-c8b2-46fe-a63a-253f22532300'

  // Create new instance
  const res = await hueApiV2('POST', '/behavior_instance', {
    type: 'behavior_instance',
    script_id: wakeUpScript.id,
    enabled: false,
    metadata: { name: WAKE_NAME },
    configuration: {
      end_brightness: 100,
      fade_in_duration: { seconds: 27 * 60 },
      style: 'basic',
      when: {
        time_point: {
          type: 'time',
          time: { hour: 7, minute: 0 }
        }
      },
      where: [{ group: { rid: roomId, rtype: 'room' } }]
    }
  })

  if (res.data?.[0]?.rid) {
    return (await hueApiV2('GET', `/behavior_instance/${res.data[0].rid}`)).data?.[0]
  }
  return null
}

async function updateWakeInstance(instanceId, updates) {
  return await hueApiV2('PUT', `/behavior_instance/${instanceId}`, updates)
}

function formatTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const WAKE_PRESETS = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']


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
  const [settings, setSettings] = useState(defaultSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [wakeState, setWakeState] = useState({ enabled: false, time: '07:00', duration: 27, instanceId: null, loading: true })

  useEffect(() => {
    loadSettingsFromApi().then(data => {
      setSettings(data)
      setSettingsLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (settingsLoaded) saveSettingsToApi(settings)
  }, [settings, settingsLoaded])

  useEffect(() => {
    getOrCreateWakeInstance().then(instance => {
      if (instance) {
        const cfg = instance.configuration
        const time = formatTime(cfg.when.time_point.time.hour, cfg.when.time_point.time.minute)
        const duration = Math.round(cfg.fade_in_duration.seconds / 60)
        setWakeState({ enabled: instance.enabled, time, duration, instanceId: instance.id, loading: false })
      } else {
        setWakeState(prev => ({ ...prev, loading: false }))
      }
    })
  }, [])

  const openModal = (type) => setModal(type)
  const closeModal = () => setModal(null)

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const setWakeTime = async (time) => {
    if (!wakeState.instanceId) return

    if (time === null) {
      // Disable the routine
      await updateWakeInstance(wakeState.instanceId, { enabled: false })
      setWakeState(prev => ({ ...prev, enabled: false }))
      return
    }

    // Fetch current instance to get full config
    const current = await hueApiV2('GET', `/behavior_instance/${wakeState.instanceId}`)
    const cfg = current.data?.[0]?.configuration
    if (!cfg) return

    const [hours, minutes] = time.split(':').map(Number)
    cfg.when.time_point.time = { hour: hours, minute: minutes }

    await updateWakeInstance(wakeState.instanceId, { enabled: true, configuration: cfg })
    setWakeState(prev => ({ ...prev, enabled: true, time }))
  }

  const updateWakeDuration = async (duration) => {
    if (!wakeState.instanceId) return

    // Fetch current instance to get full config
    const current = await hueApiV2('GET', `/behavior_instance/${wakeState.instanceId}`)
    const cfg = current.data?.[0]?.configuration
    if (!cfg) return

    cfg.fade_in_duration = { seconds: duration * 60 }

    await updateWakeInstance(wakeState.instanceId, { configuration: cfg })
  }

  const getActivePreset = () => {
    if (!wakeState.enabled) return null
    if (WAKE_PRESETS.includes(wakeState.time)) return wakeState.time
    return 'custom'
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
      <HueButton
        className="wake"
        emoji={wakeState.enabled ? wakeState.time : ''}
        onPress={() => openModal('wake')}
        onOptions={() => openModal('wake')}
        style={{ backgroundImage: 'url(/hjemme/solopp.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

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

            {modal === 'wake' && (
              <>
                <h2>solopp</h2>
                {wakeState.loading ? (
                  <p>laster...</p>
                ) : (
                  <>
                    <div className="wake-presets">
                      {WAKE_PRESETS.map(time => (
                        <button
                          key={time}
                          className={`wake-preset ${getActivePreset() === time ? 'active' : ''}`}
                          onClick={() => setWakeTime(getActivePreset() === time ? null : time)}
                        >
                          {time}
                        </button>
                      ))}
                      <button
                        className={`wake-preset custom ${getActivePreset() === 'custom' ? 'active' : ''}`}
                        onClick={() => setWakeTime(getActivePreset() === 'custom' ? null : wakeState.time)}
                      >
                        {getActivePreset() === 'custom' ? wakeState.time : 'egendefinert'}
                      </button>
                    </div>
                    {getActivePreset() === 'custom' && (
                      <label className="setting-row">
                        <span>tid</span>
                        <input
                          type="time"
                          value={wakeState.time}
                          onChange={e => setWakeTime(e.target.value)}
                        />
                      </label>
                    )}
                    <label className="setting-row">
                      <span>varighet</span>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={wakeState.duration}
                        onChange={e => setWakeState(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        onMouseUp={e => updateWakeDuration(parseInt(e.target.value))}
                        onTouchEnd={e => updateWakeDuration(parseInt(e.target.value))}
                      />
                      <span className="value">{wakeState.duration} min</span>
                    </label>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
