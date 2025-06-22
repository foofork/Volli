import { writable, derived } from 'svelte/store';

// Local type definitions to avoid cross-package imports
interface Identity {
	id: string;
	publicKey: Uint8Array;
	devices: Device[];
	createdAt: Date;
	recoveryKey: Uint8Array;
}

interface Device {
	id: string;
	name: string;
	publicKey: Uint8Array;
	type: 'primary' | 'secondary';
	platform: string;
	lastSeen: Date;
	capabilities: string[];
}

interface AuthState {
	identity: Identity | null;
	device: Device | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		identity: null,
		device: null,
		isAuthenticated: false,
		isLoading: false,
		error: null
	});

	async function initialize() {
		update(state => ({ ...state, isLoading: true, error: null }));
		
		try {
			// Check for existing identity in localStorage
			const storedIdentity = localStorage.getItem('volli_identity');
			if (storedIdentity) {
				const identity = JSON.parse(storedIdentity);
				update(state => ({
					...state,
					identity,
					isAuthenticated: true,
					isLoading: false
				}));
			} else {
				update(state => ({ ...state, isLoading: false }));
			}
		} catch (error) {
			update(state => ({
				...state,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to initialize'
			}));
		}
	}

	async function createIdentity(displayName: string) {
		update(state => ({ ...state, isLoading: true, error: null }));
		
		try {
			// Create mock identity for now (will use real @volli/identity-core later)
			const identity: Identity = {
				id: crypto.randomUUID(),
				publicKey: new Uint8Array(32),
				devices: [],
				createdAt: new Date(),
				recoveryKey: new Uint8Array(32)
			};
			
			const device: Device = {
				id: crypto.randomUUID(),
				name: displayName,
				publicKey: new Uint8Array(32),
				type: 'primary',
				platform: 'web',
				lastSeen: new Date(),
				capabilities: ['messaging', 'storage']
			};
			
			// Store in localStorage
			localStorage.setItem('volli_identity', JSON.stringify(identity));
			localStorage.setItem('volli_device', JSON.stringify(device));
			
			update(state => ({
				...state,
				identity,
				device,
				isAuthenticated: true,
				isLoading: false
			}));
		} catch (error) {
			update(state => ({
				...state,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to create identity'
			}));
		}
	}

	async function logout() {
		localStorage.removeItem('volli_identity');
		localStorage.removeItem('volli_device');
		localStorage.removeItem('volli_vault_key');
		
		set({
			identity: null,
			device: null,
			isAuthenticated: false,
			isLoading: false,
			error: null
		});
	}

	return {
		subscribe,
		initialize,
		createIdentity,
		logout
	};
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, $auth => $auth.isAuthenticated);