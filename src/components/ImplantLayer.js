"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Layers,
  Replace,
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
const ICON_ROOT = "/Zakzav_Implant_Icons_512";
const TYPE_ICONS = {
  stem: `${ICON_ROOT}/01_Stem_512.png`,
  cup: `${ICON_ROOT}/02_Cup_512.png`,
  knee: `${ICON_ROOT}/07_TKA_512.png`,
};

function getItemIcon(item) {
  const signature =
    `${item?.id || ""} ${item?.system || ""} ${item?.label || ""}`.toLowerCase();
  if (signature.includes("bipolar")) return `${ICON_ROOT}/03_Bipolar_512.png`;
  if (signature.includes("wagner") || signature.includes("long stem")) {
    return `${ICON_ROOT}/04_LongStem_512.png`;
  }
  if (signature.includes("femoral") || signature.includes("fem-")) {
    return `${ICON_ROOT}/08_Femur_TKA_512.png`;
  }
  if (signature.includes("tibial") || signature.includes("tib-")) {
    return `${ICON_ROOT}/09_Tibia_TKA_512.png`;
  }
  if (signature.includes("insert")) return `${ICON_ROOT}/10_Insert_TKA_512.png`;
  if (signature.includes("patella"))
    return `${ICON_ROOT}/11_Patella_TKA_512.png`;
  return TYPE_ICONS[item?.type] || null;
}

const STYLES = `
  .implant-picker { background:#eef2f7; border:1px solid #cbd5e1; color:#1e293b; }
  .implant-picker-surface { background:#f8fafc; border:1px solid #cbd5e1; }
  .implant-picker-muted { color:#64748b; }
  .implant-picker-tab { background:#f8fafc; border:1px solid #dbe3ec; color:#475569; }
  .implant-picker-tab-active { background:#1e293b; border-color:#0f172a; color:#fff; }
  .implant-picker-use { background:#059669; border:1px solid #047857; color:#fff; }
  .implant-picker-replace { background:#0891b2; border:1px solid #0e7490; color:#fff; }
  [data-theme="dark"] .implant-picker { background:#0f172a; border-color:#334155; color:#f1f5f9; }
  [data-theme="dark"] .implant-picker-surface { background:#111c2f; border-color:#334155; }
  [data-theme="dark"] .implant-picker-muted { color:#94a3b8; }
  [data-theme="dark"] .implant-picker-tab { background:#172033; border-color:#334155; color:#cbd5e1; }
  [data-theme="dark"] .implant-picker-tab-active { background:#0e7490; border-color:#22d3ee; color:#fff; }
`;

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
  title = "Pilih Implant",
  subtitle = "Jenis, model, dan ukuran",
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
    () =>
      normalizedSearch
        ? items
            .filter((item) =>
              [item.label, item.brand, item.system, item.size, item.type]
                .filter(Boolean)
                .some((value) =>
                  String(value).toLowerCase().includes(normalizedSearch),
                ),
            )
            .slice(0, 24)
        : [],
    [items, normalizedSearch],
  );

  const selectType = (type) => {
    setSearchQuery("");
    onSelectType?.(type);
    const firstItem = getImplantLibraryItemsByType(type, items)[0];
    if (firstItem) onSelectItemId?.(firstItem.id);
  };

  const chooseSearchResult = (item) => {
    onSelectType?.(item.type);
    onSelectItemId?.(item.id);
    setSearchQuery("");
  };

  const selectedIcon = getItemIcon(selectedItem);

  return (
    <section
      className={`implant-picker w-full space-y-2.5 rounded-lg ${compact ? "p-2.5" : "p-3.5"} ${className}`}
    >
      <style>{STYLES}</style>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-black">{title}</h2>
          <p className="implant-picker-muted truncate text-[9px] font-semibold">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!calibrated ? (
            <span
              className="implant-picker-surface grid h-8 w-8 place-items-center rounded-md text-amber-500"
              title={scaleInstruction || "Kalibrasi belum aktif"}
            >
              <AlertCircle className="h-4 w-4" />
            </span>
          ) : null}
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              className="implant-picker-surface grid h-8 w-8 place-items-center rounded-md"
              aria-label="Tutup pemilih implant"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="grid grid-cols-4 gap-1.5"
        role="tablist"
        aria-label="Jenis implant"
      >
        {TYPE_KEYS.map((type) => {
          const isActive = normalizedType === type;
          const iconSrc = TYPE_ICONS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => selectType(type)}
              className={`${isActive ? "implant-picker-tab-active" : "implant-picker-tab"} flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-black`}
              title={IMPLANT_LIBRARY_TYPE_LABELS[type]}
              role="tab"
              aria-selected={isActive}
            >
              {iconSrc ? (
                <img
                  src={iconSrc}
                  alt=""
                  className="h-8 w-8 shrink-0 object-contain"
                />
              ) : (
                <Layers className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">
                {IMPLANT_LIBRARY_TYPE_LABELS[type]}
                <small className="ml-1 opacity-60">{counts[type] || 0}</small>
              </span>
            </button>
          );
        })}
      </div>

      <label className="implant-picker-surface relative block rounded-md">
        <Search className="implant-picker-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Cari model atau ukuran..."
          className="min-h-9 w-full bg-transparent pr-2.5 pl-8 text-[10px] font-semibold outline-none"
        />
      </label>

      {normalizedSearch ? (
        <div className="implant-picker-surface max-h-36 space-y-1 overflow-y-auto rounded-md p-1">
          {searchResults.length ? (
            searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseSearchResult(item)}
                className="flex min-h-9 w-full items-center gap-2 rounded px-2 text-left hover:bg-cyan-500/10"
              >
                <strong className="min-w-0 flex-1 truncate text-[9px]">
                  {item.label}
                </strong>
                <small className="implant-picker-muted shrink-0 text-[8px]">
                  {item.system}
                </small>
              </button>
            ))
          ) : (
            <p className="implant-picker-muted px-2 py-4 text-center text-[9px]">
              Implant tidak ditemukan.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0">
            <span className="implant-picker-muted mb-1 block text-[8px] font-black uppercase">
              Model
            </span>
            <span className="implant-picker-surface relative block rounded-md">
              <select
                value={selectedSystem}
                onChange={(event) => {
                  const firstItem = groupedItems[event.target.value]?.[0];
                  if (firstItem) onSelectItemId?.(firstItem.id);
                }}
                className="min-h-9 w-full cursor-pointer appearance-none bg-transparent px-2 pr-7 text-[10px] font-bold outline-none"
              >
                {systems.length ? (
                  systems.map((system) => (
                    <option key={system} value={system}>
                      {system}
                    </option>
                  ))
                ) : (
                  <option value="">Belum tersedia</option>
                )}
              </select>
              <ChevronDown className="implant-picker-muted pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2" />
            </span>
          </label>
          <label className="min-w-0">
            <span className="implant-picker-muted mb-1 block text-[8px] font-black uppercase">
              Ukuran
            </span>
            <span className="implant-picker-surface relative block rounded-md">
              <select
                value={selectedItem?.id || ""}
                onChange={(event) => onSelectItemId?.(event.target.value)}
                className="min-h-9 w-full cursor-pointer appearance-none bg-transparent px-2 pr-7 text-[10px] font-bold outline-none"
              >
                {selectedSystemItems.length ? (
                  selectedSystemItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.size || item.label}
                    </option>
                  ))
                ) : (
                  <option value="">Belum tersedia</option>
                )}
              </select>
              <ChevronDown className="implant-picker-muted pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2" />
            </span>
          </label>
        </div>
      )}

      {selectedItem ? (
        <div className="implant-picker-surface flex min-h-12 items-center gap-2 rounded-md px-2 py-1.5">
          {selectedIcon ? (
            <img
              src={selectedIcon}
              alt=""
              className="h-10 w-10 shrink-0 object-contain"
            />
          ) : (
            <Layers className="implant-picker-muted h-5 w-5 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[10px]">
              {selectedItem.label}
            </strong>
            <span className="implant-picker-muted block truncate text-[9px]">
              {selectedItem.brand} | {selectedItem.system} | Size{" "}
              {selectedItem.size}
            </span>
          </div>
        </div>
      ) : null}

      {!calibrated ? (
        <p className="rounded-md border border-amber-400/40 bg-amber-50 px-2 py-1.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Kalibrasi belum aktif. Ukuran implant dapat tidak akurat.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUseSelected}
          disabled={disabled || !selectedItem}
          className="implant-picker-use flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" />
          Tambah
        </button>
        <button
          type="button"
          onClick={onReplaceSelected}
          disabled={disabled || !selectedItem || !canReplaceSelected}
          className="implant-picker-replace flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-40"
          title="Ganti layer aktif tanpa mengubah posisinya"
        >
          <Replace className="h-3.5 w-3.5" />
          Ganti Aktif
        </button>
      </div>
    </section>
  );
}
