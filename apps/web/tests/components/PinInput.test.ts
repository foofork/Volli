import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import PinInput from '../../src/lib/components/PinInput.svelte';
import { tick } from 'svelte';

// Mock accessibility utils
vi.mock('$lib/utils/accessibility', () => ({
  generateId: (prefix: string) => `${prefix}-test-id`,
  announceToScreenReader: vi.fn()
}));

describe('PinInput Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render 6 input fields', () => {
      render(PinInput);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      expect(inputs).toHaveLength(6);
    });

    it('should render with custom label', () => {
      render(PinInput, {
        props: {
          label: 'Security PIN'
        }
      });
      
      expect(screen.getByText('Security PIN')).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(PinInput, {
        props: {
          required: true
        }
      });
      
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByLabelText('required')).toBeInTheDocument();
    });

    it('should apply disabled state to all inputs', () => {
      render(PinInput, {
        props: {
          disabled: true
        }
      });
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('Input Handling', () => {
    it('should only accept single digits', async () => {
      render(PinInput);
      
      const firstInput = screen.getByLabelText('Digit 1 of 6');
      
      // Try to enter multiple digits
      await fireEvent.input(firstInput, { target: { value: '123' } });
      
      // Should only keep the last digit
      expect(firstInput).toHaveValue('3');
    });

    it('should only accept numeric input', async () => {
      render(PinInput);
      
      const firstInput = screen.getByLabelText('Digit 1 of 6');
      
      // Try to enter non-numeric characters
      await fireEvent.input(firstInput, { target: { value: 'a' } });
      expect(firstInput).toHaveValue('');
      
      // Enter valid digit
      await fireEvent.input(firstInput, { target: { value: '5' } });
      expect(firstInput).toHaveValue('5');
    });

    it('should auto-focus next input after entering digit', async () => {
      render(PinInput);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      
      // Enter digit in first input
      await fireEvent.input(inputs[0], { target: { value: '1' } });
      
      // Second input should be focused
      await waitFor(() => {
        expect(inputs[1]).toHaveFocus();
      });
    });

    it('should not advance focus on last digit', async () => {
      render(PinInput);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      const lastInput = inputs[5];
      
      // Focus last input and enter digit
      lastInput.focus();
      await fireEvent.input(lastInput, { target: { value: '6' } });
      
      // Should still have focus
      expect(lastInput).toHaveFocus();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle backspace to move to previous input', async () => {
      render(PinInput);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      
      // Focus second input
      inputs[1].focus();
      
      // Press backspace when input is empty
      await fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      
      // Should focus previous input
      await waitFor(() => {
        expect(inputs[0]).toHaveFocus();
      });
    });

    it('should handle arrow key navigation', async () => {
      render(PinInput);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      
      // Focus middle input
      inputs[2].focus();
      
      // Press left arrow
      await fireEvent.keyDown(inputs[2], { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(inputs[1]).toHaveFocus();
      });
      
      // Press right arrow
      await fireEvent.keyDown(inputs[1], { key: 'ArrowRight' });
      await waitFor(() => {
        expect(inputs[2]).toHaveFocus();
      });
    });

    it('should not navigate beyond boundaries', async () => {
      render(PinInput);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      
      // Focus first input and press left
      inputs[0].focus();
      await fireEvent.keyDown(inputs[0], { key: 'ArrowLeft' });
      expect(inputs[0]).toHaveFocus();
      
      // Focus last input and press right
      inputs[5].focus();
      await fireEvent.keyDown(inputs[5], { key: 'ArrowRight' });
      expect(inputs[5]).toHaveFocus();
    });
  });

  describe('Paste Handling', () => {
    it('should handle paste of 6 digits', async () => {
      let emittedValue = '';
      
      render(PinInput, {
        events: {
          input: (e: CustomEvent) => {
            emittedValue = e.detail.value;
          }
        }
      });
      
      const firstInput = screen.getByLabelText('Digit 1 of 6');
      
      // Paste 6 digits
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      Object.defineProperty(pasteEvent.clipboardData, 'getData', {
        value: () => '123456'
      });
      
      await fireEvent(firstInput, pasteEvent);
      
      await waitFor(() => {
        expect(emittedValue).toBe('123456');
      });
    });

    it('should handle paste with non-numeric characters', async () => {
      let emittedValue = '';
      
      render(PinInput, {
        events: {
          input: (e: CustomEvent) => {
            emittedValue = e.detail.value;
          }
        }
      });
      
      const firstInput = screen.getByLabelText('Digit 1 of 6');
      
      // Paste mixed content
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      Object.defineProperty(pasteEvent.clipboardData, 'getData', {
        value: () => '1a2b3c4d5e6f'
      });
      
      await fireEvent(firstInput, pasteEvent);
      
      // Should extract only numbers
      await waitFor(() => {
        expect(emittedValue).toBe('123456');
      });
    });

    it('should handle paste of partial PIN', async () => {
      let emittedValue = '';
      
      render(PinInput, {
        events: {
          input: (e: CustomEvent) => {
            emittedValue = e.detail.value;
          }
        }
      });
      
      const firstInput = screen.getByLabelText('Digit 1 of 6');
      
      // Paste only 3 digits
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      Object.defineProperty(pasteEvent.clipboardData, 'getData', {
        value: () => '123'
      });
      
      await fireEvent(firstInput, pasteEvent);
      
      // Should have partial value
      await waitFor(() => {
        expect(emittedValue).toBe('123');
      });
      
      // Focus should be on 4th input
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      expect(inputs[3]).toHaveFocus();
    });
  });

  describe('Clear Functionality', () => {
    it('should show clear button when PIN has value', async () => {
      render(PinInput, {
        props: {
          value: '123456'
        }
      });
      
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should clear all inputs on clear button click', async () => {
      let emittedValue = '123456';
      
      render(PinInput, {
        props: {
          value: '123456'
        },
        events: {
          input: (e: CustomEvent) => {
            emittedValue = e.detail.value;
          }
        }
      });
      
      const clearButton = screen.getByText('Clear');
      await fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(emittedValue).toBe('');
      });
      
      // First input should be focused
      const firstInput = screen.getByLabelText('Digit 1 of 6');
      expect(firstInput).toHaveFocus();
    });

    it('should not show clear button when disabled', () => {
      render(PinInput, {
        props: {
          value: '123456',
          disabled: true
        }
      });
      
      const clearButton = screen.getByText('Clear');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Value Binding', () => {
    it('should update internal state when value prop changes', async () => {
      const { component } = render(PinInput, {
        props: {
          value: ''
        }
      });
      
      // Update value prop
      await component.$set({ value: '456789' });
      await tick();
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      expect(inputs[0]).toHaveValue('4');
      expect(inputs[1]).toHaveValue('5');
      expect(inputs[2]).toHaveValue('6');
      expect(inputs[3]).toHaveValue('7');
      expect(inputs[4]).toHaveValue('8');
      expect(inputs[5]).toHaveValue('9');
    });

    it('should emit input event on any change', async () => {
      const inputEvents: string[] = [];
      
      render(PinInput, {
        events: {
          input: (e: CustomEvent) => {
            inputEvents.push(e.detail.value);
          }
        }
      });
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      
      // Enter digits one by one
      await fireEvent.input(inputs[0], { target: { value: '1' } });
      await fireEvent.input(inputs[1], { target: { value: '2' } });
      
      await waitFor(() => {
        expect(inputEvents).toContain('1');
        expect(inputEvents).toContain('12');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(PinInput, {
        props: {
          label: 'Security PIN',
          required: true,
          errorId: 'pin-error'
        }
      });
      
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-labelledby');
      expect(group).toHaveAttribute('aria-describedby', 'pin-error');
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      inputs.forEach((input, index) => {
        expect(input).toHaveAttribute('aria-label', `Digit ${index + 1} of 6`);
      });
    });

    it('should announce PIN completion to screen readers', async () => {
      const { announceToScreenReader } = await import('$lib/utils/accessibility');
      
      render(PinInput);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      
      // Enter complete PIN
      for (let i = 0; i < 6; i++) {
        await fireEvent.input(inputs[i], { target: { value: String(i + 1) } });
      }
      
      await waitFor(() => {
        expect(announceToScreenReader).toHaveBeenCalledWith('PIN complete');
      });
    });

    it('should announce paste action to screen readers', async () => {
      const { announceToScreenReader } = await import('$lib/utils/accessibility');
      
      render(PinInput);
      
      const firstInput = screen.getByLabelText('Digit 1 of 6');
      
      // Paste digits
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      Object.defineProperty(pasteEvent.clipboardData, 'getData', {
        value: () => '123456'
      });
      
      await fireEvent(firstInput, pasteEvent);
      
      await waitFor(() => {
        expect(announceToScreenReader).toHaveBeenCalledWith('Pasted 6 digits');
      });
    });

    it('should announce clear action to screen readers', async () => {
      const { announceToScreenReader } = await import('$lib/utils/accessibility');
      
      render(PinInput, {
        props: {
          value: '123456'
        }
      });
      
      const clearButton = screen.getByText('Clear');
      await fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(announceToScreenReader).toHaveBeenCalledWith('PIN cleared');
      });
    });
  });

  describe('AutoFocus', () => {
    it('should autofocus first input when autoFocus is true', () => {
      render(PinInput, {
        props: {
          autoFocus: true
        }
      });
      
      const firstInput = screen.getByLabelText('Digit 1 of 6');
      expect(firstInput).toHaveFocus();
    });

    it('should not autofocus when autoFocus is false', () => {
      render(PinInput, {
        props: {
          autoFocus: false
        }
      });
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      inputs.forEach(input => {
        expect(input).not.toHaveFocus();
      });
    });
  });

  describe('Visual States', () => {
    it('should apply filled class to inputs with values', async () => {
      render(PinInput);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      
      // Enter value in first input
      await fireEvent.input(inputs[0], { target: { value: '1' } });
      
      await waitFor(() => {
        expect(inputs[0]).toHaveClass('filled');
        expect(inputs[1]).not.toHaveClass('filled');
      });
    });
  });
});