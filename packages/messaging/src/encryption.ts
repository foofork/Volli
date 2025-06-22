import sodium from 'libsodium-wrappers';
import { Message, MessageContent, EncryptionInfo } from './types';

/**
 * Message encryption and decryption utilities
 */

// Initialize sodium
let sodiumReady = false;

export async function initEncryption(): Promise<void> {
  if (!sodiumReady) {
    await sodium.ready;
    sodiumReady = true;
  }
}

/**
 * Encrypt message content for transmission
 */
export async function encryptMessage(
  content: MessageContent,
  sessionKey: Uint8Array,
  keyId: string
): Promise<{ encryptedContent: Uint8Array; encryptionInfo: EncryptionInfo }> {
  await initEncryption();
  
  // Serialize content
  const serialized = JSON.stringify(content);
  const data = new TextEncoder().encode(serialized);
  
  // Generate nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  
  // Encrypt data
  const encryptedContent = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    data, 
    null, 
    null, 
    nonce, 
    sessionKey
  );
  
  // Create checksum
  const checksum = sodium.crypto_generichash(32, encryptedContent);
  
  const encryptionInfo: EncryptionInfo = {
    algorithm: 'XChaCha20-Poly1305',
    keyId,
    nonce: Buffer.from(nonce).toString('base64'),
    encryptedSize: encryptedContent.length,
    checksum: Buffer.from(checksum).toString('hex'),
    version: 1
  };
  
  return { encryptedContent, encryptionInfo };
}

/**
 * Decrypt message content
 */
export async function decryptMessage(
  encryptedContent: Uint8Array,
  encryptionInfo: EncryptionInfo,
  sessionKey: Uint8Array
): Promise<MessageContent> {
  await initEncryption();
  
  // Verify checksum
  const checksum = sodium.crypto_generichash(32, encryptedContent);
  const expectedChecksum = Buffer.from(encryptionInfo.checksum, 'hex');
  
  if (!sodium.memcmp(checksum, expectedChecksum)) {
    throw new Error('Message integrity check failed');
  }
  
  // Extract nonce
  const nonce = Buffer.from(encryptionInfo.nonce, 'base64');
  
  // Decrypt data
  const decryptedData = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    encryptedContent,
    null,
    nonce,
    sessionKey
  );
  
  // Parse content
  const serialized = new TextDecoder().decode(decryptedData);
  return JSON.parse(serialized);
}

/**
 * Encrypt message for storage (using storage key)
 */
export async function encryptMessageForStorage(
  message: Message,
  storageKey: Uint8Array
): Promise<Uint8Array> {
  await initEncryption();
  
  // Serialize message
  const serialized = JSON.stringify(message);
  const data = new TextEncoder().encode(serialized);
  
  // Generate nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  
  // Encrypt
  const encrypted = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    data,
    null,
    null,
    nonce,
    storageKey
  );
  
  // Combine nonce and encrypted data
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce, 0);
  combined.set(encrypted, nonce.length);
  
  return combined;
}

/**
 * Decrypt message from storage
 */
export async function decryptMessageFromStorage(
  encryptedData: Uint8Array,
  storageKey: Uint8Array
): Promise<Message> {
  await initEncryption();
  
  // Extract nonce and ciphertext
  const nonceLength = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  const nonce = encryptedData.slice(0, nonceLength);
  const ciphertext = encryptedData.slice(nonceLength);
  
  // Decrypt
  const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    null,
    nonce,
    storageKey
  );
  
  // Parse message
  const serialized = new TextDecoder().decode(decrypted);
  return JSON.parse(serialized);
}

/**
 * Generate ephemeral message key
 */
export function generateEphemeralKey(): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Encryption not initialized');
  }
  
  return sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
}

/**
 * Derive message key from session key and message ID
 */
export function deriveMessageKey(sessionKey: Uint8Array, messageId: string): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Encryption not initialized');
  }
  
  const messageIdBytes = new TextEncoder().encode(messageId);
  
  return sodium.crypto_kdf_derive_from_key(
    32, // key length
    1,  // subkey id
    'VOLLI_MSG',
    sessionKey,
    messageIdBytes.slice(0, 16) // context must be 16 bytes
  );
}

/**
 * Create message authentication code
 */
export function createMessageMAC(message: Message, macKey: Uint8Array): string {
  if (!sodiumReady) {
    throw new Error('Encryption not initialized');
  }
  
  // Create canonical message representation for MAC
  const canonical = {
    id: message.id,
    type: message.type,
    content: message.content,
    senderId: message.metadata.senderId,
    recipientIds: message.metadata.recipientIds.sort(),
    conversationId: message.metadata.conversationId,
    createdAt: message.createdAt
  };
  
  const data = new TextEncoder().encode(JSON.stringify(canonical));
  const mac = sodium.crypto_auth(data, macKey);
  
  return Buffer.from(mac).toString('hex');
}

/**
 * Verify message authentication code
 */
export function verifyMessageMAC(message: Message, mac: string, macKey: Uint8Array): boolean {
  if (!sodiumReady) {
    throw new Error('Encryption not initialized');
  }
  
  try {
    const expectedMAC = createMessageMAC(message, macKey);
    return sodium.memcmp(
      Buffer.from(mac, 'hex'),
      Buffer.from(expectedMAC, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Encrypt file attachment
 */
export async function encryptAttachment(
  fileData: Uint8Array,
  sessionKey: Uint8Array
): Promise<{
  encryptedData: Uint8Array;
  key: Uint8Array;
  nonce: string;
  checksum: string;
}> {
  await initEncryption();
  
  // Generate file-specific key
  const fileKey = sodium.crypto_kdf_derive_from_key(32, 1, 'VOLLI_FILE', sessionKey);
  
  // Generate nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  
  // Encrypt file
  const encryptedData = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    fileData,
    null,
    null,
    nonce,
    fileKey
  );
  
  // Create checksum
  const checksum = sodium.crypto_generichash(32, encryptedData);
  
  return {
    encryptedData,
    key: fileKey,
    nonce: Buffer.from(nonce).toString('base64'),
    checksum: Buffer.from(checksum).toString('hex')
  };
}

/**
 * Decrypt file attachment
 */
export async function decryptAttachment(
  encryptedData: Uint8Array,
  key: Uint8Array,
  nonce: string,
  expectedChecksum: string
): Promise<Uint8Array> {
  await initEncryption();
  
  // Verify checksum
  const checksum = sodium.crypto_generichash(32, encryptedData);
  const checksumBuffer = Buffer.from(expectedChecksum, 'hex');
  
  if (!sodium.memcmp(checksum, checksumBuffer)) {
    throw new Error('File integrity check failed');
  }
  
  // Decrypt
  const nonceBuffer = Buffer.from(nonce, 'base64');
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    encryptedData,
    null,
    nonceBuffer,
    key
  );
}

/**
 * Secure wipe of sensitive data
 */
export function secureWipe(data: Uint8Array): void {
  if (!sodiumReady) {
    return;
  }
  
  sodium.memzero(data);
}