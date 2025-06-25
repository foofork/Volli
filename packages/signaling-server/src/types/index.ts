export interface SignalingMessage {
  type: string;
}

export interface RegisterMessage extends SignalingMessage {
  type: 'register';
  userId: string;
  publicKey: string;
}

export interface DiscoverMessage extends SignalingMessage {
  type: 'discover';
  userId: string;
}

export interface OfferMessage extends SignalingMessage {
  type: 'offer';
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerMessage extends SignalingMessage {
  type: 'answer';
  from: string;
  to: string;
  answer: RTCSessionDescriptionInit;
}

export interface ErrorMessage extends SignalingMessage {
  type: 'error';
  message: string;
}

export interface RegisteredMessage extends SignalingMessage {
  type: 'registered';
  success: boolean;
  userId: string;
}

export interface DiscoverResponseMessage extends SignalingMessage {
  type: 'discover-response';
  userId: string;
  online: boolean;
  publicKey?: string;
}

import type { WebSocket } from 'ws';

export interface UserInfo {
  userId: string;
  publicKey: string;
  ws: WebSocket;
}

export interface SignalingServerOptions {
  port: number;
  host?: string;
}