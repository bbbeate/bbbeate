const CORS_PROXY = 'https://bbbeate-cors.beatebog.workers.dev/?url='

export async function fetchFeed(feedUrl, source) {
  const response = await fetch(CORS_PROXY + encodeURIComponent(feedUrl))
  const xml = await response.text()
  return parseRss(xml, source)
}

// streams items as each feed loads via onItems callback
export async function fetchAllFeeds(feeds, onItems) {
  const allItems = []

  // fetch feeds one by one so we can stream results
  for (const feed of feeds) {
    try {
      const items = await fetchFeed(feed.url, feed.source)
      allItems.push(...items)
      // callback with current items so ui can update
      if (onItems) onItems([...allItems])
    } catch (err) {
      console.error(`feed ${feed.source} failed:`, err)
    }
  }

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
