# Test Concepts Archive

This directory contains test implementations and concepts that were explored but are not part of the current production architecture.

## Contents

### signaling-overlay/

Contains E2E tests for the post-quantum LiveKit overlay approach that was superseded by application-layer encryption.

- `signaling.e2e.ts` - WebSocket handshake tests with ML-KEM-768
- `signaling.test.config.ts` - Vitest configuration
- `test-signaling.sh` - Test runner script

**Status**: Archived. Volly now uses standard LiveKit with client-side PQ encryption.

## Why Keep These?

1. **Documentation**: Shows alternative approaches considered
2. **Learning**: Useful examples of E2E testing patterns
3. **Future Reference**: May inform future protocol work

## Current Testing Approach

See `test/e2e/` for production E2E tests that verify:

- Client-side ML-KEM-768 encryption
- Standard LiveKit integration
- Application-layer security
