
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}


export function normalizeViewportState(nextViewport, fallback = { x: 0, y: 0, scale: 1 }) {
  const source = nextViewport || fallback;
  const fallbackScale = Number.isFinite(fallback?.scale) ? fallback.scale : 1;
  const fallbackX = Number.isFinite(fallback?.x)
    ? fallback.x
    : Number.isFinite(fallback?.panX)
      ? fallback.panX
      : 0;
  const fallbackY = Number.isFinite(fallback?.y)
    ? fallback.y
    : Number.isFinite(fallback?.panY)
      ? fallback.panY
      : 0;

  const rawX = Number.isFinite(source.x) ? source.x : source.panX;
  const rawY = Number.isFinite(source.y) ? source.y : source.panY;

  return {
    x: Number.isFinite(rawX) ? rawX : fallbackX,
    y: Number.isFinite(rawY) ? rawY : fallbackY,
    scale: Number.isFinite(source.scale) ? source.scale : fallbackScale,
  };
}


export function withViewportPanAliases(viewportState) {
  const normalized = normalizeViewportState(viewportState);
  return {
    ...normalized,
    panX: normalized.x,
    panY: normalized.y,
  };
}


export function isFinitePoint(point) {
  return Boolean(
    point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
  );
}



export function normalizeRect(x1, y1, x2, y2) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}


export function getPolygonBounds(points) {
  if (!Array.isArray(points) || points.length === 0) return null;

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}


export function pointInPolygon(point, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;

  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const currentPoint = polygon[currentIndex];
    const previousPoint = polygon[previousIndex];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y || Number.EPSILON) +
          currentPoint.x;
    if (intersects) inside = !inside;
  }

  return inside;
}


export function projectPointOnSegment(point, start, end) {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const segmentLengthSq = vx * vx + vy * vy;
  if (segmentLengthSq <= Number.EPSILON) {
    return { x: start.x, y: start.y, t: 0 };
  }
  const t = clamp(
    ((point.x - start.x) * vx + (point.y - start.y) * vy) / segmentLengthSq,
    0,
    1,
  );
  return {
    x: start.x + vx * t,
    y: start.y + vy * t,
    t,
  };
}


export function getLineLength(line) {
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}


export function getDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}


export function getAngleDegrees(a, vertex, b) {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = clamp((v1x * v2x + v1y * v2y) / (mag1 * mag2), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}


export function getAngleArcGeometry(a, vertex, b) {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);

  if (!len1 || !len2) return null;

  const startAngle = Math.atan2(v1y, v1x);
  let sweep = Math.atan2(v2y, v2x) - startAngle;
  while (sweep <= -Math.PI) sweep += Math.PI * 2;
  while (sweep > Math.PI) sweep -= Math.PI * 2;

  return {
    radius: clamp(Math.min(len1, len2) * 0.28, 14, 36),
    startAngle,
    endAngle: startAngle + sweep,
    counterclockwise: sweep < 0,
  };
}


export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}


export function rotateVector(x, y, rotation) {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}


export function normalizeRotationDegrees(rotation) {
  return (((rotation || 0) % 360) + 360) % 360;
}


export function getSignedAngleDeltaDegrees(startRad, endRad) {
  const delta = endRad - startRad;
  return (Math.atan2(Math.sin(delta), Math.cos(delta)) * 180) / Math.PI;
}


export function distancePointToSegment(point, line) {
  const vx = line.x2 - line.x1;
  const vy = line.y2 - line.y1;
  const segmentLengthSq = vx * vx + vy * vy;

  if (segmentLengthSq === 0) {
    return Math.hypot(point.x - line.x1, point.y - line.y1);
  }

  const t =
    ((point.x - line.x1) * vx + (point.y - line.y1) * vy) / segmentLengthSq;
  const clampedT = clamp(t, 0, 1);

  const closestX = line.x1 + clampedT * vx;
  const closestY = line.y1 + clampedT * vy;

  return Math.hypot(point.x - closestX, point.y - closestY);
}


export function getSegmentMidpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}


export function getCircumcircleFromThreePoints(a, b, c) {
  const determinant =
    2 *
    (a.x * (b.y - c.y) +
      b.x * (c.y - a.y) +
      c.x * (a.y - b.y));
  if (Math.abs(determinant) < 1e-6) return null;

  const aSq = a.x * a.x + a.y * a.y;
  const bSq = b.x * b.x + b.y * b.y;
  const cSq = c.x * c.x + c.y * c.y;
  const centerX =
    (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) /
    determinant;
  const centerY =
    (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) /
    determinant;
  const radius = Math.hypot(centerX - a.x, centerY - a.y);

  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    return null;
  }

  return {
    center: { x: centerX, y: centerY },
    radius,
  };
}


export function projectPointToInfiniteLine(point, line) {
  const vx = line.x2 - line.x1;
  const vy = line.y2 - line.y1;
  const lengthSq = vx * vx + vy * vy;
  if (lengthSq <= 1e-6) return null;
  const t = ((point.x - line.x1) * vx + (point.y - line.y1) * vy) / lengthSq;
  return {
    x: line.x1 + t * vx,
    y: line.y1 + t * vy,
    t,
  };
}


export function getCircleTangentPointsFromExternalPoint(point, circle) {
  const dx = point.x - circle.cx;
  const dy = point.y - circle.cy;
  const distanceSq = dx * dx + dy * dy;
  const radiusSq = circle.radius * circle.radius;
  if (distanceSq <= radiusSq + 1e-6) return [];

  const distance = Math.sqrt(distanceSq);
  const baseAngle = Math.atan2(dy, dx);
  const deltaAngle = Math.acos(clamp(circle.radius / distance, -1, 1));

  return [baseAngle - deltaAngle, baseAngle + deltaAngle].map((angle) => ({
    x: circle.cx + circle.radius * Math.cos(angle),
    y: circle.cy + circle.radius * Math.sin(angle),
  }));
}


