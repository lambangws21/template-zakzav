"use client";

import { ID, Query } from "appwrite";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Bone,
  Camera,
  Circle as CircleIcon,
  CloudOff,
  Crop,
  DraftingCompass,
  Download,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  GitCompare,
  Hand,
  History,
  MoveLeft,
  MoveRight,
  Lock,
  LockOpen,
  Maximize2,
  Menu,
  Minus,
  MoveDown,
  MoveUp,
  Package,
  PencilLine,
  Plus,
  RefreshCcw,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Scissors,
  Save,
  Target,
  Trash2,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  appwriteConfig,
  databases,
  hasTemplateCollectionConfig,
  hasTemplateStorageConfig,
} from "../lib/appwrite";
import {
  buildDriveImageCandidates,
  DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT,
  parseSheetRawText,
} from "../lib/googleSheetImageUtils";
import GoogleSheetDrivePicker from "./GoogleSheetDrivePicker";
import {
  getImplantLibraryItemById,
  LOCAL_IMPLANT_LIBRARY,
  LOCAL_IMPLANT_LIBRARY_TYPES,
} from "../lib/digitalTemplating/implantLibrary";
import { VIEWER_COLORS } from "../lib/digitalTemplating/viewerConstants";
import { createTemplatingId } from "../lib/digitalTemplating/viewerUtils";
import LocalImplantLibraryPanel from "./LocalImplantLibraryPanel";
import TemplateStoragePicker from "./TemplateStoragePicker";

const MIN_SCALE = 0.1;
const MAX_SCALE = 12;
const STORY_STORAGE_KEY = "xray_workspace_story_v1";
const TEMPLATE_LIBRARY_KEY = "xray_template_library_v1";
const DEFAULT_TEMPLATE_LAYER_OPACITY = 0.55;
const TEMPLATE_INITIAL_MAX_FRACTION = 0.3;
const LEFT_SIDEBAR_MIN_WIDTH = 130;
const LEFT_SIDEBAR_MAX_WIDTH = 420;
const LEFT_SIDEBAR_DEFAULT_WIDTH = 260;
const RIGHT_SIDEBAR_MIN_WIDTH = 130;
const RIGHT_SIDEBAR_MAX_WIDTH = 460;
const RIGHT_SIDEBAR_DEFAULT_WIDTH = 280;
const LAYER_PALETTE = [
  { border: "#10b981", bg: "#ecfdf5", text: "#065f46" },
  { border: "#06b6d4", bg: "#ecfeff", text: "#155e75" },
  { border: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  { border: "#8b5cf6", bg: "#f5f3ff", text: "#5b21b6" },
  { border: "#f43f5e", bg: "#fff1f2", text: "#9f1239" },
  { border: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8" },
];
const SIDEBAR_ICON_GRID_CLASS =
  "grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(40px,1fr))]";
const SIDEBAR_TEXT_BUTTON_GRID_CLASS =
  "grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(112px,1fr))]";
const SIDEBAR_TAB_GRID_CLASS =
  "grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(72px,1fr))]";
const BUTTON_HOVER = { scale: 1.03, y: -1 };
const BUTTON_TAP = { scale: 0.97 };
const PANEL_SPRING = { type: "spring", stiffness: 320, damping: 28 };
const DEFAULT_LINE_LABEL_OFFSET_X = -42;
const DEFAULT_LINE_LABEL_OFFSET_Y = -20;
const DEFAULT_ANGLE_LABEL_OFFSET_X = 0;
const DEFAULT_ANGLE_LABEL_OFFSET_Y = -16;
const DEFAULT_GUIDE_LABEL_OFFSET_X = -54;
const DEFAULT_GUIDE_LABEL_OFFSET_Y = -18;
const DEFAULT_LABEL_OPACITY = 0.56;
const MOBILE_IDLE_TOOL = "pan";
const MIN_FREE_CUT_POINTS = 3;
const FREE_CUT_CLOSE_RADIUS_SCREEN = 18;
const MOBILE_DOUBLE_TAP_MS = 320;
const MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN = 72;
const DEFAULT_ANGLE_COLOR = "#f97316";
const DEFAULT_ANGLE_STROKE_WIDTH = 2;
const ANGLE_COLOR_OPTIONS = [
  "#f97316",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getLayerPalette(layerId) {
  const index = Math.abs(Number(layerId) || 0) % LAYER_PALETTE.length;
  return LAYER_PALETTE[index];
}

function loadImageFromSrc(rawSrc) {
  return new Promise((resolve, reject) => {
    const src = buildDriveImageCandidates(rawSrc)[0] || rawSrc;
    const canTryAnonymous =
      typeof src === "string" &&
      !src.startsWith("data:") &&
      !src.startsWith("blob:");
    const tryLoad = (anonymous) => {
      const img = new Image();
      if (anonymous) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        if (anonymous) {
          tryLoad(false);
          return;
        }
        reject(error);
      };
      img.src = src;
    };

    tryLoad(canTryAnonymous);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("File tidak menghasilkan data URL."));
    };
    reader.onerror = () =>
      reject(reader.error || new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

async function loadImageFromCandidates(candidates) {
  const sources = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  let lastError = null;
  for (const src of sources) {
    try {
      const image = await loadImageFromSrc(src);
      return { image, src };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Semua kandidat URL gambar gagal dimuat.");
}

function normalizeRect(x1, y1, x2, y2) {
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

function isImageBackedLayerKind(kind) {
  return kind === "upload" || kind === "free-cut";
}

function getPolygonBounds(points) {
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

function tracePolygonPath(ctx, points) {
  if (!ctx || !Array.isArray(points) || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
}

function pointInPolygon(point, polygon) {
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

function buildFreeCutLayerFromPoints({
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

  ctx.save();
  tracePolygonPath(ctx, normalizedPoints);
  ctx.clip();
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
  ctx.restore();

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
    lockScale: false,
    maskPoints: normalizedPoints.map((point) => ({
      x: point.x - width / 2,
      y: point.y - height / 2,
    })),
  };
}

function getTemplateKey(template) {
  const safeName = String(template?.name || "")
    .trim()
    .toLowerCase();
  const safeSrc =
    typeof template?.imageSrc === "string"
      ? template.imageSrc.slice(0, 120)
      : "";
  return `${safeName}::${safeSrc}`;
}

function mergeTemplateLibraryLists(primaryTemplates, fallbackTemplates) {
  const merged = [];
  const seen = new Set();
  for (const item of [...primaryTemplates, ...fallbackTemplates]) {
    if (!item || typeof item.imageSrc !== "string" || !item.imageSrc) continue;
    const key = getTemplateKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(0, 60);
}

function getOrientedSize(width, height, rotation) {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }

  return { width, height };
}

function orientPoint(x, y, width, height, rotation, flipX, flipY) {
  let nx = x;
  let ny = y;

  if (flipX) nx = width - nx;
  if (flipY) ny = height - ny;

  if (rotation === 90) {
    return { x: height - ny, y: nx };
  }

  if (rotation === 180) {
    return { x: width - nx, y: height - ny };
  }

  if (rotation === 270) {
    return { x: ny, y: width - nx };
  }

  return { x: nx, y: ny };
}

function inverseOrientPoint(x, y, width, height, rotation, flipX, flipY) {
  let nx = x;
  let ny = y;

  if (rotation === 90) {
    nx = y;
    ny = height - x;
  } else if (rotation === 180) {
    nx = width - x;
    ny = height - y;
  } else if (rotation === 270) {
    nx = width - y;
    ny = x;
  }

  if (flipX) nx = width - nx;
  if (flipY) ny = height - ny;

  return { x: nx, y: ny };
}

function getLineLength(line) {
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

function getDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getAngleDegrees(a, vertex, b) {
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

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function buildValgusCutGeometry(anchorStart, anchorEnd, params) {
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

function buildTibialSlopeGeometry(anchorStart, anchorEnd, params) {
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

function buildTibialCutGeometry(anchorStart, anchorEnd, params) {
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

function rotateVector(x, y, rotation) {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function toLayerLocal(point, layer) {
  const dx = point.x - layer.centerX;
  const dy = point.y - layer.centerY;
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: dx * cos + dy * sin,
    y: -dx * sin + dy * cos,
  };
}

function toLayerShapeLocal(point, layer) {
  const local = toLayerLocal(point, layer);
  return {
    x: layer.flipX ? -local.x : local.x,
    y: layer.flipY ? -local.y : local.y,
  };
}

function getLayerDisplaySize(layer) {
  return {
    width: layer.displayWidth || layer.sourceWidth,
    height: layer.displayHeight || layer.sourceHeight,
  };
}

function getLayerMaskDisplayPoints(layer) {
  if (!Array.isArray(layer.maskPoints) || layer.maskPoints.length < 3) {
    return null;
  }

  const size = getLayerDisplaySize(layer);
  const scaleX = size.width / Math.max(1, layer.sourceWidth || size.width);
  const scaleY = size.height / Math.max(1, layer.sourceHeight || size.height);

  return layer.maskPoints.map((point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  }));
}

function getLayerMaskScreenPoints(layer) {
  const localPoints = getLayerMaskDisplayPoints(layer);
  if (!localPoints) return null;

  return localPoints.map((point) => {
    const flippedX = layer.flipX ? -point.x : point.x;
    const flippedY = layer.flipY ? -point.y : point.y;
    const rotated = rotateVector(flippedX, flippedY, layer.rotation);
    return {
      x: layer.centerX + rotated.x,
      y: layer.centerY + rotated.y,
    };
  });
}

function getImageContentBounds(image) {
  if (typeof document === "undefined" || !image) return null;

  const rawWidth = image.naturalWidth || image.width || 0;
  const rawHeight = image.naturalHeight || image.height || 0;
  if (!rawWidth || !rawHeight) return null;

  const maxScanSize = 900;
  const scanScale = Math.min(
    maxScanSize / rawWidth,
    maxScanSize / rawHeight,
    1,
  );
  const scanWidth = Math.max(1, Math.round(rawWidth * scanScale));
  const scanHeight = Math.max(1, Math.round(rawHeight * scanScale));
  const canvas = document.createElement("canvas");
  canvas.width = scanWidth;
  canvas.height = scanHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(image, 0, 0, scanWidth, scanHeight);
    const pixels = ctx.getImageData(0, 0, scanWidth, scanHeight).data;
    const cornerIndexes = [
      0,
      (scanWidth - 1) * 4,
      (scanHeight - 1) * scanWidth * 4,
      ((scanHeight - 1) * scanWidth + scanWidth - 1) * 4,
    ];
    const background = cornerIndexes.reduce(
      (sum, index) => ({
        r: sum.r + pixels[index],
        g: sum.g + pixels[index + 1],
        b: sum.b + pixels[index + 2],
        a: sum.a + pixels[index + 3],
      }),
      { r: 0, g: 0, b: 0, a: 0 },
    );
    background.r /= cornerIndexes.length;
    background.g /= cornerIndexes.length;
    background.b /= cornerIndexes.length;
    background.a /= cornerIndexes.length;

    let minX = scanWidth;
    let minY = scanHeight;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < scanHeight; y += 1) {
      for (let x = 0; x < scanWidth; x += 1) {
        const index = (y * scanWidth + x) * 4;
        const alpha = pixels[index + 3];
        if (alpha <= 18) continue;

        const distance =
          Math.abs(pixels[index] - background.r) +
          Math.abs(pixels[index + 1] - background.g) +
          Math.abs(pixels[index + 2] - background.b) +
          Math.abs(alpha - background.a) * 0.35;
        if (distance <= 34) continue;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) return null;

    const pad = Math.max(
      2,
      Math.round(Math.min(scanWidth, scanHeight) * 0.015),
    );
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(scanWidth - 1, maxX + pad);
    maxY = Math.min(scanHeight - 1, maxY + pad);

    const x = Math.floor(minX / scanScale);
    const y = Math.floor(minY / scanScale);
    const width = Math.min(
      rawWidth - x,
      Math.ceil((maxX - minX + 1) / scanScale),
    );
    const height = Math.min(
      rawHeight - y,
      Math.ceil((maxY - minY + 1) / scanScale),
    );
    const coversAlmostAll =
      width >= rawWidth * 0.96 && height >= rawHeight * 0.96;
    if (coversAlmostAll || width < 8 || height < 8) return null;

    return { x, y, width, height };
  } catch {
    return null;
  }
}

function getMedian(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function getProjectionTickSpacing(projection, threshold) {
  const groups = [];
  let start = -1;
  let weighted = 0;
  let total = 0;

  for (let index = 0; index <= projection.length; index += 1) {
    const value = index < projection.length ? projection[index] : 0;
    if (value >= threshold) {
      if (start < 0) {
        start = index;
        weighted = 0;
        total = 0;
      }
      weighted += index * value;
      total += value;
      continue;
    }

    if (start >= 0) {
      groups.push(total > 0 ? weighted / total : start);
      start = -1;
    }
  }

  const diffs = [];
  for (let index = 1; index < groups.length; index += 1) {
    const diff = groups[index] - groups[index - 1];
    if (diff >= 2 && diff <= 18) {
      diffs.push(diff);
    }
  }

  if (diffs.length < 12) return null;
  return {
    spacing: getMedian(diffs),
    tickCount: groups.length,
    diffCount: diffs.length,
  };
}

function estimateTemplateRulerPxPerMm(image) {
  if (typeof document === "undefined" || !image) return null;

  const rawWidth = image.naturalWidth || image.width || 0;
  const rawHeight = image.naturalHeight || image.height || 0;
  if (!rawWidth || !rawHeight) return null;

  const maxScanSize = 1100;
  const scanScale = Math.min(
    maxScanSize / rawWidth,
    maxScanSize / rawHeight,
    1,
  );
  const scanWidth = Math.max(1, Math.round(rawWidth * scanScale));
  const scanHeight = Math.max(1, Math.round(rawHeight * scanScale));
  const canvas = document.createElement("canvas");
  canvas.width = scanWidth;
  canvas.height = scanHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(image, 0, 0, scanWidth, scanHeight);
    const pixels = ctx.getImageData(0, 0, scanWidth, scanHeight).data;
    const isGreenPixel = (index) => {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];
      return a > 50 && g > 90 && g > r * 1.65 && g > b * 1.65;
    };

    const verticalBandWidth = clamp(Math.round(scanWidth * 0.075), 18, 46);
    const verticalProjection = new Array(scanHeight).fill(0);
    for (let y = 0; y < scanHeight; y += 1) {
      let count = 0;
      for (let x = 0; x < verticalBandWidth; x += 1) {
        if (isGreenPixel((y * scanWidth + x) * 4)) count += 1;
      }
      verticalProjection[y] = count;
    }

    const horizontalBandHeight = clamp(Math.round(scanHeight * 0.07), 18, 52);
    const horizontalProjection = new Array(scanWidth).fill(0);
    for (let x = 0; x < scanWidth; x += 1) {
      let count = 0;
      for (let y = 0; y < horizontalBandHeight; y += 1) {
        if (isGreenPixel((y * scanWidth + x) * 4)) count += 1;
      }
      horizontalProjection[x] = count;
    }

    const vertical = getProjectionTickSpacing(
      verticalProjection,
      Math.max(4, Math.round(verticalBandWidth * 0.18)),
    );
    const horizontal = getProjectionTickSpacing(
      horizontalProjection,
      Math.max(4, Math.round(horizontalBandHeight * 0.18)),
    );
    const candidates = [
      vertical
        ? {
            axis: "vertical",
            pxPerMm: vertical.spacing / scanScale,
            confidence: vertical.diffCount,
          }
        : null,
      horizontal
        ? {
            axis: "horizontal",
            pxPerMm: horizontal.spacing / scanScale,
            confidence: horizontal.diffCount,
          }
        : null,
    ].filter(Boolean);

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];
    if (!Number.isFinite(best.pxPerMm) || best.pxPerMm <= 0) return null;
    return best;
  } catch {
    return null;
  }
}

function getLayerCorners(layer) {
  const size = getLayerDisplaySize(layer);
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  const corners = [
    { key: "tl", x: -halfW, y: -halfH },
    { key: "tr", x: halfW, y: -halfH },
    { key: "br", x: halfW, y: halfH },
    { key: "bl", x: -halfW, y: halfH },
  ];

  return corners.map((corner) => {
    const rotated = rotateVector(corner.x, corner.y, layer.rotation);
    return {
      key: corner.key,
      x: layer.centerX + rotated.x,
      y: layer.centerY + rotated.y,
    };
  });
}

function distancePointToSegment(point, line) {
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

function drawTag(ctx, x, y, text, color, options = {}) {
  const fontSize = options.fontSize ?? 10;
  const paddingX = options.paddingX ?? 5;
  const paddingY = options.paddingY ?? 3;
  const bgOpacity = options.bgOpacity ?? DEFAULT_LABEL_OPACITY;
  const textOpacity = options.textOpacity ?? 0.94;
  const radius = options.radius ?? 5;
  const borderOpacity = options.borderOpacity ?? 0.9;

  ctx.save();
  ctx.font = `${fontSize}px Inter, sans-serif`;
  const textMetrics = ctx.measureText(text);
  const width = textMetrics.width + paddingX * 2;
  const height = fontSize + paddingY * 2 + 4;

  ctx.fillStyle = `rgba(15, 23, 42, ${bgOpacity})`;
  ctx.strokeStyle = color;
  ctx.globalAlpha = borderOpacity;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, radius);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = textOpacity;
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(text, x - width / 2 + paddingX, y + fontSize / 2 - 0.5);
  ctx.restore();
}

function getTagBounds(x, y, text, options = {}) {
  const fontSize = options.fontSize ?? 10;
  const paddingX = options.paddingX ?? 5;
  const paddingY = options.paddingY ?? 3;
  const estimatedWidth = Math.max(
    fontSize * 3.4,
    String(text || "").length * fontSize * 0.58 + paddingX * 2,
  );
  const height = fontSize + paddingY * 2 + 4;

  return {
    left: x - estimatedWidth / 2,
    right: x + estimatedWidth / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-600"
        aria-label="Info"
      >
        !
      </button>
      <AnimatePresence>
        {open ? (
          <motion.span
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-none absolute top-[120%] left-1/2 z-30 w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-slate-900 px-2 py-1.5 text-[11px] leading-snug text-slate-100 shadow-md"
          >
            {text}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

const ICON_COMPONENTS = {
  draw: PencilLine,
  pan: Hand,
  cut: Scissors,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  fit: Maximize2,
  rotateLeft: RotateCcw,
  rotateRight: RotateCw,
  flipH: FlipHorizontal2,
  flipV: FlipVertical2,
  resetCrop: Crop,
  preset: Ruler,
  saveCal: BadgeCheck,
  trash: Trash2,
  clear: Eraser,
  lock: Lock,
  unlock: LockOpen,
  reset: RefreshCcw,
  upload: Upload,
  camera: Camera,
  target: Target,
  menu: Menu,
  close: X,
  moveLeft: MoveLeft,
  moveRight: MoveRight,
  save: Save,
  history: History,
  undo: Undo2,
  redo: Redo2,
  angle: DraftingCompass,
  circle: CircleIcon,
  hka: Bone,
  compare: GitCompare,
  export: Download,
  package: Package,
  cloudOff: CloudOff,
  minus: Minus,
  plus: Plus,
  moveUp: MoveUp,
  moveDown: MoveDown,
};

function Icon({ name, className = "h-4 w-4" }) {
  const IconComponent = ICON_COMPONENTS[name];
  if (!IconComponent) return null;
  return (
    <IconComponent className={className} strokeWidth={2} aria-hidden="true" />
  );
}

function IconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  tone = "slate",
  className = "",
}) {
  const activeClass =
    tone === "emerald"
      ? "border-emerald-600 bg-emerald-600 text-white"
      : tone === "rose"
        ? "border-rose-500 bg-rose-500 text-white"
        : tone === "amber"
          ? "border-amber-500 bg-amber-500 text-white"
          : "border-slate-900 bg-slate-900 text-white";
  const idleClass =
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-100";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      whileHover={disabled ? undefined : BUTTON_HOVER}
      whileTap={disabled ? undefined : BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition sm:h-9 sm:w-9 ${
        active ? activeClass : idleClass
      } disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      <Icon name={icon} />
    </motion.button>
  );
}

const TOOL_ICON_COMPONENTS = {
  draw: PencilLine,
  pan: Hand,
  cut: Scissors,
  angle: DraftingCompass,
  circle: CircleIcon,
  hka: Bone,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  fit: Maximize2,
  undo: Undo2,
  redo: Redo2,
};

function ToolIconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  className = "",
}) {
  const ToolIcon = TOOL_ICON_COMPONENTS[icon];
  const stateClass = active
    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      whileHover={disabled ? undefined : BUTTON_HOVER}
      whileTap={disabled ? undefined : BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition sm:h-9 sm:w-9 ${stateClass} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {ToolIcon ? (
        <ToolIcon className="h-4 w-4" strokeWidth={2} />
      ) : (
        <Icon name={icon} />
      )}
    </motion.button>
  );
}

function ColorSwatchButton({
  color,
  active = false,
  onClick,
  label = "Pilih warna",
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      whileHover={BUTTON_HOVER}
      whileTap={BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
        active
          ? "border-slate-900 bg-white shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span
        className="h-4 w-4 rounded-full border border-white/70"
        style={{ backgroundColor: color }}
      />
    </motion.button>
  );
}

function CompactSliderField({
  label,
  valueText,
  min,
  max,
  step = 1,
  value,
  onChange,
  onDecrease,
  onIncrease,
  decreaseIcon = "minus",
  increaseIcon = "plus",
  disabled = false,
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-600">
        <span>{label}</span>
        <span className="text-slate-400">{valueText}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <IconButton
          icon={decreaseIcon}
          label={`${label} kurang`}
          onClick={onDecrease}
          disabled={disabled}
          className="h-7 w-7 shrink-0"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-45"
        />
        <IconButton
          icon={increaseIcon}
          label={`${label} tambah`}
          onClick={onIncrease}
          disabled={disabled}
          className="h-7 w-7 shrink-0"
        />
      </div>
    </div>
  );
}

export default function XrayCalibrationWorkspace() {
  const containerRef = useRef(null);
  const calibrationPanelRef = useRef(null);
  const compareContainerRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const compareCanvasRef = useRef(null);
  const layerUploadInputRef = useRef(null);
  const compareUploadInputRef = useRef(null);
  const measurePanelRef = useRef(null);
  const layerSettingsPanelRef = useRef(null);
  const exportPanelRef = useRef(null);
  const interactionRef = useRef({ mode: null, startX: 0, startY: 0 });
  const objectUrlRef = useRef(null);
  const compareObjectUrlRef = useRef(null);
  const saveDebounceRef = useRef(null);
  const storageWarningRef = useRef(false);
  const skipNextAutosaveRef = useRef(false);
  const restoredRef = useRef(false);
  const sidebarResizeRef = useRef(null);
  const templateSyncingRef = useRef(false);
  const sheetImageSyncingRef = useRef(false);
  const mobileLineTapRef = useRef({
    targetType: null,
    lineId: null,
    handleKey: null,
    time: 0,
  });
  const nextLineIdRef = useRef(1);
  const nextAngleIdRef = useRef(1);
  const nextCircleIdRef = useRef(1);
  const nextHkaIdRef = useRef(1);
  const nextCutLayerIdRef = useRef(1);
  const historyPastRef = useRef([]);
  const historyFutureRef = useRef([]);
  const historyCurrentRef = useRef(null);
  const historyApplyingRef = useRef(false);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [compareViewport, setCompareViewport] = useState({
    width: 0,
    height: 0,
  });
  const [image, setImage] = useState(null);
  const [mainImageSrc, setMainImageSrc] = useState(null);
  const [compareImage, setCompareImage] = useState(null);
  const [compareImageSrc, setCompareImageSrc] = useState(null);
  const [compareImageName, setCompareImageName] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [imageName, setImageName] = useState("");
  const [tool, setTool] = useState("draw");
  const [view, setView] = useState({ scale: 1, panX: 0, panY: 0 });
  const [lines, setLines] = useState([]);
  const [draftLine, setDraftLine] = useState(null);
  const [angles, setAngles] = useState([]);
  const [draftAnglePoints, setDraftAnglePoints] = useState([]);
  const [circles, setCircles] = useState([]);
  const [draftCirclePoints, setDraftCirclePoints] = useState([]);
  const [hkaSets, setHkaSets] = useState([]);
  const [draftHkaPoints, setDraftHkaPoints] = useState([]);
  const [draftCut, setDraftCut] = useState(null);
  const [cutLayers, setCutLayers] = useState([]);
  const [templateLibrary, setTemplateLibrary] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedImplantType, setSelectedImplantType] = useState(
    LOCAL_IMPLANT_LIBRARY_TYPES[0] || "stem",
  );
  const [selectedImplantLibraryId, setSelectedImplantLibraryId] = useState(
    LOCAL_IMPLANT_LIBRARY[0]?.id || null,
  );
  const [isTemplateSyncing, setIsTemplateSyncing] = useState(false);
  const [sheetMainImages, setSheetMainImages] = useState([]);
  const [selectedSheetMainImageId, setSelectedSheetMainImageId] =
    useState(null);
  const [isSheetMainImageSyncing, setIsSheetMainImageSyncing] = useState(false);
  const [sheetMainImageEndpoint, setSheetMainImageEndpoint] = useState(
    DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT,
  );
  const [snapToLandmarks, setSnapToLandmarks] = useState(true);
  const [selectedCutLayerId, setSelectedCutLayerId] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [selectedAngleId, setSelectedAngleId] = useState(null);
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const [selectedHkaId, setSelectedHkaId] = useState(null);
  const [calibrationLineId, setCalibrationLineId] = useState(null);
  const [lockedLineIds, setLockedLineIds] = useState(new Set());
  const [mmPerPixel, setMmPerPixel] = useState(null);
  const [calibrationMode, setCalibrationMode] = useState("line");
  const [sourceZoomPercent, setSourceZoomPercent] = useState("100");
  const [mmPerPixelAt100Input, setMmPerPixelAt100Input] = useState("0.63");
  const [actualMmInput, setActualMmInput] = useState("13");
  const [actualUnit, setActualUnit] = useState("cm");
  const [templateRealSizeInput, setTemplateRealSizeInput] = useState("");
  const [templateRealSizeUnit, setTemplateRealSizeUnit] = useState("cm");
  const [templateRealSizeAxis, setTemplateRealSizeAxis] = useState("height");
  const [copiedTemplateScale, setCopiedTemplateScale] = useState(null);
  const [measurementUnit, setMeasurementUnit] = useState("cm");
  const [linePreset, setLinePreset] = useState("normal");
  const [measureAnatomyTab, setMeasureAnatomyTab] = useState("knee");
  const [contrast, setContrast] = useState(100);
  const [level, setLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(true);
  const [mobilePanelMode, setMobilePanelMode] = useState("workspace");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [mobileHandleAssist, setMobileHandleAssist] = useState(null);
  const [activeRightPanel, setActiveRightPanel] = useState("tool");
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(
    LEFT_SIDEBAR_DEFAULT_WIDTH,
  );
  const [rightSidebarWidth, setRightSidebarWidth] = useState(
    RIGHT_SIDEBAR_DEFAULT_WIDTH,
  );
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const [historyPaused, setHistoryPaused] = useState(false);
  const [showStartupCalibrationAlert, setShowStartupCalibrationAlert] =
    useState(true);
  const [highlightCalibrationPanel, setHighlightCalibrationPanel] =
    useState(false);
  const [notice, setNotice] = useState(
    "Upload gambar lalu tarik garis. Garis yang sudah ada bisa di-adjust dengan drag titik ujung atau geser garis.",
  );
  const [actionToast, setActionToast] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [planNote, setPlanNote] = useState("");
  const [planSteps, setPlanSteps] = useState([]);
  const [planningGuides, setPlanningGuides] = useState([]);
  const [selectedPlanningGuideId, setSelectedPlanningGuideId] = useState(null);
  const [planningGuideMode, setPlanningGuideMode] = useState("valgusCut");
  const [valgusCutAngleDeg, setValgusCutAngleDeg] = useState(5);
  const [valgusCutSide, setValgusCutSide] = useState("Right");
  const [valgusCutOffsetPx, setValgusCutOffsetPx] = useState(10);
  const [valgusCutLineLengthPx, setValgusCutLineLengthPx] = useState(100);
  const [tibialSlopeDeg, setTibialSlopeDeg] = useState(7);
  const [tibialPosteriorSide, setTibialPosteriorSide] = useState("Right");
  const [tibialSlopeOffsetPx, setTibialSlopeOffsetPx] = useState(10);
  const [tibialSlopeLineLengthPx, setTibialSlopeLineLengthPx] = useState(90);
  const [tibialCutAngleDeg, setTibialCutAngleDeg] = useState(0);
  const [tibialCutDirection, setTibialCutDirection] = useState("Valgus");
  const [tibialCutOffsetPx, setTibialCutOffsetPx] = useState(10);
  const [tibialCutLineLengthPx, setTibialCutLineLengthPx] = useState(90);
  const [planningGuideLabelOffsetX, setPlanningGuideLabelOffsetX] = useState(
    DEFAULT_GUIDE_LABEL_OFFSET_X,
  );
  const [planningGuideLabelOffsetY, setPlanningGuideLabelOffsetY] = useState(
    DEFAULT_GUIDE_LABEL_OFFSET_Y,
  );
  const [planningGuideLabelOpacity, setPlanningGuideLabelOpacity] = useState(
    DEFAULT_LABEL_OPACITY,
  );

  const imageWidth = image?.naturalWidth || image?.width || 0;
  const imageHeight = image?.naturalHeight || image?.height || 0;
  const modelWidth = cropRect?.width || imageWidth;
  const modelHeight = cropRect?.height || imageHeight;
  const orientedSize = useMemo(
    () => getOrientedSize(modelWidth, modelHeight, rotation),
    [modelHeight, modelWidth, rotation],
  );
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const viewportQuery = window.matchMedia("(max-width: 1023px)");
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const updateMobileState = () => {
      setIsMobileViewport(viewportQuery.matches);
      setIsCoarsePointer(coarseQuery.matches);
    };

    updateMobileState();
    viewportQuery.addEventListener("change", updateMobileState);
    coarseQuery.addEventListener("change", updateMobileState);
    window.addEventListener("resize", updateMobileState);
    return () => {
      viewportQuery.removeEventListener("change", updateMobileState);
      coarseQuery.removeEventListener("change", updateMobileState);
      window.removeEventListener("resize", updateMobileState);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) return;
    setMobileControlsOpen(false);
    setMobilePanelMode("workspace");
    setTool((prev) => (prev === "draw" ? MOBILE_IDLE_TOOL : prev));
  }, [isMobileViewport]);

  const shouldUseMobileOneShotTool = isMobileViewport && isCoarsePointer;

  const getIdleTool = useCallback(
    () => (shouldUseMobileOneShotTool ? MOBILE_IDLE_TOOL : "draw"),
    [shouldUseMobileOneShotTool],
  );
  const sheetMainImageEndpointHost = useMemo(() => {
    const url = String(sheetMainImageEndpoint || "").trim();
    if (!url) return "";
    try {
      return new URL(url).host;
    } catch {
      return "URL tidak valid";
    }
  }, [sheetMainImageEndpoint]);

  const selectedLine = useMemo(
    () => lines.find((line) => line.id === selectedLineId) || null,
    [lines, selectedLineId],
  );
  const selectedAngle = useMemo(
    () => angles.find((item) => item.id === selectedAngleId) || null,
    [angles, selectedAngleId],
  );
  const selectedCircle = useMemo(
    () => circles.find((item) => item.id === selectedCircleId) || null,
    [circles, selectedCircleId],
  );
  const selectedHka = useMemo(
    () => hkaSets.find((item) => item.id === selectedHkaId) || null,
    [hkaSets, selectedHkaId],
  );
  const selectedCutLayer = useMemo(
    () => cutLayers.find((layer) => layer.id === selectedCutLayerId) || null,
    [cutLayers, selectedCutLayerId],
  );
  const selectedPlanningGuide = useMemo(
    () =>
      planningGuides.find((guide) => guide.id === selectedPlanningGuideId) ||
      null,
    [planningGuides, selectedPlanningGuideId],
  );
  const selectedImplantLibraryItem = useMemo(
    () =>
      getImplantLibraryItemById(
        selectedImplantLibraryId,
        LOCAL_IMPLANT_LIBRARY,
      ),
    [selectedImplantLibraryId],
  );
  const selectedCutLayerIndex = useMemo(
    () => cutLayers.findIndex((layer) => layer.id === selectedCutLayerId),
    [cutLayers, selectedCutLayerId],
  );
  const selectedLayerPalette = useMemo(
    () => (selectedCutLayer ? getLayerPalette(selectedCutLayer.id) : null),
    [selectedCutLayer],
  );
  const selectedLayerMetrics = useMemo(() => {
    if (!selectedCutLayer) return null;

    const normalizedRotation =
      (((Number(selectedCutLayer.rotation) || 0) % 360) + 360) % 360;
    const layerWidth = Math.max(
      16,
      Math.round(
        Number(
          selectedCutLayer.displayWidth || selectedCutLayer.sourceWidth || 16,
        ),
      ),
    );
    const layerHeight = Math.max(
      16,
      Math.round(
        Number(
          selectedCutLayer.displayHeight || selectedCutLayer.sourceHeight || 16,
        ),
      ),
    );

    return {
      centerX: Math.round(Number(selectedCutLayer.centerX || 0)),
      centerY: Math.round(Number(selectedCutLayer.centerY || 0)),
      centerXMax: Math.max(1, Math.round(modelWidth || 1)),
      centerYMax: Math.max(1, Math.round(modelHeight || 1)),
      height: layerHeight,
      heightMax: Math.max(200, Math.round(modelHeight * 2) || 200),
      opacity: Math.round((selectedCutLayer.opacity ?? 1) * 100),
      rotation: Math.round(
        normalizedRotation > 180
          ? normalizedRotation - 360
          : normalizedRotation,
      ),
      width: layerWidth,
      widthMax: Math.max(200, Math.round(modelWidth * 2) || 200),
      widthMm: mmPerPixel !== null ? layerWidth * mmPerPixel : null,
      heightMm: mmPerPixel !== null ? layerHeight * mmPerPixel : null,
    };
  }, [mmPerPixel, modelHeight, modelWidth, selectedCutLayer]);
  const selectedAngleMetrics = useMemo(() => {
    if (!selectedAngle) return null;

    return {
      color: selectedAngle.color || DEFAULT_ANGLE_COLOR,
      labelOffsetX: Number.isFinite(selectedAngle.labelOffsetX)
        ? selectedAngle.labelOffsetX
        : DEFAULT_ANGLE_LABEL_OFFSET_X,
      labelOffsetY: Number.isFinite(selectedAngle.labelOffsetY)
        ? selectedAngle.labelOffsetY
        : DEFAULT_ANGLE_LABEL_OFFSET_Y,
      labelOpacity: Math.round(
        (Number.isFinite(selectedAngle.labelOpacity)
          ? selectedAngle.labelOpacity
          : DEFAULT_LABEL_OPACITY) * 100,
      ),
      strokeWidth: Number.isFinite(selectedAngle.strokeWidth)
        ? selectedAngle.strokeWidth
        : DEFAULT_ANGLE_STROKE_WIDTH,
      valueDeg: getAngleDegrees(
        selectedAngle.p1,
        selectedAngle.p2,
        selectedAngle.p3,
      ),
    };
  }, [selectedAngle]);
  const selectedLayerCanApplyRealSize =
    isImageBackedLayerKind(selectedCutLayer?.kind) &&
    mmPerPixel !== null &&
    !selectedCutLayer.lockScale;
  const selectedLayerCanTrim =
    isImageBackedLayerKind(selectedCutLayer?.kind) &&
    Boolean(selectedCutLayer.image) &&
    !selectedCutLayer.lockScale;
  const selectedLayerCanApplyRulerScale =
    isImageBackedLayerKind(selectedCutLayer?.kind) &&
    Boolean(selectedCutLayer.image) &&
    mmPerPixel !== null &&
    !selectedCutLayer.lockScale;
  const selectedLayerCanPasteScale =
    isImageBackedLayerKind(selectedCutLayer?.kind) &&
    Boolean(copiedTemplateScale) &&
    !selectedCutLayer.lockScale;
  const isSelectedLineLocked = selectedLine
    ? lockedLineIds.has(selectedLine.id)
    : false;

  const focusLayerSettings = useCallback(
    (layerId) => {
      setSelectedCutLayerId(layerId);
      setMobilePanelMode("workspace");
      if (isMobileViewport) {
        setMobileControlsOpen(true);
      }
      setActiveRightPanel("tool");
    },
    [isMobileViewport],
  );

  const clearMobileHandleAssist = useCallback(() => {
    setMobileHandleAssist(null);
  }, []);

  const activateMobileHandleAssist = useCallback((lineId, handleKey) => {
    setMobileHandleAssist({ lineId, handleKey });
  }, []);

  const resetMobileLineTapTarget = useCallback(() => {
    mobileLineTapRef.current = {
      targetType: null,
      lineId: null,
      handleKey: null,
      time: 0,
    };
  }, []);

  const isRepeatedMobileLineTap = useCallback(
    ({ targetType, lineId, handleKey = null }) => {
      const previousTap = mobileLineTapRef.current;
      const now = Date.now();
      const isSameTarget =
        previousTap.targetType === targetType &&
        previousTap.lineId === lineId &&
        previousTap.handleKey === handleKey;
      mobileLineTapRef.current = {
        targetType,
        lineId,
        handleKey,
        time: now,
      };
      return isSameTarget && now - previousTap.time <= MOBILE_DOUBLE_TAP_MS;
    },
    [],
  );

  const updateLayerById = useCallback((layerId, updater) => {
    setCutLayers((prev) =>
      prev.map((item) => {
        if (item.id !== layerId) return item;
        return typeof updater === "function"
          ? updater(item)
          : { ...item, ...updater };
      }),
    );
  }, []);

  const updateAngleById = useCallback((angleId, updater) => {
    setAngles((prev) =>
      prev.map((item) => {
        if (item.id !== angleId) return item;
        return typeof updater === "function"
          ? updater(item)
          : { ...item, ...updater };
      }),
    );
  }, []);

  const formatTemplateLayerRealSize = useCallback(
    (valueMm) => {
      if (valueMm === null || !Number.isFinite(valueMm)) return "-";
      if (templateRealSizeUnit === "cm")
        return `${(valueMm / 10).toFixed(2)} cm`;
      return `${valueMm.toFixed(1)} mm`;
    },
    [templateRealSizeUnit],
  );

  const selectedLengthPx = selectedLine ? getLineLength(selectedLine) : 0;
  const hasCalibration = mmPerPixel !== null;
  const nonCalibrationLineCount = useMemo(
    () => lines.filter((line) => line.id !== calibrationLineId).length,
    [calibrationLineId, lines],
  );
  const measurementEntityCount =
    nonCalibrationLineCount + angles.length + circles.length + hkaSets.length;
  const workflowStep = useMemo(() => {
    if (!image) return 1;
    if (!hasCalibration) return 2;
    if (measurementEntityCount === 0) return 3;
    return 4;
  }, [hasCalibration, image, measurementEntityCount]);
  const calibrationQuality = useMemo(() => {
    const zoomPercent = Number(sourceZoomPercent);
    const safeZoomPercent =
      Number.isFinite(zoomPercent) && zoomPercent > 0 ? zoomPercent : null;

    if (calibrationMode === "zoom") {
      const factorAt100 = Number(mmPerPixelAt100Input);
      if (!Number.isFinite(factorAt100) || factorAt100 <= 0) {
        return {
          status: "bad",
          title: "QC: Input belum valid",
          detail: "Isi mm/px @100% dengan angka > 0.",
        };
      }
      return {
        status: safeZoomPercent === 100 ? "warn" : "warn",
        title: "QC: Mode zoom hanya estimasi",
        detail:
          safeZoomPercent === null
            ? "Isi zoom source yang valid untuk menghindari mismatch skala."
            : `Zoom source ${safeZoomPercent.toFixed(2)}%. Verifikasi ulang dengan ruler jika tersedia.`,
      };
    }

    const referenceLine =
      lines.find((line) => line.id === calibrationLineId) ||
      selectedLine ||
      lines.find((line) => line.type === "normal") ||
      null;
    if (!referenceLine) {
      return {
        status: "bad",
        title: "QC: Belum ada garis referensi",
        detail:
          "Tarik garis pada ruler X-ray (semakin panjang semakin stabil).",
      };
    }

    const lengthPx = getLineLength(referenceLine);
    if (!Number.isFinite(lengthPx) || lengthPx <= 0) {
      return {
        status: "bad",
        title: "QC: Garis referensi tidak valid",
        detail: "Ulangi tarik garis kalibrasi.",
      };
    }

    const endpointTolerancePx = 2;
    const relativeErrorPct = (endpointTolerancePx / lengthPx) * 100;
    const absoluteErrorMm =
      mmPerPixel !== null
        ? (endpointTolerancePx * mmPerPixel).toFixed(2)
        : null;
    const zoomHint =
      safeZoomPercent !== null && Math.abs(safeZoomPercent - 100) > 0.01
        ? ` | Zoom ${safeZoomPercent.toFixed(0)}%`
        : "";

    if (lengthPx < 60 || relativeErrorPct > 3.5) {
      return {
        status: "bad",
        title: "QC: Rendah",
        detail: `Estimasi error ±${relativeErrorPct.toFixed(2)}%${absoluteErrorMm ? ` (±${absoluteErrorMm} mm)` : ""}. Garis referensi terlalu pendek.${zoomHint}`,
      };
    }
    if (lengthPx < 110 || relativeErrorPct > 1.8) {
      return {
        status: "warn",
        title: "QC: Sedang",
        detail: `Estimasi error ±${relativeErrorPct.toFixed(2)}%${absoluteErrorMm ? ` (±${absoluteErrorMm} mm)` : ""}. Disarankan perpanjang garis ruler.${zoomHint}`,
      };
    }

    return {
      status: "good",
      title: "QC: Baik",
      detail: `Estimasi error ±${relativeErrorPct.toFixed(2)}%${absoluteErrorMm ? ` (±${absoluteErrorMm} mm)` : ""}.${zoomHint}`,
    };
  }, [
    calibrationLineId,
    calibrationMode,
    lines,
    mmPerPixel,
    mmPerPixelAt100Input,
    selectedLine,
    sourceZoomPercent,
  ]);

  const formatMeasurementFromPx = useCallback(
    (lengthPx) => {
      if (mmPerPixel === null) return null;
      const valueMm = lengthPx * mmPerPixel;
      if (measurementUnit === "cm") {
        return `${(valueMm / 10).toFixed(2)} cm`;
      }
      return `${valueMm.toFixed(2)} mm`;
    },
    [measurementUnit, mmPerPixel],
  );

  const lineTypeLabel = useCallback((type) => {
    if (type === "hka") return "HKA";
    if (type === "offset") return "OFFSET";
    if (type === "femoralOffset") return "FEM-OFF";
    if (type === "globalOffset") return "GLB-OFF";
    if (type === "lld") return "LLD";
    return "LINE";
  }, []);

  const lineTypeColor = useCallback((type) => {
    if (type === "hka") return "#06b6d4";
    if (type === "offset") return "#f43f5e";
    if (type === "femoralOffset") return "#10b981";
    if (type === "globalOffset") return "#8b5cf6";
    if (type === "lld") return "#f97316";
    return "#38bdf8";
  }, []);

  const getPlanningGuideLabelText = useCallback((guide, index) => {
    if (guide.kind === "valgusCut")
      return `DC${index + 1} ${guide.side} ${guide.angleDeg}°`;
    if (guide.kind === "tibialSlope") {
      return `TS${index + 1} ${guide.posteriorSide} ${guide.angleDeg}°`;
    }
    return `TC${index + 1} ${guide.direction} ${guide.angleDeg}°`;
  }, []);

  const isLineLocked = useCallback(
    (lineId) => lockedLineIds.has(lineId),
    [lockedLineIds],
  );

  useEffect(() => {
    if (!mobileHandleAssist) return;
    const stillExists = lines.some(
      (line) => line.id === mobileHandleAssist.lineId,
    );
    if (!stillExists || selectedLineId !== mobileHandleAssist.lineId) {
      setMobileHandleAssist(null);
    }
  }, [lines, mobileHandleAssist, selectedLineId]);

  const getLineLabelText = useCallback(
    (line) => {
      const lineLengthPx = getLineLength(line);
      const baseLabel =
        mmPerPixel !== null
          ? formatMeasurementFromPx(lineLengthPx)
          : "Kalibrasi belum aktif";
      const taggedLabel = `${lineTypeLabel(line.type)}: ${baseLabel}`;
      return isLineLocked(line.id) ? `${taggedLabel} [LOCK]` : taggedLabel;
    },
    [formatMeasurementFromPx, isLineLocked, lineTypeLabel, mmPerPixel],
  );

  useEffect(() => {
    if (!selectedPlanningGuide) {
      setPlanningGuideLabelOffsetX(DEFAULT_GUIDE_LABEL_OFFSET_X);
      setPlanningGuideLabelOffsetY(DEFAULT_GUIDE_LABEL_OFFSET_Y);
      setPlanningGuideLabelOpacity(DEFAULT_LABEL_OPACITY);
      return;
    }

    setPlanningGuideMode(selectedPlanningGuide.kind || "valgusCut");
    setPlanningGuideLabelOffsetX(
      Number.isFinite(selectedPlanningGuide.labelOffsetX)
        ? selectedPlanningGuide.labelOffsetX
        : DEFAULT_GUIDE_LABEL_OFFSET_X,
    );
    setPlanningGuideLabelOffsetY(
      Number.isFinite(selectedPlanningGuide.labelOffsetY)
        ? selectedPlanningGuide.labelOffsetY
        : DEFAULT_GUIDE_LABEL_OFFSET_Y,
    );
    setPlanningGuideLabelOpacity(
      Number.isFinite(selectedPlanningGuide.labelOpacity)
        ? selectedPlanningGuide.labelOpacity
        : DEFAULT_LABEL_OPACITY,
    );

    if (selectedPlanningGuide.kind === "valgusCut") {
      setValgusCutAngleDeg(Number(selectedPlanningGuide.angleDeg) || 5);
      setValgusCutSide(selectedPlanningGuide.side || "Right");
      setValgusCutOffsetPx(Number(selectedPlanningGuide.offsetPx) || 10);
      setValgusCutLineLengthPx(
        Number(selectedPlanningGuide.lineLengthPx) || 100,
      );
      return;
    }

    if (selectedPlanningGuide.kind === "tibialSlope") {
      setTibialSlopeDeg(Number(selectedPlanningGuide.angleDeg) || 7);
      setTibialPosteriorSide(selectedPlanningGuide.posteriorSide || "Right");
      setTibialSlopeOffsetPx(Number(selectedPlanningGuide.offsetPx) || 10);
      setTibialSlopeLineLengthPx(
        Number(selectedPlanningGuide.lineLengthPx) || 90,
      );
      return;
    }

    setTibialCutAngleDeg(Number(selectedPlanningGuide.angleDeg) || 0);
    setTibialCutDirection(selectedPlanningGuide.direction || "Valgus");
    setTibialCutOffsetPx(Number(selectedPlanningGuide.offsetPx) || 10);
    setTibialCutLineLengthPx(Number(selectedPlanningGuide.lineLengthPx) || 90);
  }, [selectedPlanningGuide]);

  const serializeCutLayers = useCallback(
    () =>
      cutLayers.map((layer) => ({
        id: layer.id,
        kind: layer.kind,
        name: layer.name || "",
        sourceX: layer.sourceX,
        sourceY: layer.sourceY,
        sourceWidth: layer.sourceWidth,
        sourceHeight: layer.sourceHeight,
        displayWidth: layer.displayWidth,
        displayHeight: layer.displayHeight,
        centerX: layer.centerX,
        centerY: layer.centerY,
        rotation: layer.rotation,
        flipX: layer.flipX,
        flipY: layer.flipY,
        opacity: layer.opacity ?? 1,
        lockScale: Boolean(layer.lockScale),
        imageSrc: isImageBackedLayerKind(layer.kind)
          ? layer.imageSrc || ""
          : "",
        maskPoints: Array.isArray(layer.maskPoints)
          ? layer.maskPoints.map((point) => ({ x: point.x, y: point.y }))
          : null,
      })),
    [cutLayers],
  );

  const buildStoryPayload = useCallback(
    () => ({
      version: 1,
      savedAt: Date.now(),
      mainImageSrc,
      imageName,
      compareImageSrc,
      compareImageName,
      compareMode,
      view,
      tool,
      lines,
      angles,
      circles,
      hkaSets,
      selectedLineId,
      selectedAngleId,
      selectedCircleId,
      selectedHkaId,
      calibrationLineId,
      lockedLineIds: [...lockedLineIds],
      mmPerPixel,
      calibrationMode,
      sourceZoomPercent,
      mmPerPixelAt100Input,
      actualMmInput,
      actualUnit,
      templateRealSizeInput,
      templateRealSizeUnit,
      templateRealSizeAxis,
      measurementUnit,
      linePreset,
      contrast,
      level,
      rotation,
      flipX,
      flipY,
      cropRect,
      cutLayers: serializeCutLayers(),
      selectedCutLayerId,
      selectedTemplateId,
      selectedImplantType,
      selectedImplantLibraryId,
      templateLibrary,
      snapToLandmarks,
      leftSidebarWidth,
      rightSidebarWidth,
      showLeftSidebar,
      showRightSidebar,
      planNote,
      planSteps: planSteps.slice(-60),
      planningGuides: planningGuides.slice(-60),
      planningGuideMode,
      valgusCutAngleDeg,
      valgusCutSide,
      valgusCutOffsetPx,
      valgusCutLineLengthPx,
      tibialSlopeDeg,
      tibialPosteriorSide,
      tibialSlopeOffsetPx,
      tibialSlopeLineLengthPx,
      tibialCutAngleDeg,
      tibialCutDirection,
      tibialCutOffsetPx,
      tibialCutLineLengthPx,
      notice,
      activityLog: activityLog.slice(-120),
    }),
    [
      activityLog,
      actualMmInput,
      actualUnit,
      angles,
      calibrationLineId,
      calibrationMode,
      circles,
      compareImageName,
      compareImageSrc,
      compareMode,
      contrast,
      cropRect,
      flipX,
      flipY,
      hkaSets,
      imageName,
      leftSidebarWidth,
      level,
      lines,
      lockedLineIds,
      mainImageSrc,
      measurementUnit,
      linePreset,
      showLeftSidebar,
      showRightSidebar,
      mmPerPixel,
      mmPerPixelAt100Input,
      notice,
      planNote,
      planSteps,
      planningGuideMode,
      planningGuides,
      rightSidebarWidth,
      rotation,
      sourceZoomPercent,
      selectedAngleId,
      selectedCircleId,
      selectedCutLayerId,
      selectedHkaId,
      selectedImplantLibraryId,
      selectedImplantType,
      selectedLineId,
      selectedTemplateId,
      serializeCutLayers,
      snapToLandmarks,
      templateRealSizeAxis,
      templateRealSizeInput,
      templateRealSizeUnit,
      templateLibrary,
      tibialCutAngleDeg,
      tibialCutDirection,
      tibialCutLineLengthPx,
      tibialCutOffsetPx,
      tibialPosteriorSide,
      tibialSlopeDeg,
      tibialSlopeLineLengthPx,
      tibialSlopeOffsetPx,
      tool,
      valgusCutAngleDeg,
      valgusCutLineLengthPx,
      valgusCutOffsetPx,
      valgusCutSide,
      view,
    ],
  );

  const screenToImagePoint = useCallback(
    (screenX, screenY, currentView = view) => ({
      ...inverseOrientPoint(
        (screenX - currentView.panX) / currentView.scale,
        (screenY - currentView.panY) / currentView.scale,
        modelWidth,
        modelHeight,
        rotation,
        flipX,
        flipY,
      ),
    }),
    [flipX, flipY, modelHeight, modelWidth, rotation, view],
  );

  const imageToScreenPoint = useCallback(
    (imageX, imageY, currentView = view) => {
      const oriented = orientPoint(
        imageX,
        imageY,
        modelWidth,
        modelHeight,
        rotation,
        flipX,
        flipY,
      );

      return {
        x: oriented.x * currentView.scale + currentView.panX,
        y: oriented.y * currentView.scale + currentView.panY,
      };
    },
    [flipX, flipY, modelHeight, modelWidth, rotation, view],
  );

  const findMobileHandleAssistHit = useCallback(
    (screenPoint) => {
      if (!isCoarsePointer || !mobileHandleAssist) return null;
      const targetLine =
        lines.find((line) => line.id === mobileHandleAssist.lineId) || null;
      if (!targetLine) return null;

      const handleImagePoint =
        mobileHandleAssist.handleKey === "start"
          ? { x: targetLine.x1, y: targetLine.y1 }
          : { x: targetLine.x2, y: targetLine.y2 };
      const handleScreenPoint = imageToScreenPoint(
        handleImagePoint.x,
        handleImagePoint.y,
      );
      const distance = Math.hypot(
        screenPoint.x - handleScreenPoint.x,
        screenPoint.y - handleScreenPoint.y,
      );

      if (distance > MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN) {
        return null;
      }

      return {
        lineId: targetLine.id,
        handleKey: mobileHandleAssist.handleKey,
      };
    },
    [imageToScreenPoint, isCoarsePointer, lines, mobileHandleAssist],
  );

  const clampToImageBounds = useCallback(
    (point) => {
      if (!modelWidth || !modelHeight) return point;
      return {
        x: clamp(point.x, 0, modelWidth),
        y: clamp(point.y, 0, modelHeight),
      };
    },
    [modelHeight, modelWidth],
  );

  const fitImageToViewport = useCallback(() => {
    if (
      !orientedSize.width ||
      !orientedSize.height ||
      !viewport.width ||
      !viewport.height
    ) {
      return;
    }

    const safeWidth = Math.max(viewport.width - 40, 80);
    const safeHeight = Math.max(viewport.height - 40, 80);
    const fittedScale = Math.min(
      safeWidth / orientedSize.width,
      safeHeight / orientedSize.height,
    );
    const nextScale = clamp(fittedScale, MIN_SCALE, 1);

    setView({
      scale: nextScale,
      panX: (viewport.width - orientedSize.width * nextScale) / 2,
      panY: (viewport.height - orientedSize.height * nextScale) / 2,
    });
  }, [
    orientedSize.height,
    orientedSize.width,
    viewport.height,
    viewport.width,
  ]);

  const scrollToPanel = useCallback((panelRef) => {
    setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 90);
  }, []);

  const focusCalibrationStep = useCallback(
    (
      message = "Lakukan kalibrasi dulu pada ruler X-ray agar measurement akurat.",
    ) => {
      setShowStartupCalibrationAlert(false);
      setMobileControlsOpen(true);
      setMobilePanelMode("setup");
      setCalibrationMode("line");
      setTool(getIdleTool());
      setNotice(message);
      setHighlightCalibrationPanel(true);
      setTimeout(() => {
        setHighlightCalibrationPanel(false);
      }, 1700);

      setTimeout(() => {
        const panel = calibrationPanelRef.current;
        if (!panel) return;
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusTarget = panel.querySelector("input,select,button");
        if (focusTarget && typeof focusTarget.focus === "function") {
          focusTarget.focus();
        }
      }, 90);
    },
    [getIdleTool],
  );

  const focusMeasureStep = useCallback(() => {
    setMobileControlsOpen(true);
    setMobilePanelMode("workspace");
    setActiveRightPanel("measure");
    setTool(getIdleTool());
    scrollToPanel(measurePanelRef);
  }, [getIdleTool, scrollToPanel]);

  const focusExportStep = useCallback(() => {
    if (!hasCalibration) {
      focusCalibrationStep("Export report dikunci sampai kalibrasi aktif.");
      return;
    }
    setMobileControlsOpen(true);
    setMobilePanelMode("setup");
    scrollToPanel(exportPanelRef);
  }, [focusCalibrationStep, hasCalibration, scrollToPanel]);

  const handleToolChange = useCallback(
    (nextTool) => {
      const requiresCalibration =
        nextTool === "angle" || nextTool === "circle" || nextTool === "hkaAuto";
      if (requiresCalibration && !hasCalibration) {
        focusCalibrationStep(
          "Kalibrasi wajib sebelum memakai Angle/Circle/HKA.",
        );
        return;
      }
      setMobilePanelMode("workspace");
      setActiveRightPanel("tool");
      resetMobileLineTapTarget();
      clearMobileHandleAssist();
      if (nextTool !== "cut") {
        setDraftCut(null);
        setHistoryPaused(false);
      }
      setTool(nextTool);
      if (isMobileViewport) {
        setMobileControlsOpen(false);
      }
    },
    [
      clearMobileHandleAssist,
      focusCalibrationStep,
      hasCalibration,
      isMobileViewport,
      resetMobileLineTapTarget,
    ],
  );

  const completeDraftCut = useCallback(() => {
    if (!image || !draftCut || !Array.isArray(draftCut.points)) return false;
    if (draftCut.points.length < MIN_FREE_CUT_POINTS) {
      setNotice("Free cut butuh minimal 3 titik.");
      return false;
    }

    const nextLayer = buildFreeCutLayerFromPoints({
      sourceImage: image,
      sourceOffsetX: cropRect?.x || 0,
      sourceOffsetY: cropRect?.y || 0,
      polygonPoints: draftCut.points,
      layerId: nextCutLayerIdRef.current,
      name: `Free Cut ${nextCutLayerIdRef.current}`,
    });

    if (!nextLayer) {
      setDraftCut(null);
      setHistoryPaused(false);
      setNotice("Free cut gagal dibuat. Pastikan area cut cukup besar.");
      return false;
    }

    nextCutLayerIdRef.current += 1;
    setCutLayers((prev) => [...prev, nextLayer]);
    focusLayerSettings(nextLayer.id);
    setSelectedLineId(null);
    setSelectedAngleId(null);
    setSelectedCircleId(null);
    setSelectedHkaId(null);
    setDraftCut(null);
    setHistoryPaused(false);
    setNotice(
      nextLayer.imageSrc
        ? "Free cut berhasil dibuat sebagai layer baru."
        : "Free cut berhasil dibuat. Layer ini tampil normal, tetapi sumber remote tidak bisa diekspor ulang.",
    );
    if (shouldUseMobileOneShotTool) {
      setTool(MOBILE_IDLE_TOOL);
      setMobileControlsOpen(false);
    } else {
      setTool("draw");
    }
    return true;
  }, [
    cropRect,
    draftCut,
    focusLayerSettings,
    image,
    shouldUseMobileOneShotTool,
  ]);

  const handleLinePresetChange = useCallback(
    (nextPreset) => {
      if (nextPreset !== "normal" && !hasCalibration) {
        focusCalibrationStep(
          "Preset klinis (HKA/Offset/LLD) aktif setelah kalibrasi.",
        );
        return;
      }
      if (nextPreset === "hka") {
        setMeasureAnatomyTab("knee");
      } else if (
        nextPreset === "offset" ||
        nextPreset === "femoralOffset" ||
        nextPreset === "globalOffset" ||
        nextPreset === "lld"
      ) {
        setMeasureAnatomyTab("hip");
      }
      setMobilePanelMode("workspace");
      setActiveRightPanel("measure");
      resetMobileLineTapTarget();
      clearMobileHandleAssist();
      setLinePreset(nextPreset);
      setTool("draw");
      if (isMobileViewport) {
        setMobileControlsOpen(false);
      }
    },
    [
      clearMobileHandleAssist,
      focusCalibrationStep,
      hasCalibration,
      isMobileViewport,
      resetMobileLineTapTarget,
    ],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateViewport = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      setViewport((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    updateViewport();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewport);
      return () => window.removeEventListener("resize", updateViewport);
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setViewport((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = compareContainerRef.current;
    if (!container) return;

    const updateViewport = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      setCompareViewport((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    updateViewport();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewport);
      return () => window.removeEventListener("resize", updateViewport);
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setCompareViewport((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [compareMode]);

  useEffect(() => {
    fitImageToViewport();
  }, [fitImageToViewport]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (compareObjectUrlRef.current) {
        URL.revokeObjectURL(compareObjectUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setActivityLog((prev) => {
      const text = notice?.trim();
      if (!text) return prev;
      if (prev.length > 0 && prev[prev.length - 1].text === text) return prev;
      const nextItem = {
        id: Date.now(),
        text,
        at: new Date().toLocaleString(),
      };
      return [...prev.slice(-119), nextItem];
    });
  }, [notice]);

  useEffect(() => {
    if (!actionToast) return undefined;
    const timeoutId = window.setTimeout(() => {
      setActionToast(null);
    }, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [actionToast]);

  useEffect(() => {
    if (!selectedCutLayerId || activeRightPanel !== "tool") return undefined;
    const timeoutId = window.setTimeout(() => {
      layerSettingsPanelRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }, 60);
    return () => window.clearTimeout(timeoutId);
  }, [activeRightPanel, selectedCutLayerId]);

  useEffect(() => {
    let cancelled = false;

    const restoreWorkspace = async () => {
      if (typeof window === "undefined") return;

      try {
        const raw = window.localStorage.getItem(STORY_STORAGE_KEY);
        if (!raw) {
          restoredRef.current = true;
          return;
        }

        const payload = JSON.parse(raw);
        if (!payload || !payload.mainImageSrc) {
          restoredRef.current = true;
          return;
        }

        const restoredImage = await loadImageFromSrc(payload.mainImageSrc);
        if (cancelled) return;

        const parsedLines = Array.isArray(payload.lines) ? payload.lines : [];
        const parsedAngles = Array.isArray(payload.angles)
          ? payload.angles
          : [];
        const parsedCircles = Array.isArray(payload.circles)
          ? payload.circles
          : [];
        const parsedHkaSets = Array.isArray(payload.hkaSets)
          ? payload.hkaSets
          : [];
        const parsedCutLayers = Array.isArray(payload.cutLayers)
          ? payload.cutLayers
          : [];

        const restoredCutLayers = (
          await Promise.all(
            parsedCutLayers.map(async (layer) => {
              const baseLayer = {
                id: layer.id,
                kind: layer.kind || "cut",
                name: layer.name || "",
                sourceX: Number(layer.sourceX) || 0,
                sourceY: Number(layer.sourceY) || 0,
                sourceWidth: Number(layer.sourceWidth || layer.width) || 0,
                sourceHeight: Number(layer.sourceHeight || layer.height) || 0,
                displayWidth:
                  Number(
                    layer.displayWidth || layer.sourceWidth || layer.width,
                  ) || 0,
                displayHeight:
                  Number(
                    layer.displayHeight || layer.sourceHeight || layer.height,
                  ) || 0,
                centerX: Number(layer.centerX) || 0,
                centerY: Number(layer.centerY) || 0,
                rotation: Number(layer.rotation) || 0,
                flipX: Boolean(layer.flipX),
                flipY: Boolean(layer.flipY),
                opacity: clamp(
                  Number(
                    layer.opacity ??
                      (String(layer.kind || "cut") === "upload"
                        ? DEFAULT_TEMPLATE_LAYER_OPACITY
                        : 1),
                  ),
                  0.05,
                  1,
                ),
                lockScale: Boolean(layer.lockScale),
                imageSrc: layer.imageSrc || "",
                maskPoints: Array.isArray(layer.maskPoints)
                  ? layer.maskPoints
                      .map((point) => ({
                        x: Number(point?.x) || 0,
                        y: Number(point?.y) || 0,
                      }))
                      .filter(
                        (point) =>
                          Number.isFinite(point.x) && Number.isFinite(point.y),
                      )
                  : null,
              };

              if (
                isImageBackedLayerKind(baseLayer.kind) &&
                baseLayer.imageSrc
              ) {
                try {
                  const layerImage = await loadImageFromSrc(baseLayer.imageSrc);
                  return { ...baseLayer, image: layerImage };
                } catch {
                  return null;
                }
              }

              if (baseLayer.kind === "free-cut") {
                return null;
              }

              return baseLayer;
            }),
          )
        ).filter(Boolean);

        setImage(restoredImage);
        setMainImageSrc(payload.mainImageSrc);
        setImageName(payload.imageName || "restored-image");
        setCompareImageSrc(payload.compareImageSrc || null);
        setCompareImageName(payload.compareImageName || "");
        setCompareMode(Boolean(payload.compareMode));
        setCropRect(
          payload.cropRect || {
            x: 0,
            y: 0,
            width: restoredImage.naturalWidth || restoredImage.width,
            height: restoredImage.naturalHeight || restoredImage.height,
          },
        );
        setTool(payload.tool || "draw");
        setView(payload.view || { scale: 1, panX: 0, panY: 0 });
        setLines(parsedLines);
        setAngles(parsedAngles);
        setCircles(parsedCircles);
        setHkaSets(parsedHkaSets);
        setDraftAnglePoints([]);
        setDraftCirclePoints([]);
        setDraftHkaPoints([]);
        setSelectedLineId(payload.selectedLineId ?? null);
        setSelectedAngleId(payload.selectedAngleId ?? null);
        setSelectedCircleId(payload.selectedCircleId ?? null);
        setSelectedHkaId(payload.selectedHkaId ?? null);
        setCalibrationLineId(payload.calibrationLineId ?? null);
        setLockedLineIds(
          new Set(
            Array.isArray(payload.lockedLineIds) ? payload.lockedLineIds : [],
          ),
        );
        setMmPerPixel(payload.mmPerPixel ?? null);
        setCalibrationMode(payload.calibrationMode || "line");
        setSourceZoomPercent(payload.sourceZoomPercent || "100");
        setMmPerPixelAt100Input(payload.mmPerPixelAt100Input || "0.63");
        setActualMmInput(payload.actualMmInput || "13");
        setActualUnit(payload.actualUnit || "cm");
        setTemplateRealSizeInput(payload.templateRealSizeInput || "");
        setTemplateRealSizeUnit(payload.templateRealSizeUnit || "cm");
        setTemplateRealSizeAxis(payload.templateRealSizeAxis || "height");
        setMeasurementUnit(payload.measurementUnit || "cm");
        setLinePreset(payload.linePreset || "normal");
        setContrast(Number(payload.contrast) || 100);
        setLevel(Number(payload.level) || 100);
        setRotation(Number(payload.rotation) || 0);
        setFlipX(Boolean(payload.flipX));
        setFlipY(Boolean(payload.flipY));
        setCutLayers(restoredCutLayers);
        setSelectedCutLayerId(payload.selectedCutLayerId ?? null);
        setSelectedTemplateId(payload.selectedTemplateId ?? null);
        setSelectedImplantType(
          payload.selectedImplantType ||
            LOCAL_IMPLANT_LIBRARY_TYPES[0] ||
            "stem",
        );
        setSelectedImplantLibraryId(
          payload.selectedImplantLibraryId ??
            LOCAL_IMPLANT_LIBRARY[0]?.id ??
            null,
        );
        setTemplateLibrary((prev) =>
          mergeTemplateLibraryLists(
            Array.isArray(payload.templateLibrary)
              ? payload.templateLibrary
              : [],
            prev,
          ),
        );
        setSnapToLandmarks(payload.snapToLandmarks ?? true);
        setLeftSidebarWidth(
          clamp(
            Number(payload.leftSidebarWidth) || LEFT_SIDEBAR_DEFAULT_WIDTH,
            LEFT_SIDEBAR_MIN_WIDTH,
            LEFT_SIDEBAR_MAX_WIDTH,
          ),
        );
        setRightSidebarWidth(
          clamp(
            Number(payload.rightSidebarWidth) || RIGHT_SIDEBAR_DEFAULT_WIDTH,
            RIGHT_SIDEBAR_MIN_WIDTH,
            RIGHT_SIDEBAR_MAX_WIDTH,
          ),
        );
        setShowLeftSidebar(payload.showLeftSidebar ?? true);
        setShowRightSidebar(payload.showRightSidebar ?? true);
        setPlanNote(payload.planNote || "");
        setPlanSteps(
          Array.isArray(payload.planSteps) ? payload.planSteps.slice(-60) : [],
        );
        setPlanningGuides(
          Array.isArray(payload.planningGuides)
            ? payload.planningGuides.slice(-60)
            : [],
        );
        setPlanningGuideMode(payload.planningGuideMode || "valgusCut");
        setValgusCutAngleDeg(Number(payload.valgusCutAngleDeg) || 5);
        setValgusCutSide(payload.valgusCutSide || "Right");
        setValgusCutOffsetPx(Number(payload.valgusCutOffsetPx) || 10);
        setValgusCutLineLengthPx(Number(payload.valgusCutLineLengthPx) || 100);
        setTibialSlopeDeg(Number(payload.tibialSlopeDeg) || 7);
        setTibialPosteriorSide(payload.tibialPosteriorSide || "Right");
        setTibialSlopeOffsetPx(Number(payload.tibialSlopeOffsetPx) || 10);
        setTibialSlopeLineLengthPx(
          Number(payload.tibialSlopeLineLengthPx) || 90,
        );
        setTibialCutAngleDeg(Number(payload.tibialCutAngleDeg) || 0);
        setTibialCutDirection(payload.tibialCutDirection || "Valgus");
        setTibialCutOffsetPx(Number(payload.tibialCutOffsetPx) || 10);
        setTibialCutLineLengthPx(Number(payload.tibialCutLineLengthPx) || 90);
        setActivityLog(
          Array.isArray(payload.activityLog)
            ? payload.activityLog.slice(-120)
            : [],
        );
        setMobileControlsOpen(false);

        nextLineIdRef.current =
          parsedLines.length > 0
            ? Math.max(...parsedLines.map((line) => line.id || 0)) + 1
            : 1;
        nextAngleIdRef.current =
          parsedAngles.length > 0
            ? Math.max(...parsedAngles.map((item) => item.id || 0)) + 1
            : 1;
        nextCircleIdRef.current =
          parsedCircles.length > 0
            ? Math.max(...parsedCircles.map((item) => item.id || 0)) + 1
            : 1;
        nextHkaIdRef.current =
          parsedHkaSets.length > 0
            ? Math.max(...parsedHkaSets.map((item) => item.id || 0)) + 1
            : 1;
        nextCutLayerIdRef.current =
          restoredCutLayers.length > 0
            ? Math.max(...restoredCutLayers.map((layer) => layer.id || 0)) + 1
            : 1;

        if (payload.compareImageSrc) {
          try {
            const restoredCompareImage = await loadImageFromSrc(
              payload.compareImageSrc,
            );
            if (!cancelled) {
              setCompareImage(restoredCompareImage);
            }
          } catch {
            if (!cancelled) {
              setCompareImage(null);
            }
          }
        }

        setNotice("Story sebelumnya berhasil dimuat (offline).");
      } catch {
        setNotice("Gagal memuat story tersimpan.");
      } finally {
        restoredRef.current = true;
      }
    };

    restoreWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!restoredRef.current || typeof window === "undefined") return;
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    saveDebounceRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORY_STORAGE_KEY,
          JSON.stringify(buildStoryPayload()),
        );
        storageWarningRef.current = false;
      } catch {
        if (!storageWarningRef.current) {
          storageWarningRef.current = true;
          setNotice(
            "Penyimpanan lokal penuh. Simpan story manual atau kurangi ukuran gambar.",
          );
        }
      }
    }, 500);

    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [buildStoryPayload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TEMPLATE_LIBRARY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setTemplateLibrary((prev) => mergeTemplateLibraryLists(parsed, prev));
      }
    } catch {
      // ignore invalid local template cache
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        TEMPLATE_LIBRARY_KEY,
        JSON.stringify(templateLibrary.slice(-60)),
      );
    } catch {
      // ignore localStorage limit
    }
  }, [templateLibrary]);

  const syncTemplateLibraryFromAppwrite = useCallback(
    async ({ silent = false } = {}) => {
      if (templateSyncingRef.current) return;

      if (!hasTemplateCollectionConfig && !hasTemplateStorageConfig) {
        if (!silent) {
          setNotice(
            "Konfigurasi Appwrite template belum lengkap. Isi Database/Collection atau Bucket ID.",
          );
        }
        return;
      }

      templateSyncingRef.current = true;
      setIsTemplateSyncing(true);

      try {
        const remoteTemplates = [];
        let dbCount = 0;
        let storageCount = 0;

        if (hasTemplateCollectionConfig) {
          try {
            const response = await databases.listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.templateCollectionId,
              [Query.orderDesc("$createdAt"), Query.limit(60)],
            );
            const databaseTemplates = response.documents
              .map((doc) => {
                const imageSrc = doc.imageSrc || doc.image || doc.url || "";
                if (!imageSrc) return null;
                return {
                  id: doc.$id || Date.now(),
                  name:
                    doc.name ||
                    doc.title ||
                    `template-${String(doc.$id || "").slice(-6)}`,
                  imageSrc,
                  sourceWidth: Number(doc.sourceWidth || doc.width || 0),
                  sourceHeight: Number(doc.sourceHeight || doc.height || 0),
                  createdAt:
                    doc.createdAt || doc.$createdAt || new Date().toISOString(),
                };
              })
              .filter(Boolean);
            dbCount = databaseTemplates.length;
            remoteTemplates.push(...databaseTemplates);
          } catch {
            // ignore db source and continue with storage source
          }
        }

        if (hasTemplateStorageConfig) {
          try {
            const storageResponse = await fetch(
              "/api/appwrite-template-images?limit=60",
              {
                cache: "no-store",
              },
            );
            const storagePayload = await storageResponse.json();
            if (!storageResponse.ok || !storagePayload?.ok) {
              throw new Error(
                storagePayload?.error || `HTTP ${storageResponse.status}`,
              );
            }
            const storageTemplates = Array.isArray(storagePayload.items)
              ? storagePayload.items
              : [];
            storageCount = storageTemplates.length;
            remoteTemplates.push(...storageTemplates);
          } catch {
            // ignore storage source and keep available sources
          }
        }

        if (remoteTemplates.length > 0) {
          setTemplateLibrary((prev) =>
            mergeTemplateLibraryLists(remoteTemplates, prev),
          );
        }

        if (!silent) {
          if (remoteTemplates.length > 0) {
            setNotice(
              `Template Appwrite dimuat. DB: ${dbCount}, Storage: ${storageCount}, total: ${remoteTemplates.length}.`,
            );
          } else {
            setNotice(
              "Tidak ada template terbaca dari Appwrite atau akses ditolak.",
            );
          }
        }
      } catch {
        if (!silent) {
          setNotice(
            "Gagal memuat template dari Appwrite. Menggunakan template lokal.",
          );
        }
      } finally {
        templateSyncingRef.current = false;
        setIsTemplateSyncing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void syncTemplateLibraryFromAppwrite({ silent: true });
  }, [syncTemplateLibraryFromAppwrite]);

  const syncMainImageLibraryFromGoogleSheet = useCallback(
    async ({ silent = false } = {}) => {
      if (sheetImageSyncingRef.current) return;

      const endpoint = String(sheetMainImageEndpoint || "").trim();
      if (!endpoint) {
        if (!silent) {
          setNotice("URL endpoint Google Sheet / Apps Script belum diisi.");
        }
        return;
      }

      sheetImageSyncingRef.current = true;
      setIsSheetMainImageSyncing(true);

      try {
        const apiResponse = await fetch(
          `/api/google-sheet-images?url=${encodeURIComponent(endpoint)}`,
          {
            cache: "no-store",
          },
        );
        if (!apiResponse.ok) {
          throw new Error(`HTTP ${apiResponse.status}`);
        }
        const apiPayload = await apiResponse.json();
        if (!apiPayload?.ok || typeof apiPayload.payload !== "string") {
          throw new Error(
            apiPayload?.error || "Format payload endpoint tidak valid.",
          );
        }

        const normalizedItems = parseSheetRawText(apiPayload.payload);
        setSheetMainImages(normalizedItems);
        setSelectedSheetMainImageId((prev) => {
          if (normalizedItems.length === 0) return null;
          const stillExists = normalizedItems.some(
            (item) => String(item.id) === String(prev),
          );
          return stillExists ? prev : normalizedItems[0].id;
        });

        if (!silent) {
          if (normalizedItems.length > 0) {
            setNotice(
              `Gambar Google Sheet/Drive dimuat. Total: ${normalizedItems.length}.`,
            );
          } else {
            setNotice(
              "Endpoint terbaca, tapi belum ada gambar valid di data sheet.",
            );
          }
        }
      } catch (error) {
        if (!silent) {
          setNotice(
            `Gagal memuat daftar gambar Google Sheet/Drive: ${
              error instanceof Error ? error.message : "unknown error"
            }.`,
          );
        }
      } finally {
        sheetImageSyncingRef.current = false;
        setIsSheetMainImageSyncing(false);
      }
    },
    [sheetMainImageEndpoint],
  );

  useEffect(() => {
    void syncMainImageLibraryFromGoogleSheet({ silent: true });
  }, [syncMainImageLibraryFromGoogleSheet]);

  useEffect(() => {
    if (templateLibrary.length === 0) {
      setSelectedTemplateId(null);
      return;
    }
    const stillExists = templateLibrary.some(
      (template) => String(template.id) === String(selectedTemplateId),
    );
    if (!stillExists) {
      setSelectedTemplateId(templateLibrary[0].id);
    }
  }, [selectedTemplateId, templateLibrary]);

  useEffect(() => {
    const nextItems = LOCAL_IMPLANT_LIBRARY.filter(
      (item) => item.type === selectedImplantType,
    );
    if (nextItems.length === 0) {
      setSelectedImplantLibraryId(null);
      return;
    }
    const stillExists = nextItems.some(
      (item) => String(item.id) === String(selectedImplantLibraryId),
    );
    if (!stillExists) {
      setSelectedImplantLibraryId(nextItems[0].id);
    }
  }, [selectedImplantLibraryId, selectedImplantType]);

  useEffect(() => {
    if (sheetMainImages.length === 0) {
      setSelectedSheetMainImageId(null);
      return;
    }
    const stillExists = sheetMainImages.some(
      (imageItem) => String(imageItem.id) === String(selectedSheetMainImageId),
    );
    if (!stillExists) {
      setSelectedSheetMainImageId(sheetMainImages[0].id);
    }
  }, [sheetMainImages, selectedSheetMainImageId]);

  const getLocalPoint = useCallback((event) => {
    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const getHistorySnapshot = useCallback(
    () => ({
      lines: lines.map((item) => ({ ...item })),
      angles: angles.map((item) => ({
        ...item,
        p1: { ...item.p1 },
        p2: { ...item.p2 },
        p3: { ...item.p3 },
      })),
      circles: circles.map((item) => ({
        ...item,
        points: Array.isArray(item.points)
          ? item.points.map((point) => ({ ...point }))
          : [],
      })),
      hkaSets: hkaSets.map((item) => ({
        ...item,
        hip: { ...item.hip },
        knee: { ...item.knee },
        ankle: { ...item.ankle },
      })),
      cutLayers: cutLayers.map((layer) => ({
        ...layer,
        maskPoints: Array.isArray(layer.maskPoints)
          ? layer.maskPoints.map((point) => ({ ...point }))
          : null,
      })),
      calibrationLineId,
      lockedLineIds: [...lockedLineIds].sort((a, b) => a - b),
      mmPerPixel,
      calibrationMode,
      sourceZoomPercent,
      mmPerPixelAt100Input,
      actualMmInput,
      actualUnit,
      measurementUnit,
      linePreset,
      contrast,
      level,
      rotation,
      flipX,
      flipY,
      cropRect: cropRect
        ? {
            x: cropRect.x,
            y: cropRect.y,
            width: cropRect.width,
            height: cropRect.height,
          }
        : null,
      compareMode,
      compareImageSrc,
      compareImageName,
      snapToLandmarks,
    }),
    [
      actualMmInput,
      actualUnit,
      angles,
      calibrationMode,
      calibrationLineId,
      circles,
      compareImageName,
      compareImageSrc,
      compareMode,
      contrast,
      cropRect,
      cutLayers,
      flipX,
      flipY,
      hkaSets,
      level,
      linePreset,
      lines,
      lockedLineIds,
      measurementUnit,
      mmPerPixel,
      mmPerPixelAt100Input,
      rotation,
      sourceZoomPercent,
      snapToLandmarks,
    ],
  );

  const getHistorySignature = useCallback((snapshot) => {
    const normalizedCutLayers = snapshot.cutLayers.map((layer) => {
      const { image, ...rest } = layer;
      return { ...rest, hasImage: Boolean(image) };
    });
    return JSON.stringify({
      ...snapshot,
      cutLayers: normalizedCutLayers,
    });
  }, []);

  const refreshHistoryState = useCallback(() => {
    setHistoryState({
      undo: historyPastRef.current.length,
      redo: historyFutureRef.current.length,
    });
  }, []);

  const resetHistoryStacks = useCallback(() => {
    historyPastRef.current = [];
    historyFutureRef.current = [];
    historyCurrentRef.current = null;
    refreshHistoryState();
  }, [refreshHistoryState]);

  const applyHistorySnapshot = useCallback((snapshot) => {
    historyApplyingRef.current = true;
    setLines(snapshot.lines.map((item) => ({ ...item })));
    setAngles(
      snapshot.angles.map((item) => ({
        ...item,
        p1: { ...item.p1 },
        p2: { ...item.p2 },
        p3: { ...item.p3 },
      })),
    );
    setCircles(
      snapshot.circles.map((item) => ({
        ...item,
        points: Array.isArray(item.points)
          ? item.points.map((point) => ({ ...point }))
          : [],
      })),
    );
    setHkaSets(
      snapshot.hkaSets.map((item) => ({
        ...item,
        hip: { ...item.hip },
        knee: { ...item.knee },
        ankle: { ...item.ankle },
      })),
    );
    setCutLayers(
      snapshot.cutLayers.map((layer) => ({
        ...layer,
        maskPoints: Array.isArray(layer.maskPoints)
          ? layer.maskPoints.map((point) => ({ ...point }))
          : null,
      })),
    );
    setCalibrationLineId(snapshot.calibrationLineId);
    setLockedLineIds(new Set(snapshot.lockedLineIds));
    setMmPerPixel(snapshot.mmPerPixel);
    setCalibrationMode(snapshot.calibrationMode || "line");
    setSourceZoomPercent(snapshot.sourceZoomPercent || "100");
    setMmPerPixelAt100Input(snapshot.mmPerPixelAt100Input || "0.63");
    setActualMmInput(snapshot.actualMmInput);
    setActualUnit(snapshot.actualUnit);
    setMeasurementUnit(snapshot.measurementUnit);
    setLinePreset(snapshot.linePreset);
    setContrast(snapshot.contrast);
    setLevel(snapshot.level);
    setRotation(snapshot.rotation);
    setFlipX(snapshot.flipX);
    setFlipY(snapshot.flipY);
    setCropRect(snapshot.cropRect ? { ...snapshot.cropRect } : null);
    setCompareMode(Boolean(snapshot.compareMode));
    setCompareImageSrc(snapshot.compareImageSrc || null);
    setCompareImageName(snapshot.compareImageName || "");
    setSnapToLandmarks(snapshot.snapToLandmarks ?? true);

    setSelectedLineId(null);
    setSelectedAngleId(null);
    setSelectedCircleId(null);
    setSelectedHkaId(null);
    setSelectedCutLayerId(null);
    setSelectedPlanningGuideId(null);
    setDraftLine(null);
    setDraftCut(null);
    setDraftAnglePoints([]);
    setDraftCirclePoints([]);
    setDraftHkaPoints([]);

    setTimeout(() => {
      historyApplyingRef.current = false;
    }, 0);
  }, []);

  const undoHistory = useCallback(() => {
    if (!historyCurrentRef.current || historyPastRef.current.length === 0)
      return;
    const previous = historyPastRef.current.pop();
    historyFutureRef.current.push(historyCurrentRef.current.snapshot);
    historyCurrentRef.current = {
      snapshot: previous,
      signature: getHistorySignature(previous),
    };
    applyHistorySnapshot(previous);
    refreshHistoryState();
    setNotice("Undo berhasil.");
  }, [applyHistorySnapshot, getHistorySignature, refreshHistoryState]);

  const redoHistory = useCallback(() => {
    if (!historyCurrentRef.current || historyFutureRef.current.length === 0)
      return;
    const next = historyFutureRef.current.pop();
    historyPastRef.current.push(historyCurrentRef.current.snapshot);
    historyCurrentRef.current = {
      snapshot: next,
      signature: getHistorySignature(next),
    };
    applyHistorySnapshot(next);
    refreshHistoryState();
    setNotice("Redo berhasil.");
  }, [applyHistorySnapshot, getHistorySignature, refreshHistoryState]);

  useEffect(() => {
    if (!restoredRef.current) return;
    if (historyApplyingRef.current || historyPaused) return;

    const snapshot = getHistorySnapshot();
    const signature = getHistorySignature(snapshot);

    if (!historyCurrentRef.current) {
      historyCurrentRef.current = { snapshot, signature };
      refreshHistoryState();
      return;
    }

    if (historyCurrentRef.current.signature === signature) return;

    historyPastRef.current.push(historyCurrentRef.current.snapshot);
    if (historyPastRef.current.length > 120) {
      historyPastRef.current.shift();
    }
    historyFutureRef.current = [];
    historyCurrentRef.current = { snapshot, signature };
    refreshHistoryState();
  }, [
    getHistorySignature,
    getHistorySnapshot,
    historyPaused,
    refreshHistoryState,
  ]);

  const findClosestLineId = useCallback(
    (imagePoint) => {
      const thresholdInImage = (isCoarsePointer ? 18 : 8) / view.scale;
      let pickedId = null;
      let minDistance = Infinity;

      for (const line of lines) {
        const distance = distancePointToSegment(imagePoint, line);
        if (distance <= thresholdInImage && distance < minDistance) {
          minDistance = distance;
          pickedId = line.id;
        }
      }

      return pickedId;
    },
    [isCoarsePointer, lines, view.scale],
  );

  const findClosestPlanningGuideId = useCallback(
    (imagePoint) => {
      const thresholdInImage = 10 / view.scale;
      let pickedId = null;
      let minDistance = Infinity;

      for (const guide of planningGuides) {
        const distance = distancePointToSegment(imagePoint, {
          x1: guide.anchorStart.x,
          y1: guide.anchorStart.y,
          x2: guide.anchorEnd.x,
          y2: guide.anchorEnd.y,
        });
        if (distance <= thresholdInImage && distance < minDistance) {
          minDistance = distance;
          pickedId = guide.id;
        }
      }

      return pickedId;
    },
    [planningGuides, view.scale],
  );

  const findClosestPlanningGuideHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = 10 / view.scale;
      let pickedHandle = null;
      let minDistance = Infinity;

      for (const guide of planningGuides) {
        const handles = [
          { key: "start", x: guide.anchorStart.x, y: guide.anchorStart.y },
          { key: "end", x: guide.anchorEnd.x, y: guide.anchorEnd.y },
        ];

        for (const handle of handles) {
          const distance = Math.hypot(
            imagePoint.x - handle.x,
            imagePoint.y - handle.y,
          );
          if (distance <= thresholdInImage && distance < minDistance) {
            minDistance = distance;
            pickedHandle = { guideId: guide.id, handleKey: handle.key };
          }
        }
      }

      return pickedHandle;
    },
    [planningGuides, view.scale],
  );

  const findPlanningGuideLabelByPoint = useCallback(
    (screenPoint) => {
      for (let index = planningGuides.length - 1; index >= 0; index -= 1) {
        const guide = planningGuides[index];
        if (guide.hidden) continue;

        const geometry =
          guide.kind === "valgusCut"
            ? buildValgusCutGeometry(guide.anchorStart, guide.anchorEnd, guide)
            : guide.kind === "tibialSlope"
              ? buildTibialSlopeGeometry(
                  guide.anchorStart,
                  guide.anchorEnd,
                  guide,
                )
              : buildTibialCutGeometry(
                  guide.anchorStart,
                  guide.anchorEnd,
                  guide,
                );
        if (!geometry) continue;

        const cutCenter = imageToScreenPoint(
          geometry.cutCenter.x,
          geometry.cutCenter.y,
        );
        const bounds = getTagBounds(
          cutCenter.x + (guide.labelOffsetX ?? DEFAULT_GUIDE_LABEL_OFFSET_X),
          cutCenter.y + (guide.labelOffsetY ?? DEFAULT_GUIDE_LABEL_OFFSET_Y),
          getPlanningGuideLabelText(guide, index),
          { fontSize: 9, radius: 4 },
        );
        if (
          screenPoint.x >= bounds.left &&
          screenPoint.x <= bounds.right &&
          screenPoint.y >= bounds.top &&
          screenPoint.y <= bounds.bottom
        ) {
          return guide.id;
        }
      }
      return null;
    },
    [getPlanningGuideLabelText, imageToScreenPoint, planningGuides],
  );

  const findClosestHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = (isCoarsePointer ? 24 : 10) / view.scale;
      let pickedHandle = null;
      let minDistance = Infinity;

      for (const line of lines) {
        const handles = [
          { key: "start", x: line.x1, y: line.y1 },
          { key: "end", x: line.x2, y: line.y2 },
        ];

        for (const handle of handles) {
          const distance = Math.hypot(
            imagePoint.x - handle.x,
            imagePoint.y - handle.y,
          );
          if (distance <= thresholdInImage && distance < minDistance) {
            minDistance = distance;
            pickedHandle = { lineId: line.id, handleKey: handle.key };
          }
        }
      }

      return pickedHandle;
    },
    [isCoarsePointer, lines, view.scale],
  );

  const findLineLabelByPoint = useCallback(
    (screenPoint) => {
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index];
        const start = imageToScreenPoint(line.x1, line.y1);
        const end = imageToScreenPoint(line.x2, line.y2);
        const labelX =
          (start.x + end.x) / 2 +
          (line.labelOffsetX ?? DEFAULT_LINE_LABEL_OFFSET_X);
        const labelY =
          (start.y + end.y) / 2 +
          (line.labelOffsetY ?? DEFAULT_LINE_LABEL_OFFSET_Y);
        const bounds = getTagBounds(labelX, labelY, getLineLabelText(line), {
          fontSize: 9,
          radius: 4,
        });
        if (
          screenPoint.x >= bounds.left &&
          screenPoint.x <= bounds.right &&
          screenPoint.y >= bounds.top &&
          screenPoint.y <= bounds.bottom
        ) {
          return line.id;
        }
      }
      return null;
    },
    [getLineLabelText, imageToScreenPoint, lines],
  );

  const findClosestAngleHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = 10 / view.scale;
      let picked = null;
      let minDistance = Infinity;

      for (const angle of angles) {
        const handles = [
          { key: "p1", x: angle.p1.x, y: angle.p1.y },
          { key: "p2", x: angle.p2.x, y: angle.p2.y },
          { key: "p3", x: angle.p3.x, y: angle.p3.y },
        ];
        for (const handle of handles) {
          const distance = Math.hypot(
            imagePoint.x - handle.x,
            imagePoint.y - handle.y,
          );
          if (distance <= thresholdInImage && distance < minDistance) {
            minDistance = distance;
            picked = { angleId: angle.id, handleKey: handle.key };
          }
        }
      }
      return picked;
    },
    [angles, view.scale],
  );

  const findClosestCircleHandle = useCallback(
    (imagePoint) => {
      const centerThreshold = 18 / view.scale;
      const radiusThreshold = 16 / view.scale;

      for (let i = circles.length - 1; i >= 0; i -= 1) {
        const circle = circles[i];
        const centerDistance = Math.hypot(
          imagePoint.x - circle.cx,
          imagePoint.y - circle.cy,
        );
        if (centerDistance <= centerThreshold) {
          return { circleId: circle.id, handleKey: "center" };
        }
        const radiusDistance = Math.abs(centerDistance - circle.radius);
        if (radiusDistance <= radiusThreshold) {
          return { circleId: circle.id, handleKey: "radius" };
        }
        if (centerDistance < Math.max(circle.radius - radiusThreshold, 4)) {
          return { circleId: circle.id, handleKey: "move" };
        }
      }
      return null;
    },
    [circles, view.scale],
  );

  const findClosestHkaHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = 10 / view.scale;
      let picked = null;
      let minDistance = Infinity;

      for (const item of hkaSets) {
        const handles = [
          { key: "hip", x: item.hip.x, y: item.hip.y },
          { key: "knee", x: item.knee.x, y: item.knee.y },
          { key: "ankle", x: item.ankle.x, y: item.ankle.y },
        ];
        for (const handle of handles) {
          const distance = Math.hypot(
            imagePoint.x - handle.x,
            imagePoint.y - handle.y,
          );
          if (distance <= thresholdInImage && distance < minDistance) {
            minDistance = distance;
            picked = { hkaId: item.id, handleKey: handle.key };
          }
        }
      }

      return picked;
    },
    [hkaSets, view.scale],
  );

  const landmarkPoints = useMemo(() => {
    const points = [];

    for (const line of lines) {
      points.push({ x: line.x1, y: line.y1 });
      points.push({ x: line.x2, y: line.y2 });
    }
    for (const angle of angles) {
      points.push({ x: angle.p1.x, y: angle.p1.y });
      points.push({ x: angle.p2.x, y: angle.p2.y });
      points.push({ x: angle.p3.x, y: angle.p3.y });
    }
    for (const circle of circles) {
      points.push({ x: circle.cx, y: circle.cy });
    }
    for (const item of hkaSets) {
      points.push({ x: item.hip.x, y: item.hip.y });
      points.push({ x: item.knee.x, y: item.knee.y });
      points.push({ x: item.ankle.x, y: item.ankle.y });
    }

    return points;
  }, [angles, circles, hkaSets, lines]);

  const findCutLayerHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = 12 / view.scale;

      for (let i = cutLayers.length - 1; i >= 0; i -= 1) {
        const layer = cutLayers[i];
        const corners = getLayerCorners(layer);

        for (const corner of corners) {
          const distance = Math.hypot(
            imagePoint.x - corner.x,
            imagePoint.y - corner.y,
          );
          if (distance <= thresholdInImage) {
            return { layerId: layer.id, handleKey: corner.key };
          }
        }
      }

      return null;
    },
    [cutLayers, view.scale],
  );

  const findCutLayerByPoint = useCallback(
    (imagePoint) => {
      for (let i = cutLayers.length - 1; i >= 0; i -= 1) {
        const layer = cutLayers[i];
        const maskPoints = getLayerMaskDisplayPoints(layer);
        if (maskPoints) {
          const local = toLayerShapeLocal(imagePoint, layer);
          if (pointInPolygon(local, maskPoints)) {
            return layer.id;
          }
          continue;
        }

        const local = toLayerLocal(imagePoint, layer);
        const size = getLayerDisplaySize(layer);
        if (
          Math.abs(local.x) <= size.width / 2 &&
          Math.abs(local.y) <= size.height / 2
        ) {
          return layer.id;
        }
      }
      return null;
    },
    [cutLayers],
  );

  const renderLayers = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!imageCanvas || !overlayCanvas || !viewport.width || !viewport.height) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(viewport.width * ratio);
    const targetHeight = Math.floor(viewport.height * ratio);

    for (const canvas of [imageCanvas, overlayCanvas]) {
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
    }
    const filterValue = `contrast(${contrast}%) brightness(${level}%)`;
    imageCanvas.style.filter = filterValue;
    overlayCanvas.style.filter = "none";

    const imageCtx = imageCanvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");

    if (!imageCtx || !overlayCtx) return;

    imageCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    imageCtx.clearRect(0, 0, viewport.width, viewport.height);

    if (
      image &&
      imageWidth > 0 &&
      imageHeight > 0 &&
      modelWidth > 0 &&
      modelHeight > 0
    ) {
      const sourceX = cropRect?.x || 0;
      const sourceY = cropRect?.y || 0;
      const sourceW = cropRect?.width || imageWidth;
      const sourceH = cropRect?.height || imageHeight;

      const p0 = orientPoint(
        0,
        0,
        modelWidth,
        modelHeight,
        rotation,
        flipX,
        flipY,
      );
      const p1 = orientPoint(
        1,
        0,
        modelWidth,
        modelHeight,
        rotation,
        flipX,
        flipY,
      );
      const p2 = orientPoint(
        0,
        1,
        modelWidth,
        modelHeight,
        rotation,
        flipX,
        flipY,
      );
      const a = p1.x - p0.x;
      const b = p1.y - p0.y;
      const c = p2.x - p0.x;
      const d = p2.y - p0.y;
      const e = p0.x;
      const f = p0.y;

      imageCtx.save();
      imageCtx.translate(view.panX, view.panY);
      imageCtx.scale(view.scale, view.scale);
      imageCtx.transform(a, b, c, d, e, f);
      imageCtx.filter = filterValue;
      imageCtx.imageSmoothingEnabled = true;
      imageCtx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        modelWidth,
        modelHeight,
      );

      for (const layer of cutLayers) {
        const isImageBacked = isImageBackedLayerKind(layer.kind);
        const srcX = isImageBacked ? layer.sourceX : sourceX + layer.sourceX;
        const srcY = isImageBacked ? layer.sourceY : sourceY + layer.sourceY;
        const sourceImage = isImageBacked ? layer.image : image;
        if (!sourceImage) continue;
        const displaySize = getLayerDisplaySize(layer);

        imageCtx.save();
        imageCtx.translate(layer.centerX, layer.centerY);
        imageCtx.rotate((layer.rotation * Math.PI) / 180);
        imageCtx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
        imageCtx.globalAlpha = clamp(layer.opacity ?? 1, 0.05, 1);
        imageCtx.drawImage(
          sourceImage,
          srcX,
          srcY,
          layer.sourceWidth,
          layer.sourceHeight,
          -displaySize.width / 2,
          -displaySize.height / 2,
          displaySize.width,
          displaySize.height,
        );

        if (layer.id === selectedCutLayerId) {
          imageCtx.strokeStyle = getLayerPalette(layer.id).border;
          imageCtx.lineWidth = Math.max(1 / view.scale, 0.8);
          imageCtx.setLineDash([10 / view.scale, 6 / view.scale]);
          imageCtx.strokeRect(
            -displaySize.width / 2,
            -displaySize.height / 2,
            displaySize.width,
            displaySize.height,
          );
          imageCtx.setLineDash([]);
        }
        imageCtx.restore();
      }

      imageCtx.filter = "none";
      imageCtx.restore();
    }

    overlayCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    overlayCtx.clearRect(0, 0, viewport.width, viewport.height);

    if (
      !image ||
      imageWidth <= 0 ||
      imageHeight <= 0 ||
      modelWidth <= 0 ||
      modelHeight <= 0
    ) {
      overlayCtx.fillStyle = "rgba(15, 23, 42, 0.8)";
      overlayCtx.font = "15px Inter, sans-serif";
      overlayCtx.textAlign = "center";
      overlayCtx.fillText(
        "Belum ada gambar. Upload screenshot X-ray terlebih dahulu.",
        viewport.width / 2,
        viewport.height / 2,
      );
      return;
    }

    const topLeft = imageToScreenPoint(0, 0);
    overlayCtx.strokeStyle = "rgba(148, 163, 184, 0.7)";
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(
      topLeft.x,
      topLeft.y,
      orientedSize.width * view.scale,
      orientedSize.height * view.scale,
    );

    const drawLine = (line, opts = {}) => {
      const start = imageToScreenPoint(line.x1, line.y1);
      const end = imageToScreenPoint(line.x2, line.y2);
      const assistPoint =
        opts.assistHandleKey === "start"
          ? start
          : opts.assistHandleKey === "end"
            ? end
            : null;

      overlayCtx.save();
      if (assistPoint) {
        overlayCtx.fillStyle = "rgba(226, 232, 240, 0.34)";
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistPoint.x,
          assistPoint.y,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.65)";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistPoint.x,
          assistPoint.y,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.stroke();
      }
      if (opts.showTouchHalo) {
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.22)";
        overlayCtx.lineWidth = (opts.width || 2) + 18;
        overlayCtx.lineCap = "round";
        overlayCtx.beginPath();
        overlayCtx.moveTo(start.x, start.y);
        overlayCtx.lineTo(end.x, end.y);
        overlayCtx.stroke();
      }
      overlayCtx.strokeStyle = opts.color;
      overlayCtx.lineWidth = opts.width || 2;
      overlayCtx.lineCap = "round";
      overlayCtx.setLineDash(opts.dashed ? [6, 4] : []);
      overlayCtx.beginPath();
      overlayCtx.moveTo(start.x, start.y);
      overlayCtx.lineTo(end.x, end.y);
      overlayCtx.stroke();

      if (opts.showTouchHalo) {
        overlayCtx.fillStyle = "rgba(248, 250, 252, 0.18)";
        overlayCtx.beginPath();
        overlayCtx.arc(start.x, start.y, 16, 0, Math.PI * 2);
        overlayCtx.arc(end.x, end.y, 16, 0, Math.PI * 2);
        overlayCtx.fill();
      }

      overlayCtx.fillStyle = opts.color;
      overlayCtx.beginPath();
      overlayCtx.arc(start.x, start.y, opts.handleRadius || 3, 0, Math.PI * 2);
      overlayCtx.arc(end.x, end.y, opts.handleRadius || 3, 0, Math.PI * 2);
      overlayCtx.fill();

      if (opts.highlightHandles) {
        overlayCtx.strokeStyle = "#f8fafc";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.beginPath();
        overlayCtx.arc(
          start.x,
          start.y,
          (opts.handleRadius || 3) + 1.2,
          0,
          Math.PI * 2,
        );
        overlayCtx.arc(
          end.x,
          end.y,
          (opts.handleRadius || 3) + 1.2,
          0,
          Math.PI * 2,
        );
        overlayCtx.stroke();
      }

      overlayCtx.restore();

      const label = getLineLabelText(line);
      const midX =
        (start.x + end.x) / 2 +
        (line.labelOffsetX ?? DEFAULT_LINE_LABEL_OFFSET_X);
      const midY =
        (start.y + end.y) / 2 +
        (line.labelOffsetY ?? DEFAULT_LINE_LABEL_OFFSET_Y);
      drawTag(overlayCtx, midX, midY, label, opts.color, {
        bgOpacity: Math.max(
          0.2,
          Math.min(
            1,
            (line.labelOpacity ?? DEFAULT_LABEL_OPACITY) +
              (opts.highlightHandles ? 0.1 : 0),
          ),
        ),
        fontSize: 9,
        paddingX: 4,
        paddingY: 2,
        radius: 4,
      });
    };

    for (const line of lines) {
      const isSelected = line.id === selectedLineId;
      const isCalibration = line.id === calibrationLineId;
      const isLocked = isLineLocked(line.id);
      const typeColor = lineTypeColor(line.type);
      const color = isCalibration
        ? "#22c55e"
        : isLocked
          ? "#a855f7"
          : isSelected
            ? "#f59e0b"
            : typeColor;

      drawLine(line, {
        color,
        width: isSelected ? 2.5 : 2,
        handleRadius:
          isSelected && !isLocked ? (isCoarsePointer ? 6.2 : 4.5) : 3,
        highlightHandles: isSelected && !isLocked,
        dashed: isLocked,
        showTouchHalo: isSelected && !isLocked && isCoarsePointer,
        assistHandleKey:
          mobileHandleAssist?.lineId === line.id
            ? mobileHandleAssist.handleKey
            : null,
      });
    }

    for (const angle of angles) {
      const p1 = imageToScreenPoint(angle.p1.x, angle.p1.y);
      const p2 = imageToScreenPoint(angle.p2.x, angle.p2.y);
      const p3 = imageToScreenPoint(angle.p3.x, angle.p3.y);
      const value = getAngleDegrees(angle.p1, angle.p2, angle.p3);
      const isSelected = angle.id === selectedAngleId;
      const color = angle.color || DEFAULT_ANGLE_COLOR;
      const strokeWidth = Math.max(
        1.5,
        Number.isFinite(angle.strokeWidth)
          ? angle.strokeWidth
          : DEFAULT_ANGLE_STROKE_WIDTH,
      );
      const labelOffsetX = Number.isFinite(angle.labelOffsetX)
        ? angle.labelOffsetX
        : DEFAULT_ANGLE_LABEL_OFFSET_X;
      const labelOffsetY = Number.isFinite(angle.labelOffsetY)
        ? angle.labelOffsetY
        : DEFAULT_ANGLE_LABEL_OFFSET_Y;
      const labelOpacity = Number.isFinite(angle.labelOpacity)
        ? angle.labelOpacity
        : DEFAULT_LABEL_OPACITY;

      overlayCtx.save();
      if (isSelected) {
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.95)";
        overlayCtx.lineWidth = strokeWidth + 1.5;
        overlayCtx.beginPath();
        overlayCtx.moveTo(p2.x, p2.y);
        overlayCtx.lineTo(p1.x, p1.y);
        overlayCtx.moveTo(p2.x, p2.y);
        overlayCtx.lineTo(p3.x, p3.y);
        overlayCtx.stroke();
      }
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = strokeWidth + (isSelected ? 0.5 : 0);
      overlayCtx.beginPath();
      overlayCtx.moveTo(p2.x, p2.y);
      overlayCtx.lineTo(p1.x, p1.y);
      overlayCtx.moveTo(p2.x, p2.y);
      overlayCtx.lineTo(p3.x, p3.y);
      overlayCtx.stroke();

      overlayCtx.fillStyle = color;
      overlayCtx.beginPath();
      overlayCtx.arc(p1.x, p1.y, 3.8, 0, Math.PI * 2);
      overlayCtx.arc(p2.x, p2.y, 4.5, 0, Math.PI * 2);
      overlayCtx.arc(p3.x, p3.y, 3.8, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();

      drawTag(
        overlayCtx,
        p2.x + labelOffsetX,
        p2.y + labelOffsetY,
        `ANGLE: ${value.toFixed(1)}°`,
        color,
        {
          bgOpacity: Math.max(0.2, Math.min(1, labelOpacity)),
          fontSize: 9,
          paddingX: 4,
          paddingY: 2,
          radius: 4,
        },
      );
    }

    for (const circle of circles) {
      const center = imageToScreenPoint(circle.cx, circle.cy);
      const edge = imageToScreenPoint(circle.cx + circle.radius, circle.cy);
      const radiusPx = Math.hypot(edge.x - center.x, edge.y - center.y);
      const isSelected = circle.id === selectedCircleId;
      const color = isSelected ? "#a78bfa" : "#8b5cf6";
      const diameterText =
        mmPerPixel !== null
          ? `${measurementUnit === "cm" ? ((circle.radius * 2 * mmPerPixel) / 10).toFixed(2) : (circle.radius * 2 * mmPerPixel).toFixed(2)} ${measurementUnit}`
          : `${(circle.radius * 2).toFixed(1)} px`;

      overlayCtx.save();
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = isSelected ? 2.5 : 2;
      overlayCtx.beginPath();
      overlayCtx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
      overlayCtx.stroke();
      if (isSelected) {
        overlayCtx.setLineDash([6, 4]);
        overlayCtx.beginPath();
        overlayCtx.moveTo(center.x - radiusPx, center.y);
        overlayCtx.lineTo(center.x + radiusPx, center.y);
        overlayCtx.stroke();
        overlayCtx.setLineDash([]);
      }
      overlayCtx.fillStyle = color;
      overlayCtx.beginPath();
      overlayCtx.arc(center.x, center.y, 4, 0, Math.PI * 2);
      overlayCtx.fill();
      if (isSelected) {
        const handles = [
          { x: center.x + radiusPx, y: center.y },
          { x: center.x - radiusPx, y: center.y },
          { x: center.x, y: center.y + radiusPx },
          { x: center.x, y: center.y - radiusPx },
        ];
        overlayCtx.fillStyle = "#f8fafc";
        overlayCtx.strokeStyle = color;
        overlayCtx.lineWidth = 1.5;
        for (const handle of handles) {
          overlayCtx.beginPath();
          overlayCtx.arc(handle.x, handle.y, 4.8, 0, Math.PI * 2);
          overlayCtx.fill();
          overlayCtx.stroke();
        }
      }
      overlayCtx.restore();

      drawTag(
        overlayCtx,
        center.x,
        center.y - radiusPx - 12,
        `DIA: ${diameterText}`,
        color,
      );
    }

    for (const item of hkaSets) {
      const hip = imageToScreenPoint(item.hip.x, item.hip.y);
      const knee = imageToScreenPoint(item.knee.x, item.knee.y);
      const ankle = imageToScreenPoint(item.ankle.x, item.ankle.y);
      const angleDeg = getAngleDegrees(item.hip, item.knee, item.ankle);
      const isSelected = item.id === selectedHkaId;
      const color = isSelected ? "#14b8a6" : "#0d9488";

      overlayCtx.save();
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = isSelected ? 2.5 : 2;
      overlayCtx.beginPath();
      overlayCtx.moveTo(hip.x, hip.y);
      overlayCtx.lineTo(ankle.x, ankle.y);
      overlayCtx.stroke();
      if (isSelected) {
        overlayCtx.setLineDash([6, 4]);
        overlayCtx.lineWidth = 1.4;
        overlayCtx.beginPath();
        overlayCtx.moveTo(knee.x, knee.y);
        overlayCtx.lineTo(hip.x, hip.y);
        overlayCtx.moveTo(knee.x, knee.y);
        overlayCtx.lineTo(ankle.x, ankle.y);
        overlayCtx.stroke();
        overlayCtx.setLineDash([]);
      }
      overlayCtx.fillStyle = color;
      overlayCtx.beginPath();
      overlayCtx.arc(hip.x, hip.y, 3.6, 0, Math.PI * 2);
      overlayCtx.arc(knee.x, knee.y, 4.4, 0, Math.PI * 2);
      overlayCtx.arc(ankle.x, ankle.y, 3.6, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();

      drawTag(
        overlayCtx,
        knee.x,
        knee.y - 16,
        `HKA: ${angleDeg.toFixed(1)}°`,
        color,
      );
    }

    for (let index = 0; index < planningGuides.length; index += 1) {
      const guide = planningGuides[index];
      if (guide.hidden) continue;

      const anchorStart = imageToScreenPoint(
        guide.anchorStart.x,
        guide.anchorStart.y,
      );
      const anchorEnd = imageToScreenPoint(
        guide.anchorEnd.x,
        guide.anchorEnd.y,
      );
      const color =
        guide.kind === "valgusCut"
          ? VIEWER_COLORS.valgusCut
          : guide.kind === "tibialSlope"
            ? VIEWER_COLORS.tibialSlope
            : VIEWER_COLORS.tibialCut;

      const geometry =
        guide.kind === "valgusCut"
          ? buildValgusCutGeometry(guide.anchorStart, guide.anchorEnd, guide)
          : guide.kind === "tibialSlope"
            ? buildTibialSlopeGeometry(
                guide.anchorStart,
                guide.anchorEnd,
                guide,
              )
            : buildTibialCutGeometry(guide.anchorStart, guide.anchorEnd, guide);

      if (!geometry) continue;

      const baseA = imageToScreenPoint(geometry.baseA.x, geometry.baseA.y);
      const baseB = imageToScreenPoint(geometry.baseB.x, geometry.baseB.y);
      const cutA = imageToScreenPoint(geometry.cutA.x, geometry.cutA.y);
      const cutB = imageToScreenPoint(geometry.cutB.x, geometry.cutB.y);
      const cutCenter = imageToScreenPoint(
        geometry.cutCenter.x,
        geometry.cutCenter.y,
      );
      const label = getPlanningGuideLabelText(guide, index);
      const isSelectedGuide = guide.id === selectedPlanningGuideId;

      overlayCtx.save();
      overlayCtx.strokeStyle = color;
      overlayCtx.fillStyle = color;
      overlayCtx.lineWidth = isSelectedGuide ? 2.5 : 2;
      overlayCtx.setLineDash([6, 4]);
      overlayCtx.beginPath();
      overlayCtx.moveTo(anchorStart.x, anchorStart.y);
      overlayCtx.lineTo(anchorEnd.x, anchorEnd.y);
      overlayCtx.stroke();

      overlayCtx.setLineDash([4, 4]);
      overlayCtx.beginPath();
      overlayCtx.moveTo(baseA.x, baseA.y);
      overlayCtx.lineTo(baseB.x, baseB.y);
      overlayCtx.stroke();

      overlayCtx.setLineDash([]);
      overlayCtx.lineWidth = 2.5;
      overlayCtx.beginPath();
      overlayCtx.moveTo(cutA.x, cutA.y);
      overlayCtx.lineTo(cutB.x, cutB.y);
      overlayCtx.stroke();

      overlayCtx.beginPath();
      overlayCtx.arc(
        anchorStart.x,
        anchorStart.y,
        isSelectedGuide ? 4.6 : 3.8,
        0,
        Math.PI * 2,
      );
      overlayCtx.arc(
        anchorEnd.x,
        anchorEnd.y,
        isSelectedGuide ? 4.6 : 3.8,
        0,
        Math.PI * 2,
      );
      overlayCtx.fill();
      overlayCtx.restore();

      drawTag(
        overlayCtx,
        cutCenter.x + (guide.labelOffsetX ?? DEFAULT_GUIDE_LABEL_OFFSET_X),
        cutCenter.y + (guide.labelOffsetY ?? DEFAULT_GUIDE_LABEL_OFFSET_Y),
        label,
        color,
        {
          bgOpacity: Math.max(
            0.2,
            Math.min(
              1,
              (guide.labelOpacity ?? DEFAULT_LABEL_OPACITY) +
                (isSelectedGuide ? 0.12 : 0),
            ),
          ),
          fontSize: 9,
          paddingX: 4,
          paddingY: 2,
          radius: 4,
        },
      );
    }

    const activeCutLayer =
      selectedCutLayerId !== null
        ? cutLayers.find((layer) => layer.id === selectedCutLayerId) || null
        : null;
    if (activeCutLayer) {
      const corners = getLayerCorners(activeCutLayer);
      overlayCtx.save();
      overlayCtx.fillStyle = "#10b981";
      overlayCtx.strokeStyle = "#ecfeff";
      overlayCtx.lineWidth = 1.5;
      for (const corner of corners) {
        const screen = imageToScreenPoint(corner.x, corner.y);
        overlayCtx.beginPath();
        overlayCtx.arc(
          screen.x,
          screen.y,
          Math.max(4, 5 / Math.max(view.scale, 0.4)),
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        overlayCtx.stroke();
      }
      const maskScreenPoints = getLayerMaskScreenPoints(activeCutLayer);
      if (maskScreenPoints) {
        overlayCtx.strokeStyle = getLayerPalette(activeCutLayer.id).border;
        overlayCtx.lineWidth = 1.5;
        overlayCtx.setLineDash([6, 4]);
        overlayCtx.beginPath();
        const firstPoint = imageToScreenPoint(
          maskScreenPoints[0].x,
          maskScreenPoints[0].y,
        );
        overlayCtx.moveTo(firstPoint.x, firstPoint.y);
        for (let index = 1; index < maskScreenPoints.length; index += 1) {
          const nextPoint = imageToScreenPoint(
            maskScreenPoints[index].x,
            maskScreenPoints[index].y,
          );
          overlayCtx.lineTo(nextPoint.x, nextPoint.y);
        }
        overlayCtx.closePath();
        overlayCtx.stroke();
      }
      overlayCtx.restore();
    }

    if (draftLine) {
      drawLine(draftLine, { color: "#fb7185", dashed: true, width: 2 });
    }

    if (draftAnglePoints.length > 0) {
      overlayCtx.save();
      overlayCtx.strokeStyle = "#fb923c";
      overlayCtx.fillStyle = "#fb923c";
      overlayCtx.lineWidth = 1.8;
      for (let i = 0; i < draftAnglePoints.length; i += 1) {
        const pointItem = imageToScreenPoint(
          draftAnglePoints[i].x,
          draftAnglePoints[i].y,
        );
        overlayCtx.beginPath();
        overlayCtx.arc(pointItem.x, pointItem.y, 3.5, 0, Math.PI * 2);
        overlayCtx.fill();
        if (i > 0) {
          const prev = imageToScreenPoint(
            draftAnglePoints[i - 1].x,
            draftAnglePoints[i - 1].y,
          );
          overlayCtx.beginPath();
          overlayCtx.moveTo(prev.x, prev.y);
          overlayCtx.lineTo(pointItem.x, pointItem.y);
          overlayCtx.stroke();
        }
      }
      overlayCtx.restore();
    }

    if (draftCirclePoints.length > 0) {
      overlayCtx.save();
      overlayCtx.strokeStyle = "#8b5cf6";
      overlayCtx.fillStyle = "#8b5cf6";
      overlayCtx.lineWidth = 2;
      const center = imageToScreenPoint(
        draftCirclePoints[0].x,
        draftCirclePoints[0].y,
      );
      overlayCtx.beginPath();
      overlayCtx.arc(center.x, center.y, 4.2, 0, Math.PI * 2);
      overlayCtx.fill();

      if (draftCirclePoints.length >= 2) {
        const edge = imageToScreenPoint(
          draftCirclePoints[1].x,
          draftCirclePoints[1].y,
        );
        const previewRadius = Math.hypot(edge.x - center.x, edge.y - center.y);
        overlayCtx.setLineDash([6, 4]);
        overlayCtx.beginPath();
        overlayCtx.arc(center.x, center.y, previewRadius, 0, Math.PI * 2);
        overlayCtx.stroke();
        overlayCtx.setLineDash([]);
        overlayCtx.beginPath();
        overlayCtx.arc(edge.x, edge.y, 4.2, 0, Math.PI * 2);
        overlayCtx.fill();
        drawTag(
          overlayCtx,
          center.x,
          center.y - previewRadius - 12,
          `Draft DIA: ${(getDistance(draftCirclePoints[0], draftCirclePoints[1]) * 2).toFixed(1)} px`,
          "#8b5cf6",
        );
      } else {
        const p = imageToScreenPoint(
          draftCirclePoints[0].x,
          draftCirclePoints[0].y,
        );
        overlayCtx.beginPath();
        overlayCtx.arc(p.x, p.y, 3.8, 0, Math.PI * 2);
        overlayCtx.fill();
      }
      overlayCtx.restore();
    }

    if (draftHkaPoints.length > 0) {
      overlayCtx.save();
      overlayCtx.strokeStyle = "#0d9488";
      overlayCtx.fillStyle = "#0d9488";
      overlayCtx.lineWidth = 2;
      for (let i = 0; i < draftHkaPoints.length; i += 1) {
        const pointItem = imageToScreenPoint(
          draftHkaPoints[i].x,
          draftHkaPoints[i].y,
        );
        overlayCtx.beginPath();
        overlayCtx.arc(pointItem.x, pointItem.y, 4, 0, Math.PI * 2);
        overlayCtx.fill();
        if (i > 0) {
          const prev = imageToScreenPoint(
            draftHkaPoints[i - 1].x,
            draftHkaPoints[i - 1].y,
          );
          overlayCtx.beginPath();
          overlayCtx.moveTo(prev.x, prev.y);
          overlayCtx.lineTo(pointItem.x, pointItem.y);
          overlayCtx.stroke();
        }
      }
      overlayCtx.restore();
    }

    if (draftCut) {
      const polygonPoints = Array.isArray(draftCut.points)
        ? draftCut.points
        : [];
      const hoverPoint = draftCut.hoverPoint || null;
      const previewPoints = [...polygonPoints];
      const lastPoint = polygonPoints[polygonPoints.length - 1] || null;
      if (hoverPoint && lastPoint && getDistance(lastPoint, hoverPoint) > 0.6) {
        previewPoints.push(hoverPoint);
      }

      const canClose =
        polygonPoints.length >= MIN_FREE_CUT_POINTS &&
        hoverPoint &&
        getDistance(polygonPoints[0], hoverPoint) <=
          FREE_CUT_CLOSE_RADIUS_SCREEN / view.scale;

      overlayCtx.save();
      overlayCtx.strokeStyle = "#22d3ee";
      overlayCtx.fillStyle = canClose
        ? "rgba(34, 211, 238, 0.16)"
        : "rgba(34, 211, 238, 0.08)";
      overlayCtx.lineWidth = 1.5;
      overlayCtx.setLineDash([6, 4]);

      if (previewPoints.length > 0) {
        const firstPoint = imageToScreenPoint(
          previewPoints[0].x,
          previewPoints[0].y,
        );
        overlayCtx.beginPath();
        overlayCtx.moveTo(firstPoint.x, firstPoint.y);
        for (let index = 1; index < previewPoints.length; index += 1) {
          const nextPoint = imageToScreenPoint(
            previewPoints[index].x,
            previewPoints[index].y,
          );
          overlayCtx.lineTo(nextPoint.x, nextPoint.y);
        }
        if (canClose) {
          overlayCtx.closePath();
          overlayCtx.fill();
        }
        overlayCtx.stroke();
      }

      overlayCtx.setLineDash([]);
      for (let index = 0; index < polygonPoints.length; index += 1) {
        const pointItem = imageToScreenPoint(
          polygonPoints[index].x,
          polygonPoints[index].y,
        );
        const isStartPoint = index === 0;
        overlayCtx.fillStyle = isStartPoint ? "#ecfeff" : "#22d3ee";
        overlayCtx.strokeStyle = "#22d3ee";
        overlayCtx.lineWidth = isStartPoint ? 2 : 1.4;
        overlayCtx.beginPath();
        overlayCtx.arc(
          pointItem.x,
          pointItem.y,
          isStartPoint ? 5.2 : 4,
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        overlayCtx.stroke();
      }
      overlayCtx.restore();

      const labelAnchor = imageToScreenPoint(
        (
          hoverPoint ||
          polygonPoints[polygonPoints.length - 1] ||
          polygonPoints[0]
        ).x,
        (
          hoverPoint ||
          polygonPoints[polygonPoints.length - 1] ||
          polygonPoints[0]
        ).y,
      );
      drawTag(
        overlayCtx,
        labelAnchor.x,
        labelAnchor.y - 16,
        canClose
          ? "Free Cut: klik titik awal"
          : `Free Cut: ${polygonPoints.length} titik`,
        "#22d3ee",
      );
    }
  }, [
    angles,
    calibrationLineId,
    circles,
    contrast,
    cropRect,
    draftAnglePoints,
    draftCirclePoints,
    draftCut,
    draftHkaPoints,
    draftLine,
    flipX,
    flipY,
    hkaSets,
    image,
    imageHeight,
    imageToScreenPoint,
    imageWidth,
    isCoarsePointer,
    planningGuides,
    level,
    lineTypeColor,
    lineTypeLabel,
    lines,
    cutLayers,
    getLineLabelText,
    getPlanningGuideLabelText,
    isLineLocked,
    measurementUnit,
    mmPerPixel,
    modelHeight,
    modelWidth,
    orientedSize.height,
    orientedSize.width,
    rotation,
    selectedAngleId,
    selectedCircleId,
    selectedCutLayerId,
    selectedHkaId,
    selectedLineId,
    selectedPlanningGuideId,
    view.panX,
    view.panY,
    view.scale,
    viewport.height,
    viewport.width,
  ]);

  useEffect(() => {
    renderLayers();
  }, [renderLayers]);

  useEffect(() => {
    let cancelled = false;

    const loadCompare = async () => {
      if (!compareImageSrc) {
        setCompareImage(null);
        return;
      }

      try {
        const img = await loadImageFromSrc(compareImageSrc);
        if (!cancelled) {
          setCompareImage(img);
        }
      } catch {
        if (!cancelled) {
          setCompareImage(null);
        }
      }
    };

    loadCompare();
    return () => {
      cancelled = true;
    };
  }, [compareImageSrc]);

  useEffect(() => {
    const canvas = compareCanvasRef.current;
    if (
      !canvas ||
      !compareMode ||
      !compareViewport.width ||
      !compareViewport.height
    )
      return;

    const ratio = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(compareViewport.width * ratio);
    const targetHeight = Math.floor(compareViewport.height * ratio);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    canvas.style.width = `${compareViewport.width}px`;
    canvas.style.height = `${compareViewport.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, compareViewport.width, compareViewport.height);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, compareViewport.width, compareViewport.height);

    if (!compareImage) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Upload gambar compare (pre-op/post-op)",
        compareViewport.width / 2,
        compareViewport.height / 2,
      );
      return;
    }

    const iw = compareImage.naturalWidth || compareImage.width || 0;
    const ih = compareImage.naturalHeight || compareImage.height || 0;
    if (!iw || !ih) return;

    const oriented = getOrientedSize(iw, ih, rotation);
    const scale = Math.min(
      (compareViewport.width - 20) / Math.max(oriented.width, 1),
      (compareViewport.height - 20) / Math.max(oriented.height, 1),
    );
    const drawScale = clamp(scale, 0.05, 8);
    const drawW = oriented.width * drawScale;
    const drawH = oriented.height * drawScale;
    const offsetX = (compareViewport.width - drawW) / 2;
    const offsetY = (compareViewport.height - drawH) / 2;

    const p0 = orientPoint(0, 0, iw, ih, rotation, flipX, flipY);
    const p1 = orientPoint(1, 0, iw, ih, rotation, flipX, flipY);
    const p2 = orientPoint(0, 1, iw, ih, rotation, flipX, flipY);
    const a = p1.x - p0.x;
    const b = p1.y - p0.y;
    const c = p2.x - p0.x;
    const d = p2.y - p0.y;
    const e = p0.x;
    const f = p0.y;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(drawScale, drawScale);
    ctx.transform(a, b, c, d, e, f);
    ctx.filter = `contrast(${contrast}%) brightness(${level}%)`;
    ctx.drawImage(compareImage, 0, 0, iw, ih, 0, 0, iw, ih);
    ctx.restore();

    drawTag(
      ctx,
      compareViewport.width / 2,
      compareViewport.height - 18,
      compareImageName ? `COMPARE: ${compareImageName}` : "COMPARE",
      "#22d3ee",
    );
  }, [
    compareImage,
    compareImageName,
    compareMode,
    compareViewport.height,
    compareViewport.width,
    contrast,
    flipX,
    flipY,
    level,
    rotation,
  ]);

  const applyMainImageToWorkspace = useCallback(
    ({ nextImage, nextImageName, noticeText }) => {
      const width = nextImage?.naturalWidth || nextImage?.width || 0;
      const height = nextImage?.naturalHeight || nextImage?.height || 0;

      if (!width || !height) {
        setNotice("Gambar gagal diproses. Dimensi file tidak valid.");
        return false;
      }

      nextLineIdRef.current = 1;
      nextAngleIdRef.current = 1;
      nextCircleIdRef.current = 1;
      nextHkaIdRef.current = 1;
      nextCutLayerIdRef.current = 1;
      setImage(nextImage);
      setImageName(nextImageName || "xray-image");
      setLines([]);
      setAngles([]);
      setCircles([]);
      setHkaSets([]);
      setDraftAnglePoints([]);
      setDraftCirclePoints([]);
      setDraftHkaPoints([]);
      setDraftLine(null);
      setDraftCut(null);
      setCutLayers([]);
      setSelectedCutLayerId(null);
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setCalibrationLineId(null);
      setLockedLineIds(new Set());
      setMmPerPixel(null);
      setCalibrationMode("line");
      setSourceZoomPercent("100");
      setMmPerPixelAt100Input("0.63");
      setContrast(100);
      setLevel(100);
      setRotation(0);
      setFlipX(false);
      setFlipY(false);
      setCropRect({ x: 0, y: 0, width, height });
      setActualMmInput("13");
      setActualUnit("cm");
      setTemplateRealSizeInput("");
      setTemplateRealSizeUnit("cm");
      setTemplateRealSizeAxis("height");
      setMeasurementUnit("cm");
      setLinePreset("normal");
      setPlanNote("");
      setPlanSteps([]);
      setPlanningGuides([]);
      setSelectedPlanningGuideId(null);
      setPlanningGuideMode("valgusCut");
      setValgusCutAngleDeg(5);
      setValgusCutSide("Right");
      setValgusCutOffsetPx(10);
      setValgusCutLineLengthPx(100);
      setTibialSlopeDeg(7);
      setTibialPosteriorSide("Right");
      setTibialSlopeOffsetPx(10);
      setTibialSlopeLineLengthPx(90);
      setTibialCutAngleDeg(0);
      setTibialCutDirection("Valgus");
      setTibialCutOffsetPx(10);
      setTibialCutLineLengthPx(90);
      setPlanningGuideLabelOffsetX(DEFAULT_GUIDE_LABEL_OFFSET_X);
      setPlanningGuideLabelOffsetY(DEFAULT_GUIDE_LABEL_OFFSET_Y);
      setPlanningGuideLabelOpacity(DEFAULT_LABEL_OPACITY);
      setTool(getIdleTool());
      setMobilePanelMode("workspace");
      setMobileControlsOpen(false);
      resetHistoryStacks();
      setNotice(
        noticeText ||
          "Gambar aktif. Tarik garis referensi, lalu drag untuk adjust bila perlu sebelum kalibrasi.",
      );
      return true;
    },
    [getIdleTool, resetHistoryStacks],
  );

  const addImageAsWorkspaceLayer = useCallback(
    ({
      layerImage,
      imageSrc,
      name,
      noticeText,
      opacity = DEFAULT_TEMPLATE_LAYER_OPACITY,
      sizeMode = "template",
    }) => {
      if (!image || !modelWidth || !modelHeight) {
        setNotice(
          "Upload gambar layer bawah dulu sebelum menambahkan layer kedua.",
        );
        return false;
      }

      const rawW = layerImage?.naturalWidth || layerImage?.width || 0;
      const rawH = layerImage?.naturalHeight || layerImage?.height || 0;
      if (!rawW || !rawH) {
        setNotice("Layer gagal diproses. Dimensi file tidak valid.");
        return false;
      }

      const shouldMatchBase = sizeMode === "match-base";
      const contentBounds = shouldMatchBase
        ? null
        : getImageContentBounds(layerImage);
      const srcX = contentBounds?.x || 0;
      const srcY = contentBounds?.y || 0;
      const srcW = contentBounds?.width || rawW;
      const srcH = contentBounds?.height || rawH;
      const templateSizeSource =
        sizeMode === "inherit-template"
          ? selectedCutLayer?.kind === "upload"
            ? selectedCutLayer
            : [...cutLayers]
                .reverse()
                .find((layer) => layer.kind === "upload") || null
          : null;
      const rawInheritedTemplateSize = templateSizeSource
        ? getLayerDisplaySize(templateSizeSource)
        : null;
      const inheritedLooksLikeBackground =
        rawInheritedTemplateSize &&
        rawInheritedTemplateSize.width >= modelWidth * 0.86 &&
        rawInheritedTemplateSize.height >= modelHeight * 0.86;
      const inheritedTemplateSize = inheritedLooksLikeBackground
        ? null
        : rawInheritedTemplateSize;
      const sameCanvasSize =
        !contentBounds &&
        Math.abs(rawW - modelWidth) <= 2 &&
        Math.abs(rawH - modelHeight) <= 2;
      const targetMax =
        Math.min(modelWidth, modelHeight) * TEMPLATE_INITIAL_MAX_FRACTION;
      const targetMaxWidth = modelWidth * 0.42;
      const targetMaxHeight = modelHeight * 0.42;
      const scale = shouldMatchBase
        ? 1
        : sameCanvasSize
          ? Math.min(modelWidth / srcW, modelHeight / srcH)
          : Math.min(
              targetMax / srcW,
              targetMax / srcH,
              targetMaxWidth / srcW,
              targetMaxHeight / srcH,
              1,
            );
      const displayWidth = inheritedTemplateSize
        ? Math.max(18, inheritedTemplateSize.width)
        : shouldMatchBase || sameCanvasSize
          ? modelWidth
          : Math.max(18, srcW * scale);
      const displayHeight = inheritedTemplateSize
        ? Math.max(18, inheritedTemplateSize.height)
        : shouldMatchBase || sameCanvasSize
          ? modelHeight
          : Math.max(18, srcH * scale);

      const nextLayer = {
        id: nextCutLayerIdRef.current,
        kind: "upload",
        image: layerImage,
        imageSrc,
        name: name || `Layer ${nextCutLayerIdRef.current}`,
        sourceX: srcX,
        sourceY: srcY,
        sourceWidth: srcW,
        sourceHeight: srcH,
        displayWidth,
        displayHeight,
        centerX: modelWidth / 2,
        centerY: modelHeight / 2,
        rotation: 0,
        flipX: false,
        flipY: false,
        opacity:
          shouldMatchBase || sameCanvasSize ? Math.min(opacity, 0.6) : opacity,
        lockScale: false,
      };

      nextCutLayerIdRef.current += 1;
      setCutLayers((prev) => [...prev, nextLayer]);
      focusLayerSettings(nextLayer.id);
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setTool(getIdleTool());
      setMobileControlsOpen(!isMobileViewport);
      const trimText = contentBounds
        ? " Margin kosong template otomatis di-trim."
        : "";
      setNotice(
        (noticeText ||
          `Layer "${nextLayer.name}" ditambahkan di atas layer bawah.`) +
          trimText,
      );
      return true;
    },
    [
      cutLayers,
      focusLayerSettings,
      getIdleTool,
      image,
      isMobileViewport,
      modelHeight,
      modelWidth,
      selectedCutLayer,
    ],
  );

  const useSheetImageAsMain = useCallback(
    async (imageItem) => {
      const candidateSources = buildDriveImageCandidates(
        imageItem?.imageSrc,
        imageItem?.driveId,
      );
      if (candidateSources.length === 0) {
        setNotice("Gambar Google Drive belum valid.");
        return;
      }

      try {
        const loaded = await loadImageFromCandidates(candidateSources);
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        const applied = applyMainImageToWorkspace({
          nextImage: loaded.image,
          nextImageName: imageItem.name || "sheet-drive-image",
          noticeText: `Background "${imageItem.name || "Google Sheet Image"}" dimuat dari Google Sheet/Drive.`,
        });
        if (applied) {
          setMainImageSrc(loaded.src);
        }
      } catch {
        setNotice("Gagal memuat gambar dari Google Drive.");
      }
    },
    [applyMainImageToWorkspace],
  );

  const useSelectedSheetImageAsMain = useCallback(() => {
    const selectedItem =
      sheetMainImages.find(
        (item) => String(item.id) === String(selectedSheetMainImageId),
      ) || null;
    if (!selectedItem) {
      setNotice("Pilih gambar Google Sheet/Drive terlebih dulu.");
      return;
    }
    void useSheetImageAsMain(selectedItem);
  }, [sheetMainImages, selectedSheetMainImageId, useSheetImageAsMain]);

  const handleImageUpload = useCallback(
    (event) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;

      setMainImageSrc(null);

      void readFileAsDataUrl(file)
        .then((dataUrl) => {
          setMainImageSrc(dataUrl);
        })
        .catch(() => {
          setNotice("Gagal membaca file gambar. Coba file lain.");
        });

      const nextObjectUrl = URL.createObjectURL(file);
      const nextImage = new Image();

      nextImage.onload = () => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }

        const applied = applyMainImageToWorkspace({
          nextImage,
          nextImageName: file.name,
          noticeText: `Background "${file.name}" aktif untuk pengukuran.`,
        });
        if (applied) {
          objectUrlRef.current = nextObjectUrl;
        } else {
          URL.revokeObjectURL(nextObjectUrl);
        }
      };

      nextImage.onerror = () => {
        URL.revokeObjectURL(nextObjectUrl);
        setNotice("Gagal membaca file gambar. Coba file lain.");
      };

      nextImage.src = nextObjectUrl;
      input.value = "";
    },
    [applyMainImageToWorkspace],
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (!image) return;

      event.preventDefault();
      const point = getLocalPoint(event);
      const imagePoint = screenToImagePoint(point.x, point.y);
      const boundedPoint = clampToImageBounds(imagePoint);
      const isTouchLikePointer =
        event.pointerType === "touch" ||
        (isCoarsePointer && event.button === 0);

      if (event.button === 1 || event.button === 2) {
        interactionRef.current = {
          mode: "pan",
          startX: point.x,
          startY: point.y,
          startPanX: view.panX,
          startPanY: view.panY,
        };
        return;
      }

      if (event.button !== 0) return;

      if (tool === "pan" && isTouchLikePointer) {
        const assistHandleHit = findMobileHandleAssistHit(point);
        if (assistHandleHit) {
          const targetLine = lines.find(
            (line) => line.id === assistHandleHit.lineId,
          );
          if (!targetLine) return;
          if (targetLine.type) {
            setLinePreset(targetLine.type);
          }
          setSelectedLineId(targetLine.id);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedCutLayerId(null);
          setSelectedPlanningGuideId(null);
          if (isLineLocked(targetLine.id)) {
            setNotice("Garis ini terkunci. Unlock dulu sebelum di-adjust.");
            return;
          }
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-handle",
            lineId: targetLine.id,
            handleKey: assistHandleHit.handleKey,
          };
          setNotice(
            "Adjust ujung line aktif. Geser jari di dalam bundaran untuk memanjangkan atau memendekkan garis.",
          );
          return;
        }

        const hitHandle = findClosestHandle(imagePoint);
        if (hitHandle) {
          const targetLine = lines.find((line) => line.id === hitHandle.lineId);
          if (!targetLine) return;
          if (targetLine.type) {
            setLinePreset(targetLine.type);
          }
          setSelectedLineId(targetLine.id);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedCutLayerId(null);
          setSelectedPlanningGuideId(null);
          if (isLineLocked(targetLine.id)) {
            setNotice("Garis ini terkunci. Unlock dulu sebelum di-adjust.");
            return;
          }
          activateMobileHandleAssist(targetLine.id, hitHandle.handleKey);
          if (isMobileViewport) {
            setMobileControlsOpen(false);
          }
          setNotice(
            "Ujung line dipilih. Bundaran assist aktif, sentuh area bundaran untuk adjust panjang garis.",
          );
          return;
        }

        const hitLineId = findClosestLineId(imagePoint);
        if (hitLineId !== null) {
          const targetLine = lines.find((line) => line.id === hitLineId);
          if (!targetLine) return;
          if (targetLine.type) {
            setLinePreset(targetLine.type);
          }
          setSelectedLineId(hitLineId);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedCutLayerId(null);
          setSelectedPlanningGuideId(null);
          clearMobileHandleAssist();
          if (isLineLocked(hitLineId)) {
            setNotice("Garis ini terkunci. Unlock dulu sebelum dipindah.");
            return;
          }
          if (isMobileViewport) {
            setMobileControlsOpen(false);
          }
          const shouldMoveLine = isRepeatedMobileLineTap({
            targetType: "line-body",
            lineId: hitLineId,
          });
          if (!shouldMoveLine) {
            setNotice(
              "Garis dipilih. Tap lagi pada badan garis untuk pindah, atau sentuh ujung garis untuk adjust panjang.",
            );
            return;
          }
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-line",
            lineId: hitLineId,
            startImageX: imagePoint.x,
            startImageY: imagePoint.y,
            origin: {
              x1: targetLine.x1,
              y1: targetLine.y1,
              x2: targetLine.x2,
              y2: targetLine.y2,
            },
          };
          setNotice("Move line aktif. Geser jari untuk memindahkan garis.");
          return;
        }
      }

      if (tool === "pan") {
        interactionRef.current = {
          mode: "pan",
          startX: point.x,
          startY: point.y,
          startPanX: view.panX,
          startPanY: view.panY,
        };
        return;
      }

      if (tool === "cut") {
        const closeRadius = FREE_CUT_CLOSE_RADIUS_SCREEN / view.scale;

        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);

        if (draftCut?.points?.length) {
          const startPoint = draftCut.points[0];
          if (
            draftCut.points.length < MIN_FREE_CUT_POINTS &&
            getDistance(startPoint, boundedPoint) <= closeRadius
          ) {
            setNotice(
              `Free cut: pilih ${MIN_FREE_CUT_POINTS - draftCut.points.length} titik lagi.`,
            );
            return;
          }
          if (
            draftCut.points.length >= MIN_FREE_CUT_POINTS &&
            getDistance(startPoint, boundedPoint) <= closeRadius
          ) {
            completeDraftCut();
            return;
          }

          const lastPoint = draftCut.points[draftCut.points.length - 1];
          if (getDistance(lastPoint, boundedPoint) <= 1.5) {
            return;
          }

          const nextPoints = [...draftCut.points, boundedPoint];
          setDraftCut({
            points: nextPoints,
            hoverPoint: boundedPoint,
          });
          setHistoryPaused(true);
          setNotice(
            nextPoints.length >= MIN_FREE_CUT_POINTS
              ? "Free cut: lanjutkan titik atau klik titik awal untuk selesai."
              : `Free cut: pilih ${MIN_FREE_CUT_POINTS - nextPoints.length} titik lagi.`,
          );
          return;
        }

        setDraftCut({
          points: [boundedPoint],
          hoverPoint: boundedPoint,
        });
        setHistoryPaused(true);
        setNotice(
          "Free cut: klik beberapa titik mengikuti bentuk objek, lalu klik titik awal atau tekan Enter untuk selesai.",
        );
        return;
      }

      const hitCutLayerHandle = findCutLayerHandle(imagePoint);
      if (hitCutLayerHandle) {
        const targetLayer = cutLayers.find(
          (layer) => layer.id === hitCutLayerHandle.layerId,
        );
        if (!targetLayer) return;
        focusLayerSettings(targetLayer.id);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "resize-cut-layer",
          layerId: targetLayer.id,
          centerX: targetLayer.centerX,
          centerY: targetLayer.centerY,
          rotation: targetLayer.rotation,
        };
        return;
      }

      const hitCutLayerId = findCutLayerByPoint(imagePoint);
      if (
        hitCutLayerId !== null &&
        (tool === "draw" || selectedCutLayerId === hitCutLayerId)
      ) {
        const targetLayer = cutLayers.find(
          (layer) => layer.id === hitCutLayerId,
        );
        if (!targetLayer) return;
        focusLayerSettings(hitCutLayerId);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-cut-layer",
          layerId: hitCutLayerId,
          startImageX: imagePoint.x,
          startImageY: imagePoint.y,
          originCenterX: targetLayer.centerX,
          originCenterY: targetLayer.centerY,
        };
        return;
      }

      const hitPlanningGuideLabelId = findPlanningGuideLabelByPoint(point);
      if (hitPlanningGuideLabelId !== null) {
        const targetGuide = planningGuides.find(
          (guide) => guide.id === hitPlanningGuideLabelId,
        );
        if (!targetGuide) return;
        selectPlanningGuideForEdit(targetGuide.id);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-planning-guide-label",
          guideId: targetGuide.id,
          startX: point.x,
          startY: point.y,
          originOffsetX: Number.isFinite(targetGuide.labelOffsetX)
            ? targetGuide.labelOffsetX
            : DEFAULT_GUIDE_LABEL_OFFSET_X,
          originOffsetY: Number.isFinite(targetGuide.labelOffsetY)
            ? targetGuide.labelOffsetY
            : DEFAULT_GUIDE_LABEL_OFFSET_Y,
        };
        return;
      }

      const hitPlanningGuideHandle = findClosestPlanningGuideHandle(imagePoint);
      if (hitPlanningGuideHandle) {
        const targetGuide = planningGuides.find(
          (guide) => guide.id === hitPlanningGuideHandle.guideId,
        );
        if (!targetGuide) return;
        selectPlanningGuideForEdit(targetGuide.id);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        interactionRef.current = {
          mode: "move-planning-guide-handle",
          guideId: targetGuide.id,
          handleKey: hitPlanningGuideHandle.handleKey,
        };
        return;
      }

      const hitPlanningGuideId = findClosestPlanningGuideId(imagePoint);
      if (hitPlanningGuideId !== null) {
        const targetGuide = planningGuides.find(
          (guide) => guide.id === hitPlanningGuideId,
        );
        if (!targetGuide) return;
        selectPlanningGuideForEdit(targetGuide.id);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        interactionRef.current = {
          mode: "move-planning-guide",
          guideId: targetGuide.id,
          startImageX: imagePoint.x,
          startImageY: imagePoint.y,
          origin: {
            startX: targetGuide.anchorStart.x,
            startY: targetGuide.anchorStart.y,
            endX: targetGuide.anchorEnd.x,
            endY: targetGuide.anchorEnd.y,
          },
        };
        return;
      }

      const hitLineLabelId = findLineLabelByPoint(point);
      if (tool === "draw" && hitLineLabelId !== null) {
        const targetLine = lines.find((line) => line.id === hitLineLabelId);
        if (!targetLine) return;
        if (targetLine.type) {
          setLinePreset(targetLine.type);
        }
        setSelectedLineId(targetLine.id);
        setSelectedPlanningGuideId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        if (isLineLocked(targetLine.id)) {
          setNotice(
            "Garis ini terkunci. Buka lock dulu untuk memindahkan label.",
          );
          return;
        }
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-line-label",
          lineId: targetLine.id,
          startX: point.x,
          startY: point.y,
          originOffsetX: Number.isFinite(targetLine.labelOffsetX)
            ? targetLine.labelOffsetX
            : DEFAULT_LINE_LABEL_OFFSET_X,
          originOffsetY: Number.isFinite(targetLine.labelOffsetY)
            ? targetLine.labelOffsetY
            : DEFAULT_LINE_LABEL_OFFSET_Y,
        };
        return;
      }

      if (
        !hasCalibration &&
        (tool === "angle" || tool === "circle" || tool === "hkaAuto")
      ) {
        focusCalibrationStep(
          "Kalibrasi wajib sebelum memakai Angle/Circle/HKA.",
        );
        return;
      }

      if (tool === "angle") {
        const hitAngleHandle = findClosestAngleHandle(boundedPoint);
        if (hitAngleHandle) {
          setSelectedAngleId(hitAngleHandle.angleId);
          setSelectedLineId(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedCutLayerId(null);
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-angle-handle",
            angleId: hitAngleHandle.angleId,
            handleKey: hitAngleHandle.handleKey,
          };
          return;
        }

        setSelectedAngleId(null);
        setSelectedLineId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setDraftAnglePoints((prev) => {
          const next = [...prev, { x: boundedPoint.x, y: boundedPoint.y }];
          if (next.length < 3) {
            setNotice(`Angle: pilih ${3 - next.length} titik lagi.`);
            return next;
          }

          const nextAngle = {
            id: nextAngleIdRef.current,
            p1: next[0],
            p2: next[1],
            p3: next[2],
            color: DEFAULT_ANGLE_COLOR,
            labelOffsetX: DEFAULT_ANGLE_LABEL_OFFSET_X,
            labelOffsetY: DEFAULT_ANGLE_LABEL_OFFSET_Y,
            labelOpacity: DEFAULT_LABEL_OPACITY,
            strokeWidth: DEFAULT_ANGLE_STROKE_WIDTH,
          };
          nextAngleIdRef.current += 1;
          setAngles((items) => [...items, nextAngle]);
          setSelectedAngleId(nextAngle.id);
          setNotice("Angle measurement dibuat.");
          if (shouldUseMobileOneShotTool) {
            setTool(MOBILE_IDLE_TOOL);
            setMobileControlsOpen(false);
          }
          return [];
        });
        return;
      }

      if (tool === "circle") {
        const hitCircleHandle = findClosestCircleHandle(boundedPoint);
        if (hitCircleHandle) {
          setSelectedCircleId(hitCircleHandle.circleId);
          setSelectedLineId(null);
          setSelectedAngleId(null);
          setSelectedHkaId(null);
          setSelectedCutLayerId(null);
          setHistoryPaused(true);

          if (
            hitCircleHandle.handleKey === "center" ||
            hitCircleHandle.handleKey === "move"
          ) {
            const targetCircle = circles.find(
              (item) => item.id === hitCircleHandle.circleId,
            );
            if (!targetCircle) return;
            interactionRef.current = {
              mode: "move-circle-center",
              circleId: hitCircleHandle.circleId,
              startImageX: boundedPoint.x,
              startImageY: boundedPoint.y,
              originCenterX: targetCircle.cx,
              originCenterY: targetCircle.cy,
            };
          } else {
            interactionRef.current = {
              mode: "move-circle-radius",
              circleId: hitCircleHandle.circleId,
            };
          }
          return;
        }

        setSelectedCircleId(null);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setHistoryPaused(true);
        setDraftCirclePoints([
          { x: boundedPoint.x, y: boundedPoint.y },
          { x: boundedPoint.x, y: boundedPoint.y },
        ]);
        interactionRef.current = {
          mode: "draw-circle-radius",
          centerX: boundedPoint.x,
          centerY: boundedPoint.y,
        };
        setNotice("Circle: klik/drag dari pusat ke tepi diameter, lalu lepas.");
        return;
      }

      if (tool === "hkaAuto") {
        const hitHkaHandle = findClosestHkaHandle(boundedPoint);
        if (hitHkaHandle) {
          setSelectedHkaId(hitHkaHandle.hkaId);
          setSelectedLineId(null);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedCutLayerId(null);
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-hka-handle",
            hkaId: hitHkaHandle.hkaId,
            handleKey: hitHkaHandle.handleKey,
          };
          return;
        }

        setSelectedHkaId(null);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedCutLayerId(null);
        setDraftHkaPoints((prev) => {
          const next = [...prev, { x: boundedPoint.x, y: boundedPoint.y }];
          if (next.length < 3) {
            setNotice(
              `Auto HKA: pilih ${3 - next.length} titik lagi (hip-knee-ankle).`,
            );
            return next;
          }
          const nextHka = {
            id: nextHkaIdRef.current,
            hip: next[0],
            knee: next[1],
            ankle: next[2],
          };
          nextHkaIdRef.current += 1;
          setHkaSets((items) => [...items, nextHka]);
          setSelectedHkaId(nextHka.id);
          setNotice("Auto HKA dibuat dari landmarks.");
          if (shouldUseMobileOneShotTool) {
            setTool(MOBILE_IDLE_TOOL);
            setMobileControlsOpen(false);
          }
          return [];
        });
        return;
      }

      if (tool !== "draw") return;

      const hitHandle = findClosestHandle(imagePoint);
      if (hitHandle) {
        const targetLine = lines.find((line) => line.id === hitHandle.lineId);
        if (targetLine?.type) {
          setLinePreset(targetLine.type);
        }
        setSelectedLineId(hitHandle.lineId);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        if (isLineLocked(hitHandle.lineId)) {
          setNotice(
            "Garis ini terkunci. Buka lock dulu untuk mengubah ukuran/posisi.",
          );
          return;
        }
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-handle",
          lineId: hitHandle.lineId,
          handleKey: hitHandle.handleKey,
        };
        return;
      }

      const hitLineId = findClosestLineId(imagePoint);
      if (hitLineId !== null) {
        const targetLine = lines.find((line) => line.id === hitLineId);
        if (!targetLine) return;
        if (targetLine.type) {
          setLinePreset(targetLine.type);
        }

        setSelectedLineId(hitLineId);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        if (isLineLocked(hitLineId)) {
          setNotice(
            "Garis ini terkunci. Buka lock dulu untuk mengubah ukuran/posisi.",
          );
          return;
        }
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-line",
          lineId: hitLineId,
          startImageX: imagePoint.x,
          startImageY: imagePoint.y,
          origin: {
            x1: targetLine.x1,
            y1: targetLine.y1,
            x2: targetLine.x2,
            y2: targetLine.y2,
          },
        };
        return;
      }

      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setSelectedCutLayerId(null);

      const start = boundedPoint;
      setDraftLine({
        x1: start.x,
        y1: start.y,
        x2: start.x,
        y2: start.y,
        type: linePreset,
      });
      setHistoryPaused(true);
      interactionRef.current = {
        mode: "draw",
        startX: point.x,
        startY: point.y,
      };
    },
    [
      activateMobileHandleAssist,
      clampToImageBounds,
      clearMobileHandleAssist,
      completeDraftCut,
      circles,
      draftCut,
      findClosestAngleHandle,
      findClosestCircleHandle,
      findClosestHandle,
      findClosestHkaHandle,
      findClosestLineId,
      findMobileHandleAssistHit,
      findLineLabelByPoint,
      findClosestPlanningGuideHandle,
      findClosestPlanningGuideId,
      findPlanningGuideLabelByPoint,
      findCutLayerByPoint,
      findCutLayerHandle,
      focusLayerSettings,
      getLocalPoint,
      image,
      focusCalibrationStep,
      hasCalibration,
      isCoarsePointer,
      isMobileViewport,
      isLineLocked,
      isRepeatedMobileLineTap,
      cutLayers,
      lines,
      planningGuides,
      linePreset,
      selectPlanningGuideForEdit,
      selectedCutLayerId,
      setHistoryPaused,
      screenToImagePoint,
      shouldUseMobileOneShotTool,
      tool,
      view.panX,
      view.panY,
      view.scale,
    ],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!image) return;

      const point = getLocalPoint(event);
      if (!interactionRef.current.mode) {
        if (tool === "cut" && draftCut?.points?.length) {
          const movePoint = clampToImageBounds(
            screenToImagePoint(point.x, point.y),
          );
          setDraftCut((prev) =>
            prev
              ? {
                  ...prev,
                  hoverPoint: movePoint,
                }
              : prev,
          );
        }
        return;
      }

      event.preventDefault();

      if (interactionRef.current.mode === "pan") {
        const dx = point.x - interactionRef.current.startX;
        const dy = point.y - interactionRef.current.startY;
        setView((prev) => ({
          ...prev,
          panX: interactionRef.current.startPanX + dx,
          panY: interactionRef.current.startPanY + dy,
        }));
        return;
      }

      if (interactionRef.current.mode === "draw") {
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        setDraftLine((prev) => {
          if (!prev) return prev;
          return { ...prev, x2: movePoint.x, y2: movePoint.y };
        });
        return;
      }

      if (interactionRef.current.mode === "draw-circle-radius") {
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { centerX, centerY } = interactionRef.current;
        setDraftCirclePoints([
          { x: centerX, y: centerY },
          { x: movePoint.x, y: movePoint.y },
        ]);
        return;
      }

      if (interactionRef.current.mode === "move-cut-layer") {
        const {
          layerId,
          startImageX,
          startImageY,
          originCenterX,
          originCenterY,
        } = interactionRef.current;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        const dx = nextImagePoint.x - startImageX;
        const dy = nextImagePoint.y - startImageY;
        let nextCenterX = originCenterX + dx;
        let nextCenterY = originCenterY + dy;

        if (snapToLandmarks && landmarkPoints.length > 0) {
          const threshold = 14 / view.scale;
          let nearest = null;
          let nearestDist = Infinity;
          for (const landmark of landmarkPoints) {
            const dist = Math.hypot(
              landmark.x - nextCenterX,
              landmark.y - nextCenterY,
            );
            if (dist < nearestDist) {
              nearest = landmark;
              nearestDist = dist;
            }
          }
          if (nearest && nearestDist <= threshold) {
            nextCenterX = nearest.x;
            nextCenterY = nearest.y;
          }
        }

        setCutLayers((prev) =>
          prev.map((layer) =>
            layer.id === layerId
              ? { ...layer, centerX: nextCenterX, centerY: nextCenterY }
              : layer,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-planning-guide-handle") {
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { guideId, handleKey } = interactionRef.current;
        setPlanningGuides((prev) =>
          prev.map((guide) => {
            if (guide.id !== guideId) return guide;
            if (handleKey === "start") {
              return {
                ...guide,
                anchorStart: { x: movePoint.x, y: movePoint.y },
              };
            }
            return { ...guide, anchorEnd: { x: movePoint.x, y: movePoint.y } };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-planning-guide") {
        const { guideId, startImageX, startImageY, origin } =
          interactionRef.current;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        let dx = nextImagePoint.x - startImageX;
        let dy = nextImagePoint.y - startImageY;

        const minX = Math.min(origin.startX, origin.endX);
        const maxX = Math.max(origin.startX, origin.endX);
        const minY = Math.min(origin.startY, origin.endY);
        const maxY = Math.max(origin.startY, origin.endY);

        dx = clamp(dx, -minX, modelWidth - maxX);
        dy = clamp(dy, -minY, modelHeight - maxY);

        setPlanningGuides((prev) =>
          prev.map((guide) =>
            guide.id === guideId
              ? {
                  ...guide,
                  anchorStart: { x: origin.startX + dx, y: origin.startY + dy },
                  anchorEnd: { x: origin.endX + dx, y: origin.endY + dy },
                }
              : guide,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-planning-guide-label") {
        const { guideId, startX, startY, originOffsetX, originOffsetY } =
          interactionRef.current;
        const dx = point.x - startX;
        const dy = point.y - startY;
        setPlanningGuides((prev) =>
          prev.map((guide) =>
            guide.id === guideId
              ? {
                  ...guide,
                  labelOffsetX: clamp(originOffsetX + dx, -320, 320),
                  labelOffsetY: clamp(originOffsetY + dy, -220, 220),
                }
              : guide,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "resize-cut-layer") {
        const {
          layerId,
          centerX,
          centerY,
          rotation: layerRotation,
        } = interactionRef.current;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        const dx = nextImagePoint.x - centerX;
        const dy = nextImagePoint.y - centerY;
        const rad = (layerRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        const nextDisplayWidth = clamp(
          Math.abs(localX) * 2,
          16,
          modelWidth * 2,
        );
        const nextDisplayHeight = clamp(
          Math.abs(localY) * 2,
          16,
          modelHeight * 2,
        );

        setCutLayers((prev) =>
          prev.map((layer) =>
            layer.id === layerId
              ? layer.lockScale
                ? layer
                : {
                    ...layer,
                    displayWidth: nextDisplayWidth,
                    displayHeight: nextDisplayHeight,
                  }
              : layer,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-handle") {
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { lineId, handleKey } = interactionRef.current;
        if (isLineLocked(lineId)) return;

        setLines((prev) =>
          prev.map((line) => {
            if (line.id !== lineId) return line;
            if (handleKey === "start") {
              return { ...line, x1: movePoint.x, y1: movePoint.y };
            }
            return { ...line, x2: movePoint.x, y2: movePoint.y };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-line") {
        const { lineId, startImageX, startImageY, origin } =
          interactionRef.current;
        if (isLineLocked(lineId)) return;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        let dx = nextImagePoint.x - startImageX;
        let dy = nextImagePoint.y - startImageY;

        const minX = Math.min(origin.x1, origin.x2);
        const maxX = Math.max(origin.x1, origin.x2);
        const minY = Math.min(origin.y1, origin.y2);
        const maxY = Math.max(origin.y1, origin.y2);

        dx = clamp(dx, -minX, modelWidth - maxX);
        dy = clamp(dy, -minY, modelHeight - maxY);

        setLines((prev) =>
          prev.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  x1: origin.x1 + dx,
                  y1: origin.y1 + dy,
                  x2: origin.x2 + dx,
                  y2: origin.y2 + dy,
                }
              : line,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-line-label") {
        const { lineId, startX, startY, originOffsetX, originOffsetY } =
          interactionRef.current;
        if (isLineLocked(lineId)) return;
        const dx = point.x - startX;
        const dy = point.y - startY;
        setLines((prev) =>
          prev.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  labelOffsetX: clamp(originOffsetX + dx, -320, 320),
                  labelOffsetY: clamp(originOffsetY + dy, -220, 220),
                }
              : line,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-angle-handle") {
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { angleId, handleKey } = interactionRef.current;
        setAngles((prev) =>
          prev.map((item) => {
            if (item.id !== angleId) return item;
            if (handleKey === "p1")
              return { ...item, p1: { x: movePoint.x, y: movePoint.y } };
            if (handleKey === "p2")
              return { ...item, p2: { x: movePoint.x, y: movePoint.y } };
            return { ...item, p3: { x: movePoint.x, y: movePoint.y } };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-circle-center") {
        const {
          circleId,
          startImageX,
          startImageY,
          originCenterX,
          originCenterY,
        } = interactionRef.current;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        const dx = nextImagePoint.x - startImageX;
        const dy = nextImagePoint.y - startImageY;
        setCircles((prev) =>
          prev.map((item) =>
            item.id === circleId
              ? { ...item, cx: originCenterX + dx, cy: originCenterY + dy }
              : item,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-circle-radius") {
        const { circleId } = interactionRef.current;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        setCircles((prev) =>
          prev.map((item) => {
            if (item.id !== circleId) return item;
            const nextRadius = clamp(
              Math.hypot(
                nextImagePoint.x - item.cx,
                nextImagePoint.y - item.cy,
              ),
              3,
              Math.max(modelWidth, modelHeight) * 1.5,
            );
            return { ...item, radius: nextRadius };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-hka-handle") {
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { hkaId, handleKey } = interactionRef.current;
        setHkaSets((prev) =>
          prev.map((item) => {
            if (item.id !== hkaId) return item;
            if (handleKey === "hip")
              return { ...item, hip: { x: movePoint.x, y: movePoint.y } };
            if (handleKey === "knee")
              return { ...item, knee: { x: movePoint.x, y: movePoint.y } };
            return { ...item, ankle: { x: movePoint.x, y: movePoint.y } };
          }),
        );
      }
    },
    [
      angles,
      clampToImageBounds,
      circles,
      draftCut,
      getLocalPoint,
      image,
      isLineLocked,
      landmarkPoints,
      modelHeight,
      modelWidth,
      setPlanningGuides,
      screenToImagePoint,
      snapToLandmarks,
      tool,
      view.scale,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (interactionRef.current.mode === "draw" && draftLine) {
      const length = getLineLength(draftLine);
      if (length >= 2) {
        const nextLine = {
          ...draftLine,
          id: nextLineIdRef.current,
          labelOffsetX: DEFAULT_LINE_LABEL_OFFSET_X,
          labelOffsetY: DEFAULT_LINE_LABEL_OFFSET_Y,
          labelOpacity: DEFAULT_LABEL_OPACITY,
        };
        nextLineIdRef.current += 1;
        setLines((prev) => [...prev, nextLine]);
        setSelectedLineId(nextLine.id);
        if (isCoarsePointer) {
          setMobileHandleAssist({ lineId: nextLine.id, handleKey: "end" });
        }
        setNotice(
          shouldUseMobileOneShotTool
            ? "Line dibuat. Bundaran assist aktif di ujung garis, sentuh area itu untuk adjust panjang."
            : "Line dibuat. Drag ujung atau garis untuk adjust.",
        );
      }
      setDraftLine(null);
      if (shouldUseMobileOneShotTool) {
        setTool(MOBILE_IDLE_TOOL);
        setMobileControlsOpen(false);
      }
    }

    if (
      interactionRef.current.mode === "draw-circle-radius" &&
      draftCirclePoints.length >= 2
    ) {
      const center = draftCirclePoints[0];
      const edge = draftCirclePoints[1];
      const radius = getDistance(center, edge);
      if (radius >= 3) {
        const nextCircle = {
          id: nextCircleIdRef.current,
          cx: center.x,
          cy: center.y,
          radius,
          points: [center, edge],
        };
        nextCircleIdRef.current += 1;
        setCircles((prev) => [...prev, nextCircle]);
        setSelectedCircleId(nextCircle.id);
        setNotice(
          "Circle/diameter berhasil dibuat. Drag area dalam untuk pindah, drag tepi untuk resize.",
        );
      } else {
        setNotice("Diameter terlalu kecil. Ulangi circle.");
      }
      setDraftCirclePoints([]);
      if (shouldUseMobileOneShotTool) {
        setTool(MOBILE_IDLE_TOOL);
        setMobileControlsOpen(false);
      }
    }

    interactionRef.current = { mode: null, startX: 0, startY: 0 };
    resetMobileLineTapTarget();
    setHistoryPaused(false);
  }, [
    draftCirclePoints,
    draftLine,
    resetMobileLineTapTarget,
    shouldUseMobileOneShotTool,
  ]);

  const handleWheel = useCallback(
    (event) => {
      if (!image) return;

      event.preventDefault();
      const point = getLocalPoint(event);
      const zoomFactor = Math.exp(-event.deltaY * 0.0015);

      setView((prev) => {
        const nextScale = clamp(prev.scale * zoomFactor, MIN_SCALE, MAX_SCALE);
        if (nextScale === prev.scale) return prev;

        const anchor = {
          x: (point.x - prev.panX) / prev.scale,
          y: (point.y - prev.panY) / prev.scale,
        };

        return {
          scale: nextScale,
          panX: point.x - anchor.x * nextScale,
          panY: point.y - anchor.y * nextScale,
        };
      });
    },
    [getLocalPoint, image],
  );

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  const applyCalibration = useCallback(() => {
    const zoomPercent = Number(sourceZoomPercent);
    if (!Number.isFinite(zoomPercent) || zoomPercent <= 0) {
      setNotice("Zoom source harus angka > 0.");
      return;
    }

    if (calibrationMode === "zoom") {
      const baseFactorAt100 = Number(mmPerPixelAt100Input);
      if (!Number.isFinite(baseFactorAt100) || baseFactorAt100 <= 0) {
        setNotice("Isi nilai mm/px pada zoom 100% dengan angka valid.");
        return;
      }
      const factorFromZoom = baseFactorAt100 * (100 / zoomPercent);
      setMmPerPixel(factorFromZoom);
      setCalibrationLineId(null);
      setNotice(
        `Kalibrasi zoom aktif (${zoomPercent.toFixed(2)}%). Faktor: ${factorFromZoom.toFixed(6)} mm/px. QC: verifikasi lagi dengan ruler jika tersedia.`,
      );
      return;
    }

    if (!selectedLine) {
      setNotice("Pilih satu garis dulu untuk dijadikan referensi kalibrasi.");
      return;
    }

    const actualMm = Number(actualMmInput);
    if (!Number.isFinite(actualMm) || actualMm <= 0) {
      setNotice("Nilai referensi harus angka positif.");
      return;
    }

    const lengthPx = getLineLength(selectedLine);
    if (lengthPx <= 0) {
      setNotice("Garis referensi tidak valid.");
      return;
    }

    const actualMmValue = actualUnit === "cm" ? actualMm * 10 : actualMm;
    const factor = actualMmValue / lengthPx;
    const normalizedAt100 = factor * (zoomPercent / 100);
    const endpointTolerancePx = 2;
    const estimatedErrorPct = (endpointTolerancePx / lengthPx) * 100;
    const qcText =
      estimatedErrorPct > 3.5
        ? "QC rendah"
        : estimatedErrorPct > 1.8
          ? "QC sedang"
          : "QC baik";

    setMmPerPixel(factor);
    setCalibrationLineId(selectedLine.id);
    if (Number.isFinite(normalizedAt100) && normalizedAt100 > 0) {
      setMmPerPixelAt100Input(normalizedAt100.toFixed(6));
    }
    setNotice(
      `Kalibrasi garis berhasil (zoom source ${zoomPercent.toFixed(2)}%). ${qcText}: estimasi error ±${estimatedErrorPct.toFixed(2)}%.`,
    );
  }, [
    actualMmInput,
    actualUnit,
    calibrationMode,
    mmPerPixelAt100Input,
    selectedLine,
    sourceZoomPercent,
  ]);

  const removeSelectedLine = useCallback(() => {
    if (selectedLine) {
      if (isLineLocked(selectedLine.id)) {
        setNotice("Garis terkunci. Unlock dulu sebelum dihapus.");
        return;
      }

      setLines((prev) => prev.filter((line) => line.id !== selectedLine.id));
      setLockedLineIds((prev) => {
        if (!prev.has(selectedLine.id)) return prev;
        const next = new Set(prev);
        next.delete(selectedLine.id);
        return next;
      });

      if (selectedLine.id === calibrationLineId) {
        setCalibrationLineId(null);
        setMmPerPixel(null);
        setNotice("Garis kalibrasi dihapus. Silakan kalibrasi ulang.");
      } else {
        setNotice("Garis terpilih dihapus.");
      }

      setSelectedLineId(null);
      return;
    }

    if (selectedAngle) {
      setAngles((prev) => prev.filter((item) => item.id !== selectedAngle.id));
      setSelectedAngleId(null);
      setNotice("Angle terpilih dihapus.");
      return;
    }

    if (selectedCircle) {
      setCircles((prev) =>
        prev.filter((item) => item.id !== selectedCircle.id),
      );
      setSelectedCircleId(null);
      setNotice("Circle terpilih dihapus.");
      return;
    }

    if (selectedHka) {
      setHkaSets((prev) => prev.filter((item) => item.id !== selectedHka.id));
      setSelectedHkaId(null);
      setNotice("HKA terpilih dihapus.");
      return;
    }

    setNotice("Tidak ada measurement yang dipilih.");
  }, [
    calibrationLineId,
    isLineLocked,
    selectedAngle,
    selectedCircle,
    selectedHka,
    selectedLine,
  ]);

  const toggleSelectedLineLock = useCallback(() => {
    if (!selectedLine) {
      setNotice("Pilih garis dulu untuk lock/unlock.");
      return;
    }

    const targetId = selectedLine.id;
    const willUnlock = lockedLineIds.has(targetId);
    setLockedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
    setNotice(
      willUnlock
        ? "Lock dibuka. Garis bisa diubah kembali."
        : "Garis di-lock. Posisi dan ukurannya tidak bisa diubah.",
    );
  }, [lockedLineIds, selectedLine]);

  const clearMeasurementLines = useCallback(() => {
    const keepIds = new Set(lockedLineIds);
    if (calibrationLineId !== null) keepIds.add(calibrationLineId);
    setLines((prev) => prev.filter((line) => keepIds.has(line.id)));
    setAngles([]);
    setCircles([]);
    setHkaSets([]);
    setDraftAnglePoints([]);
    setDraftCirclePoints([]);
    setDraftHkaPoints([]);
    setLockedLineIds(
      (prev) => new Set([...prev].filter((id) => keepIds.has(id))),
    );
    setDraftLine(null);
    setSelectedAngleId(null);
    setSelectedCircleId(null);
    setSelectedHkaId(null);
    if (selectedLineId !== null) {
      if (!keepIds.has(selectedLineId)) {
        setSelectedLineId(calibrationLineId);
      }
    }
    if (lockedLineIds.size > 0 && calibrationLineId !== null) {
      setNotice("Measurement dihapus, garis lock dan kalibrasi dipertahankan.");
      return;
    }
    if (lockedLineIds.size > 0) {
      setNotice("Measurement dihapus, garis lock dipertahankan.");
      return;
    }
    if (calibrationLineId !== null) {
      setNotice("Garis measurement dihapus, garis kalibrasi dipertahankan.");
      return;
    }
    setNotice("Semua measurement dihapus.");
  }, [calibrationLineId, lockedLineIds, selectedLineId]);

  const resetCalibration = useCallback(() => {
    setCalibrationLineId(null);
    setMmPerPixel(null);
    setNotice(
      "Kalibrasi di-reset. Garis tetap ada, silakan pilih garis referensi baru.",
    );
  }, []);

  const applyTemplateRealSize = useCallback(() => {
    if (!selectedCutLayer) {
      setNotice("Pilih template layer dulu untuk di-scale.");
      return;
    }
    if (!isImageBackedLayerKind(selectedCutLayer.kind)) {
      setNotice("Scale real size hanya untuk layer gambar/template.");
      return;
    }
    if (mmPerPixel === null) {
      setNotice("Kalibrasi garis real dulu sebelum mengatur ukuran template.");
      return;
    }
    if (selectedCutLayer.lockScale) {
      setNotice("Scale template terkunci. Buka Lock Scale dulu.");
      return;
    }

    const inputValue = Number(templateRealSizeInput);
    if (!Number.isFinite(inputValue) || inputValue <= 0) {
      setNotice("Isi ukuran real template dengan angka positif.");
      return;
    }

    const targetMm =
      templateRealSizeUnit === "cm" ? inputValue * 10 : inputValue;
    const targetPixels = targetMm / mmPerPixel;
    const currentSize = getLayerDisplaySize(selectedCutLayer);
    if (
      !Number.isFinite(currentSize.width) ||
      !Number.isFinite(currentSize.height) ||
      currentSize.width <= 0 ||
      currentSize.height <= 0
    ) {
      setNotice("Ukuran template saat ini tidak valid.");
      return;
    }

    const nextWidth =
      templateRealSizeAxis === "width"
        ? clamp(targetPixels, 16, Math.max(16, modelWidth * 3))
        : currentSize.width;
    const nextHeight =
      templateRealSizeAxis === "height"
        ? clamp(targetPixels, 16, Math.max(16, modelHeight * 3))
        : currentSize.height;

    setCutLayers((prev) =>
      prev.map((layer) =>
        layer.id === selectedCutLayer.id
          ? { ...layer, displayWidth: nextWidth, displayHeight: nextHeight }
          : layer,
      ),
    );
    const unitHint =
      templateRealSizeUnit === "mm" && inputValue <= 30
        ? " Jika hasil terlalu kecil dan maksudnya sentimeter, ganti unit ke cm."
        : "";
    const lockedAxisHint =
      templateRealSizeAxis === "width"
        ? " Tinggi tetap memakai ukuran layer sebelumnya."
        : " Lebar tetap memakai ukuran layer sebelumnya.";
    setNotice(
      `Template #${selectedCutLayer.id} di-scale dari ${templateRealSizeAxis === "width" ? "lebar" : "tinggi"} real ${inputValue} ${templateRealSizeUnit}.${lockedAxisHint}${unitHint}`,
    );
  }, [
    mmPerPixel,
    modelHeight,
    modelWidth,
    selectedCutLayer,
    templateRealSizeAxis,
    templateRealSizeInput,
    templateRealSizeUnit,
  ]);

  const trimSelectedTemplateLayer = useCallback(() => {
    if (!selectedCutLayer) {
      setNotice("Pilih template layer dulu untuk trim margin.");
      return;
    }
    if (
      !isImageBackedLayerKind(selectedCutLayer.kind) ||
      !selectedCutLayer.image
    ) {
      setNotice("Trim margin hanya untuk layer gambar/template.");
      return;
    }
    if (selectedCutLayer.lockScale) {
      setNotice(
        "Scale template terkunci. Buka Lock Scale dulu sebelum trim margin.",
      );
      return;
    }

    const bounds = getImageContentBounds(selectedCutLayer.image);
    if (!bounds) {
      setNotice("Tidak ada margin kosong yang bisa di-trim pada template ini.");
      return;
    }

    const oldSourceX = Number(selectedCutLayer.sourceX || 0);
    const oldSourceY = Number(selectedCutLayer.sourceY || 0);
    const oldSourceWidth = Math.max(
      1,
      Number(selectedCutLayer.sourceWidth || bounds.width),
    );
    const oldSourceHeight = Math.max(
      1,
      Number(selectedCutLayer.sourceHeight || bounds.height),
    );
    const isSameBounds =
      Math.abs(bounds.x - oldSourceX) <= 2 &&
      Math.abs(bounds.y - oldSourceY) <= 2 &&
      Math.abs(bounds.width - oldSourceWidth) <= 2 &&
      Math.abs(bounds.height - oldSourceHeight) <= 2;
    if (isSameBounds) {
      setNotice("Template sudah memakai bounding box konten.");
      return;
    }

    const currentSize = getLayerDisplaySize(selectedCutLayer);
    const nextDisplayWidth = clamp(
      currentSize.width * (bounds.width / oldSourceWidth),
      16,
      Math.max(16, modelWidth * 3),
    );
    const nextDisplayHeight = clamp(
      currentSize.height * (bounds.height / oldSourceHeight),
      16,
      Math.max(16, modelHeight * 3),
    );
    const localOffsetX =
      ((bounds.x + bounds.width / 2 - (oldSourceX + oldSourceWidth / 2)) /
        oldSourceWidth) *
      currentSize.width *
      (selectedCutLayer.flipX ? -1 : 1);
    const localOffsetY =
      ((bounds.y + bounds.height / 2 - (oldSourceY + oldSourceHeight / 2)) /
        oldSourceHeight) *
      currentSize.height *
      (selectedCutLayer.flipY ? -1 : 1);
    const rotatedOffset = rotateVector(
      localOffsetX,
      localOffsetY,
      selectedCutLayer.rotation || 0,
    );

    setCutLayers((prev) =>
      prev.map((layer) =>
        layer.id === selectedCutLayer.id
          ? {
              ...layer,
              sourceX: bounds.x,
              sourceY: bounds.y,
              sourceWidth: bounds.width,
              sourceHeight: bounds.height,
              displayWidth: nextDisplayWidth,
              displayHeight: nextDisplayHeight,
              centerX: layer.centerX + rotatedOffset.x,
              centerY: layer.centerY + rotatedOffset.y,
            }
          : layer,
      ),
    );
    setNotice(
      "Margin kosong template di-trim. Scale real sekarang memakai bounding box konten.",
    );
  }, [modelHeight, modelWidth, selectedCutLayer]);

  const applyTemplateRulerScale = useCallback(() => {
    if (!selectedCutLayer) {
      setNotice("Pilih template layer dulu untuk scale dari ruler template.");
      return;
    }
    if (
      !isImageBackedLayerKind(selectedCutLayer.kind) ||
      !selectedCutLayer.image
    ) {
      setNotice("Scale ruler hanya untuk layer gambar/template.");
      return;
    }
    if (mmPerPixel === null) {
      setNotice(
        "Kalibrasi garis real X-ray dulu sebelum memakai ruler template.",
      );
      return;
    }
    if (selectedCutLayer.lockScale) {
      setNotice("Scale template terkunci. Buka Lock Scale dulu.");
      return;
    }

    const rulerScale = estimateTemplateRulerPxPerMm(selectedCutLayer.image);
    if (!rulerScale) {
      setNotice(
        "Ruler template tidak terbaca otomatis. Gunakan Trim Margin + Scale Real manual.",
      );
      return;
    }

    const sourceWidth = Math.max(1, Number(selectedCutLayer.sourceWidth || 0));
    const sourceHeight = Math.max(
      1,
      Number(selectedCutLayer.sourceHeight || 0),
    );
    const nextWidth = clamp(
      sourceWidth / rulerScale.pxPerMm / mmPerPixel,
      16,
      Math.max(16, modelWidth * 3),
    );
    const nextHeight = clamp(
      sourceHeight / rulerScale.pxPerMm / mmPerPixel,
      16,
      Math.max(16, modelHeight * 3),
    );

    setCutLayers((prev) =>
      prev.map((layer) =>
        layer.id === selectedCutLayer.id
          ? { ...layer, displayWidth: nextWidth, displayHeight: nextHeight }
          : layer,
      ),
    );
    setNotice(
      `Template #${selectedCutLayer.id} disesuaikan dari ruler ${rulerScale.axis}.`,
    );
  }, [mmPerPixel, modelHeight, modelWidth, selectedCutLayer]);

  const copySelectedTemplateScale = useCallback(() => {
    if (!selectedCutLayer || !isImageBackedLayerKind(selectedCutLayer.kind)) {
      setNotice("Pilih template layer dulu untuk copy scale.");
      return;
    }

    const size = getLayerDisplaySize(selectedCutLayer);
    if (
      !Number.isFinite(size.width) ||
      !Number.isFinite(size.height) ||
      size.width <= 0 ||
      size.height <= 0
    ) {
      setNotice("Ukuran template tidak valid untuk copy scale.");
      return;
    }

    setCopiedTemplateScale({
      width: size.width,
      height: size.height,
      copiedFromId: selectedCutLayer.id,
      copiedFromName: selectedCutLayer.name || `Layer #${selectedCutLayer.id}`,
    });
    const text = `Scale template #${selectedCutLayer.id} berhasil dicopy.`;
    setNotice(text);
    setActionToast({ id: Date.now(), type: "success", text });
  }, [selectedCutLayer]);

  const pasteTemplateScaleToSelected = useCallback(() => {
    if (!selectedCutLayer || !isImageBackedLayerKind(selectedCutLayer.kind)) {
      setNotice("Pilih template layer tujuan dulu untuk paste scale.");
      return;
    }
    if (selectedCutLayer.lockScale) {
      setNotice("Scale template tujuan terkunci. Buka Lock Scale dulu.");
      return;
    }
    if (
      !copiedTemplateScale ||
      !Number.isFinite(copiedTemplateScale.width) ||
      !Number.isFinite(copiedTemplateScale.height)
    ) {
      setNotice("Belum ada scale template yang dicopy.");
      return;
    }

    const nextWidth = clamp(
      copiedTemplateScale.width,
      16,
      Math.max(16, modelWidth * 3),
    );
    const nextHeight = clamp(
      copiedTemplateScale.height,
      16,
      Math.max(16, modelHeight * 3),
    );
    setCutLayers((prev) =>
      prev.map((layer) =>
        layer.id === selectedCutLayer.id
          ? { ...layer, displayWidth: nextWidth, displayHeight: nextHeight }
          : layer,
      ),
    );
    const text = `Scale dari ${copiedTemplateScale.copiedFromName} berhasil dipaste ke template #${selectedCutLayer.id}.`;
    setNotice(text);
    setActionToast({ id: Date.now(), type: "success", text });
  }, [copiedTemplateScale, modelHeight, modelWidth, selectedCutLayer]);

  const rotateLeft = useCallback(() => {
    setRotation((prev) => (prev + 270) % 360);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const moveCutLayerInStack = useCallback((layerId, placement) => {
    setCutLayers((prev) => {
      const currentIndex = prev.findIndex((layer) => layer.id === layerId);
      if (currentIndex < 0) return prev;

      let targetIndex = currentIndex;
      if (placement === "back") targetIndex = 0;
      if (placement === "down") targetIndex = Math.max(0, currentIndex - 1);
      if (placement === "up")
        targetIndex = Math.min(prev.length - 1, currentIndex + 1);
      if (placement === "front") targetIndex = prev.length - 1;
      if (targetIndex === currentIndex) return prev;

      const next = [...prev];
      const [layer] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, layer);
      return next;
    });
    setNotice("Urutan layer diperbarui.");
  }, []);

  const resetCutArea = useCallback(() => {
    setDraftCut(null);
    setCutLayers([]);
    setSelectedCutLayerId(null);
    nextCutLayerIdRef.current = 1;
    setNotice("Semua cut layer dihapus. Background asli tetap.");
  }, []);

  const resetWorkspaceState = useCallback(
    ({ clearImage = false } = {}) => {
      if (clearImage && objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      setLines([]);
      setAngles([]);
      setCircles([]);
      setHkaSets([]);
      setDraftAnglePoints([]);
      setDraftCirclePoints([]);
      setDraftHkaPoints([]);
      setDraftLine(null);
      setDraftCut(null);
      setCutLayers([]);
      setCompareMode(false);
      setCompareImage(null);
      setCompareImageSrc(null);
      setCompareImageName("");
      setSelectedCutLayerId(null);
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setCalibrationLineId(null);
      setLockedLineIds(new Set());
      setMmPerPixel(null);
      setCalibrationMode("line");
      setSourceZoomPercent("100");
      setMmPerPixelAt100Input("0.63");
      setActualMmInput("13");
      setActualUnit("cm");
      setTemplateRealSizeInput("");
      setTemplateRealSizeUnit("cm");
      setTemplateRealSizeAxis("height");
      setCopiedTemplateScale(null);
      setActionToast(null);
      setMeasureAnatomyTab("knee");
      setContrast(100);
      setLevel(100);
      setRotation(0);
      setFlipX(false);
      setFlipY(false);
      setMeasurementUnit("cm");
      setLinePreset("normal");
      setPlanNote("");
      setPlanSteps([]);
      setPlanningGuides([]);
      setSelectedPlanningGuideId(null);
      setPlanningGuideMode("valgusCut");
      setValgusCutAngleDeg(5);
      setValgusCutSide("Right");
      setValgusCutOffsetPx(10);
      setValgusCutLineLengthPx(100);
      setTibialSlopeDeg(7);
      setTibialPosteriorSide("Right");
      setTibialSlopeOffsetPx(10);
      setTibialSlopeLineLengthPx(90);
      setTibialCutAngleDeg(0);
      setTibialCutDirection("Valgus");
      setTibialCutOffsetPx(10);
      setTibialCutLineLengthPx(90);
      setMeasureAnatomyTab("knee");
      setPlanningGuideLabelOffsetX(DEFAULT_GUIDE_LABEL_OFFSET_X);
      setPlanningGuideLabelOffsetY(DEFAULT_GUIDE_LABEL_OFFSET_Y);
      setPlanningGuideLabelOpacity(DEFAULT_LABEL_OPACITY);
      setTool(getIdleTool());
      setView({ scale: 1, panX: 0, panY: 0 });
      setActiveRightPanel("tool");
      setMobilePanelMode("workspace");
      setMobileControlsOpen(!isMobileViewport);

      if (clearImage) {
        setImage(null);
        setMainImageSrc(null);
        setImageName("");
        setCropRect(null);
      } else if (imageWidth && imageHeight) {
        setCropRect({ x: 0, y: 0, width: imageWidth, height: imageHeight });
      }

      nextLineIdRef.current = 1;
      nextAngleIdRef.current = 1;
      nextCircleIdRef.current = 1;
      nextHkaIdRef.current = 1;
      nextCutLayerIdRef.current = 1;
      resetHistoryStacks();
      setNotice(
        clearImage
          ? "Canvas di-reset total. Upload background baru untuk mulai lagi."
          : "Semua pengaturan di-reset.",
      );
    },
    [
      getIdleTool,
      imageHeight,
      imageWidth,
      isMobileViewport,
      resetHistoryStacks,
    ],
  );

  const handleLayerUpload = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!image || !modelWidth || !modelHeight) {
        setNotice(
          "Upload gambar utama dulu sebelum menambahkan template layer.",
        );
        event.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result !== "string") {
          setNotice("Template layer gagal diproses.");
          event.target.value = "";
          return;
        }

        try {
          const layerImage = await loadImageFromSrc(reader.result);
          const srcW = layerImage.naturalWidth || layerImage.width || 0;
          const srcH = layerImage.naturalHeight || layerImage.height || 0;
          if (!srcW || !srcH) {
            setNotice("Template layer gagal diproses.");
            event.target.value = "";
            return;
          }

          addImageAsWorkspaceLayer({
            layerImage,
            imageSrc: reader.result,
            name: file.name,
            sizeMode: "inherit-template",
            noticeText: `Template layer "${file.name}" ditambahkan.`,
          });
          event.target.value = "";
        } catch {
          setNotice("Gagal membaca file template layer.");
          event.target.value = "";
        }
      };

      reader.onerror = () => {
        setNotice("Gagal membaca file template layer.");
        event.target.value = "";
      };

      reader.readAsDataURL(file);
    },
    [addImageAsWorkspaceLayer, image, modelHeight, modelWidth],
  );

  const saveStoryNow = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORY_STORAGE_KEY,
        JSON.stringify(buildStoryPayload()),
      );
      restoredRef.current = true;
      setNotice("Story disimpan ke perangkat. Bisa dibuka lagi saat offline.");
    } catch {
      setNotice("Gagal simpan story. Penyimpanan lokal mungkin penuh.");
    }
  }, [buildStoryPayload]);

  const clearSavedStory = useCallback(() => {
    if (typeof window === "undefined") return;
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    skipNextAutosaveRef.current = true;
    window.localStorage.removeItem(STORY_STORAGE_KEY);
    setNotice("Story lokal di perangkat dihapus.");
  }, []);

  const handleCompareUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCompareImageSrc(reader.result);
        setCompareImageName(file.name);
        setCompareMode(true);
        setNotice(`Gambar compare "${file.name}" dimuat.`);
      }
    };
    reader.onerror = () => {
      setNotice("Gagal membaca gambar compare.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }, []);

  const saveSelectedLayerToLibrary = useCallback(async () => {
    if (!selectedCutLayer) {
      setNotice("Pilih cut layer dulu untuk disimpan sebagai template.");
      return;
    }
    if (!image || !cropRect) {
      setNotice("Gambar utama belum siap.");
      return;
    }

    const isImageBackedLayer = isImageBackedLayerKind(selectedCutLayer.kind);
    const sourceImage = isImageBackedLayer ? selectedCutLayer.image : image;
    if (!sourceImage) {
      setNotice("Sumber layer tidak ditemukan.");
      return;
    }

    const sourceX = isImageBackedLayer
      ? selectedCutLayer.sourceX
      : cropRect.x + selectedCutLayer.sourceX;
    const sourceY = isImageBackedLayer
      ? selectedCutLayer.sourceY
      : cropRect.y + selectedCutLayer.sourceY;

    const sourceW = Math.max(1, Math.floor(selectedCutLayer.sourceWidth));
    const sourceH = Math.max(1, Math.floor(selectedCutLayer.sourceHeight));
    const canvas = document.createElement("canvas");
    canvas.width = sourceW;
    canvas.height = sourceH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setNotice("Gagal membuat template.");
      return;
    }
    ctx.drawImage(
      sourceImage,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      sourceW,
      sourceH,
    );
    let imageSrc = "";
    try {
      imageSrc = canvas.toDataURL("image/png");
    } catch {
      setNotice(
        "Gagal menyimpan template dari gambar remote. Pastikan bucket storage mengizinkan CORS/public read.",
      );
      return;
    }

    const nextTemplate = {
      id: Date.now(),
      name:
        selectedCutLayer.name ||
        `${selectedCutLayer.kind === "upload" ? "Upload" : "Fragment"}-${sourceW}x${sourceH}`,
      imageSrc,
      sourceWidth: sourceW,
      sourceHeight: sourceH,
      createdAt: new Date().toISOString(),
    };
    setTemplateLibrary((prev) =>
      mergeTemplateLibraryLists([nextTemplate], prev),
    );

    if (!hasTemplateCollectionConfig) {
      setNotice(
        `Template "${nextTemplate.name}" disimpan lokal. Isi konfigurasi Appwrite database/collection untuk sync cloud.`,
      );
      return;
    }

    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.templateCollectionId,
        ID.unique(),
        {
          name: nextTemplate.name,
          imageSrc: nextTemplate.imageSrc,
          sourceWidth: nextTemplate.sourceWidth,
          sourceHeight: nextTemplate.sourceHeight,
          createdAt: nextTemplate.createdAt,
        },
      );
      setNotice(`Template "${nextTemplate.name}" disimpan lokal + Appwrite.`);
    } catch {
      setNotice(
        `Template "${nextTemplate.name}" disimpan lokal, tetapi gagal sync ke Appwrite (cek schema collection).`,
      );
    }
  }, [cropRect, image, selectedCutLayer]);

  const addTemplateToCanvas = useCallback(
    async (template) => {
      if (!image || !modelWidth || !modelHeight) {
        setNotice("Upload gambar utama dulu sebelum menambahkan template.");
        return;
      }

      try {
        const loaded = await loadImageFromCandidates(
          buildDriveImageCandidates(template.imageSrc, template.driveId),
        );
        const layerImage = loaded.image;
        const srcW =
          layerImage.naturalWidth ||
          layerImage.width ||
          template.sourceWidth ||
          0;
        const srcH =
          layerImage.naturalHeight ||
          layerImage.height ||
          template.sourceHeight ||
          0;
        if (!srcW || !srcH) {
          setNotice("Template library tidak valid.");
          return;
        }

        addImageAsWorkspaceLayer({
          layerImage,
          imageSrc: loaded.src,
          name: template.name,
          sizeMode: "inherit-template",
          noticeText: `Template "${template.name}" ditambahkan ke canvas.`,
        });
      } catch {
        setNotice("Gagal load template dari library.");
      }
    },
    [addImageAsWorkspaceLayer, image, modelHeight, modelWidth],
  );

  const useSelectedTemplateAsLayer = useCallback(() => {
    const selectedTemplate = templateLibrary.find(
      (template) => String(template.id) === String(selectedTemplateId),
    );
    if (!selectedTemplate) {
      setNotice("Pilih template terlebih dahulu.");
      return;
    }
    void addTemplateToCanvas(selectedTemplate);
  }, [addTemplateToCanvas, selectedTemplateId, templateLibrary]);

  const useTemplateItemAsLayer = useCallback(
    (template) => {
      if (!template) return;
      setSelectedTemplateId(template.id);
      void addTemplateToCanvas(template);
    },
    [addTemplateToCanvas],
  );

  const useSelectedImplantLibraryAsLayer = useCallback(() => {
    if (!selectedImplantLibraryItem) {
      setNotice("Pilih implant lokal terlebih dahulu.");
      return;
    }
    void addTemplateToCanvas({
      id: selectedImplantLibraryItem.id,
      name: selectedImplantLibraryItem.label,
      imageSrc: selectedImplantLibraryItem.imageSrc,
      sourceWidth: 0,
      sourceHeight: 0,
    });
  }, [addTemplateToCanvas, selectedImplantLibraryItem]);

  const useGoogleSheetImageAsLayer = useCallback(
    (sheetImage) => {
      if (!sheetImage?.imageSrc) {
        setNotice("URL gambar dari Google Sheet tidak valid.");
        return;
      }
      void addTemplateToCanvas({
        id: sheetImage.id || Date.now(),
        name: sheetImage.name || "Sheet Layer",
        imageSrc: sheetImage.imageSrc,
        driveId: sheetImage.driveId,
        sourceWidth: Number(sheetImage.sourceWidth || 0) || 0,
        sourceHeight: Number(sheetImage.sourceHeight || 0) || 0,
      });
    },
    [addTemplateToCanvas],
  );

  const removeTemplateFromLibrary = useCallback((templateId) => {
    setTemplateLibrary((prev) => prev.filter((item) => item.id !== templateId));
    setSelectedTemplateId((prev) =>
      String(prev) === String(templateId) ? null : prev,
    );
  }, []);

  const measurementRows = useMemo(() => {
    const rows = [];

    for (const line of lines) {
      const lengthPx = getLineLength(line);
      rows.push({
        type: lineTypeLabel(line.type),
        value:
          mmPerPixel !== null
            ? formatMeasurementFromPx(lengthPx)
            : `${lengthPx.toFixed(2)} px`,
      });
    }
    for (const angle of angles) {
      rows.push({
        type: "ANGLE",
        value: `${getAngleDegrees(angle.p1, angle.p2, angle.p3).toFixed(2)}°`,
      });
    }
    for (const circle of circles) {
      const diaPx = circle.radius * 2;
      rows.push({
        type: "DIAMETER",
        value:
          mmPerPixel !== null
            ? `${measurementUnit === "cm" ? ((diaPx * mmPerPixel) / 10).toFixed(2) : (diaPx * mmPerPixel).toFixed(2)} ${measurementUnit}`
            : `${diaPx.toFixed(2)} px`,
      });
    }
    for (const item of hkaSets) {
      rows.push({
        type: "HKA",
        value: `${getAngleDegrees(item.hip, item.knee, item.ankle).toFixed(2)}°`,
      });
    }
    return rows;
  }, [
    angles,
    circles,
    formatMeasurementFromPx,
    hkaSets,
    lineTypeLabel,
    lines,
    measurementUnit,
    mmPerPixel,
  ]);

  const legPackageSummary = useMemo(() => {
    const readType = (type) =>
      lines
        .filter((line) => line.type === type)
        .map((line) => getLineLength(line));
    const femoral = readType("femoralOffset");
    const global = readType("globalOffset");
    const lld = readType("lld");
    const fmt = (valuePx) =>
      mmPerPixel !== null
        ? formatMeasurementFromPx(valuePx)
        : `${valuePx.toFixed(2)} px`;

    return {
      femoralMean: femoral.length
        ? fmt(femoral.reduce((sum, value) => sum + value, 0) / femoral.length)
        : "-",
      globalMean: global.length
        ? fmt(global.reduce((sum, value) => sum + value, 0) / global.length)
        : "-",
      lldDelta:
        lld.length >= 2
          ? fmt(Math.abs(lld[0] - lld[1]))
          : lld.length === 1
            ? fmt(lld[0])
            : "-",
    };
  }, [formatMeasurementFromPx, lines, mmPerPixel]);

  const templateInventoryRows = useMemo(() => {
    const formatLayerSize = (widthPx, heightPx) => {
      if (mmPerPixel === null) {
        return `${Math.round(widthPx)} x ${Math.round(heightPx)} px`;
      }

      const widthMm = widthPx * mmPerPixel;
      const heightMm = heightPx * mmPerPixel;
      if (measurementUnit === "cm") {
        return `${(widthMm / 10).toFixed(2)} x ${(heightMm / 10).toFixed(2)} cm`;
      }
      return `${widthMm.toFixed(2)} x ${heightMm.toFixed(2)} mm`;
    };

    return cutLayers.map((layer) => {
      const size = getLayerDisplaySize(layer);
      return {
        id: layer.id,
        name: layer.name || `Layer #${layer.id}`,
        kind: layer.kind === "upload" ? "Template" : "Fragment",
        size: formatLayerSize(size.width, size.height),
        opacity: `${Math.round((layer.opacity ?? 1) * 100)}%`,
        rotation: `${Math.round(((layer.rotation || 0) + 360) % 360)}°`,
      };
    });
  }, [cutLayers, measurementUnit, mmPerPixel]);

  const planningGuideRows = useMemo(
    () =>
      planningGuides.map((guide, index) => {
        if (guide.kind === "valgusCut") {
          return {
            angle: `${guide.angleDeg}°`,
            id: guide.id,
            label: getPlanningGuideLabelText(guide, index),
            meta: `Offset ${guide.offsetPx} | Length ${guide.lineLengthPx}`,
          };
        }
        if (guide.kind === "tibialSlope") {
          return {
            angle: `${guide.angleDeg}°`,
            id: guide.id,
            label: getPlanningGuideLabelText(guide, index),
            meta: `Offset ${guide.offsetPx} | Length ${guide.lineLengthPx}`,
          };
        }
        return {
          angle: `${guide.angleDeg}°`,
          id: guide.id,
          label: getPlanningGuideLabelText(guide, index),
          meta: `Offset ${guide.offsetPx} | Length ${guide.lineLengthPx}`,
        };
      }),
    [getPlanningGuideLabelText, planningGuides],
  );

  const measurePresetButtonClass = useCallback(
    (isActive, activeClass) =>
      `rounded-md border px-2 py-1 text-xs ${isActive ? activeClass : "border-slate-300 bg-white text-slate-700"}`,
    [],
  );

  useEffect(() => {
    if (!selectedPlanningGuideId) return;
    const exists = planningGuides.some(
      (guide) => guide.id === selectedPlanningGuideId,
    );
    if (!exists) {
      setSelectedPlanningGuideId(null);
    }
  }, [planningGuides, selectedPlanningGuideId]);

  useEffect(() => {
    if (!selectedPlanningGuideId) return;
    if (
      selectedLineId !== null ||
      selectedAngleId !== null ||
      selectedCircleId !== null ||
      selectedHkaId !== null ||
      selectedCutLayerId !== null
    ) {
      setSelectedPlanningGuideId(null);
    }
  }, [
    selectedAngleId,
    selectedCircleId,
    selectedCutLayerId,
    selectedHkaId,
    selectedLineId,
    selectedPlanningGuideId,
  ]);

  function selectPlanningGuideForEdit(guideId) {
    setSelectedPlanningGuideId(guideId);
    setMeasureAnatomyTab("knee");
    setMobilePanelMode("workspace");
    if (isMobileViewport) {
      setMobileControlsOpen(true);
    }
    setActiveRightPanel("measure");
    setNotice(
      "Planning guide dipilih. Parameter bisa diubah lalu update lagi.",
    );
  }

  const updateSelectedPlanningGuide = useCallback(
    ({ syncLine = false } = {}) => {
      if (!selectedPlanningGuide) {
        setNotice("Pilih planning guide dulu.");
        return;
      }

      setPlanningGuides((prev) =>
        prev.map((guide) => {
          if (guide.id !== selectedPlanningGuide.id) return guide;

          const anchorStart =
            syncLine && selectedLine
              ? { x: selectedLine.x1, y: selectedLine.y1 }
              : guide.anchorStart;
          const anchorEnd =
            syncLine && selectedLine
              ? { x: selectedLine.x2, y: selectedLine.y2 }
              : guide.anchorEnd;

          if (planningGuideMode === "valgusCut") {
            return {
              ...guide,
              kind: "valgusCut",
              anchorStart,
              anchorEnd,
              angleDeg: valgusCutAngleDeg,
              offsetPx: valgusCutOffsetPx,
              lineLengthPx: valgusCutLineLengthPx,
              side: valgusCutSide,
              labelOffsetX: planningGuideLabelOffsetX,
              labelOffsetY: planningGuideLabelOffsetY,
              labelOpacity: planningGuideLabelOpacity,
            };
          }

          if (planningGuideMode === "tibialSlope") {
            return {
              ...guide,
              kind: "tibialSlope",
              anchorStart,
              anchorEnd,
              angleDeg: tibialSlopeDeg,
              offsetPx: tibialSlopeOffsetPx,
              lineLengthPx: tibialSlopeLineLengthPx,
              posteriorSide: tibialPosteriorSide,
              labelOffsetX: planningGuideLabelOffsetX,
              labelOffsetY: planningGuideLabelOffsetY,
              labelOpacity: planningGuideLabelOpacity,
            };
          }

          return {
            ...guide,
            kind: "tibialCut",
            anchorStart,
            anchorEnd,
            angleDeg: tibialCutAngleDeg,
            offsetPx: tibialCutOffsetPx,
            lineLengthPx: tibialCutLineLengthPx,
            direction: tibialCutDirection,
            labelOffsetX: planningGuideLabelOffsetX,
            labelOffsetY: planningGuideLabelOffsetY,
            labelOpacity: planningGuideLabelOpacity,
          };
        }),
      );

      setNotice(
        syncLine && selectedLine
          ? "Planning guide diperbarui dan disamakan ke line terpilih."
          : "Planning guide berhasil diperbarui.",
      );
    },
    [
      planningGuideLabelOffsetX,
      planningGuideLabelOffsetY,
      planningGuideLabelOpacity,
      planningGuideMode,
      selectedLine,
      selectedPlanningGuide,
      tibialCutAngleDeg,
      tibialCutDirection,
      tibialCutLineLengthPx,
      tibialCutOffsetPx,
      tibialPosteriorSide,
      tibialSlopeDeg,
      tibialSlopeLineLengthPx,
      tibialSlopeOffsetPx,
      valgusCutAngleDeg,
      valgusCutLineLengthPx,
      valgusCutOffsetPx,
      valgusCutSide,
    ],
  );

  const addPlanningStep = useCallback(() => {
    const selectedTarget = selectedLine
      ? `Line #${selectedLine.id}`
      : selectedAngle
        ? `Angle #${selectedAngle.id}`
        : selectedCircle
          ? `Circle #${selectedCircle.id}`
          : selectedHka
            ? `HKA #${selectedHka.id}`
            : selectedCutLayer
              ? `${selectedCutLayer.kind === "upload" ? "Template" : "Fragment"} #${selectedCutLayer.id}`
              : "-";
    const nextStep = {
      id: Date.now(),
      title: `Step ${planSteps.length + 1}`,
      at: new Date().toLocaleString(),
      note:
        planNote.trim() ||
        `Planning snapshot: ${measurementRows.length} measurement, ${templateInventoryRows.length} template/fragment.`,
      calibration:
        mmPerPixel !== null
          ? `${mmPerPixel.toFixed(6)} mm/px`
          : "Belum dikalibrasi",
      selectedTarget,
      measurements: measurementRows.slice(0, 30),
      inventory: templateInventoryRows.slice(0, 30),
      planningGuides: planningGuideRows.slice(0, 30),
    };

    setPlanSteps((prev) => [...prev.slice(-59), nextStep]);
    setPlanNote("");
    setNotice("Planning step ditambahkan ke report.");
  }, [
    measurementRows,
    mmPerPixel,
    planNote,
    planSteps.length,
    selectedAngle,
    selectedCircle,
    selectedCutLayer,
    selectedHka,
    selectedLine,
    templateInventoryRows,
    planningGuideRows,
  ]);

  const removePlanningStep = useCallback((stepId) => {
    setPlanSteps((prev) => prev.filter((step) => step.id !== stepId));
    setNotice("Planning step dihapus.");
  }, []);

  const addPlanningGuideFromSelectedLine = useCallback(() => {
    if (!selectedLine) {
      setNotice("Pilih satu garis dulu untuk dijadikan acuan planning.");
      setActiveRightPanel("measure");
      return;
    }

    if (planningGuideMode === "valgusCut") {
      const nextGuide = {
        id: createTemplatingId(),
        kind: "valgusCut",
        anchorStart: { x: selectedLine.x1, y: selectedLine.y1 },
        anchorEnd: { x: selectedLine.x2, y: selectedLine.y2 },
        angleDeg: valgusCutAngleDeg,
        hidden: false,
        lineLengthPx: valgusCutLineLengthPx,
        offsetPx: valgusCutOffsetPx,
        side: valgusCutSide,
        labelOffsetX: DEFAULT_GUIDE_LABEL_OFFSET_X,
        labelOffsetY: DEFAULT_GUIDE_LABEL_OFFSET_Y,
        labelOpacity: DEFAULT_LABEL_OPACITY,
      };
      setPlanningGuides((prev) => [...prev, nextGuide]);
      setSelectedPlanningGuideId(nextGuide.id);
      setNotice(`Distal cut guide dibuat dari Line #${selectedLine.id}.`);
      return;
    }

    if (planningGuideMode === "tibialSlope") {
      const nextGuide = {
        id: createTemplatingId(),
        kind: "tibialSlope",
        anchorStart: { x: selectedLine.x1, y: selectedLine.y1 },
        anchorEnd: { x: selectedLine.x2, y: selectedLine.y2 },
        angleDeg: tibialSlopeDeg,
        hidden: false,
        lineLengthPx: tibialSlopeLineLengthPx,
        offsetPx: tibialSlopeOffsetPx,
        posteriorSide: tibialPosteriorSide,
        labelOffsetX: DEFAULT_GUIDE_LABEL_OFFSET_X,
        labelOffsetY: DEFAULT_GUIDE_LABEL_OFFSET_Y,
        labelOpacity: DEFAULT_LABEL_OPACITY,
      };
      setPlanningGuides((prev) => [...prev, nextGuide]);
      setSelectedPlanningGuideId(nextGuide.id);
      setNotice(`Tibial slope guide dibuat dari Line #${selectedLine.id}.`);
      return;
    }

    const nextGuide = {
      id: createTemplatingId(),
      kind: "tibialCut",
      anchorStart: { x: selectedLine.x1, y: selectedLine.y1 },
      anchorEnd: { x: selectedLine.x2, y: selectedLine.y2 },
      angleDeg: tibialCutAngleDeg,
      direction: tibialCutDirection,
      hidden: false,
      lineLengthPx: tibialCutLineLengthPx,
      offsetPx: tibialCutOffsetPx,
      labelOffsetX: DEFAULT_GUIDE_LABEL_OFFSET_X,
      labelOffsetY: DEFAULT_GUIDE_LABEL_OFFSET_Y,
      labelOpacity: DEFAULT_LABEL_OPACITY,
    };
    setPlanningGuides((prev) => [...prev, nextGuide]);
    setSelectedPlanningGuideId(nextGuide.id);
    setNotice(`Tibial cut guide dibuat dari Line #${selectedLine.id}.`);
  }, [
    planningGuideMode,
    selectedLine,
    tibialCutAngleDeg,
    tibialCutDirection,
    tibialCutLineLengthPx,
    tibialCutOffsetPx,
    tibialPosteriorSide,
    tibialSlopeDeg,
    tibialSlopeLineLengthPx,
    tibialSlopeOffsetPx,
    valgusCutAngleDeg,
    valgusCutLineLengthPx,
    valgusCutOffsetPx,
    valgusCutSide,
  ]);

  const removePlanningGuide = useCallback((guideId) => {
    setPlanningGuides((prev) => prev.filter((guide) => guide.id !== guideId));
    setSelectedPlanningGuideId((prev) => (prev === guideId ? null : prev));
    setNotice("Planning guide dihapus.");
  }, []);

  const togglePlanningGuideHidden = useCallback((guideId) => {
    setPlanningGuides((prev) =>
      prev.map((guide) =>
        guide.id === guideId ? { ...guide, hidden: !guide.hidden } : guide,
      ),
    );
  }, []);

  const exportReportPng = useCallback(() => {
    if (!hasCalibration) {
      focusCalibrationStep("Export report dikunci sampai kalibrasi aktif.");
      return;
    }

    const imageCanvas = imageCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!imageCanvas || !overlayCanvas) {
      setNotice("Canvas belum siap untuk export.");
      return;
    }

    const outCanvas = document.createElement("canvas");
    outCanvas.width = imageCanvas.width;
    outCanvas.height = imageCanvas.height;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imageCanvas, 0, 0);
    ctx.drawImage(overlayCanvas, 0, 0);

    try {
      outCanvas.toBlob((blob) => {
        if (!blob) {
          setNotice("Gagal membuat file PNG.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const baseName = (imageName || "xray-report").replace(/\.[^.]+$/, "");
        link.href = url;
        link.download = `${baseName}-report.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1200);
        setNotice("Report PNG berhasil diunduh.");
      }, "image/png");
    } catch {
      setNotice(
        "Export PNG gagal karena gambar tidak origin-clean (CORS). Pastikan file storage bisa diakses dengan CORS/public read.",
      );
    }
  }, [focusCalibrationStep, hasCalibration, imageName]);

  const exportReportPdf = useCallback(() => {
    if (!hasCalibration) {
      focusCalibrationStep("Export report dikunci sampai kalibrasi aktif.");
      return;
    }

    const imageCanvas = imageCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!imageCanvas || !overlayCanvas) {
      setNotice("Canvas belum siap untuk export.");
      return;
    }

    const outCanvas = document.createElement("canvas");
    outCanvas.width = imageCanvas.width;
    outCanvas.height = imageCanvas.height;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imageCanvas, 0, 0);
    ctx.drawImage(overlayCanvas, 0, 0);

    let imageData = "";
    try {
      imageData = outCanvas.toDataURL("image/png");
    } catch {
      setNotice(
        "Export PDF gagal karena gambar tidak origin-clean (CORS). Pastikan file storage bisa diakses dengan CORS/public read.",
      );
      return;
    }
    const rowsHtml =
      measurementRows.length === 0
        ? "<tr><td colspan='2'>Belum ada measurement.</td></tr>"
        : measurementRows
            .map(
              (row, index) =>
                `<tr><td style="padding:6px;border:1px solid #cbd5e1">${index + 1}. ${escapeHtml(row.type)}</td><td style="padding:6px;border:1px solid #cbd5e1">${escapeHtml(row.value)}</td></tr>`,
            )
            .join("");
    const inventoryRowsHtml =
      templateInventoryRows.length === 0
        ? "<tr><td colspan='5'>Belum ada template atau fragment.</td></tr>"
        : templateInventoryRows
            .map(
              (row, index) =>
                `<tr><td style="padding:6px;border:1px solid #cbd5e1">${index + 1}. ${escapeHtml(row.kind)}</td><td style="padding:6px;border:1px solid #cbd5e1">${escapeHtml(row.name)}</td><td style="padding:6px;border:1px solid #cbd5e1">${escapeHtml(row.size)}</td><td style="padding:6px;border:1px solid #cbd5e1">${escapeHtml(row.opacity)}</td><td style="padding:6px;border:1px solid #cbd5e1">${escapeHtml(row.rotation)}</td></tr>`,
            )
            .join("");
    const planStepsHtml =
      planSteps.length === 0
        ? "<li>Belum ada planning step.</li>"
        : planSteps
            .map(
              (step) =>
                `<li style="margin-bottom:8px;"><strong>${escapeHtml(step.title)}</strong> <span style="color:#64748b;">${escapeHtml(step.at)}</span><br/><span>${escapeHtml(step.note)}</span><br/><span style="color:#334155;">Kalibrasi: ${escapeHtml(step.calibration)} | Selected: ${escapeHtml(step.selectedTarget)}</span></li>`,
            )
            .join("");

    const reportWindow = window.open("", "_blank", "width=1080,height=900");
    if (!reportWindow) {
      setNotice("Popup diblokir browser. Izinkan popup untuk export PDF.");
      return;
    }

    reportWindow.document.write(`
      <html>
        <head>
          <title>Xray Report</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
          <h2 style="margin:0 0 8px 0;">Xray Measurement Report</h2>
          <p style="margin:0 0 10px 0; color:#334155;">File: ${escapeHtml(imageName || "-")}</p>
          <img src="${imageData}" style="max-width:100%; border:1px solid #cbd5e1;" />
          <h3 style="margin:16px 0 8px 0;">Measurement</h3>
          <table style="border-collapse:collapse; width:100%; font-size:12px;">
            <thead>
              <tr>
                <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Type</th>
                <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Value</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <h3 style="margin:16px 0 8px 0;">Template / Fragment Inventory</h3>
          <table style="border-collapse:collapse; width:100%; font-size:12px;">
            <thead>
              <tr>
                <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Type</th>
                <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Name</th>
                <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Size</th>
                <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Opacity</th>
                <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Rotation</th>
              </tr>
            </thead>
            <tbody>${inventoryRowsHtml}</tbody>
          </table>
          <h3 style="margin:16px 0 8px 0;">Planning Steps</h3>
          <ol style="font-size:12px; padding-left:20px;">${planStepsHtml}</ol>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
    setNotice("Jendela PDF report dibuka. Pilih Save as PDF.");
  }, [
    focusCalibrationStep,
    hasCalibration,
    imageName,
    measurementRows,
    planSteps,
    templateInventoryRows,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      const targetTag = target?.tagName?.toLowerCase();
      const isFormField =
        targetTag === "input" ||
        targetTag === "textarea" ||
        targetTag === "select" ||
        target?.isContentEditable;
      if (isFormField) return;

      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isMeta && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoHistory();
        } else {
          undoHistory();
        }
        return;
      }
      if (isMeta && key === "y") {
        event.preventDefault();
        redoHistory();
        return;
      }

      if (key === "escape" && draftCut?.points?.length) {
        event.preventDefault();
        setDraftCut(null);
        setHistoryPaused(false);
        setNotice("Free cut dibatalkan.");
        return;
      }

      if (key === "enter" && tool === "cut" && draftCut?.points?.length >= 3) {
        event.preventDefault();
        completeDraftCut();
        return;
      }

      if (key === "l" || key === "d") handleToolChange("draw");
      if (key === "h" || key === "m" || key === "p") handleToolChange("pan");
      if (key === "c") handleToolChange("cut");
      if (key === "a") handleToolChange("angle");
      if (key === "o") handleToolChange("circle");
      if (key === "k") handleToolChange("hkaAuto");
      if (key === "f") fitImageToViewport();
      if ((key === "delete" || key === "backspace") && !isMeta) {
        event.preventDefault();
        removeSelectedLine();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    completeDraftCut,
    draftCut,
    fitImageToViewport,
    handleToolChange,
    redoHistory,
    removeSelectedLine,
    undoHistory,
  ]);

  const zoomBy = useCallback(
    (factor) => {
      if (!viewport.width || !viewport.height) return;

      setView((prev) => {
        const centerX = viewport.width / 2;
        const centerY = viewport.height / 2;
        const nextScale = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
        if (nextScale === prev.scale) return prev;

        const anchorX = (centerX - prev.panX) / prev.scale;
        const anchorY = (centerY - prev.panY) / prev.scale;

        return {
          scale: nextScale,
          panX: centerX - anchorX * nextScale,
          panY: centerY - anchorY * nextScale,
        };
      });
    },
    [viewport.height, viewport.width],
  );

  const goToCalibrationPanel = useCallback(() => {
    focusCalibrationStep(
      "Lakukan kalibrasi dulu pada ruler X-ray agar measurement akurat.",
    );
  }, [focusCalibrationStep]);

  const startSidebarResize = useCallback(
    (side) => (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      sidebarResizeRef.current = {
        side,
        startWidth: side === "left" ? leftSidebarWidth : rightSidebarWidth,
        startX: event.clientX,
      };
    },
    [leftSidebarWidth, rightSidebarWidth],
  );

  useEffect(() => {
    const handlePointerMove = (event) => {
      const resizing = sidebarResizeRef.current;
      if (!resizing) return;

      if (resizing.side === "left") {
        const delta = event.clientX - resizing.startX;
        setLeftSidebarWidth(
          clamp(
            resizing.startWidth + delta,
            LEFT_SIDEBAR_MIN_WIDTH,
            LEFT_SIDEBAR_MAX_WIDTH,
          ),
        );
        return;
      }

      const delta = resizing.startX - event.clientX;
      setRightSidebarWidth(
        clamp(
          resizing.startWidth + delta,
          RIGHT_SIDEBAR_MIN_WIDTH,
          RIGHT_SIDEBAR_MAX_WIDTH,
        ),
      );
    };

    const stopResize = () => {
      if (!sidebarResizeRef.current) return;
      sidebarResizeRef.current = null;
      if (typeof document !== "undefined") {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    const startCursor = () => {
      if (!sidebarResizeRef.current || typeof document === "undefined") return;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };

    const handlePointerMoveWithCursor = (event) => {
      if (!sidebarResizeRef.current) return;
      startCursor();
      handlePointerMove(event);
    };

    window.addEventListener("pointermove", handlePointerMoveWithCursor);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMoveWithCursor);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
      stopResize();
    };
  }, []);

  const desktopSectionClass =
    showLeftSidebar && showRightSidebar
      ? "lg:[grid-template-columns:var(--left-sidebar-width)_minmax(0,1fr)_var(--right-sidebar-width)]"
      : showLeftSidebar
        ? "lg:[grid-template-columns:var(--left-sidebar-width)_minmax(0,1fr)]"
        : showRightSidebar
          ? "lg:[grid-template-columns:minmax(0,1fr)_var(--right-sidebar-width)]"
          : "lg:grid-cols-1";
  const isLeftSidebarCompact = leftSidebarWidth <= 170;
  const isLeftSidebarNarrow = leftSidebarWidth <= 220;
  const isRightSidebarCompact = rightSidebarWidth <= 170;
  const isRightSidebarNarrow = rightSidebarWidth <= 220;
  const mobileSetupPanelVisible =
    isMobileViewport &&
    mobileControlsOpen &&
    showLeftSidebar &&
    mobilePanelMode === "setup";
  const mobileWorkspacePanelVisible =
    isMobileViewport &&
    mobileControlsOpen &&
    showRightSidebar &&
    mobilePanelMode === "workspace";
  const activeToolLabel =
    tool === "draw"
      ? "Draw"
      : tool === "pan"
        ? "Move"
        : tool === "cut"
          ? "Free Cut"
          : tool === "angle"
            ? "Angle"
            : tool === "circle"
              ? "Circle"
              : "Auto HKA";
  const activeToolIcon =
    tool === "draw"
      ? "draw"
      : tool === "pan"
        ? "pan"
        : tool === "cut"
          ? "cut"
          : tool === "angle"
            ? "angle"
            : tool === "circle"
              ? "circle"
              : "hka";

  return (
    <div className="flex min-h-[100dvh] w-screen max-w-none flex-col gap-0 px-0 py-0 sm:gap-2 sm:px-2 sm:py-2 lg:px-3">
      <AnimatePresence>
        {showStartupCalibrationAlert ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                goToCalibrationPanel();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={PANEL_SPRING}
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            >
              <h2 className="text-base font-semibold text-slate-900">
                Kalibrasi Wajib Sebelum Ukur
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Untuk hasil ukuran akurat, tarik garis kalibrasi pada ruler
                X-ray (contoh 13 cm), lalu isi nilai aktual dan simpan kalibrasi
                sebelum melakukan measurement.
              </p>
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Langkah cepat: Upload gambar, tarik garis di ruler, simpan
                kalibrasi, lalu mulai ukur.
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={goToCalibrationPanel}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                >
                  Keluar
                </button>
                <button
                  type="button"
                  onClick={goToCalibrationPanel}
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                >
                  Saya Mengerti
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {actionToast ? (
          <motion.div
            key={actionToast.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={PANEL_SPRING}
            className={`fixed top-4 right-4 z-[95] max-w-[320px] rounded-lg border px-3 py-2 text-xs font-medium shadow-lg transition-all ${
              actionToast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {actionToast.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <header className="flex items-start justify-between gap-2 px-3 pt-2 pb-1 sm:px-0 sm:py-0">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-base font-semibold text-slate-900 sm:text-xl">
            Foto X-ray Measurement
          </h1>
          <p className="hidden text-xs text-slate-600 sm:block">
            Upload, kalibrasi & ukur
          </p>
        </div>
        <IconButton
          icon={mobileControlsOpen ? "close" : "menu"}
          label={mobileControlsOpen ? "Tutup Kontrol" : "Buka Kontrol"}
          onClick={() => setMobileControlsOpen((prev) => !prev)}
          active={mobileControlsOpen}
          className="lg:hidden"
        />
      </header>

      <motion.section
        layout
        className={`relative grid min-h-0 flex-1 gap-0 lg:gap-2 ${desktopSectionClass}`}
        style={{
          "--left-sidebar-width": `${leftSidebarWidth}px`,
          "--right-sidebar-width": `${rightSidebarWidth}px`,
        }}
      >
        {showLeftSidebar ? (
          <div
            role="separator"
            aria-label="Resize menu kiri"
            onPointerDown={startSidebarResize("left")}
            className="absolute top-0 bottom-0 z-20 hidden w-3 -translate-x-1/2 cursor-col-resize lg:block"
            style={{ left: leftSidebarWidth }}
          >
            <div className="mx-auto h-full w-[2px] rounded-full bg-slate-200 transition hover:bg-slate-400" />
          </div>
        ) : null}
        <motion.button
          type="button"
          onClick={() => setShowLeftSidebar((prev) => !prev)}
          whileHover={BUTTON_HOVER}
          whileTap={BUTTON_TAP}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="absolute top-1/2 z-30 hidden h-12 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-blue-500 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:flex"
          style={{ left: showLeftSidebar ? leftSidebarWidth : 12 }}
          aria-label={showLeftSidebar ? "Hide menu kiri" : "Show menu kiri"}
          title={showLeftSidebar ? "Hide menu kiri" : "Show menu kiri"}
        >
          <Icon
            name={showLeftSidebar ? "moveLeft" : "moveRight"}
            className="h-4 w-4"
          />
        </motion.button>
        {showRightSidebar ? (
          <div
            role="separator"
            aria-label="Resize menu kanan"
            onPointerDown={startSidebarResize("right")}
            className="absolute top-0 bottom-0 z-20 hidden w-3 translate-x-1/2 cursor-col-resize lg:block"
            style={{ right: rightSidebarWidth }}
          >
            <div className="mx-auto h-full w-[2px] rounded-full bg-slate-200 transition hover:bg-slate-400" />
          </div>
        ) : null}
        <motion.button
          type="button"
          onClick={() => setShowRightSidebar((prev) => !prev)}
          whileHover={BUTTON_HOVER}
          whileTap={BUTTON_TAP}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="absolute top-1/2 z-30 hidden h-12 w-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-blue-500 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:flex"
          style={{ right: showRightSidebar ? rightSidebarWidth : 12 }}
          aria-label={showRightSidebar ? "Hide menu kanan" : "Show menu kanan"}
          title={showRightSidebar ? "Hide menu kanan" : "Show menu kanan"}
        >
          <Icon
            name={showRightSidebar ? "moveRight" : "moveLeft"}
            className="h-4 w-4"
          />
        </motion.button>
        <motion.aside
          layout
          initial={false}
          transition={PANEL_SPRING}
          className={`order-2 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 ${
            mobileSetupPanelVisible
              ? "fixed inset-x-0 bottom-0 z-40 flex max-h-[72vh] overflow-y-auto overscroll-contain rounded-t-[28px] border-b-0 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl"
              : "hidden"
          } ${showLeftSidebar ? "lg:order-1 lg:flex lg:max-h-[calc(100vh-132px)] lg:overflow-y-auto lg:rounded-xl lg:shadow-none" : "lg:hidden"}`}
        >
          <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-2 grid grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200 bg-white/96 px-3 py-2 backdrop-blur lg:hidden">
            <span />
            <span className="h-1.5 w-12 justify-self-center rounded-full bg-slate-300" />
            <button
              type="button"
              onClick={() => setMobileControlsOpen(false)}
              className="inline-flex h-8 w-8 justify-self-end rounded-full border border-slate-200 bg-slate-50 text-slate-600"
              aria-label="Tutup setup panel"
              title="Tutup setup panel"
            >
              <Icon name="close" className="m-auto h-4 w-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setMobilePanelMode("setup");
                setMobileControlsOpen(true);
              }}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${
                mobilePanelMode === "setup"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              Setup
            </button>
            <button
              type="button"
              onClick={() => {
                setMobilePanelMode("workspace");
                setMobileControlsOpen(true);
              }}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${
                mobilePanelMode === "workspace"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              Panel
            </button>
          </div>
          <div className="order-2 flex flex-col gap-2" style={{ order: 2 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="upload" className="h-4 w-4 text-slate-600" />
              <label
                className="text-xs font-semibold tracking-wide text-slate-700 uppercase"
                htmlFor="xray-upload"
              >
                Upload
              </label>
              <InfoTooltip text="Pakai foto/screenshot X-ray. Agar akurat, pastikan ada objek referensi ukuran nyata (mis. ruler 13 cm atau ukuran implant)." />
            </div>
            <input
              id="xray-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
            />
            {!isLeftSidebarCompact ? (
              <p className="text-xs text-slate-500">
                {imageName
                  ? `Background aktif: ${imageName}. Upload di sini untuk mengganti gambar yang diukur.`
                  : "Upload gambar background utama yang akan diukur."}
              </p>
            ) : null}
            <GoogleSheetDrivePicker
              onUseImage={useGoogleSheetImageAsLayer}
              onUseMainImage={useSheetImageAsMain}
              compact={isLeftSidebarCompact}
            />
          </div>

          <div
            className={`order-8 grid gap-2 ${
              leftSidebarWidth <= 240 ? "grid-cols-1" : "grid-cols-2"
            }`}
            style={{ order: 8 }}
          >
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={PANEL_SPRING}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon name="compare" className="h-4 w-4 text-slate-600" />
                {!isLeftSidebarCompact ? (
                  <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                    Compare
                  </span>
                ) : null}
                {!isLeftSidebarCompact ? (
                  <InfoTooltip text="Split mode untuk pre-op vs post-op atau kiri vs kanan. Upload gambar compare lalu aktifkan mode compare." />
                ) : null}
              </div>
              <input
                ref={compareUploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleCompareUpload}
                className="hidden"
              />
              <div className="flex items-center justify-between gap-1.5">
                <IconButton
                  icon="upload"
                  label="Upload Compare"
                  onClick={() => compareUploadInputRef.current?.click()}
                  className="h-8 w-8 shrink-0"
                />
                <IconButton
                  icon="compare"
                  label="Toggle Compare Mode"
                  onClick={() => setCompareMode((prev) => !prev)}
                  active={compareMode}
                  disabled={!compareImageSrc}
                  className="h-8 w-8 shrink-0"
                />
                <IconButton
                  icon="trash"
                  label="Hapus Compare"
                  onClick={() => {
                    setCompareImageSrc(null);
                    setCompareImage(null);
                    setCompareImageName("");
                    setCompareMode(false);
                    setNotice("Gambar compare dihapus.");
                  }}
                  tone="rose"
                  disabled={!compareImageSrc}
                  className="h-8 w-8 shrink-0"
                />
              </div>
              {!isLeftSidebarCompact ? (
                <p className="text-[11px] text-slate-500">
                  {compareImageName
                    ? `Compare: ${compareImageName}`
                    : "Belum ada gambar compare."}
                </p>
              ) : null}
            </motion.div>

            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={PANEL_SPRING}
              ref={exportPanelRef}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon name="export" className="h-4 w-4 text-slate-600" />
                {!isLeftSidebarCompact ? (
                  <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                    Export
                  </span>
                ) : null}
                {!isLeftSidebarCompact ? (
                  <InfoTooltip text="PNG: snapshot cepat. PDF: buka report siap print/save PDF dengan tabel measurement." />
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <IconButton
                  icon="export"
                  label="Export PNG"
                  onClick={exportReportPng}
                  disabled={!hasCalibration}
                  className="h-8 w-8 shrink-0"
                />
                <IconButton
                  icon="save"
                  label="Export PDF"
                  onClick={exportReportPdf}
                  disabled={!hasCalibration}
                  className="h-8 w-8 shrink-0"
                />
              </div>
              {!isLeftSidebarCompact ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
                  Total row report: {measurementRows.length}
                </div>
              ) : null}
            </motion.div>
          </div>

          <div className="hidden" style={{ order: 4 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="camera" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                Tool
              </span>
              <InfoTooltip text="Shortcut: L Draw Line, H Move/Pan, C Free Cut, A Angle, O Circle, K HKA, F Fit, Delete, Ctrl/Cmd+Z/Y." />
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              <ToolIconButton
                icon="draw"
                label="Draw Line (L)"
                onClick={() => handleToolChange("draw")}
                active={tool === "draw"}
              />
              <ToolIconButton
                icon="pan"
                label="Move / Pan (H)"
                onClick={() => handleToolChange("pan")}
                active={tool === "pan"}
              />
              <ToolIconButton
                icon="cut"
                label="Free Cut (C)"
                onClick={() => handleToolChange("cut")}
                active={tool === "cut"}
              />
              <ToolIconButton
                icon="angle"
                label="Angle Tool"
                onClick={() => handleToolChange("angle")}
                active={tool === "angle"}
              />
              <ToolIconButton
                icon="circle"
                label="Circle / Diameter Tool"
                onClick={() => handleToolChange("circle")}
                active={tool === "circle"}
              />
              <ToolIconButton
                icon="hka"
                label="Auto HKA Tool (K)"
                onClick={() => handleToolChange("hkaAuto")}
                active={tool === "hkaAuto"}
              />
              <ToolIconButton
                icon="zoomIn"
                label="Zoom In"
                onClick={() => zoomBy(1.15)}
              />
              <ToolIconButton
                icon="zoomOut"
                label="Zoom Out"
                onClick={() => zoomBy(1 / 1.15)}
              />
              <ToolIconButton
                icon="fit"
                label="Fit to Screen"
                onClick={fitImageToViewport}
              />
              <ToolIconButton
                icon="undo"
                label="Undo (Ctrl/Cmd+Z)"
                onClick={undoHistory}
                disabled={historyState.undo < 1}
              />
              <ToolIconButton
                icon="redo"
                label="Redo (Ctrl/Cmd+Y)"
                onClick={redoHistory}
                disabled={historyState.redo < 1}
              />
            </div>
          </div>

          <motion.div
            layout
            transition={PANEL_SPRING}
            className="order-6 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5"
            style={{ order: 6 }}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="target" className="h-4 w-4 text-slate-600" />
              {!isLeftSidebarCompact ? (
                <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Adjust
                </span>
              ) : null}
              <InfoTooltip text="Contrast, level, rotate, flip, dan reset cut layer." />
            </div>
            <label className="text-[11px] text-slate-600">
              C ({contrast}%)
              <input
                type="range"
                min="20"
                max="300"
                step="1"
                value={contrast}
                onChange={(event) => setContrast(Number(event.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <label className="text-[11px] text-slate-600">
              L ({level}%)
              <input
                type="range"
                min="20"
                max="220"
                step="1"
                value={level}
                onChange={(event) => setLevel(Number(event.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <div className={SIDEBAR_ICON_GRID_CLASS}>
              <IconButton
                icon="rotateLeft"
                label="Rotate -90"
                onClick={rotateLeft}
                className="h-8 w-full"
              />
              <IconButton
                icon="rotateRight"
                label="Rotate +90"
                onClick={rotateRight}
                className="h-8 w-full"
              />
              <IconButton
                icon="flipH"
                label="Flip Horizontal"
                onClick={() => setFlipX((prev) => !prev)}
                className="h-8 w-full"
              />
              <IconButton
                icon="flipV"
                label="Flip Vertical"
                onClick={() => setFlipY((prev) => !prev)}
                className="h-8 w-full"
              />
              <IconButton
                icon="resetCrop"
                label="Reset Cut Layers"
                onClick={resetCutArea}
                className="h-8 w-full"
              />
            </div>
          </motion.div>

          <motion.div
            layout
            transition={PANEL_SPRING}
            className="order-7 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5"
            style={{ order: 7 }}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="cut" className="h-4 w-4 text-slate-600" />
              {!isLeftSidebarCompact ? (
                <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Cut Layer
                </span>
              ) : null}
              <InfoTooltip text="Upload template overlay, simpan ke library, dan atur layer aktif." />
            </div>
            <div className="text-[11px] text-slate-600">
              {isLeftSidebarCompact
                ? `Layer: ${cutLayers.length}`
                : `Total layer: ${cutLayers.length}${selectedCutLayer ? ` | Selected: #${selectedCutLayer.id}` : " | Selected: -"}`}
            </div>
            {!isLeftSidebarCompact ? (
              <div className="text-[10px] text-slate-500">
                Background utama diupload dari panel Upload. Bagian ini khusus
                template/layer overlay yang diletakkan di atas background ukur.
              </div>
            ) : null}
            <input
              ref={layerUploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleLayerUpload}
              className="hidden"
            />
            <div className={SIDEBAR_ICON_GRID_CLASS}>
              <IconButton
                icon="upload"
                label="Upload Template Layer"
                onClick={() => layerUploadInputRef.current?.click()}
                className="h-8 w-full"
              />
              <IconButton
                icon="save"
                label="Simpan Layer Terpilih ke Library"
                onClick={() => {
                  void saveSelectedLayerToLibrary();
                }}
                disabled={!selectedCutLayer}
                className="h-8 w-full"
              />
              <IconButton
                icon={snapToLandmarks ? "lock" : "unlock"}
                label={
                  snapToLandmarks ? "Snap Landmark ON" : "Snap Landmark OFF"
                }
                onClick={() => setSnapToLandmarks((prev) => !prev)}
                active={snapToLandmarks}
                tone="amber"
                className="h-8 w-full"
              />
            </div>
            {!isLeftSidebarCompact ? (
              <div className="text-[11px] text-slate-500">
                Snap landmark: {snapToLandmarks ? "ON" : "OFF"} | Template
                library: {templateLibrary.length}
              </div>
            ) : null}
            <LocalImplantLibraryPanel
              items={LOCAL_IMPLANT_LIBRARY}
              selectedType={selectedImplantType}
              selectedItemId={selectedImplantLibraryId}
              onSelectType={setSelectedImplantType}
              onSelectItemId={setSelectedImplantLibraryId}
              onUseSelected={useSelectedImplantLibraryAsLayer}
              compact={isLeftSidebarCompact}
              disabled={!image || !modelWidth || !modelHeight}
            />
            <TemplateStoragePicker
              templates={templateLibrary}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={setSelectedTemplateId}
              onUseTemplate={useTemplateItemAsLayer}
              onUseSelectedTemplate={useSelectedTemplateAsLayer}
              onRemoveTemplate={removeTemplateFromLibrary}
              onRefreshTemplates={() => {
                void syncTemplateLibraryFromAppwrite();
              }}
              refreshDisabled={
                isTemplateSyncing ||
                (!hasTemplateCollectionConfig && !hasTemplateStorageConfig)
              }
              syncing={isTemplateSyncing}
              sourceLabel={
                hasTemplateCollectionConfig || hasTemplateStorageConfig
                  ? `Appwrite${hasTemplateCollectionConfig ? " DB" : ""}${hasTemplateCollectionConfig && hasTemplateStorageConfig ? " + " : ""}${hasTemplateStorageConfig ? ` Storage${appwriteConfig.templateBucketName ? ` (${appwriteConfig.templateBucketName})` : ""}` : ""} + Lokal`
                  : "Lokal"
              }
              compact={isLeftSidebarCompact}
            />
            <div className="flex flex-col gap-1.5">
              {cutLayers.length === 0 ? (
                <span className="text-[11px] text-slate-500">
                  Belum ada cut layer.
                </span>
              ) : (
                cutLayers.map((layer, layerIndex) => {
                  const isActive = selectedCutLayerId === layer.id;
                  const layerPalette = getLayerPalette(layer.id);
                  const layerOpacity = Math.round((layer.opacity ?? 1) * 100);
                  const normalizedRotation =
                    ((layer.rotation % 360) + 360) % 360;
                  const layerRotation = Math.round(
                    normalizedRotation > 180
                      ? normalizedRotation - 360
                      : normalizedRotation,
                  );
                  const layerWidth = Math.max(
                    16,
                    Math.round(
                      Number(layer.displayWidth || layer.sourceWidth || 16),
                    ),
                  );
                  const layerHeight = Math.max(
                    16,
                    Math.round(
                      Number(layer.displayHeight || layer.sourceHeight || 16),
                    ),
                  );
                  const layerCenterX = Math.round(Number(layer.centerX || 0));
                  const layerCenterY = Math.round(Number(layer.centerY || 0));
                  const widthMax = Math.max(
                    200,
                    Math.round(modelWidth * 2) || 200,
                  );
                  const heightMax = Math.max(
                    200,
                    Math.round(modelHeight * 2) || 200,
                  );
                  const centerXMax = Math.max(1, Math.round(modelWidth || 1));
                  const centerYMax = Math.max(1, Math.round(modelHeight || 1));
                  const layerWidthMm =
                    mmPerPixel !== null ? layerWidth * mmPerPixel : null;
                  const layerHeightMm =
                    mmPerPixel !== null ? layerHeight * mmPerPixel : null;
                  const formatLayerRealSize = (valueMm) => {
                    if (valueMm === null) return "-";
                    if (templateRealSizeUnit === "cm")
                      return `${(valueMm / 10).toFixed(2)} cm`;
                    return `${valueMm.toFixed(1)} mm`;
                  };
                  const canApplyTemplateRealSize =
                    isImageBackedLayerKind(layer.kind) &&
                    mmPerPixel !== null &&
                    !layer.lockScale;
                  const canTrimTemplateLayer =
                    isImageBackedLayerKind(layer.kind) &&
                    Boolean(layer.image) &&
                    !layer.lockScale;
                  const canApplyTemplateRulerScale =
                    isImageBackedLayerKind(layer.kind) &&
                    Boolean(layer.image) &&
                    mmPerPixel !== null &&
                    !layer.lockScale;
                  const canPasteTemplateScale =
                    isImageBackedLayerKind(layer.kind) &&
                    Boolean(copiedTemplateScale) &&
                    !layer.lockScale;

                  return (
                    <motion.div
                      layout
                      key={layer.id}
                      className={`rounded-md border p-1.5 transition-all duration-300 ${
                        isActive ? "scale-[1.01] shadow-sm" : "bg-white"
                      }`}
                      style={{
                        borderColor: isActive
                          ? layerPalette.border
                          : `${layerPalette.border}66`,
                        backgroundColor: isActive ? layerPalette.bg : "#ffffff",
                        boxShadow: isActive
                          ? `0 0 0 2px ${layerPalette.border}22`
                          : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => focusLayerSettings(layer.id)}
                        className="flex w-full items-center gap-1.5 text-left text-[11px]"
                        style={{ color: layerPalette.text }}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: layerPalette.border }}
                        />
                        <span className="min-w-0 truncate">
                          Layer #{layer.id}
                          {layer.name ? ` • ${layer.name}` : ""}
                          {` • ${layerIndex + 1}/${cutLayers.length}`}
                        </span>
                      </button>

                      {isActive ? (
                        <div className="mt-1 rounded border border-slate-200 bg-white/80 px-2 py-1 text-[10px] text-slate-600">
                          Setting layer aktif berada di tab TOOL sebelah kanan.
                        </div>
                      ) : null}

                      {false && isActive ? (
                        <div className="mt-1.5 flex flex-col gap-1.5">
                          <div className="rounded border border-slate-200 bg-white/80 px-2 py-1 text-[10px] text-slate-600">
                            Drag isi layer untuk pindah, drag titik sudut untuk
                            resize.
                          </div>

                          <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
                            Stack: layer bawah digambar lebih dulu, layer atas
                            menutup layer di bawahnya. Background utama selalu
                            berada paling bawah.
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? {
                                          ...item,
                                          centerX: modelWidth / 2,
                                          centerY: modelHeight / 2,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700"
                            >
                              Center
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) => {
                                    if (item.id !== layer.id) return item;
                                    const srcW = Math.max(
                                      1,
                                      Number(
                                        item.sourceWidth ||
                                          item.displayWidth ||
                                          1,
                                      ),
                                    );
                                    const srcH = Math.max(
                                      1,
                                      Number(
                                        item.sourceHeight ||
                                          item.displayHeight ||
                                          1,
                                      ),
                                    );
                                    const scale = Math.max(
                                      0.02,
                                      Math.min(
                                        modelWidth / srcW,
                                        modelHeight / srcH,
                                      ),
                                    );
                                    return {
                                      ...item,
                                      displayWidth: clamp(
                                        srcW * scale,
                                        16,
                                        modelWidth * 2,
                                      ),
                                      displayHeight: clamp(
                                        srcH * scale,
                                        16,
                                        modelHeight * 2,
                                      ),
                                      centerX: modelWidth / 2,
                                      centerY: modelHeight / 2,
                                    };
                                  }),
                                )
                              }
                              disabled={
                                !modelWidth || !modelHeight || layer.lockScale
                              }
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              Fit Rasio
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? {
                                          ...item,
                                          displayWidth: clamp(
                                            modelWidth,
                                            16,
                                            modelWidth * 2,
                                          ),
                                          displayHeight: clamp(
                                            modelHeight,
                                            16,
                                            modelHeight * 2,
                                          ),
                                          centerX: modelWidth / 2,
                                          centerY: modelHeight / 2,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              disabled={
                                !modelWidth || !modelHeight || layer.lockScale
                              }
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              Samakan Bawah
                            </button>
                          </div>

                          {isImageBackedLayerKind(layer.kind) ? (
                            <div className="rounded border border-cyan-200 bg-cyan-50/60 px-2 py-1.5">
                              <div className="flex items-center justify-between gap-2 text-[10px] text-cyan-900">
                                <span>
                                  Real: W {formatLayerRealSize(layerWidthMm)} |
                                  H {formatLayerRealSize(layerHeightMm)}
                                </span>
                                {mmPerPixel === null ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHighlightCalibrationPanel(true);
                                      setNotice(
                                        "Buat garis kalibrasi real dulu, lalu isi ukuran template.",
                                      );
                                    }}
                                    className="shrink-0 rounded border border-cyan-300 bg-white px-1.5 py-0.5 text-[10px] text-cyan-800"
                                  >
                                    Kalibrasi
                                  </button>
                                ) : null}
                              </div>
                              <div className="mt-1.5 grid grid-cols-[1fr_auto_auto] gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={templateRealSizeInput}
                                  onChange={(event) =>
                                    setTemplateRealSizeInput(event.target.value)
                                  }
                                  placeholder="Ukuran real"
                                  className="min-w-0 rounded border border-cyan-200 bg-white px-2 py-1 text-[10px] text-slate-800 outline-none focus:border-cyan-500"
                                />
                                <select
                                  value={templateRealSizeAxis}
                                  onChange={(event) =>
                                    setTemplateRealSizeAxis(event.target.value)
                                  }
                                  className="rounded border border-cyan-200 bg-white px-1 py-1 text-[10px] text-slate-700 outline-none focus:border-cyan-500"
                                >
                                  <option value="height">Tinggi</option>
                                  <option value="width">Lebar</option>
                                </select>
                                <select
                                  value={templateRealSizeUnit}
                                  onChange={(event) =>
                                    setTemplateRealSizeUnit(event.target.value)
                                  }
                                  className="rounded border border-cyan-200 bg-white px-1 py-1 text-[10px] text-slate-700 outline-none focus:border-cyan-500"
                                >
                                  <option value="mm">mm</option>
                                  <option value="cm">cm</option>
                                </select>
                              </div>
                              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  onClick={trimSelectedTemplateLayer}
                                  disabled={!canTrimTemplateLayer}
                                  className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  Trim Margin
                                </button>
                                <button
                                  type="button"
                                  onClick={applyTemplateRulerScale}
                                  disabled={!canApplyTemplateRulerScale}
                                  className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  Scale Ruler
                                </button>
                                <button
                                  type="button"
                                  onClick={applyTemplateRealSize}
                                  disabled={!canApplyTemplateRealSize}
                                  className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  Scale Real
                                </button>
                              </div>
                              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={copySelectedTemplateScale}
                                  className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900"
                                >
                                  Copy Scale
                                </button>
                                <button
                                  type="button"
                                  onClick={pasteTemplateScaleToSelected}
                                  disabled={!canPasteTemplateScale}
                                  className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  Paste Scale
                                </button>
                              </div>
                              {copiedTemplateScale ? (
                                <div className="mt-1 text-[10px] text-cyan-800">
                                  Copied:{" "}
                                  {Math.round(copiedTemplateScale.width)} x{" "}
                                  {Math.round(copiedTemplateScale.height)} px
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <label className="text-[11px] text-slate-600">
                            Width ({layerWidth}px)
                            <input
                              type="range"
                              min="16"
                              max={widthMax}
                              step="1"
                              value={layerWidth}
                              onChange={(event) => {
                                const nextWidth = clamp(
                                  Number(event.target.value),
                                  16,
                                  widthMax,
                                );
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, displayWidth: nextWidth }
                                      : item,
                                  ),
                                );
                              }}
                              disabled={layer.lockScale}
                              className="mt-1 w-full disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </label>

                          <label className="text-[11px] text-slate-600">
                            Height ({layerHeight}px)
                            <input
                              type="range"
                              min="16"
                              max={heightMax}
                              step="1"
                              value={layerHeight}
                              onChange={(event) => {
                                const nextHeight = clamp(
                                  Number(event.target.value),
                                  16,
                                  heightMax,
                                );
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, displayHeight: nextHeight }
                                      : item,
                                  ),
                                );
                              }}
                              disabled={layer.lockScale}
                              className="mt-1 w-full disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </label>

                          <label className="text-[11px] text-slate-600">
                            X ({layerCenterX}px)
                            <input
                              type="range"
                              min="0"
                              max={centerXMax}
                              step="1"
                              value={clamp(layerCenterX, 0, centerXMax)}
                              onChange={(event) => {
                                const nextCenterX = clamp(
                                  Number(event.target.value),
                                  0,
                                  centerXMax,
                                );
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, centerX: nextCenterX }
                                      : item,
                                  ),
                                );
                              }}
                              className="mt-1 w-full"
                            />
                          </label>

                          <label className="text-[11px] text-slate-600">
                            Y ({layerCenterY}px)
                            <input
                              type="range"
                              min="0"
                              max={centerYMax}
                              step="1"
                              value={clamp(layerCenterY, 0, centerYMax)}
                              onChange={(event) => {
                                const nextCenterY = clamp(
                                  Number(event.target.value),
                                  0,
                                  centerYMax,
                                );
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, centerY: nextCenterY }
                                      : item,
                                  ),
                                );
                              }}
                              className="mt-1 w-full"
                            />
                          </label>

                          <label className="text-[11px] text-slate-600">
                            Opacity ({layerOpacity}%)
                            <input
                              type="range"
                              min="10"
                              max="100"
                              step="1"
                              value={layerOpacity}
                              onChange={(event) => {
                                const nextOpacity = clamp(
                                  Number(event.target.value) / 100,
                                  0.05,
                                  1,
                                );
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, opacity: nextOpacity }
                                      : item,
                                  ),
                                );
                              }}
                              className="mt-1 w-full"
                            />
                          </label>

                          <label className="text-[11px] text-slate-600">
                            Rotate ({layerRotation}°)
                            <input
                              type="range"
                              min="-180"
                              max="180"
                              step="1"
                              value={layerRotation}
                              onChange={(event) => {
                                const nextDeg = Number(event.target.value);
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? {
                                          ...item,
                                          rotation: (nextDeg + 360) % 360,
                                        }
                                      : item,
                                  ),
                                );
                              }}
                              className="mt-1 w-full"
                            />
                          </label>

                          <div className="grid grid-cols-6 gap-1.5">
                            <IconButton
                              icon="rotateLeft"
                              label="Rotate Layer -5"
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? {
                                          ...item,
                                          rotation:
                                            ((item.rotation || 0) - 5 + 360) %
                                            360,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="h-8 w-8"
                            />
                            <IconButton
                              icon="rotateRight"
                              label="Rotate Layer +5"
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? {
                                          ...item,
                                          rotation:
                                            ((item.rotation || 0) + 5 + 360) %
                                            360,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="h-8 w-8"
                            />
                            <IconButton
                              icon="flipH"
                              label="Flip Layer H"
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, flipX: !item.flipX }
                                      : item,
                                  ),
                                )
                              }
                              className="h-8 w-8"
                            />
                            <IconButton
                              icon="flipV"
                              label="Flip Layer V"
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, flipY: !item.flipY }
                                      : item,
                                  ),
                                )
                              }
                              className="h-8 w-8"
                            />
                            <IconButton
                              icon="trash"
                              label="Hapus Layer"
                              onClick={() => {
                                setCutLayers((prev) =>
                                  prev.filter((item) => item.id !== layer.id),
                                );
                                if (selectedCutLayerId === layer.id) {
                                  setSelectedCutLayerId(null);
                                }
                              }}
                              tone="rose"
                              className="h-8 w-8"
                            />
                            <IconButton
                              icon={layer.lockScale ? "lock" : "unlock"}
                              label={
                                layer.lockScale ? "Unlock Scale" : "Lock Scale"
                              }
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, lockScale: !item.lockScale }
                                      : item,
                                  ),
                                )
                              }
                              tone="amber"
                              className="h-8 w-8"
                            />
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

          <motion.div
            layout
            transition={PANEL_SPRING}
            ref={calibrationPanelRef}
            className={`order-3 flex flex-col gap-2 rounded-lg border p-2.5 transition-shadow ${
              highlightCalibrationPanel
                ? "border-cyan-400 bg-cyan-50/40 shadow-[0_0_0_2px_rgba(34,211,238,0.35)]"
                : "border-slate-200"
            }`}
            style={{ order: 3 }}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="target" className="h-4 w-4 text-slate-600" />
              {!isLeftSidebarCompact ? (
                <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Kalibrasi
                </span>
              ) : null}
              <InfoTooltip text="Garis real atau mm/px berdasarkan zoom source." />
            </div>
            {!isLeftSidebarCompact ? (
              <div className="text-[11px] text-slate-600">
                {calibrationMode === "line"
                  ? hasCalibration
                    ? `Selected: ${formatMeasurementFromPx(selectedLengthPx)}`
                    : "Selected: belum dikalibrasi"
                  : "Mode zoom % aktif (tanpa garis referensi)."}
              </div>
            ) : null}
            <div
              className={`grid gap-1.5 ${isLeftSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
            >
              <button
                type="button"
                onClick={() => setCalibrationMode("line")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  calibrationMode === "line"
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
                title="Kalibrasi pakai garis referensi real"
              >
                Garis Real
              </button>
              <button
                type="button"
                onClick={() => setCalibrationMode("zoom")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  calibrationMode === "zoom"
                    ? "border-cyan-700 bg-cyan-700 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
                title="Kalibrasi pakai mm/px pada zoom source"
              >
                Zoom %
              </button>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1">
              {!isLeftSidebarCompact ? (
                <div className="mb-1 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                  Zoom Source
                </div>
              ) : null}
              <div
                className={`grid gap-1.5 ${
                  isLeftSidebarNarrow
                    ? "grid-cols-2"
                    : "grid-cols-[84px_auto_auto_auto]"
                }`}
              >
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={sourceZoomPercent}
                  onChange={(event) => setSourceZoomPercent(event.target.value)}
                  className={`${isLeftSidebarNarrow ? "col-span-1 w-full" : "w-[84px]"} rounded-md border border-slate-300 bg-white px-2 py-1 text-xs`}
                  title="Zoom source"
                />
                <span
                  className={`inline-flex items-center text-xs text-slate-600 ${
                    isLeftSidebarNarrow ? "justify-center" : ""
                  }`}
                >
                  %
                </span>
                <button
                  type="button"
                  onClick={() => setSourceZoomPercent("100")}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                  title="Set zoom source 100%"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setSourceZoomPercent("90")}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                  title="Set zoom source 90%"
                >
                  90%
                </button>
              </div>
            </div>
            {calibrationMode === "line" ? (
              <div
                className={`grid gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 ${
                  isLeftSidebarNarrow
                    ? "grid-cols-2"
                    : "grid-cols-[auto_92px_62px]"
                }`}
              >
                <span
                  className={`text-[10px] font-medium tracking-wide text-slate-500 uppercase ${
                    isLeftSidebarNarrow
                      ? "col-span-2"
                      : "inline-flex items-center"
                  }`}
                >
                  Nilai
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualMmInput}
                  onChange={(event) => setActualMmInput(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                />
                <select
                  value={actualUnit}
                  onChange={(event) => setActualUnit(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs"
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            ) : (
              <div
                className={`rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-1 ${
                  isLeftSidebarNarrow
                    ? "flex flex-col gap-1.5"
                    : "flex items-center gap-1.5"
                }`}
              >
                <span className="text-[10px] font-medium tracking-wide text-cyan-700 uppercase">
                  mm/px @100%
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={mmPerPixelAt100Input}
                  onChange={(event) =>
                    setMmPerPixelAt100Input(event.target.value)
                  }
                  className={`${isLeftSidebarNarrow ? "w-full" : "w-[120px]"} rounded-md border border-cyan-300 bg-white px-2 py-1 text-xs`}
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1">
              <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                Faktor
              </span>
              <span className="text-xs text-slate-700">
                {mmPerPixel !== null ? `${mmPerPixel.toFixed(6)} mm/px` : "-"}
              </span>
            </div>
            <div
              className={`rounded-md border px-2 py-1.5 text-[11px] ${
                calibrationQuality.status === "good"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : calibrationQuality.status === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <div className="font-medium">{calibrationQuality.title}</div>
              {!isLeftSidebarCompact ? (
                <div>{calibrationQuality.detail}</div>
              ) : null}
            </div>
            <div className={SIDEBAR_ICON_GRID_CLASS}>
              <IconButton
                icon="preset"
                label="Preset 13 cm"
                onClick={() => {
                  setActualMmInput("13");
                  setActualUnit("cm");
                }}
                disabled={calibrationMode !== "line"}
                className="h-8 w-full"
              />
              <IconButton
                icon="saveCal"
                label="Simpan Kalibrasi"
                onClick={applyCalibration}
                disabled={calibrationMode === "line" ? !selectedLine : false}
                tone="emerald"
                className="h-8 w-full"
              />
            </div>
            {!isLeftSidebarCompact ? (
              <div className="text-[11px] text-slate-600">
                {hasCalibration ? `Aktif (${measurementUnit})` : "Belum aktif"}
              </div>
            ) : null}
          </motion.div>

          <motion.div
            layout
            transition={PANEL_SPRING}
            className="order-1 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5"
            style={{ order: 1 }}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="history" className="h-4 w-4 text-slate-600" />
              {!isLeftSidebarCompact ? (
                <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Workflow
                </span>
              ) : null}
              <InfoTooltip text="Urutan: Upload, kalibrasi, ukur, lalu export." />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                {
                  id: 1,
                  label: "Upload",
                  shortLabel: "Up",
                  done: Boolean(image),
                  onClick: () => {
                    setMobileControlsOpen(true);
                    document.getElementById("xray-upload")?.click();
                  },
                },
                {
                  id: 2,
                  label: "Calib",
                  shortLabel: "Cal",
                  done: hasCalibration,
                  onClick: () => focusCalibrationStep(),
                },
                {
                  id: 3,
                  label: "Measure",
                  shortLabel: "Mea",
                  done: measurementEntityCount > 0,
                  onClick: () => {
                    if (!hasCalibration) {
                      focusCalibrationStep(
                        "Selesaikan kalibrasi dulu sebelum measurement.",
                      );
                      return;
                    }
                    focusMeasureStep();
                  },
                },
                {
                  id: 4,
                  label: "Export",
                  shortLabel: "Exp",
                  done: hasCalibration && measurementEntityCount > 0,
                  onClick: () => focusExportStep(),
                },
              ].map((step) => {
                const isActive = workflowStep === step.id;
                const toneClass = isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : step.done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 bg-white text-slate-600";
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={step.onClick}
                    className={`rounded-md border px-1 py-1 text-[10px] font-semibold ${toneClass}`}
                    title={`${step.id}. ${step.label}`}
                  >
                    {isLeftSidebarCompact
                      ? step.id
                      : isLeftSidebarNarrow
                        ? `${step.id}. ${step.shortLabel}`
                        : `${step.id}. ${step.label}`}
                  </button>
                );
              })}
            </div>
            {!isLeftSidebarCompact ? (
              <div className="text-[11px] text-slate-600">
                {isLeftSidebarNarrow
                  ? `Step ${workflowStep}/4 | M: ${measurementEntityCount}`
                  : `Step aktif: ${workflowStep}/4 | Measurement: ${measurementEntityCount}`}
              </div>
            ) : null}
          </motion.div>

          <div className="hidden" style={{ order: 5 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="camera" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                Measure
              </span>
              <InfoTooltip text="Preset line: Normal, Offset, Femoral Offset, Global Offset, LLD. HKA gunakan Auto HKA. Circle lebih mudah: drag area dalam untuk pindah, drag tepi untuk resize, atau pakai slider diameter." />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>
                Total:{" "}
                {lines.length + angles.length + circles.length + hkaSets.length}
              </span>
              <span>
                Selected:{" "}
                {selectedLine
                  ? `Line #${selectedLine.id}`
                  : selectedAngle
                    ? `Angle #${selectedAngle.id}`
                    : selectedCircle
                      ? `Circle #${selectedCircle.id}`
                      : selectedHka
                        ? `HKA #${selectedHka.id}`
                        : "-"}{" "}
                {isSelectedLineLocked ? "(lock)" : ""}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleLinePresetChange("normal")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  linePreset === "normal"
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Line
              </button>
              <button
                type="button"
                onClick={() => handleToolChange("hkaAuto")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  tool === "hkaAuto"
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Auto HKA
              </button>
              <button
                type="button"
                onClick={() => handleLinePresetChange("offset")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  linePreset === "offset"
                    ? "border-rose-600 bg-rose-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Offset
              </button>
              <button
                type="button"
                onClick={() => handleLinePresetChange("femoralOffset")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  linePreset === "femoralOffset"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                F-Offset
              </button>
              <button
                type="button"
                onClick={() => handleLinePresetChange("globalOffset")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  linePreset === "globalOffset"
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                G-Offset
              </button>
              <button
                type="button"
                onClick={() => handleLinePresetChange("lld")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  linePreset === "lld"
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                LLD
              </button>
            </div>
            <div className="grid grid-cols-[1fr_64px] gap-1.5">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                Unit hasil
              </div>
              <select
                value={measurementUnit}
                onChange={(event) => setMeasurementUnit(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700"
              >
                <option value="cm">cm</option>
                <option value="mm">mm</option>
              </select>
            </div>
            {selectedCircle ? (
              <div className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] text-slate-700">
                <div className="mb-1 font-medium text-violet-800">
                  Adjust Circle Diameter
                </div>
                <div className="mb-1">
                  Diameter:{" "}
                  {mmPerPixel !== null
                    ? `${
                        measurementUnit === "cm"
                          ? (
                              (selectedCircle.radius * 2 * mmPerPixel) /
                              10
                            ).toFixed(2)
                          : (selectedCircle.radius * 2 * mmPerPixel).toFixed(2)
                      } ${measurementUnit}`
                    : `${(selectedCircle.radius * 2).toFixed(2)} px`}
                </div>
                <input
                  type="range"
                  min="6"
                  max={Math.max(10, Math.max(modelWidth, modelHeight) * 1.5)}
                  step="0.5"
                  value={selectedCircle.radius * 2}
                  onChange={(event) => {
                    const nextDiameter = Number(event.target.value);
                    setCircles((prev) =>
                      prev.map((item) =>
                        item.id === selectedCircle.id
                          ? { ...item, radius: Math.max(3, nextDiameter / 2) }
                          : item,
                      ),
                    );
                  }}
                  className="w-full"
                />
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCircles((prev) =>
                        prev.map((item) =>
                          item.id === selectedCircle.id
                            ? { ...item, radius: Math.max(3, item.radius - 1) }
                            : item,
                        ),
                      )
                    }
                    className="rounded border border-violet-300 bg-white px-2 py-1 text-xs text-violet-800"
                  >
                    - kecilkan
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCircles((prev) =>
                        prev.map((item) =>
                          item.id === selectedCircle.id
                            ? {
                                ...item,
                                radius: Math.min(
                                  Math.max(modelWidth, modelHeight) * 1.5,
                                  item.radius + 1,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    className="rounded border border-violet-300 bg-white px-2 py-1 text-xs text-violet-800"
                  >
                    + besarkan
                  </button>
                </div>
              </div>
            ) : null}
            <div className={SIDEBAR_ICON_GRID_CLASS}>
              <IconButton
                icon={isSelectedLineLocked ? "unlock" : "lock"}
                label={
                  isSelectedLineLocked ? "Unlock Selected" : "Lock Selected"
                }
                onClick={toggleSelectedLineLock}
                disabled={!selectedLine}
                tone="amber"
                className="h-8 w-full"
              />
              <IconButton
                icon="trash"
                label="Hapus Measurement Terpilih"
                onClick={removeSelectedLine}
                disabled={
                  !selectedLine &&
                  !selectedAngle &&
                  !selectedCircle &&
                  !selectedHka
                }
                tone="rose"
                className="h-8 w-full"
              />
              <IconButton
                icon="clear"
                label="Clear Measurement"
                onClick={clearMeasurementLines}
                tone="rose"
                className="h-8 w-full"
              />
              <IconButton
                icon="reset"
                label="Reset Kalibrasi"
                onClick={resetCalibration}
                disabled={!hasCalibration}
                tone="amber"
                className="h-8 w-full"
              />
              <IconButton
                icon="reset"
                label="Reset Semua"
                onClick={() => resetWorkspaceState()}
                className="h-8 w-full"
              />
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
              <div>Leg package</div>
              <div>Femoral Offset: {legPackageSummary.femoralMean}</div>
              <div>Global Offset: {legPackageSummary.globalMean}</div>
              <div>LLD: {legPackageSummary.lldDelta}</div>
            </div>
          </div>

          <div className="hidden" style={{ order: 10 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="package" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                Planning
              </span>
              <InfoTooltip text="Simpan snapshot rencana seperti aplikasi templating: measurement, fragment, implant/template, dan catatan tiap tahap." />
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] text-slate-600">
              <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                Measure: {measurementRows.length}
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                Layer: {cutLayers.length}
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                Step: {planSteps.length}
              </div>
            </div>
            <textarea
              value={planNote}
              onChange={(event) => setPlanNote(event.target.value)}
              rows={3}
              placeholder="Catatan step: reduction, implant size, posisi plate/screw, atau review final."
              className="min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={addPlanningStep}
                disabled={!image}
                className="rounded-md border border-slate-900 bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                Tambah Step
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlanSteps([]);
                  setNotice("Semua planning step dihapus.");
                }}
                disabled={planSteps.length === 0}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Clear Step
              </button>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
              <div className="mb-1 font-medium text-slate-700">
                Inventory Template / Fragment
              </div>
              {templateInventoryRows.length === 0 ? (
                <div>Belum ada template atau fragment.</div>
              ) : (
                <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                  {templateInventoryRows.map((row) => (
                    <div
                      key={`${row.kind}-${row.id}`}
                      className="flex justify-between gap-2"
                    >
                      <span className="min-w-0 truncate">
                        {row.kind}: {row.name}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {row.size}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-600">
              {planSteps.length === 0 ? (
                <p>Belum ada planning step.</p>
              ) : (
                planSteps
                  .slice()
                  .reverse()
                  .map((step) => (
                    <div
                      key={step.id}
                      className="border-b border-slate-100 py-1 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">
                          {step.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePlanningStep(step.id)}
                          className="text-rose-600"
                        >
                          Hapus
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {step.at} | {step.calibration}
                      </div>
                      <p className="mt-0.5">{step.note}</p>
                    </div>
                  ))
              )}
            </div>
          </div>

          <motion.p
            layout
            transition={PANEL_SPRING}
            className="order-11 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
            style={{ order: 11 }}
          >
            {notice}
          </motion.p>

          <motion.div
            layout
            transition={PANEL_SPRING}
            className="order-12 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5"
            style={{ order: 12 }}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="cloudOff" className="h-4 w-4 text-slate-600" />
              {!isLeftSidebarCompact ? (
                <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Story
                </span>
              ) : null}
              <InfoTooltip text="Auto-save lokal untuk activity dan state workspace." />
            </div>
            <div className="flex gap-1.5">
              <IconButton
                icon="save"
                label="Simpan Story Sekarang"
                onClick={saveStoryNow}
              />
              <IconButton
                icon="trash"
                label="Hapus Story Lokal"
                onClick={clearSavedStory}
                tone="rose"
              />
            </div>
            <div className="max-h-24 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
              {activityLog.length === 0 ? (
                <p>Belum ada activity.</p>
              ) : (
                activityLog
                  .slice(-8)
                  .reverse()
                  .map((item) => (
                    <p key={item.id}>
                      [{item.at}] {item.text}
                    </p>
                  ))
              )}
            </div>
          </motion.div>
        </motion.aside>

        <motion.aside
          layout
          initial={false}
          transition={PANEL_SPRING}
          className={`order-3 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 ${
            mobileWorkspacePanelVisible
              ? "fixed inset-x-0 bottom-0 z-40 flex max-h-[72vh] overflow-y-auto overscroll-contain rounded-t-[28px] border-b-0 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl"
              : "hidden"
          } ${showRightSidebar ? "lg:flex lg:max-h-[calc(100vh-132px)] lg:overflow-y-auto lg:rounded-xl lg:shadow-none" : "lg:hidden"}`}
        >
          <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-2 grid grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200 bg-white/96 px-3 py-2 backdrop-blur lg:hidden">
            <span />
            <span className="h-1.5 w-12 justify-self-center rounded-full bg-slate-300" />
            <button
              type="button"
              onClick={() => setMobileControlsOpen(false)}
              className="inline-flex h-8 w-8 justify-self-end rounded-full border border-slate-200 bg-slate-50 text-slate-600"
              aria-label="Tutup workspace panel"
              title="Tutup workspace panel"
            >
              <Icon name="close" className="m-auto h-4 w-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setMobilePanelMode("setup");
                setMobileControlsOpen(true);
              }}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${
                mobilePanelMode === "setup"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              Setup
            </button>
            <button
              type="button"
              onClick={() => {
                setMobilePanelMode("workspace");
                setMobileControlsOpen(true);
              }}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${
                mobilePanelMode === "workspace"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              Panel
            </button>
          </div>
          <div
            className={`${SIDEBAR_TAB_GRID_CLASS} rounded-lg border border-slate-200 bg-slate-50 p-1`}
          >
            {[
              {
                id: "tool",
                label: "TOOL",
                shortLabel: "T",
                activeClass: "border-cyan-700 bg-cyan-700 text-white",
                idleClass: "border-cyan-200 bg-cyan-50 text-cyan-800",
              },
              {
                id: "measure",
                label: "MEASURE",
                shortLabel: "M",
                activeClass: "border-emerald-700 bg-emerald-700 text-white",
                idleClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
              },
              {
                id: "planning",
                label: "Planning",
                shortLabel: "P",
                activeClass: "border-amber-700 bg-amber-700 text-white",
                idleClass: "border-amber-200 bg-amber-50 text-amber-800",
              },
            ].map((tab) => {
              const isActive = activeRightPanel === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveRightPanel(tab.id)}
                  whileHover={BUTTON_HOVER}
                  whileTap={BUTTON_TAP}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className={`rounded-md border px-2 py-2 text-[10px] font-semibold tracking-wide uppercase transition ${
                    isActive ? tab.activeClass : tab.idleClass
                  }`}
                  title={tab.label}
                >
                  {isRightSidebarCompact ? tab.shortLabel : tab.label}
                </motion.button>
              );
            })}
          </div>

          {activeRightPanel === "tool" ? (
            <motion.div
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={PANEL_SPRING}
              className="flex flex-col gap-2 rounded-lg border border-cyan-200 bg-cyan-50/40 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon name="camera" className="h-4 w-4 text-cyan-700" />
                {!isRightSidebarCompact ? (
                  <span className="text-xs font-semibold tracking-wide text-cyan-900 uppercase">
                    Tool
                  </span>
                ) : null}
                <InfoTooltip text="Shortcut: L, H, C Free Cut, A, O, K, F, Delete, Ctrl/Cmd+Z/Y." />
              </div>
              <div className={SIDEBAR_ICON_GRID_CLASS}>
                <ToolIconButton
                  icon="draw"
                  label="Draw Line (L)"
                  onClick={() => handleToolChange("draw")}
                  active={tool === "draw"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="pan"
                  label="Move / Pan (H)"
                  onClick={() => handleToolChange("pan")}
                  active={tool === "pan"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="cut"
                  label="Free Cut (C)"
                  onClick={() => handleToolChange("cut")}
                  active={tool === "cut"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="angle"
                  label="Angle Tool"
                  onClick={() => handleToolChange("angle")}
                  active={tool === "angle"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="circle"
                  label="Circle / Diameter Tool"
                  onClick={() => handleToolChange("circle")}
                  active={tool === "circle"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="hka"
                  label="Auto HKA Tool (K)"
                  onClick={() => handleToolChange("hkaAuto")}
                  active={tool === "hkaAuto"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="undo"
                  label="Undo (Ctrl/Cmd+Z)"
                  onClick={undoHistory}
                  disabled={historyState.undo < 1}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="redo"
                  label="Redo (Ctrl/Cmd+Y)"
                  onClick={redoHistory}
                  disabled={historyState.redo < 1}
                  className="h-9 w-full"
                />
              </div>
              <div className="rounded-md border border-cyan-200 bg-white px-2 py-1.5">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                  <span>Canvas</span>
                  <span
                    className={`tracking-normal text-cyan-700 normal-case ${isRightSidebarCompact ? "hidden" : ""}`}
                  >
                    {image ? "Background aktif" : "Kosong"}
                  </span>
                </div>
                <div className={SIDEBAR_TEXT_BUTTON_GRID_CLASS}>
                  <button
                    type="button"
                    onClick={() => resetWorkspaceState()}
                    className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900"
                    title="Reset measurement, compare, layer, dan planning"
                  >
                    {isRightSidebarCompact ? "Reset" : "Reset Workspace"}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetWorkspaceState({ clearImage: true })}
                    className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-700"
                    title="Reset total termasuk background"
                  >
                    {isRightSidebarCompact ? "Total" : "Reset Canvas Total"}
                  </button>
                </div>
                {!isRightSidebarCompact ? (
                  <div className="mt-1 text-[10px] text-slate-500">
                    Reset total menghapus background, measurement, compare, dan
                    semua layer overlay.
                  </div>
                ) : null}
              </div>
              <div className="rounded-md border border-cyan-200 bg-white px-2 py-1.5">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                  <span>Layer Move</span>
                  <span className="tracking-normal text-cyan-700 normal-case">
                    {selectedCutLayer
                      ? `#${selectedCutLayer.id} (${selectedCutLayerIndex + 1}/${cutLayers.length})`
                      : "-"}
                  </span>
                </div>
                <div className={`${SIDEBAR_ICON_GRID_CLASS} mb-1.5`}>
                  <IconButton
                    icon="moveLeft"
                    label="Turunkan Layer"
                    onClick={() =>
                      selectedCutLayer &&
                      moveCutLayerInStack(selectedCutLayer.id, "down")
                    }
                    disabled={!selectedCutLayer || selectedCutLayerIndex <= 0}
                    className="h-8 w-full"
                  />
                  <IconButton
                    icon="moveRight"
                    label="Naikkan Layer"
                    onClick={() =>
                      selectedCutLayer &&
                      moveCutLayerInStack(selectedCutLayer.id, "up")
                    }
                    disabled={
                      !selectedCutLayer ||
                      selectedCutLayerIndex >= cutLayers.length - 1
                    }
                    className="h-8 w-full"
                  />
                </div>
                <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
                  {cutLayers.length === 0 ? (
                    <span className="text-[10px] text-slate-500">
                      Belum ada layer.
                    </span>
                  ) : (
                    cutLayers
                      .slice()
                      .reverse()
                      .map((layer) => {
                        const layerPalette = getLayerPalette(layer.id);
                        const isLayerActive = layer.id === selectedCutLayerId;
                        return (
                          <motion.button
                            layout
                            key={`tool-layer-${layer.id}`}
                            type="button"
                            onClick={() => focusLayerSettings(layer.id)}
                            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-left text-[10px] transition-all duration-300 ${
                              isLayerActive ? "scale-[1.01] shadow-sm" : ""
                            }`}
                            style={{
                              borderColor: isLayerActive
                                ? layerPalette.border
                                : `${layerPalette.border}66`,
                              backgroundColor: isLayerActive
                                ? layerPalette.bg
                                : "#ffffff",
                              color: layerPalette.text,
                            }}
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: layerPalette.border }}
                            />
                            <span className="min-w-0 truncate">
                              #{layer.id}{" "}
                              {isRightSidebarCompact
                                ? null
                                : layer.name ||
                                  (layer.kind === "upload"
                                    ? "Template"
                                    : "Fragment")}
                            </span>
                          </motion.button>
                        );
                      })
                  )}
                </div>
              </div>
              <div
                ref={layerSettingsPanelRef}
                className="rounded-md border bg-white px-2 py-1.5 transition-all duration-300"
                style={
                  selectedLayerPalette
                    ? {
                        borderColor: `${selectedLayerPalette.border}88`,
                        boxShadow: selectedCutLayer
                          ? `0 0 0 2px ${selectedLayerPalette.border}18`
                          : undefined,
                      }
                    : undefined
                }
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                  <span>Layer Settings</span>
                  <span
                    className="tracking-normal normal-case"
                    style={{ color: selectedLayerPalette?.text || "#0e7490" }}
                  >
                    {selectedCutLayer ? `#${selectedCutLayer.id}` : "-"}
                  </span>
                </div>

                {!selectedCutLayer || !selectedLayerMetrics ? (
                  <span className="text-[10px] text-slate-500">
                    Pilih layer untuk membuka setting.
                  </span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div
                      className="rounded border px-2 py-1 text-[10px]"
                      style={{
                        borderColor: `${selectedLayerPalette?.border || "#06b6d4"}66`,
                        backgroundColor: selectedLayerPalette?.bg || "#ecfeff",
                        color: selectedLayerPalette?.text || "#155e75",
                      }}
                    >
                      {selectedCutLayer.name ||
                        (selectedCutLayer.kind === "upload"
                          ? "Template"
                          : "Fragment")}{" "}
                      | {selectedCutLayerIndex + 1}/{cutLayers.length}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <IconButton
                        icon="target"
                        label="Center Layer"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, {
                            centerX: modelWidth / 2,
                            centerY: modelHeight / 2,
                          })
                        }
                        className="h-8 w-full"
                      />
                      <IconButton
                        icon="fit"
                        label="Fit Rasio Layer"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, (item) => {
                            const srcW = Math.max(
                              1,
                              Number(
                                item.sourceWidth || item.displayWidth || 1,
                              ),
                            );
                            const srcH = Math.max(
                              1,
                              Number(
                                item.sourceHeight || item.displayHeight || 1,
                              ),
                            );
                            const scale = Math.max(
                              0.02,
                              Math.min(modelWidth / srcW, modelHeight / srcH),
                            );
                            return {
                              ...item,
                              displayWidth: clamp(
                                srcW * scale,
                                16,
                                modelWidth * 2,
                              ),
                              displayHeight: clamp(
                                srcH * scale,
                                16,
                                modelHeight * 2,
                              ),
                              centerX: modelWidth / 2,
                              centerY: modelHeight / 2,
                            };
                          })
                        }
                        disabled={
                          !modelWidth ||
                          !modelHeight ||
                          selectedCutLayer.lockScale
                        }
                        className="h-8 w-full"
                      />
                      <IconButton
                        icon="resetCrop"
                        label="Samakan Dengan Background"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, {
                            displayWidth: clamp(modelWidth, 16, modelWidth * 2),
                            displayHeight: clamp(
                              modelHeight,
                              16,
                              modelHeight * 2,
                            ),
                            centerX: modelWidth / 2,
                            centerY: modelHeight / 2,
                          })
                        }
                        disabled={
                          !modelWidth ||
                          !modelHeight ||
                          selectedCutLayer.lockScale
                        }
                        className="h-8 w-full"
                      />
                    </div>

                    {isImageBackedLayerKind(selectedCutLayer.kind) ? (
                      <div className="rounded border border-cyan-200 bg-cyan-50/60 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2 text-[10px] text-cyan-900">
                          <span>
                            Real: W{" "}
                            {formatTemplateLayerRealSize(
                              selectedLayerMetrics.widthMm,
                            )}{" "}
                            | H{" "}
                            {formatTemplateLayerRealSize(
                              selectedLayerMetrics.heightMm,
                            )}
                          </span>
                          {mmPerPixel === null ? (
                            <button
                              type="button"
                              onClick={() => {
                                setHighlightCalibrationPanel(true);
                                setNotice(
                                  "Buat garis kalibrasi real dulu, lalu isi ukuran template.",
                                );
                              }}
                              className="shrink-0 rounded border border-cyan-300 bg-white px-1.5 py-0.5 text-[10px] text-cyan-800"
                            >
                              Kalibrasi
                            </button>
                          ) : null}
                        </div>
                        <div
                          className={`mt-1.5 grid gap-1.5 ${
                            rightSidebarWidth <= 220
                              ? "grid-cols-1"
                              : "grid-cols-[1fr_auto_auto]"
                          }`}
                        >
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={templateRealSizeInput}
                            onChange={(event) =>
                              setTemplateRealSizeInput(event.target.value)
                            }
                            placeholder="Ukuran real"
                            className="min-w-0 rounded border border-cyan-200 bg-white px-2 py-1 text-[10px] text-slate-800 outline-none focus:border-cyan-500"
                          />
                          <select
                            value={templateRealSizeAxis}
                            onChange={(event) =>
                              setTemplateRealSizeAxis(event.target.value)
                            }
                            className="rounded border border-cyan-200 bg-white px-1 py-1 text-[10px] text-slate-700 outline-none focus:border-cyan-500"
                          >
                            <option value="height">Tinggi</option>
                            <option value="width">Lebar</option>
                          </select>
                          <select
                            value={templateRealSizeUnit}
                            onChange={(event) =>
                              setTemplateRealSizeUnit(event.target.value)
                            }
                            className="rounded border border-cyan-200 bg-white px-1 py-1 text-[10px] text-slate-700 outline-none focus:border-cyan-500"
                          >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                          </select>
                        </div>
                        <div
                          className={`mt-1.5 ${SIDEBAR_TEXT_BUTTON_GRID_CLASS}`}
                        >
                          <button
                            type="button"
                            onClick={trimSelectedTemplateLayer}
                            disabled={!selectedLayerCanTrim}
                            className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Trim
                          </button>
                          <button
                            type="button"
                            onClick={applyTemplateRulerScale}
                            disabled={!selectedLayerCanApplyRulerScale}
                            className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Ruler
                          </button>
                          <button
                            type="button"
                            onClick={applyTemplateRealSize}
                            disabled={!selectedLayerCanApplyRealSize}
                            className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Scale
                          </button>
                        </div>
                        <div
                          className={`mt-1.5 ${SIDEBAR_TEXT_BUTTON_GRID_CLASS}`}
                        >
                          <button
                            type="button"
                            onClick={copySelectedTemplateScale}
                            className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900"
                          >
                            Copy Scale
                          </button>
                          <button
                            type="button"
                            onClick={pasteTemplateScaleToSelected}
                            disabled={!selectedLayerCanPasteScale}
                            className="rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Paste Scale
                          </button>
                        </div>
                        {copiedTemplateScale ? (
                          <div className="mt-1 text-[10px] text-cyan-800">
                            Scale siap di-paste
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid gap-1.5">
                      <CompactSliderField
                        label="Width"
                        valueText={`${Math.round(selectedLayerMetrics.width)}`}
                        min={16}
                        max={selectedLayerMetrics.widthMax}
                        step={1}
                        value={selectedLayerMetrics.width}
                        onChange={(event) => {
                          const nextWidth = clamp(
                            Number(event.target.value),
                            16,
                            selectedLayerMetrics.widthMax,
                          );
                          updateLayerById(selectedCutLayer.id, {
                            displayWidth: nextWidth,
                          });
                        }}
                        onDecrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            displayWidth: clamp(
                              Number(item.displayWidth || 16) - 2,
                              16,
                              selectedLayerMetrics.widthMax,
                            ),
                          }))
                        }
                        onIncrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            displayWidth: clamp(
                              Number(item.displayWidth || 16) + 2,
                              16,
                              selectedLayerMetrics.widthMax,
                            ),
                          }))
                        }
                        decreaseIcon="zoomOut"
                        increaseIcon="zoomIn"
                        disabled={selectedCutLayer.lockScale}
                      />
                      <CompactSliderField
                        label="Height"
                        valueText={`${Math.round(selectedLayerMetrics.height)}`}
                        min={16}
                        max={selectedLayerMetrics.heightMax}
                        step={1}
                        value={selectedLayerMetrics.height}
                        onChange={(event) => {
                          const nextHeight = clamp(
                            Number(event.target.value),
                            16,
                            selectedLayerMetrics.heightMax,
                          );
                          updateLayerById(selectedCutLayer.id, {
                            displayHeight: nextHeight,
                          });
                        }}
                        onDecrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            displayHeight: clamp(
                              Number(item.displayHeight || 16) - 2,
                              16,
                              selectedLayerMetrics.heightMax,
                            ),
                          }))
                        }
                        onIncrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            displayHeight: clamp(
                              Number(item.displayHeight || 16) + 2,
                              16,
                              selectedLayerMetrics.heightMax,
                            ),
                          }))
                        }
                        decreaseIcon="zoomOut"
                        increaseIcon="zoomIn"
                        disabled={selectedCutLayer.lockScale}
                      />
                      <CompactSliderField
                        label="Pos X"
                        valueText={`${Math.round(selectedLayerMetrics.centerX)}`}
                        min={0}
                        max={selectedLayerMetrics.centerXMax}
                        step={1}
                        value={clamp(
                          selectedLayerMetrics.centerX,
                          0,
                          selectedLayerMetrics.centerXMax,
                        )}
                        onChange={(event) => {
                          const nextCenterX = clamp(
                            Number(event.target.value),
                            0,
                            selectedLayerMetrics.centerXMax,
                          );
                          updateLayerById(selectedCutLayer.id, {
                            centerX: nextCenterX,
                          });
                        }}
                        onDecrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            centerX: clamp(
                              Number(item.centerX || 0) - 2,
                              0,
                              selectedLayerMetrics.centerXMax,
                            ),
                          }))
                        }
                        onIncrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            centerX: clamp(
                              Number(item.centerX || 0) + 2,
                              0,
                              selectedLayerMetrics.centerXMax,
                            ),
                          }))
                        }
                        decreaseIcon="moveLeft"
                        increaseIcon="moveRight"
                      />
                      <CompactSliderField
                        label="Pos Y"
                        valueText={`${Math.round(selectedLayerMetrics.centerY)}`}
                        min={0}
                        max={selectedLayerMetrics.centerYMax}
                        step={1}
                        value={clamp(
                          selectedLayerMetrics.centerY,
                          0,
                          selectedLayerMetrics.centerYMax,
                        )}
                        onChange={(event) => {
                          const nextCenterY = clamp(
                            Number(event.target.value),
                            0,
                            selectedLayerMetrics.centerYMax,
                          );
                          updateLayerById(selectedCutLayer.id, {
                            centerY: nextCenterY,
                          });
                        }}
                        onDecrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            centerY: clamp(
                              Number(item.centerY || 0) - 2,
                              0,
                              selectedLayerMetrics.centerYMax,
                            ),
                          }))
                        }
                        onIncrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            centerY: clamp(
                              Number(item.centerY || 0) + 2,
                              0,
                              selectedLayerMetrics.centerYMax,
                            ),
                          }))
                        }
                        decreaseIcon="moveUp"
                        increaseIcon="moveDown"
                      />
                      <CompactSliderField
                        label="Opacity"
                        valueText={`${selectedLayerMetrics.opacity}%`}
                        min={10}
                        max={100}
                        step={1}
                        value={selectedLayerMetrics.opacity}
                        onChange={(event) => {
                          const nextOpacity = clamp(
                            Number(event.target.value) / 100,
                            0.05,
                            1,
                          );
                          updateLayerById(selectedCutLayer.id, {
                            opacity: nextOpacity,
                          });
                        }}
                        onDecrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            opacity: clamp(
                              Number(item.opacity ?? 1) - 0.05,
                              0.05,
                              1,
                            ),
                          }))
                        }
                        onIncrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            opacity: clamp(
                              Number(item.opacity ?? 1) + 0.05,
                              0.05,
                              1,
                            ),
                          }))
                        }
                      />
                      <CompactSliderField
                        label="Rotate"
                        valueText={`${selectedLayerMetrics.rotation}°`}
                        min={-180}
                        max={180}
                        step={1}
                        value={selectedLayerMetrics.rotation}
                        onChange={(event) => {
                          const nextDeg = Number(event.target.value);
                          updateLayerById(selectedCutLayer.id, {
                            rotation: (nextDeg + 360) % 360,
                          });
                        }}
                        onDecrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            rotation: ((item.rotation || 0) - 2 + 360) % 360,
                          }))
                        }
                        onIncrease={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            rotation: ((item.rotation || 0) + 2 + 360) % 360,
                          }))
                        }
                        decreaseIcon="rotateLeft"
                        increaseIcon="rotateRight"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <IconButton
                        icon="flipH"
                        label="Flip Layer Horizontal"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            flipX: !item.flipX,
                          }))
                        }
                        className="h-8 w-full"
                      />
                      <IconButton
                        icon="flipV"
                        label="Flip Layer Vertical"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            flipY: !item.flipY,
                          }))
                        }
                        className="h-8 w-full"
                      />
                      <IconButton
                        icon={selectedCutLayer.lockScale ? "lock" : "unlock"}
                        label={
                          selectedCutLayer.lockScale
                            ? "Unlock Scale"
                            : "Lock Scale"
                        }
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            lockScale: !item.lockScale,
                          }))
                        }
                        tone="amber"
                        className="h-8 w-full"
                      />
                      <IconButton
                        icon="trash"
                        label="Hapus Layer"
                        onClick={() => {
                          const deletedLayerId = selectedCutLayer.id;
                          setCutLayers((prev) =>
                            prev.filter((item) => item.id !== deletedLayerId),
                          );
                          setSelectedCutLayerId(null);
                        }}
                        tone="rose"
                        className="h-8 w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}

          {activeRightPanel === "measure" ? (
            <motion.div
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={PANEL_SPRING}
              ref={measurePanelRef}
              className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon name="camera" className="h-4 w-4 text-emerald-700" />
                {!isRightSidebarCompact ? (
                  <span className="text-xs font-semibold tracking-wide text-emerald-900 uppercase">
                    Measure
                  </span>
                ) : null}
                <InfoTooltip text="Preset line, TKA planning, circle, dan hapus/reset measurement." />
              </div>
              {!isRightSidebarCompact ? (
                <div className="flex items-center justify-between text-[11px] text-emerald-900">
                  <span>
                    Total:{" "}
                    {lines.length +
                      angles.length +
                      circles.length +
                      hkaSets.length}
                  </span>
                  <span>
                    Selected:{" "}
                    {selectedLine
                      ? `Line #${selectedLine.id}`
                      : selectedAngle
                        ? `Angle #${selectedAngle.id}`
                        : selectedCircle
                          ? `Circle #${selectedCircle.id}`
                          : selectedHka
                            ? `HKA #${selectedHka.id}`
                            : "-"}{" "}
                    {isSelectedLineLocked ? "(lock)" : ""}
                  </span>
                </div>
              ) : null}
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setMeasureAnatomyTab("hip")}
                  className={`px-2 py-1.5 text-xs font-semibold transition ${
                    measureAnatomyTab === "hip"
                      ? "bg-rose-600 text-white"
                      : "bg-white text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  Hip
                </button>
                <button
                  type="button"
                  onClick={() => setMeasureAnatomyTab("knee")}
                  className={`border-l border-slate-200 px-2 py-1.5 text-xs font-semibold transition ${
                    measureAnatomyTab === "knee"
                      ? "bg-cyan-600 text-white"
                      : "bg-white text-cyan-700 hover:bg-cyan-50"
                  }`}
                >
                  Knee
                </button>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-slate-700 uppercase">
                  <span>General</span>
                  <span className="text-slate-500 normal-case">
                    Measure base
                  </span>
                </div>
                <div
                  className={`grid gap-1.5 ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-[1fr_64px]"}`}
                >
                  <button
                    type="button"
                    onClick={() => handleLinePresetChange("normal")}
                    className={measurePresetButtonClass(
                      linePreset === "normal",
                      "border-slate-700 bg-slate-700 text-white",
                    )}
                  >
                    Line
                  </button>
                  <select
                    value={measurementUnit}
                    onChange={(event) => setMeasurementUnit(event.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700"
                  >
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                  </select>
                </div>
              </div>
              {measureAnatomyTab === "knee" ? (
                <div className="rounded-md border border-cyan-200 bg-cyan-50/40 px-2 py-1.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                    <span>Knee</span>
                    <span className="text-cyan-700 normal-case">
                      Auto HKA & TKA
                    </span>
                  </div>
                  <div className={SIDEBAR_TEXT_BUTTON_GRID_CLASS}>
                    <button
                      type="button"
                      onClick={() => handleToolChange("hkaAuto")}
                      className={measurePresetButtonClass(
                        tool === "hkaAuto",
                        "border-cyan-600 bg-cyan-600 text-white",
                      )}
                    >
                      Auto HKA
                    </button>
                  </div>
                </div>
              ) : null}
              {measureAnatomyTab === "hip" ? (
                <div className="rounded-md border border-rose-200 bg-rose-50/40 px-2 py-1.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-rose-900 uppercase">
                    <span>Hip</span>
                    <span className="text-rose-700 normal-case">
                      Offset & LLD
                    </span>
                  </div>
                  <div className={SIDEBAR_TEXT_BUTTON_GRID_CLASS}>
                    <button
                      type="button"
                      onClick={() => handleLinePresetChange("offset")}
                      className={measurePresetButtonClass(
                        linePreset === "offset",
                        "border-rose-600 bg-rose-600 text-white",
                      )}
                    >
                      Offset
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLinePresetChange("femoralOffset")}
                      className={measurePresetButtonClass(
                        linePreset === "femoralOffset",
                        "border-emerald-600 bg-emerald-600 text-white",
                      )}
                    >
                      F-Offset
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLinePresetChange("globalOffset")}
                      className={measurePresetButtonClass(
                        linePreset === "globalOffset",
                        "border-violet-600 bg-violet-600 text-white",
                      )}
                    >
                      G-Offset
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLinePresetChange("lld")}
                      className={measurePresetButtonClass(
                        linePreset === "lld",
                        "border-orange-600 bg-orange-600 text-white",
                      )}
                    >
                      LLD
                    </button>
                  </div>
                </div>
              ) : null}
              {selectedLine ? (
                <div className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-emerald-900">
                  <div className="mb-1 font-medium text-emerald-950">
                    Adjust Line #{selectedLine.id}
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    {isCoarsePointer
                      ? "Mobile: sentuh ujung untuk munculkan bundaran assist, lalu geser dari area itu untuk adjust. Tap lagi pada badan garis untuk pindah."
                      : "Drag titik ujung, geser garis, atau drag label langsung di canvas."}
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-600">
                      Label X
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={
                          Number.isFinite(selectedLine.labelOffsetX)
                            ? selectedLine.labelOffsetX
                            : DEFAULT_LINE_LABEL_OFFSET_X
                        }
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setLines((prev) =>
                            prev.map((line) =>
                              line.id === selectedLine.id
                                ? { ...line, labelOffsetX: nextValue }
                                : line,
                            ),
                          );
                        }}
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="text-[10px] text-slate-600">
                      Label Y
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        step="1"
                        value={
                          Number.isFinite(selectedLine.labelOffsetY)
                            ? selectedLine.labelOffsetY
                            : DEFAULT_LINE_LABEL_OFFSET_Y
                        }
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setLines((prev) =>
                            prev.map((line) =>
                              line.id === selectedLine.id
                                ? { ...line, labelOffsetY: nextValue }
                                : line,
                            ),
                          );
                        }}
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="text-[10px] text-slate-600">
                      Label Opacity
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="1"
                        value={Math.round(
                          (Number.isFinite(selectedLine.labelOpacity)
                            ? selectedLine.labelOpacity
                            : DEFAULT_LABEL_OPACITY) * 100,
                        )}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value) / 100;
                          setLines((prev) =>
                            prev.map((line) =>
                              line.id === selectedLine.id
                                ? { ...line, labelOpacity: nextValue }
                                : line,
                            ),
                          );
                        }}
                        className="mt-1 w-full"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) =>
                            prev.map((line) =>
                              line.id === selectedLine.id
                                ? {
                                    ...line,
                                    labelOffsetX: DEFAULT_LINE_LABEL_OFFSET_X,
                                    labelOffsetY: DEFAULT_LINE_LABEL_OFFSET_Y,
                                    labelOpacity: DEFAULT_LABEL_OPACITY,
                                  }
                                : line,
                            ),
                          )
                        }
                        className="rounded border border-emerald-300 bg-white px-2 py-1 text-[10px] text-emerald-900"
                      >
                        Reset Label
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) =>
                            prev.map((line) =>
                              line.id === selectedLine.id
                                ? {
                                    ...line,
                                    labelOffsetX: -62,
                                    labelOffsetY: -22,
                                    labelOpacity: 0.55,
                                  }
                                : line,
                            ),
                          )
                        }
                        className="rounded border border-emerald-300 bg-white px-2 py-1 text-[10px] text-emerald-900"
                      >
                        Ringkas
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {selectedAngle && selectedAngleMetrics ? (
                <div className="rounded-md border border-orange-200 bg-orange-50/50 px-2 py-1.5 text-[11px] text-orange-900">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="font-medium text-orange-950">
                      Angle Settings #{selectedAngle.id}
                    </div>
                    <span className="text-[10px] text-orange-700">
                      {selectedAngleMetrics.valueDeg.toFixed(1)}°
                    </span>
                  </div>
                  <div className="text-[10px] text-orange-700">
                    Drag 3 titik angle di canvas. Atur label dan warna dari
                    panel ini.
                  </div>
                  <div className="mt-1.5 rounded-md border border-orange-200 bg-white px-2 py-1.5">
                    <div className="mb-1 text-[10px] font-semibold tracking-wide text-orange-900 uppercase">
                      Color
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ANGLE_COLOR_OPTIONS.map((color) => (
                        <ColorSwatchButton
                          key={color}
                          color={color}
                          active={selectedAngleMetrics.color === color}
                          label={`Warna angle ${color}`}
                          onClick={() =>
                            updateAngleById(selectedAngle.id, { color })
                          }
                        />
                      ))}
                      <label
                        className="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white"
                        title="Warna custom"
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-dashed border-slate-400"
                          style={{
                            background:
                              "conic-gradient(from 180deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ef4444)",
                          }}
                        />
                        <input
                          type="color"
                          value={selectedAngleMetrics.color}
                          onChange={(event) =>
                            updateAngleById(selectedAngle.id, {
                              color: event.target.value,
                            })
                          }
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="mt-1.5 grid gap-1.5">
                    <CompactSliderField
                      label="Stroke"
                      valueText={`${selectedAngleMetrics.strokeWidth.toFixed(1)}x`}
                      min={1.5}
                      max={6}
                      step={0.5}
                      value={selectedAngleMetrics.strokeWidth}
                      onChange={(event) =>
                        updateAngleById(selectedAngle.id, {
                          strokeWidth: Number(event.target.value),
                        })
                      }
                      onDecrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          strokeWidth: clamp(
                            (Number(item.strokeWidth) ||
                              DEFAULT_ANGLE_STROKE_WIDTH) - 0.5,
                            1.5,
                            6,
                          ),
                        }))
                      }
                      onIncrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          strokeWidth: clamp(
                            (Number(item.strokeWidth) ||
                              DEFAULT_ANGLE_STROKE_WIDTH) + 0.5,
                            1.5,
                            6,
                          ),
                        }))
                      }
                    />
                    <CompactSliderField
                      label="Label X"
                      valueText={`${Math.round(selectedAngleMetrics.labelOffsetX)}`}
                      min={-180}
                      max={180}
                      step={1}
                      value={selectedAngleMetrics.labelOffsetX}
                      onChange={(event) =>
                        updateAngleById(selectedAngle.id, {
                          labelOffsetX: Number(event.target.value),
                        })
                      }
                      onDecrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          labelOffsetX: clamp(
                            (Number(item.labelOffsetX) ||
                              DEFAULT_ANGLE_LABEL_OFFSET_X) - 2,
                            -180,
                            180,
                          ),
                        }))
                      }
                      onIncrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          labelOffsetX: clamp(
                            (Number(item.labelOffsetX) ||
                              DEFAULT_ANGLE_LABEL_OFFSET_X) + 2,
                            -180,
                            180,
                          ),
                        }))
                      }
                      decreaseIcon="moveLeft"
                      increaseIcon="moveRight"
                    />
                    <CompactSliderField
                      label="Label Y"
                      valueText={`${Math.round(selectedAngleMetrics.labelOffsetY)}`}
                      min={-140}
                      max={140}
                      step={1}
                      value={selectedAngleMetrics.labelOffsetY}
                      onChange={(event) =>
                        updateAngleById(selectedAngle.id, {
                          labelOffsetY: Number(event.target.value),
                        })
                      }
                      onDecrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          labelOffsetY: clamp(
                            (Number(item.labelOffsetY) ||
                              DEFAULT_ANGLE_LABEL_OFFSET_Y) - 2,
                            -140,
                            140,
                          ),
                        }))
                      }
                      onIncrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          labelOffsetY: clamp(
                            (Number(item.labelOffsetY) ||
                              DEFAULT_ANGLE_LABEL_OFFSET_Y) + 2,
                            -140,
                            140,
                          ),
                        }))
                      }
                      decreaseIcon="moveUp"
                      increaseIcon="moveDown"
                    />
                    <CompactSliderField
                      label="Label Opacity"
                      valueText={`${selectedAngleMetrics.labelOpacity}%`}
                      min={20}
                      max={100}
                      step={1}
                      value={selectedAngleMetrics.labelOpacity}
                      onChange={(event) =>
                        updateAngleById(selectedAngle.id, {
                          labelOpacity: Number(event.target.value) / 100,
                        })
                      }
                      onDecrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          labelOpacity: clamp(
                            (Number(item.labelOpacity) ||
                              DEFAULT_LABEL_OPACITY) - 0.05,
                            0.2,
                            1,
                          ),
                        }))
                      }
                      onIncrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          labelOpacity: clamp(
                            (Number(item.labelOpacity) ||
                              DEFAULT_LABEL_OPACITY) + 0.05,
                            0.2,
                            1,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateAngleById(selectedAngle.id, {
                          color: DEFAULT_ANGLE_COLOR,
                          strokeWidth: DEFAULT_ANGLE_STROKE_WIDTH,
                          labelOffsetX: DEFAULT_ANGLE_LABEL_OFFSET_X,
                          labelOffsetY: DEFAULT_ANGLE_LABEL_OFFSET_Y,
                          labelOpacity: DEFAULT_LABEL_OPACITY,
                        })
                      }
                      className="rounded-md border border-orange-300 bg-white px-2 py-1 text-[10px] text-orange-900"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateAngleById(selectedAngle.id, {
                          labelOffsetX: -38,
                          labelOffsetY: -18,
                          labelOpacity: 0.48,
                        })
                      }
                      className="rounded-md border border-orange-300 bg-white px-2 py-1 text-[10px] text-orange-900"
                    >
                      Ringkas
                    </button>
                  </div>
                </div>
              ) : null}
              {measureAnatomyTab === "knee" ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/40 px-2 py-1.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-amber-900 uppercase">
                    <span>TKA Planning</span>
                    <span className="tracking-normal text-amber-700 normal-case">
                      {planningGuides.length} guide
                    </span>
                  </div>
                  <div className="rounded border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-amber-900">
                    <div className="font-medium text-amber-950">
                      Acuan Planning
                    </div>
                    <div className="mt-0.5">
                      {selectedLine
                        ? `Line #${selectedLine.id} | ${lineTypeLabel(selectedLine.type)}${
                            mmPerPixel !== null
                              ? ` | ${formatMeasurementFromPx(getLineLength(selectedLine))}`
                              : ""
                          }`
                        : "Pilih satu line dulu dari tab Measure."}
                    </div>
                  </div>
                  <div className={`mt-1.5 ${SIDEBAR_TEXT_BUTTON_GRID_CLASS}`}>
                    {[
                      {
                        id: "valgusCut",
                        label: "Distal Cut",
                      },
                      {
                        id: "tibialSlope",
                        label: "Tibial Slope",
                      },
                      {
                        id: "tibialCut",
                        label: "Tibial Cut",
                      },
                    ].map((mode) => {
                      const isActive = planningGuideMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPlanningGuideMode(mode.id)}
                          className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                            isActive
                              ? "border-amber-700 bg-amber-700 text-white"
                              : "border-amber-200 bg-white text-amber-900 hover:bg-amber-100"
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedPlanningGuide ? (
                    <div className="mt-1.5 rounded-md border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-amber-900">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-amber-950">
                          Guide Aktif
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPlanningGuideId(null)}
                          className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] text-amber-900"
                        >
                          Lepas
                        </button>
                      </div>
                      <div className="mt-0.5 text-[10px] text-amber-700">
                        Anchor dan label bisa di-drag langsung di canvas.
                        Gunakan sync bila anchor mau ikut line baru.
                      </div>
                      <div className="mt-1.5 grid gap-1.5">
                        <label className="text-[10px] text-slate-600">
                          Label X
                          <input
                            type="range"
                            min="-220"
                            max="220"
                            step="1"
                            value={planningGuideLabelOffsetX}
                            onChange={(event) =>
                              setPlanningGuideLabelOffsetX(
                                Number(event.target.value),
                              )
                            }
                            className="mt-1 w-full"
                          />
                        </label>
                        <label className="text-[10px] text-slate-600">
                          Label Y
                          <input
                            type="range"
                            min="-140"
                            max="140"
                            step="1"
                            value={planningGuideLabelOffsetY}
                            onChange={(event) =>
                              setPlanningGuideLabelOffsetY(
                                Number(event.target.value),
                              )
                            }
                            className="mt-1 w-full"
                          />
                        </label>
                        <label className="text-[10px] text-slate-600">
                          Label Opacity
                          <input
                            type="range"
                            min="20"
                            max="100"
                            step="1"
                            value={Math.round(planningGuideLabelOpacity * 100)}
                            onChange={(event) =>
                              setPlanningGuideLabelOpacity(
                                Number(event.target.value) / 100,
                              )
                            }
                            className="mt-1 w-full"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPlanningGuideLabelOffsetX(
                                DEFAULT_GUIDE_LABEL_OFFSET_X,
                              );
                              setPlanningGuideLabelOffsetY(
                                DEFAULT_GUIDE_LABEL_OFFSET_Y,
                              );
                              setPlanningGuideLabelOpacity(
                                DEFAULT_LABEL_OPACITY,
                              );
                            }}
                            className="rounded border border-amber-300 bg-white px-2 py-1 text-[10px] text-amber-900"
                          >
                            Reset Label
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPlanningGuideLabelOffsetX(-76);
                              setPlanningGuideLabelOffsetY(-20);
                              setPlanningGuideLabelOpacity(0.48);
                            }}
                            className="rounded border border-amber-300 bg-white px-2 py-1 text-[10px] text-amber-900"
                          >
                            Ringkas
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {planningGuideMode === "valgusCut" ? (
                    <div
                      className={`mt-1.5 grid gap-1.5 rounded-md border border-amber-200 bg-white p-2 text-[11px] text-slate-600 ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
                    >
                      <label>
                        Angle
                        <input
                          type="number"
                          min="0"
                          max="15"
                          step="0.5"
                          value={valgusCutAngleDeg}
                          onChange={(event) =>
                            setValgusCutAngleDeg(
                              Number(event.target.value) || 0,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                      <label>
                        Side
                        <select
                          value={valgusCutSide}
                          onChange={(event) =>
                            setValgusCutSide(event.target.value)
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          <option value="Right">Right</option>
                          <option value="Left">Left</option>
                        </select>
                      </label>
                      <label>
                        Offset
                        <input
                          type="number"
                          min="0"
                          max="400"
                          step="1"
                          value={valgusCutOffsetPx}
                          onChange={(event) =>
                            setValgusCutOffsetPx(
                              Number(event.target.value) || 0,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                      <label>
                        Length
                        <input
                          type="number"
                          min="20"
                          max="800"
                          step="5"
                          value={valgusCutLineLengthPx}
                          onChange={(event) =>
                            setValgusCutLineLengthPx(
                              Number(event.target.value) || 20,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                    </div>
                  ) : null}
                  {planningGuideMode === "tibialSlope" ? (
                    <div
                      className={`mt-1.5 grid gap-1.5 rounded-md border border-amber-200 bg-white p-2 text-[11px] text-slate-600 ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
                    >
                      <label>
                        Slope
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={tibialSlopeDeg}
                          onChange={(event) =>
                            setTibialSlopeDeg(Number(event.target.value) || 0)
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                      <label>
                        Posterior
                        <select
                          value={tibialPosteriorSide}
                          onChange={(event) =>
                            setTibialPosteriorSide(event.target.value)
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          <option value="Right">Right</option>
                          <option value="Left">Left</option>
                        </select>
                      </label>
                      <label>
                        Offset
                        <input
                          type="number"
                          min="0"
                          max="400"
                          step="1"
                          value={tibialSlopeOffsetPx}
                          onChange={(event) =>
                            setTibialSlopeOffsetPx(
                              Number(event.target.value) || 0,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                      <label>
                        Length
                        <input
                          type="number"
                          min="20"
                          max="800"
                          step="5"
                          value={tibialSlopeLineLengthPx}
                          onChange={(event) =>
                            setTibialSlopeLineLengthPx(
                              Number(event.target.value) || 20,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                    </div>
                  ) : null}
                  {planningGuideMode === "tibialCut" ? (
                    <div
                      className={`mt-1.5 grid gap-1.5 rounded-md border border-amber-200 bg-white p-2 text-[11px] text-slate-600 ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
                    >
                      <label>
                        Angle
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={tibialCutAngleDeg}
                          onChange={(event) =>
                            setTibialCutAngleDeg(
                              Number(event.target.value) || 0,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                      <label>
                        Direction
                        <select
                          value={tibialCutDirection}
                          onChange={(event) =>
                            setTibialCutDirection(event.target.value)
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          <option value="Valgus">Valgus</option>
                          <option value="Varus">Varus</option>
                        </select>
                      </label>
                      <label>
                        Offset
                        <input
                          type="number"
                          min="0"
                          max="400"
                          step="1"
                          value={tibialCutOffsetPx}
                          onChange={(event) =>
                            setTibialCutOffsetPx(
                              Number(event.target.value) || 0,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                      <label>
                        Length
                        <input
                          type="number"
                          min="20"
                          max="800"
                          step="5"
                          value={tibialCutLineLengthPx}
                          onChange={(event) =>
                            setTibialCutLineLengthPx(
                              Number(event.target.value) || 20,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-amber-200 px-2 py-1 text-xs text-slate-700"
                        />
                      </label>
                    </div>
                  ) : null}
                  <div className={`mt-1.5 ${SIDEBAR_TEXT_BUTTON_GRID_CLASS}`}>
                    {selectedPlanningGuide ? (
                      <>
                        <button
                          type="button"
                          onClick={() => updateSelectedPlanningGuide()}
                          className="rounded-md border border-amber-800 bg-amber-800 px-2 py-1 text-xs font-medium text-white"
                        >
                          Update Guide
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedPlanningGuide({ syncLine: true })
                          }
                          disabled={!selectedLine}
                          className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Sync dari Line
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={addPlanningGuideFromSelectedLine}
                        disabled={!selectedLine}
                        className="rounded-md border border-amber-800 bg-amber-800 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Buat dari Line
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPlanningGuides([]);
                        setSelectedPlanningGuideId(null);
                        setNotice("Semua planning guide dihapus.");
                      }}
                      disabled={planningGuides.length === 0}
                      className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Clear Guide
                    </button>
                  </div>
                  <div className="mt-1.5 max-h-36 overflow-y-auto rounded-md border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-amber-900">
                    {planningGuideRows.length === 0 ? (
                      <p>Belum ada planning guide.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {planningGuideRows
                          .slice()
                          .reverse()
                          .map((row) => {
                            const guide = planningGuides.find(
                              (item) => item.id === row.id,
                            );
                            const isGuideSelected =
                              row.id === selectedPlanningGuideId;
                            return (
                              <motion.div
                                layout
                                key={row.id}
                                className={`rounded border px-2 py-1.5 ${
                                  isGuideSelected
                                    ? "border-amber-300 bg-amber-100/70 shadow-sm"
                                    : "border-amber-100 bg-amber-50/40"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      selectPlanningGuideForEdit(row.id)
                                    }
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="truncate font-medium text-amber-950">
                                      {row.label}
                                    </div>
                                    <div className="text-[10px] text-amber-700">
                                      {row.meta}
                                    </div>
                                  </button>
                                  <div className="flex shrink-0 gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        togglePlanningGuideHidden(row.id)
                                      }
                                      className="rounded border border-amber-200 bg-white px-1.5 py-0.5 text-[10px] text-amber-900"
                                    >
                                      {guide?.hidden ? "Show" : "Hide"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removePlanningGuide(row.id)
                                      }
                                      className="rounded border border-rose-200 bg-white px-1.5 py-0.5 text-[10px] text-rose-700"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {selectedCircle ? (
                <div className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] text-slate-700">
                  <div className="mb-1 font-medium text-violet-800">
                    Adjust Circle Diameter
                  </div>
                  <div className="mb-1">
                    Diameter:{" "}
                    {mmPerPixel !== null
                      ? `${
                          measurementUnit === "cm"
                            ? (
                                (selectedCircle.radius * 2 * mmPerPixel) /
                                10
                              ).toFixed(2)
                            : (selectedCircle.radius * 2 * mmPerPixel).toFixed(
                                2,
                              )
                        } ${measurementUnit}`
                      : `${Math.round(selectedCircle.radius * 2)}`}
                  </div>
                  <input
                    type="range"
                    min="6"
                    max={Math.max(10, Math.max(modelWidth, modelHeight) * 1.5)}
                    step="0.5"
                    value={selectedCircle.radius * 2}
                    onChange={(event) => {
                      const nextDiameter = Number(event.target.value);
                      setCircles((prev) =>
                        prev.map((item) =>
                          item.id === selectedCircle.id
                            ? { ...item, radius: Math.max(3, nextDiameter / 2) }
                            : item,
                        ),
                      );
                    }}
                    className="w-full"
                  />
                  <div
                    className={`mt-1 grid gap-1.5 ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCircles((prev) =>
                          prev.map((item) =>
                            item.id === selectedCircle.id
                              ? {
                                  ...item,
                                  radius: Math.max(3, item.radius - 1),
                                }
                              : item,
                          ),
                        )
                      }
                      className="rounded border border-violet-300 bg-white px-2 py-1 text-xs text-violet-800"
                    >
                      - kecilkan
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCircles((prev) =>
                          prev.map((item) =>
                            item.id === selectedCircle.id
                              ? {
                                  ...item,
                                  radius: Math.min(
                                    Math.max(modelWidth, modelHeight) * 1.5,
                                    item.radius + 1,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                      className="rounded border border-violet-300 bg-white px-2 py-1 text-xs text-violet-800"
                    >
                      + besarkan
                    </button>
                  </div>
                </div>
              ) : null}
              <div className={SIDEBAR_ICON_GRID_CLASS}>
                <IconButton
                  icon={isSelectedLineLocked ? "unlock" : "lock"}
                  label={
                    isSelectedLineLocked ? "Unlock Selected" : "Lock Selected"
                  }
                  onClick={toggleSelectedLineLock}
                  disabled={!selectedLine}
                  tone="amber"
                  className="h-8 w-full"
                />
                <IconButton
                  icon="trash"
                  label="Hapus Measurement Terpilih"
                  onClick={removeSelectedLine}
                  disabled={
                    !selectedLine &&
                    !selectedAngle &&
                    !selectedCircle &&
                    !selectedHka
                  }
                  tone="rose"
                  className="h-8 w-full"
                />
                <IconButton
                  icon="clear"
                  label="Clear Measurement"
                  onClick={clearMeasurementLines}
                  tone="rose"
                  className="h-8 w-full"
                />
                <IconButton
                  icon="reset"
                  label="Reset Kalibrasi"
                  onClick={resetCalibration}
                  disabled={!hasCalibration}
                  tone="amber"
                  className="h-8 w-full"
                />
                <IconButton
                  icon="reset"
                  label="Reset Semua"
                  onClick={() => resetWorkspaceState()}
                  className="h-8 w-full"
                />
              </div>
              {measureAnatomyTab === "hip" ? (
                <div className="rounded-md border border-rose-200 bg-rose-50/40 px-2 py-1.5 text-[11px] text-rose-900">
                  <div className="mb-1 font-medium text-rose-950">
                    Hip Summary
                  </div>
                  <div>Femoral Offset: {legPackageSummary.femoralMean}</div>
                  <div>Global Offset: {legPackageSummary.globalMean}</div>
                  <div>LLD: {legPackageSummary.lldDelta}</div>
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {activeRightPanel === "planning" ? (
            <motion.div
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={PANEL_SPRING}
              className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon name="package" className="h-4 w-4 text-amber-700" />
                {!isRightSidebarCompact ? (
                  <span className="text-xs font-semibold tracking-wide text-amber-900 uppercase">
                    Planning
                  </span>
                ) : null}
                <InfoTooltip text="Snapshot rencana, note, inventory, dan ringkasan guide aktif." />
              </div>
              <div
                className={`grid gap-1.5 text-[11px] text-amber-900 ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-3"}`}
              >
                <div className="rounded border border-amber-200 bg-white px-2 py-1">
                  Measure: {measurementRows.length}
                </div>
                <div className="rounded border border-amber-200 bg-white px-2 py-1">
                  Layer: {cutLayers.length}
                </div>
                <div className="rounded border border-amber-200 bg-white px-2 py-1">
                  Step: {planSteps.length}
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-amber-900">
                <div className="font-medium text-amber-950">Guide Aktif</div>
                {planningGuideRows.length === 0 ? (
                  <div className="mt-0.5">
                    Belum ada guide aktif. Atur dari tab Measure &gt; TKA
                    Planning.
                  </div>
                ) : (
                  <div className="mt-1 flex max-h-24 flex-col gap-1 overflow-y-auto">
                    {planningGuideRows
                      .slice()
                      .reverse()
                      .map((row) => (
                        <div
                          key={row.id}
                          className="flex justify-between gap-2"
                        >
                          <span className="min-w-0 truncate">{row.label}</span>
                          <span className="shrink-0 text-amber-700">
                            {row.angle}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <textarea
                value={planNote}
                onChange={(event) => setPlanNote(event.target.value)}
                rows={3}
                placeholder="Catatan step: reduction, implant size, posisi plate/screw, atau review final."
                className="min-h-20 w-full resize-y rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs text-slate-700"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={addPlanningStep}
                  disabled={!image}
                  className="rounded-md border border-amber-800 bg-amber-800 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Tambah Step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlanSteps([]);
                    setNotice("Semua planning step dihapus.");
                  }}
                  disabled={planSteps.length === 0}
                  className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Clear Step
                </button>
              </div>
              <div className="rounded-md border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-amber-900">
                <div className="mb-1 font-medium text-amber-950">
                  Ringkasan Snapshot
                </div>
                <div>Measure: {measurementRows.length}</div>
                <div>Layer: {cutLayers.length}</div>
                <div>Step: {planSteps.length}</div>
              </div>
              <div className="rounded-md border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-amber-900">
                <div className="mb-1 font-medium text-amber-950">
                  Inventory Template / Fragment
                </div>
                {templateInventoryRows.length === 0 ? (
                  <div>Belum ada template atau fragment.</div>
                ) : (
                  <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                    {templateInventoryRows.map((row) => (
                      <div
                        key={`${row.kind}-${row.id}`}
                        className="flex justify-between gap-2"
                      >
                        <span className="min-w-0 truncate">
                          {row.kind}: {row.name}
                        </span>
                        <span className="shrink-0 text-amber-700">
                          {row.size}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="max-h-32 overflow-y-auto rounded-md border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-amber-900">
                {planSteps.length === 0 ? (
                  <p>Belum ada planning step.</p>
                ) : (
                  planSteps
                    .slice()
                    .reverse()
                    .map((step) => (
                      <motion.div
                        layout
                        key={step.id}
                        className="border-b border-amber-100 py-1 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-amber-950">
                            {step.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePlanningStep(step.id)}
                            className="text-rose-600"
                          >
                            Hapus
                          </button>
                        </div>
                        <div className="text-[10px] text-amber-700">
                          {step.at} | {step.calibration}
                        </div>
                        <p className="mt-0.5">{step.note}</p>
                      </motion.div>
                    ))
                )}
              </div>
            </motion.div>
          ) : null}
        </motion.aside>

        <motion.div
          layout
          transition={PANEL_SPRING}
          className="order-1 border-0 bg-transparent p-0 lg:order-2 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:p-2"
        >
          <div
            className={`grid gap-0 lg:gap-2 ${compareMode ? "lg:grid-cols-2" : "grid-cols-1"}`}
          >
            <div
              ref={containerRef}
              className="relative h-[calc(100dvh-108px)] min-h-[460px] w-full overflow-hidden bg-slate-950/95 sm:h-[70vh] sm:min-h-[420px] sm:rounded-lg sm:border sm:border-slate-300 lg:h-[calc(100vh-156px)]"
            >
              <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20 px-2 lg:hidden">
                <div className="flex items-center gap-2">
                  <div className="grid flex-1 grid-cols-4 rounded-2xl border border-slate-600/70 bg-slate-900/82 p-1 shadow-xl backdrop-blur">
                    {[
                      {
                        id: "setup",
                        label: "Setup",
                        onClick: () => {
                          setMobilePanelMode("setup");
                          setMobileControlsOpen(true);
                        },
                        active: mobileSetupPanelVisible,
                      },
                      {
                        id: "tool",
                        label: "Tool",
                        onClick: () => {
                          setMobilePanelMode("workspace");
                          setActiveRightPanel("tool");
                          setMobileControlsOpen(true);
                        },
                        active:
                          mobileWorkspacePanelVisible &&
                          activeRightPanel === "tool",
                      },
                      {
                        id: "measure",
                        label: "Measure",
                        onClick: () => {
                          setMobilePanelMode("workspace");
                          setActiveRightPanel("measure");
                          setMobileControlsOpen(true);
                        },
                        active:
                          mobileWorkspacePanelVisible &&
                          activeRightPanel === "measure",
                      },
                      {
                        id: "planning",
                        label: "Plan",
                        onClick: () => {
                          setMobilePanelMode("workspace");
                          setActiveRightPanel("planning");
                          setMobileControlsOpen(true);
                        },
                        active:
                          mobileWorkspacePanelVisible &&
                          activeRightPanel === "planning",
                      },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        className={`inline-flex min-w-0 items-center justify-center rounded-xl px-2 py-2 text-[10px] font-semibold transition ${
                          item.active
                            ? "bg-white text-slate-900"
                            : "text-slate-100 hover:bg-slate-800/70"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-600/70 bg-slate-900/82 p-1 shadow-xl backdrop-blur">
                    <ToolIconButton
                      icon="pan"
                      label="Move / Pan (H)"
                      onClick={() => handleToolChange("pan")}
                      active={tool === "pan"}
                      className="h-10 w-10 shrink-0 border-slate-500"
                    />
                    <ToolIconButton
                      icon="draw"
                      label="Draw Line (L)"
                      onClick={() => handleToolChange("draw")}
                      active={tool === "draw"}
                      className="h-10 w-10 shrink-0 border-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMobilePanelMode("workspace");
                        setActiveRightPanel("tool");
                        setMobileControlsOpen(true);
                      }}
                      className="inline-flex h-10 min-w-[68px] items-center justify-center gap-1 rounded-xl border border-slate-500 bg-slate-900/85 px-2 text-[10px] font-semibold text-slate-100 transition hover:bg-slate-800"
                      aria-label={`Buka tools, tool aktif ${activeToolLabel}`}
                      title={`Tool aktif: ${activeToolLabel}`}
                    >
                      <Icon name={activeToolIcon} className="h-4 w-4" />
                      <span>Tools</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5 rounded-md border border-slate-600/70 bg-slate-900/70 p-1 backdrop-blur sm:top-3 sm:right-3 lg:top-auto lg:right-3 lg:bottom-3">
                <motion.button
                  type="button"
                  onClick={() => zoomBy(1.15)}
                  whileHover={BUTTON_HOVER}
                  whileTap={BUTTON_TAP}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-500/80 bg-slate-900/80 text-white transition hover:bg-slate-800"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" strokeWidth={2} />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => zoomBy(1 / 1.15)}
                  whileHover={BUTTON_HOVER}
                  whileTap={BUTTON_TAP}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-500/80 bg-slate-900/80 text-white transition hover:bg-slate-800"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" strokeWidth={2} />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={fitImageToViewport}
                  whileHover={BUTTON_HOVER}
                  whileTap={BUTTON_TAP}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-500/80 bg-slate-900/80 text-white transition hover:bg-slate-800"
                  aria-label="Fit to screen"
                  title="Fit to screen"
                >
                  <Maximize2 className="h-4 w-4" strokeWidth={2} />
                </motion.button>
              </div>
              <canvas ref={imageCanvasRef} className="absolute inset-0" />
              <canvas
                ref={overlayCanvasRef}
                className={`absolute inset-0 touch-none select-none ${
                  tool === "pan"
                    ? interactionRef.current.mode === "pan"
                      ? "cursor-grabbing"
                      : "cursor-grab"
                    : interactionRef.current.mode === "move-line" ||
                        interactionRef.current.mode === "move-line-label" ||
                        interactionRef.current.mode === "move-cut-layer" ||
                        interactionRef.current.mode === "move-circle-center" ||
                        interactionRef.current.mode === "move-planning-guide" ||
                        interactionRef.current.mode ===
                          "move-planning-guide-label"
                      ? "cursor-grabbing"
                      : interactionRef.current.mode === "move-handle" ||
                          interactionRef.current.mode === "resize-cut-layer" ||
                          interactionRef.current.mode === "move-angle-handle" ||
                          interactionRef.current.mode ===
                            "move-circle-radius" ||
                          interactionRef.current.mode === "move-hka-handle" ||
                          interactionRef.current.mode ===
                            "move-planning-guide-handle"
                        ? "cursor-pointer"
                        : "cursor-crosshair"
                }`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onContextMenu={(event) => event.preventDefault()}
              />
            </div>

            {compareMode ? (
              <div
                ref={compareContainerRef}
                className="relative h-[34vh] min-h-[220px] w-full overflow-hidden bg-slate-950/95 sm:h-[68vh] sm:min-h-[420px] sm:rounded-lg sm:border sm:border-slate-300 lg:h-[calc(100vh-170px)]"
              >
                <canvas ref={compareCanvasRef} className="absolute inset-0" />
              </div>
            ) : null}
          </div>
          <div className="mt-2 hidden flex-wrap items-center gap-2 text-[11px] text-slate-600 sm:flex">
            <span className="rounded bg-slate-100 px-2 py-0.5">
              Zoom {(view.scale * 100).toFixed(0)}%
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5">
              {activeToolLabel}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5">
              {hasCalibration ? measurementUnit : "uncalibrated"}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5">
              Calib: {calibrationMode === "line" ? "Line" : "Zoom%"}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5">History</span>
            {compareMode ? (
              <span className="rounded bg-cyan-100 px-2 py-0.5 text-cyan-800">
                Compare ON
              </span>
            ) : null}
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
