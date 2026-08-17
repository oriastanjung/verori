use std::sync::Arc;

use async_trait::async_trait;
use serde_json::json;
use sea_orm::DatabaseConnection;
use sqlx::PgPool;
use transactional::transactional;

use queue::{PublishOptions, QueueChannel};

use crate::shared::error::{AppError, AppResult};
use crate::modules::example::dto::{
    BulkDeleteExampleRequest, BulkUpdateExampleRequest, CreateExampleRequest, ExampleResponse,
    UpdateExampleRequest,
};
use crate::modules::example::repository::ExampleRepository;

const RESOURCE: &str = "example";

/// Business rules for the example module.
#[async_trait]
pub trait ExampleService: Send + Sync {
    async fn list(&self, published: Option<bool>) -> AppResult<Vec<ExampleResponse>>;
    async fn get(&self, id: i32) -> AppResult<ExampleResponse>;
    async fn create(&self, input: CreateExampleRequest) -> AppResult<ExampleResponse>;
    async fn update(&self, id: i32, input: UpdateExampleRequest) -> AppResult<ExampleResponse>;
    async fn delete(&self, id: i32) -> AppResult<()>;
    async fn bulk_update(&self, input: BulkUpdateExampleRequest) -> AppResult<u64>;
    async fn bulk_delete(&self, input: BulkDeleteExampleRequest) -> AppResult<u64>;
    async fn publish_to_queue(&self, id: i32) -> AppResult<i64>;
}

pub struct DefaultExampleService {
    repository: Arc<dyn ExampleRepository>,
    pool: PgPool,
    db: DatabaseConnection,
}

impl DefaultExampleService {
    fn ensure_not_empty(ids: &[i32]) -> AppResult<()> {
        if ids.is_empty() {
            return Err(AppError::BadRequest("ids must not be empty".to_string()));
        }
        Ok(())
    }
}

#[transactional]
#[async_trait]
impl ExampleService for DefaultExampleService {
    async fn list(&self, published: Option<bool>) -> AppResult<Vec<ExampleResponse>> {
        let records = self.repository.find_all(published).await?;
        Ok(records.into_iter().map(ExampleResponse::from).collect())
    }

    async fn get(&self, id: i32) -> AppResult<ExampleResponse> {
        let record = self
            .repository
            .find_by_id(id)
            .await?
            .ok_or(AppError::NotFound {
                resource: RESOURCE,
                id,
            })?;

        Ok(ExampleResponse::from(record))
    }

    #[tx]
    async fn create(&self, input: CreateExampleRequest) -> AppResult<ExampleResponse> {
        if input.title.trim().is_empty() {
            return Err(AppError::BadRequest("title must not be empty".to_string()));
        }

        let record = self.repository.create(input).await?;

        // One created-event per example, even if this handler runs twice.
        queue::publish(
            &self.pool,
            QueueChannel::ExampleCreated,
            json!({ "example_id": record.id }),
            PublishOptions::with_idempotency_key(format!("example-created-{}", record.id)),
        )
        .await?;

        Ok(ExampleResponse::from(record))
    }

    #[tx]
    async fn update(&self, id: i32, input: UpdateExampleRequest) -> AppResult<ExampleResponse> {
        let record = self
            .repository
            .update(id, input)
            .await?
            .ok_or(AppError::NotFound {
                resource: RESOURCE,
                id,
            })?;

        Ok(ExampleResponse::from(record))
    }

    async fn delete(&self, id: i32) -> AppResult<()> {
        let affected = self.repository.delete(id).await?;

        if affected == 0 {
            return Err(AppError::NotFound {
                resource: RESOURCE,
                id,
            });
        }

        Ok(())
    }

    #[tx]
    async fn bulk_update(&self, input: BulkUpdateExampleRequest) -> AppResult<u64> {
        Self::ensure_not_empty(&input.ids)?;
        let affected = self
            .repository
            .bulk_set_published(&input.ids, input.published)
            .await?;
        Ok(affected)
    }

    #[tx]
    async fn bulk_delete(&self, input: BulkDeleteExampleRequest) -> AppResult<u64> {
        Self::ensure_not_empty(&input.ids)?;
        let affected = self.repository.bulk_delete(&input.ids).await?;
        Ok(affected)
    }

    async fn publish_to_queue(&self, id: i32) -> AppResult<i64> {
        let record = self
            .repository
            .find_by_id(id)
            .await?
            .ok_or(AppError::NotFound {
                resource: RESOURCE,
                id,
            })?;

        let job_id = queue::publish(
            &self.pool,
            QueueChannel::ExamplePublished,
            json!({ "example_id": record.id, "title": record.title }),
            PublishOptions::default(),
        )
        .await?;

        Ok(job_id)
    }
}

pub fn create_example_service(
    repository: Arc<dyn ExampleRepository>,
    pool: PgPool,
    db: DatabaseConnection,
) -> Arc<dyn ExampleService> {
    Arc::new(DefaultExampleService {
        repository,
        pool,
        db,
    })
}
