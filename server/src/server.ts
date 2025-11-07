// server/src/server.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { handleConnection } from './handlers/socketHandler';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Handle connections
io.on('connection', (socket) => {
  handleConnection(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`BuildBoard Server listening on port ${PORT}`);
});