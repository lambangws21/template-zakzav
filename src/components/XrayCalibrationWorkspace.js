"use client";

import { ID, Query } from "appwrite";
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
  Package,
  PencilLine,
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
import TemplateStoragePicker from "./TemplateStoragePicker";

const MIN_SCALE = 0.1;
const MAX_SCALE = 12;
const STORY_STORAGE_KEY = "xray_workspace_story_v1";
const TEMPLATE_LIBRARY_KEY = "xray_template_library_v1";
const DEFAULT_TEMPLATE_LAYER_OPACITY = 0.55;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function loadImageFromSrc(rawSrc) {
  return new Promise((resolve, reject) => {
    const src = buildDriveImageCandidates(rawSrc)[0] || rawSrc;
    const canTryAnonymous =
      typeof src === "string" && !src.startsWith("data:") && !src.startsWith("blob:");
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
    reader.onerror = () => reject(reader.error || new Error("Gagal membaca file."));
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

function getTemplateKey(template) {
  const safeName = String(template?.name || "").trim().toLowerCase();
  const safeSrc =
    typeof template?.imageSrc === "string" ? template.imageSrc.slice(0, 120) : "";
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

function getLayerDisplaySize(layer) {
  return {
    width: layer.displayWidth || layer.sourceWidth,
    height: layer.displayHeight || layer.sourceHeight,
  };
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

function drawTag(ctx, x, y, text, color) {
  ctx.font = "12px Inter, sans-serif";
  const paddingX = 6;
  const paddingY = 4;
  const textMetrics = ctx.measureText(text);
  const width = textMetrics.width + paddingX * 2;
  const height = 20;

  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.fillText(text, x - width / 2 + paddingX, y + 4);
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
  return (
    <span className="group relative inline-flex">
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-600">
        !
      </span>
      <span className="pointer-events-none absolute top-[120%] left-1/2 z-30 w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-slate-900 px-2 py-1.5 text-[11px] leading-snug text-slate-100 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {text}
      </span>
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
};

function Icon({ name, className = "h-4 w-4" }) {
  const IconComponent = ICON_COMPONENTS[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} strokeWidth={2} aria-hidden="true" />;
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
  const idleClass = "border-slate-300 bg-white text-slate-700 hover:bg-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition sm:h-9 sm:w-9 ${
        active ? activeClass : idleClass
      } disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      <Icon name={icon} />
    </button>
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
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition sm:h-9 sm:w-9 ${stateClass} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {ToolIcon ? <ToolIcon className="h-4 w-4" strokeWidth={2} /> : <Icon name={icon} />}
    </button>
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
  const exportPanelRef = useRef(null);
  const interactionRef = useRef({ mode: null, startX: 0, startY: 0 });
  const objectUrlRef = useRef(null);
  const compareObjectUrlRef = useRef(null);
  const saveDebounceRef = useRef(null);
  const storageWarningRef = useRef(false);
  const skipNextAutosaveRef = useRef(false);
  const restoredRef = useRef(false);
  const templateSyncingRef = useRef(false);
  const sheetImageSyncingRef = useRef(false);
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
  const [compareViewport, setCompareViewport] = useState({ width: 0, height: 0 });
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
  const [isTemplateSyncing, setIsTemplateSyncing] = useState(false);
  const [sheetMainImages, setSheetMainImages] = useState([]);
  const [selectedSheetMainImageId, setSelectedSheetMainImageId] = useState(null);
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
  const [templateRealSizeUnit, setTemplateRealSizeUnit] = useState("mm");
  const [templateRealSizeAxis, setTemplateRealSizeAxis] = useState("height");
  const [measurementUnit, setMeasurementUnit] = useState("cm");
  const [linePreset, setLinePreset] = useState("normal");
  const [contrast, setContrast] = useState(100);
  const [level, setLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(true);
  const [activeRightPanel, setActiveRightPanel] = useState("tool");
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const [historyPaused, setHistoryPaused] = useState(false);
  const [showStartupCalibrationAlert, setShowStartupCalibrationAlert] = useState(true);
  const [highlightCalibrationPanel, setHighlightCalibrationPanel] = useState(false);
  const [notice, setNotice] = useState(
    "Upload gambar lalu tarik garis. Garis yang sudah ada bisa di-adjust dengan drag titik ujung atau geser garis.",
  );
  const [activityLog, setActivityLog] = useState([]);
  const [planNote, setPlanNote] = useState("");
  const [planSteps, setPlanSteps] = useState([]);

  const imageWidth = image?.naturalWidth || image?.width || 0;
  const imageHeight = image?.naturalHeight || image?.height || 0;
  const modelWidth = cropRect?.width || imageWidth;
  const modelHeight = cropRect?.height || imageHeight;
  const orientedSize = useMemo(
    () => getOrientedSize(modelWidth, modelHeight, rotation),
    [modelHeight, modelWidth, rotation],
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
  const isSelectedLineLocked = selectedLine ? lockedLineIds.has(selectedLine.id) : false;

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
        detail: "Tarik garis pada ruler X-ray (semakin panjang semakin stabil).",
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
      mmPerPixel !== null ? (endpointTolerancePx * mmPerPixel).toFixed(2) : null;
    const zoomHint =
      safeZoomPercent !== null && Math.abs(safeZoomPercent - 100) > 0.01
        ? ` | Zoom source ${safeZoomPercent.toFixed(2)}%`
        : "";

    if (lengthPx < 60 || relativeErrorPct > 3.5) {
      return {
        status: "bad",
        title: "QC: Rendah",
        detail: `Ref ${lengthPx.toFixed(1)} px. Estimasi error ±${relativeErrorPct.toFixed(2)}%${absoluteErrorMm ? ` (±${absoluteErrorMm} mm)` : ""}.${zoomHint}`,
      };
    }
    if (lengthPx < 110 || relativeErrorPct > 1.8) {
      return {
        status: "warn",
        title: "QC: Sedang",
        detail: `Ref ${lengthPx.toFixed(1)} px. Estimasi error ±${relativeErrorPct.toFixed(2)}%${absoluteErrorMm ? ` (±${absoluteErrorMm} mm)` : ""}. Disarankan perpanjang garis ruler.${zoomHint}`,
      };
    }

    return {
      status: "good",
      title: "QC: Baik",
      detail: `Ref ${lengthPx.toFixed(1)} px. Estimasi error ±${relativeErrorPct.toFixed(2)}%${absoluteErrorMm ? ` (±${absoluteErrorMm} mm)` : ""}.${zoomHint}`,
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

  const isLineLocked = useCallback((lineId) => lockedLineIds.has(lineId), [lockedLineIds]);

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
        imageSrc: layer.kind === "upload" ? layer.imageSrc || "" : "",
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
      templateLibrary,
      snapToLandmarks,
      planNote,
      planSteps: planSteps.slice(-60),
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
      level,
      lines,
      lockedLineIds,
      mainImageSrc,
      measurementUnit,
      linePreset,
      mmPerPixel,
      mmPerPixelAt100Input,
      notice,
      planNote,
      planSteps,
      rotation,
      sourceZoomPercent,
      selectedAngleId,
      selectedCircleId,
      selectedCutLayerId,
      selectedHkaId,
      selectedLineId,
      selectedTemplateId,
      serializeCutLayers,
      snapToLandmarks,
      templateRealSizeAxis,
      templateRealSizeInput,
      templateRealSizeUnit,
      templateLibrary,
      tool,
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
    if (!orientedSize.width || !orientedSize.height || !viewport.width || !viewport.height) {
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
  }, [orientedSize.height, orientedSize.width, viewport.height, viewport.width]);

  const scrollToPanel = useCallback((panelRef) => {
    setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 90);
  }, []);

  const focusCalibrationStep = useCallback(
    (message = "Lakukan kalibrasi dulu pada ruler X-ray agar measurement akurat.") => {
      setShowStartupCalibrationAlert(false);
      setMobileControlsOpen(true);
      setCalibrationMode("line");
      setTool("draw");
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
    [],
  );

  const focusMeasureStep = useCallback(() => {
    setMobileControlsOpen(true);
    setActiveRightPanel("measure");
    setTool("draw");
    scrollToPanel(measurePanelRef);
  }, [scrollToPanel]);

  const focusExportStep = useCallback(() => {
    if (!hasCalibration) {
      focusCalibrationStep("Export report dikunci sampai kalibrasi aktif.");
      return;
    }
    setMobileControlsOpen(true);
    scrollToPanel(exportPanelRef);
  }, [focusCalibrationStep, hasCalibration, scrollToPanel]);

  const handleToolChange = useCallback(
    (nextTool) => {
      const requiresCalibration =
        nextTool === "angle" || nextTool === "circle" || nextTool === "hkaAuto";
      if (requiresCalibration && !hasCalibration) {
        focusCalibrationStep("Kalibrasi wajib sebelum memakai Angle/Circle/HKA.");
        return;
      }
      setActiveRightPanel("tool");
      setTool(nextTool);
    },
    [focusCalibrationStep, hasCalibration],
  );

  const handleLinePresetChange = useCallback(
    (nextPreset) => {
      if (nextPreset !== "normal" && !hasCalibration) {
        focusCalibrationStep("Preset klinis (HKA/Offset/LLD) aktif setelah kalibrasi.");
        return;
      }
      setActiveRightPanel("measure");
      setLinePreset(nextPreset);
      setTool("draw");
    },
    [focusCalibrationStep, hasCalibration],
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
        const parsedAngles = Array.isArray(payload.angles) ? payload.angles : [];
        const parsedCircles = Array.isArray(payload.circles) ? payload.circles : [];
        const parsedHkaSets = Array.isArray(payload.hkaSets) ? payload.hkaSets : [];
        const parsedCutLayers = Array.isArray(payload.cutLayers) ? payload.cutLayers : [];

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
                displayWidth: Number(layer.displayWidth || layer.sourceWidth || layer.width) || 0,
                displayHeight: Number(layer.displayHeight || layer.sourceHeight || layer.height) || 0,
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
              };

              if (baseLayer.kind === "upload" && baseLayer.imageSrc) {
                try {
                  const layerImage = await loadImageFromSrc(baseLayer.imageSrc);
                  return { ...baseLayer, image: layerImage };
                } catch {
                  return null;
                }
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
        setLockedLineIds(new Set(Array.isArray(payload.lockedLineIds) ? payload.lockedLineIds : []));
        setMmPerPixel(payload.mmPerPixel ?? null);
        setCalibrationMode(payload.calibrationMode || "line");
        setSourceZoomPercent(payload.sourceZoomPercent || "100");
        setMmPerPixelAt100Input(payload.mmPerPixelAt100Input || "0.63");
        setActualMmInput(payload.actualMmInput || "13");
        setActualUnit(payload.actualUnit || "cm");
        setTemplateRealSizeInput(payload.templateRealSizeInput || "");
        setTemplateRealSizeUnit(payload.templateRealSizeUnit || "mm");
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
        setTemplateLibrary((prev) =>
          mergeTemplateLibraryLists(
            Array.isArray(payload.templateLibrary) ? payload.templateLibrary : [],
            prev,
          ),
        );
        setSnapToLandmarks(payload.snapToLandmarks ?? true);
        setPlanNote(payload.planNote || "");
        setPlanSteps(Array.isArray(payload.planSteps) ? payload.planSteps.slice(-60) : []);
        setActivityLog(Array.isArray(payload.activityLog) ? payload.activityLog.slice(-120) : []);
        setMobileControlsOpen(false);

        nextLineIdRef.current =
          parsedLines.length > 0 ? Math.max(...parsedLines.map((line) => line.id || 0)) + 1 : 1;
        nextAngleIdRef.current =
          parsedAngles.length > 0 ? Math.max(...parsedAngles.map((item) => item.id || 0)) + 1 : 1;
        nextCircleIdRef.current =
          parsedCircles.length > 0 ? Math.max(...parsedCircles.map((item) => item.id || 0)) + 1 : 1;
        nextHkaIdRef.current =
          parsedHkaSets.length > 0 ? Math.max(...parsedHkaSets.map((item) => item.id || 0)) + 1 : 1;
        nextCutLayerIdRef.current =
          restoredCutLayers.length > 0
            ? Math.max(...restoredCutLayers.map((layer) => layer.id || 0)) + 1
            : 1;

        if (payload.compareImageSrc) {
          try {
            const restoredCompareImage = await loadImageFromSrc(payload.compareImageSrc);
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
        window.localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(buildStoryPayload()));
        storageWarningRef.current = false;
      } catch {
        if (!storageWarningRef.current) {
          storageWarningRef.current = true;
          setNotice("Penyimpanan lokal penuh. Simpan story manual atau kurangi ukuran gambar.");
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
      window.localStorage.setItem(TEMPLATE_LIBRARY_KEY, JSON.stringify(templateLibrary.slice(-60)));
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
                  name: doc.name || doc.title || `template-${String(doc.$id || "").slice(-6)}`,
                  imageSrc,
                  sourceWidth: Number(doc.sourceWidth || doc.width || 0),
                  sourceHeight: Number(doc.sourceHeight || doc.height || 0),
                  createdAt: doc.createdAt || doc.$createdAt || new Date().toISOString(),
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
            const storageResponse = await fetch("/api/appwrite-template-images?limit=60", {
              cache: "no-store",
            });
            const storagePayload = await storageResponse.json();
            if (!storageResponse.ok || !storagePayload?.ok) {
              throw new Error(storagePayload?.error || `HTTP ${storageResponse.status}`);
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
          setTemplateLibrary((prev) => mergeTemplateLibraryLists(remoteTemplates, prev));
        }

        if (!silent) {
          if (remoteTemplates.length > 0) {
            setNotice(
              `Template Appwrite dimuat. DB: ${dbCount}, Storage: ${storageCount}, total: ${remoteTemplates.length}.`,
            );
          } else {
            setNotice("Tidak ada template terbaca dari Appwrite atau akses ditolak.");
          }
        }
      } catch {
        if (!silent) {
          setNotice("Gagal memuat template dari Appwrite. Menggunakan template lokal.");
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
          throw new Error(apiPayload?.error || "Format payload endpoint tidak valid.");
        }

        const normalizedItems = parseSheetRawText(apiPayload.payload);
        setSheetMainImages(normalizedItems);
        setSelectedSheetMainImageId((prev) => {
          if (normalizedItems.length === 0) return null;
          const stillExists = normalizedItems.some((item) => String(item.id) === String(prev));
          return stillExists ? prev : normalizedItems[0].id;
        });

        if (!silent) {
          if (normalizedItems.length > 0) {
            setNotice(`Gambar Google Sheet/Drive dimuat. Total: ${normalizedItems.length}.`);
          } else {
            setNotice("Endpoint terbaca, tapi belum ada gambar valid di data sheet.");
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
        points: Array.isArray(item.points) ? item.points.map((point) => ({ ...point })) : [],
      })),
      hkaSets: hkaSets.map((item) => ({
        ...item,
        hip: { ...item.hip },
        knee: { ...item.knee },
        ankle: { ...item.ankle },
      })),
      cutLayers: cutLayers.map((layer) => ({ ...layer })),
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
        points: Array.isArray(item.points) ? item.points.map((point) => ({ ...point })) : [],
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
    setCutLayers(snapshot.cutLayers.map((layer) => ({ ...layer })));
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
    if (!historyCurrentRef.current || historyPastRef.current.length === 0) return;
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
    if (!historyCurrentRef.current || historyFutureRef.current.length === 0) return;
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
  }, [getHistorySignature, getHistorySnapshot, historyPaused, refreshHistoryState]);

  const findClosestLineId = useCallback(
    (imagePoint) => {
      const thresholdInImage = 8 / view.scale;
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
    [lines, view.scale],
  );

  const findClosestHandle = useCallback(
    (imagePoint) => {
      const thresholdInImage = 10 / view.scale;
      let pickedHandle = null;
      let minDistance = Infinity;

      for (const line of lines) {
        const handles = [
          { key: "start", x: line.x1, y: line.y1 },
          { key: "end", x: line.x2, y: line.y2 },
        ];

        for (const handle of handles) {
          const distance = Math.hypot(imagePoint.x - handle.x, imagePoint.y - handle.y);
          if (distance <= thresholdInImage && distance < minDistance) {
            minDistance = distance;
            pickedHandle = { lineId: line.id, handleKey: handle.key };
          }
        }
      }

      return pickedHandle;
    },
    [lines, view.scale],
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
          const distance = Math.hypot(imagePoint.x - handle.x, imagePoint.y - handle.y);
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
        const centerDistance = Math.hypot(imagePoint.x - circle.cx, imagePoint.y - circle.cy);
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
          const distance = Math.hypot(imagePoint.x - handle.x, imagePoint.y - handle.y);
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
          const distance = Math.hypot(imagePoint.x - corner.x, imagePoint.y - corner.y);
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
        const local = toLayerLocal(imagePoint, layer);
        const size = getLayerDisplaySize(layer);

        if (Math.abs(local.x) <= size.width / 2 && Math.abs(local.y) <= size.height / 2) {
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

    if (image && imageWidth > 0 && imageHeight > 0 && modelWidth > 0 && modelHeight > 0) {
      const sourceX = cropRect?.x || 0;
      const sourceY = cropRect?.y || 0;
      const sourceW = cropRect?.width || imageWidth;
      const sourceH = cropRect?.height || imageHeight;

      const p0 = orientPoint(0, 0, modelWidth, modelHeight, rotation, flipX, flipY);
      const p1 = orientPoint(1, 0, modelWidth, modelHeight, rotation, flipX, flipY);
      const p2 = orientPoint(0, 1, modelWidth, modelHeight, rotation, flipX, flipY);
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
      imageCtx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, modelWidth, modelHeight);

      for (const layer of cutLayers) {
        const srcX = layer.kind === "upload" ? layer.sourceX : sourceX + layer.sourceX;
        const srcY = layer.kind === "upload" ? layer.sourceY : sourceY + layer.sourceY;
        const sourceImage = layer.kind === "upload" ? layer.image : image;
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
          imageCtx.strokeStyle = "rgba(16, 185, 129, 0.95)";
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

    if (!image || imageWidth <= 0 || imageHeight <= 0 || modelWidth <= 0 || modelHeight <= 0) {
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
      const lineLengthPx = getLineLength(line);

      overlayCtx.save();
      overlayCtx.strokeStyle = opts.color;
      overlayCtx.lineWidth = opts.width || 2;
      overlayCtx.setLineDash(opts.dashed ? [6, 4] : []);
      overlayCtx.beginPath();
      overlayCtx.moveTo(start.x, start.y);
      overlayCtx.lineTo(end.x, end.y);
      overlayCtx.stroke();

      overlayCtx.fillStyle = opts.color;
      overlayCtx.beginPath();
      overlayCtx.arc(start.x, start.y, opts.handleRadius || 3, 0, Math.PI * 2);
      overlayCtx.arc(end.x, end.y, opts.handleRadius || 3, 0, Math.PI * 2);
      overlayCtx.fill();

      if (opts.highlightHandles) {
        overlayCtx.strokeStyle = "#f8fafc";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.beginPath();
        overlayCtx.arc(start.x, start.y, (opts.handleRadius || 3) + 1.2, 0, Math.PI * 2);
        overlayCtx.arc(end.x, end.y, (opts.handleRadius || 3) + 1.2, 0, Math.PI * 2);
        overlayCtx.stroke();
      }

      overlayCtx.restore();

      const baseLabel =
        mmPerPixel !== null ? formatMeasurementFromPx(lineLengthPx) : "Kalibrasi belum aktif";
      const lineTag = lineTypeLabel(line.type);
      const taggedLabel = `${lineTag}: ${baseLabel}`;
      const label = isLineLocked(line.id) ? `${taggedLabel} [LOCK]` : taggedLabel;
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2 - 14;
      drawTag(overlayCtx, midX, midY, label, opts.color);
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
        handleRadius: isSelected && !isLocked ? 4.5 : 3,
        highlightHandles: isSelected && !isLocked,
        dashed: isLocked,
      });
    }

    for (const angle of angles) {
      const p1 = imageToScreenPoint(angle.p1.x, angle.p1.y);
      const p2 = imageToScreenPoint(angle.p2.x, angle.p2.y);
      const p3 = imageToScreenPoint(angle.p3.x, angle.p3.y);
      const value = getAngleDegrees(angle.p1, angle.p2, angle.p3);
      const isSelected = angle.id === selectedAngleId;
      const color = isSelected ? "#fb923c" : "#f97316";

      overlayCtx.save();
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = isSelected ? 2.5 : 2;
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

      drawTag(overlayCtx, p2.x, p2.y - 16, `ANGLE: ${value.toFixed(1)}°`, color);
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

      drawTag(overlayCtx, center.x, center.y - radiusPx - 12, `DIA: ${diameterText}`, color);
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
      overlayCtx.lineTo(knee.x, knee.y);
      overlayCtx.lineTo(ankle.x, ankle.y);
      overlayCtx.stroke();
      overlayCtx.fillStyle = color;
      overlayCtx.beginPath();
      overlayCtx.arc(hip.x, hip.y, 3.6, 0, Math.PI * 2);
      overlayCtx.arc(knee.x, knee.y, 4.4, 0, Math.PI * 2);
      overlayCtx.arc(ankle.x, ankle.y, 3.6, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();

      drawTag(overlayCtx, knee.x, knee.y - 16, `HKA: ${angleDeg.toFixed(1)}°`, color);
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
        overlayCtx.arc(screen.x, screen.y, Math.max(4, 5 / Math.max(view.scale, 0.4)), 0, Math.PI * 2);
        overlayCtx.fill();
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
        const pointItem = imageToScreenPoint(draftAnglePoints[i].x, draftAnglePoints[i].y);
        overlayCtx.beginPath();
        overlayCtx.arc(pointItem.x, pointItem.y, 3.5, 0, Math.PI * 2);
        overlayCtx.fill();
        if (i > 0) {
          const prev = imageToScreenPoint(draftAnglePoints[i - 1].x, draftAnglePoints[i - 1].y);
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
      const center = imageToScreenPoint(draftCirclePoints[0].x, draftCirclePoints[0].y);
      overlayCtx.beginPath();
      overlayCtx.arc(center.x, center.y, 4.2, 0, Math.PI * 2);
      overlayCtx.fill();

      if (draftCirclePoints.length >= 2) {
        const edge = imageToScreenPoint(draftCirclePoints[1].x, draftCirclePoints[1].y);
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
        const p = imageToScreenPoint(draftCirclePoints[0].x, draftCirclePoints[0].y);
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
        const pointItem = imageToScreenPoint(draftHkaPoints[i].x, draftHkaPoints[i].y);
        overlayCtx.beginPath();
        overlayCtx.arc(pointItem.x, pointItem.y, 4, 0, Math.PI * 2);
        overlayCtx.fill();
        if (i > 0) {
          const prev = imageToScreenPoint(draftHkaPoints[i - 1].x, draftHkaPoints[i - 1].y);
          overlayCtx.beginPath();
          overlayCtx.moveTo(prev.x, prev.y);
          overlayCtx.lineTo(pointItem.x, pointItem.y);
          overlayCtx.stroke();
        }
      }
      overlayCtx.restore();
    }

    if (draftCut) {
      const normRect = normalizeRect(draftCut.x1, draftCut.y1, draftCut.x2, draftCut.y2);
      const topLeftCut = imageToScreenPoint(normRect.x, normRect.y);
      const bottomRightCut = imageToScreenPoint(
        normRect.x + normRect.width,
        normRect.y + normRect.height,
      );
      const cutWidth = Math.abs(bottomRightCut.x - topLeftCut.x);
      const cutHeight = Math.abs(bottomRightCut.y - topLeftCut.y);
      const rectX = Math.min(topLeftCut.x, bottomRightCut.x);
      const rectY = Math.min(topLeftCut.y, bottomRightCut.y);

      overlayCtx.save();
      overlayCtx.strokeStyle = "#22d3ee";
      overlayCtx.fillStyle = "rgba(34, 211, 238, 0.15)";
      overlayCtx.lineWidth = 1.5;
      overlayCtx.setLineDash([6, 4]);
      overlayCtx.fillRect(rectX, rectY, cutWidth, cutHeight);
      overlayCtx.strokeRect(rectX, rectY, cutWidth, cutHeight);
      overlayCtx.restore();

      drawTag(
        overlayCtx,
        rectX + cutWidth / 2,
        rectY - 14,
        `Cut ${normRect.width.toFixed(0)} x ${normRect.height.toFixed(0)} px`,
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
    level,
    lineTypeColor,
    lineTypeLabel,
    lines,
    cutLayers,
    formatMeasurementFromPx,
    measurementUnit,
    mmPerPixel,
    isLineLocked,
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
    if (!canvas || !compareMode || !compareViewport.width || !compareViewport.height) return;

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
      setMeasurementUnit("cm");
      setLinePreset("normal");
      setPlanNote("");
      setPlanSteps([]);
      setTool("draw");
      setMobileControlsOpen(false);
      resetHistoryStacks();
      setNotice(
        noticeText ||
          "Gambar aktif. Tarik garis referensi, lalu drag untuk adjust bila perlu sebelum kalibrasi.",
      );
      return true;
    },
    [resetHistoryStacks],
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
        setNotice("Upload gambar layer bawah dulu sebelum menambahkan layer kedua.");
        return false;
      }

      const srcW = layerImage?.naturalWidth || layerImage?.width || 0;
      const srcH = layerImage?.naturalHeight || layerImage?.height || 0;
      if (!srcW || !srcH) {
        setNotice("Layer gagal diproses. Dimensi file tidak valid.");
        return false;
      }

      const shouldMatchBase = sizeMode === "match-base";
      const templateSizeSource =
        sizeMode === "inherit-template"
          ? selectedCutLayer?.kind === "upload"
            ? selectedCutLayer
            : [...cutLayers].reverse().find((layer) => layer.kind === "upload") || null
          : null;
      const inheritedTemplateSize = templateSizeSource
        ? getLayerDisplaySize(templateSizeSource)
        : null;
      const sameCanvasSize =
        Math.abs(srcW - modelWidth) <= 2 && Math.abs(srcH - modelHeight) <= 2;
      const targetMax = Math.min(modelWidth, modelHeight) * 0.45;
      const scale = shouldMatchBase
        ? 1
        : sameCanvasSize
        ? Math.min(modelWidth / srcW, modelHeight / srcH)
        : Math.min(targetMax / srcW, targetMax / srcH, 1);
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
        sourceX: 0,
        sourceY: 0,
        sourceWidth: srcW,
        sourceHeight: srcH,
        displayWidth,
        displayHeight,
        centerX: modelWidth / 2,
        centerY: modelHeight / 2,
        rotation: 0,
        flipX: false,
        flipY: false,
        opacity: shouldMatchBase || sameCanvasSize ? Math.min(opacity, 0.6) : opacity,
        lockScale: false,
      };

      nextCutLayerIdRef.current += 1;
      setCutLayers((prev) => [...prev, nextLayer]);
      setSelectedCutLayerId(nextLayer.id);
      setSelectedLineId(null);
      setSelectedAngleId(null);
      setSelectedCircleId(null);
      setSelectedHkaId(null);
      setTool("draw");
      setMobileControlsOpen(true);
      setNotice(noticeText || `Layer "${nextLayer.name}" ditambahkan di atas layer bawah.`);
      return true;
    },
    [cutLayers, image, modelHeight, modelWidth, selectedCutLayer],
  );

  const useSheetImageAsMain = useCallback(
    async (imageItem) => {
      const candidateSources = buildDriveImageCandidates(imageItem?.imageSrc, imageItem?.driveId);
      if (candidateSources.length === 0) {
        setNotice("Gambar Google Drive belum valid.");
        return;
      }

      try {
        const loaded = await loadImageFromCandidates(candidateSources);
        if (image) {
          addImageAsWorkspaceLayer({
            layerImage: loaded.image,
            imageSrc: loaded.src,
            name: imageItem.name || "sheet-drive-layer",
            sizeMode: "match-base",
            noticeText: `Layer "${imageItem.name || "Google Sheet Image"}" ditambahkan dan ukurannya mengikuti layer bawah.`,
          });
          return;
        }

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        const applied = applyMainImageToWorkspace({
          nextImage: loaded.image,
          nextImageName: imageItem.name || "sheet-drive-image",
          noticeText: `Gambar "${imageItem.name || "Google Sheet Image"}" dimuat dari Google Sheet/Drive.`,
        });
        if (applied) {
          setMainImageSrc(loaded.src);
        }
      } catch {
        setNotice("Gagal memuat gambar dari Google Drive.");
      }
    },
    [addImageAsWorkspaceLayer, applyMainImageToWorkspace, image],
  );

  const useSelectedSheetImageAsMain = useCallback(() => {
    const selectedItem =
      sheetMainImages.find((item) => String(item.id) === String(selectedSheetMainImageId)) || null;
    if (!selectedItem) {
      setNotice("Pilih gambar Google Sheet/Drive terlebih dulu.");
      return;
    }
    void useSheetImageAsMain(selectedItem);
  }, [sheetMainImages, selectedSheetMainImageId, useSheetImageAsMain]);

  const handleImageUpload = useCallback((event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (image) {
      void (async () => {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const layerImage = await loadImageFromSrc(dataUrl);
          addImageAsWorkspaceLayer({
            layerImage,
            imageSrc: dataUrl,
            name: file.name,
            sizeMode: "match-base",
            noticeText: `Upload kedua "${file.name}" ditambahkan sebagai layer baru dengan ukuran mengikuti layer bawah.`,
          });
        } catch {
          setNotice("Gagal membaca file sebagai layer baru.");
        } finally {
          input.value = "";
        }
      })();
      return;
    }

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
  }, [addImageAsWorkspaceLayer, applyMainImageToWorkspace, image]);

  const handlePointerDown = useCallback(
    (event) => {
      if (!image) return;

      event.preventDefault();
      const point = getLocalPoint(event);
      const imagePoint = screenToImagePoint(point.x, point.y);
      const boundedPoint = clampToImageBounds(imagePoint);

      if (event.button === 1 || event.button === 2 || tool === "pan") {
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

      const hitCutLayerHandle = findCutLayerHandle(imagePoint);
      if (hitCutLayerHandle) {
        const targetLayer = cutLayers.find((layer) => layer.id === hitCutLayerHandle.layerId);
        if (!targetLayer) return;
        setSelectedCutLayerId(targetLayer.id);
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
      if (hitCutLayerId !== null && (tool === "draw" || selectedCutLayerId === hitCutLayerId)) {
        const targetLayer = cutLayers.find((layer) => layer.id === hitCutLayerId);
        if (!targetLayer) return;
        setSelectedCutLayerId(hitCutLayerId);
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

      if (!hasCalibration && (tool === "angle" || tool === "circle" || tool === "hkaAuto")) {
        focusCalibrationStep("Kalibrasi wajib sebelum memakai Angle/Circle/HKA.");
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
          };
          nextAngleIdRef.current += 1;
          setAngles((items) => [...items, nextAngle]);
          setSelectedAngleId(nextAngle.id);
          setNotice("Angle measurement dibuat.");
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

          if (hitCircleHandle.handleKey === "center" || hitCircleHandle.handleKey === "move") {
            const targetCircle = circles.find((item) => item.id === hitCircleHandle.circleId);
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
            setNotice(`Auto HKA: pilih ${3 - next.length} titik lagi (hip-knee-ankle).`);
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
          return [];
        });
        return;
      }

      if (tool === "cut") {
        const start = boundedPoint;
        setDraftCut({ x1: start.x, y1: start.y, x2: start.x, y2: start.y });
        setHistoryPaused(true);
        interactionRef.current = {
          mode: "cut",
        };
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
          setNotice("Garis ini terkunci. Buka lock dulu untuk mengubah ukuran/posisi.");
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
          setNotice("Garis ini terkunci. Buka lock dulu untuk mengubah ukuran/posisi.");
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
      clampToImageBounds,
      circles,
      findClosestAngleHandle,
      findClosestCircleHandle,
      findClosestHandle,
      findClosestHkaHandle,
      findClosestLineId,
      findCutLayerByPoint,
      findCutLayerHandle,
      getLocalPoint,
      image,
      focusCalibrationStep,
      hasCalibration,
      isLineLocked,
      cutLayers,
      lines,
      linePreset,
      selectedCutLayerId,
      setHistoryPaused,
      screenToImagePoint,
      tool,
      view.panX,
      view.panY,
    ],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!image || !interactionRef.current.mode) return;

      event.preventDefault();
      const point = getLocalPoint(event);

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
        const movePoint = clampToImageBounds(screenToImagePoint(point.x, point.y));
        setDraftLine((prev) => {
          if (!prev) return prev;
          return { ...prev, x2: movePoint.x, y2: movePoint.y };
        });
        return;
      }

      if (interactionRef.current.mode === "cut") {
        const movePoint = clampToImageBounds(screenToImagePoint(point.x, point.y));
        setDraftCut((prev) => {
          if (!prev) return prev;
          return { ...prev, x2: movePoint.x, y2: movePoint.y };
        });
        return;
      }

      if (interactionRef.current.mode === "draw-circle-radius") {
        const movePoint = clampToImageBounds(screenToImagePoint(point.x, point.y));
        const { centerX, centerY } = interactionRef.current;
        setDraftCirclePoints([
          { x: centerX, y: centerY },
          { x: movePoint.x, y: movePoint.y },
        ]);
        return;
      }

      if (interactionRef.current.mode === "move-cut-layer") {
        const { layerId, startImageX, startImageY, originCenterX, originCenterY } =
          interactionRef.current;
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
            const dist = Math.hypot(landmark.x - nextCenterX, landmark.y - nextCenterY);
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

      if (interactionRef.current.mode === "resize-cut-layer") {
        const { layerId, centerX, centerY, rotation: layerRotation } = interactionRef.current;
        const nextImagePoint = screenToImagePoint(point.x, point.y);
        const dx = nextImagePoint.x - centerX;
        const dy = nextImagePoint.y - centerY;
        const rad = (layerRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        const nextDisplayWidth = clamp(Math.abs(localX) * 2, 16, modelWidth * 2);
        const nextDisplayHeight = clamp(Math.abs(localY) * 2, 16, modelHeight * 2);

        setCutLayers((prev) =>
          prev.map((layer) =>
            layer.id === layerId
              ? layer.lockScale
                ? layer
                : { ...layer, displayWidth: nextDisplayWidth, displayHeight: nextDisplayHeight }
              : layer,
          ),
        );
        return;
      }

      if (interactionRef.current.mode === "move-handle") {
        const movePoint = clampToImageBounds(screenToImagePoint(point.x, point.y));
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
        const { lineId, startImageX, startImageY, origin } = interactionRef.current;
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

      if (interactionRef.current.mode === "move-angle-handle") {
        const movePoint = clampToImageBounds(screenToImagePoint(point.x, point.y));
        const { angleId, handleKey } = interactionRef.current;
        setAngles((prev) =>
          prev.map((item) => {
            if (item.id !== angleId) return item;
            if (handleKey === "p1") return { ...item, p1: { x: movePoint.x, y: movePoint.y } };
            if (handleKey === "p2") return { ...item, p2: { x: movePoint.x, y: movePoint.y } };
            return { ...item, p3: { x: movePoint.x, y: movePoint.y } };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-circle-center") {
        const { circleId, startImageX, startImageY, originCenterX, originCenterY } =
          interactionRef.current;
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
              Math.hypot(nextImagePoint.x - item.cx, nextImagePoint.y - item.cy),
              3,
              Math.max(modelWidth, modelHeight) * 1.5,
            );
            return { ...item, radius: nextRadius };
          }),
        );
        return;
      }

      if (interactionRef.current.mode === "move-hka-handle") {
        const movePoint = clampToImageBounds(screenToImagePoint(point.x, point.y));
        const { hkaId, handleKey } = interactionRef.current;
        setHkaSets((prev) =>
          prev.map((item) => {
            if (item.id !== hkaId) return item;
            if (handleKey === "hip") return { ...item, hip: { x: movePoint.x, y: movePoint.y } };
            if (handleKey === "knee") return { ...item, knee: { x: movePoint.x, y: movePoint.y } };
            return { ...item, ankle: { x: movePoint.x, y: movePoint.y } };
          }),
        );
      }
    },
    [
      angles,
      clampToImageBounds,
      circles,
      getLocalPoint,
      image,
      isLineLocked,
      landmarkPoints,
      modelHeight,
      modelWidth,
      screenToImagePoint,
      snapToLandmarks,
      view.scale,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (interactionRef.current.mode === "draw" && draftLine) {
      const length = getLineLength(draftLine);
      if (length >= 2) {
        const nextLine = { ...draftLine, id: nextLineIdRef.current };
        nextLineIdRef.current += 1;
        setLines((prev) => [...prev, nextLine]);
        setSelectedLineId(nextLine.id);
      }
      setDraftLine(null);
    }

    if (interactionRef.current.mode === "draw-circle-radius" && draftCirclePoints.length >= 2) {
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
        setNotice("Circle/diameter berhasil dibuat. Drag area dalam untuk pindah, drag tepi untuk resize.");
      } else {
        setNotice("Diameter terlalu kecil. Ulangi circle.");
      }
      setDraftCirclePoints([]);
    }

    if (interactionRef.current.mode === "cut" && draftCut) {
      const nextCrop = normalizeRect(draftCut.x1, draftCut.y1, draftCut.x2, draftCut.y2);
      if (nextCrop.width > 8 && nextCrop.height > 8) {
        const nextLayer = {
          id: nextCutLayerIdRef.current,
          kind: "cut",
          sourceX: nextCrop.x,
          sourceY: nextCrop.y,
          sourceWidth: nextCrop.width,
          sourceHeight: nextCrop.height,
          displayWidth: nextCrop.width,
          displayHeight: nextCrop.height,
          centerX: nextCrop.x + nextCrop.width / 2,
          centerY: nextCrop.y + nextCrop.height / 2,
          rotation: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
          lockScale: false,
        };
        nextCutLayerIdRef.current += 1;
        setCutLayers((prev) => [...prev, nextLayer]);
        setSelectedCutLayerId(nextLayer.id);
        setNotice("Cut berhasil dibuat sebagai layer baru. Background asli tetap tampil.");
      }
      setDraftCut(null);
      setTool("draw");
    }

    interactionRef.current = { mode: null, startX: 0, startY: 0 };
    setHistoryPaused(false);
  }, [draftCirclePoints, draftCut, draftLine]);

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
  }, [actualMmInput, actualUnit, calibrationMode, mmPerPixelAt100Input, selectedLine, sourceZoomPercent]);

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
      setCircles((prev) => prev.filter((item) => item.id !== selectedCircle.id));
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
  }, [calibrationLineId, isLineLocked, selectedAngle, selectedCircle, selectedHka, selectedLine]);

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
    setLockedLineIds((prev) => new Set([...prev].filter((id) => keepIds.has(id))));
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
    setNotice("Kalibrasi di-reset. Garis tetap ada, silakan pilih garis referensi baru.");
  }, []);

  const applyTemplateRealSize = useCallback(() => {
    if (!selectedCutLayer) {
      setNotice("Pilih template layer dulu untuk di-scale.");
      return;
    }
    if (selectedCutLayer.kind !== "upload") {
      setNotice("Scale real size hanya untuk template/upload layer.");
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

    const targetMm = templateRealSizeUnit === "cm" ? inputValue * 10 : inputValue;
    const targetPixels = targetMm / mmPerPixel;
    const currentSize = getLayerDisplaySize(selectedCutLayer);
    const sourceAxisLength =
      templateRealSizeAxis === "width" ? currentSize.width : currentSize.height;
    if (!Number.isFinite(sourceAxisLength) || sourceAxisLength <= 0) {
      setNotice("Ukuran template saat ini tidak valid.");
      return;
    }

    const scale = targetPixels / sourceAxisLength;
    const nextWidth = clamp(currentSize.width * scale, 16, Math.max(16, modelWidth * 3));
    const nextHeight = clamp(currentSize.height * scale, 16, Math.max(16, modelHeight * 3));

    setCutLayers((prev) =>
      prev.map((layer) =>
        layer.id === selectedCutLayer.id
          ? { ...layer, displayWidth: nextWidth, displayHeight: nextHeight }
          : layer,
      ),
    );
    setNotice(
      `Template #${selectedCutLayer.id} di-scale dari ${templateRealSizeAxis === "width" ? "lebar" : "tinggi"} real ${inputValue} ${templateRealSizeUnit}.`,
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
      if (placement === "up") targetIndex = Math.min(prev.length - 1, currentIndex + 1);
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
    setCutLayers([]);
    setSelectedCutLayerId(null);
    nextCutLayerIdRef.current = 1;
    setNotice("Semua cut layer dihapus. Background asli tetap.");
  }, []);

  const handleLayerUpload = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!image || !modelWidth || !modelHeight) {
        setNotice("Upload gambar utama dulu sebelum menambahkan template layer.");
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
      window.localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(buildStoryPayload()));
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

    const sourceImage = selectedCutLayer.kind === "upload" ? selectedCutLayer.image : image;
    if (!sourceImage) {
      setNotice("Sumber layer tidak ditemukan.");
      return;
    }

    const sourceX =
      selectedCutLayer.kind === "upload"
        ? selectedCutLayer.sourceX
        : cropRect.x + selectedCutLayer.sourceX;
    const sourceY =
      selectedCutLayer.kind === "upload"
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
    ctx.drawImage(sourceImage, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
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
        `${selectedCutLayer.kind === "upload" ? "Upload" : "Cut"}-${sourceW}x${sourceH}`,
      imageSrc,
      sourceWidth: sourceW,
      sourceHeight: sourceH,
      createdAt: new Date().toISOString(),
    };
    setTemplateLibrary((prev) => mergeTemplateLibraryLists([nextTemplate], prev));

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
        const srcW = layerImage.naturalWidth || layerImage.width || template.sourceWidth || 0;
        const srcH = layerImage.naturalHeight || layerImage.height || template.sourceHeight || 0;
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
        value: mmPerPixel !== null ? formatMeasurementFromPx(lengthPx) : `${lengthPx.toFixed(2)} px`,
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
  }, [angles, circles, formatMeasurementFromPx, hkaSets, lineTypeLabel, lines, measurementUnit, mmPerPixel]);

  const legPackageSummary = useMemo(() => {
    const readType = (type) => lines.filter((line) => line.type === type).map((line) => getLineLength(line));
    const femoral = readType("femoralOffset");
    const global = readType("globalOffset");
    const lld = readType("lld");
    const fmt = (valuePx) =>
      mmPerPixel !== null ? formatMeasurementFromPx(valuePx) : `${valuePx.toFixed(2)} px`;

    return {
      femoralMean: femoral.length ? fmt(femoral.reduce((sum, value) => sum + value, 0) / femoral.length) : "-",
      globalMean: global.length ? fmt(global.reduce((sum, value) => sum + value, 0) / global.length) : "-",
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
      calibration: mmPerPixel !== null ? `${mmPerPixel.toFixed(6)} mm/px` : "Belum dikalibrasi",
      selectedTarget,
      measurements: measurementRows.slice(0, 30),
      inventory: templateInventoryRows.slice(0, 30),
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
  ]);

  const removePlanningStep = useCallback((stepId) => {
    setPlanSteps((prev) => prev.filter((step) => step.id !== stepId));
    setNotice("Planning step dihapus.");
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

      if (key === "d") handleToolChange("draw");
      if (key === "p") handleToolChange("pan");
      if (key === "c") handleToolChange("cut");
      if (key === "a") handleToolChange("angle");
      if (key === "o") handleToolChange("circle");
      if (key === "h") handleToolChange("hkaAuto");
      if (key === "f") fitImageToViewport();
      if ((key === "delete" || key === "backspace") && !isMeta) {
        event.preventDefault();
        removeSelectedLine();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fitImageToViewport, handleToolChange, redoHistory, removeSelectedLine, undoHistory]);

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
    focusCalibrationStep("Lakukan kalibrasi dulu pada ruler X-ray agar measurement akurat.");
  }, [focusCalibrationStep]);

  return (
    <div className="flex min-h-screen w-screen max-w-none flex-col gap-3 px-2 py-3 sm:px-4 lg:px-6">
      {showStartupCalibrationAlert ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              goToCalibrationPanel();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Kalibrasi Wajib Sebelum Ukur</h2>
            <p className="mt-2 text-sm text-slate-700">
              Untuk hasil ukuran akurat, tarik garis kalibrasi pada ruler X-ray (contoh 13 cm),
              lalu isi nilai aktual dan simpan kalibrasi sebelum melakukan measurement.
            </p>
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Langkah cepat: Upload gambar, tarik garis di ruler, simpan kalibrasi, lalu mulai ukur.
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
          </div>
        </div>
      ) : null}
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Foto X-ray Measurement</h1>
          <p className="text-xs text-slate-600">Upload, kalibrasi & ukur</p>
        </div>
        <IconButton
          icon={mobileControlsOpen ? "close" : "menu"}
          label={mobileControlsOpen ? "Tutup Kontrol" : "Buka Kontrol"}
          onClick={() => setMobileControlsOpen((prev) => !prev)}
          active={mobileControlsOpen}
          className="lg:hidden"
        />
      </header>

      <section className="grid flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)_300px] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside
          className={`order-2 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 ${
            mobileControlsOpen ? "flex max-h-[56vh] overflow-y-auto" : "hidden"
          } lg:order-1 lg:flex lg:max-h-[calc(100vh-132px)] lg:overflow-y-auto`}
        >
          <div className="order-2 flex flex-col gap-2" style={{ order: 2 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="upload" className="h-4 w-4 text-slate-600" />
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-700" htmlFor="xray-upload">
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
            <p className="text-xs text-slate-500">
              {imageName
                ? `Layer bawah: ${imageName}. Upload lagi untuk menambah layer kedua.`
                : "Upload pertama menjadi layer bawah/background."}
            </p>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                  Google Sheet / Drive
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void syncMainImageLibraryFromGoogleSheet();
                  }}
                  disabled={isSheetMainImageSyncing || !String(sheetMainImageEndpoint || "").trim()}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSheetMainImageSyncing ? "Load..." : "Load"}
                </button>
              </div>
              <input
                type="text"
                value={sheetMainImageEndpoint}
                onChange={(event) => setSheetMainImageEndpoint(event.target.value)}
                placeholder="URL endpoint Apps Script / CSV"
                className="mb-1.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <select
                  value={selectedSheetMainImageId ?? ""}
                  onChange={(event) => setSelectedSheetMainImageId(event.target.value || null)}
                  disabled={sheetMainImages.length === 0}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {sheetMainImages.length === 0 ? (
                    <option value="">Belum ada gambar</option>
                  ) : (
                    sheetMainImages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || "Untitled Image"}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={useSelectedSheetImageAsMain}
                  disabled={sheetMainImages.length === 0 || !selectedSheetMainImageId}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Pakai
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                {sheetMainImageEndpointHost
                  ? `Endpoint: ${sheetMainImageEndpointHost}`
                  : "Masukkan URL endpoint Apps Script / Google Sheet."}
              </p>
            </div>
          </div>

          <div className="order-9 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5" style={{ order: 9 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="compare" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Compare</span>
              <InfoTooltip text="Split mode untuk pre-op vs post-op atau kiri vs kanan. Upload gambar compare lalu aktifkan mode compare." />
            </div>
            <input
              ref={compareUploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleCompareUpload}
              className="hidden"
            />
            <div className="flex gap-1.5">
              <IconButton
                icon="upload"
                label="Upload Compare"
                onClick={() => compareUploadInputRef.current?.click()}
              />
              <IconButton
                icon="compare"
                label="Toggle Compare Mode"
                onClick={() => setCompareMode((prev) => !prev)}
                active={compareMode}
                disabled={!compareImageSrc}
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
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {compareImageName ? `Compare: ${compareImageName}` : "Belum ada gambar compare."}
            </p>
          </div>

          <div className="hidden" style={{ order: 4 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="camera" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Tool</span>
              <InfoTooltip text="Ikon tool: Draw, Pan, Cut, Angle, Circle/Diameter, Auto HKA. Shortcut: D/P/C/A/O/H, Delete, Ctrl/Cmd+Z/Y." />
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              <ToolIconButton
                icon="draw"
                label="Draw Line"
                onClick={() => handleToolChange("draw")}
                active={tool === "draw"}
              />
              <ToolIconButton
                icon="pan"
                label="Pan"
                onClick={() => handleToolChange("pan")}
                active={tool === "pan"}
              />
              <ToolIconButton
                icon="cut"
                label="Cut / Crop"
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
                label="Auto HKA Tool"
                onClick={() => handleToolChange("hkaAuto")}
                active={tool === "hkaAuto"}
              />
              <ToolIconButton icon="zoomIn" label="Zoom In" onClick={() => zoomBy(1.15)} />
              <ToolIconButton icon="zoomOut" label="Zoom Out" onClick={() => zoomBy(1 / 1.15)} />
              <ToolIconButton icon="fit" label="Fit to Screen" onClick={fitImageToViewport} />
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

          <div
            ref={exportPanelRef}
            className="order-8 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5"
            style={{ order: 8 }}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="export" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Export</span>
              <InfoTooltip text="PNG: snapshot cepat. PDF: buka report siap print/save PDF dengan tabel measurement." />
            </div>
            <div className="flex gap-1.5">
              <IconButton
                icon="export"
                label="Export PNG"
                onClick={exportReportPng}
                disabled={!hasCalibration}
              />
              <IconButton
                icon="save"
                label="Export PDF"
                onClick={exportReportPdf}
                disabled={!hasCalibration}
              />
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
              Total row report: {measurementRows.length}
            </div>
          </div>

          <div className="order-6 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5" style={{ order: 6 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="target" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Adjust</span>
              <InfoTooltip text="Slider untuk contrast/level gambar utama. Ikon: rotate/flip gambar utama, dan reset semua cut layer." />
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
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              <IconButton icon="rotateLeft" label="Rotate -90" onClick={rotateLeft} />
              <IconButton icon="rotateRight" label="Rotate +90" onClick={rotateRight} />
              <IconButton icon="flipH" label="Flip Horizontal" onClick={() => setFlipX((prev) => !prev)} />
              <IconButton icon="flipV" label="Flip Vertical" onClick={() => setFlipY((prev) => !prev)} />
              <IconButton icon="resetCrop" label="Reset Cut Layers" onClick={resetCutArea} />
            </div>
          </div>

          <div className="order-7 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5" style={{ order: 7 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="cut" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Cut Layer</span>
              <InfoTooltip text="Gunakan tool Cut untuk membuat layer baru. Layer bisa drag untuk pindah, drag sudut untuk resize, rotate/flip, dan upload template baru (implant/bonesetter)." />
            </div>
            <div className="text-[11px] text-slate-600">
              Total layer: {cutLayers.length}
              {selectedCutLayer ? ` | Selected: #${selectedCutLayer.id}` : " | Selected: -"}
            </div>
            <div className="text-[10px] text-slate-500">
              Upload pertama menjadi layer bawah. Upload berikutnya menjadi layer baru di atas,
              lalu urutan layer bisa dipindah ke atas atau bawah.
            </div>
            <input
              ref={layerUploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleLayerUpload}
              className="hidden"
            />
            <div className="flex flex-wrap gap-1.5">
              <IconButton
                icon="upload"
                label="Upload Template Layer"
                onClick={() => layerUploadInputRef.current?.click()}
              />
              <IconButton
                icon="save"
                label="Simpan Layer Terpilih ke Library"
                onClick={() => {
                  void saveSelectedLayerToLibrary();
                }}
                disabled={!selectedCutLayer}
              />
              <IconButton
                icon={snapToLandmarks ? "lock" : "unlock"}
                label={snapToLandmarks ? "Snap Landmark ON" : "Snap Landmark OFF"}
                onClick={() => setSnapToLandmarks((prev) => !prev)}
                active={snapToLandmarks}
                tone="amber"
              />
            </div>
            <div className="text-[11px] text-slate-500">
              Snap landmark: {snapToLandmarks ? "ON" : "OFF"} | Template library: {templateLibrary.length}
            </div>
            <GoogleSheetDrivePicker onUseImage={useGoogleSheetImageAsLayer} />
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
                isTemplateSyncing || (!hasTemplateCollectionConfig && !hasTemplateStorageConfig)
              }
              syncing={isTemplateSyncing}
              sourceLabel={
                hasTemplateCollectionConfig || hasTemplateStorageConfig
                  ? `Appwrite${hasTemplateCollectionConfig ? " DB" : ""}${hasTemplateCollectionConfig && hasTemplateStorageConfig ? " + " : ""}${hasTemplateStorageConfig ? ` Storage${appwriteConfig.templateBucketName ? ` (${appwriteConfig.templateBucketName})` : ""}` : ""} + Lokal`
                  : "Lokal"
              }
            />
            <div className="flex flex-col gap-1.5">
              {cutLayers.length === 0 ? (
                <span className="text-[11px] text-slate-500">Belum ada cut layer.</span>
              ) : (
                cutLayers.map((layer, layerIndex) => {
                  const isActive = selectedCutLayerId === layer.id;
                  const layerOpacity = Math.round((layer.opacity ?? 1) * 100);
                  const normalizedRotation = ((layer.rotation % 360) + 360) % 360;
                  const layerRotation = Math.round(
                    normalizedRotation > 180 ? normalizedRotation - 360 : normalizedRotation,
                  );
                  const layerWidth = Math.max(
                    16,
                    Math.round(Number(layer.displayWidth || layer.sourceWidth || 16)),
                  );
                  const layerHeight = Math.max(
                    16,
                    Math.round(Number(layer.displayHeight || layer.sourceHeight || 16)),
                  );
                  const layerCenterX = Math.round(Number(layer.centerX || 0));
                  const layerCenterY = Math.round(Number(layer.centerY || 0));
                  const widthMax = Math.max(200, Math.round(modelWidth * 2) || 200);
                  const heightMax = Math.max(200, Math.round(modelHeight * 2) || 200);
                  const centerXMax = Math.max(1, Math.round(modelWidth || 1));
                  const centerYMax = Math.max(1, Math.round(modelHeight || 1));
                  const isBottomStackLayer = layerIndex === 0;
                  const isTopStackLayer = layerIndex === cutLayers.length - 1;
                  const layerWidthMm = mmPerPixel !== null ? layerWidth * mmPerPixel : null;
                  const layerHeightMm = mmPerPixel !== null ? layerHeight * mmPerPixel : null;
                  const formatLayerRealSize = (valueMm) => {
                    if (valueMm === null) return "-";
                    if (templateRealSizeUnit === "cm") return `${(valueMm / 10).toFixed(2)} cm`;
                    return `${valueMm.toFixed(1)} mm`;
                  };
                  const canApplyTemplateRealSize =
                    layer.kind === "upload" && mmPerPixel !== null && !layer.lockScale;

                  return (
                    <div
                      key={layer.id}
                      className={`rounded-md border p-1.5 ${
                        isActive
                          ? "border-emerald-500 bg-emerald-50/60"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCutLayerId(layer.id)}
                        className="w-full text-left text-[11px] text-slate-700"
                      >
                        Layer #{layer.id}
                        {layer.name ? ` • ${layer.name}` : ""}
                        {` • ${layerIndex + 1}/${cutLayers.length}`}
                      </button>

                      {isActive ? (
                        <div className="mt-1.5 flex flex-col gap-1.5">
                          <div className="rounded border border-slate-200 bg-white/80 px-2 py-1 text-[10px] text-slate-600">
                            Drag isi layer untuk pindah, drag titik sudut untuk resize.
                          </div>

                          <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
                            Stack: layer bawah digambar lebih dulu, layer atas menutup layer di
                            bawahnya. Background utama selalu berada paling bawah.
                          </div>

                          <div className="flex items-center justify-between gap-1.5">
                            <IconButton
                              icon="moveLeft"
                              label="Turunkan Layer"
                              onClick={() => moveCutLayerInStack(layer.id, "down")}
                              disabled={isBottomStackLayer}
                              className="h-8 w-8"
                            />
                            <IconButton
                              icon="moveRight"
                              label="Naikkan Layer"
                              onClick={() => moveCutLayerInStack(layer.id, "up")}
                              disabled={isTopStackLayer}
                              className="h-8 w-8"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id
                                      ? { ...item, centerX: modelWidth / 2, centerY: modelHeight / 2 }
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
                                      Number(item.sourceWidth || item.displayWidth || 1),
                                    );
                                    const srcH = Math.max(
                                      1,
                                      Number(item.sourceHeight || item.displayHeight || 1),
                                    );
                                    const scale = Math.max(
                                      0.02,
                                      Math.min(modelWidth / srcW, modelHeight / srcH),
                                    );
                                    return {
                                      ...item,
                                      displayWidth: clamp(srcW * scale, 16, modelWidth * 2),
                                      displayHeight: clamp(srcH * scale, 16, modelHeight * 2),
                                      centerX: modelWidth / 2,
                                      centerY: modelHeight / 2,
                                    };
                                  }),
                                )
                              }
                              disabled={!modelWidth || !modelHeight || layer.lockScale}
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
                                          displayWidth: clamp(modelWidth, 16, modelWidth * 2),
                                          displayHeight: clamp(modelHeight, 16, modelHeight * 2),
                                          centerX: modelWidth / 2,
                                          centerY: modelHeight / 2,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              disabled={!modelWidth || !modelHeight || layer.lockScale}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              Samakan Bawah
                            </button>
                          </div>

                          {layer.kind === "upload" ? (
                            <div className="rounded border border-cyan-200 bg-cyan-50/60 px-2 py-1.5">
                              <div className="flex items-center justify-between gap-2 text-[10px] text-cyan-900">
                                <span>
                                  Real: W {formatLayerRealSize(layerWidthMm)} | H{" "}
                                  {formatLayerRealSize(layerHeightMm)}
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
                                  onChange={(event) => setTemplateRealSizeInput(event.target.value)}
                                  placeholder="Ukuran real"
                                  className="min-w-0 rounded border border-cyan-200 bg-white px-2 py-1 text-[10px] text-slate-800 outline-none focus:border-cyan-500"
                                />
                                <select
                                  value={templateRealSizeAxis}
                                  onChange={(event) => setTemplateRealSizeAxis(event.target.value)}
                                  className="rounded border border-cyan-200 bg-white px-1 py-1 text-[10px] text-slate-700 outline-none focus:border-cyan-500"
                                >
                                  <option value="height">Tinggi</option>
                                  <option value="width">Lebar</option>
                                </select>
                                <select
                                  value={templateRealSizeUnit}
                                  onChange={(event) => setTemplateRealSizeUnit(event.target.value)}
                                  className="rounded border border-cyan-200 bg-white px-1 py-1 text-[10px] text-slate-700 outline-none focus:border-cyan-500"
                                >
                                  <option value="mm">mm</option>
                                  <option value="cm">cm</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={applyTemplateRealSize}
                                disabled={!canApplyTemplateRealSize}
                                className="mt-1.5 w-full rounded border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Scale Pakai Garis Real
                              </button>
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
                                const nextWidth = clamp(Number(event.target.value), 16, widthMax);
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id ? { ...item, displayWidth: nextWidth } : item,
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
                                const nextHeight = clamp(Number(event.target.value), 16, heightMax);
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
                                const nextCenterX = clamp(Number(event.target.value), 0, centerXMax);
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id ? { ...item, centerX: nextCenterX } : item,
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
                                const nextCenterY = clamp(Number(event.target.value), 0, centerYMax);
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id ? { ...item, centerY: nextCenterY } : item,
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
                                const nextOpacity = clamp(Number(event.target.value) / 100, 0.05, 1);
                                setCutLayers((prev) =>
                                  prev.map((item) =>
                                    item.id === layer.id ? { ...item, opacity: nextOpacity } : item,
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
                                      ? { ...item, rotation: (nextDeg + 360) % 360 }
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
                                          rotation: ((item.rotation || 0) - 5 + 360) % 360,
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
                                          rotation: ((item.rotation || 0) + 5 + 360) % 360,
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
                                    item.id === layer.id ? { ...item, flipX: !item.flipX } : item,
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
                                    item.id === layer.id ? { ...item, flipY: !item.flipY } : item,
                                  ),
                                )
                              }
                              className="h-8 w-8"
                            />
                            <IconButton
                              icon="trash"
                              label="Hapus Layer"
                              onClick={() => {
                                setCutLayers((prev) => prev.filter((item) => item.id !== layer.id));
                                if (selectedCutLayerId === layer.id) {
                                  setSelectedCutLayerId(null);
                                }
                              }}
                              tone="rose"
                              className="h-8 w-8"
                            />
                            <IconButton
                              icon={layer.lockScale ? "lock" : "unlock"}
                              label={layer.lockScale ? "Unlock Scale" : "Lock Scale"}
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
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div
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
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Kalibrasi</span>
              <InfoTooltip text="Mode garis real: tarik garis referensi + nilai aktual. Mode zoom %: isi mm/px pada 100% lalu masukkan zoom source (mis. 100, 90, 75)." />
            </div>
            <div className="text-[11px] text-slate-600">
              {calibrationMode === "line"
                ? hasCalibration
                  ? `Selected: ${formatMeasurementFromPx(selectedLengthPx)}`
                  : "Selected: belum dikalibrasi"
                : "Mode zoom % aktif (tanpa garis referensi)."}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setCalibrationMode("line")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  calibrationMode === "line"
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
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
              >
                Zoom %
              </button>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Zoom Source
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={sourceZoomPercent}
                  onChange={(event) => setSourceZoomPercent(event.target.value)}
                  className="w-[84px] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                />
                <span className="text-xs text-slate-600">%</span>
                <button
                  type="button"
                  onClick={() => setSourceZoomPercent("100")}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setSourceZoomPercent("90")}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  90%
                </button>
              </div>
            </div>
            {calibrationMode === "line" ? (
              <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Nilai</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualMmInput}
                  onChange={(event) => setActualMmInput(event.target.value)}
                  className="w-[92px] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                />
                <select
                  value={actualUnit}
                  onChange={(event) => setActualUnit(event.target.value)}
                  className="w-[62px] rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs"
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-cyan-700">
                  mm/px @100%
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={mmPerPixelAt100Input}
                  onChange={(event) => setMmPerPixelAt100Input(event.target.value)}
                  className="w-[120px] rounded-md border border-cyan-300 bg-white px-2 py-1 text-xs"
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
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
              <div>{calibrationQuality.detail}</div>
            </div>
            <div className="flex gap-1.5">
              <IconButton
                icon="preset"
                label="Preset 13 cm"
                onClick={() => {
                  setActualMmInput("13");
                  setActualUnit("cm");
                }}
                disabled={calibrationMode !== "line"}
                className="h-8 w-8"
              />
              <IconButton
                icon="saveCal"
                label="Simpan Kalibrasi"
                onClick={applyCalibration}
                disabled={calibrationMode === "line" ? !selectedLine : false}
                tone="emerald"
                className="h-8 w-8"
              />
            </div>
            <div className="text-[11px] text-slate-600">
              {hasCalibration ? `Aktif (${measurementUnit})` : "Belum aktif"}
            </div>
          </div>

          <div className="order-1 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5" style={{ order: 1 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="history" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Workflow</span>
              <InfoTooltip text="Urutan pakai: Upload -> Kalibrasi -> Measure -> Export. Step aktif otomatis mengikuti progres." />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                {
                  id: 1,
                  label: "Upload",
                  done: Boolean(image),
                  onClick: () => {
                    setMobileControlsOpen(true);
                    document.getElementById("xray-upload")?.click();
                  },
                },
                {
                  id: 2,
                  label: "Calib",
                  done: hasCalibration,
                  onClick: () => focusCalibrationStep(),
                },
                {
                  id: 3,
                  label: "Measure",
                  done: measurementEntityCount > 0,
                  onClick: () => {
                    if (!hasCalibration) {
                      focusCalibrationStep("Selesaikan kalibrasi dulu sebelum measurement.");
                      return;
                    }
                    focusMeasureStep();
                  },
                },
                {
                  id: 4,
                  label: "Export",
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
                    {step.id}. {step.label}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-600">
              Step aktif: {workflowStep}/4 | Measurement: {measurementEntityCount}
            </div>
          </div>

          <div className="hidden" style={{ order: 5 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="camera" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Measure</span>
              <InfoTooltip text="Line preset: Normal, HKA, Offset, Femoral Offset, Global Offset, LLD. Circle lebih mudah: drag area dalam untuk pindah, drag tepi untuk resize, atau pakai slider diameter." />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Total: {lines.length + angles.length + circles.length + hkaSets.length}</span>
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
                onClick={() => handleLinePresetChange("hka")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  linePreset === "hka"
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                HKA
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
                <div className="mb-1 font-medium text-violet-800">Adjust Circle Diameter</div>
                <div className="mb-1">
                  Diameter:{" "}
                  {mmPerPixel !== null
                    ? `${measurementUnit === "cm"
                        ? ((selectedCircle.radius * 2 * mmPerPixel) / 10).toFixed(2)
                        : (selectedCircle.radius * 2 * mmPerPixel).toFixed(2)} ${measurementUnit}`
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
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              <IconButton
                icon={isSelectedLineLocked ? "unlock" : "lock"}
                label={isSelectedLineLocked ? "Unlock Selected" : "Lock Selected"}
                onClick={toggleSelectedLineLock}
                disabled={!selectedLine}
                tone="amber"
              />
              <IconButton
                icon="trash"
                label="Hapus Measurement Terpilih"
                onClick={removeSelectedLine}
                disabled={!selectedLine && !selectedAngle && !selectedCircle && !selectedHka}
                tone="rose"
              />
              <IconButton
                icon="clear"
                label="Clear Measurement"
                onClick={clearMeasurementLines}
                tone="rose"
              />
              <IconButton
                icon="reset"
                label="Reset Kalibrasi"
                onClick={resetCalibration}
                disabled={!hasCalibration}
                tone="amber"
              />
              <IconButton
                icon="reset"
                label="Reset Semua"
                onClick={() => {
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
                  setContrast(100);
                  setLevel(100);
                  setRotation(0);
                  setFlipX(false);
	                  setFlipY(false);
	                  setMeasurementUnit("cm");
	                  setLinePreset("normal");
	                  setPlanNote("");
	                  setPlanSteps([]);
	                  if (imageWidth && imageHeight) {
                    setCropRect({ x: 0, y: 0, width: imageWidth, height: imageHeight });
                  }
                  nextAngleIdRef.current = 1;
                  nextCircleIdRef.current = 1;
                  nextHkaIdRef.current = 1;
                  nextCutLayerIdRef.current = 1;
                  resetHistoryStacks();
                  setTool("draw");
                  setNotice("Semua pengaturan di-reset.");
                }}
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
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
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
              <div className="mb-1 font-medium text-slate-700">Inventory Template / Fragment</div>
              {templateInventoryRows.length === 0 ? (
                <div>Belum ada template atau fragment.</div>
              ) : (
                <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                  {templateInventoryRows.map((row) => (
                    <div key={`${row.kind}-${row.id}`} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {row.kind}: {row.name}
                      </span>
                      <span className="shrink-0 text-slate-500">{row.size}</span>
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
                    <div key={step.id} className="border-b border-slate-100 py-1 last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">{step.title}</span>
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

          <p className="order-11 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" style={{ order: 11 }}>
            {notice}
          </p>

          <div className="order-12 flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5" style={{ order: 12 }}>
            <div className="flex items-center gap-1.5">
              <Icon name="cloudOff" className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Story</span>
              <InfoTooltip text="Auto-save aktif. Data edit tersimpan lokal di browser, tetap bisa dilihat kembali setelah keluar/offline." />
            </div>
            <div className="flex gap-1.5">
              <IconButton icon="save" label="Simpan Story Sekarang" onClick={saveStoryNow} />
              <IconButton icon="trash" label="Hapus Story Lokal" onClick={clearSavedStory} tone="rose" />
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
          </div>
        </aside>

        <aside
          className={`order-3 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 ${
            mobileControlsOpen ? "flex max-h-[56vh] overflow-y-auto" : "hidden"
          } lg:flex lg:max-h-[calc(100vh-132px)] lg:overflow-y-auto`}
        >
          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              {
                id: "tool",
                label: "TOOL",
                activeClass: "border-cyan-700 bg-cyan-700 text-white",
                idleClass: "border-cyan-200 bg-cyan-50 text-cyan-800",
              },
              {
                id: "measure",
                label: "MEASURE",
                activeClass: "border-emerald-700 bg-emerald-700 text-white",
                idleClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
              },
              {
                id: "planning",
                label: "Planning",
                activeClass: "border-amber-700 bg-amber-700 text-white",
                idleClass: "border-amber-200 bg-amber-50 text-amber-800",
              },
            ].map((tab) => {
              const isActive = activeRightPanel === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveRightPanel(tab.id)}
                  className={`rounded-md border px-2 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${
                    isActive ? tab.activeClass : tab.idleClass
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeRightPanel === "tool" ? (
            <div className="flex flex-col gap-2 rounded-lg border border-cyan-200 bg-cyan-50/40 p-2.5">
              <div className="flex items-center gap-1.5">
                <Icon name="camera" className="h-4 w-4 text-cyan-700" />
                <span className="text-xs font-semibold uppercase tracking-wide text-cyan-900">
                  Tool
                </span>
                <InfoTooltip text="Ikon tool: Draw, Pan, Cut, Angle, Circle/Diameter, Auto HKA. Shortcut: D/P/C/A/O/H, Delete, Ctrl/Cmd+Z/Y." />
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 lg:grid-cols-4">
                <ToolIconButton
                  icon="draw"
                  label="Draw Line"
                  onClick={() => handleToolChange("draw")}
                  active={tool === "draw"}
                />
                <ToolIconButton
                  icon="pan"
                  label="Pan"
                  onClick={() => handleToolChange("pan")}
                  active={tool === "pan"}
                />
                <ToolIconButton
                  icon="cut"
                  label="Cut / Crop"
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
                  label="Auto HKA Tool"
                  onClick={() => handleToolChange("hkaAuto")}
                  active={tool === "hkaAuto"}
                />
                <ToolIconButton icon="zoomIn" label="Zoom In" onClick={() => zoomBy(1.15)} />
                <ToolIconButton icon="zoomOut" label="Zoom Out" onClick={() => zoomBy(1 / 1.15)} />
                <ToolIconButton icon="fit" label="Fit to Screen" onClick={fitImageToViewport} />
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
          ) : null}

          {activeRightPanel === "measure" ? (
            <div
              ref={measurePanelRef}
              className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon name="camera" className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                  Measure
                </span>
                <InfoTooltip text="Line preset: Normal, HKA, Offset, Femoral Offset, Global Offset, LLD. Circle lebih mudah: drag area dalam untuk pindah, drag tepi untuk resize, atau pakai slider diameter." />
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-900">
                <span>Total: {lines.length + angles.length + circles.length + hkaSets.length}</span>
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
                  onClick={() => handleLinePresetChange("hka")}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    linePreset === "hka"
                      ? "border-cyan-600 bg-cyan-600 text-white"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  HKA
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
                <div className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-900">
                  Unit hasil
                </div>
                <select
                  value={measurementUnit}
                  onChange={(event) => setMeasurementUnit(event.target.value)}
                  className="rounded-md border border-emerald-300 bg-white px-1.5 py-1 text-xs text-slate-700"
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
              {selectedCircle ? (
                <div className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] text-slate-700">
                  <div className="mb-1 font-medium text-violet-800">Adjust Circle Diameter</div>
                  <div className="mb-1">
                    Diameter:{" "}
                    {mmPerPixel !== null
                      ? `${measurementUnit === "cm"
                          ? ((selectedCircle.radius * 2 * mmPerPixel) / 10).toFixed(2)
                          : (selectedCircle.radius * 2 * mmPerPixel).toFixed(2)} ${measurementUnit}`
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
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-5">
                <IconButton
                  icon={isSelectedLineLocked ? "unlock" : "lock"}
                  label={isSelectedLineLocked ? "Unlock Selected" : "Lock Selected"}
                  onClick={toggleSelectedLineLock}
                  disabled={!selectedLine}
                  tone="amber"
                />
                <IconButton
                  icon="trash"
                  label="Hapus Measurement Terpilih"
                  onClick={removeSelectedLine}
                  disabled={!selectedLine && !selectedAngle && !selectedCircle && !selectedHka}
                  tone="rose"
                />
                <IconButton
                  icon="clear"
                  label="Clear Measurement"
                  onClick={clearMeasurementLines}
                  tone="rose"
                />
                <IconButton
                  icon="reset"
                  label="Reset Kalibrasi"
                  onClick={resetCalibration}
                  disabled={!hasCalibration}
                  tone="amber"
                />
                <IconButton
                  icon="reset"
                  label="Reset Semua"
                  onClick={() => {
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
                    setContrast(100);
                    setLevel(100);
                    setRotation(0);
                    setFlipX(false);
                    setFlipY(false);
                    setMeasurementUnit("cm");
                    setLinePreset("normal");
                    setPlanNote("");
                    setPlanSteps([]);
                    if (imageWidth && imageHeight) {
                      setCropRect({ x: 0, y: 0, width: imageWidth, height: imageHeight });
                    }
                    nextAngleIdRef.current = 1;
                    nextCircleIdRef.current = 1;
                    nextHkaIdRef.current = 1;
                    nextCutLayerIdRef.current = 1;
                    resetHistoryStacks();
                    setTool("draw");
                    setNotice("Semua pengaturan di-reset.");
                  }}
                />
              </div>
              <div className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-emerald-900">
                <div>Leg package</div>
                <div>Femoral Offset: {legPackageSummary.femoralMean}</div>
                <div>Global Offset: {legPackageSummary.globalMean}</div>
                <div>LLD: {legPackageSummary.lldDelta}</div>
              </div>
            </div>
          ) : null}

          {activeRightPanel === "planning" ? (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
              <div className="flex items-center gap-1.5">
                <Icon name="package" className="h-4 w-4 text-amber-700" />
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Planning
                </span>
                <InfoTooltip text="Simpan snapshot rencana seperti aplikasi templating: measurement, fragment, implant/template, dan catatan tiap tahap." />
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px] text-amber-900">
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
                <div className="mb-1 font-medium text-amber-950">Inventory Template / Fragment</div>
                {templateInventoryRows.length === 0 ? (
                  <div>Belum ada template atau fragment.</div>
                ) : (
                  <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                    {templateInventoryRows.map((row) => (
                      <div key={`${row.kind}-${row.id}`} className="flex justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {row.kind}: {row.name}
                        </span>
                        <span className="shrink-0 text-amber-700">{row.size}</span>
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
                      <div key={step.id} className="border-b border-amber-100 py-1 last:border-b-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-amber-950">{step.title}</span>
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
                      </div>
                    ))
                )}
              </div>
            </div>
          ) : null}
        </aside>

        <div className="order-1 rounded-xl border border-slate-200 bg-white p-2.5 lg:order-2">
          <div className={`grid gap-2 ${compareMode ? "lg:grid-cols-2" : "grid-cols-1"}`}>
            <div
              ref={containerRef}
              className="relative h-[58vh] min-h-[340px] w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-950/95 sm:h-[68vh] sm:min-h-[420px] lg:h-[calc(100vh-170px)]"
            >
              <div className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-md border border-slate-600/70 bg-slate-900/70 p-1 backdrop-blur lg:hidden">
                <ToolIconButton
                  icon="draw"
                  label="Draw Line"
                  onClick={() => handleToolChange("draw")}
                  active={tool === "draw"}
                  className="h-8 w-8 border-slate-500"
                />
                <ToolIconButton
                  icon="pan"
                  label="Pan"
                  onClick={() => handleToolChange("pan")}
                  active={tool === "pan"}
                  className="h-8 w-8 border-slate-500"
                />
                <ToolIconButton
                  icon="cut"
                  label="Cut"
                  onClick={() => handleToolChange("cut")}
                  active={tool === "cut"}
                  className="h-8 w-8 border-slate-500"
                />
                <IconButton
                  icon={mobileControlsOpen ? "close" : "menu"}
                  label={mobileControlsOpen ? "Tutup Kontrol" : "Buka Kontrol"}
                  onClick={() => setMobileControlsOpen((prev) => !prev)}
                  active={mobileControlsOpen}
                  className="h-8 w-8 border-slate-500"
                />
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
                        interactionRef.current.mode === "move-cut-layer" ||
                        interactionRef.current.mode === "move-circle-center"
                      ? "cursor-grabbing"
                      : interactionRef.current.mode === "move-handle" ||
                          interactionRef.current.mode === "resize-cut-layer" ||
                          interactionRef.current.mode === "move-angle-handle" ||
                          interactionRef.current.mode === "move-circle-radius" ||
                          interactionRef.current.mode === "move-hka-handle"
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
                className="relative h-[58vh] min-h-[340px] w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-950/95 sm:h-[68vh] sm:min-h-[420px] lg:h-[calc(100vh-170px)]"
              >
                <canvas ref={compareCanvasRef} className="absolute inset-0" />
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="rounded bg-slate-100 px-2 py-0.5">Zoom {(view.scale * 100).toFixed(0)}%</span>
            <span className="rounded bg-slate-100 px-2 py-0.5">
              {tool === "draw"
                ? "Draw"
                : tool === "pan"
                  ? "Pan"
                  : tool === "cut"
                    ? "Cut"
                    : tool === "angle"
                      ? "Angle"
                      : tool === "circle"
                        ? "Circle"
                        : "Auto HKA"}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5">
              {hasCalibration ? measurementUnit : "uncalibrated"}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5">
              Calib: {calibrationMode === "line" ? "Line" : "Zoom%"}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5">
              Undo: {historyState.undo} | Redo: {historyState.redo}
            </span>
            {compareMode ? (
              <span className="rounded bg-cyan-100 px-2 py-0.5 text-cyan-800">Compare ON</span>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
