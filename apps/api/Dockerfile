FROM rust:1-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY . .
RUN cargo build --release -p api

FROM scratch
COPY --from=builder /app/target/release/api /api
EXPOSE 3000
ENTRYPOINT ["/api"]
