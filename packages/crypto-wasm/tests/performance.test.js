/**
 * Performance tests for Volly Crypto WASM
 * Targets from implementation plan:
 * - Key generation: <500ms
 * - Encapsulation: <100ms
 */

import init, { 
    VollyKEM, 
    benchmark_keygen, 
    benchmark_encap,
    get_version 
} from '../pkg/volli_crypto_wasm.js';

async function runPerformanceTests() {
    console.log('🚀 Initializing Volly Crypto WASM...');
    await init();
    
    console.log(`📦 Version: ${get_version()}`);
    console.log('');
    
    // Performance targets from implementation plan
    const KEYGEN_TARGET_MS = 500;
    const ENCAP_TARGET_MS = 100;
    const ITERATIONS = 10;
    
    console.log('🎯 Performance Targets:');
    console.log(`  Key Generation: <${KEYGEN_TARGET_MS}ms`);
    console.log(`  Encapsulation:  <${ENCAP_TARGET_MS}ms`);
    console.log(`  Test iterations: ${ITERATIONS}`);
    console.log('');
    
    try {
        // Test 1: Key Generation Performance
        console.log('🔑 Testing key generation performance...');
        const keygenTime = await benchmark_keygen(ITERATIONS);
        console.log(`  Average time: ${keygenTime.toFixed(2)}ms`);
        
        if (keygenTime < KEYGEN_TARGET_MS) {
            console.log(`  ✅ PASS - Under ${KEYGEN_TARGET_MS}ms target`);
        } else {
            console.log(`  ❌ FAIL - Exceeds ${KEYGEN_TARGET_MS}ms target by ${(keygenTime - KEYGEN_TARGET_MS).toFixed(2)}ms`);
        }
        console.log('');
        
        // Test 2: Generate a test keypair for encapsulation testing
        console.log('🔐 Generating test keypair...');
        const kem = new VollyKEM();
        const publicKey = kem.public_key();
        console.log(`  Public key size: ${publicKey.length} bytes`);
        console.log('');
        
        // Test 3: Encapsulation Performance
        console.log('📡 Testing encapsulation performance...');
        const encapTime = await benchmark_encap(ITERATIONS, publicKey);
        console.log(`  Average time: ${encapTime.toFixed(2)}ms`);
        
        if (encapTime < ENCAP_TARGET_MS) {
            console.log(`  ✅ PASS - Under ${ENCAP_TARGET_MS}ms target`);
        } else {
            console.log(`  ❌ FAIL - Exceeds ${ENCAP_TARGET_MS}ms target by ${(encapTime - ENCAP_TARGET_MS).toFixed(2)}ms`);
        }
        console.log('');
        
        // Test 4: Full Round-trip Test
        console.log('🔄 Testing full encapsulation round-trip...');
        const start = performance.now();
        
        const kem1 = new VollyKEM();
        const kem2 = new VollyKEM();
        
        const encapsulation = kem1.encapsulate(kem2.public_key());
        const sharedSecret1 = encapsulation.shared_secret();
        const sharedSecret2 = kem2.decapsulate(encapsulation.ciphertext());
        
        const end = performance.now();
        const roundTripTime = end - start;
        
        // Verify shared secrets match
        const secret1Array = new Uint8Array(sharedSecret1);
        const secret2Array = new Uint8Array(sharedSecret2);
        const secretsMatch = secret1Array.every((val, i) => val === secret2Array[i]);
        
        console.log(`  Round-trip time: ${roundTripTime.toFixed(2)}ms`);
        console.log(`  Shared secrets match: ${secretsMatch ? '✅' : '❌'}`);
        console.log(`  Shared secret size: ${secret1Array.length} bytes`);
        console.log('');
        
        // Test 5: Key Sizes Validation
        console.log('📏 Validating key sizes...');
        const keySizes = VollyKEM.key_sizes();
        console.log(`  Public key:    ${keySizes.publicKey} bytes`);
        console.log(`  Secret key:    ${keySizes.secretKey} bytes`);
        console.log(`  Ciphertext:    ${keySizes.ciphertext} bytes`);
        console.log(`  Shared secret: ${keySizes.sharedSecret} bytes`);
        console.log('');
        
        // Summary
        console.log('📊 Performance Summary:');
        console.log(`  Key Generation: ${keygenTime.toFixed(2)}ms ${keygenTime < KEYGEN_TARGET_MS ? '✅' : '❌'}`);
        console.log(`  Encapsulation:  ${encapTime.toFixed(2)}ms ${encapTime < ENCAP_TARGET_MS ? '✅' : '❌'}`);
        console.log(`  Round-trip:     ${roundTripTime.toFixed(2)}ms`);
        console.log(`  Correctness:    ${secretsMatch ? '✅' : '❌'}`);
        
        const allTestsPass = keygenTime < KEYGEN_TARGET_MS && 
                           encapTime < ENCAP_TARGET_MS && 
                           secretsMatch;
        
        if (allTestsPass) {
            console.log('');
            console.log('🎉 All performance tests PASSED!');
            process.exit(0);
        } else {
            console.log('');
            console.log('💥 Some performance tests FAILED!');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error during performance testing:', error);
        process.exit(1);
    }
}

// Check if running in Node.js
if (typeof process !== 'undefined' && process.argv) {
    runPerformanceTests();
}

export { runPerformanceTests };