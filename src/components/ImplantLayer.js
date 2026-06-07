"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  FolderOpen,
  Info,
  X,
} from "lucide-react";
import {
  countImplantLibraryByType,
  getImplantLibraryItemsByType,
  groupImplantLibraryBySystem,
  IMPLANT_LIBRARY_TYPE_LABELS,
} from "../lib/digitalTemplating/implantLibrary";

const TYPE_KEYS = Object.keys(IMPLANT_LIBRARY_TYPE_LABELS);

const IMPLANT_LAYER_STYLES = `
  .implant-layer-card {
    background: #eef2f7;
    box-shadow: 5px 5px 14px rgba(148, 163, 184, 0.28), -5px -5px 14px rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.78);
  }
  .implant-layer-soft {
    background: #eef2f7;
    box-shadow: 3px 3px 8px rgba(148, 163, 184, 0.25), -3px -3px 8px rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.72);
  }
  .implant-layer-inset {
    background: #edf1f6;
    box-shadow: inset 2.5px 2.5px 6px rgba(148, 163, 184, 0.28), inset -2.5px -2.5px 6px rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.82);
  }
  .implant-layer-active {
    background: #1f2937;
    color: #ffffff;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.28), 2px 2px 7px rgba(30, 41, 59, 0.16);
    border-color: rgba(15, 23, 42, 0.6);
  }
`;

function MetricPill({ label, value }) {
  const displayValue =
    value === null || value === undefined || value === "" ? "-" : String(value);

  return (
    <div className="min-w-0 rounded-2xl border border-white/65 bg-white/42 px-3 py-2 shadow-[inset_1.5px_1.5px_3px_rgba(148,163,184,0.16),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.76)]">
      <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
        {label}
      </div>
      <div className="truncate text-[11px] font-extrabold text-slate-700">
        {displayValue}
      </div>
    </div>
  );
}

export default function ImplantLayer({
  items = [],
  selectedType = "cup",
  selectedItemId = "",
  onSelectType,
  onSelectItemId,
  onUseSelected,
  onReplaceSelected,
  canReplaceSelected = false,
  onClose,
  disabled = false,
  scaleInstruction = "",
  className = "",
  compact = false,
  showClose = false,
  title = "Implant Layer",
  subtitle = "Template overlay",
}) {
  const normalizedType = TYPE_KEYS.includes(selectedType)
    ? selectedType
    : TYPE_KEYS[0] || "cup";
  const counts = useMemo(() => countImplantLibraryByType(items), [items]);
  const filteredItems = useMemo(
    () => getImplantLibraryItemsByType(normalizedType, items),
    [items, normalizedType],
  );
  const groupedItems = useMemo(
    () => groupImplantLibraryBySystem(filteredItems),
    [filteredItems],
  );
  const selectedItem =
    filteredItems.find((item) => String(item.id) === String(selectedItemId)) ||
    filteredItems[0] ||
    null;

  const handleTypeChange = (type) => {
    onSelectType?.(type);
    const firstItem = getImplantLibraryItemsByType(type, items)[0];
    if (firstItem) {
      onSelectItemId?.(firstItem.id);
    }
  };

  return (
    <section
      className={`implant-layer-card w-full rounded-[30px] p-4 text-slate-800 ${
        compact ? "space-y-3" : "space-y-4"
      } ${className}`}
    >
      <style>{IMPLANT_LAYER_STYLES}</style>

      <div className="flex items-start justify-between gap-3 border-b border-slate-300/20 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="implant-layer-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-cyan-700">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-black tracking-wider text-slate-900 uppercase">
              {compact ? "Implant" : title}
            </h2>
            <p className="mt-0.5 truncate text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {scaleInstruction ? (
            <button
              type="button"
              className="implant-layer-soft flex h-9 w-9 items-center justify-center rounded-full text-cyan-700"
              title={scaleInstruction}
              aria-label={scaleInstruction}
            >
              <AlertCircle className="h-4 w-4" />
            </button>
          ) : null}
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              className="implant-layer-soft flex h-9 w-9 items-center justify-center rounded-full text-slate-600"
              aria-label="Tutup implant layer"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="grid grid-cols-3 gap-2">
          <MetricPill label="Stem" value={counts.stem || 0} />
          <MetricPill label="Cup" value={counts.cup || 0} />
          <MetricPill label="Knee" value={counts.knee || 0} />
        </div>
      ) : null}

      <div className="implant-layer-inset grid grid-cols-3 gap-1.5 rounded-2xl p-1.5">
        {TYPE_KEYS.map((type) => {
          const label = IMPLANT_LIBRARY_TYPE_LABELS[type];
          const isActive = normalizedType === type;
          return (
            <button
              key={`implant-layer-type-${type}`}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`min-h-10 rounded-xl px-2 text-[10px] font-black uppercase transition-all ${
                isActive
                  ? "implant-layer-active"
                  : "implant-layer-soft text-slate-500 hover:text-slate-800"
              }`}
              title={label}
            >
              {compact ? label.slice(0, 4) : label}
            </button>
          );
        })}
      </div>

      <label className="block space-y-1.5">
        <span className="px-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
          Model template
        </span>
        <div className="relative">
          <select
            value={selectedItem?.id || ""}
            onChange={(event) => onSelectItemId?.(event.target.value)}
            className="implant-layer-inset w-full cursor-pointer appearance-none rounded-2xl px-3 py-3 pr-9 text-xs font-bold text-slate-800 outline-none"
            title="Pilih implant lokal"
          >
            {Object.keys(groupedItems).length === 0 ? (
              <option value="">Belum ada item</option>
            ) : (
              Object.entries(groupedItems).map(([system, systemItems]) => (
                <optgroup key={system} label={system}>
                  {systemItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute top-3.5 right-3.5 h-4 w-4 text-slate-500" />
        </div>
      </label>

      {selectedItem ? (
        compact ? (
          <div className="implant-layer-inset min-w-0 rounded-2xl px-3 py-2">
            <div className="truncate text-[11px] font-black text-slate-800">
              {selectedItem.label}
            </div>
            <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
              {selectedItem.brand} | {selectedItem.system} | Size{" "}
              {selectedItem.size}
            </div>
          </div>
        ) : (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_130px]">
          <div className="implant-layer-inset min-w-0 rounded-2xl p-3">
            <div className="truncate text-sm font-black text-slate-900">
              {selectedItem.label}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <MetricPill label="Brand" value={selectedItem.brand} />
              <MetricPill label="System" value={selectedItem.system} />
              <MetricPill label="Size" value={selectedItem.size} />
              <MetricPill
                label="Type"
                value={IMPLANT_LIBRARY_TYPE_LABELS[selectedItem.type]}
              />
            </div>
          </div>

          <div className="implant-layer-inset flex min-h-32 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/95 p-2">
            <img
              src={selectedItem.imageSrc}
              alt={selectedItem.label}
              className="max-h-40 w-full object-contain"
            />
          </div>
        </div>
        )
      ) : (
        <div className="implant-layer-inset rounded-2xl px-3 py-4 text-center text-xs font-semibold text-slate-500">
          Belum ada template implant untuk kategori ini.
        </div>
      )}

      {scaleInstruction ? (
        <div className="implant-layer-inset flex items-start gap-2 rounded-2xl px-3 py-2 text-[10px] font-semibold leading-4 text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-700" />
          <span>{scaleInstruction}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUseSelected}
          disabled={disabled || !selectedItem}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-200/80 px-3 py-3 text-xs font-black text-emerald-800 shadow-[3px_3px_8px_rgba(16,185,129,0.14),-3px_-3px_8px_rgba(255,255,255,0.78)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          title="Tambahkan implant sebagai layer template baru"
        >
          <Check className="h-4 w-4" />
          Pakai
        </button>
        <button
          type="button"
          onClick={onReplaceSelected}
          disabled={disabled || !selectedItem || !canReplaceSelected}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-100/75 px-3 py-3 text-xs font-black text-cyan-800 shadow-[3px_3px_8px_rgba(6,182,212,0.12),-3px_-3px_8px_rgba(255,255,255,0.78)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          title="Ganti layer/template aktif tanpa mengubah posisi dan ukuran tampilan"
        >
          <FolderOpen className="h-4 w-4" />
          Ganti
        </button>
      </div>

      {!compact ? (
        <div className="flex items-center justify-center gap-2 text-[10px] font-black tracking-wider text-slate-400 uppercase">
          <Eye className="h-3.5 w-3.5" />
          Preview mengikuti template lokal yang dipilih
        </div>
      ) : null}
    </section>
  );
}
