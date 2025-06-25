#!/usr/bin/env node
import { SignalingServer } from './SignalingServer.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  const server = new SignalingServer({
    port: PORT,
    host: HOST
  });

  try {
    await server.start();
    console.log(`✅ Signaling server started on ${HOST}:${PORT}`);
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('📴 SIGTERM received, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('📴 SIGINT received, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
    // Log server stats periodically
    setInterval(() => {
      const onlineUsers = server.getOnlineUsers();
      console.log(`📊 Online users: ${onlineUsers}`);
    }, 60000); // Every minute
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();