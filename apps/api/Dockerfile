FROM rust:1-alpine AS builder
# better-auth pulls webauthn-rs, which needs OpenSSL, so it is linked
# statically here to keep the runtime image on scratch.
RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig
ENV OPENSSL_STATIC=1
WORKDIR /app
COPY . .
RUN cargo build --release -p api

FROM scratch
COPY --from=builder /app/target/release/api /api
EXPOSE 3001
ENTRYPOINT ["/api"]
