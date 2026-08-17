use std::sync::Arc;

use sea_orm::DatabaseConnection;

use crate::modules::example::{
    create_example_created_consumer, create_example_published_consumer, create_example_repository,
    create_example_service,
};
use crate::shared::consumer::Consumer;

/// Builds every consumer once at boot.
pub fn build_consumers(db: DatabaseConnection) -> Vec<Arc<dyn Consumer>> {
    let example_repository = create_example_repository(db.clone());
    let example_service = create_example_service(example_repository, db.clone());

    vec![
        create_example_created_consumer(example_service.clone()),
        create_example_published_consumer(example_service),
    ]
}
