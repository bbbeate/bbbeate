import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const ALL_FILTERS = [
  { id: 'search', label: 'search', type: 'search' },
  { id: 'tempo', label: 'bpm', type: 'range', min: 40, max: 220, step: 1 },
  { id: 'sources', label: 'playlist', type: 'multiselect' },
  { id: 'genres', label: 'genre', type: 'multiselect' },
  { id: 'energy', label: 'energy', type: 'range', min: 0, max: 1, step: 0.05 },
  { id: 'danceability', label: 'dance', type: 'range', min: 0, max: 1, step: 0.05 },
  { id: 'valence', label: 'valence', type: 'range', min: 0, max: 1, step: 0.05 },
  { id: 'acousticness', label: 'acoustic', type: 'range', min: 0, max: 1, step: 0.05 },
  { id: 'instrumentalness', label: 'instrumental', type: 'range', min: 0, max: 1, step: 0.05 },
  { id: 'speechiness', label: 'speech', type: 'range', min: 0, max: 1, step: 0.05 },
  { id: 'liveness', label: 'live', type: 'range', min: 0, max: 1, step: 0.05 },
  { id: 'key', label: 'key', type: 'select', options: KEYS },
  { id: 'popularity', label: 'popularity', type: 'range', min: 0, max: 100, step: 1 },
]

const ALL_COLUMNS = [
  { id: 'name', label: 'name' },
  { id: 'artist', label: 'artist' },
  { id: 'album', label: 'album' },
  { id: 'sources', label: 'playlists' },
  { id: 'genres', label: 'genres' },
  { id: 'bpm', label: 'bpm' },
  { id: 'danceability', label: 'dance' },
  { id: 'energy', label: 'energy' },
  { id: 'valence', label: 'valence' },
  { id: 'acousticness', label: 'acoustic' },
  { id: 'instrumentalness', label: 'instrumental' },
  { id: 'speechiness', label: 'speech' },
  { id: 'liveness', label: 'live' },
  { id: 'popularity', label: 'popularity' },
  { id: 'key', label: 'key' },
]

const DEFAULT_COLUMNS = ['name', 'artist', 'bpm', 'danceability', 'energy', 'valence']

const DEFAULT_FILTERS = {
  search: '',
  tempo: [40, 220],
  energy: [0, 1],
  danceability: [0, 1],
  valence: [0, 1],
  acousticness: [0, 1],
  instrumentalness: [0, 1],
  speechiness: [0, 1],
  liveness: [0, 1],
  popularity: [0, 100],
  key: '',
  sources: [],
  genres: [],
}

function MultiSelect({ options, selected, onChange, label, onClear }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = (options || []).filter(o => 
    o.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (item) => {
    if (selected.includes(item)) {
      onChange(selected.filter(s => s !== item))
    } else {
      onChange([...selected, item])
    }
  }

  return (
    <div className="multiselect" ref={ref}>
      <button className="multiselect-trigger" onClick={() => setOpen(!open)}>
        {selected.length ? `${selected.length} selected` : `any ${label}`}
      </button>
      {selected.length > 0 && onClear && (
        <button className="filter-clear" onClick={onClear}>x</button>
      )}
      {open && (
        <div className="multiselect-dropdown">
          <input
            type="text"
            placeholder="search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="multiselect-search"
            autoFocus
          />
          {selected.length > 0 && (
            <button className="multiselect-clear" onClick={() => onChange([])}>
              clear all
            </button>
          )}
          <div className="multiselect-options">
            {filtered.length === 0 && <div className="multiselect-empty">no options</div>}
            {filtered.map(opt => (
              <label key={opt} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RangeSlider({ min, max, step, value, onChange, onClear, isActive }) {
  const [localMin, localMax] = value || [min, max]
  
  return (
    <div className="range-slider">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={localMin}
        onChange={e => onChange([Number(e.target.value), localMax])}
        placeholder="min"
      />
      <span className="range-dash">-</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={localMax}
        onChange={e => onChange([localMin, Number(e.target.value)])}
        placeholder="max"
      />
      {isActive && onClear && (
        <button className="filter-clear" onClick={onClear}>x</button>
      )}
    </div>
  )
}

function App() {
  const [tracks, setTracks] = useState([])
  const [stats, setStats] = useState(null)
  const [sources, setSources] = useState([])
  const [genres, setGenres] = useState([])

  const [sort, setSort] = useState(() => {
    const saved = localStorage.getItem('musikk-sort')
    return saved || 'name'
  })
  const [detail, setDetail] = useState(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('musikk-columns')
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS
  })
  const [player, setPlayer] = useState(null)
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('musikk-filters')
    return saved ? JSON.parse(saved) : DEFAULT_FILTERS
  })
  
  // selection state
  const [selectedTracks, setSelectedTracks] = useState(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionBox, setSelectionBox] = useState(null)
  const [showCheckboxes, setShowCheckboxes] = useState(false)
  const tracksRef = useRef(null)

  const loadTracks = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.tempo[0] > 40) params.set('tempo_min', filters.tempo[0])
    if (filters.tempo[1] < 220) params.set('tempo_max', filters.tempo[1])
    if (filters.energy[0] > 0) params.set('energy_min', filters.energy[0])
    if (filters.energy[1] < 1) params.set('energy_max', filters.energy[1])
    if (filters.danceability[0] > 0) params.set('danceability_min', filters.danceability[0])
    if (filters.danceability[1] < 1) params.set('danceability_max', filters.danceability[1])
    if (filters.valence[0] > 0) params.set('valence_min', filters.valence[0])
    if (filters.valence[1] < 1) params.set('valence_max', filters.valence[1])
    if (filters.key) params.set('key', filters.key)
    if (filters.sources.length) params.set('sources', filters.sources.join(','))
    if (filters.genres.length) params.set('genres', filters.genres.join(','))
    params.set('sort', sort)
    params.set('limit', '500')

    const res = await fetch('/api/tracks?' + params.toString())
    const data = await res.json()
    setTracks(data)
  }, [filters, sort])

  useEffect(() => {
    loadTracks()
  }, [loadTracks])

  // persist to localStorage
  useEffect(() => {
    localStorage.setItem('musikk-filters', JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    localStorage.setItem('musikk-sort', sort)
  }, [sort])

  useEffect(() => {
    localStorage.setItem('musikk-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    fetch('/api/meta').then(r => r.json()).then(data => {
      setStats(data.stats)
      setSources(data.sources || [])
      setGenres(data.genres || [])
    })
  }, [])

  useEffect(() => {
    const fetchPlayer = () => {
      fetch('/api/player').then(r => r.json()).then(setPlayer).catch(() => {})
    }
    fetchPlayer()
    const interval = setInterval(fetchPlayer, 3000)
    return () => clearInterval(interval)
  }, [])

  const searchInputRef = useRef(null)

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedTracks(new Set(tracks.map(t => t.spotify_id)))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowFilterModal(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      if (e.ctrlKey && !e.metaKey && e.key === 'c') {
        e.preventDefault()
        setFilters(DEFAULT_FILTERS)
      }
      if (e.key === 'Escape') {
        setSelectedTracks(new Set())
        setShowCheckboxes(false)
        setShowFilterModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tracks, selectedTracks])

  const playTrack = async (id) => {
    await fetch(`/api/player/play/${id}`, { method: 'POST' })
  }

  const queueTrack = async (e, id) => {
    e.stopPropagation()
    await fetch(`/api/player/queue/${id}`, { method: 'POST' })
  }

  const togglePlayPause = async () => {
    if (player?.is_playing) {
      await fetch('/api/player/pause', { method: 'POST' })
    } else {
      await fetch('/api/player/resume', { method: 'POST' })
    }
  }

  const skipNext = async () => {
    await fetch('/api/player/next', { method: 'POST' })
  }

  const skipPrev = async () => {
    await fetch('/api/player/prev', { method: 'POST' })
  }

  // selection handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.track-queue') || e.target.closest('button')) return
    if (window.innerWidth <= 600) return // no drag select on mobile
    
    const rect = tracksRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setIsSelecting(true)
    setSelectionStart({ x: e.clientX, y: e.clientY })
    setSelectionBox({ x: e.clientX, y: e.clientY, width: 0, height: 0 })
    setSelectedTracks(new Set())
  }

  const handleMouseMove = (e) => {
    if (!isSelecting || !selectionStart) return
    
    const x = Math.min(e.clientX, selectionStart.x)
    const y = Math.min(e.clientY, selectionStart.y)
    const width = Math.abs(e.clientX - selectionStart.x)
    const height = Math.abs(e.clientY - selectionStart.y)
    
    setSelectionBox({ x, y, width, height })
    
    // find tracks in selection box
    const trackElements = tracksRef.current?.querySelectorAll('.track')
    const selected = new Set()
    
    trackElements?.forEach((el, idx) => {
      const rect = el.getBoundingClientRect()
      if (
        rect.left < x + width &&
        rect.right > x &&
        rect.top < y + height &&
        rect.bottom > y
      ) {
        selected.add(tracks[idx]?.spotify_id)
      }
    })
    
    setSelectedTracks(selected)
  }

  const handleMouseUp = () => {
    setIsSelecting(false)
    setSelectionBox(null)
  }

  const clearSelection = () => {
    setSelectedTracks(new Set())
    setShowCheckboxes(false)
  }

  const toggleTrackSelection = (id) => {
    const newSet = new Set(selectedTracks)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedTracks(newSet)
  }

  const selectAll = () => {
    setSelectedTracks(new Set(tracks.map(t => t.spotify_id)))
  }

  const queueSelected = async () => {
    for (const id of selectedTracks) {
      await fetch(`/api/player/queue/${id}`, { method: 'POST' })
    }
    clearSelection()
  }

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilter = (id) => {
    const def = ALL_FILTERS.find(f => f.id === id)
    if (def) {
      updateFilter(id, DEFAULT_FILTERS[id])
    }
  }

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const toggleColumn = (id) => {
    if (visibleColumns.includes(id)) {
      setVisibleColumns(visibleColumns.filter(c => c !== id))
    } else {
      setVisibleColumns([...visibleColumns, id])
    }
  }

  const showDetail = async (id) => {
    const res = await fetch('/api/tracks/' + id)
    const data = await res.json()
    setDetail(data)
  }

  const parseArtists = (artists) => {
    if (!artists) return ''
    try {
      return JSON.parse(artists).join(', ')
    } catch {
      return artists
    }
  }

  const fmt = (val) => val != null ? Math.round(val * 100) + '%' : '-'

  const formatDuration = (ms) => {
    if (!ms) return '-'
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const isFilterActive = (id) => {
    const def = ALL_FILTERS.find(f => f.id === id)
    if (!def) return false
    if (def.type === 'search') return !!filters.search
    if (def.type === 'multiselect') return filters[id].length > 0
    if (def.type === 'select') return !!filters[id]
    if (def.type === 'range') {
      return filters[id][0] > def.min || filters[id][1] < def.max
    }
    return false
  }

  const activeFilterCount = () => ALL_FILTERS.filter(f => isFilterActive(f.id)).length

  const renderFilter = (filterDef, inModal = false) => {
    const isActive = isFilterActive(filterDef.id)
    
    switch (filterDef.type) {
      case 'search':
        return (
          <div className="filter-item" key={filterDef.id}>
            <label>{filterDef.label}</label>
            <input
              ref={inModal ? searchInputRef : null}
              type="text"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              placeholder=""
            />
            {isActive && (
              <button className="filter-clear" onClick={() => clearFilter('search')}>x</button>
            )}
          </div>
        )
      case 'range':
        return (
          <div className="filter-item" key={filterDef.id}>
            <label>{filterDef.label}</label>
            <RangeSlider
              min={filterDef.min}
              max={filterDef.max}
              step={filterDef.step}
              value={filters[filterDef.id]}
              onChange={val => updateFilter(filterDef.id, val)}
              onClear={() => clearFilter(filterDef.id)}
              isActive={isActive}
            />
          </div>
        )
      case 'multiselect':
        return (
          <div className="filter-item" key={filterDef.id}>
            <label>{filterDef.label}</label>
            <MultiSelect
              options={filterDef.id === 'sources' ? sources : genres}
              selected={filters[filterDef.id]}
              onChange={val => updateFilter(filterDef.id, val)}
              label={filterDef.label}
              onClear={() => clearFilter(filterDef.id)}
            />
          </div>
        )
      case 'select':
        return (
          <div className="filter-item" key={filterDef.id}>
            <label>{filterDef.label}</label>
            <select value={filters.key} onChange={e => updateFilter('key', e.target.value)}>
              <option value="">any</option>
              {filterDef.options.map((k, i) => <option key={i} value={i}>{k}</option>)}
            </select>
            {isActive && (
              <button className="filter-clear" onClick={() => clearFilter('key')}>x</button>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => setShowStats(!showStats)}>musikk</h1>
        <div className="header-actions">
          <button className="header-btn" onClick={() => setShowFilterModal(true)}>
            filters {activeFilterCount() > 0 && `(${activeFilterCount()})`}
          </button>
          <button className="header-btn" onClick={() => setShowColumnPicker(!showColumnPicker)}>
            cols
          </button>
        </div>
      </header>

      {showStats && stats && (
        <div className="stats-panel">
          <div>{stats.total_tracks} tracks</div>
          {stats.last_sync && <div>last sync: {new Date(stats.last_sync).toLocaleString()}</div>}
        </div>
      )}

      {showColumnPicker && (
        <div className="column-picker">
          {ALL_COLUMNS.map(col => (
            <label key={col.id} className="picker-option">
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.id)}
                onChange={() => toggleColumn(col.id)}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}

      {activeFilterCount() > 0 && (
        <div className="active-filters">
          {ALL_FILTERS.filter(f => isFilterActive(f.id)).map(f => (
            <button key={f.id} className="filter-chip" onClick={() => clearFilter(f.id)}>
              {f.label} x
            </button>
          ))}
          {activeFilterCount() > 1 && (
            <button className="filter-chip" onClick={clearAllFilters}>clear all</button>
          )}
        </div>
      )}

      {showFilterModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowFilterModal(false)}
          onKeyDown={e => e.key === 'Enter' && setShowFilterModal(false)}
        >
          <div 
            className="filter-modal" 
            onClick={e => e.stopPropagation()}
            onTouchStart={e => {
              const touch = e.touches[0]
              e.currentTarget.dataset.startY = touch.clientY
            }}
            onTouchEnd={e => {
              const startY = parseFloat(e.currentTarget.dataset.startY)
              const endY = e.changedTouches[0].clientY
              if (endY - startY > 80) setShowFilterModal(false)
            }}
          >
            <div className="modal-handle" />
            <div className="filter-modal-header">
              <h2>filters</h2>
              {activeFilterCount() > 0 && (
                <button className="clear-all-btn" onClick={clearAllFilters}>clear all</button>
              )}
            </div>
            <div className="filter-modal-content">
              {ALL_FILTERS.map(def => renderFilter(def, true))}
            </div>
          </div>
        </div>
      )}

      <div className="header-row">
        <button className="mobile-select-btn" onClick={() => setShowCheckboxes(!showCheckboxes)}>+</button>
        {visibleColumns.includes('name') && (
          <span className={`col-name ${sort === 'name' ? 'sorted' : ''}`} onClick={() => setSort('name')}>name</span>
        )}
        {visibleColumns.includes('artist') && (
          <span className={`col-artist ${sort === 'artists' ? 'sorted' : ''}`} onClick={() => setSort('artists')}>artist</span>
        )}
        {visibleColumns.includes('album') && (
          <span className={`col-album ${sort === 'album_name' ? 'sorted' : ''}`} onClick={() => setSort('album_name')}>album</span>
        )}
        {visibleColumns.includes('sources') && (
          <span className="col-text">playlists</span>
        )}
        {visibleColumns.includes('genres') && (
          <span className="col-text">genres</span>
        )}
        {visibleColumns.includes('bpm') && (
          <span className={`col-bpm ${sort === 'tempo' ? 'sorted' : ''}`} onClick={() => setSort('tempo')}>bpm</span>
        )}
        {visibleColumns.includes('danceability') && (
          <span className={`col-bar ${sort === 'danceability' ? 'sorted' : ''}`} onClick={() => setSort('danceability')}>dance</span>
        )}
        {visibleColumns.includes('energy') && (
          <span className={`col-bar ${sort === 'energy' ? 'sorted' : ''}`} onClick={() => setSort('energy')}>energy</span>
        )}
        {visibleColumns.includes('valence') && (
          <span className={`col-bar ${sort === 'valence' ? 'sorted' : ''}`} onClick={() => setSort('valence')}>valence</span>
        )}
        {visibleColumns.includes('acousticness') && (
          <span className={`col-bar ${sort === 'acousticness' ? 'sorted' : ''}`} onClick={() => setSort('acousticness')}>acoustic</span>
        )}
        {visibleColumns.includes('instrumentalness') && (
          <span className={`col-bar ${sort === 'instrumentalness' ? 'sorted' : ''}`} onClick={() => setSort('instrumentalness')}>instr</span>
        )}
        {visibleColumns.includes('speechiness') && (
          <span className={`col-bar ${sort === 'speechiness' ? 'sorted' : ''}`} onClick={() => setSort('speechiness')}>speech</span>
        )}
        {visibleColumns.includes('liveness') && (
          <span className={`col-bar ${sort === 'liveness' ? 'sorted' : ''}`} onClick={() => setSort('liveness')}>live</span>
        )}
        {visibleColumns.includes('popularity') && (
          <span className={`col-num ${sort === 'popularity' ? 'sorted' : ''}`} onClick={() => setSort('popularity')}>pop</span>
        )}
        {visibleColumns.includes('key') && (
          <span className={`col-key ${sort === 'key' ? 'sorted' : ''}`} onClick={() => setSort('key')}>key</span>
        )}
        <span className="col-queue"></span>
      </div>

      {(selectedTracks.size > 0 || showCheckboxes) && (
        <div className="selection-bar">
          {selectedTracks.size > 0 ? (
            <>
              <span>{selectedTracks.size} selected</span>
              <button onClick={queueSelected}>queue all</button>
              <button onClick={selectAll}>all</button>
              <button onClick={clearSelection}>x</button>
            </>
          ) : (
            <>
              <span>select tracks</span>
              <button onClick={selectAll}>all</button>
              <button onClick={() => setShowCheckboxes(false)}>x</button>
            </>
          )}
        </div>
      )}

      <ul 
        className="tracks" 
        ref={tracksRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {tracks.map(track => (
          <li 
            key={track.spotify_id} 
            className={`track ${selectedTracks.has(track.spotify_id) ? 'selected' : ''}`}
            onClick={() => showCheckboxes ? toggleTrackSelection(track.spotify_id) : (!isSelecting && showDetail(track.spotify_id))}
          >
            {showCheckboxes && (
              <input 
                type="checkbox" 
                className="track-checkbox"
                checked={selectedTracks.has(track.spotify_id)}
                onChange={() => toggleTrackSelection(track.spotify_id)}
                onClick={e => e.stopPropagation()}
              />
            )}
            <div className="track-info">
              {visibleColumns.includes('name') && (
                <span className="track-name" title={track.name}>{track.name}</span>
              )}
              <span className="track-artist-mobile">{parseArtists(track.artists)}</span>
            </div>
            {visibleColumns.includes('artist') && (
              <span className="track-artists" title={parseArtists(track.artists)} onClick={(e) => { e.stopPropagation(); updateFilter('search', parseArtists(track.artists)) }}>{parseArtists(track.artists)}</span>
            )}
            {visibleColumns.includes('album') && (
              <span className="track-album" title={track.album_name} onClick={(e) => { e.stopPropagation(); updateFilter('search', track.album_name) }}>{track.album_name || '-'}</span>
            )}
            {visibleColumns.includes('sources') && (
              <span className="track-text" title={track.sources ? JSON.parse(track.sources).filter(s => !s.startsWith('album:')).join(', ') : ''} onClick={e => e.stopPropagation()}>
                {track.sources ? JSON.parse(track.sources).filter(s => !s.startsWith('album:')).map((src, i, arr) => (
                  <span key={src}>
                    <span className="track-link" onClick={() => updateFilter('sources', [...new Set([...filters.sources, src])])}>{src}</span>
                    {i < arr.length - 1 && ', '}
                  </span>
                )) : '-'}
              </span>
            )}
            {visibleColumns.includes('genres') && (
              <span className="track-text" title={track.genres ? JSON.parse(track.genres).join(', ') : ''} onClick={e => e.stopPropagation()}>
                {track.genres ? JSON.parse(track.genres).map((g, i, arr) => (
                  <span key={g}>
                    <span className="track-link" onClick={() => updateFilter('genres', [...new Set([...filters.genres, g])])}>{g}</span>
                    {i < arr.length - 1 && ', '}
                  </span>
                )) : '-'}
              </span>
            )}
            {visibleColumns.includes('bpm') && (
              <span className="track-bpm" onClick={(e) => { e.stopPropagation(); const bpm = Math.round(track.tempo); updateFilter('tempo', [bpm, bpm]) }}>{track.tempo ? Math.round(track.tempo) : '-'}</span>
            )}
            {visibleColumns.includes('danceability') && (
              <div className="bar" onClick={(e) => { e.stopPropagation(); updateFilter('danceability', [track.danceability, track.danceability]) }}>
                <div className="bar-fill" style={{ width: `${(track.danceability || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('energy') && (
              <div className="bar" onClick={(e) => { e.stopPropagation(); updateFilter('energy', [track.energy, track.energy]) }}>
                <div className="bar-fill" style={{ width: `${(track.energy || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('valence') && (
              <div className="bar" onClick={(e) => { e.stopPropagation(); updateFilter('valence', [track.valence, track.valence]) }}>
                <div className="bar-fill" style={{ width: `${(track.valence || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('acousticness') && (
              <div className="bar" onClick={(e) => { e.stopPropagation(); updateFilter('acousticness', [track.acousticness, track.acousticness]) }}>
                <div className="bar-fill" style={{ width: `${(track.acousticness || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('instrumentalness') && (
              <div className="bar" onClick={(e) => { e.stopPropagation(); updateFilter('instrumentalness', [track.instrumentalness, track.instrumentalness]) }}>
                <div className="bar-fill" style={{ width: `${(track.instrumentalness || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('speechiness') && (
              <div className="bar" onClick={(e) => { e.stopPropagation(); updateFilter('speechiness', [track.speechiness, track.speechiness]) }}>
                <div className="bar-fill" style={{ width: `${(track.speechiness || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('liveness') && (
              <div className="bar" onClick={(e) => { e.stopPropagation(); updateFilter('liveness', [track.liveness, track.liveness]) }}>
                <div className="bar-fill" style={{ width: `${(track.liveness || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('popularity') && (
              <span className="track-num" onClick={(e) => { e.stopPropagation(); updateFilter('popularity', [track.popularity, track.popularity]) }}>{track.popularity || '-'}</span>
            )}
            {visibleColumns.includes('key') && (
              <span className="track-key" onClick={(e) => { e.stopPropagation(); updateFilter('key', String(track.key)) }}>{track.key != null ? KEYS[track.key] : '-'}</span>
            )}
            <button className="track-queue" onClick={(e) => queueTrack(e, track.spotify_id)} title="queue">+</button>
          </li>
        ))}
      </ul>

      {selectionBox && (
        <div 
          className="selection-box"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.width,
            height: selectionBox.height
          }}
        />
      )}



      {detail && (
        <div className="detail-overlay" onClick={() => setDetail(null)}>
          <div className="detail" onClick={e => e.stopPropagation()}>
            <button className="detail-close" onClick={() => setDetail(null)}>x</button>
            <h2>{detail.name}</h2>
            <div className="detail-artists">{parseArtists(detail.artists)}</div>
            <div className="detail-album">{detail.album_name}</div>

            <div className="detail-row"><span className="detail-label">tempo</span><span>{detail.tempo ? Math.round(detail.tempo) + ' bpm' : '-'}</span></div>
            <div className="detail-row"><span className="detail-label">key</span><span>{detail.key != null ? KEYS[detail.key] : '-'} {detail.mode === 1 ? 'major' : detail.mode === 0 ? 'minor' : ''}</span></div>
            <div className="detail-row"><span className="detail-label">danceability</span><span>{fmt(detail.danceability)}</span></div>
            <div className="detail-row"><span className="detail-label">energy</span><span>{fmt(detail.energy)}</span></div>
            <div className="detail-row"><span className="detail-label">valence</span><span>{fmt(detail.valence)}</span></div>
            <div className="detail-row"><span className="detail-label">acousticness</span><span>{fmt(detail.acousticness)}</span></div>
            <div className="detail-row"><span className="detail-label">instrumentalness</span><span>{fmt(detail.instrumentalness)}</span></div>
            <div className="detail-row"><span className="detail-label">speechiness</span><span>{fmt(detail.speechiness)}</span></div>
            <div className="detail-row"><span className="detail-label">liveness</span><span>{fmt(detail.liveness)}</span></div>
            <div className="detail-row"><span className="detail-label">loudness</span><span>{detail.loudness ? detail.loudness.toFixed(1) + ' dB' : '-'}</span></div>
            <div className="detail-row"><span className="detail-label">duration</span><span>{formatDuration(detail.duration_ms)}</span></div>
            <div className="detail-row"><span className="detail-label">popularity</span><span>{detail.popularity || '-'}</span></div>

            <div className="detail-actions">
              <button onClick={(e) => queueTrack(e, detail.spotify_id)}>queue</button>
            </div>
          </div>
        </div>
      )}

      {player?.item && (
        <div className="player-bar">
          <div 
            className="player-progress-bar"
            onClick={async (e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const percent = (e.clientX - rect.left) / rect.width
              const position = Math.floor(percent * player.item.duration_ms)
              await fetch(`/api/player/seek/${position}`, { method: 'POST' })
            }}
          >
            <div 
              className="player-progress-fill" 
              style={{ width: `${((player.progress_ms || 0) / (player.item.duration_ms || 1)) * 100}%` }}
            />
          </div>
          <div className="player-times">
            <span>{formatDuration(player.progress_ms)}</span>
            <span>{formatDuration(player.item.duration_ms)}</span>
          </div>
          <div className="player-main">
            <div className="player-track">
              <span className="player-name">{player.item.name}</span>
              <span className="player-artist">{player.item.artists?.map(a => a.name).join(', ')}</span>
            </div>
            <div className="player-controls">
              <button onClick={skipPrev}>|&lt;</button>
              <button onClick={togglePlayPause}>{player.is_playing ? '||' : '|>'}</button>
              <button onClick={skipNext}>&gt;|</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
