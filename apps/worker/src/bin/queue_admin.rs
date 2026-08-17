//! Small operator tool for the job queue.
//!
//!   cargo run -p worker --bin queue-admin -- status
//!   cargo run -p worker --bin queue-admin -- redrive example_created

use std::path::Path;
use std::process::ExitCode;

use sqlx::postgres::PgPoolOptions;

use queue::QueueChannel;

const MAX_CONNECTIONS: u32 = 2;

#[tokio::main]
async fn main() -> ExitCode {
    logging::init();

    let _ = dotenvy::from_path(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));

    let database_url = match std::env::var("DATABASE_URL") {
        Ok(url) => url,
        Err(_) => {
            eprintln!("DATABASE_URL is not set");
            return ExitCode::FAILURE;
        }
    };

    let pool = match PgPoolOptions::new()
        .max_connections(MAX_CONNECTIONS)
        .connect(&database_url)
        .await
    {
        Ok(pool) => pool,
        Err(error) => {
            eprintln!("failed to connect: {error}");
            return ExitCode::FAILURE;
        }
    };

    let mut args = std::env::args().skip(1);
    let command = args.next().unwrap_or_default();

    let result = match command.as_str() {
        "status" => status(&pool).await,
        "redrive" => match args.next().and_then(|name| QueueChannel::parse(&name)) {
            Some(channel) => redrive(&pool, channel).await,
            None => {
                eprintln!("usage: queue-admin redrive <channel>");
                print_channels();
                return ExitCode::FAILURE;
            }
        },
        _ => {
            eprintln!("usage: queue-admin <status|redrive <channel>>");
            print_channels();
            return ExitCode::FAILURE;
        }
    };

    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

fn print_channels() {
    eprintln!("channels:");
    for channel in QueueChannel::ALL {
        eprintln!("  {channel}");
    }
}

async fn status(pool: &sqlx::PgPool) -> Result<(), queue::QueueError> {
    for channel in QueueChannel::ALL {
        let counts = queue::count_by_status(pool, *channel).await?;
        if counts.is_empty() {
            println!("{channel}: empty");
            continue;
        }
        let summary = counts
            .iter()
            .map(|(status, count)| format!("{status}={count}"))
            .collect::<Vec<_>>()
            .join(" ");
        println!("{channel}: {summary}");
    }
    Ok(())
}

async fn redrive(pool: &sqlx::PgPool, channel: QueueChannel) -> Result<(), queue::QueueError> {
    let moved = queue::redrive(pool, channel).await?;
    println!("{channel}: moved {moved} dead job(s) back to pending");
    Ok(())
}
