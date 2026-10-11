import { useRef } from 'react'

function haptic() {
  if (navigator.vibrate) navigator.vibrate(50)
}

export default function HueButton({ className, emoji, onPress, onOptions, style }) {
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
