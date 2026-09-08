import '@shared/colors.css'
import './style.css'
import { connect, addPost, forget, setUser, onPeers, type Post, type Sirkel } from './sync'

const app = document.querySelector<HTMLDivElement>('#app')!

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (text != null) node.textContent = text
  return node
}

function parseHash() {
  const h = new URLSearchParams(location.hash.slice(1))
  return { room: h.get('room')?.trim() || '', key: h.get('key')?.trim() || '' }
}

function fmt(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function defaultColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function loadColors() {
  return {
    text: localStorage.getItem('sirkel-text') || defaultColor('--first', '#b7b7ff'),
    bg: localStorage.getItem('sirkel-bg') || defaultColor('--background', '#242424')
  }
}

function applyColors(text: string, bg: string) {
  document.documentElement.style.setProperty('--text', text)
  document.documentElement.style.setProperty('--bg', bg)
}

const { room, key } = parseHash()
if (room && key) boot(room, key)
else renderGate()

function renderGate() {
  app.replaceChildren()
  const gate = el('button', 'gate')
  gate.setAttribute('aria-label', 'apne sirkel')
  gate.innerHTML = `
    <svg viewBox="0 0 60 82" width="115" height="157" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true">
      <path d="M40 38 A16 16 0 1 0 20 38 Q15 58 13 74 L47 74 Q45 58 40 38 Z" />
    </svg>`
  gate.onclick = () => {
    const r = prompt('rom (uuid)')?.trim()
    if (!r) return
    const k = prompt('hemmelig nokkel')?.trim()
    if (!k) return
    location.hash = `room=${encodeURIComponent(r)}&key=${encodeURIComponent(k)}`
    boot(r, k)
  }
  app.append(gate)
}

function boot(room: string, key: string) {
  let user = localStorage.getItem('sirkel-user')?.trim()
  if (!user) {
    user = prompt('navn')?.trim() || ''
    if (!user) return renderGate()
    localStorage.setItem('sirkel-user', user)
  }

  const s = connect(room, key)
  setUser(s.awareness, user)
  render(s, user)
}

function render(s: Sirkel, user: string) {
  app.replaceChildren()
  const { text, bg } = loadColors()
  applyColors(text, bg)

  const header = el('header', 'bar')
  const peers = el('span', 'peers')
  const colors = el('div', 'colors')
  const textPick = colorField('tekst', text, (v) => {
    localStorage.setItem('sirkel-text', v)
    applyColors(v, loadColors().bg)
  })
  const bgPick = colorField('bakgrunn', bg, (v) => {
    localStorage.setItem('sirkel-bg', v)
    applyColors(loadColors().text, v)
  })
  colors.append(textPick, bgPick)
  header.append(peers, colors)

  const composer = el('div', 'composer')
  const ta = el('textarea', 'input')
  ta.rows = 2
  ta.placeholder = 'skriv...'
  const postBtn = el('button', 'btn', 'post')
  postBtn.onclick = () => {
    const t = ta.value.trim()
    if (!t) return
    addPost(s.feed, user, t)
    ta.value = ''
  }
  composer.append(ta, postBtn)

  const list = el('div', 'feed')

  function renderFeed() {
    list.replaceChildren()
    const posts = s.feed.toArray().slice().reverse()
    for (const p of posts) list.append(postRow(p))
  }

  s.feed.observe(renderFeed)
  renderFeed()
  onPeers(s.awareness, (names) => {
    peers.textContent = `● ${names.length} pa nett`
    peers.title = names.join(', ')
  })

  const footer = el('footer', 'foot')
  const dl = el('button', 'foot-btn', 'last ned .txt')
  dl.onclick = () => download(s)
  const wipe = el('button', 'foot-btn', 'slett min kopi')
  wipe.onclick = async () => {
    if (!confirm('slette din kopi av dette rommet? bare pa denne enheten.')) return
    await forget(s)
    location.hash = ''
    renderGate()
  }
  footer.append(dl, wipe)

  app.append(header, composer, list, footer)
}

function download(s: Sirkel) {
  const text = s.feed
    .toArray()
    .map((p) => `${fmt(p.ts)}: ${p.user}\n${p.text}`)
    .join('\n\n')
  const a = el('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  a.download = `sirkel-${s.room}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}

function colorField(label: string, value: string, onChange: (v: string) => void) {
  const wrap = el('label', 'color')
  const input = el('input', 'swatch')
  input.type = 'color'
  input.value = toHex(value)
  input.oninput = () => onChange(input.value)
  wrap.append(input, el('span', 'color-label', label))
  return wrap
}

function toHex(v: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.fillStyle = v
  return ctx.fillStyle
}

function postRow(p: Post) {
  const row = el('div', 'post')
  const head = el('button', 'post-head', `${fmt(p.ts)}: ${p.user}`)
  const body = el('div', 'post-body', p.text)
  body.hidden = true
  head.onclick = () => {
    body.hidden = !body.hidden
  }
  row.append(head, body)
  return row
}
