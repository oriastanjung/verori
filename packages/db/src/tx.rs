//! Ambient transactions.
//!
//! A service method marked `#[transactional]` opens one transaction and stores
//! it in a task local. Every repository call made while that method runs picks
//! the transaction up through [`conn`], so a whole service method commits or
//! rolls back as one unit without passing a handle around by hand.

use std::future::Future;
use std::sync::Arc;

use sea_orm::{
    ConnectionTrait, DatabaseConnection, DatabaseTransaction, DbBackend, DbErr, ExecResult,
    QueryResult, Statement, TransactionTrait,
};

/// Postgres reports a serialisation failure or a deadlock with these codes.
/// Both mean "nothing was written, try the whole transaction again".
const SERIALIZATION_FAILURE: &str = "40001";
const DEADLOCK_DETECTED: &str = "40P01";

pub const DEFAULT_MAX_ATTEMPTS: u32 = 3;

tokio::task_local! {
    static AMBIENT: Arc<DatabaseTransaction>;
}

/// Either the transaction the current service method opened, or the pool when
/// the caller is not inside one.
pub enum Conn<'a> {
    Ambient(Arc<DatabaseTransaction>),
    Direct(&'a DatabaseConnection),
}

/// What repositories use instead of touching their connection directly.
pub fn conn(database: &DatabaseConnection) -> Conn<'_> {
    match AMBIENT.try_with(Arc::clone) {
        Ok(transaction) => Conn::Ambient(transaction),
        Err(_) => Conn::Direct(database),
    }
}

/// True when the caller already runs inside a transaction.
pub fn in_transaction() -> bool {
    AMBIENT.try_with(|_| ()).is_ok()
}

#[async_trait::async_trait]
impl ConnectionTrait for Conn<'_> {
    fn get_database_backend(&self) -> DbBackend {
        match self {
            Conn::Ambient(transaction) => transaction.get_database_backend(),
            Conn::Direct(database) => database.get_database_backend(),
        }
    }

    async fn execute_raw(&self, statement: Statement) -> Result<ExecResult, DbErr> {
        match self {
            Conn::Ambient(transaction) => transaction.execute_raw(statement).await,
            Conn::Direct(database) => database.execute_raw(statement).await,
        }
    }

    async fn execute_unprepared(&self, sql: &str) -> Result<ExecResult, DbErr> {
        match self {
            Conn::Ambient(transaction) => transaction.execute_unprepared(sql).await,
            Conn::Direct(database) => database.execute_unprepared(sql).await,
        }
    }

    async fn query_one_raw(&self, statement: Statement) -> Result<Option<QueryResult>, DbErr> {
        match self {
            Conn::Ambient(transaction) => transaction.query_one_raw(statement).await,
            Conn::Direct(database) => database.query_one_raw(statement).await,
        }
    }

    async fn query_all_raw(&self, statement: Statement) -> Result<Vec<QueryResult>, DbErr> {
        match self {
            Conn::Ambient(transaction) => transaction.query_all_raw(statement).await,
            Conn::Direct(database) => database.query_all_raw(statement).await,
        }
    }

    fn support_returning(&self) -> bool {
        match self {
            Conn::Ambient(transaction) => transaction.support_returning(),
            Conn::Direct(database) => database.support_returning(),
        }
    }
}

/// True for errors where retrying the whole transaction is the right response.
pub fn is_retryable(error: &DbErr) -> bool {
    let message = error.to_string();
    message.contains(SERIALIZATION_FAILURE) || message.contains(DEADLOCK_DETECTED)
}

/// Runs `operation` inside a transaction, committing on success and rolling
/// back on error.
///
/// Already inside a transaction? The existing one is reused, so nested calls
/// stay part of the same unit of work.
///
/// `operation` is a factory because a retry has to build a fresh future.
pub async fn run<F, Fut, T, E>(
    database: &DatabaseConnection,
    max_attempts: u32,
    mut operation: F,
) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<T, E>>,
    E: From<DbErr> + DatabaseErrorSource,
{
    if in_transaction() {
        return operation().await;
    }

    let mut attempt = 1;

    loop {
        let transaction = Arc::new(database.begin().await.map_err(E::from)?);
        let result = AMBIENT.scope(Arc::clone(&transaction), operation()).await;

        let transaction = Arc::try_unwrap(transaction).map_err(|_| {
            E::from(DbErr::Custom(
                "a transaction handle outlived its service method".to_string(),
            ))
        })?;

        match result {
            Ok(value) => {
                transaction.commit().await.map_err(E::from)?;
                return Ok(value);
            }
            Err(error) => {
                if let Err(rollback_error) = transaction.rollback().await {
                    tracing::error!(error = %rollback_error, "rollback failed");
                }

                let retryable =
                    matches!(error.database_error(), Some(db_error) if is_retryable(db_error));
                if retryable && attempt < max_attempts {
                    tracing::warn!(attempt, max_attempts, "retrying transaction");
                    attempt += 1;
                    continue;
                }

                return Err(error);
            }
        }
    }
}

/// Lets `run` see through a domain error to the database error underneath, so
/// it can tell a transient conflict apart from a real failure.
pub trait DatabaseErrorSource {
    fn database_error(&self) -> Option<&DbErr>;
}

impl DatabaseErrorSource for DbErr {
    fn database_error(&self) -> Option<&DbErr> {
        Some(self)
    }
}
