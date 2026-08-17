use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ExampleCreatedPayload {
    pub example_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ExamplePublishedPayload {
    pub example_id: Uuid,
    pub title: String,
}
