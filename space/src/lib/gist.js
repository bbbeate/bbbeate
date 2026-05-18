// gist storage for the shared canvas. one file per gist (`canvas.json`)
// holding an array of saved batches. each batch = one user's "lagre" action.
//
// schema:
//   {
//     version: 1,
//     batches: [{ id, signature, timestamp, bgColor, strokes: [...] }]
//   }
//
// security note: VITE_GITHUB_TOKEN is baked into the client bundle by vite,
// so anyone visiting the deployed site can read it from devtools. for a
// low-traffic personal pwa this is the accepted tradeoff. when the pi is
// reachable we'll proxy through there and drop the token from the bundle.

const GIST_ID = 'c0644353ef70721d4fb81dd8b65b044d'
const FILENAME = 'canvas.json'
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const API = `https://api.github.com/gists/${GIST_ID}`

function authHeaders() {
  return TOKEN ? { Authorization: `token ${TOKEN}` } : {}
}

// load all saved batches. tolerant of missing file / legacy formats.
export async function loadCanvas() {
  const res = await fetch(API, { headers: authHeaders() })
  if (!res.ok) throw new Error(`gist load failed: ${res.status}`)
  const gist = await res.json()
  const file = gist.files?.[FILENAME]
  if (!file) return { version: 1, batches: [] }
  try {
    const data = JSON.parse(file.content)
    if (!data || typeof data !== 'object') return { version: 1, batches: [] }
    return {
      version: data.version ?? 1,
      batches: Array.isArray(data.batches) ? data.batches : [],
    }
  } catch {
    return { version: 1, batches: [] }
  }
}

// append one batch and PATCH the gist file. fetches latest first so we don't
// clobber other people's saves (still a small race window — acceptable for
// scale).
export async function saveBatch(batch) {
  if (!TOKEN) throw new Error('no token configured')
  const current = await loadCanvas()
  const next = {
    version: 1,
    batches: [...current.batches, batch],
  }
  const res = await fetch(API, {
    method: 'PATCH',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: { [FILENAME]: { content: JSON.stringify(next) } },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`gist save failed: ${res.status} ${body}`)
  }
  return next
}
