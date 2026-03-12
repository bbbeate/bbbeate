import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

function parseRemote() {
  const md = fs.readFileSync(path.resolve(import.meta.dirname, 'boomblaster.md'), 'utf-8')
  const lines = md.split('\n')

  const config = {}
  const buttons = {}
  let currentButton = null

  for (const line of lines) {
    const deviceMatch = line.match(/^device:\s*(.+)/)
    const carrierMatch = line.match(/^carrier:\s*(\d+)/)
    const dutyMatch = line.match(/^duty:\s*(\d+)/)
    const protocolMatch = line.match(/^protocol:\s*(.+)/)
    const buttonMatch = line.match(/^## (.+)/)
    const codeMatch = line.match(/`sudo ir-ctl .+-S .+:(0x[0-9A-Fa-f]+)`/)

    if (deviceMatch) config.device = deviceMatch[1].trim()
    else if (carrierMatch) config.carrier = parseInt(carrierMatch[1])
    else if (dutyMatch) config.duty = parseInt(dutyMatch[1])
    else if (protocolMatch) config.protocol = protocolMatch[1].trim()
    else if (buttonMatch) currentButton = buttonMatch[1].trim()
    else if (codeMatch && currentButton) {
      buttons[currentButton] = codeMatch[1]
      currentButton = null
    }
  }

  return { ...config, buttons }
}

export function boomBlasterApi() {
  return {
    name: 'boomBlaster-api',
    configureServer(server) {
      server.middlewares.use('/api/boomBlaster', (req, res) => {
        const command = req.url.replace(/^\//, '')
        const remote = parseRemote()

        if (!command && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ buttons: Object.keys(remote.buttons) }))
          return
        }

        if (command && req.method === 'POST') {
          const code = remote.buttons[command]
          if (!code) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: `unknown command: ${command}` }))
            return
          }

          const cmd = `sudo ir-ctl -d ${remote.device} -c ${remote.carrier} -D ${remote.duty} -S ${remote.protocol}:${code}`

          try {
            execSync(cmd)
            console.log(`boomblaster: ${command}`)
            res.end(JSON.stringify({ ok: true, command }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
          return
        }

        res.statusCode = 405
        res.end('method not allowed')
      })
    }
  }
}
