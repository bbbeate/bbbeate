const CORS_PROXY = 'https://corsproxy.io/?'

export async function fetchFeed(feedUrl) {
  const proxyUrl = CORS_PROXY + encodeURIComponent(feedUrl)
  const response = await fetch(proxyUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status}`)
  }

  const xml = await response.text()
  return parseRss(xml)
}

function parseRss(xml) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  const items = doc.querySelectorAll('item')

  return Array.from(items).map(item => {
    const title = item.querySelector('title')?.textContent || ''
    const description = item.querySelector('description')?.textContent || ''
    const link = item.querySelector('link')?.textContent || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''
    const guid = item.querySelector('guid')?.textContent || link

    return {
      id: guid,
      title: cleanHtml(title),
      description: cleanHtml(description),
      link,
      pubDate: pubDate ? new Date(pubDate) : new Date()
    }
  })
}

function cleanHtml(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html')
  return doc.body.textContent || ''
}
