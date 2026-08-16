"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Atom,
  Bone,
  Circle,
  Compass,
  GitBranch,
  Grid,
  Layers,
  LensConcave,
  LineSquiggle,
  MessageSquare,
  Minus,
  Move,
  PenTool,
  Redo2,
  Ruler,
  Scissors,
  Settings2,
  Undo2,
  Waypoints,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function CupIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <ellipse cx="12" cy="12" rx="9" ry="5" strokeDasharray="3 1.5" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="7" x2="12" y2="17" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" />
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
  zakAceta: Atom,
  postTHA: Atom,
  preTka: Scissors,
  ruler: Ruler,
  tkaAssessment: Ruler,
  dorr: LensConcave,
  brush: PenTool,
};

const DOCK_GROUPS = [
  {
    key: "xfo",
    label: "XFO",
    icon: Move,
    tone: "text-cyan-500",
    match: (item) =>
      item.key === "pan" ||
      item.key === "cut" ||
      item.key === "freeLine" ||
      item.key === "freeLinePoint",
  },
  {
    key: "measure",
    label: "Measure",
    icon: Compass,
    tone: "text-blue-500",
    match: (item) =>
      ["draw", "angle", "circle"].includes(item.key),
  },
  {
    key: "planning",
    label: "Planning",
    icon: Bone,
    tone: "text-violet-500",
    match: (item) =>
      [
        "hka",
        "hkaAuto",
        "tkaAssessment",
        "normmedFemoralSizer",
        "guideBuilder",
        "cupAssessment",
        "zakAceta",
        "postTHA",
        "preTka",
        "dorr",
      ].includes(item.key),
  },
  {
    key: "edit",
    label: "Annotate",
    icon: MessageSquare,
    tone: "text-pink-500",
    match: (item) => item.key === "annotation" || item.key === "brush",
  },
  {
    key: "zakvisor",
    label: "X-Ray",
    icon: Zap,
    tone: "text-sky-500",
    match: (item) => item.key === "imageProcess",
  },
];

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getToolIcon(item) {
  if (item.freeLineMode === "point") return Waypoints;
  return TOOL_ICON_MAP[item.icon] || TOOL_ICON_MAP[item.key] || Layers;
}

function getToolTone(item) {
  if (item.key === "pan") return "text-cyan-500";
  if (["draw", "angle", "circle"].includes(item.key) || item.freeLineMode)
    return "text-blue-500";
  if (item.key === "annotation") return "text-pink-500";
  if (item.key === "imageProcess") return "text-sky-500";
  if (item.key === "brush") return "text-violet-500";
  if (item.key === "dorr") return "text-indigo-500";
  if (item.key === "preTka") return "text-sky-500";
  if (item.key === "zakAceta" || item.key === "postTHA") return "text-rose-500";
  return "text-violet-500";
}

function getPlanningSectionKey(item) {
  if (item.planningGroup === "knee" || item.planningGroup === "hip") {
    return item.planningGroup;
  }
  if (
    [
      "hka",
      "hkaAuto",
      "tkaAssessment",
      "normmedFemoralSizer",
      "preTka",
      "guideBuilder",
    ].includes(item.key)
  ) {
    return "knee";
  }
  if (["cupAssessment", "zakAceta", "postTHA", "dorr"].includes(item.key)) {
    return "hip";
  }
  return "other";
}

function getFlyoutSections(group) {
  if (!group) return [];
  if (group.key !== "planning") {
    return [{ key: group.key, label: null, items: group.items }];
  }

  return [
    { key: "knee", label: "Knee", items: group.items.filter((item) => getPlanningSectionKey(item) === "knee") },
    { key: "hip", label: "Hip", items: group.items.filter((item) => getPlanningSectionKey(item) === "hip") },
    { key: "other", label: "Other", items: group.items.filter((item) => getPlanningSectionKey(item) === "other") },
  ].filter((section) => section.items.length > 0);
}

function Tooltip({ label, visible }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, x: 5, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 4, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-none absolute right-full top-1/2 z-50 mr-9 -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/70 bg-slate-900/94 px-2.5 py-1.5 text-[10px] font-black text-white shadow-lg backdrop-blur"
        >
          {label}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function PanelActions({
  className = "",
  style,
  tools = [],
  activeTool = "pan",
  activeFreeLineMode = "freehand",
  onSelectTool,
  onMinimize,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  cupAssessmentActive = false,
  zakAcetaActive = false,
  dorrActive = false,
  preTkaActive = false,
}) {
  const [openGroup, setOpenGroup] = useState(null);
  const [flyoutAnchor, setFlyoutAnchor] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [portalReady, setPortalReady] = useState(false);

  const groupedTools = useMemo(
    () =>
      DOCK_GROUPS.map((group) => ({
        ...group,
        items: tools.filter(group.match),
      })).filter((group) => group.items.length > 0),
    [tools],
  );

  const isItemActive = (item) => {
    if (item.key === "cupAssessment") return cupAssessmentActive;
    if (item.key === "zakAceta" || item.key === "postTHA") return zakAcetaActive;
    if (item.key === "dorr") return dorrActive;
    if (item.key === "preTka") return preTkaActive;
    return item.freeLineMode
      ? activeTool === "freeLine" && activeFreeLineMode === item.freeLineMode
      : activeTool === item.key;
  };

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!openGroup) return undefined;

    const closeFlyout = () => {
      setOpenGroup(null);
      setFlyoutAnchor(null);
    };

    window.addEventListener("resize", closeFlyout);
    window.addEventListener("orientationchange", closeFlyout);
    window.addEventListener("scroll", closeFlyout, true);

    return () => {
      window.removeEventListener("resize", closeFlyout);
      window.removeEventListener("orientationchange", closeFlyout);
      window.removeEventListener("scroll", closeFlyout, true);
    };
  }, [openGroup]);

  const activeFlyoutGroup = groupedTools.find((group) => group.key === openGroup);
  const activeFlyoutSections = useMemo(
    () => getFlyoutSections(activeFlyoutGroup),
    [activeFlyoutGroup],
  );

  const flyoutStyle = (() => {
    if (!activeFlyoutGroup || !flyoutAnchor || typeof window === "undefined") {
      return undefined;
    }

    const flyoutWidth = 184;
    const rows = Math.ceil(activeFlyoutGroup.items.length / 2);
    const estimatedHeight = Math.min(window.innerHeight * 0.7, 42 + rows * 58);
    const anchorCenterX = (flyoutAnchor.left + flyoutAnchor.right) / 2;
    const spaceBelow = window.innerHeight - flyoutAnchor.bottom;
    const shouldOpenAbove =
      spaceBelow < estimatedHeight + 18 ||
      flyoutAnchor.top > window.innerHeight * 0.62;

    const rawLeft = anchorCenterX - flyoutWidth / 2;
    const rawTop = shouldOpenAbove
      ? flyoutAnchor.top - estimatedHeight - 10
      : flyoutAnchor.bottom + 10;

    return {
      left: clampNumber(rawLeft, 8, window.innerWidth - flyoutWidth - 8),
      top: clampNumber(rawTop, 8, window.innerHeight - estimatedHeight - 8),
      width: flyoutWidth,
      maxHeight: "min(70vh, 360px)",
      transformOrigin: shouldOpenAbove ? "50% 100%" : "50% 0%",
    };
  })();

  const handleGroupClick = (group, event) => {
    if (group.items.length === 1) {
      onSelectTool?.(group.items[0]);
      setOpenGroup(null);
      setFlyoutAnchor(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setOpenGroup((current) => {
      const next = current === group.key ? null : group.key;
      setFlyoutAnchor(
        next
          ? {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
            }
          : null,
      );
      return next;
    });
  };

  return (
    <>
      <motion.div
        data-panel-actions-root
        className={`relative flex w-[58px] flex-col items-center gap-1.5 rounded-[20px] border border-[var(--soft-border)] [background:var(--soft-float-bg)] p-1.5 text-[var(--soft-text)] shadow-[var(--soft-shadow-surface)] backdrop-blur-xl ${className}`}
        style={style}
        initial={{ opacity: 0, x: 20, scale: 0.94 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 18, scale: 0.94 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
      >
        {groupedTools.map((group) => {
          const GroupIcon = group.icon;
          const active = group.items.some(isItemActive);
          const open = openGroup === group.key;

          return (
            <div key={group.key} className="relative">
              <motion.button
                type="button"
                onClick={(event) => handleGroupClick(group, event)}
                onMouseEnter={() => setHoveredKey(group.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  active || open
                    ? "border-slate-800 bg-slate-900 text-white shadow-[inset_1px_1px_3px_rgba(0,0,0,0.28)]"
                    : "border-white/70 bg-[#eef2f7]/86 shadow-[1px_1px_4px_rgba(148,163,184,0.20),-1px_-1px_4px_rgba(255,255,255,0.78)]"
                }`}
                whileTap={{ scale: 0.92 }}
                aria-label={group.label}
                title={group.label}
              >
                <GroupIcon
                  className={`h-4.5 w-4.5 ${active || open ? "text-white" : group.tone}`}
                />
                <Tooltip label={group.label} visible={hoveredKey === group.key && !open} />
              </motion.button>
            </div>
          );
        })}

        <div className="my-0.5 h-px w-8 bg-slate-300/60" />

        {[
          {
            key: "undo",
            label: "Undo",
            icon: Undo2,
            onClick: onUndo,
            disabled: !canUndo,
          },
          {
            key: "redo",
            label: "Redo",
            icon: Redo2,
            onClick: onRedo,
            disabled: !canRedo,
          },
          {
            key: "minimize",
            label: "Minimize",
            icon: Minus,
            onClick: onMinimize,
            disabled: false,
          },
        ].map((item) => {
          const Icon = item.icon || Settings2;
          return (
            <div key={item.key} className="relative">
              <motion.button
                type="button"
                onClick={item.onClick}
                disabled={item.disabled}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-[#eef2f7]/78 text-slate-500 shadow-[1px_1px_4px_rgba(148,163,184,0.18),-1px_-1px_4px_rgba(255,255,255,0.76)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                whileTap={{ scale: 0.92 }}
                aria-label={item.label}
                title={item.label}
              >
                <Icon className="h-3.5 w-3.5" />
                <Tooltip label={item.label} visible={hoveredKey === item.key} />
              </motion.button>
            </div>
          );
        })}
      </motion.div>

      {portalReady && typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {activeFlyoutGroup && flyoutStyle ? (
                <motion.div
                  key={`${activeFlyoutGroup.key}-flyout`}
                  data-panel-actions-flyout
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="fixed z-[90] overflow-y-auto rounded-[18px] border border-white/75 bg-[#eef2f7]/96 p-2 text-slate-800 shadow-[4px_4px_14px_rgba(148,163,184,0.28),-4px_-4px_14px_rgba(255,255,255,0.84)] backdrop-blur-xl"
                  style={flyoutStyle}
                >
                  <div className="mb-1.5 px-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {activeFlyoutGroup.label}
                  </div>
                  <div className="space-y-2">
                    {activeFlyoutSections.map((section) => (
                      <div key={section.key} className="space-y-1.5">
                        {section.label ? (
                          <div className="px-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
                            {section.label}
                          </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-1.5">
                          {section.items.map((item) => {
                            const ToolIcon = getToolIcon(item);
                            const itemActive = isItemActive(item);
                            return (
                              <motion.button
                                key={`${item.key}-${item.freeLineMode || "tool"}`}
                                type="button"
                                onClick={() => {
                                  if (item.disabled) return;
                                  onSelectTool?.(item);
                                  setOpenGroup(null);
                                  setFlyoutAnchor(null);
                                }}
                                disabled={item.disabled}
                                className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center transition ${
                                  itemActive
                                    ? "border-slate-800 bg-slate-900 text-white"
                                    : "border-white/70 bg-white/38 text-slate-700 hover:bg-white/70"
                                } disabled:cursor-not-allowed disabled:opacity-35`}
                                whileTap={{ scale: 0.95 }}
                                title={item.desc || item.label}
                              >
                                <ToolIcon
                                  className={`h-4 w-4 ${itemActive ? "text-white" : getToolTone(item)}`}
                                />
                                <span className="max-w-[64px] truncate text-[9px] font-black">
                                  {item.label}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
