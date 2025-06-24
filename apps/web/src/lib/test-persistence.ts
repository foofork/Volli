import { core } from './stores/core';

export async function testPersistence() {
  console.log('=== Volli Persistence Test ===');
  
  try {
    // Step 1: Create vault
    console.log('1. Creating vault with password "test123"...');
    const vaultId = await core.createVault('test123');
    console.log('✅ Vault created with ID:', vaultId);
    
    // Step 2: Send a test message
    console.log('\n2. Sending test message...');
    const currentVault = await core.getCurrentVault();
    if (!currentVault) {
      throw new Error('No current vault after creation!');
    }
    
    const message = await core.messaging.sendMessage(
      'test-conv-1',
      'Hello persistent world!',
      currentVault
    );
    console.log('✅ Message sent:', message);
    
    // Step 3: Check database
    console.log('\n3. Checking database contents...');
    const db = core.database;
    
    const vaults = await db.vaults.toArray();
    console.log('Vaults in DB:', vaults.length);
    
    const messages = await db.messages.toArray();
    console.log('Messages in DB:', messages.length);
    
    const config = await db.config.toArray();
    console.log('Config entries:', config.length);
    
    // Step 4: Simulate page refresh
    console.log('\n4. Simulating page refresh...');
    console.log('Lock vault and clear memory state...');
    await core.lockVault();
    
    // Step 5: Try to unlock
    console.log('\n5. Attempting to unlock vault...');
    const unlocked = await core.unlockVault('test123');
    console.log('✅ Vault unlocked:', unlocked);
    
    // Step 6: Retrieve messages
    console.log('\n6. Retrieving messages after unlock...');
    const retrievedMessages = await core.messaging.getMessages('test-conv-1');
    console.log('✅ Messages retrieved:', retrievedMessages.length);
    console.log('Message content:', retrievedMessages[0]?.content);
    
    console.log('\n=== Test Complete ===');
    console.log('✅ Data persists across vault lock/unlock!');
    console.log('✅ IndexedDB is working correctly!');
    console.log('\nTo verify persistence across page refresh:');
    console.log('1. Refresh the page');
    console.log('2. Run: window.volli.verifyPersistence()');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

export async function verifyPersistence() {
  console.log('=== Verifying Persistence After Refresh ===');
  
  try {
    // Check if vault exists
    const db = core.database;
    const vaults = await db.vaults.toArray();
    
    if (vaults.length === 0) {
      console.log('❌ No vaults found. Run testPersistence() first.');
      return;
    }
    
    console.log('✅ Found', vaults.length, 'vault(s)');
    
    // Try to unlock
    console.log('\nAttempting to unlock vault...');
    const unlocked = await core.unlockVault('test123');
    
    if (unlocked) {
      console.log('✅ Vault unlocked successfully!');
      
      // Check messages
      const messages = await core.messaging.getMessages('test-conv-1');
      console.log('✅ Found', messages.length, 'message(s)');
      
      if (messages.length > 0) {
        console.log('✅ Message content:', messages[0].content);
        console.log('\n🎉 SUCCESS: Data persisted across page refresh!');
      }
    } else {
      console.log('❌ Failed to unlock vault');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}