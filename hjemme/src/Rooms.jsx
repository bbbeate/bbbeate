import { useState } from 'react'
import { hexToXy, mirekToHex } from './color.js'
import { putLatest } from './hue.js'
import HueButton from './HueButton.jsx'
import ColorSliders from './ColorSliders.jsx'

const DEFAULT_SETTING = { mode: 'ambient', color: '#ffcc66', mirek: 300 }
const OFF_COLOR = '#1a1a1a'
const LIVE_TRANSITION = { duration: 100 }

function parseRoomSetting(raw) {
  if (raw === undefined) return DEFAULT_SETTING
  if (typeof raw === 'string') return { ...DEFAULT_SETTING, mode: 'color', color: raw }
  return { ...DEFAULT_SETTING, ...raw }
}

const lightBody = setting => setting.mode === 'ambient'
  ? { color_temperature: { mirek: setting.mirek } }
  : { color: { xy: hexToXy(setting.color) } }

const displayColor = setting => setting.mode === 'ambient' ? mirekToHex(setting.mirek) : setting.color

export default function Rooms({ rooms, roomSettings, onRoomChange, onRoomSettingChange, releaseDynamic }) {
  const [openRoomId, setOpenRoomId] = useState(null)

  if (!rooms) return <p className="loading">laster...</p>

  const send = async (room, patch, body) => {
    onRoomChange(room.id, patch)
    await releaseDynamic(room.groupRid)
    putLatest(`/grouped_light/${room.groupRid}`, { ...body, dynamics: LIVE_TRANSITION })
  }

  const settingOf = room => parseRoomSetting(roomSettings[room.id])

  const updateLight = (room, patch) => {
    const setting = { ...settingOf(room), ...patch }
    onRoomSettingChange(room.id, setting)
    send(room, { on: true }, { on: { on: true }, ...lightBody(setting) })
  }

  const openRoom = rooms.find(r => r.id === openRoomId)
  const openSetting = openRoom && settingOf(openRoom)
  const close = () => setOpenRoomId(null)

  return (
    <div className="container">
      {rooms.map(room => (
        <HueButton
          key={room.id}
          className="room-box"
          emoji={room.name}
          onPress={() => send(room, { on: !room.on }, { on: { on: !room.on } })}
          onOptions={() => setOpenRoomId(room.id)}
          style={{
            backgroundColor: room.on ? displayColor(settingOf(room)) : OFF_COLOR,
            color: room.on ? OFF_COLOR : displayColor(settingOf(room))
          }}
        />
      ))}

      {openRoom && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={close}>×</button>
            <h2>{openRoom.name}</h2>
            <div className="mode-switch">
              {[['ambient', 'ambient'], ['color', 'farge']].map(([mode, label]) => (
                <button
                  key={mode}
                  className={`chip ${openSetting.mode === mode ? 'active' : ''}`}
                  onClick={() => updateLight(openRoom, { mode })}
                >
                  {label}
                </button>
              ))}
            </div>
            {openSetting.mode === 'ambient' ? (
              <>
                <label className="setting-row">
                  <span>ambient</span>
                  <input
                    type="range"
                    min="153"
                    max="500"
                    value={openSetting.mirek}
                    onChange={e => updateLight(openRoom, { mirek: parseInt(e.target.value) })}
                  />
                </label>
                <div className="temp-labels">
                  <span>kald</span>
                  <span>varm</span>
                </div>
              </>
            ) : (
              <ColorSliders value={openSetting.color} onChange={color => updateLight(openRoom, { color })} />
            )}
            <label className="setting-row">
              <span>styrke</span>
              <input
                type="range"
                min="1"
                max="100"
                value={openRoom.brightness}
                onChange={e => {
                  const brightness = parseInt(e.target.value)
                  send(openRoom, { on: true, brightness }, { on: { on: true }, dimming: { brightness } })
                }}
              />
              <span className="value">{openRoom.brightness}%</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
