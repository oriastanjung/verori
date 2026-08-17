use std::net::SocketAddr;

use sqlx::postgres::PgPoolOptions;

use api::build_app;
use api::config::AppConfig;
use auth::AuthSettings;

const MAX_DB_CONNECTIONS: u32 = 10;

#[tokio::main]
async fn main() {
    logging::init();

    let config = AppConfig::from_env().expect("failed to read config");

    let pool = PgPoolOptions::new()
        .max_connections(MAX_DB_CONNECTIONS)
        .connect(&config.database_url)
        .await
        .expect("failed to connect to postgres");

    let db = db::connect(&config.database_url)
        .await
        .expect("failed to connect sea-orm");

    let auth = auth::build_auth(
        AuthSettings {
            secret: config.auth_secret.clone(),
            base_url: config.base_url(),
            trusted_origins: vec![config.web_origin.clone()],
        },
        db.clone(),
    )
    .await
    .expect("failed to build auth");

    let (app, _) = build_app(db.clone(), pool.clone(), auth, &config);

    let address = config.bind_address();
    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .unwrap_or_else(|error| panic!("failed to bind {address}: {error}"));

    tracing::info!(address = %address, "api listening");

    // Stops accepting new connections on a signal and lets in-flight requests
    // finish before the process exits.
    // The rate limiter keys on the peer address, which only reaches the router
    // when the service is built with connect info.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(logging::shutdown::signal_received())
        .await
        .expect("server error");

    pool.close().await;
    let _ = db::close(db).await;

    tracing::info!("api shutdown complete");
}
