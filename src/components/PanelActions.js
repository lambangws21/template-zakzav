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
import { useState } from "react";

// ─── icon + color maps ────────────────────────────────────────────────────────

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
};

// active bg + text + glow
const TOOL_ACCENT = {
  draw:         { bg: "bg-blue-500",    text: "text-white", glow: "shadow-[0_0_12px_rgba(59,130,246,0.55)]" },
  pan:          { bg: "bg-cyan-500",    text: "text-white", glow: "shadow-[0_0_12px_rgba(6,182,212,0.55)]" },
  cut:          { bg: "bg-rose-500",    text: "text-white", glow: "shadow-[0_0_12px_rgba(244,63,94,0.55)]" },
  freeLine:     { bg: "bg-emerald-500", text: "text-white", glow: "shadow-[0_0_12px_rgba(16,185,129,0.55)]" },
  freeLinePoint:{ bg: "bg-indigo-500",  text: "text-white", glow: "shadow-[0_0_12px_rgba(99,102,241,0.55)]" },
  angle:        { bg: "bg-amber-500",   text: "text-white", glow: "shadow-[0_0_12px_rgba(245,158,11,0.55)]" },
  circle:       { bg: "bg-violet-500",  text: "text-white", glow: "shadow-[0_0_12px_rgba(139,92,246,0.55)]" },
  hkaAuto:      { bg: "bg-purple-500",  text: "text-white", glow: "shadow-[0_0_12px_rgba(168,85,247,0.55)]" },
  guideBuilder: { bg: "bg-teal-500",    text: "text-white", glow: "shadow-[0_0_12px_rgba(20,184,166,0.55)]" },
  annotation:   { bg: "bg-orange-500",  text: "text-white", glow: "shadow-[0_0_12px_rgba(249,115,22,0.55)]" },
  imageProcess: { bg: "bg-sky-600",     text: "text-white", glow: "shadow-[0_0_12px_rgba(2,132,199,0.55)]" },
};

const IDLE_ICON_COLOR = {
  draw: "text-blue-400", pan: "text-cyan-400", cut: "text-rose-400",
  freeLine: "text-emerald-400", freeLinePoint: "text-indigo-400",
  angle: "text-amber-400", circle: "text-violet-400", hkaAuto: "text-purple-400",
  guideBuilder: "text-teal-400", annotation: "text-orange-400", imageProcess: "text-sky-500",
};

// ─── grouping ─────────────────────────────────────────────────────────────────

const GROUP_META = {
  "Move":     { label: "Navigasi",   color: "text-cyan-500" },
  "Drawing":  { label: "Pengukuran", color: "text-blue-500" },
  "Planning": { label: "Perencanaan",color: "text-purple-500" },
  "ZakVisor": { label: "ZakVisor",   color: "text-sky-600" },
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
  const [hovered, setHovered] = useState(false);
  const ToolIcon = getToolIcon(item);
  const accent   = TOOL_ACCENT[item.key] || TOOL_ACCENT.draw;
  const idleClr  = IDLE_ICON_COLOR[item.key] || "text-slate-400";

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl p-2 transition-all ${
        fullWidth ? "w-full flex-row gap-2.5 px-3 py-2.5 justify-start" : "aspect-square w-full"
      } ${
        isActive
          ? `${accent.bg} ${accent.accent} ${accent.glow} ${accent.text}`
          : "bg-white/60 border border-white/70 shadow-[2px_2px_5px_rgba(148,163,184,0.22),-1px_-1px_3px_rgba(255,255,255,0.9)] hover:bg-white/90"
      }`}
      aria-label={`${item.label}: ${item.desc}`}
      aria-pressed={isActive}
      variants={ITEM_V}
      {...TAP}
      layout
    >
      <span className={`flex shrink-0 items-center justify-center ${fullWidth ? "h-7 w-7 rounded-xl" : "h-6 w-6"} ${
        isActive ? "" : `rounded-xl bg-slate-50/80 shadow-inner ${idleClr}`
      }`}>
        <ToolIcon className={fullWidth ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
      <span className={`leading-none truncate ${
        fullWidth
          ? "text-[10px] font-bold"
          : "text-[8px] font-black"
      } ${isActive ? "" : "text-slate-600"}`}>
        {item.label}
      </span>
      {!fullWidth && <Tooltip label={item.label} desc={item.desc} visible={hovered} />}
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

  const isItemActive = (item) =>
    item.freeLineMode
      ? activeTool === "freeLine" && activeFreeLineMode === item.freeLineMode
      : activeTool === item.key;

  return (
    <motion.div
      className={`w-[min(84vw,196px)] rounded-[26px] border border-white/72 bg-[#eef2f7]/96 text-slate-800 shadow-[6px_6px_18px_rgba(148,163,184,0.3),-6px_-6px_18px_rgba(255,255,255,0.84)] backdrop-blur-xl ${className}`}
      variants={PANEL_V}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* ── Header ─── */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/40 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <AnimatePresence mode="wait">
            {activeItem ? (
              <motion.div
                key={activeItem.key}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${TOOL_ACCENT[activeItem.key]?.bg || "bg-slate-700"} ${TOOL_ACCENT[activeItem.key]?.glow || ""}`}
              >
                {(() => { const I = getToolIcon(activeItem); return <I className="h-3.5 w-3.5 text-white" />; })()}
              </motion.div>
            ) : (
              <motion.div key="idle" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-200">
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
                className="truncate text-[10px] font-black text-slate-800"
              >
                {activeItem?.label || "Pilih Tool"}
              </motion.p>
            </AnimatePresence>
            <p className="text-[8px] text-slate-400 truncate">{activeItem?.desc || "tap tool di bawah"}</p>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={onMinimize}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-400 text-white shadow-sm"
          title="Minimize"
          {...TAP}
          whileHover={{ scale: 1.12 }}
        >
          <Minus className="h-3 w-3" />
        </motion.button>
      </div>

      {/* ── Undo / Redo ─── */}
      <motion.div className="flex items-center gap-2 border-b border-slate-200/40 px-3.5 py-2" variants={GROUP_V}>
        <motion.button
          type="button" onClick={onUndo} disabled={!canUndo}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/70 bg-white/60 py-1.5 text-[9px] font-black text-slate-600 shadow-[2px_2px_4px_rgba(148,163,184,0.2),-1px_-1px_3px_rgba(255,255,255,0.9)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          title="Undo (Ctrl+Z)" {...TAP}
        >
          <Undo2 className="h-3 w-3" /> Undo
        </motion.button>
        <motion.button
          type="button" onClick={onRedo} disabled={!canRedo}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/70 bg-white/60 py-1.5 text-[9px] font-black text-slate-600 shadow-[2px_2px_4px_rgba(148,163,184,0.2),-1px_-1px_3px_rgba(255,255,255,0.9)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          title="Redo (Ctrl+Y)" {...TAP}
        >
          <Redo2 className="h-3 w-3" /> Redo
        </motion.button>
      </motion.div>

      {/* ── Tool groups ─── */}
      <div className="space-y-3 px-3 py-3">
        {groups.map((group) => {
          const meta = GROUP_META[group.key] || { label: group.key, color: "text-slate-400" };
          const isSingle = group.items.length === 1;
          return (
            <motion.div key={group.key} className="space-y-1.5" variants={GROUP_V}>
              <div className="flex items-center gap-1.5 px-0.5">
                <span className={`text-[7px] font-black uppercase tracking-widest ${meta.color}`}>
                  {meta.label}
                </span>
                <div className="h-px flex-1 bg-slate-200/60" />
              </div>
              {isSingle ? (
                <ToolBtn
                  item={group.items[0]}
                  isActive={isItemActive(group.items[0])}
                  onSelect={(item) => onSelectTool?.(item)}
                  fullWidth
                />
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {group.items.map((item) => (
                    <ToolBtn
                      key={item.key}
                      item={item}
                      isActive={isItemActive(item)}
                      onSelect={(item) => onSelectTool?.(item)}
                    />
                  ))}
                </div>
              )}
              {/* Cup Assessment button — injected after Planning group */}
              {group.key === "Planning" && onCupAssessment && (
                <motion.button
                  variants={ITEM_V}
                  type="button"
                  onClick={onCupAssessment}
                  {...TAP}
                  className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-[10px] font-black transition active:scale-[0.97] ${
                    cupAssessmentActive
                      ? "border-orange-300 bg-orange-500 text-white shadow-[0_3px_10px_rgba(249,115,22,0.4)]"
                      : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <ellipse cx="12" cy="12" rx="9" ry="5" strokeDasharray="3 1.5"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="12" y1="7" x2="12" y2="17"/>
                    <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
                  </svg>
                  Cup Assessment {cupAssessmentActive ? "● Aktif" : ""}
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
