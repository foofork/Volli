import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import UserFriendlyId from '../../src/lib/components/UserFriendlyId.svelte';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
});

// Mock crypto for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

describe('UserFriendlyId Component', () => {
  describe('Display Modes', () => {
    it('should display friendly name for identity type', () => {
      render(UserFriendlyId, {
        props: {
          id: 'a1b2c3d4e5f6',
          type: 'identity'
        }
      });
      
      // Should show icon and friendly words
      expect(screen.getByText(/🦊|🐱|🐺|🐸|🦝|🐨|🐧|🦜/)).toBeInTheDocument();
      expect(screen.getByText(/Swift|Bright|Noble|Clever|Silent/)).toBeInTheDocument();
    });

    it('should use provided name if available', () => {
      render(UserFriendlyId, {
        props: {
          id: 'a1b2c3d4e5f6',
          name: 'Alice Smith',
          type: 'identity'
        }
      });
      
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    it('should display contact type differently', () => {
      render(UserFriendlyId, {
        props: {
          id: 'a1b2c3d4e5f6',
          type: 'contact',
          name: 'Bob Jones'
        }
      });
      
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size styles', () => {
      render(UserFriendlyId, {
        props: {
          id: 'test123',
          size: 'small'
        }
      });
      
      const container = screen.getByTestId('user-friendly-id');
      expect(container).toHaveClass('size-small');
    });

    it('should apply large size styles', () => {
      render(UserFriendlyId, {
        props: {
          id: 'test123',
          size: 'large'
        }
      });
      
      const container = screen.getByTestId('user-friendly-id');
      expect(container).toHaveClass('size-large');
    });
  });

  describe('Copy Functionality', () => {
    it('should show copy button when showCopy is true', () => {
      render(UserFriendlyId, {
        props: {
          id: 'a1b2c3d4e5f6',
          showCopy: true
        }
      });
      
      expect(screen.getByLabelText('Copy ID to clipboard')).toBeInTheDocument();
    });

    it('should copy ID to clipboard on click', async () => {
      render(UserFriendlyId, {
        props: {
          id: 'a1b2c3d4e5f6',
          showCopy: true
        }
      });
      
      const copyButton = screen.getByLabelText('Copy ID to clipboard');
      await fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('a1b2c3d4e5f6');
    });

    it('should show success feedback after copy', async () => {
      render(UserFriendlyId, {
        props: {
          id: 'a1b2c3d4e5f6',
          showCopy: true
        }
      });
      
      const copyButton = screen.getByLabelText('Copy ID to clipboard');
      await fireEvent.click(copyButton);
      
      // Should change to checkmark
      expect(screen.getByText('✓')).toBeInTheDocument();
      expect(screen.queryByText('📋')).not.toBeInTheDocument();
    });
  });

  describe('Inline Mode', () => {
    it('should display inline when inline prop is true', () => {
      render(UserFriendlyId, {
        props: {
          id: 'test123',
          inline: true
        }
      });
      
      const container = screen.getByTestId('user-friendly-id');
      expect(container).toHaveClass('inline');
    });
  });

  describe('Deterministic Generation', () => {
    it('should generate same friendly display for same ID', () => {
      const { unmount } = render(UserFriendlyId, {
        props: { id: 'abc123' }
      });
      
      const firstIcon = screen.getByTestId('friendly-icon').textContent;
      const firstName = screen.getByTestId('friendly-name').textContent;
      
      unmount();
      
      render(UserFriendlyId, {
        props: { id: 'abc123' }
      });
      
      const secondIcon = screen.getByTestId('friendly-icon').textContent;
      const secondName = screen.getByTestId('friendly-name').textContent;
      
      expect(firstIcon).toBe(secondIcon);
      expect(firstName).toBe(secondName);
    });

    it('should generate different displays for different IDs', () => {
      const { unmount } = render(UserFriendlyId, {
        props: { id: 'abc123' }
      });
      
      const firstDisplay = screen.getByTestId('friendly-name').textContent;
      
      unmount();
      
      render(UserFriendlyId, {
        props: { id: 'xyz789' }
      });
      
      const secondDisplay = screen.getByTestId('friendly-name').textContent;
      
      expect(firstDisplay).not.toBe(secondDisplay);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(UserFriendlyId, {
        props: {
          id: 'test123',
          name: 'Alice',
          type: 'identity',
          showCopy: true
        }
      });
      
      expect(screen.getByLabelText('Identity: Alice')).toBeInTheDocument();
      expect(screen.getByLabelText('Copy ID to clipboard')).toBeInTheDocument();
    });

    it('should announce copy success to screen readers', async () => {
      render(UserFriendlyId, {
        props: {
          id: 'test123',
          showCopy: true
        }
      });
      
      const copyButton = screen.getByLabelText('Copy ID to clipboard');
      await fireEvent.click(copyButton);
      
      // Check for live region announcement
      expect(screen.getByRole('status')).toHaveTextContent('ID copied to clipboard');
    });
  });
});