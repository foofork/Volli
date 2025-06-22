<script lang="ts">
  import { cn } from '../utils/cn';

  export let variant = 'primary';
  export let size = 'md';
  export let loading = false;
  export let disabled = false;
  export let type = 'button';
  let className = '';
  export { className as class };

  $: isDisabled = disabled || loading;

  $: variantClass = {
    primary: 'bg-volli-primary-600 text-white hover:bg-volli-primary-700 dark:bg-volli-primary-500 dark:hover:bg-volli-primary-600',
    secondary: 'bg-volli-secondary-600 text-white hover:bg-volli-secondary-700 dark:bg-volli-secondary-500 dark:hover:bg-volli-secondary-600',
    ghost: 'bg-transparent text-volli-gray-700 hover:bg-volli-gray-100 dark:text-volli-gray-300 dark:hover:bg-volli-gray-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
  }[variant] || '';

  $: sizeClass = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }[size] || '';
</script>

<button
  type={type}
  disabled={isDisabled}
  class={cn(
    'inline-flex items-center justify-center rounded-md font-medium volli-transition volli-focus',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    variantClass,
    sizeClass,
    className
  )}
  on:click
>
  {#if loading}
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" stroke-width={4}></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  <slot />
</button>