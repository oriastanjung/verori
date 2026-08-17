#!/usr/bin/env bun
/**
 * Scaffold a new module in the api, the worker, or the web app.
 *
 *   just new-module                  interactive
 *   just new-module api invoice
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

/** True when every line of `block` is already present as its own line. */
function alreadyPresent(text: string, block: string): boolean {
  const existing = new Set(text.split("\n").map((line) => line.trim()));
  return block
    .split("\n")
    .every((line) => existing.has(line.trim()));
}

/** Insert `line` after the first line that starts with `anchor`. */
function insertAfter(path: string, anchor: string, line: string): void {
  const text = readFileSync(path, "utf8");
  if (alreadyPresent(text, line)) return;

  const lines = text.split("\n");
  const index = lines.findIndex((current) => current.startsWith(anchor));
  if (index === -1) {
    throw new ScaffoldError(`anchor "${anchor}" not found in ${show(path)}`);
  }

  lines.splice(index + 1, 0, line);
  writeFileSync(path, lines.join("\n"));
  console.log(`  updated ${show(path)}`);
}

function appendModule(path: string, name: string): void {
  const declaration = `pub mod ${name};`;
  const text = readFileSync(path, "utf8");
  if (text.includes(declaration)) return;

  const lines = text.split("\n").filter((line) => line.length > 0);
  lines.push(declaration);
  lines.sort();
  writeFileSync(path, `${lines.join("\n")}\n`);
  console.log(`  updated ${show(path)}`);
}

function scaffoldApi(name: string): void {
  const pascal = toPascal(name);
  const kebab = toKebab(name);
  const base = join(ROOT, "apps/api/src/modules", name);

  write(
    join(base, "dto.rs"),
    `use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Debug, Serialize, ToSchema)]
pub struct ${pascal}Response {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct Create${pascal}Request {
    pub name: String,
}

/// Paging, searching and sorting for the list endpoint.
#[derive(Debug, Clone, Default, Deserialize, IntoParams)]
pub struct List${pascal}Query {
    /// One based.
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    /// asc or desc.
    pub sort_dir: Option<String>,
}

/// One page of results plus the counts a table needs for its footer.
#[derive(Debug, Serialize, ToSchema)]
pub struct ${pascal}Page {
    pub items: Vec<${pascal}Response>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
    pub total_pages: u64,
}
`,
  );

  write(
    join(base, "repository.rs"),
    `use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::{DatabaseConnection, DbErr};

use db::tx;

use crate::modules::${name}::dto::{List${pascal}Query, ${pascal}Response};

#[async_trait]
pub trait ${pascal}Repository: Send + Sync {
    /// Returns one page of rows and the total number of matches.
    async fn find_page(
        &self,
        query: &List${pascal}Query,
        page: u64,
        per_page: u64,
    ) -> Result<(Vec<${pascal}Response>, u64), DbErr>;
}

pub struct SeaOrm${pascal}Repository {
    db: DatabaseConnection,
}

#[async_trait]
impl ${pascal}Repository for SeaOrm${pascal}Repository {
    async fn find_page(
        &self,
        _query: &List${pascal}Query,
        _page: u64,
        _per_page: u64,
    ) -> Result<(Vec<${pascal}Response>, u64), DbErr> {
        // Query through tx::conn so the call joins the service transaction.
        // See the example module for paginate, search and sort.
        let _connection = tx::conn(&self.db);
        Ok((Vec::new(), 0))
    }
}

pub fn create_${name}_repository(db: DatabaseConnection) -> Arc<dyn ${pascal}Repository> {
    Arc::new(SeaOrm${pascal}Repository { db })
}
`,
  );

  write(
    join(base, "service.rs"),
    `use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::DatabaseConnection;
use transactional::transactional;

use crate::modules::${name}::dto::{List${pascal}Query, ${pascal}Page};
use crate::modules::${name}::repository::${pascal}Repository;
use crate::shared::error::AppResult;

const DEFAULT_PAGE: u64 = 1;
const DEFAULT_PER_PAGE: u64 = 10;
const MAX_PER_PAGE: u64 = 100;

#[async_trait]
pub trait ${pascal}Service: Send + Sync {
    async fn list(&self, query: List${pascal}Query) -> AppResult<${pascal}Page>;
}

pub struct Default${pascal}Service {
    repository: Arc<dyn ${pascal}Repository>,
    db: DatabaseConnection,
}

/// Mark a method with #[tx] to run it, and every repository call it makes, in
/// one transaction. #[transactional] must stay above #[async_trait].
#[transactional]
#[async_trait]
impl ${pascal}Service for Default${pascal}Service {
    #[tx]
    async fn list(&self, query: List${pascal}Query) -> AppResult<${pascal}Page> {
        let per_page = query.per_page.unwrap_or(DEFAULT_PER_PAGE).clamp(1, MAX_PER_PAGE);
        let page = query.page.unwrap_or(DEFAULT_PAGE).max(DEFAULT_PAGE);

        let (items, total) = self.repository.find_page(&query, page, per_page).await?;

        Ok(${pascal}Page {
            items,
            total,
            page,
            per_page,
            total_pages: total.div_ceil(per_page),
        })
    }
}

pub fn create_${name}_service(
    repository: Arc<dyn ${pascal}Repository>,
    db: DatabaseConnection,
) -> Arc<dyn ${pascal}Service> {
    Arc::new(Default${pascal}Service { repository, db })
}
`,
  );

  write(
    join(base, "controller.rs"),
    `use axum::extract::{Query, State};
use axum::Json;

use crate::modules::${name}::dto::{List${pascal}Query, ${pascal}Page};
use crate::shared::error::{AppResult, ErrorBody};
use crate::shared::state::AppState;

#[utoipa::path(
    get,
    path = "/${kebab}",
    tag = "${name}",
    params(List${pascal}Query),
    responses(
        (status = 200, body = ${pascal}Page),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn list_${name}(
    State(state): State<AppState>,
    Query(query): Query<List${pascal}Query>,
) -> AppResult<Json<${pascal}Page>> {
    let page = state.${name}_service.list(query).await?;
    Ok(Json(page))
}
`,
  );

  write(
    join(base, "route.rs"),
    `use axum::middleware::from_fn_with_state;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::modules::${name}::controller;
use crate::shared::auth::{require_admin, require_auth};
use crate::shared::state::AppState;

/// Anyone signed in may use these.
fn member_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(controller::list_${name}))
}

/// Admin only. Move a route here when it should be restricted.
fn admin_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
}

/// Routes with their access rules attached. This is what the server mounts.
pub fn ${name}_routes(state: AppState) -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .merge(member_routes().route_layer(from_fn_with_state(state.clone(), require_auth)))
        .merge(admin_routes().route_layer(from_fn_with_state(state, require_admin)))
}

/// The same routes without guards, used only for the OpenAPI document.
pub fn ${name}_routes_for_docs() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .merge(member_routes())
        .merge(admin_routes())
}
`,
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
`,
  );

  appendModule(join(ROOT, "apps/api/src/modules/mod.rs"), name);

  const statePath = join(ROOT, "apps/api/src/shared/state.rs");
  insertAfter(
    statePath,
    "use crate::modules::example::",
    `use crate::modules::${name}::{create_${name}_repository, create_${name}_service, ${pascal}Service};`,
  );
  insertAfter(
    statePath,
    "pub struct AppState {",
    `    pub ${name}_service: Arc<dyn ${pascal}Service>,`,
  );
  insertAfter(
    statePath,
    "        let example_service = create_example_service(",
    `        let ${name}_repository = create_${name}_repository(db.clone());\n        let ${name}_service = create_${name}_service(${name}_repository, db.clone());`,
  );
  insertAfter(statePath, "        AppState {", `            ${name}_service,`);

  const libPath = join(ROOT, "apps/api/src/lib.rs");
  insertAfter(
    libPath,
    "use crate::modules::example::{example_routes, example_routes_for_docs};",
    `use crate::modules::${name}::{${name}_routes, ${name}_routes_for_docs};`,
  );
  insertAfter(
    libPath,
    "        .nest(API_PREFIX, example_routes(state.clone()))",
    `        .nest(API_PREFIX, ${name}_routes(state.clone()))`,
  );
  insertAfter(
    libPath,
    "        .nest(API_PREFIX, example_routes_for_docs())",
    `        .nest(API_PREFIX, ${name}_routes_for_docs())`,
  );
}

function addQueueChannel(variant: string, channel: string): void {
  const path = join(ROOT, "packages/queue/src/channel.rs");
  if (readFileSync(path, "utf8").includes(`QueueChannel::${variant}`)) return;

  insertAfter(path, "pub enum QueueChannel {", `    ${variant},`);
  insertAfter(path, "    pub const ALL:", `        QueueChannel::${variant},`);
  insertAfter(
    path,
    "        match self {",
    `            QueueChannel::${variant} => "${channel}",`,
  );
}

function scaffoldWorker(name: string, channel: string): void {
  const pascal = toPascal(name);
  const variant = toPascal(channel);
  const base = join(ROOT, "apps/worker/src/modules", name);

  write(
    join(base, "dto.rs"),
    `use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ${pascal}Payload {
    pub id: i32,
}
`,
  );

  write(
    join(base, "repository.rs"),
    `use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::{DatabaseConnection, DbErr};

use db::tx;

#[async_trait]
pub trait ${pascal}Repository: Send + Sync {
    async fn exists(&self, id: i32) -> Result<bool, DbErr>;
}

pub struct SeaOrm${pascal}Repository {
    db: DatabaseConnection,
}

#[async_trait]
impl ${pascal}Repository for SeaOrm${pascal}Repository {
    async fn exists(&self, _id: i32) -> Result<bool, DbErr> {
        // Query through tx::conn so the call joins the service transaction.
        let _connection = tx::conn(&self.db);
        Ok(true)
    }
}

pub fn create_${name}_repository(db: DatabaseConnection) -> Arc<dyn ${pascal}Repository> {
    Arc::new(SeaOrm${pascal}Repository { db })
}
`,
  );

  write(
    join(base, "service.rs"),
    `use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::DatabaseConnection;
use transactional::transactional;

use crate::modules::${name}::repository::${pascal}Repository;
use crate::shared::error::{WorkerError, WorkerResult};

#[async_trait]
pub trait ${pascal}Service: Send + Sync {
    async fn handle(&self, id: i32) -> WorkerResult<()>;
}

pub struct Default${pascal}Service {
    repository: Arc<dyn ${pascal}Repository>,
    db: DatabaseConnection,
}

/// Mark a method with #[tx] to run it, and every repository call it makes, in
/// one transaction. #[transactional] must stay above #[async_trait].
#[transactional]
#[async_trait]
impl ${pascal}Service for Default${pascal}Service {
    #[tx]
    async fn handle(&self, id: i32) -> WorkerResult<()> {
        if !self.repository.exists(id).await? {
            return Err(WorkerError::InvalidPayload(format!("${name} {id} does not exist")));
        }

        tracing::info!(id = id, "${name} handled");
        Ok(())
    }
}

pub fn create_${name}_service(
    repository: Arc<dyn ${pascal}Repository>,
    db: DatabaseConnection,
) -> Arc<dyn ${pascal}Service> {
    Arc::new(Default${pascal}Service { repository, db })
}
`,
  );

  write(
    join(base, "consumer.rs"),
    `use std::sync::Arc;

use async_trait::async_trait;

use queue::{Job, QueueChannel};

use crate::modules::${name}::dto::${pascal}Payload;
use crate::modules::${name}::service::${pascal}Service;
use crate::shared::consumer::Consumer;
use crate::shared::error::{WorkerError, WorkerResult};

pub struct ${pascal}Consumer {
    service: Arc<dyn ${pascal}Service>,
}

#[async_trait]
impl Consumer for ${pascal}Consumer {
    fn channel(&self) -> QueueChannel {
        QueueChannel::${variant}
    }

    async fn handle(&self, job: &Job) -> WorkerResult<()> {
        let payload: ${pascal}Payload = serde_json::from_value(job.payload.clone())
            .map_err(|error| WorkerError::InvalidPayload(error.to_string()))?;

        self.service.handle(payload.id).await
    }
}

pub fn create_${name}_consumer(service: Arc<dyn ${pascal}Service>) -> Arc<dyn Consumer> {
    Arc::new(${pascal}Consumer { service })
}
`,
  );

  write(
    join(base, "mod.rs"),
    `pub mod consumer;
pub mod dto;
pub mod repository;
pub mod service;

pub use consumer::create_${name}_consumer;
pub use repository::create_${name}_repository;
pub use service::create_${name}_service;
`,
  );

  appendModule(join(ROOT, "apps/worker/src/modules/mod.rs"), name);
  addQueueChannel(variant, channel);

  const statePath = join(ROOT, "apps/worker/src/shared/state.rs");
  insertAfter(
    statePath,
    "use crate::shared::consumer::Consumer;",
    `use crate::modules::${name}::{create_${name}_consumer, create_${name}_repository, create_${name}_service};`,
  );
  insertAfter(
    statePath,
    "    let example_service = create_example_service(",
    `    let ${name}_repository = create_${name}_repository(db.clone());\n    let ${name}_service = create_${name}_service(${name}_repository, db.clone());`,
  );
  insertAfter(statePath, "    vec![", `        create_${name}_consumer(${name}_service),`);
}

function scaffoldWeb(name: string): void {
  const pascal = toPascal(name);
  const slug = toKebab(name);
  const base = join(ROOT, "apps/web/src/features", slug);

  write(
    join(base, "dtos", `${slug}.dto.ts`),
    `export type ${pascal} = {
  id: number;
  name: string;
};

/** The shape AppCrud expects from the api. */
export type ${pascal}Page = {
  items: ${pascal}[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

/** What the list page reads out of the url. */
export type ${pascal}ListQuery = {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
};

export type ActionState = {
  ok: boolean;
  message: string;
};

export const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: "",
};
`,
  );

  write(
    join(base, "services", `${slug}.service.ts`),
    `import "server-only";

import type {
  ${pascal}ListQuery,
  ${pascal}Page,
} from "@/features/${slug}/dtos/${slug}.dto";

/**
 * Every API call for this feature belongs here. Components and actions never
 * call fetch directly.
 *
 * Swap this for the generated client once the api has the route. It attaches
 * the session automatically:
 *
 *   import { apiClient } from "@/lib/api-client";
 *
 *   const { data, error } = await apiClient.GET("/api/${slug}", {
 *     params: { query },
 *   });
 *   if (error) throw new Error(error.message);
 *   return data;
 */
export async function list${pascal}(query: ${pascal}ListQuery): Promise<${pascal}Page> {
  return {
    items: [],
    total: 0,
    page: query.page ?? 1,
    per_page: query.per_page ?? 10,
    total_pages: 0,
  };
}
`,
  );

  write(
    join(base, "actions", `${slug}.actions.ts`),
    `"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/features/${slug}/dtos/${slug}.dto";

const FEATURE_PATH = "/dashboard/${slug}";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function readText(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

export async function create${pascal}Action(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = readText(formData, "name");

  if (name.length === 0) {
    return { ok: false, message: "Name is required" };
  }

  try {
    // Call the service here.
    revalidatePath(FEATURE_PATH);
    return { ok: true, message: \`Created \${name}\` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function delete${pascal}Action(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get("id"));

  try {
    // Call the service here.
    revalidatePath(FEATURE_PATH);
    return { ok: true, message: \`Deleted \${id}\` };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}
`,
  );

  write(
    join(base, "components", `${slug}-crud.tsx`),
    `"use client";

import { AppCrud } from "@/components/composite/app-crud";
import type { CrudColumn, CrudField } from "@/components/composite/crud-types";
import {
  create${pascal}Action,
  delete${pascal}Action,
} from "@/features/${slug}/actions/${slug}.actions";
import type { ${pascal}, ${pascal}Page } from "@/features/${slug}/dtos/${slug}.dto";

const COLUMNS: CrudColumn<${pascal}>[] = [
  { key: "name", header: "Name", sortable: true, className: "font-medium" },
];

const FIELDS: CrudField<${pascal}>[] = [
  {
    name: "name",
    label: "Name",
    required: true,
    initialValue: (row) => row.name,
  },
];

type Props = {
  page: ${pascal}Page;
};

export function ${pascal}Crud({ page }: Props) {
  return (
    <AppCrud<${pascal}>
      title="${pascal} Management"
      page={page}
      columns={COLUMNS}
      fields={FIELDS}
      labels={{ singular: "${slug}" }}
      actions={{
        create: create${pascal}Action,
        remove: delete${pascal}Action,
      }}
    />
  );
}
`,
  );

  write(
    join(base, "index.tsx"),
    `import { ${pascal}Crud } from "@/features/${slug}/components/${slug}-crud";
import type { ${pascal}ListQuery } from "@/features/${slug}/dtos/${slug}.dto";
import { list${pascal} } from "@/features/${slug}/services/${slug}.service";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

/** Turns the url into the query the api understands. */
function toQuery(params: Props["searchParams"]): ${pascal}ListQuery {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    page: Number(read("page")) || undefined,
    per_page: Number(read("per_page")) || undefined,
    search: read("search"),
    sort_by: read("sort_by"),
    sort_dir: read("sort_dir"),
  };
}

/** View layer for this feature. Pages render only this. */
export async function ${pascal}View({ searchParams }: Props) {
  const page = await list${pascal}(toQuery(searchParams));

  return <${pascal}Crud page={page} />;
}
`,
  );

  console.log("\nAdd a page that renders it. For the signed-in app:");
  console.log(`    apps/web/src/app/(core-app)/dashboard/${slug}/page.tsx`);
  console.log("or, for admins only:");
  console.log(`    apps/web/src/app/(admin)/admin/${slug}/page.tsx`);
  console.log("\nThe page should contain nothing but this:");
  console.log(`    import { ${pascal}View } from "@/features/${slug}";`);
  console.log('    export const dynamic = "force-dynamic";');
  console.log("    type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };");
  console.log(`    export default async function Page({ searchParams }: Props) {`);
  console.log(`      return <${pascal}View searchParams={await searchParams} />;`);
  console.log("    }");
  console.log("\nThen add it to the sidebar in src/app/(core-app)/layout.tsx");
  console.log("or src/app/(admin)/layout.tsx.");
}

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
    const app = (args[0] ?? (await ask("Which app?", APPS))) as App;
    if (!APPS.includes(app)) {
      throw new ScaffoldError(`app must be one of ${APPS.join(", ")}`);
    }

    const name = args[1] ?? (await ask("Module name (snake_case):"));
    if (!NAME_PATTERN.test(name)) {
      throw new ScaffoldError("name must be snake_case, for example order_item");
    }

    console.log(`\nScaffolding ${app} module ${name}`);

    if (app === "api") {
      scaffoldApi(name);
    } else if (app === "worker") {
      const channel = args[2] ?? `${name}_created`;
      if (!NAME_PATTERN.test(channel)) {
        throw new ScaffoldError("channel must be snake_case");
      }
      scaffoldWorker(name, channel);
    } else {
      scaffoldWeb(name);
    }

    console.log("\nDone. Run `just build` (or `just codegen` for api) to check it compiles.");
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
