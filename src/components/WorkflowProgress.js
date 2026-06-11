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

export default function WorkflowProgress({
  steps = [],
  onOpenSummary,
  className = "",
}) {
  const [open, setOpen] = useState(false);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = steps.length > 0 && doneCount === steps.length;
  const nextStepIndex = steps.findIndex((s) => !s.done);
  const nextStep = nextStepIndex !== -1 ? steps[nextStepIndex] : null;

  return (
    <div className={`pointer-events-none flex flex-col items-end gap-1.5 ${className}`}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="workflow-card"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="pointer-events-auto w-[228px] rounded-[22px] border border-white/75 bg-[#eef2f7]/97 p-3 shadow-[6px_6px_18px_rgba(148,163,184,0.28),-6px_-6px_18px_rgba(255,255,255,0.82)] backdrop-blur-xl"
          >
            {/* Header */}
            <div className="mb-3 flex items-center gap-2 px-0.5">
              <ListChecks className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Alur Kerja
                </div>
                <div className="text-[9px] font-semibold text-slate-500">
                  {allDone
                    ? "Semua langkah selesai ✅"
                    : `${doneCount} dari ${steps.length} selesai`}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1.5">
              {steps.map((step, i) => {
                const isNext = i === nextStepIndex;
                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-2 rounded-[14px] p-2 transition ${
                      step.done
                        ? "border border-emerald-100/70 bg-emerald-50/50"
                        : isNext
                          ? "border border-cyan-100/70 bg-cyan-50/50"
                          : "border border-white/50 bg-white/25 opacity-60"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : isNext ? (
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                    ) : (
                      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[10px] font-black leading-tight ${
                          step.done
                            ? "text-emerald-700"
                            : isNext
                              ? "text-cyan-700"
                              : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </div>
                      {step.description && (
                        <div className="mt-0.5 text-[8.5px] font-semibold leading-tight text-slate-400">
                          {step.description}
                        </div>
                      )}
                      {isNext && step.actionLabel && step.onAction && (
                        <button
                          type="button"
                          onClick={() => {
                            step.onAction();
                            setOpen(false);
                          }}
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

            {/* Bottom: hint or summary button */}
            {allDone ? (
              <button
                type="button"
                onClick={() => {
                  onOpenSummary?.();
                  setOpen(false);
                }}
                className="mt-2.5 w-full rounded-[14px] border border-emerald-200 bg-emerald-50 py-2 text-[9px] font-black text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98]"
              >
                Lihat Ringkasan Pre-Op →
              </button>
            ) : nextStep?.hint ? (
              <div className="mt-2.5 rounded-[14px] border border-amber-100/80 bg-amber-50/60 px-2.5 py-2">
                <div className="text-[8.5px] font-bold leading-snug text-amber-700">
                  💡 {nextStep.hint}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle pill */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/75 px-3 py-1.5 text-[10px] font-black shadow-[4px_4px_10px_rgba(148,163,184,0.26),-4px_-4px_10px_rgba(255,255,255,0.8)] transition active:scale-95 ${
          allDone
            ? "bg-emerald-100/90 text-emerald-700"
            : "bg-[#eef2f7]/95 text-slate-600"
        }`}
      >
        <ListChecks className="h-3.5 w-3.5 shrink-0" />
        <span>
          {doneCount}/{steps.length}
        </span>
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
