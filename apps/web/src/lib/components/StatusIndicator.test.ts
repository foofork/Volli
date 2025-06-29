/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import StatusIndicator from './StatusIndicator.svelte';

describe('StatusIndicator Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default offline status', () => {
      render(StatusIndicator);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('⚫')).toBeInTheDocument();
    });

    it('should render different status types correctly', () => {
      const statuses = [
        { status: 'online', icon: '🟢', label: 'Online' },
        { status: 'connecting', icon: '🔄', label: 'Connecting...' },
        { status: 'verified', icon: '✅', label: 'Verified' },
        { status: 'unverified', icon: '❓', label: 'Unverified' },
        { status: 'secure', icon: '🔒', label: 'Secure' },
        { status: 'warning', icon: '⚠️', label: 'Warning' },
        { status: 'error', icon: '❌', label: 'Error' }
      ] as const;

      statuses.forEach(({ status, icon, label }) => {
        const { unmount } = render(StatusIndicator, { status });
        
        expect(screen.getByText(icon)).toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Custom Labels', () => {
    it('should use custom label when provided', () => {
      const customLabel = 'Custom Status';
      render(StatusIndicator, { status: 'online', label: customLabel });

      expect(screen.getByText(customLabel)).toBeInTheDocument();
      expect(screen.queryByText('Online')).not.toBeInTheDocument();
    });

    it('should fall back to default label when custom label is empty', () => {
      render(StatusIndicator, { status: 'verified', label: '' });

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply correct size classes', () => {
      const { rerender } = render(StatusIndicator, { status: 'online', size: 'small' });
      expect(document.querySelector('.status-indicator')).toHaveClass('small');

      rerender({ status: 'online', size: 'medium' });
      expect(document.querySelector('.status-indicator')).toHaveClass('medium');

      rerender({ status: 'online', size: 'large' });
      expect(document.querySelector('.status-indicator')).toHaveClass('large');
    });
  });

  describe('Label Visibility', () => {
    it('should show label by default', () => {
      render(StatusIndicator, { status: 'online' });
      
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      render(StatusIndicator, { status: 'online', showLabel: false });
      
      expect(screen.queryByText('Online')).not.toBeInTheDocument();
      expect(screen.getByText('🟢')).toBeInTheDocument(); // Icon should still be visible
    });
  });

  describe('Animation Classes', () => {
    it('should apply animate class when enabled', () => {
      render(StatusIndicator, { status: 'online', animate: true });
      
      expect(document.querySelector('.status-indicator')).toHaveClass('animate');
    });

    it('should not apply animate class by default', () => {
      render(StatusIndicator, { status: 'online' });
      
      expect(document.querySelector('.status-indicator')).not.toHaveClass('animate');
    });

    it('should apply pulse class for connecting status', () => {
      render(StatusIndicator, { status: 'connecting' });
      
      expect(document.querySelector('.status-indicator')).toHaveClass('pulse');
    });

    it('should apply pulse class when explicitly enabled', () => {
      render(StatusIndicator, { status: 'online', pulse: true });
      
      expect(document.querySelector('.status-indicator')).toHaveClass('pulse');
    });
  });

  describe('CSS Custom Properties', () => {
    it('should set correct CSS custom properties for colors', () => {
      render(StatusIndicator, { status: 'online' });
      
      const indicator = document.querySelector('.status-indicator') as HTMLElement;
      const styles = getComputedStyle(indicator);
      
      // Check that CSS custom properties are set (exact values depend on CSS implementation)
      expect(indicator.style.getPropertyValue('--status-color')).toBe('#10B981');
      expect(indicator.style.getPropertyValue('--status-bg')).toBe('rgba(16, 185, 129, 0.1)');
    });
  });

  describe('Accessibility', () => {
    it('should have proper title attribute', () => {
      render(StatusIndicator, { status: 'verified', label: 'Contact Verified' });
      
      const indicator = document.querySelector('.status-indicator');
      expect(indicator).toHaveAttribute('title', 'Contact Verified');
    });

    it('should use default label in title when no custom label provided', () => {
      render(StatusIndicator, { status: 'secure' });
      
      const indicator = document.querySelector('.status-indicator');
      expect(indicator).toHaveAttribute('title', 'Secure');
    });
  });

  describe('Status-Specific Behavior', () => {
    it('should automatically pulse for connecting status', () => {
      render(StatusIndicator, { status: 'connecting', pulse: false });
      
      // Should pulse even when pulse prop is false, because connecting status auto-pulses
      expect(document.querySelector('.status-indicator')).toHaveClass('pulse');
    });

    it('should use appropriate colors for each status', () => {
      const statusColors = {
        online: '#10B981',
        offline: '#6B7280', 
        connecting: '#F59E0B',
        verified: '#10B981',
        unverified: '#F59E0B',
        secure: '#3B82F6',
        warning: '#F59E0B',
        error: '#EF4444'
      };

      Object.entries(statusColors).forEach(([status, expectedColor]) => {
        const { unmount } = render(StatusIndicator, { status: status as any });
        
        const indicator = document.querySelector('.status-indicator') as HTMLElement;
        expect(indicator.style.getPropertyValue('--status-color')).toBe(expectedColor);
        
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing status gracefully', () => {
      // TypeScript would prevent this, but test runtime behavior
      render(StatusIndicator, { status: 'invalid' as any });
      
      // Should not crash and should show some fallback
      expect(document.querySelector('.status-indicator')).toBeInTheDocument();
    });
  });
});