import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { IdentityManager } from './identity-manager';
import { initCrypto, generateKeyPair } from './crypto';
import { TrustLevel } from './types';

describe('IdentityManager', () => {
  let identityManager: IdentityManager;

  beforeAll(async () => {
    // Initialize crypto before running tests
    await initCrypto();
  });

  beforeEach(() => {
    identityManager = new IdentityManager();
  });

  describe('createIdentity', () => {
    it('should create a new identity with valid structure', async () => {
      const identity = await identityManager.createIdentity('Primary Device');
      
      expect(identity).toBeDefined();
      expect(identity.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(identity.publicKey).toBeDefined();
      expect(identity.publicKey.x25519).toBeInstanceOf(Uint8Array);
      expect(identity.publicKey.ed25519).toBeInstanceOf(Uint8Array);
      expect(identity.deviceKeys).toHaveLength(1);
      expect(identity.deviceKeys[0].name).toBe('Primary Device');
      expect(identity.createdAt).toBeGreaterThan(0);
      expect(identity.metadata).toBeDefined();
    });

    it('should generate unique identities', async () => {
      const identity1 = await identityManager.createIdentity();
      const identity2 = await identityManager.createIdentity();
      
      expect(identity1.id).not.toBe(identity2.id);
      expect(identity1.publicKey.x25519).not.toEqual(identity2.publicKey.x25519);
      expect(identity1.publicKey.ed25519).not.toEqual(identity2.publicKey.ed25519);
    });
  });

  describe('addDevice', () => {
    it('should add a device to identity', async () => {
      const identity = await identityManager.createIdentity();
      const { publicKey } = await generateKeyPair();
      
      const updatedIdentity = await identityManager.addDevice(
        identity.id,
        'Test Device',
        publicKey,
        TrustLevel.DEVICE
      );
      
      expect(updatedIdentity.deviceKeys).toHaveLength(2); // Primary + new device
      expect(updatedIdentity.deviceKeys[1].name).toBe('Test Device');
      expect(updatedIdentity.deviceKeys[1].trustLevel).toBe(TrustLevel.DEVICE);
    });

    it('should not add duplicate devices', async () => {
      const identity = await identityManager.createIdentity();
      const { publicKey } = await generateKeyPair();
      
      await identityManager.addDevice(identity.id, 'Test Device', publicKey);
      
      await expect(
        identityManager.addDevice(identity.id, 'Test Device 2', publicKey)
      ).rejects.toThrow('Device already exists in identity');
    });

    it('should update existing device', async () => {
      const identity = await identityManager.createIdentity();
      const { publicKey } = await generateKeyPair();
      
      const updatedIdentity1 = await identityManager.addDevice(
        identity.id,
        'Test Device',
        publicKey
      );
      
      const deviceId = updatedIdentity1.deviceKeys[1].id;
      const updatedIdentity2 = identityManager.updateDeviceTrustLevel(
        identity.id,
        deviceId,
        TrustLevel.VERIFIED
      );
      
      expect(updatedIdentity2.deviceKeys).toHaveLength(2);
      expect(updatedIdentity2.deviceKeys[1].trustLevel).toBe(TrustLevel.VERIFIED);
    });
  });

  describe('removeDevice', () => {
    it('should remove device from identity', async () => {
      const identity = await identityManager.createIdentity();
      const { publicKey } = await generateKeyPair();
      
      const updatedIdentity1 = await identityManager.addDevice(
        identity.id,
        'Test Device',
        publicKey
      );
      
      expect(updatedIdentity1.deviceKeys).toHaveLength(2);
      
      const deviceId = updatedIdentity1.deviceKeys[1].id;
      const updatedIdentity2 = identityManager.removeDevice(identity.id, deviceId);
      
      expect(updatedIdentity2.deviceKeys).toHaveLength(1);
      expect(updatedIdentity2.deviceKeys[0].name).toBe('Primary Device');
    });

    it('should handle removing non-existent device', async () => {
      const identity = await identityManager.createIdentity();
      const { publicKey } = await generateKeyPair();
      
      // Add a second device first so we can try to remove a non-existent one
      await identityManager.addDevice(identity.id, 'Second Device', publicKey);
      
      expect(() => {
        identityManager.removeDevice(identity.id, 'non-existent-device');
      }).toThrow('Device not found in identity');
    });
  });

  describe('rotateKeys', () => {
    it('should generate new keys for identity', async () => {
      const identity = await identityManager.createIdentity();
      const originalPublicKey = identity.publicKey;
      
      const updatedIdentity = await identityManager.rotateKeys(identity.id);
      
      expect(updatedIdentity.publicKey).not.toEqual(originalPublicKey);
      expect(updatedIdentity.deviceKeys.length).toBeGreaterThan(identity.deviceKeys.length);
    });
  });

  describe('exportIdentity and importIdentity', () => {
    it('should export and import identity correctly', async () => {
      const identity = await identityManager.createIdentity('Test Device');
      const password = 'test-password-123';
      
      const backup = await identityManager.exportIdentity(identity.id, password);
      expect(backup).toBeDefined();
      expect(backup.encryptedData).toBeInstanceOf(Uint8Array);
      expect(backup.params.salt).toBeInstanceOf(Uint8Array);
      
      const importedIdentity = await identityManager.importIdentity(backup, password);
      expect(importedIdentity.publicKey.x25519).toEqual(identity.publicKey.x25519);
      expect(importedIdentity.publicKey.ed25519).toEqual(identity.publicKey.ed25519);
    });

    it('should fail import with wrong password', async () => {
      const identity = await identityManager.createIdentity();
      const backup = await identityManager.exportIdentity(identity.id, 'correct-password');
      
      await expect(
        identityManager.importIdentity(backup, 'wrong-password')
      ).rejects.toThrow();
    });
  });

  describe('validateDevice', () => {
    it('should validate device signature', async () => {
      const identity = await identityManager.createIdentity();
      const data = new TextEncoder().encode('test data');
      
      // Sign data with identity
      const signature = await identityManager.signWithIdentity(identity.id, data);
      
      // Validate signature
      const deviceId = identity.deviceKeys[0].id;
      const isValid = await identityManager.validateDevice(
        identity.id,
        deviceId,
        data,
        signature
      );
      
      expect(isValid).toBe(true);
    });
  });
});