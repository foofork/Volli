/**
 * Accessibility utilities for Volli
 * Provides functions for keyboard navigation, focus management, and ARIA support
 */

export interface FocusableElement {
  element: HTMLElement;
  index: number;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): FocusableElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[role="tab"]:not([disabled])',
    '[role="menuitem"]:not([disabled])',
    '[contenteditable="true"]'
  ].join(',');

  const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  
  return elements
    .filter(el => {
      // Additional checks for visibility and accessibility
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             !el.hasAttribute('aria-hidden') &&
             el.offsetParent !== null;
    })
    .map((element, index) => ({ element, index }));
}

/**
 * Move focus to the next focusable element
 */
export function focusNext(container: HTMLElement, currentElement?: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) return false;
  
  if (!currentElement) {
    focusableElements[0].element.focus();
    return true;
  }
  
  const currentIndex = focusableElements.findIndex(item => item.element === currentElement);
  const nextIndex = (currentIndex + 1) % focusableElements.length;
  
  focusableElements[nextIndex].element.focus();
  return true;
}

/**
 * Move focus to the previous focusable element
 */
export function focusPrevious(container: HTMLElement, currentElement?: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) return false;
  
  if (!currentElement) {
    focusableElements[focusableElements.length - 1].element.focus();
    return true;
  }
  
  const currentIndex = focusableElements.findIndex(item => item.element === currentElement);
  const previousIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
  
  focusableElements[previousIndex].element.focus();
  return true;
}

/**
 * Trap focus within a container (useful for modals and dialogs)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false;
  
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return false;
  
  const firstElement = focusableElements[0].element;
  const lastElement = focusableElements[focusableElements.length - 1].element;
  
  if (event.shiftKey) {
    // Shift + Tab (backward)
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return true;
    }
  } else {
    // Tab (forward)
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
      return true;
    }
  }
  
  return false;
}

/**
 * Handle arrow key navigation for lists and grids
 */
export function handleArrowNavigation(
  container: HTMLElement, 
  event: KeyboardEvent, 
  orientation: 'vertical' | 'horizontal' | 'grid' = 'vertical'
): boolean {
  const { key } = event;
  const currentElement = document.activeElement as HTMLElement;
  
  if (!currentElement || !container.contains(currentElement)) return false;
  
  switch (orientation) {
    case 'vertical':
      if (key === 'ArrowDown') {
        event.preventDefault();
        return focusNext(container, currentElement);
      }
      if (key === 'ArrowUp') {
        event.preventDefault();
        return focusPrevious(container, currentElement);
      }
      break;
      
    case 'horizontal':
      if (key === 'ArrowRight') {
        event.preventDefault();
        return focusNext(container, currentElement);
      }
      if (key === 'ArrowLeft') {
        event.preventDefault();
        return focusPrevious(container, currentElement);
      }
      break;
      
    case 'grid':
      // Grid navigation would require row/column calculations
      // Implementation depends on specific grid structure
      return handleVerticalArrowNavigation(container, event) ||
             handleHorizontalArrowNavigation(container, event);
  }
  
  return false;
}

function handleVerticalArrowNavigation(container: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const currentElement = document.activeElement as HTMLElement;
    return event.key === 'ArrowDown' 
      ? focusNext(container, currentElement)
      : focusPrevious(container, currentElement);
  }
  return false;
}

function handleHorizontalArrowNavigation(container: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    const currentElement = document.activeElement as HTMLElement;
    return event.key === 'ArrowRight' 
      ? focusNext(container, currentElement)
      : focusPrevious(container, currentElement);
  }
  return false;
}

/**
 * Announce text to screen readers using live regions
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = getOrCreateAnnouncer();
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = message;
  
  // Clear after announcement to avoid repetition
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

function getOrCreateAnnouncer(): HTMLElement {
  let announcer = document.getElementById('volli-screen-reader-announcer');
  
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'volli-screen-reader-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(announcer);
  }
  
  return announcer;
}

/**
 * Generate unique IDs for accessibility attributes
 */
export function generateId(prefix: string = 'volli'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Keyboard shortcuts manager
 */
export class KeyboardShortcuts {
  private shortcuts = new Map<string, () => void>();
  private isEnabled = true;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Register a keyboard shortcut
   * @param combination - e.g., 'ctrl+k', 'cmd+enter', 'escape'
   * @param callback - Function to execute when shortcut is pressed
   */
  register(combination: string, callback: () => void): void {
    this.shortcuts.set(this.normalizeShortcut(combination), callback);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(combination: string): void {
    this.shortcuts.delete(this.normalizeShortcut(combination));
  }

  /**
   * Enable or disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const combination = this.getEventShortcut(event);
    const callback = this.shortcuts.get(combination);
    
    if (callback) {
      event.preventDefault();
      callback();
    }
  }

  private normalizeShortcut(combination: string): string {
    return combination.toLowerCase().replace(/\s+/g, '');
  }

  private getEventShortcut(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.metaKey) parts.push('cmd');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }
}

/**
 * Color contrast utilities
 */
export class ColorContrast {
  /**
   * Calculate the contrast ratio between two colors
   */
  static calculateRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Check if color combination meets WCAG AA standards
   */
  static meetsWCAGAA(color1: string, color2: string, isLargeText = false): boolean {
    const ratio = this.calculateRatio(color1, color2);
    return ratio >= (isLargeText ? 3 : 4.5);
  }

  /**
   * Check if color combination meets WCAG AAA standards
   */
  static meetsWCAGAAA(color1: string, color2: string, isLargeText = false): boolean {
    const ratio = this.calculateRatio(color1, color2);
    return ratio >= (isLargeText ? 4.5 : 7);
  }

  private static getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private static hexToRgb(hex: string): number[] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }
}