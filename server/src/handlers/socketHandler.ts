// server/src/handlers/socketHandler.ts
import { Socket, Server } from 'socket.io';
import { Stroke, DrawEventPayload, StartStrokePayload, Point } from '../types';

// In-memory store for the current canvas state.
// In a production app, this would be a database (Redis/Postgres).
const strokes: Stroke[] = [];
const activeStrokes: Map<string, Stroke> = new Map();

export const handleConnection = (io: Server, socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Send current canvas state to the newly connected user
  // This ensures they see what has already been drawn
  socket.emit('canvas_state', strokes);

  // 2. Handle the start of a new stroke
  socket.on('start_stroke', (payload: StartStrokePayload) => {
    const newStroke: Stroke = {
      id: payload.strokeId,
      userId: socket.id,
      color: payload.color,
      points: [],
    };
    
    activeStrokes.set(payload.strokeId, newStroke);
    
    // Broadcast to others that a user started drawing (optional, mainly for UX like cursors)
    // For this implementation, we focus on the actual drawing data.
  });

  // 3. Handle real-time drawing points
  socket.on('draw_point', (payload: DrawEventPayload) => {
    const { strokeId, point } = payload;

    // Update the active stroke in memory
    const stroke = activeStrokes.get(strokeId);
    if (stroke) {
      stroke.points.push(point);
    }

    // Broadcast the point to all OTHER clients immediately
    socket.broadcast.emit('draw_point', payload);
  });

  // 4. Handle the end of a stroke
  socket.on('stop_stroke', (strokeId: string) => {
    const finishedStroke = activeStrokes.get(strokeId);
    
    if (finishedStroke) {
      // Save to persistent history
      strokes.push(finishedStroke);
      activeStrokes.delete(strokeId);
      
      // Notify others that the stroke is finalized (so they can optimize rendering if needed)
      socket.broadcast.emit('stroke_finalized', strokeId);
    }
  });

  // 5. Handle clearing the canvas
  socket.on('clear_canvas', () => {
    strokes.length = 0; // Clear memory
    activeStrokes.clear();
    io.emit('canvas_cleared'); // Notify all users
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Clean up any unfinished strokes by this user if necessary
  });
};