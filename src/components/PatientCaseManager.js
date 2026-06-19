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
  Upload,
  Clock,
  ChevronRight,
  ChevronUp,
  Minus,
  AlertCircle,
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  BarChart2,
  Lock,
  ClipboardCheck,
  FileText,
  Pencil,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ImageIcon,
  X as XIcon,
} from "lucide-react";
import PostOpDataModal from "./PostOpDataModal";
import TemplatingAnalytics from "./TemplatingAnalytics";
import PreOpReportModal from "./PreOpReportModal";
import CaseFullReportModal from "./CaseFullReportModal";
import CaseCompareModal from "./CaseCompareModal";
import ThemeToggle from "./ThemeToggle";
import UserProfileBadge from "./UserProfileBadge";

const STORAGE_KEY = "zakzav_patient_cases_v1";
const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT || "";

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({ caseData, onConfirm, onCancel }) {
  if (typeof document === "undefined" || !caseData) return null;
  const name = caseData.patientName || "Tanpa Nama";
  const proc = (caseData.procedure || "").split("(")[0].trim() || "—";

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onCancel}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-6"
        style={{ background: "rgba(4,6,18,0.82)", backdropFilter: "blur(10px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[300px]"
        >
          {/* Icon floating above */}
          <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2">
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-2xl"
              style={{
                background: "radial-gradient(circle at 35% 35%, #ef4444, #991b1b)",
                boxShadow: "0 0 0 4px #1c1622, 0 8px 24px rgba(220,38,38,0.5)",
              }}
            >
              <Trash2 className="h-7 w-7 text-white" strokeWidth={1.8} />
            </div>
          </div>

          {/* Card */}
          <div
            className="overflow-hidden rounded-[28px] px-6 pb-6 pt-12 text-center"
            style={{ background: "#1c1622", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Patient name */}
            <p className="text-[15px] font-black text-white leading-tight">{name}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: "#7c6e8a" }}>{proc}</p>

            <div className="my-4 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

            <p className="text-[22px] font-black leading-tight text-white">Hapus kasus ini?</p>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#7c6e8a" }}>
              Data kasus, rencana templating, dan foto akan dihapus permanen dan tidak dapat dikembalikan.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-2xl py-3 text-[13px] font-black text-white transition hover:brightness-110 active:scale-95"
                style={{ background: "#0f0c14" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-2xl py-3 text-[13px] font-black text-white transition hover:brightness-110 active:scale-95"
                style={{ background: "#dc2626", boxShadow: "0 4px 16px rgba(220,38,38,0.4)" }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

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
      { key: "stem",    label: "Stem",      unit: "size", hint: "—",   optional: true },
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
      { key: "acetabulum", label: "Native Head", unit: "mm", hint: "44–66" },
      { key: "stem",       label: "Stem",              unit: "size", hint: "1–8" },
    ],
  },
  uka: {
    primary: { key: "femoral", label: "Femoral UKA", unit: "size", hint: "A/B/C" },
    extras: [
      { key: "tibial", label: "Tibial UKA", unit: "size", hint: "A/B/C" },
      { key: "stem",   label: "Stem",       unit: "size", hint: "—",     optional: true },
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

function parseImplantLabel(implantLabel, procType) {
  if (!implantLabel || !procType) return {};
  const cfg = PREOP_COMPONENTS[procType];
  if (!cfg) return {};
  const allComps = [cfg.primary, ...cfg.extras];
  const result = {};
  implantLabel.split("·").map(s => s.trim()).filter(Boolean).forEach(part => {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) return;
    const labelPart = part.slice(0, colonIdx).trim();
    const valPart = part.slice(colonIdx + 1).trim();
    const numStr = valPart.replace(/\s*(mm|size)$/i, "").trim();
    const comp = allComps.find(c => c.label.toLowerCase() === labelPart.toLowerCase());
    if (comp && numStr !== "") result[comp.key] = numStr;
  });
  return result;
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

async function apiUpdateCase(id, data) {
  if (!APPS_SCRIPT_URL) throw new Error("Apps Script URL tidak dikonfigurasi.");
  const res = await fetch("/api/google-sheet-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: APPS_SCRIPT_URL, action: "update_patient_case", id, data }),
  });
  const json = await res.json();
  if (!json?.ok || !json?.remote?.ok) {
    throw new Error(json?.remote?.error || json?.error || "Gagal update data di cloud.");
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
  let cupAssessment = null;
  try { cupAssessment = raw.cupAssessmentJson ? JSON.parse(raw.cupAssessmentJson) : null; } catch {}
  let postOpPhotos = [];
  try { postOpPhotos = raw.postOpPhotosJson ? JSON.parse(raw.postOpPhotosJson) : []; } catch {}
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
    cupAssessment,
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
    postOpPhotos,
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

// ─── Image Preview Lightbox ───────────────────────────────────────────────────

function ImagePreviewLightbox({ src: initialSrc, patientName, onClose, onReplaceSnapshot }) {
  const [src, setSrc] = useState(initialSrc);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 5;
  const zoomStep = 0.3;

  const resetView = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  const zoomIn  = () => setZoom(z => Math.min(ZOOM_MAX, parseFloat((z + zoomStep).toFixed(2))));
  const zoomOut = () => setZoom(z => { const n = parseFloat((z - zoomStep).toFixed(2)); if (n <= 1) { setOffset({ x: 0, y: 0 }); } return Math.max(ZOOM_MIN, n); });

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetView();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // wheel zoom
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? zoomStep : -zoomStep;
    setZoom(z => {
      const n = parseFloat((z + delta).toFixed(2));
      if (n <= 1) setOffset({ x: 0, y: 0 });
      return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, n));
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // drag pan
  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart.current) return;
    setOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.mx, y: dragStart.current.oy + e.clientY - dragStart.current.my });
  };
  const onMouseUp = () => setDragging(false);

  // touch zoom/pan
  const lastTouch = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      lastTouch.current = { tx: e.touches[0].clientX, ty: e.touches[0].clientY, ox: offset.x, oy: offset.y, dist: null };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      lastTouch.current = { ...lastTouch.current, dist, zoomAtStart: zoom };
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastTouch.current?.dist != null) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ratio = dist / lastTouch.current.dist;
      const newZ = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, parseFloat((lastTouch.current.zoomAtStart * ratio).toFixed(2))));
      if (newZ <= 1) setOffset({ x: 0, y: 0 });
      setZoom(newZ);
    } else if (e.touches.length === 1 && zoom > 1 && lastTouch.current) {
      setOffset({ x: lastTouch.current.ox + e.touches[0].clientX - lastTouch.current.tx, y: lastTouch.current.oy + e.touches[0].clientY - lastTouch.current.ty });
    }
  };
  const onTouchEnd = () => { lastTouch.current = null; };

  // replace photo
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setSrc(dataUrl);
      resetView();
      if (onReplaceSnapshot) onReplaceSnapshot(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const pct = Math.round(zoom * 100);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "#0f172a", border: "1.5px solid rgba(56,189,248,0.2)", width: "min(96vw,1200px)", maxHeight: "99dvh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
            <span className="truncate text-xs font-black text-slate-200">{patientName || "X-Ray Preview"}</span>
          </div>
          {/* zoom badge */}
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-black text-sky-300 tabular-nums">
            {pct}%
          </span>
          <button onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Image area ── */}
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="relative flex-1 overflow-hidden"
          style={{ background: "#070d1a", cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default", userSelect: "none", minHeight: 200 }}
        >
          <img
            src={src}
            alt={patientName || "X-Ray"}
            draggable={false}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "90dvh",
              width: "100%",
              objectFit: "contain",
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transformOrigin: "center center",
              transition: dragging ? "none" : "transform 0.15s ease",
            }}
          />
        </div>

        {/* ── Toolbar ── */}
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {/* zoom controls */}
          <div className="flex items-center gap-1.5">
            <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-slate-300 hover:bg-white/15 hover:text-white disabled:opacity-30 transition-colors" title="Zoom out ( - )">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button onClick={resetView} className="rounded-xl bg-white/8 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:bg-white/15 hover:text-white transition-colors" title="Reset (0)">
              {pct}%
            </button>
            <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-slate-300 hover:bg-white/15 hover:text-white disabled:opacity-30 transition-colors" title="Zoom in ( + )">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={resetView} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-slate-400 hover:bg-white/15 hover:text-white transition-colors" title="Reset view (0)">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ganti foto */}
          <div className="flex items-center gap-1.5">
            <span className="hidden text-[9px] text-slate-600 sm:block">Scroll/pinch untuk zoom · drag untuk geser</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0369a1)" }}
              title="Ganti foto snapshot"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Ganti Foto
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ─── Case Card Skeleton ───────────────────────────────────────────────────────

function CaseCardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-3 animate-pulse"
      style={{ background: "var(--soft-card-bg, #fff)" }}>
      {/* Thumbnail */}
      <div className="h-[72px] w-[72px] shrink-0 rounded-xl bg-slate-200" />
      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="h-3 w-2/5 rounded-full bg-slate-200" />
        <div className="h-2.5 w-1/3 rounded-full bg-slate-200" />
        <div className="flex gap-1.5">
          <div className="h-5 w-20 rounded-full bg-slate-200" />
          <div className="h-5 w-16 rounded-full bg-slate-200" />
        </div>
      </div>
      {/* Right */}
      <div className="flex flex-col items-end gap-2 py-1">
        <div className="h-2.5 w-12 rounded-full bg-slate-200" />
        <div className="h-5 w-14 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

// ─── Syncing Toast ────────────────────────────────────────────────────────────

function SyncingToast({ syncing, text = "Menyimpan ke cloud..." }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {syncing && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 z-[99990] -translate-x-1/2"
        >
          <div className="flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-2xl"
            style={{ background: "#1a0d2e", border: "1px solid rgba(168,85,247,0.3)" }}>
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            <span className="text-[11px] font-black text-purple-200">{text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Case Card ────────────────────────────────────────────────────────────────

function CaseCard({ c, onSelect, onDelete, selected, onUpdateSnapshot }) {
  const [showPreview, setShowPreview] = useState(false);
  const hkaList = c.hkaSummary || [];
  const thumbnail = snapshotSrc(c.snapshot || c.snapshotUrl || null);

  return (
    <>
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
          <div className="relative flex h-full w-24 shrink-0 flex-col overflow-hidden rounded-l-2xl bg-slate-900">
            {thumbnail ? (
              <>
                <img
                  src={thumbnail}
                  alt="X-ray"
                  className={`w-full object-cover transition-all duration-300 group-hover:opacity-60 ${c.postOpPhotos?.length > 0 ? "flex-1" : "h-full"}`}
                  style={{ minHeight: 60 }}
                />
                {/* overlay zoom button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
                  className={`absolute left-0 right-0 top-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${c.postOpPhotos?.length > 0 ? "bottom-[28px]" : "bottom-0"}`}
                  title="Preview gambar"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/90 shadow-lg">
                    <ZoomIn className="h-3.5 w-3.5 text-white" />
                  </div>
                </button>
              </>
            ) : (
              <div className={`flex flex-col items-center justify-center gap-1 ${c.postOpPhotos?.length > 0 ? "flex-1" : "h-full w-full"}`} style={{ minHeight: 60 }}>
                <Activity className="h-6 w-6 text-slate-600" />
                <span className="text-[7px] text-slate-600">No image</span>
              </div>
            )}
            {/* Post-op photo strip */}
            {c.postOpPhotos?.length > 0 && (
              <div className="flex h-7 shrink-0 gap-0.5 bg-slate-950/80 px-0.5 py-0.5">
                {c.postOpPhotos.slice(0, 3).map((src, i) => (
                  <div key={i} className="flex-1 overflow-hidden rounded-sm">
                    <img src={snapshotSrc(src)} alt="" className="h-full w-full object-cover opacity-80" />
                  </div>
                ))}
                {c.postOpPhotos.length > 3 && (
                  <div className="flex flex-1 items-center justify-center rounded-sm bg-slate-700/80">
                    <span className="text-[7px] font-black text-slate-300">+{c.postOpPhotos.length - 3}</span>
                  </div>
                )}
              </div>
            )}
            {/* cloud badge */}
            {c._cloud && (
              <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/80">
                <Cloud className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          {/* content */}
          <button
            type="button"
            onClick={() => onSelect(c)}
            className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5 text-left"
          >
            {/* Row 1: name + badges */}
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-black text-slate-800">
                {c.patientName || "Pasien Tanpa Nama"}
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {c.postOpPhotos?.length > 0 && (
                  <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[7px] font-black text-teal-700">
                    📸 {c.postOpPhotos.length}
                  </span>
                )}
                {c.actualImplantLabel && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[7px] font-black text-emerald-700">
                    POST-OP ✓
                  </span>
                )}
              </div>
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
            {/* Row 4: cup assessment badge */}
            {c.cupAssessment && (
              <div className="mt-0.5 flex items-center gap-1">
                <span className="rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[8px] font-black text-amber-700">
                  ⊙ INC {parseFloat(c.cupAssessment.inclination).toFixed(1)}° AV {parseFloat(c.cupAssessment.anteversion).toFixed(1)}°
                </span>
              </div>
            )}
            {/* Row 5: HKA + time */}
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
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              title="Hapus kasus"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Lightbox preview */}
      <AnimatePresence>
        {showPreview && thumbnail && (
          <ImagePreviewLightbox
            src={thumbnail}
            patientName={c.patientName}
            onClose={() => setShowPreview(false)}
            onReplaceSnapshot={(dataUrl) => onUpdateSnapshot?.(c.id, dataUrl)}
          />
        )}
      </AnimatePresence>
    </>
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
    currentSession?.cupAssessment && `Cup INC ${parseFloat(currentSession.cupAssessment.inclination).toFixed(1)}° AV ${parseFloat(currentSession.cupAssessment.anteversion).toFixed(1)}°`,
  ].filter(Boolean);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onCancel}
        className="fixed inset-0 z-[9994] flex items-end justify-center p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:items-center sm:p-6"
        style={{ background: "rgba(4,6,18,0.70)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[480px] overflow-hidden rounded-[24px] shadow-2xl"
          style={{ background: "var(--soft-raised-bg, #fff)", border: "1px solid var(--soft-border, #e2e8f0)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-5 py-4"
            style={{ borderColor: "var(--soft-border)", background: "var(--soft-inset-bg)" }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600">
              <Download className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black" style={{ color: "var(--soft-text-hi)" }}>Simpan Kasus Baru</p>
              {stats.length > 0 && (
                <p className="text-[9px] opacity-50 truncate" style={{ color: "var(--soft-text)" }}>{stats.join(" · ")}</p>
              )}
            </div>
            <button type="button" onClick={onCancel}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:opacity-70"
              style={{ background: "var(--soft-border)" }}>
              <X className="h-3.5 w-3.5" style={{ color: "var(--soft-text)" }} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-3 px-5 py-4">
            {/* Nama + Prosedur */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--soft-text)" }}>Nama Pasien</span>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nama pasien"
                  autoFocus
                  className="w-full rounded-xl border px-2.5 py-2 text-xs outline-none transition focus:ring-2"
                  style={{ borderColor: "var(--soft-border)", background: "var(--soft-inset-bg)", color: "var(--soft-text-hi)" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--soft-text)" }}>Prosedur</span>
                <select
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  className="w-full rounded-xl border px-2.5 py-2 text-xs outline-none transition focus:ring-2"
                  style={{ borderColor: "var(--soft-border)", background: "var(--soft-inset-bg)", color: "var(--soft-text-hi)" }}
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
                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mr-1" style={{ color: "var(--soft-text)" }}>
                  <Layers className="h-2.5 w-2.5" />
                </span>
                {allLabels.map((label, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px]"
                    style={{ borderColor: "var(--soft-border)", color: "var(--soft-text-hi)", background: "var(--soft-inset-bg)" }}>
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Ukuran komponen */}
            {compConfig && (
              <div className="space-y-1.5 rounded-xl border p-3"
                style={{ borderColor: "var(--soft-border)", background: "var(--soft-inset-bg)" }}>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">
                  Rencana Ukuran — {compConfig.primary.label}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {allCompFields.map((comp) => (
                    <label key={comp.key} className="flex flex-col gap-0.5">
                      <span className="text-[8px]" style={{ color: "var(--soft-text)" }}>
                        {comp.label}
                        {comp.unit !== "size" && <span className="opacity-50"> ({comp.unit})</span>}
                        {comp.optional && <span className="ml-0.5 italic opacity-40"> *</span>}
                      </span>
                      <input
                        type={comp.unit === "size" ? "text" : "number"}
                        step={comp.unit === "size" ? undefined : "0.5"}
                        min={comp.unit === "size" ? undefined : "0"}
                        value={preOpSizes[comp.key] ?? ""}
                        onChange={(e) => setSize(comp.key, e.target.value)}
                        placeholder={comp.hint}
                        className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none transition"
                        style={{ borderColor: "var(--soft-border)", background: "var(--soft-raised-bg)", color: "var(--soft-text-hi)" }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Hasil Pengukuran */}
            {((currentSession?.hkaSummary || []).length > 0 || currentSession?.cupAssessment) && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--soft-border)" }}>
                <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "var(--soft-inset-bg)", borderBottom: "1px solid var(--soft-border)" }}>
                  <Activity className="h-3 w-3 text-violet-500 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-violet-500">Hasil Pengukuran</span>
                </div>
                <div className="divide-y" style={{ divideColor: "var(--soft-border)" }}>
                  {(currentSession.hkaSummary || []).map((m, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 text-[8px] font-black uppercase"
                          style={{ color: "var(--soft-text)", opacity: 0.5 }}>
                          {m.side === "left" ? "Kiri" : "Kanan"}
                        </span>
                        <span className="text-[9px] truncate" style={{ color: "var(--soft-text)" }}>{m.modeLabel || "HKA"}</span>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${
                        m.absoluteDeviation !== null && m.absoluteDeviation < 3
                          ? "bg-emerald-100 text-emerald-700"
                          : m.absoluteDeviation !== null && m.absoluteDeviation <= 5
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {m.absoluteDeviation !== null ? `${m.absoluteDeviation.toFixed(1)}°` : "—"}
                        {m.direction && m.absoluteDeviation !== null ? ` ${m.direction === "varus" ? "Varus" : "Valgus"}` : ""}
                      </span>
                    </div>
                  ))}
                  {currentSession?.cupAssessment && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-[9px]" style={{ color: "var(--soft-text)" }}>Cup Inclination / Anteversion</span>
                      <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-black text-sky-700">
                        {parseFloat(currentSession.cupAssessment.inclination).toFixed(1)}° / {parseFloat(currentSession.cupAssessment.anteversion).toFixed(1)}°
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Catatan */}
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--soft-text)" }}>Catatan</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan singkat (opsional)"
                className="w-full rounded-xl border px-2.5 py-2 text-xs outline-none transition"
                style={{ borderColor: "var(--soft-border)", background: "var(--soft-inset-bg)", color: "var(--soft-text-hi)" }}
              />
            </label>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-2.5 border-t px-5 py-4"
            style={{ borderColor: "var(--soft-border)", background: "var(--soft-inset-bg)" }}>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border px-5 py-2.5 text-xs font-black transition hover:opacity-80"
              style={{ borderColor: "var(--soft-border)", color: "var(--soft-text)", background: "var(--soft-raised-bg)" }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => onSave({ patientName: patientName.trim(), procedure, notes: notes.trim(), preOpSizes })}
              disabled={!patientName.trim()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Simpan Kasus
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Edit Case Modal ───────────────────────────────────────────────────────────

function EditCaseModal({ isOpen, caseData, onSave, onClose, onMinimize }) {
  const [patientName, setPatientName] = useState(caseData?.patientName || "");
  const [procedure, setProcedure] = useState(caseData?.procedure || "Total Knee Arthroplasty (TKA)");
  const [notes, setNotes] = useState(caseData?.notes || "");
  const [preOpSizes, setPreOpSizes] = useState({});
  const [saving, setSaving] = useState(false);

  // Restore all fields (including pre-filled sizes) when caseData changes
  useEffect(() => {
    if (!caseData) return;
    setPatientName(caseData.patientName || "");
    const proc = caseData.procedure || "Total Knee Arthroplasty (TKA)";
    setProcedure(proc);
    setNotes(caseData.notes || "");
    const procType = getProcType(proc);
    const parsed = parseImplantLabel(caseData.implantLabel, procType);
    setPreOpSizes(parsed);
  }, [caseData?.id]);

  const procType = getProcType(procedure);
  const compConfig = procType ? PREOP_COMPONENTS[procType] : null;
  const allCompFields = compConfig ? [compConfig.primary, ...compConfig.extras] : [];
  const setSize = (key, val) => setPreOpSizes((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    const structuredLabel = buildStructuredLabel(procType, preOpSizes);
    const primaryKey = compConfig?.primary?.key;
    const primaryVal = primaryKey ? preOpSizes[primaryKey] : null;
    const preOpSizeNum =
      primaryVal !== undefined && primaryVal !== "" && !isNaN(Number(primaryVal))
        ? Number(primaryVal)
        : null;
    setSaving(true);
    try {
      await onSave({
        patientName: patientName.trim(),
        procedure,
        notes: notes.trim(),
        implantLabel: structuredLabel || preOpSizes.__free__ || caseData?.implantLabel || "",
        preOpSizeNum,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && caseData && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/50 p-0 pb-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border border-white/60 bg-[#f8f7ff] shadow-[0_-8px_40px_rgba(0,0,0,0.22)] sm:max-w-[480px] sm:rounded-[24px] sm:shadow-[0_24px_60px_rgba(0,0,0,0.32)]"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            {/* Drag pill — mobile only */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between bg-amber-600 px-4 py-3 sm:px-5 sm:py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/15">
                  <Pencil className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Edit Data Kasus</p>
                  <p className="text-[9px] text-amber-100 opacity-80 truncate max-w-[240px]">{caseData.patientName || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {onMinimize && (
                  <button
                    type="button"
                    onClick={onMinimize}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-amber-100 transition hover:bg-white/20"
                    title="Minimize"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-amber-100 transition hover:bg-white/20"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="relative space-y-3 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:space-y-3.5 sm:p-5 sm:pb-5">
              {/* Saving skeleton overlay */}
              {saving && (
                <div className="absolute inset-0 z-10 flex flex-col gap-3 rounded-b-[24px] bg-[#f8f7ff]/90 px-4 py-5 backdrop-blur-[2px]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
                    <span className="text-xs font-black text-slate-600">Menyimpan perubahan...</span>
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-11 animate-pulse rounded-xl bg-amber-50" style={{ animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              )}
              {/* Row: Nama + Prosedur */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Nama Pasien</span>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nama pasien"
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Prosedur</span>
                  <select
                    value={procedure}
                    onChange={(e) => { setProcedure(e.target.value); setPreOpSizes({}); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
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

              {/* Rencana ukuran komponen per-prosedur */}
              {compConfig ? (
                <div className="space-y-1.5 rounded-xl border border-amber-200 bg-white/70 p-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">
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
                          type={comp.unit === "size" ? "text" : "number"}
                          step={comp.unit === "size" ? undefined : "0.5"}
                          min={comp.unit === "size" ? undefined : "0"}
                          value={preOpSizes[comp.key] ?? ""}
                          onChange={(e) => setSize(comp.key, e.target.value)}
                          placeholder={comp.hint}
                          className="w-full rounded-lg border border-amber-100 bg-white px-2 py-1 text-xs text-slate-800 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Komponen Rencana Pre-Op</span>
                  <input
                    type="text"
                    value={preOpSizes.__free__ ?? caseData?.implantLabel ?? ""}
                    onChange={(e) => setSize("__free__", e.target.value)}
                    placeholder='mis. "Komponen A · Komponen B"'
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </label>
              )}

              {/* Catatan */}
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Catatan</span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan singkat (opsional)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </label>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!patientName.trim() || saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-amber-600 py-2.5 text-xs font-black text-white shadow-[0_3px_10px_rgba(217,119,6,0.3)] transition disabled:opacity-40 hover:bg-amber-500"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Case Detail Modal ─────────────────────────────────────────────────────────

function CaseDetailModal({ caseData, onClose, onMinimize, onEdit, onPostOp, onLoadAsLayer, onPreOpReport, onFullReport, onCompare, onLightbox }) {
  const [postOpPhotoIdx, setPostOpPhotoIdx] = useState(0);
  const [exportingXray, setExportingXray] = useState(false);
  useEffect(() => { setPostOpPhotoIdx(0); }, [caseData?.id]);

  if (!caseData) return null;

  async function handleExportXray() {
    setExportingXray(true);
    try {
      const snap = caseData.snapshot;
      const snapUrl = caseData.snapshotUrl;
      let href, ext = "jpg";
      if (snap?.startsWith("data:")) {
        href = snap;
        ext = snap.startsWith("data:image/png") ? "png" : "jpg";
      } else {
        const src = snapUrl || snap;
        const proxyUrl = src?.startsWith("http")
          ? `/api/google-drive-image?src=${encodeURIComponent(src)}`
          : src;
        if (!proxyUrl) return;
        const r = await fetch(proxyUrl);
        const blob = await r.blob();
        href = URL.createObjectURL(blob);
        ext = blob.type.includes("png") ? "png" : "jpg";
      }
      const a = document.createElement("a");
      a.href = href;
      a.download = `${(caseData.patientName || "xray").replace(/[^a-zA-Z0-9]/g, "-")}-xray.${ext}`;
      a.click();
      if (!snap?.startsWith("data:")) setTimeout(() => URL.revokeObjectURL(href), 1500);
    } catch {} finally {
      setExportingXray(false);
    }
  }

  const preComponents = caseData.implantLabel
    ? caseData.implantLabel.split(" · ").map((s) => s.trim()).filter(Boolean)
    : [];
  const hkaList = caseData.hkaSummary || [];
  const hasPostOp = Boolean(caseData.actualImplantLabel || caseData.actualSizeNum != null);
  const diff = caseData.preOpSizeNum != null && caseData.actualSizeNum != null
    ? caseData.actualSizeNum - caseData.preOpSizeNum : null;
  const accuracyLabel = diff === null ? null
    : diff === 0 ? { text: "Exact match", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    : Math.abs(diff) <= 1 ? { text: `Selisih ${diff > 0 ? "+" : ""}${diff} size`, cls: "bg-amber-50 text-amber-700 border-amber-200" }
    : { text: `Selisih besar ${diff > 0 ? "+" : ""}${diff}`, cls: "bg-red-50 text-red-700 border-red-200" };

  const preOpSrc = (caseData.snapshot || caseData.snapshotUrl)
    ? snapshotSrc(caseData.snapshot || caseData.snapshotUrl)
    : null;
  const postPhotos = caseData.postOpPhotos || [];
  const hasBoth = preOpSrc && postPhotos.length > 0;
  const curPostIdx = Math.min(postOpPhotoIdx, Math.max(0, postPhotos.length - 1));

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="case-detail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[9990] flex items-end justify-center sm:items-center sm:p-6"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full overflow-hidden rounded-t-[24px] shadow-2xl sm:max-w-[520px] sm:rounded-[24px] border border-[var(--soft-border)]"
          style={{ maxHeight: "94dvh", overflowY: "auto", background: "var(--soft-raised-bg)" }}
        >
          {/* Drag pill — mobile only */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 bg-[#1e1033] px-4 py-3 shrink-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{caseData.patientName}</p>
              <p className="truncate text-[10px] text-purple-300">{caseData.procedure}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hasPostOp && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black text-emerald-300">
                  POST-OP ✓
                </span>
              )}
              <button type="button" onClick={onMinimize}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-purple-300 hover:bg-white/20"
                title="Minimize">
                <Minus className="h-3 w-3" />
              </button>
              <button type="button" onClick={onClose}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-purple-300 hover:bg-white/20"
                title="Tutup">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--soft-border)]">
            {/* Photo comparison */}
            {(preOpSrc || postPhotos.length > 0) && (
              <div style={{ background: "#0a0f1c" }}>
                {hasBoth ? (
                  <div className="grid grid-cols-2 divide-x divide-white/10" style={{ height: 200 }}>
                    {/* Kiri: Pre-Op */}
                    <div className="relative overflow-hidden">
                      <img src={preOpSrc} alt="Pre-Op" className="h-full w-full object-cover opacity-85" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,transparent 40%,rgba(10,15,28,0.7))" }} />
                      <div className="absolute left-1.5 top-1.5 rounded-full bg-sky-500/85 px-1.5 py-0.5 text-[7px] font-black text-white backdrop-blur-sm">
                        📷 Pre-Op
                      </div>
                      <button type="button"
                        onClick={() => onLightbox(preOpSrc, caseData.patientName, caseData.id)}
                        className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[7px] font-black text-white hover:bg-black/70">
                        <Maximize2 className="h-2.5 w-2.5" /> Besar
                      </button>
                    </div>
                    {/* Kanan: Post-Op */}
                    <div className="relative overflow-hidden">
                      <img src={snapshotSrc(postPhotos[curPostIdx])} alt={`Post-Op ${curPostIdx + 1}`} className="h-full w-full object-cover" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,transparent 40%,rgba(10,15,28,0.7))" }} />
                      <div className="absolute left-1.5 top-1.5 rounded-full bg-emerald-500/85 px-1.5 py-0.5 text-[7px] font-black text-white backdrop-blur-sm">
                        📸 Post-Op
                      </div>
                      {postPhotos.length > 1 && (
                        <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1.5">
                          <button type="button"
                            onClick={() => setPostOpPhotoIdx(i => (i - 1 + postPhotos.length) % postPhotos.length)}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 8 8" fill="currentColor"><path d="M5 1L2 4l3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                          </button>
                          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[7px] font-black text-white">
                            {curPostIdx + 1}/{postPhotos.length}
                          </span>
                          <button type="button"
                            onClick={() => setPostOpPhotoIdx(i => (i + 1) % postPhotos.length)}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 8 8" fill="currentColor"><path d="M3 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      )}
                      <button type="button"
                        onClick={() => onLightbox(snapshotSrc(postPhotos[curPostIdx]), caseData.patientName, null)}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
                        <ZoomIn className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : preOpSrc ? (
                  <div className="relative overflow-hidden" style={{ height: 180 }}>
                    <div className="absolute left-2 top-2 z-10 rounded-full bg-sky-500/80 px-2 py-0.5 text-[8px] font-black text-white">
                      📷 X-Ray Pre-Op
                    </div>
                    <img src={preOpSrc} alt="Pre-Op" className="h-full w-full object-cover opacity-85" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,transparent 50%,rgba(10,15,28,0.85))" }} />
                    <button type="button"
                      onClick={() => onLightbox(preOpSrc, caseData.patientName, caseData.id)}
                      className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-sky-500/85 px-3 py-1.5 text-[9px] font-black text-white">
                      <Maximize2 className="h-3 w-3" /> Perbesar
                    </button>
                  </div>
                ) : (
                  <div className="px-3 pb-3 pt-2">
                    <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                      📸 Foto Post-Op ({postPhotos.length})
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {postPhotos.map((src, idx) => (
                        <button key={idx} type="button"
                          onClick={() => onLightbox(snapshotSrc(src), caseData.patientName, null)}
                          className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-slate-800">
                          <img src={snapshotSrc(src)} alt={`post-op-${idx + 1}`} className="h-full w-full object-cover transition-opacity group-hover:opacity-70" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Date + notes */}
            <div className="flex items-start gap-3 px-4 py-2.5">
              <div className="min-w-0 space-y-1 w-full">
                <div className="flex items-center gap-1.5 text-[9px] [color:var(--soft-text)] opacity-70">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>Templating: {formatDate(caseData.savedAt)}</span>
                </div>
                {caseData.notes && (
                  <p className="text-[10px] italic [color:var(--soft-text)] opacity-60">"{caseData.notes}"</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {caseData.measurementCount > 0 && (
                    <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[8px] font-black text-blue-400">
                      {caseData.measurementCount} ukur
                    </span>
                  )}
                  {caseData.templateCount > 0 && (
                    <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[8px] font-black text-purple-400">
                      {caseData.templateCount} tmpl
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cup Assessment */}
            {caseData.cupAssessment && (
              <div className="px-4 py-2.5 space-y-1.5 bg-amber-500/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">⊙ Cup Assessment</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black text-amber-400">
                    INC {parseFloat(caseData.cupAssessment.inclination).toFixed(1)}°
                  </span>
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[9px] font-black text-sky-400">
                    AV {parseFloat(caseData.cupAssessment.anteversion).toFixed(1)}°
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${caseData.cupAssessment.side === "left" ? "bg-sky-500/15 text-sky-400" : "bg-orange-500/15 text-orange-400"}`}>
                    {caseData.cupAssessment.side === "left" ? "◁ Kiri" : "Kanan ▷"}
                  </span>
                  {caseData.cupAssessment.zone && (
                    <span className="rounded-full bg-[var(--soft-inset-bg)] px-2 py-0.5 text-[9px] font-bold [color:var(--soft-text)]">
                      {caseData.cupAssessment.zone}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Pre-Op plan */}
            <div className="px-4 py-2.5 space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Rencana Pre-Op</p>
              {preComponents.length > 0 ? (
                <div className="space-y-1">
                  {preComponents.map((part, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                      <span className="text-[10px] [color:var(--soft-text)]">{part}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] italic [color:var(--soft-text)] opacity-40">Belum ada komponen tersimpan</p>
              )}
              {caseData.preOpSizeNum != null && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[9px] [color:var(--soft-text)] opacity-60">Ukuran primer:</span>
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-black text-blue-400">
                    {caseData.preOpSizeNum}
                  </span>
                </div>
              )}
            </div>

            {/* HKA pre-op */}
            {hkaList.length > 0 && (
              <div className="px-4 py-2.5 space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest [color:var(--soft-text)] opacity-50">HKA Pre-Op</p>
                <div className="flex flex-wrap gap-1">
                  {hkaList.map((h, i) => (
                    <span key={i} className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                      h.direction === "varus" ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
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
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Data Post-Op</p>
                {caseData.operationDate && (
                  <div className="flex items-center gap-1.5 text-[9px] [color:var(--soft-text)] opacity-60">
                    <Calendar className="h-3 w-3 shrink-0" />
                    Operasi: {caseData.operationDate}
                  </div>
                )}
                {caseData.actualImplantLabel && (
                  <div className="space-y-0.5">
                    {caseData.actualImplantLabel.split(" · ").map((part, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                        <span className="text-[10px] [color:var(--soft-text)]">{part.trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {accuracyLabel && (
                  <div className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[9px] font-black ${accuracyLabel.cls}`}>
                    {accuracyLabel.text}
                    <span className="font-normal opacity-70">
                      (pre: {caseData.preOpSizeNum} → actual: {caseData.actualSizeNum})
                    </span>
                  </div>
                )}
                {caseData.postOpHka != null && (
                  <p className="text-[9px] [color:var(--soft-text)] opacity-60">HKA post-op: <strong>{caseData.postOpHka}°</strong></p>
                )}
                {caseData.postOpNotes && (
                  <p className="text-[10px] italic [color:var(--soft-text)] opacity-60">"{caseData.postOpNotes}"</p>
                )}
              </div>
            ) : (
              <div className="px-4 py-2 text-[10px] italic [color:var(--soft-text)] opacity-40">
                Belum ada data post-op
              </div>
            )}

            {/* Action buttons */}
            <div className="border-t border-[var(--soft-border)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] space-y-2">
              <button
                type="button"
                onClick={() => onEdit(caseData.id)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2 text-[10px] font-black text-amber-700 hover:bg-amber-100"
              >
                <Pencil className="h-3 w-3" />
                Edit Data Kasus
              </button>
              <button
                type="button"
                onClick={() => onPostOp(caseData)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[10px] font-black text-white"
              >
                <ClipboardCheck className="h-3 w-3" />
                {hasPostOp ? "Edit Data Post-Op" : "Input Data Post-Op"}
              </button>
              {onLoadAsLayer && (caseData.snapshot || caseData.snapshotUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    const url = snapshotSrc(caseData.snapshot || caseData.snapshotUrl);
                    const name = `${caseData.patientName || "Kasus"} — ${caseData.procedure || ""}`.trim().replace(/—\s*$/, "");
                    onLoadAsLayer(url, name);
                    onClose();
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 py-2 text-[10px] font-black text-purple-700 hover:bg-purple-100"
                >
                  <Layers className="h-3 w-3" />
                  Buka sebagai Layer Perbandingan
                </button>
              )}
              {(caseData.snapshot || caseData.snapshotUrl) && (
                <button
                  type="button"
                  onClick={handleExportXray}
                  disabled={exportingXray}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 py-2 text-[10px] font-black text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                >
                  {exportingXray
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <ImageIcon className="h-3 w-3" />}
                  Ekspor X-Ray (Gambar)
                </button>
              )}
              <button
                type="button"
                onClick={() => { onPreOpReport(caseData); onClose(); }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2 text-[10px] font-black text-blue-700"
              >
                <FileText className="h-3 w-3" />
                Laporan Pre-Op (PDF)
              </button>
              <button
                type="button"
                onClick={() => { onFullReport(caseData); onClose(); }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 py-2 text-[10px] font-black text-sky-700"
              >
                <Download className="h-3 w-3" />
                Laporan Lengkap PDF
              </button>
              {onCompare && (
                <button
                  type="button"
                  onClick={() => { onCompare(caseData); onClose(); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-2 text-[10px] font-black text-violet-700"
                >
                  <BarChart2 className="h-3 w-3" />
                  Bandingkan Kasus
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatientCaseManager({ isOpen, onClose, currentSession, onLoadAsLayer }) {
  const [cases, setCases] = useState([]);
  const lastLocalEditRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncOk, setSyncOk] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "pending" | "done"
  const [filterProc, setFilterProc] = useState("all");
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(true);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetailMinimized, setCaseDetailMinimized] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [editCaseMinimized, setEditCaseMinimized] = useState(false);
  const [postOpMinimized, setPostOpMinimized] = useState(false);
  const [postOpCase, setPostOpCase] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [preOpReportCase, setPreOpReportCase] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxName, setLightboxName] = useState(null);
  const [lightboxCaseId, setLightboxCaseId] = useState(null);
  const [compareCases, setCompareCases] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [fullReportCase, setFullReportCase] = useState(null);
  const [importMsg, setImportMsg] = useState(""); // "ok:N" | "err:msg" | ""
  const backupInputRef = useRef(null);
  const hasCloud = Boolean(APPS_SCRIPT_URL);

  useEffect(() => {
    if (!isOpen) { setCloudError(""); setSyncOk(false); return; }
    const cached = loadCases();
    if (cached.length > 0) setCases(cached);
    if (!hasCloud) return;
    // Skip cloud fetch for 60s after a local edit to avoid overwriting unsaved changes
    if (Date.now() - lastLocalEditRef.current < 60_000) return;

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

  // Unique procedure labels for filter dropdown
  const procOptions = Array.from(new Set(cases.map(c => (c.procedure || "").split("(")[0].trim()).filter(Boolean)));

  // Cases that lack post-op data, grouped by days since templating
  const incompleteCases = cases.filter(c => !c.actualImplantLabel && !c.actualSizeNum);
  const incompleteSince7d = incompleteCases.filter(c => {
    const d = (Date.now() - new Date(c.savedAt).getTime()) / 86400000;
    return d >= 7;
  });

  const filtered = cases
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.patientName?.toLowerCase().includes(q) ||
        c.procedure?.toLowerCase().includes(q) ||
        c.imageName?.toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" ? true :
        filterStatus === "pending" ? (!c.actualImplantLabel && !c.actualSizeNum) :
        filterStatus === "done" ? Boolean(c.actualImplantLabel || c.actualSizeNum) :
        true;
      const matchProc = filterProc === "all" ? true :
        (c.procedure || "").toLowerCase().includes(filterProc.toLowerCase());
      return matchSearch && matchStatus && matchProc;
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
        // Cup Assessment
        cupAssessment: currentSession?.cupAssessment || null,
        // Post-op fields start empty
        operationDate: "",
        actualImplantLabel: "",
        actualSizeNum: null,
        postOpHka: null,
        postOpNotes: "",
        postOpPhotos: [],
        postOpUpdatedAt: "",
      };

      if (hasCloud) {
        try {
          const result = await apiCreateCase({
            ...caseData,
            snapshotDataUrl: snapshot,
            cupAssessmentJson: caseData.cupAssessment ? JSON.stringify(caseData.cupAssessment) : "",
            postOpPhotosJson: "[]",
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

  const handleUpdate = useCallback(
    async (id, updatedFields) => {
      // Update local state immediately (optimistic)
      const updated = cases.map((c) =>
        c.id === id ? { ...c, ...updatedFields } : c
      );
      setCases(updated);
      saveCases(updated);
      setEditingCaseId(null);
      lastLocalEditRef.current = Date.now();

      // Sync to cloud if configured
      if (hasCloud) {
        try {
          await apiUpdateCase(id, updatedFields);
          setSyncOk(true);
          setTimeout(() => setSyncOk(false), 2500);
        } catch (err) {
          setCloudError(`Gagal update cloud: ${err.message}`);
          setTimeout(() => setCloudError(""), 4000);
        }
      }
    },
    [cases, hasCloud],
  );

  function handleExportBackup() {
    const slim = cases.map(({ snapshot, ...rest }) => rest);
    const payload = { version: 1, exportedAt: new Date().toISOString(), cases: slim };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zakzav-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function handleImportBackup(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.cases)
        ? parsed.cases
        : null;
      if (!incoming) throw new Error("Format file tidak valid.");
      const existingIds = new Set(cases.map((c) => c.id));
      const newCases = incoming.filter((c) => c?.id && !existingIds.has(c.id));
      const merged = [...newCases, ...cases].slice(0, 200);
      setCases(merged);
      saveCases(merged);
      setImportMsg(`ok:${newCases.length}`);
    } catch (e) {
      setImportMsg(`err:${e.message || "Gagal membaca file"}`);
    }
    setTimeout(() => setImportMsg(""), 4000);
  }

  const selectedCase = cases.find((c) => c.id === selectedCaseId);
  const editCaseData = cases.find((c) => c.id === editingCaseId) ?? null;

  useEffect(() => { setCaseDetailMinimized(false); }, [selectedCaseId]);
  useEffect(() => { setEditCaseMinimized(false); }, [editingCaseId]);
  useEffect(() => { setPostOpMinimized(false); }, [postOpCase?.id]);

  const handleRefresh = useCallback(() => {
    if (!hasCloud || loading) return;
    setLoading(true);
    setCloudError("");
    apiListCases()
      .then((items) => {
        if (items) {
          const mapped = items.map(mapCloudCase);
          setCases(mapped);
          saveCases(mapped);
          setSyncOk(true);
          setTimeout(() => setSyncOk(false), 2500);
        }
      })
      .catch(() => setCloudError("Gagal memuat data dari cloud."))
      .finally(() => setLoading(false));
  }, [hasCloud, loading]);

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
            className="max-h-[94dvh] w-full max-w-[min(100%,780px)] overflow-hidden rounded-t-[28px] rounded-b-[28px] border border-white/60 bg-[#f1f5f9] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px]"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* header */}
            <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-[#1a0d2e] px-4 py-3 shrink-0">
              {/* Icon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-600">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>

              {/* Title + meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-black text-white leading-tight">Kasus Pasien</span>
                  {incompleteCases.length > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[7px] font-black text-white leading-none">
                      {incompleteCases.length} pending
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[9px] text-purple-300/70 leading-tight">
                  <span>{cases.length} kasus</span>
                  <span>·</span>
                  <span>{hasCloud ? "Google Sheets" : "Lokal"}</span>
                  {hasCloud && (
                    loading || syncing
                      ? <Loader2 className="h-2.5 w-2.5 animate-spin text-purple-300" />
                      : syncOk
                        ? <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />
                        : <Cloud className="h-2.5 w-2.5 text-purple-400" />
                  )}
                  {!hasCloud && <CloudOff className="h-2.5 w-2.5 text-purple-500/60" />}
                </div>
              </div>

              {/* Action group */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Utility — hidden on mobile */}
                <div className="hidden sm:flex items-center gap-1">
                  <ThemeToggle />
                  {hasCloud && (
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-purple-200 hover:bg-white/15 disabled:opacity-40 transition"
                      title="Refresh dari cloud"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={cases.length === 0}
                    title="Backup semua kasus ke file JSON"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-purple-200 hover:bg-white/15 disabled:opacity-30 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    title="Restore kasus dari file JSON"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-purple-200 hover:bg-white/15 transition"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={backupInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { handleImportBackup(f); e.target.value = ""; }
                    }}
                  />
                </div>

                {/* Separator */}
                <div className="hidden sm:block h-4 w-px mx-1 bg-purple-400/20" />

                {/* Analitik */}
                {(() => {
                  const isUnlocked = (() => { try { return sessionStorage.getItem("zakzav_analytics_auth_v1") === "1"; } catch { return false; } })();
                  return (
                    <button
                      type="button"
                      onClick={() => setAnalyticsOpen(true)}
                      className="relative flex h-7 w-7 items-center justify-center rounded-full border border-violet-400/20 bg-violet-600/20 text-violet-300 transition hover:bg-violet-600/30"
                      title={isUnlocked ? "Analitik Kasus" : "Analitik Kasus (terkunci)"}
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      {!isUnlocked && (
                        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1a0d2e] ring-1 ring-purple-900/60">
                          <Lock className="h-2 w-2 text-violet-400" />
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Simpan — icon only on mobile, icon+text on desktop */}
                <button
                  type="button"
                  onClick={() => { setShowSaveForm(true); setCloudError(""); }}
                  disabled={syncing}
                  className="flex items-center gap-1 rounded-full bg-purple-600 px-2.5 py-1.5 text-white hover:bg-purple-500 disabled:opacity-50 transition"
                  title="Simpan kasus"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline text-[10px] font-black">Simpan</span>
                </button>

                {/* Profile */}
                <UserProfileBadge className="ml-0.5" />

                {/* Close */}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-purple-200/70 hover:bg-white/15 hover:text-white transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
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

                {/* Backup import status */}
                <AnimatePresence>
                  {importMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 ${
                        importMsg.startsWith("ok:")
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      {importMsg.startsWith("ok:") ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <p className="text-[10px] text-emerald-700">
                            {importMsg.split(":")[1] === "0"
                              ? "Semua kasus sudah ada, tidak ada data baru."
                              : `${importMsg.split(":")[1]} kasus berhasil diimpor.`}
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                          <p className="text-[10px] text-red-700">{importMsg.split(":").slice(1).join(":")}</p>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Notifikasi kasus belum lengkap */}
                <AnimatePresence>
                  {showIncompleteAlert && incompleteSince7d.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-amber-700">
                          {incompleteSince7d.length} kasus belum ada data post-op (≥7 hari)
                        </p>
                        <button
                          type="button"
                          onClick={() => { setFilterStatus("pending"); setShowIncompleteAlert(false); }}
                          className="mt-0.5 text-[9px] font-black text-amber-600 underline underline-offset-2"
                        >
                          Lihat kasus
                        </button>
                      </div>
                      <button type="button" onClick={() => setShowIncompleteAlert(false)}
                        className="shrink-0 text-amber-400 hover:text-amber-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
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

                {/* Filter chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: `Semua (${cases.length})` },
                    { id: "pending", label: `Belum Post-Op (${incompleteCases.length})` },
                    { id: "done", label: `Selesai (${cases.length - incompleteCases.length})` },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setFilterStatus(chip.id)}
                      className={`rounded-full px-2.5 py-1 text-[9px] font-black transition ${
                        filterStatus === chip.id
                          ? "bg-purple-600 text-white"
                          : "border border-slate-200 bg-white/70 text-slate-500 hover:border-purple-300 hover:text-purple-600"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                  {procOptions.length > 1 && (
                    <select
                      value={filterProc}
                      onChange={(e) => setFilterProc(e.target.value)}
                      className="ml-auto rounded-full border border-slate-200 bg-white/70 py-1 pl-2.5 pr-6 text-[9px] text-slate-500 outline-none focus:border-purple-400"
                    >
                      <option value="all">Semua Prosedur</option>
                      {procOptions.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Edit Case — handled as modal, rendered via portal below */}

                {/* Minimized restore chips */}
                <AnimatePresence>
                  {selectedCase && caseDetailMinimized && !editingCaseId && (
                    <motion.button
                      key="restore-detail"
                      type="button"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      onClick={() => setCaseDetailMinimized(false)}
                      className="flex w-full items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-3 py-2 text-[10px] font-black text-purple-700 hover:bg-purple-100"
                    >
                      <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Detail: {selectedCase.patientName}</span>
                      <X className="ml-auto h-3 w-3 shrink-0 opacity-50" onClick={(e) => { e.stopPropagation(); setSelectedCaseId(null); setCaseDetailMinimized(false); }} />
                    </motion.button>
                  )}
                  {editingCaseId && editCaseMinimized && (
                    <motion.button
                      key="restore-edit"
                      type="button"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      onClick={() => setEditCaseMinimized(false)}
                      className="flex w-full items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700 hover:bg-amber-100"
                    >
                      <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Edit: {editCaseData?.patientName}</span>
                      <X className="ml-auto h-3 w-3 shrink-0 opacity-50" onClick={(e) => { e.stopPropagation(); setEditingCaseId(null); setEditCaseMinimized(false); }} />
                    </motion.button>
                  )}
                  {postOpCase && postOpMinimized && (
                    <motion.button
                      key="restore-postop"
                      type="button"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      onClick={() => setPostOpMinimized(false)}
                      className="flex w-full items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
                    >
                      <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Post-Op: {postOpCase.patientName}</span>
                      <X className="ml-auto h-3 w-3 shrink-0 opacity-50" onClick={(e) => { e.stopPropagation(); setPostOpCase(null); setPostOpMinimized(false); }} />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Selected case — handled as modal portal below */}

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
                    ) : filterStatus !== "all" ? (
                      <>
                        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-xs text-slate-400">Tidak ada kasus dengan filter ini</p>
                        <button type="button" onClick={() => { setFilterStatus("all"); setFilterProc("all"); }}
                          className="mt-2 text-[10px] font-black text-purple-500 underline">Reset filter</button>
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
                    {/* Skeleton saat loading awal dari cloud */}
                    {loading && cases.length === 0 ? (
                      <>
                        <div className="h-2.5 w-16 rounded-full bg-slate-200 animate-pulse" />
                        {Array.from({ length: 4 }).map((_, i) => (
                          <CaseCardSkeleton key={i} />
                        ))}
                      </>
                    ) : (
                      <>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {filtered.length} kasus
                        </p>
                        <AnimatePresence>
                          {filtered.map((c) => (
                            <CaseCard
                              key={c.id}
                              c={c}
                              onSelect={(c) => setSelectedCaseId(c.id === selectedCaseId ? null : c.id)}
                              onDelete={(id) => setDeleteTarget(cases.find(c => c.id === id) || null)}
                              selected={c.id === selectedCaseId}
                              onUpdateSnapshot={(id, dataUrl) => {
                                setCases(prev => {
                                  const updated = prev.map(x => x.id === id ? { ...x, snapshot: dataUrl } : x);
                                  saveCases(updated);
                                  return updated;
                                });
                              }}
                            />
                          ))}
                        </AnimatePresence>
                      </>
                    )}
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
      {/* ── Edit Case Modal — portal terpisah ── */}
      {createPortal(
        <EditCaseModal
          isOpen={Boolean(editingCaseId) && !editCaseMinimized}
          caseData={editCaseData}
          onSave={(fields) => handleUpdate(editingCaseId, fields)}
          onClose={() => { setEditingCaseId(null); setEditCaseMinimized(false); }}
          onMinimize={() => setEditCaseMinimized(true)}
        />,
        document.body
      )}
      {/* ── Case Detail Modal — portal terpisah ── */}
      {createPortal(
        <CaseDetailModal
          caseData={
            selectedCase &&
            !caseDetailMinimized &&
            !(editingCaseId && !editCaseMinimized) &&
            !(postOpCase && !postOpMinimized)
              ? selectedCase : null
          }
          onClose={() => { setSelectedCaseId(null); setCaseDetailMinimized(false); }}
          onMinimize={() => setCaseDetailMinimized(true)}
          onEdit={(id) => { setEditingCaseId(id); }}
          onPostOp={(c) => { setPostOpCase(c); }}
          onLoadAsLayer={onLoadAsLayer}
          onPreOpReport={(c) => setPreOpReportCase(c)}
          onFullReport={(c) => setFullReportCase(c)}
          onCompare={(c) => setCompareCases([c])}
          onLightbox={(src, name, caseId) => { setLightboxSrc(src); setLightboxName(name); setLightboxCaseId(caseId ?? null); }}
        />,
        document.body
      )}
      <PostOpDataModal
        isOpen={Boolean(postOpCase) && !postOpMinimized}
        onClose={() => { setPostOpCase(null); setPostOpMinimized(false); }}
        onMinimize={() => setPostOpMinimized(true)}
        patientCase={postOpCase}
        onSaved={(id, updatedData) => {
          setPostOpCase(null);
          if (updatedData) {
            setCases(prev => {
              const next = prev.map(c => c.id === id ? { ...c, ...updatedData } : c);
              // Jangan simpan dataURL ke localStorage — terlalu besar, bisa corrupt
              // Hanya Drive URLs (http/https) yang di-persist
              saveCases(next.map(c => ({
                ...c,
                postOpPhotos: (c.postOpPhotos || []).filter(
                  p => typeof p === "string" && p.startsWith("http")
                ),
              })));
              return next; // In-memory tetap punya dataURL untuk tampil sesi ini
            });
          }
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
        cases={cases}
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
      <CaseFullReportModal
        isOpen={Boolean(fullReportCase)}
        onClose={() => setFullReportCase(null)}
        caseData={fullReportCase}
      />
      <CaseCompareModal
        isOpen={Boolean(compareCases)}
        onClose={() => setCompareCases(null)}
        cases={cases}
        initialCase={compareCases?.[0] || null}
      />
      <DeleteConfirmModal
        caseData={deleteTarget}
        onConfirm={() => { handleDelete(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
      {showSaveForm && (
        <SaveForm
          currentSession={currentSession}
          onSave={handleSave}
          onCancel={() => setShowSaveForm(false)}
        />
      )}
      <AnimatePresence>
        {lightboxSrc && (
          <ImagePreviewLightbox
            src={lightboxSrc}
            patientName={lightboxName}
            onClose={() => { setLightboxSrc(null); setLightboxName(null); setLightboxCaseId(null); }}
            onReplaceSnapshot={(dataUrl) => {
              if (!lightboxCaseId) return;
              setCases(prev => {
                const updated = prev.map(c => c.id === lightboxCaseId ? { ...c, snapshot: dataUrl } : c);
                saveCases(updated);
                return updated;
              });
              setLightboxSrc(dataUrl);
            }}
          />
        )}
      </AnimatePresence>
      <SyncingToast syncing={syncing} />
    </>
  );
}
