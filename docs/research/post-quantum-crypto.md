# Post-Quantum Cryptography Research for Volli

## Executive Summary

For Volli's post-quantum security needs, a **hybrid approach** using **Kyber** (ML-KEM) for key encapsulation with **Dilithium** (ML-DSA) for signatures provides the optimal balance of security, performance, and standardization. The implementation should use **PQClean** via WebAssembly for consistent cross-platform behavior.

## Threat Landscape

### Quantum Computing Timeline
- **2024-2030**: Early quantum computers (100-1000 qubits)
- **2030-2040**: Cryptographically relevant quantum computers
- **Today's Action**: "Harvest now, decrypt later" attacks

### Vulnerable Algorithms in Volli
```typescript
// Current Volli crypto (quantum-vulnerable)
const currentCrypto = {
  keyExchange: "X25519",      // Broken by Shor's algorithm
  signatures: "Ed25519",      // Broken by Shor's algorithm
  symmetric: "XChaCha20",     // Weakened but not broken (Grover's)
  hash: "SHA-256"            // Weakened but not broken (Grover's)
};

// Time to break with quantum computer
const quantumThreat = {
  X25519: "Hours to days",
  Ed25519: "Hours to days", 
  XChaCha20: "Still ~2^128 security (safe)",
  SHA256: "Still ~2^128 security (safe)"
};
```

## Post-Quantum Algorithm Analysis

### 1. NIST Standardized Algorithms (2024)

#### ML-KEM (Kyber) - Key Encapsulation
- **Security Level**: 128, 192, 256-bit quantum security
- **Public Key Size**: 800-1568 bytes
- **Ciphertext Size**: 768-1568 bytes
- **Speed**: ~50μs encap/decap

#### ML-DSA (Dilithium) - Digital Signatures
- **Security Level**: 128, 192, 256-bit quantum security
- **Public Key Size**: 1312-2592 bytes
- **Signature Size**: 2420-4595 bytes
- **Speed**: ~100μs sign, ~50μs verify

#### SLH-DSA (SPHINCS+) - Hash-Based Signatures
- **Security Level**: 128, 192, 256-bit quantum security
- **Public Key Size**: 32-64 bytes (tiny!)
- **Signature Size**: 7856-49856 bytes (huge!)
- **Speed**: ~5ms sign, ~200μs verify

### 2. Library Comparison

#### PQClean
- **Type**: Reference implementations
- **Languages**: C with WASM builds
- **Algorithms**: All NIST standards + candidates
- **Size**: ~100-500KB per algorithm
- **Performance**: Good with WASM optimization

#### liboqs (Open Quantum Safe)
- **Type**: Optimized implementations
- **Languages**: C/C++ with bindings
- **Algorithms**: Comprehensive suite
- **Size**: ~2-5MB full library
- **Performance**: Best native performance

#### CIRCL (Cloudflare)
- **Type**: Go implementations
- **Languages**: Go with WASM support
- **Algorithms**: Kyber, Dilithium, SIDH
- **Size**: ~200KB-1MB depending
- **Performance**: Good Go/WASM performance

#### ntru.js / kyber-crystals
- **Type**: JavaScript implementations
- **Languages**: Pure JavaScript
- **Algorithms**: Limited selection
- **Size**: ~50-200KB
- **Performance**: 10-100x slower than WASM

## Volli-Specific Requirements Analysis

### Critical Constraints

1. **Message Size Budget**
```typescript
// Current Volli message overhead
const currentOverhead = {
  x25519PublicKey: 32,      // bytes
  ed25519Signature: 64,     // bytes
  total: 96                 // bytes per message
};

// Post-quantum overhead
const pqOverhead = {
  kyberCiphertext: 768,     // Kyber512
  dilithiumSignature: 2420, // Dilithium2
  total: 3188              // 33x increase!
};
```

2. **Performance Requirements**
```typescript
// Acceptable latency for messaging
const requirements = {
  keyGeneration: "<1000ms",    // One-time setup
  encryption: "<100ms",        // Per message
  decryption: "<100ms",        // Per message
  signing: "<200ms",          // Optional
  verification: "<100ms"       // Per message
};
```

3. **Bundle Size Impact**
```typescript
// Browser bundle constraints
const bundleBudget = {
  current: 150,           // KB
  target: 200,           // KB  
  available: 50,         // KB for PQ crypto
  perAlgorithm: 25       // KB realistic limit
};
```

## Recommended Implementation Strategy

### Phase 1: Hybrid Classical + PQ (Recommended)

```typescript
// Hybrid approach for gradual migration
interface HybridCrypto {
  // Key exchange: X25519 + Kyber512
  keyExchange: {
    classical: X25519KeyPair,
    postQuantum: KyberKeyPair,
    sharedSecret: SHA256(X25519_secret || Kyber_secret)
  },
  
  // Signatures: Ed25519 + Dilithium2 (optional)
  signatures: {
    classical: Ed25519Signature,
    postQuantum?: DilithiumSignature, // Only for critical messages
  }
}
```

### Implementation Architecture

```typescript
// Modular PQ crypto integration
import { Kyber512 } from '@pqclean/kyber512';
import { Dilithium2 } from '@pqclean/dilithium2';

class VolliPQCrypto {
  private static encoder = new TextEncoder();
  
  // Hybrid key exchange
  async hybridKeyExchange(
    theirX25519: Uint8Array,
    theirKyber: Uint8Array
  ): Promise<Uint8Array> {
    // Classical X25519
    const x25519Secret = await this.x25519.sharedSecret(theirX25519);
    
    // Post-quantum Kyber
    const kyberSecret = await Kyber512.decapsulate(
      this.kyberPrivateKey,
      theirKyber
    );
    
    // Combine secrets
    return await this.kdf(
      concat(x25519Secret, kyberSecret),
      'volli-hybrid-v1'
    );
  }
  
  // Optional PQ signatures for critical messages
  async signCritical(message: Uint8Array): Promise<HybridSignature> {
    const classical = await Ed25519.sign(this.classicalKey, message);
    
    // Only add PQ signature for critical messages
    if (this.isMessageCritical(message)) {
      const postQuantum = await Dilithium2.sign(this.pqKey, message);
      return { classical, postQuantum };
    }
    
    return { classical };
  }
}
```

### Performance Optimization

```typescript
// WASM loading strategy
class PQCryptoLoader {
  private static kyberWASM: WebAssembly.Module | null = null;
  
  // Lazy load PQ crypto only when needed
  static async loadKyber(): Promise<void> {
    if (!this.kyberWASM) {
      const wasmBytes = await fetch('/wasm/kyber512.wasm');
      this.kyberWASM = await WebAssembly.compile(wasmBytes);
    }
  }
  
  // Progressive enhancement
  static async initialize(options: InitOptions) {
    if (options.immediate) {
      // Load immediately for desktop/high-end
      await Promise.all([
        this.loadKyber(),
        this.loadDilithium()
      ]);
    } else {
      // Defer loading for mobile/low-end
      requestIdleCallback(() => this.loadKyber());
    }
  }
}
```

## Library Recommendation: PQClean via WASM

### Why PQClean?

1. **Reference Implementation**: Direct from NIST submissions
2. **Security Focus**: Constant-time, well-audited
3. **Modular**: Load only needed algorithms
4. **WASM Ready**: Consistent cross-platform behavior
5. **Size Efficient**: ~25KB per algorithm when compressed

### Integration Example

```typescript
// Minimal PQClean integration
import Module from '@pqclean/kyber512-wasm';

const kyber = await Module();

// Generate keypair
const keypair = kyber.keypair();

// Encapsulate (sender)
const { ciphertext, sharedSecret } = kyber.encapsulate(publicKey);

// Decapsulate (receiver)  
const sharedSecret = kyber.decapsulate(privateKey, ciphertext);
```

## Migration Timeline

### Phase 1: Foundation (Now)
- Add WASM infrastructure
- Implement hybrid key exchange
- Measure performance impact

### Phase 2: Soft Launch (3 months)
- Enable PQ for new conversations
- Backward compatibility maintained
- Collect performance metrics

### Phase 3: Default PQ (6 months)
- Make hybrid mode default
- PQ signatures for key messages
- Monitor quantum developments

### Phase 4: Full PQ (1-2 years)
- Phase out classical-only mode
- Mandatory PQ for all users
- Prepare for quantum reality

## Size and Performance Projections

```typescript
// Expected impact on Volli
const pqImpact = {
  bundleSize: {
    before: 150,  // KB
    after: 175,   // KB (+25KB for Kyber)
    limit: 200    // KB target
  },
  
  messageSize: {
    before: 96,         // bytes overhead
    hybrid: 864,        // bytes (X25519 + Kyber512)
    savings: "70% vs full PQ"
  },
  
  performance: {
    keyGen: "~100ms",      // Acceptable
    encrypt: "~2ms",       // Excellent
    decrypt: "~2ms",       // Excellent
    impact: "Negligible for users"
  }
};
```

## Security Considerations

### Hybrid Security Theorem
- Security = MAX(Classical, PostQuantum)
- Never weaker than current system
- Protected against both classical and quantum

### Implementation Pitfalls
1. **Random Number Generation**: Use crypto.getRandomValues()
2. **Side Channels**: WASM provides isolation
3. **Key Storage**: Same as classical keys
4. **Algorithm Agility**: Design for easy updates

## Conclusion

The hybrid X25519+Kyber512 approach using PQClean WASM provides Volli with:
- Immediate quantum resistance
- Minimal performance impact
- Reasonable size increase (+25KB)
- Future flexibility

This positions Volli as a forward-thinking secure messenger while maintaining excellent user experience.

## References

1. [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
2. [PQClean Project](https://github.com/PQClean/PQClean)
3. [Chrome's Kyber Hybrid](https://blog.chromium.org/2023/08/protecting-chrome-traffic-with-hybrid.html)
4. [Signal's PQ Extended Triple Diffie-Hellman](https://signal.org/docs/specifications/pqxdh/)
5. [BSI Recommendations for PQ Migration](https://www.bsi.bund.de/EN/Topics/Cryptography/Post-Quantum-Cryptography/post-quantum-cryptography_node.html)