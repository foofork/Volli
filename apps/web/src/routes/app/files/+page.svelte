<script lang="ts">
	import { onMount } from 'svelte';
	import { files, filesList, uploadProgress, totalStorageUsed } from '$lib/stores/files';
	import { contactsList } from '$lib/stores/contacts';
	import type { FileMetadata } from '$lib/stores/files';
	import { toasts } from '$lib/stores/toasts';
	
	let searchQuery = '';
	let selectedFiles = new Set<string>();
	let showShareModal = false;
	let fileToShare: FileMetadata | null = null;
	let selectedContacts = new Set<string>();
	let dragOver = false;
	let fileInput: HTMLInputElement;
	let viewMode: 'grid' | 'list' = 'grid';
	let sortBy: 'name' | 'date' | 'size' | 'type' = 'date';
	let sortOrder: 'asc' | 'desc' = 'desc';
	
	onMount(() => {
		// Files are loaded by the layout when vault is unlocked
	});
	
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			for (const file of Array.from(input.files)) {
				uploadFile(file);
			}
			input.value = ''; // Reset input
		}
	}
	
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		
		if (event.dataTransfer?.files) {
			for (const file of Array.from(event.dataTransfer.files)) {
				uploadFile(file);
			}
		}
	}
	
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}
	
	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
	}
	
	async function uploadFile(file: File) {
		try {
			const tags = extractTagsFromFilename(file.name);
			await files.uploadFile(file, tags);
			toasts.success(`${file.name} uploaded successfully`);
		} catch (error) {
			console.error('Failed to upload file:', error);
			toasts.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
	
	function extractTagsFromFilename(filename: string): string[] {
		const tags: string[] = [];
		
		// Extract file extension as a tag
		const ext = filename.split('.').pop()?.toLowerCase();
		if (ext) tags.push(ext);
		
		// Add category tags based on file type
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
			tags.push('image');
		} else if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext || '')) {
			tags.push('video');
		} else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) {
			tags.push('audio');
		} else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
			tags.push('document');
		}
		
		return tags;
	}
	
	async function downloadFile(file: FileMetadata) {
		try {
			const blob = await files.downloadFile(file.id);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = file.name;
			a.click();
			URL.revokeObjectURL(url);
			toasts.success(`${file.name} downloaded successfully`);
		} catch (error) {
			console.error('Failed to download file:', error);
			toasts.error(`Failed to download ${file.name}`);
		}
	}
	
	async function deleteFile(file: FileMetadata) {
		if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
			try {
				await files.deleteFile(file.id);
				selectedFiles.delete(file.id);
				selectedFiles = selectedFiles; // Trigger reactivity
				toasts.success(`${file.name} deleted successfully`);
			} catch (error) {
				console.error('Failed to delete file:', error);
				toasts.error(`Failed to delete ${file.name}`);
			}
		}
	}
	
	async function deleteSelectedFiles() {
		if (selectedFiles.size === 0) return;
		
		if (confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) {
			const promises = Array.from(selectedFiles).map(fileId => files.deleteFile(fileId));
			
			try {
				await Promise.all(promises);
				const count = selectedFiles.size;
				selectedFiles.clear();
				selectedFiles = selectedFiles; // Trigger reactivity
				toasts.success(`${count} files deleted successfully`);
			} catch (error) {
				console.error('Failed to delete files:', error);
				toasts.error('Some files could not be deleted');
			}
		}
	}
	
	function shareFile(file: FileMetadata) {
		fileToShare = file;
		selectedContacts.clear();
		showShareModal = true;
	}
	
	async function confirmShare() {
		if (!fileToShare || selectedContacts.size === 0) return;
		
		try {
			await files.shareFile(fileToShare.id, Array.from(selectedContacts));
			toasts.success(`${fileToShare.name} shared with ${selectedContacts.size} contact${selectedContacts.size > 1 ? 's' : ''}`);
			showShareModal = false;
			fileToShare = null;
			selectedContacts.clear();
		} catch (error) {
			console.error('Failed to share file:', error);
			toasts.error('Failed to share file');
		}
	}
	
	function toggleFileSelection(fileId: string) {
		if (selectedFiles.has(fileId)) {
			selectedFiles.delete(fileId);
		} else {
			selectedFiles.add(fileId);
		}
		selectedFiles = selectedFiles; // Trigger reactivity
	}
	
	function selectAllFiles() {
		if (selectedFiles.size === filteredFiles.length) {
			selectedFiles.clear();
		} else {
			filteredFiles.forEach(file => selectedFiles.add(file.id));
		}
		selectedFiles = selectedFiles; // Trigger reactivity
	}
	
	function getFileIcon(type: string): string {
		if (type.startsWith('image/')) return '🖼️';
		if (type.startsWith('video/')) return '🎬';
		if (type.startsWith('audio/')) return '🎵';
		if (type.includes('pdf')) return '📄';
		if (type.includes('text') || type.includes('document')) return '📝';
		if (type.includes('zip') || type.includes('rar')) return '📦';
		if (type.includes('code') || type.includes('json') || type.includes('xml')) return '💻';
		return '📎';
	}
	
	$: filteredFiles = $filesList.filter(file => 
		file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		file.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
		(file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
	).sort((a, b) => {
		let aVal, bVal;
		
		switch (sortBy) {
			case 'name':
				aVal = a.name.toLowerCase();
				bVal = b.name.toLowerCase();
				break;
			case 'size':
				aVal = a.size;
				bVal = b.size;
				break;
			case 'type':
				aVal = a.type;
				bVal = b.type;
				break;
			case 'date':
			default:
				aVal = a.uploadedAt;
				bVal = b.uploadedAt;
				break;
		}
		
		const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
		return sortOrder === 'asc' ? result : -result;
	});
</script>

<div class="files">
	<div class="files-header">
		<div class="header-left">
			<h1>Files</h1>
			<div class="storage-info">
				<span>{files.formatFileSize($totalStorageUsed)} used</span>
				<span>•</span>
				<span>{$filesList.length} files</span>
			</div>
		</div>
		<div class="header-actions">
			{#if selectedFiles.size > 0}
				<button class="danger-button" on:click={deleteSelectedFiles}>
					🗑️ Delete {selectedFiles.size}
				</button>
			{/if}
			<label class="upload-button">
				<input type="file" multiple on:change={handleFileSelect} bind:this={fileInput} hidden />
				<span>📤 Upload Files</span>
			</label>
		</div>
	</div>
	
	<div class="files-toolbar">
		<div class="search-bar">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search files..."
			/>
		</div>
		
		<div class="toolbar-actions">
			<div class="view-controls">
				<button 
					class="view-button"
					class:active={viewMode === 'grid'}
					on:click={() => viewMode = 'grid'}
					title="Grid view"
				>⚏</button>
				<button 
					class="view-button"
					class:active={viewMode === 'list'}
					on:click={() => viewMode = 'list'}
					title="List view"
				>☰</button>
			</div>
			
			<select bind:value={sortBy} class="sort-select">
				<option value="date">Sort by Date</option>
				<option value="name">Sort by Name</option>
				<option value="size">Sort by Size</option>
				<option value="type">Sort by Type</option>
			</select>
			
			<button 
				class="sort-order"
				on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
				title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
			>
				{sortOrder === 'asc' ? '↑' : '↓'}
			</button>
			
			{#if $filesList.length > 0}
				<button class="select-all" on:click={selectAllFiles}>
					{selectedFiles.size === filteredFiles.length ? 'Deselect All' : 'Select All'}
				</button>
			{/if}
		</div>
	</div>
	
	<div 
		class="files-content"
		class:drag-over={dragOver}
		role="region"
		aria-label="File drop zone"
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
	>
		<!-- Upload Progress -->
		{#if $uploadProgress.length > 0}
			<div class="upload-progress-container">
				{#each $uploadProgress as upload}
					<div class="upload-progress">
						<div class="upload-header">
							<span class="upload-filename">{upload.fileName}</span>
							<span class="upload-stage">{upload.stage}</span>
						</div>
						<div class="progress-bar">
							<div class="progress-fill" style="width: {upload.progress}%"></div>
						</div>
						{#if upload.error}
							<div class="upload-error">{upload.error}</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
		
		{#if $files.isLoading}
			<div class="loading-state">
				<p>Loading files...</p>
			</div>
		{:else if filteredFiles.length === 0}
			{#if searchQuery}
				<div class="empty-state">
					<div class="empty-icon">🔍</div>
					<h2>No results found</h2>
					<p>No files match your search for "{searchQuery}"</p>
				</div>
			{:else}
				<div class="empty-state">
					<div class="empty-icon">📁</div>
					<h2>No files yet</h2>
					<p>Upload files to store them securely with end-to-end encryption</p>
					<div class="empty-actions">
						<label class="upload-prompt">
							<input type="file" multiple on:change={handleFileSelect} hidden />
							<span>Choose files to upload</span>
						</label>
						<p class="drag-hint">or drag and drop files here</p>
					</div>
				</div>
			{/if}
		{:else}
			<div class="files-{viewMode}">
				{#each filteredFiles as file}
					<div class="file-item" class:selected={selectedFiles.has(file.id)}>
						<div class="file-checkbox">
							<input 
								type="checkbox" 
								checked={selectedFiles.has(file.id)}
								on:change={() => toggleFileSelection(file.id)}
							/>
						</div>
						
						<div class="file-preview">
							{#if file.thumbnail}
								<img src={file.thumbnail} alt={file.name} class="file-thumbnail" />
							{:else}
								<div class="file-icon">{getFileIcon(file.type)}</div>
							{/if}
						</div>
						
						<div class="file-info">
							<div class="file-name" title={file.name}>{file.name}</div>
							<div class="file-meta">
								<span>{files.formatFileSize(file.size)}</span>
								<span>•</span>
								<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
								{#if file.isShared}
									<span class="shared-indicator">🔗 Shared</span>
								{/if}
							</div>
							{#if file.tags && file.tags.length > 0}
								<div class="file-tags">
									{#each file.tags.slice(0, 3) as tag}
										<span class="tag">{tag}</span>
									{/each}
									{#if file.tags.length > 3}
										<span class="tag-more">+{file.tags.length - 3}</span>
									{/if}
								</div>
							{/if}
						</div>
						
						<div class="file-actions">
							<button class="action-button" on:click={() => downloadFile(file)} title="Download">
								⬇️
							</button>
							<button class="action-button" on:click={() => shareFile(file)} title="Share">
								🔗
							</button>
							<button class="action-button danger" on:click={() => deleteFile(file)} title="Delete">
								🗑️
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
		
		{#if dragOver}
			<div class="drag-overlay">
				<div class="drag-message">
					<div class="drag-icon">📁</div>
					<h3>Drop files to upload</h3>
					<p>Files will be encrypted and stored securely</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Share Modal -->
{#if showShareModal && fileToShare}
	<div 
		class="modal-overlay" 
		role="dialog" 
		aria-modal="true" 
		aria-labelledby="modal-title"
		on:click={() => showShareModal = false}
		on:keydown={(e) => e.key === 'Escape' && (showShareModal = false)}
	>
		<div 
			class="modal" 
			role="document"
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<div class="modal-header">
				<h3 id="modal-title">Share "{fileToShare.name}"</h3>
				<button class="close-button" on:click={() => showShareModal = false}>×</button>
			</div>
			
			<div class="modal-content">
				<p>Select contacts to share this file with:</p>
				
				{#if $contactsList.length === 0}
					<div class="no-contacts">
						<p>No contacts available. Add contacts first to share files.</p>
					</div>
				{:else}
					<div class="contacts-list">
						{#each $contactsList as contact}
							<label class="contact-item">
								<input 
									type="checkbox" 
									checked={selectedContacts.has(contact.id)}
									on:change={() => {
										if (selectedContacts.has(contact.id)) {
											selectedContacts.delete(contact.id);
										} else {
											selectedContacts.add(contact.id);
										}
										selectedContacts = selectedContacts;
									}}
								/>
								<div class="contact-avatar">{contact.name.charAt(0).toUpperCase()}</div>
								<div class="contact-info">
									<div class="contact-name">{contact.name}</div>
									{#if contact.verified}
										<div class="contact-verified">✓ Verified</div>
									{/if}
								</div>
							</label>
						{/each}
					</div>
				{/if}
			</div>
			
			<div class="modal-actions">
				<button class="secondary" on:click={() => showShareModal = false}>Cancel</button>
				<button 
					class="primary" 
					on:click={confirmShare}
					disabled={selectedContacts.size === 0}
				>
					Share with {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.files {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: #0a0a0a;
	}
	
	/* Header */
	.files-header {
		padding: 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.02);
	}
	
	.header-left h1 {
		margin: 0;
		font-size: 2rem;
		color: #fff;
	}
	
	.storage-info {
		font-size: 0.9rem;
		color: #888;
		margin-top: 0.5rem;
		display: flex;
		gap: 0.5rem;
	}
	
	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	
	.upload-button {
		padding: 0.75rem 1.5rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.upload-button:hover {
		background: #2563EB;
	}
	
	.danger-button {
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		color: #EF4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.danger-button:hover {
		background: rgba(239, 68, 68, 0.2);
	}
	
	/* Toolbar */
	.files-toolbar {
		padding: 1rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	
	.search-bar {
		flex: 1;
		max-width: 400px;
	}
	
	.search-bar input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		font-size: 1rem;
	}
	
	.search-bar input:focus {
		outline: none;
		border-color: #3B82F6;
		background: rgba(255, 255, 255, 0.08);
	}
	
	.toolbar-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.view-controls {
		display: flex;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		overflow: hidden;
	}
	
	.view-button {
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		color: #888;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.view-button.active {
		background: #3B82F6;
		color: white;
	}
	
	.sort-select {
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: #fff;
		cursor: pointer;
	}
	
	.sort-order {
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: #fff;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.sort-order:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	
	.select-all {
		padding: 0.5rem 1rem;
		background: rgba(59, 130, 246, 0.1);
		color: #3B82F6;
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.select-all:hover {
		background: rgba(59, 130, 246, 0.2);
	}
	
	/* Content */
	.files-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 2rem 2rem;
		position: relative;
	}
	
	.files-content.drag-over {
		background: rgba(59, 130, 246, 0.05);
	}
	
	/* Upload Progress */
	.upload-progress-container {
		margin-bottom: 2rem;
	}
	
	.upload-progress {
		margin-bottom: 1rem;
		padding: 1rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 8px;
	}
	
	.upload-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	
	.upload-filename {
		font-weight: 600;
		color: #fff;
	}
	
	.upload-stage {
		font-size: 0.9rem;
		color: #3B82F6;
		text-transform: capitalize;
	}
	
	.progress-bar {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		overflow: hidden;
	}
	
	.progress-fill {
		height: 100%;
		background: #3B82F6;
		transition: width 0.3s ease;
	}
	
	.upload-error {
		margin-top: 0.5rem;
		color: #EF4444;
		font-size: 0.9rem;
	}
	
	/* States */
	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: #666;
	}
	
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 60vh;
		text-align: center;
		color: #666;
	}
	
	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}
	
	.empty-state h2 {
		margin: 0 0 0.5rem;
		color: #888;
	}
	
	.empty-state p {
		margin-bottom: 2rem;
	}
	
	.empty-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	
	.upload-prompt {
		padding: 0.75rem 1.5rem;
		background: rgba(59, 130, 246, 0.1);
		color: #3B82F6;
		border: 1px solid #3B82F6;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.upload-prompt:hover {
		background: rgba(59, 130, 246, 0.2);
	}
	
	.drag-hint {
		font-size: 0.9rem;
		color: #666;
		margin: 0;
	}
	
	/* Grid View */
	.files-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}
	
	.files-grid .file-item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		transition: all 0.3s ease;
		position: relative;
	}
	
	.files-grid .file-item:hover {
		background: rgba(255, 255, 255, 0.05);
		transform: translateY(-2px);
	}
	
	.files-grid .file-item.selected {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.3);
	}
	
	.files-grid .file-preview {
		flex-shrink: 0;
	}
	
	.files-grid .file-info {
		flex: 1;
		min-width: 0;
	}
	
	.files-grid .file-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	/* List View */
	.files-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.files-list .file-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		transition: all 0.3s ease;
	}
	
	.files-list .file-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.files-list .file-item.selected {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.3);
	}
	
	.files-list .file-preview {
		flex-shrink: 0;
	}
	
	.files-list .file-info {
		flex: 1;
		min-width: 0;
	}
	
	.files-list .file-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	/* File Elements */
	.file-checkbox {
		flex-shrink: 0;
	}
	
	.file-checkbox input {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}
	
	.file-preview {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
	}
	
	.file-icon {
		font-size: 2rem;
	}
	
	.file-thumbnail {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 6px;
	}
	
	.file-name {
		font-weight: 600;
		color: #fff;
		margin-bottom: 0.25rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.file-meta {
		font-size: 0.9rem;
		color: #888;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	
	.shared-indicator {
		color: #3B82F6;
		font-size: 0.8rem;
	}
	
	.file-tags {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}
	
	.tag {
		padding: 0.25rem 0.5rem;
		background: rgba(59, 130, 246, 0.2);
		color: #3B82F6;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}
	
	.tag-more {
		padding: 0.25rem 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		color: #888;
		border-radius: 4px;
		font-size: 0.75rem;
	}
	
	.file-actions {
		flex-shrink: 0;
	}
	
	.action-button {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: none;
		background: rgba(255, 255, 255, 0.05);
		color: #888;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
		font-size: 1rem;
	}
	
	.action-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	.action-button.danger:hover {
		background: rgba(239, 68, 68, 0.2);
		color: #EF4444;
	}
	
	/* Drag Overlay */
	.drag-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(59, 130, 246, 0.1);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		border: 2px dashed #3B82F6;
		border-radius: 12px;
		margin: 1rem;
	}
	
	.drag-message {
		text-align: center;
		color: #3B82F6;
	}
	
	.drag-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}
	
	.drag-message h3 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
	}
	
	.drag-message p {
		margin: 0;
		font-size: 1rem;
		opacity: 0.8;
	}
	
	/* Modal */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 2rem;
	}
	
	.modal {
		width: 100%;
		max-width: 500px;
		background: rgba(20, 20, 20, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		backdrop-filter: blur(10px);
	}
	
	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.modal-header h3 {
		margin: 0;
		color: #fff;
	}
	
	.close-button {
		width: 32px;
		height: 32px;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1.5rem;
		line-height: 1;
	}
	
	.close-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}
	
	.modal-content {
		padding: 1.5rem;
	}
	
	.modal-content p {
		margin: 0 0 1rem;
		color: #ccc;
	}
	
	.no-contacts {
		text-align: center;
		padding: 2rem;
		color: #666;
	}
	
	.contacts-list {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}
	
	.contact-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		cursor: pointer;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		transition: background 0.3s ease;
	}
	
	.contact-item:last-child {
		border-bottom: none;
	}
	
	.contact-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.contact-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: white;
	}
	
	.contact-info {
		flex: 1;
	}
	
	.contact-name {
		font-weight: 600;
		color: #fff;
		margin-bottom: 0.25rem;
	}
	
	.contact-verified {
		font-size: 0.9rem;
		color: #4ADE80;
	}
	
	.modal-actions {
		padding: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}
	
	.modal-actions button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.modal-actions .primary {
		background: #3B82F6;
		color: white;
	}
	
	.modal-actions .primary:hover:not(:disabled) {
		background: #2563EB;
	}
	
	.modal-actions .primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.modal-actions .secondary {
		background: transparent;
		color: #888;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.modal-actions .secondary:hover {
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.files-header {
			padding: 1rem;
			flex-direction: column;
			gap: 1rem;
		}
		
		.files-toolbar {
			padding: 1rem;
			flex-direction: column;
			gap: 1rem;
		}
		
		.files-content {
			padding: 1rem;
		}
		
		.files-grid {
			grid-template-columns: 1fr;
		}
		
		.toolbar-actions {
			flex-wrap: wrap;
		}
		
		.view-controls,
		.sort-select,
		.sort-order,
		.select-all {
			font-size: 0.9rem;
		}
	}
</style>