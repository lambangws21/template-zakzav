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
    box-shadow: 5px 5px 14px rgba(148,163,184,0.28), -5px -5px 14px rgba(255,255,255,0.78);
    border: 1px solid rgba(255,255,255,0.78);
    color: #1e293b;
  }
  .implant-layer-soft {
    background: #eef2f7;
    box-shadow: 3px 3px 8px rgba(148,163,184,0.25), -3px -3px 8px rgba(255,255,255,0.78);
    border: 1px solid rgba(255,255,255,0.72);
  }
  .implant-layer-inset {
    background: #edf1f6;
    box-shadow: inset 2.5px 2.5px 6px rgba(148,163,184,0.28), inset -2.5px -2.5px 6px rgba(255,255,255,0.86);
    border: 1px solid rgba(255,255,255,0.82);
  }
  .implant-layer-active {
    background: #1f2937;
    color: #ffffff;
    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.28), 2px 2px 7px rgba(30,41,59,0.16);
    border-color: rgba(15,23,42,0.6);
  }
  .implant-layer-label-hi { color: #0f172a; }
  .implant-layer-label-md { color: #475569; }
  .implant-layer-label-lo { color: #94a3b8; }
  .implant-layer-select { color: #1e293b; }
  .implant-layer-divider { border-color: rgba(203,213,225,0.35); }
  .implant-layer-metric {
    background: rgba(255,255,255,0.42);
    border: 1px solid rgba(255,255,255,0.65);
    box-shadow: inset 1.5px 1.5px 3px rgba(148,163,184,0.16), inset -1.5px -1.5px 3px rgba(255,255,255,0.76);
  }
  .implant-layer-btn-use {
    border: 1px solid #6ee7b7;
    background: rgba(209,250,229,0.80);
    color: #065f46;
    box-shadow: 3px 3px 8px rgba(16,185,129,0.14), -3px -3px 8px rgba(255,255,255,0.78);
  }
  .implant-layer-btn-use:hover { background: rgba(187,247,208,0.9); }
  .implant-layer-btn-replace {
    border: 1px solid #a5f3fc;
    background: rgba(207,250,254,0.75);
    color: #0e7490;
    box-shadow: 3px 3px 8px rgba(6,182,212,0.12), -3px -3px 8px rgba(255,255,255,0.78);
  }
  .implant-layer-btn-replace:hover { background: rgba(165,243,252,0.9); }
  .implant-layer-hint { color: #64748b; }

  /* ─── Dark mode ─────────────────────────────────────────── */
  [data-theme="dark"] .implant-layer-card {
    background: rgba(15,23,42,0.92);
    box-shadow: 4px 4px 18px rgba(0,0,0,0.55), -2px -2px 8px rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.10);
    color: #e2e8f0;
  }
  [data-theme="dark"] .implant-layer-soft {
    background: rgba(30,41,59,0.80);
    box-shadow: 3px 3px 8px rgba(0,0,0,0.40), -2px -2px 6px rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.09);
  }
  [data-theme="dark"] .implant-layer-inset {
    background: rgba(8,14,28,0.70);
    box-shadow: inset 2px 2px 6px rgba(0,0,0,0.50), inset -1px -1px 4px rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
  }
  [data-theme="dark"] .implant-layer-active {
    background: rgba(14,165,233,0.18);
    color: #38bdf8;
    box-shadow: inset 1px 1px 4px rgba(0,0,0,0.35);
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
    box-shadow: 0 2px 10px rgba(16,185,129,0.18);
  }
  [data-theme="dark"] .implant-layer-btn-use:hover { background: rgba(6,78,59,0.75); }
  [data-theme="dark"] .implant-layer-btn-replace {
    border: 1px solid rgba(34,211,238,0.28);
    background: rgba(8,51,68,0.55);
    color: #67e8f9;
    box-shadow: 0 2px 10px rgba(6,182,212,0.16);
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
    if (firstItem) onSelectItemId?.(firstItem.id);
  };

  return (
    <section
      className={`implant-layer-card w-full rounded-[30px] p-4 ${
        compact ? "space-y-3" : "space-y-4"
      } ${className}`}
    >
      <style>{IMPLANT_LAYER_STYLES}</style>

      {/* Header */}
      <div className={`implant-layer-divider flex items-start justify-between gap-3 border-b pb-3`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="implant-layer-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-cyan-500">
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
        <div className="grid grid-cols-3 gap-2">
          <MetricPill label="Stem" value={counts.stem || 0} />
          <MetricPill label="Cup" value={counts.cup || 0} />
          <MetricPill label="Knee" value={counts.knee || 0} />
        </div>
      ) : null}

      {/* Type tabs */}
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
                isActive ? "implant-layer-active" : "implant-layer-soft implant-layer-label-md"
              }`}
              title={label}
            >
              {compact ? label.slice(0, 4) : label}
            </button>
          );
        })}
      </div>

      {/* Select dropdown */}
      <label className="block space-y-1.5">
        <span className="implant-layer-label-lo px-1 text-[10px] font-black tracking-widest uppercase">
          Model template
        </span>
        <div className="relative">
          <select
            value={selectedItem?.id || ""}
            onChange={(event) => onSelectItemId?.(event.target.value)}
            className="implant-layer-inset implant-layer-select w-full cursor-pointer appearance-none rounded-2xl px-3 py-3 pr-9 text-xs font-bold outline-none"
            style={{ colorScheme: "dark" }}
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
          <ChevronDown className="implant-layer-label-md pointer-events-none absolute top-3.5 right-3.5 h-4 w-4" />
        </div>
      </label>

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

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUseSelected}
          disabled={disabled || !selectedItem}
          className="implant-layer-btn-use flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          title="Tambahkan implant sebagai layer template baru"
        >
          <Check className="h-4 w-4" />
          Pakai
        </button>
        <button
          type="button"
          onClick={onReplaceSelected}
          disabled={disabled || !selectedItem || !canReplaceSelected}
          className="implant-layer-btn-replace flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          title="Ganti layer/template aktif tanpa mengubah posisi dan ukuran tampilan"
        >
          <FolderOpen className="h-4 w-4" />
          Ganti
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
