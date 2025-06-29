import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Welcome from '../../src/routes/+page.svelte';
import CreateIdentity from '../../src/routes/identity/create/+page.svelte';
import SetupPin from '../../src/routes/identity/setup/+page.svelte';
import { auth } from '../../src/lib/stores/auth';
import { goto } from '$app/navigation';

// Mock navigation
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

// Mock stores
vi.mock('../../src/lib/stores/auth', () => {
  const { writable } = require('svelte/store');
  const authStore = writable({
    isAuthenticated: false,
    currentIdentity: null,
    vaultUnlocked: false,
    sessionToken: null,
    isLoading: false,
    error: null
  });

  return {
    auth: {
      ...authStore,
      createIdentity: vi.fn(),
      createAccount: vi.fn()
    }
  };
});

describe('End-to-End: Simplified Onboarding Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth store
    auth.set({
      isAuthenticated: false,
      currentIdentity: null,
      vaultUnlocked: false,
      sessionToken: null,
      isLoading: false,
      error: null
    });
  });

  describe('Welcome Page', () => {
    it('should display simplified welcome message', () => {
      render(Welcome);
      
      expect(screen.getByText('Welcome to Volly')).toBeInTheDocument();
      expect(screen.getByText(/Universal communication/i)).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      
      // Should not show technical jargon
      expect(screen.queryByText(/vault/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/cryptographic/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/P2P/i)).not.toBeInTheDocument();
    });

    it('should navigate to create identity on button click', async () => {
      render(Welcome);
      
      const createButton = screen.getByText('Create Account');
      await fireEvent.click(createButton);
      
      expect(goto).toHaveBeenCalledWith('/identity/create');
    });
  });

  describe('Create Identity Page', () => {
    it('should display user-friendly form', () => {
      render(CreateIdentity);
      
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
      
      // Should provide helpful context
      expect(screen.getByText(/how others will see you/i)).toBeInTheDocument();
    });

    it('should validate display name', async () => {
      render(CreateIdentity);
      
      const input = screen.getByLabelText(/display name/i);
      const button = screen.getByText('Continue');
      
      // Too short
      await fireEvent.input(input, { target: { value: 'Jo' } });
      await fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      });
      
      // Too long
      await fireEvent.input(input, { target: { value: 'A'.repeat(31) } });
      await fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/maximum 30 characters/i)).toBeInTheDocument();
      });
    });

    it('should create identity and navigate to PIN setup', async () => {
      auth.createIdentity.mockResolvedValue({
        identity: {
          id: 'test-id',
          displayName: 'John Doe',
          publicKey: null,
          encryptedPrivateKey: null,
          createdAt: Date.now()
        },
        requiresVaultCreation: true
      });
      
      render(CreateIdentity);
      
      const input = screen.getByLabelText(/display name/i);
      const button = screen.getByText('Continue');
      
      await fireEvent.input(input, { target: { value: 'John Doe' } });
      await fireEvent.click(button);
      
      await waitFor(() => {
        expect(auth.createIdentity).toHaveBeenCalledWith('John Doe');
        expect(goto).toHaveBeenCalledWith('/identity/setup');
      });
    });
  });

  describe('PIN Setup Page', () => {
    beforeEach(() => {
      // Set up identity in store
      auth.set({
        isAuthenticated: false,
        currentIdentity: {
          id: 'test-id',
          displayName: 'John Doe',
          publicKey: null,
          encryptedPrivateKey: null,
          createdAt: Date.now()
        },
        vaultUnlocked: false,
        sessionToken: null,
        isLoading: false,
        error: null
      });
    });

    it('should display PIN input component', () => {
      render(SetupPin);
      
      expect(screen.getByText(/secure.*6-digit PIN/i)).toBeInTheDocument();
      expect(screen.getAllByLabelText(/Digit \d of 6/)).toHaveLength(6);
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    it('should handle PIN input correctly', async () => {
      render(SetupPin);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      
      // Type PIN digit by digit
      for (let i = 0; i < 6; i++) {
        await fireEvent.input(inputs[i], { target: { value: String(i + 1) } });
      }
      
      // Should auto-focus next input
      await waitFor(() => {
        expect(inputs[5]).toHaveFocus();
      });
    });

    it('should validate PIN before submission', async () => {
      render(SetupPin);
      
      const button = screen.getByText('Create Account');
      
      // Try to submit without PIN
      await fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/enter.*6-digit PIN/i)).toBeInTheDocument();
      });
    });

    it('should complete onboarding successfully', async () => {
      auth.createAccount.mockResolvedValue(undefined);
      
      render(SetupPin);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      const button = screen.getByText('Create Account');
      
      // Enter PIN
      for (let i = 0; i < 6; i++) {
        await fireEvent.input(inputs[i], { target: { value: '1' } });
      }
      
      await fireEvent.click(button);
      
      await waitFor(() => {
        expect(auth.createAccount).toHaveBeenCalledWith('111111');
        expect(goto).toHaveBeenCalledWith('/app');
      });
    });

    it('should show user-friendly error messages', async () => {
      auth.createAccount.mockRejectedValue(new Error('Network error'));
      
      render(SetupPin);
      
      const inputs = screen.getAllByLabelText(/Digit \d of 6/);
      const button = screen.getByText('Create Account');
      
      // Enter PIN
      for (let i = 0; i < 6; i++) {
        await fireEvent.input(inputs[i], { target: { value: '1' } });
      }
      
      await fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/couldn't create.*account/i)).toBeInTheDocument();
        expect(screen.queryByText(/Network error/)).not.toBeInTheDocument(); // Hide technical details
      });
    });
  });

  describe('Complete Flow Integration', () => {
    it('should complete entire onboarding flow', async () => {
      // Mock successful responses
      auth.createIdentity.mockResolvedValue({
        identity: {
          id: 'test-id',
          displayName: 'Alice',
          publicKey: null,
          encryptedPrivateKey: null,
          createdAt: Date.now()
        },
        requiresVaultCreation: true
      });
      
      auth.createAccount.mockResolvedValue(undefined);
      
      // Start at welcome
      const { unmount: unmountWelcome } = render(Welcome);
      
      const createButton = screen.getByText('Create Account');
      await fireEvent.click(createButton);
      
      expect(goto).toHaveBeenCalledWith('/identity/create');
      unmountWelcome();
      
      // Create identity
      const { unmount: unmountCreate } = render(CreateIdentity);
      
      const nameInput = screen.getByLabelText(/display name/i);
      await fireEvent.input(nameInput, { target: { value: 'Alice' } });
      await fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(auth.createIdentity).toHaveBeenCalledWith('Alice');
        expect(goto).toHaveBeenCalledWith('/identity/setup');
      });
      
      // Update store with created identity
      auth.set({
        isAuthenticated: false,
        currentIdentity: {
          id: 'test-id',
          displayName: 'Alice',
          publicKey: null,
          encryptedPrivateKey: null,
          createdAt: Date.now()
        },
        vaultUnlocked: false,
        sessionToken: null,
        isLoading: false,
        error: null
      });
      
      unmountCreate();
      
      // Setup PIN
      render(SetupPin);
      
      const pinInputs = screen.getAllByLabelText(/Digit \d of 6/);
      for (let i = 0; i < 6; i++) {
        await fireEvent.input(pinInputs[i], { target: { value: '1' } });
      }
      
      await fireEvent.click(screen.getByText('Create Account'));
      
      await waitFor(() => {
        expect(auth.createAccount).toHaveBeenCalledWith('111111');
        expect(goto).toHaveBeenCalledWith('/app');
      });
    });
  });
});