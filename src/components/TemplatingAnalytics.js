"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, BarChart2, Lock, Eye, EyeOff, Loader2,
  FileDown, CheckCircle2, AlertCircle, TrendingUp,
  RefreshCw, ChevronDown, ChevronUp, Activity,
} from "lucide-react";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT || "";
const SESSION_KEY = "zakzav_analytics_auth_v1";

// ─── API ───────────────────────────────────────────────────────────────────────

async function verifyPin(code) {
  const res = await fetch("/api/ceklist-admin-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const json = await res.json();
  return json?.authorized === true;
}

async function fetchAllCases() {
  if (!APPS_SCRIPT_URL) return [];
  const url = `/api/google-sheet-images?url=${encodeURIComponent(APPS_SCRIPT_URL)}&action=list_patient_cases`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!json?.ok || !json?.remote?.ok) return [];
  return Array.isArray(json.remote.items) ? json.remote.items : [];
}

// ─── Data parsing ──────────────────────────────────────────────────────────────

// Parse "Head: 40 mm · Stem: 4 · Cup: 54 mm" → { head: 40, stem: 4, cup: 54 }
function parseComponents(label) {
  if (!label) return {};
  const result = {};
  label.split("·").map(s => s.trim()).filter(Boolean).forEach(part => {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) return;
    const key = part.slice(0, colonIdx).trim().toLowerCase().replace(/[\s/]+/g, "_");
    const valStr = part.slice(colonIdx + 1).trim();
    const num = parseFloat(valStr);
    if (!isNaN(num)) result[key] = num;
  });
  return result;
}

function labelKey(key) {
  const MAP = {
    cup: "Cup", head: "Head", stem: "Stem", acetabulum: "Native Acetabulum",
    bipolar_head: "Bipolar Head", femur: "Femur", tibia: "Tibia",
    patella: "Patella", insert: "Insert",
  };
  return MAP[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Stats computation ─────────────────────────────────────────────────────────

function computeStats(cases) {
  const withData = cases.filter(c => c.preOpSizeNum != null && c.actualSizeNum != null);
  if (!withData.length) return null;
  const diffs = withData.map(c => c.actualSizeNum - c.preOpSizeNum);
  const exact = diffs.filter(d => Math.abs(d) < 0.25).length;
  const within1 = diffs.filter(d => Math.abs(d) <= 1.25).length;
  return {
    n: withData.length,
    exactPct: (exact / withData.length) * 100,
    within1Pct: (within1 / withData.length) * 100,
    meanDev: diffs.reduce((s, d) => s + Math.abs(d), 0) / diffs.length,
    tooLarge: diffs.filter(d => d > 0.25).length,
    tooSmall: diffs.filter(d => d < -0.25).length,
  };
}

function groupByProcedure(cases) {
  const map = {};
  cases.filter(c => c.preOpSizeNum != null && c.actualSizeNum != null).forEach(c => {
    const key = (c.procedure || "Lainnya").split("(")[0].trim().slice(0, 22);
    if (!map[key]) map[key] = [];
    map[key].push(c);
  });
  return Object.entries(map).map(([procedure, items]) => {
    const exact = items.filter(c => Math.abs(c.actualSizeNum - c.preOpSizeNum) < 0.25).length;
    const within1 = items.filter(c => Math.abs(c.actualSizeNum - c.preOpSizeNum) <= 1.25).length;
    return { procedure, n: items.length, exactPct: (exact / items.length) * 100, within1Pct: (within1 / items.length) * 100 };
  }).sort((a, b) => b.n - a.n);
}

function computeComponentStats(cases) {
  const map = {};
  cases.forEach(c => {
    if (!c.implantLabel || !c.actualImplantLabel) return;
    const pre = parseComponents(c.implantLabel);
    const act = parseComponents(c.actualImplantLabel);
    Object.keys(pre).forEach(key => {
      if (act[key] == null) return;
      if (!map[key]) map[key] = { n: 0, exact: 0, within1: 0, sumAbsDiff: 0, over: 0, under: 0 };
      const diff = act[key] - pre[key];
      map[key].n++;
      if (Math.abs(diff) < 0.25) map[key].exact++;
      if (Math.abs(diff) <= 1.25) map[key].within1++;
      map[key].sumAbsDiff += Math.abs(diff);
      if (diff > 0.25) map[key].over++;
      if (diff < -0.25) map[key].under++;
    });
  });
  return Object.entries(map)
    .filter(([, v]) => v.n >= 1)
    .map(([key, v]) => ({
      key,
      label: labelKey(key),
      n: v.n,
      exactPct: (v.exact / v.n) * 100,
      within1Pct: (v.within1 / v.n) * 100,
      meanDev: v.sumAbsDiff / v.n,
      over: v.over,
      under: v.under,
    }))
    .sort((a, b) => b.n - a.n);
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function AccBadge({ pct }) {
  const cls = pct >= 85 ? "bg-emerald-500/15 text-emerald-400" :
              pct >= 65 ? "bg-amber-500/15 text-amber-400" :
                          "bg-red-500/15 text-red-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black tabular-nums ${cls}`}>
      {pct.toFixed(0)}%
    </span>
  );
}

function DiffBadge({ diff }) {
  if (diff == null) return <span className="text-[var(--soft-text)] opacity-40">—</span>;
  const cls = Math.abs(diff) < 0.25 ? "bg-emerald-500/15 text-emerald-400" :
              Math.abs(diff) <= 1.25 ? "bg-amber-500/15 text-amber-400" :
                                        "bg-red-500/15 text-red-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black tabular-nums ${cls}`}>
      {diff === 0 ? "✓ Exact" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`}
    </span>
  );
}

// ─── Summary tab ───────────────────────────────────────────────────────────────

function SummaryTab({ cases }) {
  const stats = computeStats(cases);
  const byProcedure = groupByProcedure(cases);
  const byComponent = computeComponentStats(cases);
  const withPostOp = cases.filter(c => c.actualSizeNum != null);

  return (
    <div className="space-y-4 px-4 py-4">

      {/* Overall stats */}
      {stats ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Exact match", value: `${stats.exactPct.toFixed(1)}%`, cls: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "Within ±1", value: `${stats.within1Pct.toFixed(1)}%`, cls: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
              { label: "Mean Δ", value: stats.meanDev.toFixed(2), cls: "[color:var(--soft-text)]", bg: "bg-[var(--soft-inset-bg)] border-[var(--soft-border)]" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border px-2 py-3 text-center ${s.bg}`}>
                <p className={`text-base font-black leading-none tabular-nums ${s.cls}`}>{s.value}</p>
                <p className="mt-1.5 text-[8px] font-bold [color:var(--soft-text)] opacity-60">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-center">
              <p className="text-base font-black text-amber-400 tabular-nums">{stats.tooLarge}</p>
              <p className="text-[8px] font-bold text-amber-500">Over-estimated</p>
              <p className="text-[7px] [color:var(--soft-text)] opacity-50">actual lebih besar</p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-2.5 text-center">
              <p className="text-base font-black text-rose-400 tabular-nums">{stats.tooSmall}</p>
              <p className="text-[8px] font-bold text-rose-500">Under-estimated</p>
              <p className="text-[7px] [color:var(--soft-text)] opacity-50">actual lebih kecil</p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--soft-border)] px-4 py-8 text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 [color:var(--soft-text)] opacity-20" />
          <p className="text-xs font-black [color:var(--soft-text)] opacity-50">Belum ada data akurasi</p>
          <p className="mt-1 text-[9px] [color:var(--soft-text)] opacity-40">
            Input data post-op pada kasus pasien untuk melihat statistik
          </p>
        </div>
      )}

      {/* Per-component accuracy */}
      {byComponent.length > 0 && (
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest [color:var(--soft-text)] opacity-50">
            Akurasi per Komponen
          </p>
          <div className="rounded-2xl border border-[var(--soft-border)] overflow-hidden">
            {byComponent.map((comp, i) => (
              <div
                key={comp.key}
                className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--soft-border)]" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black [color:var(--soft-text)]">{comp.label}</span>
                    <span className="text-[8px] [color:var(--soft-text)] opacity-40">n={comp.n}</span>
                  </div>
                  {/* Mini bar */}
                  <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-[var(--soft-inset-bg)]">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${comp.exactPct}%` }} />
                    <div className="h-full bg-emerald-500/30" style={{ width: `${comp.within1Pct - comp.exactPct}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <AccBadge pct={comp.exactPct} />
                  <p className="text-[7px] [color:var(--soft-text)] opacity-40">Δ̄ {comp.meanDev.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[7px] [color:var(--soft-text)] opacity-40">
            Bar = exact (gelap) + within ±1 (terang)
          </p>
        </div>
      )}

      {/* Per-procedure */}
      {byProcedure.length > 0 && (
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest [color:var(--soft-text)] opacity-50">
            Akurasi per Prosedur
          </p>
          <div className="rounded-2xl border border-[var(--soft-border)] overflow-hidden">
            {byProcedure.map((g, i) => (
              <div
                key={g.procedure}
                className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--soft-border)]" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[10px] font-bold [color:var(--soft-text)]">{g.procedure}</span>
                    <span className="text-[8px] [color:var(--soft-text)] opacity-40">n={g.n}</span>
                  </div>
                  <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-[var(--soft-inset-bg)]">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${g.exactPct}%` }} />
                    <div className="h-full bg-sky-500/30" style={{ width: `${g.within1Pct - g.exactPct}%` }} />
                  </div>
                </div>
                <AccBadge pct={g.exactPct} />
              </div>
            ))}
          </div>
        </div>
      )}

      {withPostOp.length === 0 && (
        <p className="text-center text-[9px] [color:var(--soft-text)] opacity-40">
          {cases.length} kasus tersimpan — belum ada data post-op
        </p>
      )}
    </div>
  );
}

// ─── Cases tab ────────────────────────────────────────────────────────────────

function CaseCard({ c }) {
  const [expanded, setExpanded] = useState(false);
  const pre = parseComponents(c.implantLabel);
  const act = parseComponents(c.actualImplantLabel);
  const preKeys = Object.keys(pre);
  const sharedKeys = preKeys.filter(k => act[k] != null);
  const hasPostOp = Boolean(c.actualImplantLabel || c.actualSizeNum != null);
  const hasPreOpDetail = preKeys.length > 0;
  const canExpand = hasPreOpDetail;

  const primaryDiff = c.preOpSizeNum != null && c.actualSizeNum != null
    ? c.actualSizeNum - c.preOpSizeNum : null;

  return (
    <div className="rounded-2xl border border-[var(--soft-border)] overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => canExpand && setExpanded(v => !v)}
        className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors ${canExpand ? "hover:bg-[var(--soft-inset-bg)]" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black [color:var(--soft-text)]">{c.patientName || "—"}</p>
          <p className="truncate text-[9px] [color:var(--soft-text)] opacity-50">
            {(c.procedure || "—").split("(")[0].trim()}
            {c.operationDate ? ` · ${c.operationDate}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasPostOp
            ? <DiffBadge diff={primaryDiff} />
            : <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[8px] font-bold [color:var(--soft-text)] opacity-40">Pre-Op</span>
          }
          {canExpand && (
            expanded
              ? <ChevronUp className="h-3.5 w-3.5 [color:var(--soft-text)] opacity-40" />
              : <ChevronDown className="h-3.5 w-3.5 [color:var(--soft-text)] opacity-40" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && canExpand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--soft-border)]">
              {/* Column headers */}
              <div className="flex items-center gap-2 bg-[var(--soft-inset-bg)] px-3.5 py-1.5">
                <span className="w-[110px] shrink-0 text-[8px] font-black uppercase tracking-wider [color:var(--soft-text)] opacity-40">Komponen</span>
                <span className="flex-1 text-[8px] font-black uppercase tracking-wider text-sky-400 opacity-70">Pre-Op</span>
                {hasPostOp && (
                  <>
                    <span className="text-[8px] opacity-0">→</span>
                    <span className="flex-1 text-[8px] font-black uppercase tracking-wider text-emerald-400 opacity-70">Actual</span>
                    <span className="w-10 text-right text-[8px] font-black uppercase tracking-wider [color:var(--soft-text)] opacity-40">Δ</span>
                  </>
                )}
              </div>

              <div className="divide-y divide-[var(--soft-border)]">
                {preKeys.map(key => {
                  const actVal = act[key];
                  const diff = actVal != null ? actVal - pre[key] : null;
                  const diffCls = diff == null ? "" :
                                  Math.abs(diff) < 0.25 ? "text-emerald-400" :
                                  Math.abs(diff) <= 1.25 ? "text-amber-400" : "text-red-400";
                  return (
                    <div key={key} className="flex items-center gap-2 px-3.5 py-2">
                      <span className="w-[110px] shrink-0 text-[9px] [color:var(--soft-text)] opacity-60">{labelKey(key)}</span>
                      <span className="flex-1 text-[10px] font-bold text-sky-400 tabular-nums">{pre[key]}</span>
                      {hasPostOp && (
                        <>
                          <span className="text-[9px] [color:var(--soft-text)] opacity-25">→</span>
                          {actVal != null ? (
                            <span className={`flex-1 text-[10px] font-black tabular-nums ${diffCls}`}>{actVal}</span>
                          ) : (
                            <span className="flex-1 text-[9px] [color:var(--soft-text)] opacity-30">—</span>
                          )}
                          <div className="w-10 text-right">
                            {diff == null ? null : diff === 0
                              ? <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-400" />
                              : <span className={`text-[8px] tabular-nums ${diffCls}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}</span>
                            }
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Fallback: raw label string if no structured keys */}
                {preKeys.length === 0 && c.implantLabel && (
                  <div className="px-3.5 py-2.5 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-sky-400 opacity-70 w-14">Pre-Op</span>
                      <span className="text-[9px] [color:var(--soft-text)]">{c.implantLabel}</span>
                    </div>
                    {c.actualImplantLabel && (
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-emerald-400 opacity-70 w-14">Actual</span>
                        <span className="text-[9px] [color:var(--soft-text)]">{c.actualImplantLabel}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CasesTab({ cases }) {
  const sorted = [...cases].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  const withPostOp = sorted.filter(c => c.actualSizeNum != null || c.actualImplantLabel);
  const preOpOnly = sorted.filter(c => c.actualSizeNum == null && !c.actualImplantLabel && c.implantLabel);
  const noData = sorted.filter(c => !c.actualSizeNum && !c.actualImplantLabel && !c.implantLabel);

  return (
    <div className="space-y-5 px-4 py-4">
      {/* Kasus dengan post-op */}
      {withPostOp.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest [color:var(--soft-text)] opacity-50">
            ✅ {withPostOp.length} kasus lengkap (pre + post-op)
          </p>
          {withPostOp.map(c => <CaseCard key={c.id} c={c} />)}
        </div>
      )}

      {/* Kasus pre-op saja */}
      {preOpOnly.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest [color:var(--soft-text)] opacity-50">
            📋 {preOpOnly.length} kasus pre-op (belum ada data post-op)
          </p>
          {preOpOnly.map(c => <CaseCard key={c.id} c={c} />)}
        </div>
      )}

      {/* Kasus tanpa data */}
      {noData.length > 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--soft-border)] px-4 py-3">
          <p className="text-[9px] [color:var(--soft-text)] opacity-50">
            {noData.length} kasus tanpa data rencana komponen
          </p>
        </div>
      )}

      {sorted.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--soft-border)] px-4 py-8 text-center">
          <Activity className="mx-auto mb-2 h-8 w-8 [color:var(--soft-text)] opacity-20" />
          <p className="text-xs font-black [color:var(--soft-text)] opacity-50">Belum ada kasus</p>
        </div>
      )}
    </div>
  );
}

// ─── PDF Export ────────────────────────────────────────────────────────────────

async function exportPdf(cases, stats, byProcedure, byComponent) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const NAVY = [15, 23, 42];
  const now = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("Analisis Akurasi Templating Ortopedi", 15, 17);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Dicetak: ${now}`, 15, 26);
  doc.text(`Total kasus data lengkap: ${stats?.n ?? 0}`, 15, 32);

  let cur = 48;
  if (stats) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, cur, W - 30, 28, 4, 4, "F");
    doc.setTextColor(...NAVY); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Ringkasan Statistik", 22, cur + 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Exact match: ${stats.exactPct.toFixed(1)}%`, 22, cur + 20);
    doc.text(`Within ±1: ${stats.within1Pct.toFixed(1)}%`, 70, cur + 20);
    doc.text(`Rata-rata deviasi: ${stats.meanDev.toFixed(2)} size`, 120, cur + 20);
    cur += 38;
  }

  // Per component
  if (byComponent.length > 0) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text("Akurasi per Komponen", 15, cur); cur += 7;
    byComponent.forEach(comp => {
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
      doc.text(`${comp.label} (n=${comp.n})`, 15, cur + 4);
      doc.setFillColor(22, 163, 74);
      doc.roundedRect(80, cur, (comp.exactPct / 100) * 70, 5, 1, 1, "F");
      doc.setFillColor(134, 239, 172);
      doc.roundedRect(80 + (comp.exactPct / 100) * 70, cur, ((comp.within1Pct - comp.exactPct) / 100) * 70, 5, 1, 1, "F");
      doc.setTextColor(...NAVY); doc.setFontSize(7.5);
      doc.text(`${comp.exactPct.toFixed(0)}% exact · Δ̄ ${comp.meanDev.toFixed(2)}`, 155, cur + 4);
      cur += 8;
      if (cur > 265) { doc.addPage(); cur = 20; }
    });
    cur += 4;
  }

  // Per procedure
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
  doc.text("Akurasi per Prosedur", 15, cur); cur += 7;
  byProcedure.forEach(g => {
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
    doc.text(g.procedure.slice(0, 22), 15, cur + 4);
    doc.setFillColor(14, 165, 233);
    doc.roundedRect(80, cur, (g.exactPct / 100) * 70, 5, 1, 1, "F");
    doc.setTextColor(...NAVY); doc.setFontSize(7.5);
    doc.text(`${g.exactPct.toFixed(0)}% (n=${g.n})`, 155, cur + 4);
    cur += 8;
    if (cur > 265) { doc.addPage(); cur = 20; }
  });
  cur += 4;

  // Case table
  if (cur > 240) { doc.addPage(); cur = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
  doc.text("Data Kasus", 15, cur); cur += 6;
  const COL = [15, 52, 92, 125, 158, 178];
  const HDRS = ["Pasien", "Prosedur", "Pre-Op", "Actual", "Δ", "Tgl Op"];
  doc.setFillColor(...NAVY);
  doc.rect(15, cur, W - 30, 7, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7.5);
  HDRS.forEach((h, i) => doc.text(h, COL[i] + 1, cur + 5));
  cur += 7;

  const withData = cases.filter(c => c.actualSizeNum != null || c.actualImplantLabel);
  withData.forEach((c, idx) => {
    if (cur > 270) { doc.addPage(); cur = 20; }
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, 250, 252);
    doc.rect(15, cur, W - 30, 7, "F");
    const diff = c.preOpSizeNum != null && c.actualSizeNum != null ? c.actualSizeNum - c.preOpSizeNum : null;
    const diffStr = diff == null ? "—" : (diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`);
    doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    [
      (c.patientName || "—").slice(0, 14),
      (c.procedure || "—").split("(")[0].trim().slice(0, 16),
      (c.implantLabel || String(c.preOpSizeNum ?? "—")).slice(0, 18),
      (c.actualImplantLabel || String(c.actualSizeNum ?? "—")).slice(0, 16),
      diffStr,
      c.operationDate || "—",
    ].forEach((val, i) => doc.text(val, COL[i] + 1, cur + 5));
    cur += 7;
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, 287, W, 10, "F");
    doc.setTextColor(150, 150, 180); doc.setFontSize(7);
    doc.text("Analisis Akurasi Templating Ortopedi — Zakzav", 15, 293);
    doc.text(`Hal ${p} / ${totalPages}`, W - 25, 293);
  }

  doc.save(`analisis-akurasi-${Date.now()}.pdf`);
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

function PinGate({ onAuth }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true); setError("");
    try {
      const ok = await verifyPin(pin.trim());
      if (ok) {
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        onAuth();
      } else {
        setError("Kode akses salah.");
      }
    } catch {
      setError("Gagal memverifikasi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5 px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--soft-inset-bg)]">
        <Lock className="h-7 w-7 [color:var(--soft-text)] opacity-60" />
      </div>
      <div>
        <p className="text-sm font-black [color:var(--soft-text)]">Area Admin</p>
        <p className="mt-1 text-[10px] [color:var(--soft-text)] opacity-50">
          Analitik akurasi hanya dapat diakses oleh admin
        </p>
      </div>
      <div className="relative w-full max-w-[240px]">
        <input
          type={showPin ? "text" : "password"}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Kode akses"
          autoFocus
          className="w-full rounded-2xl border border-[var(--soft-border)] bg-[var(--soft-inset-bg)] py-2.5 pl-4 pr-10 text-center text-sm [color:var(--soft-text)] tracking-widest outline-none transition focus:ring-2 focus:ring-cyan-500/25"
        />
        <button type="button" tabIndex={-1} onClick={() => setShowPin(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 [color:var(--soft-text)] opacity-50">
          {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
      )}
      <button type="submit" disabled={loading || !pin.trim()}
        className="flex items-center gap-2 rounded-2xl bg-[var(--soft-inset-bg)] border border-[var(--soft-border)] px-8 py-2.5 text-xs font-black [color:var(--soft-text)] disabled:opacity-50">
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Masuk
      </button>
    </form>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onClose }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [tab, setTab] = useState("summary");

  const load = useCallback(async () => {
    setLoading(true);
    try { setCases(await fetchAllCases()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = computeStats(cases);
  const byProcedure = groupByProcedure(cases);
  const byComponent = computeComponentStats(cases);
  const withPostOp = cases.filter(c => c.actualSizeNum != null || c.actualImplantLabel);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPdf(cases, stats, byProcedure, byComponent);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 [color:var(--soft-text)] opacity-40">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-xs">Memuat data...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-between border-b border-[var(--soft-border)] px-4 py-2.5">
        <p className="text-[9px] font-black uppercase tracking-widest [color:var(--soft-text)] opacity-50">
          {cases.length} kasus · {withPostOp.length} lengkap
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={load}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--soft-inset-bg)] [color:var(--soft-text)] hover:opacity-80"
            title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleExport}
            disabled={exporting || withPostOp.length === 0}
            className="flex h-7 items-center gap-1.5 rounded-full bg-[var(--soft-inset-bg)] border border-[var(--soft-border)] px-3 text-[9px] font-black [color:var(--soft-text)] disabled:opacity-40">
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> :
             exportDone ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> :
             <FileDown className="h-3 w-3" />}
            {exportDone ? "Tersimpan!" : "PDF"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--soft-border)] px-4 pt-2 pb-0">
        {[
          { id: "summary", label: "Ringkasan" },
          { id: "cases", label: `Kasus (${withPostOp.length})` },
        ].map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`rounded-t-xl px-3 py-2 text-[10px] font-black transition-colors ${
              tab === t.id
                ? "border border-b-0 border-[var(--soft-border)] bg-[var(--soft-raised-bg)] [color:var(--soft-text)]"
                : "[color:var(--soft-text)] opacity-50 hover:opacity-80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === "summary" ? (
          <motion.div key="summary" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SummaryTab cases={cases} />
          </motion.div>
        ) : (
          <motion.div key="cases" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CasesTab cases={cases} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TemplatingAnalytics({ isOpen, onClose }) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        setAuthenticated(sessionStorage.getItem(SESSION_KEY) === "1");
      } catch {
        setAuthenticated(false);
      }
    }
  }, [isOpen]);

  const handleLogout = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setAuthenticated(false);
  };

  if (typeof document === "undefined") return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/50 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="max-h-[94dvh] w-full max-w-[min(100%,600px)] overflow-hidden rounded-t-[28px] rounded-b-[28px] border border-[var(--soft-border)] [background:var(--soft-raised-bg)] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px]"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* Drag pill mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[var(--soft-border)]" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 bg-[#0f172a] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-600">
                <BarChart2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Analisis Akurasi Templating</p>
                <p className="text-[9px] text-slate-400">
                  {authenticated ? "Pre-op vs Post-op · per komponen" : "Diperlukan kode akses admin"}
                </p>
              </div>
              {authenticated && (
                <button type="button" onClick={handleLogout}
                  className="flex h-7 items-center gap-1 rounded-full bg-white/10 px-2.5 text-[9px] font-bold text-slate-300 hover:bg-white/20">
                  <Lock className="h-3 w-3" /> Keluar
                </button>
              )}
              <button type="button" onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(94dvh-90px)] overflow-y-auto">
              <AnimatePresence mode="wait">
                {authenticated ? (
                  <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Dashboard onClose={onClose} />
                  </motion.div>
                ) : (
                  <motion.div key="pin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <PinGate onAuth={() => setAuthenticated(true)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
