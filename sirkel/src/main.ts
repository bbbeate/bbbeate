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

let openPanel: HTMLElement | null = null
function closePopup() {
  if (openPanel) {
    openPanel.hidden = true
    openPanel = null
  }
}
function registerPopup(trig: HTMLElement, panel: HTMLElement) {
  panel.hidden = true
  trig.addEventListener('click', () => {
    const wasOpen = openPanel === panel
    closePopup()
    if (!wasOpen) {
      panel.hidden = false
      openPanel = panel
    }
  })
}
document.addEventListener('click', (e) => {
  if (!openPanel) return
  const wrap = openPanel.parentElement
  if (wrap && wrap.contains(e.target as Node)) return
  closePopup()
})

function parseHash() {
  const h = new URLSearchParams(location.hash.slice(1))
  return { room: h.get('room')?.trim() || '', key: h.get('key')?.trim() || '' }
}

function fmt(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function preview(text: string) {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 40 ? t.slice(0, 40) + '…' : t
}

function headerText(n: Post) {
  if (n.parentId) return `${fmt(n.ts)}: ${n.user}`
  return `${fmt(n.ts)}: ${n.user}  ${n.title.trim() || preview(n.text)}`
}

function headEl(n: Post, unread = false) {
  const h = el('div', 'head-row')
  h.append(el('span', 'head-left', `${unread ? '● ' : ''}${fmt(n.ts)}: ${n.user}`))
  if (!n.parentId) h.append(el('span', 'head-right', n.title.trim() || preview(n.text)))
  return h
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

const FONTS: [string, string][] = [
  ['system', '-apple-system, system-ui, sans-serif'],
  ['serif', 'Georgia, Cambria, serif'],
  ['mono', 'ui-monospace, Menlo, monospace'],
  ['cursive', 'cursive'],
  ['comic', '"Comic Sans MS", "Comic Sans", cursive']
]

function loadFont() {
  return localStorage.getItem('sirkel-font') || FONTS[0][1]
}
function applyFont(font: string) {
  document.documentElement.style.setProperty('--font', font)
}

function loadSize() {
  return localStorage.getItem('sirkel-size') || '16'
}
function applySize(px: string) {
  document.documentElement.style.setProperty('--size', `${px}px`)
}

function cmdEnter(fn: () => void) {
  return (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      fn()
    }
  }
}

const { room, key } = parseHash()
if (room && key) boot(room, key)
else renderGate()

function renderGate() {
  app.replaceChildren()
  const gate = el('button', 'gate')
  gate.setAttribute('aria-label', 'åpne sirkel')
  gate.innerHTML = `
    <svg viewBox="0 0 60 82" width="115" height="157" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true">
      <path d="M40 38 A16 16 0 1 0 20 38 Q15 58 13 74 L47 74 Q45 58 40 38 Z" />
    </svg>`
  gate.onclick = () => {
    const r = prompt('rom (uuid)')?.trim()
    if (!r) return
    const k = prompt('hemmelig nøkkel')?.trim()
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
  const font = loadFont()
  applyFont(font)
  const size = loadSize()
  applySize(size)

  let me = user
  const header = el('header', 'bar')
  const meBtn = el('button', 'me', me)
  meBtn.title = 'endre navn'
  meBtn.onclick = () => {
    const n = prompt('navn', me)?.trim()
    if (!n) return
    me = n
    localStorage.setItem('sirkel-user', n)
    setUser(s.awareness, n)
    meBtn.textContent = n
  }
  const peers = el('span', 'peers')
  const who = el('div', 'who')
  who.append(meBtn, peers)
  const colors = el('div', 'colors')
  colors.append(
    colorField('tekst', text, (v) => {
      localStorage.setItem('sirkel-text', v)
      applyColors(v, loadColors().bg)
    }),
    colorField('bakgrunn', bg, (v) => {
      localStorage.setItem('sirkel-bg', v)
      applyColors(loadColors().text, v)
    }),
    fontField(font, (v) => {
      localStorage.setItem('sirkel-font', v)
      applyFont(v)
    }),
    sizeField(size, (v) => {
      localStorage.setItem('sirkel-size', v)
      applySize(v)
    })
  )
  const footer = el('footer', 'foot')
  const dl = el('button', 'foot-btn', 'last ned')
  dl.onclick = () => download(s)
  const wipe = el('button', 'foot-btn', 'slett min kopi')
  wipe.onclick = async () => {
    if (!confirm('slette din kopi av dette rommet? bare på denne enheten.')) return
    await forget(s)
    location.hash = ''
    renderGate()
  }
  footer.append(dl, wipe)
  header.append(who, colors)

  const listEl = el('div', 'feed')
  const composerEl = el('div', 'composer-wrap')

  let focus: string | null = null
  const all = () => s.feed.toArray()
  const nodeById = (id: string) => all().find((n) => n.id === id) || null
  const childrenOf = (pid: string | null) => all().filter((n) => n.parentId === pid)
  const countLabel = (id: string) => {
    const c = childrenOf(id).length
    return c ? `${c} svar` : 'svar'
  }

  const seenKey = `sirkel-seen-${s.room}`
  const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) || '[]'))
  const markSeen = (id: string) => {
    seen.add(id)
    for (const c of childrenOf(id)) seen.add(c.id)
    localStorage.setItem(seenKey, JSON.stringify([...seen]))
  }
  const hasUnread = (id: string): boolean => {
    if (!seen.has(id)) return true
    return childrenOf(id).some((c) => hasUnread(c.id))
  }

  function go(id: string | null) {
    focus = id
    if (id) markSeen(id)
    renderList()
    renderComposer()
    window.scrollTo(0, 0)
  }

  function rootCard(n: Post) {
    const card = el('div', 'card')
    card.append(headEl(n, hasUnread(n.id)))
    card.onclick = () => go(n.id)
    return card
  }

  function focusCard(n: Post) {
    const card = el('div', 'card focus')
    card.append(el('div', 'card-back', '↑ tilbake'), headEl(n), el('div', 'card-text', n.text))
    card.onclick = () => go(n.parentId)
    return card
  }

  function replyRow(n: Post) {
    const r = el('div', 'reply')
    r.append(headEl(n, hasUnread(n.id)), el('div', 'reply-text', n.text), el('div', 'reply-meta', countLabel(n.id)))
    r.onclick = () => go(n.id)
    return r
  }

  function renderList() {
    listEl.replaceChildren()
    if (focus === null) {
      for (const n of childrenOf(null).sort((a, b) => b.ts - a.ts)) listEl.append(rootCard(n))
      return
    }
    const node = nodeById(focus)
    if (!node) {
      focus = null
      return renderList()
    }
    listEl.append(focusCard(node))
    const replies = el('div', 'replies')
    for (const c of childrenOf(node.id).sort((a, b) => a.ts - b.ts)) replies.append(replyRow(c))
    listEl.append(replies)
  }

  function renderComposer() {
    composerEl.replaceChildren()
    const rowr = el('div', 'composer-row')
    const ta = el('textarea', 'input')
    ta.rows = 1
    ta.placeholder = focus === null ? 'skriv...' : 'svar...'
    const grow = () => {
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    }
    const btn = el('button', 'btn', focus === null ? 'post' : 'svar')
    let titleIn: HTMLInputElement | null = null
    const submit = () => {
      const t = ta.value.trim()
      if (!t) return
      const id = addPost(s.feed, { parentId: focus, user: me, title: titleIn ? titleIn.value.trim() : '', text: t })
      markSeen(id)
      ta.value = ''
      if (titleIn) titleIn.value = ''
      grow()
      renderList()
    }
    btn.onclick = submit
    ta.addEventListener('input', grow)
    ta.addEventListener('keydown', cmdEnter(submit))
    rowr.append(ta, btn)
    if (focus === null) {
      titleIn = el('input', 'input')
      titleIn.placeholder = 'tittel (valgfri)'
      composerEl.append(titleIn, rowr)
    } else {
      composerEl.append(rowr)
    }
  }

  s.feed.observe(renderList)
  renderList()
  renderComposer()
  onPeers(s.awareness, (names) => {
    peers.textContent = `● ${names.length} på nett`
    peers.title = names.join(', ')
  })

  app.append(header, listEl, composerEl, footer)
}

function download(s: Sirkel) {
  const byParent = buildTree(s.feed.toArray())
  const lines: string[] = []
  const walk = (n: Post, d: number) => {
    const pad = '  '.repeat(d)
    lines.push(`${pad}${headerText(n)}`)
    lines.push(`${pad}${n.text}`)
    for (const c of (byParent.get(n.id) || []).slice().sort((a, b) => a.ts - b.ts)) walk(c, d + 1)
  }
  for (const r of (byParent.get(null) || []).slice().sort((a, b) => b.ts - a.ts)) walk(r, 0)
  const a = el('a')
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }))
  a.download = `sirkel-${s.room}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}

function buildTree(nodes: Post[]) {
  const byParent = new Map<string | null, Post[]>()
  for (const n of nodes) {
    if (!byParent.has(n.parentId)) byParent.set(n.parentId, [])
    byParent.get(n.parentId)!.push(n)
  }
  return byParent
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

function fontField(value: string, onChange: (v: string) => void) {
  const wrap = el('div', 'fontpick')
  const trig = el('button', 'ttt')
  for (const name of ['serif', 'mono', 'comic']) {
    const found = FONTS.find((f) => f[0] === name)
    if (!found) continue
    const s = el('span', undefined, 't')
    s.style.fontFamily = found[1]
    trig.append(s)
  }
  const opts = el('div', 'fontopts')
  for (const [name, stack] of FONTS) {
    const b = el('button', 'fontopt', name)
    b.style.fontFamily = stack
    b.onclick = () => {
      onChange(stack)
      closePopup()
    }
    opts.append(b)
  }
  registerPopup(trig, opts)
  wrap.append(trig, opts)
  return wrap
}

function sizeField(value: string, onChange: (v: string) => void) {
  const clamp = (v: number) => Math.max(3, Math.min(27, v))
  const wrap = el('div', 'sizepick')
  const trig = el('button', 'ttt', 'Tt')
  const panel = el('div', 'sizepanel')
  let n = clamp(parseInt(value) || 16)
  const num = el('span', 'sz-num', String(n))
  const dec = el('button', 'sz-small', 't')
  const inc = el('button', 'sz-big', 'T')
  const set = (v: number) => {
    n = clamp(v)
    num.textContent = String(n)
    onChange(String(n))
  }
  dec.onclick = () => set(n - 1)
  inc.onclick = () => set(n + 1)
  panel.append(dec, num, inc)
  registerPopup(trig, panel)
  wrap.append(trig, panel)
  return wrap
}
