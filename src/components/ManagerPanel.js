"use client";

import { Layers, Ruler, Box, X } from "lucide-react";
import LayerManager from "./LayerManager";
import LineManager from "./LineManager";
import ImplantLayer from "./ImplantLayer";

const TABS = [
  { id: "layer",   label: "Layer",   Icon: Layers, accent: "cyan"   },
  { id: "line",    label: "Line",    Icon: Ruler,  accent: "emerald" },
  { id: "implant", label: "Implant", Icon: Box,    accent: "violet"  },
];

const ACCENT = {
  cyan:    { pill: "bg-cyan-600 text-white",    dot: "bg-cyan-500" },
  emerald: { pill: "bg-emerald-600 text-white", dot: "bg-emerald-500" },
  violet:  { pill: "bg-violet-600 text-white",  dot: "bg-violet-500" },
};

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
  style,
}) {
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div
      className={`flex flex-col rounded-[26px] border border-white/75 bg-[#eef2f7]/97 text-slate-800 shadow-[6px_6px_18px_rgba(148,163,184,0.28),-6px_-6px_18px_rgba(255,255,255,0.82)] backdrop-blur-xl ${className}`}
      style={style}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Manager
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
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[10px] font-black transition-all ${
                isActive
                  ? `${ACCENT[accent].pill} shadow-[1px_2px_6px_rgba(0,0,0,0.18)]`
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
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
      </div>
    </div>
  );
}
