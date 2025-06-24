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

## Web App Stores API

The web app uses Svelte stores for state management. These stores provide reactive state management with built-in encryption and persistence.

### Auth Store

Manages authentication and vault lifecycle.

```typescript
import { auth } from '$lib/stores/auth';

// Create new identity with vault
await auth.createIdentity('my-secure-passphrase');

// Unlock existing vault
await auth.unlockVault('my-secure-passphrase');

// Lock vault
auth.lockVault();

// Subscribe to auth state
$: isAuthenticated = $auth.isAuthenticated;
$: isLocked = $auth.isLocked;
```

### Vault Store

Handles encrypted data storage for contacts, messages, files, and settings.

```typescript
import { vault } from '$lib/stores/vault';

// Subscribe to vault data
$: contacts = $vault.contacts;
$: messages = $vault.messages;
$: files = $vault.files;

// Methods are accessed through the store directly
await vault.addContact({
  name: 'Alice',
  publicKey: 'base64-public-key'
});

await vault.saveMessage({
  content: 'Hello!',
  contactId: 'contact-123',
  direction: 'outgoing'
});
```

### Contacts Store

Manages contact relationships and verification.

```typescript
import { contacts } from '$lib/stores/contacts';

// Add a new contact
await contacts.addContact({
  name: 'Bob',
  publicKey: 'base64-public-key'
});

// Verify a contact
await contacts.verifyContact('contact-id');

// Search contacts
const results = contacts.searchContacts('search-term');

// Subscribe to contacts state
$: contactList = $contacts.contacts;
$: verifiedCount = $contacts.verifiedContacts;
```

### Files Store

Handles encrypted file storage and sharing.

```typescript
import { files } from '$lib/stores/files';

// Upload a file (max 10MB)
await files.uploadFile(file, {
  encrypt: true,
  tags: ['documents', 'important']
});

// Share file with contacts
await files.shareFile('file-id', ['contact-id-1', 'contact-id-2']);

// Download file
const decryptedFile = await files.downloadFile('file-id');

// Subscribe to file operations
$: uploadProgress = $files.uploadProgress;
$: fileList = $files.files;
$: sharedFiles = $files.sharedFiles;
```

### Messages Store

Manages conversations and message encryption.

```typescript
import { messages } from '$lib/stores/messages';

// Send a message
await messages.sendMessage('contact-id', 'Hello, encrypted world!');

// Load conversation
await messages.loadConversation('contact-id');

// Search messages
const results = await messages.searchMessages('search-term');

// Subscribe to message state
$: conversations = $messages.conversations;
$: activeConversation = $messages.activeConversation;
$: unreadCount = $messages.unreadCount;
```

## Testing

The project maintains 98.9% test coverage across all core stores and components.

### Unit Tests
```bash
# Run all tests
npm run test

# Run tests with coverage report
npm run test:coverage

# Run tests for specific package
npm run test -- --filter=@volli/identity-core

# Run tests in watch mode
npm run test -- --watch

# Run web app tests specifically
cd apps/web && npm run test
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

## Code Organization & Modularity

### File Size Limits

To maintain a modular and performant codebase, we enforce strict file size limits:

| File Type | Max Lines | Ideal Lines | Notes |
|-----------|-----------|-------------|-------|
| Components | 500 | 100-300 | Split large components |
| Services | 500 | 200-400 | Use composition |
| Stores | 300 | 100-200 | Keep state minimal |
| Utils | 200 | 50-150 | Single responsibility |
| Tests | 500 | 100-400 | Mirror source structure |

### Module Structure

```
src/
├── lib/
│   ├── services/         # Business logic layer
│   │   ├── crypto/       # Crypto operations (split by algorithm)
│   │   ├── storage/      # Storage adapters
│   │   └── network/      # Network protocols
│   ├── stores/           # State management
│   │   ├── auth.ts       # < 200 lines
│   │   ├── vault.ts      # < 300 lines
│   │   └── index.ts      # Barrel exports only
│   ├── components/       # UI components
│   │   ├── atoms/        # Basic components (< 100 lines)
│   │   ├── molecules/    # Composite components (< 200 lines)
│   │   └── organisms/    # Complex components (< 300 lines)
│   └── utils/            # Pure functions only
├── routes/               # Route handlers (< 100 lines)
└── tests/                # Test files
```

### Enforcing Modularity

Add to your `eslint.config.js`:
```javascript
{
  rules: {
    'max-lines': ['error', {
      max: 500,
      skipBlankLines: true,
      skipComments: true
    }],
    'max-lines-per-function': ['error', {
      max: 50,
      skipBlankLines: true,
      skipComments: true
    }],
    'complexity': ['error', 10],
    'max-depth': ['error', 3],
    'max-nested-callbacks': ['error', 3]
  }
}
```

## Performance Standards

### Performance Budgets

All operations must meet these performance targets:

| Operation | Target | Maximum | Measurement |
|-----------|--------|---------|-------------|
| Page Load | < 2s | 3s | Lighthouse |
| First Paint | < 1s | 1.5s | Web Vitals |
| API Response | < 100ms | 200ms | Server timing |
| Crypto Op | < 50ms | 100ms | Performance API |
| DB Query | < 20ms | 50ms | Query profiler |
| Bundle Size | < 100KB | 200KB | Webpack analyzer |

### Performance Monitoring

#### Client-Side Performance
```typescript
// Use the Performance Monitor utility
import { perfMon } from '$lib/utils/performance';

// Measure operations
const timer = perfMon.startTimer('crypto.encrypt');
const encrypted = await encrypt(data);
perfMon.endTimer(timer);

// Track metrics
perfMon.recordMetric('bundle.size', bundleSize);
perfMon.recordMetric('memory.heap', performance.memory.usedJSHeapSize);

// Generate reports
const report = perfMon.generateReport();
console.table(report.operations);
```

#### Automated Performance Testing
```bash
# Run performance benchmarks
npm run perf:benchmark

# CI/CD integration
npm run perf:ci -- --fail-on-regression
```

### Bundle Optimization

#### Code Splitting Strategy
```typescript
// Route-based splitting
const ContactsPage = lazy(() => import('./routes/contacts'));
const FilesPage = lazy(() => import('./routes/files'));

// Feature-based splitting
const CryptoWorker = lazy(() => import('./workers/crypto'));
const SyncEngine = lazy(() => import('./services/sync'));
```

#### Tree Shaking Checklist
- [ ] Use ES6 imports/exports
- [ ] Mark packages as `sideEffects: false`
- [ ] Avoid namespace imports (`import * as`)
- [ ] Use production builds of dependencies
- [ ] Enable module concatenation

### Memory Management

#### Prevent Memory Leaks
```typescript
// ❌ Bad: Listener not cleaned up
onMount(() => {
  window.addEventListener('resize', handleResize);
});

// ✅ Good: Proper cleanup
onMount(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
});

// ❌ Bad: Large object references
let cache = new Map();
function addToCache(key, value) {
  cache.set(key, value); // Grows indefinitely
}

// ✅ Good: Bounded cache with WeakMap
const cache = new WeakMap();
const cacheSize = new Map();
const MAX_CACHE = 100;

function addToCache(key, value) {
  if (cacheSize.size >= MAX_CACHE) {
    const firstKey = cacheSize.keys().next().value;
    cacheSize.delete(firstKey);
    cache.delete(firstKey);
  }
  cache.set(key, value);
  cacheSize.set(key, Date.now());
}
```

#### Memory Profiling
```bash
# Profile memory usage
npm run profile:memory

# Analyze heap snapshots
npm run profile:heap
```

## Security Best Practices

### Input Validation

Always validate and sanitize user input:

```typescript
// ❌ Bad: Direct use of user input
const message = userInput;
vault.store(message);

// ✅ Good: Validate and sanitize
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().max(10000).trim(),
  attachments: z.array(z.string().url()).max(10).optional()
});

const validated = messageSchema.parse(userInput);
vault.store(validated);
```

### Secure Coding Guidelines

1. **Never log sensitive data**
   ```typescript
   // ❌ Bad
   console.log('User password:', password);
   
   // ✅ Good
   console.log('User authenticated:', !!password);
   ```

2. **Use crypto.getRandomValues() for randomness**
   ```typescript
   // ❌ Bad
   const id = Math.random().toString(36);
   
   // ✅ Good
   const array = new Uint8Array(16);
   crypto.getRandomValues(array);
   const id = Array.from(array, b => b.toString(16)).join('');
   ```

3. **Constant-time comparisons for secrets**
   ```typescript
   // ❌ Bad
   if (token === storedToken) { }
   
   // ✅ Good
   import { timingSafeEqual } from 'crypto';
   if (timingSafeEqual(Buffer.from(token), Buffer.from(storedToken))) { }
   ```

### Dependency Security

```bash
# Regular security audits
npm audit
npm audit fix

# Check for known vulnerabilities
npx snyk test

# Update dependencies safely
npx npm-check-updates -u
npm test
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