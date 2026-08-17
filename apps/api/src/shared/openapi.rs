use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "API",
        version = "0.1.0",
        description = "Rust Axum + SeaORM monorepo API"
    ),
    tags(
        (name = "example", description = "Example module")
    )
)]
pub struct ApiDoc;
