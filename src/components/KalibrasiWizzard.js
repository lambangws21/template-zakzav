"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Minus,
  MousePointer2,
  Plus,
  Ruler,
  Save,
  Scaling,
  X,
} from "lucide-react";
import femoralHeadCalibrationPresets from "../data/femoralHeadCalibrationPresets.json";

const SPRING = { type: "spring", damping: 26, stiffness: 320, mass: 0.9 };
const REVEAL = {
  initial: { opacity: 0, y: -8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.18, ease: "easeOut" },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const FEMORAL_HEAD_HEIGHT_BANDS = femoralHeadCalibrationPresets.heightBands || [];
const FEMORAL_HEAD_SEX_OPTIONS = femoralHeadCalibrationPresets.sexOptions || [];
const FEMORAL_HEAD_QUICK_SIZES = femoralHeadCalibrationPresets.quickSizesMm || [];

function getFemoralHeadHeightEstimate(sex, heightCm) {
  const safeHeight = Number(heightCm);
  const sameSexBands = FEMORAL_HEAD_HEIGHT_BANDS.filter((band) => band.sex === sex);
  if (!sameSexBands.length) return null;

  if (Number.isFinite(safeHeight) && safeHeight > 0) {
    const exact = sameSexBands.find(
      (band) => safeHeight >= band.heightMinCm && safeHeight <= band.heightMaxCm,
    );
    if (exact) return exact;

    return sameSexBands.reduce((closest, band) => {
      const closestEdge =
        safeHeight < band.heightMinCm ? band.heightMinCm : band.heightMaxCm;
      const distance = Math.abs(safeHeight - closestEdge);
      const closestDistance = closest?._distance ?? Number.POSITIVE_INFINITY;
      return distance < closestDistance ? { ...band, _distance: distance } : closest;
    }, null);
  }

  return sameSexBands[Math.floor(sameSexBands.length / 2)] || null;
}

export default function CalibrationWizard({
  open = false,
  onClose,
  isMobile = false,
  calibrationMode = "line",
  onCalibrationModeChange,
  calibrationReferenceLine = null,
  calibrationReferenceCircle = null,
  lineTypeLabel = (type) => type || "LINE",
  actualValue = "",
  onActualValueChange,
  actualUnit = "cm",
  onActualUnitChange,
  sourceZoomPercent = "100",
  onSourceZoomPercentChange,
  mmPerPixelValue = null,
  mmPerPixelAt100Value = "",
  onMmPerPixelAt100Change,
  calibrationQuality = null,
  selectedLengthText = "",
  onCreatePresetFromInput,
  onCreatePresetLine,
  onManualDraw,
  onManualCircle,
  onAutoHeadLine,
  lineStrokeWidth = 2,
  onLineStrokeWidthChange,
  onSave,
  canSave = true,
  hasCalibration = false,
  measurementUnit = "cm",
  onStartTemplating,
  magnificationFactor = "115",
  onMagnificationFactorChange,
  anatomicalRefSizeMm = "46",
  onAnatomicalRefSizeMmChange,
  onCircleNudge,
  onCircleResize,
  circleRadiusPx = null,
} = {}) {
  const [showQCDetail, setShowQCDetail] = useState(false);
  const [drawExpanded, setDrawExpanded] = useState(false);
  const [showMagGuide, setShowMagGuide] = useState(false);
  const [estimateExpanded, setEstimateExpanded] = useState(false);
  const [headEstimateSex, setHeadEstimateSex] = useState("female");
  const [headEstimateHeightCm, setHeadEstimateHeightCm] = useState("155");
  const [estimateApplyPulse, setEstimateApplyPulse] = useState(false);
  const [canvasEditCompact, setCanvasEditCompact] = useState(false);
  const estimatePulseTimerRef = useRef(null);
  const nudgeIntervalRef = useRef(null);

  const startNudge = (fn) => {
    fn();
    nudgeIntervalRef.current = setInterval(fn, 120);
  };
  const stopNudge = () => {
    if (nudgeIntervalRef.current) {
      clearInterval(nudgeIntervalRef.current);
      nudgeIntervalRef.current = null;
    }
  };
  useEffect(() => () => stopNudge(), []);

  const isLineMode = calibrationMode === "line";
  const isMagMode = calibrationMode === "magnification";
  const strokeValue = Number.isFinite(Number(lineStrokeWidth)) ? Number(lineStrokeWidth) : 2;

  const anatomicalSizeNum = Number(anatomicalRefSizeMm);
  const apparentSizeMm =
    Number.isFinite(anatomicalSizeNum) && anatomicalSizeNum > 0
      ? anatomicalSizeNum.toFixed(1)
      : null;

  const factorText =
    mmPerPixelValue !== null && Number.isFinite(mmPerPixelValue)
      ? `${mmPerPixelValue.toFixed(6)} mm/px`
      : "-";
  const referenceLabel =
    isLineMode && calibrationReferenceLine
      ? `Line #${calibrationReferenceLine.id} | ${lineTypeLabel(calibrationReferenceLine.type)}`
      : null;
  const rulerPresetLabel =
    calibrationReferenceLine?.presetMm && Number.isFinite(calibrationReferenceLine.presetMm)
      ? calibrationReferenceLine.presetMm % 10 === 0
        ? `${calibrationReferenceLine.presetMm / 10} cm`
        : `${(calibrationReferenceLine.presetMm / 10).toFixed(1)} cm`
      : null;
  const qcStatus = calibrationQuality?.status || "bad";
  const qcColor =
    qcStatus === "good" ? "#10b981" : qcStatus === "warn" ? "#f59e0b" : "#ef4444";
  const qcBg =
    qcStatus === "good" ? "#d1fae5" : qcStatus === "warn" ? "#fef3c7" : "#fee2e2";

  const hasLine = Boolean(calibrationReferenceLine);
  const hasHeadCircle = Boolean(calibrationReferenceCircle);
  const isCompactCanvasEdit = isMobile && isMagMode && canvasEditCompact;
  const lineActionLabel = hasLine ? "Update Line dari Nilai Ini" : "Buat Line dari Nilai Ini";
  const femoralHeadEstimate = useMemo(
    () => getFemoralHeadHeightEstimate(headEstimateSex, headEstimateHeightCm),
    [headEstimateHeightCm, headEstimateSex],
  );
  const femoralHeadRangeLabel = femoralHeadEstimate?.rangeMm
    ? `${femoralHeadEstimate.rangeMm[0]}-${femoralHeadEstimate.rangeMm[1]} mm`
    : "-";
  const femoralHeadConfidenceLabel =
    femoralHeadEstimate?.confidence === "low" ? "Estimasi rendah" : "Estimasi sedang";
  const activeFemoralEstimateMm = femoralHeadEstimate?.headMm
    ? String(femoralHeadEstimate.headMm)
    : "";
  const isFemoralEstimateApplied =
    activeFemoralEstimateMm && String(anatomicalRefSizeMm) === activeFemoralEstimateMm;

  useEffect(() => {
    if (open) {
      setShowQCDetail(false);
      setDrawExpanded(false);
    }
    if (!open) setCanvasEditCompact(false);
  }, [open]);

  useEffect(() => {
    if (calibrationMode !== "magnification") setCanvasEditCompact(false);
  }, [calibrationMode]);

  useEffect(() => () => {
    if (estimatePulseTimerRef.current) clearTimeout(estimatePulseTimerRef.current);
  }, []);

  const updateStroke = (value) => {
    const nextValue = clamp(Number(value) || strokeValue, 0.5, 8);
    onLineStrokeWidthChange?.(nextValue);
  };

  const applyFemoralHeadEstimate = () => {
    if (!activeFemoralEstimateMm) return;
    onAnatomicalRefSizeMmChange?.(activeFemoralEstimateMm);
    setEstimateApplyPulse(true);
    if (estimatePulseTimerRef.current) clearTimeout(estimatePulseTimerRef.current);
    estimatePulseTimerRef.current = setTimeout(() => {
      setEstimateApplyPulse(false);
    }, 1600);
  };

  const handleManualCircle = () => {
    onManualCircle?.();
    if (isMobile) setCanvasEditCompact(true);
  };

  const handleAutoHeadCircle = () => {
    onAutoHeadLine?.(Number(anatomicalRefSizeMm));
    if (isMobile) setCanvasEditCompact(true);
  };

  const handleSave = () => onSave?.();

  return (
    <AnimatePresence>
      {open && (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .cw-card { background: #eef2f7; box-shadow: 6px 6px 18px rgba(148,163,184,0.36),-4px -4px 14px rgba(255,255,255,0.82); border: 1px solid rgba(255,255,255,0.85); }
        .cw-flat  { background: #eef2f7; box-shadow: 2px 2px 5px #cbd5e1,-2px -2px 5px #ffffff; }
        .cw-pressed { background: #edf1f6; box-shadow: inset 2px 2px 4px #cbd5e1,inset -2px -2px 4px #ffffff; }
        .cw-btn   { background: #eef2f7; box-shadow: 2px 2px 4px #cbd5e1,-2px -2px 4px #ffffff; border: 1px solid rgba(255,255,255,0.7); transition: all .18s; }
        .cw-btn:active { box-shadow: inset 1px 1px 3px #cbd5e1,inset -1px -1px 3px #ffffff; transform: translateY(1px); }
        .cw-input { background: #edf1f6; box-shadow: inset 2px 2px 4px #c4cfdc,inset -2px -2px 4px #ffffff; border: 1px solid white; }
        .cw-active { background: #3b82f6; color: white !important; box-shadow: inset 1px 1px 3px rgba(0,0,0,.2); }
        .cw-line-primary { background: rgba(239,246,255,.9); border-color: #93c5fd; box-shadow: 0 0 24px rgba(37,99,235,.16); }
        .cw-line-primary.is-ready { background: rgba(236,253,245,.86); border-color: #6ee7b7; box-shadow: 0 0 22px rgba(16,185,129,.14); }
        .cw-line-status { background: rgba(255,255,255,.68); border-color: #bfdbfe; }
        .cw-line-primary.is-ready .cw-line-status { border-color: #a7f3d0; }
        .cw-line-help { background: rgba(255,255,255,.68); border-color: #bfdbfe; color: #1e40af; }
        [data-theme="dark"] .cw-card    { background: #1a2438; box-shadow: 6px 6px 18px rgba(0,5,20,.65),-2px -2px 6px rgba(50,75,130,.18); border: 1px solid rgba(255,255,255,.09); color: #c8d5e8; }
        [data-theme="dark"] .cw-flat    { background: #1e2840; box-shadow: 2px 2px 5px rgba(0,5,20,.5),-1px -1px 4px rgba(50,75,130,.16); }
        [data-theme="dark"] .cw-pressed { background: #141d2e; box-shadow: inset 2px 2px 4px rgba(0,5,20,.55),inset -1px -1px 3px rgba(50,75,130,.14); }
        [data-theme="dark"] .cw-btn     { background: #1e2840; box-shadow: 2px 2px 4px rgba(0,5,20,.5),-1px -1px 3px rgba(50,75,130,.16); border: 1px solid rgba(255,255,255,.09); color: #94a3b8; }
        [data-theme="dark"] .cw-input   { background: #141d2e; box-shadow: inset 2px 2px 4px rgba(0,5,20,.55),inset -1px -1px 3px rgba(50,75,130,.12); border: 1px solid rgba(255,255,255,.08); color: #c8d5e8; }
        [data-theme="dark"] .cw-active  { background: #2563eb; color: white !important; }
        [data-theme="dark"] .cw-line-primary { background: #101d33; border-color: rgba(96,165,250,.42); box-shadow: 0 0 22px rgba(37,99,235,.2); }
        [data-theme="dark"] .cw-line-primary.is-ready { background: #10271f; border-color: rgba(52,211,153,.48); box-shadow: 0 0 22px rgba(16,185,129,.18); }
        [data-theme="dark"] .cw-line-primary .cw-line-title { color: #93c5fd !important; }
        [data-theme="dark"] .cw-line-primary.is-ready .cw-line-title { color: #86efac !important; }
        [data-theme="dark"] .cw-line-primary .cw-line-subtitle { color: #bfdbfe !important; }
        [data-theme="dark"] .cw-line-primary.is-ready .cw-line-subtitle { color: #bbf7d0 !important; }
        [data-theme="dark"] .cw-line-primary .cw-line-pill { background: rgba(37,99,235,.28) !important; color: #dbeafe !important; border: 1px solid rgba(147,197,253,.28); }
        [data-theme="dark"] .cw-line-primary.is-ready .cw-line-pill { background: rgba(16,185,129,.24) !important; color: #d1fae5 !important; border-color: rgba(110,231,183,.28); }
        [data-theme="dark"] .cw-line-status { background: rgba(15,23,42,.6) !important; border-color: rgba(147,197,253,.24) !important; }
        [data-theme="dark"] .cw-line-primary.is-ready .cw-line-status { border-color: rgba(110,231,183,.3) !important; }
        [data-theme="dark"] .cw-line-status .cw-line-status-title { color: #d1fae5 !important; }
        [data-theme="dark"] .cw-line-status .cw-line-status-subtitle { color: #a7f3d0 !important; }
        [data-theme="dark"] .cw-line-help { background: rgba(15,23,42,.6) !important; border-color: rgba(147,197,253,.24) !important; color: #bfdbfe !important; }
        [data-theme="dark"] .cw-card .text-slate-800 { color: #c8d5e8 !important; }
        [data-theme="dark"] .cw-card .text-slate-700 { color: #94a3b8 !important; }
        [data-theme="dark"] .cw-card .text-slate-600 { color: #7f96b2 !important; }
        [data-theme="dark"] .cw-card .text-slate-500 { color: #64748b !important; }
        [data-theme="dark"] .cw-card .text-slate-400 { color: #4e6280 !important; }
      ` }} />

      {/* Non-interactive layer — keeps panel above canvas without blocking interactions */}
      <motion.div
        key="cw-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="pointer-events-none fixed inset-0 z-[94]"
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, left-side float on desktop */}
      <motion.div
        key="cw-panel"
        initial={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, x: -48, scale: 0.94 }}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0, scale: 1 }}
        exit={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, x: -36, scale: 0.96 }}
        transition={isMobile ? { ...SPRING, damping: 32, stiffness: 340 } : SPRING}
        className={
          isCompactCanvasEdit
            ? "fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] left-3 right-3 z-[95] rounded-[22px] p-3 text-slate-800 cw-card font-sans"
          : isMobile
            ? "fixed bottom-0 left-0 right-0 z-[95] max-h-[88dvh] overflow-y-auto rounded-t-[28px] p-4 pb-[calc(env(safe-area-inset-bottom)+20px)] text-slate-800 cw-card font-sans"
            : "fixed left-3 top-1/2 z-[95] w-[min(308px,calc(100vw-24px))] max-h-[min(92vh,640px)] -translate-y-1/2 overflow-y-auto rounded-[28px] p-4 text-slate-800 cw-card font-sans"
        }
        onClick={(e) => e.stopPropagation()}
        style={{ scrollbarWidth: "none" }}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
        )}

        {isCompactCanvasEdit ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] text-blue-600 cw-flat">
                <Scaling className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black uppercase tracking-tight text-slate-800">
                  Edit Circle di Canvas
                </p>
                <p className="truncate text-[9px] font-bold text-slate-500">
                  {selectedLengthText || `Ø ${anatomicalRefSizeMm || "-"} mm`} · geser langsung di foto
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCanvasEditCompact(false)}
                className="flex h-9 shrink-0 items-center justify-center rounded-[14px] px-3 text-[10px] font-black text-slate-600 cw-btn"
              >
                Panel
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 cw-btn"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleAutoHeadCircle}
                className="rounded-[14px] px-2 py-2 text-[9px] font-black uppercase tracking-wide text-slate-600 cw-btn"
              >
                Update Ø
              </button>
              <button
                type="button"
                onClick={() => setCanvasEditCompact(false)}
                className="rounded-[14px] px-2 py-2 text-[9px] font-black uppercase tracking-wide text-slate-600 cw-btn"
              >
                Kontrol
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasHeadCircle || !canSave}
                className="rounded-[14px] bg-emerald-600 px-2 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-45"
              >
                Terapkan
              </button>
            </div>
          </div>
        ) : (
          <>

        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] text-blue-600 cw-flat">
              <Scaling className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-tight text-slate-800 uppercase">Kalibrasi</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                {hasCalibration ? `Aktif · ${measurementUnit}` : "Belum aktif"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 cw-btn"
            aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Method tabs */}
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-[16px] p-1 cw-pressed">
          <button type="button" onClick={() => onCalibrationModeChange?.("line")}
            className={`rounded-[12px] py-2 text-[10px] font-black transition-all ${isLineMode ? "cw-active" : "text-slate-500"}`}>
            Garis Ruler
          </button>
          <button type="button" onClick={() => onCalibrationModeChange?.("magnification")}
            className={`rounded-[12px] py-2 text-[10px] font-black transition-all ${isMagMode ? "cw-active" : "text-slate-500"}`}>
            Head Ref
          </button>
          <button type="button" onClick={() => onCalibrationModeChange?.("zoom")}
            className={`rounded-[12px] py-2 text-[10px] font-black transition-all ${calibrationMode === "zoom" ? "cw-active" : "text-slate-500"}`}>
            Zoom %
          </button>
        </div>

        {isLineMode ? (
          <div className="space-y-2.5">
            {/* Primary custom ruler flow */}
            <motion.div
              layout
              animate={{ scale: hasLine ? 1.006 : 1 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className={`cw-line-primary rounded-[18px] border p-3 transition-all ${hasLine ? "is-ready" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={`cw-line-title text-[9px] font-black uppercase tracking-widest ${hasLine ? "text-emerald-700" : "text-blue-700"}`}>
                    1 · Nilai referensi ruler
                  </p>
                  <p className={`cw-line-subtitle mt-0.5 truncate text-[10px] font-bold ${hasLine ? "text-emerald-700/80" : "text-blue-700/80"}`}>
                    Isi panjang real, lalu buat line dari nilai itu.
                  </p>
                </div>
                <span className={`cw-line-pill shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${hasLine ? "bg-emerald-200 text-emerald-800" : "bg-blue-200 text-blue-800"}`}>
                  Zoom {sourceZoomPercent || "-"}%
                </span>
              </div>
              <div className="grid grid-cols-[1fr_58px_70px] gap-1.5">
                <input type="number" min="0" step="0.01" value={actualValue}
                  onChange={(e) => onActualValueChange?.(e.target.value)}
                  placeholder="10"
                  className="min-h-10 min-w-0 rounded-[12px] px-3 text-[15px] font-black text-slate-800 outline-none cw-input" />
                <select value={actualUnit} onChange={(e) => onActualUnitChange?.(e.target.value)}
                  className="min-h-10 cursor-pointer appearance-none rounded-[12px] px-2 text-center text-[14px] font-black text-slate-700 outline-none cw-flat">
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
                <input type="number" min="1" step="0.1" value={sourceZoomPercent}
                  onChange={(e) => onSourceZoomPercentChange?.(e.target.value)}
                  placeholder="100"
                  className="min-h-10 min-w-0 rounded-[12px] px-2 text-center text-[14px] font-black text-slate-800 outline-none cw-input" />
              </div>
              <motion.button type="button" onClick={onCreatePresetFromInput}
                whileTap={{ scale: 0.985 }}
                className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] px-3 text-[11px] font-black tracking-wider text-white uppercase transition-all ${
                  hasLine
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-[0_10px_24px_rgba(16,185,129,0.22)]"
                    : "bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_10px_26px_rgba(37,99,235,0.32)]"
                }`}>
                <Ruler className="h-3.5 w-3.5" />
                {lineActionLabel}
              </motion.button>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {["100", "90"].map((v) => (
                  <button key={v} type="button" onClick={() => onSourceZoomPercentChange?.(v)}
                    className={`min-h-8 rounded-[11px] text-[11px] font-black transition-transform active:scale-[0.98] ${
                      String(sourceZoomPercent) === v ? "cw-active" : "text-slate-600 cw-btn"
                    }`}>
                    {v}%
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
              {hasLine ? (
                <motion.div key="line-ready" {...REVEAL} className="cw-line-status mt-2 rounded-[12px] border px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="cw-line-status-title truncate text-[11px] font-black text-emerald-800">
                        Line siap · {rulerPresetLabel || `${actualValue || "-"} ${actualUnit}`}
                      </div>
                      <div className="cw-line-status-subtitle truncate text-[10px] font-bold text-emerald-600">
                        {selectedLengthText || "Panjang layar belum terbaca"}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-200 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
                      #{calibrationReferenceLine.id}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="line-help" {...REVEAL} className="cw-line-help mt-2 rounded-[12px] border px-2.5 py-2 text-[11px] font-black leading-snug">
                  Contoh: ruler 12.7 cm, isi 12.7 cm lalu tekan tombol biru.
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>

            {/* Secondary options */}
            <button type="button"
              onClick={() => setDrawExpanded((v) => !v)}
              className="flex w-full items-center justify-between rounded-[14px] border border-white/60 px-3 py-2.5 text-[11px] font-black text-slate-600 cw-flat transition-transform active:scale-[0.99]">
              <span className="flex items-center gap-1.5">
                <MousePointer2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                Opsi lain: preset, manual, ketebalan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black cw-pressed">
                  Line {strokeValue.toFixed(1)}x
                </span>
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black cw-pressed">
                  {drawExpanded ? "Terbuka" : "Tertutup"}
                </span>
                <motion.span
                  animate={{ rotate: drawExpanded ? 180 : 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex h-4 w-4 items-center justify-center"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.span>
              </span>
            </button>
            <AnimatePresence initial={false}>
            {drawExpanded && (
              <motion.div
                key="line-extra-options"
                {...REVEAL}
                className="rounded-[18px] border border-white/60 p-2.5 cw-flat"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" onClick={onManualDraw}
                    className="col-span-3 min-h-10 rounded-[12px] bg-slate-900 px-3 text-[11px] font-black tracking-wider text-white uppercase transition-transform active:scale-[0.98]">
                    <span className="flex items-center justify-center gap-1.5">
                      <MousePointer2 className="h-3.5 w-3.5" /> Line Manual Bebas
                    </span>
                  </button>
                  {[{ label: "10 cm", mm: 100 }, { label: "13 cm", mm: 130 }, { label: "15 cm", mm: 150 }].map(({ label, mm }) => (
                    <button key={mm} type="button" onClick={() => onCreatePresetLine?.(mm)}
                      className="min-h-8 rounded-[11px] text-[10px] font-black text-slate-600 cw-btn">
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 rounded-[14px] border border-white/60 p-2.5 cw-pressed">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Ketebalan line
                    </span>
                    <motion.span
                      key={strokeValue.toFixed(1)}
                      initial={{ scale: 0.92, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.16 }}
                      className="rounded-full px-2 py-1 text-[10px] font-black cw-flat"
                    >
                      {strokeValue.toFixed(1)}x
                    </motion.span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateStroke(strokeValue - 0.1)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 cw-btn"
                      aria-label="Kurangi ketebalan line">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input type="range" min="0.5" max="8" step="0.1" value={strokeValue}
                      onChange={(e) => updateStroke(e.target.value)}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-300 accent-blue-500" />
                    <button type="button" onClick={() => updateStroke(strokeValue + 0.1)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 cw-btn"
                      aria-label="Tambah ketebalan line">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[1.5, 2.5, 4, 6].map((v) => (
                      <button key={v} type="button" onClick={() => updateStroke(v)}
                        className={`min-h-8 rounded-[10px] text-[11px] font-black transition-transform active:scale-[0.98] ${Math.abs(strokeValue - v) < 0.05 ? "cw-active" : "text-slate-600 cw-btn"}`}>
                        {v}x
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        ) : isMagMode ? (
          /* Magnification mode */
          <div className="space-y-2">

            {/* Guide toggle */}
            <button type="button" onClick={() => setShowMagGuide(v => !v)}
              className="flex w-full items-center gap-2 rounded-[14px] border border-white/60 px-3 py-2 text-left cw-flat">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-[10px] font-black">?</div>
              <span className="flex-1 text-[10px] font-black text-slate-600">
                {showMagGuide ? "Sembunyikan panduan" : "Cara menggunakan kalibrasi ini"}
              </span>
              {showMagGuide ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
            </button>

            {/* Collapsible guide */}
            {showMagGuide && (
              <div className="rounded-[16px] border border-amber-100 bg-amber-50 p-3 space-y-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Panduan Kalibrasi Head Ref</p>
                <p className="text-[9px] leading-relaxed text-amber-800">
                  Pakai diameter head yang sudah diketahui sebagai referensi langsung. Jika implant/head 42 mm, isi 42 mm, lalu sesuaikan circle sampai tepat mengikuti tepi head di foto.
                </p>
                <div className="space-y-1.5">
                  {[
                    { step: "1", text: "Isi diameter referensi head/ball implant yang diketahui." },
                    { step: "2", text: "Tekan buat circle, lalu posisikan ke head pada foto." },
                    { step: "3", text: "Resize circle sampai diameter visualnya pas." },
                    { step: "4", text: "Tekan \"Terapkan Kalibrasi\"." },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-2">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[8px] font-black text-amber-700">{step}</div>
                      <span className="text-[9px] text-amber-800 leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-[10px] border border-amber-200 bg-amber-100 px-2.5 py-2">
                  <p className="text-[9px] font-black text-amber-700">💡 Tips akurasi</p>
                  <p className="mt-0.5 text-[9px] text-amber-600 leading-relaxed">
                    Untuk foto dengan implant seperti contoh, gunakan diameter ball implant yang diketahui. Estimasi tinggi badan hanya dipakai jika tidak ada ukuran head pasti.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-[18px] border border-white/60 p-3 cw-flat">
              <div className="mb-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                  1 · Diameter referensi
                </p>
                <p className="mt-0.5 text-[9px] font-bold leading-snug text-slate-500">
                  Isi diameter head/ball implant yang diketahui. Angka ini dipakai langsung untuk kalibrasi.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-[14px] border border-white/60 px-3 py-2.5 cw-pressed">
                <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-slate-400">Diameter</span>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={anatomicalRefSizeMm}
                  onChange={(e) => onAnatomicalRefSizeMmChange?.(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-right text-lg font-black text-slate-800 outline-none"
                  placeholder="42"
                />
                <span className="shrink-0 text-[12px] font-black text-slate-500">mm</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {FEMORAL_HEAD_QUICK_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onAnatomicalRefSizeMmChange?.(String(size))}
                    className={`min-h-7 rounded-full px-2.5 text-[9px] font-black ${
                      String(anatomicalRefSizeMm) === String(size)
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 cw-btn"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setEstimateExpanded((v) => !v)}
                className="mt-2 flex w-full items-center justify-between rounded-[12px] border border-white/60 px-3 py-2 text-left cw-pressed"
              >
                <span>
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Estimasi tinggi badan
                  </span>
                  <span className="block text-[9px] font-bold text-slate-400">
                    Opsional bila ukuran head tidak diketahui
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase ${
                  femoralHeadEstimate?.confidence === "low"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {estimateExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : femoralHeadEstimate?.headMm || "-"}
                </span>
              </button>

              {estimateExpanded && (
                <div className="mt-2 rounded-[14px] border border-white/60 px-3 py-2 cw-pressed">
                  <div className="grid grid-cols-2 gap-1.5">
                    {FEMORAL_HEAD_SEX_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setHeadEstimateSex(option.id)}
                        className={`min-h-9 rounded-[11px] text-[10px] font-black transition-all ${
                          headEstimateSex === option.id ? "cw-active" : "text-slate-600 cw-btn"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 rounded-[10px] border border-white/60 px-2.5 py-1.5 cw-pressed">
                    <span className="shrink-0 text-[9px] font-black text-slate-400">Tinggi</span>
                    <input
                      type="number"
                      min="120"
                      max="210"
                      step="1"
                      value={headEstimateHeightCm}
                      onChange={(e) => setHeadEstimateHeightCm(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-slate-700 outline-none"
                      placeholder="155"
                    />
                    <span className="shrink-0 text-[11px] font-black text-slate-500">cm</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {femoralHeadEstimate?.label || "Estimasi belum tersedia"}
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold leading-snug text-slate-500">
                        Range {femoralHeadRangeLabel} · {femoralHeadConfidenceLabel}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[22px] font-black leading-none text-blue-600">
                        {femoralHeadEstimate?.headMm || "-"}
                      </div>
                      <div className="text-[8px] font-black uppercase text-slate-400">mm</div>
                    </div>
                  </div>
                  {femoralHeadEstimate?.note ? (
                    <p className="mt-1.5 text-[9px] font-medium leading-snug text-slate-500">
                      {femoralHeadEstimate.note}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={applyFemoralHeadEstimate}
                    className={`mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[12px] text-[10px] font-black uppercase tracking-wider text-white transition-all ${
                      isFemoralEstimateApplied || estimateApplyPulse
                        ? "bg-emerald-600"
                        : "bg-blue-600 active:scale-[0.99]"
                    }`}
                  >
                    {(isFemoralEstimateApplied || estimateApplyPulse) ? (
                      <>
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        Diameter diisi
                      </>
                    ) : (
                      <>Isi diameter {femoralHeadEstimate?.headMm || "-"} mm</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Apparent size result */}
            {apparentSizeMm ? (
              <div className="flex items-center gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="text-[24px] font-black leading-none text-emerald-700">{apparentSizeMm}</div>
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-emerald-500">mm referensi aktif</div>
                  <div className="text-[10px] font-bold text-emerald-700">Circle akan dihitung langsung sebagai {anatomicalRefSizeMm} mm</div>
                </div>
                <div className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                </div>
              </div>
            ) : (
              <div className="rounded-[12px] px-3 py-2 text-center text-[9px] text-slate-400 cw-pressed">
                Isi diameter referensi head terlebih dulu.
              </div>
            )}

            <div className="hidden items-center gap-1.5 rounded-[12px] border border-white/60 px-3 py-2 cw-flat">
              <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-slate-400">
                Magnifikasi
              </span>
              <input type="number" min="100" max="200" step="0.5" value={magnificationFactor}
                onChange={(e) => onMagnificationFactorChange?.(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-slate-700 outline-none"
                placeholder="115" />
              <span className="shrink-0 text-[11px] font-black text-slate-500">%</span>
            </div>

            {/* Draw + Apply — combined */}
            <div className="rounded-[18px] border border-white/60 cw-flat overflow-hidden">
              <div className="p-3">
                <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
                  2 · Circle diameter head
                </p>
                <button type="button" onClick={handleManualCircle}
                  className="flex w-full min-h-10 items-center justify-center gap-2 rounded-[12px] bg-slate-900 text-[10px] font-black tracking-wider text-white uppercase">
                  <MousePointer2 className="h-3.5 w-3.5" />
                  Gambar Circle Manual
                </button>
                <button type="button" onClick={handleAutoHeadCircle}
                  className="mt-2 flex w-full min-h-10 items-center justify-center gap-2 rounded-[12px] bg-blue-600 text-[10px] font-black tracking-wider text-white uppercase">
                  <Ruler className="h-3.5 w-3.5" />
                  Buat / Update Circle {anatomicalRefSizeMm || "-"} mm
                </button>
                {hasHeadCircle ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                        <Check className="h-3 w-3 text-white stroke-[3]" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-800">Circle siap</span>
                      <span className="ml-auto text-[10px] font-bold text-emerald-600">{selectedLengthText || "—"}</span>
                    </div>
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => setCanvasEditCompact(true)}
                        className="flex w-full min-h-10 items-center justify-center gap-2 rounded-[12px] bg-slate-900 text-[10px] font-black tracking-wider text-white uppercase"
                      >
                        <MousePointer2 className="h-3.5 w-3.5" />
                        Edit di Canvas
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 rounded-[10px] px-2.5 py-1.5 text-center text-[9px] text-slate-400 cw-pressed">
                    Buat circle, lalu geser dan resize sampai tepinya mengikuti head.
                  </div>
                )}
              </div>

              {hasHeadCircle && apparentSizeMm && (
                <button type="button" onClick={handleSave}
                  className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-[11px] font-black tracking-widest text-white uppercase transition-all active:brightness-90">
                  <Save className="h-4 w-4" />
                  Terapkan Kalibrasi
                </button>
              )}
              {hasCalibration && hasHeadCircle && (
                <div className="flex items-center gap-1.5 px-1 pt-0.5">
                  <Info className="h-3 w-3 shrink-0 text-amber-400" />
                  <span className="text-[9px] leading-snug text-amber-600">
                    Geser / resize circle, lalu klik Terapkan untuk update skala.
                  </span>
                </div>
              )}
            </div>

            {!hasHeadCircle && (
              <div className="flex items-center gap-1.5 px-1">
                <Info className="h-3 w-3 shrink-0 text-amber-400" />
                <span className="text-[9px] text-slate-400 leading-snug">
                  Buat circle caput dulu, lalu tombol "Terapkan" muncul di sini.
                </span>
              </div>
            )}

            {/* ── Mobile d-pad: move + resize circle ── */}
            {isMobile && hasHeadCircle && (
              <div className="rounded-[16px] border border-pink-200/60 bg-pink-50/60 p-3 space-y-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-pink-400">Kontrol Circle</p>

                {/* D-pad move */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div />
                  <button type="button"
                    className="flex h-10 items-center justify-center rounded-[12px] bg-white border border-pink-200 text-pink-500 text-lg font-black active:scale-95 shadow-sm"
                    onPointerDown={() => startNudge(() => onCircleNudge?.(0, -8))}
                    onPointerUp={stopNudge} onPointerLeave={stopNudge}>▲</button>
                  <div />
                  <button type="button"
                    className="flex h-10 items-center justify-center rounded-[12px] bg-white border border-pink-200 text-pink-500 text-lg font-black active:scale-95 shadow-sm"
                    onPointerDown={() => startNudge(() => onCircleNudge?.(-8, 0))}
                    onPointerUp={stopNudge} onPointerLeave={stopNudge}>◀</button>
                  <div className="flex h-10 items-center justify-center rounded-[12px] bg-pink-100 border border-pink-200">
                    <span className="text-[9px] font-black text-pink-400">MOVE</span>
                  </div>
                  <button type="button"
                    className="flex h-10 items-center justify-center rounded-[12px] bg-white border border-pink-200 text-pink-500 text-lg font-black active:scale-95 shadow-sm"
                    onPointerDown={() => startNudge(() => onCircleNudge?.(8, 0))}
                    onPointerUp={stopNudge} onPointerLeave={stopNudge}>▶</button>
                  <div />
                  <button type="button"
                    className="flex h-10 items-center justify-center rounded-[12px] bg-white border border-pink-200 text-pink-500 text-lg font-black active:scale-95 shadow-sm"
                    onPointerDown={() => startNudge(() => onCircleNudge?.(0, 8))}
                    onPointerUp={stopNudge} onPointerLeave={stopNudge}>▼</button>
                  <div />
                </div>

                {/* Resize */}
                <div className="flex items-center gap-2">
                  <button type="button"
                    className="flex h-10 flex-1 items-center justify-center rounded-[12px] bg-white border border-pink-200 text-pink-500 text-lg font-black active:scale-95 shadow-sm"
                    onPointerDown={() => startNudge(() => onCircleResize?.(-6))}
                    onPointerUp={stopNudge} onPointerLeave={stopNudge}>−</button>
                  <div className="flex-1 text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-pink-400">Radius</p>
                    <p className="text-[11px] font-black text-slate-700">
                      {circleRadiusPx != null ? `${Math.round(circleRadiusPx)} px` : "—"}
                    </p>
                  </div>
                  <button type="button"
                    className="flex h-10 flex-1 items-center justify-center rounded-[12px] bg-white border border-pink-200 text-pink-500 text-lg font-black active:scale-95 shadow-sm"
                    onPointerDown={() => startNudge(() => onCircleResize?.(6))}
                    onPointerUp={stopNudge} onPointerLeave={stopNudge}>+</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Zoom mode */
          <div className="space-y-2.5">
            <div className="rounded-[18px] border border-white/60 p-3 text-center cw-pressed">
              <Ruler className="mx-auto mb-2 h-7 w-7 text-blue-400" />
              <p className="text-[10px] leading-relaxed font-medium text-slate-500">
                Mode Zoom % — isi nilai mm/px @100% di bawah.
              </p>
            </div>
            <div className="rounded-[18px] border border-white/60 p-3 cw-flat">
              <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400">mm/px @100%</p>
              <input type="number" min="0" step="0.000001" value={mmPerPixelAt100Value}
                onChange={(e) => onMmPerPixelAt100Change?.(e.target.value)}
                className="w-full rounded-[12px] px-3 py-2 text-sm font-bold text-slate-800 outline-none cw-input" />
              <p className="mt-2 mb-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400">Zoom source (%)</p>
              <div className="flex gap-2">
                <input type="number" min="1" step="0.1" value={sourceZoomPercent}
                  onChange={(e) => onSourceZoomPercentChange?.(e.target.value)}
                  className="min-w-0 flex-1 rounded-[12px] px-3 py-2 text-sm font-bold text-slate-800 outline-none cw-input" />
                {["100", "90"].map((v) => (
                  <button key={v} type="button" onClick={() => onSourceZoomPercentChange?.(v)}
                    className="min-h-10 rounded-[12px] px-2.5 text-[10px] font-black text-slate-600 cw-btn">
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QC row — hidden in magnification mode */}
        <div className={`mt-2.5${isMagMode ? " hidden" : ""}`}>
          <button type="button" onClick={() => setShowQCDetail((v) => !v)}
            className="flex w-full items-center justify-between rounded-[14px] border px-3 py-2 text-[10px] font-black transition-all"
            style={{ background: qcBg, borderColor: `${qcColor}30`, color: qcColor }}>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              {calibrationQuality?.title || "QC belum tersedia"} · {factorText}
            </span>
            {showQCDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showQCDetail && (
            <div className="mt-1.5 rounded-[14px] bg-slate-900 p-3 text-white shadow-lg">
              <div className="mb-1.5 flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[9px] font-black uppercase">Detail QC</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-300">
                {calibrationQuality?.detail || "Simpan kalibrasi untuk menghitung faktor aktif."}
              </p>
            </div>
          )}
        </div>

        {/* Save button — hidden in magnification mode (has inline apply button) */}
        {!isMagMode && (
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" onClick={handleSave} disabled={!canSave}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-[11px] font-black tracking-widest text-white uppercase shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45">
              <Save className="h-4 w-4" /> Simpan Kalibrasi
            </button>
            {onStartTemplating && (
              <button type="button" onClick={() => { const ok = onSave?.(); if (ok) onStartTemplating?.(); }} disabled={!canSave}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-cyan-600 to-cyan-700 py-2.5 text-[10px] font-black tracking-widest text-white uppercase shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45">
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M5 2h6l.8 2.5H4.2L5 2z"/>
                  <rect x="3.5" y="4.5" width="9" height="1.5" rx="0.6"/>
                  <path d="M5 6 L4.5 14 M11 6 L11.5 14"/>
                  <path d="M5 9.5 Q8 8.5 11 9.5"/>
                </svg>
                Simpan &amp; Templating
              </button>
            )}
          </div>
        )}

        {!isMagMode && (
          <div className="mt-2 flex items-start gap-1.5 px-1">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
            <span className="text-[9px] font-medium text-slate-400 leading-snug">
              Isi nilai real marker/ruler X-ray. Contoh: 10 cm, 13 cm.
            </span>
          </div>
        )}
          </>
        )}
      </motion.div>
    </>
      )}
    </AnimatePresence>
  );
}
