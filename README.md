# VERORI

A monorepo for teams who want a fast Rust backend and a Next.js front end that never drift apart.

I built VERORI to solve three problems at once:

1. **Performance from the backend** — Axum and SeaORM on Rust, so the hot path is compiled and predictable.
2. **A worker system without extra infrastructure** — pub/sub runs on native Postgres `LISTEN`/`NOTIFY`. No Redis, no RabbitMQ, no Kafka to operate.
3. **Type safety across languages** — the Rust OpenAPI document is the single source of truth, and it is generated into TypeScript so the front end cannot call an endpoint that does not exist.

## Why use this instead of rolling your own

- **One source of truth for the API.** Routes are declared once in Rust with `utoipa`. The OpenAPI spec, the Scalar docs page, and the TypeScript types all come from that same declaration. Rename a field in Rust and the Next.js build fails until you fix the caller.
- **A queue you already run.** Jobs live in a Postgres `jobs` table; `NOTIFY` is only a wake-up signal, and a poll interval covers any that are missed. Retries use exponential backoff, exhausted jobs land in a dead letter queue you can redrive, publishes can be deduplicated with an idempotency key, and leases are reclaimed so a job is never stranded when a worker dies. Workers claim rows with `FOR UPDATE SKIP LOCKED`, so you can run as many as you like.
- **Small production images.** The Rust services build to `scratch` with static musl binaries: api ~13 MB (it carries Better Auth, which pulls webauthn and OpenSSL), worker ~6 MB. The Next.js image uses standalone output at ~325 MB.
- **Clean architecture, enforced by shape.** Every module is the same five files: route, controller, service, repository, dto. Business rules never leak into handlers, and SQL never leaks into services.
- **Auth and roles that are already wired.** Better Auth handles sign up, sign in, sessions, password reset and admin user management. Route guards live next to the routes, roles are declared in one file, and the browser never holds a token that JavaScript can read — the session sits in an httpOnly cookie and the server forwards it as a bearer token, so an XSS has nothing to steal.
- **One transaction per service method.** Mark a method `#[tx]` and it, plus every repository call it makes, commits or rolls back together. Serialisation failures and deadlocks are retried. No handles passed around by hand.
- **One CRUD screen, reused everywhere.** `AppCrud` gives every module search, filters, sortable columns, selection, server side pagination with real totals, and create, edit and delete through dialogs. Deletes always confirm first.
- **AI native.** See below.

## Security

No project can claim to be immune to the OWASP Top 10. What this table claims
is narrower and checkable: which risk each category covers, what this repository
does about it, and where the gap is.

| OWASP 2021 | What is in place |
| --- | --- |
| A01 Broken access control | Route guards run before the handler. Roles are declared in one file. A member calling an admin route gets 403, proven by a test. Primary keys are UUIDv7, so a caller cannot walk the table by guessing the next number, and the row count stays private. |
| A02 Cryptographic failures | Passwords and sessions are handled by Better Auth, not by hand. `AUTH_SECRET` must be at least 32 characters or the api refuses to start. The session cookie is httpOnly, so scripts cannot read it. |
| A03 Injection | Every query goes through SeaORM or sqlx with bind parameters. No user input is ever formatted into SQL. A search of `' OR 1=1--` returns zero rows because it is matched as text. |
| A04 Insecure design | Writes run inside one transaction and roll back together. The queue is at-least-once with a retry budget and a dead letter queue rather than silent loss. |
| A05 Security misconfiguration | Security headers on every response: CSP, `nosniff`, `DENY` framing, referrer and permissions policy. Body size limit, request timeout, and a per-address rate limit. HSTS is opt in, since it only makes sense behind TLS. |
| A06 Vulnerable components | `just audit` checks Rust dependencies against the RustSec database and npm dependencies against the npm advisories. |
| A07 Authentication failures | Sign-in, sessions, password reset and admin user management come from Better Auth. Its CSRF middleware validates the request origin. |
| A08 Integrity failures | Both lockfiles are committed. The OpenAPI document and the TypeScript client are generated from the Rust source, so the front end cannot drift from the API. |
| A09 Logging failures | Every request is logged with method, path, status and latency. Server errors are logged in full and answered with a generic message, so a database error never reaches the caller. |
| A10 Server side request forgery | The api makes no outbound requests on behalf of a caller. |

### What this does not do

- **Rate limiting is not DDoS protection.** It refuses a flood from one address
  so the database survives. Absorbing a distributed flood is the job of the
  network in front of this service.
- **Every call from the web app arrives from one address**, so the whole front
  end shares a single rate limit bucket. Size it for your traffic, or key the
  limiter on something else.
- **The web app sets the header family but not a Content Security Policy.** A
  strict policy for a React app needs per request nonces, which is not wired up
  here. The API, which is what serves data, does have one.
- **Nothing here has been penetration tested.** The claims above describe what
  the code does, not a clean bill of health.

## AI native

Coding agents are good at filling in a pattern and bad at inventing one consistently. VERORI leans into that.

- `just new-module` scaffolds a complete, compiling module — for the api, the worker, or the web app — and registers it everywhere it needs to be registered (module tree, dependency injection, router, queue channel enum). The generated module already has its route guards and its transaction boundary in place.
- `AGENTS.md` states the architecture rules in the form an agent reads at the start of a session.
- Because the scaffold already compiles, an agent starts from a working module and edits it, instead of writing five files from scratch and getting the wiring subtly wrong.

- A scaffolded web feature already renders `AppCrud`, so a new screen has a working table before you write a line of it.

The result: the agent spends its budget on your business logic, not on rediscovering where a repository trait goes.

## Stack

| Layer | Choice |
| --- | --- |
| API | Rust, Axum 0.8, SeaORM 2, utoipa 5 |
| Worker | Rust, sqlx `PgListener` |
| Database | PostgreSQL |
| Queue | Postgres `LISTEN`/`NOTIFY` + `jobs` table |
| Auth | Better Auth (Rust), httpOnly cookie plus bearer, RBAC |
| Transactions | `#[transactional]` proc macro over a task-local SeaORM transaction |
| Web | Next.js 16, React 19, Tailwind 4, shadcn |
| Codegen | utoipa → `openapi.json` → `openapi-typescript` → `openapi-fetch` |
| Tests | `cargo test`, Playwright end to end |
| Tasks | `just`, `mprocs`, `cargo watch` |

## Layout

```
apps/
  api/        Axum HTTP API, serves Scalar docs at /docs
  worker/     Postgres LISTEN/NOTIFY consumer
  web/        Next.js app
packages/
  db/             SeaORM entities, migrations, transaction helper
  auth/           Better Auth setup, auth schema, role definitions
  queue/          Typed queue channels, publish/consume helpers
  transactional/  The #[transactional] proc macro
  logging/        Shared tracing setup, shutdown signal
scripts/
  new-module.ts   Module scaffolder
```

## Getting started

You need Rust, pnpm (or Node), `just`, `mprocs`, `cargo-watch`, and a Postgres you can reach.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
just migrate
just dev
```

Each app owns its own `.env`; there is no root one.

`just dev` runs migrations, then opens four panes: api, worker, codegen, web.

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| API docs (Scalar) | http://localhost:3001/docs |
| OpenAPI spec | http://localhost:3001/openapi.json |

Then `just seed` to create the development accounts:

| Account | Credentials | Lands on |
| --- | --- | --- |
| Admin | `admin@verori.com` / `Admin123!` | `/admin` |
| User | `user@verori.com` / `User123!` | `/dashboard` |

Edit a Rust route or DTO and the api restarts, the spec is re-exported, and `apps/web/src/generated/api-types.ts` is rewritten — no manual step.

## Common tasks

```bash
just new-module            # interactive scaffolder
just new-module api order  # or pass arguments directly
just codegen               # regenerate the OpenAPI spec and TypeScript types
just migrate               # apply migrations
just lint                  # cargo clippy across the workspace
just test                  # cargo test across the workspace
just docker-build          # build all three images
just queue-status          # job counts per status, per channel
just queue-redrive <chan>  # move dead jobs back to pending
just seed                  # create the development accounts
just e2e                   # browser tests, web through to the api
```

Run `just` with no arguments to list everything.

## Contributing

VERORI is open source and contributions are welcome.

- Found a bug or have an idea? Open an issue.
- Want to build something? Open an issue first so we can agree on the shape, then send a pull request.
- Keep `just lint` and `just test` green, and follow the patterns in `AGENTS.md`. If you add a module, use `just new-module` so it matches everything else.

## License

MIT. See [LICENSE](LICENSE).
