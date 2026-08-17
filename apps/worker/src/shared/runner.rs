use std::sync::Arc;
use std::time::Instant;

use futures::StreamExt;
use sqlx::PgPool;

use queue::QueueChannel;

use crate::shared::consumer::Consumer;

/// Pulls jobs for every registered consumer and logs the result of each one.
pub struct Runner {
    pool: PgPool,
    consumers: Vec<Arc<dyn Consumer>>,
}

impl Runner {
    pub fn new(pool: PgPool, consumers: Vec<Arc<dyn Consumer>>) -> Runner {
        Runner { pool, consumers }
    }

    fn channels(&self) -> Vec<QueueChannel> {
        self.consumers.iter().map(|item| item.channel()).collect()
    }

    pub async fn run(&self) {
        let channels = self.channels();

        let listener = queue::listen(&self.pool, &channels)
            .await
            .expect("failed to start postgres listener");

        tracing::info!(
            channels = ?channels.iter().map(|item| item.as_str()).collect::<Vec<_>>(),
            "worker listening"
        );

        self.drain_all().await;

        let mut notifications = listener.into_stream();
        while notifications.next().await.is_some() {
            self.drain_all().await;
        }
    }

    async fn drain_all(&self) {
        for consumer in &self.consumers {
            self.drain(consumer.as_ref()).await;
        }
    }

    async fn drain(&self, consumer: &dyn Consumer) {
        let channel = consumer.channel();

        let jobs = match queue::fetch_pending(&self.pool, channel).await {
            Ok(jobs) => jobs,
            Err(error) => {
                tracing::error!(channel = %channel, error = %error, "failed to fetch jobs");
                return;
            }
        };

        for job in jobs {
            let started_at = Instant::now();
            let outcome = consumer.handle(&job).await;
            let latency_ms = started_at.elapsed().as_secs_f64() * 1000.0;

            match outcome {
                Ok(()) => {
                    if let Err(error) = queue::complete(&self.pool, job.id).await {
                        tracing::error!(job_id = job.id, error = %error, "failed to mark job done");
                        continue;
                    }
                    tracing::info!(
                        job_id = job.id,
                        channel = %channel,
                        status = "done",
                        latency = format!("{latency_ms:.2}ms"),
                        "job"
                    );
                }
                Err(error) => {
                    let reason = error.to_string();
                    if let Err(mark_error) = queue::fail(&self.pool, job.id, &reason).await {
                        tracing::error!(job_id = job.id, error = %mark_error, "failed to mark job failed");
                    }
                    tracing::error!(
                        job_id = job.id,
                        channel = %channel,
                        status = "failed",
                        latency = format!("{latency_ms:.2}ms"),
                        error = %reason,
                        "job"
                    );
                }
            }
        }
    }
}
