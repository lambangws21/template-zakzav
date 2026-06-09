"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Minus,
  MousePointer2,
  Plus,
  Ruler,
  Save,
  Scaling,
  X,
} from "lucide-react";

const TOTAL_STEPS = 4;

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
} = {}) {
  const [step, setStep] = useState(1);
  const [showQCDetail, setShowQCDetail] = useState(false);

  const isLineMode = calibrationMode === "line";
  const strokeValue = Number.isFinite(Number(lineStrokeWidth))
    ? Number(lineStrokeWidth)
    : 2;
  const progressWidth = (step / TOTAL_STEPS) * 100;
  const factorText =
    mmPerPixelValue !== null && Number.isFinite(mmPerPixelValue)
      ? `${mmPerPixelValue.toFixed(6)} mm/px`
      : "-";
  const referenceLabel =
    isLineMode && calibrationReferenceLine
      ? `Line #${calibrationReferenceLine.id} | ${lineTypeLabel(
          calibrationReferenceLine.type,
        )}`
      : "Belum ada line terpilih";
  const qcStatus = calibrationQuality?.status || "bad";
  const qcTone =
    qcStatus === "good"
      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
      : qcStatus === "warn"
        ? "border-amber-100 bg-amber-50 text-amber-800"
        : "border-rose-100 bg-rose-50 text-rose-800";

  const stepTitle = useMemo(() => {
    if (step === 1) return "Metode & ketebalan garis";
    if (step === 2) return isLineMode ? "Gambar garis kalibrasi" : "Validasi zoom source";
    if (step === 3) return "Tentukan nilai referensi";
    return "Finalisasi dan QC";
  }, [isLineMode, step]);

  useEffect(() => {
    if (open) {
      setStep(calibrationReferenceLine ? TOTAL_STEPS : 1);
      setShowQCDetail(false);
    }
  }, [open]); // intentionally only re-run on open toggle; calibrationReferenceLine is read at that moment

  if (!open) return null;

  const updateStroke = (value) => {
    const nextValue = clamp(Number(value) || strokeValue, 0.5, 8);
    onLineStrokeWidthChange?.(nextValue);
  };

  const goNext = () => setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  const goBack = () => setStep((current) => Math.max(1, current - 1));

  const handleSave = () => {
    onSave?.();
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 p-3 font-sans backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .calib-neu-flat { background: #eef2f7; box-shadow: 3px 3px 8px #cbd5e1, -3px -3px 8px #ffffff; }
            .calib-neu-pressed { background: #eef2f7; box-shadow: inset 2px 2px 5px #cbd5e1, inset -2px -2px 5px #ffffff; }
            .calib-neu-card { background: #eef2f7; box-shadow: 8px 8px 16px rgba(148,163,184,0.55), -8px -8px 16px rgba(255,255,255,0.86); border: 1px solid rgba(255,255,255,0.8); }
            .calib-neu-button { background: #eef2f7; box-shadow: 2px 2px 5px #cbd5e1, -2px -2px 5px #ffffff; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.68); }
            .calib-neu-button:active { box-shadow: inset 2px 2px 4px #cbd5e1, inset -2px -2px 4px #ffffff; transform: translateY(1px); }
            .calib-neu-input { background: #edf1f6; box-shadow: inset 2px 2px 4px #c4cfdc, inset -2px -2px 4px #ffffff; border: 1px solid white; }
            .calib-active-blue { background: #3b82f6; color: white !important; box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2); }
          `,
        }}
      />

      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[32px] p-5 text-slate-800 calib-neu-card sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-blue-600 calib-neu-flat">
              <Scaling className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-slate-800 uppercase">
                Calibration Wizard
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Step {step} of {TOTAL_STEPS} | {hasCalibration ? `Aktif (${measurementUnit})` : "Belum aktif"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 calib-neu-button"
            aria-label="Tutup kalibrasi"
            title="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 calib-neu-pressed">
          <div
            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-500 ease-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="min-h-[232px]">
          <div className="mb-3 text-[10px] font-black tracking-wide text-slate-500 uppercase">
            {step}. {stepTitle}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-2xl p-1.5 calib-neu-pressed">
                <button
                  type="button"
                  onClick={() => onCalibrationModeChange?.("line")}
                  className={`rounded-xl py-3 text-xs font-bold transition-all ${
                    isLineMode ? "calib-active-blue" : "text-slate-500"
                  }`}
                >
                  Garis Real
                </button>
                <button
                  type="button"
                  onClick={() => onCalibrationModeChange?.("zoom")}
                  className={`rounded-xl py-3 text-xs font-bold transition-all ${
                    !isLineMode ? "calib-active-blue" : "text-slate-500"
                  }`}
                >
                  Zoom %
                </button>
              </div>
              <p className="px-1 text-[11px] leading-relaxed font-medium text-slate-500">
                {isLineMode
                  ? "Gunakan garis pada marker/ruler X-ray sebagai acuan skala. Atur ketebalan dulu agar garis mudah terlihat saat digambar."
                  : "Gunakan nilai mm/px pada zoom 100% dan zoom source. Mode ini tetap memakai logic zoom kalibrasi lama."}
              </p>
              {isLineMode ? (
                <div className="space-y-4 rounded-2xl border border-white/60 p-4 calib-neu-flat">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 uppercase">
                      Ketebalan garis
                    </span>
                    <span className="font-mono text-xs font-black text-blue-600">
                      {strokeValue.toFixed(1)}x
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => updateStroke(strokeValue - 0.1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 calib-neu-button"
                      aria-label="Kurangi ketebalan garis"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="range"
                      min="0.5"
                      max="8"
                      step="0.1"
                      value={strokeValue}
                      onChange={(event) => updateStroke(event.target.value)}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-300 accent-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => updateStroke(strokeValue + 0.1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 calib-neu-button"
                      aria-label="Tambah ketebalan garis"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1.5, 2.5, 4].map((value) => (
                      <button
                        key={`calib-stroke-${value}`}
                        type="button"
                        onClick={() => updateStroke(value)}
                        className={`min-h-9 rounded-xl text-[10px] font-black ${
                          Math.abs(strokeValue - value) < 0.05
                            ? "calib-active-blue"
                            : "text-slate-600 calib-neu-button"
                        }`}
                      >
                        {value}x
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-white/60 p-5 text-center calib-neu-pressed">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 shadow-inner">
                  {isLineMode ? (
                    <MousePointer2 className="h-8 w-8 animate-bounce" />
                  ) : (
                    <Ruler className="h-8 w-8" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 uppercase">
                    {isLineMode ? "Tarik garis di kanvas" : "Mode zoom siap"}
                  </h3>
                  <p className="px-2 text-[11px] leading-relaxed font-medium text-slate-500">
                    {isLineMode
                      ? "Tap atau drag 2 titik ujung marker/ruler pada kanvas. Nilai real diisi pada langkah berikutnya."
                      : "Pastikan zoom source dan mm/px @100% sudah sesuai sebelum simpan."}
                  </p>
                </div>
                {isLineMode ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={onManualDraw}
                      className="col-span-3 min-h-11 rounded-xl bg-slate-900 px-3 text-[10px] font-black tracking-wider text-white uppercase"
                    >
                      Gambar manual
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreatePresetLine?.(100)}
                      className="min-h-10 rounded-xl text-[10px] font-black text-slate-600 calib-neu-button"
                    >
                      10 cm
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreatePresetLine?.(130)}
                      className="min-h-10 rounded-xl text-[10px] font-black text-slate-600 calib-neu-button"
                    >
                      13 cm
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreatePresetLine?.(150)}
                      className="min-h-10 rounded-xl text-[10px] font-black text-slate-600 calib-neu-button"
                    >
                      15 cm
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-white/70 px-3 py-2 text-[11px] font-bold text-slate-600 calib-neu-flat">
                {isLineMode
                  ? calibrationReferenceLine
                    ? `${referenceLabel} | ${selectedLengthText || "panjang belum terbaca"}`
                    : "Belum ada line terpilih."
                  : `Zoom source ${sourceZoomPercent || "-"}%.`}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="space-y-5 rounded-2xl border border-white/60 p-4 calib-neu-flat">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">
                      {isLineMode ? "Nilai referensi real" : "mm/px @100%"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step={isLineMode ? "0.01" : "0.000001"}
                      value={isLineMode ? actualValue : mmPerPixelAt100Value}
                      onChange={(event) =>
                        isLineMode
                          ? onActualValueChange?.(event.target.value)
                          : onMmPerPixelAt100Change?.(event.target.value)
                      }
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none calib-neu-input"
                    />
                  </div>
                  {isLineMode ? (
                    <div className="w-24 space-y-1.5">
                      <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">
                        Satuan
                      </span>
                      <select
                        value={actualUnit}
                        onChange={(event) => onActualUnitChange?.(event.target.value)}
                        className="w-full cursor-pointer appearance-none rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none calib-neu-flat"
                      >
                        <option value="cm">cm</option>
                        <option value="mm">mm</option>
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <span className="ml-1 text-[9px] font-bold text-slate-400 uppercase">
                    Zoom source (%)
                  </span>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={sourceZoomPercent}
                      onChange={(event) =>
                        onSourceZoomPercentChange?.(event.target.value)
                      }
                      className="min-w-0 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none calib-neu-input"
                    />
                    <button
                      type="button"
                      onClick={() => onSourceZoomPercentChange?.("100")}
                      className="min-h-11 rounded-xl px-3 text-[10px] font-black text-slate-600 calib-neu-button"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={() => onSourceZoomPercentChange?.("90")}
                      className="min-h-11 rounded-xl px-3 text-[10px] font-black text-slate-600 calib-neu-button"
                    >
                      90%
                    </button>
                  </div>
                </div>
                {isLineMode ? (
                  <button
                    type="button"
                    onClick={onCreatePresetFromInput}
                    className="min-h-11 w-full rounded-xl bg-slate-900 px-3 text-[10px] font-black tracking-wider text-white uppercase"
                  >
                    Buat ruler dari nilai referensi
                  </button>
                ) : null}
              </div>
              <div className="rounded-2xl border border-white/70 px-3 py-2 text-[11px] font-bold text-slate-600 calib-neu-flat">
                {isLineMode
                  ? calibrationReferenceLine
                    ? `${referenceLabel} | ${selectedLengthText || "panjang belum terbaca"}`
                    : "Belum ada line terpilih. Kembali ke langkah gambar garis."
                  : `Zoom source ${sourceZoomPercent || "-"}%.`}
              </div>
              <div className="flex items-center gap-2 px-1 text-blue-600">
                <Info className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold">
                  Isi nilai real marker/ruler. Contoh umum: 10 cm, 13 cm, atau sesuai marker X-ray.
                </span>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/70 p-3 text-[11px] font-bold text-slate-600 calib-neu-flat">
                <div className="flex items-center justify-between gap-3">
                  <span>Metode</span>
                  <span className="text-slate-900">
                    {isLineMode ? "Garis Real" : "Zoom %"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span>Referensi</span>
                  <span className="text-slate-900">
                    {isLineMode ? `${actualValue || "-"} ${actualUnit}` : `${mmPerPixelAt100Value || "-"} mm/px`}
                  </span>
                </div>
                {isLineMode ? (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span>Ketebalan</span>
                    <span className="text-slate-900">{strokeValue.toFixed(1)}x</span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowQCDetail((current) => !current)}
                className={`flex w-full items-center justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.99] ${qcTone}`}
              >
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

              {showQCDetail ? (
                <div className="relative rounded-2xl bg-slate-900 p-4 text-white shadow-2xl">
                  <div className="mb-2 flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase">
                      Detail QC
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-300">
                    {calibrationQuality?.detail ||
                      "Simpan kalibrasi untuk menghitung faktor aktif."}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-300/30 pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-500 calib-neu-button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-colors hover:bg-blue-600"
            >
              Lanjut <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Save className="h-4 w-4" /> Simpan Kalibrasi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
