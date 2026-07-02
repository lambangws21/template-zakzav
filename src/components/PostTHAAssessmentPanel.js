"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Crosshair,
  Download,
  FileText,
  HelpCircle,
  RotateCcw,
  Spline,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const STEPS = ["landmarks", "cup", "result"];
const STEP_LABELS = ["AP Pelvis", "Cup Orientation", "Hasil"];
const LEWINNEK_ZONE = { abdMin: 30, abdMax: 50, antMin: 5, antMax: 25 };
const CALLANAN_ZONE = { abdMin: 30, abdMax: 45, antMin: 10, antMax: 25 };

const LANDMARKS = [
  { key: "tdLeft", label: "Teardrop Kiri", short: "TD-L", color: "#14b8a6", hint: "Klik ujung inferior teardrop kiri sebagai titik referensi interteardrop." },
  { key: "tdRight", label: "Teardrop Kanan", short: "TD-R", color: "#0d9488", hint: "Klik ujung inferior teardrop kanan. Garis TD-L ke TD-R menjadi baseline pelvis." },
  { key: "headLeftA", label: "Tepi Head Kiri A", short: "HL-A", color: "#ec4899", hint: "Klik salah satu tepi diameter kepala femur/prosthetic head kiri." },
  { key: "headLeftB", label: "Tepi Head Kiri B", short: "HL-B", color: "#db2777", hint: "Klik tepi berlawanan kepala femur/prosthetic head kiri. Midpoint = COR/HRC kiri." },
  { key: "headRightA", label: "Tepi Head Kanan A", short: "HR-A", color: "#f472b6", hint: "Klik salah satu tepi diameter kepala femur/prosthetic head kanan." },
  { key: "headRightB", label: "Tepi Head Kanan B", short: "HR-B", color: "#be185d", hint: "Klik tepi berlawanan kepala femur/prosthetic head kanan. Midpoint = COR/HRC kanan." },
  { key: "ltLeft", label: "Lesser Trochanter Kiri", short: "LT-L", color: "#38bdf8", hint: "Klik tip/tepi referensi lesser trochanter kiri untuk hip length/LLD." },
  { key: "ltRight", label: "Lesser Trochanter Kanan", short: "LT-R", color: "#0284c7", hint: "Klik tip/tepi referensi lesser trochanter kanan untuk hip length/LLD." },
  { key: "axisLeftTop", label: "Axis Femur Kiri Atas", short: "FL-1", color: "#818cf8", hint: "Klik titik proksimal sumbu shaft femur kiri." },
  { key: "axisLeftBottom", label: "Axis Femur Kiri Bawah", short: "FL-2", color: "#6366f1", hint: "Klik titik distal sumbu shaft femur kiri." },
  { key: "axisRightTop", label: "Axis Femur Kanan Atas", short: "FR-1", color: "#a78bfa", hint: "Klik titik proksimal sumbu shaft femur kanan." },
  { key: "axisRightBottom", label: "Axis Femur Kanan Bawah", short: "FR-2", color: "#7c3aed", hint: "Klik titik distal sumbu shaft femur kanan." },
  { key: "medialWallLeft", label: "Medial Wall Kiri", short: "MW-L", color: "#f59e0b", hint: "Klik medial wall quadrilateral plate / tepi medial acetabulum kiri." },
  { key: "medialWallRight", label: "Medial Wall Kanan", short: "MW-R", color: "#d97706", hint: "Klik medial wall quadrilateral plate / tepi medial acetabulum kanan." },
];

const CONNECTIONS = [
  { from: "tdLeft", to: "tdRight", color: "#14b8a6cc", dash: [10, 4] },
  { from: "headLeftA", to: "headLeftB", color: "#ec4899cc", dash: [4, 3] },
  { from: "headRightA", to: "headRightB", color: "#f472b6cc", dash: [4, 3] },
  { from: "axisLeftTop", to: "axisLeftBottom", color: "#6366f1cc", dash: [8, 3] },
  { from: "axisRightTop", to: "axisRightBottom", color: "#7c3aedcc", dash: [8, 3] },
];

const FLAG = {
  normal: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#16a34a", label: "Normal" },
  watch: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#d97706", label: "Monitor" },
  low: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#ea580c", label: "Rendah" },
  high: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", dot: "#dc2626", label: "Tinggi" },
};
const FLAG_DARK = {
  normal: { bg: "rgba(16,185,129,0.12)", border: "rgba(52,211,153,0.22)", text: "#34d399", dot: "#34d399", label: "Normal" },
  watch:  { bg: "rgba(217,119,6,0.14)",  border: "rgba(251,191,36,0.22)", text: "#fbbf24", dot: "#fbbf24", label: "Monitor" },
  low:    { bg: "rgba(234,88,12,0.12)",  border: "rgba(251,146,60,0.22)", text: "#fb923c", dot: "#fb923c", label: "Rendah" },
  high:   { bg: "rgba(220,38,38,0.12)",  border: "rgba(252,165,165,0.22)", text: "#f87171", dot: "#f87171", label: "Tinggi" },
};

function cupZoneStatus(abd, ant) {
  const inCallanan = abd >= CALLANAN_ZONE.abdMin && abd <= CALLANAN_ZONE.abdMax && ant >= CALLANAN_ZONE.antMin && ant <= CALLANAN_ZONE.antMax;
  const inLewinnek = abd >= LEWINNEK_ZONE.abdMin && abd <= LEWINNEK_ZONE.abdMax && ant >= LEWINNEK_ZONE.antMin && ant <= LEWINNEK_ZONE.antMax;
  if (inCallanan) return { label: "Safe Zone Optimal", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  if (inLewinnek) return { label: "Safe Zone Lewinnek", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  return { label: "Di Luar Safe Zone", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
}

function midpoint(a, b) {
  return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;
}

function dist(a, b) {
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
}

function unit(a, b) {
  if (!a || !b) return null;
  const len = dist(a, b);
  if (!len) return null;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

function pointLineDistance(p, a, b) {
  if (!p || !a || !b) return null;
  const den = Math.hypot(b.x - a.x, b.y - a.y);
  if (!den) return null;
  return Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x) / den;
}

function projectedDistanceAlong(p, origin, u) {
  if (!p || !origin || !u) return null;
  return (p.x - origin.x) * u.x + (p.y - origin.y) * u.y;
}

function projectedPointOnLine(p, a, b) {
  const u = unit(a, b);
  if (!p || !a || !u) return null;
  const d = projectedDistanceAlong(p, a, u);
  return { x: a.x + u.x * d, y: a.y + u.y * d };
}

function angleBetweenLines(a1, a2, b1, b2) {
  const u1 = unit(a1, a2);
  const u2 = unit(b1, b2);
  if (!u1 || !u2) return null;
  const dot = Math.max(-1, Math.min(1, Math.abs(u1.x * u2.x + u1.y * u2.y)));
  const deg = (Math.acos(dot) * 180) / Math.PI;
  return deg > 90 ? 180 - deg : deg;
}

function fmtValue(value, mmPerPixel, unit = "length", digits = 1, displayUnit = "mm") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  if (unit === "deg") return `${value.toFixed(digits)}°`;
  if (!mmPerPixel) return "Perlu kalibrasi";
  const mm = value * mmPerPixel;
  if (displayUnit === "cm") return `${(mm / 10).toFixed(2)} cm`;
  return `${mm.toFixed(digits)} mm`;
}

function classifyRange(value, low, high, watchHigh = null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (value < low) return "low";
  if (value > high) return "high";
  if (watchHigh !== null && value > watchHigh) return "watch";
  return "normal";
}

function ResultCard({ label, value, range, flag = "normal", note, isDark }) {
  const palette = isDark ? FLAG_DARK : FLAG;
  const s = palette[flag] || palette.normal;
  return (
    <div className="rounded-xl border p-3" style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>{label}</span>
        <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: s.dot + "28", color: s.dot }}>
          {s.label}
        </span>
      </div>
      <div className="mt-1 text-2xl font-black leading-none" style={{ color: s.text }}>{value}</div>
      <div className="mt-1 text-[9px] font-semibold" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>{range}</div>
      {note && <div className="mt-1.5 text-[10px] leading-snug" style={{ color: s.text }}>{note}</div>}
    </div>
  );
}

function CupAssessmentSummary({ cupAssessment, draftCupAssessment, onSaveDraft }) {
  const active = draftCupAssessment || cupAssessment;
  const zone = Number.isFinite(Number(active?.inclination)) && Number.isFinite(Number(active?.anteversion))
    ? cupZoneStatus(Number(active.inclination), Number(active.anteversion))
    : null;
  return (
    <div className="px-4 py-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Cup Assessment PostTHA</div>
          {draftCupAssessment && <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[8px] font-black text-cyan-700">Live</span>}
        </div>
        {active ? (
          <>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/80 bg-white p-2">
                <div className="text-[9px] font-black uppercase text-slate-400">Inclination</div>
                <div className="text-xl font-black text-orange-600">{Number(active.inclination).toFixed(1)}°</div>
              </div>
              <div className="rounded-lg border border-white/80 bg-white p-2">
                <div className="text-[9px] font-black uppercase text-slate-400">Anteversion</div>
                <div className="text-xl font-black text-cyan-600">{Number(active.anteversion).toFixed(1)}°</div>
              </div>
            </div>
            <div className="mt-2 rounded-lg border px-3 py-2 text-[11px] font-black" style={{ background: zone?.bg || "#fff", borderColor: zone?.border || "#e2e8f0", color: zone?.color || "#64748b" }}>
              {active.zone || zone?.label || "Cup Assess"} · {active.side === "left" ? "Kiri" : "Kanan"}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-amber-800">
              Nilai ini diambil dari ellipse cup ringan di kanvas kiri dan akan dibaca saat export PDF.
            </p>
            {draftCupAssessment && (
              <button type="button" onClick={onSaveDraft} className="mt-3 w-full rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-black text-white">
                Simpan Cup Assessment
              </button>
            )}
          </>
        ) : (
          <p className="mt-2 text-[11px] leading-relaxed text-amber-800">
            Posisikan ellipse cup pada kanvas kiri. Hasil inclination dan anteversion akan tampil di sini.
          </p>
        )}
      </div>
    </div>
  );
}

function LightCupAssessment({ savedData, side, onChange, transform, onEllipseChange }) {
  const boxRef = useRef(null);
  const [size, setSize] = useState({ w: 900, h: 580 });
  const [dragging, setDragging] = useState(null);
  const [handleSmall, setHandleSmall] = useState(false);
  // State stored in IMAGE coordinates (image natural pixels) so it sticks to the photo
  const [imgState, setImgState] = useState(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const resize = () => {
      const w = Math.max(320, Math.round(el.clientWidth || 900));
      const h = Math.max(260, Math.round(el.clientHeight || 580));
      setSize({ w, h });
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    return () => ro.disconnect();
  }, []);

  // CSS-pixel transform derived from canvas transform (canvas uses physical/DPR pixels)
  const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
  const cssScale = transform.scale / dpr;
  const cssOffX = transform.offsetX / dpr;
  const cssOffY = transform.offsetY / dpr;

  // Initialize ellipse in image space once
  useEffect(() => {
    if (imgState || cssScale <= 0) return;
    const imgA = (Math.min(size.w, size.h) * 0.18) / Math.max(cssScale, 0.01);
    const antDeg = Number(savedData?.anteversion) || 15;
    setImgState({
      cx: (size.w * 0.5 - cssOffX) / Math.max(cssScale, 0.01),
      cy: (size.h * 0.48 - cssOffY) / Math.max(cssScale, 0.01),
      a: imgA,
      b: imgA * Math.sin((antDeg * Math.PI) / 180),
      angle: ((Number(savedData?.inclination) || 40) * Math.PI) / 180,
    });
  }, [imgState, size.w, size.h, cssScale, cssOffX, cssOffY, savedData]);

  // Current image-space state (fallback until initialized)
  const s = imgState || {
    cx: (size.w * 0.5 - cssOffX) / Math.max(cssScale, 0.01),
    cy: (size.h * 0.48 - cssOffY) / Math.max(cssScale, 0.01),
    a: (Math.min(size.w, size.h) * 0.18) / Math.max(cssScale, 0.01),
    b: (Math.min(size.w, size.h) * 0.047) / Math.max(cssScale, 0.01),
    angle: (40 * Math.PI) / 180,
  };

  // Convert image → CSS pixels for SVG rendering
  const scx = s.cx * cssScale + cssOffX;
  const scy = s.cy * cssScale + cssOffY;
  const sa = s.a * cssScale;
  const sb = s.b * cssScale;

  const cos = Math.cos(s.angle);
  const sin = Math.sin(s.angle);
  const rawInclination = (((s.angle * 180) / Math.PI) % 180 + 180) % 180;
  const inclination = rawInclination > 90 ? 180 - rawInclination : rawInclination;
  const anteversion = (Math.asin(Math.max(0, Math.min(0.999, Math.abs(s.b / s.a)))) * 180) / Math.PI;
  const zone = cupZoneStatus(inclination, anteversion);

  const handles = {
    center: { x: scx, y: scy },
    majorA: { x: scx - sa * cos, y: scy - sa * sin },
    majorB: { x: scx + sa * cos, y: scy + sa * sin },
    minorA: { x: scx + sb * sin, y: scy - sb * cos },
    minorB: { x: scx - sb * sin, y: scy + sb * cos },
  };
  const ellipsePoints = Array.from({ length: 72 }, (_, i) => {
    const t = (i / 72) * Math.PI * 2;
    const ex = sa * Math.cos(t);
    const ey = sb * Math.sin(t);
    return `${i === 0 ? "M" : "L"}${(scx + ex * cos - ey * sin).toFixed(1)},${(scy + ex * sin + ey * cos).toFixed(1)}`;
  }).join(" ") + " Z";

  // Semi-ellipse dome: from majorA (t=π) through minorA (t=3π/2) to majorB (t=2π)
  // closed with Z → straight line majorB→majorA = the major axis → creates a closed cup-dome shape
  const domePoints = Array.from({ length: 37 }, (_, i) => {
    const t = Math.PI + (i / 36) * Math.PI;
    const ex = sa * Math.cos(t);
    const ey = sb * Math.sin(t);
    return `${i === 0 ? "M" : "L"}${(scx + ex * cos - ey * sin).toFixed(1)},${(scy + ex * sin + ey * cos).toFixed(1)}`;
  }).join(" ") + " Z";

  const commitCup = useCallback((target) => {
    const raw = (((target.angle * 180) / Math.PI) % 180 + 180) % 180;
    const inc = raw > 90 ? 180 - raw : raw;
    const av = (Math.asin(Math.max(0, Math.min(0.999, Math.abs(target.b / target.a)))) * 180) / Math.PI;
    onChange?.({ inclination: inc, anteversion: av, side, zone: cupZoneStatus(inc, av).label });
  }, [onChange, side]);

  // Expose raw image-space state so parent can include it in PDF export
  useEffect(() => {
    if (!imgState) return;
    onEllipseChange?.(imgState);
  }, [imgState, onEllipseChange]);

  const pointFromEvent = (e) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return { x: e.clientX, y: e.clientY };
    const cssPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return { x: (cssPt.x - cssOffX) / Math.max(cssScale, 0.01), y: (cssPt.y - cssOffY) / Math.max(cssScale, 0.01) };
  };
  const startDrag = (id) => (e) => {
    e.stopPropagation();
    setDragging(id);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const p = pointFromEvent(e);
    setImgState((prev) => {
      const cur = prev || s;
      const c = Math.cos(cur.angle);
      const sn = Math.sin(cur.angle);
      if (dragging === "center") return { ...cur, cx: p.x, cy: p.y };
      if (dragging === "majorA" || dragging === "majorB") {
        const dx = p.x - cur.cx;
        const dy = p.y - cur.cy;
        const newA = Math.max(18 / Math.max(cssScale, 0.01), Math.hypot(dx, dy));
        const angle = dragging === "majorA" ? Math.atan2(dy, dx) + Math.PI : Math.atan2(dy, dx);
        return { ...cur, a: newA, b: Math.min(cur.b, newA * 0.9), angle };
      }
      const dx = p.x - cur.cx;
      const dy = p.y - cur.cy;
      const b = Math.max(4 / Math.max(cssScale, 0.01), Math.min(cur.a * 0.9, Math.abs(dx * sn - dy * c)));
      return { ...cur, b };
    });
  };
  const stopDrag = () => {
    if (dragging && imgState) commitCup(imgState);
    setDragging(null);
  };

  const resizeEllipse = (factor) => setImgState((prev) => {
    if (!prev) return prev;
    const minA = 18 / Math.max(cssScale, 0.01);
    const minB = 4 / Math.max(cssScale, 0.01);
    const newA = Math.max(minA, prev.a * factor);
    const newB = Math.max(minB, Math.min(newA * 0.9, prev.b * factor));
    return { ...prev, a: newA, b: newB };
  });

  return (
    <div ref={boxRef} className={`absolute inset-0 z-20 ${dragging ? "pointer-events-auto" : "pointer-events-none"}`} onPointerMove={move} onPointerUp={stopDrag} onPointerLeave={stopDrag}>
      <svg className="h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`}>
        {/* Horizontal reference */}
        <line x1={0} y1={scy} x2={size.w} y2={scy} stroke="#facc15" strokeWidth="1" strokeDasharray="8 6" opacity="0.5" />
        {/* Major axis (inclination) */}
        <line x1={handles.majorA.x} y1={handles.majorA.y} x2={handles.majorB.x} y2={handles.majorB.y} stroke="#a3e635" strokeWidth="1.35" strokeDasharray="6 4" opacity="0.85" />
        {/* Minor axis (anteversion) */}
        <line x1={handles.minorA.x} y1={handles.minorA.y} x2={handles.minorB.x} y2={handles.minorB.y} stroke="#22d3ee" strokeWidth="1.35" opacity="0.85" />
        {/* Outer ellipse — cup rim */}
        <path d={ellipsePoints} fill="rgba(249,115,22,0.06)" stroke="#f97316" strokeWidth="1.8" />
        {/* Inner dome — half-ellipse from majorA through minorA to majorB, closed along major axis */}
        <path d={domePoints} fill="rgba(34,211,238,0.10)" stroke="#22d3ee" strokeWidth="1.4" strokeDasharray="5 3" />
        {/* Label */}
        <text x={scx + 10} y={scy - 12} fill={zone.color} fontSize="11" fontWeight="900">{`INC ${inclination.toFixed(1)}° · AV ${anteversion.toFixed(1)}°`}</text>
        {/* Drag handles */}
        {[
          ["center", handles.center, "#7c3aed", handleSmall ? 3 : 6],
          ["majorA", handles.majorA, "#facc15", handleSmall ? 4 : 7],
          ["majorB", handles.majorB, "#facc15", handleSmall ? 4 : 7],
          ["minorA", handles.minorA, "#22d3ee", handleSmall ? 4 : 7],
          ["minorB", handles.minorB, "#22d3ee", handleSmall ? 4 : 7],
        ].map(([id, p, color, r]) => (
          <g key={id} className="pointer-events-auto cursor-move" onPointerDown={startDrag(id)}>
            <circle cx={p.x} cy={p.y} r={Math.max(r + 7, 14)} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={r} fill={color} stroke="#fff" strokeWidth="1.5" />
          </g>
        ))}
        {/* Size controls — top-left corner */}
        {[
          { label: "−", x: 10, factor: 0.85 },
          { label: "+", x: 46, factor: 1.15 },
        ].map(({ label, x, factor }) => (
          <g key={label} className="pointer-events-auto" style={{ cursor: "pointer" }} onClick={() => resizeEllipse(factor)}>
            <rect x={x} y={10} width={28} height={28} rx={7} fill="rgba(15,23,42,0.72)" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <text x={x + 14} y={29} fill="white" fontSize={18} fontWeight="900" textAnchor="middle" style={{ userSelect: "none" }}>{label}</text>
          </g>
        ))}
        {/* Handle-size toggle — dot icon, active when small */}
        <g className="pointer-events-auto" style={{ cursor: "pointer" }} onClick={() => setHandleSmall((p) => !p)}>
          <rect x={82} y={10} width={28} height={28} rx={7} fill="rgba(15,23,42,0.72)" stroke={handleSmall ? "rgba(250,204,21,0.7)" : "rgba(255,255,255,0.18)"} strokeWidth={1.5} />
          <circle cx={96} cy={24} r={handleSmall ? 3 : 5.5} fill="#facc15" stroke="#fff" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}

function exampleForLandmark(item) {
  if (!item) return null;
  if (item.key.startsWith("td") || item.key.startsWith("medialWall")) {
    return {
      title: "Teardrop & medial wall",
      src: "/images/jurnal-scheerlinck/fig1-anatomical-landmarks.jpeg",
      caption: "Contoh referensi teardrop pelvis dan tepi medial acetabulum untuk baseline serta offset acetabular.",
    };
  }
  if (item.key.startsWith("head")) {
    return {
      title: "Diameter head / COR",
      src: "/images/jurnal-scheerlinck/fig5-templating-rotation-centre.jpeg",
      caption: "Pilih dua tepi diameter head; midpoint dipakai sebagai center of rotation.",
    };
  }
  if (item.key.startsWith("lt") || item.key.startsWith("axis")) {
    return {
      title: "Hip length & offset",
      src: "/images/jurnal-scheerlinck/fig3-mechanical-references.jpeg",
      caption: "Lesser trochanter dan axis femur dipakai untuk LLD serta femoral offset.",
    };
  }
  return {
    title: "Cup orientation",
    src: "/images/jurnal-scheerlinck/fig7-varus-valgus.jpeg",
    caption: "Rim cup dan minor axis membantu menghitung inclination serta anteversion pada AP pelvis.",
  };
}

function ExampleHover({ item }) {
  const example = exampleForLandmark(item);
  if (!example) return null;
  return (
    <span className="group relative inline-flex shrink-0">
      <HelpCircle className="h-4 w-4 text-slate-400 transition group-hover:text-rose-500" />
      <span className="pointer-events-none fixed right-6 top-28 z-[500] hidden w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl group-hover:block lg:right-[450px]">
        <img src={example.src} alt={example.title} className="h-56 w-full bg-slate-100 object-contain" />
        <span className="block p-3">
          <span className="block text-xs font-black text-slate-700">{example.title}</span>
          <span className="mt-1 block text-[11px] leading-snug text-slate-500">{example.caption}</span>
        </span>
      </span>
    </span>
  );
}

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
    offsetX: (canvas.width - img.naturalWidth * scale) / 2,
    offsetY: (canvas.height - img.naturalHeight * scale) / 2,
  };
}

function drawCircle(ctx, x, y, r, fill, stroke = "#111827") {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLabel(ctx, text, x, y, color) {
  ctx.font = "bold 12px sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.78)";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x + 10, y - 8);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 10, y - 8);
}

function drawLine(ctx, a, b, color, dash = []) {
  if (!a || !b) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.7;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function screenDistanceToSegment(p, a, b) {
  if (!p || !a || !b) return Infinity;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.hypot(p.x - x, p.y - y);
}

function drawJournalLabel(ctx, text, x, y, color) {
  ctx.save();
  ctx.font = "bold 11px sans-serif";
  ctx.strokeStyle = "rgba(15,23,42,0.88)";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x + 8, y - 6);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 8, y - 6);
  ctx.restore();
}

function drawJournalSegment(ctx, a, b, color, label, options, dash = []) {
  if (!a || !b || !options?.lines) return;
  drawLine(ctx, a, b, color, dash);
  if (options.text && label) drawJournalLabel(ctx, label, (a.x + b.x) / 2, (a.y + b.y) / 2, color);
}

function drawExtendedLine(ctx, a, b, color, label, options, dash = []) {
  if (!a || !b || !options?.lines) return;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (!len) return;
  const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const span = Math.max(ctx.canvas.width, ctx.canvas.height) * 1.2;
  const p1 = { x: (a.x + b.x) / 2 - u.x * span, y: (a.y + b.y) / 2 - u.y * span };
  const p2 = { x: (a.x + b.x) / 2 + u.x * span, y: (a.y + b.y) / 2 + u.y * span };
  drawLine(ctx, p1, p2, color, dash);
  if (options.text && label) drawJournalLabel(ctx, label, a.x, a.y, color);
}

function drawReferenceOverlays(ctx, t, points, cupPoints, results, options = { points: true, lines: true, text: true }) {
  const tdLeft = points.tdLeft;
  const tdRight = points.tdRight;
  const tdU = unit(tdLeft, tdRight);
  const toScreen = (p) => p && imgToScreen(p, t);

  drawExtendedLine(ctx, toScreen(tdLeft), toScreen(tdRight), "#14b8a6", "Inter-teardrop line", options, [14, 5]);

  [
    { key: "L", hrc: results.hrcLeft, lt: points.ltLeft, wall: points.medialWallLeft, axisA: points.axisLeftTop, axisB: points.axisLeftBottom },
    { key: "R", hrc: results.hrcRight, lt: points.ltRight, wall: points.medialWallRight, axisA: points.axisRightTop, axisB: points.axisRightBottom },
  ].forEach((side) => {
    const hrcProjection = projectedPointOnLine(side.hrc, tdLeft, tdRight);
    const ltProjection = projectedPointOnLine(side.lt, tdLeft, tdRight);
    const axisProjection = projectedPointOnLine(side.hrc, side.axisA, side.axisB);
    const wallProjection = tdU && side.wall && side.hrc
      ? { x: side.wall.x + tdU.x * projectedDistanceAlong(side.hrc, side.wall, tdU), y: side.wall.y + tdU.y * projectedDistanceAlong(side.hrc, side.wall, tdU) }
      : null;

    drawJournalSegment(ctx, toScreen(side.hrc), toScreen(hrcProjection), "#f9a8d4", `COR ${side.key} vertical`, options, [5, 4]);
    drawJournalSegment(ctx, toScreen(side.lt), toScreen(ltProjection), "#38bdf8", `Hip length ${side.key}`, options, [5, 4]);
    drawExtendedLine(ctx, toScreen(side.axisA), toScreen(side.axisB), "#818cf8", `Femoral axis ${side.key}`, options, [10, 4]);
    drawJournalSegment(ctx, toScreen(side.hrc), toScreen(axisProjection), "#a78bfa", `Femoral offset ${side.key}`, options, []);
    drawJournalSegment(ctx, toScreen(side.wall), toScreen(wallProjection), "#f59e0b", `Acetabular offset ${side.key}`, options, []);

    if (options.points && side.hrc) {
      const p = toScreen(side.hrc);
      drawCircle(ctx, p.x, p.y, 8, "#f9a8d4", "#ffffff");
      if (options.text) drawLabel(ctx, `COR-${side.key}`, p.x, p.y, "#f9a8d4");
    }
  });

  drawExtendedLine(ctx, toScreen(cupPoints.cupRimA), toScreen(cupPoints.cupRimB), "#f97316", "Cup major axis", options, [8, 4]);
  const cupMinorProjection = projectedPointOnLine(cupPoints.cupMinor, cupPoints.cupRimA, cupPoints.cupRimB);
  drawJournalSegment(ctx, toScreen(cupPoints.cupMinor), toScreen(cupMinorProjection), "#22d3ee", "Cup minor axis", options, []);
  if (options.points && results.cupCenter) {
    const p = toScreen(results.cupCenter);
    drawCircle(ctx, p.x, p.y, 8, "#f97316", "#ffffff");
    if (options.text) drawLabel(ctx, "CUP", p.x, p.y, "#f97316");
  }
}

function usePointsHistory() {
  const [hist, setHist] = useState({ stack: [{}], idx: 0 });
  const points = hist.stack[hist.idx];
  const setPoints = useCallback((updater) => {
    setHist((prev) => {
      const cur = prev.stack[prev.idx];
      const next = typeof updater === "function" ? updater(cur) : updater;
      const stack = [...prev.stack.slice(0, prev.idx + 1), next];
      return { stack, idx: stack.length - 1 };
    });
  }, []);
  const setPointsLive = useCallback((updater) => {
    setHist((prev) => {
      const cur = prev.stack[prev.idx];
      const next = typeof updater === "function" ? updater(cur) : updater;
      const stack = [...prev.stack];
      stack[prev.idx] = next;
      return { ...prev, stack };
    });
  }, []);
  const reset = useCallback(() => setHist({ stack: [{}], idx: 0 }), []);
  return { points, setPoints, setPointsLive, reset };
}

function LandmarkCanvas({
  imageSrc,
  points,
  landmarkDefs,
  connections,
  displayOptions = { points: true, lines: true, text: true },
  activeIndex,
  setPoints,
  setPointsLive = setPoints,
  transform,
  setTransform,
  canvasRef,
  drawOverlay,
}) {
  const imgRef = useRef(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const [loaded, setLoaded] = useState(false);

  const pointsRef = useRef(points);
  pointsRef.current = points;
  const landmarkDefsRef = useRef(landmarkDefs);
  landmarkDefsRef.current = landmarkDefs;
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;
  const displayOptionsRef = useRef(displayOptions);
  displayOptionsRef.current = displayOptions;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const setPointsRef = useRef(setPoints);
  setPointsRef.current = setPoints;
  const setPointsLiveRef = useRef(setPointsLive);
  setPointsLiveRef.current = setPointsLive;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round((container.clientWidth || 900) * dpr);
      const h = Math.round((container.clientHeight || 580) * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      if (imgRef.current) setTransform(fitTransform(imgRef.current, canvas));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, [canvasRef, setTransform]);

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
      ctx.fillStyle = "#64748b";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Upload AP pelvis X-ray untuk memulai", canvas.width / 2, canvas.height / 2);
      ctx.textAlign = "left";
    }

    if (displayOptions.lines) {
      connections.forEach(({ from, to, color, dash }) => {
        drawLine(ctx, points[from] && imgToScreen(points[from], transform), points[to] && imgToScreen(points[to], transform), color, dash || []);
      });
    }
    landmarkDefs.forEach((def, i) => {
      const pt = points[def.key];
      if (!pt) return;
      const sp = imgToScreen(pt, transform);
      if (displayOptions.points) drawCircle(ctx, sp.x, sp.y, i === activeIndex ? 9 : 7, def.color);
      if (displayOptions.text) drawLabel(ctx, def.short, sp.x, sp.y, def.color);
    });
    drawOverlay?.(ctx, transform, displayOptions);
  }, [canvasRef, loaded, transform, points, landmarkDefs, connections, displayOptions, activeIndex, drawOverlay]);

  const getCanvasPoint = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gesture = { current: null };
    const hit = (sx, sy) => {
      for (const def of landmarkDefsRef.current) {
        const pt = pointsRef.current[def.key];
        if (!pt) continue;
        const sp = imgToScreen(pt, transformRef.current);
        if (Math.hypot(sp.x - sx, sp.y - sy) < 30) return def.key;
      }
      return null;
    };
    const hitLine = (sx, sy) => {
      if (!displayOptionsRef.current.lines) return null;
      const p = { x: sx, y: sy };
      for (const connection of connectionsRef.current) {
        const a = pointsRef.current[connection.from];
        const b = pointsRef.current[connection.to];
        if (!a || !b) continue;
        const sa = imgToScreen(a, transformRef.current);
        const sb = imgToScreen(b, transformRef.current);
        if (screenDistanceToSegment(p, sa, sb) < 24) {
          return { from: connection.from, to: connection.to, start: { [connection.from]: a, [connection.to]: b } };
        }
      }
      return null;
    };
    const down = (e) => {
      if (e.button !== 0) return;
      const cp = getCanvasPoint(e.clientX, e.clientY);
      if (!cp) return;
      const hitKey = hit(cp.x, cp.y);
      const lineHit = hitKey ? null : hitLine(cp.x, cp.y);
      gesture.current = {
        startX: cp.x,
        startY: cp.y,
        offsetX: transformRef.current.offsetX,
        offsetY: transformRef.current.offsetY,
        hitKey,
        lineHit,
        moved: false,
      };
    };
    const move = (e) => {
      const g = gesture.current;
      if (!g) return;
      const cp = getCanvasPoint(e.clientX, e.clientY);
      if (!cp) return;
      const dx = cp.x - g.startX;
      const dy = cp.y - g.startY;
      if (!g.moved && Math.hypot(dx, dy) > 3) g.moved = true;
      if (!g.moved) return;
      if (g.hitKey) {
        const imgPt = screenToImg(cp, transformRef.current);
        setPointsLiveRef.current((prev) => ({ ...prev, [g.hitKey]: imgPt }));
      } else if (g.lineHit) {
        const t = transformRef.current;
        const ix = dx / t.scale;
        const iy = dy / t.scale;
        setPointsLiveRef.current((prev) => ({
          ...prev,
          [g.lineHit.from]: { x: g.lineHit.start[g.lineHit.from].x + ix, y: g.lineHit.start[g.lineHit.from].y + iy },
          [g.lineHit.to]: { x: g.lineHit.start[g.lineHit.to].x + ix, y: g.lineHit.start[g.lineHit.to].y + iy },
        }));
      } else {
        setTransform((t) => ({ ...t, offsetX: g.offsetX + dx, offsetY: g.offsetY + dy }));
      }
    };
    const up = (e) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || g.moved || g.hitKey || g.lineHit) return;
      const aidx = activeIndexRef.current;
      const defs = landmarkDefsRef.current;
      if (aidx < 0 || aidx >= defs.length) return;
      const cp = getCanvasPoint(e.clientX, e.clientY);
      if (!cp || hit(cp.x, cp.y)) return;
      setPointsRef.current((prev) => ({ ...prev, [defs[aidx].key]: screenToImg(cp, transformRef.current) }));
    };
    const wheel = (e) => {
      e.preventDefault();
      const cp = getCanvasPoint(e.clientX, e.clientY);
      if (!cp) return;
      const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
      setTransform((t) => {
        const ns = Math.min(30, Math.max(0.08, t.scale * factor));
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
  }, [canvasRef, getCanvasPoint, setTransform]);

  const cursor = activeIndex >= 0 && activeIndex < landmarkDefs.length ? "crosshair" : "grab";
  return <canvas ref={canvasRef} className="h-full w-full" style={{ display: "block", cursor }} />;
}

function buildResults(points, cupPoints, mmPerPixel, operatedSide, cupAssessment) {
  const tdU = unit(points.tdLeft, points.tdRight);
  const tdV = tdU ? { x: -tdU.y, y: tdU.x } : null;
  const hrcLeft = midpoint(points.headLeftA, points.headLeftB);
  const hrcRight = midpoint(points.headRightA, points.headRightB);
  const corDx = hrcLeft && hrcRight && tdU ? Math.abs(projectedDistanceAlong(hrcRight, hrcLeft, tdU)) : null;
  const corDy = hrcLeft && hrcRight && tdV ? Math.abs(projectedDistanceAlong(hrcRight, hrcLeft, tdV)) : null;

  const hLenLeft = points.ltLeft && points.tdLeft && points.tdRight ? pointLineDistance(points.ltLeft, points.tdLeft, points.tdRight) : null;
  const hLenRight = points.ltRight && points.tdLeft && points.tdRight ? pointLineDistance(points.ltRight, points.tdLeft, points.tdRight) : null;
  const lld = hLenLeft !== null && hLenRight !== null ? Math.abs(hLenRight - hLenLeft) : null;

  const fOffLeft = hrcLeft ? pointLineDistance(hrcLeft, points.axisLeftTop, points.axisLeftBottom) : null;
  const fOffRight = hrcRight ? pointLineDistance(hrcRight, points.axisRightTop, points.axisRightBottom) : null;
  const fOffDelta = fOffLeft !== null && fOffRight !== null ? Math.abs(fOffRight - fOffLeft) : null;

  const aOffLeft = hrcLeft && points.medialWallLeft && tdU ? Math.abs(projectedDistanceAlong(hrcLeft, points.medialWallLeft, tdU)) : null;
  const aOffRight = hrcRight && points.medialWallRight && tdU ? Math.abs(projectedDistanceAlong(hrcRight, points.medialWallRight, tdU)) : null;
  const gOffLeft = fOffLeft !== null && aOffLeft !== null ? fOffLeft + aOffLeft : null;
  const gOffRight = fOffRight !== null && aOffRight !== null ? fOffRight + aOffRight : null;
  const gOffDelta = gOffLeft !== null && gOffRight !== null ? Math.abs(gOffRight - gOffLeft) : null;

  const savedInclination = Number(cupAssessment?.inclination);
  const savedAnteversion = Number(cupAssessment?.anteversion);
  const measuredInclination = points.tdLeft && points.tdRight && cupPoints.cupRimA && cupPoints.cupRimB
    ? angleBetweenLines(points.tdLeft, points.tdRight, cupPoints.cupRimA, cupPoints.cupRimB)
    : null;
  const cupCenter = midpoint(cupPoints.cupRimA, cupPoints.cupRimB);
  const major = dist(cupPoints.cupRimA, cupPoints.cupRimB);
  const minor = cupPoints.cupMinor && cupPoints.cupRimA && cupPoints.cupRimB
    ? pointLineDistance(cupPoints.cupMinor, cupPoints.cupRimA, cupPoints.cupRimB) * 2
    : null;
  const measuredAnteversion = major && minor !== null
    ? (Math.asin(Math.max(0, Math.min(0.999, Math.abs(minor / major)))) * 180) / Math.PI
    : null;
  const inclination = Number.isFinite(savedInclination) ? savedInclination : measuredInclination;
  const anteversion = Number.isFinite(savedAnteversion) ? savedAnteversion : measuredAnteversion;

  const pxToMm = (px) => (mmPerPixel && px !== null ? px * mmPerPixel : null);
  const mm = {
    corDx: pxToMm(corDx),
    corDy: pxToMm(corDy),
    lld: pxToMm(lld),
    fOffDelta: pxToMm(fOffDelta),
    gOffDelta: pxToMm(gOffDelta),
  };

  return {
    operatedSide,
    hrcLeft,
    hrcRight,
    cupCenter,
    corDx,
    corDy,
    lld,
    fOffLeft,
    fOffRight,
    fOffDelta,
    aOffLeft,
    aOffRight,
    gOffLeft,
    gOffRight,
    gOffDelta,
    inclination,
    anteversion,
    flags: {
      corX: mm.corDx === null ? "normal" : mm.corDx > 5 ? "high" : "normal",
      corY: mm.corDy === null ? "normal" : mm.corDy > 3 ? "high" : "normal",
      lld: mm.lld === null ? "normal" : mm.lld > 10 ? "high" : mm.lld >= 6 ? "watch" : "normal",
      fOff: mm.fOffDelta === null ? "normal" : mm.fOffDelta > 5 ? "high" : "normal",
      gOff: mm.gOffDelta === null ? "normal" : mm.gOffDelta > 5 ? "high" : "normal",
      inc: inclination === null ? "normal" : classifyRange(inclination, 30, 50, 45),
      av: anteversion === null ? "normal" : classifyRange(anteversion, 5, 25),
    },
  };
}

function renderAnnotatedImage(img, points, cupPoints, results, displayOptions, cupEllipseState, maxWidth = 1400, maxHeight = 1200) {
  if (!img?.naturalWidth) return null;
  const s = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * s);
  canvas.height = Math.round(img.naturalHeight * s);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const t = { scale: s, offsetX: 0, offsetY: 0 };
  if (displayOptions.lines) {
  [...CONNECTIONS].forEach(({ from, to, color, dash }) => {
    const src = points[from] ? points : cupPoints;
      drawLine(ctx, src[from] && imgToScreen(src[from], t), src[to] && imgToScreen(src[to], t), color, dash || []);
    });
  }
  LANDMARKS.forEach((def) => {
    const pt = points[def.key] || cupPoints[def.key];
    if (!pt) return;
    const sp = imgToScreen(pt, t);
    if (displayOptions.points) drawCircle(ctx, sp.x, sp.y, 7, def.color);
    if (displayOptions.text) drawLabel(ctx, def.short, sp.x, sp.y, def.color);
  });
  drawReferenceOverlays(ctx, t, points, cupPoints, results, displayOptions);

  // Draw cup assessment ellipse from image-space coordinates
  if (cupEllipseState) {
    const { cx: icx, cy: icy, a: ia, b: ib, angle } = cupEllipseState;
    const ex = icx * s, ey = icy * s, ea = ia * s, eb = ib * s;
    const ec = Math.cos(angle), es = Math.sin(angle);

    // Outer ellipse — cup rim
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const tt = (i / 72) * Math.PI * 2;
      const px = ea * Math.cos(tt), py = eb * Math.sin(tt);
      const tx = ex + px * ec - py * es, ty = ey + px * es + py * ec;
      i === 0 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(249,115,22,0.10)"; ctx.fill();
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();

    // Inner dome — half-ellipse from majorA through minorA to majorB, closed along major axis
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const tt = Math.PI + (i / 36) * Math.PI;
      const px = ea * Math.cos(tt), py = eb * Math.sin(tt);
      const tx = ex + px * ec - py * es, ty = ey + px * es + py * ec;
      i === 0 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(34,211,238,0.12)"; ctx.fill();
    ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1.8; ctx.setLineDash([7, 5]); ctx.stroke();
    ctx.setLineDash([]);

    // Major axis line (inclination)
    ctx.strokeStyle = "#a3e635"; ctx.lineWidth = 1.8; ctx.setLineDash([9, 6]);
    ctx.beginPath(); ctx.moveTo(ex - ea * ec, ey - ea * es); ctx.lineTo(ex + ea * ec, ey + ea * es); ctx.stroke();
    ctx.setLineDash([]);

    // Minor axis line (anteversion)
    ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ex + eb * es, ey - eb * ec); ctx.lineTo(ex - eb * es, ey + eb * ec); ctx.stroke();

    // Center dot
    ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#7c3aed"; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();

    // Label
    const inc = (() => { const r = (((angle * 180) / Math.PI) % 180 + 180) % 180; return r > 90 ? 180 - r : r; })();
    const av = (Math.asin(Math.max(0, Math.min(0.999, Math.abs(ib / ia)))) * 180) / Math.PI;
    ctx.font = "bold 16px sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.82)"; ctx.lineWidth = 4;
    ctx.strokeText(`INC ${inc.toFixed(1)}°  AV ${av.toFixed(1)}°`, ex + 12, ey - 14);
    ctx.fillStyle = "#f97316"; ctx.fillText(`INC ${inc.toFixed(1)}°  AV ${av.toFixed(1)}°`, ex + 12, ey - 14);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

function renderCupDiagram(cupData, W = 400, H = 280) {
  if (!cupData || !Number.isFinite(Number(cupData.inclination))) return null;
  const inclination = Number(cupData.inclination);
  const anteversion = Number(cupData.anteversion);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.5, cy = H * 0.5;
  const a = Math.min(W, H) * 0.28;
  const b = a * Math.sin(Math.min(0.9999, (anteversion * Math.PI) / 180));
  const angle = (inclination * Math.PI) / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  ctx.strokeStyle = "rgba(250,204,21,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  ctx.setLineDash([]);

  const makePts = (sa, sb) => Array.from({ length: 64 }, (_, i) => {
    const t = (i / 64) * Math.PI * 2;
    const ex = sa * Math.cos(t), ey = sb * Math.sin(t);
    return { x: cx + ex * cos - ey * sin, y: cy + ex * sin + ey * cos };
  });

  const drawEllipsePath = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
  };

  drawEllipsePath(makePts(a, b));
  ctx.fillStyle = "rgba(249,115,22,0.1)"; ctx.fill();
  ctx.strokeStyle = "#f97316"; ctx.lineWidth = 2; ctx.stroke();

  drawEllipsePath(makePts(a * 0.82, b * 0.82));
  ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

  ctx.strokeStyle = "#a3e635"; ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(cx - a * cos, cy - a * sin);
  ctx.lineTo(cx + a * cos, cy + a * sin);
  ctx.stroke(); ctx.setLineDash([]);

  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#7c3aed"; ctx.fill();

  const zone = cupZoneStatus(inclination, anteversion);
  ctx.textAlign = "center";
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`INC: ${inclination.toFixed(1)}°  ·  AV: ${anteversion.toFixed(1)}°`, W / 2, H - 35);
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = zone.color;
  ctx.fillText(zone.label, W / 2, H - 18);
  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`Cup ${cupData.side === "left" ? "Kiri" : "Kanan"}`, W / 2, H - 5);

  return canvas.toDataURL("image/jpeg", 0.92);
}

async function exportToPDF({ imgRef, points, cupPoints, results, mmPerPixel, operatedSide, displayUnit, displayOptions, cupAssessment, cupEllipseState }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const M = 14;
  let y = M;
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  doc.setFillColor(244, 63, 94);
  doc.rect(0, 0, 210, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("PostTHA Radiographic Assessment", M, 10);
  doc.setFontSize(8);
  doc.text(`Tanggal: ${today} · Sisi operasi: ${operatedSide === "left" ? "Kiri" : "Kanan"}`, M, 17);
  y = 34;

  const row = (label, value, range, flag) => {
    const c = FLAG[flag] || FLAG.normal;
    const rgb = flag === "high" ? [185, 28, 28] : flag === "watch" ? [146, 64, 14] : [21, 128, 61];
    doc.setFillColor(flag === "high" ? 254 : flag === "watch" ? 255 : 240, flag === "high" ? 242 : flag === "watch" ? 251 : 253, flag === "high" ? 242 : flag === "watch" ? 235 : 244);
    doc.roundedRect(M, y, 182, 18, 2, 2, "F");
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(label, M + 3, y + 6);
    doc.setTextColor(...rgb);
    doc.setFontSize(12);
    doc.text(value, M + 112, y + 9, { align: "right" });
    doc.setFontSize(6);
    doc.text(range, M + 116, y + 6);
    doc.text(c.label, 196 - M, y + 12, { align: "right" });
    y += 21;
  };

  row("COR horizontal", fmtValue(results.corDx, mmPerPixel, "length", 1, displayUnit), "Target <=5 mm", results.flags.corX);
  row("COR vertical", fmtValue(results.corDy, mmPerPixel, "length", 1, displayUnit), "Target <=3 mm superior", results.flags.corY);
  row("LLD", fmtValue(results.lld, mmPerPixel, "length", 1, displayUnit), ">6 mm terasa, >10 mm bermasalah", results.flags.lld);
  row("Delta femoral offset", fmtValue(results.fOffDelta, mmPerPixel, "length", 1, displayUnit), "Target <=5 mm", results.flags.fOff);
  row("Delta global offset", fmtValue(results.gOffDelta, mmPerPixel, "length", 1, displayUnit), "Bandingkan sisi normal", results.flags.gOff);
  row("Cup inclination", fmtValue(results.inclination, mmPerPixel, "deg"), cupAssessment ? "Dari Cup Assess" : "Target sekitar 45 deg", results.flags.inc);
  row("Cup anteversion", fmtValue(results.anteversion, mmPerPixel, "deg"), cupAssessment ? (cupAssessment.zone || "Dari Cup Assess") : "Lewinnek 5-25 deg", results.flags.av);

  const cupDiagramUrl = renderCupDiagram(cupAssessment);
  if (cupDiagramUrl) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Cup Orientation Diagram", M, y);
    y += 3;
    const dW = 90, dH = Math.round(dW * 280 / 400);
    doc.addImage(cupDiagramUrl, "JPEG", M + (182 - dW) / 2, y, dW, dH, undefined, "FAST");
  }

  const url = renderAnnotatedImage(imgRef.current, points, cupPoints, results, displayOptions, cupEllipseState, 2400, 1800);
  if (url) {
    doc.addPage("a4", "landscape");
    const LW = 297, LH = 210, Lm = 10;
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Annotated AP Pelvis", Lm, Lm + 3);
    const img = imgRef.current;
    const availW = LW - 2 * Lm;
    const availH = LH - 2 * Lm - 8;
    let iw = availW;
    let ih = iw * (img.naturalHeight / img.naturalWidth);
    if (ih > availH) { ih = availH; iw = ih * (img.naturalWidth / img.naturalHeight); }
    doc.addImage(url, "JPEG", Lm + (availW - iw) / 2, Lm + 8, iw, ih, undefined, "FAST");
  }
  return { doc, filename: `PostTHA_Assessment_${today.replace(/\s/g, "_")}.pdf` };
}

export default function PostTHAAssessmentPanel({ isOpen, onClose, imageCanvasRef, mmPerPixel, cupAssessment, onSaveCupAssessment }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef(null);
  const canRef = useRef(null);
  const uploadRef = useRef(null);
  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const { points, setPoints, setPointsLive, reset: resetPoints } = usePointsHistory();
  const { points: cupPoints, setPoints: setCupPoints, setPointsLive: setCupPointsLive, reset: resetCupPoints } = usePointsHistory();
  const [operatedSide, setOperatedSide] = useState("right");
  const [displayUnit, setDisplayUnit] = useState("mm");
  const [displayOptions, setDisplayOptions] = useState({ points: true, lines: true, text: true, overlay: true });
  const [doctorNotes, setDoctorNotes] = useState("");
  const [exporting, setExporting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [manualActiveIndex, setManualActiveIndex] = useState(null);
  const [draftCupAssessment, setDraftCupAssessment] = useState(null);
  const [cupEllipseState, setCupEllipseState] = useState(null);

  // Dark mode observer — watches [data-theme] attribute on <html>
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.dataset.theme === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const activeDefs = step === "cup" ? [] : LANDMARKS;
  const activePoints = step === "cup" ? cupPoints : step === "result" ? { ...points, ...cupPoints } : points;

  // Auto-advance: reset manualActiveIndex after placing a point so activeIndex follows firstMissingIndex
  const setPointsAndAdvance = useCallback((fn) => {
    setPoints(fn);
    setManualActiveIndex(null);
  }, [setPoints]);
  const activeSetPoints = step === "cup" ? setCupPoints : step === "result" ? () => {} : setPointsAndAdvance;
  const activeSetPointsLive = step === "cup" ? setCupPointsLive : step === "result" ? () => {} : setPointsLive;
  const activeConnections = step === "cup" ? [] : CONNECTIONS;
  const firstMissingIndex = useMemo(() => activeDefs.findIndex((d) => !activePoints[d.key]), [activeDefs, activePoints]);
  const activeIndex = manualActiveIndex !== null && manualActiveIndex >= 0 && manualActiveIndex < activeDefs.length ? manualActiveIndex : firstMissingIndex;
  const effectiveCupAssessment = draftCupAssessment || cupAssessment;
  const results = useMemo(() => buildResults(points, cupPoints, mmPerPixel, operatedSide, effectiveCupAssessment), [points, cupPoints, mmPerPixel, operatedSide, effectiveCupAssessment]);
  const overallFlag = Object.values(results.flags).some((f) => f === "high" || f === "low") ? "high" : Object.values(results.flags).some((f) => f === "watch") ? "watch" : "normal";

  const drawOverlay = useCallback((ctx, t, options) => {
    if (options.overlay === false) return;
    drawReferenceOverlays(ctx, t, points, cupPoints, results, options);
  }, [cupPoints, points, results]);

  const handleCupDraftChange = useCallback((data) => {
    setDraftCupAssessment((prev) => {
      if (
        prev &&
        Math.abs(prev.inclination - data.inclination) < 0.05 &&
        Math.abs(prev.anteversion - data.anteversion) < 0.05 &&
        prev.side === data.side &&
        prev.zone === data.zone
      ) return prev;
      return data;
    });
  }, []);

  const saveDraftCupAssessment = useCallback(() => {
    if (!draftCupAssessment) return;
    const next = {
      ...draftCupAssessment,
      savedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };
    onSaveCupAssessment?.(next);
    setOperatedSide(next.side || operatedSide);
  }, [draftCupAssessment, onSaveCupAssessment, operatedSide]);

  useEffect(() => {
    if (!imageSrc) { imgRef.current = null; return; }
    const img = new Image();
    img.onload = () => { imgRef.current = img; };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setImageSrc(null);
      resetPoints();
      resetCupPoints();
      setDoctorNotes("");
      setPdfPreview(null);
      setManualActiveIndex(null);
      setDraftCupAssessment(null);
      setCupEllipseState(null);
      return;
    }
    if (imageCanvasRef?.current && !imageSrc) {
      try { setImageSrc(imageCanvasRef.current.toDataURL("image/png")); } catch {}
    }
  }, [isOpen, imageCanvasRef, imageSrc, resetCupPoints, resetPoints]);

  useEffect(() => {
    setManualActiveIndex(null);
  }, [step]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageSrc(URL.createObjectURL(file));
    resetPoints();
    resetCupPoints();
    e.target.value = "";
  };

  const handleExport = async () => {
    if (!imgRef.current) return;
    setExporting(true);
    try {
      const { doc, filename } = await exportToPDF({ imgRef, points, cupPoints, results, mmPerPixel, operatedSide, doctorNotes, displayUnit, displayOptions, cupAssessment: effectiveCupAssessment, cupEllipseState });
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, doc, filename });
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <>
      {pdfPreview && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/85 p-4" onClick={() => setPdfPreview(null)}>
          <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-xs font-black text-slate-700">Preview PDF</div>
                <div className="text-[10px] text-slate-400">{pdfPreview.filename}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => pdfPreview.doc.save(pdfPreview.filename)} className="rounded-full bg-rose-600 px-4 py-2 text-[11px] font-black text-white">Download</button>
                <button onClick={() => setPdfPreview(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <iframe src={pdfPreview.url} title="PostTHA PDF Preview" className="min-h-0 flex-1" />
          </div>
        </div>
      )}

      <AnimatePresence>
        <motion.div className="fixed inset-0 z-[260] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-md sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div className="flex h-[96vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-t-[24px] bg-slate-50 shadow-2xl sm:rounded-[24px]" initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.96 }}>
            <div className="shrink-0 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-rose-600">PostTHA Radiographic Assessment</div>
                  <h2 className="truncate text-lg font-black text-slate-800">Analisis Pasca Operasi THA</h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {step === "result" && (
                    <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-2 text-[11px] font-black text-white disabled:opacity-60">
                      {exporting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Download className="h-3.5 w-3.5" />}
                      PDF
                    </button>
                  )}
                  <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-0">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s}>
                    <motion.button
                      onClick={() => setStepIndex(i)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black transition-colors"
                      style={{
                        background: i === stepIndex ? "#1d4ed8" : i < stepIndex ? (isDark ? "rgba(59,130,246,0.18)" : "#dbeafe") : (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
                        color: i === stepIndex ? "#fff" : i < stepIndex ? (isDark ? "#93c5fd" : "#1e40af") : (isDark ? "#94a3b8" : "#64748b"),
                      }}
                    >
                      {i < stepIndex ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : i === 2 ? (
                        <Camera className="h-3 w-3" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px]" style={{ background: i === stepIndex ? "rgba(255,255,255,0.25)" : "transparent" }}>{i + 1}</span>
                      )}
                      {STEP_LABELS[i]}
                    </motion.button>
                    {i < STEPS.length - 1 && (
                      <div className="relative mx-0.5 h-px flex-1 bg-slate-200">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-blue-500"
                          initial={false}
                          animate={{ width: stepIndex > i ? "100%" : "0%" }}
                          transition={{ duration: 0.35, ease: "easeInOut" }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden lg:flex">
              <div className="relative min-h-[340px] flex-1 overflow-hidden bg-slate-900">
                <LandmarkCanvas
                  imageSrc={imageSrc}
                  points={activePoints}
                  landmarkDefs={activeDefs}
                  connections={activeConnections}
                  activeIndex={step === "result" ? -1 : activeIndex}
                  setPoints={activeSetPoints}
                  setPointsLive={activeSetPointsLive}
                  displayOptions={displayOptions}
                  transform={transform}
                  setTransform={setTransform}
                  canvasRef={canRef}
                  drawOverlay={drawOverlay}
                />
                <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5">
                  <button onClick={() => uploadRef.current?.click()} className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur"><Camera className="h-3 w-3" />{imageSrc ? "Ganti" : "Upload"}</button>
                  <button onClick={step === "cup" ? resetCupPoints : resetPoints} className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur"><RotateCcw className="h-3 w-3" />Reset Titik</button>
                  <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </div>
                <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
                  <button onClick={() => setTransform((t) => ({ ...t, scale: Math.min(30, t.scale * 1.25) }))} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"><ZoomIn className="h-4 w-4" /></button>
                  <button onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.08, t.scale / 1.25) }))} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"><ZoomOut className="h-4 w-4" /></button>
                  <button onClick={() => { if (imgRef.current && canRef.current) setTransform(fitTransform(imgRef.current, canRef.current)); }} className="rounded-full bg-black/60 px-2 py-1 text-[9px] font-black text-white">Fit</button>
                </div>
                {step === "cup" && (
                  <LightCupAssessment
                    savedData={effectiveCupAssessment}
                    side={operatedSide}
                    onChange={handleCupDraftChange}
                    transform={transform}
                    onEllipseChange={setCupEllipseState}
                  />
                )}
              </div>

              <div className="flex w-full shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white lg:w-[420px]">
                <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{STEP_LABELS[stepIndex]}</div>

                  {/* Side toggle — blue */}
                  <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {[{ key: "right", label: "Operasi Kanan" }, { key: "left", label: "Operasi Kiri" }].map((s, idx) => (
                      <motion.button
                        key={s.key}
                        onClick={() => setOperatedSide(s.key)}
                        whileTap={{ scale: 0.96 }}
                        className="flex-1 px-3 py-2 text-[10px] font-black transition-colors"
                        style={{
                          background: operatedSide === s.key ? "#2563eb" : "transparent",
                          color: operatedSide === s.key ? "#fff" : (isDark ? "#94a3b8" : "#64748b"),
                          borderRight: idx === 0 ? `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "#e2e8f0"}` : "none",
                        }}
                      >
                        {s.label}
                      </motion.button>
                    ))}
                  </div>

                  {/* Unit dropdown */}
                  <div className="relative mt-2">
                    <select
                      value={displayUnit}
                      onChange={(e) => setDisplayUnit(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="mm">Milimeter (MM)</option>
                      <option value="cm">Sentimeter (CM)</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>

                  {/* Display toggle — icons */}
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[
                      { key: "points", Icon: CircleDot, title: "Titik landmark" },
                      { key: "lines", Icon: Spline, title: "Garis penghubung" },
                      { key: "text", Icon: Type, title: "Label teks" },
                      { key: "overlay", Icon: Crosshair, title: "AP Reference lines" },
                    ].map(({ key, Icon, title }) => (
                      <motion.button
                        key={key}
                        title={title}
                        onClick={() => setDisplayOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center justify-center rounded-xl border py-2.5 transition-colors"
                        style={{
                          background: displayOptions[key] ? (isDark ? "rgba(59,130,246,0.18)" : "#eff6ff") : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"),
                          borderColor: displayOptions[key] ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.09)" : "#e2e8f0"),
                          color: displayOptions[key] ? (isDark ? "#60a5fa" : "#2563eb") : (isDark ? "#64748b" : "#94a3b8"),
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </motion.button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                {step === "cup" ? (
                  <motion.div
                    key="cup"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="min-h-0 flex-1 overflow-y-auto"
                  >
                    <CupAssessmentSummary
                      cupAssessment={cupAssessment}
                      draftCupAssessment={draftCupAssessment}
                      onSaveDraft={saveDraftCupAssessment}
                    />
                    <div className="px-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-500">
                        Cup Assessment ini versi ringan khusus PostTHA. Hasil live di atas dipakai oleh export PDF; tekan Simpan jika ingin menyimpan ke data workspace.
                      </div>
                    </div>
                  </motion.div>
                ) : step !== "result" ? (
                  <motion.div
                    key="landmarks"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="min-h-0 flex-1 overflow-y-auto"
                  >
                    {/* Active card */}
                    <div className="px-4 py-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Titik Aktif</div>
                      <AnimatePresence mode="wait">
                        {activeIndex >= 0 ? (
                          <motion.div
                            key={activeDefs[activeIndex]?.key}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                            className="mt-2 overflow-hidden rounded-xl border"
                            style={{ borderColor: activeDefs[activeIndex].color + "60", background: activeDefs[activeIndex].color + "0d" }}
                          >
                            <div className="flex items-start gap-0">
                              <div className="w-1 shrink-0 self-stretch rounded-l-xl" style={{ background: activeDefs[activeIndex].color }} />
                              <div className="flex-1 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-[13px] font-black" style={{ color: activeDefs[activeIndex].color }}>
                                    <span>{activeDefs[activeIndex].short} - {activeDefs[activeIndex].label}</span>
                                    <ExampleHover item={activeDefs[activeIndex]} />
                                  </div>
                                  <span className="text-[9px] font-black text-slate-400">(→)</span>
                                </div>
                                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                                  {activeDefs[activeIndex].hint} Jika Klik sudah ada, drag titiknya atau klik posisi baru untuk memindahkan.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="done"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-black text-emerald-700"
                          >
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Semua titik lengkap. Pilih item di bawah untuk edit ulang.
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Landmark list with stagger */}
                    <motion.div
                      className="divide-y divide-slate-100"
                      initial="hidden"
                      animate="visible"
                      variants={{ visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } } }}
                    >
                      {activeDefs.map((def, i) => (
                        <motion.button
                          key={def.key}
                          variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                          onClick={() => setManualActiveIndex(i)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                          style={{ background: i === activeIndex ? def.color + "10" : "transparent" }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-black transition-colors"
                            style={{ borderColor: def.color, background: activePoints[def.key] ? def.color : "transparent", color: activePoints[def.key] ? "#fff" : def.color }}
                          >
                            {activePoints[def.key] ? "✓" : i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-700">
                              <span className="min-w-0 truncate">{def.short} - {def.label}</span>
                              <ExampleHover item={def} />
                            </span>
                            {i === activeIndex && (
                              <span className="mt-0.5 block text-[9px] leading-snug text-slate-400">Aktif untuk edit. Drag point atau klik lokasi baru.</span>
                            )}
                          </span>
                          {activePoints[def.key] && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
                  >
                    <div className="mb-3 flex items-center gap-2 rounded-xl border p-3" style={{ background: (isDark ? FLAG_DARK : FLAG)[overallFlag].bg, borderColor: (isDark ? FLAG_DARK : FLAG)[overallFlag].border }}>
                      {overallFlag === "normal" ? <CheckCircle2 className="h-5 w-5" style={{ color: (isDark ? FLAG_DARK : FLAG).normal.dot }} /> : <AlertCircle className="h-5 w-5" style={{ color: (isDark ? FLAG_DARK : FLAG).watch.dot }} />}
                      <div className="text-sm font-black" style={{ color: (isDark ? FLAG_DARK : FLAG)[overallFlag].text }}>{overallFlag === "normal" ? "Parameter dalam batas referensi" : "Ada parameter yang perlu ditinjau"}</div>
                    </div>
                    <div className="grid gap-2">
                      <ResultCard isDark={isDark} label="COR Horizontal" value={fmtValue(results.corDx, mmPerPixel, "length", 1, displayUnit)} range="Target <=5 mm" flag={results.flags.corX} note="Rekonstruksi COR dibanding sisi kontralateral." />
                      <ResultCard isDark={isDark} label="COR Vertical" value={fmtValue(results.corDy, mmPerPixel, "length", 1, displayUnit)} range="Target <=3 mm superior" flag={results.flags.corY} note="Superior shift berlebih berisiko loosening/abductor insufficiency." />
                      <ResultCard isDark={isDark} label="LLD" value={fmtValue(results.lld, mmPerPixel, "length", 1, displayUnit)} range=">6 mm dapat terasa, >10 mm bermasalah" flag={results.flags.lld} />
                      <ResultCard isDark={isDark} label="Delta Femoral Offset" value={fmtValue(results.fOffDelta, mmPerPixel, "length", 1, displayUnit)} range="Target <=5 mm" flag={results.flags.fOff} />
                      <ResultCard isDark={isDark} label="Delta Global Offset" value={fmtValue(results.gOffDelta, mmPerPixel, "length", 1, displayUnit)} range="Bandingkan sisi normal" flag={results.flags.gOff} />
                      <ResultCard isDark={isDark} label="Cup Inclination" value={fmtValue(results.inclination, mmPerPixel, "deg")} range="Target sekitar 45°" flag={results.flags.inc} />
                      <ResultCard isDark={isDark} label="Cup Anteversion" value={fmtValue(results.anteversion, mmPerPixel, "deg")} range="Lewinnek 5-25°" flag={results.flags.av} />
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 p-3">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Catatan Dokter</div>
                      <textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-slate-200 p-2 text-[11px] outline-none focus:ring-2 focus:ring-rose-300" placeholder="Catatan klinis tambahan..." />
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[9px] leading-relaxed text-slate-500">
                      Referensi: Budzinska et al. 2023, Japanese Journal of Radiology. Radiograf bersifat alat bantu; keputusan klinis tetap memerlukan evaluasi dokter ortopedi.
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-5 py-3">
              <button onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0} className="flex items-center gap-1.5 rounded-full bg-slate-200 px-4 py-2 text-[11px] font-black text-slate-700 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" />Kembali</button>
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-[10px] font-black text-slate-400">{mmPerPixel ? `Terkalibrasi - ${displayUnit.toUpperCase()}` : "Belum kalibrasi - hasil panjang perlu kalibrasi"}</span>
              </div>
              {stepIndex < STEPS.length - 1 ? (
                <button onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))} className="flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-[11px] font-black text-white">{stepIndex === STEPS.length - 2 ? "Lihat Hasil" : "Lanjut"}<ChevronRight className="h-3.5 w-3.5" /></button>
              ) : (
                <button onClick={onClose} className="flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-[11px] font-black text-white">Selesai<Check className="h-3.5 w-3.5" /></button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );

  return createPortal(content, document.body);
}
