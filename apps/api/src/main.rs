use sqlx::postgres::PgPoolOptions;

use api::build_app;
use api::config::AppConfig;

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

    // core build app startup here
    let (app, _) = build_app(db.clone(), pool.clone());

    let address = config.bind_address();
    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .unwrap_or_else(|error| panic!("failed to bind {address}: {error}"));

    tracing::info!(address = %address, "api listening");

    // Stops accepting new connections on a signal and lets in-flight requests
    // finish before the process exits.
    axum::serve(listener, app)
        .with_graceful_shutdown(logging::shutdown::signal_received())
        .await
        .expect("server error");

    pool.close().await;
    let _ = db::close(db).await;

    tracing::info!("api shutdown complete");
}
