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
    <div className="rounded-2xl border p-3.5" style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black tracking-wide text-slate-500 uppercase">{label}</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: s.dot + "22", color: s.dot }}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-black" style={{ color: s.text }}>{value}</span>
        <span className="text-xs font-semibold text-slate-400">{unit}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-400">Kisaran: {range}</p>
      <p className="mt-2 text-[11px] leading-snug" style={{ color: s.text }}>{text}</p>
    </div>
  );
}

function MiniResultCard({ label, value, unit, range, flag }) {
  const s = FLAG_STYLES[flag] || FLAG_STYLES.normal;
  const statusLabel = flag === "normal" ? "Normal" : flag === "low" ? "Rendah" : "Tinggi";
  return (
    <div className="rounded-2xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-black tracking-wide text-slate-500 uppercase">{label}</span>
        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: s.dot + "22", color: s.dot }}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span className="text-2xl font-black" style={{ color: s.text }}>{value}</span>
        <span className="text-xs font-semibold text-slate-400">{unit}</span>
        <span className="ml-0.5 text-[10px] text-slate-400">↓</span>
      </div>
      <p className="text-[9px] text-slate-400">Kisaran: {range}</p>
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

function renderAnnotatedCanvas(img, landmarks, landmarkDefs, connections, width = 900, height = 620) {
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
  apImgRef,
  latImgRef,
  skyImgRef,
  apPoints,
  latPoints,
  skyPoints,
  tkaResult,
  pcoResult,
  slopeResult,
  isResult,
  skyResult,
}) {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210, PH = 297;
  const margin = 14;
  let y = margin;

  // ── Colors ──
  const violet   = [99, 102, 241];
  const slate700 = [51, 65, 85];
  const slate400 = [148, 163, 184];
  const green    = [21, 128, 61];
  const orange   = [194, 65, 12];
  const red      = [185, 28, 28];

  const flagColor = (flag) => flag === "normal" ? green : flag === "low" ? orange : red;

  // ── Header ──
  doc.setFillColor(...violet);
  doc.rect(0, 0, PW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Post-TKA Radiographic Assessment", margin, 9);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Analisis Alignment Pasca Operasi Total Knee Arthroplasty", margin, 15);
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Tanggal: ${today}`, PW - margin - 40, 15);
  y = 28;

  // ── X-ray images (side-by-side) ──
  let apDataUrl = null;
  let latDataUrl = null;
  let skyDataUrl = null;
  if (apImgRef.current) {
    try { apDataUrl = renderAnnotatedCanvas(apImgRef.current, apPoints, AP_LANDMARKS, AP_CONNECTIONS, 900, 600); } catch {}
  }
  if (latImgRef.current && Object.keys(latPoints).length > 0) {
    try { latDataUrl = renderAnnotatedCanvas(latImgRef.current, latPoints, LAT_LANDMARKS, LAT_CONNECTIONS, 900, 600); } catch {}
  }
  if (skyImgRef.current && Object.keys(skyPoints).length > 0) {
    try { skyDataUrl = renderAnnotatedCanvas(skyImgRef.current, skyPoints, SKY_LANDMARKS, SKY_CONNECTIONS, 900, 600); } catch {}
  }

  if (apDataUrl || latDataUrl) {
    doc.setTextColor(...slate700);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Foto X-Ray", margin, y);
    y += 5;

    const hasBoth = !!(apDataUrl && latDataUrl);
    const gap = 3;
    const iW = hasBoth ? (PW - margin * 2 - gap) / 2 : PW - margin * 2;
    const iH = iW * (600 / 900);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...slate400);
    if (apDataUrl) doc.text("AP View", margin, y);
    if (latDataUrl) doc.text("Lateral View", hasBoth ? margin + iW + gap : margin, y);
    y += 3;

    if (apDataUrl) doc.addImage(apDataUrl, "JPEG", margin, y, iW, iH);
    if (latDataUrl) doc.addImage(latDataUrl, "JPEG", hasBoth ? margin + iW + gap : margin, y, iW, iH);
    y += iH + 3;

    if (skyDataUrl) {
      const sW = (PW - margin * 2) / 2;
      const sH = sW * (600 / 900);
      doc.setFontSize(7); doc.setTextColor(...slate400);
      doc.text("Skyline/Merchant View", margin, y);
      y += 3;
      doc.addImage(skyDataUrl, "JPEG", margin, y, sW, sH);
      y += sH + 4;
    } else {
      y += 4;
    }
  }

  // ── AP Results table ──
  if (tkaResult) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...slate700);
    doc.text("Hasil Pengukuran AP View", margin, y);
    y += 5;

    const rows = [
      { label: "MDFA (Mechanical Distal Femoral Angle)", value: `${tkaResult.MDFA}°`, range: "85–95°", flag: tkaResult.mdfaFlag, text: tkaResult.mdfaText },
      { label: "MPTA (Medial Proximal Tibial Angle)",    value: `${tkaResult.MPTA}°`, range: "85–95°", flag: tkaResult.mptaFlag, text: tkaResult.mptaText },
      { label: "MDFA + MPTA (Combined)",                  value: `${tkaResult.combined}°`, range: "175–185°", flag: tkaResult.combinedFlag, text: tkaResult.combinedText },
    ];

    rows.forEach((row) => {
      const rowH = 18;
      const col1 = margin, col2 = margin + 70, col3 = margin + 90, col4 = margin + 105;
      // background
      const fs = FLAG_STYLES[row.flag] || FLAG_STYLES.normal;
      const bgHex = fs.bg.replace("#", "");
      const br = parseInt(bgHex.slice(0, 2), 16), bg2 = parseInt(bgHex.slice(2, 4), 16), bb = parseInt(bgHex.slice(4, 6), 16);
      doc.setFillColor(br, bg2, bb);
      doc.roundedRect(margin, y, PW - margin * 2, rowH, 3, 3, "F");

      doc.setTextColor(...slate700);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(row.label, col1 + 2, y + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...flagColor(row.flag));
      doc.text(row.value, col2 + 2, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...slate400);
      doc.text(`Kisaran: ${row.range}`, col3 - 10, y + 5);

      const statusLabel = row.flag === "normal" ? "Normal" : row.flag === "low" ? "Rendah" : "Tinggi";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...flagColor(row.flag));
      doc.text(statusLabel, col4 + 10, y + 5);

      // interpretation text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...slate400);
      const wrapped = doc.splitTextToSize(row.text, PW - margin * 2 - 4);
      doc.text(wrapped.slice(0, 1), col1 + 2, y + 13);

      y += rowH + 2;
    });
    y += 4;
  }


  // ── PCO result ──
  if (pcoResult) {
    if (y > PH - 40) { doc.addPage(); y = margin; }
    const rowH = 18;
    const fs = FLAG_STYLES[pcoResult.pcoFlag] || FLAG_STYLES.normal;
    const bgHex = fs.bg.replace("#", "");
    const br = parseInt(bgHex.slice(0, 2), 16), bg2 = parseInt(bgHex.slice(2, 4), 16), bb = parseInt(bgHex.slice(4, 6), 16);
    doc.setFillColor(br, bg2, bb);
    doc.roundedRect(margin, y, PW - margin * 2, rowH, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...slate700);
    doc.text("PCO Ratio (Posterior Condylar Offset)", margin + 2, y + 5);
    doc.setFontSize(11);
    doc.setTextColor(...flagColor(pcoResult.pcoFlag));
    doc.text(pcoResult.ratio.toFixed(2), margin + 72, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...slate400);
    doc.text("Kisaran: 0.40–0.60 (ideal ≥0.47)", margin + 88, y + 5);
    const pcoLabel = pcoResult.pcoFlag === "normal" ? "Normal" : pcoResult.pcoFlag === "low" ? "Rendah" : "Tinggi";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...flagColor(pcoResult.pcoFlag));
    doc.text(pcoLabel, margin + 125, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...slate400);
    const wrapped = doc.splitTextToSize(pcoResult.pcoText, PW - margin * 2 - 4);
    doc.text(wrapped.slice(0, 1), margin + 2, y + 13);
    y += rowH + 6;
  }

  // ── Tibial slope result ──
  const pdfRow = (title, valueStr, rangeStr, flagKey, noteText) => {
    if (y > PH - 40) { doc.addPage(); y = margin; }
    const rowH = 18;
    const fs2 = FLAG_STYLES[flagKey] || FLAG_STYLES.normal;
    const bHex = fs2.bg.replace("#", "");
    doc.setFillColor(parseInt(bHex.slice(0,2),16), parseInt(bHex.slice(2,4),16), parseInt(bHex.slice(4,6),16));
    doc.roundedRect(margin, y, PW - margin * 2, rowH, 3, 3, "F");
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...slate700);
    doc.text(title, margin + 2, y + 5);
    doc.setFontSize(11); doc.setTextColor(...flagColor(flagKey));
    doc.text(valueStr, margin + 72, y + 7);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...slate400);
    doc.text(rangeStr, margin + 88, y + 5);
    const lbl = flagKey === "normal" ? "Normal" : flagKey === "low" ? "Rendah" : "Tinggi";
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...flagColor(flagKey));
    doc.text(lbl, margin + 125, y + 5);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...slate400);
    const wrp = doc.splitTextToSize(noteText, PW - margin * 2 - 4);
    doc.text(wrp.slice(0,1), margin + 2, y + 13);
    y += rowH + 6;
  };

  if (slopeResult) {
    pdfRow(
      `Tibial Slope ${slopeResult.isPosterior ? "Posterior" : "Anterior"}`,
      slopeResult.slope + "°",
      "Normal: posterior 3–7°",
      slopeResult.slopeFlag,
      slopeResult.slopeText,
    );
  }

  if (isResult) {
    pdfRow(
      "Insall-Salvati Ratio (Tinggi Patela)",
      isResult.ratio.toFixed(2),
      "Normal: 0.8–1.2",
      isResult.isFlag,
      isResult.isText,
    );
  }

  if (skyResult) {
    if (skyResult.patellarTilt !== null) {
      pdfRow(
        "Patellar Tilt (Skyline View)",
        skyResult.patellarTilt + "°",
        "Normal: <20°",
        skyResult.tiltFlag,
        skyResult.tiltText,
      );
    }
    if (skyResult.sulcusAngle !== null) {
      pdfRow(
        "Sulkus Angle (Skyline View)",
        skyResult.sulcusAngle + "°",
        "Normal: ≤144°",
        skyResult.sulcusFlag,
        skyResult.sulcusText,
      );
    }
  }

  // ── Reference footer ──
  if (y > PH - 30) { doc.addPage(); y = margin; }
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, PW - margin * 2, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slate700);
  doc.text("Referensi:", margin + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...slate400);
  const refText = "MDFA 85–95° & MPTA 85–95° (Ritter et al. 2011 CORR; Parratte et al. 2010 JBJS). PCO ratio ≥0.47 (Bellemans et al. 2002 JBJS Br). Tibial slope 3–7° (Kumar et al. 2014 Orthop Surg). Insall-Salvati 0.8–1.2 (Rogers et al. 2006 JBJS Br). Patellar tilt <20° & Sulkus ≤144° (Merchant 1974 JBJS). Keputusan klinis memerlukan evaluasi penuh oleh dokter ortopedi.";
  const refLines = doc.splitTextToSize(refText, PW - margin * 2 - 4);
  doc.text(refLines, margin + 2, y + 11);

  doc.save(`PostTKA_Assessment_${today.replace(/\s/g, "_")}.pdf`);
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

  const [legSide, setLegSide] = useState("right"); // "right" | "left"

  const [apPoints,  setApPoints]  = useState({});
  const [latPoints, setLatPoints] = useState({});
  const [skyPoints, setSkyPoints] = useState({});

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
      setStepIndex(0); setApPoints({}); setLatPoints({}); setSkyPoints({});
      setApImageSrc(null); setLatImageSrc(null); setSkyImageSrc(null);
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

  const handleApUpload  = (e) => { const f = e.target.files?.[0]; if (!f) return; setApImageSrc(URL.createObjectURL(f)); setApPoints({}); e.target.value = ""; };
  const handleLatUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; setLatImageSrc(URL.createObjectURL(f)); setLatPoints({}); e.target.value = ""; };
  const handleSkyUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; setSkyImageSrc(URL.createObjectURL(f)); setSkyPoints({}); e.target.value = ""; };

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
      await exportToPDF({ apImgRef, latImgRef, skyImgRef, apPoints, latPoints, skyPoints, tkaResult, pcoResult, slopeResult, isResult, skyResult });
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
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

  const sidebar = (landmarkDefs, hints, points, activeIndex, result) => {
    const isAP  = landmarkDefs === AP_LANDMARKS;
    const isSky = landmarkDefs === SKY_LANDMARKS;
    const isLat = !isAP && !isSky;
    const activeHints = isAP ? sideHints(hints, true) : hints;
    return (
    <div
      className="flex w-full shrink-0 flex-col overflow-y-auto md:w-[260px]"
      style={{ borderLeft: "1px solid var(--soft-border, #e2e8f0)" }}
    >
      {/* Leg side selector — only on AP step */}
      {isAP && (
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
          <p className="mb-2 text-[10px] font-black tracking-wide text-slate-500 uppercase">Sisi Kaki yang Di-foto</p>
          <div className="flex gap-2">
            {[
              { key: "right", label: "Kaki Kanan", sub: "Medial = KIRI gambar" },
              { key: "left",  label: "Kaki Kiri",  sub: "Medial = KANAN gambar" },
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
                <span className="mt-0.5 text-[9px] font-normal" style={{ color: legSide === key ? "#8b5cf6" : "#cbd5e1" }}>{sub}</span>
              </button>
            ))}
          </div>
          {/* AP anatomy diagram — labels Medial/Lateral sudah embedded dalam SVG */}
          <div className="relative mt-2 overflow-hidden rounded-xl bg-slate-900" style={{ aspectRatio: "137/184" }}>
            <img src="/tka/ap.svg" alt="AP knee" className="h-full w-full object-contain" />
          </div>
        </div>
      )}

      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
        <p className="text-[10px] font-black tracking-wide text-slate-500 uppercase">
          {isAP ? "AP View — 7 Titik" : isSky ? "Skyline View — 5 Titik (Opsional)" : "Lateral View — PCO + Slope + Patela"}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          Klik gambar untuk menempatkan titik. Titik yang sudah ada bisa di-drag untuk dipindah.
        </p>
        <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
          <Move className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="text-[10px] text-slate-400">Drag titik untuk edit posisi</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {landmarkDefs.map((def, i) => {
          const placed = !!points[def.key];
          const isActive = i === activeIndex;
          // Section headers for lateral sub-groups
          const isSlopeFirst = isLat && def === SLOPE_LANDMARKS[0];
          const isISFirst    = isLat && def === IS_LANDMARKS[0];
          return (
            <React.Fragment key={def.key}>
              {isSlopeFirst && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50" style={{ borderBottom: "1px solid #d1fae5" }}>
                  <span className="text-[9px] font-black tracking-widest text-emerald-600 uppercase">Tibial Slope (Opsional)</span>
                  <span className="text-[8px] text-emerald-400">Normal 3–7°</span>
                </div>
              )}
              {isISFirst && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-fuchsia-50" style={{ borderBottom: "1px solid #f0abfc" }}>
                  <span className="text-[9px] font-black tracking-widest text-fuchsia-600 uppercase">Insall-Salvati (Opsional)</span>
                  <span className="text-[8px] text-fuchsia-400">Normal 0.8–1.2</span>
                </div>
              )}
              <div
                className="flex items-start gap-2.5 px-4 py-2.5"
                style={{
                  background: isActive ? def.color + "14" : "transparent",
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
                  {isActive && <p className="mt-0.5 text-[9px] text-slate-400">{activeHints[i]}</p>}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Quick preview */}
      {result && landmarkDefs === AP_LANDMARKS && (
        <div className="m-3 shrink-0 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="mb-1.5 text-[10px] font-black text-indigo-700 uppercase tracking-wide">Preview AP</p>
          {[
            { label: "MDFA", val: result.MDFA + "°", flag: result.mdfaFlag },
            { label: "MPTA", val: result.MPTA + "°", flag: result.mptaFlag },
            { label: "Total", val: result.combined + "°", flag: result.combinedFlag },
          ].map(({ label, val, flag }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{label}</span>
              <div className="flex items-center gap-1">
                <FlagDot flag={flag} />
                <span className="text-[10px] font-black text-slate-700">{val}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLat && (
        <>
          {/* PCO diagram — titik KA/KP/CP dan garis pengukuran sudah embedded dalam SVG */}
          <div className="px-3 pt-3 pb-2 shrink-0" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
            <p className="mb-1.5 text-[9px] font-black tracking-wider text-slate-400 uppercase">Panduan titik PCO (lateral)</p>
            <div className="overflow-hidden rounded-xl bg-slate-900" style={{ width: "100%", aspectRatio: "140/185" }}>
              <img src="/tka/lateral.svg" alt="lateral knee" className="h-full w-full object-contain" />
            </div>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {[
                { col: "#efd213", label: "KA", sub: "korteks anterior" },
                { col: "#d9710b", label: "KP", sub: "korteks post. shaft" },
                { col: "#9a18c7", label: "CP", sub: "kondil posterior" },
              ].map(({ col, label, sub }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col }} />
                  <span className="text-[9px] font-black" style={{ color: col }}>{label}</span>
                  <span className="text-[9px] text-slate-400">{sub}</span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[8px] text-slate-400">Garis merah = garis referensi PCO. Diagram kiri = kaki kanan; kanan = kaki kiri.</p>
          </div>
          <div className="m-3 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p className="text-[10px] leading-snug text-slate-500">
                PCO opsional. Lewati langsung ke Hasil jika tidak ada X-ray lateral. Klik berurutan: <span className="font-bold text-yellow-500">KA</span> → <span className="font-bold text-orange-500">KP</span> → <span className="font-bold text-violet-500">CP</span>.
              </p>
            </div>
          </div>
        </>
      )}

      {isSky && (
        <>
          {/* Skyline guide */}
          <div className="px-3 pt-3 pb-1 shrink-0" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
            <p className="mb-1.5 text-[9px] font-black tracking-wider text-slate-400 uppercase">Panduan Skyline/Merchant View</p>
            <div className="rounded-xl bg-slate-100 p-2.5">
              <p className="text-[9px] leading-relaxed text-slate-500">
                Foto Merchant (45° fleksi, X-ray dari atas). Patela di tengah, trochlear groove di bawahnya.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { col: "#c084fc", label: "PM", sub: "facet medial patela" },
                  { col: "#a855f7", label: "PL", sub: "facet lateral patela" },
                  { col: "#38bdf8", label: "TM", sub: "kondil medial" },
                  { col: "#0ea5e9", label: "TL", sub: "kondil lateral" },
                  { col: "#f472b6", label: "SG", sub: "sulkus groove" },
                ].map(({ col, label, sub }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col }} />
                    <span className="text-[9px] font-black" style={{ color: col }}>{label}</span>
                    <span className="text-[9px] text-slate-400">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="m-3 shrink-0 rounded-xl border border-purple-200 bg-purple-50 p-3">
            <div className="flex gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
              <p className="text-[10px] leading-snug text-purple-600">
                Skyline opsional. Lewati ke Hasil jika tidak ada foto ini. Klik berurutan: <span className="font-bold">PM → PL → TM → TL → SG</span>.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
  };

  const canvasControls = (uploadRef, handleUpload, points, setPoints, transform, setTransform, imageSrc, imgRef = apImgRef) => (
    <>
      <div className="absolute left-2 top-2 flex gap-1.5 z-10">
        <button onClick={() => uploadRef.current?.click()} className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          <Camera className="h-3 w-3" />
          {imageSrc ? "Ganti" : "Upload"}
        </button>
        {Object.keys(points).length > 0 && (
          <button onClick={() => setPoints({})} className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            <RotateCcw className="h-3 w-3" />
            Reset Titik
          </button>
        )}
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
            onClick={() => { if (imgRef.current) setTransform(fitTransform(imgRef.current, { width: 900, height: 580 })); }}
          >
            Fit
          </button>
        )}
      </div>
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </>
  );

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4"
          style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="flex max-h-[99vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[24px] shadow-2xl"
            style={{ background: "var(--color-surface, #f8fafc)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="shrink-0 px-5 py-4" style={{ borderBottom: "1px solid var(--soft-border, #e2e8f0)" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black tracking-widest text-violet-600 uppercase">Post-TKA Radiographic Assessment</div>
                  <h2 className="mt-0.5 text-lg font-extrabold" style={{ color: "var(--soft-text-hi, #0f172a)" }}>
                    Analisis Alignment Pasca Operasi TKA
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {step === "result" && tkaResult && (
                    <button
                      onClick={handleExport}
                      disabled={exporting}
                      className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black text-white"
                      style={{ background: "#7c3aed" }}
                    >
                      {exporting ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      {exporting ? "Menyimpan..." : "Simpan PDF"}
                    </button>
                  )}
                  <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--soft-border, #e2e8f0)", color: "var(--soft-text-hi, #0f172a)" }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Step dots */}
              <div className="mt-4 flex items-center gap-0">
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
                    className="flex h-full flex-col md:flex-row"
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
                      />
                      {canvasControls(apUploadRef, handleApUpload, apPoints, setApPoints, apTransform, setApTransform, apImageSrc)}
                    </div>
                    {sidebar(AP_LANDMARKS, AP_HINTS, apPoints, apActiveIndex, tkaResult)}
                  </motion.div>
                )}

                {/* ── Lateral View ─────────────────────────────────────── */}
                {step === "lateral" && (
                  <motion.div key="lateral" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="flex h-full flex-col md:flex-row"
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
                      />
                      {canvasControls(latUploadRef, handleLatUpload, latPoints, setLatPoints, latTransform, setLatTransform, latImageSrc, latImgRef)}
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
                    className="flex h-full flex-col md:flex-row"
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
                      />
                      {canvasControls(skyUploadRef, handleSkyUpload, skyPoints, setSkyPoints, skyTransform, setSkyTransform, skyImageSrc, skyImgRef)}
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
                  <motion.div key="result" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="flex h-full overflow-hidden"
                  >
                    {/* Left: X-ray images stacked */}
                    <div className="flex flex-col" style={{ width: "46%", minWidth: 0, borderRight: "1px solid #1e293b" }}>
                      {/* AP image */}
                      <div className="relative flex-1 overflow-hidden bg-slate-900" style={{ borderBottom: "1px solid #1e293b" }}>
                        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-2">
                          <span className="rounded-md bg-black/50 px-2 py-0.5 text-[9px] font-black tracking-widest text-white/70 uppercase backdrop-blur-sm">X-Ray AP View</span>
                          {tkaResult ? (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-black backdrop-blur-sm"
                              style={[tkaResult.mdfaFlag, tkaResult.mptaFlag, tkaResult.combinedFlag].every((f) => f === "normal")
                                ? { background: "rgba(21,128,61,0.75)", color: "#fff" }
                                : { background: "rgba(180,83,9,0.75)", color: "#fff" }}>
                              {[tkaResult.mdfaFlag, tkaResult.mptaFlag, tkaResult.combinedFlag].every((f) => f === "normal") ? "Semua Normal" : "Terdapat Abnormal"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-black text-white/60 backdrop-blur-sm">Belum Dianalisis</span>
                          )}
                        </div>
                        {apImageSrc ? (
                          <LandmarkCanvas
                            imageSrc={apImageSrc}
                            landmarks={apPoints}
                            landmarkDefs={AP_LANDMARKS}
                            hints={AP_HINTS}
                            activeIndex={-1}
                            transform={apResTransform}
                            setTransform={setApResTransform}
                            onPlace={() => {}}
                            onMoveLandmark={handleApMove}
                            connections={AP_CONNECTIONS}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[11px] text-slate-500">Foto AP belum diunggah</div>
                        )}
                      </div>

                      {/* Lateral image */}
                      <div className="relative flex-1 overflow-hidden bg-slate-900" style={{ borderBottom: skyImageSrc ? "1px solid #1e293b" : "none" }}>
                        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-2">
                          <span className="rounded-md bg-black/50 px-2 py-0.5 text-[9px] font-black tracking-widest text-white/70 uppercase backdrop-blur-sm">X-Ray Lateral View</span>
                          {pcoResult ? (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-black backdrop-blur-sm" style={{ background: "rgba(6,182,212,0.75)", color: "#fff" }}>
                              Analisis Lateral
                            </span>
                          ) : (
                            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-black text-white/60 backdrop-blur-sm">Belum Dianalisis</span>
                          )}
                        </div>
                        {latImageSrc ? (
                          <LandmarkCanvas
                            imageSrc={latImageSrc}
                            landmarks={latPoints}
                            landmarkDefs={ALL_LAT_LANDMARKS}
                            hints={[...LAT_HINTS, ...SLOPE_HINTS, ...IS_HINTS]}
                            activeIndex={-1}
                            transform={latResTransform}
                            setTransform={setLatResTransform}
                            onPlace={() => {}}
                            onMoveLandmark={handleLatMove}
                            connections={ALL_LAT_CONNECTIONS}
                            drawOverlay={pcoOverlay}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[11px] text-slate-500">Foto lateral belum diunggah</div>
                        )}
                      </div>

                      {/* Skyline image — only shown if uploaded */}
                      {skyImageSrc && (
                        <div className="relative flex-1 overflow-hidden bg-slate-900">
                          <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-2">
                            <span className="rounded-md bg-black/50 px-2 py-0.5 text-[9px] font-black tracking-widest text-white/70 uppercase backdrop-blur-sm">Skyline/Merchant View</span>
                            {skyResult ? (
                              <span className="rounded-full px-2 py-0.5 text-[9px] font-black backdrop-blur-sm" style={{ background: "rgba(168,85,247,0.75)", color: "#fff" }}>
                                Analisis Patela
                              </span>
                            ) : (
                              <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-black text-white/60 backdrop-blur-sm">Belum Dianalisis</span>
                            )}
                          </div>
                          <LandmarkCanvas
                            imageSrc={skyImageSrc}
                            landmarks={skyPoints}
                            landmarkDefs={SKY_LANDMARKS}
                            hints={SKY_HINTS}
                            activeIndex={-1}
                            transform={skyResTransform}
                            setTransform={setSkyResTransform}
                            onPlace={() => {}}
                            onMoveLandmark={handleSkyMove}
                            connections={SKY_CONNECTIONS}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: measurements panel (scrollable) */}
                    <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
                      {/* Overall banner */}
                      {overallFlag && (
                        <div className="flex items-center gap-3 rounded-2xl p-3"
                          style={overallFlag === "good" ? { background: "#f0fdf4", border: "1px solid #bbf7d0" } : { background: "#fffbeb", border: "1px solid #fde68a" }}>
                          {overallFlag === "good"
                            ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                            : <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />}
                          <div>
                            <p className="text-xs font-black" style={{ color: overallFlag === "good" ? "#15803d" : "#92400e" }}>
                              {overallFlag === "good" ? "Alignment Post-TKA dalam Batas Normal" : "Terdapat Parameter di Luar Batas Normal"}
                            </p>
                            <p className="text-[10px]" style={{ color: overallFlag === "good" ? "#16a34a" : "#b45309" }}>
                              {overallFlag === "good"
                                ? "Semua sudut dalam kisaran akseptabel. Follow-up klinis sesuai protokol."
                                : "Evaluasi lebih lanjut direkomendasikan. Lihat detail di bawah."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ALIGNMENT KORONAL */}
                      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Alignment Koronal (AP)</p>

                      {tkaResult ? (
                        <>
                          {/* MDFA full-width large card */}
                          <div className="rounded-2xl border p-3.5" style={{ background: FLAG_STYLES[tkaResult.mdfaFlag].bg, borderColor: FLAG_STYLES[tkaResult.mdfaFlag].border }}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black tracking-wide text-slate-500 uppercase">MDFA</span>
                              <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: FLAG_STYLES[tkaResult.mdfaFlag].dot + "22", color: FLAG_STYLES[tkaResult.mdfaFlag].dot }}>
                                {tkaResult.mdfaFlag === "normal" ? "Normal" : tkaResult.mdfaFlag === "low" ? "Rendah" : "Tinggi"}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-baseline gap-1">
                              <span className="text-3xl font-black" style={{ color: FLAG_STYLES[tkaResult.mdfaFlag].text }}>{tkaResult.MDFA}</span>
                              <span className="text-sm font-semibold text-slate-400">°</span>
                              <span className="ml-0.5 text-xs text-slate-400">↓</span>
                            </div>
                            <p className="text-[10px] text-slate-400">Kisaran: 85–95°</p>
                            <p className="mt-1.5 text-[10px] leading-snug" style={{ color: FLAG_STYLES[tkaResult.mdfaFlag].text }}>{tkaResult.mdfaText}</p>
                          </div>

                          {/* MPTA + Combined 2-col mini */}
                          <div className="grid grid-cols-2 gap-2">
                            <MiniResultCard label="MPTA" value={tkaResult.MPTA} unit="°" range="85–95°" flag={tkaResult.mptaFlag} />
                            <MiniResultCard label="MDFA + MPTA" value={tkaResult.combined} unit="°" range="175–185°" flag={tkaResult.combinedFlag} />
                          </div>

                          {/* Combined detail card */}
                          <ResultCard label="MDFA + MPTA" value={tkaResult.combined} unit="°" range="175–185°" flag={tkaResult.combinedFlag} text={tkaResult.combinedText} />
                        </>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                          <p className="text-sm text-slate-400">Landmark AP belum lengkap — kembali ke step AP View.</p>
                        </div>
                      )}

                      {/* PCO */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">PCO (Lateral)</p>
                        {!pcoResult && (
                          <span className="flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[9px] font-black text-cyan-600">
                            <Info className="h-3 w-3" /> Menunggu Analisis
                          </span>
                        )}
                      </div>
                      {pcoResult ? (
                        <ResultCard label="PCO Ratio" value={pcoResult.ratio.toFixed(2)} unit="" range="0.40–0.60 (ideal ≥0.47)" flag={pcoResult.pcoFlag} text={pcoResult.pcoText} />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] text-slate-400">X-ray lateral belum dianalisis (opsional).</p>
                        </div>
                      )}

                      {/* TIBIAL SLOPE */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Tibial Slope (Lateral)</p>
                        {!slopeResult && (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black text-emerald-600">
                            <Info className="h-3 w-3" /> Opsional
                          </span>
                        )}
                      </div>
                      {slopeResult ? (
                        <ResultCard
                          label={`Slope Tibial ${slopeResult.isPosterior ? "Posterior" : "Anterior"}`}
                          value={slopeResult.slope + "°"}
                          unit=""
                          range="Posterior 3–7° (normal)"
                          flag={slopeResult.slopeFlag}
                          text={slopeResult.slopeText}
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/40 p-3">
                          <p className="text-[11px] text-slate-400">Tandai TA, TB, PA, PP pada lateral X-ray untuk mengukur tibial slope (3–7° normal).</p>
                        </div>
                      )}

                      {/* INSALL-SALVATI */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Insall-Salvati Ratio (Patela)</p>
                        {!isResult && (
                          <span className="flex items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-0.5 text-[9px] font-black text-fuchsia-600">
                            <Info className="h-3 w-3" /> Opsional
                          </span>
                        )}
                      </div>
                      {isResult ? (
                        <ResultCard
                          label="Insall-Salvati (LP/LT)"
                          value={isResult.ratio.toFixed(2)}
                          unit=""
                          range="0.8–1.2 normal"
                          flag={isResult.isFlag}
                          text={isResult.isText}
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-fuchsia-100 bg-fuchsia-50/40 p-3">
                          <p className="text-[11px] text-slate-400">Tandai PS, PI, TT pada lateral X-ray untuk menilai tinggi patela (normal 0.8–1.2).</p>
                        </div>
                      )}

                      {/* SKYLINE — Patellar Assessment */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Patellar Assessment (Skyline)</p>
                        {!skyResult && (
                          <span className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[9px] font-black text-purple-600">
                            <Info className="h-3 w-3" /> Opsional
                          </span>
                        )}
                      </div>
                      {skyResult ? (
                        <div className="flex flex-col gap-2">
                          {skyResult.patellarTilt !== null && (
                            <ResultCard
                              label="Patellar Tilt"
                              value={skyResult.patellarTilt + "°"}
                              unit=""
                              range="<20° normal"
                              flag={skyResult.tiltFlag}
                              text={skyResult.tiltText}
                            />
                          )}
                          {skyResult.sulcusAngle !== null && (
                            <ResultCard
                              label="Sulkus Angle"
                              value={skyResult.sulcusAngle + "°"}
                              unit=""
                              range="≤144° normal"
                              flag={skyResult.sulcusFlag}
                              text={skyResult.sulcusText}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-purple-100 bg-purple-50/40 p-3">
                          <p className="text-[11px] text-slate-400">Upload foto Skyline/Merchant dan tandai PM, PL, TM, TL, SG untuk menilai patellar tilt dan sulkus angle (opsional).</p>
                        </div>
                      )}

                      {/* IKHTISAR MEDIS */}
                      {medicalInsights.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Ikhtisar Medis</p>
                            <Activity className="h-4 w-4 shrink-0 text-slate-400" />
                          </div>
                          <ul className="flex flex-col gap-1.5">
                            {medicalInsights.map((insight, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[10px] leading-snug text-slate-600">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* REFERENSI */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex gap-2">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Referensi</p>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                              MDFA 85–95° &amp; MPTA 85–95° (Ritter 2011; Parratte 2010). PCO ≥0.47 (Bellemans 2002). Tibial slope 3–7° (Kumar 2014). Insall-Salvati 0.8–1.2 (Rogers 2006). Patellar tilt &lt;20° &amp; Sulkus ≤144° (Merchant 1974).
                            </p>
                          </div>
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
                  onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
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
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
