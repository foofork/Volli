<script lang="ts">
	import { onMount } from 'svelte';
	
	let files = [];
	let uploadProgress = 0;
	let isUploading = false;
	
	onMount(() => {
		// Load files from vault when implemented
	});
	
	function handleFileSelect(event) {
		const input = event.target;
		if (input.files && input.files.length > 0) {
			uploadFile(input.files[0]);
		}
	}
	
	async function uploadFile(file) {
		isUploading = true;
		uploadProgress = 0;
		
		// Simulate upload progress
		const interval = setInterval(() => {
			uploadProgress += 10;
			if (uploadProgress >= 100) {
				clearInterval(interval);
				isUploading = false;
				alert('File upload feature coming soon!');
			}
		}, 200);
	}
	
	function formatFileSize(bytes) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}
</script>

<div class="files">
	<div class="files-header">
		<h1>Files</h1>
		<label class="upload-button">
			<input type="file" on:change={handleFileSelect} hidden />
			<span>📤 Upload File</span>
		</label>
	</div>
	
	<div class="files-content">
		{#if isUploading}
			<div class="upload-progress">
				<div class="progress-bar">
					<div class="progress-fill" style="width: {uploadProgress}%"></div>
				</div>
				<p>Encrypting and uploading... {uploadProgress}%</p>
			</div>
		{/if}
		
		{#if files.length === 0}
			<div class="empty-state">
				<div class="empty-icon">📁</div>
				<h2>No files yet</h2>
				<p>Upload files to store them securely with end-to-end encryption</p>
				<label class="upload-prompt">
					<input type="file" on:change={handleFileSelect} hidden />
					<span>Choose a file to upload</span>
				</label>
			</div>
		{:else}
			<div class="files-grid">
				{#each files as file}
					<div class="file-card">
						<div class="file-icon">
							{#if file.type.startsWith('image/')}
								🖼️
							{:else if file.type.startsWith('video/')}
								🎬
							{:else if file.type.includes('pdf')}
								📄
							{:else}
								📎
							{/if}
						</div>
						<div class="file-info">
							<div class="file-name">{file.name}</div>
							<div class="file-meta">
								<span>{formatFileSize(file.size)}</span>
								<span>•</span>
								<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
							</div>
						</div>
						<button class="icon-button" title="More options">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
								<circle cx="5" cy="10" r="1.5" fill="currentColor"/>
								<circle cx="10" cy="10" r="1.5" fill="currentColor"/>
								<circle cx="15" cy="10" r="1.5" fill="currentColor"/>
							</svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.files {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: #0a0a0a;
	}
	
	.files-header {
		padding: 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.02);
	}
	
	.files-header h1 {
		margin: 0;
		font-size: 2rem;
		color: #fff;
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
	
	.files-content {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
	}
	
	.upload-progress {
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 12px;
	}
	
	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 1rem;
	}
	
	.progress-fill {
		height: 100%;
		background: #3B82F6;
		transition: width 0.3s ease;
	}
	
	.upload-progress p {
		margin: 0;
		color: #3B82F6;
		font-weight: 500;
		text-align: center;
	}
	
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
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
	
	.files-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}
	
	.file-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		transition: all 0.3s ease;
	}
	
	.file-card:hover {
		background: rgba(255, 255, 255, 0.05);
		transform: translateY(-2px);
	}
	
	.file-icon {
		font-size: 2.5rem;
	}
	
	.file-info {
		flex: 1;
		min-width: 0;
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
	}
	
	.icon-button {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: none;
		background: rgba(255, 255, 255, 0.05);
		color: #888;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
	}
	
	.icon-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	@media (max-width: 768px) {
		.files-grid {
			grid-template-columns: 1fr;
		}
	}
</style>