pub mod controller;
pub mod dto;
pub mod repository;
pub mod route;
pub mod service;

pub use repository::{create_example_repository, ExampleRepository};
pub use route::example_routes;
pub use service::{create_example_service, ExampleService};
