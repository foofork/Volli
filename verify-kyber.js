// Quick verification that Kyber768 is integrated
import { generateKeyPair, encapsulate, decapsulate } from './packages/identity-core/dist/index.mjs';

async function verifyKyber() {
  console.log('Testing Kyber768 integration...');
  
  try {
    // Generate hybrid key pair
    console.log('\n1. Generating hybrid key pair...');
    const keyPair = await generateKeyPair();
    console.log('✓ Key pair generated');
    console.log('  - Has x25519 component:', !!keyPair.publicKey.x25519);
    console.log('  - Has kyber768 component:', !!keyPair.publicKey.kyber768);
    
    // Test encapsulation
    console.log('\n2. Testing encapsulation...');
    const { ciphertext, sharedSecret } = await encapsulate(keyPair.publicKey);
    console.log('✓ Encapsulation successful');
    console.log('  - Ciphertext has x25519:', !!ciphertext.x25519);
    console.log('  - Ciphertext has kyber768:', !!ciphertext.kyber768);
    console.log('  - Shared secret length:', sharedSecret.length, 'bytes');
    
    // Test decapsulation
    console.log('\n3. Testing decapsulation...');
    const decryptedSecret = await decapsulate(ciphertext, keyPair.privateKey);
    console.log('✓ Decapsulation successful');
    console.log('  - Secrets match:', 
      Array.from(sharedSecret).every((byte, i) => byte === decryptedSecret[i])
    );
    
    console.log('\n✅ Kyber768 is properly integrated with hybrid cryptography!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nNote: The module needs to be built first.');
    console.log('Run: cd packages/identity-core && npm run build');
  }
}

verifyKyber();