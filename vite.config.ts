import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { IncomingMessage } from 'http'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** Dev-only same-origin proxy so the browser never talks to api.groq.com (CORS). */
function groqDevProxy(): Plugin {
  return {
    name: 'groq-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/groq') return next()

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        // Prefer process.env (Vite already loaded .env.local) then loadEnv
        const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '')
        const apiKey = (
          process.env.GROQ_API_KEY ||
          process.env.VITE_GROQ_API_KEY ||
          env.GROQ_API_KEY ||
          env.VITE_GROQ_API_KEY ||
          ''
        ).trim()
        if (!apiKey) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: 'Groq is not configured. Add VITE_GROQ_API_KEY (or GROQ_API_KEY) to .env.local and restart.',
          }))
          return
        }

        try {
          const raw = await readBody(req)
          const body = raw ? JSON.parse(raw) : {}
          const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: body?.model || 'llama-3.3-70b-versatile',
              messages: body?.messages || [],
              temperature: body?.temperature ?? 0.6,
              max_tokens: body?.max_tokens ?? 700,
            }),
          })
          const text = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/json')
          // Normalize nested Groq errors so the client always gets a string `error`
          if (!upstream.ok) {
            try {
              const parsed = JSON.parse(text)
              const nested = parsed?.error
              let message =
                typeof nested === 'string'
                  ? nested
                  : nested?.message || parsed?.message || text

              // Cloudflare geo / network blocks often return bare "Forbidden" (not a bad key)
              if (
                upstream.status === 403 &&
                String(message).toLowerCase() === 'forbidden'
              ) {
                message =
                  'Groq blocked this network (HTTP 403 Forbidden). Your API key is probably fine — this usually means your region/ISP is blocked by Cloudflare. Fixes: use a VPN, or deploy to Vercel so /api/groq runs from a US server.'
              }

              res.end(JSON.stringify({ error: message, status: upstream.status, raw: nested || parsed }))
              return
            } catch {
              if (upstream.status === 403 && (!text || /forbidden/i.test(text))) {
                res.end(JSON.stringify({
                  error:
                    'Groq blocked this network (HTTP 403 Forbidden). Try a VPN, or use the deployed Vercel /api/groq proxy.',
                  status: 403,
                }))
                return
              }
            }
          }
          res.end(text)
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to reach Groq'
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message }))
        }
      })
    },
  }
}

/** Dev adapter for Vercel-style /api/push so closed-app delivery works in local testing. */
function pushDevProxy(): Plugin {
  return {
    name: 'push-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/push' && url !== '/api/push-hook') return next()

        const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '')
        for (const [k, v] of Object.entries(env)) {
          if (process.env[k] === undefined) process.env[k] = v
        }

        try {
          const raw = await readBody(req)
          const body = raw ? JSON.parse(raw) : {}
          const handlerMod = url === '/api/push-hook'
            ? await import('./api/push-hook.js')
            : await import('./api/push.js')
          const handler = handlerMod.default

          const fakeReq = {
            method: req.method || 'POST',
            headers: req.headers,
            body,
          }
          const fakeRes = {
            statusCode: 200,
            headers: {} as Record<string, string>,
            setHeader(k: string, v: string) {
              this.headers[k] = v
            },
            status(code: number) {
              this.statusCode = code
              return this
            },
            json(payload: unknown) {
              res.statusCode = this.statusCode
              for (const [k, v] of Object.entries(this.headers)) res.setHeader(k, v)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(payload))
            },
            end(payload?: string) {
              res.statusCode = this.statusCode
              for (const [k, v] of Object.entries(this.headers)) res.setHeader(k, v)
              res.end(payload ?? '')
            },
          }

          await handler(fakeReq, fakeRes)
        } catch (e: unknown) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Push proxy failed' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), groqDevProxy(), pushDevProxy()],
  envDir: '.',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
