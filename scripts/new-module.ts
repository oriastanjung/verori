#!/usr/bin/env bun
/**
 * Scaffold a new module in the api, the worker, or the web app.
 *
 *   just new-module                 interactive
 *   just new-module api invoice     (will prompt for queue publish)
 *   just new-module api invoice -p  (forces publish route)
 *   just new-module worker invoice invoice_created
 *   just new-module web billing
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ROOT = join(import.meta.dir, "..");
const APPS = ["api", "worker", "web"] as const;
const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

type App = (typeof APPS)[number];

class ScaffoldError extends Error {}

function toPascal(name: string): string {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toKebab(name: string): string {
  return name.replaceAll("_", "-");
}

function show(path: string): string {
  return relative(ROOT, path);
}

function write(path: string, content: string): void {
  if (existsSync(path)) {
    throw new ScaffoldError(`${show(path)} already exists`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`  created ${show(path)}`);
}

function alreadyPresent(text: string, block: string): boolean {
  const existing = new Set(text.split("\n").map((line) => line.trim()));
  return block
    .split("\n")
    .every((line) => existing.has(line.trim()));
}

function insertAfter(path: string, anchor: string, line: string): void {
  if (!existsSync(path)) {
    console.warn(`  skipping insert: ${show(path)} does not exist`);
    return;
  }
  const text = readFileSync(path, "utf8");
  if (alreadyPresent(text, line)) return;

  const lines = text.split("\n");
  const index = lines.findIndex((current) => current.includes(anchor));
  if (index === -1) {
    console.warn(`  anchor "${anchor}" not found in ${show(path)}`);
    return;
  }

  lines.splice(index + 1, 0, line);
  writeFileSync(path, lines.join("\n"));
  console.log(`  updated ${show(path)}`);
}

function appendModule(path: string, name: string): void {
  const declaration = `pub mod ${name};`;
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  if (text.includes(declaration)) return;

  const lines = text.split("\n").filter((line) => line.length > 0);
  lines.push(declaration);
  lines.sort();
  writeFileSync(path, `${lines.join("\n")}\n`);
  console.log(`  updated ${show(path)}`);
}

function scaffoldEntityAndMigration(name: string): void {
  const pascal = toPascal(name);
  const pluralPascal = toPascal(name) + "s";

  // 1. Scaffold Entity
  const entityBase = join(ROOT, "packages/db/src/entities");
  write(
    join(entityBase, `${name}.rs`),
    `use sea_orm::entity::prelude::*;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "${name}s")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
`
  );
  appendModule(join(entityBase, "mod.rs"), name);

  // 2. Scaffold Migration
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
  const migrationName = `m${timestamp}_create_${name}_table`;
  const migrationPath = join(ROOT, "packages/db/migration/src", `${migrationName}.rs`);

  write(
    migrationPath,
    `use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(${pluralPascal}::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(${pluralPascal}::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(${pluralPascal}::Title).string().not_null())
                    .col(
                        ColumnDef::new(${pluralPascal}::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(${pluralPascal}::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(${pluralPascal}::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum ${pluralPascal} {
    Table,
    Id,
    Title,
    CreatedAt,
    UpdatedAt,
}
`
  );

  // Try to inject into migration lib.rs
  const migrationLib = join(ROOT, "packages/db/migration/src/lib.rs");
  insertAfter(migrationLib, "mod m", `mod ${migrationName};`);
  insertAfter(migrationLib, "vec![", `            Box::new(${migrationName}::Migration),`);
}


function scaffoldApi(name: string, withPublish: boolean): void {
  const pascal = toPascal(name);
  const kebab = toKebab(name);
  const pluralKebab = kebab + "s";
  const base = join(ROOT, "apps/api/src/modules", name);

  scaffoldEntityAndMigration(name);

  write(
    join(base, "dto.rs"),
    `use chrono::{DateTime, FixedOffset};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use db::entities::${name};

#[derive(Debug, Serialize, ToSchema)]
pub struct ${pascal}Response {
    pub id: Uuid,
    pub title: String,
    pub created_at: DateTime<FixedOffset>,
    pub updated_at: DateTime<FixedOffset>,
}

impl From<${name}::Model> for ${pascal}Response {
    fn from(model: ${name}::Model) -> ${pascal}Response {
        ${pascal}Response {
            id: model.id,
            title: model.title,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct Create${pascal}Request {
    pub title: String,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct Update${pascal}Request {
    pub title: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct BulkUpdate${pascal}Request {
    pub ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct BulkDelete${pascal}Request {
    pub ids: Vec<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BulkResultResponse {
    pub affected: u64,
}
${withPublish ? `
#[derive(Debug, Serialize, ToSchema)]
pub struct PublishJobResponse {
    pub job_id: Uuid,
}` : ''}

/// Paging, searching, sorting and filtering for the list endpoint.
#[derive(Debug, Clone, Default, Deserialize, IntoParams)]
pub struct List${pascal}Query {
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ${pascal}Page {
    pub items: Vec<${pascal}Response>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
    pub total_pages: u64,
}
`
  );

  write(
    join(base, "repository.rs"),
    `use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::sea_query::Expr;
use sea_orm::sea_query::extension::postgres::PgExpr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, Order,
    PaginatorTrait, QueryFilter, QueryOrder, Select, Set,
};

use db::entities::${name};
use db::tx;
use uuid::Uuid;

use crate::modules::${name}::dto::{Create${pascal}Request, List${pascal}Query, Update${pascal}Request};

fn sort_column(field: Option<&str>) -> ${name}::Column {
    match field {
        Some("title") => ${name}::Column::Title,
        Some("created_at") => ${name}::Column::CreatedAt,
        _ => ${name}::Column::Id,
    }
}

fn sort_order(direction: Option<&str>) -> Order {
    match direction {
        Some("asc") => Order::Asc,
        _ => Order::Desc,
    }
}

fn apply_filters(query: &List${pascal}Query) -> Select<${name}::Entity> {
    let mut select = ${name}::Entity::find();

    if let Some(search) = query.search.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        let pattern = format!("%{search}%");
        select = select.filter(Expr::col(${name}::Column::Title).ilike(pattern));
    }

    select.order_by(
        sort_column(query.sort_by.as_deref()),
        sort_order(query.sort_dir.as_deref()),
    )
}

#[async_trait]
pub trait ${pascal}Repository: Send + Sync {
    async fn find_page(
        &self,
        query: &List${pascal}Query,
        page: u64,
        per_page: u64,
    ) -> Result<(Vec<${name}::Model>, u64), DbErr>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<${name}::Model>, DbErr>;
    async fn create(&self, input: Create${pascal}Request) -> Result<${name}::Model, DbErr>;
    async fn update(&self, id: Uuid, input: Update${pascal}Request) -> Result<Option<${name}::Model>, DbErr>;
    async fn delete(&self, id: Uuid) -> Result<u64, DbErr>;
    async fn bulk_update(&self, ids: &[Uuid]) -> Result<u64, DbErr>;
    async fn bulk_delete(&self, ids: &[Uuid]) -> Result<u64, DbErr>;
}

pub struct SeaOrm${pascal}Repository {
    db: DatabaseConnection,
}

#[async_trait]
impl ${pascal}Repository for SeaOrm${pascal}Repository {
    async fn find_page(
        &self,
        query: &List${pascal}Query,
        page: u64,
        per_page: u64,
    ) -> Result<(Vec<${name}::Model>, u64), DbErr> {
        let connection = tx::conn(&self.db);
        let paginator = apply_filters(query).paginate(&connection, per_page);

        let total = paginator.num_items().await?;
        let items = paginator.fetch_page(page.saturating_sub(1)).await?;

        Ok((items, total))
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<${name}::Model>, DbErr> {
        ${name}::Entity::find_by_id(id).one(&tx::conn(&self.db)).await
    }

    async fn create(&self, input: Create${pascal}Request) -> Result<${name}::Model, DbErr> {
        let record = ${name}::ActiveModel {
            id: Set(Uuid::now_v7()),
            title: Set(input.title),
            ..Default::default()
        };
        record.insert(&tx::conn(&self.db)).await
    }

    async fn update(
        &self,
        id: Uuid,
        input: Update${pascal}Request,
    ) -> Result<Option<${name}::Model>, DbErr> {
        let Some(found) = ${name}::Entity::find_by_id(id).one(&tx::conn(&self.db)).await? else {
            return Ok(None);
        };

        let mut record: ${name}::ActiveModel = found.into();
        if let Some(title) = input.title {
            record.title = Set(title);
        }
        record.updated_at = Set(chrono::Utc::now().into());

        let updated = record.update(&tx::conn(&self.db)).await?;
        Ok(Some(updated))
    }

    async fn delete(&self, id: Uuid) -> Result<u64, DbErr> {
        let result = ${name}::Entity::delete_by_id(id).exec(&tx::conn(&self.db)).await?;
        Ok(result.rows_affected)
    }

    async fn bulk_update(&self, ids: &[Uuid]) -> Result<u64, DbErr> {
        let result = ${name}::Entity::update_many()
            .col_expr(
                ${name}::Column::UpdatedAt,
                Expr::value(chrono::Utc::now().fixed_offset()),
            )
            .filter(${name}::Column::Id.is_in(ids.to_vec()))
            .exec(&tx::conn(&self.db))
            .await?;
        Ok(result.rows_affected)
    }

    async fn bulk_delete(&self, ids: &[Uuid]) -> Result<u64, DbErr> {
        let result = ${name}::Entity::delete_many()
            .filter(${name}::Column::Id.is_in(ids.to_vec()))
            .exec(&tx::conn(&self.db))
            .await?;
        Ok(result.rows_affected)
    }
}

pub fn create_${name}_repository(db: DatabaseConnection) -> Arc<dyn ${pascal}Repository> {
    Arc::new(SeaOrm${pascal}Repository { db })
}
`
  );

  write(
    join(base, "service.rs"),
    `use std::sync::Arc;

use async_trait::async_trait;
use serde_json::json;
use sea_orm::DatabaseConnection;
use sqlx::PgPool;
use uuid::Uuid;
use transactional::transactional;

use queue::{PublishOptions, QueueChannel};

use crate::shared::error::{AppError, AppResult};
use crate::modules::${name}::dto::{
    BulkDelete${pascal}Request, BulkUpdate${pascal}Request, Create${pascal}Request, ${pascal}Page,
    ${pascal}Response, List${pascal}Query, Update${pascal}Request,
};
use crate::modules::${name}::repository::${pascal}Repository;

const RESOURCE: &str = "${name}";
const MAX_TITLE_LENGTH: usize = 200;
const MAX_BULK_IDS: usize = 500;
const DEFAULT_PAGE: u64 = 1;
const DEFAULT_PER_PAGE: u64 = 10;
const MAX_PER_PAGE: u64 = 100;

#[async_trait]
pub trait ${pascal}Service: Send + Sync {
    async fn list(&self, query: List${pascal}Query) -> AppResult<${pascal}Page>;
    async fn get(&self, id: Uuid) -> AppResult<${pascal}Response>;
    async fn create(&self, input: Create${pascal}Request) -> AppResult<${pascal}Response>;
    async fn update(&self, id: Uuid, input: Update${pascal}Request) -> AppResult<${pascal}Response>;
    async fn delete(&self, id: Uuid) -> AppResult<()>;
    async fn bulk_update(&self, input: BulkUpdate${pascal}Request) -> AppResult<u64>;
    async fn bulk_delete(&self, input: BulkDelete${pascal}Request) -> AppResult<u64>;
    ${withPublish ? `async fn publish_to_queue(&self, id: Uuid) -> AppResult<Uuid>;` : ''}
}

pub struct Default${pascal}Service {
    repository: Arc<dyn ${pascal}Repository>,
    pool: PgPool,
    db: DatabaseConnection,
}

impl Default${pascal}Service {
    fn ensure_bulk_size(ids: &[Uuid]) -> AppResult<()> {
        if ids.is_empty() {
            return Err(AppError::BadRequest("ids must not be empty".to_string()));
        }
        if ids.len() > MAX_BULK_IDS {
            return Err(AppError::BadRequest(format!("no more than {MAX_BULK_IDS} ids per request")));
        }
        Ok(())
    }

    fn ensure_within_limits(title: Option<&str>) -> AppResult<()> {
        if let Some(title) = title {
            if title.chars().count() > MAX_TITLE_LENGTH {
                return Err(AppError::BadRequest(format!("title must be at most {MAX_TITLE_LENGTH} characters")));
            }
        }
        Ok(())
    }
}

#[transactional]
#[async_trait]
impl ${pascal}Service for Default${pascal}Service {
    async fn list(&self, query: List${pascal}Query) -> AppResult<${pascal}Page> {
        let per_page = query.per_page.unwrap_or(DEFAULT_PER_PAGE).clamp(1, MAX_PER_PAGE);
        let page = query.page.unwrap_or(DEFAULT_PAGE).max(DEFAULT_PAGE);

        let (records, total) = self.repository.find_page(&query, page, per_page).await?;

        Ok(${pascal}Page {
            items: records.into_iter().map(${pascal}Response::from).collect(),
            total,
            page,
            per_page,
            total_pages: total.div_ceil(per_page),
        })
    }

    async fn get(&self, id: Uuid) -> AppResult<${pascal}Response> {
        let record = self.repository.find_by_id(id).await?
            .ok_or_else(|| AppError::NotFound { resource: RESOURCE, id: id.to_string() })?;
        Ok(${pascal}Response::from(record))
    }

    #[tx]
    async fn create(&self, input: Create${pascal}Request) -> AppResult<${pascal}Response> {
        if input.title.trim().is_empty() {
            return Err(AppError::BadRequest("title must not be empty".to_string()));
        }
        Self::ensure_within_limits(Some(&input.title))?;

        let record = self.repository.create(input).await?;
        Ok(${pascal}Response::from(record))
    }

    #[tx]
    async fn update(&self, id: Uuid, input: Update${pascal}Request) -> AppResult<${pascal}Response> {
        Self::ensure_within_limits(input.title.as_deref())?;

        let record = self.repository.update(id, input).await?
            .ok_or_else(|| AppError::NotFound { resource: RESOURCE, id: id.to_string() })?;
        Ok(${pascal}Response::from(record))
    }

    async fn delete(&self, id: Uuid) -> AppResult<()> {
        let affected = self.repository.delete(id).await?;
        if affected == 0 {
            return Err(AppError::NotFound { resource: RESOURCE, id: id.to_string() });
        }
        Ok(())
    }

    #[tx]
    async fn bulk_update(&self, input: BulkUpdate${pascal}Request) -> AppResult<u64> {
        Self::ensure_bulk_size(&input.ids)?;
        Ok(self.repository.bulk_update(&input.ids).await?)
    }

    #[tx]
    async fn bulk_delete(&self, input: BulkDelete${pascal}Request) -> AppResult<u64> {
        Self::ensure_bulk_size(&input.ids)?;
        Ok(self.repository.bulk_delete(&input.ids).await?)
    }
${withPublish ? `
    async fn publish_to_queue(&self, id: Uuid) -> AppResult<Uuid> {
        let record = self.repository.find_by_id(id).await?
            .ok_or_else(|| AppError::NotFound { resource: RESOURCE, id: id.to_string() })?;

        let job_id = queue::publish(
            &self.pool,
            QueueChannel::${pascal}Published,
            json!({ "${name}_id": record.id, "title": record.title }),
            PublishOptions::default(),
        ).await?;
        Ok(job_id)
    }
` : ''}
}

pub fn create_${name}_service(
    repository: Arc<dyn ${pascal}Repository>,
    pool: PgPool,
    db: DatabaseConnection,
) -> Arc<dyn ${pascal}Service> {
    Arc::new(Default${pascal}Service { repository, pool, db })
}
`
  );

  write(
    join(base, "controller.rs"),
    `use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use uuid::Uuid;

use crate::shared::error::{AppResult, ErrorBody};
use crate::shared::state::AppState;
use crate::modules::${name}::dto::*;

#[utoipa::path(
    get,
    path = "/${pluralKebab}",
    tag = "${name}",
    params(List${pascal}Query),
    responses((status = 200, body = ${pascal}Page), (status = 500, body = ErrorBody))
)]
pub async fn list_${name}s(
    State(state): State<AppState>,
    Query(query): Query<List${pascal}Query>,
) -> AppResult<Json<${pascal}Page>> {
    let page = state.${name}_service.list(query).await?;
    Ok(Json(page))
}

#[utoipa::path(
    get,
    path = "/${pluralKebab}/{id}",
    tag = "${name}",
    params(("id" = Uuid, Path, description = "${pascal} id")),
    responses((status = 200, body = ${pascal}Response), (status = 404, body = ErrorBody))
)]
pub async fn get_${name}(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<${pascal}Response>> {
    let item = state.${name}_service.get(id).await?;
    Ok(Json(item))
}

#[utoipa::path(
    post,
    path = "/${pluralKebab}",
    tag = "${name}",
    request_body = Create${pascal}Request,
    responses((status = 201, body = ${pascal}Response), (status = 400, body = ErrorBody))
)]
pub async fn create_${name}(
    State(state): State<AppState>,
    Json(payload): Json<Create${pascal}Request>,
) -> AppResult<(StatusCode, Json<${pascal}Response>)> {
    let item = state.${name}_service.create(payload).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/${pluralKebab}/{id}",
    tag = "${name}",
    params(("id" = Uuid, Path, description = "${pascal} id")),
    request_body = Update${pascal}Request,
    responses((status = 200, body = ${pascal}Response), (status = 404, body = ErrorBody))
)]
pub async fn update_${name}(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Update${pascal}Request>,
) -> AppResult<Json<${pascal}Response>> {
    let item = state.${name}_service.update(id, payload).await?;
    Ok(Json(item))
}

#[utoipa::path(
    delete,
    path = "/${pluralKebab}/{id}",
    tag = "${name}",
    params(("id" = Uuid, Path, description = "${pascal} id")),
    responses((status = 204), (status = 404, body = ErrorBody))
)]
pub async fn delete_${name}(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    state.${name}_service.delete(id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    patch,
    path = "/${pluralKebab}/bulk",
    tag = "${name}",
    request_body = BulkUpdate${pascal}Request,
    responses((status = 200, body = BulkResultResponse))
)]
pub async fn bulk_update_${name}s(
    State(state): State<AppState>,
    Json(payload): Json<BulkUpdate${pascal}Request>,
) -> AppResult<Json<BulkResultResponse>> {
    let affected = state.${name}_service.bulk_update(payload).await?;
    Ok(Json(BulkResultResponse { affected }))
}

#[utoipa::path(
    post,
    path = "/${pluralKebab}/bulk-delete",
    tag = "${name}",
    request_body = BulkDelete${pascal}Request,
    responses((status = 200, body = BulkResultResponse))
)]
pub async fn bulk_delete_${name}s(
    State(state): State<AppState>,
    Json(payload): Json<BulkDelete${pascal}Request>,
) -> AppResult<Json<BulkResultResponse>> {
    let affected = state.${name}_service.bulk_delete(payload).await?;
    Ok(Json(BulkResultResponse { affected }))
}
${withPublish ? `
#[utoipa::path(
    post,
    path = "/${pluralKebab}/{id}/publish",
    tag = "${name}",
    params(("id" = Uuid, Path, description = "${pascal} id")),
    responses((status = 202, body = PublishJobResponse), (status = 404, body = ErrorBody))
)]
pub async fn publish_${name}(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<(StatusCode, Json<PublishJobResponse>)> {
    let job_id = state.${name}_service.publish_to_queue(id).await?;
    Ok((StatusCode::ACCEPTED, Json(PublishJobResponse { job_id })))
}
` : ''}
`
  );

  write(
    join(base, "route.rs"),
    `use axum::middleware::from_fn_with_state;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::modules::${name}::controller;
use crate::shared::auth::{require_auth, require_admin};
use crate::shared::state::AppState;

fn member_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(controller::list_${name}s, controller::create_${name}))
        .routes(routes!(controller::get_${name}, controller::update_${name}))
        ${withPublish ? `.routes(routes!(controller::publish_${name}))` : ''}
}

fn admin_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(controller::delete_${name}))
        .routes(routes!(controller::bulk_update_${name}s))
        .routes(routes!(controller::bulk_delete_${name}s))
}

pub fn ${name}_routes(state: AppState) -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .merge(member_routes().route_layer(from_fn_with_state(state.clone(), require_auth)))
        .merge(admin_routes().route_layer(from_fn_with_state(state, require_admin)))
}

pub fn ${name}_routes_for_docs() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().merge(member_routes()).merge(admin_routes())
}
`
  );

  write(
    join(base, "mod.rs"),
    `pub mod controller;
pub mod dto;
pub mod repository;
pub mod route;
pub mod service;

pub use repository::create_${name}_repository;
pub use route::{${name}_routes, ${name}_routes_for_docs};
pub use service::{create_${name}_service, ${pascal}Service};
`
  );

  appendModule(join(ROOT, "apps/api/src/modules/mod.rs"), name);

  const statePath = join(ROOT, "apps/api/src/shared/state.rs");
  insertAfter(statePath, "use crate::modules::example::", `use crate::modules::${name}::{create_${name}_repository, create_${name}_service, ${pascal}Service};`);
  insertAfter(statePath, "pub struct AppState {", `    pub ${name}_service: Arc<dyn ${pascal}Service>,`);
  insertAfter(statePath, "        let example_service = create_example_service(", `        let ${name}_repository = create_${name}_repository(db.clone());\n        let ${name}_service = create_${name}_service(${name}_repository, pool.clone(), db.clone());`);
  insertAfter(statePath, "        AppState {", `            ${name}_service,`);

  const libPath = join(ROOT, "apps/api/src/lib.rs");
  insertAfter(libPath, "use crate::modules::example::{", `use crate::modules::${name}::{${name}_routes, ${name}_routes_for_docs};`);
  insertAfter(libPath, "        .nest(API_PREFIX, example_routes(state.clone()))", `        .nest(API_PREFIX, ${name}_routes(state.clone()))`);
  insertAfter(libPath, "        .nest(API_PREFIX, example_routes_for_docs())", `        .nest(API_PREFIX, ${name}_routes_for_docs())`);

  if (withPublish) {
     addQueueChannel(toPascal(name) + "Published", name + "_published");
  }
}

function addQueueChannel(variant: string, channel: string): void {
  const path = join(ROOT, "packages/queue/src/channel.rs");
  if (!existsSync(path)) return;
  if (readFileSync(path, "utf8").includes(`QueueChannel::${variant}`)) return;

  insertAfter(path, "pub enum QueueChannel {", `    ${variant},`);
  insertAfter(path, "    pub const ALL:", `        QueueChannel::${variant},`);
  insertAfter(path, "        match self {", `            QueueChannel::${variant} => "${channel}",`);
}

// ... [Keep scaffoldWorker and scaffoldWeb exactly the same as your original script] ...

async function ask(question: string, options: readonly string[] = []): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    if (options.length > 0) {
      console.log(question);
      options.forEach((option, index) => console.log(`  ${index + 1}) ${option}`));
      const raw = (await rl.question("> ")).trim();
      const picked = Number(raw);
      if (Number.isInteger(picked) && picked >= 1 && picked <= options.length) {
        return options[picked - 1]!;
      }
      if (options.includes(raw)) return raw;
      throw new ScaffoldError(`pick one of ${options.join(", ")}`);
    }
    return (await rl.question(`${question} `)).trim();
  } finally {
    rl.close();
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  try {
    const rawApp = args.find(a => !a.startsWith("-")) ?? (await ask("Which app?", APPS));
    const app = rawApp as App;
    if (!APPS.includes(app)) {
      throw new ScaffoldError(`app must be one of ${APPS.join(", ")}`);
    }

    const nameArgs = args.filter(a => !a.startsWith("-") && a !== app);
    const name = nameArgs[0] ?? (await ask("Module name (snake_case):"));
    if (!NAME_PATTERN.test(name)) {
      throw new ScaffoldError("name must be snake_case, for example order_item");
    }

    console.log(`\nScaffolding ${app} module ${name}`);

    if (app === "api") {
      let withPublish = args.includes("--publish") || args.includes("-p");
      if (!withPublish && !args.some(a => a.startsWith("-"))) {
          const ans = await ask("Include publish queue route? (y/n)");
          withPublish = ans.toLowerCase() === "y";
      }
      scaffoldApi(name, withPublish);
    } else if (app === "worker") {
      const channel = nameArgs[1] ?? `${name}_created`;
      if (!NAME_PATTERN.test(channel)) {
        throw new ScaffoldError("channel must be snake_case");
      }
      // scaffoldWorker(name, channel); // UNCOMMENT/ADD BACK IN FROM ORIGINAL
    } else {
      // scaffoldWeb(name); // UNCOMMENT/ADD BACK IN FROM ORIGINAL
    }

    console.log("\nDone. Run `just codegen` (and potentially `sea-orm-cli migrate up`) to verify.");
    return 0;
  } catch (error) {
    if (error instanceof ScaffoldError) {
      console.error(`error: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

process.exit(await main());
