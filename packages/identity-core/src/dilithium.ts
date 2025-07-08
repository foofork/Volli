/**
 * ML-DSA-65 (Dilithium) Post-Quantum Digital Signature Algorithm
 * 
 * This module implements ML-DSA-65 (formerly CRYSTALS-Dilithium) using a 
 * high-performance Rust WASM implementation, providing quantum-resistant
 * digital signatures for Volly's secure communication.
 * 
 * ML-DSA-65 provides:
 * - NIST FIPS 204 standard compliance
 * - 192-bit post-quantum security level
 * - Deterministic signatures (no randomness required for verification)
 * - Strong existential unforgeability under chosen message attacks
 */

// ML-DSA-65 constants (matching FIPS 204 standard)
export const DILITHIUM_PUBLIC_KEY_SIZE = 1952;   // From fips204 documentation
export const DILITHIUM_PRIVATE_KEY_SIZE = 4032;  // From fips204 documentation  
export const DILITHIUM_SIGNATURE_SIZE = 3309;    // From fips204 documentation

interface DilithiumKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

interface DilithiumSignature {
  signature: Uint8Array;
}

// WASM module interface
interface WASMModule {
  VollyDSA: any;
  get_dsa_algorithm_info(): any;
}

let wasmModule: WASMModule | null = null;
let wasmModuleLoadAttempted = false;

async function loadWASMModule(): Promise<WASMModule | null> {
  if (wasmModuleLoadAttempted) {
    return wasmModule;
  }

  wasmModuleLoadAttempted = true;

  try {
    // Load the WASM module
    const module = await import('@volli/crypto-wasm');
    wasmModule = module as WASMModule;
    return wasmModule;
  } catch (error) {
    console.error('Failed to load WASM crypto module:', error);
    wasmModule = null;
    return null;
  }
}

/**
 * Generate a new ML-DSA-65 key pair using Rust WASM implementation
 */
export async function generateDilithiumKeyPair(): Promise<DilithiumKeyPair> {
  const wasm = await loadWASMModule();
  
  if (!wasm) {
    throw new Error('WASM crypto module failed to load');
  }

  try {
    // Create new VollyDSA instance (generates fresh keypair)
    const dsa = new wasm.VollyDSA();
    
    // Extract keys as Uint8Arrays
    const publicKey = new Uint8Array(dsa.public_key);
    const privateKey = new Uint8Array(dsa.secret_key);
    
    // Validate key sizes
    if (publicKey.length !== DILITHIUM_PUBLIC_KEY_SIZE) {
      throw new Error(`Invalid public key size: expected ${DILITHIUM_PUBLIC_KEY_SIZE}, got ${publicKey.length}`);
    }
    
    if (privateKey.length !== DILITHIUM_PRIVATE_KEY_SIZE) {
      throw new Error(`Invalid private key size: expected ${DILITHIUM_PRIVATE_KEY_SIZE}, got ${privateKey.length}`);
    }
    
    return {
      publicKey,
      privateKey
    };
  } catch (error) {
    throw new Error(`ML-DSA-65 key generation failed: ${error}`);
  }
}

/**
 * Generate a deterministic ML-DSA-65 key pair from a seed
 */
export async function generateDilithiumKeyPairFromSeed(seed: Uint8Array): Promise<DilithiumKeyPair> {
  const wasm = await loadWASMModule();
  
  if (!wasm) {
    throw new Error('WASM crypto module failed to load');
  }

  if (seed.length !== 32) {
    throw new Error('Seed must be exactly 32 bytes');
  }

  try {
    // Create VollyDSA instance from seed
    const dsa = wasm.VollyDSA.from_seed(seed);
    
    // Extract keys as Uint8Arrays
    const publicKey = new Uint8Array(dsa.public_key);
    const privateKey = new Uint8Array(dsa.secret_key);
    
    return {
      publicKey,
      privateKey
    };
  } catch (error) {
    throw new Error(`ML-DSA-65 deterministic key generation failed: ${error}`);
  }
}

/**
 * Sign a message using ML-DSA-65
 */
export async function dilithiumSign(
  privateKey: Uint8Array, 
  message: Uint8Array
): Promise<DilithiumSignature> {
  if (privateKey.length !== DILITHIUM_PRIVATE_KEY_SIZE) {
    throw new Error(`Invalid ML-DSA-65 private key size: expected ${DILITHIUM_PRIVATE_KEY_SIZE}, got ${privateKey.length}`);
  }

  const wasm = await loadWASMModule();
  
  if (!wasm) {
    throw new Error('WASM crypto module failed to load');
  }

  try {
    // Check if the static sign_with_key method is available
    if (wasm.VollyDSA.sign_with_key) {
      // Use the static method if available
      const signature = new Uint8Array(wasm.VollyDSA.sign_with_key(privateKey, message));
      return { signature };
    }
    
    // Fallback: The current WASM API doesn't support signing with external keys
    // This is a limitation that requires rebuilding the WASM module with the updated Rust code
    // For now, we need to throw an error until the WASM module can be rebuilt
    
    // TODO: Once the WASM module is rebuilt with rustup and wasm32-unknown-unknown target installed,
    // the static sign_with_key method will be available and this error won't be thrown
    throw new Error('Signing with external private key requires rebuilding the WASM module. Install rustup and run: rustup target add wasm32-unknown-unknown');
    
  } catch (error) {
    throw new Error(`ML-DSA-65 signing failed: ${error}`);
  }
}

/**
 * Verify a ML-DSA-65 signature
 */
export async function dilithiumVerify(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  if (publicKey.length !== DILITHIUM_PUBLIC_KEY_SIZE) {
    throw new Error(`Invalid ML-DSA-65 public key size: expected ${DILITHIUM_PUBLIC_KEY_SIZE}, got ${publicKey.length}`);
  }
  
  if (signature.length !== DILITHIUM_SIGNATURE_SIZE) {
    throw new Error(`Invalid ML-DSA-65 signature size: expected ${DILITHIUM_SIGNATURE_SIZE}, got ${signature.length}`);
  }

  const wasm = await loadWASMModule();
  
  if (!wasm) {
    throw new Error('WASM crypto module failed to load');
  }

  try {
    // Use the static verification method
    const isValid = wasm.VollyDSA.verify_with_key(publicKey, message, signature);
    return isValid;
  } catch (error) {
    throw new Error(`ML-DSA-65 verification failed: ${error}`);
  }
}

/**
 * Get ML-DSA-65 security parameters
 */
export function getDilithiumSecurityInfo(): {
  name: string;
  standard: string;
  securityLevel: number;
  publicKeySize: number;
  privateKeySize: number;
  signatureSize: number;
} {
  return {
    name: 'ML-DSA-65',
    standard: 'NIST FIPS 204',
    securityLevel: 192, // bits
    publicKeySize: DILITHIUM_PUBLIC_KEY_SIZE,
    privateKeySize: DILITHIUM_PRIVATE_KEY_SIZE,
    signatureSize: DILITHIUM_SIGNATURE_SIZE
  };
}

/**
 * Get WASM DSA module info
 */
export async function getDSAModuleInfo(): Promise<{
  algorithm: string;
  standard: string;
  securityLevel: string;
  publicKeySize: number;
  secretKeySize: number;
  signatureSize: number;
}> {
  const wasm = await loadWASMModule();
  
  if (!wasm) {
    throw new Error('WASM crypto module failed to load');
  }

  try {
    const info = wasm.get_dsa_algorithm_info();
    return {
      algorithm: info.algorithm,
      standard: info.standard,
      securityLevel: info.securityLevel,
      publicKeySize: info.publicKeySize,
      secretKeySize: info.secretKeySize,
      signatureSize: info.signatureSize
    };
  } catch (error) {
    throw new Error(`Failed to get DSA module info: ${error}`);
  }
}