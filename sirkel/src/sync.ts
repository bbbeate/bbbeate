import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'

const raw = (import.meta.env.VITE_SIGNALING_URL as string | undefined) || 'wss://y-webrtc-eu.fly.dev'
const SIGNALING = raw
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export type Post = { id: string; user: string; text: string; ts: number }
type Awareness = WebrtcProvider['awareness']

export type Sirkel = {
  doc: Y.Doc
  feed: Y.Array<Post>
  provider: WebrtcProvider
  awareness: Awareness
}

export function connect(room: string, key: string): Sirkel {
  const doc = new Y.Doc()
  new IndexeddbPersistence(`sirkel-${room}`, doc)
  const provider = new WebrtcProvider(room, doc, { password: key, signaling: SIGNALING })
  const feed = doc.getArray<Post>('feed')
  return { doc, feed, provider, awareness: provider.awareness }
}

export function addPost(feed: Y.Array<Post>, user: string, text: string) {
  feed.push([{ id: crypto.randomUUID(), user, text, ts: Date.now() }])
}

export function deletePost(feed: Y.Array<Post>, id: string) {
  for (let i = 0; i < feed.length; i++) {
    if (feed.get(i).id === id) {
      feed.delete(i, 1)
      return
    }
  }
}

export function setUser(awareness: Awareness, name: string) {
  awareness.setLocalStateField('user', { name })
}

export function onPeers(awareness: Awareness, cb: (names: string[]) => void) {
  const read = () => {
    const names: string[] = []
    awareness.getStates().forEach((s: any) => {
      if (s.user?.name) names.push(s.user.name)
    })
    cb(names)
  }
  awareness.on('change', read)
  read()
  return () => awareness.off('change', read)
}
