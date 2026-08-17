use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ExampleCreatedPayload {
    pub example_id: i32,
}

#[derive(Debug, Deserialize)]
pub struct ExamplePublishedPayload {
    pub example_id: i32,
    pub title: String,
}
