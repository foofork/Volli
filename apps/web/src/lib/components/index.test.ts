import { describe, it, expect } from 'vitest';
import * as exports from './index';
import PassphraseInput from './PassphraseInput.svelte';

describe('Component Exports', () => {
  it('should export PassphraseInput component', () => {
    expect(exports.PassphraseInput).toBeDefined();
    expect(exports.PassphraseInput).toBe(PassphraseInput);
  });
});