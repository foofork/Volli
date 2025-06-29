<!--
  User-friendly ID display component that hides technical hex IDs
  and shows human-readable identifiers with visual indicators
-->

<script lang="ts">
  export let id: string;
  export let name: string | undefined = undefined;
  export let type: 'identity' | 'contact' | 'conversation' = 'identity';
  export let showCopy: boolean = false;
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let inline: boolean = false;

  // Generate a user-friendly display from the ID
  function generateFriendlyDisplay(id: string): { icon: string; color: string; words: string } {
    if (!id) return { icon: '👤', color: '#888', words: 'Unknown User' };

    // Use the ID to generate deterministic but friendly values
    const hash = simpleHash(id);
    
    const icons = ['🦊', '🐱', '🐺', '🐸', '🦝', '🐨', '🐧', '🦜', '🐙', '🦋', '🌟', '🎯', '🔥', '⚡', '🎨', '🎪'];
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#84CC16', '#F97316', '#06B6D4'];
    
    const adjectives = ['Swift', 'Bright', 'Noble', 'Clever', 'Silent', 'Golden', 'Mystic', 'Bold', 'Gentle', 'Cosmic'];
    const nouns = ['Fox', 'Eagle', 'Lion', 'Wolf', 'Dragon', 'Phoenix', 'Tiger', 'Hawk', 'Bear', 'Sage'];
    
    const icon = icons[hash % icons.length];
    const color = colors[hash % colors.length];
    const adjective = adjectives[(hash >> 4) % adjectives.length];
    const noun = nouns[(hash >> 8) % nouns.length];
    
    return {
      icon,
      color,
      words: `${adjective} ${noun}`
    };
  }

  function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(id).then(() => {
      // Could show a toast here
      console.log('ID copied to clipboard');
    });
  }

  function getShortId(id: string): string {
    // Create a human-readable short ID
    const hash = simpleHash(id);
    return `#${hash.toString(36).slice(0, 6).toUpperCase()}`;
  }

  $: friendlyDisplay = generateFriendlyDisplay(id);
  $: shortId = getShortId(id);
</script>

<div 
  class="user-friendly-id" 
  class:inline 
  class:small={size === 'small'} 
  class:medium={size === 'medium'} 
  class:large={size === 'large'}
>
  <div class="id-visual" style="background: {friendlyDisplay.color}20; border-color: {friendlyDisplay.color}40;">
    <span class="id-icon" style="color: {friendlyDisplay.color};">{friendlyDisplay.icon}</span>
  </div>
  
  <div class="id-info">
    <div class="id-name">
      {#if name}
        {name}
      {:else}
        {friendlyDisplay.words}
      {/if}
    </div>
    
    <div class="id-short" title={`Full ID: ${id}`}>
      {#if type === 'identity'}
        Your ID: {shortId}
      {:else if type === 'contact'}
        Contact ID: {shortId}
      {:else}
        ID: {shortId}
      {/if}
    </div>
  </div>
  
  {#if showCopy}
    <button 
      class="copy-button" 
      on:click={copyToClipboard}
      title="Copy full ID to clipboard"
      aria-label="Copy ID to clipboard"
    >
      📋
    </button>
  {/if}
</div>

<style>
  .user-friendly-id {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .user-friendly-id.inline {
    display: inline-flex;
    padding: 0.5rem;
    background: transparent;
    border: none;
    border-radius: 8px;
  }

  .user-friendly-id:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .id-visual {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 2px solid;
    flex-shrink: 0;
  }

  .user-friendly-id.small .id-visual {
    width: 32px;
    height: 32px;
  }

  .user-friendly-id.medium .id-visual {
    width: 40px;
    height: 40px;
  }

  .user-friendly-id.large .id-visual {
    width: 48px;
    height: 48px;
  }

  .id-icon {
    font-size: 1rem;
  }

  .user-friendly-id.large .id-icon {
    font-size: 1.25rem;
  }

  .id-info {
    flex: 1;
    min-width: 0;
  }

  .id-name {
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.25rem;
    font-size: 0.95rem;
  }

  .user-friendly-id.large .id-name {
    font-size: 1.1rem;
  }

  .user-friendly-id.small .id-name {
    font-size: 0.9rem;
    margin-bottom: 0.125rem;
  }

  .id-short {
    font-size: 0.8rem;
    color: #888;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  .user-friendly-id.small .id-short {
    font-size: 0.75rem;
  }

  .copy-button {
    padding: 0.5rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .copy-button:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  .copy-button:active {
    transform: scale(0.95);
  }

  /* Inline version adjustments */
  .user-friendly-id.inline .id-info {
    margin: 0;
  }

  .user-friendly-id.inline .id-name {
    margin-bottom: 0;
  }

  .user-friendly-id.inline .id-short {
    display: none;
  }
</style>