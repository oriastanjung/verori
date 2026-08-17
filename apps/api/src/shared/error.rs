use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use thiserror::Error;
use utoipa::ToSchema;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{resource} with id {id} not found")]
    NotFound { resource: &'static str, id: i32 },

    #[error("invalid request: {0}")]
    BadRequest(String),

    #[error("authentication required")]
    Unauthorized,

    #[error("you do not have access to this resource")]
    Forbidden,

    #[error("database error: {0}")]
    Database(#[from] sea_orm::DbErr),

    #[error("queue error: {0}")]
    Queue(#[from] queue::QueueError),
}

/// The single place where a domain error becomes an HTTP status code.
impl AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound { .. } => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::Forbidden => StatusCode::FORBIDDEN,
            AppError::Database(_) | AppError::Queue(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorBody {
    pub message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();

        if status == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(error = %self, "request failed");
        }

        let body = ErrorBody {
            message: self.to_string(),
        };

        (status, Json(body)).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
