"use client";

import { Hand, PenTool, SlidersHorizontal } from "lucide-react";

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
      className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full transition-all ${
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
  onPan,
  onDraw,
  onTools,
}) {
  return (
    <div className={`w-full ${className}`}>
      <style>{MOBILE_NAVIGATION_STYLES}</style>

      <div className="flex w-full items-center gap-2 rounded-[28px] border border-slate-200/60 bg-[#eef2f7]/90 p-1.5 shadow-[2px_2px_7px_rgba(148,163,184,0.22),-2px_-2px_7px_rgba(255,255,255,0.78)] backdrop-blur-xl">
        <div className="mobile-nav-tray grid min-w-0 flex-1 grid-cols-4 gap-1 rounded-full p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`inline-flex min-w-0 items-center justify-center rounded-full px-2 py-2 text-[10px] font-bold transition-all ${
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

        <div className="mobile-nav-tray flex shrink-0 items-center gap-1 rounded-full p-1">
          <ToolButton
            active={activeTool === "pan"}
            icon={Hand}
            label="Move / Drag"
            onClick={onPan}
            className="w-10"
          />
          <ToolButton
            active={activeTool === "draw"}
            icon={PenTool}
            label="Line Draw"
            onClick={onDraw}
            className="w-10"
          />
          <ToolButton
            active={activeTool === "tools"}
            icon={SlidersHorizontal}
            label={activeToolLabel}
            onClick={onTools}
            className="min-w-[60px] gap-1.5 px-2.5"
          >
            <span
              className={`hidden text-[10px] font-black tracking-wider uppercase min-[380px]:inline ${
                activeTool === "tools" ? "text-blue-700" : "text-slate-600"
              }`}
            >
              Tools
            </span>
          </ToolButton>
        </div>
      </div>
    </div>
  );
}
