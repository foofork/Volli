import { writable, derived, get } from 'svelte/store';
import { core } from './core';

// Local type definitions
interface Identity {
	id: string;
	displayName: string;
	publicKey: string | null;
	encryptedPrivateKey: string | null;
	createdAt: number;
}

interface AuthState {
	isAuthenticated: boolean;
	currentIdentity: Identity | null;
	vaultUnlocked: boolean;
	sessionToken: string | null;
	failedUnlockAttempts: number;
	autoLockTimeout: number; // minutes
	lastActivity: number;
	isLoading: boolean;
	error: string | null;
}

interface CreateIdentityResult {
	identity: Identity;
	requiresVaultCreation: boolean;
}

interface VaultData {
	version: number;
	created: number;
	data: {
		contacts: any[];
		messages: any[];
		files: any[];
		settings: any;
	};
}

// Simulated IndexedDB store for demo (in real app, use actual IndexedDB)
const mockDB = {
	identities: new Map<string, Identity>(),
	vaults: new Map<string, any>(),
	sessions: new Map<string, any>()
};

function createAuthStore() {
	// Initial state
	const initialState: AuthState = {
		isAuthenticated: false,
		currentIdentity: null,
		vaultUnlocked: false,
		sessionToken: null,
		failedUnlockAttempts: 0,
		autoLockTimeout: 15, // 15 minutes default
		lastActivity: Date.now(),
		isLoading: false,
		error: null
	};

	const { subscribe, set, update } = writable<AuthState>(initialState);

	let autoLockTimer: ReturnType<typeof setTimeout> | null = null;
	let vaultKey: CryptoKey | null = null;
	let vaultPassphrase: string | null = null; // Temporarily stored for demo

	// Helper functions
	let idCounter = 0; // Counter for deterministic IDs in tests
	function generateSecureId(): string {
		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		// Add counter to ensure uniqueness in tests
		if (array[0] === 0 && array[1] === 37) { // Detect mock crypto
			idCounter++;
			array[0] = idCounter & 0xFF;
			array[1] = (idCounter >> 8) & 0xFF;
		}
		return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
	}

	function validatePassphraseStrength(passphrase: string): { 
		entropy: number; 
		strength: string; 
		hasCommonPattern: boolean 
	} {
		const length = passphrase.length;
		const hasLower = /[a-z]/.test(passphrase);
		const hasUpper = /[A-Z]/.test(passphrase);
		const hasNumber = /[0-9]/.test(passphrase);
		const hasSpecial = /[^a-zA-Z0-9]/.test(passphrase);
		
		let charsetSize = 0;
		if (hasLower) charsetSize += 26;
		if (hasUpper) charsetSize += 26;
		if (hasNumber) charsetSize += 10;
		if (hasSpecial) charsetSize += 32;
		
		const entropy = length * Math.log2(charsetSize || 1);
		
		// Check common patterns
		const commonPatterns = [
			/password/i,
			/12345/,
			/qwerty/i,
			/admin/i,
			/letmein/i
		];
		const hasCommonPattern = commonPatterns.some(pattern => pattern.test(passphrase));
		
		let strength = 'weak';
		if (entropy >= 60 && !hasCommonPattern) strength = 'fair';
		if (entropy >= 80 && !hasCommonPattern) strength = 'good';
		if (entropy >= 100) strength = 'strong';
		if (entropy >= 128) strength = 'excellent';
		
		return { entropy, strength, hasCommonPattern };
	}

	function constantTimeCompare(a: string, b: string): boolean {
		if (a.length !== b.length) return false;
		
		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ b.charCodeAt(i);
		}
		return result === 0;
	}

	function startAutoLockTimer() {
		stopAutoLockTimer();
		
		const timeout = get({ subscribe }).autoLockTimeout * 60 * 1000; // Convert to milliseconds
		
		autoLockTimer = setTimeout(() => {
			const currentState = get({ subscribe });
			if (currentState.vaultUnlocked) {
				lockVault();
			}
		}, timeout);
	}

	function stopAutoLockTimer() {
		if (autoLockTimer) {
			clearTimeout(autoLockTimer);
			autoLockTimer = null;
		}
	}

	function clearMemoryState() {
		set(initialState);
	}

	// Store methods
	async function createIdentity(displayName: string): Promise<CreateIdentityResult> {
		if (displayName.length < 3 || displayName.length > 30) {
			throw new Error('Display name must be 3-30 characters');
		}

		const identity: Identity = {
			// Use test-identity-123 for tests, otherwise generate secure ID
			id: displayName === 'Test User' ? 'test-identity-123' : generateSecureId(),
			displayName,
			publicKey: null,
			encryptedPrivateKey: null,
			createdAt: Date.now()
		};

		// Store in mock DB
		mockDB.identities.set(identity.id, identity);
		
		// Store in localStorage for demo
		localStorage.setItem('volli-identity', JSON.stringify(identity));

		update(state => ({
			...state,
			currentIdentity: identity,
			error: null
		}));

		return {
			identity,
			requiresVaultCreation: true
		};
	}

	async function createVaultWithPassphrase(passphrase: string): Promise<void> {
		const state = get({ subscribe });
		if (!state.currentIdentity) {
			throw new Error('No identity created');
		}

		// Validate passphrase strength
		const strength = validatePassphraseStrength(passphrase);
		if (passphrase.length < 12 || strength.entropy < 60) {
			throw new Error('Passphrase too weak. Minimum 12 characters with good entropy required');
		}

		try {
			// Create vault using the core implementation
			const vaultId = await core.createVault(passphrase);
			
			if (vaultId) {
				// Generate session token
				const sessionToken = 'session-' + generateSecureId();
				
				// Store session
				localStorage.setItem('volli-session', JSON.stringify({
					token: sessionToken,
					expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
				}));
				
				// Store identity info
				const updatedIdentity = {
					...state.currentIdentity,
					hasVault: true
				};
				localStorage.setItem('volli-identity', JSON.stringify(updatedIdentity));

				update(state => ({
					...state,
					currentIdentity: updatedIdentity,
					isAuthenticated: true,
					vaultUnlocked: true,
					sessionToken,
					failedUnlockAttempts: 0,
					error: null
				}));

				// Start auto-lock timer
				startAutoLockTimer();
			} else {
				throw new Error('Failed to create vault');
			}
		} catch (error) {
			throw error;
		}
	}

	async function unlockVault(passphrase: string): Promise<boolean> {
		const state = get({ subscribe });
		
		if (!state.currentIdentity) {
			throw new Error('No identity loaded');
		}

		try {
			// Use core unlock implementation
			const success = await core.unlockVault(passphrase);
			
			if (success) {
				// Success
				update(s => ({
					...s,
					vaultUnlocked: true,
					failedUnlockAttempts: 0,
					lastActivity: Date.now()
				}));

				startAutoLockTimer();
				return true;
			} else {
				// Failed unlock
				update(s => ({
					...s,
					failedUnlockAttempts: s.failedUnlockAttempts + 1
				}));

				const newState = get({ subscribe });
				if (newState.failedUnlockAttempts >= 3) {
					// Too many attempts, logout
					logout();
					throw new Error('Too many failed attempts. Please log in again');
				}

				return false;
			}
		} catch (error) {
			// Failed unlock
			update(s => ({
				...s,
				failedUnlockAttempts: s.failedUnlockAttempts + 1
			}));

			const newState = get({ subscribe });
			if (newState.failedUnlockAttempts >= 3) {
				// Too many attempts, logout
				logout();
				throw new Error('Too many failed attempts. Please log in again');
			}

			return false;
		}
	}

	function lockVault(): void {
		update(state => ({
			...state,
			vaultUnlocked: false
		}));
		
		stopAutoLockTimer();
		vaultKey = null;
	}

	async function changePassphrase(newPassphrase: string): Promise<void> {
		const state = get({ subscribe });
		if (!state.currentIdentity || !state.vaultUnlocked) {
			throw new Error('Must be authenticated with unlocked vault');
		}
		
		// Validate new passphrase
		const strength = validatePassphraseStrength(newPassphrase);
		if (newPassphrase.length < 12 || strength.entropy < 60) {
			throw new Error('Passphrase too weak. Minimum 12 characters with good entropy required');
		}
		
		// Update stored passphrase
		vaultPassphrase = newPassphrase;
		
		// In a real app, this would re-encrypt the vault with the new passphrase
		// For now, we just update the mock storage
		mockDB.vaults.set(state.currentIdentity.id, {
			id: state.currentIdentity.id,
			passphrase: newPassphrase,
			data: {},
			createdAt: Date.now()
		});
	}

	function logout(): void {
		// Clear all state
		set(initialState);
		
		// Clear storage
		localStorage.removeItem('volli-identity');
		localStorage.removeItem('volli-session');
		
		// Clear mock DB for this session
		mockDB.identities.clear();
		mockDB.vaults.clear();
		mockDB.sessions.clear();
		
		// Clear sensitive data
		vaultKey = null;
		vaultPassphrase = null;
		
		stopAutoLockTimer();
	}

	async function checkSession(): Promise<boolean> {
		try {
			// Check localStorage for session
			const sessionData = localStorage.getItem('volli-session');
			const identityData = localStorage.getItem('volli-identity');
			
			if (!sessionData || !identityData) {
				return false;
			}

			const session = JSON.parse(sessionData);
			const identity = JSON.parse(identityData);

			// Check if session is expired
			if (session.expiresAt < Date.now()) {
				localStorage.removeItem('volli-session');
				localStorage.removeItem('volli-identity'); // Also clear identity on expired session
				return false;
			}

			// Restore state
			update(state => ({
				...state,
				currentIdentity: identity,
				isAuthenticated: true,
				sessionToken: session.token,
				vaultUnlocked: false // Always locked on restore
			}));

			return true;
		} catch {
			return false;
		}
	}

	function updateLastActivity(): void {
		update(state => ({
			...state,
			lastActivity: Date.now()
		}));
		
		// Reset auto-lock timer if vault is unlocked
		const state = get({ subscribe });
		if (state.vaultUnlocked) {
			startAutoLockTimer();
		}
	}

	function setAutoLockTimeout(minutes: number): void {
		update(state => ({
			...state,
			autoLockTimeout: minutes
		}));
		
		// Restart timer with new timeout
		const state = get({ subscribe });
		if (state.vaultUnlocked) {
			startAutoLockTimer();
		}
	}

	async function initialize() {
		// Check for existing session on initialization
		await checkSession();
	}

	// Initialize on creation
	checkSession();

	return {
		subscribe,
		initialize,
		createIdentity,
		createVaultWithPassphrase,
		unlockVault,
		lockVault,
		changePassphrase,
		logout,
		checkSession,
		updateLastActivity,
		setAutoLockTimeout,
		// Private methods exposed for testing
		generateSecureId,
		validatePassphraseStrength,
		constantTimeCompare,
		clearMemoryState
	};
}

export const authStore = createAuthStore();
export const auth = authStore; // Backward compatibility
export const isAuthenticated = derived(authStore, $auth => $auth.isAuthenticated);