use crate::db::{self, Track};
use crate::spotify::{SpotifyClient, ReccobeatsClient};
use rusqlite::Connection;
use std::collections::HashMap;
use std::path::Path;

pub struct SyncResult {
    pub added: i64,
    pub updated: i64,
    pub unavailable: i64,
}

pub async fn run_sync(
    db_path: &Path,
    spotify: &mut SpotifyClient,
    dry_run: bool,
) -> Result<SyncResult, String> {
    // open db just to get refresh token
    let refresh_token = {
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        db::get_config(&conn, "spotify_refresh_token")
            .map_err(|e| e.to_string())?
            .ok_or("no refresh token - run 'musikk auth' first")?
    };

    let token = spotify.refresh_token(&refresh_token).await?;

    let user_id = spotify.get_user_id().await?;
    println!("syncing library for user: {}", user_id);

    let mut tracks: HashMap<String, Track> = HashMap::new();

    // fetch liked songs
    println!("fetching liked songs...");
    let saved = spotify.get_saved_tracks().await?;
    println!("  found {} liked songs", saved.len());
    for st in saved {
        let t = &st.track;
        let track_id = match &t.id {
            Some(id) => id.clone(),
            None => continue,  // skip local files
        };
        let artists: Vec<String> = t.artists.iter().map(|a| a.name.clone()).collect();
        let entry = tracks.entry(track_id.clone()).or_insert_with(|| Track {
            spotify_id: track_id.clone(),
            recco_id: None,
            name: t.name.clone(),
            artists: Some(serde_json::to_string(&artists).unwrap()),
            album_id: Some(t.album.id.clone()),
            album_name: Some(t.album.name.clone()),
            duration_ms: Some(t.duration_ms),
            popularity: Some(t.popularity),
            sources: None,
            genres: None,
            tempo: None,
            key: None,
            mode: None,
            danceability: None,
            energy: None,
            valence: None,
            acousticness: None,
            instrumentalness: None,
            speechiness: None,
            liveness: None,
            loudness: None,
            unavailable: false,
            first_seen: None,
            last_seen: None,
            updated: None,
        });
        merge_source(entry, "liked");
    }

    // fetch saved albums
    println!("fetching saved albums...");
    let albums = spotify.get_saved_albums().await?;
    println!("  found {} saved albums", albums.len());
    for sa in albums {
        let album = &sa.album;
        for t in &album.tracks.items {
            let artists: Vec<String> = t.artists.iter().map(|a| a.name.clone()).collect();
            let entry = tracks.entry(t.id.clone()).or_insert_with(|| Track {
                spotify_id: t.id.clone(),
                recco_id: None,
                name: t.name.clone(),
                artists: Some(serde_json::to_string(&artists).unwrap()),
                album_id: Some(album.id.clone()),
                album_name: Some(album.name.clone()),
                duration_ms: Some(t.duration_ms),
                popularity: None,
                sources: None,
                genres: None,
                tempo: None,
                key: None,
                mode: None,
                danceability: None,
                energy: None,
                valence: None,
                acousticness: None,
                instrumentalness: None,
                speechiness: None,
                liveness: None,
                loudness: None,
                unavailable: false,
                first_seen: None,
                last_seen: None,
                updated: None,
            });
            merge_source(entry, &format!("album:{}", album.id));
        }
    }

    // fetch owned playlists
    println!("fetching playlists...");
    let playlists = spotify.get_playlists().await?;
    let owned: Vec<_> = playlists.into_iter().filter(|p| p.owner.id == user_id).collect();
    println!("  found {} owned playlists", owned.len());

    for playlist in owned {
        let pt = match spotify.get_playlist_tracks(&playlist.id).await {
            Ok(tracks) => tracks,
            Err(e) => {
                println!("  {} - skipped ({})", playlist.name, e);
                continue;
            }
        };
        println!("  {} - {} tracks", playlist.name, pt.len());
        for item in pt {
            if let Some(t) = item.track {
                let track_id = match &t.id {
                    Some(id) => id.clone(),
                    None => continue,  // skip local files
                };
                let artists: Vec<String> = t.artists.iter().map(|a| a.name.clone()).collect();
                let entry = tracks.entry(track_id.clone()).or_insert_with(|| Track {
                    spotify_id: track_id.clone(),
                    recco_id: None,
                    name: t.name.clone(),
                    artists: Some(serde_json::to_string(&artists).unwrap()),
                    album_id: Some(t.album.id.clone()),
                    album_name: Some(t.album.name.clone()),
                    duration_ms: Some(t.duration_ms),
                    popularity: Some(t.popularity),
                    sources: None,
                    genres: None,
                    tempo: None,
                    key: None,
                    mode: None,
                    danceability: None,
                    energy: None,
                    valence: None,
                    acousticness: None,
                    instrumentalness: None,
                    speechiness: None,
                    liveness: None,
                    loudness: None,
                    unavailable: false,
                    first_seen: None,
                    last_seen: None,
                    updated: None,
                });
                merge_source(entry, &playlist.name);
            }
        }
    }

    println!("total unique tracks: {}", tracks.len());

    if dry_run {
        println!("dry run - not saving to database");
        return Ok(SyncResult { added: 0, updated: 0, unavailable: 0 });
    }

    // save new refresh token if provided
    if let Some(new_refresh) = token.refresh_token {
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        db::set_config(&conn, "spotify_refresh_token", &new_refresh)
            .map_err(|e| e.to_string())?;
    }

    // get list of tracks that need features (check db)
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut needs_features: Vec<String> = vec![];
    for (spotify_id, _) in &tracks {
        let existing = db::get_track(&conn, spotify_id).map_err(|e| e.to_string())?;
        if existing.as_ref().map(|t| t.tempo.is_none()).unwrap_or(true) {
            needs_features.push(spotify_id.clone());
        }
    }
    drop(conn);

    // fetch audio features from reccobeats (two-step: get recco_id, then features)
    println!("fetching audio features for {} tracks...", needs_features.len());
    let recco = ReccobeatsClient::new();
    let mut features_map: HashMap<String, crate::spotify::ReccoAudioFeatures> = HashMap::new();
    let mut recco_id_map: HashMap<String, String> = HashMap::new(); // spotify_id -> recco_id

    // step 1: get recco track ids (batch of 50)
    let total = needs_features.len();
    println!("  step 1: looking up recco track ids...");
    for (i, chunk) in needs_features.chunks(40).enumerate() {
        let batch_num = (i + 1) * 40;
        if batch_num % 400 == 0 || batch_num >= total {
            println!("    lookup {}/{}", batch_num.min(total), total);
        }

        match recco.get_tracks_by_spotify_ids(&chunk.to_vec()).await {
            Ok(tracks_info) => {
                for info in tracks_info {
                    if let Some(spotify_id) = info.spotify_id() {
                        recco_id_map.insert(spotify_id, info.id);
                    }
                }
            }
            Err(e) => {
                println!("    lookup batch failed: {}", e);
            }
        }
    }
    println!("  found {} tracks in reccobeats", recco_id_map.len());

    // step 2: get audio features for each recco track
    println!("  step 2: fetching audio features...");
    let recco_ids: Vec<_> = recco_id_map.iter().collect();
    for (i, (spotify_id, recco_id)) in recco_ids.iter().enumerate() {
        if (i + 1) % 100 == 0 {
            println!("    features {}/{}", i + 1, recco_ids.len());
        }

        match recco.get_audio_features(recco_id).await {
            Ok(Some(features)) => {
                features_map.insert((*spotify_id).clone(), features);
            }
            Ok(None) => {}
            Err(_) => {}
        }
    }
    println!("  got features for {} tracks", features_map.len());

    // now do all db writes synchronously
    println!("saving to database...");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut added = 0i64;
    let mut updated = 0i64;

    for (spotify_id, mut track) in tracks {
        // store recco_id if we found it
        if let Some(recco_id) = recco_id_map.get(&spotify_id) {
            track.recco_id = Some(recco_id.clone());
        }

        // apply features if we fetched them
        if let Some(features) = features_map.get(&spotify_id) {
            track.tempo = features.tempo;
            track.key = features.key;
            track.mode = features.mode;
            track.danceability = features.danceability;
            track.energy = features.energy;
            track.valence = features.valence;
            track.acousticness = features.acousticness;
            track.instrumentalness = features.instrumentalness;
            track.speechiness = features.speechiness;
            track.liveness = features.liveness;
            track.loudness = features.loudness;
        } else {
            // preserve existing features if track already in db
            if let Ok(Some(ex)) = db::get_track(&conn, &spotify_id) {
                track.recco_id = ex.recco_id;
                track.tempo = ex.tempo;
                track.key = ex.key;
                track.mode = ex.mode;
                track.danceability = ex.danceability;
                track.energy = ex.energy;
                track.valence = ex.valence;
                track.acousticness = ex.acousticness;
                track.instrumentalness = ex.instrumentalness;
                track.speechiness = ex.speechiness;
                track.liveness = ex.liveness;
                track.loudness = ex.loudness;
            }
        }

        let is_new = db::upsert_track(&conn, &track).map_err(|e| e.to_string())?;
        if is_new {
            added += 1;
        } else {
            updated += 1;
        }
    }

    println!("sync complete: {} added, {} updated", added, updated);

    Ok(SyncResult { added, updated, unavailable: 0 })
}

fn merge_source(track: &mut Track, source: &str) {
    let mut sources: Vec<String> = track.sources
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    if !sources.contains(&source.to_string()) {
        sources.push(source.to_string());
        track.sources = Some(serde_json::to_string(&sources).unwrap());
    }
}
