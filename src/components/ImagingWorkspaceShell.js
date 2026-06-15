"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";
import { useTheme } from "@/hooks/useTheme";

// ─── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ label = "Memuat workspace…" }) {
  return (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      height:"100dvh",width:"100%",
      background:"linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f2744 100%)",
      overflow:"hidden",position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,opacity:0.07,backgroundImage:"linear-gradient(#38bdf8 1px,transparent 1px),linear-gradient(90deg,#38bdf8 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none"}} />
      <div style={{position:"absolute",left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#38bdf8,transparent)",animation:"scanline 2.4s linear infinite",opacity:0.6}} />
      <div style={{position:"relative",marginBottom:28}}>
        <svg width="110" height="110" viewBox="0 0 110 110" style={{position:"absolute",top:-3,left:-3,animation:"spin-slow 6s linear infinite"}}>
          <circle cx="55" cy="55" r="50" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="12 8" opacity="0.4"/>
        </svg>
        <svg width="104" height="104" viewBox="0 0 104 104" style={{animation:"spin-rev 4s linear infinite"}}>
          <circle cx="52" cy="52" r="46" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="6 18" strokeLinecap="round" opacity="0.7"/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#0ea5e9,#0369a1)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 32px rgba(14,165,233,0.5),0 0 8px rgba(14,165,233,0.3)",animation:"pulse-icon 2s ease-in-out infinite"}}>
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <rect x="8" y="17" width="22" height="4" rx="2" fill="white" opacity="0.95"/>
              <circle cx="8" cy="19" r="6" fill="white" opacity="0.85"/>
              <circle cx="30" cy="19" r="6" fill="white" opacity="0.85"/>
              <circle cx="8" cy="19" r="3" fill="#0ea5e9" opacity="0.7"/>
              <circle cx="30" cy="19" r="3" fill="#0ea5e9" opacity="0.7"/>
            </svg>
          </div>
        </div>
      </div>
      <div style={{textAlign:"center",marginBottom:6}}>
        <div style={{fontSize:22,fontWeight:900,letterSpacing:"0.18em",background:"linear-gradient(90deg,#38bdf8,#e0f2fe,#38bdf8)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite",textTransform:"uppercase"}}>ZakZav</div>
        <div style={{fontSize:10,letterSpacing:"0.28em",color:"#64748b",textTransform:"uppercase",marginTop:2}}>Orthopedic Templating</div>
      </div>
      <div style={{width:180,height:3,borderRadius:99,background:"#1e3a5f",overflow:"hidden",marginTop:20}}>
        <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#0ea5e9,#38bdf8,#7dd3fc)",animation:"loadbar 1.8s ease-in-out infinite"}} />
      </div>
      <div style={{marginTop:14,fontSize:11,color:"#475569",letterSpacing:"0.06em",animation:"fade-in-out 1.8s ease-in-out infinite"}}>{label}</div>
      <style>{`
        @keyframes scanline{0%{top:-2px}100%{top:100%}}
        @keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes spin-rev{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
        @keyframes pulse-blob{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.15);opacity:1}}
        @keyframes pulse-icon{0%,100%{box-shadow:0 0 32px rgba(14,165,233,.5),0 0 8px rgba(14,165,233,.3)}50%{box-shadow:0 0 48px rgba(14,165,233,.8),0 0 16px rgba(14,165,233,.5)}}
        @keyframes shimmer{0%{background-position:0% center}100%{background-position:200% center}}
        @keyframes loadbar{0%{width:0%;margin-left:0}50%{width:70%;margin-left:0}100%{width:0%;margin-left:100%}}
        @keyframes fade-in-out{0%,100%{opacity:0.4}50%{opacity:1}}
      `}</style>
    </div>
  );
}

// ─── Dynamic imports ───────────────────────────────────────────────────────────

const PacsDicomViewer = dynamic(() => import("@/components/PacsDicomViewer"), {
  ssr: false,
  loading: () => <LoadingScreen label="Memuat PACS Viewer…" />,
});

const XrayCalibrationWorkspace = dynamic(
  () => import("@/components/XrayCalibrationWorkspace"),
  { ssr: false, loading: () => <LoadingScreen label="Memuat workspace…" /> },
);

// ─── Workspace options ─────────────────────────────────────────────────────────

const WORKSPACE_OPTIONS = [
  {
    key: "simple",
    title: "Simple UI",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <rect x="2" y="2" width="12" height="10" rx="2"/>
        <line x1="2" y1="12" x2="14" y2="12"/>
      </svg>
    ),
    description: "Tampilan simple: upload, kalibrasi, ukur, dan planning dalam satu layar.",
  },
  {
    key: "photo",
    title: "Upload X-ray",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="8" cy="8" r="5"/>
        <circle cx="8" cy="8" r="2"/>
        <line x1="8" y1="1" x2="8" y2="3"/>
        <line x1="8" y1="13" x2="8" y2="15"/>
      </svg>
    ),
    description: "Upload file .jpg/.png — tools kalibrasi, pan, zoom, length.",
  },
  {
    key: "dicom",
    title: "Upload DICOM",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M3 2h7l3 3v9H3V2z"/>
        <path d="M10 2v3h3"/>
        <line x1="5" y1="8" x2="11" y2="8"/>
        <line x1="5" y1="11" x2="9" y2="11"/>
      </svg>
    ),
    description: "Viewer file .dcm — tools PACS: WL, Pan, Zoom, Length.",
  },
];

// ─── Sidebar (desktop, non-simple modes) ──────────────────────────────────────

function WorkspaceSidebar({ activeKey, onSelect, collapsed, onToggleCollapse, isDark }) {
  const bg     = isDark ? "#0d1117" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const text   = isDark ? "#64748b" : "#94a3b8";
  const textHi = isDark ? "#e2e8f0" : "#1e293b";

  return (
    <motion.aside
      animate={{ width: collapsed ? 52 : 200 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      style={{
        height: "100%", flexShrink: 0, display: "flex", flexDirection: "column",
        background: bg, borderRight: `1px solid ${border}`,
        overflow: "hidden", zIndex: 20,
      }}
    >
      {/* Brand header */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", gap: 10,
        padding: "0 12px", borderBottom: `1px solid ${border}`, flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 10px rgba(14,165,233,0.3)",
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
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.14 }}
              style={{ overflow: "hidden", whiteSpace: "nowrap" }}
            >
              <div style={{ fontSize: 11, fontWeight: 900, color: "#38bdf8", letterSpacing: "0.1em", textTransform: "uppercase" }}>ZakZav</div>
              <div style={{ fontSize: 8, color: text, letterSpacing: "0.15em", textTransform: "uppercase" }}>Workspace</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Workspace list */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
        {WORKSPACE_OPTIONS.map((ws) => {
          const active = activeKey === ws.key;
          return (
            <button
              key={ws.key}
              onClick={() => onSelect(ws.key)}
              title={ws.title}
              style={{
                all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
                gap: 10, padding: "9px 12px", width: "100%", boxSizing: "border-box",
                color: active ? "#38bdf8" : text,
                background: active ? (isDark ? "rgba(56,189,248,0.1)" : "rgba(14,165,233,0.07)") : "transparent",
                borderLeft: `2px solid ${active ? "#38bdf8" : "transparent"}`,
                fontSize: 12, fontWeight: active ? 700 : 500, transition: "all 0.12s",
              }}
            >
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }}>{ws.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {ws.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* Bottom: user info + ThemeToggle + logout + collapse */}
      <div style={{ borderTop: `1px solid ${border}`, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <LogoutButton collapsed={collapsed} variant="sidebar" />
        {!collapsed && <ThemeToggle />}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            all: "unset", cursor: "pointer", height: 28, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: text, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${border}`, fontSize: 12, transition: "all 0.15s",
          }}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
    </motion.aside>
  );
}

// ─── Main shell ────────────────────────────────────────────────────────────────

export default function ImagingWorkspaceShell() {
  const [activeWorkspace, setActiveWorkspace] = useState("simple");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    setHasMounted(true);
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (mobile) setActiveWorkspace("simple");
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const effectiveWorkspace = isMobile ? "simple" : activeWorkspace;
  const isSimple = effectiveWorkspace === "simple";
  const showSidebar = !isMobile && !isSimple;

  // Lock scroll in simple mode
  useEffect(() => {
    if (!isSimple) return;
    const body = document.body;
    const root = document.documentElement;
    const prev = {
      bO: body.style.overflow, bOB: body.style.overscrollBehavior, bH: body.style.height,
      rO: root.style.overflow, rOB: root.style.overscrollBehavior, rH: root.style.height,
    };
    window.scrollTo(0, 0);
    body.style.overflow = "hidden"; body.style.overscrollBehavior = "none"; body.style.height = "100dvh";
    root.style.overflow = "hidden"; root.style.overscrollBehavior = "none"; root.style.height = "100%";
    return () => {
      body.style.overflow = prev.bO; body.style.overscrollBehavior = prev.bOB; body.style.height = prev.bH;
      root.style.overflow = prev.rO; root.style.overscrollBehavior = prev.rOB; root.style.height = prev.rH;
    };
  }, [isSimple]);

  if (!hasMounted) return <LoadingScreen />;

  return (
    <div style={{
      display: "flex", height: isSimple ? "100dvh" : "auto", minHeight: isSimple ? undefined : "100dvh",
      overflow: isSimple ? "hidden" : "auto",
      background: "var(--color-body-bg)",
    }}>
      {/* Sidebar — only in non-simple desktop mode */}
      {showSidebar && (
        <WorkspaceSidebar
          activeKey={effectiveWorkspace}
          onSelect={setActiveWorkspace}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          isDark={isDark}
        />
      )}

      {/* Workspace content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AnimatePresence mode="wait">
          {effectiveWorkspace === "dicom" ? (
            <motion.div key="dicom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }} style={{ flex: 1 }}>
              <PacsDicomViewer />
            </motion.div>
          ) : (
            <motion.div key={effectiveWorkspace} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <XrayCalibrationWorkspace
                simpleUiMode={isSimple}
                onOpenSimpleUi={isMobile ? undefined : () => setActiveWorkspace("simple")}
                onOpenAdvancedUi={isMobile ? undefined : () => setActiveWorkspace("photo")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
