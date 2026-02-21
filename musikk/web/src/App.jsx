import { useState, useEffect, useCallback } from 'react'
import './App.css'

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function App() {
  const [tracks, setTracks] = useState([])
  const [stats, setStats] = useState(null)
  const [sort, setSort] = useState('name')
  const [detail, setDetail] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    tempo_min: '',
    tempo_max: '',
    danceability_min: '',
    danceability_max: '',
    energy_min: '',
    energy_max: '',
    valence_min: '',
    valence_max: '',
    key: ''
  })

  const loadTracks = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.tempo_min) params.set('tempo_min', filters.tempo_min)
    if (filters.tempo_max) params.set('tempo_max', filters.tempo_max)
    if (filters.danceability_min) params.set('danceability_min', filters.danceability_min)
    if (filters.danceability_max) params.set('danceability_max', filters.danceability_max)
    if (filters.energy_min) params.set('energy_min', filters.energy_min)
    if (filters.energy_max) params.set('energy_max', filters.energy_max)
    if (filters.valence_min) params.set('valence_min', filters.valence_min)
    if (filters.valence_max) params.set('valence_max', filters.valence_max)
    if (filters.key) params.set('key', filters.key)
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
    fetch('/api/stats').then(r => r.json()).then(setStats)
  }, [])

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') loadTracks()
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

  return (
    <div className="app">
      <h1>musikk</h1>

      <div className="filters">
        <div className="filter-row">
          <label>search</label>
          <input
            type="text"
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="name/artist"
          />
        </div>

        <div className="filter-row">
          <label>bpm</label>
          <input
            type="number"
            value={filters.tempo_min}
            onChange={e => updateFilter('tempo_min', e.target.value)}
            placeholder="min"
          />
          <input
            type="number"
            value={filters.tempo_max}
            onChange={e => updateFilter('tempo_max', e.target.value)}
            placeholder="max"
          />
        </div>

        <div className="filter-row">
          <label>dance</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={filters.danceability_min}
            onChange={e => updateFilter('danceability_min', e.target.value)}
            placeholder="0"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={filters.danceability_max}
            onChange={e => updateFilter('danceability_max', e.target.value)}
            placeholder="1"
          />
        </div>

        <div className="filter-row">
          <label>energy</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={filters.energy_min}
            onChange={e => updateFilter('energy_min', e.target.value)}
            placeholder="0"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={filters.energy_max}
            onChange={e => updateFilter('energy_max', e.target.value)}
            placeholder="1"
          />
        </div>

        <div className="filter-row">
          <label>valence</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={filters.valence_min}
            onChange={e => updateFilter('valence_min', e.target.value)}
            placeholder="0"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={filters.valence_max}
            onChange={e => updateFilter('valence_max', e.target.value)}
            placeholder="1"
          />
        </div>

        <div className="filter-row">
          <label>key</label>
          <select value={filters.key} onChange={e => updateFilter('key', e.target.value)}>
            <option value="">any</option>
            {KEYS.map((k, i) => <option key={i} value={i}>{k}</option>)}
          </select>
        </div>
      </div>

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
