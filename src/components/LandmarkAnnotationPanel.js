"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Lightbulb,
  List,
  Loader2,
  MousePointer2,
  RotateCcw,
  Stethoscope,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  LANDMARK_VIEWS,
  SIDE_CONDITION_OPTIONS,
  getViewsByCategory,
  getSideLandmarks,
} from "../data/landmarkDefinitions";
import { buildMLPayload, saveToFirebase, updateFirebaseDoc } from "../lib/landmarkMLSave";
import LandmarkGuide, { GuideContent } from "./LandmarkGuide";

// ── helpers ───────────────────────────────────────────────────────────────────

function getImageRenderBounds(imgEl) {
  if (!imgEl) return null;
  const natW = imgEl.naturalWidth;
  const natH = imgEl.naturalHeight;
  if (!natW || !natH) return null;
  const contW = imgEl.clientWidth;
  const contH = imgEl.clientHeight;
  const scale = Math.min(contW / natW, contH / natH);
  const rendW = natW * scale;
  const rendH = natH * scale;
  return { offsetX: (contW - rendW) / 2, offsetY: (contH - rendH) / 2, rendW, rendH, scale, natW, natH };
}

function screenToImage(event, imgEl) {
  const rect = imgEl.getBoundingClientRect();
  const bounds = getImageRenderBounds(imgEl);
  if (!bounds) return null;
  const relX = event.clientX - rect.left;
  const relY = event.clientY - rect.top;
  const imgX = (relX - bounds.offsetX) / bounds.scale;
  const imgY = (relY - bounds.offsetY) / bounds.scale;
  if (imgX < 0 || imgX > bounds.natW || imgY < 0 || imgY > bounds.natH) return null;
  return { x: Math.round(imgX), y: Math.round(imgY) };
}

function imageToContainerPx(coord, imgEl) {
  const bounds = getImageRenderBounds(imgEl);
  if (!bounds) return null;
  return { left: bounds.offsetX + coord.x * bounds.scale, top: bounds.offsetY + coord.y * bounds.scale };
}

// ── LandmarkDot ───────────────────────────────────────────────────────────────

function LandmarkDot({ landmark, coord, imgEl, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!imgEl) return;
    const recalc = () => setPos(imageToContainerPx(coord, imgEl));
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(imgEl);
    return () => ro.disconnect();
  }, [coord, imgEl]);

  if (!pos) return null;

  return (
    <div
      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.left, top: pos.top, zIndex: 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center justify-center rounded-full border-2 border-white shadow-lg transition-all"
        style={{ width: hovered ? 20 : 14, height: hovered ? 20 : 14, background: landmark.color, boxShadow: `0 0 0 3px ${landmark.color}40` }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
      </div>

      {hovered && (
        <div className="absolute left-5 top-1/2 z-20 -translate-y-1/2 max-w-[200px] rounded-lg border border-white/20 bg-slate-900/95 px-2 py-1.5 shadow-xl">
          <p className="text-[9px] font-black text-white">{landmark.label}</p>
          <p className="text-[8px] text-slate-400">x:{coord.x} y:{coord.y}</p>
          {landmark.hint && (
            <p className="mt-1 text-[8px] leading-relaxed text-slate-500">{landmark.hint}</p>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(landmark.id); }}
            className="mt-1.5 flex items-center gap-1 text-[8px] text-red-400 hover:text-red-300">
            <Trash2 className="h-2.5 w-2.5" /> hapus
          </button>
        </div>
      )}
    </div>
  );
}

// ── SideConditionPicker ───────────────────────────────────────────────────────

function SideConditionPicker({ sideKey, label, value, onChange }) {
  const current = SIDE_CONDITION_OPTIONS.find((o) => o.key === value);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        {SIDE_CONDITION_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-all"
            style={
              value === opt.key
                ? { background: opt.color + "20", borderColor: opt.color + "60", color: opt.color }
                : { borderColor: "transparent", color: "#64748b" }
            }
          >
            <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: opt.color }} />
            <span className="text-[8px] font-bold leading-tight">{opt.badge}</span>
          </button>
        ))}
      </div>
      {current && (
        <p className="text-[7px] text-slate-600">{current.label}</p>
      )}
    </div>
  );
}

// ── ViewSelector ──────────────────────────────────────────────────────────────

const CATEGORY_META = {
  native:   { label: "Anatomi Asli", color: "#60a5fa" },
  "post-op": { label: "Post Operasi", color: "#f43f5e" },
};

const DIAGNOSIS_PRESETS = [
  "Normal", "OA Grade 1", "OA Grade 2", "OA Grade 3", "OA Grade 4",
  "Fraktur Femur", "Fraktur Asetabulum", "Fraktur Pelvis",
  "Displasia Hip", "AVN (Nekrosis Avaskular)",
  "Infeksi Sendi", "Tumor Tulang", "Lainnya",
];

// Unified condition presets — each maps both sides at once
const CONDITION_PRESETS = [
  { id: "native_both",    label: "Native (Kedua Sisi)", badge: "ASL · ASL", kiri: "native",      kanan: "native",      color: "#60a5fa", group: "native" },
  { id: "tha_kiri",       label: "THA Sisi Kiri",       badge: "THA · ASL", kiri: "thr",         kanan: "native",      color: "#f97316", group: "tha"    },
  { id: "tha_kanan",      label: "THA Sisi Kanan",      badge: "ASL · THA", kiri: "native",      kanan: "thr",         color: "#f97316", group: "tha"    },
  { id: "tha_bilateral",  label: "THA Bilateral",       badge: "THA · THA", kiri: "thr",         kanan: "thr",         color: "#fb923c", group: "tha"    },
  { id: "hemi_kiri",      label: "Hemi Sisi Kiri",      badge: "HMI · ASL", kiri: "hemi",        kanan: "native",      color: "#a78bfa", group: "hemi"   },
  { id: "hemi_kanan",     label: "Hemi Sisi Kanan",     badge: "ASL · HMI", kiri: "native",      kanan: "hemi",        color: "#a78bfa", group: "hemi"   },
  { id: "hemi_bilateral", label: "Hemi Bilateral",      badge: "HMI · HMI", kiri: "hemi",        kanan: "hemi",        color: "#c084fc", group: "hemi"   },
  { id: "cut_kiri",       label: "Kiri Terpotong",      badge: "N/A · ASL", kiri: "not_visible", kanan: "native",      color: "#475569", group: "cut"    },
  { id: "cut_kanan",      label: "Kanan Terpotong",     badge: "ASL · N/A", kiri: "native",      kanan: "not_visible", color: "#475569", group: "cut"    },
];

function ViewSelector({ selectedView, onSelect }) {
  const nativeViews = getViewsByCategory("native");
  const postOpViews = getViewsByCategory("post-op");

  const renderGroup = (views, catKey) => {
    const meta = CATEGORY_META[catKey];
    return (
      <div key={catKey}>
        <div className="mb-1 flex items-center gap-1.5 px-1">
          <div className="h-px flex-1" style={{ background: meta.color + "30" }} />
          <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: meta.color + "99" }}>
            {meta.label}
          </span>
          <div className="h-px flex-1" style={{ background: meta.color + "30" }} />
        </div>
        {views.map((view) => (
          <button key={view.id} type="button" onClick={() => onSelect(view)}
            className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-all"
            style={selectedView.id === view.id
              ? { background: view.color + "22", color: view.color, border: `1px solid ${view.color}40` }
              : { color: "#94a3b8", border: "1px solid transparent" }}>
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: view.color }} />
            <div>
              <p className="text-[10px] font-bold leading-tight">{view.label}</p>
              {view.description && (
                <p className="mt-0.5 text-[8px] font-normal opacity-60 leading-tight">{view.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderGroup(nativeViews, "native")}
      <div className="h-px bg-white/5" />
      {renderGroup(postOpViews, "post-op")}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const DEFAULT_SIDE_CONDITIONS = { kiri: "native", kanan: "native" };

export default function LandmarkAnnotationPanel({
  isOpen, onClose, imageSrc, imageName,
  // edit mode
  editDocId        = null,
  initialViewId    = null,
  initialPlaced    = null,
  initialSideCond  = null,
  initialMLData    = null,
  onSaved          = null,
}) {
  const resolveView = (id) => LANDMARK_VIEWS.find((v) => v.id === id) ?? LANDMARK_VIEWS[0];

  const [selectedView, setSelectedView]     = useState(() => initialViewId ? resolveView(initialViewId) : LANDMARK_VIEWS[0]);
  const [sideConditions, setSideConditions] = useState(initialSideCond ?? DEFAULT_SIDE_CONDITIONS);
  const [activeLandmarkId, setActiveLandmarkId] = useState(null);
  const [placed, setPlaced]                 = useState(initialPlaced ?? {});
  const [notes, setNotes]                   = useState(initialMLData?.notes ?? "");
  const [naturalSize, setNaturalSize]       = useState({ w: 0, h: 0 });
  const [zoom, setZoom]                     = useState(1);
  const [showGuide, setShowGuide]           = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [savedCount, setSavedCount]         = useState(0);
  const [fbSaving, setFbSaving]             = useState(false);
  const [fbStatus, setFbStatus]             = useState(null); // null | "ok" | "error"

  // ── ML Metadata ──────────────────────────────────────────────────────────
  const [imgQuality, setImgQuality] = useState(initialMLData?.image_quality ?? "bagus");
  const [gender,     setGender]     = useState(initialMLData?.patient_gender ?? "tidak_diketahui");
  const [ageGroup,   setAgeGroup]   = useState(initialMLData?.patient_age_group ?? null);
  const [diagnoses,  setDiagnoses]  = useState(initialMLData?.diagnoses ?? []);
  const [viewOpen,        setViewOpen]        = useState(false);
  const [diagInput,       setDiagInput]       = useState("");
  const [diagOpen,        setDiagOpen]        = useState(false);
  const [showMLModal,      setShowMLModal]      = useState(false);
  const [mlSaveMode,       setMlSaveMode]       = useState(false);
  const [conditionPresetId, setConditionPresetId] = useState(() => {
    if (!initialSideCond) return "native_both";
    const preset = CONDITION_PRESETS.find((p) => p.kiri === initialSideCond.kiri && p.kanan === initialSideCond.kanan);
    return preset?.id ?? "native_both";
  });
  const [guideHighlightId, setGuideHighlightId] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const imgRef = useRef(null);

  // Show ML data modal when opening in NEW mode only (not edit mode)
  useEffect(() => {
    if (isOpen) {
      if (!editDocId) setShowMLModal(true);
      setGuideHighlightId(null);
    }
  }, [isOpen, editDocId]);

  // Auto-sync guide highlight to active landmark
  useEffect(() => {
    setGuideHighlightId(activeLandmarkId ?? null);
  }, [activeLandmarkId]);

  // Compute the effective landmark list (static or dynamic)
  const effectiveLandmarks = useMemo(() => {
    if (!selectedView.hasSideCondition) return selectedView.landmarks;
    return [
      ...getSideLandmarks(sideConditions.kiri, "kiri"),
      ...getSideLandmarks(sideConditions.kanan, "kanan"),
    ];
  }, [selectedView, sideConditions]);

  // Paired display: [kiriLm, kananLm] per anatomical row
  const landmarkPairs = useMemo(() => {
    if (!selectedView.hasSideCondition) {
      return effectiveLandmarks.map((lm) => [lm, null]);
    }
    const kiriLms  = effectiveLandmarks.filter((lm) => lm.id.endsWith("_kiri"));
    const kananLms = effectiveLandmarks.filter((lm) => lm.id.endsWith("_kanan"));
    const maxLen   = Math.max(kiriLms.length, kananLms.length, 1);
    return Array.from({ length: maxLen }, (_, i) => [kiriLms[i] ?? null, kananLms[i] ?? null]);
  }, [selectedView.hasSideCondition, effectiveLandmarks]);

  // Reset placed/active when view or side conditions change
  useEffect(() => {
    setPlaced({});
    setActiveLandmarkId(effectiveLandmarks[0]?.id ?? null);
    setNotes("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedView.id, sideConditions.kiri, sideConditions.kanan]);

  useEffect(() => {
    if (!isOpen) return;
    const firstUnplaced = effectiveLandmarks.find((l) => !placed[l.id]);
    if (firstUnplaced) setActiveLandmarkId(firstUnplaced.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedView.id]);

  const handleViewSelect = useCallback((view) => {
    setSelectedView(view);
    setSideConditions(DEFAULT_SIDE_CONDITIONS);
    setConditionPresetId("native_both");
    setActiveLandmarkId(null);
  }, []);

  const handleSideConditionChange = useCallback((side, condKey) => {
    setSideConditions((prev) => ({ ...prev, [side]: condKey }));
  }, []);

  const handleConditionPreset = useCallback((preset) => {
    setConditionPresetId(preset.id);
    setSideConditions({ kiri: preset.kiri, kanan: preset.kanan });
  }, []);

  const handleImageLoad = useCallback((e) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  const handleCanvasClick = useCallback((e) => {
    if (!activeLandmarkId || !imgRef.current) return;
    const coord = screenToImage(e, imgRef.current);
    if (!coord) return;

    setPlaced((prev) => {
      const next = { ...prev, [activeLandmarkId]: coord };
      const remaining = effectiveLandmarks.filter((l) => l.id !== activeLandmarkId && !next[l.id]);
      setActiveLandmarkId(remaining[0]?.id ?? null);
      return next;
    });
  }, [activeLandmarkId, effectiveLandmarks]);

  const deleteLandmark = useCallback((id) => {
    setPlaced((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const handleExportJson = useCallback(() => {
    const landmarksOut = {};
    effectiveLandmarks.forEach((lm) => {
      if (placed[lm.id]) landmarksOut[lm.id] = placed[lm.id];
    });

    const data = {
      image: imageName || "image.jpg",
      view: selectedView.id,
      category: selectedView.category,
      ...(selectedView.hasSideCondition && { side_conditions: sideConditions }),
      width: naturalSize.w,
      height: naturalSize.h,
      landmarks: landmarksOut,
      landmark_count: Object.keys(landmarksOut).length,
      notes: notes.trim(),
      annotated_at: new Date().toISOString().split("T")[0],
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = (imageName || "annotation").replace(/\.[^.]+$/, "");
    a.href = url;
    a.download = `${base}_${selectedView.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    setSavedCount((n) => n + 1);
  }, [imageName, naturalSize, notes, placed, selectedView, sideConditions, effectiveLandmarks]);

  const handleSaveToFirebase = useCallback(async () => {
    if (fbSaving || Object.keys(placed).length === 0) return;
    setFbSaving(true);
    setFbStatus(null);
    try {
      const mlPayload = buildMLPayload({
        imageName,
        imageUrl:        null,
        view:            selectedView.id,
        category:        selectedView.category,
        sideConditions:  selectedView.hasSideCondition ? sideConditions : undefined,
        width:           naturalSize.w,
        height:          naturalSize.h,
        placed,
        effectiveLandmarks,
        notes,
        metadata: {
          image_quality:     imgQuality,
          patient_gender:    gender,
          patient_age_group: ageGroup,
          diagnoses,
        },
      });
      if (editDocId) {
        await updateFirebaseDoc({ docId: editDocId, imageSrc, imageName, mlPayload });
      } else {
        await saveToFirebase({ imageSrc, imageName, mlPayload });
      }
      setFbStatus("ok");
      onSaved?.();
      setTimeout(() => setFbStatus(null), 3000);
    } catch (err) {
      console.error("Firebase save error:", err);
      setFbStatus("error");
      setTimeout(() => setFbStatus(null), 4000);
    } finally {
      setFbSaving(false);
    }
  }, [fbSaving, placed, imageName, imageSrc, selectedView, sideConditions, naturalSize, effectiveLandmarks, notes, imgQuality, gender, ageGroup, diagnoses, editDocId, onSaved]);

  const placedCount    = Object.keys(placed).length;
  const totalLandmarks = effectiveLandmarks.length;
  const activeLandmark = effectiveLandmarks.find((l) => l.id === activeLandmarkId);
  const isPostOp       = selectedView.category === "post-op";

  if (!isOpen || typeof window === "undefined") return null;

  const mainContent = createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col font-sans" style={{ background: "var(--color-body-bg)" }}>

      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4" style={{ borderColor: "var(--soft-border)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="2" fill="currentColor"/>
            <path d="M8 2v2M8 12v2M2 8h2M12 8h2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-tight text-[var(--soft-text-hi)]">
          {editDocId ? "Edit Anotasi Landmark" : "Anotasi Landmark"}
        </p>
          <div className="flex items-center gap-1.5">
            <p className="text-[9px] text-slate-400">
              {naturalSize.w > 0 ? `${naturalSize.w}×${naturalSize.h}px` : "Memuat..."} · {placedCount}/{totalLandmarks} landmark
            </p>
            {selectedView.hasSideCondition && (() => {
              const cp = CONDITION_PRESETS.find((p) => p.id === conditionPresetId);
              return cp ? (
                <span className="text-[7px] font-black rounded-full px-1.5 py-0.5"
                  style={{ background: cp.color + "28", color: cp.color }}>
                  {cp.badge}
                </span>
              ) : null;
            })()}
            {isPostOp && (
              <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[7px] font-black text-rose-400">
                POST-OP
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--soft-border)] text-slate-400 hover:bg-white/10">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-[10px] font-black text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--soft-border)] text-slate-400 hover:bg-white/10">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setZoom(1)}
            className="rounded-lg border border-[var(--soft-border)] px-2.5 py-1 text-[9px] font-black text-slate-400 hover:bg-white/10">
            Fit
          </button>
          <div className="mx-1 h-6 w-px bg-white/10" />
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--soft-border)] text-slate-400 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-[309] md:hidden"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar — desktop: side panel, mobile: bottom sheet ── */}
        <div
          className={[
            "flex flex-col border-r",
            // mobile: fixed bottom sheet
            "fixed bottom-0 left-0 right-0 z-[310] h-[68vh] rounded-t-3xl",
            "transition-transform duration-300 ease-in-out",
            mobileSidebarOpen ? "translate-y-0" : "translate-y-full",
            // desktop: normal side panel
            "md:static md:h-auto md:w-[420px] md:shrink-0 md:z-auto md:rounded-none md:translate-y-0",
          ].join(" ")}
          style={{ background: "var(--color-surface-alt)", borderColor: "var(--soft-border)" }}>

          {/* ── Mobile handle + close ── */}
          <div className="md:hidden flex shrink-0 items-center px-4 py-3 border-b border-[var(--soft-border)]">
            <div className="flex-1 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-white/25" />
            </div>
            <button type="button" onClick={() => setMobileSidebarOpen(false)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--soft-border)] text-slate-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── Progress bar ── */}
          <div className="shrink-0 border-b border-[var(--soft-border)] px-5 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Progress</span>
              <span className="text-[11px] font-black text-[var(--soft-text-hi)]">
                {placedCount}<span className="text-slate-500">/{totalLandmarks}</span>
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--soft-border)]">
              <div className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: totalLandmarks > 0 ? `${(placedCount / totalLandmarks) * 100}%` : "0%",
                  background: placedCount === totalLandmarks && totalLandmarks > 0 ? "#10b981" : "#3b82f6",
                }} />
            </div>
            {placedCount === totalLandmarks && totalLandmarks > 0 && (
              <p className="mt-1.5 text-[8px] font-bold text-emerald-400">✓ Semua landmark terpasang</p>
            )}
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>

            {/* ── 1. Jenis Foto — Custom Dropdown ── */}
            <div className="border-b border-[var(--soft-border)] px-5 py-4">
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Jenis Foto X-Ray</p>
              <div className="relative"
                tabIndex={-1}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setViewOpen(false); }}>
                {/* Trigger */}
                <button type="button" onClick={() => setViewOpen((v) => !v)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2.5 text-left transition-all hover:bg-[var(--soft-border)] focus:outline-none">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: selectedView.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold leading-tight text-[var(--soft-text-hi)]">{selectedView.label}</p>
                    {selectedView.description && (
                      <p className="truncate text-[8px] leading-tight text-slate-500">{selectedView.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-black"
                    style={selectedView.category === "post-op"
                      ? { background: "#f43f5e22", color: "#f43f5e" }
                      : { background: "#60a5fa22", color: "#60a5fa" }}>
                    {selectedView.category === "post-op" ? "POST-OP" : "NATIVE"}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${viewOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown panel */}
                {viewOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[var(--soft-border)] bg-[var(--color-surface)] shadow-2xl">
                    <div className="px-3 pt-2.5 pb-1">
                      <p className="text-[7px] font-black uppercase tracking-widest text-blue-400/80">Belum Operasi</p>
                    </div>
                    {getViewsByCategory("native").map((view) => (
                      <button key={view.id} type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleViewSelect(view); setViewOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-[var(--soft-border)]"
                        style={selectedView.id === view.id ? { color: view.color, background: view.color + "12" } : { color: "#94a3b8" }}>
                        <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: view.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[9px] font-bold leading-tight">{view.label}</p>
                          {view.description && <p className="truncate text-[7px] opacity-60">{view.description}</p>}
                        </div>
                        {selectedView.id === view.id && <Check className="h-3 w-3 shrink-0" />}
                      </button>
                    ))}
                    <div className="mt-1 border-t border-[var(--soft-border)] px-3 pt-2.5 pb-1">
                      <p className="text-[7px] font-black uppercase tracking-widest text-rose-400/80">Post Operasi</p>
                    </div>
                    {getViewsByCategory("post-op").map((view) => (
                      <button key={view.id} type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleViewSelect(view); setViewOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-[var(--soft-border)]"
                        style={selectedView.id === view.id ? { color: view.color, background: view.color + "12" } : { color: "#94a3b8" }}>
                        <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: view.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[9px] font-bold leading-tight">{view.label}</p>
                          {view.description && <p className="truncate text-[7px] opacity-60">{view.description}</p>}
                        </div>
                        {selectedView.id === view.id && <Check className="h-3 w-3 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Post-op notice */}
              {isPostOp && (
                <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2">
                  <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <p className="text-[8px] leading-relaxed text-rose-300">
                    <span className="font-black">Post-Operasi</span> — Landmark mengacu pada komponen prostetik, bukan tulang asli.
                  </p>
                </div>
              )}
            </div>

            {/* ── 2. Side Conditions — dropdown select ── */}
            {selectedView.hasSideCondition && (
              <div className="border-b border-[var(--soft-border)] px-5 py-4">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Kondisi Sisi</p>
                {(() => {
                  const cp = CONDITION_PRESETS.find((p) => p.id === conditionPresetId);
                  return (
                    <div>
                      <div className="relative">
                        <select
                          value={conditionPresetId}
                          onChange={(e) => {
                            const preset = CONDITION_PRESETS.find((p) => p.id === e.target.value);
                            if (preset) handleConditionPreset(preset);
                          }}
                          style={{ colorScheme: "dark" }}
                          className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--soft-border)] bg-white/4 py-2.5 pl-3 pr-8 text-[10px] text-slate-200 outline-none transition-all focus:border-blue-500/30">
                          <optgroup label="Asli">
                            {CONDITION_PRESETS.filter((p) => p.group === "native").map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="THA (Total Hip Arthroplasty)">
                            {CONDITION_PRESETS.filter((p) => p.group === "tha").map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Hemiarthroplasty">
                            {CONDITION_PRESETS.filter((p) => p.group === "hemi").map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Terpotong / N/A">
                            {CONDITION_PRESETS.filter((p) => p.group === "cut").map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </optgroup>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      </div>
                      {cp && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: cp.color }} />
                          <span className="text-[8px] font-bold" style={{ color: cp.color }}>{cp.badge}</span>
                        </div>
                      )}
                      {totalLandmarks === 0 && (
                        <p className="mt-2 text-center text-[8px] text-slate-600">Kondisi ini tidak menghasilkan landmark</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── 3. Point Landmark ── */}
            {totalLandmarks > 0 && (
              <div className="border-b border-[var(--soft-border)]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Point Landmark</p>
                  <span className="text-[8px] font-black text-slate-400">{placedCount}/{totalLandmarks} Terisi</span>
                </div>
                {/* Progress bar */}
                <div className="mx-5 mb-5 h-[3px] overflow-hidden rounded-full bg-[var(--soft-border)]">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: totalLandmarks > 0 ? `${(placedCount / totalLandmarks) * 100}%` : "0%",
                      background: placedCount === totalLandmarks && totalLandmarks > 0 ? "#10b981" : "#3b82f6",
                    }} />
                </div>

                {/* Zigzag timeline */}
                <div className="relative pb-5 px-3">
                  {/* Central vertical line */}
                  <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[2px] rounded-full"
                    style={{ bottom: "20px", background: "linear-gradient(to bottom, rgba(255,255,255,0.14), rgba(255,255,255,0.03))" }} />

                  <div className="space-y-3">
                    {effectiveLandmarks.map((lm, idx) => {
                      const isLeft   = idx % 2 === 0;
                      const isPlaced = Boolean(placed[lm.id]);
                      const isActive = activeLandmarkId === lm.id;

                      const dotNode = (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
                          style={{
                            borderColor: lm.color,
                            background: isPlaced ? lm.color : isActive ? lm.color + "28" : "var(--color-surface)",
                            boxShadow:   isActive && !isPlaced ? `0 0 14px ${lm.color}70` : "none",
                            transform:   isActive && !isPlaced ? "scale(1.18)" : "scale(1)",
                          }}>
                          {isPlaced
                            ? <Check className="h-3.5 w-3.5 stroke-[3] text-white" />
                            : <span className="text-[9px] font-black" style={{ color: lm.color }}>{idx + 1}</span>
                          }
                        </div>
                      );

                      // collapsed = placed & not re-selected
                      const collapsed = isPlaced && !isActive;

                      const cardNode = (
                        <div
                          className="w-full cursor-pointer select-none rounded-2xl border transition-all duration-200"
                          style={{
                            borderColor: isActive   ? lm.color + "55"
                                       : isPlaced   ? "#10b98122"
                                       :               "#ffffff0f",
                            background:  isActive   ? lm.color + "0e"
                                       : isPlaced   ? "#10b98106"
                                       :               "var(--color-surface-alt)",
                            boxShadow:   isActive && !isPlaced ? `0 4px 18px ${lm.color}1a` : "none",
                            padding: collapsed ? "8px 10px" : "12px",
                          }}
                          onClick={() => setActiveLandmarkId(isActive ? null : lm.id)}>

                          {collapsed ? (
                            /* ── Collapsed: compact strip ── */
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                style={{ background: lm.color }}>
                                <Check className="h-3 w-3 stroke-[3] text-white" />
                              </div>
                              <p className="flex-1 truncate text-[9px] font-semibold text-slate-600 line-through">
                                {idx + 1}. {lm.label}
                              </p>
                              <button type="button"
                                onClick={(e) => { e.stopPropagation(); deleteLandmark(lm.id); }}
                                className="shrink-0 text-red-400/25 transition-colors hover:text-red-400">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            /* ── Expanded: full card ── */
                            <>
                              {/* Icon + title */}
                              <div className="mb-2 flex items-start gap-2">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                  style={{ background: lm.color + "18" }}>
                                  <svg viewBox="0 0 36 36" className="h-7 w-7" fill="none">
                                    <circle cx="26" cy="8"  r="7.5" fill={lm.color} opacity="0.2" />
                                    <circle cx="26" cy="8"  r="4.5" fill={lm.color} opacity="0.55" />
                                    <path d="M21 12 L15 21" stroke={lm.color} strokeWidth="4.5" strokeLinecap="round" opacity="0.45"/>
                                    <path d="M15 21 L7 18"  stroke={lm.color} strokeWidth="4"   strokeLinecap="round" opacity="0.4"/>
                                    <rect x="11" y="21" width="8" height="12" rx="4" fill={lm.color} opacity="0.38"/>
                                  </svg>
                                </div>
                                <p className="text-[10px] font-black leading-snug"
                                  style={{ color: isActive ? "var(--soft-text-hi)" : "var(--soft-text)" }}>
                                  {idx + 1}. {lm.label}
                                </p>
                              </div>
                              {/* Hint */}
                              {lm.hint && (
                                <p className="mb-2.5 text-[8px] leading-relaxed text-slate-500">{lm.hint}</p>
                              )}
                              {/* Action buttons */}
                              <div className="flex gap-1.5">
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); setShowGuideModal(true); }}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--soft-border)] bg-white/4 py-1.5 text-[7px] font-black uppercase tracking-wide text-slate-400 transition-colors hover:bg-[var(--soft-border)]">
                                  <BookOpen className="h-2.5 w-2.5" /> Lihat Diagram
                                </button>
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); setActiveLandmarkId(isActive ? null : lm.id); }}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[7px] font-black uppercase tracking-wide transition-all"
                                  style={isActive
                                    ? { background: lm.color, color: "#fff", boxShadow: `0 2px 8px ${lm.color}55` }
                                    : { background: lm.color + "18", color: lm.color, border: `1px solid ${lm.color}40` }
                                  }>
                                  <MousePointer2 className={`h-2.5 w-2.5 ${isActive ? "animate-pulse" : ""}`} /> Klik Foto
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );

                      return (
                        <div key={lm.id} className="flex gap-0">
                          {/* LEFT half */}
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            {isLeft
                              ? cardNode
                              : <div className="border-t-2 border-dashed" style={{ borderColor: lm.color + "30" }} />
                            }
                          </div>
                          {/* Center dot */}
                          <div className="mx-2 flex shrink-0 flex-col justify-center">{dotNode}</div>
                          {/* RIGHT half */}
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            {!isLeft
                              ? cardNode
                              : <div className="border-t-2 border-dashed" style={{ borderColor: lm.color + "30" }} />
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. Data ML (collapsible) ── */}
            <div className="border-b border-[var(--soft-border)]">
              <button type="button" onClick={() => setShowGuide((v) => !v)}
                className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left transition-all hover:bg-white/4">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-orange-500/20">
                  <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3 text-orange-400">
                    <circle cx="6" cy="6" r="2.5" />
                    <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="flex-1 text-[9px] font-black uppercase tracking-widest text-orange-400/90">Data ML</span>
                {showGuide ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
              </button>

              {showGuide && (
                <div className="space-y-4 px-5 pb-5">

                  {/* Kualitas Foto */}
                  <div>
                    <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Kualitas Foto</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { k: "bagus",          label: "Bagus",    icon: "✓" },
                        { k: "kabur",          label: "Kabur",    icon: "◌" },
                        { k: "rotasi",         label: "Rotasi",   icon: "↻" },
                        { k: "kontras_rendah", label: "Kontras↓", icon: "◑" },
                      ].map(({ k, label, icon }) => (
                        <button key={k} type="button" onClick={() => setImgQuality(k)}
                          className={`flex flex-col items-center gap-0.5 rounded-xl border py-2 text-center transition-all ${
                            imgQuality === k
                              ? "border-orange-500/50 bg-orange-500/20 text-orange-300"
                              : "border-[var(--soft-border)] bg-white/4 text-slate-500 hover:bg-[var(--soft-border)]"
                          }`}>
                          <span className="text-[11px]">{icon}</span>
                          <span className="text-[7px] font-bold leading-tight">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Jenis Kelamin — dropdown */}
                  <div>
                    <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Jenis Kelamin</p>
                    <div className="relative">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="w-full appearance-none rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2.5 pr-9 text-[10px] text-slate-200 outline-none transition-all focus:border-blue-500/40 cursor-pointer">
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                        <option value="tidak_diketahui">Tidak Diketahui</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  {/* Kelompok Usia — dropdown */}
                  <div>
                    <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Kelompok Usia</p>
                    <div className="relative">
                      <select
                        value={ageGroup || ""}
                        onChange={(e) => setAgeGroup(e.target.value || null)}
                        style={{ colorScheme: "dark" }}
                        className="w-full appearance-none rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2.5 pr-9 text-[10px] text-slate-200 outline-none transition-all focus:border-purple-500/40 cursor-pointer">
                        <option value="">Pilih kelompok usia…</option>
                        <option value="<20">&lt;20 tahun</option>
                        <option value="20–40">20–40 tahun</option>
                        <option value="41–60">41–60 tahun</option>
                        <option value="61–80">61–80 tahun</option>
                        <option value=">80">&gt;80 tahun</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  {/* Diagnosis — text input + dropdown + tags */}
                  <div>
                    <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                      Diagnosis
                      <span className="ml-1 normal-case font-normal text-slate-600">(bisa lebih dari satu)</span>
                    </p>

                    {/* Tags */}
                    {diagnoses.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {diagnoses.map((d) => (
                          <span key={d} className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[8px] text-emerald-300">
                            {d}
                            <button type="button"
                              onClick={() => setDiagnoses((prev) => prev.filter((x) => x !== d))}
                              className="text-emerald-400/60 hover:text-emerald-300">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Input + Suggestions */}
                    <div className="relative"
                      tabIndex={-1}
                      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDiagOpen(false); }}>
                      <input
                        value={diagInput}
                        onChange={(e) => { setDiagInput(e.target.value); setDiagOpen(true); }}
                        onFocus={() => setDiagOpen(true)}
                        placeholder="Ketik atau pilih dari daftar…"
                        className="w-full rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2.5 text-[9px] text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-emerald-500/30" />

                      {diagOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-[var(--soft-border)] bg-[var(--color-surface)] shadow-xl"
                          style={{ scrollbarWidth: "none" }}>
                          {DIAGNOSIS_PRESETS
                            .filter((d) => !diagnoses.includes(d) && (diagInput === "" || d.toLowerCase().includes(diagInput.toLowerCase())))
                            .map((d) => (
                              <button key={d} type="button" tabIndex={0}
                                onMouseDown={(e) => { e.preventDefault(); setDiagnoses((prev) => [...prev, d]); setDiagInput(""); setDiagOpen(false); }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[9px] text-slate-400 transition-all hover:bg-[var(--soft-border)] hover:text-slate-200">
                                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/50" />
                                {d}
                              </button>
                            ))
                          }
                          {diagInput && !DIAGNOSIS_PRESETS.some((d) => d.toLowerCase() === diagInput.toLowerCase()) && !diagnoses.includes(diagInput) && (
                            <button type="button" tabIndex={0}
                              onMouseDown={(e) => { e.preventDefault(); setDiagnoses((prev) => [...prev, diagInput]); setDiagInput(""); setDiagOpen(false); }}
                              className="flex w-full items-center gap-2 border-t border-[var(--soft-border)] px-3 py-2 text-left text-[9px] text-blue-400 transition-all hover:bg-[var(--soft-border)]">
                              <span className="font-bold text-[11px]">+</span>
                              Tambah &ldquo;{diagInput}&rdquo;
                            </button>
                          )}
                          {DIAGNOSIS_PRESETS.filter((d) => !diagnoses.includes(d)).length === 0 && !diagInput && (
                            <p className="px-3 py-3 text-center text-[8px] text-slate-600">Semua preset sudah dipilih</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Catatan */}
                  <div>
                    <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Catatan</p>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                      placeholder="Kondisi foto, temuan khusus, dll…"
                      className="w-full resize-none rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2 text-[9px] text-slate-300 placeholder-slate-600 outline-none transition-all focus:border-blue-500/40" />
                  </div>
                </div>
              )}
            </div>

            {/* ── Bottom info ── */}
            <div className="px-5 py-3">
              {naturalSize.w > 0 && (
                <p className="text-center text-[8px] text-slate-700">{naturalSize.w} × {naturalSize.h} px</p>
              )}
            </div>
          </div>

          {/* ── Sticky Action Buttons ── */}
          <div className="shrink-0 space-y-2 border-t border-[var(--soft-border)] p-4" style={{ background: "var(--color-surface)" }}>
            {savedCount > 0 && (
              <p className="text-center text-[8px] font-bold text-emerald-500">✓ {savedCount}× JSON diunduh sesi ini</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={handleExportJson} disabled={placedCount === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[9px] font-black uppercase tracking-wider text-white transition-all hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
              <button type="button"
                onClick={() => { if (placedCount === 0 || fbSaving) return; setMlSaveMode(true); setShowMLModal(true); }}
                disabled={placedCount === 0 || fbSaving}
                className={[
                  "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[9px] font-black uppercase tracking-wider text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                  fbStatus === "ok" ? "bg-sky-500" : fbStatus === "error" ? "bg-red-600" : "bg-orange-600 hover:bg-orange-500",
                ].join(" ")}>
                {fbSaving
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Simpan…</>
                  : fbStatus === "ok" ? <><Check className="h-3.5 w-3.5" /> Tersimpan!</>
                  : fbStatus === "error" ? <>Gagal</>
                  : <><svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M10 2a6 6 0 00-5.9 7.1A4 4 0 106 18h9a4 4 0 000-8 .9.9 0 01-.1 0A6 6 0 0010 2z" /></svg> Firebase</>}
              </button>
            </div>
            <button type="button"
              onClick={() => { setPlaced({}); setActiveLandmarkId(effectiveLandmarks[0]?.id ?? null); }}
              disabled={placedCount === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--soft-border)] py-2 text-[9px] font-bold text-slate-500 transition-all hover:border-red-500/30 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30">
              <RotateCcw className="h-3 w-3" /> Reset Semua Anotasi
            </button>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div className="relative flex min-w-0 flex-1 overflow-hidden">

          {/* ── Mobile FAB: open landmark timeline ── */}
          <div className="md:hidden absolute bottom-5 left-0 right-0 z-[305] flex justify-center px-4 pointer-events-none">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full px-5 py-3 text-[11px] font-black text-white shadow-2xl transition active:scale-95"
              style={{
                background: activeLandmark ? activeLandmark.color : "#2563eb",
                boxShadow: `0 8px 28px ${activeLandmark ? activeLandmark.color + "66" : "rgba(37,99,235,0.55)"}`,
              }}>
              <List className="h-4 w-4 shrink-0" />
              {activeLandmark ? (
                <span>{activeLandmark.label} · {placedCount}/{totalLandmarks}</span>
              ) : (
                <span>{placedCount}/{totalLandmarks} landmark — Buka Timeline</span>
              )}
            </button>
          </div>
        <div
          className="relative min-w-0 flex-1 overflow-auto bg-slate-900"
          style={{ cursor: activeLandmarkId ? "crosshair" : "default" }}
          onClick={handleCanvasClick}
        >
          {/* State pills */}
          {activeLandmark && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border px-4 py-1.5 shadow-xl"
              style={{ background: activeLandmark.color + "22", borderColor: activeLandmark.color + "60" }}>
              <p className="text-[10px] font-black" style={{ color: activeLandmark.color }}>
                <MousePointer2 className="mr-1 inline h-3 w-3" />
                Klik: {activeLandmark.label}
              </p>
            </div>
          )}

          {!activeLandmark && totalLandmarks > 0 && placedCount < totalLandmarks && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-slate-800/80 px-4 py-1.5 shadow-xl">
              <p className="text-[10px] font-bold text-slate-400">Pilih landmark di sidebar</p>
            </div>
          )}

          {totalLandmarks === 0 && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 shadow-xl">
              <p className="text-[10px] font-bold text-amber-400">Set kondisi sisi untuk mulai anotasi</p>
            </div>
          )}

          {placedCount === totalLandmarks && totalLandmarks > 0 && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-4 py-1.5 shadow-xl">
              <p className="text-[10px] font-black text-emerald-400">✓ Semua landmark selesai — Export JSON</p>
            </div>
          )}

          {/* Image + dots */}
          <div className="relative flex h-full min-h-full items-center justify-center">
            {imageSrc ? (
              <>
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="X-ray"
                  draggable={false}
                  onLoad={handleImageLoad}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    userSelect: "none",
                    maxWidth: zoom > 1 ? "none" : "100%",
                    maxHeight: zoom > 1 ? "none" : "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                  className="pointer-events-none h-full w-full object-contain"
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                >
                  {effectiveLandmarks.map((lm) => {
                    const coord = placed[lm.id];
                    if (!coord) return null;
                    return (
                      <LandmarkDot key={lm.id} landmark={lm} coord={coord} imgEl={imgRef.current} onDelete={deleteLandmark} />
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center text-slate-600">
                <p className="text-[12px]">Belum ada foto X-ray dimuat.</p>
                <p className="mt-1 text-[10px]">Muat foto X-ray di workspace terlebih dahulu.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Floating Guide Panel (right of canvas) ── */}
        {showGuideModal && (() => {
          const guide = {
            ap_hip:                "AP Hip / Pelvis",
            ap_knee:               "AP Knee",
            ap_femur:              "AP Femur",
            ap_proximal_femur:     "AP Proksimal Femur",
            ap_ankle:              "AP Ankle",
            lateral_hip:           "Lateral Hip",
            lateral_knee:          "Lateral Knee",
            ap_knee_tka:           "AP Knee — Post TKA",
            ap_proximal_femur_thr: "AP Proksimal Femur — THR",
          }[selectedView.id] ?? selectedView.label;
          return (
            <div className="flex w-[290px] shrink-0 flex-col border-l border-[var(--soft-border)]" style={{ background: "var(--color-surface)" }}>
              {/* header */}
              <div className="flex shrink-0 items-start gap-2 border-b border-[var(--soft-border)] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[7px] font-black uppercase tracking-widest text-slate-600">Panduan Posisi</p>
                  <p className="text-[10px] font-black leading-tight text-[var(--soft-text-hi)]">{guide}</p>
                  {guideHighlightId && (
                    <p className="mt-0.5 flex items-center gap-1 text-[7px] text-amber-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                      Titik aktif berkedip di diagram
                    </p>
                  )}
                </div>
                <button type="button"
                  onClick={() => { setShowGuideModal(false); setGuideHighlightId(null); }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[var(--soft-border)] text-slate-400 hover:bg-white/10 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
              {/* diagram */}
              <div className="flex-1 overflow-auto p-2" style={{ scrollbarWidth: "none" }}>
                <div className="overflow-hidden rounded-xl border border-white/5">
                  <GuideContent
                    viewId={selectedView.id}
                    sideConditions={sideConditions}
                    highlightId={guideHighlightId}
                  />
                </div>
              </div>
              {/* legend */}
              <div className="shrink-0 border-t border-white/5 px-3 py-2">
                <p className="text-[7px] leading-relaxed text-slate-600">
                  Titik berwarna = posisi landmark.
                  {guideHighlightId && " Lingkaran berkedip = titik yang dipilih."}
                  {" "}Sesuaikan dengan anatomi aktual di foto X-ray.
                </p>
              </div>
            </div>
          );
        })()}
        </div>{/* end canvas wrapper */}
      </div>

      {/* ── ML Data Modal (muncul saat panel dibuka) ── */}
      {showMLModal && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--soft-border)] shadow-2xl" style={{ background: "var(--color-surface)" }}>

            {/* Modal Header */}
            <div className="border-b border-[var(--soft-border)] px-6 py-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${mlSaveMode ? "bg-sky-500/20" : "bg-orange-500/20"}`}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`h-5 w-5 ${mlSaveMode ? "text-sky-400" : "text-orange-400"}`}>
                    <path d="M10 2a6 6 0 00-5.9 7.1A4 4 0 106 18h9a4 4 0 000-8 .9.9 0 01-.1 0A6 6 0 0010 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-black text-[var(--soft-text-hi)]">
                    {mlSaveMode ? "Konfirmasi Data ML" : "Data Pasien & Foto"}
                  </p>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    {mlSaveMode
                      ? "Periksa & perbarui data sebelum disimpan ke Firebase"
                      : "Isi sebelum mulai anotasi — dipakai untuk dataset ML"}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "none" }}>
              <div className="space-y-4">

                {/* Kualitas Foto */}
                <div>
                  <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Kualitas Foto</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { k: "bagus",          label: "Bagus",    icon: "✓" },
                      { k: "kabur",          label: "Kabur",    icon: "◌" },
                      { k: "rotasi",         label: "Rotasi",   icon: "↻" },
                      { k: "kontras_rendah", label: "Kontras↓", icon: "◑" },
                    ].map(({ k, label, icon }) => (
                      <button key={k} type="button" onClick={() => setImgQuality(k)}
                        className={`flex flex-col items-center gap-0.5 rounded-xl border py-2.5 text-center transition-all ${
                          imgQuality === k
                            ? "border-orange-500/50 bg-orange-500/20 text-orange-300"
                            : "border-[var(--soft-border)] bg-white/4 text-slate-500 hover:bg-[var(--soft-border)]"
                        }`}>
                        <span className="text-[13px]">{icon}</span>
                        <span className="text-[7px] font-bold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kelamin + Usia side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Jenis Kelamin</p>
                    <div className="relative">
                      <select value={gender} onChange={(e) => setGender(e.target.value)}
                        style={{ colorScheme: "dark" }}
                        className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2.5 pr-8 text-[10px] text-slate-200 outline-none focus:border-blue-500/40">
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                        <option value="tidak_diketahui">Tidak Diketahui</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Kelompok Usia</p>
                    <div className="relative">
                      <select value={ageGroup || ""} onChange={(e) => setAgeGroup(e.target.value || null)}
                        style={{ colorScheme: "dark" }}
                        className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2.5 pr-8 text-[10px] text-slate-200 outline-none focus:border-purple-500/40">
                        <option value="">Pilih usia…</option>
                        <option value="<20">&lt;20 tahun</option>
                        <option value="20–40">20–40 tahun</option>
                        <option value="41–60">41–60 tahun</option>
                        <option value="61–80">61–80 tahun</option>
                        <option value=">80">&gt;80 tahun</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Diagnosis */}
                <div>
                  <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                    Diagnosis <span className="normal-case font-normal text-slate-600">(opsional)</span>
                  </p>
                  {diagnoses.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {diagnoses.map((d) => (
                        <span key={d} className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[8px] text-emerald-300">
                          {d}
                          <button type="button" onClick={() => setDiagnoses((prev) => prev.filter((x) => x !== d))}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative" tabIndex={-1}
                    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDiagOpen(false); }}>
                    <input value={diagInput}
                      onChange={(e) => { setDiagInput(e.target.value); setDiagOpen(true); }}
                      onFocus={() => setDiagOpen(true)}
                      placeholder="Ketik atau pilih dari daftar…"
                      className="w-full rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2.5 text-[9px] text-slate-200 placeholder-slate-600 outline-none focus:border-emerald-500/30" />
                    {diagOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[160px] overflow-y-auto rounded-xl border border-[var(--soft-border)] bg-[var(--color-surface)] shadow-xl" style={{ scrollbarWidth: "none" }}>
                        {DIAGNOSIS_PRESETS.filter((d) => !diagnoses.includes(d) && (diagInput === "" || d.toLowerCase().includes(diagInput.toLowerCase()))).map((d) => (
                          <button key={d} type="button" tabIndex={0}
                            onMouseDown={(e) => { e.preventDefault(); setDiagnoses((prev) => [...prev, d]); setDiagInput(""); setDiagOpen(false); }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[9px] text-slate-400 transition-all hover:bg-[var(--soft-border)] hover:text-slate-200">
                            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/50" />{d}
                          </button>
                        ))}
                        {diagInput && !DIAGNOSIS_PRESETS.some((d) => d.toLowerCase() === diagInput.toLowerCase()) && !diagnoses.includes(diagInput) && (
                          <button type="button" tabIndex={0}
                            onMouseDown={(e) => { e.preventDefault(); setDiagnoses((prev) => [...prev, diagInput]); setDiagInput(""); setDiagOpen(false); }}
                            className="flex w-full items-center gap-2 border-t border-[var(--soft-border)] px-3 py-2 text-[9px] text-blue-400 hover:bg-[var(--soft-border)]">
                            <span className="font-bold text-[11px]">+</span> Tambah &ldquo;{diagInput}&rdquo;
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">Catatan <span className="normal-case font-normal text-slate-600">(opsional)</span></p>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="Kondisi foto, temuan khusus, dll…"
                    className="w-full resize-none rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-2 text-[9px] text-slate-300 placeholder-slate-600 outline-none focus:border-blue-500/40" />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 border-t border-[var(--soft-border)] px-6 py-4">
              <button type="button"
                onClick={() => { setShowMLModal(false); setMlSaveMode(false); }}
                className="text-[9px] font-semibold text-slate-500 transition-colors hover:text-slate-300">
                {mlSaveMode ? "Batal" : "Lewati"}
              </button>
              {mlSaveMode ? (
                <button type="button"
                  onClick={() => { setShowMLModal(false); setMlSaveMode(false); handleSaveToFirebase(); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:bg-sky-500 active:scale-95">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10 2a6 6 0 00-5.9 7.1A4 4 0 106 18h9a4 4 0 000-8 .9.9 0 01-.1 0A6 6 0 0010 2z"/>
                  </svg>
                  Simpan ke Firebase →
                </button>
              ) : (
                <button type="button" onClick={() => setShowMLModal(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:bg-orange-500 active:scale-95">
                  Mulai Anotasi →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Status bar ── */}
      <div className="flex h-9 shrink-0 items-center gap-4 border-t border-[var(--soft-border)] px-4">
        <span className="flex items-center gap-1.5 text-[9px] text-slate-500">
          {isPostOp && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
          {selectedView.label}
        </span>
        <div className="flex gap-1">
          {effectiveLandmarks.map((lm) => (
            <div key={lm.id} className="h-2 w-2 rounded-full transition-all"
              style={{ background: placed[lm.id] ? lm.color : "#334155" }} title={lm.label} />
          ))}
        </div>
        <span className="ml-auto text-[9px] text-slate-500">
          {naturalSize.w > 0 ? `${naturalSize.w}×${naturalSize.h}px` : ""}
        </span>
      </div>
    </div>,
    document.body,
  );

  return mainContent;
}
