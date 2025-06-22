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

  $: hasError = !!error;
  
  function handleInput(event) {
    value = event.target.value;
  }
</script>

<div class={cn('space-y-1', className)}>
  {#if label}
    <label for={id || name} class="block text-sm font-medium text-volli-gray-700 dark:text-volli-gray-300">
      {label}
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
      'block w-full rounded-md px-3 py-2 text-volli-gray-900 dark:text-volli-gray-100',
      'bg-white dark:bg-volli-gray-800',
      'border volli-transition volli-focus',
      hasError
        ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
        : 'border-volli-gray-300 dark:border-volli-gray-600 focus:ring-volli-primary-500',
      'placeholder:text-volli-gray-400 dark:placeholder:text-volli-gray-500'
    )}
    on:input
    on:change
    on:focus
    on:blur
    on:keydown
    on:keyup
  />

  {#if error}
    <p class="text-sm text-red-600 dark:text-red-400">{error}</p>
  {:else if hint}
    <p class="text-sm text-volli-gray-500 dark:text-volli-gray-400">{hint}</p>
  {/if}
</div>