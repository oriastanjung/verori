use async_trait::async_trait;

use queue::{Job, QueueChannel};

use crate::shared::error::WorkerResult;

/// Every module implements this once per queue it listens to.
#[async_trait]
pub trait Consumer: Send + Sync {
    fn channel(&self) -> QueueChannel;
    async fn handle(&self, job: &Job) -> WorkerResult<()>;
}
