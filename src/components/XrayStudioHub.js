"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";

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

const PatientCaseManager    = dynamic(() => import("@/components/PatientCaseManager"),    { ssr: false, loading: () => <ToolLoadingScreen label="Memuat Kasus Pasien…" /> });
const XrayCalibrationWorkspace = dynamic(() => import("@/components/XrayCalibrationWorkspace"), { ssr: false, loading: () => <ToolLoadingScreen label="Memuat X-Ray Studio…" /> });
const PacsDicomViewer       = dynamic(() => import("@/components/PacsDicomViewer"),       { ssr: false, loading: () => <ToolLoadingScreen label="Memuat DICOM Viewer…" /> });
const HKAPlanner            = dynamic(() => import("@/components/hka/HKAPlanner"),        { ssr: false, loading: () => <ToolLoadingScreen label="Memuat HKA Planner…" /> });
const DigitalTemplatingViewer = dynamic(() => import("@/components/digitalTemplating/digitalTemplatingViewer"), { ssr: false, loading: () => <ToolLoadingScreen label="Memuat Digital Templating…" /> });
const TemplatingAnalytics   = dynamic(() => import("@/components/TemplatingAnalytics"),   { ssr: false, loading: () => <ToolLoadingScreen label="Memuat Analitik…" /> });
const TkaPlanner            = dynamic(() => import("@/components/digitalTemplating/tkaPlanner"), { ssr: false, loading: () => <ToolLoadingScreen label="Memuat TKA/THA Planner…" /> });

// ─── Tool registry ─────────────────────────────────────────────────────────────

const TOOLS = [
  { key: "cases",      label: "Kasus Pasien",      shortLabel: "Kasus",      desc: "Kelola data kasus pasien, foto pre/post-op, dan laporan kasus.",                                  icon: "📋", gradient: "linear-gradient(135deg,#2563eb,#0ea5e9)", glow: "rgba(14,165,233,0.4)",   component: PatientCaseManager,        props: {} },
  { key: "xray",       label: "X-Ray Studio",       shortLabel: "X-Ray",      desc: "Upload foto X-ray, kalibrasi pixel-to-mm, pengukuran, dan templating implant.",                   icon: "🩻", gradient: "linear-gradient(135deg,#0369a1,#6366f1)", glow: "rgba(99,102,241,0.4)",   component: XrayCalibrationWorkspace,  props: { simpleUiMode: false } },
  { key: "dicom",      label: "DICOM Viewer",        shortLabel: "DICOM",      desc: "Viewer file DICOM (.dcm) dengan tools PACS: Window-Level, Pan, Zoom, Length.",                   icon: "📂", gradient: "linear-gradient(135deg,#7c3aed,#a855f7)", glow: "rgba(168,85,247,0.4)",   component: PacsDicomViewer,           props: {} },
  { key: "hka",        label: "Alignment HKA",       shortLabel: "HKA",        desc: "Pengukuran HKA, FTA, dan JLA pada X-ray full-length knee.",                                      icon: "📐", gradient: "linear-gradient(135deg,#059669,#14b8a6)", glow: "rgba(20,184,166,0.4)",   component: HKAPlanner,                props: {} },
  { key: "templating", label: "Digital Templating",  shortLabel: "Templating", desc: "Canvas digital untuk templating implant hip/knee dengan ukuran nyata (mm).",                     icon: "🎯", gradient: "linear-gradient(135deg,#d97706,#f59e0b)", glow: "rgba(245,158,11,0.4)",   component: DigitalTemplatingViewer,   props: {} },
  { key: "analytics",  label: "Analitik",             shortLabel: "Analitik",   desc: "Dashboard statistik akurasi templating dan outcome pasien dari cloud.",                          icon: "📊", gradient: "linear-gradient(135deg,#e11d48,#f43f5e)", glow: "rgba(244,63,94,0.4)",    component: TemplatingAnalytics,       props: {} },
  { key: "tka",        label: "TKA/THA Planner",     shortLabel: "TKA/THA",    desc: "Panduan perencanaan operasi TKA dan THA dengan simulasi sudut reseksi.",                         icon: "🦴", gradient: "linear-gradient(135deg,#475569,#64748b)", glow: "rgba(100,116,139,0.3)",  component: TkaPlanner,                props: {} },
];

// ─── Sidebar (desktop ≥1024px) ─────────────────────────────────────────────────

function Sidebar({ activeTool, onSelect, onHome, collapsed, onToggleCollapse, isDark }) {
  const bg     = isDark ? "#0d1117" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const text   = isDark ? "#94a3b8" : "#64748b";
  const textHi = isDark ? "#e2e8f0" : "#1e293b";

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      style={{
        height: "100%", flexShrink: 0, display: "flex", flexDirection: "column",
        background: bg, borderRight: `1px solid ${border}`,
        overflow: "hidden", position: "relative", zIndex: 20,
      }}
    >
      {/* Brand */}
      <div style={{
        height: 52, display: "flex", alignItems: "center",
        padding: collapsed ? "0 14px" : "0 14px",
        gap: 10, borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(14,165,233,0.35)",
        }}>
          <svg width="14" height="14" viewBox="0 0 38 38" fill="none">
            <rect x="8" y="17" width="22" height="4" rx="2" fill="white"/>
            <circle cx="8" cy="19" r="6" fill="white" opacity="0.9"/>
            <circle cx="30" cy="19" r="6" fill="white" opacity="0.9"/>
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: "hidden", whiteSpace: "nowrap" }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", color: "#38bdf8", textTransform: "uppercase" }}>ZakZav</div>
              <div style={{ fontSize: 8.5, color: text, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 1 }}>X-Ray Studio</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tools list */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {/* Hub home button */}
        <button
          onClick={onHome}
          title="Hub Home"
          style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
            gap: 10, padding: collapsed ? "8px 14px" : "8px 14px",
            width: "100%", boxSizing: "border-box",
            color: !activeTool ? "#38bdf8" : text,
            background: !activeTool ? "rgba(56,189,248,0.1)" : "transparent",
            fontSize: 12, fontWeight: 700, transition: "all 0.12s",
            borderLeft: `2px solid ${!activeTool ? "#38bdf8" : "transparent"}`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M2 6.5L8 2l6 4.5V14H10v-4H6v4H2V6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                Hub Home
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div style={{ height: 1, background: border, margin: "6px 10px" }} />

        {TOOLS.map((tool) => {
          const active = activeTool === tool.key;
          return (
            <button
              key={tool.key}
              onClick={() => onSelect(tool.key)}
              title={tool.label}
              style={{
                all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
                gap: 10, padding: "8px 14px",
                width: "100%", boxSizing: "border-box",
                color: active ? textHi : text,
                background: active ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)") : "transparent",
                fontSize: 12, fontWeight: active ? 700 : 500, transition: "all 0.12s",
                borderLeft: `2px solid ${active ? "#38bdf8" : "transparent"}`,
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{tool.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {tool.shortLabel}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* Bottom: ThemeToggle + collapse toggle */}
      <div style={{ borderTop: `1px solid ${border}`, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {!collapsed && <ThemeToggle />}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%", height: 30, borderRadius: 8, fontSize: 12,
            color: text, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${border}`, transition: "all 0.15s",
          }}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
    </motion.aside>
  );
}

// ─── Mobile bottom nav bar ─────────────────────────────────────────────────────

function MobileNavBar({ activeTool, onSelect, onHome, isDark, onOpenDrawer }) {
  const bg     = isDark ? "#0d1117" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)";
  const text   = isDark ? "#64748b" : "#94a3b8";
  const textAc = isDark ? "#e2e8f0" : "#1e293b";

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: bg, borderTop: `1px solid ${border}`,
      display: "flex", alignItems: "center", height: 56,
      padding: "0 4px", gap: 2,
      boxShadow: isDark ? "0 -8px 24px rgba(0,0,0,0.4)" : "0 -4px 16px rgba(0,0,0,0.08)",
    }}>
      {/* Home */}
      <button onClick={onHome} style={{
        all: "unset", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 3, padding: "6px 4px",
        color: !activeTool ? "#38bdf8" : text, fontSize: 9, fontWeight: 700, transition: "color 0.15s",
      }}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M2 6.5L8 2l6 4.5V14H10v-4H6v4H2V6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
        <span>Hub</span>
      </button>

      {/* Active tool shortcut or first few tools */}
      {TOOLS.slice(0, 3).map((tool) => {
        const active = activeTool === tool.key;
        return (
          <button key={tool.key} onClick={() => onSelect(tool.key)} style={{
            all: "unset", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 3, padding: "6px 4px",
            color: active ? textAc : text, fontSize: 9, fontWeight: active ? 700 : 500, transition: "color 0.15s",
          }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>{tool.icon}</span>
            <span>{tool.shortLabel}</span>
          </button>
        );
      })}

      {/* More drawer button */}
      <button onClick={onOpenDrawer} style={{
        all: "unset", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 3, padding: "6px 4px",
        color: text, fontSize: 9, fontWeight: 600,
      }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/>
        </svg>
        <span>Lainnya</span>
      </button>
    </div>
  );
}

// ─── Mobile bottom sheet drawer ────────────────────────────────────────────────

function MobileDrawer({ open, onClose, activeTool, onSelect, isDark }) {
  const bg     = isDark ? "#161b27" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const text   = isDark ? "#94a3b8" : "#64748b";
  const textHi = isDark ? "#e2e8f0" : "#1e293b";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60,
              background: bg, borderRadius: "20px 20px 0 0",
              borderTop: `1px solid ${border}`,
              padding: "12px 16px 80px",
              boxShadow: "0 -12px 40px rgba(0,0,0,0.3)",
              maxHeight: "70dvh", overflowY: "auto",
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 99, background: border, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: text, marginBottom: 12 }}>Semua Tools</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {TOOLS.map((tool) => {
                const active = activeTool === tool.key;
                return (
                  <button key={tool.key} onClick={() => { onSelect(tool.key); onClose(); }} style={{
                    all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 12px", borderRadius: 12,
                    background: active ? (isDark ? "rgba(56,189,248,0.1)" : "rgba(14,165,233,0.08)") : "transparent",
                    border: `1px solid ${active ? "rgba(56,189,248,0.3)" : "transparent"}`,
                    transition: "all 0.12s",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: tool.gradient, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18,
                    }}>{tool.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#38bdf8" : textHi }}>{tool.label}</div>
                      <div style={{ fontSize: 10, color: text, marginTop: 1 }}>{tool.desc.slice(0, 48)}…</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "center" }}>
              <ThemeToggle />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Hub home content (main area when no tool active) ─────────────────────────

function HubHome({ onSelect, isDark }) {
  const text = isDark ? "#64748b" : "#94a3b8";

  return (
    <div style={{ flex: 1, overflowY: "auto", background: isDark ? "#0a0f1e" : "#f3f6fa" }}>
      {/* Subtle grid bg (dark mode only) */}
      {isDark && (
        <div style={{
          position: "fixed", inset: 0, opacity: 0.03, pointerEvents: "none",
          backgroundImage: "linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
      )}

      {/* Hero */}
      <div style={{ padding: "40px 24px 24px", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
        <div style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 99,
          background: isDark ? "rgba(14,165,233,0.1)" : "rgba(14,165,233,0.08)",
          border: "1px solid rgba(14,165,233,0.25)",
          fontSize: 10, letterSpacing: "0.18em", color: "#38bdf8", fontWeight: 700,
          textTransform: "uppercase", marginBottom: 16,
        }}>
          Studio Lengkap
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 900, lineHeight: 1.25, margin: "0 0 10px",
          color: isDark ? "#f1f5f9" : "#1e293b",
        }}>
          Semua Tool Ortopedi<br />Dalam Satu Tempat
        </h1>
        <p style={{ fontSize: 13, color: text, margin: 0 }}>Pilih tool dari daftar untuk mulai bekerja</p>
      </div>

      {/* Tool cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 14, padding: "4px 20px 40px", maxWidth: 1100, margin: "0 auto",
      }}>
        {TOOLS.map((tool, i) => (
          <ToolCard key={tool.key} tool={tool} index={i} onSelect={onSelect} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}

function ToolCard({ tool, index, onSelect, isDark }) {
  const [hovered, setHovered] = useState(false);
  const cardBg   = isDark ? "rgba(15,23,42,0.6)" : "#ffffff";
  const cardHov  = isDark ? "rgba(15,23,42,0.9)" : "#f8fafc";
  const border   = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const borderHov = isDark ? "rgba(255,255,255,0.15)" : "rgba(14,165,233,0.3)";
  const descColor = isDark ? "#64748b" : "#94a3b8";

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(tool.key)}
      style={{
        all: "unset", cursor: "pointer", display: "flex", flexDirection: "column",
        borderRadius: 16, overflow: "hidden",
        border: `1px solid ${hovered ? borderHov : border}`,
        background: hovered ? cardHov : cardBg,
        transition: "all 0.18s ease",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered
          ? `0 10px 32px ${tool.glow}`
          : isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
        textAlign: "left",
      }}
    >
      <div style={{ height: 3, background: tool.gradient }} />
      <div style={{ padding: "18px 18px 20px" }}>
        <div style={{ fontSize: 32, marginBottom: 10, lineHeight: 1 }}>{tool.icon}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: isDark ? "#f1f5f9" : "#1e293b", marginBottom: 5 }}>{tool.label}</div>
        <div style={{ fontSize: 11, color: descColor, lineHeight: 1.6 }}>{tool.desc}</div>
        <div style={{
          marginTop: 14, display: "inline-flex", alignItems: "center", gap: 5,
          padding: "6px 14px", borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: hovered ? tool.gradient : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
          color: hovered ? "white" : (isDark ? "#64748b" : "#94a3b8"),
          transition: "all 0.18s ease",
        }}>
          Buka Tool
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Main hub ──────────────────────────────────────────────────────────────────

export default function XrayStudioHub() {
  const [activeTool, setActiveTool]         = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile]             = useState(false);
  const [hasMounted, setHasMounted]         = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    setHasMounted(true);
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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
      <div style={{ height: "100dvh", background: isDark ? "#0a0f1e" : "#f3f6fa" }}>
        <ToolLoadingScreen label="Memuat ZakZav Studio…" />
      </div>
    );
  }

  const tool = TOOLS.find(t => t.key === activeTool);
  const ToolComponent = tool?.component;

  return (
    <div style={{
      height: "100dvh", display: "flex", overflow: "hidden",
      background: isDark ? "#0a0f1e" : "#f3f6fa",
      fontFamily: "'Inter','Poppins',system-ui,sans-serif",
    }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar
          activeTool={activeTool}
          onSelect={setActiveTool}
          onHome={() => setActiveTool(null)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          isDark={isDark}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", minWidth: 0 }}>
        <AnimatePresence mode="wait">
          {activeTool && ToolComponent ? (
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "absolute", inset: 0, zIndex: 10, overflow: "hidden" }}
            >
              <ToolComponent {...(tool.props || {})} />
            </motion.div>
          ) : (
            <motion.div
              key="hub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <HubHome onSelect={setActiveTool} isDark={isDark} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile navigation */}
      {isMobile && (
        <>
          <MobileNavBar
            activeTool={activeTool}
            onSelect={setActiveTool}
            onHome={() => setActiveTool(null)}
            isDark={isDark}
            onOpenDrawer={() => setMobileDrawerOpen(true)}
          />
          <MobileDrawer
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            activeTool={activeTool}
            onSelect={setActiveTool}
            isDark={isDark}
          />
        </>
      )}
    </div>
  );
}
