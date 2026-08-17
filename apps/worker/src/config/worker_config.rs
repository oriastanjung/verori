use std::env;
use std::path::Path;
use std::str::FromStr;
use std::time::Duration;

use thiserror::Error;

const DEFAULT_CONCURRENCY: usize = 4;
const DEFAULT_BATCH_SIZE: i64 = 10;
const DEFAULT_LEASE_SECONDS: u64 = 60;
const DEFAULT_POLL_INTERVAL_SECONDS: u64 = 5;
const DEFAULT_BACKOFF_BASE_SECONDS: u64 = 2;
const DEFAULT_BACKOFF_MAX_SECONDS: u64 = 300;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing env var: {0}")]
    Missing(&'static str),
    #[error("invalid env var {name}: {value}")]
    Invalid { name: &'static str, value: String },
}

#[derive(Debug, Clone)]
pub struct WorkerConfig {
    pub database_url: String,
    pub concurrency: usize,
    pub batch_size: i64,
    pub lease: Duration,
    pub poll_interval: Duration,
    pub backoff_base: Duration,
    pub backoff_max: Duration,
}

fn read<T: FromStr>(name: &'static str, fallback: T) -> Result<T, ConfigError> {
    match env::var(name) {
        Ok(raw) => raw.parse().map_err(|_| ConfigError::Invalid {
            name,
            value: raw,
        }),
        Err(_) => Ok(fallback),
    }
}

impl WorkerConfig {
    /// Reads this app's own `.env` (if present) then the process environment.
    pub fn from_env() -> Result<WorkerConfig, ConfigError> {
        let _ = dotenvy::from_path(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));

        let database_url =
            env::var("DATABASE_URL").map_err(|_| ConfigError::Missing("DATABASE_URL"))?;

        let concurrency = read("WORKER_CONCURRENCY", DEFAULT_CONCURRENCY)?;
        if concurrency == 0 {
            return Err(ConfigError::Invalid {
                name: "WORKER_CONCURRENCY",
                value: "0".to_string(),
            });
        }

        let batch_size = read("WORKER_BATCH_SIZE", DEFAULT_BATCH_SIZE)?;
        if batch_size <= 0 {
            return Err(ConfigError::Invalid {
                name: "WORKER_BATCH_SIZE",
                value: batch_size.to_string(),
            });
        }

        Ok(WorkerConfig {
            database_url,
            concurrency,
            batch_size,
            lease: Duration::from_secs(read("WORKER_LEASE_SECONDS", DEFAULT_LEASE_SECONDS)?),
            poll_interval: Duration::from_secs(read(
                "WORKER_POLL_INTERVAL_SECONDS",
                DEFAULT_POLL_INTERVAL_SECONDS,
            )?),
            backoff_base: Duration::from_secs(read(
                "WORKER_BACKOFF_BASE_SECONDS",
                DEFAULT_BACKOFF_BASE_SECONDS,
            )?),
            backoff_max: Duration::from_secs(read(
                "WORKER_BACKOFF_MAX_SECONDS",
                DEFAULT_BACKOFF_MAX_SECONDS,
            )?),
        })
    }
}
