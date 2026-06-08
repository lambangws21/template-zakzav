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

const MOBILE_NAVIGATION_STYLES = `
  .mobile-nav-tray {
    background: #eef2f7;
    box-shadow: inset 1px 1px 3px rgba(165, 180, 203, 0.4), inset -1px -1px 3px #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.8);
  }
  .mobile-nav-raised {
    background: #eef2f7;
    box-shadow: 1.5px 1.5px 4px rgba(165, 180, 203, 0.45), -1.5px -1.5px 4px #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.75);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .mobile-nav-raised:active {
    transform: translateY(0.5px);
  }
  .mobile-nav-pressed {
    background: #eef2f7;
    box-shadow: inset 1.5px 1.5px 4px rgba(165, 180, 203, 0.5), inset -1.5px -1.5px 4px #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.4);
    transform: translateY(0.5px);
  }
`;

function ToolButton({
  active = false,
  children,
  icon: Icon,
  label,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 min-w-10 shrink-0 items-center justify-center rounded-full transition-all ${
        active ? "mobile-nav-pressed" : "mobile-nav-raised"
      } ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {Icon ? (
        <Icon className={`h-3.5 w-3.5 ${active ? "text-blue-600" : "text-slate-600"}`} />
      ) : null}
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
  const tabColumns = tabs.length > 0 ? tabs.length : 1;

  return (
    <div className={`w-full ${className}`}>
      <style>{MOBILE_NAVIGATION_STYLES}</style>

      <div className="flex w-full flex-col gap-1 rounded-[22px] border border-slate-200/60 bg-[#eef2f7]/92 p-1 shadow-[2px_2px_6px_rgba(148,163,184,0.2),-2px_-2px_6px_rgba(255,255,255,0.76)] backdrop-blur-xl">
        <div
          className="mobile-nav-tray grid min-w-0 gap-1 rounded-full p-1"
          style={{ gridTemplateColumns: `repeat(${tabColumns}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`inline-flex h-8 min-w-0 items-center justify-center rounded-full px-1.5 text-[8px] font-bold transition-all ${
                tab.active
                  ? "mobile-nav-pressed text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              aria-label={tab.label}
              title={tab.label}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-1">
          <div className="mobile-nav-tray flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-full p-1">
            <ToolButton
              active={canvasMode === "pan"}
              icon={Hand}
              label="Pan Canvas"
              onClick={onPan}
              className="flex-1"
            />
            <ToolButton
              active={canvasMode === "edit"}
              icon={MousePointer2}
              label="Edit Points"
              onClick={onEdit}
              className="flex-1"
            />
            {[
              ["move", "Geser", Move],
              ["scale", "Size", Scaling],
              ["rotate", "Putar", RotateCw],
            ].map(([mode, label, Icon]) => (
              <ToolButton
                key={`mobile-tool-mode-${mode}`}
                active={toolMode === mode}
                icon={Icon}
                label={label}
                onClick={() => onToolModeChange?.(mode)}
                className="min-w-[3.4rem] gap-1 px-1 text-[8px] font-black text-slate-600"
              >
                {label}
              </ToolButton>
            ))}
            <ToolButton
              active={canvasLocked}
              icon={canvasLocked ? Lock : LockOpen}
              label={canvasLocked ? "Unlock Canvas" : "Lock Canvas"}
              onClick={onToggleCanvasLock}
              className="flex-1"
            />
            <ToolButton
              icon={ZoomOut}
              label="Zoom Out"
              onClick={onZoomOut}
              className="flex-1"
            />
            <ToolButton
              icon={RotateCcw}
              label="Reset 100%"
              onClick={onResetZoom}
              className="flex-1"
            />
            <ToolButton
              icon={ZoomIn}
              label="Zoom In"
              onClick={onZoomIn}
              className="flex-1"
            />
            <ToolButton
              icon={Maximize2}
              label="Fit Screen"
              onClick={onFit}
              className="flex-1"
            />
          </div>
          <div className="mobile-nav-tray flex shrink-0 items-center gap-1 rounded-full p-1">
            <ToolButton
              active={false}
              icon={LockOpen}
              label="Unlock Canvas"
              onClick={onUnlock}
              className="w-10 text-rose-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
