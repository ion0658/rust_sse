//! Run with
//!
//! ```not_rust
//! cargo run -p example-sse
//! ```

use anyhow::Result;
use axum::{
    extract::{State, TypedHeader},
    http::StatusCode,
    response::{
        sse::{Event, Sse},
        IntoResponse,
    },
    routing::{get, post},
    Json, Router,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, path::PathBuf, sync::Arc, time::Duration};
use tower_http::{services::ServeDir, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Message {
    id: i64,
    msg: String,
    timestamp: chrono::DateTime<chrono::Utc>,
}

struct AppState {
    pub sender: tokio::sync::broadcast::Sender<Message>,
    //pub reciever: tokio::sync::broadcast::Receiver<Message>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "example_sse=debug,tower_http=debug,rust_sse=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let assets_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets");

    let static_files_service = ServeDir::new(assets_dir).append_index_html_on_directories(true);

    let (tx, _rx) = tokio::sync::broadcast::channel::<Message>(1024);
    let app_state = Arc::new(AppState {
        sender: tx,
        //reciever: rx,
    });

    // build our application with a route
    let app = Router::new()
        .fallback_service(
            static_files_service
                .precompressed_br()
                .precompressed_deflate()
                .precompressed_gzip(),
        )
        .route("/post", post(post_handler))
        .route("/sse", get(sse_handler))
        .with_state(app_state)
        .layer(TraceLayer::new_for_http());

    // run it
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::debug!("listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn sse_handler(
    State(app_state): State<Arc<AppState>>,
    TypedHeader(user_agent): TypedHeader<headers::UserAgent>,
) -> Sse<impl Stream<Item = Result<Event>>> {
    tracing::info!("`{}` connected", user_agent.as_str());
    let stream = async_stream::stream! {
        let mut rx = app_state.sender.subscribe();
        while let Ok(msg) = rx.recv().await {
            tracing::debug!("Sending: {:?}", msg);
            let event = Event::default()
                .event("message")
                .data(serde_json::to_string(&msg)?);
            yield Ok(event);
        }
    };

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(1))
            .text("keep-alive-text"),
    )
}

async fn post_handler(
    State(app_state): State<Arc<AppState>>,
    Json(msg): Json<Message>,
) -> Result<impl IntoResponse, StatusCode> {
    app_state
        .sender
        .send(msg.clone())
        .or_else(|_| Err(StatusCode::INTERNAL_SERVER_ERROR))?;
    tracing::info!("Received: {:?}", msg);
    Ok(Json(msg))
}
