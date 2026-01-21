import { useState, useEffect, useRef } from 'react'
import './App.css'

// Parse gist content - handles both old array format and new {nextId, todos} format
const parseGistContent = (content) => {
  const data = JSON.parse(content)
  if (Array.isArray(data)) {
    // Old format: migrate to new format with nextId
    const maxId = data.reduce((max, t) => Math.max(max, typeof t.id === 'number' ? t.id : 0), 0)
    return { nextId: maxId + 1, todos: data }
  }
  return data // Already new format: { nextId, todos }
}

const GIST_ID = 'bf00c9605fd01b610fb0db24d667ee64'
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN

// User selection component - fetches available users from gist
function UserSelect() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
          headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
        })
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`)
        const data = await response.json()
        // Extract usernames from filenames (e.g., "catjo.json" -> "catjo")
        const usernames = Object.keys(data.files)
          .filter(f => f.endsWith('.json'))
          .map(f => f.replace('.json', ''))
        setUsers(usernames)
      } catch (err) {
        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleUserSelect = (e) => {
    const selectedUser = e.target.value
    if (selectedUser) {
      const params = new URLSearchParams()
      params.set('user', selectedUser)
      window.location.search = params.toString()
    }
  }

  if (loading) return <div className="todo-app" style={{ textAlign: 'center', paddingTop: '4rem' }}>Loading...</div>
  if (error) return <div className="todo-app" style={{ textAlign: 'center', paddingTop: '4rem' }}>{error}</div>

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
        {users.map(username => (
          <option key={username} value={username}>{username}</option>
        ))}
      </select>
    </div>
  )
}

function App() {
  const [todos, setTodos] = useState([])
  const [nextId, setNextId] = useState(1)
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
  const gistId = GIST_ID
  const filename = user ? `${user}.json` : null

  // If no user selected, show user selection screen
  if (!user) {
    return <UserSelect />
  }

  // Load todos from gist on mount
  useEffect(() => {
    fetchTodos()
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
  }, [todos, nextId, loading, error])

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
        const parsed = parseGistContent(content)
        setTodos(parsed.todos)
        setNextId(parsed.nextId)
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

      let remoteData = { nextId: 1, todos: [] }
      if (fetchResponse.ok) {
        const data = await fetchResponse.json()
        const content = data.files[filename]?.content
        if (content) {
          remoteData = parseGistContent(content)
        }
      }

      // Merge: take higher nextId, merge todos by id
      const mergedNextId = Math.max(nextId, remoteData.nextId)

      // Merge: local todos win, but include NEW remote todos (id >= local nextId)
      // This allows adds from other devices while respecting local deletes
      const localIds = new Set(todos.map(t => t.id))
      const mergedTodos = [
        ...todos,
        ...remoteData.todos.filter(t => !localIds.has(t.id) && t.id >= nextId)
      ]

      const saveData = { nextId: mergedNextId, todos: mergedTodos }
      const newContent = JSON.stringify(saveData, null, 2)

      // Skip save if no changes
      const remoteContent = JSON.stringify(remoteData, null, 2)
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
              content: newContent
            }
          }
        })
      })

      if (!response.ok) {
        console.error('Failed to save to gist:', await response.text())
      } else if (mergedTodos.length !== todos.length || mergedNextId !== nextId) {
        // Update local state with merged data
        setTodos(mergedTodos)
        setNextId(mergedNextId)
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
      setTodos([...todos, { id: nextId, thing, done: false }])
      setNextId(nextId + 1)
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
        <form className="todo-input" action="#" onSubmit={(e) => { e.preventDefault(); addTodo(); }}>
          <input
            id="todo-input"
            name="todo-input"
            ref={inputRef}
            type="text"
            placeholder="..."
            enterKeyHint="done"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" style={{ display: 'none' }} />
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
