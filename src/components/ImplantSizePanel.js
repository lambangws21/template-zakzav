"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";

// ─── Size estimation logic ────────────────────────────────────────────────────
// Based on common orthopedic templating guidelines:
//   Cup:  acetabular diameter measured on AP pelvis X-ray
//         recommended cup = true acetabular diameter + 2mm (press-fit)
//   Stem: femoral canal width at isthmus
//         recommend size class from canal width
//   Knee: tibial plateau ML width → tibial component size
//         femoral AP measurement → femoral component size

const CUP_SIZE_CHART = [
  { minMm: 36, maxMm: 41, sizeMm: 44, note: "Kecil — pastikan tidak ada impingement" },
  { minMm: 42, maxMm: 45, sizeMm: 48, note: "Ukuran standar" },
  { minMm: 46, maxMm: 49, sizeMm: 52, note: "Ukuran standar" },
  { minMm: 50, maxMm: 53, sizeMm: 56, note: "Ukuran standar" },
  { minMm: 54, maxMm: 57, sizeMm: 60, note: "Besar — periksa offset" },
  { minMm: 58, maxMm: 65, sizeMm: 64, note: "Besar — pertimbangkan custom" },
];

const STEM_SIZE_CHART = [
  { minMm: 8, maxMm: 11, size: "XS / 1", note: "Canal kecil — perhatikan fill ratio" },
  { minMm: 12, maxMm: 14, size: "S / 2", note: "Ukuran standar" },
  { minMm: 15, maxMm: 17, size: "M / 3", note: "Ukuran standar" },
  { minMm: 18, maxMm: 20, size: "L / 4", note: "Diaphyseal fit baik" },
  { minMm: 21, maxMm: 24, size: "XL / 5", note: "Besar — pastikan primary stability" },
  { minMm: 25, maxMm: 35, size: "XXL / 6+", note: "Sangat besar — konfirmasi dengan CT" },
];

const KNEE_SIZE_CHART = [
  // Tibial ML width → component size
  { minMm: 60, maxMm: 67, size: "1 / XS", note: "Pasien kecil" },
  { minMm: 68, maxMm: 73, size: "2 / S", note: "Ukuran standar kecil" },
  { minMm: 74, maxMm: 80, size: "3 / M", note: "Ukuran paling umum" },
  { minMm: 81, maxMm: 87, size: "4 / L", note: "Ukuran standar besar" },
  { minMm: 88, maxMm: 95, size: "5 / XL", note: "Pasien besar" },
  { minMm: 96, maxMm: 110, size: "6 / XXL", note: "Ukuran besar" },
];

function findCupSize(diamMm) {
  const match = CUP_SIZE_CHART.find((r) => diamMm >= r.minMm && diamMm <= r.maxMm);
  return match || (diamMm < 36 ? CUP_SIZE_CHART[0] : CUP_SIZE_CHART[CUP_SIZE_CHART.length - 1]);
}
function findStemSize(canalMm) {
  const match = STEM_SIZE_CHART.find((r) => canalMm >= r.minMm && canalMm <= r.maxMm);
  return match || (canalMm < 8 ? STEM_SIZE_CHART[0] : STEM_SIZE_CHART[STEM_SIZE_CHART.length - 1]);
}
function findKneeSize(tibialMm) {
  const match = KNEE_SIZE_CHART.find((r) => tibialMm >= r.minMm && tibialMm <= r.maxMm);
  return match || (tibialMm < 60 ? KNEE_SIZE_CHART[0] : KNEE_SIZE_CHART[KNEE_SIZE_CHART.length - 1]);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const LINE_TYPE_LABEL = {
  ruler: "Ruler",
  lld: "LLD",
  axis: "Axis",
  offset: "Offset",
  femoralOffset: "Fem. Offset",
  globalOffset: "Global Offset",
};

function getRulerLinesByType(lines, mmPerPixel) {
  if (!mmPerPixel || !lines?.length) return [];
  return lines
    .filter((l) => l.type === "ruler" || l.type === "lld" || l.type === "offset" || l.type === "axis" || l.type === "femoralOffset" || l.type === "globalOffset")
    .map((l) => {
      // lines use x1,y1,x2,y2
      const px = Math.hypot((l.x2 || 0) - (l.x1 || 0), (l.y2 || 0) - (l.y1 || 0));
      const mm = px * mmPerPixel;
      const label = (l.name && l.name.trim()) ? l.name.trim() : (LINE_TYPE_LABEL[l.type] || l.type || "LINE");
      return {
        id: String(l.id),
        name: label,
        type: l.type,
        mm: +mm.toFixed(1),
      };
    })
    .filter((l) => l.mm > 5);
}

// ─── Result Card ─────────────────────────────────────────────────────────────

function ResultCard({ icon: Icon, title, subtitle, note, color, highlight }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-3.5 ${highlight
        ? "border-blue-200 bg-blue-50"
        : "border-slate-200 bg-white/70"}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{subtitle}</p>
          <p className="text-lg font-black text-slate-900">{title}</p>
          {note && <p className="mt-0.5 text-[10px] text-slate-500">{note}</p>}
        </div>
        {highlight && <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />}
      </div>
    </motion.div>
  );
}

// ─── Line Selector ────────────────────────────────────────────────────────────

function LineSelector({ label, lines, value, onChange, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</label>
      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[10px] text-slate-400">
          Belum ada garis ruler. Buat dulu dengan tool Ruler di canvas.
        </p>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">— Pilih garis pengukuran —</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} — {l.mm} mm
            </option>
          ))}
        </select>
      )}
      {hint && <p className="text-[9px] text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Manual Input ─────────────────────────────────────────────────────────────

function ManualInput({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <span className="text-[10px] font-bold text-slate-400">mm</span>
      </div>
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ImplantSizePanel({
  isOpen,
  onClose,
  lines = [],
  mmPerPixel = null,
}) {
  const [procedure, setProcedure] = useState("hip");
  const [selectedLineId, setSelectedLineId] = useState("");
  const [manualMm, setManualMm] = useState("");

  const rulerLines = useMemo(() => getRulerLinesByType(lines, mmPerPixel), [lines, mmPerPixel]);

  const activeMm = useMemo(() => {
    if (selectedLineId) {
      const found = rulerLines.find((l) => l.id === selectedLineId);
      return found?.mm || null;
    }
    const parsed = parseFloat(manualMm);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [selectedLineId, manualMm, rulerLines]);

  const estimates = useMemo(() => {
    if (!activeMm) return null;
    if (procedure === "hip-cup") {
      const rec = findCupSize(activeMm);
      return {
        primary: { title: `${rec.sizeMm} mm Cup`, subtitle: "Ukuran Cup Direkomendasikan", note: rec.note, color: "bg-blue-600", highlight: true },
        secondary: [
          { title: `${rec.sizeMm - 2} mm`, subtitle: "Alternatif (lebih kecil)", note: "Jika bone coverage kurang", color: "bg-slate-500" },
          { title: `${rec.sizeMm + 2} mm`, subtitle: "Alternatif (lebih besar)", note: "Jika acetabulum lebih dalam", color: "bg-slate-500" },
        ],
        input: { label: "Diameter Acetabulum Diukur", value: activeMm },
      };
    }
    if (procedure === "hip-stem") {
      const rec = findStemSize(activeMm);
      return {
        primary: { title: `Ukuran ${rec.size}`, subtitle: "Ukuran Stem Direkomendasikan", note: rec.note, color: "bg-teal-600", highlight: true },
        secondary: [],
        input: { label: "Lebar Canal Isthmus", value: activeMm },
      };
    }
    if (procedure === "knee") {
      const rec = findKneeSize(activeMm);
      return {
        primary: { title: `Size ${rec.size}`, subtitle: "Ukuran Tibial Component", note: rec.note, color: "bg-purple-600", highlight: true },
        secondary: [
          { title: `Size ${rec.size} -1`, subtitle: "Alternatif kecil", note: "Jika overhang posterior", color: "bg-slate-500" },
        ],
        input: { label: "Lebar ML Tibial Plateau", value: activeMm },
      };
    }
    return null;
  }, [activeMm, procedure]);

  const calibrated = mmPerPixel !== null;

  if (typeof document === "undefined") return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/40 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="max-h-[94dvh] w-full max-w-[min(100%,520px)] overflow-hidden rounded-t-[28px] rounded-b-[28px] border border-white/60 bg-[#f1f5f9] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px]"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-teal-900/20 bg-[#0f2d2a] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-teal-600">
                <Zap className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Estimator Ukuran Implan</p>
                <p className="text-[10px] text-teal-300">Rekomendasi berdasarkan pengukuran anatomy</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-teal-200 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(94dvh-80px)] overflow-y-auto">
              <div className="space-y-5 px-5 py-5">

                {/* Calibration warning */}
                {!calibrated && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-800">Kalibrasi belum aktif</p>
                      <p className="text-[10px] text-amber-600">Kalibrasi X-ray terlebih dahulu untuk rekomendasi berbasis garis. Atau masukkan nilai mm secara manual di bawah.</p>
                    </div>
                  </motion.div>
                )}

                {/* Procedure selector */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tipe Prosedur</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: "hip-cup", label: "Hip Cup", color: "text-blue-700 bg-blue-50 border-blue-200" },
                      { key: "hip-stem", label: "Hip Stem", color: "text-teal-700 bg-teal-50 border-teal-200" },
                      { key: "knee", label: "Knee TKA", color: "text-purple-700 bg-purple-50 border-purple-200" },
                    ].map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => { setProcedure(p.key); setSelectedLineId(""); setManualMm(""); }}
                        className={`min-h-10 rounded-2xl border text-[10px] font-black transition active:scale-[0.97] ${
                          procedure === p.key
                            ? p.color + " shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]"
                            : "border-slate-200 bg-white/60 text-slate-500"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Measurement source */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sumber Pengukuran</p>

                  {/* From ruler line */}
                  {calibrated && (
                    <LineSelector
                      label={
                        procedure === "hip-cup" ? "Pilih garis diameter acetabulum" :
                        procedure === "hip-stem" ? "Pilih garis lebar canal isthmus" :
                        "Pilih garis lebar ML tibial plateau"
                      }
                      lines={rulerLines}
                      value={selectedLineId}
                      onChange={(v) => { setSelectedLineId(v); if (v) setManualMm(""); }}
                      hint={
                        procedure === "hip-cup" ? "Ukur diameter lingkaran acetabulum terluar" :
                        procedure === "hip-stem" ? "Ukur lebar femoral canal di titik isthmus" :
                        "Ukur lebar mediolateral plateau tibia"
                      }
                    />
                  )}

                  {/* Divider */}
                  {calibrated && rulerLines.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[9px] text-slate-400">atau input manual</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  )}

                  {/* Manual input */}
                  <ManualInput
                    label={
                      procedure === "hip-cup" ? "Diameter acetabulum (mm)" :
                      procedure === "hip-stem" ? "Lebar canal (mm)" :
                      "Lebar ML tibial plateau (mm)"
                    }
                    value={manualMm}
                    onChange={(v) => { setManualMm(v); if (v) setSelectedLineId(""); }}
                    placeholder={
                      procedure === "hip-cup" ? "mis. 50" :
                      procedure === "hip-stem" ? "mis. 15" :
                      "mis. 76"
                    }
                  />
                </div>

                {/* Results */}
                <AnimatePresence mode="wait">
                  {estimates ? (
                    <motion.div
                      key={`${procedure}-${activeMm}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      {/* Input summary */}
                      <div className="flex items-center gap-2 rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2">
                        <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                        <span className="text-[10px] font-black text-teal-700">
                          {estimates.input.label}: <span className="text-teal-900">{activeMm} mm</span>
                        </span>
                      </div>

                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Rekomendasi</p>
                      <ResultCard {...estimates.primary} icon={Zap} />

                      {estimates.secondary.length > 0 && (
                        <>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Alternatif</p>
                          {estimates.secondary.map((s, i) => (
                            <ResultCard key={i} {...s} icon={TrendingUp} />
                          ))}
                        </>
                      )}

                      {/* Disclaimer */}
                      <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white/50 p-3">
                        <Info className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <p className="text-[9px] text-slate-500">
                          Estimasi berdasarkan panduan templating standar. Keputusan akhir tetap harus dikonfirmasi oleh dokter bedah berdasarkan penilaian klinis dan templating langsung pada X-ray yang sudah dikalibrasi.
                        </p>
                      </div>
                    </motion.div>
                  ) : activeMm === null && (selectedLineId || manualMm) ? (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center"
                    >
                      <p className="text-xs text-slate-400">Nilai pengukuran tidak valid.</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center"
                    >
                      <Zap className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-400">Pilih garis atau masukkan nilai untuk melihat rekomendasi ukuran</p>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* footer */}
            <div className="border-t border-slate-200/60 bg-[#f1f5f9] px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-600 transition active:scale-[0.98]"
              >
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
