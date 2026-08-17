use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::DatabaseConnection;
use transactional::transactional;

use crate::modules::example::repository::ExampleRepository;
use crate::shared::error::{WorkerError, WorkerResult};

#[async_trait]
pub trait ExampleService: Send + Sync {
    async fn on_created(&self, example_id: i32) -> WorkerResult<()>;
    async fn on_published(&self, example_id: i32, title: &str) -> WorkerResult<()>;
}

pub struct DefaultExampleService {
    repository: Arc<dyn ExampleRepository>,
    db: DatabaseConnection,
}

#[transactional]
#[async_trait]
impl ExampleService for DefaultExampleService {
    #[tx]
    async fn on_created(&self, example_id: i32) -> WorkerResult<()> {
        let record = self.repository.find_by_id(example_id).await?.ok_or_else(|| {
            WorkerError::InvalidPayload(format!("example {example_id} does not exist"))
        })?;

        tracing::info!(example_id = record.id, title = %record.title, "example created");
        Ok(())
    }

    #[tx]
    async fn on_published(&self, example_id: i32, title: &str) -> WorkerResult<()> {
        let record = self
            .repository
            .mark_published(example_id)
            .await?
            .ok_or_else(|| {
                WorkerError::InvalidPayload(format!("example {example_id} does not exist"))
            })?;

        tracing::info!(example_id = record.id, title = %title, "example published");
        Ok(())
    }
}

pub fn create_example_service(
    repository: Arc<dyn ExampleRepository>,
    db: DatabaseConnection,
) -> Arc<dyn ExampleService> {
    Arc::new(DefaultExampleService { repository, db })
}
