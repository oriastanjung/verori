//! Prints the CREATE TABLE statements for the Better Auth tables so they can be
//! pasted into a migration. Run with: cargo run -p auth --example print_schema
use better_auth::seaorm::sea_orm::sea_query::PostgresQueryBuilder;
use better_auth::seaorm::sea_orm::{DbBackend, Schema};

use auth::schema::{account, session, user, verification};

fn main() {
    let schema = Schema::new(DbBackend::Postgres);

    println!(
        "{};",
        schema
            .create_table_from_entity(user::Entity)
            .if_not_exists()
            .to_string(PostgresQueryBuilder)
    );
    println!(
        "{};",
        schema
            .create_table_from_entity(session::Entity)
            .if_not_exists()
            .to_string(PostgresQueryBuilder)
    );
    println!(
        "{};",
        schema
            .create_table_from_entity(account::Entity)
            .if_not_exists()
            .to_string(PostgresQueryBuilder)
    );
    println!(
        "{};",
        schema
            .create_table_from_entity(verification::Entity)
            .if_not_exists()
            .to_string(PostgresQueryBuilder)
    );
}
