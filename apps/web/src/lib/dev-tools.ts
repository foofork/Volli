import { core } from './stores/core';
import { testPersistence, verifyPersistence } from './test-persistence';
import { testFullFlow, verifyAfterRefresh } from './test-full-flow';

// Extend window interface for dev tools
declare global {
  interface Window {
    volli: {
      inspectDatabase: typeof inspectDatabase;
      clearDatabase: typeof clearDatabase;
      testVaultCreation: typeof testVaultCreation;
      testMessageSending: typeof testMessageSending;
      testPersistence: typeof testPersistence;
      verifyPersistence: typeof verifyPersistence;
      testFullFlow: typeof testFullFlow;
      verifyAfterRefresh: typeof verifyAfterRefresh;
      core: typeof core;
    };
  }
}

export async function inspectDatabase() {
  const db = core.database;
  
  console.log('=== Volli Database Inspection ===');
  
  try {
    const vaults = await db.vaults.toArray();
    console.log('Vaults:', vaults);
    
    const messages = await db.messages.toArray();
    console.log('Messages:', messages);
    
    const contacts = await db.contacts.toArray();
    console.log('Contacts:', contacts);
    
    const config = await db.config.toArray();
    console.log('Config:', config);
    
    console.log('=== Stats ===');
    console.log('Total vaults:', vaults.length);
    console.log('Total messages:', messages.length);
    console.log('Total contacts:', contacts.length);
  } catch (error) {
    console.error('Error inspecting database:', error);
  }
}

export async function clearDatabase() {
  if (!confirm('Are you sure you want to clear the entire database?')) {
    return;
  }
  
  const db = core.database;
  
  try {
    await db.vaults.clear();
    await db.messages.clear();
    await db.contacts.clear();
    await db.config.clear();
    
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}

export async function testVaultCreation() {
  try {
    console.log('Testing vault creation...');
    const vaultId = await core.createVault('test123');
    console.log('Vault created with ID:', vaultId);
    
    // Check persistence
    await inspectDatabase();
    
    return vaultId;
  } catch (error) {
    console.error('Vault creation failed:', error);
  }
}

export async function testMessageSending() {
  try {
    const currentVault = await core.getCurrentVault();
    if (!currentVault) {
      console.error('No vault available. Create a vault first.');
      return;
    }
    
    console.log('Testing message sending...');
    const message = await core.messaging.sendMessage(
      'test-conversation',
      'Hello from dev tools!',
      currentVault
    );
    console.log('Message sent:', message);
    
    // Check persistence
    const messages = await core.messaging.getMessages('test-conversation');
    console.log('Retrieved messages:', messages);
  } catch (error) {
    console.error('Message sending failed:', error);
  }
}

// Add to window for console access in development
if (import.meta.env.DEV) {
  window.volli = {
    inspectDatabase,
    clearDatabase,
    testVaultCreation,
    testMessageSending,
    testPersistence,
    verifyPersistence,
    testFullFlow,
    verifyAfterRefresh,
    core
  };
  
  console.log('Volli dev tools loaded. Access via window.volli');
  console.log('Quick test: window.volli.testFullFlow()');
  console.log('After refresh: window.volli.verifyAfterRefresh()');
}