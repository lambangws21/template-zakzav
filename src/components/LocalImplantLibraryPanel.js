"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  countImplantLibraryByType,
  getImplantLibraryItemsByType,
  groupImplantLibraryBySystem,
  IMPLANT_LIBRARY_TYPE_LABELS,
} from "../lib/digitalTemplating/implantLibrary";

const SOFT_SURFACE_CLASS =
  "rounded-[24px] border border-white/78 bg-[linear-gradient(180deg,#f8fafc_0%,#edf2f7_100%)] shadow-[10px_10px_22px_rgba(71,85,105,0.18),-2px_-2px_8px_rgba(255,255,255,0.34)]";
const SOFT_RAISED_CLASS =
  "rounded-[18px] border border-white/82 bg-[linear-gradient(180deg,#fbfdff_0%,#ecf1f6_100%)] shadow-[6px_6px_14px_rgba(71,85,105,0.18),-2px_-2px_8px_rgba(255,255,255,0.28)]";
const SOFT_PRIMARY_BUTTON_CLASS =
  "rounded-[18px] border border-[#d8fff1] bg-[linear-gradient(180deg,#ddfff2_0%,#c5f3e6_100%)] shadow-[8px_8px_18px_rgba(16,185,129,0.12),-2px_-2px_6px_rgba(255,255,255,0.24)]";
const SOFT_DARK_BUTTON_CLASS =
  "rounded-[18px] border border-[#2a3246] bg-[linear-gradient(180deg,#30394f_0%,#1f2636_100%)] shadow-[8px_8px_18px_rgba(15,23,42,0.26),-2px_-2px_8px_rgba(255,255,255,0.08)]";

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
  const groupedItems = useMemo(
    () => groupImplantLibraryBySystem(filteredItems),
    [filteredItems],
  );
  const selectedItem =
    filteredItems.find((item) => String(item.id) === String(selectedItemId)) ||
    filteredItems[0] ||
    null;

  return (
    <motion.div layout className={`${SOFT_SURFACE_CLASS} p-3`}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
          {compact ? "Implant" : "Implant Lokal"}
        </span>
      </div>
      {!compact ? (
        <div className="mt-1 text-[10px] text-slate-500">
          Stem: {counts.stem || 0} | Cup: {counts.cup || 0} | Knee:{" "}
          {counts.knee || 0}
        </div>
      ) : null}

      <div className="mt-2 grid [grid-template-columns:repeat(auto-fit,minmax(54px,1fr))] gap-1">
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
              className={`px-2 py-1.5 text-[10px] font-medium transition ${
                isActive
                  ? `${SOFT_DARK_BUTTON_CLASS} text-white`
                  : `${SOFT_RAISED_CLASS} text-slate-600`
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
        className={`mt-2 w-full px-3 py-2 text-[11px] text-slate-700 outline-none ${SOFT_RAISED_CLASS}`}
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
        <motion.div layout className={`mt-2 ${SOFT_SURFACE_CLASS} p-2.5`}>
          <div className="text-[11px] font-medium text-slate-700">
            {selectedItem.label}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500 ">
            {selectedItem.brand} | {selectedItem.system} | Size{" "}
            {selectedItem.size}
          </div>
          <div
            className={`mt-2 flex h-50 items-center justify-center overflow-hidden bg-slate-950/95 ${SOFT_SURFACE_CLASS}`}
          >
            <img
              src={selectedItem.imageSrc}
              alt={selectedItem.label}
              className="h-full w-full object-contain bg-slate-900"
            />
          </div>
        </motion.div>
      ) : null}

      <motion.button
        type="button"
        onClick={onUseSelected}
        disabled={disabled || !selectedItem}
        whileHover={
          disabled || !selectedItem ? undefined : { scale: 1.02, y: -1 }
        }
        whileTap={disabled || !selectedItem ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={`mt-2 w-full px-3 py-2 text-[11px] font-medium text-slate-800 transition disabled:cursor-not-allowed disabled:opacity-45 ${SOFT_PRIMARY_BUTTON_CLASS}`}
        title="Tambahkan implant sebagai layer template"
      >
        {compact ? "Pakai" : "Pakai Template"}
      </motion.button>
    </motion.div>
  );
}
