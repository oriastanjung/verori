pub mod config;
pub mod modules;
pub mod shared;

use std::sync::Arc;

use axum::http::{HeaderName, Method};
use axum::response::Redirect;
use axum::routing::get;
use axum::{Json, Router};
use sea_orm::DatabaseConnection;
use serde_json::{json, Value};
use sqlx::PgPool;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_scalar::{Scalar, Servable};

use auth::{Auth, AxumIntegration};

use crate::modules::example::{example_routes, example_routes_for_docs};
use crate::shared::openapi::ApiDoc;
use crate::shared::state::AppState;

/// Every module route lives under this prefix.
const API_PREFIX: &str = "/api";
/// Better Auth's default base path.
const AUTH_PREFIX: &str = "/api/auth";

/// Collects every module router, with its access rules, into one router.
fn api_router(state: AppState) -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .nest(API_PREFIX, example_routes(state.clone()))
}

/// The same routes without guards, used only to build the OpenAPI document.
fn api_router_for_docs() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .nest(API_PREFIX, example_routes_for_docs())
}

/// The browser only ever talks to the web app, but CORS stays configured so the
/// api can also be called directly during development.
fn cors_layer(web_origin: &str) -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::list([web_origin
            .parse()
            .expect("WEB_ORIGIN must be a valid origin")]))
        .allow_methods(AllowMethods::list([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ]))
        .allow_headers(AllowHeaders::list([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
            HeaderName::from_static("cookie"),
        ]))
        .allow_credentials(true)
}

/// Builds the router and the OpenAPI document from the same route definitions.
pub fn build_app(
    db: DatabaseConnection,
    pool: PgPool,
    auth: Arc<Auth>,
    web_origin: &str,
) -> (Router, utoipa::openapi::OpenApi) {
    let state = AppState::new(db, pool, Arc::clone(&auth));

    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(api_router(state.clone()))
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
        // Better Auth owns every route under this prefix: sign-up, sign-in,
        // sessions, password reset, admin user management.
        .nest(AUTH_PREFIX, auth.axum_router_with_state::<AppState>())
        .layer(cors_layer(web_origin))
        .layer(axum::middleware::from_fn(shared::middleware::log_requests))
        .with_state(state);

    (router, api)
}

/// Same document the server serves, used by the export-openapi binary.
pub fn openapi_document() -> utoipa::openapi::OpenApi {
    let (_, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(api_router_for_docs())
        .split_for_parts();
    api
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
