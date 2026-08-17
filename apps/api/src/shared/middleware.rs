use std::time::Instant;

use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

/// Logs one line per request: method, path, status, latency.
pub async fn log_requests(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let path = request.uri().path().to_string();
    let started_at = Instant::now();

    let response = next.run(request).await;

    let latency_ms = started_at.elapsed().as_secs_f64() * 1000.0;
    let status = response.status().as_u16();

    tracing::info!(
        %method,
        path = %path,
        status = status,
        latency = format!("{latency_ms:.2}ms"),
        "request"
    );

    response
}
