import { WebSocketServer, WebSocket } from 'ws';
import type {
  SignalingServerOptions,
  UserInfo,
  SignalingMessage,
  RegisterMessage,
  DiscoverMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  RegisteredMessage,
  DiscoverResponseMessage,
  ErrorMessage
} from './types/index.js';

export class SignalingServer {
  private wss?: WebSocketServer;
  private users: Map<string, UserInfo> = new Map();
  private wsToUserId: Map<WebSocket, string> = new Map();
  private options: SignalingServerOptions;

  constructor(options: SignalingServerOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.wss = new WebSocketServer({
        port: this.options.port,
        host: this.options.host || 'localhost'
      });

      this.wss.on('connection', (ws: WebSocket) => {
        this.handleConnection(ws);
      });

      this.wss.on('listening', () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wss) {
        resolve();
        return;
      }

      // Close all client connections
      this.users.forEach((userInfo) => {
        if (userInfo.ws.readyState === WebSocket.OPEN) {
          userInfo.ws.close();
        }
      });

      this.wss.close((err?: Error) => {
        if (err) {
          reject(err);
        } else {
          this.users.clear();
          this.wsToUserId.clear();
          resolve();
        }
      });
    });
  }

  getOnlineUsers(): number {
    return this.users.size;
  }

  private handleConnection(ws: WebSocket): void {
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnect(ws);
    });
  }

  private handleMessage(ws: WebSocket, data: Buffer): void {
    let message: SignalingMessage;

    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      this.sendError(ws, 'Invalid message format');
      return;
    }

    switch (message.type) {
      case 'register':
        this.handleRegister(ws, message as RegisterMessage);
        break;
      case 'discover':
        this.handleDiscover(ws, message as DiscoverMessage);
        break;
      case 'offer':
        this.handleOffer(ws, message as OfferMessage);
        break;
      case 'answer':
        this.handleAnswer(ws, message as AnswerMessage);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(ws, message as IceCandidateMessage);
        break;
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  private handleRegister(ws: WebSocket, message: RegisterMessage): void {
    // Validate required fields
    if (!message.userId || !message.publicKey) {
      this.sendError(ws, 'Missing required fields');
      return;
    }

    // Update or create user registration
    const existingUser = this.users.get(message.userId);
    if (existingUser) {
      // Update existing user
      existingUser.publicKey = message.publicKey;
      existingUser.ws = ws;
    } else {
      // Register new user
      this.users.set(message.userId, {
        userId: message.userId,
        publicKey: message.publicKey,
        ws
      });
    }

    // Track WebSocket to userId mapping
    this.wsToUserId.set(ws, message.userId);

    // Send success response
    const response: RegisteredMessage = {
      type: 'registered',
      success: true,
      userId: message.userId
    };
    ws.send(JSON.stringify(response));
  }

  private handleDiscover(ws: WebSocket, message: DiscoverMessage): void {
    // Validate required fields
    if (!message.userId) {
      this.sendError(ws, 'Missing required fields');
      return;
    }

    const user = this.users.get(message.userId);
    
    const response: DiscoverResponseMessage = {
      type: 'discover-response',
      userId: message.userId,
      online: !!user,
      ...(user && { publicKey: user.publicKey })
    };

    ws.send(JSON.stringify(response));
  }

  private handleOffer(ws: WebSocket, message: OfferMessage): void {
    // Validate required fields
    if (!message.from || !message.to || !message.offer) {
      this.sendError(ws, 'Missing required fields');
      return;
    }

    const targetUser = this.users.get(message.to);
    
    if (!targetUser) {
      this.sendError(ws, `User ${message.to} is not online`);
      return;
    }

    // Relay the offer to the target user
    targetUser.ws.send(JSON.stringify(message));
  }

  private handleAnswer(ws: WebSocket, message: AnswerMessage): void {
    // Validate required fields
    if (!message.from || !message.to || !message.answer) {
      this.sendError(ws, 'Missing required fields');
      return;
    }

    const targetUser = this.users.get(message.to);
    
    if (!targetUser) {
      this.sendError(ws, `User ${message.to} is not online`);
      return;
    }

    // Relay the answer to the target user
    targetUser.ws.send(JSON.stringify(message));
  }

  private handleIceCandidate(ws: WebSocket, message: IceCandidateMessage): void {
    // Validate required fields
    if (!message.from || !message.to || !message.candidate) {
      this.sendError(ws, 'Missing required fields');
      return;
    }

    const targetUser = this.users.get(message.to);
    
    if (!targetUser) {
      this.sendError(ws, `User ${message.to} is not online`);
      return;
    }

    // Relay the ICE candidate to the target user
    targetUser.ws.send(JSON.stringify(message));
  }

  private handleDisconnect(ws: WebSocket): void {
    const userId = this.wsToUserId.get(ws);
    
    if (userId) {
      this.users.delete(userId);
      this.wsToUserId.delete(ws);
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    const error: ErrorMessage = {
      type: 'error',
      message
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(error));
    }
  }
}