pub mod roles;
pub mod schema;

use std::sync::Arc;

use better_auth::middleware::CsrfConfig;
use better_auth::plugins::{
    AccountManagementPlugin, AdminPlugin, EmailPasswordPlugin,
    EmailVerificationPlugin, PasswordManagementPlugin, SessionManagementPlugin,
    UserManagementPlugin,
};
use better_auth::seaorm::{DatabaseConnection, SeaOrmStore};
use better_auth::{AuthConfig, BetterAuth};

pub use better_auth::integrations::axum::{AxumIntegration, CurrentSession, OptionalSession};
pub use better_auth::prelude::AuthUser;

pub use roles::{Role, ADMIN_ROLE, USER_ROLE};
pub use schema::AppAuthSchema;

const MIN_PASSWORD_LENGTH: usize = 8;

pub type Auth = BetterAuth<AppAuthSchema>;

#[derive(Debug, Clone)]
pub struct AuthSettings {
    pub secret: String,
    pub base_url: String,
    pub trusted_origins: Vec<String>,
}

/// Builds the Better Auth instance with the plugins this app uses.
///
/// To add Google or GitHub sign-in, enable the `OAuthPlugin` here, for example:
///
/// ```ignore
/// use better_auth::plugins::OAuthPlugin;
///
/// .plugin(
///     OAuthPlugin::new()
///         .google(client_id, client_secret)
///         .redirect_uri(format!("{base_url}/api/auth/callback/google")),
/// )
/// ```
///
/// The provider secrets belong in `apps/api/.env`, never in code.
pub async fn build_auth(
    settings: AuthSettings,
    database: DatabaseConnection,
) -> Result<Arc<Auth>, better_auth::AuthError> {
    let config = AuthConfig::new(settings.secret)
        .base_url(&settings.base_url)
        .trusted_origins(settings.trusted_origins)
        .password_min_length(MIN_PASSWORD_LENGTH);

    let store = SeaOrmStore::<AppAuthSchema>::new(config.clone(), database);

    let auth = BetterAuth::<AppAuthSchema>::new(config)
        .csrf(CsrfConfig::new().enabled(true))
        .store(store)
        .plugin(EmailPasswordPlugin::new().enable_signup(true))
        .plugin(SessionManagementPlugin::new())
        .plugin(PasswordManagementPlugin::new())
        .plugin(AccountManagementPlugin::new())
        .plugin(UserManagementPlugin::new())
        .plugin(EmailVerificationPlugin::new())
        .plugin(AdminPlugin::with_config(roles::admin_config()))
        .build()
        .await?;

    Ok(Arc::new(auth))
}
