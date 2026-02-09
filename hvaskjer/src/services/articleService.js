const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url=',
  'https://api.codetabs.com/v1/proxy?quest='
]

async function fetchWithProxy(url) {
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url)
      const response = await fetch(proxyUrl)
      if (response.ok) {
        return response
      }
    } catch (e) {
      continue
    }
  }
  throw new Error('All CORS proxies failed')
}

const CONTENT_SELECTORS = [
  '[data-main-content]',
  'article',
  '.article-body',
  '.article-content',
  'main',
  '.content'
]

export async function fetchArticleContent(url) {
  const response = await fetchWithProxy(url)
  const html = await response.text()
  return extractContent(html)
}

function extractContent(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Remove unwanted elements
  const unwanted = doc.querySelectorAll('script, style, nav, header, footer, aside, .ad, .ads, .advertisement')
  unwanted.forEach(el => el.remove())

  // Try each selector
  for (const selector of CONTENT_SELECTORS) {
    const element = doc.querySelector(selector)
    if (element) {
      const paragraphs = element.querySelectorAll('p')
      if (paragraphs.length > 0) {
        return Array.from(paragraphs)
          .map(p => p.textContent.trim())
          .filter(text => text.length > 0)
          .join('\n\n')
      }

      // Fallback to all text content
      const text = element.textContent.trim()
      if (text.length > 100) {
        return text
      }
    }
  }

  return 'Kunne ikke hente artikkelinnhold.'
}
