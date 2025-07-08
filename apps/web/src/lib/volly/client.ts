/**
 * VollyClient - WebRTC client with post-quantum encryption
 * 
 * Wraps LiveKit with ML-KEM-768 key exchange and encrypted messaging
 */

import {
  Room,
  RoomEvent,
  DataPacket_Kind,
  RemoteParticipant,
  LocalParticipant,
  Track,
  VideoPresets,
  type RoomOptions,
  type ConnectOptions,
  createLocalTracks
} from 'livekit-client';

import {
  postQuantumEncryption,
  type PostQuantumSession,
  type PostQuantumEncryptedMessage
} from '@volli/messaging';

import type { PublicKey, PrivateKey } from '@volli/identity-core';

export interface VollyParticipant {
  identity: string;
  sid: string;
  publicKey?: PublicKey;
  session?: PostQuantumSession;
  isSpeaking: boolean;
  audioTrack?: Track;
  videoTrack?: Track;
}

export interface VollyMessage {
  id: string;
  from: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
}

export interface VollyClientOptions {
  serverUrl: string;
  enableVideo?: boolean;
  enableAudio?: boolean;
  enableE2EE?: boolean; // Future: LiveKit E2EE
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class VollyClient {
  private room: Room;
  private identity: string = '';
  private keyPair?: { publicKey: PublicKey; privateKey: PrivateKey };
  private participants = new Map<string, VollyParticipant>();
  private sessions = new Map<string, PostQuantumSession>();
  private messageHandlers: ((message: VollyMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private participantHandlers: ((participants: Map<string, VollyParticipant>) => void)[] = [];

  constructor(private options: VollyClientOptions) {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution
      }
    } as RoomOptions);

    this.setupEventHandlers();
  }

  /**
   * Initialize crypto and generate keypair
   */
  async initialize(): Promise<void> {
    // Initialize post-quantum encryption
    await postQuantumEncryption.initialize();
    
    // Generate our keypair
    this.keyPair = await postQuantumEncryption.generateKeyPair();
    if (this.options.logLevel === 'debug') {
      console.warn('🔐 Generated ML-KEM-768 keypair');
    }
  }

  /**
   * Connect to room with post-quantum metadata
   */
  async connect(token: string, identity: string): Promise<void> {
    if (!this.keyPair) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    this.identity = identity;

    // Encode our public key in metadata
    const metadata = JSON.stringify({
      algorithm: 'ML-KEM-768',
      publicKey: Array.from(this.keyPair.publicKey.bytes)
    });

    // Connect to LiveKit room
    await this.room.connect(this.options.serverUrl, token, {
      autoSubscribe: true,
      publishDefaults: {
        simulcast: false // Keep simple for now
      }
    } as ConnectOptions);

    // Set our metadata with public key
    await this.room.localParticipant.setMetadata(metadata);

    // Enable local media if requested
    if (this.options.enableAudio || this.options.enableVideo) {
      const tracks = await createLocalTracks({
        audio: this.options.enableAudio,
        video: this.options.enableVideo
      });
      
      await Promise.all(
        tracks.map(track => this.room.localParticipant.publishTrack(track))
      );
    }

    if (this.options.logLevel === 'debug') {
      console.warn(`✅ Connected to room as ${identity}`);
    }
  }

  /**
   * Send an encrypted message to a participant
   */
  async sendMessage(content: string, recipientIdentity: string): Promise<void> {
    const participant = this.findParticipantByIdentity(recipientIdentity);
    if (!participant || !participant.publicKey) {
      throw new Error(`Participant ${recipientIdentity} not found or has no public key`);
    }

    // Get or establish session
    let session = this.sessions.get(recipientIdentity);
    if (!session || session.expiresAt <= Date.now()) {
      session = await postQuantumEncryption.establishSession(participant.publicKey);
      this.sessions.set(recipientIdentity, session);
    }

    // Encrypt the message
    const encrypted = await postQuantumEncryption.encryptMessage(
      { text: content },
      participant.publicKey,
      session
    );

    // Send via data channel
    const payload = {
      type: 'encrypted_message',
      id: crypto.randomUUID(),
      from: this.identity,
      to: recipientIdentity,
      data: {
        content: Array.from(encrypted.encryptedContent),
        kemCiphertext: Array.from(encrypted.kemCiphertext),
        keyId: encrypted.postQuantumKeyId,
        algorithm: encrypted.encryptionInfo.algorithm,
        nonce: Array.from(encrypted.encryptionInfo.nonce),
        timestamp: Date.now()
      }
    };

    const encoder = new TextEncoder();
    await this.room.localParticipant.publishData(
      encoder.encode(JSON.stringify(payload)),
      DataPacket_Kind.RELIABLE,
      [participant.sid] // Send only to specific participant
    );

    // Log encrypted payload (safe for production)
    if (this.options.logLevel === 'debug') {
      console.warn('📤 Sent encrypted message:', {
        to: recipientIdentity,
        keyId: encrypted.postQuantumKeyId,
        algorithm: encrypted.encryptionInfo.algorithm,
        size: encrypted.encryptedContent.length
      });
    }
  }

  /**
   * Broadcast an unencrypted message to all participants
   */
  async broadcastMessage(content: string): Promise<void> {
    const payload = {
      type: 'public_message',
      id: crypto.randomUUID(),
      from: this.identity,
      content,
      timestamp: Date.now()
    };

    const encoder = new TextEncoder();
    await this.room.localParticipant.publishData(
      encoder.encode(JSON.stringify(payload)),
      DataPacket_Kind.RELIABLE
    );
  }

  /**
   * Handle incoming messages
   */
  onMessage(handler: (message: VollyMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Handle connection state changes
   */
  onConnectionChange(handler: (connected: boolean) => void): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * Handle participant updates
   */
  onParticipantUpdate(handler: (participants: Map<string, VollyParticipant>) => void): void {
    this.participantHandlers.push(handler);
  }

  /**
   * Disconnect from room
   */
  async disconnect(): Promise<void> {
    await this.room.disconnect();
    this.participants.clear();
    this.sessions.clear();
    postQuantumEncryption.clearAllSessions();
  }

  /**
   * Get current participants
   */
  getParticipants(): Map<string, VollyParticipant> {
    return new Map(this.participants);
  }

  /**
   * Get connection state
   */
  isConnected(): boolean {
    return this.room.state === 'connected';
  }

  /**
   * Setup LiveKit event handlers
   */
  private setupEventHandlers(): void {
    // Connection events
    this.room.on(RoomEvent.Connected, () => {
      this.notifyConnectionHandlers(true);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.notifyConnectionHandlers(false);
    });

    // Participant events
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      this.handleParticipantConnected(participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.participants.delete(participant.identity);
      this.sessions.delete(participant.identity);
      this.notifyParticipantHandlers();
    });

    this.room.on(RoomEvent.ParticipantMetadataChanged, (metadata: string | undefined, participant: RemoteParticipant) => {
      if (metadata) {
        this.updateParticipantMetadata(participant, metadata);
      }
    });

    // Data channel events
    this.room.on(RoomEvent.DataReceived, async (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (participant) {
        await this.handleDataReceived(payload, participant);
      }
    });

    // Track events
    this.room.on(RoomEvent.TrackSubscribed, (track: Track, _publication: unknown, participant: RemoteParticipant) => {
      const vollyParticipant = this.participants.get(participant.identity);
      if (vollyParticipant) {
        if (track.kind === 'audio') {
          vollyParticipant.audioTrack = track;
        } else if (track.kind === 'video') {
          vollyParticipant.videoTrack = track;
        }
        this.notifyParticipantHandlers();
      }
    });

    // Speaking events
    this.room.on(RoomEvent.IsSpeakingChanged, (speaking: boolean, participant: LocalParticipant | RemoteParticipant) => {
      const vollyParticipant = this.participants.get(participant.identity);
      if (vollyParticipant) {
        vollyParticipant.isSpeaking = speaking;
        this.notifyParticipantHandlers();
      }
    });
  }

  /**
   * Handle new participant connection
   */
  private handleParticipantConnected(participant: RemoteParticipant): void {
    const vollyParticipant: VollyParticipant = {
      identity: participant.identity,
      sid: participant.sid,
      isSpeaking: false
    };

    this.participants.set(participant.identity, vollyParticipant);

    // Parse metadata if available
    if (participant.metadata) {
      this.updateParticipantMetadata(participant, participant.metadata);
    }

    this.notifyParticipantHandlers();
  }

  /**
   * Update participant metadata (contains public key)
   */
  private updateParticipantMetadata(participant: RemoteParticipant, metadata: string): void {
    try {
      const data = JSON.parse(metadata) as Record<string, unknown>;
      if (data.algorithm === 'ML-KEM-768' && data.publicKey) {
        const vollyParticipant = this.participants.get(participant.identity);
        if (vollyParticipant) {
          vollyParticipant.publicKey = {
            algorithm: 'ML-KEM-768',
            bytes: new Uint8Array(data.publicKey)
          } as PublicKey;
          if (this.options.logLevel === 'debug') {
            console.warn(`🔑 Received public key from ${participant.identity}`);
          }
          this.notifyParticipantHandlers();
        }
      }
    } catch (error) {
      console.warn('Failed to parse participant metadata:', error);
    }
  }

  /**
   * Handle received data
   */
  private async handleDataReceived(payload: Uint8Array, participant: RemoteParticipant): Promise<void> {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(payload)) as Record<string, unknown>;

      if (data.type === 'encrypted_message' && data.to === this.identity) {
        await this.handleEncryptedMessage(data, participant);
      } else if (data.type === 'public_message') {
        this.handlePublicMessage(data, participant);
      }
    } catch (error) {
      console.error('Failed to handle received data:', error);
    }
  }

  /**
   * Handle encrypted message
   */
  private async handleEncryptedMessage(data: Record<string, unknown>, participant: RemoteParticipant): Promise<void> {
    if (!this.keyPair) return;

    try {
      const encrypted: PostQuantumEncryptedMessage = {
        encryptedContent: new Uint8Array(data.data.content),
        kemCiphertext: new Uint8Array(data.data.kemCiphertext),
        postQuantumKeyId: data.data.keyId,
        encryptionInfo: {
          algorithm: data.data.algorithm,
          nonce: new Uint8Array(data.data.nonce),
          keyId: data.data.keyId,
          version: 2
        }
      };

      // Decrypt the message
      const decrypted = await postQuantumEncryption.decryptMessage(
        encrypted,
        this.keyPair.privateKey
      );

      const message: VollyMessage = {
        id: data.id,
        from: participant.identity,
        content: decrypted.text || '',
        timestamp: data.data.timestamp,
        encrypted: true
      };

      this.notifyMessageHandlers(message);

      if (this.options.logLevel === 'debug') {
        console.warn('🔓 Decrypted message from', participant.identity);
      }
    } catch (error) {
      console.error('Failed to decrypt message:', error);
    }
  }

  /**
   * Handle public message
   */
  private handlePublicMessage(data: Record<string, unknown>, participant: RemoteParticipant): void {
    const message: VollyMessage = {
      id: data.id,
      from: participant.identity,
      content: data.content,
      timestamp: data.timestamp,
      encrypted: false
    };

    this.notifyMessageHandlers(message);
  }

  /**
   * Helper to find participant by identity
   */
  private findParticipantByIdentity(identity: string): VollyParticipant | undefined {
    return this.participants.get(identity);
  }

  /**
   * Notify message handlers
   */
  private notifyMessageHandlers(message: VollyMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  /**
   * Notify connection handlers
   */
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  /**
   * Notify participant handlers
   */
  private notifyParticipantHandlers(): void {
    const participants = this.getParticipants();
    this.participantHandlers.forEach(handler => handler(participants));
  }
}