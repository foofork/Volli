# Web App Test Architecture

## Overview

The Volli web app testing architecture follows a layered approach with comprehensive coverage across unit, integration, and end-to-end tests.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         E2E Tests (Playwright)                   │
│  - Complete user flows                                          │
│  - Security scenarios                                           │
│  - Cross-browser testing                                        │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
┌─────────────────────────────────────┴───────────────────────────┐
│                    Integration Tests (Vitest)                    │
│  - Store interactions                                           │
│  - Component + Store tests                                       │
│  - API mocking                                                  │
└─────────────────────┬───────────────────────────┬───────────────┘
                      │                           │
┌─────────────────────┴────────┐ ┌───────────────┴───────────────┐
│    Component Tests (Vitest)   │ │    Store Tests (Vitest)       │
│  - UI components              │ │  - Auth store                 │
│  - User interactions          │ │  - Vault store                │
│  - Accessibility              │ │  - Messages store             │
└───────────────────┬──────────┘ └───────────────┬───────────────┘
                    │                             │
┌───────────────────┴─────────────────────────────┴───────────────┐
│                      Test Infrastructure                         │
│  - Mock crypto APIs                                             │
│  - IndexedDB mocks                                              │
│  - Test data factories                                          │
│  - Custom matchers                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Test Structure

```
apps/web/
├── src/
│   ├── lib/
│   │   ├── stores/
│   │   │   ├── auth.ts
│   │   │   ├── auth.test.ts          # Unit tests
│   │   │   ├── vault.ts
│   │   │   ├── vault.test.ts         # Unit tests
│   │   │   ├── messages.ts
│   │   │   └── messages.test.ts      # Unit tests
│   │   ├── components/
│   │   │   ├── PassphraseInput.svelte
│   │   │   ├── PassphraseInput.test.ts
│   │   │   ├── MessageComposer.svelte
│   │   │   └── MessageComposer.test.ts
│   │   └── utils/
│   │       ├── crypto.ts
│   │       └── crypto.test.ts
│   └── routes/
│       ├── auth/
│       │   ├── +page.svelte
│       │   └── +page.test.ts         # Page component tests
│       └── app/
│           ├── +page.svelte
│           └── +page.test.ts
├── tests/
│   ├── integration/
│   │   ├── auth-flow.test.ts         # Auth integration tests
│   │   ├── messaging.test.ts         # Messaging flow tests
│   │   └── vault-operations.test.ts  # Vault integration tests
│   ├── e2e/
│   │   ├── complete-flow.test.ts     # Full user journey
│   │   ├── security.test.ts          # Security scenarios
│   │   └── offline.test.ts           # Offline functionality
│   └── setup/
│       ├── crypto-mock.ts            # Crypto API mocks
│       ├── db-mock.ts                # IndexedDB mocks
│       └── test-utils.ts             # Test utilities
├── vitest.config.ts                  # Vitest configuration
└── playwright.config.ts              # Playwright configuration
```

## Testing Layers

### 1. Unit Tests
- **Scope**: Individual functions and stores
- **Framework**: Vitest
- **Coverage Target**: >90%
- **Focus Areas**:
  - Store logic and state management
  - Cryptographic operations
  - Data validation
  - Utility functions

### 2. Component Tests
- **Scope**: Svelte components in isolation
- **Framework**: Vitest + @testing-library/svelte
- **Coverage Target**: >85%
- **Focus Areas**:
  - User interactions
  - Props and events
  - Accessibility (a11y)
  - Visual states

### 3. Integration Tests
- **Scope**: Multiple components/stores working together
- **Framework**: Vitest
- **Coverage Target**: >80%
- **Focus Areas**:
  - Store interactions
  - Component + Store integration
  - Navigation flows
  - Error handling

### 4. End-to-End Tests
- **Scope**: Complete user workflows
- **Framework**: Playwright
- **Coverage Target**: Critical paths 100%
- **Focus Areas**:
  - Complete user journeys
  - Cross-browser compatibility
  - Performance metrics
  - Security scenarios

## Key Testing Patterns

### 1. Store Testing Pattern
```typescript
// auth.test.ts
describe('AuthStore', () => {
  let store: AuthStore;
  
  beforeEach(() => {
    store = createAuthStore();
    mockCrypto();
  });

  describe('createIdentity', () => {
    it('should create identity with valid display name', async () => {
      const result = await store.createIdentity('Test User');
      expect(result.identity.displayName).toBe('Test User');
      expect(result.requiresVaultCreation).toBe(true);
    });

    it('should reject invalid display names', async () => {
      await expect(store.createIdentity('ab')).rejects.toThrow('Display name must be 3-30 characters');
    });
  });
});
```

### 2. Component Testing Pattern
```typescript
// PassphraseInput.test.ts
describe('PassphraseInput', () => {
  it('should show strength indicator', async () => {
    const { getByLabelText, getByText } = render(PassphraseInput);
    const input = getByLabelText('Passphrase');
    
    await userEvent.type(input, 'weak');
    expect(getByText('Too weak')).toBeInTheDocument();
    
    await userEvent.clear(input);
    await userEvent.type(input, 'correct-horse-battery-staple');
    expect(getByText('Strong')).toBeInTheDocument();
  });
});
```

### 3. Integration Testing Pattern
```typescript
// auth-flow.test.ts
describe('Authentication Flow', () => {
  it('should complete identity creation and vault setup', async () => {
    const { authStore, vaultStore } = setupStores();
    
    // Create identity
    await authStore.createIdentity('Test User');
    expect(authStore.currentIdentity).toBeDefined();
    
    // Create vault
    await authStore.createVaultWithPassphrase('secure-passphrase-123');
    expect(authStore.isAuthenticated).toBe(true);
    expect(vaultStore.isUnlocked).toBe(true);
  });
});
```

### 4. E2E Testing Pattern
```typescript
// complete-flow.test.ts
test('complete user flow', async ({ page }) => {
  // Create identity
  await page.goto('/auth');
  await page.fill('[name="displayName"]', 'Test User');
  await page.click('button:has-text("Continue")');
  
  // Setup vault
  await page.fill('[name="passphrase"]', 'secure-test-passphrase');
  await page.click('button:has-text("Create Vault")');
  
  // Verify redirect
  await expect(page).toHaveURL('/app');
});
```

## Mock Strategies

### 1. Crypto API Mocks
```typescript
export function mockCrypto() {
  global.crypto = {
    getRandomValues: vi.fn((array) => {
      // Deterministic for tests
      return array.map((_, i) => i);
    }),
    subtle: {
      generateKey: vi.fn().mockResolvedValue({
        publicKey: 'mock-public',
        privateKey: 'mock-private'
      }),
      encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  };
}
```

### 2. IndexedDB Mocks
```typescript
export function mockIndexedDB() {
  const db = new Map();
  
  return {
    open: vi.fn().mockResolvedValue({
      get: (key: string) => db.get(key),
      put: (key: string, value: any) => db.set(key, value),
      delete: (key: string) => db.delete(key)
    })
  };
}
```

## Security Testing

### 1. Passphrase Strength Tests
- Entropy calculation verification
- Common pattern detection
- Dictionary word detection
- Minimum requirements enforcement

### 2. Vault Security Tests
- Encryption/decryption correctness
- Key derivation security
- Failed unlock attempt handling
- Auto-lock functionality

### 3. Session Security Tests
- Token expiration
- Refresh token rotation
- CSRF protection
- XSS prevention

## Performance Testing

### 1. Metrics to Track
- Identity generation time (<100ms)
- Message encryption time (<50ms)
- Vault query time (<20ms)
- UI interaction responsiveness (<16ms)

### 2. Performance Test Example
```typescript
test('vault operations performance', async () => {
  const start = performance.now();
  await vaultStore.unlock('passphrase');
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(100);
});
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

## Test Data Management

### 1. Factories
```typescript
export const factories = {
  identity: (overrides = {}) => ({
    id: 'test-id',
    displayName: 'Test User',
    publicKey: 'mock-public-key',
    createdAt: Date.now(),
    ...overrides
  }),
  
  message: (overrides = {}) => ({
    id: 'msg-id',
    content: 'Test message',
    timestamp: Date.now(),
    ...overrides
  })
};
```

### 2. Fixtures
```typescript
export const fixtures = {
  validPassphrase: 'correct-horse-battery-staple-quantum',
  weakPassphrase: 'password123',
  encryptedVault: { /* pre-encrypted test vault */ }
};
```

## Accessibility Testing

### 1. Component A11y Tests
```typescript
test('passphrase input accessibility', async () => {
  const { container } = render(PassphraseInput);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 2. Keyboard Navigation Tests
```typescript
test('keyboard navigation', async () => {
  const { getByRole } = render(App);
  
  await userEvent.tab();
  expect(getByRole('button', { name: 'Messages' })).toHaveFocus();
  
  await userEvent.keyboard('{Enter}');
  expect(window.location.pathname).toBe('/app/messages');
});
```

## Testing Best Practices

1. **Isolation**: Each test should be independent
2. **Deterministic**: No random values in tests
3. **Fast**: Unit tests < 50ms, integration < 500ms
4. **Descriptive**: Clear test names and assertions
5. **Maintainable**: Use page objects and test utilities
6. **Secure**: Never use real crypto keys in tests