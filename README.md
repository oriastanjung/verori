# VERORI

A monorepo for teams who want a fast Rust backend and a Next.js front end that never drift apart.

I built VERORI to solve three problems at once:

1. **Performance from the backend** — Axum and SeaORM on Rust, so the hot path is compiled and predictable.
2. **A worker system without extra infrastructure** — pub/sub runs on native Postgres `LISTEN`/`NOTIFY`. No Redis, no RabbitMQ, no Kafka to operate.
3. **Type safety across languages** — the Rust OpenAPI document is the single source of truth, and it is generated into TypeScript so the front end cannot call an endpoint that does not exist.

## Why use this instead of rolling your own

- **One source of truth for the API.** Routes are declared once in Rust with `utoipa`. The OpenAPI spec, the Scalar docs page, and the TypeScript types all come from that same declaration. Rename a field in Rust and the Next.js build fails until you fix the caller.
- **A queue you already run.** Jobs live in a Postgres `jobs` table; `NOTIFY` is only a wake-up signal. A missed notification cannot lose a job because the table is the source of truth, and workers claim rows with `FOR UPDATE SKIP LOCKED`.
- **Tiny production images.** The Rust services build to `scratch` with static musl binaries: api ~6 MB, worker ~5 MB. The Next.js image uses standalone output at ~323 MB.
- **Clean architecture, enforced by shape.** Every module is the same five files: route, controller, service, repository, dto. Business rules never leak into handlers, and SQL never leaks into services.
- **AI native.** See below.

## AI native

Coding agents are good at filling in a pattern and bad at inventing one consistently. VERORI leans into that.

- `just new-module` scaffolds a complete, compiling module — for the api, the worker, or the web app — and registers it everywhere it needs to be registered (module tree, dependency injection, router, queue channel enum).
- `AGENTS.md` states the architecture rules in the form an agent reads at the start of a session.
- Because the scaffold already compiles, an agent starts from a working module and edits it, instead of writing five files from scratch and getting the wiring subtly wrong.

The result: the agent spends its budget on your business logic, not on rediscovering where a repository trait goes.

## Stack

| Layer | Choice |
| --- | --- |
| API | Rust, Axum 0.8, SeaORM 2, utoipa 5 |
| Worker | Rust, sqlx `PgListener` |
| Database | PostgreSQL |
| Queue | Postgres `LISTEN`/`NOTIFY` + `jobs` table |
| Web | Next.js 16, React 19, Tailwind 4, shadcn |
| Codegen | utoipa → `openapi.json` → `openapi-typescript` → `openapi-fetch` |
| Tasks | `just`, `mprocs`, `cargo watch` |

## Layout

```
apps/
  api/        Axum HTTP API, serves Scalar docs at /docs
  worker/     Postgres LISTEN/NOTIFY consumer
  web/        Next.js app
packages/
  db/         SeaORM entities + migrations
  queue/      Typed queue channels, publish/consume helpers
  logging/    Shared tracing setup
scripts/
  new-module.ts   Module scaffolder
```

## Getting started

You need Rust, Bun (or Node), `just`, `mprocs`, `cargo-watch`, and a Postgres you can reach.

```bash
cp .env.example .env      # then edit DATABASE_URL
just migrate
just dev
```

`just dev` runs migrations, then opens four panes: api, worker, codegen, web.

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| API docs (Scalar) | http://localhost:3001/docs |
| OpenAPI spec | http://localhost:3001/openapi.json |

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
```

Run `just` with no arguments to list everything.

## Contributing

VERORI is open source and contributions are welcome.

- Found a bug or have an idea? Open an issue.
- Want to build something? Open an issue first so we can agree on the shape, then send a pull request.
- Keep `just lint` and `just test` green, and follow the patterns in `AGENTS.md`. If you add a module, use `just new-module` so it matches everything else.

## License

MIT. See [LICENSE](LICENSE).
