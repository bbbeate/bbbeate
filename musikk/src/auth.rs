use crate::db;
use crate::spotify::SpotifyClient;
use rusqlite::Connection;
use std::path::Path;

pub async fn authorize(db_path: &Path, spotify: &mut SpotifyClient) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let refresh_token = db::get_config(&conn, "spotify_refresh_token")
        .map_err(|e| e.to_string())?
        .ok_or("no refresh token - run 'musikk auth' first")?;

    let token = spotify.refresh_token(&refresh_token).await?;

    if let Some(rotated) = token.refresh_token {
        db::set_config(&conn, "spotify_refresh_token", &rotated).map_err(|e| e.to_string())?;
    }
    Ok(())
}
