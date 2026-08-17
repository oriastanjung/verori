pub use sea_orm_migration::prelude::*;

mod m20260817_000001_create_jobs_table;
mod m20260817_000002_create_examples_table;
mod m20260817_000003_harden_jobs_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260817_000001_create_jobs_table::Migration),
            Box::new(m20260817_000002_create_examples_table::Migration),
            Box::new(m20260817_000003_harden_jobs_table::Migration),
        ]
    }
}
