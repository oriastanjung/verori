use std::env;
use std::path::Path;
use std::str::FromStr;

use thiserror::Error;

const DEFAULT_PORT: u16 = 3001;
const DEFAULT_HOST: &str = "0.0.0.0";
const DEFAULT_WEB_ORIGIN: &str = "http://localhost:3000";
const MIN_SECRET_LENGTH: usize = 32;
const DEFAULT_RATE_LIMIT_PER_SECOND: u64 = 50;
const DEFAULT_RATE_LIMIT_BURST: u32 = 120;
const DEFAULT_BODY_LIMIT_KB: usize = 256;
const DEFAULT_REQUEST_TIMEOUT_SECONDS: u64 = 20;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing env var: {0}")]
    Missing(&'static str),
    #[error("invalid env var {name}: {value}")]
    Invalid { name: &'static str, value: String },
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

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub host: String,
    pub port: u16,
    pub auth_secret: String,
    pub web_origin: String,
    /// Sustained requests allowed per address, per second.
    pub rate_limit_per_second: u64,
    /// How far a caller may burst above that rate before being refused.
    pub rate_limit_burst: u32,
    pub body_limit_bytes: usize,
    pub request_timeout_seconds: u64,
    /// Only switch on behind TLS. The header tells browsers never to use
    /// plain http for this host again.
    pub enable_hsts: bool,
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
            rate_limit_per_second: read("RATE_LIMIT_PER_SECOND", DEFAULT_RATE_LIMIT_PER_SECOND)?,
            rate_limit_burst: read("RATE_LIMIT_BURST", DEFAULT_RATE_LIMIT_BURST)?,
            body_limit_bytes: read("BODY_LIMIT_KB", DEFAULT_BODY_LIMIT_KB)? * 1024,
            request_timeout_seconds: read(
                "REQUEST_TIMEOUT_SECONDS",
                DEFAULT_REQUEST_TIMEOUT_SECONDS,
            )?,
            enable_hsts: read("ENABLE_HSTS", false)?,
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
