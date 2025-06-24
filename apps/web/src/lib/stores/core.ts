import { VolliCore } from '@volli/integration';
import { writable } from 'svelte/store';

// Single instance of core
export let core = new VolliCore();

// Reactive status
export const initialized = writable(false);
export const initializing = writable(false);

// Initialize on app start
export async function initializeCore() {
  initializing.set(true);
  try {
    const status = await core.initialize();
    initialized.set(true);
    return status;
  } catch (error) {
    console.error('Failed to initialize core:', error);
    throw error;
  } finally {
    initializing.set(false);
  }
}

// Reset core for testing
export function resetCore() {
  if (core && core.db) {
    try {
      core.db.close();
    } catch (error) {
      // Ignore errors during close
    }
  }
  core = new VolliCore();
  initialized.set(false);
  initializing.set(false);
}