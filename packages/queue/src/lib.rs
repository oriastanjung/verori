mod channel;

pub use channel::QueueChannel;

use std::time::Duration;

use serde_json::Value;
use sqlx::postgres::{PgListener, PgPool};
use thiserror::Error;
use uuid::Uuid;

/// Job lifecycle. A job is always in exactly one of these states.
pub const STATUS_PENDING: &str = "pending";
pub const STATUS_PROCESSING: &str = "processing";
pub const STATUS_DONE: &str = "done";
/// Retry budget is used up. This is the dead letter queue.
pub const STATUS_DEAD: &str = "dead";

#[derive(Debug, Error)]
pub enum QueueError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("unknown queue channel: {0}")]
    UnknownChannel(String),
}

#[derive(Debug, Clone)]
pub struct Job {
    pub id: Uuid,
    pub channel: QueueChannel,
    pub payload: Value,
    pub attempts: i32,
    pub max_attempts: i32,
}

impl Job {
    pub fn is_last_attempt(&self) -> bool {
        self.attempts >= self.max_attempts
    }
}

/// Extra publish settings. `PublishOptions::default()` runs the job now with
/// the queue default retry budget and no deduplication.
#[derive(Debug, Clone, Default)]
pub struct PublishOptions {
    /// Publishing twice with the same key on the same channel enqueues once.
    pub idempotency_key: Option<String>,
    pub max_attempts: Option<i32>,
    pub delay: Option<Duration>,
}

impl PublishOptions {
    pub fn with_idempotency_key(key: impl Into<String>) -> PublishOptions {
        PublishOptions {
            idempotency_key: Some(key.into()),
            ..PublishOptions::default()
        }
    }
}

fn to_interval(duration: Duration) -> f64 {
    duration.as_secs_f64()
}

/// Enqueues a job and wakes any listening worker.
///
/// When an idempotency key is given and a job with that key already exists on
/// the channel, nothing is inserted and the existing id is returned.
pub async fn publish(
    pool: &PgPool,
    channel: QueueChannel,
    payload: Value,
    options: PublishOptions,
) -> Result<Uuid, QueueError> {
    let delay_seconds = to_interval(options.delay.unwrap_or_default());

    // The id is generated here rather than by the database, because UUIDv7
    // carries the creation time in its first 48 bits.
    let inserted: Option<(Uuid,)> = sqlx::query_as(
        "INSERT INTO jobs (id, channel, payload, status, attempts, max_attempts, available_at, idempotency_key)
         VALUES ($1, $2, $3, 'pending', 0, COALESCE($4, 5), now() + make_interval(secs => $5), $6)
         ON CONFLICT (channel, idempotency_key) WHERE idempotency_key IS NOT NULL
         DO NOTHING
         RETURNING id",
    )
    .bind(Uuid::now_v7())
    .bind(channel.as_str())
    .bind(&payload)
    .bind(options.max_attempts)
    .bind(delay_seconds)
    .bind(options.idempotency_key.as_deref())
    .fetch_optional(pool)
    .await?;

    if let Some((id,)) = inserted {
        sqlx::query("SELECT pg_notify($1, $2)")
            .bind(channel.as_str())
            .bind(id.to_string())
            .execute(pool)
            .await?;
        return Ok(id);
    }

    // The insert was skipped, so an identical job is already queued.
    let (existing,): (Uuid,) = sqlx::query_as(
        "SELECT id FROM jobs WHERE channel = $1 AND idempotency_key = $2",
    )
    .bind(channel.as_str())
    .bind(options.idempotency_key.as_deref())
    .fetch_one(pool)
    .await?;

    Ok(existing)
}

pub async fn listen(pool: &PgPool, channels: &[QueueChannel]) -> Result<PgListener, QueueError> {
    let mut listener = PgListener::connect_with(pool).await?;
    for channel in channels {
        listener.listen(channel.as_str()).await?;
    }
    Ok(listener)
}

/// Claims up to `batch_size` runnable jobs and leases them for `lease`.
///
/// `FOR UPDATE SKIP LOCKED` means two workers never claim the same row, so it
/// is safe to run as many worker processes as you like.
pub async fn claim(
    pool: &PgPool,
    channel: QueueChannel,
    batch_size: i64,
    lease: Duration,
) -> Result<Vec<Job>, QueueError> {
    let rows: Vec<(Uuid, String, Value, i32, i32)> = sqlx::query_as(
        "UPDATE jobs
         SET status = 'processing',
             attempts = attempts + 1,
             locked_until = now() + make_interval(secs => $3),
             updated_at = now()
         WHERE id IN (
             SELECT id FROM jobs
             WHERE channel = $1
               AND status = 'pending'
               AND available_at <= now()
             ORDER BY available_at, id
             LIMIT $2
             FOR UPDATE SKIP LOCKED
         )
         RETURNING id, channel, payload, attempts, max_attempts",
    )
    .bind(channel.as_str())
    .bind(batch_size)
    .bind(to_interval(lease))
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(|(id, channel_name, payload, attempts, max_attempts)| {
            let channel = QueueChannel::parse(&channel_name)
                .ok_or_else(|| QueueError::UnknownChannel(channel_name.clone()))?;
            Ok(Job {
                id,
                channel,
                payload,
                attempts,
                max_attempts,
            })
        })
        .collect()
}

pub async fn complete(pool: &PgPool, job_id: Uuid) -> Result<(), QueueError> {
    sqlx::query(
        "UPDATE jobs
         SET status = 'done', locked_until = NULL, last_error = NULL, updated_at = now()
         WHERE id = $1",
    )
    .bind(job_id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Schedules a retry, or moves the job to the dead letter queue when the retry
/// budget is used up.
pub async fn fail(
    pool: &PgPool,
    job_id: Uuid,
    reason: &str,
    retry_in: Duration,
) -> Result<bool, QueueError> {
    let (status,): (String,) = sqlx::query_as(
        "UPDATE jobs
         SET status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'pending' END,
             available_at = CASE
                 WHEN attempts >= max_attempts THEN available_at
                 ELSE now() + make_interval(secs => $3)
             END,
             locked_until = NULL,
             last_error = $2,
             updated_at = now()
         WHERE id = $1
         RETURNING status",
    )
    .bind(job_id)
    .bind(reason)
    .bind(to_interval(retry_in))
    .fetch_one(pool)
    .await?;

    Ok(status == STATUS_DEAD)
}

/// Returns jobs whose lease expired back to the queue.
///
/// This is what stops a job being lost forever when a worker is killed while
/// holding it.
pub async fn reclaim_expired(pool: &PgPool) -> Result<u64, QueueError> {
    let result = sqlx::query(
        "UPDATE jobs
         SET status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'pending' END,
             locked_until = NULL,
             last_error = COALESCE(last_error, 'lease expired before the job finished'),
             updated_at = now()
         WHERE status = 'processing' AND locked_until < now()",
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

/// Moves dead jobs back to pending with a fresh retry budget.
pub async fn redrive(pool: &PgPool, channel: QueueChannel) -> Result<u64, QueueError> {
    let result = sqlx::query(
        "UPDATE jobs
         SET status = 'pending',
             attempts = 0,
             available_at = now(),
             locked_until = NULL,
             last_error = NULL,
             updated_at = now()
         WHERE status = 'dead' AND channel = $1",
    )
    .bind(channel.as_str())
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

pub async fn count_by_status(
    pool: &PgPool,
    channel: QueueChannel,
) -> Result<Vec<(String, i64)>, QueueError> {
    let rows: Vec<(String, i64)> = sqlx::query_as(
        "SELECT status, count(*) FROM jobs WHERE channel = $1 GROUP BY status ORDER BY status",
    )
    .bind(channel.as_str())
    .fetch_all(pool)
    .await?;

    Ok(rows)
}
