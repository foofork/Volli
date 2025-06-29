<script lang="ts">
  import { cn } from '../utils/cn';
  import Button from './Button.svelte';
  import Input from './Input.svelte';
  import { theme, type Theme } from '../utils/theme';
  import { createEventDispatcher } from 'svelte';

  export let settings = {
    displayName: '',
    theme: 'system',
    notifications: true,
    soundEnabled: true,
    autoBackup: false,
    backupInterval: 24
  };
  export let className = '';

  const dispatch = createEventDispatcher();

  let localSettings = { ...settings };
  let hasChanges = false;

  $: hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

  function handleSave() {
    dispatch('save', { settings: localSettings });
    settings = { ...localSettings };
    hasChanges = false;
  }

  function handleReset() {
    localSettings = { ...settings };
    hasChanges = false;
  }

  function handleThemeChange() {
    theme.set(localSettings.theme as Theme);
  }
</script>

<div class={cn('space-y-6', className)}>
  <div>
    <h2 class="text-xl font-semibold text-volli-gray-900 dark:text-volli-gray-100 mb-4">
      Settings
    </h2>
  </div>

  <!-- Profile Section -->
  <div class="volli-card p-4">
    <h3 class="text-lg font-medium text-volli-gray-900 dark:text-volli-gray-100 mb-4">
      Profile
    </h3>
    
    <Input
      label="Display Name"
      bind:value={localSettings.displayName}
      placeholder="Enter your display name"
      hint="This is how others will see you"
    />
  </div>

  <!-- Appearance Section -->
  <div class="volli-card p-4">
    <h3 class="text-lg font-medium text-volli-gray-900 dark:text-volli-gray-100 mb-4">
      Appearance
    </h3>
    
    <div class="space-y-3">
      <label class="block text-sm font-medium text-volli-gray-700 dark:text-volli-gray-300 mb-2">
        Theme
      </label>
      <div class="grid grid-cols-3 gap-2">
        {#each ['light', 'dark', 'system'] as themeOption}
          <button
            type="button"
            class={cn(
              'px-4 py-2 rounded-md text-sm font-medium volli-transition',
              'border volli-focus',
              localSettings.theme === themeOption
                ? 'bg-volli-primary-600 dark:bg-volli-primary-500 text-white border-transparent'
                : 'bg-white dark:bg-volli-gray-800 text-volli-gray-700 dark:text-volli-gray-300 border-volli-gray-300 dark:border-volli-gray-600 hover:bg-volli-gray-50 dark:hover:bg-volli-gray-700'
            )}
            on:click={() => {
              localSettings.theme = themeOption;
              handleThemeChange();
            }}
          >
            {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Notifications Section -->
  <div class="volli-card p-4">
    <h3 class="text-lg font-medium text-volli-gray-900 dark:text-volli-gray-100 mb-4">
      Notifications
    </h3>
    
    <div class="space-y-3">
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-sm text-volli-gray-700 dark:text-volli-gray-300">
          Enable notifications
        </span>
        <input
          type="checkbox"
          bind:checked={localSettings.notifications}
          class="w-4 h-4 text-volli-primary-600 bg-volli-gray-100 border-volli-gray-300 rounded focus:ring-volli-primary-500 dark:focus:ring-volli-primary-600 dark:ring-offset-volli-gray-800 focus:ring-2 dark:bg-volli-gray-700 dark:border-volli-gray-600"
        />
      </label>

      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-sm text-volli-gray-700 dark:text-volli-gray-300">
          Enable sound
        </span>
        <input
          type="checkbox"
          bind:checked={localSettings.soundEnabled}
          disabled={!localSettings.notifications}
          class="w-4 h-4 text-volli-primary-600 bg-volli-gray-100 border-volli-gray-300 rounded focus:ring-volli-primary-500 dark:focus:ring-volli-primary-600 dark:ring-offset-volli-gray-800 focus:ring-2 dark:bg-volli-gray-700 dark:border-volli-gray-600 disabled:opacity-50"
        />
      </label>
    </div>
  </div>

  <!-- Backup Section -->
  <div class="volli-card p-4">
    <h3 class="text-lg font-medium text-volli-gray-900 dark:text-volli-gray-100 mb-4">
      Backup & Recovery
    </h3>
    
    <div class="space-y-4">
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-sm text-volli-gray-700 dark:text-volli-gray-300">
          Auto-backup
        </span>
        <input
          type="checkbox"
          bind:checked={localSettings.autoBackup}
          class="w-4 h-4 text-volli-primary-600 bg-volli-gray-100 border-volli-gray-300 rounded focus:ring-volli-primary-500 dark:focus:ring-volli-primary-600 dark:ring-offset-volli-gray-800 focus:ring-2 dark:bg-volli-gray-700 dark:border-volli-gray-600"
        />
      </label>

      {#if localSettings.autoBackup}
        <div>
          <label class="block text-sm font-medium text-volli-gray-700 dark:text-volli-gray-300 mb-2">
            Backup interval (hours)
          </label>
          <input
            type="number"
            bind:value={localSettings.backupInterval}
            min={1}
            max={168}
            class="w-full rounded-md px-3 py-2 text-volli-gray-900 dark:text-volli-gray-100 bg-white dark:bg-volli-gray-800 border border-volli-gray-300 dark:border-volli-gray-600 volli-transition volli-focus"
          />
        </div>
      {/if}

      <div class="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="secondary"
          on:click={() => dispatch('export')}
        >
          Export Data
        </Button>
        <Button
          size="sm"
          variant="ghost"
          on:click={() => dispatch('import')}
        >
          Import Data
        </Button>
      </div>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex justify-end gap-2 pt-4">
    <Button
      variant="ghost"
      on:click={handleReset}
      disabled={!hasChanges}
    >
      Reset
    </Button>
    <Button
      variant="primary"
      on:click={handleSave}
      disabled={!hasChanges}
    >
      Save Changes
    </Button>
  </div>
</div>