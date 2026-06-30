"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  Info,
  FileText,
  Camera,
  Download,
  Move,
  Activity,
  Undo2,
  Redo2,
} from "lucide-react";
import { computeTKAAlignment, computePCO, computeTibialSlope, computeInsallSalvati, computeSkylineAssessment } from "../lib/hka/tkaCalculator";

// ── Landmark definitions ──────────────────────────────────────────────────────

const AP_LANDMARKS = [
  { key: "femHead",        label: "Pusat Caput Femur",           short: "CFH", color: "#f59e0b" },
  { key: "kneeCenter",     label: "Pusat Lutut (Implant)",       short: "CK",  color: "#818cf8" },
  { key: "ankleCenter",    label: "Pusat Pergelangan Kaki",      short: "CA",  color: "#34d399" },
  { key: "condyleMedial",  label: "Kondil Medial Femoral",       short: "FCM", color: "#38bdf8" },
  { key: "condyleLateral", label: "Kondil Lateral Femoral",      short: "FCL", color: "#0ea5e9" },
  { key: "plateauMedial",  label: "Plateau Tibial Medial",       short: "TCM", color: "#2dd4bf" },
  { key: "plateauLateral", label: "Plateau Tibial Lateral",      short: "TCL", color: "#06b6d4" },
];

const AP_HINTS = [
  "Klik di tengah-tengah kepala femur",
  "Klik di tengah sisi distal komponen femoral",
  "Klik di tengah mortise ankle",
  "Klik di titik paling medial komponen femoral",
  "Klik di titik paling lateral komponen femoral",
  "Klik di titik paling medial komponen tibial",
  "Klik di titik paling lateral komponen tibial",
];

const LAT_LANDMARKS = [
  { key: "anteriorCortex",  label: "Korteks Anterior Femur",  short: "KA", color: "#f59e0b" },
  { key: "posteriorCortex", label: "Korteks Posterior Shaft", short: "KP", color: "#f87171" },
  { key: "posteriorCondyle",label: "Ujung Kondil Posterior",  short: "CP", color: "#a78bfa" },
];

const LAT_HINTS = [
  "KA — klik tepi paling DEPAN (anterior) korteks femur shaft. Ini sisi femur yang menghadap ke arah patela (tempurung lutut), pada bagian shaft lurus di atas kondil.",
  "KP — klik tepi BELAKANG (posterior) shaft femur, DI ATAS kondil. Cari bagian shaft yang LURUS sebelum melebar menjadi kondil, klik sisi belakangnya. JANGAN klik kondil.",
  "CP — klik ujung paling BELAKANG kondil femoral (implan). Ini adalah titik PALING POSTERIOR dari implan femoral — ujung paling belakang dari komponen kondil.",
];

// ── Tibial slope landmarks (optional, same lateral X-ray) ─────────────────────
const SLOPE_LANDMARKS = [
  { key: "tibShaftTop",      label: "Shaft Tibia Atas",       short: "TA", color: "#34d399" },
  { key: "tibShaftBot",      label: "Shaft Tibia Bawah",      short: "TB", color: "#10b981" },
  { key: "slopePlateauAnt",  label: "Plateau Anterior",       short: "PA", color: "#2dd4bf" },
  { key: "slopePlateauPost", label: "Plateau Posterior",      short: "PP", color: "#06b6d4" },
];
const SLOPE_HINTS = [
  "TA — klik titik pada shaft tibia BAGIAN ATAS (dekat komponen tibial). Pilih titik di tengah shaft, bukan pada komponen.",
  "TB — klik titik pada shaft tibia BAGIAN BAWAH (jauh dari lutut). Kedua titik TA–TB mendefinisikan sumbu tibial.",
  "PA — klik tepi DEPAN (anterior) dari komponen/plateau tibial — ujung paling depan dari base plate tibial.",
  "PP — klik tepi BELAKANG (posterior) dari komponen/plateau tibial — ujung paling belakang dari base plate tibial.",
];

// ── Insall-Salvati landmarks (optional, same lateral X-ray) ───────────────────
const IS_LANDMARKS = [
  { key: "patellaSup",    label: "Pole Superior Patela", short: "PS", color: "#e879f9" },
  { key: "patellaInf",    label: "Pole Inferior Patela", short: "PI", color: "#d946ef" },
  { key: "tibTuberosity", label: "Tuberositas Tibia",    short: "TT", color: "#c026d3" },
];
const IS_HINTS = [
  "PS — klik ujung ATAS (superior) patela. Ini titik teratas dari tulang tempurung lutut.",
  "PI — klik ujung BAWAH (inferior) patela, tempat tendon patela melekat. Ini titik terbawah dari patela.",
  "TT — klik tuberositas tibial — benjolan tulang tibia tempat tendon patela menempel di bagian bawah.",
];

// Combined: all lateral landmarks for the single lateral canvas
const ALL_LAT_LANDMARKS = [...LAT_LANDMARKS, ...SLOPE_LANDMARKS, ...IS_LANDMARKS];

const LAT_CONNECTIONS = [
  { from: "anteriorCortex",  to: "posteriorCortex",  color: "#f87171aa", dash: [5, 3] },
  { from: "posteriorCortex", to: "posteriorCondyle", color: "#a78bfa88" },
];
const SLOPE_CONNECTIONS = [
  { from: "tibShaftTop",     to: "tibShaftBot",      color: "#34d39988", dash: [6, 3] },
  { from: "slopePlateauAnt", to: "slopePlateauPost",  color: "#2dd4bfcc", dash: [5, 2] },
];
const IS_CONNECTIONS = [
  { from: "patellaSup",  to: "patellaInf",    color: "#e879f988", dash: [5, 2] },
  { from: "patellaInf",  to: "tibTuberosity", color: "#d946ef88", dash: [5, 2] },
];
const ALL_LAT_CONNECTIONS = [...LAT_CONNECTIONS, ...SLOPE_CONNECTIONS, ...IS_CONNECTIONS];

// ── Skyline/Merchant view (opsional) ─────────────────────────────────────────

const SKY_LANDMARKS = [
  { key: "skyPatMed",  label: "Facet Medial Patela",   short: "PM",  color: "#c084fc" },
  { key: "skyPatLat",  label: "Facet Lateral Patela",  short: "PL",  color: "#a855f7" },
  { key: "skyCondMed", label: "Kondil Medial Trochlea", short: "TM",  color: "#38bdf8" },
  { key: "skyCondLat", label: "Kondil Lateral Trochlea",short: "TL",  color: "#0ea5e9" },
  { key: "skyGroove",  label: "Sulkus Troklear",        short: "SG",  color: "#f472b6" },
];

const SKY_HINTS = [
  "Klik di titik paling medial (dalam) permukaan patela",
  "Klik di titik paling lateral (luar) permukaan patela",
  "Klik di ujung paling medial kondil femur troklear",
  "Klik di ujung paling lateral kondil femur troklear",
  "Klik di dasar sulkus — titik terdalam trochlear groove",
];

const SKY_CONNECTIONS = [
  { from: "skyPatMed",  to: "skyPatLat",  color: "#c084fccc", dash: [5, 2] },
  { from: "skyCondMed", to: "skyCondLat", color: "#38bdf8cc", dash: [5, 2] },
  { from: "skyCondMed", to: "skyGroove",  color: "#f472b688", dash: [4, 3] },
  { from: "skyGroove",  to: "skyCondLat", color: "#f472b688", dash: [4, 3] },
];

const AP_CONNECTIONS = [
  { from: "femHead",       to: "kneeCenter",     color: "#f59e0b88" },
  { from: "kneeCenter",    to: "ankleCenter",    color: "#34d39988" },
  { from: "condyleMedial", to: "condyleLateral", color: "#38bdf8cc", dash: [6, 3] },
  { from: "plateauMedial", to: "plateauLateral", color: "#2dd4bfcc", dash: [6, 3] },
];

const STEPS       = ["ap", "lateral", "skyline", "result"];
const STEP_LABELS = ["AP View", "Lateral", "Skyline", "Hasil"];

// ── Traffic light ─────────────────────────────────────────────────────────────

const FLAG_STYLES = {
  normal: { bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a", text: "#15803d" },
  low:    { bg: "#fff7ed", border: "#fed7aa", dot: "#ea580c", text: "#c2410c" },
  high:   { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626", text: "#b91c1c" },
};

function FlagDot({ flag }) {
  const s = FLAG_STYLES[flag] || FLAG_STYLES.normal;
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} />;
}

function ResultCard({ label, value, unit, range, flag, text }) {
  const s = FLAG_STYLES[flag] || FLAG_STYLES.normal;
  const statusLabel = flag === "normal" ? "Normal" : flag === "low" ? "Rendah" : "Tinggi";
  return (
    <div className="rounded-xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black tracking-wide text-slate-500 uppercase">{label}</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: s.dot + "22", color: s.dot }}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-xl font-black" style={{ color: s.text }}>{value}</span>
        <span className="text-xs font-semibold text-slate-400">{unit}</span>
      </div>
      <p className="mt-0.5 text-[9px] text-slate-400">Kisaran: {range}</p>
      {text && <p className="mt-1.5 text-[10px] leading-snug" style={{ color: s.text }}>{text}</p>}
    </div>
  );
}

function MetricRow({ label, value, unit, range, flag, text }) {
  const s = FLAG_STYLES[flag] || FLAG_STYLES.normal;
  const statusLabel = flag === "normal" ? "Normal" : flag === "low" ? "Rendah" : "Tinggi";
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: s.bg, borderColor: s.border }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black tracking-wide text-slate-500 uppercase">{label}</span>
          <span className="rounded-full px-1.5 py-px text-[8px] font-black" style={{ background: s.dot + "22", color: s.dot }}>
            {statusLabel}
          </span>
        </div>
        {text && <p className="mt-0.5 text-[9px] leading-snug text-slate-400 line-clamp-2">{text}</p>}
      </div>
      <div className="shrink-0 text-right">
        <span className="text-lg font-black leading-none" style={{ color: s.text }}>{value}</span>
        <span className="ml-0.5 text-[10px] text-slate-400">{unit}</span>
        <p className="text-[8px] text-slate-300">{range}</p>
      </div>
    </div>
  );
}

// ── Mini sparkline chart ──────────────────────────────────────────────────────

function MiniChart({ value, min, max, normalLow, normalHigh, flag }) {
  const W = 88, H = 34;
  const toX = (v) => Math.max(1, Math.min(W - 1, ((v - min) / (max - min)) * (W - 2) + 1));
  const flagCol = { normal: "#16a34a", low: "#ea580c", high: "#dc2626" }[flag] || "#94a3b8";
  const lowX = toX(normalLow), highX = toX(normalHigh), valX = toX(value);
  const center = (lowX + highX) / 2;
  const curvePts = Array.from({ length: 48 }, (_, i) => {
    const px = (i / 47) * W;
    const rel = (px - center) / ((W * 0.45) || 1);
    const py = (H - 8) * Math.exp(-0.5 * rel * rel) ;
    return `${px.toFixed(1)},${(H - 4 - py).toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <line x1={0} y1={H - 4} x2={W} y2={H - 4} stroke="currentColor" strokeWidth={0.5} className="text-slate-200" />
      <rect x={lowX} y={2} width={Math.max(0, highX - lowX)} height={H - 6} rx={2} fill="rgba(21,128,61,0.12)" />
      <polyline points={curvePts} fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <line x1={valX} y1={2} x2={valX} y2={H - 4} stroke={flagCol} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={valX} cy={(H - 4) / 2} r={3.5} fill={flagCol} stroke="white" strokeWidth={1.5} />
    </svg>
  );
}

// ── Photo row with optional pre-op comparison split ──────────────────────────

function PhotoRow({ children, compareMode, preOpSrc, preOpLabel, className }) {
  return (
    <div className={`relative h-full w-[200px] shrink-0 overflow-hidden bg-slate-900 md:h-auto md:w-auto border-r border-slate-800 md:border-r-0 md:border-b${className ? " " + className : ""}`}>
      {compareMode && preOpSrc ? (
        <div className="flex h-full w-full">
          <div className="relative flex-1 min-w-0 overflow-hidden border-r border-slate-700">
            {children}
            <span className="pointer-events-none absolute bottom-1 left-1 z-20 rounded bg-emerald-900/80 px-1 py-0.5 text-[7px] font-black tracking-wider text-emerald-300 uppercase">Post-op</span>
          </div>
          <div className="relative flex-1 min-w-0 overflow-hidden bg-slate-950">
            <img src={preOpSrc} alt={"Pre-op " + preOpLabel} className="h-full w-full object-contain" />
            <span className="pointer-events-none absolute bottom-1 left-1 z-20 rounded bg-violet-900/80 px-1 py-0.5 text-[7px] font-black tracking-wider text-violet-300 uppercase">Pre-op</span>
          </div>
        </div>
      ) : children}
    </div>
  );
}

// ── Canvas coordinate helpers ─────────────────────────────────────────────────

function imgToScreen(pt, t) {
  return { x: pt.x * t.scale + t.offsetX, y: pt.y * t.scale + t.offsetY };
}
function screenToImg(pt, t) {
  return { x: (pt.x - t.offsetX) / t.scale, y: (pt.y - t.offsetY) / t.scale };
}
function fitTransform(img, canvas) {
  if (!img || !canvas) return { scale: 1, offsetX: 0, offsetY: 0 };
  const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  return {
    scale,
    offsetX: (canvas.width  - img.naturalWidth  * scale) / 2,
    offsetY: (canvas.height - img.naturalHeight * scale) / 2,
  };
}

// ── Canvas draw utilities ─────────────────────────────────────────────────────

function drawCircle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}
function drawLabel(ctx, text, x, y, color) {
  ctx.font = "bold 12px sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x + 10, y - 8);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 10, y - 8);
}
function drawLine(ctx, a, b, color, dash = []) {
  if (!a || !b) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawPCOMeasurementLines(ctx, landmarks, transform, pcoResult) {
  const toS = (pt) => imgToScreen(pt, transform);
  const ka = landmarks.anteriorCortex   ? toS(landmarks.anteriorCortex)   : null;
  const kp = landmarks.posteriorCortex  ? toS(landmarks.posteriorCortex)  : null;
  const cp = landmarks.posteriorCondyle ? toS(landmarks.posteriorCondyle) : null;
  if (!ka || !kp || !cp) return;

  const dx = kp.x - ka.x, dy = kp.y - ka.y;
  const apLen = Math.hypot(dx, dy);
  if (apLen < 2) return;

  // AP unit (anterior → posterior) and shaft unit (perpendicular, along femur)
  const apU = { x: dx / apLen, y: dy / apLen };
  const shU = { x: -apU.y, y: apU.x };

  // Project CP onto the AP axis (foot of perpendicular from CP to KA→KP line extended)
  const proj = (cp.x - ka.x) * apU.x + (cp.y - ka.y) * apU.y;
  const cpFoot = { x: ka.x + apU.x * proj, y: ka.y + apU.y * proj };

  const ext  = Math.max(220, apLen * 3);
  const tick = 8;

  ctx.save();
  ctx.lineWidth  = 1.5;
  ctx.setLineDash([]);

  // ── Long shaft reference lines ──────────────────────────────────────────────
  ctx.strokeStyle = "#facc15";
  // Through KA (anterior cortex line)
  ctx.beginPath();
  ctx.moveTo(ka.x - shU.x * ext, ka.y - shU.y * ext);
  ctx.lineTo(ka.x + shU.x * ext, ka.y + shU.y * ext);
  ctx.stroke();
  // Through KP (posterior cortex shaft line)
  ctx.beginPath();
  ctx.moveTo(kp.x - shU.x * ext, kp.y - shU.y * ext);
  ctx.lineTo(kp.x + shU.x * ext, kp.y + shU.y * ext);
  ctx.stroke();

  // ── Shaft AP bracket (KA ↔ KP) ──────────────────────────────────────────────
  ctx.beginPath(); ctx.moveTo(ka.x, ka.y); ctx.lineTo(kp.x, kp.y); ctx.stroke();
  for (const pt of [ka, kp]) {
    ctx.beginPath();
    ctx.moveTo(pt.x - shU.x * tick, pt.y - shU.y * tick);
    ctx.lineTo(pt.x + shU.x * tick, pt.y + shU.y * tick);
    ctx.stroke();
  }

  if (pcoResult && !pcoResult.misplaced) {
    // ── PCO bracket (KP ↔ cpFoot) ─────────────────────────────────────────────
    ctx.beginPath(); ctx.moveTo(kp.x, kp.y); ctx.lineTo(cpFoot.x, cpFoot.y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cpFoot.x - shU.x * tick, cpFoot.y - shU.y * tick);
    ctx.lineTo(cpFoot.x + shU.x * tick, cpFoot.y + shU.y * tick);
    ctx.stroke();

    // ── Total AP bracket offset along shaft (KA ↔ cpFoot) ────────────────────
    const off = 14;
    ctx.strokeStyle = "#facc1599";
    ctx.beginPath();
    ctx.moveTo(ka.x + shU.x * off, ka.y + shU.y * off);
    ctx.lineTo(cpFoot.x + shU.x * off, cpFoot.y + shU.y * off);
    ctx.stroke();

    // ── Dashed connector CP → cpFoot ────────────────────────────────────────
    ctx.strokeStyle = "#facc1566";
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(cpFoot.x, cpFoot.y); ctx.stroke();
    ctx.setLineDash([]);

    // ── Labels ──────────────────────────────────────────────────────────────
    ctx.font = "bold 11px sans-serif";
    ctx.textBaseline = "middle";

    // Helper: draw text with black outline
    const labelAt = (text, x, y, col) => {
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(text, x, y);
      ctx.fillStyle = col; ctx.fillText(text, x, y);
    };
    ctx.lineWidth = 1.5;

    // Perpendicular label offset — pick whichever shaft direction points upward
    const upSign = shU.y <= 0 ? 1 : -1;
    const lblOx = shU.x * upSign * 18;
    const lblOy = shU.y * upSign * 18;

    // PCO label — beside midpoint of KP↔cpFoot bracket
    const pcoMx = (kp.x + cpFoot.x) / 2;
    const pcoMy = (kp.y + cpFoot.y) / 2;
    labelAt(`PCO ${pcoResult.ratio.toFixed(2)}`, pcoMx + lblOx, pcoMy + lblOy, "#facc15");

    // Total AP label — beside midpoint of KA↔cpFoot offset bracket
    const taMx = (ka.x + cpFoot.x) / 2 + shU.x * off;
    const taMy = (ka.y + cpFoot.y) / 2 + shU.y * off;
    labelAt("Total AP", taMx - lblOx, taMy - lblOy, "#facc1588");
  }

  ctx.restore();
}

// ── Canvas interaction hook ───────────────────────────────────────────────────
// Supports:
//   • click-to-place (next active landmark)
//   • drag-to-move (existing placed landmark)
//   • mouse/touch pan
//   • wheel zoom

const HIT_RADIUS_PX = 16; // screen pixels for landmark hit test

function useCanvasInteraction({
  canvasRef,
  transform,
  setTransform,
  landmarks,
  landmarkDefs,
  onPlace,
  onMoveLandmark,
  enabled,
}) {
  // Each gesture starts fresh; we track mode in a ref to avoid stale closures
  const gestureRef = useRef(null);
  // transform read in callbacks → keep in ref
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const getCanvasPt = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width  / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height),
    };
  }, [canvasRef]);

  // Find landmark within HIT_RADIUS_PX of a screen point
  const hitLandmark = useCallback((sx, sy) => {
    const t = transformRef.current;
    for (const def of landmarkDefs) {
      const pt = landmarks[def.key];
      if (!pt) continue;
      const sp = imgToScreen(pt, t);
      if (Math.hypot(sp.x - sx, sp.y - sy) < HIT_RADIUS_PX) return def.key;
    }
    return null;
  }, [landmarks, landmarkDefs]);

  // ── Mouse ────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const cp = getCanvasPt(e.clientX, e.clientY);
    if (!cp) return;
    const hitKey = hitLandmark(cp.x, cp.y);
    gestureRef.current = {
      mode: hitKey ? "landmark" : "start",
      landmarkKey: hitKey,
      startX: cp.x, startY: cp.y,
      offsetX: transformRef.current.offsetX,
      offsetY: transformRef.current.offsetY,
      moved: false,
    };
  }, [getCanvasPt, hitLandmark]);

  const onMouseMove = useCallback((e) => {
    const g = gestureRef.current;
    if (!g) return;
    const cp = getCanvasPt(e.clientX, e.clientY);
    if (!cp) return;
    const dx = cp.x - g.startX, dy = cp.y - g.startY;
    if (!g.moved && Math.hypot(dx, dy) > 3) g.moved = true;
    if (!g.moved) return;

    if (g.mode === "landmark") {
      const imgPt = screenToImg(cp, transformRef.current);
      onMoveLandmark?.(g.landmarkKey, imgPt);
    } else {
      // pan
      g.mode = "pan";
      setTransform((t) => ({ ...t, offsetX: g.offsetX + dx, offsetY: g.offsetY + dy }));
    }
  }, [getCanvasPt, onMoveLandmark, setTransform]);

  const onMouseUp = useCallback((e) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g) return;
    if (!g.moved && g.mode !== "landmark" && enabled && onPlace) {
      const cp = getCanvasPt(e.clientX, e.clientY);
      if (cp) {
        const hitKey = hitLandmark(cp.x, cp.y);
        if (!hitKey) onPlace(screenToImg(cp, transformRef.current));
      }
    }
  }, [enabled, getCanvasPt, hitLandmark, onPlace]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const my = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
    setTransform((t) => {
      const ns = Math.min(30, Math.max(0.08, t.scale * factor));
      return { scale: ns, offsetX: mx - (mx - t.offsetX) * (ns / t.scale), offsetY: my - (my - t.offsetY) * (ns / t.scale) };
    });
  }, [canvasRef, setTransform]);

  // ── Touch ────────────────────────────────────────────────────────────────
  const touchRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    const t0 = e.touches[0];
    const cp = getCanvasPt(t0.clientX, t0.clientY);
    if (!cp) return;
    const hitKey = hitLandmark(cp.x, cp.y);
    touchRef.current = {
      mode: hitKey ? "landmark" : "start",
      landmarkKey: hitKey,
      startX: t0.clientX, startY: t0.clientY,
      canvasStartX: cp.x, canvasStartY: cp.y,
      offsetX: transformRef.current.offsetX,
      offsetY: transformRef.current.offsetY,
      moved: false,
    };
  }, [getCanvasPt, hitLandmark]);

  const onTouchMove = useCallback((e) => {
    const tr = touchRef.current;
    if (!tr || e.touches.length !== 1) return;
    e.preventDefault();
    const t0 = e.touches[0];
    const dx = t0.clientX - tr.startX, dy = t0.clientY - tr.startY;
    if (!tr.moved && Math.hypot(dx, dy) > 5) tr.moved = true;
    if (!tr.moved) return;

    if (tr.mode === "landmark") {
      const cp = getCanvasPt(t0.clientX, t0.clientY);
      if (cp) onMoveLandmark?.(tr.landmarkKey, screenToImg(cp, transformRef.current));
    } else {
      tr.mode = "pan";
      setTransform((t) => ({ ...t, offsetX: tr.offsetX + dx, offsetY: tr.offsetY + dy }));
    }
  }, [getCanvasPt, onMoveLandmark, setTransform]);

  const onTouchEnd = useCallback((e) => {
    const tr = touchRef.current;
    touchRef.current = null;
    if (!tr || tr.moved) return;
    if (enabled && onPlace) {
      const cp = getCanvasPt(tr.startX, tr.startY);
      if (cp) {
        const hitKey = hitLandmark(cp.x, cp.y);
        if (!hitKey) onPlace(screenToImg(cp, transformRef.current));
      }
    }
  }, [enabled, getCanvasPt, hitLandmark, onPlace]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousedown",  onMouseDown);
    canvas.addEventListener("mousemove",  onMouseMove);
    canvas.addEventListener("mouseup",    onMouseUp);
    canvas.addEventListener("wheel",      onWheel,      { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      canvas.removeEventListener("mousedown",  onMouseDown);
      canvas.removeEventListener("mousemove",  onMouseMove);
      canvas.removeEventListener("mouseup",    onMouseUp);
      canvas.removeEventListener("wheel",      onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, [canvasRef, onMouseDown, onMouseMove, onMouseUp, onWheel, onTouchStart, onTouchMove, onTouchEnd]);
}

// ── Draw-canvas-to-image utility for PDF export ───────────────────────────────

function renderAnnotatedCanvas(img, landmarks, landmarkDefs, connections, width = 900, height = 620, drawOverlay = null) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  let transform = { scale: 1, offsetX: 0, offsetY: 0 };
  if (img) {
    const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
    transform = {
      scale,
      offsetX: (width  - img.naturalWidth  * scale) / 2,
      offsetY: (height - img.naturalHeight * scale) / 2,
    };
    ctx.save();
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  connections.forEach(({ from, to, color, dash }) => {
    const a = landmarks[from] ? imgToScreen(landmarks[from], transform) : null;
    const b = landmarks[to]   ? imgToScreen(landmarks[to],   transform) : null;
    drawLine(ctx, a, b, color, dash || []);
  });

  landmarkDefs.forEach((def) => {
    const pt = landmarks[def.key];
    if (!pt) return;
    const sp = imgToScreen(pt, transform);
    drawCircle(ctx, sp.x, sp.y, 7, def.color, "#111827");
    drawLabel(ctx, def.short, sp.x, sp.y, def.color);
  });

  if (drawOverlay) drawOverlay(ctx, transform);

  return canvas.toDataURL("image/jpeg", 0.92);
}

// ── LandmarkCanvas component ──────────────────────────────────────────────────

function LandmarkCanvas({
  imageSrc,
  landmarks,
  landmarkDefs,
  hints,
  activeIndex,
  transform,
  setTransform,
  onPlace,
  onMoveLandmark,
  connections = [],
  canvasRef: externalRef,
  drawOverlay,
}) {
  const internalRef = useRef(null);
  const canvasRef   = externalRef || internalRef;
  const imgRef      = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Resize canvas to fill container so portrait X-rays fill the view
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const resize = () => {
      const w = container.clientWidth  || 900;
      const h = container.clientHeight || 580;
      if (canvas.width === w && canvas.height === h) return;
      canvas.width  = w;
      canvas.height = h;
      if (imgRef.current) setTransform(fitTransform(imgRef.current, canvas));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, [canvasRef, setTransform]);

  useEffect(() => {
    if (!imageSrc) { imgRef.current = null; setImgLoaded(false); return; }
    setImgLoaded(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      if (canvasRef.current) setTransform(fitTransform(img, canvasRef.current));
    };
    img.src = imageSrc;
  }, [imageSrc, canvasRef, setTransform]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = imgRef.current;
    if (img && imgLoaded) {
      ctx.save();
      ctx.translate(transform.offsetX, transform.offsetY);
      ctx.scale(transform.scale, transform.scale);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#475569";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Upload gambar X-ray untuk memulai", canvas.width / 2, canvas.height / 2);
      ctx.textAlign = "left";
    }

    // Connections
    connections.forEach(({ from, to, color, dash }) => {
      const a = landmarks[from] ? imgToScreen(landmarks[from], transform) : null;
      const b = landmarks[to]   ? imgToScreen(landmarks[to],   transform) : null;
      drawLine(ctx, a, b, color, dash || []);
    });

    // Placed landmarks
    landmarkDefs.forEach((def, i) => {
      const pt = landmarks[def.key];
      if (!pt) return;
      const sp = imgToScreen(pt, transform);
      const isActive = i === activeIndex;
      drawCircle(ctx, sp.x, sp.y, isActive ? 9 : 7, def.color, "#111827");
      drawLabel(ctx, def.short, sp.x, sp.y, def.color);
      // ring on active
      if (isActive) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.45;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // Custom overlay (e.g. PCO measurement lines)
    if (drawOverlay) drawOverlay(ctx, transform);
  }, [landmarks, landmarkDefs, activeIndex, transform, imgLoaded, connections, canvasRef, drawOverlay]);

  // Determine cursor: over placed landmark = move cursor; active = crosshair; else grab
  const [hoveredKey, setHoveredKey] = useState(null);
  const handleMouseMoveForCursor = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const sy = (e.clientY - rect.top)  * (canvas.height / rect.height);
    for (const def of landmarkDefs) {
      const pt = landmarks[def.key];
      if (!pt) continue;
      const sp = imgToScreen(pt, transform);
      if (Math.hypot(sp.x - sx, sp.y - sy) < HIT_RADIUS_PX) { setHoveredKey(def.key); return; }
    }
    setHoveredKey(null);
  }, [canvasRef, landmarkDefs, landmarks, transform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousemove", handleMouseMoveForCursor);
    return () => canvas.removeEventListener("mousemove", handleMouseMoveForCursor);
  }, [canvasRef, handleMouseMoveForCursor]);

  const cursor = hoveredKey ? "move" : activeIndex >= 0 && activeIndex < landmarkDefs.length ? "crosshair" : "grab";

  useCanvasInteraction({
    canvasRef,
    transform,
    setTransform,
    landmarks,
    landmarkDefs,
    onPlace,
    onMoveLandmark,
    enabled: activeIndex >= 0 && activeIndex < landmarkDefs.length,
  });

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={580}
      className="h-full w-full"
      style={{ cursor, display: "block" }}
    />
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDot({ index, active, done, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black transition-all"
        style={{
          background: done ? "#4f46e5" : active ? "#6366f1" : "#e2e8f0",
          color: done || active ? "#fff" : "#94a3b8",
          boxShadow: active ? "0 0 0 3px #818cf840" : "none",
        }}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
      </div>
      <span className={`text-[9px] font-bold ${active ? "text-indigo-600" : done ? "text-slate-500" : "text-slate-300"}`}>
        {label}
      </span>
    </div>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────

async function exportToPDF({
  apImgRef, latImgRef, skyImgRef,
  apPoints, latPoints, skyPoints,
  tkaResult, pcoResult, slopeResult, isResult, skyResult,
  legSide = "right", doctorNotes = "",
}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210, PH = 297, M = 14;
  let y = M;

  // ── Palette ──────────────────────────────────────────────────────────────────
  const C = {
    violet:  [99, 102, 241],
    white:   [255, 255, 255],
    dark:    [30, 41, 59],
    mid:     [100, 116, 139],
    light:   [203, 213, 225],
    green:   [21, 128, 61],
    orange:  [194, 65, 12],
    red:     [185, 28, 28],
    bgGreen: [240, 253, 244],
    bgAmber: [255, 251, 235],
    bgRed:   [254, 242, 242],
    bgGray:  [241, 245, 249],
  };
  const flagRgb   = (f) => f === "normal" ? C.green : f === "low" ? C.orange : C.red;
  const flagBgRgb = (f) => f === "normal" ? C.bgGreen : f === "low" ? C.bgAmber : C.bgRed;
  const flagLabel = (f) => f === "normal" ? "Normal" : f === "low" ? "Rendah" : "Tinggi";

  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  // ── Page helpers ──────────────────────────────────────────────────────────────
  const checkPage = (need = 30) => { if (y + need > PH - M) { doc.addPage(); y = M; } };

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.setFillColor(...C.violet);
  doc.rect(0, 0, PW, 26, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Post-TKA Radiographic Assessment", M, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Analisis Alignment Pasca Operasi Total Knee Arthroplasty", M, 18);
  doc.setFontSize(7.5);
  doc.text(`Tanggal: ${today}  ·  Sisi: ${legSide === "right" ? "Kaki Kanan (R)" : "Kaki Kiri (L)"}`, PW - M, 18, { align: "right" });
  y = 33;

  // ── X-ray images ─────────────────────────────────────────────────────────────
  let apUrl = null, latUrl = null, skyUrl = null;
  // render at portrait resolution — X-rays are taller than wide
  try { if (apImgRef.current)  apUrl  = renderAnnotatedCanvas(apImgRef.current,  apPoints,  AP_LANDMARKS,      AP_CONNECTIONS,      700, 1050); } catch {}
  try {
    if (latImgRef.current && Object.keys(latPoints).length > 0)
      latUrl = renderAnnotatedCanvas(latImgRef.current, latPoints, ALL_LAT_LANDMARKS, ALL_LAT_CONNECTIONS, 700, 1050,
        (ctx, t) => drawPCOMeasurementLines(ctx, latPoints, t, pcoResult));
  } catch {}
  try { if (skyImgRef.current && Object.keys(skyPoints).length > 0) skyUrl = renderAnnotatedCanvas(skyImgRef.current, skyPoints, SKY_LANDMARKS, SKY_CONNECTIONS, 700, 1050); } catch {}

  const imgW   = PW - M * 2;   // full usable width (182mm)
  const aspect = 1050 / 700;   // portrait 3:2

  if (apUrl || latUrl || skyUrl) {
    // Section title
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.dark);
    doc.text("FOTO X-RAY", M, y); y += 4;

    const imgs = [
      apUrl  ? { url: apUrl,  label: "AP View"              } : null,
      latUrl ? { url: latUrl, label: "Lateral View"          } : null,
      skyUrl ? { url: skyUrl, label: "Skyline/Merchant View" } : null,
    ].filter(Boolean);

    // Each image full-width, stacked vertically
    const iW = imgW;
    const iH = iW * aspect;

    imgs.forEach((img) => {
      checkPage(iH + 12);
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...C.mid);
      doc.text(img.label, M, y);
      // subtle background behind image
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(M, y + 2, iW, iH, 2, 2, "F");
      doc.addImage(img.url, "JPEG", M, y + 2, iW, iH, undefined, "FAST");
      y += iH + 7;
    });

    y += 2;
  }

  // ── Metric row helper ─────────────────────────────────────────────────────────
  const COL = { label: M + 2, valR: M + 108, range: M + 112, statusR: PW - M - 2 };
  const ROW_H = 28;

  // Draw inline range bar — shows normal zone + value marker
  const drawRangeBar = (rowY, val, min, max, lo, hi, flag) => {
    const barX = COL.label + 4;
    const barW = 82;
    const barH = 3.5;
    const barY = rowY + ROW_H - 7;
    const toX  = (v) => barX + Math.max(0, Math.min(barW, ((v - min) / (max - min)) * barW));

    // Track
    doc.setFillColor(218, 222, 232);
    doc.roundedRect(barX, barY, barW, barH, barH / 2, barH / 2, "F");

    // Normal zone (green band)
    const nX = toX(lo), nW = Math.max(0, toX(hi) - nX);
    doc.setFillColor(187, 247, 208);
    doc.roundedRect(nX, barY, nW, barH, barH / 2, barH / 2, "F");

    // Zone boundary ticks
    doc.setFillColor(134, 239, 172);
    doc.roundedRect(nX - 0.4, barY - 0.5, 0.8, barH + 1, 0.4, 0.4, "F");
    doc.roundedRect(toX(hi) - 0.4, barY - 0.5, 0.8, barH + 1, 0.4, 0.4, "F");

    // Value marker (colored vertical pill + circle)
    const vX = toX(val);
    const [fr, fg, fb] = flagRgb(flag);
    doc.setFillColor(fr, fg, fb);
    doc.roundedRect(vX - 1, barY - 1, 2, barH + 2, 1, 1, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(vX, barY + barH / 2, 1.2, "F");
    doc.setFillColor(fr, fg, fb);
    doc.circle(vX, barY + barH / 2, 0.7, "F");
  };

  const pdfRow = (sectionLabel, label, value, range, flag, note, chart = null) => {
    checkPage(ROW_H + 12);

    if (sectionLabel) {
      y += 2;
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...C.mid);
      doc.text(sectionLabel.toUpperCase(), M, y); y += 4;
    }

    // Row background
    const [br, bg2, bb] = flagBgRgb(flag);
    doc.setFillColor(br, bg2, bb);
    doc.roundedRect(M, y, PW - M * 2, ROW_H, 3, 3, "F");

    // Left border accent
    doc.setFillColor(...flagRgb(flag));
    doc.roundedRect(M, y, 3.5, ROW_H, 1.5, 1.5, "F");

    // Label
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.dark);
    doc.text(label, COL.label + 6, y + 7);

    // Note
    if (note) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...C.mid);
      const lines = doc.splitTextToSize(note, 78);
      doc.text(lines.slice(0, 2), COL.label + 6, y + 13.5);
    }

    // Range bar chart
    if (chart) drawRangeBar(y, chart.val, chart.min, chart.max, chart.lo, chart.hi, flag);

    // Value (large)
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...flagRgb(flag));
    doc.text(value, COL.valR, y + 11, { align: "right" });

    // Range text
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...C.mid);
    doc.text(`Kisaran: ${range}`, COL.range, y + 7);

    // Status
    const [sfr, sfg, sfb] = flagRgb(flag);
    const statusLabel = flagLabel(flag);
    const statusW = doc.getTextWidth(statusLabel) + 4;
    doc.setFillColor(sfr, sfg, sfb);
    doc.roundedRect(COL.statusR - statusW, y + 11, statusW, 5.5, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...C.white);
    doc.text(statusLabel, COL.statusR - statusW / 2, y + 14.5, { align: "center" });

    y += ROW_H + 2;
  };

  // ── AP Results ───────────────────────────────────────────────────────────────
  if (tkaResult) {
    checkPage(ROW_H * 3 + 30);
    pdfRow("Alignment Koronal (AP View)", "MDFA — Mechanical Distal Femoral Angle", `${tkaResult.MDFA}°`, "85-95°", tkaResult.mdfaFlag, tkaResult.mdfaText, { val: tkaResult.MDFA, min: 60, max: 120, lo: 85, hi: 95 });
    pdfRow(null, "MPTA — Medial Proximal Tibial Angle",  `${tkaResult.MPTA}°`,     "85-95°",   tkaResult.mptaFlag,  tkaResult.mptaText,  { val: tkaResult.MPTA, min: 60, max: 120, lo: 85, hi: 95 });
    pdfRow(null, "MDFA + MPTA — Combined",               `${tkaResult.combined}°`, "175-185°", tkaResult.combinedFlag, tkaResult.combinedText, { val: tkaResult.combined, min: 140, max: 210, lo: 175, hi: 185 });
    y += 2;
  }

  // ── PCO ─────────────────────────────────────────────────────────────────────
  if (pcoResult) {
    pdfRow("PCO Ratio (Lateral View)", "Posterior Condylar Offset Ratio", pcoResult.ratio.toFixed(2), "0.40-0.60 (ideal >=0.47)", pcoResult.pcoFlag, pcoResult.pcoText, { val: pcoResult.ratio, min: 0.2, max: 0.9, lo: 0.4, hi: 0.6 });
    y += 2;
  }

  // ── Tibial Slope ─────────────────────────────────────────────────────────────
  if (slopeResult) {
    pdfRow("Tibial Slope (Lateral View)", `Slope Tibial ${slopeResult.isPosterior ? "Posterior" : "Anterior"}`, `${slopeResult.slope}°`, "Posterior 3-7°", slopeResult.slopeFlag, slopeResult.slopeText, { val: slopeResult.slope, min: -5, max: 20, lo: 3, hi: 7 });
    y += 2;
  }

  // ── Insall-Salvati ───────────────────────────────────────────────────────────
  if (isResult) {
    pdfRow("Insall-Salvati Ratio (Tinggi Patela)", "Insall-Salvati (LP/LT)", isResult.ratio.toFixed(2), "0.8-1.2", isResult.isFlag, isResult.isText, { val: isResult.ratio, min: 0.3, max: 2.0, lo: 0.8, hi: 1.2 });
    y += 2;
  }

  // ── Skyline / Patellar ───────────────────────────────────────────────────────
  if (skyResult) {
    if (skyResult.patellarTilt !== null) pdfRow("Patellar Assessment (Skyline View)", "Patellar Tilt", `${skyResult.patellarTilt}°`, "<20°", skyResult.tiltFlag, skyResult.tiltText, { val: skyResult.patellarTilt, min: 0, max: 45, lo: 0, hi: 20 });
    if (skyResult.sulcusAngle  !== null) pdfRow(skyResult.patellarTilt !== null ? null : "Patellar Assessment (Skyline View)", "Sulkus Angle (Trochlear Groove)", `${skyResult.sulcusAngle}°`, "<=144°", skyResult.sulcusFlag, skyResult.sulcusText, { val: skyResult.sulcusAngle, min: 100, max: 200, lo: 100, hi: 144 });
    y += 2;
  }

  // ── Doctor Notes ─────────────────────────────────────────────────────────────
  if (doctorNotes && doctorNotes.trim()) {
    checkPage(30);
    doc.setFillColor(...C.bgGray);
    const noteLines = doc.splitTextToSize(doctorNotes.trim(), PW - M * 2 - 8);
    const noteH = Math.max(18, 10 + noteLines.length * 5);
    doc.roundedRect(M, y, PW - M * 2, noteH, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.dark);
    doc.text("Catatan Dokter:", M + 3, y + 5.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.mid);
    doc.text(noteLines, M + 3, y + 11);
    y += noteH + 4;
  }

  // ── Reference footer ─────────────────────────────────────────────────────────
  checkPage(20);
  doc.setFillColor(...C.bgGray);
  const refH = 18;
  doc.roundedRect(M, y, PW - M * 2, refH, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...C.mid);
  doc.text("Referensi Klinis:", M + 2, y + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6);
  const refText = "MDFA/MPTA 85-95° (Ritter 2011 CORR; Parratte 2010 JBJS) · PCO >=0.47 (Bellemans 2002 JBJS) · Tibial slope 3-7° (Kumar 2014) · Insall-Salvati 0.8-1.2 (Rogers 2006) · Patellar tilt <20° & Sulkus <=144° (Merchant 1974) · Keputusan klinis memerlukan evaluasi penuh oleh dokter ortopedi berlisensi.";
  const refLines = doc.splitTextToSize(refText, PW - M * 2 - 4);
  doc.text(refLines.slice(0, 2), M + 2, y + 10);

  return { doc, filename: `PostTKA_Assessment_${today.replace(/\s/g, "_")}.pdf` };
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportToCSV({ legSide, doctorNotes, tkaResult, pcoResult, slopeResult, isResult, skyResult }) {
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const flagLabel = (f) => f === "normal" ? "Normal" : f === "low" ? "Rendah" : "Tinggi";
  const rows = [
    ["Post-TKA Radiographic Assessment"],
    ["Tanggal", today],
    ["Sisi Kaki", legSide === "right" ? "Kaki Kanan" : "Kaki Kiri"],
    [],
    ["Parameter", "Nilai", "Kisaran Normal", "Status"],
  ];
  if (tkaResult) {
    rows.push(["MDFA (Mechanical Distal Femoral Angle)", `${tkaResult.MDFA}°`, "85–95°", flagLabel(tkaResult.mdfaFlag)]);
    rows.push(["MPTA (Medial Proximal Tibial Angle)", `${tkaResult.MPTA}°`, "85–95°", flagLabel(tkaResult.mptaFlag)]);
    rows.push(["MDFA + MPTA (Combined)", `${tkaResult.combined}°`, "175–185°", flagLabel(tkaResult.combinedFlag)]);
  }
  if (pcoResult)   rows.push(["PCO Ratio (Posterior Condylar Offset)", pcoResult.ratio.toFixed(2), "0.40–0.60 (ideal ≥0.47)", flagLabel(pcoResult.pcoFlag)]);
  if (slopeResult) rows.push([`Tibial Slope (${slopeResult.isPosterior ? "Posterior" : "Anterior"})`, `${slopeResult.slope}°`, "3–7°", flagLabel(slopeResult.slopeFlag)]);
  if (isResult)    rows.push(["Insall-Salvati Ratio", isResult.ratio.toFixed(2), "0.8–1.2", flagLabel(isResult.isFlag)]);
  if (skyResult) {
    if (skyResult.patellarTilt !== null) rows.push(["Patellar Tilt", `${skyResult.patellarTilt}°`, "<20°", flagLabel(skyResult.tiltFlag)]);
    if (skyResult.sulcusAngle  !== null) rows.push(["Sulkus Angle",  `${skyResult.sulcusAngle}°`,  "≤144°", flagLabel(skyResult.sulcusFlag)]);
  }
  if (doctorNotes) {
    rows.push([]);
    rows.push(["Catatan Dokter", doctorNotes.replace(/\n/g, " ")]);
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PostTKA_Assessment_${today.replace(/\s/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Points history hook ───────────────────────────────────────────────────────

function usePointsHistory() {
  const [hist, setHist] = useState({ stack: [{}], idx: 0 });
  const points = hist.stack[hist.idx];

  const setPoints = useCallback((updater) => {
    setHist((prev) => {
      const cur = prev.stack[prev.idx];
      const next = typeof updater === "function" ? updater(cur) : updater;
      const newStack = [...prev.stack.slice(0, prev.idx + 1), next];
      return { stack: newStack, idx: newStack.length - 1 };
    });
  }, []);

  const undo = useCallback(() => setHist((p) => p.idx > 0 ? { ...p, idx: p.idx - 1 } : p), []);
  const redo = useCallback(() => setHist((p) => p.idx < p.stack.length - 1 ? { ...p, idx: p.idx + 1 } : p), []);
  const reset = useCallback(() => setHist({ stack: [{}], idx: 0 }), []);

  const canUndo = hist.idx > 0;
  const canRedo = hist.idx < hist.stack.length - 1;

  return { points, setPoints, undo, redo, reset, canUndo, canRedo };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TKAAssessmentPanel({ isOpen, onClose, imageCanvasRef, mmPerPixel }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const [apImageSrc,  setApImageSrc]  = useState(null);
  const [latImageSrc, setLatImageSrc] = useState(null);
  const [skyImageSrc, setSkyImageSrc] = useState(null);
  const apImgRef  = useRef(null);
  const latImgRef = useRef(null);
  const skyImgRef = useRef(null);
  const apCanRef  = useRef(null);
  const latCanRef = useRef(null);
  const skyCanRef = useRef(null);

  const [legSide, setLegSide] = useState("right"); // "right" | "left"

  const { points: apPoints,  setPoints: setApPoints,  undo: undoAp,  redo: redoAp,  reset: resetApPoints,  canUndo: canUndoAp,  canRedo: canRedoAp  } = usePointsHistory();
  const { points: latPoints, setPoints: setLatPoints, undo: undoLat, redo: redoLat, reset: resetLatPoints, canUndo: canUndoLat, canRedo: canRedoLat } = usePointsHistory();
  const { points: skyPoints, setPoints: setSkyPoints, undo: undoSky, redo: redoSky, reset: resetSkyPoints, canUndo: canUndoSky, canRedo: canRedoSky } = usePointsHistory();

  const [apTransform,  setApTransform]  = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [latTransform, setLatTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [skyTransform, setSkyTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  // Separate transforms for the result preview canvases (auto-fit on mount)
  const [apResTransform,  setApResTransform]  = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [latResTransform, setLatResTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [skyResTransform, setSkyResTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  const apUploadRef  = useRef(null);
  const latUploadRef = useRef(null);
  const skyUploadRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null); // { url, doc, filename }

  // ── New features ─────────────────────────────────────────────────────────────
  const [doctorNotes, setDoctorNotes] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [preOpApSrc,  setPreOpApSrc]  = useState(null);
  const [preOpLatSrc, setPreOpLatSrc] = useState(null);
  const [preOpSkySrc, setPreOpSkySrc] = useState(null);
  const preOpApRef  = useRef(null);
  const preOpLatRef = useRef(null);
  const preOpSkyRef = useRef(null);

  const [col1Pct, setCol1Pct] = useState(32);
  const [col3Pct, setCol3Pct] = useState(28);
  const col1PctRef   = useRef(32);
  const col3PctRef   = useRef(28);
  const resultRowRef = useRef(null);

  // keep refs in sync with state so drag handlers always see latest value
  col1PctRef.current = col1Pct;
  col3PctRef.current = col3Pct;

  const makeResizeHandler = (pctRef, setPct, min, max, dir = 1) => (e) => {
    const startX = e.clientX;
    const startW = pctRef.current;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev) => {
      const containerW = resultRowRef.current?.offsetWidth || window.innerWidth;
      const dx = (ev.clientX - startX) * dir;
      setPct(Math.min(max, Math.max(min, startW + (dx / containerW) * 100)));
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
  };

  const onResizeStart  = makeResizeHandler(col1PctRef, setCol1Pct, 22, 55,  1);
  const onResize3Start = makeResizeHandler(col3PctRef, setCol3Pct, 18, 45, -1);

  const apActiveIndex  = useMemo(() => AP_LANDMARKS.findIndex((l) => !apPoints[l.key]),  [apPoints]);
  const latActiveIndex = useMemo(() => ALL_LAT_LANDMARKS.findIndex((l) => !latPoints[l.key]), [latPoints]);
  const skyActiveIndex = useMemo(() => SKY_LANDMARKS.findIndex((l) => !skyPoints[l.key]), [skyPoints]);

  const tkaResult = useMemo(() => {
    const { femHead, kneeCenter, ankleCenter, condyleMedial, condyleLateral, plateauMedial, plateauLateral } = apPoints;
    return computeTKAAlignment({ femHead, kneeCenter, ankleCenter, condyleMedial, condyleLateral, plateauMedial, plateauLateral });
  }, [apPoints]);

  const pcoResult = useMemo(() => {
    const { anteriorCortex, posteriorCortex, posteriorCondyle } = latPoints;
    return computePCO({ anteriorCortex, posteriorCortex, posteriorCondyle });
  }, [latPoints]);

  const slopeResult = useMemo(() => {
    const { tibShaftTop, tibShaftBot, slopePlateauAnt, slopePlateauPost } = latPoints;
    return computeTibialSlope({ tibShaftTop, tibShaftBot, slopePlateauAnt, slopePlateauPost });
  }, [latPoints]);

  const isResult = useMemo(() => {
    const { patellaSup, patellaInf, tibTuberosity } = latPoints;
    return computeInsallSalvati({ patellaSup, patellaInf, tibTuberosity });
  }, [latPoints]);

  const skyResult = useMemo(() => {
    const { skyPatMed, skyPatLat, skyCondMed, skyCondLat, skyGroove } = skyPoints;
    return computeSkylineAssessment({ skyPatMed, skyPatLat, skyCondMed, skyCondLat, skyGroove });
  }, [skyPoints]);

  const pcoOverlay = useCallback((ctx, t) => {
    drawPCOMeasurementLines(ctx, latPoints, t, pcoResult);
  }, [latPoints, pcoResult]);

  // Load image refs for PDF rendering
  useEffect(() => {
    if (!apImageSrc) { apImgRef.current = null; return; }
    const img = new Image();
    img.onload = () => { apImgRef.current = img; };
    img.src = apImageSrc;
  }, [apImageSrc]);
  useEffect(() => {
    if (!latImageSrc) { latImgRef.current = null; return; }
    const img = new Image();
    img.onload = () => { latImgRef.current = img; };
    img.src = latImageSrc;
  }, [latImageSrc]);
  useEffect(() => {
    if (!skyImageSrc) { skyImgRef.current = null; return; }
    const img = new Image();
    img.onload = () => { skyImgRef.current = img; };
    img.src = skyImageSrc;
  }, [skyImageSrc]);

  // Capture workspace canvas on open
  useEffect(() => {
    if (isOpen && imageCanvasRef?.current && !apImageSrc) {
      try { setApImageSrc(imageCanvasRef.current.toDataURL("image/png")); } catch {}
    }
  }, [isOpen, imageCanvasRef, apImageSrc]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0); resetApPoints(); resetLatPoints(); resetSkyPoints();
      setApImageSrc(null); setLatImageSrc(null); setSkyImageSrc(null);
      setDoctorNotes(""); setCompareMode(false);
      setPreOpApSrc(null); setPreOpLatSrc(null); setPreOpSkySrc(null);
      setCol1Pct(32); setCol3Pct(28);
    }
  }, [isOpen]);

  const handleApPlace = useCallback((imgPt) => {
    if (apActiveIndex < 0) return;
    setApPoints((prev) => ({ ...prev, [AP_LANDMARKS[apActiveIndex].key]: imgPt }));
  }, [apActiveIndex]);

  const handleApMove = useCallback((key, imgPt) => {
    setApPoints((prev) => ({ ...prev, [key]: imgPt }));
  }, []);

  const handleLatPlace = useCallback((imgPt) => {
    if (latActiveIndex < 0) return;
    setLatPoints((prev) => ({ ...prev, [ALL_LAT_LANDMARKS[latActiveIndex].key]: imgPt }));
  }, [latActiveIndex]);

  const handleLatMove = useCallback((key, imgPt) => {
    setLatPoints((prev) => ({ ...prev, [key]: imgPt }));
  }, []);

  const handleSkyPlace = useCallback((imgPt) => {
    if (skyActiveIndex < 0) return;
    setSkyPoints((prev) => ({ ...prev, [SKY_LANDMARKS[skyActiveIndex].key]: imgPt }));
  }, [skyActiveIndex]);

  const handleSkyMove = useCallback((key, imgPt) => {
    setSkyPoints((prev) => ({ ...prev, [key]: imgPt }));
  }, []);

  const handleApUpload  = (e) => { const f = e.target.files?.[0]; if (!f) return; setApImageSrc(URL.createObjectURL(f)); resetApPoints();  e.target.value = ""; };
  const handleLatUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; setLatImageSrc(URL.createObjectURL(f)); resetLatPoints(); e.target.value = ""; };
  const handleSkyUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; setSkyImageSrc(URL.createObjectURL(f)); resetSkyPoints(); e.target.value = ""; };
  const handlePreOpApUpload  = (e) => { const f = e.target.files?.[0]; if (!f) return; setPreOpApSrc(URL.createObjectURL(f));  e.target.value = ""; };
  const handlePreOpLatUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; setPreOpLatSrc(URL.createObjectURL(f)); e.target.value = ""; };
  const handlePreOpSkyUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; setPreOpSkySrc(URL.createObjectURL(f)); e.target.value = ""; };

  const overallFlag = useMemo(() => {
    if (!tkaResult) return null;
    const flags = [tkaResult.mdfaFlag, tkaResult.mptaFlag, tkaResult.combinedFlag];
    if (pcoResult)   flags.push(pcoResult.pcoFlag);
    if (slopeResult) flags.push(slopeResult.slopeFlag);
    if (isResult)    flags.push(isResult.isFlag);
    if (skyResult) {
      if (skyResult.tiltFlag)   flags.push(skyResult.tiltFlag);
      if (skyResult.sulcusFlag) flags.push(skyResult.sulcusFlag);
    }
    return flags.some((f) => f !== "normal") ? "warning" : "good";
  }, [tkaResult, pcoResult, slopeResult, isResult, skyResult]);

  const medicalInsights = useMemo(() => {
    const out = [];
    if (tkaResult) {
      if (tkaResult.mdfaFlag !== "normal") {
        const dir = tkaResult.mdfaDev < 0 ? "Varus" : "Valgus";
        out.push(`Femoral ${dir} — deviasi komponen femoral ${Math.abs(tkaResult.mdfaDev)}° dari target 90°`);
      }
      if (tkaResult.mptaFlag !== "normal") {
        const dir = tkaResult.mptaDev < 0 ? "Varus" : "Valgus";
        out.push(`Tibial ${dir} — deviasi komponen tibial ${Math.abs(tkaResult.mptaDev)}° dari target 90°`);
      }
      if (tkaResult.combinedFlag !== "normal") {
        const dir = tkaResult.combined < 175 ? "varus" : "valgus";
        out.push(`Combined ${dir} — total MDFA+MPTA ${tkaResult.combined}°, risiko distribusi beban asimetris`);
      }
      if ([tkaResult.mdfaFlag, tkaResult.mptaFlag].some((f) => f === "low"))
        out.push("Risiko loosening medial — evaluasi tekanan kompartemen medial jangka panjang");
      if ([tkaResult.mdfaFlag, tkaResult.mptaFlag].some((f) => f === "high"))
        out.push("Risiko loosening lateral — evaluasi tekanan kompartemen lateral jangka panjang");
    }
    if (pcoResult) {
      if (pcoResult.pcoFlag === "low") out.push("PCO rendah — offset kondil posterior berkurang, potensial keterbatasan ROM fleksi");
      else if (pcoResult.pcoFlag === "high") out.push("PCO tinggi — offset kondil posterior berlebih, evaluasi impingement posterior");
    }
    if (slopeResult && slopeResult.slopeFlag !== "normal") {
      out.push(`Tibial slope ${slopeResult.slope}° ${slopeResult.isPosterior ? "posterior" : "anterior"} — ${slopeResult.slopeFlag === "low" ? "kurang kemiringan, evaluasi ketegangan fleksi" : "kemiringan berlebih atau anterior, evaluasi stabilitas"}`);
    }
    if (isResult && isResult.isFlag !== "normal") {
      out.push(`Insall-Salvati ${isResult.ratio.toFixed(2)} — ${isResult.isFlag === "low" ? "patela baja, evaluasi joint line elevation" : "patela alta, evaluasi risiko subluksasi"}`);
    }
    if (skyResult) {
      if (skyResult.tiltFlag === "high")   out.push(`Patellar tilt ${skyResult.patellarTilt}° — kemiringan signifikan, evaluasi balancing patellofemoral`);
      if (skyResult.sulcusFlag === "high") out.push(`Sulkus angle ${skyResult.sulcusAngle}° — trochlear groove dangkal, risiko instabilitas patellofemoral`);
    }
    if (out.length === 0 && tkaResult) out.push("Semua parameter dalam batas akseptabel. Follow-up klinis sesuai protokol standar.");
    return out;
  }, [tkaResult, pcoResult, slopeResult, isResult, skyResult]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { doc, filename } = await exportToPDF({ apImgRef, latImgRef, skyImgRef, apPoints, latPoints, skyPoints, tkaResult, pcoResult, slopeResult, isResult, skyResult, legSide, doctorNotes });
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, doc, filename });
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV({ legSide, doctorNotes, tkaResult, pcoResult, slopeResult, isResult, skyResult });
  };

  const handleDownloadPDF = () => {
    if (pdfPreview) pdfPreview.doc.save(pdfPreview.filename);
  };

  const handleClosePdfPreview = () => {
    if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview(null);
  };

  // Side-aware hints for medial/lateral landmarks — must be before any early return
  const sideHints = useCallback((baseHints, isAP) => {
    if (!isAP) return baseHints;
    const medialSide = legSide === "right" ? "KIRI" : "KANAN";
    const lateralSide = legSide === "right" ? "KANAN" : "KIRI";
    return [
      baseHints[0],
      baseHints[1],
      baseHints[2],
      `Klik di sisi ${medialSide} gambar — kondil medial (dalam)`,
      `Klik di sisi ${lateralSide} gambar — kondil lateral (luar)`,
      `Klik di sisi ${medialSide} gambar — plateau tibial medial (dalam)`,
      `Klik di sisi ${lateralSide} gambar — plateau tibial lateral (luar)`,
    ];
  }, [legSide]);

  if (!isOpen) return null;

  // Photo grid layout — computed outside JSX to avoid IIFE (SWC limitation)
  const photoCount   = [apImageSrc, latImageSrc, skyImageSrc].filter(Boolean).length || 1;
  const gridRowsCls  = photoCount <= 1 ? "md:grid-rows-1" : photoCount === 2 ? "md:grid-rows-2" : "md:grid-rows-3";

  const sidebar = (landmarkDefs, hints, points, activeIndex, result) => {
    const isAP  = landmarkDefs === AP_LANDMARKS;
    const isSky = landmarkDefs === SKY_LANDMARKS;
    const isLat = !isAP && !isSky;
    const activeHints = isAP ? sideHints(hints, true) : hints;
    return (
    <div
      className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden md:w-[260px]"
      style={{ borderLeft: "1px solid var(--soft-border, #e2e8f0)" }}
    >
      {/* ── Fixed header ────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2.5" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
        <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
          {isAP ? "AP View — 7 Titik" : isSky ? "Skyline — 5 Titik (Opsional)" : "Lateral — PCO + Slope + Patela"}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <Move className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="text-[9px] text-slate-400">Klik gambar tempatkan titik · Drag untuk edit</span>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* Leg side selector — AP only */}
        {isAP && (
          <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
            <p className="mb-1.5 text-[9px] font-black tracking-wide text-slate-500 uppercase">Sisi Kaki</p>
            <div className="flex gap-2">
              {[
                { key: "right", label: "Kaki Kanan", sub: "Medial = kiri gambar" },
                { key: "left",  label: "Kaki Kiri",  sub: "Medial = kanan gambar" },
              ].map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => setLegSide(key)}
                  className="flex flex-1 flex-col items-center rounded-xl border py-2 text-[10px] font-black transition-all"
                  style={{
                    background: legSide === key ? "#ede9fe" : "transparent",
                    borderColor: legSide === key ? "#7c3aed" : "var(--soft-border, #e2e8f0)",
                    color: legSide === key ? "#6d28d9" : "#94a3b8",
                  }}
                >
                  {label}
                  <span className="mt-0.5 text-[8px] font-normal opacity-70">{sub}</span>
                </button>
              ))}
            </div>
            <div className="relative mt-2 overflow-hidden rounded-xl bg-slate-900" style={{ aspectRatio: "137/184" }}>
              <img src="/tka/ap.svg" alt="AP knee" className="h-full w-full object-contain" />
            </div>
          </div>
        )}

        {/* Landmark list */}
        <div>
          {landmarkDefs.map((def, i) => {
            const placed = !!points[def.key];
            const isActive = i === activeIndex;
            const isSlopeFirst = isLat && def === SLOPE_LANDMARKS[0];
            const isISFirst    = isLat && def === IS_LANDMARKS[0];
            return (
              <React.Fragment key={def.key}>
                {isSlopeFirst && (
                  <div className="flex items-center gap-2 px-4 py-1.5" style={{ background: "#f0fdf4", borderBottom: "1px solid #d1fae5", borderTop: "1px solid #d1fae5" }}>
                    <span className="text-[9px] font-black tracking-widest text-emerald-600 uppercase">Tibial Slope</span>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-500">Opsional · 3–7°</span>
                  </div>
                )}
                {isISFirst && (
                  <div className="flex items-center gap-2 px-4 py-1.5" style={{ background: "#fdf4ff", borderBottom: "1px solid #f0abfc", borderTop: "1px solid #f0abfc" }}>
                    <span className="text-[9px] font-black tracking-widest text-fuchsia-600 uppercase">Insall-Salvati</span>
                    <span className="rounded-full bg-fuchsia-100 px-1.5 py-0.5 text-[8px] font-bold text-fuchsia-500">Opsional · 0.8–1.2</span>
                  </div>
                )}
                <div
                  className="flex items-start gap-2.5 px-3 py-2"
                  style={{
                    background: isActive ? def.color + "12" : "transparent",
                    borderLeft: isActive ? `3px solid ${def.color}` : "3px solid transparent",
                    borderBottom: "1px solid var(--soft-border, #e2e8f0)",
                  }}
                >
                  <div
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center text-[9px] font-black"
                    style={{ background: placed ? def.color : "transparent", borderColor: def.color, color: placed ? "#fff" : def.color }}
                  >
                    {placed ? "✓" : i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold leading-tight" style={{ color: isActive ? def.color : placed ? "var(--soft-text-hi, #0f172a)" : "#94a3b8" }}>
                      {def.short} — {def.label}
                    </p>
                    {isActive && <p className="mt-0.5 text-[9px] leading-snug" style={{ color: def.color + "cc" }}>{activeHints[i]}</p>}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* AP quick preview */}
        {result && landmarkDefs === AP_LANDMARKS && (
          <div className="m-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="mb-1.5 text-[9px] font-black text-indigo-700 uppercase tracking-wide">Preview AP</p>
            {[
              { label: "MDFA", val: result.MDFA + "°", flag: result.mdfaFlag },
              { label: "MPTA", val: result.MPTA + "°", flag: result.mptaFlag },
              { label: "Total", val: result.combined + "°", flag: result.combinedFlag },
            ].map(({ label, val, flag }) => (
              <div key={label} className="flex items-center justify-between py-0.5">
                <span className="text-[10px] text-slate-500">{label}</span>
                <div className="flex items-center gap-1">
                  <FlagDot flag={flag} />
                  <span className="text-[10px] font-black text-slate-700">{val}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PCO diagram */}
        {isLat && (
          <div className="px-3 py-3" style={{ borderTop: "1px solid var(--soft-border, #e2e8f0)" }}>
            <p className="mb-1.5 text-[9px] font-black tracking-wider text-slate-400 uppercase">Panduan PCO (Lateral)</p>
            <div className="overflow-hidden rounded-xl bg-slate-900" style={{ aspectRatio: "140/185" }}>
              <img src="/tka/lateral.svg" alt="lateral knee" className="h-full w-full object-contain" />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {[
                { col: "#efd213", label: "KA", sub: "anterior" },
                { col: "#d9710b", label: "KP", sub: "post. shaft" },
                { col: "#9a18c7", label: "CP", sub: "kondil post." },
              ].map(({ col, label, sub }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: col }} />
                  <span className="text-[9px] font-black" style={{ color: col }}>{label}</span>
                  <span className="text-[9px] text-slate-400">{sub}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
              <p className="text-[9px] leading-snug text-slate-500">
                PCO opsional. Klik berurutan: <span className="font-bold text-yellow-600">KA</span> → <span className="font-bold text-orange-600">KP</span> → <span className="font-bold text-violet-600">CP</span>.
              </p>
            </div>
          </div>
        )}

        {/* Skyline guide */}
        {isSky && (
          <div className="px-3 py-3" style={{ borderTop: "1px solid var(--soft-border, #e2e8f0)" }}>
            <p className="mb-1.5 text-[9px] font-black tracking-wider text-slate-400 uppercase">Panduan Skyline/Merchant</p>
            <div className="rounded-xl bg-slate-100 p-2.5">
              <p className="text-[9px] leading-relaxed text-slate-500">Foto Merchant (45° fleksi). Patela di tengah, trochlear groove di bawahnya.</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { col: "#c084fc", label: "PM", sub: "medial patela" },
                  { col: "#a855f7", label: "PL", sub: "lateral patela" },
                  { col: "#38bdf8", label: "TM", sub: "kondil medial" },
                  { col: "#0ea5e9", label: "TL", sub: "kondil lateral" },
                  { col: "#f472b6", label: "SG", sub: "sulkus" },
                ].map(({ col, label, sub }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: col }} />
                    <span className="text-[9px] font-black" style={{ color: col }}>{label}</span>
                    <span className="text-[9px] text-slate-400">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex gap-1.5 rounded-lg bg-purple-50 px-2.5 py-2">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-purple-400" />
              <p className="text-[9px] leading-snug text-purple-600">Skyline opsional. Klik berurutan: <span className="font-bold">PM → PL → TM → TL → SG</span>.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
  };

  const canvasControls = (uploadRef, handleUpload, points, resetPoints, transform, setTransform, imageSrc, imgRef = apImgRef, canRef = apCanRef, undo = null, redo = null, canUndo = false, canRedo = false) => (
    <>
      <div className="absolute left-2 top-2 flex gap-1.5 z-10 flex-wrap">
        <button onClick={() => uploadRef.current?.click()} className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          <Camera className="h-3 w-3" />
          {imageSrc ? "Ganti" : "Upload"}
        </button>
        {Object.keys(points).length > 0 && (
          <button onClick={resetPoints} className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
      {/* Undo / Redo */}
      <div className="absolute left-2 bottom-2 flex gap-1 z-10">
        <button
          onClick={undo} disabled={!canUndo}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm disabled:opacity-30"
          title="Undo"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={redo} disabled={!canRedo}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm disabled:opacity-30"
          title="Redo"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="absolute right-2 top-2 flex flex-col gap-1 z-10">
        <button onClick={() => setTransform((t) => ({ ...t, scale: Math.min(30, t.scale * 1.25) }))} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.08, t.scale / 1.25) }))} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        {imageSrc && (
          <button
            className="flex h-7 items-center justify-center rounded-full bg-black/55 px-1.5 text-[9px] font-black text-white backdrop-blur-sm"
            onClick={() => { if (imgRef.current && canRef.current) setTransform(fitTransform(imgRef.current, canRef.current)); }}
          >
            Fit
          </button>
        )}
      </div>
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </>
  );

  const content = (
    <>
    {/* ── PDF Preview Modal ──────────────────────────────────────────────────── */}
    {pdfPreview && (
      <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4"
        style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(8px)" }}
        onClick={handleClosePdfPreview}
      >
        <div
          className="relative flex h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
          style={{ background: "#fff" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex shrink-0 items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#4f46e5" }}>
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black text-slate-700">Preview PDF</p>
                <p className="text-[10px] text-slate-400">{pdfPreview.filename}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black text-white"
                style={{ background: "#4f46e5" }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>
              <button
                onClick={handleClosePdfPreview}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* PDF viewer — iframe on desktop, download prompt on mobile */}
          <iframe
            src={pdfPreview.url}
            className="hidden w-full flex-1 sm:block"
            style={{ minHeight: "60vh", border: "none" }}
            title="PDF Preview"
          />
          {/* Mobile fallback: show download link since iOS Safari blocks PDF iframe */}
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 sm:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "#ede9fe" }}>
              <svg className="h-8 w-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-slate-700">PDF Siap Diunduh</p>
              <p className="mt-1 text-xs text-slate-400">Preview tidak tersedia di browser mobile. Tap tombol Download untuk mengunduh file PDF.</p>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black text-white"
              style={{ background: "#4f46e5" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </div>
    )}
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="flex h-[96vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-t-[24px] shadow-2xl sm:h-[96vh] sm:max-h-[99vh] sm:rounded-[24px]"
            style={{ background: "var(--color-surface, #f8fafc)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="shrink-0 px-3 py-3 md:px-5 md:py-4" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="hidden text-[10px] font-black tracking-widest text-violet-600 uppercase md:block">Post-TKA Radiographic Assessment</div>
                  <h2 className="truncate text-sm font-extrabold md:mt-0.5 md:text-lg" style={{ color: "var(--soft-text-hi, #0f172a)" }}>
                    Analisis Alignment TKA
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {step === "result" && tkaResult && (
                    <>
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black"
                        style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}
                        title="Export ke CSV"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">CSV</span>
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black text-white md:px-3.5"
                        style={{ background: "#7c3aed" }}
                      >
                        {exporting ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden md:inline">{exporting ? "Menyimpan..." : "Simpan PDF"}</span>
                        <span className="md:hidden">{exporting ? "..." : "PDF"}</span>
                      </button>
                    </>
                  )}
                  <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--soft-border, #e2e8f0)", color: "var(--soft-text-hi, #0f172a)" }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Step dots */}
              <div className="mt-3 flex items-center gap-0 md:mt-4">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s}>
                    <StepDot index={i} active={i === stepIndex} done={i < stepIndex} label={STEP_LABELS[i]} />
                    {i < STEPS.length - 1 && (
                      <div className="mx-1 h-px flex-1" style={{ background: i < stepIndex ? "#4f46e5" : "#e2e8f0" }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ── Body ────────────────────────────────────────────────── */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {/* ── AP View ─────────────────────────────────────────── */}
                {step === "ap" && (
                  <motion.div key="ap" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="flex h-full flex-col overflow-hidden md:flex-row"
                  >
                    <div className="relative min-h-[260px] flex-1 overflow-hidden bg-slate-900">
                      <LandmarkCanvas
                        imageSrc={apImageSrc}
                        landmarks={apPoints}
                        landmarkDefs={AP_LANDMARKS}
                        hints={AP_HINTS}
                        activeIndex={apActiveIndex}
                        transform={apTransform}
                        setTransform={setApTransform}
                        onPlace={handleApPlace}
                        onMoveLandmark={handleApMove}
                        connections={AP_CONNECTIONS}
                        canvasRef={apCanRef}
                      />
                      {canvasControls(apUploadRef, handleApUpload, apPoints, resetApPoints, apTransform, setApTransform, apImageSrc, apImgRef, apCanRef, undoAp, redoAp, canUndoAp, canRedoAp)}
                    </div>
                    {sidebar(AP_LANDMARKS, AP_HINTS, apPoints, apActiveIndex, tkaResult)}
                  </motion.div>
                )}

                {/* ── Lateral View ─────────────────────────────────────── */}
                {step === "lateral" && (
                  <motion.div key="lateral" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="flex h-full flex-col overflow-hidden md:flex-row"
                  >
                    <div className="relative min-h-[260px] flex-1 overflow-hidden bg-slate-900">
                      <LandmarkCanvas
                        imageSrc={latImageSrc}
                        landmarks={latPoints}
                        landmarkDefs={ALL_LAT_LANDMARKS}
                        hints={[...LAT_HINTS, ...SLOPE_HINTS, ...IS_HINTS]}
                        activeIndex={latActiveIndex}
                        transform={latTransform}
                        setTransform={setLatTransform}
                        onPlace={handleLatPlace}
                        onMoveLandmark={handleLatMove}
                        connections={ALL_LAT_CONNECTIONS}
                        drawOverlay={pcoOverlay}
                        canvasRef={latCanRef}
                      />
                      {canvasControls(latUploadRef, handleLatUpload, latPoints, resetLatPoints, latTransform, setLatTransform, latImageSrc, latImgRef, latCanRef, undoLat, redoLat, canUndoLat, canRedoLat)}
                      {/* Orientation guide bar — standard lateral X-ray: anterior on right for left knee */}
                      {latImageSrc && (
                        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 backdrop-blur-sm">
                          <span className="text-[9px] font-black text-blue-300">← POST</span>
                          <span className="h-2 w-px bg-white/20" />
                          <span className="text-[9px] font-bold text-white/40">Orientasi Standar</span>
                          <span className="h-2 w-px bg-white/20" />
                          <span className="text-[9px] font-black text-orange-300">ANT →</span>
                        </div>
                      )}
                    </div>
                    {sidebar(ALL_LAT_LANDMARKS, [...LAT_HINTS, ...SLOPE_HINTS, ...IS_HINTS], latPoints, latActiveIndex, null)}
                  </motion.div>
                )}

                {/* ── Skyline View ─────────────────────────────────────── */}
                {step === "skyline" && (
                  <motion.div key="skyline" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="flex h-full flex-col overflow-hidden md:flex-row"
                  >
                    <div className="relative min-h-[260px] flex-1 overflow-hidden bg-slate-900">
                      <LandmarkCanvas
                        imageSrc={skyImageSrc}
                        landmarks={skyPoints}
                        landmarkDefs={SKY_LANDMARKS}
                        hints={SKY_HINTS}
                        activeIndex={skyActiveIndex}
                        transform={skyTransform}
                        setTransform={setSkyTransform}
                        onPlace={handleSkyPlace}
                        onMoveLandmark={handleSkyMove}
                        connections={SKY_CONNECTIONS}
                        canvasRef={skyCanRef}
                      />
                      {canvasControls(skyUploadRef, handleSkyUpload, skyPoints, resetSkyPoints, skyTransform, setSkyTransform, skyImageSrc, skyImgRef, skyCanRef, undoSky, redoSky, canUndoSky, canRedoSky)}
                      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 backdrop-blur-sm">
                        <span className="text-[9px] font-black text-purple-300">Skyline/Merchant View</span>
                        <span className="h-2 w-px bg-white/20" />
                        <span className="text-[9px] font-bold text-white/40">Opsional — lewati jika tidak tersedia</span>
                      </div>
                      {!skyImageSrc && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                          <p className="text-[13px] font-bold text-slate-400">Tidak ada foto skyline?</p>
                          <p className="text-[11px] text-slate-500">Upload foto Merchant/Skyline, atau lewati langsung ke Hasil</p>
                        </div>
                      )}
                    </div>
                    {sidebar(SKY_LANDMARKS, SKY_HINTS, skyPoints, skyActiveIndex, null)}
                  </motion.div>
                )}

                {/* ── Results ──────────────────────────────────────────── */}
                {step === "result" && (
                  <motion.div key="result" ref={resultRowRef} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="flex h-full flex-col overflow-y-auto lg:overflow-hidden lg:flex-row"
                  >
                    {/* ── COL 1: X-Ray Visualization ─────────────────────── */}
                    <div className="flex shrink-0 flex-col overflow-hidden border-b border-slate-200 min-w-full lg:min-w-0 lg:h-full lg:border-b-0 lg:border-r" style={{ background: "var(--color-surface-lo, #f1f5f9)", width: `${col1Pct}%` }}>
                      <div className="shrink-0 px-3 py-2" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
                        <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">X-Ray Visualization &amp; Annotation</p>
                      </div>
                      {/* AP + Lateral side by side */}
                      <div className="flex h-[180px] flex-row lg:h-[50%]" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
                        <PhotoRow compareMode={compareMode} preOpSrc={preOpApSrc} preOpLabel="AP" className="flex-1 w-auto">
                          <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 p-1.5">
                            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white/80 uppercase">X-Ray AP View</span>
                          </div>
                          {apImageSrc ? (
                            <LandmarkCanvas imageSrc={apImageSrc} landmarks={apPoints} landmarkDefs={AP_LANDMARKS} hints={AP_HINTS} activeIndex={-1} transform={apResTransform} setTransform={setApResTransform} onPlace={() => {}} onMoveLandmark={handleApMove} connections={AP_CONNECTIONS} />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-slate-500">Foto AP belum diunggah</div>
                          )}
                        </PhotoRow>
                        <PhotoRow compareMode={compareMode} preOpSrc={preOpLatSrc} preOpLabel="Lateral" className="flex-1 w-auto border-r-0">
                          <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 p-1.5">
                            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white/80 uppercase">X-Ray Lateral View</span>
                          </div>
                          {latImageSrc ? (
                            <LandmarkCanvas imageSrc={latImageSrc} landmarks={latPoints} landmarkDefs={ALL_LAT_LANDMARKS} hints={[...LAT_HINTS, ...SLOPE_HINTS, ...IS_HINTS]} activeIndex={-1} transform={latResTransform} setTransform={setLatResTransform} onPlace={() => {}} onMoveLandmark={handleLatMove} connections={ALL_LAT_CONNECTIONS} drawOverlay={pcoOverlay} />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-slate-500">Foto lateral belum diunggah</div>
                          )}
                        </PhotoRow>
                      </div>
                      {/* Skyline */}
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
                        <div className="shrink-0 px-3 py-1.5" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
                          <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">X-Ray Skyline View (Opsional)</p>
                        </div>
                        {skyImageSrc ? (
                          <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-900">
                            <PhotoRow compareMode={compareMode} preOpSrc={preOpSkySrc} preOpLabel="Skyline" className="h-full w-full border-0">
                              <LandmarkCanvas imageSrc={skyImageSrc} landmarks={skyPoints} landmarkDefs={SKY_LANDMARKS} hints={SKY_HINTS} activeIndex={-1} transform={skyResTransform} setTransform={setSkyResTransform} onPlace={() => {}} onMoveLandmark={handleSkyMove} connections={SKY_CONNECTIONS} />
                            </PhotoRow>
                          </div>
                        ) : (
                          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--soft-border, #e2e8f0)" }}>
                              <Camera className="h-5 w-5 text-slate-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] font-bold text-slate-500">Upload Skyline / Merchant View</p>
                              <p className="mt-0.5 text-[9px] text-slate-400">Foto opsional untuk patellar assessment</p>
                            </div>
                            <button onClick={() => skyUploadRef.current?.click()} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black text-white" style={{ background: "#7c3aed" }}>
                              <Camera className="h-3 w-3" /> Upload
                            </button>
                            <input ref={skyUploadRef} type="file" accept="image/*" className="hidden" onChange={handleSkyUpload} />
                          </div>
                        )}
                      </div>
                      {/* Compare mode toggle */}
                      <div className="shrink-0 px-3 py-2">
                        <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[9px] font-black transition-colors" style={{ background: compareMode ? "#ede9fe" : "var(--soft-border, #e2e8f0)", color: compareMode ? "#6d28d9" : "#94a3b8" }} onClick={() => setCompareMode((v) => !v)}>
                          <span>⇌</span>
                          <span>{compareMode ? "Mode Komparasi Pre/Post Aktif" : "Tambah Foto Pre-op untuk Komparasi"}</span>
                        </button>
                        {compareMode && (
                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            {[
                              { label: "AP", src: preOpApSrc, ref: preOpApRef, handler: handlePreOpApUpload, onClear: () => setPreOpApSrc(null) },
                              { label: "Lat", src: preOpLatSrc, ref: preOpLatRef, handler: handlePreOpLatUpload, onClear: () => setPreOpLatSrc(null) },
                              { label: "Sky", src: preOpSkySrc, ref: preOpSkyRef, handler: handlePreOpSkyUpload, onClear: () => setPreOpSkySrc(null) },
                            ].map(({ label, src, ref, handler, onClear }) => (
                              <div key={label} className="relative overflow-hidden rounded-lg border-2 border-dashed" style={{ aspectRatio: "1", borderColor: src ? "#7c3aed" : "var(--soft-border, #cbd5e1)" }}>
                                {src ? (
                                  <>
                                    <img src={src} alt={"Pre-op " + label} className="h-full w-full object-cover" />
                                    <button onClick={onClear} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[8px] text-white">✕</button>
                                    <span className="absolute bottom-0 inset-x-0 bg-violet-900/80 py-0.5 text-center text-[7px] font-black text-violet-200">{label}</span>
                                  </>
                                ) : (
                                  <button onClick={() => ref.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-0.5">
                                    <span className="text-base text-slate-300">+</span>
                                    <span className="text-[8px] font-black text-slate-400">{label}</span>
                                  </button>
                                )}
                                <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handler} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Drag resize handle ─────────────────────────────────── */}
                    <div
                      onMouseDown={onResizeStart}
                      className="group hidden lg:flex shrink-0 w-1.5 cursor-col-resize items-center justify-center hover:w-2 transition-all z-10"
                      style={{ background: "var(--soft-border, #e2e8f0)" }}
                      title="Drag untuk mengatur lebar"
                    >
                      <div className="h-8 w-0.5 rounded-full bg-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* ── COL 2: Alignment & Clinical Data ──────────────────── */}
                    <div className="flex min-h-0 flex-col lg:flex-1 lg:overflow-hidden">
                      <div className="shrink-0 px-4 py-2.5" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)", background: "var(--color-surface, #f8fafc)" }}>
                        <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Alignment &amp; Clinical Data</p>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">

                        {/* Alignment Koronal */}
                        <div>
                          <p className="mb-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">Alignment Koronal (AP)</p>
                          {tkaResult ? (
                            <div className="space-y-1.5">
                              {[
                                { label: "MDFA", sub: "Mechanical Distal Femoral Angle", val: tkaResult.MDFA + "°", range: "85–95°", flag: tkaResult.mdfaFlag, text: tkaResult.mdfaText, min: 60, max: 120, lo: 85, hi: 95, num: tkaResult.MDFA },
                                { label: "MPTA", sub: "Medial Proximal Tibial Angle", val: tkaResult.MPTA + "°", range: "85–95°", flag: tkaResult.mptaFlag, text: tkaResult.mptaText, min: 60, max: 120, lo: 85, hi: 95, num: tkaResult.MPTA },
                                { label: "MDFA + MPTA", sub: "Combined alignment", val: tkaResult.combined + "°", range: "175–185°", flag: tkaResult.combinedFlag, text: tkaResult.combinedText, min: 140, max: 210, lo: 175, hi: 185, num: tkaResult.combined },
                              ].map(({ label, sub, val, range, flag, text, min, max, lo, hi, num }) => {
                                const s = FLAG_STYLES[flag] || FLAG_STYLES.normal;
                                const fl = flag === "normal" ? "Normal" : flag === "low" ? "Rendah" : "Tinggi";
                                return (
                                  <div key={label} className="rounded-2xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[9px] font-black tracking-wide text-slate-400 uppercase">{label}</p>
                                        <div className="mt-0.5 flex items-baseline gap-1">
                                          <span className="text-2xl font-black leading-none" style={{ color: s.text }}>{val}</span>
                                          <span className="text-[9px]" style={{ color: s.dot }}>↓</span>
                                        </div>
                                        <p className="mt-0.5 text-[8px] text-slate-400">Kisaran: {range}</p>
                                        {text && <p className="mt-1 text-[9px] leading-snug" style={{ color: s.text }}>{text}</p>}
                                      </div>
                                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                                        <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: s.dot + "22", color: s.dot }}>{fl}</span>
                                        <MiniChart value={num} min={min} max={max} normalLow={lo} normalHigh={hi} flag={flag} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-[10px] text-slate-400">Landmark AP belum lengkap — kembali ke step AP View.</div>
                          )}
                        </div>

                        {/* PCO */}
                        <div>
                          <p className="mb-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">PCO (Lateral)</p>
                          {pcoResult ? (() => {
                            const s = FLAG_STYLES[pcoResult.pcoFlag] || FLAG_STYLES.normal;
                            const fl = pcoResult.pcoFlag === "normal" ? "Normal" : pcoResult.pcoFlag === "low" ? "Rendah" : "Tinggi";
                            return (
                              <div className="rounded-2xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-black tracking-wide text-slate-400 uppercase">PCO Ratio</p>
                                    <div className="mt-0.5 flex items-baseline gap-1">
                                      <span className="text-2xl font-black leading-none" style={{ color: s.text }}>{pcoResult.ratio.toFixed(2)}</span>
                                    </div>
                                    <p className="mt-0.5 text-[8px] text-slate-400">Kisaran: 0.40–0.80 (Ideal ≥0.47)</p>
                                    {pcoResult.pcoText && <p className="mt-1 text-[9px] leading-snug" style={{ color: s.text }}>{pcoResult.pcoText}</p>}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                                    <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: s.dot + "22", color: s.dot }}>{fl}</span>
                                    <MiniChart value={pcoResult.ratio} min={0.2} max={0.9} normalLow={0.4} normalHigh={0.6} flag={pcoResult.pcoFlag} />
                                  </div>
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="rounded-xl border border-dashed border-slate-200 p-3">
                              <p className="text-[9px] text-slate-400">Tandal TA, TB, PA, PP pasa lateral X-ray untuk mengukur PCO (opsional).</p>
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[8px] font-bold text-slate-400">◎ Opsional</span>
                            </div>
                          )}
                        </div>

                        {/* Tibial Slope */}
                        <div>
                          <p className="mb-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">Tibial Slope (Lateral)</p>
                          {slopeResult ? (() => {
                            const s = FLAG_STYLES[slopeResult.slopeFlag] || FLAG_STYLES.normal;
                            const fl = slopeResult.slopeFlag === "normal" ? "Normal" : slopeResult.slopeFlag === "low" ? "Rendah" : "Tinggi";
                            return (
                              <div className="rounded-2xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-black tracking-wide text-slate-400 uppercase">Slope Tibial {slopeResult.isPosterior ? "Posterior" : "Anterior"}</p>
                                    <div className="mt-0.5 flex items-baseline gap-1">
                                      <span className="text-2xl font-black leading-none" style={{ color: s.text }}>{slopeResult.slope}°</span>
                                    </div>
                                    <p className="mt-0.5 text-[8px] text-slate-400">Kisaran: 3–7° posterior normal</p>
                                    {slopeResult.slopeText && <p className="mt-1 text-[9px] leading-snug" style={{ color: s.text }}>{slopeResult.slopeText}</p>}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                                    <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: s.dot + "22", color: s.dot }}>{fl}</span>
                                    <MiniChart value={slopeResult.slope} min={-5} max={20} normalLow={3} normalHigh={7} flag={slopeResult.slopeFlag} />
                                  </div>
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="rounded-xl border border-dashed border-slate-200 p-3">
                              <p className="text-[9px] text-slate-400">Tandal TA, TB, PA, PP pasa lateral X-ray untuk mengukur tibial slope (3–7° normal).</p>
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[8px] font-bold text-slate-400">◎ Opsional</span>
                            </div>
                          )}
                        </div>

                        {/* Insall-Salvati */}
                        <div>
                          <p className="mb-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">Insall-Salvati Ratio (Patela)</p>
                          {isResult ? (() => {
                            const s = FLAG_STYLES[isResult.isFlag] || FLAG_STYLES.normal;
                            const fl = isResult.isFlag === "normal" ? "Normal" : isResult.isFlag === "low" ? "Rendah" : "Tinggi";
                            return (
                              <div className="rounded-2xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-black tracking-wide text-slate-400 uppercase">Insall-Salvati (LP/LT)</p>
                                    <div className="mt-0.5"><span className="text-2xl font-black leading-none" style={{ color: s.text }}>{isResult.ratio.toFixed(2)}</span></div>
                                    <p className="mt-0.5 text-[8px] text-slate-400">Kisaran: 0.8–1.2</p>
                                    {isResult.isText && <p className="mt-1 text-[9px] leading-snug" style={{ color: s.text }}>{isResult.isText}</p>}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                                    <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: s.dot + "22", color: s.dot }}>{fl}</span>
                                    <MiniChart value={isResult.ratio} min={0.3} max={2.0} normalLow={0.8} normalHigh={1.2} flag={isResult.isFlag} />
                                  </div>
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="rounded-xl border border-dashed border-slate-200 p-3">
                              <p className="text-[9px] text-slate-400">Tandal PS, PI, TT patia lateral X-ray untul menilai slope (normal 0.8–1.2).</p>
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[8px] font-bold text-slate-400">◎ Opsional</span>
                            </div>
                          )}
                        </div>

                        {/* Patellar Assessment */}
                        <div>
                          <p className="mb-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">Patellar Assessment (Skyline)</p>
                          {skyResult ? (
                            <div className="space-y-1.5">
                              {skyResult.patellarTilt !== null && (() => {
                                const s = FLAG_STYLES[skyResult.tiltFlag] || FLAG_STYLES.normal;
                                return (
                                  <div className="rounded-2xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="text-[9px] font-black tracking-wide text-slate-400 uppercase">Patellar Tilt</p>
                                        <span className="text-2xl font-black" style={{ color: s.text }}>{skyResult.patellarTilt}°</span>
                                        <p className="text-[8px] text-slate-400">Kisaran: &lt;20°</p>
                                      </div>
                                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                                        <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: s.dot + "22", color: s.dot }}>{skyResult.tiltFlag === "normal" ? "Normal" : "Tinggi"}</span>
                                        <MiniChart value={skyResult.patellarTilt} min={0} max={40} normalLow={0} normalHigh={20} flag={skyResult.tiltFlag} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                              {skyResult.sulcusAngle !== null && (() => {
                                const s = FLAG_STYLES[skyResult.sulcusFlag] || FLAG_STYLES.normal;
                                return (
                                  <div className="rounded-2xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="text-[9px] font-black tracking-wide text-slate-400 uppercase">Sulkus Angle</p>
                                        <span className="text-2xl font-black" style={{ color: s.text }}>{skyResult.sulcusAngle}°</span>
                                        <p className="text-[8px] text-slate-400">Kisaran: ≤144°</p>
                                      </div>
                                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                                        <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: s.dot + "22", color: s.dot }}>{skyResult.sulcusFlag === "normal" ? "Normal" : "Tinggi"}</span>
                                        <MiniChart value={skyResult.sulcusAngle} min={100} max={200} normalLow={100} normalHigh={144} flag={skyResult.sulcusFlag} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 p-3">
                              <p className="text-[9px] text-slate-400">Upload foto bo Skyline dan Merchant (opsional).</p>
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[8px] font-bold text-slate-400">◎ Opsional</span>
                            </div>
                          )}
                        </div>

                        {/* Catatan Dokter */}
                        <div className="rounded-2xl border border-slate-200 p-3" style={{ background: "var(--color-surface, #f8fafc)" }}>
                          <p className="mb-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">Catatan Dokter</p>
                          <textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} placeholder="Tulis catatan klinis, rekomendasi, atau interpretasi dokter (disertakan di PDF &amp; CSV)..." className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-relaxed text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300" rows={3} />
                        </div>
                      </div>
                    </div>

                    {/* ── Drag resize handle (Col2↔Col3) ─────────────────────── */}
                    <div
                      onMouseDown={onResize3Start}
                      className="group hidden lg:flex shrink-0 w-1.5 cursor-col-resize items-center justify-center hover:w-2 transition-all z-10"
                      style={{ background: "var(--soft-border, #e2e8f0)" }}
                      title="Drag untuk mengatur lebar"
                    >
                      <div className="h-8 w-0.5 rounded-full bg-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* ── COL 3: Summary & AI Assessment ────────────────────── */}
                    <div className="flex min-h-0 flex-col overflow-hidden border-t border-slate-200 min-w-full lg:min-w-0 lg:border-l lg:border-t-0" style={{ background: "var(--color-surface, #f8fafc)", width: `${col3Pct}%` }}>
                      <div className="shrink-0 px-4 py-2.5" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
                        <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Summary &amp; AI Assessment</p>
                        <p className="text-[8px] text-slate-400">Simpligian for reference</p>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">

                        {/* Overall status */}
                        {overallFlag && (
                          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                            style={overallFlag === "good" ? { background: "#f0fdf4", border: "1px solid #bbf7d0" } : { background: "#fffbeb", border: "1px solid #fde68a" }}>
                            {overallFlag === "good" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> : <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />}
                            <p className="text-[10px] font-black" style={{ color: overallFlag === "good" ? "#15803d" : "#92400e" }}>
                              {overallFlag === "good" ? "Semua parameter dalam batas normal" : "Terdapat parameter di luar batas normal"}
                            </p>
                          </div>
                        )}

                        {/* Ikhtisar Medis */}
                        <div className="rounded-2xl border border-slate-200 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Activity className="h-3.5 w-3.5 text-slate-400" />
                              <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Ikhtisar Medis</p>
                            </div>
                            <span className="text-[10px] text-slate-300">↑</span>
                          </div>
                          <ul className="space-y-1.5">
                            {medicalInsights.map((insight, i) => (
                              <li key={i} className="flex items-start gap-2 text-[10px] leading-snug text-slate-600">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Rekomendasi Medis */}
                        <div className="rounded-2xl border border-slate-200 p-3">
                          <p className="mb-2 text-[9px] font-black tracking-widest text-slate-500 uppercase">Rekomendasi Medis</p>
                          <div className="mb-2">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Automated</p>
                            <ul className="space-y-1">
                              {(medicalInsights.length > 0 ? medicalInsights.slice(0, 2) : ["Follow-up klinis sesuai protokol standar."]).map((item, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[9px] leading-snug text-slate-500">
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Doctor-editable</p>
                            <textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} placeholder="Rekomendasi dokter..." className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px] leading-relaxed text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-300" rows={2} />
                          </div>
                        </div>

                        {/* Referensi */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <p className="mb-1 text-[8px] font-black text-slate-400 uppercase">Referensi</p>
                          <p className="text-[8px] leading-relaxed text-slate-400">
                            Post-TKA, Radiographic Assessment, {legSide === "right" ? "Kanan" : "Kiri"}_{new Date().toLocaleDateString("id-ID")}<br />
                            MDFA/MPTA 85–95° (Ritter 2011). PCO ≥0.47 (Bellemans 2002). Slope 3–7° (Kumar 2014). IS 0.8–1.2 (Rogers 2006). Tilt &lt;20° &amp; Sulkus ≤144° (Merchant 1974).
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--soft-border, #e2e8f0)" }}>
              <button
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black disabled:opacity-30"
                style={{ background: "var(--soft-border, #e2e8f0)", color: "var(--soft-text-hi, #0f172a)" }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Kembali
              </button>

              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === stepIndex ? 20 : 6, background: i === stepIndex ? "#6366f1" : i < stepIndex ? "#818cf8" : "#e2e8f0" }} />
                ))}
              </div>

              {stepIndex < STEPS.length - 1 ? (
                <button
                  onClick={() => {
                    const next = Math.min(STEPS.length - 1, stepIndex + 1);
                    setStepIndex(next);
                    // Auto-fit result canvases when entering result step
                    if (next === STEPS.length - 1) {
                      const cv = { width: 900, height: 580 };
                      if (apImgRef.current)  setApResTransform(fitTransform(apImgRef.current, cv));
                      if (latImgRef.current) setLatResTransform(fitTransform(latImgRef.current, cv));
                      if (skyImgRef.current) setSkyResTransform(fitTransform(skyImgRef.current, cv));
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black text-white"
                  style={{ background: "#4f46e5" }}
                >
                  {stepIndex === STEPS.length - 2 ? "Lihat Hasil" : "Lanjut"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black text-white"
                  style={{ background: "#4f46e5" }}
                >
                  Selesai
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
