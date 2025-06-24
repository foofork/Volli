<script lang="ts">
  import Toast from '$lib/components/Toast.svelte';
  import { ErrorBoundary } from '$lib/components';
</script>

<ErrorBoundary>
  <slot />
</ErrorBoundary>

<Toast />