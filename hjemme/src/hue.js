const USERNAME = import.meta.env.VITE_HUE_USERNAME

export async function hueApiV2(method, path, body) {
  const res = await fetch(`/hue-api/clip/v2/resource${path}`, {
    method,
    headers: {
      'hue-application-key': USERNAME,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

const inflight = new Set()
const pending = new Map()

export function putLatest(path, body) {
  if (inflight.has(path)) {
    pending.set(path, body)
    return
  }
  inflight.add(path)
  hueApiV2('PUT', path, body).finally(() => {
    inflight.delete(path)
    if (!pending.has(path)) return
    const next = pending.get(path)
    pending.delete(path)
    putLatest(path, next)
  })
}

export async function getDynamicState() {
  const res = await fetch('/api/dynamic')
  return res.json()
}

export async function startDynamic(config) {
  const res = await fetch('/api/dynamic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export async function stopDynamic() {
  await fetch('/api/dynamic', { method: 'DELETE' })
}

export async function fetchRooms() {
  const [rooms, groups] = await Promise.all([hueApiV2('GET', '/room'), hueApiV2('GET', '/grouped_light')])
  const groupById = new Map(groups.data.map(g => [g.id, g]))
  return rooms.data.map(room => {
    const groupRid = room.services.find(s => s.rtype === 'grouped_light').rid
    const group = groupById.get(groupRid)
    return { id: room.id, name: room.metadata.name, groupRid, on: group.on.on, brightness: Math.round(group.dimming?.brightness ?? 100) }
  })
}
