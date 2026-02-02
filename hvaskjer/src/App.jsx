import { useState, useEffect } from 'react'
import { FEED_URL } from './config/feeds'
import { fetchFeed } from './services/rssService'
import { fetchArticleContent } from './services/articleService'
import { generateSummary, rewriteHeadlines, answerQuestion } from './services/mistralService'
import './App.css'

function formatDate(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 1) return 'Akkurat nå'
  if (minutes < 60) return `${minutes} min siden`
  if (hours < 24) return `${hours} timer siden`

  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short'
  })
}

function NewsItem({ item, isExpanded, onToggle }) {
  return (
    <li className="news-item">
      <div className="news-header" onClick={onToggle}>
        <div className="news-meta">
          <span>{formatDate(item.pubDate)}</span>
          <span className="expand-indicator">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
        <h2 className="news-title">{item.shortTitle || item.title}</h2>
      </div>

      {isExpanded && (
        <div className="news-content">
          {item.content ? (
            <>
              {item.content.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-link"
              >
                Les på NRK →
              </a>
            </>
          ) : (
            <p className="loading-text">Laster innhold...</p>
          )}
        </div>
      )}
    </li>
  )
}

const CORRECT_PASS = import.meta.env.VITE_HVA_SKJER_PASS

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passError, setPassError] = useState(false)

  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Q&A
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
      setAuthenticated(true)
      setPassError(false)
    } else {
      setPassError(true)
    }
  }

  async function loadNews() {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch RSS feed
      const feedItems = await fetchFeed(FEED_URL)

      // 2. Fetch all article contents in parallel
      const itemsWithContent = await Promise.all(
        feedItems.map(async (item) => {
          try {
            const content = await fetchArticleContent(item.link)
            return { ...item, content }
          } catch (err) {
            console.error('Failed to fetch:', item.link, err)
            return { ...item, content: null }
          }
        })
      )

      setItems(itemsWithContent)
      setLoading(false)

      // 3. Generate AI summary and headlines
      setLoadingAI(true)
      const [summaryResult, rewrittenItems] = await Promise.all([
        generateSummary(itemsWithContent),
        rewriteHeadlines(itemsWithContent)
      ])

      setSummary(summaryResult)
      setItems(rewrittenItems)
      setLoadingAI(false)

    } catch (err) {
      setError('Kunne ikke laste nyheter. Prøv igjen senere.')
      console.error('Load error:', err)
      setLoading(false)
    }
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
      const result = await answerQuestion(question, items)
      setAnswer(result)
    } catch (err) {
      setAnswer('Kunne ikke svare på spørsmålet.')
    } finally {
      setAskingQuestion(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="app">
        <div className="login-screen">
          <h1>hvaskjer</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="pass-input"
              placeholder="Passord"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className="pass-button">Logg inn</button>
          </form>
          {passError && <p className="pass-error">Feil passord</p>}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Laster nyheter...</div>
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

  return (
    <div className="app">
      <header className="header">
        <h1>hvaskjer</h1>
      </header>

      <div className="summary-box">
        {loadingAI ? (
          <p className="loading-text">Analyserer nyheter...</p>
        ) : summary ? (
          <p>{summary}</p>
        ) : (
          <p className="loading-text">Oppsummering ikke tilgjengelig</p>
        )}
      </div>

      <form className="ask-form" onSubmit={handleAsk}>
        <input
          type="text"
          className="ask-input"
          placeholder="Spør om nyhetene, f.eks. 'mer om Trump India-avtalen'"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={askingQuestion}
        />
        <button
          type="submit"
          className="ask-button"
          disabled={askingQuestion || !question.trim()}
        >
          {askingQuestion ? '...' : 'Spør'}
        </button>
      </form>

      {answer && (
        <div className="answer-box">
          <p>{answer}</p>
        </div>
      )}

      <ul className="news-list">
        {items.map(item => (
          <NewsItem
            key={item.id}
            item={item}
            isExpanded={expandedId === item.id}
            onToggle={() => handleToggle(item)}
          />
        ))}
      </ul>
    </div>
  )
}

export default App
