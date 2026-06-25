"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp, Info, Ruler, FlaskConical, AlertTriangle } from "lucide-react";

function clampTo(v, decimals = 3) {
  return Math.round(v * 10 ** decimals) / 10 ** decimals;
}

function getDorrType(ci) {
  if (ci === null || !Number.isFinite(ci)) return null;
  if (ci > 0.54) return "A";
  if (ci >= 0.46) return "B";
  return "C";
}

function getCfiType(cfi) {
  if (cfi === null || !Number.isFinite(cfi)) return null;
  if (cfi > 4.7) return "A";
  if (cfi >= 3.0) return "B";
  return "C";
}

function getCcrType(ccr) {
  if (ccr === null || !Number.isFinite(ccr)) return null;
  if (ccr <= 0.575) return "A";
  if (ccr <= 0.615) return "B";
  return "C";
}

const TYPE_COLORS = {
  A: { bg: "bg-emerald-50", border: "border-emerald-300", badge: "bg-emerald-500", text: "text-emerald-800", accent: "#10b981" },
  B: { bg: "bg-amber-50", border: "border-amber-300", badge: "bg-amber-500", text: "text-amber-800", accent: "#f59e0b" },
  C: { bg: "bg-rose-50", border: "border-rose-300", badge: "bg-rose-500", text: "text-rose-800", accent: "#f43f5e" },
};

const TYPE_INFO = {
  A: {
    nickname: "Champagne Flute",
    description: "Korteks tebal, kanal sempit berbentuk corong. Tulang kortikal berkualitas baik dengan flaring normal.",
    patient: "Tulang sehat, biasanya lebih muda, aktivitas tinggi.",
    implant: "Stem cementless tapered-wedge (mis. Accolade, Taperloc, Fitmore) — stabilitas primer sangat baik.",
    warning: null,
    ci_ref: "> 0.54 (mean 0.58)",
  },
  B: {
    nickname: "Intermediate",
    description: "Morfologi transisi antara A dan C. Korteks sedang, flaring moderat.",
    patient: "Umumnya usia pertengahan, kualitas tulang bervariasi.",
    implant: "Cementless atau cemented keduanya viable — pertimbangkan geometri stem secara individual.",
    warning: "Evaluasi kualitas tulang lebih lanjut dengan DXA jika diindikasikan.",
    ci_ref: "0.46–0.54 (mean 0.50)",
  },
  C: {
    nickname: "Stovepipe",
    description: "Korteks tipis, kanal lebar silindris. Sering diasosiasikan dengan osteoporosis.",
    patient: "Umumnya usia lanjut, osteopenia/osteoporosis, aktivitas rendah.",
    implant: "Stem cemented lebih disukai. Stem cementless bisa dipakai jika desain sesuai; waspadai primary stability.",
    warning: "Risiko subsidence lebih tinggi pada stem cementless. Pertimbangkan augmentasi.",
    ci_ref: "< 0.46 (mean 0.42)",
  },
};

const DORR_INFO_FIGURES = {
  ci: {
    label: "CI Lines",
    title: "Cortical Thickness Index",
    src: "/dorr/dorr-ci-cortical-index.png",
    alt: "Cortical thickness index with 10 cm reference, A outer cortex, and B canal width",
    note: "Tempatkan garis A dan B pada level yang sama, 10 cm distal dari mid-lesser trochanter.",
    legend: [
      { key: "A", label: "Outer diameter", text: "Diameter luar korteks femur.", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
      { key: "B", label: "Canal diameter", text: "Diameter kanal intramedular.", className: "border-rose-200 bg-rose-50 text-rose-700" },
      { key: "10cm", label: "Level", text: "Satu level transverse, 10 cm distal dari mid-lesser trochanter.", className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
    ],
  },
  types: {
    label: "Dorr Types",
    title: "Dorr A / B / C",
    src: "/dorr/dorr-types-figure.png",
    alt: "Dorr classification figure showing type A, type B, and type C femoral canal morphology",
    note: "Bandingkan bentuk kanal: A sempit, B transisi, C lebar/stovepipe.",
    legend: [
      { key: "A", label: "Champagne flute", text: "Korteks tebal, kanal sempit.", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
      { key: "B", label: "Intermediate", text: "Morfologi transisi.", className: "border-amber-200 bg-amber-50 text-amber-700" },
      { key: "C", label: "Stovepipe", text: "Korteks tipis, kanal lebar.", className: "border-rose-200 bg-rose-50 text-rose-700" },
    ],
  },
};

const DORR_DARK_MODE_STYLES = `
  [data-theme="dark"] .dorr-panel {
    background: rgba(15, 23, 42, 0.98) !important;
    border-color: rgba(148, 163, 184, 0.28) !important;
    color: #e5edf8 !important;
    box-shadow: 0 24px 54px rgba(0, 0, 0, 0.48) !important;
  }
  [data-theme="dark"] .dorr-panel .bg-white {
    background-color: #1e293b !important;
  }
  [data-theme="dark"] .dorr-panel .bg-slate-50,
  [data-theme="dark"] .dorr-panel .bg-slate-50\\/98 {
    background-color: #111827 !important;
  }
  [data-theme="dark"] .dorr-panel .bg-slate-100 {
    background-color: #263244 !important;
  }
  [data-theme="dark"] .dorr-panel .bg-slate-200\\/60 {
    background-color: rgba(148, 163, 184, 0.18) !important;
  }
  [data-theme="dark"] .dorr-panel .border-slate-200,
  [data-theme="dark"] .dorr-panel .border-slate-300 {
    border-color: rgba(148, 163, 184, 0.28) !important;
  }
  [data-theme="dark"] .dorr-panel .text-slate-900,
  [data-theme="dark"] .dorr-panel .text-slate-800,
  [data-theme="dark"] .dorr-panel .text-slate-700 {
    color: #f8fafc !important;
  }
  [data-theme="dark"] .dorr-panel .text-slate-600 {
    color: #dbe7f5 !important;
  }
  [data-theme="dark"] .dorr-panel .text-slate-500 {
    color: #cbd5e1 !important;
  }
  [data-theme="dark"] .dorr-panel .text-slate-400 {
    color: #aebed0 !important;
  }
  [data-theme="dark"] .dorr-panel .text-slate-300 {
    color: #d7e3f1 !important;
  }
  [data-theme="dark"] .dorr-panel input,
  [data-theme="dark"] .dorr-panel textarea,
  [data-theme="dark"] .dorr-panel select {
    color: #f8fafc !important;
  }
  [data-theme="dark"] .dorr-panel input::placeholder {
    color: #94a3b8 !important;
  }
  [data-theme="dark"] .dorr-panel .bg-emerald-50 {
    background-color: rgba(6, 78, 59, 0.72) !important;
  }
  [data-theme="dark"] .dorr-panel .bg-rose-50 {
    background-color: rgba(136, 19, 55, 0.72) !important;
  }
  [data-theme="dark"] .dorr-panel .bg-amber-50 {
    background-color: rgba(120, 53, 15, 0.76) !important;
  }
  [data-theme="dark"] .dorr-panel .bg-indigo-50 {
    background-color: rgba(49, 46, 129, 0.72) !important;
  }
  [data-theme="dark"] .dorr-panel .text-emerald-800,
  [data-theme="dark"] .dorr-panel .text-emerald-700 {
    color: #86efac !important;
  }
  [data-theme="dark"] .dorr-panel .text-rose-800,
  [data-theme="dark"] .dorr-panel .text-rose-700 {
    color: #fda4af !important;
  }
  [data-theme="dark"] .dorr-panel .text-amber-950,
  [data-theme="dark"] .dorr-panel .text-amber-900,
  [data-theme="dark"] .dorr-panel .text-amber-800,
  [data-theme="dark"] .dorr-panel .text-amber-700 {
    color: #fde68a !important;
  }
  [data-theme="dark"] .dorr-panel .text-indigo-700,
  [data-theme="dark"] .dorr-panel .text-indigo-600 {
    color: #c4b5fd !important;
  }
  [data-theme="dark"] .dorr-panel .bg-amber-100 {
    background-color: rgba(120, 53, 15, 0.88) !important;
  }
  [data-theme="dark"] .dorr-panel .border-amber-400 {
    border-color: rgba(251, 191, 36, 0.62) !important;
  }
  [data-theme="dark"] .dorr-panel .text-white {
    color: #ffffff !important;
  }
`;

function NumberInput({ label, unit = "mm", value, onChange, placeholder = "0.0", hint }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-1">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</label>
        {hint && <span className="text-[8px] font-semibold text-slate-400">{hint}</span>}
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-slate-800 outline-none placeholder:text-slate-300"
        />
        <span className="shrink-0 text-[9px] font-black text-slate-400 uppercase">{unit}</span>
      </div>
    </div>
  );
}

function ResultBadge({ type, value, label }) {
  const c = TYPE_COLORS[type] || {};
  return (
    <div className={`rounded-[14px] border px-3 py-2 ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white ${c.badge}`}>
          {type}
        </span>
      </div>
      {value != null && (
        <div className={`mt-0.5 text-[11px] font-black ${c.text}`}>{value}</div>
      )}
    </div>
  );
}

function CiBar({ ci }) {
  if (ci === null || !Number.isFinite(ci)) return null;
  const pct = Math.min(Math.max(ci * 100, 0), 100);
  const type = getDorrType(ci);
  const accent = TYPE_COLORS[type]?.accent || "#94a3b8";
  return (
    <div className="mt-2">
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200/60">
        {/* zone markers */}
        <div className="absolute inset-y-0 left-[46%] w-px bg-white/80" />
        <div className="absolute inset-y-0 left-[54%] w-px bg-white/80" />
        {/* fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: accent }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[8px] font-black text-slate-400">
        <span>Type C (≤0.45)</span>
        <span>B</span>
        <span>Type A (≥0.55)</span>
      </div>
    </div>
  );
}

function DorrValueTile({ label, subtitle, value, line, accent = "emerald" }) {
  const palette =
    accent === "rose"
      ? {
          dot: "bg-rose-500",
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-700",
        }
      : {
          dot: "bg-emerald-500",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-700",
        };
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${palette.bg} ${palette.border}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${palette.text}`}>{label}</span>
      </div>
      <div className={`text-lg font-black leading-tight ${palette.text}`}>
        {value != null ? `${value.toFixed(2)} mm` : "--"}
      </div>
      <div className="mt-1 truncate text-[8.5px] font-semibold text-slate-500">
        {line?.name || subtitle}
      </div>
    </div>
  );
}

export default function DorrClassificationPanel({
  className = "",
  style = {},
  onClose,
  onCreateCiLines,
  /* calibration */
  lines = [],
  mmPerPixel = null,
  getLineLength = () => 0,
  hasCalibration = false,
}) {
  const [mode, setMode] = useState("manual"); // "manual" | "guided"
  const [showOptional, setShowOptional] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [infoFigure, setInfoFigure] = useState("ci");
  const [previewFigureOpen, setPreviewFigureOpen] = useState(false);

  /* manual inputs */
  const [outerA, setOuterA] = useState("");
  const [canalB, setCanalB] = useState("");
  const [cfiBroad, setCfiBroad] = useState("");
  const [cfiIsthmus, setCfiIsthmus] = useState("");
  const [ccrIsthmus, setCcrIsthmus] = useState("");
  const [ccrCalcar, setCcrCalcar] = useState("");

  /* guided line selection */
  const [guidedLineA, setGuidedLineA] = useState(null);
  const [guidedLineB, setGuidedLineB] = useState(null);

  const measurableLines = useMemo(
    () => lines.filter((l) => l.type !== "ruler" || !l.presetMm),
    [lines],
  );

  const suggestedDorrLines = useMemo(() => {
    const outer = measurableLines.find(
      (line) => line.dorrCiRole === "outer" || line.type === "dorrOuter",
    );
    const canal = measurableLines.find(
      (line) => line.dorrCiRole === "canal" || line.type === "dorrCanal",
    );
    return {
      outerId: outer?.id ?? null,
      canalId: canal?.id ?? null,
    };
  }, [measurableLines]);

  useEffect(() => {
    if (guidedLineA && !measurableLines.some((line) => line.id === guidedLineA)) {
      setGuidedLineA(null);
    }
    if (guidedLineB && !measurableLines.some((line) => line.id === guidedLineB)) {
      setGuidedLineB(null);
    }
    if (!guidedLineA && suggestedDorrLines.outerId) {
      setGuidedLineA(suggestedDorrLines.outerId);
    }
    if (!guidedLineB && suggestedDorrLines.canalId) {
      setGuidedLineB(suggestedDorrLines.canalId);
    }
  }, [guidedLineA, guidedLineB, measurableLines, suggestedDorrLines]);

  const handleCreateCiLines = useCallback(() => {
    if (!onCreateCiLines) return;
    const ids = onCreateCiLines();
    if (ids?.outerId) setGuidedLineA(ids.outerId);
    if (ids?.canalId) setGuidedLineB(ids.canalId);
    setMode("guided");
  }, [onCreateCiLines]);

  const getLineMm = useCallback(
    (lineId) => {
      const line = lines.find((l) => l.id === lineId);
      if (!line || !mmPerPixel) return null;
      const px = getLineLength(line);
      return px * mmPerPixel;
    },
    [lines, mmPerPixel, getLineLength],
  );

  /* resolved A/B in mm */
  const resolvedA = useMemo(() => {
    if (mode === "guided") return getLineMm(guidedLineA);
    const v = parseFloat(outerA);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [mode, guidedLineA, getLineMm, outerA]);

  const resolvedB = useMemo(() => {
    if (mode === "guided") return getLineMm(guidedLineB);
    const v = parseFloat(canalB);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [mode, guidedLineB, getLineMm, canalB]);

  /* CI */
  const ci = useMemo(() => {
    if (resolvedA === null || resolvedB === null) return null;
    if (resolvedA <= 0) return null;
    const value = (resolvedA - resolvedB) / resolvedA;
    return clampTo(value);
  }, [resolvedA, resolvedB]);

  const ciType = getDorrType(ci);

  /* CFI */
  const cfi = useMemo(() => {
    const broad = parseFloat(cfiBroad);
    const isth = parseFloat(cfiIsthmus);
    if (!Number.isFinite(broad) || broad <= 0 || !Number.isFinite(isth) || isth <= 0) return null;
    return clampTo(broad / isth);
  }, [cfiBroad, cfiIsthmus]);

  const cfiType = getCfiType(cfi);

  /* CCR */
  const ccr = useMemo(() => {
    const isth = parseFloat(ccrIsthmus);
    const calcar = parseFloat(ccrCalcar);
    if (!Number.isFinite(isth) || isth <= 0 || !Number.isFinite(calcar) || calcar <= 0) return null;
    return clampTo(isth / calcar);
  }, [ccrIsthmus, ccrCalcar]);

  const ccrType = getCcrType(ccr);

  /* Composite type (majority vote among available) */
  const compositeType = useMemo(() => {
    const votes = [ciType, cfiType, ccrType].filter(Boolean);
    if (votes.length === 0) return null;
    const counts = { A: 0, B: 0, C: 0 };
    for (const v of votes) counts[v]++;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [ciType, cfiType, ccrType]);

  const typeInfo = compositeType ? TYPE_INFO[compositeType] : null;
  const typeColors = compositeType ? TYPE_COLORS[compositeType] : null;
  const activeInfoFigure = DORR_INFO_FIGURES[infoFigure] || DORR_INFO_FIGURES.ci;
  const guidedOuterLine = useMemo(
    () => lines.find((line) => line.id === guidedLineA) || null,
    [guidedLineA, lines],
  );
  const guidedCanalLine = useMemo(
    () => lines.find((line) => line.id === guidedLineB) || null,
    [guidedLineB, lines],
  );

  const canCalculate = resolvedA !== null && resolvedB !== null;

  return (
    <div
      className={`dorr-panel flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/98 p-3.5 text-slate-800 shadow-xl shadow-slate-900/10 ${className}`}
      style={style}
    >
      <style>{DORR_DARK_MODE_STYLES}</style>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <FlaskConical className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">Dorr CI</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Femoral canal morphology
            </p>
            <div className="mt-1.5 inline-flex items-center rounded-full border border-indigo-100 bg-white px-2 py-0.5 text-[9px] font-black text-indigo-600">
              CI = (A - B) / A
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowInfo((p) => !p)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              showInfo
                ? "border border-indigo-200 bg-indigo-50 text-indigo-600"
                : "border border-slate-200 bg-white text-slate-500 hover:text-slate-800"
            }`}
            title="Info"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Info card */}
      <AnimatePresence initial={false}>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[9px] leading-relaxed text-slate-600 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reference</p>
                  <p className="text-[11px] font-black text-slate-800">Cortical Index</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">
                  (A - B) / A
                </span>
              </div>

              <div className="mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-2.5 py-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Journal Figure</p>
                    <p className="text-[10px] font-black text-slate-700">{activeInfoFigure.title}</p>
                  </div>
                  <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-0.5">
                    {Object.entries(DORR_INFO_FIGURES).map(([key, item]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setInfoFigure(key)}
                        className={`rounded-[10px] px-2 py-1.5 text-[8px] font-black transition ${
                          infoFigure === key
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => setPreviewFigureOpen(true)}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white text-left"
                  >
                    <img
                      src={activeInfoFigure.src}
                      alt={activeInfoFigure.alt}
                      className={`mx-auto block w-full object-contain ${
                        infoFigure === "ci" ? "max-h-[360px]" : "max-h-[300px]"
                      }`}
                      loading="lazy"
                    />
                    <span className="absolute right-2 top-2 rounded-full border border-white/80 bg-slate-900/75 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white opacity-90 shadow-sm transition group-hover:bg-slate-900">
                      Preview
                    </span>
                  </button>
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    {activeInfoFigure.legend.map((item) => (
                      <div key={item.key} className={`rounded-xl border px-2 py-1.5 ${item.className}`}>
                        <p className="text-[8px] font-black uppercase tracking-widest">{item.key} · {item.label}</p>
                        <p className="mt-0.5 text-[8px] leading-snug opacity-85">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <p className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[8.5px] font-semibold leading-relaxed text-slate-500">
                    {activeInfoFigure.note}
                  </p>
                </div>
              </div>

              {/* ── SVG femur cross-section diagram ── */}
              <div className="hidden">
                {/* Type A — Champagne Flute */}
                <div className="flex flex-1 flex-col items-center gap-1">
                  <svg viewBox="0 0 60 100" className="w-full max-w-[56px]" aria-label="Type A femur">
                    {/* outer cortex */}
                    <path d="M18 10 C14 30 12 55 14 90 L46 90 C48 55 46 30 42 10 Z"
                      fill="#dcfce7" stroke="#16a34a" strokeWidth="2.5"/>
                    {/* canal */}
                    <path d="M26 30 C24 50 24 65 25 85 L35 85 C36 65 36 50 34 30 Z"
                      fill="#bbf7d0" stroke="#15803d" strokeWidth="1.5" strokeDasharray="3 1.5"/>
                    {/* A arrow */}
                    <line x1="10" y1="50" x2="50" y2="50" stroke="#16a34a" strokeWidth="1"/>
                    <text x="30" y="48" textAnchor="middle" fontSize="7" fill="#15803d" fontWeight="bold">A</text>
                    {/* B arrow */}
                    <line x1="25" y1="58" x2="35" y2="58" stroke="#15803d" strokeWidth="1"/>
                    <text x="30" y="56" textAnchor="middle" fontSize="6" fill="#15803d">B</text>
                    {/* label */}
                    <text x="30" y="97" textAnchor="middle" fontSize="7" fill="#15803d" fontWeight="bold">A</text>
                  </svg>
                  <span className="text-[7px] font-black text-emerald-700">Champagne</span>
                  <span className="text-[7px] text-emerald-600 opacity-80">CI &gt; 0.54</span>
                </div>
                {/* Type B — Intermediate */}
                <div className="flex flex-1 flex-col items-center gap-1">
                  <svg viewBox="0 0 60 100" className="w-full max-w-[56px]" aria-label="Type B femur">
                    <path d="M16 10 C13 30 12 55 14 90 L46 90 C48 55 47 30 44 10 Z"
                      fill="#fef9c3" stroke="#ca8a04" strokeWidth="2.5"/>
                    <path d="M24 25 C22 48 22 65 24 85 L36 85 C38 65 38 48 36 25 Z"
                      fill="#fef08a" stroke="#a16207" strokeWidth="1.5" strokeDasharray="3 1.5"/>
                    <line x1="10" y1="50" x2="50" y2="50" stroke="#ca8a04" strokeWidth="1"/>
                    <text x="30" y="48" textAnchor="middle" fontSize="7" fill="#a16207" fontWeight="bold">A</text>
                    <line x1="24" y1="58" x2="36" y2="58" stroke="#a16207" strokeWidth="1"/>
                    <text x="30" y="56" textAnchor="middle" fontSize="6" fill="#a16207">B</text>
                    <text x="30" y="97" textAnchor="middle" fontSize="7" fill="#a16207" fontWeight="bold">B</text>
                  </svg>
                  <span className="text-[7px] font-black text-amber-700">Intermediate</span>
                  <span className="text-[7px] text-amber-600 opacity-80">CI 0.46–0.54</span>
                </div>
                {/* Type C — Stovepipe */}
                <div className="flex flex-1 flex-col items-center gap-1">
                  <svg viewBox="0 0 60 100" className="w-full max-w-[56px]" aria-label="Type C femur">
                    <path d="M15 10 C13 30 13 55 14 90 L46 90 C47 55 47 30 45 10 Z"
                      fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5"/>
                    <path d="M22 18 C20 45 20 65 22 85 L38 85 C40 65 40 45 38 18 Z"
                      fill="#fecaca" stroke="#b91c1c" strokeWidth="1.5" strokeDasharray="3 1.5"/>
                    <line x1="10" y1="50" x2="50" y2="50" stroke="#dc2626" strokeWidth="1"/>
                    <text x="30" y="48" textAnchor="middle" fontSize="7" fill="#b91c1c" fontWeight="bold">A</text>
                    <line x1="22" y1="58" x2="38" y2="58" stroke="#b91c1c" strokeWidth="1"/>
                    <text x="30" y="56" textAnchor="middle" fontSize="6" fill="#b91c1c">B</text>
                    <text x="30" y="97" textAnchor="middle" fontSize="7" fill="#b91c1c" fontWeight="bold">C</text>
                  </svg>
                  <span className="text-[7px] font-black text-rose-700">Stovepipe</span>
                  <span className="text-[7px] text-rose-600 opacity-80">CI &lt; 0.46</span>
                </div>
              </div>

              {/* Measurement points explanation */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {["A", "B", "C"].map((t) => (
                  <div key={t} className={`rounded-xl border px-1 py-1.5 ${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].border}`}>
                    <div className={`font-black text-[10px] ${TYPE_COLORS[t].text}`}>Type {t}</div>
                    <div className={`text-[8px] ${TYPE_COLORS[t].text} opacity-80`}>{TYPE_INFO[t].ci_ref}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[8px] font-semibold text-slate-400">Sumber: Dorr et al., Clin Orthop Relat Res 1993 &amp; 2020 update</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {[
          { key: "manual", label: "Manual Input", icon: <FlaskConical className="h-3 w-3" /> },
          { key: "guided", label: "Dari Garis", icon: <Ruler className="h-3 w-3" /> },
        ].map((m) => (
          <button
            key={m.key}
            type="button"
            disabled={m.disabled}
            onClick={() => setMode(m.key)}
            className={`flex min-h-9 items-center justify-center gap-1.5 rounded-xl py-2 text-[9px] font-black transition ${
              mode === m.key
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
            }`}
            title={m.disabled ? "Kalibrasi diperlukan untuk mode ini" : undefined}
          >
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {/* ── MANUAL MODE ── */}
      {mode === "manual" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Manual Measurement</p>
              <p className="mt-0.5 text-[9px] text-slate-400">Masukkan A dan B dalam millimeter.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">mm</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="A — Diameter luar"
              value={outerA}
              onChange={setOuterA}
              hint="kanan-kiri"
            />
            <NumberInput
              label="B — Diameter kanal"
              value={canalB}
              onChange={setCanalB}
              hint="kanan-kiri"
            />
          </div>
        </div>
      )}

      {/* ── GUIDED MODE ── */}
      {mode === "guided" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {!hasCalibration && (
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] font-semibold text-amber-700">
              Kalibrasi diperlukan untuk membaca panjang garis dalam mm.
            </div>
          )}
          {onCreateCiLines && (
            <button
              type="button"
              onClick={handleCreateCiLines}
              className="mb-2 flex w-full min-h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Ruler className="h-3.5 w-3.5" />
              Buat / Reset Garis Default A/B
            </button>
          )}
          <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[8.5px] leading-relaxed text-slate-500">
            Default membuat dua garis: A untuk diameter luar dan B untuk kanal. Geser ujung kanan-kiri masing-masing garis di canvas.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DorrValueTile
              label="A"
              subtitle="Diameter luar kanan-kiri"
              value={resolvedA}
              line={guidedOuterLine}
              accent="emerald"
            />
            <DorrValueTile
              label="B"
              subtitle="Diameter kanal kanan-kiri"
              value={resolvedB}
              line={guidedCanalLine}
              accent="rose"
            />
          </div>
          {(!guidedOuterLine || !guidedCanalLine) && (
            <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-center text-[8.5px] font-semibold text-slate-400">
              Belum ada garis default A/B. Tekan tombol di atas untuk membuatnya.
            </div>
          )}
        </div>
      )}

      {/* ── CI RESULT ── */}
      <AnimatePresence mode="wait">
        {canCalculate && (
          <motion.div
            key={`ci-${ci}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <div className={`rounded-2xl border p-3 shadow-sm ${typeColors?.bg || "bg-slate-50"} ${typeColors?.border || "border-slate-200"}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cortical Index</div>
                  <div className={`text-2xl font-black leading-tight ${typeColors?.text || "text-slate-700"}`}>
                    {ci !== null ? ci.toFixed(3) : "—"}
                  </div>
                </div>
                {ciType && (
                  <div className="text-right">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xl font-black text-white ${typeColors?.badge || "bg-slate-400"}`}>
                      {ciType}
                    </span>
                  </div>
                )}
              </div>
              <CiBar ci={ci} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OPTIONAL INDICES ── */}
      <button
        type="button"
        onClick={() => setShowOptional((p) => !p)}
        className="flex min-h-10 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition hover:border-slate-300"
      >
        <span>Indeks Opsional (CFI · CCR)</span>
        {showOptional ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      <AnimatePresence initial={false}>
        {showOptional && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5">
              {/* CFI */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Canal Flare Index (CFI)</p>
                <p className="mb-2 text-[8px] text-slate-400">= lebar 20 mm prox. LT ÷ lebar isthmus · (A &gt;4.7 · B 3–4.7 · C &lt;3)</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Lebar 20mm atas LT" value={cfiBroad} onChange={setCfiBroad} placeholder="0.0" />
                  <NumberInput label="Lebar isthmus" value={cfiIsthmus} onChange={setCfiIsthmus} placeholder="0.0" />
                </div>
                {cfi !== null && (
                  <div className="mt-2">
                    <ResultBadge type={cfiType} value={`CFI = ${cfi.toFixed(2)}`} label="Canal Flare Index" />
                  </div>
                )}
              </div>

              {/* CCR */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Canal-Calcar Ratio (CCR)</p>
                <p className="mb-2 text-[8px] text-slate-400">= lebar isthmus ÷ diameter calcar · (A ~0.57 · B ~0.59 · C ~0.64)</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Lebar isthmus" value={ccrIsthmus} onChange={setCcrIsthmus} placeholder="0.0" />
                  <NumberInput label="Diameter calcar" value={ccrCalcar} onChange={setCcrCalcar} placeholder="0.0" />
                </div>
                {ccr !== null && (
                  <div className="mt-2">
                    <ResultBadge type={ccrType} value={`CCR = ${ccr.toFixed(3)}`} label="Canal-Calcar Ratio" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMPOSITE TYPE RESULT ── */}
      <AnimatePresence mode="wait">
        {compositeType && typeInfo && (
          <motion.div
            key={`composite-${compositeType}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`rounded-2xl border p-3 shadow-sm ${typeColors.bg} ${typeColors.border}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${typeColors.badge}`}>
                {compositeType}
              </span>
              <div>
                <div className={`text-xs font-black ${typeColors.text}`}>Dorr Type {compositeType}</div>
                <div className={`text-[9px] opacity-75 ${typeColors.text}`}>{typeInfo.nickname}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-[9px] leading-relaxed text-slate-600">
              <p>{typeInfo.description}</p>
              <div className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-[8px] font-black uppercase text-slate-400">Pasien</span>
                <p>{typeInfo.patient}</p>
              </div>
              <div className={`rounded-[10px] border px-2.5 py-1.5 ${typeColors.border} bg-white/60`}>
                <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${typeColors.text}`}>Rekomendasi Implant</p>
                <p className="text-slate-700">{typeInfo.implant}</p>
              </div>
              {typeInfo.warning && (
                <div className="rounded-xl border border-amber-400 bg-amber-100 px-3 py-2 text-amber-950 shadow-sm">
                  <div className="mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" strokeWidth={2.4} />
                    <p className="text-[8px] font-black uppercase tracking-widest text-amber-900">Perhatian</p>
                  </div>
                  <p className="text-[9px] font-bold leading-relaxed text-amber-950">{typeInfo.warning}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!canCalculate && !cfi && !ccr && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-3 py-4 text-center text-[9px] font-semibold text-slate-400">
          {mode === "guided"
            ? "Buat atau pilih garis A dan B untuk menghitung Cortical Index."
            : "Masukkan nilai A dan B untuk menghitung Cortical Index."}
        </div>
      )}

      {/* Reset */}
      {(canCalculate || cfi || ccr) && (
        <button
          type="button"
          onClick={() => {
            setOuterA(""); setCanalB("");
            setCfiBroad(""); setCfiIsthmus("");
            setCcrIsthmus(""); setCcrCalcar("");
            setGuidedLineA(null); setGuidedLineB(null);
          }}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 text-[9px] font-black text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
        >
          Reset
        </button>
      )}

      <AnimatePresence>
        {previewFigureOpen && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewFigureOpen(false)}
          >
            <motion.div
              className="max-h-[92vh] w-[min(92vw,860px)] overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl"
              initial={{ y: 14, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 10, scale: 0.96 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview</p>
                  <p className="text-sm font-black text-slate-900">{activeInfoFigure.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFigureOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
                  aria-label="Tutup preview"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-4">
                <img
                  src={activeInfoFigure.src}
                  alt={activeInfoFigure.alt}
                  className="mx-auto block max-h-[68vh] w-full object-contain"
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {activeInfoFigure.legend.map((item) => (
                    <div key={item.key} className={`rounded-xl border px-3 py-2 ${item.className}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest">{item.key} · {item.label}</p>
                      <p className="mt-1 text-[9px] leading-relaxed opacity-85">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
