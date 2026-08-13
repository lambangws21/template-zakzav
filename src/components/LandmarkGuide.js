"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";

// ── Shared SVG primitives ─────────────────────────────────────────────────────

function LmDot({ cx, cy, color, label, labelPos = "above", r = 5, fontSize = 6.5 }) {
  const off = r + 9;
  const lx = labelPos === "left" ? cx - off : labelPos === "right" ? cx + off : cx;
  const ly = labelPos === "above" ? cy - off : labelPos === "below" ? cy + off : cy;
  const anchor = labelPos === "left" ? "end" : labelPos === "right" ? "start" : "middle";

  return (
    <g>
      {/* Outer glow */}
      <circle cx={cx} cy={cy} r={r + 4} fill={color} opacity={0.18} />
      {/* Ring */}
      <circle cx={cx} cy={cy} r={r + 1.5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
      {/* Core */}
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="white" strokeWidth={1.5} />
      {/* Label */}
      <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle"
        fontSize={fontSize} fontWeight="700" fontFamily="sans-serif"
        fill={color} opacity={0.95}>
        {label}
      </text>
    </g>
  );
}

// Connector line from dot to label (optional)
function Connector({ x1, y1, x2, y2, color }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.8} opacity={0.4} strokeDasharray="2,2" />;
}

// Pulsing highlight ring for the active landmark
function HighlightRing({ cx, cy, color }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={16} fill="none" stroke={color} strokeWidth={3} opacity={0.9}>
        <animate attributeName="r" values="10;22;10" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.35}>
        <animate attributeName="r" values="4;11;4" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

// ── Highlight coordinate maps (landmark ID → SVG position + color) ─────────────

const APHIP_HL = {
  // kiri
  caput_femur_kiri:           { x: 94,  y: 179, c: "#ef4444" },
  acetabulum_kiri:            { x: 72,  y: 182, c: "#eab308" },
  greater_trochanter_kiri:    { x: 23,  y: 202, c: "#06b6d4" },
  lesser_trochanter_kiri:     { x: 74,  y: 280, c: "#ec4899" },
  head_center_kiri:           { x: 94,  y: 179, c: "#ef4444" },
  cup_rim_sup_lateral_kiri:   { x: 68,  y: 173, c: "#eab308" },
  cup_rim_sup_medial_kiri:    { x: 100, y: 173, c: "#84cc16" },
  stem_tip_kiri:              { x: 94,  y: 335, c: "#ec4899" },
  calcar_kiri:                { x: 102, y: 230, c: "#fb923c" },
  head_center_hemi_kiri:      { x: 94,  y: 179, c: "#ef4444" },
  acetabulum_sup_kiri:        { x: 72,  y: 182, c: "#eab308" },
  teardrop_kiri:              { x: 100, y: 200, c: "#06b6d4" },
  // kanan — same color per anatomical pair as kiri
  caput_femur_kanan:           { x: 314, y: 179, c: "#ef4444" },
  acetabulum_kanan:            { x: 339, y: 180, c: "#eab308" },
  greater_trochanter_kanan:    { x: 393, y: 201, c: "#06b6d4" },
  lesser_trochanter_kanan:     { x: 339, y: 281, c: "#ec4899" },
  head_center_kanan:           { x: 314, y: 179, c: "#ef4444" },
  cup_rim_sup_lateral_kanan:   { x: 342, y: 172, c: "#eab308" },
  cup_rim_sup_medial_kanan:    { x: 307, y: 172, c: "#84cc16" },
  stem_tip_kanan:              { x: 314, y: 335, c: "#ec4899" },
  calcar_kanan:                { x: 305, y: 230, c: "#fb923c" },
  head_center_hemi_kanan:      { x: 314, y: 179, c: "#ef4444" },
  acetabulum_sup_kanan:        { x: 339, y: 180, c: "#eab308" },
  teardrop_kanan:              { x: 307, y: 200, c: "#06b6d4" },
};

const APROX_HL = {
  caput_femur:         { x: 98,  y: 44,  c: "#ef4444" },
  acetabulum_sup:      { x: 38,  y: 50,  c: "#f97316" },
  greater_trochanter:  { x: 27,  y: 135, c: "#eab308" },
  lesser_trochanter:   { x: 108, y: 153, c: "#06b6d4" },
  femoral_neck_center: { x: 77,  y: 112, c: "#8b5cf6" },
  intertroch_medial:   { x: 106, y: 154, c: "#14b8a6" },
  intertroch_lateral:  { x: 28,  y: 138, c: "#ec4899" },
  // lateral hip uses same guide
  caput_femur_lateral:      { x: 98,  y: 44,  c: "#ef4444" },
  acetabulum_anterior:      { x: 38,  y: 50,  c: "#06b6d4" },
  acetabulum_posterior:     { x: 155, y: 52,  c: "#8b5cf6" },
};

const APKNEE_HL = {
  // AP Knee (cx=75 left, cx=205 right)
  kondilus_medial_femur_kiri:   { x: 61,  y: 93,  c: "#ef4444" },
  kondilus_lateral_femur_kiri:  { x: 89,  y: 91,  c: "#f97316" },
  tibial_plateau_medial_kiri:   { x: 41,  y: 120, c: "#eab308" },
  tibial_plateau_lateral_kiri:  { x: 109, y: 120, c: "#84cc16" },
  kondilus_medial_femur_kanan:  { x: 191, y: 93,  c: "#06b6d4" },
  kondilus_lateral_femur_kanan: { x: 219, y: 91,  c: "#8b5cf6" },
  tibial_plateau_medial_kanan:  { x: 171, y: 120, c: "#ec4899" },
  tibial_plateau_lateral_kanan: { x: 239, y: 120, c: "#14b8a6" },
  // AP Ankle (same guide)
  malleolus_medial:    { x: 41,  y: 93,  c: "#ef4444" },
  malleolus_lateral:   { x: 109, y: 93,  c: "#f97316" },
  talus_dome_medial:   { x: 41,  y: 120, c: "#06b6d4" },
  talus_dome_lateral:  { x: 109, y: 120, c: "#8b5cf6" },
  tibia_plafond:       { x: 75,  y: 115, c: "#10b981" },
  // Lateral Knee (same guide)
  kondilus_femur_posterior: { x: 61,  y: 91,  c: "#ef4444" },
  kondilus_femur_anterior:  { x: 89,  y: 91,  c: "#f97316" },
  tibial_plateau_anterior:  { x: 41,  y: 120, c: "#06b6d4" },
  tibial_plateau_posterior: { x: 109, y: 120, c: "#8b5cf6" },
  patella_proximal:         { x: 75,  y: 55,  c: "#10b981" },
  patella_distal:           { x: 75,  y: 95,  c: "#ec4899" },
};

const APTHRTHR_HL = {
  head_center:           { x: 98,  y: 82,  c: "#ef4444" },
  cup_rim_superolateral: { x: 63,  y: 29,  c: "#f97316" },
  cup_rim_superomedial:  { x: 133, y: 29,  c: "#eab308" },
  stem_tip:              { x: 93,  y: 226, c: "#06b6d4" },
  calcar:                { x: 89,  y: 135, c: "#8b5cf6" },
  greater_trochanter:    { x: 28,  y: 135, c: "#ec4899" },
};

const APTKA_HL = {
  femoral_comp_medial_kiri:   { x: 53,  y: 88,  c: "#ef4444" },
  femoral_comp_lateral_kiri:  { x: 97,  y: 86,  c: "#f97316" },
  tibial_tray_medial_kiri:    { x: 46,  y: 115, c: "#eab308" },
  tibial_tray_lateral_kiri:   { x: 104, y: 115, c: "#84cc16" },
  joint_line_medial_kiri:     { x: 61,  y: 115, c: "#06b6d4" },
  joint_line_lateral_kiri:    { x: 89,  y: 115, c: "#8b5cf6" },
  femoral_comp_medial_kanan:  { x: 183, y: 88,  c: "#ec4899" },
  femoral_comp_lateral_kanan: { x: 227, y: 86,  c: "#14b8a6" },
  tibial_tray_medial_kanan:   { x: 176, y: 115, c: "#a78bfa" },
  tibial_tray_lateral_kanan:  { x: 234, y: 115, c: "#34d399" },
  joint_line_medial_kanan:    { x: 191, y: 115, c: "#fb923c" },
  joint_line_lateral_kanan:   { x: 219, y: 115, c: "#38bdf8" },
};

const LATPATELLA_HL = {
  // Lateral patella view (viewBox 0 0 200 280)
  patellaSup:    { x: 66, y: 74,  c: "#e879f9" },
  patellaInf:    { x: 66, y: 138, c: "#d946ef" },
  tibTuberosity: { x: 90, y: 184, c: "#a78bfa" },
};

const SKYPATELLA_HL = {
  // Skyline patella view (viewBox 0 0 200 160)
  skyPatMed: { x: 68,  y: 68,  c: "#c084fc" },
  skyPatLat: { x: 132, y: 68,  c: "#a855f7" },
};

// ── AP Hip Guide using real pelvis SVG ────────────────────────────────────────

// Anatomical positions in the pelvis.svg display coordinate space
// (viewBox "0 0 413.00308 362.1012", after g1 translate(-26.43, -1.81))
// Derived from colored ellipses embedded in the user's Inkscape SVG:
//   red   = caput femur, yellow = asetabulum sup-lat, green = GT, blue = LT
const HIP = {
  kiri: {
    cx: 94,  headY: 179,
    aceSupLatX: 72,  aceSupLatY: 182,
    gtX: 23, gtY: 202,
    ltX: 74, ltY: 280,
    cupAceX: 83,  cupAceY: 181,
    cupRimSupLatX: 68,  cupRimSupLatY: 173,
    cupRimSupMedX: 100, cupRimSupMedY: 173,
    calcarX: 102, calcarY: 230,
    tearX: 100,   tearY: 200,
    stemCx: 94,   stemTipY: 335,
    stemTopY: 212, stemHW: 9, stemHWBot: 5,
    cupR: 32, headR: 27,
  },
  kanan: {
    cx: 314, headY: 179,
    aceSupLatX: 339, aceSupLatY: 180,
    gtX: 393, gtY: 201,
    ltX: 339, ltY: 281,
    cupAceX: 325, cupAceY: 179,
    cupRimSupLatX: 342, cupRimSupLatY: 172,
    cupRimSupMedX: 307, cupRimSupMedY: 172,
    calcarX: 305, calcarY: 230,
    tearX: 307,   tearY: 200,
    stemCx: 314,  stemTipY: 335,
    stemTopY: 212, stemHW: 9, stemHWBot: 5,
    cupR: 32, headR: 27,
  },
};

function ThrOverlay({ h }) {
  const { cx, cupAceX, cupAceY, cupR, headR, headY, stemCx, stemTopY, stemTipY, stemHW, stemHWBot } = h;
  const gid = `mh_${cx}`;
  return (
    <g>
      <defs>
        <radialGradient id={gid} cx="33%" cy="28%" r="65%">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="35%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#475569" />
        </radialGradient>
      </defs>
      {/* Acetabular cup shell – dark interior + bright metal ring */}
      <circle cx={cupAceX} cy={cupAceY} r={cupR + 2}
        fill="#08111e" stroke="#d0d6e0" strokeWidth={3.5} />
      <circle cx={cupAceX} cy={cupAceY} r={cupR - 2}
        fill="#050b14" stroke="#4a5568" strokeWidth={0.8} />
      {/* Prosthetic head – bright metallic sphere */}
      <circle cx={cx} cy={headY} r={headR}
        fill={`url(#${gid})`} stroke="#e2e8f0" strokeWidth={2.5} />
      <ellipse cx={cx - 8} cy={headY - 8} rx={7} ry={5} fill="white" opacity={0.28} />
      {/* Metal stem */}
      <path d={`M ${stemCx - stemHW},${stemTopY} L ${stemCx - stemHWBot},${stemTipY} L ${stemCx + stemHWBot},${stemTipY} L ${stemCx + stemHW},${stemTopY} Z`}
        fill="#8b9db5" stroke="#c8d0de" strokeWidth={1.5} />
      <line x1={stemCx - stemHW + 2} y1={stemTopY + 6}
            x2={stemCx - stemHWBot + 1} y2={stemTipY - 4}
        stroke="#e2e8f0" strokeWidth={0.7} opacity={0.35} />
    </g>
  );
}

function HemiOverlay({ h }) {
  const { cx, headY, headR, stemCx, stemTopY, stemTipY, stemHW, stemHWBot } = h;
  const gid = `hm_${cx}`;
  return (
    <g>
      <defs>
        <radialGradient id={gid} cx="33%" cy="28%" r="65%">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="35%" stopColor="#d1d8e4" />
          <stop offset="100%" stopColor="#4a5568" />
        </radialGradient>
      </defs>
      {/* Larger bipolar/Austin Moore metallic head */}
      <circle cx={cx} cy={headY} r={headR + 3}
        fill={`url(#${gid})`} stroke="#e2e8f0" strokeWidth={2.5} />
      <ellipse cx={cx - 9} cy={headY - 9} rx={8} ry={6} fill="white" opacity={0.25} />
      {/* Metal stem */}
      <path d={`M ${stemCx - stemHW},${stemTopY} L ${stemCx - stemHWBot},${stemTipY} L ${stemCx + stemHWBot},${stemTipY} L ${stemCx + stemHW},${stemTopY} Z`}
        fill="#8b9db5" stroke="#c8d0de" strokeWidth={1.5} />
      <line x1={stemCx - stemHW + 2} y1={stemTopY + 6}
            x2={stemCx - stemHWBot + 1} y2={stemTipY - 4}
        stroke="#e2e8f0" strokeWidth={0.7} opacity={0.35} />
    </g>
  );
}

// ── Full AP Hip Guide ─────────────────────────────────────────────────────────

function ApHipGuide({ sideConditions = { kiri: "native", kanan: "native" }, highlightId }) {
  const W = 413.00308;
  const H = 362.1012;

  const renderDots = (condition, h, sideKey) => {
    if (condition === "not_visible" || condition === "rusak") return null;
    const isLeft = sideKey === "kiri";
    const labSide = isLeft ? "right" : "left";
    const labOpp  = isLeft ? "left"  : "right";
    const fs = 7.5;

    if (condition === "native") return (
      <g>
        <LmDot cx={h.cx}         cy={h.headY}       color="#ef4444" label="Caput Femur"    labelPos="above"  r={5} fontSize={fs} />
        <LmDot cx={h.aceSupLatX} cy={h.aceSupLatY}  color="#eab308" label="Asetabulum"     labelPos={labSide} r={4.5} fontSize={fs} />
        <LmDot cx={h.gtX}        cy={h.gtY}         color="#06b6d4" label="Gr. Troch"      labelPos={labSide} r={4.5} fontSize={fs} />
        <LmDot cx={h.ltX}        cy={h.ltY}         color="#ec4899" label="Ls. Troch"      labelPos={labOpp}  r={4.5} fontSize={fs} />
      </g>
    );

    if (condition === "thr") return (
      <g>
        <LmDot cx={h.cx}              cy={h.headY}          color="#ef4444" label="Pusat Kepala"  labelPos="above"  r={5.5} fontSize={fs} />
        <LmDot cx={h.cupRimSupLatX}   cy={h.cupRimSupLatY}  color="#eab308" label="Cup Sup-Lat"   labelPos={labSide} r={4.5} fontSize={fs} />
        <LmDot cx={h.cupRimSupMedX}   cy={h.cupRimSupMedY}  color="#84cc16" label="Cup Sup-Med"   labelPos={labOpp}  r={4.5} fontSize={fs} />
        <LmDot cx={h.gtX}             cy={h.gtY}            color="#06b6d4" label="Gr. Troch"     labelPos={labSide} r={4.5} fontSize={fs} />
        <LmDot cx={h.calcarX}         cy={h.calcarY}        color="#fb923c" label="Calcar"        labelPos={labOpp}  r={4.5} fontSize={fs} />
        <LmDot cx={h.stemCx}          cy={h.stemTipY}       color="#ec4899" label="Stem Tip"      labelPos="below"  r={4.5} fontSize={fs} />
      </g>
    );

    if (condition === "hemi") return (
      <g>
        <LmDot cx={h.cx}         cy={h.headY}      color="#ef4444" label="Pusat Kepala"  labelPos="above"  r={5.5} fontSize={fs} />
        <LmDot cx={h.aceSupLatX} cy={h.aceSupLatY} color="#eab308" label="Aset. Asli"   labelPos={labSide} r={4.5} fontSize={fs} />
        <LmDot cx={h.tearX}      cy={h.tearY}      color="#06b6d4" label="Teardrop"      labelPos={labOpp}  r={4.5} fontSize={fs} />
        <LmDot cx={h.gtX}        cy={h.gtY}        color="#8b5cf6" label="Gr. Troch"     labelPos={labSide} r={4.5} fontSize={fs} />
        <LmDot cx={h.stemCx}     cy={h.stemTipY}   color="#ec4899" label="Stem Tip"      labelPos="below"  r={4.5} fontSize={fs} />
      </g>
    );

    return null;
  };

  const kL = sideConditions.kiri;
  const kR = sideConditions.kanan;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 380, display: "block" }}>
      {/* X-ray dark background */}
      <rect width={W} height={H} fill="#060c14" />

      {/* Actual pelvis anatomy from user's SVG */}
      <image href="/pelvis.svg" x={0} y={0} width={W} height={H} opacity={0.88} />

      {/* THA / HEMI implant overlays on top of bone */}
      {kL === "thr"  && <ThrOverlay  h={HIP.kiri} />}
      {kL === "hemi" && <HemiOverlay h={HIP.kiri} />}
      {kR === "thr"  && <ThrOverlay  h={HIP.kanan} />}
      {kR === "hemi" && <HemiOverlay h={HIP.kanan} />}

      {/* Not-visible / Rusak: dark overlay over that half */}
      {(kL === "not_visible" || kL === "rusak") && (
        <g>
          <rect x={0} y={0} width={206} height={H} fill="#060c14" opacity={0.92} />
          <text x={103} y={H / 2} textAnchor="middle" fontSize={12}
            fill="#334155" fontFamily="sans-serif" fontWeight="bold">
            {kL === "rusak" ? "Rusak / Tidak Terbaca" : "Tidak Terlihat"}
          </text>
        </g>
      )}
      {(kR === "not_visible" || kR === "rusak") && (
        <g>
          <rect x={207} y={0} width={W - 207} height={H} fill="#060c14" opacity={0.92} />
          <text x={310} y={H / 2} textAnchor="middle" fontSize={12}
            fill="#334155" fontFamily="sans-serif" fontWeight="bold">
            {kR === "rusak" ? "Rusak / Tidak Terbaca" : "Tidak Terlihat"}
          </text>
        </g>
      )}

      {/* Center line */}
      <line x1={W / 2} y1={8} x2={W / 2} y2={H - 8}
        stroke="#1e293b" strokeWidth={0.6} strokeDasharray="3,4" />

      {/* L / R labels */}
      <text x={HIP.kiri.cx}  y={16} textAnchor="middle" fontSize={10} fill="#475569"
        fontFamily="sans-serif" fontWeight="bold">L</text>
      <text x={HIP.kanan.cx} y={16} textAnchor="middle" fontSize={10} fill="#475569"
        fontFamily="sans-serif" fontWeight="bold">R</text>

      {/* Landmark dots rendered last (always on top) */}
      {renderDots(kL, HIP.kiri,  "kiri")}
      {renderDots(kR, HIP.kanan, "kanan")}

      {/* Active landmark highlight ring */}
      {(() => { const h = APHIP_HL[highlightId]; return h ? <HighlightRing cx={h.x} cy={h.y} color={h.c} /> : null; })()}
    </svg>
  );
}

// ── AP Knee Guide ─────────────────────────────────────────────────────────────

function ApKneeGuide({ highlightId, side = null }) {
  // side: "right" | "left" | null (bilateral)
  const joints = [
    { cx: 75,  isRight: false, label: "L", dots: { km: "#ef4444", kl: "#f97316", pm: "#eab308", pl: "#84cc16" } },
    { cx: 205, isRight: true,  label: "R", dots: { km: "#06b6d4", kl: "#8b5cf6", pm: "#ec4899", pl: "#14b8a6" } },
  ];

  const isActive = (isRight) =>
    !side || (side === "right" && isRight) || (side === "left" && !isRight);

  return (
    <svg viewBox="0 0 280 210" className="w-full" style={{ maxHeight: 240, display: "block" }}>
      <rect width={280} height={210} fill="#080e18" rx={6} />
      <defs>
        <linearGradient id="bone_vert" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#4a5e7a" />
          <stop offset="40%"  stopColor="#6b7fa0" />
          <stop offset="100%" stopColor="#2d3f55" />
        </linearGradient>
      </defs>

      {/* Active-side highlight frame */}
      {side && joints.filter(j => isActive(j.isRight)).map(({ cx }) => (
        <rect key={`frame-${cx}`} x={cx - 38} y={14} width={76} height={192} rx={8}
          fill="rgba(34,211,238,0.05)" stroke="#22d3ee" strokeWidth={1.5} opacity={0.7} />
      ))}

      {joints.map(({ cx, isRight, label, dots }) => (
        <g key={cx} opacity={isActive(isRight) ? 1 : 0.25}>
          {/* Distal femur shaft */}
          <rect x={cx - 24} y={18} width={48} height={75} rx={4}
            fill="#101e2e" stroke="#4a5e7a" strokeWidth={1.5} />
          <line x1={cx - 20} y1={20} x2={cx - 20} y2={90} stroke="#7a9ab5" strokeWidth={1} opacity={0.4} />
          <line x1={cx + 20} y1={20} x2={cx + 20} y2={90} stroke="#7a9ab5" strokeWidth={1} opacity={0.4} />
          {/* Medial condyle */}
          <ellipse cx={cx - 14} cy={103} rx={16} ry={11}
            fill="#101e2e" stroke="#6b7fa0" strokeWidth={1.8} />
          {/* Lateral condyle */}
          <ellipse cx={cx + 14} cy={101} rx={14} ry={10}
            fill="#101e2e" stroke="#6b7fa0" strokeWidth={1.8} />
          <ellipse cx={cx} cy={107} rx={6} ry={4} fill="#060c14" />
          {/* Joint space */}
          <line x1={cx - 34} y1={120} x2={cx + 34} y2={120}
            stroke="#1e293b" strokeWidth={0.8} strokeDasharray="2,3" />
          {/* Tibial plateau medial */}
          <path d={`M ${cx - 34},120 L ${cx - 2},120 L ${cx - 2},138 L ${cx - 34},136 Z`}
            fill="#101e2e" stroke="#6b7fa0" strokeWidth={1.5} />
          {/* Tibial plateau lateral */}
          <path d={`M ${cx + 2},120 L ${cx + 34},120 L ${cx + 34},136 L ${cx + 2},138 Z`}
            fill="#101e2e" stroke="#6b7fa0" strokeWidth={1.5} />
          {/* Tibial shaft */}
          <rect x={cx - 20} y={136} width={40} height={60} rx={3}
            fill="#101e2e" stroke="#4a5e7a" strokeWidth={1.5} />
          <line x1={cx - 16} y1={138} x2={cx - 16} y2={194} stroke="#7a9ab5" strokeWidth={1} opacity={0.4} />
          <line x1={cx + 16} y1={138} x2={cx + 16} y2={194} stroke="#7a9ab5" strokeWidth={1} opacity={0.4} />
          {/* Side label */}
          <text x={cx} y={12} textAnchor="middle" fontSize={7}
            fill={isActive(isRight) ? "#22d3ee" : "#334155"}
            fontFamily="sans-serif" fontWeight="bold">{label}{isActive(isRight) && side ? " ✓" : ""}</text>
          {/* Landmark dots */}
          <LmDot cx={cx - 14} cy={93}  color={dots.km} label="Kond.Med" labelPos="left"  r={4.5} />
          <LmDot cx={cx + 14} cy={91}  color={dots.kl} label="Kond.Lat" labelPos="right" r={4.5} />
          <LmDot cx={cx - 34} cy={120} color={dots.pm} label="TP Med"   labelPos="left"  r={4.5} />
          <LmDot cx={cx + 34} cy={120} color={dots.pl} label="TP Lat"   labelPos="right" r={4.5} />
        </g>
      ))}

      {(() => { const h = APKNEE_HL[highlightId]; return h ? <HighlightRing cx={h.x} cy={h.y} color={h.c} /> : null; })()}
    </svg>
  );
}

// ── AP Proximal Femur Guide ───────────────────────────────────────────────────

function ApProxFemurGuide({ highlightId }) {
  return (
    <svg viewBox="0 0 200 230" className="w-full" style={{ maxHeight: 260, display: "block" }}>
      <rect width={200} height={230} fill="#080e18" rx={6} />
      <defs>
        <radialGradient id="head_prox" cx="38%" cy="33%" r="60%">
          <stop offset="0%"   stopColor="#7a8fa8" />
          <stop offset="60%"  stopColor="#4a5c70" />
          <stop offset="100%" stopColor="#1e2d3d" />
        </radialGradient>
      </defs>

      {/* Acetabular arc (partial) */}
      <path d="M 40,52 A 55,42 0 0 1 155,52"
        fill="none" stroke="#8b9db5" strokeWidth={2.5} />
      <ellipse cx={98} cy={52} rx={50} ry={28}
        fill="#0d1520" stroke="#4a5568" strokeWidth={1} />

      {/* Femoral head */}
      <circle cx={98} cy={82} r={38}
        fill="url(#head_prox)" stroke="#6b7fa0" strokeWidth={2} />
      <circle cx={98} cy={82} r={38}
        fill="none" stroke="#a0b3cc" strokeWidth={0.8} opacity={0.5} />

      {/* Femoral neck */}
      <path d="M 84,118 L 62,154"
        stroke="#6b7fa0" strokeWidth={12} strokeLinecap="round" />
      <path d="M 86,118 L 64,152"
        stroke="#8b9db5" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />

      {/* Greater trochanter */}
      <path d="M 62,154 L 30,136"
        stroke="#6b7fa0" strokeWidth={11} strokeLinecap="round" />
      <path d="M 29,135 L 25,130"
        stroke="#8b9db5" strokeWidth={2} strokeLinecap="round" opacity={0.6} />

      {/* Femoral shaft */}
      <rect x={50} y={154} width={34} height={75} rx={5}
        fill="#101e2e" stroke="#4a5e7a" strokeWidth={2} />
      <line x1={55} y1={156} x2={53} y2={227} stroke="#7a9ab5" strokeWidth={1} opacity={0.4} />

      {/* Lesser trochanter */}
      <path d="M 84,140 L 106,153"
        stroke="#6b7fa0" strokeWidth={6} strokeLinecap="round" />

      {/* Intertrochanteric line (dashed) */}
      <line x1={29} y1={137} x2={107} y2={154}
        stroke="#2d3f55" strokeWidth={1} strokeDasharray="4,3" />

      {/* Neck axis (dashed) */}
      <line x1={98} y1={82} x2={63} y2={152}
        stroke="#1e3a5f" strokeWidth={1} strokeDasharray="3,3" />

      {/* Landmark dots */}
      <LmDot cx={98}  cy={44}  color="#ef4444" label="Caput Femur"  labelPos="above" />
      <LmDot cx={38}  cy={50}  color="#f97316" label="Acetabulum"   labelPos="left" />
      <LmDot cx={27}  cy={135} color="#eab308" label="Gr. Troch"    labelPos="left" />
      <LmDot cx={108} cy={153} color="#06b6d4" label="Ls. Troch"    labelPos="right" />
      <LmDot cx={77}  cy={112} color="#8b5cf6" label="Neck Center"  labelPos="left" />
      <LmDot cx={28}  cy={138} color="#ec4899" label="IT Lateral"   labelPos="left" />
      <LmDot cx={106} cy={154} color="#14b8a6" label="IT Medial"    labelPos="right" />
      {(() => { const h = APROX_HL[highlightId]; return h ? <HighlightRing cx={h.x} cy={h.y} color={h.c} /> : null; })()}
    </svg>
  );
}

// ── AP Proximal Femur + THR ───────────────────────────────────────────────────

function ApProxFemurThrGuide({ highlightId }) {
  return (
    <svg viewBox="0 0 200 230" className="w-full" style={{ maxHeight: 260, display: "block" }}>
      <rect width={200} height={230} fill="#080e18" rx={6} />
      <defs>
        <radialGradient id="head_thr_prox" cx="33%" cy="28%" r="65%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="35%"  stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </radialGradient>
      </defs>

      {/* Metal cup ring */}
      <circle cx={98} cy={58} r={36}
        fill="none" stroke="#e2e8f0" strokeWidth={3.5} />
      <circle cx={98} cy={58} r={32}
        fill="#0d1520" stroke="#475569" strokeWidth={1} />

      {/* Prosthetic head */}
      <circle cx={98} cy={82} r={32}
        fill="url(#head_thr_prox)" stroke="#e2e8f0" strokeWidth={2.5} />
      <ellipse cx={87} cy={72} rx={9} ry={6} fill="white" opacity={0.3} />

      {/* Metal stem */}
      <path d="M 86,113 L 80,228 L 100,228 L 108,113 Z"
        fill="#94a3b8" stroke="#cbd5e1" strokeWidth={1.5} />
      <line x1={85} y1={118} x2={81} y2={224} stroke="#e2e8f0" strokeWidth={0.8} opacity={0.5} />

      {/* Native bone around stem */}
      <path d="M 62,152 L 58,228" stroke="#4a5a70" strokeWidth={16} strokeLinecap="round" />
      <path d="M 110,228 L 112,152" stroke="#4a5a70" strokeWidth={16} strokeLinecap="round" />

      {/* Greater trochanter (native) */}
      <path d="M 62,152 L 30,136"
        stroke="#5a6e88" strokeWidth={10} strokeLinecap="round" />

      {/* Landmark dots */}
      <LmDot cx={98}  cy={82}  color="#ef4444" label="Pusat Kepala"    labelPos="above" r={6} />
      <LmDot cx={63}  cy={29}  color="#f97316" label="Cup Sup-Lat"     labelPos="left" />
      <LmDot cx={133} cy={29}  color="#eab308" label="Cup Sup-Med"     labelPos="right" />
      <LmDot cx={28}  cy={135} color="#ec4899" label="Gr. Troch"       labelPos="left" />
      <LmDot cx={89}  cy={135} color="#8b5cf6" label="Calcar"          labelPos="right" />
      <LmDot cx={93}  cy={226} color="#06b6d4" label="Stem Tip"        labelPos="below" />
      {(() => { const h = APTHRTHR_HL[highlightId]; return h ? <HighlightRing cx={h.x} cy={h.y} color={h.c} /> : null; })()}
    </svg>
  );
}

// ── AP Knee TKA Guide ─────────────────────────────────────────────────────────

function ApKneeTkaGuide({ highlightId, side = null }) {
  // side: "right" | "left" | null (bilateral)
  const joints = [
    { cx: 75,  isRight: false, label: "L", dotsF: { fcm: "#ef4444", fcl: "#f97316", ttm: "#eab308", ttl: "#84cc16", jlm: "#06b6d4", jll: "#8b5cf6" } },
    { cx: 205, isRight: true,  label: "R", dotsF: { fcm: "#ec4899", fcl: "#14b8a6", ttm: "#a78bfa", ttl: "#34d399", jlm: "#fb923c", jll: "#38bdf8" } },
  ];

  const isActive = (isRight) =>
    !side || (side === "right" && isRight) || (side === "left" && !isRight);

  return (
    <svg viewBox="0 0 280 210" className="w-full" style={{ maxHeight: 240, display: "block" }}>
      <rect width={280} height={210} fill="#080e18" rx={6} />
      <defs>
        <linearGradient id="metal_comp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>

      {/* Active-side highlight frame */}
      {side && joints.filter(j => isActive(j.isRight)).map(({ cx }) => (
        <rect key={`frame-${cx}`} x={cx - 38} y={14} width={76} height={192} rx={8}
          fill="rgba(34,211,238,0.05)" stroke="#22d3ee" strokeWidth={1.5} opacity={0.7} />
      ))}

      {joints.map(({ cx, isRight, label, dotsF: d }) => (
        <g key={cx} opacity={isActive(isRight) ? 1 : 0.25}>
          {/* Side label */}
          <text x={cx} y={12} textAnchor="middle" fontSize={7}
            fill={isActive(isRight) ? "#22d3ee" : "#334155"}
            fontFamily="sans-serif" fontWeight="bold">{label}{isActive(isRight) && side ? " ✓" : ""}</text>
          {/* Femoral shaft */}
          <rect x={cx - 22} y={18} width={44} height={60} rx={3}
            fill="#101e2e" stroke="#4a5e7a" strokeWidth={1.5} />
          {/* Femoral component (metal, bright) */}
          <path d={`M ${cx - 28},78 Q ${cx - 20},70 ${cx - 12},92 Q ${cx},96 Q ${cx + 12},92 Q ${cx + 20},70 ${cx + 28},78`}
            fill="url(#metal_comp)" stroke="#e2e8f0" strokeWidth={1.5} />
          {/* Tibial insert */}
          <rect x={cx - 30} y={115} width={60} height={8} rx={2}
            fill="#64748b" stroke="#94a3b8" strokeWidth={1.2} />
          {/* Tibial tray */}
          <rect x={cx - 28} y={123} width={56} height={5} rx={1}
            fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1} />
          {/* Tibial shaft */}
          <rect x={cx - 18} y={128} width={36} height={68} rx={3}
            fill="#101e2e" stroke="#4a5e7a" strokeWidth={1.5} />
          {/* Joint space */}
          <line x1={cx - 30} y1={115} x2={cx + 30} y2={115}
            stroke="#2d3f55" strokeWidth={0.8} strokeDasharray="2,3" />
          {/* Landmark dots */}
          <LmDot cx={cx - 22} cy={88}  color={d.fcm} label="FC Med"  labelPos="left"  r={4} />
          <LmDot cx={cx + 22} cy={86}  color={d.fcl} label="FC Lat"  labelPos="right" r={4} />
          <LmDot cx={cx - 29} cy={115} color={d.ttm} label="TT Med"  labelPos="left"  r={4} />
          <LmDot cx={cx + 29} cy={115} color={d.ttl} label="TT Lat"  labelPos="right" r={4} />
          <LmDot cx={cx - 14} cy={115} color={d.jlm} label="JL Med"  labelPos="below" r={3.5} />
          <LmDot cx={cx + 14} cy={115} color={d.jll} label="JL Lat"  labelPos="below" r={3.5} />
        </g>
      ))}

      {(() => { const h = APTKA_HL[highlightId]; return h ? <HighlightRing cx={h.x} cy={h.y} color={h.c} /> : null; })()}
    </svg>
  );
}

// ── Lateral Patella Guide ──────────────────────────────────────────────────────
// viewBox 0 0 200 280 — lateral knee showing patella, Insall-Salvati ratio landmarks

function LateralPatellaGuide({ highlightId }) {
  const h = LATPATELLA_HL[highlightId];
  return (
    <svg viewBox="0 0 200 280" className="w-full" style={{ maxHeight: 300, display: "block" }}>
      <rect width={200} height={280} fill="#080e18" rx={6} />

      {/* ── Distal femur (lateral view, posterior aspect right) ── */}
      {/* Femur shaft */}
      <rect x={80} y={10} width={36} height={80} rx={5}
        fill="#101e2e" stroke="#4a5e7a" strokeWidth={1.5} />
      <line x1={84} y1={12} x2={84} y2={88} stroke="#7a9ab5" strokeWidth={1} opacity={0.4} />
      <line x1={112} y1={12} x2={112} y2={88} stroke="#7a9ab5" strokeWidth={1} opacity={0.4} />
      {/* Femoral condyle (lateral view — rounded posterior) */}
      <ellipse cx={98} cy={100} rx={28} ry={22}
        fill="#101e2e" stroke="#6b7fa0" strokeWidth={2} />
      {/* Trochlear groove (anterior) */}
      <path d="M 70,85 Q 76,72 88,68" fill="none" stroke="#4a5e7a" strokeWidth={1.5} />

      {/* ── Patella ── */}
      <ellipse cx={56} cy={88} rx={18} ry={14}
        fill="#131f30" stroke="#7a9ab5" strokeWidth={2} />
      {/* Patella articular surface hint */}
      <path d="M 68,82 Q 72,88 68,94" fill="none" stroke="#4a5e7a" strokeWidth={1} opacity={0.6} />

      {/* Patellar tendon */}
      <path d="M 56,102 Q 66,124 80,146" fill="none" stroke="#5a7a9a" strokeWidth={2} strokeDasharray="4,2" />

      {/* ── Tibia / Fibula ── */}
      {/* Tibial plateau */}
      <path d="M 52,148 L 138,148 L 138,162 L 52,162 Z"
        fill="#101e2e" stroke="#6b7fa0" strokeWidth={1.8} />
      {/* Tibial shaft */}
      <rect x={62} y={162} width={44} height={108} rx={4}
        fill="#101e2e" stroke="#4a5e7a" strokeWidth={1.5} />
      <line x1={67} y1={164} x2={67} y2={268} stroke="#7a9ab5" strokeWidth={1} opacity={0.35} />
      <line x1={102} y1={164} x2={102} y2={268} stroke="#7a9ab5" strokeWidth={1} opacity={0.35} />
      {/* Tibial tuberosity prominence */}
      <path d="M 106,148 Q 118,158 114,172 L 106,172 Z"
        fill="#101e2e" stroke="#5a7a9a" strokeWidth={1.3} />

      {/* ── Insall-Salvati reference lines ── */}
      {/* PT length line */}
      <line x1={46} y1={102} x2={46} y2={148}
        stroke="#a78bfa" strokeWidth={1} strokeDasharray="2,2" opacity={0.6} />
      <line x1={42} y1={102} x2={50} y2={102} stroke="#a78bfa" strokeWidth={1} opacity={0.6} />
      <line x1={42} y1={148} x2={50} y2={148} stroke="#a78bfa" strokeWidth={1} opacity={0.6} />
      <text x={34} y={128} textAnchor="middle" fontSize={5.5} fill="#a78bfa" fontFamily="sans-serif" transform="rotate(-90,34,128)">PT</text>

      {/* Labels */}
      <text x={56} y={78} textAnchor="middle" fontSize={6} fill="#94a3b8" fontFamily="sans-serif">Patella</text>
      <text x={115} y={170} textAnchor="start" fontSize={6} fill="#94a3b8" fontFamily="sans-serif">Tub.</text>
      <text x={115} y={178} textAnchor="start" fontSize={6} fill="#94a3b8" fontFamily="sans-serif">Tib.</text>

      {/* ── Landmark dots ── */}
      <LmDot cx={56} cy={74}  color="#e879f9" label="Patella Sup" labelPos="left"  r={5} />
      <LmDot cx={56} cy={102} color="#d946ef" label="Patella Inf" labelPos="left"  r={5} />
      <LmDot cx={110} cy={150} color="#a78bfa" label="Tub. Tib." labelPos="right" r={5} />

      {h ? <HighlightRing cx={h.x} cy={h.y} color={h.c} /> : null}
    </svg>
  );
}

// ── Skyline (Axial) Patella Guide ─────────────────────────────────────────────
// viewBox 0 0 200 160 — axial cross-section of patellofemoral joint

function SkylinePatellaGuide({ highlightId }) {
  const h = SKYPATELLA_HL[highlightId];
  return (
    <svg viewBox="0 0 200 160" className="w-full" style={{ maxHeight: 200, display: "block" }}>
      <rect width={200} height={160} fill="#080e18" rx={6} />

      {/* ── Trochlear groove (femur cross-section, top) ── */}
      <path d="M 30,40 Q 60,22 100,30 Q 140,22 170,40 Q 150,58 100,60 Q 50,58 30,40 Z"
        fill="#101e2e" stroke="#6b7fa0" strokeWidth={2} />
      {/* Trochlear groove notch */}
      <path d="M 80,50 Q 100,42 120,50" fill="none" stroke="#3a5268" strokeWidth={2} />
      <text x={100} y={22} textAnchor="middle" fontSize={6} fill="#64748b" fontFamily="sans-serif">Femur (Trochlea)</text>

      {/* ── Patella (axial cross-section) ── */}
      <ellipse cx={100} cy={100} rx={38} ry={26}
        fill="#131f30" stroke="#7a9ab5" strokeWidth={2.2} />
      {/* Patellar ridge (midline) */}
      <line x1={100} y1={74} x2={100} y2={126} stroke="#3a5268" strokeWidth={1.5} opacity={0.5} />
      {/* Articular surface curve */}
      <path d="M 62,100 Q 100,88 138,100" fill="none" stroke="#4a6a8a" strokeWidth={1} opacity={0.6} />

      {/* ── Medial / Lateral labels ── */}
      <text x={20} y={105} textAnchor="middle" fontSize={6.5} fill="#64748b" fontFamily="sans-serif">Med</text>
      <text x={180} y={105} textAnchor="middle" fontSize={6.5} fill="#64748b" fontFamily="sans-serif">Lat</text>
      <text x={100} y={155} textAnchor="middle" fontSize={6} fill="#64748b" fontFamily="sans-serif">Patella — Axial (Skyline)</text>

      {/* ── Joint space lines ── */}
      <line x1={62} y1={80} x2={72} y2={72} stroke="#2d3f55" strokeWidth={0.8} strokeDasharray="2,2" opacity={0.5} />
      <line x1={138} y1={80} x2={128} y2={72} stroke="#2d3f55" strokeWidth={0.8} strokeDasharray="2,2" opacity={0.5} />

      {/* ── Landmark dots ── */}
      <LmDot cx={68}  cy={100} color="#c084fc" label="Aspek Med" labelPos="left"  r={5} />
      <LmDot cx={132} cy={100} color="#a855f7" label="Aspek Lat" labelPos="right" r={5} />

      {h ? <HighlightRing cx={h.x} cy={h.y} color={h.c} /> : null}
    </svg>
  );
}

// ── Registry ──────────────────────────────────────────────────────────────────

const GUIDE_REGISTRY = {
  ap_hip:                  { label: "AP Hip / Pelvis",            Component: ApHipGuide,          needsSide: "full"   },
  ap_knee:                 { label: "AP Knee",                    Component: ApKneeGuide,         needsSide: "simple" },
  ap_femur:                { label: "AP Femur",                   Component: ApProxFemurGuide,    needsSide: false    },
  ap_proximal_femur:       { label: "AP Proksimal Femur",         Component: ApProxFemurGuide,    needsSide: false    },
  ap_ankle:                { label: "AP Ankle",                   Component: ApKneeGuide,         needsSide: false    },
  lateral_hip:             { label: "Lateral Hip",                Component: ApProxFemurGuide,    needsSide: false    },
  lateral_knee:            { label: "Lateral Knee",               Component: ApKneeGuide,         needsSide: "simple" },
  ap_knee_tka:             { label: "AP Knee — Post TKA",         Component: ApKneeTkaGuide,      needsSide: "simple" },
  ap_proximal_femur_thr:   { label: "AP Proksimal Femur — THR",   Component: ApProxFemurThrGuide, needsSide: false    },
  lateral_patella:         { label: "Lateral Patella",            Component: LateralPatellaGuide, needsSide: false    },
  sky_patella:             { label: "Skyline Patella",            Component: SkylinePatellaGuide, needsSide: false    },
};

// ── GuideContent — embeddable (no modal wrapper) ─────────────────────────────

// Derive simple side ("right"|"left"|null) from sideConditions for knee guides
function deriveSide(sideConditions) {
  if (!sideConditions) return null;
  const rOp = sideConditions.kanan && sideConditions.kanan !== "native";
  const lOp = sideConditions.kiri  && sideConditions.kiri  !== "native";
  if (rOp && !lOp) return "right";
  if (lOp && !rOp) return "left";
  return null;
}

export function GuideContent({ viewId, sideConditions, highlightId }) {
  const guide = GUIDE_REGISTRY[viewId];
  if (!guide) return null;
  const { Component, needsSide } = guide;
  if (needsSide === "full")
    return <Component sideConditions={sideConditions} highlightId={highlightId} />;
  if (needsSide === "simple")
    return <Component side={deriveSide(sideConditions)} highlightId={highlightId} />;
  return <Component highlightId={highlightId} />;
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LandmarkGuide({ isOpen, onClose, viewId, sideConditions, highlightId }) {
  const guide = GUIDE_REGISTRY[viewId];

  if (!isOpen || typeof window === "undefined" || !guide) return null;

  const { label, Component, needsSide } = guide;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1520] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Contoh Posisi Landmark</p>
            <p className="mt-0.5 text-[13px] font-black text-white">{label}</p>
            {highlightId && (
              <p className="mt-0.5 flex items-center gap-1.5 text-[9px] text-amber-400">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Posisi aktif ditandai dengan lingkaran berkedip
              </p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Diagram */}
        <div className="p-4">
          <div className="rounded-xl overflow-hidden border border-white/5">
            {needsSide === "full"
              ? <Component sideConditions={sideConditions} highlightId={highlightId} />
              : needsSide === "simple"
              ? <Component side={deriveSide(sideConditions)} highlightId={highlightId} />
              : <Component highlightId={highlightId} />
            }
          </div>
        </div>

        {/* Legend notes */}
        <div className="border-t border-white/5 px-5 py-3">
          <p className="text-[8px] leading-relaxed text-slate-600">
            Titik berwarna = posisi landmark yang harus diklik.
            {needsSide && " Diagram berubah sesuai kondisi sisi (ASLI/THA/HEMI) yang dipilih di panel."}
            {" "}Posisi bersifat skematik — sesuaikan dengan anatomi aktual di foto X-ray pasien.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
