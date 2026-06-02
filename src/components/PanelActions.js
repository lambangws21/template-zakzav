"use client";

import {
  Activity,
  Compass,
  GitBranch,
  Grid,
  MapPin,
  Minus,
  Move,
  PenTool,
  Redo2,
  Scissors,
  Sliders,
  Undo2,
} from "lucide-react";

const PANEL_ACTION_STYLES = `
  .panel-actions-neu-card {
    background: #eef2f7;
    box-shadow: 5px 5px 14px rgba(148, 163, 184, 0.34), -5px -5px 14px rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.72);
  }
  .panel-actions-neu-button {
    background: #eef2f7;
    box-shadow: 3px 3px 8px rgba(148, 163, 184, 0.28), -3px -3px 8px rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.58);
    transition: all 0.2s ease-in-out;
  }
  .panel-actions-neu-button:hover {
    box-shadow: 2px 2px 5px rgba(148, 163, 184, 0.26), -2px -2px 5px rgba(255, 255, 255, 0.82);
    transform: translateY(0.5px);
  }
  .panel-actions-active {
    background: #ffffff;
    border: 1.5px solid #22d3ee !important;
    box-shadow: inset 2px 2px 5px rgba(34, 211, 238, 0.08), 0 0 8px rgba(34, 211, 238, 0.18);
  }
`;

const TOOL_ICON_MAP = {
  draw: PenTool,
  pan: Move,
  cut: Scissors,
  freeLine: Activity,
  angle: Compass,
  hka: GitBranch,
  hkaAuto: GitBranch,
  guideBuilder: Grid,
};

const TOOL_COLOR_MAP = {
  draw: "text-blue-500",
  pan: "text-cyan-500",
  cut: "text-rose-500",
  freeLine: "text-emerald-500",
  freeLinePoint: "text-indigo-500",
  angle: "text-amber-500",
  hkaAuto: "text-purple-500",
  guideBuilder: "text-teal-500",
};

function getToolGroup(item) {
  if (item.key === "pan" || item.freeLineMode === "point") {
    return "Navigation & Interaction";
  }
  if (item.key === "draw" || item.key === "angle" || item.freeLineMode === "freehand") {
    return "Measurement & Drawing";
  }
  return "Surgical Planning & Axis";
}

function getToolIcon(item) {
  if (item.freeLineMode === "point") return MapPin;
  return TOOL_ICON_MAP[item.icon] || TOOL_ICON_MAP[item.key] || Activity;
}

function groupTools(tools) {
  const order = [
    "Navigation & Interaction",
    "Measurement & Drawing",
    "Surgical Planning & Axis",
  ];
  return order
    .map((title) => ({
      title,
      items: tools.filter((item) => getToolGroup(item) === title),
    }))
    .filter((group) => group.items.length > 0);
}

export default function PanelActions({
  className = "",
  tools = [],
  activeTool = "pan",
  activeFreeLineMode = "freehand",
  onSelectTool,
  onMinimize,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
}) {
  const groups = groupTools(tools);

  return (
    <div
      className={`w-[min(84vw,230px)] rounded-[28px] p-4 -mt-5 text-slate-800 panel-actions-neu-card ${className}`}
    >
      <style>{PANEL_ACTION_STYLES}</style>

      <div className="flex items-center justify-between gap-3 border-b border-slate-300/20 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#eef2f7] text-cyan-600 shadow-[2px_2px_6px_rgba(148,163,184,0.28),-2px_-2px_6px_rgba(255,255,255,0.76)]">
            <Sliders className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[11px] font-black tracking-wider text-slate-800 uppercase">
              Panel Actions
            </h2>
            <p className="mt-0.5 text-[8px] font-extrabold text-slate-400 uppercase">
              Surgical Toolset
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded border border-cyan-200 bg-cyan-100/80 px-2 py-0.5 text-[8px] font-extrabold text-cyan-700 sm:inline-flex">
            Active
          </span>
          <button
            type="button"
            onClick={onMinimize}
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 panel-actions-neu-button hover:text-slate-800"
            title="Minimize panel actions"
            aria-label="Minimize panel actions"
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.title} className="space-y-2">
            <span className="block px-1 text-[8px] font-black tracking-widest text-slate-400 uppercase">
              {group.title}
            </span>

            <div className="grid grid-cols-1 gap-2">
              {group.items.map((item) => {
                const isActive = item.freeLineMode
                  ? activeTool === "freeLine" &&
                    activeFreeLineMode === item.freeLineMode
                  : activeTool === item.key;
                const ToolIcon = getToolIcon(item);
                const colorClass =
                  TOOL_COLOR_MAP[item.key] ||
                  TOOL_COLOR_MAP[item.icon] ||
                  "text-slate-500";

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectTool?.(item)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? "panel-actions-active"
                        : "panel-actions-neu-button text-slate-700"
                    }`}
                    title={`${item.label}: ${item.desc}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 shadow-inner ${colorClass}`}
                      >
                        <ToolIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-slate-800">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] font-medium text-slate-400 lowercase">
                          {item.desc}
                        </span>
                      </span>
                    </span>
                    {isActive ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-500 shadow-[0_0_7px_#22d3ee]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-300/20 pt-4">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 panel-actions-neu-button hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-45"
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 panel-actions-neu-button hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-45"
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
