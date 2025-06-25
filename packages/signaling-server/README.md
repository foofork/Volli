# Volli Signaling Server

A minimal WebSocket signaling server for WebRTC peer discovery and connection establishment.

## Features

- User registration with public keys
- Online presence tracking
- User discovery
- WebRTC offer/answer relay
- Automatic cleanup on disconnect

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Run tests
npm run test

# Start development server
npm run dev
```

### Production

```bash
# Build
npm run build

# Start server
PORT=8080 npm start
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `HOST` - Server host (default: 0.0.0.0)

## API Protocol

### 1. Register
```json
{
  "type": "register",
  "userId": "alice@volli.app",
  "publicKey": "base64-encoded-public-key"
}
```

### 2. Discover User
```json
{
  "type": "discover",
  "userId": "bob@volli.app"
}
```

Response:
```json
{
  "type": "discover-response",
  "userId": "bob@volli.app",
  "online": true,
  "publicKey": "base64-encoded-public-key"
}
```

### 3. Send Offer
```json
{
  "type": "offer",
  "from": "alice@volli.app",
  "to": "bob@volli.app",
  "offer": {
    "type": "offer",
    "sdp": "..."
  }
}
```

### 4. Send Answer
```json
{
  "type": "answer",
  "from": "bob@volli.app",
  "to": "alice@volli.app",
  "answer": {
    "type": "answer",
    "sdp": "..."
  }
}
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.js"]
```

### PM2

```bash
pm2 start dist/server.js --name volli-signaling
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
location /signaling {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Security Considerations

1. **TLS Required**: Always use wss:// in production
2. **Rate Limiting**: Implement rate limiting for production
3. **Authentication**: Public key signatures can be added for enhanced security
4. **DDoS Protection**: Use CloudFlare or similar service

## Monitoring

The server logs online user count every minute. For production monitoring:

1. Export metrics to Prometheus
2. Use health check endpoint
3. Monitor WebSocket connections
4. Track message throughput

## Next Steps

1. Add ICE candidate relay support
2. Implement persistence with Redis
3. Add horizontal scaling with Redis pub/sub
4. Create health check endpoint
5. Add metrics collection