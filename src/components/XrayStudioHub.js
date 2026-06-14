"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

// ─── Loading screen ────────────────────────────────────────────────────────────

function ToolLoadingScreen({ label = "Memuat…" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", width: "100%", minHeight: 200,
      background: "linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f2744 100%)",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "linear-gradient(135deg,#0ea5e9,#0369a1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(14,165,233,0.5)",
        marginBottom: 14, animation: "spin-slow 6s linear infinite",
      }}>
        <svg width="22" height="22" viewBox="0 0 38 38" fill="none">
          <rect x="8" y="17" width="22" height="4" rx="2" fill="white" opacity="0.95"/>
          <circle cx="8" cy="19" r="6" fill="white" opacity="0.85"/>
          <circle cx="30" cy="19" r="6" fill="white" opacity="0.85"/>
          <circle cx="8" cy="19" r="3" fill="#0ea5e9" opacity="0.7"/>
          <circle cx="30" cy="19" r="3" fill="#0ea5e9" opacity="0.7"/>
        </svg>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.06em" }}>{label}</div>
      <style>{`@keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Dynamic imports ───────────────────────────────────────────────────────────

const PatientCaseManager = dynamic(() => import("@/components/PatientCaseManager"), {
  ssr: false, loading: () => <ToolLoadingScreen label="Memuat Kasus Pasien…" />,
});
const XrayCalibrationWorkspace = dynamic(() => import("@/components/XrayCalibrationWorkspace"), {
  ssr: false, loading: () => <ToolLoadingScreen label="Memuat X-Ray Studio…" />,
});
const PacsDicomViewer = dynamic(() => import("@/components/PacsDicomViewer"), {
  ssr: false, loading: () => <ToolLoadingScreen label="Memuat DICOM Viewer…" />,
});
const HKAPlanner = dynamic(() => import("@/components/hka/HKAPlanner"), {
  ssr: false, loading: () => <ToolLoadingScreen label="Memuat HKA Planner…" />,
});
const DigitalTemplatingViewer = dynamic(
  () => import("@/components/digitalTemplating/digitalTemplatingViewer"),
  { ssr: false, loading: () => <ToolLoadingScreen label="Memuat Digital Templating…" /> }
);
const TemplatingAnalytics = dynamic(() => import("@/components/TemplatingAnalytics"), {
  ssr: false, loading: () => <ToolLoadingScreen label="Memuat Analitik…" />,
});
const TkaPlanner = dynamic(() => import("@/components/digitalTemplating/tkaPlanner"), {
  ssr: false, loading: () => <ToolLoadingScreen label="Memuat TKA/THA Planner…" />,
});

// ─── Tool registry ─────────────────────────────────────────────────────────────

const TOOLS = [
  {
    key: "cases",
    label: "Kasus Pasien",
    shortLabel: "Kasus",
    desc: "Kelola data kasus pasien, foto pre/post-op, dan laporan kasus.",
    icon: "📋",
    gradient: "linear-gradient(135deg,#2563eb,#0ea5e9)",
    glow: "rgba(14,165,233,0.4)",
    component: PatientCaseManager,
    props: {},
  },
  {
    key: "xray",
    label: "X-Ray Studio",
    shortLabel: "X-Ray",
    desc: "Upload foto X-ray, kalibrasi pixel-to-mm, pengukuran, dan templating implant.",
    icon: "🩻",
    gradient: "linear-gradient(135deg,#0369a1,#6366f1)",
    glow: "rgba(99,102,241,0.4)",
    component: XrayCalibrationWorkspace,
    props: { simpleUiMode: false },
  },
  {
    key: "dicom",
    label: "DICOM Viewer",
    shortLabel: "DICOM",
    desc: "Viewer file DICOM (.dcm) dengan tools PACS: Window-Level, Pan, Zoom, Length.",
    icon: "📂",
    gradient: "linear-gradient(135deg,#7c3aed,#a855f7)",
    glow: "rgba(168,85,247,0.4)",
    component: PacsDicomViewer,
    props: {},
  },
  {
    key: "hka",
    label: "Alignment HKA",
    shortLabel: "HKA",
    desc: "Pengukuran HKA, FTA, dan JLA pada X-ray full-length knee.",
    icon: "📐",
    gradient: "linear-gradient(135deg,#059669,#14b8a6)",
    glow: "rgba(20,184,166,0.4)",
    component: HKAPlanner,
    props: {},
  },
  {
    key: "templating",
    label: "Digital Templating",
    shortLabel: "Templating",
    desc: "Canvas digital untuk templating implant hip/knee dengan ukuran nyata (mm).",
    icon: "🎯",
    gradient: "linear-gradient(135deg,#d97706,#f59e0b)",
    glow: "rgba(245,158,11,0.4)",
    component: DigitalTemplatingViewer,
    props: {},
  },
  {
    key: "analytics",
    label: "Analitik",
    shortLabel: "Analitik",
    desc: "Dashboard statistik akurasi templating dan outcome pasien dari cloud.",
    icon: "📊",
    gradient: "linear-gradient(135deg,#e11d48,#f43f5e)",
    glow: "rgba(244,63,94,0.4)",
    component: TemplatingAnalytics,
    props: {},
  },
  {
    key: "tka",
    label: "TKA/THA Planner",
    shortLabel: "TKA/THA",
    desc: "Panduan perencanaan operasi TKA dan THA dengan simulasi sudut reseksi.",
    icon: "🦴",
    gradient: "linear-gradient(135deg,#475569,#64748b)",
    glow: "rgba(100,116,139,0.3)",
    component: TkaPlanner,
    props: {},
  },
];

// ─── Hub home ──────────────────────────────────────────────────────────────────

function HubHome({ onSelect }) {
  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f1e", color: "white", overflowY: "auto" }}>
      {/* Grid bg */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04, pointerEvents: "none",
        backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(10,15,30,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(56,189,248,0.12)",
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        {/* Logo */}
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "linear-gradient(135deg,#0ea5e9,#0369a1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(14,165,233,0.5)", flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 38 38" fill="none">
            <rect x="8" y="17" width="22" height="4" rx="2" fill="white"/>
            <circle cx="8" cy="19" r="6" fill="white" opacity="0.9"/>
            <circle cx="30" cy="19" r="6" fill="white" opacity="0.9"/>
            <circle cx="8" cy="19" r="3" fill="#0ea5e9"/>
            <circle cx="30" cy="19" r="3" fill="#0ea5e9"/>
          </svg>
        </div>
        <div>
          <div style={{
            fontSize: 18, fontWeight: 900, letterSpacing: "0.14em",
            background: "linear-gradient(90deg,#38bdf8,#e0f2fe,#7dd3fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            textTransform: "uppercase",
          }}>
            ZakZav
          </div>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 1 }}>
            Orthopedic X-Ray Studio
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#334155", fontWeight: 600 }}>
          {TOOLS.length} Tools
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "40px 24px 20px", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
        <div style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 99,
          background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)",
          fontSize: 10, letterSpacing: "0.18em", color: "#38bdf8", fontWeight: 700,
          textTransform: "uppercase", marginBottom: 16,
        }}>
          Studio Lengkap
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, lineHeight: 1.2, margin: "0 0 10px",
          background: "linear-gradient(135deg,#f8fafc,#94a3b8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Semua Tool Ortopedi<br />Dalam Satu Tempat
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          Pilih tool di bawah untuk mulai bekerja
        </p>
      </div>

      {/* Tool grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16, padding: "16px 20px 40px", maxWidth: 1200, margin: "0 auto",
      }}>
        {TOOLS.map((tool, i) => (
          <ToolCard key={tool.key} tool={tool} index={i} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function ToolCard({ tool, index, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(tool.key)}
      style={{
        all: "unset", cursor: "pointer", display: "flex", flexDirection: "column",
        borderRadius: 20, overflow: "hidden",
        border: hovered ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
        background: hovered ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.6)",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? `0 12px 40px ${tool.glow}` : "none",
        textAlign: "left",
      }}
    >
      {/* Gradient top bar */}
      <div style={{ height: 4, background: tool.gradient }} />

      {/* Content */}
      <div style={{ padding: "20px 20px 22px" }}>
        <div style={{ fontSize: 36, marginBottom: 12, lineHeight: 1 }}>{tool.icon}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
          {tool.label}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          {tool.desc}
        </div>

        {/* Launch button */}
        <div style={{
          marginTop: 18, display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 16px", borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: hovered ? tool.gradient : "rgba(255,255,255,0.06)",
          color: hovered ? "white" : "#94a3b8",
          transition: "all 0.2s ease",
        }}>
          Buka Tool
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Back button (floating, overlaid on active tool) ───────────────────────────

function FloatingBackButton({ tool, onBack }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      position: "fixed", top: 12, left: 12, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: collapsed ? "7px 10px" : "7px 14px 7px 10px",
          borderRadius: 99, border: "1px solid rgba(56,189,248,0.3)",
          background: "rgba(10,15,30,0.88)", backdropFilter: "blur(12px)",
          color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          transition: "all 0.15s ease",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M8 2L4 6.5L8 11" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {!collapsed && (
          <span style={{ color: "#94a3b8" }}>
            <span style={{ color: "#38bdf8" }}>Studio</span>
          </span>
        )}
      </button>

      {!collapsed && (
        <div style={{
          padding: "5px 12px", borderRadius: 99,
          background: "rgba(10,15,30,0.75)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 10, fontWeight: 600, color: "#64748b",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 13 }}>{tool.icon}</span>
          {tool.label}
        </div>
      )}

      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10,15,30,0.75)", backdropFilter: "blur(12px)",
          color: "#475569", fontSize: 10, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
        title={collapsed ? "Tampilkan label" : "Sembunyikan label"}
      >
        {collapsed ? "»" : "«"}
      </button>
    </div>
  );
}

// ─── Main hub ──────────────────────────────────────────────────────────────────

export default function XrayStudioHub() {
  const [activeTool, setActiveTool] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);

  // Lock body scroll when a full-screen tool is active
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    if (activeTool) {
      body.style.overflow = "hidden";
      body.style.height = "100dvh";
      html.style.overflow = "hidden";
    } else {
      body.style.overflow = "";
      body.style.height = "";
      html.style.overflow = "";
    }
    return () => {
      body.style.overflow = "";
      body.style.height = "";
      html.style.overflow = "";
    };
  }, [activeTool]);

  if (!hasMounted) {
    return (
      <div style={{ height: "100dvh", background: "#0a0f1e" }}>
        <ToolLoadingScreen label="Memuat ZakZav Studio…" />
      </div>
    );
  }

  const tool = TOOLS.find(t => t.key === activeTool);
  const ToolComponent = tool?.component;

  return (
    <div style={{ height: "100dvh", background: "#0a0f1e", position: "relative", overflow: "hidden" }}>
      <AnimatePresence mode="wait">
        {activeTool && ToolComponent ? (
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{ position: "absolute", inset: 0, zIndex: 10, overflow: "hidden" }}
          >
            <FloatingBackButton tool={tool} onBack={() => setActiveTool(null)} />
            <ToolComponent {...(tool.props || {})} />
          </motion.div>
        ) : (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto" }}
          >
            <HubHome onSelect={setActiveTool} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
