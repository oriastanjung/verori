pub mod config;
pub mod shared;
pub mod modules;

use axum::response::Redirect;
use axum::routing::get;
use axum::{Json, Router};
use sea_orm::DatabaseConnection;
use serde_json::{json, Value};
use sqlx::PgPool;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_scalar::{Scalar, Servable};

use crate::shared::openapi::ApiDoc;
use crate::shared::state::AppState;
use crate::modules::example::example_routes;

/// Builds the router and the OpenAPI document from the same route definitions.
pub fn build_app(db: DatabaseConnection, pool: PgPool) -> (Router, utoipa::openapi::OpenApi) {
    let state = AppState::new(db, pool);

    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(example_routes())
        .split_for_parts();

    let openapi_json = serde_json::to_value(&api).expect("openapi must serialize");

    let router = router
        .route("/health", get(health))
        .route(
            "/openapi.json",
            get(move || {
                let document = openapi_json.clone();
                async move { Json(document) }
            }),
        )
        .merge(Scalar::with_url("/docs", api.clone()))
        .route("/docs/", get(|| async { Redirect::permanent("/docs") }))
        .layer(axum::middleware::from_fn(shared::middleware::log_requests))
        .with_state(state);

    (router, api)
}

/// Same document the server serves, used by the export-openapi binary.
pub fn openapi_document() -> utoipa::openapi::OpenApi {
    let (_, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(example_routes())
        .split_for_parts();
    api
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
