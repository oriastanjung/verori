use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter, QueryOrder,
    Set,
};

use db::entities::example;

use crate::modules::example::dto::{CreateExampleRequest, UpdateExampleRequest};

/// Data access contract. Swap the implementation without touching the service.
#[async_trait]
pub trait ExampleRepository: Send + Sync {
    async fn find_all(&self, published: Option<bool>) -> Result<Vec<example::Model>, DbErr>;
    async fn find_by_id(&self, id: i32) -> Result<Option<example::Model>, DbErr>;
    async fn create(&self, input: CreateExampleRequest) -> Result<example::Model, DbErr>;
    async fn update(
        &self,
        id: i32,
        input: UpdateExampleRequest,
    ) -> Result<Option<example::Model>, DbErr>;
    async fn delete(&self, id: i32) -> Result<u64, DbErr>;
    async fn bulk_set_published(&self, ids: &[i32], published: bool) -> Result<u64, DbErr>;
    async fn bulk_delete(&self, ids: &[i32]) -> Result<u64, DbErr>;
}

pub struct SeaOrmExampleRepository {
    db: DatabaseConnection,
}

#[async_trait]
impl ExampleRepository for SeaOrmExampleRepository {
    async fn find_all(&self, published: Option<bool>) -> Result<Vec<example::Model>, DbErr> {
        let mut query = example::Entity::find().order_by_desc(example::Column::Id);

        if let Some(published) = published {
            query = query.filter(example::Column::Published.eq(published));
        }

        query.all(&self.db).await
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<example::Model>, DbErr> {
        example::Entity::find_by_id(id).one(&self.db).await
    }

    async fn create(&self, input: CreateExampleRequest) -> Result<example::Model, DbErr> {
        let record = example::ActiveModel {
            title: Set(input.title),
            content: Set(input.content),
            published: Set(false),
            ..Default::default()
        };

        record.insert(&self.db).await
    }

    async fn update(
        &self,
        id: i32,
        input: UpdateExampleRequest,
    ) -> Result<Option<example::Model>, DbErr> {
        let Some(found) = example::Entity::find_by_id(id).one(&self.db).await? else {
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

        let updated = record.update(&self.db).await?;
        Ok(Some(updated))
    }

    async fn delete(&self, id: i32) -> Result<u64, DbErr> {
        let result = example::Entity::delete_by_id(id).exec(&self.db).await?;
        Ok(result.rows_affected)
    }

    async fn bulk_set_published(&self, ids: &[i32], published: bool) -> Result<u64, DbErr> {
        let result = example::Entity::update_many()
            .col_expr(example::Column::Published, Expr::value(published))
            .col_expr(
                example::Column::UpdatedAt,
                Expr::value(chrono::Utc::now().fixed_offset()),
            )
            .filter(example::Column::Id.is_in(ids.to_vec()))
            .exec(&self.db)
            .await?;

        Ok(result.rows_affected)
    }

    async fn bulk_delete(&self, ids: &[i32]) -> Result<u64, DbErr> {
        let result = example::Entity::delete_many()
            .filter(example::Column::Id.is_in(ids.to_vec()))
            .exec(&self.db)
            .await?;

        Ok(result.rows_affected)
    }
}

pub fn create_example_repository(db: DatabaseConnection) -> Arc<dyn ExampleRepository> {
    Arc::new(SeaOrmExampleRepository { db })
}
