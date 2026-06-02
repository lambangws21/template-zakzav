"use client";

import { useMemo } from "react";
import {
  Check,
  ChevronDown,
  Compass,
  FileText,
  History,
  Info,
  Layers,
  Move,
  RotateCcw,
  Scaling,
  Sliders,
} from "lucide-react";
import {
  getImplantLibraryItemsByType,
  groupImplantLibraryBySystem,
  IMPLANT_LIBRARY_TYPE_LABELS,
} from "../lib/digitalTemplating/implantLibrary";

const QUICK_PANEL_STYLES = `
  .neu-flat {
    background: #eef2f7;
    box-shadow: 4px 4px 10px rgba(148, 163, 184, 0.32), -4px -4px 10px rgba(255, 255, 255, 0.78);
  }
  .neu-pressed {
    background: #eef2f7;
    box-shadow: inset 3px 3px 7px rgba(148, 163, 184, 0.28), inset -3px -3px 7px rgba(255, 255, 255, 0.82);
  }
  .neu-card {
    background: #eef2f7;
    box-shadow: 5px 5px 14px rgba(148, 163, 184, 0.34), -5px -5px 14px rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.7);
  }
  .neu-button {
    background: #eef2f7;
    box-shadow: 3px 3px 8px rgba(148, 163, 184, 0.28), -3px -3px 8px rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.5);
    transition: all 0.2s ease-in-out;
  }
  .neu-button:hover {
    box-shadow: 2px 2px 5px rgba(148, 163, 184, 0.26), -2px -2px 5px rgba(255, 255, 255, 0.82);
    transform: translateY(0.5px);
  }
  .neu-button:active,
  .neu-button-active {
    box-shadow: inset 2px 2px 5px rgba(148, 163, 184, 0.28), inset -2px -2px 5px rgba(255, 255, 255, 0.82);
    transform: translateY(1px);
  }
  .neu-input {
    background: #edf1f6;
    box-shadow: inset 3px 3px 6px #c4cfdc, inset -3px -3px 6px #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.9);
  }
  .active-dark {
    background: #1e293b;
    color: #ffffff !important;
    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.4), 2px 2px 8px rgba(30, 41, 59, 0.2);
    border-color: #0f172a;
  }
`;

const QUICK_PLANNING_ICONS = {
  tka: "/images/quick-panel/tka-icon.png",
  hip: "/images/quick-panel/hip-icon.png",
};

function QuickButton({
  children,
  icon: Icon,
  iconClassName = "text-slate-500",
  imageSrc = "",
  imageAlt = "",
  imageClassName = "",
  active = false,
  danger = false,
  disabled = false,
  className = "",
  ...props
}) {
  const toneClass = danger
    ? "text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-100/30 border-rose-200/40 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff]"
    : active
      ? "active-dark"
      : "text-slate-700 neu-button";

  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-2xl text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${toneClass} ${className}`}
      {...props}
    >
      {imageSrc ? (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
            active ? "bg-white/15" : "bg-white/60"
          } shadow-[inset_1px_1px_2px_rgba(148,163,184,0.26),inset_-1px_-1px_2px_rgba(255,255,255,0.82)]`}
        >
          <img
            src={imageSrc}
            alt={imageAlt}
            className={`h-full w-full object-cover ${imageClassName}`}
          />
        </span>
      ) : Icon ? (
        <Icon
          className={`h-3.5 w-3.5 ${active ? "text-white" : iconClassName}`}
        />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export default function QuickPanel({
  className = "",
  statusLabel = "Ready",
  workflowStep = 1,
  workflowMax = 4,
  measurementCount = 0,
  activeTool = "move",
  onMinimize,
  onUpload,
  onCalibration,
  onCreateLayer,
  canCreateLayer = true,
  onGuide,
  onMove,
  onOpenTka,
  onOpenHip,
  onHistory,
  canHistory = true,
  onReset,
  implantItems = [],
  selectedImplantType = "cup",
  selectedImplantItemId = "",
  onSelectImplantType,
  onSelectImplantItemId,
  onUseSelectedImplant,
  implantDisabled = false,
  implantInstruction = "",
}) {
  const filteredImplants = useMemo(
    () => getImplantLibraryItemsByType(selectedImplantType, implantItems),
    [implantItems, selectedImplantType],
  );
  const groupedImplants = useMemo(
    () => groupImplantLibraryBySystem(filteredImplants),
    [filteredImplants],
  );
  const selectedImplant =
    filteredImplants.find(
      (item) => String(item.id) === String(selectedImplantItemId),
    ) ||
    filteredImplants[0] ||
    null;
  const activeToolKey = activeTool === "pan" ? "move" : activeTool;

  const handleImplantTypeChange = (type) => {
    onSelectImplantType?.(type);
    const firstItem = getImplantLibraryItemsByType(type, implantItems)[0];
    if (firstItem) {
      onSelectImplantItemId?.(firstItem.id);
    }
  };

  return (
    <div
      className={`w-[min(88vw,320px)] shrink-0 rounded-[36px] p-5 text-slate-800 neu-card ${className}`}
    >
      <style>{QUICK_PANEL_STYLES}</style>

      <div className="flex items-center justify-between gap-3 border-b border-slate-300/20 pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#eef2f7] text-blue-600 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff]">
            <Sliders className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-black tracking-wider text-slate-800 uppercase">
              Quick Panel
            </h2>
            <p className="mt-0.5 text-[9px] font-extrabold text-slate-400 uppercase">
              Navigation Hub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-emerald-200 bg-emerald-100/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={onMinimize}
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 neu-button hover:text-slate-800"
            aria-label="Minimize Quick Panel"
            title="Minimize Quick Panel"
          >
            <span className="text-xs font-bold">-</span>
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2 rounded-2xl border border-white/60 p-3.5 text-xs font-bold text-slate-700 neu-pressed">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
            Step aktif
          </span>
          <span className="rounded-md border border-white bg-white/60 px-2 py-0.5 font-mono text-[11px] text-slate-800">
            {workflowStep}/{workflowMax}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
            Measurement
          </span>
          <span className="rounded-md border border-white bg-white/60 px-2 py-0.5 font-mono text-[11px] text-slate-800">
            {measurementCount}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <span className="block px-1 text-[10px] font-black tracking-wider text-slate-400 uppercase">
          Menu Utama & Alat
        </span>

        <div className="grid grid-cols-2 gap-3">
          <QuickButton
            icon={FileText}
            iconClassName="text-blue-500"
            onClick={onUpload}
            className="py-3"
          >
            Upload & Sheet
          </QuickButton>
          <QuickButton
            icon={Scaling}
            iconClassName="text-emerald-500"
            onClick={onCalibration}
            className="py-3"
          >
            Kalibrasi
          </QuickButton>
        </div>

        <QuickButton
          icon={Layers}
          iconClassName="text-indigo-500"
          onClick={onCreateLayer}
          disabled={!canCreateLayer}
          className="w-full py-3"
        >
          Layer Kosong
        </QuickButton>

        <div className="grid grid-cols-2 gap-3">
          <QuickButton
            icon={Compass}
            active={activeToolKey === "guideBuilder"}
            onClick={onGuide}
            className="py-3"
          >
            Panduan
          </QuickButton>
          <QuickButton
            icon={Move}
            active={activeToolKey === "move"}
            onClick={onMove}
            className="py-3"
          >
            Move / Drag
          </QuickButton>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <QuickButton
            imageSrc={QUICK_PLANNING_ICONS.tka}
            imageAlt="TKA planning"
            onClick={onOpenTka}
            className="rounded-xl py-2 text-[11px] font-extrabold"
          >
            TKA
          </QuickButton>
          <QuickButton
            imageSrc={QUICK_PLANNING_ICONS.hip}
            imageAlt="HIP planning"
            onClick={onOpenHip}
            className="rounded-xl py-2 text-[11px] font-extrabold"
          >
            HIP
          </QuickButton>
        </div>

        <QuickButton
          icon={History}
          onClick={onHistory}
          disabled={!canHistory}
          className="w-full py-3"
        >
          History
        </QuickButton>

        <QuickButton
          icon={RotateCcw}
          onClick={onReset}
          danger
          className="w-full py-3"
        >
          Reset Workspace
        </QuickButton>
      </div>

      <div className="mt-5 space-y-4 rounded-[28px] border border-white/40 bg-[#eef2f7] p-4 shadow-[inset_4px_4px_8px_#cbd5e1,inset_-4px_-4px_8px_#ffffff]">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
            Implant
          </span>
          {implantInstruction ? (
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 shadow-sm"
              title={implantInstruction}
              aria-label={implantInstruction}
            >
              <Info className="h-3 w-3" />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 shadow-inner">
          {Object.entries(IMPLANT_LIBRARY_TYPE_LABELS).map(([type, label]) => {
            const isSelected = selectedImplantType === type;
            return (
              <button
                key={`quick-implant-${type}`}
                type="button"
                onClick={() => handleImplantTypeChange(type)}
                className={`rounded-lg py-2 text-[10px] font-extrabold uppercase transition-all ${
                  isSelected
                    ? "bg-white text-slate-800 shadow-md"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title={label}
              >
                {label.slice(0, 4)}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <select
            value={selectedImplant?.id || ""}
            onChange={(event) => onSelectImplantItemId?.(event.target.value)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-white bg-[#edf1f6] py-2.5 pr-8 pl-3 text-xs font-bold text-slate-800 shadow-[inset_2px_2px_5px_#c4cfdc,inset_-2px_-2px_5px_#ffffff] outline-none"
          >
            {Object.keys(groupedImplants).length === 0 ? (
              <option value="">Belum ada item</option>
            ) : (
              Object.entries(groupedImplants).map(([system, systemItems]) => (
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
          <ChevronDown className="pointer-events-none absolute top-3 right-3.5 h-4 w-4 text-slate-500" />
        </div>

        <button
          type="button"
          onClick={onUseSelectedImplant}
          disabled={implantDisabled || !selectedImplant}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-200/70 py-3 text-xs font-black text-emerald-800 shadow-[3px_3px_8px_rgba(16,185,129,0.15),_inset_0_-2px_0_rgba(0,0,0,0.05)] transition-all hover:scale-[1.01] hover:bg-emerald-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Check className="h-4 w-4" />
          <span>Pakai</span>
        </button>
      </div>
    </div>
  );
}
