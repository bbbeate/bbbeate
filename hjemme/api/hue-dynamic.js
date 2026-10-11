import https from 'https'
import { hexToXy } from '../src/color.js'

const MIN_SPEED = 2
const MAX_COLORS = 5

function hueClient(bridgeIp, username) {
  if (!bridgeIp || !username) throw new Error('VITE_HUE_BRIDGE_IP and VITE_HUE_USERNAME must be set')
  return (path, body) => new Promise((resolve, reject) => {
    const req = https.request({
      host: bridgeIp,
      path: `/clip/v2/resource${path}`,
      method: 'PUT',
      rejectUnauthorized: false,
      headers: { 'hue-application-key': username, 'Content-Type': 'application/json' }
    }, res => {
      res.resume()
      res.on('end', resolve)
    })
    req.on('error', reject)
    req.end(JSON.stringify(body))
  })
}

function parseConfig(raw) {
  const { colors, targets, speed, brightness } = raw
  if (!Array.isArray(colors) || colors.length < 2 || colors.length > MAX_COLORS) throw new Error(`need 2-${MAX_COLORS} colors`)
  if (!Array.isArray(targets) || targets.length === 0) throw new Error('need at least one target')
  if (!Number.isFinite(speed) || speed < MIN_SPEED) throw new Error(`speed must be >= ${MIN_SPEED}`)
  if (!Number.isFinite(brightness) || brightness < 1 || brightness > 100) throw new Error('brightness must be 1-100')
  return { xys: colors.map(hexToXy), targets, speed, brightness }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch (e) { reject(e) }
    })
  })
}

export function hueDynamicApi() {
  return {
    name: 'hue-dynamic-api',
    configureServer(server) {
      const put = hueClient(server.config.env.VITE_HUE_BRIDGE_IP, server.config.env.VITE_HUE_USERNAME)
      let config = null
      let timer = null
      let step = 0

      const tick = () => {
        const { xys, targets, speed, brightness } = config
        targets.forEach((rid, i) => {
          put(`/grouped_light/${rid}`, {
            on: { on: true },
            dimming: { brightness },
            color: { xy: xys[(step + i) % xys.length] },
            dynamics: { duration: speed * 1000 }
          }).catch(e => console.error('hue-dynamic:', e.message))
        })
        step++
        timer = setTimeout(tick, speed * 1000)
      }

      const stop = () => {
        clearTimeout(timer)
        timer = null
        config = null
      }

      server.middlewares.use('/api/dynamic', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          res.end(JSON.stringify({ running: config !== null, targets: config?.targets ?? [] }))
        } else if (req.method === 'POST') {
          try {
            const wasRunning = config !== null
            config = parseConfig(await readJson(req))
            if (!wasRunning) tick()
            res.end(JSON.stringify({ running: true }))
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: e.message }))
          }
        } else if (req.method === 'DELETE') {
          stop()
          res.end(JSON.stringify({ running: false }))
        } else {
          res.statusCode = 405
          res.end('method not allowed')
        }
      })
    }
  }
}
