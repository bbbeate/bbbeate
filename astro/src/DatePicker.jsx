import { useState, useRef, useEffect } from 'react'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const WEEKDAYS = ['m', 't', 'w', 't', 'f', 's', 's']

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDisplay(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function DatePicker({ date, onChange }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(new Date(date))
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => { setViewDate(new Date(date)) }, [date.getTime()])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const lastDay = new Date(year, month + 1, 0)
  const startDay = new Date(year, month, 1).getDay() || 7

  const prev = () => setViewDate(new Date(year, month - 1, 1))
  const next = () => setViewDate(new Date(year, month + 1, 1))

  const select = (day) => {
    const d = new Date(year, month, day, date.getHours(), date.getMinutes())
    onChange(d)
    setOpen(false)
  }

  const changeTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return
    const d = new Date(date)
    d.setHours(h, m)
    onChange(d)
  }

  const today = fmt(new Date())
  const selected = fmt(date)

  return (
    <div className="datepicker" ref={ref}>
      <button type="button" className="datepicker-now" onClick={() => onChange(new Date())}>rn</button>
      <button type="button" className="datepicker-display" onClick={() => setOpen(!open)}>
        {fmtDisplay(date)}
      </button>
      <input type="time" className="datepicker-time" value={fmtTime(date)}
        onChange={e => changeTime(e.target.value)} />
      {open && (
        <div className="datepicker-dropdown">
          <div className="datepicker-header">
            <button type="button" className="datepicker-nav" onClick={prev}>&larr;</button>
            <span className="datepicker-month">{MONTHS[month]} {year}</span>
            <button type="button" className="datepicker-nav" onClick={next}>&rarr;</button>
          </div>
          <div className="datepicker-weekdays">
            {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="datepicker-days">
            {Array.from({ length: startDay - 1 }, (_, i) => (
              <span key={`e${i}`} className="datepicker-day empty" />
            ))}
            {Array.from({ length: lastDay.getDate() }, (_, i) => {
              const day = i + 1
              const dateStr = fmt(new Date(year, month, day))
              const isSelected = dateStr === selected
              const isToday = dateStr === today
              let cls = 'datepicker-day'
              if (isSelected) cls += ' selected'
              if (isToday) cls += ' today'
              return (
                <span key={day} className={cls} onClick={() => select(day)}>{day}</span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
