import { VolliCore } from '@volli/integration';
import { writable } from 'svelte/store';

// Single instance of core
export const core = new VolliCore();

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