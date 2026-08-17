//! Behaviour tests for the job queue. They need a real Postgres, so they read
//! DATABASE_URL and skip when it is not set.

use std::sync::LazyLock;
use std::time::Duration;

use serde_json::json;
use sqlx::postgres::{PgPool, PgPoolOptions};
use tokio::sync::Mutex;

use queue::{PublishOptions, QueueChannel};

const CHANNEL: QueueChannel = QueueChannel::ExampleCreated;

/// These tests all claim from the same channel, so they must not overlap.
static SERIAL: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

async fn pool() -> Option<PgPool> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .connect(&url)
        .await
        .expect("failed to connect");
    Some(pool)
}

/// Starts every test from an empty channel.
async fn reset(pool: &PgPool) {
    sqlx::query("DELETE FROM jobs WHERE channel = $1")
        .bind(CHANNEL.as_str())
        .execute(pool)
        .await
        .expect("cleanup failed");
}

async fn status_of(pool: &PgPool, job_id: i64) -> String {
    let (status,): (String,) = sqlx::query_as("SELECT status FROM jobs WHERE id = $1")
        .bind(job_id)
        .fetch_one(pool)
        .await
        .expect("job must exist");
    status
}

#[tokio::test]
async fn publish_is_idempotent_per_key() {
    let Some(pool) = pool().await else { return };
    let _guard = SERIAL.lock().await;
    let marker = "idempotent";
    reset(&pool).await;

    let options = PublishOptions::with_idempotency_key("order-42");

    let first = queue::publish(&pool, CHANNEL, json!({ "marker": marker }), options.clone())
        .await
        .expect("first publish");
    let second = queue::publish(&pool, CHANNEL, json!({ "marker": marker }), options)
        .await
        .expect("second publish");

    assert_eq!(first, second, "same key must not enqueue twice");

    let (count,): (i64,) = sqlx::query_as("SELECT count(*) FROM jobs WHERE payload->>'marker' = $1")
        .bind(marker)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);

    reset(&pool).await;
}

#[tokio::test]
async fn failing_job_retries_then_lands_in_the_dead_letter_queue() {
    let Some(pool) = pool().await else { return };
    let _guard = SERIAL.lock().await;
    let marker = "retry-then-dead";
    reset(&pool).await;

    let job_id = queue::publish(
        &pool,
        CHANNEL,
        json!({ "marker": marker }),
        PublishOptions {
            max_attempts: Some(2),
            ..PublishOptions::default()
        },
    )
    .await
    .expect("publish");

    // Attempt 1 fails and is rescheduled.
    let claimed = queue::claim(&pool, CHANNEL, 10, Duration::from_secs(30))
        .await
        .unwrap();
    assert!(claimed.iter().any(|job| job.id == job_id));

    let dead = queue::fail(&pool, job_id, "boom", Duration::from_secs(0))
        .await
        .unwrap();
    assert!(!dead, "first failure must schedule a retry");
    assert_eq!(status_of(&pool, job_id).await, "pending");

    // Attempt 2 exhausts the budget.
    let claimed = queue::claim(&pool, CHANNEL, 10, Duration::from_secs(30))
        .await
        .unwrap();
    assert!(claimed.iter().any(|job| job.id == job_id));

    let dead = queue::fail(&pool, job_id, "boom again", Duration::from_secs(0))
        .await
        .unwrap();
    assert!(dead, "second failure must be terminal");
    assert_eq!(status_of(&pool, job_id).await, "dead");

    // Redrive puts it back with a fresh budget.
    queue::redrive(&pool, CHANNEL).await.unwrap();
    assert_eq!(status_of(&pool, job_id).await, "pending");

    reset(&pool).await;
}

#[tokio::test]
async fn expired_lease_returns_the_job_to_the_queue() {
    let Some(pool) = pool().await else { return };
    let _guard = SERIAL.lock().await;
    let marker = "expired-lease";
    reset(&pool).await;

    let job_id = queue::publish(
        &pool,
        CHANNEL,
        json!({ "marker": marker }),
        PublishOptions::default(),
    )
    .await
    .expect("publish");

    // Claim with a lease that is already over, as if the worker died.
    let claimed = queue::claim(&pool, CHANNEL, 10, Duration::from_secs(0))
        .await
        .unwrap();
    assert!(claimed.iter().any(|job| job.id == job_id));
    assert_eq!(status_of(&pool, job_id).await, "processing");

    let reclaimed = queue::reclaim_expired(&pool).await.unwrap();
    assert!(reclaimed >= 1);
    assert_eq!(
        status_of(&pool, job_id).await,
        "pending",
        "a job must never stay stuck in processing"
    );

    reset(&pool).await;
}

#[tokio::test]
async fn a_claimed_job_is_not_handed_to_a_second_worker() {
    let Some(pool) = pool().await else { return };
    let _guard = SERIAL.lock().await;
    let marker = "skip-locked";
    reset(&pool).await;

    let job_id = queue::publish(
        &pool,
        CHANNEL,
        json!({ "marker": marker }),
        PublishOptions::default(),
    )
    .await
    .expect("publish");

    let first = queue::claim(&pool, CHANNEL, 10, Duration::from_secs(60))
        .await
        .unwrap();
    let second = queue::claim(&pool, CHANNEL, 10, Duration::from_secs(60))
        .await
        .unwrap();

    assert!(first.iter().any(|job| job.id == job_id));
    assert!(
        !second.iter().any(|job| job.id == job_id),
        "a leased job must not be claimed twice"
    );

    queue::complete(&pool, job_id).await.unwrap();
    assert_eq!(status_of(&pool, job_id).await, "done");

    reset(&pool).await;
}

#[tokio::test]
async fn delayed_jobs_are_not_claimed_before_they_are_due() {
    let Some(pool) = pool().await else { return };
    let _guard = SERIAL.lock().await;
    let marker = "delayed";
    reset(&pool).await;

    let job_id = queue::publish(
        &pool,
        CHANNEL,
        json!({ "marker": marker }),
        PublishOptions {
            delay: Some(Duration::from_secs(3600)),
            ..PublishOptions::default()
        },
    )
    .await
    .expect("publish");

    let claimed = queue::claim(&pool, CHANNEL, 10, Duration::from_secs(30))
        .await
        .unwrap();
    assert!(!claimed.iter().any(|job| job.id == job_id));

    reset(&pool).await;
}
