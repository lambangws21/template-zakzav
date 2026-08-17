"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  RulerDimensionLine,
  X,
} from "lucide-react";

export const NORMMED_TKR_PS_FEMORAL_SIZES = [
  { size: "1", width: 56, length: 45.3, height: 51.8 },
  { size: "2", width: 60.5, length: 49.25, height: 56.65 },
  { size: "3", width: 64.15, length: 52.3, height: 61 },
  { size: "4", width: 68, length: 54.4, height: 64.9 },
  { size: "5", width: 72.6, length: 57.1, height: 68.7 },
  { size: "6", width: 77, length: 59.65, height: 72.7 },
];

const DIMENSION_OPTIONS = [
  {
    key: "width",
    label: "Width / ML",
    helper: "Lebar mediolateral femoral component.",
  },
  {
    key: "length",
    label: "Length / AP",
    helper: "Panjang AP femoral component.",
  },
  {
    key: "height",
    label: "Height",
    helper: "Tinggi femoral component pada tampilan lateral.",
  },
];

const parseMmValue = (value) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const formatMm = (value, digits = 2) => {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(digits).replace(/\.?0+$/, "")} mm`;
};

export function getNormmedFemoralSizeMatches(valueMm, dimension = "width") {
  if (!Number.isFinite(valueMm) || valueMm <= 0) return [];

  return NORMMED_TKR_PS_FEMORAL_SIZES.map((item) => ({
    ...item,
    referenceMm: item[dimension],
    deltaMm: valueMm - item[dimension],
    absDeltaMm: Math.abs(valueMm - item[dimension]),
  })).sort((a, b) => a.absDeltaMm - b.absDeltaMm);
}

function getFitTone(deltaMm) {
  if (!Number.isFinite(deltaMm)) {
    return {
      label: "Butuh ukuran",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      icon: AlertCircle,
    };
  }
  if (deltaMm <= 1.5) {
    return {
      label: "Cocok",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    };
  }
  if (deltaMm <= 3) {
    return {
      label: "Periksa",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: AlertCircle,
    };
  }
  return {
    label: "Selisih besar",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: AlertCircle,
  };
}

export default function NormmedFemoralSizeChecker({
  className = "",
  compact = false,
  hasCalibration = false,
  selectedLineLengthMm = null,
  selectedLineLabel = "",
  selectedLineAutoDetected = false,
  scaleSourceLabel = "",
  onStartLine,
  onClose,
}) {
  const selectedLineValue = Number.isFinite(selectedLineLengthMm)
    ? selectedLineLengthMm
    : null;
  const [dimension, setDimension] = useState("width");
  const [source, setSource] = useState(selectedLineValue ? "line" : "manual");
  const [manualValue, setManualValue] = useState("");

  useEffect(() => {
    if (selectedLineValue && !manualValue) {
      setSource("line");
    }
  }, [manualValue, selectedLineValue]);

  const measuredMm =
    source === "line" ? selectedLineValue : parseMmValue(manualValue);

  const matches = useMemo(
    () => getNormmedFemoralSizeMatches(measuredMm, dimension),
    [dimension, measuredMm],
  );
  const recommended = matches[0] || null;
  const selectedDimension =
    DIMENSION_OPTIONS.find((item) => item.key === dimension) ||
    DIMENSION_OPTIONS[0];
  const tone = getFitTone(recommended?.absDeltaMm);
  const ToneIcon = tone.icon;

  return (
    <div
      className={`rounded-[24px] border border-white/80 bg-[#e9eef5] text-slate-900 shadow-[8px_8px_22px_rgba(100,116,139,0.18),-6px_-6px_18px_rgba(255,255,255,0.78)] ${compact ? "p-3" : "p-4 sm:p-5"} ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 sm:text-base">
            <Calculator className="h-4 w-4 shrink-0 text-cyan-700" />
            <span>Normmed TKR PS/CR Femoral Size</span>
          </div>
          <p className="mt-1 text-[10px] font-semibold leading-snug text-slate-500 sm:text-xs">
            Cek ukuran femoral dari Width, Length, atau Height berdasarkan
            tabel Normmed/Gordion Total Knee System PS/CR.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/80 bg-[#e9eef5] text-slate-600 shadow-[3px_3px_8px_rgba(100,116,139,0.18),-3px_-3px_8px_rgba(255,255,255,0.78)]"
            aria-label="Tutup cek size femoral"
            title="Tutup"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-1.5 rounded-[18px] border border-white/70 bg-white/28 p-1">
        {DIMENSION_OPTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setDimension(item.key)}
            className={`min-h-9 rounded-[14px] px-2 text-[9px] font-black transition sm:text-[10px] ${
              dimension === item.key
                ? "bg-slate-900 text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.24)]"
                : "text-slate-600"
            }`}
            title={item.helper}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
          Nilai {selectedDimension.label} (mm)
          <input
            type="number"
            min="1"
            step="0.1"
            value={manualValue}
            onChange={(event) => {
              setManualValue(event.target.value);
              setSource("manual");
            }}
            placeholder="Masukkan mm manual"
            className="mt-1.5 h-10 w-full rounded-[16px] border border-white/80 bg-[#eef2f7] px-3 text-sm font-bold text-slate-800 outline-none shadow-[inset_3px_3px_8px_rgba(100,116,139,0.16),inset_-3px_-3px_8px_rgba(255,255,255,0.8)]"
          />
        </label>

        <div className="grid grid-cols-2 gap-1.5 sm:w-48">
          <button
            type="button"
            onClick={() => setSource("line")}
            disabled={!selectedLineValue}
            className="rounded-[16px] border border-cyan-200 bg-cyan-50 px-2 py-2 text-[9px] font-black text-cyan-800 shadow-[2px_2px_6px_rgba(14,165,233,0.14)] disabled:cursor-not-allowed disabled:opacity-40"
            title={
              selectedLineValue
                ? `Pakai ${selectedLineLabel || "line terpilih"}`
                : "Pilih line yang sudah dikalibrasi dulu"
            }
          >
            Pakai Auto
          </button>
          <button
            type="button"
            onClick={onStartLine}
            className="rounded-[16px] border border-white/80 bg-[#e9eef5] px-2 py-2 text-[9px] font-black text-slate-700 shadow-[3px_3px_8px_rgba(100,116,139,0.18),-3px_-3px_8px_rgba(255,255,255,0.78)]"
          >
            Buat Line
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-2 py-1">
          <RulerDimensionLine className="h-3 w-3" />
          {source === "line" && selectedLineValue
            ? `${selectedLineAutoDetected ? "Auto: " : ""}${selectedLineLabel || "Line terpilih"}: ${formatMm(selectedLineValue)}`
            : "Input manual aktif"}
        </span>
        <span
          className={`rounded-full border px-2 py-1 ${
            hasCalibration
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {hasCalibration ? "Kalibrasi aktif" : "Belum kalibrasi"}
        </span>
        {scaleSourceLabel ? (
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-cyan-700">
            {scaleSourceLabel}
          </span>
        ) : null}
      </div>

      {recommended ? (
        <div className={`mt-3 rounded-[18px] border p-3 ${tone.className}`}>
          <div className="flex items-start gap-2">
            <ToneIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-75">
                Rekomendasi Normmed
              </div>
              <div className="mt-0.5 text-2xl font-black leading-none">
                Size {recommended.size}
              </div>
              <p className="mt-1 text-[10px] font-bold leading-snug">
                {selectedDimension.label}: data pasien {formatMm(measuredMm)}.
                Referensi size {recommended.size}:{" "}
                {formatMm(recommended.referenceMm)}. Selisih{" "}
                {formatMm(recommended.deltaMm, 2)} ({tone.label}).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] font-bold leading-snug text-amber-800">
          Pilih line yang sudah dikalibrasi atau isi nilai mm manual untuk
          melihat rekomendasi size femoral.
        </div>
      )}

      {matches.length ? (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {matches.slice(0, 3).map((item, index) => (
            <div
              key={`${item.size}-${item.referenceMm}`}
              className={`rounded-[16px] border px-2 py-2 text-center ${
                index === 0
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-white/70 bg-white/38 text-slate-700"
              }`}
            >
              <div className="text-[9px] font-black uppercase opacity-70">
                Opsi {index + 1}
              </div>
              <div className="text-sm font-black">Size {item.size}</div>
              <div className="text-[9px] font-bold opacity-75">
                {formatMm(item.referenceMm)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-3 overflow-hidden rounded-[18px] border border-white/70 bg-white/28">
          <div className="grid grid-cols-4 bg-slate-900 px-2 py-2 text-[9px] font-black uppercase tracking-wider text-white">
            <span>Size</span>
            <span>Width</span>
            <span>Length</span>
            <span>Height</span>
          </div>
          {NORMMED_TKR_PS_FEMORAL_SIZES.map((item) => {
            const active = recommended?.size === item.size;
            return (
              <div
                key={item.size}
                className={`grid grid-cols-4 px-2 py-2 text-[10px] font-bold ${
                  active
                    ? "bg-cyan-50 text-cyan-900"
                    : "border-t border-white/60 text-slate-600"
                }`}
              >
                <span className="font-black">Size {item.size}</span>
                <span>{formatMm(item.width)}</span>
                <span>{formatMm(item.length)}</span>
                <span>{formatMm(item.height)}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="mt-2 text-[9px] font-semibold leading-snug text-slate-400">
        Data referensi diambil dari tabel Normmed/Gordion Total Knee System
        PS/CR yang kamu berikan. Validasi akhir tetap mengikuti evaluasi klinis
        dan templating intra-operatif.
      </p>
    </div>
  );
}
