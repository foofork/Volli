# Build stage
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git build-base

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with post-quantum support
RUN go build -o volly-signaling ./cmd/server

# Runtime stage
FROM alpine:latest

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/volly-signaling .

# Copy config
COPY config-sample.yaml /etc/volly-signaling/config.yaml

# Expose ports
EXPOSE 7880 7881 7882

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7880/healthz || exit 1

# Run the server
CMD ["./volly-signaling", "--config", "/etc/volly-signaling/config.yaml"]