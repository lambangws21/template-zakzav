"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Eye,
  EyeOff,
  Settings2,
  Pencil,
  Check,
} from "lucide-react";

function LayerIconButton({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-[#eef2f7] text-slate-600 shadow-[2px_2px_5px_rgba(148,163,184,0.24),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? "text-cyan-700 shadow-[inset_1.5px_1.5px_4px_rgba(148,163,184,0.34),inset_-1.5px_-1.5px_4px_rgba(255,255,255,0.84)]" : ""
      } ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function LayerManager({
  layers = [],
  selectedLayerId = null,
  onSelectLayer,
  onToggleLayerVisibility,
  onMoveLayer,
  onOpenSettings,
  onRenameLayer,
  className = "",
  maxHeightClass = "max-h-72",
}) {
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (layer) => {
    setRenameId(layer.id);
    setRenameValue(layer.name || `Layer #${layer.id}`);
  };

  const confirmRename = (layerId) => {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameLayer?.(layerId, trimmed);
    setRenameId(null);
    setRenameValue("");
  };

  const stackRows = [...layers].reverse();

  return (
    <section
      className={`rounded-[24px] border border-white/70 bg-[#eef2f7] p-3 text-slate-800 shadow-[inset_2px_2px_6px_rgba(148,163,184,0.20),inset_-2px_-2px_6px_rgba(255,255,255,0.82)] ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            Layer Manager
          </div>
          <div className="text-xs font-black text-slate-800">
            {layers.length} layer
          </div>
        </div>
        <span className="rounded-full border border-white/80 bg-white/45 px-2.5 py-1 text-[9px] font-black tracking-wider text-slate-500 uppercase">
          Top first
        </span>
      </div>

      <div className={`${maxHeightClass} space-y-2 overflow-y-auto pr-1`}>
        {stackRows.length === 0 ? (
          <div className="rounded-2xl border border-white/70 bg-white/35 px-3 py-4 text-center text-xs font-bold text-slate-500">
            Belum ada layer.
          </div>
        ) : (
          stackRows.map((layer) => {
            const stackIndex = layers.findIndex((item) => item.id === layer.id);
            const isSelected = String(selectedLayerId) === String(layer.id);
            const isHidden = Boolean(layer.hidden);
            const isRenaming = renameId === layer.id;
            return (
              <div
                key={layer.id}
                className={`rounded-2xl border p-2 transition ${
                  isSelected
                    ? "border-cyan-200 bg-cyan-50/50 shadow-[inset_1.5px_1.5px_4px_rgba(14,165,233,0.14),inset_-1.5px_-1.5px_4px_rgba(255,255,255,0.88)]"
                    : "border-white/70 bg-white/35 shadow-[2px_2px_5px_rgba(148,163,184,0.18),-2px_-2px_5px_rgba(255,255,255,0.72)]"
                } ${isHidden ? "opacity-65" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectLayer?.(layer.id)}
                    className="min-w-0 flex-1 text-left"
                    title={layer.name || `Layer #${layer.id}`}
                  >
                    {isRenaming ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => confirmRename(layer.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename(layer.id);
                          if (e.key === "Escape") { setRenameId(null); setRenameValue(""); }
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-xl border border-cyan-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-200"
                        placeholder={`Layer #${layer.id}`}
                      />
                    ) : (
                      <>
                        <div className="truncate text-xs font-black text-slate-800">
                          {layer.name || `Layer #${layer.id}`}
                        </div>
                        <div className="mt-0.5 truncate text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                          #{layer.id} | {stackIndex + 1}/{layers.length}
                          {isHidden ? " | hidden" : ""}
                        </div>
                      </>
                    )}
                  </button>

                  {isRenaming ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); confirmRename(layer.id); }}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-[2px_2px_5px_rgba(148,163,184,0.24),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95"
                      title="Simpan nama"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <LayerIconButton
                      icon={Pencil}
                      label="Ubah nama layer"
                      onClick={(e) => { e.stopPropagation(); startRename(layer); }}
                    />
                  )}

                  <LayerIconButton
                    icon={isHidden ? EyeOff : Eye}
                    label={isHidden ? "Show layer" : "Hide layer"}
                    active={!isHidden}
                    onClick={() => onToggleLayerVisibility?.(layer.id)}
                  />
                  <LayerIconButton
                    icon={Settings2}
                    label="Layer settings"
                    active={isSelected}
                    onClick={() => onOpenSettings?.(layer.id)}
                  />
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  <LayerIconButton
                    icon={ArrowDown}
                    label="Turunkan layer"
                    onClick={() => onMoveLayer?.(layer.id, "down")}
                  />
                  <LayerIconButton
                    icon={ArrowUp}
                    label="Naikkan layer"
                    onClick={() => onMoveLayer?.(layer.id, "up")}
                  />
                  <LayerIconButton
                    icon={ArrowDownToLine}
                    label="Kirim ke bawah"
                    onClick={() => onMoveLayer?.(layer.id, "back")}
                  />
                  <LayerIconButton
                    icon={ArrowUpToLine}
                    label="Bawa ke atas"
                    onClick={() => onMoveLayer?.(layer.id, "front")}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
