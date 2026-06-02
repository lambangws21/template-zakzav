"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  STEM_LIBRARY,
  ImplantLibraryItem,
  ImplantCanvasObject,
  TemplatingCanvasObject,
} from "@/components/digitalTemplating/implantLibrary";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  FlipHorizontal,
  FlipVertical,
  Grab,
  Keyboard,
  Lock,
  Plus,
  Ruler as RulerIcon,
  RotateCcwIcon,
  RotateCw,
  Redo2,
  Settings2,
  Trash,
  Undo2,
  Unlock,
  X,
  EyeOffIcon,
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { driver } from "driver.js";
import type { DriveStep, Driver } from "driver.js";
import { TemplatingStage } from "@/components/digitalTemplating/viewer/components/TemplatingStage";
import { ImplantModal } from "@/components/digitalTemplating/viewer/components/ImplantModal";
import { SimpleViewerOverlay } from "@/components/digitalTemplating/viewer/components/SimpleViewerOverlay";
import { DraggablePanel } from "@/components/digitalTemplating/viewer/components/DraggablePanel";
import { ShortcutsOverlay } from "@/components/digitalTemplating/viewer/components/ShortcutsOverlay";
import {
  AHKA_COLOR,
  ANGLE_COLOR,
  ANGLE_FONT_SIZE,
  ANGLE_LABEL_STROKE_WIDTH,
  ANGLE_POINT_RADIUS,
  ANGLE_STROKE_WIDTH,
  CALIBRATION_STORAGE_KEY,
  DRAW_LINE_COLOR,
  LLD_COLOR,
  MEASURE_FONT_SIZE,
  MEASURE_HANDLE_RADIUS,
  MEASURE_LABEL_STROKE_WIDTH,
  MEASURE_STROKE_WIDTH,
  OFFSET_COLOR,
  RULER_COLOR,
  SESSION_STORAGE_KEY,
  TIBIAL_CUT_COLOR,
  TIBIAL_SLOPE_COLOR,
  TOUR_STORAGE_KEY,
  VALGUS_CUT_COLOR,
  XRAY_BASE_HEIGHT,
  XRAY_BASE_WIDTH,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  collapseVariants,
} from "@/components/digitalTemplating/viewer/constants";
import {
  CanvasMode,
  XrayTransform,
  clampStagePoint,
  createId,
  distancePointToSegmentSq,
  getXrayTransform,
} from "@/components/digitalTemplating/viewer/utils";
import type {
  AhkaMeasurement,
  AngleMeasurement,
  Annotation,
  CalibrationPreset,
  CorMarker,
  CutoutRect,
  DrawLine,
  FreehandStroke,
  HistoryState,
  LldMeasurement,
  MeasurementHandle,
  MeasurementRow,
  OffsetMeasurement,
  PointFillMode,
  PersistedTemplatingSession,
  RulerMeasurement,
  Side,
  TibialCutLine,
  TibialSlopeLine,
  ValgusCutLine,
} from "@/components/digitalTemplating/viewer/types";
import { useTemplatingHistory } from "@/components/digitalTemplating/viewer/hooks/useTemplatingHistory";
import { useImageCache } from "@/components/digitalTemplating/viewer/hooks/useImageCache";
import { useCalibrationPresets } from "@/components/digitalTemplating/viewer/hooks/useCalibrationPresets";
import { MB, TB } from "@/components/digitalTemplating/viewer/components/ui/Buttons";
import {
  useKneePlanningActions,
  useKneePlanningState,
} from "@/components/digitalTemplating/viewer/hooks/useKneePlanningTools";

type ScaleDir = "top" | "bottom" | "left" | "right";
type GroupedLibrary = Record<
  "stem" | "cup" | "knee",
  Record<string, ImplantLibraryItem[]>
>;
type CameraFit = "cover" | "contain";
type CameraZoomMode = "hardware" | "digital";
type CutoutShape = "rect" | "circle" | "polygon";

const SCALE_HANDLES: {
  dir: ScaleDir;
  x: string;
  y: string;
}[] = [
  { dir: "top", x: "50%", y: "-4px" },
  { dir: "bottom", x: "50%", y: "100%" },
  { dir: "left", x: "-4px", y: "50%" },
  { dir: "right", x: "100%", y: "50%" },
];

// (constants + helpers moved to `viewer/constants.ts` and `viewer/utils.ts`)

type PanelSectionKey = "imaging" | "calibration" | "tools" | "overview";

type PinchGesture = {
  active: boolean;
  targetId: string | null;
  pointers: Map<number, { x: number; y: number }>;
  startDistance: number;
  startAngle: number;
  startScaleX: number;
  startScaleY: number;
  startRotation: number;
  startCenter: { x: number; y: number };
  startPosition: { x: number; y: number };
  lockAspect: boolean;
};

/* =====================================================
   IMPLANT TEMPLATING CANVAS – UI/UX REFACTOR
   LOGIC: UNCHANGED
   ===================================================== */

export default function ImplantTemplatingCanvas() {
  const stageRef = useRef<HTMLDivElement>(null);
  const last = useRef({ x: 0, y: 0 });
  const captureRef = useRef<HTMLElement | null>(null);
  const driverRef = useRef<Driver | null>(null);
  const tourAutoStarted = useRef(false);
  const panHoldRef = useRef<{ active: boolean; prev: boolean }>({
    active: false,
    prev: false,
  });

  const SNAP_ANGLES = [0, 90, -90, 180, -180];
  const SNAP_THRESHOLD = 5;

  function snapAngle(angle: number) {
    for (const a of SNAP_ANGLES) {
      if (Math.abs(angle - a) <= SNAP_THRESHOLD) return a;
    }
    return angle;
  }

  const inferLegSide = useCallback((knee: { x: number; y: number } | null | undefined): Side => {
    if (!knee) return "Right";
    return knee.x < XRAY_BASE_WIDTH / 2 ? "Left" : "Right";
  }, []);

  const [initialSession] = useState<PersistedTemplatingSession | null>(() => {
    if (typeof window === "undefined") return null;
    let raw: string | null = null;
    try {
      raw =
        localStorage.getItem(SESSION_STORAGE_KEY) ??
        sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedTemplatingSession> & {
        v?: number;
      };
      if (!parsed || parsed.v !== 1) return null;
      const parsedCutout = (parsed as any).cutout ?? null;
      const parsedAhka = (parsed as any).ahkaMeasurements;
      const parsedStrokes = (parsed as any).strokes;
      const normalizedStrokes: FreehandStroke[] = Array.isArray(parsedStrokes)
        ? parsedStrokes
            .filter((s: any) => s && Array.isArray(s.points))
            .map((s: any) => ({
              ...s,
              kind: s.kind === "trace" ? "trace" : "pencil",
              points: s.points.map((p: any) => ({
                x: Number(p?.x ?? 0),
                y: Number(p?.y ?? 0),
              })),
              strokeWidth: Number(s.strokeWidth ?? 2),
            }))
        : [];
      const parsedCorMarkers = (parsed as any).corMarkers;
      const normalizedCorMarkers: CorMarker[] = Array.isArray(parsedCorMarkers)
        ? parsedCorMarkers
            .filter((m: any) => m && m.point)
            .map((m: any) => ({
              ...m,
              point: {
                x: Number(m.point?.x ?? 0),
                y: Number(m.point?.y ?? 0),
              },
            }))
        : [];
      const normalizedAhka: AhkaMeasurement[] = Array.isArray(parsedAhka)
        ? parsedAhka.map((m: any) => ({
            ...m,
            side:
              m?.side ??
              (typeof m?.knee?.x === "number" && m.knee.x < XRAY_BASE_WIDTH / 2
                ? "Left"
                : "Right"),
          }))
        : [];
      return {
        ...(parsed as PersistedTemplatingSession),
        ahkaMeasurements: normalizedAhka.length
          ? normalizedAhka
          : ((parsed as PersistedTemplatingSession).ahkaMeasurements ?? []),
        strokes: normalizedStrokes.length
          ? normalizedStrokes
          : ((parsed as PersistedTemplatingSession).strokes ?? []),
        corMarkers: normalizedCorMarkers.length
          ? normalizedCorMarkers
          : ((parsed as PersistedTemplatingSession).corMarkers ?? []),
        cutout: parsedCutout
          ? { ...parsedCutout, shape: parsedCutout.shape ?? "circle" }
          : null,
      };
    } catch {
      return null;
    }
  });

  /* ================= BACKGROUND ================= */
  const [background, setBackground] = useState<string | null>(
    initialSession?.background ?? null
  );
  const [xrayContrast, setXrayContrast] = useState(
    initialSession?.xrayContrast ?? 1
  );
  const [zoom, setZoom] = useState(initialSession?.zoom ?? 1);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>(
    initialSession?.canvasMode ?? "fit"
  );
  const [viewPan, setViewPan] = useState(
    initialSession?.viewPan ?? { x: 0, y: 0 }
  );
  const [panMode, setPanMode] = useState(false);
  const [cutout, setCutout] = useState<CutoutRect | null>(
    initialSession?.cutout ?? null
  );
  const [cutoutShape, setCutoutShape] = useState<CutoutShape>(
    (initialSession?.cutout?.shape as CutoutShape) ?? "circle"
  );
  const [cutoutMode, setCutoutMode] = useState(false);
  const [cutoutAnchor, setCutoutAnchor] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cutoutDraft, setCutoutDraft] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cutoutPolyPoints, setCutoutPolyPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [cutoutPolyCursor, setCutoutPolyCursor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const cutoutDragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    kind: "move" | "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w" | null;
    startPoint: { x: number; y: number } | null;
    startRect: CutoutRect | null;
  }>({ active: false, pointerId: null, kind: null, startPoint: null, startRect: null });

  /* ================= OBJECTS ================= */
  const [objects, setObjects] = useState<TemplatingCanvasObject[]>(
    initialSession?.objects ?? []
  );
  const [activeId, setActiveId] = useState<string | null>(
    initialSession?.activeId ?? null
  );
  const active = objects.find((o) => o.id === activeId);
  const scaleScrubRef = useRef(false);

  /* ================= UI ================= */
  const [dragging, setDragging] = useState(false);
  const [openImplantModal, setOpenImplantModal] = useState(false);
  const [anatomyMode, setAnatomyMode] = useState<"hip" | "knee">("knee");
  const [uiMode, setUiMode] = useState<"simple" | "advance">("simple");
  const simpleViewEnabled = uiMode === "simple";
  const simpleUploadInputRef = useRef<HTMLInputElement>(null);
  const [mobileToolOpen, setMobileToolOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const autoStartTour = true;
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraFit, setCameraFit] = useState<CameraFit>("cover");
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraZoomMode, setCameraZoomMode] =
    useState<CameraZoomMode>("digital");
  const [cameraZoomRange, setCameraZoomRange] = useState(() => ({
    min: 1,
    max: 3,
    step: 0.1,
  }));
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordRafRef = useRef<number | null>(null);
  const coverMode = cameraMode && cameraFit === "cover";
  const toggleShortcuts = useCallback(() => {
    setShowShortcuts((prev) => !prev);
  }, []);
  const { ensureImageLoaded, getCachedImage } = useImageCache();
  const [xraySourceScale, setXraySourceScale] = useState(
    initialSession?.xraySourceScale ?? 1
  );

  /* ================= CALIBRATION ================= */
  const [calStart, setCalStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [calEnd, setCalEnd] = useState<{ x: number; y: number } | null>(null);
  const [realMm, setRealMm] = useState(initialSession?.realMm ?? 100);
  const [pixelsPerMm, setPixelsPerMm] = useState<number | null>(() => {
    const raw = (initialSession as any)?.pixelsPerMm;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
    const legacyMmPerPixel = (initialSession as any)?.mmPerPixel;
    if (
      typeof legacyMmPerPixel === "number" &&
      Number.isFinite(legacyMmPerPixel) &&
      legacyMmPerPixel > 0
    )
      return 1 / legacyMmPerPixel;
    return null;
  });
  const [xrayMagnificationFactor, setXrayMagnificationFactor] = useState(() => {
    const raw = initialSession?.xrayMagnificationFactor;
    if (typeof raw !== "number" || Number.isNaN(raw) || raw <= 0) return 1;
    return raw;
  });
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [syncScaleMode, setSyncScaleMode] = useState(false);
  const [useRealScale, setUseRealScale] = useState(
    initialSession?.useRealScale ?? false
  );
  const {
    presetName,
    setPresetName,
    calibrationPresets,
    loadCalibrationPresets,
    saveCalibrationPreset,
    applyCalibrationPreset,
    removeCalibrationPreset,
  } = useCalibrationPresets({
    realMm,
    setRealMm,
    pixelsPerMm,
    setPixelsPerMm,
    useRealScale,
    setUseRealScale,
    toast,
  });

  /* ================= MEASURE ================= */
  const [rulerMode, setRulerMode] = useState(false);
  const [measurements, setMeasurements] = useState<RulerMeasurement[]>(
    initialSession?.measurements ?? []
  );
  const [rulerAnchor, setRulerAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [rulerDraft, setRulerDraft] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lldMode, setLldMode] = useState(false);
  const [lldMeasurements, setLldMeasurements] = useState<LldMeasurement[]>(
    initialSession?.lldMeasurements ?? []
  );
  const [lldAnchor, setLldAnchor] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lldDraft, setLldDraft] = useState<{ x: number; y: number } | null>(
    null
  );
  const [offsetMode, setOffsetMode] = useState(false);
  const [offsetMeasurements, setOffsetMeasurements] = useState<
    OffsetMeasurement[]
  >(initialSession?.offsetMeasurements ?? []);
  const [offsetAnchor, setOffsetAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [offsetDraft, setOffsetDraft] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [angleMode, setAngleMode] = useState(false);
  const [angleMeasurements, setAngleMeasurements] = useState<
    AngleMeasurement[]
  >(initialSession?.angleMeasurements ?? []);
  const [anglePoints, setAnglePoints] = useState<{ x: number; y: number }[]>(
    []
  );
  const [angleDraft, setAngleDraft] = useState<{ x: number; y: number } | null>(
    null
  );
  const [ahkaMode, setAhkaMode] = useState(false);
  const [ahkaMeasurements, setAhkaMeasurements] = useState<AhkaMeasurement[]>(
    initialSession?.ahkaMeasurements ?? []
  );
  const [ahkaPoints, setAhkaPoints] = useState<{ x: number; y: number }[]>([]);
  const [ahkaDraft, setAhkaDraft] = useState<{ x: number; y: number } | null>(
    null
  );
  const [annotationMode, setAnnotationMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>(
    initialSession?.annotations ?? []
  );
  const [annotationDraft, setAnnotationDraft] = useState<{
    id?: string;
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawLines, setDrawLines] = useState<DrawLine[]>(
    initialSession?.drawLines ?? []
  );
  const [traceMode, setTraceMode] = useState(false);
  const [pencilMode, setPencilMode] = useState(false);
  const [corMode, setCorMode] = useState(false);
  const [strokes, setStrokes] = useState<FreehandStroke[]>(
    initialSession?.strokes ?? []
  );
  const [corMarkers, setCorMarkers] = useState<CorMarker[]>(
    initialSession?.corMarkers ?? []
  );
  const [drawAnchor, setDrawAnchor] = useState<{ x: number; y: number } | null>(
    null
  );
  const [drawDraft, setDrawDraft] = useState<{ x: number; y: number } | null>(
    null
  );
  const [strokeDraftPoints, setStrokeDraftPoints] = useState<
    { x: number; y: number }[] | null
  >(null);
  const [hoverMoveHint, setHoverMoveHint] = useState(false);
  const [drawLineStrokeWidth, setDrawLineStrokeWidth] = useState(
    initialSession?.ui?.drawLineStrokeWidth ?? 2
  );
  const [ahkaStrokeWidth, setAhkaStrokeWidth] = useState(
    initialSession?.ui?.ahkaStrokeWidth ?? 1.5
  );
  const [rulerStrokeWidth, setRulerStrokeWidth] =
    useState(initialSession?.ui?.rulerStrokeWidth ?? MEASURE_STROKE_WIDTH);
  const [lldStrokeWidth, setLldStrokeWidth] = useState(
    initialSession?.ui?.lldStrokeWidth ?? MEASURE_STROKE_WIDTH
  );
  const [offsetStrokeWidth, setOffsetStrokeWidth] =
    useState(initialSession?.ui?.offsetStrokeWidth ?? MEASURE_STROKE_WIDTH);
  const [angleStrokeWidth, setAngleStrokeWidth] = useState(
    initialSession?.ui?.angleStrokeWidth ?? ANGLE_STROKE_WIDTH
  );
  const [pointRadius, setPointRadius] = useState(
    initialSession?.ui?.pointRadius ?? ANGLE_POINT_RADIUS
  );
  const [pointFillMode, setPointFillMode] = useState<PointFillMode>(
    initialSession?.ui?.pointFillMode ?? "dark"
  );
  const [pointFillColor, setPointFillColor] = useState(
    initialSession?.ui?.pointFillColor ?? "#0b0f0d"
  );
  const [traceFillColor, setTraceFillColor] = useState(
    initialSession?.ui?.traceFillColor ?? "#c084fc"
  );
  const [traceFillOpacity, setTraceFillOpacity] = useState(() => {
    const raw = initialSession?.ui?.traceFillOpacity;
    if (typeof raw !== "number" || Number.isNaN(raw)) return 0.2;
    return Math.min(1, Math.max(0, raw));
  });
  const [showRulerLabels, setShowRulerLabels] = useState(
    initialSession?.ui?.showRulerLabels ?? true
  );
  const [showLldLabels, setShowLldLabels] = useState(
    initialSession?.ui?.showLldLabels ?? true
  );
  const [showOffsetLabels, setShowOffsetLabels] = useState(
    initialSession?.ui?.showOffsetLabels ?? true
  );
  const [showAngleLabels, setShowAngleLabels] = useState(
    initialSession?.ui?.showAngleLabels ?? true
  );
  const [showAhkaLabels, setShowAhkaLabels] = useState(
    initialSession?.ui?.showAhkaLabels ?? true
  );
  const [ahkaEditLocked, setAhkaEditLocked] = useState(
    initialSession?.ui?.ahkaEditLocked ?? false
  );
  const [showValgusCutLabels, setShowValgusCutLabels] = useState(
    initialSession?.ui?.showValgusCutLabels ?? true
  );
  const [showTibialSlopeLabels, setShowTibialSlopeLabels] = useState(
    initialSession?.ui?.showTibialSlopeLabels ?? true
  );
  const [showTibialCutLabels, setShowTibialCutLabels] = useState(
    initialSession?.ui?.showTibialCutLabels ?? true
  );
  const kneeState = useKneePlanningState({
    ...initialSession?.knee,
    valgusCutLines: initialSession?.valgusCutLines ?? [],
    tibialSlopeLines: initialSession?.tibialSlopeLines ?? [],
    tibialCutLines: initialSession?.tibialCutLines ?? [],
  });
  const {
    valgusCutMode,
    setValgusCutMode,
    valgusCutAngleDeg,
    setValgusCutAngleDeg,
    valgusCutSide,
    setValgusCutSide,
    valgusCutLines,
    setValgusCutLines,
    valgusCutAnchor,
    setValgusCutAnchor,
    valgusCutDraft,
    setValgusCutDraft,
    valgusCutOffsetPx,
    setValgusCutOffsetPx,
    valgusCutStrokeWidth,
    setValgusCutStrokeWidth,
    valgusCutLineLengthPx,
    setValgusCutLineLengthPx,
    tibialSlopeMode,
    setTibialSlopeMode,
    tibialSlopeDeg,
    setTibialSlopeDeg,
    tibialPosteriorSide,
    setTibialPosteriorSide,
    tibialSlopeLines,
    setTibialSlopeLines,
    tibialSlopeAnchor,
    setTibialSlopeAnchor,
    tibialSlopeDraft,
    setTibialSlopeDraft,
    tibialSlopeOffsetPx,
    setTibialSlopeOffsetPx,
    tibialSlopeLineLengthPx,
    setTibialSlopeLineLengthPx,
    tibialSlopeStrokeWidth,
    setTibialSlopeStrokeWidth,
    tibialCutMode,
    setTibialCutMode,
    tibialCutAngleDeg,
    setTibialCutAngleDeg,
    tibialCutDirection,
    setTibialCutDirection,
    tibialCutLines,
    setTibialCutLines,
    tibialCutAnchor,
    setTibialCutAnchor,
    tibialCutDraft,
    setTibialCutDraft,
    tibialCutOffsetPx,
    setTibialCutOffsetPx,
    tibialCutLineLengthPx,
    setTibialCutLineLengthPx,
    tibialCutStrokeWidth,
    setTibialCutStrokeWidth,
  } = kneeState;

  const [search, setSearch] = useState("");
  const [openType, setOpenType] = useState<
    Record<"stem" | "cup" | "knee", boolean>
  >({
    stem: true,
    cup: false,
    knee: false,
  });
  const [openSystem, setOpenSystem] = useState<Record<string, boolean>>({});

  const applyAnatomyMode = useCallback((next: "hip" | "knee") => {
    setAnatomyMode(next);
    if (next === "hip") {
      setOpenType({ stem: true, cup: true, knee: false });
      return;
    }
    setOpenType({ stem: false, cup: false, knee: true });
  }, []);

  const openTemplateByAnatomy = useCallback(() => {
    applyAnatomyMode(anatomyMode);
    setOpenImplantModal(true);
  }, [anatomyMode, applyAnatomyMode]);

  /* ================= DRAGGABLE PANEL ================= */
  const [panelPos, setPanelPos] = useState({ x: 16, y: 16 });
  const panelRef = useRef<HTMLDivElement>(null);
  const panelAutoPlaced = useRef(false);
  const panelManualMove = useRef(false);
  const dragState = useRef({
    dragging: false,
    x: 0,
    y: 0,
  });

  const rotateDrag = useRef<{ x: number; active: boolean }>({
    x: 0,
    active: false,
  });
  const measureDrag = useRef<{
    active: boolean;
    kind: MeasurementHandle["kind"] | null;
    id: string | null;
    point: MeasurementHandle["point"] | null;
  }>({
    active: false,
    kind: null,
    id: null,
    point: null,
  });
  const drawLineMoveDrag = useRef<{
    active: boolean;
    id: string | null;
    last: { x: number; y: number } | null;
  }>({
    active: false,
    id: null,
    last: null,
  });
  const strokeDrawRef = useRef<{
    active: boolean;
    pointerId: number | null;
    kind: FreehandStroke["kind"] | null;
    id: string | null;
    last: { x: number; y: number } | null;
  }>({
    active: false,
    pointerId: null,
    kind: null,
    id: null,
    last: null,
  });
  const strokeMoveDrag = useRef<{
    active: boolean;
    id: string | null;
    last: { x: number; y: number } | null;
  }>({
    active: false,
    id: null,
    last: null,
  });
  const corMoveDrag = useRef<{
    active: boolean;
    id: string | null;
    last: { x: number; y: number } | null;
  }>({
    active: false,
    id: null,
    last: null,
  });
  const kneeLineMoveDrag = useRef<{
    active: boolean;
    kind: "valgusCut" | "tibialSlope" | "tibialCut" | null;
    id: string | null;
    last: { x: number; y: number } | null;
  }>({
    active: false,
    kind: null,
    id: null,
    last: null,
  });

  const scaleDrag = useRef<{
    startY: number;
    startScaleX: number;
    startScaleY: number;
    dir: ScaleDir | null;
  }>({
    startY: 0,
    startScaleX: 1,
    startScaleY: 1,
    dir: null,
  });
  const pinchRef = useRef<PinchGesture>({
    active: false,
    targetId: null,
    pointers: new Map(),
    startDistance: 0,
    startAngle: 0,
    startScaleX: 1,
    startScaleY: 1,
    startRotation: 0,
    startCenter: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    lockAspect: true,
  });
  const panDragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    last: { x: number; y: number } | null;
  }>({ active: false, pointerId: null, last: null });
  const canvasGestureRef = useRef<{
    active: boolean;
    pointers: Map<number, { x: number; y: number }>;
    startDistance: number;
    startZoom: number;
    startWorld: { x: number; y: number } | null;
  }>({
    active: false,
    pointers: new Map(),
    startDistance: 0,
    startZoom: 1,
    startWorld: null,
  });

  /* ================= DRAGGABLE TOOLBAR ================= */
  const [toolbarPos, setToolbarPos] = useState({ x: 16, y: 200 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolbarDrag = useRef({
    dragging: false,
    x: 0,
    y: 0,
  });

  /* ================= MEASUREMENT PANEL ================= */
  const [measurePanelOpen, setMeasurePanelOpen] = useState(
    initialSession?.ui?.measurementsPanelOpen ?? true
  );
  const [measurePanelMinimized, setMeasurePanelMinimized] = useState(false);
  const [mobileUiHidden, setMobileUiHidden] = useState(false);
  const [mobileXrayPanelOpen, setMobileXrayPanelOpen] = useState(true);
  const [measurePanelPos, setMeasurePanelPos] = useState({ x: 16, y: 420 });
  const measurePanelRef = useRef<HTMLDivElement>(null);
  const measurePanelDrag = useRef({
    dragging: false,
    x: 0,
    y: 0,
  });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [measurePanelActivityTick, setMeasurePanelActivityTick] = useState(0);

  const noteMeasurePanelActivity = useCallback(() => {
    setMeasurePanelActivityTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const mobilePanelsBootstrapped = useRef(false);
  useEffect(() => {
    if (!isMobileViewport) return;
    if (mobilePanelsBootstrapped.current) return;
    mobilePanelsBootstrapped.current = true;
    if (background || objects.length) {
      const handle = window.setTimeout(() => {
        setMobileXrayPanelOpen(false);
        setMeasurePanelOpen(false);
      }, 0);
      return () => window.clearTimeout(handle);
    }
  }, [background, isMobileViewport, objects.length]);

  const hasActiveMeasurementMode =
    rulerMode ||
    lldMode ||
    offsetMode ||
    angleMode ||
    ahkaMode ||
    drawMode ||
    traceMode ||
    pencilMode ||
    corMode ||
    cutoutMode ||
    annotationMode ||
    syncScaleMode ||
    valgusCutMode ||
    tibialSlopeMode ||
    tibialCutMode;

  const hasMeasurementDraft =
    Boolean(rulerAnchor) ||
    Boolean(lldAnchor) ||
    Boolean(offsetAnchor) ||
    Boolean(angleDraft) ||
    Boolean(anglePoints.length) ||
    Boolean(ahkaDraft) ||
    Boolean(ahkaPoints.length) ||
    Boolean(drawDraft) ||
    Boolean(drawAnchor) ||
    Boolean(strokeDraftPoints?.length) ||
    Boolean(cutoutAnchor) ||
    Boolean(cutoutDraft) ||
    Boolean(cutoutPolyPoints.length) ||
    Boolean(cutoutPolyCursor) ||
    Boolean(valgusCutAnchor) ||
    Boolean(valgusCutDraft) ||
    Boolean(tibialSlopeAnchor) ||
    Boolean(tibialSlopeDraft) ||
    Boolean(tibialCutAnchor) ||
    Boolean(tibialCutDraft) ||
    Boolean(calStart) ||
    Boolean(calEnd);

  const canMinimizeMeasurements = !hasActiveMeasurementMode && !hasMeasurementDraft;
  const measurePanelMinimizedEffective =
    measurePanelMinimized && canMinimizeMeasurements;

  const cutoutPreview = (() => {
    if (!cutoutMode) return null;

    if (cutoutShape === "polygon") {
      if (!cutoutPolyPoints.length) return null;
      const cursor = cutoutPolyCursor;
      const all = cursor ? [...cutoutPolyPoints, cursor] : cutoutPolyPoints;
      const xs = all.map((p) => p.x);
      const ys = all.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      const bounds = clampCutoutRect({
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      });
      return {
        ...bounds,
        shape: "polygon" as const,
        points: cutoutPolyPoints,
        cursor,
        closed: false,
        opacity: cutout?.opacity ?? 0.65,
      };
    }

    if (!cutoutAnchor || !cutoutDraft) return null;
    if (cutoutShape === "circle") {
      return {
        ...clampCutoutCircle(
          cutoutAnchor,
          Math.hypot(cutoutDraft.x - cutoutAnchor.x, cutoutDraft.y - cutoutAnchor.y)
        ),
        shape: "circle" as const,
        opacity: cutout?.opacity ?? 0.65,
      };
    }
    return {
      ...clampCutoutRect({
        x: Math.min(cutoutAnchor.x, cutoutDraft.x),
        y: Math.min(cutoutAnchor.y, cutoutDraft.y),
        width: Math.abs(cutoutAnchor.x - cutoutDraft.x),
        height: Math.abs(cutoutAnchor.y - cutoutDraft.y),
      }),
      shape: "rect" as const,
      opacity: cutout?.opacity ?? 0.65,
    };
  })();

  useEffect(() => {
    if (!measurePanelOpen) return;
    if (!isMobileViewport) return;
    if (measurePanelMinimized) return;
    if (!canMinimizeMeasurements) return;
    const timer = window.setTimeout(() => {
      setMeasurePanelMinimized(true);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [
    canMinimizeMeasurements,
    isMobileViewport,
    measurePanelActivityTick,
    measurePanelMinimized,
    measurePanelOpen,
  ]);

  const toggleMobileUiHidden = useCallback(() => {
    setMobileUiHidden((prev) => {
      const next = !prev;
      if (next) setMobileToolOpen(false);
      return next;
    });
  }, [setMobileToolOpen]);

  /* ================= TOOL VALUES ================= */
  const [moveStep, setMoveStep] = useState(2); // px
  const [scaleStep, setScaleStep] = useState(0.01);
  const [rotateStep, setRotateStep] = useState(1); // deg

  /* =====================================================
     HELPERS
     ===================================================== */

  const createImplant = (item: ImplantLibraryItem): ImplantCanvasObject => ({
    id: createId(),
    type: "implant",
    name: item.label,
    imageSrc: item.imageSrc,
    position: { x: 300, y: 200 },
    scaleX: 1,
    scaleY: 1,
    flipX: 1,
    flipY: 1,
    rotation: 0,
    opacity: 0.6,
    locked: true,
    scaleLocked: false,
  });

  const createShape = useCallback(
    (shape: "circle" | "square" | "triangle"): TemplatingCanvasObject => ({
      id: createId(),
      type: "shape",
      shape,
      position: { x: 300, y: 200 },
      scaleX: 1,
      scaleY: 1,
      flipX: 1,
      flipY: 1,
      rotation: 0,
      opacity: 0.9,
      locked: true,
      scaleLocked: false,
      stroke: "#a855f7",
      strokeWidth: 4,
      fill: "rgba(168,85,247,0.08)",
    }),
    []
  );

  const createImageOverlay = useCallback(
    (
      name: string,
      imageSrc: string,
      options?: Partial<Pick<TemplatingCanvasObject, "position" | "opacity">> & {
        baseWidth?: number;
        baseHeight?: number;
        paddingPx?: number;
      }
    ): TemplatingCanvasObject => ({
      id: createId(),
      type: "image",
      name,
      imageSrc,
      position: options?.position ?? { x: 300, y: 200 },
      scaleX: 1,
      scaleY: 1,
      flipX: 1,
      flipY: 1,
      rotation: 0,
      opacity: options?.opacity ?? 0.6,
      locked: true,
      scaleLocked: false,
      baseWidth: options?.baseWidth,
      baseHeight: options?.baseHeight,
      paddingPx: options?.paddingPx,
    }),
    []
  );

  const getPinchPoints = (gesture: PinchGesture) => {
    const entries = Array.from(gesture.pointers.entries()).sort(
      ([a], [b]) => a - b
    );
    if (entries.length < 2) return null;
    return [entries[0][1], entries[1][1]] as const;
  };

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, []);

  const getStagePoint = (clientX: number, clientY: number) => {
    const transform = getXrayTransform(stageRef, zoom, canvasMode, coverMode, viewPan);
    if (!transform) return null;
    if (
      clientX < transform.rect.left ||
      clientX > transform.rect.right ||
      clientY < transform.rect.top ||
      clientY > transform.rect.bottom
    ) {
      return null;
    }
    const x =
      (clientX - transform.rect.left - transform.offsetX) / transform.scale;
    const y =
      (clientY - transform.rect.top - transform.offsetY) / transform.scale;
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    return clampStagePoint({ x, y });
  };

  const distancePointToSegmentSq = (
    point: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number }
  ) => {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = point.x - a.x;
    const apy = point.y - a.y;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq === 0) {
      const dx = point.x - a.x;
      const dy = point.y - a.y;
      return dx * dx + dy * dy;
    }
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    const dx = point.x - cx;
    const dy = point.y - cy;
    return dx * dx + dy * dy;
  };

  const clampStagePoint = (p: { x: number; y: number }) => ({
    x: Math.min(XRAY_BASE_WIDTH, Math.max(0, p.x)),
    y: Math.min(XRAY_BASE_HEIGHT, Math.max(0, p.y)),
  });

  function clampCutoutRect(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    const minSize = 40;
    const width = Math.max(minSize, Math.min(XRAY_BASE_WIDTH, rect.width));
    const height = Math.max(minSize, Math.min(XRAY_BASE_HEIGHT, rect.height));
    const x = Math.min(XRAY_BASE_WIDTH - width, Math.max(0, rect.x));
    const y = Math.min(XRAY_BASE_HEIGHT - height, Math.max(0, rect.y));
    return { x, y, width, height };
  }

  function clampCutoutCircle(center: { x: number; y: number }, radius: number) {
    const minRadius = 20;
    const cx0 = Math.min(XRAY_BASE_WIDTH, Math.max(0, center.x));
    const cy0 = Math.min(XRAY_BASE_HEIGHT, Math.max(0, center.y));
    const maxRadius = Math.max(
      minRadius,
      Math.min(cx0, XRAY_BASE_WIDTH - cx0, cy0, XRAY_BASE_HEIGHT - cy0)
    );
    const r = Math.min(Math.max(minRadius, radius), maxRadius);
    const cx = Math.min(XRAY_BASE_WIDTH - r, Math.max(r, cx0));
    const cy = Math.min(XRAY_BASE_HEIGHT - r, Math.max(r, cy0));
    return { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
  }

  function buildCutoutRectFromPoints(
    a: { x: number; y: number },
    b: { x: number; y: number },
    opacity?: number
  ): CutoutRect {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const width = Math.abs(a.x - b.x);
    const height = Math.abs(a.y - b.y);
    const clamped = clampCutoutRect({ x, y, width, height });
    return {
      id: createId(),
      ...clamped,
      shape: "rect",
      opacity: opacity ?? cutout?.opacity ?? 0.65,
    };
  }

  function buildCutoutCircleFromPoints(
    center: { x: number; y: number },
    edge: { x: number; y: number },
    opacity?: number
  ): CutoutRect {
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
    const clamped = clampCutoutCircle(center, radius);
    return {
      id: createId(),
      ...clamped,
      shape: "circle",
      opacity: opacity ?? cutout?.opacity ?? 0.65,
    };
  }

  function buildCutoutPolygonFromPoints(
    points: { x: number; y: number }[],
    opacity?: number
  ): CutoutRect {
    const clampedPoints = points.map((p) => clampStagePoint(p));
    const xs = clampedPoints.map((p) => p.x);
    const ys = clampedPoints.map((p) => p.y);
    const rawMinX = Math.min(...xs);
    const rawMinY = Math.min(...ys);
    const rawMaxX = Math.max(...xs);
    const rawMaxY = Math.max(...ys);
    const minX = Math.floor(rawMinX);
    const minY = Math.floor(rawMinY);
    const maxX = Math.ceil(rawMaxX);
    const maxY = Math.ceil(rawMaxY);
    const x = Math.min(XRAY_BASE_WIDTH - 1, Math.max(0, minX));
    const y = Math.min(XRAY_BASE_HEIGHT - 1, Math.max(0, minY));
    const width = Math.max(1, Math.min(XRAY_BASE_WIDTH - x, maxX - x));
    const height = Math.max(1, Math.min(XRAY_BASE_HEIGHT - y, maxY - y));
    return {
      id: createId(),
      x,
      y,
      width,
      height,
      shape: "polygon",
      points: clampedPoints,
      opacity: opacity ?? cutout?.opacity ?? 0.65,
    };
  }

  function getCutoutHandleHit(
    point: { x: number; y: number },
    rect: CutoutRect,
    hitRadius: number
  ): "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w" | "move" | null {
    const x1 = rect.x;
    const y1 = rect.y;
    const x2 = rect.x + rect.width;
    const y2 = rect.y + rect.height;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const hitRadiusSq = hitRadius * hitRadius;
    const distSq = (x: number, y: number) => {
      const dx = point.x - x;
      const dy = point.y - y;
      return dx * dx + dy * dy;
    };

    if ((rect.shape ?? "rect") === "polygon") {
      const points = rect.points ?? [];
      if (points.length < 3) return null;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x;
        const yi = points[i].y;
        const xj = points[j].x;
        const yj = points[j].y;
        const intersect =
          yi > point.y !== yj > point.y &&
          point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-9) + xi;
        if (intersect) inside = !inside;
      }
      return inside ? "move" : null;
    }

    if ((rect.shape ?? "rect") === "circle") {
      const r = Math.min(rect.width, rect.height) / 2;
      if (distSq(cx, y1) <= hitRadiusSq) return "n";
      if (distSq(x2, cy) <= hitRadiusSq) return "e";
      if (distSq(cx, y2) <= hitRadiusSq) return "s";
      if (distSq(x1, cy) <= hitRadiusSq) return "w";
      const dx = point.x - cx;
      const dy = point.y - cy;
      if (dx * dx + dy * dy <= r * r) return "move";
      return null;
    }

    if (distSq(x1, y1) <= hitRadiusSq) return "nw";
    if (distSq(x2, y1) <= hitRadiusSq) return "ne";
    if (distSq(x1, y2) <= hitRadiusSq) return "sw";
    if (distSq(x2, y2) <= hitRadiusSq) return "se";
    if (point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2) return "move";
    return null;
  }

  const findDrawLineSegmentHit = (point: { x: number; y: number }) => {
    const transform = getXrayTransform(stageRef, zoom, canvasMode, coverMode, viewPan);
    const scale = transform?.scale ?? zoom;
    const hitRadius = Math.max(10, drawLineStrokeWidth * scale + 10) / scale;
    const hitRadiusSq = hitRadius * hitRadius;
    let bestId: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    drawLines.forEach((line) => {
      if (line.locked || line.hidden) return;
      const distSq = distancePointToSegmentSq(point, line.start, line.end);
      if (distSq > hitRadiusSq) return;
      if (distSq < bestDist) {
        bestDist = distSq;
        bestId = line.id;
      }
    });
    return bestId;
  };

  const findStrokeSegmentHit = (point: { x: number; y: number }) => {
    const transform = getXrayTransform(stageRef, zoom, canvasMode, coverMode, viewPan);
    const scale = transform?.scale ?? zoom;
    let bestId: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    const isClosedTrace = (points: { x: number; y: number }[]) => {
      if (points.length < 3) return false;
      const first = points[0];
      const last = points[points.length - 1];
      return Math.hypot(first.x - last.x, first.y - last.y) <= 14;
    };

    const isPointInPolygon = (
      p: { x: number; y: number },
      poly: { x: number; y: number }[]
    ) => {
      if (poly.length < 3) return false;
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x;
        const yi = poly[i].y;
        const xj = poly[j].x;
        const yj = poly[j].y;
        const intersect =
          yi > p.y !== yj > p.y &&
          p.x < ((xj - xi) * (p.y - yi)) / (yj - yi || 1e-9) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    strokes.forEach((stroke) => {
      if (stroke.locked || stroke.hidden) return;
      const points = stroke.points;
      if (points.length < 2) return;
      const hitRadius =
        Math.max(10, (stroke.strokeWidth ?? 2) * scale + 10) / scale;
      const hitRadiusSq = hitRadius * hitRadius;
      for (let i = 1; i < points.length; i += 1) {
        const distSq = distancePointToSegmentSq(point, points[i - 1], points[i]);
        if (distSq > hitRadiusSq) continue;
        if (distSq < bestDist) {
          bestDist = distSq;
          bestId = stroke.id;
        }
      }

      if (
        stroke.kind === "trace" &&
        bestDist !== 0 &&
        isClosedTrace(points) &&
        isPointInPolygon(point, points.slice(0, -1))
      ) {
        bestDist = 0;
        bestId = stroke.id;
      }
    });

    return bestId;
  };

  const findMeasurementHandle = (point: {
    x: number;
    y: number;
  }): MeasurementHandle | null => {
    const transform = getXrayTransform(stageRef, zoom, canvasMode, coverMode, viewPan);
    const scale = transform?.scale ?? zoom;
    const hitRadius = Math.max(10, pointRadius * scale + 8) / scale;
    const hitRadiusSq = hitRadius * hitRadius;
    let best: MeasurementHandle | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    const testPoint = (
      kind: MeasurementHandle["kind"],
      id: string,
      pointKey: MeasurementHandle["point"],
      target: { x: number; y: number }
    ) => {
      const dx = target.x - point.x;
      const dy = target.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist > hitRadiusSq) return;
      if (dist < bestDist) {
        best = { kind, id, point: pointKey };
        bestDist = dist;
      }
    };

    measurements.forEach((m) => {
      if (m.locked || m.hidden) return;
      testPoint("ruler", m.id, "start", m.start);
      testPoint("ruler", m.id, "end", m.end);
    });
    lldMeasurements.forEach((m) => {
      if (m.locked || m.hidden) return;
      testPoint("lld", m.id, "start", m.start);
      testPoint("lld", m.id, "end", m.end);
    });
    offsetMeasurements.forEach((m) => {
      if (m.locked || m.hidden) return;
      testPoint("offset", m.id, "start", m.start);
      testPoint("offset", m.id, "end", m.end);
    });
    angleMeasurements.forEach((m) => {
      if (m.locked || m.hidden) return;
      testPoint("angle", m.id, "a", m.a);
      testPoint("angle", m.id, "b", m.b);
      testPoint("angle", m.id, "c", m.c);
    });

    if (!ahkaEditLocked) {
      ahkaMeasurements.forEach((m) => {
        if (m.locked || m.hidden) return;
        testPoint("ahka", m.id, "hip", m.hip);
        testPoint("ahka", m.id, "knee", m.knee);
        testPoint("ahka", m.id, "ankle", m.ankle);
      });
    }

    valgusCutLines.forEach((line) => {
      if (line.locked || line.hidden) return;
      testPoint("valgusCut", line.id, "hip", line.hip);
      testPoint("valgusCut", line.id, "knee", line.knee);
    });

    tibialSlopeLines.forEach((line) => {
      if (line.locked || line.hidden) return;
      testPoint("tibialSlope", line.id, "prox", line.prox);
      testPoint("tibialSlope", line.id, "dist", line.dist);
    });

    tibialCutLines.forEach((line) => {
      if (line.locked || line.hidden) return;
      testPoint("tibialCut", line.id, "prox", line.prox);
      testPoint("tibialCut", line.id, "dist", line.dist);
    });

    drawLines.forEach((line) => {
      if (line.locked || line.hidden) return;
      testPoint("drawLine", line.id, "start", line.start);
      testPoint("drawLine", line.id, "end", line.end);
    });

    corMarkers.forEach((m) => {
      if (m.locked || m.hidden) return;
      testPoint("cor", m.id, "point", m.point);
    });

    return best;
  };

  const resetInteractionDrafts = useCallback(() => {
    setDragging(false);
    rotateDrag.current.active = false;
    scaleDrag.current.dir = null;
    measureDrag.current.active = false;
    drawLineMoveDrag.current = { active: false, id: null, last: null };
    strokeDrawRef.current = {
      active: false,
      pointerId: null,
      kind: null,
      id: null,
      last: null,
    };
    strokeMoveDrag.current = { active: false, id: null, last: null };
    corMoveDrag.current = { active: false, id: null, last: null };
    kneeLineMoveDrag.current = { active: false, kind: null, id: null, last: null };
    setIsCalibrating(false);
    setRulerAnchor(null);
    setRulerDraft(null);
    setLldAnchor(null);
    setLldDraft(null);
    setOffsetAnchor(null);
    setOffsetDraft(null);
    setAnglePoints([]);
    setAngleDraft(null);
    setAhkaPoints([]);
    setAhkaDraft(null);
    setValgusCutAnchor(null);
    setValgusCutDraft(null);
    setTibialSlopeAnchor(null);
    setTibialSlopeDraft(null);
    setTibialCutAnchor(null);
    setTibialCutDraft(null);
    setDrawAnchor(null);
    setDrawDraft(null);
    setStrokeDraftPoints(null);
    setAnnotationDraft(null);
    captureRef.current = null;
  }, [
    setAhkaDraft,
    setAhkaPoints,
    setAngleDraft,
    setAnglePoints,
    setAnnotationDraft,
    setDragging,
    setDrawAnchor,
    setDrawDraft,
    setIsCalibrating,
    setLldAnchor,
    setLldDraft,
    setOffsetAnchor,
    setOffsetDraft,
    setRulerAnchor,
    setRulerDraft,
    setTibialCutAnchor,
    setTibialCutDraft,
    setTibialSlopeAnchor,
    setTibialSlopeDraft,
    setValgusCutAnchor,
    setValgusCutDraft,
    setStrokeDraftPoints,
  ]);

  const { objectsRef, pushHistorySnapshot, resetHistory, undo, redo, canUndo, canRedo } =
    useTemplatingHistory({
      objects,
      setObjects,
      activeId,
      setActiveId,
      measurements,
      setMeasurements,
      lldMeasurements,
      setLldMeasurements,
      offsetMeasurements,
      setOffsetMeasurements,
      angleMeasurements,
      setAngleMeasurements,
      ahkaMeasurements,
      setAhkaMeasurements,
      drawLines,
      setDrawLines,
      strokes,
      setStrokes,
      corMarkers,
      setCorMarkers,
      annotations,
      setAnnotations,
      valgusCutLines,
      setValgusCutLines,
      tibialSlopeLines,
      setTibialSlopeLines,
      tibialCutLines,
      setTibialCutLines,
      resetInteractionDrafts,
    });

  const disableMeasurementModes = useCallback(() => {
    setRulerMode(false);
    setLldMode(false);
    setOffsetMode(false);
    setAngleMode(false);
    setAhkaMode(false);
    setCutoutMode(false);
    setValgusCutMode(false);
    setTibialSlopeMode(false);
    setTibialCutMode(false);
    setDrawMode(false);
    setTraceMode(false);
    setPencilMode(false);
    setCorMode(false);
    setAnnotationMode(false);
    setAnnotationDraft(null);
    setRulerAnchor(null);
    setRulerDraft(null);
    setLldAnchor(null);
    setLldDraft(null);
    setOffsetAnchor(null);
    setOffsetDraft(null);
    setAnglePoints([]);
    setAngleDraft(null);
    setAhkaPoints([]);
    setAhkaDraft(null);
    setValgusCutAnchor(null);
    setValgusCutDraft(null);
    setTibialSlopeAnchor(null);
    setTibialSlopeDraft(null);
    setTibialCutAnchor(null);
    setTibialCutDraft(null);
    setDrawAnchor(null);
    setDrawDraft(null);
    setStrokeDraftPoints(null);
    setCutoutAnchor(null);
    setCutoutDraft(null);
    setCutoutPolyPoints([]);
    setCutoutPolyCursor(null);
    cutoutDragRef.current = {
      active: false,
      pointerId: null,
      kind: null,
      startPoint: null,
      startRect: null,
    };
    setSyncScaleMode(false);
    setIsCalibrating(false);
    setCalStart(null);
    setCalEnd(null);
    strokeDrawRef.current = {
      active: false,
      pointerId: null,
      kind: null,
      id: null,
      last: null,
    };
    strokeMoveDrag.current = { active: false, id: null, last: null };
    corMoveDrag.current = { active: false, id: null, last: null };
  }, [
    setAhkaDraft,
    setAhkaMode,
    setAhkaPoints,
    setAngleDraft,
    setAngleMode,
    setAnglePoints,
    setAnnotationDraft,
    setAnnotationMode,
    setCalEnd,
    setCalStart,
    setDrawAnchor,
    setDrawDraft,
    setDrawMode,
    setTraceMode,
    setPencilMode,
    setCorMode,
    setStrokeDraftPoints,
    setCutoutAnchor,
    setCutoutDraft,
    setCutoutPolyPoints,
    setCutoutPolyCursor,
    setCutoutMode,
    setIsCalibrating,
    setLldAnchor,
    setLldDraft,
    setLldMode,
    setOffsetAnchor,
    setOffsetDraft,
    setOffsetMode,
    setRulerAnchor,
    setRulerDraft,
    setRulerMode,
    setSyncScaleMode,
    setTibialCutAnchor,
    setTibialCutDraft,
    setTibialCutMode,
    setTibialSlopeAnchor,
    setTibialSlopeDraft,
    setTibialSlopeMode,
    setValgusCutAnchor,
    setValgusCutDraft,
    setValgusCutMode,
  ]);

  const clampZoomValue = useCallback(
    (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value)),
    []
  );

  const clampViewPan = useCallback(
    (pan: { x: number; y: number }, zoomValue = zoom) => {
      const base = getXrayTransform(
        stageRef,
        zoomValue,
        canvasMode,
        coverMode,
        { x: 0, y: 0 }
      );
      if (!base) return pan;

      const scaledWidth = XRAY_BASE_WIDTH * base.scale;
      const scaledHeight = XRAY_BASE_HEIGHT * base.scale;
      const strictPanX = Math.max(0, (scaledWidth - base.rect.width) / 2);
      const strictPanY = Math.max(0, (scaledHeight - base.rect.height) / 2);
      const softPanX =
        strictPanX === 0 ? Math.min(220, base.rect.width * 0.28) : 0;
      const softPanY =
        strictPanY === 0 ? Math.min(220, base.rect.height * 0.28) : 0;
      const maxPanX = strictPanX + softPanX;
      const maxPanY = strictPanY + softPanY;

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, pan.x)),
        y: Math.min(maxPanY, Math.max(-maxPanY, pan.y)),
      };
    },
    [canvasMode, coverMode, stageRef, zoom]
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setViewPan({ x: 0, y: 0 });
  }, []);

  const fitToScreen = useCallback(() => {
    setCanvasMode("fit");
    setZoom(1);
    setViewPan({ x: 0, y: 0 });
  }, []);

  const setOneToOne = useCallback(() => {
    setCanvasMode("oneToOne");
    setZoom(1);
    setViewPan({ x: 0, y: 0 });
  }, []);

  const togglePanMode = useCallback(() => {
    setPanMode((prev) => {
      const next = !prev;
      if (next) disableMeasurementModes();
      return next;
    });
  }, [disableMeasurementModes]);

  const startCutoutMode = useCallback(() => {
    disableMeasurementModes();
    setPanMode(false);
    setCutoutMode(true);
  }, [disableMeasurementModes]);

  const stopCutoutMode = useCallback(() => {
    setCutoutMode(false);
    setCutoutAnchor(null);
    setCutoutDraft(null);
    setCutoutPolyPoints([]);
    setCutoutPolyCursor(null);
    cutoutDragRef.current = {
      active: false,
      pointerId: null,
      kind: null,
      startPoint: null,
      startRect: null,
    };
  }, []);

  const toggleCutoutMode = useCallback(() => {
    if (cutoutMode) stopCutoutMode();
    else startCutoutMode();
  }, [cutoutMode, startCutoutMode, stopCutoutMode]);

  const clearCutout = useCallback(() => {
    setCutout(null);
    setCutoutAnchor(null);
    setCutoutDraft(null);
    setCutoutPolyPoints([]);
    setCutoutPolyCursor(null);
    setCutoutMode(false);
    cutoutDragRef.current = {
      active: false,
      pointerId: null,
      kind: null,
      startPoint: null,
      startRect: null,
    };
  }, []);

  const setCutoutOpacity = useCallback((opacity: number) => {
    setCutout((prev) => (prev ? { ...prev, opacity } : prev));
  }, []);

  const setCutoutShapeWithUpdate = useCallback(
    (shape: CutoutShape) => {
      setCutoutShape(shape);
      if (shape === "polygon") {
        setCutout(null);
        setCutoutAnchor(null);
        setCutoutDraft(null);
        setCutoutPolyPoints([]);
        setCutoutPolyCursor(null);
        return;
      }

      setCutoutPolyPoints([]);
      setCutoutPolyCursor(null);
      setCutout((prev) => {
        if (!prev) return prev;
        if (prev.shape === "polygon") return null;
        if (shape === "rect") return { ...prev, shape: "rect" };

        const cx = prev.x + prev.width / 2;
        const cy = prev.y + prev.height / 2;
        const radius = Math.min(prev.width, prev.height) / 2;
        const minRadius = 20;
        const cx0 = Math.min(XRAY_BASE_WIDTH, Math.max(0, cx));
        const cy0 = Math.min(XRAY_BASE_HEIGHT, Math.max(0, cy));
        const maxRadius = Math.max(
          minRadius,
          Math.min(cx0, XRAY_BASE_WIDTH - cx0, cy0, XRAY_BASE_HEIGHT - cy0)
        );
        const r = Math.min(Math.max(minRadius, radius), maxRadius);
        const cxClamped = Math.min(XRAY_BASE_WIDTH - r, Math.max(r, cx0));
        const cyClamped = Math.min(XRAY_BASE_HEIGHT - r, Math.max(r, cy0));
        const next = {
          x: cxClamped - r,
          y: cyClamped - r,
          width: r * 2,
          height: r * 2,
        };
        return { ...prev, ...next, shape: "circle" };
      });
    },
    []
  );

  const createOverlayFromCutout = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!background) {
      toast({
        title: "Tidak ada X-ray",
        description: "Upload gambar X-ray dulu sebelum membuat overlay cutout.",
      });
      return;
    }
    if (cameraMode) {
      toast({
        title: "Cutout overlay hanya untuk gambar upload",
        description: "Matikan kamera untuk membuat overlay dari gambar X-ray.",
      });
      return;
    }
    if (!cutout) {
      toast({
        title: "Cutout belum dibuat",
        description: "Aktifkan Cutout lalu drag area yang ingin di-crop.",
      });
      return;
    }

    const img = await ensureImageLoaded(background);
    if (!img) {
      toast({
        title: "Gagal memuat gambar",
        description: "Coba upload ulang X-ray.",
      });
      return;
    }

    const w = Math.max(1, Math.round(cutout.width));
    const h = Math.max(1, Math.round(cutout.height));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.clearRect(0, 0, w, h);
    ctx.filter = `contrast(${xrayContrast})`;

    const shape = cutout.shape ?? cutoutShape;
    const sx = cutout.x;
    const sy = cutout.y;
    const sw = cutout.width;
    const sh = cutout.height;
    if (shape === "polygon") {
      const points = cutout.points ?? [];
      if (points.length < 3) {
        toast({
          title: "Cutout polygon belum lengkap",
          description: "Buat minimal 3 titik lalu tutup shape.",
        });
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x - cutout.x, points[0].y - cutout.y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x - cutout.x, points[i].y - cutout.y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        w,
        h
      );
      ctx.restore();
    } else if (shape === "circle") {
      ctx.save();
      const r = Math.min(w, h) / 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        w,
        h
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        w,
        h
      );
    }

    const dataUrl = canvas.toDataURL("image/png");

    disableMeasurementModes();
    pushHistorySnapshot();

    const overlay = createImageOverlay("Cutout Overlay", dataUrl, {
      position: { x: cutout.x, y: cutout.y },
      opacity: 1,
      baseWidth: w,
      baseHeight: h,
      paddingPx: 0,
    });
    setObjects((prev) => [...prev, overlay]);
    setActiveId(overlay.id);
    setCutout(null);
    setCutoutAnchor(null);
    setCutoutDraft(null);
    setCutoutPolyPoints([]);
    setCutoutPolyCursor(null);
    setCutoutMode(false);

    toast({
      title: "Overlay dibuat",
      description: "Overlay bisa di-move/rotate/scale seperti template.",
    });
  }, [
    background,
    cameraMode,
    createImageOverlay,
    cutout,
    cutoutShape,
    disableMeasurementModes,
    ensureImageLoaded,
    pushHistorySnapshot,
    xrayContrast,
  ]);

  const zoomAboutClientPoint = useCallback(
    (clientX: number, clientY: number, nextZoom: number) => {
      const current = getXrayTransform(
        stageRef,
        zoom,
        canvasMode,
        coverMode,
        viewPan
      );
      if (!current) return;
      const world = {
        x: Math.min(
          XRAY_BASE_WIDTH,
          Math.max(
            0,
            (clientX - current.rect.left - current.offsetX) / current.scale
          )
        ),
        y: Math.min(
          XRAY_BASE_HEIGHT,
          Math.max(
            0,
            (clientY - current.rect.top - current.offsetY) / current.scale
          )
        ),
      };

      const base = getXrayTransform(
        stageRef,
        nextZoom,
        canvasMode,
        coverMode,
        { x: 0, y: 0 }
      );
      if (!base) return;
      const pan = {
        x:
          clientX -
          base.rect.left -
          base.offsetX -
          world.x * base.scale,
        y:
          clientY -
          base.rect.top -
          base.offsetY -
          world.y * base.scale,
      };
      setZoom(nextZoom);
      setViewPan(clampViewPan(pan, nextZoom));
    },
    [canvasMode, clampViewPan, coverMode, viewPan, zoom]
  );

  const onStageWheel = useCallback(
    (e: React.WheelEvent) => {
      if (typeof window === "undefined") return;
      if (measurePanelDrag.current.dragging || dragState.current.dragging) return;
      e.preventDefault();
      e.stopPropagation();

      const speed = e.ctrlKey ? 0.0025 : 0.0015;
      const factor = Math.exp(-e.deltaY * speed);
      const nextZoom = clampZoomValue(zoom * factor);
      if (nextZoom === zoom) return;
      zoomAboutClientPoint(e.clientX, e.clientY, nextZoom);
    },
    [clampZoomValue, zoom, zoomAboutClientPoint]
  );

  const magnificationFactor =
    typeof xrayMagnificationFactor === "number" && xrayMagnificationFactor > 0
      ? xrayMagnificationFactor
      : 1;
  const mmPerPixel =
    typeof pixelsPerMm === "number" && pixelsPerMm > 0 ? 1 / pixelsPerMm : null;
  const effectivePixelsPerMm =
    typeof pixelsPerMm === "number" && pixelsPerMm > 0
      ? pixelsPerMm * magnificationFactor
      : null;
  const effectiveMmPerPixel =
    typeof effectivePixelsPerMm === "number" && effectivePixelsPerMm > 0
      ? 1 / effectivePixelsPerMm
      : null;

  const scaleImplantByMm = (targetMm: number) => {
    if (!active || active.type === "shape" || !effectiveMmPerPixel || active.scaleLocked)
      return;
    disableMeasurementModes();
    pushHistorySnapshot();

    // estimasi panjang pixel image
    const IMAGE_BASE_PX = 300; // sesuai <Image width={300} />

    const currentRealMm = IMAGE_BASE_PX * active.scaleX * effectiveMmPerPixel;
    const factor = targetMm / currentRealMm;

    setObjects((p) =>
      p.map((o) =>
        o.id === active.id
          ? {
              ...o,
              scaleX: o.scaleX * factor,
              scaleY: o.scaleY * factor,
              realLengthMm: targetMm,
            }
          : o
      )
    );
  };

  const addImplant = (item: ImplantLibraryItem) => {
    disableMeasurementModes();
    if (
      !objects.length &&
      !panelManualMove.current &&
      !panelAutoPlaced.current &&
      typeof window !== "undefined"
    ) {
      const margin = 16;
      const panelWidth = panelRef.current?.offsetWidth ?? 224;
      const panelHeight = panelRef.current?.offsetHeight ?? 0;
      const x = Math.max(margin, window.innerWidth - panelWidth - margin);

      setPanelPos((prev) => {
        const y = Math.min(prev.y, window.innerHeight - panelHeight - margin);
        return { x, y: Math.max(margin, y) };
      });

      panelAutoPlaced.current = true;
    }

    pushHistorySnapshot();
    const implant = createImplant(item);
    setObjects((p) => [...p, implant]);
    setActiveId(implant.id);
  };

  const addShapeOverlay = useCallback(
    (shape: "circle" | "square" | "triangle") => {
      disableMeasurementModes();
      pushHistorySnapshot();
      const overlay = createShape(shape);
      setObjects((p) => [...p, overlay]);
      setActiveId(overlay.id);
    },
    [createShape, disableMeasurementModes, pushHistorySnapshot]
  );

  const addImageOverlay = useCallback(
    (file: File) => {
      disableMeasurementModes();

      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result || "");
        if (!src) return;
        pushHistorySnapshot();
        const overlay = createImageOverlay(file.name, src);
        setObjects((p) => [...p, overlay]);
        setActiveId(overlay.id);
      };
      reader.readAsDataURL(file);
    },
    [createImageOverlay, disableMeasurementModes, pushHistorySnapshot]
  );

  const moveActive = useCallback(
    (dx: number, dy: number) => {
      if (!active) return;
      setObjects((p) =>
        p.map((o) =>
          o.id === active.id
            ? { ...o, position: { x: o.position.x + dx, y: o.position.y + dy } }
            : o
        )
      );
    },
    [active]
  );

  const moveActiveWithHistory = useCallback(
    (dx: number, dy: number) => {
      if (!active) return;
      pushHistorySnapshot();
      moveActive(dx, dy);
    },
    [active, moveActive, pushHistorySnapshot]
  );

  const scaleActive = useCallback(
    (delta: number) => {
      if (!active || active.scaleLocked) return;
      disableMeasurementModes();
      pushHistorySnapshot();
      setObjects((p) =>
        p.map((o) => {
          if (o.id !== active.id) return o;
          const v = Math.max(0.1, o.scaleX + delta);
          return o.locked
            ? { ...o, scaleX: v, scaleY: v }
            : { ...o, scaleX: v };
        })
      );
    },
    [active, disableMeasurementModes, pushHistorySnapshot]
  );

  const rotateActive = useCallback(
    (delta: number) => {
      if (!active) return;
      pushHistorySnapshot();
      const flipDirection = (active.flipX ?? 1) * (active.flipY ?? 1);
      const adjusted = flipDirection < 0 ? -delta : delta;
      setObjects((p) =>
        p.map((o) =>
          o.id === active.id ? { ...o, rotation: o.rotation + adjusted } : o
        )
      );
    },
    [active, pushHistorySnapshot]
  );

  const deleteActive = useCallback(() => {
    if (!active) return;
    pushHistorySnapshot();
    setObjects((p) => p.filter((o) => o.id !== active.id));
    setActiveId(null);
  }, [active, pushHistorySnapshot]);

  /* ================= FLIP ================= */

  const flipActiveX = useCallback(() => {
    if (!active) return;
    pushHistorySnapshot();
    setObjects((p) =>
      p.map((o) =>
        o.id === active.id
          ? { ...o, flipX: ((o.flipX ?? 1) * -1) as 1 | -1 }
          : o
      )
    );
  }, [active, pushHistorySnapshot]);

  const flipActiveY = useCallback(() => {
    if (!active) return;
    pushHistorySnapshot();
    setObjects((p) =>
      p.map((o) =>
        o.id === active.id
          ? { ...o, flipY: ((o.flipY ?? 1) * -1) as 1 | -1 }
          : o
      )
    );
  }, [active, pushHistorySnapshot]);

  const startScaleScrub = useCallback(() => {
    if (!active || active.scaleLocked) return;
    if (scaleScrubRef.current) return;
    scaleScrubRef.current = true;
    pushHistorySnapshot();
  }, [active, pushHistorySnapshot]);

  const endScaleScrub = useCallback(() => {
    scaleScrubRef.current = false;
  }, []);

  const updateActiveScale = useCallback(
    (value: number) => {
      if (!active || active.scaleLocked || value === active.scaleX) return;
      disableMeasurementModes();
      if (!scaleScrubRef.current) {
        pushHistorySnapshot();
      }
      setObjects((p) =>
        p.map((o) =>
          o.id === active.id ? { ...o, scaleX: value, scaleY: value } : o
        )
      );
      if (!scaleScrubRef.current) {
        const nextStep = Number(Math.abs(value - active.scaleX).toFixed(3));
        if (nextStep) setScaleStep(nextStep);
      }
    },
    [active, disableMeasurementModes, pushHistorySnapshot, setScaleStep]
  );

  const updateActiveRotation = useCallback(
    (value: number) => {
      if (!active) return;
      const flipDirection = (active.flipX ?? 1) * (active.flipY ?? 1);
      const displayRotation = flipDirection < 0 ? -active.rotation : active.rotation;
      const internalValue = flipDirection < 0 ? -value : value;
      if (internalValue === active.rotation) return;
      pushHistorySnapshot();
      setObjects((p) =>
        p.map((o) => (o.id === active.id ? { ...o, rotation: internalValue } : o))
      );
      const nextStep = Math.abs(value - displayRotation);
      if (nextStep) setRotateStep(nextStep);
    },
    [active, pushHistorySnapshot, setRotateStep]
  );

  const toggleActiveLock = useCallback(() => {
    if (!active) return;
    pushHistorySnapshot();
    setObjects((p) =>
      p.map((o) => (o.id === active.id ? { ...o, locked: !o.locked } : o))
    );
  }, [active, pushHistorySnapshot]);

  const toggleActiveScaleLock = useCallback(() => {
    if (!active) return;
    pushHistorySnapshot();
    setObjects((p) =>
      p.map((o) =>
        o.id === active.id ? { ...o, scaleLocked: !o.scaleLocked } : o
      )
    );
  }, [active, pushHistorySnapshot]);

  const updateActiveOpacity = useCallback(
    (value: number) => {
      if (!active) return;
      const clamped = Math.min(1, Math.max(0.1, value));
      pushHistorySnapshot();
      setObjects((p) =>
        p.map((o) => (o.id === active.id ? { ...o, opacity: clamped } : o))
      );
    },
    [active, pushHistorySnapshot]
  );

  const bringActiveToFront = useCallback(() => {
    if (!active) return;
    pushHistorySnapshot();
    setObjects((prev) => {
      const idx = prev.findIndex((o) => o.id === active.id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.push(item);
      return next;
    });
  }, [active, pushHistorySnapshot]);

  const sendActiveToBack = useCallback(() => {
    if (!active) return;
    pushHistorySnapshot();
    setObjects((prev) => {
      const idx = prev.findIndex((o) => o.id === active.id);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }, [active, pushHistorySnapshot]);

  const addRulerPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (!rulerAnchor) {
        setRulerAnchor(point);
        setRulerDraft(point);
        return;
      }

      if (typeof effectiveMmPerPixel !== "number" || effectiveMmPerPixel <= 0) {
        toast({
          title: "Kalibrasi belum diset",
          description: "Isi Canvas Resolution (mm/px) atau gunakan Sync X-ray Scale agar hasil jadi mm.",
        });
      }

      pushHistorySnapshot();
      setMeasurements((prev) => [
        ...prev,
        {
          id: createId(),
          start: rulerAnchor,
          end: point,
          locked: false,
        },
      ]);
      setRulerAnchor(null);
      setRulerDraft(null);
    },
    [effectiveMmPerPixel, pushHistorySnapshot, rulerAnchor]
  );

  const finishRuler = useCallback(() => {
    setRulerAnchor(null);
    setRulerDraft(null);
  }, []);

  const addLldPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (!lldAnchor) {
        setLldAnchor(point);
        setLldDraft(point);
        return;
      }

      pushHistorySnapshot();
      setLldMeasurements((prev) => [
        ...prev,
        {
          id: createId(),
          start: lldAnchor,
          end: point,
          locked: false,
        },
      ]);
      setLldAnchor(null);
      setLldDraft(null);
    },
    [lldAnchor, pushHistorySnapshot]
  );

  const finishLld = useCallback(() => {
    setLldAnchor(null);
    setLldDraft(null);
  }, []);

  const addOffsetPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (!offsetAnchor) {
        setOffsetAnchor(point);
        setOffsetDraft(point);
        return;
      }

      pushHistorySnapshot();
      setOffsetMeasurements((prev) => [
        ...prev,
        {
          id: createId(),
          start: offsetAnchor,
          end: point,
          locked: false,
        },
      ]);
      setOffsetAnchor(null);
      setOffsetDraft(null);
    },
    [offsetAnchor, pushHistorySnapshot]
  );

  const finishOffset = useCallback(() => {
    setOffsetAnchor(null);
    setOffsetDraft(null);
  }, []);

  const addAnglePoint = useCallback((point: { x: number; y: number }) => {
    setAnglePoints((prev) => {
      if (prev.length === 0) {
        setAngleDraft(point);
        return [point];
      }
      if (prev.length === 1) {
        setAngleDraft(point);
        return [prev[0], point];
      }

      pushHistorySnapshot();
      setAngleMeasurements((items) => [
        ...items,
        {
          id: createId(),
          a: prev[0],
          b: prev[1],
          c: point,
          locked: false,
        },
      ]);
      setAngleDraft(null);
      return [];
    });
  }, [pushHistorySnapshot]);

  const finishAngle = useCallback(() => {
    setAnglePoints([]);
    setAngleDraft(null);
  }, []);

  const addAhkaPoint = useCallback((point: { x: number; y: number }) => {
    setAhkaPoints((prev) => {
      if (prev.length === 0) {
        setAhkaDraft(point);
        return [point];
      }
      if (prev.length === 1) {
        setAhkaDraft(point);
        return [prev[0], point];
      }

      pushHistorySnapshot();
      setAhkaMeasurements((items) => [
        ...items,
        {
          id: createId(),
          hip: prev[0],
          knee: prev[1],
          ankle: point,
          side: inferLegSide(prev[1]),
          locked: false,
        },
      ]);
      setAhkaDraft(null);
      return [];
    });
  }, [inferLegSide, pushHistorySnapshot]);

  const finishAhka = useCallback(() => {
    setAhkaPoints([]);
    setAhkaDraft(null);
  }, []);
  const onKneeToolToggleAny = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    setDrawMode(false);
    setDrawAnchor(null);
    setDrawDraft(null);
  }, []);

  const onKneeToolEnable = useCallback(() => {
    setPanMode(false);
    setSyncScaleMode(false);
    setIsCalibrating(false);
    setCalStart(null);
    setCalEnd(null);
    setRulerMode(false);
    finishRuler();
    setAngleMode(false);
    finishAngle();
    setAhkaMode(false);
    finishAhka();
    setLldMode(false);
    finishLld();
    setOffsetMode(false);
    finishOffset();
    setAnnotationMode(false);
    setAnnotationDraft(null);
  }, [finishAhka, finishAngle, finishLld, finishOffset, finishRuler]);

  const {
    resetValgusCut,
    resetTibialSlope,
    resetTibialCut,
    removeValgusCutLine,
    toggleValgusCutLineLock,
    removeTibialSlopeLine,
    toggleTibialSlopeLineLock,
    removeTibialCutLine,
    toggleTibialCutLineLock,
    toggleValgusCutMode,
    toggleTibialSlopeMode,
    toggleTibialCutMode,
    findKneeLineSegmentHit,
    handleKneeDraftMove,
    handleKneeStageClick,
    handleKneeHandleDrag,
    moveKneeLine,
  } = useKneePlanningActions({
    state: kneeState,
    pushHistorySnapshot,
    onToggleAny: onKneeToolToggleAny,
    onEnableTool: onKneeToolEnable,
    stageRef,
    zoom,
    canvasMode,
    cameraMode,
  });

  const toggleValgusCutLineHidden = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setValgusCutLines((prev) =>
        prev.map((line) =>
          line.id === id ? { ...line, hidden: !line.hidden } : line
        )
      );
    },
    [pushHistorySnapshot, setValgusCutLines]
  );

  const toggleTibialSlopeLineHidden = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setTibialSlopeLines((prev) =>
        prev.map((line) =>
          line.id === id ? { ...line, hidden: !line.hidden } : line
        )
      );
    },
    [pushHistorySnapshot, setTibialSlopeLines]
  );

  const toggleTibialCutLineHidden = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setTibialCutLines((prev) =>
        prev.map((line) =>
          line.id === id ? { ...line, hidden: !line.hidden } : line
        )
      );
    },
    [pushHistorySnapshot, setTibialCutLines]
  );

  const resetDraw = useCallback(() => {
    setDrawMode(false);
    setDrawAnchor(null);
    setDrawDraft(null);
  }, []);

  const toggleDrawMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    if (drawMode) {
      setDrawMode(false);
      setDrawAnchor(null);
      setDrawDraft(null);
      return;
    }
    disableMeasurementModes();
    setDrawAnchor(null);
    setDrawDraft(null);
    setDrawMode(true);
  }, [disableMeasurementModes, drawMode]);

  const toggleTraceMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    if (traceMode) {
      strokeDrawRef.current = {
        active: false,
        pointerId: null,
        kind: null,
        id: null,
        last: null,
      };
      setStrokeDraftPoints(null);
      setTraceMode(false);
      return;
    }
    disableMeasurementModes();
    setStrokeDraftPoints(null);
    setTraceMode(true);
  }, [disableMeasurementModes, traceMode]);

  const togglePencilMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    if (pencilMode) {
      strokeDrawRef.current = {
        active: false,
        pointerId: null,
        kind: null,
        id: null,
        last: null,
      };
      setStrokeDraftPoints(null);
      setPencilMode(false);
      return;
    }
    disableMeasurementModes();
    setStrokeDraftPoints(null);
    setPencilMode(true);
  }, [disableMeasurementModes, pencilMode]);

  const toggleCorMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    if (corMode) {
      setCorMode(false);
      return;
    }
    disableMeasurementModes();
    setCorMode(true);
  }, [corMode, disableMeasurementModes]);

  const addDrawLinePoint = useCallback(
    (point: { x: number; y: number }) => {
      if (!drawAnchor) {
        setDrawAnchor(point);
        setDrawDraft(point);
        return;
      }

      pushHistorySnapshot();
      setDrawLines((prev) => [
        ...prev,
        {
          id: createId(),
          start: drawAnchor,
          end: point,
          locked: false,
        },
      ]);
      setDrawAnchor(null);
      setDrawDraft(null);
    },
    [drawAnchor, pushHistorySnapshot]
  );

  const clearDrawLines = useCallback(() => {
    if (!drawLines.length) return;
    pushHistorySnapshot();
    setDrawLines([]);
    setDrawAnchor(null);
    setDrawDraft(null);
  }, [drawLines.length, pushHistorySnapshot]);

  const removeDrawLine = useCallback((id: string) => {
    pushHistorySnapshot();
    setDrawLines((prev) => prev.filter((line) => line.id !== id));
  }, [pushHistorySnapshot]);

  const toggleDrawLineLock = useCallback((id: string) => {
    pushHistorySnapshot();
    setDrawLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, locked: !line.locked } : line
      )
    );
  }, [pushHistorySnapshot]);

  const toggleDrawLineHidden = useCallback((id: string) => {
    pushHistorySnapshot();
    setDrawLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, hidden: !line.hidden } : line
      )
    );
  }, [pushHistorySnapshot]);

  const clearStrokesByKind = useCallback(
    (kind: FreehandStroke["kind"]) => {
      const hasAny = strokes.some((s) => s.kind === kind);
      if (!hasAny) return;
      pushHistorySnapshot();
      setStrokes((prev) => prev.filter((s) => s.kind !== kind));
      setStrokeDraftPoints(null);
    },
    [pushHistorySnapshot, strokes]
  );

  const removeStroke = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setStrokes((prev) => prev.filter((s) => s.id !== id));
    },
    [pushHistorySnapshot]
  );

  const toggleStrokeLock = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setStrokes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s))
      );
    },
    [pushHistorySnapshot]
  );

  const toggleStrokeHidden = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setStrokes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s))
      );
    },
    [pushHistorySnapshot]
  );

  const clearCorMarkers = useCallback(() => {
    if (!corMarkers.length) return;
    pushHistorySnapshot();
    setCorMarkers([]);
  }, [corMarkers.length, pushHistorySnapshot]);

  const removeCorMarker = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setCorMarkers((prev) => prev.filter((m) => m.id !== id));
    },
    [pushHistorySnapshot]
  );

  const toggleCorLock = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setCorMarkers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m))
      );
    },
    [pushHistorySnapshot]
  );

  const toggleCorHidden = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setCorMarkers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m))
      );
    },
    [pushHistorySnapshot]
  );

  const startSyncScale = useCallback(() => {
    setSyncScaleMode(true);
    setRulerMode(false);
    setAngleMode(false);
    setAhkaMode(false);
    setLldMode(false);
    setOffsetMode(false);
    setAnnotationMode(false);
    finishRuler();
    finishAngle();
    finishAhka();
    finishLld();
    finishOffset();
    setAnnotationDraft(null);
    resetDraw();
  }, [
    finishRuler,
    finishAngle,
    finishAhka,
    finishLld,
    finishOffset,
    resetDraw,
  ]);

  const stopSyncScale = useCallback(() => {
    setSyncScaleMode(false);
    setIsCalibrating(false);
    setCalStart(null);
    setCalEnd(null);
  }, []);

  const clearMeasurements = useCallback(() => {
    if (!measurements.length) return;
    pushHistorySnapshot();
    setMeasurements([]);
    finishRuler();
  }, [finishRuler, measurements.length, pushHistorySnapshot]);

  const clearLldMeasurements = useCallback(() => {
    if (!lldMeasurements.length) return;
    pushHistorySnapshot();
    setLldMeasurements([]);
    finishLld();
  }, [finishLld, lldMeasurements.length, pushHistorySnapshot]);

  const clearOffsetMeasurements = useCallback(() => {
    if (!offsetMeasurements.length) return;
    pushHistorySnapshot();
    setOffsetMeasurements([]);
    finishOffset();
  }, [finishOffset, offsetMeasurements.length, pushHistorySnapshot]);

  const toggleRulerMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    resetDraw();
    setRulerMode((prev) => {
      if (prev) finishRuler();
      if (!prev) {
        stopSyncScale();
        setValgusCutMode(false);
        setValgusCutDraft(null);
        setTibialSlopeMode(false);
        setTibialSlopeDraft(null);
        setAngleMode(false);
        finishAngle();
        setAhkaMode(false);
        finishAhka();
        setLldMode(false);
        finishLld();
        setOffsetMode(false);
        finishOffset();
        setAnnotationMode(false);
        setAnnotationDraft(null);
      }
      return !prev;
    });
  }, [
    finishRuler,
    finishAngle,
    finishAhka,
    finishLld,
    finishOffset,
    stopSyncScale,
    resetDraw,
    setActiveId,
    setAhkaMode,
    setAngleMode,
    setAnnotationDraft,
    setAnnotationMode,
    setLldMode,
    setOffsetMode,
    setRulerMode,
    setTibialSlopeDraft,
    setTibialSlopeMode,
    setValgusCutDraft,
    setValgusCutMode,
  ]);

  const toggleLldMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    resetDraw();
    setLldMode((prev) => {
      if (prev) finishLld();
      if (!prev) {
        stopSyncScale();
        setValgusCutMode(false);
        setValgusCutDraft(null);
        setTibialSlopeMode(false);
        setTibialSlopeDraft(null);
        setRulerMode(false);
        finishRuler();
        setAngleMode(false);
        finishAngle();
        setAhkaMode(false);
        finishAhka();
        setOffsetMode(false);
        finishOffset();
        setAnnotationMode(false);
        setAnnotationDraft(null);
      }
      return !prev;
    });
  }, [
    finishLld,
    finishRuler,
    finishAngle,
    finishAhka,
    finishOffset,
    stopSyncScale,
    resetDraw,
    setActiveId,
    setAhkaMode,
    setAngleMode,
    setAnnotationDraft,
    setAnnotationMode,
    setLldMode,
    setOffsetMode,
    setRulerMode,
    setTibialSlopeDraft,
    setTibialSlopeMode,
    setValgusCutDraft,
    setValgusCutMode,
  ]);

  const toggleOffsetMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    resetDraw();
    setOffsetMode((prev) => {
      if (prev) finishOffset();
      if (!prev) {
        stopSyncScale();
        setValgusCutMode(false);
        setValgusCutDraft(null);
        setTibialSlopeMode(false);
        setTibialSlopeDraft(null);
        setRulerMode(false);
        finishRuler();
        setAngleMode(false);
        finishAngle();
        setAhkaMode(false);
        finishAhka();
        setLldMode(false);
        finishLld();
        setAnnotationMode(false);
        setAnnotationDraft(null);
      }
      return !prev;
    });
  }, [
    finishOffset,
    finishRuler,
    finishAngle,
    finishAhka,
    finishLld,
    stopSyncScale,
    resetDraw,
    setActiveId,
    setAhkaMode,
    setAngleMode,
    setAnnotationDraft,
    setAnnotationMode,
    setLldMode,
    setOffsetMode,
    setRulerMode,
    setTibialSlopeDraft,
    setTibialSlopeMode,
    setValgusCutDraft,
    setValgusCutMode,
  ]);

  const toggleAngleMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    resetDraw();
    setAngleMode((prev) => {
      if (prev) finishAngle();
      if (!prev) {
        stopSyncScale();
        setValgusCutMode(false);
        setValgusCutDraft(null);
        setTibialSlopeMode(false);
        setTibialSlopeDraft(null);
        setRulerMode(false);
        finishRuler();
        setAhkaMode(false);
        finishAhka();
        setLldMode(false);
        finishLld();
        setOffsetMode(false);
        finishOffset();
        setAnnotationMode(false);
        setAnnotationDraft(null);
      }
      return !prev;
    });
  }, [
    finishRuler,
    finishAngle,
    finishAhka,
    finishLld,
    finishOffset,
    stopSyncScale,
    resetDraw,
    setActiveId,
    setAhkaMode,
    setAngleMode,
    setAnnotationDraft,
    setAnnotationMode,
    setLldMode,
    setOffsetMode,
    setRulerMode,
    setTibialSlopeDraft,
    setTibialSlopeMode,
    setValgusCutDraft,
    setValgusCutMode,
  ]);

  const toggleAhkaMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    resetDraw();
    setAhkaMode((prev) => {
      if (prev) finishAhka();
      if (!prev) {
        stopSyncScale();
        setValgusCutMode(false);
        setValgusCutDraft(null);
        setTibialSlopeMode(false);
        setTibialSlopeDraft(null);
        setRulerMode(false);
        finishRuler();
        setAngleMode(false);
        finishAngle();
        setLldMode(false);
        finishLld();
        setOffsetMode(false);
        finishOffset();
        setAnnotationMode(false);
        setAnnotationDraft(null);
      }
      return !prev;
    });
  }, [
    finishAhka,
    finishRuler,
    finishAngle,
    finishLld,
    finishOffset,
    stopSyncScale,
    resetDraw,
    setActiveId,
    setAhkaMode,
    setAngleMode,
    setAnnotationDraft,
    setAnnotationMode,
    setLldMode,
    setOffsetMode,
    setRulerMode,
    setTibialSlopeDraft,
    setTibialSlopeMode,
    setValgusCutDraft,
    setValgusCutMode,
  ]);

  const toggleAnnotationMode = useCallback(() => {
    setPanMode(false);
    setActiveId(null);
    resetDraw();
    setAnnotationMode((prev) => {
      if (!prev) {
        stopSyncScale();
        setValgusCutMode(false);
        setValgusCutDraft(null);
        setTibialSlopeMode(false);
        setTibialSlopeDraft(null);
        setRulerMode(false);
        finishRuler();
        setAngleMode(false);
        finishAngle();
        setAhkaMode(false);
        finishAhka();
        setLldMode(false);
        finishLld();
        setOffsetMode(false);
        finishOffset();
      } else {
        setAnnotationDraft(null);
      }
      return !prev;
    });
  }, [
    finishRuler,
    finishAngle,
    finishAhka,
    finishLld,
    finishOffset,
    stopSyncScale,
    resetDraw,
    setActiveId,
    setAhkaMode,
    setAngleMode,
    setAnnotationDraft,
    setAnnotationMode,
    setLldMode,
    setOffsetMode,
    setRulerMode,
    setTibialSlopeDraft,
    setTibialSlopeMode,
    setValgusCutDraft,
    setValgusCutMode,
  ]);

  const removeMeasurement = useCallback((id: string) => {
    pushHistorySnapshot();
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, [pushHistorySnapshot]);

  const toggleMeasurementLock = useCallback((id: string) => {
    pushHistorySnapshot();
    setMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m))
    );
  }, [pushHistorySnapshot]);

  const toggleMeasurementHidden = useCallback((id: string) => {
    pushHistorySnapshot();
    setMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m))
    );
  }, [pushHistorySnapshot]);

  const removeLldMeasurement = useCallback((id: string) => {
    pushHistorySnapshot();
    setLldMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, [pushHistorySnapshot]);

  const toggleLldLock = useCallback((id: string) => {
    pushHistorySnapshot();
    setLldMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m))
    );
  }, [pushHistorySnapshot]);

  const toggleLldHidden = useCallback((id: string) => {
    pushHistorySnapshot();
    setLldMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m))
    );
  }, [pushHistorySnapshot]);

  const removeOffsetMeasurement = useCallback((id: string) => {
    pushHistorySnapshot();
    setOffsetMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, [pushHistorySnapshot]);

  const toggleOffsetLock = useCallback((id: string) => {
    pushHistorySnapshot();
    setOffsetMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m))
    );
  }, [pushHistorySnapshot]);

  const toggleOffsetHidden = useCallback((id: string) => {
    pushHistorySnapshot();
    setOffsetMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m))
    );
  }, [pushHistorySnapshot]);

  const removeAngleMeasurement = useCallback((id: string) => {
    pushHistorySnapshot();
    setAngleMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, [pushHistorySnapshot]);

  const toggleAngleLock = useCallback((id: string) => {
    pushHistorySnapshot();
    setAngleMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m))
    );
  }, [pushHistorySnapshot]);

  const toggleAngleHidden = useCallback((id: string) => {
    pushHistorySnapshot();
    setAngleMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m))
    );
  }, [pushHistorySnapshot]);

  const clearAhka = useCallback(() => {
    if (!ahkaMeasurements.length) return;
    pushHistorySnapshot();
    setAhkaMeasurements([]);
    finishAhka();
  }, [ahkaMeasurements.length, finishAhka, pushHistorySnapshot]);

  const removeAhkaMeasurement = useCallback((id: string) => {
    pushHistorySnapshot();
    setAhkaMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, [pushHistorySnapshot]);

  const toggleAhkaLock = useCallback((id: string) => {
    pushHistorySnapshot();
    setAhkaMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m))
    );
  }, [pushHistorySnapshot]);

  const toggleAhkaHidden = useCallback((id: string) => {
    pushHistorySnapshot();
    setAhkaMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m))
    );
  }, [pushHistorySnapshot]);

  const clearAnnotations = useCallback(() => {
    if (!annotations.length) return;
    pushHistorySnapshot();
    setAnnotations([]);
    setAnnotationDraft(null);
  }, [annotations.length, pushHistorySnapshot]);

  const clearAngles = useCallback(() => {
    if (!angleMeasurements.length) return;
    pushHistorySnapshot();
    setAngleMeasurements([]);
    finishAngle();
  }, [angleMeasurements.length, finishAngle, pushHistorySnapshot]);

  const removeAnnotation = useCallback((id: string) => {
    pushHistorySnapshot();
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setAnnotationDraft((prev) => (prev?.id === id ? null : prev));
  }, [pushHistorySnapshot]);

  const toggleAnnotationHidden = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, hidden: !a.hidden } : a))
      );
    },
    [pushHistorySnapshot]
  );

  const beginMoveAnnotation = useCallback(() => {
    pushHistorySnapshot();
  }, [pushHistorySnapshot]);

  const translateAnnotation = useCallback((id: string, dx: number, dy: number) => {
    setAnnotations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (a.locked) return a;
        const nextX = Math.min(XRAY_BASE_WIDTH, Math.max(0, a.x + dx));
        const nextY = Math.min(XRAY_BASE_HEIGHT, Math.max(0, a.y + dy));
        return { ...a, x: nextX, y: nextY };
      })
    );
  }, []);

  const startAnnotationDraft = useCallback(
    (point: { x: number; y: number }) => {
      if (annotationDraft) return;
      setAnnotationDraft({ x: point.x, y: point.y, text: "" });
    },
    [annotationDraft]
  );

  const updateAnnotationDraftText = useCallback((text: string) => {
    setAnnotationDraft((prev) => (prev ? { ...prev, text } : prev));
  }, []);

  const cancelAnnotationDraft = useCallback(() => {
    setAnnotationDraft(null);
  }, []);

  const saveAnnotationDraft = useCallback(() => {
    if (!annotationDraft) return;
    const text = annotationDraft.text.trim();
    if (!text) {
      setAnnotationDraft(null);
      return;
    }

    pushHistorySnapshot();
    if (annotationDraft.id) {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === annotationDraft.id ? { ...a, text } : a))
      );
    } else {
      setAnnotations((prev) => [
        ...prev,
        {
          id: createId(),
          x: annotationDraft.x,
          y: annotationDraft.y,
          text,
        },
      ]);
    }

    setAnnotationDraft(null);
  }, [annotationDraft, pushHistorySnapshot]);

  const editAnnotation = useCallback(
    (annotation: Annotation) => {
      setAnnotationMode(true);
      stopSyncScale();
      setRulerMode(false);
      finishRuler();
      setAngleMode(false);
      finishAngle();
      setLldMode(false);
      finishLld();
      setOffsetMode(false);
      finishOffset();
      setAnnotationDraft({
        id: annotation.id,
        x: annotation.x,
        y: annotation.y,
        text: annotation.text,
      });
    },
    [finishRuler, finishAngle, finishLld, finishOffset, stopSyncScale]
  );

  /* =====================================================
     EVENTS
     ===================================================== */

  const onGlobalPointerMove = (e: React.PointerEvent) => {
    const hasPointerCapture = Boolean(
      captureRef.current?.hasPointerCapture?.(e.pointerId)
    );
    if (e.pointerType !== "touch" && e.buttons === 0 && !hasPointerCapture) {
      panDragRef.current = { active: false, pointerId: null, last: null };
      drawLineMoveDrag.current = { active: false, id: null, last: null };
      strokeMoveDrag.current = { active: false, id: null, last: null };
      corMoveDrag.current = { active: false, id: null, last: null };
      kneeLineMoveDrag.current = { active: false, kind: null, id: null, last: null };
      strokeDrawRef.current = {
        active: false,
        pointerId: null,
        kind: null,
        id: null,
        last: null,
      };
      rotateDrag.current.active = false;
      scaleDrag.current.dir = null;
      measureDrag.current.active = false;
      setDragging(false);
    }

    const transform = getXrayTransform(stageRef, zoom, canvasMode, coverMode, viewPan);
    const dragScale = transform?.scale ?? zoom;

    const panDrag = panDragRef.current;
    if (panDrag.active && panDrag.pointerId === e.pointerId && panDrag.last) {
      const dx = e.clientX - panDrag.last.x;
      const dy = e.clientY - panDrag.last.y;
      setViewPan((prev) => clampViewPan({ x: prev.x + dx, y: prev.y + dy }));
      panDrag.last = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvasGesture = canvasGestureRef.current;
    if (canvasGesture.pointers.has(e.pointerId)) {
      canvasGesture.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (canvasGesture.active && canvasGesture.startWorld) {
      const points = Array.from(canvasGesture.pointers.values());
      if (points.length < 2) {
        canvasGesture.active = false;
      } else {
        const [p1, p2] = points;
        const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        const nextZoom = clampZoomValue(
          canvasGesture.startZoom * (distance / (canvasGesture.startDistance || 1))
        );
        const base = getXrayTransform(
          stageRef,
          nextZoom,
          canvasMode,
          coverMode,
          { x: 0, y: 0 }
        );
        if (base) {
          setZoom(nextZoom);
          setViewPan(
            clampViewPan(
              {
                x:
                  center.x -
                  base.rect.left -
                  base.offsetX -
                  canvasGesture.startWorld.x * base.scale,
                y:
                  center.y -
                  base.rect.top -
                  base.offsetY -
                  canvasGesture.startWorld.y * base.scale,
              },
              nextZoom
            )
          );
        }
      }
      return;
    }

    const gesture = pinchRef.current;
    if (gesture.pointers.has(e.pointerId)) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) gesture.pointers.set(e.pointerId, point);
    }
    if (gesture.active && gesture.targetId) {
      const points = getPinchPoints(gesture);
      if (!points) {
        gesture.active = false;
      } else {
        const [p1, p2] = points;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.hypot(dx, dy) || 1;
        const scaleFactor = distance / (gesture.startDistance || 1);
        const nextScaleX = Math.max(0.05, gesture.startScaleX * scaleFactor);
        const nextScaleY = Math.max(
          0.05,
          (gesture.lockAspect ? gesture.startScaleX : gesture.startScaleY) *
            scaleFactor
        );
        const angle = Math.atan2(dy, dx);
        const deltaDeg = ((angle - gesture.startAngle) * 180) / Math.PI;
        const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const position = {
          x: gesture.startPosition.x + (center.x - gesture.startCenter.x),
          y: gesture.startPosition.y + (center.y - gesture.startCenter.y),
        };

        setObjects((prev) =>
          prev.map((o) => {
            if (o.id !== gesture.targetId) return o;
            const flipDirection = (o.flipX ?? 1) * (o.flipY ?? 1);
            const rotation =
              gesture.startRotation +
              (flipDirection < 0 ? -deltaDeg : deltaDeg);
            const scaleLocked = o.scaleLocked;
            return {
              ...o,
              position,
              scaleX: scaleLocked ? gesture.startScaleX : nextScaleX,
              scaleY: scaleLocked
                ? gesture.startScaleY
                : gesture.lockAspect
                ? nextScaleX
                : nextScaleY,
              rotation,
            };
          })
        );
        return;
      }
    }

    const isBusyDragging =
      dragging ||
      rotateDrag.current.active ||
      Boolean(scaleDrag.current.dir) ||
      measureDrag.current.active ||
      strokeMoveDrag.current.active ||
      Boolean(strokeDrawRef.current.active) ||
      Boolean(cutoutDragRef.current.active) ||
      kneeLineMoveDrag.current.active;
    if (!isBusyDragging) {
      const point = getStagePoint(e.clientX, e.clientY);
      const hitStrokeId = point ? findStrokeSegmentHit(point) : null;
      const handle = point ? findMeasurementHandle(point) : null;
      const hoveringMove = Boolean(hitStrokeId) || handle?.kind === "cor";
      setHoverMoveHint((prev) => (prev === hoveringMove ? prev : hoveringMove));
    }

    if (cutoutMode) {
      const stagePoint = getStagePoint(e.clientX, e.clientY);
      const cutoutDrag = cutoutDragRef.current;
      if (
        cutoutDrag.active &&
        cutoutDrag.pointerId === e.pointerId &&
        stagePoint &&
        cutoutDrag.startRect &&
        cutoutDrag.startPoint &&
        cutoutDrag.kind
      ) {
        const startRect = cutoutDrag.startRect;
        const startPoint = cutoutDrag.startPoint;
        if ((startRect.shape ?? cutoutShape) === "polygon") {
          if (cutoutDrag.kind !== "move") return;
          const startPoints = startRect.points ?? [];
          if (startPoints.length < 3) return;
          const dx = stagePoint.x - startPoint.x;
          const dy = stagePoint.y - startPoint.y;
          const movedPoints = startPoints.map((p) =>
            clampStagePoint({ x: p.x + dx, y: p.y + dy })
          );
          const xs = movedPoints.map((p) => p.x);
          const ys = movedPoints.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);
          setCutout((prev) =>
            prev
              ? {
                  ...prev,
                  shape: "polygon",
                  points: movedPoints,
                  x: minX,
                  y: minY,
                  width: Math.max(1, maxX - minX),
                  height: Math.max(1, maxY - minY),
                }
              : {
                  ...startRect,
                  shape: "polygon",
                  points: movedPoints,
                  x: minX,
                  y: minY,
                  width: Math.max(1, maxX - minX),
                  height: Math.max(1, maxY - minY),
                }
          );
          return;
        }
        if (cutoutDrag.kind === "move") {
          const next = clampCutoutRect({
            x: startRect.x + (stagePoint.x - startPoint.x),
            y: startRect.y + (stagePoint.y - startPoint.y),
            width: startRect.width,
            height: startRect.height,
          });
          setCutout((prev) =>
            prev ? { ...prev, ...next } : { ...startRect, ...next }
          );
          return;
        }

        if ((startRect.shape ?? cutoutShape) === "circle") {
          const cx = startRect.x + startRect.width / 2;
          const cy = startRect.y + startRect.height / 2;
          let radius = Math.min(startRect.width, startRect.height) / 2;
          if (cutoutDrag.kind === "n") radius = cy - stagePoint.y;
          if (cutoutDrag.kind === "s") radius = stagePoint.y - cy;
          if (cutoutDrag.kind === "e") radius = stagePoint.x - cx;
          if (cutoutDrag.kind === "w") radius = cx - stagePoint.x;
          const next = clampCutoutCircle({ x: cx, y: cy }, Math.abs(radius));
          setCutout((prev) =>
            prev
              ? { ...prev, ...next, shape: "circle" }
              : { ...startRect, ...next, shape: "circle" }
          );
          return;
        }

        const fixed =
          cutoutDrag.kind === "nw"
            ? { x: startRect.x + startRect.width, y: startRect.y + startRect.height }
            : cutoutDrag.kind === "ne"
              ? { x: startRect.x, y: startRect.y + startRect.height }
              : cutoutDrag.kind === "sw"
                ? { x: startRect.x + startRect.width, y: startRect.y }
                : { x: startRect.x, y: startRect.y };
        const nextRect = buildCutoutRectFromPoints(
          fixed,
          stagePoint,
          startRect.opacity
        );
        setCutout((prev) =>
          prev ? { ...prev, ...nextRect } : nextRect
        );
        return;
      }

      if (cutoutShape === "polygon") {
        if (stagePoint) setCutoutPolyCursor(stagePoint);
        return;
      }

      if (cutoutAnchor && stagePoint) {
        setCutoutDraft(stagePoint);
        return;
      }
    }

    const strokeDraw = strokeDrawRef.current;
    if (strokeDraw.active && strokeDraw.pointerId === e.pointerId) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (!point) return;
      const lastPoint = strokeDraw.last;
      const minDist = 0.75; // in stage coords
      if (
        lastPoint &&
        Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < minDist
      ) {
        return;
      }
      setStrokeDraftPoints((prev) => (prev ? [...prev, point] : [point]));
      strokeDraw.last = point;
      return;
    }

    if (strokeMoveDrag.current.active && strokeMoveDrag.current.id) {
      const point = getStagePoint(e.clientX, e.clientY);
      const lastPoint = strokeMoveDrag.current.last;
      if (!point || !lastPoint) return;
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      if (!dx && !dy) return;
      setStrokes((prev) =>
        prev.map((stroke) => {
          if (stroke.id !== strokeMoveDrag.current.id) return stroke;
          return {
            ...stroke,
            points: stroke.points.map((p) =>
              clampStagePoint({ x: p.x + dx, y: p.y + dy })
            ),
          };
        })
      );
      strokeMoveDrag.current.last = point;
      return;
    }

    if (corMoveDrag.current.active && corMoveDrag.current.id) {
      const point = getStagePoint(e.clientX, e.clientY);
      const lastPoint = corMoveDrag.current.last;
      if (!point || !lastPoint) return;
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      if (!dx && !dy) return;
      setCorMarkers((prev) =>
        prev.map((m) =>
          m.id === corMoveDrag.current.id
            ? { ...m, point: clampStagePoint({ x: m.point.x + dx, y: m.point.y + dy }) }
            : m
        )
      );
      corMoveDrag.current.last = point;
      return;
    }

    if (drawLineMoveDrag.current.active && drawLineMoveDrag.current.id) {
      const point = getStagePoint(e.clientX, e.clientY);
      const lastPoint = drawLineMoveDrag.current.last;
      if (!point || !lastPoint) return;
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      if (!dx && !dy) return;
      setDrawLines((prev) =>
        prev.map((line) => {
          if (line.id !== drawLineMoveDrag.current.id) return line;
          return {
            ...line,
            start: clampStagePoint({ x: line.start.x + dx, y: line.start.y + dy }),
            end: clampStagePoint({ x: line.end.x + dx, y: line.end.y + dy }),
          };
        })
      );
      drawLineMoveDrag.current.last = point;
      return;
    }

    if (measureDrag.current.active) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (!point || !measureDrag.current.kind || !measureDrag.current.id)
        return;
      const { kind, id, point: pointKey } = measureDrag.current;

      if (kind === "ruler" && (pointKey === "start" || pointKey === "end")) {
        setMeasurements((prev) =>
          prev.map((m) => (m.id === id ? { ...m, [pointKey]: point } : m))
        );
        return;
      }

      if (kind === "lld" && (pointKey === "start" || pointKey === "end")) {
        setLldMeasurements((prev) =>
          prev.map((m) => (m.id === id ? { ...m, [pointKey]: point } : m))
        );
        return;
      }

      if (kind === "offset" && (pointKey === "start" || pointKey === "end")) {
        setOffsetMeasurements((prev) =>
          prev.map((m) => (m.id === id ? { ...m, [pointKey]: point } : m))
        );
        return;
      }

      if (kind === "angle") {
        if (!pointKey) return;
        setAngleMeasurements((prev) =>
          prev.map((m) =>
            m.id === id && pointKey ? { ...m, [pointKey]: point } : m
          )
        );
        return;
      }

      if (
        kind === "ahka" &&
        (pointKey === "hip" || pointKey === "knee" || pointKey === "ankle")
      ) {
        if (ahkaEditLocked) return;
        setAhkaMeasurements((prev) =>
          prev.map((m) => (m.id === id ? { ...m, [pointKey]: point } : m))
        );
        return;
      }

      if (!pointKey) return;
      if (handleKneeHandleDrag(kind, id, pointKey, point)) return;

      if (kind === "drawLine" && (pointKey === "start" || pointKey === "end")) {
        setDrawLines((prev) =>
          prev.map((line) =>
            line.id === id ? { ...line, [pointKey]: point } : line
          )
        );
        return;
      }

      if (kind === "cor" && pointKey === "point") {
        setCorMarkers((prev) =>
          prev.map((m) => (m.id === id ? { ...m, point } : m))
        );
        return;
      }
    }

    if (kneeLineMoveDrag.current.active) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (!point) return;
      const drag = kneeLineMoveDrag.current;
      if (!drag.kind || !drag.id) return;
      if (!drag.last) {
        drag.last = point;
        return;
      }

      const dx = point.x - drag.last.x;
      const dy = point.y - drag.last.y;
      moveKneeLine(drag.kind, drag.id, dx, dy);

      kneeLineMoveDrag.current.last = point;
      return;
    }

    if (rotateDrag.current.active) {
      const rawDx = e.clientX - rotateDrag.current.x;
      rotateDrag.current.x = e.clientX;

      // More stable & less aggressive rotation:
      // - use raw screen pixels (not divided by zoom scale)
      // - smaller sensitivity
      // - small deadzone to avoid jitter
      const DEADZONE_PX = 0.5;
      if (Math.abs(rawDx) < DEADZONE_PX) return;

      const ROTATE_DEG_PER_PX = 0.1; // 100px ≈ 10°
      const maxStep = 6; // prevent big jumps on low-FPS pointer events
      const step = Math.max(-maxStep, Math.min(maxStep, rawDx * ROTATE_DEG_PER_PX));

      setObjects((prev) =>
        prev.map((o) => {
          if (o.id !== activeId) return o;
          const flipDirection = (o.flipX ?? 1) * (o.flipY ?? 1);
          const adjusted = flipDirection < 0 ? -step : step;
          return { ...o, rotation: o.rotation + adjusted };
        })
      );
      return;
    }

    if (scaleDrag.current.dir) {
      const dy = (e.clientY - scaleDrag.current.startY) / dragScale;
      applyScaleFromDrag(dy);
      return;
    }

    if (isCalibrating && calStart) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) setCalEnd(point);
      return;
    }

    if (annotationMode && annotationDraft) return;

    if (drawMode && drawAnchor) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) setDrawDraft(point);
      return;
    }

    if (angleMode && anglePoints.length) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) setAngleDraft(point);
      return;
    }

    if (ahkaMode && ahkaPoints.length) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) setAhkaDraft(point);
      return;
    }

    if (valgusCutMode || tibialSlopeMode || tibialCutMode) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point && handleKneeDraftMove(point)) return;
    }

    if (rulerMode && rulerAnchor) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) setRulerDraft(point);
      return;
    }

    if (lldMode && lldAnchor) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) setLldDraft(point);
      return;
    }

    if (offsetMode && offsetAnchor) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) setOffsetDraft(point);
      return;
    }

    if (dragging && active) {
      const dx = (e.clientX - last.current.x) / dragScale;
      const dy = (e.clientY - last.current.y) / dragScale;
      moveActive(dx, dy);
      last.current = { x: e.clientX, y: e.clientY };
    }
  };

  const resizeToBaseXray = useCallback(
    async (src: string) => {
      if (typeof window === "undefined") return src;
      const img = await ensureImageLoaded(src);
      if (!img) {
        setXraySourceScale(1);
        return src;
      }

      const canvas = document.createElement("canvas");
      canvas.width = XRAY_BASE_WIDTH;
      canvas.height = XRAY_BASE_HEIGHT;

      const ctx = canvas.getContext("2d");
      if (!ctx) return src;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const nextSourceScale =
        Number.isFinite(scale) && scale > 0 ? scale : 1;
      setXraySourceScale(nextSourceScale);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const dx = (canvas.width - drawWidth) / 2;
      const dy = (canvas.height - drawHeight) / 2;

      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

      try {
        return canvas.toDataURL("image/jpeg", 0.92);
      } catch {
        return src;
      }
    },
    [ensureImageLoaded]
  );

  const uploadBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const raw = String(r.result || "");
      if (!raw) return;
      void (async () => {
        const resized = await resizeToBaseXray(raw);
        setBackground(resized);
        setCanvasMode("oneToOne");
        setZoom(1);
        setViewPan({ x: 0, y: 0 });

        // Reset calibration so mm output always matches the newly uploaded X-ray.
        setRealMm(100);
        setPixelsPerMm(null);
        setUseRealScale(false);
        setXrayMagnificationFactor(1);
        setCalStart(null);
        setCalEnd(null);
        setIsCalibrating(false);
        setSyncScaleMode(false);
        startSyncScale();

        toast({
          title: "X-ray diupload",
          description:
            "Sync X-ray Scale otomatis aktif. Klik 2 titik pada bar skala (mis. 100 mm) agar ruler keluar dalam mm.",
        });
      })();
    };
    r.readAsDataURL(f);
  };

  const onDownObject = (e: React.PointerEvent, objectId?: string) => {
    const isObjectInteraction = Boolean(objectId);
    if (e.shiftKey) return;
    if (
      !isObjectInteraction &&
      (rulerMode ||
        angleMode ||
        ahkaMode ||
        valgusCutMode ||
        tibialSlopeMode ||
        tibialCutMode ||
        lldMode ||
        offsetMode ||
        annotationMode ||
        drawMode)
    )
      return;

    const targetId = objectId ?? activeId;
    if (!targetId) return;
    if (targetId !== activeId) setActiveId(targetId);
    const gesture = pinchRef.current;
    let startedPinch = false;

    if (objectId) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) {
        if (!gesture.targetId) gesture.targetId = targetId;
        if (gesture.targetId === targetId) {
          gesture.pointers.set(e.pointerId, point);
          if (gesture.pointers.size === 2) {
            const points = getPinchPoints(gesture);
            const target = objectsRef.current.find((o) => o.id === targetId);
            if (points && target) {
              const [p1, p2] = points;
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              gesture.active = true;
              gesture.startDistance = Math.hypot(dx, dy) || 1;
              gesture.startAngle = Math.atan2(dy, dx);
              gesture.startScaleX = target.scaleX;
              gesture.startScaleY = target.scaleY;
              gesture.startRotation = target.rotation;
              gesture.startCenter = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2,
              };
              gesture.startPosition = { ...target.position };
              gesture.lockAspect = target.locked;
              setDragging(false);
              rotateDrag.current.active = false;
              scaleDrag.current.dir = null;
              pushHistorySnapshot();
              startedPinch = true;
            }
          }
        }
      }
    }

    captureRef.current = e.currentTarget as HTMLElement;
    captureRef.current.setPointerCapture(e.pointerId);

    if (startedPinch) return;

    pushHistorySnapshot();
    setDragging(true);
    last.current = { x: e.clientX, y: e.clientY };
  };

  // const onUp = (e: React.PointerEvent) => {
  //   setDragging(false);
  //   (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  // };

  const onUp = (e: React.PointerEvent) => {
    rotateDrag.current.active = false;
    scaleDrag.current.dir = null;
    measureDrag.current.active = false;
    kneeLineMoveDrag.current = { active: false, kind: null, id: null, last: null };
    drawLineMoveDrag.current = { active: false, id: null, last: null };
    strokeMoveDrag.current = { active: false, id: null, last: null };
    corMoveDrag.current = { active: false, id: null, last: null };
    setDragging(false);
    setIsCalibrating(false);

    const strokeDraw = strokeDrawRef.current;
    if (strokeDraw.active && strokeDraw.pointerId === e.pointerId) {
      const kind = strokeDraw.kind;
      const points = strokeDraftPoints ?? [];
      strokeDrawRef.current = {
        active: false,
        pointerId: null,
        kind: null,
        id: null,
        last: null,
      };
      setStrokeDraftPoints(null);

      if (kind && points.length >= 2) {
        pushHistorySnapshot();
        const strokeWidth = kind === "trace" ? 3 : 2;
        const color = kind === "trace" ? "#c084fc" : "#60a5fa";
        setStrokes((prev) => [
          ...prev,
          {
            id: strokeDraw.id ?? createId(),
            kind,
            points,
            strokeWidth,
            color,
            locked: false,
            hidden: false,
          },
        ]);
      }
    }

    const cutoutDrag = cutoutDragRef.current;
    if (cutoutDrag.active && cutoutDrag.pointerId === e.pointerId) {
      cutoutDragRef.current = {
        active: false,
        pointerId: null,
        kind: null,
        startPoint: null,
        startRect: null,
      };
    }

    if (cutoutMode && cutoutAnchor) {
      const endPoint = getStagePoint(e.clientX, e.clientY) ?? cutoutDraft;
      if (endPoint) {
        const nextRect =
          cutoutShape === "circle"
            ? buildCutoutCircleFromPoints(cutoutAnchor, endPoint)
            : buildCutoutRectFromPoints(cutoutAnchor, endPoint);
        setCutout(nextRect);
      }
      setCutoutAnchor(null);
      setCutoutDraft(null);
    }

    const panDrag = panDragRef.current;
    if (panDrag.active && panDrag.pointerId === e.pointerId) {
      panDragRef.current = { active: false, pointerId: null, last: null };
    }

    const canvasGesture = canvasGestureRef.current;
    if (canvasGesture.pointers.has(e.pointerId)) {
      canvasGesture.pointers.delete(e.pointerId);
      if (canvasGesture.pointers.size < 2) {
        canvasGesture.active = false;
      }
      if (canvasGesture.pointers.size === 0) {
        canvasGesture.startWorld = null;
        canvasGesture.startDistance = 0;
      }
    }

    const gesture = pinchRef.current;
    if (gesture.pointers.has(e.pointerId)) {
      gesture.pointers.delete(e.pointerId);
      if (gesture.pointers.size < 2) {
        gesture.active = false;
      }
      if (gesture.pointers.size === 0) {
        gesture.targetId = null;
      }
    }

    if (syncScaleMode && calStart) {
      const point = getStagePoint(e.clientX, e.clientY);
      if (point) {
        const px = Math.hypot(point.x - calStart.x, point.y - calStart.y);
        if (px !== 0) {
          setPixelsPerMm(px / realMm);
          setUseRealScale(true);
        }
      }
      stopSyncScale();
    }

    captureRef.current?.releasePointerCapture(e.pointerId);
    captureRef.current = null;
  };

  const startCalibration = (e: React.PointerEvent) => {
    const point = getStagePoint(e.clientX, e.clientY);
    if (!point) return;
    setCalStart(point);
    setCalEnd(point);
    setIsCalibrating(true);
  };

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (panMode) {
      setViewPan((prev) => clampViewPan(prev));
      panDragRef.current = {
        active: true,
        pointerId: e.pointerId,
        last: { x: e.clientX, y: e.clientY },
      };
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    if (syncScaleMode) {
      startCalibration(e);
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    if (e.shiftKey) {
      startCalibration(e);
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    if (annotationDraft) return;

    if (!hasActiveMeasurementMode && e.pointerType === "touch") {
      const gesture = canvasGestureRef.current;
      gesture.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gesture.pointers.size === 2) {
        const points = Array.from(gesture.pointers.values());
        const [p1, p2] = points;
        const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const world = getStagePoint(center.x, center.y);
        if (world) {
          gesture.active = true;
          gesture.startDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
          gesture.startZoom = zoom;
          gesture.startWorld = world;
        }
      }
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    const point = getStagePoint(e.clientX, e.clientY);
    if (!point) return;

    if (cutoutMode) {
      const transform = getXrayTransform(
        stageRef,
        zoom,
        canvasMode,
        coverMode,
        viewPan
      );
      const scale = transform?.scale ?? zoom;
      const hitRadius = 14 / scale;

      if (cutoutShape === "polygon") {
        if (cutout && (cutout.shape ?? "polygon") === "polygon" && !cutout.locked) {
          const hit = getCutoutHandleHit(point, cutout, hitRadius);
          if (hit) {
            cutoutDragRef.current = {
              active: true,
              pointerId: e.pointerId,
              kind: hit,
              startPoint: point,
              startRect: cutout,
            };
            captureRef.current = e.currentTarget as HTMLElement;
            captureRef.current.setPointerCapture(e.pointerId);
            return;
          }
        }

        if (cutout && !cutoutPolyPoints.length) {
          setCutout(null);
        }

        const closeRadius = 18 / scale;
        setCutoutAnchor(null);
        setCutoutDraft(null);
        setCutoutPolyCursor(point);
        cutoutDragRef.current = {
          active: false,
          pointerId: null,
          kind: null,
          startPoint: null,
          startRect: null,
        };

        setCutoutPolyPoints((prev) => {
          if (!prev.length) return [point];
          const first = prev[0];
          const dx = point.x - first.x;
          const dy = point.y - first.y;
          if (prev.length >= 3 && dx * dx + dy * dy <= closeRadius * closeRadius) {
            const nextPoly = buildCutoutPolygonFromPoints(prev);
            setCutout(nextPoly);
            setCutoutPolyCursor(null);
            return [];
          }
          return [...prev, point];
        });

        return;
      }

      if (cutout && !cutout.locked) {
        const hit = getCutoutHandleHit(point, cutout, hitRadius);
        if (hit) {
          cutoutDragRef.current = {
            active: true,
            pointerId: e.pointerId,
            kind: hit,
            startPoint: point,
            startRect: cutout,
          };
          captureRef.current = e.currentTarget as HTMLElement;
          captureRef.current.setPointerCapture(e.pointerId);
          return;
        }
      }

      setCutoutAnchor(point);
      setCutoutDraft(point);
      cutoutDragRef.current = {
        active: false,
        pointerId: null,
        kind: null,
        startPoint: null,
        startRect: null,
      };
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    if (drawMode) {
      // Bonesetter-like: allow adjusting existing draw lines while tool is active.
      const handle = findMeasurementHandle(point);
      if (handle && handle.kind === "drawLine") {
        pushHistorySnapshot();
        measureDrag.current = {
          active: true,
          kind: handle.kind,
          id: handle.id,
          point: handle.point,
        };
        captureRef.current = e.currentTarget as HTMLElement;
        captureRef.current.setPointerCapture(e.pointerId);
        return;
      }
      const hitId = findDrawLineSegmentHit(point);
      if (hitId) {
        pushHistorySnapshot();
        drawLineMoveDrag.current = { active: true, id: hitId, last: point };
        captureRef.current = e.currentTarget as HTMLElement;
        captureRef.current.setPointerCapture(e.pointerId);
        return;
      }

      addDrawLinePoint(point);
      return;
    }

    if (traceMode || pencilMode) {
      // Bonesetter-like: allow moving an existing stroke even while tool is active.
      const hitStrokeId = findStrokeSegmentHit(point);
      if (hitStrokeId) {
        pushHistorySnapshot();
        strokeMoveDrag.current = { active: true, id: hitStrokeId, last: point };
        captureRef.current = e.currentTarget as HTMLElement;
        captureRef.current.setPointerCapture(e.pointerId);
        return;
      }

      const kind: FreehandStroke["kind"] = traceMode ? "trace" : "pencil";
      strokeDrawRef.current = {
        active: true,
        pointerId: e.pointerId,
        kind,
        id: createId(),
        last: point,
      };
      setStrokeDraftPoints([point]);
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    if (corMode) {
      // Bonesetter-like: drag existing COR first, else place new.
      const transform = getXrayTransform(
        stageRef,
        zoom,
        canvasMode,
        coverMode,
        viewPan
      );
      const scale = transform?.scale ?? zoom;
      const hitRadius = 14 / scale;
      const hitRadiusSq = hitRadius * hitRadius;
      const hit = corMarkers.find(
        (m) =>
          !m.hidden &&
          !m.locked &&
          (m.point.x - point.x) * (m.point.x - point.x) +
            (m.point.y - point.y) * (m.point.y - point.y) <=
            hitRadiusSq
      );
      if (hit) {
        pushHistorySnapshot();
        corMoveDrag.current = { active: true, id: hit.id, last: point };
        captureRef.current = e.currentTarget as HTMLElement;
        captureRef.current.setPointerCapture(e.pointerId);
        return;
      }

      pushHistorySnapshot();
      setCorMarkers((prev) => [
        ...prev,
        { id: createId(), point, locked: false, hidden: false },
      ]);
      return;
    }

    const handle = findMeasurementHandle(point);
    if (handle) {
      pushHistorySnapshot();
      measureDrag.current = {
        active: true,
        kind: handle.kind,
        id: handle.id,
        point: handle.point,
      };
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    const kneeHit = findKneeLineSegmentHit(point);
    if (kneeHit) {
      pushHistorySnapshot();
      kneeLineMoveDrag.current = {
        active: true,
        kind: kneeHit.kind,
        id: kneeHit.id,
        last: point,
      };
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    const canMoveDrawLines =
      !rulerMode &&
      !lldMode &&
      !offsetMode &&
      !angleMode &&
      !annotationMode &&
      !ahkaMode &&
      !valgusCutMode &&
      !tibialSlopeMode &&
      !tibialCutMode;
    if (canMoveDrawLines) {
      const hitId = findDrawLineSegmentHit(point);
      if (hitId) {
        pushHistorySnapshot();
        drawLineMoveDrag.current = { active: true, id: hitId, last: point };
        captureRef.current = e.currentTarget as HTMLElement;
        captureRef.current.setPointerCapture(e.pointerId);
        return;
      }
    }

    if (canMoveDrawLines) {
      const hitStrokeId = findStrokeSegmentHit(point);
      if (hitStrokeId) {
        pushHistorySnapshot();
        strokeMoveDrag.current = { active: true, id: hitStrokeId, last: point };
        captureRef.current = e.currentTarget as HTMLElement;
        captureRef.current.setPointerCapture(e.pointerId);
        return;
      }
    }

    if (annotationMode) {
      startAnnotationDraft(point);
      return;
    }

    if (angleMode) {
      addAnglePoint(point);
      return;
    }

    if (ahkaMode) {
      addAhkaPoint(point);
      return;
    }

    if (handleKneeStageClick(point, createId)) return;

    if (rulerMode) {
      addRulerPoint(point);
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    if (lldMode) {
      addLldPoint(point);
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    if (offsetMode) {
      addOffsetPoint(point);
      captureRef.current = e.currentTarget as HTMLElement;
      captureRef.current.setPointerCapture(e.pointerId);
      return;
    }

    // Background click: don't move overlay; allow deselect on desktop.
    if (e.target === e.currentTarget && e.pointerType !== "touch") {
      setActiveId(null);
    }
  };

  const onStagePointerUp = (e: React.PointerEvent) => {
    onUp(e);
  };

  const applyCalibration = () => {
    if (!calStart || !calEnd) return;
    const px = Math.hypot(calEnd.x - calStart.x, calEnd.y - calStart.y);
    if (px === 0) return;
    setPixelsPerMm(px / realMm);
    setCalStart(null);
    setCalEnd(null);
  };

  /* =====================================================
     KEYBOARD SHORTCUT
     ===================================================== */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isMod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTypingTarget) {
        if (e.key === "Escape") return;
        if (isMod && (key === "z" || key === "y")) return;
        return;
      }

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      if (e.key === "Escape") {
        if (annotationMode) cancelAnnotationDraft();
        else if (syncScaleMode) stopSyncScale();
        else if (angleMode) finishAngle();
        else if (ahkaMode) finishAhka();
        else if (valgusCutMode) {
          setValgusCutMode(false);
          setValgusCutDraft(null);
        } else if (tibialSlopeMode) {
          setTibialSlopeMode(false);
          setTibialSlopeDraft(null);
        } else if (tibialCutMode) {
          setTibialCutMode(false);
          setTibialCutDraft(null);
        } else if (cutoutMode) {
          if (cutoutShape === "polygon" && cutoutPolyPoints.length) {
            setCutoutPolyPoints([]);
            setCutoutPolyCursor(null);
          } else {
            stopCutoutMode();
          }
        } else if (rulerMode) finishRuler();
        else if (lldMode) finishLld();
        else if (offsetMode) finishOffset();
        else setActiveId(null);
        return;
      }

      if (!isMod && !e.altKey && !e.shiftKey) {
        if (key === "r") {
          e.preventDefault();
          toggleRulerMode();
          return;
        }
        if (key === "l") {
          e.preventDefault();
          toggleLldMode();
          return;
        }
        if (key === "o") {
          e.preventDefault();
          toggleOffsetMode();
          return;
        }
        if (key === "a") {
          e.preventDefault();
          toggleAngleMode();
          return;
        }
        if (key === "t") {
          e.preventDefault();
          toggleTibialSlopeMode();
          return;
        }
        if (key === "c") {
          e.preventDefault();
          toggleTibialCutMode();
          return;
        }
        if (key === "h") {
          e.preventDefault();
          toggleAhkaMode();
          return;
        }
        if (key === "v") {
          e.preventDefault();
          toggleValgusCutMode();
          return;
        }
        if (key === "n") {
          e.preventDefault();
          toggleAnnotationMode();
          return;
        }
      }

      if (isMod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (isMod && key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (!e.shiftKey && !isMod) {
        if (e.key === "ArrowUp") moveActiveWithHistory(0, -2);
        if (e.key === "ArrowDown") moveActiveWithHistory(0, 2);
        if (e.key === "ArrowLeft") moveActiveWithHistory(-2, 0);
        if (e.key === "ArrowRight") moveActiveWithHistory(2, 0);
      }

      if (e.shiftKey && !isMod) {
        if (e.key === "ArrowUp") scaleActive(0.01);
        if (e.key === "ArrowDown") scaleActive(-0.01);
      }

      if (isMod) {
        if (e.key === "ArrowLeft") rotateActive(-1);
        if (e.key === "ArrowRight") rotateActive(1);
      }

      if (e.key === "Delete" || e.key === "Backspace") deleteActive();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    moveActiveWithHistory,
    scaleActive,
    rotateActive,
    deleteActive,
    redo,
    undo,
    setActiveId,
    setTibialCutDraft,
    setTibialCutMode,
    setTibialSlopeDraft,
    setTibialSlopeMode,
    setValgusCutDraft,
    setValgusCutMode,
    toggleShortcuts,
    toggleRulerMode,
    toggleLldMode,
    toggleOffsetMode,
    toggleAngleMode,
    toggleTibialSlopeMode,
    toggleTibialCutMode,
    toggleAhkaMode,
    toggleValgusCutMode,
    toggleAnnotationMode,
    cancelAnnotationDraft,
    finishRuler,
    finishAngle,
    finishAhka,
    finishLld,
    finishOffset,
    stopCutoutMode,
    stopSyncScale,
    cutoutMode,
    cutoutShape,
    cutoutPolyPoints.length,
    annotationMode,
    syncScaleMode,
    angleMode,
    ahkaMode,
    valgusCutMode,
    tibialSlopeMode,
    tibialCutMode,
    rulerMode,
    lldMode,
    offsetMode,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTypingTarget) return;

      e.preventDefault();
      const hold = panHoldRef.current;
      if (hold.active) return;
      hold.active = true;
      hold.prev = panMode;
      setPanMode(true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const hold = panHoldRef.current;
      if (!hold.active) return;
      e.preventDefault();
      hold.active = false;
      setPanMode(hold.prev);
    };

    const onWindowBlur = () => {
      const hold = panHoldRef.current;
      if (!hold.active) return;
      hold.active = false;
      setPanMode(hold.prev);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [panMode]);

  /* =====================================================
     RENDER
     ===================================================== */

  const filteredLibrary = STEM_LIBRARY.filter((item) =>
    `${item.label} ${item.system} ${item.size}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const groupedLibrary = filteredLibrary.reduce<GroupedLibrary>(
    (acc, item) => {
      if (!acc[item.type]) acc[item.type] = {};
      if (!acc[item.type][item.system]) acc[item.type][item.system] = [];
      acc[item.type][item.system].push(item);
      return acc;
    },
    { stem: {}, cup: {}, knee: {} }
  );

  const applyScaleFromDrag = (dy: number) => {
    if (!scaleDrag.current.dir || !active || active.scaleLocked) return;

    const sensitivity = 0.005;

    const dirMultiplier = scaleDrag.current.dir === "top" ? -1 : 1;

    const factor = 1 + dy * sensitivity * dirMultiplier;
    const clamped = Math.max(0.05, factor);

    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== activeId) return o;

        if (
          scaleDrag.current.dir === "left" ||
          scaleDrag.current.dir === "right"
        ) {
          return {
            ...o,
            scaleX: scaleDrag.current.startScaleX * clamped,
            scaleY: o.locked
              ? scaleDrag.current.startScaleX * clamped
              : o.scaleY,
          };
        }

        // TOP / BOTTOM
        return {
          ...o,
          scaleY: scaleDrag.current.startScaleY * clamped,
          scaleX: o.locked ? scaleDrag.current.startScaleY * clamped : o.scaleX,
        };
      })
    );
  };

  const calibrated = typeof effectiveMmPerPixel === "number" && effectiveMmPerPixel > 0;
  const toMm = (px: number) => px * (effectiveMmPerPixel ?? 0);
  const formatDistancePx = (px: number) =>
    calibrated ? `${toMm(px).toFixed(1)} mm` : "Set mm/px";
  const formatRulerDistancePx = (px: number) =>
    calibrated ? `${toMm(px).toFixed(1)} mm` : "Set mm/px";
  const formatAngleValue = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
  ) => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const abLen = Math.hypot(ab.x, ab.y);
    const cbLen = Math.hypot(cb.x, cb.y);
    if (abLen === 0 || cbLen === 0) return "0.0°";
    const dot = ab.x * cb.x + ab.y * cb.y;
    const cos = Math.max(-1, Math.min(1, dot / (abLen * cbLen)));
    const angle = (Math.acos(cos) * 180) / Math.PI;
    return `${angle.toFixed(1)}°`;
  };

  const formatAhkaValue = useCallback(
    (
      hip: { x: number; y: number },
      knee: { x: number; y: number },
      ankle: { x: number; y: number },
      side?: Side
    ) => {
      const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
      const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };
      const v1Len = Math.hypot(v1.x, v1.y);
      const v2Len = Math.hypot(v2.x, v2.y);
      if (!v1Len || !v2Len) return "0.0°";

      const dot = v1.x * v2.x + v1.y * v2.y;
      const cos = Math.max(-1, Math.min(1, dot / (v1Len * v2Len)));
      const angle = (Math.acos(cos) * 180) / Math.PI; // 0..180
      const deviation = 180 - angle; // 0 = neutral, >0 = deviation
      const rawCross = v1.x * v2.y - v1.y * v2.x;
      const resolvedSide = side ?? (knee.x < XRAY_BASE_WIDTH / 2 ? "Left" : "Right");
      const sideSign = resolvedSide === "Right" ? 1 : -1;
      const cross = rawCross * sideSign;
      const sideLabel = resolvedSide === "Right" ? "R" : "L";
      if (Math.abs(deviation) < 0.05) return `${sideLabel} Neutral 0.0°`;
      const label = cross >= 0 ? "Valgus" : "Varus";
      return `${sideLabel} ${label} ${Math.abs(deviation).toFixed(1)}°`;
    },
    []
  );
  const visibleMeasurementsForTotal = measurements.filter((m) => !m.hidden);
  const measurementTotalsPx = visibleMeasurementsForTotal.reduce(
    (sum, m) => sum + Math.hypot(m.end.x - m.start.x, m.end.y - m.start.y),
    0
  );
  const measurementRows: MeasurementRow[] = measurements.map((m, index) => ({
    id: m.id,
    label: `M${index + 1}`,
    value: formatRulerDistancePx(
      Math.hypot(m.end.x - m.start.x, m.end.y - m.start.y)
    ),
    locked: m.locked,
    hidden: m.hidden,
  }));
  const lldRows: MeasurementRow[] = lldMeasurements.map((m, index) => ({
    id: m.id,
    label: `LLD${index + 1}`,
    value: `LLD ${formatDistancePx(Math.abs(m.end.y - m.start.y))}`,
    locked: m.locked,
    hidden: m.hidden,
  }));
  const offsetRows: MeasurementRow[] = offsetMeasurements.map((m, index) => ({
    id: m.id,
    label: `HO${index + 1}`,
    value: `Head Offset ${formatDistancePx(Math.abs(m.end.x - m.start.x))}`,
    locked: m.locked,
    hidden: m.hidden,
  }));
  const angleRows: MeasurementRow[] = angleMeasurements.map((m, index) => ({
    id: m.id,
    label: `A${index + 1}`,
    value: formatAngleValue(m.a, m.b, m.c),
    locked: m.locked,
    hidden: m.hidden,
  }));
  const ahkaRows: MeasurementRow[] = ahkaMeasurements.map((m, index) => ({
    id: m.id,
    label: `HKA${index + 1}`,
    value: `aHKA ${formatAhkaValue(m.hip, m.knee, m.ankle, m.side)}`,
    locked: m.locked,
    hidden: m.hidden,
  }));
  const drawLinesRows: MeasurementRow[] = drawLines.map((line, index) => ({
    id: line.id,
    label: `Line ${index + 1}`,
    value: formatDistancePx(
      Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y)
    ),
    locked: line.locked,
    hidden: line.hidden,
  }));
  const computeStrokeLengthPx = useCallback((points: { x: number; y: number }[]) => {
    if (points.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      sum += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return sum;
  }, []);

  const traceRows: MeasurementRow[] = strokes
    .filter((s) => s.kind === "trace")
    .map((s, index) => ({
      id: s.id,
      label: `TR${index + 1}`,
      value: `Trace ${formatDistancePx(computeStrokeLengthPx(s.points))}`,
      locked: s.locked,
      hidden: s.hidden,
    }));

  const pencilRows: MeasurementRow[] = strokes
    .filter((s) => s.kind === "pencil")
    .map((s, index) => ({
      id: s.id,
      label: `P${index + 1}`,
      value: `Pencil ${formatDistancePx(computeStrokeLengthPx(s.points))}`,
      locked: s.locked,
      hidden: s.hidden,
    }));

  const corRows: MeasurementRow[] = corMarkers.map((m, index) => ({
    id: m.id,
    label: `COR${index + 1}`,
    value: `COR (${m.point.x.toFixed(0)}, ${m.point.y.toFixed(0)})`,
    locked: m.locked,
    hidden: m.hidden,
  }));
  const measurementTotalLabel = visibleMeasurementsForTotal.length
    ? formatRulerDistancePx(measurementTotalsPx)
    : null;
  const visibleDrawLinesForTotal = drawLines.filter((line) => !line.hidden);
  const drawLinesTotalLabel = visibleDrawLinesForTotal.length
    ? formatDistancePx(
        visibleDrawLinesForTotal.reduce(
          (sum, line) =>
            sum +
            Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y),
          0
        )
      )
    : null;

  const buildReportLines = useCallback(() => {
    const lines: string[] = [];
    const visibleMeasurementRows = measurementRows.filter((r) => !r.hidden);
    const visibleLldRows = lldRows.filter((r) => !r.hidden);
    const visibleOffsetRows = offsetRows.filter((r) => !r.hidden);
    const visibleAngleRows = angleRows.filter((r) => !r.hidden);
    const visibleAhkaRows = ahkaRows.filter((r) => !r.hidden);
    const visibleDrawLinesRows = drawLinesRows.filter((r) => !r.hidden);
    const visibleAnnotations = annotations.filter((a) => !a.hidden);

    if (visibleMeasurementRows.length) {
      lines.push("Ruler:");
      visibleMeasurementRows.forEach((row) => {
        lines.push(`  ${row.label} ${row.value}`);
      });
      if (measurementTotalLabel) {
        lines.push(`  Total ${measurementTotalLabel}`);
      }
    }
    if (visibleLldRows.length) {
      lines.push("LLD:");
      visibleLldRows.forEach((row) => {
        lines.push(`  ${row.label} ${row.value}`);
      });
    }
    if (visibleOffsetRows.length) {
      lines.push("Offset:");
      visibleOffsetRows.forEach((row) => {
        lines.push(`  ${row.label} ${row.value}`);
      });
    }
    if (visibleAngleRows.length) {
      lines.push("Angle:");
      visibleAngleRows.forEach((row) => {
        lines.push(`  ${row.label} ${row.value}`);
      });
    }
    if (visibleAhkaRows.length) {
      lines.push("aHKA:");
      visibleAhkaRows.forEach((row) => {
        lines.push(`  ${row.label} ${row.value}`);
      });
    }
    const visibleValgusCutLines = valgusCutLines.filter((l) => !l.hidden);
    if (visibleValgusCutLines.length) {
      lines.push("Valgus Cut:");
      visibleValgusCutLines.forEach((line, index) => {
        lines.push(`  VC${index + 1} ${line.side} Valgus ${line.angleDeg}°`);
      });
    }
    const visibleTibialSlopeLines = tibialSlopeLines.filter((l) => !l.hidden);
    if (visibleTibialSlopeLines.length) {
      lines.push("Tibial Slope:");
      visibleTibialSlopeLines.forEach((line, index) => {
        lines.push(
          `  TS${index + 1} ${line.posteriorSide} Posterior ${line.slopeDeg}°`
        );
      });
    }
    const visibleTibialCutLines = tibialCutLines.filter((l) => !l.hidden);
    if (visibleTibialCutLines.length) {
      lines.push("Tibial Cut:");
      visibleTibialCutLines.forEach((line, index) => {
        lines.push(`  TC${index + 1} ${line.angleDeg}°`);
      });
    }
    if (visibleDrawLinesRows.length) {
      lines.push("Draw Lines:");
      visibleDrawLinesRows.forEach((row) => {
        lines.push(`  ${row.label} ${row.value}`);
      });
      if (drawLinesTotalLabel) {
        lines.push(`  Total ${drawLinesTotalLabel}`);
      }
    }
    if (visibleAnnotations.length) {
      lines.push("Notes:");
      visibleAnnotations.forEach((annotation, index) => {
        lines.push(`  ${index + 1}. ${annotation.text}`);
      });
    }
    if (!lines.length) {
      lines.push("No measurements recorded.");
    }
    return lines;
  }, [
    angleRows,
    ahkaRows,
    annotations,
    lldRows,
    measurementRows,
    measurementTotalLabel,
    offsetRows,
    drawLinesRows,
    drawLinesTotalLabel,
    valgusCutLines,
    tibialSlopeLines,
    tibialCutLines,
  ]);

  const drawCompositeFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      options?: {
        base?: "camera" | "xray" | "none";
        backgroundImage?: HTMLImageElement | null;
      }
    ) => {
      const calibrated =
        typeof effectiveMmPerPixel === "number" && effectiveMmPerPixel > 0;
      const toMm = (px: number) => px * (effectiveMmPerPixel ?? 0);
      const formatDistancePx = (px: number) =>
        calibrated ? `${toMm(px).toFixed(1)} mm` : "Set mm/px";
      const formatRulerDistancePx = (px: number) =>
        calibrated ? `${toMm(px).toFixed(1)} mm` : "Set mm/px";
      const formatDistance = (
        start: { x: number; y: number },
        end: { x: number; y: number }
      ) => formatRulerDistancePx(Math.hypot(end.x - start.x, end.y - start.y));
      const formatAxisDistance = (
        start: { x: number; y: number },
        end: { x: number; y: number },
        axis: "x" | "y"
      ) => formatDistancePx(Math.abs(end[axis] - start[axis]));
      const formatLld = (
        start: { x: number; y: number },
        end: { x: number; y: number }
      ) => `LLD ${formatAxisDistance(start, end, "y")}`;
      const formatOffset = (
        start: { x: number; y: number },
        end: { x: number; y: number }
      ) => `Head Offset ${formatAxisDistance(start, end, "x")}`;
      const formatAngleValue = (
        a: { x: number; y: number },
        b: { x: number; y: number },
        c: { x: number; y: number }
      ) => {
        const ab = { x: a.x - b.x, y: a.y - b.y };
        const cb = { x: c.x - b.x, y: c.y - b.y };
        const abLen = Math.hypot(ab.x, ab.y);
        const cbLen = Math.hypot(cb.x, cb.y);
        if (abLen === 0 || cbLen === 0) return "0.0°";
        const dot = ab.x * cb.x + ab.y * cb.y;
        const cos = Math.max(-1, Math.min(1, dot / (abLen * cbLen)));
        const angle = (Math.acos(cos) * 180) / Math.PI;
        return `${angle.toFixed(1)}°`;
      };
      const formatAhkaInFrame = (
        hip: { x: number; y: number },
        knee: { x: number; y: number },
        ankle: { x: number; y: number },
        side?: Side
      ) => {
        const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
        const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };
        const v1Len = Math.hypot(v1.x, v1.y);
        const v2Len = Math.hypot(v2.x, v2.y);
        if (!v1Len || !v2Len) return "0.0°";
        const dot = v1.x * v2.x + v1.y * v2.y;
        const cos = Math.max(-1, Math.min(1, dot / (v1Len * v2Len)));
        const angle = (Math.acos(cos) * 180) / Math.PI;
        const deviation = 180 - angle;
        const rawCross = v1.x * v2.y - v1.y * v2.x;
        const resolvedSide =
          side ?? (knee.x < XRAY_BASE_WIDTH / 2 ? "Left" : "Right");
        const sideSign = resolvedSide === "Right" ? 1 : -1;
        const cross = rawCross * sideSign;
        const sideLabel = resolvedSide === "Right" ? "R" : "L";
        if (Math.abs(deviation) < 0.05) return `${sideLabel} Neutral 0.0°`;
        const label = cross >= 0 ? "Valgus" : "Varus";
        return `${sideLabel} ${label} ${Math.abs(deviation).toFixed(1)}°`;
      };
      const getAngleLabelPosition = (
        a: { x: number; y: number },
        b: { x: number; y: number },
        c: { x: number; y: number }
      ) => {
        const v1 = { x: a.x - b.x, y: a.y - b.y };
        const v2 = { x: c.x - b.x, y: c.y - b.y };
        const v1Len = Math.hypot(v1.x, v1.y);
        const v2Len = Math.hypot(v2.x, v2.y);
        if (!v1Len || !v2Len) return { x: b.x + 12, y: b.y + 12 };
        const u1 = { x: v1.x / v1Len, y: v1.y / v1Len };
        const u2 = { x: v2.x / v2Len, y: v2.y / v2Len };
        const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
        const bisLen = Math.hypot(bis.x, bis.y);
        const dir = bisLen
          ? { x: bis.x / bisLen, y: bis.y / bisLen }
          : { x: -u1.y, y: u1.x };
        const offset = 22;
        return { x: b.x + dir.x * offset, y: b.y + dir.y * offset };
      };
      const buildValgusCutGeometry = (
        hip: { x: number; y: number },
        knee: { x: number; y: number },
        params: { side: Side; angleDeg: number }
      ) => {
        const axis = { x: knee.x - hip.x, y: knee.y - hip.y };
        const axisLen = Math.hypot(axis.x, axis.y);
        if (!axisLen) return null;
        const axisUnit = { x: axis.x / axisLen, y: axis.y / axisLen };
        const baseline = { x: -axisUnit.y, y: axisUnit.x };
        const sign = params.side === "Right" ? 1 : -1;
        const theta = ((params.angleDeg * Math.PI) / 180) * sign;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const cutDir = {
          x: baseline.x * cos - baseline.y * sin,
          y: baseline.x * sin + baseline.y * cos,
        };
        const cutCenter = {
          x: knee.x + axisUnit.x * valgusCutOffsetPx,
          y: knee.y + axisUnit.y * valgusCutOffsetPx,
        };
        const half = Math.max(10, valgusCutLineLengthPx / 2);
        const cutA = {
          x: cutCenter.x - cutDir.x * half,
          y: cutCenter.y - cutDir.y * half,
        };
        const cutB = {
          x: cutCenter.x + cutDir.x * half,
          y: cutCenter.y + cutDir.y * half,
        };
        const baseA = {
          x: cutCenter.x - baseline.x * 60,
          y: cutCenter.y - baseline.y * 60,
        };
        const baseB = {
          x: cutCenter.x + baseline.x * 60,
          y: cutCenter.y + baseline.y * 60,
        };
        return { cutCenter, cutA, cutB, baseA, baseB };
      };

      const buildTibialSlopeGeometry = (
        prox: { x: number; y: number },
        dist: { x: number; y: number },
        params: { posteriorSide: Side; slopeDeg: number }
      ) => {
        const axis = { x: dist.x - prox.x, y: dist.y - prox.y };
        const axisLen = Math.hypot(axis.x, axis.y);
        if (!axisLen) return null;
        const axisUnit = { x: axis.x / axisLen, y: axis.y / axisLen };
        const baseline = { x: -axisUnit.y, y: axisUnit.x };
        const sign = params.posteriorSide === "Right" ? 1 : -1;
        const theta = ((params.slopeDeg * Math.PI) / 180) * sign;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const slopeDir = {
          x: baseline.x * cos - baseline.y * sin,
          y: baseline.x * sin + baseline.y * cos,
        };
        const cutCenter = {
          x: prox.x + axisUnit.x * tibialSlopeOffsetPx,
          y: prox.y + axisUnit.y * tibialSlopeOffsetPx,
        };
        const half = Math.max(10, tibialSlopeLineLengthPx / 2);
        const cutA = {
          x: cutCenter.x - slopeDir.x * half,
          y: cutCenter.y - slopeDir.y * half,
        };
        const cutB = {
          x: cutCenter.x + slopeDir.x * half,
          y: cutCenter.y + slopeDir.y * half,
        };
        const baseA = {
          x: cutCenter.x - baseline.x * 60,
          y: cutCenter.y - baseline.y * 60,
        };
        const baseB = {
          x: cutCenter.x + baseline.x * 60,
          y: cutCenter.y + baseline.y * 60,
        };
        return { axisUnit, cutCenter, cutA, cutB, baseA, baseB };
      };

      const buildTibialCutGeometry = (
        prox: { x: number; y: number },
        dist: { x: number; y: number },
        params: { direction: "Varus" | "Valgus"; angleDeg: number }
      ) => {
        const axis = { x: dist.x - prox.x, y: dist.y - prox.y };
        const axisLen = Math.hypot(axis.x, axis.y);
        if (!axisLen) return null;
        const axisUnit = { x: axis.x / axisLen, y: axis.y / axisLen };
        const baseline = { x: -axisUnit.y, y: axisUnit.x };
        const sign = params.direction === "Valgus" ? 1 : -1;
        const theta = ((params.angleDeg * Math.PI) / 180) * sign;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const cutDir = {
          x: baseline.x * cos - baseline.y * sin,
          y: baseline.x * sin + baseline.y * cos,
        };
        const cutCenter = {
          x: prox.x + axisUnit.x * tibialCutOffsetPx,
          y: prox.y + axisUnit.y * tibialCutOffsetPx,
        };
        const half = Math.max(10, tibialCutLineLengthPx / 2);
        const cutA = {
          x: cutCenter.x - cutDir.x * half,
          y: cutCenter.y - cutDir.y * half,
        };
        const cutB = {
          x: cutCenter.x + cutDir.x * half,
          y: cutCenter.y + cutDir.y * half,
        };
        const baseA = {
          x: cutCenter.x - baseline.x * 60,
          y: cutCenter.y - baseline.y * 60,
        };
        const baseB = {
          x: cutCenter.x + baseline.x * 60,
          y: cutCenter.y + baseline.y * 60,
        };
        return { axisUnit, cutCenter, cutA, cutB, baseA, baseB };
      };

      ctx.clearRect(0, 0, XRAY_BASE_WIDTH, XRAY_BASE_HEIGHT);
      const baseMode = options?.base ?? (cameraMode ? "camera" : "none");
      if (baseMode === "camera") {
        const video = videoRef.current;
        if (video && video.videoWidth && video.videoHeight) {
          const baseScale =
            cameraFit === "contain"
              ? Math.min(
                  XRAY_BASE_WIDTH / video.videoWidth,
                  XRAY_BASE_HEIGHT / video.videoHeight
                )
              : Math.max(
                  XRAY_BASE_WIDTH / video.videoWidth,
                  XRAY_BASE_HEIGHT / video.videoHeight
                );
          const scale = baseScale * (cameraZoomMode === "digital" ? cameraZoom : 1);
          const drawWidth = video.videoWidth * scale;
          const drawHeight = video.videoHeight * scale;
          const offsetX = (XRAY_BASE_WIDTH - drawWidth) / 2;
          const offsetY = (XRAY_BASE_HEIGHT - drawHeight) / 2;
          ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
        }
      } else if (baseMode === "xray") {
        const image = options?.backgroundImage ?? null;
        if (image) {
          const scale = Math.min(
            XRAY_BASE_WIDTH / image.width,
            XRAY_BASE_HEIGHT / image.height
          );
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          const offsetX = (XRAY_BASE_WIDTH - drawWidth) / 2;
          const offsetY = (XRAY_BASE_HEIGHT - drawHeight) / 2;
          ctx.save();
          ctx.filter = `contrast(${xrayContrast})`;
          ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
          ctx.restore();
        } else {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, XRAY_BASE_WIDTH, XRAY_BASE_HEIGHT);
        }
      }

      if (cutout && !cutout.hidden) {
        const opacity = Math.min(0.9, Math.max(0.2, cutout.opacity ?? 0.65));
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(0,0,0,${opacity})`;
        ctx.fillRect(0, 0, XRAY_BASE_WIDTH, XRAY_BASE_HEIGHT);
        ctx.globalCompositeOperation = "destination-out";
        const shape = cutout.shape ?? "rect";
        if (shape === "circle") {
          const cx = cutout.x + cutout.width / 2;
          const cy = cutout.y + cutout.height / 2;
          const r = Math.min(cutout.width, cutout.height) / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === "polygon") {
          const points = cutout.points ?? [];
          if (points.length >= 3) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i += 1) {
              ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(cutout.x, cutout.y, cutout.width, cutout.height);
          }
        } else {
          ctx.fillRect(cutout.x, cutout.y, cutout.width, cutout.height);
        }
        ctx.restore();
      }

      const DEFAULT_BASE = 300;
      const DEFAULT_PAD = 32;
      objects.forEach((o) => {
        const baseW =
          o.type === "image" ? (o.baseWidth ?? DEFAULT_BASE) : DEFAULT_BASE;
        const baseH =
          o.type === "image" ? (o.baseHeight ?? DEFAULT_BASE) : DEFAULT_BASE;
        const pad =
          o.type === "image" ? (o.paddingPx ?? DEFAULT_PAD) : DEFAULT_PAD;
        const totalW = baseW + pad * 2;
        const totalH = baseH + pad * 2;

        ctx.save();
        ctx.globalAlpha = o.opacity ?? 1;
        ctx.translate(
          o.position.x + totalW / 2,
          o.position.y + totalH / 2
        );
        ctx.rotate((o.rotation * Math.PI) / 180);
        ctx.scale(o.scaleX * (o.flipX ?? 1), o.scaleY * (o.flipY ?? 1));
        if (o.type === "shape") {
          ctx.fillStyle = o.fill;
          ctx.strokeStyle = o.stroke;
          ctx.lineWidth = o.strokeWidth;
          if (o.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, 128, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (o.shape === "square") {
            const size = 244;
            ctx.beginPath();
            ctx.rect(-size / 2, -size / 2, size, size);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(0, -124);
            ctx.lineTo(124, 124);
            ctx.lineTo(-124, 124);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else {
          const img = getCachedImage(o.imageSrc);
          if (img) {
            ctx.globalCompositeOperation = o.type === "implant" ? "screen" : "source-over";
            ctx.drawImage(
              img,
              -totalW / 2 + pad,
              -totalH / 2 + pad,
              baseW,
              baseH
            );
          }
        }
        ctx.restore();
      });

      const resolvePointFill = (lineColor: string) => {
        if (pointFillMode === "transparent") return null;
        if (pointFillMode === "matchLine") return lineColor;
        if (pointFillMode === "light") return "#ffffff";
        if (pointFillMode === "custom") return pointFillColor;
        return "#0b0f0d";
      };

      const drawPoint = (
        point: { x: number; y: number },
        lineColor: string,
        lineWidth: number
      ) => {
        const fill = resolvePointFill(lineColor);
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.lineWidth = Math.max(1, Math.min(3, lineWidth));
        ctx.strokeStyle = lineColor;
        ctx.stroke();
      };

      const drawLine = (
        start: { x: number; y: number },
        end: { x: number; y: number },
        color: string,
        label?: string,
        strokeWidth = MEASURE_STROKE_WIDTH
      ) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length;
        const uy = dy / length;
        const px = -uy;
        const py = ux;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const labelOffset = 14;
        const labelX = midX + px * labelOffset;
        const labelY = midY + py * labelOffset;
        const labelPad = 6;
        const textX = labelX + (px >= 0 ? labelPad : -labelPad);
        const textAlign: CanvasTextAlign = px >= 0 ? "left" : "right";

        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(labelX, labelY);
        ctx.stroke();

        drawPoint(start, color, strokeWidth);
        drawPoint(end, color, strokeWidth);

        if (label) {
          ctx.font = `700 ${MEASURE_FONT_SIZE}px sans-serif`;
          ctx.textAlign = textAlign;
          ctx.textBaseline = "middle";
          ctx.lineWidth = MEASURE_LABEL_STROKE_WIDTH;
          ctx.strokeStyle = "#0b0f0d";
          ctx.strokeText(label, textX, labelY);
          ctx.fillStyle = color;
          ctx.fillText(label, textX, labelY);
        }
      };

      measurements.forEach((m) => {
        if (m.hidden) return;
        drawLine(
          m.start,
          m.end,
          RULER_COLOR,
          showRulerLabels ? formatDistance(m.start, m.end) : undefined,
          rulerStrokeWidth
        );
      });
      lldMeasurements.forEach((m) => {
        if (m.hidden) return;
        drawLine(
          m.start,
          m.end,
          LLD_COLOR,
          showLldLabels ? formatLld(m.start, m.end) : undefined,
          lldStrokeWidth
        );
      });
      offsetMeasurements.forEach((m) => {
        if (m.hidden) return;
        drawLine(
          m.start,
          m.end,
          OFFSET_COLOR,
          showOffsetLabels ? formatOffset(m.start, m.end) : undefined,
          offsetStrokeWidth
        );
      });
      drawLines.forEach((line) => {
        if (line.hidden) return;
        drawLine(
          line.start,
          line.end,
          DRAW_LINE_COLOR,
          undefined,
          drawLineStrokeWidth
        );
      });

      const isClosedTrace = (points: { x: number; y: number }[]) => {
        if (points.length < 3) return false;
        const first = points[0];
        const last = points[points.length - 1];
        return Math.hypot(first.x - last.x, first.y - last.y) <= 14;
      };

      strokes.forEach((stroke) => {
        if (stroke.hidden) return;
        const pts = stroke.points ?? [];
        if (pts.length < 2) return;
        if (
          stroke.kind === "trace" &&
          traceFillOpacity > 0 &&
          isClosedTrace(pts)
        ) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, Math.max(0, traceFillOpacity));
          ctx.fillStyle = traceFillColor;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i += 1) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        const color =
          stroke.color ?? (stroke.kind === "trace" ? "#c084fc" : "#60a5fa");
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, stroke.strokeWidth ?? 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i += 1) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      });

      corMarkers.forEach((m, index) => {
        if (m.hidden) return;
        const p = m.point;
        const label = m.label ?? `COR${index + 1}`;
        const color = "#f97316";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(5, pointRadius + 1), 0, Math.PI * 2);
        const fill = resolvePointFill(color);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();

        ctx.font = `700 ${MEASURE_FONT_SIZE}px sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.lineWidth = MEASURE_LABEL_STROKE_WIDTH;
        ctx.strokeStyle = "#0b0f0d";
        ctx.strokeText(label, p.x + 10, p.y - 10);
        ctx.fillStyle = color;
        ctx.fillText(label, p.x + 10, p.y - 10);
      });

      angleMeasurements.forEach((m) => {
        if (m.hidden) return;
        const labelPos = getAngleLabelPosition(m.a, m.b, m.c);
        ctx.strokeStyle = ANGLE_COLOR;
        ctx.lineWidth = angleStrokeWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.b.x, m.b.y);
        ctx.lineTo(m.a.x, m.a.y);
        ctx.moveTo(m.b.x, m.b.y);
        ctx.lineTo(m.c.x, m.c.y);
        ctx.stroke();
        drawPoint(m.b, ANGLE_COLOR, angleStrokeWidth);
        if (showAngleLabels) {
          const label = formatAngleValue(m.a, m.b, m.c);
          ctx.font = `700 ${ANGLE_FONT_SIZE}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = ANGLE_LABEL_STROKE_WIDTH;
          ctx.strokeStyle = "#0b0f0d";
          ctx.strokeText(label, labelPos.x, labelPos.y);
          ctx.fillStyle = ANGLE_COLOR;
          ctx.fillText(label, labelPos.x, labelPos.y);
        }
      });

      ahkaMeasurements.forEach((m) => {
        if (m.hidden) return;
        const labelPos = getAngleLabelPosition(m.hip, m.knee, m.ankle);
        ctx.strokeStyle = AHKA_COLOR;
        ctx.lineWidth = ahkaStrokeWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.knee.x, m.knee.y);
        ctx.lineTo(m.hip.x, m.hip.y);
        ctx.moveTo(m.knee.x, m.knee.y);
        ctx.lineTo(m.ankle.x, m.ankle.y);
        ctx.stroke();
        drawPoint(m.knee, AHKA_COLOR, ahkaStrokeWidth);
        if (showAhkaLabels) {
          const label = formatAhkaInFrame(m.hip, m.knee, m.ankle, m.side);
          ctx.font = `700 ${ANGLE_FONT_SIZE}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = ANGLE_LABEL_STROKE_WIDTH;
          ctx.strokeStyle = "#0b0f0d";
          ctx.strokeText(label, labelPos.x, labelPos.y);
          ctx.fillStyle = AHKA_COLOR;
          ctx.fillText(label, labelPos.x, labelPos.y);
        }
      });

      valgusCutLines.forEach((line, index) => {
        if (line.hidden) return;
        const geom = buildValgusCutGeometry(line.hip, line.knee, {
          side: line.side,
          angleDeg: line.angleDeg,
        });
        if (!geom) return;
        ctx.strokeStyle = VALGUS_CUT_COLOR;
        ctx.lineWidth = Math.max(1, valgusCutStrokeWidth - 0.5);
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(line.hip.x, line.hip.y);
        ctx.lineTo(line.knee.x, line.knee.y);
        ctx.stroke();

        ctx.setLineDash([4, 4]);
        ctx.lineWidth = Math.max(1, valgusCutStrokeWidth - 0.8);
        ctx.beginPath();
        ctx.moveTo(geom.baseA.x, geom.baseA.y);
        ctx.lineTo(geom.baseB.x, geom.baseB.y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.lineWidth = valgusCutStrokeWidth;
        ctx.beginPath();
        ctx.moveTo(geom.cutA.x, geom.cutA.y);
        ctx.lineTo(geom.cutB.x, geom.cutB.y);
        ctx.stroke();

        drawPoint(line.hip, VALGUS_CUT_COLOR, valgusCutStrokeWidth);
        drawPoint(line.knee, VALGUS_CUT_COLOR, valgusCutStrokeWidth);

        if (showValgusCutLabels) {
          const label = `VC${index + 1} ${line.side} Valgus ${line.angleDeg}°`;
          ctx.font = `700 ${ANGLE_FONT_SIZE}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = ANGLE_LABEL_STROKE_WIDTH;
          ctx.strokeStyle = "#0b0f0d";
          ctx.strokeText(label, geom.cutCenter.x, geom.cutCenter.y - 12);
          ctx.fillStyle = VALGUS_CUT_COLOR;
          ctx.fillText(label, geom.cutCenter.x, geom.cutCenter.y - 12);
        }
      });

      tibialSlopeLines.forEach((line, index) => {
        if (line.hidden) return;
        const geom = buildTibialSlopeGeometry(line.prox, line.dist, {
          posteriorSide: line.posteriorSide,
          slopeDeg: line.slopeDeg,
        });
        if (!geom) return;
        ctx.strokeStyle = TIBIAL_SLOPE_COLOR;

        ctx.lineWidth = Math.max(1, tibialSlopeStrokeWidth - 0.5);
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(line.prox.x, line.prox.y);
        ctx.lineTo(line.dist.x, line.dist.y);
        ctx.stroke();

        ctx.setLineDash([4, 4]);
        ctx.lineWidth = Math.max(1, tibialSlopeStrokeWidth - 0.8);
        ctx.beginPath();
        ctx.moveTo(geom.baseA.x, geom.baseA.y);
        ctx.lineTo(geom.baseB.x, geom.baseB.y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.lineWidth = tibialSlopeStrokeWidth;
        ctx.beginPath();
        ctx.moveTo(geom.cutA.x, geom.cutA.y);
        ctx.lineTo(geom.cutB.x, geom.cutB.y);
        ctx.stroke();

        drawPoint(line.prox, TIBIAL_SLOPE_COLOR, tibialSlopeStrokeWidth);
        drawPoint(line.dist, TIBIAL_SLOPE_COLOR, tibialSlopeStrokeWidth);

        if (showTibialSlopeLabels) {
          const label = `TS${index + 1} ${line.posteriorSide} Posterior ${line.slopeDeg}°`;
          ctx.font = `700 ${ANGLE_FONT_SIZE}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = ANGLE_LABEL_STROKE_WIDTH;
          ctx.strokeStyle = "#0b0f0d";
          ctx.strokeText(label, geom.cutCenter.x, geom.cutCenter.y - 12);
          ctx.fillStyle = TIBIAL_SLOPE_COLOR;
          ctx.fillText(label, geom.cutCenter.x, geom.cutCenter.y - 12);
        }
      });

      tibialCutLines.forEach((line, index) => {
        if (line.hidden) return;
        const geom = buildTibialCutGeometry(line.prox, line.dist, {
          direction: line.direction,
          angleDeg: line.angleDeg,
        });
        if (!geom) return;
        ctx.strokeStyle = TIBIAL_CUT_COLOR;

        ctx.lineWidth = Math.max(1, tibialCutStrokeWidth - 0.5);
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(line.prox.x, line.prox.y);
        ctx.lineTo(line.dist.x, line.dist.y);
        ctx.stroke();

        ctx.setLineDash([4, 4]);
        ctx.lineWidth = Math.max(1, tibialCutStrokeWidth - 0.8);
        ctx.beginPath();
        ctx.moveTo(geom.baseA.x, geom.baseA.y);
        ctx.lineTo(geom.baseB.x, geom.baseB.y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.lineWidth = tibialCutStrokeWidth;
        ctx.beginPath();
        ctx.moveTo(geom.cutA.x, geom.cutA.y);
        ctx.lineTo(geom.cutB.x, geom.cutB.y);
        ctx.stroke();

        drawPoint(line.prox, TIBIAL_CUT_COLOR, tibialCutStrokeWidth);
        drawPoint(line.dist, TIBIAL_CUT_COLOR, tibialCutStrokeWidth);

        if (showTibialCutLabels) {
          const label = `TC${index + 1} ${line.angleDeg}°`;
          ctx.font = `700 ${ANGLE_FONT_SIZE}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = ANGLE_LABEL_STROKE_WIDTH;
          ctx.strokeStyle = "#0b0f0d";
          ctx.strokeText(label, geom.cutCenter.x, geom.cutCenter.y - 12);
          ctx.fillStyle = TIBIAL_CUT_COLOR;
          ctx.fillText(label, geom.cutCenter.x, geom.cutCenter.y - 12);
        }
      });

      annotations.forEach((a) => {
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(a.x, a.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "600 11px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#0b0f0d";
        ctx.strokeText(a.text, a.x + 6, a.y + 6);
        ctx.fillStyle = "#fcd34d";
        ctx.fillText(a.text, a.x + 6, a.y + 6);
      });
    },
    [
      annotations,
      ahkaMeasurements,
      cameraMode,
      drawLines,
      getCachedImage,
      lldMeasurements,
      measurements,
      strokes,
      corMarkers,
      effectiveMmPerPixel,
      xrayContrast,
      offsetMeasurements,
      angleMeasurements,
      cutout,
      objects,
      pointRadius,
      pointFillMode,
      pointFillColor,
      traceFillColor,
      traceFillOpacity,
      drawLineStrokeWidth,
      ahkaStrokeWidth,
      rulerStrokeWidth,
      lldStrokeWidth,
      offsetStrokeWidth,
      angleStrokeWidth,
      cameraFit,
      cameraZoom,
      cameraZoomMode,
      valgusCutOffsetPx,
      valgusCutStrokeWidth,
      valgusCutLineLengthPx,
      valgusCutLines,
      tibialSlopeOffsetPx,
      tibialSlopeLineLengthPx,
      tibialSlopeStrokeWidth,
      tibialSlopeLines,
      tibialCutOffsetPx,
      tibialCutLineLengthPx,
      tibialCutStrokeWidth,
      tibialCutLines,
      showRulerLabels,
      showLldLabels,
      showOffsetLabels,
      showAngleLabels,
      showAhkaLabels,
      showValgusCutLabels,
      showTibialSlopeLabels,
      showTibialCutLabels,
    ]
  );

  const copyCutoutFromCanvas = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!cutout) {
      toast({
        title: "Cutout belum dibuat",
        description: "Aktifkan Cutout lalu buat area yang ingin di-crop.",
      });
      return;
    }

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = XRAY_BASE_WIDTH;
    fullCanvas.height = XRAY_BASE_HEIGHT;
    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) return;
    fullCtx.imageSmoothingEnabled = true;
    fullCtx.imageSmoothingQuality = "high";

    let backgroundImage: HTMLImageElement | null = null;
    if (!cameraMode && background) {
      backgroundImage = await ensureImageLoaded(background);
    }

    drawCompositeFrame(fullCtx, {
      base: cameraMode ? "camera" : "xray",
      backgroundImage,
    });

    const w = Math.max(1, Math.round(cutout.width));
    const h = Math.max(1, Math.round(cutout.height));
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = w;
    cropCanvas.height = h;
    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const shape = cutout.shape ?? cutoutShape;
    const sx = cutout.x;
    const sy = cutout.y;
    const sw = cutout.width;
    const sh = cutout.height;
    if (shape === "polygon") {
      const points = cutout.points ?? [];
      if (points.length < 3) {
        toast({
          title: "Cutout polygon belum lengkap",
          description: "Buat minimal 3 titik lalu tutup shape.",
        });
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x - cutout.x, points[0].y - cutout.y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x - cutout.x, points[i].y - cutout.y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        fullCanvas,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        w,
        h
      );
      ctx.restore();
    } else if (shape === "circle") {
      ctx.save();
      const r = Math.min(w, h) / 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        fullCanvas,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        w,
        h
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        fullCanvas,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        w,
        h
      );
    }

    let dataUrl: string;
    try {
      dataUrl = cropCanvas.toDataURL("image/png");
    } catch {
      toast({
        title: "Gagal membuat overlay",
        description: "Browser tidak mengizinkan export canvas.",
      });
      return;
    }

    disableMeasurementModes();
    pushHistorySnapshot();
    const overlay = createImageOverlay("Canvas Slice", dataUrl, {
      position: { x: cutout.x, y: cutout.y },
      opacity: 1,
      baseWidth: w,
      baseHeight: h,
      paddingPx: 0,
    });
    setObjects((prev) => [...prev, overlay]);
    setActiveId(overlay.id);

    toast({
      title: "Canvas copied",
      description: "Overlay baru dibuat dari hasil canvas.",
    });
  }, [
    background,
    cameraMode,
    createImageOverlay,
    cutout,
    cutoutShape,
    disableMeasurementModes,
    drawCompositeFrame,
    ensureImageLoaded,
    pushHistorySnapshot,
  ]);

  const copyCutoutFromActiveItem = useCallback(
    async (cut: boolean) => {
      if (typeof window === "undefined") return;
      if (!cutout) {
        toast({
          title: "Cutout belum dibuat",
          description: "Aktifkan Cutout lalu buat area yang ingin di-crop.",
        });
        return;
      }
      const item = objects.find((o) => o.id === activeId) ?? null;
      if (!item) {
        toast({
          title: "Tidak ada item aktif",
          description: "Pilih template/overlay dulu sebelum copy/cut.",
        });
        return;
      }

      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = XRAY_BASE_WIDTH;
      fullCanvas.height = XRAY_BASE_HEIGHT;
      const ctxFull = fullCanvas.getContext("2d");
      if (!ctxFull) return;

      ctxFull.imageSmoothingEnabled = true;
      ctxFull.imageSmoothingQuality = "high";
      ctxFull.clearRect(0, 0, XRAY_BASE_WIDTH, XRAY_BASE_HEIGHT);

      const DEFAULT_BASE = 300;
      const DEFAULT_PAD = 32;
      const baseW =
        item.type === "image" ? (item.baseWidth ?? DEFAULT_BASE) : DEFAULT_BASE;
      const baseH =
        item.type === "image" ? (item.baseHeight ?? DEFAULT_BASE) : DEFAULT_BASE;
      const pad =
        item.type === "image" ? (item.paddingPx ?? DEFAULT_PAD) : DEFAULT_PAD;
      const totalW = baseW + pad * 2;
      const totalH = baseH + pad * 2;

      ctxFull.save();
      ctxFull.globalAlpha = item.opacity ?? 1;
      ctxFull.translate(
        item.position.x + totalW / 2,
        item.position.y + totalH / 2
      );
      ctxFull.rotate((item.rotation * Math.PI) / 180);
      ctxFull.scale(
        item.scaleX * (item.flipX ?? 1),
        item.scaleY * (item.flipY ?? 1)
      );

      if (item.type === "shape") {
        ctxFull.fillStyle = item.fill;
        ctxFull.strokeStyle = item.stroke;
        ctxFull.lineWidth = item.strokeWidth;
        if (item.shape === "circle") {
          ctxFull.beginPath();
          ctxFull.arc(0, 0, 128, 0, Math.PI * 2);
          ctxFull.fill();
          ctxFull.stroke();
        } else if (item.shape === "square") {
          const size = 244;
          ctxFull.beginPath();
          ctxFull.rect(-size / 2, -size / 2, size, size);
          ctxFull.fill();
          ctxFull.stroke();
        } else {
          ctxFull.beginPath();
          ctxFull.moveTo(0, -124);
          ctxFull.lineTo(124, 124);
          ctxFull.lineTo(-124, 124);
          ctxFull.closePath();
          ctxFull.fill();
          ctxFull.stroke();
        }
      } else {
        const img =
          getCachedImage(item.imageSrc) ??
          (await ensureImageLoaded(item.imageSrc));
        if (!img) {
          toast({
            title: "Gagal memuat item",
            description: "Coba pilih ulang template/overlay.",
          });
          ctxFull.restore();
          return;
        }
        ctxFull.globalCompositeOperation = "source-over";
        ctxFull.drawImage(
          img,
          -totalW / 2 + pad,
          -totalH / 2 + pad,
          baseW,
          baseH
        );
      }
      ctxFull.restore();

      const w = Math.max(1, Math.round(cutout.width));
      const h = Math.max(1, Math.round(cutout.height));
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = w;
      cropCanvas.height = h;
      const ctx = cropCanvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const shape = cutout.shape ?? cutoutShape;
      const sx = cutout.x;
      const sy = cutout.y;
      const sw = cutout.width;
      const sh = cutout.height;
      if (shape === "polygon") {
        const points = cutout.points ?? [];
        if (points.length < 3) {
          toast({
            title: "Cutout polygon belum lengkap",
            description: "Buat minimal 3 titik lalu tutup shape.",
          });
          return;
        }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x - cutout.x, points[0].y - cutout.y);
        for (let i = 1; i < points.length; i += 1) {
          ctx.lineTo(points[i].x - cutout.x, points[i].y - cutout.y);
        }
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          fullCanvas,
          sx,
          sy,
          sw,
          sh,
          0,
          0,
          w,
          h
        );
        ctx.restore();
      } else if (shape === "circle") {
        ctx.save();
        const r = Math.min(w, h) / 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          fullCanvas,
          sx,
          sy,
          sw,
          sh,
          0,
          0,
          w,
          h
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          fullCanvas,
          sx,
          sy,
          sw,
          sh,
          0,
          0,
          w,
          h
        );
      }

      let dataUrl: string;
      try {
        dataUrl = cropCanvas.toDataURL("image/png");
      } catch {
        toast({
          title: "Gagal membuat overlay",
          description: "Browser tidak mengizinkan export canvas.",
        });
        return;
      }

      disableMeasurementModes();
      pushHistorySnapshot();
      const overlay = createImageOverlay(
        cut ? "Item Cut" : "Item Copy",
        dataUrl,
        {
          position: { x: cutout.x, y: cutout.y },
          opacity: 1,
          baseWidth: w,
          baseHeight: h,
          paddingPx: 0,
        }
      );
      setObjects((prev) => {
        const next = [...prev, overlay];
        return cut ? next.filter((o) => o.id !== item.id) : next;
      });
      setActiveId(overlay.id);

      toast({
        title: cut ? "Item cut" : "Item copied",
        description: cut
          ? "Overlay baru dibuat dan item lama dihapus."
          : "Overlay baru dibuat dari item aktif.",
      });
    },
    [
      activeId,
      createImageOverlay,
      cutout,
      cutoutShape,
      disableMeasurementModes,
      ensureImageLoaded,
      getCachedImage,
      objects,
      pushHistorySnapshot,
    ]
  );

  const renderReportCanvas = useCallback(async () => {
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = XRAY_BASE_WIDTH;
    frameCanvas.height = XRAY_BASE_HEIGHT;
    const frameCtx = frameCanvas.getContext("2d");
    if (!frameCtx) return null;

    let backgroundImage: HTMLImageElement | null = null;
    if (!cameraMode && background) {
      backgroundImage = await ensureImageLoaded(background);
    }

    drawCompositeFrame(frameCtx, {
      base: cameraMode ? "camera" : "xray",
      backgroundImage,
    });

    const lines = buildReportLines();
    const lineHeight = 16;
    const summaryPadding = 16;
    const titleHeight = 22;
    const infoHeight = 18;
    const summaryHeight = Math.max(
      140,
      summaryPadding * 2 + titleHeight + infoHeight + lines.length * lineHeight
    );

    const canvas = document.createElement("canvas");
    canvas.width = XRAY_BASE_WIDTH;
    canvas.height = XRAY_BASE_HEIGHT + summaryHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(frameCanvas, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, XRAY_BASE_HEIGHT, XRAY_BASE_WIDTH, summaryHeight);

    ctx.fillStyle = "#111827";
    ctx.textBaseline = "top";
    ctx.font = "700 16px sans-serif";
    ctx.fillText("Templating Report", 20, XRAY_BASE_HEIGHT + summaryPadding);

    ctx.font = "500 12px sans-serif";
    const info = effectiveMmPerPixel
      ? `Calibration: ${effectiveMmPerPixel.toFixed(4)} mm/px (factor ${magnificationFactor.toFixed(
          3
        )}, marker ${realMm} mm)`
      : "Calibration: not set";
    ctx.fillText(info, 20, XRAY_BASE_HEIGHT + summaryPadding + titleHeight);

    let y = XRAY_BASE_HEIGHT + summaryPadding + titleHeight + infoHeight;
    lines.forEach((line) => {
      ctx.fillText(line, 20, y);
      y += lineHeight;
    });

    return canvas;
  }, [
    background,
    buildReportLines,
    cameraMode,
    drawCompositeFrame,
    ensureImageLoaded,
    effectiveMmPerPixel,
    magnificationFactor,
    realMm,
  ]);

  const exportReport = useCallback(
    async (format: "png" | "pdf") => {
      if (typeof window === "undefined") return;
      if (cameraMode && !cameraReady) {
        toast({
          title: "Kamera belum siap",
          description: "Aktifkan Camera Mode terlebih dulu.",
        });
        return;
      }
      const canvas = await renderReportCanvas();
      if (!canvas) {
        toast({
          title: "Report gagal",
          description: "Tidak bisa membuat report sekarang.",
        });
        return;
      }
      if (format === "png") {
        canvas.toBlob((blob) => {
          if (!blob) return;
          downloadBlob(blob, `templating-report-${Date.now()}.png`);
        }, "image/png");
        return;
      }
      const dataUrl = canvas.toDataURL("image/png");
      const win = window.open("", "_blank");
      if (!win) {
        toast({
          title: "Popup diblok",
          description: "Izinkan pop-up untuk export PDF.",
        });
        return;
      }
      win.document.write(`
        <html>
          <head>
            <title>Templating Report</title>
            <style>
              body { margin: 0; padding: 24px; font-family: Arial, sans-serif; }
              img { max-width: 100%; height: auto; display: block; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Templating Report" />
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    },
    [cameraMode, cameraReady, downloadBlob, renderReportCanvas]
  );

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera API tidak tersedia.");
      toast({
        title: "Camera tidak tersedia",
        description: "Browser ini tidak mendukung akses kamera.",
      });
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      const track = stream.getVideoTracks?.()[0] ?? null;
      cameraTrackRef.current = track;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }
      if (track) {
        const capabilities = (track.getCapabilities?.() ?? {}) as Partial<
          MediaTrackCapabilities & {
            zoom?: { min: number; max: number; step?: number };
            focusMode?: string[];
            exposureMode?: string[];
            whiteBalanceMode?: string[];
          }
        >;

        const zoomCaps = capabilities.zoom;
        if (
          zoomCaps &&
          typeof zoomCaps.min === "number" &&
          typeof zoomCaps.max === "number"
        ) {
          const min = zoomCaps.min;
          const max = zoomCaps.max;
          const step = zoomCaps.step && zoomCaps.step > 0 ? zoomCaps.step : 0.1;
          setCameraZoomRange({ min, max, step });
          setCameraZoomMode("hardware");
          const zoomValue = Math.min(max, Math.max(min, cameraZoom));
          setCameraZoom(zoomValue);
          track
            .applyConstraints({
              advanced: [
                ({ zoom: zoomValue } as unknown as MediaTrackConstraintSet),
              ],
            })
            .catch(() => undefined);
        } else {
          setCameraZoomMode("digital");
          setCameraZoomRange({ min: 1, max: 3, step: 0.1 });
        }

        const advanced: MediaTrackConstraintSet[] = [];
        if (
          Array.isArray(capabilities.focusMode) &&
          capabilities.focusMode.includes("continuous")
        ) {
          advanced.push({ focusMode: "continuous" } as MediaTrackConstraintSet);
        }
        if (
          Array.isArray(capabilities.exposureMode) &&
          capabilities.exposureMode.includes("continuous")
        ) {
          advanced.push({ exposureMode: "continuous" } as MediaTrackConstraintSet);
        }
        if (
          Array.isArray(capabilities.whiteBalanceMode) &&
          capabilities.whiteBalanceMode.includes("continuous")
        ) {
          advanced.push({
            whiteBalanceMode: "continuous",
          } as MediaTrackConstraintSet);
        }
        if (advanced.length) {
          track.applyConstraints({ advanced }).catch(() => undefined);
        }
      }
      setCameraReady(true);
      setCameraError(null);
      return true;
    } catch (err) {
      setCameraError("Izin kamera ditolak atau tidak tersedia.");
      toast({
        title: "Tidak bisa membuka kamera",
        description: "Pastikan izin kamera sudah diberikan.",
      });
      return false;
    }
  }, [cameraZoom]);

  useEffect(() => {
    if (!cameraMode || !cameraReady) return;
    if (cameraZoomMode !== "hardware") return;
    const track = cameraTrackRef.current;
    if (!track) return;
    track
      .applyConstraints({
        advanced: [({ zoom: cameraZoom } as unknown as MediaTrackConstraintSet)],
      })
      .catch(() => undefined);
  }, [cameraMode, cameraReady, cameraZoom, cameraZoomMode]);

  const stopCameraStream = useCallback(() => {
    if (recordRafRef.current) {
      window.cancelAnimationFrame(recordRafRef.current);
      recordRafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    cameraTrackRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopCameraStream();
    setIsRecording(false);
    setCameraReady(false);
  }, [stopCameraStream]);

  const resetSession = useCallback(() => {
    disableMeasurementModes();
    resetInteractionDrafts();
    resetHistory();

    setPanMode(false);
    setViewPan({ x: 0, y: 0 });
    setCanvasMode("fit");
    setZoom(1);

    setBackground(null);
    setXraySourceScale(1);
    setXrayContrast(1);
    setCutout(null);
    setCutoutMode(false);
    setCutoutAnchor(null);
    setCutoutDraft(null);
    setCutoutPolyPoints([]);
    setCutoutPolyCursor(null);
    cutoutDragRef.current = {
      active: false,
      pointerId: null,
      kind: null,
      startPoint: null,
      startRect: null,
    };

    setRealMm(100);
    setPixelsPerMm(null);
    setUseRealScale(false);
    setXrayMagnificationFactor(1);

    setObjects([]);
    setActiveId(null);
    setMeasurements([]);
    setLldMeasurements([]);
    setOffsetMeasurements([]);
    setAngleMeasurements([]);
    setAhkaMeasurements([]);
    setDrawLines([]);
    setStrokes([]);
    setCorMarkers([]);
    setAnnotations([]);
    setValgusCutLines([]);
    setTibialSlopeLines([]);
    setTibialCutLines([]);

    setTraceFillColor("#c084fc");
    setTraceFillOpacity(0.2);

    setOpenImplantModal(false);
    setMobileToolOpen(false);
    setMobileUiHidden(false);
    setMobileXrayPanelOpen(true);
    setMeasurePanelOpen(true);
    setMeasurePanelMinimized(false);

    if (cameraMode) {
      stopCamera();
      setCameraMode(false);
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
    }

    toast({
      title: "Session direset",
      description: "Mulai templating baru dari awal.",
    });
  }, [
    cameraMode,
    disableMeasurementModes,
    resetHistory,
    resetInteractionDrafts,
    setTibialCutLines,
    setTibialSlopeLines,
    setValgusCutLines,
    stopCamera,
  ]);

  const requestCameraAccess = useCallback(() => {
    toast({
      title: "Izin kamera dibutuhkan",
      description: "Silakan pilih Allow agar kamera bisa dipakai.",
    });
    return startCamera();
  }, [startCamera]);

  const toggleCameraMode = useCallback(() => {
    const mobileView = typeof window !== "undefined" && window.innerWidth < 768;
    if (!mobileView) {
      toast({
        title: "Camera hanya di mobile",
        description: "Buka halaman ini di HP untuk memakai kamera.",
      });
      return;
    }
    const next = !cameraMode;
    if (next) {
      setCameraZoom(1);
      setCameraFit("cover");
      requestCameraAccess().then((ok) => {
        if (!ok) setCameraMode(false);
      });
    } else {
      stopCamera();
    }
    setCameraMode(next);
  }, [cameraMode, requestCameraAccess, stopCamera]);

  const cameraDigitalZoom = cameraMode && cameraZoomMode === "digital" ? cameraZoom : 1;

  const takeSnapshot = useCallback(async () => {
    if (!cameraMode || !cameraReady) {
      toast({
        title: "Kamera belum siap",
        description: "Aktifkan Camera Mode terlebih dulu.",
      });
      return;
    }
    await Promise.all(
      objects
        .filter((o) => o.type !== "shape")
        .map((o) => ensureImageLoaded(o.imageSrc))
    );
    const canvas = document.createElement("canvas");
    canvas.width = XRAY_BASE_WIDTH;
    canvas.height = XRAY_BASE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCompositeFrame(ctx);
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `xray-camera-${Date.now()}.png`);
    }, "image/png");
  }, [
    cameraMode,
    cameraReady,
    drawCompositeFrame,
    downloadBlob,
    ensureImageLoaded,
    objects,
  ]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    if (!cameraMode || !cameraReady) {
      toast({
        title: "Kamera belum siap",
        description: "Aktifkan Camera Mode terlebih dulu.",
      });
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      toast({
        title: "Record tidak tersedia",
        description: "Browser ini belum mendukung perekaman.",
      });
      return;
    }
    await Promise.all(
      objects
        .filter((o) => o.type !== "shape")
        .map((o) => ensureImageLoaded(o.imageSrc))
    );
    const canvas = document.createElement("canvas");
    canvas.width = XRAY_BASE_WIDTH;
    canvas.height = XRAY_BASE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stream = canvas.captureStream(30);
    recordChunksRef.current = [];
    const preferredTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const options = preferredTypes.find(
      (type) =>
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(type)
    );
    const recorder = new MediaRecorder(
      stream,
      options ? { mimeType: options } : undefined
    );
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) {
        recordChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(recordChunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      recordChunksRef.current = [];
      downloadBlob(blob, `xray-camera-${Date.now()}.webm`);
      setIsRecording(false);
    };
    recorderRef.current = recorder;
    const drawLoop = () => {
      drawCompositeFrame(ctx);
      recordRafRef.current = window.requestAnimationFrame(drawLoop);
    };
    drawLoop();
    recorder.start();
    setIsRecording(true);
  }, [
    cameraMode,
    cameraReady,
    drawCompositeFrame,
    downloadBlob,
    ensureImageLoaded,
    isRecording,
    objects,
  ]);

  const stopRecording = useCallback(() => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    if (recordRafRef.current) {
      window.cancelAnimationFrame(recordRafRef.current);
      recordRafRef.current = null;
    }
  }, []);

  const buildTourSteps = useCallback((): DriveStep[] => {
    const steps: DriveStep[] = [
      {
        element: '[data-tour="panel"]',
        popover: {
          title: "X-ray Control",
          description: "Panel utama untuk upload X-ray, template, dan tools.",
          side: "right",
          align: "center",
        },
      },
      {
        element: '[data-tour="xray-upload"]',
        popover: {
          title: "Upload & Template",
          description: "Upload X-ray dan buka modal template implant.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="xray-zoom"]',
        popover: {
          title: "Imaging",
          description: "Atur contrast dan zoom untuk melihat detail.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="measure-tools"]',
        popover: {
          title: "Measurement Tools",
          description: "Ruler, LLD, Offset, dan Angle untuk pengukuran.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="calibration"]',
        popover: {
          title: "Calibration",
          description: "Kalibrasi agar hasil mm sesuai skala X-ray.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="stage"]',
        popover: {
          title: "Canvas",
          description: "Klik di canvas untuk ukur dan drag template.",
          side: "over",
          align: "center",
        },
      },
      {
        element: '[data-tour="measure-overlay"]',
        popover: {
          title: "Overlay",
          description: "Garis dan label ukuran muncul di atas X-ray.",
          side: "over",
          align: "center",
        },
      },
      {
        element: '[data-tour="annotations"]',
        popover: {
          title: "Annotations",
          description: "Tambah catatan dan lihat overview di sini.",
          side: "right",
          align: "start",
        },
      },
    ];

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const toolbarSelector = isMobile
      ? '[data-tour="toolbar-mobile"]'
      : '[data-tour="toolbar-desktop"]';
    if (
      typeof document !== "undefined" &&
      document.querySelector(toolbarSelector)
    ) {
      steps.push({
        element: toolbarSelector,
        popover: {
          title: "Implant Tool",
          description: "Kontrol implant: move, scale, rotate, flip, undo/redo.",
          side: isMobile ? "top" : "left",
          align: "center",
        },
      });
    }

    return steps.filter((step) => {
      if (!step.element) return false;
      if (typeof step.element === "string") {
        return typeof document !== "undefined"
          ? Boolean(document.querySelector(step.element))
          : false;
      }
      return true;
    });
  }, []);
  const startTour = useCallback(() => {
    if (typeof window === "undefined") return false;
    const steps = buildTourSteps();
    if (!steps.length) return false;
    toast({
      title: "Panduan UI dimulai",
      description:
        "Ikuti langkahnya, klik tombol ? untuk mengulang kapan saja.",
    });
    driverRef.current?.destroy();
    const instance = driver({
      steps,
      showProgress: true,
      showButtons: ["previous", "next", "close"],
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 10,
      onDestroyed: () => {
        localStorage.setItem(TOUR_STORAGE_KEY, "1");
      },
    });
    driverRef.current = instance;
    instance.drive();
    return true;
  }, [buildTourSteps]);

  const startTourWithToast = useCallback(() => {
    const started = startTour();
    if (!started) {
      toast({
        title: "Tour belum siap",
        description: "Coba lagi sebentar atau refresh halaman.",
      });
    }
  }, [startTour]);

  useEffect(() => {
    if (!autoStartTour) return;
    if (tourAutoStarted.current) return;
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(TOUR_STORAGE_KEY) === "1";
    if (seen) return;
    let attempts = 0;
    let timer: number | undefined;
    const tryStart = () => {
      const started = startTour();
      if (started) {
        tourAutoStarted.current = true;
        return;
      }
      attempts += 1;
      if (attempts < 8) {
        timer = window.setTimeout(tryStart, 200);
      }
    };
    timer = window.setTimeout(tryStart, 250);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [autoStartTour, startTour]);

  useEffect(() => {
    return () => stopCameraStream();
  }, [stopCameraStream]);

  useEffect(() => {
    return () => driverRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("toast-center");
    return () => {
      document.body.classList.remove("toast-center");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const session: PersistedTemplatingSession = {
      v: 1,
      savedAt: Date.now(),
      background,
      xraySourceScale,
      xrayMagnificationFactor,
      xrayContrast,
      zoom,
      canvasMode,
      viewPan,
      cutout,
      realMm,
      pixelsPerMm,
      mmPerPixel,
      useRealScale,
      objects,
      activeId,
      measurements,
      lldMeasurements,
      offsetMeasurements,
      angleMeasurements,
      ahkaMeasurements,
      drawLines,
      strokes,
      corMarkers,
      annotations,
      valgusCutLines,
      tibialSlopeLines,
      tibialCutLines,
      ui: {
        drawLineStrokeWidth,
        ahkaStrokeWidth,
        rulerStrokeWidth,
        lldStrokeWidth,
        offsetStrokeWidth,
        angleStrokeWidth,
        pointRadius,
        pointFillMode,
        pointFillColor,
        traceFillColor,
        traceFillOpacity,
        showRulerLabels,
        showLldLabels,
        showOffsetLabels,
        showAngleLabels,
        showAhkaLabels,
        ahkaEditLocked,
        showValgusCutLabels,
        showTibialSlopeLabels,
        showTibialCutLabels,
        measurementsPanelOpen: measurePanelOpen,
      },
      knee: {
        valgusCutAngleDeg,
        valgusCutSide,
        valgusCutOffsetPx,
        valgusCutStrokeWidth,
        valgusCutLineLengthPx,
        tibialSlopeDeg,
        tibialPosteriorSide,
        tibialSlopeOffsetPx,
        tibialSlopeStrokeWidth,
        tibialSlopeLineLengthPx,
        tibialCutAngleDeg,
        tibialCutDirection,
        tibialCutOffsetPx,
        tibialCutStrokeWidth,
        tibialCutLineLengthPx,
      },
    };

    let next: string;
    try {
      next = JSON.stringify(session);
    } catch {
      return;
    }

    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, next);
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, next);
        } catch {
          // ignore
        }
      } catch {
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, next);
        } catch {
          // ignore storage quota / unavailable
        }
      }
    }, 600);

    return () => window.clearTimeout(handle);
  }, [
    activeId,
    ahkaEditLocked,
    ahkaMeasurements,
    ahkaStrokeWidth,
    angleMeasurements,
    angleStrokeWidth,
    annotations,
    background,
    xraySourceScale,
    xrayMagnificationFactor,
    cutout,
    canvasMode,
    drawLineStrokeWidth,
    drawLines,
    lldMeasurements,
    lldStrokeWidth,
    measurePanelOpen,
    measurements,
    mmPerPixel,
    pixelsPerMm,
    objects,
    offsetMeasurements,
    offsetStrokeWidth,
    pointFillColor,
    pointFillMode,
    pointRadius,
    corMarkers,
    strokes,
    traceFillColor,
    traceFillOpacity,
    realMm,
    rulerStrokeWidth,
    showAhkaLabels,
    showAngleLabels,
    showLldLabels,
    showOffsetLabels,
    showRulerLabels,
    showTibialCutLabels,
    showTibialSlopeLabels,
    showValgusCutLabels,
    tibialCutAngleDeg,
    tibialCutDirection,
    tibialCutLineLengthPx,
    tibialCutLines,
    tibialCutOffsetPx,
    tibialCutStrokeWidth,
    tibialPosteriorSide,
    tibialSlopeDeg,
    tibialSlopeLineLengthPx,
    tibialSlopeLines,
    tibialSlopeOffsetPx,
    tibialSlopeStrokeWidth,
    useRealScale,
    valgusCutAngleDeg,
    valgusCutLineLengthPx,
    valgusCutLines,
    valgusCutOffsetPx,
    valgusCutSide,
    valgusCutStrokeWidth,
    viewPan,
    xrayContrast,
    zoom,
  ]);

  const onPanelPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;

    setPanelPos({
      x: e.clientX - dragState.current.x,
      y: e.clientY - dragState.current.y,
    });
  };

  const onPanelPointerUp = (e: React.PointerEvent) => {
    dragState.current.dragging = false;
    panelRef.current?.releasePointerCapture(e.pointerId);
  };

  const onPanelPointerDown = (e: React.PointerEvent) => {
    dragState.current.dragging = true;
    panelManualMove.current = true;
    dragState.current.x = e.clientX - panelPos.x;
    dragState.current.y = e.clientY - panelPos.y;

    panelRef.current?.setPointerCapture(e.pointerId);
  };

  const onToolbarPointerMove = (e: React.PointerEvent) => {
    if (!toolbarDrag.current.dragging) return;
    setToolbarPos({
      x: e.clientX - toolbarDrag.current.x,
      y: e.clientY - toolbarDrag.current.y,
    });
  };

  const onToolbarPointerUp = (e: React.PointerEvent) => {
    toolbarDrag.current.dragging = false;
    toolbarRef.current?.releasePointerCapture(e.pointerId);
  };

  const onToolbarPointerDown = (e: React.PointerEvent) => {
    toolbarDrag.current.dragging = true;
    toolbarDrag.current.x = e.clientX - toolbarPos.x;
    toolbarDrag.current.y = e.clientY - toolbarPos.y;
    toolbarRef.current?.setPointerCapture(e.pointerId);
  };

  const onMeasurePanelPointerMove = (e: React.PointerEvent) => {
    if (!measurePanelDrag.current.dragging) return;
    setMeasurePanelPos({
      x: e.clientX - measurePanelDrag.current.x,
      y: e.clientY - measurePanelDrag.current.y,
    });
  };

  const onMeasurePanelPointerUp = (e: React.PointerEvent) => {
    measurePanelDrag.current.dragging = false;
    measurePanelRef.current?.releasePointerCapture(e.pointerId);
  };

  const onMeasurePanelPointerDown = (e: React.PointerEvent) => {
    noteMeasurePanelActivity();
    if (isMobileViewport) return;
    measurePanelDrag.current.dragging = true;
    measurePanelDrag.current.x = e.clientX - measurePanelPos.x;
    measurePanelDrag.current.y = e.clientY - measurePanelPos.y;
    measurePanelRef.current?.setPointerCapture(e.pointerId);
  };

  const onRotateHandleDown = (e: React.PointerEvent) => {
    if (!active) return;

    pushHistorySnapshot();
    rotateDrag.current = {
      x: e.clientX,
      active: true,
    };

    captureRef.current = e.currentTarget as HTMLElement;
    captureRef.current.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const onScaleHandleDown = (e: React.PointerEvent, dir: ScaleDir) => {
    if (!active || active.scaleLocked) {
      e.stopPropagation();
      return;
    }

    disableMeasurementModes();
    pushHistorySnapshot();
    scaleDrag.current = {
      startY: e.clientY,
      startScaleX: active.scaleX,
      startScaleY: active.scaleY,
      dir,
    };

    captureRef.current = e.currentTarget as HTMLElement;
    captureRef.current.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const workflowDoneCount =
    Number(Boolean(background)) +
    Number(typeof pixelsPerMm === "number" && pixelsPerMm > 0) +
    Number(objects.length > 0);
  const workflowPercent = Math.round((workflowDoneCount / 3) * 100);

  return (
    <div
      className="
      relative w-full h-svh overflow-hidden
      bg-gray-100 text-gray-900
      dark:bg-neutral-950 dark:text-gray-100
      transition-colors -ml
    "
    >
      <input
        ref={simpleUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={uploadBackground}
      />
      <SimpleViewerOverlay
        uiMode={uiMode}
        simpleViewEnabled={simpleViewEnabled}
        workflowDoneCount={workflowDoneCount}
        workflowPercent={workflowPercent}
        drawMode={drawMode}
        panMode={panMode}
        cutoutMode={cutoutMode}
        pencilMode={pencilMode}
        angleMode={angleMode}
        ahkaMode={ahkaMode}
        syncScaleMode={syncScaleMode}
        anatomyMode={anatomyMode}
        canUndo={canUndo}
        onSetUiMode={setUiMode}
        onToggleDrawMode={toggleDrawMode}
        onTogglePanMode={togglePanMode}
        onToggleCutoutMode={toggleCutoutMode}
        onTogglePencilMode={togglePencilMode}
        onToggleAngleMode={toggleAngleMode}
        onToggleAhkaMode={toggleAhkaMode}
        onUploadClick={() => simpleUploadInputRef.current?.click()}
        onToggleSyncScale={syncScaleMode ? stopSyncScale : startSyncScale}
        onUndo={undo}
        onApplyAnatomyMode={applyAnatomyMode}
      />

      {uiMode === "advance" && (
        <>
          <DraggablePanel
            mobileHidden={mobileUiHidden || !mobileXrayPanelOpen}
            onRequestCloseMobile={() => setMobileXrayPanelOpen(false)}
            panelRef={panelRef}
            panelPos={panelPos}
            onPanelPointerMove={onPanelPointerMove}
            onPanelPointerUp={onPanelPointerUp}
            onPanelPointerDown={onPanelPointerDown}
            measurementsPanelOpen={measurePanelOpen}
            onToggleMeasurementsPanel={() => setMeasurePanelOpen((prev) => !prev)}
            uploadBackground={uploadBackground}
            setOpenImplantModal={setOpenImplantModal}
            onAddShapeOverlay={addShapeOverlay}
            onAddImageOverlay={addImageOverlay}
            xrayContrast={xrayContrast}
            setXrayContrast={setXrayContrast}
            realMm={realMm}
            setRealMm={setRealMm}
            pixelsPerMm={pixelsPerMm}
            setPixelsPerMm={setPixelsPerMm}
            xraySourceScale={xraySourceScale}
            xrayMagnificationFactor={xrayMagnificationFactor}
            setXrayMagnificationFactor={setXrayMagnificationFactor}
            applyCalibration={applyCalibration}
            presetName={presetName}
            setPresetName={setPresetName}
            calibrationPresets={calibrationPresets}
            onSavePreset={saveCalibrationPreset}
            onLoadPresets={loadCalibrationPresets}
            onApplyPreset={applyCalibrationPreset}
            onRemovePreset={removeCalibrationPreset}
            onExportReport={exportReport}
            zoom={zoom}
            setZoom={setZoom}
            canvasMode={canvasMode}
            panMode={panMode}
            onTogglePanMode={togglePanMode}
            onFitToScreen={fitToScreen}
            onSetOneToOne={setOneToOne}
            onResetView={resetView}
            onResetSession={resetSession}
            cameraMode={cameraMode}
            cameraReady={cameraReady}
            cameraError={cameraError}
            isRecording={isRecording}
            cameraFit={cameraFit}
            setCameraFit={setCameraFit}
            cameraZoom={cameraZoom}
            setCameraZoom={setCameraZoom}
            cameraZoomMode={cameraZoomMode}
            cameraZoomRange={cameraZoomRange}
            onToggleCamera={toggleCameraMode}
            onRequestCamera={requestCameraAccess}
            onSnapshot={takeSnapshot}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            syncScaleMode={syncScaleMode}
            startSyncScale={startSyncScale}
            stopSyncScale={stopSyncScale}
            autoStartTour={autoStartTour}
            onStartTour={startTourWithToast}
            shortcutsOpen={showShortcuts}
            onToggleShortcuts={toggleShortcuts}
          />
          <ShortcutsOverlay
            open={showShortcuts}
            onClose={() => setShowShortcuts(false)}
          />
        </>
      )}

      <TemplatingStage
        stageRef={stageRef}
        onStagePointerDown={onStagePointerDown}
        onStagePointerMove={onGlobalPointerMove}
        onStagePointerUp={onStagePointerUp}
        onStageWheel={onStageWheel}
        onDownObject={onDownObject}
        onDeleteActive={deleteActive}
        onToggleScaleLock={toggleActiveScaleLock}
        background={background}
        xrayContrast={xrayContrast}
        cameraMode={cameraMode}
        cameraFit={cameraFit}
        cameraDigitalZoom={cameraDigitalZoom}
        videoRef={videoRef}
        objects={objects}
        activeId={activeId}
        setActiveId={setActiveId}
        rulerMode={rulerMode}
        lldMode={lldMode}
        offsetMode={offsetMode}
        angleMode={angleMode}
        ahkaMode={ahkaMode}
        panMode={panMode}
        zoom={zoom}
        canvasMode={canvasMode}
        viewPan={viewPan}
        sourcePixelScale={xraySourceScale}
        onRotateHandleDown={onRotateHandleDown}
        onScaleHandleDown={onScaleHandleDown}
        measurements={measurements}
        lldMeasurements={lldMeasurements}
        offsetMeasurements={offsetMeasurements}
        angleMeasurements={angleMeasurements}
        anglePoints={anglePoints}
        angleDraft={angleDraft}
        ahkaMeasurements={ahkaMeasurements}
        ahkaPoints={ahkaPoints}
        ahkaDraft={ahkaDraft}
        draftStart={rulerAnchor}
        draftEnd={rulerDraft}
        lldDraftStart={lldAnchor}
        lldDraftEnd={lldDraft}
        offsetDraftStart={offsetAnchor}
        offsetDraftEnd={offsetDraft}
        mmPerPixel={effectiveMmPerPixel}
        annotationMode={annotationMode}
        annotations={annotations}
        annotationDraft={annotationDraft}
        onEditAnnotation={editAnnotation}
        onUpdateAnnotationDraftText={updateAnnotationDraftText}
        onSaveAnnotationDraft={saveAnnotationDraft}
        onCancelAnnotationDraft={cancelAnnotationDraft}
        onBeginMoveAnnotation={beginMoveAnnotation}
        onTranslateAnnotation={translateAnnotation}
        drawLines={drawLines}
        drawLineStrokeWidth={drawLineStrokeWidth}
        drawMode={drawMode}
        traceMode={traceMode}
        pencilMode={pencilMode}
        corMode={corMode}
        drawAnchor={drawAnchor}
        drawDraft={drawDraft}
        strokes={strokes}
        strokeDraftPoints={strokeDraftPoints}
        traceFillColor={traceFillColor}
        traceFillOpacity={traceFillOpacity}
        corMarkers={corMarkers}
        hoverMoveHint={hoverMoveHint}
        ahkaStrokeWidth={ahkaStrokeWidth}
        rulerStrokeWidth={rulerStrokeWidth}
        lldStrokeWidth={lldStrokeWidth}
        offsetStrokeWidth={offsetStrokeWidth}
        angleStrokeWidth={angleStrokeWidth}
        pointRadius={pointRadius}
        pointFillMode={pointFillMode}
        pointFillColor={pointFillColor}
        valgusCutMode={valgusCutMode}
        valgusCutLines={valgusCutLines}
        valgusCutAnchor={valgusCutAnchor}
        valgusCutDraft={valgusCutDraft}
        valgusCutAngleDeg={valgusCutAngleDeg}
        valgusCutSide={valgusCutSide}
        valgusCutOffsetPx={valgusCutOffsetPx}
        valgusCutStrokeWidth={valgusCutStrokeWidth}
        valgusCutLineLengthPx={valgusCutLineLengthPx}
        tibialSlopeMode={tibialSlopeMode}
        tibialSlopeLines={tibialSlopeLines}
        tibialSlopeAnchor={tibialSlopeAnchor}
        tibialSlopeDraft={tibialSlopeDraft}
        tibialSlopeDeg={tibialSlopeDeg}
        tibialPosteriorSide={tibialPosteriorSide}
        tibialSlopeOffsetPx={tibialSlopeOffsetPx}
        tibialSlopeStrokeWidth={tibialSlopeStrokeWidth}
        tibialSlopeLineLengthPx={tibialSlopeLineLengthPx}
        tibialCutMode={tibialCutMode}
        tibialCutLines={tibialCutLines}
        tibialCutAnchor={tibialCutAnchor}
        tibialCutDraft={tibialCutDraft}
        tibialCutAngleDeg={tibialCutAngleDeg}
        tibialCutDirection={tibialCutDirection}
        tibialCutOffsetPx={tibialCutOffsetPx}
        tibialCutStrokeWidth={tibialCutStrokeWidth}
        tibialCutLineLengthPx={tibialCutLineLengthPx}
        showRulerLabels={showRulerLabels}
        showLldLabels={showLldLabels}
        showOffsetLabels={showOffsetLabels}
        showAngleLabels={showAngleLabels}
        showAhkaLabels={showAhkaLabels}
        showValgusCutLabels={showValgusCutLabels}
        showTibialSlopeLabels={showTibialSlopeLabels}
        showTibialCutLabels={showTibialCutLabels}
        cutout={cutout}
        cutoutMode={cutoutMode}
        cutoutPreview={cutoutPreview}
      />

      <ImplantModal
        open={openImplantModal}
        setOpenImplantModal={setOpenImplantModal}
        search={search}
        setSearch={setSearch}
        openType={openType}
        setOpenType={setOpenType}
        openSystem={openSystem}
        setOpenSystem={setOpenSystem}
        groupedLibrary={groupedLibrary}
        addImplant={addImplant}
      />
    </div>
  );
}
