mod channel;

pub use channel::QueueChannel;

use serde_json::Value;
use sqlx::postgres::{PgListener, PgPool};
use thiserror::Error;

const BATCH_SIZE: i64 = 10;

#[derive(Debug, Error)]
pub enum QueueError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("unknown queue channel: {0}")]
    UnknownChannel(String),
}

#[derive(Debug, Clone)]
pub struct Job {
    pub id: i32,
    pub channel: QueueChannel,
    pub payload: Value,
}

pub async fn publish(
    pool: &PgPool,
    channel: QueueChannel,
    payload: Value,
) -> Result<i32, QueueError> {
    let row: (i32,) = sqlx::query_as(
        "INSERT INTO jobs (channel, payload, status, attempts)
         VALUES ($1, $2, 'pending', 0)
         RETURNING id",
    )
    .bind(channel.as_str())
    .bind(&payload)
    .fetch_one(pool)
    .await?;

    sqlx::query("SELECT pg_notify($1, $2)")
        .bind(channel.as_str())
        .bind(row.0.to_string())
        .execute(pool)
        .await?;

    Ok(row.0)
}

pub async fn listen(pool: &PgPool, channels: &[QueueChannel]) -> Result<PgListener, QueueError> {
    let mut listener = PgListener::connect_with(pool).await?;
    for channel in channels {
        listener.listen(channel.as_str()).await?;
    }
    Ok(listener)
}

pub async fn fetch_pending(
    pool: &PgPool,
    channel: QueueChannel,
) -> Result<Vec<Job>, QueueError> {
    let rows: Vec<(i32, String, Value)> = sqlx::query_as(
        "UPDATE jobs SET status = 'processing', attempts = attempts + 1
         WHERE id IN (
             SELECT id FROM jobs
             WHERE channel = $1 AND status = 'pending'
             ORDER BY created_at
             LIMIT $2
             FOR UPDATE SKIP LOCKED
         )
         RETURNING id, channel, payload",
    )
    .bind(channel.as_str())
    .bind(BATCH_SIZE)
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(|(id, channel_name, payload)| {
            let channel = QueueChannel::parse(&channel_name)
                .ok_or_else(|| QueueError::UnknownChannel(channel_name.clone()))?;
            Ok(Job {
                id,
                channel,
                payload,
            })
        })
        .collect()
}

pub async fn complete(pool: &PgPool, job_id: i32) -> Result<(), QueueError> {
    sqlx::query("UPDATE jobs SET status = 'done' WHERE id = $1")
        .bind(job_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn fail(pool: &PgPool, job_id: i32, reason: &str) -> Result<(), QueueError> {
    sqlx::query("UPDATE jobs SET status = 'failed', last_error = $2 WHERE id = $1")
        .bind(job_id)
        .bind(reason)
        .execute(pool)
        .await?;
    Ok(())
}
