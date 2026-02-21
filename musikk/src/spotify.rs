#![allow(dead_code)]

use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;

const SPOTIFY_AUTH_URL: &str = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL: &str = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL: &str = "https://api.spotify.com/v1";
const RECCOBEATS_API_URL: &str = "https://api.reccobeats.com/v1";

#[derive(Debug, Clone)]
pub struct SpotifyClient {
    client: Client,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
    access_token: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
}

#[derive(Debug, Deserialize)]
pub struct SpotifyTrack {
    pub id: Option<String>,  // null for local files
    pub name: String,
    pub artists: Vec<SpotifyArtist>,
    pub album: SpotifyAlbum,
    pub duration_ms: i64,
    #[serde(default)]
    pub popularity: i64,
}

#[derive(Debug, Deserialize)]
pub struct SpotifyArtist {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct SpotifyAlbum {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct SavedTrack {
    pub track: SpotifyTrack,
}

#[derive(Debug, Deserialize)]
pub struct SavedAlbum {
    pub album: AlbumFull,
}

#[derive(Debug, Deserialize)]
pub struct AlbumFull {
    pub id: String,
    pub name: String,
    pub tracks: AlbumTracks,
}

#[derive(Debug, Deserialize)]
pub struct AlbumTracks {
    pub items: Vec<AlbumTrack>,
}

#[derive(Debug, Deserialize)]
pub struct AlbumTrack {
    pub id: String,
    pub name: String,
    pub artists: Vec<SpotifyArtist>,
    pub duration_ms: i64,
}

#[derive(Debug, Deserialize)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub owner: PlaylistOwner,
}

#[derive(Debug, Deserialize)]
pub struct PlaylistOwner {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct PlaylistTrack {
    pub track: Option<SpotifyTrack>,
}

#[derive(Debug, Deserialize)]
pub struct Paged<T> {
    pub items: Vec<T>,
    pub next: Option<String>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct AudioFeatures {
    pub id: String,
    pub tempo: f64,
    pub key: i64,
    pub mode: i64,
    pub danceability: f64,
    pub energy: f64,
    pub valence: f64,
    pub acousticness: f64,
    pub instrumentalness: f64,
    pub speechiness: f64,
    pub liveness: f64,
    pub loudness: f64,
}

#[derive(Debug, Deserialize)]
pub struct ReccoTrack {
    pub id: String,
    pub spotify_id: Option<String>,
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
}

impl SpotifyClient {
    pub fn new(client_id: String, client_secret: String, redirect_uri: String) -> Self {
        Self {
            client: Client::new(),
            client_id,
            client_secret,
            redirect_uri,
            access_token: None,
        }
    }

    pub fn auth_url(&self) -> String {
        let scopes = "user-library-read playlist-read-private playlist-read-collaborative";
        format!(
            "{}?client_id={}&response_type=code&redirect_uri={}&scope={}",
            SPOTIFY_AUTH_URL,
            self.client_id,
            urlencoding::encode(&self.redirect_uri),
            urlencoding::encode(scopes)
        )
    }

    pub async fn exchange_code(&mut self, code: &str) -> Result<TokenResponse, String> {
        let mut params = HashMap::new();
        params.insert("grant_type", "authorization_code");
        params.insert("code", code);
        params.insert("redirect_uri", &self.redirect_uri);

        let resp = self.client
            .post(SPOTIFY_TOKEN_URL)
            .basic_auth(&self.client_id, Some(&self.client_secret))
            .form(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let token: TokenResponse = resp.json().await.map_err(|e| e.to_string())?;
        self.access_token = Some(token.access_token.clone());
        Ok(token)
    }

    pub async fn refresh_token(&mut self, refresh_token: &str) -> Result<TokenResponse, String> {
        let mut params = HashMap::new();
        params.insert("grant_type", "refresh_token");
        params.insert("refresh_token", refresh_token);

        let resp = self.client
            .post(SPOTIFY_TOKEN_URL)
            .basic_auth(&self.client_id, Some(&self.client_secret))
            .form(&params)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("token refresh failed: {}", text));
        }

        let token: TokenResponse = resp.json().await.map_err(|e| e.to_string())?;
        self.access_token = Some(token.access_token.clone());
        Ok(token)
    }

    pub fn set_access_token(&mut self, token: String) {
        self.access_token = Some(token);
    }

    async fn get<T: for<'de> Deserialize<'de>>(&self, url: &str) -> Result<T, String> {
        let token = self.access_token.as_ref().ok_or("no access token")?;
        let resp = self.client
            .get(url)
            .bearer_auth(token)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("api error: {}", text));
        }

        resp.json().await.map_err(|e| e.to_string())
    }

    pub async fn get_saved_tracks(&self) -> Result<Vec<SavedTrack>, String> {
        let mut all = vec![];
        let mut url = format!("{}/me/tracks?limit=50", SPOTIFY_API_URL);

        loop {
            let page: Paged<SavedTrack> = self.get(&url).await?;
            all.extend(page.items);
            match page.next {
                Some(next) => url = next,
                None => break,
            }
        }

        Ok(all)
    }

    pub async fn get_saved_albums(&self) -> Result<Vec<SavedAlbum>, String> {
        let mut all = vec![];
        let mut url = format!("{}/me/albums?limit=50", SPOTIFY_API_URL);

        loop {
            let page: Paged<SavedAlbum> = self.get(&url).await?;
            all.extend(page.items);
            match page.next {
                Some(next) => url = next,
                None => break,
            }
        }

        Ok(all)
    }

    pub async fn get_user_id(&self) -> Result<String, String> {
        #[derive(Deserialize)]
        struct User { id: String }
        let user: User = self.get(&format!("{}/me", SPOTIFY_API_URL)).await?;
        Ok(user.id)
    }

    pub async fn get_playlists(&self) -> Result<Vec<Playlist>, String> {
        let mut all = vec![];
        let mut url = format!("{}/me/playlists?limit=50", SPOTIFY_API_URL);

        loop {
            let page: Paged<Playlist> = self.get(&url).await?;
            all.extend(page.items);
            match page.next {
                Some(next) => url = next,
                None => break,
            }
        }

        Ok(all)
    }

    pub async fn get_playlist_tracks(&self, playlist_id: &str) -> Result<Vec<PlaylistTrack>, String> {
        let mut all = vec![];
        let mut url = format!("{}/playlists/{}/tracks?limit=100", SPOTIFY_API_URL, playlist_id);

        loop {
            let page: Paged<PlaylistTrack> = self.get(&url).await?;
            all.extend(page.items);
            match page.next {
                Some(next) => url = next,
                None => break,
            }
        }

        Ok(all)
    }

    pub async fn get_audio_features_batch(&self, ids: &[String]) -> Result<Vec<SpotifyAudioFeatures>, String> {
        if ids.is_empty() {
            return Ok(vec![]);
        }

        let ids_str = ids.join(",");
        let url = format!("{}/audio-features?ids={}", SPOTIFY_API_URL, ids_str);

        #[derive(Deserialize)]
        struct Response {
            audio_features: Vec<Option<SpotifyAudioFeatures>>,
        }

        let resp: Response = self.get(&url).await?;
        Ok(resp.audio_features.into_iter().flatten().collect())
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct SpotifyAudioFeatures {
    pub id: String,
    pub tempo: f64,
    pub key: i64,
    pub mode: i64,
    pub danceability: f64,
    pub energy: f64,
    pub valence: f64,
    pub acousticness: f64,
    pub instrumentalness: f64,
    pub speechiness: f64,
    pub liveness: f64,
    pub loudness: f64,
}

pub struct ReccobeatsClient {
    client: Client,
}

#[derive(Debug, Deserialize)]
pub struct ReccoTracksResponse {
    pub content: Vec<ReccoTrackInfo>,
}

#[derive(Debug, Deserialize)]
pub struct ReccoTrackInfo {
    pub id: String,
    #[serde(rename = "trackTitle")]
    pub name: Option<String>,
    pub href: Option<String>,  // "https://open.spotify.com/track/{spotify_id}"
}

impl ReccoTrackInfo {
    pub fn spotify_id(&self) -> Option<String> {
        self.href.as_ref().and_then(|h| {
            h.strip_prefix("https://open.spotify.com/track/")
                .map(|s| s.to_string())
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct ReccoAudioFeatures {
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
}

impl ReccobeatsClient {
    pub fn new() -> Self {
        Self { client: Client::new() }
    }

    // step 1: get recco track ids from spotify ids
    pub async fn get_tracks_by_spotify_ids(&self, spotify_ids: &[String]) -> Result<Vec<ReccoTrackInfo>, String> {
        if spotify_ids.is_empty() {
            return Ok(vec![]);
        }

        let ids_str = spotify_ids.join(",");
        let url = format!("{}/track?ids={}", RECCOBEATS_API_URL, ids_str);
        let resp = self.client.get(&url).send().await.map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("recco track lookup failed {}: {}", status, text));
        }

        let data: ReccoTracksResponse = resp.json().await.map_err(|e| e.to_string())?;
        Ok(data.content)
    }

    // step 2: get audio features by recco track id
    pub async fn get_audio_features(&self, recco_id: &str) -> Result<Option<ReccoAudioFeatures>, String> {
        let url = format!("{}/track/{}/audio-features", RECCOBEATS_API_URL, recco_id);
        let resp = self.client.get(&url).send().await.map_err(|e| e.to_string())?;

        if resp.status().as_u16() == 404 {
            return Ok(None);
        }

        if !resp.status().is_success() {
            return Ok(None);
        }

        let features: ReccoAudioFeatures = resp.json().await.map_err(|e| e.to_string())?;
        Ok(Some(features))
    }
}
