# Volly E2E Testing

## Overview

This directory contains end-to-end tests for Volly's critical infrastructure components, with a focus on validating our post-quantum cryptography integration.

## Test Suites

### 1. Client-Side Post-Quantum Tests (Coming Soon)

Will validate application-layer PQ encryption:

- **WASM Crypto**: ML-KEM-768 key generation and exchange
- **LiveKit Integration**: Standard WebRTC with PQ metadata
- **Message Encryption**: End-to-end PQ security for chat
- **Performance**: Client-side crypto benchmarks

### Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test suite
pnpm vitest run test/e2e/crypto.e2e.ts

# Watch mode for development
pnpm vitest test/e2e --watch
```

### Archived Concepts

The `test/concepts/` directory contains tests for approaches we explored but didn't adopt, including the LiveKit signaling overlay pattern.

## Test Infrastructure

### Docker Services

- **livekit**: Standard LiveKit server for WebRTC
- **redis**: Session storage and caching
- **redis-commander**: Debugging interface (optional)

### Test Configuration

```typescript
// signaling.test.config.ts
{
  testTimeout: 30000,      // 30s for handshake tests
  hookTimeout: 60000,      // 60s for setup/teardown
  pool: 'forks',           // Isolated test processes
  reporters: ['default', 'allure-vitest']
}
```

## Writing New E2E Tests

### Test Structure

```typescript
describe('Feature Name', () => {
  // Setup infrastructure
  beforeAll(async () => {
    await startServices();
  });

  // Teardown
  afterAll(async () => {
    await stopServices();
  });

  test('specific behavior', async () => {
    // Arrange
    const client = await createTestClient();

    // Act
    const result = await client.performAction();

    // Assert
    expect(result).toMatchExpectation();
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always close connections and cleanup
3. **Timeouts**: Set appropriate timeouts for async operations
4. **Logging**: Use console.log for debugging info
5. **Performance**: Test under realistic load conditions

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run E2E Tests
  run: |
    ./scripts/test-signaling.sh

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/
```

### Local Development

```bash
# Run tests before pushing
pnpm test:e2e

# Run specific test file
pnpm vitest run test/e2e/signaling.e2e.ts

# Watch mode for development
pnpm vitest test/e2e --watch
```

## Debugging Failed Tests

### 1. Check Service Logs

```bash
docker-compose -f docker-compose.signaling.yml logs volly-signaling
```

### 2. Enable Debug Mode

```bash
LOG_LEVEL=debug ./scripts/test-signaling.sh debug
```

### 3. Inspect Network Traffic

```bash
# Monitor WebSocket connections
websocat -t ws://localhost:7880
```

### 4. Manual Testing

```bash
# Keep services running
./scripts/test-signaling.sh test true

# Use test client
node test/e2e/manual-client.js
```

## Performance Baselines

| Metric                | Target  | Current    |
| --------------------- | ------- | ---------- |
| PQ Handshake          | < 100ms | ~30ms      |
| Concurrent Clients    | 1000+   | Tested: 50 |
| Memory per Session    | < 1KB   | ~768 bytes |
| Session Creation Rate | 100/sec | Achieved   |

## Future Test Additions

- [ ] WebRTC media flow tests
- [ ] Failover and recovery scenarios
- [ ] Cross-region latency tests
- [ ] Security penetration tests
- [ ] Load balancer integration
