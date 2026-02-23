import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const ALL_FILTERS = [
  { id: 'search', label: 'search', type: 'search' },
  { id: 'tempo', label: 'bpm', type: 'range', min: 40, max: 220, step: 1 },
  { id: 'sources', label: 'playlist', type: 'multiselect' },
  { id: 'albums', label: 'album', type: 'multiselect' },
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
  { id: 'bpm', label: 'bpm' },
  { id: 'danceability', label: 'dance' },
  { id: 'energy', label: 'energy' },
  { id: 'valence', label: 'valence' },
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
  albums: [],
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
  const [albums, setAlbums] = useState([])
  const [sort, setSort] = useState('name')
  const [detail, setDetail] = useState(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS)
  const [player, setPlayer] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

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

  useEffect(() => {
    fetch('/api/meta').then(r => r.json()).then(data => {
      setStats(data.stats)
      setSources(data.sources || [])
      setGenres(data.genres || [])
      setAlbums(data.albums || [])
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
              options={filterDef.id === 'sources' ? sources : filterDef.id === 'albums' ? albums : genres}
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
        {visibleColumns.includes('name') && (
          <span className={`col-name ${sort === 'name' ? 'sorted' : ''}`} onClick={() => setSort('name')}>name</span>
        )}
        {visibleColumns.includes('artist') && (
          <span className={`col-artist ${sort === 'artists' ? 'sorted' : ''}`} onClick={() => setSort('artists')}>artist</span>
        )}
        {visibleColumns.includes('album') && (
          <span className={`col-album ${sort === 'album_name' ? 'sorted' : ''}`} onClick={() => setSort('album_name')}>album</span>
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
        <span className="col-queue"></span>
      </div>

      <ul className="tracks">
        {tracks.map(track => (
          <li key={track.spotify_id} className="track" onClick={() => showDetail(track.spotify_id)}>
            <div className="track-info">
              {visibleColumns.includes('name') && (
                <span className="track-name">{track.name}</span>
              )}
              <span className="track-artist-mobile">{parseArtists(track.artists)}</span>
            </div>
            {visibleColumns.includes('artist') && (
              <span className="track-artists">{parseArtists(track.artists)}</span>
            )}
            {visibleColumns.includes('album') && (
              <span className="track-album">{track.album_name || '-'}</span>
            )}
            {visibleColumns.includes('bpm') && (
              <span className="track-bpm">{track.tempo ? Math.round(track.tempo) : '-'}</span>
            )}
            {visibleColumns.includes('danceability') && (
              <div className="bar">
                <div className="bar-fill" style={{ width: `${(track.danceability || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('energy') && (
              <div className="bar">
                <div className="bar-fill" style={{ width: `${(track.energy || 0) * 100}%` }} />
              </div>
            )}
            {visibleColumns.includes('valence') && (
              <div className="bar">
                <div className="bar-fill" style={{ width: `${(track.valence || 0) * 100}%` }} />
              </div>
            )}
            <button className="track-queue" onClick={(e) => queueTrack(e, track.spotify_id)} title="queue">+</button>
          </li>
        ))}
      </ul>

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
              <button onClick={() => { playTrack(detail.spotify_id); setDetail(null) }}>play</button>
              <button onClick={(e) => queueTrack(e, detail.spotify_id)}>queue</button>
              <a href={`https://open.spotify.com/track/${detail.spotify_id}`} target="_blank" rel="noopener">
                open in spotify
              </a>
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
