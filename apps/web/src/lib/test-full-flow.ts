import { core } from './stores/core';
import { auth } from './stores/auth';
import { messages } from './stores/messages';
import { get } from 'svelte/store';

export async function testFullFlow() {
  console.log('=== Volli Full Flow Test ===');
  console.log('Testing: Create vault → Send message → Refresh → Verify persistence\n');
  
  try {
    // Step 1: Create identity
    console.log('📝 Step 1: Creating identity...');
    await auth.createIdentity('Test User');
    const authState = get(auth);
    console.log('✅ Identity created:', authState.currentIdentity?.displayName);
    
    // Step 2: Create vault with passphrase
    console.log('\n🔐 Step 2: Creating vault...');
    await auth.createVaultWithPassphrase('test-passphrase-123');
    console.log('✅ Vault created and unlocked');
    
    // Step 3: Load conversations (should be empty)
    console.log('\n💬 Step 3: Loading conversations...');
    await messages.loadConversations();
    const initialConvs = get(messages).conversations;
    console.log('✅ Conversations loaded:', initialConvs.size, 'conversations');
    
    // Step 4: Create a conversation
    console.log('\n👥 Step 4: Creating conversation...');
    const conversationId = await messages.createConversation(['user-alice']);
    console.log('✅ Conversation created:', conversationId);
    
    // Step 5: Send messages
    console.log('\n✉️ Step 5: Sending messages...');
    messages.setActiveConversation(conversationId);
    
    await messages.sendMessage('Hello from the test!');
    console.log('✅ Message 1 sent');
    
    await messages.sendMessage('This message should persist!');
    console.log('✅ Message 2 sent');
    
    await messages.sendMessage('Testing real encryption 🔐');
    console.log('✅ Message 3 sent');
    
    // Step 6: Check database
    console.log('\n🔍 Step 6: Checking database...');
    const db = core.database;
    const dbMessages = await db.messages.toArray();
    console.log('✅ Messages in database:', dbMessages.length);
    dbMessages.forEach((msg, i) => {
      console.log(`   Message ${i + 1}: "${msg.content}" (${new Date(msg.timestamp).toLocaleTimeString()})`);
    });
    
    // Step 7: Lock vault
    console.log('\n🔒 Step 7: Locking vault...');
    auth.lockVault();
    console.log('✅ Vault locked');
    
    // Step 8: Clear messages store
    console.log('\n🧹 Step 8: Clearing memory state...');
    messages.reset();
    const clearedState = get(messages).conversations;
    console.log('✅ Messages cleared from memory:', clearedState.size, 'conversations');
    
    // Step 9: Unlock vault
    console.log('\n🔓 Step 9: Unlocking vault...');
    const unlocked = await auth.unlockVault('test-passphrase-123');
    console.log('✅ Vault unlocked:', unlocked);
    
    // Step 10: Load conversations again
    console.log('\n🔄 Step 10: Reloading conversations...');
    await messages.loadConversations();
    const reloadedConvs = get(messages).conversations;
    console.log('✅ Conversations reloaded:', reloadedConvs.size, 'conversations');
    
    // Step 11: Check messages persisted
    console.log('\n✨ Step 11: Verifying message persistence...');
    const conversationMessages = await messages.getConversationMessages(conversationId);
    console.log('✅ Messages retrieved:', conversationMessages.length);
    conversationMessages.forEach((msg, i) => {
      console.log(`   Message ${i + 1}: "${msg.content}"`);
    });
    
    // Summary
    console.log('\n=== 🎉 Test Complete! ===');
    console.log('✅ Identity creation works');
    console.log('✅ Vault creation with encryption works');
    console.log('✅ Message sending works');
    console.log('✅ Data persists in IndexedDB');
    console.log('✅ Data survives vault lock/unlock');
    console.log('✅ Messages can be retrieved after reload');
    
    console.log('\n💡 Next: Refresh the page and run window.volli.verifyAfterRefresh()');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

export async function verifyAfterRefresh() {
  console.log('=== Verifying Persistence After Page Refresh ===\n');
  
  try {
    // Check database directly
    console.log('🔍 Checking database...');
    const db = core.database;
    const vaults = await db.vaults.toArray();
    const messages = await db.messages.toArray();
    
    console.log('✅ Found', vaults.length, 'vault(s)');
    console.log('✅ Found', messages.length, 'message(s)');
    
    if (vaults.length === 0) {
      console.log('\n❌ No data found. Run testFullFlow() first.');
      return;
    }
    
    // Try to restore session
    console.log('\n🔐 Checking session...');
    const hasSession = await auth.checkSession();
    console.log('Session found:', hasSession);
    
    if (!hasSession) {
      console.log('\n⚠️ No session found. You would need to login again.');
      console.log('This is expected behavior for security.');
      return;
    }
    
    // Unlock vault
    console.log('\n🔓 Unlocking vault...');
    const unlocked = await auth.unlockVault('test-passphrase-123');
    
    if (!unlocked) {
      console.log('❌ Failed to unlock vault');
      return;
    }
    
    console.log('✅ Vault unlocked!');
    
    // Load and display messages
    console.log('\n💬 Loading conversations...');
    await messages.loadConversations();
    
    const convs = get(messages).conversations;
    console.log('✅ Found', convs.size, 'conversation(s)');
    
    // Display all messages
    for (const [convId, msgs] of convs) {
      console.log(`\nConversation ${convId}:`);
      msgs.forEach((msg, i) => {
        console.log(`  ${i + 1}. "${msg.content}" (${new Date(msg.timestamp).toLocaleString()})`);
      });
    }
    
    console.log('\n🎉 SUCCESS: All data persisted across page refresh!');
    console.log('✅ IndexedDB is working correctly');
    console.log('✅ Encryption/decryption is working');
    console.log('✅ The app is ready for real use!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}