<script lang="ts">
  export let variant = 'primary';
  export let disabled = false;
</script>

<button
  {disabled}
  class="px-4 py-2 rounded {variant === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-200'}"
  on:click
>
  <slot />
</button>