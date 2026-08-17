use sea_orm_migration::prelude::*;

const DEFAULT_MAX_ATTEMPTS: i32 = 5;
const IDEMPOTENCY_INDEX: &str = "jobs_channel_idempotency_key_idx";
const CLAIM_INDEX: &str = "jobs_claim_idx";

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Jobs::Table)
                    .add_column(
                        ColumnDef::new(Jobs::MaxAttempts)
                            .integer()
                            .not_null()
                            .default(DEFAULT_MAX_ATTEMPTS),
                    )
                    .add_column(
                        ColumnDef::new(Jobs::AvailableAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .add_column(
                        ColumnDef::new(Jobs::LockedUntil)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .add_column(ColumnDef::new(Jobs::IdempotencyKey).string().null())
                    .add_column(
                        ColumnDef::new(Jobs::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE jobs ALTER COLUMN id TYPE bigint")
            .await?;

        // Two publishes with the same key on the same channel are the same job.
        manager
            .get_connection()
            .execute_unprepared(&format!(
                "CREATE UNIQUE INDEX IF NOT EXISTS {IDEMPOTENCY_INDEX}
                 ON jobs (channel, idempotency_key)
                 WHERE idempotency_key IS NOT NULL"
            ))
            .await?;

        // Supports the claim query: channel + status + available_at ordering.
        manager
            .get_connection()
            .execute_unprepared(&format!(
                "CREATE INDEX IF NOT EXISTS {CLAIM_INDEX}
                 ON jobs (channel, status, available_at)"
            ))
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(&format!("DROP INDEX IF EXISTS {CLAIM_INDEX}"))
            .await?;

        manager
            .get_connection()
            .execute_unprepared(&format!("DROP INDEX IF EXISTS {IDEMPOTENCY_INDEX}"))
            .await?;

        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE jobs ALTER COLUMN id TYPE integer")
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Jobs::Table)
                    .drop_column(Jobs::MaxAttempts)
                    .drop_column(Jobs::AvailableAt)
                    .drop_column(Jobs::LockedUntil)
                    .drop_column(Jobs::IdempotencyKey)
                    .drop_column(Jobs::UpdatedAt)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Jobs {
    Table,
    MaxAttempts,
    AvailableAt,
    LockedUntil,
    IdempotencyKey,
    UpdatedAt,
}
