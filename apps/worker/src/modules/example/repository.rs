use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::{ActiveModelTrait, DatabaseConnection, DbErr, EntityTrait, Set};

use db::entities::example;
use db::tx;
use uuid::Uuid;

#[async_trait]
pub trait ExampleRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<example::Model>, DbErr>;
    async fn mark_published(&self, id: Uuid) -> Result<Option<example::Model>, DbErr>;
}

pub struct SeaOrmExampleRepository {
    db: DatabaseConnection,
}

#[async_trait]
impl ExampleRepository for SeaOrmExampleRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<example::Model>, DbErr> {
        example::Entity::find_by_id(id).one(&tx::conn(&self.db)).await
    }

    async fn mark_published(&self, id: Uuid) -> Result<Option<example::Model>, DbErr> {
        let Some(found) = example::Entity::find_by_id(id).one(&tx::conn(&self.db)).await? else {
            return Ok(None);
        };

        let mut record: example::ActiveModel = found.into();
        record.published = Set(true);
        record.updated_at = Set(chrono::Utc::now().into());

        let updated = record.update(&tx::conn(&self.db)).await?;
        Ok(Some(updated))
    }
}

pub fn create_example_repository(db: DatabaseConnection) -> Arc<dyn ExampleRepository> {
    Arc::new(SeaOrmExampleRepository { db })
}
