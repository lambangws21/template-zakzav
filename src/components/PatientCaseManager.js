"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FolderOpen,
  Plus,
  Trash2,
  Calendar,
  Activity,
  Layers,
  Search,
  Download,
  Clock,
  ChevronRight,
  AlertCircle,
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  BarChart2,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import PostOpDataModal from "./PostOpDataModal";
import TemplatingAnalytics from "./TemplatingAnalytics";
import PreOpReportModal from "./PreOpReportModal";

const STORAGE_KEY = "zakzav_patient_cases_v1";
const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT || "";

// ─── Local cache utils ─────────────────────────────────────────────────────────

function loadCases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCases(cases) {
  try {
    // Strip large base64 snapshots before caching; snapshotUrl is enough
    const slim = cases.map((c) => {
      if (c._cloud && c.snapshot && c.snapshot.startsWith("data:")) {
        const { snapshot, ...rest } = c;
        return rest;
      }
      return c;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // localStorage full — ignore
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function snapshotSrc(url) {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  return `/api/google-drive-image?src=${encodeURIComponent(url)}`;
}

function extractSizeNum(label) {
  const m = String(label || "").match(/\b(\d{1,3}(?:\.\d+)?)\b/);
  return m ? parseFloat(m[1]) : null;
}

// Build a combined implant label from all canvas layers, or fall back to single implant
function buildImplantLabel(session) {
  const layers = session?.implantLayers || [];
  const validLayers = layers.filter((item) => item?.label);
  if (validLayers.length > 0) {
    return validLayers.map((item) => item.label).join(" · ");
  }
  return session?.implant?.label || null;
}

// Detect primary size number for accuracy comparison (first layer's number)
function buildPreOpSizeNum(session) {
  const layers = session?.implantLayers || [];
  const first = layers.find((item) => item?.label);
  return extractSizeNum(first?.label || session?.implant?.label || "");
}

// ─── Pre-op component config (per-procedure field definitions) ─────────────────

const PREOP_COMPONENTS = {
  tka: {
    primary: { key: "femoral", label: "Femoral",    unit: "size", hint: "1–8" },
    extras: [
      { key: "tibial",  label: "Tibial",    unit: "size", hint: "1–8" },
      { key: "insert",  label: "Insert PE", unit: "mm",   hint: "9–14" },
      { key: "patella", label: "Patella",   unit: "mm",   hint: "—",   optional: true },
    ],
  },
  tha: {
    primary: { key: "cup",  label: "Cup",  unit: "mm",   hint: "44–66" },
    extras: [
      { key: "head", label: "Head", unit: "mm",   hint: "22–36" },
      { key: "stem", label: "Stem", unit: "size", hint: "1–8" },
    ],
  },
  hemi: {
    primary: { key: "head", label: "Bipolar Head", unit: "mm",   hint: "36–48" },
    extras: [
      { key: "stem", label: "Stem", unit: "size", hint: "1–8" },
    ],
  },
  uka: {
    primary: { key: "femoral", label: "Femoral UKA", unit: "size", hint: "A/B/C" },
    extras: [
      { key: "tibial", label: "Tibial UKA", unit: "size", hint: "A/B/C" },
    ],
  },
  revision: {
    primary: { key: "primary", label: "Komponen", unit: "size", hint: "" },
    extras: [
      { key: "augment", label: "Augment", unit: "size", hint: "", optional: true },
    ],
  },
};

function getProcType(procedure) {
  const p = String(procedure || "").toLowerCase();
  if (p.includes("uka") || p.includes("unicompartmental")) return "uka";
  if (p.includes("revision")) return "revision";
  if (p.includes("hemi")) return "hemi";
  if ((p.includes("tha") || p.includes("thr") || p.includes("hip")) && !p.includes("knee")) return "tha";
  if (p.includes("tka") || p.includes("tkr") || p.includes("knee")) return "tka";
  return null;
}

function buildStructuredLabel(procType, preOpSizes) {
  const cfg = PREOP_COMPONENTS[procType];
  if (!cfg) return "";
  const parts = [];
  [cfg.primary, ...cfg.extras].forEach(({ key, label, unit }) => {
    const val = preOpSizes?.[key];
    if (val !== undefined && String(val).trim() !== "") {
      parts.push(`${label}: ${val}${unit !== "size" ? ` ${unit}` : ""}`);
    }
  });
  return parts.join(" · ");
}

// ─── Cloud API helpers ─────────────────────────────────────────────────────────

async function apiListCases() {
  if (!APPS_SCRIPT_URL) return null;
  try {
    const url = `/api/google-sheet-images?url=${encodeURIComponent(APPS_SCRIPT_URL)}&action=list_patient_cases`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!json?.ok || !json?.remote?.ok) return null;
    return Array.isArray(json.remote.items) ? json.remote.items : null;
  } catch {
    return null;
  }
}

async function apiCreateCase(data) {
  if (!APPS_SCRIPT_URL) throw new Error("Apps Script URL tidak dikonfigurasi.");
  const res = await fetch("/api/google-sheet-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: APPS_SCRIPT_URL, action: "create_patient_case", data }),
  });
  const json = await res.json();
  if (!json?.ok || !json?.remote?.ok) {
    throw new Error(json?.remote?.error || json?.error || "Gagal menyimpan ke cloud.");
  }
  return json.remote;
}

async function apiDeleteCase(id) {
  if (!APPS_SCRIPT_URL) throw new Error("Apps Script URL tidak dikonfigurasi.");
  const res = await fetch("/api/google-sheet-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: APPS_SCRIPT_URL, action: "delete_patient_case", id }),
  });
  const json = await res.json();
  if (!json?.ok || !json?.remote?.ok) {
    throw new Error(json?.remote?.error || json?.error || "Gagal menghapus dari cloud.");
  }
  return json.remote;
}

function mapCloudCase(raw) {
  let hkaSummary = [];
  try { hkaSummary = JSON.parse(raw.hkaSummaryJson || "[]"); } catch {}
  return {
    id: raw.id,
    patientName: raw.patientName || "",
    procedure: raw.procedure || "",
    notes: raw.notes || "",
    imageName: raw.imageName || "",
    measurementCount: Number(raw.measurementCount || 0),
    templateCount: Number(raw.templateCount || 0),
    hkaSummary,
    implantLabel: raw.implantLabel || null,
    snapshot: raw.snapshotUrl || null,
    snapshotUrl: raw.snapshotUrl || null,
    savedAt: raw.createdAt || new Date().toISOString(),
    _cloud: true,
    // Pre-op sizing (saved at case creation)
    preOpSizeNum: raw.preOpSizeNum != null && raw.preOpSizeNum !== ""
      ? Number(raw.preOpSizeNum) : null,
    // Post-op data
    operationDate: raw.operationDate || "",
    actualImplantLabel: raw.actualImplantLabel || "",
    actualSizeNum: raw.actualSizeNum != null && raw.actualSizeNum !== ""
      ? Number(raw.actualSizeNum) : null,
    postOpHka: raw.postOpHka != null && raw.postOpHka !== ""
      ? Number(raw.postOpHka) : null,
    postOpNotes: raw.postOpNotes || "",
    postOpUpdatedAt: raw.postOpUpdatedAt || "",
  };
}

// ─── Formatting ────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return formatDate(isoString).split(",")[0];
}

// ─── Case Card ────────────────────────────────────────────────────────────────

function CaseCard({ c, onSelect, onDelete, selected }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timerRef = useRef(null);
  const hkaList = c.hkaSummary || [];
  const thumbnail = snapshotSrc(c.snapshot || c.snapshotUrl || null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative overflow-hidden rounded-2xl border transition-all ${
        selected
          ? "border-blue-300 bg-blue-50 shadow-md"
          : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <div className="flex items-stretch gap-0">
        {/* thumbnail */}
        <div className="flex h-full w-20 shrink-0 items-center justify-center overflow-hidden rounded-l-2xl bg-slate-900">
          {thumbnail ? (
            <img src={thumbnail} alt="X-ray" className="h-full w-full object-cover opacity-80" />
          ) : (
            <Activity className="h-6 w-6 text-slate-600" />
          )}
        </div>

        {/* content */}
        <button
          type="button"
          onClick={() => onSelect(c)}
          className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5 text-left"
        >
          {/* Row 1: name + cloud + post-op badge */}
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-black text-slate-800">
              {c.patientName || "Pasien Tanpa Nama"}
            </span>
            {c._cloud && <Cloud className="h-2.5 w-2.5 shrink-0 text-blue-400" />}
            {c.actualImplantLabel && (
              <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[7px] font-black text-emerald-700">
                POST-OP ✓
              </span>
            )}
          </div>
          {/* Row 2: procedure */}
          <p className="truncate text-[9px] text-slate-500">{c.procedure || "Belum ada prosedur"}</p>
          {/* Row 3: pre-op component chips (max 2) */}
          {c.implantLabel && (
            <div className="mt-0.5 flex flex-wrap gap-0.5">
              {c.implantLabel.split(" · ").slice(0, 2).map((part, i) => (
                <span key={i} className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[8px] text-blue-700 border border-blue-100">
                  {part.trim()}
                </span>
              ))}
              {c.implantLabel.split(" · ").length > 2 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] text-slate-400">
                  +{c.implantLabel.split(" · ").length - 2}
                </span>
              )}
            </div>
          )}
          {/* Row 4: HKA + time */}
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {hkaList.slice(0, 2).map((h, i) => (
              <span key={i} className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${
                h.direction === "varus" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}>
                {h.absoluteDeviation?.toFixed?.(1) ?? h.absoluteDeviation}° {h.direction}
              </span>
            ))}
            <span className="ml-auto flex items-center gap-0.5 text-[8px] text-slate-400">
              <Clock className="h-2 w-2" />{timeAgo(c.savedAt)}
            </span>
          </div>
        </button>

        {/* actions */}
        <div className="flex flex-col items-center justify-between py-2 pr-2">
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.button
                key="confirm"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
                title="Konfirmasi hapus"
              >
                <Trash2 className="h-3 w-3" />
              </motion.button>
            ) : (
              <motion.button
                key="idle"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                  timerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                title="Hapus kasus"
              >
                <Trash2 className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Save Form ────────────────────────────────────────────────────────────────

function SaveForm({ currentSession, onSave, onCancel }) {
  const [patientName, setPatientName] = useState("");
  const [procedure, setProcedure] = useState("Total Knee Arthroplasty (TKA)");
  const [notes, setNotes] = useState("");
  const [preOpSizes, setPreOpSizes] = useState({});

  const implantLayers = (currentSession?.implantLayers || []).filter((item) => item?.label);
  const fallbackLabel = currentSession?.implant?.label || null;
  const allLabels = implantLayers.length > 0
    ? implantLayers.map((i) => i.label)
    : fallbackLabel ? [fallbackLabel] : [];

  const procType = getProcType(procedure);
  const compConfig = procType ? PREOP_COMPONENTS[procType] : null;
  const allCompFields = compConfig ? [compConfig.primary, ...compConfig.extras] : [];

  const setSize = (key, val) => setPreOpSizes((prev) => ({ ...prev, [key]: val }));

  // Reset sizes when procedure type changes
  useEffect(() => { setPreOpSizes({}); }, [procedure]);

  const stats = [
    currentSession?.measurementCount && `${currentSession.measurementCount} ukur`,
    currentSession?.templateCount && `${currentSession.templateCount} tmpl`,
    (currentSession?.hkaSummary || []).length && `${(currentSession.hkaSummary || []).length} HKA`,
    allLabels.length && `${allLabels.length} implant`,
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2.5 rounded-2xl border border-blue-200 bg-blue-50 p-3.5"
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Simpan Kasus Baru</p>

      {/* Row 1: Nama + Prosedur */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Nama Pasien</span>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Nama pasien"
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Prosedur</span>
          <select
            value={procedure}
            onChange={(e) => setProcedure(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option>Total Knee Arthroplasty (TKA)</option>
            <option>Total Hip Arthroplasty (THA)</option>
            <option>Unicompartmental Knee Arthroplasty (UKA)</option>
            <option>Revision Knee Arthroplasty</option>
            <option>Hemiarthroplasty Hip</option>
            <option>Osteotomy</option>
            <option>Lainnya</option>
          </select>
        </label>
      </div>

      {/* Canvas implant chips */}
      {allLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">
            <Layers className="h-2.5 w-2.5" />
          </span>
          {allLabels.map((label, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[9px] text-slate-600">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Rencana ukuran komponen per-prosedur */}
      {compConfig && (
        <div className="space-y-1.5 rounded-xl border border-blue-200 bg-white/70 p-2.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">
            Rencana Ukuran — {compConfig.primary.label}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {allCompFields.map((comp) => (
              <label key={comp.key} className="flex flex-col gap-0.5">
                <span className="text-[8px] text-slate-500">
                  {comp.label}
                  {comp.unit !== "size" && <span className="text-slate-400"> ({comp.unit})</span>}
                  {comp.optional && <span className="ml-0.5 italic text-slate-400"> *</span>}
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={preOpSizes[comp.key] ?? ""}
                  onChange={(e) => setSize(comp.key, e.target.value)}
                  placeholder={comp.hint}
                  className="w-full rounded-lg border border-blue-100 bg-white px-2 py-1 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Catatan (1 baris) */}
      <label className="flex flex-col gap-0.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Catatan</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan singkat (opsional)"
          className="w-full rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {/* Stats inline */}
      {stats.length > 0 && (
        <p className="text-[9px] text-slate-400">{stats.join(" · ")}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => onSave({
            patientName: patientName.trim(),
            procedure,
            notes: notes.trim(),
            preOpSizes,
          })}
          disabled={!patientName.trim()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-2.5 text-xs font-black text-white shadow-[0_3px_10px_rgba(37,99,235,0.35)] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Simpan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-500"
        >
          Batal
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatientCaseManager({ isOpen, onClose, currentSession, onLoadAsLayer }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncOk, setSyncOk] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [search, setSearch] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [postOpCase, setPostOpCase] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [preOpReportCase, setPreOpReportCase] = useState(null);
  const hasCloud = Boolean(APPS_SCRIPT_URL);

  useEffect(() => {
    if (!isOpen) { setCloudError(""); setSyncOk(false); return; }
    const cached = loadCases();
    if (cached.length > 0) setCases(cached);
    if (!hasCloud) return;

    setLoading(true);
    apiListCases()
      .then((items) => {
        if (items) {
          const mapped = items.map(mapCloudCase);
          setCases(mapped);
          saveCases(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, hasCloud]);

  const filtered = cases
    .filter((c) => {
      const q = search.toLowerCase();
      return (
        !q ||
        c.patientName?.toLowerCase().includes(q) ||
        c.procedure?.toLowerCase().includes(q) ||
        c.imageName?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  const handleSave = useCallback(
    async (formData) => {
      setSyncing(true);
      setSyncOk(false);
      setCloudError("");
      setShowSaveForm(false);

      let snapshot = null;
      try {
        snapshot = currentSession?.snapshotFn?.() || null;
      } catch {}

      // Build structured label from component sizes (e.g. "Femoral: 4 · Tibial: 3 · Insert PE: 10 mm")
      const procType = getProcType(formData.procedure);
      const structuredLabel = buildStructuredLabel(procType, formData.preOpSizes);
      // Canvas layer label as supplementary context
      const canvasLabel = buildImplantLabel(currentSession);
      const implantLabel = structuredLabel || canvasLabel;
      // preOpSizeNum: primary component from form, or auto-extracted from canvas
      const primaryKey = procType ? PREOP_COMPONENTS[procType]?.primary?.key : null;
      const primaryVal = primaryKey ? formData.preOpSizes?.[primaryKey] : null;
      const preOpSizeNum =
        primaryVal !== undefined && primaryVal !== "" && !isNaN(Number(primaryVal))
          ? Number(primaryVal)
          : buildPreOpSizeNum(currentSession);

      const caseData = {
        id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        patientName: formData.patientName || "Tanpa Nama",
        procedure: formData.procedure || "",
        notes: formData.notes || "",
        imageName: currentSession?.imageName || "",
        measurementCount: currentSession?.measurementCount || 0,
        templateCount: currentSession?.templateCount || 0,
        hkaSummary: (currentSession?.hkaSummary || []).slice(0, 4),
        implantLabel,
        preOpSizeNum,
        snapshot,
        snapshotUrl: null,
        savedAt: new Date().toISOString(),
        _cloud: false,
        source: "zakzav-templating",
        // Post-op fields start empty
        operationDate: "",
        actualImplantLabel: "",
        actualSizeNum: null,
        postOpHka: null,
        postOpNotes: "",
        postOpUpdatedAt: "",
      };

      if (hasCloud) {
        try {
          const result = await apiCreateCase({
            ...caseData,
            snapshotDataUrl: snapshot,
          });
          caseData.snapshotUrl = result.snapshotUrl || null;
          caseData.snapshot = caseData.snapshotUrl || snapshot;
          caseData._cloud = true;
          setSyncOk(true);
          setTimeout(() => setSyncOk(false), 3000);
        } catch (err) {
          setCloudError(err.message || "Gagal menyimpan ke cloud, tersimpan lokal.");
        }
      }

      const updated = [caseData, ...cases].slice(0, 200);
      setCases(updated);
      saveCases(updated);
      setSelectedCaseId(caseData.id);
      setSyncing(false);
    },
    [cases, currentSession, hasCloud],
  );

  const handleDelete = useCallback(
    async (id) => {
      setSyncing(true);
      setCloudError("");
      const targetCase = cases.find((c) => c.id === id);
      if (hasCloud && targetCase?._cloud) {
        try {
          await apiDeleteCase(id);
        } catch (err) {
          setCloudError(err.message || "Gagal menghapus dari cloud.");
          setSyncing(false);
          return;
        }
      }
      const updated = cases.filter((c) => c.id !== id);
      setCases(updated);
      saveCases(updated);
      if (selectedCaseId === id) setSelectedCaseId(null);
      setSyncing(false);
    },
    [cases, selectedCaseId, hasCloud],
  );

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

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
            className="max-h-[94dvh] w-full max-w-[min(100%,580px)] overflow-hidden rounded-t-[28px] rounded-b-[28px] border border-white/60 bg-[#f1f5f9] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px]"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-purple-900/20 bg-[#1e1033] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-purple-600">
                <FolderOpen className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-white">Kasus Pasien</p>
                  {hasCloud ? (
                    loading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-purple-300" />
                    ) : syncOk ? (
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                    ) : (
                      <Cloud className="h-3 w-3 text-purple-400" title="Tersinkron ke Google Sheets" />
                    )
                  ) : (
                    <CloudOff className="h-3 w-3 text-purple-500" title="Penyimpanan lokal" />
                  )}
                  {syncing && <Loader2 className="h-3 w-3 animate-spin text-purple-300" />}
                </div>
                <p className="text-[10px] text-purple-300">
                  {cases.length} kasus{hasCloud ? " · Google Sheets" : " · lokal"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/80 text-white hover:bg-violet-600"
                title="Analisis Akurasi Templating (Admin)"
              >
                <BarChart2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveForm(true); setCloudError(""); }}
                className="flex h-8 items-center gap-1.5 rounded-full bg-purple-600 px-3 text-[10px] font-black text-white hover:bg-purple-500"
                title="Simpan kasus sekarang"
                disabled={syncing}
              >
                <Plus className="h-3.5 w-3.5" />
                Simpan
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-purple-200 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(94dvh-80px)] overflow-y-auto">
              <div className="space-y-4 px-5 py-5">

                {/* Cloud error */}
                <AnimatePresence>
                  {cloudError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5"
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <p className="text-[10px] text-amber-700">{cloudError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Save form */}
                <AnimatePresence>
                  {showSaveForm && (
                    <SaveForm
                      currentSession={currentSession}
                      onSave={handleSave}
                      onCancel={() => setShowSaveForm(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari pasien, prosedur..."
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                {/* Selected case — Pre-Op Report */}
                <AnimatePresence>
                  {selectedCase && (() => {
                    const preComponents = selectedCase.implantLabel
                      ? selectedCase.implantLabel.split(" · ").map((s) => s.trim()).filter(Boolean)
                      : [];
                    const hkaList = selectedCase.hkaSummary || [];
                    const hasPostOp = Boolean(selectedCase.actualImplantLabel || selectedCase.actualSizeNum != null);
                    const diff = selectedCase.preOpSizeNum != null && selectedCase.actualSizeNum != null
                      ? selectedCase.actualSizeNum - selectedCase.preOpSizeNum : null;
                    const accuracyLabel = diff === null ? null
                      : diff === 0 ? { text: "Exact match", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                      : Math.abs(diff) <= 1 ? { text: `Selisih ${diff > 0 ? "+" : ""}${diff} size`, cls: "bg-amber-50 text-amber-700 border-amber-200" }
                      : { text: `Selisih besar ${diff > 0 ? "+" : ""}${diff}`, cls: "bg-red-50 text-red-700 border-red-200" };

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm"
                      >
                        {/* Report header */}
                        <div className="flex items-start justify-between gap-3 bg-[#1e1033] px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-white">{selectedCase.patientName}</p>
                            <p className="truncate text-[10px] text-purple-300">{selectedCase.procedure}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {hasPostOp && (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black text-emerald-300">
                                POST-OP ✓
                              </span>
                            )}
                            <button type="button" onClick={() => setSelectedCaseId(null)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-purple-300 hover:bg-white/20">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {/* Snapshot + date */}
                          <div className="flex items-center gap-3 px-4 py-2.5">
                            {(selectedCase.snapshot || selectedCase.snapshotUrl) && (
                              <img
                                src={snapshotSrc(selectedCase.snapshot || selectedCase.snapshotUrl)}
                                alt="X-ray"
                                className="h-14 w-14 shrink-0 rounded-xl object-cover border border-slate-200"
                              />
                            )}
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>Templating: {formatDate(selectedCase.savedAt)}</span>
                              </div>
                              {selectedCase.notes && (
                                <p className="text-[10px] italic text-slate-500">"{selectedCase.notes}"</p>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {selectedCase.measurementCount > 0 && (
                                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-black text-blue-700">
                                    {selectedCase.measurementCount} ukur
                                  </span>
                                )}
                                {selectedCase.templateCount > 0 && (
                                  <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[8px] font-black text-purple-700">
                                    {selectedCase.templateCount} tmpl
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Pre-Op plan */}
                          <div className="px-4 py-2.5 space-y-1.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Rencana Pre-Op</p>
                            {preComponents.length > 0 ? (
                              <div className="space-y-1">
                                {preComponents.map((part, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                                    <span className="text-[10px] text-slate-700">{part}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] italic text-slate-400">Belum ada komponen tersimpan</p>
                            )}
                            {selectedCase.preOpSizeNum != null && (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-[9px] text-slate-400">Ukuran primer:</span>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black text-blue-700">
                                  {selectedCase.preOpSizeNum}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* HKA pre-op */}
                          {hkaList.length > 0 && (
                            <div className="px-4 py-2.5 space-y-1.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HKA Pre-Op</p>
                              <div className="flex flex-wrap gap-1">
                                {hkaList.map((h, i) => (
                                  <span key={i} className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                                    h.direction === "varus" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                  }`}>
                                    {h.absoluteDeviation?.toFixed?.(1) ?? h.absoluteDeviation}° {h.direction}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Post-op data */}
                          {hasPostOp ? (
                            <div className="px-4 py-2.5 space-y-1.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Data Post-Op</p>
                              {selectedCase.operationDate && (
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  Operasi: {selectedCase.operationDate}
                                </div>
                              )}
                              {selectedCase.actualImplantLabel && (
                                <div className="space-y-0.5">
                                  {selectedCase.actualImplantLabel.split(" · ").map((part, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                                      <span className="text-[10px] text-slate-700">{part.trim()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {accuracyLabel && (
                                <div className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[9px] font-black ${accuracyLabel.cls}`}>
                                  {accuracyLabel.text}
                                  <span className="font-normal opacity-70">
                                    (pre: {selectedCase.preOpSizeNum} → actual: {selectedCase.actualSizeNum})
                                  </span>
                                </div>
                              )}
                              {selectedCase.postOpHka != null && (
                                <p className="text-[9px] text-slate-500">HKA post-op: <strong>{selectedCase.postOpHka}°</strong></p>
                              )}
                              {selectedCase.postOpNotes && (
                                <p className="text-[10px] italic text-slate-500">"{selectedCase.postOpNotes}"</p>
                              )}
                            </div>
                          ) : (
                            <div className="px-4 py-2 text-[10px] italic text-slate-400">
                              Belum ada data post-op
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                          <button
                            type="button"
                            onClick={() => setPostOpCase(selectedCase)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[10px] font-black text-white"
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            {hasPostOp ? "Edit Data Post-Op" : "Input Data Post-Op"}
                          </button>
                          {onLoadAsLayer && (selectedCase.snapshot || selectedCase.snapshotUrl) && (
                            <button
                              type="button"
                              onClick={() => {
                                const url = snapshotSrc(selectedCase.snapshot || selectedCase.snapshotUrl);
                                const name = `${selectedCase.patientName || "Kasus"} — ${selectedCase.procedure || ""}`.trim().replace(/—\s*$/, "");
                                onLoadAsLayer(url, name);
                              }}
                              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 py-2 text-[10px] font-black text-purple-700 hover:bg-purple-100"
                            >
                              <Layers className="h-3 w-3" />
                              Buka sebagai Layer Perbandingan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPreOpReportCase(selectedCase)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2 text-[10px] font-black text-blue-700"
                          >
                            <FileText className="h-3 w-3" />
                            Laporan Pre-Op (PDF)
                          </button>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

                {/* Cases list */}
                {loading && cases.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-xs">Memuat dari Google Sheets...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center">
                    {cases.length === 0 ? (
                      <>
                        <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <p className="text-sm font-black text-slate-400">Belum ada kasus tersimpan</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Klik "Simpan" untuk menyimpan sesi templating aktif sebagai kasus pasien
                        </p>
                      </>
                    ) : (
                      <>
                        <Search className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-xs text-slate-400">
                          Tidak ada kasus yang cocok dengan "{search}"
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {filtered.length} kasus
                    </p>
                    <AnimatePresence>
                      {filtered.map((c) => (
                        <CaseCard
                          key={c.id}
                          c={c}
                          onSelect={(c) => setSelectedCaseId(c.id === selectedCaseId ? null : c.id)}
                          onDelete={handleDelete}
                          selected={c.id === selectedCaseId}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

              </div>
            </div>

            {/* footer */}
            <div className="border-t border-slate-200/60 bg-[#f1f5f9] px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-600"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(content, document.body)}
      <PostOpDataModal
        isOpen={Boolean(postOpCase)}
        onClose={() => setPostOpCase(null)}
        patientCase={postOpCase}
        onSaved={(id) => {
          setPostOpCase(null);
          // Refresh from cloud to get updated post-op data
          if (hasCloud) {
            apiListCases().then((items) => {
              if (items) {
                const mapped = items.map(mapCloudCase);
                setCases(mapped);
                saveCases(mapped);
              }
            }).catch(() => {});
          }
        }}
      />
      <TemplatingAnalytics
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />
      <PreOpReportModal
        isOpen={Boolean(preOpReportCase)}
        onClose={() => setPreOpReportCase(null)}
        prefillCase={preOpReportCase}
        measurementRows={[]}
        templateInventoryRows={[]}
        hkaSets={[]}
        imageName={preOpReportCase?.imageName || ""}
      />
    </>
  );
}
