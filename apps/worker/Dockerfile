FROM rust:1-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY . .
RUN cargo build --release -p worker

FROM scratch
COPY --from=builder /app/target/release/worker /worker
ENTRYPOINT ["/worker"]
