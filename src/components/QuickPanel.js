"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Compass,
  Calculator,
  Download,
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
} from "lucide-react";
import {
  getImplantLibraryItemsByType,
  IMPLANT_LIBRARY_TYPE_LABELS,
} from "../lib/digitalTemplating/implantLibrary";

const TAP = { whileTap: { scale: 0.94 } };

const QUICK_PANEL_STYLES = `
  .qpanel-scroll {
    scrollbar-width: thin;
    overscroll-behavior: contain;
  }
  .qpanel-section {
    background: rgba(255,255,255,0.24);
    border-color: rgba(255,255,255,0.65);
  }
  .qpanel-btn {
    box-shadow: 1px 1px 4px rgba(148,163,184,0.18), -1px -1px 4px rgba(255,255,255,0.72);
  }
  [data-theme="dark"] .qpanel-section {
    background: rgba(255,255,255,0.045);
    border-color: var(--soft-border);
  }
  [data-theme="dark"] .qpanel-btn {
    background: rgba(255,255,255,0.06) !important;
    border-color: rgba(255,255,255,0.11) !important;
    color: var(--soft-text) !important;
    box-shadow: var(--soft-shadow-raised);
  }
  [data-theme="dark"] .qpanel-btn-active {
    background: #0f172a !important;
    border-color: rgba(148,163,184,0.28) !important;
    color: #f8fafc !important;
  }
  [data-theme="dark"] .qpanel-btn-danger {
    background: rgba(190,18,60,0.18) !important;
    border-color: rgba(251,113,133,0.28) !important;
    color: #fb7185 !important;
  }
`;

function CompactButton({
  children,
  icon: Icon,
  active = false,
  danger = false,
  disabled = false,
  className = "",
  ...props
}) {
  const tone = danger
    ? "qpanel-btn-danger border-rose-200 bg-rose-50 text-rose-600"
    : active
      ? "qpanel-btn-active border-slate-900 bg-slate-900 text-white"
      : "border-white/70 bg-white/35 text-slate-700 hover:bg-white/65";

  return (
    <motion.button
      type="button"
      disabled={disabled}
      className={`qpanel-btn flex min-h-9 items-center justify-center gap-1.5 rounded-2xl border px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${className}`}
      {...TAP}
      {...props}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </motion.button>
  );
}

function Section({ title, icon: Icon, open, onToggle, children }) {
  return (
    <div className="qpanel-section rounded-[18px] border p-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 rounded-2xl px-1.5 py-1.5 text-left text-[9px] font-black uppercase tracking-widest text-slate-500"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1 pb-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function QuickPanel({
  className = "",
  statusLabel = "Ready",
  workflowStep = 1,
  workflowMax = 5,
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
  onNormmedFemoralSizer,
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
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [implantOpen, setImplantOpen] = useState(false);

  const activeToolKey = activeTool === "pan" ? "move" : activeTool;
  const filteredImplants = useMemo(
    () => getImplantLibraryItemsByType(selectedImplantType, implantItems),
    [implantItems, selectedImplantType],
  );
  const selectedImplant =
    filteredImplants.find((item) => String(item.id) === String(selectedImplantItemId)) ||
    filteredImplants[0] ||
    null;

  const handleImplantTypeChange = (type) => {
    onSelectImplantType?.(type);
    const firstItem = getImplantLibraryItemsByType(type, implantItems)[0];
    if (firstItem) onSelectImplantItemId?.(firstItem.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -14, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -12, scale: 0.96 }}
      transition={{ type: "spring", damping: 24, stiffness: 280 }}
      className={`qpanel flex max-h-[min(760px,calc(100dvh-48px))] w-[252px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[22px] border border-[var(--soft-float-border)] [background:var(--soft-float-bg)] p-2.5 text-[var(--soft-text)] shadow-[var(--soft-shadow-float)] backdrop-blur-xl ${className}`}
    >
      <style>{QUICK_PANEL_STYLES}</style>
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_4px_10px_rgba(15,23,42,0.18)]">
          <Sliders className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-black uppercase tracking-widest text-slate-500">
            Quick
          </div>
          <div className="truncate text-[9px] font-bold text-slate-500">
            {statusLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={onMinimize}
          className="qpanel-btn flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/36 text-xs font-black text-slate-500"
          aria-label="Minimize Quick Panel"
          title="Minimize"
        >
          -
        </button>
      </div>

      <div className="qpanel-scroll min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
      <div className="qpanel-section rounded-[18px] border px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 text-[11px] font-black text-slate-900">
            Step {workflowStep}/{workflowMax}
          </div>
          <div className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-black text-white">
            {measurementCount} Ukur
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: workflowMax }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                index < workflowStep ? "bg-emerald-500" : "bg-slate-300/70"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setUploadOpen((value) => !value)}
          className="qpanel-btn flex min-h-10 w-full items-center justify-between gap-2 rounded-[18px] border border-white/70 bg-white/42 px-3 text-[10px] font-black text-slate-800"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Upload className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
            <span className="truncate">+ Upload X-Ray</span>
          </span>
          <ChevronDown className={`h-3.5 w-3.5 transition ${uploadOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {uploadOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="qpanel-section mt-1.5 grid grid-cols-2 gap-1.5 rounded-[18px] border p-2 shadow-[var(--soft-shadow-float)] backdrop-blur-xl"
            >
              <CompactButton icon={FolderOpen} onClick={() => { setUploadOpen(false); onOpenLibrary?.(); }}>
                Drive
              </CompactButton>
              <CompactButton icon={Upload} onClick={() => { setUploadOpen(false); onUpload?.(); }}>
                Lokal
              </CompactButton>
              <CompactButton icon={Layers} onClick={() => { setUploadOpen(false); onUploadLayer?.(); }}>
                Layer
              </CompactButton>
              <CompactButton icon={Save} disabled={!canSaveTemplate} onClick={() => { setUploadOpen(false); onSaveTemplate?.(); }}>
                Save
              </CompactButton>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 px-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
            Setup & Alat
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <CompactButton icon={Scaling} onClick={onCalibration}>
              Kalibrasi
            </CompactButton>
            <CompactButton icon={Layers} disabled={!canCreateLayer} onClick={onCreateLayer}>
              Layer
            </CompactButton>
            <CompactButton icon={Compass} active={activeToolKey === "guideBuilder"} onClick={onGuide}>
              Panduan
            </CompactButton>
            <CompactButton icon={Move} active={activeToolKey === "move"} onClick={onMove}>
              Move
            </CompactButton>
          </div>
        </div>

        <div>
          <div className="mb-1 px-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
            Planning
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <CompactButton onClick={onOpenTka}>
              <img
                src="/images/quick-panel/tka-icons.svg"
                alt=""
                className="h-4 w-4 shrink-0 object-contain"
              />
              TKA
            </CompactButton>
            <CompactButton onClick={onOpenHip}>
              <img
                src="/images/quick-panel/hip-icon.svg"
                alt=""
                className="h-4 w-4 shrink-0 object-contain"
              />
              HIP
            </CompactButton>
            <CompactButton icon={Calculator} onClick={onNormmedFemoralSizer}>
              Fem Size
            </CompactButton>
            {onTraumaPlanning ? (
              <CompactButton icon={Compass} onClick={onTraumaPlanning}>
                Trauma
              </CompactButton>
            ) : null}
            <CompactButton icon={History} disabled={!canHistory} onClick={onHistory}>
              Undo
            </CompactButton>
            <CompactButton icon={RotateCcw} danger onClick={onReset}>
              Reset
            </CompactButton>
          </div>
        </div>

        <Section
          title="More & Export"
          icon={Download}
          open={moreOpen}
          onToggle={() => setMoreOpen((value) => !value)}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <CompactButton icon={Palette} disabled={!canOpenColorPanel} onClick={onOpenColorPanel}>
              Color
            </CompactButton>
            <CompactButton icon={GitCompare} active={compareActive} disabled={compareDisabled} onClick={onToggleCompare}>
              Compare
            </CompactButton>
            <CompactButton icon={Upload} onClick={onUploadBefore}>
              Before
            </CompactButton>
            <CompactButton icon={Upload} onClick={onUploadAfter}>
              After
            </CompactButton>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <CompactButton icon={Download} disabled={!canExport} onClick={onExportPng}>
              PNG
            </CompactButton>
            <CompactButton icon={Download} disabled={!canExport} onClick={onExportJpeg}>
              JPG
            </CompactButton>
            <CompactButton icon={FileText} disabled={!canExport} onClick={onExportPdf}>
              PDF
            </CompactButton>
          </div>
          <CompactButton icon={FileText} onClick={onPreOpReport} className="w-full bg-blue-600 text-white">
            Laporan Pre-Op
          </CompactButton>
          <div className="grid grid-cols-2 gap-1.5">
            <CompactButton icon={Users} onClick={onPatientCases}>
              Kasus
            </CompactButton>
            <CompactButton icon={Zap} onClick={onImplantEstimator}>
              Estimator
            </CompactButton>
            {onLandmarkAnnotation ? (
              <CompactButton icon={Compass} onClick={onLandmarkAnnotation}>
                Landmark
              </CompactButton>
            ) : null}
            {onBrushTool ? (
              <CompactButton icon={Palette} active={brushToolActive} onClick={onBrushTool}>
                Brush
              </CompactButton>
            ) : null}
            <CompactButton icon={Upload} disabled={!canUploadDrive} onClick={onUploadDrive}>
              Drive
            </CompactButton>
            {onDriveLibrary ? (
              <CompactButton icon={FolderOpen} onClick={onDriveLibrary}>
                Drive Lib
              </CompactButton>
            ) : null}
            <CompactButton icon={FolderOpen} onClick={onOpenLibrary}>
              Lib {libraryCount || ""}
            </CompactButton>
          </div>
          <CompactButton icon={Compass} active={cupAssessmentActive} onClick={onCupAssessment} className="w-full">
            Cup Assess
          </CompactButton>
        </Section>

        <Section
          title="Implant"
          icon={Layers}
          open={implantOpen}
          onToggle={() => setImplantOpen((value) => !value)}
        >
          {implantInstruction ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-2 py-1.5 text-[9px] font-bold leading-snug text-amber-800">
              <Info className="mr-1 inline h-3 w-3" />
              {implantInstruction}
            </div>
          ) : null}
          <div className="flex gap-1 rounded-2xl border border-white/60 bg-white/26 p-1">
            {Object.entries(IMPLANT_LIBRARY_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => handleImplantTypeChange(type)}
                className={`min-h-8 flex-1 rounded-xl px-1 text-[8px] font-black uppercase ${
                  selectedImplantType === type
                    ? "bg-slate-900 text-white"
                    : "text-slate-500"
                }`}
                title={label}
              >
                {label.slice(0, 3)}
              </button>
            ))}
          </div>
          <select
            value={selectedImplant?.id || ""}
            onChange={(event) => onSelectImplantItemId?.(event.target.value)}
            className="min-h-9 w-full rounded-2xl border border-white/70 bg-white/45 px-2 text-[10px] font-bold text-slate-700 outline-none"
          >
            {filteredImplants.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-1.5">
            <CompactButton icon={Check} disabled={implantDisabled || !selectedImplant} onClick={onUseSelectedImplant}>
              Pakai
            </CompactButton>
            <CompactButton
              icon={Scaling}
              disabled={implantDisabled || !selectedImplant || !canReplaceSelectedImplant}
              onClick={onReplaceSelectedImplant}
            >
              Ganti
            </CompactButton>
          </div>
        </Section>
      </div>
      </div>
    </motion.div>
  );
}
