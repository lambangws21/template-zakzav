"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";

/* ─── Dynamic import — XCW sebagai mesin canvas ───────────────────────────── */

const XrayCalibrationWorkspace = dynamic(
  () => import("@/components/XrayCalibrationWorkspace"),
  { ssr: false, loading: () => <CanvasPlaceholder label="Memuat workspace…" /> }
);

function CanvasPlaceholder({ label = "Memuat…" }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 10, background: "#edf2f7",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
        boxShadow: "0 0 20px rgba(14,165,233,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "xcw-spin 1.2s linear infinite",
      }}>
        <svg width="18" height="18" viewBox="0 0 38 38" fill="none">
          <rect x="8" y="17" width="22" height="4" rx="2" fill="white"/>
          <circle cx="8" cy="19" r="6" fill="white" opacity="0.85"/>
          <circle cx="30" cy="19" r="6" fill="white" opacity="0.85"/>
        </svg>
      </div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
      <style>{`@keyframes xcw-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Design tokens ────────────────────────────────────────────────────────── */
const bg        = "#0d1117";
const panelBg   = "#161b27";
const border    = "rgba(255,255,255,0.07)";
const accent    = "#38bdf8";
const textPri   = "#e2e8f0";
const textMut   = "#64748b";

const STEPS = [
  { n: 1, label: "Upload" },
  { n: 2, label: "Calibrate" },
  { n: 3, label: "Measure" },
  { n: 4, label: "Template" },
  { n: 5, label: "Export" },
];

const PALETTE = ["#38bdf8","#3b82f6","#14b8a6","#eab308","#f97316","#ef4444","#a855f7","#f8fafc"];

/* ─── Icon micro-components ────────────────────────────────────────────────── */
const Ico = {
  Upload:   () => <svg w="14" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>,
  User:     () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>,
  Folder:   () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>,
  Ruler:    () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M6 2a1 1 0 00-.707.293l-4 4a1 1 0 000 1.414l10 10a1 1 0 001.414 0l4-4a1 1 0 000-1.414l-10-10A1 1 0 006 2zm-1.414 7l4-4 1.414 1.414L7 9l.707.707L10 7.414l1.414 1.414-2.293 2.293L10.414 12 12.707 9.707l1.414 1.414-4 4L6.586 13l2.293-2.293L7.586 9.414 6 11 4.586 9.586 5 9.172V9l-.414.586z" clipRule="evenodd"/></svg>,
  Move:     () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2l2 3H8l2-3zM10 18l-2-3h4l-2 3zM2 10l3-2v4L2 10zM18 10l-3 2V8l3 2zM9 9h2v2H9z"/></svg>,
  Grid:     () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>,
  Layers:   () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5-3.5-2.188L10 14 5.5 10.812 2 13z"/></svg>,
  Pdf:      () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>,
  Img:      () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/></svg>,
  Export:   () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>,
  Plus:     () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>,
  Undo:     () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M8 3a5 5 0 011.314 9.851A1 1 0 118.999 11a3 3 0 100-6h-.586l.793-.793a1 1 0 00-1.414-1.414L5.586 5 7.793 7.207a1 1 0 001.414-1.414L8.414 5H9z" clipRule="evenodd"/></svg>,
  Redo:     () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{transform:"scaleX(-1)"}}><path fillRule="evenodd" d="M8 3a5 5 0 011.314 9.851A1 1 0 118.999 11a3 3 0 100-6h-.586l.793-.793a1 1 0 00-1.414-1.414L5.586 5 7.793 7.207a1 1 0 001.414-1.414L8.414 5H9z" clipRule="evenodd"/></svg>,
  Chevron:  ({ up }) => <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style={{transform:up?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>,
  Bell:     () => <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z"/></svg>,
  Sparkle:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>,
};

/* ─── Panel button ─────────────────────────────────────────────────────────── */
function PBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
      padding: "6px 8px", borderRadius: 7, flex: 1,
      fontSize: 11, fontWeight: 600,
      color: active ? "#fff" : textMut,
      background: active ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? "rgba(56,189,248,0.3)" : border}`,
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>
      {icon}{label && <span>{label}</span>}
    </button>
  );
}

/* ─── Top bar ──────────────────────────────────────────────────────────────── */
function TopBar({ step, onStep }) {
  return (
    <div style={{
      height: 48, display: "flex", alignItems: "center", gap: 10,
      padding: "0 14px", background: panelBg,
      borderBottom: `1px solid ${border}`, flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(14,165,233,0.4)",
        }}>
          <svg width="14" height="14" viewBox="0 0 38 38" fill="none">
            <rect x="8" y="17" width="22" height="4" rx="2" fill="white"/>
            <circle cx="8" cy="19" r="6" fill="white" opacity="0.9"/>
            <circle cx="30" cy="19" r="6" fill="white" opacity="0.9"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: textPri, whiteSpace: "nowrap" }}>
          My <span style={{ color: accent }}>Counteinvas</span>
        </span>
      </div>

      <div style={{ width: 1, height: 22, background: border, flexShrink: 0 }} />

      {/* Steps */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, overflow: "hidden" }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => onStep(s.n)} style={{
              all: "unset", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 99,
              background: step === s.n ? "rgba(56,189,248,0.15)" : "transparent",
              border: `1px solid ${step === s.n ? "rgba(56,189,248,0.3)" : "transparent"}`,
              color: step === s.n ? accent : step > s.n ? "rgba(56,189,248,0.55)" : textMut,
              fontSize: 11, fontWeight: 700, transition: "all 0.15s",
            }}>
              <span style={{
                width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 900,
                background: step >= s.n ? (step === s.n ? accent : "rgba(56,189,248,0.3)") : "rgba(255,255,255,0.06)",
                color: step >= s.n ? (step === s.n ? "#0a0f1e" : "#fff") : textMut,
              }}>{s.n}</span>
              <span>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ margin: "0 2px" }}>
                <path d="M2 1l3 3-3 3" stroke={step > s.n ? accent : textMut} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {["Manager","Summary","Advanced UI"].map(l => (
          <button key={l} style={{
            all: "unset", cursor: "pointer", padding: "4px 9px", borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            color: l === "Advanced UI" ? "#0a0f1e" : textMut,
            background: l === "Advanced UI" ? accent : "rgba(255,255,255,0.05)",
            border: `1px solid ${l === "Advanced UI" ? "transparent" : border}`,
          }}>{l}</button>
        ))}
        <div style={{
          width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
          background: "linear-gradient(135deg,#7c3aed,#6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "white",
          border: "2px solid rgba(99,102,241,0.4)",
        }}>U</div>
      </div>
    </div>
  );
}

/* ─── Progress bar ─────────────────────────────────────────────────────────── */
function ProgressBar({ step }) {
  const pct = ((step - 1) / (STEPS.length - 1)) * 100;
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", position: "relative", flexShrink: 0 }}>
      <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.4, ease: "easeInOut" }}
        style={{ position: "absolute", left: 0, top: 0, height: "100%", background: `linear-gradient(90deg,#6366f1,${accent})` }} />
      {STEPS.map(s => (
        <div key={s.n} style={{
          position: "absolute", top: "50%", transform: "translate(-50%,-50%)",
          left: `${((s.n - 1) / (STEPS.length - 1)) * 100}%`,
          width: 8, height: 8, borderRadius: "50%",
          background: step >= s.n ? accent : "rgba(255,255,255,0.15)",
          border: `2px solid ${bg}`, transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

/* ─── Accordion section header ─────────────────────────────────────────────── */
function SectionHdr({ title, open, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 12px", fontSize: 9.5, fontWeight: 800,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: open ? accent : textMut, borderBottom: `1px solid ${border}`,
    }}>
      {title} <Ico.Chevron up={open} />
    </button>
  );
}

/* ─── Operations Panel (left) ──────────────────────────────────────────────── */
function OperationsPanel({ xcwRef, step, setStep }) {
  const [open, setOpen] = useState({ prep: true, calib: true, analysis: true, exp: false });
  const tog = k => setOpen(v => ({ ...v, [k]: !v[k] }));

  /* ── DOM bridge helpers ── */
  const xcwClick = useCallback((selector) => {
    const el = xcwRef.current?.querySelector(selector);
    el?.click();
  }, [xcwRef]);

  const xcwClickText = useCallback((text) => {
    const btns = xcwRef.current?.querySelectorAll("button");
    if (!btns) return;
    for (const btn of btns) {
      if (btn.textContent.trim().includes(text)) { btn.click(); return; }
    }
  }, [xcwRef]);

  const triggerUpload = useCallback(() => {
    // Click XCW's main file input
    const inp = xcwRef.current?.querySelector('input[type="file"][accept*="image"]');
    inp?.click();
  }, [xcwRef]);

  const triggerStep = useCallback((n) => {
    setStep(n);
    // Also click XCW's step button by step number text
    const btns = xcwRef.current?.querySelectorAll("button");
    if (!btns) return;
    for (const btn of btns) {
      const txt = btn.textContent.trim();
      if (txt.startsWith(String(n)) || txt === STEPS[n - 1]?.label) {
        btn.click(); return;
      }
    }
  }, [xcwRef, setStep]);

  const dispatchKey = useCallback((key, ctrl = false) => {
    const target = xcwRef.current ?? document;
    target.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: ctrl, metaKey: ctrl, bubbles: true, cancelable: true }));
  }, [xcwRef]);

  return (
    <div style={{
      width: 256, flexShrink: 0, background: panelBg,
      borderRight: `1px solid ${border}`, display: "flex", flexDirection: "column", overflowY: "auto",
    }}>
      <div style={{ padding: "9px 12px 7px", fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: textMut, borderBottom: `1px solid ${border}` }}>
        Operations Panel
      </div>

      {/* 1. Preparation */}
      <SectionHdr title="1. Preparation" open={open.prep} onToggle={() => tog("prep")} />
      <AnimatePresence initial={false}>
        {open.prep && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.18}} style={{overflow:"hidden"}}>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={triggerUpload} style={{
                all: "unset", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff",
                background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
                boxShadow: "0 4px 14px rgba(14,165,233,0.3)",
              }}>
                <Ico.Upload /> Upload X-Ray
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PBtn icon={<Ico.User />} label="Casus Pasien" onClick={() => xcwClickText("Casus Pasien")} />
                <PBtn icon={<Ico.Folder />} label="Library" onClick={() => xcwClickText("Library")} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Calibration */}
      <SectionHdr title="2. Calibration & Planning" open={open.calib} onToggle={() => tog("calib")} />
      <AnimatePresence initial={false}>
        {open.calib && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.18}} style={{overflow:"hidden"}}>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PBtn icon={<Ico.Ruler />} label="Kalibrasi" active={step===2} onClick={() => triggerStep(2)} />
                <PBtn icon={<Ico.Plus />} label="Titik Ref" onClick={() => xcwClickText("Center")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PBtn icon={<Ico.Grid />} label="Guide" onClick={() => dispatchKey("g")} />
                <PBtn icon={<Ico.Move />} label="Move" onClick={() => dispatchKey(" ")} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Analysis & Templating */}
      <SectionHdr title="3. Analysis & Templating" open={open.analysis} onToggle={() => tog("analysis")} />
      <AnimatePresence initial={false}>
        {open.analysis && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.18}} style={{overflow:"hidden"}}>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PBtn icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 17L10 3l7 14" strokeLinecap="round"/></svg>} label="HKA" active={step===3} onClick={() => { triggerStep(3); xcwClickText("HKA"); }} />
                <PBtn icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M4 16L10 4l6 12" strokeLinecap="round"/></svg>} label="LDFA" onClick={() => xcwClickText("LDFA")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PBtn icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M4 10h12M10 4v12" strokeLinecap="round"/></svg>} label="MPTA" onClick={() => xcwClickText("MPTA")} />
                <PBtn icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><ellipse cx="10" cy="10" rx="6" ry="4"/></svg>} label="Cup Assess" onClick={() => xcwClickText("Cup")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PBtn icon={<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2a4 4 0 100 8 4 4 0 000-8zm0 10c-4 0-8 2-8 4v1h16v-1c0-2-4-4-8-4z"/></svg>} label="TKA" active={step===4} onClick={() => { triggerStep(4); xcwClickText("TKA"); }} />
                <PBtn icon={<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2a4 4 0 100 8 4 4 0 000-8zm0 10c-5 0-8 2-8 5v1h16v-1c0-3-3-5-8-5z"/></svg>} label="HIP" onClick={() => xcwClickText("Hip")} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Export */}
      <SectionHdr title="4. Export & Reports" open={open.exp} onToggle={() => tog("exp")} />
      <AnimatePresence initial={false}>
        {open.exp && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.18}} style={{overflow:"hidden"}}>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <PBtn icon={<Ico.Pdf />} label="Laporan Pre-Op PDF" active={step===5} onClick={() => { triggerStep(5); xcwClickText("PDF"); xcwClickText("Laporan"); }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PBtn icon={<Ico.Img />} label="PNG" onClick={() => xcwClickText("PNG")} />
                <PBtn icon={<Ico.Export />} label="Export" onClick={() => xcwClickText("Export")} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Property Panel (right) ───────────────────────────────────────────────── */
function PropertyPanel({ xcwRef }) {
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [layers, setLayers] = useState([
    { id: 1, name: "X-Ray Layer", vis: true },
    { id: 2, name: "Annotations", vis: true },
  ]);

  const dispatchKey = useCallback((key, ctrl) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: ctrl, metaKey: ctrl, bubbles: true, cancelable: true }));
  }, []);

  return (
    <div style={{
      width: 200, flexShrink: 0, background: panelBg,
      borderLeft: `1px solid ${border}`, display: "flex", flexDirection: "column", overflowY: "auto",
    }}>
      <div style={{ padding: "9px 12px 7px", fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: textMut, borderBottom: `1px solid ${border}` }}>
        Property Panel
      </div>

      {/* Undo / Redo */}
      <div style={{ padding: "10px 12px", display: "flex", gap: 6, borderBottom: `1px solid ${border}` }}>
        {[["Undo", () => dispatchKey("z", true), <Ico.Undo />], ["Redo", () => dispatchKey("y", true), <Ico.Redo />]].map(([lbl, fn, icon]) => (
          <button key={lbl} onClick={fn} style={{
            all: "unset", cursor: "pointer", flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: "6px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: textMut,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${border}`,
          }}>{icon}{lbl}</button>
        ))}
      </div>

      {/* Colors */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: textMut, marginBottom: 8 }}>Colors</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {PALETTE.map(c => (
            <button key={c} onClick={() => setActiveColor(c)} style={{
              all: "unset", cursor: "pointer", width: 22, height: 22, borderRadius: "50%",
              background: c, border: `2px solid ${activeColor === c ? "white" : "transparent"}`,
              boxShadow: activeColor === c ? `0 0 8px ${c}` : "none", transition: "all 0.15s",
            }} />
          ))}
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: activeColor, border: "1px solid rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: 10, color: textMut, fontFamily: "monospace" }}>{activeColor}</span>
        </div>
      </div>

      {/* Layer Management */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: textMut }}>Layer Management</div>
          <button onClick={() => setLayers(v => [...v, { id: Date.now(), name: `Layer ${v.length + 1}`, vis: true }])} style={{ all: "unset", cursor: "pointer", color: accent, fontSize: 18, lineHeight: 1 }}>+</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {layers.map((layer, i) => (
            <div key={layer.id} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 7,
              background: i === 0 ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${i === 0 ? "rgba(56,189,248,0.2)" : border}`,
            }}>
              <button onClick={() => setLayers(v => v.map((l,j) => j===i ? {...l, vis: !l.vis} : l))} style={{ all: "unset", cursor: "pointer", color: layer.vis ? accent : textMut, fontSize: 12, lineHeight: 1 }}>
                {layer.vis ? "●" : "○"}
              </button>
              <Ico.Layers />
              <span style={{ fontSize: 10, color: textPri, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{layer.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Implant Library */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: textMut, marginBottom: 8 }}>Implant Library</div>
        <select style={{
          width: "100%", padding: "6px 8px", borderRadius: 7, fontSize: 11,
          background: "rgba(255,255,255,0.05)", border: `1px solid ${border}`,
          color: textPri, cursor: "pointer", outline: "none",
        }}>
          <option value="">Pilih Implant…</option>
          <optgroup label="TKA">
            <option>DePuy Sigma — Size 4</option>
            <option>Zimmer NexGen — Size 5</option>
            <option>Stryker Triathlon — Size 5</option>
          </optgroup>
          <optgroup label="THA">
            <option>DePuy Pinnacle Cup 52mm</option>
            <option>Zimmer Continuum Cup 50mm</option>
          </optgroup>
        </select>
      </div>
    </div>
  );
}

/* ─── Status bar ───────────────────────────────────────────────────────────── */
function StatusBar({ step }) {
  const hints = {
    1: "Upload foto X-ray dari panel kiri untuk memulai perencanaan.",
    2: "Klik Kalibrasi → gambar garis referensi → masukkan panjang nyata (mm).",
    3: "Pilih tool HKA/Line/Angle di panel kiri atau toolbar canvas.",
    4: "Posisikan template implant pada X-ray untuk perencanaan ukuran.",
    5: "Klik Laporan Pre-Op PDF untuk generate dan export laporan.",
  };
  return (
    <div style={{
      height: 36, padding: "0 14px", background: panelBg, borderTop: `1px solid ${border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: textMut }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Current Task:</span>{" "}{hints[step]}
        </span>
      </div>
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} style={{
        all: "unset", cursor: "pointer", width: 26, height: 26, borderRadius: "50%",
        background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex",
        alignItems: "center", justifyContent: "center", color: "white",
        boxShadow: "0 0 10px rgba(99,102,241,0.5)",
      }} title="AI Assistant"><Ico.Sparkle /></motion.button>
    </div>
  );
}

/* ─── CSS that makes XCW fill its host container ──────────────────────────── */
const XCW_OVERRIDE_CSS = `
  /* Make XCW fill the container, not 100dvh */
  .xcw-canvas-host > div {
    height: 100% !important;
    min-height: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  /* Hide XCW's own header — we provide our own */
  .xcw-canvas-host header {
    display: none !important;
  }
  /* Remove XCW's background padding/margin that breaks layout */
  .xcw-canvas-host > div {
    padding: 0 !important;
  }
  /* Ensure canvas section fills available height */
  .xcw-canvas-host section {
    flex: 1 !important;
    min-height: 0 !important;
  }
`;

/* ─── Root component ───────────────────────────────────────────────────────── */
export default function CounteinvasWorkspace() {
  const [step, setStep] = useState(1);
  const xcwRef = useRef(null);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: bg, color: textPri,
      fontFamily: "'Inter','Poppins',system-ui,sans-serif",
    }}>
      <style>{XCW_OVERRIDE_CSS}</style>

      <TopBar step={step} onStep={setStep} />
      <ProgressBar step={step} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <OperationsPanel xcwRef={xcwRef} step={step} setStep={setStep} />

        {/* Center: XCW canvas host */}
        <div ref={xcwRef} className="xcw-canvas-host" style={{
          flex: 1, display: "flex", flexDirection: "column",
          overflow: "hidden", position: "relative", minWidth: 0,
        }}>
          <XrayCalibrationWorkspace
            simpleUiMode={true}
            onOpenAdvancedUi={() => {}}
            onOpenSimpleUi={() => {}}
          />
        </div>

        <PropertyPanel xcwRef={xcwRef} />
      </div>

      <StatusBar step={step} />
    </div>
  );
}
