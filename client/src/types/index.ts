// client/src/types/index.ts

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