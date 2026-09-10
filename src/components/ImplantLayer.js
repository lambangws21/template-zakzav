"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  FolderOpen,
  Info,
  Search,
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
    box-shadow: 0 4px 14px rgba(15,23,42,0.10);
    border: 1px solid #cbd5e1;
    color: #1e293b;
  }
  .implant-layer-soft {
    background: #f8fafc;
    box-shadow: none;
    border: 1px solid #cbd5e1;
  }
  .implant-layer-inset {
    background: #f8fafc;
    box-shadow: none;
    border: 1px solid #cbd5e1;
  }
  .implant-layer-active {
    background: #1f2937;
    color: #ffffff;
    box-shadow: none;
    border-color: #0f172a;
  }
  .implant-layer-label-hi { color: #0f172a; }
  .implant-layer-label-md { color: #475569; }
  .implant-layer-label-lo { color: #94a3b8; }
  .implant-layer-select { color: #1e293b; }
  .implant-layer-divider { border-color: rgba(203,213,225,0.35); }
  .implant-layer-metric {
    background: rgba(255,255,255,0.42);
    border: 1px solid rgba(255,255,255,0.65);
    box-shadow: none;
  }
  .implant-layer-btn-use {
    border: 1px solid #6ee7b7;
    background: rgba(209,250,229,0.80);
    color: #065f46;
    box-shadow: none;
  }
  .implant-layer-btn-use:hover { background: rgba(187,247,208,0.9); }
  .implant-layer-btn-replace {
    border: 1px solid #a5f3fc;
    background: rgba(207,250,254,0.75);
    color: #0e7490;
    box-shadow: none;
  }
  .implant-layer-btn-replace:hover { background: rgba(165,243,252,0.9); }
  .implant-layer-hint { color: #64748b; }

  /* ─── Dark mode ─────────────────────────────────────────── */
  [data-theme="dark"] .implant-layer-card {
    background: rgba(15,23,42,0.92);
    box-shadow: 0 5px 16px rgba(0,0,0,0.28);
    border: 1px solid rgba(148,163,184,0.28);
    color: #e2e8f0;
  }
  [data-theme="dark"] .implant-layer-soft {
    background: rgba(30,41,59,0.80);
    box-shadow: none;
    border: 1px solid rgba(255,255,255,0.09);
  }
  [data-theme="dark"] .implant-layer-inset {
    background: rgba(8,14,28,0.70);
    box-shadow: none;
    border: 1px solid rgba(255,255,255,0.07);
  }
  [data-theme="dark"] .implant-layer-active {
    background: rgba(14,165,233,0.18);
    color: #38bdf8;
    box-shadow: none;
    border-color: rgba(14,165,233,0.35);
  }
  [data-theme="dark"] .implant-layer-label-hi { color: #f1f5f9; }
  [data-theme="dark"] .implant-layer-label-md { color: #94a3b8; }
  [data-theme="dark"] .implant-layer-label-lo { color: #475569; }
  [data-theme="dark"] .implant-layer-select { color: #cbd5e1; }
  [data-theme="dark"] .implant-layer-divider { border-color: rgba(255,255,255,0.08); }
  [data-theme="dark"] .implant-layer-metric {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow: none;
  }
  [data-theme="dark"] .implant-layer-btn-use {
    border: 1px solid rgba(52,211,153,0.30);
    background: rgba(6,78,59,0.55);
    color: #6ee7b7;
    box-shadow: none;
  }
  [data-theme="dark"] .implant-layer-btn-use:hover { background: rgba(6,78,59,0.75); }
  [data-theme="dark"] .implant-layer-btn-replace {
    border: 1px solid rgba(34,211,238,0.28);
    background: rgba(8,51,68,0.55);
    color: #67e8f9;
    box-shadow: none;
  }
  [data-theme="dark"] .implant-layer-btn-replace:hover { background: rgba(8,51,68,0.75); }
  [data-theme="dark"] .implant-layer-hint { color: #475569; }
`;

function MetricPill({ label, value }) {
  const displayValue =
    value === null || value === undefined || value === "" ? "-" : String(value);
  return (
    <div className="implant-layer-metric min-w-0 rounded-2xl px-3 py-2">
      <div className="implant-layer-label-lo text-[9px] font-black tracking-widest uppercase">
        {label}
      </div>
      <div className="implant-layer-label-hi truncate text-[11px] font-extrabold">
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
  calibrated = true,
  scaleInstruction = "",
  className = "",
  compact = false,
  showClose = false,
  title = "Implant Layer",
  subtitle = "Template overlay",
}) {
  const [searchQuery, setSearchQuery] = useState("");
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
  const systems = Object.keys(groupedItems);
  const selectedSystem = selectedItem?.system || systems[0] || "";
  const selectedSystemItems = groupedItems[selectedSystem] || [];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(
    () => normalizedSearch
      ? items
          .filter((item) =>
            [item.label, item.brand, item.system, item.size, item.type]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
          )
          .slice(0, 30)
      : [],
    [items, normalizedSearch],
  );

  const handleTypeChange = (type) => {
    setSearchQuery("");
    onSelectType?.(type);
    const firstItem = getImplantLibraryItemsByType(type, items)[0];
    if (firstItem) onSelectItemId?.(firstItem.id);
  };

  return (
    <section
      className={`implant-layer-card w-full rounded-xl ${
        compact ? "space-y-2 p-2.5" : "space-y-4 p-4"
      } ${className}`}
    >
      <style>{IMPLANT_LAYER_STYLES}</style>

      {/* Header */}
      <div className={`implant-layer-divider flex items-start justify-between border-b ${compact ? "gap-2 pb-2" : "gap-3 pb-3"}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`implant-layer-soft flex shrink-0 items-center justify-center rounded-lg text-cyan-600 ${compact ? "h-8 w-8" : "h-9 w-9"}`}>
            <FolderOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="implant-layer-label-hi truncate text-xs font-black tracking-wider uppercase">
              {compact ? "Implant" : title}
            </h2>
            <p className="implant-layer-label-lo mt-0.5 truncate text-[9px] font-extrabold tracking-wider uppercase">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {scaleInstruction ? (
            <button
              type="button"
              className="implant-layer-soft flex h-9 w-9 items-center justify-center rounded-full text-cyan-500"
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
              className="implant-layer-soft flex h-9 w-9 items-center justify-center rounded-full"
              aria-label="Tutup implant layer"
              title="Tutup"
            >
              <X className="implant-layer-label-md h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Count pills */}
      {!compact ? (
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${TYPE_KEYS.length}, minmax(0, 1fr))` }}>
          {TYPE_KEYS.map((type) => (
            <MetricPill key={type} label={IMPLANT_LIBRARY_TYPE_LABELS[type]} value={counts[type] || 0} />
          ))}
        </div>
      ) : null}

      {/* Type tabs */}
      <div className={`implant-layer-inset flex overflow-x-auto rounded-lg ${compact ? "gap-1 p-1" : "gap-1.5 p-1.5"}`} role="tablist" aria-label="Kategori implant">
        {TYPE_KEYS.map((type) => {
          const label = IMPLANT_LIBRARY_TYPE_LABELS[type];
          const isActive = normalizedType === type;
          return (
            <button
              key={`implant-layer-type-${type}`}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`${compact ? "min-h-8 min-w-[62px] text-[8px]" : "min-h-10 min-w-[76px] text-[10px]"} flex-1 rounded-md px-2 font-black uppercase transition-colors ${
                isActive ? "implant-layer-active" : "implant-layer-soft implant-layer-label-md"
              }`}
              title={label}
            >
              {compact ? label.slice(0, 4) : label}
            </button>
          );
        })}
      </div>

      {/* Searchable two-step selector: category -> model -> size. */}
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <label className="block space-y-1.5">
          <span className="implant-layer-label-lo px-1 text-[9px] font-black tracking-widest uppercase">
            Cari template
          </span>
          <div className="implant-layer-inset relative rounded-lg">
            <Search className="implant-layer-label-lo pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Wagner, Tibial, LCP..."
              className={`implant-layer-select w-full bg-transparent pl-9 pr-3 font-bold outline-none ${compact ? "min-h-9 text-[9px]" : "min-h-10 text-[10px]"}`}
            />
          </div>
        </label>

        {normalizedSearch ? (
          <div className="implant-layer-inset max-h-48 space-y-1 overflow-y-auto rounded-lg p-1.5">
            {searchResults.length ? searchResults.map((item) => (
              <button
                key={`implant-search-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectType?.(item.type);
                  onSelectItemId?.(item.id);
                  setSearchQuery("");
                }}
                className={`flex min-h-10 w-full items-center gap-2 rounded-md border px-2 text-left transition ${
                  String(item.id) === String(selectedItem?.id)
                    ? "border-cyan-400 bg-cyan-50/80 text-cyan-900"
                    : "border-transparent hover:border-slate-300 hover:bg-white/55"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <strong className="implant-layer-label-hi block truncate text-[9px]">{item.label}</strong>
                  <small className="implant-layer-label-md block truncate text-[8px] font-semibold">{item.brand} | {item.system}</small>
                </span>
                <span className="implant-layer-soft shrink-0 rounded-full px-2 py-1 text-[7px] font-black uppercase">{item.type}</span>
              </button>
            )) : (
              <div className="implant-layer-label-md px-3 py-5 text-center text-[9px] font-semibold">
                Template tidak ditemukan.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 space-y-1">
              <span className="implant-layer-label-lo px-1 text-[8px] font-black tracking-wider uppercase">1. Model</span>
              <div className="implant-layer-inset relative rounded-lg">
                <select
                  value={selectedSystem}
                  onChange={(event) => {
                    const firstItem = groupedItems[event.target.value]?.[0];
                    if (firstItem) onSelectItemId?.(firstItem.id);
                  }}
                  className={`implant-layer-select w-full cursor-pointer appearance-none bg-transparent px-2 pr-7 font-bold outline-none ${compact ? "min-h-9 text-[8px]" : "min-h-10 text-[9px]"}`}
                  title="Pilih model implant"
                >
                  {systems.length ? systems.map((system) => (
                    <option key={`implant-system-${system}`} value={system}>{system}</option>
                  )) : <option value="">Belum ada model</option>}
                </select>
                <ChevronDown className="implant-layer-label-md pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              </div>
            </label>
            <label className="min-w-0 space-y-1">
              <span className="implant-layer-label-lo px-1 text-[8px] font-black tracking-wider uppercase">2. Ukuran</span>
              <div className="implant-layer-inset relative rounded-lg">
                <select
                  value={selectedItem?.id || ""}
                  onChange={(event) => onSelectItemId?.(event.target.value)}
                  className={`implant-layer-select w-full cursor-pointer appearance-none bg-transparent px-2 pr-7 font-bold outline-none ${compact ? "min-h-9 text-[8px]" : "min-h-10 text-[9px]"}`}
                  title="Pilih ukuran implant"
                >
                  {selectedSystemItems.length ? selectedSystemItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.size || item.label}</option>
                  )) : <option value="">Belum ada ukuran</option>}
                </select>
                <ChevronDown className="implant-layer-label-md pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Preview */}
      {selectedItem ? (
        compact ? (
          <div className="implant-layer-inset min-w-0 rounded-2xl px-3 py-2">
            <div className="implant-layer-label-hi truncate text-[11px] font-black">
              {selectedItem.label}
            </div>
            <div className="implant-layer-label-md mt-0.5 truncate text-[10px] font-semibold">
              {selectedItem.brand} | {selectedItem.system} | Size {selectedItem.size}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_130px]">
            <div className="implant-layer-inset min-w-0 rounded-2xl p-3">
              <div className="implant-layer-label-hi truncate text-sm font-black">
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
        <div className="implant-layer-inset implant-layer-label-md rounded-2xl px-3 py-4 text-center text-xs font-semibold">
          Belum ada template implant untuk kategori ini.
        </div>
      )}

      {/* Scale instruction */}
      {scaleInstruction ? (
        <div className="implant-layer-inset flex items-start gap-2 rounded-2xl px-3 py-2 text-[10px] font-semibold leading-4">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
          <span className="implant-layer-label-md">{scaleInstruction}</span>
        </div>
      ) : null}

      {/* Calibration warning — shown when image is loaded but kalibrasi belum aktif */}
      {!calibrated ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/40 bg-amber-50/80 px-3 py-2 text-[10px] font-semibold leading-4 text-amber-800 dark:border-amber-400/20 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>Kalibrasi belum aktif — ukuran implant tidak akan akurat. Lakukan kalibrasi sebelum memakai template.</span>
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUseSelected}
          disabled={disabled || !selectedItem}
          className={`implant-layer-btn-use flex w-full items-center justify-center rounded-lg font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${compact ? "min-h-10 gap-1.5 px-2 py-2 text-[10px]" : "min-h-12 gap-2 px-3 py-3 text-xs"}`}
          title={calibrated ? "Tambahkan implant sebagai layer template baru" : "Kalibrasi belum aktif — ukuran implant mungkin tidak akurat"}
        >
          {calibrated ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4 text-amber-400" />}
          Tambah Layer
        </button>
        <button
          type="button"
          onClick={onReplaceSelected}
          disabled={disabled || !selectedItem || !canReplaceSelected}
          className={`implant-layer-btn-replace flex w-full items-center justify-center rounded-lg font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${compact ? "min-h-10 gap-1.5 px-2 py-2 text-[10px]" : "min-h-12 gap-2 px-3 py-3 text-xs"}`}
          title="Ganti layer/template aktif tanpa mengubah posisi dan ukuran tampilan"
        >
          <FolderOpen className="h-4 w-4" />
          Ganti Aktif
        </button>
      </div>

      {!compact ? (
        <div className="implant-layer-hint flex items-center justify-center gap-2 text-[10px] font-black tracking-wider uppercase">
          <Eye className="h-3.5 w-3.5" />
          Preview mengikuti template lokal yang dipilih
        </div>
      ) : null}
    </section>
  );
}
