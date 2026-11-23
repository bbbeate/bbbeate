use crate::auth;
use crate::db;
use crate::spotify::SpotifyClient;
use rusqlite::Connection;
use std::collections::HashSet;
use std::path::Path;

const PLAYLIST_NAME: &str = "bbbeates top 50";
const PLAYLIST_ID_KEY: &str = "top50_playlist_id";
const TIME_RANGE: &str = "long_term";

pub async fn run_top50(db_path: &Path, spotify: &mut SpotifyClient, dry_run: bool) -> Result<(), String> {
    auth::authorize(db_path, spotify).await?;

    let playlist_id = resolve_playlist_id(db_path, spotify).await?;

    let in_playlist: HashSet<String> = spotify
        .get_playlist_tracks(&playlist_id)
        .await?
        .into_iter()
        .filter_map(|item| item.track.and_then(|t| t.id))
        .collect();

    let new_tracks: Vec<_> = spotify
        .get_top_tracks(TIME_RANGE)
        .await?
        .into_iter()
        .filter(|t| t.id.as_ref().is_some_and(|id| !in_playlist.contains(id)))
        .collect();

    println!("{} tracks in playlist, {} new in top 50", in_playlist.len(), new_tracks.len());
    for t in &new_tracks {
        let artists: Vec<&str> = t.artists.iter().map(|a| a.name.as_str()).collect();
        println!("  + {} - {}", artists.join(", "), t.name);
    }

    if dry_run || new_tracks.is_empty() {
        return Ok(());
    }

    let ids: Vec<String> = new_tracks.into_iter().filter_map(|t| t.id).collect();
    spotify.add_to_playlist(&playlist_id, &ids).await
}

async fn resolve_playlist_id(db_path: &Path, spotify: &SpotifyClient) -> Result<String, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    if let Some(id) = db::get_config(&conn, PLAYLIST_ID_KEY).map_err(|e| e.to_string())? {
        return Ok(id);
    }

    let user_id = spotify.get_user_id().await?;
    let playlist = spotify
        .get_playlists()
        .await?
        .into_iter()
        .find(|p| p.owner.id == user_id && p.name == PLAYLIST_NAME)
        .ok_or(format!("no playlist named '{}' owned by {}", PLAYLIST_NAME, user_id))?;

    db::set_config(&conn, PLAYLIST_ID_KEY, &playlist.id).map_err(|e| e.to_string())?;
    Ok(playlist.id)
}
