const CORS_PROXY = 'https://bbbeate-cors.beatebog.workers.dev/?url='

export async function fetchFeed(feedUrl, source) {
  const response = await fetch(CORS_PROXY + encodeURIComponent(feedUrl))
  const xml = await response.text()
  return parseRss(xml, source)
}

// fetch all feeds in parallel, stream results as each completes
export async function fetchAllFeeds(feeds, onItems) {
  const allItems = []

  // start all fetches in parallel
  const promises = feeds.map(async (feed) => {
    try {
      const items = await fetchFeed(feed.url, feed.source)
      // add to results and notify UI as each feed completes
      allItems.push(...items)
      if (onItems) onItems([...allItems])
      return items
    } catch (err) {
      console.error(`feed ${feed.source} failed:`, err)
      return []
    }
  })

  await Promise.all(promises)
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
