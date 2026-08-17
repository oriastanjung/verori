pub mod entities;

use std::time::Duration;

use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};

const MAX_CONNECTIONS: u32 = 20;
const MIN_CONNECTIONS: u32 = 2;
const CONNECT_TIMEOUT_SECONDS: u64 = 8;
const IDLE_TIMEOUT_SECONDS: u64 = 300;
const MAX_LIFETIME_SECONDS: u64 = 1800;

/// Opens a pooled SeaORM connection. Statement logging is off because the
/// shared tracing setup already reports what matters.
pub async fn connect(database_url: &str) -> Result<DatabaseConnection, DbErr> {
    let mut options = ConnectOptions::new(database_url.to_string());

    options
        .max_connections(MAX_CONNECTIONS)
        .min_connections(MIN_CONNECTIONS)
        .connect_timeout(Duration::from_secs(CONNECT_TIMEOUT_SECONDS))
        .idle_timeout(Duration::from_secs(IDLE_TIMEOUT_SECONDS))
        .max_lifetime(Duration::from_secs(MAX_LIFETIME_SECONDS))
        .sqlx_logging(false);

    Database::connect(options).await
}

/// Closes the pool. Call this during shutdown so in-flight queries can finish.
pub async fn close(connection: DatabaseConnection) -> Result<(), DbErr> {
    connection.close().await
}
