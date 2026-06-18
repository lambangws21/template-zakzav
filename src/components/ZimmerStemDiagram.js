"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildStemVisualMapping } from "@/lib/zimmerStemMapping";

// ── Visual constants ────────────────────────────────────────────────────────
const TEAL    = "#0d9488";
const TEAL_D  = "#0a7466";
const SLATE   = "#475569";
const SLATE_L = "#94a3b8";
const WHITE   = "#ffffff";

// Stem drawing pivot (proximal shoulder centre)
const CX = 108;
const SY = 80;

// ── Geometry helpers ────────────────────────────────────────────────────────

function buildBodyPath(stemSizeMm, stemLengthMm) {
  const H  = stemLengthMm * 1.68;           // body height (visual px)
  const pw = stemSizeMm  * 1.95;            // proximal half-width
  const iw = Math.max(stemSizeMm * 0.50, 4); // isthmus half-width
  const iy = SY + H * 0.60;                 // isthmus Y
  const ty = SY + H;                        // distal tip Y

  const path = [
    `M ${CX - pw} ${SY}`,
    `C ${CX - pw - 2} ${iy - 38},  ${CX - iw}     ${iy - 12}, ${CX - iw} ${iy}`,
    `L ${CX - iw + 0.8} ${ty - 14}`,
    `Q ${CX}            ${ty + 8},  ${CX + iw - 0.8} ${ty - 14}`,
    `L ${CX + iw}       ${iy}`,
    `C ${CX + iw + 2}   ${iy - 12}, ${CX + pw + 6}   ${iy - 48}, ${CX + pw} ${SY}`,
    `Z`,
  ].join(" ");

  return { path, H, pw, iw, iy, ty };
}

function buildNeck(pw, neckLengthMm, neckRotate = 0) {
  const BASE_ANGLE = -43; // degrees above horizontal, going upper-right
  const angleDeg   = BASE_ANGLE + neckRotate;
  const angleRad   = (angleDeg * Math.PI) / 180;
  const neckPx     = neckLengthMm * 1.44;
  const nx = CX + pw - 2;
  const ny = SY + 18;
  const tx = nx + neckPx * Math.cos(angleRad);
  const ty = ny + neckPx * Math.sin(angleRad);
  return { nx, ny, tx, ty, neckPx, angleDeg, angleRad };
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ZimmerStemDiagram({ selection }) {
  const mapping = useMemo(() => {
    try { return buildStemVisualMapping(selection); }
    catch { return null; }
  }, [selection]);

  const derived = useMemo(() => {
    if (!mapping) return null;
    const { current, visual } = mapping;
    const hn = selection.headNeck || "+0";
    const neckLenMm   = current.neckLengthMm ?? 38;
    const stemOffsetMm = current.stemOffsetMm ?? 44;

    const geo   = buildBodyPath(current.stemSizeMm, current.stemLengthMm);
    const neck  = buildNeck(geo.pw, neckLenMm, visual.neckRotate);

    return { current, visual, geo, neck, hn, neckLenMm, stemOffsetMm };
  }, [mapping, selection]);

  if (!derived) return null;

  const { current, geo, neck, hn, stemOffsetMm } = derived;
  const { path, pw, iw, iy, ty } = geo;
  const { nx, ny, tx, ty: hty, neckPx, angleDeg } = neck;
  const headR = 13.5;

  // annotation positions
  const annRight = CX + pw + 20;
  const annTop   = SY;
  const annBot   = ty;
  const annMid   = (annTop + annBot) / 2;

  return (
    <AnimatePresence>
      <motion.div
        key={`stem-${current.stemSizeMm}-${current.offsetType}-${current.neckVariant}-${hn}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.38)", border: "1px solid rgba(255,255,255,0.50)", backdropFilter: "blur(10px)" }}
      >
        {/* Header strip */}
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ background: "rgba(13,148,136,0.08)", borderBottom: "1px solid rgba(255,255,255,0.35)" }}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: TEAL_D }}>
              Zimmer M/L Taper — Diagram
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">
              {current.offsetType === "extended" ? "Extended Offset" : "Standard Offset"}
              {" · "}
              {current.neckVariant === "reduced" ? "Reduced Neck" : "Normal Neck"}
              {" · "}
              Head/Neck {hn} mm
            </p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-black leading-none" style={{ color: TEAL }}>
              {current.stemSizeMm}
            </p>
            <p className="text-[8px] text-slate-400">mm</p>
          </div>
        </div>

        {/* SVG diagram */}
        <svg
          viewBox="0 0 260 368"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
          role="img"
          aria-label={`Zimmer M/L Taper ${current.stemSizeMm} mm diagram`}
        >
          <defs>
            {/* Metallic titanium gradient */}
            <linearGradient id="zsg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#7d92a8" />
              <stop offset="28%"  stopColor="#c2d0de" />
              <stop offset="50%"  stopColor="#eef3f8" />
              <stop offset="74%"  stopColor="#c2d0de" />
              <stop offset="100%" stopColor="#7d92a8" />
            </linearGradient>
            {/* Teal surface sheen */}
            <linearGradient id="zteal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={TEAL} stopOpacity="0" />
              <stop offset="50%"  stopColor={TEAL} stopOpacity="0.14" />
              <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
            </linearGradient>
            {/* Head radial */}
            <radialGradient id="zhg" cx="35%" cy="30%" r="68%">
              <stop offset="0%"   stopColor="#f4f8fc" />
              <stop offset="55%"  stopColor="#c2d0de" />
              <stop offset="100%" stopColor="#7d92a8" />
            </radialGradient>
            {/* Neck gradient vertical */}
            <linearGradient id="zneck" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#9fb0c2" />
              <stop offset="45%"  stopColor="#e8f0f8" />
              <stop offset="100%" stopColor="#9fb0c2" />
            </linearGradient>
            {/* Drop shadow — light, not heavy */}
            <filter id="zshadow" x="-15%" y="-8%" width="140%" height="130%">
              <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#00000010" />
            </filter>
            {/* Annotation arrow marker */}
            <marker id="aarr" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5" orient="auto">
              <path d="M0,0.5 L6.5,3.5 L0,6.5 Z" fill={SLATE_L} />
            </marker>
            <marker id="aarrl" markerWidth="7" markerHeight="7" refX="0.5" refY="3.5" orient="auto-start-reverse">
              <path d="M0,0.5 L6.5,3.5 L0,6.5 Z" fill={SLATE_L} />
            </marker>
          </defs>

          {/* ── Subtle background grid ── */}
          {[100, 130, 160, 190, 220, 250, 280, 310].map((y) => (
            <line key={y} x1="14" y1={y} x2="246" y2={y}
              stroke="#e8edf2" strokeWidth="0.6" strokeDasharray="3,5" />
          ))}

          {/* ── Stem body: shadow → main → teal overlay ── */}
          <motion.path
            d={path} fill="#94a3b8" opacity="0.10"
            transform="translate(4,5)"
            animate={{ d: path }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          <motion.path
            d={path}
            fill="url(#zsg)"
            stroke={SLATE_L} strokeWidth="1.6" strokeLinejoin="round"
            filter="url(#zshadow)"
            animate={{ d: path }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          <motion.path
            d={path} fill="url(#zteal)"
            animate={{ d: path }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />

          {/* Lateral metaphyseal fin */}
          <motion.path
            d={`M ${CX + pw} ${SY + 2} Q ${CX + pw + 13} ${SY + 44}, ${CX + pw + 4} ${SY + 92} L ${CX + pw} ${SY + 86} Z`}
            fill={TEAL} opacity="0.18"
            animate={{ d: `M ${CX + pw} ${SY + 2} Q ${CX + pw + 13} ${SY + 44}, ${CX + pw + 4} ${SY + 92} L ${CX + pw} ${SY + 86} Z` }}
            transition={{ duration: 0.4 }}
          />

          {/* Isthmus tick marks */}
          <motion.line
            x1={CX - iw - 6} y1={iy} x2={CX + iw + 6} y2={iy}
            stroke={TEAL} strokeWidth="1" strokeDasharray="2.5,2.5"
            animate={{ x1: CX - iw - 6, x2: CX + iw + 6, y1: iy, y2: iy }}
            transition={{ duration: 0.4 }}
          />

          {/* ── Neck ── */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            {/* Neck shadow */}
            <line x1={nx + 3} y1={ny + 4} x2={tx + 3} y2={hty + 4}
              stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" opacity="0.12" />
            {/* Neck body */}
            <line x1={nx} y1={ny} x2={tx} y2={hty}
              stroke={SLATE_L} strokeWidth="11.5" strokeLinecap="round" opacity="0.35" />
            <line x1={nx} y1={ny} x2={tx} y2={hty}
              stroke="url(#zneck)" strokeWidth="10" strokeLinecap="round" />
            {/* Neck highlight streak */}
            <line x1={nx} y1={ny} x2={tx} y2={hty}
              stroke={WHITE} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
          </motion.g>

          {/* ── Head ball ── */}
          <motion.g
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.32, delay: 0.14, type: "spring", stiffness: 280, damping: 20 }}
            style={{ transformOrigin: `${tx}px ${hty}px` }}
          >
            {/* Shadow */}
            <circle cx={tx + 2.5} cy={hty + 3} r={headR + 1} fill="#94a3b8" opacity="0.14" />
            {/* Body */}
            <circle cx={tx} cy={hty} r={headR}
              fill="url(#zhg)" stroke={SLATE_L} strokeWidth="1.6" />
            {/* Highlight spot */}
            <circle cx={tx - 4} cy={hty - 4.5} r={4.5}
              fill={WHITE} opacity="0.42" />
            {/* Teal ring */}
            <circle cx={tx} cy={hty} r={headR}
              fill="none" stroke={TEAL} strokeWidth="0.9" opacity="0.45" />
          </motion.g>

          {/* ══ Dimension A — stem size at isthmus ══ */}
          <line x1={CX - iw} y1={iy + 22} x2={CX + iw} y2={iy + 22}
            stroke={SLATE_L} strokeWidth="0.9"
            markerEnd="url(#aarr)" markerStart="url(#aarrl)" />
          <line x1={CX - iw} y1={iy} x2={CX - iw} y2={iy + 20}
            stroke={SLATE_L} strokeWidth="0.6" strokeDasharray="2,2" />
          <line x1={CX + iw} y1={iy} x2={CX + iw} y2={iy + 20}
            stroke={SLATE_L} strokeWidth="0.6" strokeDasharray="2,2" />
          <rect x={CX - 19} y={iy + 27} width="38" height="14" rx="4" fill={WHITE} fillOpacity="0.9" />
          <text x={CX} y={iy + 37.5} fontSize="8.5" textAnchor="middle" fontFamily="system-ui,sans-serif">
            <tspan fontWeight="800" fill={TEAL}>A </tspan>
            <tspan fontWeight="700" fill={TEAL_D}>{current.stemSizeMm}</tspan>
            <tspan fill={SLATE_L} fontSize="7.5"> mm</tspan>
          </text>

          {/* ══ Dimension B — stem length (right side) ══ */}
          {/* ref lines */}
          <line x1={CX + pw} y1={annTop} x2={annRight + 2} y2={annTop}
            stroke={SLATE_L} strokeWidth="0.6" strokeDasharray="2,2" />
          <line x1={CX + iw} y1={annBot} x2={annRight + 2} y2={annBot}
            stroke={SLATE_L} strokeWidth="0.6" strokeDasharray="2,2" />
          {/* arrow */}
          <line x1={annRight} y1={annTop} x2={annRight} y2={annBot}
            stroke={SLATE_L} strokeWidth="0.9"
            markerEnd="url(#aarr)" markerStart="url(#aarrl)" />
          {/* label box */}
          <rect x={annRight + 4} y={annMid - 11} width="42" height="22" rx="4" fill={WHITE} fillOpacity="0.92" />
          <text x={annRight + 7} y={annMid - 2} fontSize="8.5" fontFamily="system-ui,sans-serif">
            <tspan fontWeight="800" fill={TEAL}>B</tspan>
          </text>
          <text x={annRight + 17} y={annMid - 2} fontSize="8.5" fontWeight="700" fill={TEAL_D} fontFamily="system-ui,sans-serif">
            {current.stemLengthMm}
          </text>
          <text x={annRight + 7} y={annMid + 9} fontSize="7" fill={SLATE_L} fontFamily="system-ui,sans-serif">
            Length
          </text>

          {/* ══ Legend ══ */}
          <rect x="10" y="322" width="240" height="38" rx="10"
            fill={WHITE} fillOpacity="0.82" stroke="#e2e8f0" strokeWidth="0.8" />
          {[
            { k: "A", v: `${current.stemSizeMm} mm — Stem Size`,            x: 18,  y: 336 },
            { k: "B", v: `${current.stemLengthMm} mm — Stem Length`,         x: 18,  y: 350 },
            { k: "C", v: `${current.neckLengthMm ?? "—"} mm — Neck (${hn})`, x: 134, y: 336 },
            { k: "D", v: `${stemOffsetMm ?? "—"} mm — Offset (${hn})`,       x: 134, y: 350 },
          ].map(({ k, v, x, y }) => (
            <text key={k} x={x} y={y} fontSize="7.5" fontFamily="system-ui,sans-serif" fill={SLATE}>
              <tspan fontWeight="800" fill={TEAL}>{k} </tspan>
              {v}
            </text>
          ))}

          {/* Product No at bottom */}
          <text x="130" y="367" textAnchor="middle" fontSize="7" fill={SLATE_L} fontFamily="system-ui,sans-serif">
            {current.productNo}
            {current.haTcpProductNo ? `  ·  HA/TCP: ${current.haTcpProductNo}` : ""}
          </text>
        </svg>
      </motion.div>
    </AnimatePresence>
  );
}
