<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import SimplifiedOnboarding from '$lib/components/SimplifiedOnboarding.svelte';
	import { onMount } from 'svelte';
	
	// Note: showLegacyAuth kept for future legacy auth support toggle
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let showLegacyAuth = false;
	
	onMount(async () => {
		// Initialize auth
		await auth.initialize();
		
		// Check if already authenticated
		const unsubscribe = auth.subscribe(state => {
			if (state.isAuthenticated && state.vaultUnlocked) {
				goto('/app');
			}
		});
		
		return unsubscribe;
	});
	
</script>

<svelte:head>
	<title>Welcome - Volly</title>
</svelte:head>

<!-- Use the new simplified onboarding component -->
<SimplifiedOnboarding />