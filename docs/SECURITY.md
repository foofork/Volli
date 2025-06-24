# 🔐 Volli Security Guide

## Overview

Volli implements defense-in-depth security with post-quantum cryptography, zero-trust architecture, and local-first design. This guide covers our security model, threat analysis, and best practices.

## Security Principles

### 1. Zero Trust Architecture
- **No Plaintext on Servers**: All encryption/decryption happens client-side
- **No Key Material on Servers**: Private keys never leave the device
- **Metadata Minimization**: Servers only see encrypted blobs and content hashes

### 2. Post-Quantum Cryptography
- **Kyber-1024**: NIST-selected KEM for key encapsulation
- **Dilithium-3**: NIST-selected signature algorithm
- **Hybrid Mode**: Combined with X25519/Ed25519 until 2027

### 3. Local-First Security
- **Device as Trust Anchor**: Each device generates its own keys
- **Encrypted at Rest**: SQLite database encrypted with XChaCha20-Poly1305
- **Secure Key Storage**: Platform-specific secure enclaves when available

## Cryptographic Architecture

### Key Hierarchy

```
Root Identity Key (Dilithium-3 + Ed25519)
    │
    ├── Device Keys (per device)
    │   ├── Encryption Key (Kyber-1024 + X25519)
    │   └── Signing Key (Dilithium-3 + Ed25519)
    │
    ├── Session Keys (ephemeral)
    │   ├── Message Encryption (XChaCha20-Poly1305)
    │   └── File Encryption (XChaCha20-Poly1305)
    │
    └── Backup Key (Argon2id derived)
        └── Recovery Encryption (XChaCha20-Poly1305)
```

### Encryption Layers

1. **Message Layer**: End-to-end encryption between contacts
2. **Storage Layer**: Local database encryption
3. **Transport Layer**: TLS 1.3 for network communication
4. **Backup Layer**: Additional encryption for cloud backups

## Threat Model

### In Scope Threats

| Threat | Mitigation |
|--------|------------|
| Server compromise | Zero-trust design, E2E encryption |
| Network eavesdropping | E2E encryption, metadata protection |
| Device theft | Biometric/PIN lock, encrypted storage |
| Quantum computer attacks | Post-quantum algorithms |
| Malicious plugins | Capability-based permissions, WASM sandbox |
| Key compromise | Forward secrecy, key rotation |
| Denial of service | Local-first operation, P2P fallback |

### Out of Scope

- Physical access to unlocked device
- Compromised device OS
- Side-channel attacks on device
- Nation-state targeted attacks

## Security Features

### Authentication

#### Biometric Authentication
- Touch ID / Face ID on iOS
- Fingerprint / Face unlock on Android
- Windows Hello on desktop
- Fallback to PIN/passphrase

#### Multi-Device Pairing
```
1. Existing device generates pairing code (QR + 6-digit PIN)
2. New device scans QR code
3. User confirms PIN on both devices
4. Secure key exchange via Kyber-1024
5. Trust relationship established
```

### Message Security

#### Encryption Protocol
```
1. Generate ephemeral session key via Kyber-1024 KEM
2. Encrypt message with XChaCha20-Poly1305
3. Sign ciphertext with Dilithium-3
4. Add forward secrecy via key rotation
```

#### Metadata Protection
- Message timestamps obfuscated
- Sender/recipient IDs encrypted
- Message size padded to fixed buckets
- Traffic analysis resistance

### File Security

#### File Encryption Protocol
```
1. Validate file size (< 10MB limit)
2. Generate random file encryption key (256-bit)
3. Encrypt file content with XChaCha20-Poly1305
4. Calculate SHA-256 checksum of encrypted content
5. Encrypt file metadata (name, type, tags)
6. Store encrypted blob in vault
```

#### File Sharing Security
```
1. File owner generates encrypted file
2. For each recipient:
   a. Encrypt file key with recipient's public key (Kyber-1024)
   b. Store encrypted key mapping
3. Recipients decrypt file key with private key
4. File content remains encrypted at rest
```

#### Security Features
- **Size Limits**: 10MB per file to prevent DoS
- **Type Validation**: MIME type verification
- **Checksum Verification**: Integrity checking on decrypt
- **Access Control**: Per-contact sharing permissions
- **Secure Deletion**: Cryptographic erasure of file keys
- **Thumbnail Generation**: Client-side only for images

### Plugin Security

#### Capability System
```json
{
  "plugin": "summarizer",
  "capabilities": {
    "vault.read": ["messages"],
    "vault.write": ["summaries"],
    "network": false,
    "compute.memory": "100MB",
    "compute.timeout": "30s"
  }
}
```

#### Enforcement
- Compile-time capability verification
- Runtime permission checks
- Resource quotas
- Audit logging

### Backup Security

#### Encryption
```
1. Generate backup key via Argon2id(passphrase, salt, N=2^17, r=8, p=1)
2. Encrypt vault with XChaCha20-Poly1305
3. Create recovery bundle with versioning
4. Optional: Split key with Shamir's Secret Sharing
```

#### Recovery
- Passphrase required
- Optional hardware token support
- Social recovery (future feature)

## Security Best Practices

### For Users

1. **Strong Passphrase**
   - Use 6+ word passphrase
   - Enable biometric authentication
   - Store recovery phrase securely

2. **Device Security**
   - Keep OS updated
   - Use device lock screen
   - Enable remote wipe

3. **Contact Verification**
   - Verify fingerprints on first contact
   - Use out-of-band verification for high-value contacts
   - Monitor for key changes

4. **Plugin Safety**
   - Only install plugins from trusted sources
   - Review requested permissions
   - Monitor plugin audit logs

### For Developers

1. **Secure Coding**
   - Never log sensitive data
   - Use provided crypto APIs
   - Validate all inputs
   - Handle errors gracefully

2. **Key Management**
   - Use secure random for key generation
   - Implement proper key rotation
   - Zero memory after use
   - Never hardcode secrets

3. **Testing**
   - Run security test suite
   - Perform mutation testing
   - Use static analysis tools
   - Regular dependency updates

## Incident Response

### Vulnerability Disclosure
- Email: security@volli.chat
- PGP Key: [0xDEADBEEF](./security-key.asc)
- Response time: 24-48 hours

### Security Updates
- Automatic security updates enabled by default
- Critical updates forced after 7 days
- Update changelog includes security fixes
- CVE assignment for public vulnerabilities

## Compliance

### Standards
- NIST Post-Quantum Cryptography
- OWASP Mobile Top 10
- WCAG 2.2 AA Accessibility
- GDPR Privacy by Design

### Audits
- Quarterly dependency scanning
- Annual security audit
- Continuous fuzzing
- Bug bounty program (planned)

## Security Roadmap

### Phase 1 (Current)
- ✅ Post-quantum crypto
- ✅ E2E encryption
- ✅ Secure storage
- ✅ Basic plugin security

### Phase 2 (Q2 2024)
- [ ] Hardware security key support
- [ ] Group messaging (MLS)
- [ ] Advanced threat detection
- [ ] Security audit

### Phase 3 (Q3 2024)
- [ ] Zero-knowledge proofs
- [ ] Decentralized identity
- [ ] Homomorphic encryption for search
- [ ] Bug bounty launch

## Appendix

### Cryptographic Parameters

| Algorithm | Parameters | Security Level |
|-----------|------------|----------------|
| Kyber-1024 | n=1024, k=4, q=3329 | 256-bit classical |
| Dilithium-3 | n=256, k=6, l=5 | 192-bit classical |
| XChaCha20-Poly1305 | 256-bit key, 192-bit nonce | 256-bit |
| Argon2id | N=2^17, r=8, p=1 | 128-bit |
| X25519 | 256-bit keys | 128-bit |

### Security Checklist

- [ ] All dependencies updated
- [ ] Security headers configured
- [ ] CSP policy implemented
- [ ] Rate limiting enabled
- [ ] Audit logging active
- [ ] Backup encryption verified
- [ ] Key rotation scheduled
- [ ] Security training completed