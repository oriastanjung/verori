use std::env;
use std::path::Path;

use thiserror::Error;

const DEFAULT_PORT: u16 = 3001;
const DEFAULT_HOST: &str = "0.0.0.0";
const DEFAULT_WEB_ORIGIN: &str = "http://localhost:3000";
const MIN_SECRET_LENGTH: usize = 32;

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
    pub auth_secret: String,
    pub web_origin: String,
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

        let auth_secret =
            env::var("AUTH_SECRET").map_err(|_| ConfigError::Missing("AUTH_SECRET"))?;

        if auth_secret.len() < MIN_SECRET_LENGTH {
            return Err(ConfigError::Invalid {
                name: "AUTH_SECRET",
                value: format!("must be at least {MIN_SECRET_LENGTH} characters"),
            });
        }

        let web_origin = env::var("WEB_ORIGIN").unwrap_or_else(|_| DEFAULT_WEB_ORIGIN.to_string());

        Ok(AppConfig {
            database_url,
            host,
            port,
            auth_secret,
            web_origin,
        })
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    /// The url Better Auth uses when it builds links back to this api.
    pub fn base_url(&self) -> String {
        format!("http://localhost:{}", self.port)
    }
}
