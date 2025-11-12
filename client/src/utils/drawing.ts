// client/src/utils/drawing.ts
import getStroke from 'perfect-freehand';
import { Point } from '../types';

// Options for perfect-freehand
const STROKE_OPTIONS = {
  size: 8,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: {
    taper: 0,
    easing: (t: number) => t,
    cap: true,
  },
  end: {
    taper: 0,
    easing: (t: number) => t,
    cap: true,
  },
};

// Generate the SVG path data from raw points
export function getSvgPathFromPoints(points: Point[]): string {
  if (!points.length) return '';
  
  const stroke = getStroke(points, STROKE_OPTIONS);
  
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      if (i === 0) {
        return `M ${x0},${y0}`;
      }
      const [x1, y1] = arr[i - 1];
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      return `${acc} Q ${x1},${y1} ${midX},${midY}`;
    },
    ''
  );

  // Close the path for a filled look (pressure simulation)
  return `${d} Z`;
}

// Helper to render a path string onto a context
export function drawPath(
  context: CanvasRenderingContext2D,
  pathData: string,
  color: string
) {
  const path = new Path2D(pathData);
  context.fillStyle = color;
  context.fill(path);
}