# Web App Implementation Pseudocode

## 1. Auth Store Implementation (Real Integration)

```pseudocode
// auth.ts - Replace mock implementation with real auth flow

INTERFACE AuthStore:
    isAuthenticated: boolean
    currentIdentity: Identity | null
    vaultUnlocked: boolean
    sessionToken: string | null
    
    // Methods
    createIdentity(displayName: string) -> Promise<CreateIdentityResult>
    createVaultWithPassphrase(passphrase: string) -> Promise<void>
    unlockVault(passphrase: string) -> Promise<boolean>
    lockVault() -> void
    logout() -> void
    checkSession() -> Promise<boolean>

FUNCTION createIdentity(displayName: string) -> CreateIdentityResult:
    // Validate display name
    IF displayName.length < 3 OR displayName.length > 30 THEN
        THROW ValidationError("Display name must be 3-30 characters")
    END IF
    
    // Generate secure identity ID
    identityId = generateSecureId()
    
    // Create identity object
    identity = {
        id: identityId,
        displayName: displayName,
        createdAt: Date.now(),
        publicKey: null,  // Will be generated with vault
        encryptedPrivateKey: null
    }
    
    // Store in IndexedDB temporarily
    await db.identities.put(identity)
    
    // Set partial auth state
    this.currentIdentity = identity
    this.isAuthenticated = false  // Not authenticated until vault created
    
    RETURN {
        identity: identity,
        requiresVaultCreation: true
    }
END FUNCTION

FUNCTION createVaultWithPassphrase(passphrase: string) -> void:
    // Validate passphrase strength
    strength = validatePassphraseStrength(passphrase)
    IF strength.entropy < 128 THEN
        THROW SecurityError("Passphrase too weak. Minimum 128 bits entropy required")
    END IF
    
    // Generate cryptographic keys
    keyPair = await generateKeyPair()
    
    // Derive vault key from passphrase
    salt = crypto.getRandomValues(new Uint8Array(32))
    vaultKey = await deriveKey(passphrase, salt, {
        iterations: 100000,
        keyLength: 256
    })
    
    // Encrypt private key with vault key
    encryptedPrivateKey = await encryptPrivateKey(keyPair.privateKey, vaultKey)
    
    // Update identity with keys
    this.currentIdentity.publicKey = keyPair.publicKey
    this.currentIdentity.encryptedPrivateKey = encryptedPrivateKey
    
    // Create vault structure
    vault = {
        id: generateSecureId(),
        identityId: this.currentIdentity.id,
        version: 1,
        salt: salt,
        encryptedData: await encryptVaultData(initialVaultData(), vaultKey),
        createdAt: Date.now(),
        lastModified: Date.now()
    }
    
    // Store vault and updated identity
    await db.vaults.put(vault)
    await db.identities.put(this.currentIdentity)
    
    // Generate session token
    this.sessionToken = generateSessionToken()
    
    // Set authenticated state
    this.isAuthenticated = true
    this.vaultUnlocked = true
    
    // Set auto-lock timer
    this.startAutoLockTimer()
    
    // Clear passphrase from memory
    secureErase(passphrase)
END FUNCTION

FUNCTION unlockVault(passphrase: string) -> boolean:
    IF NOT this.currentIdentity THEN
        THROW StateError("No identity loaded")
    END IF
    
    // Get vault from storage
    vault = await db.vaults.where('identityId').equals(this.currentIdentity.id).first()
    IF NOT vault THEN
        THROW DataError("Vault not found")
    END IF
    
    TRY:
        // Derive key from passphrase
        vaultKey = await deriveKey(passphrase, vault.salt, {
            iterations: 100000,
            keyLength: 256
        })
        
        // Attempt to decrypt vault
        decryptedData = await decryptVaultData(vault.encryptedData, vaultKey)
        
        // Verify decryption succeeded
        IF NOT verifyVaultIntegrity(decryptedData) THEN
            THROW DecryptionError("Vault integrity check failed")
        END IF
        
        // Cache decrypted data in memory
        this.vaultCache = decryptedData
        this.vaultUnlocked = true
        
        // Update last accessed
        vault.lastAccessed = Date.now()
        await db.vaults.put(vault)
        
        // Start auto-lock timer
        this.startAutoLockTimer()
        
        // Clear passphrase from memory
        secureErase(passphrase)
        
        RETURN true
        
    CATCH DecryptionError:
        // Increment failed attempts
        this.failedUnlockAttempts++
        
        IF this.failedUnlockAttempts >= 3 THEN
            // Lock out after 3 failed attempts
            this.logout()
            THROW SecurityError("Too many failed attempts. Please log in again")
        END IF
        
        RETURN false
    END TRY
END FUNCTION
```

## 2. Vault Store Implementation

```pseudocode
// vault.ts - Real vault operations

INTERFACE VaultStore:
    isUnlocked: boolean
    autoLockTimeout: number  // minutes
    lastActivity: number
    
    // Methods
    getContacts() -> Promise<Contact[]>
    addContact(contact: Contact) -> Promise<void>
    getMessages(conversationId: string) -> Promise<Message[]>
    sendMessage(conversationId: string, content: string) -> Promise<Message>
    storeFile(file: File) -> Promise<string>
    getFile(fileId: string) -> Promise<Blob>
    updateSettings(settings: Partial<Settings>) -> Promise<void>
    
FUNCTION getDecryptedVault() -> VaultData:
    IF NOT authStore.vaultUnlocked THEN
        THROW VaultLockedError("Vault is locked")
    END IF
    
    // Get cached vault data
    vaultData = authStore.vaultCache
    IF NOT vaultData THEN
        THROW StateError("Vault data not available")
    END IF
    
    // Update last activity
    this.lastActivity = Date.now()
    
    RETURN vaultData
END FUNCTION

FUNCTION saveVault(vaultData: VaultData) -> void:
    IF NOT authStore.vaultUnlocked THEN
        THROW VaultLockedError("Cannot save to locked vault")
    END IF
    
    // Get current vault
    vault = await db.vaults.where('identityId').equals(authStore.currentIdentity.id).first()
    
    // Re-encrypt with current key
    vaultKey = authStore.getCachedVaultKey()  // Securely cached in memory
    vault.encryptedData = await encryptVaultData(vaultData, vaultKey)
    vault.lastModified = Date.now()
    
    // Save to IndexedDB
    await db.vaults.put(vault)
    
    // Update cache
    authStore.vaultCache = vaultData
    this.lastActivity = Date.now()
END FUNCTION

FUNCTION sendMessage(conversationId: string, content: string) -> Message:
    vaultData = await this.getDecryptedVault()
    
    // Find or create conversation
    conversation = vaultData.conversations.find(c => c.id === conversationId)
    IF NOT conversation THEN
        conversation = {
            id: conversationId,
            participants: [],
            messages: [],
            createdAt: Date.now()
        }
        vaultData.conversations.push(conversation)
    END IF
    
    // Create message
    message = {
        id: generateSecureId(),
        conversationId: conversationId,
        content: content,
        timestamp: Date.now(),
        sender: authStore.currentIdentity.id,
        encrypted: true,
        delivered: false,
        read: false
    }
    
    // Add to conversation
    conversation.messages.push(message)
    
    // Save vault
    await this.saveVault(vaultData)
    
    // TODO: Queue for P2P delivery when network available
    messageQueue.enqueue(message)
    
    RETURN message
END FUNCTION

FUNCTION storeFile(file: File) -> string:
    vaultData = await this.getDecryptedVault()
    
    // Check file size limit
    IF file.size > MAX_FILE_SIZE THEN
        THROW ValidationError("File too large. Maximum size: " + formatBytes(MAX_FILE_SIZE))
    END IF
    
    // Read file content
    fileContent = await readFileAsArrayBuffer(file)
    
    // Generate file ID
    fileId = generateSecureId()
    
    // Create file metadata
    fileMetadata = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: Date.now(),
        checksum: await calculateChecksum(fileContent)
    }
    
    // Encrypt file content separately
    fileKey = crypto.getRandomValues(new Uint8Array(32))
    encryptedContent = await encryptFile(fileContent, fileKey)
    
    // Store encrypted file in IndexedDB
    await db.files.put({
        id: fileId,
        encryptedContent: encryptedContent,
        uploadedAt: Date.now()
    })
    
    // Add file reference to vault with encrypted key
    vaultData.files.push({
        ...fileMetadata,
        encryptedKey: await wrapKey(fileKey, authStore.getCachedVaultKey())
    })
    
    // Save vault
    await this.saveVault(vaultData)
    
    // Clear sensitive data
    secureErase(fileContent)
    secureErase(fileKey)
    
    RETURN fileId
END FUNCTION
```

## 3. Messages Store Implementation

```pseudocode
// messages.ts - Real messaging implementation

INTERFACE MessagesStore:
    conversations: Conversation[]
    activeConversation: string | null
    syncStatus: SyncStatus
    
    // Methods
    loadConversations() -> Promise<void>
    createConversation(participants: string[]) -> Promise<Conversation>
    sendMessage(content: string) -> Promise<void>
    markAsRead(conversationId: string) -> Promise<void>
    syncMessages() -> Promise<void>

FUNCTION loadConversations() -> void:
    IF NOT vaultStore.isUnlocked THEN
        THROW VaultLockedError("Vault must be unlocked")
    END IF
    
    // Get conversations from vault
    vaultData = await vaultStore.getDecryptedVault()
    this.conversations = vaultData.conversations || []
    
    // Sort by most recent activity
    this.conversations.sort((a, b) => {
        lastMessageA = a.messages[a.messages.length - 1]?.timestamp || a.createdAt
        lastMessageB = b.messages[b.messages.length - 1]?.timestamp || b.createdAt
        RETURN lastMessageB - lastMessageA
    })
    
    // Check for pending sync
    IF networkStore.isOnline THEN
        this.syncMessages()
    END IF
END FUNCTION

FUNCTION createConversation(participants: string[]) -> Conversation:
    // Validate participants
    IF participants.length === 0 THEN
        THROW ValidationError("Conversation must have participants")
    END IF
    
    // Create conversation object
    conversation = {
        id: generateSecureId(),
        participants: [authStore.currentIdentity.id, ...participants],
        messages: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        unreadCount: 0
    }
    
    // Add to store
    this.conversations.unshift(conversation)
    
    // Save to vault
    vaultData = await vaultStore.getDecryptedVault()
    vaultData.conversations.push(conversation)
    await vaultStore.saveVault(vaultData)
    
    // Set as active
    this.activeConversation = conversation.id
    
    RETURN conversation
END FUNCTION

FUNCTION sendMessage(content: string) -> void:
    IF NOT this.activeConversation THEN
        THROW StateError("No active conversation")
    END IF
    
    // Find conversation
    conversation = this.conversations.find(c => c.id === this.activeConversation)
    IF NOT conversation THEN
        THROW DataError("Conversation not found")
    END IF
    
    // Encrypt message for each participant
    encryptedPayloads = []
    FOR participant IN conversation.participants:
        IF participant !== authStore.currentIdentity.id THEN
            // Get participant's public key
            publicKey = await contactStore.getPublicKey(participant)
            
            // Encrypt message
            encryptedContent = await encryptForRecipient(content, publicKey)
            
            encryptedPayloads.push({
                recipientId: participant,
                encryptedContent: encryptedContent
            })
        END IF
    END FOR
    
    // Create message
    message = {
        id: generateSecureId(),
        conversationId: conversation.id,
        sender: authStore.currentIdentity.id,
        content: content,  // Store plaintext for sender
        encryptedPayloads: encryptedPayloads,
        timestamp: Date.now(),
        delivered: false,
        read: false
    }
    
    // Add to conversation
    conversation.messages.push(message)
    conversation.lastActivity = Date.now()
    
    // Update UI immediately
    this.conversations = [...this.conversations]
    
    // Save to vault
    await vaultStore.sendMessage(conversation.id, message)
    
    // Queue for delivery
    IF networkStore.isOnline THEN
        await this.deliverMessage(message)
    ELSE
        messageQueue.enqueue(message)
    END IF
END FUNCTION

FUNCTION syncMessages() -> void:
    this.syncStatus = 'syncing'
    
    TRY:
        // Get sync endpoint (IPFS or relay)
        syncEndpoint = await networkStore.getSyncEndpoint()
        
        // Get last sync timestamp
        lastSync = await db.syncMetadata.get('lastMessageSync')
        
        // Fetch new messages since last sync
        newMessages = await syncEndpoint.getMessages({
            identityId: authStore.currentIdentity.id,
            since: lastSync?.timestamp || 0
        })
        
        // Process each message
        FOR encryptedMessage IN newMessages:
            // Decrypt message
            message = await decryptIncomingMessage(encryptedMessage)
            
            // Find or create conversation
            conversation = this.findOrCreateConversation(message.conversationId)
            
            // Add message if not duplicate
            IF NOT conversation.messages.find(m => m.id === message.id) THEN
                conversation.messages.push(message)
                conversation.unreadCount++
                conversation.lastActivity = message.timestamp
            END IF
        END FOR
        
        // Send pending messages
        pendingMessages = await messageQueue.getPending()
        FOR message IN pendingMessages:
            await this.deliverMessage(message)
            messageQueue.markDelivered(message.id)
        END FOR
        
        // Update sync metadata
        await db.syncMetadata.put({
            key: 'lastMessageSync',
            timestamp: Date.now()
        })
        
        this.syncStatus = 'synced'
        
    CATCH error:
        this.syncStatus = 'error'
        console.error('Sync failed:', error)
    END TRY
END FUNCTION
```

## 4. UI Component Tests Pseudocode

```pseudocode
// Component testing approach

FUNCTION testAuthFlow():
    // Test identity creation
    TEST "should create identity with valid display name":
        renderComponent(AuthPage)
        
        input = getByLabelText('Display Name')
        button = getByText('Continue')
        
        // Enter display name
        await userEvent.type(input, 'Test User')
        await userEvent.click(button)
        
        // Should show passphrase screen
        EXPECT(getByText('Create Vault Passphrase')).toBeInTheDocument()
    END TEST
    
    // Test passphrase validation
    TEST "should validate passphrase strength":
        renderComponent(PassphraseCreation)
        
        input = getByLabelText('Passphrase')
        
        // Test weak passphrase
        await userEvent.type(input, 'weak')
        EXPECT(getByText('Too weak')).toBeInTheDocument()
        
        // Test strong passphrase
        await userEvent.clear(input)
        await userEvent.type(input, 'correct-horse-battery-staple-quantum-resistant')
        EXPECT(getByText('Excellent')).toBeInTheDocument()
    END TEST
    
    // Test vault unlock
    TEST "should unlock vault with correct passphrase":
        // Setup: Create identity and vault
        await authStore.createIdentity('Test User')
        await authStore.createVaultWithPassphrase('test-passphrase-123')
        authStore.lockVault()
        
        renderComponent(VaultUnlock)
        
        input = getByLabelText('Enter passphrase')
        button = getByText('Unlock')
        
        // Wrong passphrase
        await userEvent.type(input, 'wrong-passphrase')
        await userEvent.click(button)
        EXPECT(getByText('Incorrect passphrase')).toBeInTheDocument()
        
        // Correct passphrase
        await userEvent.clear(input)
        await userEvent.type(input, 'test-passphrase-123')
        await userEvent.click(button)
        
        // Should redirect to app
        EXPECT(mockNavigate).toHaveBeenCalledWith('/app')
    END TEST
END FUNCTION

FUNCTION testMessagingFlow():
    // Test conversation creation
    TEST "should create new conversation":
        renderComponent(MessagesPage)
        
        button = getByText('New Conversation')
        await userEvent.click(button)
        
        // Select contact
        contact = getByText('Alice')
        await userEvent.click(contact)
        
        createButton = getByText('Create')
        await userEvent.click(createButton)
        
        // Should show new conversation
        EXPECT(getByText('Conversation with Alice')).toBeInTheDocument()
    END TEST
    
    // Test message sending
    TEST "should send and display message":
        renderComponent(MessageComposer)
        
        input = getByPlaceholderText('Type a message...')
        sendButton = getByLabelText('Send')
        
        // Type and send message
        await userEvent.type(input, 'Hello, this is a test message')
        await userEvent.click(sendButton)
        
        // Message should appear
        EXPECT(getByText('Hello, this is a test message')).toBeInTheDocument()
        
        // Input should be cleared
        EXPECT(input.value).toBe('')
        
        // Should show encryption indicator
        EXPECT(getByLabelText('Encrypted')).toBeInTheDocument()
    END TEST
END FUNCTION

FUNCTION testFileUpload():
    TEST "should upload and encrypt file":
        renderComponent(FilesPage)
        
        fileInput = getByLabelText('Upload file')
        
        // Create test file
        file = new File(['test content'], 'test.txt', { type: 'text/plain' })
        
        // Upload file
        await userEvent.upload(fileInput, file)
        
        // Should show progress
        EXPECT(getByText('Uploading...')).toBeInTheDocument()
        
        // Wait for completion
        await waitFor(() => {
            EXPECT(getByText('test.txt')).toBeInTheDocument()
            EXPECT(getByText('Encrypted')).toBeInTheDocument()
        })
    END TEST
END FUNCTION

FUNCTION testAutoLock():
    TEST "should auto-lock vault after timeout":
        // Setup: Set short timeout for testing
        vaultStore.autoLockTimeout = 0.1  // 6 seconds for test
        
        renderComponent(App)
        
        // Vault should be unlocked
        EXPECT(vaultStore.isUnlocked).toBe(true)
        
        // Wait for timeout
        await wait(7000)
        
        // Vault should be locked
        EXPECT(vaultStore.isUnlocked).toBe(false)
        
        // Should show unlock screen
        EXPECT(getByText('Vault Locked')).toBeInTheDocument()
    END TEST
END FUNCTION
```

## 5. Integration Test Flows

```pseudocode
// End-to-end user flows

FUNCTION testCompleteUserFlow():
    TEST "complete user journey from signup to messaging":
        // 1. Create identity
        await page.goto('/auth')
        await page.fill('[name="displayName"]', 'Test User')
        await page.click('button:has-text("Continue")')
        
        // 2. Create vault passphrase
        await page.fill('[name="passphrase"]', 'secure-test-passphrase-123')
        await page.fill('[name="confirmPassphrase"]', 'secure-test-passphrase-123')
        await page.click('button:has-text("Create Vault")')
        
        // 3. Should redirect to app
        await expect(page).toHaveURL('/app')
        
        // 4. Create conversation
        await page.click('button:has-text("New Conversation")')
        await page.click('text=Demo Contact')
        await page.click('button:has-text("Start Conversation")')
        
        // 5. Send message
        await page.fill('[placeholder="Type a message..."]', 'Hello from e2e test')
        await page.click('button[aria-label="Send"]')
        
        // 6. Verify message appears
        await expect(page.locator('text=Hello from e2e test')).toBeVisible()
        
        // 7. Lock vault
        await page.click('button[aria-label="Lock vault"]')
        
        // 8. Unlock vault
        await page.fill('[name="passphrase"]', 'secure-test-passphrase-123')
        await page.click('button:has-text("Unlock")')
        
        // 9. Verify messages still there
        await expect(page.locator('text=Hello from e2e test')).toBeVisible()
    END TEST
END FUNCTION

FUNCTION testSecurityFeatures():
    TEST "should enforce security requirements":
        // Test session timeout
        await createAuthenticatedSession()
        
        // Wait for session to expire
        await page.waitForTimeout(SESSION_TIMEOUT + 1000)
        
        // Any action should redirect to login
        await page.click('button:has-text("New Message")')
        await expect(page).toHaveURL('/auth')
        
        // Test failed unlock attempts
        await authenticateUser()
        await lockVault()
        
        // Try wrong passphrase 3 times
        FOR i = 1 TO 3:
            await page.fill('[name="passphrase"]', 'wrong-passphrase')
            await page.click('button:has-text("Unlock")')
        END FOR
        
        // Should be logged out
        await expect(page).toHaveURL('/auth')
        await expect(page.locator('text=Too many failed attempts')).toBeVisible()
    END TEST
END FUNCTION
```

## 6. Testing Utilities

```pseudocode
// Helper functions for tests

FUNCTION mockCrypto():
    // Mock Web Crypto API for tests
    global.crypto = {
        getRandomValues: (array) => {
            FOR i = 0 TO array.length - 1:
                array[i] = Math.floor(Math.random() * 256)
            END FOR
            RETURN array
        },
        subtle: {
            generateKey: async () => ({
                publicKey: 'mock-public-key',
                privateKey: 'mock-private-key'
            }),
            encrypt: async (algorithm, key, data) => {
                RETURN new Uint8Array([...data, 1, 2, 3])  // Mock encryption
            },
            decrypt: async (algorithm, key, data) => {
                RETURN data.slice(0, -3)  // Mock decryption
            }
        }
    }
END FUNCTION

FUNCTION createMockIdentity():
    RETURN {
        id: 'test-identity-123',
        displayName: 'Test User',
        publicKey: 'mock-public-key',
        createdAt: Date.now()
    }
END FUNCTION

FUNCTION waitForVaultUnlock():
    RETURN waitFor(() => {
        EXPECT(vaultStore.isUnlocked).toBe(true)
    }, { timeout: 5000 })
END FUNCTION
```