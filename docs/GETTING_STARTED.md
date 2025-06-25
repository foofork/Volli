# Getting Started with Volli

## What is Volli?

Volli is a privacy-focused peer-to-peer messaging application that gives users complete control over their data. It uses WebRTC for direct connections between users, with an optional signaling server for peer discovery.

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/foofork/Volli.git
cd Volli

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

This will start:
- Web application: http://localhost:5173
- Signaling server: http://localhost:8080

### First Time Setup

1. **Create Your Vault**
   - Open the web app
   - Click "Create new vault"
   - Enter a strong password
   - Your local encrypted storage is now ready

2. **Add a Contact**
   - Go to Contacts tab
   - Two options:
     - **Username**: If they're on the same signaling server
     - **Hex ID**: Direct P2P connection code

3. **Start Messaging**
   - Select a contact
   - Type your message
   - Messages are encrypted end-to-end

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Your Device   │     │ Friend's Device │
│                 │     │                 │
│  ┌───────────┐  │     │  ┌───────────┐  │
│  │ Volli App │  │────────│ Volli App │  │
│  └─────┬─────┘  │ P2P │  └─────┬─────┘  │
│        │        │     │        │        │
│  ┌─────▼─────┐  │     │  ┌─────▼─────┐  │
│  │  Vault    │  │     │  │  Vault    │  │
│  │(Encrypted)│  │     │  │(Encrypted)│  │
│  └───────────┘  │     │  └───────────┘  │
└─────────────────┘     └─────────────────┘
         │                       │
         └──────┐       ┌────────┘
                │       │
          ┌─────▼───────▼─────┐
          │ Signaling Server  │
          │   (Optional)      │
          └───────────────────┘
```

## Key Features

### 🔒 Security & Privacy
- **End-to-end encryption**: Only you and your recipient can read messages
- **Local storage encryption**: Your data is encrypted at rest
- **No central servers**: Direct P2P connections when possible
- **Zero knowledge**: Even the signaling server can't read your messages

### 🟣 Connection Modes
- **Direct P2P** (Purple): Highest privacy, no intermediaries
- **Server-Assisted** (Blue): Uses signaling server for discovery
- **"Go Dark" Mode**: Upgrade from server to P2P as trust builds

### 💾 Data Control
- **Local first**: All data stored on your device
- **No cloud dependency**: Works without internet (for local features)
- **Export/Import**: Full control over your data
- **Open source**: Verify the code yourself

## Development

### Project Structure
```
Volli/
├── apps/
│   └── web/          # SvelteKit web application
├── packages/
│   ├── vault-core/   # Encrypted storage
│   ├── messaging/    # Message handling
│   ├── identity-core/# Cryptographic identity
│   ├── signaling-server/ # Peer discovery
│   └── ...
└── docs/            # Documentation
```

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @volli/vault-core test

# Watch mode for TDD
pnpm test:watch
```

### Building for Production
```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @volli/web build
```

## Deployment

### Signaling Server
```bash
cd packages/signaling-server
pnpm build
pnpm start

# Or with PM2
pm2 start dist/server.js --name volli-signaling
```

### Web Application
```bash
cd apps/web
pnpm build
# Deploy the 'build' directory to your static host
```

## Common Tasks

### Clear Local Data
Open browser console and run:
```javascript
await window.clearAllData()
```

### Export Vault
```javascript
const backup = await vault.export()
// Save backup securely
```

### Enable Debug Logging
```javascript
localStorage.setItem('debug', 'volli:*')
```

## Troubleshooting

### Connection Issues
1. Check if signaling server is running
2. Verify firewall allows WebRTC
3. Try server-assisted mode first

### Build Errors
1. Clear node_modules: `pnpm clean`
2. Reinstall: `pnpm install`
3. Check Node.js version (18+)

### Test Failures
1. Update test snapshots: `pnpm test -- -u`
2. Check for mock issues in web app tests
3. Run tests in isolation

## Contributing

See [CONTRIBUTING_WORKFLOW.md](./CONTRIBUTING_WORKFLOW.md) for detailed guidelines.

Quick tips:
- Use SPARC methodology for development
- Write tests first (TDD)
- Keep PRs focused and small
- Update documentation with code

## Getting Help

- **Documentation**: Check `/docs` directory
- **Issues**: [GitHub Issues](https://github.com/foofork/Volli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/foofork/Volli/discussions)

## Next Steps

1. Try the [MVP Testing Guide](./CURRENT_TASKS.md#mvp-testing-tasks)
2. Explore the [Architecture](./ARCHITECTURE.md)
3. Learn about [Adaptive Trust](./adaptive-trust/ADAPTIVE_TRUST_CONNECTION_MODES.md)
4. Check [Current Tasks](./CURRENT_TASKS.md) to contribute