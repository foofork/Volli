# Vault Initialization Flow with Passphrase Prompt

## Functional Requirements

### Core Requirements

1. **Integrated Flow**: Vault initialization must be seamlessly integrated into the identity creation process
2. **Mandatory Passphrase**: Users must set a passphrase during identity creation to secure their vault
3. **Security Standards**: 
   - Minimum passphrase strength requirements
   - Secure key derivation using Argon2id
   - No passphrase storage - only derived keys
4. **User Experience**:
   - Clear instructions about passphrase importance
   - Real-time strength feedback
   - Confirmation step to prevent typos
5. **Error Recovery**:
   - Handle passphrase mismatch gracefully
   - Provide clear error messages
   - Allow retry without losing identity creation progress

### Security Requirements

1. **Passphrase Validation**:
   - Minimum 12 characters
   - Must contain mix of character types
   - Check against common passwords list
   - Entropy calculation for strength assessment

2. **Key Derivation**:
   - Use Argon2id with secure parameters
   - Generate unique salt per vault
   - Derive 256-bit encryption key
   - Secure memory handling for sensitive data

3. **Vault Encryption**:
   - XChaCha20-Poly1305 for data encryption
   - Separate keys for different data types
   - Authenticated encryption for all stored data

## UI Flow Pseudocode

```
FUNCTION createIdentityWithVault():
    // Step 1: Identity Creation
    identityName = PROMPT "Enter your identity name"
    VALIDATE identityName is not empty
    
    // Step 2: Generate Identity Keys
    identityKeys = generateIdentityKeyPairs()
    deviceKeys = generateDeviceKeyPairs()
    
    // Step 3: Passphrase Setup
    DISPLAY "Secure Your Vault"
    DISPLAY "Your passphrase protects all your encrypted data. Choose it carefully:"
    DISPLAY "- Use at least 12 characters"
    DISPLAY "- Mix letters, numbers, and symbols"
    DISPLAY "- Make it memorable but unique"
    DISPLAY "- This cannot be recovered if forgotten"
    
    REPEAT:
        passphrase = PROMPT "Enter vault passphrase" (masked input)
        strength = calculatePassphraseStrength(passphrase)
        
        IF strength < MINIMUM_STRENGTH:
            DISPLAY "Passphrase too weak. " + getStrengthFeedback(strength)
            CONTINUE
        
        DISPLAY "Passphrase strength: " + getStrengthLabel(strength)
        
        passphraseConfirm = PROMPT "Confirm passphrase" (masked input)
        
        IF passphrase != passphraseConfirm:
            DISPLAY "Passphrases don't match. Please try again."
            CONTINUE
        
        BREAK
    
    // Step 4: Initialize Vault
    TRY:
        vault = initializeVault(passphrase)
        identity = createIdentity(identityName, identityKeys, deviceKeys)
        linkVaultToIdentity(vault, identity)
        
        DISPLAY "Success! Your identity and secure vault have been created."
        RETURN {identity, vault}
        
    CATCH error:
        DISPLAY "Failed to create identity: " + error.message
        secureWipe(passphrase)
        THROW error
```

## Secure Passphrase Validation Logic

```
FUNCTION calculatePassphraseStrength(passphrase):
    score = 0
    
    // Length scoring
    IF passphrase.length >= 12: score += 20
    IF passphrase.length >= 16: score += 20
    IF passphrase.length >= 20: score += 20
    
    // Character diversity
    IF hasLowercase(passphrase): score += 10
    IF hasUppercase(passphrase): score += 10
    IF hasNumbers(passphrase): score += 10
    IF hasSymbols(passphrase): score += 10
    
    // Pattern detection (reduces score)
    IF hasRepeatingPatterns(passphrase): score -= 20
    IF isCommonPassword(passphrase): score = 0
    IF hasKeyboardPatterns(passphrase): score -= 15
    
    // Entropy calculation
    entropy = calculateEntropy(passphrase)
    IF entropy >= 60: score += 20
    
    RETURN MIN(score, 100)

FUNCTION validatePassphrase(passphrase):
    errors = []
    
    IF passphrase.length < 12:
        errors.append("Passphrase must be at least 12 characters")
    
    IF isCommonPassword(passphrase):
        errors.append("This passphrase is too common")
    
    IF NOT hasCharacterMix(passphrase):
        errors.append("Include letters, numbers, and symbols")
    
    IF calculateEntropy(passphrase) < 50:
        errors.append("Passphrase is not random enough")
    
    RETURN {
        isValid: errors.length == 0,
        errors: errors,
        strength: calculatePassphraseStrength(passphrase)
    }
```

## Key Derivation and Vault Initialization

```
FUNCTION deriveVaultKey(passphrase, salt):
    // Argon2id parameters for high security
    params = {
        memory: 64 * 1024,      // 64 MB
        iterations: 3,
        parallelism: 4,
        tagLength: 32,          // 256-bit key
        hashType: 'argon2id'
    }
    
    key = argon2.hash(passphrase, salt, params)
    
    // Secure cleanup
    secureWipe(passphrase)
    
    RETURN key

FUNCTION initializeVault(passphrase):
    // Generate cryptographically secure salt
    salt = crypto.randomBytes(32)
    
    // Derive master encryption key
    masterKey = deriveVaultKey(passphrase, salt)
    
    // Generate additional keys for different purposes
    keys = {
        dataEncryption: deriveSubKey(masterKey, "data-encryption"),
        searchIndex: deriveSubKey(masterKey, "search-index"),
        metadataMAC: deriveSubKey(masterKey, "metadata-mac")
    }
    
    // Initialize vault structure
    vault = {
        id: generateUUID(),
        salt: salt,
        version: 1,
        createdAt: timestamp(),
        config: {
            encryption: {
                algorithm: "xchacha20-poly1305",
                keyDerivation: "argon2id"
            }
        }
    }
    
    // Initialize storage backend
    storage = initializeEncryptedStorage(vault.id, keys.dataEncryption)
    searchIndex = initializeSearchIndex(vault.id, keys.searchIndex)
    
    // Store vault metadata (encrypted)
    metadata = encryptMetadata(vault, keys.metadataMAC)
    storage.saveMetadata(metadata)
    
    // Secure cleanup
    secureWipe(masterKey)
    
    RETURN {
        vault: vault,
        storage: storage,
        searchIndex: searchIndex
    }
```

## Integration with Identity Creation

```
FUNCTION createIdentityWithVault(name, passphrase):
    // Phase 1: Create identity
    identity = {
        id: generateUUID(),
        name: name,
        masterKeys: generateHybridKeyPairs(),
        device: {
            id: generateUUID(),
            name: getDeviceName(),
            keys: generateDeviceKeyPairs(),
            trustLevel: "TRUSTED",
            createdAt: timestamp()
        }
    }
    
    // Phase 2: Initialize vault with passphrase
    vaultInit = initializeVault(passphrase)
    
    // Phase 3: Link vault to identity
    vaultIdentityLink = {
        identityId: identity.id,
        vaultId: vaultInit.vault.id,
        permissions: ["read", "write", "admin"],
        createdAt: timestamp()
    }
    
    // Phase 4: Store encrypted identity backup in vault
    identityBackup = createIdentityBackup(identity, passphrase)
    vaultInit.storage.save("identity-backup", identityBackup)
    
    // Phase 5: Initialize identity manager
    identityManager = new IdentityManager()
    identityManager.addIdentity(identity)
    identityManager.linkVault(vaultInit)
    
    RETURN {
        identity: identity,
        vault: vaultInit.vault,
        manager: identityManager
    }
```

## Error Handling and Edge Cases

```
FUNCTION handleVaultInitializationErrors(error):
    SWITCH error.type:
        CASE "WEAK_PASSPHRASE":
            RETURN {
                userMessage: "Your passphrase doesn't meet security requirements",
                recovery: "RETRY_PASSPHRASE",
                details: error.validationErrors
            }
            
        CASE "STORAGE_INIT_FAILED":
            RETURN {
                userMessage: "Failed to initialize secure storage",
                recovery: "RETRY_INIT",
                details: "Check disk space and permissions"
            }
            
        CASE "KEY_DERIVATION_FAILED":
            RETURN {
                userMessage: "Failed to derive encryption keys",
                recovery: "RETRY_FULL",
                details: "System crypto error"
            }
            
        CASE "IDENTITY_CREATION_FAILED":
            // Rollback vault creation
            IF vaultId EXISTS:
                rollbackVaultCreation(vaultId)
            
            RETURN {
                userMessage: "Failed to create identity",
                recovery: "RESTART",
                details: error.message
            }
            
        DEFAULT:
            RETURN {
                userMessage: "An unexpected error occurred",
                recovery: "RESTART",
                details: error.toString()
            }

FUNCTION validateSystemRequirements():
    checks = []
    
    // Check crypto libraries
    IF NOT cryptoLibrariesAvailable():
        checks.append("Required cryptography libraries not available")
    
    // Check storage permissions
    IF NOT canWriteToStorage():
        checks.append("Cannot write to storage location")
    
    // Check available memory for Argon2
    IF availableMemory() < 128 * 1024 * 1024:  // 128MB minimum
        checks.append("Insufficient memory for secure key derivation")
    
    RETURN {
        canProceed: checks.length == 0,
        issues: checks
    }
```

## State Management During Creation

```
STRUCTURE CreationState:
    stage: ENUM ["START", "IDENTITY_DETAILS", "PASSPHRASE_ENTRY", 
                 "PASSPHRASE_CONFIRM", "INITIALIZING", "COMPLETE", "ERROR"]
    identityData: {
        name: String,
        masterKeys: KeyPair,
        deviceKeys: KeyPair
    }
    vaultData: {
        passphraseHash: String,  // For UI validation only, cleared after
        salt: Bytes
    }
    error: Error?
    
FUNCTION manageCreationFlow():
    state = new CreationState()
    state.stage = "START"
    
    WHILE state.stage != "COMPLETE":
        SWITCH state.stage:
            CASE "START":
                displayWelcome()
                state.stage = "IDENTITY_DETAILS"
                
            CASE "IDENTITY_DETAILS":
                result = collectIdentityDetails()
                IF result.success:
                    state.identityData = result.data
                    state.stage = "PASSPHRASE_ENTRY"
                
            CASE "PASSPHRASE_ENTRY":
                result = collectPassphrase()
                IF result.success:
                    state.vaultData.passphraseHash = hashForValidation(result.passphrase)
                    state.stage = "PASSPHRASE_CONFIRM"
                
            CASE "PASSPHRASE_CONFIRM":
                result = confirmPassphrase()
                IF hashForValidation(result.passphrase) == state.vaultData.passphraseHash:
                    state.stage = "INITIALIZING"
                    // Clear validation hash
                    secureWipe(state.vaultData.passphraseHash)
                ELSE:
                    displayError("Passphrases don't match")
                    state.stage = "PASSPHRASE_ENTRY"
                    
            CASE "INITIALIZING":
                TRY:
                    result = createIdentityWithVault(
                        state.identityData,
                        result.passphrase
                    )
                    state.stage = "COMPLETE"
                    displaySuccess(result)
                CATCH error:
                    state.error = error
                    state.stage = "ERROR"
                    
            CASE "ERROR":
                handleError(state.error)
                // Allow retry or exit
```

## Security Considerations

1. **Memory Safety**:
   - Clear passphrase from memory immediately after key derivation
   - Use secure memory allocation for sensitive data
   - Implement automatic cleanup on errors

2. **Timing Attacks**:
   - Use constant-time comparison for passphrase validation
   - Add random delays to prevent timing analysis

3. **Side Channels**:
   - Disable clipboard access during passphrase entry
   - Prevent screenshot capture during sensitive operations
   - Clear terminal/UI buffers after passphrase entry

4. **Recovery Mechanisms**:
   - No passphrase recovery - by design
   - Identity backup requires passphrase
   - Consider implementing secure passphrase hints (optional)

## Implementation Notes

1. The passphrase prompt should be integrated into the identity creation wizard
2. Use existing crypto utilities from `packages/vault-core/src/crypto.ts`
3. Leverage the `IdentityManager` class for identity-vault linking
4. Store vault reference in identity metadata for easy access
5. Implement progress indicators during key derivation (can be slow)
6. Add comprehensive logging (without logging sensitive data)
7. Include telemetry for creation success/failure rates