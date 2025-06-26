# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take the security of Volli seriously. If you have discovered a security vulnerability, please follow these steps:

### 1. Do NOT Create a Public Issue

Security vulnerabilities should be reported privately to prevent malicious exploitation.

### 2. Email Security Team

Send details to: [security@volli.app](mailto:security@volli.app)

### 3. Include in Your Report:

- Type of vulnerability
- Full paths of affected source files
- Step-by-step reproduction instructions
- Proof-of-concept or exploit code (if possible)
- Impact assessment
- Suggested fix (if any)

### 4. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

## Security Measures

### Dependencies

- Daily automated security scanning via Dependabot
- CodeQL analysis for code vulnerabilities
- License compliance checking
- Supply chain security via SBOM generation
- Trivy vulnerability scanning
- OSV (Open Source Vulnerabilities) database scanning

### Code Security

- All PRs require security review
- No secrets in code (enforced by pre-commit hooks)
- Cryptographic operations use well-tested libraries
- Post-quantum security considerations in design

### Build Pipeline

- Dependency integrity verification
- Locked dependency versions
- Minimal production dependencies
- Regular security audits

## Security Best Practices for Contributors

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Especially in crypto operations
3. **Use secure defaults** - Fail closed, not open
4. **Keep dependencies minimal** - Less surface area
5. **Update regularly** - Stay current with security patches

## Bug Bounty Program

Currently, we do not offer a bug bounty program, but we deeply appreciate security researchers who disclose vulnerabilities responsibly. We will acknowledge your contribution in our release notes (with your permission).

## Security Advisories

Security advisories will be published via:

1. GitHub Security Advisories
2. Release notes
3. Direct notification to affected users (if contact information is available)

## Encryption & Privacy

Volli uses:

- Post-quantum resistant encryption (when available)
- End-to-end encryption for all messages
- Local-first architecture (your data stays yours)
- No telemetry or tracking
- Zero-knowledge design principles

For more details, see our [Privacy Policy](./PRIVACY.md) and [Technical Architecture](./docs/ARCHITECTURE.md).
