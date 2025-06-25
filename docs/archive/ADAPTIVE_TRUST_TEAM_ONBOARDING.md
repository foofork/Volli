# Adaptive Trust System - Team Onboarding Guide

## Welcome to the Adaptive Trust Implementation Team! 

This guide will help you get started with implementing the Adaptive Trust System for Volli.

## Document Reading Order

### 1. Start Here (30 minutes)
- [ ] Read [Design Summary](./ADAPTIVE_TRUST_DESIGN_SUMMARY.md) - High-level overview
- [ ] Review [Quick Reference Card](./ADAPTIVE_TRUST_QUICK_REFERENCE.md) - Keep this handy!

### 2. Understand the Methodology (30 minutes)
- [ ] Study [TDD Implementation Guide](./ADAPTIVE_TRUST_TDD_GUIDE.md) - **MANDATORY**: All code follows TDD
- [ ] Review [SPARC methodology](../CLAUDE.md) in Volli's docs

### 3. Find Your Task (15 minutes)
- [ ] Open [Implementation Workflow](./ADAPTIVE_TRUST_IMPLEMENTATION_WORKFLOW.md)
- [ ] Choose your terminal/track (1, 2, or 3)
- [ ] Identify your starting tasks

### 4. Deep Dive on Your Component (1-2 hours)
Based on your assigned component, read:

#### If Working on Trust Manager:
- [Architecture - Trust Manager](./ADAPTIVE_TRUST_ARCHITECTURE_DESIGN.md#1-trust-manager)
- [API Contracts - Trust Manager](./ADAPTIVE_TRUST_API_CONTRACTS.md#1-trust-manager-api)
- [Data Flow](./ADAPTIVE_TRUST_DATA_FLOW.md)

#### If Working on Rule Engine:
- [Architecture - Rule Engine](./ADAPTIVE_TRUST_ARCHITECTURE_DESIGN.md#2-rule-engine)
- [API Contracts - Rule Engine](./ADAPTIVE_TRUST_API_CONTRACTS.md#2-rule-engine-api)
- [Rule Conflict Resolution Research](./research/RULE_CONFLICT_RESOLUTION.md)

#### If Working on Context Detection:
- [Architecture - Context Detector](./ADAPTIVE_TRUST_ARCHITECTURE_DESIGN.md#3-context-detector)
- [Network Trust Research](./research/NETWORK_TRUST_CLASSIFICATION.md)
- [Sensitivity Detection Research](./research/CONTENT_SENSITIVITY_DETECTION.md)

#### If Working on Connections:
- [Connection Strategy](./ADAPTIVE_TRUST_CONNECTION_STRATEGY.md) - **IMPORTANT**: Unified approach
- [Battery Efficiency Research](./research/BATTERY_EFFICIENT_P2P_DISCOVERY.md)

#### If Working on UI:
- [Trust Visualization Research](./research/TRUST_VISUALIZATION_UI_PATTERNS.md)
- [Integration Guide - UI](./ADAPTIVE_TRUST_INTEGRATION.md#6-ui-component-integration)

#### If Working on Database:
- [Database Schema](./ADAPTIVE_TRUST_DATABASE_SCHEMA.md)
- [Connection Strategy - DB Section](./ADAPTIVE_TRUST_CONNECTION_STRATEGY.md#database-design)

## Your First Day Checklist

### Morning
- [ ] Set up development environment
- [ ] Clone Volli repository
- [ ] Read assigned documentation
- [ ] Set up test watchers:
  ```bash
  npm run test:watch
  npm run build:watch
  npm run typecheck:watch
  ```

### Afternoon
- [ ] Write your first failing test (RED 🔴)
- [ ] Implement minimal code (GREEN 🟢)
- [ ] Refactor (BLUE 🔵)
- [ ] Commit with message: `feat(trust): implement [component] - RED/GREEN phase`

## Key Commands

```bash
# Create the package (if not exists)
cd packages && mkdir adaptive-trust

# Install dependencies
npm install

# TDD Workflow
npm run test:watch                    # Keep this running!
npm run test -- path/to/test.ts      # Run specific test
npm run test:coverage                 # Check coverage

# SPARC TDD Commands
npx claude-flow sparc tdd "implement trust manager"
npx claude-flow sparc run tdd "write rule engine tests"

# Before committing
npm run test
npm run typecheck
npm run lint
```

## Communication Guidelines

### Daily Standup Format
1. What component are you working on?
2. What TDD cycle are you in? (Red/Green/Refactor)
3. Any blockers or unclear specs?
4. Coverage percentage for your component?

### When You're Stuck
1. Check the [Quick Reference](./ADAPTIVE_TRUST_QUICK_REFERENCE.md)
2. Re-read the relevant design doc section
3. Look for similar patterns in existing Volli code
4. Ask in team channel with:
   - Component you're working on
   - Current test that's failing
   - What you've tried

### Pull Request Format
```
Title: [Trust] Implement [Component] - [TDD Phase]

Description:
- Component: Trust Manager
- Coverage: 85%
- Tests: 24 passing
- Performance: < 10ms decision time

Checklist:
- [ ] Tests written first (TDD)
- [ ] All tests passing
- [ ] Coverage > 80%
- [ ] Performance budgets met
- [ ] Types are strict (no any)
- [ ] Documentation updated
```

## Important Reminders

### 🚨 Non-Negotiables
1. **Write tests FIRST** - No exceptions
2. **User rules are absolute** - They always win
3. **Performance budgets** - < 5% CPU/battery
4. **Privacy first** - No user profiling
5. **Type safety** - No `any` types

### 🎯 Success Metrics
- Tests pass: ✅
- Coverage > 80%: ✅
- Performance < budgets: ✅
- Zero regressions: ✅
- Clear documentation: ✅

## Architecture Principles

1. **Unified Connection Schema**: All connection types (DHT, federated, etc.) use the same database tables
2. **Ephemeral State**: Keep temporary data in memory, not DB
3. **Progressive Enhancement**: Don't break existing Volli functionality
4. **User Sovereignty**: User rules override everything
5. **Local Processing**: Everything happens on-device

## Resources

### Internal Docs
- [All Design Documents](./ADAPTIVE_TRUST_DESIGN_SUMMARY.md#resources)
- [Research Papers](./research/)

### External Resources
- [Vitest Documentation](https://vitest.dev/)
- [Svelte Testing](https://testing.svelte.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Final Words

Remember: We're building a system that gives users control over their privacy without sacrificing convenience. Every line of code should respect user sovereignty while maintaining excellent performance.

**Happy Testing! 🔴🟢🔵**