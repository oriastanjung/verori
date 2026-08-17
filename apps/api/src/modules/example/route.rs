use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::shared::state::AppState;
use crate::modules::example::controller;

pub fn example_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(controller::list_examples, controller::create_example))
        .routes(routes!(controller::bulk_update_examples))
        .routes(routes!(controller::bulk_delete_examples))
        .routes(routes!(
            controller::get_example,
            controller::update_example,
            controller::delete_example
        ))
        .routes(routes!(controller::publish_example))
}
