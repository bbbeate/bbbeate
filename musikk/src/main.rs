mod api;
mod db;
mod spotify;
mod sync;

use clap::{Parser, Subcommand};
use std::path::PathBuf;
use std::io::{BufRead, BufReader};
use std::net::TcpListener;

#[derive(Parser)]
#[command(name = "musikk")]
#[command(about = "spotify library with audio features")]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    #[arg(long, default_value = "musikk.db")]
    db: PathBuf,
}

#[derive(Subcommand)]
enum Commands {
    Serve {
        #[arg(short, long, default_value = "1670")]
        port: u16,
    },
    Sync {
        #[arg(long)]
        dry_run: bool,
        #[arg(long)]
        backfill: bool,
    },
    Auth,
    Stats,
}

fn get_spotify_creds() -> (String, String) {
    let client_id = std::env::var("SPOTIFY_CLIENT_ID")
        .expect("SPOTIFY_CLIENT_ID env var required");
    let client_secret = std::env::var("SPOTIFY_CLIENT_SECRET")
        .expect("SPOTIFY_CLIENT_SECRET env var required");
    (client_id, client_secret)
}

#[tokio::main]
async fn main() {
    // try to load .env from current dir, parent dir, or grandparent dir
    let _ = dotenvy::dotenv()
        .or_else(|_| dotenvy::from_filename("../.env"))
        .or_else(|_| dotenvy::from_filename("../../.env"));
    
    let cli = Cli::parse();

    match cli.command {
        Commands::Serve { port } => {
            let (client_id, client_secret) = get_spotify_creds();
            let state = api::AppState {
                db_path: cli.db,
                spotify_client_id: client_id,
                spotify_client_secret: client_secret,
            };
            api::serve(state, port).await;
        }

        Commands::Sync { dry_run, backfill } => {
            let (client_id, client_secret) = get_spotify_creds();

            // ensure db exists
            let _ = db::open_db(&cli.db).expect("failed to open db");

            let log_id = if !dry_run {
                let conn = db::open_db(&cli.db).expect("failed to open db");
                Some(db::start_sync_log(&conn).expect("failed to start sync log"))
            } else {
                None
            };

            let mut spotify = spotify::SpotifyClient::new(
                client_id,
                client_secret,
                "http://127.0.0.1:1670/callback".to_string(),
            );

            match sync::run_sync(&cli.db, &mut spotify, dry_run, backfill).await {
                Ok(result) => {
                    if let Some(id) = log_id {
                        let conn = db::open_db(&cli.db).expect("failed to open db");
                        db::finish_sync_log(&conn, id, result.added, result.updated, result.unavailable, None)
                            .expect("failed to finish sync log");
                    }
                }
                Err(e) => {
                    eprintln!("sync failed: {}", e);
                    if let Some(id) = log_id {
                        let conn = db::open_db(&cli.db).expect("failed to open db");
                        db::finish_sync_log(&conn, id, 0, 0, 0, Some(&e))
                            .expect("failed to finish sync log");
                    }
                    std::process::exit(1);
                }
            }
        }

        Commands::Auth => {
            let (client_id, client_secret) = get_spotify_creds();
            let conn = db::open_db(&cli.db).expect("failed to open db");
            let redirect_uri = "http://127.0.0.1:1670/callback";

            let mut spotify = spotify::SpotifyClient::new(
                client_id,
                client_secret,
                redirect_uri.to_string(),
            );

            let auth_url = spotify.auth_url();
            println!("open this url in your browser:\n{}\n", auth_url);

            // start temp server to catch callback
            let listener = TcpListener::bind("127.0.0.1:1670").expect("failed to bind");
            println!("waiting for callback on 127.0.0.1:1670...");

            let (stream, _) = listener.accept().expect("failed to accept");
            let reader = BufReader::new(&stream);
            let request_line = reader.lines().next().unwrap().unwrap();

            // parse code from GET /callback?code=xxx
            let code = request_line
                .split_whitespace()
                .nth(1)
                .and_then(|path| path.strip_prefix("/callback?code="))
                .map(|s| s.split('&').next().unwrap_or(s))
                .expect("failed to parse code");

            println!("got code, exchanging for token...");

            let token = spotify.exchange_code(code).await
                .expect("failed to exchange code");

            if let Some(refresh_token) = token.refresh_token {
                db::set_config(&conn, "spotify_refresh_token", &refresh_token)
                    .expect("failed to save refresh token");
                println!("saved refresh token to db");
            }

            // send response to browser
            use std::io::Write;
            let mut stream = stream;
            let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<h1>auth complete!</h1><p>you can close this tab.</p>";
            stream.write_all(response.as_bytes()).ok();

            println!("auth complete!");
        }

        Commands::Stats => {
            let conn = db::open_db(&cli.db).expect("failed to open db");
            let stats = db::get_stats(&conn).expect("failed to get stats");

            println!("musikk stats");
            println!("------------");
            println!("total tracks:        {}", stats.total_tracks);
            println!("with audio features: {}", stats.tracks_with_features);
            println!("unavailable:         {}", stats.unavailable_tracks);
            if let Some(tempo) = stats.avg_tempo {
                println!("avg tempo:           {:.1} bpm", tempo);
            }
            if let Some(energy) = stats.avg_energy {
                println!("avg energy:          {:.2}", energy);
            }
            if let Some(last) = stats.last_sync {
                println!("last sync:           {}", last);
            }
        }
    }
}
