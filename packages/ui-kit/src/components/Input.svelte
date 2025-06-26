<script lang="ts">
  import { cn } from '../utils/cn';

  export let label = '';
  export let error = '';
  export let hint = '';
  export let value = '';
  export let type = 'text';
  export let placeholder = '';
  export let name = '';
  export let id = '';
  export let required = false;
  export let readonly = false;
  export let disabled = false;
  let className = '';
  export { className as class };
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
  }

  $: hasError = !!error;
</script>

<div class={cn('space-y-volli-sm', className)}>
  {#if label}
    <label for={id || name} class="block text-volli-sm font-volli-medium text-volli-gray-700 dark:text-volli-gray-300">
      {label}
      {#if required}
        <span class="ml-volli-xs text-volli-error-500" aria-label="required">*</span>
      {/if}
    </label>
  {/if}

  <input
    type={type}
    {name}
    {id}
    {placeholder}
    {required}
    {readonly}
    {disabled}
    value={value}
    on:input={handleInput}
    class={cn(
      'volli-input-base',
      hasError && 'volli-input-error',
      'rounded-volli px-volli-md py-volli-sm text-volli-base'
    )}
    on:input
    on:change
    on:focus
    on:blur
    on:keydown
    on:keyup
  />

  {#if error}
    <p class="text-volli-sm text-volli-error-600 dark:text-volli-error-400 mt-volli-xs" role="alert">
      <span class="sr-only">Error:</span>
      {error}
    </p>
  {:else if hint}
    <p class="text-volli-sm text-volli-gray-500 dark:text-volli-gray-400 mt-volli-xs">{hint}</p>
  {/if}
</div>