import { writable, get } from 'svelte/store';
import { auth } from './auth';

// Local type definitions
interface QueryOptions {
	type?: string;
	conversationId?: string;
	[key: string]: any;
}

interface VaultState {
	isInitialized: boolean;
	isUnlocked: boolean;
	isLoading: boolean;
	error: string | null;
	collections: string[];
}

function createVaultStore() {
	const { subscribe, set, update } = writable<VaultState>({
		isInitialized: false,
		isUnlocked: false,
		isLoading: false,
		error: null,
		collections: []
	});

	let vaultKey: Uint8Array | null = null;

	async function initialize() {
		update(state => ({ ...state, isLoading: true, error: null }));
		
		try {
			const authState = get(auth);
			if (!authState.isAuthenticated) {
				throw new Error('Not authenticated');
			}

			// Check if vault key exists in session storage
			const storedKey = sessionStorage.getItem('volli_vault_key');
			if (storedKey) {
				vaultKey = new Uint8Array(Buffer.from(storedKey, 'base64'));
				update(state => ({
					...state,
					isInitialized: true,
					isUnlocked: true,
					isLoading: false,
					collections: ['messages', 'contacts', 'files']
				}));
			} else {
				update(state => ({
					...state,
					isInitialized: true,
					isUnlocked: false,
					isLoading: false
				}));
			}
		} catch (error) {
			update(state => ({
				...state,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to initialize vault'
			}));
		}
	}

	async function unlock(passphrase: string) {
		update(state => ({ ...state, isLoading: true, error: null }));
		
		try {
			// Derive key from passphrase (simplified for now)
			const encoder = new TextEncoder();
			const data = encoder.encode(passphrase);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			vaultKey = new Uint8Array(hashBuffer);
			
			// Store in session storage
			sessionStorage.setItem('volli_vault_key', Buffer.from(vaultKey).toString('base64'));
			
			update(state => ({
				...state,
				isUnlocked: true,
				isLoading: false,
				collections: ['messages', 'contacts', 'files']
			}));
		} catch (error) {
			update(state => ({
				...state,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to unlock vault'
			}));
		}
	}

	async function lock() {
		vaultKey = null;
		sessionStorage.removeItem('volli_vault_key');
		
		update(state => ({
			...state,
			isUnlocked: false,
			collections: []
		}));
	}

	async function store(collection: string, data: any) {
		if (!vaultKey) throw new Error('Vault is locked');
		
		// Store encrypted data in IndexedDB (simplified)
		const db = await openDB();
		const tx = db.transaction(collection, 'readwrite');
		await tx.objectStore(collection).put({
			id: data.id || crypto.randomUUID(),
			data: JSON.stringify(data),
			timestamp: Date.now()
		});
	}

	async function query(collection: string, options?: QueryOptions) {
		if (!vaultKey) throw new Error('Vault is locked');
		
		// Query from IndexedDB (simplified)
		const db = await openDB();
		const tx = db.transaction(collection, 'readonly');
		const items = await tx.objectStore(collection).getAll();
		
		return items.map(item => JSON.parse(item.data));
	}

	async function openDB(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open('volli_vault', 1);
			
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
			
			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				['messages', 'contacts', 'files'].forEach(collection => {
					if (!db.objectStoreNames.contains(collection)) {
						db.createObjectStore(collection, { keyPath: 'id' });
					}
				});
			};
		});
	}

	return {
		subscribe,
		initialize,
		unlock,
		lock,
		store,
		query
	};
}

export const vault = createVaultStore();