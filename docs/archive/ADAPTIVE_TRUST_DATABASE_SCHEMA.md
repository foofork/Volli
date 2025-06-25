# Adaptive Trust System - Database Schema Design

## Overview

This document defines the database schema for the Adaptive Trust System, designed to integrate with Volli's existing Dexie/IndexedDB infrastructure while maintaining data integrity, performance, and privacy.

**Key Design Pattern**: We use a unified schema approach where all connection strategies (DHT, federated, mDNS, etc.) share the same tables, with strategy-specific details stored in flexible metadata fields. See [Connection Strategy](./ADAPTIVE_TRUST_CONNECTION_STRATEGY.md) for details.

## Schema Design Principles

1. **Privacy First**: No persistent user profiling data
2. **Performance**: Optimized indexes for common queries
3. **Flexibility**: JSON fields for extensible conditions/actions
4. **Audit Trail**: Track decisions and changes for transparency
5. **Data Minimization**: Only store what's necessary

## Database Tables

### 1. Trust Rules Table

Stores user-defined rules for trust decisions.

```sql
-- SQL representation for clarity
CREATE TABLE trust_rules (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  condition       JSON NOT NULL,      -- Rule condition tree
  action          JSON NOT NULL,      -- Action to take
  priority        INTEGER DEFAULT 0,   -- Higher = higher priority
  enabled         BOOLEAN DEFAULT true,
  mandatory       BOOLEAN DEFAULT false, -- Cannot be overridden
  tags            JSON DEFAULT '[]',    -- Array of tags
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by      TEXT,               -- Device/session ID
  
  -- Indexes for performance
  INDEX idx_rules_enabled (enabled),
  INDEX idx_rules_priority (priority DESC),
  INDEX idx_rules_tags (tags)
);
```

#### Dexie Implementation
```typescript
// packages/adaptive-trust/src/db/schema.ts
export const trustRulesSchema = {
  trust_rules: '++id, name, priority, enabled, *tags, [enabled+priority]'
};

// Type definition
export interface TrustRule {
  id?: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
  mandatory: boolean;
  tags: string[];
  created_at: Date;
  modified_at: Date;
  created_by?: string;
}
```

#### Example Data
```json
{
  "id": "rule_1234",
  "name": "Public WiFi Protection",
  "description": "Use private mode on untrusted networks",
  "condition": {
    "type": "network",
    "networkTrust": "public"
  },
  "action": {
    "mode": "private",
    "notify": true,
    "reason": "Public network detected"
  },
  "priority": 100,
  "enabled": true,
  "mandatory": true,
  "tags": ["network", "privacy", "auto"],
  "created_at": "2024-01-15T10:30:00Z",
  "modified_at": "2024-01-15T10:30:00Z"
}
```

### 2. Trust Decisions Table

Records all trust decisions made by the system for auditing.

```sql
CREATE TABLE trust_decisions (
  id              TEXT PRIMARY KEY,
  peer_id         TEXT,               -- Who connection was with
  mode            TEXT NOT NULL,      -- Trust mode used
  source          TEXT NOT NULL,      -- Decision source
  confidence      REAL,               -- 0-1 confidence score
  context_hash    TEXT,               -- Hash of context for privacy
  rule_id         TEXT,               -- If triggered by rule
  reasoning       JSON,               -- Array of reasons
  timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at      TIMESTAMP,          -- When to re-evaluate
  
  -- Indexes
  INDEX idx_decisions_peer (peer_id, timestamp DESC),
  INDEX idx_decisions_timestamp (timestamp DESC),
  INDEX idx_decisions_mode (mode),
  FOREIGN KEY (rule_id) REFERENCES trust_rules(id)
);
```

#### Dexie Implementation
```typescript
export const trustDecisionsSchema = {
  trust_decisions: '++id, peer_id, timestamp, mode, [peer_id+timestamp]'
};

export interface TrustDecision {
  id?: string;
  peer_id?: string;
  mode: TrustMode;
  source: DecisionSource;
  confidence: number;
  context_hash: string;
  rule_id?: string;
  reasoning: string[];
  timestamp: Date;
  expires_at?: Date;
}
```

### 3. Network Profiles Table

Stores network fingerprints and trust classifications.

```sql
CREATE TABLE network_profiles (
  fingerprint     TEXT PRIMARY KEY,    -- Network identifier
  ssid            TEXT,                -- Network name (encrypted)
  bssid_hash      TEXT,                -- Hashed BSSID
  trust_level     TEXT NOT NULL,       -- trusted/public/hostile/unknown
  security_type   TEXT,                -- WPA2/WPA3/Open
  last_seen       TIMESTAMP,
  first_seen      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_classified BOOLEAN DEFAULT false,
  auto_connect    BOOLEAN DEFAULT true,
  metadata        JSON,                -- Additional properties
  
  -- Indexes
  INDEX idx_network_trust (trust_level),
  INDEX idx_network_seen (last_seen DESC)
);
```

#### Dexie Implementation
```typescript
export const networkProfilesSchema = {
  network_profiles: 'fingerprint, trust_level, last_seen, [trust_level+last_seen]'
};

export interface NetworkProfile {
  fingerprint: string;
  ssid?: string;
  bssid_hash?: string;
  trust_level: NetworkTrustLevel;
  security_type?: string;
  last_seen: Date;
  first_seen: Date;
  user_classified: boolean;
  auto_connect: boolean;
  metadata?: Record<string, any>;
}
```

### 4. Context Cache Table

Temporary cache for context detection results.

```sql
CREATE TABLE context_cache (
  id              TEXT PRIMARY KEY,
  context_hash    TEXT UNIQUE,
  network         JSON NOT NULL,
  device          JSON NOT NULL,
  behavior        JSON NOT NULL,
  temporal        JSON NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at      TIMESTAMP NOT NULL,
  
  -- Auto-cleanup of expired entries
  INDEX idx_context_expires (expires_at)
);
```

#### Dexie Implementation
```typescript
export const contextCacheSchema = {
  context_cache: 'id, context_hash, expires_at'
};

export interface ContextCache {
  id: string;
  context_hash: string;
  network: NetworkContext;
  device: DeviceContext;
  behavior: BehaviorContext;
  temporal: TemporalContext;
  created_at: Date;
  expires_at: Date;
}
```

### 5. Rule Conflicts Table

Stores detected conflicts between rules for user resolution.

```sql
CREATE TABLE rule_conflicts (
  id              TEXT PRIMARY KEY,
  rule1_id        TEXT NOT NULL,
  rule2_id        TEXT NOT NULL,
  conflict_type   TEXT NOT NULL,       -- overlap/contradiction
  overlap_condition JSON,              -- Where rules overlap
  severity        TEXT,                -- low/medium/high
  resolution      JSON,                -- User's resolution choice
  resolved        BOOLEAN DEFAULT false,
  detected_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at     TIMESTAMP,
  
  -- Indexes
  INDEX idx_conflicts_resolved (resolved),
  INDEX idx_conflicts_rules (rule1_id, rule2_id),
  FOREIGN KEY (rule1_id) REFERENCES trust_rules(id),
  FOREIGN KEY (rule2_id) REFERENCES trust_rules(id)
);
```

#### Dexie Implementation
```typescript
export const ruleConflictsSchema = {
  rule_conflicts: '++id, [rule1_id+rule2_id], resolved'
};

export interface RuleConflict {
  id?: string;
  rule1_id: string;
  rule2_id: string;
  conflict_type: 'overlap' | 'contradiction';
  overlap_condition?: RuleCondition;
  severity: 'low' | 'medium' | 'high';
  resolution?: ConflictResolution;
  resolved: boolean;
  detected_at: Date;
  resolved_at?: Date;
}
```

### 6. Trust Events Table

Event log for trust system activities.

```sql
CREATE TABLE trust_events (
  id              TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,       -- mode_changed/rule_triggered/etc
  peer_id         TEXT,
  mode            TEXT,
  source          TEXT,
  metadata        JSON,                -- Event-specific data
  timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id      TEXT,                -- Group by session
  
  -- Indexes
  INDEX idx_events_type (event_type, timestamp DESC),
  INDEX idx_events_peer (peer_id, timestamp DESC),
  INDEX idx_events_session (session_id, timestamp)
);
```

#### Dexie Implementation
```typescript
export const trustEventsSchema = {
  trust_events: '++id, [event_type+timestamp], [peer_id+timestamp], session_id'
};

export interface TrustEvent {
  id?: string;
  event_type: string;
  peer_id?: string;
  mode?: TrustMode;
  source?: DecisionSource;
  metadata?: Record<string, any>;
  timestamp: Date;
  session_id: string;
}
```

### 7. Learning Patterns Table (Session Only)

Ephemeral patterns for privacy-preserving learning.

```sql
-- This table is cleared on session end
CREATE TABLE learning_patterns (
  id              TEXT PRIMARY KEY,
  pattern_hash    TEXT,                -- Hashed pattern
  frequency       INTEGER DEFAULT 1,
  last_seen       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id      TEXT NOT NULL,
  expires_at      TIMESTAMP NOT NULL,  -- Auto-expire
  
  -- Indexes
  INDEX idx_patterns_session (session_id),
  INDEX idx_patterns_expires (expires_at)
);
```

#### Dexie Implementation
```typescript
export const learningPatternsSchema = {
  learning_patterns: '++id, pattern_hash, session_id, expires_at'
};

export interface LearningPattern {
  id?: string;
  pattern_hash: string;
  frequency: number;
  last_seen: Date;
  session_id: string;
  expires_at: Date;
}
```

## Complete Dexie Schema Definition

```typescript
// packages/adaptive-trust/src/db/trust-database.ts

import Dexie, { Table } from 'dexie';

export class TrustDatabase extends Dexie {
  // Tables
  trust_rules!: Table<TrustRule>;
  trust_decisions!: Table<TrustDecision>;
  network_profiles!: Table<NetworkProfile>;
  context_cache!: Table<ContextCache>;
  rule_conflicts!: Table<RuleConflict>;
  trust_events!: Table<TrustEvent>;
  learning_patterns!: Table<LearningPattern>;
  
  constructor() {
    super('VolliTrustDB');
    
    this.version(1).stores({
      trust_rules: '++id, name, priority, enabled, *tags, [enabled+priority]',
      trust_decisions: '++id, peer_id, timestamp, mode, [peer_id+timestamp]',
      network_profiles: 'fingerprint, trust_level, last_seen, [trust_level+last_seen]',
      context_cache: 'id, context_hash, expires_at',
      rule_conflicts: '++id, [rule1_id+rule2_id], resolved',
      trust_events: '++id, [event_type+timestamp], [peer_id+timestamp], session_id',
      learning_patterns: '++id, pattern_hash, session_id, expires_at'
    });
    
    // Hooks for data integrity
    this.trust_rules.hook('creating', (primKey, obj) => {
      obj.created_at = new Date();
      obj.modified_at = new Date();
    });
    
    this.trust_rules.hook('updating', (modifications, primKey, obj) => {
      modifications.modified_at = new Date();
    });
    
    // Auto-cleanup expired data
    this.on('ready', () => {
      this.cleanupExpiredData();
      setInterval(() => this.cleanupExpiredData(), 60000); // Every minute
    });
  }
  
  async cleanupExpiredData() {
    const now = new Date();
    
    // Clean expired context cache
    await this.context_cache
      .where('expires_at')
      .below(now)
      .delete();
    
    // Clean expired learning patterns
    await this.learning_patterns
      .where('expires_at')
      .below(now)
      .delete();
  }
}

// Export singleton instance
export const trustDB = new TrustDatabase();
```

## Data Access Patterns

### Common Queries

```typescript
// Get enabled rules sorted by priority
async function getActiveRules(): Promise<TrustRule[]> {
  return trustDB.trust_rules
    .where('enabled')
    .equals(1)
    .reverse()
    .sortBy('priority');
}

// Get recent decisions for a peer
async function getPeerDecisions(
  peerId: string, 
  limit = 10
): Promise<TrustDecision[]> {
  return trustDB.trust_decisions
    .where('[peer_id+timestamp]')
    .between([peerId, new Date(0)], [peerId, new Date()])
    .reverse()
    .limit(limit)
    .toArray();
}

// Get network profile
async function getNetworkProfile(
  fingerprint: string
): Promise<NetworkProfile | undefined> {
  return trustDB.network_profiles.get(fingerprint);
}

// Check for rule conflicts
async function findConflicts(
  ruleId: string
): Promise<RuleConflict[]> {
  return trustDB.rule_conflicts
    .where('[rule1_id+rule2_id]')
    .between([ruleId, ''], [ruleId, '\uffff'])
    .or('[rule2_id+rule1_id]')
    .between([ruleId, ''], [ruleId, '\uffff'])
    .filter(c => !c.resolved)
    .toArray();
}
```

## Privacy Considerations

1. **Network SSIDs**: Stored encrypted to prevent WiFi tracking
2. **Context Hashing**: Full context converted to hash for decisions
3. **Session-Only Learning**: Patterns cleared on session end
4. **No User Profiling**: No persistent behavioral data
5. **Data Minimization**: Auto-cleanup of old data

## Performance Optimization

1. **Compound Indexes**: For common query patterns
2. **Lazy Loading**: Load rules/decisions on demand
3. **Cache Strategy**: TTL-based context caching
4. **Batch Operations**: Bulk inserts for events
5. **Background Cleanup**: Async expired data removal

## Migration Strategy

```typescript
// Handle schema updates gracefully
export async function migrateDatabase(db: Dexie) {
  const currentVersion = db.verno;
  
  // Version 2: Add new index
  if (currentVersion < 2) {
    await db.version(2).stores({
      trust_rules: '++id, name, priority, enabled, *tags, [enabled+priority], mandatory'
    }).upgrade(trans => {
      // Set default mandatory = false for existing rules
      return trans.trust_rules.toCollection().modify(rule => {
        rule.mandatory = rule.mandatory ?? false;
      });
    });
  }
  
  // Future versions...
}
```

## Backup & Export

```typescript
// Export user data for backup
export async function exportTrustData(): Promise<TrustExport> {
  const [rules, networkProfiles] = await Promise.all([
    trustDB.trust_rules.toArray(),
    trustDB.network_profiles.where('user_classified').equals(true).toArray()
  ]);
  
  return {
    version: 1,
    exported_at: new Date(),
    data: {
      rules: rules.map(sanitizeRule),
      networks: networkProfiles.map(sanitizeNetwork)
    }
  };
}

// Import user data
export async function importTrustData(data: TrustExport): Promise<void> {
  await trustDB.transaction('rw', 
    trustDB.trust_rules, 
    trustDB.network_profiles, 
    async () => {
      // Clear existing user data
      await trustDB.trust_rules.clear();
      
      // Import new data
      await trustDB.trust_rules.bulkAdd(data.data.rules);
      await trustDB.network_profiles.bulkPut(data.data.networks);
    }
  );
}
```

## Security Measures

1. **Input Validation**: Sanitize all JSON fields before storage
2. **SQL Injection**: Not applicable (NoSQL) but validate queries
3. **XSS Prevention**: Escape all user-provided strings
4. **Access Control**: Database encrypted at rest by browser
5. **Audit Trail**: All changes logged in trust_events

## Storage Estimates

| Table | Avg Record Size | Est. Records | Total Size |
|-------|----------------|--------------|------------|
| trust_rules | 1 KB | 20 | 20 KB |
| trust_decisions | 0.5 KB | 1000 | 500 KB |
| network_profiles | 0.5 KB | 50 | 25 KB |
| context_cache | 2 KB | 10 | 20 KB |
| rule_conflicts | 0.5 KB | 10 | 5 KB |
| trust_events | 0.3 KB | 5000 | 1.5 MB |
| learning_patterns | 0.2 KB | 100 | 20 KB |
| **Total** | | | **~2.1 MB** |

## Conclusion

This schema design provides a robust foundation for the Adaptive Trust System while maintaining privacy, performance, and compatibility with Volli's existing infrastructure.