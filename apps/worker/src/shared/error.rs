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

pub type WorkerResult<T> = Result<T, WorkerError>;
