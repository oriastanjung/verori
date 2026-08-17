//! Writes the OpenAPI document that the web app generates its types from.
//!
//! It includes the Better Auth routes, and those only exist on a live auth
//! instance, so this needs a reachable database.

use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use api::config::AppConfig;
use api::openapi_document;
use api::shared::docs::merged_spec;
use auth::AuthSettings;

const DEFAULT_OUTPUT: &str = "openapi.json";

#[tokio::main]
async fn main() -> ExitCode {
    let output = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_OUTPUT));

    let config = match AppConfig::from_env() {
        Ok(config) => config,
        Err(error) => {
            eprintln!("config error: {error}");
            return ExitCode::FAILURE;
        }
    };

    let db = match db::connect(&config.database_url).await {
        Ok(db) => db,
        Err(error) => {
            eprintln!("database error: {error}");
            return ExitCode::FAILURE;
        }
    };

    let auth = match auth::build_auth(
        AuthSettings {
            secret: config.auth_secret.clone(),
            base_url: config.base_url(),
            trusted_origins: vec![config.web_origin.clone()],
        },
        db,
    )
    .await
    {
        Ok(auth) => auth,
        Err(error) => {
            eprintln!("auth error: {error}");
            return ExitCode::FAILURE;
        }
    };

    let document = merged_spec(&openapi_document(), auth.as_ref());
    let json = serde_json::to_string_pretty(&document).expect("openapi must serialize");

    if let Some(parent) = output.parent() {
        if let Err(error) = fs::create_dir_all(parent) {
            eprintln!("failed to create output directory: {error}");
            return ExitCode::FAILURE;
        }
    }

    if let Err(error) = fs::write(&output, json) {
        eprintln!("failed to write openapi file: {error}");
        return ExitCode::FAILURE;
    }

    println!("wrote {}", output.display());
    ExitCode::SUCCESS
}
