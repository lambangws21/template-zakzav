"use client";

import {
  Hand,
  Lock,
  LockOpen,
  Maximize2,
  MousePointer2,
  Move,
  RotateCcw,
  RotateCw,
  Scaling,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const NAV_STYLES = `
  .mnav-tray {
    background: #eef2f7;
    box-shadow: inset 1px 1px 3px rgba(165,180,203,0.38), inset -1px -1px 3px #ffffff;
    border: 1px solid rgba(255,255,255,0.78);
  }
  .mnav-btn {
    background: #eef2f7;
    box-shadow: 1.5px 1.5px 4px rgba(165,180,203,0.4), -1.5px -1.5px 4px #fff;
    border: 1px solid rgba(255,255,255,0.7);
    transition: box-shadow 0.15s, transform 0.1s;
  }
  .mnav-btn:active { transform: translateY(0.5px); box-shadow: inset 1px 1px 3px rgba(165,180,203,0.38); }
  .mnav-pressed {
    background: #eef2f7;
    box-shadow: inset 1.5px 1.5px 4px rgba(165,180,203,0.48), inset -1.5px -1.5px 4px #fff;
    border: 1px solid rgba(255,255,255,0.38);
  }
`;

function Btn({ active, icon: Icon, label, children, className = "", color = "", ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-all ${
        active ? `mnav-pressed ${color || "text-blue-600"}` : `mnav-btn ${color || "text-slate-600"}`
      } ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      {children}
    </button>
  );
}

export default function MobileNavigation({
  className = "",
  tabs = [],
  canvasMode = "pan",
  toolMode = "move",
  canvasLocked = false,
  onPan,
  onEdit,
  onToolModeChange,
  onToggleCanvasLock,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFit,
  onUnlock,
}) {
  const tabCols = tabs.length || 1;
  const isEditing = canvasMode === "edit";

  return (
    <div className={`w-full ${className}`}>
      <style>{NAV_STYLES}</style>

      <div className="flex w-full flex-col gap-1 rounded-[20px] border border-slate-200/55 bg-[#eef2f7]/93 p-1 shadow-[2px_2px_6px_rgba(148,163,184,0.18),-2px_-2px_6px_rgba(255,255,255,0.76)] backdrop-blur-xl">

        {/* Row 1 — tabs */}
        <div
          className="mnav-tray grid gap-0.5 rounded-full p-1"
          style={{ gridTemplateColumns: `repeat(${tabCols}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`inline-flex h-7 min-w-0 items-center justify-center rounded-full px-1 text-[9px] font-bold transition-all ${
                tab.active ? "mnav-pressed text-slate-900" : "text-slate-500"
              }`}
              aria-label={tab.label}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Row 2 — canvas controls */}
        <div className="flex items-center gap-1">
          {/* Pan / Edit toggle */}
          <div className="mnav-tray flex shrink-0 gap-0.5 rounded-full p-1">
            <Btn active={canvasMode === "pan"} icon={Hand} label="Pan" onClick={onPan} className="h-8 w-8" />
            <Btn active={isEditing} icon={MousePointer2} label="Edit" onClick={onEdit} className="h-8 w-8" />
          </div>

          {/* Edit-mode transform controls — only visible when editing */}
          <AnimatePresence initial={false}>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="mnav-tray flex shrink-0 overflow-hidden gap-0.5 rounded-full p-1"
              >
                {([["move", Move, "Geser"], ["scale", Scaling, "Skala"], ["rotate", RotateCw, "Putar"]] ).map(([mode, Icon, lbl]) => (
                  <Btn key={mode} active={toolMode === mode} icon={Icon} label={lbl} onClick={() => onToolModeChange?.(mode)} className="h-8 w-8" />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zoom controls */}
          <div className="mnav-tray flex min-w-0 flex-1 gap-0.5 rounded-full p-1">
            <Btn icon={ZoomOut} label="Zoom Out" onClick={onZoomOut} className="h-8 flex-1" />
            <Btn icon={Maximize2} label="Fit" onClick={onFit} className="h-8 flex-1" />
            <Btn icon={RotateCcw} label="Reset 100%" onClick={onResetZoom} className="h-8 flex-1" />
            <Btn icon={ZoomIn} label="Zoom In" onClick={onZoomIn} className="h-8 flex-1" />
          </div>

          {/* Lock */}
          <div className="mnav-tray flex shrink-0 gap-0.5 rounded-full p-1">
            <Btn
              active={canvasLocked}
              icon={canvasLocked ? Lock : LockOpen}
              label={canvasLocked ? "Unlock" : "Lock"}
              onClick={canvasLocked ? onUnlock : onToggleCanvasLock}
              className="h-8 w-8"
              color={canvasLocked ? "text-rose-500" : "text-slate-500"}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
