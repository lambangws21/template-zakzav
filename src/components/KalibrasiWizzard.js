"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Info,
  Minus,
  MousePointer2,
  Plus,
  Ruler,
  Save,
  Scaling,
  X,
} from "lucide-react";

const TOTAL_STEPS = 2;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function CalibrationWizard({
  open = false,
  onClose,
  calibrationMode = "line",
  onCalibrationModeChange,
  calibrationReferenceLine = null,
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
  lineStrokeWidth = 2,
  onLineStrokeWidthChange,
  onSave,
  canSave = true,
  hasCalibration = false,
  measurementUnit = "cm",
  onStartTemplating,
} = {}) {
  const [step, setStep] = useState(1);
  const [showQCDetail, setShowQCDetail] = useState(false);

  const isLineMode = calibrationMode === "line";
  const strokeValue = Number.isFinite(Number(lineStrokeWidth)) ? Number(lineStrokeWidth) : 2;
  const progressWidth = (step / TOTAL_STEPS) * 100;
  const factorText =
    mmPerPixelValue !== null && Number.isFinite(mmPerPixelValue)
      ? `${mmPerPixelValue.toFixed(6)} mm/px`
      : "-";
  const referenceLabel =
    isLineMode && calibrationReferenceLine
      ? `Line #${calibrationReferenceLine.id} | ${lineTypeLabel(calibrationReferenceLine.type)}`
      : "Belum ada line terpilih";
  const qcStatus = calibrationQuality?.status || "bad";
  const qcTone =
    qcStatus === "good"
      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
      : qcStatus === "warn"
        ? "border-amber-100 bg-amber-50 text-amber-800"
        : "border-rose-100 bg-rose-50 text-rose-800";

  const stepLabels = ["Gambar Garis", "Nilai & Simpan"];

  useEffect(() => {
    if (open) {
      setStep(calibrationReferenceLine ? TOTAL_STEPS : 1);
      setShowQCDetail(false);
    }
  }, [open]);

  if (!open) return null;

  const updateStroke = (value) => {
    const nextValue = clamp(Number(value) || strokeValue, 0.5, 8);
    onLineStrokeWidthChange?.(nextValue);
  };

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSave = () => { onSave?.(); };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 p-3 font-sans backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .calib-neu-flat { background: #eef2f7; box-shadow: 3px 3px 8px #cbd5e1, -3px -3px 8px #ffffff; }
        .calib-neu-pressed { background: #eef2f7; box-shadow: inset 2px 2px 5px #cbd5e1, inset -2px -2px 5px #ffffff; }
        .calib-neu-card { background: #eef2f7; box-shadow: 8px 8px 16px rgba(148,163,184,0.55), -8px -8px 16px rgba(255,255,255,0.86); border: 1px solid rgba(255,255,255,0.8); }
        .calib-neu-button { background: #eef2f7; box-shadow: 2px 2px 5px #cbd5e1, -2px -2px 5px #ffffff; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.68); }
        .calib-neu-button:active { box-shadow: inset 2px 2px 4px #cbd5e1, inset -2px -2px 4px #ffffff; transform: translateY(1px); }
        .calib-neu-input { background: #edf1f6; box-shadow: inset 2px 2px 4px #c4cfdc, inset -2px -2px 4px #ffffff; border: 1px solid white; }
        .calib-active-blue { background: #3b82f6; color: white !important; box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2); }
      ` }} />

      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[32px] p-5 text-slate-800 calib-neu-card sm:p-6">

        {/* ── Header ── */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-blue-600 calib-neu-flat">
              <Scaling className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-slate-800 uppercase">Calibration Wizard</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                {hasCalibration ? `Aktif (${measurementUnit})` : "Belum aktif"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 calib-neu-button"
            aria-label="Tutup" title="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Step pills ── */}
        <div className="mb-4 flex gap-1.5">
          {stepLabels.map((label, idx) => {
            const s = idx + 1;
            const done = s < step;
            const active = s === step;
            return (
              <button key={label} type="button" onClick={() => setStep(s)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[10px] font-black transition-all ${
                  active ? "bg-slate-900 text-white shadow-md"
                  : done ? "bg-emerald-500 text-white"
                  : "text-slate-400 calib-neu-button"}`}>
                {done ? <Check className="h-3 w-3 stroke-[3px]" /> : <span className="text-[9px]">{s}</span>}
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Progress bar ── */}
        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 calib-neu-pressed">
          <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-500 ease-out"
            style={{ width: `${progressWidth}%` }} />
        </div>

        <div className="min-h-[200px]">

          {/* ════ STEP 1: Metode + Gambar Garis ════ */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Method selector */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl p-1.5 calib-neu-pressed">
                <button type="button" onClick={() => onCalibrationModeChange?.("line")}
                  className={`rounded-xl py-3 text-xs font-bold transition-all ${isLineMode ? "calib-active-blue" : "text-slate-500"}`}>
                  Garis Real
                </button>
                <button type="button" onClick={() => onCalibrationModeChange?.("zoom")}
                  className={`rounded-xl py-3 text-xs font-bold transition-all ${!isLineMode ? "calib-active-blue" : "text-slate-500"}`}>
                  Zoom %
                </button>
              </div>

              {isLineMode ? (
                <>
                  {/* Stroke width */}
                  <div className="space-y-3 rounded-2xl border border-white/60 p-4 calib-neu-flat">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700 uppercase">Ketebalan garis</span>
                      <span className="font-mono text-xs font-black text-blue-600">{strokeValue.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => updateStroke(strokeValue - 0.1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 calib-neu-button">
                        <Minus className="h-4 w-4" />
                      </button>
                      <input type="range" min="0.5" max="8" step="0.1" value={strokeValue}
                        onChange={(e) => updateStroke(e.target.value)}
                        className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-300 accent-blue-500" />
                      <button type="button" onClick={() => updateStroke(strokeValue + 0.1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 calib-neu-button">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1.5, 2.5, 4].map((v) => (
                        <button key={v} type="button" onClick={() => updateStroke(v)}
                          className={`min-h-9 rounded-xl text-[10px] font-black ${Math.abs(strokeValue - v) < 0.05 ? "calib-active-blue" : "text-slate-600 calib-neu-button"}`}>
                          {v}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Draw area */}
                  <div className="space-y-3 rounded-2xl border border-white/60 p-4 text-center calib-neu-pressed">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                      <MousePointer2 className="h-6 w-6 animate-bounce" />
                    </div>
                    <p className="px-1 text-[11px] leading-relaxed font-medium text-slate-500">
                      Tap atau drag 2 titik ujung marker/ruler pada kanvas.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={onManualDraw}
                        className="col-span-3 min-h-11 rounded-xl bg-slate-900 px-3 text-[10px] font-black tracking-wider text-white uppercase">
                        Gambar Manual
                      </button>
                      {[{ label: "10 cm", mm: 100 }, { label: "13 cm", mm: 130 }, { label: "15 cm", mm: 150 }].map(({ label, mm }) => (
                        <button key={mm} type="button" onClick={() => onCreatePresetLine?.(mm)}
                          className="min-h-10 rounded-xl text-[10px] font-black text-slate-600 calib-neu-button">
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 rounded-2xl border border-white/60 p-4 text-center calib-neu-pressed">
                  <Ruler className="mx-auto h-8 w-8 text-blue-400" />
                  <p className="text-[11px] leading-relaxed font-medium text-slate-500">
                    Mode Zoom % — isi nilai mm/px @100% dan zoom source pada langkah berikutnya.
                  </p>
                </div>
              )}

              {/* Line status */}
              <div className="rounded-2xl border border-white/70 px-3 py-2 text-[11px] font-bold text-slate-600 calib-neu-flat">
                {calibrationReferenceLine
                  ? `✓ ${referenceLabel} | ${selectedLengthText || "panjang belum terbaca"}`
                  : "Belum ada line. Gambar dulu atau pilih preset di atas."}
              </div>
            </div>
          )}

          {/* ════ STEP 2: Nilai Referensi + QC + Simpan ════ */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Input nilai */}
              <div className="space-y-4 rounded-2xl border border-white/60 p-4 calib-neu-flat">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">
                      {isLineMode ? "Nilai referensi real" : "mm/px @100%"}
                    </span>
                    <input type="number" min="0" step={isLineMode ? "0.01" : "0.000001"}
                      value={isLineMode ? actualValue : mmPerPixelAt100Value}
                      onChange={(e) => isLineMode ? onActualValueChange?.(e.target.value) : onMmPerPixelAt100Change?.(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none calib-neu-input" />
                  </div>
                  {isLineMode && (
                    <div className="w-24 space-y-1.5">
                      <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">Satuan</span>
                      <select value={actualUnit} onChange={(e) => onActualUnitChange?.(e.target.value)}
                        className="w-full cursor-pointer appearance-none rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none calib-neu-flat">
                        <option value="cm">cm</option>
                        <option value="mm">mm</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">Zoom source (%)</span>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input type="number" min="1" step="0.1" value={sourceZoomPercent}
                      onChange={(e) => onSourceZoomPercentChange?.(e.target.value)}
                      className="min-w-0 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none calib-neu-input" />
                    {["100", "90"].map((v) => (
                      <button key={v} type="button" onClick={() => onSourceZoomPercentChange?.(v)}
                        className="min-h-11 rounded-xl px-3 text-[10px] font-black text-slate-600 calib-neu-button">
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>

                {isLineMode && (
                  <button type="button" onClick={onCreatePresetFromInput}
                    className="min-h-11 w-full rounded-xl bg-slate-900 px-3 text-[10px] font-black tracking-wider text-white uppercase">
                    Buat ruler dari nilai referensi
                  </button>
                )}
              </div>

              {/* Line / status */}
              <div className="rounded-2xl border border-white/70 px-3 py-2 text-[11px] font-bold text-slate-600 calib-neu-flat">
                {isLineMode
                  ? calibrationReferenceLine
                    ? `✓ ${referenceLabel} | ${selectedLengthText || "panjang belum terbaca"}`
                    : "Belum ada line. Kembali ke langkah 1."
                  : `Zoom source ${sourceZoomPercent || "-"}%.`}
              </div>

              {/* QC */}
              <button type="button" onClick={() => setShowQCDetail((v) => !v)}
                className={`flex w-full items-center justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.99] ${qcTone}`}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-current/10">
                    <Check className="h-4 w-4 stroke-[3px]" />
                  </div>
                  <span className="min-w-0 truncate text-[11px] font-black tracking-wide uppercase">
                    {calibrationQuality?.title || "QC belum tersedia"} | {factorText}
                  </span>
                </div>
                <Info className="h-4 w-4 shrink-0" />
              </button>

              {showQCDetail && (
                <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-2xl">
                  <div className="mb-2 flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase">Detail QC</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-300">
                    {calibrationQuality?.detail || "Simpan kalibrasi untuk menghitung faktor aktif."}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 px-1 text-blue-600">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[10px] font-bold">
                  Isi nilai real marker/ruler. Contoh: 10 cm, 13 cm, atau sesuai marker X-ray.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 flex items-center gap-3 border-t border-slate-300/30 pt-4">
          {step > 1 && (
            <button type="button" onClick={goBack}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-500 calib-neu-button"
              aria-label="Kembali">
              ←
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button type="button" onClick={goNext}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-colors hover:bg-blue-600">
              Lanjut →
            </button>
          ) : (
            <div className="flex flex-1 flex-col gap-2">
              <button type="button" onClick={handleSave} disabled={!canSave}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45">
                <Save className="h-4 w-4" /> Simpan Kalibrasi
              </button>
              {onStartTemplating && (
                <button type="button" onClick={() => { onSave?.(); onStartTemplating(); }} disabled={!canSave}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-700 py-3 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45">
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M5 2h6l.8 2.5H4.2L5 2z"/>
                    <rect x="3.5" y="4.5" width="9" height="1.5" rx="0.6"/>
                    <path d="M5 6 L4.5 14 M11 6 L11.5 14"/>
                    <path d="M5 9.5 Q8 8.5 11 9.5"/>
                  </svg>
                  Simpan &amp; Mulai Templating
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
