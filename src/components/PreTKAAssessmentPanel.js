"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Download,
  FileText,
  RotateCcw,
  Scissors,
  Sliders,
  Spline,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { computeTKAAlignment, computeTibialSlope } from "@/lib/hka/tkaCalculator";

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS      = ["deformity", "planning", "result"];
const STEP_LABELS = ["Deformitas AP", "Rencana Potongan", "Hasil"];
const STEP_ICONS  = [Activity, Scissors, FileText];

// ── Landmarks ─────────────────────────────────────────────────────────────────

const AP_LANDMARKS = [
  { key: "femHead",        label: "Pusat Caput Femur",       short: "CFH", color: "#f59e0b", hint: "Klik pusat kepala femur (caput femur) sebagai titik awal sumbu mekanik femoral." },
  { key: "kneeCenter",     label: "Pusat Sendi Lutut",        short: "CK",  color: "#818cf8", hint: "Klik pusat sendi lutut sebagai titik pivot sumbu mekanik." },
  { key: "ankleCenter",    label: "Pusat Pergelangan Kaki",   short: "CA",  color: "#34d399", hint: "Klik pusat pergelangan kaki (talus) untuk sumbu mekanik tibial." },
  { key: "condyleMedial",  label: "Kondil Medial Femoral",    short: "FCM", color: "#38bdf8", hint: "Klik titik paling inferior kondil medial femoral." },
  { key: "condyleLateral", label: "Kondil Lateral Femoral",   short: "FCL", color: "#0ea5e9", hint: "Klik titik paling inferior kondil lateral femoral." },
  { key: "plateauMedial",  label: "Plateau Tibial Medial",    short: "TPM", color: "#2dd4bf", hint: "Klik titik paling superior plateau tibial sisi medial." },
  { key: "plateauLateral", label: "Plateau Tibial Lateral",   short: "TPL", color: "#06b6d4", hint: "Klik titik paling superior plateau tibial sisi lateral." },
];

const AP_CONNECTIONS = [
  { from: "femHead",        to: "kneeCenter",      color: "#f59e0b88", dash: [7, 4] },
  { from: "kneeCenter",     to: "ankleCenter",     color: "#34d39988", dash: [7, 4] },
  { from: "condyleMedial",  to: "condyleLateral",  color: "#38bdf888", dash: [4, 3] },
  { from: "plateauMedial",  to: "plateauLateral",  color: "#2dd4bf88", dash: [4, 3] },
];

// ── Lateral landmarks (posterior tibial slope) ────────────────────────────────

const LAT_LANDMARKS = [
  { key: "tibShaftTop",      label: "Poros Tibia Atas",    short: "TSA", color: "#f97316", hint: "Klik titik tengah diafisis tibia bagian proksimal (atas) pada foto lateral." },
  { key: "tibShaftBot",      label: "Poros Tibia Bawah",   short: "TSB", color: "#fb923c", hint: "Klik titik tengah diafisis tibia bagian distal (bawah) pada foto lateral." },
  { key: "slopePlateauAnt",  label: "Plateau Anterior",    short: "PTA", color: "#22d3ee", hint: "Klik tepi anterior plateau tibial lateral (paling depan/atas pada foto lateral)." },
  { key: "slopePlateauPost", label: "Plateau Posterior",   short: "PTP", color: "#0ea5e9", hint: "Klik tepi posterior plateau tibial lateral (paling belakang/bawah pada foto lateral)." },
];

const LAT_CONNECTIONS = [
  { from: "tibShaftTop",     to: "tibShaftBot",      color: "#f9731688", dash: [7, 4] },
  { from: "slopePlateauAnt", to: "slopePlateauPost", color: "#22d3ee88", dash: [4, 3] },
];

// ── Colour palettes ───────────────────────────────────────────────────────────

const FLAG = {
  normal: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#16a34a", label: "Normal"    },
  watch:  { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#d97706", label: "Monitor"   },
  low:    { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#ea580c", label: "Perhatian" },
  high:   { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", dot: "#dc2626", label: "Koreksi"   },
};
const FLAG_DARK = {
  normal: { bg: "rgba(16,185,129,0.12)",  border: "rgba(52,211,153,0.22)",  text: "#34d399", dot: "#34d399", label: "Normal"    },
  watch:  { bg: "rgba(217,119,6,0.14)",   border: "rgba(251,191,36,0.22)",  text: "#fbbf24", dot: "#fbbf24", label: "Monitor"   },
  low:    { bg: "rgba(234,88,12,0.12)",   border: "rgba(251,146,60,0.22)",  text: "#fb923c", dot: "#fb923c", label: "Perhatian" },
  high:   { bg: "rgba(220,38,38,0.12)",   border: "rgba(252,165,165,0.22)", text: "#f87171", dot: "#f87171", label: "Koreksi"   },
};

const glassCard = {
  background: "rgba(15,23,42,0.65)",
  border: "1px solid rgba(255,255,255,0.10)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  padding: "12px",
};

// ── Math helpers ──────────────────────────────────────────────────────────────

function degToRad(d) { return (d * Math.PI) / 180; }

function arcPath(cx, cy, r, aDeg, bDeg) {
  const a = degToRad(aDeg), b = degToRad(bDeg);
  const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
  const x2 = cx + r * Math.cos(b), y2 = cy + r * Math.sin(b);
  const large = Math.abs(bDeg - aDeg) > 180 ? 1 : 0;
  const sweep = bDeg > aDeg ? 1 : 0;
  return `M${x1},${y1}A${r},${r},0,${large},${sweep},${x2},${y2}`;
}

function imgToScreen(pt, t) { return { x: pt.x * t.scale + t.offsetX, y: pt.y * t.scale + t.offsetY }; }
function screenToImg(pt, t) { return { x: (pt.x - t.offsetX) / t.scale, y: (pt.y - t.offsetY) / t.scale }; }
function fitTransform(img, canvas) {
  if (!img || !canvas) return { scale: 1, offsetX: 0, offsetY: 0 };
  const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  return {
    scale,
    offsetX: (canvas.width - img.naturalWidth * scale) / 2,
    offsetY: (canvas.height - img.naturalHeight * scale) / 2,
  };
}

function computeHKA(femHead, kneeCenter, ankleCenter, side = "Right") {
  if (!femHead || !kneeCenter || !ankleCenter) return null;
  const vFemUp   = { x: femHead.x - kneeCenter.x,    y: femHead.y - kneeCenter.y    };
  const vTibDown = { x: ankleCenter.x - kneeCenter.x, y: ankleCenter.y - kneeCenter.y };
  const lenF = Math.hypot(vFemUp.x, vFemUp.y);
  const lenT = Math.hypot(vTibDown.x, vTibDown.y);
  if (!lenF || !lenT) return null;
  const uF = { x: vFemUp.x / lenF,   y: vFemUp.y / lenF   };
  const uT = { x: vTibDown.x / lenT, y: vTibDown.y / lenT };
  const cosA  = Math.max(-1, Math.min(1, uF.x * uT.x + uF.y * uT.y));
  const angle = Math.acos(cosA) * 180 / Math.PI;
  const cross = uF.x * uT.y - uF.y * uT.x;
  // Radiological convention: right leg on LEFT of image, so cross > 0 → knee shifted left → VARUS for right leg.
  // Invert vs. anatomical convention so positive deviation = valgus, negative = varus (matches measurementUtils.js).
  const lateralitySign = side === "Left" ? 1 : -1;
  const dirSign = cross >= 0 ? 1 : -1;
  const deviation = Math.round(lateralitySign * dirSign * (180 - angle) * 10) / 10;
  const absD = Math.abs(deviation);
  // Thresholds based on Tanzer 2016 Figure 7 algorithm:
  // <3° = neutral (CR/PS TKA standard), 3–10° = mild-moderate (PS/CR + releases),
  // >10° = severe complex TKA (consider constrained implant)
  const deformityType = absD < 3 ? "Netral" : deviation > 0 ? "Valgus" : "Varus";
  const hkaFlag  = absD < 3 ? "normal" : absD < 10 ? "watch" : "high";
  const severity = absD < 3 ? "Normal" : absD < 10 ? "Ringan-Sedang" : "Berat";
  return { hka: Math.round(angle * 10) / 10, deviation, deformityType, hkaFlag, severity, cross };
}

// Implant recommendation — Tanzer & Makhdom 2016, Figure 7 algorithm
function getImplantRec(hka) {
  if (!hka) return null;
  const abs = Math.abs(hka.deviation);
  const isVarus  = hka.deformityType === "Varus";
  const isValgus = hka.deformityType === "Valgus";
  if (abs < 3) return {
    type: "CR atau PS TKA",
    color: "#22d3ee",
    detail: "Alignment netral. Potongan standar tegak lurus mechanical axis. CR atau PS TKA sesuai.",
  };
  if (isVarus && abs < 10) return {
    type: "PS atau CR TKA",
    color: "#60a5fa",
    detail: "Varus ringan-sedang. Soft-tissue release stepwise (medial). Siapkan VVC TKA jika tidak stabil dalam flexion-extension.",
  };
  if (isVarus && abs >= 10) return {
    type: "PS / CR TKA + pertimbangkan VVC",
    color: "#f59e0b",
    detail: "Varus berat. Lakukan PS atau CR TKA dengan stepwise release. Siapkan VVC TKA. Pertimbangkan corrective osteotomy jika deformitas extra-artikular.",
  };
  if (isValgus && abs < 10) return {
    type: "PS TKA (CR dapat diterima)",
    color: "#60a5fa",
    detail: "Valgus ringan-sedang. Evaluasi integritas MCL. Jika MCL intak: PS TKA, CR dapat diterima. Lateral soft-tissue release.",
  };
  return {
    type: "PS TKA / VVC TKA",
    color: "#f87171",
    detail: "Valgus berat. Jika MCL kompromis: VVC TKA. Pertimbangkan lateral epicondylar osteotomy. Siapkan RH TKA jika tidak stabil.",
  };
}

function screenDistanceToSegment(p, a, b) {
  if (!a || !b) return Infinity;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// ── Canvas draw helpers ───────────────────────────────────────────────────────

function drawCircle(ctx, x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = "#111827"; ctx.lineWidth = 2; ctx.stroke();
}

function drawLabel(ctx, text, x, y, color) {
  ctx.font = "bold 12px sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.78)"; ctx.lineWidth = 3;
  ctx.strokeText(text, x + 10, y - 8);
  ctx.fillStyle = color; ctx.fillText(text, x + 10, y - 8);
}

function drawLine(ctx, a, b, color, dash = []) {
  if (!a || !b) return;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 1.7;
  ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.restore();
}

// ── SVG animation primitives (from tkaPlanner.tsx — TS types removed) ─────────

function AnimLine({ x1, y1, x2, y2, stroke, sw = 2.2, dash, opacity = 1, delay = 0 }) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  return (
    <motion.line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={stroke} strokeWidth={sw}
      strokeDasharray={dash ?? `${len}`}
      strokeDashoffset={len}
      opacity={opacity}
      animate={{ strokeDashoffset: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    />
  );
}

function AnimArc({ cx, cy, r, startDeg, endDeg, stroke, sw = 1.8, delay = 0.2 }) {
  const d = arcPath(cx, cy, r, startDeg, endDeg);
  const arcLen = r * Math.abs(endDeg - startDeg) * Math.PI / 180;
  return (
    <motion.path
      d={d} fill="none" stroke={stroke} strokeWidth={sw}
      strokeDasharray={`${arcLen}`} strokeDashoffset={arcLen}
      animate={{ strokeDashoffset: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
    />
  );
}

// ── Schematic SVG panels (adapted from tkaPlanner.tsx) ────────────────────────

function FemurPanel({ angleDeg, side }) {
  const color = side === "Right" ? "#38bdf8" : "#f97316";
  const W = 420, H = 240;
  const cx = W / 2, yCut = H * 0.6;
  const x1 = 50, x2 = W - 50;
  const sign = side === "Right" ? 1 : -1;
  const tan = Math.tan(degToRad(angleDeg * sign));
  const cutY1 = yCut - tan * (x1 - cx);
  const cutY2 = yCut - tan * (x2 - cx);
  const arcEnd = angleDeg * sign;

  return (
    <motion.div
      key={`fem-${side}-${angleDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={glassCard}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>Femoral Resection Angle · {side}</p>
          <p className="text-xs font-black text-slate-200">Valgus {angleDeg}° · Koronal (Mek. Axis)</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: color }}>{angleDeg}°</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
        <motion.rect x={cx - 22} y={12} width={44} height={yCut - 12} rx={10} fill={color} opacity={0.14}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
        <motion.ellipse cx={cx} cy={yCut + 16} rx={40} ry={20} fill={color} opacity={0.10}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3, delay: 0.1 }} />
        <AnimLine x1={cx} y1={10} x2={cx} y2={H - 14} stroke={color} sw={1.8} opacity={0.45} />
        <text x={cx} y={8} textAnchor="middle" fontSize={9} fill={color} opacity={0.65} fontWeight={700}>Mechanical Axis</text>
        <text x={x1} y={H * 0.22} textAnchor="start" fontSize={9} fill={color} opacity={0.6} fontWeight={600}>Medial</text>
        <text x={x2} y={H * 0.22} textAnchor="end"   fontSize={9} fill={color} opacity={0.6} fontWeight={600}>Lateral</text>
        <AnimLine x1={x1} y1={yCut} x2={x2} y2={yCut} stroke={color} sw={1.3} dash="8 5" opacity={0.45} delay={0.1} />
        {angleDeg !== 0 && (
          <AnimArc cx={cx} cy={yCut} r={30}
            startDeg={arcEnd >= 0 ? 0 : arcEnd} endDeg={arcEnd >= 0 ? arcEnd : 0}
            stroke={color} sw={1.6} delay={0.3} />
        )}
        <text x={cx + 36} y={yCut - 4} fontSize={11} fill={color} fontWeight={800}>{angleDeg}°</text>
        <AnimLine x1={x1} y1={cutY1} x2={x2} y2={cutY2} stroke={color} sw={3} delay={0.15} />
      </svg>
    </motion.div>
  );
}

function TibialSlopePanel({ slopeDeg, side }) {
  const color = side === "Right" ? "#14b8a6" : "#f43f5e";
  const W = 420, H = 240;
  const cx = W / 2, yCut = H * 0.46;
  const x1 = 50, x2 = W - 50;
  const tan = Math.tan(degToRad(slopeDeg));
  const cutY1 = yCut + tan * (x1 - cx);
  const cutY2 = yCut + tan * (x2 - cx);

  return (
    <motion.div
      key={`tib-${side}-${slopeDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
      style={glassCard}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>Tibial Slope · Posterior</p>
          <p className="text-xs font-black text-slate-200">Slope {slopeDeg}° · Sagittal</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: color }}>{slopeDeg}°</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
        <motion.rect x={cx - 20} y={yCut + 16} width={40} height={H - yCut - 36} rx={8} fill={color} opacity={0.14}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4 }} />
        <motion.ellipse cx={cx} cy={yCut} rx={48} ry={13} fill={color} opacity={0.10}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }} />
        <AnimLine x1={cx} y1={10} x2={cx} y2={H - 14} stroke={color} sw={1.6} opacity={0.38} />
        <text x={cx} y={8} textAnchor="middle" fontSize={9} fill={color} opacity={0.65} fontWeight={700}>Tibial Axis</text>
        <text x={x1} y={H * 0.22} textAnchor="start" fontSize={9} fill={color} opacity={0.6} fontWeight={600}>Anterior</text>
        <text x={x2} y={H * 0.22} textAnchor="end"   fontSize={9} fill={color} opacity={0.6} fontWeight={600}>Posterior</text>
        <AnimLine x1={x1} y1={yCut} x2={x2} y2={yCut} stroke={color} sw={1.3} dash="8 5" opacity={0.42} delay={0.1} />
        {slopeDeg !== 0 && (
          <AnimArc cx={cx} cy={yCut} r={28} startDeg={0} endDeg={slopeDeg} stroke={color} sw={1.6} delay={0.3} />
        )}
        <text x={cx + 34} y={yCut + 14} fontSize={11} fill={color} fontWeight={800}>{slopeDeg}°</text>
        <AnimLine x1={x1} y1={cutY1} x2={x2} y2={cutY2} stroke={color} sw={3} delay={0.15} />
      </svg>
    </motion.div>
  );
}

function TibialCutPanel({ angleDeg, direction }) {
  const color = direction === "Valgus" ? "#eab308" : "#a855f7";
  const W = 420, H = 220;
  const cx = W / 2, yCut = H * 0.5;
  const x1 = 50, x2 = W - 50;
  const sign = direction === "Valgus" ? 1 : -1;
  const tan = Math.tan(degToRad(angleDeg * sign));
  const cutY1 = yCut - tan * (x1 - cx);
  const cutY2 = yCut - tan * (x2 - cx);
  const arcEnd = angleDeg * sign;

  return (
    <motion.div
      key={`tibcut-${direction}-${angleDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
      style={glassCard}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>Tibial Cut · {direction}</p>
          <p className="text-xs font-black text-slate-200">{direction} {angleDeg}° · Koronal</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: color }}>{angleDeg}°</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
        <motion.rect x={cx - 26} y={yCut + 12} width={52} height={H - yCut - 28} rx={8} fill={color} opacity={0.11}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3 }} />
        <AnimLine x1={cx} y1={10} x2={cx} y2={H - 10} stroke={color} sw={1.5} opacity={0.38} />
        <text x={x1} y={H * 0.2} textAnchor="start" fontSize={9} fill={color} opacity={0.6} fontWeight={600}>Medial</text>
        <text x={x2} y={H * 0.2} textAnchor="end"   fontSize={9} fill={color} opacity={0.6} fontWeight={600}>Lateral</text>
        <AnimLine x1={x1} y1={yCut} x2={x2} y2={yCut} stroke={color} sw={1.2} dash="7 5" opacity={0.42} delay={0.1} />
        {angleDeg !== 0 && (
          <AnimArc cx={cx} cy={yCut} r={28}
            startDeg={arcEnd >= 0 ? 0 : arcEnd} endDeg={arcEnd >= 0 ? arcEnd : 0}
            stroke={color} sw={1.6} delay={0.3} />
        )}
        <text x={cx + 34} y={yCut - 4} fontSize={11} fill={color} fontWeight={800}>{angleDeg}°</text>
        <AnimLine x1={x1} y1={cutY1} x2={x2} y2={cutY2} stroke={color} sw={3} delay={0.15} />
      </svg>
    </motion.div>
  );
}

// ── Anatomical Bone Cutting SVGs ──────────────────────────────────────────────

function BoneCuttingLateralSVG({ slopeDeg, tibResectionMm, side = "Right" }) {
  const W = 340, H = 460;
  const cutCol = "#a78bfa";
  const refCol = "#475569";

  const isRight = side === "Right";
  // kanan: 484.04×1070.67 — kiri: 498.48×1065.92
  const svgNW = isRight ? 484.04 : 498.48;
  const svgNH = isRight ? 1070.67 : 1065.92;
  const sc_lat = W / svgNW;
  const imgH_lat = Math.round(svgNH * sc_lat);
  // Center path8 (joint cut reference) at screen y=210
  // kanan: path8 y≈622.73 → yOff = 210 - 622.73×sc = -227
  // kiri:  path8 y≈620.3  → yOff = 210 - 620.3×sc  = -213
  const yOff_lat = isRight ? -227 : -213;

  // Cut line endpoints derived from path8 (purple) in each SVG
  // kanan: path8 x from 98.90 to 406.73 → screen x=70 to 286 → pCX=178, hw=108
  // kiri:  path8 x from 98.68 to 406.33 → screen x=67 to 277 → pCX=172, hw=105
  const pCX = isRight ? 178 : 172;
  const hw  = isRight ? 108 : 105;
  const x1 = pCX - hw, x2 = pCX + hw;
  const baseY = 210;

  // ~2.1 screen px per mm (estimated from tibial shaft length in new SVG)
  const pxPerMm = 2.1;
  const resY = baseY - tibResectionMm * pxPerMm;

  // PSA direction:
  // Right: anterior=LEFT(x1) higher, posterior=RIGHT(x2) lower  → slopeDir=+1
  // Left:  anterior=RIGHT(x2) higher, posterior=LEFT(x1) lower  → slopeDir=-1
  const slopeDir = isRight ? 1 : -1;
  const tan = Math.tan(degToRad(slopeDeg));
  const cy1 = baseY - slopeDir * tan * hw;  // left end
  const cy2 = baseY + slopeDir * tan * hw;  // right end

  // Arc at posterior end: right→x2 (180°→180°+slope), left→x1 (0°→slope)
  const arcX    = isRight ? x2 : x1;
  const arcStart = isRight ? 180 : 0;
  const arcEnd   = isRight ? 180 + slopeDeg : slopeDeg;

  return (
    <motion.div key={`lat-${slopeDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={glassCard}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-purple-300">Lateral · PSA</p>
          <p className="text-xs font-black text-slate-200">Posterior Tibial Slope {slopeDeg}°</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white" style={{ background: cutCol }}>{slopeDeg}°</span>
          {slopeDeg === 0 && (
            <span className="rounded-xl border px-2 py-1 text-[9px] font-black"
              style={{ background: "#f59e0b18", color: "#fbbf24", borderColor: "#f59e0b44" }}>Valgus</span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 280 }}>
        <image
          href={isRight ? "/tka/lateral-view-kanan.svg" : "/tka/lateral-view-kiri.svg"}
          x={0} y={yOff_lat} width={W} height={imgH_lat}
          preserveAspectRatio="none"
        />

        {/* ── Resection depth: unaffected plateau ref → cut ── */}
        {tibResectionMm > 0 && (
          <>
            <line x1={x1+4} y1={resY} x2={x2-4} y2={resY}
              stroke={cutCol} strokeWidth={1} strokeDasharray="4 3" opacity={0.45} />
            <line x1={x1-8} y1={resY} x2={x1-8} y2={baseY}
              stroke={cutCol} strokeWidth={1.2} opacity={0.5} />
            <text x={x1-11} y={(resY+baseY)/2+4} fontSize={9} fontWeight={800} fill={cutCol} textAnchor="end">{tibResectionMm}mm</text>
          </>
        )}

        {/* ── 0° reference line ── */}
        <line x1={x1-14} y1={baseY} x2={x2+14} y2={baseY}
          stroke={refCol} strokeWidth={1.1} strokeDasharray="6 4" opacity={0.48} />
        <text x={x2+16} y={baseY+4} fontSize={9} fill={refCol} opacity={0.65} fontWeight={700}>0°</text>

        {/* ── Cut line ── */}
        <line x1={x1} y1={cy1} x2={x2} y2={cy2}
          stroke={cutCol} strokeWidth={3} strokeLinecap="round" />
        <circle cx={x1} cy={cy1} r={4} fill={cutCol} />
        <circle cx={x2} cy={cy2} r={4} fill={cutCol} />

        {/* ── PSA arc at posterior end ── */}
        {slopeDeg > 0 && (
          <path d={arcPath(arcX, baseY, 26, arcStart, arcEnd)}
            fill="none" stroke={cutCol} strokeWidth={1.6} />
        )}

        {/* ── Angle badge (above cut center) ── */}
        <rect x={pCX-24} y={baseY-30} width={48} height={18} rx={6}
          fill={`${cutCol}22`} stroke={cutCol} strokeWidth={1} />
        <text x={pCX} y={baseY-17} fontSize={11} fontWeight={800} fill={cutCol} textAnchor="middle">
          {slopeDeg}°
        </text>

        {/* ── Ant/Post labels ── */}
        <text x={x1-6} y={cy1-6} fontSize={8} fill={cutCol} textAnchor="end"   fontWeight={700}>{isRight ? "Ant" : "Post"}</text>
        <text x={x2+6} y={cy2-6} fontSize={8} fill={cutCol} textAnchor="start" fontWeight={700}>{isRight ? "Post" : "Ant"}</text>
      </svg>
    </motion.div>
  );
}

function BoneCuttingAPSVG({ valgusDeg, tibResectionMm, hka, side = "Right" }) {
  const W = 340, H = 390;
  const femCol = "#38bdf8";
  const tibCol = "#14b8a6";
  const refCol = "#475569";

  // SVG native: 156.49 × 330.66. Crop y=70–285 to focus on joint area, scale=390/215.
  const sc = 390 / 215;
  const imgW = Math.round(156.49 * sc);  // 284
  const imgH = Math.round(330.66 * sc);  // 600
  const xOff = (W - imgW) / 2;           // 28
  const yOff = -70 * sc;                 // −127

  // Cut positions derived from path8 (femoral, SVG y=179) and path9 (tibial, SVG y=214)
  const femCY = Math.round(yOff + 179 * sc);       // 198
  const femX1 = Math.round(xOff + 4.7 * sc);       // 37
  const femX2 = Math.round(xOff + 146 * sc);       // 293
  const femCX = Math.round((femX1 + femX2) / 2);   // 165
  const femHW = Math.round((femX2 - femX1) / 2);   // 128
  const tibCutY = Math.round(yOff + 214 * sc);      // 261
  const tibX1 = Math.round(xOff + 7.4 * sc);       // 41
  const tibX2 = Math.round(xOff + 148.7 * sc);     // 298

  const femTan = Math.tan(degToRad(valgusDeg));
  // Right knee: medial=left(femX1)=lower, lateral=right(femX2)=higher
  // Left knee: lateral=left(femX1)=higher, medial=right(femX2)=lower
  const dir = side === "Right" ? 1 : -1;
  const femY1 = femCY + dir * femTan * femHW;
  const femY2 = femCY - dir * femTan * femHW;
  const arcAnchorX = side === "Right" ? femX2 : femX1;
  const arcAnchorY = side === "Right" ? femY2 : femY1;

  return (
    <motion.div key={`ap-${valgusDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}
      style={glassCard}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-sky-300">AP View · Femoral + Tibial Cut</p>
          <p className="text-xs font-black text-slate-200">Valgus {valgusDeg}° · Tibial {tibResectionMm}mm</p>
        </div>
        <div className="flex gap-1">
          <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white" style={{ background: femCol }}>{valgusDeg}°</span>
          <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white" style={{ background: tibCol }}>{tibResectionMm}mm</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 280 }}>
        <image
          href={side === "Right" ? "/tka/ap-view-kanan.svg" : "/tka/ap-view-kiri.svg"}
          x={xOff} y={yOff} width={imgW} height={imgH}
          preserveAspectRatio="none"
        />

        {/* ── Femoral cut ── */}
        <line x1={femX1 - 8} y1={femCY} x2={femX2 + 8} y2={femCY}
          stroke={refCol} strokeWidth={1} strokeDasharray="5 3" opacity={0.35} />
        <line x1={femX1} y1={femY1} x2={femX2} y2={femY2}
          stroke={femCol} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={femX1} cy={femY1} r={3.5} fill={femCol} />
        <circle cx={femX2} cy={femY2} r={3.5} fill={femCol} />

        {valgusDeg > 0 && (
          <path
            d={arcPath(arcAnchorX, femCY, 22,
                side === "Right" ? 180 - valgusDeg : 0,
                side === "Right" ? 180 : valgusDeg)}
            fill="none" stroke={femCol} strokeWidth={1.5}
          />
        )}

        <rect x={femCX - 28} y={femCY - 28} width={56} height={18} rx={6}
          fill={`${femCol}22`} stroke={femCol} strokeWidth={1} />
        <text x={femCX} y={femCY - 15} fontSize={10} fontWeight={800} fill={femCol} textAnchor="middle">
          {valgusDeg}° valgus
        </text>

        <text x={femX1 + 12} y={H - 8} fontSize={8} fill={refCol} textAnchor="middle" fontWeight={700}>
          {side === "Right" ? "Medial" : "Lateral"}
        </text>
        <text x={femX2 - 12} y={H - 8} fontSize={8} fill={refCol} textAnchor="middle" fontWeight={700}>
          {side === "Right" ? "Lateral" : "Medial"}
        </text>

        {/* ── Tibial cut ── */}
        {/* Unaffected plateau reference: stylus sits here, resection measured downward to cut */}
        {(() => {
          const tibPlateauY = tibCutY - tibResectionMm * sc;
          return (
            <>
              {/* Plateau reference (amber dashed — unaffected side stylus point) */}
              <line x1={tibX1 - 8} y1={tibPlateauY} x2={tibX2 + 8} y2={tibPlateauY}
                stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 3" opacity={0.85} />
              <text x={tibX1 - 10} y={tibPlateauY + 4} fontSize={7} fill="#fbbf24"
                fontWeight={700} textAnchor="end">Plateau ref</text>

              {/* Resection depth bar: plateau → cut */}
              <rect x={tibX2 + 6} y={tibPlateauY} width={5} height={tibResectionMm * sc}
                fill={tibCol} opacity={0.40} rx={2} />
              <line x1={tibX2 + 2} y1={tibPlateauY} x2={tibX2 + 18} y2={tibPlateauY}
                stroke={tibCol} strokeWidth={1} />
              <line x1={tibX2 + 2} y1={tibCutY} x2={tibX2 + 18} y2={tibCutY}
                stroke={tibCol} strokeWidth={1} />
              <text x={tibX2 + 22} y={(tibPlateauY + tibCutY) / 2 + 4}
                fontSize={10} fontWeight={800} fill={tibCol}>{tibResectionMm}mm</text>
            </>
          );
        })()}

        {/* Tibial cut line */}
        <line x1={tibX1} y1={tibCutY} x2={tibX2} y2={tibCutY}
          stroke={tibCol} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={tibX1} cy={tibCutY} r={3.5} fill={tibCol} />
        <circle cx={tibX2} cy={tibCutY} r={3.5} fill={tibCol} />

        {hka && (
          <>
            <text x={W / 2} y={H - 30} textAnchor="middle" fontSize={9} fill="#818cf8" fontWeight={800}>
              HKA {Math.abs(hka.deviation)}° {hka.deformityType}
            </text>
            <line x1={W / 2 - 28} y1={H - 26} x2={W / 2 + 28} y2={H - 26}
              stroke="#818cf8" strokeWidth={0.8} opacity={0.4} />
          </>
        )}
      </svg>
    </motion.div>
  );
}

// ── GapsBalancingPanel ────────────────────────────────────────────────────────

function GapsBalancingPanel({ tibResectionMm, implantType }) {
  const FEM_DISTAL = 9;   // standard femoral distal cut = component thickness (mm)
  const TIB_BASE   = 4;   // tibial metal baseplate (mm)

  // Extension bony gap = space between tibial and femoral cut surfaces in extension
  const bonyExtGap = tibResectionMm + FEM_DISTAL;
  // PE thickness to fill gap: bonyGap = femComp + tibBase + PE
  const peMm       = bonyExtGap - FEM_DISTAL - TIB_BASE;  // = tibResectionMm - 4
  // Flexion gap ≈ extension gap (simplified balanced model)
  const bonyFlxGap = bonyExtGap;
  const peMinTarget = implantType === "PS" ? 10 : 8;

  const peStatus =
    peMm < 6           ? { label: "Terlalu Tipis",    color: "#f87171" } :
    peMm < peMinTarget ? { label: "Di bawah target",  color: "#fb923c" } :
    peMm <= 14         ? { label: "Optimal",           color: "#34d399" } :
                         { label: "Terlalu Tebal",     color: "#fbbf24" };

  // Cross-section diagram constants
  const sc5 = 5;   // px per mm for diagram
  const bw = 52, dcx = 76;
  const boneH = 8;
  const femPx = FEM_DISTAL * sc5;
  const pePx  = Math.max(peMm * sc5, 8);
  const tibPx = TIB_BASE * sc5;
  const DW = 152;
  const DH = boneH + femPx + pePx + tibPx + boneH;

  let dy = boneH;
  const femY = dy;  dy += femPx;
  const peY  = dy;  dy += pePx;
  const tibY = dy;  dy += tibPx;
  const boneBotY = dy;

  return (
    <motion.div
      key="gaps"
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      style={{ ...glassCard, gridColumn: "span 2" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-widest text-purple-300">
          Gaps Balancing · Extension Gap
        </p>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-lg"
          style={{ background: peStatus.color + "20", color: peStatus.color }}>
          PE {peMm}mm — {peStatus.label}
        </span>
      </div>

      <div className="flex gap-4 items-start">
        {/* Cross-section diagram */}
        <svg viewBox={`0 0 ${DW} ${DH}`} width={DW} height={DH} style={{ flexShrink: 0 }}>
          {/* Femur cortical */}
          <rect x={dcx - bw/2} y={0} width={bw} height={boneH} rx={2}
            fill="#a07860" opacity={0.45} />
          <text x={dcx} y={boneH - 1} textAnchor="middle" fontSize={6} fill="#a07860">Femur</text>

          {/* Femoral distal component */}
          <rect x={dcx - bw/2} y={femY} width={bw} height={femPx} rx={2}
            fill="#38bdf8" opacity={0.8} />
          <text x={dcx} y={femY + femPx/2 + 3} textAnchor="middle"
            fontSize={8} fontWeight={800} fill="#fff">{FEM_DISTAL}mm Femoral</text>

          {/* PE insert */}
          <rect x={dcx - bw/2} y={peY} width={bw} height={pePx} rx={2}
            fill={peStatus.color} opacity={0.85} />
          <text x={dcx} y={peY + pePx/2 + 3} textAnchor="middle"
            fontSize={8} fontWeight={800} fill="#fff">{peMm}mm PE</text>

          {/* Tibial baseplate */}
          <rect x={dcx - bw/2} y={tibY} width={bw} height={tibPx} rx={2}
            fill="#818cf8" opacity={0.85} />
          <text x={dcx} y={tibY + tibPx/2 + 3} textAnchor="middle"
            fontSize={7} fontWeight={800} fill="#fff">{TIB_BASE}mm Base</text>

          {/* Tibia cortical */}
          <rect x={dcx - bw/2} y={boneBotY} width={bw} height={boneH} rx={2}
            fill="#a07860" opacity={0.45} />
          <text x={dcx} y={boneBotY + boneH - 1} textAnchor="middle" fontSize={6} fill="#a07860">Tibia</text>

          {/* Right bracket: extension gap */}
          <line x1={dcx + bw/2 + 4} y1={femY} x2={dcx + bw/2 + 10} y2={femY}
            stroke="#64748b" strokeWidth={0.8} />
          <line x1={dcx + bw/2 + 4} y1={boneBotY} x2={dcx + bw/2 + 10} y2={boneBotY}
            stroke="#64748b" strokeWidth={0.8} />
          <line x1={dcx + bw/2 + 7} y1={femY} x2={dcx + bw/2 + 7} y2={boneBotY}
            stroke="#64748b" strokeWidth={0.8} />
          <text x={dcx + bw/2 + 12} y={(femY + boneBotY)/2 + 4}
            fontSize={8} fontWeight={800} fill="#94a3b8">{bonyExtGap}mm</text>

          {/* Left bracket: tibial resection */}
          <line x1={dcx - bw/2 - 4} y1={peY} x2={dcx - bw/2 - 10} y2={peY}
            stroke="#a78bfa" strokeWidth={0.8} />
          <line x1={dcx - bw/2 - 4} y1={boneBotY} x2={dcx - bw/2 - 10} y2={boneBotY}
            stroke="#a78bfa" strokeWidth={0.8} />
          <line x1={dcx - bw/2 - 7} y1={peY} x2={dcx - bw/2 - 7} y2={boneBotY}
            stroke="#a78bfa" strokeWidth={0.8} />
          <text x={dcx - bw/2 - 12} y={(peY + boneBotY)/2 + 4}
            fontSize={8} fontWeight={800} fill="#a78bfa" textAnchor="end">{tibResectionMm}mm</text>
        </svg>

        {/* Metrics breakdown */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Gap calculation */}
          <div className="rounded-lg p-2 space-y-1.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Extension Gap</p>
            {[
              ["Tibial Resection (unaffected)", `${tibResectionMm} mm`, "#a78bfa"],
              ["Femoral Distal Cut (standard)", `${FEM_DISTAL} mm`,     "#38bdf8"],
              ["Total Bony Gap",                `${bonyExtGap} mm`,     "#e2e8f0"],
            ].map(([lbl, val, col]) => (
              <div key={lbl} className="flex items-center justify-between">
                <span className="text-[9px] truncate" style={{ color: "#64748b" }}>{lbl}</span>
                <span className="text-[10px] font-black ml-2 shrink-0" style={{ color: col }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Component fill */}
          <div className="rounded-lg p-2 space-y-1.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Komponen Pengisi</p>
            {[
              ["Femoral Distal Comp",  `${FEM_DISTAL} mm`, "#38bdf8"],
              ["Tibial Baseplate",     `${TIB_BASE} mm`,   "#818cf8"],
              ["PE Insert (kalkulasi)", `${peMm} mm`,       peStatus.color],
            ].map(([lbl, val, col]) => (
              <div key={lbl} className="flex items-center justify-between">
                <span className="text-[9px] truncate" style={{ color: "#64748b" }}>{lbl}</span>
                <span className="text-[10px] font-black ml-2 shrink-0" style={{ color: col }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Flexion gap comparison */}
          <div className="flex gap-2">
            {[
              { label: "Extension", value: bonyExtGap, color: "#38bdf8" },
              { label: "Flexion",   value: bonyFlxGap, color: "#14b8a6" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex-1 rounded-lg p-2 text-center"
                style={{ background: color + "14", border: `1px solid ${color}33` }}>
                <p className="text-[8px] font-black uppercase" style={{ color }}>{label}</p>
                <p className="text-[14px] font-black leading-tight" style={{ color }}>{value}<span className="text-[8px]">mm</span></p>
              </div>
            ))}
            <div className="flex-1 rounded-lg p-2 text-center"
              style={{ background: peStatus.color + "14", border: `1px solid ${peStatus.color}33` }}>
              <p className="text-[8px] font-black uppercase" style={{ color: peStatus.color }}>PE Insert</p>
              <p className="text-[14px] font-black leading-tight" style={{ color: peStatus.color }}>
                {peMm}<span className="text-[8px]">mm</span>
              </p>
            </div>
          </div>

          <p className="text-[8px] leading-relaxed" style={{ color: "#475569" }}>
            * Model simplified. Gap aktual ditentukan intraoperatif menggunakan tensor/spacer.
            Target PE ≥ {peMinTarget}mm untuk {implantType} TKA. Flexion gap diasumsikan balanced.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── SliderRow ─────────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 0.5, color, onChange, unit = "°", range }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          {range && <span className="text-[9px] text-slate-500">{range}</span>}
          <span className="min-w-[40px] text-right text-[11px] font-mono font-black" style={{ color }}>
            {value}{unit}
          </span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full rounded-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}

// ── DeformityCard ─────────────────────────────────────────────────────────────

function DeformityCard({ label, value, range, flag = "normal", isDark }) {
  const palette = isDark ? FLAG_DARK : FLAG;
  const s = palette[flag] || palette.normal;
  return (
    <div className="rounded-xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
          {label}
        </span>
        <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: s.dot + "28", color: s.dot }}>
          {s.label}
        </span>
      </div>
      <div className="mt-1 text-2xl font-black leading-none" style={{ color: s.text }}>{value}</div>
      {range && <div className="mt-1 text-[9px] font-semibold" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>{range}</div>}
    </div>
  );
}

// ── usePointsHistory ──────────────────────────────────────────────────────────

function usePointsHistory() {
  const [hist, setHist] = useState({ stack: [{}], idx: 0 });
  const points = hist.stack[hist.idx];

  const setPoints = useCallback((updater) => {
    setHist((prev) => {
      const cur  = prev.stack[prev.idx];
      const next = typeof updater === "function" ? updater(cur) : updater;
      const stack = [...prev.stack.slice(0, prev.idx + 1), next];
      return { stack, idx: stack.length - 1 };
    });
  }, []);

  const setPointsLive = useCallback((updater) => {
    setHist((prev) => {
      const cur  = prev.stack[prev.idx];
      const next = typeof updater === "function" ? updater(cur) : updater;
      const stack = [...prev.stack];
      stack[prev.idx] = next;
      return { ...prev, stack };
    });
  }, []);

  const reset = useCallback(() => setHist({ stack: [{}], idx: 0 }), []);
  return { points, setPoints, setPointsLive, reset };
}

// ── LandmarkCanvas ────────────────────────────────────────────────────────────

function LandmarkCanvas({
  imageSrc, points, landmarkDefs, connections,
  displayOptions, activeIndex, setPoints, setPointsLive,
  transform, setTransform, canvasRef, drawOverlay,
}) {
  const imgRef          = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // stable refs so event handlers don't re-register
  const stateRef = useRef({});
  stateRef.current = { points, landmarkDefs, connections, displayOptions, activeIndex, transform, setPoints, setPointsLive };

  // canvas size follows container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const el = canvas.parentElement;
    if (!el) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(el.clientWidth  * dpr);
      const h = Math.round(el.clientHeight * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      if (imgRef.current) setTransform(fitTransform(imgRef.current, canvas));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el); resize();
    return () => ro.disconnect();
  }, [canvasRef, setTransform]);

  // load image
  useEffect(() => {
    if (!imageSrc) { imgRef.current = null; setLoaded(false); return; }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
      if (canvasRef.current) setTransform(fitTransform(img, canvasRef.current));
    };
    img.src = imageSrc;
  }, [imageSrc, canvasRef, setTransform]);

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgRef.current && loaded) {
      ctx.save();
      ctx.translate(transform.offsetX, transform.offsetY);
      ctx.scale(transform.scale, transform.scale);
      ctx.drawImage(imgRef.current, 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#64748b"; ctx.font = "14px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Upload X-Ray AP lutut untuk memulai", canvas.width / 2, canvas.height / 2);
      ctx.textAlign = "left";
    }

    if (displayOptions?.lines !== false) {
      connections.forEach(({ from, to, color, dash }) => {
        const a = points[from] ? imgToScreen(points[from], transform) : null;
        const b = points[to]   ? imgToScreen(points[to],   transform) : null;
        drawLine(ctx, a, b, color, dash || []);
      });
    }

    landmarkDefs.forEach((def, i) => {
      const pt = points[def.key];
      if (!pt) return;
      const sp = imgToScreen(pt, transform);
      if (displayOptions?.points !== false) drawCircle(ctx, sp.x, sp.y, i === activeIndex ? 9 : 7, def.color);
      if (displayOptions?.text !== false) drawLabel(ctx, def.short, sp.x, sp.y, def.color);
    });

    drawOverlay?.(ctx, transform, displayOptions);
  }, [canvasRef, loaded, transform, points, landmarkDefs, connections, displayOptions, activeIndex, drawOverlay]);

  const getCP = useCallback((cx, cy) => {
    const c = canvasRef.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: (cx - r.left) * (c.width / r.width), y: (cy - r.top) * (c.height / r.height) };
  }, [canvasRef]);

  // pointer events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gesture = { current: null };

    const hitPoint = (sx, sy) => {
      const { points: pts, landmarkDefs: defs, transform: t } = stateRef.current;
      for (const def of defs) {
        const pt = pts[def.key];
        if (!pt) continue;
        const sp = imgToScreen(pt, t);
        if (Math.hypot(sp.x - sx, sp.y - sy) < 30) return def.key;
      }
      return null;
    };

    const hitLine = (sx, sy) => {
      const { points: pts, connections: conns, transform: t } = stateRef.current;
      const p = { x: sx, y: sy };
      for (const conn of conns) {
        const a = pts[conn.from], b = pts[conn.to];
        if (!a || !b) continue;
        const sa = imgToScreen(a, t), sb = imgToScreen(b, t);
        if (screenDistanceToSegment(p, sa, sb) < 24) {
          return { from: conn.from, to: conn.to, startPts: { [conn.from]: { ...a }, [conn.to]: { ...b } } };
        }
      }
      return null;
    };

    const down = (e) => {
      if (e.button !== 0) return;
      const cp = getCP(e.clientX, e.clientY);
      if (!cp) return;
      const hitKey  = hitPoint(cp.x, cp.y);
      const lineHit = hitKey ? null : hitLine(cp.x, cp.y);
      gesture.current = {
        startX: cp.x, startY: cp.y,
        panOffsetX: stateRef.current.transform.offsetX,
        panOffsetY: stateRef.current.transform.offsetY,
        hitKey, lineHit, moved: false,
      };
    };

    const move = (e) => {
      const g = gesture.current;
      if (!g) return;
      const cp = getCP(e.clientX, e.clientY);
      if (!cp) return;
      const dx = cp.x - g.startX, dy = cp.y - g.startY;
      if (!g.moved && Math.hypot(dx, dy) > 3) g.moved = true;
      if (!g.moved) return;
      const { transform: t } = stateRef.current;
      if (g.hitKey) {
        stateRef.current.setPointsLive((prev) => ({ ...prev, [g.hitKey]: screenToImg(cp, t) }));
      } else if (g.lineHit) {
        const ix = dx / t.scale, iy = dy / t.scale;
        stateRef.current.setPointsLive((prev) => ({
          ...prev,
          [g.lineHit.from]: { x: g.lineHit.startPts[g.lineHit.from].x + ix, y: g.lineHit.startPts[g.lineHit.from].y + iy },
          [g.lineHit.to]:   { x: g.lineHit.startPts[g.lineHit.to].x   + ix, y: g.lineHit.startPts[g.lineHit.to].y   + iy },
        }));
      } else {
        setTransform((t2) => ({ ...t2, offsetX: g.panOffsetX + dx, offsetY: g.panOffsetY + dy }));
      }
    };

    const up = (e) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || g.moved || g.hitKey || g.lineHit) return;
      const cp = getCP(e.clientX, e.clientY);
      if (!cp) return;
      if (hitPoint(cp.x, cp.y)) return;
      const { activeIndex: aidx, landmarkDefs: defs, transform: t } = stateRef.current;
      if (aidx < 0 || aidx >= defs.length) return;
      stateRef.current.setPoints((prev) => ({ ...prev, [defs[aidx].key]: screenToImg(cp, t) }));
    };

    const wheel = (e) => {
      e.preventDefault();
      const cp = getCP(e.clientX, e.clientY);
      if (!cp) return;
      const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
      setTransform((t) => {
        const ns = Math.min(30, Math.max(0.05, t.scale * factor));
        return { scale: ns, offsetX: cp.x - (cp.x - t.offsetX) * (ns / t.scale), offsetY: cp.y - (cp.y - t.offsetY) * (ns / t.scale) };
      });
    };

    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("mousedown", down);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [canvasRef, getCP, setTransform]);

  const cursor = activeIndex >= 0 && activeIndex < landmarkDefs.length ? "crosshair" : "grab";
  return <canvas ref={canvasRef} className="h-full w-full" style={{ display: "block", cursor }} />;
}

// ── Annotated canvas renderer for PDF ────────────────────────────────────────

function drawAxisShadowOverlay(ctx, t, pts, hka) {
  const { femHead: fh, kneeCenter: kc, ankleCenter: ac } = pts;
  if (!fh || !kc || !ac) return;

  const SFH = imgToScreen(fh, t);
  const SKC = imgToScreen(kc, t);
  const SAC = imgToScreen(ac, t);

  const hkaColor = !hka
    ? "#94a3b8"
    : hka.hkaFlag === "normal" ? "#22d3ee"
    : hka.hkaFlag === "watch"  ? "#fbbf24"
    : "#f87171";

  // femHead → knee direction (downward along femoral axis)
  const femDx = SKC.x - SFH.x, femDy = SKC.y - SFH.y;
  const femLen = Math.hypot(femDx, femDy) || 1;
  const femUx = femDx / femLen, femUy = femDy / femLen;

  // ankle → knee direction (upward along tibial axis)
  const tibDx = SKC.x - SAC.x, tibDy = SKC.y - SAC.y;
  const tibLen = Math.hypot(tibDx, tibDy) || 1;
  const tibUx = tibDx / tibLen, tibUy = tibDy / tibLen;

  // Short crossing extension past the knee on each axis
  const extPast = Math.min(femLen, tibLen) * 0.28;

  ctx.save();

  // ── Femoral shadow: femHead → knee → slight extension into tibial zone ──
  ctx.strokeStyle = "#f59e0b44";
  ctx.lineWidth = 3.5;
  ctx.setLineDash([]);
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.moveTo(SFH.x, SFH.y);
  ctx.lineTo(SKC.x + femUx * extPast, SKC.y + femUy * extPast);
  ctx.stroke();

  // ── Tibial shadow: ankle → knee → slight extension into femoral zone ──
  ctx.strokeStyle = "#34d39944";
  ctx.shadowColor = "#34d399";
  ctx.beginPath();
  ctx.moveTo(SAC.x, SAC.y);
  ctx.lineTo(SKC.x + tibUx * extPast, SKC.y + tibUy * extPast);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  // ── Arc at knee between the two crossing extensions ──────────────────────
  if (hka) {
    const arcR = Math.max(28, Math.min(56, Math.min(femLen, tibLen) * 0.20));

    // Angles of the ghost extensions past the knee
    const angFemPast = Math.atan2(femUy, femUx);
    const angTibPast = Math.atan2(tibUy, tibUx);

    let diff = angTibPast - angFemPast;
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    if (Math.abs(diff) > 0.005) {
      ctx.strokeStyle = hkaColor + "dd";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(SKC.x, SKC.y, arcR, angFemPast, angTibPast, diff < 0);
      ctx.stroke();
    }

    // ── Label ON the femoral axis segment, offset ~14px perpendicular ──────
    const labelDist = Math.min(femLen * 0.42, 90);
    // Point on femoral segment, 42% of the way from knee toward femHead
    const lx = SKC.x - femUx * labelDist;
    const ly = SKC.y - femUy * labelDist;
    // Perpendicular to femoral axis (90° CCW): (-femUy, femUx)
    const px = -femUy, py = femUx;
    const tx = lx + px * 14;
    const ty = ly + py * 14;

    const label = hka.deformityType === "Netral"
      ? `HKA ${hka.hka}°`
      : `${Math.abs(hka.deviation)}° ${hka.deformityType}`;
    ctx.font = "bold 11px sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.84)"; ctx.lineWidth = 3; ctx.setLineDash([]);
    ctx.strokeText(label, tx, ty);
    ctx.fillStyle = hkaColor;
    ctx.fillText(label, tx, ty);
  }

  ctx.restore();
}

// ── AP cut-plan overlay: femoral valgus cut + tibial perpendicular cut ────────

function drawAPCutPlan(ctx, t, pts, valgusDeg, operatedSide, hka, femOffset = 0, tibOffset = 0, femWidth = 2.5, tibWidth = 2.5) {
  const { femHead: fh, kneeCenter: kc, ankleCenter: ac,
          condyleLateral: cl, plateauMedial: pm, plateauLateral: pl } = pts;
  if (!fh || !kc || !ac) return;

  drawAxisShadowOverlay(ctx, t, pts, hka);

  const SFH = imgToScreen(fh, t);
  const SKC = imgToScreen(kc, t);
  const SAC = imgToScreen(ac, t);
  const SCL = cl ? imgToScreen(cl, t) : null;
  const SPM = pm ? imgToScreen(pm, t) : null;
  const SPL = pl ? imgToScreen(pl, t) : null;

  const femDx = SKC.x - SFH.x, femDy = SKC.y - SFH.y;
  const femLen = Math.hypot(femDx, femDy) || 1;
  const uFemX = femDx / femLen, uFemY = femDy / femLen;
  const tibDx = SAC.x - SKC.x, tibDy = SAC.y - SKC.y;
  const tibLen = Math.hypot(tibDx, tibDy) || 1;
  const uTibX = tibDx / tibLen, uTibY = tibDy / tibLen;

  const halfLen = Math.min(femLen, tibLen) * 0.44;

  // Femoral cut center: condyleLateral (or above knee) + offset along femoral axis
  const femBaseCx = SCL ? SCL.x : SKC.x - uFemX * femLen * 0.12;
  const femBaseCy = SCL ? SCL.y : SKC.y - uFemY * femLen * 0.12;
  const femCutCx = femBaseCx + uFemX * femOffset * t.scale;
  const femCutCy = femBaseCy + uFemY * femOffset * t.scale;

  // Tibial cut center: plateau midpoint (or knee) + offset along tibial axis
  const tibBaseCx = (SPM && SPL) ? (SPM.x + SPL.x) / 2 : SKC.x;
  const tibBaseCy = (SPM && SPL) ? (SPM.y + SPL.y) / 2 : SKC.y;
  const tibCutCx = tibBaseCx + uTibX * tibOffset * t.scale;
  const tibCutCy = tibBaseCy + uTibY * tibOffset * t.scale;

  // Femoral cut direction: perpendicular to femoral axis, tilted valgusDeg toward lateral
  const sideSign = operatedSide === "Right" ? 1 : -1;
  const perpFemX = sideSign === 1 ? (-uFemY) : uFemY;
  const perpFemY = sideSign === 1 ? uFemX : (-uFemX);
  const θ = degToRad(valgusDeg) * sideSign;
  const femCutDirX = perpFemX * Math.cos(θ) - perpFemY * Math.sin(θ);
  const femCutDirY = perpFemX * Math.sin(θ) + perpFemY * Math.cos(θ);

  // Tibial cut direction: perpendicular to tibial axis
  const tibCutDirX = -uTibY;
  const tibCutDirY = uTibX;

  ctx.save();
  ctx.lineCap = "round";

  // Femoral cut
  const femColor = "#38bdf8";
  const femGlowW = Math.max(5, femWidth * 2);
  ctx.shadowColor = femColor; ctx.shadowBlur = 12;
  ctx.strokeStyle = femColor + "44"; ctx.lineWidth = femGlowW; ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(femCutCx - femCutDirX * halfLen, femCutCy - femCutDirY * halfLen);
  ctx.lineTo(femCutCx + femCutDirX * halfLen, femCutCy + femCutDirY * halfLen);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = femColor; ctx.lineWidth = femWidth; ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.moveTo(femCutCx - femCutDirX * halfLen, femCutCy - femCutDirY * halfLen);
  ctx.lineTo(femCutCx + femCutDirX * halfLen, femCutCy + femCutDirY * halfLen);
  ctx.stroke();
  ctx.setLineDash([]);

  // Tibial cut
  const tibColor = "#a78bfa";
  const tibGlowW = Math.max(5, tibWidth * 2);
  ctx.shadowColor = tibColor; ctx.shadowBlur = 12;
  ctx.strokeStyle = tibColor + "44"; ctx.lineWidth = tibGlowW;
  ctx.beginPath();
  ctx.moveTo(tibCutCx - tibCutDirX * halfLen, tibCutCy - tibCutDirY * halfLen);
  ctx.lineTo(tibCutCx + tibCutDirX * halfLen, tibCutCy + tibCutDirY * halfLen);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = tibColor; ctx.lineWidth = tibWidth; ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.moveTo(tibCutCx - tibCutDirX * halfLen, tibCutCy - tibCutDirY * halfLen);
  ctx.lineTo(tibCutCx + tibCutDirX * halfLen, tibCutCy + tibCutDirY * halfLen);
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels
  ctx.font = "bold 10px sans-serif";
  const flx = femCutCx + femCutDirX * (halfLen + 5);
  const fly = femCutCy + femCutDirY * (halfLen + 5);
  ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 3;
  ctx.strokeText(`Femoral ${valgusDeg}°V`, flx, fly);
  ctx.fillStyle = femColor; ctx.fillText(`Femoral ${valgusDeg}°V`, flx, fly);
  const tlx = tibCutCx + tibCutDirX * (halfLen + 5);
  const tly = tibCutCy + tibCutDirY * (halfLen + 5);
  ctx.strokeText("Tibial ⊥", tlx, tly);
  ctx.fillStyle = tibColor; ctx.fillText("Tibial ⊥", tlx, tly);

  ctx.restore();
}

// ── Lateral cut-plan overlay: tibial slope cut ────────────────────────────────

function drawLatCutPlan(ctx, t, latPts, slopeDeg, cutOffset = 0, cutWidth = 2.5, operatedSide = "Right") {
  const { tibShaftTop: st, tibShaftBot: sb, slopePlateauAnt: pa, slopePlateauPost: pp } = latPts;
  if (!st || !sb) return;

  const SST = imgToScreen(st, t);
  const SSB = imgToScreen(sb, t);
  const SPA = pa ? imgToScreen(pa, t) : null;
  const SPP = pp ? imgToScreen(pp, t) : null;

  const axDx = SST.x - SSB.x, axDy = SST.y - SSB.y;
  const axLen = Math.hypot(axDx, axDy) || 1;
  const uAxX = axDx / axLen, uAxY = axDy / axLen;
  const perpX = -uAxY, perpY = uAxX;

  // Cut base center (from plateau landmarks) + offset along shaft axis
  const cutBaseCx = (SPA && SPP) ? (SPA.x + SPP.x) / 2 : (SST.x + SSB.x) / 2;
  const cutBaseCy = (SPA && SPP) ? (SPA.y + SPP.y) / 2 : (SST.y + SSB.y) / 2;
  const cutCx = cutBaseCx + uAxX * cutOffset * t.scale;
  const cutCy = cutBaseCy + uAxY * cutOffset * t.scale;

  // Determine slope rotation direction based on which way posterior actually is in the image.
  // Posterior slope = posterior side of plateau should be LOWER (higher y in canvas).
  // If SPA and SPP are placed, use dot(perpDir, postDir) to determine sign automatically.
  // Fall back to operatedSide convention: right leg → posterior is to the RIGHT (+1),
  // left leg → posterior is to the LEFT (-1).
  let slopeSign;
  if (SPA && SPP) {
    const postDX = SPP.x - SPA.x, postDY = SPP.y - SPA.y;
    const dot = perpX * postDX + perpY * postDY;
    slopeSign = dot >= 0 ? 1 : -1;
  } else {
    slopeSign = operatedSide === "Left" ? -1 : 1;
  }

  const θ = degToRad(slopeDeg) * slopeSign;
  const cutDirX = perpX * Math.cos(θ) - perpY * Math.sin(θ);
  const cutDirY = perpX * Math.sin(θ) + perpY * Math.cos(θ);

  const halfLen = axLen * 0.4;
  const cutColor = "#a78bfa";
  const glowW = Math.max(5, cutWidth * 2);

  ctx.save();
  ctx.lineCap = "round";

  ctx.shadowColor = cutColor; ctx.shadowBlur = 12;
  ctx.strokeStyle = cutColor + "44"; ctx.lineWidth = glowW; ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cutCx - cutDirX * halfLen, cutCy - cutDirY * halfLen);
  ctx.lineTo(cutCx + cutDirX * halfLen, cutCy + cutDirY * halfLen);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = cutColor; ctx.lineWidth = cutWidth; ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.moveTo(cutCx - cutDirX * halfLen, cutCy - cutDirY * halfLen);
  ctx.lineTo(cutCx + cutDirX * halfLen, cutCy + cutDirY * halfLen);
  ctx.stroke();
  ctx.setLineDash([]);

  if (slopeDeg > 0) {
    const arcR = Math.max(18, Math.min(36, halfLen * 0.28));
    const a0 = Math.atan2(perpY, perpX);
    const a1 = Math.atan2(cutDirY, cutDirX);
    let diff = a1 - a0; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
    ctx.strokeStyle = cutColor; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cutCx, cutCy, arcR, a0, a1, diff < 0);
    ctx.stroke();
    const aMid = a0 + diff / 2;
    const lx = cutCx + Math.cos(aMid) * (arcR + 16);
    const ly = cutCy + Math.sin(aMid) * (arcR + 16);
    ctx.font = "bold 10px sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 3;
    ctx.strokeText(`${slopeDeg}° slope`, lx, ly);
    ctx.fillStyle = cutColor; ctx.fillText(`${slopeDeg}° slope`, lx, ly);
  }

  ctx.restore();
}

function renderAnnotatedCanvas(imgEl, points, landmarkDefs, connections, displayOptions, W = 2000, H = 1400, overlayFn = null) {
  if (!imgEl) return null;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, H);

  const scale = Math.min(W / imgEl.naturalWidth, H / imgEl.naturalHeight);
  const offX  = (W - imgEl.naturalWidth * scale) / 2;
  const offY  = (H - imgEl.naturalHeight * scale) / 2;
  const t = { scale, offsetX: offX, offsetY: offY };

  ctx.drawImage(imgEl, offX, offY, imgEl.naturalWidth * scale, imgEl.naturalHeight * scale);

  overlayFn?.(ctx, t);

  if (displayOptions?.lines !== false) {
    connections.forEach(({ from, to, color, dash }) => {
      const a = points[from] ? imgToScreen(points[from], t) : null;
      const b = points[to]   ? imgToScreen(points[to],   t) : null;
      drawLine(ctx, a, b, color, dash || []);
    });
  }

  landmarkDefs.forEach((def) => {
    const pt = points[def.key];
    if (!pt) return;
    const sp = imgToScreen(pt, t);
    if (displayOptions?.points !== false) drawCircle(ctx, sp.x, sp.y, 9, def.color);
    if (displayOptions?.text !== false) drawLabel(ctx, def.short, sp.x, sp.y, def.color);
  });

  return canvas.toDataURL("image/jpeg", 0.92);
}

// ── PDF export ────────────────────────────────────────────────────────────────

async function exportPDF({ operatedSide, hka, alignment, plan, implantRec, imgEl, latImgEl, points, latPoints, tibSlopeResult, landmarkDefs, displayOptions }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const M = 14, PW = 210;
  const today = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  // Header
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, PW, 30, "F");
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, 4, 30, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
  doc.text("PRE-OP PLANNING — TKA", M + 2, 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text(`Analisis Deformitas & Rencana Potongan · ${today}`, M + 2, 18);
  doc.text(`Ref: Tanzer & Makhdom, JAAOS 2016 · Sisi: ${operatedSide === "Right" ? "Kanan" : "Kiri"}`, PW - M, 18, { align: "right" });

  let y = 36;

  const section = (title) => {
    doc.setFillColor(241, 245, 249); doc.roundedRect(M, y, PW - 2 * M, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    doc.text(title, M + 4, y + 4.3);
    y += 8;
  };

  const FC = { normal: [22, 163, 74], watch: [217, 119, 6], low: [234, 88, 12], high: [220, 38, 38] };

  const rowFn = (label, value, range, flag = "normal") => {
    const fc = FC[flag] || FC.normal;
    doc.setFillColor(fc[0], fc[1], fc[2]);
    doc.circle(M + 3, y + 2.4, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    doc.text(label, M + 7, y + 3.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(fc[0], fc[1], fc[2]);
    doc.text(String(value), PW / 2, y + 3.5);
    doc.setTextColor(100, 116, 139);
    doc.text(range || "", PW - M, y + 3.5, { align: "right" });
    y += 6.5;
  };

  // Deformity section — Tanzer & Makhdom 2016
  section("ANALISIS DEFORMITAS PRE-OP (Tanzer & Makhdom, JAAOS 2016)");
  if (hka) {
    rowFn(
      "HKA (Hip-Knee-Ankle Angle)",
      `${hka.deformityType} ${Math.abs(hka.deviation)}° (${hka.severity})`,
      "Netral = 0°, ref: Fig.1C",
      hka.hkaFlag,
    );
  }
  if (tibSlopeResult) {
    rowFn(
      "Posterior Tibial Slope (PSA, foto lateral)",
      `${tibSlopeResult.slope}° ${tibSlopeResult.dir}`,
      tibSlopeResult.slopeText || "Normal 3–7°",
      tibSlopeResult.slopeFlag,
    );
  }
  if (alignment) {
    rowFn("MDFA — Mechanical Distal Femoral Angle", `${alignment.MDFA}° (dev ${alignment.mdfaDev > 0 ? "+" : ""}${alignment.mdfaDev}°)`, "Ref 85–95°", alignment.mdfaFlag);
    rowFn("MPTA — Medial Proximal Tibial Angle",    `${alignment.MPTA}° (dev ${alignment.mptaDev > 0 ? "+" : ""}${alignment.mptaDev}°)`, "Ref 85–90°", alignment.mptaFlag);
    rowFn("MDFA + MPTA combined",                   `${alignment.combined}°`, "Target 175–185°", alignment.combinedFlag);
  }
  if (implantRec) {
    y += 2;
    doc.setFillColor(241, 245, 249); doc.roundedRect(M, y, PW - 2 * M, 10, 1, 1, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    doc.text("Rekomendasi Implant (Fig.7, Tanzer 2016):", M + 4, y + 4.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(37, 99, 235);
    doc.text(implantRec.type, M + 4, y + 9);
    y += 13;
  }
  y += 2;

  // Planning section
  section("RENCANA POTONGAN");
  rowFn("Femoral Resection Angle (valgus, intramedullary)", `${plan.valgusDeg}°`, "Target 5–7°, range 3–11° (Mullaji et al.)");
  rowFn("Posterior Tibial Slope", `${plan.slopeDeg}°`, plan.implantType === "CR" ? "Target 5–7° (CR)" : "Target 3–5° (PS)");
  rowFn("Tibial Resection (sisi unaffected)", `${plan.tibResectionMm} mm`, "~10mm (combined tibial component + PE)");
  rowFn("Desain Implant", `${plan.implantType} TKA`, "CR / PS / VVC — Tanzer 2016 Table 1");
  if (plan.jointLineDev !== 0) rowFn("Deviasi Joint Line", `${plan.jointLineDev > 0 ? "+" : ""}${plan.jointLineDev} mm`, "±5 mm, preserve anatomical level");
  y += 4;

  // Annotated AP X-ray
  if (imgEl) {
    const url = renderAnnotatedCanvas(imgEl, points, landmarkDefs, AP_CONNECTIONS, displayOptions, 2200, 1600,
      (ctx, t) => drawAxisShadowOverlay(ctx, t, points, hka));
    if (url) {
      doc.addPage("a4", "landscape");
      const LW = 297, LH = 210, Lm = 10;
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, LW, 12, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text("X-Ray AP Lutut (Annotated)", Lm, 8);
      const availW = LW - 2 * Lm, availH = LH - Lm - 14;
      let iw = availW, ih = iw * (imgEl.naturalHeight / imgEl.naturalWidth);
      if (ih > availH) { ih = availH; iw = ih * (imgEl.naturalWidth / imgEl.naturalHeight); }
      doc.addImage(url, "JPEG", Lm + (availW - iw) / 2, 13, iw, ih, undefined, "FAST");
    }
  }

  // Annotated lateral X-ray
  if (latImgEl) {
    const latUrl = renderAnnotatedCanvas(latImgEl, latPoints, LAT_LANDMARKS, LAT_CONNECTIONS, displayOptions, 2200, 1600);
    if (latUrl) {
      doc.addPage("a4", "landscape");
      const LW = 297, LH = 210, Lm = 10;
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, LW, 12, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text("X-Ray Lateral Lutut — Posterior Tibial Slope (Annotated)", Lm, 8);
      if (tibSlopeResult) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
        doc.text(`PSA Terukur: ${tibSlopeResult.slope}° ${tibSlopeResult.dir} · ${tibSlopeResult.slopeText || ""}`, LW - Lm, 8, { align: "right" });
      }
      const availW = LW - 2 * Lm, availH = LH - Lm - 14;
      let iw = availW, ih = iw * (latImgEl.naturalHeight / latImgEl.naturalWidth);
      if (ih > availH) { ih = availH; iw = ih * (latImgEl.naturalWidth / latImgEl.naturalHeight); }
      doc.addImage(latUrl, "JPEG", Lm + (availW - iw) / 2, 13, iw, ih, undefined, "FAST");
    }
  }

  doc.save(`PreTKA_${operatedSide}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Inline X-ray canvas for planning step ─────────────────────────────────────

function APCutPlanCanvas({
  imageSrc, pts, valgusDeg, operatedSide, hka,
  femOffset, setFemOffset, tibOffset, setTibOffset,
  femWidth, setFemWidth, tibWidth, setTibWidth,
}) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const tRef      = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef   = useRef(null);
  const stRef     = useRef({});
  const [loaded, setLoaded] = useState(false);

  stRef.current = { pts, valgusDeg, operatedSide, hka, femOffset, setFemOffset, tibOffset, setTibOffset, femWidth, tibWidth };

  // Render function stored in ref so pointer handlers always call the latest version
  const renderRef = useRef(null);
  renderRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(canvas.offsetWidth * dpr);
    const H = Math.round(canvas.offsetHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const img = imgRef.current;
    const t = tRef.current;
    if (!img || !loaded) {
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
      if (!imageSrc) {
        ctx.fillStyle = "#38bdf888"; ctx.textAlign = "center";
        ctx.font = `bold ${12 * dpr}px sans-serif`;
        ctx.fillText("Upload X-Ray AP", W / 2, H / 2);
        ctx.textAlign = "left";
      }
      return;
    }
    ctx.save(); ctx.translate(t.offsetX, t.offsetY); ctx.scale(t.scale, t.scale); ctx.drawImage(img, 0, 0); ctx.restore();
    const { pts: p, valgusDeg: vd, operatedSide: os, hka: h, femOffset: fo, tibOffset: to, femWidth: fw, tibWidth: tw } = stRef.current;
    drawAPCutPlan(ctx, t, p, vd, os, h, fo, to, fw, tw);
  };

  useEffect(() => {
    if (!imageSrc) { imgRef.current = null; setLoaded(false); return; }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current;
      if (c) tRef.current = fitTransform(img, c);
      setLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => { renderRef.current?.(); });

  function getCutGeom(t) {
    const { pts: p, valgusDeg: vd, operatedSide: os, femOffset: fo, tibOffset: to } = stRef.current;
    if (!p?.femHead || !p?.kneeCenter || !p?.ankleCenter) return null;
    const SFH = imgToScreen(p.femHead, t); const SKC = imgToScreen(p.kneeCenter, t); const SAC = imgToScreen(p.ankleCenter, t);
    const SCL = p.condyleLateral ? imgToScreen(p.condyleLateral, t) : null;
    const SPM = p.plateauMedial  ? imgToScreen(p.plateauMedial,  t) : null;
    const SPL = p.plateauLateral ? imgToScreen(p.plateauLateral, t) : null;
    const femDx = SKC.x - SFH.x, femDy = SKC.y - SFH.y;
    const femLen = Math.hypot(femDx, femDy) || 1;
    const uFemX = femDx / femLen, uFemY = femDy / femLen;
    const tibDx = SAC.x - SKC.x, tibDy = SAC.y - SKC.y;
    const tibLen = Math.hypot(tibDx, tibDy) || 1;
    const uTibX = tibDx / tibLen, uTibY = tibDy / tibLen;
    const femBaseCx = SCL ? SCL.x : SKC.x - uFemX * femLen * 0.12;
    const femBaseCy = SCL ? SCL.y : SKC.y - uFemY * femLen * 0.12;
    const femCutCx = femBaseCx + uFemX * fo * t.scale;
    const femCutCy = femBaseCy + uFemY * fo * t.scale;
    const tibBaseCx = (SPM && SPL) ? (SPM.x + SPL.x) / 2 : SKC.x;
    const tibBaseCy = (SPM && SPL) ? (SPM.y + SPL.y) / 2 : SKC.y;
    const tibCutCx = tibBaseCx + uTibX * to * t.scale;
    const tibCutCy = tibBaseCy + uTibY * to * t.scale;
    const sideSign = os === "Right" ? 1 : -1;
    const perpFemX = sideSign === 1 ? -uFemY : uFemY;
    const perpFemY = sideSign === 1 ? uFemX : -uFemX;
    const θ = degToRad(vd) * sideSign;
    const femCutDirX = perpFemX * Math.cos(θ) - perpFemY * Math.sin(θ);
    const femCutDirY = perpFemX * Math.sin(θ) + perpFemY * Math.cos(θ);
    return { femCutCx, femCutCy, femCutDirX, femCutDirY, uFemX, uFemY, tibCutCx, tibCutCy, uTibX, uTibY, tibCutDirX: -uTibY, tibCutDirY: uTibX };
  }

  function distToLine(px, py, cx, cy, dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    return Math.abs((px - cx) * (-dy / len) + (py - cy) * (dx / len));
  }

  function getCP(e) {
    const c = canvasRef.current; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onDown(e) {
      if (e.button !== 0) return;
      const cp = getCP(e); const t = tRef.current;
      const geom = getCutGeom(t);
      const HIT = 20;
      if (geom) {
        const dFem = distToLine(cp.x, cp.y, geom.femCutCx, geom.femCutCy, geom.femCutDirX, geom.femCutDirY);
        const dTib = distToLine(cp.x, cp.y, geom.tibCutCx, geom.tibCutCy, geom.tibCutDirX, geom.tibCutDirY);
        if (dFem <= dTib && dFem < HIT) {
          dragRef.current = { type: "fem", sx: cp.x, sy: cp.y, so: stRef.current.femOffset, uX: geom.uFemX, uY: geom.uFemY };
          canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "ns-resize"; return;
        }
        if (dTib < HIT) {
          dragRef.current = { type: "tib", sx: cp.x, sy: cp.y, so: stRef.current.tibOffset, uX: geom.uTibX, uY: geom.uTibY };
          canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "ns-resize"; return;
        }
      }
      dragRef.current = { type: "pan", sx: cp.x, sy: cp.y, ox: t.offsetX, oy: t.offsetY };
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing";
    }
    function onMove(e) {
      const g = dragRef.current; if (!g) return;
      const cp = getCP(e); const dx = cp.x - g.sx, dy = cp.y - g.sy;
      if (g.type === "fem") {
        const proj = dx * g.uX + dy * g.uY;
        stRef.current.setFemOffset(g.so + proj / tRef.current.scale);
      } else if (g.type === "tib") {
        const proj = dx * g.uX + dy * g.uY;
        stRef.current.setTibOffset(g.so + proj / tRef.current.scale);
      } else {
        tRef.current = { ...tRef.current, offsetX: g.ox + dx, offsetY: g.oy + dy };
        renderRef.current?.();
      }
    }
    function onUp() { dragRef.current = null; canvas.style.cursor = "crosshair"; }
    function onWheel(e) {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12; const t = tRef.current; const cp = getCP(e);
      const ns = Math.min(30, Math.max(0.1, t.scale * f));
      tRef.current = { scale: ns, offsetX: cp.x - (cp.x - t.offsetX) * (ns / t.scale), offsetY: cp.y - (cp.y - t.offsetY) * (ns / t.scale) };
      renderRef.current?.();
    }
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }} style={{ ...glassCard, padding: 0, overflow: "hidden" }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: "#38bdf822", borderBottom: "1px solid #38bdf833" }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <p className="text-[9px] font-black uppercase tracking-widest text-sky-400">Femoral {valgusDeg}°V + Tibial · AP</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            <span className="w-3 text-[8px] font-black text-sky-400">F</span>
            <button onClick={() => setFemWidth(w => Math.max(1, +(w - 0.5).toFixed(1)))} className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-black text-sky-400 hover:bg-white/10">−</button>
            <span className="w-5 text-center text-[9px] text-slate-300">{femWidth.toFixed(1)}</span>
            <button onClick={() => setFemWidth(w => Math.min(10, +(w + 0.5).toFixed(1)))} className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-black text-sky-400 hover:bg-white/10">+</button>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="w-3 text-[8px] font-black text-violet-400">T</span>
            <button onClick={() => setTibWidth(w => Math.max(1, +(w - 0.5).toFixed(1)))} className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-black text-violet-400 hover:bg-white/10">−</button>
            <span className="w-5 text-center text-[9px] text-slate-300">{tibWidth.toFixed(1)}</span>
            <button onClick={() => setTibWidth(w => Math.min(10, +(w + 0.5).toFixed(1)))} className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-black text-violet-400 hover:bg-white/10">+</button>
          </div>
          <button onClick={() => { setFemOffset(0); setTibOffset(0); }} title="Reset posisi"
            className="px-1 text-[9px] font-black text-slate-400 hover:text-slate-200">↺</button>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: "220px", display: "block", cursor: "crosshair" }} />
      <p className="py-1 text-center text-[8px] text-slate-500">Drag garis • Scroll zoom • Pan area kosong</p>
    </motion.div>
  );
}

function LatCutPlanCanvas({ imageSrc, latPts, slopeDeg, operatedSide = "Right", cutMode = "slope", setCutMode, cutOffset, setCutOffset, cutWidth, setCutWidth }) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const tRef      = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef   = useRef(null);
  const stRef     = useRef({});
  const [loaded, setLoaded] = useState(false);

  // Effective slope: 0 in perp mode
  const effectiveSlopeDeg = cutMode === "perp" ? 0 : slopeDeg;
  stRef.current = { latPts, slopeDeg: effectiveSlopeDeg, operatedSide, cutOffset, setCutOffset, cutWidth };

  const renderRef = useRef(null);
  renderRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(canvas.offsetWidth * dpr);
    const H = Math.round(canvas.offsetHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const img = imgRef.current; const t = tRef.current;
    if (!img || !loaded) {
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
      if (!imageSrc) {
        ctx.fillStyle = "#14b8a688"; ctx.textAlign = "center";
        ctx.font = `bold ${12 * dpr}px sans-serif`;
        ctx.fillText("Upload Foto Lateral Lutut", W / 2, H / 2);
        ctx.textAlign = "left";
      }
      return;
    }
    ctx.save(); ctx.translate(t.offsetX, t.offsetY); ctx.scale(t.scale, t.scale); ctx.drawImage(img, 0, 0); ctx.restore();
    const { latPts: lp, slopeDeg: sd, operatedSide: os, cutOffset: co, cutWidth: cw } = stRef.current;
    drawLatCutPlan(ctx, t, lp, sd, co, cw, os);
  };

  useEffect(() => {
    if (!imageSrc) { imgRef.current = null; setLoaded(false); return; }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current;
      if (c) tRef.current = fitTransform(img, c);
      setLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => { renderRef.current?.(); });

  function getLatCutGeom(t) {
    const { latPts: lp, slopeDeg: sd, operatedSide: os, cutOffset: co } = stRef.current;
    const { tibShaftTop: st, tibShaftBot: sb, slopePlateauAnt: pa, slopePlateauPost: pp } = lp || {};
    if (!st || !sb) return null;
    const SST = imgToScreen(st, t); const SSB = imgToScreen(sb, t);
    const SPA = pa ? imgToScreen(pa, t) : null; const SPP = pp ? imgToScreen(pp, t) : null;
    const axDx = SST.x - SSB.x, axDy = SST.y - SSB.y;
    const axLen = Math.hypot(axDx, axDy) || 1;
    const uAxX = axDx / axLen, uAxY = axDy / axLen;
    const perpX = -uAxY, perpY = uAxX;
    const cutBaseCx = (SPA && SPP) ? (SPA.x + SPP.x) / 2 : (SST.x + SSB.x) / 2;
    const cutBaseCy = (SPA && SPP) ? (SPA.y + SPP.y) / 2 : (SST.y + SSB.y) / 2;
    const cutCx = cutBaseCx + uAxX * co * t.scale;
    const cutCy = cutBaseCy + uAxY * co * t.scale;
    // Same slope-sign logic as drawLatCutPlan
    let slopeSign;
    if (SPA && SPP) {
      const dot = perpX * (SPP.x - SPA.x) + perpY * (SPP.y - SPA.y);
      slopeSign = dot >= 0 ? 1 : -1;
    } else {
      slopeSign = os === "Left" ? -1 : 1;
    }
    const θ = degToRad(sd) * slopeSign;
    const cutDirX = perpX * Math.cos(θ) - perpY * Math.sin(θ);
    const cutDirY = perpX * Math.sin(θ) + perpY * Math.cos(θ);
    return { cutCx, cutCy, cutDirX, cutDirY, uAxX, uAxY };
  }

  function distToLine(px, py, cx, cy, dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    return Math.abs((px - cx) * (-dy / len) + (py - cy) * (dx / len));
  }

  function getCP(e) {
    const c = canvasRef.current; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onDown(e) {
      if (e.button !== 0) return;
      const cp = getCP(e); const t = tRef.current;
      const geom = getLatCutGeom(t);
      if (geom && distToLine(cp.x, cp.y, geom.cutCx, geom.cutCy, geom.cutDirX, geom.cutDirY) < 20) {
        dragRef.current = { type: "cut", sx: cp.x, sy: cp.y, so: stRef.current.cutOffset, uX: geom.uAxX, uY: geom.uAxY };
        canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "ns-resize"; return;
      }
      dragRef.current = { type: "pan", sx: cp.x, sy: cp.y, ox: tRef.current.offsetX, oy: tRef.current.offsetY };
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing";
    }
    function onMove(e) {
      const g = dragRef.current; if (!g) return;
      const cp = getCP(e); const dx = cp.x - g.sx, dy = cp.y - g.sy;
      if (g.type === "cut") {
        const proj = dx * g.uX + dy * g.uY;
        stRef.current.setCutOffset(g.so + proj / tRef.current.scale);
      } else {
        tRef.current = { ...tRef.current, offsetX: g.ox + dx, offsetY: g.oy + dy };
        renderRef.current?.();
      }
    }
    function onUp() { dragRef.current = null; canvas.style.cursor = "crosshair"; }
    function onWheel(e) {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12; const t = tRef.current; const cp = getCP(e);
      const ns = Math.min(30, Math.max(0.1, t.scale * f));
      tRef.current = { scale: ns, offsetX: cp.x - (cp.x - t.offsetX) * (ns / t.scale), offsetY: cp.y - (cp.y - t.offsetY) * (ns / t.scale) };
      renderRef.current?.();
    }
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }} style={{ ...glassCard, padding: 0, overflow: "hidden" }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: "#14b8a622", borderBottom: "1px solid #14b8a633" }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: "#14b8a6" }} />
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#14b8a6" }}>
            Tibial {cutMode === "perp" ? "⊥ 0°" : `Slope ${slopeDeg}°`} · Lateral
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle: slope vs perpendicular */}
          <div className="flex rounded overflow-hidden border border-white/10">
            <button onClick={() => setCutMode?.("slope")}
              className="px-2 py-0.5 text-[8px] font-black transition-colors"
              style={{ background: cutMode === "slope" ? "#14b8a6" : "transparent", color: cutMode === "slope" ? "#fff" : "#14b8a6" }}>
              {slopeDeg}° Slope
            </button>
            <button onClick={() => setCutMode?.("perp")}
              className="px-2 py-0.5 text-[8px] font-black transition-colors"
              style={{ background: cutMode === "perp" ? "#14b8a6" : "transparent", color: cutMode === "perp" ? "#fff" : "#14b8a6" }}>
              ⊥ Perp
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setCutWidth(w => Math.max(1, +(w - 0.5).toFixed(1)))} className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-black text-violet-400 hover:bg-white/10">−</button>
            <span className="w-5 text-center text-[9px] text-slate-300">{cutWidth.toFixed(1)}</span>
            <button onClick={() => setCutWidth(w => Math.min(10, +(w + 0.5).toFixed(1)))} className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-black text-violet-400 hover:bg-white/10">+</button>
          </div>
          <button onClick={() => setCutOffset(0)} title="Reset posisi"
            className="px-1 text-[9px] font-black text-slate-400 hover:text-slate-200">↺</button>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: "220px", display: "block", cursor: "crosshair" }} />
      <p className="py-1 text-center text-[8px] text-slate-500">Drag garis • Scroll zoom • Pan area kosong</p>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PreTKAAssessmentPanel({ open, onClose, imageSrc, operatedSide: initSide = "Right" }) {
  const [step, setStep]                 = useState("deformity");
  const [operatedSide, setOperatedSide] = useState(initSide);
  const [manualActiveIndex, setManualActiveIndex] = useState(null);
  const [displayOptions, setDisplayOptions] = useState({ points: true, lines: true, text: true });
  const [transform, setTransform]       = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDark, setIsDark]             = useState(false);

  // Planning state
  // Defaults per Tanzer & Makhdom 2016:
  // Femoral resection angle 5–7° (Mullaji: 3–11°), tibial resection ~10mm, slope 3–7°
  const [valgusDeg,       setValgusDeg]       = useState(6);
  const [slopeDeg,        setSlopeDeg]        = useState(5);

  // Cut-line interactive state (image-space pixel offsets along mechanical axis)
  const [femCutOffset,  setFemCutOffset]  = useState(0);
  const [tibCutOffset,  setTibCutOffset]  = useState(0);
  const [latCutOffset,  setLatCutOffset]  = useState(0);
  const [femCutW,       setFemCutW]       = useState(2.5);
  const [tibCutW,       setTibCutW]       = useState(2.5);
  const [latCutW,       setLatCutW]       = useState(2.5);
  // Tibial lateral cut mode: "slope" uses slopeDeg, "perp" forces 0° (purely perpendicular)
  const [latCutMode,    setLatCutMode]    = useState("slope");
  const [tibResectionMm,  setTibResectionMm]  = useState(10);
  const [implantType,     setImplantType]     = useState("PS");
  const [jointLineDev,    setJointLineDev]    = useState(0);

  const { points, setPoints, setPointsLive, reset: resetPoints } = usePointsHistory();
  const { points: latPoints, setPoints: setLatPoints, setPointsLive: setLatPointsLive, reset: resetLatPoints } = usePointsHistory();
  const canvasRef    = useRef(null);
  const latCanvasRef = useRef(null);
  const imgRef       = useRef(null);
  const latImgRef    = useRef(null);
  const latFileRef   = useRef(null);

  // view: "ap" | "lateral"
  const [activeView,       setActiveView]       = useState("ap");
  const [imageSrcLateral,  setImageSrcLateral]  = useState(null);
  const [latTransform,     setLatTransform]     = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [sidebarWidth,     setSidebarWidth]     = useState(320);
  const [latManualActiveIndex, setLatManualActiveIndex] = useState(null);

  // dark mode observer
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.dataset.theme === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // load AP image ref for PDF
  useEffect(() => {
    if (!imageSrc) { imgRef.current = null; return; }
    const img = new Image(); img.onload = () => { imgRef.current = img; }; img.src = imageSrc;
  }, [imageSrc]);

  // load lateral image ref for PDF
  useEffect(() => {
    if (!imageSrcLateral) { latImgRef.current = null; return; }
    const img = new Image(); img.onload = () => { latImgRef.current = img; }; img.src = imageSrcLateral;
  }, [imageSrcLateral]);

  // reset when closed
  useEffect(() => {
    if (!open) {
      setStep("deformity");
      setManualActiveIndex(null);
    }
  }, [open]);

  const stepIndex = STEPS.indexOf(step);

  // active landmark index
  const firstMissingIndex = useMemo(() => {
    const i = AP_LANDMARKS.findIndex((d) => !points[d.key]);
    return i === -1 ? AP_LANDMARKS.length : i;
  }, [points]);

  const activeIndex = manualActiveIndex !== null ? manualActiveIndex : firstMissingIndex;

  // auto-advance: wrap setPoints to reset manualActiveIndex
  const setPointsAndAdvance = useCallback((fn) => {
    setPoints(fn);
    setManualActiveIndex(null);
  }, [setPoints]);

  const completedCount = AP_LANDMARKS.filter((d) => points[d.key]).length;
  const allPlaced = completedCount === AP_LANDMARKS.length;

  // lateral landmark tracking
  const latFirstMissingIndex = useMemo(() => {
    const i = LAT_LANDMARKS.findIndex((d) => !latPoints[d.key]);
    return i === -1 ? LAT_LANDMARKS.length : i;
  }, [latPoints]);
  const latActiveIndex = latManualActiveIndex !== null ? latManualActiveIndex : latFirstMissingIndex;
  const setLatPointsAndAdvance = useCallback((fn) => {
    setLatPoints(fn);
    setLatManualActiveIndex(null);
  }, [setLatPoints]);
  const latCompletedCount = LAT_LANDMARKS.filter((d) => latPoints[d.key]).length;
  const allLatPlaced = latCompletedCount === LAT_LANDMARKS.length;

  // calculations
  const hka = useMemo(() => computeHKA(points.femHead, points.kneeCenter, points.ankleCenter, operatedSide), [points, operatedSide]);
  const alignment = useMemo(() => computeTKAAlignment(points), [points]);

  const tibSlopeResult = useMemo(() => {
    if (!latPoints.tibShaftTop || !latPoints.tibShaftBot || !latPoints.slopePlateauAnt || !latPoints.slopePlateauPost) return null;
    return computeTibialSlope({
      tibShaftTop:      latPoints.tibShaftTop,
      tibShaftBot:      latPoints.tibShaftBot,
      slopePlateauAnt:  latPoints.slopePlateauAnt,
      slopePlateauPost: latPoints.slopePlateauPost,
      legSide:          operatedSide,
    });
  }, [latPoints, operatedSide]);

  const implantRec = useMemo(() => getImplantRec(hka), [hka]);

  const plan = useMemo(() => ({ valgusDeg, slopeDeg, tibResectionMm, implantType, jointLineDev }), [valgusDeg, slopeDeg, tibResectionMm, implantType, jointLineDev]);

  const toggleDisplay = (key) => setDisplayOptions((p) => ({ ...p, [key]: !p[key] }));

  const zoom = (dir) => {
    const factor = dir === "in" ? 1.2 : 1 / 1.2;
    setTransform((t) => ({ ...t, scale: Math.min(20, Math.max(0.05, t.scale * factor)) }));
  };

  // ── Lateral overlay ──────────────────────────────────────────────────────────
  const drawLateralOverlay = useCallback((ctx, t) => {
    const { tibShaftTop: st, tibShaftBot: sb, slopePlateauAnt: pa, slopePlateauPost: pp } = latPoints;
    if (!st || !sb) return;

    const SST = imgToScreen(st, t);
    const SSB = imgToScreen(sb, t);

    // shaft axis unit vector (pointing up: bot → top)
    const axDx = SST.x - SSB.x, axDy = SST.y - SSB.y;
    const axLen = Math.hypot(axDx, axDy) || 1;
    const axUx = axDx / axLen, axUy = axDy / axLen;

    const ext = Math.max(ctx.canvas.width, ctx.canvas.height) * 0.5;

    ctx.save();
    // Extended shaft axis
    ctx.strokeStyle = "#f9731666"; ctx.lineWidth = 1.5;
    ctx.setLineDash([9, 5]);
    ctx.beginPath();
    ctx.moveTo(SSB.x - axUx * ext * 0.25, SSB.y - axUy * ext * 0.25);
    ctx.lineTo(SST.x + axUx * ext * 0.25, SST.y + axUy * ext * 0.25);
    ctx.stroke();

    if (!pa || !pp) { ctx.restore(); return; }

    const SPA = imgToScreen(pa, t);
    const SPP = imgToScreen(pp, t);
    const platMidX = (SPA.x + SPP.x) / 2;
    const platMidY = (SPA.y + SPP.y) / 2;

    // perpendicular to shaft axis through plateau midpoint (90° CCW)
    const perpUx = axUy, perpUy = -axUx;
    const refLen = ext * 0.30;

    // Draw perpendicular reference (0° cut line)
    ctx.strokeStyle = "#94a3b877"; ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(platMidX - perpUx * refLen, platMidY - perpUy * refLen);
    ctx.lineTo(platMidX + perpUx * refLen, platMidY + perpUy * refLen);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("0°", platMidX + perpUx * refLen + 6, platMidY + perpUy * refLen + 4);

    // Measured slope line through plateau points
    const platDx = SPP.x - SPA.x, platDy = SPP.y - SPA.y;
    const platLen2 = Math.hypot(platDx, platDy) || 1;
    const platUx = platDx / platLen2, platUy = platDy / platLen2;

    const slopeFlag  = tibSlopeResult?.slopeFlag || "normal";
    const slopeColor = slopeFlag === "normal" ? "#22d3ee" : slopeFlag === "watch" ? "#fbbf24" : "#f87171";

    ctx.strokeStyle = slopeColor; ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(platMidX - platUx * refLen * 0.85, platMidY - platUy * refLen * 0.85);
    ctx.lineTo(platMidX + platUx * refLen * 0.85, platMidY + platUy * refLen * 0.85);
    ctx.stroke();

    if (tibSlopeResult) {
      // Determine rotation sign: which way perpendicular must rotate to reach plateau line
      const perpAngle = Math.atan2(perpUy, perpUx);
      const platAngle = Math.atan2(platUy, platUx);
      let diff = platAngle - perpAngle;
      while (diff >  Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const rotSign = diff >= 0 ? 1 : -1;

      // Planned cut line at slopeDeg from perpendicular
      const planRad = (slopeDeg * Math.PI / 180) * rotSign;
      const planUx  = perpUx * Math.cos(planRad) - perpUy * Math.sin(planRad);
      const planUy  = perpUx * Math.sin(planRad) + perpUy * Math.cos(planRad);

      ctx.strokeStyle = "#a78bfacc"; ctx.lineWidth = 2.2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(platMidX - planUx * refLen * 0.9, platMidY - planUy * refLen * 0.9);
      ctx.lineTo(platMidX + planUx * refLen * 0.9, platMidY + planUy * refLen * 0.9);
      ctx.stroke();

      const arcR = Math.max(28, Math.min(55, refLen * 0.22));

      // Arc: measured slope
      const aS = Math.min(perpAngle, perpAngle + diff);
      const aE = Math.max(perpAngle, perpAngle + diff);
      ctx.strokeStyle = slopeColor; ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(platMidX, platMidY, arcR, aS, aE); ctx.stroke();
      const midA1 = (aS + aE) / 2;
      const tx1 = platMidX + Math.cos(midA1) * (arcR + 12);
      const ty1 = platMidY + Math.sin(midA1) * (arcR + 12);
      ctx.font = "bold 12px sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.strokeText(`${tibSlopeResult.slope}°`, tx1, ty1);
      ctx.fillStyle = slopeColor; ctx.fillText(`${tibSlopeResult.slope}°`, tx1, ty1);

      // Arc: planned slope
      const planAngle = perpAngle + planRad;
      const bS = Math.min(perpAngle, planAngle);
      const bE = Math.max(perpAngle, planAngle);
      ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(platMidX, platMidY, arcR * 1.55, bS, bE); ctx.stroke();
      const midA2 = (bS + bE) / 2;
      const tx2 = platMidX + Math.cos(midA2) * (arcR * 1.55 + 12);
      const ty2 = platMidY + Math.sin(midA2) * (arcR * 1.55 + 12);
      ctx.font = "bold 12px sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.strokeText(`${slopeDeg}°`, tx2, ty2);
      ctx.fillStyle = "#a78bfa"; ctx.fillText(`${slopeDeg}°`, tx2, ty2);
    }

    ctx.restore();
  }, [latPoints, tibSlopeResult, slopeDeg]);

  // ── AP axis shadow overlay ───────────────────────────────────────────────────
  const drawAPOverlay = useCallback((ctx, t) => {
    drawAxisShadowOverlay(ctx, t, points, hka);
  }, [points, hka]);

  // ── Planning cut overlays (shown on actual X-ray in planning step) ────────────

  // ── Lateral file input ───────────────────────────────────────────────────────
  const handleLatUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageSrcLateral(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleExportPDF = useCallback(async () => {
    await exportPDF({
      operatedSide, hka, alignment, plan, implantRec,
      imgEl: imgRef.current,
      latImgEl: latImgRef.current,
      points,
      latPoints,
      tibSlopeResult,
      landmarkDefs: AP_LANDMARKS,
      displayOptions,
    });
  }, [operatedSide, hka, alignment, plan, implantRec, points, latPoints, tibSlopeResult, displayOptions]);

  const handleReset = () => {
    resetPoints();
    resetLatPoints();
    setManualActiveIndex(null);
    setLatManualActiveIndex(null);
    setValgusDeg(6); setSlopeDeg(5); setTibResectionMm(10); setImplantType("PS"); setJointLineDev(0);
    setActiveView("ap");
    setImageSrcLateral(null);
  };

  const onSidebarDragStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev) => setSidebarWidth(Math.min(600, Math.max(240, startW + (startX - ev.clientX))));
    const onUp   = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth]);

  if (!open) return null;

  const bg = isDark ? "#0f172a" : "#f8fafc";
  const bgPanel = isDark ? "#1e293b" : "#ffffff";
  const border  = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textMain = isDark ? "#f1f5f9" : "#0f172a";
  const textSub  = isDark ? "#94a3b8" : "#64748b";

  const activeDef = AP_LANDMARKS[activeIndex] || AP_LANDMARKS[0];

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="pretka-modal"
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="relative flex overflow-hidden rounded-2xl shadow-2xl"
          style={{ width: "min(1400px, 96vw)", height: "min(860px, 92vh)", background: bg }}
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* ── Canvas area ── */}
          <div className="relative min-w-0 flex-1">
            {/* top bar */}
            <div
              className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: "rgba(15,23,42,0.78)", backdropFilter: "blur(8px)" }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-white">Pre-Op TKA Planning</span>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-black text-blue-300"
                  style={{ background: "rgba(37,99,235,0.25)" }}>
                  {operatedSide === "Right" ? "Kanan" : "Kiri"}
                </span>

                {/* AP / Lateral view toggle */}
                {step === "deformity" && (
                  <div className="flex overflow-hidden rounded-lg border" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    {[{ v: "ap", label: "AP" }, { v: "lateral", label: "Lateral" }].map(({ v, label }) => (
                      <button key={v} onClick={() => setActiveView(v)}
                        className="px-3 py-0.5 text-[10px] font-black transition-colors"
                        style={{
                          background: activeView === v ? "rgba(59,130,246,0.55)" : "transparent",
                          color:      activeView === v ? "#fff" : "#94a3b8",
                          borderRight: v === "ap" ? "1px solid rgba(255,255,255,0.15)" : "none",
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* count badge */}
                {step === "deformity" && activeView === "ap" && imageSrc && (
                  <span className="rounded-md px-2 py-0.5 text-[10px] font-black text-emerald-300"
                    style={{ background: "rgba(16,185,129,0.18)" }}>
                    {completedCount}/{AP_LANDMARKS.length}
                  </span>
                )}
                {step === "deformity" && activeView === "lateral" && (
                  <span className="rounded-md px-2 py-0.5 text-[10px] font-black text-orange-300"
                    style={{ background: "rgba(249,115,22,0.18)" }}>
                    {latCompletedCount}/{LAT_LANDMARKS.length}
                  </span>
                )}
              </div>

              {/* display toggles */}
              {step === "deformity" && (
                <div className="flex items-center gap-1">
                  {[
                    { key: "points", Icon: CircleDot, title: "Titik landmark" },
                    { key: "lines",  Icon: Spline,    title: "Garis penghubung" },
                    { key: "text",   Icon: Type,       title: "Label teks" },
                  ].map(({ key, Icon, title }) => (
                    <button key={key} title={title} onClick={() => toggleDisplay(key)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors"
                      style={{
                        background:   displayOptions[key] ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.07)",
                        borderColor:  displayOptions[key] ? "#3b82f6" : "rgba(255,255,255,0.12)",
                        color:        displayOptions[key] ? "#60a5fa" : "#94a3b8",
                      }}>
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                  <div className="mx-1 h-4 w-px" style={{ background: "rgba(255,255,255,0.12)" }} />
                  <button title="Zoom in"  onClick={() => zoom("in")}  className="flex h-7 w-7 items-center justify-center rounded-lg border text-slate-400 transition-colors hover:text-white" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)" }}><ZoomIn  className="h-3.5 w-3.5" /></button>
                  <button title="Zoom out" onClick={() => zoom("out")} className="flex h-7 w-7 items-center justify-center rounded-lg border text-slate-400 transition-colors hover:text-white" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)" }}><ZoomOut className="h-3.5 w-3.5" /></button>
                </div>
              )}

              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* hidden lateral file input */}
            <input ref={latFileRef} type="file" accept="image/*" className="hidden" onChange={handleLatUpload} />

            {/* canvas */}
            <div className="absolute inset-0 pt-12">
              {step === "deformity" && activeView === "ap" ? (
                <LandmarkCanvas
                  imageSrc={imageSrc}
                  points={points}
                  landmarkDefs={AP_LANDMARKS}
                  connections={AP_CONNECTIONS}
                  displayOptions={displayOptions}
                  activeIndex={activeIndex}
                  setPoints={setPointsAndAdvance}
                  setPointsLive={setPointsLive}
                  transform={transform}
                  setTransform={setTransform}
                  canvasRef={canvasRef}
                  drawOverlay={drawAPOverlay}
                />
              ) : step === "deformity" && activeView === "lateral" ? (
                <div className="relative h-full w-full">
                  <LandmarkCanvas
                    imageSrc={imageSrcLateral}
                    points={latPoints}
                    landmarkDefs={LAT_LANDMARKS}
                    connections={LAT_CONNECTIONS}
                    displayOptions={displayOptions}
                    activeIndex={latActiveIndex}
                    setPoints={setLatPointsAndAdvance}
                    setPointsLive={setLatPointsLive}
                    transform={latTransform}
                    setTransform={setLatTransform}
                    canvasRef={latCanvasRef}
                    drawOverlay={drawLateralOverlay}
                  />
                  {/* Upload lateral button when no image */}
                  {!imageSrcLateral && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="pointer-events-auto flex flex-col items-center gap-2">
                        <Camera className="h-10 w-10 text-slate-500" />
                        <p className="text-sm font-black text-slate-400">Upload Foto Lateral Lutut</p>
                        <p className="text-[11px] text-slate-500">Foto lateral untuk pengukuran posterior tibial slope (PSA)</p>
                        <button
                          onClick={() => latFileRef.current?.click()}
                          className="mt-1 rounded-xl px-5 py-2.5 text-[11px] font-black text-white"
                          style={{ background: "#ea580c" }}>
                          Pilih Foto Lateral
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Replace photo button */}
                  {imageSrcLateral && (
                    <button
                      onClick={() => latFileRef.current?.click()}
                      className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black text-white"
                      style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <Camera className="h-3.5 w-3.5" /> Ganti Foto
                    </button>
                  )}
                </div>
              ) : (
                /* planning/result step: X-ray with cut-plan overlays */
                <div className="h-full overflow-y-auto p-4" style={{ background: "#0c1526" }}>
                  <div className="grid grid-cols-2 gap-4">
                    <LatCutPlanCanvas
                      imageSrc={imageSrcLateral}
                      latPts={latPoints}
                      slopeDeg={slopeDeg}
                      operatedSide={operatedSide}
                      cutMode={latCutMode}      setCutMode={setLatCutMode}
                      cutOffset={latCutOffset}  setCutOffset={setLatCutOffset}
                      cutWidth={latCutW}        setCutWidth={setLatCutW}
                    />
                    <APCutPlanCanvas
                      imageSrc={imageSrc}
                      pts={points}
                      valgusDeg={valgusDeg}
                      operatedSide={operatedSide}
                      hka={hka}
                      femOffset={femCutOffset}  setFemOffset={setFemCutOffset}
                      tibOffset={tibCutOffset}  setTibOffset={setTibCutOffset}
                      femWidth={femCutW}        setFemWidth={setFemCutW}
                      tibWidth={tibCutW}        setTibWidth={setTibCutW}
                    />
                    {/* Implant rec panel */}
                    {implantRec && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.12 }} style={glassCard}
                        className="col-span-1"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: implantRec.color }}>Rekomendasi Implant</p>
                        <p className="text-[11px] font-black text-white">{implantRec.type}</p>
                        {hka && (
                          <p className="mt-1 text-[9px] text-slate-400">
                            HKA {hka.deformityType} {Math.abs(hka.deviation)}° · {hka.severity}
                          </p>
                        )}
                        {alignment && (
                          <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] text-slate-400">
                            <span>MDFA {alignment.MDFA}°</span>
                            <span>MPTA {alignment.MPTA}°</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                    {/* Gaps balancing estimation */}
                    <GapsBalancingPanel tibResectionMm={tibResectionMm} implantType={implantType} />
                  </div>
                </div>
              )}
            </div>

            {/* active landmark hint */}
            {step === "deformity" && activeView === "ap" && !allPlaced && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-xl px-4 py-2"
                  style={{ background: "rgba(15,23,42,0.88)", border: `1px solid ${activeDef.color}44` }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: activeDef.color }} />
                  <span className="text-xs font-black text-white">{activeDef.short}</span>
                  <span className="text-xs text-slate-300">{activeDef.hint}</span>
                </motion.div>
              </div>
            )}
            {step === "deformity" && activeView === "lateral" && imageSrcLateral && !allLatPlaced && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                {(() => {
                  const latDef = LAT_LANDMARKS[latActiveIndex] || LAT_LANDMARKS[0];
                  return (
                    <motion.div
                      key={latActiveIndex}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-xl px-4 py-2"
                      style={{ background: "rgba(15,23,42,0.88)", border: `1px solid ${latDef.color}44` }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: latDef.color }} />
                      <span className="text-xs font-black text-white">{latDef.short}</span>
                      <span className="text-xs text-slate-300">{latDef.hint}</span>
                    </motion.div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── Resize handle ── */}
          <div
            className="group relative flex w-2 shrink-0 cursor-col-resize select-none items-center justify-center"
            style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#e8edf2" }}
            onMouseDown={onSidebarDragStart}
          >
            <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ background: "rgba(59,130,246,0.18)" }} />
            <div className="relative z-10 flex flex-col gap-[3px]">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="h-[3px] w-[3px] rounded-full opacity-30 transition-opacity group-hover:opacity-90"
                  style={{ background: isDark ? "#94a3b8" : "#64748b" }} />
              ))}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div
            className="flex shrink-0 flex-col"
            style={{ width: sidebarWidth, borderLeft: `1px solid ${border}`, background: bgPanel }}
          >
            {/* Step navigation */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => {
                  const Icon = STEP_ICONS[i];
                  return (
                    <React.Fragment key={s}>
                      <motion.button
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[10px] font-black transition-colors"
                        style={{
                          background: i === stepIndex ? "#1d4ed8" : i < stepIndex ? (isDark ? "rgba(59,130,246,0.18)" : "#dbeafe") : (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"),
                          color: i === stepIndex ? "#fff" : i < stepIndex ? (isDark ? "#93c5fd" : "#1e40af") : (isDark ? "#94a3b8" : "#64748b"),
                        }}
                        onClick={() => setStep(s)}
                        whileTap={{ scale: 0.96 }}
                      >
                        {i < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">{STEP_LABELS[i]}</span>
                      </motion.button>
                      {i < STEPS.length - 1 && (
                        <div className="relative mx-0.5 h-px flex-1 max-w-[12px]" style={{ background: isDark ? "rgba(255,255,255,0.10)" : "#e2e8f0" }}>
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-blue-500"
                            animate={{ width: stepIndex > i ? "100%" : "0%" }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Side toggle */}
            <div className="px-4 pb-3">
              <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: border }}>
                {[{ key: "Right", label: "Kanan" }, { key: "Left", label: "Kiri" }].map(({ key, label }, idx) => (
                  <button key={key} className="flex-1 py-2 text-[11px] font-black transition-colors"
                    style={{
                      background: operatedSide === key ? "#2563eb" : "transparent",
                      color: operatedSide === key ? "#fff" : textSub,
                      borderRight: idx === 0 ? `1px solid ${border}` : "none",
                    }}
                    onClick={() => setOperatedSide(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {step === "deformity" ? (
                  <motion.div key="deformity"
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex h-full flex-col overflow-hidden"
                  >
                    {/* Landmark list */}
                    <div className="min-h-0 flex-1 overflow-y-auto px-4">
                      {activeView === "ap" ? (
                        <>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wider" style={{ color: textSub }}>
                            Landmark AP ({completedCount}/{AP_LANDMARKS.length})
                          </p>
                          <motion.div className="space-y-1.5"
                            variants={{ show: { transition: { staggerChildren: 0.045 } } }}
                            initial="hidden" animate="show"
                          >
                            {AP_LANDMARKS.map((def, i) => {
                              const placed = !!points[def.key];
                              const isActive = i === activeIndex;
                              return (
                                <motion.div key={def.key}
                                  variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition-colors"
                                  style={{
                                    background: isActive ? (def.color + "18") : (isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                                    border: `1px solid ${isActive ? def.color + "60" : border}`,
                                  }}
                                  onClick={() => setManualActiveIndex(i)}
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black"
                                    style={{ background: placed ? def.color : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"), color: placed ? "#fff" : textSub }}>
                                    {placed ? <CheckCircle2 className="h-3 w-3" /> : (i + 1)}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[10px] font-black" style={{ color: isActive ? def.color : textMain }}>
                                      {def.short} — {def.label}
                                    </p>
                                  </div>
                                  {placed && points[def.key] && (
                                    <button onClick={(e) => { e.stopPropagation(); setPoints((p) => { const n = { ...p }; delete n[def.key]; return n; }); }}
                                      className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-red-400">
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </motion.div>
                              );
                            })}
                          </motion.div>

                          {/* Active hint card AP */}
                          {activeIndex < AP_LANDMARKS.length && (
                            <motion.div className="mt-3 overflow-hidden rounded-xl border"
                              key={activeIndex}
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                              style={{ borderColor: activeDef.color + "60", background: activeDef.color + "0d" }}
                            >
                              <div className="flex items-start gap-0">
                                <div className="w-1 shrink-0 self-stretch rounded-l-xl" style={{ background: activeDef.color }} />
                                <div className="flex-1 p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[12px] font-black" style={{ color: activeDef.color }}>
                                      {activeDef.short} — {activeDef.label}
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400">(→)</span>
                                  </div>
                                  <p className="mt-1 text-[10px] leading-relaxed" style={{ color: textSub }}>{activeDef.hint}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Quick results AP */}
                          {hka && (
                            <div className="mt-3 grid grid-cols-2 gap-2 pb-2">
                              <DeformityCard label="HKA" value={`${hka.hka}°`}
                                range={`${hka.deformityType} ${Math.abs(hka.deviation)}°`}
                                flag={hka.hkaFlag} isDark={isDark} />
                              {alignment && (
                                <DeformityCard label="MDFA" value={`${alignment.MDFA}°`}
                                  range={`Dev ${alignment.mdfaDev > 0 ? "+" : ""}${alignment.mdfaDev}°`}
                                  flag={alignment.mdfaFlag} isDark={isDark} />
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Lateral view sidebar */
                        <>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: textSub }}>
                              Landmark Lateral ({latCompletedCount}/{LAT_LANDMARKS.length})
                            </p>
                            {!imageSrcLateral && (
                              <button onClick={() => latFileRef.current?.click()}
                                className="text-[9px] font-black px-2 py-0.5 rounded-lg"
                                style={{ background: "rgba(234,88,12,0.18)", color: "#f97316" }}>
                                Upload
                              </button>
                            )}
                          </div>
                          <motion.div className="space-y-1.5"
                            variants={{ show: { transition: { staggerChildren: 0.045 } } }}
                            initial="hidden" animate="show"
                          >
                            {LAT_LANDMARKS.map((def, i) => {
                              const placed = !!latPoints[def.key];
                              const isActive = i === latActiveIndex;
                              return (
                                <motion.div key={def.key}
                                  variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition-colors"
                                  style={{
                                    background: isActive ? (def.color + "18") : (isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                                    border: `1px solid ${isActive ? def.color + "60" : border}`,
                                  }}
                                  onClick={() => setLatManualActiveIndex(i)}
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black"
                                    style={{ background: placed ? def.color : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"), color: placed ? "#fff" : textSub }}>
                                    {placed ? <CheckCircle2 className="h-3 w-3" /> : (i + 1)}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[10px] font-black" style={{ color: isActive ? def.color : textMain }}>
                                      {def.short} — {def.label}
                                    </p>
                                  </div>
                                  {placed && latPoints[def.key] && (
                                    <button onClick={(e) => { e.stopPropagation(); setLatPoints((p) => { const n = { ...p }; delete n[def.key]; return n; }); }}
                                      className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-red-400">
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </motion.div>
                              );
                            })}
                          </motion.div>

                          {/* Active hint card lateral */}
                          {latActiveIndex < LAT_LANDMARKS.length && imageSrcLateral && (
                            <motion.div className="mt-3 overflow-hidden rounded-xl border"
                              key={latActiveIndex}
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                              style={{ borderColor: LAT_LANDMARKS[latActiveIndex].color + "60", background: LAT_LANDMARKS[latActiveIndex].color + "0d" }}
                            >
                              <div className="flex items-start gap-0">
                                <div className="w-1 shrink-0 self-stretch rounded-l-xl" style={{ background: LAT_LANDMARKS[latActiveIndex].color }} />
                                <div className="flex-1 p-3">
                                  <p className="text-[11px] font-black" style={{ color: LAT_LANDMARKS[latActiveIndex].color }}>
                                    {LAT_LANDMARKS[latActiveIndex].short} — {LAT_LANDMARKS[latActiveIndex].label}
                                  </p>
                                  <p className="mt-1 text-[10px] leading-relaxed" style={{ color: textSub }}>{LAT_LANDMARKS[latActiveIndex].hint}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* PSA result card */}
                          {tibSlopeResult && (
                            <div className="mt-3 grid grid-cols-1 gap-2 pb-2">
                              <DeformityCard
                                label="Posterior Tibial Slope"
                                value={`${tibSlopeResult.slope}°`}
                                range={`${tibSlopeResult.dir} · ${tibSlopeResult.slopeText || ""}`}
                                flag={tibSlopeResult.slopeFlag}
                                isDark={isDark}
                              />
                              <div className="rounded-xl border p-2.5 space-y-1.5" style={{ borderColor: border, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc" }}>
                                <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: textSub }}>Sync ke Rencana</p>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px]" style={{ color: textSub }}>PSA terukur: <span className="font-black" style={{ color: "#22d3ee" }}>{tibSlopeResult.slope}°</span></p>
                                  <button
                                    onClick={() => setSlopeDeg(Math.round(tibSlopeResult.slope * 2) / 2)}
                                    className="rounded-lg px-2 py-1 text-[9px] font-black text-white"
                                    style={{ background: "#0ea5e9" }}>
                                    Pakai Nilai Ini
                                  </button>
                                </div>
                                <p className="text-[9px]" style={{ color: textSub }}>
                                  Target PS: 3–5° · CR: 5–7°. Nilai saat ini: <span className="font-black" style={{ color: "#a78bfa" }}>{slopeDeg}°</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Deformity nav footer */}
                    <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: border }}>
                      {activeView === "lateral" && tibSlopeResult && (
                        <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                          style={{ background: "rgba(22,211,153,0.10)", border: "1px solid rgba(22,211,153,0.22)" }}>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          <p className="text-[9px] font-black text-emerald-300">PSA terukur: {tibSlopeResult.slope}° · sudah terhitung dalam rencana</p>
                        </div>
                      )}
                      <button
                        className="w-full rounded-xl py-2.5 text-sm font-black text-white transition-opacity"
                        style={{ background: allPlaced ? "#2563eb" : "#64748b" }}
                        onClick={() => setStep("planning")}
                      >
                        {allPlaced ? "Lanjut ke Rencana Potongan" : `Tempatkan ${AP_LANDMARKS.length - completedCount} titik AP lagi`}
                        <ChevronRight className="ml-1 inline h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : step === "planning" ? (
                  <motion.div key="planning"
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex h-full flex-col overflow-hidden"
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: textSub }}>
                        Parameter Potongan
                      </p>

                      {/* Femoral Resection Angle — Tanzer 2016: 5–7° (range 3–11°, Mullaji et al.) */}
                      <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: border, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black" style={{ color: textSub }}>Femoral Distal</p>
                          <p className="text-[9px]" style={{ color: textSub }}>Tanzer 2016: 5–7°, max 11°</p>
                        </div>
                        <SliderRow
                          label="Femoral Resection Angle" value={valgusDeg} min={3} max={11} step={0.5}
                          color="#38bdf8" onChange={setValgusDeg} range="Valgus (3–11°)"
                        />
                        <p className="text-[9px] leading-relaxed" style={{ color: textSub }}>
                          Perbedaan antara mechanical axis dan anatomic axis femur. Digunakan pada intramedullary guide untuk mendapatkan potongan tegak lurus terhadap mechanical axis.
                        </p>

                        {/* ── Alignment strategy (MA vs KA) ── */}
                        {hka && alignment && (() => {
                          const maTarg = Math.round(Math.min(11, Math.max(3, 90 - alignment.MDFA)) * 2) / 2;
                          const kaTarg = 5.5;
                          // predicted residual: 0=neutral, negative=varus residual (under-corrected), positive=valgus residual (over-corrected)
                          const predicted  = Math.round((valgusDeg - maTarg) * 10) / 10;
                          const predKA     = Math.round((kaTarg - maTarg) * 10) / 10;
                          const predColor  = Math.abs(predicted) < 2 ? "#34d399" : Math.abs(predicted) < 5 ? "#fbbf24" : "#f87171";
                          const predLabel  = predicted === 0 ? "Netral ✓"
                            : predicted < 0 ? `${Math.abs(predicted)}° Varus residual`
                            : `${predicted}° Valgus residual`;
                          return (
                            <div className="space-y-2 border-t pt-2.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#38bdf8" }}>
                                Target Alignment
                              </p>

                              <div className="grid grid-cols-2 gap-2">
                                {/* Mechanical Alignment */}
                                <button
                                  onClick={() => setValgusDeg(maTarg)}
                                  className="rounded-xl p-2.5 text-left transition-all"
                                  style={{
                                    background: valgusDeg === maTarg ? "#38bdf822" : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${valgusDeg === maTarg ? "#38bdf877" : "rgba(255,255,255,0.09)"}`,
                                  }}>
                                  <p className="text-[8px] font-black uppercase tracking-wide" style={{ color: "#38bdf8" }}>Mekanikal (MA)</p>
                                  <p className="text-[17px] font-black leading-tight my-0.5" style={{ color: "#38bdf8" }}>{maTarg}°</p>
                                  <p className="text-[8px]" style={{ color: "#64748b" }}>HKA → 180° netral</p>
                                  {valgusDeg === maTarg && (
                                    <p className="mt-1 text-[7px] font-black" style={{ color: "#38bdf8" }}>✓ AKTIF</p>
                                  )}
                                </button>

                                {/* Kinematic Alignment */}
                                <button
                                  onClick={() => setValgusDeg(kaTarg)}
                                  className="rounded-xl p-2.5 text-left transition-all"
                                  style={{
                                    background: valgusDeg === kaTarg ? "#818cf822" : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${valgusDeg === kaTarg ? "#818cf877" : "rgba(255,255,255,0.09)"}`,
                                  }}>
                                  <p className="text-[8px] font-black uppercase tracking-wide" style={{ color: "#818cf8" }}>Kinematikal (KA)</p>
                                  <p className="text-[17px] font-black leading-tight my-0.5" style={{ color: "#818cf8" }}>{kaTarg}°</p>
                                  <p className="text-[8px]" style={{ color: "#64748b" }}>
                                    {predKA === 0 ? "HKA netral"
                                      : predKA < 0 ? `${Math.abs(predKA)}° varus residual`
                                      : `${predKA}° valgus residual`}
                                  </p>
                                  {valgusDeg === kaTarg && (
                                    <p className="mt-1 text-[7px] font-black" style={{ color: "#818cf8" }}>✓ AKTIF</p>
                                  )}
                                </button>
                              </div>

                              {/* Predicted HKA for current valgusDeg */}
                              <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <span className="text-[9px]" style={{ color: "#64748b" }}>
                                  Prediksi HKA · IM Guide {valgusDeg}°
                                </span>
                                <span className="text-[11px] font-black" style={{ color: predColor }}>
                                  {predLabel}
                                </span>
                              </div>

                              <p className="text-[8px] leading-relaxed" style={{ color: "#475569" }}>
                                MA: koreksi penuh ke netral (standar global). KA: pertahankan orientasi kondil native — residual deformitas diterima secara klinis jika &lt; 5°.
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Tibial — tegak lurus mechanical axis, ~10mm resection */}
                      <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: border, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black" style={{ color: textSub }}>Tibial Proksimal</p>
                          <p className="text-[9px]" style={{ color: textSub }}>Tanzer 2016: ~10mm</p>
                        </div>
                        <SliderRow
                          label="Posterior Tibial Slope" value={slopeDeg} min={0} max={12} step={0.5}
                          color="#14b8a6" onChange={setSlopeDeg}
                          range={implantType === "CR" ? "5–7° (CR)" : "3–5° (PS)"}
                        />
                        {hka?.deformityType === "Valgus" && (
                          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                            style={{ background: "rgba(20,184,166,0.10)", border: "1px solid rgba(20,184,166,0.22)" }}>
                            <p className="flex-1 text-[9px] leading-relaxed" style={{ color: "#5eead4" }}>
                              Valgus: PSA 0° cegah fleksi instabilitas post-op
                            </p>
                            <button
                              onClick={() => setSlopeDeg(0)}
                              className="shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-black text-white"
                              style={{ background: slopeDeg === 0 ? "#0f766e" : "#14b8a6" }}>
                              {slopeDeg === 0 ? "✓ 0°" : "Set 0°"}
                            </button>
                          </div>
                        )}
                        <SliderRow
                          label="Tibial Resection" value={tibResectionMm} min={6} max={14} step={0.5}
                          color="#a78bfa" onChange={setTibResectionMm} unit=" mm"
                          range="~10mm (sisi unaffected)"
                        />
                        <p className="text-[9px] leading-relaxed" style={{ color: textSub }}>
                          Potongan tegak lurus mechanical axis tibial. Reseksi dari sisi yang tidak terkena (unaffected), atau dari level plateau pre-artritik.
                        </p>
                      </div>

                      {/* Implant type — Tanzer 2016 Table 1 */}
                      <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: border, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black" style={{ color: textSub }}>Desain Implant</p>
                          {implantRec && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ background: implantRec.color + "22", color: implantRec.color }}>Rekomendasi: {implantRec.type.split(" ")[0]}</span>}
                        </div>
                        <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: border }}>
                          {[
                            { key: "CR", label: "CR TKA", color: "#22d3ee" },
                            { key: "PS", label: "PS TKA", color: "#60a5fa" },
                            { key: "VVC", label: "VVC TKA", color: "#f59e0b" },
                          ].map(({ key, label, color }, idx) => (
                            <button key={key} className="flex-1 py-1.5 text-[10px] font-black transition-colors"
                              style={{
                                background: implantType === key ? color : "transparent",
                                color: implantType === key ? "#fff" : textSub,
                                borderRight: idx < 2 ? `1px solid ${border}` : "none",
                              }}
                              onClick={() => setImplantType(key)}>
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] leading-relaxed" style={{ color: textSub }}>
                          {implantType === "CR" ? "Cruciate-Retaining: PCL dipertahankan. Cocok untuk deformitas ringan dengan ligamen intak."
                            : implantType === "PS" ? "Posterior Stabilized: PCL disubstitusi. Lebih versatile untuk berbagai deformitas. Standar pada sebagian besar kasus."
                            : "Varus-Valgus Constrained: Untuk deformitas koronal berat, MCL kompromis, atau instabilitas residual setelah release."}
                        </p>
                      </div>

                      {/* Joint line */}
                      <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: border, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black" style={{ color: textSub }}>Joint Line</p>
                          <p className="text-[9px]" style={{ color: textSub }}>Tanzer 2016: preserve anatomical level</p>
                        </div>
                        <SliderRow
                          label="Deviasi Joint Line" value={jointLineDev} min={-5} max={5} step={0.5}
                          color="#f472b6" onChange={setJointLineDev} unit=" mm" range="±5 mm"
                        />
                        <p className="text-[9px] leading-relaxed" style={{ color: textSub }}>
                          Elevasi proksimal → pseudopatella baja. Distal shift → subluksasi patela. Target: pertahankan posisi anatomis.
                        </p>
                      </div>
                    </div>

                    {/* Planning nav footer */}
                    <div className="flex gap-2 border-t px-4 py-3" style={{ borderColor: border }}>
                      <button className="flex h-9 items-center justify-center rounded-xl border px-3 text-[11px] font-black transition-colors"
                        style={{ borderColor: border, color: textSub }}
                        onClick={() => setStep("deformity")}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Kembali
                      </button>
                      <button className="flex-1 rounded-xl py-2 text-sm font-black text-white"
                        style={{ background: "#2563eb" }}
                        onClick={() => setStep("result")}>
                        Lihat Hasil <ChevronRight className="ml-1 inline h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="result"
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex h-full flex-col overflow-hidden"
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 space-y-3">
                      {/* Deformity summary */}
                      {hka ? (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: textSub }}>Deformitas Pre-Op (Tanzer 2016)</p>
                          <div className="grid grid-cols-2 gap-2">
                            <DeformityCard
                              label="HKA Angle"
                              value={`${Math.abs(hka.deviation)}°`}
                              range={`${hka.deformityType} · ${hka.severity}`}
                              flag={hka.hkaFlag} isDark={isDark} />
                            {alignment && <DeformityCard label="MDFA" value={`${alignment.MDFA}°`}
                              range={`Dev ${alignment.mdfaDev > 0 ? "+" : ""}${alignment.mdfaDev}° (ref 90°)`}
                              flag={alignment.mdfaFlag} isDark={isDark} />}
                            {alignment && <DeformityCard label="MPTA" value={`${alignment.MPTA}°`}
                              range={`Dev ${alignment.mptaDev > 0 ? "+" : ""}${alignment.mptaDev}° (ref 90°)`}
                              flag={alignment.mptaFlag} isDark={isDark} />}
                            {alignment && <DeformityCard label="MDFA+MPTA" value={`${alignment.combined}°`}
                              range="Target 175–185°"
                              flag={alignment.combinedFlag} isDark={isDark} />}
                          {tibSlopeResult && <DeformityCard label="PSA (Lateral)"
                              value={`${tibSlopeResult.slope}°`}
                              range={`${tibSlopeResult.dir} · ${tibSlopeResult.slopeText || ""}`}
                              flag={tibSlopeResult.slopeFlag} isDark={isDark} />}
                          </div>

                          {/* Implant recommendation — Figure 7 Tanzer 2016 */}
                          {implantRec && (
                            <div className="rounded-xl border p-3" style={{ borderColor: implantRec.color + "55", background: implantRec.color + "10" }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: implantRec.color }}>Rekomendasi Implant</p>
                                <span className="text-[9px] font-black text-slate-400">Fig. 7, Tanzer 2016</span>
                              </div>
                              <p className="text-[11px] font-black mb-1" style={{ color: implantRec.color }}>{implantRec.type}</p>
                              <p className="text-[9px] leading-relaxed" style={{ color: textSub }}>{implantRec.detail}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                          <AlertCircle className="h-8 w-8" style={{ color: textSub }} />
                          <p className="text-sm font-black" style={{ color: textSub }}>Landmark belum lengkap</p>
                          <p className="text-[11px]" style={{ color: textSub }}>Kembali ke tab Deformitas dan tempatkan semua titik landmark.</p>
                          <button className="mt-2 rounded-xl px-4 py-2 text-[11px] font-black text-white"
                            style={{ background: "#2563eb" }}
                            onClick={() => setStep("deformity")}>
                            Ke Deformitas
                          </button>
                        </div>
                      )}

                      {/* Planning summary */}
                      {hka && (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: textSub }}>Rencana Potongan</p>
                          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: border, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc" }}>
                            {[
                              ["Femoral Resection Angle", `${valgusDeg}° valgus`, "#38bdf8"],
                              ["Posterior Tibial Slope",  `${slopeDeg}°`, "#14b8a6"],
                              ["Tibial Resection",        `${tibResectionMm} mm`, "#a78bfa"],
                              ["Desain Implant",          `${implantType} TKA`, "#818cf8"],
                              ["Deviasi Joint Line",      `${jointLineDev > 0 ? "+" : ""}${jointLineDev} mm`, "#f472b6"],
                            ].map(([label, value, color]) => (
                              <div key={label} className="flex items-center justify-between">
                                <span className="text-[10px]" style={{ color: textSub }}>{label}</span>
                                <span className="text-[11px] font-black" style={{ color }}>{value}</span>
                              </div>
                            ))}
                          </div>

                          {/* Clinical notes based on alignment */}
                          {alignment && (
                            <div className="rounded-xl border p-3 space-y-1.5"
                              style={{ borderColor: border, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc" }}>
                              <p className="text-[10px] font-black" style={{ color: textSub }}>Catatan Klinis</p>
                              {[alignment.mdfaText, alignment.mptaText, alignment.combinedText].map((t, i) => (
                                <p key={i} className="text-[9px] leading-relaxed" style={{ color: textSub }}>{t}</p>
                              ))}
                              <p className="text-[9px] leading-relaxed pt-1" style={{ color: textSub }}>
                                {implantType === "PS"
                                  ? `Target PSA ${slopeDeg}° — pada PS implant, pertimbangkan reduksi slope untuk mencegah cam-post impingement.`
                                  : implantType === "CR"
                                  ? `Target PSA ${slopeDeg}° — pada CR implant, restorasi PSA anatomi (5–7°) optimal untuk ROM post-op.`
                                  : `VVC TKA: potongan tetap tegak lurus mechanical axis. Siapkan augment tibial jika bone defect > 5mm.`}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Result footer */}
                    <div className="flex flex-col gap-2 border-t px-4 py-3" style={{ borderColor: border }}>
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black text-white transition-opacity disabled:opacity-40"
                        style={{ background: "#2563eb" }}
                        disabled={!hka}
                        onClick={handleExportPDF}
                      >
                        <Download className="h-4 w-4" /> Export PDF
                      </button>
                      <div className="flex gap-2">
                        <button className="flex h-9 flex-1 items-center justify-center rounded-xl border text-[11px] font-black transition-colors"
                          style={{ borderColor: border, color: textSub }}
                          onClick={() => setStep("planning")}>
                          <ChevronLeft className="mr-1 h-4 w-4" /> Rencana
                        </button>
                        <button className="flex h-9 flex-1 items-center justify-center rounded-xl border text-[11px] font-black text-red-400 transition-colors hover:bg-red-500/10"
                          style={{ borderColor: border }}
                          onClick={handleReset}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Camera / upload prompt */}
            {!imageSrc && (
              <div className="border-t px-4 py-3" style={{ borderColor: border }}>
                <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9" }}>
                  <Camera className="h-4 w-4 shrink-0" style={{ color: textSub }} />
                  <p className="text-[10px]" style={{ color: textSub }}>Pilih X-Ray AP lutut dari panel utama untuk mulai analisis.</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
