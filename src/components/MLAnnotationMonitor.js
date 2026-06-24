"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  AlertCircle,
  BarChart2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import LandmarkAnnotationPanel from "./LandmarkAnnotationPanel";

// ── Firebase ──────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "data-ok-b4091.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

async function fetchAnnotations() {
  const app  = getFirebaseApp();
  const auth = getAuth(app);
  if (!auth.currentUser) await signInAnonymously(auth);
  const db  = getFirestore(app);
  const q   = query(collection(db, "ml_annotations"), orderBy("saved_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function deleteAnnotation(id) {
  const app = getFirebaseApp();
  const db  = getFirestore(app);
  await deleteDoc(doc(db, "ml_annotations", id));
}

async function renameAnnotation(id, newName) {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  if (!auth.currentUser) await signInAnonymously(auth);
  const db = getFirestore(app);
  await updateDoc(doc(db, "ml_annotations", id), { image: newName, updated_at: serverTimestamp() });
}

async function updateAnnotationData(id, fields) {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  if (!auth.currentUser) await signInAnonymously(auth);
  const db = getFirestore(app);
  await updateDoc(doc(db, "ml_annotations", id), { ...fields, updated_at: serverTimestamp() });
}

// ── label maps ────────────────────────────────────────────────────────────────

const VIEW_LABELS = {
  ap_hip:                "AP Hip / Pelvis",
  ap_knee:               "AP Knee",
  ap_femur:              "AP Femur",
  ap_proximal_femur:     "AP Proks. Femur",
  ap_ankle:              "AP Ankle",
  lateral_hip:           "Lateral Hip",
  lateral_knee:          "Lateral Knee",
  ap_knee_tka:           "AP Knee TKA",
  ap_proximal_femur_thr: "AP Proks. Femur THR",
};

const VIEW_COLORS = {
  ap_hip:                "#3b82f6",
  ap_knee:               "#06b6d4",
  ap_femur:              "#8b5cf6",
  ap_proximal_femur:     "#ec4899",
  ap_ankle:              "#f59e0b",
  lateral_hip:           "#10b981",
  lateral_knee:          "#14b8a6",
  ap_knee_tka:           "#f43f5e",
  ap_proximal_femur_thr: "#fb923c",
};

const QUALITY_META = {
  bagus:          { label: "Bagus",     color: "#10b981", icon: "✓" },
  kabur:          { label: "Kabur",     color: "#f59e0b", icon: "◌" },
  rotasi:         { label: "Rotasi",    color: "#f97316", icon: "↻" },
  kontras_rendah: { label: "Kontras↓",  color: "#6366f1", icon: "◑" },
};

const GENDER_LABEL = { L: "Laki-laki", P: "Perempuan", tidak_diketahui: "—" };

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

const DIAGNOSIS_PRESETS = [
  "Normal","OA Grade 1","OA Grade 2","OA Grade 3","OA Grade 4",
  "Fraktur Femur","Fraktur Asetabulum","Fraktur Pelvis",
  "Displasia Hip","AVN (Nekrosis Avaskular)","Infeksi Sendi","Tumor Tulang","Lainnya",
];

const VIEWS_WITH_SIDE = ["ap_hip", "ap_proximal_femur", "ap_proximal_femur_thr"];

// ── completeness ──────────────────────────────────────────────────────────────

function completeness(doc) {
  const checks = [
    { key: "Gambar",     ok: Boolean(doc.image_url) },
    { key: "Landmark",   ok: (doc.landmark_count ?? 0) > 0 },
    { key: "Kualitas",   ok: doc.image_quality && doc.image_quality !== "" },
    { key: "Kelamin",    ok: doc.patient_gender && doc.patient_gender !== "tidak_diketahui" },
    { key: "Usia",       ok: Boolean(doc.patient_age_group) },
    { key: "Diagnosis",  ok: Array.isArray(doc.diagnoses) && doc.diagnoses.length > 0 },
    { key: "Catatan",    ok: Boolean(doc.notes && doc.notes.trim()) },
  ];
  const score = checks.filter((c) => c.ok).length;
  return { checks, score, total: checks.length, pct: Math.round((score / checks.length) * 100) };
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(doc) {
  if (doc.saved_at?.toDate) return doc.saved_at.toDate().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  if (doc.annotated_at)     return doc.annotated_at;
  return "—";
}

function fmtDateShort(doc) {
  if (doc.saved_at?.toDate) return doc.saved_at.toDate().toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  if (doc.annotated_at)     return doc.annotated_at;
  return "—";
}

// ── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "#3b82f6" }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--soft-border)] p-4" style={{ background: "var(--color-surface-alt)" }}>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: color + "22" }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <p className="text-[22px] font-black leading-none text-[var(--soft-text-hi)]">{value}</p>
      {sub && <p className="text-[8px] text-slate-500">{sub}</p>}
    </div>
  );
}

// ── QualityBar ───────────────────────────────────────────────────────────────

function QualityBar({ docs }) {
  const counts = {};
  docs.forEach((d) => {
    const k = d.image_quality || "bagus";
    counts[k] = (counts[k] || 0) + 1;
  });
  const total = docs.length || 1;
  const keys  = ["bagus", "kabur", "rotasi", "kontras_rendah"];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--soft-border)] p-4" style={{ background: "var(--color-surface-alt)" }}>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15">
          <BarChart2 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Kualitas Foto</p>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full">
        {keys.map((k) => {
          const pct = ((counts[k] || 0) / total) * 100;
          const meta = QUALITY_META[k];
          return pct > 0 ? (
            <div key={k} title={`${meta.label}: ${counts[k] || 0}`}
              className="h-full transition-all"
              style={{ width: `${pct}%`, background: meta.color }} />
          ) : null;
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => {
          const meta = QUALITY_META[k];
          const n    = counts[k] || 0;
          return (
            <span key={k} className="flex items-center gap-1 text-[8px]" style={{ color: meta.color }}>
              <span>{meta.icon}</span>
              <span className="font-bold">{meta.label}</span>
              <span className="text-slate-500">{n}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── ViewBar ──────────────────────────────────────────────────────────────────

function ViewBar({ docs }) {
  const counts = {};
  docs.forEach((d) => { counts[d.view] = (counts[d.view] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max    = sorted[0]?.[1] || 1;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--soft-border)] p-4" style={{ background: "var(--color-surface-alt)" }}>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/15">
          <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Distribusi View</p>
      </div>
      <div className="space-y-1.5">
        {sorted.slice(0, 5).map(([viewId, count]) => {
          const color = VIEW_COLORS[viewId] || "#64748b";
          return (
            <div key={viewId} className="flex items-center gap-2">
              <p className="w-[100px] shrink-0 truncate text-[8px] text-slate-500">{VIEW_LABELS[viewId] || viewId}</p>
              <div className="flex-1 overflow-hidden rounded-full bg-white/5 h-1.5">
                <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: color }} />
              </div>
              <span className="w-5 shrink-0 text-right text-[8px] font-black" style={{ color }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CompletenessCell ─────────────────────────────────────────────────────────

function CompletenessCell({ doc: d }) {
  const { checks, score, total, pct } = completeness(d);
  const color = pct === 100 ? "#10b981" : pct >= 70 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-[8px] font-black" style={{ color }}>{pct}%</span>
      </div>
      <div className="flex gap-0.5">
        {checks.map((c) => (
          <div key={c.key} title={c.key}
            className="h-1.5 w-1.5 rounded-sm"
            style={{ background: c.ok ? color : "#334155" }} />
        ))}
      </div>
    </div>
  );
}

// ── EditModal ─────────────────────────────────────────────────────────────────

function EditModal({ doc: d, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [imageName,  setImageName]  = useState(d.image || "");
  const [view,       setView]       = useState(d.view || "ap_hip");
  const [quality,    setQuality]    = useState(d.image_quality || "bagus");
  const [gender,     setGender]     = useState(d.patient_gender || "tidak_diketahui");
  const [ageGroup,   setAgeGroup]   = useState(d.patient_age_group || "");
  const [diagnoses,  setDiagnoses]  = useState(d.diagnoses ?? []);
  const [diagInput,  setDiagInput]  = useState("");
  const [diagOpen,   setDiagOpen]   = useState(false);
  const [notes,      setNotes]      = useState(d.notes || "");
  const [condPreset, setCondPreset] = useState(() => {
    const sc = d.side_conditions;
    if (!sc) return "native_both";
    return CONDITION_PRESETS.find(p => p.kiri === sc.kiri && p.kanan === sc.kanan)?.id ?? "native_both";
  });

  const hasSide        = VIEWS_WITH_SIDE.includes(view);
  const selectedPreset = CONDITION_PRESETS.find(p => p.id === condPreset);
  const qKeys          = Object.keys(QUALITY_META);
  const cycleQuality   = () => {
    const idx = qKeys.indexOf(quality);
    setQuality(qKeys[(idx + 1) % qKeys.length]);
  };

  const { pct } = completeness({
    ...d,
    image_quality:     quality,
    patient_gender:    gender,
    patient_age_group: ageGroup || null,
    diagnoses,
    notes:             notes.trim(),
  });
  const starScore = ((pct / 100) * 5).toFixed(1);
  const lmCount   = Object.keys(d.landmarks || {}).length;

  const addDiag = (val) => {
    const v = val.trim();
    if (v && !diagnoses.includes(v)) setDiagnoses(prev => [...prev, v]);
    setDiagInput("");
    setDiagOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields = {
        image:             imageName.trim() || d.image,
        view,
        image_quality:     quality,
        patient_gender:    gender,
        patient_age_group: ageGroup || null,
        diagnoses,
        notes:             notes.trim(),
        ...(hasSide && selectedPreset ? {
          side_conditions: { kiri: selectedPreset.kiri, kanan: selectedPreset.kanan },
        } : {}),
      };
      await updateAnnotationData(d.id, fields);
      onSave({ ...d, ...fields });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 28 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full max-w-[360px] overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: "var(--color-surface)" }}>

        {/* ── TOP INFO SECTION ── */}
        <div className="px-5 pt-4 pb-4 space-y-3">

          {/* Close button */}
          <div className="flex justify-end">
            <button type="button" onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--soft-border)] text-slate-400 hover:bg-white/10">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Name + Quality badge */}
          <div className="flex items-start justify-between gap-3">
            <input
              value={imageName}
              onChange={e => setImageName(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[20px] font-black leading-tight text-[var(--soft-text-hi)] outline-none placeholder-slate-500"
              placeholder="Nama Foto…"
            />
            <button type="button" onClick={cycleQuality} title="Klik untuk ganti kualitas"
              className="shrink-0 flex items-center gap-1 rounded-full border px-3 py-1 text-[9px] font-bold transition hover:opacity-80"
              style={{
                borderColor: QUALITY_META[quality]?.color + "50",
                color:       QUALITY_META[quality]?.color,
                background:  QUALITY_META[quality]?.color + "18",
              }}>
              <span>{QUALITY_META[quality]?.icon}</span>
              <span>{QUALITY_META[quality]?.label}</span>
            </button>
          </div>

          {/* Date · View dropdown · Side conditions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] text-slate-500">{fmtDateShort(d)}</span>
            <span className="text-slate-600 text-[9px]">·</span>
            <div className="relative flex items-center">
              <select value={view} onChange={e => setView(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="cursor-pointer appearance-none bg-transparent text-[9px] font-semibold text-slate-400 outline-none pr-4">
                <optgroup label="Belum Operasi">
                  {["ap_hip","ap_knee","ap_femur","ap_proximal_femur","ap_ankle","lateral_hip","lateral_knee"].map(v => (
                    <option key={v} value={v}>{VIEW_LABELS[v] || v}</option>
                  ))}
                </optgroup>
                <optgroup label="Post Operasi">
                  {["ap_knee_tka","ap_proximal_femur_thr"].map(v => (
                    <option key={v} value={v}>{VIEW_LABELS[v] || v}</option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" />
            </div>
            {hasSide && selectedPreset && (
              <>
                <span className="text-slate-600 text-[9px]">·</span>
                <div className="relative flex items-center">
                  <select value={condPreset} onChange={e => setCondPreset(e.target.value)}
                    style={{ colorScheme: "dark", color: selectedPreset.color }}
                    className="cursor-pointer appearance-none bg-transparent text-[9px] font-bold outline-none pr-4">
                    {CONDITION_PRESETS.map(p => <option key={p.id} value={p.id}>{p.badge}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" />
                </div>
              </>
            )}
          </div>

          {/* Gender toggle + Age select */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-[var(--soft-border)] text-[8px]">
              {[["L","♂ L"], ["P","♀ P"], ["tidak_diketahui","?"]].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => setGender(v)}
                  className="px-2.5 py-1 font-bold transition"
                  style={gender === v
                    ? { background: "#3b82f620", color: "#3b82f6" }
                    : { color: "#64748b" }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div className="relative flex items-center">
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="cursor-pointer appearance-none rounded-full border border-[var(--soft-border)] bg-transparent px-2.5 py-1 pr-5 text-[8px] text-slate-400 outline-none">
                <option value="">Usia…</option>
                <option value="<20">&lt;20 th</option>
                <option value="20–40">20–40 th</option>
                <option value="41–60">41–60 th</option>
                <option value="61–80">61–80 th</option>
                <option value=">80">&gt;80 th</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Catatan kondisi foto, temuan khusus…"
            className="w-full resize-none bg-transparent text-[9px] leading-relaxed text-slate-400 placeholder-slate-600 outline-none"
          />

          {/* Landmark count + Save button */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[17px] font-black text-[var(--soft-text-hi)]">{lmCount}</span>
              <span className="ml-1 text-[8px] text-slate-500">landmark · {pct}%</span>
            </div>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-[10px] font-black text-white shadow-lg transition hover:bg-slate-700 active:scale-95 disabled:opacity-50">
              {saving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan…</>
                : <>Simpan <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><ChevronRight className="h-3 w-3" /></span></>
              }
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5">
            {[0,1,2,3,4].map(i => (
              <div key={i} className={`rounded-full transition-all duration-300 ${i === 2 ? "h-1.5 w-4 bg-blue-500" : "h-1.5 w-1.5 bg-slate-600"}`} />
            ))}
          </div>
        </div>

        {/* ── BOTTOM IMAGE SECTION ── */}
        <div className="relative">
          {d.image_url ? (
            <img src={d.image_url} alt="X-ray"
              className="w-full object-cover"
              style={{ maxHeight: "220px", minHeight: "140px" }}
            />
          ) : (
            <div className="flex h-36 w-full items-center justify-center bg-slate-900">
              <ImageIcon className="h-8 w-8 text-slate-700" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.78) 100%)" }} />

          {/* Diagnosis tags + star score */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 px-4 py-3">

            {/* Diagnosis tags — editable */}
            <div className="relative min-w-0 flex-1" tabIndex={-1}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDiagOpen(false); }}>
              <div className="flex flex-wrap gap-1">
                {diagnoses.map(diag => (
                  <button key={diag} type="button"
                    onClick={() => setDiagnoses(prev => prev.filter(x => x !== diag))}
                    className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[8px] font-semibold text-white backdrop-blur-sm transition hover:bg-red-500/50">
                    {diag} <X className="h-2 w-2" />
                  </button>
                ))}
                <button type="button" onClick={() => setDiagOpen(v => !v)}
                  className="flex items-center gap-0.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[8px] text-white/70 backdrop-blur-sm transition hover:bg-white/20">
                  + Diagnosis
                </button>
              </div>
              {diagOpen && (
                <div className="absolute bottom-full left-0 z-10 mb-2 w-52 max-h-[180px] overflow-y-auto rounded-2xl border border-[var(--soft-border)] shadow-2xl"
                  style={{ background: "var(--color-surface)", scrollbarWidth: "none" }}>
                  <div className="p-2">
                    <input
                      autoFocus
                      value={diagInput}
                      onChange={e => setDiagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && diagInput.trim()) { e.preventDefault(); addDiag(diagInput); } }}
                      placeholder="Cari atau ketik…"
                      className="w-full rounded-xl border border-[var(--soft-border)] bg-white/4 px-3 py-1.5 text-[9px] text-[var(--soft-text-hi)] placeholder-slate-600 outline-none"
                    />
                  </div>
                  {DIAGNOSIS_PRESETS
                    .filter(dp => !diagnoses.includes(dp) && (diagInput === "" || dp.toLowerCase().includes(diagInput.toLowerCase())))
                    .map(dp => (
                      <button key={dp} type="button" tabIndex={0}
                        onMouseDown={e => { e.preventDefault(); addDiag(dp); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[9px] text-slate-400 transition hover:bg-white/8 hover:text-slate-200">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/50" /> {dp}
                      </button>
                    ))
                  }
                  {diagInput.trim() && !DIAGNOSIS_PRESETS.some(dp => dp.toLowerCase() === diagInput.toLowerCase()) && !diagnoses.includes(diagInput) && (
                    <button type="button" tabIndex={0}
                      onMouseDown={e => { e.preventDefault(); addDiag(diagInput); }}
                      className="flex w-full items-center gap-2 border-t border-[var(--soft-border)] px-3 py-1.5 text-[9px] text-blue-400 hover:bg-white/8">
                      <span className="font-bold">+</span> &ldquo;{diagInput}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Completeness star score */}
            <div className="shrink-0 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
              <span className="text-[10px] text-yellow-400">★</span>
              <span className="text-[10px] font-black text-white">{starScore}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── DetailPanel ───────────────────────────────────────────────────────────────

function DetailPanel({ doc: d, onClose, onDelete, onRename, onEditLandmarks, onOpenEdit }) {
  const { checks, pct } = completeness(d);
  const color    = pct === 100 ? "#10b981" : pct >= 70 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";
  const landmarks = d.landmarks ? Object.entries(d.landmarks) : [];
  const qMeta    = QUALITY_META[d.image_quality];
  const starScore = ((pct / 100) * 5).toFixed(1);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(d.image || "");

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── IMAGE (top, full-width card photo) ── */}
      <div className="relative shrink-0 overflow-hidden">
        {d.image_url ? (
          <motion.img
            key={d.id}
            src={d.image_url}
            alt="X-ray"
            className="w-full object-cover bg-slate-950"
            style={{ height: "200px" }}
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        ) : (
          <div className="flex items-center justify-center bg-slate-950" style={{ height: "160px" }}>
            <ImageIcon className="h-10 w-10 text-slate-700" />
          </div>
        )}

        {/* gradient top → fade + bottom → dark */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.82) 100%)" }} />

        {/* top-left: quality badge */}
        <div className="absolute left-3 top-3">
          <div className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[8px] font-bold backdrop-blur-sm"
            style={{ borderColor: (qMeta?.color || "#64748b") + "50", color: qMeta?.color || "#94a3b8", background: (qMeta?.color || "#64748b") + "25" }}>
            <span>{qMeta?.icon}</span>
            <span>{qMeta?.label || "—"}</span>
          </div>
        </div>

        {/* top-right: close */}
        <button type="button" onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-sm transition hover:bg-black/60">
          <X className="h-3.5 w-3.5" />
        </button>

        {/* bottom overlay: side conditions / diagnoses + Edit Landmark pill */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {d.side_conditions ? (
              [["Ki", d.side_conditions.kiri], ["Ka", d.side_conditions.kanan]].map(([side, val]) => (
                <span key={side} className="rounded-full bg-white/20 px-2 py-0.5 text-[7px] font-bold capitalize text-white backdrop-blur-sm">
                  {side} · {val || "—"}
                </span>
              ))
            ) : (d.diagnoses?.slice(0, 2) || []).map((diag) => (
              <span key={diag} className="rounded-full bg-white/20 px-2 py-0.5 text-[7px] font-semibold text-white backdrop-blur-sm">
                {diag}
              </span>
            ))}
          </div>
          <button type="button" onClick={() => onEditLandmarks(d)} disabled={!d.image_url}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-violet-600/90 px-3 py-1.5 text-[8px] font-black text-white backdrop-blur-sm transition hover:bg-violet-500 active:scale-95 disabled:opacity-40">
            <MapPin className="h-3 w-3" />
            Landmark
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
              <ChevronRight className="h-2.5 w-2.5" />
            </span>
          </button>
        </div>
      </div>

      {/* ── INFO SECTION (scrollable, card-body style) ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>

        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.32, ease: "easeOut" }}
          className="space-y-2.5 px-4 pb-3 pt-4">
          {/* Filename (editable title) */}
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter")  { onRename(d.id, nameInput); setEditingName(false); }
                  if (e.key === "Escape") { setNameInput(d.image || ""); setEditingName(false); }
                }}
                className="min-w-0 flex-1 rounded-lg border border-blue-500/40 bg-white/8 px-2 py-1 text-[12px] font-black text-[var(--soft-text-hi)] outline-none"
              />
              <button type="button" onClick={() => { onRename(d.id, nameInput); setEditingName(false); }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => { setNameInput(d.image || ""); setEditingName(false); }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--soft-border)] text-slate-400">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[17px] font-black leading-tight text-[var(--soft-text-hi)]">
                {d.image || "Tanpa nama"}
              </p>
              <button type="button" onClick={() => { setNameInput(d.image || ""); setEditingName(true); }}
                className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--soft-border)] text-slate-500 transition hover:border-blue-500/40 hover:text-blue-400">
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Date · View */}
          <p className="text-[9px] text-slate-500">
            {fmtDate(d)} · <span style={{ color: VIEW_COLORS[d.view] || "#64748b" }}>{VIEW_LABELS[d.view] || d.view}</span>
          </p>

          {/* Completeness bar + field badges */}
          <div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.25 }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {checks.map(c => (
                <span key={c.key} className="rounded-full px-2 py-0.5 text-[7px] font-bold"
                  style={{
                    background: c.ok ? color + "18" : "#ffffff06",
                    color:      c.ok ? color       : "#475569",
                    border:     `1px solid ${c.ok ? color + "40" : "#ffffff0a"}`,
                  }}>
                  {c.key}
                </span>
              ))}
            </div>
          </div>

          {/* Patient meta row */}
          {(d.patient_gender || d.patient_age_group || d.notes) && (
            <p className="text-[8px] text-slate-500 leading-relaxed">
              {GENDER_LABEL[d.patient_gender] && <span>{GENDER_LABEL[d.patient_gender]}</span>}
              {d.patient_age_group && <span> · {d.patient_age_group} th</span>}
              {d.notes && <span className="italic"> · {d.notes}</span>}
            </p>
          )}

          {/* Landmark count + Edit Data ("Book Now" pill) */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[18px] font-black text-[var(--soft-text-hi)]">{d.landmark_count ?? landmarks.length}</span>
              <span className="ml-1 text-[8px] text-slate-500">titik · ★ {starScore}</span>
            </div>
            <button type="button" onClick={onOpenEdit}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[9px] font-black text-white shadow-lg transition hover:bg-slate-700 active:scale-95">
              Edit Data
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                <ChevronRight className="h-3 w-3" />
              </span>
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5">
            {[0,1,2,3,4].map(i => (
              <div key={i} className={`rounded-full transition-all ${i === 0 ? "h-1.5 w-4 bg-blue-500" : "h-1.5 w-1.5 bg-slate-700"}`} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.32, ease: "easeOut" }}>
        <div className="mx-4 border-t border-[var(--soft-border)]" />

        {/* Info grid */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[7px] font-black uppercase tracking-widest text-slate-600">Info Pasien & Foto</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "View",     value: VIEW_LABELS[d.view] || d.view,                   color: VIEW_COLORS[d.view] || "#64748b" },
              { label: "Kategori", value: d.category === "post-op" ? "Post-Op" : "Native", color: d.category === "post-op" ? "#f43f5e" : "#60a5fa" },
              { label: "Kualitas", value: qMeta?.label || d.image_quality || "—",          color: qMeta?.color || "#64748b" },
              { label: "Kelamin",  value: GENDER_LABEL[d.patient_gender] || "—",           color: "#a78bfa" },
              { label: "Usia",     value: d.patient_age_group || "—",                      color: "#06b6d4" },
              { label: "Ukuran",   value: d.image_size ? `${d.image_size.width}×${d.image_size.height}` : "—", color: "#94a3b8" },
            ].map(({ label, value, color: c }) => (
              <div key={label} className="rounded-xl border border-[var(--soft-border)] px-2.5 py-2">
                <p className="text-[6px] font-black uppercase tracking-widest text-slate-600">{label}</p>
                <p className="mt-0.5 truncate text-[9px] font-bold" style={{ color: c }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kondisi Sisi */}
        {d.side_conditions && (
          <div className="px-4 pb-3">
            <p className="mb-1.5 text-[7px] font-black uppercase tracking-widest text-slate-600">Kondisi Sisi</p>
            <div className="flex gap-1.5">
              {[["Kiri", d.side_conditions.kiri], ["Kanan", d.side_conditions.kanan]].map(([side, val]) => (
                <div key={side} className="flex-1 rounded-xl border border-[var(--soft-border)] px-2.5 py-2 text-center">
                  <p className="text-[6px] text-slate-600">{side}</p>
                  <p className="text-[9px] font-black capitalize text-slate-300">{val || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnoses */}
        {d.diagnoses?.length > 0 && (
          <div className="px-4 pb-3">
            <p className="mb-1.5 text-[7px] font-black uppercase tracking-widest text-slate-600">Diagnosis</p>
            <div className="flex flex-wrap gap-1">
              {d.diagnoses.map(diag => (
                <span key={diag} className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[7px] text-emerald-300">
                  {diag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {d.notes && (
          <div className="px-4 pb-3">
            <p className="mb-1.5 text-[7px] font-black uppercase tracking-widest text-slate-600">Catatan</p>
            <p className="rounded-xl border border-[var(--soft-border)] px-3 py-2 text-[8px] leading-relaxed text-slate-400">{d.notes}</p>
          </div>
        )}

        {/* Landmark list */}
        <div className="px-4 pb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-600">Landmark Teranotasi</p>
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[6px] font-black text-blue-400">
              {d.landmark_count ?? landmarks.length} titik
            </span>
          </div>
          {landmarks.length > 0 ? (
            <div className="space-y-0.5">
              {landmarks.map(([lmId, lm]) => (
                <div key={lmId} className="flex items-center gap-2 rounded-lg border border-[var(--soft-border)] px-2.5 py-1.5">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: lm.color || "#60a5fa" }} />
                  <p className="flex-1 truncate text-[7px] text-slate-400">{lm.label || lmId}</p>
                  <p className="shrink-0 font-mono text-[6px] text-slate-600">
                    {lm.x_norm != null ? `(${lm.x_norm.toFixed(3)}, ${lm.y_norm?.toFixed(3)})` : `(${lm.x}, ${lm.y})`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[7px] text-slate-600">Tidak ada landmark</p>
          )}
        </div>

        {/* Firestore ID */}
        <div className="px-4 pb-3">
          <p className="mb-1 text-[7px] font-black uppercase tracking-widest text-slate-600">Firestore ID</p>
          <p className="break-all rounded-lg border border-[var(--soft-border)] px-2.5 py-1.5 font-mono text-[6px] text-slate-600">{d.id}</p>
        </div>

        {/* Delete */}
        <div className="border-t border-[var(--soft-border)] px-4 pb-4 pt-3">
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/20 py-2 text-[8px] font-bold text-red-400/60 transition hover:border-red-500/40 hover:text-red-400">
              <Trash2 className="h-3 w-3" /> Hapus dokumen ini
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDel(false)}
                className="flex-1 rounded-xl border border-[var(--soft-border)] py-2 text-[8px] text-slate-500">
                Batal
              </button>
              <button type="button" onClick={() => onDelete(d.id)}
                className="flex-1 rounded-xl bg-red-600 py-2 text-[8px] font-black text-white">
                Ya, Hapus
              </button>
            </div>
          )}
        </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function MLAnnotationMonitor({ isOpen, onClose }) {
  const [docs,     setDocs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [filterView,    setFilterView]    = useState("all");
  const [filterQuality, setFilterQuality] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [editDoc,      setEditDoc]      = useState(null); // doc for landmark re-annotation
  const [editModalDoc, setEditModalDoc] = useState(null); // doc for data edit modal

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnnotations();
      setDocs(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal mengambil data dari Firebase");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) { load(); setSelectedId(null); }
  }, [isOpen, load]);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteAnnotation(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setSelectedId(null);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleRename = useCallback(async (id, newName) => {
    try {
      await renameAnnotation(id, newName);
      setDocs((prev) => prev.map((d) => d.id === id ? { ...d, image: newName } : d));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleEditLandmarks = useCallback((doc) => {
    setEditDoc(doc);
  }, []);

  const handleEditSave = useCallback((updatedDoc) => {
    setDocs(prev => prev.map(d => d.id === updatedDoc.id ? { ...d, ...updatedDoc } : d));
    setEditModalDoc(null);
  }, []);

  // Convert stored landmarks → placed state format { id: {x,y} }
  const editInitialPlaced = useMemo(() => {
    if (!editDoc?.landmarks) return {};
    return Object.fromEntries(
      Object.entries(editDoc.landmarks).map(([id, lm]) => [id, { x: lm.x, y: lm.y }])
    );
  }, [editDoc]);

  // stats
  const stats = useMemo(() => {
    const totalLandmarks = docs.reduce((s, d) => s + (d.landmark_count ?? 0), 0);
    const avgLandmarks   = docs.length > 0 ? Math.round(totalLandmarks / docs.length) : 0;
    const views          = new Set(docs.map((d) => d.view)).size;
    const latest         = docs[0] ? fmtDateShort(docs[0]) : "—";
    const complete       = docs.filter((d) => completeness(d).pct === 100).length;
    return { totalLandmarks, avgLandmarks, views, latest, complete };
  }, [docs]);

  // filter
  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (filterView !== "all"     && d.view !== filterView)           return false;
      if (filterQuality !== "all"  && d.image_quality !== filterQuality) return false;
      if (filterCategory !== "all" && d.category !== filterCategory)   return false;
      if (search) {
        const q = search.toLowerCase();
        const inImage = (d.image || "").toLowerCase().includes(q);
        const inNotes = (d.notes || "").toLowerCase().includes(q);
        const inDiag  = (d.diagnoses || []).some((x) => x.toLowerCase().includes(q));
        if (!inImage && !inNotes && !inDiag) return false;
      }
      return true;
    });
  }, [docs, filterView, filterQuality, filterCategory, search]);

  const selectedDoc = useMemo(() => docs.find((d) => d.id === selectedId), [docs, selectedId]);

  const uniqueViews = useMemo(() => [...new Set(docs.map((d) => d.view))], [docs]);

  const handleExportCSV = useCallback(() => {
    const header = ["id", "image", "view", "category", "landmark_count", "image_quality", "patient_gender", "patient_age_group", "diagnoses", "notes", "annotated_at"];
    const rows   = docs.map((d) => [
      d.id,
      d.image || "",
      d.view || "",
      d.category || "",
      d.landmark_count ?? 0,
      d.image_quality || "",
      d.patient_gender || "",
      d.patient_age_group || "",
      (d.diagnoses || []).join("; "),
      (d.notes || "").replace(/\n/g, " "),
      d.annotated_at || "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv  = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ml_annotations_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }, [docs]);

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm font-sans">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.05 }}
        className="flex flex-col w-full max-w-[96vw] h-[92vh] overflow-hidden rounded-2xl border border-[var(--soft-border)] shadow-2xl" style={{ background: "var(--color-body-bg)" }}>

      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--soft-border)] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20">
          <Database className="h-4 w-4 text-rose-400" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-tight text-[var(--soft-text-hi)]">Monitor Anotasi ML</p>
          <p className="text-[9px] text-slate-500">
            {loading ? "Memuat…" : `${docs.length} dokumen di Firestore · ${filtered.length} ditampilkan`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={handleExportCSV} disabled={docs.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--soft-border)] px-3 py-1.5 text-[9px] font-bold text-slate-400 transition hover:bg-white/10 disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button type="button" onClick={load} disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--soft-border)] text-slate-400 transition hover:bg-white/10 disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--soft-border)] text-slate-400 transition hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Main area ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* ── Stats row ── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
            className="shrink-0 grid grid-cols-4 gap-3 border-b border-[var(--soft-border)] px-5 py-4">
            {[
              { icon: Database, label: "Total Dokumen", value: docs.length,          sub: `${stats.complete} lengkap`,  color: "#3b82f6" },
              { icon: MapPin,   label: "Avg Landmark",  value: stats.avgLandmarks,   sub: "titik / pasien",             color: "#ec4899" },
              { icon: Eye,      label: "View Unik",     value: stats.views,          sub: "jenis foto berbeda",         color: "#06b6d4" },
              { icon: Calendar, label: "Terakhir",      value: stats.latest,         sub: "tanggal anotasi",            color: "#10b981" },
            ].map(({ icon, label, value, sub, color }) => (
              <motion.div
                key={label}
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}>
                <StatCard icon={icon} label={label} value={value} sub={sub} color={color} />
              </motion.div>
            ))}
          </motion.div>

          {/* ── Chart row ── */}
          {docs.length > 0 && (
            <div className="shrink-0 grid grid-cols-2 gap-3 border-b border-[var(--soft-border)] px-5 py-3">
              <QualityBar docs={docs} />
              <ViewBar docs={docs} />
            </div>
          )}

          {/* ── Filter bar ── */}
          <div className="shrink-0 flex items-center gap-2 border-b border-[var(--soft-border)] px-5 py-2.5">
            {/* search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama file, catatan, diagnosis…"
                className="w-full rounded-xl border border-[var(--soft-border)] bg-white/4 py-1.5 pl-8 pr-3 text-[9px] text-[var(--soft-text)] placeholder-slate-600 outline-none focus:border-blue-500/40" />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Filter className="h-3.5 w-3.5 shrink-0 text-slate-600" />

            {/* view filter */}
            <div className="relative">
              <select value={filterView} onChange={(e) => setFilterView(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="cursor-pointer appearance-none rounded-xl border border-[var(--soft-border)] bg-white/4 py-1.5 pl-2.5 pr-7 text-[9px] text-slate-300 outline-none">
                <option value="all">Semua View</option>
                {uniqueViews.map((v) => (
                  <option key={v} value={v}>{VIEW_LABELS[v] || v}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
            </div>

            {/* quality filter */}
            <div className="relative">
              <select value={filterQuality} onChange={(e) => setFilterQuality(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="cursor-pointer appearance-none rounded-xl border border-[var(--soft-border)] bg-white/4 py-1.5 pl-2.5 pr-7 text-[9px] text-slate-300 outline-none">
                <option value="all">Semua Kualitas</option>
                {Object.entries(QUALITY_META).map(([k, m]) => (
                  <option key={k} value={k}>{m.icon} {m.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
            </div>

            {/* category filter */}
            <div className="flex rounded-xl border border-[var(--soft-border)] overflow-hidden text-[9px]">
              {[["all", "Semua"], ["native", "Native"], ["post-op", "Post-Op"]].map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => setFilterCategory(val)}
                  className="px-2.5 py-1.5 font-bold transition"
                  style={filterCategory === val
                    ? { background: val === "post-op" ? "#f43f5e" : val === "native" ? "#3b82f6" : "#334155", color: "#fff" }
                    : { color: "#64748b" }}>
                  {lbl}
                </button>
              ))}
            </div>

            {(filterView !== "all" || filterQuality !== "all" || filterCategory !== "all" || search) && (
              <button type="button"
                onClick={() => { setFilterView("all"); setFilterQuality("all"); setFilterCategory("all"); setSearch(""); }}
                className="flex items-center gap-1 rounded-xl border border-[var(--soft-border)] px-2.5 py-1.5 text-[9px] text-slate-500 hover:text-rose-400 hover:border-rose-500/30">
                <X className="h-3 w-3" /> Reset
              </button>
            )}
          </div>

          {/* ── Table ── */}
          <div className="min-h-0 flex-1 overflow-auto" style={{ scrollbarWidth: "thin" }}>
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-[10px]">Mengambil data dari Firebase…</p>
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-[11px] font-bold text-red-400">{error}</p>
                <button type="button" onClick={load}
                  className="rounded-xl bg-red-500/20 px-4 py-2 text-[9px] font-bold text-red-400 hover:bg-red-500/30">
                  Coba Lagi
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Database className="h-8 w-8 text-slate-700" />
                <p className="text-[11px] text-slate-600">
                  {docs.length === 0 ? "Belum ada data anotasi tersimpan" : "Tidak ada data yang cocok dengan filter"}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10" style={{ background: "var(--color-surface)" }}>
                  <tr className="border-b border-[var(--soft-border)]">
                    {["", "Tanggal", "File / View", "Landmark", "Kualitas", "Pasien", "Diagnosis", "Lengkap", "Aksi"].map((h, i) => (
                      <th key={i} className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, idx) => {
                    const isSelected = selectedId === d.id;
                    const isExpanded = expandedRows[d.id];
                    const qMeta = QUALITY_META[d.image_quality];
                    const vColor = VIEW_COLORS[d.view] || "#64748b";
                    return (
                      <Fragment key={d.id}>
                        <tr
                          onClick={() => { setSelectedId(isSelected ? null : d.id); }}
                          className="group cursor-pointer border-b border-[var(--soft-border)] transition-all"
                          style={{ background: isSelected ? "#3b82f620" : idx % 2 === 0 ? "transparent" : "var(--color-surface-alt)" }}>
                          {/* expand arrow */}
                          <td className="w-6 pl-3 py-2.5">
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); setExpandedRows((prev) => ({ ...prev, [d.id]: !prev[d.id] })); }}
                              className="text-slate-600 hover:text-slate-300">
                              <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            </button>
                          </td>
                          {/* date */}
                          <td className="px-3 py-2.5 text-[8px] text-slate-500 whitespace-nowrap">{fmtDate(d)}</td>
                          {/* file + view */}
                          <td className="px-3 py-2.5 max-w-[160px]">
                            <p className="truncate text-[9px] font-bold text-[var(--soft-text)]">{d.image || "—"}</p>
                            <div className="mt-0.5 flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full" style={{ background: vColor }} />
                              <p className="text-[7px] text-slate-500">{VIEW_LABELS[d.view] || d.view}</p>
                              {d.category === "post-op" && (
                                <span className="rounded-full bg-rose-500/15 px-1 text-[6px] font-black text-rose-400">POST</span>
                              )}
                            </div>
                          </td>
                          {/* landmark count */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-black" style={{ background: "#3b82f620", color: "#60a5fa" }}>
                                {d.landmark_count ?? 0}
                              </span>
                            </div>
                          </td>
                          {/* quality */}
                          <td className="px-3 py-2.5">
                            {qMeta ? (
                              <span className="flex items-center gap-1 text-[8px] font-bold" style={{ color: qMeta.color }}>
                                {qMeta.icon} {qMeta.label}
                              </span>
                            ) : <span className="text-[8px] text-slate-600">—</span>}
                          </td>
                          {/* patient */}
                          <td className="px-3 py-2.5">
                            <p className="text-[8px] text-slate-400">{GENDER_LABEL[d.patient_gender] || "—"}</p>
                            <p className="text-[7px] text-slate-600">{d.patient_age_group || "—"}</p>
                          </td>
                          {/* diagnoses */}
                          <td className="px-3 py-2.5 max-w-[140px]">
                            {d.diagnoses?.length > 0 ? (
                              <div className="flex flex-wrap gap-0.5">
                                {d.diagnoses.slice(0, 2).map((diag) => (
                                  <span key={diag} className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[7px] text-emerald-400">
                                    {diag}
                                  </span>
                                ))}
                                {d.diagnoses.length > 2 && (
                                  <span className="text-[7px] text-slate-600">+{d.diagnoses.length - 2}</span>
                                )}
                              </div>
                            ) : <span className="text-[8px] text-slate-700">—</span>}
                          </td>
                          {/* completeness */}
                          <td className="px-3 py-2.5 w-24">
                            <CompletenessCell doc={d} />
                          </td>
                          {/* edit action */}
                          <td className="pr-3 py-2.5 w-8">
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); setEditModalDoc(d); }}
                              title="Edit data"
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--soft-border)] text-slate-600 opacity-0 transition hover:border-blue-500/40 hover:text-blue-400 group-hover:opacity-100">
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>

                        {/* expanded row — inline landmark list */}
                        {isExpanded && (
                          <tr key={`${d.id}-exp`} className="border-b border-[var(--soft-border)]"
                            style={{ background: "var(--color-surface-alt)" }}>
                            <td colSpan={8} className="px-6 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {d.landmarks && Object.entries(d.landmarks).map(([lmId, lm]) => (
                                  <div key={lmId} className="flex items-center gap-1.5 rounded-lg border border-[var(--soft-border)] px-2 py-1">
                                    <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: lm.color || "#60a5fa" }} />
                                    <p className="text-[7px] text-slate-400">{lm.label || lmId}</p>
                                    <p className="text-[6px] font-mono text-slate-600">
                                      {lm.x_norm != null ? `${lm.x_norm.toFixed(3)},${lm.y_norm?.toFixed(3)}` : `${lm.x},${lm.y}`}
                                    </p>
                                  </div>
                                ))}
                                {(!d.landmarks || Object.keys(d.landmarks).length === 0) && (
                                  <p className="text-[8px] text-slate-600">Tidak ada landmark tersimpan</p>
                                )}
                              </div>
                              {d.notes && (
                                <p className="mt-2 text-[8px] leading-relaxed text-slate-500">
                                  <span className="font-bold text-slate-600">Catatan: </span>{d.notes}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <AnimatePresence mode="wait">
          {selectedDoc && (
            <motion.div
              key={selectedDoc.id}
              initial={{ x: 52, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 52, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="flex w-[320px] shrink-0 flex-col border-l border-[var(--soft-border)]"
              style={{ background: "var(--color-surface-alt)" }}>
              <DetailPanel
                doc={selectedDoc}
                onClose={() => setSelectedId(null)}
                onDelete={handleDelete}
                onRename={handleRename}
                onEditLandmarks={handleEditLandmarks}
                onOpenEdit={() => setEditModalDoc(selectedDoc)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Status bar ── */}
      <div className="flex h-8 shrink-0 items-center gap-4 border-t border-[var(--soft-border)] px-5">
        <span className="text-[8px] text-slate-600">
          Firestore: <span className="text-slate-500">ml_annotations</span>
        </span>
        <span className="text-[8px] text-slate-600">
          {stats.complete}/{docs.length} dokumen lengkap
        </span>
        <span className="text-[8px] text-slate-600">
          rata-rata {stats.avgLandmarks} landmark/pasien
        </span>
      </div>
      </motion.div>

      {/* ── Edit data modal ── */}
      <AnimatePresence>
        {editModalDoc && (
          <EditModal
            key={editModalDoc.id}
            doc={editModalDoc}
            onClose={() => setEditModalDoc(null)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>

      {/* ── Edit landmark mode — opens annotation panel over monitor ── */}
      {editDoc && (
        <LandmarkAnnotationPanel
          isOpen={Boolean(editDoc)}
          onClose={() => setEditDoc(null)}
          imageSrc={editDoc.image_url}
          imageName={editDoc.image}
          editDocId={editDoc.id}
          initialViewId={editDoc.view}
          initialPlaced={editInitialPlaced}
          initialSideCond={editDoc.side_conditions ?? null}
          initialMLData={{
            image_quality:     editDoc.image_quality,
            patient_gender:    editDoc.patient_gender,
            patient_age_group: editDoc.patient_age_group,
            diagnoses:         editDoc.diagnoses ?? [],
            notes:             editDoc.notes ?? "",
          }}
          onSaved={() => { setEditDoc(null); load(); }}
        />
      )}
    </motion.div>,
    document.body,
  );
}
