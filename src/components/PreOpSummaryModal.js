"use client";

import { motion } from "framer-motion";
import { X, CheckCircle2, Circle, FileText, Download } from "lucide-react";

const HKA_MODE_LABELS = { full: "HKA", fta: "FTA", jla: "JLA" };

function Section({ title, children, empty }) {
  return (
    <div className="rounded-[18px] border border-white/65 bg-white/30 p-3">
      <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
        {title}
      </div>
      {empty ? (
        <div className="py-2 text-center text-[10px] font-bold text-slate-400">
          {empty}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default function PreOpSummaryModal({
  open,
  onClose,
  onExportPng,
  onExportPdf,
  workflowSteps = [],
  hkaSets = [],
  lines = [],
  cutLayers = [],
  getHkaMeasurement,
  getMeasurement,
}) {
  if (!open) return null;

  const doneCount = workflowSteps.filter((s) => s.done).length;
  const implantLayers = cutLayers.filter(
    (l) => l.autoScaleFromCalibration || (l.kind === "image" && l.name),
  );

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[3px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="flex w-full max-w-[min(100%,480px)] flex-col rounded-[28px] border border-white/75 bg-[#eef2f7]/97 shadow-[8px_8px_24px_rgba(148,163,184,0.32),-8px_-8px_24px_rgba(255,255,255,0.85)] backdrop-blur-xl"
        style={{ maxHeight: "min(90dvh, 640px)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100/60 px-5 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Pre-Operative
            </div>
            <div className="text-base font-black text-slate-800">
              Ringkasan Perencanaan
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-[#eef2f7] text-slate-500 shadow-[2px_2px_5px_rgba(148,163,184,0.26),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
          {/* Checklist */}
          {workflowSteps.length > 0 && (
            <Section title="Checklist">
              <div className="grid grid-cols-2 gap-1.5">
                {workflowSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 ${
                      step.done
                        ? "border border-emerald-100/60 bg-emerald-50/60"
                        : "border border-white/50 bg-white/30"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    )}
                    <span
                      className={`text-[10px] font-black ${
                        step.done ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right text-[9px] font-bold text-slate-400">
                {doneCount}/{workflowSteps.length} selesai
              </div>
            </Section>
          )}

          {/* HKA */}
          <Section
            title="Pengukuran HKA"
            empty={hkaSets.length === 0 ? "Belum ada pengukuran HKA" : null}
          >
            {hkaSets.length > 0 && (
              <div className="space-y-1.5">
                {hkaSets.map((hka) => {
                  const measurement = getHkaMeasurement?.(hka);
                  const isLeft = hka.side === "left" || hka.side === "l";
                  const modeLabel = HKA_MODE_LABELS[hka.mode] || "HKA";
                  const displayName =
                    hka.name || `${isLeft ? "Kiri" : "Kanan"} #${hka.id}`;
                  return (
                    <div
                      key={hka.id}
                      className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/30 px-2.5 py-2"
                    >
                      <div className="flex h-6 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-200/60 bg-violet-100/60 text-[8px] font-black text-violet-700">
                        {modeLabel}
                      </div>
                      <div className="min-w-0 flex-1 truncate text-[10px] font-black text-slate-800">
                        {displayName}
                      </div>
                      <div className="shrink-0 text-[9px] font-bold text-slate-600">
                        {measurement ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Lines */}
          <Section
            title="Pengukuran Line"
            empty={lines.length === 0 ? "Belum ada pengukuran line" : null}
          >
            {lines.length > 0 && (
              <div className="space-y-1.5">
                {lines.map((line) => {
                  const measurement = getMeasurement?.(line);
                  const displayName = line.name || `Line #${line.id}`;
                  return (
                    <div
                      key={line.id}
                      className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/30 px-2.5 py-2"
                    >
                      <div
                        className="h-4 w-4 shrink-0 rounded-md border border-white/60"
                        style={{ backgroundColor: line.color || "#64748b" }}
                      />
                      <div className="min-w-0 flex-1 truncate text-[10px] font-black text-slate-800">
                        {displayName}
                      </div>
                      <div className="shrink-0 text-[9px] font-bold text-slate-600">
                        {measurement ?? (
                          <span className="text-slate-400">belum dikalibrasi</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Implants */}
          <Section
            title="Template Implant"
            empty={
              implantLayers.length === 0
                ? "Belum ada implant diterapkan"
                : null
            }
          >
            {implantLayers.length > 0 && (
              <div className="space-y-1.5">
                {implantLayers.map((layer) => (
                  <div
                    key={layer.id}
                    className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/30 px-2.5 py-2"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-100/60 text-[10px] text-emerald-600">
                      ✓
                    </div>
                    <div className="min-w-0 flex-1 truncate text-[10px] font-black text-slate-800">
                      {layer.name || `Layer #${layer.id}`}
                    </div>
                    {layer.autoScaleFromCalibration && (
                      <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[7px] font-black text-emerald-600">
                        AUTO-SCALED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[9px] font-semibold text-slate-400">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">Merangkum semua pengukuran aktif.</span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="flex items-center gap-1 rounded-xl border border-white/70 bg-[#eef2f7] px-3 py-1.5 text-[9px] font-black text-slate-600 shadow-[2px_2px_5px_rgba(148,163,184,0.22),-2px_-2px_5px_rgba(255,255,255,0.8)] transition active:scale-95"
                >
                  <Download className="h-3 w-3" />
                  PDF
                </button>
              )}
              {onExportPng && (
                <button
                  type="button"
                  onClick={() => { onClose?.(); onExportPng(); }}
                  className="flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-1.5 text-[9px] font-black text-white shadow-[0_2px_8px_rgba(6,182,212,0.3)] transition hover:bg-cyan-500 active:scale-95"
                >
                  <Download className="h-3 w-3" />
                  PNG
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
