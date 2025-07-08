/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import UserFriendlyId from './UserFriendlyId.svelte';

describe('UserFriendlyId Component', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('Basic Rendering', () => {
    it('should render with a user ID', () => {
      const testId = 'test-user-12345';
      render(UserFriendlyId, { id: testId });

      // Should show a friendly display instead of the hex ID
      expect(screen.queryByText(testId)).not.toBeInTheDocument();
      
      // Should show some kind of friendly identifier
      const shortId = screen.getByText(/^#[A-Z0-9]{6}$/);
      expect(shortId).toBeInTheDocument();
    });

    it('should show custom name when provided', () => {
      const testId = 'test-user-12345';
      const testName = 'Alice Johnson';
      render(UserFriendlyId, { id: testId, name: testName });

      expect(screen.getByText(testName)).toBeInTheDocument();
    });

    it('should generate consistent friendly names for same ID', () => {
      const testId = 'test-user-12345';
      
      const { unmount } = render(UserFriendlyId, { id: testId });
      const firstDisplay = screen.getByText(/\w+ \w+/); // Match "Adjective Noun" pattern
      const firstName = firstDisplay.textContent;
      unmount();

      render(UserFriendlyId, { id: testId });
      const secondDisplay = screen.getByText(/\w+ \w+/);
      const secondName = secondDisplay.textContent;

      expect(firstName).toBe(secondName);
    });
  });

  describe('Visual Elements', () => {
    it('should display an icon and color', () => {
      render(UserFriendlyId, { id: 'test-id' });

      // Should have an icon (emoji)
      const iconElement = document.querySelector('.id-icon');
      expect(iconElement).toBeInTheDocument();
      expect(iconElement?.textContent).toMatch(/[\u{1F000}-\u{1F9FF}]/u); // Unicode emoji range
    });

    it('should show different icons for different IDs', () => {
      const { unmount } = render(UserFriendlyId, { id: 'test-id-1' });
      const firstIcon = document.querySelector('.id-icon')?.textContent;
      unmount();

      render(UserFriendlyId, { id: 'test-id-2' });
      const secondIcon = document.querySelector('.id-icon')?.textContent;

      expect(firstIcon).not.toBe(secondIcon);
    });
  });

  describe('Size Variants', () => {
    it('should apply size classes correctly', () => {
      const { rerender } = render(UserFriendlyId, { id: 'test', size: 'small' });
      expect(document.querySelector('.user-friendly-id')).toHaveClass('small');

      rerender({ id: 'test', size: 'medium' });
      expect(document.querySelector('.user-friendly-id')).toHaveClass('medium');

      rerender({ id: 'test', size: 'large' });
      expect(document.querySelector('.user-friendly-id')).toHaveClass('large');
    });
  });

  describe('Copy Functionality', () => {
    it('should show copy button when enabled', () => {
      render(UserFriendlyId, { id: 'test-id', showCopy: true });

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should not show copy button by default', () => {
      render(UserFriendlyId, { id: 'test-id' });

      const copyButton = screen.queryByRole('button', { name: /copy/i });
      expect(copyButton).not.toBeInTheDocument();
    });

    it('should copy ID to clipboard when copy button is clicked', async () => {
      const testId = 'test-id-12345';
      render(UserFriendlyId, { id: testId, showCopy: true });

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testId);
    });
  });

  describe('Type Variants', () => {
    it('should show appropriate labels for different types', () => {
      const { rerender } = render(UserFriendlyId, { id: 'test', type: 'identity' });
      expect(screen.getByText(/your id:/i)).toBeInTheDocument();

      rerender({ id: 'test', type: 'contact' });
      expect(screen.getByText(/contact id:/i)).toBeInTheDocument();

      rerender({ id: 'test', type: 'conversation' });
      expect(screen.getByText(/id:/i)).toBeInTheDocument();
    });
  });

  describe('Inline Display', () => {
    it('should apply inline class when enabled', () => {
      render(UserFriendlyId, { id: 'test', inline: true });

      expect(document.querySelector('.user-friendly-id')).toHaveClass('inline');
    });

    it('should hide short ID in inline mode', () => {
      render(UserFriendlyId, { id: 'test', inline: true });

      // In inline mode, the short ID should be hidden via CSS
      const shortIdElement = document.querySelector('.id-short');
      expect(shortIdElement).toBeInTheDocument(); // Element exists
      
      // Check if it has display: none via CSS (this is set in the CSS)
      const styles = getComputedStyle(shortIdElement!);
      expect(styles.display).toBe('none');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for copy button', () => {
      render(UserFriendlyId, { id: 'test', showCopy: true });

      const copyButton = screen.getByRole('button', { name: /copy id to clipboard/i });
      expect(copyButton).toHaveAttribute('aria-label', 'Copy ID to clipboard');
    });

    it('should show full ID in title attribute', () => {
      const testId = 'test-id-12345';
      render(UserFriendlyId, { id: testId });

      const shortIdElement = screen.getByText(/^#[A-Z0-9]{6}$/);
      expect(shortIdElement).toHaveAttribute('title', `Full ID: ${testId}`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ID gracefully', () => {
      render(UserFriendlyId, { id: '' });

      expect(screen.getByText('Unknown User')).toBeInTheDocument();
    });

    it('should handle very long IDs', () => {
      const longId = 'a'.repeat(100);
      render(UserFriendlyId, { id: longId });

      // Should still generate a short ID
      const shortId = screen.getByText(/^#[A-Z0-9]{6}$/);
      expect(shortId).toBeInTheDocument();
    });
  });
});