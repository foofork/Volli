/**
 * Volly Client Library
 * 
 * WebRTC client with post-quantum encryption
 */

export { VollyClient } from './client';
export type { 
  VollyClientOptions,
  VollyParticipant,
  VollyMessage 
} from './client';

export {
  // Connection
  connected,
  connecting,
  connectionError,
  connectToRoom,
  disconnectFromRoom,
  
  // Identity
  identity,
  roomName,
  
  // Participants
  participants,
  participantList,
  getParticipant,
  
  // Messages
  messages,
  sendEncryptedMessage,
  sendPublicMessage,
  clearMessages,
  
  // Media
  localAudioEnabled,
  localVideoEnabled,
  localAudioTrack,
  localVideoTrack,
  toggleAudio,
  toggleVideo
} from './stores';