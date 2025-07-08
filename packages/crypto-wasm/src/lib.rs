use wasm_bindgen::prelude::*;
use js_sys::Uint8Array;
use web_sys::console;

// Import post-quantum cryptography using NIST FIPS standards
use fips203::{ml_kem_768, traits::{KeyGen, Encaps, Decaps, SerDes}};
use fips204::{ml_dsa_65, traits::{KeyGen as DsaKeyGen, Signer, Verifier, SerDes as DsaSerDes}};
use sha3::{Digest, Sha3_256};
use rand::{SeedableRng};
use rand_chacha::ChaCha20Rng;

// Random number generation
use getrandom::getrandom;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Set up panic hook for better error messages in development
#[cfg(feature = "console_error_panic_hook")]
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

// Volly KEM (Key Encapsulation Mechanism) using ML-KEM-768
#[wasm_bindgen]
pub struct VollyKEM {
    public_key: Vec<u8>,
    secret_key: Vec<u8>,
}

#[wasm_bindgen]
impl VollyKEM {
    /// Create a new VollyKEM instance with fresh keypair
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<VollyKEM, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Generate random seed
        let mut seed = [0u8; 32];
        getrandom(&mut seed)
            .map_err(|e| JsValue::from_str(&format!("Random generation failed: {:?}", e)))?;
        
        let mut rng = ChaCha20Rng::from_seed(seed);
        
        // Generate ML-KEM-768 keypair using correct API
        let (ek, dk) = ml_kem_768::KG::try_keygen_with_rng(&mut rng)
            .map_err(|e| JsValue::from_str(&format!("Key generation failed: {:?}", e)))?;
        
        let public_key = ek.into_bytes().to_vec();
        let secret_key = dk.into_bytes().to_vec();
        
        let end_time = js_sys::Date::now();
        
        // Log performance metrics
        console::log_1(&format!("Key generation took: {:.2}ms", end_time - start_time).into());
        
        Ok(VollyKEM {
            public_key,
            secret_key,
        })
    }
    
    /// Generate keypair from seed (deterministic)
    #[wasm_bindgen]
    pub fn from_seed(seed: &[u8]) -> Result<VollyKEM, JsValue> {
        if seed.len() != 32 {
            return Err(JsValue::from_str("Seed must be exactly 32 bytes"));
        }
        
        let start_time = js_sys::Date::now();
        
        // Create deterministic seed from input
        let mut hasher = Sha3_256::new();
        hasher.update(seed);
        let hash = hasher.finalize();
        let seed_array: [u8; 32] = hash.into();
        
        let mut rng = ChaCha20Rng::from_seed(seed_array);
        
        // Generate ML-KEM-768 keypair deterministically
        let (ek, dk) = ml_kem_768::KG::try_keygen_with_rng(&mut rng)
            .map_err(|e| JsValue::from_str(&format!("Key generation failed: {:?}", e)))?;
        
        let public_key = ek.into_bytes().to_vec();
        let secret_key = dk.into_bytes().to_vec();
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("Deterministic key generation took: {:.2}ms", end_time - start_time).into());
        
        Ok(VollyKEM {
            public_key,
            secret_key,
        })
    }
    
    /// Get the public key
    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Uint8Array {
        Uint8Array::from(&self.public_key[..])
    }
    
    /// Get the secret key (use with caution!)
    #[wasm_bindgen(getter)]
    pub fn secret_key(&self) -> Uint8Array {
        Uint8Array::from(&self.secret_key[..])
    }
    
    /// Encapsulate a shared secret against the given public key
    #[wasm_bindgen]
    pub fn encapsulate(&self, public_key: &[u8]) -> Result<VollyEncapsulation, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Parse the public key - convert slice to fixed-size array
        if public_key.len() != ml_kem_768::EK_LEN {
            return Err(JsValue::from_str(&format!("Invalid public key length: expected {}, got {}", ml_kem_768::EK_LEN, public_key.len())));
        }
        let mut pk_array = [0u8; ml_kem_768::EK_LEN];
        pk_array.copy_from_slice(public_key);
        let ek = ml_kem_768::EncapsKey::try_from_bytes(pk_array)
            .map_err(|e| JsValue::from_str(&format!("Invalid public key: {:?}", e)))?;
        
        // Generate random seed for encapsulation
        let mut seed = [0u8; 32];
        getrandom(&mut seed)
            .map_err(|e| JsValue::from_str(&format!("Random generation failed: {:?}", e)))?;
        
        let mut rng = ChaCha20Rng::from_seed(seed);
        
        let (shared_secret, ciphertext) = ek.try_encaps_with_rng(&mut rng)
            .map_err(|e| JsValue::from_str(&format!("Encapsulation failed: {:?}", e)))?;
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("Encapsulation took: {:.2}ms", end_time - start_time).into());
        
        Ok(VollyEncapsulation {
            ciphertext: ciphertext.into_bytes().to_vec(),
            shared_secret: shared_secret.into_bytes().to_vec(),
        })
    }
    
    /// Decapsulate a shared secret from the given ciphertext using this instance's private key
    #[wasm_bindgen]
    pub fn decapsulate(&self, ciphertext: &[u8]) -> Result<Uint8Array, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Parse the ciphertext - convert slice to fixed-size array
        if ciphertext.len() != ml_kem_768::CT_LEN {
            return Err(JsValue::from_str(&format!("Invalid ciphertext length: expected {}, got {}", ml_kem_768::CT_LEN, ciphertext.len())));
        }
        let mut ct_array = [0u8; ml_kem_768::CT_LEN];
        ct_array.copy_from_slice(ciphertext);
        let ct = ml_kem_768::CipherText::try_from_bytes(ct_array)
            .map_err(|e| JsValue::from_str(&format!("Invalid ciphertext: {:?}", e)))?;
        
        // Parse the secret key - convert Vec to fixed-size array
        if self.secret_key.len() != ml_kem_768::DK_LEN {
            return Err(JsValue::from_str(&format!("Invalid secret key length: expected {}, got {}", ml_kem_768::DK_LEN, self.secret_key.len())));
        }
        let mut sk_array = [0u8; ml_kem_768::DK_LEN];
        sk_array.copy_from_slice(&self.secret_key);
        let dk = ml_kem_768::DecapsKey::try_from_bytes(sk_array)
            .map_err(|e| JsValue::from_str(&format!("Invalid secret key: {:?}", e)))?;
        
        let shared_secret = dk.try_decaps(&ct)
            .map_err(|e| JsValue::from_str(&format!("Decapsulation failed: {:?}", e)))?;
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("Decapsulation took: {:.2}ms", end_time - start_time).into());
        
        Ok(Uint8Array::from(&shared_secret.into_bytes()[..]))
    }
    
    /// Static method to decapsulate using any private key
    #[wasm_bindgen]
    pub fn decapsulate_with_key(secret_key: &[u8], ciphertext: &[u8]) -> Result<Uint8Array, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Parse the ciphertext - convert slice to fixed-size array
        if ciphertext.len() != ml_kem_768::CT_LEN {
            return Err(JsValue::from_str(&format!("Invalid ciphertext length: expected {}, got {}", ml_kem_768::CT_LEN, ciphertext.len())));
        }
        let mut ct_array = [0u8; ml_kem_768::CT_LEN];
        ct_array.copy_from_slice(ciphertext);
        let ct = ml_kem_768::CipherText::try_from_bytes(ct_array)
            .map_err(|e| JsValue::from_str(&format!("Invalid ciphertext: {:?}", e)))?;
        
        // Parse the secret key - convert slice to fixed-size array
        if secret_key.len() != ml_kem_768::DK_LEN {
            return Err(JsValue::from_str(&format!("Invalid secret key length: expected {}, got {}", ml_kem_768::DK_LEN, secret_key.len())));
        }
        let mut sk_array = [0u8; ml_kem_768::DK_LEN];
        sk_array.copy_from_slice(secret_key);
        let dk = ml_kem_768::DecapsKey::try_from_bytes(sk_array)
            .map_err(|e| JsValue::from_str(&format!("Invalid secret key: {:?}", e)))?;
        
        let shared_secret = dk.try_decaps(&ct)
            .map_err(|e| JsValue::from_str(&format!("Decapsulation failed: {:?}", e)))?;
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("Static decapsulation took: {:.2}ms", end_time - start_time).into());
        
        Ok(Uint8Array::from(&shared_secret.into_bytes()[..]))
    }
    
    /// Create a VollyKEM instance from existing keys
    #[wasm_bindgen]
    pub fn from_keys(public_key: &[u8], secret_key: &[u8]) -> Result<VollyKEM, JsValue> {
        // Validate key sizes
        if public_key.len() != ml_kem_768::EK_LEN {
            return Err(JsValue::from_str(&format!("Invalid public key length: expected {}, got {}", ml_kem_768::EK_LEN, public_key.len())));
        }
        
        if secret_key.len() != ml_kem_768::DK_LEN {
            return Err(JsValue::from_str(&format!("Invalid secret key length: expected {}, got {}", ml_kem_768::DK_LEN, secret_key.len())));
        }
        
        Ok(VollyKEM {
            public_key: public_key.to_vec(),
            secret_key: secret_key.to_vec(),
        })
    }

    /// Get key sizes for validation
    #[wasm_bindgen]
    pub fn key_sizes() -> js_sys::Object {
        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &"publicKey".into(), &(ml_kem_768::EK_LEN as u32).into()).unwrap();
        js_sys::Reflect::set(&obj, &"secretKey".into(), &(ml_kem_768::DK_LEN as u32).into()).unwrap();
        js_sys::Reflect::set(&obj, &"ciphertext".into(), &(ml_kem_768::CT_LEN as u32).into()).unwrap();
        js_sys::Reflect::set(&obj, &"sharedSecret".into(), &32u32.into()).unwrap(); // ML-KEM shared secret is always 32 bytes
        obj
    }
}

/// Encapsulation result containing ciphertext and shared secret
#[wasm_bindgen]
pub struct VollyEncapsulation {
    ciphertext: Vec<u8>,
    shared_secret: Vec<u8>,
}

#[wasm_bindgen]
impl VollyEncapsulation {
    /// Get the ciphertext
    #[wasm_bindgen(getter)]
    pub fn ciphertext(&self) -> Uint8Array {
        Uint8Array::from(&self.ciphertext[..])
    }
    
    /// Get the shared secret
    #[wasm_bindgen(getter)]
    pub fn shared_secret(&self) -> Uint8Array {
        Uint8Array::from(&self.shared_secret[..])
    }
}

// Utility functions
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen]
pub fn get_algorithm_info() -> js_sys::Object {
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &"algorithm".into(), &"ML-KEM-768".into()).unwrap();
    js_sys::Reflect::set(&obj, &"standard".into(), &"FIPS 203".into()).unwrap();
    js_sys::Reflect::set(&obj, &"securityLevel".into(), &"Level 3 (192-bit post-quantum)".into()).unwrap();
    js_sys::Reflect::set(&obj, &"publicKeySize".into(), &(ml_kem_768::EK_LEN as u32).into()).unwrap();
    js_sys::Reflect::set(&obj, &"secretKeySize".into(), &(ml_kem_768::DK_LEN as u32).into()).unwrap();
    js_sys::Reflect::set(&obj, &"ciphertextSize".into(), &(ml_kem_768::CT_LEN as u32).into()).unwrap();
    js_sys::Reflect::set(&obj, &"sharedSecretSize".into(), &32u32.into()).unwrap(); // ML-KEM shared secret is always 32 bytes
    obj
}

#[wasm_bindgen]
pub fn benchmark_keygen(iterations: u32) -> Result<f64, JsValue> {
    // Use a simple timing approach that works in both browser and Node.js
    let start_time = js_sys::Date::now();
    
    for _ in 0..iterations {
        let mut seed = [0u8; 32];
        getrandom(&mut seed)
            .map_err(|e| JsValue::from_str(&format!("Random generation failed: {:?}", e)))?;
        let mut rng = ChaCha20Rng::from_seed(seed);
        let _ = ml_kem_768::KG::try_keygen_with_rng(&mut rng)
            .map_err(|e| JsValue::from_str(&format!("Key generation failed: {:?}", e)))?;
    }
    
    let end_time = js_sys::Date::now();
    
    Ok((end_time - start_time) / iterations as f64)
}

#[wasm_bindgen]
pub fn benchmark_encap(iterations: u32, public_key: &[u8]) -> Result<f64, JsValue> {
    // Parse the public key once - convert slice to fixed-size array
    if public_key.len() != ml_kem_768::EK_LEN {
        return Err(JsValue::from_str(&format!("Invalid public key length: expected {}, got {}", ml_kem_768::EK_LEN, public_key.len())));
    }
    let mut pk_array = [0u8; ml_kem_768::EK_LEN];
    pk_array.copy_from_slice(public_key);
    let ek = ml_kem_768::EncapsKey::try_from_bytes(pk_array)
        .map_err(|e| JsValue::from_str(&format!("Invalid public key: {:?}", e)))?;
    
    let start_time = js_sys::Date::now();
    
    for _ in 0..iterations {
        let mut seed = [0u8; 32];
        getrandom(&mut seed)
            .map_err(|e| JsValue::from_str(&format!("Random generation failed: {:?}", e)))?;
        let mut rng = ChaCha20Rng::from_seed(seed);
        let _ = ek.try_encaps_with_rng(&mut rng)
            .map_err(|e| JsValue::from_str(&format!("Encapsulation failed: {:?}", e)))?;
    }
    
    let end_time = js_sys::Date::now();
    
    Ok((end_time - start_time) / iterations as f64)
}

// Volly DSA (Digital Signature Algorithm) using ML-DSA-65
#[wasm_bindgen]
pub struct VollyDSA {
    public_key: Vec<u8>,
    secret_key: Vec<u8>,
}

#[wasm_bindgen]
impl VollyDSA {
    /// Create a new VollyDSA instance with fresh keypair
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<VollyDSA, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Generate random seed
        let mut seed = [0u8; 32];
        getrandom(&mut seed)
            .map_err(|e| JsValue::from_str(&format!("Random generation failed: {:?}", e)))?;
        
        let mut rng = ChaCha20Rng::from_seed(seed);
        
        // Generate ML-DSA-65 keypair
        let (pk, sk) = <ml_dsa_65::KG as DsaKeyGen>::try_keygen_with_rng(&mut rng)
            .map_err(|e| JsValue::from_str(&format!("Key generation failed: {:?}", e)))?;
        
        let public_key = pk.clone().into_bytes().to_vec();
        let secret_key = sk.clone().into_bytes().to_vec();
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("DSA key generation took: {:.2}ms", end_time - start_time).into());
        
        Ok(VollyDSA {
            public_key,
            secret_key,
        })
    }
    
    /// Generate keypair from seed (deterministic)
    #[wasm_bindgen]
    pub fn from_seed(seed: &[u8]) -> Result<VollyDSA, JsValue> {
        if seed.len() != 32 {
            return Err(JsValue::from_str("Seed must be exactly 32 bytes"));
        }
        
        let start_time = js_sys::Date::now();
        
        // Create deterministic seed from input
        let mut hasher = Sha3_256::new();
        hasher.update(seed);
        let hash = hasher.finalize();
        let seed_array: [u8; 32] = hash.into();
        
        let mut rng = ChaCha20Rng::from_seed(seed_array);
        
        // Generate ML-DSA-65 keypair deterministically
        let (pk, sk) = <ml_dsa_65::KG as DsaKeyGen>::try_keygen_with_rng(&mut rng)
            .map_err(|e| JsValue::from_str(&format!("Key generation failed: {:?}", e)))?;
        
        let public_key = pk.clone().into_bytes().to_vec();
        let secret_key = sk.clone().into_bytes().to_vec();
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("Deterministic DSA key generation took: {:.2}ms", end_time - start_time).into());
        
        Ok(VollyDSA {
            public_key,
            secret_key,
        })
    }
    
    /// Get the public key
    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Uint8Array {
        Uint8Array::from(&self.public_key[..])
    }
    
    /// Get the secret key (use with caution\!)
    #[wasm_bindgen(getter)]
    pub fn secret_key(&self) -> Uint8Array {
        Uint8Array::from(&self.secret_key[..])
    }
    
    /// Sign a message using this instance's private key
    #[wasm_bindgen]
    pub fn sign(&self, message: &[u8]) -> Result<Uint8Array, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Parse the secret key
        if self.secret_key.len() != ml_dsa_65::SK_LEN {
            return Err(JsValue::from_str(&format!("Invalid secret key length: expected {}, got {}", ml_dsa_65::SK_LEN, self.secret_key.len())));
        }
        let mut sk_array = [0u8; ml_dsa_65::SK_LEN];
        sk_array.copy_from_slice(&self.secret_key);
        let sk = <ml_dsa_65::PrivateKey as DsaSerDes>::try_from_bytes(sk_array)
            .map_err(|e| JsValue::from_str(&format!("Invalid secret key: {:?}", e)))?;
        
        // Generate random seed for signing
        let mut seed = [0u8; 32];
        getrandom(&mut seed)
            .map_err(|e| JsValue::from_str(&format!("Random generation failed: {:?}", e)))?;
        
        let mut rng = ChaCha20Rng::from_seed(seed);
        
        // Sign the message (fips204 requires a context parameter)
        let context = b""; // Empty context for general signing
        let signature = sk.try_sign_with_rng(&mut rng, message, context)
            .map_err(|e| JsValue::from_str(&format!("Signing failed: {:?}", e)))?;
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("Signing took: {:.2}ms", end_time - start_time).into());
        
        Ok(Uint8Array::from(&signature[..]))
    }
    
    /// Static method to sign with any private key
    #[wasm_bindgen]
    pub fn sign_with_key(secret_key: &[u8], message: &[u8]) -> Result<Uint8Array, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Parse the secret key
        if secret_key.len() != ml_dsa_65::SK_LEN {
            return Err(JsValue::from_str(&format!("Invalid secret key length: expected {}, got {}", ml_dsa_65::SK_LEN, secret_key.len())));
        }
        let mut sk_array = [0u8; ml_dsa_65::SK_LEN];
        sk_array.copy_from_slice(secret_key);
        let sk = <ml_dsa_65::PrivateKey as DsaSerDes>::try_from_bytes(sk_array)
            .map_err(|e| JsValue::from_str(&format!("Invalid secret key: {:?}", e)))?;
        
        // Generate random seed for signing
        let mut seed = [0u8; 32];
        getrandom(&mut seed)
            .map_err(|e| JsValue::from_str(&format!("Random generation failed: {:?}", e)))?;
        
        let mut rng = ChaCha20Rng::from_seed(seed);
        
        // Sign the message (fips204 requires a context parameter)
        let context = b""; // Empty context for general signing
        let signature = sk.try_sign_with_rng(&mut rng, message, context)
            .map_err(|e| JsValue::from_str(&format!("Signing failed: {:?}", e)))?;
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("Static signing took: {:.2}ms", end_time - start_time).into());
        
        Ok(Uint8Array::from(&signature[..]))
    }
    
    /// Static method to verify a signature using any public key
    #[wasm_bindgen]
    pub fn verify_with_key(public_key: &[u8], message: &[u8], signature: &[u8]) -> Result<bool, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Parse the public key
        if public_key.len() != ml_dsa_65::PK_LEN {
            return Err(JsValue::from_str(&format!("Invalid public key length: expected {}, got {}", ml_dsa_65::PK_LEN, public_key.len())));
        }
        let mut pk_array = [0u8; ml_dsa_65::PK_LEN];
        pk_array.copy_from_slice(public_key);
        let pk = <ml_dsa_65::PublicKey as DsaSerDes>::try_from_bytes(pk_array)
            .map_err(|e| JsValue::from_str(&format!("Invalid public key: {:?}", e)))?;
        
        // Parse the signature
        if signature.len() != ml_dsa_65::SIG_LEN {
            return Err(JsValue::from_str(&format!("Invalid signature length: expected {}, got {}", ml_dsa_65::SIG_LEN, signature.len())));
        }
        let mut sig_array = [0u8; ml_dsa_65::SIG_LEN];
        sig_array.copy_from_slice(signature);
        // Verify the signature directly with bytes (fips204 requires a context parameter)
        let context = b""; // Empty context for general verification
        let valid = pk.verify(message, &sig_array, context);
        
        let end_time = js_sys::Date::now();
        
        console::log_1(&format!("Verification took: {:.2}ms", end_time - start_time).into());
        
        Ok(valid)
    }
    
    /// Get key sizes for validation
    #[wasm_bindgen]
    pub fn key_sizes() -> js_sys::Object {
        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &"publicKey".into(), &(ml_dsa_65::PK_LEN as u32).into()).unwrap();
        js_sys::Reflect::set(&obj, &"secretKey".into(), &(ml_dsa_65::SK_LEN as u32).into()).unwrap();
        js_sys::Reflect::set(&obj, &"signature".into(), &(ml_dsa_65::SIG_LEN as u32).into()).unwrap();
        obj
    }
}

// Utility functions for ML-DSA
#[wasm_bindgen]
pub fn get_dsa_algorithm_info() -> js_sys::Object {
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &"algorithm".into(), &"ML-DSA-65".into()).unwrap();
    js_sys::Reflect::set(&obj, &"standard".into(), &"FIPS 204".into()).unwrap();
    js_sys::Reflect::set(&obj, &"securityLevel".into(), &"Level 3 (192-bit post-quantum)".into()).unwrap();
    js_sys::Reflect::set(&obj, &"publicKeySize".into(), &(ml_dsa_65::PK_LEN as u32).into()).unwrap();
    js_sys::Reflect::set(&obj, &"secretKeySize".into(), &(ml_dsa_65::SK_LEN as u32).into()).unwrap();
    js_sys::Reflect::set(&obj, &"signatureSize".into(), &(ml_dsa_65::SIG_LEN as u32).into()).unwrap();
    obj
}
