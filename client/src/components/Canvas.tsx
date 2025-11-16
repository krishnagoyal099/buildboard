// client/src/components/Canvas.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Stroke, Point, DrawEventPayload } from '../types';
import { getSvgPathFromPoints, drawPath } from '../utils/drawing';

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;

const Canvas: React.FC = () => {
  // Refs for the two canvases
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for contexts (initialized once)
  const staticCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dynamicCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // Socket and State
  const socketRef = useRef<Socket | null>(null);
  const [color, setColor] = useState<string>('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Local state for the stroke currently being drawn
  const currentStrokeRef = useRef<Stroke | null>(null);

  // --- Initialization ---
  useEffect(() => {
    // Initialize Contexts
    if (staticCanvasRef.current) {
      staticCtxRef.current = staticCanvasRef.current.getContext('2d');
    }
    if (dynamicCanvasRef.current) {
      dynamicCtxRef.current = dynamicCanvasRef.current.getContext('2d');
    }

    // Initialize Socket
    socketRef.current = io('http://localhost:3001');

    // Listen for initial state (history)
    socketRef.current.on('canvas_state', (strokes: Stroke[]) => {
      renderAllStrokes(strokes);
    });

    // Listen for real-time points from others
    socketRef.current.on('draw_point', (payload: DrawEventPayload) => {
      handleRemoteDraw(payload);
    });

    // Listen for stroke completion to move it to static canvas
    socketRef.current.on('stroke_finalized', (strokeId: string) => {
      // Note: In a real app, you'd manage a global strokes array in a store.
      // For this step, we rely on the 'canvas_state' reload or specific tracking.
      // We will implement the global store in the next step for clean architecture.
    });
    
    socketRef.current.on('canvas_cleared', () => {
        clearCanvas(true);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // --- Rendering Helpers ---

  // Renders the finished strokes onto the static canvas
  const renderAllStrokes = (strokes: Stroke[]) => {
    const ctx = staticCtxRef.current;
    if (!ctx) return;

    // Clear static canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    strokes.forEach((stroke) => {
      const pathData = getSvgPathFromPoints(stroke.points);
      if (pathData) {
        drawPath(ctx, pathData, stroke.color);
      }
    });
  };

  // Render the current active stroke (local or remote) on dynamic canvas
  const renderDynamicStroke = (stroke: Stroke) => {
    const ctx = dynamicCtxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (stroke.points.length > 0) {
      const pathData = getSvgPathFromPoints(stroke.points);
      if (pathData) {
        drawPath(ctx, pathData, stroke.color);
      }
    }
  };

  // Handle incoming remote data
  const handleRemoteDraw = (payload: DrawEventPayload) => {
    // We need a temporary store for remote strokes in progress. 
    // For simplicity in this step, we will implement a global store in Step 4.
    // Currently, this renders immediately to the dynamic canvas.
    // Note: This logic will be refined in Step 4 with a proper Store.
    
    // Temporary hack for Step 3: Just draw the incoming point on dynamic canvas
    // In Step 4, we will aggregate points into a proper state array.
    const ctx = dynamicCtxRef.current;
    if(!ctx) return;
    
    // We can't aggregate without state, so for now we just render the point as a dot
    // OR we wait for Step 4. Let's render a small dot for visual feedback for now.
    ctx.fillStyle = payload.color;
    ctx.beginPath();
    ctx.arc(payload.point[0], payload.point[1], 4, 0, Math.PI * 2);
    ctx.fill();
  };

  // --- Event Handlers ---

  const startDrawing = (e: React.PointerEvent) => {
    const { clientX, clientY, pressure } = e;
    const point: Point = [clientX, clientY, pressure];

    const newStroke: Stroke = {
      id: `stroke-${Date.now()}`,
      points: [point],
      color: color,
      userId: 'self',
    };

    currentStrokeRef.current = newStroke;
    setIsDrawing(true);

    // Emit start event
    socketRef.current?.emit('start_stroke', {
      strokeId: newStroke.id,
      color: newStroke.color,
      userId: 'self',
    });

    renderDynamicStroke(newStroke);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStrokeRef.current) return;

    const { clientX, clientY, pressure } = e;
    const point: Point = [clientX, clientY, pressure];

    // Update local ref
    currentStrokeRef.current.points.push(point);

    // Emit point to server
    socketRef.current?.emit('draw_point', {
      strokeId: currentStrokeRef.current.id,
      point: point,
      color: currentStrokeRef.current.color,
    });

    // Render locally
    renderDynamicStroke(currentStrokeRef.current);
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentStrokeRef.current) return;

    // Finalize stroke
    const finishedStroke = currentStrokeRef.current;
    
    // Draw to static canvas permanently
    const pathData = getSvgPathFromPoints(finishedStroke.points);
    if (staticCtxRef.current && pathData) {
      drawPath(staticCtxRef.current, pathData, finishedStroke.color);
    }

    // Clear dynamic canvas
    dynamicCtxRef.current?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Notify server
    socketRef.current?.emit('stop_stroke', finishedStroke.id);

    setIsDrawing(false);
    currentStrokeRef.current = null;
  };

  const clearCanvas = (isRemoteEvent = false) => {
    staticCtxRef.current?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    dynamicCtxRef.current?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if(!isRemoteEvent) {
        socketRef.current?.emit('clear_canvas');
    }
  };

  return (
    <div className="canvas-container" style={{ position: 'relative' }}>
      {/* Toolbar */}
      <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 100,
          display: 'flex',
          gap: '10px',
          background: 'white',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
          title="Pick Color"
        />
        <button 
          onClick={() => clearCanvas(false)}
          style={{ padding: '5px 10px', cursor: 'pointer' }}
        >
          Clear All
        </button>
      </div>

      {/* Static Canvas (History) */}
      <canvas
        ref={staticCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ position: 'absolute', top: 0, left: 0, background: '#f0f0f0' }}
      />
      
      {/* Dynamic Canvas (Active Drawing) */}
      <canvas
        ref={dynamicCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
    </div>
  );
};

export default Canvas;