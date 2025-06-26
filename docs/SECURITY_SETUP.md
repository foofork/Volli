# Security Setup Guide

This document outlines the security measures implemented in the Volli project to protect against supply chain attacks and dependency vulnerabilities.

## Overview

Our security strategy follows the principle of **Defense in Depth**, implementing multiple layers of security checks at different stages of the development lifecycle.

## 1. Dependency Security

### Automated Checks

#### Daily Security Scans

- **Dependabot**: Monitors all dependencies for known vulnerabilities
- **GitHub Security Advisories**: Automatic alerts for critical issues
- **Scheduled Audits**: Daily vulnerability scans at 2 AM UTC

#### Pull Request Protection

- **Dependency Review Action**: Blocks PRs with vulnerable dependencies
- **License Compliance**: Prevents incompatible licenses (GPL, AGPL, etc.)
- **Lock File Integrity**: Verifies pnpm-lock.yaml hasn't been tampered with

### Manual Controls

```bash
# Check for vulnerabilities locally
pnpm audit

# Check for outdated packages
pnpm outdated

# Verify lock file integrity
pnpm install --frozen-lockfile --verify-integrity

# License compliance check
npx license-checker --production --summary
```

## 2. Code Security

### Static Analysis

- **CodeQL**: Deep semantic code analysis for JavaScript/TypeScript
- **Security queries**: Extended security ruleset enabled
- **Quality checks**: Identifies potential security anti-patterns

### Secret Scanning

- **Gitleaks**: Scans for hardcoded secrets in code and git history
- **TruffleHog**: Verifies secrets and checks for valid credentials
- **Pre-commit hooks**: Prevents secrets from being committed

### Supply Chain Security

- **SBOM Generation**: Software Bill of Materials for each build
- **Trivy Scanning**: Container and filesystem vulnerability scanning
- **OSV Database**: Checks against Google's vulnerability database

## 3. Pre-commit Security

Install pre-commit hooks:

```bash
# Install pre-commit
pip install pre-commit

# Install the git hook scripts
pre-commit install

# Run against all files (initial setup)
pre-commit run --all-files
```

### What Gets Checked

- Secrets detection
- Large file prevention (>1MB)
- Merge conflict markers
- Broken symlinks
- ESLint security rules

## 4. Security Workflows

### Main Security Workflow (`security.yml`)

Runs on every PR and daily:

- Dependency review
- Vulnerability audits
- CodeQL analysis
- SBOM generation
- License compliance

### Secret Scanning (`secrets-scan.yml`)

Runs on every push:

- Gitleaks scanning
- TruffleHog verification
- Historical git scanning

### Dependency Monitoring (`dependency-check.yml`)

Weekly scheduled runs:

- Outdated package detection
- Security advisory aggregation
- Automatic issue creation for critical vulnerabilities
- License compliance reporting

## 5. Security Policies

### Allowed Licenses

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- CC0-1.0
- CC-BY-3.0/4.0
- Unlicense
- Python-2.0

### Denied Licenses

- GPL-3.0
- AGPL-3.0
- LGPL-3.0
- CC-BY-NC-\*

### Vulnerability Thresholds

- **Production**: Fail on MODERATE or higher
- **Development**: Warn on HIGH or higher
- **CI/CD**: Block on MODERATE or higher

## 6. Best Practices

### For Contributors

1. **Never commit secrets**

   ```bash
   # If you accidentally commit a secret
   git reset --hard HEAD~1
   # Contact security team immediately
   ```

2. **Review dependencies before adding**

   ```bash
   # Check package details
   npm view [package-name]

   # Check for known vulnerabilities
   npm audit [package-name]
   ```

3. **Use exact versions in production**

   ```json
   // Prefer exact versions
   "critical-package": "1.2.3"

   // Avoid loose versioning
   "critical-package": "^1.2.3"
   ```

4. **Minimize dependency footprint**
   - Prefer packages with fewer dependencies
   - Audit the dependency tree regularly
   - Remove unused dependencies

### For Maintainers

1. **Review Dependabot PRs carefully**
   - Check changelog for breaking changes
   - Run full test suite
   - Verify no new dependencies added

2. **Monitor security dashboards**
   - GitHub Security tab
   - Workflow run summaries
   - Dependabot alerts

3. **Regular security audits**

   ```bash
   # Full security audit
   npm run security:audit

   # Generate security report
   npm run security:report
   ```

## 7. Incident Response

### If a vulnerability is found:

1. **Assess severity**: Check CVSS score and exploitability
2. **Patch immediately**: For CRITICAL/HIGH vulnerabilities
3. **Test thoroughly**: Ensure patches don't break functionality
4. **Deploy quickly**: Push fixes to all affected environments
5. **Notify users**: If user action is required

### Security Contact

Report security issues to: security@volli.app

## 8. Monitoring and Alerts

### Automated Alerts

- GitHub Security Advisories
- Dependabot alerts
- Workflow failure notifications
- Critical vulnerability issue creation

### Manual Monitoring

- Weekly dependency reports
- Monthly license audits
- Quarterly security reviews

## 9. Future Enhancements

- [ ] SAST (Static Application Security Testing) integration
- [ ] DAST (Dynamic Application Security Testing) for web app
- [ ] Container scanning for Docker images
- [ ] Signed commits enforcement
- [ ] Security scorecard integration
- [ ] Bug bounty program

## 10. Resources

- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
