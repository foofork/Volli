<!--
  Status indicator component that shows connection state,
  verification status, and other user-friendly status information
-->

<script lang="ts">
  export let status: 'online' | 'offline' | 'connecting' | 'verified' | 'unverified' | 'secure' | 'warning' | 'error' = 'offline';
  export let label: string = '';
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let showLabel: boolean = true;
  export let animate: boolean = true;
  export let pulse: boolean = false;
  
  // Status configurations
  const statusConfig = {
    online: {
      icon: '🟢',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      defaultLabel: 'Online'
    },
    offline: {
      icon: '⚫',
      color: '#6B7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      defaultLabel: 'Offline'
    },
    connecting: {
      icon: '🔄',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      defaultLabel: 'Connecting...'
    },
    verified: {
      icon: '✅',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      defaultLabel: 'Verified'
    },
    unverified: {
      icon: '❓',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      defaultLabel: 'Unverified'
    },
    secure: {
      icon: '🔒',
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      defaultLabel: 'Secure'
    },
    warning: {
      icon: '⚠️',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      defaultLabel: 'Warning'
    },
    error: {
      icon: '❌',
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      defaultLabel: 'Error'
    }
  };
  
  $: config = statusConfig[status];
  $: displayLabel = label || config.defaultLabel;
  $: shouldPulse = pulse || status === 'connecting';
</script>

<div 
  class="status-indicator" 
  class:small={size === 'small'}
  class:medium={size === 'medium'}
  class:large={size === 'large'}
  class:animate
  class:pulse={shouldPulse}
  style="--status-color: {config.color}; --status-bg: {config.bgColor};"
  title={displayLabel}
>
  <div class="status-icon">
    {config.icon}
  </div>
  
  {#if showLabel}
    <span class="status-label">{displayLabel}</span>
  {/if}
</div>

<style>
  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: var(--status-bg);
    border: 1px solid color-mix(in srgb, var(--status-color) 30%, transparent);
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--status-color);
    transition: all 0.3s ease;
  }
  
  .status-indicator.small {
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    gap: 0.25rem;
  }
  
  .status-indicator.medium {
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    gap: 0.5rem;
  }
  
  .status-indicator.large {
    padding: 0.375rem 0.75rem;
    font-size: 0.9rem;
    gap: 0.5rem;
  }
  
  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9em;
  }
  
  .status-indicator.small .status-icon {
    font-size: 0.8em;
  }
  
  .status-indicator.large .status-icon {
    font-size: 1em;
  }
  
  .status-label {
    white-space: nowrap;
    font-weight: 600;
  }
  
  /* Animations */
  .status-indicator.animate {
    animation: statusFadeIn 0.5s ease;
  }
  
  .status-indicator.pulse .status-icon {
    animation: statusPulse 2s ease-in-out infinite;
  }
  
  @keyframes statusFadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes statusPulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }
  
  /* Hover effects */
  .status-indicator:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .status-indicator {
      border-width: 2px;
      font-weight: 700;
    }
  }
  
  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .status-indicator.animate,
    .status-indicator.pulse .status-icon {
      animation: none;
    }
    
    .status-indicator:hover {
      transform: none;
    }
  }
</style>