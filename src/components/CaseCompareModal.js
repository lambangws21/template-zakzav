"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, CheckCircle2, ArrowRight } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseComponents(label) {
  if (!label) return {};
  const result = {};
  label.split("·").map(s => s.trim()).filter(Boolean).forEach(part => {
    const idx = part.indexOf(":");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim().replace(/\s*(mm|size)$/i, "").trim();
    if (val !== "") result[key] = val;
  });
  return result;
}

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function snapshotSrc(url) {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  return `/api/google-drive-image?src=${encodeURIComponent(url)}`;
}

function DeltaBadge({ pre, act }) {
  if (pre == null || act == null) return <span className="text-slate-400 text-[9px]">—</span>;
  const p = parseFloat(pre);
  const a = parseFloat(act);
  if (isNaN(p) || isNaN(a)) return <span className="text-slate-400 text-[9px]">—</span>;
  const diff = a - p;
  const abs = Math.abs(diff);
  const cls = abs < 0.25 ? "text-emerald-600 bg-emerald-50" :
              abs <= 1.25 ? "text-amber-600 bg-amber-50" :
                            "text-red-600 bg-red-50";
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${cls}`}>
      {diff === 0 ? "✓" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`}
    </span>
  );
}

// ─── Case Column ──────────────────────────────────────────────────────────────

function CaseColumn({ c, label, color }) {
  if (!c) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center">
        <span className="text-[9px] text-slate-400">Pilih kasus untuk dibandingkan</span>
      </div>
    );
  }

  const preComps  = parseComponents(c.implantLabel);
  const actComps  = parseComponents(c.actualImplantLabel);
  const allKeys   = Array.from(new Set([...Object.keys(preComps), ...Object.keys(actComps)]));
  const hasPostOp = Boolean(c.actualImplantLabel || c.actualSizeNum != null);
  const imgSrc    = snapshotSrc(c.snapshot || c.snapshotUrl);

  const BORDER = color === "blue" ? "border-blue-200" : "border-violet-200";
  const HEAD   = color === "blue" ? "bg-blue-600" : "bg-violet-600";

  return (
    <div className={`flex flex-1 flex-col overflow-hidden rounded-2xl border-2 ${BORDER}`}>
      {/* Header */}
      <div className={`${HEAD} px-3 py-2.5`}>
        <p className="text-[9px] font-black uppercase tracking-widest text-white/60">{label}</p>
        <p className="truncate text-xs font-black text-white">{c.patientName || "Tanpa Nama"}</p>
        <p className="truncate text-[9px] text-white/70">{(c.procedure || "").split("(")[0].trim()}</p>
      </div>

      {/* X-ray thumbnail */}
      {imgSrc && (
        <div className="h-28 overflow-hidden bg-slate-900">
          <img src={imgSrc} alt="X-Ray" className="h-full w-full object-cover opacity-80" />
        </div>
      )}

      {/* Details */}
      <div className="flex-1 space-y-3 p-3">
        {/* Dates */}
        <div className="space-y-1">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tanggal</p>
          <div className="grid grid-cols-2 gap-1 text-[9px]">
            <div>
              <span className="text-slate-400">Templating: </span>
              <span className="font-bold text-slate-700">{formatDate(c.savedAt)}</span>
            </div>
            {c.operationDate && (
              <div>
                <span className="text-slate-400">Operasi: </span>
                <span className="font-bold text-slate-700">{formatDate(c.operationDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pre-op components */}
        {allKeys.length > 0 && (
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Komponen</span>
              <span className="text-center text-[7px] font-black uppercase tracking-widest text-blue-500">Pre-Op</span>
              <span className="text-center text-[7px] font-black uppercase tracking-widest text-emerald-500">Actual</span>
            </div>
            {allKeys.map(key => (
              <div key={key} className="grid grid-cols-3 items-center gap-1 rounded-lg bg-slate-50 px-1.5 py-1">
                <span className="truncate text-[8px] text-slate-500">{key}</span>
                <span className="text-center text-[9px] font-black text-slate-700">{preComps[key] ?? "—"}</span>
                <span className={`text-center text-[9px] font-black ${actComps[key] ? "text-emerald-600" : "text-slate-300"}`}>
                  {actComps[key] ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Accuracy */}
        {hasPostOp && c.preOpSizeNum != null && c.actualSizeNum != null && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
            <p className="text-[8px] text-slate-400">Akurasi Primer</p>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="text-[10px] font-black text-slate-600">{c.preOpSizeNum}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-black text-slate-600">{c.actualSizeNum}</span>
              <DeltaBadge pre={c.preOpSizeNum} act={c.actualSizeNum} />
            </div>
          </div>
        )}

        {/* HKA */}
        {c.postOpHka != null && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-2">
            <p className="text-[8px] text-emerald-600">HKA Post-Op</p>
            <p className="text-sm font-black text-emerald-700">{c.postOpHka}°</p>
          </div>
        )}

        {/* Notes */}
        {c.notes && (
          <p className="text-[9px] italic text-slate-400">"{c.notes}"</p>
        )}

        {/* Status badge */}
        <div className="mt-auto">
          {hasPostOp
            ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black text-emerald-700"><CheckCircle2 className="h-2.5 w-2.5" /> Post-Op Lengkap</span>
            : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black text-amber-700">⏳ Belum Post-Op</span>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CaseCompareModal({ isOpen, onClose, cases = [], initialCase = null }) {
  const [caseA, setCaseA] = useState(initialCase);
  const [caseB, setCaseB] = useState(null);
  const [pickingSlot, setPickingSlot] = useState(null); // "A" | "B" | null
  const [search, setSearch] = useState("");

  const filteredCases = useMemo(() => {
    const q = search.toLowerCase();
    return cases.filter(c =>
      !q ||
      c.patientName?.toLowerCase().includes(q) ||
      c.procedure?.toLowerCase().includes(q)
    );
  }, [cases, search]);

  if (typeof document === "undefined") return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9993] flex items-end justify-center bg-black/60 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="flex h-[90dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-[24px] bg-[#f1f5f9] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-[#1e1033] px-5 py-4 shrink-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Bandingkan Kasus</p>
                <p className="text-[9px] text-purple-300">Pilih 2 kasus untuk dibandingkan berdampingan</p>
              </div>
              <button type="button" onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-purple-200 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Case picker dropdown */}
            <AnimatePresence>
              {pickingSlot && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Pilih kasus {pickingSlot}
                  </p>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama pasien atau prosedur..."
                    autoFocus
                    className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-purple-400"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredCases.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (pickingSlot === "A") setCaseA(c);
                          else setCaseB(c);
                          setPickingSlot(null);
                          setSearch("");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-slate-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-black text-slate-700">{c.patientName || "Tanpa Nama"}</p>
                          <p className="truncate text-[8px] text-slate-400">{(c.procedure || "").split("(")[0].trim()}</p>
                        </div>
                        {(c.actualImplantLabel || c.actualSizeNum != null) && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[7px] font-black text-emerald-700">POST-OP ✓</span>
                        )}
                      </button>
                    ))}
                    {filteredCases.length === 0 && (
                      <p className="py-4 text-center text-[10px] text-slate-400">Tidak ada kasus ditemukan</p>
                    )}
                  </div>
                  <button type="button" onClick={() => { setPickingSlot(null); setSearch(""); }}
                    className="mt-2 w-full rounded-xl border border-slate-200 py-1.5 text-[9px] font-black text-slate-500">
                    Batal
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slot picker buttons */}
            <div className="grid grid-cols-2 gap-2 px-4 pt-3 pb-2 shrink-0">
              {["A", "B"].map(slot => {
                const c = slot === "A" ? caseA : caseB;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => { setPickingSlot(slot); setSearch(""); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                      slot === "A" ? "border-blue-200 bg-blue-50 hover:bg-blue-100" : "border-violet-200 bg-violet-50 hover:bg-violet-100"
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white ${slot === "A" ? "bg-blue-600" : "bg-violet-600"}`}>
                      {slot}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[9px] font-black text-slate-600">
                      {c ? (c.patientName || "Tanpa Nama") : "Pilih kasus..."}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
                  </button>
                );
              })}
            </div>

            {/* Side-by-side view */}
            <div className="flex min-h-0 flex-1 gap-3 overflow-y-auto px-4 pb-4">
              <CaseColumn c={caseA} label="Kasus A" color="blue" />
              <CaseColumn c={caseB} label="Kasus B" color="violet" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
