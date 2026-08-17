use std::sync::Arc;

use async_trait::async_trait;
use serde_json::json;
use sea_orm::DatabaseConnection;
use sqlx::PgPool;
use transactional::transactional;

use queue::{PublishOptions, QueueChannel};

use crate::shared::error::{AppError, AppResult};
use crate::modules::example::dto::{
    BulkDeleteExampleRequest, BulkUpdateExampleRequest, CreateExampleRequest, ExamplePage,
    ExampleResponse, ListExampleQuery, UpdateExampleRequest,
};
use crate::modules::example::repository::ExampleRepository;

const RESOURCE: &str = "example";
const MAX_TITLE_LENGTH: usize = 200;
const MAX_CONTENT_LENGTH: usize = 5_000;
const MAX_BULK_IDS: usize = 500;
const DEFAULT_PAGE: u64 = 1;
const DEFAULT_PER_PAGE: u64 = 10;
const MAX_PER_PAGE: u64 = 100;

/// Business rules for the example module.
#[async_trait]
pub trait ExampleService: Send + Sync {
    async fn list(&self, query: ListExampleQuery) -> AppResult<ExamplePage>;
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
    fn ensure_bulk_size(ids: &[i32]) -> AppResult<()> {
        if ids.is_empty() {
            return Err(AppError::BadRequest("ids must not be empty".to_string()));
        }
        if ids.len() > MAX_BULK_IDS {
            return Err(AppError::BadRequest(format!(
                "no more than {MAX_BULK_IDS} ids per request"
            )));
        }
        Ok(())
    }

    fn ensure_within_limits(title: Option<&str>, content: Option<&str>) -> AppResult<()> {
        if let Some(title) = title {
            if title.chars().count() > MAX_TITLE_LENGTH {
                return Err(AppError::BadRequest(format!(
                    "title must be at most {MAX_TITLE_LENGTH} characters"
                )));
            }
        }

        if let Some(content) = content {
            if content.chars().count() > MAX_CONTENT_LENGTH {
                return Err(AppError::BadRequest(format!(
                    "content must be at most {MAX_CONTENT_LENGTH} characters"
                )));
            }
        }

        Ok(())
    }
}

#[transactional]
#[async_trait]
impl ExampleService for DefaultExampleService {
    async fn list(&self, query: ListExampleQuery) -> AppResult<ExamplePage> {
        let per_page = query.per_page.unwrap_or(DEFAULT_PER_PAGE).clamp(1, MAX_PER_PAGE);
        let page = query.page.unwrap_or(DEFAULT_PAGE).max(DEFAULT_PAGE);

        let (records, total) = self.repository.find_page(&query, page, per_page).await?;

        Ok(ExamplePage {
            items: records.into_iter().map(ExampleResponse::from).collect(),
            total,
            page,
            per_page,
            total_pages: total.div_ceil(per_page),
        })
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
        Self::ensure_within_limits(Some(&input.title), input.content.as_deref())?;

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
        Self::ensure_within_limits(input.title.as_deref(), input.content.as_deref())?;

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
        Self::ensure_bulk_size(&input.ids)?;
        let affected = self
            .repository
            .bulk_set_published(&input.ids, input.published)
            .await?;
        Ok(affected)
    }

    #[tx]
    async fn bulk_delete(&self, input: BulkDeleteExampleRequest) -> AppResult<u64> {
        Self::ensure_bulk_size(&input.ids)?;
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
