import { core } from '$lib/stores/core';

export async function cleanupDatabases() {
  // Close the core database if it exists
  if (core && core.db) {
    try {
      core.db.close();
    } catch (error) {
      // Ignore errors during close
    }
  }
  
  // Wait a bit to ensure databases are closed
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Delete all databases
  if (global.indexedDB) {
    try {
      // Delete known database
      await global.indexedDB.deleteDatabase('VolliDB');
    } catch (error) {
      // Ignore errors during cleanup
    }
    
    // Try to delete any other databases
    if (global.indexedDB.databases) {
      try {
        const databases = await global.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            await global.indexedDB.deleteDatabase(db.name);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }
}