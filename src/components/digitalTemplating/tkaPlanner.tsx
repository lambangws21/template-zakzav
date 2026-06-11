"use client";

import React, { useMemo, useState, useCallback } from "react";
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

function RangeChip({ label, range, current, color }: {
  label: string; range: string; current: number; color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/50 bg-white/30 px-2.5 py-1.5">
      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px] font-bold text-slate-600">{range}</span>
      <span className="ml-auto rounded-lg px-1.5 py-0.5 text-[9px] font-black text-white"
        style={{ backgroundColor: color }}
      >
        {current}°
      </span>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step = 0.5, color, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  color: string; onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[10px] font-black text-slate-600">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5"
        style={{ accentColor: color }}
      />
      <span className="w-9 text-right text-[10px] font-mono font-black"
        style={{ color }}
      >
        {value}°
      </span>
    </label>
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

function FemurPanel({ angleDeg, side }: { angleDeg: number; side: Side }) {
  const color = C.femur[side === "Right" ? "R" : "L"];
  const W = 420, H = 300;
  const cx = W / 2, yCut = H * 0.62;
  const baseX1 = 50, baseX2 = W - 50;
  const sign = side === "Right" ? 1 : -1;
  const tan = Math.tan(degToRad(angleDeg * sign));
  const cutY1 = yCut - tan * (baseX1 - cx);
  const cutY2 = yCut - tan * (baseX2 - cx);
  const arcR = 32, arcStart = 0, arcEnd = angleDeg * sign;

  return (
    <motion.div key={`${side}-${angleDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-3 shadow-[2px_2px_8px_rgba(148,163,184,0.18),-2px_-2px_8px_rgba(255,255,255,0.7)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Distal Femur Cut · {side}
          </p>
          <p className="text-xs font-black text-slate-800">Valgus {angleDeg}° · Coronal</p>
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
          fill={color} opacity={0.12}
          initial={{ scaleY: 0, originY: "100%" }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        {/* Femur condyle (ellipse at bottom) */}
        <motion.ellipse
          cx={cx} cy={yCut + 20} rx={40} ry={22}
          fill={color} opacity={0.1}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        />

        {/* Axis line */}
        <AnimLine x1={cx} y1={10} x2={cx} y2={H - 20}
          stroke={color} sw={2.0} opacity={0.5} />
        <text x={cx} y={8} textAnchor="middle" fontSize={9} fill={color} opacity={0.7}
          fontWeight={700}>Mechanical Axis</text>

        {/* Medial / Lateral labels */}
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
      </svg>
    </motion.div>
  );
}

// ─── Panel: Tibial Slope (sagittal) ───────────────────────────────────────────

function TibialSlopePanel({ slopeDeg, side }: { slopeDeg: number; side: Side }) {
  const color = C.tibSlope[side === "Right" ? "R" : "L"];
  const W = 420, H = 300;
  const cx = W / 2, yCut = H * 0.45;
  const baseX1 = 50, baseX2 = W - 50;
  const theta = degToRad(slopeDeg);
  const tan = Math.tan(theta);
  const cutY1 = yCut + tan * (baseX1 - cx);
  const cutY2 = yCut + tan * (baseX2 - cx);
  const arcR = 28;

  return (
    <motion.div key={`${side}-${slopeDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-3 shadow-[2px_2px_8px_rgba(148,163,184,0.18),-2px_-2px_8px_rgba(255,255,255,0.7)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Tibial Slope · {side} Posterior
          </p>
          <p className="text-xs font-black text-slate-800">Slope {slopeDeg}° · Sagittal</p>
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
          rx={8} fill={color} opacity={0.12}
          initial={{ scaleY: 0, transformOrigin: "top" }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4 }}
        />
        {/* Tibial plateau */}
        <motion.ellipse
          cx={cx} cy={yCut} rx={50} ry={14}
          fill={color} opacity={0.1}
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
      className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-3 shadow-[2px_2px_8px_rgba(148,163,184,0.18),-2px_-2px_8px_rgba(255,255,255,0.7)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Tibial Cut Alignment · {direction}
          </p>
          <p className="text-xs font-black text-slate-800">{direction} {angleDeg}° · Coronal</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white"
          style={{ backgroundColor: color }}>
          {angleDeg}°
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        {/* Tibia body */}
        <motion.rect x={cx - 28} y={yCut + 14} width={56} height={H - yCut - 30}
          rx={8} fill={color} opacity={0.1}
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
  // Cup opening faces superolaterally. Inclination = angle from horizontal (teardrop line)
  const sign = side === "Right" ? -1 : 1;
  const thetaInclination = degToRad(inclinationDeg);
  // Cup axis direction from center
  const axDx = Math.cos(degToRad(90 - inclinationDeg)) * sign;
  const axDy = -Math.sin(degToRad(90 - inclinationDeg));
  // Cup rim endpoints (perpendicular to axis)
  const rimDx = -axDy, rimDy = axDx;
  const rimLen = r;
  const rimX1 = cx - rimDx * rimLen, rimY1 = cy - rimDy * rimLen;
  const rimX2 = cx + rimDx * rimLen, rimY2 = cy + rimDy * rimLen;

  // Cup hemispherical arc (inside)
  const rimAngleDeg = Math.atan2(rimDy, rimDx) * 180 / Math.PI;
  const cupArcStart = rimAngleDeg + 180;
  const cupArcEnd = rimAngleDeg;

  return (
    <motion.div key={`${side}-${inclinationDeg}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-3 shadow-[2px_2px_8px_rgba(148,163,184,0.18),-2px_-2px_8px_rgba(255,255,255,0.7)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Acetabular Cup · {side}
          </p>
          <p className="text-xs font-black text-slate-800">Inclination {inclinationDeg}° · Coronal</p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white"
          style={{ backgroundColor: color }}>
          {inclinationDeg}°
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Pelvis baseline (inter-teardrop line) */}
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

        {/* Inclination arc from horizontal to cup axis */}
        {inclinationDeg !== 0 && (
          <AnimArc cx={cx} cy={cy} r={40}
            startDeg={0} endDeg={-inclinationDeg * (side === "Right" ? 1 : -1)}
            stroke={color} sw={1.6} delay={0.35} />
        )}
        <text x={cx + 46} y={cy - 12} fontSize={11} fill={color} fontWeight={800}>
          {inclinationDeg}°
        </text>

        {/* Safe zone shading (40° ± 10°) */}
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
  // Stem runs vertically (femoral shaft)
  const shaftX1 = cx, shaftY1 = yBase, shaftX2 = cx, shaftY2 = yBase - stemLen;
  // Neck angle = 135° + valgusOffset degrees from shaft axis
  const neckAngle = degToRad((135 + valgusOffset) * sign);
  const neckX2 = cx + neckLen * Math.cos(Math.PI / 2 - neckAngle);
  const neckY2 = yBase - stemLen + neckLen * -Math.sin(Math.PI / 2 - neckAngle);

  return (
    <motion.div key={`${side}-${valgusOffset}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 p-3 shadow-[2px_2px_8px_rgba(148,163,184,0.18),-2px_-2px_8px_rgba(255,255,255,0.7)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
            Femoral Stem · {side}
          </p>
          <p className="text-xs font-black text-slate-800">
            NSA {135 + valgusOffset}° (offset {valgusOffset > 0 ? "+" : ""}{valgusOffset}°)
          </p>
        </div>
        <span className="rounded-xl px-2 py-1 text-[10px] font-black text-white"
          style={{ backgroundColor: color }}>
          {135 + valgusOffset}°
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Femoral shaft */}
        <motion.rect x={cx - 14} y={yBase - stemLen} width={28} height={stemLen}
          rx={7} fill={color} opacity={0.12}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        {/* Shaft axis */}
        <AnimLine x1={shaftX1} y1={shaftY1 + 6} x2={shaftX2} y2={shaftY2 - 6}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TKAPlannerPage() {
  const [tab, setTab] = useState<Tab>("tka");
  const [side, setSide] = useState<Side>("Right");

  // TKA params
  const [valgusDeg, setValgusDeg] = useState(5);
  const [slopeDeg, setSlopeDeg] = useState(7);
  const [tibCutDeg, setTibCutDeg] = useState(0);
  const [tibCutDir, setTibCutDir] = useState<"Valgus" | "Varus">("Valgus");

  // THA params
  const [inclinationDeg, setInclinationDeg] = useState(40);
  const [stemValgus, setStemValgus] = useState(0);

  const femurColor  = C.femur[side === "Right" ? "R" : "L"];
  const slopeColor  = C.tibSlope[side === "Right" ? "R" : "L"];
  const cutColor    = C.tibCut[tibCutDir];
  const cupColor    = C.hipCup[side === "Right" ? "R" : "L"];
  const stemColor   = C.hipStem[side === "Right" ? "R" : "L"];

  const TABS = [
    { id: "tka" as Tab, label: "TKA Planning", sub: "Knee Arthroplasty" },
    { id: "tha" as Tab, label: "THA Planning", sub: "Hip Arthroplasty" },
  ];

  return (
    <div className="min-h-screen bg-[#eef2f7] p-3 sm:p-5">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header */}
        <div className="rounded-[24px] border border-white/75 bg-[#eef2f7] p-4
          shadow-[6px_6px_18px_rgba(148,163,184,0.28),-6px_-6px_18px_rgba(255,255,255,0.82)]">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Digital Templating
          </p>
          <h1 className="text-xl font-black text-slate-900">
            TKA / THA Planner
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Skema interaktif — visualisasi sudut reseksi osseous
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 rounded-[20px] border border-white/75 bg-[#eef2f7] p-1.5
          shadow-[inset_3px_3px_8px_rgba(148,163,184,0.22),inset_-3px_-3px_8px_rgba(255,255,255,0.88)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center rounded-[16px] py-2.5 transition-all ${
                tab === t.id
                  ? "bg-slate-900 text-white shadow-[2px_2px_8px_rgba(15,23,42,0.22)]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="text-[11px] font-black">{t.label}</span>
              <span className={`text-[9px] ${tab === t.id ? "text-white/60" : "text-slate-400"}`}>
                {t.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Side + controls */}
        <div className="rounded-[24px] border border-white/75 bg-[#eef2f7] p-4
          shadow-[4px_4px_12px_rgba(148,163,184,0.22),-4px_-4px_12px_rgba(255,255,255,0.8)]">
          <div className="mb-3 flex items-center gap-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sisi Operasi</p>
            {(["Right", "Left"] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`flex-1 rounded-[14px] py-2 text-[10px] font-black transition-all ${
                  side === s
                    ? "bg-slate-800 text-white shadow-[2px_2px_6px_rgba(15,23,42,0.22)]"
                    : "border border-white/70 text-slate-500 shadow-[2px_2px_5px_rgba(148,163,184,0.2),-2px_-2px_5px_rgba(255,255,255,0.8)]"
                }`}
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
                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[10px] font-black text-slate-600">Tibial Cut</span>
                  {(["Valgus", "Varus"] as ("Valgus" | "Varus")[]).map((d) => (
                    <button key={d} type="button" onClick={() => setTibCutDir(d)}
                      className={`flex-1 rounded-xl py-1.5 text-[9px] font-black transition ${
                        tibCutDir === d
                          ? "text-white shadow-[1px_2px_5px_rgba(0,0,0,0.14)]"
                          : "border border-white/70 text-slate-500"
                      }`}
                      style={tibCutDir === d ? { backgroundColor: C.tibCut[d] } : {}}
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
                <SliderRow label="Stem Offset" value={stemValgus} min={-10} max={10}
                  color={stemColor} onChange={setStemValgus} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reference ranges */}
        <AnimatePresence mode="wait">
          {tab === "tka" ? (
            <motion.div key="tka-ranges"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-2">
              <RangeChip label="Valgus DC" range="3–7°" current={valgusDeg} color={femurColor} />
              <RangeChip label="Tibial Slope" range="3–10°" current={slopeDeg} color={slopeColor} />
              <RangeChip label="Tibial Cut" range="0–3°" current={tibCutDeg} color={cutColor} />
            </motion.div>
          ) : (
            <motion.div key="tha-ranges"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-2">
              <RangeChip label="Inclination" range="30–50°" current={inclinationDeg} color={cupColor} />
              <RangeChip label="NSA (stem)" range="130–140°" current={135 + stemValgus} color={stemColor} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schematics */}
        <AnimatePresence mode="wait">
          {tab === "tka" ? (
            <motion.div key="tka-panels" className="space-y-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FemurPanel angleDeg={valgusDeg} side={side} />
              <TibialSlopePanel slopeDeg={slopeDeg} side={side} />
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

        <p className="pb-4 text-center text-[9px] text-slate-400">
          Skema edukasi saja — bukan pengganti planning klinis berbasis citra X-ray yang dikalibrasi.
        </p>
      </div>
    </div>
  );
}
