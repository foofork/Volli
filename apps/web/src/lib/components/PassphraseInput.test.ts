import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PassphraseInput from './PassphraseInput.svelte';
import { authStore } from '$lib/stores/auth';

describe('PassphraseInput', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      const { getByLabelText } = render(PassphraseInput);
      const input = getByLabelText('Passphrase *');
      
      expect(input).toBeDefined();
      expect(input.getAttribute('type')).toBe('password');
      expect(input.getAttribute('placeholder')).toBe('Enter passphrase');
    });
    
    it('should render with custom props', () => {
      const { getByLabelText } = render(PassphraseInput, {
        label: 'Custom Label',
        placeholder: 'Custom placeholder',
        required: false
      });
      
      const input = getByLabelText('Custom Label');
      expect(input).toBeDefined();
      expect(input.getAttribute('placeholder')).toBe('Custom placeholder');
    });
    
    it('should not show strength indicator when showStrength is false', () => {
      const { container, getByLabelText } = render(PassphraseInput, {
        showStrength: false,
        value: 'test123'
      });
      
      const strengthBar = container.querySelector('.strength-indicator');
      expect(strengthBar).toBe(null);
    });
  });
  
  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const { getByLabelText, getByTitle } = render(PassphraseInput, {
        value: 'test123'
      });
      
      const input = getByLabelText('Passphrase *');
      expect(input.getAttribute('type')).toBe('password');
      
      const toggleButton = getByTitle('Show passphrase');
      await fireEvent.click(toggleButton);
      
      expect(input.getAttribute('type')).toBe('text');
      
      const hideButton = getByTitle('Hide passphrase');
      await fireEvent.click(hideButton);
      
      expect(input.getAttribute('type')).toBe('password');
    });
    
    it('should not show toggle button when showToggle is false', () => {
      const { container } = render(PassphraseInput, {
        showToggle: false,
        value: 'test123'
      });
      
      const toggleButton = container.querySelector('.toggle-visibility');
      expect(toggleButton).toBe(null);
    });
    
    it('should not show toggle button when value is empty', () => {
      const { container } = render(PassphraseInput, {
        value: ''
      });
      
      const toggleButton = container.querySelector('.toggle-visibility');
      expect(toggleButton).toBe(null);
    });
  });
  
  describe('Strength Indicator', () => {
    it('should show weak strength for simple password', async () => {
      const { getByLabelText, getByText } = render(PassphraseInput);
      const input = getByLabelText('Passphrase *');
      
      await fireEvent.input(input, { target: { value: 'abc' } });
      
      expect(getByText('weak')).toBeDefined();
      expect(getByText('Use at least 12 characters')).toBeDefined();
    });
    
    it('should show fair strength for better password', async () => {
      const { getByLabelText, getByText } = render(PassphraseInput);
      const input = getByLabelText('Passphrase *');
      
      // This password should be fair - 12+ chars, upper, lower, numbers but no special chars
      await fireEvent.input(input, { target: { value: 'SimpleTest12' } });
      
      expect(getByText('fair')).toBeDefined();
      expect(getByText('Add special characters')).toBeDefined();
    });
    
    it('should show good strength for complex password', async () => {
      const { getByLabelText, getByText } = render(PassphraseInput);
      const input = getByLabelText('Passphrase *');
      
      // This should be good - has all character types
      await fireEvent.input(input, { target: { value: 'MyGoodP@ss123' } });
      
      expect(getByText('good')).toBeDefined();
    });
    
    it('should show error for common patterns', async () => {
      const { getByLabelText, getByText } = render(PassphraseInput);
      const input = getByLabelText('Passphrase *');
      
      // This contains the common pattern 'password'
      await fireEvent.input(input, { target: { value: 'MyPassword123!' } });
      
      expect(getByText('Avoid common patterns')).toBeDefined();
      expect(getByText(/This passphrase contains common patterns/)).toBeDefined();
    });
    
    it('should show entropy when below minimum', async () => {
      const { getByLabelText, container } = render(PassphraseInput, {
        minStrength: 80
      });
      const input = getByLabelText('Passphrase *');
      
      await fireEvent.input(input, { target: { value: 'SimplePass' } });
      
      const entropyText = container.querySelector('.entropy');
      expect(entropyText).toBeDefined();
      expect(entropyText?.textContent).toMatch(/\d+ \/ 80 bits/);
    });
  });
  
  describe('Suggestions', () => {
    it('should show suggestions for improving password', async () => {
      const { getByLabelText, getByText } = render(PassphraseInput);
      const input = getByLabelText('Passphrase *');
      
      await fireEvent.input(input, { target: { value: 'simple' } });
      
      expect(getByText('Use at least 12 characters')).toBeDefined();
      expect(getByText('Add uppercase letters')).toBeDefined();
      expect(getByText('Add numbers')).toBeDefined();
    });
    
    it('should limit suggestions to 3', async () => {
      const { getByLabelText, container } = render(PassphraseInput);
      const input = getByLabelText('Passphrase *');
      
      await fireEvent.input(input, { target: { value: 'a' } });
      
      const suggestions = container.querySelectorAll('.suggestions li');
      expect(suggestions.length).toBe(3);
    });
  });
  
  describe('Events', () => {
    it('should dispatch input event', async () => {
      const handleInput = vi.fn();
      const { getByLabelText, component } = render(PassphraseInput);
      component.$on('input', handleInput);
      
      const input = getByLabelText('Passphrase *');
      await fireEvent.input(input, { target: { value: 'test123' } });
      
      expect(handleInput).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'test123'
        })
      );
    });
    
    it('should dispatch strength event', async () => {
      let strengthValue: any = null;
      const { getByLabelText, component } = render(PassphraseInput);
      
      // Subscribe to strength event
      component.$on('strength', (event: CustomEvent) => {
        strengthValue = event.detail;
      });
      
      const input = getByLabelText('Passphrase *');
      
      // Fire input event - this should trigger the strength calculation and dispatch
      await fireEvent.input(input, { target: { value: 'Test123!' } });
      
      // The strength event should be dispatched immediately during the input event
      // if the strength has been calculated by the reactive statement
      expect(strengthValue).toBeTruthy();
      expect(strengthValue).toHaveProperty('entropy');
      expect(strengthValue).toHaveProperty('strength');
      expect(strengthValue).toHaveProperty('hasCommonPattern');
      expect(typeof strengthValue.entropy).toBe('number');
      expect(typeof strengthValue.strength).toBe('string');
      expect(typeof strengthValue.hasCommonPattern).toBe('boolean');
      
      // Verify the strength calculation for this specific input
      expect(strengthValue.entropy).toBeGreaterThan(0);
      expect(['weak', 'fair', 'good', 'strong', 'excellent']).toContain(strengthValue.strength);
    });
    
    it('should dispatch blur event', async () => {
      const handleBlur = vi.fn();
      const { getByLabelText, component } = render(PassphraseInput);
      component.$on('blur', handleBlur);
      
      const input = getByLabelText('Passphrase *');
      await fireEvent.blur(input);
      
      expect(handleBlur).toHaveBeenCalled();
    });
  });
  
  describe('Validation', () => {
    it('should mark input as invalid when below minimum strength', async () => {
      const { getByLabelText } = render(PassphraseInput, {
        minStrength: 80
      });
      const input = getByLabelText('Passphrase *');
      
      await fireEvent.input(input, { target: { value: 'weak' } });
      
      expect(input.classList.contains('invalid')).toBe(true);
    });
    
    it('should mark input as valid when meets minimum strength', async () => {
      const { getByLabelText } = render(PassphraseInput);
      const input = getByLabelText('Passphrase *');
      
      await fireEvent.input(input, { target: { value: 'MyStrongP@ssw0rd!' } });
      
      expect(input.classList.contains('invalid')).toBe(false);
    });
    
    it('should show error message for weak password', async () => {
      const { getByLabelText, getByText } = render(PassphraseInput, {
        minStrength: 100
      });
      const input = getByLabelText('Passphrase *');
      
      await fireEvent.input(input, { target: { value: 'WeakPass123' } });
      
      expect(getByText(/Passphrase is too weak/)).toBeDefined();
    });
  });
  
  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      const { getByLabelText } = render(PassphraseInput, {
        disabled: true
      });
      
      const input = getByLabelText('Passphrase *') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });
});