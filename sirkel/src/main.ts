import '@shared/colors.css'
import './style.css'
import { connect, addPost, deletePost, setUser, onPeers, type Post, type Sirkel } from './sync'

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
  return new Date(ts).toLocaleString('no', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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
    <svg viewBox="0 0 64 96" width="120" height="180" aria-hidden="true">
      <circle cx="32" cy="34" r="22" fill="none" stroke="currentColor" stroke-width="4" />
      <path d="M24 50 L20 82 H44 L40 50 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />
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
    for (const p of posts) list.append(postRow(p, user, s))
  }

  s.feed.observe(renderFeed)
  renderFeed()
  onPeers(s.awareness, (names) => {
    peers.textContent = `● ${names.length} pa nett`
    peers.title = names.join(', ')
  })

  app.append(header, composer, list)
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

function postRow(p: Post, user: string, s: Sirkel) {
  const row = el('div', 'post')
  const head = el('button', 'post-head', `${p.user} · ${fmt(p.ts)}`)
  const body = el('div', 'post-body', p.text)
  body.hidden = true
  head.onclick = () => {
    body.hidden = !body.hidden
  }
  row.append(head, body)
  if (p.user === user) {
    const del = el('button', 'post-del', 'slett')
    del.onclick = () => deletePost(s.feed, p.id)
    row.append(del)
  }
  return row
}
