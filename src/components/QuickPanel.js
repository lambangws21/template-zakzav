"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
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

// ─── sub-components ──────────────────────────────────────────────────────────

function Btn({ children, icon: Icon, iconCls = "text-slate-500", active = false, danger = false, disabled = false, className = "", ...props }) {
  const tone = danger
    ? "bg-rose-50 border-rose-200/60 text-rose-600 hover:bg-rose-100"
    : active
      ? "bg-slate-900 border-slate-700 text-white"
      : "bg-white/70 border-white/80 text-slate-700 hover:bg-white shadow-[2px_2px_5px_rgba(148,163,184,0.22),-1px_-1px_4px_rgba(255,255,255,0.88)]";
  return (
    <motion.button
      type="button"
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-2xl border text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${className}`}
      {...TAP}
      {...props}
    >
      {Icon ? <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-white" : iconCls}`} /> : null}
      <span>{children}</span>
    </motion.button>
  );
}

function SectionHeader({ label, expanded, onToggle, count, icon: Icon, iconCls = "text-slate-500", accent = "slate" }) {
  const accentMap = {
    blue:   "border-blue-200/80   bg-blue-50/80   text-blue-700   hover:bg-blue-100/80",
    violet: "border-violet-200/80 bg-violet-50/80 text-violet-700 hover:bg-violet-100/80",
    emerald:"border-emerald-200/80 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80",
    slate:  "border-slate-200/80  bg-white/70     text-slate-700  hover:bg-white/90",
  };
  const cls = accentMap[accent] ?? accentMap.slate;

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 transition-colors ${cls} shadow-[1px_1px_4px_rgba(148,163,184,0.18),-1px_-1px_3px_rgba(255,255,255,0.82)]`}
      {...TAP}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className={`h-3.5 w-3.5 shrink-0 ${iconCls}`} /> : null}
        <span className="text-xs font-black">{label}</span>
        {count != null ? (
          <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-black text-slate-500 shadow-sm">{count}</span>
        ) : null}
      </div>
      <motion.div
        animate={{ rotate: expanded ? 180 : 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        <ChevronDown className="h-4 w-4 opacity-60" />
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
  const [implantPreviewItem, setImplantPreviewItem] = useState(null);

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
    const first = getImplantLibraryItemsByType(type, implantItems)[0];
    if (first) onSelectImplantItemId?.(first.id);
  };

  return (
    <>
    <motion.div
      {...PANEL_ENTER}
      className={`w-[min(84vw,300px)] shrink-0 overflow-hidden rounded-[28px] border border-white/75 bg-[#eef2f7]/96 text-slate-800 shadow-[6px_6px_18px_rgba(148,163,184,0.28),-6px_-6px_18px_rgba(255,255,255,0.82)] backdrop-blur-xl ${className}`}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Sliders className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[11px] font-black tracking-widest text-slate-700 uppercase">Quick Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">
            {statusLabel}
          </span>
          <motion.button
            type="button"
            onClick={onMinimize}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 border border-white/80 text-slate-500 text-xs font-bold shadow-sm hover:text-slate-800"
            {...TAP}
            aria-label="Minimize"
          >
            –
          </motion.button>
        </div>
      </div>

      {/* ── Step info ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 bg-white/30 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Step</p>
            <p className="font-mono text-sm font-black text-slate-700">{workflowStep}/{workflowMax}</p>
          </div>
          <div className="h-6 w-px bg-slate-200/70" />
          <div className="text-center">
            <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Ukur</p>
            <p className="font-mono text-sm font-black text-slate-700">{measurementCount}</p>
          </div>
        </div>
        {/* Step dots */}
        <div className="flex gap-1">
          {Array.from({ length: workflowMax }).map((_, i) => (
            <motion.div
              key={i}
              className={`h-2 rounded-full ${i < workflowStep ? "bg-emerald-500" : "bg-slate-200"}`}
              animate={{ width: i === workflowStep - 1 ? 16 : 8 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            />
          ))}
        </div>
      </div>

      {/* ── Scroll body ────────────────────────────────── */}
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-4 py-3 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* ── Upload & Sheet (expandable) ──── */}
        <div className="space-y-1.5">
          <SectionHeader label="Upload & Sheet" expanded={uploadOpen} onToggle={() => setUploadOpen((p) => !p)} icon={FileText} iconCls="text-blue-500" accent="blue" />
          <AnimatePresence initial={false}>
            {uploadOpen ? (
              <motion.div key="upload-body" {...COLLAPSE} className="overflow-hidden">
                <motion.div
                  variants={STAGGER_LIST}
                  initial="initial"
                  animate="animate"
                  className="px-1 pb-2 space-y-2"
                >
                  {/* Background */}
                  <motion.p variants={STAGGER_ITEM} className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Background X-ray</motion.p>
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-1.5">
                    <Btn icon={FolderOpen} iconCls="text-cyan-500" onClick={() => { setUploadOpen(false); onOpenLibrary?.(); }} className="py-2">Drive</Btn>
                    <Btn icon={Upload} iconCls="text-slate-500" onClick={() => { setUploadOpen(false); onUpload?.(); }} className="py-2">Lokal</Btn>
                  </motion.div>
                  {/* Layer */}
                  <motion.p variants={STAGGER_ITEM} className="text-[8px] font-black tracking-widest text-slate-400 uppercase">+ Layer Baru</motion.p>
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-1.5">
                    <Btn icon={FolderOpen} iconCls="text-violet-500" onClick={() => { setUploadOpen(false); onOpenLibrary?.(); }} className="py-2">Drive</Btn>
                    <Btn icon={Upload} iconCls="text-violet-500" onClick={() => { setUploadOpen(false); onUploadLayer?.(); }} className="py-2">Lokal</Btn>
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── Tombol utama ─────────────────── */}
        <motion.div
          variants={STAGGER_LIST}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-2"
        >
          {[
            { label: "Kalibrasi", icon: Scaling, iconCls: "text-emerald-500", action: onCalibration },
            { label: "Layer Kosong", icon: Layers, iconCls: "text-indigo-500", action: onCreateLayer, disabled: !canCreateLayer },
            { label: "Panduan", icon: Compass, active: activeToolKey === "guideBuilder", action: onGuide },
            { label: "Move", icon: Move, active: activeToolKey === "move", action: onMove },
            { label: "TKA", imageSrc: "/images/quick-panel/tka-icon.png", action: onOpenTka },
            { label: "HIP", imageSrc: "/images/quick-panel/hip-icon.png", action: onOpenHip },
            { label: "Undo", icon: History, iconCls: "text-slate-500", action: onHistory, disabled: !canHistory },
            { label: "Reset", icon: RotateCcw, danger: true, action: onReset },
          ].map((item) => (
            <motion.div key={item.label} variants={STAGGER_ITEM}>
              <Btn
                icon={item.icon}
                iconCls={item.iconCls}
                active={item.active}
                danger={item.danger}
                disabled={item.disabled}
                onClick={item.action}
                className="w-full py-2.5"
              >
                {item.imageSrc ? (
                  <img src={item.imageSrc} alt={item.label} className="h-5 w-5 rounded-lg object-cover" />
                ) : null}
                {item.label}
              </Btn>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Actions (expandable) ─────────── */}
        <div className="space-y-1.5">
          <SectionHeader label="Actions & Export" expanded={actionsOpen} onToggle={() => setActionsOpen((p) => !p)} icon={Download} iconCls="text-emerald-500" accent="emerald" />
          <AnimatePresence initial={false}>
            {actionsOpen ? (
              <motion.div key="actions-body" {...COLLAPSE} className="overflow-hidden">
                <motion.div
                  variants={STAGGER_LIST}
                  initial="initial"
                  animate="animate"
                  className="px-1 pb-2 space-y-1.5"
                >
                  {/* Compare */}
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-1.5">
                    <Btn icon={Palette} iconCls="text-fuchsia-500" disabled={!canOpenColorPanel} onClick={onOpenColorPanel} className="py-2">Color</Btn>
                    <Btn icon={Upload} iconCls="text-sky-500" onClick={onUploadBefore} className="py-2">Before</Btn>
                    <Btn icon={Upload} iconCls="text-emerald-500" onClick={onUploadAfter} className="py-2">After</Btn>
                    <Btn icon={GitCompare} iconCls="text-violet-500" active={compareActive} disabled={compareDisabled} onClick={onToggleCompare} className="py-2">
                      {compareActive ? "Exit" : "Compare"}
                    </Btn>
                  </motion.div>

                  {/* Divider */}
                  <motion.div variants={STAGGER_ITEM} className="h-px bg-slate-200/60 my-0.5" />

                  {/* Export */}
                  <motion.p variants={STAGGER_ITEM} className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Export</motion.p>
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-3 gap-1.5">
                    <Btn icon={Download} iconCls="text-cyan-600" disabled={!canExport} onClick={onExportPng} className="py-2">PNG</Btn>
                    <Btn icon={Download} iconCls="text-amber-600" disabled={!canExport} onClick={onExportJpeg} className="py-2">JPEG</Btn>
                    <Btn icon={FileText} iconCls="text-slate-700" disabled={!canExport} onClick={onExportPdf} className="py-2">PDF</Btn>
                  </motion.div>

                  {/* Flagship Features */}
                  <motion.p variants={STAGGER_ITEM} className="text-[8px] font-black tracking-widest text-blue-500 uppercase">Fitur Unggulan</motion.p>
                  <motion.div variants={STAGGER_ITEM}>
                    <motion.button
                      type="button"
                      onClick={onPreOpReport}
                      className="flex w-full items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1d4ed8,#2563eb)] px-3 py-2.5 text-[10px] font-black text-white shadow-[0_3px_12px_rgba(37,99,235,0.4)] transition active:scale-[0.97]"
                      whileTap={{ scale: 0.97 }}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      Laporan Pre-Op PDF
                    </motion.button>
                  </motion.div>
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-1.5">
                    <Btn icon={Users} iconCls="text-purple-500" onClick={onPatientCases} className="py-2">Kasus Pasien</Btn>
                    <Btn icon={Zap} iconCls="text-teal-500" onClick={onImplantEstimator} className="py-2">Estimator</Btn>
                  </motion.div>

                  {/* Divider */}
                  <motion.div variants={STAGGER_ITEM} className="h-px bg-slate-200/60 my-0.5" />

                  {/* Drive */}
                  <motion.p variants={STAGGER_ITEM} className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Drive</motion.p>
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-1.5">
                    <Btn icon={FolderOpen} iconCls="text-cyan-500" onClick={onOpenLibrary} className="py-2">
                      Library{libraryCount > 0 ? ` (${libraryCount})` : ""}
                    </Btn>
                    <Btn icon={Save} iconCls="text-emerald-600" disabled={!canSaveTemplate} onClick={onSaveTemplate} className="py-2">Simpan</Btn>
                  </motion.div>
                  <motion.div variants={STAGGER_ITEM}>
                    <Btn icon={Upload} iconCls="text-cyan-600" disabled={!canUploadDrive} onClick={onUploadDrive} className="w-full py-2">
                      Upload ke Drive
                    </Btn>
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── Implant (expandable) ─────────── */}
        <div className="space-y-1.5">
          <SectionHeader label="Implant Library" expanded={implantOpen} onToggle={() => setImplantOpen((p) => !p)} icon={Layers} iconCls="text-violet-500" accent="violet" />
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
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600"
                      title={implantInstruction}
                    >
                      <Info className="h-3 w-3" />
                    </motion.button>
                  ) : null}

                  {/* Type tabs */}
                  <motion.div variants={STAGGER_ITEM} className="flex gap-1 rounded-xl bg-slate-100 p-1">
                    {Object.entries(IMPLANT_LIBRARY_TYPE_LABELS).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleImplantTypeChange(type)}
                        className={`flex-1 rounded-lg py-1.5 text-[9px] font-black uppercase transition-all ${
                          selectedImplantType === type
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {label.slice(0, 4)}
                      </button>
                    ))}
                  </motion.div>

                  {/* Cards grouped by system */}
                  <motion.div variants={STAGGER_ITEM} className="max-h-56 overflow-y-auto space-y-3 pr-0.5">
                    {Object.keys(groupedImplants).length === 0 ? (
                      <p className="py-3 text-center text-[10px] text-slate-400">Belum ada item</p>
                    ) : (
                      Object.entries(groupedImplants).map(([system, items]) => (
                        <div key={system} className="space-y-1.5">
                          <p className="px-1 text-[8px] font-black uppercase tracking-widest text-slate-400">{system}</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {items.map((item) => {
                              const isSelected = String(item.id) === String(selectedImplant?.id);
                              return (
                                <motion.button
                                  key={item.id}
                                  type="button"
                                  onClick={() => onSelectImplantItemId?.(item.id)}
                                  className={`group relative flex flex-col items-center gap-1 rounded-2xl border p-1.5 text-left transition-all ${
                                    isSelected
                                      ? "border-violet-400 bg-violet-50 shadow-[0_0_8px_rgba(167,139,250,0.35)]"
                                      : "border-white/70 bg-white/60 hover:border-violet-200 hover:bg-violet-50/50"
                                  }`}
                                  {...TAP}
                                  layout
                                >
                                  {/* thumbnail */}
                                  <div className="flex h-10 w-full items-center justify-center overflow-hidden rounded-xl bg-black">
                                    {item.imageSrc ? (
                                      <img
                                        src={item.imageSrc}
                                        alt={item.label}
                                        className="h-full w-full object-contain"
                                      />
                                    ) : (
                                      <Layers className="h-5 w-5 text-slate-300" />
                                    )}
                                  </div>
                                  <span className="w-full truncate text-center text-[8px] font-bold leading-tight text-slate-700">
                                    {item.size || item.label}
                                  </span>
                                  {/* preview button — div karena berada di dalam motion.button */}
                                  <motion.div
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); setImplantPreviewItem(item); }}
                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setImplantPreviewItem(item); } }}
                                    className="absolute -top-1 -right-1 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-violet-300 bg-white text-violet-500 shadow-sm group-hover:flex"
                                    title="Preview"
                                    whileTap={{ scale: 0.88 }}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </motion.div>
                                  {/* selected dot */}
                                  <AnimatePresence>
                                    {isSelected && (
                                      <motion.span
                                        key="sel"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_5px_rgba(167,139,250,0.7)]"
                                      />
                                    )}
                                  </AnimatePresence>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>

                  {/* Pakai / Ganti */}
                  <motion.div variants={STAGGER_ITEM} className="grid grid-cols-2 gap-2">
                    <motion.button
                      type="button"
                      onClick={onUseSelectedImplant}
                      disabled={implantDisabled || !selectedImplant}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-100/80 py-2.5 text-[11px] font-black text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-40"
                      {...TAP}
                    >
                      <Check className="h-3.5 w-3.5" /> Pakai
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={onReplaceSelectedImplant}
                      disabled={implantDisabled || !selectedImplant || !canReplaceSelectedImplant}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-cyan-300 bg-cyan-100/75 py-2.5 text-[11px] font-black text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-40"
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

    {/* ── Implant Preview Modal — dirender via portal agar fixed bekerja benar ── */}
    {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {implantPreviewItem && (
          <motion.div
            key="implant-preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setImplantPreviewItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 16 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs rounded-[28px] border border-white/70 bg-[#eef2f7]/98 p-5 shadow-[8px_8px_24px_rgba(148,163,184,0.36),-8px_-8px_24px_rgba(255,255,255,0.88)] backdrop-blur-xl"
            >
              {/* close */}
              <button
                type="button"
                onClick={() => setImplantPreviewItem(null)}
                className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/80 text-slate-500 hover:bg-slate-300/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* image — background hitam agar implant terlihat jelas */}
              <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-black">
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

              {/* info */}
              <div className="mt-4 space-y-1">
                <p className="text-sm font-black text-slate-800">{implantPreviewItem.label}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {implantPreviewItem.brand && (
                    <span className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-700">{implantPreviewItem.brand}</span>
                  )}
                  {implantPreviewItem.system && (
                    <span className="rounded-lg border border-slate-200 bg-white/70 px-2 py-0.5 text-[9px] font-bold text-slate-600">{implantPreviewItem.system}</span>
                  )}
                  {implantPreviewItem.type && (
                    <span className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[9px] font-bold text-cyan-700 uppercase">{implantPreviewItem.type}</span>
                  )}
                  {implantPreviewItem.size && (
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Size {implantPreviewItem.size}</span>
                  )}
                </div>
                {(implantPreviewItem.physicalWidthMm || implantPreviewItem.physicalHeightMm) && (
                  <p className="pt-1 text-[9px] text-slate-400">
                    {implantPreviewItem.physicalWidthMm && `W: ${implantPreviewItem.physicalWidthMm}mm`}
                    {implantPreviewItem.physicalWidthMm && implantPreviewItem.physicalHeightMm && " · "}
                    {implantPreviewItem.physicalHeightMm && `H: ${implantPreviewItem.physicalHeightMm}mm`}
                  </p>
                )}
              </div>

              {/* actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  onClick={() => { onSelectImplantItemId?.(implantPreviewItem.id); onUseSelectedImplant?.(); setImplantPreviewItem(null); }}
                  disabled={implantDisabled}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-100/80 py-2.5 text-[11px] font-black text-emerald-800 disabled:opacity-40"
                  {...TAP}
                >
                  <Check className="h-3.5 w-3.5" /> Pakai
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => { onSelectImplantItemId?.(implantPreviewItem.id); onReplaceSelectedImplant?.(); setImplantPreviewItem(null); }}
                  disabled={implantDisabled || !canReplaceSelectedImplant}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-cyan-300 bg-cyan-100/75 py-2.5 text-[11px] font-black text-cyan-800 disabled:opacity-40"
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
