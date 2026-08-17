use chrono::{DateTime, FixedOffset};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use db::entities::example;

#[derive(Debug, Serialize, ToSchema)]
pub struct ExampleResponse {
    pub id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub published: bool,
    pub created_at: DateTime<FixedOffset>,
    pub updated_at: DateTime<FixedOffset>,
}

impl From<example::Model> for ExampleResponse {
    fn from(model: example::Model) -> ExampleResponse {
        ExampleResponse {
            id: model.id,
            title: model.title,
            content: model.content,
            published: model.published,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateExampleRequest {
    pub title: String,
    pub content: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateExampleRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub published: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct BulkUpdateExampleRequest {
    pub ids: Vec<Uuid>,
    pub published: bool,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct BulkDeleteExampleRequest {
    pub ids: Vec<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BulkResultResponse {
    pub affected: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PublishJobResponse {
    pub job_id: Uuid,
}

/// Paging, searching, sorting and filtering for the list endpoint.
#[derive(Debug, Clone, Default, Deserialize, IntoParams)]
pub struct ListExampleQuery {
    /// One based.
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    /// Matches the title or the content.
    pub search: Option<String>,
    /// One of: id, title, published, created_at.
    pub sort_by: Option<String>,
    /// asc or desc.
    pub sort_dir: Option<String>,
    pub published: Option<bool>,
}

/// One page of results plus the counts a table needs for its footer.
#[derive(Debug, Serialize, ToSchema)]
pub struct ExamplePage {
    pub items: Vec<ExampleResponse>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
    pub total_pages: u64,
}
