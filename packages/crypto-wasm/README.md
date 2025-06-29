# Volly Crypto WASM

High-performance post-quantum cryptography WASM module for Volly.

## Features

- **ML-KEM-768**: NIST-standardized post-quantum key encapsulation
- **High Performance**: Targets <500ms key generation, <100ms encapsulation
- **Small Bundle**: Target 250KB WASM module (down from 983KB JavaScript)
- **WebAssembly**: Native performance in the browser
- **TypeScript**: Full type definitions included

## Performance Targets

Based on the [Updated Implementation Plan](../../UPDATED_IMPLEMENTATION_PLAN.md):

- Bundle size reduction: 983KB → 250KB
- Key generation: <500ms
- Encapsulation: <100ms

## Building

```bash
# Install dependencies
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build the module
./build.sh

# Or manually:
wasm-pack build --target web --out-dir pkg --release
```

## Testing

```bash
# Run performance tests
node tests/performance.test.js

# Run Rust tests
cargo test
```

## Usage

```javascript
import init, { VollyKEM } from '@volli/crypto-wasm';

async function example() {
    // Initialize the WASM module
    await init();
    
    // Generate two keypairs
    const alice = new VollyKEM();
    const bob = new VollyKEM();
    
    // Alice encapsulates a secret for Bob
    const encapsulation = alice.encapsulate(bob.public_key());
    
    // Bob decapsulates to get the same secret
    const aliceSecret = encapsulation.shared_secret();
    const bobSecret = bob.decapsulate(encapsulation.ciphertext());
    
    // Secrets should match
    console.log('Secrets match:', 
        Array.from(aliceSecret).every((v, i) => v === bobSecret[i])
    );
}
```

## API

### `VollyKEM`

- `new VollyKEM()` - Generate fresh keypair
- `VollyKEM.from_seed(seed)` - Generate deterministic keypair from 32-byte seed
- `.public_key()` - Get public key as Uint8Array
- `.secret_key()` - Get secret key as Uint8Array
- `.encapsulate(publicKey)` - Encapsulate secret for given public key
- `.decapsulate(ciphertext)` - Decapsulate secret from ciphertext

### Utility Functions

- `get_version()` - Get module version
- `benchmark_keygen(iterations)` - Benchmark key generation
- `benchmark_encap(iterations, publicKey)` - Benchmark encapsulation

## Security

This module implements ML-KEM-768 (formerly CRYSTALS-KYBER) as standardized by NIST. It provides:

- 128-bit post-quantum security level
- Protection against quantum computer attacks
- Side-channel resistance
- Memory safety through Rust

## Integration

This module replaces the JavaScript CRYSTALS-KYBER implementation in the Volly codebase to achieve better performance and smaller bundle size.