<script lang="ts">
  import { cn } from '../utils/cn';

  export let variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let loading = false;
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  let className = '';
  export { className as class };

  $: isDisabled = disabled || loading;

  $: variantClass = {
    primary: 'bg-volli-primary-600 text-white hover:bg-volli-primary-700 active:bg-volli-primary-800 dark:bg-volli-primary-500 dark:hover:bg-volli-primary-600 dark:active:bg-volli-primary-700 shadow-volli-sm hover:shadow-volli',
    secondary: 'bg-volli-secondary-600 text-white hover:bg-volli-secondary-700 active:bg-volli-secondary-800 dark:bg-volli-secondary-500 dark:hover:bg-volli-secondary-600 dark:active:bg-volli-secondary-700 shadow-volli-sm hover:shadow-volli',
    ghost: 'bg-transparent text-volli-gray-700 hover:bg-volli-gray-100 active:bg-volli-gray-200 dark:text-volli-gray-300 dark:hover:bg-volli-gray-800 dark:active:bg-volli-gray-700 border border-transparent hover:border-volli-gray-300 dark:hover:border-volli-gray-600',
    danger: 'bg-volli-error-600 text-white hover:bg-volli-error-700 active:bg-volli-error-800 dark:bg-volli-error-500 dark:hover:bg-volli-error-600 dark:active:bg-volli-error-700 shadow-volli-sm hover:shadow-volli'
  }[variant] || '';

  $: sizeClass = {
    sm: 'px-volli-md py-volli-xs text-volli-sm min-h-[2rem]',
    md: 'px-volli-lg py-volli-sm text-volli-base min-h-[2.5rem]',
    lg: 'px-volli-xl py-volli-md text-volli-lg min-h-[3rem]'
  }[size] || '';
</script>

<button
  type={type}
  disabled={isDisabled}
  class={cn(
    'volli-button-base',
    'font-volli-medium',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
    'transform active:scale-[0.98] hover:scale-[1.02]',
    variantClass,
    sizeClass,
    className
  )}
  on:click
>
  {#if loading}
    <svg 
      class="animate-spin mr-volli-sm h-4 w-4" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" stroke-width={4}></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span class="sr-only">Loading...</span>
  {/if}
  <slot />
</button>