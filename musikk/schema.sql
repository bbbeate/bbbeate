CREATE TABLE IF NOT EXISTS tracks (
  spotify_id TEXT PRIMARY KEY,
  recco_id TEXT,
  name TEXT NOT NULL,
  artists TEXT,
  album_id TEXT,
  album_name TEXT,
  duration_ms INTEGER,
  popularity INTEGER,
  sources TEXT,
  genres TEXT,
  tempo REAL,
  key INTEGER,
  mode INTEGER,
  danceability REAL,
  energy REAL,
  valence REAL,
  acousticness REAL,
  instrumentalness REAL,
  speechiness REAL,
  liveness REAL,
  loudness REAL,
  unavailable INTEGER DEFAULT 0,
  first_seen TEXT,
  last_seen TEXT,
  updated TEXT
);

CREATE INDEX IF NOT EXISTS idx_tempo ON tracks(tempo);
CREATE INDEX IF NOT EXISTS idx_energy ON tracks(energy);
CREATE INDEX IF NOT EXISTS idx_danceability ON tracks(danceability);
CREATE INDEX IF NOT EXISTS idx_valence ON tracks(valence);
CREATE INDEX IF NOT EXISTS idx_key ON tracks(key);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY,
  started_at TEXT,
  finished_at TEXT,
  tracks_added INTEGER,
  tracks_updated INTEGER,
  tracks_unavailable INTEGER,
  error TEXT
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);
