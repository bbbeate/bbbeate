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

const DEFAULT_VISIBLE = ['search', 'tempo', 'sources']

function MultiSelect({ options, selected, onChange, label }) {
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

function RangeSlider({ min, max, step, value, onChange }) {
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
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localMin}
        onChange={e => onChange([Number(e.target.value), localMax])}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localMax}
        onChange={e => onChange([localMin, Number(e.target.value)])}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={localMax}
        onChange={e => onChange([localMin, Number(e.target.value)])}
      />
    </div>
  )
}

function App() {
  const [tracks, setTracks] = useState([])
  const [stats, setStats] = useState(null)
  const [sources, setSources] = useState([])
  const [genres, setGenres] = useState([])
  const [sort, setSort] = useState('name')
  const [detail, setDetail] = useState(null)
  const [visibleFilters, setVisibleFilters] = useState(DEFAULT_VISIBLE)
  const [showFilterPicker, setShowFilterPicker] = useState(false)
  const [filters, setFilters] = useState({
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
  })

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
    })
  }, [])

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleVisibleFilter = (id) => {
    if (visibleFilters.includes(id)) {
      setVisibleFilters(visibleFilters.filter(f => f !== id))
    } else {
      setVisibleFilters([...visibleFilters, id])
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

  const renderFilter = (filterDef) => {
    switch (filterDef.type) {
      case 'search':
        return (
          <div className="filter-row" key={filterDef.id}>
            <label>{filterDef.label}</label>
            <input
              type="text"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              placeholder="name/artist"
            />
          </div>
        )
      case 'range':
        return (
          <div className="filter-row" key={filterDef.id}>
            <label>{filterDef.label}</label>
            <RangeSlider
              min={filterDef.min}
              max={filterDef.max}
              step={filterDef.step}
              value={filters[filterDef.id]}
              onChange={val => updateFilter(filterDef.id, val)}
              label={filterDef.label}
            />
          </div>
        )
      case 'multiselect':
        return (
          <div className="filter-row" key={filterDef.id}>
            <label>{filterDef.label}</label>
            <MultiSelect
              options={filterDef.id === 'sources' ? sources : genres}
              selected={filters[filterDef.id]}
              onChange={val => updateFilter(filterDef.id, val)}
              label={filterDef.label}
            />
          </div>
        )
      case 'select':
        return (
          <div className="filter-row" key={filterDef.id}>
            <label>{filterDef.label}</label>
            <select value={filters.key} onChange={e => updateFilter('key', e.target.value)}>
              <option value="">any</option>
              {filterDef.options.map((k, i) => <option key={i} value={i}>{k}</option>)}
            </select>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="app">
      <h1>musikk</h1>

      <div className="filters">
        {visibleFilters.map(id => {
          const def = ALL_FILTERS.find(f => f.id === id)
          return def ? renderFilter(def) : null
        })}
        
        <div className="filter-row">
          <button className="filter-picker-btn" onClick={() => setShowFilterPicker(!showFilterPicker)}>
            +
          </button>
        </div>
      </div>

      {showFilterPicker && (
        <div className="filter-picker">
          <div className="filter-picker-title">show/hide filters:</div>
          {ALL_FILTERS.map(f => (
            <label key={f.id} className="filter-picker-option">
              <input
                type="checkbox"
                checked={visibleFilters.includes(f.id)}
                onChange={() => toggleVisibleFilter(f.id)}
              />
              {f.label}
            </label>
          ))}
        </div>
      )}

      <div className="stats">
        {stats && `${stats.total_tracks} tracks`}
        {tracks.length > 0 && ` / showing ${tracks.length}`}
      </div>

      <div className="header-row">
        <span className={`col-name ${sort === 'name' ? 'sorted' : ''}`} onClick={() => setSort('name')}>name</span>
        <span className={`col-artist ${sort === 'artists' ? 'sorted' : ''}`} onClick={() => setSort('artists')}>artist</span>
        <span className={`col-bpm ${sort === 'tempo' ? 'sorted' : ''}`} onClick={() => setSort('tempo')}>bpm</span>
        <span className={`col-bar ${sort === 'danceability' ? 'sorted' : ''}`} onClick={() => setSort('danceability')}>dance</span>
        <span className={`col-bar ${sort === 'energy' ? 'sorted' : ''}`} onClick={() => setSort('energy')}>energy</span>
        <span className={`col-bar ${sort === 'valence' ? 'sorted' : ''}`} onClick={() => setSort('valence')}>valence</span>
      </div>

      <ul className="tracks">
        {tracks.map(track => (
          <li key={track.spotify_id} className="track" onClick={() => showDetail(track.spotify_id)}>
            <span className="track-name">{track.name}</span>
            <span className="track-artists">{parseArtists(track.artists)}</span>
            <span className="track-bpm">{track.tempo ? Math.round(track.tempo) : '-'}</span>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${(track.danceability || 0) * 100}%` }} />
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${(track.energy || 0) * 100}%` }} />
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${(track.valence || 0) * 100}%` }} />
            </div>
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

            <a className="detail-link" href={`https://open.spotify.com/track/${detail.spotify_id}`} target="_blank" rel="noopener">
              open in spotify
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
