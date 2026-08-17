default:
    @just --list

build:
    cargo build --workspace

# Migrations use the api's DATABASE_URL.
migrate:
    set -a && . apps/api/.env && set +a && cargo run -p migration -- up

migrate-fresh:
    set -a && . apps/api/.env && set +a && cargo run -p migration -- fresh

api:
    cargo run -p api

worker:
    cargo run -p worker

web:
    pnpm --dir apps/web dev

# Needs the database: the auth routes come from a live auth instance.
openapi:
    set -a && . apps/api/.env && set +a && cargo run -q -p api --bin export-openapi -- openapi.json

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

# Create the dev admin and user accounts.
seed:
    cargo run -q -p api --bin seed

# Scaffold a module. Interactive: `just new-module`. Direct: `just new-module api invoice`.
new-module *args:
    bun scripts/new-module.ts {{args}}

# Queue tests need a database, so they use the api's DATABASE_URL.
test:
    set -a && . apps/api/.env && set +a && cargo test --workspace

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

# Move dead jobs on a channel back to pending.
queue-redrive channel:
    cargo run -q -p worker --bin queue-admin -- redrive {{channel}}

# Show job counts per status for every channel.
queue-status:
    cargo run -q -p worker --bin queue-admin -- status
