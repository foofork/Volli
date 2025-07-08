import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import SimplifiedKeyInput from '../../src/lib/components/SimplifiedKeyInput.svelte';

describe('SimplifiedKeyInput Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(SimplifiedKeyInput);
      
      expect(screen.getByLabelText('Key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter key')).toBeInTheDocument();
    });

    it('should render with custom label and placeholder', () => {
      render(SimplifiedKeyInput, {
        props: {
          label: 'Security Key',
          placeholder: 'Paste your security key here'
        }
      });
      
      expect(screen.getByLabelText('Security Key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Paste your security key here')).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(SimplifiedKeyInput, {
        props: {
          required: true
        }
      });
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('should validate hex format keys', async () => {
      const { component } = render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Valid 64-character hex
      await fireEvent.input(input, { 
        target: { value: 'a'.repeat(64) } 
      });
      
      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument();
        expect(screen.getByText('Valid key')).toBeInTheDocument();
      });
    });

    it('should validate base64 format keys', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Valid base64 (43 chars + padding)
      await fireEvent.input(input, { 
        target: { value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq=' } 
      });
      
      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument();
        expect(screen.getByText('Valid key')).toBeInTheDocument();
      });
    });

    it('should validate demo format keys', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Valid demo format
      await fireEvent.input(input, { 
        target: { value: 'pk_demokey123456' } 
      });
      
      await waitFor(() => {
        expect(screen.getByText('✓')).toBeInTheDocument();
        expect(screen.getByText('Valid key')).toBeInTheDocument();
      });
    });

    it('should show error for invalid keys', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Too short
      await fireEvent.input(input, { 
        target: { value: 'abc123' } 
      });
      
      await waitFor(() => {
        expect(screen.getByText('✗')).toBeInTheDocument();
        expect(screen.getByText(/doesn't look like a valid key/)).toBeInTheDocument();
      });
    });

    it('should show warning state for partial input', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Partial hex (less than 64 chars)
      await fireEvent.input(input, { 
        target: { value: 'a'.repeat(32) } 
      });
      
      await waitFor(() => {
        expect(screen.getByText('!')).toBeInTheDocument();
        expect(screen.getByText(/Key looks incomplete/)).toBeInTheDocument();
      });
    });
  });

  describe('Event Handling', () => {
    it('should emit input event with validation state', async () => {
      let lastEvent: any = null;
      
      render(SimplifiedKeyInput, {
        props: {
          value: ''
        },
        events: {
          input: (e: CustomEvent) => {
            lastEvent = e.detail;
          }
        }
      });
      
      const input = screen.getByRole('textbox');
      
      // Valid input
      await fireEvent.input(input, { 
        target: { value: 'a'.repeat(64) } 
      });
      
      await waitFor(() => {
        expect(lastEvent).toEqual({
          value: 'a'.repeat(64),
          valid: true
        });
      });
      
      // Invalid input
      await fireEvent.input(input, { 
        target: { value: 'invalid' } 
      });
      
      await waitFor(() => {
        expect(lastEvent).toEqual({
          value: 'invalid',
          valid: false
        });
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(SimplifiedKeyInput, {
        props: {
          disabled: true
        }
      });
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should not validate when disabled', async () => {
      render(SimplifiedKeyInput, {
        props: {
          disabled: true,
          value: 'invalid'
        }
      });
      
      // Should not show validation state
      expect(screen.queryByText('✗')).not.toBeInTheDocument();
      expect(screen.queryByText('!')).not.toBeInTheDocument();
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });
  });

  describe('Help Text', () => {
    it('should show help text for hex format', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Start typing hex
      await fireEvent.input(input, { 
        target: { value: 'abc' } 
      });
      
      await waitFor(() => {
        expect(screen.getByText(/standard format/)).toBeInTheDocument();
      });
    });

    it('should show help text for base64 format', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Start typing base64-like
      await fireEvent.input(input, { 
        target: { value: 'ABC+/' } 
      });
      
      await waitFor(() => {
        expect(screen.getByText(/encoded format/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(SimplifiedKeyInput, {
        props: {
          label: 'Security Key',
          required: true,
          value: 'invalid'
        }
      });
      
      const input = screen.getByLabelText('Security Key');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should associate error messages with input', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Trigger error
      await fireEvent.input(input, { 
        target: { value: 'bad' } 
      });
      
      await waitFor(() => {
        const errorId = input.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        
        const errorElement = document.getElementById(errorId!);
        expect(errorElement).toHaveTextContent(/doesn't look like a valid key/);
      });
    });
  });

  describe('Format Detection', () => {
    it('should detect and suggest format corrections', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Hex with spaces (common copy-paste issue)
      await fireEvent.input(input, { 
        target: { value: 'ab cd ef 12 34 56' } 
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Remove spaces/)).toBeInTheDocument();
      });
    });

    it('should handle whitespace trimming', async () => {
      render(SimplifiedKeyInput);
      
      const input = screen.getByRole('textbox');
      
      // Key with leading/trailing whitespace
      await fireEvent.input(input, { 
        target: { value: '  ' + 'a'.repeat(64) + '  ' } 
      });
      
      await waitFor(() => {
        // Should validate the trimmed value
        expect(screen.getByText('✓')).toBeInTheDocument();
      });
    });
  });
});