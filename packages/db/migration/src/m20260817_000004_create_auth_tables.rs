//! Tables owned by Better Auth. The CREATE TABLE statements are generated from
//! the entities in `packages/auth`, so they always match what the store reads.
//! Regenerate with: cargo run -p auth --example print_schema

use sea_orm_migration::prelude::*;

const CREATE_USERS: &str = r#"
CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar NOT NULL PRIMARY KEY,
    "name" varchar,
    "email" varchar,
    "email_verified" bool NOT NULL,
    "image" varchar,
    "username" varchar,
    "display_username" varchar,
    "two_factor_enabled" bool NOT NULL,
    "role" varchar,
    "banned" bool NOT NULL,
    "ban_reason" varchar,
    "ban_expires" timestamp with time zone,
    "metadata" json NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
)"#;

const CREATE_SESSIONS: &str = r#"
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" varchar NOT NULL PRIMARY KEY,
    "expires_at" timestamp with time zone NOT NULL,
    "token" varchar NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "ip_address" varchar,
    "user_agent" varchar,
    "user_id" varchar NOT NULL,
    "active" bool NOT NULL,
    "impersonated_by" varchar
)"#;

const CREATE_ACCOUNTS: &str = r#"
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" varchar NOT NULL PRIMARY KEY,
    "account_id" varchar NOT NULL,
    "provider_id" varchar NOT NULL,
    "user_id" varchar NOT NULL,
    "access_token" varchar,
    "refresh_token" varchar,
    "id_token" varchar,
    "access_token_expires_at" timestamp with time zone,
    "refresh_token_expires_at" timestamp with time zone,
    "scope" varchar,
    "password" varchar,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
)"#;

const CREATE_VERIFICATIONS: &str = r#"
CREATE TABLE IF NOT EXISTS "verifications" (
    "id" varchar NOT NULL PRIMARY KEY,
    "identifier" varchar NOT NULL,
    "value" varchar NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
)"#;

const INDEXES: [&str; 5] = [
    r#"CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email") WHERE "email" IS NOT NULL"#,
    r#"CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" ("token")"#,
    r#"CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id")"#,
    r#"CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" ("user_id")"#,
    r#"CREATE INDEX IF NOT EXISTS "verifications_identifier_idx" ON "verifications" ("identifier")"#,
];

const TABLES: [&str; 4] = ["verifications", "accounts", "sessions", "users"];

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let connection = manager.get_connection();

        for statement in [
            CREATE_USERS,
            CREATE_SESSIONS,
            CREATE_ACCOUNTS,
            CREATE_VERIFICATIONS,
        ] {
            connection.execute_unprepared(statement).await?;
        }

        for index in INDEXES {
            connection.execute_unprepared(index).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let connection = manager.get_connection();

        for table in TABLES {
            connection
                .execute_unprepared(&format!(r#"DROP TABLE IF EXISTS "{table}""#))
                .await?;
        }

        Ok(())
    }
}
