import { useState, useEffect, useRef } from 'react'
import './App.css'

// Simple hash function for todo text
const hashText = (text) => {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

// Map of filename to gist ID (keep this secret!)
const GIST_MAP = {
  'catjo': 'bf00c9605fd01b610fb0db24d667ee64',
  // Add more users here: 'username': 'gist_id'
}

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN

function App() {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const inputRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  // Get user from URL parameter (e.g., /liste?user=catjo)
  const urlParams = new URLSearchParams(window.location.search)
  const user = urlParams.get('user')
  const gistId = user ? GIST_MAP[user] : null
  const filename = user ? `${user}.json` : null

  // If no user selected, show user selection screen
  if (!user) {
    const availableUsers = Object.keys(GIST_MAP)
    
    const handleUserSelect = (e) => {
      const selectedUser = e.target.value
      if (selectedUser) {
        const params = new URLSearchParams()
        params.set('user', selectedUser)
        window.location.search = params.toString()
      }
    }

    return (
      <div className="todo-app" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2>hvem der?</h2>
        <select 
          onChange={handleUserSelect}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            color: 'var(--primary-color)',
            background: 'transparent',
            border: '1px solid var(--primary-color)',
            borderRadius: '4px',
            cursor: 'pointer',
            minWidth: '200px'
          }}
          defaultValue=""
        >
          <option value="" disabled>select...</option>
          {availableUsers.map(username => (
            <option key={username} value={username}>{username}</option>
          ))}
        </select>
      </div>
    )
  }

  // Get user from URL parameter (e.g., /liste?user=catjo)

  // Load todos from gist on mount
  useEffect(() => {
    if (gistId) {
      fetchTodos()
    } else {
      setError(`User "${user}" not found`)
      setLoading(false)
    }
  }, [user])

  // Save todos to gist whenever they change (debounced)
  useEffect(() => {
    if (!loading && !error && todos.length >= 0) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      // Set new timeout to save after 500ms
      saveTimeoutRef.current = setTimeout(() => {
        saveTodos()
      }, 500)
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [todos, loading, error])

  useEffect(() => {
    const handleClick = () => {
      inputRef.current?.focus()
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const fetchTodos = async () => {
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: GITHUB_TOKEN ? {
          'Authorization': `token ${GITHUB_TOKEN}`,
        } : {}
      })
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }
      const data = await response.json()
      const content = data.files[filename]?.content
      if (content) {
        setTodos(JSON.parse(content))
      }
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch todos:', err)
      setError('Failed to load todos')
      setLoading(false)
    }
  }

  const saveTodos = async () => {
    if (!GITHUB_TOKEN) {
      console.warn('No GitHub token available')
      return
    }

    try {
      setSaving(true)

      // Fetch remote to merge
      const fetchResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
      })

      let mergedTodos = todos
      let remoteContent = null
      if (fetchResponse.ok) {
        const data = await fetchResponse.json()
        remoteContent = data.files[filename]?.content
        if (remoteContent) {
          const remoteTodos = JSON.parse(remoteContent)
          // Build map of local todos by hash
          const localByHash = new Map()
          todos.forEach(todo => {
            const id = todo.id || hashText(todo.thing)
            localByHash.set(id, todo)
          })
          // Add remote items not in local
          remoteTodos.forEach(todo => {
            const id = todo.id || hashText(todo.thing)
            if (!localByHash.has(id)) {
              localByHash.set(id, { ...todo, id })
            }
          })
          // Ensure all todos have ids
          mergedTodos = Array.from(localByHash.values()).map(todo => ({
            ...todo,
            id: todo.id || hashText(todo.thing)
          }))
        }
      }

      // Skip save if no changes
      const newContent = JSON.stringify(mergedTodos, null, 2)
      if (newContent === remoteContent) {
        return
      }

      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [filename]: {
              content: JSON.stringify(mergedTodos, null, 2)
            }
          }
        })
      })

      if (!response.ok) {
        console.error('Failed to save to gist:', await response.text())
      } else if (mergedTodos !== todos) {
        // Update local state with merged data
        setTodos(mergedTodos)
      }
    } catch (err) {
      console.error('Failed to save todos:', err)
    } finally {
      setSaving(false)
    }
  }

  const addTodo = () => {
    if (input.trim()) {
      const thing = input.trim()
      setTodos([...todos, { id: hashText(thing), thing, done: false }])
      setInput('')
    }
  }

  const toggleTodo = (index) => {
    setTodos(todos.map((todo, i) => 
      i === index ? { ...todo, done: !todo.done } : todo
    ))
  }

  const deleteTodo = (index) => {
    setTodos(todos.filter((_, i) => i !== index))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchTodos(),
      new Promise(r => setTimeout(r, 500))
    ])
    setRefreshing(false)
  }

  if (loading) return <div className="todo-app">Loading...</div>
  if (error) return <div className="todo-app">{error}</div>

  return (
    <>
      <div className="todo-app">
        <ul className="todo-list">
          {todos.map((todo, index) => (
            <li key={todo.id || index} className={todo.done ? 'completed' : ''}>
              <span onClick={() => toggleTodo(index)}>{todo.thing}</span>
              <button onClick={() => deleteTodo(index)}>×</button>
            </li>
          ))}
        </ul>
        <form className="todo-input" onSubmit={(e) => { e.preventDefault(); addTodo(); }}>
          <input
            id="todo-input"
            name="todo-input"
            ref={inputRef}
            type="text"
            placeholder="..."
            enterKeyHint="done"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                addTodo()
              }
            }}
          />
        </form>
      </div>
      {refreshing ? (
        <img src="/liste/boris.PNG" alt="loading" className="refresh-boris" />
      ) : (
        <button className="refresh-btn" onClick={handleRefresh}>
          ♵
        </button>
      )}
    </>
  )
}

export default App
