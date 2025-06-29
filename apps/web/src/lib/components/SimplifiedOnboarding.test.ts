/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import SimplifiedOnboarding from './SimplifiedOnboarding.svelte';
import { auth } from '$lib/stores/auth';

// Mock the auth store
vi.mock('$lib/stores/auth', () => ({
  auth: {
    createIdentity: vi.fn(),
    createAccount: vi.fn(), // Note: renamed from createVaultWithPassphrase
    subscribe: vi.fn(() => () => {}),
    initialize: vi.fn(),
  }
}));

// Mock goto function
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

// Mock toasts store
vi.mock('$lib/stores/toasts', () => ({
  toasts: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('SimplifiedOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the DOM between tests
    document.body.innerHTML = '';
  });

  describe('Terminology', () => {
    it('should not use "vault" terminology anywhere', async () => {
      const { container } = render(SimplifiedOnboarding);
      
      // Check that "vault" doesn't appear in the UI
      expect(container.textContent?.toLowerCase()).not.toContain('vault');
    });

    it('should use "account" terminology instead of vault', async () => {
      render(SimplifiedOnboarding);
      
      // Navigate to PIN step to see "account" terminology
      const nameInput = screen.getByPlaceholderText(/your name/i);
      await fireEvent.input(nameInput, { target: { value: 'Test' } });
      
      const nextButton = screen.getByText(/continue/i);
      await fireEvent.click(nextButton);
      
      // Should use "account" terminology in PIN step
      expect(screen.getByText(/6 digits to secure your account/i)).toBeInTheDocument();
    });

    it('should use simple language, not technical jargon', async () => {
      const { container } = render(SimplifiedOnboarding);
      
      // Should avoid technical terms
      expect(container.textContent?.toLowerCase()).not.toContain('cryptographic');
      expect(container.textContent?.toLowerCase()).not.toContain('encryption');
      expect(container.textContent?.toLowerCase()).not.toContain('post-quantum');
    });
  });

  describe('PIN Input', () => {
    it('should require exactly 6 digits for PIN', async () => {
      render(SimplifiedOnboarding);
      
      // Use the first name input if there are multiple
      const nameInputs = screen.getAllByPlaceholderText(/your name/i);
      const nameInput = nameInputs[0];
      await fireEvent.input(nameInput, { target: { value: 'Test User' } });
      
      const nextButton = screen.getByText(/continue/i);
      await fireEvent.click(nextButton);
      
      // Should show PIN input
      const pinInput = document.getElementById('pin-input');
      expect(pinInput).toBeInTheDocument();
      expect(pinInput).toHaveAttribute('maxlength', '6');
      expect(pinInput).toHaveAttribute('pattern', '[0-9]{6}');
    });

    it('should not allow PIN submission with less than 6 digits', async () => {
      render(SimplifiedOnboarding);
      
      // Navigate to PIN step
      const nameInput = screen.getByPlaceholderText(/your name/i);
      await fireEvent.input(nameInput, { target: { value: 'Test User' } });
      
      const nextButton = screen.getByText(/continue/i);
      await fireEvent.click(nextButton);
      
      // Enter incomplete PIN
      const pinInput = screen.getByLabelText(/pin/i);
      await fireEvent.input(pinInput, { target: { value: '123' } });
      
      const createButton = screen.getByText(/create account/i);
      expect(createButton).toBeDisabled();
    });
  });

  describe('30-second Setup Target', () => {
    it('should have minimal steps for quick setup', async () => {
      render(SimplifiedOnboarding);
      
      // Step 1: Name input should be visible immediately
      expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
      
      // Step 2: Continue to PIN
      const nameInput = screen.getByPlaceholderText(/your name/i);
      await fireEvent.input(nameInput, { target: { value: 'Test' } });
      
      const nextButton = screen.getByText(/continue/i);
      await fireEvent.click(nextButton);
      
      // Step 3: PIN input appears
      expect(screen.getByLabelText(/pin/i)).toBeInTheDocument();
      
      // Only 2 steps total for 30-second target
    });

    it('should auto-focus name input for immediate typing', async () => {
      render(SimplifiedOnboarding);
      
      const nameInput = screen.getByPlaceholderText(/your name/i);
      expect(nameInput).toHaveFocus();
    });
  });

  describe('Identity Auto-generation', () => {
    it('should hide technical details about identity generation', async () => {
      const { container } = render(SimplifiedOnboarding);
      
      // Should not show technical details
      expect(container.textContent?.toLowerCase()).not.toContain('key');
      expect(container.textContent?.toLowerCase()).not.toContain('generate');
      expect(container.textContent?.toLowerCase()).not.toContain('algorithm');
    });

    it('should call createIdentity and createAccount in sequence', async () => {
      render(SimplifiedOnboarding);
      
      // Fill in name
      const nameInput = screen.getByPlaceholderText(/your name/i);
      await fireEvent.input(nameInput, { target: { value: 'Test User' } });
      
      const nextButton = screen.getByText(/continue/i);
      await fireEvent.click(nextButton);
      
      // Fill in PIN
      const pinInput = screen.getByLabelText(/pin/i);
      await fireEvent.input(pinInput, { target: { value: '123456' } });
      
      const createButton = screen.getByText(/create account/i);
      await fireEvent.click(createButton);
      
      // Should call both methods
      expect(auth.createIdentity).toHaveBeenCalledWith('Test User');
      expect(auth.createAccount).toHaveBeenCalledWith('123456');
    });
  });

  describe('User Experience', () => {
    it('should show progress through the flow', async () => {
      render(SimplifiedOnboarding);
      
      // Step 1 indicator
      expect(screen.getByText(/choose your name/i)).toBeInTheDocument();
      
      // Navigate to step 2
      const nameInput = screen.getByPlaceholderText(/your name/i);
      await fireEvent.input(nameInput, { target: { value: 'Test' } });
      
      const nextButton = screen.getByText(/continue/i);
      await fireEvent.click(nextButton);
      
      // Step 2 indicator
      expect(screen.getByText(/create a pin/i)).toBeInTheDocument();
    });

    it('should provide helpful instructions without technical details', async () => {
      render(SimplifiedOnboarding);
      
      // Should have helpful, simple instructions
      expect(screen.getByText(/choose your name/i)).toBeInTheDocument();
      
      // Navigate to PIN step
      const nameInput = screen.getByPlaceholderText(/your name/i);
      await fireEvent.input(nameInput, { target: { value: 'Test' } });
      
      const nextButton = screen.getByText(/continue/i);
      await fireEvent.click(nextButton);
      
      // Should have simple PIN instructions
      expect(screen.getByText(/create a pin/i)).toBeInTheDocument();
      expect(screen.getByText(/6 digits/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show friendly error messages', async () => {
      vi.mocked(auth.createAccount).mockRejectedValue(new Error('Network error'));
      
      render(SimplifiedOnboarding);
      
      // Complete the flow
      const nameInput = screen.getByPlaceholderText(/your name/i);
      await fireEvent.input(nameInput, { target: { value: 'Test User' } });
      
      const nextButton = screen.getByText(/continue/i);
      await fireEvent.click(nextButton);
      
      const pinInput = screen.getByLabelText(/pin/i);
      await fireEvent.input(pinInput, { target: { value: '123456' } });
      
      const createButton = screen.getByText(/create account/i);
      await fireEvent.click(createButton);
      
      // Should show user-friendly error
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });
});