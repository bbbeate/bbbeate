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

function App() {
  return (
    <div className="container">
      <button className="hue-button off" onClick={allOff}>🌑</button>
      <button className="hue-button on" onClick={allOn}>🌕</button>
      <button className="hue-button night" onClick={nightMode}>🌛</button>
      <button className="hue-button orange" onClick={orangeMode}></button>
    </div>
  )
}

export default App
