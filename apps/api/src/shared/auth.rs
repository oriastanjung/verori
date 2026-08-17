//! Route level guards.
//!
//! `require_auth` rejects anyone without a valid session. `require_admin` also
//! checks the role. Attach them with `route_layer` so the check runs before the
//! handler, and take `CurrentSession` in the handler when you need the user.

use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

use auth::{AppAuthSchema, AuthUser, CurrentSession, Role};

use crate::shared::error::{AppError, AppResult};

/// Passes through when the request carries a valid session.
pub async fn require_auth(
    _session: CurrentSession<AppAuthSchema>,
    request: Request,
    next: Next,
) -> AppResult<Response> {
    Ok(next.run(request).await)
}

/// Passes through only for users whose role is admin.
pub async fn require_admin(
    session: CurrentSession<AppAuthSchema>,
    request: Request,
    next: Next,
) -> AppResult<Response> {
    let role = session
        .user
        .role()
        .and_then(Role::parse)
        .ok_or(AppError::Forbidden)?;

    if !role.is_admin() {
        return Err(AppError::Forbidden);
    }

    Ok(next.run(request).await)
}
