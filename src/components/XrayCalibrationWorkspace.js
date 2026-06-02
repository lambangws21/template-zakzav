"use client";

import { ID, Query } from "appwrite";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  Bone,
  Camera,
  ChartSpline,
  CircleDot,
  CloudOff,
  Crop,
  DraftingCompass,
  Download,
  Eye,
  EyeOff,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  GitCompare,
  HandGrab,
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
  RulerDimensionLine,
  Save,
  Spline,
  Target,
  Trash2,
  Undo2,
  Upload,
  X,
  Slice,
  SlidersHorizontal,
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
import { signedCoronalAngle as getHkaSignedCoronalAngle } from "../lib/hka/geometry";
import {
  calculateFullLengthHKA,
  classifyAlignment,
} from "../lib/hka/hkaCalculator";
import { calculateFTA, predictHKAAFromFTA } from "../lib/hka/ftaCalculator";
import GoogleSheetDrivePicker from "./GoogleSheetDrivePicker";
import {
  getImplantLibraryItemById,
  LOCAL_IMPLANT_LIBRARY,
  LOCAL_IMPLANT_LIBRARY_TYPES,
} from "../lib/digitalTemplating/implantLibrary";
import { createTemplatingId } from "../lib/digitalTemplating/viewerUtils";
import LocalImplantLibraryPanel from "./LocalImplantLibraryPanel";
import CalibrationLineModalPanel from "./modalPanel";
import ModalStarter from "./ModalStarter";
import MobileNavigation from "./MobileNavigation";
import PanelActions from "./PanelActions";
import QuickPanel from "./QuickPanel";
import TemplateStoragePicker from "./TemplateStoragePicker";

const MIN_SCALE = 0.1;
const MAX_SCALE = 12;
const STORY_STORAGE_KEY = "xray_workspace_story_v1";
const TEMPLATE_LIBRARY_KEY = "xray_template_library_v1";
const MEASURE_LEGEND_VISIBILITY_KEY = "xray_measure_legend_visible_v1";
const DEFAULT_TEMPLATE_LAYER_OPACITY = 0.55;
const TEMPLATE_INITIAL_MAX_FRACTION = 0.3;
const VIEW_PAN_VISIBLE_MARGIN = 96;
const DEFAULT_SNAP_SETTINGS = {
  endpoint: true,
  midpoint: true,
  intersection: true,
  center: true,
  tangent: false,
  perpendicular: false,
  shiftOnlyDesktop: false,
};
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
const MOBILE_PANEL_TRANSITION = { duration: 0.12, ease: "easeOut" };
const SOFT_SURFACE_CLASS =
  "rounded-[24px] border border-white/78 bg-[linear-gradient(180deg,#f8fafc_0%,#edf2f7_100%)] shadow-[10px_10px_22px_rgba(71,85,105,0.18),-2px_-2px_8px_rgba(255,255,255,0.34)]";
const SOFT_RAISED_CLASS =
  "rounded-[18px] border border-white/82 bg-[linear-gradient(180deg,#fbfdff_0%,#ecf1f6_100%)] shadow-[6px_6px_14px_rgba(71,85,105,0.18),-2px_-2px_8px_rgba(255,255,255,0.28)]";
const SOFT_PRESSED_CLASS =
  "rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,#edf2f7_0%,#fafcff_100%)] shadow-[inset_6px_6px_12px_rgba(71,85,105,0.14),inset_-3px_-3px_8px_rgba(255,255,255,0.3)]";
const SOFT_INSET_CLASS =
  "rounded-[18px] border border-white/82 bg-[linear-gradient(180deg,#eef2f7_0%,#f9fbfd_100%)] shadow-[inset_6px_6px_12px_rgba(71,85,105,0.12),inset_-3px_-3px_8px_rgba(255,255,255,0.26)]";
const SOFT_INPUT_CLASS = `${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700 outline-none`;
const SOFT_SELECT_CLASS = `${SOFT_RAISED_CLASS} px-3 py-2 text-xs text-slate-700 outline-none`;
const SOFT_TEXT_BUTTON_CLASS = `${SOFT_RAISED_CLASS} px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-slate-900`;
const SOFT_DANGER_BUTTON_CLASS = `${SOFT_RAISED_CLASS} px-3 py-2 text-xs font-medium text-rose-600 transition hover:text-rose-700`;
const SOFT_PRIMARY_BUTTON_CLASS =
  "rounded-[18px] border border-[#d8fff1] bg-[linear-gradient(180deg,#ddfff2_0%,#c5f3e6_100%)] px-3 py-2 text-xs font-medium text-slate-800 shadow-[8px_8px_18px_rgba(16,185,129,0.12),-2px_-2px_6px_rgba(255,255,255,0.24)] transition hover:text-slate-900";
const SOFT_DARK_BUTTON_CLASS =
  "rounded-[18px] border border-[#2a3246] bg-[linear-gradient(180deg,#30394f_0%,#1f2636_100%)] px-3 py-2 text-xs font-medium text-white shadow-[8px_8px_18px_rgba(15,23,42,0.26),-2px_-2px_8px_rgba(255,255,255,0.08)] transition";
const SOFT_PANEL_CLASS = `${SOFT_SURFACE_CLASS} p-3`;
const SOFT_CARD_CLASS = `${SOFT_SURFACE_CLASS} p-2.5`;
const SOFT_SECTION_CLASS = `${SOFT_SURFACE_CLASS} flex flex-col gap-2 p-2.5`;
const SOFT_TINT_CARD_CLASS = `${SOFT_SURFACE_CLASS} border border-white/90`;
const SOFT_FLOAT_SURFACE_CLASS =
  "rounded-[24px] border border-white/58 bg-[linear-gradient(180deg,rgba(244,247,251,0.92)_0%,rgba(229,236,244,0.9)_100%)] shadow-[0_12px_28px_rgba(15,23,42,0.3),0_1px_4px_rgba(255,255,255,0.08)] backdrop-blur";
const DEFAULT_LINE_LABEL_OFFSET_X = -42;
const DEFAULT_LINE_LABEL_OFFSET_Y = -20;
const DEFAULT_ANGLE_LABEL_OFFSET_X = 0;
const DEFAULT_ANGLE_LABEL_OFFSET_Y = -16;
const DEFAULT_HKA_LABEL_OFFSET_X = 0;
const DEFAULT_HKA_LABEL_OFFSET_Y = -16;
const DEFAULT_GUIDE_LABEL_OFFSET_X = -54;
const DEFAULT_GUIDE_LABEL_OFFSET_Y = -18;
const DEFAULT_LABEL_OPACITY = 0.56;
const KNOB_START_DEG = 135;
const KNOB_SWEEP_DEG = 270;
const HKA_MODE_DEFINITIONS = {
  full: {
    key: "full",
    label: "HKA",
    modeLabel: "Full Length Standing HKA",
    points: [
      { key: "hip", shortLabel: "CFH", promptLabel: "center femoral head" },
      { key: "knee", shortLabel: "CK", promptLabel: "center knee / notch" },
      { key: "ankle", shortLabel: "CA", promptLabel: "center ankle" },
    ],
  },
  fta: {
    key: "fta",
    label: "FTA",
    modeLabel: "FTA (Fem2 + Tib1)",
    points: [
      {
        key: "femurMidshaft10cm",
        shortLabel: "Fem2",
        promptLabel: "Fem2 mid-shaft ±10 cm proximal",
      },
      {
        key: "femoralNotch",
        shortLabel: "Notch",
        promptLabel: "femoral notch",
      },
      {
        key: "tibiaMidshaft4cm",
        shortLabel: "Tib1 4",
        promptLabel: "Tib1 ±4 cm distal",
      },
      {
        key: "tibiaMidshaft10cm",
        shortLabel: "Tib1 10",
        promptLabel: "Tib1 ±10 cm distal",
      },
    ],
  },
};
const MOBILE_IDLE_TOOL = "pan";
const MIN_FREE_CUT_POINTS = 3;
const FREE_CUT_CLOSE_RADIUS_SCREEN = 18;
const MOBILE_DOUBLE_TAP_MS = 320;
const MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN = 72;
const DEFAULT_LINE_STROKE_WIDTH = 2;
const DEFAULT_ANGLE_COLOR = "#f97316";
const DEFAULT_ANGLE_STROKE_WIDTH = 2;
const DEFAULT_HKA_LINE_COLOR = "#14b8a6";
const DEFAULT_HKA_STROKE_WIDTH = 2;
const DEFAULT_CIRCLE_STROKE_WIDTH = 2;
const DEFAULT_PLANNING_GUIDE_STROKE_WIDTH = 2;
const DEFAULT_FREE_LINE_COLOR = "#3b82f6";
const DEFAULT_LAYER_DUPLICATE_OFFSET = 18;
const DEFAULT_FREE_LINE_MODE = "freehand";
const DEFAULT_FREE_LINE_CURVE_FREEHAND = 0.16;
const DEFAULT_FREE_LINE_CURVE_POINT = 0.58;
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
const FREE_SHAPE_COLOR_OPTIONS = [
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#111827",
  "#94a3b8",
];
const HKA_COLOR_OPTIONS = [
  "#14b8a6",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#111827",
  "#94a3b8",
];
const PLANNING_GUIDE_COLOR_OPTIONS = [
  "#38bdf8",
  "#22c55e",
  "#f97316",
  "#f43f5e",
  "#eab308",
  "#a855f7",
  "#14b8a6",
  "#f59e0b",
];
const MOBILE_PANEL_PREVIEW_EVENT = "xray-mobile-panel-preview";
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
let mobilePanelPreviewTimeoutId = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function triggerMobileHaptic(pattern = 8) {
  if (typeof window === "undefined") return;
  const navigatorRef = window.navigator;
  const supportsCoarsePointer =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : false;

  if (!supportsCoarsePointer) return;
  if (!navigatorRef || typeof navigatorRef.vibrate !== "function") return;

  navigatorRef.vibrate(pattern);
}

function setMobilePanelPreview(active, durationMs = 0) {
  if (typeof window === "undefined") return;

  if (mobilePanelPreviewTimeoutId !== null) {
    window.clearTimeout(mobilePanelPreviewTimeoutId);
    mobilePanelPreviewTimeoutId = null;
  }

  window.dispatchEvent(
    new CustomEvent(MOBILE_PANEL_PREVIEW_EVENT, {
      detail: { active },
    }),
  );

  if (active && durationMs > 0) {
    mobilePanelPreviewTimeoutId = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(MOBILE_PANEL_PREVIEW_EVENT, {
          detail: { active: false },
        }),
      );
      mobilePanelPreviewTimeoutId = null;
    }, durationMs);
  }
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

function getLayerFilterValue(layer) {
  const layerContrast = clamp(Number(layer?.contrast ?? 100), 10, 300);
  const layerLevel = clamp(Number(layer?.level ?? 100), 10, 300);
  return `contrast(${layerContrast}%) brightness(${layerLevel}%)`;
}

function getLayerDefaultName(layer) {
  if (!layer) return "Layer";
  if (layer.kind === "upload") return "Template";
  if (layer.kind === "free-cut") return "Free Cut";
  if (layer.kind === "free-line") return "Free Line";
  return "Fragment";
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

function getFreeLineCurveStrength(shape) {
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

function getSmoothClosedSegmentControls(points, index, smoothness = 0) {
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

function traceSmoothClosedPath(ctx, points, smoothness = 0) {
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

function projectPointOnSegment(point, start, end) {
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
    contrast: 100,
    level: 100,
    lockScale: false,
    maskPoints: normalizedPoints.map((point) => ({
      x: point.x - width / 2,
      y: point.y - height / 2,
    })),
  };
}

function buildFreeLineLayerFromPoints({
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

function getAngleResultOpacity(angle) {
  const rawValue = Number.isFinite(angle?.resultOpacity)
    ? angle.resultOpacity
    : Number.isFinite(angle?.labelOpacity)
      ? angle.labelOpacity
      : DEFAULT_LABEL_OPACITY;
  return clamp(rawValue, 0.08, 1);
}

function getHkaLineColor(hka) {
  return hka?.lineColor || DEFAULT_HKA_LINE_COLOR;
}

function getHkaModeDefinition(mode = "full") {
  return HKA_MODE_DEFINITIONS[mode] || HKA_MODE_DEFINITIONS.full;
}

function cloneOptionalPoint(point) {
  return point ? { ...point } : null;
}

function getHkaPointEntries(hka) {
  const definition = getHkaModeDefinition(hka?.mode);
  return definition.points
    .map((pointDef) =>
      hka?.[pointDef.key]
        ? {
            ...pointDef,
            point: hka[pointDef.key],
          }
        : null,
    )
    .filter(Boolean);
}

function getAnglePointEntries(angle) {
  if (!angle) return [];
  return [
    { key: "p1", point: angle.p1 },
    { key: "p2", point: angle.p2 },
    { key: "p3", point: angle.p3 },
  ].filter((entry) => entry.point);
}

function cloneHkaItem(item) {
  const definition = getHkaModeDefinition(item?.mode);
  const cloned = {
    ...item,
    mode: definition.key,
    direction: item?.direction || "varus",
    side: item?.side || "right",
    showArc: definition.key === "full" ? item?.showArc !== false : false,
    lineColor: item?.lineColor || DEFAULT_HKA_LINE_COLOR,
    labelOffsetX: Number.isFinite(item?.labelOffsetX)
      ? item.labelOffsetX
      : DEFAULT_HKA_LABEL_OFFSET_X,
    labelOffsetY: Number.isFinite(item?.labelOffsetY)
      ? item.labelOffsetY
      : DEFAULT_HKA_LABEL_OFFSET_Y,
  };

  for (const pointDef of definition.points) {
    cloned[pointDef.key] = cloneOptionalPoint(item?.[pointDef.key]);
  }

  return cloned;
}

function getHkaDraftNotice(mode, pointsPlaced) {
  const definition = getHkaModeDefinition(mode);
  const remaining = definition.points.length - pointsPlaced;
  if (remaining <= 0) return `${definition.label} siap dibuat.`;
  return `${definition.label}: pilih ${remaining} titik lagi (${definition.points
    .slice(pointsPlaced)
    .map((item) => item.promptLabel)
    .join(" -> ")}).`;
}

function getHkaMeasurementResult(hka) {
  const mode = hka?.mode || "full";
  const definition = getHkaModeDefinition(mode);
  const isComplete = definition.points.every((pointDef) => hka?.[pointDef.key]);

  if (!isComplete) {
    return {
      mode,
      absoluteDeviation: null,
      signedDeviation: null,
      direction: hka?.direction || "varus",
      side: hka?.side || "right",
      label: mode === "fta" ? "FTA belum lengkap" : "Belum lengkap",
      modeLabel: definition.modeLabel,
      fta: null,
      predictedHka: null,
    };
  }

  if (mode === "fta") {
    const fta = calculateFTA({
      femurMidshaft10cm: hka.femurMidshaft10cm,
      femoralNotch: hka.femoralNotch,
      tibiaMidshaft4cm: hka.tibiaMidshaft4cm,
      tibiaMidshaft10cm: hka.tibiaMidshaft10cm,
    });
    const predictedHka = predictHKAAFromFTA(fta);

    return {
      mode,
      absoluteDeviation: predictedHka,
      signedDeviation: null,
      direction: hka.direction || "varus",
      side: hka.side || "right",
      label:
        fta !== null && predictedHka !== null
          ? `FTA ${fta.toFixed(1)}° -> HKAA ${predictedHka.toFixed(1)}°`
          : "FTA belum lengkap",
      modeLabel: definition.modeLabel,
      fta,
      predictedHka,
    };
  }

  const direction = hka.direction || "varus";
  const side = hka.side || "right";
  const result = calculateFullLengthHKA({
    femoralHead: hka.hip,
    kneeCenter: hka.knee,
    ankleCenter: hka.ankle,
    side,
  });
  const absoluteDeviation = result?.absoluteDeviation ?? null;
  const signedDeviation = normalizeHkaSignedDeviation(
    getHkaSignedCoronalAngle(hka.hip, hka.knee, hka.ankle),
  );

  return {
    mode,
    absoluteDeviation,
    signedDeviation,
    direction,
    side,
    label: classifyAlignment(absoluteDeviation, direction),
    modeLabel: definition.modeLabel,
    fta: null,
    predictedHka: null,
  };
}

function normalizeHkaSide(side) {
  return String(side || "").toLowerCase() === "left" ? "left" : "right";
}

function normalizeHkaSignedDeviation(rawAngle) {
  if (!Number.isFinite(rawAngle)) return null;
  let normalized = rawAngle;
  if (normalized > 90) normalized -= 180;
  if (normalized < -90) normalized += 180;
  return normalized;
}

function inferHkaDirectionFromSignedDeviation(signedDeviation, side, fallback = "varus") {
  if (!Number.isFinite(signedDeviation) || Math.abs(signedDeviation) < 0.2) {
    return fallback === "valgus" ? "valgus" : "varus";
  }
  const normalizedSide = normalizeHkaSide(side);
  const isVarus =
    normalizedSide === "right" ? signedDeviation > 0 : signedDeviation < 0;
  return isVarus ? "varus" : "valgus";
}

function inferHkaDirectionFromPoints(hip, knee, ankle, side, fallback = "varus") {
  return inferHkaDirectionFromSignedDeviation(
    normalizeHkaSignedDeviation(getHkaSignedCoronalAngle(hip, knee, ankle)),
    side,
    fallback,
  );
}

function getHkaSideLabel(side) {
  return normalizeHkaSide(side) === "left" ? "Kaki kiri" : "Kaki kanan";
}

function getHkaCanvasLabelText(measurement, expanded = false) {
  if (!measurement) return "HKA";

  if (measurement.mode === "fta") {
    if (measurement.fta === null) return "FTA";
    if (expanded && measurement.predictedHka !== null) {
      return `FTA ${measurement.fta.toFixed(1)}° | HKAA ${measurement.predictedHka.toFixed(1)}°`;
    }
    return `FTA ${measurement.fta.toFixed(1)}°`;
  }

  if (measurement.absoluteDeviation === null) return "HKA";
  const sidePrefix = normalizeHkaSide(measurement.side) === "left" ? "L" : "R";
  if (expanded) {
    return `${sidePrefix} ${measurement.label} (${measurement.absoluteDeviation.toFixed(1)}°)`;
  }
  if (measurement.absoluteDeviation < 3) {
    return `${sidePrefix} Neutral ${measurement.absoluteDeviation.toFixed(1)}°`;
  }
  return `${sidePrefix} ${
    measurement.direction === "valgus" ? "Valgus" : "Varus"
  } ${measurement.absoluteDeviation.toFixed(1)}°`;
}

function getAngleCanvasLabelText(angle, expanded = false) {
  if (!angle) return "ANGLE";
  const value = getAngleDegrees(angle.p1, angle.p2, angle.p3);
  if (!Number.isFinite(value)) return "ANGLE";
  if (expanded) {
    return `ANGLE: ${value.toFixed(1)}°`;
  }
  return `${value.toFixed(1)}°`;
}

function getCircleDiameterText(
  circle,
  mmPerPixel,
  measurementUnit = "cm",
  decimals = 1,
) {
  if (!circle) return "-";
  if (mmPerPixel !== null) {
    const diameterMm = circle.radius * 2 * mmPerPixel;
    return measurementUnit === "cm"
      ? `${(diameterMm / 10).toFixed(decimals)} ${measurementUnit}`
      : `${diameterMm.toFixed(decimals)} ${measurementUnit}`;
  }
  return `${(circle.radius * 2).toFixed(decimals)} px`;
}

function getCircleCanvasLabelText(
  circle,
  mmPerPixel,
  measurementUnit = "cm",
  expanded = false,
) {
  if (!circle) return "DIA";
  if (circle.source === "centerFinder") {
    return expanded
      ? `CTR | DIA: ${getCircleDiameterText(circle, mmPerPixel, measurementUnit, 2)}`
      : "CTR";
  }
  return expanded
    ? `DIA: ${getCircleDiameterText(circle, mmPerPixel, measurementUnit, 2)}`
    : `DIA ${getCircleDiameterText(circle, mmPerPixel, measurementUnit, 1)}`;
}

function getAngleArcGeometry(a, vertex, b) {
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

function transformLayerLocalPoint(layer, point) {
  const flippedX = layer.flipX ? -point.x : point.x;
  const flippedY = layer.flipY ? -point.y : point.y;
  const rotated = rotateVector(flippedX, flippedY, layer.rotation);
  return {
    x: layer.centerX + rotated.x,
    y: layer.centerY + rotated.y,
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
    handleInX: Number.isFinite(point?.handleInX)
      ? point.handleInX * scaleX
      : undefined,
    handleInY: Number.isFinite(point?.handleInY)
      ? point.handleInY * scaleY
      : undefined,
    handleOutX: Number.isFinite(point?.handleOutX)
      ? point.handleOutX * scaleX
      : undefined,
    handleOutY: Number.isFinite(point?.handleOutY)
      ? point.handleOutY * scaleY
      : undefined,
  }));
}

function getFreeLineVertexPoints(layer) {
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

function getFreeLineLocalHandlePair(layer, pointIndex) {
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

function getFreeLineCurveRadius(layer, pointIndex) {
  const handlePair = getFreeLineLocalHandlePair(layer, pointIndex);
  if (!handlePair) return 0;

  const handleInDistance = getDistance(handlePair.point, handlePair.handleIn);
  const handleOutDistance = getDistance(handlePair.point, handlePair.handleOut);
  const meanDistance = (handleInDistance + handleOutDistance) / 2;
  return clamp(meanDistance || handlePair.autoRadius || 0, 8, 120);
}

function getFreeLineCurveHandles(layer, pointIndex) {
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

function toLayerMaskPoint(point, layer) {
  const local = toLayerShapeLocal(point, layer);
  const size = getLayerDisplaySize(layer);
  const sourceWidth = Math.max(1, layer.sourceWidth || size.width);
  const sourceHeight = Math.max(1, layer.sourceHeight || size.height);
  return {
    x: clamp(
      local.x * (sourceWidth / Math.max(1, size.width)),
      -sourceWidth / 2,
      sourceWidth / 2,
    ),
    y: clamp(
      local.y * (sourceHeight / Math.max(1, size.height)),
      -sourceHeight / 2,
      sourceHeight / 2,
    ),
  };
}

function cloneMaskPoint(point) {
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

function applyFreeLineCurveRadiusToPoint(layer, pointIndex, radius) {
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

function getLayerMaskScreenPoints(layer) {
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

function getLayerBounds(layer) {
  const corners = getLayerCorners(layer);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

function reorderLayerStack(layers, layerIds, placement) {
  const selectedSet = new Set(layerIds);
  if (!selectedSet.size) return layers;

  if (placement === "back") {
    const selected = layers.filter((layer) => selectedSet.has(layer.id));
    const rest = layers.filter((layer) => !selectedSet.has(layer.id));
    return [...selected, ...rest];
  }

  if (placement === "front") {
    const rest = layers.filter((layer) => !selectedSet.has(layer.id));
    const selected = layers.filter((layer) => selectedSet.has(layer.id));
    return [...rest, ...selected];
  }

  const next = [...layers];
  if (placement === "up") {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (
        selectedSet.has(next[index].id) &&
        !selectedSet.has(next[index + 1].id)
      ) {
        const current = next[index];
        next[index] = next[index + 1];
        next[index + 1] = current;
      }
    }
    return next;
  }

  if (placement === "down") {
    for (let index = 1; index < next.length; index += 1) {
      if (
        selectedSet.has(next[index].id) &&
        !selectedSet.has(next[index - 1].id)
      ) {
        const current = next[index];
        next[index] = next[index - 1];
        next[index - 1] = current;
      }
    }
  }

  return next;
}

function getLayerControlPoints(layer) {
  const size = getLayerDisplaySize(layer);
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  const rotateOffset = Math.max(30, Math.min(54, halfH * 0.24 + 18));
  const points = [
    { key: "tl", x: -halfW, y: -halfH, type: "corner" },
    { key: "tm", x: 0, y: -halfH, type: "edge" },
    { key: "tr", x: halfW, y: -halfH, type: "corner" },
    { key: "mr", x: halfW, y: 0, type: "edge" },
    { key: "br", x: halfW, y: halfH, type: "corner" },
    { key: "bm", x: 0, y: halfH, type: "edge" },
    { key: "bl", x: -halfW, y: halfH, type: "corner" },
    { key: "ml", x: -halfW, y: 0, type: "edge" },
    { key: "rotate", x: 0, y: halfH + rotateOffset, type: "rotate" },
  ];

  return points.map((point) => {
    const rotated = rotateVector(point.x, point.y, layer.rotation);
    return {
      key: point.key,
      type: point.type,
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

function getSegmentMidpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function getCircumcircleFromThreePoints(a, b, c) {
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

function buildAxisLineFromPoints(points) {
  if (!Array.isArray(points) || points.length < 4) return null;
  const proximalMid = getSegmentMidpoint(points[0], points[1]);
  const distalMid = getSegmentMidpoint(points[2], points[3]);
  if (Math.hypot(distalMid.x - proximalMid.x, distalMid.y - proximalMid.y) < 2) {
    return null;
  }
  return {
    x1: proximalMid.x,
    y1: proximalMid.y,
    x2: distalMid.x,
    y2: distalMid.y,
  };
}

function buildGuideLineFromReference(referenceLine, throughPoint, mode = "parallel") {
  if (!referenceLine || !throughPoint) return null;
  const dx = referenceLine.x2 - referenceLine.x1;
  const dy = referenceLine.y2 - referenceLine.y1;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return null;

  let ux = dx / length;
  let uy = dy / length;
  if (mode === "perpendicular") {
    const nextUx = -uy;
    const nextUy = ux;
    ux = nextUx;
    uy = nextUy;
  }

  const halfLength = Math.max(18, length * 0.5);
  return {
    x1: throughPoint.x - ux * halfLength,
    y1: throughPoint.y - uy * halfLength,
    x2: throughPoint.x + ux * halfLength,
    y2: throughPoint.y + uy * halfLength,
  };
}

function getSegmentIntersectionPoint(a, b) {
  const x1 = a.x1;
  const y1 = a.y1;
  const x2 = a.x2;
  const y2 = a.y2;
  const x3 = b.x1;
  const y3 = b.y1;
  const x4 = b.x2;
  const y4 = b.y2;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denominator) < 1e-6) return null;

  const determinantA = x1 * y2 - y1 * x2;
  const determinantB = x3 * y4 - y3 * x4;
  const px =
    (determinantA * (x3 - x4) - (x1 - x2) * determinantB) / denominator;
  const py =
    (determinantA * (y3 - y4) - (y1 - y2) * determinantB) / denominator;

  const withinSegment = (value, start, end) =>
    value >= Math.min(start, end) - 1e-4 && value <= Math.max(start, end) + 1e-4;

  if (
    !withinSegment(px, x1, x2) ||
    !withinSegment(py, y1, y2) ||
    !withinSegment(px, x3, x4) ||
    !withinSegment(py, y3, y4)
  ) {
    return null;
  }

  return { x: px, y: py };
}

function projectPointToInfiniteLine(point, line) {
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

function getCircleTangentPointsFromExternalPoint(point, circle) {
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

function normalizeSnapSettings(settings) {
  return {
    endpoint: settings?.endpoint !== false,
    midpoint: settings?.midpoint !== false,
    intersection: settings?.intersection !== false,
    center: settings?.center !== false,
    tangent: Boolean(settings?.tangent),
    perpendicular: Boolean(settings?.perpendicular),
    shiftOnlyDesktop: Boolean(settings?.shiftOnlyDesktop),
  };
}

function getSnapTypeShortLabel(type) {
  if (type === "midpoint") return "MID";
  if (type === "intersection") return "X";
  if (type === "center") return "CTR";
  if (type === "tangent") return "TAN";
  if (type === "perpendicular") return "PERP";
  return "END";
}

function getSnapTargetSignature(target) {
  if (!target) return "none";
  const round = (value) =>
    Number.isFinite(value) ? Number(value).toFixed(2) : "";
  const sourceRefs = Array.isArray(target.sourceRefs)
    ? target.sourceRefs.join(",")
    : "";
  const hintSegments = Array.isArray(target.hintSegments)
    ? target.hintSegments
        .map(
          (segment) =>
            `${round(segment.x1)}:${round(segment.y1)}:${round(segment.x2)}:${round(segment.y2)}`,
        )
        .join("|")
    : "";

  return [
    target.type || "",
    round(target.x),
    round(target.y),
    sourceRefs,
    hintSegments,
  ].join(";");
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

function fillCircleMarkers(ctx, markers) {
  for (const marker of markers) {
    if (!marker) continue;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function strokeCircleMarkers(ctx, markers) {
  for (const marker of markers) {
    if (!marker) continue;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
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
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-slate-500 ${SOFT_RAISED_CLASS}`}
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
            className={`pointer-events-none absolute top-[120%] left-1/2 z-30 w-56 -translate-x-1/2 px-3 py-2 text-[11px] leading-snug text-slate-600 ${SOFT_SURFACE_CLASS}`}
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
  freeLine: Spline,
  pan: HandGrab,
  cut: Slice,
  centerFinder: Target,
  axisBuilder: Bone,
  guideBuilder: RulerDimensionLine,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  fit: Maximize2,
  rotateLeft: RotateCcw,
  rotateRight: RotateCw,
  flipH: FlipHorizontal2,
  flipV: FlipVertical2,
  resetCrop: Crop,
  preset: RulerDimensionLine,
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
  eye: Eye,
  eyeOff: EyeOff,
  settings: SlidersHorizontal,
  angle: DraftingCompass,
  circle: CircleDot,
  hka: ChartSpline,
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

const HIP_FUNCTION_SUMMARY_ITEMS = [
  {
    key: "offset",
    label: "Offset",
    shortLabel: "Offset umum",
    activeClass: "text-rose-700",
    detail:
      "Preset garis offset umum untuk membandingkan jarak antar landmark sesuai kebutuhan templating.",
    notice: "Gambar line pada landmark yang ingin dibandingkan.",
  },
  {
    key: "femoralOffset",
    label: "F-Offset",
    shortLabel: "Femoral offset",
    activeClass: "text-emerald-700",
    detail:
      "Femoral offset mengukur jarak lateral center femoral head terhadap axis femur. Ini dipakai untuk menilai restoration offset femur.",
    notice:
      "Pakai untuk mengukur jarak lateral head center terhadap axis femur.",
  },
  {
    key: "globalOffset",
    label: "G-Offset",
    shortLabel: "Global offset",
    activeClass: "text-violet-700",
    detail:
      "Global offset mengukur kombinasi offset femur dan acetabulum/pelvis. Ini dipakai untuk menilai keseimbangan offset total hip.",
    notice:
      "Pakai untuk membandingkan offset total dari pelvis/acetabulum sampai femur.",
  },
  {
    key: "lld",
    label: "LLD",
    shortLabel: "Leg length",
    activeClass: "text-orange-700",
    detail:
      "LLD mengukur leg length discrepancy, yaitu beda panjang tungkai kiri-kanan dari garis referensi pelvis atau landmark yang dipilih.",
    notice:
      "Pakai untuk mengukur beda panjang tungkai dari referensi pelvis atau landmark yang dipilih.",
  },
];

const HIP_FUNCTION_SUMMARY_BY_KEY = HIP_FUNCTION_SUMMARY_ITEMS.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {},
);

function HipFunctionSummaryPanel({
  className = "",
  compact = false,
  defaultExpanded = false,
  title = "Ringkasan Fungsi HIP",
}) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <details
      className={`${SOFT_INSET_CLASS} px-3 py-2 text-slate-700 ${className}`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-extrabold tracking-wide text-slate-700 uppercase [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon name="target" className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
          <span className="truncate">{title}</span>
        </span>
        <span className={`${SOFT_RAISED_CLASS} shrink-0 px-2 py-1 text-[9px] font-bold text-cyan-700`}>
          Info
        </span>
      </summary>
      <div
        className={`mt-2 grid gap-1.5 ${
          compact ? "grid-cols-1" : "sm:grid-cols-2"
        }`}
      >
        {HIP_FUNCTION_SUMMARY_ITEMS.map((item) => (
          <div
            key={`hip-summary-${item.key}`}
            className={`${SOFT_SURFACE_CLASS} px-2.5 py-2`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-extrabold ${item.activeClass}`}>
                {item.label}
              </span>
              <span className="truncate text-[9px] font-bold text-slate-500">
                {item.shortLabel}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-slate-600">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

function getSoftToneClass(tone = "slate", active = false) {
  const toneClass =
    tone === "emerald"
      ? active
        ? "text-emerald-700"
        : "text-emerald-600 hover:text-emerald-700"
      : tone === "rose"
        ? active
          ? "text-rose-700"
          : "text-rose-600 hover:text-rose-700"
        : tone === "amber"
          ? active
            ? "text-amber-700"
            : "text-amber-600 hover:text-amber-700"
          : active
            ? "text-slate-800"
            : "text-slate-500 hover:text-slate-700";

  return `${active ? SOFT_PRESSED_CLASS : SOFT_RAISED_CLASS} ${toneClass}`;
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
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={() => {
        if (!disabled) triggerMobileHaptic();
      }}
      aria-label={label}
      title={label}
      disabled={disabled}
      whileHover={disabled ? undefined : BUTTON_HOVER}
      whileTap={disabled ? undefined : BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-10 w-10 items-center justify-center transition sm:h-9 sm:w-9 ${getSoftToneClass(
        tone,
        active,
      )} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      <Icon name={icon} className="h-[18px] w-[18px]" />
    </motion.button>
  );
}

function LayerToolbarActionButton({
  icon,
  label,
  onClick,
  active = false,
  className = "",
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={() => triggerMobileHaptic()}
      aria-label={label}
      title={label}
      whileHover={BUTTON_HOVER}
      whileTap={BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-8 w-8 items-center justify-center transition ${getSoftToneClass(
        "slate",
        active,
      )} ${className}`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </motion.button>
  );
}

const TOOL_ICON_COMPONENTS = {
  draw: PencilLine,
  freeLine: Spline,
  pan: HandGrab,
  cut: Slice,
  centerFinder: Target,
  axisBuilder: Bone,
  guideBuilder: RulerDimensionLine,
  angle: DraftingCompass,
  circle: CircleDot,
  hka: ChartSpline,
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

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={() => {
        if (!disabled) triggerMobileHaptic();
      }}
      aria-label={label}
      title={label}
      disabled={disabled}
      whileHover={disabled ? undefined : BUTTON_HOVER}
      whileTap={disabled ? undefined : BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-10 w-10 items-center justify-center transition sm:h-9 sm:w-9 ${getSoftToneClass(
        "slate",
        active,
      )} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
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
      onPointerDown={() => triggerMobileHaptic()}
      aria-label={label}
      title={label}
      whileHover={BUTTON_HOVER}
      whileTap={BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-8 w-8 items-center justify-center border-0 transition ${
        active ? SOFT_PRESSED_CLASS : SOFT_RAISED_CLASS
      }`}
    >
      <span
        className="h-[18px] w-[18px] rounded-full border border-white/70"
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
  controlStyle = "knob",
}) {
  const knobRef = useRef(null);
  const [isKnobDragging, setIsKnobDragging] = useState(false);
  const [canUseMobilePreview, setCanUseMobilePreview] = useState(false);
  const [isPreviewOverlayForced, setIsPreviewOverlayForced] = useState(false);
  const previewOverlayTimeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(
      "(max-width: 1023px) and (pointer: coarse)",
    );
    const update = () => setCanUseMobilePreview(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(
    () => () => {
      if (previewOverlayTimeoutRef.current !== null) {
        window.clearTimeout(previewOverlayTimeoutRef.current);
      }
    },
    [],
  );

  const forcePreviewOverlay = useCallback(
    (durationMs = 120) => {
      if (!canUseMobilePreview || typeof window === "undefined") return;
      if (previewOverlayTimeoutRef.current !== null) {
        window.clearTimeout(previewOverlayTimeoutRef.current);
      }
      setMobilePanelPreview(true, durationMs);
      setIsPreviewOverlayForced(true);
      previewOverlayTimeoutRef.current = window.setTimeout(() => {
        setIsPreviewOverlayForced(false);
        previewOverlayTimeoutRef.current = null;
      }, durationMs);
    },
    [canUseMobilePreview],
  );

  const emitValueChange = useCallback(
    (nextValue) => {
      onChange?.({
        target: {
          value: String(nextValue),
        },
      });
    },
    [onChange],
  );

  const updateKnobValueFromPoint = useCallback(
    (clientX, clientY) => {
      if (!knobRef.current || disabled) return;
      const rect = knobRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const normalizedAngle = (angleDeg + 360) % 360;
      const relative = (normalizedAngle - KNOB_START_DEG + 360) % 360;
      const clampedRelative =
        relative <= KNOB_SWEEP_DEG
          ? relative
          : 360 - relative < relative - KNOB_SWEEP_DEG
            ? 0
            : KNOB_SWEEP_DEG;
      const ratio = clamp(clampedRelative / KNOB_SWEEP_DEG, 0, 1);
      const rawValue = min + ratio * (max - min);
      const snappedValue = min + Math.round((rawValue - min) / step) * step;
      const safeValue = clamp(Number(snappedValue.toFixed(4)), min, max);
      emitValueChange(safeValue);
    },
    [disabled, emitValueChange, max, min, step],
  );

  useEffect(() => {
    if (!isKnobDragging) return undefined;

    const handlePointerMove = (event) => {
      updateKnobValueFromPoint(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      setIsKnobDragging(false);
      setMobilePanelPreview(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isKnobDragging, updateKnobValueFromPoint]);

  const knobRatio = clamp(
    (Number(value) - min) / Math.max(max - min, 0.0001),
    0,
    1,
  );
  const knobAngle = KNOB_START_DEG + knobRatio * KNOB_SWEEP_DEG;
  const knobRad = (knobAngle * Math.PI) / 180;
  const knobDotRadius = 18;
  const knobDotX = 44 + Math.cos(knobRad) * knobDotRadius;
  const knobDotY = 44 + Math.sin(knobRad) * knobDotRadius;
  const showPreviewOverlay =
    canUseMobilePreview && (isKnobDragging || isPreviewOverlayForced);

  const handleStepDecrease = useCallback(() => {
    if (disabled) return;
    onDecrease?.();
    forcePreviewOverlay();
  }, [disabled, forcePreviewOverlay, onDecrease]);

  const handleStepIncrease = useCallback(() => {
    if (disabled) return;
    onIncrease?.();
    forcePreviewOverlay();
  }, [disabled, forcePreviewOverlay, onIncrease]);

  const controlContent = (
    <div
      className={`px-3 py-2.5 ${
        showPreviewOverlay
          ? "rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,rgba(248,250,252,0.34)_0%,rgba(237,242,247,0.26)_100%)] shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur-xl"
          : SOFT_SURFACE_CLASS
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[12px] text-slate-700">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">{valueText}</span>
      </div>
      {controlStyle === "knob" ? (
        <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-end gap-3">
          <div className="flex items-center gap-2 pb-1">
            <IconButton
              icon={decreaseIcon}
              label={`${label} kurang`}
              onClick={handleStepDecrease}
              disabled={disabled}
              className="h-10 w-10 shrink-0"
            />
            <IconButton
              icon={increaseIcon}
              label={`${label} tambah`}
              onClick={handleStepIncrease}
              disabled={disabled}
              className="h-10 w-10 shrink-0"
            />
          </div>
          <div />
          <div
            ref={knobRef}
            onPointerDown={(event) => {
              if (disabled) return;
              event.preventDefault();
              setMobilePanelPreview(true);
              setIsKnobDragging(true);
              updateKnobValueFromPoint(event.clientX, event.clientY);
            }}
            className={`relative h-[88px] w-[88px] shrink-0 touch-none ${
              disabled
                ? "cursor-not-allowed opacity-45"
                : "cursor-grab active:cursor-grabbing"
            }`}
            role="slider"
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={Number(value)}
            tabIndex={disabled ? -1 : 0}
          >
            {Array.from({ length: 16 }).map((_, index) => {
              const ratio = index / 15;
              const tickAngle =
                (KNOB_START_DEG + ratio * KNOB_SWEEP_DEG) * (Math.PI / 180);
              const tickX = 44 + Math.cos(tickAngle) * 42;
              const tickY = 44 + Math.sin(tickAngle) * 42;
              return (
                <span
                  key={`${label}-tick-${index}`}
                  className="absolute h-3 w-px rounded-full bg-slate-300/80"
                  style={{
                    left: tickX,
                    top: tickY,
                    transform: `translate(-50%, -50%) rotate(${KNOB_START_DEG + ratio * KNOB_SWEEP_DEG + 90}deg)`,
                    opacity: index % 5 === 0 ? 1 : 0.7,
                  }}
                />
              );
            })}
            <div
              className={`absolute inset-0 rounded-full ${SOFT_RAISED_CLASS}`}
            />
            <div
              className={`absolute inset-[8px] rounded-full ${SOFT_INSET_CLASS}`}
            />
            <div
              className={`absolute inset-[16px] rounded-full ${SOFT_SURFACE_CLASS}`}
            />
            <span
              className={`absolute h-6 w-6 rounded-full border border-slate-300/70 ${SOFT_RAISED_CLASS}`}
              style={{
                left: knobDotX,
                top: knobDotY,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <IconButton
            icon={decreaseIcon}
            label={`${label} kurang`}
            onClick={handleStepDecrease}
            disabled={disabled}
            className="h-10 w-10 shrink-0"
          />
          <div className={`${SOFT_INSET_CLASS} flex min-w-0 flex-1 px-2 py-2`}>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={onChange}
              disabled={disabled}
              className="min-w-0 flex-1 accent-slate-400 disabled:cursor-not-allowed disabled:opacity-45"
            />
          </div>
          <IconButton
            icon={increaseIcon}
            label={`${label} tambah`}
            onClick={handleStepIncrease}
            disabled={disabled}
            className="h-10 w-10 shrink-0"
          />
        </div>
      )}
    </div>
  );

  if (showPreviewOverlay && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+116px)] left-3 z-[85]">
        {controlContent}
      </div>,
      document.body,
    );
  }

  return controlContent;
}

export default function XrayCalibrationWorkspace({
  simpleUiMode = false,
  onOpenSimpleUi,
  onOpenAdvancedUi,
} = {}) {
  const isSimpleUiMode = Boolean(simpleUiMode);
  const containerRef = useRef(null);
  const calibrationPanelRef = useRef(null);
  const compareContainerRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const compareCanvasRef = useRef(null);
  const mainUploadInputRef = useRef(null);
  const layerUploadInputRef = useRef(null);
  const compareUploadInputRef = useRef(null);
  const measurePanelRef = useRef(null);
  const layerSettingsPanelRef = useRef(null);
  const exportPanelRef = useRef(null);
  const interactionRef = useRef({ mode: null, startX: 0, startY: 0 });
  const interactionCanvasRectRef = useRef(null);
  const activePointerIdRef = useRef(null);
  const activeSnapTargetRef = useRef(null);
  const activeSnapTargetSignatureRef = useRef(getSnapTargetSignature(null));
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
  const measureLegendPreferenceLoadedRef = useRef(false);
  const snapModifierPressedRef = useRef(false);
  const autoFitSignatureRef = useRef("");

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
  const [draftCenterFinderPoints, setDraftCenterFinderPoints] = useState([]);
  const [draftAxisBuilderPoints, setDraftAxisBuilderPoints] = useState([]);
  const [guideBuilderMode, setGuideBuilderMode] = useState("parallel");
  const [guideBuilderPreviewPoint, setGuideBuilderPreviewPoint] =
    useState(null);
  const [toolConfigModal, setToolConfigModal] = useState(null);
  const [layerSettingsTab, setLayerSettingsTab] = useState("transform");
  const [hkaSets, setHkaSets] = useState([]);
  const [draftHkaPoints, setDraftHkaPoints] = useState([]);
  const [draftCut, setDraftCut] = useState(null);
  const [draftFreeLine, setDraftFreeLine] = useState(null);
  const [freeLineMode, setFreeLineMode] = useState(DEFAULT_FREE_LINE_MODE);
  const [draftFreeLineTargetLayerId, setDraftFreeLineTargetLayerId] =
    useState(null);
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
  const [snapSettings, setSnapSettings] = useState(DEFAULT_SNAP_SETTINGS);
  const [activeSnapTarget, setActiveSnapTarget] = useState(null);
  const [snapModifierPressed, setSnapModifierPressed] = useState(false);
  const [selectedCutLayerId, setSelectedCutLayerId] = useState(null);
  const [selectedCutLayerExtraIds, setSelectedCutLayerExtraIds] = useState([]);
  const [selectedFreeLinePointIndex, setSelectedFreeLinePointIndex] =
    useState(null);
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
  const [hkaInputMode, setHkaInputMode] = useState("full");
  const [hkaSide, setHkaSide] = useState("right");
  const [measureAnatomyTab, setMeasureAnatomyTab] = useState("knee");
  const [showMeasureLegend, setShowMeasureLegend] = useState(false);
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
  const [mobilePanelPreviewActive, setMobilePanelPreviewActive] =
    useState(false);
  const [mobileHandleAssist, setMobileHandleAssist] = useState(null);
  const [mobileAngleHandleAssist, setMobileAngleHandleAssist] = useState(null);
  const [mobileHkaHandleAssist, setMobileHkaHandleAssist] = useState(null);
  const [mobilePlanningGuideHandleAssist, setMobilePlanningGuideHandleAssist] =
    useState(null);
  const [selectionPulse, setSelectionPulse] = useState(null);
  const [hoveredMeasurementInfo, setHoveredMeasurementInfo] = useState(null);
  const [showLayerToolbarName, setShowLayerToolbarName] = useState(true);
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
  const [simpleCalibrationModalOpen, setSimpleCalibrationModalOpen] =
    useState(false);
  const [simpleLayerDropdownOpen, setSimpleLayerDropdownOpen] =
    useState(false);
  const [simplePlanningModal, setSimplePlanningModal] = useState(null);
  const [simpleGuideModalOpen, setSimpleGuideModalOpen] = useState(false);
  const [hkaSideModalOpen, setHkaSideModalOpen] = useState(false);
  const [simpleMobilePanel, setSimpleMobilePanel] = useState(null);
  const [simpleQuickPanelMinimized, setSimpleQuickPanelMinimized] =
    useState(false);
  const [simpleToolPanelMinimized, setSimpleToolPanelMinimized] =
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

  useEffect(() => {
    if (isSimpleUiMode && isMobileViewport) return;
    setSimpleMobilePanel(null);
  }, [isMobileViewport, isSimpleUiMode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleMobilePanelPreview = (event) => {
      setMobilePanelPreviewActive(Boolean(event?.detail?.active));
    };

    window.addEventListener(
      MOBILE_PANEL_PREVIEW_EVENT,
      handleMobilePanelPreview,
    );
    return () =>
      window.removeEventListener(
        MOBILE_PANEL_PREVIEW_EVENT,
        handleMobilePanelPreview,
      );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateShiftState = (nextValue) => {
      snapModifierPressedRef.current = nextValue;
      setSnapModifierPressed(nextValue);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Shift") {
        updateShiftState(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === "Shift") {
        updateShiftState(false);
      }
    };

    const handleWindowBlur = () => {
      updateShiftState(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const shouldUseMobileOneShotTool = isMobileViewport && isCoarsePointer;

  const getIdleTool = useCallback(() => MOBILE_IDLE_TOOL, []);
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
  useEffect(() => {
    if (!selectedHka?.mode) return;
    setHkaInputMode(selectedHka.mode);
    setHkaSide(normalizeHkaSide(selectedHka.side));
  }, [selectedHka?.id, selectedHka?.mode, selectedHka?.side]);
  const selectedCutLayer = useMemo(
    () => cutLayers.find((layer) => layer.id === selectedCutLayerId) || null,
    [cutLayers, selectedCutLayerId],
  );
  useEffect(() => {
    setSelectedCutLayerExtraIds((prev) => {
      if (selectedCutLayerId === null) {
        return prev.length ? [] : prev;
      }
      const validLayerIds = new Set(cutLayers.map((layer) => layer.id));
      const next = prev.filter(
        (layerId) =>
          layerId !== selectedCutLayerId && validLayerIds.has(layerId),
      );
      return next.length === prev.length ? prev : next;
    });
  }, [cutLayers, selectedCutLayerId]);
  const selectedCutLayerIds = useMemo(() => {
    if (selectedCutLayerId === null) return [];
    const validLayerIds = new Set(cutLayers.map((layer) => layer.id));
    return [
      selectedCutLayerId,
      ...selectedCutLayerExtraIds.filter(
        (layerId) =>
          layerId !== selectedCutLayerId && validLayerIds.has(layerId),
      ),
    ];
  }, [cutLayers, selectedCutLayerExtraIds, selectedCutLayerId]);
  const selectedCutLayerIdsSet = useMemo(
    () => new Set(selectedCutLayerIds),
    [selectedCutLayerIds],
  );
  const selectedCutLayers = useMemo(
    () => cutLayers.filter((layer) => selectedCutLayerIdsSet.has(layer.id)),
    [cutLayers, selectedCutLayerIdsSet],
  );
  const selectedPlanningGuide = useMemo(
    () =>
      planningGuides.find((guide) => guide.id === selectedPlanningGuideId) ||
      null,
    [planningGuides, selectedPlanningGuideId],
  );
  const guideBuilderReference = useMemo(() => {
    if (selectedLine) {
      return {
        kind: "line",
        id: selectedLine.id,
        label: `Line #${selectedLine.id}`,
        line: {
          x1: selectedLine.x1,
          y1: selectedLine.y1,
          x2: selectedLine.x2,
          y2: selectedLine.y2,
        },
      };
    }
    if (selectedPlanningGuide) {
      const guideIndex =
        planningGuides.findIndex(
          (guide) => guide.id === selectedPlanningGuide.id,
        ) + 1;
      const guideLabel =
        selectedPlanningGuide.kind === "valgusCut"
          ? `DC${guideIndex}`
          : selectedPlanningGuide.kind === "tibialSlope"
            ? `TS${guideIndex}`
            : `TC${guideIndex}`;
      return {
        kind: "planning",
        id: selectedPlanningGuide.id,
        label: guideLabel,
        line: {
          x1: selectedPlanningGuide.anchorStart.x,
          y1: selectedPlanningGuide.anchorStart.y,
          x2: selectedPlanningGuide.anchorEnd.x,
          y2: selectedPlanningGuide.anchorEnd.y,
        },
      };
    }
    return null;
  }, [planningGuides, selectedLine, selectedPlanningGuide]);
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
  const selectedCutLayerGroupId = useMemo(() => {
    if (selectedCutLayers.length === 0) return null;
    const groupIds = [
      ...new Set(
        selectedCutLayers
          .map((layer) => layer.groupId)
          .filter((groupId) => Boolean(groupId)),
      ),
    ];
    return groupIds.length === 1 ? groupIds[0] : null;
  }, [selectedCutLayers]);
  const hasLayerMultiSelection = selectedCutLayerIds.length > 1;
  const selectedLayerStackRangeLabel = useMemo(() => {
    if (!selectedCutLayerIds.length) return "-";
    if (!hasLayerMultiSelection && selectedCutLayer) {
      return `#${selectedCutLayer.id} (${selectedCutLayerIndex + 1}/${cutLayers.length})`;
    }
    return `${selectedCutLayerIds.length} layer`;
  }, [
    cutLayers.length,
    hasLayerMultiSelection,
    selectedCutLayer,
    selectedCutLayerIds.length,
    selectedCutLayerIndex,
  ]);
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
      contrast: Math.round(
        clamp(Number(selectedCutLayer.contrast ?? 100), 10, 300),
      ),
      level: Math.round(clamp(Number(selectedCutLayer.level ?? 100), 10, 300)),
      rotation: Math.round(
        normalizedRotation > 180
          ? normalizedRotation - 360
          : normalizedRotation,
      ),
      curveStrength: Math.round(
        getFreeLineCurveStrength(selectedCutLayer) * 100,
      ),
      width: layerWidth,
      widthMax: Math.max(200, Math.round(modelWidth * 2) || 200),
      widthMm: mmPerPixel !== null ? layerWidth * mmPerPixel : null,
      heightMm: mmPerPixel !== null ? layerHeight * mmPerPixel : null,
    };
  }, [mmPerPixel, modelHeight, modelWidth, selectedCutLayer]);
  const selectedFreeLineCurveRadius = useMemo(() => {
    if (
      !selectedCutLayer ||
      selectedCutLayer.kind !== "free-line" ||
      selectedFreeLinePointIndex === null
    ) {
      return null;
    }
    return Math.round(
      getFreeLineCurveRadius(selectedCutLayer, selectedFreeLinePointIndex),
    );
  }, [selectedCutLayer, selectedFreeLinePointIndex]);
  const getPlanningGuideAutoColor = useCallback((guide) => {
    if (!guide) return "#38bdf8";
    if (guide.kind === "valgusCut") {
      return guide.side === "Left" ? "#f97316" : "#38bdf8";
    }
    if (guide.kind === "tibialSlope") {
      return guide.posteriorSide === "Left" ? "#f43f5e" : "#14b8a6";
    }
    return guide.direction === "Varus" ? "#a855f7" : "#eab308";
  }, []);
  const selectedPlanningGuideColor = useMemo(
    () =>
      selectedPlanningGuide?.color ||
      getPlanningGuideAutoColor(selectedPlanningGuide),
    [getPlanningGuideAutoColor, selectedPlanningGuide],
  );
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
      resultOpacity: Math.round(getAngleResultOpacity(selectedAngle) * 100),
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
  const selectedHkaMetrics = useMemo(() => {
    if (!selectedHka) return null;

    const measurement = getHkaMeasurementResult(selectedHka);
    return {
      mode: measurement.mode,
      modeLabel: measurement.modeLabel,
      lineColor: getHkaLineColor(selectedHka),
      strokeWidth: Number.isFinite(selectedHka.strokeWidth)
        ? selectedHka.strokeWidth
        : DEFAULT_HKA_STROKE_WIDTH,
      showArc:
        selectedHka.mode === "full" ? selectedHka.showArc !== false : false,
      valueDeg: measurement.absoluteDeviation,
      signedDeg: measurement.signedDeviation,
      direction: measurement.direction,
      side: measurement.side,
      label: measurement.label,
      fta: measurement.fta,
      predictedHka: measurement.predictedHka,
    };
  }, [selectedHka]);
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
  const getRelatedLayerIds = useCallback(
    (layerId, { includeGroup = false } = {}) => {
      const layer = cutLayers.find((item) => item.id === layerId);
      if (!layer) return [];
      if (includeGroup && layer.groupId) {
        return cutLayers
          .filter((item) => item.groupId === layer.groupId)
          .map((item) => item.id);
      }
      return [layerId];
    },
    [cutLayers],
  );
  const selectSingleLayer = useCallback(
    (layerId, { includeGroup = false } = {}) => {
      const layerIds = getRelatedLayerIds(layerId, { includeGroup });
      setSelectedCutLayerId(layerId);
      setSelectedCutLayerExtraIds(layerIds.filter((item) => item !== layerId));
    },
    [getRelatedLayerIds],
  );
  const toggleLayerSelection = useCallback(
    (layerId, { includeGroup = false } = {}) => {
      const targetIds = getRelatedLayerIds(layerId, { includeGroup });
      if (!targetIds.length) return;

      const selectedSet = new Set(selectedCutLayerIds);
      const isAlreadySelected = targetIds.every((id) => selectedSet.has(id));
      if (isAlreadySelected) {
        const remaining = selectedCutLayerIds.filter(
          (id) => !targetIds.includes(id),
        );
        const nextPrimary =
          selectedCutLayerId !== null && remaining.includes(selectedCutLayerId)
            ? selectedCutLayerId
            : remaining[0] ?? null;
        setSelectedCutLayerId(nextPrimary);
        setSelectedCutLayerExtraIds(
          nextPrimary === null
            ? []
            : remaining.filter((id) => id !== nextPrimary),
        );
        return;
      }

      const mergedIds = [...selectedCutLayerIds];
      for (const targetId of targetIds) {
        if (!mergedIds.includes(targetId)) {
          mergedIds.push(targetId);
        }
      }
      const nextPrimary = selectedCutLayerId ?? layerId;
      setSelectedCutLayerId(nextPrimary);
      setSelectedCutLayerExtraIds(
        mergedIds.filter((id) => id !== nextPrimary),
      );
    },
    [getRelatedLayerIds, selectedCutLayerId, selectedCutLayerIds],
  );

  const focusLayerSettings = useCallback(
    (layerId) => {
      selectSingleLayer(layerId);
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setSelectedPlanningGuideId(null);
      setMobilePanelMode("workspace");
      if (isMobileViewport) {
        setMobileControlsOpen(true);
      }
      setActiveRightPanel("tool");
    },
    [isMobileViewport, selectSingleLayer],
  );

  const focusLayerCanvas = useCallback(
    (layerId, { openPanel = false } = {}) => {
      selectSingleLayer(layerId);
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setSelectedPlanningGuideId(null);
      setMobilePanelMode("workspace");
      if (isMobileViewport) {
        setMobileControlsOpen(openPanel);
      }
      setActiveRightPanel("tool");
    },
    [isMobileViewport, selectSingleLayer],
  );
  const openLayerSettingsModal = useCallback(
    (layerId = selectedCutLayerId, tab = "transform") => {
      if (!layerId) return;
      focusLayerSettings(layerId);
      setLayerSettingsTab(tab);
      setToolConfigModal("layerSettings");
    },
    [focusLayerSettings, selectedCutLayerId],
  );
  const openSimpleLayerDropdown = useCallback(
    (layerId = selectedCutLayerId) => {
      if (layerId) {
        focusLayerCanvas(layerId, { openPanel: false });
      }
      setSimpleLayerDropdownOpen(true);
      setNotice("Atur layer dari dropdown Layer di header.");
    },
    [focusLayerCanvas, selectedCutLayerId],
  );
  const selectLayerFromCanvas = useCallback(
    (
      layerId,
      { additive = false, includeGroup = false, openPanel = false } = {},
    ) => {
      if (additive) {
        toggleLayerSelection(layerId, { includeGroup });
      } else {
        selectSingleLayer(layerId, { includeGroup });
      }
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setSelectedPlanningGuideId(null);
      setMobilePanelMode("workspace");
      if (isMobileViewport) {
        setMobileControlsOpen(openPanel);
      }
      setActiveRightPanel("tool");
    },
    [isMobileViewport, selectSingleLayer, toggleLayerSelection],
  );

  useEffect(() => {
    if (!selectedCutLayer || selectedCutLayer.kind !== "free-line") {
      if (selectedFreeLinePointIndex !== null) {
        setSelectedFreeLinePointIndex(null);
      }
      return;
    }

    const pointCount = Array.isArray(selectedCutLayer.maskPoints)
      ? selectedCutLayer.maskPoints.length
      : 0;
    if (pointCount <= 0) {
      if (selectedFreeLinePointIndex !== null) {
        setSelectedFreeLinePointIndex(null);
      }
      return;
    }

    if (
      selectedFreeLinePointIndex !== null &&
      selectedFreeLinePointIndex >= pointCount
    ) {
      setSelectedFreeLinePointIndex(pointCount - 1);
    }
  }, [selectedCutLayer, selectedFreeLinePointIndex]);

  const clearMobileHandleAssist = useCallback(() => {
    setMobileHandleAssist(null);
  }, []);

  const activateMobileHandleAssist = useCallback((lineId, handleKey) => {
    setMobileHandleAssist({ lineId, handleKey });
  }, []);

  const clearMobileAngleHandleAssist = useCallback(() => {
    setMobileAngleHandleAssist(null);
  }, []);

  const activateMobileAngleHandleAssist = useCallback((angleId, handleKey) => {
    setMobileAngleHandleAssist({ angleId, handleKey });
  }, []);

  const clearMobileHkaHandleAssist = useCallback(() => {
    setMobileHkaHandleAssist(null);
  }, []);

  const activateMobileHkaHandleAssist = useCallback((hkaId, handleKey) => {
    setMobileHkaHandleAssist({ hkaId, handleKey });
  }, []);

  const clearMobilePlanningGuideHandleAssist = useCallback(() => {
    setMobilePlanningGuideHandleAssist(null);
  }, []);

  const triggerSelectionPulse = useCallback((type, id) => {
    if (id === null || id === undefined) return;
    setSelectionPulse({
      type,
      id,
      token: `${type}-${id}-${Date.now()}`,
    });
  }, []);

  const appendLineMeasurement = useCallback(
    (lineInput, options = {}) => {
      if (!lineInput) return null;
      const nextLine = {
        ...lineInput,
        id: nextLineIdRef.current,
        labelOffsetX: DEFAULT_LINE_LABEL_OFFSET_X,
        labelOffsetY: DEFAULT_LINE_LABEL_OFFSET_Y,
        labelOpacity: DEFAULT_LABEL_OPACITY,
        strokeWidth: Number.isFinite(lineInput.strokeWidth)
          ? lineInput.strokeWidth
          : DEFAULT_LINE_STROKE_WIDTH,
      };
      nextLineIdRef.current += 1;
      setLines((prev) => [...prev, nextLine]);
      setSelectedLineId(nextLine.id);
      setSelectedFreeLinePointIndex(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setSelectedCutLayerId(null);
      setSelectedPlanningGuideId(null);
      setActiveRightPanel("measure");
      triggerSelectionPulse("line", nextLine.id);
      if (options.mobileHandleAssistEnd && isCoarsePointer) {
        setMobileHandleAssist({ lineId: nextLine.id, handleKey: "end" });
      }
      return nextLine;
    },
    [isCoarsePointer, triggerSelectionPulse],
  );

  const appendCenterFinderCircle = useCallback(
    (circleInput) => {
      if (!circleInput) return null;
      const nextCircle = {
        ...circleInput,
        id: nextCircleIdRef.current,
        strokeWidth: Number.isFinite(circleInput.strokeWidth)
          ? circleInput.strokeWidth
          : DEFAULT_CIRCLE_STROKE_WIDTH,
        source: circleInput.source || "centerFinder",
      };
      nextCircleIdRef.current += 1;
      setCircles((prev) => [...prev, nextCircle]);
      setSelectedCircleId(nextCircle.id);
      setSelectedFreeLinePointIndex(null);
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedHkaId(null);
      setSelectedCutLayerId(null);
      setSelectedPlanningGuideId(null);
      setActiveRightPanel("measure");
      setTool("circle");
      triggerSelectionPulse("circle", nextCircle.id);
      return nextCircle;
    },
    [triggerSelectionPulse],
  );

  useEffect(() => {
    if (!selectionPulse) return undefined;

    const timeoutId = setTimeout(() => {
      setSelectionPulse((current) =>
        current?.token === selectionPulse.token ? null : current,
      );
    }, 520);

    return () => clearTimeout(timeoutId);
  }, [selectionPulse]);

  const syncMobileCanvasSelection = useCallback(
    (panel = "measure", { openPanel = false, noticeText = "" } = {}) => {
      if (!isMobileViewport) return;
      setMobilePanelMode("workspace");
      setActiveRightPanel(panel);
      setMobileControlsOpen(openPanel);
      if (noticeText) {
        setNotice(noticeText);
      }
    },
    [isMobileViewport],
  );

  const clearActiveCanvasSelection = useCallback(() => {
    setSelectedFreeLinePointIndex(null);
    setSelectedLineId(null);
    setSelectedAngleId(null);
    setSelectedCircleId(null);
    setSelectedHkaId(null);
    setSelectedCutLayerId(null);
    setSelectedCutLayerExtraIds([]);
    setSelectedPlanningGuideId(null);
    setSelectionPulse(null);
    clearMobileHandleAssist();
    clearMobileAngleHandleAssist();
    clearMobileHkaHandleAssist();
    clearMobilePlanningGuideHandleAssist();
  }, [
    clearMobileAngleHandleAssist,
    clearMobileHandleAssist,
    clearMobileHkaHandleAssist,
    clearMobilePlanningGuideHandleAssist,
    setSelectionPulse,
  ]);

  const openRelevantMobilePanel = useCallback(() => {
    if (
      selectedLineId !== null ||
      selectedPlanningGuideId !== null ||
      selectedAngleId !== null ||
      selectedCircleId !== null ||
      selectedHkaId !== null
    ) {
      setMobilePanelMode("workspace");
      setActiveRightPanel("measure");
      setMobileControlsOpen(true);
      return;
    }
    if (selectedCutLayerId !== null) {
      setMobilePanelMode("workspace");
      setActiveRightPanel("tool");
      setMobileControlsOpen(true);
      return;
    }
    setMobilePanelMode(image ? "workspace" : "setup");
    setActiveRightPanel("tool");
    setMobileControlsOpen(true);
  }, [
    image,
    selectedAngleId,
    selectedCircleId,
    selectedCutLayerId,
    selectedHkaId,
    selectedLineId,
    selectedPlanningGuideId,
  ]);

  const toggleMobileControlsPanel = useCallback(() => {
    if (mobileControlsOpen) {
      setMobileControlsOpen(false);
      return;
    }
    openRelevantMobilePanel();
  }, [mobileControlsOpen, openRelevantMobilePanel]);

  const activateMobilePlanningGuideHandleAssist = useCallback(
    (guideId, handleKey) => {
      setMobilePlanningGuideHandleAssist({ guideId, handleKey });
    },
    [],
  );

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

  const updateHkaById = useCallback((hkaId, updater) => {
    setHkaSets((prev) =>
      prev.map((item) => {
        if (item.id !== hkaId) return item;
        return typeof updater === "function"
          ? updater(item)
          : { ...item, ...updater };
      }),
    );
  }, []);

  const updateHkaSideById = useCallback(
    (hkaId, nextSide) => {
      const normalizedSide = normalizeHkaSide(nextSide);
      updateHkaById(hkaId, (item) => {
        const nextItem = { ...item, side: normalizedSide };
        if (item.mode === "full") {
          nextItem.direction = inferHkaDirectionFromPoints(
            item.hip,
            item.knee,
            item.ankle,
            normalizedSide,
            item.direction || "varus",
          );
        }
        return nextItem;
      });
      setNotice(
        `HKA diset sebagai ${getHkaSideLabel(normalizedSide)}. Label varus/valgus dihitung ulang dari orientasi sisi tersebut.`,
      );
    },
    [updateHkaById],
  );

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
  const calibrationReferenceLine = useMemo(
    () =>
      lines.find((line) => line.id === calibrationLineId) ||
      selectedLine ||
      lines.find((line) => line.type === "ruler") ||
      lines.find((line) => line.type === "normal") ||
      null,
    [calibrationLineId, lines, selectedLine],
  );
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
        title: "QC: Mode zoom",
        detail:
          safeZoomPercent === null
            ? "Isi zoom source yang valid untuk menghindari mismatch skala."
            : `Zoom source ${safeZoomPercent.toFixed(2)}%. Verifikasi ulang dengan ruler jika tersedia.`,
      };
    }

    const referenceLine = calibrationReferenceLine;
    if (!referenceLine) {
      return {
        status: "bad",
        title: "QC: Garis referensi",
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
    calibrationReferenceLine,
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
    if (type === "ruler") return "RULER";
    if (type === "axis") return "AXIS";
    if (type === "parallelGuide") return "PARA";
    if (type === "perpendicularGuide") return "PERP";
    if (type === "offset") return "OFFSET";
    if (type === "femoralOffset") return "FEM-OFF";
    if (type === "globalOffset") return "GLB-OFF";
    if (type === "lld") return "LLD";
    return "LINE";
  }, []);

  const lineTypeColor = useCallback((type) => {
    if (type === "hka") return "#06b6d4";
    if (type === "ruler") return "#22c55e";
    if (type === "axis") return "#0f766e";
    if (type === "parallelGuide") return "#0ea5e9";
    if (type === "perpendicularGuide") return "#f59e0b";
    if (type === "offset") return "#f43f5e";
    if (type === "femoralOffset") return "#10b981";
    if (type === "globalOffset") return "#8b5cf6";
    if (type === "lld") return "#f97316";
    return "#38bdf8";
  }, []);

  const getLineVisualStyle = useCallback(
    (
      line,
      {
        isSelected = false,
        isPulsing = false,
        isLocked = false,
        isCalibration = false,
        isCalibrationReference = false,
      } = {},
    ) => {
      const baseStrokeWidth = Math.max(
        1.2,
        Number.isFinite(line?.strokeWidth)
          ? line.strokeWidth
          : DEFAULT_LINE_STROKE_WIDTH,
      );
      const type = line?.type || "normal";
      let color = lineTypeColor(type);
      let dashPattern = [];

      if (type === "offset") {
        dashPattern = [10, 4];
      } else if (type === "femoralOffset") {
        dashPattern = [8, 3, 2, 3];
      } else if (type === "globalOffset") {
        dashPattern = [4, 4];
      } else if (type === "lld") {
        dashPattern = [14, 4];
      } else if (type === "axis") {
        dashPattern = [2, 4];
      } else if (type === "parallelGuide") {
        dashPattern = [12, 4];
      } else if (type === "perpendicularGuide") {
        dashPattern = [4, 5];
      }

      if (isLocked) {
        color = "#a855f7";
        dashPattern = [6, 4];
      } else if (isCalibration) {
        color = "#16a34a";
        dashPattern = [];
      } else if (isCalibrationReference) {
        color = "#0ea5e9";
        dashPattern = [];
      }

      return {
        color,
        dashPattern,
        width: baseStrokeWidth + (isSelected || isPulsing ? 0.45 : 0),
      };
    },
    [lineTypeColor],
  );

  const getPlanningGuideVisualStyle = useCallback((guide) => {
    if (guide?.kind === "valgusCut") {
      return { anchorDash: [8, 4], baseDash: [3, 4] };
    }
    if (guide?.kind === "tibialSlope") {
      return { anchorDash: [10, 4], baseDash: [2, 4] };
    }
    return { anchorDash: [6, 4], baseDash: [2, 3] };
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

  useEffect(() => {
    if (!mobileAngleHandleAssist) return;
    const stillExists = angles.some(
      (angle) => angle.id === mobileAngleHandleAssist.angleId,
    );
    if (!stillExists || selectedAngleId !== mobileAngleHandleAssist.angleId) {
      setMobileAngleHandleAssist(null);
    }
  }, [angles, mobileAngleHandleAssist, selectedAngleId]);

  useEffect(() => {
    if (!mobileHkaHandleAssist) return;
    const stillExists = hkaSets.some(
      (item) => item.id === mobileHkaHandleAssist.hkaId,
    );
    if (!stillExists || selectedHkaId !== mobileHkaHandleAssist.hkaId) {
      setMobileHkaHandleAssist(null);
    }
  }, [hkaSets, mobileHkaHandleAssist, selectedHkaId]);

  useEffect(() => {
    if (!mobilePlanningGuideHandleAssist) return;
    const stillExists = planningGuides.some(
      (guide) => guide.id === mobilePlanningGuideHandleAssist.guideId,
    );
    if (
      !stillExists ||
      selectedPlanningGuideId !== mobilePlanningGuideHandleAssist.guideId
    ) {
      setMobilePlanningGuideHandleAssist(null);
    }
  }, [
    mobilePlanningGuideHandleAssist,
    planningGuides,
    selectedPlanningGuideId,
  ]);

  const getLineLabelText = useCallback(
    (line) => {
      const lineLengthPx = getLineLength(line);
      const rulerTargetLabel =
        line.type === "ruler" && Number.isFinite(line.presetMm)
          ? line.presetMm % 10 === 0
            ? `${line.presetMm / 10} cm`
            : `${(line.presetMm / 10).toFixed(1)} cm`
          : null;
      const baseLabel =
        mmPerPixel !== null
          ? formatMeasurementFromPx(lineLengthPx)
          : rulerTargetLabel
            ? `Target ${rulerTargetLabel}`
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
        groupId: layer.groupId || null,
        rotation: layer.rotation,
        flipX: layer.flipX,
        flipY: layer.flipY,
        opacity: layer.opacity ?? 1,
        contrast: Number.isFinite(layer.contrast) ? layer.contrast : 100,
        level: Number.isFinite(layer.level) ? layer.level : 100,
        lockScale: Boolean(layer.lockScale),
        fillColor: layer.fillColor || "",
        drawMode: layer.drawMode || DEFAULT_FREE_LINE_MODE,
        curveStrength: Number.isFinite(layer.curveStrength)
          ? layer.curveStrength
          : undefined,
        isFreeLineDraftLayer: Boolean(layer.isFreeLineDraftLayer),
        imageSrc: isImageBackedLayerKind(layer.kind)
          ? layer.imageSrc || ""
          : "",
        maskPoints: Array.isArray(layer.maskPoints)
          ? layer.maskPoints.map((point) => cloneMaskPoint(point))
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
      hkaInputMode,
      hkaSide,
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
      selectedCutLayerExtraIds,
      selectedTemplateId,
      selectedImplantType,
      selectedImplantLibraryId,
      templateLibrary,
      snapToLandmarks,
      snapSettings,
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
      hkaInputMode,
      hkaSide,
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
      selectedCutLayerExtraIds,
      selectedHkaId,
      selectedImplantLibraryId,
      selectedImplantType,
      selectedLineId,
      selectedTemplateId,
      serializeCutLayers,
      snapToLandmarks,
      snapSettings,
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

  const selectedLayerToolbarAnchor = useMemo(() => {
    if (!selectedCutLayer || !viewport.width || !viewport.height) return null;
    const corners = getLayerCorners(selectedCutLayer).map((corner) =>
      imageToScreenPoint(corner.x, corner.y),
    );
    const minX = Math.min(...corners.map((point) => point.x));
    const maxX = Math.max(...corners.map((point) => point.x));
    const minY = Math.min(...corners.map((point) => point.y));
    const horizontalPadding = isMobileViewport ? 72 : 96;
    const topOffset = isMobileViewport ? 44 : 62;
    return {
      centerX: clamp(
        (minX + maxX) / 2,
        horizontalPadding,
        Math.max(horizontalPadding, viewport.width - horizontalPadding),
      ),
      topY: Math.max(10, minY - topOffset),
    };
  }, [
    imageToScreenPoint,
    isMobileViewport,
    selectedCutLayer,
    viewport.height,
    viewport.width,
  ]);

  const selectedFreeLinePointAnchor = useMemo(() => {
    if (
      !selectedCutLayer ||
      selectedCutLayer.kind !== "free-line" ||
      selectedFreeLinePointIndex === null
    ) {
      return null;
    }

    const activePoint = getFreeLineVertexPoints(selectedCutLayer).find(
      (point) => point.pointIndex === selectedFreeLinePointIndex,
    );
    if (!activePoint) return null;

    const screen = imageToScreenPoint(activePoint.x, activePoint.y);
    return {
      centerX: clamp(screen.x, 92, Math.max(92, viewport.width - 92)),
      topY: Math.max(70, screen.y - (isMobileViewport ? 70 : 62)),
    };
  }, [
    imageToScreenPoint,
    isMobileViewport,
    selectedCutLayer,
    selectedFreeLinePointIndex,
    viewport.width,
  ]);

  const getMobileHandleAssistGeometry = useCallback(
    (line, handleKey) => {
      if (!line) return null;
      const handleImagePoint =
        handleKey === "start"
          ? { x: line.x1, y: line.y1 }
          : { x: line.x2, y: line.y2 };
      const otherImagePoint =
        handleKey === "start"
          ? { x: line.x2, y: line.y2 }
          : { x: line.x1, y: line.y1 };
      const handleScreenPoint = imageToScreenPoint(
        handleImagePoint.x,
        handleImagePoint.y,
      );
      const otherScreenPoint = imageToScreenPoint(
        otherImagePoint.x,
        otherImagePoint.y,
      );
      const dx = handleScreenPoint.x - otherScreenPoint.x;
      const dy = handleScreenPoint.y - otherScreenPoint.y;
      const length = Math.hypot(dx, dy) || 1;
      const unitX = dx / length;
      const unitY = dy / length;
      const offset = MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN * 0.62;

      return {
        handleImagePoint,
        handleScreenPoint,
        centerX: handleScreenPoint.x + unitX * offset,
        centerY: handleScreenPoint.y + unitY * offset,
      };
    },
    [imageToScreenPoint],
  );

  const findMobileHandleAssistHit = useCallback(
    (screenPoint) => {
      if (!isCoarsePointer || !mobileHandleAssist) return null;
      const targetLine =
        lines.find((line) => line.id === mobileHandleAssist.lineId) || null;
      if (!targetLine) return null;
      const geometry = getMobileHandleAssistGeometry(
        targetLine,
        mobileHandleAssist.handleKey,
      );
      if (!geometry) return null;
      const distance = Math.hypot(
        screenPoint.x - geometry.centerX,
        screenPoint.y - geometry.centerY,
      );

      if (distance > MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN) {
        return null;
      }

      return {
        lineId: targetLine.id,
        handleKey: mobileHandleAssist.handleKey,
      };
    },
    [getMobileHandleAssistGeometry, isCoarsePointer, lines, mobileHandleAssist],
  );

  const getMobileAngleHandleAssistGeometry = useCallback(
    (angle, handleKey) => {
      if (!angle) return null;
      const entries = getAnglePointEntries(angle);
      const targetEntry = entries.find((entry) => entry.key === handleKey);
      if (!targetEntry) return null;
      const handleImagePoint = targetEntry.point;
      const handleScreenPoint = imageToScreenPoint(
        handleImagePoint.x,
        handleImagePoint.y,
      );
      const otherEntries = entries.filter((entry) => entry.key !== handleKey);
      let centroidX = handleScreenPoint.x;
      let centroidY = handleScreenPoint.y - 1;
      if (otherEntries.length > 0) {
        const centroid = otherEntries.reduce(
          (accumulator, entry) => {
            const screen = imageToScreenPoint(entry.point.x, entry.point.y);
            accumulator.x += screen.x;
            accumulator.y += screen.y;
            return accumulator;
          },
          { x: 0, y: 0 },
        );
        centroidX = centroid.x / otherEntries.length;
        centroidY = centroid.y / otherEntries.length;
      }
      let dx = handleScreenPoint.x - centroidX;
      let dy = handleScreenPoint.y - centroidY;
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      const offset = MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN * 0.62;
      return {
        handleImagePoint,
        handleScreenPoint,
        centerX: handleScreenPoint.x + dx * offset,
        centerY: handleScreenPoint.y + dy * offset,
      };
    },
    [imageToScreenPoint],
  );

  const findMobileAngleHandleAssistHit = useCallback(
    (screenPoint) => {
      if (!isCoarsePointer || !mobileAngleHandleAssist) return null;
      const targetAngle =
        angles.find((angle) => angle.id === mobileAngleHandleAssist.angleId) ||
        null;
      if (!targetAngle) return null;
      const geometry = getMobileAngleHandleAssistGeometry(
        targetAngle,
        mobileAngleHandleAssist.handleKey,
      );
      if (!geometry) return null;
      const distance = Math.hypot(
        screenPoint.x - geometry.centerX,
        screenPoint.y - geometry.centerY,
      );
      if (distance > MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN) {
        return null;
      }
      return {
        angleId: targetAngle.id,
        handleKey: mobileAngleHandleAssist.handleKey,
      };
    },
    [
      angles,
      getMobileAngleHandleAssistGeometry,
      isCoarsePointer,
      mobileAngleHandleAssist,
    ],
  );

  const getMobilePlanningGuideHandleAssistGeometry = useCallback(
    (guide, handleKey) => {
      if (!guide) return null;
      const handleImagePoint =
        handleKey === "start" ? guide.anchorStart : guide.anchorEnd;
      const otherImagePoint =
        handleKey === "start" ? guide.anchorEnd : guide.anchorStart;
      const handleScreenPoint = imageToScreenPoint(
        handleImagePoint.x,
        handleImagePoint.y,
      );
      const otherScreenPoint = imageToScreenPoint(
        otherImagePoint.x,
        otherImagePoint.y,
      );
      const dx = handleScreenPoint.x - otherScreenPoint.x;
      const dy = handleScreenPoint.y - otherScreenPoint.y;
      const length = Math.hypot(dx, dy) || 1;
      const unitX = dx / length;
      const unitY = dy / length;
      const offset = MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN * 0.62;

      return {
        handleImagePoint,
        handleScreenPoint,
        centerX: handleScreenPoint.x + unitX * offset,
        centerY: handleScreenPoint.y + unitY * offset,
      };
    },
    [imageToScreenPoint],
  );

  const getMobileHkaHandleAssistGeometry = useCallback(
    (item, handleKey) => {
      if (!item) return null;
      const entries = getHkaPointEntries(item);
      const targetEntry = entries.find((entry) => entry.key === handleKey);
      if (!targetEntry) return null;
      const handleImagePoint = targetEntry.point;
      const handleScreenPoint = imageToScreenPoint(
        handleImagePoint.x,
        handleImagePoint.y,
      );
      const otherEntries = entries.filter((entry) => entry.key !== handleKey);
      let centroidX = handleScreenPoint.x;
      let centroidY = handleScreenPoint.y - 1;
      if (otherEntries.length > 0) {
        const centroid = otherEntries.reduce(
          (accumulator, entry) => {
            const screen = imageToScreenPoint(entry.point.x, entry.point.y);
            accumulator.x += screen.x;
            accumulator.y += screen.y;
            return accumulator;
          },
          { x: 0, y: 0 },
        );
        centroidX = centroid.x / otherEntries.length;
        centroidY = centroid.y / otherEntries.length;
      }
      let dx = handleScreenPoint.x - centroidX;
      let dy = handleScreenPoint.y - centroidY;
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      const offset = MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN * 0.62;
      return {
        handleImagePoint,
        handleScreenPoint,
        centerX: handleScreenPoint.x + dx * offset,
        centerY: handleScreenPoint.y + dy * offset,
      };
    },
    [imageToScreenPoint],
  );

  const findMobileHkaHandleAssistHit = useCallback(
    (screenPoint) => {
      if (!isCoarsePointer || !mobileHkaHandleAssist) return null;
      const targetItem =
        hkaSets.find((item) => item.id === mobileHkaHandleAssist.hkaId) || null;
      if (!targetItem) return null;
      const geometry = getMobileHkaHandleAssistGeometry(
        targetItem,
        mobileHkaHandleAssist.handleKey,
      );
      if (!geometry) return null;
      const distance = Math.hypot(
        screenPoint.x - geometry.centerX,
        screenPoint.y - geometry.centerY,
      );
      if (distance > MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN) {
        return null;
      }
      return {
        hkaId: targetItem.id,
        handleKey: mobileHkaHandleAssist.handleKey,
      };
    },
    [
      getMobileHkaHandleAssistGeometry,
      hkaSets,
      isCoarsePointer,
      mobileHkaHandleAssist,
    ],
  );

  const findMobilePlanningGuideHandleAssistHit = useCallback(
    (screenPoint) => {
      if (!isCoarsePointer || !mobilePlanningGuideHandleAssist) return null;
      const targetGuide =
        planningGuides.find(
          (guide) => guide.id === mobilePlanningGuideHandleAssist.guideId,
        ) || null;
      if (!targetGuide) return null;
      const geometry = getMobilePlanningGuideHandleAssistGeometry(
        targetGuide,
        mobilePlanningGuideHandleAssist.handleKey,
      );
      if (!geometry) return null;
      const distance = Math.hypot(
        screenPoint.x - geometry.centerX,
        screenPoint.y - geometry.centerY,
      );

      if (distance > MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN) {
        return null;
      }

      return {
        guideId: targetGuide.id,
        handleKey: mobilePlanningGuideHandleAssist.handleKey,
      };
    },
    [
      getMobilePlanningGuideHandleAssistGeometry,
      isCoarsePointer,
      mobilePlanningGuideHandleAssist,
      planningGuides,
    ],
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

  const clampViewToViewport = useCallback(
    (nextView, { relaxed = false } = {}) => {
      if (
        !nextView ||
        !viewport.width ||
        !viewport.height ||
        !orientedSize.width ||
        !orientedSize.height
      ) {
        return nextView;
      }

      const corners = [
        orientPoint(
          0,
          0,
          modelWidth,
          modelHeight,
          rotation,
          flipX,
          flipY,
        ),
        orientPoint(
          modelWidth,
          0,
          modelWidth,
          modelHeight,
          rotation,
          flipX,
          flipY,
        ),
        orientPoint(
          0,
          modelHeight,
          modelWidth,
          modelHeight,
          rotation,
          flipX,
          flipY,
        ),
        orientPoint(
          modelWidth,
          modelHeight,
          modelWidth,
          modelHeight,
          rotation,
          flipX,
          flipY,
        ),
      ].map((point) => ({
        x: point.x * nextView.scale + nextView.panX,
        y: point.y * nextView.scale + nextView.panY,
      }));

      const minX = Math.min(...corners.map((point) => point.x));
      const maxX = Math.max(...corners.map((point) => point.x));
      const minY = Math.min(...corners.map((point) => point.y));
      const maxY = Math.max(...corners.map((point) => point.y));
      const boundsWidth = maxX - minX;
      const boundsHeight = maxY - minY;

      let nextPanX = nextView.panX;
      let nextPanY = nextView.panY;
      const relaxedVisibleX = Math.min(
        VIEW_PAN_VISIBLE_MARGIN,
        Math.max(24, viewport.width * 0.3),
        Math.max(24, boundsWidth),
      );
      const relaxedVisibleY = Math.min(
        VIEW_PAN_VISIBLE_MARGIN,
        Math.max(24, viewport.height * 0.3),
        Math.max(24, boundsHeight),
      );

      if (relaxed) {
        if (maxX < relaxedVisibleX) nextPanX += relaxedVisibleX - maxX;
        if (minX > viewport.width - relaxedVisibleX) {
          nextPanX += viewport.width - relaxedVisibleX - minX;
        }
      } else if (boundsWidth <= viewport.width) {
        nextPanX += (viewport.width - boundsWidth) / 2 - minX;
      } else {
        if (minX > 0) nextPanX -= minX;
        if (maxX < viewport.width) nextPanX += viewport.width - maxX;
      }

      if (relaxed) {
        if (maxY < relaxedVisibleY) nextPanY += relaxedVisibleY - maxY;
        if (minY > viewport.height - relaxedVisibleY) {
          nextPanY += viewport.height - relaxedVisibleY - minY;
        }
      } else if (boundsHeight <= viewport.height) {
        nextPanY += (viewport.height - boundsHeight) / 2 - minY;
      } else {
        if (minY > 0) nextPanY -= minY;
        if (maxY < viewport.height) nextPanY += viewport.height - maxY;
      }

      if (nextPanX === nextView.panX && nextPanY === nextView.panY) {
        return nextView;
      }

      return {
        ...nextView,
        panX: nextPanX,
        panY: nextPanY,
      };
    },
    [
      flipX,
      flipY,
      modelHeight,
      modelWidth,
      orientedSize.height,
      orientedSize.width,
      rotation,
      viewport.height,
      viewport.width,
    ],
  );

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
      setShowLeftSidebar(true);
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

  const openSimpleCalibrationModal = useCallback(
    (
      message = "Kalibrasi line wajib untuk measurement akurat. Buat atau pilih garis referensi, isi ukuran real, lalu simpan kalibrasi.",
    ) => {
      setShowStartupCalibrationAlert(false);
      setCalibrationMode("line");
      setSimpleCalibrationModalOpen(true);
      setNotice(message);
    },
    [],
  );

  const focusMeasureStep = useCallback(() => {
    setMobileControlsOpen(true);
    setMobilePanelMode("workspace");
    setActiveRightPanel("measure");
    setTool(getIdleTool());
    scrollToPanel(measurePanelRef);
  }, [getIdleTool, scrollToPanel]);

  const openSimplePlanningModal = useCallback(
    (mode) => {
      const nextMode = mode === "hip" ? "hip" : "tka";
      setMeasureAnatomyTab(nextMode === "hip" ? "hip" : "knee");
      setActiveRightPanel("measure");
      setMobilePanelMode("workspace");
      setTool(getIdleTool());
      setSimplePlanningModal(nextMode);
      setNotice(
        nextMode === "hip"
          ? "Planning HIP dibuka. Pilih preset offset/LLD, lalu gambar atau pilih line di canvas."
          : "Planning TKA dibuka. Pilih line acuan, atur mode guide, lalu buat guide.",
      );
    },
    [getIdleTool],
  );

  const focusExportStep = useCallback(() => {
    if (!hasCalibration) {
      focusCalibrationStep("Export report dikunci sampai kalibrasi aktif.");
      return;
    }
    setMobileControlsOpen(true);
    setMobilePanelMode("setup");
    scrollToPanel(exportPanelRef);
  }, [focusCalibrationStep, hasCalibration, scrollToPanel]);

  const createCalibrationPresetLine = useCallback(
    (targetMm) => {
      if (!image || modelWidth <= 0 || modelHeight <= 0) {
        setNotice("Upload X-ray dulu sebelum membuat ruler default.");
        return;
      }

      const safeTargetMm = Number(targetMm);
      if (!Number.isFinite(safeTargetMm) || safeTargetMm <= 0) {
        setNotice("Preset ruler tidak valid.");
        return;
      }

      const halfLength = clamp(
        Math.min(modelWidth * 0.18, modelHeight * 0.26),
        52,
        Math.max(52, modelWidth * 0.34),
      );
      const centerX = modelWidth / 2;
      const rulerY = clamp(
        modelHeight - Math.max(38, modelHeight * 0.08),
        18,
        modelHeight - 18,
      );
      const nextLine = {
        id: nextLineIdRef.current,
        x1: clamp(centerX - halfLength, 10, modelWidth - 20),
        y1: rulerY,
        x2: clamp(centerX + halfLength, 20, modelWidth - 10),
        y2: rulerY,
        type: "ruler",
        presetMm: safeTargetMm,
        labelOffsetX: DEFAULT_LINE_LABEL_OFFSET_X,
        labelOffsetY: DEFAULT_LINE_LABEL_OFFSET_Y,
        labelOpacity: DEFAULT_LABEL_OPACITY,
        strokeWidth: DEFAULT_LINE_STROKE_WIDTH,
      };
      nextLineIdRef.current += 1;

      setLines((prev) => {
        const preserved = prev.filter((line) => line.type !== "ruler");
        return [...preserved, nextLine];
      });
      setSelectedLineId(nextLine.id);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setSelectedCutLayerId(null);
      setCalibrationLineId(null);
      setMmPerPixel(null);
      setCalibrationMode("line");
      setActualMmInput(String(safeTargetMm / 10));
      setActualUnit("cm");
      if (isCoarsePointer) {
        setMobileHandleAssist({ lineId: nextLine.id, handleKey: "end" });
      }

      const presetLabel =
        safeTargetMm % 10 === 0
          ? `${safeTargetMm / 10} cm`
          : `${safeTargetMm} mm`;
      focusCalibrationStep(
        `Ruler default ${presetLabel} dibuat. Geser atau sesuaikan panjangnya, lalu tekan "Simpan Kalibrasi".`,
      );
    },
    [
      calibrationLineId,
      focusCalibrationStep,
      image,
      isCoarsePointer,
      modelHeight,
      modelWidth,
    ],
  );

  const createCalibrationPresetLineFromInput = useCallback(() => {
    const inputValue = Number(actualMmInput);
    if (!Number.isFinite(inputValue) || inputValue <= 0) {
      setNotice("Isi nilai kalibrasi dengan angka positif dulu.");
      return;
    }
    const targetMm = actualUnit === "cm" ? inputValue * 10 : inputValue;
    createCalibrationPresetLine(targetMm);
  }, [actualMmInput, actualUnit, createCalibrationPresetLine]);

  const handleHkaModeChange = useCallback((nextMode) => {
    setHkaInputMode(nextMode);
    setDraftHkaPoints([]);
    setNotice(getHkaDraftNotice(nextMode, 0));
  }, []);

  const handleToolChange = useCallback(
    (nextTool, options = {}) => {
      const requiresCalibration =
        nextTool === "angle" || nextTool === "circle" || nextTool === "hkaAuto";
      if (requiresCalibration && !hasCalibration) {
        const calibrationMessage =
          "Kalibrasi wajib sebelum memakai Angle/Circle/HKA.";
        if (isSimpleUiMode) {
          openSimpleCalibrationModal(calibrationMessage);
        } else {
          focusCalibrationStep(calibrationMessage);
        }
        return;
      }
      if (nextTool === "hkaAuto" && !options?.skipHkaSidePrompt) {
        setHkaSideModalOpen(true);
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setNotice("Pilih sisi kaki dulu sebelum membuat HKA.");
        return;
      }
      setMobilePanelMode("workspace");
      setActiveRightPanel("tool");
      resetMobileLineTapTarget();
      clearMobileHandleAssist();
      clearMobilePlanningGuideHandleAssist();
      if (nextTool !== "cut") {
        setDraftCut(null);
        setHistoryPaused(false);
      }
      if (nextTool !== "freeLine") {
        setDraftFreeLine(null);
        setHistoryPaused(false);
      }
      if (nextTool !== "centerFinder") {
        setDraftCenterFinderPoints([]);
      }
      if (nextTool !== "axisBuilder") {
        setDraftAxisBuilderPoints([]);
      }
      if (nextTool !== "guideBuilder") {
        setGuideBuilderPreviewPoint(null);
      }
      if (
        nextTool !== "centerFinder" &&
        nextTool !== "axisBuilder" &&
        nextTool !== "guideBuilder"
      ) {
        setToolConfigModal(null);
      }
      setTool(nextTool);
      if (nextTool === "hkaAuto") {
        setDraftHkaPoints([]);
        setNotice(getHkaDraftNotice(hkaInputMode, 0));
      } else if (nextTool === "centerFinder") {
        setNotice(
          "Center Finder aktif. Klik 3 titik di tepi kepala femur atau lingkaran target untuk menghitung center.",
        );
      } else if (nextTool === "axisBuilder") {
        setNotice(
          "Axis Builder aktif. Klik 2 titik proximal lalu 2 titik distal. Axis dibuat dari midpoint kedua segmen.",
        );
      } else if (nextTool === "guideBuilder") {
        setNotice(
          guideBuilderReference
            ? `Guide Builder aktif. Acuan ${guideBuilderReference.label} siap. Klik canvas untuk menjatuhkan ${guideBuilderMode === "parallel" ? "parallel" : "perpendicular"} guide.`
            : "Guide Builder aktif. Pilih satu line atau planning guide dulu sebagai acuan, lalu klik canvas.",
        );
      }
      if (isMobileViewport) {
        setMobileControlsOpen(false);
      }
    },
    [
      clearMobileHandleAssist,
      clearMobileAngleHandleAssist,
      clearMobileHkaHandleAssist,
      clearMobilePlanningGuideHandleAssist,
      guideBuilderMode,
      guideBuilderReference,
      focusCalibrationStep,
      hasCalibration,
      hkaInputMode,
      isSimpleUiMode,
      isMobileViewport,
      openSimpleCalibrationModal,
      resetMobileLineTapTarget,
      setDraftFreeLine,
    ],
  );

  const activateFreeLineMode = useCallback(
    (nextMode = "freehand") => {
      const normalizedMode = nextMode === "point" ? "point" : "freehand";
      setDraftFreeLine(null);
      setHistoryPaused(false);
      setFreeLineMode(normalizedMode);
      handleToolChange("freeLine");
      setNotice(
        normalizedMode === "point"
          ? "Free Line Point Mode aktif. Klik beberapa titik, lalu klik titik awal atau tekan Enter untuk selesai."
          : "Free Line Freehand aktif. Drag untuk menggambar shape bebas.",
      );
    },
    [handleToolChange],
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
    setTool(getIdleTool());
    if (shouldUseMobileOneShotTool) {
      setMobileControlsOpen(false);
    }
    return true;
  }, [
    cropRect,
    draftCut,
    focusLayerSettings,
    getIdleTool,
    image,
    shouldUseMobileOneShotTool,
  ]);

  const completeDraftFreeLine = useCallback(() => {
    if (!draftFreeLine || !Array.isArray(draftFreeLine.points)) return false;
    const targetDraftLayer =
      draftFreeLineTargetLayerId !== null
        ? cutLayers.find(
            (layer) =>
              layer.id === draftFreeLineTargetLayerId &&
              layer.kind === "free-line",
          )
        : null;
    const nextLayerId = targetDraftLayer?.id ?? nextCutLayerIdRef.current;

    const nextLayer = buildFreeLineLayerFromPoints({
      polygonPoints: draftFreeLine.points,
      layerId: nextLayerId,
      name:
        targetDraftLayer?.name && targetDraftLayer.isFreeLineDraftLayer
          ? targetDraftLayer.name.replace(/^Layer Kosong/, "Free Line")
          : targetDraftLayer?.name || `Free Line ${nextLayerId}`,
      fillColor: draftFreeLine.fillColor || DEFAULT_FREE_LINE_COLOR,
      drawMode: draftFreeLine.drawMode || freeLineMode,
      curveStrength:
        draftFreeLine.drawMode === "point" || freeLineMode === "point"
          ? DEFAULT_FREE_LINE_CURVE_POINT
          : DEFAULT_FREE_LINE_CURVE_FREEHAND,
    });

    if (!nextLayer) {
      setDraftFreeLine(null);
      setHistoryPaused(false);
      setNotice("Free Line gagal dibuat. Buat area yang lebih besar.");
      return false;
    }

    if (targetDraftLayer) {
      setCutLayers((prev) =>
        prev.map((layer) =>
          layer.id === targetDraftLayer.id
            ? {
                ...nextLayer,
                groupId: layer.groupId || null,
                opacity: layer.isFreeLineDraftLayer
                  ? 0.85
                  : Number.isFinite(layer.opacity)
                    ? layer.opacity
                    : 0.85,
                isFreeLineDraftLayer: false,
              }
            : layer,
        ),
      );
      setDraftFreeLineTargetLayerId(null);
    } else {
      nextCutLayerIdRef.current += 1;
      setCutLayers((prev) => [...prev, nextLayer]);
      setDraftFreeLineTargetLayerId(null);
    }
    focusLayerSettings(nextLayer.id);
    setSelectedLineId(null);
    setSelectedAngleId(null);
    setSelectedCircleId(null);
    setSelectedHkaId(null);
    setSelectedPlanningGuideId(null);
    setDraftFreeLine(null);
    setHistoryPaused(false);
    setNotice(
      targetDraftLayer
        ? "Layer kosong diisi dengan Free Line baru. Urutan stack dipertahankan."
        : "Free Line berhasil dibuat sebagai shape baru.",
    );
    setTool(getIdleTool());
    if (shouldUseMobileOneShotTool) {
      setMobileControlsOpen(false);
    }
    return true;
  }, [
    cutLayers,
    draftFreeLine,
    draftFreeLineTargetLayerId,
    focusLayerSettings,
    freeLineMode,
    getIdleTool,
    shouldUseMobileOneShotTool,
  ]);

  const createEmptyFreeLineLayer = useCallback(
    (mode = freeLineMode) => {
      if (!image || modelWidth <= 0 || modelHeight <= 0) {
        setNotice("Upload gambar utama dulu sebelum membuat layer kosong.");
        return;
      }

      const normalizedMode = mode === "point" ? "point" : "freehand";
      const width = clamp(modelWidth * 0.18, 72, 180);
      const height = clamp(modelHeight * 0.12, 52, 140);
      const centerX = modelWidth / 2;
      const centerY = modelHeight / 2;
      const polygonPoints = [
        { x: centerX - width / 2, y: centerY - height / 2 },
        { x: centerX + width / 2, y: centerY - height / 2 },
        { x: centerX + width / 2, y: centerY + height / 2 },
        { x: centerX - width / 2, y: centerY + height / 2 },
      ];
      const layerId = nextCutLayerIdRef.current;
      const nextLayer = buildFreeLineLayerFromPoints({
        polygonPoints,
        layerId,
        name: `Layer Kosong ${layerId}`,
        fillColor: DEFAULT_FREE_LINE_COLOR,
        drawMode: normalizedMode,
        curveStrength:
          normalizedMode === "point"
            ? DEFAULT_FREE_LINE_CURVE_POINT
            : DEFAULT_FREE_LINE_CURVE_FREEHAND,
      });

      if (!nextLayer) {
        setNotice("Layer kosong gagal dibuat.");
        return;
      }

      nextCutLayerIdRef.current += 1;
      const draftLayer = {
        ...nextLayer,
        opacity: 0.58,
        isFreeLineDraftLayer: true,
      };
      setCutLayers((prev) => [...prev, draftLayer]);
      setSelectedCutLayerId(draftLayer.id);
      setSelectedCutLayerExtraIds([]);
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setSelectedPlanningGuideId(null);
      setDraftFreeLineTargetLayerId(draftLayer.id);
      focusLayerSettings(draftLayer.id);
      activateFreeLineMode(normalizedMode);
      setNotice(
        `Layer kosong #${draftLayer.id} dibuat. Gambar dengan ${
          normalizedMode === "point" ? "Point Mode" : "Freehand"
        }; hasilnya akan mengisi layer ini dan urutan stack tetap bisa dinaik-turunkan.`,
      );
    },
    [
      activateFreeLineMode,
      focusLayerSettings,
      freeLineMode,
      image,
      modelHeight,
      modelWidth,
    ],
  );

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
      clearMobilePlanningGuideHandleAssist();
      setLinePreset(nextPreset);
      setTool("draw");
      const hipPresetInfo = HIP_FUNCTION_SUMMARY_BY_KEY[nextPreset];
      if (hipPresetInfo) {
        setNotice(`${hipPresetInfo.label} aktif. ${hipPresetInfo.notice}`);
      }
      if (isMobileViewport) {
        setMobileControlsOpen(false);
      }
    },
    [
      clearMobileHandleAssist,
      clearMobilePlanningGuideHandleAssist,
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
    if (!image || !viewport.width || !viewport.height) return;

    const nextSignature = [
      imageName || image?.src || "image",
      modelWidth,
      modelHeight,
      rotation,
      flipX ? 1 : 0,
      flipY ? 1 : 0,
    ].join("|");

    if (autoFitSignatureRef.current !== nextSignature) {
      autoFitSignatureRef.current = nextSignature;
      fitImageToViewport();
      return;
    }

    setView((prev) => clampViewToViewport(prev));
  }, [
    clampViewToViewport,
    fitImageToViewport,
    flipX,
    flipY,
    image,
    imageName,
    modelHeight,
    modelWidth,
    rotation,
    viewport.height,
    viewport.width,
  ]);

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
                groupId: layer.groupId || null,
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
                contrast: clamp(Number(layer.contrast ?? 100), 10, 300),
                level: clamp(Number(layer.level ?? 100), 10, 300),
                lockScale: Boolean(layer.lockScale),
                fillColor: layer.fillColor || "",
                drawMode:
                  layer.drawMode === "point" ? "point" : DEFAULT_FREE_LINE_MODE,
                curveStrength: getFreeLineCurveStrength(layer),
                isFreeLineDraftLayer: Boolean(layer.isFreeLineDraftLayer),
                imageSrc: layer.imageSrc || "",
                maskPoints: Array.isArray(layer.maskPoints)
                  ? layer.maskPoints
                      .map((point) => cloneMaskPoint(point))
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
        setHkaSets(parsedHkaSets.map((item) => cloneHkaItem(item)));
        setDraftAnglePoints([]);
        setDraftCirclePoints([]);
        setDraftHkaPoints([]);
        setDraftFreeLine(null);
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
        setHkaInputMode(payload.hkaInputMode || "full");
        setHkaSide(normalizeHkaSide(payload.hkaSide));
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
        setSelectedCutLayerExtraIds(
          Array.isArray(payload.selectedCutLayerExtraIds)
            ? payload.selectedCutLayerExtraIds
            : [],
        );
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
        setSnapSettings(normalizeSnapSettings(payload.snapSettings));
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MEASURE_LEGEND_VISIBILITY_KEY);
      setShowMeasureLegend(raw === null ? true : raw === "1");
    } catch {
      setShowMeasureLegend(true);
    } finally {
      measureLegendPreferenceLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!measureLegendPreferenceLoadedRef.current) return;
    try {
      window.localStorage.setItem(
        MEASURE_LEGEND_VISIBILITY_KEY,
        showMeasureLegend ? "1" : "0",
      );
    } catch {
      // ignore localStorage limit
    }
  }, [showMeasureLegend]);

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
          setNotice("URL Google Sheet");
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
    const rect =
      interactionCanvasRectRef.current ||
      overlayCanvasRef.current?.getBoundingClientRect();
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
      hkaSets: hkaSets.map((item) => cloneHkaItem(item)),
      cutLayers: cutLayers.map((layer) => ({
        ...layer,
        maskPoints: Array.isArray(layer.maskPoints)
          ? layer.maskPoints.map((point) => cloneMaskPoint(point))
          : null,
      })),
      selectedCutLayerExtraIds,
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
      snapSettings,
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
      selectedCutLayerExtraIds,
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
      snapSettings,
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
    setHkaSets(snapshot.hkaSets.map((item) => cloneHkaItem(item)));
    setCutLayers(
      snapshot.cutLayers.map((layer) => ({
        ...layer,
        maskPoints: Array.isArray(layer.maskPoints)
          ? layer.maskPoints.map((point) => cloneMaskPoint(point))
          : null,
      })),
    );
    setSelectedCutLayerExtraIds(
      Array.isArray(snapshot.selectedCutLayerExtraIds)
        ? snapshot.selectedCutLayerExtraIds
        : [],
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
    setSnapSettings(normalizeSnapSettings(snapshot.snapSettings));

    setSelectedLineId(null);
    setSelectedAngleId(null);
    setSelectedCircleId(null);
    setSelectedHkaId(null);
    setSelectedCutLayerId(null);
    setSelectedPlanningGuideId(null);
    setDraftLine(null);
    setDraftCut(null);
    setDraftFreeLine(null);
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

  const findAngleLabelByPoint = useCallback(
    (screenPoint) => {
      for (let index = angles.length - 1; index >= 0; index -= 1) {
        const angle = angles[index];
        const vertex = imageToScreenPoint(angle.p2.x, angle.p2.y);
        const labelX =
          vertex.x +
          (Number.isFinite(angle.labelOffsetX)
            ? angle.labelOffsetX
            : DEFAULT_ANGLE_LABEL_OFFSET_X);
        const labelY =
          vertex.y +
          (Number.isFinite(angle.labelOffsetY)
            ? angle.labelOffsetY
            : DEFAULT_ANGLE_LABEL_OFFSET_Y);
        const bounds = getTagBounds(
          labelX,
          labelY,
          getAngleCanvasLabelText(angle, true),
          {
            fontSize: 9,
            radius: 4,
          },
        );
        if (
          screenPoint.x >= bounds.left &&
          screenPoint.x <= bounds.right &&
          screenPoint.y >= bounds.top &&
          screenPoint.y <= bounds.bottom
        ) {
          return angle.id;
        }
      }
      return null;
    },
    [angles, imageToScreenPoint],
  );

  const findHkaLabelByPoint = useCallback(
    (screenPoint) => {
      for (let index = hkaSets.length - 1; index >= 0; index -= 1) {
        const item = hkaSets[index];
        const measurement = getHkaMeasurementResult(item);
        let anchor = null;

        if (item.mode === "fta") {
          if (
            !item.femoralNotch ||
            !item.tibiaMidshaft4cm
          ) {
            continue;
          }
          const notch = imageToScreenPoint(
            item.femoralNotch.x,
            item.femoralNotch.y,
          );
          const tibia4 = imageToScreenPoint(
            item.tibiaMidshaft4cm.x,
            item.tibiaMidshaft4cm.y,
          );
          anchor = {
            x: (notch.x + tibia4.x) / 2,
            y: (notch.y + tibia4.y) / 2,
          };
        } else {
          if (!item.knee) continue;
          anchor = imageToScreenPoint(item.knee.x, item.knee.y);
        }

        const labelX =
          anchor.x +
          (Number.isFinite(item.labelOffsetX)
            ? item.labelOffsetX
            : DEFAULT_HKA_LABEL_OFFSET_X);
        const labelY =
          anchor.y +
          (Number.isFinite(item.labelOffsetY)
            ? item.labelOffsetY
            : DEFAULT_HKA_LABEL_OFFSET_Y);
        const bounds = getTagBounds(
          labelX,
          labelY,
          getHkaCanvasLabelText(measurement, true),
          { fontSize: 9, radius: 4 },
        );
        if (
          screenPoint.x >= bounds.left &&
          screenPoint.x <= bounds.right &&
          screenPoint.y >= bounds.top &&
          screenPoint.y <= bounds.bottom
        ) {
          return item.id;
        }
      }
      return null;
    },
    [hkaSets, imageToScreenPoint],
  );

  const findClosestAngleHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = (isCoarsePointer ? 22 : 10) / view.scale;
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
    [angles, isCoarsePointer, view.scale],
  );

  const findClosestAngleId = useCallback(
    (imagePoint) => {
      const thresholdInImage = 10 / view.scale;
      let pickedId = null;
      let minDistance = Infinity;

      for (const angle of angles) {
        const distanceA = distancePointToSegment(imagePoint, {
          x1: angle.p2.x,
          y1: angle.p2.y,
          x2: angle.p1.x,
          y2: angle.p1.y,
        });
        const distanceB = distancePointToSegment(imagePoint, {
          x1: angle.p2.x,
          y1: angle.p2.y,
          x2: angle.p3.x,
          y2: angle.p3.y,
        });
        const distance = Math.min(distanceA, distanceB);
        if (distance <= thresholdInImage && distance < minDistance) {
          minDistance = distance;
          pickedId = angle.id;
        }
      }

      return pickedId;
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

  const findClosestCircleId = useCallback(
    (imagePoint) => {
      const thresholdInImage = 14 / view.scale;
      let pickedId = null;
      let minDistance = Infinity;

      for (let index = circles.length - 1; index >= 0; index -= 1) {
        const circle = circles[index];
        const centerDistance = Math.hypot(
          imagePoint.x - circle.cx,
          imagePoint.y - circle.cy,
        );
        const ringDistance = Math.abs(centerDistance - circle.radius);
        const insideDistance = centerDistance <= circle.radius ? 0 : Infinity;
        const distance = Math.min(ringDistance, insideDistance);
        if (distance <= thresholdInImage && distance < minDistance) {
          minDistance = distance;
          pickedId = circle.id;
        }
      }

      return pickedId;
    },
    [circles, view.scale],
  );

  const findCircleLabelByPoint = useCallback(
    (screenPoint) => {
      for (let index = circles.length - 1; index >= 0; index -= 1) {
        const circle = circles[index];
        const center = imageToScreenPoint(circle.cx, circle.cy);
        const edge = imageToScreenPoint(circle.cx + circle.radius, circle.cy);
        const radiusPx = Math.hypot(edge.x - center.x, edge.y - center.y);
        const bounds = getTagBounds(
          center.x,
          center.y - radiusPx - 12,
          getCircleCanvasLabelText(circle, mmPerPixel, measurementUnit, true),
          { fontSize: 9, radius: 4 },
        );
        if (
          screenPoint.x >= bounds.left &&
          screenPoint.x <= bounds.right &&
          screenPoint.y >= bounds.top &&
          screenPoint.y <= bounds.bottom
        ) {
          return circle.id;
        }
      }
      return null;
    },
    [circles, imageToScreenPoint, measurementUnit, mmPerPixel],
  );

  const findClosestHkaHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = (isCoarsePointer ? 22 : 10) / view.scale;
      let picked = null;
      let minDistance = Infinity;

      for (const item of hkaSets) {
        const handles = getHkaPointEntries(item).map((entry) => ({
          key: entry.key,
          x: entry.point.x,
          y: entry.point.y,
        }));
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
    [hkaSets, isCoarsePointer, view.scale],
  );

  const findClosestHkaId = useCallback(
    (imagePoint) => {
      const thresholdInImage = 10 / view.scale;
      let pickedId = null;
      let minDistance = Infinity;

      for (const item of hkaSets) {
        const segments =
          item.mode === "fta"
            ? item.femurMidshaft10cm &&
              item.femoralNotch &&
              item.tibiaMidshaft4cm &&
              item.tibiaMidshaft10cm
              ? [
                  {
                    x1: item.femurMidshaft10cm.x,
                    y1: item.femurMidshaft10cm.y,
                    x2: item.femoralNotch.x,
                    y2: item.femoralNotch.y,
                  },
                  {
                    x1: item.tibiaMidshaft4cm.x,
                    y1: item.tibiaMidshaft4cm.y,
                    x2: item.tibiaMidshaft10cm.x,
                    y2: item.tibiaMidshaft10cm.y,
                  },
                ]
              : []
            : item.hip && item.knee && item.ankle
              ? [
                  {
                    x1: item.knee.x,
                    y1: item.knee.y,
                    x2: item.hip.x,
                    y2: item.hip.y,
                  },
                  {
                    x1: item.knee.x,
                    y1: item.knee.y,
                    x2: item.ankle.x,
                    y2: item.ankle.y,
                  },
                ]
              : [];

        for (const segment of segments) {
          const distance = distancePointToSegment(imagePoint, segment);
          if (distance <= thresholdInImage && distance < minDistance) {
            minDistance = distance;
            pickedId = item.id;
          }
        }
      }

      return pickedId;
    },
    [hkaSets, view.scale],
  );

  const findFreeLinePointHandle = useCallback(
    (imagePoint) => {
      if (!selectedCutLayer || selectedCutLayer.kind !== "free-line") {
        return null;
      }
      const thresholdInImage = (isCoarsePointer ? 24 : 12) / view.scale;
      let picked = null;
      let minDistance = Infinity;

      for (const point of getFreeLineVertexPoints(selectedCutLayer)) {
        const distance = Math.hypot(
          imagePoint.x - point.x,
          imagePoint.y - point.y,
        );
        if (distance <= thresholdInImage && distance < minDistance) {
          minDistance = distance;
          picked = {
            layerId: selectedCutLayer.id,
            pointIndex: point.pointIndex,
          };
        }
      }

      return picked;
    },
    [isCoarsePointer, selectedCutLayer, view.scale],
  );

  const findFreeLineCurveHandle = useCallback(
    (imagePoint) => {
      if (
        !selectedCutLayer ||
        selectedCutLayer.kind !== "free-line" ||
        selectedFreeLinePointIndex === null
      ) {
        return null;
      }

      const thresholdInImage = (isCoarsePointer ? 26 : 13) / view.scale;
      let picked = null;
      let minDistance = Infinity;

      for (const handle of getFreeLineCurveHandles(
        selectedCutLayer,
        selectedFreeLinePointIndex,
      )) {
        const distance = Math.hypot(
          imagePoint.x - handle.x,
          imagePoint.y - handle.y,
        );
        if (distance <= thresholdInImage && distance < minDistance) {
          minDistance = distance;
          picked = {
            layerId: selectedCutLayer.id,
            pointIndex: handle.pointIndex,
            handleKey: handle.handleKey,
          };
        }
      }

      return picked;
    },
    [isCoarsePointer, selectedCutLayer, selectedFreeLinePointIndex, view.scale],
  );

  const snapCandidates = useMemo(() => {
    const candidates = [];
    const segments = [];

    const pushCandidate = (candidate) => {
      if (
        !Number.isFinite(candidate?.x) ||
        !Number.isFinite(candidate?.y) ||
        !candidate?.type
      ) {
        return;
      }
      const duplicate = candidates.some(
        (item) =>
          item.type === candidate.type &&
          Math.hypot(item.x - candidate.x, item.y - candidate.y) <= 0.6,
      );
      if (duplicate) return;
      candidates.push(candidate);
    };

    if (snapSettings.endpoint) {
      for (const line of lines) {
        pushCandidate({
          type: "endpoint",
          x: line.x1,
          y: line.y1,
          sourceRefs: [`line:${line.id}`],
        });
        pushCandidate({
          type: "endpoint",
          x: line.x2,
          y: line.y2,
          sourceRefs: [`line:${line.id}`],
        });
      }

      for (const guide of planningGuides) {
        pushCandidate({
          type: "endpoint",
          x: guide.anchorStart.x,
          y: guide.anchorStart.y,
          sourceRefs: [`guide:${guide.id}`],
        });
        pushCandidate({
          type: "endpoint",
          x: guide.anchorEnd.x,
          y: guide.anchorEnd.y,
          sourceRefs: [`guide:${guide.id}`],
        });
      }

      for (const angle of angles) {
        for (const entry of getAnglePointEntries(angle)) {
          pushCandidate({
            type: "endpoint",
            x: entry.point.x,
            y: entry.point.y,
            sourceRefs: [`angle:${angle.id}`],
          });
        }
      }

      for (const item of hkaSets) {
        for (const entry of getHkaPointEntries(item)) {
          pushCandidate({
            type: "endpoint",
            x: entry.point.x,
            y: entry.point.y,
            sourceRefs: [`hka:${item.id}`],
          });
        }
      }
    }

    if (snapSettings.midpoint || snapSettings.intersection) {
      for (const line of lines) {
        const segment = {
          x1: line.x1,
          y1: line.y1,
          x2: line.x2,
          y2: line.y2,
          sourceRef: `line:${line.id}`,
        };
        segments.push(segment);
        if (snapSettings.midpoint) {
          const midpoint = getSegmentMidpoint(
            { x: line.x1, y: line.y1 },
            { x: line.x2, y: line.y2 },
          );
          pushCandidate({
            type: "midpoint",
            x: midpoint.x,
            y: midpoint.y,
            sourceRefs: [segment.sourceRef],
          });
        }
      }

      for (const guide of planningGuides) {
        const segment = {
          x1: guide.anchorStart.x,
          y1: guide.anchorStart.y,
          x2: guide.anchorEnd.x,
          y2: guide.anchorEnd.y,
          sourceRef: `guide:${guide.id}`,
        };
        segments.push(segment);
        if (snapSettings.midpoint) {
          const midpoint = getSegmentMidpoint(guide.anchorStart, guide.anchorEnd);
          pushCandidate({
            type: "midpoint",
            x: midpoint.x,
            y: midpoint.y,
            sourceRefs: [segment.sourceRef],
          });
        }
      }
    }

    if (snapSettings.center) {
      for (const circle of circles) {
        pushCandidate({
          type: "center",
          x: circle.cx,
          y: circle.cy,
          sourceRefs: [`circle:${circle.id}`],
        });
      }
    }

    if (snapSettings.intersection && segments.length > 1) {
      for (let index = 0; index < segments.length; index += 1) {
        for (let nextIndex = index + 1; nextIndex < segments.length; nextIndex += 1) {
          const segmentA = segments[index];
          const segmentB = segments[nextIndex];
          if (segmentA.sourceRef === segmentB.sourceRef) continue;
          const intersection = getSegmentIntersectionPoint(segmentA, segmentB);
          if (!intersection) continue;
          pushCandidate({
            type: "intersection",
            x: intersection.x,
            y: intersection.y,
            sourceRefs: [segmentA.sourceRef, segmentB.sourceRef],
          });
        }
      }
    }

    return candidates;
  }, [angles, circles, hkaSets, lines, planningGuides, snapSettings]);

  const resolveSnappedImagePoint = useCallback(
    (rawPoint, { excludeRefs = [], thresholdPx } = {}) => {
      const allowSnapByModifier =
        !snapSettings.shiftOnlyDesktop ||
        isCoarsePointer ||
        snapModifierPressedRef.current;

      if (!snapToLandmarks || !allowSnapByModifier) {
        return { point: rawPoint, candidate: null };
      }

      const thresholdInImage =
        (thresholdPx ?? (isCoarsePointer ? 22 : 12)) / view.scale;
      let nearest = null;
      let nearestDistance = Infinity;

      const evaluateCandidate = (candidate) => {
        if (!candidate) return;
        if (
          excludeRefs.length > 0 &&
          candidate.sourceRefs?.some((ref) => excludeRefs.includes(ref))
        ) {
          return;
        }
        const distance = Math.hypot(rawPoint.x - candidate.x, rawPoint.y - candidate.y);
        if (distance <= thresholdInImage && distance < nearestDistance) {
          nearest = candidate;
          nearestDistance = distance;
        }
      };

      for (const candidate of snapCandidates) {
        evaluateCandidate(candidate);
      }

      if (snapSettings.perpendicular) {
        for (const line of lines) {
          const projection = projectPointToInfiniteLine(rawPoint, line);
          if (!projection) continue;
          evaluateCandidate({
            type: "perpendicular",
            x: projection.x,
            y: projection.y,
            sourceRefs: [`line:${line.id}`],
            hintSegments: [
              {
                x1: rawPoint.x,
                y1: rawPoint.y,
                x2: projection.x,
                y2: projection.y,
              },
            ],
          });
        }
        for (const guide of planningGuides) {
          const projection = projectPointToInfiniteLine(rawPoint, {
            x1: guide.anchorStart.x,
            y1: guide.anchorStart.y,
            x2: guide.anchorEnd.x,
            y2: guide.anchorEnd.y,
          });
          if (!projection) continue;
          evaluateCandidate({
            type: "perpendicular",
            x: projection.x,
            y: projection.y,
            sourceRefs: [`guide:${guide.id}`],
            hintSegments: [
              {
                x1: rawPoint.x,
                y1: rawPoint.y,
                x2: projection.x,
                y2: projection.y,
              },
            ],
          });
        }
      }

      if (snapSettings.tangent) {
        for (const circle of circles) {
          const tangentPoints = getCircleTangentPointsFromExternalPoint(
            rawPoint,
            circle,
          );
          for (const tangentPoint of tangentPoints) {
            evaluateCandidate({
              type: "tangent",
              x: tangentPoint.x,
              y: tangentPoint.y,
              sourceRefs: [`circle:${circle.id}`],
              hintSegments: [
                {
                  x1: rawPoint.x,
                  y1: rawPoint.y,
                  x2: tangentPoint.x,
                  y2: tangentPoint.y,
                },
                {
                  x1: circle.cx,
                  y1: circle.cy,
                  x2: tangentPoint.x,
                  y2: tangentPoint.y,
                },
              ],
            });
          }
        }
      }

      if (!nearest) {
        return { point: rawPoint, candidate: null };
      }

      return {
        point: { x: nearest.x, y: nearest.y },
        candidate: {
          ...nearest,
          label: getSnapTypeShortLabel(nearest.type),
        },
      };
    },
    [
      circles,
      isCoarsePointer,
      lines,
      planningGuides,
      snapCandidates,
      snapSettings.perpendicular,
      snapSettings.shiftOnlyDesktop,
      snapSettings.tangent,
      snapToLandmarks,
      view.scale,
    ],
  );

  const resolveSnapWithPreview = useCallback(
    (rawPoint, options = {}) => {
      const result = resolveSnappedImagePoint(rawPoint, options);
      const nextCandidate = result.candidate || null;
      const nextSignature = getSnapTargetSignature(nextCandidate);
      if (activeSnapTargetSignatureRef.current !== nextSignature) {
        activeSnapTargetRef.current = nextCandidate;
        activeSnapTargetSignatureRef.current = nextSignature;
        setActiveSnapTarget(nextCandidate);
      }
      return result;
    },
    [resolveSnappedImagePoint],
  );

  const clearSnapPreview = useCallback(() => {
    if (!activeSnapTargetRef.current) return;
    activeSnapTargetRef.current = null;
    activeSnapTargetSignatureRef.current = getSnapTargetSignature(null);
    setActiveSnapTarget(null);
  }, []);

  const findCutLayerHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = (isCoarsePointer ? 22 : 14) / view.scale;

      for (let i = cutLayers.length - 1; i >= 0; i -= 1) {
        const layer = cutLayers[i];
        const controlPoints = getLayerControlPoints(layer);

        for (const controlPoint of controlPoints) {
          const distance = Math.hypot(
            imagePoint.x - controlPoint.x,
            imagePoint.y - controlPoint.y,
          );
          if (distance <= thresholdInImage) {
            return {
              layerId: layer.id,
              handleKey: controlPoint.key,
              handleType: controlPoint.type,
            };
          }
        }
      }

      return null;
    },
    [cutLayers, isCoarsePointer, view.scale],
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
    imageCanvas.style.filter = "none";
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
        const displaySize = getLayerDisplaySize(layer);

        imageCtx.save();
        imageCtx.translate(layer.centerX, layer.centerY);
        imageCtx.rotate((layer.rotation * Math.PI) / 180);
        imageCtx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
        imageCtx.globalAlpha = clamp(layer.opacity ?? 1, 0.05, 1);
        imageCtx.filter = "none";

        if (layer.kind === "free-line") {
          const localMaskPoints = getLayerMaskDisplayPoints(layer);
          if (localMaskPoints?.length >= MIN_FREE_CUT_POINTS) {
            const curveStrength = getFreeLineCurveStrength(layer);
            imageCtx.fillStyle = layer.fillColor || DEFAULT_FREE_LINE_COLOR;
            imageCtx.strokeStyle = layer.fillColor || DEFAULT_FREE_LINE_COLOR;
            imageCtx.lineWidth = Math.max(1 / view.scale, 1.15);
            traceSmoothClosedPath(imageCtx, localMaskPoints, curveStrength);
            imageCtx.fill();
            imageCtx.stroke();
          }
        } else {
          const isImageBacked = isImageBackedLayerKind(layer.kind);
          const srcX = isImageBacked ? layer.sourceX : sourceX + layer.sourceX;
          const srcY = isImageBacked ? layer.sourceY : sourceY + layer.sourceY;
          const sourceImage = isImageBacked ? layer.image : image;
          if (!sourceImage) {
            imageCtx.restore();
            continue;
          }
          imageCtx.filter = isImageBacked
            ? getLayerFilterValue(layer)
            : "none";
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
        }

        if (selectedCutLayerIdsSet.has(layer.id)) {
          const layerPalette = getLayerPalette(layer.id);
          imageCtx.strokeStyle = layerPalette.border;
          imageCtx.lineWidth = Math.max(
            1 / view.scale,
            layer.id === selectedCutLayerId ? 1.2 : 0.8,
          );
          imageCtx.setLineDash(
            layer.id === selectedCutLayerId
              ? [10 / view.scale, 6 / view.scale]
              : [6 / view.scale, 5 / view.scale],
          );
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
      const assistGeometry = opts.assistHandleKey
        ? getMobileHandleAssistGeometry(line, opts.assistHandleKey)
        : null;

      overlayCtx.save();
      if (assistGeometry) {
        overlayCtx.fillStyle = "rgba(226, 232, 240, 0.34)";
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistGeometry.centerX,
          assistGeometry.centerY,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.65)";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistGeometry.centerX,
          assistGeometry.centerY,
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
      if (opts.calibrationReference) {
        overlayCtx.strokeStyle = opts.calibrationSaved
          ? "rgba(34, 197, 94, 0.2)"
          : "rgba(14, 165, 233, 0.22)";
        overlayCtx.lineWidth = (opts.width || 2) + 10;
        overlayCtx.lineCap = "round";
        overlayCtx.beginPath();
        overlayCtx.moveTo(start.x, start.y);
        overlayCtx.lineTo(end.x, end.y);
        overlayCtx.stroke();
      }
      if (opts.pulse) {
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.4)";
        overlayCtx.lineWidth = (opts.width || 2) + 6;
        overlayCtx.lineCap = "round";
        overlayCtx.beginPath();
        overlayCtx.moveTo(start.x, start.y);
        overlayCtx.lineTo(end.x, end.y);
        overlayCtx.stroke();
      }
      overlayCtx.strokeStyle = opts.color;
      overlayCtx.lineWidth = opts.width || 2;
      overlayCtx.lineCap = "round";
      overlayCtx.setLineDash(
        Array.isArray(opts.dashPattern)
          ? opts.dashPattern
          : opts.dashed
            ? [6, 4]
            : [],
      );
      overlayCtx.beginPath();
      overlayCtx.moveTo(start.x, start.y);
      overlayCtx.lineTo(end.x, end.y);
      overlayCtx.stroke();

      if (opts.calibrationReference) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length > 1) {
          const nx = -dy / length;
          const ny = dx / length;
          const capLength = 12;
          overlayCtx.strokeStyle = opts.color;
          overlayCtx.lineWidth = Math.max(1.2, (opts.width || 2) * 0.85);
          overlayCtx.beginPath();
          overlayCtx.moveTo(
            start.x - nx * (capLength * 0.5),
            start.y - ny * (capLength * 0.5),
          );
          overlayCtx.lineTo(
            start.x + nx * (capLength * 0.5),
            start.y + ny * (capLength * 0.5),
          );
          overlayCtx.moveTo(
            end.x - nx * (capLength * 0.5),
            end.y - ny * (capLength * 0.5),
          );
          overlayCtx.lineTo(
            end.x + nx * (capLength * 0.5),
            end.y + ny * (capLength * 0.5),
          );
          overlayCtx.stroke();
        }
      }

      if (line.type === "ruler" && Number.isFinite(line.presetMm)) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length > 1) {
          const ux = dx / length;
          const uy = dy / length;
          const nx = -uy;
          const ny = ux;
          const tickCount = clamp(Math.round(line.presetMm / 10), 5, 15);
          overlayCtx.strokeStyle = opts.color;
          overlayCtx.lineWidth = Math.max(1, (opts.width || 2) * 0.7);
          overlayCtx.beginPath();
          for (let index = 0; index <= tickCount; index += 1) {
            const t = index / tickCount;
            const px = start.x + dx * t;
            const py = start.y + dy * t;
            const tickLength =
              index === 0 || index === tickCount
                ? 16
                : index % 5 === 0
                  ? 12
                  : 8;
            overlayCtx.moveTo(
              px - nx * (tickLength * 0.5),
              py - ny * (tickLength * 0.5),
            );
            overlayCtx.lineTo(
              px + nx * (tickLength * 0.5),
              py + ny * (tickLength * 0.5),
            );
          }
          overlayCtx.stroke();
        }
      }

      if (opts.showTouchHalo) {
        overlayCtx.fillStyle = "rgba(248, 250, 252, 0.18)";
        fillCircleMarkers(overlayCtx, [
          { x: start.x, y: start.y, radius: 16 },
          { x: end.x, y: end.y, radius: 16 },
        ]);
      }

      overlayCtx.fillStyle = opts.color;
      fillCircleMarkers(overlayCtx, [
        {
          x: start.x,
          y: start.y,
          radius: (opts.handleRadius || 3) + (opts.calibrationReference ? 0.7 : 0),
        },
        {
          x: end.x,
          y: end.y,
          radius: (opts.handleRadius || 3) + (opts.calibrationReference ? 0.7 : 0),
        },
      ]);

      if (opts.highlightHandles) {
        overlayCtx.strokeStyle = "#f8fafc";
        overlayCtx.lineWidth = opts.calibrationReference ? 1.9 : 1.5;
        strokeCircleMarkers(overlayCtx, [
          {
            x: start.x,
            y: start.y,
            radius:
              (opts.handleRadius || 3) +
              1.2 +
              (opts.calibrationReference ? 0.8 : 0),
          },
          {
            x: end.x,
            y: end.y,
            radius:
              (opts.handleRadius || 3) +
              1.2 +
              (opts.calibrationReference ? 0.8 : 0),
          },
        ]);
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
      if (opts.calibrationReference) {
        drawTag(
          overlayCtx,
          midX,
          midY - 18,
          opts.calibrationSaved ? "CAL AKTIF" : "REF KALIBRASI",
          opts.color,
          {
            bgOpacity: opts.calibrationSaved ? 0.8 : 0.68,
            borderOpacity: 0.98,
            fontSize: 8,
            paddingX: 4,
            paddingY: 1.5,
            radius: 999,
          },
        );
      }
    };

    for (const line of lines) {
      const isSelected = line.id === selectedLineId;
      const isPulsing =
        selectionPulse?.type === "line" && selectionPulse.id === line.id;
      const isCalibration = line.id === calibrationLineId;
      const isCalibrationReference =
        calibrationMode === "line" && calibrationReferenceLine?.id === line.id;
      const isLocked = isLineLocked(line.id);
      const style = getLineVisualStyle(line, {
        isSelected,
        isPulsing,
        isLocked,
        isCalibration,
        isCalibrationReference,
      });

      drawLine(line, {
        color: style.color,
        width: style.width,
        dashPattern: style.dashPattern,
        handleRadius:
          (isSelected || isPulsing) && !isLocked
            ? isCoarsePointer
              ? 6.6
              : 4.9
            : 3,
        highlightHandles: (isSelected || isPulsing) && !isLocked,
        dashed: isLocked,
        showTouchHalo: isSelected && !isLocked && isCoarsePointer,
        pulse: isPulsing,
        calibrationReference: isCalibrationReference,
        calibrationSaved: isCalibration,
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
      const isHovered =
        hoveredMeasurementInfo?.type === "angle" &&
        hoveredMeasurementInfo.id === angle.id;
      const isPulsing =
        selectionPulse?.type === "angle" && selectionPulse.id === angle.id;
      const isEmphasized = isSelected || isPulsing;
      const showExpandedInfo = isSelected || isHovered;
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
      const resultOpacity = getAngleResultOpacity(angle);
      const arcGeometry = getAngleArcGeometry(p1, p2, p3);
      const assistGeometry =
        mobileAngleHandleAssist?.angleId === angle.id
          ? getMobileAngleHandleAssistGeometry(
              angle,
              mobileAngleHandleAssist.handleKey,
            )
          : null;

      overlayCtx.save();
      if (assistGeometry) {
        overlayCtx.fillStyle = "rgba(226, 232, 240, 0.34)";
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistGeometry.centerX,
          assistGeometry.centerY,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.65)";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistGeometry.centerX,
          assistGeometry.centerY,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.stroke();
      }
      if (isPulsing) {
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.38)";
        overlayCtx.lineWidth = strokeWidth + 5.2;
        overlayCtx.lineCap = "round";
        overlayCtx.lineJoin = "round";
        overlayCtx.beginPath();
        overlayCtx.moveTo(p2.x, p2.y);
        overlayCtx.lineTo(p1.x, p1.y);
        overlayCtx.moveTo(p2.x, p2.y);
        overlayCtx.lineTo(p3.x, p3.y);
        overlayCtx.stroke();
      }
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = strokeWidth + (isEmphasized ? 0.35 : 0);
      overlayCtx.lineCap = "round";
      overlayCtx.lineJoin = "round";
      overlayCtx.beginPath();
      overlayCtx.moveTo(p2.x, p2.y);
      overlayCtx.lineTo(p1.x, p1.y);
      overlayCtx.moveTo(p2.x, p2.y);
      overlayCtx.lineTo(p3.x, p3.y);
      overlayCtx.stroke();

      if (arcGeometry) {
        overlayCtx.beginPath();
        overlayCtx.lineWidth = Math.max(1.2, strokeWidth - 0.35);
        overlayCtx.arc(
          p2.x,
          p2.y,
          arcGeometry.radius,
          arcGeometry.startAngle,
          arcGeometry.endAngle,
          arcGeometry.counterclockwise,
        );
        overlayCtx.stroke();
      }

      overlayCtx.fillStyle = color;
      fillCircleMarkers(overlayCtx, [
        { x: p1.x, y: p1.y, radius: isEmphasized ? 4.4 : 3.8 },
        { x: p2.x, y: p2.y, radius: isEmphasized ? 5.1 : 4.5 },
        { x: p3.x, y: p3.y, radius: isEmphasized ? 4.4 : 3.8 },
      ]);
      overlayCtx.restore();

      drawTag(
        overlayCtx,
        p2.x + labelOffsetX,
        p2.y + labelOffsetY,
        getAngleCanvasLabelText(angle, showExpandedInfo),
        color,
        {
          bgOpacity: Math.max(
            0.08,
            Math.min(1, resultOpacity + (showExpandedInfo ? 0.14 : 0)),
          ),
          borderOpacity: Math.max(
            0.42,
            Math.min(
              0.96,
              resultOpacity +
                (isEmphasized ? 0.28 : 0.2) +
                (isHovered ? 0.08 : 0),
            ),
          ),
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
      const isHovered =
        hoveredMeasurementInfo?.type === "circle" &&
        hoveredMeasurementInfo.id === circle.id;
      const isPulsing =
        selectionPulse?.type === "circle" && selectionPulse.id === circle.id;
      const isEmphasized = isSelected || isPulsing;
      const showExpandedInfo = isSelected || isHovered;
      const color = isSelected ? "#a78bfa" : "#8b5cf6";
      const strokeWidth = Math.max(
        1.2,
        Number.isFinite(circle.strokeWidth)
          ? circle.strokeWidth
          : DEFAULT_CIRCLE_STROKE_WIDTH,
      );

      overlayCtx.save();
      if (isPulsing) {
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.38)";
        overlayCtx.lineWidth = 7;
        overlayCtx.beginPath();
        overlayCtx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
        overlayCtx.stroke();
      }
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = strokeWidth + (isEmphasized ? 0.6 : 0);
      overlayCtx.beginPath();
      overlayCtx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
      overlayCtx.stroke();
      if (isEmphasized) {
        overlayCtx.setLineDash([6, 4]);
        overlayCtx.beginPath();
        overlayCtx.moveTo(center.x - radiusPx, center.y);
        overlayCtx.lineTo(center.x + radiusPx, center.y);
        overlayCtx.stroke();
        overlayCtx.setLineDash([]);
      }
      overlayCtx.fillStyle = color;
      overlayCtx.beginPath();
      overlayCtx.arc(center.x, center.y, isEmphasized ? 4.6 : 4, 0, Math.PI * 2);
      overlayCtx.fill();
      if (isEmphasized) {
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
        getCircleCanvasLabelText(
          circle,
          mmPerPixel,
          measurementUnit,
          showExpandedInfo,
        ),
        color,
        {
          bgOpacity: showExpandedInfo ? 0.72 : 0.34,
          borderOpacity: showExpandedInfo ? 0.96 : 0.82,
          fontSize: 9,
          paddingX: 4,
          paddingY: 2,
          radius: 4,
        },
      );
    }

    for (const item of hkaSets) {
      const measurement = getHkaMeasurementResult(item);
      const isSelected = item.id === selectedHkaId;
      const isHovered =
        hoveredMeasurementInfo?.type === "hka" &&
        hoveredMeasurementInfo.id === item.id;
      const isPulsing =
        selectionPulse?.type === "hka" && selectionPulse.id === item.id;
      const isEmphasized = isSelected || isPulsing;
      const showExpandedInfo = isSelected || isHovered;
      const lineColor = getHkaLineColor(item);
      const color = lineColor;
      if (item.mode === "fta") {
        if (
          !item.femurMidshaft10cm ||
          !item.femoralNotch ||
          !item.tibiaMidshaft4cm ||
          !item.tibiaMidshaft10cm
        ) {
          continue;
        }
        const femurShaft = imageToScreenPoint(
          item.femurMidshaft10cm.x,
          item.femurMidshaft10cm.y,
        );
        const notch = imageToScreenPoint(
          item.femoralNotch.x,
          item.femoralNotch.y,
        );
        const tibia4 = imageToScreenPoint(
          item.tibiaMidshaft4cm.x,
          item.tibiaMidshaft4cm.y,
        );
        const tibia10 = imageToScreenPoint(
          item.tibiaMidshaft10cm.x,
          item.tibiaMidshaft10cm.y,
        );
        const baseStrokeWidth = Math.max(
          1.2,
          Number.isFinite(item.strokeWidth)
            ? item.strokeWidth
            : DEFAULT_HKA_STROKE_WIDTH,
        );
        const strokeWidth = baseStrokeWidth + (isEmphasized ? 0.55 : 0);
        const labelAnchor = {
          x: (notch.x + tibia4.x) / 2,
          y: (notch.y + tibia4.y) / 2,
        };
        const labelOffsetX = Number.isFinite(item.labelOffsetX)
          ? item.labelOffsetX
          : DEFAULT_HKA_LABEL_OFFSET_X;
        const labelOffsetY = Number.isFinite(item.labelOffsetY)
          ? item.labelOffsetY
          : DEFAULT_HKA_LABEL_OFFSET_Y;

        overlayCtx.save();
        if (isPulsing) {
          overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.38)";
          overlayCtx.lineWidth = strokeWidth + 5.2;
          overlayCtx.lineCap = "round";
          overlayCtx.lineJoin = "round";
          overlayCtx.beginPath();
          overlayCtx.moveTo(femurShaft.x, femurShaft.y);
          overlayCtx.lineTo(notch.x, notch.y);
          overlayCtx.moveTo(tibia4.x, tibia4.y);
          overlayCtx.lineTo(tibia10.x, tibia10.y);
          overlayCtx.stroke();
        }
        overlayCtx.strokeStyle = color;
        overlayCtx.fillStyle = color;
        overlayCtx.lineWidth = strokeWidth;
        overlayCtx.lineCap = "round";
        overlayCtx.lineJoin = "round";
        overlayCtx.beginPath();
        overlayCtx.moveTo(femurShaft.x, femurShaft.y);
        overlayCtx.lineTo(notch.x, notch.y);
        overlayCtx.moveTo(tibia4.x, tibia4.y);
        overlayCtx.lineTo(tibia10.x, tibia10.y);
        overlayCtx.stroke();
        fillCircleMarkers(overlayCtx, [
          { x: femurShaft.x, y: femurShaft.y, radius: isEmphasized ? 4.2 : 3.6 },
          { x: notch.x, y: notch.y, radius: isEmphasized ? 4.8 : 4.2 },
          { x: tibia4.x, y: tibia4.y, radius: isEmphasized ? 4.8 : 4.2 },
          { x: tibia10.x, y: tibia10.y, radius: isEmphasized ? 4.2 : 3.6 },
        ]);
        overlayCtx.restore();

        drawTag(
          overlayCtx,
          labelAnchor.x + labelOffsetX,
          labelAnchor.y + labelOffsetY,
          getHkaCanvasLabelText(measurement, showExpandedInfo),
          color,
          {
            bgOpacity: showExpandedInfo ? 0.72 : 0.34,
            borderOpacity: showExpandedInfo ? 0.96 : 0.82,
            fontSize: 9,
            paddingX: 4,
            paddingY: 2,
            radius: 4,
          },
        );
        continue;
      }

      if (!item.hip || !item.knee || !item.ankle) continue;
      const hip = imageToScreenPoint(item.hip.x, item.hip.y);
      const knee = imageToScreenPoint(item.knee.x, item.knee.y);
      const ankle = imageToScreenPoint(item.ankle.x, item.ankle.y);
      const angleDeg = measurement.absoluteDeviation;
      const arcGeometry = getAngleArcGeometry(hip, knee, ankle);
      const showArc = item.showArc !== false;
      const labelOffsetX = Number.isFinite(item.labelOffsetX)
        ? item.labelOffsetX
        : DEFAULT_HKA_LABEL_OFFSET_X;
      const labelOffsetY = Number.isFinite(item.labelOffsetY)
        ? item.labelOffsetY
        : DEFAULT_HKA_LABEL_OFFSET_Y;
      const baseStrokeWidth = Math.max(
        1.2,
        Number.isFinite(item.strokeWidth)
          ? item.strokeWidth
          : DEFAULT_HKA_STROKE_WIDTH,
      );
      const strokeWidth = baseStrokeWidth + (isEmphasized ? 0.55 : 0);
      const kneeGap = isEmphasized ? 10 : 7;
      const hipVector = { x: hip.x - knee.x, y: hip.y - knee.y };
      const ankleVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      const hipLength = Math.hypot(hipVector.x, hipVector.y) || 1;
      const ankleLength = Math.hypot(ankleVector.x, ankleVector.y) || 1;
      const hipNearKnee = {
        x:
          knee.x +
          (hipVector.x / hipLength) * Math.min(kneeGap, hipLength * 0.35),
        y:
          knee.y +
          (hipVector.y / hipLength) * Math.min(kneeGap, hipLength * 0.35),
      };
      const ankleNearKnee = {
        x:
          knee.x +
          (ankleVector.x / ankleLength) * Math.min(kneeGap, ankleLength * 0.35),
        y:
          knee.y +
          (ankleVector.y / ankleLength) * Math.min(kneeGap, ankleLength * 0.35),
      };
      const assistGeometry =
        mobileHkaHandleAssist?.hkaId === item.id
          ? getMobileHkaHandleAssistGeometry(
              item,
              mobileHkaHandleAssist.handleKey,
            )
          : null;

      overlayCtx.save();
      if (assistGeometry) {
        overlayCtx.fillStyle = "rgba(226, 232, 240, 0.34)";
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistGeometry.centerX,
          assistGeometry.centerY,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.65)";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistGeometry.centerX,
          assistGeometry.centerY,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.stroke();
      }
      if (isPulsing) {
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.38)";
        overlayCtx.lineWidth = strokeWidth + 5.2;
        overlayCtx.lineCap = "round";
        overlayCtx.lineJoin = "round";
        overlayCtx.beginPath();
        overlayCtx.moveTo(hipNearKnee.x, hipNearKnee.y);
        overlayCtx.lineTo(hip.x, hip.y);
        overlayCtx.moveTo(ankleNearKnee.x, ankleNearKnee.y);
        overlayCtx.lineTo(ankle.x, ankle.y);
        overlayCtx.stroke();
      }
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = strokeWidth;
      overlayCtx.lineCap = "round";
      overlayCtx.lineJoin = "round";
      overlayCtx.beginPath();
      overlayCtx.moveTo(hipNearKnee.x, hipNearKnee.y);
      overlayCtx.lineTo(hip.x, hip.y);
      overlayCtx.moveTo(ankleNearKnee.x, ankleNearKnee.y);
      overlayCtx.lineTo(ankle.x, ankle.y);
      overlayCtx.stroke();

      if (showArc && arcGeometry) {
        overlayCtx.beginPath();
        overlayCtx.lineWidth = Math.max(
          1.05,
          strokeWidth - (isSelected ? 0.45 : 0.7),
        );
        overlayCtx.globalAlpha = isEmphasized ? 1 : 0.68;
        overlayCtx.arc(
          knee.x,
          knee.y,
          arcGeometry.radius,
          arcGeometry.startAngle,
          arcGeometry.endAngle,
          arcGeometry.counterclockwise,
        );
        overlayCtx.stroke();
        overlayCtx.globalAlpha = 1;
      }
      overlayCtx.fillStyle = color;
      fillCircleMarkers(overlayCtx, [
        { x: hip.x, y: hip.y, radius: isEmphasized ? 4.2 : 3.6 },
        { x: knee.x, y: knee.y, radius: isEmphasized ? 5 : 4.4 },
        { x: ankle.x, y: ankle.y, radius: isEmphasized ? 4.2 : 3.6 },
      ]);
      overlayCtx.restore();

      drawTag(
        overlayCtx,
        knee.x + labelOffsetX,
        knee.y + labelOffsetY,
        getHkaCanvasLabelText(measurement, showExpandedInfo),
        color,
        {
          bgOpacity: showExpandedInfo ? 0.72 : 0.34,
          borderOpacity: showExpandedInfo ? 0.96 : 0.82,
          fontSize: 9,
          paddingX: 4,
          paddingY: 2,
          radius: 4,
        },
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
      const color = guide.color || getPlanningGuideAutoColor(guide);

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
      const isPulsingGuide =
        selectionPulse?.type === "planning" &&
        selectionPulse.id === guide.id;
      const isEmphasizedGuide = isSelectedGuide || isPulsingGuide;
      const guideStyle = getPlanningGuideVisualStyle(guide);
      const baseStrokeWidth = Math.max(
        1.2,
        Number.isFinite(guide.strokeWidth)
          ? guide.strokeWidth
          : DEFAULT_PLANNING_GUIDE_STROKE_WIDTH,
      );
      const strokeWidth = baseStrokeWidth + (isEmphasizedGuide ? 0.6 : 0);

      overlayCtx.save();
      if (isPulsingGuide) {
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.34)";
        overlayCtx.lineWidth = strokeWidth + 4.4;
        overlayCtx.setLineDash(guideStyle.anchorDash);
        overlayCtx.beginPath();
        overlayCtx.moveTo(anchorStart.x, anchorStart.y);
        overlayCtx.lineTo(anchorEnd.x, anchorEnd.y);
        overlayCtx.stroke();
      }
      overlayCtx.strokeStyle = color;
      overlayCtx.fillStyle = color;
      overlayCtx.lineWidth = strokeWidth;
      overlayCtx.setLineDash(guideStyle.anchorDash);
      overlayCtx.beginPath();
      overlayCtx.moveTo(anchorStart.x, anchorStart.y);
      overlayCtx.lineTo(anchorEnd.x, anchorEnd.y);
      overlayCtx.stroke();

      overlayCtx.setLineDash(guideStyle.baseDash);
      overlayCtx.beginPath();
      overlayCtx.moveTo(baseA.x, baseA.y);
      overlayCtx.lineTo(baseB.x, baseB.y);
      overlayCtx.lineWidth = Math.max(1.1, strokeWidth - 0.2);
      overlayCtx.stroke();

      overlayCtx.setLineDash([]);
      overlayCtx.lineWidth = strokeWidth + 0.35;
      overlayCtx.beginPath();
      overlayCtx.moveTo(cutA.x, cutA.y);
      overlayCtx.lineTo(cutB.x, cutB.y);
      overlayCtx.stroke();

      overlayCtx.beginPath();
      overlayCtx.arc(
        anchorStart.x,
        anchorStart.y,
        isEmphasizedGuide ? 4.8 : 3.8,
        0,
        Math.PI * 2,
      );
      overlayCtx.arc(
        anchorEnd.x,
        anchorEnd.y,
        isEmphasizedGuide ? 4.8 : 3.8,
        0,
        Math.PI * 2,
      );
      overlayCtx.fill();
      const assistGeometry =
        mobilePlanningGuideHandleAssist?.guideId === guide.id
          ? getMobilePlanningGuideHandleAssistGeometry(
              guide,
              mobilePlanningGuideHandleAssist.handleKey,
            )
          : null;
      if (assistGeometry) {
        overlayCtx.fillStyle = "rgba(226, 232, 240, 0.34)";
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistGeometry.centerX,
          assistGeometry.centerY,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.65)";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.beginPath();
        overlayCtx.arc(
          assistGeometry.centerX,
          assistGeometry.centerY,
          MOBILE_LINE_HANDLE_ASSIST_RADIUS_SCREEN,
          0,
          Math.PI * 2,
        );
        overlayCtx.stroke();
        overlayCtx.fillStyle = color;
      }
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
                (isEmphasizedGuide ? 0.14 : 0),
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
    const secondarySelectedCutLayers = cutLayers.filter(
      (layer) =>
        selectedCutLayerIdsSet.has(layer.id) && layer.id !== selectedCutLayerId,
    );
    for (const layer of secondarySelectedCutLayers) {
      const corners = getLayerCorners(layer);
      const layerPalette = getLayerPalette(layer.id);
      overlayCtx.save();
      overlayCtx.strokeStyle = `${layerPalette.border}cc`;
      overlayCtx.lineWidth = 1.35;
      overlayCtx.setLineDash([6, 4]);
      overlayCtx.beginPath();
      const firstCorner = imageToScreenPoint(corners[0].x, corners[0].y);
      overlayCtx.moveTo(firstCorner.x, firstCorner.y);
      for (let index = 1; index < corners.length; index += 1) {
        const nextCorner = imageToScreenPoint(
          corners[index].x,
          corners[index].y,
        );
        overlayCtx.lineTo(nextCorner.x, nextCorner.y);
      }
      overlayCtx.closePath();
      overlayCtx.stroke();
      overlayCtx.restore();
    }
    if (activeCutLayer) {
      const isPulsingLayer =
        selectionPulse?.type === "layer" &&
        selectionPulse.id === activeCutLayer.id;
      const corners = getLayerCorners(activeCutLayer);
      const controlPoints = getLayerControlPoints(activeCutLayer);
      const edgePoints = controlPoints.filter((point) => point.type === "edge");
      const rotatePoint = controlPoints.find((point) => point.key === "rotate");
      overlayCtx.save();
      if (isPulsingLayer) {
        overlayCtx.strokeStyle = "rgba(248, 250, 252, 0.4)";
        overlayCtx.lineWidth = 8;
        overlayCtx.setLineDash([]);
        overlayCtx.beginPath();
        const pulseFirstCorner = imageToScreenPoint(corners[0].x, corners[0].y);
        overlayCtx.moveTo(pulseFirstCorner.x, pulseFirstCorner.y);
        for (let index = 1; index < corners.length; index += 1) {
          const nextCorner = imageToScreenPoint(
            corners[index].x,
            corners[index].y,
          );
          overlayCtx.lineTo(nextCorner.x, nextCorner.y);
        }
        overlayCtx.closePath();
        overlayCtx.stroke();
      }
      overlayCtx.strokeStyle = "#a855f7";
      overlayCtx.lineWidth = isPulsingLayer ? 2.8 : 2.2;
      overlayCtx.setLineDash([]);
      overlayCtx.beginPath();
      const firstCorner = imageToScreenPoint(corners[0].x, corners[0].y);
      overlayCtx.moveTo(firstCorner.x, firstCorner.y);
      for (let index = 1; index < corners.length; index += 1) {
        const nextCorner = imageToScreenPoint(
          corners[index].x,
          corners[index].y,
        );
        overlayCtx.lineTo(nextCorner.x, nextCorner.y);
      }
      overlayCtx.closePath();
      overlayCtx.stroke();

      overlayCtx.fillStyle = "#ffffff";
      overlayCtx.strokeStyle = "#a855f7";
      overlayCtx.lineWidth = 1.8;
      for (const corner of corners) {
        const screen = imageToScreenPoint(corner.x, corner.y);
        overlayCtx.beginPath();
        overlayCtx.arc(
          screen.x,
          screen.y,
          isPulsingLayer ? 8.2 : 7.4,
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        overlayCtx.stroke();
      }
      for (const edgePoint of edgePoints) {
        const screen = imageToScreenPoint(edgePoint.x, edgePoint.y);
        overlayCtx.save();
        overlayCtx.translate(screen.x, screen.y);
        overlayCtx.rotate((activeCutLayer.rotation * Math.PI) / 180);
        const isVertical = edgePoint.key === "ml" || edgePoint.key === "mr";
        const width = isVertical ? 8 : 20;
        const height = isVertical ? 20 : 8;
        overlayCtx.beginPath();
        overlayCtx.roundRect(-width / 2, -height / 2, width, height, 4);
        overlayCtx.fill();
        overlayCtx.stroke();
        overlayCtx.restore();
      }
      if (rotatePoint) {
        const bottomMiddle = imageToScreenPoint(
          controlPoints.find((point) => point.key === "bm").x,
          controlPoints.find((point) => point.key === "bm").y,
        );
        const rotateScreen = imageToScreenPoint(rotatePoint.x, rotatePoint.y);
        overlayCtx.beginPath();
        overlayCtx.moveTo(bottomMiddle.x, bottomMiddle.y);
        overlayCtx.lineTo(rotateScreen.x, rotateScreen.y - 16);
        overlayCtx.stroke();
        overlayCtx.beginPath();
        overlayCtx.arc(rotateScreen.x, rotateScreen.y, 16, 0, Math.PI * 2);
        overlayCtx.fill();
        overlayCtx.stroke();
        overlayCtx.save();
        overlayCtx.translate(rotateScreen.x, rotateScreen.y);
        overlayCtx.rotate(((activeCutLayer.rotation || 0) * Math.PI) / 180);
        overlayCtx.strokeStyle = "#111827";
        overlayCtx.lineWidth = 1.8;
        overlayCtx.beginPath();
        overlayCtx.arc(0, 0, 6.2, Math.PI * 0.15, Math.PI * 1.3);
        overlayCtx.stroke();
        overlayCtx.beginPath();
        overlayCtx.moveTo(4.5, -5.2);
        overlayCtx.lineTo(7.2, -8);
        overlayCtx.lineTo(7.6, -3.8);
        overlayCtx.stroke();
        overlayCtx.restore();
      }
      const maskScreenPoints = getLayerMaskScreenPoints(activeCutLayer);
      if (maskScreenPoints) {
        const screenMaskPoints = maskScreenPoints.map((point) =>
          imageToScreenPoint(point.x, point.y),
        );
        overlayCtx.strokeStyle = "rgba(168, 85, 247, 0.55)";
        overlayCtx.lineWidth = 1.4;
        overlayCtx.setLineDash([4, 4]);
        traceSmoothClosedPath(
          overlayCtx,
          screenMaskPoints,
          activeCutLayer.kind === "free-line"
            ? getFreeLineCurveStrength(activeCutLayer)
            : 0,
        );
        overlayCtx.stroke();

        if (activeCutLayer.kind === "free-line") {
          const vertexPoints = getFreeLineVertexPoints(activeCutLayer);
          const curveHandles =
            selectedFreeLinePointIndex !== null
              ? getFreeLineCurveHandles(
                  activeCutLayer,
                  selectedFreeLinePointIndex,
                )
              : [];
          overlayCtx.setLineDash([]);
          for (const point of vertexPoints) {
            const screen = imageToScreenPoint(point.x, point.y);
            const isActivePoint =
              point.pointIndex === selectedFreeLinePointIndex;
            overlayCtx.fillStyle = isActivePoint ? "#fef3c7" : "#ffffff";
            overlayCtx.strokeStyle = isActivePoint ? "#d97706" : "#a855f7";
            overlayCtx.lineWidth = isActivePoint ? 2 : 1.6;
            overlayCtx.beginPath();
            overlayCtx.arc(
              screen.x,
              screen.y,
              isActivePoint ? 6.2 : 5.4,
              0,
              Math.PI * 2,
            );
            overlayCtx.fill();
            overlayCtx.stroke();
          }
          overlayCtx.strokeStyle = "rgba(249, 115, 22, 0.75)";
          overlayCtx.lineWidth = 1.2;
          for (const handle of curveHandles) {
            const anchor = imageToScreenPoint(handle.anchorX, handle.anchorY);
            const screen = imageToScreenPoint(handle.x, handle.y);
            overlayCtx.beginPath();
            overlayCtx.moveTo(anchor.x, anchor.y);
            overlayCtx.lineTo(screen.x, screen.y);
            overlayCtx.stroke();
            overlayCtx.fillStyle =
              handle.handleKey === "in" ? "#fde68a" : "#fdba74";
            overlayCtx.strokeStyle = "#c2410c";
            overlayCtx.lineWidth = 1.5;
            overlayCtx.beginPath();
            overlayCtx.arc(screen.x, screen.y, 4.8, 0, Math.PI * 2);
            overlayCtx.fill();
            overlayCtx.stroke();
          }
        }
      }
      overlayCtx.restore();
    }

    if (snapToLandmarks && activeSnapTarget) {
      const snapPoint = imageToScreenPoint(activeSnapTarget.x, activeSnapTarget.y);
      overlayCtx.save();
      if (Array.isArray(activeSnapTarget.hintSegments)) {
        overlayCtx.strokeStyle = "rgba(245, 158, 11, 0.72)";
        overlayCtx.lineWidth = 1;
        overlayCtx.setLineDash(
          activeSnapTarget.type === "tangent" ? [5, 4] : [3, 4],
        );
        for (const segment of activeSnapTarget.hintSegments) {
          if (
            !Number.isFinite(segment?.x1) ||
            !Number.isFinite(segment?.y1) ||
            !Number.isFinite(segment?.x2) ||
            !Number.isFinite(segment?.y2)
          ) {
            continue;
          }
          const start = imageToScreenPoint(segment.x1, segment.y1);
          const end = imageToScreenPoint(segment.x2, segment.y2);
          overlayCtx.beginPath();
          overlayCtx.moveTo(start.x, start.y);
          overlayCtx.lineTo(end.x, end.y);
          overlayCtx.stroke();
        }
      }
      overlayCtx.strokeStyle = "#f59e0b";
      overlayCtx.fillStyle = "rgba(245, 158, 11, 0.14)";
      overlayCtx.lineWidth = 1.4;
      overlayCtx.setLineDash([4, 4]);
      overlayCtx.beginPath();
      overlayCtx.arc(snapPoint.x, snapPoint.y, isCoarsePointer ? 16 : 12, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.stroke();
      overlayCtx.setLineDash([]);
      overlayCtx.beginPath();
      overlayCtx.moveTo(snapPoint.x - 10, snapPoint.y);
      overlayCtx.lineTo(snapPoint.x + 10, snapPoint.y);
      overlayCtx.moveTo(snapPoint.x, snapPoint.y - 10);
      overlayCtx.lineTo(snapPoint.x, snapPoint.y + 10);
      overlayCtx.stroke();
      drawTag(
        overlayCtx,
        snapPoint.x,
        snapPoint.y - (isCoarsePointer ? 22 : 18),
        `SNAP ${activeSnapTarget.label}`,
        "#f59e0b",
        {
          bgOpacity: 0.78,
          borderOpacity: 0.96,
          fontSize: 8,
          paddingX: 4,
          paddingY: 1.5,
          radius: 999,
        },
      );
      overlayCtx.restore();
    }

    if (draftLine) {
      drawLine(draftLine, { color: "#fb7185", dashed: true, width: 2 });
    }

    if (draftFreeLine?.points?.length) {
      const color = draftFreeLine.fillColor || DEFAULT_FREE_LINE_COLOR;
      const isPointMode = draftFreeLine.drawMode === "point";
      const curveStrength = getFreeLineCurveStrength(draftFreeLine);
      const polygonPoints = Array.isArray(draftFreeLine.points)
        ? draftFreeLine.points
        : [];
      const hoverPoint = draftFreeLine.hoverPoint || null;
      const previewPoints = [...polygonPoints];
      const lastPoint = polygonPoints[polygonPoints.length - 1] || null;
      if (
        isPointMode &&
        hoverPoint &&
        lastPoint &&
        getDistance(lastPoint, hoverPoint) > 0.6
      ) {
        previewPoints.push(hoverPoint);
      }
      const canClose =
        isPointMode &&
        polygonPoints.length >= MIN_FREE_CUT_POINTS &&
        hoverPoint &&
        getDistance(polygonPoints[0], hoverPoint) <=
          FREE_CUT_CLOSE_RADIUS_SCREEN / view.scale;
      const screenPoints = previewPoints.map((point) =>
        imageToScreenPoint(point.x, point.y),
      );
      overlayCtx.save();
      overlayCtx.fillStyle = color;
      overlayCtx.strokeStyle = color;
      overlayCtx.globalAlpha = canClose ? 0.18 : 0.12;
      if (
        screenPoints.length >= MIN_FREE_CUT_POINTS &&
        (!isPointMode || canClose)
      ) {
        traceSmoothClosedPath(overlayCtx, screenPoints, curveStrength);
        overlayCtx.fill();
      }
      overlayCtx.globalAlpha = 1;
      overlayCtx.lineWidth = 1.8;
      if (screenPoints.length > 0) {
        if (isPointMode && !canClose) {
          overlayCtx.beginPath();
          overlayCtx.moveTo(screenPoints[0].x, screenPoints[0].y);
          for (let index = 1; index < screenPoints.length; index += 1) {
            overlayCtx.lineTo(screenPoints[index].x, screenPoints[index].y);
          }
        } else {
          traceSmoothClosedPath(overlayCtx, screenPoints, curveStrength);
        }
        overlayCtx.stroke();
      }
      overlayCtx.fillStyle = color;
      for (let index = 0; index < polygonPoints.length; index += 1) {
        const point = imageToScreenPoint(
          polygonPoints[index].x,
          polygonPoints[index].y,
        );
        const isStartPoint = isPointMode && index === 0;
        overlayCtx.beginPath();
        overlayCtx.arc(
          point.x,
          point.y,
          isStartPoint ? 4.8 : 2.8,
          0,
          Math.PI * 2,
        );
        overlayCtx.fill();
        if (isStartPoint) {
          overlayCtx.strokeStyle = "#f8fafc";
          overlayCtx.lineWidth = 1.4;
          overlayCtx.stroke();
          overlayCtx.strokeStyle = color;
          overlayCtx.lineWidth = 1.8;
        }
      }
      overlayCtx.restore();

      if (isPointMode) {
        const labelSource =
          hoverPoint ||
          polygonPoints[polygonPoints.length - 1] ||
          polygonPoints[0];
        if (labelSource) {
          const labelAnchor = imageToScreenPoint(labelSource.x, labelSource.y);
          drawTag(
            overlayCtx,
            labelAnchor.x,
            labelAnchor.y - 16,
            canClose
              ? "Free Line: klik titik awal"
              : `Free Line: ${polygonPoints.length} titik`,
            color,
          );
        }
      }
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

    if (draftCenterFinderPoints.length > 0) {
      overlayCtx.save();
      overlayCtx.strokeStyle = "#0f766e";
      overlayCtx.fillStyle = "#0f766e";
      overlayCtx.lineWidth = 1.8;
      for (let i = 0; i < draftCenterFinderPoints.length; i += 1) {
        const pointItem = imageToScreenPoint(
          draftCenterFinderPoints[i].x,
          draftCenterFinderPoints[i].y,
        );
        overlayCtx.beginPath();
        overlayCtx.arc(pointItem.x, pointItem.y, 3.8, 0, Math.PI * 2);
        overlayCtx.fill();
        if (i > 0) {
          const prev = imageToScreenPoint(
            draftCenterFinderPoints[i - 1].x,
            draftCenterFinderPoints[i - 1].y,
          );
          overlayCtx.beginPath();
          overlayCtx.moveTo(prev.x, prev.y);
          overlayCtx.lineTo(pointItem.x, pointItem.y);
          overlayCtx.stroke();
        }
      }
      overlayCtx.restore();

      const anchor = draftCenterFinderPoints[draftCenterFinderPoints.length - 1];
      const screenAnchor = imageToScreenPoint(anchor.x, anchor.y);
      drawTag(
        overlayCtx,
        screenAnchor.x,
        screenAnchor.y - 16,
        `Center Finder: ${draftCenterFinderPoints.length}/3 titik`,
        "#0f766e",
      );
    }

    if (draftAxisBuilderPoints.length > 0) {
      overlayCtx.save();
      overlayCtx.strokeStyle = "#0ea5e9";
      overlayCtx.fillStyle = "#0ea5e9";
      overlayCtx.lineWidth = 1.8;
      for (let i = 0; i < draftAxisBuilderPoints.length; i += 1) {
        const pointItem = imageToScreenPoint(
          draftAxisBuilderPoints[i].x,
          draftAxisBuilderPoints[i].y,
        );
        overlayCtx.beginPath();
        overlayCtx.arc(pointItem.x, pointItem.y, 3.8, 0, Math.PI * 2);
        overlayCtx.fill();
      }
      if (draftAxisBuilderPoints.length >= 2) {
        const a = imageToScreenPoint(
          draftAxisBuilderPoints[0].x,
          draftAxisBuilderPoints[0].y,
        );
        const b = imageToScreenPoint(
          draftAxisBuilderPoints[1].x,
          draftAxisBuilderPoints[1].y,
        );
        overlayCtx.beginPath();
        overlayCtx.moveTo(a.x, a.y);
        overlayCtx.lineTo(b.x, b.y);
        overlayCtx.stroke();
      }
      if (draftAxisBuilderPoints.length >= 4) {
        const c = imageToScreenPoint(
          draftAxisBuilderPoints[2].x,
          draftAxisBuilderPoints[2].y,
        );
        const d = imageToScreenPoint(
          draftAxisBuilderPoints[3].x,
          draftAxisBuilderPoints[3].y,
        );
        overlayCtx.beginPath();
        overlayCtx.moveTo(c.x, c.y);
        overlayCtx.lineTo(d.x, d.y);
        overlayCtx.stroke();
      } else if (draftAxisBuilderPoints.length === 3) {
        const c = imageToScreenPoint(
          draftAxisBuilderPoints[2].x,
          draftAxisBuilderPoints[2].y,
        );
        overlayCtx.beginPath();
        overlayCtx.arc(c.x, c.y, 4.4, 0, Math.PI * 2);
        overlayCtx.stroke();
      }
      overlayCtx.restore();

      const anchor = draftAxisBuilderPoints[draftAxisBuilderPoints.length - 1];
      const screenAnchor = imageToScreenPoint(anchor.x, anchor.y);
      drawTag(
        overlayCtx,
        screenAnchor.x,
        screenAnchor.y - 16,
        `Axis Builder: ${draftAxisBuilderPoints.length}/4 titik`,
        "#0ea5e9",
      );
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

    if (guideBuilderPreviewPoint && guideBuilderReference?.line) {
      const previewLine = buildGuideLineFromReference(
        guideBuilderReference.line,
        guideBuilderPreviewPoint,
        guideBuilderMode,
      );
      if (previewLine) {
        const start = imageToScreenPoint(previewLine.x1, previewLine.y1);
        const end = imageToScreenPoint(previewLine.x2, previewLine.y2);
        const anchor = imageToScreenPoint(
          guideBuilderPreviewPoint.x,
          guideBuilderPreviewPoint.y,
        );
        overlayCtx.save();
        overlayCtx.strokeStyle =
          guideBuilderMode === "parallel" ? "#0ea5e9" : "#f59e0b";
        overlayCtx.lineWidth = 1.6;
        overlayCtx.setLineDash(guideBuilderMode === "parallel" ? [10, 4] : [4, 5]);
        overlayCtx.beginPath();
        overlayCtx.moveTo(start.x, start.y);
        overlayCtx.lineTo(end.x, end.y);
        overlayCtx.stroke();
        overlayCtx.setLineDash([]);
        overlayCtx.fillStyle =
          guideBuilderMode === "parallel" ? "#0ea5e9" : "#f59e0b";
        overlayCtx.beginPath();
        overlayCtx.arc(anchor.x, anchor.y, 4.2, 0, Math.PI * 2);
        overlayCtx.fill();
        overlayCtx.restore();
        drawTag(
          overlayCtx,
          anchor.x,
          anchor.y - 18,
          `${guideBuilderMode === "parallel" ? "Parallel" : "Perpendicular"} Guide`,
          guideBuilderMode === "parallel" ? "#0ea5e9" : "#f59e0b",
        );
      }
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
    activeSnapTarget,
    angles,
    calibrationMode,
    calibrationLineId,
    calibrationReferenceLine,
    circles,
    contrast,
    cropRect,
    draftAnglePoints,
    draftAxisBuilderPoints,
    draftCenterFinderPoints,
    draftCirclePoints,
    draftCut,
    draftFreeLine,
    draftHkaPoints,
    draftLine,
    freeLineMode,
    guideBuilderMode,
    guideBuilderPreviewPoint,
    guideBuilderReference,
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
    getMobileAngleHandleAssistGeometry,
    getMobileHandleAssistGeometry,
    getMobileHkaHandleAssistGeometry,
    getMobilePlanningGuideHandleAssistGeometry,
    getLineVisualStyle,
    getPlanningGuideVisualStyle,
    getPlanningGuideAutoColor,
    getPlanningGuideLabelText,
    isLineLocked,
    measurementUnit,
    mmPerPixel,
    mobileHandleAssist,
    mobileAngleHandleAssist,
    mobileHkaHandleAssist,
    mobilePlanningGuideHandleAssist,
    modelHeight,
    modelWidth,
    orientedSize.height,
    orientedSize.width,
    rotation,
    selectionPulse,
    selectedAngleId,
    selectedCircleId,
    selectedCutLayerId,
    selectedCutLayerIdsSet,
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
      setDraftCenterFinderPoints([]);
      setDraftAxisBuilderPoints([]);
      setDraftHkaPoints([]);
      setDraftFreeLine(null);
      setDraftFreeLineTargetLayerId(null);
      setGuideBuilderPreviewPoint(null);
      setGuideBuilderMode("parallel");
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
      autoScaleFromCalibration = false,
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
      const templateRulerScale =
        autoScaleFromCalibration && mmPerPixel !== null && !shouldMatchBase
          ? estimateTemplateRulerPxPerMm(layerImage)
          : null;
      const calibratedDisplayWidth = templateRulerScale
        ? clamp(
            srcW / templateRulerScale.pxPerMm / mmPerPixel,
            18,
            Math.max(18, modelWidth * 3),
          )
        : null;
      const calibratedDisplayHeight = templateRulerScale
        ? clamp(
            srcH / templateRulerScale.pxPerMm / mmPerPixel,
            18,
            Math.max(18, modelHeight * 3),
          )
        : null;
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
      const displayWidth =
        calibratedDisplayWidth !== null
          ? calibratedDisplayWidth
          : inheritedTemplateSize
            ? Math.max(18, inheritedTemplateSize.width)
            : shouldMatchBase || sameCanvasSize
              ? modelWidth
              : Math.max(18, srcW * scale);
      const displayHeight =
        calibratedDisplayHeight !== null
          ? calibratedDisplayHeight
          : inheritedTemplateSize
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
        contrast: 100,
        level: 100,
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
      const calibrationText = autoScaleFromCalibration
        ? mmPerPixel === null
          ? " Kalibrasi belum aktif: klik Calib/Ruler, pilih atau buat garis kalibrasi, isi nilai real, lalu Simpan Kalibrasi."
          : templateRulerScale
            ? ` Scale implant otomatis mengikuti garis kalibrasi aktif dari ruler template ${templateRulerScale.axis}.`
            : " Ruler template tidak terbaca otomatis; pilih layer lalu pakai Ruler atau isi Scale real manual."
        : "";
      setNotice(
        (noticeText ||
          `Layer "${nextLayer.name}" ditambahkan di atas layer bawah.`) +
          trimText +
          calibrationText,
      );
      return true;
    },
    [
      cutLayers,
      focusLayerSettings,
      getIdleTool,
      image,
      isMobileViewport,
      mmPerPixel,
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
      if (
        overlayCanvasRef.current &&
        Number.isFinite(event.pointerId) &&
        !overlayCanvasRef.current.hasPointerCapture?.(event.pointerId)
      ) {
        try {
          overlayCanvasRef.current.setPointerCapture(event.pointerId);
          activePointerIdRef.current = event.pointerId;
        } catch {
          activePointerIdRef.current = null;
        }
      }
      interactionCanvasRectRef.current =
        overlayCanvasRef.current?.getBoundingClientRect() || null;
      const point = getLocalPoint(event);
      const imagePoint = screenToImagePoint(point.x, point.y);
      const boundedPoint = clampToImageBounds(imagePoint);
      const snappedPlacementPoint =
        resolveSnappedImagePoint(boundedPoint).point;
      const isTouchLikePointer =
        event.pointerType === "touch" ||
        (isCoarsePointer && event.button === 0);
      const isAdditiveLayerSelection =
        !isTouchLikePointer &&
        (event.shiftKey || event.metaKey || event.ctrlKey);

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
          triggerSelectionPulse("line", targetLine.id);
          if (isLineLocked(targetLine.id)) {
            setNotice("Garis ini terkunci. Unlock dulu sebelum di-adjust.");
            return;
          }
          const assistGeometry = getMobileHandleAssistGeometry(
            targetLine,
            assistHandleHit.handleKey,
          );
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-handle",
            lineId: targetLine.id,
            handleKey: assistHandleHit.handleKey,
            pointerOffsetX: assistGeometry
              ? assistGeometry.handleImagePoint.x - boundedPoint.x
              : 0,
            pointerOffsetY: assistGeometry
              ? assistGeometry.handleImagePoint.y - boundedPoint.y
              : 0,
          };
          setNotice(
            "Adjust ujung line aktif. Geser dari area bundaran, titik handle tetap terlihat dan tidak dipaksa ke tengah jari.",
          );
          return;
        }

        const assistAngleHandleHit = findMobileAngleHandleAssistHit(point);
        if (assistAngleHandleHit) {
          const targetAngle = angles.find(
            (angle) => angle.id === assistAngleHandleHit.angleId,
          );
          if (!targetAngle) return;
          setMobilePanelMode("workspace");
          setActiveRightPanel("measure");
          setSelectedAngleId(targetAngle.id);
          setSelectedLineId(null);
          setSelectedFreeLinePointIndex(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedCutLayerId(null);
          setSelectedPlanningGuideId(null);
          triggerSelectionPulse("angle", targetAngle.id);
          clearMobileHandleAssist();
          clearMobilePlanningGuideHandleAssist();
          setHistoryPaused(true);
          const assistGeometry = getMobileAngleHandleAssistGeometry(
            targetAngle,
            assistAngleHandleHit.handleKey,
          );
          interactionRef.current = {
            mode: "move-angle-handle",
            angleId: targetAngle.id,
            handleKey: assistAngleHandleHit.handleKey,
            pointerOffsetX: assistGeometry
              ? assistGeometry.handleImagePoint.x - boundedPoint.x
              : 0,
            pointerOffsetY: assistGeometry
              ? assistGeometry.handleImagePoint.y - boundedPoint.y
              : 0,
          };
          setNotice(
            "Adjust titik angle aktif. Geser dari area bundaran agar titik tetap terlihat.",
          );
          return;
        }

        const assistHkaHandleHit = findMobileHkaHandleAssistHit(point);
        if (assistHkaHandleHit) {
          const targetItem = hkaSets.find(
            (item) => item.id === assistHkaHandleHit.hkaId,
          );
          if (!targetItem) return;
          setMobilePanelMode("workspace");
          setActiveRightPanel("measure");
          setSelectedHkaId(targetItem.id);
          setSelectedLineId(null);
          setSelectedFreeLinePointIndex(null);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedCutLayerId(null);
          setSelectedPlanningGuideId(null);
          triggerSelectionPulse("hka", targetItem.id);
          clearMobileHandleAssist();
          clearMobilePlanningGuideHandleAssist();
          setHistoryPaused(true);
          const assistGeometry = getMobileHkaHandleAssistGeometry(
            targetItem,
            assistHkaHandleHit.handleKey,
          );
          interactionRef.current = {
            mode: "move-hka-handle",
            hkaId: targetItem.id,
            handleKey: assistHkaHandleHit.handleKey,
            pointerOffsetX: assistGeometry
              ? assistGeometry.handleImagePoint.x - boundedPoint.x
              : 0,
            pointerOffsetY: assistGeometry
              ? assistGeometry.handleImagePoint.y - boundedPoint.y
              : 0,
          };
          setNotice(
            "Adjust titik HKA aktif. Geser dari area bundaran agar landmark tetap terlihat.",
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
          triggerSelectionPulse("line", targetLine.id);
          if (isLineLocked(targetLine.id)) {
            setNotice("Garis ini terkunci. Unlock dulu sebelum di-adjust.");
            return;
          }
          activateMobileHandleAssist(targetLine.id, hitHandle.handleKey);
          if (isMobileViewport) {
            setMobileControlsOpen(false);
          }
          setNotice(
            "Ujung line dipilih. Bundaran assist aktif, sentuh area putih bundaran untuk adjust tanpa menutupi titik handle.",
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
          triggerSelectionPulse("line", hitLineId);
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

      if (tool === "cut") {
        const closeRadius = FREE_CUT_CLOSE_RADIUS_SCREEN / view.scale;

        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);

        if (draftCut?.points?.length) {
          const startPoint = draftCut.points[0];
          if (
            draftCut.points.length < MIN_FREE_CUT_POINTS &&
            getDistance(startPoint, snappedPlacementPoint) <= closeRadius
          ) {
            setNotice(
              `Free cut: pilih ${MIN_FREE_CUT_POINTS - draftCut.points.length} titik lagi.`,
            );
            return;
          }
          if (
            draftCut.points.length >= MIN_FREE_CUT_POINTS &&
            getDistance(startPoint, snappedPlacementPoint) <= closeRadius
          ) {
            completeDraftCut();
            return;
          }

          const lastPoint = draftCut.points[draftCut.points.length - 1];
          if (getDistance(lastPoint, snappedPlacementPoint) <= 1.5) {
            return;
          }

          const nextPoints = [...draftCut.points, snappedPlacementPoint];
          setDraftCut({
            points: nextPoints,
            hoverPoint: snappedPlacementPoint,
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
          points: [snappedPlacementPoint],
          hoverPoint: snappedPlacementPoint,
        });
        setHistoryPaused(true);
        setNotice(
          "Free cut: klik beberapa titik mengikuti bentuk objek, lalu klik titik awal atau tekan Enter untuk selesai.",
        );
        return;
      }

      if (tool === "pan") {
        const hitFreeLineCurveHandle = findFreeLineCurveHandle(imagePoint);
        if (hitFreeLineCurveHandle) {
          const targetLayer = cutLayers.find(
            (layer) => layer.id === hitFreeLineCurveHandle.layerId,
          );
          if (!targetLayer) return;
          focusLayerCanvas(targetLayer.id);
          setSelectedFreeLinePointIndex(hitFreeLineCurveHandle.pointIndex);
          setSelectedLineId(null);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedPlanningGuideId(null);
          triggerSelectionPulse("layer", targetLayer.id);
          clearMobileHandleAssist();
          clearMobilePlanningGuideHandleAssist();
          syncMobileCanvasSelection("tool");
          if (targetLayer.lockScale) {
            setNotice("Layer terkunci. Buka lock dulu untuk edit lengkungan.");
            return;
          }
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-free-line-curve-handle",
            layerId: targetLayer.id,
            pointIndex: hitFreeLineCurveHandle.pointIndex,
            handleKey: hitFreeLineCurveHandle.handleKey,
          };
          setNotice(
            "Handle lengkung aktif. Geser bebas 360 derajat untuk mencari rounded yang paling pas.",
          );
          return;
        }

        const hitFreeLinePointHandle = findFreeLinePointHandle(imagePoint);
        if (hitFreeLinePointHandle) {
          const targetLayer = cutLayers.find(
            (layer) => layer.id === hitFreeLinePointHandle.layerId,
          );
          if (!targetLayer) return;
          focusLayerCanvas(targetLayer.id);
          setSelectedFreeLinePointIndex(hitFreeLinePointHandle.pointIndex);
          setSelectedLineId(null);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedPlanningGuideId(null);
          triggerSelectionPulse("layer", targetLayer.id);
          clearMobileHandleAssist();
          clearMobilePlanningGuideHandleAssist();
          syncMobileCanvasSelection("tool");
          if (targetLayer.lockScale) {
            setNotice("Layer terkunci. Buka lock dulu untuk edit titik shape.");
            return;
          }
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-free-line-point",
            layerId: targetLayer.id,
            pointIndex: hitFreeLinePointHandle.pointIndex,
          };
          setNotice(
            "Edit titik Free Line aktif. Geser vertex untuk membentuk ulang shape.",
          );
          return;
        }

        const hitCutLayerHandle = findCutLayerHandle(imagePoint);
        if (hitCutLayerHandle) {
          const targetLayer = cutLayers.find(
            (layer) => layer.id === hitCutLayerHandle.layerId,
          );
          if (!targetLayer) return;
          focusLayerCanvas(targetLayer.id);
          setSelectedFreeLinePointIndex(null);
          setSelectedLineId(null);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedPlanningGuideId(null);
          triggerSelectionPulse("layer", targetLayer.id);
          clearMobileHandleAssist();
          clearMobilePlanningGuideHandleAssist();
          syncMobileCanvasSelection("tool");
          if (targetLayer.lockScale) {
            setNotice(
              "Layer terkunci. Buka lock dulu untuk resize atau rotate.",
            );
            return;
          }
          setHistoryPaused(true);
          if (hitCutLayerHandle.handleKey === "rotate") {
            const localPoint = toLayerLocal(imagePoint, targetLayer);
            interactionRef.current = {
              mode: "rotate-cut-layer",
              layerId: targetLayer.id,
              startPointerAngle: Math.atan2(localPoint.y, localPoint.x),
              startRotation: Number(targetLayer.rotation || 0),
            };
            return;
          }
          interactionRef.current = {
            mode: "resize-cut-layer",
            layerId: targetLayer.id,
            centerX: targetLayer.centerX,
            centerY: targetLayer.centerY,
            rotation: targetLayer.rotation,
            handleKey: hitCutLayerHandle.handleKey,
            startFlipX: Boolean(targetLayer.flipX),
            startFlipY: Boolean(targetLayer.flipY),
            startDisplayWidth: Number(targetLayer.displayWidth || 16),
            startDisplayHeight: Number(targetLayer.displayHeight || 16),
          };
          return;
        }

        const hitCutLayerId = findCutLayerByPoint(imagePoint);
        if (hitCutLayerId !== null) {
          const targetLayer = cutLayers.find(
            (layer) => layer.id === hitCutLayerId,
          );
          if (!targetLayer) return;
          selectLayerFromCanvas(hitCutLayerId, {
            additive: isAdditiveLayerSelection,
            includeGroup: !isAdditiveLayerSelection,
          });
          setSelectedFreeLinePointIndex(null);
          setSelectedLineId(null);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedPlanningGuideId(null);
          triggerSelectionPulse("layer", targetLayer.id);
          clearMobileHandleAssist();
          clearMobilePlanningGuideHandleAssist();
          syncMobileCanvasSelection("tool");
          if (isAdditiveLayerSelection) {
            setNotice(
              selectedCutLayerIdsSet.has(targetLayer.id)
                ? `Layer #${targetLayer.id} dilepas dari multi-select.`
                : `Layer #${targetLayer.id} ditambahkan ke multi-select.`,
            );
            return;
          }
          if (targetLayer.lockScale) {
            setNotice("Layer terkunci. Buka lock dulu untuk memindahkan.");
            return;
          }
          const selectedMoveLayerIds = selectedCutLayerIdsSet.has(targetLayer.id)
            ? selectedCutLayerIds
            : getRelatedLayerIds(targetLayer.id, { includeGroup: true });
          const movableLayerIds = selectedMoveLayerIds.filter((layerId) => {
            const layer = cutLayers.find((item) => item.id === layerId);
            return layer && !layer.lockScale;
          });
          if (!movableLayerIds.length) {
            setNotice("Layer terkunci. Buka lock dulu untuk memindahkan.");
            return;
          }
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-cut-layer",
            layerIds: movableLayerIds,
            startImageX: imagePoint.x,
            startImageY: imagePoint.y,
            origins: movableLayerIds.map((layerId) => {
              const layer = cutLayers.find((item) => item.id === layerId);
              return {
                layerId,
                originCenterX: Number(layer?.centerX || 0),
                originCenterY: Number(layer?.centerY || 0),
              };
            }),
          };
          return;
        }
      }

      const hitPlanningGuideLabelId = findPlanningGuideLabelByPoint(point);
      if (hitPlanningGuideLabelId !== null) {
        const targetGuide = planningGuides.find(
          (guide) => guide.id === hitPlanningGuideLabelId,
        );
        if (!targetGuide) return;
        if (isTouchLikePointer) {
          focusPlanningGuideCanvas(targetGuide.id, {
            openPanel: true,
            showNotice: true,
          });
          clearMobileHandleAssist();
        } else {
          selectPlanningGuideForEdit(targetGuide.id);
        }
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        triggerSelectionPulse("planning", targetGuide.id);
        clearMobilePlanningGuideHandleAssist();
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

      const assistPlanningGuideHandleHit =
        findMobilePlanningGuideHandleAssistHit(point);
      if (assistPlanningGuideHandleHit) {
        const targetGuide = planningGuides.find(
          (guide) => guide.id === assistPlanningGuideHandleHit.guideId,
        );
        if (!targetGuide) return;
        focusPlanningGuideCanvas(targetGuide.id);
        triggerSelectionPulse("planning", targetGuide.id);
        clearMobileHandleAssist();
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        clearMobilePlanningGuideHandleAssist();
        const assistGeometry = getMobilePlanningGuideHandleAssistGeometry(
          targetGuide,
          assistPlanningGuideHandleHit.handleKey,
        );
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-planning-guide-handle",
          guideId: targetGuide.id,
          handleKey: assistPlanningGuideHandleHit.handleKey,
          pointerOffsetX: assistGeometry
            ? assistGeometry.handleImagePoint.x - boundedPoint.x
            : 0,
          pointerOffsetY: assistGeometry
            ? assistGeometry.handleImagePoint.y - boundedPoint.y
            : 0,
        };
        setNotice(
          "Adjust planning guide aktif. Geser dari area bundaran, titik handle tetap terlihat.",
        );
        return;
      }

      const hitPlanningGuideHandle = findClosestPlanningGuideHandle(imagePoint);
      if (hitPlanningGuideHandle) {
        const targetGuide = planningGuides.find(
          (guide) => guide.id === hitPlanningGuideHandle.guideId,
        );
        if (!targetGuide) return;
        if (isTouchLikePointer) {
          focusPlanningGuideCanvas(targetGuide.id);
          triggerSelectionPulse("planning", targetGuide.id);
          clearMobileHandleAssist();
          activateMobilePlanningGuideHandleAssist(
            targetGuide.id,
            hitPlanningGuideHandle.handleKey,
          );
          if (isMobileViewport) {
            setMobileControlsOpen(false);
          }
          setNotice(
            "Ujung planning guide dipilih. Bundaran assist aktif untuk Distal Cut, Tibial Cut, dan Tibial Slope.",
          );
          return;
        }
        selectPlanningGuideForEdit(targetGuide.id);
        triggerSelectionPulse("planning", targetGuide.id);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        clearMobilePlanningGuideHandleAssist();
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
        if (isTouchLikePointer) {
          focusPlanningGuideCanvas(targetGuide.id, {
            openPanel: true,
            showNotice: true,
          });
          triggerSelectionPulse("planning", targetGuide.id);
          clearMobileHandleAssist();
          clearMobilePlanningGuideHandleAssist();
        } else {
          selectPlanningGuideForEdit(targetGuide.id);
          triggerSelectionPulse("planning", targetGuide.id);
        }
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        clearMobilePlanningGuideHandleAssist();
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
      if (hitLineLabelId !== null) {
        const targetLine = lines.find((line) => line.id === hitLineLabelId);
        if (!targetLine) return;
        if (targetLine.type) {
          setLinePreset(targetLine.type);
        }
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedLineId(targetLine.id);
        setSelectedPlanningGuideId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedFreeLinePointIndex(null);
        triggerSelectionPulse("line", targetLine.id);
        clearMobileHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("measure");
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

      const hitAngleLabelId = findAngleLabelByPoint(point);
      if (hitAngleLabelId !== null) {
        const targetAngle = angles.find((angle) => angle.id === hitAngleLabelId);
        if (!targetAngle) return;
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedAngleId(targetAngle.id);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        triggerSelectionPulse("angle", targetAngle.id);
        clearMobileHandleAssist();
        clearMobileAngleHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        if (isMobileViewport) {
          setMobileControlsOpen(false);
        }
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-angle-label",
          angleId: targetAngle.id,
          startX: point.x,
          startY: point.y,
          originOffsetX: Number.isFinite(targetAngle.labelOffsetX)
            ? targetAngle.labelOffsetX
            : DEFAULT_ANGLE_LABEL_OFFSET_X,
          originOffsetY: Number.isFinite(targetAngle.labelOffsetY)
            ? targetAngle.labelOffsetY
            : DEFAULT_ANGLE_LABEL_OFFSET_Y,
        };
        setNotice("Hasil angle aktif. Geser label hasil untuk memindahkannya.");
        return;
      }

      const hitHkaLabelId = findHkaLabelByPoint(point);
      if (hitHkaLabelId !== null) {
        const targetItem = hkaSets.find((item) => item.id === hitHkaLabelId);
        if (!targetItem) return;
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedHkaId(targetItem.id);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        triggerSelectionPulse("hka", targetItem.id);
        clearMobileHandleAssist();
        clearMobileHkaHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        if (isMobileViewport) {
          setMobileControlsOpen(false);
        }
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-hka-label",
          hkaId: targetItem.id,
          startX: point.x,
          startY: point.y,
          originOffsetX: Number.isFinite(targetItem.labelOffsetX)
            ? targetItem.labelOffsetX
            : DEFAULT_HKA_LABEL_OFFSET_X,
          originOffsetY: Number.isFinite(targetItem.labelOffsetY)
            ? targetItem.labelOffsetY
            : DEFAULT_HKA_LABEL_OFFSET_Y,
        };
        setNotice("Hasil HKA aktif. Geser label hasil untuk memindahkannya.");
        return;
      }

      const genericHitHandle = findClosestHandle(imagePoint);
      if (genericHitHandle) {
        const targetLine = lines.find(
          (line) => line.id === genericHitHandle.lineId,
        );
        if (targetLine?.type) {
          setLinePreset(targetLine.type);
        }
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedLineId(genericHitHandle.lineId);
        setSelectedPlanningGuideId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedFreeLinePointIndex(null);
        triggerSelectionPulse("line", genericHitHandle.lineId);
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("measure");
        if (isLineLocked(genericHitHandle.lineId)) {
          setNotice(
            "Garis ini terkunci. Buka lock dulu untuk mengubah ukuran/posisi.",
          );
          return;
        }
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-handle",
          lineId: genericHitHandle.lineId,
          handleKey: genericHitHandle.handleKey,
        };
        return;
      }

      const genericHitLineId = findClosestLineId(imagePoint);
      if (genericHitLineId !== null) {
        const targetLine = lines.find((line) => line.id === genericHitLineId);
        if (!targetLine) return;
        if (targetLine.type) {
          setLinePreset(targetLine.type);
        }
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedLineId(genericHitLineId);
        setSelectedPlanningGuideId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedFreeLinePointIndex(null);
        triggerSelectionPulse("line", genericHitLineId);
        clearMobileHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("measure");
        if (isLineLocked(genericHitLineId)) {
          setNotice(
            "Garis ini terkunci. Buka lock dulu untuk mengubah ukuran/posisi.",
          );
          return;
        }
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "move-line",
          lineId: genericHitLineId,
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

      const genericAngleHandle = findClosestAngleHandle(boundedPoint);
      if (genericAngleHandle) {
        const targetAngle = angles.find(
          (angle) => angle.id === genericAngleHandle.angleId,
        );
        if (!targetAngle) return;
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedAngleId(targetAngle.id);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        triggerSelectionPulse("angle", targetAngle.id);
        clearMobileHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        if (isTouchLikePointer) {
          activateMobileAngleHandleAssist(
            targetAngle.id,
            genericAngleHandle.handleKey,
          );
          syncMobileCanvasSelection("measure", {
            noticeText:
              "Titik angle dipilih. Bundaran assist aktif untuk adjust yang lebih presisi.",
          });
          return;
        }
        syncMobileCanvasSelection("measure");
        if (tool === "pan" || tool === "angle") {
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-angle-handle",
            angleId: genericAngleHandle.angleId,
            handleKey: genericAngleHandle.handleKey,
          };
        }
        return;
      }

      const genericAngleId = findClosestAngleId(imagePoint);
      if (genericAngleId !== null) {
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedAngleId(genericAngleId);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        triggerSelectionPulse("angle", genericAngleId);
        clearMobileHandleAssist();
        clearMobileAngleHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("measure", {
          noticeText: "Angle aktif. Tap titik atau drag untuk atur ulang.",
        });
        return;
      }

      const genericCircleHandle = findClosestCircleHandle(boundedPoint);
      if (genericCircleHandle) {
        const targetCircle = circles.find(
          (circle) => circle.id === genericCircleHandle.circleId,
        );
        if (!targetCircle) return;
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedCircleId(targetCircle.id);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        triggerSelectionPulse("circle", targetCircle.id);
        clearMobileHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("measure", {
          noticeText: "Circle dipilih. Drag pusat atau tepi untuk adjust.",
        });
        if (tool === "pan" || tool === "circle") {
          setHistoryPaused(true);
          if (
            genericCircleHandle.handleKey === "center" ||
            genericCircleHandle.handleKey === "move"
          ) {
            interactionRef.current = {
              mode: "move-circle-center",
              circleId: genericCircleHandle.circleId,
              startImageX: boundedPoint.x,
              startImageY: boundedPoint.y,
              originCenterX: targetCircle.cx,
              originCenterY: targetCircle.cy,
            };
          } else {
            interactionRef.current = {
              mode: "move-circle-radius",
              circleId: genericCircleHandle.circleId,
            };
          }
        }
        return;
      }

      const genericCircleId = findClosestCircleId(imagePoint);
      if (genericCircleId !== null) {
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedCircleId(genericCircleId);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        triggerSelectionPulse("circle", genericCircleId);
        clearMobileHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("measure", {
          noticeText:
            "Circle aktif. Drag area dalam untuk move atau tepi untuk resize.",
        });
        return;
      }

      const genericHkaHandle = findClosestHkaHandle(boundedPoint);
      if (genericHkaHandle) {
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedHkaId(genericHkaHandle.hkaId);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        triggerSelectionPulse("hka", genericHkaHandle.hkaId);
        clearMobileHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        if (isTouchLikePointer) {
          activateMobileHkaHandleAssist(
            genericHkaHandle.hkaId,
            genericHkaHandle.handleKey,
          );
          syncMobileCanvasSelection("measure", {
            noticeText:
              "Titik HKA dipilih. Bundaran assist aktif untuk adjust landmark lebih mudah.",
          });
          return;
        }
        syncMobileCanvasSelection("measure");
        if (tool === "pan" || tool === "hkaAuto") {
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-hka-handle",
            hkaId: genericHkaHandle.hkaId,
            handleKey: genericHkaHandle.handleKey,
          };
        }
        return;
      }

      const genericHkaId = findClosestHkaId(imagePoint);
      if (genericHkaId !== null) {
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setSelectedHkaId(genericHkaId);
        setSelectedLineId(null);
        setSelectedFreeLinePointIndex(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        triggerSelectionPulse("hka", genericHkaId);
        clearMobileHandleAssist();
        clearMobileHkaHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("measure", {
          noticeText: "HKA aktif. Tap titik landmark untuk mengubah posisi.",
        });
        return;
      }

      const genericCutLayerHandle = findCutLayerHandle(imagePoint);
      if (genericCutLayerHandle) {
        const targetLayer = cutLayers.find(
          (layer) => layer.id === genericCutLayerHandle.layerId,
        );
        if (!targetLayer) return;
        focusLayerCanvas(targetLayer.id, { openPanel: false });
        triggerSelectionPulse("layer", targetLayer.id);
        setSelectedFreeLinePointIndex(null);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedPlanningGuideId(null);
        clearMobileHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("tool", {
          noticeText:
            "Layer dipilih. Drag handle untuk resize atau rotate langsung di canvas.",
        });
        if (!targetLayer.lockScale && tool === "pan") {
          setHistoryPaused(true);
          if (genericCutLayerHandle.handleKey === "rotate") {
            const localPoint = toLayerLocal(imagePoint, targetLayer);
            interactionRef.current = {
              mode: "rotate-cut-layer",
              layerId: targetLayer.id,
              startPointerAngle: Math.atan2(localPoint.y, localPoint.x),
              startRotation: Number(targetLayer.rotation || 0),
            };
          } else {
            interactionRef.current = {
              mode: "resize-cut-layer",
              layerId: targetLayer.id,
              centerX: targetLayer.centerX,
              centerY: targetLayer.centerY,
              rotation: targetLayer.rotation,
              handleKey: genericCutLayerHandle.handleKey,
              startFlipX: Boolean(targetLayer.flipX),
              startFlipY: Boolean(targetLayer.flipY),
              startDisplayWidth: Number(targetLayer.displayWidth || 16),
              startDisplayHeight: Number(targetLayer.displayHeight || 16),
            };
          }
        }
        return;
      }

      const genericCutLayerId = findCutLayerByPoint(imagePoint);
      if (genericCutLayerId !== null) {
        const targetLayer = cutLayers.find(
          (layer) => layer.id === genericCutLayerId,
        );
        if (!targetLayer) return;
        selectLayerFromCanvas(genericCutLayerId, {
          additive: isAdditiveLayerSelection,
          includeGroup: !isAdditiveLayerSelection,
          openPanel: false,
        });
        triggerSelectionPulse("layer", genericCutLayerId);
        setSelectedFreeLinePointIndex(null);
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedPlanningGuideId(null);
        clearMobileHandleAssist();
        clearMobilePlanningGuideHandleAssist();
        syncMobileCanvasSelection("tool", {
          noticeText: "Layer aktif. Geser layer atau pilih handle untuk edit.",
        });
        if (isAdditiveLayerSelection) {
          setNotice(
            selectedCutLayerIdsSet.has(targetLayer.id)
              ? `Layer #${targetLayer.id} dilepas dari multi-select.`
              : `Layer #${targetLayer.id} ditambahkan ke multi-select.`,
          );
          return;
        }
        if (!targetLayer.lockScale && tool === "pan") {
          const selectedMoveLayerIds = selectedCutLayerIdsSet.has(targetLayer.id)
            ? selectedCutLayerIds
            : getRelatedLayerIds(targetLayer.id, { includeGroup: true });
          const movableLayerIds = selectedMoveLayerIds.filter((layerId) => {
            const layer = cutLayers.find((item) => item.id === layerId);
            return layer && !layer.lockScale;
          });
          if (!movableLayerIds.length) {
            setNotice("Layer terkunci. Buka lock dulu untuk memindahkan.");
            return;
          }
          setHistoryPaused(true);
          interactionRef.current = {
            mode: "move-cut-layer",
            layerIds: movableLayerIds,
            startImageX: imagePoint.x,
            startImageY: imagePoint.y,
            origins: movableLayerIds.map((layerId) => {
              const layer = cutLayers.find((item) => item.id === layerId);
              return {
                layerId,
                originCenterX: Number(layer?.centerX || 0),
                originCenterY: Number(layer?.centerY || 0),
              };
            }),
          };
        }
        return;
      }

      if (
        selectedLineId !== null ||
        selectedAngleId !== null ||
        selectedCircleId !== null ||
        selectedHkaId !== null ||
        selectedCutLayerId !== null ||
        selectedPlanningGuideId !== null
      ) {
        clearActiveCanvasSelection();
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

      if (
        !hasCalibration &&
        (tool === "angle" || tool === "circle" || tool === "hkaAuto")
      ) {
        focusCalibrationStep(
          "Kalibrasi wajib sebelum memakai Angle/Circle/HKA.",
        );
        return;
      }

      if (tool === "centerFinder") {
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        setDraftCenterFinderPoints((prev) => {
          const next = [...prev, snappedPlacementPoint];
          if (next.length < 3) {
            setNotice(`Center Finder: pilih ${3 - next.length} titik lagi.`);
            return next;
          }
          const circumcircle = getCircumcircleFromThreePoints(
            next[0],
            next[1],
            next[2],
          );
          if (!circumcircle) {
            setNotice(
              "Center Finder gagal. Tiga titik terlalu segaris. Ulangi dengan titik tepi yang lebih menyebar.",
            );
            return [];
          }
          appendCenterFinderCircle({
            cx: circumcircle.center.x,
            cy: circumcircle.center.y,
            radius: circumcircle.radius,
            points: [
              { ...circumcircle.center },
              {
                x: circumcircle.center.x + circumcircle.radius,
                y: circumcircle.center.y,
              },
            ],
            source: "centerFinder",
          });
          setNotice(
            "Center Finder selesai. Center dan circle referensi berhasil dibuat.",
          );
          setTool(getIdleTool());
          if (shouldUseMobileOneShotTool) {
            setMobileControlsOpen(false);
          }
          return [];
        });
        return;
      }

      if (tool === "axisBuilder") {
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);
        setDraftAxisBuilderPoints((prev) => {
          const next = [...prev, snappedPlacementPoint];
          if (next.length < 4) {
            const phase =
              next.length < 2
                ? `proximal ${next.length}/2`
                : `distal ${next.length - 2}/2`;
            setNotice(
              `Axis Builder: lanjutkan titik ${phase}. Axis dibuat dari midpoint kedua segmen.`,
            );
            return next;
          }
          const nextAxisLine = buildAxisLineFromPoints(next);
          if (!nextAxisLine) {
            setNotice(
              "Axis Builder gagal. Pastikan dua segmen cukup terpisah agar midpoint membentuk axis.",
            );
            return [];
          }
          appendLineMeasurement(
            {
              ...nextAxisLine,
              type: "axis",
            },
            { mobileHandleAssistEnd: true },
          );
          setNotice(
            "Axis Builder selesai. Axis dibuat dari midpoint segmen proximal dan distal.",
          );
          setTool(getIdleTool());
          if (shouldUseMobileOneShotTool) {
            setMobileControlsOpen(false);
          }
          return [];
        });
        return;
      }

      if (tool === "guideBuilder") {
        if (!guideBuilderReference?.line) {
          setNotice(
            "Guide Builder butuh satu line atau planning guide terpilih sebagai acuan.",
          );
          return;
        }
        const nextGuideLine = buildGuideLineFromReference(
          guideBuilderReference.line,
          snappedPlacementPoint,
          guideBuilderMode,
        );
        if (!nextGuideLine) {
          setNotice("Guide Builder gagal. Acuan guide tidak valid.");
          return;
        }
        appendLineMeasurement(
          {
            ...nextGuideLine,
            type:
              guideBuilderMode === "parallel"
                ? "parallelGuide"
                : "perpendicularGuide",
          },
          { mobileHandleAssistEnd: true },
        );
        setNotice(
          `${guideBuilderMode === "parallel" ? "Parallel" : "Perpendicular"} guide dibuat dari ${guideBuilderReference.label}.`,
        );
        setTool(getIdleTool());
        if (shouldUseMobileOneShotTool) {
          setMobileControlsOpen(false);
        }
        return;
      }

      if (tool === "freeLine") {
        setSelectedLineId(null);
        setSelectedAngleId(null);
        setSelectedCircleId(null);
        setSelectedHkaId(null);
        setSelectedCutLayerId(null);
        setSelectedPlanningGuideId(null);

        if (freeLineMode === "point") {
          const closeRadius = FREE_CUT_CLOSE_RADIUS_SCREEN / view.scale;

          if (draftFreeLine?.points?.length) {
            const startPoint = draftFreeLine.points[0];
            if (
              draftFreeLine.points.length < MIN_FREE_CUT_POINTS &&
              getDistance(startPoint, snappedPlacementPoint) <= closeRadius
            ) {
              setNotice(
                `Free Line: pilih ${MIN_FREE_CUT_POINTS - draftFreeLine.points.length} titik lagi.`,
              );
              return;
            }
            if (
              draftFreeLine.points.length >= MIN_FREE_CUT_POINTS &&
              getDistance(startPoint, snappedPlacementPoint) <= closeRadius
            ) {
              completeDraftFreeLine();
              return;
            }

            const lastPoint =
              draftFreeLine.points[draftFreeLine.points.length - 1];
            if (getDistance(lastPoint, snappedPlacementPoint) <= 1.5) {
              return;
            }

            const nextPoints = [...draftFreeLine.points, snappedPlacementPoint];
            setDraftFreeLine((prev) =>
              prev
                ? {
                    ...prev,
                    points: nextPoints,
                    hoverPoint: snappedPlacementPoint,
                  }
                : prev,
            );
            setHistoryPaused(true);
            setNotice(
              nextPoints.length >= MIN_FREE_CUT_POINTS
                ? "Free Line: lanjutkan titik atau klik titik awal untuk selesai."
                : `Free Line: pilih ${MIN_FREE_CUT_POINTS - nextPoints.length} titik lagi.`,
            );
            return;
          }

          setDraftFreeLine({
            points: [snappedPlacementPoint],
            hoverPoint: snappedPlacementPoint,
            fillColor: DEFAULT_FREE_LINE_COLOR,
            drawMode: "point",
          });
          setHistoryPaused(true);
          setNotice(
            "Free Line Point Mode: klik beberapa titik, lalu klik titik awal atau tekan Enter untuk selesai.",
          );
          return;
        }

        const startPoint = snappedPlacementPoint;
        setDraftFreeLine({
          points: [startPoint],
          fillColor: DEFAULT_FREE_LINE_COLOR,
          drawMode: "freehand",
        });
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "draw-free-line",
        };
        setNotice("Free Line aktif. Drag untuk menggambar shape bebas.");
        return;
      }

      if (tool === "angle") {
        const hitAngleHandle = findClosestAngleHandle(boundedPoint);
        if (hitAngleHandle) {
          setSelectedAngleId(hitAngleHandle.angleId);
          setSelectedLineId(null);
          setSelectedFreeLinePointIndex(null);
          setSelectedCircleId(null);
          setSelectedHkaId(null);
          setSelectedCutLayerId(null);
          triggerSelectionPulse("angle", hitAngleHandle.angleId);
          if (isTouchLikePointer) {
            activateMobileAngleHandleAssist(
              hitAngleHandle.angleId,
              hitAngleHandle.handleKey,
            );
            syncMobileCanvasSelection("measure", {
              noticeText:
                "Titik angle dipilih. Bundaran assist aktif untuk adjust yang lebih presisi.",
            });
            return;
          }
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
          const next = [
            ...prev,
            { x: snappedPlacementPoint.x, y: snappedPlacementPoint.y },
          ];
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
            resultOpacity: DEFAULT_LABEL_OPACITY,
            strokeWidth: DEFAULT_ANGLE_STROKE_WIDTH,
          };
          nextAngleIdRef.current += 1;
          setAngles((items) => [...items, nextAngle]);
          setSelectedAngleId(nextAngle.id);
          setNotice("Angle measurement dibuat.");
          setTool(getIdleTool());
          if (shouldUseMobileOneShotTool) {
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
          { x: snappedPlacementPoint.x, y: snappedPlacementPoint.y },
          { x: snappedPlacementPoint.x, y: snappedPlacementPoint.y },
        ]);
        interactionRef.current = {
          mode: "draw-circle-radius",
          centerX: snappedPlacementPoint.x,
          centerY: snappedPlacementPoint.y,
        };
        setNotice("Circle: klik/drag dari pusat ke tepi diameter, lalu lepas.");
        return;
      }

      if (tool === "hkaAuto") {
        const hitHkaHandle = findClosestHkaHandle(boundedPoint);
        if (hitHkaHandle) {
          setSelectedHkaId(hitHkaHandle.hkaId);
          setSelectedLineId(null);
          setSelectedFreeLinePointIndex(null);
          setSelectedAngleId(null);
          setSelectedCircleId(null);
          setSelectedCutLayerId(null);
          triggerSelectionPulse("hka", hitHkaHandle.hkaId);
          if (isTouchLikePointer) {
            activateMobileHkaHandleAssist(
              hitHkaHandle.hkaId,
              hitHkaHandle.handleKey,
            );
            syncMobileCanvasSelection("measure", {
              noticeText:
                "Titik HKA dipilih. Bundaran assist aktif untuk adjust landmark lebih mudah.",
            });
            return;
          }
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
          const next = [
            ...prev,
            { x: snappedPlacementPoint.x, y: snappedPlacementPoint.y },
          ];
          const definition = getHkaModeDefinition(hkaInputMode);
          if (next.length < definition.points.length) {
            setNotice(getHkaDraftNotice(hkaInputMode, next.length));
            return next;
          }
          const nextHka = definition.points.reduce(
            (accumulator, pointDef, index) => {
              accumulator[pointDef.key] = next[index];
              return accumulator;
            },
            {
              id: nextHkaIdRef.current,
              mode: hkaInputMode,
              direction: "varus",
              side: hkaSide,
              lineColor: DEFAULT_HKA_LINE_COLOR,
              strokeWidth: DEFAULT_HKA_STROKE_WIDTH,
              labelOffsetX: DEFAULT_HKA_LABEL_OFFSET_X,
              labelOffsetY: DEFAULT_HKA_LABEL_OFFSET_Y,
              showArc: hkaInputMode === "full",
            },
          );
          if (hkaInputMode === "full") {
            nextHka.direction = inferHkaDirectionFromPoints(
              nextHka.hip,
              nextHka.knee,
              nextHka.ankle,
              hkaSide,
              "varus",
            );
          }
          nextHkaIdRef.current += 1;
          setHkaSets((items) => [...items, nextHka]);
          setSelectedHkaId(nextHka.id);
          setNotice(
            `${definition.label} dibuat dari landmarks${
              hkaInputMode === "full" ? ` (${getHkaSideLabel(hkaSide)})` : ""
            }.`,
          );
          setTool(getIdleTool());
          if (shouldUseMobileOneShotTool) {
            setMobileControlsOpen(false);
          }
          return [];
        });
        return;
      }

      if (tool !== "draw") return;

      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setSelectedCutLayerId(null);

      const start = snappedPlacementPoint;
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
      activateMobileAngleHandleAssist,
      activateMobileHkaHandleAssist,
      activateMobilePlanningGuideHandleAssist,
      clampToImageBounds,
      clearMobileAngleHandleAssist,
      clearMobileHandleAssist,
      clearMobileHkaHandleAssist,
      clearMobilePlanningGuideHandleAssist,
      completeDraftCut,
      completeDraftFreeLine,
      circles,
      draftCut,
      draftFreeLine,
      angles,
      appendCenterFinderCircle,
      appendLineMeasurement,
      findClosestAngleHandle,
      findClosestAngleId,
      findAngleLabelByPoint,
      findClosestCircleHandle,
      findClosestCircleId,
      findClosestHandle,
      findClosestHkaHandle,
      findClosestHkaId,
      findCircleLabelByPoint,
      findHkaLabelByPoint,
      findClosestLineId,
      findMobileHandleAssistHit,
      findMobileAngleHandleAssistHit,
      findMobileHkaHandleAssistHit,
      findMobilePlanningGuideHandleAssistHit,
      getMobileAngleHandleAssistGeometry,
      getMobileHandleAssistGeometry,
      getMobileHkaHandleAssistGeometry,
      getMobilePlanningGuideHandleAssistGeometry,
      clearActiveCanvasSelection,
      findLineLabelByPoint,
      findClosestPlanningGuideHandle,
      findClosestPlanningGuideId,
      findFreeLineCurveHandle,
      findFreeLinePointHandle,
      findPlanningGuideLabelByPoint,
      findCutLayerByPoint,
      findCutLayerHandle,
      focusLayerCanvas,
      focusPlanningGuideCanvas,
      getIdleTool,
      getRelatedLayerIds,
      getLocalPoint,
      image,
      focusCalibrationStep,
      freeLineMode,
      guideBuilderMode,
      guideBuilderReference,
      hasCalibration,
      hkaSide,
      isCoarsePointer,
      isMobileViewport,
      isLineLocked,
      isRepeatedMobileLineTap,
      cutLayers,
      lines,
      planningGuides,
      linePreset,
      resolveSnappedImagePoint,
      selectLayerFromCanvas,
      selectPlanningGuideForEdit,
      selectedCutLayerIds,
      selectedCutLayerIdsSet,
      setHistoryPaused,
      screenToImagePoint,
      syncMobileCanvasSelection,
      shouldUseMobileOneShotTool,
      tool,
      toLayerLocal,
      triggerSelectionPulse,
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
        const moveImagePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        let shouldKeepSnapPreview = false;
        if (!isCoarsePointer) {
          const hoveredHkaLabelId = findHkaLabelByPoint(point);
          const hoveredHkaId =
            hoveredHkaLabelId ?? findClosestHkaId(moveImagePoint);
          const hoveredAngleLabelId = findAngleLabelByPoint(point);
          const hoveredAngleId =
            hoveredAngleLabelId ?? findClosestAngleId(moveImagePoint);
          const hoveredCircleLabelId = findCircleLabelByPoint(point);
          const hoveredCircleId =
            hoveredCircleLabelId ?? findClosestCircleId(moveImagePoint);
          setHoveredMeasurementInfo((current) => {
            if (hoveredHkaId !== null) {
              if (current?.type === "hka" && current.id === hoveredHkaId) {
                return current;
              }
              return { type: "hka", id: hoveredHkaId };
            }
            if (hoveredAngleId !== null) {
              if (
                current?.type === "angle" &&
                current.id === hoveredAngleId
              ) {
                return current;
              }
              return { type: "angle", id: hoveredAngleId };
            }
            if (hoveredCircleId !== null) {
              if (
                current?.type === "circle" &&
                current.id === hoveredCircleId
              ) {
                return current;
              }
              return { type: "circle", id: hoveredCircleId };
            }
            if (
              hoveredHkaId === null &&
              hoveredAngleId === null &&
              hoveredCircleId === null
            ) {
              return current ? null : current;
            }
            return current;
          });
        } else if (hoveredMeasurementInfo) {
          setHoveredMeasurementInfo(null);
        }

        if (tool === "cut" && draftCut?.points?.length) {
          shouldKeepSnapPreview = true;
          const { point: movePoint } = resolveSnapWithPreview(moveImagePoint);
          setDraftCut((prev) =>
            prev
              ? {
                  ...prev,
                  hoverPoint: movePoint,
                }
              : prev,
          );
        }
        if (
          tool === "freeLine" &&
          freeLineMode === "point" &&
          draftFreeLine?.points?.length
        ) {
          shouldKeepSnapPreview = true;
          const { point: movePoint } = resolveSnapWithPreview(moveImagePoint);
          setDraftFreeLine((prev) =>
            prev
              ? {
                  ...prev,
                  hoverPoint: movePoint,
                }
              : prev,
          );
        } else if (
          tool === "draw" ||
          tool === "centerFinder" ||
          tool === "axisBuilder" ||
          tool === "angle" ||
          tool === "circle" ||
          tool === "hkaAuto" ||
          (tool === "freeLine" && freeLineMode === "point")
        ) {
          shouldKeepSnapPreview = true;
          resolveSnapWithPreview(moveImagePoint);
        } else if (tool === "guideBuilder" && guideBuilderReference?.line) {
          shouldKeepSnapPreview = true;
          const { point: movePoint } = resolveSnapWithPreview(moveImagePoint);
          setGuideBuilderPreviewPoint(movePoint);
        }

        if (!shouldKeepSnapPreview) {
          clearSnapPreview();
          if (guideBuilderPreviewPoint) {
            setGuideBuilderPreviewPoint(null);
          }
        }
        return;
      }

      event.preventDefault();

      if (interactionRef.current.mode === "pan") {
        const dx = point.x - interactionRef.current.startX;
        const dy = point.y - interactionRef.current.startY;
        setView((prev) =>
          clampViewToViewport(
            {
              ...prev,
              panX: interactionRef.current.startPanX + dx,
              panY: interactionRef.current.startPanY + dy,
            },
            { relaxed: true },
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "draw") {
        const rawMovePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { point: movePoint } = resolveSnapWithPreview(rawMovePoint);
        setDraftLine((prev) => {
          if (!prev) return prev;
          return { ...prev, x2: movePoint.x, y2: movePoint.y };
        });
        return;
      }

      if (interactionRef.current.mode === "draw-free-line") {
        clearSnapPreview();
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        setDraftFreeLine((prev) => {
          if (!prev?.points?.length) return prev;
          const lastPoint = prev.points[prev.points.length - 1];
          if (getDistance(lastPoint, movePoint) < 2.5) {
            return prev;
          }
          return {
            ...prev,
            points: [...prev.points, movePoint],
          };
        });
        return;
      }

      if (interactionRef.current.mode === "move-free-line-point") {
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { layerId, pointIndex } = interactionRef.current;
        setCutLayers((prev) =>
          prev.map((layer) => {
            if (layer.id !== layerId || layer.kind !== "free-line") {
              return layer;
            }
            const nextMaskPoint = toLayerMaskPoint(movePoint, layer);
            const nextMaskPoints = Array.isArray(layer.maskPoints)
              ? layer.maskPoints.map((pointItem, index) => {
                  if (index !== pointIndex) return pointItem;
                  const deltaX = nextMaskPoint.x - (Number(pointItem.x) || 0);
                  const deltaY = nextMaskPoint.y - (Number(pointItem.y) || 0);
                  const nextPointItem = {
                    ...pointItem,
                    x: nextMaskPoint.x,
                    y: nextMaskPoint.y,
                  };
                  if (
                    Number.isFinite(pointItem.handleInX) &&
                    Number.isFinite(pointItem.handleInY)
                  ) {
                    nextPointItem.handleInX = pointItem.handleInX + deltaX;
                    nextPointItem.handleInY = pointItem.handleInY + deltaY;
                  }
                  if (
                    Number.isFinite(pointItem.handleOutX) &&
                    Number.isFinite(pointItem.handleOutY)
                  ) {
                    nextPointItem.handleOutX = pointItem.handleOutX + deltaX;
                    nextPointItem.handleOutY = pointItem.handleOutY + deltaY;
                  }
                  return nextPointItem;
                })
              : [];
            return {
              ...layer,
              maskPoints: nextMaskPoints,
            };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-free-line-curve-handle") {
        const movePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { layerId, pointIndex, handleKey } = interactionRef.current;
        setCutLayers((prev) =>
          prev.map((layer) => {
            if (layer.id !== layerId || layer.kind !== "free-line") {
              return layer;
            }
            const nextMaskPoints = Array.isArray(layer.maskPoints)
              ? layer.maskPoints.map((pointItem, index) => {
                  if (index !== pointIndex) return pointItem;
                  const anchorX = Number(pointItem.x) || 0;
                  const anchorY = Number(pointItem.y) || 0;
                  const nextHandlePoint = toLayerMaskPoint(movePoint, layer);
                  const vectorX = nextHandlePoint.x - anchorX;
                  const vectorY = nextHandlePoint.y - anchorY;
                  const nextPointItem = { ...pointItem };
                  if (handleKey === "in") {
                    nextPointItem.handleInX = nextHandlePoint.x;
                    nextPointItem.handleInY = nextHandlePoint.y;
                    nextPointItem.handleOutX = anchorX - vectorX;
                    nextPointItem.handleOutY = anchorY - vectorY;
                  } else {
                    nextPointItem.handleOutX = nextHandlePoint.x;
                    nextPointItem.handleOutY = nextHandlePoint.y;
                    nextPointItem.handleInX = anchorX - vectorX;
                    nextPointItem.handleInY = anchorY - vectorY;
                  }
                  return nextPointItem;
                })
              : [];
            return {
              ...layer,
              maskPoints: nextMaskPoints,
            };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "draw-circle-radius") {
        const rawMovePoint = clampToImageBounds(
          screenToImagePoint(point.x, point.y),
        );
        const { point: movePoint } = resolveSnapWithPreview(rawMovePoint);
        const { centerX, centerY } = interactionRef.current;
        setDraftCirclePoints([
          { x: centerX, y: centerY },
          { x: movePoint.x, y: movePoint.y },
        ]);
        return;
      }

      if (interactionRef.current.mode === "move-cut-layer") {
        clearSnapPreview();
        const { layerIds = [], origins = [], startImageX, startImageY } =
          interactionRef.current;
        if (!layerIds.length) return;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        const dx = nextImagePoint.x - startImageX;
        const dy = nextImagePoint.y - startImageY;

        setCutLayers((prev) =>
          prev.map((layer) =>
            layerIds.includes(layer.id)
              ? {
                  ...layer,
                  centerX:
                    Number(
                      origins.find((item) => item.layerId === layer.id)
                        ?.originCenterX || layer.centerX || 0,
                    ) + dx,
                  centerY:
                    Number(
                      origins.find((item) => item.layerId === layer.id)
                        ?.originCenterY || layer.centerY || 0,
                    ) + dy,
                }
              : layer,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-planning-guide-handle") {
        const movePoint = screenToImagePoint(point.x, point.y);
        const {
          guideId,
          handleKey,
          pointerOffsetX = 0,
          pointerOffsetY = 0,
        } = interactionRef.current;
        const rawAdjustedPoint = clampToImageBounds({
          x: movePoint.x + pointerOffsetX,
          y: movePoint.y + pointerOffsetY,
        });
        const { point: adjustedPoint } = resolveSnapWithPreview(
          rawAdjustedPoint,
          {
            excludeRefs: [`guide:${guideId}`],
          },
        );
        setPlanningGuides((prev) =>
          prev.map((guide) => {
            if (guide.id !== guideId) return guide;
            if (handleKey === "start") {
              return {
                ...guide,
                anchorStart: { x: adjustedPoint.x, y: adjustedPoint.y },
              };
            }
            return {
              ...guide,
              anchorEnd: { x: adjustedPoint.x, y: adjustedPoint.y },
            };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-planning-guide") {
        clearSnapPreview();
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
        clearSnapPreview();
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
        clearSnapPreview();
        const {
          layerId,
          centerX,
          centerY,
          rotation: layerRotation,
          handleKey,
          startFlipX = false,
          startFlipY = false,
          startDisplayWidth = 16,
          startDisplayHeight = 16,
        } = interactionRef.current;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        const dx = nextImagePoint.x - centerX;
        const dy = nextImagePoint.y - centerY;
        const rad = (layerRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        const halfStartW = startDisplayWidth / 2;
        const halfStartH = startDisplayHeight / 2;
        let nextDisplayWidth = startDisplayWidth;
        let nextDisplayHeight = startDisplayHeight;
        let nextCenterX = centerX;
        let nextCenterY = centerY;
        let nextFlipX = startFlipX;
        let nextFlipY = startFlipY;

        if (
          handleKey === "tl" ||
          handleKey === "tr" ||
          handleKey === "br" ||
          handleKey === "bl"
        ) {
          const signX = handleKey === "tr" || handleKey === "br" ? 1 : -1;
          const signY = handleKey === "br" || handleKey === "bl" ? 1 : -1;
          const fixedLocalX = -signX * halfStartW;
          const fixedLocalY = -signY * halfStartH;
          const crossedX = signX * (localX - fixedLocalX) < 0;
          const crossedY = signY * (localY - fixedLocalY) < 0;
          const candidateWidth = Math.max(16, Math.abs(localX - fixedLocalX));
          const candidateHeight = Math.max(16, Math.abs(localY - fixedLocalY));
          const scale = Math.max(
            candidateWidth / Math.max(1, startDisplayWidth),
            candidateHeight / Math.max(1, startDisplayHeight),
          );

          nextDisplayWidth = clamp(
            scale * startDisplayWidth,
            16,
            modelWidth * 2,
          );
          nextDisplayHeight = clamp(
            scale * startDisplayHeight,
            16,
            modelHeight * 2,
          );

          const effectiveSignX = crossedX ? -signX : signX;
          const effectiveSignY = crossedY ? -signY : signY;
          const draggedLocalX = fixedLocalX + effectiveSignX * nextDisplayWidth;
          const draggedLocalY =
            fixedLocalY + effectiveSignY * nextDisplayHeight;
          const midpointLocal = {
            x: (fixedLocalX + draggedLocalX) / 2,
            y: (fixedLocalY + draggedLocalY) / 2,
          };
          const centerOffset = rotateVector(
            midpointLocal.x,
            midpointLocal.y,
            layerRotation,
          );
          nextCenterX = centerX + centerOffset.x;
          nextCenterY = centerY + centerOffset.y;
          nextFlipX = crossedX ? !startFlipX : startFlipX;
          nextFlipY = crossedY ? !startFlipY : startFlipY;
        } else if (handleKey === "ml" || handleKey === "mr") {
          const signX = handleKey === "mr" ? 1 : -1;
          const fixedLocalX = -signX * halfStartW;
          const crossedX = signX * (localX - fixedLocalX) < 0;
          nextDisplayWidth = clamp(
            Math.max(16, Math.abs(localX - fixedLocalX)),
            16,
            modelWidth * 2,
          );
          const effectiveSignX = crossedX ? -signX : signX;
          const draggedLocalX = fixedLocalX + effectiveSignX * nextDisplayWidth;
          const midpointLocalX = (fixedLocalX + draggedLocalX) / 2;
          const centerOffset = rotateVector(midpointLocalX, 0, layerRotation);
          nextCenterX = centerX + centerOffset.x;
          nextCenterY = centerY + centerOffset.y;
          nextFlipX = crossedX ? !startFlipX : startFlipX;
        } else if (handleKey === "tm" || handleKey === "bm") {
          const signY = handleKey === "bm" ? 1 : -1;
          const fixedLocalY = -signY * halfStartH;
          const crossedY = signY * (localY - fixedLocalY) < 0;
          nextDisplayHeight = clamp(
            Math.max(16, Math.abs(localY - fixedLocalY)),
            16,
            modelHeight * 2,
          );
          const effectiveSignY = crossedY ? -signY : signY;
          const draggedLocalY =
            fixedLocalY + effectiveSignY * nextDisplayHeight;
          const midpointLocalY = (fixedLocalY + draggedLocalY) / 2;
          const centerOffset = rotateVector(0, midpointLocalY, layerRotation);
          nextCenterX = centerX + centerOffset.x;
          nextCenterY = centerY + centerOffset.y;
          nextFlipY = crossedY ? !startFlipY : startFlipY;
        }

        setCutLayers((prev) =>
          prev.map((layer) =>
            layer.id === layerId
              ? layer.lockScale
                ? layer
                : {
                    ...layer,
                    centerX: nextCenterX,
                    centerY: nextCenterY,
                    displayWidth: nextDisplayWidth,
                    displayHeight: nextDisplayHeight,
                    flipX: nextFlipX,
                    flipY: nextFlipY,
                  }
              : layer,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "rotate-cut-layer") {
        clearSnapPreview();
        const { layerId, startPointerAngle, startRotation } =
          interactionRef.current;
        const targetLayer =
          cutLayers.find((layer) => layer.id === layerId) || null;
        if (!targetLayer) return;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        const localPoint = toLayerLocal(nextImagePoint, targetLayer);
        const nextPointerAngle = Math.atan2(localPoint.y, localPoint.x);
        const deltaDeg =
          ((nextPointerAngle - startPointerAngle) * 180) / Math.PI;
        setCutLayers((prev) =>
          prev.map((layer) =>
            layer.id === layerId
              ? layer.lockScale
                ? layer
                : {
                    ...layer,
                    rotation: (((startRotation + deltaDeg) % 360) + 360) % 360,
                  }
              : layer,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-handle") {
        const movePoint = screenToImagePoint(point.x, point.y);
        const {
          lineId,
          handleKey,
          pointerOffsetX = 0,
          pointerOffsetY = 0,
        } = interactionRef.current;
        if (isLineLocked(lineId)) return;
        const rawAdjustedPoint = clampToImageBounds({
          x: movePoint.x + pointerOffsetX,
          y: movePoint.y + pointerOffsetY,
        });
        const { point: adjustedPoint } = resolveSnapWithPreview(
          rawAdjustedPoint,
          {
            excludeRefs: [`line:${lineId}`],
          },
        );

        setLines((prev) =>
          prev.map((line) => {
            if (line.id !== lineId) return line;
            if (handleKey === "start") {
              return { ...line, x1: adjustedPoint.x, y1: adjustedPoint.y };
            }
            return { ...line, x2: adjustedPoint.x, y2: adjustedPoint.y };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-line") {
        clearSnapPreview();
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
        clearSnapPreview();
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
        const movePoint = screenToImagePoint(point.x, point.y);
        const {
          angleId,
          handleKey,
          pointerOffsetX = 0,
          pointerOffsetY = 0,
        } = interactionRef.current;
        const rawAdjustedPoint = clampToImageBounds({
          x: movePoint.x + pointerOffsetX,
          y: movePoint.y + pointerOffsetY,
        });
        const { point: adjustedPoint } = resolveSnapWithPreview(
          rawAdjustedPoint,
          {
            excludeRefs: [`angle:${angleId}`],
          },
        );
        setAngles((prev) =>
          prev.map((item) => {
            if (item.id !== angleId) return item;
            if (handleKey === "p1")
              return { ...item, p1: { x: adjustedPoint.x, y: adjustedPoint.y } };
            if (handleKey === "p2")
              return { ...item, p2: { x: adjustedPoint.x, y: adjustedPoint.y } };
            return { ...item, p3: { x: adjustedPoint.x, y: adjustedPoint.y } };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-angle-label") {
        clearSnapPreview();
        const { angleId, startX, startY, originOffsetX, originOffsetY } =
          interactionRef.current;
        const dx = point.x - startX;
        const dy = point.y - startY;
        setAngles((prev) =>
          prev.map((item) =>
            item.id === angleId
              ? {
                  ...item,
                  labelOffsetX: clamp(originOffsetX + dx, -320, 320),
                  labelOffsetY: clamp(originOffsetY + dy, -220, 220),
                }
              : item,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-hka-label") {
        clearSnapPreview();
        const { hkaId, startX, startY, originOffsetX, originOffsetY } =
          interactionRef.current;
        const dx = point.x - startX;
        const dy = point.y - startY;
        setHkaSets((prev) =>
          prev.map((item) =>
            item.id === hkaId
              ? {
                  ...item,
                  labelOffsetX: clamp(originOffsetX + dx, -320, 320),
                  labelOffsetY: clamp(originOffsetY + dy, -220, 220),
                }
              : item,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-circle-center") {
        clearSnapPreview();
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
        const nextCenterPoint = clampToImageBounds({
          x: originCenterX + dx,
          y: originCenterY + dy,
        });
        setCircles((prev) =>
          prev.map((item) =>
            item.id === circleId
              ? { ...item, cx: nextCenterPoint.x, cy: nextCenterPoint.y }
              : item,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-circle-radius") {
        const { circleId } = interactionRef.current;
        const rawNextImagePoint = screenToImagePoint(point.x, point.y);
        const { point: nextImagePoint } = resolveSnapWithPreview(
          clampToImageBounds(rawNextImagePoint),
          {
            excludeRefs: [`circle:${circleId}`],
          },
        );
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
        const movePoint = screenToImagePoint(point.x, point.y);
        const {
          hkaId,
          handleKey,
          pointerOffsetX = 0,
          pointerOffsetY = 0,
        } = interactionRef.current;
        const rawAdjustedPoint = clampToImageBounds({
          x: movePoint.x + pointerOffsetX,
          y: movePoint.y + pointerOffsetY,
        });
        const { point: adjustedPoint } = resolveSnapWithPreview(
          rawAdjustedPoint,
          {
            excludeRefs: [`hka:${hkaId}`],
          },
        );
        setHkaSets((prev) =>
          prev.map((item) => {
            if (item.id !== hkaId) return item;
            const nextItem = {
              ...item,
              [handleKey]: { x: adjustedPoint.x, y: adjustedPoint.y },
            };
            if (nextItem.mode === "full") {
              nextItem.direction = inferHkaDirectionFromPoints(
                nextItem.hip,
                nextItem.knee,
                nextItem.ankle,
                nextItem.side,
                nextItem.direction || "varus",
              );
            }
            return nextItem;
          }),
        );
        return;
      }
    },
    [
      angles,
      clampViewToViewport,
      clampToImageBounds,
      circles,
      clearSnapPreview,
      cutLayers,
      draftCut,
      draftFreeLine,
      findClosestAngleId,
      findClosestCircleId,
      findClosestHkaId,
      findAngleLabelByPoint,
      findCircleLabelByPoint,
      findHkaLabelByPoint,
      freeLineMode,
      guideBuilderPreviewPoint,
      guideBuilderReference,
      getLocalPoint,
      hoveredMeasurementInfo,
      image,
      isLineLocked,
      setHoveredMeasurementInfo,
      modelHeight,
      modelWidth,
      resolveSnapWithPreview,
      setPlanningGuides,
      screenToImagePoint,
      tool,
      view.scale,
    ],
  );

  const handlePointerUp = useCallback(() => {
    const completedInteractionMode = interactionRef.current.mode;

    if (interactionRef.current.mode === "draw" && draftLine) {
      const length = getLineLength(draftLine);
      if (length >= 2) {
        const nextLine = {
          ...draftLine,
          id: nextLineIdRef.current,
          labelOffsetX: DEFAULT_LINE_LABEL_OFFSET_X,
          labelOffsetY: DEFAULT_LINE_LABEL_OFFSET_Y,
          labelOpacity: DEFAULT_LABEL_OPACITY,
          strokeWidth: DEFAULT_LINE_STROKE_WIDTH,
        };
        nextLineIdRef.current += 1;
        setLines((prev) => [...prev, nextLine]);
        setSelectedLineId(nextLine.id);
        if (isCoarsePointer) {
          setMobileHandleAssist({ lineId: nextLine.id, handleKey: "end" });
        }
        if (!hasCalibration) {
          const calibrationMessage =
            'Garis dibuat. Buka menu "Kalibrasi", pakai tab "Garis Real", isi nilai referensi, lalu tekan "Simpan Kalibrasi".';
          setActionToast({
            id: Date.now(),
            type: "success",
            text: calibrationMessage,
          });
          focusCalibrationStep(calibrationMessage);
        } else {
          setNotice(
            shouldUseMobileOneShotTool
              ? "Line dibuat. Bundaran assist aktif di ujung garis, sentuh area itu untuk adjust panjang."
              : "Line dibuat. Drag ujung atau garis untuk adjust.",
          );
        }
      }
      setDraftLine(null);
      setTool(getIdleTool());
      if (shouldUseMobileOneShotTool) {
        if (hasCalibration) {
          setMobileControlsOpen(false);
        }
      }
    }

    if (interactionRef.current.mode === "draw-free-line" && draftFreeLine) {
      const points = Array.isArray(draftFreeLine.points)
        ? draftFreeLine.points
        : [];
      if (points.length >= MIN_FREE_CUT_POINTS) {
        completeDraftFreeLine();
      } else {
        setDraftFreeLine(null);
        setHistoryPaused(false);
        setNotice("Free Line butuh area minimal 3 titik.");
      }
      setTool(getIdleTool());
      if (shouldUseMobileOneShotTool) {
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
          strokeWidth: DEFAULT_CIRCLE_STROKE_WIDTH,
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
      setTool(getIdleTool());
      if (shouldUseMobileOneShotTool) {
        setMobileControlsOpen(false);
      }
    }

    if (completedInteractionMode === "pan") {
      setView((prev) => clampViewToViewport(prev));
    }

    interactionRef.current = { mode: null, startX: 0, startY: 0 };
    interactionCanvasRectRef.current = null;
    if (
      overlayCanvasRef.current &&
      activePointerIdRef.current !== null &&
      overlayCanvasRef.current.hasPointerCapture?.(activePointerIdRef.current)
    ) {
      try {
        overlayCanvasRef.current.releasePointerCapture(
          activePointerIdRef.current,
        );
      } catch {
        // ignore release failure
      }
    }
    activePointerIdRef.current = null;
    resetMobileLineTapTarget();
    setHistoryPaused(false);
    setGuideBuilderPreviewPoint(null);
    clearSnapPreview();
  }, [
    clampViewToViewport,
    clearSnapPreview,
    completeDraftFreeLine,
    draftCirclePoints,
    draftFreeLine,
    draftLine,
    focusCalibrationStep,
    getIdleTool,
    hasCalibration,
    isCoarsePointer,
    resetMobileLineTapTarget,
    setGuideBuilderPreviewPoint,
    shouldUseMobileOneShotTool,
  ]);

  const handlePointerLeave = useCallback(() => {
    setHoveredMeasurementInfo(null);
    if (interactionRef.current.mode && activePointerIdRef.current !== null) {
      return;
    }
    handlePointerUp();
  }, [handlePointerUp]);

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

        return clampViewToViewport({
          scale: nextScale,
          panX: point.x - anchor.x * nextScale,
          panY: point.y - anchor.y * nextScale,
        });
      });
    },
    [clampViewToViewport, getLocalPoint, image],
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
    const referenceLine =
      selectedLine ||
      lines.find((line) => line.type === "ruler") ||
      lines.find((line) => line.id === calibrationLineId) ||
      null;
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

    if (!referenceLine) {
      setNotice("Pilih satu garis dulu untuk dijadikan referensi kalibrasi.");
      return;
    }

    const actualMm = Number(actualMmInput);
    if (!Number.isFinite(actualMm) || actualMm <= 0) {
      setNotice("Nilai referensi harus angka positif.");
      return;
    }

    const lengthPx = getLineLength(referenceLine);
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
    setCalibrationLineId(referenceLine.id);
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
    calibrationLineId,
    lines,
    mmPerPixelAt100Input,
    selectedLine,
    sourceZoomPercent,
  ]);

  const deleteSelectedFreeLinePoint = useCallback(() => {
    if (
      !selectedCutLayer ||
      selectedCutLayer.kind !== "free-line" ||
      selectedFreeLinePointIndex === null
    ) {
      return false;
    }

    const pointCount = Array.isArray(selectedCutLayer.maskPoints)
      ? selectedCutLayer.maskPoints.length
      : 0;
    if (pointCount <= MIN_FREE_CUT_POINTS) {
      setNotice("Free Line minimal harus memiliki 3 titik.");
      return true;
    }

    const deletedIndex = selectedFreeLinePointIndex;
    setCutLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== selectedCutLayer.id || layer.kind !== "free-line") {
          return layer;
        }
        return {
          ...layer,
          maskPoints: layer.maskPoints.filter(
            (_, index) => index !== deletedIndex,
          ),
        };
      }),
    );
    setSelectedFreeLinePointIndex(
      Math.max(0, Math.min(deletedIndex, pointCount - 2)),
    );
    setNotice(`Titik #${deletedIndex + 1} pada Free Line dihapus.`);
    return true;
  }, [selectedCutLayer, selectedFreeLinePointIndex]);

  const insertFreeLinePointAfterSelection = useCallback(() => {
    if (
      !selectedCutLayer ||
      selectedCutLayer.kind !== "free-line" ||
      selectedFreeLinePointIndex === null ||
      !Array.isArray(selectedCutLayer.maskPoints) ||
      selectedCutLayer.maskPoints.length < 2
    ) {
      setNotice("Pilih satu titik Free Line dulu untuk menambah point.");
      return;
    }

    const pointCount = selectedCutLayer.maskPoints.length;
    const insertAfterIndex = selectedFreeLinePointIndex;
    const nextIndex = (insertAfterIndex + 1) % pointCount;
    const currentPoint = selectedCutLayer.maskPoints[insertAfterIndex];
    const nextPoint = selectedCutLayer.maskPoints[nextIndex];
    const insertedPoint = {
      x: ((Number(currentPoint?.x) || 0) + (Number(nextPoint?.x) || 0)) / 2,
      y: ((Number(currentPoint?.y) || 0) + (Number(nextPoint?.y) || 0)) / 2,
    };
    const insertedIndex = insertAfterIndex + 1;

    setCutLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== selectedCutLayer.id || layer.kind !== "free-line") {
          return layer;
        }
        return {
          ...layer,
          maskPoints: [
            ...layer.maskPoints.slice(0, insertedIndex),
            insertedPoint,
            ...layer.maskPoints.slice(insertedIndex),
          ],
        };
      }),
    );
    setSelectedFreeLinePointIndex(insertedIndex);
    setNotice(
      `Point baru ditambahkan setelah titik #${selectedFreeLinePointIndex + 1}.`,
    );
  }, [selectedCutLayer, selectedFreeLinePointIndex]);

  const adjustSelectedFreeLinePointRound = useCallback(
    (delta) => {
      if (
        !selectedCutLayer ||
        selectedCutLayer.kind !== "free-line" ||
        selectedFreeLinePointIndex === null
      ) {
        setNotice("Pilih satu titik Free Line dulu untuk atur rounded.");
        return;
      }

      updateLayerById(selectedCutLayer.id, (item) => {
        if (item.kind !== "free-line") return item;
        const currentRadius = getFreeLineCurveRadius(
          item,
          selectedFreeLinePointIndex,
        );
        return applyFreeLineCurveRadiusToPoint(
          item,
          selectedFreeLinePointIndex,
          currentRadius + delta,
        );
      });
      setNotice("Rounded point diperbarui.");
    },
    [selectedCutLayer, selectedFreeLinePointIndex, updateLayerById],
  );

  const removeSelectedLine = useCallback(() => {
    if (deleteSelectedFreeLinePoint()) {
      return;
    }

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

    if (selectedCutLayer) {
      setCutLayers((prev) =>
        prev.filter((item) => item.id !== selectedCutLayer.id),
      );
      setSelectedCutLayerId(null);
      setNotice("Layer terpilih dihapus.");
      return;
    }

    setNotice("Tidak ada measurement yang dipilih.");
  }, [
    calibrationLineId,
    deleteSelectedFreeLinePoint,
    isLineLocked,
    selectedAngle,
    selectedCircle,
    selectedCutLayer,
    selectedHka,
    selectedLine,
  ]);
  const shouldEmphasizeCalibration =
    highlightCalibrationPanel ||
    (!hasCalibration && calibrationMode === "line" && Boolean(selectedLine));
  const shouldShowCanvasCalibrationPrompt =
    !hasCalibration && calibrationMode === "line" && lines.length > 0;
  const canvasCalibrationPromptText = selectedLine
    ? `Line #${selectedLine.id} belum dikalibrasi. Buka Kalibrasi lalu simpan faktor real.`
    : "Measurement butuh kalibrasi. Pilih satu line referensi lalu simpan kalibrasi.";

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
    setDraftFreeLine(null);
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
    setCutLayers((prev) => reorderLayerStack(prev, [layerId], placement));
    setNotice("Urutan layer diperbarui.");
  }, []);

  const moveSelectedCutLayersInStack = useCallback(
    (placement) => {
      if (!selectedCutLayerIds.length) {
        setNotice("Pilih layer dulu untuk mengubah urutan.");
        return;
      }
      setCutLayers((prev) =>
        reorderLayerStack(prev, selectedCutLayerIds, placement),
      );
      setNotice(
        selectedCutLayerIds.length > 1
          ? `Urutan ${selectedCutLayerIds.length} layer diperbarui.`
          : "Urutan layer diperbarui.",
      );
    },
    [selectedCutLayerIds],
  );

  const alignSelectedCutLayers = useCallback(
    (mode) => {
      if (selectedCutLayers.length < 2 || !selectedCutLayer) {
        setNotice("Pilih minimal 2 layer untuk align.");
        return;
      }

      const referenceBounds = getLayerBounds(selectedCutLayer);
      setCutLayers((prev) =>
        prev.map((layer) => {
          if (
            !selectedCutLayerIdsSet.has(layer.id) ||
            layer.id === selectedCutLayer.id ||
            layer.lockScale
          ) {
            return layer;
          }
          const layerBounds = getLayerBounds(layer);
          let dx = 0;
          let dy = 0;
          if (mode === "left") dx = referenceBounds.left - layerBounds.left;
          if (mode === "center")
            dx = referenceBounds.centerX - layerBounds.centerX;
          if (mode === "right") dx = referenceBounds.right - layerBounds.right;
          if (mode === "top") dy = referenceBounds.top - layerBounds.top;
          if (mode === "middle")
            dy = referenceBounds.centerY - layerBounds.centerY;
          if (mode === "bottom")
            dy = referenceBounds.bottom - layerBounds.bottom;
          return {
            ...layer,
            centerX: Number(layer.centerX || 0) + dx,
            centerY: Number(layer.centerY || 0) + dy,
          };
        }),
      );
      setNotice(`Align ${mode} diterapkan ke ${selectedCutLayers.length} layer.`);
    },
    [selectedCutLayer, selectedCutLayerIdsSet, selectedCutLayers.length],
  );

  const distributeSelectedCutLayers = useCallback(
    (axis) => {
      if (selectedCutLayers.length < 3) {
        setNotice("Pilih minimal 3 layer untuk distribute.");
        return;
      }

      const sorted = [...selectedCutLayers].sort((left, right) => {
        const leftBounds = getLayerBounds(left);
        const rightBounds = getLayerBounds(right);
        return axis === "horizontal"
          ? leftBounds.centerX - rightBounds.centerX
          : leftBounds.centerY - rightBounds.centerY;
      });

      const firstBounds = getLayerBounds(sorted[0]);
      const lastBounds = getLayerBounds(sorted[sorted.length - 1]);
      const start = axis === "horizontal" ? firstBounds.centerX : firstBounds.centerY;
      const end = axis === "horizontal" ? lastBounds.centerX : lastBounds.centerY;
      const step = (end - start) / Math.max(1, sorted.length - 1);
      const targets = new Map(
        sorted.map((layer, index) => [layer.id, start + step * index]),
      );

      setCutLayers((prev) =>
        prev.map((layer) => {
          const target = targets.get(layer.id);
          if (target === undefined || layer.lockScale) return layer;
          const bounds = getLayerBounds(layer);
          if (axis === "horizontal") {
            return {
              ...layer,
              centerX: Number(layer.centerX || 0) + (target - bounds.centerX),
            };
          }
          return {
            ...layer,
            centerY: Number(layer.centerY || 0) + (target - bounds.centerY),
          };
        }),
      );
      setNotice(
        `Distribusi ${axis === "horizontal" ? "horizontal" : "vertikal"} diterapkan.`,
      );
    },
    [selectedCutLayers],
  );

  const groupSelectedCutLayers = useCallback(() => {
    if (selectedCutLayerIds.length < 2) {
      setNotice("Pilih minimal 2 layer untuk digroup.");
      return;
    }
    const nextGroupId = createTemplatingId();
    setCutLayers((prev) =>
      prev.map((layer) =>
        selectedCutLayerIdsSet.has(layer.id)
          ? { ...layer, groupId: nextGroupId }
          : layer,
      ),
    );
    setNotice(`Group dibuat untuk ${selectedCutLayerIds.length} layer.`);
  }, [selectedCutLayerIds.length, selectedCutLayerIdsSet]);

  const ungroupSelectedCutLayers = useCallback(() => {
    if (!selectedCutLayerIds.length) {
      setNotice("Pilih layer dulu untuk ungroup.");
      return;
    }
    const targetGroupIds = new Set(
      selectedCutLayers
        .map((layer) => layer.groupId)
        .filter((groupId) => Boolean(groupId)),
    );
    if (!targetGroupIds.size) {
      setNotice("Layer terpilih belum punya group.");
      return;
    }
    setCutLayers((prev) =>
      prev.map((layer) =>
        targetGroupIds.has(layer.groupId)
          ? { ...layer, groupId: null }
          : layer,
      ),
    );
    setNotice("Group layer dibuka.");
  }, [selectedCutLayerIds.length, selectedCutLayers]);

  const duplicateSelectedCutLayer = useCallback(() => {
    if (!selectedCutLayerIds.length) {
      setNotice("Pilih layer dulu untuk diduplikasi.");
      return;
    }

    const orderedSelection = cutLayers.filter((layer) =>
      selectedCutLayerIdsSet.has(layer.id),
    );
    const nextGroupId =
      orderedSelection.length > 1 ? createTemplatingId() : null;
    const duplicatedLayers = orderedSelection.map((layer, index) => {
      const nextId = nextCutLayerIdRef.current + index;
      return {
        ...layer,
        id: nextId,
        groupId: orderedSelection.length > 1 ? nextGroupId : null,
        name: `${layer.name || `Layer #${layer.id}`} Copy`,
        centerX: Number(layer.centerX || 0) + DEFAULT_LAYER_DUPLICATE_OFFSET,
        centerY: Number(layer.centerY || 0) + DEFAULT_LAYER_DUPLICATE_OFFSET,
      };
    });
    nextCutLayerIdRef.current += duplicatedLayers.length;
    setCutLayers((prev) => [...prev, ...duplicatedLayers]);
    if (duplicatedLayers.length) {
      setSelectedCutLayerId(duplicatedLayers[0].id);
      setSelectedCutLayerExtraIds(
        duplicatedLayers.slice(1).map((layer) => layer.id),
      );
    }
    setNotice(
      duplicatedLayers.length > 1
        ? `${duplicatedLayers.length} layer berhasil diduplikasi dengan offset.`
        : `Layer #${orderedSelection[0].id} berhasil diduplikasi dengan offset.`,
    );
  }, [cutLayers, selectedCutLayerIds.length, selectedCutLayerIdsSet]);

  const removeSelectedCutLayer = useCallback(() => {
    if (!selectedCutLayerIds.length) {
      setNotice("Pilih layer dulu untuk dihapus.");
      return;
    }
    const deletedLayerIds = [...selectedCutLayerIds];
    const deletedIdSet = new Set(deletedLayerIds);
    setCutLayers((prev) => prev.filter((layer) => !deletedIdSet.has(layer.id)));
    setSelectedCutLayerId(null);
    setSelectedCutLayerExtraIds([]);
    setNotice(
      deletedLayerIds.length > 1
        ? `${deletedLayerIds.length} layer dihapus.`
        : `Layer #${deletedLayerIds[0]} dihapus.`,
    );
  }, [selectedCutLayerIds]);

  const resetCutArea = useCallback(() => {
    setDraftCut(null);
    setDraftFreeLine(null);
    setDraftFreeLineTargetLayerId(null);
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
      setDraftCenterFinderPoints([]);
      setDraftAxisBuilderPoints([]);
      setDraftHkaPoints([]);
      setDraftFreeLine(null);
      setGuideBuilderPreviewPoint(null);
      setGuideBuilderMode("parallel");
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
      setHkaSideModalOpen(false);
      setSimpleLayerDropdownOpen(false);
      setSimplePlanningModal(null);
      setSimpleGuideModalOpen(false);
      setMeasureAnatomyTab("knee");
      setHkaInputMode("full");
      setHkaSide("right");
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
        `${getLayerDefaultName(selectedCutLayer)}-${sourceW}x${sourceH}`,
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
        return false;
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
          return false;
        }

        return addImageAsWorkspaceLayer({
          layerImage,
          imageSrc: loaded.src,
          name: template.name,
          sizeMode: "inherit-template",
          noticeText: `Template "${template.name}" ditambahkan ke canvas.`,
          autoScaleFromCalibration: Boolean(template.autoScaleFromCalibration),
        });
      } catch {
        setNotice("Gagal load template dari library.");
        return false;
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
    const calibrationInstruction = `Implant "${selectedImplantLibraryItem.label}" ditambahkan. Klik Calib/Ruler, pilih atau buat garis kalibrasi, isi nilai real, lalu Simpan Kalibrasi supaya implant mengikuti skala X-ray.`;
    void addTemplateToCanvas({
      id: selectedImplantLibraryItem.id,
      name: selectedImplantLibraryItem.label,
      imageSrc: selectedImplantLibraryItem.imageSrc,
      sourceWidth: 0,
      sourceHeight: 0,
      autoScaleFromCalibration: true,
    }).then((added) => {
      if (!added || mmPerPixel !== null) return;
      if (isSimpleUiMode) {
        openSimpleCalibrationModal(calibrationInstruction);
        return;
      }
      focusCalibrationStep(calibrationInstruction);
    });
  }, [
    addTemplateToCanvas,
    focusCalibrationStep,
    isSimpleUiMode,
    mmPerPixel,
    openSimpleCalibrationModal,
    selectedImplantLibraryItem,
  ]);

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
      const result = getHkaMeasurementResult(item);
      rows.push({
        type: "HKA",
        value:
          result.mode === "fta"
            ? result.fta !== null && result.predictedHka !== null
              ? `FTA ${result.fta.toFixed(2)}° | HKAA ${result.predictedHka.toFixed(2)}°`
              : "FTA belum lengkap"
            : result.absoluteDeviation !== null
              ? `${result.label} (${result.absoluteDeviation.toFixed(2)}°)`
              : "Belum lengkap",
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
        kind: getLayerDefaultName(layer),
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
      `${isActive ? `${SOFT_DARK_BUTTON_CLASS} ${activeClass}` : `${SOFT_RAISED_CLASS} text-slate-700`} px-2 py-2 text-xs font-medium transition`,
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

  function focusPlanningGuideCanvas(
    guideId,
    { openPanel = false, showNotice = false } = {},
  ) {
    setSelectedPlanningGuideId(guideId);
    setMeasureAnatomyTab("knee");
    setMobilePanelMode("workspace");
    if (isMobileViewport) {
      setMobileControlsOpen(openPanel);
    }
    setActiveRightPanel("measure");
    if (showNotice) {
      setNotice(
        openPanel
          ? "Planning guide dipilih. Parameter bisa diubah lalu update lagi."
          : "Planning guide dipilih. Adjust bisa langsung dari canvas.",
      );
    }
  }

  function selectPlanningGuideForEdit(guideId) {
    focusPlanningGuideCanvas(guideId, { openPanel: true, showNotice: true });
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
            const nextGuide = {
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
            return guide.customColor
              ? nextGuide
              : { ...nextGuide, color: getPlanningGuideAutoColor(nextGuide) };
          }

          if (planningGuideMode === "tibialSlope") {
            const nextGuide = {
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
            return guide.customColor
              ? nextGuide
              : { ...nextGuide, color: getPlanningGuideAutoColor(nextGuide) };
          }

          const nextGuide = {
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
          return guide.customColor
            ? nextGuide
            : { ...nextGuide, color: getPlanningGuideAutoColor(nextGuide) };
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
      getPlanningGuideAutoColor,
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
              ? `${getLayerDefaultName(selectedCutLayer)} #${selectedCutLayer.id}`
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
        strokeWidth: DEFAULT_PLANNING_GUIDE_STROKE_WIDTH,
        labelOffsetX: DEFAULT_GUIDE_LABEL_OFFSET_X,
        labelOffsetY: DEFAULT_GUIDE_LABEL_OFFSET_Y,
        labelOpacity: DEFAULT_LABEL_OPACITY,
        customColor: false,
      };
      nextGuide.color = getPlanningGuideAutoColor(nextGuide);
      setPlanningGuides((prev) => [...prev, nextGuide]);
      focusPlanningGuideCanvas(nextGuide.id, { openPanel: false });
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
        strokeWidth: DEFAULT_PLANNING_GUIDE_STROKE_WIDTH,
        labelOffsetX: DEFAULT_GUIDE_LABEL_OFFSET_X,
        labelOffsetY: DEFAULT_GUIDE_LABEL_OFFSET_Y,
        labelOpacity: DEFAULT_LABEL_OPACITY,
        customColor: false,
      };
      nextGuide.color = getPlanningGuideAutoColor(nextGuide);
      setPlanningGuides((prev) => [...prev, nextGuide]);
      focusPlanningGuideCanvas(nextGuide.id, { openPanel: false });
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
      strokeWidth: DEFAULT_PLANNING_GUIDE_STROKE_WIDTH,
      labelOffsetX: DEFAULT_GUIDE_LABEL_OFFSET_X,
      labelOffsetY: DEFAULT_GUIDE_LABEL_OFFSET_Y,
      labelOpacity: DEFAULT_LABEL_OPACITY,
      customColor: false,
    };
    nextGuide.color = getPlanningGuideAutoColor(nextGuide);
    setPlanningGuides((prev) => [...prev, nextGuide]);
    focusPlanningGuideCanvas(nextGuide.id, { openPanel: false });
    setNotice(`Tibial cut guide dibuat dari Line #${selectedLine.id}.`);
  }, [
    focusPlanningGuideCanvas,
    getPlanningGuideAutoColor,
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
      if (isMeta && key === "d" && selectedCutLayerIds.length > 0) {
        event.preventDefault();
        duplicateSelectedCutLayer();
        return;
      }
      if (key === "[" && selectedCutLayerIds.length > 0) {
        event.preventDefault();
        moveSelectedCutLayersInStack(event.shiftKey ? "back" : "down");
        return;
      }
      if (key === "]" && selectedCutLayerIds.length > 0) {
        event.preventDefault();
        moveSelectedCutLayersInStack(event.shiftKey ? "front" : "up");
        return;
      }

      if (
        key === "escape" &&
        (draftCut?.points?.length ||
          draftFreeLine?.points?.length ||
          draftCenterFinderPoints.length ||
          draftAxisBuilderPoints.length)
      ) {
        event.preventDefault();
        setDraftCut(null);
        setDraftFreeLine(null);
        setDraftCenterFinderPoints([]);
        setDraftAxisBuilderPoints([]);
        setGuideBuilderPreviewPoint(null);
        setHistoryPaused(false);
        setNotice(
          draftFreeLine?.points?.length
            ? "Free Line dibatalkan."
            : draftCenterFinderPoints.length
              ? "Center Finder dibatalkan."
              : draftAxisBuilderPoints.length
                ? "Axis Builder dibatalkan."
                : "Free cut dibatalkan.",
        );
        return;
      }

      if (key === "enter" && tool === "cut" && draftCut?.points?.length >= 3) {
        event.preventDefault();
        completeDraftCut();
        return;
      }
      if (
        key === "enter" &&
        tool === "freeLine" &&
        freeLineMode === "point" &&
        draftFreeLine?.points?.length >= MIN_FREE_CUT_POINTS
      ) {
        event.preventDefault();
        completeDraftFreeLine();
        return;
      }

      if (key === "l" || key === "d") handleToolChange("draw");
      if (key === "g") handleToolChange("freeLine");
      if (key === "h" || key === "m" || key === "p") handleToolChange("pan");
      if (key === "c") handleToolChange("cut");
      if (key === "a") handleToolChange("angle");
      if (key === "o") handleToolChange("circle");
      if (key === "k") handleToolChange("hkaAuto");
      if (key === "j") handleToolChange("centerFinder");
      if (key === "b") handleToolChange("axisBuilder");
      if (key === "q") handleToolChange("guideBuilder");
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
    completeDraftFreeLine,
    draftAxisBuilderPoints,
    draftCenterFinderPoints,
    draftCut,
    draftFreeLine,
    duplicateSelectedCutLayer,
    freeLineMode,
    fitImageToViewport,
    handleToolChange,
    moveSelectedCutLayersInStack,
    redoHistory,
    removeSelectedLine,
    selectedCutLayerIds.length,
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

        return clampViewToViewport({
          scale: nextScale,
          panX: centerX - anchorX * nextScale,
          panY: centerY - anchorY * nextScale,
        });
      });
    },
    [clampViewToViewport, viewport.height, viewport.width],
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

  const effectiveShowLeftSidebar = showLeftSidebar && !isSimpleUiMode;
  const effectiveShowRightSidebar = showRightSidebar && !isSimpleUiMode;
  const desktopSectionClass =
    effectiveShowLeftSidebar && effectiveShowRightSidebar
      ? "lg:[grid-template-columns:var(--left-sidebar-width)_minmax(0,1fr)_var(--right-sidebar-width)]"
      : effectiveShowLeftSidebar
        ? "lg:[grid-template-columns:var(--left-sidebar-width)_minmax(0,1fr)]"
        : effectiveShowRightSidebar
          ? "lg:[grid-template-columns:minmax(0,1fr)_var(--right-sidebar-width)]"
          : "lg:grid-cols-1";
  const isLeftSidebarCompact = leftSidebarWidth <= 170;
  const isLeftSidebarNarrow = leftSidebarWidth <= 220;
  const isRightSidebarCompact = rightSidebarWidth <= 170;
  const isRightSidebarNarrow = rightSidebarWidth <= 220;
  const mobileSetupPanelVisible =
    isMobileViewport &&
    !isSimpleUiMode &&
    mobileControlsOpen &&
    effectiveShowLeftSidebar &&
    mobilePanelMode === "setup";
  const mobileWorkspacePanelVisible =
    isMobileViewport &&
    !isSimpleUiMode &&
    mobileControlsOpen &&
    effectiveShowRightSidebar &&
    mobilePanelMode === "workspace";
  const activeToolLabel =
    tool === "draw"
      ? "Draw"
      : tool === "freeLine"
        ? freeLineMode === "point"
          ? "Point Mode"
          : "Free Line"
        : tool === "pan"
          ? "Move"
          : tool === "cut"
            ? "Free Cut"
            : tool === "centerFinder"
              ? "Center"
              : tool === "axisBuilder"
                ? "Axis"
                : tool === "guideBuilder"
                  ? "Guide"
            : tool === "angle"
              ? "Angle"
                : tool === "circle"
                ? "Circle"
                : "HKA";
  const activeOrthoBuilderMeta =
    tool === "centerFinder"
      ? {
          key: "centerFinder",
          title: "Center Finder",
          icon: "centerFinder",
          status: `${draftCenterFinderPoints.length}/3 titik`,
          info:
            "Klik tiga titik di tepi struktur melingkar. Sistem menghitung center dan membuat circle referensi yang langsung bisa dipilih dan diedit.",
        }
      : tool === "axisBuilder"
        ? {
            key: "axisBuilder",
            title: "Axis Builder",
            icon: "axisBuilder",
            status:
              draftAxisBuilderPoints.length < 2
                ? `${draftAxisBuilderPoints.length}/2 proximal`
                : `${Math.max(0, draftAxisBuilderPoints.length - 2)}/2 distal`,
            info:
              "Klik dua titik pada segmen proximal lalu dua titik pada segmen distal. Sistem mengambil midpoint kedua segmen dan membuat satu garis axis.",
          }
        : tool === "guideBuilder"
          ? {
              key: "guideBuilder",
              title: "Guide Builder",
              icon: "guideBuilder",
              status: guideBuilderReference
                ? `${guideBuilderMode === "parallel" ? "Parallel" : "Perp"} | ${guideBuilderReference.label}`
                : "Pilih acuan",
              info:
              "Pilih dulu satu line atau planning guide sebagai acuan. Setelah itu pilih mode Parallel atau Perpendicular, lalu klik canvas untuk menjatuhkan guide baru.",
            }
          : null;
  const activeSnapModeCount = [
    "endpoint",
    "midpoint",
    "intersection",
    "center",
    "tangent",
    "perpendicular",
  ].filter((key) => snapSettings[key]).length;
  const snapSummaryLabel = snapToLandmarks
    ? `${activeSnapModeCount} mode aktif${snapSettings.shiftOnlyDesktop ? " • Shift" : ""}`
    : "Snap nonaktif";
  const layerMoveSummaryLabel =
    selectedCutLayerIds.length > 0
      ? `${selectedCutLayerIds.length} layer terpilih${selectedCutLayerGroupId ? " • group aktif" : ""}`
      : cutLayers.length > 0
        ? `${cutLayers.length} layer siap diatur`
        : "Belum ada layer";
  const hasLayerContentControls = Boolean(
    selectedCutLayer &&
      (isImageBackedLayerKind(selectedCutLayer.kind) ||
        selectedCutLayer.kind === "free-line"),
  );
  const simpleWorkflowSteps = [
    {
      id: 1,
      label: "Upload",
      done: Boolean(image),
      onClick: () => mainUploadInputRef.current?.click(),
    },
    {
      id: 2,
      label: "Calib",
      done: hasCalibration,
      onClick: () => openSimpleCalibrationModal(),
    },
    {
      id: 3,
      label: "Ukur",
      done: measurementEntityCount > 0,
      onClick: () => {
        if (!hasCalibration) {
          openSimpleCalibrationModal(
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
      done: hasCalibration && measurementEntityCount > 0,
      onClick: () => {
        if (!hasCalibration) {
          openSimpleCalibrationModal(
            "Export report dikunci sampai kalibrasi aktif.",
          );
          return;
        }
        focusExportStep();
      },
    },
  ];
  const selectedLayerDropdownLabel = selectedCutLayer
    ? selectedCutLayer.name || getLayerDefaultName(selectedCutLayer)
    : cutLayers.length > 0
      ? "Pilih layer"
      : "Layer kosong";
  const implantLibraryScaleInstruction = hasCalibration
    ? "Kalibrasi aktif: implant lokal akan mencoba auto-scale mengikuti garis kalibrasi dari ruler template. Jika belum pas, pilih layer lalu tekan Ruler atau Scale."
    : "Sebelum memakai implant lokal, klik Calib/Ruler, pilih atau buat garis kalibrasi, isi nilai real, lalu Simpan Kalibrasi.";
  const simpleToolMenuItems = [
    { icon: "draw", label: "Line", desc: "gambar ukur", key: "draw" },
    { icon: "pan", label: "Move", desc: "drag canvas/layer", key: "pan" },
    { icon: "cut", label: "Cut", desc: "fragment", key: "cut" },
    {
      icon: "freeLine",
      label: "Free",
      desc: "freehand",
      key: "freeLine",
      freeLineMode: "freehand",
    },
    {
      icon: "freeLine",
      label: "Point",
      desc: "point mode",
      key: "freeLinePoint",
      freeLineMode: "point",
    },
    { icon: "angle", label: "Angle", desc: "sudut", key: "angle" },
    { icon: "hka", label: "HKA", desc: "axis knee", key: "hkaAuto" },
    { icon: "guideBuilder", label: "Guide", desc: "parallel", key: "guideBuilder" },
  ];
  const mobileNavigationTabs = [
    {
      id: "setup",
      label: "Setup",
      onClick: () => {
        if (isSimpleUiMode) {
          setSimpleMobilePanel((prev) => (prev === "quick" ? null : "quick"));
          return;
        }
        setMobilePanelMode("setup");
        setMobileControlsOpen(true);
      },
      active: isSimpleUiMode
        ? simpleMobilePanel === "quick"
        : mobileSetupPanelVisible,
    },
    {
      id: "tool",
      label: "Tool",
      onClick: () => {
        if (isSimpleUiMode) {
          setSimpleMobilePanel((prev) => (prev === "tools" ? null : "tools"));
          return;
        }
        setMobilePanelMode("workspace");
        setActiveRightPanel("tool");
        setMobileControlsOpen(true);
      },
      active: isSimpleUiMode
        ? simpleMobilePanel === "tools"
        : mobileWorkspacePanelVisible && activeRightPanel === "tool",
    },
    {
      id: "measure",
      label: "Measure",
      onClick: () => {
        if (isSimpleUiMode) {
          setSimpleMobilePanel(null);
          openSimpleCalibrationModal();
          return;
        }
        setMobilePanelMode("workspace");
        setActiveRightPanel("measure");
        setMobileControlsOpen(true);
      },
      active: isSimpleUiMode
        ? simpleCalibrationModalOpen
        : mobileWorkspacePanelVisible && activeRightPanel === "measure",
    },
    {
      id: "planning",
      label: "Plan",
      onClick: () => {
        if (isSimpleUiMode) {
          setSimpleMobilePanel((prev) =>
            prev === "planning" ? null : "planning",
          );
          return;
        }
        setMobilePanelMode("workspace");
        setActiveRightPanel("planning");
        setMobileControlsOpen(true);
      },
      active: isSimpleUiMode
        ? simpleMobilePanel === "planning" || Boolean(simplePlanningModal)
        : mobileWorkspacePanelVisible && activeRightPanel === "planning",
    },
  ];
  const mobileNavigationActiveTool =
    (isSimpleUiMode && simpleMobilePanel === "tools") ||
    (!isSimpleUiMode &&
      mobileWorkspacePanelVisible &&
      activeRightPanel === "tool" &&
      tool !== "pan" &&
      tool !== "draw")
      ? "tools"
      : tool === "draw"
        ? "draw"
        : tool === "pan"
          ? "pan"
          : "tools";

  return (
    <div className="flex min-h-[100dvh] w-screen max-w-none flex-col gap-0 bg-[linear-gradient(180deg,#f8fafc_0%,#edf2f7_100%)] px-0 py-0 text-slate-700 sm:gap-2 sm:px-2 sm:py-2 lg:px-3">
      <ModalStarter
        open={showStartupCalibrationAlert}
        onExit={goToCalibrationPanel}
        onConfirm={goToCalibrationPanel}
      />
      <AnimatePresence>
        {actionToast ? (
          <motion.div
            key={actionToast.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={PANEL_SPRING}
            className={`fixed top-4 right-4 z-[95] max-w-[320px] px-3 py-2 text-xs font-medium transition-all ${
              actionToast.type === "success"
                ? `${SOFT_SURFACE_CLASS} text-emerald-900`
                : `${SOFT_SURFACE_CLASS} text-slate-800`
            }`}
          >
            {actionToast.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {toolConfigModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[94] flex items-center justify-center p-4 ${
              toolConfigModal === "layerSettings"
                ? "bg-slate-950/24 backdrop-blur-sm"
                : "bg-slate-950/35"
            }`}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setToolConfigModal(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              transition={PANEL_SPRING}
              className={
                toolConfigModal === "layerSettings"
                  ? "max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-[30px] border border-white/80 bg-[#eef2f7] p-5 text-slate-900 shadow-[0_18px_44px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.74)]"
                  : `w-full ${
                      toolConfigModal === "layerMove" ||
                      toolConfigModal === "layerLayout"
                        ? "max-w-2xl"
                        : toolConfigModal === "snapTool"
                          ? "max-w-lg"
                          : "max-w-md"
                    } ${SOFT_PANEL_CLASS}`
              }
            >
              <div
                className={
                  toolConfigModal === "layerSettings"
                    ? "mb-4 flex items-center justify-between gap-3"
                    : "mb-2 flex items-center justify-between gap-3"
                }
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={
                      toolConfigModal === "snapTool"
                        ? "lock"
                        : toolConfigModal === "layerSettings"
                          ? "settings"
                        : toolConfigModal === "centerFinder"
                        ? "centerFinder"
                        : toolConfigModal === "axisBuilder"
                          ? "axisBuilder"
                          : toolConfigModal === "layerMove" ||
                              toolConfigModal === "layerLayout"
                            ? "package"
                            : "guideBuilder"
                    }
                    className={
                      toolConfigModal === "layerSettings"
                        ? "h-5 w-5 text-cyan-800"
                        : "h-4 w-4 text-cyan-700"
                    }
                  />
                  <div
                    className={
                      toolConfigModal === "layerSettings"
                        ? "text-lg font-extrabold text-slate-950"
                        : "text-sm font-semibold text-slate-900"
                    }
                  >
                    {toolConfigModal === "snapTool"
                      ? "Snap Tool"
                      : toolConfigModal === "layerSettings"
                        ? "Layer Settings"
                      : toolConfigModal === "centerFinder"
                      ? "Center Finder"
                      : toolConfigModal === "axisBuilder"
                        ? "Axis Builder"
                        : toolConfigModal === "layerMove" ||
                            toolConfigModal === "layerLayout"
                          ? "Layer Move"
                          : "Parallel / Perpendicular Guide"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setToolConfigModal(null)}
                  className={
                    toolConfigModal === "layerSettings"
                      ? "rounded-full border border-white/70 bg-[#eef2f7] px-5 py-2 text-xs font-semibold text-slate-700 shadow-[4px_4px_10px_rgba(148,163,184,0.42),-4px_-4px_10px_rgba(255,255,255,0.82)] transition hover:text-slate-950"
                      : `${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px]`
                  }
                >
                  Tutup
                </button>
              </div>

              {toolConfigModal === "snapTool" ? (
                <div className="flex flex-col gap-2">
                  <div className={`${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700`}>
                    Snap membantu titik baru atau handle menempel ke kandidat geometris terdekat saat draw dan edit. Gunakan Shift Only bila snap hanya ingin aktif saat tombol Shift ditahan di desktop.
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSnapToLandmarks((prev) => !prev)}
                      className={
                        snapToLandmarks
                          ? `${SOFT_DARK_BUTTON_CLASS} px-3 py-2`
                          : `${SOFT_TEXT_BUTTON_CLASS} text-slate-700`
                      }
                    >
                      {snapToLandmarks ? "ON" : "OFF"}
                    </button>
                    <div className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-slate-700`}>
                      {snapSummaryLabel} • Kandidat {snapCandidates.length}
                    </div>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    {[
                      { key: "endpoint", label: "End" },
                      { key: "midpoint", label: "Mid" },
                      { key: "intersection", label: "X" },
                      { key: "center", label: "Center" },
                      { key: "tangent", label: "Tan" },
                      { key: "perpendicular", label: "Perp" },
                    ].map((item) => (
                      <button
                        key={`snap-modal-${item.key}`}
                        type="button"
                        onClick={() =>
                          setSnapSettings((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                        }
                        disabled={!snapToLandmarks}
                        className={
                          snapToLandmarks && snapSettings[item.key]
                            ? `${SOFT_PRESSED_CLASS} px-2 py-2 text-xs font-medium text-cyan-800`
                            : `${SOFT_RAISED_CLASS} px-2 py-2 text-xs font-medium text-slate-500 disabled:opacity-45`
                        }
                        title={`Snap ${item.label}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSnapSettings((prev) => ({
                          ...prev,
                          shiftOnlyDesktop: !prev.shiftOnlyDesktop,
                        }))
                      }
                      disabled={!snapToLandmarks}
                      className={
                        snapToLandmarks && snapSettings.shiftOnlyDesktop
                          ? `${SOFT_PRESSED_CLASS} px-2 py-2 text-xs font-medium text-cyan-800`
                          : `${SOFT_RAISED_CLASS} px-2 py-2 text-xs font-medium text-slate-500 disabled:opacity-45`
                      }
                    >
                      Shift Only
                    </button>
                    <div
                      className={`inline-flex items-center justify-center px-3 py-2 text-[10px] font-semibold ${
                        snapSettings.shiftOnlyDesktop && snapModifierPressed
                          ? `${SOFT_DARK_BUTTON_CLASS} text-white`
                          : `${SOFT_RAISED_CLASS} text-slate-500`
                      }`}
                    >
                      {snapModifierPressed ? "SHIFT" : "free"}
                    </div>
                  </div>
                  <div className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-[11px] text-slate-600`}>
                    {activeSnapTarget
                      ? `Snap aktif sekarang: ${activeSnapTarget.label}`
                      : "Belum ada target snap aktif di canvas."}
                  </div>
                </div>
              ) : null}

              {toolConfigModal === "layerSettings" ? (
                <div className="flex flex-col gap-2">
                  {!selectedCutLayer || !selectedLayerMetrics ? (
                    <div className={`${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700`}>
                      Pilih satu layer dulu untuk membuka pengaturan detail.
                    </div>
                  ) : (
                    <>
                      <div
                        className="rounded-full border border-white/75 bg-[#eef2f7] px-4 py-3 text-sm text-slate-800 shadow-[inset_4px_4px_9px_rgba(148,163,184,0.24),inset_-4px_-4px_9px_rgba(255,255,255,0.82)]"
                        style={{
                          color: selectedLayerPalette?.text || "#334155",
                        }}
                      >
                        {selectedCutLayer.name ||
                          getLayerDefaultName(selectedCutLayer)}{" "}
                        | {selectedCutLayerIndex + 1}/{cutLayers.length}
                        {hasLayerMultiSelection
                          ? ` • primary dari ${selectedCutLayerIds.length} layer`
                          : ""}
                      </div>
                      <div
                        className={`grid gap-1.5 rounded-full border border-white/70 bg-[#eef2f7] p-1.5 shadow-[inset_5px_5px_12px_rgba(148,163,184,0.22),inset_-5px_-5px_12px_rgba(255,255,255,0.86)] ${
                          hasLayerContentControls ? "grid-cols-3" : "grid-cols-2"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setLayerSettingsTab("transform")}
                          className={`rounded-full px-2 py-2.5 text-xs font-bold transition ${
                            layerSettingsTab === "transform"
                              ? "bg-[linear-gradient(180deg,#6d9bc2_0%,#426e95_100%)] text-white shadow-[inset_2px_2px_5px_rgba(15,23,42,0.18),4px_4px_10px_rgba(66,110,149,0.22)]"
                              : "text-cyan-900/80"
                          }`}
                        >
                          Transform
                        </button>
                        {hasLayerContentControls ? (
                          <button
                            type="button"
                            onClick={() => setLayerSettingsTab("content")}
                            className={`rounded-full px-2 py-2.5 text-xs font-bold transition ${
                              layerSettingsTab === "content"
                                ? "bg-[linear-gradient(180deg,#6d9bc2_0%,#426e95_100%)] text-white shadow-[inset_2px_2px_5px_rgba(15,23,42,0.18),4px_4px_10px_rgba(66,110,149,0.22)]"
                                : "text-cyan-900/80"
                            }`}
                          >
                            Content
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setLayerSettingsTab("view")}
                          className={`rounded-full px-2 py-2.5 text-xs font-bold transition ${
                            layerSettingsTab === "view"
                              ? "bg-[linear-gradient(180deg,#6d9bc2_0%,#426e95_100%)] text-white shadow-[inset_2px_2px_5px_rgba(15,23,42,0.18),4px_4px_10px_rgba(66,110,149,0.22)]"
                              : "text-cyan-900/80"
                          }`}
                        >
                          View
                        </button>
                      </div>

                      {layerSettingsTab === "transform" ? (
                        <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-3 gap-2 rounded-[22px] border border-white/70 bg-[#eef2f7] p-2 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.18),inset_-4px_-4px_10px_rgba(255,255,255,0.82)]">
                            <IconButton
                              icon="target"
                              label="Center Layer"
                              onClick={() =>
                                updateLayerById(selectedCutLayer.id, {
                                  centerX: modelWidth / 2,
                                  centerY: modelHeight / 2,
                                })
                              }
                              className="h-9 w-full"
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
                              className="h-9 w-full"
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
                              className="h-9 w-full"
                            />
                          </div>
                          <div className="rounded-[24px] border border-white/75 bg-[#eef2f7] p-4 shadow-[5px_5px_14px_rgba(148,163,184,0.28),-5px_-5px_14px_rgba(255,255,255,0.82)]">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-extrabold text-slate-950">
                                Ukuran
                              </div>
                              <div className="text-xs font-medium text-slate-700">
                                Real: W{" "}
                                {formatTemplateLayerRealSize(
                                  selectedLayerMetrics.widthMm,
                                )}{" "}
                                | H{" "}
                                {formatTemplateLayerRealSize(
                                  selectedLayerMetrics.heightMm,
                                )}
                              </div>
                              <div className="text-xs font-semibold text-slate-500">
                                Aktif ({measurementUnit})
                              </div>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
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
                              controlStyle="knob"
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
                              controlStyle="knob"
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
                              controlStyle="knob"
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
                              controlStyle="knob"
                            />
                            <div className="md:col-span-2">
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
                            <div className="md:col-span-2">
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
                                controlStyle="knob"
                              />
                            </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {layerSettingsTab === "content" ? (
                        <div className="flex flex-col gap-2">
                          {isImageBackedLayerKind(selectedCutLayer.kind) ? (
                            <div className={`${SOFT_SURFACE_CLASS} px-3 py-3`}>
                              <div className="flex items-center justify-between gap-2 text-[13px] text-slate-700">
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
                                    className={`${SOFT_TEXT_BUTTON_CLASS} shrink-0 px-2 py-1 text-[10px] text-slate-700`}
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
                                  className={`min-w-0 ${SOFT_INPUT_CLASS}`}
                                />
                                <select
                                  value={templateRealSizeAxis}
                                  onChange={(event) =>
                                    setTemplateRealSizeAxis(event.target.value)
                                  }
                                  className={SOFT_SELECT_CLASS}
                                >
                                  <option value="height">Tinggi</option>
                                  <option value="width">Lebar</option>
                                </select>
                                <select
                                  value={templateRealSizeUnit}
                                  onChange={(event) =>
                                    setTemplateRealSizeUnit(event.target.value)
                                  }
                                  className={SOFT_SELECT_CLASS}
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
                                  className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                                >
                                  Trim
                                </button>
                                <button
                                  type="button"
                                  onClick={applyTemplateRulerScale}
                                  disabled={!selectedLayerCanApplyRulerScale}
                                  className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                                >
                                  Ruler
                                </button>
                                <button
                                  type="button"
                                  onClick={applyTemplateRealSize}
                                  disabled={!selectedLayerCanApplyRealSize}
                                  className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
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
                                  className={SOFT_TEXT_BUTTON_CLASS}
                                >
                                  Copy Scale
                                </button>
                                <button
                                  type="button"
                                  onClick={pasteTemplateScaleToSelected}
                                  disabled={!selectedLayerCanPasteScale}
                                  className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                                >
                                  Paste Scale
                                </button>
                              </div>
                              <div className="mt-2 grid gap-1.5">
                                <CompactSliderField
                                  label="Contrast"
                                  valueText={`${selectedLayerMetrics.contrast}%`}
                                  min={10}
                                  max={300}
                                  step={1}
                                  value={selectedLayerMetrics.contrast}
                                  onChange={(event) =>
                                    updateLayerById(selectedCutLayer.id, {
                                      contrast: clamp(
                                        Number(event.target.value),
                                        10,
                                        300,
                                      ),
                                    })
                                  }
                                  onDecrease={() =>
                                    updateLayerById(selectedCutLayer.id, (item) => ({
                                      ...item,
                                      contrast: clamp(
                                        Number(item.contrast ?? 100) - 5,
                                        10,
                                        300,
                                      ),
                                    }))
                                  }
                                  onIncrease={() =>
                                    updateLayerById(selectedCutLayer.id, (item) => ({
                                      ...item,
                                      contrast: clamp(
                                        Number(item.contrast ?? 100) + 5,
                                        10,
                                        300,
                                      ),
                                    }))
                                  }
                                />
                                <CompactSliderField
                                  label="Level"
                                  valueText={`${selectedLayerMetrics.level}%`}
                                  min={10}
                                  max={300}
                                  step={1}
                                  value={selectedLayerMetrics.level}
                                  onChange={(event) =>
                                    updateLayerById(selectedCutLayer.id, {
                                      level: clamp(
                                        Number(event.target.value),
                                        10,
                                        300,
                                      ),
                                    })
                                  }
                                  onDecrease={() =>
                                    updateLayerById(selectedCutLayer.id, (item) => ({
                                      ...item,
                                      level: clamp(
                                        Number(item.level ?? 100) - 5,
                                        10,
                                        300,
                                      ),
                                    }))
                                  }
                                  onIncrease={() =>
                                    updateLayerById(selectedCutLayer.id, (item) => ({
                                      ...item,
                                      level: clamp(
                                        Number(item.level ?? 100) + 5,
                                        10,
                                        300,
                                      ),
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLayerById(selectedCutLayer.id, {
                                      contrast: 100,
                                      level: 100,
                                    })
                                  }
                                  className={SOFT_TEXT_BUTTON_CLASS}
                                >
                                  Reset Contrast / Level
                                </button>
                              </div>
                              {copiedTemplateScale ? (
                                <div className="mt-1 text-[10px] text-slate-500">
                                  Scale siap di-paste
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {selectedCutLayer.kind === "free-line" ? (
                            <div className={`${SOFT_SURFACE_CLASS} px-3 py-3`}>
                              <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                                Shape Edit
                              </div>
                              <div className="mt-2 text-[10px] text-slate-500">
                                Drag titik ungu di canvas untuk edit shape. Saat satu
                                titik aktif, menu melayang akan muncul untuk tambah /
                                hapus point. Dua handle oranye bisa digeser bebas 360
                                derajat untuk mencari rounded yang paling pas.
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-1.5">
                                <div
                                  className={`${SOFT_INSET_CLASS} px-3 py-2 text-[10px] text-slate-600`}
                                >
                                  {selectedFreeLinePointIndex !== null
                                    ? `Titik aktif: #${selectedFreeLinePointIndex + 1}`
                                    : "Pilih titik ungu untuk edit / hapus"}
                                </div>
                                <button
                                  type="button"
                                  onClick={deleteSelectedFreeLinePoint}
                                  disabled={selectedFreeLinePointIndex === null}
                                  className={`${SOFT_DANGER_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                                >
                                  Delete Point
                                </button>
                              </div>
                              <div className="mt-1 grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLayerById(selectedCutLayer.id, (item) => {
                                      if (
                                        item.kind !== "free-line" ||
                                        selectedFreeLinePointIndex === null ||
                                        !Array.isArray(item.maskPoints)
                                      ) {
                                        return item;
                                      }
                                      return {
                                        ...item,
                                        maskPoints: item.maskPoints.map(
                                          (point, index) => {
                                            if (index !== selectedFreeLinePointIndex) {
                                              return point;
                                            }
                                            const nextPoint = { ...point };
                                            delete nextPoint.handleInX;
                                            delete nextPoint.handleInY;
                                            delete nextPoint.handleOutX;
                                            delete nextPoint.handleOutY;
                                            return nextPoint;
                                          },
                                        ),
                                      };
                                    })
                                  }
                                  disabled={selectedFreeLinePointIndex === null}
                                  className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                                >
                                  Reset Handle
                                </button>
                                <div
                                  className={`${SOFT_INSET_CLASS} px-3 py-2 text-center text-[10px] text-slate-500`}
                                >
                                  Handle 360°
                                </div>
                              </div>
                              <div className="mt-2 grid gap-1.5">
                                <CompactSliderField
                                  label="Curve"
                                  valueText={`${selectedLayerMetrics.curveStrength}%`}
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={selectedLayerMetrics.curveStrength}
                                  onChange={(event) =>
                                    updateLayerById(selectedCutLayer.id, {
                                      curveStrength: Number(event.target.value) / 100,
                                    })
                                  }
                                  onDecrease={() =>
                                    updateLayerById(selectedCutLayer.id, (item) => ({
                                      ...item,
                                      curveStrength: clamp(
                                        getFreeLineCurveStrength(item) - 0.05,
                                        0,
                                        1,
                                      ),
                                    }))
                                  }
                                  onIncrease={() =>
                                    updateLayerById(selectedCutLayer.id, (item) => ({
                                      ...item,
                                      curveStrength: clamp(
                                        getFreeLineCurveStrength(item) + 0.05,
                                        0,
                                        1,
                                      ),
                                    }))
                                  }
                                />
                                <div className="grid grid-cols-2 gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateLayerById(selectedCutLayer.id, {
                                        curveStrength: 0,
                                      })
                                    }
                                    className={SOFT_TEXT_BUTTON_CLASS}
                                  >
                                    Lurus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateLayerById(selectedCutLayer.id, {
                                        curveStrength:
                                          selectedCutLayer.drawMode === "point"
                                            ? DEFAULT_FREE_LINE_CURVE_POINT
                                            : DEFAULT_FREE_LINE_CURVE_FREEHAND,
                                      })
                                    }
                                    className={SOFT_TEXT_BUTTON_CLASS}
                                  >
                                    Lengkung
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {!hasLayerContentControls ? (
                            <div className={`${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700`}>
                              Layer ini tidak punya pengaturan konten tambahan.
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {layerSettingsTab === "view" ? (
                        <div className="flex flex-col gap-2">
                          {selectedCutLayer.kind === "free-line" ? (
                            <div className={`${SOFT_SURFACE_CLASS} px-3 py-3`}>
                              <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                                Shape Color
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {FREE_SHAPE_COLOR_OPTIONS.map((color) => (
                                  <ColorSwatchButton
                                    key={color}
                                    color={color}
                                    active={
                                      (selectedCutLayer.fillColor ||
                                        DEFAULT_FREE_LINE_COLOR) === color
                                    }
                                    label={`Warna shape ${color}`}
                                    onClick={() =>
                                      updateLayerById(selectedCutLayer.id, {
                                        fillColor: color,
                                      })
                                    }
                                  />
                                ))}
                                <label
                                  className={`relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full ${SOFT_RAISED_CLASS}`}
                                  title="Warna custom shape"
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
                                    value={
                                      selectedCutLayer.fillColor ||
                                      DEFAULT_FREE_LINE_COLOR
                                    }
                                    onChange={(event) =>
                                      updateLayerById(selectedCutLayer.id, {
                                        fillColor: event.target.value,
                                      })
                                    }
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                  />
                                </label>
                              </div>
                            </div>
                          ) : null}
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
                              className="h-9 w-full"
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
                              className="h-9 w-full"
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
                              className="h-9 w-full"
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
                                setToolConfigModal(null);
                              }}
                              tone="rose"
                              className="h-9 w-full"
                            />
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}

              {toolConfigModal === "centerFinder" ? (
                <div className="flex flex-col gap-2">
                  <div className={`${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700`}>
                    Klik 3 titik di tepi kepala femur atau struktur melingkar lain. Sistem menghitung center dan langsung membuat circle referensi.
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-slate-700`}>
                      Progres: {draftCenterFinderPoints.length}/3 titik
                    </div>
                    <div className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-slate-700`}>
                      Hasil: center + circle siap edit
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraftCenterFinderPoints([])}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Reset Titik
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolChange("pan")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Pindah ke Move
                    </button>
                  </div>
                </div>
              ) : null}

              {toolConfigModal === "axisBuilder" ? (
                <div className="flex flex-col gap-2">
                  <div className={`${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700`}>
                    Klik 2 titik pada segmen proximal lalu 2 titik pada segmen distal. Sistem mengambil midpoint dari kedua segmen lalu membangun satu garis axis.
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-slate-700`}>
                      Proximal: {Math.min(draftAxisBuilderPoints.length, 2)}/2
                    </div>
                    <div className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-slate-700`}>
                      Distal: {Math.max(0, draftAxisBuilderPoints.length - 2)}/2
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraftAxisBuilderPoints([])}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Reset Titik
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolChange("pan")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Pindah ke Move
                    </button>
                  </div>
                </div>
              ) : null}

              {toolConfigModal === "guideBuilder" ? (
                <div className="flex flex-col gap-2">
                  <div className={`${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700`}>
                    Pilih satu line atau planning guide sebagai acuan. Pilih mode guide, lalu klik canvas untuk membuat guide baru yang sejajar atau tegak lurus.
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGuideBuilderMode("parallel")}
                      className={
                        guideBuilderMode === "parallel"
                          ? SOFT_DARK_BUTTON_CLASS
                          : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                      }
                    >
                      Parallel
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuideBuilderMode("perpendicular")}
                      className={
                        guideBuilderMode === "perpendicular"
                          ? SOFT_DARK_BUTTON_CLASS
                          : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                      }
                    >
                      Perpendicular
                    </button>
                  </div>
                  <div className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-[11px] text-slate-700`}>
                    {guideBuilderReference
                      ? `Acuan aktif: ${guideBuilderReference.label}`
                      : "Acuan belum dipilih. Klik dulu satu line atau planning guide di canvas."}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGuideBuilderPreviewPoint(null)}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Reset Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolChange("pan")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Pindah ke Move
                    </button>
                  </div>
                </div>
              ) : null}

              {toolConfigModal === "layerMove" ||
              toolConfigModal === "layerLayout" ? (
                <div className="flex flex-col gap-2">
                  <div
                    className={`${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700 text-[10px]`}
                  >
                    Multi-select layer dari daftar kanan. Klik body row untuk
                    pilih tunggal atau group aktif. Gunakan tombol `Sel` untuk
                    tambah/kurangi layer dari multi-select. Shortcut desktop:
                    `[` turun, `]` naik, `Shift+[` paling bawah, `Shift+]`
                    paling atas, `Ctrl/Cmd+D` duplicate dengan offset.
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div
                      className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-slate-700`}
                    >
                      Terpilih: {selectedCutLayerIds.length}
                    </div>
                    <div
                      className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-slate-700`}
                    >
                      Group: {selectedCutLayerGroupId ? "aktif" : "-"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleToolChange("pan");
                        if (selectedCutLayer && !hasLayerMultiSelection) {
                          focusLayerCanvas(selectedCutLayer.id);
                        }
                      }}
                      className={`px-2 py-2 text-xs font-medium transition ${
                        tool === "pan"
                          ? SOFT_DARK_BUTTON_CLASS
                          : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                      }`}
                    >
                      Aktifkan Move
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        selectedCutLayer &&
                        openLayerSettingsModal(selectedCutLayer.id)
                      }
                      disabled={!selectedCutLayer}
                      className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      Layer Settings
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSelectedCutLayersInStack("back")}
                      disabled={!selectedCutLayerIds.length}
                      className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      Paling Bawah
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelectedCutLayersInStack("front")}
                      disabled={!selectedCutLayerIds.length}
                      className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      Paling Atas
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelectedCutLayersInStack("down")}
                      disabled={!selectedCutLayerIds.length}
                      className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      Turun 1
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelectedCutLayersInStack("up")}
                      disabled={!selectedCutLayerIds.length}
                      className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      Naik 1
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => alignSelectedCutLayers("left")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedCutLayers("center")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Center X
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedCutLayers("right")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Right
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedCutLayers("top")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Top
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedCutLayers("middle")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Center Y
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedCutLayers("bottom")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Bottom
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => distributeSelectedCutLayers("horizontal")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Distribusi H
                    </button>
                    <button
                      type="button"
                      onClick={() => distributeSelectedCutLayers("vertical")}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Distribusi V
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={groupSelectedCutLayers}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Group
                    </button>
                    <button
                      type="button"
                      onClick={ungroupSelectedCutLayers}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Ungroup
                    </button>
                    <button
                      type="button"
                      onClick={duplicateSelectedCutLayer}
                      className={SOFT_TEXT_BUTTON_CLASS}
                    >
                      Duplicate +
                    </button>
                  </div>
                  <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
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
                          const isLayerSelected = selectedCutLayerIdsSet.has(
                            layer.id,
                          );
                          return (
                            <motion.div
                              layout
                              key={`modal-tool-layer-${layer.id}`}
                              className={`${SOFT_TINT_CARD_CLASS} flex items-center gap-2 px-2 py-1.5 text-[10px] transition-all duration-300 ${
                                isLayerSelected ? "scale-[1.01]" : ""
                              }`}
                              style={{
                                borderColor: isLayerSelected
                                  ? layerPalette.border
                                  : `${layerPalette.border}66`,
                                color: layerPalette.text,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  handleToolChange("pan");
                                  setSelectedFreeLinePointIndex(null);
                                  selectLayerFromCanvas(layer.id, {
                                    includeGroup: true,
                                    openPanel: false,
                                  });
                                  setNotice(
                                    `Layer #${layer.id} aktif. Gunakan Move untuk drag, resize, rotate, atau edit titik.`,
                                  );
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{
                                      backgroundColor: layerPalette.border,
                                    }}
                                  />
                                  <span className="truncate font-medium">
                                    #{layer.id}{" "}
                                    {layer.name || getLayerDefaultName(layer)}
                                  </span>
                                </span>
                                <span className="mt-0.5 block truncate text-[9px] text-slate-500">
                                  {getLayerDefaultName(layer)} | urutan{" "}
                                  {cutLayers.findIndex(
                                    (item) => item.id === layer.id,
                                  ) + 1}
                                </span>
                              </button>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] ${
                                  isLayerActive
                                    ? SOFT_DARK_BUTTON_CLASS
                                    : isLayerSelected
                                      ? `${SOFT_PRESSED_CLASS} text-cyan-700`
                                      : `${SOFT_RAISED_CLASS} text-slate-500`
                                }`}
                              >
                                {isLayerActive
                                  ? "Aktif"
                                  : isLayerSelected
                                    ? "Sel"
                                    : "Pilih"}
                              </span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleLayerSelection(layer.id);
                                  setNotice(
                                    selectedCutLayerIdsSet.has(layer.id)
                                      ? `Layer #${layer.id} dilepas dari multi-select.`
                                      : `Layer #${layer.id} ditambahkan ke multi-select.`,
                                  );
                                }}
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] ${
                                  selectedCutLayerIdsSet.has(layer.id)
                                    ? `${SOFT_PRESSED_CLASS} text-cyan-700`
                                    : `${SOFT_RAISED_CLASS} text-slate-500`
                                }`}
                                title="Tambah atau lepas dari multi-select"
                                aria-label="Tambah atau lepas dari multi-select"
                              >
                                Sel
                              </button>
                            </motion.div>
                          );
                        })
                    )}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <CalibrationLineModalPanel
        open={isSimpleUiMode && simpleCalibrationModalOpen}
        onClose={() => setSimpleCalibrationModalOpen(false)}
        calibrationMode={calibrationMode}
        onCalibrationModeChange={setCalibrationMode}
        calibrationReferenceLine={calibrationReferenceLine}
        lineTypeLabel={lineTypeLabel}
        actualValue={actualMmInput}
        onActualValueChange={setActualMmInput}
        actualUnit={actualUnit}
        onActualUnitChange={setActualUnit}
        sourceZoomPercent={sourceZoomPercent}
        onSourceZoomPercentChange={setSourceZoomPercent}
        mmPerPixelValue={mmPerPixel}
        mmPerPixelAt100Value={mmPerPixelAt100Input}
        onMmPerPixelAt100Change={setMmPerPixelAt100Input}
        calibrationQuality={calibrationQuality}
        selectedLengthText={
          calibrationReferenceLine
            ? formatMeasurementFromPx(getLineLength(calibrationReferenceLine))
            : ""
        }
        onCreatePresetFromInput={createCalibrationPresetLineFromInput}
        onCreatePresetLine={createCalibrationPresetLine}
        onManualDraw={() => {
          setSimpleCalibrationModalOpen(false);
          handleToolChange("draw");
        }}
        lineStrokeWidth={
          calibrationReferenceLine &&
          Number.isFinite(calibrationReferenceLine.strokeWidth)
            ? calibrationReferenceLine.strokeWidth
            : DEFAULT_LINE_STROKE_WIDTH
        }
        onLineStrokeWidthChange={(nextValue) => {
          if (!calibrationReferenceLine) return;
          setLines((prev) =>
            prev.map((line) =>
              line.id === calibrationReferenceLine.id
                ? { ...line, strokeWidth: nextValue }
                : line,
            ),
          );
        }}
        onSave={applyCalibration}
        canSave={calibrationMode === "line" ? Boolean(calibrationReferenceLine) : true}
        hasCalibration={hasCalibration}
        measurementUnit={measurementUnit}
      />
      <AnimatePresence>
        {isSimpleUiMode && simpleGuideModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSimpleGuideModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={PANEL_SPRING}
              className="max-h-[92vh] w-full max-w-[560px] overflow-hidden rounded-[30px] border border-white/85 bg-[#e9eef5] text-slate-900 shadow-[18px_18px_42px_rgba(15,23,42,0.28),-10px_-10px_28px_rgba(255,255,255,0.72)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/70 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xl font-extrabold text-slate-800">
                    <Icon name="guideBuilder" className="h-5 w-5 text-cyan-700" />
                    <span>Panduan Simple UI</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Ringkasan tombol penting, layer, Free Line, HKA, dan planning.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSimpleGuideModalOpen(false)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-[#e9eef5] text-slate-700 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-6px_-6px_14px_rgba(255,255,255,0.76)]"
                  aria-label="Tutup panduan"
                  title="Tutup"
                >
                  <X className="h-4 w-4" strokeWidth={2.1} />
                </button>
              </div>
              <div className="max-h-[calc(92vh-82px)] space-y-3 overflow-y-auto px-5 py-5">
                {[
                  {
                    title: "1. Upload & Kalibrasi",
                    body: "Upload X-ray, lalu buka Kalibrasi untuk membuat atau memilih line ruler. Measurement klinis aktif setelah kalibrasi tersimpan.",
                  },
                  {
                    title: "2. Layer Kosong",
                    body: "Layer Kosong membuat layer vector di stack. Pilih Freehand atau Point Mode, gambar di canvas, lalu hasilnya mengisi layer kosong itu.",
                  },
                  {
                    title: "3. Urutan Layer",
                    body: "Pilih layer dari dropdown header. Tombol Naik, Turun, Atas, dan Bawah mengubah posisi layer tanpa mengubah logika canvas.",
                  },
                  {
                    title: "4. HKA Knee",
                    body: "Pilih Kaki kanan atau Kaki kiri sebelum membuat HKA. Sistem memakai sisi ini untuk membuat label varus/valgus lebih mudah dibaca.",
                  },
                  {
                    title: "5. Planning Guide",
                    body: "Gunakan TKA untuk Distal Cut, Tibial Slope, atau Tibial Cut. Guide memakai line acuan yang sama dengan workspace.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-white/78 bg-[#e9eef5] px-4 py-3 shadow-[inset_5px_5px_12px_rgba(100,116,139,0.13),inset_-5px_-5px_12px_rgba(255,255,255,0.75)]"
                  >
                    <div className="text-sm font-extrabold text-slate-800">
                      {item.title}
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                      {item.body}
                    </p>
                  </div>
                ))}
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimpleGuideModalOpen(false);
                      createEmptyFreeLineLayer("point");
                    }}
                    disabled={!image || !modelWidth || !modelHeight}
                    className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-3 py-3 text-xs font-extrabold text-slate-700 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Layer Kosong + Point
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimpleGuideModalOpen(false);
                      handleToolChange("guideBuilder");
                    }}
                    className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-3 py-3 text-xs font-extrabold text-slate-700 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)]"
                  >
                    Buka Guide Tool
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimpleGuideModalOpen(false);
                      openSimplePlanningModal("tka");
                    }}
                    className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-3 py-3 text-xs font-extrabold text-slate-700 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)]"
                  >
                    Planning TKA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimpleGuideModalOpen(false);
                      openSimplePlanningModal("hip");
                    }}
                    className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-3 py-3 text-xs font-extrabold text-slate-700 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)]"
                  >
                    Planning HIP
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {hkaSideModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setHkaSideModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={PANEL_SPRING}
              className="w-full max-w-[440px] rounded-[30px] border border-white/85 bg-[#e9eef5] p-5 text-slate-900 shadow-[14px_14px_34px_rgba(15,23,42,0.24),-8px_-8px_24px_rgba(255,255,255,0.72)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                    <Icon name="hka" className="h-5 w-5 text-cyan-700" />
                    <span>HKA Knee</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                    Pilih sisi kaki sebelum membuat line HKA agar label
                    varus/valgus terbaca sesuai kanan atau kiri.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHkaSideModalOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/80 bg-[#e9eef5] text-slate-700 shadow-[5px_5px_12px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.76)]"
                  aria-label="Tutup pilihan HKA"
                  title="Tutup"
                >
                  <X className="h-4 w-4" strokeWidth={2.1} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-[24px] border border-white/78 bg-[#e9eef5] p-2 shadow-[inset_6px_6px_13px_rgba(100,116,139,0.14),inset_-6px_-6px_13px_rgba(255,255,255,0.72)]">
                {[
                  { key: "right", label: "Kaki kanan" },
                  { key: "left", label: "Kaki kiri" },
                ].map((sideItem) => {
                  const isActive = hkaSide === sideItem.key;
                  return (
                    <button
                      key={`hka-side-modal-${sideItem.key}`}
                      type="button"
                      onClick={() => setHkaSide(sideItem.key)}
                      className={`rounded-[18px] px-3 py-3 text-xs font-extrabold transition ${
                        isActive
                          ? "border border-[#2a3246] bg-[linear-gradient(180deg,#30394f_0%,#1f2636_100%)] text-white shadow-[inset_3px_3px_7px_rgba(0,0,0,0.25),5px_5px_14px_rgba(51,65,85,0.32)]"
                          : "border border-white/82 bg-[#e9eef5] text-slate-600 shadow-[5px_5px_12px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.74)]"
                      }`}
                    >
                      {sideItem.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                <label>
                  Mode
                  <select
                    value={hkaInputMode}
                    onChange={(event) => handleHkaModeChange(event.target.value)}
                    className={`mt-1 w-full ${SOFT_SELECT_CLASS}`}
                  >
                    {Object.values(HKA_MODE_DEFINITIONS).map((modeItem) => (
                      <option key={`hka-modal-mode-${modeItem.key}`} value={modeItem.key}>
                        {modeItem.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-[18px] border border-white/78 bg-[#e9eef5] px-3 py-2 text-[11px] leading-5 shadow-[inset_4px_4px_10px_rgba(100,116,139,0.13),inset_-4px_-4px_10px_rgba(255,255,255,0.75)]">
                  {getHkaModeDefinition(hkaInputMode).modeLabel}
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={() => {
                    setHkaSideModalOpen(false);
                    setDraftHkaPoints([]);
                    handleToolChange("hkaAuto", { skipHkaSidePrompt: true });
                  }}
                  className="rounded-[18px] border border-emerald-400/70 bg-[linear-gradient(180deg,#36c768_0%,#22a755_100%)] px-4 py-3 text-xs font-extrabold text-white shadow-[6px_6px_14px_rgba(34,197,94,0.2),-5px_-5px_12px_rgba(255,255,255,0.65)]"
                >
                  Mulai HKA {getHkaSideLabel(hkaSide)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHkaSideModalOpen(false);
                    handleToolChange("pan");
                  }}
                  className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-4 py-3 text-xs font-extrabold text-slate-600 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)]"
                >
                  Move
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {isSimpleUiMode && simplePlanningModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSimplePlanningModal(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={PANEL_SPRING}
              className="max-h-[92vh] w-full max-w-[620px] overflow-hidden rounded-[30px] border border-white/85 bg-[#e9eef5] text-slate-900 shadow-[18px_18px_42px_rgba(15,23,42,0.28),-10px_-10px_28px_rgba(255,255,255,0.72)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/70 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xl font-extrabold text-slate-800">
                    <Icon name="package" className="h-5 w-5 text-slate-700" />
                    <span>
                      {simplePlanningModal === "hip"
                        ? "Planning HIP"
                        : "Planning TKA"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {simplePlanningModal === "hip"
                      ? "Offset, LLD, dan line hip memakai tool yang sama dengan workspace."
                      : "Distal cut, tibial slope, dan tibial cut memakai guide canvas yang sama."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSimplePlanningModal(null)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-[#e9eef5] text-slate-700 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-6px_-6px_14px_rgba(255,255,255,0.76)]"
                  aria-label="Tutup planning"
                  title="Tutup"
                >
                  <X className="h-4 w-4" strokeWidth={2.1} />
                </button>
              </div>

              <div className="max-h-[calc(92vh-82px)] space-y-3 overflow-y-auto px-5 py-5">
                {simplePlanningModal === "tka" ? (
                  <>
                    <div className="rounded-[24px] border border-white/78 bg-[#e9eef5] px-4 py-3 shadow-[inset_6px_6px_13px_rgba(100,116,139,0.15),inset_-6px_-6px_13px_rgba(255,255,255,0.72)]">
                      <div className="text-sm font-extrabold text-slate-700">
                        Acuan Planning
                      </div>
                      <div
                        className={`mt-1 text-xs font-semibold ${
                          selectedLine ? "text-slate-600" : "text-rose-500"
                        }`}
                      >
                        {selectedLine
                          ? `Line #${selectedLine.id} | ${lineTypeLabel(selectedLine.type)}${
                              mmPerPixel !== null
                                ? ` | ${formatMeasurementFromPx(getLineLength(selectedLine))}`
                                : ""
                            }`
                          : "Pilih satu line di canvas terlebih dahulu."}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-white/78 bg-[#e9eef5] p-1.5 shadow-[inset_6px_6px_13px_rgba(100,116,139,0.14),inset_-6px_-6px_13px_rgba(255,255,255,0.72)]">
                      {[
                        { id: "valgusCut", label: "Distal Cut" },
                        { id: "tibialSlope", label: "Tibial Slope" },
                        { id: "tibialCut", label: "Tibial Cut" },
                      ].map((mode) => {
                        const isActive = planningGuideMode === mode.id;
                        return (
                          <button
                            key={`simple-plan-${mode.id}`}
                            type="button"
                            onClick={() => setPlanningGuideMode(mode.id)}
                            className={`rounded-[18px] px-2 py-2.5 text-xs font-extrabold transition ${
                              isActive
                                ? "border border-[#2a3246] bg-[linear-gradient(180deg,#30394f_0%,#1f2636_100%)] text-white shadow-[inset_3px_3px_7px_rgba(0,0,0,0.25),5px_5px_14px_rgba(51,65,85,0.38)]"
                                : "border border-white/82 bg-[#e9eef5] text-slate-600 shadow-[5px_5px_12px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.74)]"
                            }`}
                          >
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-2 rounded-[24px] border border-white/78 bg-[#e9eef5] p-4 text-xs font-semibold text-slate-600 shadow-[8px_8px_18px_rgba(100,116,139,0.18),-6px_-6px_16px_rgba(255,255,255,0.72)] sm:grid-cols-2">
                      {planningGuideMode === "valgusCut" ? (
                        <>
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
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
                            />
                          </label>
                          <label>
                            Side
                            <select
                              value={valgusCutSide}
                              onChange={(event) =>
                                setValgusCutSide(event.target.value)
                              }
                              className={`mt-1 w-full ${SOFT_SELECT_CLASS}`}
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
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
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
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
                            />
                          </label>
                        </>
                      ) : null}
                      {planningGuideMode === "tibialSlope" ? (
                        <>
                          <label>
                            Slope
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={tibialSlopeDeg}
                              onChange={(event) =>
                                setTibialSlopeDeg(
                                  Number(event.target.value) || 0,
                                )
                              }
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
                            />
                          </label>
                          <label>
                            Posterior
                            <select
                              value={tibialPosteriorSide}
                              onChange={(event) =>
                                setTibialPosteriorSide(event.target.value)
                              }
                              className={`mt-1 w-full ${SOFT_SELECT_CLASS}`}
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
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
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
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
                            />
                          </label>
                        </>
                      ) : null}
                      {planningGuideMode === "tibialCut" ? (
                        <>
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
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
                            />
                          </label>
                          <label>
                            Direction
                            <select
                              value={tibialCutDirection}
                              onChange={(event) =>
                                setTibialCutDirection(event.target.value)
                              }
                              className={`mt-1 w-full ${SOFT_SELECT_CLASS}`}
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
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
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
                              className={`mt-1 w-full ${SOFT_INPUT_CLASS}`}
                            />
                          </label>
                        </>
                      ) : null}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={
                          selectedPlanningGuide
                            ? () => updateSelectedPlanningGuide()
                            : addPlanningGuideFromSelectedLine
                        }
                        disabled={!selectedPlanningGuide && !selectedLine}
                        className="rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,#ff7770_0%,#fb5f58_100%)] px-3 py-3 text-xs font-extrabold text-white shadow-[6px_6px_14px_rgba(248,113,113,0.25),-5px_-5px_12px_rgba(255,255,255,0.68)] transition disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {selectedPlanningGuide ? "Update Guide" : "Buat dari Line"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPlanningGuides([]);
                          setSelectedPlanningGuideId(null);
                          setNotice("Semua planning guide dihapus.");
                        }}
                        disabled={planningGuides.length === 0}
                        className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-3 py-3 text-xs font-extrabold text-slate-500 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)] transition disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Clear Guide
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-[24px] border border-white/78 bg-[#e9eef5] px-4 py-3 text-xs font-semibold text-slate-600 shadow-[inset_6px_6px_13px_rgba(100,116,139,0.15),inset_-6px_-6px_13px_rgba(255,255,255,0.72)]">
                      <div className="text-sm font-extrabold text-slate-700">
                        Hip Summary
                      </div>
                      <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                        <div>Femoral: {legPackageSummary.femoralMean}</div>
                        <div>Global: {legPackageSummary.globalMean}</div>
                        <div>LLD: {legPackageSummary.lldDelta}</div>
                      </div>
                    </div>
                    <HipFunctionSummaryPanel defaultExpanded />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {HIP_FUNCTION_SUMMARY_ITEMS.map((item) => (
                        <button
                          key={`simple-hip-${item.key}`}
                          type="button"
                          title={item.detail}
                          onClick={() => {
                            setSimplePlanningModal(null);
                            handleLinePresetChange(item.key);
                          }}
                          className={`rounded-[18px] border px-3 py-3 text-xs font-extrabold shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)] transition ${
                            linePreset === item.key
                              ? "border-[#2a3246] bg-[linear-gradient(180deg,#30394f_0%,#1f2636_100%)] text-white"
                              : "border-white/82 bg-[#e9eef5] text-slate-600"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSimplePlanningModal(null);
                        handleToolChange("pan");
                      }}
                      className="w-full rounded-[18px] border border-white/82 bg-[#e9eef5] px-3 py-3 text-xs font-extrabold text-slate-600 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)]"
                    >
                      Move / Drag Canvas
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {false && isSimpleUiMode && simpleCalibrationModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSimpleCalibrationModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={PANEL_SPRING}
              className="max-h-[92vh] w-full max-w-[760px] overflow-hidden rounded-[30px] border border-white/85 bg-[linear-gradient(180deg,#f8fbff_0%,#edf3f9_100%)] text-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.32),inset_0_0_0_1px_rgba(255,255,255,0.65)]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-300/70 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                    <Icon name="preset" className="h-5 w-5 text-slate-900" />
                    <span>Kalibrasi Line</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-900">
                    Pakai garis referensi real untuk menyimpan faktor kalibrasi
                    sebelum measurement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSimpleCalibrationModalOpen(false)}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#edf2f7_100%)] text-slate-950 shadow-[8px_8px_18px_rgba(71,85,105,0.18),-4px_-4px_12px_rgba(255,255,255,0.78)] transition hover:scale-[1.02]"
                  aria-label="Tutup kalibrasi"
                  title="Tutup"
                >
                  <X className="h-4 w-4" strokeWidth={2.1} />
                </button>
              </div>

              <div className="max-h-[calc(90vh-83px)] space-y-4 overflow-y-auto px-5 py-5">
                <div className="flex items-start gap-3 rounded-2xl border border-white/70 bg-[#eef2f7] p-4 text-xs font-medium leading-relaxed text-slate-600 shadow-[inset_4px_4px_8px_rgba(148,163,184,0.28),inset_-4px_-4px_8px_rgba(255,255,255,0.88)]">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-black text-amber-600">
                    !
                  </span>
                  <span>
                    {calibrationMode === "line" && !calibrationReferenceLine
                      ? "Belum ada line terpilih. Buat ruler default di bawah atau gambar garis di kanvas untuk memulai kalibrasi."
                      : "Gunakan parameter yang sama dengan workspace utama, lalu simpan agar measurement dan export memakai faktor kalibrasi aktif."}
                  </span>
                </div>

                <section className="rounded-[18px] border border-slate-950/90 bg-white/18 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
                  <h2 className="text-lg font-semibold text-slate-950">
                    1. Pilih Sumber Kalibrasi
                  </h2>
                  <div className="mt-4 grid grid-cols-2 rounded-full bg-slate-300/55 p-1 shadow-[inset_8px_8px_18px_rgba(100,116,139,0.14),inset_-8px_-8px_18px_rgba(255,255,255,0.72)]">
                    <button
                      type="button"
                      onClick={() => setCalibrationMode("line")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        calibrationMode === "line"
                          ? "bg-white text-slate-950 shadow-[5px_5px_14px_rgba(71,85,105,0.18),-3px_-3px_10px_rgba(255,255,255,0.9)]"
                          : "text-slate-800"
                      }`}
                    >
                      Garis Real
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalibrationMode("zoom")}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        calibrationMode === "zoom"
                          ? "bg-white text-slate-950 shadow-[5px_5px_14px_rgba(71,85,105,0.18),-3px_-3px_10px_rgba(255,255,255,0.9)]"
                          : "text-slate-800"
                      }`}
                    >
                      Zoom %
                    </button>
                  </div>
                  <div className="mt-4 rounded-full border border-white/85 bg-[linear-gradient(180deg,#fbfdff_0%,#edf2f7_100%)] px-4 py-3 shadow-[6px_6px_16px_rgba(71,85,105,0.14),-4px_-4px_12px_rgba(255,255,255,0.8)]">
                    {calibrationMode === "line" && calibrationReferenceLine ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span>Garis #{calibrationReferenceLine.id}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-medium uppercase text-slate-600">
                          {lineTypeLabel(calibrationReferenceLine.type)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-slate-700">
                        Belum ada line terpilih. Pilih garis di kanvas.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[18px] border border-slate-950/90 bg-white/18 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
                  <h2 className="text-lg font-semibold text-slate-950">
                    2. Faktor & QC
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_112px]">
                    <label className="min-w-0 text-sm font-medium text-slate-950">
                      {calibrationMode === "line"
                        ? `Nilai Real (${actualUnit})`
                        : "mm/px @100%"}
                      <input
                        type="number"
                        min="0"
                        step={calibrationMode === "line" ? "0.01" : "0.000001"}
                        value={
                          calibrationMode === "line"
                            ? actualMmInput
                            : mmPerPixelAt100Input
                        }
                        onChange={(event) =>
                          calibrationMode === "line"
                            ? setActualMmInput(event.target.value)
                            : setMmPerPixelAt100Input(event.target.value)
                        }
                        className="mt-2 w-full rounded-full border border-white/80 bg-[linear-gradient(180deg,#fdfefe_0%,#edf2f7_100%)] px-4 py-3 text-sm text-slate-950 outline-none shadow-[inset_5px_5px_12px_rgba(100,116,139,0.12),inset_-5px_-5px_12px_rgba(255,255,255,0.8)]"
                        placeholder={
                          calibrationMode === "line"
                            ? `Nilai Real (${actualUnit})`
                            : "mm/px @100%"
                        }
                      />
                    </label>
                    <label className="min-w-0 text-sm font-medium text-slate-950">
                      Zoom Source (%)
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        value={sourceZoomPercent}
                        onChange={(event) =>
                          setSourceZoomPercent(event.target.value)
                        }
                        className="mt-2 w-full rounded-full border border-white/80 bg-[linear-gradient(180deg,#fdfefe_0%,#edf2f7_100%)] px-4 py-3 text-sm text-slate-950 outline-none shadow-[inset_5px_5px_12px_rgba(100,116,139,0.12),inset_-5px_-5px_12px_rgba(255,255,255,0.8)]"
                      />
                    </label>
                    <label className="min-w-0 text-sm font-medium text-transparent">
                      Unit
                      <select
                        value={actualUnit}
                        onChange={(event) => setActualUnit(event.target.value)}
                        className="mt-2 w-full rounded-full border border-white/80 bg-[linear-gradient(180deg,#fdfefe_0%,#edf2f7_100%)] px-4 py-3 text-sm text-slate-950 outline-none shadow-[8px_8px_18px_rgba(71,85,105,0.14),-4px_-4px_12px_rgba(255,255,255,0.75)]"
                      >
                        <option value="cm">cm</option>
                        <option value="mm">mm</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-5 text-xl font-semibold text-slate-950">
                    Faktor:{" "}
                    {mmPerPixel !== null
                      ? `${mmPerPixel.toFixed(6)} mm/px`
                      : "-"}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="text-sm text-slate-950">
                      <span className="mr-2 font-medium">QC:</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold ${
                          calibrationQuality.status === "good"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {calibrationQuality.status === "good" ? (
                          <BadgeCheck className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        {calibrationQuality.status === "good"
                          ? "Baik"
                          : "Perbaiki"}
                      </span>
                      <div className="mt-2 text-xs text-slate-800">
                        {calibrationQuality.detail}
                      </div>
                    </div>
                    <div className="text-sm text-slate-950">
                      <span className="mr-2 font-medium">Status:</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-semibold ${
                          calibrationQuality.status === "good"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {calibrationQuality.title}
                      </span>
                      <div className="mt-2 text-xs text-slate-800">
                        {selectedLine
                          ? `Panjang terpilih: ${formatMeasurementFromPx(selectedLengthPx)}`
                          : "Buat/pilih garis referensi sebelum simpan."}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[18px] border border-slate-950/90 bg-white/18 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
                  <h2 className="text-lg font-semibold text-slate-950">
                    3. Opsi Ruler & Tampilan
                  </h2>
                  <div className="mt-3 grid grid-cols-[112px_1fr] items-center gap-3">
                    <div className="text-xs font-semibold uppercase text-slate-950">
                      Ruler Default
                    </div>
                    <button
                      type="button"
                      onClick={createCalibrationPresetLineFromInput}
                      className="rounded-full border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#eef3f8_100%)] px-4 py-2 text-sm font-semibold text-slate-950 shadow-[6px_6px_16px_rgba(71,85,105,0.14),-4px_-4px_12px_rgba(255,255,255,0.78)]"
                    >
                      Buat
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => createCalibrationPresetLine(100)}
                      className="rounded-full border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#eef3f8_100%)] px-4 py-3 text-sm text-slate-950 shadow-[6px_6px_16px_rgba(71,85,105,0.14),-4px_-4px_12px_rgba(255,255,255,0.78)]"
                    >
                      10 cm
                    </button>
                    <button
                      type="button"
                      onClick={() => createCalibrationPresetLine(130)}
                      className="rounded-full border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#eef3f8_100%)] px-4 py-3 text-sm text-slate-950 shadow-[6px_6px_16px_rgba(71,85,105,0.14),-4px_-4px_12px_rgba(255,255,255,0.78)]"
                    >
                      13 cm
                    </button>
                    <button
                      type="button"
                      onClick={() => createCalibrationPresetLine(150)}
                      className="rounded-full border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#eef3f8_100%)] px-4 py-3 text-sm text-slate-950 shadow-[6px_6px_16px_rgba(71,85,105,0.14),-4px_-4px_12px_rgba(255,255,255,0.78)]"
                    >
                      15 cm
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSimpleCalibrationModalOpen(false);
                      handleToolChange("draw");
                    }}
                    className="mt-3 w-full rounded-full border border-sky-500/70 bg-[linear-gradient(180deg,#42a7df_0%,#1878b9_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(14,116,184,0.24)]"
                  >
                    Tutup Modal & Gambar Line Manual
                  </button>
                </section>

                {calibrationMode === "line" && calibrationReferenceLine ? (
                  <section className="rounded-[18px] border border-slate-950/90 bg-white/18 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
                    <div className="text-xs font-semibold uppercase text-slate-950">
                      Stroke Width Ruler
                    </div>
                    <div className="mt-3 rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,#fbfdff_0%,#edf2f7_100%)] px-4 py-4 shadow-[8px_8px_20px_rgba(71,85,105,0.14),-5px_-5px_16px_rgba(255,255,255,0.8)]">
                      <div className="flex items-center justify-between text-sm text-slate-950">
                        <span>Stroke</span>
                        <span>
                          {(
                            Number.isFinite(calibrationReferenceLine.strokeWidth)
                              ? calibrationReferenceLine.strokeWidth
                              : DEFAULT_LINE_STROKE_WIDTH
                          ).toFixed(1)}
                          x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        step={0.1}
                        value={
                          Number.isFinite(calibrationReferenceLine.strokeWidth)
                            ? calibrationReferenceLine.strokeWidth
                            : DEFAULT_LINE_STROKE_WIDTH
                        }
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setLines((prev) =>
                            prev.map((line) =>
                              line.id === calibrationReferenceLine.id
                                ? { ...line, strokeWidth: nextValue }
                                : line,
                            ),
                          );
                        }}
                        className="mt-5 w-full accent-slate-400"
                      />
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((line) =>
                                line.id === calibrationReferenceLine.id
                                  ? {
                                      ...line,
                                      strokeWidth: clamp(
                                        (Number(line.strokeWidth) ||
                                          DEFAULT_LINE_STROKE_WIDTH) - 0.2,
                                        1,
                                        8,
                                      ),
                                    }
                                  : line,
                              ),
                            )
                          }
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#edf2f7_100%)] text-xl text-slate-950 shadow-[6px_6px_14px_rgba(71,85,105,0.16),-4px_-4px_12px_rgba(255,255,255,0.8)]"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((line) =>
                                line.id === calibrationReferenceLine.id
                                  ? {
                                      ...line,
                                      strokeWidth: clamp(
                                        (Number(line.strokeWidth) ||
                                          DEFAULT_LINE_STROKE_WIDTH) + 0.2,
                                        1,
                                        8,
                                      ),
                                    }
                                  : line,
                              ),
                            )
                          }
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#edf2f7_100%)] text-xl text-slate-950 shadow-[6px_6px_14px_rgba(71,85,105,0.16),-4px_-4px_12px_rgba(255,255,255,0.8)]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <motion.button
                    type="button"
                    onClick={applyCalibration}
                    disabled={calibrationMode === "line" ? !selectedLine : false}
                    whileHover={
                      calibrationMode === "line" && !selectedLine
                        ? undefined
                        : BUTTON_HOVER
                    }
                    whileTap={
                      calibrationMode === "line" && !selectedLine
                        ? undefined
                        : BUTTON_TAP
                    }
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/70 bg-[linear-gradient(180deg,#36c768_0%,#22a755_100%)] px-4 py-4 text-base font-semibold text-white shadow-[0_16px_30px_rgba(34,197,94,0.28)] transition disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <BadgeCheck className="h-4 w-4" strokeWidth={2} />
                    <span>Simpan Kalibrasi</span>
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setSimpleCalibrationModalOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300/70 bg-[linear-gradient(180deg,#ef334d_0%,#d91f3a_100%)] px-4 py-4 text-base font-semibold text-white shadow-[0_16px_30px_rgba(225,29,72,0.22)]"
                  >
                    <X className="h-4 w-4" />
                    <span>Tutup</span>
                  </button>
                </div>

                <div className="px-1 text-sm text-slate-950">
                  {hasCalibration ? `Aktif (${measurementUnit})` : "Belum aktif"}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <header
        className={`${SOFT_PANEL_CLASS} relative z-50 flex flex-wrap items-start justify-between gap-2 px-3 pt-2 pb-1 sm:px-4 sm:py-3`}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="flex shrink-0 flex-col gap-0.5">
            <h1 className="text-base font-semibold text-slate-900 sm:text-xl">
              My Counteinvas
            </h1>
            <p className="hidden text-xs text-slate-600 sm:block">
              Upload, kalibrasi & ukur
            </p>
          </div>

          {isSimpleUiMode ? (
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/75 bg-[#eef2f7] p-1 shadow-[inset_3px_3px_7px_rgba(148,163,184,0.22),inset_-3px_-3px_7px_rgba(255,255,255,0.88)]">
              {simpleWorkflowSteps.map((step) => {
                const active = workflowStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={step.onClick}
                    className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-extrabold transition ${
                      active
                        ? "bg-slate-900 text-white shadow-[2px_2px_7px_rgba(15,23,42,0.22),-2px_-2px_7px_rgba(255,255,255,0.9)]"
                        : step.done
                          ? "bg-emerald-500 text-white shadow-[2px_2px_7px_rgba(16,185,129,0.24),-2px_-2px_7px_rgba(255,255,255,0.86)]"
                          : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                    }`}
                    title={`${step.id}. ${step.label}`}
                  >
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                        active || step.done
                          ? "bg-white/20 text-white"
                          : "bg-white/70 text-slate-500"
                      }`}
                    >
                      {step.id}
                    </span>
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isSimpleUiMode ? (
            <details
              open={simpleLayerDropdownOpen}
              onToggle={(event) =>
                setSimpleLayerDropdownOpen(event.currentTarget.open)
              }
              className="group relative"
            >
              <summary
                className={`${SOFT_RAISED_CLASS} flex cursor-pointer list-none items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-700 transition hover:text-slate-950 [&::-webkit-details-marker]:hidden`}
              >
                <Icon name="settings" className="h-3.5 w-3.5" />
                <span>Layer</span>
                <span className="max-w-[108px] truncate text-[10px] font-bold text-cyan-800">
                  {selectedLayerDropdownLabel}
                </span>
              </summary>
              <div className="absolute right-0 top-[calc(100%+8px)] z-[85] w-[min(92vw,360px)] rounded-[24px] border border-white/80 bg-[#eef2f7] p-3 text-slate-800 shadow-[0_14px_34px_rgba(15,23,42,0.16),-4px_-4px_12px_rgba(255,255,255,0.9)]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/75 bg-[#eef2f7] text-cyan-700 shadow-[3px_3px_8px_rgba(148,163,184,0.28),-3px_-3px_8px_rgba(255,255,255,0.86)]">
                      <Icon name="settings" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900">
                        Layer Settings
                      </div>
                      <div className="truncate text-[10px] font-semibold text-slate-500">
                        {cutLayers.length} layer tersedia
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSimpleLayerDropdownOpen(false)}
                    className={`${SOFT_RAISED_CLASS} h-8 rounded-full px-3 text-[10px] font-bold text-slate-600`}
                  >
                    Tutup
                  </button>
                </div>

                <select
                  value={selectedCutLayer?.id ?? ""}
                  onChange={(event) => {
                    const rawLayerId = event.target.value;
                    if (!rawLayerId) return;
                    const nextLayerId = Number(rawLayerId);
                    if (!Number.isFinite(nextLayerId)) return;
                    selectLayerFromCanvas(nextLayerId, { openPanel: false });
                    setSimpleLayerDropdownOpen(true);
                  }}
                  disabled={!cutLayers.length}
                  className="mb-2 w-full rounded-2xl border border-white/75 bg-[#eef2f7] px-3 py-2 text-xs font-semibold text-slate-700 outline-none shadow-[inset_3px_3px_7px_rgba(148,163,184,0.22),inset_-3px_-3px_7px_rgba(255,255,255,0.88)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {cutLayers.length ? "Pilih layer aktif" : "Belum ada layer"}
                  </option>
                  {cutLayers.map((layer, layerIndex) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name || getLayerDefaultName(layer)} |{" "}
                      {layerIndex + 1}/{cutLayers.length}
                    </option>
                  ))}
                </select>

                {!selectedCutLayer || !selectedLayerMetrics ? (
                  <div className="rounded-2xl border border-white/75 bg-white/40 px-3 py-3 text-[11px] font-semibold text-slate-500 shadow-[inset_3px_3px_7px_rgba(148,163,184,0.18),inset_-3px_-3px_7px_rgba(255,255,255,0.86)]">
                    Pilih layer dari daftar untuk mengatur ukuran, posisi,
                    rotasi, dan opacity.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-2xl border border-white/75 bg-white/45 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-[inset_3px_3px_7px_rgba(148,163,184,0.18),inset_-3px_-3px_7px_rgba(255,255,255,0.86)]">
                      <div className="truncate text-slate-900">
                        {selectedCutLayer.name ||
                          getLayerDefaultName(selectedCutLayer)}
                      </div>
                      <div className="mt-0.5">
                        W{" "}
                        {formatTemplateLayerRealSize(
                          selectedLayerMetrics.widthMm,
                        )}{" "}
                        | H{" "}
                        {formatTemplateLayerRealSize(
                          selectedLayerMetrics.heightMm,
                        )}
                      </div>
                    </div>

                    {isImageBackedLayerKind(selectedCutLayer.kind) ? (
                      <div className="rounded-2xl border border-white/75 bg-[#eef2f7] p-2 shadow-[3px_3px_8px_rgba(148,163,184,0.22),-3px_-3px_8px_rgba(255,255,255,0.86)]">
                        <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                          Ruler & Scale
                        </div>
                        <div className="grid grid-cols-[1fr_auto_auto] gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={templateRealSizeInput}
                            onChange={(event) =>
                              setTemplateRealSizeInput(event.target.value)
                            }
                            placeholder="Real size"
                            className="min-w-0 rounded-2xl border border-white/75 bg-[#eef2f7] px-3 py-2 text-xs font-semibold text-slate-700 outline-none shadow-[inset_3px_3px_7px_rgba(148,163,184,0.22),inset_-3px_-3px_7px_rgba(255,255,255,0.88)]"
                          />
                          <select
                            value={templateRealSizeAxis}
                            onChange={(event) =>
                              setTemplateRealSizeAxis(event.target.value)
                            }
                            className="rounded-2xl border border-white/75 bg-[#eef2f7] px-2 py-2 text-[10px] font-bold text-slate-700 outline-none shadow-[inset_3px_3px_7px_rgba(148,163,184,0.22),inset_-3px_-3px_7px_rgba(255,255,255,0.88)]"
                          >
                            <option value="height">H</option>
                            <option value="width">W</option>
                          </select>
                          <select
                            value={templateRealSizeUnit}
                            onChange={(event) =>
                              setTemplateRealSizeUnit(event.target.value)
                            }
                            className="rounded-2xl border border-white/75 bg-[#eef2f7] px-2 py-2 text-[10px] font-bold text-slate-700 outline-none shadow-[inset_3px_3px_7px_rgba(148,163,184,0.22),inset_-3px_-3px_7px_rgba(255,255,255,0.88)]"
                          >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                          </select>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={trimSelectedTemplateLayer}
                            disabled={!selectedLayerCanTrim}
                            className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-2 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45`}
                          >
                            Trim
                          </button>
                          <button
                            type="button"
                            onClick={applyTemplateRulerScale}
                            disabled={!selectedLayerCanApplyRulerScale}
                            className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-2 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45`}
                          >
                            Ruler
                          </button>
                          <button
                            type="button"
                            onClick={applyTemplateRealSize}
                            disabled={!selectedLayerCanApplyRealSize}
                            className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-2 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45`}
                          >
                            Scale
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {[
                      {
                        key: "width",
                        label: "Width",
                        value: selectedLayerMetrics.width,
                        valueText: `${selectedLayerMetrics.width}px`,
                        min: 16,
                        max: selectedLayerMetrics.widthMax,
                        disabled: selectedCutLayer.lockScale,
                        onChange: (nextValue) =>
                          updateLayerById(selectedCutLayer.id, {
                            displayWidth: clamp(
                              nextValue,
                              16,
                              selectedLayerMetrics.widthMax,
                            ),
                          }),
                      },
                      {
                        key: "height",
                        label: "Height",
                        value: selectedLayerMetrics.height,
                        valueText: `${selectedLayerMetrics.height}px`,
                        min: 16,
                        max: selectedLayerMetrics.heightMax,
                        disabled: selectedCutLayer.lockScale,
                        onChange: (nextValue) =>
                          updateLayerById(selectedCutLayer.id, {
                            displayHeight: clamp(
                              nextValue,
                              16,
                              selectedLayerMetrics.heightMax,
                            ),
                          }),
                      },
                      {
                        key: "centerX",
                        label: "Pos X",
                        value: clamp(
                          selectedLayerMetrics.centerX,
                          0,
                          selectedLayerMetrics.centerXMax,
                        ),
                        valueText: `${selectedLayerMetrics.centerX}px`,
                        min: 0,
                        max: selectedLayerMetrics.centerXMax,
                        onChange: (nextValue) =>
                          updateLayerById(selectedCutLayer.id, {
                            centerX: clamp(
                              nextValue,
                              0,
                              selectedLayerMetrics.centerXMax,
                            ),
                          }),
                      },
                      {
                        key: "centerY",
                        label: "Pos Y",
                        value: clamp(
                          selectedLayerMetrics.centerY,
                          0,
                          selectedLayerMetrics.centerYMax,
                        ),
                        valueText: `${selectedLayerMetrics.centerY}px`,
                        min: 0,
                        max: selectedLayerMetrics.centerYMax,
                        onChange: (nextValue) =>
                          updateLayerById(selectedCutLayer.id, {
                            centerY: clamp(
                              nextValue,
                              0,
                              selectedLayerMetrics.centerYMax,
                            ),
                          }),
                      },
                      {
                        key: "rotation",
                        label: "Rotate",
                        value: selectedLayerMetrics.rotation,
                        valueText: `${selectedLayerMetrics.rotation}°`,
                        min: -180,
                        max: 180,
                        onChange: (nextValue) =>
                          updateLayerById(selectedCutLayer.id, {
                            rotation: (nextValue + 360) % 360,
                          }),
                      },
                      {
                        key: "contrast",
                        label: "Contrast",
                        value: selectedLayerMetrics.contrast,
                        valueText: `${selectedLayerMetrics.contrast}%`,
                        min: 10,
                        max: 300,
                        disabled: !isImageBackedLayerKind(selectedCutLayer.kind),
                        onChange: (nextValue) =>
                          updateLayerById(selectedCutLayer.id, {
                            contrast: clamp(nextValue, 10, 300),
                          }),
                      },
                      {
                        key: "level",
                        label: "Level",
                        value: selectedLayerMetrics.level,
                        valueText: `${selectedLayerMetrics.level}%`,
                        min: 10,
                        max: 300,
                        disabled: !isImageBackedLayerKind(selectedCutLayer.kind),
                        onChange: (nextValue) =>
                          updateLayerById(selectedCutLayer.id, {
                            level: clamp(nextValue, 10, 300),
                          }),
                      },
                      {
                        key: "opacity",
                        label: "Opacity",
                        value: selectedLayerMetrics.opacity,
                        valueText: `${selectedLayerMetrics.opacity}%`,
                        min: 10,
                        max: 100,
                        onChange: (nextValue) =>
                          updateLayerById(selectedCutLayer.id, {
                            opacity: clamp(nextValue / 100, 0.05, 1),
                          }),
                      },
                    ].map((control) => (
                      <label
                        key={control.key}
                        className="block rounded-2xl border border-white/75 bg-[#eef2f7] px-3 py-2 shadow-[3px_3px_8px_rgba(148,163,184,0.22),-3px_-3px_8px_rgba(255,255,255,0.86)]"
                      >
                        <span className="flex items-center justify-between gap-3 text-[10px] font-extrabold text-slate-600">
                          <span>{control.label}</span>
                          <span className="font-mono text-slate-900">
                            {control.valueText}
                          </span>
                        </span>
                        <input
                          type="range"
                          min={control.min}
                          max={control.max}
                          step={1}
                          value={control.value}
                          disabled={control.disabled}
                          onChange={(event) =>
                            control.onChange(Number(event.target.value))
                          }
                          className="mt-2 w-full accent-cyan-700 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </label>
                    ))}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleToolChange("pan");
                          focusLayerCanvas(selectedCutLayer.id, {
                            openPanel: false,
                          });
                        }}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold text-cyan-800`}
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, {
                            centerX: modelWidth / 2,
                            centerY: modelHeight / 2,
                          })
                        }
                        disabled={!modelWidth || !modelHeight}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        Center
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            flipX: !item.flipX,
                          }))
                        }
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold`}
                      >
                        Flip H
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            flipY: !item.flipY,
                          }))
                        }
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold`}
                      >
                        Flip V
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, {
                            contrast: 100,
                            level: 100,
                            rotation: 0,
                            flipX: false,
                            flipY: false,
                          })
                        }
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold`}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            lockScale: !item.lockScale,
                          }))
                        }
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold`}
                      >
                        {selectedCutLayer.lockScale ? "Unlock" : "Lock"}
                      </button>
                      <button
                        type="button"
                        onClick={duplicateSelectedCutLayer}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold`}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelectedCutLayersInStack("down")}
                        disabled={!selectedCutLayerIds.length}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        Turun
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelectedCutLayersInStack("up")}
                        disabled={!selectedCutLayerIds.length}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        Naik
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelectedCutLayersInStack("back")}
                        disabled={!selectedCutLayerIds.length}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        Bawah
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelectedCutLayersInStack("front")}
                        disabled={!selectedCutLayerIds.length}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        Atas
                      </button>
                      <button
                        type="button"
                        onClick={removeSelectedCutLayer}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-[10px] font-bold text-rose-600`}
                      >
                        Delete Layer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </details>
          ) : null}
          {isSimpleUiMode && typeof onOpenAdvancedUi === "function" ? (
            <button
              type="button"
              onClick={onOpenAdvancedUi}
              className={`${SOFT_RAISED_CLASS} rounded-full px-4 py-2 text-xs font-semibold text-slate-700 transition hover:text-slate-950`}
            >
              Advanced UI
            </button>
          ) : typeof onOpenSimpleUi === "function" ? (
            <button
              type="button"
              onClick={onOpenSimpleUi}
              className={`${SOFT_RAISED_CLASS} rounded-full px-4 py-2 text-xs font-semibold text-slate-700 transition hover:text-slate-950`}
            >
              Simple UI
            </button>
          ) : null}
          {!isSimpleUiMode ? (
            <IconButton
              icon={mobileControlsOpen ? "close" : "menu"}
              label={mobileControlsOpen ? "Tutup Kontrol" : "Buka Kontrol"}
              onClick={toggleMobileControlsPanel}
              active={mobileControlsOpen}
              className="lg:hidden"
            />
          ) : null}
        </div>
      </header>

      <motion.section
        layout
        className={`relative grid min-h-0 flex-1 gap-0 overflow-hidden lg:gap-2 ${desktopSectionClass}`}
        style={{
          "--left-sidebar-width": `${leftSidebarWidth}px`,
          "--right-sidebar-width": `${rightSidebarWidth}px`,
        }}
      >
        {effectiveShowLeftSidebar ? (
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
        {!isSimpleUiMode ? (
        <motion.button
          type="button"
          onClick={() => setShowLeftSidebar((prev) => !prev)}
          whileHover={BUTTON_HOVER}
          whileTap={BUTTON_TAP}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className={`absolute top-1/2 z-30 hidden h-12 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition lg:flex ${SOFT_RAISED_CLASS} text-rose-500`}
          style={{ left: showLeftSidebar ? leftSidebarWidth : 12 }}
          aria-label={showLeftSidebar ? "Hide menu kiri" : "Show menu kiri"}
          title={showLeftSidebar ? "Hide menu kiri" : "Show menu kiri"}
        >
          <Icon
            name={showLeftSidebar ? "moveLeft" : "moveRight"}
            className="h-4 w-4"
          />
        </motion.button>
        ) : null}
        {effectiveShowRightSidebar ? (
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
        {!isSimpleUiMode ? (
        <motion.button
          type="button"
          onClick={() => setShowRightSidebar((prev) => !prev)}
          whileHover={BUTTON_HOVER}
          whileTap={BUTTON_TAP}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className={`absolute top-1/2 z-30 hidden h-12 w-8 translate-x-1/2 -translate-y-1/2 items-center justify-center transition lg:flex ${SOFT_RAISED_CLASS} text-rose-500`}
          style={{ right: showRightSidebar ? rightSidebarWidth : 12 }}
          aria-label={showRightSidebar ? "Hide menu kanan" : "Show menu kanan"}
          title={showRightSidebar ? "Hide menu kanan" : "Show menu kanan"}
        >
          <Icon
            name={showRightSidebar ? "moveRight" : "moveLeft"}
            className="h-4 w-4"
          />
        </motion.button>
        ) : null}
        <motion.aside
          layout={!isMobileViewport}
          initial={false}
          transition={isMobileViewport ? MOBILE_PANEL_TRANSITION : PANEL_SPRING}
          animate={
            isMobileViewport
              ? {
                  y: mobileSetupPanelVisible ? 0 : 64,
                  opacity: mobileSetupPanelVisible ? 1 : 0,
                  scale: mobileSetupPanelVisible ? 1 : 0.985,
                }
              : { y: 0, opacity: 1, scale: 1 }
          }
          className={`fixed inset-x-0 bottom-0 z-40 order-2 flex max-h-[72vh] min-h-0 touch-pan-y flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[30px] border-b-0 pb-[calc(env(safe-area-inset-bottom)+12px)] ${SOFT_FLOAT_SURFACE_CLASS} ${
            mobileSetupPanelVisible
              ? "pointer-events-auto"
              : "pointer-events-none"
          } ${
            isMobileViewport
              ? mobilePanelPreviewActive
                ? "border-white/12 bg-[linear-gradient(180deg,rgba(244,247,251,0.14)_0%,rgba(229,236,244,0.1)_100%)] backdrop-blur-md"
                : "border-white/48 bg-[linear-gradient(180deg,rgba(244,247,251,0.74)_0%,rgba(229,236,244,0.68)_100%)] backdrop-blur-xl"
              : ""
          } ${
            isMobileViewport && mobilePanelPreviewActive
              ? "!backdrop-blur-0 !max-h-0 !overflow-visible !rounded-none !border-transparent !bg-transparent !pb-0 !shadow-none [&>*]:pointer-events-none [&>*]:opacity-0"
              : ""
          } ${effectiveShowLeftSidebar ? "lg:pointer-events-auto lg:static lg:inset-auto lg:z-auto lg:order-1 lg:flex lg:h-[calc(100vh-132px)] lg:max-h-[calc(100vh-132px)] lg:min-h-0 lg:overflow-y-auto lg:rounded-[28px] lg:opacity-100 lg:shadow-none" : "lg:hidden"}`}
        >
          <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-2 grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 backdrop-blur lg:hidden">
            <span />
            <span
              className={`h-1.5 w-12 justify-self-center ${SOFT_INSET_CLASS} bg-slate-300/70`}
            />
            <button
              type="button"
              onClick={() => setMobileControlsOpen(false)}
              className={`inline-flex h-8 w-8 justify-self-end ${SOFT_RAISED_CLASS} text-slate-600`}
              aria-label="Tutup setup panel"
              title="Tutup setup panel"
            >
              <Icon name="close" className="m-auto h-4 w-4" />
            </button>
          </div>
          <div
            className={`mb-1 grid grid-cols-2 gap-1 p-1 lg:hidden ${SOFT_INSET_CLASS}`}
          >
            <button
              type="button"
              onClick={() => {
                setMobilePanelMode("setup");
                setMobileControlsOpen(true);
              }}
              className={`px-2 py-1.5 text-[10px] font-semibold transition ${
                mobilePanelMode === "setup"
                  ? `${SOFT_PRESSED_CLASS} text-slate-800`
                  : `${SOFT_RAISED_CLASS} text-slate-600`
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
              className={`px-2 py-1.5 text-[10px] font-semibold transition ${
                mobilePanelMode === "workspace"
                  ? `${SOFT_PRESSED_CLASS} text-slate-800`
                  : `${SOFT_RAISED_CLASS} text-slate-600`
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
              ref={mainUploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className={`block w-full cursor-pointer ${SOFT_INPUT_CLASS}`}
            />
            {!isLeftSidebarCompact ? (
              <p className="text-[9px] text-slate-500">
                {imageName
                  ? `Background aktif: ${imageName}.`
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
              className={SOFT_SECTION_CLASS}
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
                    : "Belum compare."}
                </p>
              ) : null}
            </motion.div>

            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={PANEL_SPRING}
              ref={exportPanelRef}
              className={SOFT_SECTION_CLASS}
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
                <div
                  className={`${SOFT_INSET_CLASS} px-2 py-1.5 text-[11px] text-slate-600`}
                >
                  Total report: {measurementRows.length}
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
              <InfoTooltip text="Shortcut: L Draw Line, G Free Line, H Move/Pan, C Free Cut, A Angle, O Circle, K HKA, F Fit, Delete, Ctrl/Cmd+Z/Y." />
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
              <div className= "flex  "> 
              <ToolIconButton
                icon="freeLine"
                label="Free Line (G)"
                onClick={() => activateFreeLineMode("freehand")}
                active={tool === "freeLine" && freeLineMode === "freehand"}
              />
              <ToolIconButton
                icon="freeLine"
                label="Point Mode"
                onClick={() => activateFreeLineMode("point")}
                active={tool === "freeLine" && freeLineMode === "point"}
              />
            </div>
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
                label=" HKA Tool (K)"
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
            className={`order-6 ${SOFT_SECTION_CLASS}`}
            style={{ order: 6 }}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="preset" className="h-4 w-4 text-slate-600" />
              {!isLeftSidebarCompact ? (
                <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Adjust
                </span>
              ) : null}
              <InfoTooltip text="Contrast, level, rotate, flip, dan reset cut layer." />
            </div>
            <CompactSliderField
              label="Contrast"
              valueText={`${contrast}%`}
              min={20}
              max={300}
              step={1}
              value={contrast}
              onChange={(event) => setContrast(Number(event.target.value))}
              onDecrease={() => setContrast((prev) => clamp(prev - 2, 20, 300))}
              onIncrease={() => setContrast((prev) => clamp(prev + 2, 20, 300))}
            />
            <CompactSliderField
              label="Light"
              valueText={`${level}%`}
              min={20}
              max={220}
              step={1}
              value={level}
              onChange={(event) => setLevel(Number(event.target.value))}
              onDecrease={() => setLevel((prev) => clamp(prev - 2, 20, 220))}
              onIncrease={() => setLevel((prev) => clamp(prev + 2, 20, 220))}
            />
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
            className={`order-7 ${SOFT_SECTION_CLASS}`}
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
                label={snapToLandmarks ? "Snap Tool ON" : "Snap Tool OFF"}
                onClick={() => setSnapToLandmarks((prev) => !prev)}
                active={snapToLandmarks}
                tone="amber"
                className="h-8 w-full"
              />
            </div>
            {!isLeftSidebarCompact ? (
              <div className="text-[11px] text-slate-500">
                Snap tool: {snapToLandmarks ? "ON" : "OFF"} | Template
                library: {templateLibrary.length}
              </div>
            ) : null}
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
            <LocalImplantLibraryPanel
              items={LOCAL_IMPLANT_LIBRARY}
              selectedType={selectedImplantType}
              selectedItemId={selectedImplantLibraryId}
              onSelectType={setSelectedImplantType}
              onSelectItemId={setSelectedImplantLibraryId}
              onUseSelected={useSelectedImplantLibraryAsLayer}
              scaleInstruction={implantLibraryScaleInstruction}
              compact={isLeftSidebarCompact}
              disabled={!image || !modelWidth || !modelHeight}
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
                      className={`${SOFT_TINT_CARD_CLASS} p-2 transition-all duration-300 ${
                        isActive ? "scale-[1.01]" : ""
                      }`}
                      style={{
                        borderColor: isActive
                          ? layerPalette.border
                          : `${layerPalette.border}66`,
                        boxShadow: isActive
                          ? `10px 10px 24px rgba(148,163,184,0.16), -10px -10px 24px rgba(255,255,255,0.98), inset 0 0 0 1px ${layerPalette.border}22`
                          : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openLayerSettingsModal(layer.id)}
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
                        <div
                          className={`mt-1 ${SOFT_INSET_CLASS} px-2 py-1 text-[10px] text-slate-600`}
                        >
                          Detail layer aktif dibuka lewat modal Layer Settings.
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
            className={`order-3 ${SOFT_SECTION_CLASS} transition-[background,border-color,box-shadow]`}
            style={{
              order: 3,
              borderColor: shouldEmphasizeCalibration ? "#22d3ee" : undefined,
              background: shouldEmphasizeCalibration
                ? "linear-gradient(180deg, rgba(236,254,255,0.94) 0%, rgba(224,242,254,0.9) 100%)"
                : undefined,
              boxShadow: shouldEmphasizeCalibration
                ? "10px 10px 24px rgba(34,211,238,0.14), -8px -8px 18px rgba(255,255,255,0.96), inset 0 0 0 2px rgba(34,211,238,0.3)"
                : undefined,
            }}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="preset" className="h-4 w-4 text-slate-600" />
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
            {!hasCalibration && calibrationMode === "line" ? (
              <div className="rounded-[18px] border border-cyan-300/90 bg-[linear-gradient(180deg,rgba(236,254,255,0.96)_0%,rgba(219,234,254,0.92)_100%)] px-3 py-2 text-[11px] text-cyan-950 shadow-[0_8px_18px_rgba(34,211,238,0.1)]">
                <div className="font-semibold">
                  {selectedLine
                    ? `Line #${selectedLine.id} siap untuk kalibrasi`
                    : "Buat atau pilih satu garis untuk kalibrasi"}
                </div>
                <div className="mt-0.5">
                  {selectedLine
                    ? 'Pilih ukuran real ruler, lalu tekan "Simpan Kalibrasi".'
                    : 'Gunakan garis pada ruler X-ray, atau buat ruler default, lalu buka tab "Garis Real".'}
                </div>
              </div>
            ) : null}
            {calibrationMode === "line" && calibrationReferenceLine ? (
              <div
                className={`${SOFT_TINT_CARD_CLASS} px-3 py-2 text-[11px]`}
                style={{
                  color:
                    calibrationLineId === calibrationReferenceLine.id
                      ? "#166534"
                      : "#0f766e",
                }}
              >
                <div className="font-medium">
                  {calibrationLineId === calibrationReferenceLine.id
                    ? "Calibration ruler aktif"
                    : "Ruler referensi aktif"}
                </div>
                <div className="mt-0.5">
                  Line #{calibrationReferenceLine.id} |{" "}
                  {lineTypeLabel(calibrationReferenceLine.type)}
                </div>
              </div>
            ) : null}
            <div
              className={`grid gap-1.5 ${isLeftSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
            >
              <button
                type="button"
                onClick={() => setCalibrationMode("line")}
                className={`${calibrationMode === "line" ? `${SOFT_PRESSED_CLASS} text-slate-800` : `${SOFT_RAISED_CLASS} text-slate-700`} px-2 py-2 text-xs font-medium`}
                title="Kalibrasi pakai garis referensi real"
              >
                Garis Real
              </button>
              <button
                type="button"
                onClick={() => setCalibrationMode("zoom")}
                className={`${calibrationMode === "zoom" ? `${SOFT_PRESSED_CLASS} text-cyan-700` : `${SOFT_RAISED_CLASS} text-slate-700`} px-2 py-2 text-xs font-medium`}
                title="Kalibrasi pakai mm/px pada zoom source"
              >
                Zoom %
              </button>
            </div>
            <div className={`${SOFT_INSET_CLASS} px-2 py-2`}>
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
                  className={`${isLeftSidebarNarrow ? "col-span-1 w-full" : "w-[84px]"} ${SOFT_INPUT_CLASS} px-2 py-1`}
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
                  className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-slate-700`}
                  title="Set zoom source 100%"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setSourceZoomPercent("90")}
                  className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-slate-700`}
                  title="Set zoom source 90%"
                >
                  90%
                </button>
              </div>
            </div>
            {calibrationMode === "line" ? (
              <div
                className={`grid gap-1.5 px-2 py-2 ${SOFT_INSET_CLASS} ${
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
                  className={`${SOFT_INPUT_CLASS} w-full px-2 py-1`}
                />
                <select
                  value={actualUnit}
                  onChange={(event) => setActualUnit(event.target.value)}
                  className={`${SOFT_SELECT_CLASS} w-full px-1.5 py-1`}
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            ) : (
              <div
                className={`${SOFT_INSET_CLASS} px-2 py-2 ${
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
                  className={`${isLeftSidebarNarrow ? "w-full" : "w-[120px]"} ${SOFT_INPUT_CLASS} px-2 py-1`}
                />
              </div>
            )}
            <div
              className={`${SOFT_INSET_CLASS} flex items-center gap-1.5 px-2 py-2`}
            >
              <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                Faktor
              </span>
              <span className="text-xs text-slate-700">
                {mmPerPixel !== null ? `${mmPerPixel.toFixed(6)} mm/px` : "-"}
              </span>
            </div>
            <div
              className={`${SOFT_TINT_CARD_CLASS} px-3 py-2 text-[11px]`}
              style={{
                color:
                  calibrationQuality.status === "good"
                    ? "#166534"
                    : calibrationQuality.status === "warn"
                      ? "#92400e"
                      : "#9f1239",
              }}
            >
              <div className="font-medium">{calibrationQuality.title}</div>
              {!isLeftSidebarCompact ? (
                <div>{calibrationQuality.detail}</div>
              ) : null}
            </div>
            {calibrationMode === "line" ? (
              <div className={`${SOFT_INSET_CLASS} px-2 py-2`}>
                {!isLeftSidebarCompact ? (
                  <div className="mb-1 text-[10px] font-medium tracking-wide text-emerald-700 uppercase">
                    Ruler Default
                  </div>
                ) : null}
                <div className="grid gap-1.5">
                  <button
                    type="button"
                    onClick={createCalibrationPresetLineFromInput}
                    className={`${SOFT_PRIMARY_BUTTON_CLASS} px-2 py-2 text-xs text-slate-800`}
                    title="Buat ruler default dari nilai input saat ini"
                  >
                    Buat dari Garis Real
                  </button>
                  <div
                    className={`grid gap-1.5 ${
                      isLeftSidebarNarrow ? "grid-cols-1" : "grid-cols-3"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => createCalibrationPresetLine(100)}
                      className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-2 text-xs text-emerald-900`}
                      title="Buat ruler default 10 cm / 100 mm"
                    >
                      10 cm
                    </button>
                    <button
                      type="button"
                      onClick={() => createCalibrationPresetLine(130)}
                      className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-2 text-xs text-emerald-900`}
                      title="Buat ruler default 13 cm"
                    >
                      13 cm
                    </button>
                    <button
                      type="button"
                      onClick={() => createCalibrationPresetLine(150)}
                      className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-2 text-xs text-emerald-900`}
                      title="Buat ruler default 15 cm"
                    >
                      15 cm
                    </button>
                  </div>
                </div>
                {!isLeftSidebarCompact ? (
                  <div className="mt-1 text-[9px] text-slate-500">
                    Pakai jika X-ray tidak punya ruler fisik. Isi nilai lalu
                    buat ruler, atau pilih preset cepat. Garis akan muncul di
                    canvas dan bisa di-adjust sebelum disimpan.
                  </div>
                ) : null}
              </div>
            ) : null}
            {calibrationMode === "line" && calibrationReferenceLine ? (
              <div className={`${SOFT_INSET_CLASS} px-2 py-2`}>
                {!isLeftSidebarCompact ? (
                  <div className="mb-1 text-[10px] font-medium tracking-wide text-emerald-700 uppercase">
                    Stroke Width Ruler
                  </div>
                ) : null}
                <CompactSliderField
                  label="Stroke"
                  valueText={`${(
                    Number.isFinite(calibrationReferenceLine.strokeWidth)
                      ? calibrationReferenceLine.strokeWidth
                      : DEFAULT_LINE_STROKE_WIDTH
                  ).toFixed(1)}x`}
                  min={1}
                  max={8}
                  step={0.1}
                  value={
                    Number.isFinite(calibrationReferenceLine.strokeWidth)
                      ? calibrationReferenceLine.strokeWidth
                      : DEFAULT_LINE_STROKE_WIDTH
                  }
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setLines((prev) =>
                      prev.map((line) =>
                        line.id === calibrationReferenceLine.id
                          ? { ...line, strokeWidth: nextValue }
                          : line,
                      ),
                    );
                  }}
                  onDecrease={() =>
                    setLines((prev) =>
                      prev.map((line) =>
                        line.id === calibrationReferenceLine.id
                          ? {
                              ...line,
                              strokeWidth: clamp(
                                (Number(line.strokeWidth) ||
                                  DEFAULT_LINE_STROKE_WIDTH) - 0.2,
                                1,
                                8,
                              ),
                            }
                          : line,
                      ),
                    )
                  }
                  onIncrease={() =>
                    setLines((prev) =>
                      prev.map((line) =>
                        line.id === calibrationReferenceLine.id
                          ? {
                              ...line,
                              strokeWidth: clamp(
                                (Number(line.strokeWidth) ||
                                  DEFAULT_LINE_STROKE_WIDTH) + 0.2,
                                1,
                                8,
                              ),
                            }
                          : line,
                      ),
                    )
                  }
                />
              </div>
            ) : null}
            <div
              className={`grid gap-1.5 ${
                isLeftSidebarNarrow ? "grid-cols-1" : "grid-cols-1"
              }`}
            >
              <motion.button
                type="button"
                onClick={applyCalibration}
                disabled={calibrationMode === "line" ? !selectedLine : false}
                whileHover={
                  calibrationMode === "line" && !selectedLine
                    ? undefined
                    : BUTTON_HOVER
                }
                whileTap={
                  calibrationMode === "line" && !selectedLine
                    ? undefined
                    : BUTTON_TAP
                }
                transition={{ duration: 0.16, ease: "easeOut" }}
                className={`inline-flex items-center justify-center gap-2 rounded-[18px] border px-3 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  shouldEmphasizeCalibration
                    ? "border-cyan-300 bg-[linear-gradient(180deg,#d9fbff_0%,#bff5f6_100%)] text-cyan-950 shadow-[0_10px_22px_rgba(34,211,238,0.16)]"
                    : SOFT_PRIMARY_BUTTON_CLASS
                }`}
                title="Simpan Kalibrasi"
              >
                <BadgeCheck className="h-4 w-4" strokeWidth={2} />
                <span>Simpan Kalibrasi</span>
              </motion.button>
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
            className={`order-1 ${SOFT_SECTION_CLASS}`}
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
            <div className="grid grid-cols-4 gap-1.5 text-[9px]">
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
                  ? SOFT_DARK_BUTTON_CLASS
                  : step.done
                    ? `${SOFT_PRIMARY_BUTTON_CLASS} text-slate-800`
                    : `${SOFT_RAISED_CLASS} text-slate-600`;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={step.onClick}
                    className={`px-1.5 py-2 text-[10px] font-semibold ${toneClass}`}
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
              <InfoTooltip text="Preset line: Normal, Offset, Femoral Offset, Global Offset, LLD. HKA gunakan HKA. Circle lebih mudah: drag area dalam untuk pindah, drag tepi untuk resize, atau pakai slider diameter." />
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
                className={`rounded-md border px-2 py-1 text-[9px] ${
                  tool === "hkaAuto"
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
               HKA Line
              </button>
              <button
                type="button"
                onClick={() => handleLinePresetChange("offset")}
                title={HIP_FUNCTION_SUMMARY_BY_KEY.offset.detail}
                className={`rounded-md border px-2 py-1 text-[10px] ${
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
                title={HIP_FUNCTION_SUMMARY_BY_KEY.femoralOffset.detail}
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
                title={HIP_FUNCTION_SUMMARY_BY_KEY.globalOffset.detail}
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
                title={HIP_FUNCTION_SUMMARY_BY_KEY.lld.detail}
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
                    className="rounded border border-violet-300 bg-white px-2 py-1 text-[10px] text-violet-800"
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
                    className="rounded border border-violet-300 bg-white px-2 py-1 text-[10px] text-violet-800"
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
            className={`order-11 ${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-600`}
            style={{ order: 11 }}
          >
            {notice}
          </motion.p>

          <motion.div
            layout
            transition={PANEL_SPRING}
            className={`order-12 ${SOFT_SECTION_CLASS}`}
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
            <div
              className={`max-h-24 overflow-y-auto ${SOFT_INSET_CLASS} px-2 py-1.5 text-[11px] text-slate-600`}
            >
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
          layout={!isMobileViewport}
          initial={false}
          transition={isMobileViewport ? MOBILE_PANEL_TRANSITION : PANEL_SPRING}
          animate={
            isMobileViewport
              ? {
                  y: mobileWorkspacePanelVisible ? 0 : 64,
                  opacity: mobileWorkspacePanelVisible ? 1 : 0,
                  scale: mobileWorkspacePanelVisible ? 1 : 0.985,
                }
              : { y: 0, opacity: 1, scale: 1 }
          }
          className={`fixed inset-x-0 bottom-0 z-40 order-3 flex max-h-[72vh] min-h-0 touch-pan-y flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[30px] border-b-0 pb-[calc(env(safe-area-inset-bottom)+12px)] ${SOFT_FLOAT_SURFACE_CLASS} ${
            mobileWorkspacePanelVisible
              ? "pointer-events-auto"
              : "pointer-events-none"
          } ${
            isMobileViewport
              ? mobilePanelPreviewActive
                ? "border-white/12 bg-[linear-gradient(180deg,rgba(244,247,251,0.14)_0%,rgba(229,236,244,0.1)_100%)] backdrop-blur-md"
                : "border-white/48 bg-[linear-gradient(180deg,rgba(244,247,251,0.74)_0%,rgba(229,236,244,0.68)_100%)] backdrop-blur-xl"
              : ""
          } ${
            isMobileViewport && mobilePanelPreviewActive
              ? "!backdrop-blur-0 !max-h-0 !overflow-visible !rounded-none !border-transparent !bg-transparent !pb-0 !shadow-none [&>*]:pointer-events-none [&>*]:opacity-0"
              : ""
          } ${effectiveShowRightSidebar ? "lg:pointer-events-auto lg:static lg:inset-auto lg:z-auto lg:flex lg:h-[calc(100vh-132px)] lg:max-h-[calc(100vh-132px)] lg:min-h-0 lg:overflow-y-auto lg:rounded-[28px] lg:opacity-100 lg:shadow-none" : "lg:hidden"}`}
        >
          <div className="sticky top-0 z-10 -ml-2 -mx-3 -mt-3 mb-2 grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 backdrop-blur lg:hidden">
            <span />
            <span
              className={`h-1.5 w-12 justify-self-center ${SOFT_INSET_CLASS} bg-slate-300/70`}
            />
            <button
              type="button"
              onClick={() => setMobileControlsOpen(false)}
              className={`inline-flex h-8 w-8 justify-self-end ${SOFT_RAISED_CLASS} text-slate-600`}
              aria-label="Tutup workspace panel"
              title="Tutup workspace panel"
            >
              <Icon name="close" className="m-auto h-4 w-4 " />
            </button>
          </div>
          <div
            className={`mb-1 grid grid-cols-2 gap-1 p-1 lg:hidden ${SOFT_INSET_CLASS}`}
          >
            <button
              type="button"
              onClick={() => {
                setMobilePanelMode("setup");
                setMobileControlsOpen(true);
              }}
              className={`px-2 py-1.5 text-[10px] font-semibold transition ${
                mobilePanelMode === "setup"
                  ? `${SOFT_PRESSED_CLASS} text-slate-800`
                  : `${SOFT_RAISED_CLASS} text-slate-600`
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
              className={`px-2 py-1.5 text-[10px] font-semibold transition ${
                mobilePanelMode === "workspace"
                  ? `${SOFT_PRESSED_CLASS} text-slate-800`
                  : `${SOFT_RAISED_CLASS} text-slate-600`
              }`}
            >
              Panel
            </button>
          </div>
          <div className={`${SIDEBAR_TAB_GRID_CLASS} p-1 ${SOFT_INSET_CLASS}`}>
            {[
              {
                id: "tool",
                label: "TOOL",
                shortLabel: "T",
                activeClass: `${SOFT_PRESSED_CLASS} text-cyan-700`,
                idleClass: `${SOFT_RAISED_CLASS} text-cyan-700`,
              },
              {
                id: "measure",
                label: "MEASURE",
                shortLabel: "M",
                activeClass: `${SOFT_PRESSED_CLASS} text-emerald-700`,
                idleClass: `${SOFT_RAISED_CLASS} text-emerald-700`,
              },
              {
                id: "planning",
                label: "Planning",
                shortLabel: "P",
                activeClass: `${SOFT_PRESSED_CLASS} text-amber-700`,
                idleClass: `${SOFT_RAISED_CLASS} text-amber-700`,
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
                  className={`px-2 py-2 text-[10px] font-semibold tracking-wide uppercase transition ${
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
              className={SOFT_SECTION_CLASS}
            >
              <div className="flex items-center gap-1.5">
                <Icon name="camera" className="h-4 w-4 text-cyan-700" />
                {!isRightSidebarCompact ? (
                  <span className="text-xs font-semibold tracking-wide text-cyan-900 uppercase">
                    Tool
                  </span>
                ) : null}
                <InfoTooltip text="Shortcut: L draw, G free line, H move, C free cut, A angle, O circle, K HKA, J center finder, B axis builder, Q guide builder, F fit, Delete, Ctrl/Cmd+Z/Y." />
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
                  icon="freeLine"
                  label="Free Line (G)"
                  onClick={() => activateFreeLineMode("freehand")}
                  active={tool === "freeLine" && freeLineMode === "freehand"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="freeLine"
                  label="Point Mode"
                  onClick={() => activateFreeLineMode("point")}
                  active={tool === "freeLine" && freeLineMode === "point"}
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
                  icon="centerFinder"
                  label="Center Finder (J)"
                  onClick={() => handleToolChange("centerFinder")}
                  active={tool === "centerFinder"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="axisBuilder"
                  label="Axis Builder (B)"
                  onClick={() => handleToolChange("axisBuilder")}
                  active={tool === "axisBuilder"}
                  className="h-9 w-full"
                />
                <ToolIconButton
                  icon="guideBuilder"
                  label="Parallel / Perpendicular Guide (Q)"
                  onClick={() => handleToolChange("guideBuilder")}
                  active={tool === "guideBuilder"}
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
              <div className={`${SOFT_SURFACE_CLASS} px-3 py-3`}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                  <span>Snap Tool</span>
                  <span className="tracking-normal text-cyan-700 normal-case">
                    {snapToLandmarks ? "Aktif" : "Off"}
                  </span>
                </div>
                <div
                  className={`${SOFT_INSET_CLASS} mb-2 px-3 py-2 text-[11px] text-slate-600`}
                >
                  {snapSummaryLabel}
                  {activeSnapTarget ? ` • ${activeSnapTarget.label}` : ""}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSnapToLandmarks((prev) => !prev);
                      if (!snapToLandmarks) {
                        setToolConfigModal("snapTool");
                      }
                    }}
                    className={
                      snapToLandmarks
                        ? `${SOFT_DARK_BUTTON_CLASS} text-white`
                        : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-700`
                    }
                  >
                    {snapToLandmarks ? "Snap ON" : "Snap OFF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolConfigModal("snapTool")}
                    className={SOFT_TEXT_BUTTON_CLASS}
                  >
                    Atur Snap
                  </button>
                </div>
              </div>
              {activeOrthoBuilderMeta ? (
                <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon
                        name={activeOrthoBuilderMeta.icon}
                        className="h-4 w-4 shrink-0 text-cyan-700"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-semibold tracking-wide text-cyan-900 uppercase">
                          {activeOrthoBuilderMeta.title}
                        </div>
                        <div className="truncate text-[10px] text-slate-500">
                          {activeOrthoBuilderMeta.status}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <InfoTooltip text={activeOrthoBuilderMeta.info} />
                      <button
                        type="button"
                        onClick={() => setToolConfigModal(activeOrthoBuilderMeta.key)}
                        className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px]`}
                      >
                        Settings
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {tool === "freeLine" ? (
                <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                    <span>Free Line Mode</span>
                    {!isRightSidebarCompact ? (
                      <span className="tracking-normal text-cyan-700 normal-case">
                        {freeLineMode === "point"
                          ? "Point per titik"
                          : "Freehand drag"}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => activateFreeLineMode("freehand")}
                      className={`px-2 py-2 text-xs font-medium transition ${
                        freeLineMode === "freehand"
                          ? SOFT_DARK_BUTTON_CLASS
                          : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                      }`}
                    >
                      Freehand
                    </button>
                    <button
                      type="button"
                      onClick={() => activateFreeLineMode("point")}
                      className={`px-2 py-2 text-xs font-medium transition ${
                        freeLineMode === "point"
                          ? SOFT_DARK_BUTTON_CLASS
                          : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                      }`}
                    >
                      Point Mode
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => createEmptyFreeLineLayer(freeLineMode)}
                    className={`${SOFT_TEXT_BUTTON_CLASS} mt-1.5 w-full px-2 py-2 text-[10px] font-bold text-blue-700`}
                  >
                    + Layer Kosong
                  </button>
                  {!isRightSidebarCompact ? (
                    <div className="mt-1 text-[10px] text-slate-500">
                      `G` pilih tool. `Enter` selesai di Point Mode, `Escape`
                      batal.
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                  <span>Canvas</span>
                  <span
                    className={`tracking-normal text-cyan-700 normal-case text-xs ${isRightSidebarCompact ? "hidden" : ""}`}
                  >
                    {image ? "Background aktif" : "Kosong"}
                  </span>
                </div>
                <div className={`${SIDEBAR_TEXT_BUTTON_GRID_CLASS} flex items-center`}>
                  <button
                    type="button"
                    onClick={() => resetWorkspaceState()}
                    className={`${SOFT_TEXT_BUTTON_CLASS} text-cyan-700 text-[9px]`}
                    title="Reset measurement, compare, layer, dan planning"
                  >
                    {isRightSidebarCompact ? "Reset" : "Reset Workspace"}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetWorkspaceState({ clearImage: true })}
                    className={`${SOFT_DANGER_BUTTON_CLASS} text-[9px]`}
                    title="Reset total termasuk background"
                  >
                    {isRightSidebarCompact ? "Total" : "Reset Canvas Total"}
                  </button>
                </div>
                {!isRightSidebarCompact ? (
                  <div className="mt-1 text-[9px] text-slate-500">
                    Reset total menghapus background, measurement, compare, dan
                    semua layer overlay.
                  </div>
                ) : null}
              </div>
              <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                <div className="mb-1.5 flex items-center justify-between gap-2 p-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                  <span className="flex items-center gap-1.5">
                    <span>Layer Move</span>
                    <InfoTooltip text="Klik row untuk pilih layer aktif. Gunakan tombol Sel untuk multi-select. Shortcut desktop: [ turun, ] naik, Shift+[ paling bawah, Shift+] paling atas, Ctrl/Cmd+D duplicate offset." />
                  </span>
                  <span className="p-1 tracking-normal text-cyan-700 normal-case">
                    {selectedLayerStackRangeLabel}
                  </span>
                </div>
                <div
                  className={`${SOFT_INSET_CLASS} mb-2 px-3 py-2 text-[9px] text-slate-600`}
                >
                  {selectedCutLayerIds.length > 0
                    ? `${layerMoveSummaryLabel}. Drag batch berjalan saat tool Move aktif.`
                    : `${layerMoveSummaryLabel}. Edit drag, resize, rotate, insert point, dan delete point layer berjalan saat tool Move aktif.`}
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleToolChange("pan");
                      if (selectedCutLayer && !hasLayerMultiSelection) {
                        focusLayerCanvas(selectedCutLayer.id);
                      }
                    }}
                    className={`px-2 py-2 text-xs font-medium transition ${
                      tool === "pan"
                        ? SOFT_DARK_BUTTON_CLASS
                        : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900 text-[9px]`
                    }`}
                  >
                    Aktifkan Move
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selectedCutLayer &&
                      openLayerSettingsModal(selectedCutLayer.id)
                    }
                    disabled={!selectedCutLayer}
                    className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45 text-[9px]`}
                    >
                      Layer Settings
                    </button>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setToolConfigModal("layerMove")}
                    className={`{SOFT_TEXT_BUTTON_CLASS} text-[10px]`}
                  >
                    Kelola Layer
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolConfigModal("layerMove")}
                    disabled={!cutLayers.length}
                    className={`${SOFT_TEXT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-45 text-[9px]`}
                  >
                    Urutan & Group
                  </button>
                </div>
              </div>
              <div
                ref={layerSettingsPanelRef}
                className={`${SOFT_SURFACE_CLASS} px-3 py-3 transition-all duration-300`}
                style={
                  selectedLayerPalette
                    ? {
                        borderColor: `${selectedLayerPalette.border}44`,
                        boxShadow: selectedCutLayer
                          ? `10px 10px 24px rgba(148,163,184,0.16), -10px -10px 24px rgba(255,255,255,0.98), inset 0 0 0 1px ${selectedLayerPalette.border}22`
                          : undefined,
                      }
                    : undefined
                }
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
                  <span>Layer Settings</span>
                  <span
                    className="text-sm font-semibold tracking-normal normal-case"
                    style={{ color: selectedLayerPalette?.text || "#475569" }}
                  >
                    {selectedCutLayer ? `#${selectedCutLayer.id}` : "-"}
                  </span>
                </div>

                {!selectedCutLayer || !selectedLayerMetrics ? (
                  <span className="text-[11px] text-slate-500">
                    Pilih layer untuk membuka setting.
                  </span>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div
                      className={`${SOFT_INSET_CLASS} px-3 py-2 text-xs text-slate-700`}
                      style={{
                        color: selectedLayerPalette?.text || "#334155",
                      }}
                    >
                      {selectedCutLayer.name ||
                        getLayerDefaultName(selectedCutLayer)}{" "}
                      | {selectedCutLayerIndex + 1}/{cutLayers.length}
                      {hasLayerMultiSelection
                        ? ` • primary dari ${selectedCutLayerIds.length} layer`
                        : ""}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                      <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                        {Math.round(selectedLayerMetrics.width)} ×{" "}
                        {Math.round(selectedLayerMetrics.height)}
                      </div>
                      <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                        Pos {Math.round(selectedLayerMetrics.centerX)} /{" "}
                        {Math.round(selectedLayerMetrics.centerY)}
                      </div>
                      <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                        Opacity {selectedLayerMetrics.opacity}%
                      </div>
                      <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                        Rotate {selectedLayerMetrics.rotation}°
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openLayerSettingsModal(selectedCutLayer.id)}
                        className={`${SOFT_TEXT_BUTTON_CLASS} text-cyan-700`}
                      >
                        Buka Settings
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openLayerSettingsModal(
                            selectedCutLayer.id,
                            hasLayerContentControls ? "content" : "view",
                          )
                        }
                        className={SOFT_TEXT_BUTTON_CLASS}
                      >
                        {hasLayerContentControls ? "Content" : "View"}
                      </button>
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
              className={SOFT_SECTION_CLASS}
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
              <div className={`grid grid-cols-2 gap-1 p-1 ${SOFT_INSET_CLASS}`}>
                <button
                  type="button"
                  onClick={() => setMeasureAnatomyTab("hip")}
                  className={`px-2 py-2 text-xs font-semibold transition ${
                    measureAnatomyTab === "hip"
                      ? SOFT_DARK_BUTTON_CLASS
                      : `${SOFT_RAISED_CLASS} text-rose-700`
                  }`}
                >
                  Hip
                </button>
                <button
                  type="button"
                  onClick={() => setMeasureAnatomyTab("knee")}
                  className={`px-2 py-2 text-xs font-semibold transition ${
                    measureAnatomyTab === "knee"
                      ? SOFT_DARK_BUTTON_CLASS
                      : `${SOFT_RAISED_CLASS} text-cyan-700`
                  }`}
                >
                  Knee
                </button>
              </div>
              <div className={`${SOFT_SURFACE_CLASS} px-3 py-3`}>
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
                      "text-slate-800",
                    )}
                  >
                    Line
                  </button>
                  <select
                    value={measurementUnit}
                    onChange={(event) => setMeasurementUnit(event.target.value)}
                    className={SOFT_SELECT_CLASS}
                  >
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                  </select>
                </div>
              </div>
              {measureAnatomyTab === "knee" ? (
                <div
                  className={`${SOFT_TINT_CARD_CLASS} px-3 py-3 text-cyan-900`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                    <span>Knee</span>
                    <span className="text-cyan-700 normal-case">
                       HKA & TKA
                    </span>
                  </div>
                  <div className={SIDEBAR_TEXT_BUTTON_GRID_CLASS}>
                    <button
                      type="button"
                      onClick={() => handleToolChange("hkaAuto")}
                      className={measurePresetButtonClass(
                        tool === "hkaAuto",
                        "text-cyan-700",
                      )}
                    >
                     HKA Line
                    </button>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {Object.values(HKA_MODE_DEFINITIONS).map((modeItem) => (
                      <button
                        key={modeItem.key}
                        type="button"
                        onClick={() => handleHkaModeChange(modeItem.key)}
                        className={measurePresetButtonClass(
                          hkaInputMode === modeItem.key,
                          "text-cyan-700",
                        )}
                      >
                        {modeItem.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {[
                      { key: "right", label: "Kaki kanan" },
                      { key: "left", label: "Kaki kiri" },
                    ].map((sideItem) => (
                      <button
                        key={`hka-side-${sideItem.key}`}
                        type="button"
                        onClick={() => {
                          setHkaSide(sideItem.key);
                          if (selectedHka) {
                            updateHkaSideById(selectedHka.id, sideItem.key);
                          } else {
                            setNotice(
                              `HKA berikutnya diset untuk ${sideItem.label}. Varus/valgus akan dibaca dari sisi ini.`,
                            );
                          }
                        }}
                        className={measurePresetButtonClass(
                          hkaSide === sideItem.key,
                          "text-cyan-700",
                        )}
                      >
                        {sideItem.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 rounded-[16px] border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-[10px] text-cyan-800">
                    Mode aktif: {getHkaModeDefinition(hkaInputMode).modeLabel} |{" "}
                    {getHkaSideLabel(hkaSide)}
                  </div>
                </div>
              ) : null}
              {measureAnatomyTab === "hip" ? (
                <div
                  className={`${SOFT_TINT_CARD_CLASS} px-3 py-3 text-rose-900`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-rose-900 uppercase">
                    <span>Hip</span>
                    <span className="text-rose-700 normal-case">
                      Offset & LLD
                    </span>
                  </div>
                  <div className={SIDEBAR_TEXT_BUTTON_GRID_CLASS}>
                    {HIP_FUNCTION_SUMMARY_ITEMS.map((item) => (
                      <button
                        key={`measure-hip-${item.key}`}
                        type="button"
                        onClick={() => handleLinePresetChange(item.key)}
                        title={item.detail}
                        className={measurePresetButtonClass(
                          linePreset === item.key,
                          item.activeClass,
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <HipFunctionSummaryPanel
                    className="mt-2"
                    compact
                    title="Fungsi Offset"
                  />
                </div>
              ) : null}
              <div className={`${SOFT_SURFACE_CLASS} px-3 py-2`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold tracking-wide text-emerald-900 uppercase">
                    Legend
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMeasureLegend((prev) => !prev)}
                    className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-emerald-900`}
                  >
                    {showMeasureLegend ? "Hide" : "Show"}
                  </button>
                </div>
                {showMeasureLegend ? (
                  <div className="mt-2 grid gap-1.5 text-[10px]">
                    {[
                      { key: "normal", label: "LINE" },
                      { key: "axis", label: "AXIS" },
                      { key: "parallelGuide", label: "PARA" },
                      { key: "perpendicularGuide", label: "PERP" },
                      { key: "offset", label: "OFFSET" },
                      { key: "femoralOffset", label: "FEM-OFF" },
                      { key: "globalOffset", label: "GLB-OFF" },
                      { key: "lld", label: "LLD" },
                      { key: "ruler", label: "RULER" },
                      { key: "hka", label: "HKA" },
                    ].map((item) => {
                      const style = getLineVisualStyle(
                        {
                          type: item.key,
                          strokeWidth:
                            item.key === "hka"
                              ? DEFAULT_HKA_STROKE_WIDTH
                              : DEFAULT_LINE_STROKE_WIDTH,
                        },
                        {},
                      );
                      return (
                        <div
                          key={item.key}
                          className={`${SOFT_INSET_CLASS} flex items-center justify-between gap-2 px-2 py-1.5 text-[10px] text-slate-600`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="font-medium text-slate-700">
                              {item.label}
                            </span>
                            <span
                              className="block h-0 w-12 shrink-0 border-t-2"
                              style={{
                                borderTopColor: style.color,
                                borderTopStyle:
                                  style.dashPattern?.length ? "dashed" : "solid",
                              }}
                            />
                          </div>
                          {!isRightSidebarCompact ? (
                            <span className="shrink-0 text-[9px] text-slate-500">
                              {item.key === "ruler"
                                ? "ref"
                                : item.key === "hka"
                                  ? "axis"
                                  : "measure"}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                    <div
                      className={`${SOFT_INSET_CLASS} flex items-center justify-between gap-2 px-2 py-1.5 text-[10px] text-slate-600`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-medium text-slate-700">GUIDE</span>
                        <span
                          className="block h-0 w-12 shrink-0 border-t-2 border-dashed"
                          style={{
                            borderTopColor: getPlanningGuideAutoColor({
                              kind: "valgusCut",
                              side: "Right",
                            }),
                          }}
                        />
                      </div>
                      {!isRightSidebarCompact ? (
                        <span className="shrink-0 text-[9px] text-slate-500">
                          planning
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-[9px] text-slate-500">
                    LINE, AXIS, PARA, PERP, OFFSET, FEM-OFF, GLB-OFF, LLD, RULER, HKA, GUIDE
                  </div>
                )}
              </div>
              {selectedLine ? (
                <div
                  className={`${SOFT_TINT_CARD_CLASS} px-3 py-3 text-[11px] text-emerald-900`}
                >
                  <div className="mb-1 font-medium text-emerald-950">
                    Adjust Line #{selectedLine.id}
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    {isCoarsePointer
                      ? "Mobile: sentuh ujung untuk munculkan bundaran assist. Drag dari area bundaran untuk adjust tanpa menutupi titik handle, atau tap lagi pada badan garis untuk pindah."
                      : "Drag titik ujung, geser garis, atau drag label langsung di canvas."}
                  </div>
                  <div className="mt-1.5 grid gap-1.5">
                    <CompactSliderField
                      label="Stroke Width"
                      valueText={`${(
                        Number.isFinite(selectedLine.strokeWidth)
                          ? selectedLine.strokeWidth
                          : DEFAULT_LINE_STROKE_WIDTH
                      ).toFixed(1)}x`}
                      min={1}
                      max={8}
                      step={0.1}
                      value={
                        Number.isFinite(selectedLine.strokeWidth)
                          ? selectedLine.strokeWidth
                          : DEFAULT_LINE_STROKE_WIDTH
                      }
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? { ...line, strokeWidth: nextValue }
                              : line,
                          ),
                        );
                      }}
                      onDecrease={() =>
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? {
                                  ...line,
                                  strokeWidth: clamp(
                                    (Number(line.strokeWidth) ||
                                      DEFAULT_LINE_STROKE_WIDTH) - 0.2,
                                    1,
                                    8,
                                  ),
                                }
                              : line,
                          ),
                        )
                      }
                      onIncrease={() =>
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? {
                                  ...line,
                                  strokeWidth: clamp(
                                    (Number(line.strokeWidth) ||
                                      DEFAULT_LINE_STROKE_WIDTH) + 0.2,
                                    1,
                                    8,
                                  ),
                                }
                              : line,
                          ),
                        )
                      }
                    />
                    <CompactSliderField
                      label="Label X"
                      valueText={`${Math.round(
                        Number.isFinite(selectedLine.labelOffsetX)
                          ? selectedLine.labelOffsetX
                          : DEFAULT_LINE_LABEL_OFFSET_X,
                      )}`}
                      min={-180}
                      max={180}
                      step={1}
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
                      onDecrease={() =>
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? {
                                  ...line,
                                  labelOffsetX: clamp(
                                    (Number.isFinite(line.labelOffsetX)
                                      ? line.labelOffsetX
                                      : DEFAULT_LINE_LABEL_OFFSET_X) - 2,
                                    -180,
                                    180,
                                  ),
                                }
                              : line,
                          ),
                        )
                      }
                      onIncrease={() =>
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? {
                                  ...line,
                                  labelOffsetX: clamp(
                                    (Number.isFinite(line.labelOffsetX)
                                      ? line.labelOffsetX
                                      : DEFAULT_LINE_LABEL_OFFSET_X) + 2,
                                    -180,
                                    180,
                                  ),
                                }
                              : line,
                          ),
                        )
                      }
                      decreaseIcon="moveLeft"
                      increaseIcon="moveRight"
                    />
                    <CompactSliderField
                      label="Label Y"
                      valueText={`${Math.round(
                        Number.isFinite(selectedLine.labelOffsetY)
                          ? selectedLine.labelOffsetY
                          : DEFAULT_LINE_LABEL_OFFSET_Y,
                      )}`}
                      min={-120}
                      max={120}
                      step={1}
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
                      onDecrease={() =>
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? {
                                  ...line,
                                  labelOffsetY: clamp(
                                    (Number.isFinite(line.labelOffsetY)
                                      ? line.labelOffsetY
                                      : DEFAULT_LINE_LABEL_OFFSET_Y) - 2,
                                    -120,
                                    120,
                                  ),
                                }
                              : line,
                          ),
                        )
                      }
                      onIncrease={() =>
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? {
                                  ...line,
                                  labelOffsetY: clamp(
                                    (Number.isFinite(line.labelOffsetY)
                                      ? line.labelOffsetY
                                      : DEFAULT_LINE_LABEL_OFFSET_Y) + 2,
                                    -120,
                                    120,
                                  ),
                                }
                              : line,
                          ),
                        )
                      }
                      decreaseIcon="moveUp"
                      increaseIcon="moveDown"
                    />
                    <CompactSliderField
                      label="Label Opacity"
                      valueText={`${Math.round(
                        (Number.isFinite(selectedLine.labelOpacity)
                          ? selectedLine.labelOpacity
                          : DEFAULT_LABEL_OPACITY) * 100,
                      )}%`}
                      min={20}
                      max={100}
                      step={1}
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
                      onDecrease={() =>
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? {
                                  ...line,
                                  labelOpacity: clamp(
                                    (Number.isFinite(line.labelOpacity)
                                      ? line.labelOpacity
                                      : DEFAULT_LABEL_OPACITY) - 0.05,
                                    0.2,
                                    1,
                                  ),
                                }
                              : line,
                          ),
                        )
                      }
                      onIncrease={() =>
                        setLines((prev) =>
                          prev.map((line) =>
                            line.id === selectedLine.id
                              ? {
                                  ...line,
                                  labelOpacity: clamp(
                                    (Number.isFinite(line.labelOpacity)
                                      ? line.labelOpacity
                                      : DEFAULT_LABEL_OPACITY) + 0.05,
                                    0.2,
                                    1,
                                  ),
                                }
                              : line,
                          ),
                        )
                      }
                    />
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
                        className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-emerald-900`}
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
                        className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-emerald-900`}
                      >
                        Ringkas
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {selectedAngle && selectedAngleMetrics ? (
                <div
                  className={`${SOFT_TINT_CARD_CLASS} px-3 py-3 text-[11px] text-orange-900`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="font-medium text-orange-950">
                      Angle Settings #{selectedAngle.id}
                    </div>
                    <span className="text-[10px] text-orange-700">
                      {selectedAngleMetrics.valueDeg.toFixed(1)}°
                    </span>
                  </div>
                  <div className="text-[10px] text-orange-700">
                    Drag 3 titik angle di canvas. Hasil angle di tengah bisa
                    dibuat transparan tanpa mengubah stroke line.
                  </div>
                  <div className={`${SOFT_SURFACE_CLASS} mt-1.5 px-2 py-1.5`}>
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
                        className={`relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full ${SOFT_RAISED_CLASS}`}
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
                      label="Hasil X"
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
                      label="Hasil Y"
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
                      label="Hasil Opacity"
                      valueText={`${selectedAngleMetrics.resultOpacity}%`}
                      min={8}
                      max={100}
                      step={1}
                      value={selectedAngleMetrics.resultOpacity}
                      onChange={(event) =>
                        updateAngleById(selectedAngle.id, {
                          resultOpacity: Number(event.target.value) / 100,
                        })
                      }
                      onDecrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          resultOpacity: clamp(
                            getAngleResultOpacity(item) - 0.05,
                            0.08,
                            1,
                          ),
                        }))
                      }
                      onIncrease={() =>
                        updateAngleById(selectedAngle.id, (item) => ({
                          ...item,
                          resultOpacity: clamp(
                            getAngleResultOpacity(item) + 0.05,
                            0.08,
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
                          resultOpacity: DEFAULT_LABEL_OPACITY,
                        })
                      }
                      className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-orange-900`}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateAngleById(selectedAngle.id, {
                          labelOffsetX: -38,
                          labelOffsetY: -18,
                          resultOpacity: 0.34,
                        })
                      }
                      className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-orange-900`}
                    >
                      Ringkas
                    </button>
                  </div>
                </div>
              ) : null}
              {selectedHka && selectedHkaMetrics ? (
                <div
                  className={`${SOFT_TINT_CARD_CLASS} px-3 py-3 text-[11px] text-cyan-900`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="font-medium text-cyan-950">
                      HKA Settings #{selectedHka.id}
                    </div>
                    <span className="text-[10px] text-cyan-700">
                      {selectedHkaMetrics.valueDeg !== null
                        ? `${selectedHkaMetrics.valueDeg.toFixed(1)}°`
                        : "-"}
                    </span>
                  </div>
                  <div className="rounded-[16px] border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-[10px] text-cyan-800">
                    <div className="font-semibold text-cyan-950">
                      {selectedHkaMetrics.label}
                    </div>
                    <div className="mt-0.5">
                      Mode jurnal: {selectedHkaMetrics.modeLabel}
                    </div>
                    <div className="mt-0.5">
                      Sisi: {getHkaSideLabel(selectedHkaMetrics.side)}
                    </div>
                    {selectedHkaMetrics.mode === "fta" ? (
                      <>
                        <div className="mt-0.5">
                          FTA:{" "}
                          {selectedHkaMetrics.fta !== null
                            ? `${selectedHkaMetrics.fta.toFixed(2)}°`
                            : "-"}
                        </div>
                        <div className="mt-0.5">
                          Prediksi HKAA:{" "}
                          {selectedHkaMetrics.predictedHka !== null
                            ? `${selectedHkaMetrics.predictedHka.toFixed(2)}°`
                            : "-"}
                        </div>
                      </>
                    ) : (
                      <div className="mt-0.5">
                        Signed coronal:{" "}
                        {selectedHkaMetrics.signedDeg !== null
                          ? `${selectedHkaMetrics.signedDeg.toFixed(2)}°`
                          : "-"}
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 text-[10px] text-cyan-700">
                    {selectedHkaMetrics.mode === "fta"
                      ? "FTA jurnal memakai 4 landmark: Fem2, femoral notch, Tib1 4 cm, dan Tib1 10 cm. Hover atau klik line FTA di canvas untuk melihat nilai ringkas, lalu buka panel ini untuk panduan lengkapnya."
                      : "Sign varus/valgus tetap bisa dipilih manual karena orientasi AP kanan/kiri dapat membingungkan. Label hasil HKA juga bisa di-drag langsung di canvas."}
                  </div>
                  {selectedHkaMetrics.mode === "fta" ? (
                    <div
                      className={`${SOFT_SURFACE_CLASS} mt-1.5 px-3 py-2 text-[10px] text-cyan-900`}
                    >
                      <div className="font-semibold text-cyan-950">
                        Panduan FTA Jurnal
                      </div>
                      <div className="mt-1 space-y-1 text-cyan-800">
                        <div>
                          1. Pilih mode <span className="font-semibold">FTA</span>,
                          lalu taruh 4 landmark berurutan:
                          <span className="font-semibold">
                            {" "}Fem2 proximal, femoral notch, Tib1 4 cm, Tib1 10 cm.
                          </span>
                        </div>
                        <div>
                          2. Garis femur dibentuk dari{" "}
                          <span className="font-semibold">
                            Fem2 ke femoral notch
                          </span>
                          , sedangkan garis tibia dibentuk dari{" "}
                          <span className="font-semibold">
                            Tib1 4 cm ke Tib1 10 cm
                          </span>
                          .
                        </div>
                        <div>
                          3. Sistem menghitung{" "}
                          <span className="font-semibold">FTA</span> dari dua
                          axis itu, lalu memprediksi{" "}
                          <span className="font-semibold">HKAA</span> dengan
                          rumus:
                          <span className="font-semibold">
                            {" "}HKAA = -2.182 + FTA x 0.995
                          </span>
                          .
                        </div>
                        <div>
                          4. Mode ini cocok saat full-length HKA tidak tersedia.
                          Hasilnya adalah{" "}
                          <span className="font-semibold">estimasi alignment</span>,
                          bukan pengganti mechanical axis full standing HKA.
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className={`${SOFT_INSET_CLASS} mt-1.5 px-2 py-1.5`}>
                    <div className="mb-1 text-[10px] font-semibold tracking-wide text-cyan-900 uppercase">
                      Line Color
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {HKA_COLOR_OPTIONS.map((color) => (
                        <ColorSwatchButton
                          key={`hka-line-${color}`}
                          color={color}
                          active={selectedHkaMetrics.lineColor === color}
                          label={`Warna line HKA ${color}`}
                          onClick={() =>
                            updateHkaById(selectedHka.id, {
                              lineColor: color,
                            })
                          }
                        />
                      ))}
                      <label
                        className={`${SOFT_RAISED_CLASS} relative inline-flex h-8 w-8 cursor-pointer items-center justify-center`}
                        title="Custom line color"
                      >
                        <div
                          className="h-[18px] w-[18px] rounded-full border border-white/70"
                          style={{
                            background:
                              "conic-gradient(#f43f5e, #f59e0b, #22c55e, #0ea5e9, #8b5cf6, #f43f5e)",
                          }}
                        />
                        <input
                          type="color"
                          value={selectedHkaMetrics.lineColor}
                          onChange={(event) =>
                            updateHkaById(selectedHka.id, {
                              lineColor: event.target.value,
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
                      valueText={`${selectedHkaMetrics.strokeWidth.toFixed(1)}x`}
                      min={1}
                      max={8}
                      step={0.1}
                      value={selectedHkaMetrics.strokeWidth}
                      onChange={(event) =>
                        updateHkaById(selectedHka.id, {
                          strokeWidth: Number(event.target.value),
                        })
                      }
                      onDecrease={() =>
                        updateHkaById(selectedHka.id, (item) => ({
                          ...item,
                          strokeWidth: clamp(
                            (Number(item.strokeWidth) ||
                              DEFAULT_HKA_STROKE_WIDTH) - 0.2,
                            1,
                            8,
                          ),
                        }))
                      }
                      onIncrease={() =>
                        updateHkaById(selectedHka.id, (item) => ({
                          ...item,
                          strokeWidth: clamp(
                            (Number(item.strokeWidth) ||
                              DEFAULT_HKA_STROKE_WIDTH) + 0.2,
                            1,
                            8,
                          ),
                        }))
                      }
                    />
                  </div>
                  {selectedHkaMetrics.mode === "full" ? (
                    <>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        {[
                          { key: "right", label: "Kaki kanan" },
                          { key: "left", label: "Kaki kiri" },
                        ].map((sideItem) => (
                          <button
                            key={`selected-hka-side-${sideItem.key}`}
                            type="button"
                            onClick={() => updateHkaSideById(selectedHka.id, sideItem.key)}
                            className={`px-2 py-1 text-[10px] font-medium transition ${
                              selectedHkaMetrics.side === sideItem.key
                                ? SOFT_DARK_BUTTON_CLASS
                                : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                            }`}
                          >
                            {sideItem.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateHkaById(selectedHka.id, (item) => ({
                              ...item,
                              direction: "varus",
                            }))
                          }
                          className={`px-2 py-1 text-[10px] font-medium transition ${
                            selectedHkaMetrics.direction === "varus"
                              ? SOFT_DARK_BUTTON_CLASS
                              : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                          }`}
                        >
                          Varus
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateHkaById(selectedHka.id, (item) => ({
                              ...item,
                              direction: "valgus",
                            }))
                          }
                          className={`px-2 py-1 text-[10px] font-medium transition ${
                            selectedHkaMetrics.direction === "valgus"
                              ? SOFT_DARK_BUTTON_CLASS
                              : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                          }`}
                        >
                          Valgus
                        </button>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateHkaById(selectedHka.id, (item) => ({
                              ...item,
                              showArc: item.showArc === false,
                            }))
                          }
                          className={`px-2 py-1 text-[10px] font-medium transition ${
                            selectedHkaMetrics.showArc
                              ? SOFT_DARK_BUTTON_CLASS
                              : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                          }`}
                        >
                          Show Arc
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateHkaById(selectedHka.id, (item) => ({
                              ...item,
                              showArc: false,
                            }))
                          }
                          className={`px-2 py-1 text-[10px] font-medium transition ${
                            !selectedHkaMetrics.showArc
                              ? SOFT_DARK_BUTTON_CLASS
                              : `${SOFT_TEXT_BUTTON_CLASS} text-cyan-900`
                          }`}
                        >
                          Hide Arc
                        </button>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateHkaById(selectedHka.id, {
                              lineColor: DEFAULT_HKA_LINE_COLOR,
                              strokeWidth: DEFAULT_HKA_STROKE_WIDTH,
                              showArc: true,
                            })
                          }
                          className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-cyan-900`}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateHkaById(selectedHka.id, {
                              showArc: false,
                            })
                          }
                          className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-cyan-900`}
                        >
                          Ringkas
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              {measureAnatomyTab === "knee" ? (
                <div
                  className="rounded-[30px] border border-white/80 bg-[#e9eef5] px-3 py-3 text-slate-800 shadow-[12px_12px_26px_rgba(100,116,139,0.24),-8px_-8px_22px_rgba(255,255,255,0.72)]"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-extrabold tracking-wide text-slate-700 uppercase">
                      TKA Planning
                    </span>
                    <span className="rounded-full border border-white/80 bg-[#e9eef5] px-3 py-1.5 text-[11px] font-bold text-rose-500 shadow-[5px_5px_12px_rgba(100,116,139,0.28),-5px_-5px_12px_rgba(255,255,255,0.76)]">
                      {planningGuides.length} guide
                    </span>
                  </div>
                  <div
                    className="rounded-[24px] border border-white/78 bg-[#e9eef5] px-3 py-3 text-[11px] text-slate-700 shadow-[inset_6px_6px_13px_rgba(100,116,139,0.15),inset_-6px_-6px_13px_rgba(255,255,255,0.72)]"
                  >
                    <div className="font-extrabold text-[11px] text-slate-700">
                      Acuan Planning
                    </div>
                    <div
                      className={`mt-1 text-[11px] font-semibold ${
                        selectedLine ? "text-slate-600" : "text-rose-500"
                      }`}
                    >
                      {selectedLine
                        ? `Line #${selectedLine.id} | ${lineTypeLabel(selectedLine.type)}${
                            mmPerPixel !== null
                              ? ` | ${formatMeasurementFromPx(getLineLength(selectedLine))}`
                              : ""
                          }`
                        : "Pilih satu line dulu dari tab Measure."}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-[24px] border border-white/78 bg-[#e9eef5] p-1.5 shadow-[inset_6px_6px_13px_rgba(100,116,139,0.14),inset_-6px_-6px_13px_rgba(255,255,255,0.72)]">
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
                          className={`rounded-[18px] px-2 py-2.5 text-[10px] font-extrabold transition ${
                            isActive
                              ? "border border-[#2a3246] bg-[linear-gradient(180deg,#30394f_0%,#1f2636_100%)] text-white shadow-[inset_3px_3px_7px_rgba(0,0,0,0.25),5px_5px_14px_rgba(51,65,85,0.38)]"
                              : "border border-white/82 bg-[#e9eef5] text-slate-600 shadow-[5px_5px_12px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.74)] hover:text-slate-900"
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedPlanningGuide ? (
                    <div
                      className="mt-3 rounded-[24px] border border-white/78 bg-[#e9eef5] px-3 py-3 text-[11px] text-slate-700 shadow-[8px_8px_18px_rgba(100,116,139,0.20),-6px_-6px_16px_rgba(255,255,255,0.72)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-extrabold text-slate-800">
                          Guide Aktif
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPlanningGuideId(null)}
                          className="rounded-full border border-white/82 bg-[#e9eef5] px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-[4px_4px_9px_rgba(100,116,139,0.20),-4px_-4px_9px_rgba(255,255,255,0.74)]"
                        >
                          Lepas
                        </button>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: selectedPlanningGuideColor,
                          }}
                        />
                        <span className="truncate">
                          {selectedPlanningGuide.kind === "valgusCut"
                            ? `Distal Cut | ${selectedPlanningGuide.side}`
                            : selectedPlanningGuide.kind === "tibialSlope"
                              ? `Tibial Slope | ${selectedPlanningGuide.posteriorSide}`
                              : `Tibial Cut | ${selectedPlanningGuide.direction}`}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        Anchor dan label bisa di-drag langsung di canvas.
                        Gunakan sync bila anchor mau ikut line baru.
                      </div>
                      <div className="mt-1.5 grid gap-1.5">
                        <div className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-2 py-2 shadow-[inset_5px_5px_11px_rgba(100,116,139,0.13),inset_-5px_-5px_11px_rgba(255,255,255,0.72)]">
                          <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                            Line Color
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {PLANNING_GUIDE_COLOR_OPTIONS.map((color) => (
                              <ColorSwatchButton
                                key={color}
                                color={color}
                                active={selectedPlanningGuideColor === color}
                                label={`Warna guide ${color}`}
                                onClick={() =>
                                  setPlanningGuides((prev) =>
                                    prev.map((guide) =>
                                      guide.id === selectedPlanningGuide.id
                                        ? {
                                            ...guide,
                                            color,
                                            customColor: true,
                                          }
                                        : guide,
                                    ),
                                  )
                                }
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setPlanningGuides((prev) =>
                                  prev.map((guide) =>
                                    guide.id === selectedPlanningGuide.id
                                      ? {
                                          ...guide,
                                          color:
                                            getPlanningGuideAutoColor(guide),
                                          customColor: false,
                                        }
                                      : guide,
                                  ),
                                )
                              }
                              className="rounded-full border border-white/82 bg-[#e9eef5] px-2 py-1 text-[10px] font-bold text-slate-600 shadow-[4px_4px_9px_rgba(100,116,139,0.18),-4px_-4px_9px_rgba(255,255,255,0.72)]"
                            >
                              Auto
                            </button>
                          </div>
                        </div>
                        <CompactSliderField
                          label="Stroke"
                          valueText={`${(
                            Number.isFinite(selectedPlanningGuide.strokeWidth)
                              ? selectedPlanningGuide.strokeWidth
                              : DEFAULT_PLANNING_GUIDE_STROKE_WIDTH
                          ).toFixed(1)}x`}
                          min={1}
                          max={8}
                          step={0.1}
                          value={
                            Number.isFinite(selectedPlanningGuide.strokeWidth)
                              ? selectedPlanningGuide.strokeWidth
                              : DEFAULT_PLANNING_GUIDE_STROKE_WIDTH
                          }
                          onChange={(event) =>
                            setPlanningGuides((prev) =>
                              prev.map((guide) =>
                                guide.id === selectedPlanningGuide.id
                                  ? {
                                      ...guide,
                                      strokeWidth: Number(event.target.value),
                                    }
                                  : guide,
                              ),
                            )
                          }
                          onDecrease={() =>
                            setPlanningGuides((prev) =>
                              prev.map((guide) =>
                                guide.id === selectedPlanningGuide.id
                                  ? {
                                      ...guide,
                                      strokeWidth: clamp(
                                        (Number(guide.strokeWidth) ||
                                          DEFAULT_PLANNING_GUIDE_STROKE_WIDTH) -
                                          0.2,
                                        1,
                                        8,
                                      ),
                                    }
                                  : guide,
                              ),
                            )
                          }
                          onIncrease={() =>
                            setPlanningGuides((prev) =>
                              prev.map((guide) =>
                                guide.id === selectedPlanningGuide.id
                                  ? {
                                      ...guide,
                                      strokeWidth: clamp(
                                        (Number(guide.strokeWidth) ||
                                          DEFAULT_PLANNING_GUIDE_STROKE_WIDTH) +
                                          0.2,
                                        1,
                                        8,
                                      ),
                                    }
                                  : guide,
                              ),
                            )
                          }
                        />
                        <CompactSliderField
                          label="Label X"
                          valueText={`${Math.round(planningGuideLabelOffsetX)}`}
                          min={-220}
                          max={220}
                          step={1}
                          value={planningGuideLabelOffsetX}
                          onChange={(event) =>
                            setPlanningGuideLabelOffsetX(
                              Number(event.target.value),
                            )
                          }
                          onDecrease={() =>
                            setPlanningGuideLabelOffsetX((prev) =>
                              clamp(prev - 2, -220, 220),
                            )
                          }
                          onIncrease={() =>
                            setPlanningGuideLabelOffsetX((prev) =>
                              clamp(prev + 2, -220, 220),
                            )
                          }
                          decreaseIcon="moveLeft"
                          increaseIcon="moveRight"
                        />
                        <CompactSliderField
                          label="Label Y"
                          valueText={`${Math.round(planningGuideLabelOffsetY)}`}
                          min={-140}
                          max={140}
                          step={1}
                          value={planningGuideLabelOffsetY}
                          onChange={(event) =>
                            setPlanningGuideLabelOffsetY(
                              Number(event.target.value),
                            )
                          }
                          onDecrease={() =>
                            setPlanningGuideLabelOffsetY((prev) =>
                              clamp(prev - 2, -140, 140),
                            )
                          }
                          onIncrease={() =>
                            setPlanningGuideLabelOffsetY((prev) =>
                              clamp(prev + 2, -140, 140),
                            )
                          }
                          decreaseIcon="moveUp"
                          increaseIcon="moveDown"
                        />
                        <CompactSliderField
                          label="Label Opacity"
                          valueText={`${Math.round(planningGuideLabelOpacity * 100)}%`}
                          min={20}
                          max={100}
                          step={1}
                          value={Math.round(planningGuideLabelOpacity * 100)}
                          onChange={(event) =>
                            setPlanningGuideLabelOpacity(
                              Number(event.target.value) / 100,
                            )
                          }
                          onDecrease={() =>
                            setPlanningGuideLabelOpacity((prev) =>
                              clamp(prev - 0.05, 0.2, 1),
                            )
                          }
                          onIncrease={() =>
                            setPlanningGuideLabelOpacity((prev) =>
                              clamp(prev + 0.05, 0.2, 1),
                            )
                          }
                        />
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
                            className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-amber-900`}
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
                            className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-[10px] text-amber-900`}
                          >
                            Ringkas
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {planningGuideMode === "valgusCut" ? (
                    <div
                      className={`mt-1.5 grid gap-1.5 p-3 text-[11px] text-slate-600 ${SOFT_SURFACE_CLASS} ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
                        />
                      </label>
                      <label>
                        Side
                        <select
                          value={valgusCutSide}
                          onChange={(event) =>
                            setValgusCutSide(event.target.value)
                          }
                          className={`mt-1 w-full ${SOFT_SELECT_CLASS} px-2 py-1`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
                        />
                      </label>
                    </div>
                  ) : null}
                  {planningGuideMode === "tibialSlope" ? (
                    <div
                      className={`mt-1.5 grid gap-1.5 p-3 text-[11px] text-slate-600 ${SOFT_SURFACE_CLASS} ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
                        />
                      </label>
                      <label>
                        Posterior
                        <select
                          value={tibialPosteriorSide}
                          onChange={(event) =>
                            setTibialPosteriorSide(event.target.value)
                          }
                          className={`mt-1 w-full ${SOFT_SELECT_CLASS} px-2 py-1`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
                        />
                      </label>
                    </div>
                  ) : null}
                  {planningGuideMode === "tibialCut" ? (
                    <div
                      className={`mt-1.5 grid gap-1.5 p-3 text-[11px] text-slate-600 ${SOFT_SURFACE_CLASS} ${isRightSidebarNarrow ? "grid-cols-1" : "grid-cols-2"}`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
                        />
                      </label>
                      <label>
                        Direction
                        <select
                          value={tibialCutDirection}
                          onChange={(event) =>
                            setTibialCutDirection(event.target.value)
                          }
                          className={`mt-1 w-full ${SOFT_SELECT_CLASS} px-2 py-1`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
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
                          className={`mt-1 w-full ${SOFT_INPUT_CLASS} px-2 py-1`}
                        />
                      </label>
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {selectedPlanningGuide ? (
                      <>
                        <button
                          type="button"
                          onClick={() => updateSelectedPlanningGuide()}
                          className="rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,#ff7770_0%,#fb5f58_100%)] px-3 py-2.5 text-xs font-extrabold text-white shadow-[6px_6px_14px_rgba(248,113,113,0.25),-5px_-5px_12px_rgba(255,255,255,0.68)] transition disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Update Guide
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedPlanningGuide({ syncLine: true })
                          }
                          disabled={!selectedLine}
                          className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-3 py-2.5 text-xs font-extrabold text-slate-600 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)] transition disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Sync dari Line
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={addPlanningGuideFromSelectedLine}
                        disabled={!selectedLine}
                        className="rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,#ff7770_0%,#fb5f58_100%)] px-3 py-2.5 text-xs font-extrabold text-white shadow-[6px_6px_14px_rgba(248,113,113,0.25),-5px_-5px_12px_rgba(255,255,255,0.68)] transition disabled:cursor-not-allowed disabled:opacity-45"
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
                      className="rounded-[18px] border border-white/82 bg-[#e9eef5] px-3 py-2.5 text-xs font-extrabold text-slate-500 shadow-[6px_6px_14px_rgba(100,116,139,0.22),-5px_-5px_12px_rgba(255,255,255,0.72)] transition disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Clear Guide
                    </button>
                  </div>
                  <div
                    className="mt-3 max-h-40 overflow-y-auto rounded-[24px] border border-white/78 bg-[#e9eef5] px-3 py-2 text-[11px] text-slate-700 shadow-[8px_8px_18px_rgba(100,116,139,0.18),-6px_-6px_16px_rgba(255,255,255,0.72)]"
                  >
                    {planningGuideRows.length === 0 ? (
                      <p className="text-slate-500">Belum ada planning guide.</p>
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
                            const guideColor =
                              guide?.color || getPlanningGuideAutoColor(guide);
                            return (
                              <motion.div
                                layout
                                key={row.id}
                                className={`rounded-[18px] border border-white/78 bg-[#e9eef5] px-2 py-2 shadow-[5px_5px_12px_rgba(100,116,139,0.16),-5px_-5px_12px_rgba(255,255,255,0.72)] ${
                                  isGuideSelected ? "scale-[1.01]" : ""
                                }`}
                                style={{
                                  borderColor: isGuideSelected
                                    ? `${guideColor}88`
                                    : `${guideColor}44`,
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      selectPlanningGuideForEdit(row.id)
                                    }
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="flex items-center gap-1.5 truncate font-extrabold text-slate-700">
                                      <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: guideColor }}
                                      />
                                      <span className="truncate">
                                        {row.label}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {row.meta}
                                    </div>
                                  </button>
                                  <div className="flex shrink-0 gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        togglePlanningGuideHidden(row.id)
                                      }
                                      className="rounded-full border border-white/82 bg-[#e9eef5] px-2 py-1 text-[10px] font-bold text-slate-600 shadow-[4px_4px_9px_rgba(100,116,139,0.18),-4px_-4px_9px_rgba(255,255,255,0.72)]"
                                    >
                                      {guide?.hidden ? "Show" : "Hide"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removePlanningGuide(row.id)
                                      }
                                      className="rounded-full border border-white/82 bg-[#e9eef5] px-2 py-1 text-[10px] font-bold text-rose-600 shadow-[4px_4px_9px_rgba(100,116,139,0.18),-4px_-4px_9px_rgba(255,255,255,0.72)]"
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
                <div
                  className={`${SOFT_TINT_CARD_CLASS} px-3 py-3 text-[11px] text-slate-700`}
                >
                  <div className="mb-1 font-medium text-violet-800">
                    {selectedCircle.source === "centerFinder"
                      ? "Adjust Center Finder"
                      : "Adjust Circle Diameter"}
                  </div>
                  <div className="mb-1 text-[10px] text-violet-700">
                    Hover di desktop atau pilih circle di mobile untuk melihat
                    info diameter lengkap.
                  </div>
                  <CompactSliderField
                    label="Stroke Width"
                    valueText={`${(
                      Number.isFinite(selectedCircle.strokeWidth)
                        ? selectedCircle.strokeWidth
                        : DEFAULT_CIRCLE_STROKE_WIDTH
                    ).toFixed(1)}x`}
                    min={1}
                    max={8}
                    step={0.1}
                    value={
                      Number.isFinite(selectedCircle.strokeWidth)
                        ? selectedCircle.strokeWidth
                        : DEFAULT_CIRCLE_STROKE_WIDTH
                    }
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setCircles((prev) =>
                        prev.map((item) =>
                          item.id === selectedCircle.id
                            ? { ...item, strokeWidth: nextValue }
                            : item,
                        ),
                      );
                    }}
                    onDecrease={() =>
                      setCircles((prev) =>
                        prev.map((item) =>
                          item.id === selectedCircle.id
                            ? {
                                ...item,
                                strokeWidth: clamp(
                                  (Number(item.strokeWidth) ||
                                    DEFAULT_CIRCLE_STROKE_WIDTH) - 0.2,
                                  1,
                                  8,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    onIncrease={() =>
                      setCircles((prev) =>
                        prev.map((item) =>
                          item.id === selectedCircle.id
                            ? {
                                ...item,
                                strokeWidth: clamp(
                                  (Number(item.strokeWidth) ||
                                    DEFAULT_CIRCLE_STROKE_WIDTH) + 0.2,
                                  1,
                                  8,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                  />
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
                  <CompactSliderField
                    label="Diameter"
                    valueText={
                      mmPerPixel !== null
                        ? `${
                            measurementUnit === "cm"
                              ? (
                                  (selectedCircle.radius * 2 * mmPerPixel) /
                                  10
                                ).toFixed(2)
                              : (
                                  selectedCircle.radius *
                                  2 *
                                  mmPerPixel
                                ).toFixed(2)
                          } ${measurementUnit}`
                        : `${Math.round(selectedCircle.radius * 2)}`
                    }
                    min={6}
                    max={Math.max(10, Math.max(modelWidth, modelHeight) * 1.5)}
                    step={0.5}
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
                    onDecrease={() =>
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
                    onIncrease={() =>
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
                    decreaseIcon="zoomOut"
                    increaseIcon="zoomIn"
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
                      className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-xs text-violet-800`}
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
                      className={`${SOFT_TEXT_BUTTON_CLASS} px-2 py-1 text-xs text-violet-800`}
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
                <div
                  className={`${SOFT_TINT_CARD_CLASS} px-3 py-3 text-[11px] text-rose-900`}
                >
                  <div className="mb-1 font-medium text-rose-950">
                    Hip Summary
                  </div>
                  <div>Femoral Offset: {legPackageSummary.femoralMean}</div>
                  <div>Global Offset: {legPackageSummary.globalMean}</div>
                  <div>LLD: {legPackageSummary.lldDelta}</div>
                  <HipFunctionSummaryPanel
                    className="mt-2"
                    compact
                    title="Apa fungsinya?"
                  />
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
              className={SOFT_SECTION_CLASS}
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
                <div className={`${SOFT_SURFACE_CLASS} px-2 py-1`}>
                  Measure: {measurementRows.length}
                </div>
                <div className={`${SOFT_SURFACE_CLASS} px-2 py-1`}>
                  Layer: {cutLayers.length}
                </div>
                <div className={`${SOFT_SURFACE_CLASS} px-2 py-1`}>
                  Step: {planSteps.length}
                </div>
              </div>
              <div
                className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-[11px] text-slate-700`}
              >
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
                className={`min-h-20 w-full resize-y ${SOFT_INPUT_CLASS}`}
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={addPlanningStep}
                  disabled={!image}
                  className={`${SOFT_PRESSED_CLASS} px-3 py-2 text-xs font-medium text-amber-700 disabled:cursor-not-allowed disabled:opacity-45`}
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
                  className={`${SOFT_TEXT_BUTTON_CLASS} px-3 py-2 text-xs text-amber-900 disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  Clear Step
                </button>
              </div>
              <div
                className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-[11px] text-amber-900`}
              >
                <div className="mb-1 font-medium text-amber-950">
                  Ringkasan Snapshot
                </div>
                <div>Measure: {measurementRows.length}</div>
                <div>Layer: {cutLayers.length}</div>
                <div>Step: {planSteps.length}</div>
              </div>
              <div
                className={`${SOFT_SURFACE_CLASS} px-3 py-2 text-[11px] text-amber-900`}
              >
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
              <div
                className={`max-h-32 overflow-y-auto ${SOFT_SURFACE_CLASS} px-3 py-2 text-[11px] text-amber-900`}
              >
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
          className={`order-1 min-h-0 overflow-hidden p-0 lg:order-2 lg:p-2 ${SOFT_PANEL_CLASS}`}
        >
          <div
            className={`grid gap-0 lg:gap-2 ${compareMode ? "lg:grid-cols-2" : "grid-cols-1"}`}
          >
            <div
              ref={containerRef}
              className="relative h-[calc(100dvh-108px)] min-h-[460px] w-full overflow-hidden bg-slate-950/95 sm:h-[70vh] sm:min-h-[420px] sm:rounded-lg sm:border sm:border-slate-300 lg:h-[calc(100vh-156px)]"
            >
              {selectedCutLayer &&
              selectedLayerToolbarAnchor &&
              !(
                selectedCutLayer.kind === "free-line" &&
                selectedFreeLinePointIndex !== null
              ) ? (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={PANEL_SPRING}
                  className="absolute z-30"
                  style={{
                    left: selectedLayerToolbarAnchor.centerX,
                    top: selectedLayerToolbarAnchor.topY,
                    transform: "translateX(-50%)",
                  }}
                >
                  {isMobileViewport ? (
                    <div className="max-w-[calc(100vw-20px)]">
                      <div
                        className={`flex items-center gap-1 rounded-full px-1.5 py-1 ${SOFT_FLOAT_SURFACE_CLASS} text-slate-700`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            isSimpleUiMode
                              ? openSimpleLayerDropdown(selectedCutLayer.id)
                              : openLayerSettingsModal(selectedCutLayer.id)
                          }
                          className={`flex min-w-0 items-center py-1 pl-1.5 text-left transition ${SOFT_INSET_CLASS} ${
                            showLayerToolbarName ? "gap-1.5 pr-2" : "pr-1.5"
                          }`}
                          aria-label="Buka pengaturan layer"
                          title="Buka pengaturan layer"
                        >
                          <span
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 ${SOFT_RAISED_CLASS}`}
                          >
                            <Bone className="h-4 w-4" strokeWidth={2.1} />
                          </span>
                          {showLayerToolbarName ? (
                            <span className="max-w-[84px] truncate text-[9px] leading-none font-semibold text-slate-700">
                              {selectedCutLayerIds.length > 1
                                ? `${selectedCutLayerIds.length} Layers`
                                : selectedCutLayer.name ||
                                  `Layer #${selectedCutLayer.id}`}
                            </span>
                          ) : null}
                        </button>
                        <LayerToolbarActionButton
                          icon={showLayerToolbarName ? "eyeOff" : "eye"}
                          label={
                            showLayerToolbarName
                              ? "Sembunyikan nama layer"
                              : "Tampilkan nama layer"
                          }
                          onClick={() =>
                            setShowLayerToolbarName((prev) => !prev)
                          }
                          active={!showLayerToolbarName}
                        />
                        <LayerToolbarActionButton
                          icon="settings"
                          label="Buka layer settings"
                          onClick={() =>
                            isSimpleUiMode
                              ? openSimpleLayerDropdown(selectedCutLayer.id)
                              : openLayerSettingsModal(selectedCutLayer.id)
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex max-w-[calc(100vw-28px)] items-center gap-1 rounded-full px-2 py-1.5 ${SOFT_FLOAT_SURFACE_CLASS} text-slate-700`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          isSimpleUiMode
                            ? openSimpleLayerDropdown(selectedCutLayer.id)
                            : openLayerSettingsModal(selectedCutLayer.id)
                        }
                        className={`mr-1 flex min-w-0 items-center py-1 pl-1.5 text-left transition ${SOFT_INSET_CLASS} ${
                          showLayerToolbarName ? "gap-2 pr-2" : "pr-1.5"
                        }`}
                        aria-label="Buka pengaturan layer"
                        title="Buka pengaturan layer"
                      >
                        <span
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 ${SOFT_RAISED_CLASS}`}
                        >
                          <Bone className="h-4 w-4" strokeWidth={2.1} />
                        </span>
                        {showLayerToolbarName ? (
                          <span className="max-w-[100px] truncate text-[10px] font-semibold text-slate-700">
                            {selectedCutLayerIds.length > 1
                              ? `${selectedCutLayerIds.length} Layers`
                              : selectedCutLayer.name ||
                                `Layer #${selectedCutLayer.id}`}
                          </span>
                        ) : null}
                      </button>
                      <LayerToolbarActionButton
                        icon={showLayerToolbarName ? "eyeOff" : "eye"}
                        label={
                          showLayerToolbarName
                            ? "Sembunyikan nama layer"
                            : "Tampilkan nama layer"
                        }
                        onClick={() => setShowLayerToolbarName((prev) => !prev)}
                        active={!showLayerToolbarName}
                      />
                      <LayerToolbarActionButton
                        icon={selectedCutLayer.lockScale ? "lock" : "unlock"}
                        label={
                          selectedCutLayer.lockScale
                            ? "Unlock layer"
                            : "Lock layer"
                        }
                        onClick={() =>
                          updateLayerById(selectedCutLayer.id, (item) => ({
                            ...item,
                            lockScale: !item.lockScale,
                          }))
                        }
                        active={selectedCutLayer.lockScale}
                      />
                      <LayerToolbarActionButton
                        icon="plus"
                        label="Duplicate layer"
                        onClick={duplicateSelectedCutLayer}
                      />
                      <LayerToolbarActionButton
                        icon="trash"
                        label="Hapus layer"
                        onClick={removeSelectedCutLayer}
                        className="text-rose-600"
                      />
                      <LayerToolbarActionButton
                        icon="settings"
                        label="Buka layer settings"
                        onClick={() =>
                          isSimpleUiMode
                            ? openSimpleLayerDropdown(selectedCutLayer.id)
                            : openLayerSettingsModal(selectedCutLayer.id)
                        }
                      />
                    </div>
                  )}
                </motion.div>
              ) : null}
              {selectedCutLayer?.kind === "free-line" &&
              selectedFreeLinePointIndex !== null &&
              selectedFreeLinePointAnchor ? (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={PANEL_SPRING}
                  className="absolute z-30"
                  style={{
                    left: selectedFreeLinePointAnchor.centerX,
                    top: selectedFreeLinePointAnchor.topY,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 ${SOFT_FLOAT_SURFACE_CLASS} text-slate-700`}
                  >
                    <span
                      className={`${SOFT_INSET_CLASS} px-2.5 py-1 text-[10px] font-semibold text-slate-600`}
                    >
                      P{selectedFreeLinePointIndex + 1}
                    </span>
                    <div
                      className={`flex items-center gap-1 rounded-full px-1 py-0.5 ${SOFT_INSET_CLASS}`}
                    >
                      <LayerToolbarActionButton
                        icon="minus"
                        label="Kurangi rounded point"
                        onClick={() => adjustSelectedFreeLinePointRound(-8)}
                      />
                      <span className="min-w-[44px] text-center text-[10px] font-semibold text-slate-600">
                        {selectedFreeLineCurveRadius ?? "-"}
                      </span>
                      <LayerToolbarActionButton
                        icon="plus"
                        label="Tambah rounded point"
                        onClick={() => adjustSelectedFreeLinePointRound(8)}
                      />
                    </div>
                    <LayerToolbarActionButton
                      icon="plus"
                      label="Tambah point setelah titik aktif"
                      onClick={insertFreeLinePointAfterSelection}
                    />
                    <LayerToolbarActionButton
                      icon="trash"
                      label="Hapus point aktif"
                      onClick={deleteSelectedFreeLinePoint}
                      className="text-rose-600"
                    />
                  </div>
                </motion.div>
              ) : null}
              {isMobileViewport && selectedLine ? (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={PANEL_SPRING}
                  className="absolute top-2 left-2 z-30"
                >
                  <div
                    className={`flex items-center gap-1 rounded-full px-1.5 py-1 ${SOFT_FLOAT_SURFACE_CLASS} text-slate-700`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMobilePanelMode("workspace");
                        setActiveRightPanel("measure");
                        setMobileControlsOpen(true);
                      }}
                      className={`${SOFT_INSET_CLASS} px-2 py-1 text-[10px] font-semibold text-slate-700 transition`}
                      aria-label="Buka pengaturan line"
                      title="Buka pengaturan line"
                    >
                      Line
                    </button>
                    <LayerToolbarActionButton
                      icon={isSelectedLineLocked ? "unlock" : "lock"}
                      label={isSelectedLineLocked ? "Unlock line" : "Lock line"}
                      onClick={toggleSelectedLineLock}
                      active={isSelectedLineLocked}
                    />
                    <LayerToolbarActionButton
                      icon="trash"
                      label="Hapus line"
                      onClick={removeSelectedLine}
                      className="text-rose-600"
                    />
                    <LayerToolbarActionButton
                      icon="close"
                      label="Tutup seleksi"
                      onClick={clearActiveCanvasSelection}
                    />
                  </div>
                </motion.div>
              ) : null}
              {shouldShowCanvasCalibrationPrompt ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={
                    isMobileViewport ? MOBILE_PANEL_TRANSITION : PANEL_SPRING
                  }
                  className={`absolute z-30 ${
                    isMobileViewport
                      ? "right-2 bottom-[calc(env(safe-area-inset-bottom)+94px)] left-2"
                      : "top-3 left-3 max-w-sm"
                  }`}
                >
                  <div className="rounded-[22px] border border-cyan-300/90 bg-[linear-gradient(180deg,rgba(236,254,255,0.96)_0%,rgba(219,234,254,0.92)_100%)] px-3 py-3 text-slate-900 shadow-[0_12px_28px_rgba(34,211,238,0.18)] backdrop-blur">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                        <BadgeCheck className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold tracking-wide text-cyan-800 uppercase">
                          Kalibrasi Diperlukan
                        </div>
                        <div className="mt-1 text-[12px] leading-5 text-slate-800">
                          {canvasCalibrationPromptText}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              isSimpleUiMode
                                ? openSimpleCalibrationModal(
                                    canvasCalibrationPromptText,
                                  )
                                : focusCalibrationStep(
                                    canvasCalibrationPromptText,
                                  )
                            }
                            className="inline-flex items-center gap-1 rounded-[16px] border border-cyan-300 bg-[linear-gradient(180deg,#d9fbff_0%,#bff5f6_100%)] px-3 py-2 text-[11px] font-semibold text-cyan-950 shadow-[0_8px_18px_rgba(34,211,238,0.16)]"
                          >
                            <Target className="h-3.5 w-3.5" strokeWidth={2.2} />
                            <span>Buka Kalibrasi</span>
                          </button>
                          {!isMobileViewport ? (
                            <span className="inline-flex items-center text-[11px] text-cyan-800">
                              Menu kiri akan ditampilkan otomatis.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
              {isSimpleUiMode ? (
                <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
                  {simpleQuickPanelMinimized ? (
                    <button
                      type="button"
                      onClick={() => setSimpleQuickPanelMinimized(false)}
                      className="pointer-events-auto absolute top-3 left-3 inline-flex items-center gap-2 rounded-[18px] border border-white/75 bg-[#eef2f7]/95 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-600 shadow-[3px_3px_8px_rgba(148,163,184,0.28),-3px_-3px_8px_rgba(255,255,255,0.76)] backdrop-blur-xl"
                      title="Buka Quick Panel"
                    >
                      <Icon name="menu" className="h-3.5 w-3.5" />
                      <span>Quick</span>
                    </button>
                  ) : (
                    <QuickPanel
                      className="pointer-events-auto absolute top-3 left-3 max-h-[calc(100vh-180px)] overflow-y-auto backdrop-blur-xl"
                      statusLabel={hasCalibration ? "Ready" : "Calib"}
                      workflowStep={workflowStep}
                      workflowMax={4}
                      measurementCount={measurementEntityCount}
                      activeTool={tool}
                      onMinimize={() => setSimpleQuickPanelMinimized(true)}
                      onUpload={() => mainUploadInputRef.current?.click()}
                      onCalibration={() => openSimpleCalibrationModal()}
                      onCreateLayer={() =>
                        createEmptyFreeLineLayer(freeLineMode)
                      }
                      canCreateLayer={Boolean(image && modelWidth && modelHeight)}
                      onGuide={() => setSimpleGuideModalOpen(true)}
                      onMove={() => handleToolChange("pan")}
                      onOpenTka={() => openSimplePlanningModal("tka")}
                      onOpenHip={() => openSimplePlanningModal("hip")}
                      onHistory={undoHistory}
                      canHistory={historyState.undo > 0}
                      onReset={() => resetWorkspaceState()}
                      implantItems={LOCAL_IMPLANT_LIBRARY}
                      selectedImplantType={selectedImplantType}
                      selectedImplantItemId={selectedImplantLibraryId}
                      onSelectImplantType={setSelectedImplantType}
                      onSelectImplantItemId={setSelectedImplantLibraryId}
                      onUseSelectedImplant={useSelectedImplantLibraryAsLayer}
                      implantDisabled={!image || !modelWidth || !modelHeight}
                      implantInstruction={implantLibraryScaleInstruction}
                    />
                  )}

                  {simpleToolPanelMinimized ? (
                    <button
                      type="button"
                      onClick={() => setSimpleToolPanelMinimized(false)}
                      className="pointer-events-auto absolute top-1/2 right-4 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-white/75 bg-[#eef2f7]/95 p-3 text-slate-600 shadow-[3px_3px_8px_rgba(148,163,184,0.28),-3px_-3px_8px_rgba(255,255,255,0.76)] backdrop-blur-xl"
                      title="Buka panel ikon"
                    >
                      <Icon name="menu" className="h-4 w-4" />
                    </button>
                  ) : (
                    <PanelActions
                      className="pointer-events-auto absolute top-1/2 right-4 max-h-[calc(100vh-190px)] -translate-y-1/2 overflow-y-auto backdrop-blur-xl"
                      tools={simpleToolMenuItems}
                      activeTool={tool}
                      activeFreeLineMode={freeLineMode}
                      onMinimize={() => setSimpleToolPanelMinimized(true)}
                      onSelectTool={(item) =>
                        item.freeLineMode
                          ? activateFreeLineMode(item.freeLineMode)
                          : handleToolChange(item.key)
                      }
                      onUndo={undoHistory}
                      onRedo={redoHistory}
                      canUndo={historyState.undo > 0}
                      canRedo={historyState.redo > 0}
                    />
                  )}

                  <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-[22px] border border-white/75 bg-[#eef2f7]/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-[3px_3px_8px_rgba(148,163,184,0.28),-3px_-3px_8px_rgba(255,255,255,0.76)] backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => zoomBy(1 / 1.15)}
                      className="rounded-2xl border border-white/70 bg-[#eef2f7] px-3 py-2 shadow-[3px_3px_8px_rgba(148,163,184,0.32),-3px_-3px_8px_rgba(255,255,255,0.8)]"
                    >
                      Zoom {(view.scale * 100).toFixed(0)}%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolChange("pan")}
                      className="rounded-2xl border border-white/70 bg-[#eef2f7] px-3 py-2 shadow-[3px_3px_8px_rgba(148,163,184,0.32),-3px_-3px_8px_rgba(255,255,255,0.8)]"
                    >
                      {activeToolLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => openSimpleCalibrationModal()}
                      className="rounded-2xl border border-white/70 bg-[#eef2f7] px-3 py-2 shadow-[3px_3px_8px_rgba(148,163,184,0.32),-3px_-3px_8px_rgba(255,255,255,0.8)]"
                    >
                      {hasCalibration ? measurementUnit : "uncalibrated"}
                    </button>
                    <button
                      type="button"
                      onClick={undoHistory}
                      disabled={historyState.undo < 1}
                      className="rounded-2xl border border-white/70 bg-[#eef2f7] px-3 py-2 shadow-[3px_3px_8px_rgba(148,163,184,0.32),-3px_-3px_8px_rgba(255,255,255,0.8)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => resetWorkspaceState()}
                      className="rounded-2xl border border-white/70 bg-[#eef2f7] px-3 py-2 text-rose-600 shadow-[3px_3px_8px_rgba(148,163,184,0.32),-3px_-3px_8px_rgba(255,255,255,0.8)]"
                      title="Reset workspace tanpa menghapus gambar utama"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ) : null}
              <AnimatePresence>
                {isSimpleUiMode && isMobileViewport && simpleMobilePanel ? (
                  <motion.div
                    key={`simple-mobile-panel-${simpleMobilePanel}`}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.98 }}
                    transition={MOBILE_PANEL_TRANSITION}
                    className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+82px)] z-40 lg:hidden"
                  >
                    {simpleMobilePanel === "quick" ? (
                      <QuickPanel
                        className="mx-auto max-h-[min(66vh,560px)] overflow-y-auto backdrop-blur-xl"
                        statusLabel={hasCalibration ? "Ready" : "Calib"}
                        workflowStep={workflowStep}
                        workflowMax={4}
                        measurementCount={measurementEntityCount}
                        activeTool={tool}
                        onMinimize={() => setSimpleMobilePanel(null)}
                        onUpload={() => {
                          setSimpleMobilePanel(null);
                          mainUploadInputRef.current?.click();
                        }}
                        onCalibration={() => {
                          setSimpleMobilePanel(null);
                          openSimpleCalibrationModal();
                        }}
                        onCreateLayer={() => {
                          setSimpleMobilePanel(null);
                          createEmptyFreeLineLayer(freeLineMode);
                        }}
                        canCreateLayer={Boolean(image && modelWidth && modelHeight)}
                        onGuide={() => {
                          setSimpleMobilePanel(null);
                          setSimpleGuideModalOpen(true);
                        }}
                        onMove={() => {
                          setSimpleMobilePanel(null);
                          handleToolChange("pan");
                        }}
                        onOpenTka={() => {
                          setSimpleMobilePanel(null);
                          openSimplePlanningModal("tka");
                        }}
                        onOpenHip={() => {
                          setSimpleMobilePanel(null);
                          openSimplePlanningModal("hip");
                        }}
                        onHistory={() => {
                          setSimpleMobilePanel(null);
                          undoHistory();
                        }}
                        canHistory={historyState.undo > 0}
                        onReset={() => {
                          setSimpleMobilePanel(null);
                          resetWorkspaceState();
                        }}
                        implantItems={LOCAL_IMPLANT_LIBRARY}
                        selectedImplantType={selectedImplantType}
                        selectedImplantItemId={selectedImplantLibraryId}
                        onSelectImplantType={setSelectedImplantType}
                        onSelectImplantItemId={setSelectedImplantLibraryId}
                        onUseSelectedImplant={(...args) => {
                          setSimpleMobilePanel(null);
                          useSelectedImplantLibraryAsLayer(...args);
                        }}
                        implantDisabled={!image || !modelWidth || !modelHeight}
                        implantInstruction={implantLibraryScaleInstruction}
                      />
                    ) : simpleMobilePanel === "tools" ? (
                      <PanelActions
                        className="mx-auto max-h-[min(66vh,560px)] overflow-y-auto backdrop-blur-xl"
                        tools={simpleToolMenuItems}
                        activeTool={tool}
                        activeFreeLineMode={freeLineMode}
                        onMinimize={() => setSimpleMobilePanel(null)}
                        onSelectTool={(item) => {
                          setSimpleMobilePanel(null);
                          if (item.freeLineMode) {
                            activateFreeLineMode(item.freeLineMode);
                            return;
                          }
                          handleToolChange(item.key);
                        }}
                        onUndo={() => {
                          setSimpleMobilePanel(null);
                          undoHistory();
                        }}
                        onRedo={() => {
                          setSimpleMobilePanel(null);
                          redoHistory();
                        }}
                        canUndo={historyState.undo > 0}
                        canRedo={historyState.redo > 0}
                      />
                    ) : (
                      <div className="mx-auto w-[min(92vw,360px)] rounded-[30px] border border-white/75 bg-[#eef2f7]/96 p-4 text-slate-800 shadow-[5px_5px_14px_rgba(148,163,184,0.34),-5px_-5px_14px_rgba(255,255,255,0.78)] backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-300/20 pb-3">
                          <div>
                            <h2 className="text-xs font-black tracking-wider uppercase">
                              Planning
                            </h2>
                            <p className="mt-0.5 text-[9px] font-extrabold text-slate-400 uppercase">
                              TKA / HIP / Guide
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSimpleMobilePanel(null)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-[#eef2f7] text-slate-500 shadow-[2px_2px_6px_rgba(148,163,184,0.28),-2px_-2px_6px_rgba(255,255,255,0.78)]"
                            aria-label="Tutup planning mobile"
                            title="Tutup"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSimpleMobilePanel(null);
                              openSimplePlanningModal("tka");
                            }}
                            className="rounded-[20px] border border-white/70 bg-[#eef2f7] px-3 py-4 text-xs font-black text-slate-700 shadow-[3px_3px_8px_rgba(148,163,184,0.28),-3px_-3px_8px_rgba(255,255,255,0.78)]"
                          >
                            TKA
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSimpleMobilePanel(null);
                              openSimplePlanningModal("hip");
                            }}
                            className="rounded-[20px] border border-white/70 bg-[#eef2f7] px-3 py-4 text-xs font-black text-slate-700 shadow-[3px_3px_8px_rgba(148,163,184,0.28),-3px_-3px_8px_rgba(255,255,255,0.78)]"
                          >
                            HIP
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSimpleMobilePanel(null);
                              setSimpleGuideModalOpen(true);
                            }}
                            className="rounded-[20px] border border-white/70 bg-[#eef2f7] px-3 py-4 text-xs font-black text-slate-700 shadow-[3px_3px_8px_rgba(148,163,184,0.28),-3px_-3px_8px_rgba(255,255,255,0.78)]"
                          >
                            Guide
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSimpleMobilePanel(null);
                              handleToolChange("hkaAuto");
                            }}
                            className="rounded-[20px] border border-white/70 bg-[#eef2f7] px-3 py-4 text-xs font-black text-slate-700 shadow-[3px_3px_8px_rgba(148,163,184,0.28),-3px_-3px_8px_rgba(255,255,255,0.78)]"
                          >
                            HKA
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <MobileNavigation
                className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-20 px-2 lg:hidden"
                tabs={mobileNavigationTabs}
                activeTool={mobileNavigationActiveTool}
                activeToolLabel={`Tool aktif: ${activeToolLabel}`}
                onPan={() => {
                  setSimpleMobilePanel(null);
                  handleToolChange("pan");
                }}
                onDraw={() => {
                  setSimpleMobilePanel(null);
                  handleToolChange("draw");
                }}
                onTools={() => {
                  if (isSimpleUiMode) {
                    setSimpleMobilePanel((prev) =>
                      prev === "tools" ? null : "tools",
                    );
                    return;
                  }
                  setMobilePanelMode("workspace");
                  setActiveRightPanel("tool");
                  setMobileControlsOpen(true);
                }}
              />
              <div
                className={`absolute top-2 right-2 z-20 flex gap-1.5 p-1 sm:top-3 sm:right-3 lg:top-auto lg:right-3 lg:bottom-3 ${SOFT_FLOAT_SURFACE_CLASS}`}
              >
                <motion.button
                  type="button"
                  onClick={() => zoomBy(1.15)}
                  onPointerDown={() => triggerMobileHaptic()}
                  whileHover={BUTTON_HOVER}
                  whileTap={BUTTON_TAP}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className={`inline-flex h-7 w-7 items-center justify-center transition ${SOFT_RAISED_CLASS} text-rose-500`}
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" strokeWidth={2} />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => zoomBy(1 / 1.15)}
                  onPointerDown={() => triggerMobileHaptic()}
                  whileHover={BUTTON_HOVER}
                  whileTap={BUTTON_TAP}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className={`inline-flex h-7 w-7 items-center justify-center transition ${SOFT_RAISED_CLASS} text-rose-500`}
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" strokeWidth={2} />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={fitImageToViewport}
                  onPointerDown={() => triggerMobileHaptic()}
                  whileHover={BUTTON_HOVER}
                  whileTap={BUTTON_TAP}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className={`inline-flex h-7 w-7 items-center justify-center transition ${SOFT_RAISED_CLASS} text-rose-500`}
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
                        interactionRef.current.mode === "move-hka-label" ||
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
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerLeave}
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
            <span className={`${SOFT_RAISED_CLASS} px-2 py-1`}>
              Zoom {(view.scale * 100).toFixed(0)}%
            </span>
            <span className={`${SOFT_RAISED_CLASS} px-2 py-1`}>
              {activeToolLabel}
            </span>
            <span className={`${SOFT_RAISED_CLASS} px-2 py-1`}>
              {hasCalibration ? measurementUnit : "uncalibrated"}
            </span>
            <span className={`${SOFT_RAISED_CLASS} px-2 py-1`}>
              Calib: {calibrationMode === "line" ? "Line" : "Zoom%"}
            </span>
            <span className={`${SOFT_RAISED_CLASS} px-2 py-1`}>History</span>
            {compareMode ? (
              <span className={`${SOFT_RAISED_CLASS} px-2 py-1 text-cyan-700`}>
                Compare ON
              </span>
            ) : null}
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
