const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
const MODEL = 'mistral-small-latest'

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ message: 'method not allowed' }), { status: 405 })
    }
    let payload
    try {
      payload = await request.json()
    } catch {
      return new Response(JSON.stringify({ message: 'invalid json' }), { status: 400 })
    }
    if (!Array.isArray(payload.messages)) {
      return new Response(JSON.stringify({ message: 'messages required' }), { status: 400 })
    }
    const res = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: payload.messages,
        temperature: payload.temperature ?? 0.7
      })
    })
    const headers = new Headers({ 'Content-Type': 'application/json' })
    const retryAfter = res.headers.get('retry-after')
    if (retryAfter) headers.set('retry-after', retryAfter)
    return new Response(res.body, { status: res.status, headers })
  }
}
