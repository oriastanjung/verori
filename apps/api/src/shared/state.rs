use std::sync::Arc;

use sea_orm::DatabaseConnection;
use sqlx::PgPool;

use crate::modules::example::{create_example_repository, create_example_service, ExampleService};

/// Wires every module together once at boot. Handlers only ever see the traits.
#[derive(Clone)]
pub struct AppState {
    pub example_service: Arc<dyn ExampleService>,
}

impl AppState {
    pub fn new(db: DatabaseConnection, pool: PgPool) -> AppState {
        let example_repository = create_example_repository(db.clone());
        let example_service = create_example_service(example_repository, pool.clone());

        AppState {
            example_service,
        }
    }
}
