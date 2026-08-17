# AGENTS.md

> Open your first message of the session with
> `AGENTS.md VERORI REPO Guidelines READ AND IMPORTED!`
> then the proof line described at the bottom of this file.

Read this before writing code in VERORI. It describes the patterns this repo already uses; match them rather than inventing new ones.

## What this repo is

A monorepo with three apps and five shared packages:

```
apps/api               Axum HTTP API. Owns the OpenAPI document.
apps/worker            Consumes jobs from Postgres LISTEN/NOTIFY.
apps/web               Next.js 16 app. Consumes generated types from the api.
packages/db            SeaORM entities, migrations and the transaction helper.
                       The only place SQL schema lives.
packages/auth          Better Auth setup, the auth schema and the role table.
packages/queue         Typed queue channels and publish/consume helpers.
packages/transactional The #[transactional] proc macro.
packages/logging       Shared tracing setup and the shutdown signal.
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

## Transactions

A service method that writes should run as one unit of work:

```rust
#[transactional]        // must stay ABOVE #[async_trait]
#[async_trait]
impl OrderService for DefaultOrderService {
    #[tx]
    async fn place(&self, input: PlaceOrderRequest) -> AppResult<OrderResponse> {
        let order = self.repository.create(input).await?;   // same transaction
        self.repository.reserve_stock(order.id).await?;     // same transaction
        Ok(order.into())
    }
}
```

- Commits on `Ok`, rolls back on `Err`, retries a serialisation failure or deadlock.
- Nested calls join the outer transaction instead of opening a second one.
- The service struct needs a `db: DatabaseConnection` field, or name another with `#[transactional(db = "pool")]`.
- Arguments of `#[tx]` methods must be `Clone`, because a retry rebuilds the body. Use `#[transactional(retries = 1)]` when they are not.
- **Repositories must query through `tx::conn(&self.db)`**, never `&self.db` directly. That is what makes a call join the ambient transaction.
- The error type needs `impl db::tx::DatabaseErrorSource` so only transient conflicts are retried. `AppError` and `WorkerError` already have it.

## Authentication and roles

Better Auth owns everything under `/api/auth`; module routes live under `/api`.

- Guards are `require_auth` and `require_admin` in `apps/api/src/shared/auth.rs`, attached with `route_layer` in each module's `route.rs`.
- Each module splits `member_routes()` from `admin_routes()`. Move a route between them to change who may call it.
- `route.rs` also exposes `*_routes_for_docs()` — the same routes without guards, because middleware does not change the OpenAPI document.
- Roles and their permissions live in `packages/auth/src/roles.rs`. That is the only place to change who may do what.
- Handlers that need the signed-in user take `CurrentSession<AppAuthSchema>`.
- `just seed` creates `admin@verori.com` / `Admin123!` and `user@verori.com` / `User123!`. Development only.

## Security

`apps/api/src/shared/security.rs` holds the transport level hardening: headers,
timeout, and the rate limit. The layer order in `lib.rs` matters, because in
axum a layer only wraps routes added **before** it.

- JSON routes get a locked down CSP and `no-store`; the docs page gets its own
  policy, because Scalar loads its bundle from a CDN.
- Never return an internal error to the caller. `AppError` logs the real cause
  and answers 500 with one flat sentence, so a database message cannot describe
  the schema to someone probing it.
- Validate size at the edge of a module: string lengths and list lengths. An
  unbounded field is its own denial of service.
- `tower_governor`'s `per_second(n)` means "one slot every n seconds", not
  "n per second". `security::rate_limit` does the conversion once so no call
  site has to remember.
- The rate limit keys on the peer address, which only exists when the server is
  built with `into_make_service_with_connect_info`.
- **Claims about security go in the README table with their gaps.** Do not write
  that anything is immune to the OWASP Top 10.

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
src/app/(auth)/auth/*      sign in, sign up, forgot and reset password
src/app/(core-app)/        the signed-in app, sidebar group "Main Menu"
src/app/(admin)/admin/*    admin only, groups "Master Data" and "User Management"
src/components/ui/         shadcn components, do not edit by hand except
                           input.tsx, which adds the password eye
src/components/composite/  AppCrud and its parts, shared by every module
src/components/layout/     the signed-in shell and the sidebar
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

### Theme and inputs

- The theme comes from `next-themes` in the root layout, writing `dark` onto
  `<html>`, which is what `globals.css` keys off. `ThemeToggle` sits in the app
  header and on the auth pages.
- **Any `<Input type="password">` gets a show and hide eye on its own.** That
  lives inside `components/ui/input.tsx`, so scaffolded forms get it for free.
  Do not build a separate password field.

### AppCrud

**Every list screen uses `AppCrud`.** Do not hand-roll a table.

It gives you search, filter dropdowns, sortable columns, row selection,
pagination with real totals, and create, edit and delete through dialogs. A
destructive action always goes through an alert dialog, never a bare button.

```tsx
<AppCrud<Order>
  title="Order Management"
  page={page}                    // { items, total, page, per_page, total_pages }
  columns={COLUMNS}              // key, header, sortable, render
  fields={FIELDS}                // the create and edit dialog inputs
  filters={FILTERS}
  labels={{ singular: "order" }}
  actions={{ create, update, remove, bulkRemove, bulkUpdate }}
  renderRowActions={(row) => <SomethingExtra id={row.id} />}
/>
```

- Leave an action out of `actions` and its control disappears from the UI. That
  is how a non-admin screen hides delete.
- `columns` and `renderRowActions` hold functions, so the component that builds
  them must be a **client** component: `features/<name>/components/<name>-crud.tsx`.
  The feature's `index.tsx` stays a server component that fetches and passes only
  data.
- Paging, search and sort live in the url. The server component reads
  `searchParams` and asks the api for that exact page, so a link is shareable and
  the totals are real rather than counted in the browser.
- The api list endpoint therefore returns a page, not an array:
  `{ items, total, page, per_page, total_pages }`.

Rules:

- **A `page.tsx` contains no logic.** It reads `searchParams` and renders the feature's `index.tsx`.
- **Only `services/` calls the API.** Components and actions never call `fetch` or `apiClient` directly.
- **Mutations go through server actions**, and the client side uses `useActionState` so pending and error states are handled uniformly. Actions return `ActionState`, never throw to the client.
- **DTOs derive from generated types**, so a Rust change breaks the build in the right place:
  ```ts
  import type { components } from "@/generated/api-types";
  export type Order = components["schemas"]["OrderResponse"];
  ```
- **Pages that read live data must set `export const dynamic = "force-dynamic"`**, otherwise the production build tries to prerender them and fails when the API is not running.
- Route groups cannot share a path. `(public)` owns `/`, `(auth)` owns `/auth/*`, `(core-app)` owns `/dashboard/*`, `(admin)` owns `/admin/*`.

### Sessions

The browser never holds a token that scripts can read.

- Signing in calls the api server side, then stores the returned token in an
  httpOnly cookie (`verori.session`). Browser JavaScript cannot read it, so an
  XSS cannot steal the session.
- Server side code reads that cookie and forwards it to the api as
  `Authorization: Bearer`. `src/lib/api-client.ts` does this automatically.
- **Auth calls must send an `Origin` header** (`WEB_ORIGIN`). Better Auth
  validates the origin whenever a request carries fetch metadata, which server
  side `fetch` does, and rejects it with 403 otherwise.
- Guards live in the layouts: `(auth)` bounces signed-in users out, `(core-app)`
  requires a session, `(admin)` requires the admin role. Admins land on `/admin`
  and everyone else on `/dashboard`, decided by `homePathFor`.
- Better Auth's OpenAPI document has no schemas, so auth types in
  `src/features/auth/dtos` are written by hand. App routes stay generated.

### End to end tests

`just e2e` runs Playwright from the browser through to the api. It needs an api
on port 3001 and `just seed` beforehand. The tests use the dev server, because
`next start` refuses to serve the `output: "standalone"` build this app produces
for Docker.

**Anything a test creates must be named with `TEST_TITLE_PREFIX`.** The global
teardown signs in as the admin and deletes every example with that prefix, so a
repeated run does not pile up rows. It runs even when a test fails. Job rows are
left alone, because a finished job is history rather than clutter.

## Codegen

`utoipa` (Rust) + the Better Auth spec → `openapi.json` → `openapi-typescript` → `src/generated/api-types.ts`.

The two specs are merged in `apps/api/src/shared/docs.rs`, because Better Auth
generates its own document and there is no library level merge. Auth paths are
prefixed with `/api/auth` and tagged `auth`.

**Codegen needs a reachable database**, since the auth routes come from a live
auth instance.

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
just test     # includes the queue and transaction tests, which need a database
just codegen  # if you touched api routes or dtos
```

For web changes also run, inside `apps/web`:

```bash
npx tsc --noEmit   # types
npx next build     # catches prerender problems tsc alone misses
```

If you touched anything to do with sessions, roles or the example screens, run
the browser tests too: start the api, `just seed`, then `just e2e`.

## Things that will bite you

- Adding a route without a `500` response makes the generated TS error type `never`.
- `apps/web` has both `pnpm-lock.yaml` and `package-lock.json`. Local dev uses pnpm; the Docker build uses `npm ci`. If you change dependencies, update both.
- Scalar's docs page loads its JavaScript from a CDN, so `/docs` needs internet access.
- `sqlx` and `sea_orm` log every statement at `info`; the shared logging filter pins them to `warn`. Use `RUST_LOG` to override when debugging.
- Server side calls to `/api/auth` must carry an `Origin` header. Better Auth validates it as soon as a request has fetch metadata, which `fetch` adds, and answers 403 without it.
- `next start` refuses to serve the `output: "standalone"` build. Use the dev server, or `node .next/standalone/server.js`, which is what the Docker image runs.
- Codegen needs a database, because the auth half of the OpenAPI document comes from a live auth instance.
- The api image is ~13 MB rather than the ~6 MB it used to be. Better Auth pulls webauthn-rs, which needs OpenSSL, and there is no feature flag to drop it.
- Adding a dependency to `apps/web`? Update **both** lockfiles, or the Docker build breaks on `npm ci`.
- The queue tests fail if a worker is running against the same database, because it eats the jobs they just published. Stop the worker before `just test`.
- `valueOf` is taken by `Object`, which is why the crud field callback is called `initialValue`.


# Proof read from top to bottom

Read this file to the end before you start. To show you did, open your first
message of the session with these two lines, in this order:

```
AGENTS.md VERORI REPO Guidelines READ AND IMPORTED!
AGENTS.md read to the end. Proof token: VERORI-ANCHOR-7Q2X
```

Copy the proof token exactly. It appears only here, on the last line of the
file, so you cannot produce it without having read this far.
