"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Compass,
  Download,
  Eye,
  FileText,
  FolderOpen,
  GitCompare,
  History,
  Info,
  Layers,
  MapPin,
  Move,
  Palette,
  RotateCcw,
  Save,
  Scaling,
  Sliders,
  Upload,
  Users,
  Zap,
  X,
} from "lucide-react";
import {
  getImplantLibraryItemsByType,
  groupImplantLibraryBySystem,
  IMPLANT_LIBRARY_TYPE_LABELS,
} from "../lib/digitalTemplating/implantLibrary";

// ─── variants ────────────────────────────────────────────────────────────────

const PANEL_ENTER = {
  initial: { opacity: 0, x: -16, scale: 0.97 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", damping: 22, stiffness: 280 } },
  exit:    { opacity: 0, x: -12, scale: 0.97, transition: { duration: 0.18 } },
};

const COLLAPSE = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { type: "spring", damping: 24, stiffness: 260 } },
  exit:    { height: 0, opacity: 0, transition: { duration: 0.2 } },
};

const STAGGER_LIST = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const STAGGER_ITEM = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", damping: 20, stiffness: 300 } },
};

const TAP = { whileTap: { scale: 0.93 } };

// ─── Btn ─────────────────────────────────────────────────────────────────────

function Btn({ children, icon: Icon, iconCls = "text-slate-400", active = false, danger = false, disabled = false, className = "", ...props }) {
  const tone = danger
    ? "bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-[inset_0_1px_3px_rgba(244,63,94,0.15)] hover:bg-rose-500/15"
    : active
      ? "bg-slate-800/80 border-slate-600/50 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)]"
      : "bg-transparent border-[var(--soft-border)] text-[var(--soft-text)] hover:bg-white/6 transition-all duration-200";
  return (
    <motion.button
      type="button"
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-2xl border text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${className}`}
      {...TAP}
      {...props}
    >
      {Icon ? <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-white" : iconCls}`} /> : null}
      <span>{children}</span>
    </motion.button>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ label, expanded, onToggle, count, icon: Icon, iconCls = "text-slate-400", accent = "slate" }) {
  const accentMap = {
    blue:   "border-blue-500/35   bg-blue-500/10   text-blue-400   hover:bg-blue-500/15   shadow-[inset_0_1px_3px_rgba(59,130,246,0.12)]",
    violet: "border-violet-500/35 bg-violet-500/10 text-violet-400 hover:bg-violet-500/15 shadow-[inset_0_1px_3px_rgba(139,92,246,0.12)]",
    emerald:"border-emerald-500/35 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 shadow-[inset_0_1px_3px_rgba(16,185,129,0.12)]",
    slate:  "border-[var(--soft-border)] bg-transparent text-[var(--soft-text)] hover:bg-white/6",
  };
  const cls = accentMap[accent] ?? accentMap.slate;

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 transition-all duration-200 ${cls}`}
      {...TAP}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className={`h-3.5 w-3.5 shrink-0 ${iconCls}`} /> : null}
        <span className="text-xs font-black">{label}</span>
        {count != null ? (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-black text-[var(--soft-text-lo,theme(colors.slate.400))]">{count}</span>
        ) : null}
      </div>
      <motion.div
        animate={{ rotate: expanded ? 180 : 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        <ChevronDown className="h-4 w-4 opacity-50" />
      </motion.div>
    </motion.button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function QuickPanel({
  className = "",
  statusLabel = "Ready",
  workflowStep = 1,
  workflowMax = 4,
  measurementCount = 0,
  activeTool = "move",
  onMinimize,
  onUpload,
  onUploadLayer,
  onCalibration,
  onCreateLayer,
  canCreateLayer = true,
  onGuide,
  onMove,
  onOpenTka,
  onOpenHip,
  onTraumaPlanning,
  onHistory,
  canHistory = true,
  onReset,
  onOpenColorPanel,
  canOpenColorPanel = false,
  onUploadBefore,
  onUploadAfter,
  onToggleCompare,
  compareActive = false,
  compareDisabled = true,
  compareLabel = "Before kosong",
  onExportPng,
  onExportJpeg,
  onExportPdf,
  canExport = false,
  onUploadDrive,
  canUploadDrive = false,
  onOpenLibrary,
  onSaveTemplate,
  canSaveTemplate = false,
  libraryCount = 0,
  implantItems = [],
  selectedImplantType = "cup",
  selectedImplantItemId = "",
  onSelectImplantType,
  onSelectImplantItemId,
  onUseSelectedImplant,
  onReplaceSelectedImplant,
  canReplaceSelectedImplant = false,
  implantDisabled = false,
  implantInstruction = "",
  onPreOpReport,
  onPatientCases,
  onImplantEstimator,
  onDriveLibrary,
  onLandmarkAnnotation,
  onBrushTool,
  brushToolActive = false,
  onCupAssessment,
  cupAssessmentActive = false,
  lines = [],
  selectedLineId = null,
  onSelectLine,
  onRenameLine,
  onChangeLineColor,
  getLineLength,
  formatMeasurementFromPx,
  lineTypeLabel,
}) {
  const [uploadOpen, setUploadOpen]   = useState(false);
  const [actionsOpen, setActionsOpen] = useState(true);
  const [implantOpen, setImplantOpen] = useState(false);
  const [openImplantSystems, setOpenImplantSystems] = useState({});
  const [implantPreviewItem, setImplantPreviewItem] = useState(null);
  const [exportOpen, setExportOpen]   = useState(false);

  const activeToolKey = activeTool === "pan" ? "move" : activeTool;

  const filteredImplants = useMemo(
    () => getImplantLibraryItemsByType(selectedImplantType, implantItems),
    [implantItems, selectedImplantType],
  );
  const groupedImplants = useMemo(
    () => groupImplantLibraryBySystem(filteredImplants),
    [filteredImplants],
  );
  const selectedImplant =
    filteredImplants.find((i) => String(i.id) === String(selectedImplantItemId)) ||
    filteredImplants[0] ||
    null;

  const handleImplantTypeChange = (type) => {
    onSelectImplantType?.(type);
    setOpenImplantSystems({});
    const first = getImplantLibraryItemsByType(type, implantItems)[0];
    if (first) onSelectImplantItemId?.(first.id);
  };

  const toggleImplantSystem = (system, defaultOpen = false) => {
    setOpenImplantSystems((prev) => ({
      ...prev,
      [system]: !(prev[system] ?? defaultOpen),
    }));
  };

  return (
    <>
    <motion.div
      {...PANEL_ENTER}
      className={`w-[min(84vw,300px)] shrink-0 overflow-hidden rounded-[15px] border border-[var(--soft-border)] [background:var(--soft-float-bg)] text-[var(--soft-text)] shadow-[var(--soft-shadow-surface)] backdrop-blur-xl ${className}`}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--soft-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/15 shadow-[inset_0_1px_3px_rgba(59,130,246,0.15)]">
            <Sliders className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <p className="text-[11px] font-black tracking-widest text-[var(--soft-text)] uppercase">Quick Panel</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-400 shadow-[inset_0_1px_2px_rgba(16,185,129,0.1)]">
            {statusLabel}
          </span>
          <motion.button
            type="button"
            onClick={onMinimize}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--soft-border)] bg-transparent text-[var(--soft-text)] text-xs font-bold hover:bg-white/10 transition-colors"
            {...TAP}
            aria-label="Minimize"
          >
            –
          </motion.button>
        </div>
      </div>

      {/* ── Step info ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--soft-border)] bg-white/4 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-[8px] font-black tracking-widest text-[var(--soft-text-lo,theme(colors.slate.400))] uppercase">Step</p>
            <p className="font-mono text-sm font-black text-[var(--soft-text)]">{workflowStep}/{workflowMax}</p>
          </div>
          <div className="h-6 w-px bg-[var(--soft-border)]" />
          <div className="text-center">
            <p className="text-[8px] font-black tracking-widest text-[var(--soft-text-lo,theme(colors.slate.400))] uppercase">Ukur</p>
            <p className="font-mono text-sm font-black text-[var(--soft-text)]">{measurementCount}</p>
          </div>
        </div>
        {/* Step dots */}
        <div className="flex gap-1">
          {Array.from({ length: workflowMax }).map((_, i) => (
            <motion.div
              key={i}
              className={`h-2 rounded-full ${i < workflowStep ? "bg-emerald-500" : "bg-white/15"}`}
              animate={{ width: i === workflowStep - 1 ? 16 : 8 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            />
          ))}
        </div>
      </div>

      {/* ── Scroll body ────────────────────────────────── */}
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-4 py-3 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* ── Upload Xray (expandable) ──── */}
        <div className="space-y-1.5">
          <SectionHeader label="Upload Xray" expanded={uploadOpen} onToggle={() => setUploadOpen((p) => !p)} icon={FileText} iconCls="text-blue-400" accent="blue" />
          <AnimatePresence initial={false}>
            {uploadOpen ? (
              <motion.div key="upload-body" {...COLLAPSE} className="overflow-hidden">
                <motion.div
                  variants={STAGGER_LIST}
                  initial="initial"
                  animate="animate"
                  className="px-1 pb-2 space-y-2"
                >
                  <motion.p variants={STAGGER_ITEM} className="text-[8px] font-black tracking-widest text-[var(--soft-text-lo,theme(colors.slate.400))] uppercase">Background X-ray</motion.p>
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-1.5">
                    <Btn icon={FolderOpen} iconCls="text-cyan-400" onClick={() => { setUploadOpen(false); onOpenLibrary?.(); }} className="py-2">Drive</Btn>
                    <Btn icon={Upload} iconCls="text-slate-400" onClick={() => { setUploadOpen(false); onUpload?.(); }} className="py-2">Lokal</Btn>
                  </motion.div>
                  <motion.p variants={STAGGER_ITEM} className="text-[8px] font-black tracking-widest text-[var(--soft-text-lo,theme(colors.slate.400))] uppercase">+ Layer Baru</motion.p>
                  <motion.div variants={STAGGER_ITEM}>
                    <Btn icon={Upload} iconCls="text-violet-400" onClick={() => { setUploadOpen(false); onUploadLayer?.(); }} className="w-full py-2">Lokal</Btn>
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── Tombol utama ─────────────────── */}
        <div className="space-y-2">
          <p className="px-0.5 text-[8px] font-black tracking-widest text-[var(--soft-text-lo,theme(colors.slate.400))] uppercase">Setup</p>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn
              icon={Scaling}
              iconCls="text-emerald-400"
              onClick={onCalibration}
              className="py-2.5"
              title="Kalibrasi skala X-ray: pakai ruler/marker fisik atau circle caput femur untuk mengubah pixel menjadi ukuran nyata."
              aria-label="Kalibrasi skala X-ray"
            >
              Kalibrasi
            </Btn>
            <Btn icon={Layers} iconCls="text-indigo-400" onClick={onCreateLayer} disabled={!canCreateLayer} className="py-2.5">Layer Kosong</Btn>
          </div>

          <p className="px-0.5 text-[8px] font-black tracking-widest text-[var(--soft-text-lo,theme(colors.slate.400))] uppercase">Alat</p>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn icon={Compass} active={activeToolKey === "guideBuilder"} onClick={onGuide} className="py-2.5">Panduan</Btn>
            <Btn icon={Move} active={activeToolKey === "move"} onClick={onMove} className="py-2.5">Move</Btn>
          </div>

          <p className="px-0.5 text-[8px] font-black tracking-widest text-[var(--soft-text-lo,theme(colors.slate.400))] uppercase">Planning</p>
          <div className="grid grid-cols-2 gap-1.5">
            <Btn onClick={onOpenTka} className="py-2.5">
              <img src="/images/quick-panel/tka-icons.svg" alt="TKA" className="h-4 w-4 shrink-0 object-contain" />
              TKA
            </Btn>
            <Btn
              onClick={onOpenHip}
              className="py-2.5"
              title="Hip planning: panduan cup, stem, offset, LLD, dan parameter templating."
              aria-label="Hip planning"
            >
              <img src="/images/quick-panel/hip-icon.svg" alt="HIP" className="h-4 w-4 shrink-0 object-contain" />
              HIP
            </Btn>
            <Btn
              icon={AlertTriangle}
              iconCls="text-orange-400"
              onClick={onTraumaPlanning}
              className="col-span-2 py-2.5 border-orange-500/30 bg-orange-500/8 text-orange-300 hover:bg-orange-500/15"
            >
              Trauma
            </Btn>
            <Btn
              icon={MapPin}
              iconCls="text-rose-400"
              onClick={onLandmarkAnnotation}
              className="col-span-2 py-2.5 border-rose-500/30 bg-rose-500/8 text-rose-300 hover:bg-rose-500/15"
            >
              Anotasi Landmark
            </Btn>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Btn icon={History} iconCls="text-slate-400" onClick={onHistory} disabled={!canHistory} className="py-2.5">Undo</Btn>
            <Btn icon={RotateCcw} danger onClick={onReset} className="py-2.5">Reset</Btn>
          </div>
        </div>

        {/* ── Actions & Export (expandable) ─── */}
        <div className="space-y-1.5">
          <SectionHeader label="Actions & Export" expanded={actionsOpen} onToggle={() => setActionsOpen((p) => !p)} icon={Download} iconCls="text-emerald-400" accent="emerald" />
          <AnimatePresence initial={false}>
            {actionsOpen ? (
              <motion.div key="actions-body" {...COLLAPSE} className="overflow-hidden">
                <motion.div
                  variants={STAGGER_LIST}
                  initial="initial"
                  animate="animate"
                  className="px-1 pb-2 space-y-1.5"
                >
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-1.5">
                    <Btn icon={Palette} iconCls="text-fuchsia-400" disabled={!canOpenColorPanel} onClick={onOpenColorPanel} className="py-2">Color</Btn>
                    <Btn icon={Upload} iconCls="text-sky-400" onClick={onUploadBefore} className="py-2">Before</Btn>
                    <Btn icon={Upload} iconCls="text-emerald-400" onClick={onUploadAfter} className="py-2">After</Btn>
                    <Btn icon={GitCompare} iconCls="text-violet-400" active={compareActive} disabled={compareDisabled} onClick={onToggleCompare} className="py-2">
                      {compareActive ? "Exit" : "Compare"}
                    </Btn>
                  </motion.div>

                  <motion.div variants={STAGGER_ITEM} className="h-px bg-[var(--soft-border)] my-0.5" />

                  {/* Export — single trigger + dropdown */}
                  <motion.div variants={STAGGER_ITEM} className="space-y-1.5 mt-2">
                    <motion.button
                      type="button"
                      disabled={!canExport}
                      onClick={() => setExportOpen((p) => !p)}
                      className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        exportOpen
                          ? "border-cyan-500/40 bg-cyan-500/12 text-cyan-300"
                          : "border-[var(--soft-border)] text-[var(--soft-text)] hover:bg-white/6"
                      }`}
                      {...TAP}
                    >
                      <span className="flex items-center gap-2">
                        <Download className={`h-3.5 w-3.5 shrink-0 ${exportOpen ? "text-cyan-400" : "text-slate-400"}`} />
                        Export
                      </span>
                      <motion.span
                        animate={{ rotate: exportOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0"
                      >
                        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                      </motion.span>
                    </motion.button>
                    <AnimatePresence initial={false}>
                      {exportOpen && (
                        <motion.div
                          key="export-options"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1, transition: { type: "spring", damping: 24, stiffness: 300 } }}
                          exit={{ height: 0, opacity: 0, transition: { duration: 0.18 } }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                            {[
                              { label: "PNG",  icon: Download, iconCls: "text-cyan-400",  onClick: () => { onExportPng?.();  setExportOpen(false); } },
                              { label: "JPEG", icon: Download, iconCls: "text-amber-400", onClick: () => { onExportJpeg?.(); setExportOpen(false); } },
                              { label: "PDF",  icon: FileText, iconCls: "text-rose-400",  onClick: () => { onExportPdf?.();  setExportOpen(false); } },
                            ].map(({ label, icon: Icon, iconCls, onClick }) => (
                              <motion.button
                                key={label}
                                type="button"
                                onClick={onClick}
                                className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--soft-border)] py-2.5 text-[10px] font-black text-[var(--soft-text)] transition hover:bg-white/8 active:scale-95"
                                whileTap={{ scale: 0.93 }}
                              >
                                <Icon className={`h-4 w-4 ${iconCls}`} />
                                {label}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.p variants={STAGGER_ITEM} className="text-[8px] font-black tracking-widest text-blue-400/70 uppercase">Fitur Unggulan</motion.p>

                  {/* Primary action — Laporan */}
                  <motion.div variants={STAGGER_ITEM}>
                    <motion.button
                      type="button"
                      onClick={onPreOpReport}
                      className="flex w-full items-center gap-2.5 rounded-2xl bg-[linear-gradient(135deg,#1d4ed8,#2563eb)] px-3.5 py-3 text-[11px] font-black text-white shadow-[0_4px_16px_rgba(37,99,235,0.40),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:shadow-[0_6px_20px_rgba(37,99,235,0.50)] active:scale-[0.97]"
                      whileTap={{ scale: 0.97 }}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      Laporan Pre-Op PDF
                    </motion.button>
                  </motion.div>

                  {/* secondary actions */}
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-1.5">
                    <Btn
                      icon={Users}
                      iconCls="text-purple-400"
                      onClick={onPatientCases}
                      className="py-2.5 border-purple-500/30 bg-purple-500/8 hover:bg-purple-500/15 text-purple-300"
                    >
                      Kasus Pasien
                    </Btn>
                    <Btn
                      icon={Zap}
                      iconCls="text-teal-400"
                      onClick={onImplantEstimator}
                      className="py-2.5 border-teal-500/30 bg-teal-500/8 hover:bg-teal-500/15 text-teal-300"
                    >
                      Estimator
                    </Btn>
                    <Btn
                      icon={FolderOpen}
                      iconCls="text-sky-400"
                      onClick={onDriveLibrary}
                      className="col-span-2 py-2.5 border-sky-500/30 bg-sky-500/8 hover:bg-sky-500/15 text-sky-300"
                    >
                      Library Drive Implant
                    </Btn>
                  </motion.div>

                  <motion.div variants={STAGGER_ITEM} className="h-px bg-[var(--soft-border)] my-0.5" />

                  <motion.div variants={STAGGER_ITEM}>
                    <Btn icon={Upload} iconCls="text-cyan-400" disabled={!canUploadDrive} onClick={onUploadDrive} className="w-full py-2.5">
                      Upload ke Drive
                    </Btn>
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── Implant Library (expandable) ─── */}
        <div className="space-y-1.5">
          <SectionHeader label="Implant Library" expanded={implantOpen} onToggle={() => setImplantOpen((p) => !p)} icon={Layers} iconCls="text-violet-400" accent="violet" />
          <AnimatePresence initial={false}>
            {implantOpen ? (
              <motion.div key="implant-body" {...COLLAPSE} className="overflow-hidden">
                <motion.div
                  variants={STAGGER_LIST}
                  initial="initial"
                  animate="animate"
                  className="px-1 pb-2 space-y-2"
                >
                  {implantInstruction ? (
                    <motion.button
                      variants={STAGGER_ITEM}
                      type="button"
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--soft-border)] bg-white/10 text-[var(--soft-text)]"
                      title={implantInstruction}
                    >
                      <Info className="h-3 w-3" />
                    </motion.button>
                  ) : null}

                  {/* Type tabs */}
                  <motion.div variants={STAGGER_ITEM} className="flex gap-1 rounded-xl border border-[var(--soft-border)] bg-white/5 p-1">
                    {Object.entries(IMPLANT_LIBRARY_TYPE_LABELS).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleImplantTypeChange(type)}
                        className={`flex-1 rounded-lg py-1.5 text-[9px] font-black uppercase transition-all duration-200 ${
                          selectedImplantType === type
                            ? "bg-violet-500/20 border border-violet-500/40 text-violet-400 shadow-[inset_0_1px_3px_rgba(139,92,246,0.15)]"
                            : "text-[var(--soft-text-lo,theme(colors.slate.400))] hover:text-[var(--soft-text)]"
                        }`}
                      >
                        {label.slice(0, 4)}
                      </button>
                    ))}
                  </motion.div>

                  {/* Cards grouped by system */}
                  <motion.div variants={STAGGER_ITEM} className="max-h-56 overflow-y-auto space-y-2 pr-0.5">
                    {Object.keys(groupedImplants).length === 0 ? (
                      <p className="py-3 text-center text-[10px] text-[var(--soft-text-lo,theme(colors.slate.400))]">Belum ada item</p>
                    ) : (
                      Object.entries(groupedImplants).map(([system, items]) => {
                        const hasSelected = items.some((item) => String(item.id) === String(selectedImplant?.id));
                        const systemOpen = openImplantSystems[system] ?? hasSelected;
                        return (
                          <div key={system} className="overflow-hidden rounded-2xl border border-[var(--soft-border)] bg-white/[0.03]">
                            <button
                              type="button"
                              onClick={() => toggleImplantSystem(system, hasSelected)}
                              className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition ${
                                hasSelected ? "bg-violet-500/10" : "hover:bg-white/[0.04]"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[9px] font-black uppercase tracking-widest text-[var(--soft-text)]">
                                  {system}
                                </span>
                                <span className="mt-0.5 block text-[8px] font-bold text-[var(--soft-text-lo,theme(colors.slate.400))]">
                                  {items.length} item
                                </span>
                              </span>
                              <motion.span
                                animate={{ rotate: systemOpen ? 180 : 0 }}
                                transition={{ duration: 0.18 }}
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                  hasSelected
                                    ? "border-violet-500/35 bg-violet-500/15 text-violet-400"
                                    : "border-[var(--soft-border)] text-[var(--soft-text-lo,theme(colors.slate.400))]"
                                }`}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                              {systemOpen ? (
                                <motion.div
                                  key={`${system}-implant-items`}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18, ease: "easeOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="grid grid-cols-3 gap-1.5 px-2.5 pb-2.5 pt-0.5">
                                    {items.map((item) => {
                                      const isSelected = String(item.id) === String(selectedImplant?.id);
                                      return (
                                        <motion.button
                                          key={item.id}
                                          type="button"
                                          onClick={() => onSelectImplantItemId?.(item.id)}
                                          className={`group relative flex flex-col items-center gap-1 rounded-2xl border p-1.5 text-left transition-all duration-200 ${
                                            isSelected
                                              ? "border-violet-500/45 bg-violet-500/10 shadow-[inset_0_1px_4px_rgba(139,92,246,0.2)]"
                                              : "border-[var(--soft-border)] bg-transparent hover:bg-violet-500/8 hover:border-violet-500/30"
                                          }`}
                                          {...TAP}
                                          layout
                                        >
                                          <div className="flex h-10 w-full items-center justify-center overflow-hidden rounded-xl bg-black/60">
                                            {item.imageSrc ? (
                                              <img
                                                src={item.imageSrc}
                                                alt={item.label}
                                                className="h-full w-full object-contain"
                                              />
                                            ) : (
                                              <Layers className="h-5 w-5 text-slate-500" />
                                            )}
                                          </div>
                                          <span className={`w-full truncate text-center text-[8px] font-bold leading-tight ${isSelected ? "text-violet-400" : "text-[var(--soft-text-lo,theme(colors.slate.500))]"}`}>
                                            {item.size || item.label}
                                          </span>
                                          <motion.div
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); setImplantPreviewItem(item); }}
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setImplantPreviewItem(item); } }}
                                            className="absolute -top-1 -right-1 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/20 text-violet-400 shadow-sm group-hover:flex"
                                            title="Preview"
                                            whileTap={{ scale: 0.88 }}
                                          >
                                            <Eye className="h-3 w-3" />
                                          </motion.div>
                                          <AnimatePresence>
                                            {isSelected && (
                                              <motion.span
                                                key="sel"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_5px_rgba(139,92,246,0.6)]"
                                              />
                                            )}
                                          </AnimatePresence>
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </motion.div>

                  {/* Pakai / Ganti */}
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-2">
                    <motion.button
                      type="button"
                      onClick={onUseSelectedImplant}
                      disabled={implantDisabled || !selectedImplant}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-[11px] font-black text-emerald-400 shadow-[inset_0_1px_3px_rgba(16,185,129,0.15)] transition hover:bg-emerald-500/15 disabled:opacity-40"
                      {...TAP}
                    >
                      <Check className="h-3.5 w-3.5" /> Pakai
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={onReplaceSelectedImplant}
                      disabled={implantDisabled || !selectedImplant || !canReplaceSelectedImplant}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 py-2.5 text-[11px] font-black text-cyan-400 shadow-[inset_0_1px_3px_rgba(6,182,212,0.15)] transition hover:bg-cyan-500/15 disabled:opacity-40"
                      {...TAP}
                    >
                      <Scaling className="h-3.5 w-3.5" /> Ganti
                    </motion.button>
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>

    {/* ── Implant Preview Modal ── */}
    {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {implantPreviewItem && (
          <motion.div
            key="implant-preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setImplantPreviewItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 16 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs rounded-[28px] border border-[var(--soft-border)] [background:var(--soft-float-bg)] p-5 shadow-[var(--soft-shadow-float)] backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={() => setImplantPreviewItem(null)}
                className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--soft-border)] bg-white/10 text-[var(--soft-text)] hover:bg-white/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-black/70">
                {implantPreviewItem.imageSrc ? (
                  <img
                    src={implantPreviewItem.imageSrc}
                    alt={implantPreviewItem.label}
                    className="h-full w-full object-contain p-3"
                  />
                ) : (
                  <Layers className="h-12 w-12 text-slate-600" />
                )}
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-sm font-black text-[var(--soft-text)]">{implantPreviewItem.label}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {implantPreviewItem.brand && (
                    <span className="rounded-lg border border-violet-500/35 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold text-violet-400">{implantPreviewItem.brand}</span>
                  )}
                  {implantPreviewItem.system && (
                    <span className="rounded-lg border border-[var(--soft-border)] bg-white/8 px-2 py-0.5 text-[9px] font-bold text-[var(--soft-text)]">{implantPreviewItem.system}</span>
                  )}
                  {implantPreviewItem.type && (
                    <span className="rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-400 uppercase">{implantPreviewItem.type}</span>
                  )}
                  {implantPreviewItem.size && (
                    <span className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">Size {implantPreviewItem.size}</span>
                  )}
                </div>
                {(implantPreviewItem.physicalWidthMm || implantPreviewItem.physicalHeightMm) && (
                  <p className="pt-1 text-[9px] text-[var(--soft-text-lo,theme(colors.slate.400))]">
                    {implantPreviewItem.physicalWidthMm && `W: ${implantPreviewItem.physicalWidthMm}mm`}
                    {implantPreviewItem.physicalWidthMm && implantPreviewItem.physicalHeightMm && " · "}
                    {implantPreviewItem.physicalHeightMm && `H: ${implantPreviewItem.physicalHeightMm}mm`}
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  onClick={() => { onSelectImplantItemId?.(implantPreviewItem.id); onUseSelectedImplant?.(); setImplantPreviewItem(null); }}
                  disabled={implantDisabled}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-[11px] font-black text-emerald-400 shadow-[inset_0_1px_3px_rgba(16,185,129,0.15)] disabled:opacity-40"
                  {...TAP}
                >
                  <Check className="h-3.5 w-3.5" /> Pakai
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => { onSelectImplantItemId?.(implantPreviewItem.id); onReplaceSelectedImplant?.(); setImplantPreviewItem(null); }}
                  disabled={implantDisabled || !canReplaceSelectedImplant}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 py-2.5 text-[11px] font-black text-cyan-400 shadow-[inset_0_1px_3px_rgba(6,182,212,0.15)] disabled:opacity-40"
                  {...TAP}
                >
                  <Scaling className="h-3.5 w-3.5" /> Ganti
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}
