# Secure Authentication with Vault - Pseudocode Design

## 1. Identity Creation Flow

```pseudocode
FUNCTION createIdentity(request: CreateIdentityRequest) -> CreateIdentityResponse:
    // Input validation
    VALIDATE request.username matches pattern ^[a-zA-Z0-9_]{3,30}$
    VALIDATE request.email matches RFC5322 pattern
    VALIDATE request.password length >= 12 characters
    
    // Check uniqueness
    IF usernameExists(request.username) THEN
        THROW ValidationError("Username already taken")
    END IF
    
    IF emailExists(request.email) THEN
        THROW ValidationError("Email already registered")
    END IF
    
    // Generate secure user ID
    userId = generateUUID()
    
    // Hash password using Argon2id
    passwordHash = argon2id.hash(
        password: request.password,
        salt: generateSecureRandom(32),
        memory: 65536,        // 64 MB
        iterations: 3,
        parallelism: 4,
        hashLength: 32
    )
    
    // Generate or validate vault passphrase
    IF request.customPassphrase IS PROVIDED THEN
        passphraseStrength = validatePassphrase(request.customPassphrase)
        IF passphraseStrength.entropy < 128 THEN
            THROW ValidationError("Passphrase too weak, minimum 128 bits entropy required")
        END IF
        vaultPassphrase = request.customPassphrase
    ELSE
        vaultPassphrase = generateSecurePassphrase()
    END IF
    
    // Begin transaction
    BEGIN TRANSACTION:
        // Create user identity
        identity = UserIdentity{
            id: userId,
            username: request.username,
            email: request.email,
            emailVerified: false,
            createdAt: currentTimestamp(),
            updatedAt: currentTimestamp()
        }
        
        STORE identity IN database
        
        // Store password hash
        credentials = UserCredentials{
            userId: userId,
            passwordHash: passwordHash,
            mfaEnabled: false,
            createdAt: currentTimestamp()
        }
        
        STORE credentials IN database
        
        // Create encrypted vault
        vault = createVault(userId, vaultPassphrase)
        STORE vault IN database
        
        // Generate verification token
        verificationToken = generateSecureToken()
        STORE verificationToken WITH expiry = 24 hours
        
        // Send verification email asynchronously
        QUEUE sendVerificationEmail(identity.email, verificationToken)
        
    COMMIT TRANSACTION
    
    // Return response with passphrase (only time it's shown)
    RETURN CreateIdentityResponse{
        userId: userId,
        username: identity.username,
        vaultPassphrase: vaultPassphrase,
        passphraseDisplayWarning: "Save this passphrase securely. It cannot be recovered.",
        verificationRequired: true
    }
    
CATCH TransactionError:
    ROLLBACK TRANSACTION
    LOG error WITH context
    THROW SystemError("Failed to create identity")
END FUNCTION
```

## 2. Vault Passphrase Generation and Storage

```pseudocode
FUNCTION generateSecurePassphrase(options?: PassphraseOptions) -> string:
    // Default options
    wordCount = options?.wordCount ?? 6
    separator = options?.separator ?? "-"
    includeNumber = options?.includeNumber ?? true
    includeCapital = options?.includeCapital ?? true
    
    // Load word list (EFF long word list recommended)
    wordList = loadWordList("eff-long-wordlist")  // 7776 words
    
    passphrase = []
    
    // Generate random words
    FOR i = 1 TO wordCount:
        // Generate cryptographically secure random index
        randomBytes = crypto.getRandomValues(new Uint8Array(2))
        index = (randomBytes[0] << 8 | randomBytes[1]) % wordList.length
        
        word = wordList[index]
        
        // Optionally capitalize first letter
        IF includeCapital AND i == 1 THEN
            word = capitalize(word)
        END IF
        
        passphrase.APPEND(word)
    END FOR
    
    // Optionally add random number
    IF includeNumber THEN
        randomNumber = crypto.getRandomValues(new Uint8Array(1))[0]
        passphrase.APPEND(randomNumber.toString())
    END IF
    
    // Join with separator
    passphraseString = passphrase.JOIN(separator)
    
    // Validate entropy
    entropy = calculateEntropy(passphraseString, wordList.length)
    IF entropy < 128 THEN
        // Recursively generate new passphrase
        RETURN generateSecurePassphrase(options)
    END IF
    
    RETURN passphraseString
END FUNCTION

FUNCTION createVault(userId: string, passphrase: string) -> EncryptedVault:
    // Generate cryptographic parameters
    salt = crypto.getRandomValues(new Uint8Array(32))
    iv = crypto.getRandomValues(new Uint8Array(12))  // 96 bits for GCM
    
    // Derive encryption key from passphrase
    key = await deriveVaultKey(passphrase, salt)
    
    // Initialize empty vault
    vaultData = {
        version: 1,
        created: currentTimestamp(),
        data: {
            contacts: [],
            messages: [],
            files: [],
            settings: {
                theme: "light",
                notifications: true
            }
        }
    }
    
    // Serialize vault data
    vaultJson = JSON.stringify(vaultData)
    vaultBytes = new TextEncoder().encode(vaultJson)
    
    // Encrypt vault using AES-256-GCM
    encryptionResult = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
            tagLength: 128  // 128-bit auth tag
        },
        key,
        vaultBytes
    )
    
    // Extract ciphertext and auth tag
    ciphertext = encryptionResult.slice(0, -16)
    authTag = encryptionResult.slice(-16)
    
    // Create vault metadata
    metadata = VaultMetadata{
        id: generateUUID(),
        userId: userId,
        version: 1,
        algorithm: "AES-256-GCM",
        kdf: "PBKDF2-SHA256",
        kdfIterations: 100000,
        salt: base64Encode(salt),
        iv: base64Encode(iv),
        createdAt: currentTimestamp(),
        lastAccessedAt: currentTimestamp(),
        lastModifiedAt: currentTimestamp()
    }
    
    // Return encrypted vault
    RETURN EncryptedVault{
        metadata: metadata,
        encryptedData: base64Encode(ciphertext),
        authTag: base64Encode(authTag)
    }
END FUNCTION

FUNCTION deriveVaultKey(passphrase: string, salt: Uint8Array) -> CryptoKey:
    // Import passphrase as key material
    keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(passphrase),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
    )
    
    // Derive AES key using PBKDF2
    key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        {
            name: "AES-GCM",
            length: 256
        },
        false,  // Not extractable
        ["encrypt", "decrypt"]
    )
    
    RETURN key
END FUNCTION
```

## 3. Authentication Flow with Vault Access

```pseudocode
FUNCTION authenticate(credentials: AuthCredentials) -> AuthResult:
    // Rate limiting check
    attempts = getRateLimitCounter(credentials.identifier)
    IF attempts >= 5 THEN
        remainingTime = getRateLimitRemaining(credentials.identifier)
        THROW RateLimitError("Too many attempts. Try again in " + remainingTime + " seconds")
    END IF
    
    // Find user by username or email
    user = findUserByIdentifier(credentials.identifier)
    IF user IS NULL THEN
        incrementRateLimit(credentials.identifier)
        // Generic error to prevent user enumeration
        THROW AuthenticationError("Invalid credentials")
    END IF
    
    // Get stored credentials
    storedCreds = getCredentials(user.id)
    
    // Verify password
    passwordValid = await argon2id.verify(
        storedCreds.passwordHash,
        credentials.password
    )
    
    IF NOT passwordValid THEN
        incrementRateLimit(credentials.identifier)
        THROW AuthenticationError("Invalid credentials")
    END IF
    
    // Check if MFA is enabled
    IF storedCreds.mfaEnabled THEN
        IF credentials.mfaCode IS NULL THEN
            RETURN AuthResult{
                success: false,
                mfaRequired: true,
                mfaMethod: storedCreds.mfaMethod
            }
        END IF
        
        // Verify MFA code
        mfaValid = verifyMFACode(user.id, credentials.mfaCode)
        IF NOT mfaValid THEN
            incrementRateLimit(credentials.identifier)
            THROW AuthenticationError("Invalid MFA code")
        END IF
    END IF
    
    // Reset rate limit on successful auth
    resetRateLimit(credentials.identifier)
    
    // Create session
    session = createSession(user.id, credentials.deviceId)
    
    // Generate JWT tokens
    accessToken = generateAccessToken(user.id, session.id)
    refreshToken = generateRefreshToken(session.id)
    
    // Log authentication event
    logAuthEvent({
        userId: user.id,
        event: "LOGIN_SUCCESS",
        ipAddress: getClientIP(),
        userAgent: getUserAgent(),
        timestamp: currentTimestamp()
    })
    
    RETURN AuthResult{
        success: true,
        userId: user.id,
        sessionId: session.id,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: 900,  // 15 minutes
        vaultLocked: true,
        requiresVaultUnlock: true
    }
END FUNCTION

FUNCTION unlockVault(request: VaultAccessRequest) -> UnlockResult:
    // Validate session
    session = getSession(request.sessionId)
    IF session IS NULL OR session.expired THEN
        THROW SessionError("Invalid or expired session")
    END IF
    
    // Check vault unlock attempts for this session
    unlockAttempts = getVaultUnlockAttempts(session.id)
    IF unlockAttempts >= 3 THEN
        // Lock the session, require re-authentication
        invalidateSession(session.id)
        THROW SecurityError("Too many failed attempts. Please login again.")
    END IF
    
    // Get user's encrypted vault
    vault = getVault(session.userId)
    IF vault IS NULL THEN
        THROW DataError("Vault not found")
    END IF
    
    TRY:
        // Attempt to decrypt vault
        decryptedData = await decryptVault(vault, request.passphrase)
        
        // Update session with vault unlock status
        session.vaultUnlocked = true
        session.vaultUnlockedAt = currentTimestamp()
        updateSession(session)
        
        // Reset unlock attempts
        resetVaultUnlockAttempts(session.id)
        
        // Set vault lock timer
        scheduleVaultLock(session.id, session.vaultLockTimeout)
        
        // Update vault access timestamp
        vault.metadata.lastAccessedAt = currentTimestamp()
        updateVaultMetadata(vault.metadata)
        
        // Log vault access
        logVaultEvent({
            userId: session.userId,
            vaultId: vault.metadata.id,
            event: "VAULT_UNLOCKED",
            sessionId: session.id,
            timestamp: currentTimestamp()
        })
        
        RETURN UnlockResult{
            success: true,
            vaultData: decryptedData,
            lockTimeout: session.vaultLockTimeout
        }
        
    CATCH DecryptionError:
        incrementVaultUnlockAttempts(session.id)
        attemptsRemaining = 3 - unlockAttempts - 1
        
        THROW VaultAccessError(
            "Incorrect passphrase. " + attemptsRemaining + " attempts remaining."
        )
    END TRY
END FUNCTION

FUNCTION decryptVault(vault: EncryptedVault, passphrase: string) -> any:
    // Decode base64 parameters
    salt = base64Decode(vault.metadata.salt)
    iv = base64Decode(vault.metadata.iv)
    ciphertext = base64Decode(vault.encryptedData)
    authTag = base64Decode(vault.authTag)
    
    // Combine ciphertext and auth tag for GCM
    encryptedData = concatenate(ciphertext, authTag)
    
    // Derive key from passphrase
    key = await deriveVaultKey(passphrase, salt)
    
    TRY:
        // Decrypt using AES-256-GCM
        decryptedBytes = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128
            },
            key,
            encryptedData
        )
        
        // Parse decrypted JSON
        vaultJson = new TextDecoder().decode(decryptedBytes)
        vaultData = JSON.parse(vaultJson)
        
        // Verify vault version compatibility
        IF vaultData.version > SUPPORTED_VAULT_VERSION THEN
            THROW VersionError("Vault version not supported")
        END IF
        
        RETURN vaultData
        
    CATCH CryptoError:
        // Clear key from memory
        crypto.subtle.destroyKey(key)
        THROW DecryptionError("Failed to decrypt vault")
    END TRY
END FUNCTION

FUNCTION refreshAccessToken(refreshToken: string) -> AuthToken:
    // Validate refresh token
    tokenData = validateRefreshToken(refreshToken)
    IF tokenData IS NULL THEN
        THROW AuthenticationError("Invalid refresh token")
    END IF
    
    // Get associated session
    session = getSession(tokenData.sessionId)
    IF session IS NULL OR session.expired THEN
        THROW SessionError("Session expired")
    END IF
    
    // Check if refresh token is still valid
    IF tokenData.expiresAt < currentTimestamp() THEN
        THROW TokenError("Refresh token expired")
    END IF
    
    // Rotate refresh token (one-time use)
    revokeRefreshToken(refreshToken)
    newRefreshToken = generateRefreshToken(session.id)
    
    // Generate new access token
    newAccessToken = generateAccessToken(session.userId, session.id)
    
    // Update session activity
    session.lastActivityAt = currentTimestamp()
    updateSession(session)
    
    RETURN AuthToken{
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,  // 15 minutes
        tokenType: "Bearer"
    }
END FUNCTION

FUNCTION lockVault(sessionId: string) -> void:
    session = getSession(sessionId)
    IF session IS NULL THEN
        RETURN  // Session already gone
    END IF
    
    // Clear vault unlock status
    session.vaultUnlocked = false
    session.vaultUnlockedAt = null
    updateSession(session)
    
    // Clear any cached vault data
    clearVaultCache(session.userId)
    
    // Log vault lock event
    logVaultEvent({
        userId: session.userId,
        event: "VAULT_LOCKED",
        sessionId: sessionId,
        reason: "timeout",
        timestamp: currentTimestamp()
    })
END FUNCTION
```

## 4. Helper Functions and Utilities

```pseudocode
FUNCTION validatePassphrase(passphrase: string) -> PassphraseStrength:
    // Calculate entropy
    charsetSize = 0
    hasLowercase = /[a-z]/.test(passphrase)
    hasUppercase = /[A-Z]/.test(passphrase)
    hasNumbers = /[0-9]/.test(passphrase)
    hasSymbols = /[^a-zA-Z0-9]/.test(passphrase)
    
    IF hasLowercase THEN charsetSize += 26
    IF hasUppercase THEN charsetSize += 26
    IF hasNumbers THEN charsetSize += 10
    IF hasSymbols THEN charsetSize += 32
    
    entropy = passphrase.length * Math.log2(charsetSize)
    
    // Check against common patterns
    hasCommonPattern = checkCommonPatterns(passphrase)
    hasDictionaryWords = checkDictionaryWords(passphrase)
    
    // Calculate strength score
    strength = "weak"
    IF entropy >= 60 AND NOT hasCommonPattern THEN strength = "fair"
    IF entropy >= 80 AND NOT hasDictionaryWords THEN strength = "good"
    IF entropy >= 100 THEN strength = "strong"
    IF entropy >= 128 THEN strength = "excellent"
    
    RETURN PassphraseStrength{
        entropy: entropy,
        strength: strength,
        hasCommonPattern: hasCommonPattern,
        hasDictionaryWords: hasDictionaryWords,
        suggestions: generateStrengthSuggestions(strength, entropy)
    }
END FUNCTION

FUNCTION generateSecureToken(length: number = 32) -> string:
    bytes = crypto.getRandomValues(new Uint8Array(length))
    RETURN base64URLEncode(bytes)
END FUNCTION

FUNCTION constantTimeCompare(a: string, b: string) -> boolean:
    IF a.length != b.length THEN
        RETURN false
    END IF
    
    result = 0
    FOR i = 0 TO a.length - 1:
        result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    END FOR
    
    RETURN result == 0
END FUNCTION

FUNCTION secureErase(data: any) -> void:
    IF data IS string THEN
        // Overwrite string in memory
        FOR i = 0 TO data.length - 1:
            data[i] = '\0'
        END FOR
    ELSE IF data IS ArrayBuffer OR Uint8Array THEN
        // Zero out buffer
        crypto.getRandomValues(data)  // Random overwrite
        data.fill(0)                  // Zero overwrite
    END IF
    
    // Suggest garbage collection
    IF global.gc THEN
        global.gc()
    END IF
END FUNCTION

FUNCTION createSession(userId: string, deviceId?: string) -> AuthSession:
    session = AuthSession{
        id: generateUUID(),
        userId: userId,
        createdAt: currentTimestamp(),
        expiresAt: currentTimestamp() + (7 * 24 * 60 * 60 * 1000),  // 7 days
        lastActivityAt: currentTimestamp(),
        ipAddress: getClientIP(),
        userAgent: getUserAgent(),
        deviceId: deviceId,
        vaultUnlocked: false,
        vaultLockTimeout: 15  // 15 minutes default
    }
    
    // Store in Redis with expiry
    redis.setex(
        key: "session:" + session.id,
        ttl: 7 * 24 * 60 * 60,  // 7 days in seconds
        value: JSON.stringify(session)
    )
    
    // Add to user's session list
    redis.sadd("user:sessions:" + userId, session.id)
    
    RETURN session
END FUNCTION

FUNCTION generateAccessToken(userId: string, sessionId: string) -> string:
    payload = {
        sub: userId,
        sid: sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,  // 15 minutes
        type: "access"
    }
    
    RETURN jwt.sign(payload, ACCESS_TOKEN_SECRET, { algorithm: "ES256" })
END FUNCTION

FUNCTION generateRefreshToken(sessionId: string) -> string:
    token = generateSecureToken(32)
    
    // Store refresh token with metadata
    redis.setex(
        key: "refresh:" + token,
        ttl: 7 * 24 * 60 * 60,  // 7 days
        value: JSON.stringify({
            sessionId: sessionId,
            createdAt: currentTimestamp(),
            expiresAt: currentTimestamp() + (7 * 24 * 60 * 60 * 1000)
        })
    )
    
    RETURN token
END FUNCTION
```

## 5. Security Considerations in Implementation

```pseudocode
// Timing attack prevention
FUNCTION securePasswordCompare(provided: string, stored: string) -> boolean:
    // Always hash the provided password even if user doesn't exist
    dummyHash = "$argon2id$v=19$m=65536,t=3,p=4$..."  // Pre-computed dummy
    hashToVerify = stored ?? dummyHash
    
    result = argon2id.verify(hashToVerify, provided)
    
    // Add random delay to normalize timing
    randomDelay = crypto.getRandomValues(new Uint8Array(1))[0]
    sleep(randomDelay / 255 * 100)  // 0-100ms random delay
    
    RETURN result AND stored != null
END FUNCTION

// Memory protection for sensitive data
CLASS SecureString:
    PRIVATE data: Uint8Array
    PRIVATE length: number
    
    CONSTRUCTOR(value: string):
        this.length = value.length
        this.data = new TextEncoder().encode(value)
    END CONSTRUCTOR
    
    METHOD getValue() -> string:
        RETURN new TextDecoder().decode(this.data)
    END METHOD
    
    METHOD destroy():
        crypto.getRandomValues(this.data)
        this.data.fill(0)
        this.length = 0
    END METHOD
END CLASS

// Audit logging with privacy
FUNCTION logSecurityEvent(event: SecurityEvent) -> void:
    // Anonymize sensitive data
    sanitizedEvent = {
        timestamp: event.timestamp,
        eventType: event.type,
        userId: hash(event.userId),  // One-way hash for privacy
        ipAddress: maskIP(event.ipAddress),  // Mask last octet
        userAgent: generalizeUserAgent(event.userAgent),
        success: event.success,
        metadata: sanitizeMetadata(event.metadata)
    }
    
    // Write to append-only audit log
    auditLogger.write(sanitizedEvent)
    
    // Alert on suspicious patterns
    IF detectSuspiciousPattern(event) THEN
        alertSecurityTeam(event)
    END IF
END FUNCTION
```