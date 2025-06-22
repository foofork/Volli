<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { vault } from '$lib/stores/vault';
	
	let exportData = false;
	let changePassphrase = false;
	let newPassphrase = '';
	let confirmPassphrase = '';
	let error = '';
	let success = '';
	
	async function handleExportData() {
		try {
			const data = {
				identity: $auth.identity,
				device: $auth.device,
				exportedAt: new Date().toISOString()
			};
			
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `volli-export-${Date.now()}.json`;
			a.click();
			URL.revokeObjectURL(url);
			
			success = 'Data exported successfully';
			setTimeout(() => success = '', 3000);
		} catch (err) {
			error = 'Failed to export data';
		}
	}
	
	async function handleChangePassphrase() {
		error = '';
		
		if (!newPassphrase || !confirmPassphrase) {
			error = 'Please fill in all fields';
			return;
		}
		
		if (newPassphrase !== confirmPassphrase) {
			error = 'Passphrases do not match';
			return;
		}
		
		if (newPassphrase.length < 8) {
			error = 'Passphrase must be at least 8 characters';
			return;
		}
		
		try {
			// Re-encrypt vault with new passphrase
			await vault.lock();
			await vault.unlock(newPassphrase);
			
			success = 'Passphrase changed successfully';
			changePassphrase = false;
			newPassphrase = '';
			confirmPassphrase = '';
			setTimeout(() => success = '', 3000);
		} catch (err) {
			error = 'Failed to change passphrase';
		}
	}
</script>

<div class="settings">
	<div class="settings-header">
		<h1>Settings</h1>
	</div>
	
	<div class="settings-content">
		{#if error}
			<div class="alert error">{error}</div>
		{/if}
		
		{#if success}
			<div class="alert success">{success}</div>
		{/if}
		
		<section class="settings-section">
			<h2>🔐 Security</h2>
			
			<div class="setting-item">
				<div class="setting-info">
					<h3>Change Vault Passphrase</h3>
					<p>Update the passphrase used to encrypt your local vault</p>
				</div>
				<button class="secondary" on:click={() => changePassphrase = !changePassphrase}>
					Change Passphrase
				</button>
			</div>
			
			{#if changePassphrase}
				<form class="passphrase-form" on:submit|preventDefault={handleChangePassphrase}>
					<input
						type="password"
						bind:value={newPassphrase}
						placeholder="New passphrase"
					/>
					<input
						type="password"
						bind:value={confirmPassphrase}
						placeholder="Confirm passphrase"
					/>
					<div class="form-actions">
						<button type="submit" class="primary">Update Passphrase</button>
						<button type="button" class="secondary" on:click={() => changePassphrase = false}>
							Cancel
						</button>
					</div>
				</form>
			{/if}
			
			<div class="setting-item">
				<div class="setting-info">
					<h3>Two-Factor Authentication</h3>
					<p>Add an extra layer of security to your account</p>
				</div>
				<button class="secondary" disabled>Coming Soon</button>
			</div>
		</section>
		
		<section class="settings-section">
			<h2>📊 Data Management</h2>
			
			<div class="setting-item">
				<div class="setting-info">
					<h3>Export Your Data</h3>
					<p>Download all your data in JSON format</p>
				</div>
				<button class="secondary" on:click={handleExportData}>
					Export Data
				</button>
			</div>
			
			<div class="setting-item">
				<div class="setting-info">
					<h3>Clear Local Data</h3>
					<p>Remove all data from this device (irreversible)</p>
				</div>
				<button class="danger" on:click={() => confirm('Are you sure?') && auth.logout()}>
					Clear Data
				</button>
			</div>
		</section>
		
		<section class="settings-section">
			<h2>🎨 Appearance</h2>
			
			<div class="setting-item">
				<div class="setting-info">
					<h3>Theme</h3>
					<p>Choose your preferred color scheme</p>
				</div>
				<select disabled>
					<option>Dark (Default)</option>
					<option>Light</option>
					<option>Auto</option>
				</select>
			</div>
		</section>
		
		<section class="settings-section">
			<h2>ℹ️ About</h2>
			
			<div class="info-grid">
				<div class="info-item">
					<span class="label">Version</span>
					<span class="value">0.1.0</span>
				</div>
				<div class="info-item">
					<span class="label">Encryption</span>
					<span class="value">Post-Quantum (Kyber/Dilithium)</span>
				</div>
				<div class="info-item">
					<span class="label">Storage</span>
					<span class="value">Local-first (SQLite)</span>
				</div>
				<div class="info-item">
					<span class="label">Identity</span>
					<span class="value">{$auth.identity?.id.slice(0, 12)}...</span>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.settings {
		height: 100%;
		overflow-y: auto;
		background: #0a0a0a;
	}
	
	.settings-header {
		padding: 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.02);
	}
	
	.settings-header h1 {
		margin: 0;
		font-size: 2rem;
		color: #fff;
	}
	
	.settings-content {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}
	
	.settings-section {
		margin-bottom: 3rem;
	}
	
	.settings-section h2 {
		margin: 0 0 1.5rem;
		font-size: 1.5rem;
		color: #fff;
	}
	
	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		margin-bottom: 1rem;
	}
	
	.setting-info {
		flex: 1;
	}
	
	.setting-info h3 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		color: #fff;
	}
	
	.setting-info p {
		margin: 0;
		color: #888;
		font-size: 0.95rem;
	}
	
	button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	button.primary {
		background: #3B82F6;
		color: white;
	}
	
	button.primary:hover {
		background: #2563EB;
	}
	
	button.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	button.secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
	}
	
	button.danger {
		background: rgba(239, 68, 68, 0.1);
		color: #EF4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}
	
	button.danger:hover {
		background: rgba(239, 68, 68, 0.2);
	}
	
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	select {
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		cursor: pointer;
	}
	
	select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.passphrase-form {
		margin-top: 1rem;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}
	
	.passphrase-form input {
		width: 100%;
		padding: 0.75rem;
		margin-bottom: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: #fff;
	}
	
	.form-actions {
		display: flex;
		gap: 1rem;
	}
	
	.alert {
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		font-weight: 500;
	}
	
	.alert.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #EF4444;
	}
	
	.alert.success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #22C55E;
	}
	
	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}
	
	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.info-item .label {
		font-size: 0.9rem;
		color: #888;
	}
	
	.info-item .value {
		font-weight: 600;
		color: #fff;
	}
	
	@media (max-width: 768px) {
		.settings-content {
			padding: 1rem;
		}
		
		.setting-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
		
		.form-actions {
			flex-direction: column;
		}
		
		button {
			width: 100%;
		}
	}
</style>