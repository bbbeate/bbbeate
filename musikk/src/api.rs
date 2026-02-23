use axum::{
    Router,
    routing::{get, post},
    extract::{Path, Query, State},
    response::{Json, IntoResponse},
    http::StatusCode,
};
use rusqlite::Connection;
use serde::Deserialize;
use std::sync::Arc;
use std::path::PathBuf;
use tower_http::services::ServeDir;
use tower_http::cors::{CorsLayer, Any};

use crate::db::{self, TrackFilter};
use crate::spotify::SpotifyClient;
use crate::sync;

#[derive(Clone)]
pub struct AppState {
    pub db_path: PathBuf,
    pub spotify_client_id: String,
    pub spotify_client_secret: String,
}

pub async fn serve(state: AppState, port: u16) {
    let shared = Arc::new(state);

    let app = Router::new()
        .route("/api/tracks", get(get_tracks))
        .route("/api/tracks/{id}", get(get_track))
        .route("/api/meta", get(get_meta))
        .route("/api/sync", post(trigger_sync))
        .nest_service("/", ServeDir::new("static").append_index_html_on_directories(true))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any))
        .with_state(shared);

    let addr = format!("0.0.0.0:{}", port);
    println!("starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[derive(Deserialize)]
struct TracksQuery {
    tempo_min: Option<f64>,
    tempo_max: Option<f64>,
    energy_min: Option<f64>,
    energy_max: Option<f64>,
    danceability_min: Option<f64>,
    danceability_max: Option<f64>,
    valence_min: Option<f64>,
    valence_max: Option<f64>,
    key: Option<i64>,
    search: Option<String>,
    sort: Option<String>,
    limit: Option<i64>,
}

async fn get_tracks(
    State(state): State<Arc<AppState>>,
    Query(q): Query<TracksQuery>,
) -> impl IntoResponse {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    };

    let filter = TrackFilter {
        tempo_min: q.tempo_min,
        tempo_max: q.tempo_max,
        energy_min: q.energy_min,
        energy_max: q.energy_max,
        danceability_min: q.danceability_min,
        danceability_max: q.danceability_max,
        valence_min: q.valence_min,
        valence_max: q.valence_max,
        key: q.key,
        search: q.search,
        sort: q.sort,
        limit: q.limit,
    };

    match db::query_tracks(&conn, &filter) {
        Ok(tracks) => Json(tracks).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_track(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    };

    match db::get_track(&conn, &id) {
        Ok(Some(track)) => Json(track).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "track not found"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_meta(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    };

    let stats = db::get_stats(&conn).ok();
    let sources = db::get_all_sources(&conn).unwrap_or_default();
    let genres = db::get_all_genres(&conn).unwrap_or_default();

    Json(serde_json::json!({
        "stats": stats,
        "sources": sources,
        "genres": genres
    })).into_response()
}

async fn trigger_sync(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let client_id = state.spotify_client_id.clone();
    let client_secret = state.spotify_client_secret.clone();

    // spawn sync in background since it takes a while
    tokio::spawn(async move {
        let log_id = {
            let conn = match Connection::open(&db_path) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("sync failed to open db: {}", e);
                    return;
                }
            };
            db::start_sync_log(&conn).unwrap_or(0)
        };

        let mut spotify = SpotifyClient::new(
            client_id,
            client_secret,
            "http://127.0.0.1:1670/callback".to_string(),
        );

        match sync::run_sync(&db_path, &mut spotify, false, false).await {
            Ok(result) => {
                if let Ok(conn) = Connection::open(&db_path) {
                    let _ = db::finish_sync_log(&conn, log_id, result.added, result.updated, result.unavailable, None);
                }
                println!("sync complete: {} added, {} updated", result.added, result.updated);
            }
            Err(e) => {
                if let Ok(conn) = Connection::open(&db_path) {
                    let _ = db::finish_sync_log(&conn, log_id, 0, 0, 0, Some(&e));
                }
                eprintln!("sync failed: {}", e);
            }
        }
    });

    Json(serde_json::json!({"status": "sync started"}))
}
