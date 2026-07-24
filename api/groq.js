/**
 * Vercel serverless proxy → Groq (keeps API key off the browser, avoids CORS).
 * Env: GROQ_API_KEY (preferred) or VITE_GROQ_API_KEY
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '').trim()
  if (!apiKey) {
    res.status(503).json({
      error: 'Groq is not configured. Set GROQ_API_KEY (or VITE_GROQ_API_KEY) in Vercel env.',
    })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
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
    if (!upstream.ok) {
      try {
        const parsed = JSON.parse(text)
        const nested = parsed?.error
        const message =
          typeof nested === 'string'
            ? nested
            : nested?.message || parsed?.message || text
        res.status(upstream.status).json({ error: message, status: upstream.status })
        return
      } catch {
        /* fall through */
      }
    }
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text)
  } catch (e) {
    res.status(502).json({ error: e?.message || 'Failed to reach Groq' })
  }
}
