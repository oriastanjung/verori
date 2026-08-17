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

/// What a caller is told when something broke on our side. The real error goes
/// to the log, never to the response, because a database message can describe
/// the schema to someone probing it.
const INTERNAL_MESSAGE: &str = "something went wrong on our side";

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();

        let message = if status == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(error = %self, "request failed");
            INTERNAL_MESSAGE.to_string()
        } else {
            self.to_string()
        };

        let body = ErrorBody { message };

        (status, Json(body)).into_response()
    }
}

/// Lets the transaction helper tell a transient conflict apart from a real
/// failure, so only the first kind is retried.
impl db::tx::DatabaseErrorSource for AppError {
    fn database_error(&self) -> Option<&sea_orm::DbErr> {
        match self {
            AppError::Database(error) => Some(error),
            _ => None,
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;
