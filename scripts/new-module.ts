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

/** Insert `line` after every line that starts with `anchor`. */
function insertAfterEvery(path: string, anchor: string, line: string): void {
  const text = readFileSync(path, "utf8");
  if (alreadyPresent(text, line)) return;

  const lines = text.split("\n");
  const result: string[] = [];
  let found = false;

  for (const current of lines) {
    result.push(current);
    if (current.startsWith(anchor)) {
      result.push(line);
      found = true;
    }
  }

  if (!found) {
    throw new ScaffoldError(`anchor "${anchor}" not found in ${show(path)}`);
  }

  writeFileSync(path, result.join("\n"));
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
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
pub struct ${pascal}Response {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct Create${pascal}Request {
    pub name: String,
}
`,
  );

  write(
    join(base, "repository.rs"),
    `use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::{DatabaseConnection, DbErr};

use crate::modules::${name}::dto::${pascal}Response;

#[async_trait]
pub trait ${pascal}Repository: Send + Sync {
    async fn find_all(&self) -> Result<Vec<${pascal}Response>, DbErr>;
}

pub struct SeaOrm${pascal}Repository {
    #[allow(dead_code)]
    db: DatabaseConnection,
}

#[async_trait]
impl ${pascal}Repository for SeaOrm${pascal}Repository {
    async fn find_all(&self) -> Result<Vec<${pascal}Response>, DbErr> {
        Ok(Vec::new())
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

use crate::modules::${name}::dto::${pascal}Response;
use crate::modules::${name}::repository::${pascal}Repository;
use crate::shared::error::AppResult;

#[async_trait]
pub trait ${pascal}Service: Send + Sync {
    async fn list(&self) -> AppResult<Vec<${pascal}Response>>;
}

pub struct Default${pascal}Service {
    repository: Arc<dyn ${pascal}Repository>,
}

#[async_trait]
impl ${pascal}Service for Default${pascal}Service {
    async fn list(&self) -> AppResult<Vec<${pascal}Response>> {
        let records = self.repository.find_all().await?;
        Ok(records)
    }
}

pub fn create_${name}_service(repository: Arc<dyn ${pascal}Repository>) -> Arc<dyn ${pascal}Service> {
    Arc::new(Default${pascal}Service { repository })
}
`,
  );

  write(
    join(base, "controller.rs"),
    `use axum::extract::State;
use axum::Json;

use crate::modules::${name}::dto::${pascal}Response;
use crate::shared::error::{AppResult, ErrorBody};
use crate::shared::state::AppState;

#[utoipa::path(
    get,
    path = "/${kebab}",
    tag = "${name}",
    responses(
        (status = 200, body = Vec<${pascal}Response>),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn list_${name}(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<${pascal}Response>>> {
    let records = state.${name}_service.list().await?;
    Ok(Json(records))
}
`,
  );

  write(
    join(base, "route.rs"),
    `use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::modules::${name}::controller;
use crate::shared::state::AppState;

pub fn ${name}_routes() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(controller::list_${name}))
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
pub use route::${name}_routes;
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
    `        let ${name}_repository = create_${name}_repository(db.clone());\n        let ${name}_service = create_${name}_service(${name}_repository);`,
  );
  insertAfter(statePath, "        AppState {", `            ${name}_service,`);

  const libPath = join(ROOT, "apps/api/src/lib.rs");
  insertAfter(
    libPath,
    "use crate::modules::example::example_routes;",
    `use crate::modules::${name}::${name}_routes;`,
  );
  insertAfterEvery(
    libPath,
    "        .merge(example_routes())",
    `        .merge(${name}_routes())`,
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

#[async_trait]
pub trait ${pascal}Repository: Send + Sync {
    async fn exists(&self, id: i32) -> Result<bool, DbErr>;
}

pub struct SeaOrm${pascal}Repository {
    #[allow(dead_code)]
    db: DatabaseConnection,
}

#[async_trait]
impl ${pascal}Repository for SeaOrm${pascal}Repository {
    async fn exists(&self, _id: i32) -> Result<bool, DbErr> {
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

use crate::modules::${name}::repository::${pascal}Repository;
use crate::shared::error::{WorkerError, WorkerResult};

#[async_trait]
pub trait ${pascal}Service: Send + Sync {
    async fn handle(&self, id: i32) -> WorkerResult<()>;
}

pub struct Default${pascal}Service {
    repository: Arc<dyn ${pascal}Repository>,
}

#[async_trait]
impl ${pascal}Service for Default${pascal}Service {
    async fn handle(&self, id: i32) -> WorkerResult<()> {
        if !self.repository.exists(id).await? {
            return Err(WorkerError::InvalidPayload(format!("${name} {id} does not exist")));
        }

        tracing::info!(id = id, "${name} handled");
        Ok(())
    }
}

pub fn create_${name}_service(repository: Arc<dyn ${pascal}Repository>) -> Arc<dyn ${pascal}Service> {
    Arc::new(Default${pascal}Service { repository })
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
    `    let ${name}_repository = create_${name}_repository(db.clone());\n    let ${name}_service = create_${name}_service(${name}_repository);`,
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

import type { ${pascal} } from "@/features/${slug}/dtos/${slug}.dto";

export async function list${pascal}(): Promise<${pascal}[]> {
  return [];
}
`,
  );

  write(
    join(base, "actions", `${slug}.actions.ts`),
    `"use server";

import type { ActionState } from "@/features/${slug}/dtos/${slug}.dto";

export async function submit${pascal}Action(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();

  if (name.length === 0) {
    return { ok: false, message: "Name is required" };
  }

  return { ok: true, message: \`Saved \${name}\` };
}
`,
  );

  write(
    join(base, "hooks", `use-${slug}-form.ts`),
    `"use client";

import { useActionState } from "react";

import { submit${pascal}Action } from "@/features/${slug}/actions/${slug}.actions";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/features/${slug}/dtos/${slug}.dto";

export function use${pascal}Form() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submit${pascal}Action,
    INITIAL_ACTION_STATE,
  );

  return { state, formAction, pending };
}
`,
  );

  write(
    join(base, "components", `${slug}-form.tsx`),
    `"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { use${pascal}Form } from "@/features/${slug}/hooks/use-${slug}-form";

export function ${pascal}Form() {
  const { state, formAction, pending } = use${pascal}Form();

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>

      {state.message.length > 0 && (
        <p className={state.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
`,
  );

  write(
    join(base, "index.tsx"),
    `import { ${pascal}Form } from "@/features/${slug}/components/${slug}-form";
import { list${pascal} } from "@/features/${slug}/services/${slug}.service";

export async function ${pascal}View() {
  const records = await list${pascal}();

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">${pascal}</h1>
      <${pascal}Form />
      <p className="text-sm text-muted-foreground">{records.length} records</p>
    </section>
  );
}
`,
  );

  console.log(`\nAdd a page that renders it, for example`);
  console.log(`    apps/web/src/app/(core-app)/${slug}/page.tsx`);
  console.log(`    import { ${pascal}View } from "@/features/${slug}";`);
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
