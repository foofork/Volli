/**
 * Accessibility testing utilities for Volli
 * Provides functions to test and validate accessibility compliance
 */

import { ColorContrast } from './accessibility';

export interface AccessibilityIssue {
  element: HTMLElement;
  type: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
}

export interface AccessibilityReport {
  issues: AccessibilityIssue[];
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  compliance: {
    wcagAA: boolean;
    wcagAAA: boolean;
    level: 'A' | 'AA' | 'AAA' | 'fail';
  };
}

/**
 * Comprehensive accessibility audit of a container element
 */
export function auditAccessibility(container: HTMLElement = document.body): AccessibilityReport {
  const issues: AccessibilityIssue[] = [];
  
  // Check for missing alt text on images
  issues.push(...checkImageAltText(container));
  
  // Check for proper heading structure
  issues.push(...checkHeadingStructure(container));
  
  // Check for keyboard accessibility
  issues.push(...checkKeyboardAccessibility(container));
  
  // Check for color contrast
  issues.push(...checkColorContrast(container));
  
  // Check for ARIA attributes
  issues.push(...checkAriaAttributes(container));
  
  // Check for form accessibility
  issues.push(...checkFormAccessibility(container));
  
  // Check for focus management
  issues.push(...checkFocusManagement(container));
  
  // Check for semantic HTML
  issues.push(...checkSemanticHTML(container));
  
  // Generate summary
  const summary = {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    serious: issues.filter(i => i.severity === 'serious').length,
    moderate: issues.filter(i => i.severity === 'moderate').length,
    minor: issues.filter(i => i.severity === 'minor').length
  };
  
  // Determine compliance level
  const compliance = {
    wcagAA: summary.critical === 0 && summary.serious === 0,
    wcagAAA: summary.critical === 0 && summary.serious === 0 && summary.moderate === 0,
    level: summary.critical > 0 || summary.serious > 0 ? 'fail' : 
           summary.moderate > 0 ? 'AA' : 'AAA'
  } as const;
  
  return { issues, summary, compliance };
}

/**
 * Check for missing alt text on images and icons
 */
function checkImageAltText(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const images = container.querySelectorAll('img, svg, [role="img"]');
  
  images.forEach(img => {
    const element = img as HTMLElement;
    
    if (img.tagName === 'IMG') {
      const imgElement = img as HTMLImageElement;
      if (!imgElement.alt && !imgElement.hasAttribute('aria-label') && !imgElement.hasAttribute('aria-labelledby')) {
        issues.push({
          element,
          type: 'error',
          rule: 'img-alt',
          message: 'Image missing alt text or aria-label',
          severity: 'serious'
        });
      }
    } else if (img.tagName === 'SVG' || element.getAttribute('role') === 'img') {
      if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby') && !element.hasAttribute('aria-hidden')) {
        issues.push({
          element,
          type: 'error',
          rule: 'svg-alt',
          message: 'SVG or icon missing aria-label or aria-hidden',
          severity: 'serious'
        });
      }
    }
  });
  
  return issues;
}

/**
 * Check for proper heading structure (h1-h6)
 */
function checkHeadingStructure(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  
  if (headings.length === 0) {
    return issues;
  }
  
  // Check for h1
  const h1s = headings.filter(h => h.tagName === 'H1');
  if (h1s.length === 0) {
    issues.push({
      element: container,
      type: 'warning',
      rule: 'heading-h1',
      message: 'Page should have at least one h1 heading',
      severity: 'moderate'
    });
  } else if (h1s.length > 1) {
    h1s.slice(1).forEach(h1 => {
      issues.push({
        element: h1 as HTMLElement,
        type: 'warning',
        rule: 'heading-h1-multiple',
        message: 'Multiple h1 headings found - consider using lower level headings',
        severity: 'minor'
      });
    });
  }
  
  // Check heading hierarchy
  let currentLevel = 0;
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1]);
    
    if (currentLevel > 0 && level > currentLevel + 1) {
      issues.push({
        element: heading as HTMLElement,
        type: 'warning',
        rule: 'heading-hierarchy',
        message: `Heading level skipped from h${currentLevel} to h${level}`,
        severity: 'moderate'
      });
    }
    
    currentLevel = level;
  });
  
  return issues;
}

/**
 * Check for keyboard accessibility
 */
function checkKeyboardAccessibility(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for interactive elements without keyboard access
  const interactiveElements = container.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]');
  
  interactiveElements.forEach(element => {
    const el = element as HTMLElement;
    
    // Check if element is focusable
    if (el.tabIndex === -1 && !el.hasAttribute('disabled')) {
      issues.push({
        element: el,
        type: 'error',
        rule: 'keyboard-access',
        message: 'Interactive element not keyboard accessible (tabindex="-1")',
        severity: 'serious'
      });
    }
    
    // Check for click handlers without keyboard handlers
    if (el.onclick && !el.onkeydown && !el.onkeyup && !el.onkeypress) {
      issues.push({
        element: el,
        type: 'warning',
        rule: 'keyboard-handlers',
        message: 'Click handler without corresponding keyboard handler',
        severity: 'moderate'
      });
    }
  });
  
  return issues;
}

/**
 * Check color contrast ratios
 */
function checkColorContrast(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Get all text elements
  const textElements = container.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6, li, td, th, label');
  
  textElements.forEach(element => {
    const el = element as HTMLElement;
    const styles = window.getComputedStyle(el);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // Skip if background is transparent or if element has no visible text
    if (backgroundColor === 'rgba(0, 0, 0, 0)' || !el.textContent?.trim()) {
      return;
    }
    
    try {
      const isLargeText = parseFloat(styles.fontSize) >= 18 || 
                         (parseFloat(styles.fontSize) >= 14 && styles.fontWeight >= '700');
      
      if (!ColorContrast.meetsWCAGAA(color, backgroundColor, isLargeText)) {
        const ratio = ColorContrast.calculateRatio(color, backgroundColor);
        issues.push({
          element: el,
          type: 'error',
          rule: 'color-contrast',
          message: `Color contrast ratio ${ratio.toFixed(2)}:1 does not meet WCAG AA standards`,
          severity: 'serious'
        });
      }
    } catch (error) {
      // Color parsing failed, skip this element
    }
  });
  
  return issues;
}

/**
 * Check ARIA attributes
 */
function checkAriaAttributes(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for missing labels
  const labelTargets = container.querySelectorAll('input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="menuitem"]');
  
  labelTargets.forEach(element => {
    const el = element as HTMLElement;
    
    if (!el.hasAttribute('aria-label') && 
        !el.hasAttribute('aria-labelledby') && 
        !el.id || !container.querySelector(`label[for="${el.id}"]`)) {
      issues.push({
        element: el,
        type: 'error',
        rule: 'aria-label',
        message: 'Form control or interactive element missing accessible label',
        severity: 'serious'
      });
    }
  });
  
  // Check for invalid ARIA attributes
  const elementsWithAria = container.querySelectorAll('[aria-invalid], [aria-expanded], [aria-selected], [aria-checked]');
  
  elementsWithAria.forEach(element => {
    const el = element as HTMLElement;
    
    // Check aria-invalid
    const ariaInvalid = el.getAttribute('aria-invalid');
    if (ariaInvalid && !['true', 'false', 'grammar', 'spelling'].includes(ariaInvalid)) {
      issues.push({
        element: el,
        type: 'error',
        rule: 'aria-invalid-value',
        message: `Invalid aria-invalid value: ${ariaInvalid}`,
        severity: 'moderate'
      });
    }
    
    // Check aria-expanded
    const ariaExpanded = el.getAttribute('aria-expanded');
    if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
      issues.push({
        element: el,
        type: 'error',
        rule: 'aria-expanded-value',
        message: `Invalid aria-expanded value: ${ariaExpanded}`,
        severity: 'moderate'
      });
    }
  });
  
  return issues;
}

/**
 * Check form accessibility
 */
function checkFormAccessibility(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  const forms = container.querySelectorAll('form');
  
  forms.forEach(form => {
    // Check for form labels
    const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
    
    inputs.forEach(input => {
      const el = input as HTMLInputElement;
      
      if (!el.labels?.length && 
          !el.hasAttribute('aria-label') && 
          !el.hasAttribute('aria-labelledby')) {
        issues.push({
          element: el,
          type: 'error',
          rule: 'form-label',
          message: 'Form input missing associated label',
          severity: 'serious'
        });
      }
    });
    
    // Check for required field indicators
    const requiredInputs = form.querySelectorAll('[required]');
    
    requiredInputs.forEach(input => {
      const el = input as HTMLElement;
      
      if (!el.hasAttribute('aria-required') && 
          !form.textContent?.includes('required') &&
          !form.textContent?.includes('*')) {
        issues.push({
          element: el,
          type: 'warning',
          rule: 'required-indicator',
          message: 'Required field without clear indicator for screen readers',
          severity: 'moderate'
        });
      }
    });
  });
  
  return issues;
}

/**
 * Check focus management
 */
function checkFocusManagement(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for focus outlines
  const focusableElements = container.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  
  focusableElements.forEach(element => {
    const el = element as HTMLElement;
    const styles = window.getComputedStyle(el, ':focus');
    
    // Check if focus outline is removed without replacement
    if (styles.outline === 'none' || styles.outlineWidth === '0px') {
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasBorder = styles.borderWidth !== '0px';
      const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
      
      if (!hasBoxShadow && !hasBorder && !hasBackground) {
        issues.push({
          element: el,
          type: 'warning',
          rule: 'focus-outline',
          message: 'Focus outline removed without visible alternative',
          severity: 'serious'
        });
      }
    }
  });
  
  return issues;
}

/**
 * Check semantic HTML usage
 */
function checkSemanticHTML(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for missing landmarks
  const hasMain = container.querySelector('main, [role="main"]');
  const hasNav = container.querySelector('nav, [role="navigation"]');
  
  if (!hasMain && container.childElementCount > 0) {
    issues.push({
      element: container,
      type: 'warning',
      rule: 'landmark-main',
      message: 'Page missing main landmark',
      severity: 'moderate'
    });
  }
  
  // Check for list structure
  const listItems = container.querySelectorAll('li');
  
  listItems.forEach(li => {
    const parent = li.parentElement;
    if (parent && !['ul', 'ol', 'menu'].includes(parent.tagName.toLowerCase()) && 
        parent.getAttribute('role') !== 'list') {
      issues.push({
        element: li as HTMLElement,
        type: 'error',
        rule: 'list-structure',
        message: 'List item not inside proper list container',
        severity: 'moderate'
      });
    }
  });
  
  // Check for button vs link usage
  const clickableElements = container.querySelectorAll('[onclick], [role="button"]');
  
  clickableElements.forEach(element => {
    const el = element as HTMLElement;
    
    if (el.tagName === 'DIV' || el.tagName === 'SPAN') {
      issues.push({
        element: el,
        type: 'warning',
        rule: 'semantic-button',
        message: 'Use <button> element instead of div/span with click handler',
        severity: 'moderate'
      });
    }
  });
  
  return issues;
}

/**
 * Generate a human-readable accessibility report
 */
export function generateAccessibilityReport(report: AccessibilityReport): string {
  const { issues, summary, compliance } = report;
  
  let output = `\n=== Accessibility Audit Report ===\n\n`;
  
  // Summary
  output += `Summary:\n`;
  output += `- Total Issues: ${summary.total}\n`;
  output += `- Critical: ${summary.critical}\n`;
  output += `- Serious: ${summary.serious}\n`;
  output += `- Moderate: ${summary.moderate}\n`;
  output += `- Minor: ${summary.minor}\n\n`;
  
  // Compliance
  output += `WCAG Compliance:\n`;
  output += `- Level: ${compliance.level}\n`;
  output += `- AA Compliant: ${compliance.wcagAA ? 'Yes' : 'No'}\n`;
  output += `- AAA Compliant: ${compliance.wcagAAA ? 'Yes' : 'No'}\n\n`;
  
  // Issues by severity
  ['critical', 'serious', 'moderate', 'minor'].forEach(severity => {
    const severityIssues = issues.filter(i => i.severity === severity);
    if (severityIssues.length > 0) {
      output += `${severity.toUpperCase()} Issues (${severityIssues.length}):\n`;
      severityIssues.forEach((issue, index) => {
        output += `${index + 1}. [${issue.rule}] ${issue.message}\n`;
        output += `   Element: ${issue.element.tagName}${issue.element.id ? '#' + issue.element.id : ''}${issue.element.className ? '.' + issue.element.className.split(' ').join('.') : ''}\n`;
      });
      output += '\n';
    }
  });
  
  return output;
}

/**
 * Live accessibility monitoring
 */
export class AccessibilityMonitor {
  private observer: MutationObserver;
  private container: HTMLElement;
  private onIssueFound: (issue: AccessibilityIssue) => void;
  
  constructor(container: HTMLElement = document.body, onIssueFound: (issue: AccessibilityIssue) => void) {
    this.container = container;
    this.onIssueFound = onIssueFound;
    this.observer = new MutationObserver(this.handleMutations.bind(this));
  }
  
  start(): void {
    this.observer.observe(this.container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['alt', 'aria-label', 'aria-labelledby', 'role', 'tabindex']
    });
  }
  
  stop(): void {
    this.observer.disconnect();
  }
  
  private handleMutations(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const issues = this.checkElement(element);
            issues.forEach(issue => this.onIssueFound(issue));
          }
        });
      } else if (mutation.type === 'attributes') {
        const element = mutation.target as HTMLElement;
        const issues = this.checkElement(element);
        issues.forEach(issue => this.onIssueFound(issue));
      }
    });
  }
  
  private checkElement(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Quick checks for common issues
    if (element.tagName === 'IMG' && !element.hasAttribute('alt')) {
      issues.push({
        element,
        type: 'error',
        rule: 'img-alt',
        message: 'Image added without alt text',
        severity: 'serious'
      });
    }
    
    if (element.hasAttribute('onclick') && element.tagName === 'DIV') {
      issues.push({
        element,
        type: 'warning',
        rule: 'semantic-button',
        message: 'DIV with click handler should be a button',
        severity: 'moderate'
      });
    }
    
    return issues;
  }
}