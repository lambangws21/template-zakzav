"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle,
  Info,
  Minus,
  MousePointer,
  Plus,
  Scaling,
  X,
} from "lucide-react";

export default function CalibrationLineModalPanel({
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
  if (!open) return null;

  const isLineMode = calibrationMode === "line";
  const factorText =
    mmPerPixelValue !== null && Number.isFinite(mmPerPixelValue)
      ? `${mmPerPixelValue.toFixed(6)} mm/px`
      : "-";
  const qcStatus = calibrationQuality?.status || "warn";
  const qcIsGood = qcStatus === "good";
  const strokeValue = Number.isFinite(Number(lineStrokeWidth))
    ? Number(lineStrokeWidth)
    : 2;
  const referenceLabel =
    isLineMode && calibrationReferenceLine
      ? `Line #${calibrationReferenceLine.id} | ${lineTypeLabel(
          calibrationReferenceLine.type,
        )}`
      : "Belum ada line terpilih";

  const updateStroke = (value) => {
    const nextValue = Math.max(1, Math.min(8, Number(value) || strokeValue));
    onLineStrokeWidthChange?.(nextValue);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .neu-flat {
              background: #eef2f7;
              box-shadow: 6px 6px 14px #cbd5e1, -6px -6px 14px #ffffff;
            }
            .neu-pressed {
              background: #eef2f7;
              box-shadow: inset 4px 4px 8px #cbd5e1, inset -4px -4px 8px #ffffff;
            }
            .neu-card {
              background: #eef2f7;
              box-shadow: 5px 5px 14px rgba(148, 163, 184, 0.58), -5px -5px 12px rgba(255, 255, 255, 0.86);
              border: 1px solid rgba(255, 255, 255, 0.7);
            }
            .neu-button {
              background: #eef2f7;
              box-shadow: 5px 5px 10px #cbd5e1, -5px -5px 10px #ffffff;
              border: 1px solid rgba(255, 255, 255, 0.5);
              transition: all 0.2s ease;
            }
            .neu-button:hover {
              box-shadow: 2px 2px 5px #cbd5e1, -2px -2px 5px #ffffff;
              transform: translateY(1px);
            }
            .neu-button:active,
            .neu-button-active {
              box-shadow: inset 3px 3px 6px #cbd5e1, inset -3px -3px 6px #ffffff;
              transform: translateY(1.5px);
            }
            .neu-input {
              background: #edf1f6;
              box-shadow: inset 3px 3px 6px #c4cfdc, inset -3px -3px 6px #ffffff;
              border: 1px solid rgba(255, 255, 255, 0.9);
            }

            [data-theme="dark"] .neu-flat {
              background: #1e2840;
              box-shadow: 6px 6px 14px rgba(0,5,20,0.60), -6px -6px 14px rgba(50,75,130,0.22);
            }
            [data-theme="dark"] .neu-pressed {
              background: #1a2236;
              box-shadow: inset 4px 4px 8px rgba(0,5,20,0.55), inset -4px -4px 8px rgba(50,75,130,0.18);
            }
            [data-theme="dark"] .neu-card {
              background: #1a2438;
              box-shadow: 5px 5px 14px rgba(0,5,20,0.65), -5px -5px 12px rgba(50,75,130,0.20);
              border: 1px solid rgba(255,255,255,0.09);
              color: #c8d5e8;
            }
            [data-theme="dark"] .neu-button {
              background: #1e2840;
              box-shadow: 5px 5px 10px rgba(0,5,20,0.60), -5px -5px 10px rgba(50,75,130,0.20);
              border: 1px solid rgba(255,255,255,0.09);
              color: #94a3b8;
            }
            [data-theme="dark"] .neu-button:hover {
              box-shadow: 2px 2px 5px rgba(0,5,20,0.50), -2px -2px 5px rgba(50,75,130,0.16);
              color: #c8d5e8;
            }
            [data-theme="dark"] .neu-button:active,
            [data-theme="dark"] .neu-button-active {
              box-shadow: inset 3px 3px 6px rgba(0,5,20,0.50), inset -3px -3px 6px rgba(50,75,130,0.15);
            }
            [data-theme="dark"] .neu-input {
              background: #141d2e;
              box-shadow: inset 3px 3px 6px rgba(0,5,20,0.50), inset -3px -3px 6px rgba(50,75,130,0.15);
              border: 1px solid rgba(255,255,255,0.10);
              color: #c8d5e8;
            }
          `,
        }}
      />

      <div className="relative max-h-[92vh] w-full max-w-[490px] overflow-y-auto rounded-[28px] p-5 text-slate-800 neu-card">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-slate-900 neu-button"
          title="Tutup"
          aria-label="Tutup kalibrasi"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-1 pr-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl text-blue-600 neu-button">
              <Scaling className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Kalibrasi Line
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Pakai garis referensi real untuk menyimpan faktor kalibrasi sebelum
            measurement.
          </p>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/60 p-4 text-slate-600 neu-pressed">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-xs font-medium leading-relaxed">
            {isLineMode && !calibrationReferenceLine
              ? "Belum ada line terpilih. Buat ruler default di bawah atau gambar garis di kanvas untuk memulai kalibrasi."
              : "Semua kontrol di modal ini memakai state dan handler workspace utama."}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            1. Pilih Sumber Kalibrasi
          </label>
          <div className="grid grid-cols-2 gap-3 rounded-2xl p-1.5 neu-pressed">
            <button
              type="button"
              onClick={() => onCalibrationModeChange?.("line")}
              className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                isLineMode
                  ? "border border-white/40 text-slate-800 neu-button-active neu-pressed"
                  : "text-slate-500 neu-button"
              }`}
            >
              Garis Real
            </button>
            <button
              type="button"
              onClick={() => onCalibrationModeChange?.("zoom")}
              className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                !isLineMode
                  ? "border border-white/40 text-slate-800 neu-button-active neu-pressed"
                  : "text-slate-500 neu-button"
              }`}
            >
              Zoom %
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 p-3.5 neu-pressed">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  calibrationReferenceLine ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <div className="min-w-0 truncate text-xs font-bold text-slate-800">
                {referenceLabel}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                calibrationReferenceLine
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {calibrationReferenceLine ? "AKTIF" : "PILIH"}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            2. Faktor & QC
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Zoom Source (%)
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={sourceZoomPercent}
                  onChange={(event) =>
                    onSourceZoomPercentChange?.(event.target.value)
                  }
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none neu-input"
                />
                <button
                  type="button"
                  onClick={() => onSourceZoomPercentChange?.("100")}
                  className="rounded-xl px-2.5 py-2 text-[10px] font-extrabold text-slate-700 neu-button"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => onSourceZoomPercentChange?.("90")}
                  className="rounded-xl px-2.5 py-2 text-[10px] font-extrabold text-slate-700 neu-button"
                >
                  90%
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {isLineMode ? "Nilai Real" : "mm/px @100%"}
              </span>
              <div className="flex gap-2">
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
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none neu-input"
                />
                {isLineMode ? (
                  <select
                    value={actualUnit}
                    onChange={(event) => onActualUnitChange?.(event.target.value)}
                    className="cursor-pointer rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none neu-button"
                  >
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                  </select>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-slate-50/50 p-3.5 neu-flat">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Faktor Terhitung
            </span>
            <span className="font-mono text-sm font-black text-slate-900">
              {factorText}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              className={`flex gap-2.5 rounded-2xl border border-emerald-200/50 bg-emerald-50/80 p-2 ${
                qcIsGood ? "" : "opacity-55"
              }`}
            >
              <div className="rounded-lg p-1 text-white">
                <Check className="h-8 w-8 bg-emerald-500 rounded-full p-1" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-emerald-800">
                  QC: Baik
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-emerald-600">
                  {qcIsGood
                    ? calibrationQuality?.detail || "Kalibrasi stabil."
                    : "Aktif jika error berada dalam batas toleransi."}
                </div>
              </div>
            </div>
            <div
              className={`flex gap-2.5 rounded-2xl border border-rose-200/50 bg-rose-50/80 p-3 ${
                qcIsGood ? "opacity-55" : ""
              }`}
            >
              <div className="rounded-lg  p-1 text-white">
                <AlertTriangle className="h-8 w-8 bg-rose-500 rounded-full p-1.5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-rose-800">
                  QC: Perbaiki
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-rose-600">
                  {qcIsGood
                    ? "Jika error melebihi batas, perpanjang ruler."
                    : calibrationQuality?.detail ||
                      "Buat/pilih garis referensi sebelum simpan."}
                </div>
              </div>
            </div>
          </div>
          {selectedLengthText ? (
            <div className="text-[10px] font-medium text-slate-500">
              Panjang terpilih: {selectedLengthText}
            </div>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            3. Opsi Ruler & Tampilan
          </label>
          <div className="space-y-3 rounded-2xl p-4 neu-flat">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Ruler Default
              </span>
              <button
                type="button"
                onClick={onCreatePresetFromInput}
                className="rounded-xl px-3 py-2 text-[10px] font-extrabold text-slate-700 neu-button"
              >
                Buat
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[10, 13, 15].map((cmValue) => (
                <button
                  key={cmValue}
                  type="button"
                  onClick={() => onCreatePresetLine?.(cmValue * 10)}
                  className="rounded-xl py-2 text-xs font-bold text-slate-700 neu-button"
                >
                  {cmValue} cm
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onManualDraw}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white py-2.5 text-xs font-bold text-slate-700 neu-button hover:bg-slate-100"
            >
              <MousePointer className="h-3.5 w-3.5 text-blue-500" />
              Tutup Modal & Gambar Line Manual
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            4. Stroke Width Ruler
          </label>
          <div className="flex flex-col gap-4 rounded-2xl p-4 neu-pressed md:flex-row md:items-center">
            <div className="w-full flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700">
                  Ketebalan Garis
                </span>
                <span className="font-mono text-xs font-black text-blue-600">
                  {strokeValue.toFixed(1)}x
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateStroke(strokeValue - 0.2)}
                  disabled={!calibrationReferenceLine}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 neu-button disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.1"
                  value={strokeValue}
                  onChange={(event) => updateStroke(event.target.value)}
                  disabled={!calibrationReferenceLine}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => updateStroke(strokeValue + 0.2)}
                  disabled={!calibrationReferenceLine}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 neu-button disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] shadow-[5px_5px_12px_#c1ccd8,-5px_-5px_12px_#ffffff]">
                <div
                  className="absolute top-1.5 h-4 w-1 rounded-full bg-blue-600"
                  style={{
                    transform: `rotate(${((strokeValue - 1) / 7) * 270}deg)`,
                    transformOrigin: "center 100%",
                  }}
                />
                <div className="h-10 w-10 rounded-full border border-slate-200/50 bg-[#eef2f7] shadow-inner" />
              </div>
              <span className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Rotary Control
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-300/30 pt-4">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="flex min-w-[160px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs font-extrabold text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CheckCircle className="h-4 w-4" />
            Simpan Kalibrasi
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-rose-200/50 bg-rose-50 px-5 py-3 text-xs font-extrabold text-rose-700 transition-all hover:bg-rose-100/50 active:scale-[0.98]"
          >
            Tutup
          </button>
        </div>

        <div className="mt-3 text-xs font-medium text-slate-500">
          {hasCalibration ? `Aktif (${measurementUnit})` : "Belum aktif"}
        </div>
      </div>
    </div>
  );
}
