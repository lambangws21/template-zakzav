"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, TrendingUp, AlertTriangle, CheckCircle2, Info,
  BookOpen, TableProperties, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Real Implant Brand Database ─────────────────────────────────────────────
// Data dimensi berdasarkan spesifikasi teknis resmi masing-masing brand.
// Source: surgical technique guides DePuy Attune, Zimmer NexGen, Stryker Triathlon,
//         DePuy Pinnacle/Corail, Zimmer Continuum, Stryker Tritanium/Exeter.

const KNEE_BRANDS = [
  {
    id: "depuy_attune",
    name: "DePuy Attune",
    maker: "Johnson & Johnson",
    color: "#0369a1",
    lightColor: "#e0f2fe",
    femoral: [
      { size: "1", ap: 54.3, ml: 58.6, distalH: 8.0 },
      { size: "2", ap: 57.6, ml: 62.0, distalH: 8.0 },
      { size: "3", ap: 61.0, ml: 65.4, distalH: 9.0 },
      { size: "4", ap: 64.4, ml: 69.1, distalH: 9.0 },
      { size: "5", ap: 67.7, ml: 73.4, distalH: 9.5 },
      { size: "6", ap: 71.1, ml: 78.0, distalH: 9.5 },
      { size: "7", ap: 74.4, ml: 83.3, distalH: 10.0 },
      { size: "8", ap: 77.8, ml: 89.1, distalH: 10.0 },
    ],
    tibial: [
      { size: "1", ml: 64.3, ap: 43.4 },
      { size: "2", ml: 68.9, ap: 46.5 },
      { size: "3", ml: 73.5, ap: 49.9 },
      { size: "4", ml: 78.5, ap: 53.1 },
      { size: "5", ml: 83.8, ap: 56.6 },
      { size: "6", ml: 89.8, ap: 60.2 },
      { size: "7", ml: 95.1, ap: 63.5 },
      { size: "8", ml: 100.6, ap: 67.4 },
    ],
    poly: [9, 11, 13, 16, 19, 22],
    note: "CR/PS/S+. Femoral diukur AP dari anterior flange ke posterior condyle.",
  },
  {
    // Zimmer NexGen — sistem lama, masih banyak digunakan
    id: "zimmer_nexgen",
    name: "Zimmer NexGen",
    maker: "Zimmer Biomet",
    color: "#0d9488",
    lightColor: "#ccfbf1",
    femoral: [
      { size: "A", ap: 55.5, ml: 58.5, distalH: 8.0 },
      { size: "B", ap: 59.1, ml: 62.9, distalH: 8.5 },
      { size: "C", ap: 62.8, ml: 67.2, distalH: 9.0 },
      { size: "D", ap: 66.8, ml: 71.9, distalH: 9.5 },
      { size: "E", ap: 71.2, ml: 76.9, distalH: 10.0 },
      { size: "F", ap: 76.2, ml: 82.7, distalH: 10.0 },
      { size: "G", ap: 81.8, ml: 89.3, distalH: 11.0 },
    ],
    tibial: [
      { size: "1", ml: 59.3, ap: 38.9 },
      { size: "2", ml: 63.3, ap: 41.6 },
      { size: "3", ml: 67.3, ap: 44.4 },
      { size: "4", ml: 71.5, ap: 47.2 },
      { size: "5", ml: 75.6, ap: 50.0 },
      { size: "6", ml: 80.7, ap: 53.3 },
      { size: "7", ml: 86.3, ap: 57.1 },
      { size: "8", ml: 91.9, ap: 61.2 },
    ],
    poly: [8, 10, 12, 14, 16, 18],
    note: "CR/LPS/LCCK. Ukuran femoral A–G; tibial 1–8. Legacy system masih tersedia.",
  },
  {
    // Zimmer Persona — sistem TKA terbaru Zimmer Biomet (2013–sekarang)
    id: "zimmer_persona",
    name: "Zimmer Persona",
    maker: "Zimmer Biomet",
    color: "#0891b2",
    lightColor: "#cffafe",
    femoral: [
      { size: "1", ap: 51.0, ml: 54.5, distalH: 7.5 },
      { size: "2", ap: 55.0, ml: 58.5, distalH: 8.0 },
      { size: "3", ap: 58.5, ml: 62.5, distalH: 8.5 },
      { size: "4", ap: 62.5, ml: 67.0, distalH: 9.0 },
      { size: "5", ap: 67.0, ml: 71.5, distalH: 9.5 },
      { size: "6", ap: 71.5, ml: 76.5, distalH: 10.0 },
      { size: "7", ap: 76.0, ml: 82.0, distalH: 10.5 },
      { size: "8", ap: 80.5, ml: 88.0, distalH: 11.0 },
      { size: "9", ap: 85.5, ml: 94.0, distalH: 11.5 },
    ],
    tibial: [
      { size: "1", ml: 58.5, ap: 38.5 },
      { size: "2", ml: 62.5, ap: 41.5 },
      { size: "3", ml: 66.5, ap: 44.5 },
      { size: "4", ml: 71.0, ap: 47.5 },
      { size: "5", ml: 75.5, ap: 50.5 },
      { size: "6", ml: 80.5, ap: 54.0 },
      { size: "7", ml: 86.0, ap: 57.0 },
      { size: "8", ml: 91.5, ap: 61.0 },
      { size: "9", ml: 98.0, ap: 65.0 },
    ],
    poly: [9, 11, 13, 16, 19, 22],
    note: "Persona The Personalized Knee — CR/PS/PS3/Revision. 9 femoral + 9 tibial sizes. Generasi terbaru Zimmer Biomet TKA.",
  },
  {
    id: "stryker_triathlon",
    name: "Stryker Triathlon",
    maker: "Stryker",
    color: "#7c3aed",
    lightColor: "#ede9fe",
    femoral: [
      { size: "1", ap: 53.8, ml: 58.8, distalH: 7.5 },
      { size: "2", ap: 57.4, ml: 62.9, distalH: 8.0 },
      { size: "3", ap: 61.1, ml: 67.3, distalH: 8.5 },
      { size: "4", ap: 65.0, ml: 71.8, distalH: 9.0 },
      { size: "5", ap: 69.3, ml: 76.6, distalH: 9.5 },
      { size: "6", ap: 73.7, ml: 81.7, distalH: 10.0 },
      { size: "7", ap: 78.4, ml: 87.1, distalH: 10.5 },
      { size: "8", ap: 83.6, ml: 93.6, distalH: 11.0 },
    ],
    tibial: [
      { size: "1", ml: 63.8, ap: 40.0 },
      { size: "2", ml: 67.4, ap: 43.4 },
      { size: "3", ml: 72.0, ap: 46.7 },
      { size: "4", ml: 76.5, ap: 50.0 },
      { size: "5", ml: 82.0, ap: 53.5 },
      { size: "6", ml: 87.0, ap: 56.8 },
      { size: "7", ml: 92.0, ap: 59.8 },
      { size: "8", ml: 97.5, ap: 62.9 },
    ],
    poly: [9, 11, 13, 16, 19, 22],
    note: "CS/PS/CCK. Triathlon menggunakan numbering 1–8 untuk femoral dan tibial.",
  },
  {
    id: "snk_genesis2",
    name: "S&N Genesis II",
    maker: "Smith & Nephew",
    color: "#b45309",
    lightColor: "#fef3c7",
    femoral: [
      { size: "1", ap: 51.5, ml: 55.5, distalH: 7.5 },
      { size: "2", ap: 55.0, ml: 59.5, distalH: 8.0 },
      { size: "3", ap: 58.5, ml: 63.5, distalH: 8.5 },
      { size: "4", ap: 62.5, ml: 67.5, distalH: 9.0 },
      { size: "5", ap: 66.5, ml: 72.5, distalH: 9.5 },
      { size: "6", ap: 70.5, ml: 77.5, distalH: 10.0 },
      { size: "7", ap: 75.0, ml: 83.0, distalH: 10.5 },
    ],
    tibial: [
      { size: "1", ml: 60.0, ap: 38.0 },
      { size: "2", ml: 64.0, ap: 41.0 },
      { size: "3", ml: 68.5, ap: 44.0 },
      { size: "4", ml: 73.0, ap: 47.0 },
      { size: "5", ml: 78.0, ap: 50.5 },
      { size: "6", ml: 83.5, ap: 54.0 },
      { size: "7", ml: 89.0, ap: 57.5 },
    ],
    poly: [8, 10, 12, 14, 16],
    note: "CR/PS/TC3. Ukuran femoral 1–7; tibial 1–7.",
  },
];

const CUP_BRANDS = [
  {
    id: "depuy_pinnacle",
    name: "DePuy Pinnacle",
    maker: "Johnson & Johnson",
    color: "#0369a1",
    lightColor: "#e0f2fe",
    sizes: [44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72],
    rule: "Diameter acetabulum (reamed) + 1–2 mm press-fit",
    liner: ["36mm std", "36mm elevated", "28mm", "32mm"],
  },
  {
    id: "zimmer_continuum",
    name: "Zimmer Continuum",
    maker: "Zimmer Biomet",
    color: "#0d9488",
    lightColor: "#ccfbf1",
    sizes: [44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70],
    rule: "Diameter acetabulum + 2 mm press-fit (highly porous shell)",
    liner: ["36mm std", "36mm elevated", "28mm", "32mm", "40mm"],
  },
  {
    // Zimmer G7 — generasi terbaru Zimmer Biomet cup (menggantikan Continuum)
    id: "zimmer_g7",
    name: "Zimmer G7",
    maker: "Zimmer Biomet",
    color: "#0891b2",
    lightColor: "#cffafe",
    sizes: [44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74],
    rule: "Diameter acetabulum + 2 mm press-fit. G7 BIOLOX delta ceramic liner tersedia.",
    liner: ["32mm ceramic", "36mm ceramic", "40mm ceramic", "36mm XLPE", "40mm XLPE", "32mm elevated"],
  },
  {
    id: "stryker_tritanium",
    name: "Stryker Tritanium",
    maker: "Stryker",
    color: "#7c3aed",
    lightColor: "#ede9fe",
    sizes: [44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72],
    rule: "Diameter acetabulum + 2 mm press-fit (tritanium porous construct)",
    liner: ["32mm", "36mm std", "36mm elevated", "40mm"],
  },
  {
    id: "snk_r3",
    name: "S&N R3 Cup",
    maker: "Smith & Nephew",
    color: "#b45309",
    lightColor: "#fef3c7",
    sizes: [46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70],
    rule: "Diameter acetabulum + 2 mm press-fit",
    liner: ["28mm", "32mm", "36mm std", "36mm elevated"],
  },
];

const STEM_BRANDS = [
  {
    id: "depuy_corail",
    name: "DePuy Corail",
    maker: "Johnson & Johnson",
    color: "#0369a1",
    lightColor: "#e0f2fe",
    sizes: [
      { size: "8",  canalMin: 7,  canalMax: 9  },
      { size: "9",  canalMin: 8,  canalMax: 10 },
      { size: "10", canalMin: 9,  canalMax: 11 },
      { size: "11", canalMin: 10, canalMax: 12 },
      { size: "12", canalMin: 11, canalMax: 13 },
      { size: "13", canalMin: 12, canalMax: 14 },
      { size: "14", canalMin: 13, canalMax: 15 },
      { size: "16", canalMin: 15, canalMax: 17 },
      { size: "18", canalMin: 17, canalMax: 19 },
      { size: "20", canalMin: 19, canalMax: 22 },
    ],
    note: "Tapered wedge HA-coated. Size = approx canal width at isthmus. Fill ratio target ≥ 80%.",
  },
  {
    id: "stryker_exeter",
    name: "Stryker Exeter",
    maker: "Stryker",
    color: "#7c3aed",
    lightColor: "#ede9fe",
    sizes: [
      { size: "0",   canalMin: 7,  canalMax: 9  },
      { size: "1",   canalMin: 9,  canalMax: 11 },
      { size: "2",   canalMin: 11, canalMax: 13 },
      { size: "3",   canalMin: 13, canalMax: 15 },
      { size: "4",   canalMin: 15, canalMax: 17 },
      { size: "5",   canalMin: 17, canalMax: 22 },
    ],
    note: "Polished double-tapered stem. Sizing berbasis metaphyseal fill, templating lateral wajib.",
  },
  {
    // Zimmer M/L Taper — cementless, metaphyseal-diaphyseal fixation
    id: "zimmer_ml_taper",
    name: "Zimmer M/L Taper",
    maker: "Zimmer Biomet",
    color: "#0d9488",
    lightColor: "#ccfbf1",
    cemented: false,
    sizes: [
      { size: "1",  canalMin: 8,  canalMax: 10, proxML: 28 },
      { size: "2",  canalMin: 9,  canalMax: 11, proxML: 30 },
      { size: "3",  canalMin: 10, canalMax: 12, proxML: 32 },
      { size: "4",  canalMin: 11, canalMax: 13, proxML: 34 },
      { size: "5",  canalMin: 12, canalMax: 14, proxML: 36 },
      { size: "6",  canalMin: 13, canalMax: 15, proxML: 38 },
      { size: "7",  canalMin: 14, canalMax: 16, proxML: 40 },
      { size: "8",  canalMin: 15, canalMax: 17, proxML: 42 },
      { size: "9",  canalMin: 16, canalMax: 18, proxML: 44 },
      { size: "10", canalMin: 17, canalMax: 21, proxML: 46 },
    ],
    note: "Cementless. Fiksasi metaphyseal-diaphyseal. Tersedia offset standard & high. Cocok untuk kanal normal–besar.",
  },
  {
    // Zimmer CPT — Collarless Polished Tapered, cemented
    id: "zimmer_cpt",
    name: "Zimmer CPT",
    maker: "Zimmer Biomet",
    color: "#0369a1",
    lightColor: "#e0f2fe",
    cemented: true,
    sizes: [
      { size: "0",  canalMin: 7,  canalMax: 9,  cementMantle: 2 },
      { size: "1",  canalMin: 9,  canalMax: 11, cementMantle: 2 },
      { size: "2",  canalMin: 11, canalMax: 12, cementMantle: 2 },
      { size: "3",  canalMin: 12, canalMax: 13, cementMantle: 2 },
      { size: "4",  canalMin: 13, canalMax: 14, cementMantle: 2 },
      { size: "5",  canalMin: 14, canalMax: 16, cementMantle: 2 },
      { size: "6",  canalMin: 16, canalMax: 20, cementMantle: 2 },
    ],
    note: "Cemented. Collarless Polished Tapered — subsidence terkontrol ke dalam semen. Cement mantle min 2 mm. Pilihan utama untuk kanal sempit/osteoporosis.",
  },
  {
    // Zimmer Avenir Complete — terbaru, cementless anatomical
    id: "zimmer_avenir",
    name: "Zimmer Avenir Complete",
    maker: "Zimmer Biomet",
    color: "#6d28d9",
    lightColor: "#ede9fe",
    cemented: false,
    sizes: [
      { size: "XS",  canalMin: 6,  canalMax: 9  },
      { size: "S",   canalMin: 9,  canalMax: 11 },
      { size: "M",   canalMin: 11, canalMax: 13 },
      { size: "L",   canalMin: 13, canalMax: 15 },
      { size: "XL",  canalMin: 15, canalMax: 17 },
      { size: "XXL", canalMin: 17, canalMax: 22 },
    ],
    note: "Cementless terbaru Zimmer Biomet. Avenir Complete — anatomikal, tersedia straight & curved. Cocok untuk kanal lebar atau deformitas ringan.",
  },
  {
    id: "snk_polarstem",
    name: "S&N Polar Stem",
    maker: "Smith & Nephew",
    color: "#b45309",
    lightColor: "#fef3c7",
    sizes: [
      { size: "1",  canalMin: 7,  canalMax: 9  },
      { size: "2",  canalMin: 9,  canalMax: 11 },
      { size: "3",  canalMin: 11, canalMax: 13 },
      { size: "4",  canalMin: 13, canalMax: 15 },
      { size: "5",  canalMin: 15, canalMax: 17 },
      { size: "6",  canalMin: 17, canalMax: 22 },
    ],
    note: "Corail-like concept. Canal fill diaphyseal isthmus target.",
  },
];

// ─── Estimation helpers ───────────────────────────────────────────────────────

function findKneeFemoral(brand, apMm) {
  // Select size where component AP ≤ measured femur AP (no notching)
  // Pick largest size that fits
  const sorted = [...brand.femoral].sort((a, b) => b.ap - a.ap);
  const match = sorted.find((s) => s.ap <= apMm);
  return match ?? brand.femoral[0];
}
function findKneeTibial(brand, mlMm) {
  // Pick size closest to measured tibial ML (≤ measured, then closest)
  const sorted = [...brand.tibial].sort((a, b) => b.ml - a.ml);
  const match = sorted.find((s) => s.ml <= mlMm);
  return match ?? brand.tibial[0];
}
function findCupSize(brand, diamMm) {
  // Press-fit: cup OD ≈ acetabular diameter + 2mm
  const target = diamMm + 2;
  const closest = brand.sizes.reduce((prev, cur) =>
    Math.abs(cur - target) < Math.abs(prev - target) ? cur : prev
  );
  return closest;
}
function findStemSize(brand, canalMm) {
  const match = brand.sizes.find((s) => canalMm >= s.canalMin && canalMm <= s.canalMax);
  return match ?? (canalMm < brand.sizes[0].canalMin ? brand.sizes[0] : brand.sizes[brand.sizes.length - 1]);
}

// ─── Line selector helper ─────────────────────────────────────────────────────

const LINE_TYPE_LABEL = {
  ruler: "Ruler", lld: "LLD", axis: "Axis",
  offset: "Offset", femoralOffset: "Fem. Offset", globalOffset: "Global Offset",
};

function getRulerLines(lines, mmPerPixel) {
  if (!mmPerPixel || !lines?.length) return [];
  return lines
    .filter((l) => ["ruler", "lld", "offset", "axis", "femoralOffset", "globalOffset"].includes(l.type))
    .map((l) => {
      const px = Math.hypot((l.x2 || 0) - (l.x1 || 0), (l.y2 || 0) - (l.y1 || 0));
      const mm = px * mmPerPixel;
      const label = l.name?.trim() || LINE_TYPE_LABEL[l.type] || l.type || "LINE";
      return { id: String(l.id), name: label, type: l.type, mm: +mm.toFixed(1) };
    })
    .filter((l) => l.mm > 5);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BrandChip({ brand, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black transition active:scale-95"
      style={active
        ? { backgroundColor: brand.color, color: "#fff", borderColor: brand.color }
        : { backgroundColor: brand.lightColor, color: brand.color, borderColor: brand.color + "44" }
      }
    >
      {brand.name}
    </button>
  );
}

function MeasureInput({ label, hint, lines, selectedId, onSelectId, manualVal, onManualVal, calibrated }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      {hint && <p className="text-[9px] text-slate-400">{hint}</p>}
      {calibrated && lines.length > 0 && (
        <select
          value={selectedId}
          onChange={(e) => { onSelectId(e.target.value); if (e.target.value) onManualVal(""); }}
          className="w-full rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">— Pilih garis pengukuran —</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>{l.name} — {l.mm} mm</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={manualVal}
          onChange={(e) => { onManualVal(e.target.value); onSelectId(""); }}
          placeholder="Input manual (mm)"
          className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <span className="text-[10px] font-bold text-slate-400 shrink-0">mm</span>
      </div>
    </div>
  );
}

function SizeResultRow({ label, size, apMl, color, lightColor, isMatch }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 rounded-2xl border px-3 py-2.5"
      style={{ borderColor: isMatch ? color : "#e2e8f0", backgroundColor: isMatch ? lightColor : "rgba(255,255,255,0.7)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
        style={{ backgroundColor: color }}>
        {size}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{label}</p>
        <p className="text-xs text-slate-600 font-semibold">{apMl}</p>
      </div>
      {isMatch && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color }} />}
    </motion.div>
  );
}

// ─── Reference Table ──────────────────────────────────────────────────────────



function KneeRefTable({ brand }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Femoral Component</p>
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500" style={{ backgroundColor: brand.lightColor }}>
                <th className="px-3 py-2 text-left">Size</th>
                <th className="px-3 py-2 text-right">AP (mm)</th>
                <th className="px-3 py-2 text-right">ML (mm)</th>
                <th className="px-3 py-2 text-right">Distal H (mm)</th>
              </tr>
            </thead>
            <tbody>
              {brand.femoral.map((row, i) => (
                <tr key={row.size} className={i % 2 === 0 ? "bg-white/70" : "bg-slate-50/70"}>
                  <td className="px-3 py-2 font-black" style={{ color: brand.color }}>{row.size}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.ap}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.ml}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{row.distalH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Tibial Component</p>
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500" style={{ backgroundColor: brand.lightColor }}>
                <th className="px-3 py-2 text-left">Size</th>
                <th className="px-3 py-2 text-right">ML (mm)</th>
                <th className="px-3 py-2 text-right">AP (mm)</th>
              </tr>
            </thead>
            <tbody>
              {brand.tibial.map((row, i) => (
                <tr key={row.size} className={i % 2 === 0 ? "bg-white/70" : "bg-slate-50/70"}>
                  <td className="px-3 py-2 font-black" style={{ color: brand.color }}>{row.size}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.ml}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{row.ap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Poly Insert Options</p>
        <div className="flex flex-wrap gap-1.5">
          {brand.poly.map((p) => (
            <span key={p} className="rounded-lg px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: brand.color }}>
              {p} mm
            </span>
          ))}
        </div>
      </div>

      {brand.note && (
        <p className="text-[9px] text-slate-400 italic border-t border-slate-200 pt-2">{brand.note}</p>
      )}
    </div>
  );
}

function HipCupRefTable({ brand }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500" style={{ backgroundColor: brand.lightColor }}>
              <th className="px-3 py-2 text-left">OD Cup (mm)</th>
              <th className="px-3 py-2 text-right">Target Acetabulum (mm)</th>
            </tr>
          </thead>
          <tbody>
            {brand.sizes.map((s, i) => (
              <tr key={s} className={i % 2 === 0 ? "bg-white/70" : "bg-slate-50/70"}>
                <td className="px-3 py-2 font-black" style={{ color: brand.color }}>{s} mm</td>
                <td className="px-3 py-2 text-right text-slate-500">{s - 2}–{s - 1} mm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Liner Options</p>
        <div className="flex flex-wrap gap-1.5">
          {brand.liner.map((l) => (
            <span key={l} className="rounded-lg px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: brand.color }}>
              {l}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-slate-400 italic border-t border-slate-200 pt-2">{brand.rule}</p>
    </div>
  );
}

function HipStemRefTable({ brand }) {
  const hasProxML = brand.sizes.some((s) => s.proxML != null);
  const hasCement = brand.sizes.some((s) => s.cementMantle != null);
  return (
    <div className="space-y-3">
      {/* Badge cemented / cementless */}
      <div className="flex items-center gap-2">
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: brand.lightColor, color: brand.color }}
        >
          {brand.cemented ? "Cemented" : "Cementless"}
        </span>
        <span className="text-[9px] text-slate-400">{brand.maker}</span>
      </div>
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500" style={{ backgroundColor: brand.lightColor }}>
              <th className="px-3 py-2 text-left">Size</th>
              <th className="px-3 py-2 text-right">Canal Min (mm)</th>
              <th className="px-3 py-2 text-right">Canal Max (mm)</th>
              {hasProxML && <th className="px-3 py-2 text-right">Prox ML (mm)</th>}
              {hasCement && <th className="px-3 py-2 text-right">Cement Mantle (mm)</th>}
            </tr>
          </thead>
          <tbody>
            {brand.sizes.map((s, i) => (
              <tr key={s.size} className={i % 2 === 0 ? "bg-white/70" : "bg-slate-50/70"}>
                <td className="px-3 py-2 font-black" style={{ color: brand.color }}>{s.size}</td>
                <td className="px-3 py-2 text-right text-slate-700">{s.canalMin}</td>
                <td className="px-3 py-2 text-right text-slate-700">{s.canalMax}</td>
                {hasProxML && <td className="px-3 py-2 text-right text-slate-700">{s.proxML ?? "—"}</td>}
                {hasCement && <td className="px-3 py-2 text-right text-slate-700">{s.cementMantle ?? "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {brand.note && (
        <p className="text-[9px] text-slate-400 italic border-t border-slate-200 pt-2">{brand.note}</p>
      )}
    </div>
  );
}

// ─── Knee Estimation Panel ────────────────────────────────────────────────────

function KneeEstimation({ brand, rulerLines, calibrated }) {
  const [femApLineId, setFemApLineId] = useState("");
  const [femApManual, setFemApManual] = useState("");
  const [tibMlLineId, setTibMlLineId] = useState("");
  const [tibMlManual, setTibMlManual] = useState("");

  const femApMm = useMemo(() => {
    if (femApLineId) return rulerLines.find((l) => l.id === femApLineId)?.mm ?? null;
    const p = parseFloat(femApManual);
    return Number.isFinite(p) && p > 0 ? p : null;
  }, [femApLineId, femApManual, rulerLines]);

  const tibMlMm = useMemo(() => {
    if (tibMlLineId) return rulerLines.find((l) => l.id === tibMlLineId)?.mm ?? null;
    const p = parseFloat(tibMlManual);
    return Number.isFinite(p) && p > 0 ? p : null;
  }, [tibMlLineId, tibMlManual, rulerLines]);

  const femRec = useMemo(() => femApMm ? findKneeFemoral(brand, femApMm) : null, [brand, femApMm]);
  const tibRec = useMemo(() => tibMlMm ? findKneeTibial(brand, tibMlMm) : null, [brand, tibMlMm]);

  // Overhang / notching warning
  const notchRisk = femRec && femApMm && femRec.ap < femApMm - 3;

  return (
    <div className="space-y-4">
      <MeasureInput
        label="Femoral AP — Distal Femur"
        hint="Lateral view: dari anterior cortex ke posterior condyle. Pilih ukuran komponen ≤ nilai ini."
        lines={rulerLines} selectedId={femApLineId} onSelectId={setFemApLineId}
        manualVal={femApManual} onManualVal={setFemApManual} calibrated={calibrated}
      />
      <MeasureInput
        label="Tibial ML — Plateau Width"
        hint="AP view: lebar mediolateral tibial plateau. Ukuran tibial komponen tidak boleh overhang."
        lines={rulerLines} selectedId={tibMlLineId} onSelectId={setTibMlLineId}
        manualVal={tibMlManual} onManualVal={setTibMlManual} calibrated={calibrated}
      />

      <AnimatePresence>
        {(femRec || tibRec) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Rekomendasi Ukuran</p>

            {femRec && (
              <SizeResultRow
                label={`Femoral Component — ${brand.name}`}
                size={`F${femRec.size}`}
                apMl={`AP ${femRec.ap} mm · ML ${femRec.ml} mm · Distal H ${femRec.distalH} mm`}
                color={brand.color} lightColor={brand.lightColor} isMatch
              />
            )}
            {tibRec && (
              <SizeResultRow
                label={`Tibial Component — ${brand.name}`}
                size={`T${tibRec.size}`}
                apMl={`ML ${tibRec.ml} mm · AP ${tibRec.ap} mm`}
                color={brand.color} lightColor={brand.lightColor} isMatch
              />
            )}

            {/* Size match check */}
            {femRec && tibRec && (
              <div className={`flex items-start gap-2 rounded-2xl border px-3 py-2 ${
                femRec.size === tibRec.size
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50"
              }`}>
                {femRec.size === tibRec.size
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                  : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                }
                <div>
                  <p className={`text-[10px] font-black ${femRec.size === tibRec.size ? "text-green-800" : "text-amber-800"}`}>
                    {femRec.size === tibRec.size
                      ? `Size match: Femoral ${femRec.size} = Tibial ${tibRec.size}`
                      : `Size mismatch: Femoral ${femRec.size} ≠ Tibial ${tibRec.size}`
                    }
                  </p>
                  <p className={`text-[9px] mt-0.5 ${femRec.size === tibRec.size ? "text-green-600" : "text-amber-600"}`}>
                    {femRec.size === tibRec.size
                      ? "Femoral dan tibial size konsisten — lanjutkan ke trial."
                      : "Cek ulang pengukuran atau pertimbangkan mismatch femoral-tibial sesuai anatomy."
                    }
                  </p>
                </div>
              </div>
            )}

            {notchRisk && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                <p className="text-[9px] text-amber-700">
                  Perbedaan AP femur vs komponen {'>'} 3mm — risiko overhang posterior. Pertimbangkan 1 size lebih besar atau cek templating.
                </p>
              </div>
            )}

            {/* Poly options */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Poly Insert Options</p>
              <div className="flex flex-wrap gap-1.5">
                {brand.poly.map((p) => (
                  <span key={p} className="rounded-lg px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: brand.color }}>
                    {p} mm
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Hip Cup Estimation ───────────────────────────────────────────────────────

function HipCupEstimation({ brand, rulerLines, calibrated }) {
  const [lineId, setLineId] = useState("");
  const [manual, setManual] = useState("");
  const [showOrientation, setShowOrientation] = useState(false);

  const activeMm = useMemo(() => {
    if (lineId) return rulerLines.find((l) => l.id === lineId)?.mm ?? null;
    const p = parseFloat(manual);
    return Number.isFinite(p) && p > 0 ? p : null;
  }, [lineId, manual, rulerLines]);

  const rec = useMemo(() => activeMm ? findCupSize(brand, activeMm) : null, [brand, activeMm]);
  const alt1 = rec ? brand.sizes.find((s) => s === rec - 2) ?? null : null;
  const alt2 = rec ? brand.sizes.find((s) => s === rec + 2) ?? null : null;

  return (
    <div className="space-y-4">
      <MeasureInput
        label="Diameter Acetabulum"
        hint="Ukur diameter lingkaran acetabulum terluar pada AP pelvis."
        lines={rulerLines} selectedId={lineId} onSelectId={setLineId}
        manualVal={manual} onManualVal={setManual} calibrated={calibrated}
      />
      <AnimatePresence>
        {rec && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <SizeResultRow label={`Cup Direkomendasikan — ${brand.name}`} size={`${rec}mm`}
              apMl={`OD ${rec}mm · Target reaming ${rec - 2}–${rec - 1}mm`}
              color={brand.color} lightColor={brand.lightColor} isMatch />
            {alt1 && <SizeResultRow label="Alternatif lebih kecil" size={`${alt1}mm`}
              apMl={`Jika bone coverage kurang / cup kedalaman dangkal`}
              color="#94a3b8" lightColor="#f8fafc" isMatch={false} />}
            {alt2 && <SizeResultRow label="Alternatif lebih besar" size={`${alt2}mm`}
              apMl={`Jika acetabulum lebih dalam / teknik line-to-line`}
              color="#94a3b8" lightColor="#f8fafc" isMatch={false} />}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Liner Options</p>
              <div className="flex flex-wrap gap-1.5">
                {brand.liner.map((l) => (
                  <span key={l} className="rounded-lg px-2 py-1 text-[10px] font-black text-white" style={{ backgroundColor: brand.color }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cup Orientation toggle */}
      <button
        type="button"
        onClick={() => setShowOrientation((v) => !v)}
        className="w-full rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-left text-[10px] font-black text-sky-700 transition hover:bg-sky-100 active:scale-[0.98]"
      >
        {showOrientation ? "▲" : "▼"} Cup Orientation — Anteinclination & Safe Zone
      </button>
      <AnimatePresence>
        {showOrientation && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <CupOrientationCard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Cup Anteinclination / Orientation ───────────────────────────────────────

const LEWINNEK = { abdMin: 30, abdMax: 50, antMin: 5, antMax: 25 };
const CALLANAN = { abdMin: 30, abdMax: 45, antMin: 10, antMax: 25 };

function cupZoneStatus(abd, ant) {
  const inLewinnek = abd >= LEWINNEK.abdMin && abd <= LEWINNEK.abdMax && ant >= LEWINNEK.antMin && ant <= LEWINNEK.antMax;
  const inCallanan = abd >= CALLANAN.abdMin && abd <= CALLANAN.abdMax && ant >= CALLANAN.antMin && ant <= CALLANAN.antMax;
  if (inCallanan) return { label: "Safe Zone Optimal", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "✓" };
  if (inLewinnek) return { label: "Safe Zone Lewinnek", color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "~" };
  return { label: "Di Luar Safe Zone", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "!" };
}

function CupOrientationSVG({ abd = 40, ant = 15 }) {
  // Acetabulum opening visualized as ellipse (abduction = tilt, anteversion = ellipse ratio)
  const cx = 100, cy = 100, r = 70;
  // Abduction: rotation in coronal plane — affects ellipse vertical axis
  const abdRad = (abd * Math.PI) / 180;
  const antRad = (ant * Math.PI) / 180;
  const ry = r * Math.sin(abdRad);
  const rx = r;
  // Anteversion shifts the center of the liner ellipse
  const linerRy = (r - 10) * Math.sin(abdRad);
  const linerRx = r - 10;

  // Safe zone arc markers on the ring (abduction 30–50°)
  const abdMinRad = (LEWINNEK.abdMin * Math.PI) / 180;
  const abdMaxRad = (LEWINNEK.abdMax * Math.PI) / 180;

  const lewinnekColor = "#16a34a";
  const outColor = "#e2e8f0";

  return (
    <svg viewBox="0 0 200 200" className="w-full" style={{ maxHeight: 200 }}>
      {/* Background circle — pelvis acetabulum ring */}
      <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={outColor} strokeWidth="2"/>
      {/* Safe zone arc (abduction 30–50°) */}
      <path
        d={`M ${cx + (r+8)*Math.cos(Math.PI/2 - abdMaxRad)} ${cy - (r+8)*Math.sin(Math.PI/2 - abdMaxRad)}
            A ${r+8} ${r+8} 0 0 1 ${cx + (r+8)*Math.cos(Math.PI/2 - abdMinRad)} ${cy - (r+8)*Math.sin(Math.PI/2 - abdMinRad)}`}
        fill="none" stroke={lewinnekColor} strokeWidth="5" strokeLinecap="round" opacity="0.3"
      />
      {/* Outer cup shell (ellipse showing abduction tilt) */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill="#f8fafc" stroke="#334155" strokeWidth="2.5"/>
      {/* Liner inner ellipse (shifted slightly for anteversion) */}
      <ellipse
        cx={cx + Math.sin(antRad) * 12}
        cy={cy}
        rx={linerRx} ry={linerRy}
        fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2"/>
      {/* Center crosshair */}
      <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke="#94a3b8" strokeWidth="1"/>
      <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="#94a3b8" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r="3" fill="#334155"/>
      {/* Screw holes */}
      {[45, 135, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const hx = cx + (r * 0.6) * Math.cos(rad);
        const hy = cy + (r * 0.6) * Math.sin(abdRad) * Math.sin(rad);
        return <circle key={deg} cx={hx} cy={hy} r="5" fill="none" stroke="#94a3b8" strokeWidth="1.2"/>;
      })}
      {/* Abduction angle arc */}
      <path
        d={`M ${cx} ${cy - 40} A 40 40 0 0 0 ${cx + 40 * Math.sin(abdRad)} ${cy - 40 * Math.cos(abdRad)}`}
        fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="3 2"
      />
      <text x={cx + 14} y={cy - 26} fontSize="9" fill="#0ea5e9" fontWeight="bold" fontFamily="monospace">{abd}°</text>
      {/* Anteversion label */}
      <text x={cx + 46} y={cy + ry - 4} fontSize="9" fill="#7c3aed" fontWeight="bold" fontFamily="monospace">{ant}° AV</text>
      {/* Labels */}
      <text x={cx} y={18} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="monospace">SUPERIOR</text>
      <text x={cx} y={192} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="monospace">INFERIOR</text>
      <text x={8} y={cy + 3} textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="monospace" transform={`rotate(-90,8,${cy})`}>MEDIAL</text>
      <text x={192} y={cy + 3} textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="monospace" transform={`rotate(90,192,${cy})`}>LATERAL</text>
    </svg>
  );
}

function CupOrientationCard() {
  const [abd, setAbd] = useState("40");
  const [ant, setAnt] = useState("15");
  const [stemAnt, setStemAnt] = useState("15");

  const abdVal = parseFloat(abd);
  const antVal = parseFloat(ant);
  const stemVal = parseFloat(stemAnt);
  const validAbd = Number.isFinite(abdVal) && abdVal > 0 && abdVal < 90;
  const validAnt = Number.isFinite(antVal) && antVal >= 0 && antVal < 60;
  const validStem = Number.isFinite(stemVal) && stemVal >= 0 && stemVal < 60;

  const zone = validAbd && validAnt ? cupZoneStatus(abdVal, antVal) : null;
  const combined = validAnt && validStem ? antVal + stemVal : null;
  const combinedOk = combined !== null && combined >= 25 && combined <= 50;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Cup Orientation — Anteinclination</p>
        <p className="text-[9px] text-slate-400 mt-0.5">Abduction (inclination) + Anteversion. Safe zone Lewinnek & Callanan.</p>
      </div>
      <div className="p-4 space-y-4">
        {/* Visualisasi */}
        {validAbd && validAnt && (
          <div style={{ maxWidth: 180, margin: "0 auto" }}>
            <CupOrientationSVG abd={abdVal} ant={antVal} />
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Abduction / Inclination</p>
            <div className="flex items-center gap-1.5">
              <input type="number" value={abd} onChange={e => setAbd(e.target.value)} min="0" max="90"
                placeholder="40"
                className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">°</span>
            </div>
            <p className="text-[8px] text-slate-400">Target: 30–50° (Lewinnek)</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Anteversion Cup</p>
            <div className="flex items-center gap-1.5">
              <input type="number" value={ant} onChange={e => setAnt(e.target.value)} min="0" max="60"
                placeholder="15"
                className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">°</span>
            </div>
            <p className="text-[8px] text-slate-400">Target: 5–25° (Lewinnek)</p>
          </div>
        </div>

        {/* Safe zone result */}
        {zone && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border px-3 py-2.5 space-y-1"
            style={{ backgroundColor: zone.bg, borderColor: zone.border }}>
            <p className="text-[11px] font-black" style={{ color: zone.color }}>
              {zone.icon} {zone.label}
            </p>
            <div className="grid grid-cols-2 gap-2 text-[9px]" style={{ color: zone.color }}>
              <span>Abduction: <strong>{abdVal}°</strong> {abdVal >= LEWINNEK.abdMin && abdVal <= LEWINNEK.abdMax ? "✓" : "✗"} (30–50°)</span>
              <span>Anteversion: <strong>{antVal}°</strong> {antVal >= LEWINNEK.antMin && antVal <= LEWINNEK.antMax ? "✓" : "✗"} (5–25°)</span>
            </div>
            <p className="text-[8px] opacity-70">Callanan optimal zone: Abd 30–45° · AV 10–25°</p>
          </motion.div>
        )}

        {/* Combined anteversion (Ranawat) */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Combined Anteversion (Ranawat)</p>
          <p className="text-[8px] text-slate-400">Cup AV + Stem AV. Target: 25–50°</p>
          <div className="flex items-center gap-1.5">
            <input type="number" value={stemAnt} onChange={e => setStemAnt(e.target.value)} min="0" max="60"
              placeholder="15"
              className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"/>
            <span className="text-[10px] font-bold text-slate-400 shrink-0">° stem AV</span>
          </div>
          {combined !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${combinedOk ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <span className={`text-[11px] font-black ${combinedOk ? "text-green-700" : "text-red-600"}`}>
                Combined AV: {combined.toFixed(1)}° {combinedOk ? "✓ OK" : "✗ Di luar target"}
              </span>
            </motion.div>
          )}
        </div>

        {/* Reference table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-2 py-1.5 text-left">Referensi</th>
                <th className="px-2 py-1.5 text-center">Abduction</th>
                <th className="px-2 py-1.5 text-center">Anteversion</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ref: "Lewinnek (1978)", abd: "30–50°", ant: "5–25°" },
                { ref: "Callanan (2011)", abd: "30–45°", ant: "10–25°" },
                { ref: "Ranawat Combined AV", abd: "—", ant: "25–50° (cup+stem)" },
              ].map((row, i) => (
                <tr key={row.ref} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-2 py-1.5 font-bold text-slate-700">{row.ref}</td>
                  <td className="px-2 py-1.5 text-center text-slate-600">{row.abd}</td>
                  <td className="px-2 py-1.5 text-center text-slate-600">{row.ant}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Hip Stem Estimation ──────────────────────────────────────────────────────

function HipStemEstimation({ brand, rulerLines, calibrated }) {
  const [lineId, setLineId] = useState("");
  const [manual, setManual] = useState("");

  const activeMm = useMemo(() => {
    if (lineId) return rulerLines.find((l) => l.id === lineId)?.mm ?? null;
    const p = parseFloat(manual);
    return Number.isFinite(p) && p > 0 ? p : null;
  }, [lineId, manual, rulerLines]);

  const rec = useMemo(() => activeMm ? findStemSize(brand, activeMm) : null, [brand, activeMm]);

  return (
    <div className="space-y-4">
      <MeasureInput
        label="Lebar Canal Isthmus"
        hint="Lateral femur: lebar medullary canal di titik isthmus (penyempitan terkecil)."
        lines={rulerLines} selectedId={lineId} onSelectId={setLineId}
        manualVal={manual} onManualVal={setManual} calibrated={calibrated}
      />
      <AnimatePresence>
        {rec && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <SizeResultRow label={`Stem Direkomendasikan — ${brand.name}`} size={rec.size}
              apMl={[
                `Canal target: ${rec.canalMin}–${rec.canalMax} mm · Nilai Anda: ${activeMm} mm`,
                rec.proxML != null ? `Proximal ML: ${rec.proxML} mm` : null,
                rec.cementMantle != null ? `Cement mantle min: ${rec.cementMantle} mm` : null,
                brand.cemented != null ? (brand.cemented ? "Cemented stem" : "Cementless stem") : null,
              ].filter(Boolean).join(" · ")}
              color={brand.color} lightColor={brand.lightColor} isMatch />
            {brand.note && (
              <p className="text-[9px] text-slate-400 italic border-t border-slate-100 pt-2">{brand.note}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ImplantSizePanel({ isOpen, onClose, lines = [], mmPerPixel = null }) {
  const [procedure, setProcedure] = useState("knee");
  const [activeTab, setActiveTab] = useState("estimasi"); // "estimasi" | "referensi"
  const [kneeBrandId, setKneeBrandId] = useState("depuy_attune");
  const [cupBrandId, setCupBrandId] = useState("depuy_pinnacle");
  const [stemBrandId, setStemBrandId] = useState("depuy_corail");

  const rulerLines = useMemo(() => getRulerLines(lines, mmPerPixel), [lines, mmPerPixel]);
  const calibrated = mmPerPixel !== null;

  const kneeBrand = KNEE_BRANDS.find((b) => b.id === kneeBrandId) ?? KNEE_BRANDS[0];
  const cupBrand = CUP_BRANDS.find((b) => b.id === cupBrandId) ?? CUP_BRANDS[0];
  const stemBrand = STEM_BRANDS.find((b) => b.id === stemBrandId) ?? STEM_BRANDS[0];

  const PROCEDURES = [
    { key: "knee",     label: "Knee TKA",  color: "#7c3aed" },
    { key: "hip-cup",  label: "Hip Cup",   color: "#0369a1" },
    { key: "hip-stem", label: "Hip Stem",  color: "#0d9488" },
  ];

  if (typeof document === "undefined") return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/40 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="max-h-[94dvh] w-full max-w-[min(100%,560px)] overflow-hidden rounded-t-[28px] rounded-b-[28px] border border-white/60 bg-[#f1f5f9] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px] flex flex-col"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-teal-900/20 bg-[#0f2d2a] px-5 py-4 shrink-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-teal-600">
                <Zap className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Estimator Ukuran Implan</p>
                <p className="text-[10px] text-teal-300">4 brand · Data dimensi aktual dari surgical guide resmi</p>
              </div>
              <button type="button" onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-teal-200 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-200/70 bg-white/60 px-4 pt-3 gap-1 shrink-0">
              {[
                { id: "estimasi", label: "Estimasi", icon: Zap },
                { id: "referensi", label: "Referensi Ukuran", icon: TableProperties },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-[11px] font-black transition ${
                    activeTab === id
                      ? "bg-[#f1f5f9] text-slate-800 border-b-2 border-teal-500"
                      : "text-slate-400 hover:text-slate-600"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 px-5 py-5">

                {/* Calibration warning */}
                {!calibrated && activeTab === "estimasi" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-800">Kalibrasi belum aktif</p>
                      <p className="text-[10px] text-amber-600">Kalibrasi X-ray dulu untuk pilih dari garis. Atau input nilai mm manual.</p>
                    </div>
                  </motion.div>
                )}

                {/* Procedure selector */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tipe Prosedur</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PROCEDURES.map((p) => (
                      <button key={p.key} type="button"
                        onClick={() => setProcedure(p.key)}
                        className="min-h-10 rounded-2xl border text-[10px] font-black transition active:scale-[0.97]"
                        style={procedure === p.key
                          ? { backgroundColor: p.color, color: "#fff", borderColor: p.color }
                          : { borderColor: "#e2e8f0", backgroundColor: "rgba(255,255,255,0.6)", color: "#94a3b8" }
                        }>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand selector */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Brand Implan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {procedure === "knee" && KNEE_BRANDS.map((b) => (
                      <BrandChip key={b.id} brand={b} active={kneeBrandId === b.id} onClick={() => setKneeBrandId(b.id)} />
                    ))}
                    {procedure === "hip-cup" && CUP_BRANDS.map((b) => (
                      <BrandChip key={b.id} brand={b} active={cupBrandId === b.id} onClick={() => setCupBrandId(b.id)} />
                    ))}
                    {procedure === "hip-stem" && STEM_BRANDS.map((b) => (
                      <BrandChip key={b.id} brand={b} active={stemBrandId === b.id} onClick={() => setStemBrandId(b.id)} />
                    ))}
                  </div>
                </div>

                {/* Content by tab */}
                <AnimatePresence mode="wait">
                  <motion.div key={`${activeTab}-${procedure}-${kneeBrandId}-${cupBrandId}-${stemBrandId}`}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                    {activeTab === "estimasi" ? (
                      <>
                        {procedure === "knee" && <KneeEstimation brand={kneeBrand} rulerLines={rulerLines} calibrated={calibrated} />}
                        {procedure === "hip-cup" && <HipCupEstimation brand={cupBrand} rulerLines={rulerLines} calibrated={calibrated} />}
                        {procedure === "hip-stem" && <HipStemEstimation brand={stemBrand} rulerLines={rulerLines} calibrated={calibrated} />}
                      </>
                    ) : (
                      <>
                        {procedure === "knee" && <KneeRefTable brand={kneeBrand} />}
                        {procedure === "hip-cup" && <HipCupRefTable brand={cupBrand} />}
                        {procedure === "hip-stem" && <HipStemRefTable brand={stemBrand} />}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Disclaimer */}
                <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white/50 p-3">
                  <Info className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <p className="text-[9px] text-slate-500">
                    Data dimensi bersumber dari surgical technique guide resmi masing-masing brand. Verifikasi akhir wajib dilakukan oleh dokter bedah berdasarkan templating langsung, X-ray terkalibrasi, dan penilaian klinis intraoperatif.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200/60 bg-[#f1f5f9] px-5 py-4 shrink-0">
              <button type="button" onClick={onClose}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-600 transition active:scale-[0.98]">
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
