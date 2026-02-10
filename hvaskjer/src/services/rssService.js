const CORS_PROXY = 'https://bbbeate-cors.beatebog.workers.dev/?url='

export async function fetchFeed(feedUrl, source) {
  const response = await fetch(CORS_PROXY + encodeURIComponent(feedUrl))
  const xml = await response.text()
  return parseRss(xml, source)
}

export async function fetchAllFeeds(feeds) {
  const results = await Promise.allSettled(
    feeds.map(feed => fetchFeed(feed.url, feed.source))
  )

  const allItems = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(`Feed ${feeds[i].source}: ${r.value.length} items`)
      allItems.push(...r.value)
    } else {
      console.error(`Feed ${feeds[i].source} FAILED:`, r.reason)
    }
  })

  console.log(`Total items from ${feeds.length} feeds: ${allItems.length}`)
  return allItems
}

function parseRss(xml, source) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  const items = doc.querySelectorAll('item')

  return Array.from(items).map(item => {
    const title = item.querySelector('title')?.textContent || ''
    const description = item.querySelector('description')?.textContent || ''
    const link = item.querySelector('link')?.textContent || ''
    // Try pubDate first, then dc:date (used by Stortinget)
    const pubDate = item.querySelector('pubDate')?.textContent ||
                    item.getElementsByTagName('dc:date')[0]?.textContent || ''
    const guid = item.querySelector('guid')?.textContent || link

    return {
      id: guid,
      title: cleanHtml(title),
      description: cleanHtml(description),
      link,
      pubDate: pubDate ? new Date(pubDate) : null,
      source
    }
  })
}

function cleanHtml(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html')
  return doc.body.textContent || ''
}
