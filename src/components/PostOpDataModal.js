"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ClipboardCheck, Save, Loader2, CheckCircle2,
  Ruler, Calendar, FileText, ArrowRight, Lock, Pencil,
} from "lucide-react";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT || "";

async function apiUpdateCase(id, data) {
  const res = await fetch("/api/google-sheet-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: APPS_SCRIPT_URL, action: "update_patient_case", id, data }),
  });
  const json = await res.json();
  if (!json?.ok || !json?.remote?.ok) {
    throw new Error(json?.remote?.error || json?.error || "Gagal menyimpan data post-op.");
  }
  return json.remote;
}

// ─── Procedure detection ───────────────────────────────────────────────────────

function detectProcedure(procedureStr) {
  const p = String(procedureStr || "").toLowerCase();
  if (p.includes("uka") || p.includes("unicompartmental")) return "uka";
  if (p.includes("revision")) return "revision";
  if (p.includes("hemi")) return "hemi";
  if ((p.includes("tha") || p.includes("thr") || p.includes("hip")) && !p.includes("knee")) return "tha";
  if (p.includes("tka") || p.includes("tkr") || p.includes("knee")) return "tka";
  return "general";
}

// ─── Per-procedure template config ────────────────────────────────────────────

const PROC_CONFIG = {
  tka: {
    name: "Total Knee Arthroplasty",
    badge: "TKA/TKR",
    color: "blue",
    primary: { key: "femoral", label: "Femoral Component", unit: "size", hint: "Ukuran 1–8" },
    extras: [
      { key: "tibial",  label: "Tibial Component", unit: "size", hint: "Ukuran 1–8" },
      { key: "insert",  label: "Insert PE",         unit: "mm",   hint: "9 / 10 / 12 / 14 mm" },
      { key: "patella", label: "Patella (opsional)", unit: "mm",   hint: "—", optional: true },
    ],
    hkaNote: "Koreksi varus/valgus post-TKA",
  },
  tha: {
    name: "Total Hip Arthroplasty",
    badge: "THA/THR",
    color: "purple",
    primary: { key: "cup", label: "Asetabular Cup", unit: "mm", hint: "44–66 mm" },
    extras: [
      { key: "head", label: "Femoral Head", unit: "mm",   hint: "22 / 28 / 32 / 36 mm" },
      { key: "stem", label: "Stem",         unit: "size", hint: "Ukuran 1–8" },
    ],
    hkaNote: "Offset / leg length discrepancy (opsional)",
  },
  hemi: {
    name: "Hemiarthroplasty",
    badge: "Hemi",
    color: "teal",
    primary: { key: "head", label: "Bipolar Head", unit: "mm", hint: "36 / 40 / 44 / 48 mm" },
    extras: [
      { key: "stem", label: "Stem", unit: "size", hint: "Ukuran 1–8" },
    ],
    hkaNote: "Opsional",
  },
  uka: {
    name: "Unicompartmental Knee (UKA)",
    badge: "UKA",
    color: "emerald",
    primary: { key: "femoral", label: "Femoral UKA", unit: "size", hint: "1 = A, 2 = B, 3 = C, 4 = D" },
    extras: [
      { key: "tibial", label: "Tibial UKA", unit: "size", hint: "1 = A, 2 = B, 3 = C" },
    ],
    hkaNote: "Koreksi kompartemen medial/lateral",
  },
  revision: {
    name: "Revision Arthroplasty",
    badge: "Revision",
    color: "orange",
    primary: { key: "primary", label: "Komponen Primer", unit: "size", hint: "Ukuran" },
    extras: [
      { key: "augment", label: "Augment/Sleeve", unit: "size", hint: "Jika ada" },
      { key: "stem_ext", label: "Stem Extension", unit: "mm", hint: "Panjang mm", optional: true },
    ],
    hkaNote: "Koreksi deformitas",
  },
  general: {
    name: "Prosedur",
    badge: "Umum",
    color: "slate",
    primary: { key: "primary", label: "Ukuran Implan", unit: "size", hint: "Angka ukuran" },
    extras: [],
    hkaNote: "Opsional",
  },
};

const COLOR_MAP = {
  blue:    { badge: "bg-blue-100 text-blue-700",    border: "border-blue-200", ring: "focus:ring-blue-100 focus:border-blue-400",    bg: "bg-blue-50"    },
  purple:  { badge: "bg-purple-100 text-purple-700", border: "border-purple-200", ring: "focus:ring-purple-100 focus:border-purple-400", bg: "bg-purple-50" },
  teal:    { badge: "bg-teal-100 text-teal-700",    border: "border-teal-200",  ring: "focus:ring-teal-100 focus:border-teal-400",    bg: "bg-teal-50"    },
  emerald: { badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", ring: "focus:ring-emerald-100 focus:border-emerald-400", bg: "bg-emerald-50" },
  orange:  { badge: "bg-orange-100 text-orange-700", border: "border-orange-200", ring: "focus:ring-orange-100 focus:border-orange-400", bg: "bg-orange-50" },
  slate:   { badge: "bg-slate-100 text-slate-700",  border: "border-slate-200",  ring: "focus:ring-slate-100 focus:border-slate-400",  bg: "bg-slate-50"   },
};

// Extract size number from label string
function extractNum(label) {
  const m = String(label || "").match(/\b(\d{1,3}(?:\.\d+)?)\b/);
  return m ? parseFloat(m[1]) : "";
}

// ─── Size Input Field ─────────────────────────────────────────────────────────

function SizeField({ label, unit, hint, value, onChange, isPreOp, colorKey, optional }) {
  const cls = COLOR_MAP[colorKey] || COLOR_MAP.slate;
  return (
    <label className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
        <Ruler className={`h-2.5 w-2.5 ${isPreOp ? "text-blue-400" : "text-emerald-500"}`} />
        {label} {unit && <span className="font-normal normal-case text-slate-400">({unit})</span>}
        {optional && <span className="font-normal normal-case italic text-slate-400">– opsional</span>}
      </span>
      <input
        type="number"
        step="0.5"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className={`w-full rounded-xl border px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:ring-2 ${
          isPreOp
            ? `border-blue-200 bg-blue-50/60 focus:ring-blue-100 focus:border-blue-400`
            : `${cls.border} ${cls.bg} ${cls.ring}`
        }`}
      />
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PostOpDataModal({ isOpen, onClose, patientCase, onSaved }) {
  const procType = useMemo(() => detectProcedure(patientCase?.procedure), [patientCase?.procedure]);
  const config = PROC_CONFIG[procType] || PROC_CONFIG.general;
  const cls = COLOR_MAP[config.color] || COLOR_MAP.slate;

  // Primary sizes
  const [actualPrimary, setActualPrimary] = useState("");
  const [preOpPrimary, setPreOpPrimary]   = useState("");
  // Extra component sizes: { key: value }
  const [extras, setExtras] = useState({});
  // Common fields
  const [operationDate, setOperationDate] = useState("");
  const [postOpHka, setPostOpHka]         = useState("");
  const [postOpNotes, setPostOpNotes]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  // Reset on open
  useEffect(() => {
    if (!isOpen || !patientCase) return;
    setOperationDate(patientCase.operationDate || "");
    setPostOpHka(patientCase.postOpHka != null ? String(patientCase.postOpHka) : "");
    setPostOpNotes(patientCase.postOpNotes || "");
    setDone(false);
    setError("");

    // Pre-fill primary actual size from existing data
    setActualPrimary(patientCase.actualSizeNum != null ? String(patientCase.actualSizeNum) : "");
    // Pre-fill pre-op size from stored value or extract from implantLabel
    setPreOpPrimary(
      patientCase.preOpSizeNum != null
        ? String(patientCase.preOpSizeNum)
        : String(extractNum(patientCase.implantLabel) || ""),
    );
    // Pre-fill extras from existing actualImplantLabel (best-effort parsing)
    const prefillExtras = {};
    const actualParts = String(patientCase.actualImplantLabel || "").split(" · ");
    config.extras.forEach((ex) => {
      const match = actualParts.find((p) =>
        p.toLowerCase().startsWith(ex.label.toLowerCase() + ":")
      );
      if (match) {
        const num = match.match(/:\s*([\d.]+)/);
        if (num) prefillExtras[ex.key] = num[1];
      }
    });
    setExtras(prefillExtras);
  }, [isOpen, patientCase]);

  const setExtra = (key, val) => setExtras((prev) => ({ ...prev, [key]: val }));

  // Parse pre-op reference values for extras from structured implantLabel
  const preOpExtras = useMemo(() => {
    const result = {};
    if (!patientCase?.implantLabel) return result;
    const parts = String(patientCase.implantLabel).split(" · ");
    config.extras.forEach((ex) => {
      const match = parts.find((p) =>
        p.toLowerCase().startsWith(ex.label.toLowerCase() + ":")
      );
      if (match) {
        const num = match.match(/:\s*([\d.]+)/);
        if (num) result[ex.key] = num[1];
      }
    });
    return result;
  }, [patientCase?.implantLabel, config.extras]);

  // Build label string from all components
  const buildActualLabel = () => {
    const parts = [];
    if (actualPrimary !== "") {
      parts.push(`${config.primary.label}: ${actualPrimary}${config.primary.unit !== "size" ? ` ${config.primary.unit}` : ""}`);
    }
    config.extras.forEach(({ key, label, unit }) => {
      if (extras[key] !== undefined && extras[key] !== "") {
        parts.push(`${label}: ${extras[key]}${unit !== "size" ? ` ${unit}` : ""}`);
      }
    });
    return parts.join(" · ");
  };

  // Accuracy diff
  const primaryDiff = actualPrimary !== "" && preOpPrimary !== ""
    ? Number(actualPrimary) - Number(preOpPrimary)
    : null;

  const handleSave = async () => {
    if (actualPrimary === "" && !buildActualLabel()) {
      setError("Isi minimal ukuran implan actual.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiUpdateCase(patientCase.id, {
        operationDate: operationDate || "",
        actualImplantLabel: buildActualLabel(),
        actualSizeNum: actualPrimary !== "" ? Number(actualPrimary) : null,
        preOpSizeNum: preOpPrimary !== "" ? Number(preOpPrimary) : null,
        postOpHka: postOpHka !== "" ? Number(postOpHka) : null,
        postOpNotes: postOpNotes.trim(),
      });
      setDone(true);
      if (onSaved) onSaved(patientCase.id);
    } catch (err) {
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === "undefined" || !patientCase) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/50 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="w-full max-w-[min(100%,480px)] overflow-hidden rounded-t-[28px] rounded-b-[28px] border border-white/60 bg-[#f8fafc] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px]"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-[#0f172a] px-5 py-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${cls.badge.replace("text-", "bg-").split(" ")[0].replace("bg-", "bg-").replace("100", "600")}`}
                style={{ backgroundColor: config.color === "blue" ? "#2563eb" : config.color === "purple" ? "#9333ea" : config.color === "teal" ? "#0d9488" : config.color === "emerald" ? "#059669" : config.color === "orange" ? "#ea580c" : "#475569" }}>
                <ClipboardCheck className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-white">Data Post-Op</p>
                  <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${cls.badge}`}>
                    {config.badge}
                  </span>
                </div>
                <p className="truncate text-[10px] text-slate-400">{patientCase.patientName}</p>
              </div>
              <button type="button" onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pre-op reference bar */}
            {patientCase.implantLabel && (
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pre-Op:</span>
                <span className="truncate text-[10px] text-slate-600">{patientCase.implantLabel}</span>
              </div>
            )}

            {/* Form */}
            <div className="max-h-[68dvh] overflow-y-auto">
              <div className="space-y-4 px-5 py-4">

                {done ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 py-8 text-center"
                  >
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    <p className="text-sm font-black text-slate-800">Data Post-Op Tersimpan!</p>
                    <p className="text-[10px] text-slate-500">Data masuk ke analitik akurasi templating</p>
                    <button type="button" onClick={onClose}
                      className="mt-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white">
                      Tutup
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {/* Tanggal operasi */}
                    <label className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tanggal Operasi</span>
                      </div>
                      <input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                    </label>

                    {/* ── Implant section ── */}
                    <div className={`space-y-3 rounded-2xl border ${cls.border} ${cls.bg} p-4`}>
                      <p className="text-[9px] font-black uppercase tracking-widest"
                        style={{ color: config.color === "blue" ? "#1d4ed8" : config.color === "purple" ? "#7e22ce" : config.color === "teal" ? "#0f766e" : config.color === "emerald" ? "#047857" : config.color === "orange" ? "#c2410c" : "#334155" }}>
                        {config.name} — Actual vs Rencana Pre-Op
                      </p>

                      {/* Primary component: Pre-Op LOCKED reference | Actual editable */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Pre-op — locked from case record */}
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <Lock className="h-2.5 w-2.5 text-slate-400" />
                            {config.primary.label} Pre-Op
                          </span>
                          {patientCase.preOpSizeNum != null ? (
                            <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5">
                              <span className="text-sm font-black text-blue-700">{preOpPrimary}</span>
                              {config.primary.unit !== "size" && (
                                <span className="text-[9px] text-blue-400">{config.primary.unit}</span>
                              )}
                              <span className="ml-auto text-[8px] italic text-slate-400">rekam pre-op</span>
                            </div>
                          ) : (
                            <SizeField
                              label=""
                              unit={config.primary.unit}
                              hint={config.primary.hint}
                              value={preOpPrimary}
                              onChange={setPreOpPrimary}
                              isPreOp={true}
                              colorKey={config.color}
                            />
                          )}
                        </div>
                        {/* Actual — editable */}
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <Pencil className="h-2.5 w-2.5 text-emerald-500" />
                            {config.primary.label} Actual
                          </span>
                          <SizeField
                            label=""
                            unit={config.primary.unit}
                            hint={config.primary.hint}
                            value={actualPrimary}
                            onChange={setActualPrimary}
                            isPreOp={false}
                            colorKey={config.color}
                          />
                        </div>
                      </div>

                      {/* Accuracy badge */}
                      <AnimatePresence>
                        {primaryDiff !== null && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black ${
                              primaryDiff === 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : Math.abs(primaryDiff) <= 1
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            {primaryDiff === 0
                              ? "✅ Exact match — templating akurat"
                              : `Selisih ${primaryDiff > 0 ? "+" : ""}${primaryDiff.toFixed(1)} ${config.primary.unit} — actual ${primaryDiff > 0 ? "lebih besar" : "lebih kecil"}`}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Extra components */}
                      {config.extras.length > 0 && (
                        <div className={`grid gap-2 ${config.extras.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                          {config.extras.map((ex) => (
                            <div key={ex.key} className="flex flex-col gap-0.5">
                              <SizeField
                                label={ex.label}
                                unit={ex.unit}
                                hint={ex.hint}
                                value={extras[ex.key] ?? ""}
                                onChange={(v) => setExtra(ex.key, v)}
                                isPreOp={false}
                                colorKey={config.color}
                                optional={ex.optional}
                              />
                              {preOpExtras[ex.key] && (
                                <span className="flex items-center gap-0.5 pl-0.5 text-[8px] italic text-blue-400">
                                  <Lock className="h-2 w-2" />
                                  pre-op: {preOpExtras[ex.key]}{ex.unit !== "size" ? ` ${ex.unit}` : ""}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* HKA Post-Op */}
                    <label className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        HKA Post-Op (°) — {config.hkaNote}
                      </span>
                      <input type="number" step="0.1" value={postOpHka} onChange={(e) => setPostOpHka(e.target.value)}
                        placeholder="Cth: 1.5"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                    </label>

                    {/* Catatan */}
                    <label className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-slate-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Catatan Post-Op</span>
                      </div>
                      <textarea value={postOpNotes} onChange={(e) => setPostOpNotes(e.target.value)}
                        placeholder="Temuan intraoperatif, alasan perubahan ukuran, dll..."
                        rows={2}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                    </label>

                    {error && (
                      <p className="rounded-xl bg-red-50 px-3 py-2 text-[10px] text-red-600">{error}</p>
                    )}

                    <div className="flex gap-2 pb-1">
                      <button type="button" onClick={handleSave} disabled={saving}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-[0_3px_10px_rgba(5,150,105,0.3)] disabled:opacity-50">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {saving ? "Menyimpan..." : "Simpan Data Post-Op"}
                      </button>
                      <button type="button" onClick={onClose}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-500">
                        Batal
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
