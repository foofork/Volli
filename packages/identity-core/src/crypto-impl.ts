/**
 * Crypto implementation module
 * This contains the actual implementations that combine different crypto modules
 * without creating circular dependencies
 */

import { KeyPair, PublicKey, PrivateKey, EncapsulationResult } from './crypto-types';
import { generateHybridKeyPairWithKyber768, hybridKeyEncapsulation, hybridKeyDecapsulation } from './kyber';
import { keyEncapsulation as classicalKeyEncapsulation, keyDecapsulation as classicalKeyDecapsulation } from './crypto';

/**
 * Generate a full hybrid key pair with post-quantum and classical algorithms
 */
export async function generateHybridKeyPair(): Promise<KeyPair> {
  return generateHybridKeyPairWithKyber768();
}

/**
 * Perform hybrid key encapsulation
 */
export async function performHybridKeyEncapsulation(publicKey: PublicKey): Promise<{
  sharedSecret: Uint8Array;
  ciphertext: Uint8Array;
}> {
  const result = await hybridKeyEncapsulation(publicKey);
  
  // Combine both ciphertexts into a single array for backward compatibility
  const combinedCiphertext = new Uint8Array(result.ciphertext.length + result.classicalCiphertext.length + 4);
  const view = new DataView(combinedCiphertext.buffer);
  
  // Store the length of the Kyber ciphertext in the first 4 bytes
  view.setUint32(0, result.ciphertext.length, true);
  combinedCiphertext.set(result.ciphertext, 4);
  combinedCiphertext.set(result.classicalCiphertext, 4 + result.ciphertext.length);
  
  return {
    sharedSecret: result.sharedSecret,
    ciphertext: combinedCiphertext
  };
}

/**
 * Perform hybrid key decapsulation
 */
export async function performHybridKeyDecapsulation(
  privateKey: PrivateKey,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  // Check if this is a hybrid ciphertext (has the length prefix)
  if (ciphertext.length > 32 && ciphertext.length > 4) {
    const view = new DataView(ciphertext.buffer, ciphertext.byteOffset);
    const kyberCiphertextLength = view.getUint32(0, true);
    
    // Validate the length to ensure this is a hybrid ciphertext
    if (kyberCiphertextLength > 0 && kyberCiphertextLength < ciphertext.length - 4) {
      const kyberCiphertext = ciphertext.slice(4, 4 + kyberCiphertextLength);
      const classicalCiphertext = ciphertext.slice(4 + kyberCiphertextLength);
      
      // Use hybrid key decapsulation
      return await hybridKeyDecapsulation(privateKey, kyberCiphertext, classicalCiphertext);
    }
  }
  
  // Fall back to classical decapsulation for legacy ciphertexts
  return await classicalKeyDecapsulation(privateKey, ciphertext);
}

// Re-export the main crypto functions for convenience
export { 
  initCrypto,
  signData,
  verifySignature,
  encryptData,
  decryptData,
  deriveKeyFromPassword,
  deriveSessionKeys,
  randomBytes,
  secureWipe,
  constantTimeEqual,
  generateSalt,
  generateKeyFromPassphrase
} from './crypto';