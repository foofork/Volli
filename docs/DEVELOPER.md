# 🛠️ Volli Developer Guide

## Prerequisites

- Node.js 18+ and npm 9+
- Git
- VS Code (recommended) or your preferred IDE
- iOS/Android development tools (for mobile development)
- Rust (for Tauri desktop development)

## Initial Setup

### 1. Clone the Repository
```bash
git clone https://github.com/volli/volli.git
cd volli
```

### 2. Install Dependencies
```bash
npm install
```

This will install all dependencies for the monorepo and its workspaces.

### 3. Build Packages
```bash
npm run build
```

### 4. Run Tests
```bash
npm run test
```

## Development Workflow

### Running Development Servers

#### Web Application
```bash
npm run dev
# Or specifically:
cd apps/web && npm run dev
```

#### Mobile Development
```bash
# iOS
cd apps/mobile && npm run ios

# Android
cd apps/mobile && npm run android
```

### Project Structure

```
volli/
├── apps/                   # Application packages
│   ├── web/               # SvelteKit web app
│   ├── mobile/            # Capacitor mobile app
│   └── desktop/           # Tauri desktop app
├── packages/              # Core packages
│   ├── identity-core/     # Cryptography and identity
│   ├── vault-core/        # Encrypted storage
│   ├── messaging/         # Message handling
│   ├── sync-ipfs/         # P2P synchronization
│   ├── plugins/           # Plugin runtime
│   └── ui-kit/            # Shared UI components
├── plugins/               # Example plugins
├── docs/                  # Documentation
│   └── adr/              # Architecture decisions
└── tools/                # Build and dev tools
```

### Package Development

Each package follows a consistent structure:

```
packages/[package-name]/
├── src/                   # Source code
│   ├── index.ts          # Main export
│   └── lib/              # Implementation
├── tests/                # Test files
├── package.json          # Package config
├── tsconfig.json         # TypeScript config
└── README.md             # Package docs
```

## Core Packages

### @volli/identity-core

Handles cryptographic operations and identity management.

```typescript
import { generateIdentity, deriveSessionKey } from '@volli/identity-core';

// Generate a new identity
const identity = await generateIdentity();

// Derive a session key
const sessionKey = await deriveSessionKey(identity, recipientPublicKey);
```

### @volli/vault-core

Manages encrypted local storage.

```typescript
import { Vault } from '@volli/vault-core';

// Initialize vault
const vault = await Vault.init({
  passphrase: 'user-passphrase',
  dbPath: './volli.db'
});

// Store a message
await vault.messages.put({
  id: 'msg-1',
  content: 'Hello, World!',
  timestamp: Date.now()
});

// Query messages
const messages = await vault.messages.query({
  threadId: 'thread-1',
  limit: 50
});
```

### @volli/messaging

Message schemas and encryption helpers.

```typescript
import { createMessage, encryptMessage } from '@volli/messaging';

// Create a message
const message = createMessage({
  type: 'chat.message',
  content: 'Hello!',
  threadId: 'thread-1'
});

// Encrypt for recipient
const encrypted = await encryptMessage(message, recipientKey);
```

### @volli/ui-kit

Shared UI components using Svelte and TailwindCSS.

```svelte
<script>
  import { Button, MessageBubble, ThreadList } from '@volli/ui-kit';
</script>

<ThreadList {threads} on:select={handleThreadSelect} />
<MessageBubble {message} position="right" />
<Button variant="primary" on:click={sendMessage}>Send</Button>
```

## Testing

### Unit Tests
```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test -- --filter=@volli/identity-core

# Run tests in watch mode
npm run test -- --watch
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### Security Tests
```bash
# Run security test suite
npm run test:security

# Run mutation tests
npm run test:mutation
```

## Code Quality

### Linting
```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Type Checking
```bash
# Run TypeScript compiler
npm run typecheck
```

### Formatting
```bash
# Check formatting
npm run format:check

# Auto-format code
npm run format
```

## Building for Production

### Web Build
```bash
cd apps/web
npm run build
# Output in apps/web/build/
```

### Mobile Build
```bash
cd apps/mobile

# iOS
npm run build:ios

# Android
npm run build:android
```

### Desktop Build
```bash
cd apps/desktop
npm run build
# Outputs in apps/desktop/src-tauri/target/
```

## Debugging

### VS Code Configuration

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test", "--", "--inspect"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Chrome DevTools

For web debugging:
1. Run `npm run dev`
2. Open Chrome DevTools
3. Use Sources tab for breakpoints
4. Use Network tab for API calls

### React Native Debugger

For mobile debugging:
1. Install React Native Debugger
2. Run `npm run dev:mobile`
3. Shake device or press Cmd+D (iOS) / Cmd+M (Android)
4. Select "Debug JS Remotely"

## Performance Profiling

### Web Performance
```bash
# Generate performance report
npm run perf:web

# Analyze bundle size
npm run analyze:bundle
```

### Memory Profiling
```bash
# Run memory profiler
npm run profile:memory
```

## Contributing

### Commit Convention
We use Conventional Commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build/tooling changes

### Pull Request Process
1. Fork the repository
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push branch (`git push origin feat/amazing-feature`)
5. Open Pull Request

### Code Review Checklist
- [ ] Tests pass
- [ ] Type checks pass
- [ ] Linting passes
- [ ] Security checks pass
- [ ] Documentation updated
- [ ] Performance impact assessed
- [ ] Accessibility verified

## Troubleshooting

### Common Issues

#### Module Resolution
```bash
# Clear module cache
rm -rf node_modules
npm install
```

#### Build Failures
```bash
# Clean build artifacts
npm run clean
npm run build
```

#### Type Errors
```bash
# Regenerate types
npm run typecheck -- --build
```

### Getting Help

- Check [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Search existing [GitHub Issues](https://github.com/volli/volli/issues)
- Ask in Discord (coming soon)
- Email: dev@volli.chat

## Resources

### Documentation
- [Architecture](./ARCHITECTURE.md)
- [Security Guide](./SECURITY.md)
- [API Reference](./API.md)
- [Plugin Development](./PLUGINS.md)

### External Resources
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Tauri Docs](https://tauri.app/docs)
- [IPFS Docs](https://docs.ipfs.io/)
- [Post-Quantum Crypto](https://pq-crystals.org/)