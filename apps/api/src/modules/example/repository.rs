use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::sea_query::Expr;
use sea_orm::sea_query::extension::postgres::PgExpr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, DbErr, EntityTrait, Order,
    PaginatorTrait, QueryFilter, QueryOrder, Select, Set,
};

use db::entities::example;
use db::tx;
use uuid::Uuid;

use crate::modules::example::dto::{CreateExampleRequest, ListExampleQuery, UpdateExampleRequest};

/// Sorting is limited to this list so a query string cannot reach arbitrary
/// columns.
fn sort_column(name: Option<&str>) -> example::Column {
    match name {
        Some("title") => example::Column::Title,
        Some("published") => example::Column::Published,
        Some("created_at") => example::Column::CreatedAt,
        _ => example::Column::Id,
    }
}

fn sort_order(direction: Option<&str>) -> Order {
    match direction {
        Some("asc") => Order::Asc,
        _ => Order::Desc,
    }
}

fn apply_filters(query: &ListExampleQuery) -> Select<example::Entity> {
    let mut select = example::Entity::find();

    if let Some(published) = query.published {
        select = select.filter(example::Column::Published.eq(published));
    }

    if let Some(search) = query.search.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        let pattern = format!("%{search}%");
        select = select.filter(
            Condition::any()
                .add(Expr::col(example::Column::Title).ilike(pattern.clone()))
                .add(Expr::col(example::Column::Content).ilike(pattern)),
        );
    }

    select.order_by(
        sort_column(query.sort_by.as_deref()),
        sort_order(query.sort_dir.as_deref()),
    )
}

/// Data access contract. Swap the implementation without touching the service.
#[async_trait]
pub trait ExampleRepository: Send + Sync {
    /// Returns one page of rows and the total number of matches.
    async fn find_page(
        &self,
        query: &ListExampleQuery,
        page: u64,
        per_page: u64,
    ) -> Result<(Vec<example::Model>, u64), DbErr>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<example::Model>, DbErr>;
    async fn create(&self, input: CreateExampleRequest) -> Result<example::Model, DbErr>;
    async fn update(
        &self,
        id: Uuid,
        input: UpdateExampleRequest,
    ) -> Result<Option<example::Model>, DbErr>;
    async fn delete(&self, id: Uuid) -> Result<u64, DbErr>;
    async fn bulk_set_published(&self, ids: &[Uuid], published: bool) -> Result<u64, DbErr>;
    async fn bulk_delete(&self, ids: &[Uuid]) -> Result<u64, DbErr>;
}

pub struct SeaOrmExampleRepository {
    db: DatabaseConnection,
}

#[async_trait]
impl ExampleRepository for SeaOrmExampleRepository {
    async fn find_page(
        &self,
        query: &ListExampleQuery,
        page: u64,
        per_page: u64,
    ) -> Result<(Vec<example::Model>, u64), DbErr> {
        let connection = tx::conn(&self.db);
        let paginator = apply_filters(query).paginate(&connection, per_page);

        let total = paginator.num_items().await?;
        // The paginator is zero based, the api is one based.
        let items = paginator.fetch_page(page.saturating_sub(1)).await?;

        Ok((items, total))
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<example::Model>, DbErr> {
        example::Entity::find_by_id(id).one(&tx::conn(&self.db)).await
    }

    async fn create(&self, input: CreateExampleRequest) -> Result<example::Model, DbErr> {
        let record = example::ActiveModel {
            // UUIDv7 keeps rows in creation order, which a random uuid would not.
            id: Set(Uuid::now_v7()),
            title: Set(input.title),
            content: Set(input.content),
            published: Set(false),
            ..Default::default()
        };

        record.insert(&tx::conn(&self.db)).await
    }

    async fn update(
        &self,
        id: Uuid,
        input: UpdateExampleRequest,
    ) -> Result<Option<example::Model>, DbErr> {
        let Some(found) = example::Entity::find_by_id(id).one(&tx::conn(&self.db)).await? else {
            return Ok(None);
        };

        let mut record: example::ActiveModel = found.into();

        if let Some(title) = input.title {
            record.title = Set(title);
        }
        if let Some(content) = input.content {
            record.content = Set(Some(content));
        }
        if let Some(published) = input.published {
            record.published = Set(published);
        }
        record.updated_at = Set(chrono::Utc::now().into());

        let updated = record.update(&tx::conn(&self.db)).await?;
        Ok(Some(updated))
    }

    async fn delete(&self, id: Uuid) -> Result<u64, DbErr> {
        let result = example::Entity::delete_by_id(id).exec(&tx::conn(&self.db)).await?;
        Ok(result.rows_affected)
    }

    async fn bulk_set_published(&self, ids: &[Uuid], published: bool) -> Result<u64, DbErr> {
        let result = example::Entity::update_many()
            .col_expr(example::Column::Published, Expr::value(published))
            .col_expr(
                example::Column::UpdatedAt,
                Expr::value(chrono::Utc::now().fixed_offset()),
            )
            .filter(example::Column::Id.is_in(ids.to_vec()))
            .exec(&tx::conn(&self.db))
            .await?;

        Ok(result.rows_affected)
    }

    async fn bulk_delete(&self, ids: &[Uuid]) -> Result<u64, DbErr> {
        let result = example::Entity::delete_many()
            .filter(example::Column::Id.is_in(ids.to_vec()))
            .exec(&tx::conn(&self.db))
            .await?;

        Ok(result.rows_affected)
    }
}

pub fn create_example_repository(db: DatabaseConnection) -> Arc<dyn ExampleRepository> {
    Arc::new(SeaOrmExampleRepository { db })
}
