use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Examples::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Examples::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Examples::Title).string().not_null())
                    .col(ColumnDef::new(Examples::Content).string().null())
                    .col(
                        ColumnDef::new(Examples::Published)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Examples::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Examples::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Jobs::Table)
                    .add_column(ColumnDef::new(Jobs::LastError).string().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Jobs::Table)
                    .drop_column(Jobs::LastError)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Examples::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Examples {
    Table,
    Id,
    Title,
    Content,
    Published,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Jobs {
    Table,
    LastError,
}
