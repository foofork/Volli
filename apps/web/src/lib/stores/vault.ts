import { writable, derived, get } from 'svelte/store';
import { authStore } from './auth';

// Local type definitions
interface Contact {
	id: string;
	displayName: string;
	identityId: string;
	publicKey: string;
	addedAt: number;
}

interface Message {
	id: string;
	conversationId: string;
	content: string;
	sender: string;
	timestamp: number;
	delivered: boolean;
	read: boolean;
	encrypted: boolean;
}

interface FileMetadata {
	id: string;
	name: string;
	size: number;
	type: string;
	uploadedAt: number;
	encryptedKey?: string;
}

interface VaultSettings {
	theme: 'light' | 'dark';
	notifications: boolean;
	language?: string;
	[key: string]: any;
}

interface VaultData {
	version: number;
	created: number;
	contacts: Contact[];
	conversations: { [id: string]: Message[] };
	files: FileMetadata[];
	settings: VaultSettings;
}

interface VaultState {
	isUnlocked: boolean;
	autoLockTimeout: number;
	lastActivity: number;
	error: string | null;
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Mock encrypted file storage (in real app, use IndexedDB)
const fileStorage = new Map<string, ArrayBuffer>();

function createVaultStore() {
	const { subscribe, set, update } = writable<VaultState>({
		isUnlocked: false,
		autoLockTimeout: 15,
		lastActivity: Date.now(),
		error: null
	});

	// Mock vault data (in real app, this would be encrypted in IndexedDB)
	let vaultData: VaultData = {
		version: 1,
		created: Date.now(),
		contacts: [],
		conversations: {},
		files: [],
		settings: {
			theme: 'light',
			notifications: true
		}
	};

	// Subscribe to auth store to sync vault lock state
	authStore.subscribe(authState => {
		update(state => ({
			...state,
			isUnlocked: authState.vaultUnlocked
		}));
	});

	function updateLastActivity() {
		update(state => ({
			...state,
			lastActivity: Date.now()
		}));
		authStore.updateLastActivity();
	}

	async function getDecryptedVault(): Promise<VaultData> {
		const state = get({ subscribe });
		if (!state.isUnlocked) {
			throw new Error('Vault is locked');
		}

		// In real app, decrypt from storage
		if (!vaultData) {
			throw new Error('Vault data not available');
		}

		updateLastActivity();
		return vaultData;
	}

	async function saveVault(data: VaultData): Promise<void> {
		const state = get({ subscribe });
		if (!state.isUnlocked) {
			throw new Error('Cannot save to locked vault');
		}

		// In real app, encrypt and save to IndexedDB
		vaultData = data;
		updateLastActivity();
		
		// Simulate save operation that could fail
		const shouldFail = (authStore as any).saveVaultData;
		if (shouldFail && typeof shouldFail === 'function') {
			await shouldFail(data);
		}
	}

	async function getContacts(): Promise<Contact[]> {
		const vault = await getDecryptedVault();
		return vault.contacts || [];
	}

	async function addContact(contact: Contact): Promise<void> {
		const vault = await getDecryptedVault();
		
		// Check for duplicates
		if (vault.contacts.some(c => c.id === contact.id || c.identityId === contact.identityId)) {
			throw new Error('Contact already exists');
		}
		
		vault.contacts.push(contact);
		await saveVault(vault);
	}

	async function getMessages(conversationId: string): Promise<Message[]> {
		const vault = await getDecryptedVault();
		return vault.conversations[conversationId] || [];
	}

	async function sendMessage(conversationId: string, content: string): Promise<Message> {
		const vault = await getDecryptedVault();
		
		const message: Message = {
			id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			conversationId,
			content,
			sender: get(authStore).currentIdentity?.id || 'unknown',
			timestamp: Date.now(),
			delivered: false,
			read: false,
			encrypted: true
		};
		
		if (!vault.conversations[conversationId]) {
			vault.conversations[conversationId] = [];
		}
		
		vault.conversations[conversationId].push(message);
		await saveVault(vault);
		
		return message;
	}

	async function storeFile(file: File): Promise<string> {
		if (file.size > MAX_FILE_SIZE) {
			throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
		}

		const vault = await getDecryptedVault();
		
		// Read file content
		const content = await file.arrayBuffer();
		
		// Generate file ID
		const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Create file metadata
		const metadata: FileMetadata = {
			id: fileId,
			name: file.name,
			size: file.size,
			type: file.type,
			uploadedAt: Date.now()
		};
		
		// Store encrypted file (mock)
		fileStorage.set(fileId, content);
		
		// Add metadata to vault
		vault.files.push(metadata);
		await saveVault(vault);
		
		return fileId;
	}

	async function getFile(fileId: string): Promise<Blob> {
		const vault = await getDecryptedVault();
		
		const metadata = vault.files.find(f => f.id === fileId);
		if (!metadata) {
			throw new Error('File not found');
		}
		
		const content = fileStorage.get(fileId);
		if (!content) {
			throw new Error('File content not found');
		}
		
		return new Blob([content], { type: metadata.type });
	}

	async function getFiles(): Promise<FileMetadata[]> {
		const vault = await getDecryptedVault();
		return vault.files || [];
	}

	async function updateSettings(settings: Partial<VaultSettings>): Promise<void> {
		const vault = await getDecryptedVault();
		
		vault.settings = {
			...vault.settings,
			...settings
		};
		
		await saveVault(vault);
	}

	async function getSettings(): Promise<VaultSettings> {
		const vault = await getDecryptedVault();
		return vault.settings;
	}

	async function searchContacts(query: string): Promise<Contact[]> {
		const contacts = await getContacts();
		const lowerQuery = query.toLowerCase();
		
		return contacts.filter(contact => 
			contact.displayName.toLowerCase().includes(lowerQuery)
		);
	}

	async function searchMessages(query: string): Promise<Message[]> {
		const vault = await getDecryptedVault();
		const lowerQuery = query.toLowerCase();
		const results: Message[] = [];
		
		for (const messages of Object.values(vault.conversations)) {
			results.push(...messages.filter(msg => 
				msg.content.toLowerCase().includes(lowerQuery)
			));
		}
		
		return results;
	}

	function reset() {
		vaultData = {
			version: 1,
			created: Date.now(),
			contacts: [],
			conversations: {},
			files: [],
			settings: {
				theme: 'light',
				notifications: true
			}
		};
		fileStorage.clear();
		set({
			isUnlocked: false,
			autoLockTimeout: 15,
			lastActivity: Date.now(),
			error: null
		});
	}

	// For testing - expose vault data getter
	(authStore as any).getVaultData = async () => vaultData;

	async function initialize() {
		// Initialize vault - in real app, load from IndexedDB
		const authState = get(authStore);
		if (authState.isAuthenticated && authState.vaultUnlocked) {
			update(state => ({
				...state,
				isUnlocked: true
			}));
		}
	}

	async function lock() {
		// Lock the vault - this should be synchronized with auth store
		authStore.lockVault();
	}

	const store = {
		subscribe,
		initialize,
		lock,
		getContacts,
		addContact,
		getMessages,
		sendMessage,
		storeFile,
		getFile,
		getFiles,
		updateSettings,
		getSettings,
		searchContacts,
		searchMessages,
		reset,
		// Expose internal methods for other stores
		getDecryptedVault,
		saveVault
	};
	
	// For testing - expose internal data
	(store as any).vaultData = vaultData;
	Object.defineProperty(store, 'vaultData', {
		get: () => vaultData,
		set: (value) => { vaultData = value; },
		configurable: true
	});
	
	return store;
}

export const vaultStore = createVaultStore();
export const vault = vaultStore; // Backward compatibility