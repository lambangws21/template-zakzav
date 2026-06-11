"use client";

import { useRef, useState } from "react";
import { Check, Pencil, RefreshCcw, Trash2, Minus, Plus } from "lucide-react";

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

const HKA_MODE_LABELS = { full: "HKA", fta: "FTA", jla: "JLA" };
const STROKE_MIN = 1;
const STROKE_MAX = 12;

export default function LineManager({
  lines = [],
  selectedLineId = null,
  onSelectLine,
  onRenameLine,
  onChangeLineColor,
  getLineLength,
  formatMeasurementFromPx,
  lineTypeLabel,
  /* HKA */
  hkaSets = [],
  selectedHkaId = null,
  onSelectHka,
  onDeleteHka,
  onUpdateHka,
  onToggleHkaSide,
  getHkaMeasurement,
  onRenameHka,
  onChangeHkaColor,
  onChangeHkaStroke,
  className = "",
  maxHeightClass = "max-h-72",
}) {
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const colorInputRefs = useRef({});

  const [hkaRenameId, setHkaRenameId] = useState(null);
  const [hkaRenameValue, setHkaRenameValue] = useState("");
  const hkaColorInputRefs = useRef({});

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

  const startHkaRename = (hka) => {
    const isLeft = hka.side === "left" || hka.side === "l";
    const displayName = hka.name || `${isLeft ? "Kiri" : "Kanan"} #${hka.id}`;
    setHkaRenameId(hka.id);
    setHkaRenameValue(displayName);
  };

  const confirmHkaRename = (hkaId) => {
    const trimmed = hkaRenameValue.trim();
    if (trimmed) onRenameHka?.(hkaId, trimmed);
    setHkaRenameId(null);
    setHkaRenameValue("");
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
        {lines.length === 0 && hkaSets.length === 0 ? (
          <div className="rounded-2xl border border-white/70 bg-white/35 px-3 py-4 text-center text-xs font-bold text-slate-500">
            Belum ada line.
          </div>
        ) : lines.length === 0 ? null : (
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

        {/* HKA section */}
        {hkaSets.length > 0 && (
          <>
            {lines.length > 0 && (
              <div className="my-2 h-px rounded bg-slate-200/60" />
            )}
            <div className="mb-1.5 flex items-center justify-between px-1">
              <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                HKA · {hkaSets.length}
              </div>
            </div>
            {hkaSets.map((hka) => {
              const isSelected = hka.id === selectedHkaId;
              const isRenamingHka = hkaRenameId === hka.id;
              const modeLabel = HKA_MODE_LABELS[hka.mode] || "HKA";
              const isLeft = hka.side === "left" || hka.side === "l";
              const measurement = getHkaMeasurement?.(hka);
              const lineColor = hka.lineColor || "#6d28d9";
              const strokeWidth = typeof hka.strokeWidth === "number" ? hka.strokeWidth : 2;
              const displayName = hka.name || `${isLeft ? "Kiri" : "Kanan"} #${hka.id}`;

              return (
                <div
                  key={hka.id}
                  className={`rounded-2xl border transition ${
                    isSelected
                      ? "border-violet-200 bg-violet-50/50 shadow-[inset_1.5px_1.5px_4px_rgba(139,92,246,0.12),inset_-1.5px_-1.5px_4px_rgba(255,255,255,0.88)]"
                      : "border-white/70 bg-white/35 shadow-[2px_2px_5px_rgba(148,163,184,0.18),-2px_-2px_5px_rgba(255,255,255,0.72)]"
                  }`}
                >
                  {/* Row 1: color · mode · name · L/R · rename · refresh · trash */}
                  <div className="flex items-center gap-1.5 p-2">
                    {/* Color swatch */}
                    <button
                      type="button"
                      title="Ubah warna HKA"
                      onClick={(e) => { e.stopPropagation(); hkaColorInputRefs.current[hka.id]?.click(); }}
                      className="relative h-7 w-7 shrink-0 overflow-hidden rounded-xl border border-white/70 shadow-[2px_2px_5px_rgba(148,163,184,0.22),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95"
                      style={{ backgroundColor: lineColor }}
                    >
                      <input
                        ref={(el) => {
                          if (el) hkaColorInputRefs.current[hka.id] = el;
                          else delete hkaColorInputRefs.current[hka.id];
                        }}
                        type="color"
                        value={lineColor.startsWith("#") ? lineColor : "#6d28d9"}
                        onChange={(e) => onChangeHkaColor?.(hka.id, e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        tabIndex={-1}
                      />
                    </button>

                    {/* Mode badge */}
                    <div className="flex h-7 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-200/60 bg-violet-100/60 text-[8px] font-black tracking-wide text-violet-700">
                      {modeLabel}
                    </div>

                    {/* Name / rename */}
                    <button
                      type="button"
                      onClick={() => onSelectHka?.(hka.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      {isRenamingHka ? (
                        <input
                          autoFocus
                          type="text"
                          value={hkaRenameValue}
                          onChange={(e) => setHkaRenameValue(e.target.value)}
                          onBlur={() => confirmHkaRename(hka.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmHkaRename(hka.id);
                            if (e.key === "Escape") {
                              setHkaRenameId(null);
                              setHkaRenameValue("");
                            }
                            e.stopPropagation();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-xl border border-violet-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-200"
                          placeholder={displayName}
                        />
                      ) : (
                        <>
                          <div className="truncate text-xs font-black text-slate-800">
                            {displayName}
                          </div>
                          <div className="mt-0.5 truncate text-[9px] font-bold tracking-wide text-slate-400">
                            {measurement || "—"}
                          </div>
                        </>
                      )}
                    </button>

                    {/* L / R side toggle */}
                    <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/70 shadow-[1.5px_1.5px_4px_rgba(148,163,184,0.2)]">
                      <button
                        type="button"
                        title="Kaki Kiri"
                        onClick={(e) => { e.stopPropagation(); onToggleHkaSide?.(hka.id, "left"); }}
                        className={`px-2 py-1.5 text-[9px] font-black transition ${
                          isLeft ? "bg-violet-600 text-white" : "bg-[#eef2f7] text-slate-500 hover:bg-violet-50"
                        }`}
                      >
                        L
                      </button>
                      <button
                        type="button"
                        title="Kaki Kanan"
                        onClick={(e) => { e.stopPropagation(); onToggleHkaSide?.(hka.id, "right"); }}
                        className={`px-2 py-1.5 text-[9px] font-black transition ${
                          !isLeft ? "bg-violet-600 text-white" : "bg-[#eef2f7] text-slate-500 hover:bg-violet-50"
                        }`}
                      >
                        R
                      </button>
                    </div>

                    {/* Rename */}
                    {isRenamingHka ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); confirmHkaRename(hka.id); }}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 shadow-[2px_2px_5px_rgba(148,163,184,0.24),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95"
                        title="Simpan nama"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <IconBtn
                        icon={Pencil}
                        label="Ubah nama HKA"
                        onClick={(e) => { e.stopPropagation(); startHkaRename(hka); }}
                      />
                    )}

                    {/* Redraw */}
                    <IconBtn
                      icon={RefreshCcw}
                      label="Gambar ulang HKA"
                      onClick={(e) => { e.stopPropagation(); onUpdateHka?.(hka); }}
                      className="text-violet-600"
                    />

                    {/* Delete */}
                    <IconBtn
                      icon={Trash2}
                      label="Hapus HKA"
                      onClick={(e) => { e.stopPropagation(); onDeleteHka?.(hka.id); }}
                      className="text-rose-400 hover:text-rose-600"
                    />
                  </div>

                  {/* Row 2: stroke width control */}
                  <div className="mx-2 mb-2 flex items-center gap-2 rounded-xl border border-white/60 bg-white/30 px-2.5 py-1.5">
                    <span className="text-[9px] font-black tracking-wide text-slate-400 uppercase">
                      Tebal
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onChangeHkaStroke?.(hka.id, Math.max(STROKE_MIN, strokeWidth - 1)); }}
                      disabled={strokeWidth <= STROKE_MIN}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/70 bg-[#eef2f7] text-slate-600 shadow-[1px_1px_3px_rgba(148,163,184,0.22)] transition active:scale-95 disabled:opacity-30"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="min-w-[18px] text-center text-[10px] font-black text-slate-700">
                      {strokeWidth}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onChangeHkaStroke?.(hka.id, Math.min(STROKE_MAX, strokeWidth + 1)); }}
                      disabled={strokeWidth >= STROKE_MAX}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/70 bg-[#eef2f7] text-slate-600 shadow-[1px_1px_3px_rgba(148,163,184,0.22)] transition active:scale-95 disabled:opacity-30"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                    {/* Visual thickness preview */}
                    <div className="flex flex-1 items-center px-1">
                      <div
                        className="w-full rounded-full"
                        style={{ height: Math.max(1, Math.min(strokeWidth, 8)), backgroundColor: lineColor, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
