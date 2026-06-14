"use client";

import {
  useCallback, useEffect, useLayoutEffect, useMemo,
  useRef, useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

/* ─── Constants ────────────────────────────────────────────────────────────── */

const STEPS = [
  { n: 1, label: "Upload" },
  { n: 2, label: "Calibrate" },
  { n: 3, label: "Measure" },
  { n: 4, label: "Template" },
  { n: 5, label: "Export" },
];

const TOOLS = {
  SELECT:  "select",
  LINE:    "line",
  ANGLE:   "angle",
  CIRCLE:  "circle",
  TEXT:    "text",
  POINT:   "point",
  PAN:     "pan",
};

const PALETTE = ["#38bdf8","#3b82f6","#14b8a6","#eab308","#f97316","#ef4444","#a855f7","#f8fafc","#0f172a"];

const SECTION_IDS = ["prep","calib","analysis","export"];

/* ─── Design tokens ────────────────────────────────────────────────────────── */
const bg   = "#0d1117";
const panelBg = "#161b27";
const panelBorder = "rgba(255,255,255,0.07)";
const accent = "#38bdf8";
const textPrimary = "#e2e8f0";
const textMuted = "#64748b";

/* ─── Tiny icon SVGs ───────────────────────────────────────────────────────── */
function IconUpload() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>;
}
function IconFolder() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>;
}
function IconUser() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>;
}
function IconGrid() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>;
}
function IconRuler() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M6 2a1 1 0 00-.707.293l-4 4a1 1 0 000 1.414l10 10a1 1 0 001.414 0l4-4a1 1 0 000-1.414l-10-10A1 1 0 006 2zm-1.414 7l4-4 1.414 1.414L7 9l.707.707L10 7.414l1.414 1.414-2.293 2.293L10.414 12 12.707 9.707l1.414 1.414-4 4L6.586 13l2.293-2.293L7.586 9.414 6 11 4.586 9.586 5 9.172V9l-.414.586z" clipRule="evenodd"/></svg>;
}
function IconMove() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2l2 3H8l2-3zM10 18l-2-3h4l-2 3zM2 10l3-2v4L2 10zM18 10l-3 2V8l3 2zM9 9h2v2H9z"/></svg>;
}
function IconLayers() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5-3.5-2.188L10 14 5.5 10.812 2 13z"/></svg>;
}
function IconChevron({ dir = "down" }) {
  const rotate = dir === "up" ? "rotate(180deg)" : "rotate(0deg)";
  return <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style={{ transform: rotate, transition: "transform 0.2s" }}><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>;
}
function IconUndo() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M8 3a5 5 0 011.314 9.851A1 1 0 118.999 11a3 3 0 100-6h-.586l.793-.793a1 1 0 00-1.414-1.414L5.586 5 7.793 7.207a1 1 0 001.414-1.414L8.414 5H9z" clipRule="evenodd"/></svg>;
}
function IconRedo() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ transform: "scaleX(-1)" }}><path fillRule="evenodd" d="M8 3a5 5 0 011.314 9.851A1 1 0 118.999 11a3 3 0 100-6h-.586l.793-.793a1 1 0 00-1.414-1.414L5.586 5 7.793 7.207a1 1 0 001.414-1.414L8.414 5H9z" clipRule="evenodd"/></svg>;
}
function IconPdf() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>;
}
function IconImage() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/></svg>;
}
function IconExport() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>;
}
function IconSparkle() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>;
}
function IconBell() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z"/></svg>;
}
function IconPlus() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>;
}
function IconZoomIn() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8zm6-2a1 1 0 011 1v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0v-1H6a1 1 0 110-2h1V7a1 1 0 011-1z" clipRule="evenodd"/></svg>;
}
function IconZoomOut() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8zm3 3a1 1 0 100-2h4a1 1 0 100 2H5z" clipRule="evenodd"/></svg>;
}
function IconMaximize() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd"/></svg>;
}
function IconRefresh() {
  return <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/></svg>;
}

/* ─── Button primitives ────────────────────────────────────────────────────── */
function PanelBtn({ icon, label, active, onClick, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        all: "unset", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6,
        padding: small ? "5px 8px" : "6px 10px",
        borderRadius: 7,
        fontSize: 11, fontWeight: 600,
        color: active ? "#fff" : textMuted,
        background: active ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(56,189,248,0.35)" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        flex: 1,
        justifyContent: "center",
      }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

/* ─── Top bar ──────────────────────────────────────────────────────────────── */
function TopBar({ step, setStep, patientName, doctorName }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      height: 48, padding: "0 16px",
      background: panelBg,
      borderBottom: `1px solid ${panelBorder}`,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
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
        <span style={{ fontSize: 13, fontWeight: 800, color: textPrimary, letterSpacing: "0.02em" }}>
          My <span style={{ color: accent }}>Counteinvas</span>
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: panelBorder, flexShrink: 0 }} />

      {/* Steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1, overflow: "hidden" }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={() => setStep(s.n)}
              style={{
                all: "unset", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 99,
                background: step === s.n ? "rgba(56,189,248,0.15)" : "transparent",
                border: step === s.n ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
                color: step === s.n ? accent : step > s.n ? "rgba(56,189,248,0.6)" : textMuted,
                fontSize: 11, fontWeight: 700,
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 900,
                background: step >= s.n ? (step === s.n ? accent : "rgba(56,189,248,0.3)") : "rgba(255,255,255,0.06)",
                color: step >= s.n ? (step === s.n ? "#0a0f1e" : "#fff") : textMuted,
              }}>
                {s.n}
              </span>
              <span>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div style={{ width: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 1l3 3-3 3" stroke={step > s.n ? accent : textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <TopBtn label="Manager" />
        <TopBtn label="Summary" />
        <TopBtn label="Advanced UI" highlight />
        {/* Avatar */}
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg,#7c3aed,#6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "white",
          cursor: "pointer", border: "2px solid rgba(99,102,241,0.4)",
        }}>
          U
        </div>
      </div>
    </div>
  );
}

function TopBtn({ label, highlight, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer",
      padding: "4px 10px", borderRadius: 6,
      fontSize: 11, fontWeight: 600,
      color: highlight ? "#0a0f1e" : textMuted,
      background: highlight ? accent : "rgba(255,255,255,0.05)",
      border: `1px solid ${highlight ? "transparent" : panelBorder}`,
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

/* ─── Progress bar ─────────────────────────────────────────────────────────── */
function ProgressBar({ step }) {
  const pct = ((step - 1) / (STEPS.length - 1)) * 100;
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", flexShrink: 0, position: "relative" }}>
      <motion.div
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        style={{ position: "absolute", left: 0, top: 0, height: "100%",
          background: `linear-gradient(90deg,#6366f1,${accent})` }}
      />
      {/* Step dots */}
      {STEPS.map(s => (
        <div key={s.n} style={{
          position: "absolute", top: "50%", transform: "translate(-50%,-50%)",
          left: `${((s.n - 1) / (STEPS.length - 1)) * 100}%`,
          width: 8, height: 8, borderRadius: "50%",
          background: step >= s.n ? accent : "rgba(255,255,255,0.15)",
          border: `2px solid ${bg}`,
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

/* ─── Operations Panel (left) ──────────────────────────────────────────────── */
function SectionHeader({ title, open, toggle }) {
  return (
    <button
      onClick={toggle}
      style={{
        all: "unset", cursor: "pointer", width: "100%",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 12px", fontSize: 10, fontWeight: 800,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: open ? accent : textMuted,
        borderBottom: `1px solid ${panelBorder}`,
      }}
    >
      {title}
      <IconChevron dir={open ? "up" : "down"} />
    </button>
  );
}

function OperationsPanel({ step, setStep, imageSrc, onUpload, activeTool, setActiveTool }) {
  const [open, setOpen] = useState({ prep: true, calib: true, analysis: true, export: false });
  const toggle = (id) => setOpen(v => ({ ...v, [id]: !v[id] }));

  const fileRef = useRef(null);

  return (
    <div style={{
      width: 258, flexShrink: 0,
      background: panelBg,
      borderRight: `1px solid ${panelBorder}`,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px 8px",
        fontSize: 10, fontWeight: 900, letterSpacing: "0.14em",
        textTransform: "uppercase", color: textMuted,
        borderBottom: `1px solid ${panelBorder}`,
      }}>
        Operations Panel
      </div>

      {/* 1. PREPARATION */}
      <SectionHeader title="1. Preparation" open={open.prep} toggle={() => toggle("prep")} />
      <AnimatePresence initial={false}>
        {open.prep && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0]); }} />
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  all: "unset", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  color: "#fff",
                  background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
                  boxShadow: "0 4px 14px rgba(14,165,233,0.3)",
                }}
              >
                <IconUpload /> Upload X-Ray
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PanelBtn icon={<IconUser />} label="Casus Pasien" />
                <PanelBtn icon={<IconFolder />} label="Library" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CALIBRATION & PLANNING */}
      <SectionHeader title="2. Calibration & Planning" open={open.calib} toggle={() => toggle("calib")} />
      <AnimatePresence initial={false}>
        {open.calib && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PanelBtn icon={<IconRuler />} label="Kalibrasi" active={step === 2} onClick={() => setStep(2)} />
                <PanelBtn icon={<IconPlus />} label="Titik Ref" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PanelBtn icon={<IconGrid />} label="Guide" />
                <PanelBtn icon={<IconMove />} label="Move" active={activeTool === TOOLS.PAN} onClick={() => setActiveTool(TOOLS.PAN)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. ANALYSIS & TEMPLATING */}
      <SectionHeader title="3. Analysis & Templating" open={open.analysis} toggle={() => toggle("analysis")} />
      <AnimatePresence initial={false}>
        {open.analysis && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PanelBtn icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 17L10 3l7 14" strokeLinecap="round"/></svg>} label="HKA" active={step === 3} onClick={() => setStep(3)} />
                <PanelBtn icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M4 16L10 4l6 12" strokeLinecap="round"/></svg>} label="LDFA" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PanelBtn icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M4 10h12M10 4v12" strokeLinecap="round"/></svg>} label="MPTA" />
                <PanelBtn icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><ellipse cx="10" cy="10" rx="6" ry="4"/></svg>} label="Cup Assess" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PanelBtn icon={<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2a4 4 0 100 8 4 4 0 000-8zm0 10c-4 0-8 2-8 4v1h16v-1c0-2-4-4-8-4z"/></svg>} label="TKA" active={step === 4} onClick={() => setStep(4)} />
                <PanelBtn icon={<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 2a4 4 0 100 8 4 4 0 000-8zm0 10c-5 0-8 2-8 5v1h16v-1c0-3-3-5-8-5z"/></svg>} label="HIP" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. EXPORT & REPORTS */}
      <SectionHeader title="4. Export & Reports" open={open.export} toggle={() => toggle("export")} />
      <AnimatePresence initial={false}>
        {open.export && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <PanelBtn icon={<IconPdf />} label="Laporan Pre-Op PDF" active={step === 5} onClick={() => setStep(5)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <PanelBtn icon={<IconImage />} label="PNG" />
                <PanelBtn icon={<IconExport />} label="Export" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Property Panel (right) ───────────────────────────────────────────────── */
function PropertyPanel({ activeColor, setActiveColor, onUndo, onRedo, layers, setLayers }) {
  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: panelBg,
      borderLeft: `1px solid ${panelBorder}`,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px 8px",
        fontSize: 10, fontWeight: 900, letterSpacing: "0.14em",
        textTransform: "uppercase", color: textMuted,
        borderBottom: `1px solid ${panelBorder}`,
      }}>
        Property Panel
      </div>

      {/* Undo / Redo */}
      <div style={{ padding: "10px 12px", display: "flex", gap: 6, borderBottom: `1px solid ${panelBorder}` }}>
        <button onClick={onUndo} style={{ all: "unset", cursor: "pointer", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: textMuted, background: "rgba(255,255,255,0.04)", border: `1px solid ${panelBorder}` }}>
          <IconUndo /> Undo
        </button>
        <button onClick={onRedo} style={{ all: "unset", cursor: "pointer", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: textMuted, background: "rgba(255,255,255,0.04)", border: `1px solid ${panelBorder}` }}>
          <IconRedo /> Redo
        </button>
      </div>

      {/* Colors */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${panelBorder}` }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>Colors</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {PALETTE.map(c => (
            <button key={c} onClick={() => setActiveColor(c)} style={{
              all: "unset", cursor: "pointer",
              width: 22, height: 22, borderRadius: "50%", background: c,
              border: `2px solid ${activeColor === c ? "white" : "transparent"}`,
              boxShadow: activeColor === c ? `0 0 8px ${c}` : "none",
              transition: "all 0.15s",
            }} />
          ))}
        </div>
        {/* Active color swatch */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: activeColor, border: "1px solid rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: 10, color: textMuted, fontFamily: "monospace" }}>{activeColor}</span>
        </div>
      </div>

      {/* Layers */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${panelBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: textMuted }}>Layer Management</div>
          <button
            onClick={() => setLayers(v => [...v, { id: Date.now(), name: `Layer ${v.length + 1}`, visible: true }])}
            style={{ all: "unset", cursor: "pointer", color: accent, fontSize: 16 }}>+</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {layers.map((layer, i) => (
            <div key={layer.id} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 7,
              background: i === 0 ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${i === 0 ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.05)"}`,
            }}>
              <button
                onClick={() => setLayers(v => v.map((l, j) => j === i ? { ...l, visible: !l.visible } : l))}
                style={{ all: "unset", cursor: "pointer", color: layer.visible ? accent : textMuted, fontSize: 12, lineHeight: 1 }}>
                {layer.visible ? "●" : "○"}
              </button>
              <IconLayers />
              <span style={{ fontSize: 10, color: textPrimary, flex: 1 }}>{layer.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Implant Library */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>Implant Library</div>
        <select style={{
          width: "100%", padding: "6px 10px", borderRadius: 7, fontSize: 11,
          background: "rgba(255,255,255,0.05)", border: `1px solid ${panelBorder}`,
          color: textPrimary, cursor: "pointer", outline: "none",
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

/* ─── Measurement Toolbar (floating) ───────────────────────────────────────── */
function MeasurementToolbar({ activeTool, setActiveTool }) {
  const tools = [
    { key: TOOLS.SELECT, icon: <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M5 3l10 7-6 1-3 5-1-13z"/></svg>, label: "Select" },
    { key: TOOLS.LINE,   icon: <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" width="14" height="14" strokeWidth="2"><path d="M3 17L17 3" strokeLinecap="round"/></svg>, label: "Line" },
    { key: TOOLS.ANGLE,  icon: <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" width="14" height="14" strokeWidth="2"><path d="M4 16L10 4L16 16" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: "Angle" },
    { key: TOOLS.CIRCLE, icon: <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" width="14" height="14" strokeWidth="2"><circle cx="10" cy="10" r="7"/></svg>, label: "Circle" },
    { key: TOOLS.TEXT,   icon: <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 11-2 0V5H4v1a1 1 0 11-2 0V4zm3 8a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-1 4a1 1 0 100 2h8a1 1 0 100-2H5z"/></svg>, label: "Text" },
    { key: TOOLS.POINT,  icon: <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><circle cx="10" cy="10" r="4"/></svg>, label: "Point" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 30,
    }}>
      <div style={{
        fontSize: 8, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
        color: "rgba(56,189,248,0.6)", marginBottom: 2,
      }}>
        Measurement Toolbar
      </div>
      <div style={{
        display: "flex", gap: 2, padding: "6px 8px", borderRadius: 12,
        background: "rgba(13,17,23,0.9)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {tools.map(t => (
          <button key={t.key} onClick={() => setActiveTool(t.key)} title={t.label}
            style={{
              all: "unset", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "7px 10px", borderRadius: 8,
              color: activeTool === t.key ? "#0a0f1e" : textMuted,
              background: activeTool === t.key ? accent : "transparent",
              transition: "all 0.15s",
              minWidth: 36,
            }}>
            {t.icon}
            <span style={{ fontSize: 8, fontWeight: 700 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Zoom controls ────────────────────────────────────────────────────────── */
function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset, onFullscreen }) {
  return (
    <div style={{
      position: "absolute", bottom: 52, right: 16, zIndex: 30,
      display: "flex", gap: 4,
      padding: "5px 6px", borderRadius: 10,
      background: "rgba(13,17,23,0.85)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <ZoomBtn icon={<IconZoomOut />} onClick={onZoomOut} title="Zoom out" />
      <div style={{ display: "flex", alignItems: "center", padding: "0 6px", fontSize: 10, color: textMuted, fontFamily: "monospace" }}>
        {Math.round(zoom * 100)}%
      </div>
      <ZoomBtn icon={<IconZoomIn />} onClick={onZoomIn} title="Zoom in" />
      <ZoomBtn icon={<IconRefresh />} onClick={onReset} title="Reset view" />
      <ZoomBtn icon={<IconMaximize />} onClick={onFullscreen} title="Fullscreen" />
    </div>
  );
}
function ZoomBtn({ icon, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      all: "unset", cursor: "pointer",
      width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
      color: textMuted, background: "rgba(255,255,255,0.05)",
      transition: "all 0.15s",
    }}>{icon}</button>
  );
}

/* ─── Canvas area ──────────────────────────────────────────────────────────── */
function CanvasArea({
  imageSrc, activeTool, setActiveTool, activeColor,
  annotations, setAnnotations, history, setHistory,
  zoom, setZoom, pan, setPan, patientMeta,
}) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [currentShape, setCurrentShape] = useState(null); // in-progress shape
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Draw image on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Convert container coords to canvas coords
  const toCanvas = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cx = (clientX - rect.left - pan.x) / zoom;
    const cy = (clientY - rect.top - pan.y) / zoom;
    return { x: cx, y: cy };
  }, [pan, zoom]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const pos = toCanvas(e.clientX, e.clientY);
    if (activeTool === TOOLS.PAN || activeTool === TOOLS.SELECT) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    if (activeTool === TOOLS.POINT) {
      setAnnotations(prev => [...prev, { id: Date.now(), type: "point", pos, color: activeColor }]);
      return;
    }
    if (activeTool === TOOLS.LINE || activeTool === TOOLS.CIRCLE || activeTool === TOOLS.ANGLE) {
      setCurrentShape({ type: activeTool, points: [pos], color: activeColor });
    }
  }, [activeTool, toCanvas, pan, activeColor, setAnnotations]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && (activeTool === TOOLS.PAN || activeTool === TOOLS.SELECT) && dragStart) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }
    if (!currentShape) return;
    const pos = toCanvas(e.clientX, e.clientY);
    setCurrentShape(s => s ? { ...s, preview: pos } : null);
  }, [isDragging, dragStart, activeTool, setPan, currentShape, toCanvas]);

  const handleMouseUp = useCallback((e) => {
    setIsDragging(false);
    setDragStart(null);
    if (!currentShape) return;
    const pos = toCanvas(e.clientX, e.clientY);
    const pts = [...currentShape.points, pos];
    if (currentShape.type === TOOLS.LINE || currentShape.type === TOOLS.CIRCLE) {
      setAnnotations(prev => [...prev, { ...currentShape, id: Date.now(), points: pts, preview: null }]);
      setCurrentShape(null);
    } else if (currentShape.type === TOOLS.ANGLE) {
      if (currentShape.points.length < 2) {
        setCurrentShape(s => s ? { ...s, points: pts } : null);
      } else {
        setAnnotations(prev => [...prev, { ...currentShape, id: Date.now(), points: pts, preview: null }]);
        setCurrentShape(null);
      }
    }
  }, [currentShape, toCanvas, setAnnotations]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    setZoom(z => Math.min(8, Math.max(0.1, z * factor)));
  }, [setZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // SVG annotations
  const renderAnnotation = (ann) => {
    if (ann.type === "point") {
      return <circle key={ann.id} cx={ann.pos.x} cy={ann.pos.y} r={4} fill={ann.color} stroke="#fff" strokeWidth="1" />;
    }
    if (ann.type === "line" && ann.points.length >= 2) {
      const [p1, p2] = ann.points;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy).toFixed(1);
      return <g key={ann.id}>
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={ann.color} strokeWidth={2 / zoom} strokeLinecap="round"/>
        <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 5 / zoom} fill={ann.color} fontSize={12 / zoom} fontWeight="bold" textAnchor="middle">{len}px</text>
      </g>;
    }
    if (ann.type === "circle" && ann.points.length >= 2) {
      const [c, e] = ann.points;
      const r = Math.sqrt((e.x - c.x) ** 2 + (e.y - c.y) ** 2);
      return <g key={ann.id}>
        <circle cx={c.x} cy={c.y} r={r} fill="none" stroke={ann.color} strokeWidth={2 / zoom}/>
        <text x={c.x} y={c.y - r - 4 / zoom} fill={ann.color} fontSize={12 / zoom} fontWeight="bold" textAnchor="middle">{r.toFixed(1)}px</text>
      </g>;
    }
    if (ann.type === "angle" && ann.points.length >= 3) {
      const [p1, vertex, p2] = ann.points;
      const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
      const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
      let deg = Math.abs((a2 - a1) * 180 / Math.PI);
      if (deg > 180) deg = 360 - deg;
      return <g key={ann.id}>
        <line x1={p1.x} y1={p1.y} x2={vertex.x} y2={vertex.y} stroke={ann.color} strokeWidth={2 / zoom} strokeLinecap="round"/>
        <line x1={vertex.x} y1={vertex.y} x2={p2.x} y2={p2.y} stroke={ann.color} strokeWidth={2 / zoom} strokeLinecap="round"/>
        <text x={vertex.x} y={vertex.y - 8 / zoom} fill={ann.color} fontSize={12 / zoom} fontWeight="bold" textAnchor="middle">{deg.toFixed(1)}°</text>
      </g>;
    }
    return null;
  };

  // In-progress preview
  const renderPreview = () => {
    if (!currentShape || !currentShape.preview) return null;
    const { type, points, preview, color } = currentShape;
    if (type === TOOLS.LINE) {
      return <line x1={points[0].x} y1={points[0].y} x2={preview.x} y2={preview.y} stroke={color} strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom} ${3 / zoom}`} opacity="0.7" strokeLinecap="round"/>;
    }
    if (type === TOOLS.CIRCLE) {
      const r = Math.sqrt((preview.x - points[0].x) ** 2 + (preview.y - points[0].y) ** 2);
      return <circle cx={points[0].x} cy={points[0].y} r={r} fill="none" stroke={color} strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom} ${3 / zoom}`} opacity="0.7"/>;
    }
    if (type === TOOLS.ANGLE) {
      if (points.length === 1) return <line x1={points[0].x} y1={points[0].y} x2={preview.x} y2={preview.y} stroke={color} strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom} ${3 / zoom}`} opacity="0.7" strokeLinecap="round"/>;
      if (points.length === 2) return <g>
        <line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} stroke={color} strokeWidth={2 / zoom} strokeLinecap="round"/>
        <line x1={points[1].x} y1={points[1].y} x2={preview.x} y2={preview.y} stroke={color} strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom} ${3 / zoom}`} opacity="0.7" strokeLinecap="round"/>
      </g>;
    }
    return null;
  };

  const canvasW = canvasRef.current?.width || 800;
  const canvasH = canvasRef.current?.height || 600;

  const cursor = activeTool === TOOLS.PAN || isDragging
    ? "grab" : activeTool === TOOLS.SELECT ? "default" : "crosshair";

  return (
    <div ref={containerRef}
      style={{ flex: 1, position: "relative", overflow: "hidden", background: "#070b12", cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setIsDragging(false); setDragStart(null); }}
    >
      {/* Canvas + SVG overlay */}
      <div style={{
        position: "absolute",
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: "0 0",
        userSelect: "none",
      }}>
        {imageSrc ? (
          <>
            <canvas ref={canvasRef} style={{ display: "block", imageRendering: "crisp-edges" }} />
            <svg
              ref={svgRef}
              width={canvasW} height={canvasH}
              style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
              viewBox={`0 0 ${canvasW} ${canvasH}`}
            >
              {annotations.map(renderAnnotation)}
              {renderPreview()}
            </svg>
          </>
        ) : (
          <DropZone onUpload={null} />
        )}
      </div>

      {/* Empty state */}
      {!imageSrc && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12, pointerEvents: "none",
        }}>
          <div style={{ opacity: 0.06, fontSize: 80 }}>🩻</div>
          <div style={{ fontSize: 13, color: textMuted, textAlign: "center" }}>
            Upload foto X-ray<br />dari panel kiri untuk memulai
          </div>
        </div>
      )}

      {/* Patient info bar */}
      {patientMeta && (
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          padding: "5px 14px", borderRadius: 99,
          background: "rgba(13,17,23,0.85)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 10, color: textMuted, fontWeight: 600,
          whiteSpace: "nowrap", zIndex: 10,
        }}>
          Patient: <span style={{ color: textPrimary }}>{patientMeta.name}</span>
          {patientMeta.id && <> (D: <span style={{ color: textPrimary }}>{patientMeta.id}</span>)</>}
          {patientMeta.doctor && <> | <span style={{ color: textPrimary }}>{patientMeta.doctor}</span></>}
          {patientMeta.date && <> | Date: <span style={{ color: accent }}>{patientMeta.date}</span></>}
        </div>
      )}

      {/* Measurement toolbar */}
      <MeasurementToolbar activeTool={activeTool} setActiveTool={setActiveTool} />

      {/* Zoom controls */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(8, z * 1.2))}
        onZoomOut={() => setZoom(z => Math.max(0.1, z / 1.2))}
        onReset={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
        onFullscreen={() => containerRef.current?.requestFullscreen?.()}
      />
    </div>
  );
}

/* ─── Status bar ───────────────────────────────────────────────────────────── */
function StatusBar({ step, imageSrc, activeTool }) {
  const tasks = {
    1: "Upload foto X-ray untuk memulai perencanaan pre-operasi.",
    2: !imageSrc ? "Upload foto dulu sebelum kalibrasi." : "Klik Kalibrasi, tentukan panjang referensi, lalu set skala.",
    3: "Pilih tool pengukuran di toolbar bawah, lalu klik pada gambar.",
    4: "Pilih jenis implant dari Property Panel kanan, lalu posisikan overlay.",
    5: "Klik Laporan Pre-Op PDF untuk generate laporan.",
  };
  return (
    <div style={{
      height: 36, padding: "0 16px",
      background: panelBg, borderTop: `1px solid ${panelBorder}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#22c55e", boxShadow: "0 0 6px #22c55e", flexShrink: 0,
          animation: "pulse-dot 2s ease-in-out infinite",
        }} />
        <span style={{ fontSize: 10, color: textMuted }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Current Task:</span> {tasks[step]}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 10, color: textMuted }}>
          Tool: <span style={{ color: accent, fontWeight: 700, textTransform: "uppercase" }}>{activeTool}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
          style={{
            all: "unset", cursor: "pointer",
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", boxShadow: "0 0 12px rgba(99,102,241,0.5)",
          }}
          title="AI Assistant"
        >
          <IconSparkle />
        </motion.button>
      </div>
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

/* ─── Root component ───────────────────────────────────────────────────────── */
export default function CounteinvasWorkspace() {
  const [step, setStep] = useState(1);
  const [imageSrc, setImageSrc] = useState(null);
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [annotations, setAnnotations] = useState([]);
  const [history, setHistory] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [layers, setLayers] = useState([
    { id: 1, name: "X-Ray Layer", visible: true },
    { id: 2, name: "Annotations", visible: true },
  ]);
  const [patientMeta] = useState({
    name: "Sarah Chen",
    id: "7789",
    doctor: "Dr. Amelia",
    date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
  });

  const handleUpload = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAnnotations([]);
      setStep(2);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUndo = useCallback(() => {
    setAnnotations(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setHistory(h => [...h, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setAnnotations(a => [...a, last]);
      return prev.slice(0, -1);
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); handleRedo(); }
      if (e.key === "v") setActiveTool(TOOLS.SELECT);
      if (e.key === "l") setActiveTool(TOOLS.LINE);
      if (e.key === "a") setActiveTool(TOOLS.ANGLE);
      if (e.key === "c") setActiveTool(TOOLS.CIRCLE);
      if (e.key === "t") setActiveTool(TOOLS.TEXT);
      if (e.key === "p") setActiveTool(TOOLS.POINT);
      if (e.key === " ") { e.preventDefault(); setActiveTool(TOOLS.PAN); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  return (
    <div style={{
      height: "100dvh", width: "100%",
      display: "flex", flexDirection: "column",
      background: bg, color: textPrimary,
      fontFamily: "'Inter','Poppins',system-ui,sans-serif",
      overflow: "hidden",
    }}>
      <TopBar step={step} setStep={setStep} />
      <ProgressBar step={step} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <OperationsPanel
          step={step} setStep={setStep}
          imageSrc={imageSrc} onUpload={handleUpload}
          activeTool={activeTool} setActiveTool={setActiveTool}
        />

        <CanvasArea
          imageSrc={imageSrc}
          activeTool={activeTool} setActiveTool={setActiveTool}
          activeColor={activeColor}
          annotations={annotations} setAnnotations={setAnnotations}
          history={history} setHistory={setHistory}
          zoom={zoom} setZoom={setZoom}
          pan={pan} setPan={setPan}
          patientMeta={patientMeta}
        />

        <PropertyPanel
          activeColor={activeColor} setActiveColor={setActiveColor}
          onUndo={handleUndo} onRedo={handleRedo}
          layers={layers} setLayers={setLayers}
        />
      </div>

      <StatusBar step={step} imageSrc={imageSrc} activeTool={activeTool} />
    </div>
  );
}
