use tokio::signal;

/// Resolves on Ctrl+C or on SIGTERM, whichever arrives first.
pub async fn signal_received() {
    let interrupt = async {
        signal::ctrl_c()
            .await
            .expect("failed to listen for ctrl+c");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to listen for SIGTERM")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = interrupt => tracing::info!("received ctrl+c, shutting down"),
        _ = terminate => tracing::info!("received SIGTERM, shutting down"),
    }
}
