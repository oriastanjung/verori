set dotenv-load := true

default:
    @just --list

build:
    cargo build --workspace

migrate:
    cargo run -p migration -- up

migrate-fresh:
    cargo run -p migration -- fresh

api:
    cargo run -p api

worker:
    cargo run -p worker

# PORT in .env belongs to the api, so the web port is pinned here.
web:
    PORT=3000 pnpm --dir apps/web dev

openapi:
    cargo run -q -p api --bin export-openapi -- openapi.json

codegen: openapi
    pnpm --dir apps/web exec openapi-typescript ../../openapi.json -o src/generated/api-types.ts

# Restart the api on every rust change.
watch-api:
    cargo watch -w apps/api -w packages -x 'run -p api'

# Restart the worker on every rust change.
watch-worker:
    cargo watch -w apps/worker -w packages -x 'run -p worker'

# Regenerate the typescript types whenever the api routes or dtos change.
watch-codegen:
    cargo watch -w apps/api/src/modules -w apps/api/src/shared -s 'just codegen'

# Scaffold a module. Interactive: `just new-module`. Direct: `just new-module api invoice`.
new-module *args:
    bun scripts/new-module.ts {{args}}

test:
    cargo test --workspace

fmt:
    cargo fmt --all

lint:
    cargo clippy --workspace --all-targets

dev: migrate
    mprocs

docker-build:
    docker compose build

docker-up:
    docker compose up -d

docker-down:
    docker compose down

docker-logs:
    docker compose logs -f
