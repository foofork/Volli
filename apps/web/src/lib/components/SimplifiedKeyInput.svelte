<!--
  Simplified key input component that hides technical complexity
  and provides user-friendly validation messages
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let value: string = '';
  export let label: string = 'Security Key';
  export let placeholder: string = 'Paste or enter the shared key';
  export let disabled: boolean = false;
  export let required: boolean = false;
  export let showValidation: boolean = true;
  
  const dispatch = createEventDispatcher();
  
  let focused = false;
  
  // Validation states
  enum ValidationState {
    EMPTY = 'empty',
    INVALID = 'invalid', 
    VALID = 'valid',
    CHECKING = 'checking'
  }
  
  let validationState: ValidationState = ValidationState.EMPTY;
  let validationMessage = '';
  
  function validateKey(key: string): { state: ValidationState; message: string } {
    if (!key.trim()) {
      return { state: ValidationState.EMPTY, message: '' };
    }
    
    key = key.trim();
    
    // Check various formats without exposing technical details
    const formats = [
      { pattern: /^[0-9a-fA-F]{64}$/, name: 'standard format' },
      { pattern: /^[A-Za-z0-9+/]{43}=$/, name: 'encoded format' },
      { pattern: /^pk_[a-zA-Z0-9]+$/, name: 'demo format' },
      { pattern: /^[a-zA-Z0-9\-_]+$/, name: 'username format' }
    ];
    
    for (const format of formats) {
      if (format.pattern.test(key)) {
        return { 
          state: ValidationState.VALID, 
          message: `✓ Valid ${format.name} detected` 
        };
      }
    }
    
    // Check if it looks like a username/email
    if (key.includes('@') || key.startsWith('@')) {
      return { 
        state: ValidationState.VALID, 
        message: '✓ Username format detected' 
      };
    }
    
    return { 
      state: ValidationState.INVALID, 
      message: 'This doesn\'t look like a valid key or username. Please check and try again.' 
    };
  }
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    
    if (showValidation) {
      const validation = validateKey(value);
      validationState = validation.state;
      validationMessage = validation.message;
    }
    
    dispatch('input', { value, valid: validationState === ValidationState.VALID });
  }
  
  function handlePaste(event: ClipboardEvent) {
    // Allow normal paste behavior, validation will run on input
  }
  
  function handleFocus() {
    focused = true;
  }
  
  function handleBlur() {
    focused = false;
  }
  
  // Initialize validation if value is provided
  $: if (value && showValidation) {
    const validation = validateKey(value);
    validationState = validation.state;
    validationMessage = validation.message;
  }
</script>

<div class="simplified-key-input" class:focused class:disabled>
  <label for="key-input" class="input-label">
    {label}
    {#if required}<span class="required">*</span>{/if}
  </label>
  
  <div class="input-container" class:valid={validationState === ValidationState.VALID} class:invalid={validationState === ValidationState.INVALID}>
    <input
      id="key-input"
      type="text"
      bind:value
      {placeholder}
      {disabled}
      {required}
      on:input={handleInput}
      on:paste={handlePaste}
      on:focus={handleFocus}
      on:blur={handleBlur}
      autocomplete="off"
      spellcheck="false"
    />
    
    {#if validationState === ValidationState.VALID}
      <div class="validation-icon valid" aria-label="Valid">✓</div>
    {:else if validationState === ValidationState.INVALID}
      <div class="validation-icon invalid" aria-label="Invalid">⚠</div>
    {/if}
  </div>
  
  {#if showValidation && validationMessage}
    <div 
      class="validation-message" 
      class:valid={validationState === ValidationState.VALID}
      class:invalid={validationState === ValidationState.INVALID}
    >
      {validationMessage}
    </div>
  {/if}
  
  <div class="input-help">
    You can paste a security key, enter a username like @alice, or an email like alice@example.com
  </div>
</div>

<style>
  .simplified-key-input {
    width: 100%;
  }
  
  .input-label {
    display: block;
    font-weight: 600;
    color: #ccc;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }
  
  .required {
    color: #EF4444;
    margin-left: 0.25rem;
  }
  
  .input-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  input {
    width: 100%;
    padding: 0.875rem 1rem;
    padding-right: 3rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #fff;
    font-size: 1rem;
    transition: all 0.3s ease;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }
  
  input:focus {
    outline: none;
    border-color: #3B82F6;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  input::placeholder {
    color: #666;
    font-family: inherit;
  }
  
  .input-container.valid input {
    border-color: #10B981;
    background: rgba(16, 185, 129, 0.05);
  }
  
  .input-container.invalid input {
    border-color: #EF4444;
    background: rgba(239, 68, 68, 0.05);
  }
  
  .validation-icon {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.2rem;
    font-weight: bold;
  }
  
  .validation-icon.valid {
    color: #10B981;
  }
  
  .validation-icon.invalid {
    color: #EF4444;
  }
  
  .validation-message {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border-left: 3px solid;
  }
  
  .validation-message.valid {
    color: #10B981;
    background: rgba(16, 185, 129, 0.1);
    border-color: #10B981;
  }
  
  .validation-message.invalid {
    color: #EF4444;
    background: rgba(239, 68, 68, 0.1);
    border-color: #EF4444;
  }
  
  .input-help {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #888;
    line-height: 1.4;
  }
  
  /* Animations */
  .validation-icon {
    animation: fadeIn 0.3s ease;
  }
  
  .validation-message {
    animation: slideDown 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-50%) scale(0.8); }
    to { opacity: 1; transform: translateY(-50%) scale(1); }
  }
  
  @keyframes slideDown {
    from { 
      opacity: 0; 
      transform: translateY(-0.5rem); 
      max-height: 0;
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
      max-height: 100px;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    input:focus {
      border-color: #1E40AF;
      box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.5);
    }
    
    .input-container.valid input {
      border-color: #059669;
    }
    
    .input-container.invalid input {
      border-color: #DC2626;
    }
  }
</style>