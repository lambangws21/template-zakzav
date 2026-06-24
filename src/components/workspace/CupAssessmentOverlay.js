"use client";
import { useCallback, useMemo, useRef, useState } from "react";

// ─── Cup Assessment Inline Component ─────────────────────────────────────────

const LEWINNEK_ZONE = { abdMin: 30, abdMax: 50, antMin: 5, antMax: 25 };
const CALLANAN_ZONE = { abdMin: 30, abdMax: 45, antMin: 10, antMax: 25 };

export function cupZoneStatus(abd, ant) {
  const inC = abd >= CALLANAN_ZONE.abdMin && abd <= CALLANAN_ZONE.abdMax && ant >= CALLANAN_ZONE.antMin && ant <= CALLANAN_ZONE.antMax;
  const inL = abd >= LEWINNEK_ZONE.abdMin && abd <= LEWINNEK_ZONE.abdMax && ant >= LEWINNEK_ZONE.antMin && ant <= LEWINNEK_ZONE.antMax;
  if (inC) return { label: "✓ Safe Zone Optimal", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  if (inL) return { label: "~ Safe Zone Lewinnek", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  return { label: "⚠ Di Luar Safe Zone", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
}

// Dial kecil untuk atur rotasi cup langsung — drag memutar, scroll untuk nudge halus
export function CupAngleDial({ angleDeg, onChange, size = 26 }) {
  const knobRef = useRef(null);
  const draggingRef = useRef(false);

  const updateFromPointer = (e) => {
    const rect = knobRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    deg = ((deg % 360) + 360) % 360;
    onChange(deg);
  };

  const handlePointerDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  };
  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    updateFromPointer(e);
  };
  const handlePointerUp = (e) => {
    draggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    onChange(((angleDeg + delta) % 360 + 360) % 360);
  };

  const r = size / 2 - 3;
  return (
    <div
      ref={knobRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      title="Drag atau scroll untuk atur rotasi cup"
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #1e293b, #0f172a)",
        border: "1.5px solid rgba(56,189,248,0.45)",
        position: "relative", cursor: "grab", flexShrink: 0, touchAction: "none",
      }}
    >
      <div
        style={{
          position: "absolute", top: "50%", left: "50%",
          width: 2, height: r,
          background: "#38bdf8",
          transformOrigin: "50% 100%",
          transform: `translate(-50%,-100%) rotate(${angleDeg}deg)`,
        }}
      />
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 4, height: 4, borderRadius: "50%", background: "#7dd3fc", transform: "translate(-50%,-50%)" }} />
    </div>
  );
}

// Label with bg pill rendered in SVG
export function SvgLabel(React, x, y, text, color, anchor = "middle") {
  const pad = 5, h = 18, w = text.length * 6.5 + pad * 2;
  const bx = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w - 4 : x + 4;
  return React.createElement(React.Fragment, { key: text },
    React.createElement("rect", { x: bx, y: y - h + 4, width: w, height: h, rx: 5, fill: "rgba(0,0,0,0.62)" }),
    React.createElement("text", { x: anchor === "middle" ? x : anchor === "end" ? x - 8 : x + 8, y: y, textAnchor: anchor, fill: color, fontSize: 11, fontWeight: "bold", fontFamily: "monospace" }, text),
  );
}

export default function CupAssessmentOverlayInline({ onClose, onSave, savedData }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [handleSize, setHandleSize] = useState("small"); // "small" | "normal"
  const [minimized, setMinimized] = useState(false);
  const [side, setSide] = useState("right"); // "left" | "right" hip
  const [justSaved, setJustSaved] = useState(false);

  const W = typeof window !== "undefined" ? window.innerWidth : 800;
  const H = typeof window !== "undefined" ? window.innerHeight : 600;

  const [cx, setCx] = useState(W * 0.35);
  const [cy, setCy] = useState(H * 0.45);
  const initA = Math.min(W, H) * 0.16;
  const [a, setA] = useState(initA);
  // b = a × sin(15°) → anteversion default ~15°
  const [b, setB] = useState(initA * 0.259);
  const [angle, setAngle] = useState((40 * Math.PI) / 180);

  const cos = Math.cos(angle), sin = Math.sin(angle);
  const handles = {
    top:    { x: cx - a * cos, y: cy - a * sin },
    bottom: { x: cx + a * cos, y: cy + a * sin },
    left:   { x: cx + b * sin, y: cy - b * cos },
    right:  { x: cx - b * sin, y: cy + b * cos },
    center: { x: cx, y: cy },
  };

  const svgPt = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: e.clientX, y: e.clientY };
    const r = svg.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }, [W, H]);

  const onPD = useCallback((id) => (e) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    setDragging(id);
  }, []);

  const onPM = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const p = svgPt(e);
    if (dragging === "center") { setCx(p.x); setCy(p.y); return; }
    if (dragging === "top" || dragging === "bottom") {
      const dx = p.x - cx, dy = p.y - cy;
      const newA = Math.max(12, Math.sqrt(dx * dx + dy * dy));
      setA(newA);
      // jika a mengecil sampai di bawah b, ikut kecilkan b agar rasio tetap valid
      setB(prev => Math.min(prev, newA * 0.9));
      setAngle(dragging === "top" ? Math.atan2(dy, dx) + Math.PI : Math.atan2(dy, dx));
      return;
    }
    if (dragging === "left" || dragging === "right") {
      const dx = p.x - cx, dy = p.y - cy;
      const proj = Math.abs(dx * sin - dy * cos);
      // cap b di 90% dari a supaya anteversion max ~64°, tidak mentok 89°
      setB(Math.max(4, Math.min(a * 0.9, proj)));
    }
  }, [dragging, cx, cy, a, cos, sin, svgPt]);

  const onPU = useCallback(() => setDragging(null), []);

  // Ellipse path
  const ePath = useMemo(() => {
    const pts = Array.from({ length: 64 }, (_, i) => {
      const t = (i / 64) * 2 * Math.PI;
      const ex = a * Math.cos(t), ey = b * Math.sin(t);
      return { x: cx + ex * cos - ey * sin, y: cy + ex * sin + ey * cos };
    });
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  }, [cx, cy, a, b, cos, sin]);

  const ePathInner = useMemo(() => {
    const pts = Array.from({ length: 64 }, (_, i) => {
      const t = (i / 64) * 2 * Math.PI;
      const ex = a * 0.82 * Math.cos(t), ey = b * 0.82 * Math.sin(t);
      return { x: cx + ex * cos - ey * sin, y: cy + ex * sin + ey * cos };
    });
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  }, [cx, cy, a, b, cos, sin]);


  // Inclination: angle of major axis vs horizontal, normalised 0–90°
  const rawDeg = ((angle * 180) / Math.PI % 180 + 180) % 180;
  const inclination = rawDeg > 90 ? 180 - rawDeg : rawDeg;
  // Anteversion: radiographic arcsin(b/a), capped < 90° for display
  const ratio = a > 0 ? Math.min(0.9999, Math.abs(b / a)) : 0;
  const anteversion = (Math.asin(ratio) * 180) / Math.PI;
  const zone = cupZoneStatus(inclination, anteversion);

  // Handle radius based on size toggle
  const HR  = handleSize === "small" ? 5  : 9;   // handle radius
  const HBG = handleSize === "small" ? 9  : 14;  // halo radius
  const CS  = handleSize === "small" ? 6  : 10;  // center circle radius
  const CL  = handleSize === "small" ? 4  : 6;   // center crosshair half-length

  // Label positions — outside ellipse, offset from handles
  const incLabelX = handles.bottom.x + 16 * cos + 8;
  const incLabelY = handles.bottom.y + 16 * sin + 8;
  const avLabelX  = handles.right.x - 16 * sin - 8;
  const avLabelY  = handles.right.y + 16 * cos + 8;

  // ── Minimized chip — shows only INC/AV values, SVG non-interactive ──
  if (minimized) {
    return React.createElement("div", { style: { position: "absolute", inset: 0, zIndex: 80, pointerEvents: "none" } },
      // Dim ellipse still visible but non-interactive
      React.createElement("svg", {
        ref: svgRef, width: W, height: H, viewBox: `0 0 ${W} ${H}`,
        style: { position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.35 },
      },
        React.createElement("line", { x1: 0, y1: cy, x2: W, y2: cy, stroke: "#facc15", strokeWidth: 1, strokeDasharray: "10 5" }),
        React.createElement("path", { d: ePath, fill: "none", stroke: "#f97316", strokeWidth: 2 }),
        React.createElement("path", { d: ePathInner, fill: "none", stroke: "#22d3ee", strokeWidth: 1.5, strokeDasharray: "4 2" }),
      ),
      // Floating chip (bottom-left, above toolbar)
      React.createElement("div", {
        style: {
          position: "fixed", bottom: 96, left: 16, zIndex: 85,
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", borderRadius: 24,
          background: "rgba(15,23,42,0.88)", backdropFilter: "blur(10px)",
          border: `1.5px solid ${zone.border}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.28)",
          pointerEvents: "auto", cursor: "default",
          fontFamily: "system-ui,sans-serif",
        }
      },
        // Ellipse icon
        React.createElement("svg", { viewBox: "0 0 24 24", style: { width: 14, height: 14, flexShrink: 0 }, fill: "none", stroke: "#f97316", strokeWidth: 2 },
          React.createElement("ellipse", { cx: 12, cy: 12, rx: 9, ry: 5, strokeDasharray: "3 1.5" }),
        ),
        React.createElement("span", { style: { fontSize: 9, fontWeight: 900, padding: "1px 6px", borderRadius: 6, background: side === "left" ? "rgba(14,165,233,0.2)" : "rgba(249,115,22,0.2)", color: side === "left" ? "#38bdf8" : "#fb923c" } }, side === "left" ? "KIRI" : "KANAN"),
        // Values
        React.createElement("span", { style: { fontSize: 11, fontWeight: 900, color: inclination >= 30 && inclination <= 50 ? "#4ade80" : "#f87171", letterSpacing: "0.02em" } },
          `INC ${inclination.toFixed(1)}°`),
        React.createElement("span", { style: { width: 1, height: 12, background: "rgba(255,255,255,0.2)", flexShrink: 0 } }),
        React.createElement("span", { style: { fontSize: 11, fontWeight: 900, color: anteversion >= 5 && anteversion <= 25 ? "#22d3ee" : "#f87171", letterSpacing: "0.02em" } },
          `AV ${anteversion.toFixed(1)}°`),
        // Restore button
        React.createElement("button", {
          onClick: () => setMinimized(false),
          style: { marginLeft: 4, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: "2px 7px", fontSize: 9, fontWeight: 900, color: "white", cursor: "pointer", letterSpacing: "0.05em" }
        }, "BUKA"),
        // Close button
        React.createElement("button", {
          onClick: onClose,
          style: { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, fontWeight: 900, padding: "0 2px", lineHeight: 1 }
        }, "✕"),
      ),
    );
  }

  return React.createElement("div", {
    style: { position: "absolute", inset: 0, zIndex: 80, pointerEvents: "none" }
  },
    // ── SVG canvas ──
    React.createElement("svg", {
      ref: svgRef, width: W, height: H, viewBox: `0 0 ${W} ${H}`,
      style: { position: "absolute", inset: 0, pointerEvents: "auto", touchAction: "none", cursor: dragging ? "grabbing" : "default" },
      onPointerMove: onPM, onPointerUp: onPU, onPointerLeave: onPU,
    },
      // Horizontal reference line
      React.createElement("line", { x1: 0, y1: cy, x2: W, y2: cy, stroke: "#facc15", strokeWidth: 1.5, strokeDasharray: "10 5", opacity: 0.55 }),

      // Major axis extended line
      React.createElement("line", { x1: handles.top.x - cos * 20, y1: handles.top.y - sin * 20, x2: handles.bottom.x + cos * 20, y2: handles.bottom.y + sin * 20, stroke: "#a3e635", strokeWidth: 1.5, strokeDasharray: "6 3", opacity: 0.7 }),
      // Minor axis line
      React.createElement("line", { x1: handles.left.x, y1: handles.left.y, x2: handles.right.x, y2: handles.right.y, stroke: "#22d3ee", strokeWidth: 1.5, opacity: 0.8 }),

      // Outer cup ellipse (orange)
      React.createElement("path", { d: ePath, fill: "rgba(249,115,22,0.08)", stroke: "#f97316", strokeWidth: 2.5 }),
      // Inner liner ellipse (cyan dashed)
      React.createElement("path", { d: ePathInner, fill: "none", stroke: "#22d3ee", strokeWidth: 1.8, strokeDasharray: "4 2" }),

      // Inclination angle arc
      React.createElement("path", {
        d: `M ${cx + 44} ${cy} A 44 44 0 0 ${angle < 0 ? 1 : 0} ${cx + 44 * Math.cos(angle)} ${cy + 44 * Math.sin(angle)}`,
        fill: "none", stroke: "#a3e635", strokeWidth: 1.8, strokeDasharray: "3 2"
      }),

      // ── Outside labels ──
      SvgLabel(React, incLabelX, incLabelY, `INC ${inclination.toFixed(1)}°`, inclination >= 30 && inclination <= 50 ? "#4ade80" : "#f87171"),
      SvgLabel(React, avLabelX, avLabelY, `AV ${anteversion.toFixed(1)}°`, anteversion >= 5 && anteversion <= 25 ? "#22d3ee" : "#f87171"),
      SvgLabel(React, 60, cy - 8, "HORIZONTAL", "#fde047", "middle"),

      // ── Drag handles ──
      // Center
      React.createElement("circle", { cx, cy, r: CS, fill: "rgba(109,40,217,0.25)", stroke: "#6d28d9", strokeWidth: 2, style: { cursor: "move", pointerEvents: "all" }, onPointerDown: onPD("center") }),
      React.createElement("line", { x1: cx - CL, y1: cy, x2: cx + CL, y2: cy, stroke: "#6d28d9", strokeWidth: 1.5, style: { pointerEvents: "none" } }),
      React.createElement("line", { x1: cx, y1: cy - CL, x2: cx, y2: cy + CL, stroke: "#6d28d9", strokeWidth: 1.5, style: { pointerEvents: "none" } }),

      // Top/Bottom — inclination (yellow)
      ...[
        { id: "top",    hx: handles.top.x,   hy: handles.top.y   },
        { id: "bottom", hx: handles.bottom.x, hy: handles.bottom.y },
      ].flatMap(({ id, hx, hy }) => [
        React.createElement("circle", { key: id + "_bg", cx: hx, cy: hy, r: HBG, fill: "rgba(250,204,21,0.15)", style: { pointerEvents: "none" } }),
        React.createElement("circle", { key: id, cx: hx, cy: hy, r: HR, fill: "#facc15", stroke: "white", strokeWidth: 2, style: { cursor: "crosshair", pointerEvents: "all", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }, onPointerDown: onPD(id) }),
      ]),

      // Left/Right — anteversion (purple)
      ...[
        { id: "left",  hx: handles.left.x,  hy: handles.left.y  },
        { id: "right", hx: handles.right.x, hy: handles.right.y },
      ].flatMap(({ id, hx, hy }) => [
        React.createElement("circle", { key: id + "_bg", cx: hx, cy: hy, r: HBG, fill: "rgba(109,40,217,0.15)", style: { pointerEvents: "none" } }),
        React.createElement("circle", { key: id, cx: hx, cy: hy, r: HR, fill: "#7c3aed", stroke: "white", strokeWidth: 2, style: { cursor: "ew-resize", pointerEvents: "all", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }, onPointerDown: onPD(id) }),
      ]),
    ),

    // ── Result card (top-right) ──
    React.createElement("div", {
      style: {
        position: "absolute", top: 60, right: 12, width: 220, borderRadius: 18,
        border: `2px solid ${zone.border}`, backgroundColor: zone.bg,
        boxShadow: "0 12px 32px rgba(0,0,0,0.28)", overflow: "hidden", pointerEvents: "auto",
        fontFamily: "system-ui, sans-serif",
      }
    },
      // Header
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.9)" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
          React.createElement("span", { style: { fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#334155" } }, "⊙ Cup Assessment"),
          React.createElement("span", { style: { fontSize: 9, fontWeight: 800, padding: "1px 7px", borderRadius: 8, background: side === "left" ? "#e0f2fe" : "#fff7ed", color: side === "left" ? "#0284c7" : "#ea580c" } }, side === "left" ? "KIRI" : "KANAN"),
        ),
        React.createElement("div", { style: { display: "flex", gap: 4, alignItems: "center" } },
          // Minimize button
          React.createElement("button", {
            onClick: () => setMinimized(true),
            title: "Minimize — tetap bisa gambar line",
            style: { background: "rgba(241,245,249,1)", border: "1px solid #e2e8f0", borderRadius: 7, cursor: "pointer", color: "#64748b", fontSize: 13, fontWeight: 900, lineHeight: 1, padding: "2px 7px" }
          }, "—"),
          React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, fontWeight: 900, lineHeight: 1, padding: "0 2px" } }, "✕"),
        ),
      ),
      React.createElement("div", { style: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 } },
        // Zone badge + Save button row
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
          React.createElement("div", { style: { flex: 1, padding: "6px 10px", borderRadius: 10, background: zone.bg, border: `1.5px solid ${zone.border}` } },
            React.createElement("span", { style: { fontSize: 11, fontWeight: 900, color: zone.color } }, zone.label),
          ),
          // Save button
          React.createElement("button", {
            onClick: () => {
              if (onSave) {
                onSave({ inclination, anteversion, side, zone: zone.label });
                setJustSaved(true);
                setTimeout(() => setJustSaved(false), 2000);
              }
            },
            title: "Simpan ke laporan pra-operasi",
            style: {
              flexShrink: 0,
              background: justSaved ? "#dcfce7" : "linear-gradient(135deg,#22c55e,#16a34a)",
              border: justSaved ? "1.5px solid #86efac" : "1.5px solid #15803d",
              borderRadius: 8, cursor: "pointer",
              color: justSaved ? "#15803d" : "#fff",
              fontSize: 10, fontWeight: 800, lineHeight: 1,
              padding: "5px 10px",
              transition: "all 0.3s",
              whiteSpace: "nowrap",
            }
          }, justSaved ? "✓ Tersimpan" : "💾 Simpan"),
        ),
        // Saved indicator
        savedData && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" } },
          React.createElement("span", { style: { fontSize: 10, color: "#16a34a", fontWeight: 700 } }, "✓ Data tersimpan"),
          React.createElement("span", { style: { fontSize: 9, color: "#15803d", marginLeft: "auto" } }, savedData.savedAt),
        ),
        // Side toggle — kiri / kanan
        React.createElement("div", { style: { display: "flex", borderRadius: 12, overflow: "hidden", border: "1.5px solid #e2e8f0", background: "white" } },
          ...[
            { v: "left",  label: "◁ Kiri",  color: "#0ea5e9" },
            { v: "right", label: "Kanan ▷", color: "#f97316" },
          ].map(({ v, label, color }) =>
            React.createElement("button", {
              key: v,
              onClick: () => setSide(v),
              style: {
                flex: 1, padding: "6px 0", border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 900, letterSpacing: "0.04em",
                transition: "all 0.15s",
                background: side === v ? color : "transparent",
                color: side === v ? "white" : "#94a3b8",
                borderRight: v === "left" ? "1.5px solid #e2e8f0" : "none",
              }
            }, label)
          ),
        ),

        // Handle size toggle
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: 10, background: "rgba(255,255,255,0.7)", border: "1px solid #e2e8f0" } },
          React.createElement("span", { style: { fontSize: 9, fontWeight: 700, color: "#475569" } }, "Ukuran titik"),
          React.createElement("div", { style: { display: "flex", gap: 4 } },
            React.createElement("button", {
              onClick: () => setHandleSize("small"),
              style: { padding: "3px 8px", borderRadius: 8, border: "1.5px solid", fontSize: 9, fontWeight: 800, cursor: "pointer",
                borderColor: handleSize === "small" ? "#f97316" : "#cbd5e1",
                background: handleSize === "small" ? "#fff7ed" : "white",
                color: handleSize === "small" ? "#ea580c" : "#94a3b8" }
            }, "Kecil"),
            React.createElement("button", {
              onClick: () => setHandleSize("normal"),
              style: { padding: "3px 8px", borderRadius: 8, border: "1.5px solid", fontSize: 9, fontWeight: 800, cursor: "pointer",
                borderColor: handleSize === "normal" ? "#f97316" : "#cbd5e1",
                background: handleSize === "normal" ? "#fff7ed" : "white",
                color: handleSize === "normal" ? "#ea580c" : "#94a3b8" }
            }, "Normal"),
          ),
        ),
        // Big value display
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
          // Inclination
          React.createElement("div", { style: { background: "rgba(255,255,255,0.8)", borderRadius: 12, padding: "8px 10px", border: "1.5px solid #a3e635" } },
            React.createElement("div", { style: { fontSize: 8, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 } }, "Inclination"),
            React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: inclination >= 30 && inclination <= 50 ? "#16a34a" : "#dc2626", lineHeight: 1 } }, `${inclination.toFixed(1)}°`),
            React.createElement("div", { style: { fontSize: 8, color: "#94a3b8", marginTop: 2 } }, "Target 30–50°"),
          ),
          // Anteversion
          React.createElement("div", { style: { background: "rgba(255,255,255,0.8)", borderRadius: 12, padding: "8px 10px", border: "1.5px solid #22d3ee" } },
            React.createElement("div", { style: { fontSize: 8, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 } }, "Anteversion"),
            React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: anteversion >= 5 && anteversion <= 25 ? "#16a34a" : "#dc2626", lineHeight: 1 } }, `${anteversion.toFixed(1)}°`),
            React.createElement("div", { style: { fontSize: 8, color: "#94a3b8", marginTop: 2 } }, "Target 5–25°"),
          ),
        ),
        // Legend
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, paddingTop: 6, borderTop: "1px solid rgba(0,0,0,0.07)" } },
          [
            ["#f97316", "Outer cup shell — drag ellipse"],
            ["#22d3ee", "Liner inner surface"],
            ["#a3e635", "Major axis (inclination)"],
            ["#facc15", "Horizontal reference"],
          ].map(([c, l]) =>
            React.createElement("div", { key: l, style: { display: "flex", alignItems: "center", gap: 7 } },
              React.createElement("span", { style: { flexShrink: 0, width: 14, height: 3, borderRadius: 2, backgroundColor: c, display: "inline-block" } }),
              React.createElement("span", { style: { fontSize: 9, color: "#475569" } }, l),
            )
          ),
        ),
        // Handle legend
        React.createElement("div", { style: { display: "flex", gap: 10, paddingTop: 4, borderTop: "1px solid rgba(0,0,0,0.07)" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 5 } },
            React.createElement("span", { style: { width: 12, height: 12, borderRadius: "50%", backgroundColor: "#facc15", border: "2px solid white", display: "inline-block", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" } }),
            React.createElement("span", { style: { fontSize: 8, color: "#64748b" } }, "Atur Inclination"),
          ),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 5 } },
            React.createElement("span", { style: { width: 12, height: 12, borderRadius: "50%", backgroundColor: "#7c3aed", border: "2px solid white", display: "inline-block", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" } }),
            React.createElement("span", { style: { fontSize: 8, color: "#64748b" } }, "Atur Anteversion"),
          ),
        ),
      ),
    ),
  );
}

// ── Hip Planning Calculator ───────────────────────────────────────────────────
