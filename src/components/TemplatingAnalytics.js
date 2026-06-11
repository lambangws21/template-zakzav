"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, BarChart2, Lock, Eye, EyeOff, Loader2,
  FileDown, CheckCircle2, AlertCircle, TrendingUp,
  RefreshCw,
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

// ─── Stats computation ─────────────────────────────────────────────────────────

function computeStats(cases) {
  const withData = cases.filter(
    (c) => c.preOpSizeNum != null && c.actualSizeNum != null,
  );
  if (withData.length === 0) return null;
  const exact = withData.filter((c) => Math.abs(c.actualSizeNum - c.preOpSizeNum) < 0.25).length;
  const within1 = withData.filter((c) => Math.abs(c.actualSizeNum - c.preOpSizeNum) <= 1.25).length;
  const diffs = withData.map((c) => c.actualSizeNum - c.preOpSizeNum);
  const meanDev = diffs.reduce((s, d) => s + Math.abs(d), 0) / diffs.length;
  const tooLarge = diffs.filter((d) => d > 0.25).length;
  const tooSmall = diffs.filter((d) => d < -0.25).length;
  return {
    n: withData.length,
    exactPct: (exact / withData.length) * 100,
    within1Pct: (within1 / withData.length) * 100,
    meanDev,
    tooLarge,
    tooSmall,
  };
}

function groupByProcedure(cases) {
  const map = {};
  cases
    .filter((c) => c.preOpSizeNum != null && c.actualSizeNum != null)
    .forEach((c) => {
      const key = (c.procedure || "Lainnya").split("(")[0].trim().slice(0, 20);
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
  return Object.entries(map)
    .map(([procedure, items]) => {
      const exact = items.filter((c) => Math.abs(c.actualSizeNum - c.preOpSizeNum) < 0.25).length;
      const within1 = items.filter((c) => Math.abs(c.actualSizeNum - c.preOpSizeNum) <= 1.25).length;
      return {
        procedure,
        n: items.length,
        exactPct: (exact / items.length) * 100,
        within1Pct: (within1 / items.length) * 100,
      };
    })
    .sort((a, b) => b.n - a.n);
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function ProcedureChart({ groups }) {
  if (!groups.length) return null;
  const ROW_H = 36;
  const LABEL_W = 88;
  const BAR_MAX = 140;
  const height = groups.length * ROW_H + 28;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${LABEL_W + BAR_MAX + 60} ${height}`}
      style={{ overflow: "visible" }}
    >
      {groups.map((g, i) => {
        const y = i * ROW_H + 4;
        const bwExact = (g.exactPct / 100) * BAR_MAX;
        const bwExtra = ((g.within1Pct - g.exactPct) / 100) * BAR_MAX;
        return (
          <g key={g.procedure}>
            <text x={LABEL_W - 5} y={y + 14} textAnchor="end" fontSize={8.5} fill="#64748b">
              {g.procedure}
            </text>
            <rect x={LABEL_W} y={y + 2} width={Math.max(bwExact, 2)} height={16} rx={3} fill="#22c55e" />
            {bwExtra > 0 && (
              <rect x={LABEL_W + bwExact} y={y + 2} width={bwExtra} height={16} rx={3} fill="#86efac" />
            )}
            <text x={LABEL_W + bwExact + bwExtra + 5} y={y + 14} fontSize={8.5} fill="#1e293b">
              {g.exactPct.toFixed(0)}%
              <tspan fill="#64748b" fontSize={7.5}> ({g.n})</tspan>
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={LABEL_W} y={height - 14} width={9} height={9} rx={2} fill="#22c55e" />
      <text x={LABEL_W + 12} y={height - 6} fontSize={7.5} fill="#64748b">Exact</text>
      <rect x={LABEL_W + 48} y={height - 14} width={9} height={9} rx={2} fill="#86efac" />
      <text x={LABEL_W + 60} y={height - 6} fontSize={7.5} fill="#64748b">Within ±1</text>
    </svg>
  );
}

// ─── PDF Export ────────────────────────────────────────────────────────────────

async function exportPdf(cases, stats, byProcedure) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const NAVY = [15, 23, 42];
  const GREEN = [22, 163, 74];
  const now = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  // ── Cover header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Analisis Akurasi Templating Ortopedi", 15, 17);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Dicetak: ${now}`, 15, 26);
  doc.text(`Total kasus dengan data lengkap: ${stats?.n ?? 0}`, 15, 32);

  // ── Summary stats box
  let cur = 48;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, cur, W - 30, 36, 4, 4, "F");
  doc.setTextColor(...NAVY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Ringkasan Statistik Akurasi", 22, cur + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (stats) {
    doc.text(`Exact match: ${stats.exactPct.toFixed(1)}%`, 22, cur + 20);
    doc.text(`Within ±1 size: ${stats.within1Pct.toFixed(1)}%`, 22, cur + 27);
    doc.text(`Rata-rata deviasi: ${stats.meanDev.toFixed(2)} size`, 90, cur + 20);
    doc.text(`Over-estimated: ${stats.tooLarge} kasus`, 90, cur + 27);
    doc.text(`Under-estimated: ${stats.tooSmall} kasus`, 90, cur + 34);
  } else {
    doc.text("Belum ada data akurasi lengkap.", 22, cur + 20);
  }
  cur += 46;

  // ── Per procedure bar chart (drawn with rects)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Akurasi per Prosedur", 15, cur);
  cur += 7;
  const BAR_MAX_MM = 80;
  byProcedure.forEach((g) => {
    const bwExact = (g.exactPct / 100) * BAR_MAX_MM;
    const bwExtra = ((g.within1Pct - g.exactPct) / 100) * BAR_MAX_MM;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(g.procedure.slice(0, 22), 15, cur + 4.5);
    doc.setFillColor(...GREEN);
    doc.roundedRect(70, cur, Math.max(bwExact, 0.5), 6, 1, 1, "F");
    if (bwExtra > 0) {
      doc.setFillColor(134, 239, 172);
      doc.roundedRect(70 + bwExact, cur, bwExtra, 6, 1, 1, "F");
    }
    doc.setTextColor(...NAVY);
    doc.setFontSize(7.5);
    doc.text(`${g.exactPct.toFixed(0)}% (n=${g.n})`, 70 + bwExact + bwExtra + 2, cur + 4.5);
    cur += 10;
    if (cur > 260) { doc.addPage(); cur = 20; }
  });
  cur += 4;

  // ── Case table
  if (cur > 240) { doc.addPage(); cur = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Data Kasus", 15, cur);
  cur += 6;

  const COL = [15, 50, 90, 125, 155, 175];
  const HDRS = ["Pasien", "Prosedur", "Pre-Op (label)", "Actual", "Δ Size", "Tgl Op"];
  doc.setFillColor(...NAVY);
  doc.rect(15, cur, W - 30, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  HDRS.forEach((h, i) => doc.text(h, COL[i] + 1, cur + 5));
  cur += 7;

  const withData = cases.filter((c) => c.actualSizeNum != null);
  withData.forEach((c, idx) => {
    if (cur > 270) { doc.addPage(); cur = 20; }
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, 250, 252);
    doc.rect(15, cur, W - 30, 7, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const diff = c.preOpSizeNum != null && c.actualSizeNum != null
      ? (c.actualSizeNum - c.preOpSizeNum).toFixed(1)
      : "—";
    const diffNum = parseFloat(diff);
    if (!isNaN(diffNum)) {
      doc.setTextColor(diffNum === 0 ? 22 : diffNum > 0 ? 200 : 220, diffNum === 0 ? 163 : 50, diffNum === 0 ? 74 : 50);
    }
    const row = [
      (c.patientName || "—").slice(0, 14),
      (c.procedure || "—").slice(0, 16),
      (c.implantLabel || "—").slice(0, 18),
      (c.actualImplantLabel || `Size ${c.actualSizeNum}`).slice(0, 16),
      isNaN(diffNum) ? "—" : (diffNum > 0 ? `+${diff}` : diff),
      c.operationDate || "—",
    ];
    row.forEach((val, i) => doc.text(String(val), COL[i] + 1, cur + 5));
    cur += 7;
  });

  if (withData.length === 0) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text("Belum ada kasus dengan data post-op lengkap.", 15, cur + 5);
  }

  // ── Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, 287, W, 10, "F");
    doc.setTextColor(150, 150, 180);
    doc.setFontSize(7);
    doc.text("Analisis Akurasi Templating Ortopedi — Zakzav Templating App", 15, 293);
    doc.text(`Hal ${p} / ${totalPages}`, W - 25, 293);
  }

  doc.save(`analisis-akurasi-templating-${Date.now()}.pdf`);
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
    setLoading(true);
    setError("");
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
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
        <Lock className="h-7 w-7 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-800">Area Admin</p>
        <p className="mt-1 text-[10px] text-slate-500">
          Analitik akurasi templating hanya dapat diakses oleh admin
        </p>
      </div>
      <div className="relative w-full max-w-[240px]">
        <input
          type={showPin ? "text" : "password"}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Masukkan kode akses"
          autoFocus
          className="w-full rounded-2xl border border-slate-200 bg-white/80 py-2.5 pl-4 pr-10 text-center text-sm text-slate-800 tracking-widest outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPin((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        >
          {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-600">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !pin.trim()}
        className="flex items-center gap-2 rounded-2xl bg-slate-800 px-8 py-2.5 text-xs font-black text-white disabled:opacity-50"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Masuk
      </button>
    </form>
  );
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────

function Dashboard({ onClose }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchAllCases();
      setCases(items);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = computeStats(cases);
  const byProcedure = groupByProcedure(cases);
  const withPostOp = cases.filter((c) => c.actualSizeNum != null);
  const withoutPostOp = cases.filter((c) => c.actualSizeNum == null);

  const handleExport = async () => {
    if (!stats && withPostOp.length === 0) return;
    setExporting(true);
    try {
      await exportPdf(cases, stats, byProcedure);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-xs">Memuat data dari Google Sheets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-5 py-5">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {cases.length} total kasus · {withPostOp.length} data lengkap
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || withPostOp.length === 0}
            className="flex h-8 items-center gap-1.5 rounded-full bg-slate-800 px-3 text-[10px] font-black text-white disabled:opacity-40"
          >
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> :
             exportDone ? <CheckCircle2 className="h-3 w-3 text-green-400" /> :
             <FileDown className="h-3 w-3" />}
            {exportDone ? "Tersimpan!" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {stats ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Exact match", value: `${stats.exactPct.toFixed(1)}%`, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Within ±1", value: `${stats.within1Pct.toFixed(1)}%`, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Mean Δ size", value: stats.meanDev.toFixed(2), color: "text-slate-700", bg: "bg-white border-slate-200" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border px-3 py-3 text-center ${s.bg}`}>
              <p className={`text-lg font-black leading-none ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-[8px] font-bold text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-xs font-black text-slate-400">Belum ada data akurasi</p>
          <p className="mt-1 text-[9px] text-slate-400">
            Input data post-op (ukuran actual) pada kasus pasien untuk melihat statistik
          </p>
        </div>
      )}

      {/* Over/under */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center">
            <p className="text-base font-black text-amber-700">{stats.tooLarge}</p>
            <p className="text-[8px] text-amber-600">Over-estimated</p>
            <p className="text-[7px] text-amber-500">actual lebih besar</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-center">
            <p className="text-base font-black text-rose-700">{stats.tooSmall}</p>
            <p className="text-[8px] text-rose-600">Under-estimated</p>
            <p className="text-[7px] text-rose-500">actual lebih kecil</p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      {byProcedure.length > 0 && (
        <div>
          <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Akurasi per Prosedur
          </p>
          <ProcedureChart groups={byProcedure} />
        </div>
      )}

      {/* Cases table */}
      {withPostOp.length > 0 && (
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Detail Kasus ({withPostOp.length} data lengkap)
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[480px] text-[10px]">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {["Pasien", "Prosedur", "Pre-Op", "Actual", "Δ", "Tgl Op"].map((h) => (
                    <th key={h} className="px-2.5 py-2 text-left text-[8px] font-black">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withPostOp.map((c, i) => {
                  const diff = c.preOpSizeNum != null && c.actualSizeNum != null
                    ? c.actualSizeNum - c.preOpSizeNum
                    : null;
                  const diffLabel = diff == null ? "—" : diff === 0 ? "✅ 0" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`;
                  const diffColor = diff == null ? "" : diff === 0 ? "text-emerald-600 font-black" : Math.abs(diff) <= 1 ? "text-amber-600" : "text-red-600";
                  return (
                    <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-2.5 py-2 font-bold">{(c.patientName || "—").slice(0, 14)}</td>
                      <td className="px-2.5 py-2 text-slate-600">{(c.procedure || "—").split("(")[0].trim().slice(0, 16)}</td>
                      <td className="px-2.5 py-2 text-slate-600">{c.preOpSizeNum != null ? c.preOpSizeNum : (c.implantLabel || "—").slice(0, 12)}</td>
                      <td className="px-2.5 py-2">{c.actualSizeNum ?? (c.actualImplantLabel || "—").slice(0, 12)}</td>
                      <td className={`px-2.5 py-2 ${diffColor}`}>{diffLabel}</td>
                      <td className="px-2.5 py-2 text-slate-500">{c.operationDate || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending post-op */}
      {withoutPostOp.length > 0 && (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-3">
          <p className="text-[9px] font-black text-amber-700">
            {withoutPostOp.length} kasus belum ada data post-op
          </p>
          <p className="mt-0.5 text-[8px] text-amber-600">
            Input data post-op pada masing-masing kasus untuk melengkapi analitik
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TemplatingAnalytics({ isOpen, onClose }) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored === "1") setAuthenticated(true);
        else setAuthenticated(false);
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
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/40 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="max-h-[94dvh] w-full max-w-[min(100%,620px)] overflow-hidden rounded-t-[28px] rounded-b-[28px] border border-white/60 bg-[#f1f5f9] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px]"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-[#0f172a] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-600">
                <BarChart2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Analisis Akurasi Templating</p>
                <p className="text-[10px] text-slate-400">
                  {authenticated ? "Admin — data akurasi pre-op vs post-op" : "Diperlukan kode akses admin"}
                </p>
              </div>
              {authenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-7 items-center gap-1 rounded-full bg-white/10 px-2.5 text-[9px] font-bold text-slate-300 hover:bg-white/20"
                >
                  <Lock className="h-3 w-3" /> Keluar
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(94dvh-76px)] overflow-y-auto">
              <AnimatePresence mode="wait">
                {authenticated ? (
                  <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
