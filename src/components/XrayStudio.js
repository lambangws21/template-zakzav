"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   ICONS (inline SVG to keep the file self-contained)
═══════════════════════════════════════════════════════════ */
const Icon = {
  Move: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 2l2 3H8l2-3zM10 18l-2-3h4l-2 3zM2 10l3-2v4L2 10zM18 10l-3 2V8l3 2zM9 9h2v2H9z" />
    </svg>
  ),
  Zoom: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  ),
  Pan: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M9 3a1 1 0 000 2h.01A1 1 0 009 3zM11 9a1 1 0 10-2 0v4a1 1 0 102 0V9zM8 9a1 1 0 10-2 0v1H5a1 1 0 100 2h1v1a1 1 0 102 0V9zM14 9a1 1 0 10-2 0v4a1 1 0 102 0V9z" />
    </svg>
  ),
  Line: () => (
    <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="h-4 w-4">
      <path d="M3 17L17 3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Circle: () => (
    <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="h-4 w-4">
      <circle cx="10" cy="10" r="7" strokeWidth="2" />
    </svg>
  ),
  Point: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <circle cx="10" cy="10" r="3" />
    </svg>
  ),
  Angle: () => (
    <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="h-4 w-4">
      <path d="M4 16L10 4L16 16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 13h8" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  ),
  Text: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 11-2 0V5H4v1a1 1 0 11-2 0V4zm3 8a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-1 4a1 1 0 100 2h8a1 1 0 100-2H5z" />
    </svg>
  ),
  Cut: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M5.5 2a3.5 3.5 0 101.665 6.58L8.585 10l-1.42 1.42a3.5 3.5 0 101.414 1.414l1.42-1.42 1.42 1.42a3.5 3.5 0 101.414-1.414L11.415 10l3.585-3.585A3.5 3.5 0 1013.5 5a3.48 3.48 0 00-2.465 1.024L10 7.06 8.965 6.024A3.48 3.48 0 005.5 2z" clipRule="evenodd" />
    </svg>
  ),
  HKA: () => (
    <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="h-4 w-4">
      <path d="M5 3v14M10 3v14M15 3v14M5 10h10" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H9a5 5 0 00-5 5v2a1 1 0 11-2 0v-2a7 7 0 017-7h5.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  Patient: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const TOOLS = [
  { id: "line",   label: "LINE",   icon: "Line",   color: "sky" },
  { id: "circle", label: "CIRCLE", icon: "Circle", color: "violet" },
  { id: "point",  label: "POINT",  icon: "Point",  color: "amber" },
  { id: "angle",  label: "ANGLE",  icon: "Angle",  color: "emerald" },
  { id: "text",   label: "TEXT",   icon: "Text",   color: "rose" },
  { id: "cut",    label: "CUT",    icon: "Cut",    color: "orange" },
  { id: "hka",    label: "HKA",    icon: "HKA",    color: "teal" },
];

const NAV_TOOLS = [
  { id: "move", label: "Move",   icon: "Move" },
  { id: "zoom", label: "Zoom",   icon: "Zoom" },
  { id: "pan",  label: "Pan",    icon: "Pan" },
];

const STEPS = [
  { id: "upload",   label: "Upload",   emoji: "📤" },
  { id: "kalib",    label: "Kalib",    emoji: "📏" },
  { id: "ukur",     label: "Ukur",     emoji: "📐" },
  { id: "export",   label: "Export",   emoji: "💾" },
  { id: "template", label: "Template", emoji: "🗂️" },
];

const COIN_OPTIONS = [
  { label: "28mm (1-Euro)", value: 28 },
  { label: "25mm (US Quarter)", value: 25 },
  { label: "23mm (10-Sen)", value: 23 },
  { label: "Custom…", value: -1 },
];

const COLOR_MAP = {
  sky: { btn: "bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/35", active: "bg-sky-500 text-white border-sky-400 shadow-sky-500/40" },
  violet: { btn: "bg-violet-500/20 text-violet-300 border-violet-500/40 hover:bg-violet-500/35", active: "bg-violet-500 text-white border-violet-400 shadow-violet-500/40" },
  amber: { btn: "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/35", active: "bg-amber-500 text-white border-amber-400 shadow-amber-500/40" },
  emerald: { btn: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/35", active: "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/40" },
  rose: { btn: "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/35", active: "bg-rose-500 text-white border-rose-400 shadow-rose-500/40" },
  orange: { btn: "bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/35", active: "bg-orange-500 text-white border-orange-400 shadow-orange-500/40" },
  teal: { btn: "bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/35", active: "bg-teal-500 text-white border-teal-400 shadow-teal-500/40" },
};

/* ═══════════════════════════════════════════════════════════
   DEMO PATIENTS
═══════════════════════════════════════════════════════════ */
const DEMO_CASES = [
  { id: 1, name: "Budi Santoso", age: 64, side: "Kanan", dx: "OA Grade III", hasXray: true },
  { id: 2, name: "Siti Rahayu", age: 71, side: "Kiri",  dx: "OA Grade IV", hasXray: true },
  { id: 3, name: "Ahmad Fauzi", age: 58, side: "Kanan", dx: "AVN Femur",   hasXray: false },
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function XrayStudio() {
  /* ── State ── */
  const [activeTool, setActiveTool]   = useState("line");
  const [navTool, setNavTool]         = useState("move");
  const [stepIdx, setStepIdx]         = useState(0);
  const [selectedCase, setSelectedCase] = useState(DEMO_CASES[0]);
  const [xrayImage, setXrayImage]     = useState(null);
  const [calibDone, setCalibDone]     = useState(false);
  const [calibMode, setCalibMode]     = useState(false);
  const [coinSize, setCoinSize]       = useState(28);
  const [customCoin, setCustomCoin]   = useState("");
  const [showCalibPanel, setShowCalibPanel] = useState(true);
  const [measurements, setMeasurements] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zoom, setZoom]               = useState(1);
  const [pan, setPan]                 = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning]     = useState(false);
  const [panStart, setPanStart]       = useState(null);
  const [toast, setToast]             = useState(null);
  const [exportMenu, setExportMenu]   = useState(false);

  const canvasRef  = useRef(null);
  const fileRef    = useRef(null);
  const overlayRef = useRef(null);

  /* ── Toast helper ── */
  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  /* ── File upload ── */
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setXrayImage(ev.target.result);
      setStepIdx(1);
      setCalibDone(false);
      setMeasurements([]);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      showToast("X-Ray berhasil dimuat — lanjut ke kalibrasi", "success");
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  /* ── Drag-drop onto canvas ── */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setXrayImage(ev.target.result);
        setStepIdx(1);
        setCalibDone(false);
        setMeasurements([]);
        showToast("X-Ray dimuat via drag-drop", "success");
      };
      reader.readAsDataURL(file);
    }
  }, [showToast]);

  /* ── Zoom via wheel ── */
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(0.2, z + (e.deltaY < 0 ? 0.1 : -0.1))));
  }, []);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  /* ── Pan via middle-click or space+drag ── */
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || navTool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [navTool, pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning || !panStart) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  /* ── Export helpers ── */
  const exportAs = useCallback((fmt) => {
    showToast(`Export ${fmt} — fitur segera hadir`, "info");
    setExportMenu(false);
  }, [showToast]);

  /* ── Calibration finish ── */
  const finishCalib = useCallback(() => {
    setCalibDone(true);
    setCalibMode(false);
    setStepIdx(2);
    setShowCalibPanel(false);
    showToast(`Kalibrasi selesai (koin ${coinSize === -1 ? customCoin : coinSize}mm)`, "success");
  }, [coinSize, customCoin, showToast]);

  /* ── Step navigation ── */
  const goNext = useCallback(() => {
    if (stepIdx === 0 && !xrayImage) {
      showToast("Upload X-Ray terlebih dahulu", "warn");
      fileRef.current?.click();
      return;
    }
    if (stepIdx === 1 && !calibDone) {
      showToast("Selesaikan kalibrasi dahulu", "warn");
      return;
    }
    setStepIdx(i => Math.min(STEPS.length - 1, i + 1));
  }, [stepIdx, xrayImage, calibDone, showToast]);

  const goPrev = useCallback(() => setStepIdx(i => Math.max(0, i - 1)), []);

  /* ── Current tool color ── */
  const toolObj = TOOLS.find(t => t.id === activeTool);
  const toolColor = toolObj ? COLOR_MAP[toolObj.color] : COLOR_MAP.sky;

  /* ═══════════════════════════════════
     RENDER
  ═══════════════════════════════════ */
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0f1a] text-white">

      {/* ── TOP TOOLBAR ── */}
      <header className="relative z-30 flex h-12 shrink-0 items-center gap-1 border-b border-white/10 bg-[#10151f] px-3">
        {/* Logo */}
        <div className="mr-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 text-xs font-black shadow-lg shadow-sky-500/30">
            X
          </div>
          <span className="text-[11px] font-black tracking-widest text-white/60">XRAY<span className="text-sky-400">STUDIO</span></span>
        </div>

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-white/10" />

        {/* Measurement tools */}
        <div className="flex items-center gap-1">
          {TOOLS.map(tool => {
            const active = activeTool === tool.id;
            const cm = COLOR_MAP[tool.color];
            const IconComp = Icon[tool.icon];
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-black transition-all duration-150 ${
                  active
                    ? `${cm.active} shadow-md`
                    : `${cm.btn} border-white/10`
                }`}
              >
                <IconComp />
                {tool.label}
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Undo / Redo */}
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors" title="Undo">
          <Icon.Undo />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors" title="Redo">
          <Icon.Redo />
        </button>

        {/* Zoom indicator */}
        <div className="ml-1 flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="text-white/50 hover:text-white text-lg leading-none">−</button>
          <span className="w-10 text-center text-[10px] font-mono font-bold text-sky-300">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="text-white/50 hover:text-white text-lg leading-none">+</button>
        </div>

        {/* Zoom reset */}
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-bold text-white/50 hover:text-white transition-colors"
        >
          Reset
        </button>
      </header>

      {/* ── BODY (sidebar + canvas) ── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -220, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -220, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative z-20 flex w-[200px] shrink-0 flex-col border-r border-white/10 bg-[#10151f]"
            >
              {/* Navigation tools */}
              <div className="border-b border-white/10 p-3">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-white/30">Navigasi</p>
                <div className="flex flex-col gap-1">
                  {NAV_TOOLS.map(t => {
                    const IconComp = Icon[t.icon];
                    return (
                      <button
                        key={t.id}
                        onClick={() => setNavTool(t.id)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                          navTool === t.id
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                            : "text-white/50 hover:bg-white/5 hover:text-white border border-transparent"
                        }`}
                      >
                        <IconComp /> {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Patients */}
              <div className="flex flex-1 flex-col overflow-y-auto border-b border-white/10 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Kasus</p>
                  <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[8px] font-black text-sky-300">
                    {DEMO_CASES.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {DEMO_CASES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCase(c); setXrayImage(null); setStepIdx(0); setCalibDone(false); }}
                      className={`group rounded-xl border p-2.5 text-left transition-all ${
                        selectedCase.id === c.id
                          ? "border-sky-500/50 bg-sky-500/10"
                          : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                          selectedCase.id === c.id ? "bg-sky-500 text-white" : "bg-white/10 text-white/50"
                        }`}>
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-bold text-white">{c.name}</p>
                          <p className="text-[8px] text-white/40">{c.age}th · {c.side}</p>
                        </div>
                      </div>
                      <p className="mt-1.5 truncate text-[8px] text-white/30">{c.dx}</p>
                      {c.hasXray && (
                        <div className="mt-1.5 flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5">
                          <div className="h-1 w-1 rounded-full bg-emerald-400" />
                          <span className="text-[7px] font-bold text-emerald-400">X-Ray tersedia</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export */}
              <div className="p-3">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-white/30">Export</p>
                <div className="flex flex-col gap-1.5">
                  {["PNG", "JPEG", "PDF"].map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => exportAs(fmt)}
                      disabled={!xrayImage}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-white/60 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Icon.Download />
                      Export {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar toggle tab */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="absolute left-0 top-1/2 z-30 flex h-14 w-4 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-white/10 bg-[#10151f] text-white/40 hover:text-white transition-colors"
          style={{ left: sidebarOpen ? 200 : 0 }}
        >
          {sidebarOpen ? <Icon.ChevronLeft /> : <Icon.ChevronRight />}
        </button>

        {/* ── CANVAS AREA ── */}
        <div
          ref={overlayRef}
          className="relative flex-1 overflow-hidden"
          style={{ cursor: navTool === "pan" ? (isPanning ? "grabbing" : "grab") : navTool === "zoom" ? "zoom-in" : "crosshair" }}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* X-Ray image OR upload prompt */}
          {xrayImage ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }}
            >
              <img
                src={xrayImage}
                alt="X-Ray"
                className="max-h-full max-w-full select-none object-contain"
                draggable={false}
              />
            </div>
          ) : (
            /* Upload drop zone */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-sky-500/40 bg-sky-500/10 text-sky-400"
                >
                  <Icon.Upload />
                </motion.div>
                <div className="text-center">
                  <p className="text-base font-black text-white/70">Drop X-Ray di sini</p>
                  <p className="text-[11px] text-white/30">atau klik tombol di bawah untuk memilih file</p>
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-[12px] font-black text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400 transition-colors"
                >
                  <Icon.Upload /> Pilih Gambar X-Ray
                </button>
              </div>
              <div className="flex gap-3 text-[9px] text-white/25">
                <span>PNG</span><span>·</span><span>JPEG</span><span>·</span><span>DICOM (segera)</span>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

          {/* ── CALIBRATION FLOATING PANEL ── */}
          <AnimatePresence>
            {xrayImage && showCalibPanel && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute bottom-6 right-6 w-52 overflow-hidden rounded-2xl border border-white/15 bg-[#14192a]/95 shadow-2xl backdrop-blur-xl"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${calibDone ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
                    <span className="text-[10px] font-black text-white/80">Kalibrasi</span>
                  </div>
                  <button
                    onClick={() => setShowCalibPanel(false)}
                    className="text-[14px] text-white/30 hover:text-white leading-none"
                  >×</button>
                </div>

                <div className="p-4">
                  {calibDone ? (
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <div className="text-2xl">✅</div>
                      <p className="text-[11px] font-black text-emerald-400">Kalibrasi Selesai</p>
                      <p className="text-[9px] text-white/40">Koin {coinSize === -1 ? customCoin : coinSize}mm terdeteksi</p>
                      <button
                        onClick={() => { setCalibDone(false); setCalibMode(false); }}
                        className="mt-1 rounded-lg border border-white/15 px-3 py-1 text-[9px] font-bold text-white/50 hover:text-white transition-colors"
                      >
                        Ulangi
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="mb-3 text-[9px] text-white/50">
                        Pilih ukuran koin referensi yang ada di foto X-Ray
                      </p>

                      {/* Coin selector */}
                      <div className="mb-3 flex flex-col gap-1">
                        {COIN_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setCoinSize(opt.value)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-all ${
                              coinSize === opt.value
                                ? "border-sky-500/60 bg-sky-500/20 text-sky-300"
                                : "border-white/10 bg-white/5 text-white/50 hover:border-white/25 hover:text-white"
                            }`}
                          >
                            <div className={`h-3 w-3 rounded-full border-2 ${coinSize === opt.value ? "border-sky-400 bg-sky-400" : "border-white/30"}`} />
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom coin input */}
                      {coinSize === -1 && (
                        <div className="mb-3">
                          <input
                            type="number"
                            value={customCoin}
                            onChange={e => setCustomCoin(e.target.value)}
                            placeholder="Ukuran (mm)"
                            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] text-white placeholder-white/30 outline-none focus:border-sky-500/50"
                          />
                        </div>
                      )}

                      {/* Instruction */}
                      <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
                        <p className="text-[9px] text-amber-300/80">
                          {calibMode
                            ? "✋ Klik tepi koin di canvas untuk mengukur diameter"
                            : "Tekan \"Mulai\" lalu klik 2 titik pada tepi koin"}
                        </p>
                      </div>

                      {/* Action buttons */}
                      {!calibMode ? (
                        <button
                          onClick={() => setCalibMode(true)}
                          className="w-full rounded-xl bg-sky-500 py-2 text-[11px] font-black text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400 transition-colors"
                        >
                          Mulai Kalibrasi
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCalibMode(false)}
                            className="flex-1 rounded-xl border border-white/15 py-2 text-[10px] font-bold text-white/50 hover:text-white transition-colors"
                          >
                            Batal
                          </button>
                          <button
                            onClick={finishCalib}
                            className="flex-1 rounded-xl bg-emerald-500 py-2 text-[10px] font-black text-white hover:bg-emerald-400 transition-colors"
                          >
                            Selesai
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show calib panel toggle (when hidden) */}
          {xrayImage && !showCalibPanel && (
            <button
              onClick={() => setShowCalibPanel(true)}
              className={`absolute bottom-6 right-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black shadow-lg backdrop-blur-lg transition-colors ${
                calibDone
                  ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
              }`}
            >
              <span>{calibDone ? "✅" : "📏"}</span>
              {calibDone ? "Kalibrasi OK" : "Buka Kalibrasi"}
            </button>
          )}

          {/* Measurements list (top-right floating) */}
          {measurements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute right-6 top-4 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#14192a]/90 backdrop-blur-xl"
            >
              <div className="border-b border-white/10 px-3 py-2">
                <p className="text-[9px] font-black text-white/40">PENGUKURAN</p>
              </div>
              {measurements.map((m, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[10px] text-white/60">{m.label}</span>
                  <span className="text-[10px] font-bold text-sky-300">{m.value}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Demo measurements added on step 2 */}
          {stepIdx >= 2 && calibDone && measurements.length === 0 && (
            <div className="pointer-events-none absolute bottom-24 left-6 flex flex-col gap-1">
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[10px] font-bold text-sky-300">
                Klik canvas + tool aktif ({toolObj?.label}) untuk mengukur
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM STEPPER ── */}
      <footer className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-t border-white/10 bg-[#10151f] px-4">
        {/* Back */}
        <button
          onClick={goPrev}
          disabled={stepIdx === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
        >
          <Icon.ChevronLeft />
        </button>

        {/* Steps */}
        <div className="flex flex-1 items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const done    = i < stepIdx;
            const current = i === stepIdx;
            const future  = i > stepIdx;
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => {
                    if (i === 0 || (i === 1 && xrayImage) || (i >= 2 && calibDone)) {
                      setStepIdx(i);
                    }
                  }}
                  className="flex items-center gap-1.5 group"
                >
                  {/* Dot */}
                  <motion.div
                    animate={{
                      scale: current ? 1.15 : 1,
                      backgroundColor: done ? "#10b981" : current ? "#38bdf8" : "rgba(255,255,255,0.1)",
                    }}
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black transition-colors ${
                      future ? "text-white/30" : "text-white"
                    }`}
                  >
                    {done ? "✓" : s.emoji}
                  </motion.div>
                  {/* Label */}
                  <span className={`text-[10px] font-bold transition-colors ${
                    current ? "text-sky-300" : done ? "text-emerald-400" : "text-white/30"
                  }`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-8 transition-colors ${i < stepIdx ? "bg-emerald-500/50" : "bg-white/10"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Status label */}
        <div className="mr-2 text-[10px] text-white/30">
          {stepIdx === 0 && "Upload foto X-Ray"}
          {stepIdx === 1 && "Kalibrasi dengan koin"}
          {stepIdx === 2 && `Ukur dengan tool ${toolObj?.label}`}
          {stepIdx === 3 && "Export hasil"}
          {stepIdx === 4 && "Pilih template laporan"}
        </div>

        {/* Next */}
        <button
          onClick={goNext}
          disabled={stepIdx === STEPS.length - 1}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-[11px] font-black text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          Next <Icon.ChevronRight />
        </button>
      </footer>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-5 py-2.5 text-[11px] font-bold shadow-xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                : toast.type === "warn"
                ? "border-amber-500/40 bg-amber-500/20 text-amber-200"
                : "border-sky-500/40 bg-sky-500/20 text-sky-200"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
