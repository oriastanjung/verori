use std::sync::Arc;

use axum::extract::FromRef;
use sea_orm::DatabaseConnection;
use sqlx::PgPool;

use auth::Auth;

use crate::modules::example::{create_example_repository, create_example_service, ExampleService};

/// Wires every module together once at boot. Handlers only ever see the traits.
#[derive(Clone)]
pub struct AppState {
    pub auth: Arc<Auth>,
    pub example_service: Arc<dyn ExampleService>,
}

impl AppState {
    pub fn new(db: DatabaseConnection, pool: PgPool, auth: Arc<Auth>) -> AppState {
        let example_repository = create_example_repository(db.clone());
        let example_service = create_example_service(example_repository, pool.clone(), db.clone());

        AppState {
            auth,
            example_service,
        }
    }
}

/// Lets the Better Auth session extractors pull the auth instance out of state.
impl FromRef<AppState> for Arc<Auth> {
    fn from_ref(state: &AppState) -> Arc<Auth> {
        Arc::clone(&state.auth)
    }
}
