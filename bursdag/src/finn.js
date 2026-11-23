const refreng = `Åh, helten, er Finn Boger
Ungdomstiden - som i går
Vår Finn Boger, Boger-Boger
Søtti åår
Helten, er Finn Boger
Bygger bil og som den går
Vår Finn Boger, Boger-Boger
Søtti åår`

const song = [
  ['intro', 'Oh oh oh'],
  ['vers 1', `Gjester
Hvis det er noen her som tviler
Mannen vi feirer
Er både supernørd og rå
Mmm, gjester
Det er med han som gamle biler
Sjelfulle stiler
Men krever sitt før de vil gå`],
  ['refreng', refreng],
  ['vers 2', `Venner
Har sett han henge ut i Wyller
Og han fortryller
Med gamle kunster aldri glemt
Venner
Det er på tide at vi skåler
For denne mannen
No annet ville være rent slemt`],
  ['refreng', refreng],
  ['refreng', refreng.split('\n').slice(0, 4).join('\n')]
]

const WORD_TIMES = [[null,null,null],[null],[null,null,null,null,null,null,null],[null,null,null],[null,null,null,null,null],[null,null],[null,null,null,null,null,null,null],[null,null],[null,null,null,null,null,null,68.91],[null,null,null,null,null],[null,null,null,null,null],[null,null,null,null],[null,84.45],[null,null,null,null],[null,null,null,null,null,null],[null,null,null,null],[null,99.73],[null],[null,null,null,null,null,null,null],[null,null,null],[null,null,null,null,null],[null],[null,null,null,null,null,null,null],[null,null,null],[null,null,null,null,null,131.41],[null,null,null,null,null],[null,null,null,null,null],[null,null,null,null],[null,146.72],[null,null,null,null],[null,null,null,null,null,null],[null,null,null,null],[null,162.51],[null,null,null,null,null],[null,null,null,null,null],[null,null,null,null],[null,177.05]]

const LINE_TIMES = [[13.07,25.16],[36.05,40.75,41.78],[42.23,43.18,45.7],[46.08,48.12,49.8],[49.95,51.1,53.74],[54.7,56.37,57.97],[58.39,59.23,61.62],[62.33,64.12,65.62],[66.5,67.22],[70.63,71.92],[74.9,75.81],[78.94,79.88],[83.41,84.02],[86.99,88.3],[91.44,91.81],[94.69,95.38],[99.26,99.45,100.97],[102.47,103.84,104.09],[104.01,105.79,108.78],[110.12,110.97,112.38],[113.52,113.92,115.95],[118.08,118.86,119.93],[121.07,121.44,124.36],[125.55,126.49,128.02],[128.91,129.51,132.45],[133.22,134.39],[138.45,138.67,140.27],[142.26,142.64],[146.01,146.45],[149.46,150.18],[153.62,153.86],[157.04,157.45],[161.3,161.79],[164.99,165.63],[169.14,169.44,171.64],[172.69,173.07],[176.27,176.7,178.04]]

const SECONDS_PER_SYLLABLE = 0.32
const MAX_SECONDS_PER_SYLLABLE = 0.6
const LINE_PAUSE = 0.6
const SECTION_PAUSE = 2.5
const SHOW_AHEAD = 1.5
const TIMINGS_KEY = 'finn-line-times-v2'
const WORD_TIMINGS_KEY = 'finn-word-times'
const SPEEDS = [1, 0.75, 0.5]
const FINALE_DELAY = 1

const syllables = word => Math.max(1, (word.toLowerCase().match(/[aeiouyæøå]+/g) || []).length)

const lyricsEl = document.querySelector('.karaoke-lyrics')
const titleEl = document.querySelector('.karaoke-title')
const playBtn = document.querySelector('.karaoke-play')
const restartBtn = document.querySelector('.karaoke-restart')
const hintEl = document.querySelector('.karaoke-hint')
const audio = document.querySelector('.karaoke-audio')
const seekInput = document.querySelector('.karaoke-seek')
const timeEl = document.querySelector('.karaoke-time')
const copyBtn = document.querySelector('.karaoke-copy')
const clearBtn = document.querySelector('.karaoke-clear')
const speedBtn = document.querySelector('.karaoke-speed')
const params = new URLSearchParams(location.search)
const wordMode = params.has('words')
const tapMode = params.has('tap') || wordMode
const editMode = params.has('edit')
const editorEl = document.querySelector('.karaoke-editor')

const lines = song.flatMap(([section, text]) => text.split('\n').map((lineText, index) => ({ section, lineText, sectionStart: index === 0 }))).map(({ section, lineText, sectionStart }) => {
  const el = document.createElement('p')
  el.className = 'karaoke-line'
  el.classList.toggle('is-section-start', sectionStart)
  el.classList.toggle('karaoke-oh', section === 'intro')
  const words = lineText.split(' ').filter(Boolean).map(text => {
    const span = document.createElement('span')
    span.className = 'karaoke-word'
    span.textContent = text
    el.append(span, ' ')
    return { span, syllables: syllables(text) }
  })
  lyricsEl.append(el)
  return { el, words }
})

const lineSyllables = line => line.words.reduce((sum, word) => sum + word.syllables, 0)

const estimatedTimes = () => {
  const times = []
  let clock = 0
  let index = 0
  song.forEach(([, text]) => {
    clock += SECTION_PAUSE
    text.split('\n').forEach(() => {
      times.push([Math.max(0, clock - SHOW_AHEAD), clock])
      clock += lineSyllables(lines[index++]) * SECONDS_PER_SYLLABLE + LINE_PAUSE
    })
  })
  return times
}

const untimed = () => lines.map(() => [Infinity, Infinity])

const isValidTimes = times => Array.isArray(times) && times.length > 0 && times.every(pair => Array.isArray(pair) && [2, 3].includes(pair.length) && pair.every(time => time === null || Number.isFinite(time)))

const parseTimes = times => (isValidTimes(times) ? lines.map((_, index) => (times[index] ?? [null, null]).map(time => time ?? Infinity)) : null)

const serializeTimes = () => JSON.stringify(times.map(pair => pair.map(time => (Number.isFinite(time) ? time : null))))

const savedTimes = () => parseTimes(JSON.parse(localStorage.getItem(TIMINGS_KEY) ?? 'null'))

const untimedWords = () => lines.map(line => line.words.map(() => Infinity))

const parseWordTimes = wordTimes => (Array.isArray(wordTimes) && wordTimes.length > 0
  ? lines.map((line, index) => line.words.map((_, w) => (Number.isFinite(wordTimes[index]?.[w]) ? wordTimes[index][w] : Infinity)))
  : null)

const serializeWordTimes = () => JSON.stringify(wordTimes.map(starts => starts.map(time => (Number.isFinite(time) ? time : null))))

const savedWordTimes = () => parseWordTimes(JSON.parse(localStorage.getItem(WORD_TIMINGS_KEY) ?? 'null'))

const syllablesBetween = (line, from, to) => line.words.slice(from, to).reduce((sum, word) => sum + word.syllables, 0)

const applyTimes = () => {
  lines.forEach((line, index) => {
    const [show, start] = times[index]
    const total = lineSyllables(line)
    const next = times[index + 1]?.[0] ?? start + total * SECONDS_PER_SYLLABLE
    const anchors = [[0, start], ...wordTimes[index].map((time, w) => [w, time]).filter(([w, time]) => w > 0 && Number.isFinite(time))]
    const [lastWord, lastTime] = anchors.at(-1)
    const estimatedEnd = start + Math.max(Math.min(next - start, total * MAX_SECONDS_PER_SYLLABLE), total * 0.1)
    const explicitEnd = times[index][2]
    const end = Number.isFinite(explicitEnd)
      ? Math.max(explicitEnd, lastTime + 0.05)
      : Math.max(estimatedEnd, lastTime + syllablesBetween(line, lastWord, line.words.length) * SECONDS_PER_SYLLABLE)
    anchors.push([line.words.length, end])
    anchors.slice(0, -1).forEach(([from, fromTime], a) => {
      const [to, toTime] = anchors[a + 1]
      const perSyllable = (toTime - fromTime) / syllablesBetween(line, from, to)
      let clock = fromTime
      line.words.slice(from, to).forEach(word => {
        word.start = clock
        clock += word.syllables * perSyllable
        word.end = clock
      })
    })
    line.show = show
    line.start = start
    line.end = end
  })
}

let times = savedTimes() ?? parseTimes(LINE_TIMES) ?? (tapMode ? untimed() : estimatedTimes())
let wordTimes = savedWordTimes() ?? parseWordTimes(WORD_TIMES) ?? untimedWords()
applyTimes()

let focusEl = null

const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

const render = () => {
  const position = audio.currentTime
  document.body.classList.toggle('is-finale', position > lines.at(-1).end + FINALE_DELAY)
  seekInput.value = position
  timeEl.textContent = `${formatTime(position)} / ${formatTime(audio.duration || 0)}`
  const active = lines.findLast(line => position >= line.start)

  const peek = lines.find(line => position < line.show)
  const next = lines[active ? lines.indexOf(active) + 1 : 0]

  lines.forEach(line => {
    const isCurrent = line === active
    const isShown = position >= line.show
    line.el.classList.toggle('is-hidden', !isShown && line !== peek)
    line.el.classList.toggle('is-peek', line === peek)
    line.el.classList.toggle('is-current', isCurrent)
    line.el.classList.toggle('is-next', line === next)
    line.row?.classList.toggle('is-current', isCurrent)
    line.el.classList.toggle('is-done', isShown && position >= line.start && !isCurrent)
    line.words.forEach(({ span, start, end }) => {
      if (!isCurrent) return span.style.removeProperty('--fill')
      const fill = Math.min(1, Math.max(0, (position - start) / (end - start)))
      span.style.setProperty('--fill', `${fill * 100}%`)
    })
  })

  const target = lines.findLast(line => position >= line.show)?.el ?? titleEl
  if (target !== focusEl) {
    focusEl = target
    const offset = target.offsetTop + target.offsetHeight / 2 - lyricsEl.offsetTop
    lyricsEl.style.transform = `translateY(${window.innerHeight / 2 - offset}px)`
  }
}

const tick = () => {
  render()
  if (!audio.paused) requestAnimationFrame(tick)
}

const togglePlay = () => (audio.paused ? audio.play() : audio.pause())

const seek = time => {
  audio.currentTime = Math.max(0, time)
  render()
}

audio.addEventListener('play', () => {
  document.body.classList.add('is-playing')
  playBtn.textContent = 'pause'
  playBtn.setAttribute('aria-label', 'pause')
  requestAnimationFrame(tick)
})
audio.addEventListener('pause', () => {
  document.body.classList.remove('is-playing')
  playBtn.textContent = 'play'
  playBtn.setAttribute('aria-label', 'spill')
})

playBtn.addEventListener('click', togglePlay)
restartBtn.addEventListener('click', () => seek(0))
const syncDuration = () => {
  if (!Number.isFinite(audio.duration)) return
  seekInput.max = audio.duration
  render()
}
audio.addEventListener('durationchange', syncDuration)
syncDuration()
seekInput.addEventListener('input', () => seek(Number(seekInput.value)))
seekInput.addEventListener('change', () => seekInput.blur())
lines.forEach(line => line.el.addEventListener('click', () => !tapMode && seek(line.show)))
document.addEventListener('keydown', event => {
  if (event.target === seekInput && event.code !== 'Space') return
  if (event.code === 'Space') {
    event.preventDefault()
    togglePlay()
  }
  if (event.key === 'ArrowLeft') seek(audio.currentTime - 3)
})
window.addEventListener('resize', () => { focusEl = null; render() })

const CONTROLS_TOUCH_SECONDS = 3
let touchTimer = null
document.body.classList.toggle('is-tool', tapMode || editMode)
document.addEventListener('touchstart', () => {
  document.body.classList.add('is-touched')
  clearTimeout(touchTimer)
  touchTimer = setTimeout(() => document.body.classList.remove('is-touched'), CONTROLS_TOUCH_SECONDS * 1000)
}, { passive: true })

let cursor = 0

const showHint = text => {
  hintEl.hidden = false
  hintEl.textContent = text
}

const lineText = line => line.words.map(word => word.span.textContent).join(' ')

const wordEvents = () => lines.flatMap((line, index) => line.words.map((word, w) => ({ index, w, word })))

const tapHint = () => {
  if (wordMode) {
    const event = wordEvents()[cursor]
    if (!event) return showHint('all words timed. drag back to redo a part')
    return showHint(`next tap = "${event.word.span.textContent}" in "${lineText(lines[event.index])}"`)
  }
  if (cursor >= times.length * 2) return showHint('tap mode: all lines timed. drag back to redo a part')
  const action = cursor % 2 === 0 ? 'show' : 'sing'
  showHint(`next tap = ${action}: "${lineText(lines[Math.floor(cursor / 2)])}"`)
}

const syncCursor = () => {
  cursor = wordMode
    ? wordEvents().filter(({ word }) => word.start < audio.currentTime - 0.05).length
    : times.flatMap(([show, sing]) => [show, sing]).filter(time => time < audio.currentTime).length
  tapHint()
}

const now = () => Math.round(audio.currentTime * 100) / 100

const tapLine = () => {
  if (cursor >= times.length * 2) return
  const time = now()
  const events = times.flatMap(([show, sing]) => [show, sing]).map((value, index) => (index === cursor || (index > cursor && value < time) ? time : value))
  times = times.map((pair, index) => [events[index * 2], events[index * 2 + 1], ...pair.slice(2)])
}

const tapWord = () => {
  const event = wordEvents()[cursor]
  if (!event) return
  const time = now()
  wordTimes[event.index][event.w] = time
  wordTimes[event.index].forEach((value, w) => {
    if (w > event.w && value < time) wordTimes[event.index][w] = Infinity
  })
  if (event.w === 0) times[event.index] = [Math.min(times[event.index][0], time), time, ...times[event.index].slice(2)]
}

const save = () => {
  localStorage.setItem(TIMINGS_KEY, serializeTimes())
  localStorage.setItem(WORD_TIMINGS_KEY, serializeWordTimes())
}

const tap = () => {
  if (audio.paused) return
  wordMode ? tapWord() : tapLine()
  cursor++
  applyTimes()
  save()
  focusEl = null
  render()
  tapHint()
}

if (tapMode || editMode) {
  copyBtn.hidden = false
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(`{"lines":${serializeTimes()},"words":${serializeWordTimes()}}`)
    showHint('timings copied, paste them to claude')
  })
  speedBtn.hidden = false
  speedBtn.addEventListener('click', () => {
    audio.playbackRate = SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length]
    speedBtn.textContent = `${audio.playbackRate}x`
  })
}

if (tapMode) {
  clearBtn.hidden = false
  clearBtn.addEventListener('click', () => {
    if (wordMode) {
      localStorage.removeItem(WORD_TIMINGS_KEY)
      wordTimes = untimedWords()
    } else {
      localStorage.removeItem(TIMINGS_KEY)
      times = untimed()
    }
    applyTimes()
    seek(0)
    syncCursor()
  })
  audio.addEventListener('seeked', syncCursor)
  audio.addEventListener('play', syncCursor)
  document.querySelector('.karaoke').addEventListener('pointerdown', tap)
  document.addEventListener('keydown', event => {
    if (['Enter', 'ArrowDown', 'ArrowRight'].includes(event.key)) tap()
  })
  syncCursor()
}

const SLIDER_RANGE = 3

const slider = (label, get, put, className = 'karaoke-field') => {
  const field = document.createElement('label')
  field.className = className
  const range = document.createElement('input')
  range.type = 'range'
  range.step = '0.01'
  const number = document.createElement('input')
  number.type = 'number'
  number.step = '0.05'
  number.min = '0'
  let editing = false

  const current = () => (Number.isFinite(get()) ? Math.round(get() * 100) / 100 : 0)
  const recenter = () => {
    range.min = Math.max(0, current() - SLIDER_RANGE)
    range.max = current() + SLIDER_RANGE
    range.value = current()
    number.value = current()
  }
  const set = value => {
    editing = true
    put(Math.round(value * 100) / 100)
    applyTimes()
    save()
    focusEl = null
    render()
    field.dispatchEvent(new CustomEvent('timing', { bubbles: true }))
  }
  const done = () => {
    editing = false
    recenter()
  }

  range.addEventListener('input', () => {
    number.value = range.value
    set(Number(range.value))
  })
  number.addEventListener('input', () => {
    if (number.value === '' || !Number.isFinite(Number(number.value))) return
    range.value = number.value
    set(Number(number.value))
  })
  range.addEventListener('change', done)
  number.addEventListener('change', done)

  field.refresh = () => !editing && recenter()
  recenter()
  field.append(label, range, number)
  return field
}

const lineField = (index, slot, label) => slider(label, () => times[index][slot] ?? lines[index].end, value => {
  times[index][slot] = value
})

const wordField = (index, w) => slider(lines[index].words[w].span.textContent, () => lines[index].words[w].start, value => {
  wordTimes[index][w] = value
}, 'karaoke-field karaoke-word-field')

if (editMode) {
  document.body.classList.add('is-editing')
  editorEl.hidden = false
  lines.forEach((line, index) => {
    const row = document.createElement('div')
    row.className = 'karaoke-row'
    const play = document.createElement('button')
    play.type = 'button'
    play.textContent = '>'
    play.setAttribute('aria-label', 'spill fra denne linja')
    play.addEventListener('click', () => {
      seek(times[index][0] - 1)
      audio.play()
    })
    const text = document.createElement('span')
    text.className = 'karaoke-row-text'
    text.textContent = `${index + 1}. ${lineText(line)}`

    const words = document.createElement('details')
    words.className = 'karaoke-words'
    const summary = document.createElement('summary')
    summary.textContent = 'words'
    const reset = document.createElement('button')
    reset.type = 'button'
    reset.className = 'karaoke-reset'
    reset.textContent = 'reset words'
    reset.addEventListener('click', () => {
      wordTimes[index] = line.words.map(() => Infinity)
      applyTimes()
      save()
      render()
      row.dispatchEvent(new CustomEvent('timing'))
    })
    words.append(summary, ...line.words.slice(1).map((_, w) => wordField(index, w + 1)), reset)

    row.append(play, text, lineField(index, 0, 'show'), lineField(index, 1, 'sing'), lineField(index, 2, 'end'), words)
    row.addEventListener('timing', () => row.querySelectorAll('.karaoke-field').forEach(field => field.refresh()))
    editorEl.append(row)
    line.row = row
  })
}

render()
