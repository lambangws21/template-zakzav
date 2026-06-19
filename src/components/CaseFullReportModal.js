"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Download, Loader2, CheckCircle2 } from "lucide-react";

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function generateFullPDF(caseData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const M = 14;
  const CW = W - M * 2;
  let y = 0;

  const NAVY  = [15, 23, 42];
  const BLUE  = [37, 99, 235];
  const GREEN = [22, 163, 74];
  const AMBER = [217, 119, 6];
  const RED   = [220, 38, 38];
  const LIGHT = [241, 245, 249];
  const MID   = [100, 116, 139];

  const fill  = (rgb) => doc.setFillColor(...rgb);
  const text  = (rgb) => doc.setTextColor(...rgb);
  const draw  = (rgb) => doc.setDrawColor(...rgb);
  const font  = (size, style = "normal") => { doc.setFontSize(size); doc.setFont("helvetica", style); };
  const bump  = (n = 0) => { y += n; };
  const need  = (h) => { if (y + h > 277) { doc.addPage(); y = M; } };

  // ── HEADER ─────────────────────────────────────────────────────────────────
  fill(NAVY); doc.rect(0, 0, W, 32, "F");
  fill(BLUE); doc.rect(0, 0, 4, 32, "F");

  text([255, 255, 255]); font(15, "bold");
  doc.text("Laporan Kasus Pasien", M + 2, 13);
  text([148, 163, 184]); font(8);
  doc.text("Pre-Op Planning · Post-Op Outcome · Analisis Akurasi", M + 2, 20);
  const today = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Dicetak: ${today}`, M + 2, 26);

  y = 40;

  // ── PATIENT INFO ───────────────────────────────────────────────────────────
  fill(LIGHT); doc.roundedRect(M, y, CW, 26, 3, 3, "F");
  text(NAVY); font(10, "bold");
  doc.text("Informasi Pasien", M + 4, y + 7);
  font(8.5, "normal");
  const infoRows = [
    ["Nama Pasien", caseData.patientName || "—"],
    ["Prosedur",   caseData.procedure    || "—"],
    ["Catatan",    caseData.notes        || "—"],
  ];
  let infoY = y + 13;
  infoRows.forEach(([label, val]) => {
    text(MID);  doc.text(label + ":", M + 4, infoY);
    text(NAVY); doc.text(String(val).slice(0, 70), M + 34, infoY);
    infoY += 5;
  });
  bump(34);

  // ── PRE-OP PLANNING ────────────────────────────────────────────────────────
  need(38);
  fill(BLUE); doc.rect(M, y, 3, 30, "F");
  text(BLUE); font(10, "bold");
  doc.text("Pre-Op Planning", M + 7, y + 7);
  font(8.5, "normal"); text(NAVY);

  const preRows = [
    ["Rencana Komponen", caseData.implantLabel || "—"],
    ["Ukuran Primer",   caseData.preOpSizeNum != null ? String(caseData.preOpSizeNum) : "—"],
    ["Tanggal Templating", caseData.savedAt ? new Date(caseData.savedAt).toLocaleDateString("id-ID") : "—"],
  ];
  let preY = y + 13;
  preRows.forEach(([label, val]) => {
    text(MID);  doc.text(label + ":", M + 7, preY);
    text(NAVY); doc.text(String(val).slice(0, 65), M + 46, preY);
    preY += 5;
  });
  bump(36);

  // ── POST-OP OUTCOME ────────────────────────────────────────────────────────
  const hasPostOp = Boolean(caseData.actualImplantLabel || caseData.actualSizeNum != null);
  need(40);
  fill(hasPostOp ? GREEN : [203, 213, 225]);
  doc.rect(M, y, 3, hasPostOp ? 34 : 22, "F");
  text(hasPostOp ? GREEN : MID); font(10, "bold");
  doc.text("Post-Op Outcome", M + 7, y + 7);
  font(8.5, "normal");

  if (hasPostOp) {
    const postRows = [
      ["Komponen Aktual",  caseData.actualImplantLabel || "—"],
      ["Ukuran Aktual",    caseData.actualSizeNum != null ? String(caseData.actualSizeNum) : "—"],
      ["Tanggal Operasi",  caseData.operationDate || "—"],
      ["HKA Post-Op",      caseData.postOpHka != null ? `${caseData.postOpHka}°` : "—"],
      ["Catatan Post-Op",  caseData.postOpNotes || "—"],
    ];
    let postY = y + 13;
    postRows.forEach(([label, val]) => {
      text(MID);   doc.text(label + ":", M + 7, postY);
      text(NAVY);  doc.text(String(val).slice(0, 65), M + 46, postY);
      postY += 5;
    });
    bump(42);
  } else {
    text(MID); font(8.5); doc.text("Data post-op belum dimasukkan.", M + 7, y + 14);
    bump(28);
  }

  // ── AKURASI COMPARISON ────────────────────────────────────────────────────
  if (hasPostOp && caseData.preOpSizeNum != null && caseData.actualSizeNum != null) {
    need(32);
    const diff = caseData.actualSizeNum - caseData.preOpSizeNum;
    const absDiff = Math.abs(diff);
    const accColor = absDiff < 0.25 ? GREEN : absDiff <= 1.25 ? AMBER : RED;
    const accLabel = absDiff < 0.25 ? "Exact Match ✓" : absDiff <= 1.25 ? `Within ±1 (Δ ${diff > 0 ? "+" : ""}${diff.toFixed(1)})` : `Di luar ±1 (Δ ${diff > 0 ? "+" : ""}${diff.toFixed(1)})`;

    fill(LIGHT); doc.roundedRect(M, y, CW, 24, 3, 3, "F");
    fill(accColor); doc.roundedRect(M, y, 3, 24, 3, 3, "F");
    text(accColor); font(9, "bold");
    doc.text("Akurasi Templating", M + 7, y + 7);
    font(8.5, "normal");
    text(NAVY); doc.text(`Pre-Op: ${caseData.preOpSizeNum}  →  Actual: ${caseData.actualSizeNum}`, M + 7, y + 14);
    text(accColor); doc.text(accLabel, M + 90, y + 14);
    bump(30);
  }

  // ── X-RAY SNAPSHOT ────────────────────────────────────────────────────────
  const snapshotSrc = caseData.snapshotUrl || caseData.snapshot || null;
  if (snapshotSrc && snapshotSrc.startsWith("data:")) {
    need(70);
    text(MID); font(8, "bold");
    doc.text("X-Ray Snapshot (Pre-Op)", M, y);
    bump(4);
    try {
      const fmt = snapshotSrc.startsWith("data:image/jpeg") || snapshotSrc.startsWith("data:image/jpg") ? "JPEG" : "PNG";
      doc.addImage(snapshotSrc, fmt, M, y, CW, 60, undefined, "MEDIUM");
      bump(64);
    } catch { bump(4); }
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    fill(NAVY); doc.rect(0, 286, W, 11, "F");
    text([148, 163, 184]); font(7);
    doc.text("Laporan Kasus Pasien — Zakzav Orthopaedic Templating", M, 292);
    doc.text(`Hal ${p} / ${totalPages}`, W - M - 10, 292);
  }

  const filename = `laporan-${(caseData.patientName || "kasus").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;
  doc.save(filename);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function CaseFullReportModal({ isOpen, onClose, caseData }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (typeof document === "undefined") return null;
  if (!caseData) return null;

  const hasPostOp = Boolean(caseData.actualImplantLabel || caseData.actualSizeNum != null);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await generateFullPDF(caseData);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9995] flex items-end justify-center bg-black/60 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="w-full max-w-[420px] overflow-hidden rounded-[24px] bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-[#0f172a] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-600">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Laporan Kasus</p>
                <p className="truncate text-[9px] text-slate-400">{caseData.patientName || "—"}</p>
              </div>
              <button type="button" onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content preview */}
            <div className="space-y-3 px-5 py-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Isi Laporan PDF</p>
                {[
                  "Informasi pasien & prosedur",
                  "Pre-op planning (rencana komponen & ukuran)",
                  hasPostOp ? "Post-op outcome (komponen aktual, tanggal operasi, HKA)" : "Post-op: belum ada data",
                  hasPostOp ? "Analisis akurasi (Δ pre-op vs actual)" : null,
                  "X-ray snapshot (jika tersedia)",
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className={`h-3 w-3 shrink-0 ${item.startsWith("Post-op: belum") ? "text-slate-300" : "text-emerald-500"}`} />
                    <span className={`text-[10px] ${item.startsWith("Post-op: belum") ? "text-slate-400" : "text-slate-600"}`}>{item}</span>
                  </div>
                ))}
              </div>

              {!hasPostOp && (
                <p className="text-[9px] text-amber-600 text-center">
                  Laporan lebih lengkap setelah data post-op dimasukkan
                </p>
              )}

              <button
                type="button"
                onClick={handleDownload}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3 text-sm font-black text-white hover:bg-sky-500 disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Membuat PDF...</>
                ) : done ? (
                  <><CheckCircle2 className="h-4 w-4" /> Tersimpan!</>
                ) : (
                  <><Download className="h-4 w-4" /> Download Laporan PDF</>
                )}
              </button>

              <button type="button" onClick={onClose}
                className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-50">
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
