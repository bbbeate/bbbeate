import { useState, useMemo, useEffect, useCallback } from 'react'
import { getSnapshot, getNatalChart, getSignTransit, ZODIAC_SYMBOLS, ASPECT_DEFS } from './sky.js'
import { getInterpretation, getAspectMeaning } from './interpret.js'
import { getReading, analyzeChart, askChart, askDay } from './horoscope.js'
import DatePicker from './DatePicker.jsx'

const DEG = Math.PI / 180

function ordinal(n) {
  if (n === 1) return 'st'
  if (n === 2) return 'nd'
  if (n === 3) return 'rd'
  return 'th'
}

function loadBirth() {
  try {
    const s = localStorage.getItem('astro-birth')
    if (s) return JSON.parse(s)
  } catch {}
  return null
}

// convert a local datetime string in a given timezone to a UTC Date
function toUTC(datetimeStr, tz) {
  const [datePart, timePart] = datetimeStr.split('T')
  if (!datePart || !timePart) return null
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  const target = Date.UTC(y, m - 1, d, h, min)
  let guess = target
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric',
  })
  // iterate to converge on correct UTC time
  for (let i = 0; i < 2; i++) {
    const parts = fmt.formatToParts(new Date(guess))
    const get = t => parseInt(parts.find(p => p.type === t).value)
    const hr = get('hour') === 24 ? 0 : get('hour')
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hr, get('minute'))
    guess -= (asUtc - target)
  }
  return new Date(guess)
}

const TIMEZONES = [
  'Europe/Oslo', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Europe/Helsinki', 'Europe/Moscow', 'Europe/Istanbul',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
  'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]

function SolarSystem({ snapshot, selected, onSelect }) {
  const cx = 300, cy = 300
  const orbits = {
    Sun: 0, Moon: 30, Mercury: 50, Venus: 75,
    Mars: 120, Jupiter: 155, Saturn: 185,
    Uranus: 215, Neptune: 240, Pluto: 260,
  }

  return (
    <svg viewBox="-20 -20 640 640" className="solar-system">
      <circle cx={cx} cy={cy} r={280} fill="none" stroke="var(--second)" strokeWidth="0.5" />
      {ZODIAC_SYMBOLS.map((sym, i) => {
        const angle = (i * 30 + 15 - 90) * DEG
        return (
          <text key={i} x={cx + 295 * Math.cos(angle)} y={cy + 295 * Math.sin(angle)}
            textAnchor="middle" dominantBaseline="middle" fill="var(--second)" fontSize="14">{sym}</text>
        )
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * DEG
        return <line key={i} x1={cx + 274 * Math.cos(angle)} y1={cy + 274 * Math.sin(angle)}
          x2={cx + 280 * Math.cos(angle)} y2={cy + 280 * Math.sin(angle)} stroke="var(--second)" strokeWidth="0.5" />
      })}
      {Object.entries(orbits).filter(([, r]) => r > 0).map(([name, r]) => (
        <circle key={name} cx={cx} cy={cy} r={r} fill="none" stroke="var(--second)" strokeWidth="0.2" />
      ))}
      {snapshot.bodies.map(body => {
        const r = orbits[body.id] ?? 100
        const angle = (body.lon - 90) * DEG
        const x = r === 0 ? cx : cx + r * Math.cos(angle)
        const y = r === 0 ? cy : cy + r * Math.sin(angle)
        return (
          <g key={body.id} className="planet-click" onClick={() => onSelect(body)}>
            <circle cx={x} cy={y} r={Math.max(body.size, 14)} fill="transparent" />
            <circle cx={x} cy={y} r={body.size / 2} fill={body.color}
              stroke={selected === body.id ? 'var(--first)' : 'none'} strokeWidth="1.5" />
            <text x={x} y={y - body.size / 2 - 4} textAnchor="middle" fill="var(--second)" fontSize="10">{body.symbol}</text>
          </g>
        )
      })}
    </svg>
  )
}

function NatalChart({ chart }) {
  const cx = 300, cy = 300
  const outerR = 270, signR = 240, innerR = 210, planetR = 170, centerR = 80
  const offset = -chart.ascendant + 180

  const toAngle = (lon) => (lon + offset) * DEG
  const toXY = (lon, r) => ({
    x: cx + r * Math.cos(toAngle(lon) - Math.PI / 2),
    y: cy + r * Math.sin(toAngle(lon) - Math.PI / 2),
  })

  const spread = (bodies, minGap = 12) => {
    const sorted = [...bodies].sort((a, b) => a.lon - b.lon)
    const result = sorted.map(b => ({ ...b, displayLon: b.lon }))
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < result.length; i++) {
        const next = result[(i + 1) % result.length]
        let diff = (next.displayLon - result[i].displayLon + 360) % 360
        if (diff < minGap && diff > 0) {
          const nudge = (minGap - diff) / 2
          result[i].displayLon = (result[i].displayLon - nudge + 360) % 360
          next.displayLon = (next.displayLon + nudge) % 360
        }
      }
    }
    return result
  }

  const spreadBodies = spread(chart.bodies)
  const aspectDash = { conjunction: 'none', sextile: '4,3', square: 'none', trine: 'none', opposition: '6,3' }

  return (
    <svg viewBox="0 0 600 600" className="natal-chart">
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="var(--second)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={signR} fill="none" stroke="var(--second)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="var(--second)" strokeWidth="0.3" />
      <circle cx={cx} cy={cy} r={centerR} fill="none" stroke="var(--second)" strokeWidth="0.2" />
      {ZODIAC_SYMBOLS.map((sym, i) => {
        const startLon = i * 30
        const p1 = toXY(startLon, signR)
        const p2 = toXY(startLon, outerR)
        const mid = toXY(startLon + 15, (outerR + signR) / 2)
        return (
          <g key={i}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--second)" strokeWidth="0.3" />
            <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle" fill="var(--second)" fontSize="13">{sym}</text>
          </g>
        )
      })}
      {chart.houses.map((h, i) => {
        const p1 = toXY(h.cusp, centerR)
        const p2 = toXY(h.cusp, signR)
        const isAxis = i === 0 || i === 3 || i === 6 || i === 9
        const labelPos = toXY(h.cusp + 15, (innerR + centerR) / 2)
        return (
          <g key={i}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="var(--second)" strokeWidth={isAxis ? 1 : 0.3} />
            <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fill="var(--second)" fontSize="10">{h.number}</text>
          </g>
        )
      })}
      {[
        { label: 'ASC', lon: chart.ascendant },
        { label: 'DSC', lon: (chart.ascendant + 180) % 360 },
        { label: 'MC', lon: chart.houses[9]?.cusp },
        { label: 'IC', lon: chart.houses[3]?.cusp },
      ].map(({ label, lon }) => {
        const p = toXY(lon, signR + 18)
        return <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="var(--first)" fontSize="9">{label}</text>
      })}
      {chart.aspects.map((asp, i) => {
        const p1 = toXY(asp.body1.lon, planetR - 20)
        const p2 = toXY(asp.body2.lon, planetR - 20)
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="var(--second)" strokeDasharray={aspectDash[asp.name] || 'none'}
          strokeWidth="0.8" />
      })}
      {spreadBodies.map(body => {
        const p = toXY(body.displayLon, planetR)
        const tick1 = toXY(body.lon, innerR)
        const tick2 = toXY(body.lon, innerR - 6)
        return (
          <g key={body.id}>
            <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} stroke={body.color} strokeWidth="1" />
            <circle cx={p.x} cy={p.y} r={body.size / 2 + 1} fill={body.color} />
            <text x={p.x} y={p.y - body.size / 2 - 5} textAnchor="middle" fill="var(--second)" fontSize="10">{body.symbol}</text>
          </g>
        )
      })}
    </svg>
  )
}

function MoonViz({ moon }) {
  const { phase, illumination, phaseName } = moon
  const lit = Math.round(illumination * 100)
  const r = 30, cx = 35, cy = 35
  const k = phase <= 180 ? 1 - (phase / 90) : (phase - 180) / 90 - 1
  const rx = Math.abs(k) * r
  return (
    <div className="moon-viz">
      <svg viewBox="0 0 70 70" width="70" height="70">
        <circle cx={cx} cy={cy} r={r} fill="var(--background)" stroke="var(--second)" strokeWidth="0.5" />
        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 ${phase < 180 ? 1 : 0} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${k > 0 ? 1 : 0} ${cx} ${cy - r}`} fill="var(--first)" />
      </svg>
      <div className="moon-info">
        <span className="moon-name">{phaseName}</span>
        <span className="moon-pct">{lit}% lit</span>
      </div>
    </div>
  )
}

const fmtShort = d => d ? d.toLocaleDateString('nb-NO', { month: 'short', day: 'numeric' }) : '?'
const fmtLong = d => d ? d.toLocaleDateString('nb-NO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '?'

function PlanetDetail({ body, allBodies, natalChart, date, onClose }) {
  if (!body) return null

  // use natal chart's ascendant sign for house-based readings
  const ascSign = natalChart?.ascZodiac?.sign || null
  const interp = getInterpretation(body, ascSign)

  // sign transit timing
  const transit = useMemo(() => getSignTransit(body.id, date || new Date()), [body.id, body.zodiac.sign, date?.getTime()])
  const isMoon = body.id === 'Moon'
  const fmt = isMoon ? fmtLong : fmtShort

  // current aspects
  const aspects = []
  if (allBodies) {
    for (const other of allBodies) {
      if (other.id === body.id) continue
      let diff = Math.abs(body.lon - other.lon)
      if (diff > 180) diff = 360 - diff
      for (const asp of ASPECT_DEFS) {
        if (Math.abs(diff - asp.angle) <= asp.orb) {
          aspects.push({ other, ...asp, exact: Math.abs(diff - asp.angle) })
          break
        }
      }
    }
  }

  // transits to natal planets
  const natalHits = []
  if (natalChart) {
    for (const natal of natalChart.bodies) {
      let diff = Math.abs(body.lon - natal.lon)
      if (diff > 180) diff = 360 - diff
      for (const asp of ASPECT_DEFS) {
        if (Math.abs(diff - asp.angle) <= asp.orb) {
          natalHits.push({ natal, ...asp, exact: Math.abs(diff - asp.angle) })
          break
        }
      }
    }
  }

  return (
    <div className="planet-detail">
      <div className="detail-header">
        <span className="detail-dot" style={{ background: body.color }} />
        <span className="detail-title">{body.symbol} {body.label} in {body.zodiac.symbol} {body.zodiac.sign}</span>
        <button className="detail-close" onClick={onClose}>x</button>
      </div>
      <div className="detail-position">{body.zodiac.degree.toFixed(1)}° {body.zodiac.sign}</div>

      <div className="detail-section">
        <div className="detail-label">{body.label} governs</div>
        <p>{interp.meaning}</p>
      </div>
      <div className="detail-section">
        <div className="detail-label">in {body.zodiac.sign}</div>
        <p>{interp.flavor}</p>
      </div>
      {interp.transit && (
        <div className="detail-section">
          <div className="detail-label">
            {body.label} in {body.zodiac.sign}: {fmt(transit.entered)} – {fmt(transit.exits)}
          </div>
          <p>{interp.transit}</p>
        </div>
      )}
      <div className="detail-section">
        <div className="detail-label">why</div>
        <p>{interp.why}</p>
      </div>
      {interp.forYou && (
        <div className="detail-section detail-foryou">
          <div className="detail-label">your {interp.forYou.house}{ordinal(interp.forYou.house)} house: {interp.forYou.area}</div>
          <p>{interp.forYou.reading}</p>
        </div>
      )}
      {natalHits.length > 0 && (
        <div className="detail-section detail-foryou">
          <div className="detail-label">hitting your natal planets</div>
          {natalHits.map((h, i) => (
            <div key={i} className="detail-aspect">
              <div className="detail-aspect-header">
                <span className="detail-aspect-dot" style={{ background: h.natal.color }} />
                {h.symbol} your natal {h.natal.symbol} {h.natal.label} ({h.natal.zodiac.symbol} {h.natal.zodiac.sign})
                <span className="detail-aspect-orb">{h.exact.toFixed(1)}°</span>
              </div>
              <p>{getAspectMeaning(h.name)}</p>
            </div>
          ))}
        </div>
      )}
      {aspects.length > 0 && (
        <div className="detail-section">
          <div className="detail-label">sky aspects</div>
          {aspects.map((a, i) => (
            <div key={i} className="detail-aspect">
              <div className="detail-aspect-header">
                <span className="detail-aspect-dot" style={{ background: a.other.color }} />
                {a.symbol} {a.name} {a.other.symbol} {a.other.label}
                <span className="detail-aspect-orb">{a.exact.toFixed(1)}°</span>
              </div>
              <p>{getAspectMeaning(a.name)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlanetList({ bodies, showHouse, selected, onSelect }) {
  return (
    <div className="planet-list">
      {bodies.map(b => (
        <div key={b.id} className={`planet-row ${selected === b.id ? 'selected' : ''}`}
          onClick={() => onSelect(b)}>
          <span className="planet-dot" style={{ background: b.color }} />
          <span className="planet-name">{b.symbol} {b.label}</span>
          <span className="planet-sign">{b.zodiac.symbol} {b.zodiac.sign}</span>
          <span className="planet-deg">{b.zodiac.degree.toFixed(1)}°</span>
          {showHouse && <span className="planet-house">H{b.house}</span>}
        </div>
      ))}
    </div>
  )
}

function AspectList({ aspects }) {
  if (!aspects.length) return null
  return (
    <div className="aspect-list">
      <div className="section-label">aspects</div>
      {aspects.map((a, i) => (
        <div key={i} className="aspect-row">
          <span className="aspect-bodies">{a.body1.symbol} {a.symbol} {a.body2.symbol}</span>
          <span className="aspect-name">{a.name}</span>
          <span className="aspect-orb">{a.exact.toFixed(1)}° orb</span>
        </div>
      ))}
    </div>
  )
}

function ReadingBlock({ text }) {
  if (!text) return null
  return (
    <div className="reading-text">
      {text.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}

const SKY_DEFAULT_Q = 'what does venus have in store for me?'

function DailyReading({ text, loading, onRead, snapshot, natalChart }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [answerLoading, setAnswerLoading] = useState(false)

  const submitQuestion = async (e) => {
    e.preventDefault()
    const q = question.trim() || SKY_DEFAULT_Q
    setAnswerLoading(true)
    setAnswer('')
    const result = await askDay(q, snapshot, natalChart)
    setAnswer(result)
    setAnswerLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Tab' && !question) {
      e.preventDefault()
      setQuestion(SKY_DEFAULT_Q)
    }
  }

  return (
    <div className="reading">
      <button className="reading-btn" onClick={onRead} disabled={loading}>
        {loading ? 'reading the stars...' : 'read my day'}
      </button>
      <ReadingBlock text={text} />
      <form className="ask-form" onSubmit={submitQuestion}>
        <input type="text" value={question} placeholder={SKY_DEFAULT_Q}
          onChange={e => setQuestion(e.target.value)} onKeyDown={handleKey} />
        <button type="submit" disabled={answerLoading}>
          {answerLoading ? '...' : 'ask'}
        </button>
      </form>
      <ReadingBlock text={answer} />
    </div>
  )
}

const CHART_DEFAULT_Q = 'who am i?'

function ChartAnalysis({ natalChart }) {
  const [analysis, setAnalysis] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [answerLoading, setAnswerLoading] = useState(false)

  const analyze = async () => {
    setAnalysisLoading(true)
    setAnalysis('')
    const result = await analyzeChart(natalChart)
    setAnalysis(result)
    setAnalysisLoading(false)
  }

  const submitQuestion = async (e) => {
    e.preventDefault()
    const q = question.trim() || CHART_DEFAULT_Q
    setAnswerLoading(true)
    setAnswer('')
    const result = await askChart(q, natalChart)
    setAnswer(result)
    setAnswerLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Tab' && !question) {
      e.preventDefault()
      setQuestion(CHART_DEFAULT_Q)
    }
  }

  return (
    <div className="reading">
      <button className="reading-btn" onClick={analyze} disabled={analysisLoading}>
        {analysisLoading ? 'analyzing...' : 'analyze me'}
      </button>
      <ReadingBlock text={analysis} />
      <form className="ask-form" onSubmit={submitQuestion}>
        <input type="text" value={question} placeholder={CHART_DEFAULT_Q}
          onChange={e => setQuestion(e.target.value)} onKeyDown={handleKey} />
        <button type="submit" disabled={answerLoading}>
          {answerLoading ? '...' : 'ask'}
        </button>
      </form>
      <ReadingBlock text={answer} />
    </div>
  )
}

function parseDatetime(str) {
  const [d, t] = (str || '').split('T')
  if (!d) return new Date(1990, 5, 15, 12, 0)
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = (t || '12:00').split(':').map(Number)
  return new Date(y, m - 1, day, h, min)
}

function fmtDatetime(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function BirthInput({ draft, onDraft, onSave }) {
  const birthDate = parseDatetime(draft.datetime)
  const onDateChange = (d) => onDraft({ ...draft, datetime: fmtDatetime(d) })

  return (
    <div className="birth-input">
      <div className="section-label">birth info</div>
      <div className="birth-fields">
        <DatePicker date={birthDate} onChange={onDateChange} />
        <select value={draft.tz} onChange={e => onDraft({ ...draft, tz: e.target.value })}>
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/^.*\//, '').replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="birth-fields">
        <input type="number" step="0.01" placeholder="lat" value={draft.lat}
          onChange={e => onDraft({ ...draft, lat: e.target.value })} />
        <input type="number" step="0.01" placeholder="lng" value={draft.lng}
          onChange={e => onDraft({ ...draft, lng: e.target.value })} />
        <button className="save-btn" onClick={onSave}>set</button>
      </div>
    </div>
  )
}

const VIEWS = ['sky', 'chart']

export default function App() {
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setHours(9, 27, 0, 0)
    return d
  })
  const [view, setView] = useState('sky')
  const defaultBirth = { datetime: '1990-06-15T12:00', tz: 'Europe/Oslo', lat: '59.91', lng: '10.75' }
  const [birth, setBirth] = useState(() => loadBirth() || defaultBirth)
  const [draft, setDraft] = useState(birth)
  const [selectedBody, setSelectedBody] = useState(null)
  const [reading, setReading] = useState('')
  const [readingLoading, setReadingLoading] = useState(false)

  // clear reading when date changes
  useEffect(() => { setReading('') }, [date.getTime()])

  const saveBirth = () => {
    setBirth(draft)
    localStorage.setItem('astro-birth', JSON.stringify(draft))
  }

  const selectBody = (body) => setSelectedBody(prev => prev === body.id ? null : body.id)

  const snapshot = useMemo(() => getSnapshot(date), [date.getTime()])

  // always resolve selected body from current snapshot so it stays fresh
  const selectedBodyData = selectedBody
    ? snapshot.bodies.find(b => b.id === selectedBody) || null
    : null

  // always compute natal chart from saved birth data
  const natalChart = useMemo(() => {
    const lat = parseFloat(birth.lat)
    const lng = parseFloat(birth.lng)
    if (isNaN(lat) || isNaN(lng)) return null
    const d = toUTC(birth.datetime, birth.tz || 'Europe/Oslo')
    if (!d || isNaN(d)) return null
    return getNatalChart(d, lat, lng)
  }, [birth.datetime, birth.tz, birth.lat, birth.lng])

  const fetchReading = useCallback(async () => {
    setReadingLoading(true)
    setReading('')
    const text = await getReading(snapshot, natalChart)
    setReading(text)
    setReadingLoading(false)
  }, [snapshot, natalChart])

  const displayDate = view === 'chart' && natalChart ? natalChart.date : date
  const dateStr = displayDate.toLocaleDateString('nb-NO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const sun = natalChart?.bodies.find(b => b.id === 'Sun')
  const moon = natalChart?.bodies.find(b => b.id === 'Moon')

  return (
    <div className="app">
      <header>
        <h1>astro</h1>
        <div className="view-tabs">
          {VIEWS.map(v => (
            <button key={v} className={v === view ? 'active' : ''} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
        {natalChart && (
          <div className="chart-summary">
            <span>{natalChart.ascZodiac.symbol} rising</span>
            <span>{sun?.zodiac.symbol} sun</span>
            <span>{moon?.zodiac.symbol} moon</span>
          </div>
        )}
      </header>

      {view === 'sky' && (
        <>
          <p className="date-display">{dateStr}</p>
          <DatePicker date={date} onChange={setDate} />
          <DailyReading text={reading} loading={readingLoading} onRead={fetchReading} snapshot={snapshot} natalChart={natalChart} />
          <MoonViz moon={snapshot.moon} />
          <PlanetList bodies={snapshot.bodies} selected={selectedBody} onSelect={selectBody} />
          <PlanetDetail body={selectedBodyData} allBodies={snapshot.bodies} natalChart={natalChart} date={date} onClose={() => setSelectedBody(null)} />
          <div className="main-view">
            <SolarSystem snapshot={snapshot} selected={selectedBody} onSelect={selectBody} />
          </div>
        </>
      )}

      {view === 'chart' && (
        <>
          <BirthInput draft={draft} onDraft={setDraft} onSave={saveBirth} />
          {natalChart && (
            <>
              <p className="date-display">{dateStr}</p>
              <ChartAnalysis natalChart={natalChart} />
              <PlanetList bodies={natalChart.bodies} showHouse selected={selectedBody} onSelect={selectBody} />
              <PlanetDetail body={selectedBody ? natalChart.bodies.find(b => b.id === selectedBody) : null} allBodies={natalChart.bodies} natalChart={natalChart} date={natalChart.date} onClose={() => setSelectedBody(null)} />
              <AspectList aspects={natalChart.aspects} />
              <div className="main-view">
                <NatalChart chart={natalChart} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
