"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepId =
  | "exposure"
  | "distal_femur"
  | "tibial_resection"
  | "sizing_chamfer"
  | "trial_reduction"
  | "final_implant";

interface Step {
  id: StepId;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  lightColor: string;
  duration: number; // auto-play ms
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: "exposure",
    number: 1,
    title: "Surgical Exposure",
    subtitle: "Medial Parapatellar Approach",
    description:
      "Insisi medial parapatellar, eversion patella, ekspos sendi lutut. Identifikasi landmark anatomi femur distal dan tibial proximal.",
    color: "#6366f1",
    lightColor: "#e0e7ff",
    duration: 3500,
  },
  {
    id: "distal_femur",
    number: 2,
    title: "Distal Femoral Cut",
    subtitle: "Valgus 5–7° · Intramedullary Guide",
    description:
      "Reseksi distal femur menggunakan IM guide dengan valgus 5–7°. Pastikan potongan tegak lurus terhadap mechanical axis femur.",
    color: "#38bdf8",
    lightColor: "#e0f2fe",
    duration: 4000,
  },
  {
    id: "tibial_resection",
    number: 3,
    title: "Tibial Resection",
    subtitle: "Posterior Slope 3–7° · Extramedullary",
    description:
      "Reseksi tibial proximal dengan EM guide. Slope posterior 3–7°, tegak lurus mechanical axis tibia pada bidang coronal.",
    color: "#14b8a6",
    lightColor: "#ccfbf1",
    duration: 4000,
  },
  {
    id: "sizing_chamfer",
    number: 4,
    title: "Femoral Sizing & Chamfer Cuts",
    subtitle: "4-in-1 Cutting Block · 5 Potongan",
    description:
      "Sizing femur, tentukan rotasi (Whiteside line / TEA). Pasang 4-in-1 cutting block: anterior, posterior, chamfer anterior & posterior.",
    color: "#f97316",
    lightColor: "#ffedd5",
    duration: 4500,
  },
  {
    id: "trial_reduction",
    number: 5,
    title: "Trial Reduction",
    subtitle: "Gap Balancing · ROM Check",
    description:
      "Insert trial implant. Evaluasi flexion/extension gap, medial-lateral balance, ROM, dan stabilitas. Koreksi jika diperlukan.",
    color: "#a855f7",
    lightColor: "#f3e8ff",
    duration: 4000,
  },
  {
    id: "final_implant",
    number: 6,
    title: "Final Implant & Closure",
    subtitle: "Cemented / Cementless · Patella Resurfacing",
    description:
      "Sementasi atau press-fit implant definitif. Patella resurfacing jika diindikasikan. Irigasi, drain, closure berlapis.",
    color: "#22c55e",
    lightColor: "#dcfce7",
    duration: 4000,
  },
];

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function ExposureIllustration({ playing }: { playing: boolean }) {
  const W = 320, H = 260;
  const cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Skin layer */}
      <motion.rect x={cx - 80} y={20} width={160} height={220} rx={30}
        fill="#f9a8d4" opacity={0.18}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.5 }}
      />
      {/* Femur distal */}
      <motion.ellipse cx={cx} cy={130} rx={46} ry={30}
        fill="#cbd5e1" opacity={0.5}
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      />
      <motion.rect x={cx - 22} y={20} width={44} height={115} rx={10}
        fill="#94a3b8" opacity={0.35}
        initial={{ scaleY: 0, originY: "100%" }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      />
      {/* Tibia proximal */}
      <motion.rect x={cx - 30} y={162} width={60} height={80} rx={10}
        fill="#94a3b8" opacity={0.3}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      />
      <motion.ellipse cx={cx} cy={162} rx={44} ry={14}
        fill="#cbd5e1" opacity={0.45}
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      />
      {/* Patella */}
      <motion.ellipse cx={cx - 68} cy={148} rx={20} ry={14}
        fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.5} opacity={0.8}
        initial={{ x: 0, opacity: 0 }}
        animate={{ x: playing ? -18 : 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      />
      {/* Incision line */}
      {playing && (
        <motion.line x1={cx + 12} y1={40} x2={cx + 12} y2={235}
          stroke="#6366f1" strokeWidth={2.5}
          strokeDasharray="200" strokeDashoffset={200}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
      )}
      {/* Retractor hint */}
      {playing && (
        <>
          <motion.path d={`M${cx+12},90 Q${cx+60},130 ${cx+12},170`}
            fill="none" stroke="#6366f1" strokeWidth={2} opacity={0.6}
            strokeDasharray="120" strokeDashoffset={120}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          />
          <motion.path d={`M${cx+12},90 Q${cx-36},130 ${cx+12},170`}
            fill="none" stroke="#6366f1" strokeWidth={2} opacity={0.6}
            strokeDasharray="120" strokeDashoffset={120}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.5, delay: 0.85 }}
          />
        </>
      )}
      <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="#6366f1" fontWeight={700} opacity={0.7}>
        Medial Parapatellar
      </text>
    </svg>
  );
}

function DistalFemurIllustration({ playing }: { playing: boolean }) {
  const W = 320, H = 260;
  const cx = W / 2;
  const yCut = 148;
  const valgus = 6;
  const tan = Math.tan((valgus * Math.PI) / 180);
  const x1 = 40, x2 = W - 40;
  const cutY1 = yCut + tan * (cx - x1);
  const cutY2 = yCut - tan * (cx - x2);
  const cutLen = Math.hypot(x2 - x1, cutY2 - cutY1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Femur shaft */}
      <motion.rect x={cx - 22} y={15} width={44} height={yCut - 15} rx={10}
        fill="#38bdf8" opacity={0.15}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4 }}
      />
      {/* Condyles */}
      <motion.ellipse cx={cx - 25} cy={yCut + 22} rx={28} ry={20}
        fill="#38bdf8" opacity={0.18}
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />
      <motion.ellipse cx={cx + 25} cy={yCut + 22} rx={28} ry={20}
        fill="#38bdf8" opacity={0.18}
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      />
      {/* Bone outline */}
      <motion.path
        d={`M${cx-22},${yCut} Q${cx-50},${yCut+35} ${cx-25},${yCut+42} Q${cx},${yCut+50} ${cx+25},${yCut+42} Q${cx+50},${yCut+35} ${cx+22},${yCut} Z`}
        fill="#38bdf8" opacity={0.12}
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      />
      {/* Mechanical axis */}
      <motion.line x1={cx} y1={8} x2={cx} y2={H - 20}
        stroke="#38bdf8" strokeWidth={1.6} opacity={0.3}
        strokeDasharray="6 4"
        initial={{ opacity: 0 }} animate={{ opacity: 0.3 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      />
      <text x={cx + 5} y={22} fontSize={8} fill="#38bdf8" fontWeight={700} opacity={0.7}>MA</text>

      {/* IM Rod */}
      {playing && (
        <motion.rect x={cx - 4} y={15} width={8} height={yCut - 20} rx={3}
          fill="#0284c7" opacity={0.7}
          initial={{ scaleY: 0, originY: "bottom" }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        />
      )}

      {/* Valgus angle arc */}
      {playing && (
        <motion.path
          d={`M${cx},${yCut} L${cx},${yCut - 30} A30,30,0,0,1,${cx + 30 * Math.sin((valgus * Math.PI) / 180)},${yCut - 30 * Math.cos((valgus * Math.PI) / 180)}`}
          fill="none" stroke="#38bdf8" strokeWidth={1.5}
          strokeDasharray="80" strokeDashoffset={80}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        />
      )}
      <text x={cx + 26} y={yCut - 16} fontSize={10} fill="#38bdf8" fontWeight={800} opacity={playing ? 1 : 0}>{valgus}°</text>

      {/* Cut guide block */}
      {playing && (
        <motion.rect x={x1 - 4} y={Math.min(cutY1, cutY2) - 8} width={x2 - x1 + 8} height={16}
          rx={3}
          fill="#0ea5e9" opacity={0.15}
          stroke="#0ea5e9" strokeWidth={1}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0.25, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        />
      )}

      {/* Cut line */}
      {playing && (
        <motion.line x1={x1} y1={cutY1} x2={x2} y2={cutY2}
          stroke="#38bdf8" strokeWidth={3.5}
          strokeDasharray={`${cutLen}`} strokeDashoffset={cutLen}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
        />
      )}
      {/* Resected fragment */}
      {playing && (
        <motion.rect x={cx - 22} y={yCut - 10} width={44} height={18} rx={4}
          fill="#bae6fd" opacity={0}
          animate={{ opacity: [0, 0.5, 0], y: [0, 18, 32] }}
          transition={{ duration: 1.0, delay: 1.3, ease: "easeIn" }}
        />
      )}
      <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="#38bdf8" fontWeight={700} opacity={0.7}>
        Valgus {valgus}° · Intramedullary Guide
      </text>
    </svg>
  );
}

function TibialResectionIllustration({ playing }: { playing: boolean }) {
  const W = 320, H = 260;
  const cx = W / 2;
  const yCut = 110;
  const slope = 5;
  const tan = Math.tan((slope * Math.PI) / 180);
  const x1 = 40, x2 = W - 40;
  const cutY1 = yCut + tan * (cx - x1);
  const cutY2 = yCut - tan * (cx - x2);
  const cutLen = Math.hypot(x2 - x1, cutY2 - cutY1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Tibia shaft */}
      <motion.rect x={cx - 20} y={yCut + 14} width={40} height={H - yCut - 30} rx={8}
        fill="#14b8a6" opacity={0.15}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4 }}
      />
      {/* Tibial plateau */}
      <motion.ellipse cx={cx} cy={yCut} rx={52} ry={16}
        fill="#14b8a6" opacity={0.2}
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      />
      {/* EM rod (extramedullary) */}
      {playing && (
        <>
          <motion.line x1={cx} y1={yCut + 14} x2={cx} y2={H - 10}
            stroke="#0d9488" strokeWidth={5} opacity={0.7}
            strokeDasharray={`${H - yCut - 24}`} strokeDashoffset={H - yCut - 24}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
          <motion.line x1={cx - 50} y1={H - 10} x2={cx + 50} y2={H - 10}
            stroke="#0d9488" strokeWidth={4} opacity={0.6}
            strokeDasharray="100" strokeDashoffset={100}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
          />
        </>
      )}
      {/* Tibial axis */}
      <motion.line x1={cx} y1={8} x2={cx} y2={H - 8}
        stroke="#14b8a6" strokeWidth={1.5} opacity={0.25}
        strokeDasharray="6 4"
        initial={{ opacity: 0 }} animate={{ opacity: 0.25 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      />
      <text x={cx + 5} y={22} fontSize={8} fill="#14b8a6" fontWeight={700} opacity={0.6}>TA</text>
      {/* Ant/Post labels */}
      <text x={x1} y={H * 0.3} textAnchor="start" fontSize={9} fill="#14b8a6" opacity={0.6} fontWeight={600}>Ant</text>
      <text x={x2} y={H * 0.3} textAnchor="end" fontSize={9} fill="#14b8a6" opacity={0.6} fontWeight={600}>Post</text>

      {/* Slope arc */}
      {playing && (
        <motion.path
          d={`M${cx},${yCut} L${cx + 28},${yCut} A28,28,0,0,0,${cx + 28 * Math.cos((slope * Math.PI) / 180)},${yCut + 28 * Math.sin((slope * Math.PI) / 180)}`}
          fill="none" stroke="#14b8a6" strokeWidth={1.5}
          strokeDasharray="80" strokeDashoffset={80}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        />
      )}
      <text x={cx + 34} y={yCut + 20} fontSize={10} fill="#14b8a6" fontWeight={800} opacity={playing ? 1 : 0}>{slope}°</text>

      {/* Cut guide */}
      {playing && (
        <motion.rect x={x1 - 4} y={Math.min(cutY1, cutY2) - 8} width={x2 - x1 + 8} height={16}
          rx={3} fill="#0d9488" opacity={0.12} stroke="#0d9488" strokeWidth={1}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 0.2, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
        />
      )}
      {/* Cut line */}
      {playing && (
        <motion.line x1={x1} y1={cutY1} x2={x2} y2={cutY2}
          stroke="#14b8a6" strokeWidth={3.5}
          strokeDasharray={`${cutLen}`} strokeDashoffset={cutLen}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: "easeOut" }}
        />
      )}
      {/* Fragment falling */}
      {playing && (
        <motion.ellipse cx={cx} cy={yCut - 8} rx={52} ry={10}
          fill="#99f6e4" opacity={0}
          animate={{ opacity: [0, 0.5, 0], y: [0, 22, 40] }}
          transition={{ duration: 0.9, delay: 1.2, ease: "easeIn" }}
        />
      )}
      <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="#14b8a6" fontWeight={700} opacity={0.7}>
        Posterior Slope {slope}° · EM Guide
      </text>
    </svg>
  );
}

function SizingChamferIllustration({ playing }: { playing: boolean }) {
  const W = 320, H = 260;
  const cx = W / 2;
  const cy = 130;

  // Femoral component shape points (simplified)
  const fW = 88, fH = 70;
  const anteriorCut = cy - fH / 2 + 10;
  const posteriorCut = cy + fH / 2 - 10;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Femur outline */}
      <motion.path
        d={`M${cx - fW / 2},${cy - fH / 2} Q${cx},${cy - fH / 2 - 20} ${cx + fW / 2},${cy - fH / 2}
           L${cx + fW / 2},${cy + fH / 2}
           Q${cx + fW / 2 + 14},${cy + fH / 2 + 12} ${cx},${cy + fH / 2 + 18}
           Q${cx - fW / 2 - 14},${cy + fH / 2 + 12} ${cx - fW / 2},${cy + fH / 2} Z`}
        fill="#f97316" opacity={0.12}
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* 4-in-1 cutting block overlay */}
      {playing && (
        <motion.rect
          x={cx - fW / 2 - 10} y={anteriorCut - 8} width={fW + 20} height={posteriorCut - anteriorCut + 16}
          rx={6} fill="#f97316" opacity={0.1} stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 3"
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 0.18, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      )}

      {/* Cut lines with delays */}
      {playing && [
        // Anterior cut
        { x1: cx - fW / 2, y1: anteriorCut, x2: cx + fW / 2, y2: anteriorCut, label: "Ant", delay: 0.3 },
        // Posterior cut
        { x1: cx - fW / 2, y1: posteriorCut, x2: cx + fW / 2, y2: posteriorCut, label: "Post", delay: 0.55 },
        // Ant chamfer
        { x1: cx - fW / 2, y1: anteriorCut, x2: cx - fW / 2 - 18, y2: anteriorCut + 26, label: "", delay: 0.75 },
        { x1: cx + fW / 2, y1: anteriorCut, x2: cx + fW / 2 + 18, y2: anteriorCut + 26, label: "", delay: 0.75 },
        // Post chamfer
        { x1: cx - fW / 2, y1: posteriorCut, x2: cx - fW / 2 - 18, y2: posteriorCut - 26, label: "", delay: 0.9 },
        { x1: cx + fW / 2, y1: posteriorCut, x2: cx + fW / 2 + 18, y2: posteriorCut - 26, label: "", delay: 0.9 },
      ].map((c, i) => {
        const len = Math.hypot(c.x2 - c.x1, c.y2 - c.y1);
        return (
          <motion.line key={i}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="#f97316" strokeWidth={i < 2 ? 3 : 2.5}
            strokeDasharray={`${len}`} strokeDashoffset={len}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.45, delay: c.delay, ease: "easeOut" }}
          />
        );
      })}

      {/* Rotation axis (Whiteside line) */}
      {playing && (
        <motion.line x1={cx} y1={anteriorCut - 10} x2={cx} y2={posteriorCut + 10}
          stroke="#fb923c" strokeWidth={2} opacity={0.7} strokeDasharray="6 3"
          initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
      )}
      {playing && (
        <text x={cx + 6} y={cy + 4} fontSize={8} fill="#fb923c" fontWeight={700} opacity={0.8}>WL</text>
      )}

      {/* Labels */}
      {playing && (
        <>
          <text x={cx + fW / 2 + 8} y={anteriorCut + 4} fontSize={8} fill="#f97316" fontWeight={700} opacity={0.8}>Ant</text>
          <text x={cx + fW / 2 + 8} y={posteriorCut + 4} fontSize={8} fill="#f97316" fontWeight={700} opacity={0.8}>Post</text>
        </>
      )}

      <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="#f97316" fontWeight={700} opacity={0.7}>
        4-in-1 Block · 5 Potongan
      </text>
    </svg>
  );
}

function TrialReductionIllustration({ playing }: { playing: boolean }) {
  const W = 320, H = 260;
  const cx = W / 2;
  const femurY = 110;
  const tibiaY = 172;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Femoral component (trial) */}
      <motion.path
        d={`M${cx - 46},${femurY} Q${cx - 46},${femurY - 28} ${cx - 26},${femurY - 34}
           L${cx + 26},${femurY - 34} Q${cx + 46},${femurY - 28} ${cx + 46},${femurY}
           Q${cx + 46},${femurY + 22} ${cx + 26},${femurY + 26}
           Q${cx},${femurY + 32} ${cx - 26},${femurY + 26}
           Q${cx - 46},${femurY + 22} ${cx - 46},${femurY} Z`}
        fill="#a855f7" opacity={0}
        animate={playing ? { opacity: 0.22, y: 0 } : { opacity: 0 }}
        initial={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      />
      {/* Poly insert */}
      <motion.rect x={cx - 40} y={tibiaY - 14} width={80} height={14} rx={4}
        fill="#c4b5fd" opacity={0}
        animate={playing ? { opacity: 0.4, y: 0 } : { opacity: 0 }}
        initial={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
      />
      {/* Tibial baseplate */}
      <motion.rect x={cx - 50} y={tibiaY} width={100} height={14} rx={4}
        fill="#a855f7" opacity={0}
        animate={playing ? { opacity: 0.3, y: 0 } : { opacity: 0 }}
        initial={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      />
      {/* Tibia shaft */}
      <motion.rect x={cx - 22} y={tibiaY + 14} width={44} height={80} rx={8}
        fill="#a855f7" opacity={0.1}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4 }}
      />
      {/* Femur shaft */}
      <motion.rect x={cx - 22} y={20} width={44} height={femurY - 34 - 20} rx={8}
        fill="#a855f7" opacity={0.1}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      />

      {/* Gap measurement arrows */}
      {playing && (
        <>
          <motion.line x1={cx + 58} y1={femurY + 26} x2={cx + 58} y2={tibiaY}
            stroke="#a855f7" strokeWidth={1.8} strokeDasharray="46" strokeDashoffset={46}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.4, delay: 0.85 }}
          />
          <motion.line x1={cx + 52} y1={femurY + 26} x2={cx + 64} y2={femurY + 26}
            stroke="#a855f7" strokeWidth={1.8}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          />
          <motion.line x1={cx + 52} y1={tibiaY} x2={cx + 64} y2={tibiaY}
            stroke="#a855f7" strokeWidth={1.8}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          />
          <text x={cx + 68} y={(femurY + 26 + tibiaY) / 2 + 4} fontSize={9} fill="#a855f7" fontWeight={800}>Gap</text>
        </>
      )}

      {/* ROM arc hint */}
      {playing && (
        <motion.path
          d={`M${cx - 80},${femurY + 10} A80,80,0,0,1,${cx + 80},${femurY + 10}`}
          fill="none" stroke="#a855f7" strokeWidth={1.4} opacity={0.3}
          strokeDasharray="160" strokeDashoffset={160}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
        />
      )}
      {playing && <text x={cx} y={femurY - 45} textAnchor="middle" fontSize={8} fill="#a855f7" opacity={0.5} fontWeight={600}>ROM</text>}

      <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="#a855f7" fontWeight={700} opacity={0.7}>
        Gap Balancing · ROM Check
      </text>
    </svg>
  );
}

function FinalImplantIllustration({ playing }: { playing: boolean }) {
  const W = 320, H = 260;
  const cx = W / 2;
  const femurY = 108;
  const tibiaY = 170;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Femur shaft */}
      <motion.rect x={cx - 22} y={20} width={44} height={femurY - 32 - 20} rx={8}
        fill="#22c55e" opacity={0.12}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4 }}
      />
      {/* Tibia shaft */}
      <motion.rect x={cx - 22} y={tibiaY + 14} width={44} height={76} rx={8}
        fill="#22c55e" opacity={0.12}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      />

      {/* Cement layer femur */}
      {playing && (
        <motion.path
          d={`M${cx - 48},${femurY + 4} Q${cx},${femurY + 36} ${cx + 48},${femurY + 4}`}
          fill="none" stroke="#86efac" strokeWidth={5} opacity={0}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        />
      )}
      {/* Femoral component FINAL */}
      <motion.path
        d={`M${cx - 46},${femurY} Q${cx - 46},${femurY - 28} ${cx - 26},${femurY - 32}
           L${cx + 26},${femurY - 32} Q${cx + 46},${femurY - 28} ${cx + 46},${femurY}
           Q${cx + 46},${femurY + 20} ${cx + 26},${femurY + 24}
           Q${cx},${femurY + 30} ${cx - 26},${femurY + 24}
           Q${cx - 46},${femurY + 20} ${cx - 46},${femurY} Z`}
        fill="#22c55e"
        stroke="#16a34a" strokeWidth={1.5}
        opacity={0}
        animate={playing ? { opacity: 0.6 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      />
      {/* Poly insert FINAL */}
      <motion.rect x={cx - 42} y={tibiaY - 16} width={84} height={16} rx={4}
        fill="#86efac" stroke="#22c55e" strokeWidth={1.2}
        opacity={0}
        animate={playing ? { opacity: 0.8 } : { opacity: 0 }}
        transition={{ duration: 0.45, delay: 0.6, ease: "easeOut" }}
      />
      {/* Tibial baseplate FINAL */}
      <motion.rect x={cx - 52} y={tibiaY} width={104} height={14} rx={4}
        fill="#22c55e" stroke="#16a34a" strokeWidth={1.5}
        opacity={0}
        animate={playing ? { opacity: 0.65 } : { opacity: 0 }}
        transition={{ duration: 0.45, delay: 0.45, ease: "easeOut" }}
      />
      {/* Tibial stem / peg */}
      {playing && (
        <motion.rect x={cx - 6} y={tibiaY + 14} width={12} height={40} rx={4}
          fill="#16a34a" opacity={0}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        />
      )}

      {/* Patella resurfacing */}
      {playing && (
        <motion.ellipse cx={cx - 76} cy={tibiaY - 30} rx={16} ry={10}
          fill="#22c55e" stroke="#16a34a" strokeWidth={1.2}
          opacity={0}
          animate={{ opacity: 0.55, x: 0 }}
          transition={{ duration: 0.45, delay: 0.8 }}
        />
      )}
      {playing && <text x={cx - 76} y={tibiaY - 44} textAnchor="middle" fontSize={7} fill="#22c55e" opacity={0.7} fontWeight={700}>Pat.</text>}

      {/* Check mark / complete indicator */}
      {playing && (
        <motion.path
          d={`M${cx + 72},${femurY} L${cx + 82},${femurY + 12} L${cx + 100},${femurY - 10}`}
          fill="none" stroke="#22c55e" strokeWidth={3} strokeLinecap="round"
          strokeDasharray="40" strokeDashoffset={40}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.45, delay: 1.1 }}
        />
      )}

      <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="#22c55e" fontWeight={700} opacity={0.7}>
        Implant Definitif · Sementasi
      </text>
    </svg>
  );
}

// ─── Intraoperative Problems Data ────────────────────────────────────────────

type IntraStepId = "exposure" | "distal_femur" | "tibial_resection" | "sizing_chamfer" | "trial_reduction" | "final_implant";

interface IntraRef {
  authors: string;
  year: number;
  title: string;
  journal: string;
  url: string;
  note?: string;
}

interface IntraProblem {
  id: string;
  stepId: IntraStepId;
  title: string;
  subtitle: string;
  color: string;
  lightColor: string;
  incidence: string;
  urgency: "immediate" | "urgent" | "elective";
  description: string;
  prevention: string[];
  management: { action: string; detail: string }[];
  references: IntraRef[];
}

const URGENCY_LABEL: Record<IntraProblem["urgency"], string> = {
  immediate: "Segera",
  urgent: "Mendesak",
  elective: "Terencana",
};
const URGENCY_COLOR: Record<IntraProblem["urgency"], string> = {
  immediate: "#ef4444",
  urgent: "#f97316",
  elective: "#22c55e",
};

const INTRA_PROBLEMS: IntraProblem[] = [
  // ── EXPOSURE ──
  {
    id: "mcl_tear",
    stepId: "exposure",
    title: "Robekan MCL Intraoperatif",
    subtitle: "Iatrogenic MCL Injury",
    color: "#6366f1",
    lightColor: "#e0e7ff",
    incidence: "~0.5–2.7%",
    urgency: "urgent",
    description:
      "Cedera MCL saat medial soft-tissue release untuk koreksi deformitas varus. Bisa berupa transeksi parsial/total atau avulsi dari tibial metaphysis.",
    prevention: [
      "Gunakan electrocautery, bukan pisau tajam, untuk medial release",
      "Release bertahap layer-by-layer, mulai periosteum tibia medial",
      "Hindari traksi berlebihan saat eversion patela",
      "Pertimbangkan posterior capsule release sebelum medial release paksa",
    ],
    management: [
      { action: "Avulsi proksimal / mid-substance parsial", detail: "Primary repair langsung dengan suture anchor (#2 non-absorbable) + internal suture brace augmentation (ISBA). Tekuk lutut 30–40° saat repair." },
      { action: "Transeksi total / tidak dapat diperbaiki", detail: "Upgrade ke Constrained Condylar Knee (CCK) atau Rotating Hinge. Jangan pertahankan CR/PS standar — risiko revisi 4/7 pasien tanpa constraint." },
      { action: "Avulsi distal dari tibia", detail: "Reattach dengan suture anchor di tibial cortex + staple augmentasi. Post-op: brace valgus 6 minggu, WB partial." },
      { action: "Konfirmasi stabilitas intraop", detail: "Stress test valgus di 0° dan 30° fleksi setelah repair. Jika gap > 5 mm → upgrade constraint." },
    ],
    references: [
      {
        authors: "Leopold SS, et al.",
        year: 2001,
        title: "Management of Intraoperative Medial Collateral Ligament Injury During TKA",
        journal: "PMC / Clinical Orthopaedics and Related Research",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3008909/",
        note: "4/7 pasien tanpa constraint tambahan → revisi untuk instabilitas",
      },
      {
        authors: "Yıldız F, et al.",
        year: 2024,
        title: "Evaluating the optimal management strategy for intraoperative iatrogenic MCL injury during primary TKA: A systematic review",
        journal: "ScienceDirect / The Knee",
        url: "https://www.sciencedirect.com/science/article/abs/pii/S0968016024000383",
        note: "ISBA memberikan stabilitas medial penuh pada follow-up 12–34.5 bulan",
      },
      {
        authors: "Ponzio DY, et al.",
        year: 2025,
        title: "How to Manage Intraoperative Complications During Primary Total Knee Arthroplasty",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(25)00513-3/abstract",
        note: "Algoritma komprehensif penanganan komplikasi intraoperatif TKA",
      },
    ],
  },
  {
    id: "peroneal_nerve",
    stepId: "exposure",
    title: "Cedera Saraf Peroneal",
    subtitle: "Peroneal Nerve Palsy — Valgus Cases",
    color: "#8b5cf6",
    lightColor: "#ede9fe",
    incidence: "1–10% (valgus berat)",
    urgency: "immediate",
    description:
      "Neuropraxia traksi N. peroneal communis saat koreksi deformitas valgus berat atau eksternal rotation. Manifestasi: foot drop, parestesia dorsum pedis.",
    prevention: [
      "Identifikasi dan proteksi N. peroneal sebelum koreksi valgus",
      "Hindari traksi hip + knee extension simultan",
      "Release lateral bertahap: ITB → LCL → posterior capsule",
      "Pertimbangkan profilaktik peroneal nerve release pada valgus > 20°",
    ],
    management: [
      { action: "Deteksi intraoperatif", detail: "Segera fleksikan lutut 20–30°, kendurkan tourniquet, hindari semua traksi. Cek respons saraf." },
      { action: "Post-op foot drop", detail: "AFO (Ankle-Foot Orthosis), fisioterapi segera. Observasi 3–6 bulan untuk neuropraxia." },
      { action: "Tidak ada recovery 3–6 bulan", detail: "EMG/NCS untuk konfirmasi lokasi lesi. Pertimbangkan eksplorasi bedah + neurolisis jika ada kompresi hematoma." },
      { action: "Monitoring wajib", detail: "Cek sensasi + motor tiap 2 jam dalam 24 jam pertama post-op." },
    ],
    references: [
      {
        authors: "Ponzio DY, et al.",
        year: 2025,
        title: "How to Manage Intraoperative Complications During Primary Total Knee Arthroplasty",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(25)00513-3/abstract",
        note: "Peroneal nerve injury: insidensi 1–10% pada valgus; manajemen traksi",
      },
      {
        authors: "Meftah M, et al.",
        year: 2022,
        title: "Complications after Total Knee Arthroplasty: Stiffness, PJI, and Periprosthetic Fracture",
        journal: "IntechOpen",
        url: "https://www.intechopen.com/chapters/82864",
        note: "Neurovaskular complications post-TKA: insidensi dan outcome",
      },
    ],
  },
  // ── DISTAL FEMUR ──
  {
    id: "femoral_notching",
    stepId: "distal_femur",
    title: "Anterior Femoral Notching",
    subtitle: "Cortical Notch saat Anterior Cut",
    color: "#38bdf8",
    lightColor: "#e0f2fe",
    incidence: "8–31% (subklinis)",
    urgency: "elective",
    description:
      "Terjadinya takik (notch) pada korteks anterior femur saat anterior chamfer cut, akibat cutting block terlalu anterior. Meningkatkan risiko fraktur suprakondiler periprostetik di kemudian hari.",
    prevention: [
      "Pastikan cutting block anterior rata dengan korteks anterior femur (no overhang)",
      "Gunakan sizing guide yang tepat — jangan undersize femoral component",
      "Cek dengan jari atau probe di anterior korteks sebelum cutting",
      "Pertimbangkan 1–2° lebih fleksi pada femoral component untuk hindari notching",
    ],
    management: [
      { action: "Notch terdeteksi intraoperatif", detail: "Dokumentasi lokasi dan kedalaman notch. Jika > 3 mm atau > 30% korteks → pertimbangkan bone graft / cerclage wiring profilaksis." },
      { action: "Notch < 3 mm, korteks intak", detail: "Lanjutkan operasi standar. Restriksi WB penuh 6 minggu post-op. Follow-up X-ray 6 minggu." },
      { action: "Pilihan komponen sizing", detail: "Up-size 1 nomor femoral component untuk tutup notch jika masih dalam tahap sizing, atau gunakan augment anterior." },
      { action: "Post-op surveillance", detail: "Waspada nyeri tiba-tiba di anterior femur → X-ray dan CT emergent untuk singkirkan stress fracture." },
    ],
    references: [
      {
        authors: "Ponzio DY, et al.",
        year: 2025,
        title: "How to Manage Intraoperative Complications During Primary Total Knee Arthroplasty",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(25)00513-3/abstract",
        note: "Anterior notching: insidensi, risiko fraktur suprakondiler, manajemen",
      },
      {
        authors: "Meftah M, et al.",
        year: 2022,
        title: "Complications after Total Knee Arthroplasty",
        journal: "IntechOpen",
        url: "https://www.intechopen.com/chapters/82864",
        note: "Notching sebagai risk factor periprosthetic fracture post-TKA",
      },
    ],
  },
  // ── TIBIAL RESECTION ──
  {
    id: "tibial_fracture",
    stepId: "tibial_resection",
    title: "Fraktur Intraoperatif Tibia",
    subtitle: "Plateau / Shaft Fracture saat Reseksi",
    color: "#14b8a6",
    lightColor: "#ccfbf1",
    incidence: "~0.1–0.4%",
    urgency: "immediate",
    description:
      "Fraktur tibial plateau atau shaft selama reseksi atau impaksi komponen. Umumnya terjadi pada tulang osteoporosis, post-trauma, atau saat EM guide terlalu agresif.",
    prevention: [
      "Pre-op: identifikasi osteoporosis, pertimbangkan stemmed tibial component",
      "Gunakan oscillating saw dengan kecepatan rendah, kedalaman terkontrol",
      "Hindari impaksi berlebihan saat trial reduction",
      "Pertimbangkan stemmed tibial basplate sejak awal pada osteoporosis berat",
    ],
    management: [
      { action: "Fraktur non-displaced, implant stabil", detail: "Fiksasi dengan 2–4 cancellous screw + washer (lag technique) di luar zona tibial baseplate. Lanjutkan pemasangan komponen dengan stemmed tibial baseplate." },
      { action: "Fraktur displaced / tidak stabil", detail: "ORIF dengan LISS plate lateral tibia + stemmed tibial component. Pertimbangkan intramedullary nail bila stem cukup." },
      { action: "Fraktur shaft saat broaching", detail: "Cerclage wiring 2 level + stem bypass fraktur minimum 2 diameter korteks. NWB 6–12 minggu." },
      { action: "Bone graft", detail: "Defek > 5 mm setelah fraktur: cancellous autograft dari resektat distal femur, kemas + impaksi." },
    ],
    references: [
      {
        authors: "Berend ME, et al.",
        year: 2021,
        title: "Intraoperative Tibia Fractures During Primary Total Knee Arthroplasty",
        journal: "PMC / The Journal of Arthroplasty",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8424607/",
        note: "Insidensi 0.1–0.4%; cancellous screw + stemmed TKA sebagai gold standard",
      },
      {
        authors: "Wu M, et al.",
        year: 2024,
        title: "Comparison of locking plate versus cancellous screw in structural autologous bone grafting during TKA for medial tibial bone defects",
        journal: "PMC / Knee Surgery",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12883814/",
        note: "Teknik bone graft + fiksasi untuk defek tibial intraoperatif",
      },
    ],
  },
  {
    id: "popliteal_injury",
    stepId: "tibial_resection",
    title: "Cedera A. Poplitea",
    subtitle: "Vascular Injury saat Posterior Release",
    color: "#ef4444",
    lightColor: "#fee2e2",
    incidence: "< 0.1% (limb-threatening)",
    urgency: "immediate",
    description:
      "Cedera arteri poplitea saat posterior capsule release atau reseksi tibial posterior. Komplikasi paling mengancam jiwa pada TKA — membutuhkan penanganan < 6 jam untuk selamatkan tungkai.",
    prevention: [
      "Posisikan retractor posterior tepat di posterior kapsul, bukan posterior arteri",
      "Gunakan curved osteotome atau pisau #15, bukan electrocautery di posterior",
      "Hindari knee hyperextension saat posterior release",
      "Cek pulse distal sebelum dan sesudah tourniquet release",
    ],
    management: [
      { action: "Deteksi intraoperatif (perdarahan masif)", detail: "Kompresi manual segera. Panggil bedah vaskular STAT. Jangan lepas tourniquet sebelum vascular surgery hadir." },
      { action: "Vascular repair prioritas", detail: "Vena saphena reverse graft atau PTFE interposition graft oleh bedah vaskular. Target revaskularisasi < 6 jam dari iskemia." },
      { action: "Selama menunggu vaskular", detail: "Pertahankan tourniquet proximal. Fasiotomi profilaktik bila iskemia > 4 jam. Imobilisasi ekstremitas." },
      { action: "Post-repair", detail: "ICU monitoring, doppler serial, fasciotomy wound management. TKA bisa dilanjutkan dalam stage terpisah setelah vaskular stabil." },
    ],
    references: [
      {
        authors: "Ponzio DY, et al.",
        year: 2025,
        title: "How to Manage Intraoperative Complications During Primary Total Knee Arthroplasty",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(25)00513-3/abstract",
        note: "Popliteal artery injury < 0.1%; revaskularisasi < 6 jam kritis",
      },
      {
        authors: "Meftah M, et al.",
        year: 2022,
        title: "Complications after Total Knee Arthroplasty",
        journal: "IntechOpen",
        url: "https://www.intechopen.com/chapters/82864",
        note: "Vascular complications TKA: presentasi, diagnosis, penanganan",
      },
    ],
  },
  // ── SIZING & CHAMFER ──
  {
    id: "sizing_rotation_error",
    stepId: "sizing_chamfer",
    title: "Error Rotasi Femoral Component",
    subtitle: "Internal Rotation > 3° → Patella Maltrack",
    color: "#f97316",
    lightColor: "#ffedd5",
    incidence: "~5–10% kasus patella maltrack",
    urgency: "urgent",
    description:
      "Femoral component terpasang dalam internal rotasi berlebihan (> 3°). Menyebabkan maltracking patela, anterior knee pain, dan instabilitas fleksi lateral.",
    prevention: [
      "Gunakan 3 referensi sekaligus: posterior condylar axis (PCA), Whiteside line, TEA",
      "Hindari PCA tunggal pada valgus knee — posterior lateral condyle sering hypoplastic",
      "Konfirmasi rotasi dengan probe di sulkus trochlear sebelum cutting",
      "Navigasi / robotic-assisted untuk presisi rotasi ± 1°",
    ],
    management: [
      { action: "Deteksi saat trial reduction", detail: "Lakukan 'no thumb test': jika patela maltrack tanpa ibu jari → internal rotasi. Lepas cutting block, koreksi rotasi sebelum chamfer cut dilakukan." },
      { action: "Setelah chamfer cut selesai", detail: "Lateral retinacular release sebagai bridging. Jika maltrack berat → pertimbangkan re-cut femur dengan koreksi rotasi (membuang lebih banyak bone posterior lateral)." },
      { action: "Teknik referensi rotasi TEA", detail: "Transepicondylar axis paling reproducible. Tandai medial epicondyle sulkus + lateral epicondyle prominens. External rotasi 3° dari PCA." },
      { action: "Konfirmasi Final", detail: "No-thumb patella tracking test setelah semua komponen terpasang. Lateral tilt > 5° → tambah release atau rekonsiderasi." },
    ],
    references: [
      {
        authors: "Matsuda S, et al.",
        year: 2016,
        title: "Rotational alignment of the femoral component in total knee arthroplasty",
        journal: "PMC / Bone & Joint Journal",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4716940/",
        note: "TEA sebagai referensi rotasi paling akurat; ER 3° dari PCA",
      },
      {
        authors: "Banerjee S, et al.",
        year: 2014,
        title: "Patellar malalignment treatment in total knee arthroplasty",
        journal: "PMC / EFORT Open Reviews",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4295689/",
        note: "No-thumb test; lateral release indikasi dan teknik",
      },
    ],
  },
  {
    id: "bone_defect",
    stepId: "sizing_chamfer",
    title: "Bone Defect Tak Terduga",
    subtitle: "Defek Koronal / Kavitas saat Preparasi",
    color: "#eab308",
    lightColor: "#fef9c3",
    incidence: "~5–15% kasus TKA",
    urgency: "urgent",
    description:
      "Ditemukan defek tulang (kavitas, osteolisis, atau bone loss dari deformitas) yang tidak terdeteksi pada pre-op templating. Membutuhkan keputusan cepat intraoperatif.",
    prevention: [
      "Pre-op CT scan pada kasus dengan deformitas berat atau riwayat fraktur",
      "Templating digital yang cermat untuk estimasi bone loss",
      "Siapkan bone graft, screw, dan augment sebelum operasi pada kasus berisiko",
    ],
    management: [
      { action: "Defek < 5 mm (contained)", detail: "Cement fill langsung — teknik impaksi semen ke dalam defek + pemasangan baseplate. Hasil comparable dengan augment pada defek kecil." },
      { action: "Defek 5–15 mm (uncontained, < 50% condyle)", detail: "Cancellous screw + cement morselized autograft dari resektat tulang (distal femur / tibial plateau). Atau modular metal augment 5–10 mm." },
      { action: "Defek > 15 mm / > 50% condyle (AORI Grade II–III)", detail: "Structural allograft + stemmed component, atau modular augment wedge + offset stem. Pertimbangkan CCK jika instabilitas ligamen menyertai." },
      { action: "Klasifikasi AORI intraop", detail: "AORI Type 1 → cement/screw. Type 2A → augment. Type 2B/3 → allograft + revision component." },
    ],
    references: [
      {
        authors: "Wu M, et al.",
        year: 2024,
        title: "Locking plate vs cancellous screw in bone grafting for medial tibial bone defects during TKA",
        journal: "PMC / Knee Surgery",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12883814/",
        note: "Bone graft teknik dan fiksasi untuk defek tibial intraoperatif",
      },
      {
        authors: "Ponzio DY, et al.",
        year: 2025,
        title: "How to Manage Intraoperative Complications During Primary TKA",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(25)00513-3/abstract",
        note: "Algoritma bone defect management: cement, screw, augment, allograft",
      },
    ],
  },
  // ── TRIAL REDUCTION ──
  {
    id: "gap_imbalance_intra",
    stepId: "trial_reduction",
    title: "Gap Imbalance saat Trial",
    subtitle: "Flexion / Extension Gap Mismatch",
    color: "#a855f7",
    lightColor: "#f3e8ff",
    incidence: "~10–20% intraoperatif",
    urgency: "urgent",
    description:
      "Terdeteksi saat trial reduction: fleksi gap ≠ ekstensi gap, atau gap asimetris medial-lateral. Harus diselesaikan sebelum pemasangan implant definitif.",
    prevention: [
      "Lakukan gap measurement sistematis dengan spacer block / tensor sebelum sizing",
      "Rencanakan slope tibial dan reseksi distal femur berdasarkan gap measurement",
      "Gunakan navigation atau sensor-assisted balancing untuk presisi",
    ],
    management: [
      { action: "Fleksi gap > ekstensi gap", detail: "Kurangi tibial slope (recut tibia lebih tegak lurus) ATAU up-size femoral component (+1 ukuran) untuk isi flexion gap. Atau tambah distal femoral resection." },
      { action: "Ekstensi gap > fleksi gap", detail: "Tambah distal femoral resection (distal augment removal) ATAU gunakan poly yang lebih tebal untuk ekstensi. Hindari recut tibia lebih dalam." },
      { action: "Gap asimetris (medial > lateral atau sebaliknya)", detail: "Cek rotasi femoral component — sering penyebabnya. Koreksi rotasi sebelum re-trial. Atau selective ligament release sisi yang ketat." },
      { action: "Konfirmasi balance", detail: "Spacer block fleksi = ekstensi ± 2 mm. Stress test MCL/LCL di 0° dan 30°. Sensor tibial (Verasense) jika tersedia." },
    ],
    references: [
      {
        authors: "Vigdorchik JM, et al.",
        year: 2025,
        title: "Why Are Primary Total Knee Arthroplasties Failing? Systematic Review and Meta-Analysis",
        journal: "The Journal of Arthroplasty",
        url: "https://www.arthroplastyjournal.org/article/S0883-5403(25)00509-1/abstract",
        note: "Gap imbalance sebagai kontributor utama kegagalan TKA; koreksi intraop kritis",
      },
      {
        authors: "Abdel MP, et al.",
        year: 2014,
        title: "Current Modes of Failure in TKA: Infection, Instability, and Stiffness Predominate",
        journal: "PMC / Clinical Orthopaedics",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4048402/",
        note: "Gap imbalance → instabilitas dan stiffness post-TKA",
      },
    ],
  },
  {
    id: "patella_maltrack_intra",
    stepId: "trial_reduction",
    title: "Maltracking Patela Intraoperatif",
    subtitle: "No-Thumb Test Positif",
    color: "#ec4899",
    lightColor: "#fce7f3",
    incidence: "~1–10%",
    urgency: "urgent",
    description:
      "Patela terdeteksi lateral tilt / subluksasi saat 'no-thumb test'. Penyebab: rotasi femoral internal, tibial component terlalu lateral, atau insufisiensi soft-tissue medial.",
    prevention: [
      "Konfirmasi rotasi femoral sebelum chamfer cut (TEA + Whiteside)",
      "Tibial component: pasang sejajar tibial tuberosity, bukan rotasi internal",
      "Patellar resection: tegak lurus, kedalaman seimbang medial-lateral",
    ],
    management: [
      { action: "Step 1: Koreksi komponen", detail: "Evaluasi rotasi femoral dan tibial. Jika femoral internal rotasi → koreksi sebelum implant definitif. Ini adalah penyebab paling sering." },
      { action: "Step 2: Lateral retinacular release", detail: "Release capsule lateral dari luar (outside-in) atau dalam (inside-out). Preservasi lateral geniculate superior artery jika memungkinkan." },
      { action: "Step 3: Medial reefing", detail: "Jika release lateral saja tidak cukup → plikasi retinakulum medial (medial reefing) dengan suture nonabsorbable." },
      { action: "Step 4: Tibial tubercle medialisasi", detail: "Jika TT-TG > 20 mm dan seluruh langkah di atas gagal → tibial tubercle medialization osteotomy intraop." },
    ],
    references: [
      {
        authors: "Tsukada S, et al.",
        year: 2024,
        title: "Internal rotational patellar resection and patella alta induced patellar maltracking in TKA: intraoperative measurement of patellofemoral pressure",
        journal: "PMC / Knee Surgery Sports Traumatology",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11342663/",
        note: "Patellofemoral pressure intraop; lateral release efektivitas",
      },
      {
        authors: "Banerjee S, et al.",
        year: 2014,
        title: "Patellar malalignment treatment in total knee arthroplasty",
        journal: "PMC / EFORT Open Reviews",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4295689/",
        note: "Algoritma no-thumb test → lateral release → medialisasi tibial tubercle",
      },
    ],
  },
];

// ─── Anatomical SVG base shapes ──────────────────────────────────────────────

// Bone / cartilage colors
const BF = "#f2e8d2";   // bone fill
const BS = "#c4a56a";   // bone stroke
const CS = "#7ecfe0";   // cartilage color

// ── AP view paths (viewBox 0 0 220 205) ──────────────────────────────────────

// Distal femur: two condyles, intercondylar notch, shaft
const FEMUR_AP =
  "M 96,0 L 96,44 C 90,56 76,66 64,78 C 52,88 48,102 52,116 " +
  "C 56,128 70,134 84,130 C 94,126 100,120 104,114 " +
  "Q 107,110 110,109 Q 113,110 116,114 " +
  "C 120,120 126,126 136,130 C 150,134 164,128 168,116 " +
  "C 172,102 168,88 156,78 C 144,66 130,56 124,44 L 124,0 Z";

// Proximal tibia: tibial spines, plateau, shaft
const TIBIA_AP =
  "M 56,142 C 50,140 50,134 54,130 C 58,124 68,120 80,120 L 100,120 " +
  "C 104,116 107,112 110,111 C 113,112 116,116 120,120 L 140,120 " +
  "C 152,120 162,124 166,130 C 170,134 170,140 164,142 " +
  "C 158,150 148,154 132,156 L 120,158 L 120,202 L 100,202 L 100,158 " +
  "L 88,156 C 72,154 62,150 56,142 Z";

// Fibula (AP view, lateral to tibia)
const FIBULA_AP =
  "M 178,124 C 174,118 178,114 184,116 C 190,118 192,124 188,128 " +
  "C 187,134 185,142 183,158 C 181,170 180,180 181,202 " +
  "L 177,202 C 177,180 175,170 173,158 C 170,142 169,134 170,128 " +
  "C 170,122 174,118 178,124 Z";

// Patella (AP view)
const PATELLA_AP =
  "M 90,72 C 86,62 90,50 100,46 C 110,42 120,48 122,60 " +
  "C 124,72 118,82 108,84 C 98,86 92,82 90,72 Z";

// ── Lateral view paths (viewBox 0 0 220 205, posterior=RIGHT) ────────────────

// Distal femur lateral: large condyle + shaft
const FEMUR_LAT =
  "M 108,5 C 108,22 103,42 98,55 C 93,68 84,80 80,96 " +
  "C 76,112 80,132 92,144 C 104,156 122,162 140,158 " +
  "C 158,154 170,140 172,122 C 174,104 166,86 156,74 " +
  "C 148,64 148,48 150,28 L 150,5 Z";

// Proximal tibia lateral
const TIBIA_LAT =
  "M 72,170 C 68,166 70,160 76,156 C 82,150 96,148 108,148 " +
  "C 110,142 113,141 116,148 C 128,148 144,150 152,156 " +
  "C 158,160 160,167 156,171 C 152,181 140,185 122,187 " +
  "L 116,189 L 116,205 L 104,205 L 104,189 L 98,187 " +
  "C 80,185 74,181 72,170 Z";

// Patella (lateral view — teardrop shape)
const PATELLA_LAT =
  "M 70,102 C 66,92 70,80 80,76 C 90,72 100,78 102,90 " +
  "C 104,102 98,114 88,116 C 78,118 74,112 70,102 Z";

// ── Shared anatomy components ─────────────────────────────────────────────────

function KneeAP({ children }: { children?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 220 205" className="w-full" style={{ maxHeight: 158 }}>
      {/* Femur */}
      <path d={FEMUR_AP} fill={BF} stroke={BS} strokeWidth="1.6" />
      {/* Articular cartilage caps */}
      <path d="M 52,116 C 56,130 70,136 84,130" fill="none" stroke={CS} strokeWidth="3.5" opacity={0.65} strokeLinecap="round" />
      <path d="M 136,130 C 150,136 164,130 168,116" fill="none" stroke={CS} strokeWidth="3.5" opacity={0.65} strokeLinecap="round" />
      {/* Tibia */}
      <path d={TIBIA_AP} fill={BF} stroke={BS} strokeWidth="1.6" />
      {/* Tibial plateau cartilage */}
      <path d="M 56,142 C 64,128 80,122 100,120" fill="none" stroke={CS} strokeWidth="3" opacity={0.55} strokeLinecap="round" />
      <path d="M 120,120 C 140,122 156,128 164,142" fill="none" stroke={CS} strokeWidth="3" opacity={0.55} strokeLinecap="round" />
      {children}
    </svg>
  );
}

function KneeLat({ children, showPatella }: { children?: React.ReactNode; showPatella?: boolean }) {
  return (
    <svg viewBox="0 0 220 205" className="w-full" style={{ maxHeight: 158 }}>
      {showPatella && (
        <path d={PATELLA_LAT} fill={BF} stroke={BS} strokeWidth="1.4" />
      )}
      {/* Femur */}
      <path d={FEMUR_LAT} fill={BF} stroke={BS} strokeWidth="1.6" />
      {/* Articular cartilage */}
      <path d="M 80,96 C 78,114 82,136 96,148" fill="none" stroke={CS} strokeWidth="3.5" opacity={0.65} strokeLinecap="round" />
      {/* Tibia */}
      <path d={TIBIA_LAT} fill={BF} stroke={BS} strokeWidth="1.6" />
      {/* Tibial plateau cartilage */}
      <path d="M 72,170 C 82,152 98,148 116,148" fill="none" stroke={CS} strokeWidth="3" opacity={0.55} strokeLinecap="round" />
      {children}
    </svg>
  );
}

// ─── Intraop SVG Illustrations ────────────────────────────────────────────────

// 1 ── MCL Tear: AP view, MCL band on medial side with tear
function IntraSvgMCL() {
  return (
    <KneeAP>
      {/* MCL ligament band — medial side */}
      <motion.rect x={36} y={88} width={14} height={52} rx={5}
        fill="#6366f1" opacity={0.5}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        style={{ transformOrigin: "43px 88px" }} />
      <text x={12} y={85} fontSize={8} fill="#6366f1" fontWeight={800}>MCL</text>
      {/* Fiber lines */}
      {[94, 102, 110, 118, 126].map((y, i) => (
        <motion.line key={y} x1={37} y1={y} x2={49} y2={y}
          stroke="#6366f1" strokeWidth={1} opacity={0.45}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.3 + i * 0.04 }}
          style={{ transformOrigin: "37px" }} />
      ))}
      {/* Tear — disrupted fibers */}
      <motion.path d="M 33,118 L 52,126" fill="none"
        stroke="#ef4444" strokeWidth={2.8} strokeLinecap="round"
        strokeDasharray="22" strokeDashoffset={22}
        animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.55, duration: 0.3 }} />
      <motion.path d="M 35,122 L 51,130" fill="none"
        stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round"
        strokeDasharray="18" strokeDashoffset={18}
        animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.7, duration: 0.25 }} />
      <text x={10} y={132} fontSize={7.5} fill="#ef4444" fontWeight={900}>TEAR</text>
      <text x={110} y={202} textAnchor="middle" fontSize={7.5} fill="#6366f1" opacity={0.6} fontWeight={700}>AP: Iatrogenic MCL injury</text>
    </KneeAP>
  );
}

// 2 ── Peroneal Nerve: AP view with fibula, nerve wraps around fibular head
function IntraSvgPeroneal() {
  return (
    <KneeAP>
      {/* Fibula */}
      <path d={FIBULA_AP} fill={BF} stroke={BS} strokeWidth="1.4" />
      {/* Fibular head label */}
      <text x={172} y={119} fontSize={6.5} fill="#94a3b8" fontWeight={700}>Fibula</text>
      {/* N. Peroneal communis — curves around fibular head */}
      <motion.path
        d="M 188,100 C 200,108 204,120 196,132 C 188,144 176,148 168,144"
        fill="none" stroke="#8b5cf6" strokeWidth={2.8}
        strokeDasharray="90" strokeDashoffset={90}
        animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.7, delay: 0.3 }} />
      <text x={194} y={96} fontSize={7} fill="#8b5cf6" fontWeight={800}>N. Peroneal</text>
      {/* Compression flash */}
      <motion.circle cx={194} cy={118} r={7} fill="#ef4444" opacity={0}
        animate={{ opacity: [0, 0.55, 0.2] }}
        transition={{ duration: 1.1, delay: 0.9, repeat: Infinity, repeatDelay: 1.4 }} />
      <text x={198} y={122} fontSize={9} fill="#ef4444" fontWeight={900}>!</text>
      <text x={110} y={202} textAnchor="middle" fontSize={7.5} fill="#8b5cf6" opacity={0.6} fontWeight={700}>AP: Traction neuropraxia fibular head</text>
    </KneeAP>
  );
}

// 3 ── Anterior Notch: Lateral view, notch on anterior femur cortex
function IntraSvgNotch() {
  return (
    <KneeLat showPatella>
      {/* Highlight anterior cortex zone */}
      <motion.rect x={86} y={50} width={22} height={58} rx={4}
        fill="#38bdf8" opacity={0}
        animate={{ opacity: 0.18 }} transition={{ delay: 0.2 }} />
      {/* Notch defect on anterior cortex */}
      <motion.path d="M 90,72 L 100,86 L 110,72"
        fill="#fde68a" stroke="#ef4444" strokeWidth={2.5} strokeLinejoin="round"
        opacity={0}
        animate={{ opacity: 0.9 }} transition={{ delay: 0.55 }} />
      <motion.path d="M 90,72 L 100,86 L 110,72"
        fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinejoin="round"
        strokeDasharray="36" strokeDashoffset={36}
        animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.55, duration: 0.4 }} />
      {/* Arrow pointing to notch */}
      <motion.path d="M 70,80 L 86,80" fill="none"
        stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round"
        strokeDasharray="18" strokeDashoffset={18}
        animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.8, duration: 0.25 }} />
      <motion.path d="M 84,77 L 88,80 L 84,83" fill="none"
        stroke="#ef4444" strokeWidth={1.6} strokeLinecap="round"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }} />
      <text x={12} y={82} fontSize={7.5} fill="#ef4444" fontWeight={900}>NOTCH</text>
      <text x={110} y={202} textAnchor="middle" fontSize={7.5} fill="#38bdf8" opacity={0.6} fontWeight={700}>Lateral: Anterior cortical notch</text>
    </KneeLat>
  );
}

// 4 ── Tibial Fracture: AP view, fracture line across plateau + screw fixation
function IntraSvgTibialFx() {
  return (
    <KneeAP>
      {/* Fracture line across tibial plateau */}
      <motion.path
        d="M 60,136 L 84,126 L 108,132 L 132,124 L 158,134"
        fill="none" stroke="#ef4444" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="115" strokeDashoffset={115}
        animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.6, delay: 0.35 }} />
      {/* Displacement gap highlight */}
      <motion.ellipse cx={94} cy={132} rx={10} ry={5} fill="#ef4444" opacity={0}
        animate={{ opacity: 0.2 }} transition={{ delay: 0.8 }} />
      {/* Cancellous screws (titanium look) */}
      {([{ x: 78, d: "M78,116 L78,162" }, { x: 142, d: "M142,116 L142,162" }]).map((s, i) => (
        <React.Fragment key={s.x}>
          <motion.path d={s.d}
            stroke="#0d9488" strokeWidth={4.5} strokeLinecap="round" fill="none"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ delay: 0.9 + i * 0.15, duration: 0.3 }} />
          {/* Screw thread lines */}
          {[122, 130, 138, 146, 154].map((y) => (
            <motion.line key={y} x1={s.x - 4} y1={y} x2={s.x + 4} y2={y}
              stroke="#0d9488" strokeWidth={1} opacity={0.5}
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
              transition={{ delay: 1.1 + i * 0.15 }} />
          ))}
        </React.Fragment>
      ))}
      <text x={152} y={152} fontSize={7.5} fill="#0d9488" fontWeight={900}>SCREW</text>
      <text x={110} y={202} textAnchor="middle" fontSize={7.5} fill="#14b8a6" opacity={0.6} fontWeight={700}>AP: Plateau fracture + cancellous screw fix</text>
    </KneeAP>
  );
}

// 5 ── Popliteal Artery: Lateral view, artery behind joint at posterior capsule
function IntraSvgPopliteal() {
  return (
    <KneeLat>
      {/* Posterior capsule zone highlight */}
      <motion.rect x={152} y={96} width={20} height={62} rx={6}
        fill="#ef4444" opacity={0}
        animate={{ opacity: 0.12 }} transition={{ delay: 0.2 }} />
      {/* A. Poplitea — running posterior to joint */}
      <motion.path
        d="M 168,55 C 172,70 176,86 174,104 C 172,122 164,136 160,152 C 158,162 160,175 162,190"
        fill="none" stroke="#ef4444" strokeWidth={4} opacity={0.75}
        strokeDasharray="160" strokeDashoffset={160}
        animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.75, delay: 0.2 }} />
      {/* Vessel label */}
      <text x={174} y={54} fontSize={7} fill="#ef4444" fontWeight={900}>A. Poplitea</text>
      {/* Injury pulse at joint level */}
      <motion.circle cx={170} cy={120} r={8} fill="#ef4444" opacity={0}
        animate={{ opacity: [0, 0.5, 0], r: [6, 16, 6] }}
        transition={{ duration: 1.2, delay: 0.85, repeat: Infinity, repeatDelay: 1 }} />
      <motion.text x={178} y={118} fontSize={11} fill="#ef4444" fontWeight={900}
        initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.2, delay: 0.9, repeat: Infinity, repeatDelay: 1 }}>!</motion.text>
      <text x={110} y={202} textAnchor="middle" fontSize={7.5} fill="#ef4444" opacity={0.65} fontWeight={700}>Lateral: Vascular emergency — posterior capsule</text>
    </KneeLat>
  );
}

// 6 ── Rotation Error: Axial (sunrise) view of knee — femoral condyles from above
function IntraSvgRotationError() {
  return (
    <svg viewBox="0 0 220 205" className="w-full" style={{ maxHeight: 158 }}>
      {/* Femoral trochlea / condyle oval — axial cross-section */}
      <path
        d="M 62,108 C 62,80 80,60 110,58 C 140,60 158,80 158,108 C 158,132 144,142 110,142 C 76,142 62,132 62,108 Z"
        fill={BF} stroke={BS} strokeWidth="1.6" />
      {/* Medial condyle blob */}
      <ellipse cx={80} cy={106} rx={24} ry={20} fill="#eee5cc" stroke={BS} strokeWidth="1.2" />
      {/* Lateral condyle blob */}
      <ellipse cx={140} cy={106} rx={26} ry={20} fill="#eee5cc" stroke={BS} strokeWidth="1.2" />
      {/* Trochlear groove */}
      <path d="M 100,58 C 98,76 97,96 100,114" fill="none" stroke="#d4c5a0" strokeWidth={2} opacity={0.6} />
      {/* TEA — ideal transepicondylar axis (green, dashed) */}
      <motion.line x1={44} y1={106} x2={176} y2={106}
        stroke="#22c55e" strokeWidth={2} strokeDasharray="8 4"
        initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} transition={{ delay: 0.2 }} />
      <text x={36} y={102} fontSize={7} fill="#22c55e" fontWeight={900}>TEA</text>
      {/* PCA / component axis — rotated internally (orange) */}
      <motion.g
        initial={{ rotate: 0 }} animate={{ rotate: -9 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        style={{ transformOrigin: "110px 106px" }}>
        <line x1={44} y1={106} x2={176} y2={106} stroke="#f97316" strokeWidth={2.8} opacity={0.85} />
        <text x={148} y={101} fontSize={7} fill="#f97316" fontWeight={900}>PCA</text>
      </motion.g>
      {/* Internal rotation arc */}
      <motion.path d="M 110,84 A 26,26 0 0,0 87,98"
        fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round"
        strokeDasharray="38" strokeDashoffset={38}
        animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.85, duration: 0.4 }} />
      <motion.path d="M 87,98 L 83,90 L 91,93" fill="#ef4444" opacity={0}
        animate={{ opacity: 0.9 }} transition={{ delay: 1.2 }} />
      <text x={90} y={76} fontSize={7.5} fill="#ef4444" fontWeight={900}>IR ~9°</text>
      <text x={110} y={200} textAnchor="middle" fontSize={7.5} fill="#f97316" opacity={0.65} fontWeight={700}>Axial: Femoral internal rotation vs TEA</text>
    </svg>
  );
}

// 7 ── Bone Defect: AP view, medial tibial plateau cavity
function IntraSvgBoneDefect() {
  return (
    <KneeAP>
      {/* Defect outline on medial plateau */}
      <motion.path
        d="M 60,138 C 58,132 62,126 70,124 L 90,124 L 92,136 C 88,144 72,146 60,138 Z"
        fill="#eab308" opacity={0}
        animate={{ opacity: 0.45 }} transition={{ delay: 0.4 }} />
      <motion.path
        d="M 60,138 C 58,132 62,126 70,124 L 90,124 L 92,136"
        fill="none" stroke="#eab308" strokeWidth={2.5} strokeLinecap="round"
        strokeDasharray="72" strokeDashoffset={72}
        animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.4, duration: 0.5 }} />
      {/* Cement fill animation */}
      <motion.path
        d="M 60,138 C 58,132 62,126 70,124 L 90,124 L 92,136 C 88,144 72,146 60,138 Z"
        fill="#fde68a" opacity={0}
        animate={{ opacity: 0.82 }} transition={{ delay: 0.9 }} />
      <motion.text x={62} y={134} fontSize={7} fill="#92400e" fontWeight={900}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>
        CEMENT
      </motion.text>
      {/* AORI label */}
      <text x={26} y={138} fontSize={7} fill="#eab308" fontWeight={900}>AORI</text>
      <text x={26} y={147} fontSize={7} fill="#eab308" fontWeight={900}>Type I</text>
      <text x={110} y={202} textAnchor="middle" fontSize={7.5} fill="#eab308" opacity={0.65} fontWeight={700}>AP: Medial plateau bone defect</text>
    </KneeAP>
  );
}

// 8 ── Gap Imbalance: Lateral view showing extension gap vs flexion gap
function IntraSvgGapImbalance() {
  return (
    <KneeLat>
      {/* Extension gap — small spacer block */}
      <motion.rect x={88} y={158} width={30} height={8} rx={3}
        fill="#22c55e" opacity={0}
        animate={{ opacity: 0.65 }} transition={{ delay: 0.3 }} />
      <text x={120} y={165} fontSize={7.5} fill="#22c55e" fontWeight={900}>EXT 8mm</text>
      {/* Extension bracket arrows */}
      <motion.path d="M 84,157 L 84,167"
        stroke="#22c55e" strokeWidth={1.8} strokeLinecap="round"
        initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.4 }} />
      <motion.path d="M 84,157 L 88,161 M 84,167 L 88,163"
        stroke="#22c55e" strokeWidth={1.4} strokeLinecap="round"
        initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.45 }} />
      {/* Flexion gap — larger spacer (simulated below tibia, in flex position */}
      {/* Show with offset tibial line */}
      <motion.rect x={72} y={175} width={46} height={16} rx={3}
        fill="#f97316" opacity={0}
        animate={{ opacity: 0.35 }} transition={{ delay: 0.55 }} />
      <text x={120} y={186} fontSize={7.5} fill="#f97316" fontWeight={900}>FLX 16mm↑</text>
      {/* Flexion bracket arrows */}
      <motion.path d="M 68,174 L 68,192"
        stroke="#f97316" strokeWidth={1.8} strokeLinecap="round"
        initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 0.6 }} />
      <motion.path d="M 68,174 L 72,178 M 68,192 L 72,188"
        stroke="#f97316" strokeWidth={1.4} strokeLinecap="round"
        initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 0.65 }} />
      {/* Mismatch indicator */}
      <motion.path d="M 50,162 L 50,185"
        stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round"
        strokeDasharray="24" strokeDashoffset={24}
        animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.8, duration: 0.3 }} />
      <text x={28} y={176} fontSize={7.5} fill="#ef4444" fontWeight={900}>≠</text>
      <text x={110} y={202} textAnchor="middle" fontSize={7.5} fill="#a855f7" opacity={0.65} fontWeight={700}>Lateral: Flexion &gt; Extension gap mismatch</text>
    </KneeLat>
  );
}

// 9 ── Patella Maltrack: Axial (sunrise) view — patella in trochlear groove
function IntraSvgPatellaTrack() {
  return (
    <svg viewBox="0 0 220 205" className="w-full" style={{ maxHeight: 158 }}>
      {/* Trochlear groove — U-shaped cross-section */}
      <path
        d="M 56,115 C 56,86 74,62 110,60 C 146,62 164,86 164,115 C 164,136 148,146 110,146 C 72,146 56,136 56,115 Z"
        fill={BF} stroke={BS} strokeWidth="1.6" />
      {/* Trochlear groove sulcus line */}
      <path d="M 110,60 C 108,80 106,100 108,122"
        fill="none" stroke="#d4c5a0" strokeWidth={2} opacity={0.55} />
      {/* Medial facet label */}
      <text x={62} y={130} fontSize={6.5} fill="#94a3b8" fontWeight={700}>Med</text>
      {/* Lateral facet label */}
      <text x={144} y={130} fontSize={6.5} fill="#94a3b8" fontWeight={700}>Lat</text>
      {/* Patella — animated lateral tilt/subluxation */}
      <motion.g
        animate={{ x: [0, 22, 0], rotate: [0, 12, 0] }}
        style={{ transformOrigin: "110px 100px" }}
        transition={{ duration: 2.2, delay: 0.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}>
        <path d={PATELLA_AP} fill="#fce7f3" stroke="#ec4899" strokeWidth={2} />
        <text x={93} y={100} fontSize={6.5} fill="#ec4899" fontWeight={900} textAnchor="middle">Patella</text>
      </motion.g>
      {/* Lateral arrow */}
      <motion.path d="M 124,100 L 142,100"
        fill="none" stroke="#ef4444" strokeWidth={2.2} strokeLinecap="round"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2.2, delay: 0.4, repeat: Infinity, repeatDelay: 1.2 }} />
      <motion.path d="M 140,96 L 144,100 L 140,104"
        fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2.2, delay: 0.45, repeat: Infinity, repeatDelay: 1.2 }} />
      {/* Lateral release arrow */}
      <motion.path d="M 158,115 L 176,115"
        stroke="#a855f7" strokeWidth={2} strokeLinecap="round"
        strokeDasharray="18" strokeDashoffset={18}
        animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.3, duration: 0.3 }} />
      <text x={152} y={110} fontSize={7} fill="#a855f7" fontWeight={800}>Release</text>
      <text x={110} y={200} textAnchor="middle" fontSize={7.5} fill="#ec4899" opacity={0.65} fontWeight={700}>Axial: Lateral patellar subluxation</text>
    </svg>
  );
}

function IntraIllustration({ id }: { id: string }) {
  switch (id) {
    case "mcl_tear":               return <IntraSvgMCL />;
    case "peroneal_nerve":         return <IntraSvgPeroneal />;
    case "femoral_notching":       return <IntraSvgNotch />;
    case "tibial_fracture":        return <IntraSvgTibialFx />;
    case "popliteal_injury":       return <IntraSvgPopliteal />;
    case "sizing_rotation_error":  return <IntraSvgRotationError />;
    case "bone_defect":            return <IntraSvgBoneDefect />;
    case "gap_imbalance_intra":    return <IntraSvgGapImbalance />;
    case "patella_maltrack_intra": return <IntraSvgPatellaTrack />;
    default:                       return null;
  }
}

// ─── Intraop Reference accordion ─────────────────────────────────────────────

function IntraRefs({ refs, color }: { refs: IntraRef[]; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-white/40 pt-3">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left">
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" style={{ color }}>
          <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M3 4h6M3 6h6M3 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
          Referensi ({refs.length})
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto">
          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="mt-2 space-y-2">
              {refs.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-white/50 bg-white/50 px-3 py-2">
                  <p className="text-[10px] font-black text-slate-800">{r.authors} ({r.year})</p>
                  <p className="text-[9px] italic text-slate-600 leading-snug mt-0.5">{r.title}</p>
                  <p className="text-[9px] font-bold mt-0.5" style={{ color }}>{r.journal}</p>
                  {r.note && <p className="text-[8px] text-slate-400 mt-0.5">↳ {r.note}</p>}
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-[8px] font-black rounded-lg px-2 py-0.5 text-white hover:opacity-80"
                    style={{ backgroundColor: color }} onClick={e => e.stopPropagation()}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 8.5L8.5 1.5M8.5 1.5H4.5M8.5 1.5V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Buka Jurnal
                  </a>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Intraop Problem Card ─────────────────────────────────────────────────────

function IntraProblemCard({ prob }: { prob: IntraProblem }) {
  const [openMgmt, setOpenMgmt] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-sm overflow-hidden shadow-[2px_2px_16px_rgba(148,163,184,0.14),-2px_-2px_16px_rgba(255,255,255,0.8)]"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3"
        style={{ borderBottom: `2px solid ${prob.lightColor}` }}>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: prob.lightColor }}>
          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: prob.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: prob.color }}>
              Masalah Intraop
            </span>
            <span className="text-[8px] font-black rounded-md px-1.5 py-0.5 text-white"
              style={{ backgroundColor: URGENCY_COLOR[prob.urgency] }}>
              {URGENCY_LABEL[prob.urgency]}
            </span>
          </div>
          <h3 className="text-sm font-black text-slate-800 leading-tight">{prob.title}</h3>
          <p className="text-[10px] text-slate-500 font-semibold">{prob.subtitle}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[7px] text-slate-400 font-bold">Insidensi</p>
          <p className="text-xs font-black" style={{ color: prob.color }}>{prob.incidence}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-[11px] text-slate-600 leading-relaxed mb-3">{prob.description}</p>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Illustration */}
          <div className="sm:w-36 shrink-0 rounded-xl p-2"
            style={{ backgroundColor: prob.lightColor + "55" }}>
            <IntraIllustration id={prob.id} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Prevention */}
            <div className="mb-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                Pencegahan Intraop
              </p>
              <div className="space-y-1">
                {prob.prevention.map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <svg className="w-3 h-3 shrink-0 mt-0.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5L4.5 9L10 3" stroke={prob.color} strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[10px] text-slate-600 leading-snug">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Management accordion */}
        <div className="mt-3 rounded-2xl border overflow-hidden"
          style={{ borderColor: prob.color + "33", backgroundColor: prob.lightColor + "33" }}>
          <button onClick={() => setOpenMgmt(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 14 14" fill="none" style={{ color: prob.color }}>
              <path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest flex-1" style={{ color: prob.color }}>
              Tatalaksana Intraoperatif ({prob.management.length} langkah)
            </span>
            <motion.div animate={{ rotate: openMgmt ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 14 14" fill="none">
                <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </motion.div>
          </button>

          <AnimatePresence>
            {openMgmt && (
              <motion.div initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="px-3 pb-3 space-y-2">
                  {prob.management.map((m, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="rounded-xl bg-white/60 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: prob.color }}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800">{m.action}</p>
                          <p className="text-[10px] text-slate-600 leading-snug mt-0.5">{m.detail}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* References */}
        <IntraRefs refs={prob.references} color={prob.color} />
      </div>
    </motion.div>
  );
}

// ─── Intraop Tab Panel ────────────────────────────────────────────────────────

const STEP_META: Record<IntraStepId, { label: string; color: string }> = {
  exposure:         { label: "Exposure",         color: "#6366f1" },
  distal_femur:     { label: "Distal Femur",      color: "#38bdf8" },
  tibial_resection: { label: "Tibial Resection",  color: "#14b8a6" },
  sizing_chamfer:   { label: "Sizing & Chamfer",  color: "#f97316" },
  trial_reduction:  { label: "Trial Reduction",   color: "#a855f7" },
  final_implant:    { label: "Final Implant",     color: "#22c55e" },
};

function IntraopPanel() {
  const [activeStep, setActiveStep] = useState<IntraStepId>("exposure");
  const problems = INTRA_PROBLEMS.filter(p => p.stepId === activeStep);

  return (
    <div>
      {/* Step filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5 justify-center">
        {(Object.keys(STEP_META) as IntraStepId[]).map(sid => {
          const meta = STEP_META[sid];
          const count = INTRA_PROBLEMS.filter(p => p.stepId === sid).length;
          const active = sid === activeStep;
          return (
            <button key={sid} onClick={() => setActiveStep(sid)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black transition-all active:scale-95"
              style={active
                ? { backgroundColor: meta.color, color: "#fff", boxShadow: `0 0 0 3px ${meta.color}33` }
                : { backgroundColor: "rgba(255,255,255,0.6)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.6)" }
              }>
              {meta.label}
              <span className="rounded-full text-[8px] w-4 h-4 flex items-center justify-center font-black"
                style={{ backgroundColor: active ? "rgba(255,255,255,0.3)" : meta.color + "22", color: active ? "#fff" : meta.color }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Problem cards */}
      <AnimatePresence mode="wait">
        <motion.div key={activeStep}
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}
          className="space-y-4">
          {problems.length === 0
            ? <p className="text-center text-xs text-slate-400 py-6">Tidak ada masalah terdokumentasi untuk tahap ini.</p>
            : problems.map(p => <IntraProblemCard key={p.id} prob={p} />)
          }
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Step Illustration Router ─────────────────────────────────────────────────

function StepIllustration({ stepId, playing }: { stepId: StepId; playing: boolean }) {
  switch (stepId) {
    case "exposure":        return <ExposureIllustration playing={playing} />;
    case "distal_femur":    return <DistalFemurIllustration playing={playing} />;
    case "tibial_resection":return <TibialResectionIllustration playing={playing} />;
    case "sizing_chamfer":  return <SizingChamferIllustration playing={playing} />;
    case "trial_reduction": return <TrialReductionIllustration playing={playing} />;
    case "final_implant":   return <FinalImplantIllustration playing={playing} />;
  }
}

// ─── Step Dot ─────────────────────────────────────────────────────────────────

function StepDot({
  step, active, done, onClick,
}: {
  step: Step; active: boolean; done: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="relative flex flex-col items-center gap-1 group focus:outline-none"
    >
      <motion.div
        animate={active ? { scale: 1.18, boxShadow: `0 0 0 4px ${step.lightColor}` } : { scale: 1, boxShadow: "none" }}
        transition={{ duration: 0.25 }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white transition-all"
        style={{ backgroundColor: done ? step.color : active ? step.color : "#cbd5e1" }}
      >
        {done ? (
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5L6.5 12L13 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : step.number}
      </motion.div>
      <span className={`text-[8px] font-bold hidden sm:block transition-colors ${active ? "text-slate-700" : "text-slate-400"}`}
        style={active ? { color: step.color } : undefined}>
        {step.number}
      </span>
    </button>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-white/40 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TkaSurgicalSteps() {
  const [activeTab, setActiveTab] = useState<"steps" | "intraop">("steps");
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [stepProgress, setStepProgress] = useState(0);
  const [animKey, setAnimKey] = useState(0); // force remount illustration
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  // Play current step animation
  const playStep = useCallback((idx: number) => {
    setCurrentStep(idx);
    setAnimKey((k) => k + 1);
    setPlaying(true);
    setStepProgress(0);
  }, []);

  // Manual nav
  const goTo = useCallback((idx: number) => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    playStep(idx);
  }, [playStep]);

  const goNext = useCallback(() => {
    if (!isLast) goTo(currentStep + 1);
    else { setAutoPlay(false); setPlaying(false); }
  }, [currentStep, isLast, goTo]);

  const goPrev = useCallback(() => {
    if (!isFirst) goTo(currentStep - 1);
  }, [currentStep, isFirst, goTo]);

  // Auto-play progress ticker
  useEffect(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (!autoPlay || !playing) return;
    const tick = 50;
    const total = step.duration;
    let elapsed = 0;
    progressRef.current = setInterval(() => {
      elapsed += tick;
      setStepProgress(Math.min(elapsed / total, 1));
      if (elapsed >= total) {
        clearInterval(progressRef.current!);
        // advance
        if (currentStep < STEPS.length - 1) {
          playStep(currentStep + 1);
        } else {
          setAutoPlay(false);
          setPlaying(false);
          setStepProgress(1);
        }
      }
    }, tick);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [autoPlay, playing, currentStep, step.duration, playStep]);

  // Toggle autoplay
  const toggleAutoPlay = useCallback(() => {
    if (autoPlay) {
      setAutoPlay(false);
      if (progressRef.current) clearInterval(progressRef.current);
    } else {
      setAutoPlay(true);
      setPlaying(true);
      setAnimKey((k) => k + 1);
      setStepProgress(0);
    }
  }, [autoPlay]);

  // Replay current step
  const replay = useCallback(() => {
    setAnimKey((k) => k + 1);
    setPlaying(true);
    setStepProgress(0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-50 p-4 sm:p-6 lg:p-8 flex items-start justify-center">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Ilustrasi Tindakan Bedah
          </p>
          <h1 className="text-2xl font-black text-slate-800">
            Total Knee Arthroplasty
          </h1>
          <p className="text-xs text-slate-500 mt-1">Urutan tindakan standar · 6 langkah</p>
        </div>

        {/* Tab toggle */}
        <div className="mb-6 flex items-center justify-center">
          <div className="flex rounded-2xl p-1 bg-white/70 backdrop-blur shadow-[2px_2px_12px_rgba(148,163,184,0.15),-2px_-2px_12px_rgba(255,255,255,0.8)] gap-1">
            {[
              { id: "steps" as const, label: "Urutan Tindakan", icon: "M3 5l2 0 0 9-2 0zM7 5l2 0 0 9-2 0zM11 5l2 0 0 9-2 0z" },
              { id: "intraop" as const, label: "Masalah Intraop", icon: "M7 2L7 10M3 6l4 4 4-4" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
                style={activeTab === tab.id
                  ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }
                  : { color: "#94a3b8" }
                }>
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  {tab.id === "steps"
                    ? <><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M4 5h6M4 7h6M4 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></>
                    : <><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/></>
                  }
                </svg>
                {tab.label}
                {tab.id === "intraop" && (
                  <span className="rounded-full text-[8px] w-4 h-4 flex items-center justify-center font-black"
                    style={{ background: activeTab === "intraop" ? "rgba(255,255,255,0.25)" : "#6366f122", color: activeTab === "intraop" ? "#fff" : "#6366f1" }}>
                    {INTRA_PROBLEMS.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
        {activeTab === "intraop" ? (
          <motion.div key="intraop"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <IntraopPanel />
            <p className="mt-6 text-center text-[9px] text-slate-400 font-semibold">
              Berbasis jurnal klinis · Bukan pengganti pertimbangan bedah langsung
            </p>
          </motion.div>
        ) : (
          <motion.div key="steps"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>

        {/* Step dots / timeline */}
        <div className="mb-5 flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <StepDot
                step={s}
                active={i === currentStep}
                done={i < currentStep}
                onClick={() => goTo(i)}
              />
              {i < STEPS.length - 1 && (
                <motion.div
                  className="h-0.5 w-8 sm:w-10 mx-0.5 rounded-full"
                  style={{ backgroundColor: i < currentStep ? STEPS[i].color : "#e2e8f0" }}
                  animate={{ backgroundColor: i < currentStep ? STEPS[i].color : "#e2e8f0" }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-sm shadow-[4px_4px_24px_rgba(148,163,184,0.18),-4px_-4px_24px_rgba(255,255,255,0.9)] overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3" style={{ borderBottom: `2px solid ${step.lightColor}` }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0"
                style={{ backgroundColor: step.color }}>
                {step.number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: step.color }}>
                  Step {step.number} of {STEPS.length}
                </p>
                <h2 className="text-base font-black text-slate-800 leading-tight">{step.title}</h2>
                <p className="text-[11px] text-slate-500 font-semibold">{step.subtitle}</p>
              </div>
              {/* Play indicator */}
              <motion.div
                animate={playing ? { opacity: 1, scale: [1, 1.15, 1] } : { opacity: 0.4, scale: 1 }}
                transition={playing ? { duration: 1.2, repeat: Infinity } : {}}
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: step.color }}
              />
            </div>

            {/* Illustration */}
            <div className="px-4 pt-3 pb-2" style={{ backgroundColor: step.lightColor + "33" }}>
              <AnimatePresence mode="wait">
                <motion.div key={animKey}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <StepIllustration stepId={step.id} playing={playing} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Description */}
            <div className="px-5 py-3">
              <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{step.description}</p>
            </div>

            {/* Auto-play progress */}
            {autoPlay && (
              <div className="px-5 pb-1">
                <ProgressBar progress={stepProgress} color={step.color} />
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2 px-5 pb-5 pt-2">
              {/* Prev */}
              <button
                onClick={goPrev}
                disabled={isFirst}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-[11px] font-black text-slate-600 disabled:opacity-30 hover:bg-white transition-all active:scale-95"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Prev
              </button>

              {/* Replay */}
              <button
                onClick={replay}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-white transition-all active:scale-95"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7A5 5 0 1 1 7 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M2 3.5V7H5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Ulang
              </button>

              {/* Auto-play */}
              <button
                onClick={toggleAutoPlay}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black text-white transition-all active:scale-95"
                style={{ backgroundColor: autoPlay ? "#64748b" : step.color }}
              >
                {autoPlay ? (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
                      <rect x="2" y="2" width="4" height="10" rx="1" />
                      <rect x="8" y="2" width="4" height="10" rx="1" />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M3 2L12 7L3 12V2Z" />
                    </svg>
                    Auto Play
                  </>
                )}
              </button>

              {/* Next */}
              <button
                onClick={goNext}
                disabled={isLast && !autoPlay}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-[11px] font-black text-slate-600 disabled:opacity-30 hover:bg-white transition-all active:scale-95"
              >
                Next
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step list summary */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => goTo(i)}
              className="text-left rounded-2xl border border-white/60 px-3 py-2 transition-all hover:scale-[1.02] active:scale-95"
              style={{
                backgroundColor: i === currentStep ? s.lightColor : "rgba(255,255,255,0.5)",
                borderColor: i === currentStep ? s.color + "66" : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ backgroundColor: i <= currentStep ? s.color : "#cbd5e1" }}>
                  {i < currentStep ? (
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5L4.5 9L10 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : s.number}
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-700 line-clamp-1">{s.title}</span>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[9px] text-slate-400 font-semibold">
          Ilustrasi edukatif · Bukan panduan klinis
        </p>
          </motion.div>
        )}
        </AnimatePresence>

      </div>
    </div>
  );
}
