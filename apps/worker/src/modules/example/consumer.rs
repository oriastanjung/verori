use std::sync::Arc;

use async_trait::async_trait;

use queue::{Job, QueueChannel};

use crate::modules::example::dto::{ExampleCreatedPayload, ExamplePublishedPayload};
use crate::modules::example::service::ExampleService;
use crate::shared::consumer::Consumer;
use crate::shared::error::{WorkerError, WorkerResult};

pub struct ExampleCreatedConsumer {
    service: Arc<dyn ExampleService>,
}

#[async_trait]
impl Consumer for ExampleCreatedConsumer {
    fn channel(&self) -> QueueChannel {
        QueueChannel::ExampleCreated
    }

    async fn handle(&self, job: &Job) -> WorkerResult<()> {
        let payload: ExampleCreatedPayload = serde_json::from_value(job.payload.clone())
            .map_err(|error| WorkerError::InvalidPayload(error.to_string()))?;

        self.service.on_created(payload.example_id).await
    }
}

pub struct ExamplePublishedConsumer {
    service: Arc<dyn ExampleService>,
}

#[async_trait]
impl Consumer for ExamplePublishedConsumer {
    fn channel(&self) -> QueueChannel {
        QueueChannel::ExamplePublished
    }

    async fn handle(&self, job: &Job) -> WorkerResult<()> {
        let payload: ExamplePublishedPayload = serde_json::from_value(job.payload.clone())
            .map_err(|error| WorkerError::InvalidPayload(error.to_string()))?;

        self.service
            .on_published(payload.example_id, &payload.title)
            .await
    }
}

pub fn create_example_created_consumer(service: Arc<dyn ExampleService>) -> Arc<dyn Consumer> {
    Arc::new(ExampleCreatedConsumer { service })
}

pub fn create_example_published_consumer(service: Arc<dyn ExampleService>) -> Arc<dyn Consumer> {
    Arc::new(ExamplePublishedConsumer { service })
}
