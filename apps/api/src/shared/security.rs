//! Transport level hardening.
//!
//! These layers cover the classes of attack that live above the handler: header
//! based browser attacks, oversized bodies, slow requests, and request floods
//! from a single address.
//!
//! What they do **not** cover: a distributed flood. Rate limiting here is per
//! process and per address, so it protects the database and the worker pool
//! from one noisy client. Absorbing a real DDoS is the job of the network in
//! front of this service.

use std::time::Duration;

use axum::http::header::{
    HeaderName, HeaderValue, CACHE_CONTROL, CONTENT_SECURITY_POLICY, REFERRER_POLICY,
    STRICT_TRANSPORT_SECURITY, X_CONTENT_TYPE_OPTIONS, X_FRAME_OPTIONS,
};
use tower_http::set_header::SetResponseHeaderLayer;

const PERMISSIONS_POLICY: HeaderName = HeaderName::from_static("permissions-policy");
const COOP: HeaderName = HeaderName::from_static("cross-origin-opener-policy");
const CORP: HeaderName = HeaderName::from_static("cross-origin-resource-policy");

/// A JSON API renders nothing, loads nothing and frames nothing.
const API_CSP: &str = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

/// The docs page is a real HTML page that pulls the Scalar bundle from a CDN,
/// so it needs its own policy rather than the locked down one above.
const DOCS_CSP: &str = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'";

const NO_BROWSER_FEATURES: &str = "camera=(), microphone=(), geolocation=(), payment=()";
/// Two years, which is what preload lists expect.
const HSTS: &str = "max-age=63072000; includeSubDomains";
const MILLIS_PER_SECOND: u64 = 1_000;

/// Every header layer has the same shape, so it gets a name.
type HeaderLayer = SetResponseHeaderLayer<HeaderValue>;

fn header(name: HeaderName, value: &'static str) -> HeaderLayer {
    SetResponseHeaderLayer::overriding(name, HeaderValue::from_static(value))
}

/// Headers every response carries, whatever the route.
pub fn common_headers() -> (HeaderLayer, HeaderLayer, HeaderLayer, HeaderLayer, HeaderLayer) {
    (
        // Stops a browser from guessing a type the server did not send.
        header(X_CONTENT_TYPE_OPTIONS, "nosniff"),
        // Clickjacking.
        header(X_FRAME_OPTIONS, "DENY"),
        // Do not leak the path a user came from to another origin.
        header(REFERRER_POLICY, "strict-origin-when-cross-origin"),
        header(PERMISSIONS_POLICY, NO_BROWSER_FEATURES),
        header(COOP, "same-origin"),
    )
}

/// Applied to the JSON routes. Also stops caches and proxies holding on to
/// answers that depended on a bearer token.
pub fn api_headers() -> (HeaderLayer, HeaderLayer, HeaderLayer) {
    (
        header(CONTENT_SECURITY_POLICY, API_CSP),
        header(CORP, "same-origin"),
        header(CACHE_CONTROL, "no-store"),
    )
}

/// Applied only to the docs page.
pub fn docs_headers() -> HeaderLayer {
    header(CONTENT_SECURITY_POLICY, DOCS_CSP)
}

/// Only meaningful once the service is behind TLS, so it is opt in.
pub fn hsts_header() -> HeaderLayer {
    header(STRICT_TRANSPORT_SECURITY, HSTS)
}

/// Builds the rate limit from a requests-per-second figure.
///
/// The builder's `per_second` means "replenish one slot every N seconds", which
/// is the opposite of what the name suggests, so the conversion happens here
/// once rather than being guessed at each call site.
pub fn rate_limit(
    per_second: u64,
    burst: u32,
) -> Result<
    tower_governor::governor::GovernorConfig<
        tower_governor::key_extractor::PeerIpKeyExtractor,
        governor::middleware::StateInformationMiddleware,
    >,
    &'static str,
> {
    let rate = per_second.max(1);
    let period = Duration::from_millis(MILLIS_PER_SECOND / rate);

    tower_governor::governor::GovernorConfigBuilder::default()
        .period(period)
        .burst_size(burst.max(1))
        .use_headers()
        .finish()
        .ok_or("rate limit settings must be valid")
}

/// A request that has not finished by now is not going to. The caller gets 504
/// rather than a connection that hangs.
pub fn request_timeout(seconds: u64) -> tower_http::timeout::TimeoutLayer {
    tower_http::timeout::TimeoutLayer::with_status_code(
        axum::http::StatusCode::GATEWAY_TIMEOUT,
        Duration::from_secs(seconds),
    )
}
