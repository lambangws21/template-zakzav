"use client";

import {
  CloudUpload,
  Crosshair,
  Download,
  Hand,
  LensConcave,
  Layers,
  Lock,
  LockOpen,
  MapPin,
  Maximize2,
  Minimize2,
  MousePointer2,
  Move,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Scaling,
  Undo2,
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

  [data-theme="dark"] .mnav-tray {
    background: #1a2438;
    box-shadow: inset 1px 1px 3px rgba(0,5,20,0.55), inset -1px -1px 3px rgba(50,75,130,0.18);
    border: 1px solid rgba(255,255,255,0.08);
  }
  [data-theme="dark"] .mnav-btn {
    background: #1e2840;
    box-shadow: 2px 2px 5px rgba(0,5,20,0.60), -2px -2px 5px rgba(50,75,130,0.20);
    border: 1px solid rgba(255,255,255,0.09);
    color: #94a3b8;
  }
  [data-theme="dark"] .mnav-btn:active {
    box-shadow: inset 1px 1px 3px rgba(0,5,20,0.55);
    color: #c8d5e8;
  }
  [data-theme="dark"] .mnav-pressed {
    background: #131c2e;
    box-shadow: inset 2px 2px 5px rgba(0,5,20,0.60), inset -2px -2px 5px rgba(50,75,130,0.16);
    border: 1px solid rgba(255,255,255,0.07);
  }
`;

const TAB_ICONS = {
  upload:      CloudUpload,
  calibration: Crosshair,
  measure:     Ruler,
  manager:     Layers,
  export:      Download,
  annotate:    MapPin,
  dorr:        LensConcave,
};

const TAB_ACTIVE_COLORS = {
  upload:      "text-cyan-600",
  calibration: "text-amber-600",
  measure:     "text-blue-600",
  manager:     "text-violet-600",
  export:      "text-emerald-600",
  annotate:    "text-rose-600",
  dorr:        "text-indigo-600",
};

function Btn({
  active,
  icon: Icon,
  label,
  children,
  className = "",
  color = "",
  onPointerDown,
  ...rest
}) {
  const handlePointerDown = (event) => {
    onPointerDown?.(event);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
  };

  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-all ${
        active ? `mnav-pressed ${color || "text-blue-600"}` : `mnav-btn ${color || "text-slate-600"}`
      } ${className}`}
      aria-label={label}
      title={label}
      {...rest}
      onPointerDown={handlePointerDown}
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
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  isTablet = false,
  focusMode = false,
  onToggleFocusMode,
}) {
  const tabCols = tabs.length || 1;
  const isEditing = canvasMode === "edit";
  const floatingControlsClass = isTablet
    ? "pointer-events-auto fixed right-4 top-1/2 z-[52] flex max-h-[calc(100dvh-128px)] -translate-y-1/2 flex-col items-end gap-2 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:none]"
    : "pointer-events-auto fixed right-2 bottom-[calc(env(safe-area-inset-bottom)+var(--mobile-keyboard-offset,0px)+92px)] z-[52] flex max-h-[calc(100dvh-130px)] flex-col items-end gap-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:none]";
  const controlButtonClass = isTablet ? "h-11 w-11" : "h-10 w-10";
  const tabButtonClass = isTablet
    ? "inline-flex min-h-[48px] flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 transition-all"
    : "inline-flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-all";

  return (
    <div className={`pointer-events-none w-full ${className}`}>
      <style>{NAV_STYLES}</style>

      <div className={floatingControlsClass}>
        <div className="mnav-tray flex gap-0.5 rounded-full p-1 backdrop-blur-xl">
          <Btn active={canvasMode === "pan"} icon={Hand} label="Pan" onClick={onPan} className={controlButtonClass} />
          <Btn active={isEditing} icon={MousePointer2} label="Edit" onClick={onEdit} className={controlButtonClass} />
        </div>

        <AnimatePresence initial={false}>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="mnav-tray flex gap-0.5 rounded-full p-1 backdrop-blur-xl"
            >
              {([["move", Move, "Geser"], ["scale", Scaling, "Skala"], ["rotate", RotateCw, "Putar"]]).map(([mode, Icon, lbl]) => (
                <Btn key={mode} active={toolMode === mode} icon={Icon} label={lbl} onClick={() => onToolModeChange?.(mode)} className={controlButtonClass} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mnav-tray grid grid-cols-2 gap-0.5 rounded-[18px] p-1 backdrop-blur-xl">
          <Btn icon={Undo2} label="Undo" onClick={onUndo} className={`${controlButtonClass} transition-opacity ${!canUndo ? "opacity-35 cursor-not-allowed" : ""}`} color="text-slate-600" disabled={!canUndo} />
          <Btn icon={Redo2} label="Redo" onClick={onRedo} className={`${controlButtonClass} transition-opacity ${!canRedo ? "opacity-35 cursor-not-allowed" : ""}`} color="text-slate-600" disabled={!canRedo} />
          <Btn icon={ZoomOut} label="Zoom Out" onClick={onZoomOut} className={controlButtonClass} />
          <Btn icon={ZoomIn} label="Zoom In" onClick={onZoomIn} className={controlButtonClass} />
          <Btn icon={RotateCcw} label="Reset 100%" onClick={onResetZoom} className={controlButtonClass} />
          <Btn icon={Maximize2} label="Fit" onClick={onFit} className={controlButtonClass} />
        </div>

        <div className="mnav-tray rounded-full p-1 backdrop-blur-xl">
          <Btn
            active={canvasLocked}
            icon={canvasLocked ? Lock : LockOpen}
            label={canvasLocked ? "Unlock" : "Lock"}
            onClick={canvasLocked ? onUnlock : onToggleCanvasLock}
            className={controlButtonClass}
            color={canvasLocked ? "text-rose-500" : "text-slate-500"}
          />
        </div>

        <div className="mnav-tray rounded-full p-1 backdrop-blur-xl">
          <Btn
            active={focusMode}
            icon={focusMode ? Minimize2 : Maximize2}
            label={focusMode ? "Keluar Focus Canvas" : "Focus Canvas"}
            onClick={onToggleFocusMode}
            className={controlButtonClass}
            color={focusMode ? "text-cyan-500" : "text-slate-500"}
          />
        </div>
      </div>

      {!focusMode ? (
        <div
          className={`pointer-events-auto mx-auto flex w-full flex-col gap-1.5 rounded-[22px] border border-[var(--soft-border)] bg-[rgba(238,242,247,0.72)] p-1.5 shadow-[var(--soft-shadow-surface)] backdrop-blur-xl dark:bg-[rgba(26,36,56,0.72)] ${
            isTablet ? "max-w-[660px]" : ""
          }`}
        >

          {/* Row 1 — tabs with icons */}
          <div
            className="mnav-tray grid gap-0.5 rounded-2xl p-1"
            style={{ gridTemplateColumns: `repeat(${tabCols}, minmax(0, 1fr))` }}
          >
            {tabs.map((tab) => {
              const Icon = TAB_ICONS[tab.id];
              const activeColor = TAB_ACTIVE_COLORS[tab.id] || "text-slate-700";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={tab.onClick}
                  className={`${tabButtonClass} ${
                    tab.active
                      ? `mnav-pressed ${activeColor}`
                      : "text-slate-400"
                  }`}
                  aria-label={tab.ariaLabel || tab.label}
                  title={tab.title || tab.label}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span className={`truncate font-black tracking-wide ${isTablet ? "text-[10px]" : "text-[8px]"}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
