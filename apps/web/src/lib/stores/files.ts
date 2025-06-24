import { writable, derived } from 'svelte/store';
import { vault } from './vault';
import { auth } from './auth';

export interface FileMetadata {
	id: string;
	name: string;
	size: number;
	type: string;
	uploadedAt: number;
	lastAccessed?: number;
	encryptedSize: number;
	checksum: string;
	tags?: string[];
	sharedWith?: string[]; // Contact IDs
	isShared?: boolean;
	thumbnail?: string; // Base64 encoded thumbnail for images
}

export interface UploadProgress {
	fileId: string;
	fileName: string;
	progress: number; // 0-100
	stage: 'reading' | 'encrypting' | 'storing' | 'complete' | 'error';
	error?: string;
}

interface FilesState {
	files: Map<string, FileMetadata>;
	uploads: Map<string, UploadProgress>;
	isLoading: boolean;
	error: string | null;
}

function createFilesStore() {
	const { subscribe, set, update } = writable<FilesState>({
		files: new Map(),
		uploads: new Map(),
		isLoading: false,
		error: null
	});

	return {
		subscribe,
		
		async loadFiles(): Promise<void> {
			update(state => ({ ...state, isLoading: true, error: null }));
			
			try {
				const data = await vault.getData('files');
				const files = new Map();
				
				if (data && Array.isArray(data)) {
					for (const file of data) {
						files.set(file.id, file);
					}
				}
				
				update(state => ({
					...state,
					files,
					isLoading: false
				}));
			} catch (error) {
				console.error('Failed to load files:', error);
				update(state => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Failed to load files'
				}));
			}
		},
		
		async uploadFile(file: File, tags?: string[]): Promise<string> {
			const fileId = crypto.randomUUID();
			
			// Start upload progress tracking
			update(state => {
				const newUploads = new Map(state.uploads);
				newUploads.set(fileId, {
					fileId,
					fileName: file.name,
					progress: 0,
					stage: 'reading'
				});
				return { ...state, uploads: newUploads };
			});
			
			try {
				// Stage 1: Read file
				const arrayBuffer = await file.arrayBuffer();
				update(state => {
					const newUploads = new Map(state.uploads);
					const upload = newUploads.get(fileId);
					if (upload) {
						upload.progress = 25;
						upload.stage = 'encrypting';
					}
					return { ...state, uploads: newUploads };
				});
				
				// Stage 2: Encrypt file (mock implementation)
				await new Promise(resolve => setTimeout(resolve, 500)); // Simulate encryption time
				const encryptedData = arrayBuffer; // In real app, this would be encrypted
				const checksum = await this.calculateChecksum(arrayBuffer);
				
				update(state => {
					const newUploads = new Map(state.uploads);
					const upload = newUploads.get(fileId);
					if (upload) {
						upload.progress = 75;
						upload.stage = 'storing';
					}
					return { ...state, uploads: newUploads };
				});
				
				// Stage 3: Generate thumbnail for images
				let thumbnail: string | undefined;
				if (file.type.startsWith('image/')) {
					thumbnail = await this.generateThumbnail(file);
				}
				
				// Stage 4: Store in vault
				const metadata: FileMetadata = {
					id: fileId,
					name: file.name,
					size: file.size,
					type: file.type,
					uploadedAt: Date.now(),
					encryptedSize: encryptedData.byteLength,
					checksum,
					tags,
					thumbnail
				};
				
				// Store both metadata and encrypted data
				await vault.storeData(`file_${fileId}`, encryptedData);
				
				// Update files list
				update(state => {
					const newFiles = new Map(state.files);
					newFiles.set(fileId, metadata);
					
					const newUploads = new Map(state.uploads);
					const upload = newUploads.get(fileId);
					if (upload) {
						upload.progress = 100;
						upload.stage = 'complete';
					}
					
					return { ...state, files: newFiles, uploads: newUploads };
				});
				
				// Save updated files list
				await this.saveFiles();
				
				// Clean up upload progress after delay
				setTimeout(() => {
					update(state => {
						const newUploads = new Map(state.uploads);
						newUploads.delete(fileId);
						return { ...state, uploads: newUploads };
					});
				}, 2000);
				
				return fileId;
			} catch (error) {
				update(state => {
					const newUploads = new Map(state.uploads);
					const upload = newUploads.get(fileId);
					if (upload) {
						upload.stage = 'error';
						upload.error = error instanceof Error ? error.message : 'Upload failed';
					}
					return { ...state, uploads: newUploads };
				});
				throw error;
			}
		},
		
		async downloadFile(fileId: string): Promise<Blob> {
			const metadata = this.getFile(fileId);
			if (!metadata) {
				throw new Error('File not found');
			}
			
			try {
				// Get encrypted data from vault
				const encryptedData = await vault.getData(`file_${fileId}`);
				if (!encryptedData) {
					throw new Error('File data not found');
				}
				
				// Decrypt data (mock implementation)
				const decryptedData = encryptedData; // In real app, this would be decrypted
				
				// Update last accessed time
				await this.updateFile(fileId, { lastAccessed: Date.now() });
				
				return new Blob([decryptedData], { type: metadata.type });
			} catch (error) {
				console.error('Failed to download file:', error);
				throw error;
			}
		},
		
		async deleteFile(fileId: string): Promise<void> {
			try {
				// Remove file data from vault
				await vault.removeData(`file_${fileId}`);
				
				// Remove from files list
				update(state => {
					const newFiles = new Map(state.files);
					newFiles.delete(fileId);
					return { ...state, files: newFiles, error: null };
				});
				
				await this.saveFiles();
			} catch (error) {
				console.error('Failed to delete file:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to delete file'
				}));
				throw error;
			}
		},
		
		async updateFile(fileId: string, updates: Partial<FileMetadata>): Promise<void> {
			try {
				update(state => {
					const newFiles = new Map(state.files);
					const file = newFiles.get(fileId);
					if (file) {
						newFiles.set(fileId, { ...file, ...updates });
					}
					return { ...state, files: newFiles, error: null };
				});
				
				await this.saveFiles();
			} catch (error) {
				console.error('Failed to update file:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to update file'
				}));
				throw error;
			}
		},
		
		async shareFile(fileId: string, contactIds: string[]): Promise<void> {
			const file = this.getFile(fileId);
			if (!file) {
				throw new Error('File not found');
			}
			
			await this.updateFile(fileId, {
				sharedWith: [...(file.sharedWith || []), ...contactIds],
				isShared: true
			});
		},
		
		async unshareFile(fileId: string, contactId?: string): Promise<void> {
			const file = this.getFile(fileId);
			if (!file) {
				throw new Error('File not found');
			}
			
			if (contactId) {
				// Remove specific contact
				const sharedWith = (file.sharedWith || []).filter(id => id !== contactId);
				await this.updateFile(fileId, {
					sharedWith,
					isShared: sharedWith.length > 0
				});
			} else {
				// Remove all sharing
				await this.updateFile(fileId, {
					sharedWith: [],
					isShared: false
				});
			}
		},
		
		async saveFiles(): Promise<void> {
			let files: FileMetadata[] = [];
			update(state => {
				files = Array.from(state.files.values());
				return state;
			});
			
			await vault.storeData('files', files);
		},
		
		getFile(fileId: string): FileMetadata | undefined {
			let file: FileMetadata | undefined;
			update(state => {
				file = state.files.get(fileId);
				return state;
			});
			return file;
		},
		
		searchFiles(query: string): FileMetadata[] {
			let results: FileMetadata[] = [];
			update(state => {
				const searchTerm = query.toLowerCase().trim();
				if (!searchTerm) {
					results = Array.from(state.files.values());
				} else {
					results = Array.from(state.files.values()).filter(file =>
						file.name.toLowerCase().includes(searchTerm) ||
						file.type.toLowerCase().includes(searchTerm) ||
						(file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
					);
				}
				return state;
			});
			return results;
		},
		
		async calculateChecksum(data: ArrayBuffer): Promise<string> {
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		},
		
		async generateThumbnail(file: File): Promise<string> {
			return new Promise((resolve, reject) => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				const img = new Image();
				
				img.onload = () => {
					// Set thumbnail size
					const maxSize = 200;
					let { width, height } = img;
					
					if (width > height) {
						if (width > maxSize) {
							height = (height * maxSize) / width;
							width = maxSize;
						}
					} else {
						if (height > maxSize) {
							width = (width * maxSize) / height;
							height = maxSize;
						}
					}
					
					canvas.width = width;
					canvas.height = height;
					
					ctx?.drawImage(img, 0, 0, width, height);
					resolve(canvas.toDataURL('image/jpeg', 0.8));
				};
				
				img.onerror = () => reject(new Error('Failed to generate thumbnail'));
				img.src = URL.createObjectURL(file);
			});
		},
		
		formatFileSize(bytes: number): string {
			if (bytes < 1024) return bytes + ' B';
			if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
			if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
			return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
		},
		
		reset(): void {
			set({
				files: new Map(),
				uploads: new Map(),
				isLoading: false,
				error: null
			});
		}
	};
}

export const files = createFilesStore();

// Derived stores for common use cases
export const filesList = derived(files, $files => 
	Array.from($files.files.values()).sort((a, b) => b.uploadedAt - a.uploadedAt)
);

export const sharedFiles = derived(files, $files =>
	Array.from($files.files.values()).filter(file => file.isShared)
);

export const recentFiles = derived(files, $files =>
	Array.from($files.files.values())
		.sort((a, b) => (b.lastAccessed || b.uploadedAt) - (a.lastAccessed || a.uploadedAt))
		.slice(0, 10)
);

export const uploadProgress = derived(files, $files => 
	Array.from($files.uploads.values())
);

export const totalStorageUsed = derived(files, $files =>
	Array.from($files.files.values()).reduce((total, file) => total + file.encryptedSize, 0)
);