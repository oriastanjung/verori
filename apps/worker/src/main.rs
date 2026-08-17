mod config;
mod modules;
mod shared;

use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use tokio_util::sync::CancellationToken;

use crate::config::WorkerConfig;
use crate::shared::runner::Runner;
use crate::shared::state::build_consumers;

#[tokio::main]
async fn main() {
    logging::init();

    let config = WorkerConfig::from_env().expect("failed to read config");

    // One connection per in-flight job, plus the listener and the reaper.
    let pool_size = config.concurrency as u32 + 2;

    let pool = PgPoolOptions::new()
        .max_connections(pool_size)
        .connect(&config.database_url)
        .await
        .expect("failed to connect to postgres");

    let db = db::connect(&config.database_url)
        .await
        .expect("failed to connect sea-orm");

    let consumers = build_consumers(db.clone());
    let runner = Arc::new(Runner::new(pool.clone(), config, consumers));

    let shutdown = CancellationToken::new();
    let signal_watcher = tokio::spawn({
        let shutdown = shutdown.clone();
        async move {
            logging::shutdown::signal_received().await;
            shutdown.cancel();
        }
    });

    runner.run(shutdown).await;

    signal_watcher.abort();
    pool.close().await;
    let _ = db::close(db).await;

    tracing::info!("worker shutdown complete");
}
