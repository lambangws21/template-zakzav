"use client";

import {
  Hand,
  LockOpen,
  MousePointer2,
  PenTool,
  Redo2,
  SlidersHorizontal,
  Undo2,
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
      className={`inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full transition-all ${
        active ? "mobile-nav-pressed" : "mobile-nav-raised"
      } ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {Icon ? (
        <Icon className={`h-4 w-4 ${active ? "text-blue-600" : "text-slate-600"}`} />
      ) : null}
      {children}
    </button>
  );
}

export default function MobileNavigation({
  className = "",
  tabs = [],
  activeTool = "pan",
  activeToolLabel = "Tools",
  canvasMode = "pan",
  onPan,
  onEdit,
  onDraw,
  onTools,
  onUndo,
  onRedo,
  onUnlock,
  canUndo = false,
  canRedo = false,
}) {
  const tabColumns = tabs.length > 0 ? tabs.length : 1;

  return (
    <div className={`w-full ${className}`}>
      <style>{MOBILE_NAVIGATION_STYLES}</style>

      <div className="flex w-full flex-col gap-1.5 rounded-[28px] border border-slate-200/60 bg-[#eef2f7]/92 p-1.5 shadow-[2px_2px_7px_rgba(148,163,184,0.22),-2px_-2px_7px_rgba(255,255,255,0.78)] backdrop-blur-xl">
        <div
          className="mobile-nav-tray grid min-w-0 gap-1 rounded-full p-1"
          style={{ gridTemplateColumns: `repeat(${tabColumns}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`inline-flex h-10 min-w-0 items-center justify-center rounded-full px-2 text-[10px] font-bold transition-all ${
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

        <div className="flex min-w-0 items-center gap-1.5">
          <div className="mobile-nav-tray flex min-w-0 flex-1 items-center gap-1 rounded-full p-1">
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
            <ToolButton
              active={activeTool === "draw"}
              icon={PenTool}
              label="Line Draw"
              onClick={onDraw}
              className="flex-1"
            />
            <ToolButton
              active={activeTool === "tools"}
              icon={SlidersHorizontal}
              label={activeToolLabel}
              onClick={onTools}
              className="flex-1"
            />
          </div>
          <div className="mobile-nav-tray flex shrink-0 items-center gap-1 rounded-full p-1">
            <ToolButton
              active={false}
              icon={Undo2}
              label="Undo"
              onClick={onUndo}
              disabled={!canUndo}
              className="w-12 disabled:opacity-35"
            />
            <ToolButton
              active={false}
              icon={Redo2}
              label="Redo"
              onClick={onRedo}
              disabled={!canRedo}
              className="w-12 disabled:opacity-35"
            />
            <ToolButton
              active={false}
              icon={LockOpen}
              label="Unlock Canvas"
              onClick={onUnlock}
              className="w-12 text-rose-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
