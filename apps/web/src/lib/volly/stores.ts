/**
 * Svelte stores for Volly client state management
 */

import { writable, derived, get } from 'svelte/store';
import { VollyClient, type VollyParticipant, type VollyMessage } from './client';
import type { Track } from 'livekit-client';

// Connection state
export const connected = writable<boolean>(false);
export const connecting = writable<boolean>(false);
export const connectionError = writable<string | null>(null);

// User identity
export const identity = writable<string>('');
export const roomName = writable<string>('');

// Participants
export const participants = writable<Map<string, VollyParticipant>>(new Map());

// Derived store for participant list (easier to use in Svelte)
export const participantList = derived(participants, $participants => 
  Array.from($participants.values())
);

// Messages
export const messages = writable<VollyMessage[]>([]);

// Media state
export const localAudioEnabled = writable<boolean>(true);
export const localVideoEnabled = writable<boolean>(false);
export const localAudioTrack = writable<Track | null>(null);
export const localVideoTrack = writable<Track | null>(null);

// Client instance (not reactive, just for storage)
let clientInstance: VollyClient | null = null;

/**
 * Initialize and connect to a room
 */
export async function connectToRoom(
  serverUrl: string,
  token: string,
  userIdentity: string,
  room: string,
  options: {
    enableVideo?: boolean;
    enableAudio?: boolean;
  } = {}
): Promise<void> {
  if (clientInstance) {
    await disconnectFromRoom();
  }

  connecting.set(true);
  connectionError.set(null);

  try {
    // Create client
    clientInstance = new VollyClient({
      serverUrl,
      enableVideo: options.enableVideo,
      enableAudio: options.enableAudio,
      logLevel: 'debug'
    });

    // Set up event handlers
    clientInstance.onConnectionChange((isConnected) => {
      connected.set(isConnected);
      if (!isConnected) {
        participants.set(new Map());
      }
    });

    clientInstance.onParticipantUpdate((updatedParticipants) => {
      participants.set(updatedParticipants);
    });

    clientInstance.onMessage((message) => {
      messages.update(msgs => [...msgs, message]);
    });

    // Initialize crypto
    await clientInstance.initialize();

    // Connect
    await clientInstance.connect(token, userIdentity);

    // Update stores
    identity.set(userIdentity);
    roomName.set(room);
    localAudioEnabled.set(options.enableAudio ?? true);
    localVideoEnabled.set(options.enableVideo ?? false);

  } catch (error) {
    console.error('Connection failed:', error);
    connectionError.set(error instanceof Error ? error.message : 'Connection failed');
    throw error;
  } finally {
    connecting.set(false);
  }
}

/**
 * Send an encrypted message to a participant
 */
export async function sendEncryptedMessage(content: string, recipientIdentity: string): Promise<void> {
  if (!clientInstance || !get(connected)) {
    throw new Error('Not connected');
  }

  await clientInstance.sendMessage(content, recipientIdentity);
}

/**
 * Send a public message to all participants
 */
export async function sendPublicMessage(content: string): Promise<void> {
  if (!clientInstance || !get(connected)) {
    throw new Error('Not connected');
  }

  await clientInstance.broadcastMessage(content);
  
  // Add to our own message list
  messages.update(msgs => [...msgs, {
    id: crypto.randomUUID(),
    from: get(identity),
    content,
    timestamp: Date.now(),
    encrypted: false
  }]);
}

/**
 * Toggle local audio
 */
export async function toggleAudio(): Promise<boolean> {
  const enabled = !get(localAudioEnabled);
  localAudioEnabled.set(enabled);
  
  // TODO: Implement actual track muting
  // if (clientInstance) {
  //   await clientInstance.setAudioEnabled(enabled);
  // }
  
  return enabled;
}

/**
 * Toggle local video
 */
export async function toggleVideo(): Promise<boolean> {
  const enabled = !get(localVideoEnabled);
  localVideoEnabled.set(enabled);
  
  // TODO: Implement actual track enable/disable
  // if (clientInstance) {
  //   await clientInstance.setVideoEnabled(enabled);
  // }
  
  return enabled;
}

/**
 * Disconnect from room
 */
export async function disconnectFromRoom(): Promise<void> {
  if (clientInstance) {
    await clientInstance.disconnect();
    clientInstance = null;
  }

  // Reset all stores
  connected.set(false);
  connecting.set(false);
  connectionError.set(null);
  identity.set('');
  roomName.set('');
  participants.set(new Map());
  messages.set([]);
  localAudioEnabled.set(true);
  localVideoEnabled.set(false);
  localAudioTrack.set(null);
  localVideoTrack.set(null);
}

/**
 * Clear message history
 */
export function clearMessages(): void {
  messages.set([]);
}

/**
 * Get participant by identity
 */
export function getParticipant(identity: string): VollyParticipant | undefined {
  return get(participants).get(identity);
}