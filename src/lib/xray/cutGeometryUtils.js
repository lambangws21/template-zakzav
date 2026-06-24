import { clamp, getLineLength, getDistance, degToRad, rotateVector, normalizeRotationDegrees, pointInPolygon, projectPointOnSegment, normalizeRect, getPolygonBounds, getSignedAngleDeltaDegrees } from "./geometryUtils";
import { tracePolygonPath } from "./canvasUtils";
import { getLayerDisplaySize, getLayerFilterValue, transformLayerLocalPoint } from "./layerUtils";
import { toLayerMaskPoint } from "./freeLineUtils";

const MIN_FREE_CUT_POINTS = 3;


export function constrainLineByPreset(draft, _preset) {
  return draft;
}
export const DEFAULT_ANGLE_COLOR = "#f97316";
export const DEFAULT_ANGLE_STROKE_WIDTH = 2;
export const DEFAULT_HKA_LINE_COLOR = "#14b8a6";
export const DEFAULT_HKA_STROKE_WIDTH = 2;
export const DEFAULT_CIRCLE_COLOR = "#8b5cf6";
export const DEFAULT_CIRCLE_STROKE_WIDTH = 2;
export const DEFAULT_PLANNING_GUIDE_STROKE_WIDTH = 2;
export const DEFAULT_FREE_LINE_COLOR = "#3b82f6";
export const DEFAULT_LAYER_DUPLICATE_OFFSET = 18;
export const DEFAULT_FREE_LINE_MODE = "freehand";
export const DEFAULT_FREE_LINE_CURVE_FREEHAND = 0.16;
export const DEFAULT_FREE_LINE_CURVE_POINT = 0.58;
export const ANGLE_COLOR_OPTIONS = [
  "#f97316",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];
export const LINE_COLOR_OPTIONS = [
  "#38bdf8",
  "#22c55e",
  "#f43f5e",
  "#f59e0b",
  "#8b5cf6",
  "#111827",
  "#94a3b8",
];
export const CIRCLE_COLOR_OPTIONS = [
  "#8b5cf6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#f43f5e",
  "#111827",
  "#94a3b8",
];
export const FREE_SHAPE_COLOR_OPTIONS = [
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#111827",
  "#94a3b8",
];
export const HKA_COLOR_OPTIONS = [
  "#14b8a6",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#111827",
  "#94a3b8",
];

export const PLANNING_GUIDE_COLOR_OPTIONS = [
  "#38bdf8",
  "#22c55e",
  "#f97316",
  "#f43f5e",
  "#eab308",
  "#a855f7",
  "#14b8a6",
  "#f59e0b",
];

const TOOL_CONFIG_MODAL_DEFAULT_SIZES = {
  snapTool: { width: 560, height: 420 },
  centerFinder: { width: 520, height: 320 },
  axisBuilder: { width: 520, height: 320 },
  guideBuilder: { width: 560, height: 360 },
  layerMove: { width: 980, height: 760 },
  layerLayout: { width: 980, height: 760 },
  layerSettings: { width: 1120, height: 820 },
};
const TOOL_CONFIG_MODAL_MIN_WIDTH = 420;
const TOOL_CONFIG_MODAL_MIN_HEIGHT = 260;

export const IMG_PROC_DEBOUNCE_MS = 260;


export function buildFreeCutLayerFromPoints({
  sourceImage,
  sourceOffsetX = 0,
  sourceOffsetY = 0,
  polygonPoints,
  layerId,
  name,
}) {
  if (
    typeof document === "undefined" ||
    !sourceImage ||
    !Array.isArray(polygonPoints) ||
    polygonPoints.length < MIN_FREE_CUT_POINTS
  ) {
    return null;
  }

  const rawBounds = getPolygonBounds(polygonPoints);
  if (!rawBounds) return null;

  const sourceX = Math.floor(rawBounds.x);
  const sourceY = Math.floor(rawBounds.y);
  const sourceRight = Math.ceil(rawBounds.x + rawBounds.width);
  const sourceBottom = Math.ceil(rawBounds.y + rawBounds.height);
  const width = Math.max(1, sourceRight - sourceX);
  const height = Math.max(1, sourceBottom - sourceY);
  if (width < 8 || height < 8) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const normalizedPoints = polygonPoints.map((point) => ({
    x: point.x - sourceX,
    y: point.y - sourceY,
  }));

  // Gambar dulu tanpa clip
  ctx.drawImage(
    sourceImage,
    sourceOffsetX + sourceX,
    sourceOffsetY + sourceY,
    width,
    height,
    0,
    0,
    width,
    height,
  );

  // Buat mask canvas dengan feathering (blur) di tepi polygon
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext("2d");
  if (maskCtx) {
    const feather = Math.max(4, Math.min(18, Math.min(width, height) * 0.025));
    maskCtx.filter = `blur(${feather}px)`;
    maskCtx.fillStyle = "#ffffff";
    tracePolygonPath(maskCtx, normalizedPoints);
    maskCtx.fill();
    maskCtx.filter = "none";
  }

  // Terapkan mask sebagai alpha channel
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  let imageSrc = "";
  try {
    imageSrc = canvas.toDataURL("image/png");
  } catch {
    imageSrc = "";
  }

  return {
    id: layerId,
    kind: "free-cut",
    image: canvas,
    imageSrc,
    name: name || `Free Cut ${layerId}`,
    sourceX: 0,
    sourceY: 0,
    sourceWidth: width,
    sourceHeight: height,
    displayWidth: width,
    displayHeight: height,
    centerX: sourceX + width / 2,
    centerY: sourceY + height / 2,
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    contrast: 100,
    level: 100,
    lockScale: false,
    hidden: false,
    curveStrength: DEFAULT_FREE_LINE_CURVE_POINT,
    maskPoints: normalizedPoints.map((point) => ({
      x: point.x - width / 2,
      y: point.y - height / 2,
    })),
  };
}


export function buildFreeCutLayerFromLayerPoints({
  sourceLayer,
  sourceImage,
  polygonPoints,
  layerId,
  name,
}) {
  if (
    typeof document === "undefined" ||
    !sourceLayer ||
    !sourceImage ||
    !Array.isArray(polygonPoints) ||
    polygonPoints.length < MIN_FREE_CUT_POINTS
  ) {
    return null;
  }

  const sourceWidth = Math.max(1, Number(sourceLayer.sourceWidth || 0));
  const sourceHeight = Math.max(1, Number(sourceLayer.sourceHeight || 0));
  const displaySize = getLayerDisplaySize(sourceLayer);
  const displayScaleX = Math.max(1, displaySize.width) / sourceWidth;
  const displayScaleY = Math.max(1, displaySize.height) / sourceHeight;

  const sourcePoints = polygonPoints.map((point) => {
    const maskPoint = toLayerMaskPoint(point, sourceLayer, {
      clampToBounds: true,
    });
    return {
      x: clamp(maskPoint.x + sourceWidth / 2, 0, sourceWidth),
      y: clamp(maskPoint.y + sourceHeight / 2, 0, sourceHeight),
    };
  });

  const rawBounds = getPolygonBounds(sourcePoints);
  if (!rawBounds) return null;

  const sourceX = clamp(Math.floor(rawBounds.x), 0, sourceWidth - 1);
  const sourceY = clamp(Math.floor(rawBounds.y), 0, sourceHeight - 1);
  const sourceRight = clamp(
    Math.ceil(rawBounds.x + rawBounds.width),
    sourceX + 1,
    sourceWidth,
  );
  const sourceBottom = clamp(
    Math.ceil(rawBounds.y + rawBounds.height),
    sourceY + 1,
    sourceHeight,
  );
  const width = Math.max(1, sourceRight - sourceX);
  const height = Math.max(1, sourceBottom - sourceY);
  if (width < 8 || height < 8) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const normalizedSourcePoints = sourcePoints.map((point) => ({
    x: point.x - sourceX,
    y: point.y - sourceY,
  }));

  ctx.save();
  ctx.filter = getLayerFilterValue(sourceLayer);
  ctx.drawImage(
    sourceImage,
    Number(sourceLayer.sourceX || 0) + sourceX,
    Number(sourceLayer.sourceY || 0) + sourceY,
    width,
    height,
    0,
    0,
    width,
    height,
  );
  ctx.restore();

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext("2d");
  if (maskCtx) {
    const feather = Math.max(4, Math.min(18, Math.min(width, height) * 0.025));
    maskCtx.filter = `blur(${feather}px)`;
    maskCtx.fillStyle = "#ffffff";
    tracePolygonPath(maskCtx, normalizedSourcePoints);
    maskCtx.fill();
    maskCtx.filter = "none";
  }
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  let imageSrc = "";
  try {
    imageSrc = canvas.toDataURL("image/png");
  } catch {
    imageSrc = "";
  }

  const localCenter = {
    x: (sourceX + width / 2 - sourceWidth / 2) * displayScaleX,
    y: (sourceY + height / 2 - sourceHeight / 2) * displayScaleY,
  };
  const layerCenter = transformLayerLocalPoint(sourceLayer, localCenter);

  return {
    id: layerId,
    kind: "free-cut",
    image: canvas,
    imageSrc,
    name: name || `Free Cut ${layerId}`,
    sourceX: 0,
    sourceY: 0,
    sourceWidth: width,
    sourceHeight: height,
    displayWidth: Math.max(1, width * displayScaleX),
    displayHeight: Math.max(1, height * displayScaleY),
    centerX: layerCenter.x,
    centerY: layerCenter.y,
    rotation: Number(sourceLayer.rotation || 0),
    flipX: Boolean(sourceLayer.flipX),
    flipY: Boolean(sourceLayer.flipY),
    opacity: 1,
    contrast: 100,
    level: 100,
    lockScale: false,
    hidden: false,
    sourceLayerId: sourceLayer.id,
    curveStrength: DEFAULT_FREE_LINE_CURVE_POINT,
    maskPoints: normalizedSourcePoints.map((point) => ({
      x: point.x - width / 2,
      y: point.y - height / 2,
    })),
  };
}


export function buildFreeLineLayerFromPoints({
  polygonPoints,
  layerId,
  name,
  fillColor = DEFAULT_FREE_LINE_COLOR,
  drawMode = DEFAULT_FREE_LINE_MODE,
  curveStrength,
}) {
  if (
    !Array.isArray(polygonPoints) ||
    polygonPoints.length < MIN_FREE_CUT_POINTS
  ) {
    return null;
  }

  const rawBounds = getPolygonBounds(polygonPoints);
  if (!rawBounds) return null;

  const sourceX = Math.floor(rawBounds.x);
  const sourceY = Math.floor(rawBounds.y);
  const sourceRight = Math.ceil(rawBounds.x + rawBounds.width);
  const sourceBottom = Math.ceil(rawBounds.y + rawBounds.height);
  const width = Math.max(1, sourceRight - sourceX);
  const height = Math.max(1, sourceBottom - sourceY);
  if (width < 8 || height < 8) return null;

  return {
    id: layerId,
    kind: "free-line",
    name: name || `Free Line ${layerId}`,
    sourceX: 0,
    sourceY: 0,
    sourceWidth: width,
    sourceHeight: height,
    displayWidth: width,
    displayHeight: height,
    centerX: sourceX + width / 2,
    centerY: sourceY + height / 2,
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 0.85,
    contrast: 100,
    level: 100,
    lockScale: false,
    hidden: false,
    fillColor,
    drawMode,
    curveStrength: clamp(
      Number.isFinite(curveStrength)
        ? curveStrength
        : drawMode === "point"
          ? DEFAULT_FREE_LINE_CURVE_POINT
          : DEFAULT_FREE_LINE_CURVE_FREEHAND,
      0,
      1,
    ),
    maskPoints: polygonPoints.map((point) => ({
      x: point.x - (sourceX + width / 2),
      y: point.y - (sourceY + height / 2),
    })),
  };
}


export function buildValgusCutGeometry(anchorStart, anchorEnd, params) {
  const axis = {
    x: anchorEnd.x - anchorStart.x,
    y: anchorEnd.y - anchorStart.y,
  };
  const axisLen = Math.hypot(axis.x, axis.y);
  if (!axisLen) return null;
  const axisUnit = { x: axis.x / axisLen, y: axis.y / axisLen };
  const baseline = { x: -axisUnit.y, y: axisUnit.x };
  const sign = params.side === "Right" ? 1 : -1;
  const theta = degToRad((Number(params.angleDeg) || 0) * sign);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const cutDir = {
    x: baseline.x * cos - baseline.y * sin,
    y: baseline.x * sin + baseline.y * cos,
  };
  const cutCenter = {
    x: anchorEnd.x + axisUnit.x * (Number(params.offsetPx) || 0),
    y: anchorEnd.y + axisUnit.y * (Number(params.offsetPx) || 0),
  };
  const half = Math.max(10, (Number(params.lineLengthPx) || 100) / 2);
  return {
    baseA: {
      x: cutCenter.x - baseline.x * 60,
      y: cutCenter.y - baseline.y * 60,
    },
    baseB: {
      x: cutCenter.x + baseline.x * 60,
      y: cutCenter.y + baseline.y * 60,
    },
    cutA: {
      x: cutCenter.x - cutDir.x * half,
      y: cutCenter.y - cutDir.y * half,
    },
    cutB: {
      x: cutCenter.x + cutDir.x * half,
      y: cutCenter.y + cutDir.y * half,
    },
    cutCenter,
  };
}


export function buildTibialSlopeGeometry(anchorStart, anchorEnd, params) {
  const axis = {
    x: anchorEnd.x - anchorStart.x,
    y: anchorEnd.y - anchorStart.y,
  };
  const axisLen = Math.hypot(axis.x, axis.y);
  if (!axisLen) return null;
  const axisUnit = { x: axis.x / axisLen, y: axis.y / axisLen };
  const baseline = { x: -axisUnit.y, y: axisUnit.x };
  const sign = params.posteriorSide === "Right" ? 1 : -1;
  const theta = degToRad((Number(params.angleDeg) || 0) * sign);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const slopeDir = {
    x: baseline.x * cos - baseline.y * sin,
    y: baseline.x * sin + baseline.y * cos,
  };
  const cutCenter = {
    x: anchorStart.x + axisUnit.x * (Number(params.offsetPx) || 0),
    y: anchorStart.y + axisUnit.y * (Number(params.offsetPx) || 0),
  };
  const half = Math.max(10, (Number(params.lineLengthPx) || 90) / 2);
  return {
    baseA: {
      x: cutCenter.x - baseline.x * 60,
      y: cutCenter.y - baseline.y * 60,
    },
    baseB: {
      x: cutCenter.x + baseline.x * 60,
      y: cutCenter.y + baseline.y * 60,
    },
    cutA: {
      x: cutCenter.x - slopeDir.x * half,
      y: cutCenter.y - slopeDir.y * half,
    },
    cutB: {
      x: cutCenter.x + slopeDir.x * half,
      y: cutCenter.y + slopeDir.y * half,
    },
    cutCenter,
  };
}


export function buildTibialCutGeometry(anchorStart, anchorEnd, params) {
  const axis = {
    x: anchorEnd.x - anchorStart.x,
    y: anchorEnd.y - anchorStart.y,
  };
  const axisLen = Math.hypot(axis.x, axis.y);
  if (!axisLen) return null;
  const axisUnit = { x: axis.x / axisLen, y: axis.y / axisLen };
  const baseline = { x: -axisUnit.y, y: axisUnit.x };
  const sign = params.direction === "Valgus" ? 1 : -1;
  const theta = degToRad((Number(params.angleDeg) || 0) * sign);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const cutDir = {
    x: baseline.x * cos - baseline.y * sin,
    y: baseline.x * sin + baseline.y * cos,
  };
  const cutCenter = {
    x: anchorStart.x + axisUnit.x * (Number(params.offsetPx) || 0),
    y: anchorStart.y + axisUnit.y * (Number(params.offsetPx) || 0),
  };
  const half = Math.max(10, (Number(params.lineLengthPx) || 90) / 2);
  return {
    baseA: {
      x: cutCenter.x - baseline.x * 60,
      y: cutCenter.y - baseline.y * 60,
    },
    baseB: {
      x: cutCenter.x + baseline.x * 60,
      y: cutCenter.y + baseline.y * 60,
    },
    cutA: {
      x: cutCenter.x - cutDir.x * half,
      y: cutCenter.y - cutDir.y * half,
    },
    cutB: {
      x: cutCenter.x + cutDir.x * half,
      y: cutCenter.y + cutDir.y * half,
    },
    cutCenter,
  };
}


