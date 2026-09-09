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
  Home,
  Layers,
  Search,
  Download,
  Upload,
  Clock,
  ChevronLeft,
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
  LayoutTemplate,
  LogOut,
  Settings,
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
    return true;
  } catch {
    return false;
  }
}

function mergeCloudAndLocalCases(localCases, cloudCases) {
  const remoteIds = new Set(cloudCases.map((item) => item.id));
  const localOnly = localCases.filter(
    (item) => item?.id && !remoteIds.has(item.id) && !item._cloud,
  );
  return [...cloudCases, ...localOnly]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 200);
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
  const url = `/api/google-sheet-images?url=${encodeURIComponent(APPS_SCRIPT_URL)}&action=list_patient_cases`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json?.ok || !json?.remote?.ok) {
    throw new Error(json?.remote?.error || json?.error || "Gagal memuat kasus dari cloud.");
  }
  return Array.isArray(json.remote.items) ? json.remote.items : [];
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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`hidden min-h-[70px] grid-cols-[34px_62px_minmax(150px,1.25fr)_minmax(120px,.9fr)_minmax(140px,1fr)_92px_96px_98px] items-center gap-2 rounded-lg border px-2 transition sm:grid ${
          selected
            ? "border-violet-500 bg-violet-500/10"
            : "border-slate-700/80 bg-[#111d2d] hover:border-slate-600 hover:bg-[#142236]"
        }`}
      >
        <button type="button" onClick={() => onSelect(c)} aria-label={`Pilih kasus ${c.patientName || "pasien"}`} className={`grid h-5 w-5 place-items-center rounded border text-[10px] ${selected ? "border-violet-400 bg-violet-600 text-white" : "border-slate-600 text-transparent"}`}>✓</button>
        <button type="button" onClick={() => thumbnail ? setShowPreview(true) : onSelect(c)} className="h-14 overflow-hidden rounded bg-slate-950" aria-label="Preview X-ray">
          {thumbnail ? <img src={thumbnail} alt="X-ray" className="h-full w-full object-cover" /> : <Activity className="mx-auto h-full w-5 text-slate-600" />}
        </button>
        <button type="button" onClick={() => onSelect(c)} className="min-w-0 text-left">
          <strong className="block truncate text-[11px] text-slate-100">{c.patientName || "Pasien Tanpa Nama"}</strong>
          <small className="mt-1 block truncate text-[9px] text-slate-500">{c.imageName || `${c.measurementCount || 0} pengukuran`}</small>
        </button>
        <div className="min-w-0"><span className="inline-flex rounded bg-slate-700 px-2 py-1 text-[9px] font-black text-slate-200">{getProcType(c.procedure)?.toUpperCase() || "OTHER"}</span><small className="mt-1 block truncate text-[8px] text-slate-500">{c.procedure || "Belum ada prosedur"}</small></div>
        <div className="min-w-0"><span className="block truncate text-[9px] text-slate-300">{c.implantLabel || "Belum ada implant"}</span><small className="mt-1 block text-[8px] text-slate-500">{c.templateCount || 0} template</small></div>
        <span className={`inline-flex min-h-8 items-center justify-center rounded-md px-2 text-[9px] font-black ${c.actualImplantLabel || c.actualSizeNum ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"}`}>{c.actualImplantLabel || c.actualSizeNum ? "Post-Op ✓" : "Planning"}</span>
        <div><span className="block text-[9px] text-slate-300">{timeAgo(c.savedAt)}</span><small className="mt-1 block text-[8px] text-slate-500">{formatDate(c.savedAt).split(",")[0]}</small></div>
        <div className="flex items-center gap-1"><button type="button" onClick={() => onSelect(c)} className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 text-[9px] font-black text-slate-200 hover:border-violet-500 hover:text-white"><FolderOpen size={13} />Buka</button><button type="button" onClick={() => onDelete(c.id)} className="grid h-9 w-9 place-items-center rounded-md bg-slate-800 text-slate-500 hover:bg-red-500/15 hover:text-red-400" aria-label="Hapus kasus"><Trash2 size={13} /></button></div>
      </motion.div>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`group relative overflow-hidden rounded-lg border transition-all sm:hidden ${
          selected
            ? "border-violet-500 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]"
            : "border-slate-700/80 bg-[#111d2d] hover:border-slate-600 hover:bg-[#142236]"
        }`}
      >
        <div className="flex items-stretch gap-0">

          {/* thumbnail */}
          <div className="relative flex h-full w-20 shrink-0 flex-col overflow-hidden bg-slate-950 sm:w-24">
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
                  className={`absolute left-0 right-0 top-0 flex flex-col items-center justify-center gap-1 bg-slate-950/20 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 ${c.postOpPhotos?.length > 0 ? "bottom-[28px]" : "bottom-0"}`}
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
              className="flex min-h-20 min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5 text-left"
          >
            {/* Row 1: name + badges */}
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-black text-slate-100">
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
            <p className="truncate text-[9px] text-slate-400">{c.procedure || "Belum ada prosedur"}</p>
            {/* Row 3: pre-op component chips (max 2) */}
            {c.implantLabel && (
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {c.implantLabel.split(" · ").slice(0, 2).map((part, i) => (
                  <span key={i} className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[8px] text-slate-300">
                    {part.trim()}
                  </span>
                ))}
                {c.implantLabel.split(" · ").length > 2 && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] text-slate-400">
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
              className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-slate-400 opacity-100 transition hover:bg-red-500/15 hover:text-red-400 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100"
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--soft-text)" }}>Nama Pasien</span>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nama pasien"
                  autoFocus
                  className="w-full rounded-xl border px-2.5 py-2 text-base outline-none transition focus:ring-2 sm:text-xs"
                  style={{ borderColor: "var(--soft-border)", background: "var(--soft-inset-bg)", color: "var(--soft-text-hi)" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--soft-text)" }}>Prosedur</span>
                <select
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  className="w-full rounded-xl border px-2.5 py-2 text-base outline-none transition focus:ring-2 sm:text-xs"
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
                        className="w-full rounded-lg border px-2 py-1.5 text-base outline-none transition sm:text-xs"
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
                className="w-full rounded-xl border px-2.5 py-2 text-base outline-none transition sm:text-xs"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-base text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 sm:text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Prosedur</span>
                  <select
                    value={procedure}
                    onChange={(e) => { setProcedure(e.target.value); setPreOpSizes({}); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-base text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 sm:text-xs"
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
                          className="w-full rounded-lg border border-amber-100 bg-white px-2 py-2 text-base text-slate-800 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-100 sm:text-xs"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-base text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 sm:text-xs"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-base text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 sm:text-xs"
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

function LegacyCaseDetailModal({ caseData, onClose, onMinimize, onEdit, onPostOp, onLoadAsLayer, onPreOpReport, onFullReport, onCompare, onLightbox }) {
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

function CaseDetailModal({ caseData, onClose, onMinimize, onEdit, onPostOp, onLoadAsLayer, onPreOpReport, onFullReport, onCompare, onLightbox, onDelete }) {
  const [activeTab, setActiveTab] = useState("preop");
  const [activeImage, setActiveImage] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setActiveTab("preop");
    setActiveImage(0);
  }, [caseData?.id]);

  if (!caseData) return null;

  const preOpSrc = snapshotSrc(caseData.snapshot || caseData.snapshotUrl || null);
  const postOpSources = (caseData.postOpPhotos || []).map(snapshotSrc).filter(Boolean);
  const hasPostOp = Boolean(caseData.actualImplantLabel || caseData.actualSizeNum != null || postOpSources.length);
  const components = (caseData.implantLabel || "")
    .split(" · ")
    .map((item) => item.trim())
    .filter(Boolean);
  const anatomySide = caseData.cupAssessment?.side || caseData.hkaSummary?.[0]?.side || "-";
  const patientId = String(caseData.id || "-").replace(/^case-/, "").slice(0, 18);
  const availableImages = [preOpSrc, ...postOpSources].filter(Boolean);
  const shownImage = availableImages[Math.min(activeImage, Math.max(availableImages.length - 1, 0))] || null;
  const selectedPostIndex = Math.max(0, Math.min(activeImage - 1, Math.max(postOpSources.length - 1, 0)));
  const displayImage = activeTab === "postop" ? postOpSources[selectedPostIndex] || null : shownImage;

  async function exportXray() {
    const source = displayImage || preOpSrc;
    if (!source) return;
    setExporting(true);
    try {
      let href = source;
      let extension = source.startsWith("data:image/png") ? "png" : "jpg";
      if (!source.startsWith("data:")) {
        const proxyUrl = source.startsWith("http")
          ? `/api/google-drive-image?src=${encodeURIComponent(source)}`
          : source;
        const response = await fetch(proxyUrl);
        const blob = await response.blob();
        href = URL.createObjectURL(blob);
        extension = blob.type.includes("png") ? "png" : "jpg";
      }
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${(caseData.patientName || "xray").replace(/[^a-zA-Z0-9]/g, "-")}-xray.${extension}`;
      anchor.click();
      if (!source.startsWith("data:")) setTimeout(() => URL.revokeObjectURL(href), 1500);
    } finally {
      setExporting(false);
    }
  }

  const tabItems = [
    { id: "preop", label: "Pre-Op" },
    { id: "postop", label: "Post-Op" },
    { id: "compare", label: "Perbandingan" },
    { id: "report", label: "Laporan" },
    { id: "history", label: "Riwayat" },
  ];

  const InfoRow = ({ label, value }) => (
    <div className="grid grid-cols-[92px_1fr] gap-3 py-1.5 text-[11px]">
      <span className="text-slate-400">{label}</span>
      <strong className="break-words font-semibold text-slate-100">{value || "-"}</strong>
    </div>
  );

  const ActionButton = ({ icon: Icon, title, subtitle, accent = "default", onClick, disabled }) => {
    const accents = {
      primary: "border-violet-500 bg-violet-600 text-white hover:bg-violet-500",
      success: "border-emerald-500/70 bg-emerald-600/80 text-white hover:bg-emerald-500",
      danger: "border-red-500/50 bg-red-500/5 text-red-300 hover:bg-red-500/15",
      default: "border-slate-700 bg-[#101c2d] text-slate-200 hover:border-slate-500",
    };
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left transition disabled:opacity-40 ${accents[accent]}`}>
        <Icon size={17} className="shrink-0" />
        <span className="min-w-0 flex-1"><strong className="block truncate text-[11px]">{title}</strong>{subtitle && <small className="block truncate text-[9px] opacity-65">{subtitle}</small>}</span>
        <ChevronRight size={14} className="shrink-0 opacity-70" />
      </button>
    );
  };

  return createPortal(
    <AnimatePresence>
      <motion.div key="case-preview-v2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[9990] flex items-end justify-center bg-[#020611]/85 backdrop-blur-md sm:items-center sm:p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail kasus ${caseData.patientName || "pasien"}`}
          initial={{ y: 40, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 30, scale: 0.98, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
          className="flex h-[96dvh] w-full max-w-[1180px] flex-col overflow-hidden rounded-t-2xl border border-violet-500/40 bg-[#07111e] text-slate-100 shadow-[0_24px_90px_rgba(0,0,0,.65)] sm:h-[92dvh] sm:rounded-xl"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-700/80 px-3 py-3 sm:px-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-600/25 text-violet-300"><Activity size={20} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-black sm:text-xl">{caseData.patientName || "Pasien Tanpa Nama"}</h2><span className="rounded-full border border-slate-600 px-2 py-0.5 text-[8px] text-slate-400">ID: {patientId}</span></div>
              <p className="truncate text-[10px] text-slate-400 sm:text-xs">{caseData.procedure || "Prosedur belum dipilih"}</p>
            </div>
            <span className={`hidden min-h-9 items-center rounded-lg px-3 text-[10px] font-black sm:flex ${hasPostOp ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-600/25 text-emerald-300"}`}>{hasPostOp ? "Post-Op" : "Planning"}</span>
            <div className="hidden border-l border-slate-700 pl-3 text-[9px] text-slate-400 md:block"><span className="block">Terakhir diubah</span><strong className="text-slate-200">{formatDate(caseData.savedAt)}</strong></div>
            <button type="button" onClick={onMinimize} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700" aria-label="Minimalkan"><Minus size={15} /></button>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-300" aria-label="Tutup"><X size={16} /></button>
          </header>

          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-800 px-3 py-2 sm:px-5" aria-label="Bagian detail kasus">
            {tabItems.map((item) => <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`min-h-10 shrink-0 rounded-md border px-4 text-[10px] font-black transition ${activeTab === item.id ? "border-violet-400 bg-violet-600 text-white" : "border-slate-700 bg-[#0c1727] text-slate-400 hover:text-white"}`}>{item.label}</button>)}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid min-h-full gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_310px] lg:p-4">
              <main className="min-w-0 space-y-3">
                <section className="overflow-hidden rounded-lg border border-slate-700 bg-black">
                  {activeTab === "compare" && preOpSrc && postOpSources.length ? (
                    <div className="grid min-h-[320px] grid-cols-2 divide-x divide-slate-700 sm:min-h-[440px]">
                      <button type="button" onClick={() => onLightbox(preOpSrc, caseData.patientName, caseData.id)} className="relative overflow-hidden"><img src={preOpSrc} alt="Pre-Op" className="h-full w-full object-contain" /><span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-[9px] font-black">Pre-Op</span></button>
                      <button type="button" onClick={() => onLightbox(postOpSources[0], caseData.patientName, null)} className="relative overflow-hidden"><img src={postOpSources[0]} alt="Post-Op" className="h-full w-full object-contain" /><span className="absolute left-3 top-3 rounded-full bg-emerald-600/90 px-3 py-1 text-[9px] font-black">Post-Op</span></button>
                    </div>
                  ) : activeTab === "history" ? (
                    <div className="grid min-h-[320px] place-items-center p-8 text-center"><div><Clock className="mx-auto mb-3 text-violet-400" /><strong className="block text-sm">Riwayat Kasus</strong><p className="mt-2 text-[11px] text-slate-400">Kasus dibuat atau terakhir diperbarui pada {formatDate(caseData.savedAt)}.</p></div></div>
                  ) : activeTab === "report" ? (
                    <div className="grid min-h-[320px] place-items-center p-8 text-center"><div><FileText className="mx-auto mb-3 text-violet-400" /><strong className="block text-sm">Laporan Templating</strong><p className="mt-2 text-[11px] text-slate-400">Gunakan Quick Actions untuk membuat laporan Pre-Op atau laporan lengkap.</p></div></div>
                  ) : (
                    <div className="relative grid min-h-[320px] place-items-center sm:min-h-[440px]">
                      {displayImage ? <button type="button" onClick={() => onLightbox(displayImage, caseData.patientName, activeTab === "preop" ? caseData.id : null)} className="absolute inset-0"><img src={displayImage} alt="Preview X-ray" className="h-full w-full object-contain" /></button> : <div className="text-center text-slate-600"><ImageIcon className="mx-auto mb-2" /><p className="text-xs">Belum ada gambar {activeTab === "postop" ? "Post-Op" : ""}</p></div>}
                      <span className="absolute left-3 top-3 rounded-full border border-slate-600 bg-slate-950/80 px-3 py-1 text-[9px] font-black">{activeTab === "postop" ? "Post-Op" : "Pre-Op"}</span>
                      {displayImage && <button type="button" onClick={() => onLightbox(displayImage, caseData.patientName, activeTab === "preop" ? caseData.id : null)} className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-lg bg-slate-950/80 text-white" aria-label="Perbesar gambar"><Maximize2 size={16} /></button>}
                    </div>
                  )}
                  {availableImages.length > 0 && activeTab !== "history" && activeTab !== "report" && <div className="flex gap-2 overflow-x-auto border-t border-slate-800 bg-[#08111f] p-2">{availableImages.map((source, index) => <button key={`${source.slice(0, 24)}-${index}`} type="button" onClick={() => { setActiveImage(index); setActiveTab(index === 0 ? "preop" : "postop"); }} className={`relative h-14 w-16 shrink-0 overflow-hidden rounded border-2 ${activeImage === index ? "border-violet-500" : "border-slate-700"}`}><img src={source} alt={index === 0 ? "Pre-Op" : `Post-Op ${index}`} className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-[7px] font-black">{index === 0 ? "PRE" : `POST ${index}`}</span></button>)}</div>}
                </section>

                <section className="rounded-lg border border-slate-700 bg-[#0b1727] p-3">
                  <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-black">Hasil Templating (Pre-Op)</h3><button type="button" onClick={() => onEdit(caseData.id)} className="flex min-h-9 items-center gap-1 rounded-md border border-slate-600 px-3 text-[9px] font-black text-slate-300"><Pencil size={12} /> Edit</button></div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{(components.length ? components : ["Belum ada implant"]).slice(0, 4).map((component, index) => <div key={`${component}-${index}`} className="rounded-md border border-slate-700 bg-[#101c2d] p-3"><small className="text-[8px] uppercase text-slate-500">Komponen {index + 1}</small><strong className="mt-1 block text-xs text-slate-100">{component}</strong></div>)}{caseData.preOpSizeNum != null && <div className="rounded-md border border-violet-500/30 bg-violet-500/10 p-3"><small className="text-[8px] uppercase text-violet-300">Ukuran Primer</small><strong className="mt-1 block text-lg text-violet-300">{caseData.preOpSizeNum}</strong></div>}</div>
                </section>

                <section className="rounded-lg border border-slate-700 bg-[#0b1727] p-3"><h3 className="mb-2 text-xs font-black">Catatan</h3><p className="min-h-14 rounded-md border border-slate-700 bg-[#101c2d] p-3 text-[10px] leading-relaxed text-slate-400">{caseData.notes || "Belum ada catatan untuk kasus ini."}</p></section>
              </main>

              <aside className="space-y-3">
                <section className="rounded-lg border border-slate-700 bg-[#0b1727] p-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black">Informasi Pasien</h3><button type="button" onClick={() => onEdit(caseData.id)} className="flex min-h-9 items-center gap-1 rounded-md border border-slate-600 px-3 text-[9px]"><Pencil size={12} /> Edit</button></div><InfoRow label="Nama" value={caseData.patientName} /><InfoRow label="Umur" value={caseData.patientAge} /><InfoRow label="Jenis Kelamin" value={caseData.gender} /><InfoRow label="ID Pasien" value={patientId} /></section>
                <section className="rounded-lg border border-slate-700 bg-[#0b1727] p-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black">Detail Prosedur</h3><button type="button" onClick={() => onEdit(caseData.id)} className="flex min-h-9 items-center gap-1 rounded-md border border-slate-600 px-3 text-[9px]"><Pencil size={12} /> Edit</button></div><InfoRow label="Prosedur" value={caseData.procedure} /><InfoRow label="Templating" value={formatDate(caseData.savedAt)} /><InfoRow label="Sisi" value={anatomySide === "left" ? "Left (L)" : anatomySide === "right" ? "Right (R)" : anatomySide} /><InfoRow label="Status" value={hasPostOp ? "Post-Op" : "Planning"} /></section>
                <section className="rounded-lg border border-slate-700 bg-[#0b1727] p-3"><h3 className="mb-3 text-sm font-black">Quick Actions</h3><div className="space-y-2">
                  {onLoadAsLayer && preOpSrc && <ActionButton icon={ImageIcon} title="Buka di Templating" subtitle="Lanjutkan perencanaan kasus ini" accent="primary" onClick={() => { onLoadAsLayer(preOpSrc, `${caseData.patientName || "Kasus"} - ${caseData.procedure || ""}`); onClose(); }} />}
                  <ActionButton icon={ClipboardCheck} title={hasPostOp ? "Edit Data Post-Op" : "Input Data Post-Op"} subtitle="Tambahkan hasil post-operative" accent="success" onClick={() => onPostOp(caseData)} />
                  {onLoadAsLayer && preOpSrc && <ActionButton icon={Layers} title="Buka sebagai Layer Perbandingan" subtitle="Bandingkan dengan kasus lain" onClick={() => { onLoadAsLayer(preOpSrc, `${caseData.patientName || "Kasus"} - Perbandingan`); onClose(); }} />}
                  <ActionButton icon={ImageIcon} title="Ekspor X-Ray (Gambar)" subtitle="Simpan sebagai PNG/JPG" onClick={exportXray} disabled={!shownImage || exporting} />
                  <ActionButton icon={FileText} title="Laporan Pre-Op (PDF)" subtitle="Generate laporan templating" onClick={() => { onPreOpReport(caseData); onClose(); }} />
                  <ActionButton icon={Download} title="Laporan Lengkap PDF" subtitle="Pre-Op, Post-Op, dan perbandingan" onClick={() => { onFullReport(caseData); onClose(); }} />
                  {onCompare && <ActionButton icon={BarChart2} title="Bandingkan Kasus" subtitle="Buka mode perbandingan" onClick={() => { onCompare(caseData); onClose(); }} />}
                  {onDelete && <ActionButton icon={Trash2} title="Hapus Kasus" subtitle="Kasus akan dipindahkan ke trash" accent="danger" onClick={() => { onDelete(caseData); onClose(); }} />}
                </div></section>
              </aside>
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between border-t border-slate-800 bg-[#0a1422] px-4 py-2"><strong className="text-xs">ZakZav</strong><span className="hidden text-[9px] text-slate-500 sm:block">Plan Better. Treat Better.</span><button type="button" onClick={onClose} className="min-h-9 rounded-md border border-slate-700 bg-slate-800 px-5 text-[10px] font-black">Tutup</button></footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
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
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
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
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

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
          setCases((current) => {
            const merged = mergeCloudAndLocalCases(current, mapped);
            saveCases(merged);
            return merged;
          });
        }
      })
      .catch((error) => setCloudError(error.message || "Gagal memuat kasus dari cloud."))
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
    .sort((a, b) => {
      if (sortOrder === "oldest") return new Date(a.savedAt) - new Date(b.savedAt);
      if (sortOrder === "name") return (a.patientName || "").localeCompare(b.patientName || "", "id");
      return new Date(b.savedAt) - new Date(a.savedAt);
    });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedCases = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterProc, sortOrder]);

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
      if (!saveCases(updated) && !caseData._cloud) {
        setCloudError("Penyimpanan browser penuh. Kasus masih aktif di memori, tetapi belum tersimpan permanen.");
      }
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
          setCases((current) => {
            const merged = mergeCloudAndLocalCases(current, mapped);
            saveCases(merged);
            return merged;
          });
          setSyncOk(true);
          setTimeout(() => setSyncOk(false), 2500);
        }
      })
      .catch((error) => setCloudError(error.message || "Gagal memuat data dari cloud."))
      .finally(() => setLoading(false));
  }, [hasCloud, loading]);

  if (typeof document === "undefined") return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Kasus Pasien"
            className="flex h-[100dvh] w-full overflow-hidden border border-slate-700 bg-[#08111f] text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:h-auto sm:max-h-[94dvh] sm:max-w-[1440px] sm:rounded-xl"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            <aside className="hidden w-[220px] shrink-0 flex-col border-r border-slate-800 bg-[#07111e] lg:flex">
              <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-lg font-black">Z</span>
                <div><strong className="block text-base text-white">ZakZav</strong><small className="text-[9px] text-slate-500">Plan. Measure. Compare.</small></div>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navigasi kasus">
                <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"><Home size={17} />Dashboard</button>
                <button type="button" className="flex min-h-11 items-center gap-3 rounded-lg bg-violet-600/25 px-3 text-left text-xs font-black text-violet-200 ring-1 ring-violet-500/30"><FolderOpen size={17} />Kasus Pasien<span className="ml-auto rounded-full border border-violet-400/50 px-2 py-0.5 text-[9px]">{cases.length}</span></button>
                <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"><LayoutTemplate size={17} />Template</button>
                <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"><Activity size={17} />Pengukuran</button>
                <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"><Layers size={17} />Implant Library</button>
                <button type="button" disabled={cases.length < 2} onClick={() => setCompareCases(cases.slice(0, 2))} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-35"><ClipboardCheck size={17} />Compare</button>
                <button type="button" disabled={!selectedCase && !cases[0]} onClick={() => setFullReportCase(selectedCase || cases[0])} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-35"><FileText size={17} />Laporan</button>
                <button type="button" onClick={handleExportBackup} disabled={!cases.length} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-35"><Settings size={17} />Backup Data</button>
              </nav>
              <div className="border-t border-slate-800 p-4">
                <div className="flex items-center gap-2"><UserProfileBadge /><div className="min-w-0"><strong className="block truncate text-[11px] text-slate-200">zakzav</strong><small className="text-[9px] text-slate-500">Clinical workspace</small></div></div>
                <button type="button" onClick={onClose} className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-[10px] font-semibold text-slate-500 hover:bg-slate-800 hover:text-slate-200"><LogOut size={15} />Kembali ke workspace</button>
              </div>
            </aside>
            <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* header */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-700/80 bg-[#0b1627] px-3 py-3 sm:px-5">
              {/* Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600">
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
                <div className="mt-0.5 flex items-center gap-1 text-[9px] leading-tight text-slate-400">
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

              <div className="relative hidden w-[min(36vw,440px)] xl:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pasien, prosedur, atau tanggal..." className="h-11 w-full rounded-lg border border-slate-700 bg-[#07111e] pl-10 pr-12 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500" />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-800 px-2 py-1 text-[9px] text-slate-400">⌘ K</kbd>
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
                  className="flex min-h-10 items-center gap-1 rounded-md bg-violet-600 px-3 py-2 text-white transition hover:bg-violet-500 disabled:opacity-50 sm:px-5"
                  title="Simpan kasus"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline text-[10px] font-black">Kasus Baru</span>
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-4 px-3 py-4 sm:px-5 sm:py-5 xl:pr-[270px]">

                {/* Cloud error */}
                <AnimatePresence>
                  {cloudError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5"
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1"><p className="text-[10px] text-amber-200">{cloudError}</p>
                        {hasCloud && <button type="button" onClick={handleRefresh} disabled={loading} className="mt-1 text-[9px] font-black text-amber-300 underline disabled:opacity-40">Coba lagi</button>}
                      </div>
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
                <div className="relative xl:hidden">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari pasien, prosedur, atau gambar..."
                    className="min-h-11 w-full rounded-lg border border-slate-700 bg-[#0d192a] py-2 pl-10 pr-9 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-500 sm:text-xs"
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
                      className={`min-h-9 rounded-md px-3 py-1.5 text-[9px] font-black transition ${
                        filterStatus === chip.id
                          ? "bg-violet-600 text-white"
                          : "border border-slate-700 bg-[#101c2d] text-slate-400 hover:border-violet-500 hover:text-slate-100"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                  {procOptions.length > 1 && (
                    <select
                      value={filterProc}
                      onChange={(e) => setFilterProc(e.target.value)}
                      className="ml-auto min-h-9 rounded-md border border-slate-700 bg-[#101c2d] py-1 pl-2.5 pr-6 text-base text-slate-300 outline-none focus:border-violet-500 sm:text-[9px]"
                    >
                      <option value="all">Semua Prosedur</option>
                      {procOptions.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    aria-label="Urutkan kasus"
                    className={`${procOptions.length <= 1 ? "ml-auto" : ""} min-h-9 rounded-md border border-slate-700 bg-[#101c2d] py-1 pl-2.5 pr-6 text-base text-slate-300 outline-none focus:border-violet-500 sm:text-[9px]`}
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                    <option value="name">Nama A-Z</option>
                  </select>
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
                        <div className="hidden grid-cols-[34px_62px_minmax(150px,1.25fr)_minmax(120px,.9fr)_minmax(140px,1fr)_92px_96px_98px] gap-2 px-2 text-[8px] font-black uppercase tracking-wider text-slate-500 sm:grid">
                          <span aria-hidden="true" /><span>Foto</span><span>Pasien</span><span>Prosedur</span><span>Implant / Ukuran</span><span>Status</span><span>Tanggal</span><span>Aksi</span>
                        </div>
                        <AnimatePresence>
                          {pagedCases.map((c) => (
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
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                          <p className="text-[9px] text-slate-500">
                            Menampilkan {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filtered.length)} dari {filtered.length} kasus
                          </p>
                          <div className="flex items-center gap-1" aria-label="Navigasi halaman">
                            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="grid h-9 w-9 place-items-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-30" aria-label="Halaman sebelumnya"><ChevronLeft size={14} /></button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                              const start = Math.min(Math.max(1, currentPage - 2), Math.max(1, totalPages - 4));
                              const pageNumber = start + index;
                              return <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`h-9 min-w-9 rounded-md border px-2 text-[10px] font-black ${currentPage === pageNumber ? "border-violet-500 bg-violet-600/20 text-violet-200" : "border-slate-700 bg-slate-800 text-slate-400"}`}>{pageNumber}</button>;
                            })}
                            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="grid h-9 w-9 place-items-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-30" aria-label="Halaman berikutnya"><ChevronRight size={14} /></button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>

            <aside className="absolute right-4 top-[112px] bottom-[58px] hidden w-[238px] overflow-y-auto rounded-lg border border-slate-700 bg-[#0b1727] p-4 shadow-xl xl:block">
              <div className="mb-5 flex items-center justify-between"><strong className="text-sm text-slate-100">Filter Kasus</strong><button type="button" onClick={() => { setFilterStatus("all"); setFilterProc("all"); }} className="text-[9px] text-slate-400 hover:text-white">Reset</button></div>
              <div className="space-y-2"><strong className="text-[11px] text-slate-300">Prosedur</strong>
                <button type="button" onClick={() => setFilterProc("all")} className={`flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-[10px] ${filterProc === "all" ? "bg-violet-600/20 text-violet-200" : "text-slate-400"}`}><span className={`grid h-4 w-4 place-items-center rounded border ${filterProc === "all" ? "border-violet-500 bg-violet-600" : "border-slate-600"}`}>{filterProc === "all" ? "✓" : ""}</span>Semua Prosedur</button>
                {procOptions.map((procedureName) => <button key={`side-${procedureName}`} type="button" onClick={() => setFilterProc(procedureName)} className={`flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-[10px] ${filterProc === procedureName ? "bg-violet-600/20 text-violet-200" : "text-slate-400"}`}><span className={`grid h-4 w-4 place-items-center rounded border ${filterProc === procedureName ? "border-violet-500 bg-violet-600" : "border-slate-600"}`}>{filterProc === procedureName ? "✓" : ""}</span>{procedureName}</button>)}
              </div>
              <div className="my-4 h-px bg-slate-800" />
              <div className="space-y-2"><strong className="text-[11px] text-slate-300">Status</strong>
                {[{ id: "all", label: "Semua Status" }, { id: "pending", label: "Planning / Belum Post-Op" }, { id: "done", label: "Post-Op Selesai" }].map((item) => <button key={`status-${item.id}`} type="button" onClick={() => setFilterStatus(item.id)} className={`flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-[10px] ${filterStatus === item.id ? "bg-violet-600/20 text-violet-200" : "text-slate-400"}`}><span className={`grid h-4 w-4 place-items-center rounded border ${filterStatus === item.id ? "border-violet-500 bg-violet-600" : "border-slate-600"}`}>{filterStatus === item.id ? "✓" : ""}</span>{item.label}</button>)}
              </div>
              <button type="button" className="mt-6 min-h-11 w-full rounded-md bg-violet-600 text-[10px] font-black text-white hover:bg-violet-500">Terapkan Filter</button>
            </aside>

            {/* footer */}
            <div className="shrink-0 border-t border-slate-700/80 bg-[#0b1627] px-3 py-2 sm:px-5">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-md border border-slate-700 bg-slate-800 py-2.5 text-xs font-black text-slate-300 transition hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
            </section>
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
          onDelete={(c) => setDeleteTarget(c)}
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
                setCases((current) => {
                  const merged = mergeCloudAndLocalCases(current, mapped);
                  saveCases(merged);
                  return merged;
                });
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
