export default {
  async fetch(request) {
    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400 })
    }

    // Allowed domains
    const allowed = ['nrk.no', 'www.nrk.no', 'stortinget.no', 'www.stortinget.no', 'regjeringen.no', 'www.regjeringen.no']
    const target = new URL(targetUrl)
    if (!allowed.some(domain => target.hostname.endsWith(domain))) {
      return new Response('Domain not allowed', { status: 403 })
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; hvaskjer/1.0)'
      }
    })

    const body = await response.text()

    return new Response(body, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': response.headers.get('Content-Type') || 'text/plain',
        'Cache-Control': 'public, max-age=300'
      }
    })
  }
}
