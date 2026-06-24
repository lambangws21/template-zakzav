import { clamp, getDistance, rotateVector } from "./geometryUtils";
import { getLayerMaskDisplayPoints, transformLayerLocalPoint, getLayerDisplaySize, toLayerShapeLocal } from "./layerUtils";
import { tracePolygonPath } from "./canvasUtils";

const DEFAULT_FREE_LINE_CURVE_POINT = 0.58;
const DEFAULT_FREE_LINE_CURVE_FREEHAND = 0.16;
const MIN_FREE_CUT_POINTS = 3;

export function getFreeLineCurveStrength(shape) {
  const fallback =
    shape?.drawMode === "point"
      ? DEFAULT_FREE_LINE_CURVE_POINT
      : DEFAULT_FREE_LINE_CURVE_FREEHAND;
  return clamp(
    Number.isFinite(shape?.curveStrength) ? shape.curveStrength : fallback,
    0,
    1,
  );
}


export function getSmoothClosedSegmentControls(points, index, smoothness = 0) {
  const len = points.length;
  const p0 = points[(index - 1 + len) % len];
  const p1 = points[index];
  const p2 = points[(index + 1) % len];
  const p3 = points[(index + 2) % len];
  const tension = clamp(smoothness, 0, 1) * 0.9;
  const autoCp1 = {
    x: p1.x + ((p2.x - p0.x) / 6) * tension,
    y: p1.y + ((p2.y - p0.y) / 6) * tension,
  };
  const autoCp2 = {
    x: p2.x - ((p3.x - p1.x) / 6) * tension,
    y: p2.y - ((p3.y - p1.y) / 6) * tension,
  };

  return {
    cp1:
      Number.isFinite(p1.handleOutX) && Number.isFinite(p1.handleOutY)
        ? { x: p1.handleOutX, y: p1.handleOutY }
        : autoCp1,
    cp2:
      Number.isFinite(p2.handleInX) && Number.isFinite(p2.handleInY)
        ? { x: p2.handleInX, y: p2.handleInY }
        : autoCp2,
  };
}


export function traceSmoothClosedPath(ctx, points, smoothness = 0) {
  if (!ctx || !Array.isArray(points) || points.length === 0) return;
  const hasCustomCurveHandles = points.some(
    (point) =>
      Number.isFinite(point?.handleInX) ||
      Number.isFinite(point?.handleInY) ||
      Number.isFinite(point?.handleOutX) ||
      Number.isFinite(point?.handleOutY),
  );
  if (points.length < 3 || (smoothness <= 0.01 && !hasCustomCurveHandles)) {
    tracePolygonPath(ctx, points);
    return;
  }

  const len = points.length;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 0; index < len; index += 1) {
    const p2 = points[(index + 1) % len];
    const { cp1, cp2 } = getSmoothClosedSegmentControls(
      points,
      index,
      smoothness,
    );
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
  }

  ctx.closePath();
}


export function normalizeFreeLineLayerBounds(layer) {
  if (layer?.kind !== "free-line") return layer;

  const localPoints = getLayerMaskDisplayPoints(layer);
  if (!localPoints || localPoints.length < MIN_FREE_CUT_POINTS) return layer;

  const coordinates = [];
  for (const point of localPoints) {
    coordinates.push({ x: point.x, y: point.y });
    if (Number.isFinite(point.handleInX) && Number.isFinite(point.handleInY)) {
      coordinates.push({ x: point.handleInX, y: point.handleInY });
    }
    if (Number.isFinite(point.handleOutX) && Number.isFinite(point.handleOutY)) {
      coordinates.push({ x: point.handleOutX, y: point.handleOutY });
    }
  }

  const xs = coordinates.map((point) => point.x);
  const ys = coordinates.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (![minX, maxX, minY, maxY].every(Number.isFinite)) return layer;

  const boundsWidth = Math.max(1, maxX - minX);
  const boundsHeight = Math.max(1, maxY - minY);
  const padding = clamp(Math.max(boundsWidth, boundsHeight) * 0.18, 32, 96);
  const nextWidth = Math.max(16, Math.ceil(boundsWidth + padding * 2));
  const nextHeight = Math.max(16, Math.ceil(boundsHeight + padding * 2));
  const shiftX = (minX + maxX) / 2;
  const shiftY = (minY + maxY) / 2;
  const centerOffset = rotateVector(
    layer.flipX ? -shiftX : shiftX,
    layer.flipY ? -shiftY : shiftY,
    layer.rotation,
  );

  return {
    ...layer,
    sourceWidth: nextWidth,
    sourceHeight: nextHeight,
    displayWidth: nextWidth,
    displayHeight: nextHeight,
    centerX: layer.centerX + centerOffset.x,
    centerY: layer.centerY + centerOffset.y,
    maskPoints: localPoints.map((point) => {
      const nextPoint = {
        x: point.x - shiftX,
        y: point.y - shiftY,
      };
      if (Number.isFinite(point.handleInX) && Number.isFinite(point.handleInY)) {
        nextPoint.handleInX = point.handleInX - shiftX;
        nextPoint.handleInY = point.handleInY - shiftY;
      }
      if (
        Number.isFinite(point.handleOutX) &&
        Number.isFinite(point.handleOutY)
      ) {
        nextPoint.handleOutX = point.handleOutX - shiftX;
        nextPoint.handleOutY = point.handleOutY - shiftY;
      }
      return nextPoint;
    }),
  };
}


export function getFreeLineVertexPoints(layer) {
  const localPoints = getLayerMaskDisplayPoints(layer);
  if (!localPoints) return [];

  return localPoints.map((point, pointIndex) => {
    const rotated = transformLayerLocalPoint(layer, point);
    return {
      pointIndex,
      x: rotated.x,
      y: rotated.y,
    };
  });
}


export function getFreeLineLocalHandlePair(layer, pointIndex) {
  const localPoints = getLayerMaskDisplayPoints(layer);
  if (!localPoints || localPoints.length < 3) return null;

  const current = localPoints[pointIndex];
  if (!current) return null;

  const len = localPoints.length;
  const previous = localPoints[(pointIndex - 1 + len) % len];
  const next = localPoints[(pointIndex + 1) % len];
  const tangent = {
    x: next.x - previous.x,
    y: next.y - previous.y,
  };
  const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
  const unitTangent = {
    x: tangent.x / tangentLength,
    y: tangent.y / tangentLength,
  };
  const incomingLength = getDistance(previous, current);
  const outgoingLength = getDistance(current, next);
  const autoRadius = clamp(
    Math.min(incomingLength, outgoingLength) *
      (0.18 + getFreeLineCurveStrength(layer) * 0.42),
    8,
    120,
  );

  const defaultIn = {
    x: current.x - unitTangent.x * autoRadius,
    y: current.y - unitTangent.y * autoRadius,
  };
  const defaultOut = {
    x: current.x + unitTangent.x * autoRadius,
    y: current.y + unitTangent.y * autoRadius,
  };

  return {
    point: current,
    autoRadius,
    handleIn:
      Number.isFinite(current.handleInX) && Number.isFinite(current.handleInY)
        ? { x: current.handleInX, y: current.handleInY }
        : defaultIn,
    handleOut:
      Number.isFinite(current.handleOutX) && Number.isFinite(current.handleOutY)
        ? { x: current.handleOutX, y: current.handleOutY }
        : defaultOut,
  };
}


export function getFreeLineCurveRadius(layer, pointIndex) {
  const handlePair = getFreeLineLocalHandlePair(layer, pointIndex);
  if (!handlePair) return 0;

  const handleInDistance = getDistance(handlePair.point, handlePair.handleIn);
  const handleOutDistance = getDistance(handlePair.point, handlePair.handleOut);
  const meanDistance = (handleInDistance + handleOutDistance) / 2;
  return clamp(meanDistance || handlePair.autoRadius || 0, 8, 120);
}


export function getFreeLineCurveHandles(layer, pointIndex) {
  const handlePair = getFreeLineLocalHandlePair(layer, pointIndex);
  if (!handlePair) return [];
  const anchor = transformLayerLocalPoint(layer, handlePair.point);

  return [
    {
      pointIndex,
      handleKey: "in",
      anchorX: anchor.x,
      anchorY: anchor.y,
      ...transformLayerLocalPoint(layer, handlePair.handleIn),
    },
    {
      pointIndex,
      handleKey: "out",
      anchorX: anchor.x,
      anchorY: anchor.y,
      ...transformLayerLocalPoint(layer, handlePair.handleOut),
    },
  ];
}


export function toLayerMaskPoint(point, layer, { clampToBounds = true } = {}) {
  const local = toLayerShapeLocal(point, layer);
  const size = getLayerDisplaySize(layer);
  const sourceWidth = Math.max(1, layer.sourceWidth || size.width);
  const sourceHeight = Math.max(1, layer.sourceHeight || size.height);
  const x = local.x * (sourceWidth / Math.max(1, size.width));
  const y = local.y * (sourceHeight / Math.max(1, size.height));

  if (!clampToBounds) {
    return { x, y };
  }

  return {
    x: clamp(x, -sourceWidth / 2, sourceWidth / 2),
    y: clamp(y, -sourceHeight / 2, sourceHeight / 2),
  };
}


export function cloneMaskPoint(point) {
  if (!point) return null;
  const nextPoint = {
    x: Number(point.x) || 0,
    y: Number(point.y) || 0,
  };
  if (Number.isFinite(point.handleInX) && Number.isFinite(point.handleInY)) {
    nextPoint.handleInX = Number(point.handleInX);
    nextPoint.handleInY = Number(point.handleInY);
  }
  if (Number.isFinite(point.handleOutX) && Number.isFinite(point.handleOutY)) {
    nextPoint.handleOutX = Number(point.handleOutX);
    nextPoint.handleOutY = Number(point.handleOutY);
  }
  return nextPoint;
}


export function applyFreeLineCurveRadiusToPoint(layer, pointIndex, radius) {
  if (
    !layer ||
    layer.kind !== "free-line" ||
    !Array.isArray(layer.maskPoints) ||
    pointIndex < 0 ||
    pointIndex >= layer.maskPoints.length
  ) {
    return layer;
  }

  const localPoints = getLayerMaskDisplayPoints(layer);
  if (!localPoints || localPoints.length < 3) return layer;

  const current = localPoints[pointIndex];
  const len = localPoints.length;
  const previous = localPoints[(pointIndex - 1 + len) % len];
  const next = localPoints[(pointIndex + 1) % len];
  const tangent = {
    x: next.x - previous.x,
    y: next.y - previous.y,
  };
  const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
  const unitTangent = {
    x: tangent.x / tangentLength,
    y: tangent.y / tangentLength,
  };
  const nextRadius = clamp(radius, 6, 160);
  const sourceScaleX =
    Math.max(1, layer.sourceWidth || 1) /
    Math.max(1, getLayerDisplaySize(layer).width);
  const sourceScaleY =
    Math.max(1, layer.sourceHeight || 1) /
    Math.max(1, getLayerDisplaySize(layer).height);
  const handleIn = {
    x: current.x - unitTangent.x * nextRadius,
    y: current.y - unitTangent.y * nextRadius,
  };
  const handleOut = {
    x: current.x + unitTangent.x * nextRadius,
    y: current.y + unitTangent.y * nextRadius,
  };

  return {
    ...layer,
    maskPoints: layer.maskPoints.map((point, index) => {
      if (index !== pointIndex) return point;
      return {
        ...point,
        handleInX: handleIn.x * sourceScaleX,
        handleInY: handleIn.y * sourceScaleY,
        handleOutX: handleOut.x * sourceScaleX,
        handleOutY: handleOut.y * sourceScaleY,
      };
    }),
  };
}


export function getLayerMaskScreenPoints(layer) {
  const localPoints = getLayerMaskDisplayPoints(layer);
  if (!localPoints) return null;

  return localPoints.map((point) => ({
    ...transformLayerLocalPoint(layer, point),
    handleInX:
      Number.isFinite(point.handleInX) && Number.isFinite(point.handleInY)
        ? transformLayerLocalPoint(layer, {
            x: point.handleInX,
            y: point.handleInY,
          }).x
        : undefined,
    handleInY:
      Number.isFinite(point.handleInX) && Number.isFinite(point.handleInY)
        ? transformLayerLocalPoint(layer, {
            x: point.handleInX,
            y: point.handleInY,
          }).y
        : undefined,
    handleOutX:
      Number.isFinite(point.handleOutX) && Number.isFinite(point.handleOutY)
        ? transformLayerLocalPoint(layer, {
            x: point.handleOutX,
            y: point.handleOutY,
          }).x
        : undefined,
    handleOutY:
      Number.isFinite(point.handleOutX) && Number.isFinite(point.handleOutY)
        ? transformLayerLocalPoint(layer, {
            x: point.handleOutX,
            y: point.handleOutY,
          }).y
        : undefined,
  }));
}


