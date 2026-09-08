// sirkel signaling — y-webrtc relay on a Cloudflare Durable Object.
// Relays connection metadata between peers only. Never sees post data or the
// room key; those are end-to-end encrypted between browsers.

export default {
  async fetch(request, env) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('sirkel signaling ok', { status: 200 })
    }
    const id = env.SIGNAL.idFromName('global')
    return env.SIGNAL.get(id).fetch(request)
  }
}

export class Signal {
  constructor() {
    this.topics = new Map() // topic -> Set<WebSocket>
    this.subs = new Map() // WebSocket -> Set<topic>
  }

  async fetch() {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    server.accept()
    this.subs.set(server, new Set())
    server.addEventListener('message', (e) => this.onMessage(server, e.data))
    server.addEventListener('close', () => this.onClose(server))
    server.addEventListener('error', () => this.onClose(server))
    return new Response(null, { status: 101, webSocket: client })
  }

  send(ws, msg) {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      this.onClose(ws)
    }
  }

  onMessage(ws, data) {
    let msg
    try {
      msg = typeof data === 'string' ? JSON.parse(data) : null
    } catch {
      return
    }
    if (!msg || !msg.type) return
    const mine = this.subs.get(ws)
    if (!mine) return

    switch (msg.type) {
      case 'subscribe':
        for (const t of msg.topics || []) {
          if (!this.topics.has(t)) this.topics.set(t, new Set())
          this.topics.get(t).add(ws)
          mine.add(t)
        }
        break
      case 'unsubscribe':
        for (const t of msg.topics || []) {
          this.topics.get(t)?.delete(ws)
          mine.delete(t)
        }
        break
      case 'publish':
        if (msg.topic) {
          const receivers = this.topics.get(msg.topic)
          if (receivers) for (const r of receivers) this.send(r, msg)
        }
        break
      case 'ping':
        this.send(ws, { type: 'pong' })
        break
    }
  }

  onClose(ws) {
    const mine = this.subs.get(ws)
    if (mine) for (const t of mine) this.topics.get(t)?.delete(ws)
    this.subs.delete(ws)
  }
}
