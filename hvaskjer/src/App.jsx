import { useState, useEffect } from 'react'
import { FEEDS } from './config/feeds'
import { fetchAllFeeds } from './services/rssService'
import { fetchArticleContent } from './services/articleService'
import { categorizeHeadlines, analyzeCategory, answerQuestion } from './services/mistralService'
import './App.css'

function formatDate(date) {
  if (!date) return ''
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / 86400000)

  if (days < 1) return 'i dag'
  if (days === 1) return 'i går'
  if (days < 7) return `${days}d siden`

  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }).toLowerCase()
}

function NewsItem({ item, isExpanded, onToggle, delay }) {
  return (
    <li className="news-item" style={{ animationDelay: `${delay}ms` }}>
      <div className="news-header" onClick={onToggle}>
        <div className="news-meta">
          <span className="news-source">{item.source.toLowerCase()}</span>
          {item.pubDate && <span>{formatDate(item.pubDate)}</span>}
          <span className="expand-indicator">{isExpanded ? 'v' : '>'}</span>
        </div>
        <h2 className="news-title">{item.title.toLowerCase()}</h2>
      </div>

      {isExpanded && (
        <div className="news-content">
          {item.content ? (
            <>
              {item.content.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-link">
                les mer -->
              </a>
            </>
          ) : (
            <p className="loading-text">henter...</p>
          )}
        </div>
      )}
    </li>
  )
}

function ThinkingIndicator({ text }) {
  return (
    <div className="thinking">
      <pre className="thinking-ascii">{`
    . · *
  ·  *  ·
    * · .
      `}</pre>
      <span>{text}</span>
    </div>
  )
}

const CORRECT_PASS = import.meta.env.VITE_HVA_SKJER_PASS

function App() {
  const [authenticated, setAuthenticated] = useState(() =>
    sessionStorage.getItem('hvaskjer-auth') === 'true'
  )
  const [password, setPassword] = useState('')
  const [passError, setPassError] = useState(false)

  const [allItems, setAllItems] = useState([])
  const [feedsLoaded, setFeedsLoaded] = useState(0)
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryItems, setCategoryItems] = useState([])
  const [categorySummary, setCategorySummary] = useState(null)

  const [phase, setPhase] = useState('idle') // idle, fetching, thinking, done
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [askingQuestion, setAskingQuestion] = useState(false)

  useEffect(() => {
    if (authenticated) {
      loadNews()
    }
  }, [authenticated])

  function handleLogin(e) {
    e.preventDefault()
    if (password === CORRECT_PASS) {
      sessionStorage.setItem('hvaskjer-auth', 'true')
      setAuthenticated(true)
      setPassError(false)
    } else {
      setPassError(true)
    }
  }

  async function loadNews() {
    try {
      setPhase('fetching')
      setError(null)
      setAllItems([])

      // stream items as feeds load
      const items = await fetchAllFeeds(FEEDS, (currentItems) => {
        setAllItems(currentItems)
      })

      setPhase('thinking')
      const { categories: cats, summary: sum } = await categorizeHeadlines(items)
      setCategories(cats)
      setSummary(sum)
      setPhase('done')

    } catch (err) {
      setError('noe gikk galt. prøv igjen.')
      console.error('load error:', err)
      setPhase('idle')
    }
  }

  async function handleCategoryClick(category) {
    setSelectedCategory(category)
    setLoadingCategory(true)
    setCategorySummary(null)
    setExpandedId(null)

    const itemsInCategory = category.articleIds
      .filter(id => id >= 0 && id < allItems.length)
      .map(id => allItems[id])

    const itemsWithContent = await Promise.all(
      itemsInCategory.map(async (item) => {
        if (item.content) return item
        try {
          const content = await fetchArticleContent(item.link)
          return { ...item, content }
        } catch (err) {
          return { ...item, content: null }
        }
      })
    )

    const { ranked, summary } = await analyzeCategory(itemsWithContent)
    setCategoryItems(ranked)
    setCategorySummary(summary)
    setLoadingCategory(false)
  }

  function handleBack() {
    setSelectedCategory(null)
    setCategoryItems([])
    setCategorySummary(null)
  }

  function handleToggle(item) {
    setExpandedId(expandedId === item.id ? null : item.id)
  }

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim() || askingQuestion) return

    setAskingQuestion(true)
    setAnswer(null)
    try {
      const items = selectedCategory ? categoryItems : allItems.slice(0, 20)
      const result = await answerQuestion(question, items)
      setAnswer(result)
    } catch (err) {
      setAnswer('klarte ikke svare.')
    } finally {
      setAskingQuestion(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="app">
        <div className="disco-float" />
        <div className="login-screen">
          <h1>hvaskjer</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="pass-input"
              placeholder="passord"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className="pass-button">inn</button>
          </form>
          {passError && <p className="pass-error">feil passord</p>}
        </div>
      </div>
    )
  }

  if (phase === 'fetching' || phase === 'thinking') {
    // group items by source for display
    const sourceCount = {}
    allItems.forEach(item => {
      sourceCount[item.source] = (sourceCount[item.source] || 0) + 1
    })

    return (
      <div className="app">
        <div className="disco-float" />
        <header className="header">
          <h1>hvaskjer</h1>
        </header>

        <div className="loading-status">
          {phase === 'fetching' && (
            <p className="status-text">henter feeds... {allItems.length} saker</p>
          )}
          {phase === 'thinking' && (
            <p className="status-text">mistral analyserer {allItems.length} overskrifter...</p>
          )}

          {Object.keys(sourceCount).length > 0 && (
            <div className="source-counts">
              {Object.entries(sourceCount).map(([source, count]) => (
                <span key={source} className="source-count-item">
                  {source.toLowerCase()}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="incoming-items">
          {allItems.slice(-15).reverse().map((item, i) => (
            <div key={item.id} className="incoming-item" style={{ animationDelay: `${i * 30}ms` }}>
              <span className="incoming-source">{item.source.toLowerCase()}</span>
              {item.title.toLowerCase().slice(0, 70)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">{error}</div>
      </div>
    )
  }

  if (selectedCategory) {
    return (
      <div className="app">
        <div className="disco-float" />
        <header className="header">
          <button className="back-button" onClick={handleBack}>&lt;-- tilbake</button>
          <h1>{selectedCategory.symbol} {selectedCategory.name}</h1>
        </header>

        {loadingCategory ? (
          <ThinkingIndicator text={`analyserer ${selectedCategory.name}...`} />
        ) : (
          <>
            {categorySummary && (
              <div className="summary-box">
                <p>{categorySummary}</p>
              </div>
            )}

            <form className="ask-form" onSubmit={handleAsk}>
              <input
                type="text"
                className="ask-input"
                placeholder="spør om denne kategorien..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                disabled={askingQuestion}
              />
              <button type="submit" className="ask-button" disabled={askingQuestion || !question.trim()}>
                {askingQuestion ? '...' : '?'}
              </button>
            </form>

            {answer && <div className="answer-box"><p>{answer}</p></div>}

            <ul className="news-list">
              {categoryItems.map((item, i) => (
                <NewsItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  onToggle={() => handleToggle(item)}
                  delay={i * 80}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <div className="disco-float" />
      <header className="header">
        <h1>hvaskjer</h1>
        <p className="item-count">{allItems.length} saker // {FEEDS.length} kilder</p>
      </header>

      {summary && (
        <div className="summary-box">
          <p>{summary}</p>
        </div>
      )}

      <div className="categories">
        {categories.map((cat, i) => (
          <button
            key={i}
            className="category-button"
            onClick={() => handleCategoryClick(cat)}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="cat-symbol">{cat.symbol || '//'}</span>
            {cat.name}
            <span className="category-count">{cat.articleIds.length}</span>
          </button>
        ))}
      </div>

      <form className="ask-form" onSubmit={handleAsk}>
        <input
          type="text"
          className="ask-input"
          placeholder="spør om nyhetene..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={askingQuestion}
        />
        <button type="submit" className="ask-button" disabled={askingQuestion || !question.trim()}>
          {askingQuestion ? '...' : '?'}
        </button>
      </form>

      {answer && <div className="answer-box"><p>{answer}</p></div>}
    </div>
  )
}

export default App
