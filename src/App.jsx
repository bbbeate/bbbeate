import { useState, useEffect, useRef } from 'react'
import './App.css'

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
        window.location.href = `/bbbeate/liste/?user=${selectedUser}`
      }
    }

    return (
      <div className="todo-app" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2>who are you</h2>
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
    if (!loading && todos.length >= 0) {
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
  }, [todos, loading])

  useEffect(() => {
    const handleClick = () => {
      inputRef.current?.focus()
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const fetchTodos = async () => {
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`)
      const data = await response.json()
      const content = data.files[filename]?.content
      if (content) {
        setTodos(JSON.parse(content))
      }
      setLoading(false)
    } catch (err) {
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
      
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [filename]: {
              content: JSON.stringify(todos, null, 2)
            }
          }
        })
      })
      
      if (!response.ok) {
        console.error('Failed to save to gist:', await response.text())
      }
    } catch (err) {
      console.error('Failed to save todos:', err)
    } finally {
      setSaving(false)
    }
  }

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { thing: input, done: false }])
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  if (loading) return <div className="todo-app">Loading...</div>
  if (error) return <div className="todo-app">{error}</div>

  return (
    <>
      <div className="todo-app">
        <ul className="todo-list">
          {todos.map((todo, index) => (
            <li key={index} className={todo.done ? 'completed' : ''}>
              <span onClick={() => toggleTodo(index)}>{todo.thing}</span>
              <button onClick={() => deleteTodo(index)}>×</button>
            </li>
          ))}
        </ul>
        <div className="todo-input">
          <input 
            ref={inputRef}
            type="text" 
            placeholder="..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
      </div>
    </>
  )
}

export default App
