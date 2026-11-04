import { dist, distToSegment } from './geometry';
import type { Route, Vec } from './types';

/**
 * Find the first leg that passes the destination. The existing final leg of a
 * completed route is excluded: it already ends at the destination.
 */
export function firstArrival(route: Route, end: Vec, radius: number, complete: boolean): number | null {
  const lastLeg = route.points.length - 2;
  for (let i = 0; i <= lastLeg; i++) {
    if (complete && i === lastLeg) break;
    if (distToSegment(end, route.points[i], route.points[i + 1]) <= radius) return i;
  }
  return null;
}

export function waypointInsidePort(point: Vec, port: Vec, radius: number): boolean {
  return dist(point, port) < radius;
}
