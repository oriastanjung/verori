use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use db::entities::example;

#[derive(Debug, Serialize, ToSchema)]
pub struct ExampleResponse {
    pub id: i32,
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

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateExampleRequest {
    pub title: String,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateExampleRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub published: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BulkUpdateExampleRequest {
    pub ids: Vec<i32>,
    pub published: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BulkDeleteExampleRequest {
    pub ids: Vec<i32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BulkResultResponse {
    pub affected: u64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PublishJobResponse {
    pub job_id: i64,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ListExampleQuery {
    pub published: Option<bool>,
}
