import fs from 'fs'
import path from 'path'

const settingsFile = path.resolve(import.meta.dirname, '..', 'hue_settings.json')

export function hueSettingsApi() {
  return {
    name: 'hue-settings-api',
    configureServer(server) {
      server.middlewares.use('/api/settings', (req, res) => {
        if (req.method === 'GET') {
          try {
            const data = fs.existsSync(settingsFile) ? fs.readFileSync(settingsFile, 'utf-8') : '{}'
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch {
            res.end('{}')
          }
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            fs.writeFileSync(settingsFile, body)
            res.end('ok')
          })
        }
      })
    }
  }
}
