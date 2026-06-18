"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Side = "Right" | "Left";
type Tab = "tka" | "tha";

// ─── Color scheme matching XrayCalibrationWorkspace ──────────────────────────

const C = {
  femur:    { R: "#38bdf8", L: "#f97316" },
  tibSlope: { R: "#14b8a6", L: "#f43f5e" },
  tibCut:   { Valgus: "#eab308", Varus: "#a855f7" },
  hipCup:   { R: "#6366f1", L: "#ec4899" },
  hipStem:  { R: "#22c55e", L: "#fb923c" },
};

// ─── Glass card style helper ──────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(10px)",
  borderRadius: "20px",
  padding: "16px",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function degToRad(d: number) { return (d * Math.PI) / 180; }

function arcPath(cx: number, cy: number, r: number, aDeg: number, bDeg: number): string {
  const a = degToRad(aDeg), b = degToRad(bDeg);
  const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
  const x2 = cx + r * Math.cos(b), y2 = cy + r * Math.sin(b);
  const large = Math.abs(bDeg - aDeg) > 180 ? 1 : 0;
  const sweep = bDeg > aDeg ? 1 : 0;
  return `M${x1},${y1}A${r},${r},0,${large},${sweep},${x2},${y2}`;
}

// ─── RangeChip ────────────────────────────────────────────────────────────────

function RangeChip({ label, range, current, color }: {
  label: string; range: string; current: number; color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px] font-bold text-slate-300">{range}</span>
      <span className="ml-auto rounded-lg px-1.5 py-0.5 text-[9px] font-black text-white"
        style={{ backgroundColor: color }}
      >
        {current}°
      </span>
    </div>
  );
}

// ─── SliderRow ────────────────────────────────────────────────────────────────

function SliderRow({
  label, value, min, max, step = 0.5, color, onChange, unit = "°",
}: {
  label: string; value: number; min: number; max: number; step?: number;
  color: string; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[10px] font-black text-slate-300">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5"
        style={{ accentColor: color }}
      />
      <span className="w-10 text-right text-[10px] font-mono font-black"
        style={{ color }}
      >
        {value}{unit}
      </span>
    </label>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ label, color }: { label: string; color: "green" | "amber" | "red" | "blue" }) {
  const colors = {
    green: { bg: "rgba(34,197,94,0.18)", border: "rgba(34,197,94,0.4)", text: "#4ade80" },
    amber: { bg: "rgba(234,179,8,0.18)", border: "rgba(234,179,8,0.4)", text: "#facc15" },
    red:   { bg: "rgba(239,68,68,0.18)", border: "rgba(239,68,68,0.4)", text: "#f87171" },
    blue:  { bg: "rgba(99,102,241,0.18)", border: "rgba(99,102,241,0.4)", text: "#818cf8" },
  };
  const c = colors[color];
  return (
    <span className="rounded-lg px-2 py-0.5 text-[9px] font-black"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  );
}

// ─── Mini Gauge ───────────────────────────────────────────────────────────────

function MiniGauge({ value, min, max, color, label }: {
  value: number; min: number; max: number; color: string; label: string;
}) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[9px] text-slate-400">
        <span>{label}</span>
        <span style={{ color }} className="font-black">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: `${pct * 100}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}

// ─── Animated guide line helper ───────────────────────────────────────────────

function AnimLine({
  x1, y1, x2, y2, stroke, sw = 2.2, dash, opacity = 1, delay = 0,
}: {
  x1:number; y1:number; x2:number; y2:number; stroke:string;
  sw?:number; dash?:string; opacity?:number; delay?:number;
}) {
  const len = Math.hypot(x2-x1, y2-y1) || 1;
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

function AnimArc({
  cx, cy, r, startDeg, endDeg, stroke, sw = 1.8, delay = 0.2,
}: {
  cx:number; cy:number; r:number; startDeg:number; endDeg:number;
  stroke:string; sw?:number; delay?:number;
}) {
  const d = arcPath(cx, cy, r, startDeg, endDeg);
  const arcLen = r * Math.abs(endDeg - startDeg) * Math.PI / 180;
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={sw}
      strokeDasharray={`${arcLen}`}
      strokeDashoffset={arcLen}
      animate={{ strokeDashoffset: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
    />
  );
}

// ─── Panel: Distal Femur Valgus Cut (coronal) ─────────────────────────────────

function FemurPanel({ angleDeg, side, resectionMm }: {
  angleDeg: number; side: Side; resectionMm: number;
}) {
  const color = C.femur[side === "Right" ? "R" : "L"];
  const W = 420, H = 300;
  const cx = W / 2, yCut = H * 0.62;
  const baseX1 = 50, baseX2 = W - 50;
  const sign = side === "Right" ? 1 : -1;
  const tan = Math.tan(degToRad(angleDeg * sign));
  const cutY1 = yCut - tan * (baseX1 - cx);
  const cutY2 = yCut - tan * (baseX2 - cx);
  const arcR = 32, arcEnd = angleDeg * sign;

  // Resection depth line offset (1 px per mm for visual)
  const depthPx = resectionMm * 2.5;

  return (
    <motion.div key={`${side}-${angleDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ ...glassCard, padding: "12px" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Distal Femur Cut · {side}
          </p>
          <p className="text-xs font-black text-slate-200">Valgus {angleDeg}° · Coronal</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white"
          style={{ backgroundColor: color }}>
          {angleDeg}°
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Femur shaft fill */}
        <motion.rect
          x={cx - 22} y={12} width={44} height={yCut - 12}
          rx={10}
          fill={color} opacity={0.15}
          initial={{ scaleY: 0, originY: "100%" }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        {/* Femur condyle */}
        <motion.ellipse
          cx={cx} cy={yCut + 20} rx={40} ry={22}
          fill={color} opacity={0.12}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        />

        {/* Axis line */}
        <AnimLine x1={cx} y1={10} x2={cx} y2={H - 20}
          stroke={color} sw={2.0} opacity={0.5} />
        <text x={cx} y={8} textAnchor="middle" fontSize={9} fill={color} opacity={0.7}
          fontWeight={700}>Mechanical Axis</text>

        {/* Med/Lat labels */}
        {[["Medial", baseX1, side === "Right"], ["Lateral", baseX2, side !== "Right"]].map(
          ([lbl, x, isLeft]) => (
            <text key={String(lbl)} x={Number(x)} y={H * 0.2}
              textAnchor={isLeft ? "start" : "end"}
              fontSize={10} fill={color} opacity={0.7} fontWeight={600}>
              {String(lbl)}
            </text>
          )
        )}

        {/* Baseline 0° (dashed) */}
        <AnimLine x1={baseX1} y1={yCut} x2={baseX2} y2={yCut}
          stroke={color} sw={1.4} dash="8 5" opacity={0.5} delay={0.1} />
        <text x={cx} y={yCut + 14} textAnchor="middle" fontSize={9}
          fill={color} opacity={0.55} fontWeight={600}>0°</text>

        {/* Angle arc */}
        {angleDeg !== 0 && (
          <AnimArc cx={cx} cy={yCut} r={arcR}
            startDeg={arcEnd >= 0 ? 0 : arcEnd} endDeg={arcEnd >= 0 ? arcEnd : 0}
            stroke={color} sw={1.6} delay={0.3} />
        )}
        <text x={cx + arcR + 6} y={yCut - 4} fontSize={11} fill={color} fontWeight={800}>
          {angleDeg}°
        </text>

        {/* Cut line */}
        <AnimLine x1={baseX1} y1={cutY1} x2={baseX2} y2={cutY2}
          stroke={color} sw={3} delay={0.15} />

        {/* Resection depth indicator */}
        <AnimLine x1={baseX1} y1={cutY1 + depthPx} x2={baseX2} y2={cutY2 + depthPx}
          stroke={color} sw={1.5} dash="5 4" opacity={0.4} delay={0.25} />
        <text x={baseX2 - 4} y={cutY2 + depthPx + 12} textAnchor="end"
          fontSize={8} fill={color} opacity={0.6} fontWeight={600}>
          {resectionMm}mm resect
        </text>
      </svg>
    </motion.div>
  );
}

// ─── Panel: Tibial Slope (sagittal) ───────────────────────────────────────────

function TibialSlopePanel({ slopeDeg, side, resectionMm }: {
  slopeDeg: number; side: Side; resectionMm: number;
}) {
  const color = C.tibSlope[side === "Right" ? "R" : "L"];
  const W = 420, H = 300;
  const cx = W / 2, yCut = H * 0.45;
  const baseX1 = 50, baseX2 = W - 50;
  const theta = degToRad(slopeDeg);
  const tan = Math.tan(theta);
  const cutY1 = yCut + tan * (baseX1 - cx);
  const cutY2 = yCut + tan * (baseX2 - cx);
  const arcR = 28;
  const depthPx = resectionMm * 2.5;

  return (
    <motion.div key={`${side}-${slopeDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      style={{ ...glassCard, padding: "12px" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Tibial Slope · {side} Posterior
          </p>
          <p className="text-xs font-black text-slate-200">Slope {slopeDeg}° · Sagittal</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white"
          style={{ backgroundColor: color }}>
          {slopeDeg}°
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Tibia shaft */}
        <motion.rect
          x={cx - 20} y={yCut + 20} width={40} height={H - yCut - 40}
          rx={8} fill={color} opacity={0.15}
          initial={{ scaleY: 0, transformOrigin: "top" }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4 }}
        />
        {/* Tibial plateau */}
        <motion.ellipse
          cx={cx} cy={yCut} rx={50} ry={14}
          fill={color} opacity={0.12}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Tibia shaft axis */}
        <AnimLine x1={cx} y1={10} x2={cx} y2={H - 20}
          stroke={color} sw={1.8} opacity={0.4} />
        <text x={cx} y={8} textAnchor="middle" fontSize={9} fill={color} opacity={0.7}
          fontWeight={700}>Tibial Axis</text>

        {/* Ant/Post labels */}
        <text x={baseX1} y={H * 0.2} textAnchor="start" fontSize={10}
          fill={color} opacity={0.7} fontWeight={600}>Anterior</text>
        <text x={baseX2} y={H * 0.2} textAnchor="end" fontSize={10}
          fill={color} opacity={0.7} fontWeight={600}>Posterior</text>

        {/* Baseline */}
        <AnimLine x1={baseX1} y1={yCut} x2={baseX2} y2={yCut}
          stroke={color} sw={1.4} dash="8 5" opacity={0.45} delay={0.1} />
        <text x={cx} y={yCut - 8} textAnchor="middle" fontSize={9}
          fill={color} opacity={0.55} fontWeight={600}>0° (no slope)</text>

        {/* Arc */}
        {slopeDeg !== 0 && (
          <AnimArc cx={cx} cy={yCut} r={arcR}
            startDeg={0} endDeg={slopeDeg}
            stroke={color} sw={1.6} delay={0.3} />
        )}
        <text x={cx + arcR + 6} y={yCut + 14} fontSize={11} fill={color} fontWeight={800}>
          {slopeDeg}°
        </text>

        {/* Slope line */}
        <AnimLine x1={baseX1} y1={cutY1} x2={baseX2} y2={cutY2}
          stroke={color} sw={3} delay={0.15} />

        {/* Resection depth */}
        <AnimLine x1={baseX1} y1={cutY1 + depthPx} x2={baseX2} y2={cutY2 + depthPx}
          stroke={color} sw={1.4} dash="5 4" opacity={0.38} delay={0.28} />
        <text x={baseX1 + 4} y={cutY1 + depthPx + 12} textAnchor="start"
          fontSize={8} fill={color} opacity={0.6} fontWeight={600}>
          {resectionMm}mm
        </text>
      </svg>
    </motion.div>
  );
}

// ─── Panel: Tibial Cut Varus/Valgus (coronal) ─────────────────────────────────

function TibialCutPanel({ angleDeg, direction }: {
  angleDeg: number; direction: "Valgus" | "Varus";
}) {
  const color = C.tibCut[direction];
  const W = 420, H = 280;
  const cx = W / 2, yCut = H * 0.5;
  const baseX1 = 50, baseX2 = W - 50;
  const sign = direction === "Valgus" ? 1 : -1;
  const tan = Math.tan(degToRad(angleDeg * sign));
  const cutY1 = yCut - tan * (baseX1 - cx);
  const cutY2 = yCut - tan * (baseX2 - cx);
  const arcR = 28, arcEnd = angleDeg * sign;

  return (
    <motion.div key={`${direction}-${angleDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      style={{ ...glassCard, padding: "12px" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Tibial Cut Alignment · {direction}
          </p>
          <p className="text-xs font-black text-slate-200">{direction} {angleDeg}° · Coronal</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white"
          style={{ backgroundColor: color }}>
          {angleDeg}°
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        {/* Tibia body */}
        <motion.rect x={cx - 28} y={yCut + 14} width={56} height={H - yCut - 30}
          rx={8} fill={color} opacity={0.12}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Axis */}
        <AnimLine x1={cx} y1={10} x2={cx} y2={H - 10}
          stroke={color} sw={1.6} opacity={0.4} />

        {/* Med/Lat */}
        <text x={baseX1} y={H * 0.18} textAnchor="start" fontSize={10}
          fill={color} opacity={0.7} fontWeight={600}>Medial</text>
        <text x={baseX2} y={H * 0.18} textAnchor="end" fontSize={10}
          fill={color} opacity={0.7} fontWeight={600}>Lateral</text>

        {/* Baseline */}
        <AnimLine x1={baseX1} y1={yCut} x2={baseX2} y2={yCut}
          stroke={color} sw={1.3} dash="7 5" opacity={0.45} delay={0.1} />

        {/* Arc */}
        {angleDeg !== 0 && (
          <AnimArc cx={cx} cy={yCut} r={arcR}
            startDeg={arcEnd >= 0 ? 0 : arcEnd} endDeg={arcEnd >= 0 ? arcEnd : 0}
            stroke={color} sw={1.6} delay={0.3} />
        )}
        <text x={cx + arcR + 6} y={yCut - 4} fontSize={11} fill={color} fontWeight={800}>
          {angleDeg}°
        </text>

        {/* Cut line */}
        <AnimLine x1={baseX1} y1={cutY1} x2={baseX2} y2={cutY2}
          stroke={color} sw={3} delay={0.15} />
      </svg>
    </motion.div>
  );
}

// ─── Panel: Hip Cup Inclination (coronal) ────────────────────────────────────

function HipCupPanel({ inclinationDeg, side }: {
  inclinationDeg: number; side: Side;
}) {
  const color = C.hipCup[side === "Right" ? "R" : "L"];
  const W = 420, H = 300;
  const cx = W / 2, cy = H * 0.55;
  const r = 70;
  const sign = side === "Right" ? -1 : 1;
  const axDx = Math.cos(degToRad(90 - inclinationDeg)) * sign;
  const axDy = -Math.sin(degToRad(90 - inclinationDeg));
  const rimDx = -axDy, rimDy = axDx;
  const rimAngleDeg = Math.atan2(rimDy, rimDx) * 180 / Math.PI;
  const cupArcStart = rimAngleDeg + 180;
  const cupArcEnd = rimAngleDeg;

  return (
    <motion.div key={`${side}-${inclinationDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ ...glassCard, padding: "12px" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Acetabular Cup · {side}
          </p>
          <p className="text-xs font-black text-slate-200">Inclination {inclinationDeg}° · Coronal</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white"
          style={{ backgroundColor: color }}>
          {inclinationDeg}°
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Pelvis baseline */}
        <AnimLine x1={40} y1={cy} x2={W - 40} y2={cy}
          stroke={color} sw={1.4} dash="10 5" opacity={0.4} />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={9}
          fill={color} opacity={0.6} fontWeight={600}>Inter-teardrop Line (0°)</text>

        {/* Acetabulum socket fill */}
        <motion.circle cx={cx} cy={cy} r={r}
          fill={color} opacity={0.08}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.4 }}
        />

        {/* Cup rim arc */}
        <AnimArc cx={cx} cy={cy} r={r}
          startDeg={cupArcStart} endDeg={cupArcEnd}
          stroke={color} sw={2.8} delay={0.15} />

        {/* Cup axis */}
        <AnimLine
          x1={cx} y1={cy}
          x2={cx + axDx * (r + 20)} y2={cy + axDy * (r + 20)}
          stroke={color} sw={1.8} opacity={0.6} delay={0.25} />

        {/* Inclination arc */}
        {inclinationDeg !== 0 && (
          <AnimArc cx={cx} cy={cy} r={40}
            startDeg={0} endDeg={-inclinationDeg * (side === "Right" ? 1 : -1)}
            stroke={color} sw={1.6} delay={0.35} />
        )}
        <text x={cx + 46} y={cy - 12} fontSize={11} fill={color} fontWeight={800}>
          {inclinationDeg}°
        </text>

        {/* Safe zone shading */}
        <motion.path
          d={arcPath(cx, cy, r + 8, -60, -20) + `L${cx},${cy}Z`}
          fill={color} opacity={0.07}
          initial={{ opacity: 0 }} animate={{ opacity: 0.07 }}
          transition={{ delay: 0.5 }}
        />
        <text x={cx + 60} y={cy - 40} fontSize={9} fill={color}
          opacity={0.55} fontWeight={600}>Safe zone</text>
        <text x={cx + 60} y={cy - 30} fontSize={8} fill={color}
          opacity={0.45}>30–50°</text>
      </svg>
    </motion.div>
  );
}

// ─── Panel: Hip Stem Valgus (coronal) ────────────────────────────────────────

function HipStemPanel({ valgusOffset, side }: {
  valgusOffset: number; side: Side;
}) {
  const color = C.hipStem[side === "Right" ? "R" : "L"];
  const W = 420, H = 300;
  const cx = W / 2, yBase = H * 0.85;
  const stemLen = H * 0.55;
  const neckLen = 70;
  const sign = side === "Right" ? 1 : -1;
  const shaftY2 = yBase - stemLen;
  const neckAngle = degToRad((135 + valgusOffset) * sign);
  const neckX2 = cx + neckLen * Math.cos(Math.PI / 2 - neckAngle);
  const neckY2 = yBase - stemLen + neckLen * -Math.sin(Math.PI / 2 - neckAngle);
  const nsa = 130 + valgusOffset * 1.5;

  return (
    <motion.div key={`${side}-${valgusOffset}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      style={{ ...glassCard, padding: "12px" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Femoral Stem · {side}
          </p>
          <p className="text-xs font-black text-slate-200">
            NSA {nsa.toFixed(1)}° (offset {valgusOffset > 0 ? "+" : ""}{valgusOffset}°)
          </p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white"
          style={{ backgroundColor: color }}>
          NSA {nsa.toFixed(1)}°
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Femoral shaft */}
        <motion.rect x={cx - 14} y={yBase - stemLen} width={28} height={stemLen}
          rx={7} fill={color} opacity={0.15}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        {/* Shaft axis */}
        <AnimLine x1={cx} y1={yBase + 6} x2={cx} y2={shaftY2 - 6}
          stroke={color} sw={1.6} opacity={0.4} />

        {/* Neck */}
        <AnimLine
          x1={cx} y1={yBase - stemLen + 10}
          x2={neckX2} y2={neckY2}
          stroke={color} sw={3} delay={0.2} />

        {/* Femoral head */}
        <motion.circle
          cx={neckX2} cy={neckY2} r={18}
          fill={color} opacity={0.2}
          stroke={color} strokeWidth={2.2}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        />

        {/* NSA arc */}
        <AnimArc cx={cx} cy={yBase - stemLen + 10} r={36}
          startDeg={-90} endDeg={-90 + (135 + valgusOffset) * sign}
          stroke={color} sw={1.6} delay={0.35} />
        <text x={neckX2 + 10 * sign} y={neckY2 + 6} fontSize={11}
          fill={color} fontWeight={800} textAnchor={sign > 0 ? "start" : "end"}>
          {135 + valgusOffset}°
        </text>

        {/* NSA badge in diagram */}
        <rect x={cx - 30} y={yBase - stemLen - 28} width={60} height={18} rx={6}
          fill={color} opacity={0.25} />
        <text x={cx} y={yBase - stemLen - 15} textAnchor="middle"
          fontSize={9} fill={color} fontWeight={800}>
          NSA {nsa.toFixed(1)}°
        </text>

        {/* Reference line at 135° */}
        {valgusOffset !== 0 && (() => {
          const refAngle = degToRad(135 * sign);
          const rx2 = cx + neckLen * 0.7 * Math.cos(Math.PI / 2 - refAngle);
          const ry2 = yBase - stemLen + 10 + neckLen * 0.7 * -Math.sin(Math.PI / 2 - refAngle);
          return (
            <AnimLine x1={cx} y1={yBase - stemLen + 10} x2={rx2} y2={ry2}
              stroke={color} sw={1.2} dash="6 4" opacity={0.35} delay={0.4} />
          );
        })()}
        <text x={cx - 8 * sign} y={yBase - stemLen - 6} textAnchor="middle"
          fontSize={9} fill={color} opacity={0.55} fontWeight={600}>135° ref</text>
      </svg>
    </motion.div>
  );
}

// ─── LLD SVG panel ────────────────────────────────────────────────────────────

function LLDPanel({ lldPreOp, lldCorrection }: { lldPreOp: number; lldCorrection: number }) {
  const plannedLLD = lldPreOp * (1 - lldCorrection / 100);
  const W = 200, H = 80;
  const leftH = lldPreOp < 0 ? H * 0.6 : H * 0.8;
  const rightH = lldPreOp > 0 ? H * 0.6 : H * 0.8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 80 }}>
      {/* Left leg bar */}
      <motion.rect x={40} y={H - leftH} width={30} height={leftH} rx={5}
        fill={lldPreOp < 0 ? "#f43f5e" : "#22c55e"} opacity={0.3}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4 }} style={{ transformOrigin: "bottom" }} />
      <text x={55} y={H - leftH - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">L</text>

      {/* Right leg bar */}
      <motion.rect x={130} y={H - rightH} width={30} height={rightH} rx={5}
        fill={lldPreOp > 0 ? "#f43f5e" : "#22c55e"} opacity={0.3}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }} style={{ transformOrigin: "bottom" }} />
      <text x={145} y={H - rightH - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">R</text>

      {/* Arrow showing correction */}
      <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={8} fill="#64748b" fontWeight={600}>
        {lldPreOp < 0 ? "↑" : "↓"} {Math.abs(lldPreOp - plannedLLD).toFixed(1)}mm
      </text>
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TKAPlannerPage() {
  const [tab, setTab] = useState<Tab>("tka");
  const [side, setSide] = useState<Side>("Right");

  // TKA params
  const [valgusDeg, setValgusDeg] = useState(5);
  const [slopeDeg, setSlopeDeg] = useState(7);
  const [tibCutDeg, setTibCutDeg] = useState(0);
  const [tibCutDir, setTibCutDir] = useState<"Valgus" | "Varus">("Valgus");

  // TKA new params
  const [tibResectionMm, setTibResectionMm] = useState(9);
  const [jointLineDev, setJointLineDev] = useState(0);

  // THA params
  const [inclinationDeg, setInclinationDeg] = useState(40);
  const [stemValgus, setStemValgus] = useState(0);

  // THA new params
  const [anteversionCup, setAnteversionCup] = useState(15);
  const [anteversionStem, setAnteversionStem] = useState(10);
  const [lldPreOp, setLldPreOp] = useState(-10);
  const [lldCorrection, setLldCorrection] = useState(80);
  const [acetabOffset, setAcetabOffset] = useState(25);
  const [femorOffset, setFemorOffset] = useState(42);

  // Derived values
  const femurColor  = C.femur[side === "Right" ? "R" : "L"];
  const slopeColor  = C.tibSlope[side === "Right" ? "R" : "L"];
  const cutColor    = C.tibCut[tibCutDir];
  const cupColor    = C.hipCup[side === "Right" ? "R" : "L"];
  const stemColor   = C.hipStem[side === "Right" ? "R" : "L"];

  // TKA derived
  const extGap = parseFloat((18 - valgusDeg * 0.8).toFixed(1));
  const flexGap = parseFloat((18 - slopeDeg * 0.6).toFixed(1));
  const gapDiff = Math.abs(extGap - flexGap);
  const gapStatus = gapDiff <= 1 ? "Balanced" : "Unbalanced";

  const jointLineStatus = jointLineDev >= -1 && jointLineDev <= 1
    ? { label: "Restored", color: "green" as const }
    : jointLineDev > 1
      ? { label: "Elevated", color: "amber" as const }
      : { label: "Lowered", color: "amber" as const };

  // THA derived
  const combinedAnteversion = anteversionCup + anteversionStem;
  const anteversionStatus = combinedAnteversion >= 25 && combinedAnteversion <= 50
    ? "green" as const
    : "red" as const;

  const globalOffset = acetabOffset + femorOffset;
  const plannedLLD = lldPreOp * (1 - lldCorrection / 100);
  const nsa = 130 + stemValgus * 1.5;

  const TABS = [
    { id: "tka" as Tab, label: "TKA Planning", sub: "Knee Arthroplasty" },
    { id: "tha" as Tab, label: "THA Planning", sub: "Hip Arthroplasty" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-3 sm:p-5">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(12px)",
          borderRadius: "24px",
          padding: "16px",
        }}>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Digital Templating
          </p>
          <h1 className="text-xl font-black text-slate-100">
            TKA / THA Planner
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Skema interaktif — visualisasi sudut reseksi osseous
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          padding: "6px",
          display: "flex",
          gap: "6px",
        }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center rounded-[16px] py-2.5 transition-all ${
                tab === t.id
                  ? "bg-teal-500 text-white shadow-[0_2px_12px_rgba(20,184,166,0.35)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-[11px] font-black">{t.label}</span>
              <span className={`text-[9px] ${tab === t.id ? "text-white/70" : "text-slate-500"}`}>
                {t.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Side + controls */}
        <div style={{ ...glassCard }}>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sisi Operasi</p>
            {(["Right", "Left"] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`flex-1 rounded-[14px] py-2 text-[10px] font-black transition-all ${
                  side === s
                    ? "bg-teal-500 text-white shadow-[0_2px_10px_rgba(20,184,166,0.3)]"
                    : "text-slate-400"
                }`}
                style={side !== s ? { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" } : {}}
              >
                {s === "Right" ? "Kanan (Right)" : "Kiri (Left)"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "tka" ? (
              <motion.div key="tka-controls" className="space-y-2"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>

                <SliderRow label="Valgus DC" value={valgusDeg} min={0} max={12} color={femurColor}
                  onChange={setValgusDeg} />
                <SliderRow label="Tibial Slope" value={slopeDeg} min={0} max={12} color={slopeColor}
                  onChange={setSlopeDeg} />
                <SliderRow label="Tib Resection" value={tibResectionMm} min={6} max={12} step={0.5}
                  color={slopeColor} onChange={setTibResectionMm} unit="mm" />
                <SliderRow label="Joint Line Dev" value={jointLineDev} min={-5} max={5} step={0.5}
                  color={femurColor} onChange={setJointLineDev} unit="mm" />

                <div className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-[10px] font-black text-slate-300">Tibial Cut</span>
                  {(["Valgus", "Varus"] as ("Valgus" | "Varus")[]).map((d) => (
                    <button key={d} type="button" onClick={() => setTibCutDir(d)}
                      className={`flex-1 rounded-xl py-1.5 text-[9px] font-black transition ${
                        tibCutDir === d ? "text-white" : "text-slate-400"
                      }`}
                      style={tibCutDir === d
                        ? { backgroundColor: C.tibCut[d] }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      {d}
                    </button>
                  ))}
                  <input type="range" min={0} max={8} step={0.5} value={tibCutDeg}
                    onChange={(e) => setTibCutDeg(parseFloat(e.target.value))}
                    className="flex-1 h-1.5" style={{ accentColor: cutColor }} />
                  <span className="w-9 text-right text-[10px] font-mono font-black" style={{ color: cutColor }}>
                    {tibCutDeg}°
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div key="tha-controls" className="space-y-2"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
                <SliderRow label="Cup Inclination" value={inclinationDeg} min={25} max={60}
                  color={cupColor} onChange={setInclinationDeg} />
                <SliderRow label="Cup Anteversion" value={anteversionCup} min={0} max={30} step={0.5}
                  color={cupColor} onChange={setAnteversionCup} />
                <SliderRow label="Stem Anteversion" value={anteversionStem} min={0} max={20} step={0.5}
                  color={stemColor} onChange={setAnteversionStem} />
                <SliderRow label="Stem Offset" value={stemValgus} min={-10} max={10}
                  color={stemColor} onChange={setStemValgus} />
                <SliderRow label="Pre-op LLD" value={lldPreOp} min={-30} max={30} step={1}
                  color="#f43f5e" onChange={setLldPreOp} unit="mm" />
                <SliderRow label="LLD Correction" value={lldCorrection} min={0} max={100} step={5}
                  color="#22c55e" onChange={setLldCorrection} unit="%" />
                <SliderRow label="Acetab Offset" value={acetabOffset} min={0} max={40} step={1}
                  color={cupColor} onChange={setAcetabOffset} unit="mm" />
                <SliderRow label="Femoral Offset" value={femorOffset} min={30} max={60} step={1}
                  color={stemColor} onChange={setFemorOffset} unit="mm" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reference ranges + computed panels */}
        <AnimatePresence mode="wait">
          {tab === "tka" ? (
            <motion.div key="tka-info"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">

              {/* Range chips */}
              <div className="grid grid-cols-3 gap-2">
                <RangeChip label="Valgus DC" range="3–7°" current={valgusDeg} color={femurColor} />
                <RangeChip label="Tibial Slope" range="3–10°" current={slopeDeg} color={slopeColor} />
                <RangeChip label="Tibial Cut" range="0–3°" current={tibCutDeg} color={cutColor} />
              </div>

              {/* HKA display */}
              <div style={glassCard} className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HKA Angle</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">Normal mechanical axis: 0 ± 3°</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black" style={{ color: femurColor }}>{valgusDeg}°</span>
                  <StatusBadge
                    label={valgusDeg <= 3 ? "In range" : "Outside"}
                    color={valgusDeg <= 3 ? "green" : "amber"}
                  />
                </div>
              </div>

              {/* Joint line + Gap balance */}
              <div className="grid grid-cols-2 gap-2">
                <div style={glassCard}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                    Joint Line
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-200">{jointLineDev > 0 ? "+" : ""}{jointLineDev}mm</span>
                    <StatusBadge label={jointLineStatus.label} color={jointLineStatus.color} />
                  </div>
                </div>

                <div style={glassCard}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                    Flex/Ext Gap
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-300">
                      Ext {extGap}mm / Flex {flexGap}mm
                    </span>
                    <StatusBadge
                      label={gapStatus}
                      color={gapStatus === "Balanced" ? "green" : "amber"}
                    />
                  </div>
                </div>
              </div>

              {/* Gap gauge */}
              <div style={glassCard} className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gap Balance</p>
                <MiniGauge value={extGap} min={10} max={25} color={femurColor} label="Extension gap (mm)" />
                <MiniGauge value={flexGap} min={10} max={25} color={slopeColor} label="Flexion gap (mm)" />
                <p className="text-[9px] text-slate-500">
                  Δ = {gapDiff.toFixed(1)}mm — {gapDiff <= 1 ? "balanced" : gapDiff <= 2 ? "marginal" : "unbalanced"}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="tha-info"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">

              {/* Range chips */}
              <div className="grid grid-cols-2 gap-2">
                <RangeChip label="Inclination" range="30–50°" current={inclinationDeg} color={cupColor} />
                <RangeChip label="NSA (stem)" range="130–140°" current={Math.round(nsa)} color={stemColor} />
              </div>

              {/* Combined anteversion */}
              <div style={glassCard} className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Combined Anteversion (Ranawat)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Cup {anteversionCup}° + Stem {anteversionStem}° = <span className="font-black text-slate-200">{combinedAnteversion}°</span>
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Target: 25–50°</p>
                </div>
                <StatusBadge
                  label={anteversionStatus === "green" ? "In safe zone" : "Outside range"}
                  color={anteversionStatus}
                />
              </div>

              {/* LLD panel */}
              <div style={glassCard}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Leg Length Discrepancy
                </p>
                <LLDPanel lldPreOp={lldPreOp} lldCorrection={lldCorrection} />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Pre-op: <span className="font-black text-slate-200">{lldPreOp > 0 ? "+" : ""}{lldPreOp}mm</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Planned LLD after correction:{" "}
                    <span className="font-black" style={{ color: Math.abs(plannedLLD) < 5 ? "#4ade80" : "#facc15" }}>
                      {plannedLLD > 0 ? "+" : ""}{plannedLLD.toFixed(1)}mm
                    </span>
                  </span>
                </div>
              </div>

              {/* Offset restoration */}
              <div style={glassCard} className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Offset Restoration
                </p>
                <MiniGauge value={acetabOffset} min={0} max={40} color={cupColor} label="Acetabular offset (mm)" />
                <MiniGauge value={femorOffset} min={30} max={60} color={stemColor} label="Femoral offset (mm)" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-400">
                    Global offset: <span className="font-black text-slate-200">{globalOffset}mm</span>
                  </span>
                  <StatusBadge
                    label={globalOffset >= 60 && globalOffset <= 90 ? "Normal" : "Check"}
                    color={globalOffset >= 60 && globalOffset <= 90 ? "green" : "amber"}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schematics */}
        <AnimatePresence mode="wait">
          {tab === "tka" ? (
            <motion.div key="tka-panels" className="space-y-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FemurPanel angleDeg={valgusDeg} side={side} resectionMm={tibResectionMm} />
              <TibialSlopePanel slopeDeg={slopeDeg} side={side} resectionMm={tibResectionMm} />
              <TibialCutPanel angleDeg={tibCutDeg} direction={tibCutDir} />
            </motion.div>
          ) : (
            <motion.div key="tha-panels" className="space-y-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HipCupPanel inclinationDeg={inclinationDeg} side={side} />
              <HipStemPanel valgusOffset={stemValgus} side={side} />
            </motion.div>
          )}
        </AnimatePresence>

        <p className="pb-4 text-center text-[9px] text-slate-500">
          Skema edukasi saja — bukan pengganti planning klinis berbasis citra X-ray yang dikalibrasi.
        </p>
      </div>
    </div>
  );
}
