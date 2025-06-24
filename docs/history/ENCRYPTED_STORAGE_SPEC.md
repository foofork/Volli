# Encrypted Storage Layer Specification for IndexedDB

## 1. Functional Requirements

### Core Requirements
- **FR1**: Transparent encryption/decryption of all data stored in IndexedDB
- **FR2**: Support for multiple encryption keys per user/session
- **FR3**: Automatic key generation and management
- **FR4**: Zero-knowledge architecture - unencrypted data never persists to disk
- **FR5**: Support for different data types (strings, objects, arrays, blobs)
- **FR6**: Backwards compatibility with existing IndexedDB API
- **FR7**: Configurable encryption algorithms and parameters
- **FR8**: Key rotation capabilities without data loss
- **FR9**: Secure key storage and retrieval mechanisms
- **FR10**: Performance optimization for bulk operations

### Data Operations
- **FR11**: Encrypted create, read, update, delete (CRUD) operations
- **FR12**: Encrypted queries and indexed searches
- **FR13**: Batch operations with encryption
- **FR14**: Transaction support with rollback capabilities
- **FR15**: Encrypted backup and restore functionality

### Security Features
- **FR16**: Protection against timing attacks
- **FR17**: Memory cleanup after operations
- **FR18**: Secure random number generation
- **FR19**: Key derivation from user credentials
- **FR20**: Multi-factor authentication support for key access

### Integration Requirements
- **FR21**: Web Worker support for background encryption
- **FR22**: Progressive Web App (PWA) compatibility
- **FR23**: Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- **FR24**: TypeScript type definitions
- **FR25**: Minimal external dependencies

## 2. Security Constraints and Encryption Standards

### Encryption Standards
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
  - Provides authenticated encryption with associated data (AEAD)
  - 256-bit key size for quantum-resistant security
  - 96-bit nonce/IV for each encryption operation
  - 128-bit authentication tag

### Key Derivation
- **Primary KDF**: PBKDF2-SHA256
  - Minimum 100,000 iterations (configurable)
  - 32-byte salt per user
  - Derive both encryption and authentication keys
- **Alternative KDF**: Argon2id (optional, for enhanced security)
  - Memory cost: 64MB minimum
  - Time cost: 3 iterations
  - Parallelism: 4 threads

### Security Constraints
- **SC1**: All cryptographic operations must use Web Crypto API
- **SC2**: Keys must never be stored in plaintext
- **SC3**: Encryption keys must be derived from user credentials
- **SC4**: Each database record must have a unique IV
- **SC5**: IV/nonce values must be cryptographically random
- **SC6**: Failed decryption must not leak information
- **SC7**: Timing-safe comparison for authentication tags
- **SC8**: Secure deletion of keys from memory after use
- **SC9**: No encryption keys in JavaScript accessible memory
- **SC10**: Protection against side-channel attacks

### Compliance Requirements
- **OWASP**: Follow OWASP cryptographic storage guidelines
- **FIPS 140-2**: Use approved cryptographic algorithms
- **GDPR**: Support right to erasure (crypto-shredding)
- **HIPAA**: Meet encryption requirements for PHI data
- **PCI-DSS**: Comply with payment card data encryption standards

### Key Storage Strategy
- **Browser Storage**: Never store keys in localStorage/sessionStorage
- **In-Memory**: Keys exist only in Web Crypto API non-extractable format
- **Key Wrapping**: Master keys wrapped with user-derived keys
- **Session Keys**: Ephemeral keys for each session
- **Key Hierarchy**: Three-tier key structure (Master → Database → Record)

## 3. User Stories and Acceptance Criteria

### User Story 1: Basic Data Encryption
**As a** developer  
**I want to** store encrypted data in IndexedDB  
**So that** sensitive user information is protected at rest

**Acceptance Criteria:**
- Given valid data and encryption key, when storing data, then data is encrypted before writing to IndexedDB
- Given encrypted data and correct key, when retrieving data, then data is decrypted successfully
- Given encrypted data and incorrect key, when retrieving data, then operation fails gracefully
- Given any data type (string, object, array), when encrypting, then type is preserved after decryption

### User Story 2: Key Management
**As a** user  
**I want to** have my encryption keys derived from my credentials  
**So that** only I can access my encrypted data

**Acceptance Criteria:**
- Given user credentials, when deriving keys, then keys are generated deterministically
- Given same credentials, when deriving keys multiple times, then same keys are produced
- Given different credentials, when deriving keys, then different keys are produced
- Given weak password, when deriving keys, then KDF provides adequate protection

### User Story 3: Transparent API Usage
**As a** developer  
**I want to** use familiar IndexedDB API patterns  
**So that** I can integrate encryption without rewriting my application

**Acceptance Criteria:**
- Given existing IndexedDB code, when adding encryption layer, then minimal code changes required
- Given standard CRUD operations, when using encrypted storage, then API remains consistent
- Given IndexedDB transactions, when using encryption, then transaction semantics are preserved
- Given indexed queries, when searching encrypted data, then performance is acceptable

### User Story 4: Bulk Operations
**As a** application  
**I want to** efficiently encrypt/decrypt multiple records  
**So that** batch operations remain performant

**Acceptance Criteria:**
- Given 1000 records, when bulk encrypting, then operation completes in <5 seconds
- Given batch operation, when error occurs, then partial results are rolled back
- Given multiple records, when encrypting, then each has unique IV
- Given Web Worker support, when bulk processing, then UI remains responsive

### User Story 5: Key Rotation
**As a** security administrator  
**I want to** rotate encryption keys periodically  
**So that** compromised keys have limited exposure

**Acceptance Criteria:**
- Given existing encrypted data, when rotating keys, then data is re-encrypted with new keys
- Given key rotation in progress, when accessing data, then operations continue normally
- Given rotation failure, when rolling back, then data remains accessible with old keys
- Given successful rotation, when complete, then old keys are securely deleted

### User Story 6: Cross-Browser Support
**As a** end user  
**I want to** access my encrypted data from any modern browser  
**So that** I have flexibility in my choice of browser

**Acceptance Criteria:**
- Given Chrome/Firefox/Safari/Edge, when using encrypted storage, then all operations work
- Given different browsers, when accessing same data, then encryption is compatible
- Given browser without Web Crypto API, when initializing, then graceful fallback occurs
- Given mobile browsers, when using encryption, then performance is acceptable

### User Story 7: Error Recovery
**As a** application  
**I want to** handle encryption errors gracefully  
**So that** users have a good experience even when issues occur

**Acceptance Criteria:**
- Given decryption failure, when handling error, then specific error type is identifiable
- Given corrupted data, when decrypting, then error includes recovery suggestions
- Given out-of-memory error, when encrypting large data, then operation fails safely
- Given any error, when occurring, then no sensitive data is exposed in error messages

## 4. Data Structures and Interfaces

### Core Interfaces

```typescript
interface EncryptedStorage {
  initialize(config: EncryptionConfig): Promise<void>;
  put(storeName: string, value: any, key?: IDBValidKey): Promise<IDBValidKey>;
  get(storeName: string, key: IDBValidKey): Promise<any>;
  delete(storeName: string, key: IDBValidKey): Promise<void>;
  clear(storeName: string): Promise<void>;
  getAllKeys(storeName: string): Promise<IDBValidKey[]>;
  getAll(storeName: string): Promise<any[]>;
  count(storeName: string): Promise<number>;
  createTransaction(storeNames: string[], mode: IDBTransactionMode): EncryptedTransaction;
}

interface EncryptionConfig {
  databaseName: string;
  version: number;
  stores: StoreConfig[];
  cryptoConfig: CryptoConfig;
  keyDerivationConfig: KeyDerivationConfig;
}

interface StoreConfig {
  name: string;
  keyPath?: string | string[];
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
  encryptionFields?: string[]; // Specific fields to encrypt
}

interface CryptoConfig {
  algorithm: 'AES-GCM' | 'AES-CBC' | 'ChaCha20-Poly1305';
  keySize: 128 | 192 | 256;
  ivSize: number;
  tagSize?: number; // For AEAD modes
  saltSize: number;
}

interface KeyDerivationConfig {
  algorithm: 'PBKDF2' | 'Argon2id' | 'scrypt';
  iterations?: number;
  memory?: number;
  parallelism?: number;
  saltSize: number;
}
```

### Key Management Structures

```typescript
interface KeyHierarchy {
  masterKey: CryptoKey;         // User-derived master key
  databaseKeys: Map<string, CryptoKey>;  // Per-database keys
  storeKeys: Map<string, CryptoKey>;     // Per-store keys
}

interface KeyMetadata {
  keyId: string;
  algorithm: string;
  createdAt: number;
  rotatedAt?: number;
  expiresAt?: number;
  version: number;
}

interface EncryptedKeyStore {
  wrappedMasterKey: ArrayBuffer;
  salt: ArrayBuffer;
  iv: ArrayBuffer;
  authTag?: ArrayBuffer;
  metadata: KeyMetadata;
}
```

### Encrypted Data Structures

```typescript
interface EncryptedRecord {
  id: IDBValidKey;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  authTag?: ArrayBuffer;
  metadata: EncryptionMetadata;
}

interface EncryptionMetadata {
  version: number;
  algorithm: string;
  keyId: string;
  timestamp: number;
  dataType: string; // Original data type for deserialization
}

interface EncryptedIndex {
  indexName: string;
  encryptedValue: ArrayBuffer;
  searchToken: ArrayBuffer; // For searchable encryption
}
```

### Transaction Interfaces

```typescript
interface EncryptedTransaction {
  db: IDBDatabase;
  mode: IDBTransactionMode;
  storeNames: string[];
  abort(): void;
  objectStore(name: string): EncryptedObjectStore;
  commit(): Promise<void>;
  onabort: ((this: IDBTransaction, ev: Event) => any) | null;
  oncomplete: ((this: IDBTransaction, ev: Event) => any) | null;
  onerror: ((this: IDBTransaction, ev: Event) => any) | null;
}

interface EncryptedObjectStore {
  name: string;
  keyPath: string | string[];
  indexNames: DOMStringList;
  add(value: any, key?: IDBValidKey): Promise<IDBValidKey>;
  clear(): Promise<void>;
  count(query?: IDBValidKey | IDBKeyRange): Promise<number>;
  delete(query: IDBValidKey | IDBKeyRange): Promise<void>;
  get(query: IDBValidKey | IDBKeyRange): Promise<any>;
  getAll(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<any[]>;
  getAllKeys(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
  index(name: string): EncryptedIndex;
  put(value: any, key?: IDBValidKey): Promise<IDBValidKey>;
}
```

### Error Structures

```typescript
interface EncryptionError extends Error {
  code: EncryptionErrorCode;
  details?: any;
  recoverable: boolean;
}

enum EncryptionErrorCode {
  INVALID_KEY = 'INVALID_KEY',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  CORRUPTED_DATA = 'CORRUPTED_DATA',
  UNSUPPORTED_ALGORITHM = 'UNSUPPORTED_ALGORITHM',
  KEY_EXPIRED = 'KEY_EXPIRED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CRYPTO_NOT_AVAILABLE = 'CRYPTO_NOT_AVAILABLE'
}

## 5. Error Handling and Edge Cases

### Error Scenarios

#### Cryptographic Errors
- **Invalid Key**: User provides wrong password/credentials
  - Detection: Authentication tag verification fails
  - Handling: Throw INVALID_KEY error with retry option
  - Recovery: Prompt for correct credentials

- **Corrupted Ciphertext**: Data corruption in storage
  - Detection: Decryption produces invalid output
  - Handling: Throw CORRUPTED_DATA error
  - Recovery: Attempt recovery from backup, offer data reset

- **Unsupported Algorithm**: Browser doesn't support required crypto
  - Detection: Web Crypto API feature detection
  - Handling: Throw UNSUPPORTED_ALGORITHM error
  - Recovery: Fallback to supported algorithm or polyfill

#### Storage Errors
- **Quota Exceeded**: IndexedDB storage limit reached
  - Detection: IndexedDB throws QuotaExceededError
  - Handling: Throw QUOTA_EXCEEDED error
  - Recovery: Suggest cleanup, data export, or storage upgrade

- **Database Blocked**: Another connection blocks version change
  - Detection: IndexedDB blocked event
  - Handling: Queue operations, retry with backoff
  - Recovery: Force close other connections after timeout

- **Transaction Conflicts**: Concurrent transaction issues
  - Detection: Transaction abort events
  - Handling: Automatic retry with exponential backoff
  - Recovery: Merge conflicts or last-write-wins

#### Key Management Errors
- **Key Derivation Failure**: KDF operation fails
  - Detection: Web Crypto API throws error
  - Handling: Throw KEY_DERIVATION_FAILED error
  - Recovery: Retry with adjusted parameters

- **Key Expiration**: Time-based key expiration
  - Detection: Check key metadata timestamp
  - Handling: Throw KEY_EXPIRED error
  - Recovery: Trigger key rotation process

- **Key Not Found**: Missing encryption key
  - Detection: Key lookup returns null
  - Handling: Throw INVALID_KEY error
  - Recovery: Re-derive from credentials or restore from backup

### Edge Cases

#### Data Type Edge Cases
```pseudocode
EDGE_CASE: Large Binary Data
  IF data_size > 100MB THEN
    Split into chunks
    Encrypt each chunk separately
    Store chunk references
  END IF

EDGE_CASE: Circular References
  IF object has circular reference THEN
    Use structured clone algorithm
    Mark circular references
    Restore after decryption
  END IF

EDGE_CASE: Special JavaScript Values
  Handle: undefined, null, NaN, Infinity, -Infinity
  Serialize with type markers
  Restore exact type after decryption
```

#### Concurrency Edge Cases
```pseudocode
EDGE_CASE: Simultaneous Key Rotation
  LOCK key_rotation_mutex
  IF rotation_in_progress THEN
    Wait for completion
    Use new keys
  ELSE
    Proceed with rotation
  END IF
  UNLOCK key_rotation_mutex

EDGE_CASE: Multi-Tab Access
  Use BroadcastChannel for key sync
  Implement leader election
  Share encryption context safely
```

#### Browser-Specific Edge Cases
```pseudocode
EDGE_CASE: Safari Private Mode
  IF isPrivateMode() AND isSafari() THEN
    Use in-memory storage only
    Warn about data persistence
  END IF

EDGE_CASE: Mobile Browser Memory Limits
  IF isMobile() THEN
    Reduce batch sizes
    Implement aggressive cleanup
    Use streaming encryption
  END IF

EDGE_CASE: Browser Crypto Timing
  IF crypto operation takes > 1s THEN
    Move to Web Worker
    Show progress indicator
    Allow cancellation
  END IF
```

### Error Recovery Strategies

#### Automatic Recovery
1. **Retry Logic**
   - Exponential backoff: 100ms, 200ms, 400ms, 800ms
   - Maximum 5 retries for transient errors
   - Different strategies per error type

2. **Graceful Degradation**
   - Fall back to unencrypted with user consent
   - Use weaker but supported algorithms
   - Reduce feature set to core functionality

3. **Data Recovery**
   - Keep encrypted backups
   - Implement versioned storage
   - Support partial data recovery

#### Manual Recovery
1. **User Intervention**
   - Clear guidance on error resolution
   - Step-by-step recovery wizard
   - Data export before destructive operations

2. **Administrator Actions**
   - Force key rotation
   - Database reconstruction
   - Bulk data re-encryption

### Monitoring and Logging
```pseudocode
ERROR_LOGGING:
  Log error type, timestamp, and context
  Sanitize sensitive information
  Track error frequency and patterns
  Alert on critical error thresholds
  
PERFORMANCE_MONITORING:
  Track encryption/decryption times
  Monitor memory usage
  Measure storage efficiency
  Identify bottlenecks
```

## 6. Core Encryption/Decryption Pseudocode

### Initialization
```pseudocode
FUNCTION initializeEncryptedStorage(config):
  // Validate configuration
  VALIDATE_CONFIG(config)
  
  // Check browser support
  IF NOT isWebCryptoAvailable() THEN
    THROW EncryptionError(CRYPTO_NOT_AVAILABLE)
  END IF
  
  // Initialize key management
  keyManager = NEW KeyManager(config.keyDerivationConfig)
  
  // Open IndexedDB connection
  db = AWAIT openDatabase(config.databaseName, config.version)
  
  // Setup stores with encryption metadata
  FOR EACH store IN config.stores:
    createEncryptedStore(db, store)
  END FOR
  
  RETURN EncryptedStorage(db, keyManager, config)
END FUNCTION
```

### Key Derivation
```pseudocode
FUNCTION deriveKey(password, salt, config):
  // Import password as key material
  keyMaterial = AWAIT crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  // Derive encryption key
  key = AWAIT crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: config.iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: config.keySize
    },
    false,
    ['encrypt', 'decrypt']
  )
  
  RETURN key
END FUNCTION
```

### Encryption Operation
```pseudocode
FUNCTION encryptData(plaintext, key):
  // Generate random IV
  iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Serialize data if needed
  data = serializeData(plaintext)
  
  // Create additional authenticated data
  aad = createAAD(data.type, timestamp)
  
  // Perform encryption
  encrypted = AWAIT crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      additionalData: aad,
      tagLength: 128
    },
    key,
    data.buffer
  )
  
  // Create encrypted record
  encryptedRecord = {
    ciphertext: encrypted,
    iv: iv,
    metadata: {
      version: CURRENT_VERSION,
      algorithm: 'AES-GCM',
      keyId: key.id,
      timestamp: Date.now(),
      dataType: data.type
    }
  }
  
  RETURN encryptedRecord
END FUNCTION

FUNCTION serializeData(data):
  // Handle different data types
  IF data IS string THEN
    RETURN {
      buffer: encoder.encode(data),
      type: 'string'
    }
  ELSE IF data IS object THEN
    RETURN {
      buffer: encoder.encode(JSON.stringify(data)),
      type: 'object'
    }
  ELSE IF data IS ArrayBuffer THEN
    RETURN {
      buffer: data,
      type: 'binary'
    }
  ELSE IF data IS Blob THEN
    buffer = AWAIT data.arrayBuffer()
    RETURN {
      buffer: buffer,
      type: 'blob',
      mimeType: data.type
    }
  END IF
END FUNCTION
```

### Decryption Operation
```pseudocode
FUNCTION decryptData(encryptedRecord, key):
  TRY:
    // Validate encrypted record
    validateEncryptedRecord(encryptedRecord)
    
    // Check key compatibility
    IF encryptedRecord.metadata.keyId != key.id THEN
      THROW EncryptionError(INVALID_KEY)
    END IF
    
    // Create AAD from metadata
    aad = createAAD(
      encryptedRecord.metadata.dataType,
      encryptedRecord.metadata.timestamp
    )
    
    // Perform decryption
    decrypted = AWAIT crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encryptedRecord.iv,
        additionalData: aad,
        tagLength: 128
      },
      key,
      encryptedRecord.ciphertext
    )
    
    // Deserialize data
    plaintext = deserializeData(
      decrypted,
      encryptedRecord.metadata.dataType
    )
    
    RETURN plaintext
    
  CATCH error:
    IF error.name == 'OperationError' THEN
      THROW EncryptionError(DECRYPTION_FAILED)
    ELSE
      THROW error
    END IF
  END TRY
END FUNCTION

FUNCTION deserializeData(buffer, dataType):
  IF dataType == 'string' THEN
    RETURN decoder.decode(buffer)
  ELSE IF dataType == 'object' THEN
    json = decoder.decode(buffer)
    RETURN JSON.parse(json)
  ELSE IF dataType == 'binary' THEN
    RETURN buffer
  ELSE IF dataType == 'blob' THEN
    RETURN new Blob([buffer], { type: mimeType })
  END IF
END FUNCTION
```

### Transactional Operations
```pseudocode
FUNCTION putEncrypted(storeName, value, key):
  // Get encryption key for store
  encKey = AWAIT keyManager.getStoreKey(storeName)
  
  // Encrypt the value
  encryptedData = AWAIT encryptData(value, encKey)
  
  // Create transaction
  tx = db.transaction([storeName], 'readwrite')
  store = tx.objectStore(storeName)
  
  // Store encrypted data
  request = store.put(encryptedData, key)
  
  AWAIT tx.complete
  RETURN request.result
END FUNCTION

FUNCTION getEncrypted(storeName, key):
  // Create read transaction
  tx = db.transaction([storeName], 'readonly')
  store = tx.objectStore(storeName)
  
  // Get encrypted data
  encryptedData = AWAIT store.get(key)
  
  IF encryptedData IS null THEN
    RETURN null
  END IF
  
  // Get decryption key
  decKey = AWAIT keyManager.getStoreKey(storeName)
  
  // Decrypt and return
  plaintext = AWAIT decryptData(encryptedData, decKey)
  RETURN plaintext
END FUNCTION
```

### Batch Operations
```pseudocode
FUNCTION bulkEncrypt(items, key):
  // Use Web Worker if available
  IF isWebWorkerAvailable() THEN
    RETURN encryptInWorker(items, key)
  END IF
  
  encryptedItems = []
  errors = []
  
  // Process in chunks to avoid blocking
  CHUNK_SIZE = 100
  
  FOR i = 0 TO items.length STEP CHUNK_SIZE:
    chunk = items.slice(i, i + CHUNK_SIZE)
    
    // Process chunk
    FOR EACH item IN chunk:
      TRY:
        encrypted = AWAIT encryptData(item.value, key)
        encryptedItems.push({
          key: item.key,
          data: encrypted
        })
      CATCH error:
        errors.push({
          key: item.key,
          error: error
        })
      END TRY
    END FOR
    
    // Yield to browser
    AWAIT yieldToBrowser()
  END FOR
  
  IF errors.length > 0 THEN
    THROW BulkOperationError(encryptedItems, errors)
  END IF
  
  RETURN encryptedItems
END FUNCTION
```

### Key Rotation
```pseudocode
FUNCTION rotateKeys(oldKey, newKey):
  // Mark rotation as in progress
  keyManager.startRotation()
  
  TRY:
    // Get all stores
    stores = db.objectStoreNames
    
    FOR EACH storeName IN stores:
      // Create transaction
      tx = db.transaction([storeName], 'readwrite')
      store = tx.objectStore(storeName)
      
      // Get all records
      records = AWAIT store.getAll()
      
      FOR EACH record IN records:
        // Decrypt with old key
        plaintext = AWAIT decryptData(record.value, oldKey)
        
        // Re-encrypt with new key
        newEncrypted = AWAIT encryptData(plaintext, newKey)
        
        // Update record
        AWAIT store.put(newEncrypted, record.key)
      END FOR
      
      AWAIT tx.complete
    END FOR
    
    // Update key metadata
    keyManager.completeRotation(newKey)
    
  CATCH error:
    // Rollback on failure
    keyManager.rollbackRotation()
    THROW error
  END TRY
END FUNCTION
```

## 7. Key Management and Storage Strategy

### Key Hierarchy Design
```
Master Key (User-Derived)
    ├── Database Keys (Per Database)
    │   ├── Store Keys (Per Object Store)
    │   │   └── Field Keys (Optional, Per Field)
    │   └── Index Keys (For Searchable Encryption)
    └── Session Keys (Ephemeral)
```

### Key Derivation Strategy
```pseudocode
STRUCTURE KeyDerivationPaths:
  MASTER_KEY_PATH = "volli/master/v1"
  DATABASE_KEY_PATH = "volli/db/{dbName}/v1"
  STORE_KEY_PATH = "volli/db/{dbName}/store/{storeName}/v1"
  FIELD_KEY_PATH = "volli/db/{dbName}/store/{storeName}/field/{fieldName}/v1"
  SESSION_KEY_PATH = "volli/session/{sessionId}/v1"

FUNCTION deriveKeyHierarchy(masterPassword, salt):
  // Derive master key
  masterKey = PBKDF2(
    password: masterPassword,
    salt: salt + MASTER_KEY_PATH,
    iterations: 100000,
    keyLength: 256
  )
  
  // Derive database keys
  dbKeys = {}
  FOR EACH database IN databases:
    dbKeys[database] = HKDF(
      ikm: masterKey,
      salt: database.name,
      info: DATABASE_KEY_PATH.format(dbName=database.name),
      length: 256
    )
  END FOR
  
  // Derive store keys
  storeKeys = {}
  FOR EACH store IN stores:
    storeKeys[store] = HKDF(
      ikm: dbKeys[store.database],
      salt: store.name,
      info: STORE_KEY_PATH.format(dbName=store.database, storeName=store.name),
      length: 256
    )
  END FOR
  
  RETURN KeyHierarchy(masterKey, dbKeys, storeKeys)
END FUNCTION
```

### Key Storage Mechanisms

#### In-Memory Storage (Primary)
```pseudocode
CLASS InMemoryKeyStore:
  PRIVATE keys = new Map()
  PRIVATE keyMetadata = new Map()
  PRIVATE sessionTimeout = 30 * 60 * 1000 // 30 minutes
  
  FUNCTION storeKey(keyId, key, metadata):
    // Store as non-extractable CryptoKey
    cryptoKey = AWAIT importNonExtractableKey(key)
    keys.set(keyId, cryptoKey)
    
    // Store metadata
    keyMetadata.set(keyId, {
      ...metadata,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      usageCount: 0
    })
    
    // Set expiration timer
    setTimeout(() => this.expireKey(keyId), sessionTimeout)
  END FUNCTION
  
  FUNCTION getKey(keyId):
    IF NOT keys.has(keyId) THEN
      RETURN null
    END IF
    
    // Update usage statistics
    metadata = keyMetadata.get(keyId)
    metadata.lastUsed = Date.now()
    metadata.usageCount++
    
    // Reset expiration timer
    resetExpirationTimer(keyId)
    
    RETURN keys.get(keyId)
  END FUNCTION
  
  FUNCTION clearKeys():
    // Securely clear all keys
    keys.forEach((key) => {
      crypto.subtle.deriveBits({ name: "PBKDF2", iterations: 1 }, key, 1)
    })
    keys.clear()
    keyMetadata.clear()
  END FUNCTION
END CLASS
```

#### Wrapped Key Storage (Backup)
```pseudocode
FUNCTION wrapMasterKey(masterKey, wrappingKey):
  // Generate wrapping IV
  wrappingIV = crypto.getRandomValues(new Uint8Array(12))
  
  // Wrap the master key
  wrappedKey = AWAIT crypto.subtle.wrapKey(
    "raw",
    masterKey,
    wrappingKey,
    {
      name: "AES-GCM",
      iv: wrappingIV,
      tagLength: 128
    }
  )
  
  RETURN {
    wrappedKey: wrappedKey,
    iv: wrappingIV,
    algorithm: "AES-GCM",
    timestamp: Date.now()
  }
END FUNCTION

FUNCTION unwrapMasterKey(wrappedKeyData, wrappingKey):
  masterKey = AWAIT crypto.subtle.unwrapKey(
    "raw",
    wrappedKeyData.wrappedKey,
    wrappingKey,
    {
      name: "AES-GCM",
      iv: wrappedKeyData.iv,
      tagLength: 128
    },
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  )
  
  RETURN masterKey
END FUNCTION
```

### Session Key Management
```pseudocode
CLASS SessionKeyManager:
  PRIVATE activeSessions = new Map()
  
  FUNCTION createSession(userId):
    sessionId = generateSecureRandom(32)
    
    // Derive session key from master key
    sessionKey = AWAIT deriveSessionKey(
      masterKey: getUserMasterKey(userId),
      sessionId: sessionId,
      expiresIn: 3600000 // 1 hour
    )
    
    session = {
      id: sessionId,
      key: sessionKey,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      refreshToken: generateSecureRandom(32)
    }
    
    activeSessions.set(sessionId, session)
    RETURN session
  END FUNCTION
  
  FUNCTION refreshSession(sessionId, refreshToken):
    session = activeSessions.get(sessionId)
    
    IF NOT session OR session.refreshToken != refreshToken THEN
      THROW InvalidSessionError()
    END IF
    
    // Rotate session key
    newSessionKey = AWAIT rotateSessionKey(session.key)
    
    session.key = newSessionKey
    session.expiresAt = Date.now() + 3600000
    session.refreshToken = generateSecureRandom(32)
    
    RETURN session
  END FUNCTION
END CLASS
```

### Key Rotation Implementation
```pseudocode
CLASS KeyRotationManager:
  PRIVATE rotationSchedule = new Map()
  PRIVATE rotationHistory = []
  
  FUNCTION scheduleRotation(keyId, intervalDays):
    rotationSchedule.set(keyId, {
      interval: intervalDays * 24 * 60 * 60 * 1000,
      nextRotation: Date.now() + (intervalDays * 24 * 60 * 60 * 1000),
      version: 1
    })
  END FUNCTION
  
  FUNCTION rotateKey(keyId):
    // Create rotation transaction
    transaction = {
      id: generateTransactionId(),
      keyId: keyId,
      startTime: Date.now(),
      status: "IN_PROGRESS"
    }
    
    TRY:
      // Generate new key
      oldKey = keyStore.getKey(keyId)
      newKey = AWAIT generateNewKey(oldKey.algorithm)
      
      // Re-encrypt all data
      AWAIT reencryptDataWithNewKey(keyId, oldKey, newKey)
      
      // Update key store
      keyStore.replaceKey(keyId, newKey)
      
      // Update rotation schedule
      schedule = rotationSchedule.get(keyId)
      schedule.version++
      schedule.nextRotation = Date.now() + schedule.interval
      
      // Complete transaction
      transaction.status = "COMPLETED"
      transaction.endTime = Date.now()
      rotationHistory.push(transaction)
      
    CATCH error:
      transaction.status = "FAILED"
      transaction.error = error
      rotationHistory.push(transaction)
      THROW error
    END TRY
  END FUNCTION
END CLASS
```

### Multi-Device Key Synchronization
```pseudocode
STRUCTURE KeySyncProtocol:
  // Device enrollment
  FUNCTION enrollDevice(deviceId, publicKey):
    // Verify device ownership
    verificationCode = generateVerificationCode()
    SEND verificationCode TO user
    
    IF NOT verifyCode(userInput, verificationCode) THEN
      THROW UnauthorizedDeviceError()
    END IF
    
    // Create device-specific wrapped key
    deviceKey = wrapKeyForDevice(masterKey, publicKey)
    
    STORE deviceEnrollment({
      deviceId: deviceId,
      publicKey: publicKey,
      wrappedKey: deviceKey,
      enrolledAt: Date.now()
    })
  END FUNCTION
  
  // Key synchronization
  FUNCTION syncKeys(deviceId, lastSyncTimestamp):
    // Get updated keys since last sync
    updatedKeys = getKeysUpdatedSince(lastSyncTimestamp)
    
    // Wrap keys for specific device
    devicePublicKey = getDevicePublicKey(deviceId)
    wrappedKeys = []
    
    FOR EACH key IN updatedKeys:
      wrapped = AWAIT wrapKeyForDevice(key, devicePublicKey)
      wrappedKeys.push({
        keyId: key.id,
        wrappedKey: wrapped,
        version: key.version,
        timestamp: key.updatedAt
      })
    END FOR
    
    RETURN {
      keys: wrappedKeys,
      syncTimestamp: Date.now()
    }
  END FUNCTION
END STRUCTURE
```

### Security Considerations for Key Storage
1. **Never store keys in plaintext**
2. **Use hardware security modules when available**
3. **Implement key escrow for enterprise deployments**
4. **Regular key usage auditing**
5. **Automatic key expiration and renewal**
6. **Secure key deletion with crypto-shredding**
7. **Protection against key extraction attacks**