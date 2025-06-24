import { writable, derived } from 'svelte/store';
import { vault } from './vault';

export interface Contact {
	id: string;
	name: string;
	publicKey: string;
	verified: boolean;
	createdAt: number;
	lastSeen?: number;
	avatar?: string;
	notes?: string;
}

interface ContactsState {
	contacts: Map<string, Contact>;
	isLoading: boolean;
	error: string | null;
}

function createContactsStore() {
	const { subscribe, set, update } = writable<ContactsState>({
		contacts: new Map(),
		isLoading: false,
		error: null
	});

	return {
		subscribe,
		
		async loadContacts(): Promise<void> {
			update(state => ({ ...state, isLoading: true, error: null }));
			
			try {
				const data = await vault.getData('contacts');
				const contacts = new Map();
				
				if (data && Array.isArray(data)) {
					for (const contact of data) {
						contacts.set(contact.id, contact);
					}
				}
				
				update(state => ({
					...state,
					contacts,
					isLoading: false
				}));
			} catch (error) {
				console.error('Failed to load contacts:', error);
				update(state => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Failed to load contacts'
				}));
			}
		},
		
		async addContact(name: string, publicKey: string, verified: boolean = false): Promise<Contact> {
			const contact: Contact = {
				id: crypto.randomUUID(),
				name: name.trim(),
				publicKey,
				verified,
				createdAt: Date.now()
			};
			
			try {
				// Add to state
				update(state => {
					const newContacts = new Map(state.contacts);
					newContacts.set(contact.id, contact);
					return { ...state, contacts: newContacts, error: null };
				});
				
				// Save to vault
				await this.saveContacts();
				
				return contact;
			} catch (error) {
				console.error('Failed to add contact:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to add contact'
				}));
				throw error;
			}
		},
		
		async updateContact(id: string, updates: Partial<Contact>): Promise<void> {
			try {
				update(state => {
					const newContacts = new Map(state.contacts);
					const contact = newContacts.get(id);
					if (contact) {
						newContacts.set(id, { ...contact, ...updates });
					}
					return { ...state, contacts: newContacts, error: null };
				});
				
				await this.saveContacts();
			} catch (error) {
				console.error('Failed to update contact:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to update contact'
				}));
				throw error;
			}
		},
		
		async deleteContact(id: string): Promise<void> {
			try {
				update(state => {
					const newContacts = new Map(state.contacts);
					newContacts.delete(id);
					return { ...state, contacts: newContacts, error: null };
				});
				
				await this.saveContacts();
			} catch (error) {
				console.error('Failed to delete contact:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to delete contact'
				}));
				throw error;
			}
		},
		
		async saveContacts(): Promise<void> {
			let contacts: Contact[] = [];
			update(state => {
				contacts = Array.from(state.contacts.values());
				return state;
			});
			
			await vault.storeData('contacts', contacts);
		},
		
		getContact(id: string): Contact | undefined {
			let contact: Contact | undefined;
			update(state => {
				contact = state.contacts.get(id);
				return state;
			});
			return contact;
		},
		
		searchContacts(query: string): Contact[] {
			let results: Contact[] = [];
			update(state => {
				const searchTerm = query.toLowerCase().trim();
				if (!searchTerm) {
					results = Array.from(state.contacts.values());
				} else {
					results = Array.from(state.contacts.values()).filter(contact =>
						contact.name.toLowerCase().includes(searchTerm) ||
						(contact.notes && contact.notes.toLowerCase().includes(searchTerm))
					);
				}
				return state;
			});
			return results;
		},
		
		reset(): void {
			set({
				contacts: new Map(),
				isLoading: false,
				error: null
			});
		}
	};
}

export const contacts = createContactsStore();

// Derived stores for common use cases
export const contactsList = derived(contacts, $contacts => 
	Array.from($contacts.contacts.values()).sort((a, b) => a.name.localeCompare(b.name))
);

export const verifiedContacts = derived(contacts, $contacts =>
	Array.from($contacts.contacts.values()).filter(contact => contact.verified)
);

export const contactsCount = derived(contacts, $contacts => $contacts.contacts.size);