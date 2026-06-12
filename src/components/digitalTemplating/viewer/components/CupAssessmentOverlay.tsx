"use client";
/**
 * Cup Assessment Overlay
 *
 * Interactive ellipse tool to assess radiographic inclination (abduction)
 * and anteversion of an acetabular cup on X-ray.
 *
 * Physics:
 *   - Inclination  = angle of ellipse major axis vs horizontal
 *   - Anteversion  = arcsin(minor_axis / major_axis)  [Murray radiographic def]
 *
 * 4 drag handles:
 *   top/bottom  → define the major axis (cup opening line)
 *   left/right  → define the minor axis (apparent depth)
 */

import React, { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Pt = { x: number; y: number };

type CupEllipseState = {
  /** center */
  cx: number;
  cy: number;
  /** major axis half-length (cup diameter as seen on film) */
  a: number;
  /** minor axis half-length (cup depth eccentricity) */
  b: number;
  /** rotation of major axis from horizontal, radians */
  angle: number;
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function deg(rad: number) {
  return (rad * 180) / Math.PI;
}

function computeAngles(state: CupEllipseState): {
  inclination: number;
  anteversion: number;
} {
  const inclination = Math.abs(deg(state.angle));
  const ratio = Math.min(Math.abs(state.b / state.a), 1);
  const anteversion = deg(Math.asin(ratio));
  return { inclination, anteversion };
}

function ptOnEllipse(state: CupEllipseState, t: number): Pt {
  const cos = Math.cos(state.angle);
  const sin = Math.sin(state.angle);
  const ex = state.a * Math.cos(t);
  const ey = state.b * Math.sin(t);
  return {
    x: state.cx + ex * cos - ey * sin,
    y: state.cy + ex * sin + ey * cos,
  };
}

// Ellipse SVG path from state
function ellipsePath(s: CupEllipseState): string {
  const pts = Array.from({ length: 64 }, (_, i) =>
    ptOnEllipse(s, (i / 64) * 2 * Math.PI)
  );
  return (
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ") + " Z"
  );
}

// ─── Safe zone ────────────────────────────────────────────────────────────────

const LEWINNEK = { abdMin: 30, abdMax: 50, antMin: 5, antMax: 25 };
const CALLANAN = { abdMin: 30, abdMax: 45, antMin: 10, antMax: 25 };

function zoneStatus(inc: number, ant: number) {
  const inCallanan =
    inc >= CALLANAN.abdMin &&
    inc <= CALLANAN.abdMax &&
    ant >= CALLANAN.antMin &&
    ant <= CALLANAN.antMax;
  const inLewinnek =
    inc >= LEWINNEK.abdMin &&
    inc <= LEWINNEK.abdMax &&
    ant >= LEWINNEK.antMin &&
    ant <= LEWINNEK.antMax;
  if (inCallanan) return { label: "Safe Zone Optimal", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  if (inLewinnek) return { label: "Safe Zone Lewinnek", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  return { label: "Di Luar Safe Zone", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
}

// ─── Default initial state (can be overridden via props) ──────────────────────

function defaultState(w: number, h: number): CupEllipseState {
  return {
    cx: w / 2,
    cy: h / 2,
    a: Math.min(w, h) * 0.28,
    b: Math.min(w, h) * 0.12,
    angle: (40 * Math.PI) / 180, // 40° inclination default
  };
}

// ─── Handle IDs ───────────────────────────────────────────────────────────────

type HandleId = "top" | "bottom" | "left" | "right" | "center";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Width of the parent canvas area in px */
  width: number;
  /** Height of the parent canvas area in px */
  height: number;
  /** Show/hide the whole overlay */
  visible: boolean;
  onClose?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CupAssessmentOverlay({
  width,
  height,
  visible,
  onClose,
}: Props) {
  const [state, setState] = useState<CupEllipseState>(() =>
    defaultState(width || 400, height || 500)
  );
  const [dragging, setDragging] = useState<HandleId | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Derived handle positions ──────────────────────────────────────────────
  const cos = Math.cos(state.angle);
  const sin = Math.sin(state.angle);

  const handles: Record<HandleId, Pt> = {
    top: {
      x: state.cx - state.a * cos,
      y: state.cy - state.a * sin,
    },
    bottom: {
      x: state.cx + state.a * cos,
      y: state.cy + state.a * sin,
    },
    left: {
      x: state.cx + state.b * sin,
      y: state.cy - state.b * cos,
    },
    right: {
      x: state.cx - state.b * sin,
      y: state.cy + state.b * cos,
    },
    center: { x: state.cx, y: state.cy },
  };

  // ── SVG coordinate helper ─────────────────────────────────────────────────
  const svgPt = useCallback((e: React.PointerEvent): Pt => {
    const svg = svgRef.current;
    if (!svg) return { x: e.clientX, y: e.clientY };
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    };
  }, [width, height]);

  // ── Pointer events ────────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (id: HandleId) => (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      setDragging(id);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const p = svgPt(e);
      setState((s) => {
        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);

        if (dragging === "center") {
          return { ...s, cx: p.x, cy: p.y };
        }

        if (dragging === "top" || dragging === "bottom") {
          // Recompute major axis length & angle from center → handle
          const dx = p.x - s.cx;
          const dy = p.y - s.cy;
          const newA = Math.sqrt(dx * dx + dy * dy);
          const newAngle = Math.atan2(dy, dx);
          return {
            ...s,
            a: newA,
            angle: dragging === "top" ? newAngle + Math.PI : newAngle,
          };
        }

        if (dragging === "left" || dragging === "right") {
          // Project mouse position onto the minor axis direction
          const minorCos = sin;   // minor axis direction = perpendicular to major
          const minorSin = -cos;
          const dx = p.x - s.cx;
          const dy = p.y - s.cy;
          const proj = Math.abs(dx * minorCos + dy * minorSin);
          return { ...s, b: Math.max(4, proj) };
        }

        return s;
      });
    },
    [dragging, svgPt]
  );

  const onPointerUp = useCallback(() => setDragging(null), []);

  // ── Calculated angles ─────────────────────────────────────────────────────
  const { inclination, anteversion } = computeAngles(state);
  const zone = zoneStatus(inclination, anteversion);

  // ── Colors ────────────────────────────────────────────────────────────────
  const mainColor = "#f97316"; // orange — matches image
  const linerColor = "#22d3ee"; // cyan
  const majorColor = "#a3e635"; // green
  const horizontalColor = "#facc15"; // yellow

  const HANDLE_R = 8;

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 80 }}
    >
      {/* SVG overlay */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 pointer-events-auto"
        style={{ cursor: dragging ? "grabbing" : "default", touchAction: "none" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Horizontal reference line */}
        <line
          x1={0} y1={state.cy} x2={width} y2={state.cy}
          stroke={horizontalColor} strokeWidth="1.5" strokeDasharray="8 4" opacity="0.6"
        />

        {/* Major axis line (cup inclination line) */}
        <line
          x1={handles.top.x} y1={handles.top.y}
          x2={handles.bottom.x} y2={handles.bottom.y}
          stroke={majorColor} strokeWidth="2" strokeDasharray="6 3"
        />

        {/* Minor axis line (anteversion depth indicator) */}
        <line
          x1={handles.left.x} y1={handles.left.y}
          x2={handles.right.x} y2={handles.right.y}
          stroke={linerColor} strokeWidth="1.5"
        />

        {/* Outer cup shell ellipse (orange) */}
        <path
          d={ellipsePath(state)}
          fill="none"
          stroke={mainColor}
          strokeWidth="2.5"
          opacity="0.9"
        />

        {/* Inner liner ellipse — slightly smaller, cyan */}
        <path
          d={ellipsePath({ ...state, a: state.a * 0.82, b: state.b * 0.82 })}
          fill="none"
          stroke={linerColor}
          strokeWidth="1.5"
          opacity="0.75"
        />

        {/* Inclination angle arc */}
        {(() => {
          const arcR = 36;
          const incRad = Math.abs(state.angle);
          return (
            <path
              d={`M ${state.cx + arcR} ${state.cy}
                  A ${arcR} ${arcR} 0 0 ${state.angle < 0 ? 1 : 0}
                  ${state.cx + arcR * Math.cos(state.angle)}
                  ${state.cy + arcR * Math.sin(state.angle)}`}
              fill="none" stroke={majorColor} strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          );
        })()}
        <text
          x={state.cx + 42}
          y={state.cy - 8}
          fill={majorColor}
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {inclination.toFixed(1)}°
        </text>

        {/* Anteversion label on minor axis */}
        <text
          x={(handles.left.x + handles.right.x) / 2 + 6}
          y={(handles.left.y + handles.right.y) / 2 - 8}
          fill={linerColor}
          fontSize="10"
          fontWeight="bold"
          fontFamily="monospace"
        >
          AV {anteversion.toFixed(1)}°
        </text>

        {/* ── Drag handles ── */}

        {/* Center */}
        <circle
          cx={handles.center.x} cy={handles.center.y} r={HANDLE_R - 2}
          fill="#6d28d9" stroke="white" strokeWidth="2"
          style={{ cursor: "move", pointerEvents: "all" }}
          onPointerDown={onPointerDown("center")}
        />

        {/* Top / Bottom (major axis) */}
        {(["top", "bottom"] as const).map((id) => (
          <circle
            key={id}
            cx={handles[id].x} cy={handles[id].y} r={HANDLE_R}
            fill="#facc15" stroke="white" strokeWidth="2"
            style={{ cursor: "crosshair", pointerEvents: "all" }}
            onPointerDown={onPointerDown(id)}
          />
        ))}

        {/* Left / Right (minor axis) */}
        {(["left", "right"] as const).map((id) => (
          <circle
            key={id}
            cx={handles[id].x} cy={handles[id].y} r={HANDLE_R}
            fill="#6d28d9" stroke="white" strokeWidth="2"
            style={{ cursor: "ew-resize", pointerEvents: "all" }}
            onPointerDown={onPointerDown(id)}
          />
        ))}
      </svg>

      {/* ── Result card (top-right) ── */}
      <div
        className="absolute top-3 right-3 w-52 rounded-2xl border shadow-xl overflow-hidden pointer-events-auto"
        style={{ backgroundColor: zone.bg, borderColor: zone.border }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 bg-white/80">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Cup Assessment</p>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-sm font-black leading-none"
            >
              ✕
            </button>
          )}
        </div>

        <div className="px-3 py-2.5 space-y-2">
          {/* Safe zone badge */}
          <p className="text-[10px] font-black" style={{ color: zone.color }}>
            {zone.label}
          </p>

          {/* Values */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold">Inclination</span>
              <span
                className="text-[11px] font-black"
                style={{ color: inclination >= 30 && inclination <= 50 ? "#16a34a" : "#dc2626" }}
              >
                {inclination.toFixed(1)}°
                <span className="text-[8px] ml-1 text-slate-400">(30–50°)</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold">Anteversion</span>
              <span
                className="text-[11px] font-black"
                style={{ color: anteversion >= 5 && anteversion <= 25 ? "#16a34a" : "#dc2626" }}
              >
                {anteversion.toFixed(1)}°
                <span className="text-[8px] ml-1 text-slate-400">(5–25°)</span>
              </span>
            </div>
          </div>

          {/* Color legend */}
          <div className="pt-1 border-t border-slate-200/60 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#f97316" }}></span>
              <span className="text-[8px] text-slate-400">Outer cup shell</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#22d3ee" }}></span>
              <span className="text-[8px] text-slate-400">Liner / inner surface</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#a3e635" }}></span>
              <span className="text-[8px] text-slate-400">Major axis (inclination)</span>
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={() => setState(defaultState(width, height))}
            className="w-full rounded-xl border border-slate-200 bg-white/80 py-1 text-[9px] font-black text-slate-500 hover:bg-slate-50 active:scale-95 transition"
          >
            Reset Posisi
          </button>
        </div>
      </div>

      {/* Guide text (bottom) */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none">
        <p className="text-[9px] font-bold text-white bg-black/50 rounded-lg px-3 py-1.5 backdrop-blur-sm whitespace-nowrap">
          Drag titik kuning → atur major axis · Titik ungu → atur minor axis / pindah
        </p>
      </div>
    </div>
  );
}
