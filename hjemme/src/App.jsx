import { useState, useRef } from 'react'
import './App.css'

const USERNAME = import.meta.env.VITE_HUE_USERNAME
const ALL_LIGHTS_GROUP = '3f7d742d-7bbe-4abc-bc4e-593fe15783de'

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

const allOn = () => hueCommand({
  on: { on: true },
  dimming: { brightness: 100 },
  color_temperature: { mirek: 454 }
})

const nightMode = () => hueCommand({
  on: { on: true },
  dimming: { brightness: 27 },
  color_temperature: { mirek: 454 }
})

const orangeMode = () => hueCommand({
  on: { on: true },
  dimming: { brightness: 100 },
  color: { xy: { x: 0.6, y: 0.38 } }
})

function haptic() {
  if (navigator.vibrate) navigator.vibrate(50)
}

function useLongPress(onPress, onLongPress, delay = 500) {
  const timeout = useRef(null)
  const didLongPress = useRef(false)

  const start = () => {
    didLongPress.current = false
    timeout.current = setTimeout(() => {
      didLongPress.current = true
      haptic()
      onLongPress()
    }, delay)
  }

  const end = () => {
    clearTimeout(timeout.current)
    if (!didLongPress.current) onPress()
  }

  const cancel = () => clearTimeout(timeout.current)

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: end,
    onTouchCancel: cancel
  }
}

function useDoubleClick(onSingleClick, onDoubleClick, delay = 300) {
  const clickCount = useRef(0)
  const timeout = useRef(null)

  const handleClick = () => {
    clickCount.current++
    if (clickCount.current === 1) {
      timeout.current = setTimeout(() => {
        if (clickCount.current === 1) onSingleClick()
        clickCount.current = 0
      }, delay)
    } else if (clickCount.current === 2) {
      clearTimeout(timeout.current)
      clickCount.current = 0
      onDoubleClick()
    }
  }

  return { onClick: handleClick }
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function HueButton({ className, emoji, onPress, onOptions }) {
  const longPressHandlers = useLongPress(onPress, onOptions)
  const doubleClickHandlers = useDoubleClick(onPress, onOptions)

  const handlers = isTouchDevice() ? longPressHandlers : doubleClickHandlers

  return (
    <button className={`hue-button ${className}`} {...handlers}>
      {emoji}
    </button>
  )
}

function App() {
  const [modal, setModal] = useState(null)

  const openModal = (type) => setModal(type)
  const closeModal = () => setModal(null)

  return (
    <div className="container">
      <HueButton className="off" emoji="🌑" onPress={allOff} onOptions={() => openModal('off')} />
      <HueButton className="on" emoji="🌕" onPress={allOn} onOptions={() => openModal('on')} />
      <HueButton className="night" emoji="🌛" onPress={nightMode} onOptions={() => openModal('night')} />
      <HueButton className="orange" emoji="" onPress={orangeMode} onOptions={() => openModal('orange')} />

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'off' ? 'nei betyr nei' : `${modal} settings`}</h2>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
