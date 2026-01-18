import { useState, useEffect } from 'react'

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.DEV
  ? 'http://127.0.0.1:1666/tunes/callback'
  : 'https://bbbeate.space/tunes/callback'
const PLAYLIST_NAME = 'bbbeates top 50'

function App() {
  const [token, setToken] = useState(null)
  const [tracks, setTracks] = useState([])
  const [libraryTracks, setLibraryTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [newTracks, setNewTracks] = useState([])
  const [expandedTrack, setExpandedTrack] = useState(null)

  // Filters from URL params
  const getFiltersFromUrl = () => {
    const params = new URLSearchParams(window.location.search)
    return {
      artist: params.get('artist') || '',
      album: params.get('album') || '',
      genre: params.get('genre') || '',
      sortBy: params.get('sortBy') || 'name',
      sortDir: params.get('sortDir') || 'asc',
      view: params.get('view') || 'tracks',
    }
  }
  const [filters, setFilters] = useState(getFiltersFromUrl)
  const [artistData, setArtistData] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  const isUniverse = window.location.pathname.includes('/universe') || window.location.hash.includes('universe')

  useEffect(() => {
    const storedToken = sessionStorage.getItem('spotify_token')
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (storedToken) {
      setToken(storedToken)
      setLoading(false)
    } else if (code) {
      exchangeCodeForToken(code)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      if (isUniverse) {
        fetchLibrary()
      } else {
        fetchTopTracks()
      }
    }
  }, [token, isUniverse])

  async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  function generateCodeVerifier() {
    const array = new Uint8Array(64)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  async function login() {
    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    sessionStorage.setItem('spotify_verifier', verifier)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: 'user-top-read user-library-read playlist-read-private playlist-modify-private playlist-modify-public',
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    })

    window.location.href = `https://accounts.spotify.com/authorize?${params}`
  }

  async function exchangeCodeForToken(code) {
    const verifier = sessionStorage.getItem('spotify_verifier')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      }),
    })

    const data = await response.json()
    if (data.access_token) {
      sessionStorage.setItem('spotify_token', data.access_token)
      if (data.refresh_token) {
        sessionStorage.setItem('spotify_refresh_token', data.refresh_token)
      }
      setToken(data.access_token)
      window.history.replaceState({}, '', window.location.pathname)
    }
    setLoading(false)
  }

  async function refreshToken() {
    const refreshToken = sessionStorage.getItem('spotify_refresh_token')
    if (!refreshToken) {
      console.error('No refresh token available')
      return null
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }),
    })

    const data = await response.json()
    if (data.access_token) {
      sessionStorage.setItem('spotify_token', data.access_token)
      if (data.refresh_token) {
        sessionStorage.setItem('spotify_refresh_token', data.refresh_token)
      }
      setToken(data.access_token)
      return data.access_token
    }
    return null
  }

  function logout() {
    sessionStorage.removeItem('spotify_token')
    sessionStorage.removeItem('spotify_refresh_token')
    sessionStorage.removeItem('spotify_verifier')
    setToken(null)
  }

  async function fetchTopTracks() {
    const response = await fetch(
      'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await response.json()
    if (data.items) {
      setTracks(data.items)
      await syncPlaylist(data.items)
    }
  }

  async function fetchLibrary() {
    setLibraryLoading(true)
    const seenIds = new Set()
    const trackSources = {} // trackId -> [source names]

    const addTracks = (tracks, sourceName) => {
      const uniqueTracks = []
      tracks.forEach(t => {
        if (!t) return
        // Track the source for all tracks (even duplicates)
        if (!trackSources[t.id]) trackSources[t.id] = []
        if (!trackSources[t.id].includes(sourceName)) {
          trackSources[t.id].push(sourceName)
        }
        // Only add unique tracks to the list
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id)
          // Attach sources to the track object
          t._sources = trackSources[t.id]
          uniqueTracks.push(t)
        } else {
          // Update sources for already-added tracks
          setLibraryTracks(prev => prev.map(track =>
            track.id === t.id ? { ...track, _sources: trackSources[t.id] } : track
          ))
        }
      })
      if (uniqueTracks.length > 0) {
        setLibraryTracks(prev => [...prev, ...uniqueTracks])
        // Audio features now fetched on-demand when track is expanded
        // Collect unique artist IDs and fetch their data
        const artistIds = [...new Set(uniqueTracks.flatMap(t => t.artists.map(a => a.id)))]
        fetchArtistData(artistIds)
      }
    }

    // Fetch all playlists first
    let playlistUrl = 'https://api.spotify.com/v1/me/playlists?limit=50'
    const playlists = []
    while (playlistUrl) {
      const response = await fetch(playlistUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) break
      const data = await response.json()
      playlists.push(...data.items)
      playlistUrl = data.next
    }

    // Fetch tracks from each playlist
    for (const playlist of playlists) {
      let tracksUrl = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=50`
      while (tracksUrl) {
        const response = await fetch(tracksUrl, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) break
        const data = await response.json()
        const tracks = data.items.map(item => item.track).filter(Boolean)
        addTracks(tracks, playlist.name)
        tracksUrl = data.next
      }
    }

    // Also fetch liked songs
    let likedUrl = 'https://api.spotify.com/v1/me/tracks?limit=50'
    while (likedUrl) {
      const response = await fetch(likedUrl, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) break
      const data = await response.json()
      const tracks = data.items.map(item => item.track).filter(Boolean)
      addTracks(tracks, '❤️ liked')
      likedUrl = data.next
    }

    setLibraryLoading(false)
  }

  function toggleTrackExpand(trackId) {
    setExpandedTrack(expandedTrack === trackId ? null : trackId)
  }

  async function fetchArtistData(artistIds) {
    if (artistIds.length === 0) return
    // Filter out artists we already have
    const newIds = artistIds.filter(id => !artistData[id])
    if (newIds.length === 0) return

    try {
      // Spotify allows max 50 IDs per request
      for (let i = 0; i < newIds.length; i += 50) {
        const batch = newIds.slice(i, i + 50)
        const response = await fetch(
          `https://api.spotify.com/v1/artists?ids=${batch.join(',')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!response.ok) {
          console.error('Artist data fetch failed:', response.status)
          continue
        }
        const data = await response.json()
        if (data.artists) {
          const artists = {}
          data.artists.forEach(a => {
            if (a) artists[a.id] = { genres: a.genres || [], name: a.name }
          })
          setArtistData(prev => ({ ...prev, ...artists }))
        }
      }
    } catch (err) {
      console.error('Artist data error:', err)
    }
  }

  function updateUrlParams(updates) {
    const params = new URLSearchParams(window.location.search)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','))
      } else {
        params.set(key, String(value))
      }
    })
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    window.history.replaceState({}, '', newUrl)
  }

  function updateFilter(key, value) {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      updateUrlParams({ [key]: value })
      return next
    })
  }

  function clearFilters() {
    const cleared = {
      artist: '', album: '', genre: '',
      sortBy: 'name', sortDir: 'asc', view: 'tracks'
    }
    setFilters(cleared)
    updateUrlParams(cleared)
  }

  function filterTracks(tracks) {
    return tracks.filter(track => {
      // Artist filter
      if (filters.artist && !track.artists.some(a => a.name.toLowerCase().includes(filters.artist.toLowerCase()))) return false

      // Album filter
      if (filters.album && !track.album?.name.toLowerCase().includes(filters.album.toLowerCase())) return false

      // Genre filter
      if (filters.genre) {
        const trackGenres = getTrackGenres(track)
        if (!trackGenres.some(g => g.toLowerCase().includes(filters.genre.toLowerCase()))) return false
      }

      return true
    })
  }

  function sortTracks(tracks) {
    const sorted = [...tracks].sort((a, b) => {
      let valA, valB
      switch (filters.sortBy) {
        case 'name':
          valA = a.name.toLowerCase()
          valB = b.name.toLowerCase()
          break
        case 'artist':
          valA = a.artists[0]?.name.toLowerCase() || ''
          valB = b.artists[0]?.name.toLowerCase() || ''
          break
        case 'album':
          valA = a.album?.name.toLowerCase() || ''
          valB = b.album?.name.toLowerCase() || ''
          break
        case 'popularity':
          valA = a.popularity || 0
          valB = b.popularity || 0
          break
        case 'duration':
          valA = a.duration_ms || 0
          valB = b.duration_ms || 0
          break
        default:
          return 0
      }

      if (valA < valB) return filters.sortDir === 'asc' ? -1 : 1
      if (valA > valB) return filters.sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }

  function getUniqueArtists() {
    const artistMap = new Map()
    libraryTracks.forEach(track => {
      track.artists.forEach(artist => {
        if (!artistMap.has(artist.id)) {
          artistMap.set(artist.id, { ...artist, trackCount: 0 })
        }
        artistMap.get(artist.id).trackCount++
      })
    })
    return Array.from(artistMap.values()).sort((a, b) => b.trackCount - a.trackCount)
  }

  function getUniqueAlbums() {
    const albumMap = new Map()
    libraryTracks.forEach(track => {
      if (track.album && !albumMap.has(track.album.id)) {
        albumMap.set(track.album.id, { ...track.album, trackCount: 0, artistName: track.artists[0]?.name })
      }
      if (track.album) {
        albumMap.get(track.album.id).trackCount++
      }
    })
    return Array.from(albumMap.values()).sort((a, b) => b.trackCount - a.trackCount)
  }

  function formatDuration(ms) {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function getTrackGenres(track) {
    return track.artists.flatMap(a => artistData[a.id]?.genres || [])
  }

  function getAllGenres() {
    const genreCount = new Map()
    libraryTracks.forEach(track => {
      const genres = getTrackGenres(track)
      genres.forEach(g => {
        genreCount.set(g, (genreCount.get(g) || 0) + 1)
      })
    })
    return Array.from(genreCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }))
  }

  async function getUserId() {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    return data.id
  }

  async function findOrCreatePlaylist(userId) {
    // Check existing playlists
    let url = 'https://api.spotify.com/v1/me/playlists?limit=50'
    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      const found = data.items.find(p => p.name === PLAYLIST_NAME)
      if (found) return found.id
      url = data.next
    }

    // Create new playlist
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: PLAYLIST_NAME,
        description: 'Auto-synced top 50 tracks',
        public: false
      })
    })
    const data = await response.json()
    return data.id
  }

  async function getPlaylistTracks(playlistId) {
    const tracks = []
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id)),next`
    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      tracks.push(...data.items.map(item => item.track?.id).filter(Boolean))
      url = data.next
    }
    return new Set(tracks)
  }

  async function addTracksToPlaylist(playlistId, trackUris) {
    // Spotify allows max 100 tracks per request
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100)
      await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: batch })
      })
    }
  }

  async function syncPlaylist(topTracks) {
    setSyncStatus('syncing...')
    try {
      const userId = await getUserId()
      const playlistId = await findOrCreatePlaylist(userId)
      const existingTrackIds = await getPlaylistTracks(playlistId)

      const tracksToAdd = topTracks.filter(t => !existingTrackIds.has(t.id))

      if (tracksToAdd.length > 0) {
        const uris = tracksToAdd.map(t => `spotify:track:${t.id}`)
        await addTracksToPlaylist(playlistId, uris)
        setNewTracks(tracksToAdd)
        setSyncStatus(`added ${tracksToAdd.length} new track${tracksToAdd.length > 1 ? 's' : ''}`)
      } else {
        setSyncStatus('playlist up to date')
      }
    } catch (err) {
      setSyncStatus('sync failed')
      console.error(err)
    }
  }

  if (loading) return <div className="app">loading...</div>

  if (!token) {
    return (
      <div className="app">
        <button onClick={login}>login with spotify</button>
      </div>
    )
  }

  const newTrackIds = new Set(newTracks.map(t => t.id))

  if (isUniverse) {
    const filteredTracks = sortTracks(filterTracks(libraryTracks))
    const artists = getUniqueArtists()
    const albums = getUniqueAlbums()
    const genres = getAllGenres()
    const hasActiveFilters = filters.artist || filters.album || filters.genre

    return (
      <div className="app">
        <div className="nav">
          <a href="/tunes/">← top 50</a>
          <button className="logout-btn" onClick={logout}>logout</button>
        </div>

        <h1>universe ({filteredTracks.length}{libraryTracks.length !== filteredTracks.length ? `/${libraryTracks.length}` : ''}{libraryLoading ? '...' : ''})</h1>
        <div className="features-status">
          click a track to see details
          {Object.keys(artistData).length > 0 && ` • ${Object.keys(artistData).length} artists with genre data`}
        </div>

        {/* View tabs */}
        <div className="view-tabs">
          <button className={`view-tab ${filters.view === 'tracks' ? 'active' : ''}`} onClick={() => updateFilter('view', 'tracks')}>tracks</button>
          <button className={`view-tab ${filters.view === 'artists' ? 'active' : ''}`} onClick={() => updateFilter('view', 'artists')}>artists ({artists.length})</button>
          <button className={`view-tab ${filters.view === 'albums' ? 'active' : ''}`} onClick={() => updateFilter('view', 'albums')}>albums ({albums.length})</button>
          <button className={`view-tab ${filters.view === 'genres' ? 'active' : ''}`} onClick={() => updateFilter('view', 'genres')}>genres ({genres.length})</button>
        </div>

        {/* Filter toggle */}
        <div className="filter-header">
          <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? '▼ filters' : '▶ filters'} {hasActiveFilters && <span className="filter-badge">●</span>}
          </button>
          {hasActiveFilters && <button className="clear-filters" onClick={clearFilters}>clear all</button>}
        </div>

        {/* Filter controls */}
        {showFilters && (
          <div className="filters">
            <div className="filter-row">
              <label>Artist</label>
              <input type="text" placeholder="search artist..." value={filters.artist} onChange={e => updateFilter('artist', e.target.value)} />
            </div>
            <div className="filter-row">
              <label>Album</label>
              <input type="text" placeholder="search album..." value={filters.album} onChange={e => updateFilter('album', e.target.value)} />
            </div>
            <div className="filter-row">
              <label>Genre</label>
              <input type="text" placeholder="search genre..." value={filters.genre} onChange={e => updateFilter('genre', e.target.value)} />
            </div>
          </div>
        )}

        {/* Sort controls */}
        {filters.view === 'tracks' && (
          <div className="sort-controls">
            <label>Sort:</label>
            <select value={filters.sortBy} onChange={e => updateFilter('sortBy', e.target.value)}>
              <option value="name">name</option>
              <option value="artist">artist</option>
              <option value="album">album</option>
              <option value="popularity">popularity</option>
              <option value="duration">duration</option>
            </select>
            <button className="sort-dir" onClick={() => updateFilter('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}>
              {filters.sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}

        {/* Tracks view */}
        {filters.view === 'tracks' && filteredTracks.length === 0 && hasActiveFilters && (
          <div className="no-results">No tracks match your filters.</div>
        )}
        {filters.view === 'tracks' && (
          <ul className="tracks">
            {filteredTracks.map((track, i) => {
              const isExpanded = expandedTrack === track.id

              return (
                <li key={`${track.id}-${i}`} className={isExpanded ? 'expanded' : ''}>
                  <div className="track-main" onClick={() => toggleTrackExpand(track.id)}>
                    <span className="track-expand">{isExpanded ? '▼' : '▶'}</span>
                    <span className="track-name">{track.name}</span>
                    <span className="track-artist"> - {track.artists.map(a => a.name).join(', ')}</span>
                  </div>
                  {isExpanded && (
                    <div className="track-details">
                      <div className="track-info">
                        <span className="info-item"><span className="info-label">album:</span> {track.album?.name}</span>
                        <span className="info-item"><span className="info-label">duration:</span> {formatDuration(track.duration_ms)}</span>
                        <span className="info-item"><span className="info-label">popularity:</span> {track.popularity}%</span>
                        {track._sources && <span className="info-item"><span className="info-label">source:</span> {track._sources.join(', ')}</span>}
                        {(() => {
                          const genres = getTrackGenres(track)
                          return genres.length > 0 && <span className="info-item"><span className="info-label">genre:</span> {genres.slice(0, 3).join(', ')}</span>
                        })()}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Artists view */}
        {filters.view === 'artists' && (
          <ul className="tracks artists-list">
            {artists.map(artist => (
              <li key={artist.id} onClick={() => { updateFilter('artist', artist.name); updateFilter('view', 'tracks') }}>
                <span className="artist-name">{artist.name}</span>
                <span className="artist-count">{artist.trackCount} tracks</span>
              </li>
            ))}
          </ul>
        )}

        {/* Albums view */}
        {filters.view === 'albums' && (
          <ul className="tracks albums-list">
            {albums.map(album => (
              <li key={album.id} onClick={() => { updateFilter('album', album.name); updateFilter('view', 'tracks') }}>
                <div className="album-info">
                  <span className="album-name">{album.name}</span>
                  <span className="album-artist"> - {album.artistName}</span>
                </div>
                <span className="album-count">{album.trackCount} tracks</span>
              </li>
            ))}
          </ul>
        )}

        {/* Genres view */}
        {filters.view === 'genres' && (
          <ul className="tracks genres-list">
            {genres.map(({ genre, count }) => (
              <li key={genre} onClick={() => { updateFilter('genre', genre); updateFilter('view', 'tracks') }}>
                <span className="genre-name">{genre}</span>
                <span className="genre-count">{count} tracks</span>
              </li>
            ))}
          </ul>
        )}

        {libraryLoading && <div className="loading-more">loading more...</div>}
      </div>
    )
  }

  return (
    <div className="app">
      <div className="nav">
        <a href="/tunes/universe">universe →</a>
        <button className="logout-btn" onClick={logout}>logout</button>
      </div>
      {syncStatus && <div className="sync-status">{syncStatus}</div>}
      <ul className="tracks">
        {tracks.map((track, i) => (
          <li key={track.id} className={newTrackIds.has(track.id) ? 'new-track' : ''}>
            <span className="track-name">{i + 1}. {track.name}</span>
            <span className="track-artist"> - {track.artists.map(a => a.name).join(', ')}</span>
            {newTrackIds.has(track.id) && <span className="new-badge"> (new!)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
