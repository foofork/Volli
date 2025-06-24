# Vault Initialization Flow with Passphrase Prompt - SPARC Specification

## Overview
This specification defines the vault initialization flow integrated with identity creation, including passphrase generation, validation, and secure vault setup.

## 1. Passphrase Prompt UI/UX Flow

### 1.1 UI Flow States

```pseudocode
ENUM PassphraseFlowState:
    INITIAL_CHOICE          // User chooses generation method
    GENERATE_PASSPHRASE     // System generates passphrase
    CUSTOM_PASSPHRASE       // User enters custom passphrase
    CONFIRM_PASSPHRASE      // User confirms understanding
    RECOVERY_SETUP          // Set up recovery options
    VAULT_CREATION          // Creating encrypted vault
    COMPLETION              // Success state
    ERROR                   // Error state with recovery
```

### 1.2 Passphrase Generation Options

```pseudocode
STRUCTURE PassphraseOptions:
    method: "generated" | "custom"
    strength: "standard" | "enhanced" | "maximum"
    wordCount: 6 | 8 | 12  // For generated passphrases
    includeNumbers: boolean
    includeSeparators: boolean
    customValidation: PassphraseValidator
```

### 1.3 UI Component Specifications

```pseudocode
COMPONENT PassphrasePrompt:
    STATE:
        currentFlow: PassphraseFlowState
        generatedPassphrase: string?
        customPassphrase: string?
        passphraseStrength: StrengthIndicator
        validationErrors: Array<string>
        showPassphrase: boolean
        confirmationChecked: boolean
        recoveryMethod: RecoveryMethod?
        
    ACTIONS:
        generatePassphrase(options: PassphraseOptions)
        validatePassphrase(passphrase: string): ValidationResult
        togglePassphraseVisibility()
        confirmPassphrase()
        setupRecovery(method: RecoveryMethod)
        proceedToVaultCreation()
```

### 1.4 Passphrase Validation Rules

```pseudocode
FUNCTION validatePassphrase(passphrase: string): ValidationResult:
    errors = []
    strength = calculateStrength(passphrase)
    
    // Minimum requirements
    IF passphrase.length < 12:
        errors.push("Passphrase must be at least 12 characters")
    
    // Entropy calculation
    entropy = calculateEntropy(passphrase)
    IF entropy < 128:  // 128 bits minimum
        errors.push("Passphrase is too weak, add more unique words or characters")
    
    // Common passphrase check
    IF isCommonPassphrase(passphrase):
        errors.push("This passphrase is too common, please choose another")
    
    // Character diversity for custom passphrases
    IF passphrase.method == "custom":
        IF NOT hasCharacterDiversity(passphrase):
            errors.push("Include a mix of letters, numbers, and symbols")
    
    // Dictionary attack resistance
    IF isDictionaryVulnerable(passphrase):
        errors.push("Passphrase is vulnerable to dictionary attacks")
    
    RETURN {
        valid: errors.length == 0,
        errors: errors,
        strength: strength,
        entropy: entropy,
        suggestions: generateSuggestions(passphrase, errors)
    }
```

### 1.5 Strength Indicator Algorithm

```pseudocode
FUNCTION calculateStrength(passphrase: string): StrengthIndicator:
    entropy = calculateEntropy(passphrase)
    
    // Define strength levels based on entropy bits
    IF entropy < 60:
        RETURN {
            level: "VERY_WEAK",
            score: 0,
            color: "red",
            message: "Extremely vulnerable"
        }
    ELSE IF entropy < 80:
        RETURN {
            level: "WEAK",
            score: 1,
            color: "orange", 
            message: "Vulnerable to attacks"
        }
    ELSE IF entropy < 100:
        RETURN {
            level: "FAIR",
            score: 2,
            color: "yellow",
            message: "Moderate security"
        }
    ELSE IF entropy < 128:
        RETURN {
            level: "GOOD",
            score: 3,
            color: "light-green",
            message: "Good security"
        }
    ELSE IF entropy < 160:
        RETURN {
            level: "STRONG",
            score: 4,
            color: "green",
            message: "Strong security"
        }
    ELSE:
        RETURN {
            level: "VERY_STRONG",
            score: 5,
            color: "dark-green",
            message: "Excellent security"
        }
```

## 2. Vault Initialization Sequence

### 2.1 Complete Flow Pseudocode

```pseudocode
FUNCTION initializeVaultDuringIdentityCreation(identityData: IdentityCreationData):
    // Step 1: Identity validation
    identity = validateIdentityData(identityData)
    IF NOT identity.valid:
        THROW ValidationError(identity.errors)
    
    // Step 2: Begin transaction
    transaction = beginTransaction()
    
    TRY:
        // Step 3: Create identity
        createdIdentity = createIdentity({
            username: identity.username,
            email: identity.email,
            profile: identity.profile
        })
        transaction.addOperation(createdIdentity, rollbackIdentity)
        
        // Step 4: Prompt for passphrase
        passphraseResult = promptForPassphrase({
            mode: "identity_creation",
            options: getDefaultPassphraseOptions()
        })
        
        IF passphraseResult.cancelled:
            transaction.rollback()
            RETURN {success: false, reason: "user_cancelled"}
        
        // Step 5: Validate passphrase strength
        validation = validatePassphrase(passphraseResult.passphrase)
        IF NOT validation.valid:
            transaction.rollback()
            THROW ValidationError(validation.errors)
        
        // Step 6: Generate vault encryption keys
        vaultKeys = generateVaultKeys({
            passphrase: passphraseResult.passphrase,
            userId: createdIdentity.id,
            securityLevel: determineSecurityLevel(validation.strength)
        })
        
        // Step 7: Create encrypted vault
        vault = createEncryptedVault({
            userId: createdIdentity.id,
            encryptionKey: vaultKeys.dataKey,
            metadata: {
                version: VAULT_VERSION,
                algorithm: "XChaCha20-Poly1305",
                kdf: "Argon2id",
                createdAt: getCurrentTimestamp()
            }
        })
        transaction.addOperation(vault, rollbackVault)
        
        // Step 8: Store recovery information
        IF passphraseResult.recoveryMethod:
            recovery = setupRecovery({
                userId: createdIdentity.id,
                vaultId: vault.id,
                method: passphraseResult.recoveryMethod,
                encryptedRecoveryKey: vaultKeys.recoveryKey
            })
            transaction.addOperation(recovery, rollbackRecovery)
        
        // Step 9: Create initial session
        session = createAuthSession({
            userId: createdIdentity.id,
            vaultUnlocked: true,
            vaultKey: vaultKeys.sessionKey
        })
        transaction.addOperation(session, rollbackSession)
        
        // Step 10: Commit transaction
        transaction.commit()
        
        // Step 11: Clear sensitive data
        secureZeroMemory(passphraseResult.passphrase)
        secureZeroMemory(vaultKeys.dataKey)
        
        RETURN {
            success: true,
            identity: createdIdentity,
            session: session,
            vaultStatus: "unlocked"
        }
        
    CATCH error:
        transaction.rollback()
        secureZeroMemory(passphraseResult.passphrase)
        secureZeroMemory(vaultKeys)
        THROW error
```

### 2.2 Key Generation Process

```pseudocode
FUNCTION generateVaultKeys(params: VaultKeyParams):
    // Derive master key from passphrase
    salt = generateSecureRandomBytes(32)  // 256-bit salt
    
    masterKey = deriveKey({
        passphrase: params.passphrase,
        salt: salt,
        securityLevel: params.securityLevel,
        outputLength: 64  // 512 bits for key splitting
    })
    
    // Split master key for different purposes
    dataKey = masterKey.slice(0, 32)      // First 256 bits for data encryption
    recoveryKey = masterKey.slice(32, 64)  // Last 256 bits for recovery
    
    // Generate session key (ephemeral)
    sessionKey = generateSecureRandomBytes(32)
    
    // Wrap session key with data key for storage
    wrappedSessionKey = wrapKey(sessionKey, dataKey)
    
    RETURN {
        dataKey: dataKey,
        recoveryKey: recoveryKey,
        sessionKey: sessionKey,
        wrappedSessionKey: wrappedSessionKey,
        salt: salt,
        keyDerivationParams: {
            algorithm: "Argon2id",
            memLimit: getMemLimit(params.securityLevel),
            opsLimit: getOpsLimit(params.securityLevel)
        }
    }
```

### 2.3 Vault Creation Process

```pseudocode
FUNCTION createEncryptedVault(params: VaultCreationParams):
    // Initialize vault structure
    vault = {
        id: generateUUID(),
        userId: params.userId,
        version: params.metadata.version,
        created: params.metadata.createdAt,
        data: {}  // Empty initial data
    }
    
    // Serialize vault data
    vaultData = serialize(vault.data)
    
    // Generate nonce for encryption
    nonce = generateSecureRandomBytes(24)  // XChaCha20 nonce
    
    // Encrypt vault data
    encryptedData = encrypt({
        plaintext: vaultData,
        key: params.encryptionKey,
        nonce: nonce,
        algorithm: params.metadata.algorithm
    })
    
    // Create vault record
    vaultRecord = {
        id: vault.id,
        userId: vault.userId,
        metadata: {
            version: vault.version,
            algorithm: params.metadata.algorithm,
            kdf: params.metadata.kdf,
            nonce: base64Encode(nonce),
            created: vault.created,
            modified: vault.created,
            size: encryptedData.length
        },
        encryptedData: base64Encode(encryptedData),
        checksum: calculateChecksum(encryptedData)
    }
    
    // Store vault
    storage.saveVault(vaultRecord)
    
    RETURN vaultRecord
```

## 3. Recovery Methods

### 3.1 Recovery Method Options

```pseudocode
ENUM RecoveryMethod:
    SECURITY_QUESTIONS    // Answer predefined questions
    RECOVERY_PHRASE       // Separate recovery phrase
    EMAIL_RECOVERY        // Email-based recovery with time delay
    TRUSTED_CONTACTS      // M-of-N trusted contact recovery
    HARDWARE_KEY          // Hardware security key backup
```

### 3.2 Recovery Setup Process

```pseudocode
FUNCTION setupRecovery(params: RecoverySetupParams):
    SWITCH params.method:
        CASE SECURITY_QUESTIONS:
            RETURN setupSecurityQuestions(params)
        CASE RECOVERY_PHRASE:
            RETURN setupRecoveryPhrase(params)
        CASE EMAIL_RECOVERY:
            RETURN setupEmailRecovery(params)
        CASE TRUSTED_CONTACTS:
            RETURN setupTrustedContacts(params)
        CASE HARDWARE_KEY:
            RETURN setupHardwareKey(params)
```

## 4. Error Handling Scenarios

### 4.1 Passphrase-Related Errors

```pseudocode
ENUM PassphraseError:
    TOO_WEAK              // Entropy below minimum
    TOO_COMMON            // Found in common passphrase list
    VALIDATION_FAILED     // Failed custom validation rules
    GENERATION_FAILED     // Could not generate secure passphrase
    USER_CANCELLED        // User cancelled the flow
```

### 4.2 Vault Creation Errors

```pseudocode
ENUM VaultError:
    ENCRYPTION_FAILED     // Could not encrypt vault data
    STORAGE_FAILED        // Could not save to storage
    KEY_GENERATION_FAILED // Could not derive keys
    TRANSACTION_FAILED    // Database transaction failed
    DUPLICATE_VAULT       // Vault already exists for user
```

### 4.3 Error Recovery Flow

```pseudocode
FUNCTION handleVaultInitError(error: VaultError, context: ErrorContext):
    // Log error securely
    logSecureError(error, sanitizeContext(context))
    
    // Determine recovery action
    SWITCH error:
        CASE TOO_WEAK:
            RETURN {
                action: "RETRY",
                message: "Please choose a stronger passphrase",
                suggestions: generateStrongerPassphraseSuggestions()
            }
        
        CASE STORAGE_FAILED:
            RETURN {
                action: "RETRY_WITH_BACKOFF",
                message: "Storage temporarily unavailable",
                retryAfter: calculateBackoff(context.attemptCount)
            }
        
        CASE DUPLICATE_VAULT:
            RETURN {
                action: "REDIRECT",
                message: "Vault already exists",
                redirectTo: "/login"
            }
        
        DEFAULT:
            RETURN {
                action: "FATAL",
                message: "Unable to create secure vault",
                supportCode: generateSupportCode(error, context)
            }
```

## 5. Integration Points

### 5.1 Identity Creation Integration

```pseudocode
INTERFACE IdentityCreationHooks:
    beforeIdentityCreate(data: IdentityData): ValidationResult
    afterIdentityCreate(identity: Identity): void
    beforeVaultCreate(identity: Identity): VaultConfig
    afterVaultCreate(vault: Vault): void
    onComplete(result: CreationResult): void
    onError(error: Error, phase: CreationPhase): ErrorAction
```

### 5.2 Authentication System Integration

```pseudocode
FUNCTION integrateWithAuthSystem(vault: Vault, session: AuthSession):
    // Register vault with session
    session.vaultId = vault.id
    session.vaultStatus = "unlocked"
    session.vaultTimeout = DEFAULT_VAULT_TIMEOUT
    
    // Set up auto-lock timer
    autoLockTimer = setTimeout(() => {
        lockVault(session.id)
    }, session.vaultTimeout * 60 * 1000)
    
    // Register activity monitor
    activityMonitor.on("activity", () => {
        resetAutoLockTimer(autoLockTimer, session.vaultTimeout)
    })
```

### 5.3 Existing Vault Migration

```pseudocode
FUNCTION migrateExistingIdentityToVault(identityId: string, passphrase: string):
    // Check if identity exists without vault
    identity = getIdentity(identityId)
    IF identity.hasVault:
        THROW Error("Identity already has vault")
    
    // Create vault using same flow
    vaultResult = initializeVaultForExistingIdentity({
        identity: identity,
        passphrase: passphrase
    })
    
    // Update identity record
    updateIdentity(identityId, {
        hasVault: true,
        vaultId: vaultResult.vault.id
    })
    
    RETURN vaultResult
```

## 6. Security Considerations

### 6.1 Passphrase Display Security

```pseudocode
FUNCTION securePassphraseDisplay(passphrase: string, displayDuration: number):
    // Disable screenshots during display
    disableScreenCapture()
    
    // Show passphrase with countdown
    showPassphraseWithCountdown(passphrase, displayDuration)
    
    // Clear from display buffer
    clearDisplayBuffer()
    
    // Re-enable screenshots
    enableScreenCapture()
    
    // Log display event (not passphrase)
    logSecurityEvent("passphrase_displayed", {
        timestamp: getCurrentTimestamp(),
        duration: displayDuration
    })
```

### 6.2 Memory Security

```pseudocode
FUNCTION securePassphraseHandling(passphrase: string):
    // Allocate secure memory
    secureBuffer = allocateSecureMemory(passphrase.length)
    
    TRY:
        // Copy to secure memory
        copyToSecureMemory(secureBuffer, passphrase)
        
        // Clear original
        secureZeroMemory(passphrase)
        
        // Process passphrase
        result = processPassphrase(secureBuffer)
        
        RETURN result
        
    FINALLY:
        // Always clear secure memory
        secureZeroMemory(secureBuffer)
        freeSecureMemory(secureBuffer)
```

### 6.3 Timing Attack Prevention

```pseudocode
FUNCTION constantTimePassphraseValidation(input: string, stored: string):
    // Ensure constant time comparison
    inputHash = hashPassphrase(input)
    storedHash = hashPassphrase(stored)
    
    // Use constant time comparison
    result = constantTimeCompare(inputHash, storedHash)
    
    // Add random delay to prevent timing analysis
    randomDelay = getSecureRandom(1, 10)  // 1-10ms
    sleep(randomDelay)
    
    RETURN result
```