use thiserror::Error;

#[derive(Debug, Error)]
pub enum WorkerError {
    #[error("payload is not valid for this consumer: {0}")]
    InvalidPayload(String),

    #[error("database error: {0}")]
    Database(#[from] sea_orm::DbErr),

    #[error("queue error: {0}")]
    Queue(#[from] queue::QueueError),
}

/// Lets the transaction helper retry only transient database conflicts.
impl db::tx::DatabaseErrorSource for WorkerError {
    fn database_error(&self) -> Option<&sea_orm::DbErr> {
        match self {
            WorkerError::Database(error) => Some(error),
            _ => None,
        }
    }
}

pub type WorkerResult<T> = Result<T, WorkerError>;
