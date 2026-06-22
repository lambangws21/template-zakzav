"use client";

import { Layers, Ruler, Box, MessageSquare, X, Plus, Trash2, Move } from "lucide-react";
import LayerManager from "./LayerManager";
import LineManager from "./LineManager";
import ImplantLayer from "./ImplantLayer";

const TABS = [
  { id: "layer",   label: "Layer",   Icon: Layers,        accent: "cyan"   },
  { id: "line",    label: "Line",    Icon: Ruler,         accent: "emerald" },
  { id: "implant", label: "Implant", Icon: Box,           accent: "violet"  },
  { id: "note",    label: "Note",    Icon: MessageSquare, accent: "orange"  },
];

const ACCENT = {
  cyan:    { pill: "bg-cyan-600 text-white",    dot: "bg-cyan-500" },
  emerald: { pill: "bg-emerald-600 text-white", dot: "bg-emerald-500" },
  violet:  { pill: "bg-violet-600 text-white",  dot: "bg-violet-500" },
  orange:  { pill: "bg-orange-500 text-white",  dot: "bg-orange-400" },
};

// ─── Annotation editor sub-component ────────────────────────────────────────

const SWATCH_COLORS = ["#f97316", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6", "#f59e0b", "#ec4899", "#ffffff", "#1e293b"];

function AnnotationPanel({
  annotations = [],
  selectedAnnotationId = null,
  onSelectAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onActivateAnnotationTool,
  onSetPointerMode,
  defaultColor = "#f97316",
}) {
  const selected = annotations.find((a) => String(a.id) === String(selectedAnnotationId)) || null;

  return (
    <div className="space-y-2.5">
      {/* Header: + Note button */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {annotations.length} catatan
        </p>
        <button
          type="button"
          onClick={onActivateAnnotationTool}
          className="flex items-center gap-1 rounded-xl border border-orange-200/80 bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-700 shadow-[1px_1px_3px_rgba(249,115,22,0.14)] transition hover:bg-orange-100"
        >
          <Plus className="h-3 w-3" />
          + Note
        </button>
      </div>

      {/* Annotation list */}
      {annotations.length === 0 ? (
        <div className="rounded-2xl border border-white/65 bg-white/30 px-3 py-4 text-center text-[10px] text-slate-400">
          Belum ada catatan. Klik "+ Note" lalu tap canvas.
        </div>
      ) : (
        <div className="max-h-[min(22vh,180px)] space-y-1 overflow-y-auto">
          {annotations.map((a, i) => {
            const isActive = String(a.id) === String(selectedAnnotationId);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectAnnotation?.(a.id)}
                className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[10px] font-semibold transition ${
                  isActive
                    ? "border-orange-300/70 bg-orange-50 text-orange-900 shadow-[inset_1px_1px_3px_rgba(249,115,22,0.12)]"
                    : "border-white/65 bg-white/40 text-slate-600 hover:bg-white/70"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: a.color || defaultColor }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {a.text || `Anotasi #${i + 1}`}
                </span>
                <span className="shrink-0 text-[9px] text-slate-400">{i + 1}/{annotations.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor for selected annotation */}
      {selected ? (
        <div className="space-y-2 rounded-2xl border border-white/65 bg-white/30 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Edit Catatan</p>

          {/* Text */}
          <textarea
            value={selected.text}
            onChange={(e) => onUpdateAnnotation?.(selected.id, { text: e.target.value })}
            rows={2}
            className="w-full resize-none rounded-xl border border-white/75 bg-[#eef2f7] px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none shadow-[inset_2px_2px_5px_rgba(148,163,184,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.86)]"
            placeholder="Teks anotasi"
          />

          {/* Font size */}
          <label className="flex items-center gap-2">
            <span className="w-16 text-[9px] font-bold text-slate-500">Ukuran</span>
            <input
              type="range" min={8} max={22} step={1}
              value={selected.fontSize || 11}
              onChange={(e) => onUpdateAnnotation?.(selected.id, { fontSize: Number(e.target.value) })}
              className="flex-1 h-1.5 accent-orange-500"
            />
            <span className="w-7 text-right text-[9px] font-mono text-slate-600">{selected.fontSize || 11}px</span>
          </label>

          {/* Color swatches */}
          <div className="flex flex-wrap gap-1">
            {SWATCH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdateAnnotation?.(selected.id, { color: c })}
                className={`h-5 w-5 rounded-full border-2 transition ${
                  (selected.color || defaultColor) === c ? "border-slate-700 scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ background: c }}
              />
            ))}
            <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-slate-400" title="Warna custom">
              <span className="block h-full w-full rounded-full" style={{ background: "conic-gradient(from 180deg,#f97316,#22c55e,#38bdf8,#a855f7,#f43f5e,#facc15,#f97316)" }} />
              <input
                type="color"
                value={selected.color || defaultColor}
                onChange={(e) => onUpdateAnnotation?.(selected.id, { color: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>

          {/* Leader line */}
          <div>
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Titik Panah</p>
            {selected.px != null ? (
              <div className="space-y-1.5">
                <p className="text-[9px] text-slate-400">Aktif — geser titik putih di canvas untuk ubah arah</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => onSetPointerMode?.(selected.id)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-blue-200/70 bg-blue-50 py-1.5 text-[10px] font-bold text-blue-600 transition hover:bg-blue-100">
                    Pindah Titik
                  </button>
                  <button type="button" onClick={() => onUpdateAnnotation?.(selected.id, { px: null, py: null })}
                    className="flex items-center justify-center gap-1 rounded-xl border border-rose-200/70 bg-rose-50 py-1.5 text-[10px] font-bold text-rose-600 transition hover:bg-rose-100">
                    Hapus Panah
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => onSetPointerMode?.(selected.id)}
                className="w-full flex items-center justify-center gap-1 rounded-xl border border-teal-200/70 bg-teal-50 py-2 text-[10px] font-bold text-teal-700 transition hover:bg-teal-100">
                &#65291; Tambah Panah ke Struktur
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onActivateAnnotationTool?.("pan")}
              className="flex items-center justify-center gap-1 rounded-xl border border-white/70 bg-[#eef2f7] py-1.5 text-[10px] font-bold text-cyan-700 shadow-[1px_1px_3px_rgba(148,163,184,0.2)] transition hover:bg-white"
            >
              <Move className="h-3 w-3" /> Move
            </button>
            <button
              type="button"
              onClick={() => onRemoveAnnotation?.(selected.id)}
              className="flex items-center justify-center gap-1 rounded-xl border border-rose-200/70 bg-rose-50 py-1.5 text-[10px] font-bold text-rose-600 transition hover:bg-rose-100"
            >
              <Trash2 className="h-3 w-3" /> Hapus
            </button>
          </div>
        </div>
      ) : (
        annotations.length > 0 && (
          <p className="text-center text-[10px] text-slate-400">Pilih catatan untuk edit</p>
        )
      )}
    </div>
  );
}

// ─── Main ManagerPanel ────────────────────────────────────────────────────────

export default function ManagerPanel({
  /* meta */
  activeTab = "layer",
  onTabChange,
  onClose,
  className = "",
  /* Contrast / Level (shown in layer tab) */
  contrast = 100,
  level = 100,
  onContrastChange,
  onLevelChange,
  onResetContrastLevel,
  /* LayerManager */
  layers = [],
  selectedLayerId = null,
  onSelectLayer,
  onToggleLayerVisibility,
  onMoveLayer,
  onOpenLayerSettings,
  onRenameLayer,
  /* LineManager */
  lines = [],
  selectedLineId = null,
  onSelectLine,
  onRenameLine,
  onChangeLineColor,
  getLineLength,
  formatMeasurementFromPx,
  lineTypeLabel,
  /* HKA (passed to LineManager) */
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
  /* ImplantLayer */
  implantItems = [],
  selectedImplantType = "cup",
  selectedImplantItemId = "",
  onSelectImplantType,
  onSelectImplantItemId,
  onUseSelectedImplant,
  onReplaceSelectedImplant,
  canReplaceSelectedImplant = false,
  implantDisabled = false,
  implantInstruction = "",
  /* Annotations */
  annotations = [],
  selectedAnnotationId = null,
  onSelectAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onActivateAnnotationTool,
  onSetPointerMode,
  defaultAnnotationColor = "#f97316",
  style,
}) {
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const noteCount = annotations.length;

  return (
    <div
      className={`flex flex-col rounded-[26px] border border-white/75 bg-[#eef2f7]/97 text-slate-800 shadow-[6px_6px_18px_rgba(148,163,184,0.28),-6px_-6px_18px_rgba(255,255,255,0.82)] backdrop-blur-xl ${className}`}
      style={style}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Properties
          </p>
          <p className="text-sm font-black text-slate-800">{tab.label}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-[#eef2f7] text-slate-500 shadow-[2px_2px_5px_rgba(148,163,184,0.26),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="mx-4 mb-3 flex gap-1 rounded-2xl bg-slate-200/40 p-1">
        {TABS.map(({ id, label, Icon, accent }) => {
          const isActive = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange?.(id)}
              className={`relative flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-black transition-all ${
                isActive
                  ? `${ACCENT[accent].pill} shadow-[1px_2px_6px_rgba(0,0,0,0.18)]`
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {label}
              {id === "note" && noteCount > 0 && (
                <span className={`absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-black ${isActive ? "bg-white/30 text-white" : "bg-orange-500 text-white"}`}>
                  {noteCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {activeTab === "layer" && (
          <div className="mb-2.5 rounded-[18px] border border-white/65 bg-white/30 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Gambar Utama</p>
              {onResetContrastLevel && (
                <button
                  type="button"
                  onClick={onResetContrastLevel}
                  className="rounded-lg border border-white/65 bg-[#eef2f7] px-2 py-0.5 text-[8px] font-black text-slate-500 shadow-[1px_1px_3px_rgba(148,163,184,0.2)]"
                >
                  Reset
                </button>
              )}
            </div>
            {[
              { label: "Contrast", value: contrast, onChange: onContrastChange },
              { label: "Level", value: level, onChange: onLevelChange },
            ].map((c) => (
              <label key={c.label} className="flex items-center gap-2 py-1">
                <span className="w-14 text-[9px] font-bold text-slate-600">{c.label}</span>
                <input
                  type="range" min={20} max={220} step={1} value={c.value}
                  onChange={(e) => c.onChange?.(Number(e.target.value))}
                  className="flex-1 h-1.5 accent-cyan-600"
                />
                <span className="w-9 text-right text-[9px] font-mono text-slate-700">{c.value}%</span>
              </label>
            ))}
          </div>
        )}

        {activeTab === "layer" && (
          <LayerManager
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={onSelectLayer}
            onToggleLayerVisibility={onToggleLayerVisibility}
            onMoveLayer={onMoveLayer}
            onOpenSettings={onOpenLayerSettings}
            onRenameLayer={onRenameLayer}
            maxHeightClass="max-h-[min(38vh,320px)]"
          />
        )}

        {activeTab === "line" && (
          <LineManager
            lines={lines}
            selectedLineId={selectedLineId}
            onSelectLine={onSelectLine}
            onRenameLine={onRenameLine}
            onChangeLineColor={onChangeLineColor}
            getLineLength={getLineLength}
            formatMeasurementFromPx={formatMeasurementFromPx}
            lineTypeLabel={lineTypeLabel}
            hkaSets={hkaSets}
            selectedHkaId={selectedHkaId}
            onSelectHka={onSelectHka}
            onDeleteHka={onDeleteHka}
            onUpdateHka={onUpdateHka}
            onToggleHkaSide={onToggleHkaSide}
            getHkaMeasurement={getHkaMeasurement}
            onRenameHka={onRenameHka}
            onChangeHkaColor={onChangeHkaColor}
            onChangeHkaStroke={onChangeHkaStroke}
            maxHeightClass="max-h-[min(38vh,320px)]"
          />
        )}

        {activeTab === "implant" && (
          <ImplantLayer
            items={implantItems}
            selectedType={selectedImplantType}
            selectedItemId={selectedImplantItemId}
            onSelectType={onSelectImplantType}
            onSelectItemId={onSelectImplantItemId}
            onUseSelected={onUseSelectedImplant}
            onReplaceSelected={onReplaceSelectedImplant}
            canReplaceSelected={canReplaceSelectedImplant}
            disabled={implantDisabled}
            scaleInstruction={implantInstruction}
            compact
          />
        )}

        {activeTab === "note" && (
          <AnnotationPanel
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={onSelectAnnotation}
            onUpdateAnnotation={onUpdateAnnotation}
            onRemoveAnnotation={onRemoveAnnotation}
            onActivateAnnotationTool={onActivateAnnotationTool}
            onSetPointerMode={onSetPointerMode}
            defaultColor={defaultAnnotationColor}
          />
        )}
      </div>
    </div>
  );
}
