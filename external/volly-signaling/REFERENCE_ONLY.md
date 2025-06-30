# ⚠️ REFERENCE IMPLEMENTATION ONLY

## Status: Archived Concept

This directory contains a conceptual implementation of how to add post-quantum cryptography to LiveKit's signaling layer. It is **NOT used in production**.

## Current Architecture

Volly now uses:

- **Standard LiveKit server** (unmodified)
- **Application-layer PQ encryption** via WASM
- **Client-side ML-KEM-768** for all cryptographic operations

## Why This Exists

This overlay pattern was explored as one approach to adding PQ security. It remains here for:

- Educational reference
- Documentation of the approach
- Potential future protocol work

## What's Here

- `proto/volly/` - Protocol buffer definitions for PQ signaling
- `pkg/volly/auth/` - Enhanced JWT with ML-KEM-768 keys
- `docker/` - Docker build configuration (not used)

## Production Approach

See `packages/messaging/src/post-quantum-encryption.ts` for the actual PQ implementation used in Volly.

The production signaling server runs standard LiveKit without modifications.
