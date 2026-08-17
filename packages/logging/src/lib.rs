pub mod shutdown;

use tracing_subscriber::EnvFilter;

const DEFAULT_FILTER: &str = "info,sqlx=warn,sea_orm=warn";

/// Human readable logs for local dev: timestamp, level, file:line, message.
pub fn init() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(DEFAULT_FILTER));

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .with_file(true)
        .with_line_number(true)
        .with_level(true)
        .with_ansi(true)
        .init();
}
