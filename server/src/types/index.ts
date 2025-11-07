// server/src/types/index.ts

// A point is defined as [x, y, pressure] to support perfect-freehand
export type Point = [number, number, number];

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  userId: string;
}

export interface DrawEventPayload {
  strokeId: string;
  point: Point;
  color: string;
}

export interface StartStrokePayload {
  strokeId: string;
  color: string;
  userId: string;
}