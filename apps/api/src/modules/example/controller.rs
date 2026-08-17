use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;

use crate::shared::error::{AppResult, ErrorBody};
use crate::shared::state::AppState;
use crate::modules::example::dto::{
    BulkDeleteExampleRequest, BulkResultResponse, BulkUpdateExampleRequest, CreateExampleRequest,
    ExamplePage, ExampleResponse, ListExampleQuery, PublishJobResponse, UpdateExampleRequest,
};

#[utoipa::path(
    get,
    path = "/examples",
    tag = "example",
    params(ListExampleQuery),
    responses(
        (status = 200, body = ExamplePage),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn list_examples(
    State(state): State<AppState>,
    Query(query): Query<ListExampleQuery>,
) -> AppResult<Json<ExamplePage>> {
    let page = state.example_service.list(query).await?;
    Ok(Json(page))
}

#[utoipa::path(
    get,
    path = "/examples/{id}",
    tag = "example",
    params(("id" = i32, Path, description = "Example id")),
    responses(
        (status = 200, body = ExampleResponse),
        (status = 404, body = ErrorBody),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn get_example(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> AppResult<Json<ExampleResponse>> {
    let example = state.example_service.get(id).await?;
    Ok(Json(example))
}

#[utoipa::path(
    post,
    path = "/examples",
    tag = "example",
    request_body = CreateExampleRequest,
    responses(
        (status = 201, body = ExampleResponse),
        (status = 400, body = ErrorBody),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn create_example(
    State(state): State<AppState>,
    Json(payload): Json<CreateExampleRequest>,
) -> AppResult<(StatusCode, Json<ExampleResponse>)> {
    let example = state.example_service.create(payload).await?;
    Ok((StatusCode::CREATED, Json(example)))
}

#[utoipa::path(
    put,
    path = "/examples/{id}",
    tag = "example",
    params(("id" = i32, Path, description = "Example id")),
    request_body = UpdateExampleRequest,
    responses(
        (status = 200, body = ExampleResponse),
        (status = 404, body = ErrorBody),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn update_example(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateExampleRequest>,
) -> AppResult<Json<ExampleResponse>> {
    let example = state.example_service.update(id, payload).await?;
    Ok(Json(example))
}

#[utoipa::path(
    delete,
    path = "/examples/{id}",
    tag = "example",
    params(("id" = i32, Path, description = "Example id")),
    responses(
        (status = 204),
        (status = 404, body = ErrorBody),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn delete_example(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> AppResult<StatusCode> {
    state.example_service.delete(id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    patch,
    path = "/examples/bulk",
    tag = "example",
    request_body = BulkUpdateExampleRequest,
    responses(
        (status = 200, body = BulkResultResponse),
        (status = 400, body = ErrorBody),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn bulk_update_examples(
    State(state): State<AppState>,
    Json(payload): Json<BulkUpdateExampleRequest>,
) -> AppResult<Json<BulkResultResponse>> {
    let affected = state.example_service.bulk_update(payload).await?;
    Ok(Json(BulkResultResponse { affected }))
}

#[utoipa::path(
    post,
    path = "/examples/bulk-delete",
    tag = "example",
    request_body = BulkDeleteExampleRequest,
    responses(
        (status = 200, body = BulkResultResponse),
        (status = 400, body = ErrorBody),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn bulk_delete_examples(
    State(state): State<AppState>,
    Json(payload): Json<BulkDeleteExampleRequest>,
) -> AppResult<Json<BulkResultResponse>> {
    let affected = state.example_service.bulk_delete(payload).await?;
    Ok(Json(BulkResultResponse { affected }))
}

#[utoipa::path(
    post,
    path = "/examples/{id}/publish",
    tag = "example",
    params(("id" = i32, Path, description = "Example id")),
    responses(
        (status = 202, body = PublishJobResponse),
        (status = 404, body = ErrorBody),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn publish_example(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> AppResult<(StatusCode, Json<PublishJobResponse>)> {
    let job_id = state.example_service.publish_to_queue(id).await?;
    Ok((StatusCode::ACCEPTED, Json(PublishJobResponse { job_id })))
}
