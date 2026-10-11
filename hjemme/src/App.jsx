import { useState, useEffect } from 'react'
import './App.css'
import { mirekToHex, hexToXy } from './color.js'
import Rooms from './Rooms.jsx'
import HueButton from './HueButton.jsx'
import ColorSliders from './ColorSliders.jsx'
import Dynamic from './Dynamic.jsx'
import { hueApiV2, putLatest, stopDynamic, getDynamicState, fetchRooms } from './hue.js'

const ALL_LIGHTS_GROUP = '3f7d742d-7bbe-4abc-bc4e-593fe15783de'
const NATTLYS = ['d539b9a8-8ece-4a4b-838b-354ae5375b37', '3d005f56-dbae-486a-afaf-feb45b657b2d']

const defaultSettings = {
  on: { mirek: 300, brightness: 100 },
  night: { color: '#ff9933', brightness: 27 },
  orange: { color: '#ff6600', brightness: 100 },
  sparkle: { mirek: 300, brightness: 50 },
  rooms: {},
  dynamic: { colors: ['#ff0066', '#6600ff', '#00ccff'], targets: ['all'], speed: 10, brightness: 70 }
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

  // Create new instance targeting all lights zone
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
      where: [{ group: { rid: ALL_LIGHTS_GROUP, rtype: 'zone' } }]
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


const allLightsPath = `/grouped_light/${ALL_LIGHTS_GROUP}`
const hueCommand = (body) => hueApiV2('PUT', allLightsPath, body)
const lightCommand = (lightId, body) => hueApiV2('PUT', `/light/${lightId}`, body)

const colorBody = s => ({ on: { on: true }, dimming: { brightness: s.brightness }, color: { xy: hexToXy(s.color) } })
const ambientBody = s => ({ on: { on: true }, dimming: { brightness: s.brightness }, color_temperature: { mirek: s.mirek } })
const modeBodies = { on: ambientBody, night: colorBody, orange: colorBody, sparkle: ambientBody }
const LIVE_TRANSITION = { duration: 100 }

const showSolopp = new URLSearchParams(window.location.search).get('solopp') === 'true'
const tabs = showSolopp ? ['alt', 'rom', 'dynamisk'] : ['alt', 'rom']

function App() {
  const [modal, setModal] = useState(null)
  const [settings, setSettings] = useState(defaultSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [tab, setTab] = useState('alt')
  const [dynamic, setDynamic] = useState({ running: false, targets: [] })
  const [rooms, setRooms] = useState(null)
  const [wakeState, setWakeState] = useState({ enabled: false, time: '07:00', duration: 27, instanceId: null, loading: true })

  useEffect(() => {
    loadSettingsFromApi().then(data => {
      setSettings(data)
      setSettingsLoaded(true)
    })
  }, [])

  useEffect(() => {
    getDynamicState().then(setDynamic)
  }, [])

  useEffect(() => {
    if (tab !== 'alt') fetchRooms().then(setRooms)
  }, [tab])

  const patchRoom = (roomId, patch) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...patch } : r))
  }

  useEffect(() => {
    if (settingsLoaded) saveSettingsToApi(settings)
  }, [settings, settingsLoaded])

  useEffect(() => {
    if (!showSolopp) return
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

  const releaseDynamic = async (groupRid) => {
    if (!dynamic.running) return
    const overlaps = !groupRid || dynamic.targets.includes(groupRid) || dynamic.targets.includes(ALL_LIGHTS_GROUP)
    if (!overlaps) return
    setDynamic({ running: false, targets: [] })
    await stopDynamic()
  }

  const allOff = async () => {
    await releaseDynamic()
    await hueCommand({ on: { on: false } })
  }

  const applyMode = async (mode) => {
    const s = settings[mode]
    await releaseDynamic()
    if (mode === 'sparkle') {
      await hueCommand({ on: { on: false } })
      await Promise.all(NATTLYS.map(id => lightCommand(id, ambientBody(s))))
    } else {
      await hueCommand(modeBodies[mode](s))
    }
  }

  const updateMode = async (mode, value) => {
    updateSetting(mode, value)
    await releaseDynamic()
    const body = { ...modeBodies[mode](value), dynamics: LIVE_TRANSITION }
    if (mode === 'sparkle') NATTLYS.forEach(id => putLatest(`/light/${id}`, body))
    else putLatest(allLightsPath, body)
  }

  return (
    <div className="app">
      {tab === 'alt' && <div className="container">
      <HueButton className="off" emoji="🌑" onPress={allOff} onOptions={() => openModal('off')} />
      <HueButton className="on" emoji="🌕" onPress={() => applyMode('on')} onOptions={() => openModal('on')} style={{ backgroundColor: mirekToHex(settings.on.mirek) }} />
      <HueButton className="night" emoji="🌛" onPress={() => applyMode('night')} onOptions={() => openModal('night')} style={{ backgroundColor: settings.night.color }} />
      <HueButton className="orange" emoji="" onPress={() => applyMode('orange')} onOptions={() => openModal('orange')} style={{ backgroundColor: settings.orange.color }} />
      {showSolopp && <HueButton className="sparkle" emoji="✨" onPress={() => applyMode('sparkle')} onOptions={() => openModal('sparkle')} style={{ backgroundColor: mirekToHex(settings.sparkle.mirek) }} />}
      {showSolopp && <HueButton
        className="wake"
        emoji={wakeState.enabled ? wakeState.time : ''}
        onPress={() => openModal('wake')}
        onOptions={() => openModal('wake')}
        style={{ backgroundImage: 'url(/hjemme/solopp.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />}
      </div>}

      {tab === 'rom' && (
        <Rooms
          rooms={rooms}
          onRoomChange={patchRoom}
          roomSettings={settings.rooms}
          onRoomSettingChange={(roomId, value) => updateSetting('rooms', { ...settings.rooms, [roomId]: value })}
          releaseDynamic={releaseDynamic}
        />
      )}

      {tab === 'dynamisk' && (
        <Dynamic
          config={settings.dynamic}
          onConfigChange={config => updateSetting('dynamic', config)}
          running={dynamic.running}
          onRunningChange={setDynamic}
          rooms={rooms}
          allLightsGroup={ALL_LIGHTS_GROUP}
        />
      )}

      <nav className="tabs">
        {tabs.map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>

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
                    onChange={e => updateMode('on', { ...settings.on, mirek: parseInt(e.target.value) })}
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
                    onChange={e => updateMode('on', { ...settings.on, brightness: parseInt(e.target.value) })}
                  />
                  <span className="value">{settings.on.brightness}%</span>
                </label>
              </>
            )}

            {modal === 'night' && (
              <>
                <h2>🌛</h2>
                <ColorSliders value={settings.night.color} onChange={color => updateMode('night', { ...settings.night, color })} />
                <label className="setting-row">
                  <span>styrke</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.night.brightness}
                    onChange={e => updateMode('night', { ...settings.night, brightness: parseInt(e.target.value) })}
                  />
                  <span className="value">{settings.night.brightness}%</span>
                </label>
              </>
            )}

            {modal === 'orange' && (
              <>
                <h2></h2>
                <ColorSliders value={settings.orange.color} onChange={color => updateMode('orange', { ...settings.orange, color })} />
                <label className="setting-row">
                  <span>styrke</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.orange.brightness}
                    onChange={e => updateMode('orange', { ...settings.orange, brightness: parseInt(e.target.value) })}
                  />
                  <span className="value">{settings.orange.brightness}%</span>
                </label>
              </>
            )}

            {modal === 'sparkle' && (
              <>
                <h2>✨</h2>
                <label className="setting-row">
                  <span>ambient</span>
                  <input
                    type="range"
                    min="153"
                    max="500"
                    value={settings.sparkle.mirek}
                    onChange={e => updateMode('sparkle', { ...settings.sparkle, mirek: parseInt(e.target.value) })}
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
                    value={settings.sparkle.brightness}
                    onChange={e => updateMode('sparkle', { ...settings.sparkle, brightness: parseInt(e.target.value) })}
                  />
                  <span className="value">{settings.sparkle.brightness}%</span>
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
