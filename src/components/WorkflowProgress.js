"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  ListChecks,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function WorkflowProgress({
  steps = [],
  onOpenSummary,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const { isDark } = useTheme();

  const doneCount     = steps.filter((s) => s.done).length;
  const allDone       = steps.length > 0 && doneCount === steps.length;
  const nextStepIndex = steps.findIndex((s) => !s.done);
  const nextStep      = nextStepIndex !== -1 ? steps[nextStepIndex] : null;

  /* ── palette ── */
  const card = isDark
    ? { bg: "#1a2438", border: "rgba(255,255,255,0.10)", shadow: "0 8px 24px rgba(0,5,20,0.60), 0 1px 4px rgba(50,75,130,0.18)" }
    : { bg: "rgba(238,242,247,0.97)", border: "rgba(255,255,255,0.75)", shadow: "6px 6px 18px rgba(148,163,184,0.28),-6px -6px 18px rgba(255,255,255,0.82)" };

  const pill = isDark
    ? { bg: allDone ? "rgba(5,150,105,0.25)" : "#1e2840", border: "rgba(255,255,255,0.10)", text: allDone ? "#34d399" : "#94a3b8", shadow: "4px 4px 10px rgba(0,5,20,0.55),-2px -2px 6px rgba(50,75,130,0.20)" }
    : { bg: allDone ? "rgba(209,250,229,0.90)" : "rgba(238,242,247,0.95)", border: "rgba(255,255,255,0.75)", text: allDone ? "#065f46" : "#475569", shadow: "4px 4px 10px rgba(148,163,184,0.26),-4px -4px 10px rgba(255,255,255,0.8)" };

  const stepStyle = (step, i) => {
    const isNext = i === nextStepIndex;
    if (step.done) return isDark
      ? { bg: "rgba(5,150,105,0.15)", border: "rgba(52,211,153,0.22)", text: "#34d399", sub: "#5eead4" }
      : { bg: "rgba(209,250,229,0.50)", border: "rgba(167,243,208,0.70)", text: "#065f46", sub: "#6b7280" };
    if (isNext) return isDark
      ? { bg: "rgba(6,182,212,0.12)", border: "rgba(34,211,238,0.22)", text: "#22d3ee", sub: "#94a3b8" }
      : { bg: "rgba(207,250,254,0.50)", border: "rgba(165,243,252,0.70)", text: "#0e7490", sub: "#6b7280" };
    return isDark
      ? { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)", text: "#475569", sub: "#334155" }
      : { bg: "rgba(255,255,255,0.25)", border: "rgba(255,255,255,0.50)", text: "#94a3b8", sub: "#9ca3af" };
  };

  return (
    <div className={`pointer-events-none flex flex-col items-end gap-1.5 ${className}`}>
      {/* ── Expanded card ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="workflow-card"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="pointer-events-auto w-[240px] rounded-[22px] p-3.5 backdrop-blur-xl"
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              boxShadow: card.shadow,
            }}
          >
            {/* Header */}
            <div className="mb-3 flex items-center gap-2 px-0.5">
              <ListChecks className="h-4 w-4 shrink-0 text-cyan-500" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
                  Alur Kerja
                </div>
                <div className="text-[9px] font-semibold" style={{ color: isDark ? "#94a3b8" : "#6b7280" }}>
                  {allDone ? "Semua langkah selesai ✅" : `${doneCount} dari ${steps.length} selesai`}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1.5">
              {steps.map((step, i) => {
                const isNext = i === nextStepIndex;
                const s = stepStyle(step, i);
                return (
                  <div
                    key={step.id}
                    className="flex items-start gap-2 rounded-[14px] p-2 transition"
                    style={{
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      opacity: !step.done && !isNext ? 0.55 : 1,
                    }}
                  >
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : isNext ? (
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                    ) : (
                      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: s.text }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black leading-tight" style={{ color: s.text }}>
                        {step.label}
                      </div>
                      {step.description && (
                        <div className="mt-0.5 text-[8.5px] font-semibold leading-tight" style={{ color: s.sub }}>
                          {step.description}
                        </div>
                      )}
                      {isNext && step.actionLabel && step.onAction && (
                        <button
                          type="button"
                          onClick={() => { step.onAction(); setOpen(false); }}
                          className="mt-1.5 rounded-lg bg-cyan-600 px-2.5 py-1 text-[8px] font-black text-white shadow-[0_2px_6px_rgba(6,182,212,0.28)] transition hover:bg-cyan-500 active:scale-95"
                        >
                          {step.actionLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {allDone ? (
              <button
                type="button"
                onClick={() => { onOpenSummary?.(); setOpen(false); }}
                className="mt-2.5 w-full rounded-[14px] py-2 text-[9px] font-black transition active:scale-[0.98]"
                style={{
                  background: isDark ? "rgba(5,150,105,0.20)" : "rgba(209,250,229,1)",
                  border: `1px solid ${isDark ? "rgba(52,211,153,0.28)" : "#a7f3d0"}`,
                  color: isDark ? "#34d399" : "#065f46",
                }}
              >
                Lihat Ringkasan Pre-Op →
              </button>
            ) : nextStep?.hint ? (
              <div
                className="mt-2.5 rounded-[14px] px-2.5 py-2"
                style={{
                  background: isDark ? "rgba(180,83,9,0.12)" : "rgba(254,243,199,0.60)",
                  border: `1px solid ${isDark ? "rgba(251,191,36,0.20)" : "rgba(253,230,138,0.80)"}`,
                }}
              >
                <div className="text-[8.5px] font-bold leading-snug" style={{ color: isDark ? "#fbbf24" : "#92400e" }}>
                  💡 {nextStep.hint}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle pill ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black transition active:scale-95"
        style={{
          background: pill.bg,
          border: `1px solid ${pill.border}`,
          color: pill.text,
          boxShadow: pill.shadow,
        }}
      >
        <ListChecks className="h-3.5 w-3.5 shrink-0" />
        <span>{doneCount}/{steps.length}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
    </div>
  );
}
