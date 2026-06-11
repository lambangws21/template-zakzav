"use client";

import { useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";

function IconBtn({ icon: Icon, label, active = false, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-[#eef2f7] text-slate-600 shadow-[2px_2px_5px_rgba(148,163,184,0.24),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "text-cyan-700 shadow-[inset_1.5px_1.5px_4px_rgba(148,163,184,0.34),inset_-1.5px_-1.5px_4px_rgba(255,255,255,0.84)]"
          : ""
      } ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function LineManager({
  lines = [],
  selectedLineId = null,
  onSelectLine,
  onRenameLine,
  onChangeLineColor,
  getLineLength,
  formatMeasurementFromPx,
  lineTypeLabel,
  className = "",
  maxHeightClass = "max-h-72",
}) {
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const colorInputRefs = useRef({});

  const startRename = (line) => {
    const displayName = line.name || lineTypeLabel?.(line.type) || `Line #${line.id}`;
    setRenameId(line.id);
    setRenameValue(displayName);
  };

  const confirmRename = (lineId) => {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameLine?.(lineId, trimmed);
    setRenameId(null);
    setRenameValue("");
  };

  const getMeasurement = (line) => {
    if (!getLineLength || !formatMeasurementFromPx) return null;
    const px = getLineLength(line);
    return px > 0 ? formatMeasurementFromPx(px) : null;
  };

  return (
    <section
      className={`rounded-[24px] border border-white/70 bg-[#eef2f7] p-3 text-slate-800 shadow-[inset_2px_2px_6px_rgba(148,163,184,0.20),inset_-2px_-2px_6px_rgba(255,255,255,0.82)] ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            Line Manager
          </div>
          <div className="text-xs font-black text-slate-800">
            {lines.length} line
          </div>
        </div>
        <span className="rounded-full border border-white/80 bg-white/45 px-2.5 py-1 text-[9px] font-black tracking-wider text-slate-500 uppercase">
          Measurements
        </span>
      </div>

      <div className={`${maxHeightClass} space-y-2 overflow-y-auto pr-1`}>
        {lines.length === 0 ? (
          <div className="rounded-2xl border border-white/70 bg-white/35 px-3 py-4 text-center text-xs font-bold text-slate-500">
            Belum ada line.
          </div>
        ) : (
          lines.map((line) => {
            const isSelected = line.id === selectedLineId;
            const isRenaming = renameId === line.id;
            const displayName =
              line.name || lineTypeLabel?.(line.type) || `Line #${line.id}`;
            const measurement = getMeasurement(line);
            const color = line.color || "#64748b";

            return (
              <div
                key={line.id}
                className={`rounded-2xl border p-2 transition ${
                  isSelected
                    ? "border-emerald-200 bg-emerald-50/50 shadow-[inset_1.5px_1.5px_4px_rgba(16,185,129,0.14),inset_-1.5px_-1.5px_4px_rgba(255,255,255,0.88)]"
                    : "border-white/70 bg-white/35 shadow-[2px_2px_5px_rgba(148,163,184,0.18),-2px_-2px_5px_rgba(255,255,255,0.72)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Color swatch — click to open color picker */}
                  <button
                    type="button"
                    title="Ubah warna line"
                    onClick={() => colorInputRefs.current[line.id]?.click()}
                    className="relative h-7 w-7 shrink-0 rounded-xl border border-white/70 shadow-[2px_2px_5px_rgba(148,163,184,0.22),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95 overflow-hidden"
                    style={{ backgroundColor: color }}
                  >
                    <input
                      ref={(el) => {
                        if (el) colorInputRefs.current[line.id] = el;
                        else delete colorInputRefs.current[line.id];
                      }}
                      type="color"
                      value={color.startsWith("#") ? color : "#64748b"}
                      onChange={(e) => onChangeLineColor?.(line.id, e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      tabIndex={-1}
                    />
                  </button>

                  {/* Name / rename input */}
                  <button
                    type="button"
                    onClick={() => onSelectLine?.(line.id)}
                    className="min-w-0 flex-1 text-left"
                    title={displayName}
                  >
                    {isRenaming ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => confirmRename(line.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename(line.id);
                          if (e.key === "Escape") {
                            setRenameId(null);
                            setRenameValue("");
                          }
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-xl border border-emerald-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-200"
                        placeholder={`Line #${line.id}`}
                      />
                    ) : (
                      <>
                        <div className="truncate text-xs font-black text-slate-800">
                          {displayName}
                        </div>
                        <div className="mt-0.5 truncate text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                          #{line.id}
                          {measurement ? ` · ${measurement}` : " · belum dikalibrasi"}
                        </div>
                      </>
                    )}
                  </button>

                  {/* Rename button / confirm button */}
                  {isRenaming ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmRename(line.id);
                      }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[2px_2px_5px_rgba(148,163,184,0.24),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95"
                      title="Simpan nama"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <IconBtn
                      icon={Pencil}
                      label="Ubah nama line"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(line);
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
