#![allow(dead_code)]

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub spotify_id: String,
    pub recco_id: Option<String>,
    pub name: String,
    pub artists: Option<String>,
    pub album_id: Option<String>,
    pub album_name: Option<String>,
    pub duration_ms: Option<i64>,
    pub popularity: Option<i64>,
    pub sources: Option<String>,
    pub genres: Option<String>,
    pub tempo: Option<f64>,
    pub key: Option<i64>,
    pub mode: Option<i64>,
    pub danceability: Option<f64>,
    pub energy: Option<f64>,
    pub valence: Option<f64>,
    pub acousticness: Option<f64>,
    pub instrumentalness: Option<f64>,
    pub speechiness: Option<f64>,
    pub liveness: Option<f64>,
    pub loudness: Option<f64>,
    pub unavailable: bool,
    pub first_seen: Option<String>,
    pub last_seen: Option<String>,
    pub updated: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub total_tracks: i64,
    pub tracks_with_features: i64,
    pub unavailable_tracks: i64,
    pub last_sync: Option<String>,
    pub avg_tempo: Option<f64>,
    pub avg_energy: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct SyncLog {
    pub id: i64,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub tracks_added: i64,
    pub tracks_updated: i64,
    pub tracks_unavailable: i64,
    pub error: Option<String>,
}

pub fn open_db(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(include_str!("../schema.sql"))?;
    Ok(conn)
}

pub fn get_config(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    conn.query_row("SELECT value FROM config WHERE key = ?", [key], |row| {
        row.get(0)
    })
    .optional()
}

pub fn set_config(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_track(conn: &Connection, spotify_id: &str) -> rusqlite::Result<Option<Track>> {
    conn.query_row(
        "SELECT * FROM tracks WHERE spotify_id = ?",
        [spotify_id],
        |row| {
            Ok(Track {
                spotify_id: row.get("spotify_id")?,
                recco_id: row.get("recco_id")?,
                name: row.get("name")?,
                artists: row.get("artists")?,
                album_id: row.get("album_id")?,
                album_name: row.get("album_name")?,
                duration_ms: row.get("duration_ms")?,
                popularity: row.get("popularity")?,
                sources: row.get("sources")?,
                genres: row.get("genres")?,
                tempo: row.get("tempo")?,
                key: row.get("key")?,
                mode: row.get("mode")?,
                danceability: row.get("danceability")?,
                energy: row.get("energy")?,
                valence: row.get("valence")?,
                acousticness: row.get("acousticness")?,
                instrumentalness: row.get("instrumentalness")?,
                speechiness: row.get("speechiness")?,
                liveness: row.get("liveness")?,
                loudness: row.get("loudness")?,
                unavailable: row.get::<_, i64>("unavailable")? == 1,
                first_seen: row.get("first_seen")?,
                last_seen: row.get("last_seen")?,
                updated: row.get("updated")?,
            })
        },
    )
    .optional()
}

pub fn upsert_track(conn: &Connection, track: &Track) -> rusqlite::Result<bool> {
    let existing = get_track(conn, &track.spotify_id)?;
    let now = chrono::Utc::now().to_rfc3339();

    if existing.is_some() {
        conn.execute(
            "UPDATE tracks SET
                recco_id = COALESCE(?, recco_id),
                name = ?,
                artists = COALESCE(?, artists),
                album_id = COALESCE(?, album_id),
                album_name = COALESCE(?, album_name),
                duration_ms = COALESCE(?, duration_ms),
                popularity = COALESCE(?, popularity),
                sources = ?,
                genres = COALESCE(?, genres),
                tempo = COALESCE(?, tempo),
                key = COALESCE(?, key),
                mode = COALESCE(?, mode),
                danceability = COALESCE(?, danceability),
                energy = COALESCE(?, energy),
                valence = COALESCE(?, valence),
                acousticness = COALESCE(?, acousticness),
                instrumentalness = COALESCE(?, instrumentalness),
                speechiness = COALESCE(?, speechiness),
                liveness = COALESCE(?, liveness),
                loudness = COALESCE(?, loudness),
                unavailable = ?,
                last_seen = ?,
                updated = ?
            WHERE spotify_id = ?",
            params![
                track.recco_id,
                track.name,
                track.artists,
                track.album_id,
                track.album_name,
                track.duration_ms,
                track.popularity,
                track.sources,
                track.genres,
                track.tempo,
                track.key,
                track.mode,
                track.danceability,
                track.energy,
                track.valence,
                track.acousticness,
                track.instrumentalness,
                track.speechiness,
                track.liveness,
                track.loudness,
                if track.unavailable { 1 } else { 0 },
                now,
                now,
                track.spotify_id,
            ],
        )?;
        Ok(false)
    } else {
        conn.execute(
            "INSERT INTO tracks (
                spotify_id, recco_id, name, artists, album_id, album_name,
                duration_ms, popularity, sources, genres, tempo, key, mode,
                danceability, energy, valence, acousticness, instrumentalness,
                speechiness, liveness, loudness, unavailable, first_seen, last_seen, updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                track.spotify_id,
                track.recco_id,
                track.name,
                track.artists,
                track.album_id,
                track.album_name,
                track.duration_ms,
                track.popularity,
                track.sources,
                track.genres,
                track.tempo,
                track.key,
                track.mode,
                track.danceability,
                track.energy,
                track.valence,
                track.acousticness,
                track.instrumentalness,
                track.speechiness,
                track.liveness,
                track.loudness,
                if track.unavailable { 1 } else { 0 },
                now,
                now,
                now,
            ],
        )?;
        Ok(true)
    }
}

#[derive(Default)]
pub struct TrackFilter {
    pub tempo_min: Option<f64>,
    pub tempo_max: Option<f64>,
    pub energy_min: Option<f64>,
    pub energy_max: Option<f64>,
    pub danceability_min: Option<f64>,
    pub danceability_max: Option<f64>,
    pub valence_min: Option<f64>,
    pub valence_max: Option<f64>,
    pub key: Option<i64>,
    pub search: Option<String>,
    pub sort: Option<String>,
    pub limit: Option<i64>,
}

pub fn query_tracks(conn: &Connection, filter: &TrackFilter) -> rusqlite::Result<Vec<Track>> {
    let mut sql = "SELECT * FROM tracks WHERE unavailable = 0".to_string();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if let Some(v) = filter.tempo_min {
        sql.push_str(" AND tempo >= ?");
        params.push(Box::new(v));
    }
    if let Some(v) = filter.tempo_max {
        sql.push_str(" AND tempo <= ?");
        params.push(Box::new(v));
    }
    if let Some(v) = filter.energy_min {
        sql.push_str(" AND energy >= ?");
        params.push(Box::new(v));
    }
    if let Some(v) = filter.energy_max {
        sql.push_str(" AND energy <= ?");
        params.push(Box::new(v));
    }
    if let Some(v) = filter.danceability_min {
        sql.push_str(" AND danceability >= ?");
        params.push(Box::new(v));
    }
    if let Some(v) = filter.danceability_max {
        sql.push_str(" AND danceability <= ?");
        params.push(Box::new(v));
    }
    if let Some(v) = filter.valence_min {
        sql.push_str(" AND valence >= ?");
        params.push(Box::new(v));
    }
    if let Some(v) = filter.valence_max {
        sql.push_str(" AND valence <= ?");
        params.push(Box::new(v));
    }
    if let Some(v) = filter.key {
        sql.push_str(" AND key = ?");
        params.push(Box::new(v));
    }
    if let Some(ref s) = filter.search {
        sql.push_str(" AND (name LIKE ? OR artists LIKE ?)");
        let pattern = format!("%{}%", s);
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern));
    }

    let sort_col = match filter.sort.as_deref() {
        Some("tempo") => "tempo",
        Some("energy") => "energy",
        Some("danceability") => "danceability",
        Some("valence") => "valence",
        Some("name") => "name",
        Some("popularity") => "popularity",
        _ => "name",
    };
    sql.push_str(&format!(" ORDER BY {} DESC", sort_col));

    let limit = filter.limit.unwrap_or(100).min(1000);
    sql.push_str(&format!(" LIMIT {}", limit));

    let params_ref: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql)?;
    let tracks = stmt
        .query_map(params_ref.as_slice(), |row| {
            Ok(Track {
                spotify_id: row.get("spotify_id")?,
                recco_id: row.get("recco_id")?,
                name: row.get("name")?,
                artists: row.get("artists")?,
                album_id: row.get("album_id")?,
                album_name: row.get("album_name")?,
                duration_ms: row.get("duration_ms")?,
                popularity: row.get("popularity")?,
                sources: row.get("sources")?,
                genres: row.get("genres")?,
                tempo: row.get("tempo")?,
                key: row.get("key")?,
                mode: row.get("mode")?,
                danceability: row.get("danceability")?,
                energy: row.get("energy")?,
                valence: row.get("valence")?,
                acousticness: row.get("acousticness")?,
                instrumentalness: row.get("instrumentalness")?,
                speechiness: row.get("speechiness")?,
                liveness: row.get("liveness")?,
                loudness: row.get("loudness")?,
                unavailable: row.get::<_, i64>("unavailable")? == 1,
                first_seen: row.get("first_seen")?,
                last_seen: row.get("last_seen")?,
                updated: row.get("updated")?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(tracks)
}

pub fn get_stats(conn: &Connection) -> rusqlite::Result<Stats> {
    let total_tracks: i64 = conn.query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))?;

    let tracks_with_features: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tracks WHERE tempo IS NOT NULL",
        [],
        |row| row.get(0),
    )?;

    let unavailable_tracks: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tracks WHERE unavailable = 1",
        [],
        |row| row.get(0),
    )?;

    let last_sync: Option<String> = conn
        .query_row(
            "SELECT finished_at FROM sync_log ORDER BY id DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()?;

    let avg_tempo: Option<f64> = conn
        .query_row(
            "SELECT AVG(tempo) FROM tracks WHERE tempo IS NOT NULL",
            [],
            |row| row.get::<_, Option<f64>>(0),
        )
        .unwrap_or(None);

    let avg_energy: Option<f64> = conn
        .query_row(
            "SELECT AVG(energy) FROM tracks WHERE energy IS NOT NULL",
            [],
            |row| row.get::<_, Option<f64>>(0),
        )
        .unwrap_or(None);

    Ok(Stats {
        total_tracks,
        tracks_with_features,
        unavailable_tracks,
        last_sync,
        avg_tempo,
        avg_energy,
    })
}

pub fn start_sync_log(conn: &Connection) -> rusqlite::Result<i64> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO sync_log (started_at, tracks_added, tracks_updated, tracks_unavailable) VALUES (?, 0, 0, 0)",
        [&now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn finish_sync_log(
    conn: &Connection,
    id: i64,
    added: i64,
    updated: i64,
    unavailable: i64,
    error: Option<&str>,
) -> rusqlite::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE sync_log SET finished_at = ?, tracks_added = ?, tracks_updated = ?, tracks_unavailable = ?, error = ? WHERE id = ?",
        params![now, added, updated, unavailable, error, id],
    )?;
    Ok(())
}

pub fn get_tracks_missing_features(conn: &Connection) -> rusqlite::Result<Vec<String>> {
    let mut stmt =
        conn.prepare("SELECT spotify_id FROM tracks WHERE tempo IS NULL AND unavailable = 0")?;
    let ids = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<String>, _>>()?;
    Ok(ids)
}
