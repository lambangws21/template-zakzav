import {
  History,
  Image as ImageIcon,
  Minus,
  Move,
  PenTool,
  Rotate3d,
  Ruler as RulerIcon,
  Scissors,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SimpleViewerOverlayProps = {
  uiMode: "simple" | "advance";
  simpleViewEnabled: boolean;
  workflowDoneCount: number;
  workflowPercent: number;
  drawMode: boolean;
  panMode: boolean;
  cutoutMode: boolean;
  pencilMode: boolean;
  angleMode: boolean;
  ahkaMode: boolean;
  syncScaleMode: boolean;
  anatomyMode: "hip" | "knee";
  canUndo: boolean;
  onSetUiMode: (mode: "simple" | "advance") => void;
  onToggleDrawMode: () => void;
  onTogglePanMode: () => void;
  onToggleCutoutMode: () => void;
  onTogglePencilMode: () => void;
  onToggleAngleMode: () => void;
  onToggleAhkaMode: () => void;
  onUploadClick: () => void;
  onToggleSyncScale: () => void;
  onUndo: () => void;
  onApplyAnatomyMode: (mode: "hip" | "knee") => void;
};

type ToolItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
};

const toolButtonClass =
  "inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white";
const toolButtonActiveClass =
  "border-indigo-500/70 bg-indigo-50 text-indigo-700 shadow-[0_10px_24px_rgba(99,102,241,0.25)]";

const leftActionClass =
  "group flex w-full flex-col items-center gap-1.5 rounded-2xl border border-white/70 bg-white/80 px-3 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white";

export function SimpleViewerOverlay({
  uiMode,
  simpleViewEnabled,
  workflowDoneCount,
  workflowPercent,
  drawMode,
  panMode,
  cutoutMode,
  pencilMode,
  angleMode,
  ahkaMode,
  syncScaleMode,
  anatomyMode,
  canUndo,
  onSetUiMode,
  onToggleDrawMode,
  onTogglePanMode,
  onToggleCutoutMode,
  onTogglePencilMode,
  onToggleAngleMode,
  onToggleAhkaMode,
  onUploadClick,
  onToggleSyncScale,
  onUndo,
  onApplyAnatomyMode,
}: SimpleViewerOverlayProps) {
  const anatomyTools: ToolItem[] =
    anatomyMode === "hip"
      ? [
          {
            key: "draw",
            label: "Draw Line",
            icon: Minus,
            active: drawMode,
            onClick: onToggleDrawMode,
          },
          {
            key: "freecut",
            label: "Free Cut",
            icon: Scissors,
            active: cutoutMode,
            onClick: onToggleCutoutMode,
          },
          {
            key: "freeline",
            label: "Free Line",
            icon: PenTool,
            active: pencilMode,
            onClick: onTogglePencilMode,
          },
          {
            key: "move",
            label: "Move",
            icon: Move,
            active: panMode,
            onClick: onTogglePanMode,
          },
        ]
      : [
          {
            key: "draw",
            label: "Draw Line",
            icon: Minus,
            active: drawMode,
            onClick: onToggleDrawMode,
          },
          {
            key: "angle",
            label: "Angle",
            icon: Rotate3d,
            active: angleMode,
            onClick: onToggleAngleMode,
          },
          {
            key: "hka",
            label: "HKA Line",
            icon: RulerIcon,
            active: ahkaMode,
            onClick: onToggleAhkaMode,
          },
          {
            key: "move",
            label: "Move",
            icon: Move,
            active: panMode,
            onClick: onTogglePanMode,
          },
        ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[68]">
      <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2">
        <div className="inline-flex rounded-2xl border border-white/70 bg-white/75 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          {(["simple", "advance"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSetUiMode(mode)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${
                uiMode === mode
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white/80"
              }`}
              aria-pressed={uiMode === mode}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {simpleViewEnabled && (
        <>
          <div className="pointer-events-auto absolute left-4 top-4 w-[172px] rounded-3xl border border-white/70 bg-white/70 p-3 shadow-[0_14px_38px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workflow
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-slate-700 transition-all"
                style={{ width: `${workflowPercent}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-700">
              {workflowPercent}% • {workflowDoneCount}/3
            </div>

            <div className="mt-4 space-y-3">
              <button type="button" onClick={onUploadClick} className={leftActionClass}>
                <ImageIcon size={20} />
                <span>Upload & Sheet</span>
              </button>
              <button
                type="button"
                onClick={onToggleSyncScale}
                className={`${leftActionClass} ${syncScaleMode ? "border-emerald-400 bg-emerald-50 text-emerald-700" : ""}`}
              >
                <RulerIcon size={20} />
                <span>{syncScaleMode ? "Kalibrasi ON" : "Kalibrasi"}</span>
              </button>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={`${leftActionClass} ${!canUndo ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <History size={20} />
                <span>History</span>
              </button>
            </div>
          </div>

          <div className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 rounded-3xl border border-white/70 bg-white/72 px-3 py-3 shadow-[0_20px_46px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {anatomyMode === "hip" ? "HIP Line Tool" : "Knee Line Tool"}
            </div>
            <div className="flex flex-col gap-2">
              {anatomyTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.key}
                    type="button"
                    onClick={tool.onClick}
                    className={`${toolButtonClass} ${tool.active ? toolButtonActiveClass : ""}`}
                    title={tool.label}
                  >
                    <Icon size={22} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 rounded-2xl border border-white/70 bg-white/75 p-2.5 shadow-[0_20px_46px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onApplyAnatomyMode("hip")}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  anatomyMode === "hip"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                HIP
              </button>
              <button
                type="button"
                onClick={() => onApplyAnatomyMode("knee")}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  anatomyMode === "knee"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                KNEE
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
