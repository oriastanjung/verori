use axum::middleware::from_fn_with_state;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::modules::example::controller;
use crate::shared::auth::{require_admin, require_auth};
use crate::shared::state::AppState;

/// Anyone signed in may read, create and update.
fn member_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(controller::list_examples, controller::create_example))
        .routes(routes!(controller::get_example, controller::update_example))
        .routes(routes!(controller::publish_example))
}

/// Deleting and bulk operations are admin only.
fn admin_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(controller::delete_example))
        .routes(routes!(controller::bulk_update_examples))
        .routes(routes!(controller::bulk_delete_examples))
}

/// Routes with their access rules attached. This is what the server mounts.
pub fn example_routes(state: AppState) -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .merge(member_routes().route_layer(from_fn_with_state(state.clone(), require_auth)))
        .merge(admin_routes().route_layer(from_fn_with_state(state, require_admin)))
}

/// The same routes without guards. Middleware does not change the OpenAPI
/// document, so the spec is generated from these.
pub fn example_routes_for_docs() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .merge(member_routes())
        .merge(admin_routes())
}
