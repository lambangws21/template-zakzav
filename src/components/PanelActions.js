"use client";

import {
  Activity,
  Circle,
  Compass,
  GitBranch,
  Grid,
  MessageSquare,
  Minus,
  Waypoints,
  LineSquiggle,
  Move,
  PenTool,
  Redo2,
  Scissors,
  Undo2,
  BookMarked,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ─── icon map ─────────────────────────────────────────────────────────────────

function CupIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <ellipse cx="12" cy="12" rx="9" ry="5" strokeDasharray="3 1.5"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="12" y1="7" x2="12" y2="17"/>
      <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
    </svg>
  );
}

const TOOL_ICON_MAP = {
  draw: PenTool,
  pan: Move,
  cut: Scissors,
  freeLine: LineSquiggle,
  freeLinePoint: Waypoints,
  angle: Compass,
  circle: Circle,
  hka: GitBranch,
  hkaAuto: GitBranch,
  guideBuilder: Grid,
  annotation: MessageSquare,
  imageProcess: Activity,
  cupAssessment: CupIcon,
};

// ─── accent system — glassmorphism ────────────────────────────────────────────
// bg / border / text / inner-glow / header-bg

const TOOL_ACCENT = {
  draw:         { bg: "bg-blue-500/10",    border: "border-blue-500/45",    text: "text-blue-400",    inner: "shadow-[inset_0_1px_4px_rgba(59,130,246,0.22)]",   headerBg: "bg-blue-500/20" },
  pan:          { bg: "bg-cyan-500/10",    border: "border-cyan-500/45",    text: "text-cyan-400",    inner: "shadow-[inset_0_1px_4px_rgba(6,182,212,0.22)]",    headerBg: "bg-cyan-500/20" },
  cut:          { bg: "bg-rose-500/10",    border: "border-rose-500/45",    text: "text-rose-400",    inner: "shadow-[inset_0_1px_4px_rgba(244,63,94,0.22)]",    headerBg: "bg-rose-500/20" },
  freeLine:     { bg: "bg-emerald-500/10", border: "border-emerald-500/45", text: "text-emerald-400", inner: "shadow-[inset_0_1px_4px_rgba(16,185,129,0.22)]",   headerBg: "bg-emerald-500/20" },
  freeLinePoint:{ bg: "bg-indigo-500/10",  border: "border-indigo-500/45",  text: "text-indigo-400",  inner: "shadow-[inset_0_1px_4px_rgba(99,102,241,0.22)]",   headerBg: "bg-indigo-500/20" },
  angle:        { bg: "bg-amber-500/10",   border: "border-amber-500/45",   text: "text-amber-400",   inner: "shadow-[inset_0_1px_4px_rgba(245,158,11,0.22)]",   headerBg: "bg-amber-500/20" },
  circle:       { bg: "bg-violet-500/10",  border: "border-violet-500/45",  text: "text-violet-400",  inner: "shadow-[inset_0_1px_4px_rgba(139,92,246,0.22)]",   headerBg: "bg-violet-500/20" },
  hka:          { bg: "bg-purple-500/10",  border: "border-purple-500/45",  text: "text-purple-400",  inner: "shadow-[inset_0_1px_4px_rgba(168,85,247,0.22)]",   headerBg: "bg-purple-500/20" },
  hkaAuto:      { bg: "bg-purple-500/10",  border: "border-purple-500/45",  text: "text-purple-400",  inner: "shadow-[inset_0_1px_4px_rgba(168,85,247,0.22)]",   headerBg: "bg-purple-500/20" },
  guideBuilder: { bg: "bg-teal-500/10",    border: "border-teal-500/45",    text: "text-teal-400",    inner: "shadow-[inset_0_1px_4px_rgba(20,184,166,0.22)]",   headerBg: "bg-teal-500/20" },
  annotation:   { bg: "bg-orange-500/10",  border: "border-orange-500/45",  text: "text-orange-400",  inner: "shadow-[inset_0_1px_4px_rgba(249,115,22,0.22)]",   headerBg: "bg-orange-500/20" },
  imageProcess: { bg: "bg-sky-500/10",     border: "border-sky-500/45",     text: "text-sky-400",     inner: "shadow-[inset_0_1px_4px_rgba(14,165,233,0.22)]",   headerBg: "bg-sky-500/20" },
  cupAssessment:{ bg: "bg-amber-500/10",   border: "border-amber-500/45",   text: "text-amber-400",   inner: "shadow-[inset_0_1px_4px_rgba(245,158,11,0.22)]",   headerBg: "bg-amber-500/20" },
};

const IDLE_ICON_COLOR = {
  draw:         "text-blue-400",
  pan:          "text-cyan-400",
  cut:          "text-rose-400",
  freeLine:     "text-emerald-400",
  freeLinePoint:"text-indigo-400",
  angle:        "text-amber-400",
  circle:       "text-violet-400",
  hka:          "text-purple-400",
  hkaAuto:      "text-purple-400",
  guideBuilder: "text-teal-400",
  annotation:   "text-orange-400",
  imageProcess: "text-sky-400",
  cupAssessment:"text-amber-400",
};

// ─── grouping ─────────────────────────────────────────────────────────────────

const GROUP_META = {
  "Move":     { label: "Navigasi",    color: "text-cyan-500/70" },
  "Drawing":  { label: "Pengukuran",  color: "text-blue-500/70" },
  "Planning": { label: "Perencanaan", color: "text-purple-500/70" },
  "ZakVisor": { label: "ZakVisor",    color: "text-sky-500/70" },
};

function getToolGroupKey(item) {
  if (item.key === "pan")          return "Move";
  if (item.key === "imageProcess") return "ZakVisor";
  if (["draw","angle","circle","annotation"].includes(item.key) || item.freeLineMode)
    return "Drawing";
  return "Planning";
}

function getToolIcon(item) {
  if (item.freeLineMode === "point") return Waypoints;
  return TOOL_ICON_MAP[item.icon] || TOOL_ICON_MAP[item.key] || BookMarked;
}

function groupTools(tools) {
  const order = ["Move", "Drawing", "Planning", "ZakVisor"];
  const map = {};
  for (const item of tools) {
    const g = getToolGroupKey(item);
    if (!map[g]) map[g] = [];
    map[g].push(item);
  }
  return order.filter((k) => map[k]).map((k) => ({ key: k, items: map[k] }));
}

// ─── animation ───────────────────────────────────────────────────────────────

const PANEL_V = {
  hidden:  { opacity: 0, x: 28, scale: 0.92 },
  visible: { opacity: 1, x: 0, scale: 1,
    transition: { type: "spring", damping: 24, stiffness: 280, staggerChildren: 0.03, delayChildren: 0.05 } },
  exit:    { opacity: 0, x: 24, scale: 0.9, transition: { duration: 0.16 } },
};
const GROUP_V = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0,
    transition: { type: "spring", damping: 22, stiffness: 260, staggerChildren: 0.03 } },
};
const ITEM_V = {
  hidden:  { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", damping: 18, stiffness: 320 } },
};
const TAP = { whileTap: { scale: 0.9 } };

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ label, desc, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 6, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 4, scale: 0.92 }}
          transition={{ duration: 0.14 }}
          className="pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2 w-max max-w-[140px] rounded-xl border border-white/70 bg-slate-800/95 px-2.5 py-1.5 text-left backdrop-blur-sm"
        >
          <p className="text-[10px] font-black text-white">{label}</p>
          {desc && <p className="mt-0.5 text-[8px] text-slate-400">{desc}</p>}
          <div className="absolute top-1/2 right-0 h-0 w-0 -translate-y-1/2 translate-x-full border-t-4 border-b-4 border-l-4 border-transparent border-l-slate-800/95" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── ToolBtn ──────────────────────────────────────────────────────────────────

function ToolBtn({ item, isActive, onSelect, fullWidth = false }) {
  const ToolIcon = getToolIcon(item);
  const accent   = TOOL_ACCENT[item.key] || TOOL_ACCENT.draw;
  const idleClr  = IDLE_ICON_COLOR[item.key] || "text-slate-400";

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(item)}
      className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border p-1.5 transition-all duration-200 ${
        fullWidth ? "w-full flex-row gap-2 px-2.5 py-2 justify-start" : "aspect-square w-full"
      } ${
        isActive
          ? `${accent.bg} ${accent.border} ${accent.inner} ${accent.text}`
          : "border-[var(--soft-border)] bg-transparent hover:bg-white/6 hover:border-white/20"
      }`}
      aria-label={`${item.label}: ${item.desc}`}
      aria-pressed={isActive}
      variants={ITEM_V}
      {...TAP}
      layout
    >
      <span className={`flex shrink-0 items-center justify-center ${
        fullWidth ? "h-7 w-7" : "h-7 w-7"
      } ${isActive ? "" : idleClr}`}>
        <ToolIcon className={fullWidth ? "h-4 w-4" : "h-5 w-5"} />
      </span>
      <span className={`leading-none truncate ${
        fullWidth ? "text-[10px] font-bold" : "text-[8px] font-black"
      } ${isActive ? "" : "text-[var(--soft-text-lo,theme(colors.slate.500))]"}`}>
        {item.label}
      </span>
    </motion.button>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

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
  onCupAssessment,
  cupAssessmentActive = false,
}) {
  const groups = groupTools(tools);

  const activeItem = tools.find((item) =>
    item.freeLineMode
      ? activeTool === "freeLine" && activeFreeLineMode === item.freeLineMode
      : activeTool === item.key,
  );

  const isItemActive = (item) => {
    if (item.key === "cupAssessment") return cupAssessmentActive;
    return item.freeLineMode
      ? activeTool === "freeLine" && activeFreeLineMode === item.freeLineMode
      : activeTool === item.key;
  };

  const activeAccent = activeItem ? (TOOL_ACCENT[activeItem.key] || TOOL_ACCENT.draw) : null;

  return (
    <motion.div
      className={`w-[min(84vw,196px)] rounded-[16px] border border-[var(--soft-border)] [background:var(--soft-float-bg)] text-[var(--soft-text)] shadow-[var(--soft-shadow-surface)] backdrop-blur-xl ${className}`}
      variants={PANEL_V}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* ── Header ─── */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--soft-border)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <AnimatePresence mode="wait">
            {activeItem ? (
              <motion.div
                key={activeItem.key}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${activeAccent?.border || "border-slate-500/30"} ${activeAccent?.headerBg || "bg-slate-500/15"} ${activeAccent?.inner || ""}`}
              >
                {(() => { const I = getToolIcon(activeItem); return <I className={`h-3.5 w-3.5 ${activeAccent?.text || "text-slate-400"}`} />; })()}
              </motion.div>
            ) : (
              <motion.div key="idle" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[var(--soft-border)] bg-transparent">
                <Zap className="h-3.5 w-3.5 text-slate-400" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeItem?.key || "none"}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.14 }}
                className={`truncate text-[10px] font-black ${activeAccent?.text || "text-[var(--soft-text)]"}`}
              >
                {activeItem?.label || "Pilih Tool"}
              </motion.p>
            </AnimatePresence>
            <p className="truncate text-[8px] text-[var(--soft-text-lo,theme(colors.slate.500))]">
              {activeItem?.desc || "tap tool di bawah"}
            </p>
          </div>
        </div>

        {/* Undo / Redo + Minimize — one compact row */}
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex items-center rounded-lg border border-[var(--soft-border)] overflow-hidden">
            <motion.button
              type="button" onClick={onUndo} disabled={!canUndo}
              className={`flex h-6 w-6 items-center justify-center transition-all duration-150 ${canUndo ? "hover:bg-white/10 text-[var(--soft-text)]" : "opacity-30 cursor-not-allowed text-slate-500"}`}
              title="Undo (Ctrl+Z)" {...TAP}
            >
              <Undo2 className="h-3 w-3" />
            </motion.button>
            <div className="h-3.5 w-px bg-[var(--soft-border)]" />
            <motion.button
              type="button" onClick={onRedo} disabled={!canRedo}
              className={`flex h-6 w-6 items-center justify-center transition-all duration-150 ${canRedo ? "hover:bg-white/10 text-[var(--soft-text)]" : "opacity-30 cursor-not-allowed text-slate-500"}`}
              title="Redo (Ctrl+Y)" {...TAP}
            >
              <Redo2 className="h-3 w-3" />
            </motion.button>
          </div>
          <motion.button
            type="button"
            onClick={onMinimize}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/80 text-white hover:bg-rose-500 transition-colors"
            title="Minimize"
            {...TAP}
            whileHover={{ scale: 1.12 }}
          >
            <Minus className="h-3 w-3" />
          </motion.button>
        </div>
      </div>

      {/* ── Tool groups ─── */}
      <div className="space-y-2 px-2 py-2">
        {groups.map((group) => {
          const meta = GROUP_META[group.key] || { label: group.key, color: "text-slate-400/70" };
          return (
            <motion.div key={group.key} className="space-y-1" variants={GROUP_V}>
              <div className="flex items-center gap-1.5 px-0.5">
                <span className={`text-[7px] font-black uppercase tracking-widest ${meta.color}`}>
                  {meta.label}
                </span>
                <div className="h-px flex-1 bg-[var(--soft-border)]" />
              </div>
              <div className="grid grid-cols-2 gap-1">
                {group.items.map((item) => (
                  <ToolBtn
                    key={item.key}
                    item={item}
                    isActive={isItemActive(item)}
                    onSelect={(item) => onSelectTool?.(item)}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
