mod config;
mod modules;
mod shared;

use sqlx::postgres::PgPoolOptions;

use crate::config::WorkerConfig;
use crate::shared::runner::Runner;
use crate::shared::state::build_consumers;

const MAX_DB_CONNECTIONS: u32 = 5;

#[tokio::main]
async fn main() {
    logging::init();

    let config = WorkerConfig::from_env().expect("failed to read config");

    let pool = PgPoolOptions::new()
        .max_connections(MAX_DB_CONNECTIONS)
        .connect(&config.database_url)
        .await
        .expect("failed to connect to postgres");

    let db = db::connect(&config.database_url)
        .await
        .expect("failed to connect sea-orm");

    let consumers = build_consumers(db);
    Runner::new(pool, consumers).run().await;
}
