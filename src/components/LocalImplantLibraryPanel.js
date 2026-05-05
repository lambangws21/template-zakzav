"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  countImplantLibraryByType,
  getImplantLibraryItemsByType,
  groupImplantLibraryBySystem,
  IMPLANT_LIBRARY_TYPE_LABELS,
} from "../lib/digitalTemplating/implantLibrary";

export default function LocalImplantLibraryPanel({
  items,
  selectedType,
  selectedItemId,
  onSelectType,
  onSelectItemId,
  onUseSelected,
  compact = false,
  disabled = false,
}) {
  const counts = useMemo(() => countImplantLibraryByType(items), [items]);
  const filteredItems = useMemo(
    () => getImplantLibraryItemsByType(selectedType, items),
    [items, selectedType],
  );
  const groupedItems = useMemo(() => groupImplantLibraryBySystem(filteredItems), [filteredItems]);
  const selectedItem =
    filteredItems.find((item) => String(item.id) === String(selectedItemId)) || filteredItems[0] || null;

  return (
    <motion.div layout className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          {compact ? "Implant" : "Implant Lokal"}
        </span>
      </div>
      {!compact ? (
        <div className="mt-1 text-[10px] text-slate-500">
          Stem: {counts.stem || 0} | Cup: {counts.cup || 0} | Knee: {counts.knee || 0}
        </div>
      ) : null}

      <div className="mt-2 grid gap-1 [grid-template-columns:repeat(auto-fit,minmax(54px,1fr))]">
        {Object.entries(IMPLANT_LIBRARY_TYPE_LABELS).map(([type, label]) => {
          const isActive = selectedType === type;
          return (
            <motion.button
              key={type}
              type="button"
              onClick={() => onSelectType(type)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
              title={label}
            >
              {compact ? label.slice(0, 4) : label}
            </motion.button>
          );
        })}
      </div>

      <select
        value={selectedItem?.id || ""}
        onChange={(event) => onSelectItemId(event.target.value)}
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-slate-500"
        title="Pilih item implant lokal"
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

      {selectedItem && !compact ? (
        <motion.div layout className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-[11px] font-medium text-slate-700">{selectedItem.label}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {selectedItem.brand} | {selectedItem.system} | Size {selectedItem.size}
          </div>
          <div className="mt-2 flex h-20 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-950/95">
            <img
              src={selectedItem.imageSrc}
              alt={selectedItem.label}
              className="h-full w-full object-contain"
            />
          </div>
        </motion.div>
      ) : null}

      <motion.button
        type="button"
        onClick={onUseSelected}
        disabled={disabled || !selectedItem}
        whileHover={disabled || !selectedItem ? undefined : { scale: 1.02, y: -1 }}
        whileTap={disabled || !selectedItem ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="mt-2 w-full rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1.5 text-[11px] font-medium text-cyan-900 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
        title="Tambahkan implant sebagai layer template"
      >
        {compact ? "Pakai" : "Pakai Sebagai Layer"}
      </motion.button>
    </motion.div>
  );
}
