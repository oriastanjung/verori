# AGENTS.md

> Open your first message of the session with
> `AGENTS.md VERORI REPO Guidelines READ AND IMPORTED!`
> then the proof line described at the bottom of this file.

Read this before writing code in VERORI. It describes the patterns this repo already uses; match them rather than inventing new ones.

## What this repo is

A monorepo with three apps and four shared packages:

```
apps/api        Axum HTTP API. Owns the OpenAPI document.
apps/worker     Consumes jobs from Postgres LISTEN/NOTIFY.
apps/web        Next.js 16 app. Consumes generated types from the api.
packages/db     SeaORM entities and migrations. The only place SQL schema lives.
packages/queue  Typed queue channels and publish/consume helpers.
packages/logging Shared tracing setup.
```

`apps/web` is **not** a Cargo workspace member. The root `Cargo.toml` is a virtual manifest listing only the Rust crates.

## Golden rule: use the scaffolder

**Do not hand-write a new module.** Run:

```bash
just new-module                              # interactive: pick app, then name
just new-module api order                    # api module
just new-module worker order order_shipped   # worker module + queue channel
just new-module web checkout                 # web feature
```

It creates every file in the right shape and registers the module in the module tree, the dependency-injection wiring, the router, and — for workers — the `QueueChannel` enum. The output compiles as-is. Edit it; do not start from a blank file.

After scaffolding an api module, run `just codegen` so the web types pick up the new routes.

## Architecture rules

These hold everywhere:

- **One job per file.** If you need "and" to describe a function, split it.
- **Layers only talk downward.** `controller → service → repository → database`. A controller never touches SeaORM. A service never touches `axum`.
- **Depend on traits, not structs.** Services hold `Arc<dyn SomeRepository>`, never a concrete type.
- **Wire dependencies once, at boot.** `apps/api/src/shared/state.rs` and `apps/worker/src/shared/state.rs` are the only places that construct implementations.
- **Validate at the boundary.** Requests become DTOs; DTOs never leak raw `serde_json::Value` into a service.
- **Map errors in one place.** `AppError` → HTTP status lives in `apps/api/src/shared/error.rs`. Nowhere else returns a status code.
- **No magic values.** Name them as `const` at the top of the file.
- **Guard clauses over nesting.** Return early.
- **Comment only non-obvious *why*.** Do not narrate what the code already says.
- **No `TODO` comments.** Implement it, or leave it out and say why in the PR.
- **No swallowed errors.** No `let _ = fallible()` for anything that matters.

## API pattern (`apps/api`)

A module is exactly these files:

```
modules/<name>/
  mod.rs          re-exports the public surface
  route.rs        OpenApiRouter, maps paths to controller functions
  controller.rs   axum handlers + #[utoipa::path] annotations
  service.rs      business rules, returns AppResult<T>
  repository.rs   SeaORM queries, returns Result<T, DbErr>
  dto.rs          request/response structs with ToSchema
```

Each layer is a trait plus one implementation plus a constructor function:

```rust
#[async_trait]
pub trait OrderRepository: Send + Sync {
    async fn find_all(&self) -> Result<Vec<order::Model>, DbErr>;
}

pub struct SeaOrmOrderRepository {
    db: DatabaseConnection,
}

#[async_trait]
impl OrderRepository for SeaOrmOrderRepository { /* ... */ }

pub fn create_order_repository(db: DatabaseConnection) -> Arc<dyn OrderRepository> {
    Arc::new(SeaOrmOrderRepository { db })
}
```

Services follow the same shape and take their repository as `Arc<dyn OrderRepository>`.

Controllers stay thin — extract, call the service, wrap the result:

```rust
#[utoipa::path(
    get,
    path = "/orders/{id}",
    tag = "order",
    params(("id" = i32, Path, description = "Order id")),
    responses(
        (status = 200, body = OrderResponse),
        (status = 404, body = ErrorBody),
        (status = 500, body = ErrorBody)
    )
)]
pub async fn get_order(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> AppResult<Json<OrderResponse>> {
    let order = state.order_service.get(id).await?;
    Ok(Json(order))
}
```

**Always declare every response status you can return, including `500`.** Undeclared error responses make the generated TypeScript error type `never`, and the web service layer will not compile.

Shared api code lives in `apps/api/src/shared/` — not `lib/`, because `src/lib.rs` is the crate root and Rust rejects a sibling `src/lib/` directory.

## Worker pattern (`apps/worker`)

Same layering, but the entry point is a consumer instead of a route:

```
modules/<name>/
  mod.rs
  consumer.rs     implements Consumer: channel() + handle(job)
  service.rs      business rules, returns WorkerResult<T>
  repository.rs   SeaORM queries
  dto.rs          payload structs (Deserialize)
```

A consumer parses the job payload into a typed DTO and delegates:

```rust
#[async_trait]
impl Consumer for OrderShippedConsumer {
    fn channel(&self) -> QueueChannel {
        QueueChannel::OrderShipped
    }

    async fn handle(&self, job: &Job) -> WorkerResult<()> {
        let payload: OrderShippedPayload = serde_json::from_value(job.payload.clone())
            .map_err(|error| WorkerError::InvalidPayload(error.to_string()))?;

        self.service.on_shipped(payload.order_id).await
    }
}
```

`Runner` handles fetching, retries bookkeeping, marking done/failed, and logging. Consumers only implement the two trait methods.

## Queue rules (`packages/queue`)

- **Channel names are never strings at the call site.** Add a variant to `QueueChannel` and use it. The scaffolder does this for you.
- Publishing inserts a row into `jobs` and then fires `NOTIFY`. The row is the source of truth; the notification is only a wake-up, and the worker also polls on an interval in case one is missed.
- Workers claim rows with `FOR UPDATE SKIP LOCKED`, so running several workers is safe.
- `NOTIFY` payloads are capped by Postgres, so never put business data in them — only the job id.
- **Consumers must be idempotent.** Delivery is at-least-once: if a worker dies after doing the work but before marking the job done, the lease expires and the job runs again. Use `PublishOptions::with_idempotency_key` to deduplicate the *enqueue*, but the handler itself still has to tolerate a repeat.
- A failed job is retried with exponential backoff until `max_attempts`, then becomes `dead`. Inspect with `just queue-status`, recover with `just queue-redrive <channel>`.
- Retry budget is a publish-time decision (`PublishOptions::max_attempts`), not a worker setting. The column default is 5.
- Worker tuning lives in `apps/worker/.env`: concurrency, batch size, lease, poll interval, backoff.

## Web pattern (`apps/web`)

```
src/app/(public)/          marketing pages, statically rendered
src/app/(core-app)/        the signed-in app
src/components/ui/         shadcn components, do not edit by hand
src/features/<name>/
  index.tsx                the view layer; the page renders only this
  components/              presentational + client components
  actions/                 "use server" server actions
  hooks/                   client hooks, mostly useActionState wrappers
  services/                all API calls, "server-only"
  dtos/                    types, derived from generated types
src/generated/api-types.ts generated, never edit
src/lib/api-client.ts      typed openapi-fetch client
```

Rules:

- **A `page.tsx` contains no logic.** It imports the feature's `index.tsx` and renders it.
- **Only `services/` calls the API.** Components and actions never call `fetch` or `apiClient` directly.
- **Mutations go through server actions**, and the client side uses `useActionState` so pending and error states are handled uniformly. Actions return `ActionState`, never throw to the client.
- **DTOs derive from generated types**, so a Rust change breaks the build in the right place:
  ```ts
  import type { components } from "@/generated/api-types";
  export type Order = components["schemas"]["OrderResponse"];
  ```
- **Pages that read live data must set `export const dynamic = "force-dynamic"`**, otherwise the production build tries to prerender them and fails when the API is not running.
- Both route groups cannot own `/`. `(public)` owns `/`; put app pages under a path such as `/dashboard`.

## Codegen

`utoipa` (Rust) → `openapi.json` → `openapi-typescript` → `src/generated/api-types.ts`.

- `just codegen` runs the whole chain.
- `just dev` runs it automatically whenever `apps/api/src/modules` or `apps/api/src/shared` changes.
- `openapi.json` and `src/generated/` are **committed on purpose**, so the web app builds without a Rust toolchain.
- Never edit generated files. Change the Rust types and re-run codegen.

## Graceful shutdown

Both binaries listen for Ctrl+C and SIGTERM via `logging::shutdown::signal_received()`.

- The api uses `axum::serve(...).with_graceful_shutdown(...)`, so in-flight requests finish.
- The worker stops claiming new jobs but lets the current batch finish, so nothing is abandoned while leased.
- Both close the sqlx pool and the SeaORM connection before exiting.

## Ports and config

| Service | Port |
| --- | --- |
| Web | 3000 |
| API (and `/docs`) | 3001 |

**Every app owns its own `.env` and `.env.example`.** There is no root `.env`:

```
apps/api/.env      DATABASE_URL, HOST, PORT
apps/worker/.env   DATABASE_URL, WORKER_* tuning
apps/web/.env      PORT, API_BASE_URL, NEXT_PUBLIC_API_BASE_URL
```

Each Rust app loads its own file from `CARGO_MANIFEST_DIR`, so it works no matter where you run the binary from. Recipes that need a database (`migrate`, `test`) source `apps/api/.env` explicitly.

Config is read once into a struct (`AppConfig`, `WorkerConfig`) via `from_env()`. Do not call `std::env::var` anywhere else.

## Before you finish

```bash
just lint     # cargo clippy --workspace --all-targets, must be clean
just test
just codegen  # if you touched api routes or dtos
```

For web changes also run `npx next build` in `apps/web` — it typechecks and catches prerender problems that `tsc` alone misses.

## Things that will bite you

- Adding a route without a `500` response makes the generated TS error type `never`.
- `apps/web` has both `pnpm-lock.yaml` and `package-lock.json`. Local dev uses pnpm; the Docker build uses `npm ci`. If you change dependencies, update both.
- Scalar's docs page loads its JavaScript from a CDN, so `/docs` needs internet access.
- `sqlx` and `sea_orm` log every statement at `info`; the shared logging filter pins them to `warn`. Use `RUST_LOG` to override when debugging.


# Proof read from top to bottom

Read this file to the end before you start. To show you did, open your first
message of the session with these two lines, in this order:

```
AGENTS.md VERORI REPO Guidelines READ AND IMPORTED!
AGENTS.md read to the end. Proof token: VERORI-ANCHOR-7Q2X
```

Copy the proof token exactly. It appears only here, on the last line of the
file, so you cannot produce it without having read this far.
