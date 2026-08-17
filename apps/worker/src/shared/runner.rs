use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures::StreamExt;
use sqlx::PgPool;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tokio_util::sync::CancellationToken;

use queue::{Job, QueueChannel};

use crate::config::WorkerConfig;
use crate::shared::consumer::Consumer;

const BACKOFF_EXPONENT_CAP: u32 = 16;

/// Claims jobs, runs them with a bounded amount of concurrency, and keeps the
/// queue healthy by returning expired leases to the pool.
pub struct Runner {
    pool: PgPool,
    config: WorkerConfig,
    consumers: HashMap<QueueChannel, Arc<dyn Consumer>>,
}

impl Runner {
    pub fn new(pool: PgPool, config: WorkerConfig, consumers: Vec<Arc<dyn Consumer>>) -> Runner {
        let consumers = consumers
            .into_iter()
            .map(|consumer| (consumer.channel(), consumer))
            .collect();

        Runner {
            pool,
            config,
            consumers,
        }
    }

    fn channels(&self) -> Vec<QueueChannel> {
        self.consumers.keys().copied().collect()
    }

    /// Retry delay grows as base^attempts and is capped by backoff_max.
    fn backoff_for(&self, attempts: i32) -> Duration {
        let exponent = attempts.max(1) as u32;
        let base = self.config.backoff_base.as_secs().max(1);

        let seconds = base
            .checked_pow(exponent.min(BACKOFF_EXPONENT_CAP))
            .unwrap_or(u64::MAX);

        Duration::from_secs(seconds.min(self.config.backoff_max.as_secs()))
    }

    pub async fn run(self: Arc<Self>, shutdown: CancellationToken) {
        tracing::info!(
            channels = ?self.channels().iter().map(|item| item.as_str()).collect::<Vec<_>>(),
            concurrency = self.config.concurrency,
            batch_size = self.config.batch_size,
            poll_interval = ?self.config.poll_interval,
            "worker started"
        );

        // Three independent loops. Polling is what guarantees progress, so a
        // broken listener slows the worker down but never stops it.
        let reaper = tokio::spawn({
            let runner = Arc::clone(&self);
            let shutdown = shutdown.clone();
            async move { runner.reap_loop(shutdown).await }
        });

        let listener = tokio::spawn({
            let runner = Arc::clone(&self);
            let shutdown = shutdown.clone();
            async move { runner.listen_loop(shutdown).await }
        });

        self.poll_loop(shutdown).await;

        tracing::info!("worker stopped accepting jobs");
        listener.abort();
        let _ = reaper.await;
    }

    /// Claims whatever is due, on a fixed interval. This is the guarantee.
    async fn poll_loop(&self, shutdown: CancellationToken) {
        let mut poll = tokio::time::interval(self.config.poll_interval);
        poll.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

        loop {
            tokio::select! {
                _ = shutdown.cancelled() => return,
                _ = poll.tick() => self.drain_all(&shutdown).await,
            }
        }
    }

    /// Reacts to NOTIFY so a job starts in milliseconds rather than waiting for
    /// the next poll. A dropped connection is reconnected, because losing the
    /// listener used to end the worker for good.
    async fn listen_loop(&self, shutdown: CancellationToken) {
        let channels = self.channels();

        loop {
            if shutdown.is_cancelled() {
                return;
            }

            match queue::listen(&self.pool, &channels).await {
                Ok(listener) => {
                    tracing::info!("listening for notifications");
                    let mut notifications = listener.into_stream();

                    loop {
                        tokio::select! {
                            _ = shutdown.cancelled() => return,
                            notification = notifications.next() => match notification {
                                Some(Ok(_)) => self.drain_all(&shutdown).await,
                                Some(Err(error)) => {
                                    tracing::warn!(error = %error, "listener failed, reconnecting");
                                    break;
                                }
                                None => {
                                    tracing::warn!("listener closed, reconnecting");
                                    break;
                                }
                            },
                        }
                    }
                }
                Err(error) => {
                    tracing::warn!(error = %error, "could not start listener, retrying");
                }
            }

            tokio::select! {
                _ = shutdown.cancelled() => return,
                _ = tokio::time::sleep(self.config.poll_interval) => {}
            }
        }
    }

    /// Returns leases that expired because a worker died mid-job.
    async fn reap_loop(&self, shutdown: CancellationToken) {
        let mut ticker = tokio::time::interval(self.config.lease);
        ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

        loop {
            tokio::select! {
                _ = shutdown.cancelled() => break,
                _ = ticker.tick() => {
                    match queue::reclaim_expired(&self.pool).await {
                        Ok(0) => {}
                        Ok(count) => tracing::warn!(count, "returned expired jobs to the queue"),
                        Err(error) => tracing::error!(error = %error, "failed to reclaim jobs"),
                    }
                }
            }
        }
    }

    async fn drain_all(&self, shutdown: &CancellationToken) {
        for channel in self.channels() {
            if shutdown.is_cancelled() {
                return;
            }
            self.drain(channel, shutdown).await;
        }
    }

    async fn drain(&self, channel: QueueChannel, shutdown: &CancellationToken) {
        let Some(consumer) = self.consumers.get(&channel) else {
            return;
        };

        loop {
            let jobs = match queue::claim(
                &self.pool,
                channel,
                self.config.batch_size,
                self.config.lease,
            )
            .await
            {
                Ok(jobs) => jobs,
                Err(error) => {
                    tracing::error!(channel = %channel, error = %error, "failed to claim jobs");
                    return;
                }
            };

            if jobs.is_empty() {
                return;
            }

            let permits = Arc::new(Semaphore::new(self.config.concurrency));
            let mut running = JoinSet::new();

            for job in jobs {
                let permit = Arc::clone(&permits)
                    .acquire_owned()
                    .await
                    .expect("semaphore is never closed");

                let pool = self.pool.clone();
                let consumer = Arc::clone(consumer);
                let retry_in = self.backoff_for(job.attempts);

                running.spawn(async move {
                    let _permit = permit;
                    run_job(&pool, consumer.as_ref(), job, retry_in).await;
                });
            }

            // Let the current batch finish even while shutting down, so no job
            // is abandoned while it is leased to this process.
            while running.join_next().await.is_some() {}

            if shutdown.is_cancelled() {
                return;
            }
        }
    }
}

async fn run_job(pool: &PgPool, consumer: &dyn Consumer, job: Job, retry_in: Duration) {
    let started_at = Instant::now();
    let outcome = consumer.handle(&job).await;
    let latency = format!("{:.2}ms", started_at.elapsed().as_secs_f64() * 1000.0);

    match outcome {
        Ok(()) => {
            if let Err(error) = queue::complete(pool, job.id).await {
                tracing::error!(job_id = %job.id, error = %error, "failed to mark job done");
                return;
            }
            tracing::info!(
                job_id = %job.id,
                channel = %job.channel,
                attempt = job.attempts,
                status = "done",
                latency,
                "job"
            );
        }
        Err(error) => {
            let reason = error.to_string();

            match queue::fail(pool, job.id, &reason, retry_in).await {
                Ok(true) => tracing::error!(
                    job_id = %job.id,
                    channel = %job.channel,
                    attempt = job.attempts,
                    status = "dead",
                    latency,
                    error = %reason,
                    "job moved to the dead letter queue"
                ),
                Ok(false) => tracing::warn!(
                    job_id = %job.id,
                    channel = %job.channel,
                    attempt = job.attempts,
                    max_attempts = job.max_attempts,
                    status = "retry",
                    retry_in = format!("{}s", retry_in.as_secs()),
                    latency,
                    error = %reason,
                    "job"
                ),
                Err(mark_error) => tracing::error!(
                    job_id = %job.id,
                    error = %mark_error,
                    "failed to record job failure"
                ),
            }
        }
    }
}
