use std::env;
use std::path::Path;

use thiserror::Error;

const DEFAULT_PORT: u16 = 3001;
const DEFAULT_HOST: &str = "0.0.0.0";

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing env var: {0}")]
    Missing(&'static str),
    #[error("invalid env var {name}: {value}")]
    Invalid { name: &'static str, value: String },
}

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub host: String,
    pub port: u16,
}

impl AppConfig {
    /// Reads this app's own `.env` (if present) then the process environment.
    pub fn from_env() -> Result<AppConfig, ConfigError> {
        let _ = dotenvy::from_path(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));

        let database_url =
            env::var("DATABASE_URL").map_err(|_| ConfigError::Missing("DATABASE_URL"))?;

        let host = env::var("HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string());

        let port = match env::var("PORT") {
            Ok(raw) => raw.parse().map_err(|_| ConfigError::Invalid {
                name: "PORT",
                value: raw,
            })?,
            Err(_) => DEFAULT_PORT,
        };

        Ok(AppConfig {
            database_url,
            host,
            port,
        })
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
