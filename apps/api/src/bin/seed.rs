//! Development seeder. Creates one admin and one plain user so the app and the
//! end to end tests have something to sign in with.
//!
//! Run with: just seed
//!
//! The credentials are fixed and public on purpose. Never run this against a
//! database that holds real accounts.

use std::collections::HashMap;
use std::process::ExitCode;

use better_auth::prelude::{AuthRequest, HttpMethod};
use sea_orm::{ConnectionTrait, Statement};
use serde_json::json;

use api::config::AppConfig;
use auth::{AuthSettings, ADMIN_ROLE, USER_ROLE};

const SIGN_UP_PATH: &str = "/sign-up/email";

struct SeedAccount {
    email: &'static str,
    password: &'static str,
    name: &'static str,
    role: &'static str,
}

const ACCOUNTS: [SeedAccount; 2] = [
    SeedAccount {
        email: "admin@verori.com",
        password: "Admin123!",
        name: "Verori Admin",
        role: ADMIN_ROLE,
    },
    SeedAccount {
        email: "user@verori.com",
        password: "User123!",
        name: "Verori User",
        role: USER_ROLE,
    },
];

#[tokio::main]
async fn main() -> ExitCode {
    logging::init();

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
        db.clone(),
    )
    .await
    {
        Ok(auth) => auth,
        Err(error) => {
            eprintln!("auth error: {error}");
            return ExitCode::FAILURE;
        }
    };

    for account in ACCOUNTS {
        match seed_account(&auth, &db, &account).await {
            Ok(created) if created => {
                println!("created {} ({})", account.email, account.role)
            }
            Ok(_) => println!("{} already exists, role refreshed", account.email),
            Err(error) => {
                eprintln!("failed to seed {}: {error}", account.email);
                return ExitCode::FAILURE;
            }
        }
    }

    println!();
    println!("admin: admin@verori.com / Admin123!");
    println!("user:  user@verori.com / User123!");

    ExitCode::SUCCESS
}

/// Signs the user up through Better Auth so the password is hashed exactly the
/// way sign-in expects, then sets the role directly.
async fn seed_account(
    auth: &auth::Auth,
    db: &sea_orm::DatabaseConnection,
    account: &SeedAccount,
) -> Result<bool, Box<dyn std::error::Error>> {
    let body = json!({
        "email": account.email,
        "password": account.password,
        "name": account.name,
    });

    let mut headers = HashMap::new();
    headers.insert("content-type".to_string(), "application/json".to_string());

    let request = AuthRequest::from_parts(
        HttpMethod::Post,
        SIGN_UP_PATH.to_string(),
        headers,
        Some(serde_json::to_vec(&body)?),
        HashMap::new(),
    );

    let response = auth.handle_request(request).await;
    let created = match response {
        Ok(response) => response.status < 400,
        Err(_) => false,
    };

    // Roles are not part of the sign-up payload, so set it afterwards.
    db.execute_raw(Statement::from_sql_and_values(
        db.get_database_backend(),
        r#"UPDATE users SET role = $1, email_verified = true WHERE email = $2"#,
        [
            sea_orm::Value::from(account.role),
            sea_orm::Value::from(account.email),
        ],
    ))
    .await?;

    Ok(created)
}
