"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

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
      <div style={{position:"absolute",width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(56,189,248,0.12) 0%,transparent 70%)",animation:"pulse-blob 3s ease-in-out infinite",pointerEvents:"none"}} />
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

const PacsDicomViewer = dynamic(() => import("@/components/PacsDicomViewer"), {
  ssr: false,
  loading: () => <LoadingScreen label="Memuat PACS Viewer…" />,
});

const XrayCalibrationWorkspace = dynamic(
  () => import("@/components/XrayCalibrationWorkspace"),
  {
    ssr: false,
    loading: () => <LoadingScreen label="Memuat workspace…" />,
  },
);

const WORKSPACE_OPTIONS = [
  {
    key: "photo",
    title: "Upload X-ray",
    description:
      "Untuk file X-ray (.jpg, .jpeg, .png) dengan tools calibrasi (pan, zoom, length).",
  },
  {
    key: "dicom",
    title: "Upload DICOM",
    description:
      "Untuk file DICOM (.dcm) dengan tools PACS (WL, Pan, Zoom, Length).",
  },
  {
    key: "simple",
    title: "Simple UI",
    description:
      "Tampilan simple dengan logika templating yang sama untuk upload, kalibrasi, ukur, dan planning.",
  },
];

function WorkspaceLoadingFallback() {
  return <LoadingScreen />;
}


export default function ImagingWorkspaceShell() {
  const [activeWorkspace, setActiveWorkspace] = useState("simple");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    const viewportQuery = window.matchMedia("(max-width: 1023px)");
    const updateMobileState = () => {
      const nextIsMobile = viewportQuery.matches;
      setIsMobileViewport(nextIsMobile);
      if (nextIsMobile) {
        setActiveWorkspace("simple");
      }
    };

    updateMobileState();
    viewportQuery.addEventListener("change", updateMobileState);
    return () => viewportQuery.removeEventListener("change", updateMobileState);
  }, []);

  const effectiveWorkspace = isMobileViewport ? "simple" : activeWorkspace;
  const isSimpleWorkspace = effectiveWorkspace === "simple";
  const showWorkspaceSwitcher = !isMobileViewport && !isSimpleWorkspace;

  const activeWorkspaceInfo = useMemo(
    () => WORKSPACE_OPTIONS.find((item) => item.key === effectiveWorkspace),
    [effectiveWorkspace],
  );

  useEffect(() => {
    if (!isSimpleWorkspace) return undefined;

    const body = document.body;
    const root = document.documentElement;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyHeight: body.style.height,
      rootOverflow: root.style.overflow,
      rootOverscrollBehavior: root.style.overscrollBehavior,
      rootHeight: root.style.height,
    };

    window.scrollTo(0, 0);
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.height = "100dvh";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    root.style.height = "100%";

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      body.style.height = previous.bodyHeight;
      root.style.overflow = previous.rootOverflow;
      root.style.overscrollBehavior = previous.rootOverscrollBehavior;
      root.style.height = previous.rootHeight;
    };
  }, [isSimpleWorkspace]);

  if (!hasMounted) {
    return <WorkspaceLoadingFallback />;
  }

  return (
    <div className={isSimpleWorkspace ? "h-[100dvh] w-full overflow-hidden" : "min-h-screen w-full"}>
      <div
        className={`sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur ${
          showWorkspaceSwitcher ? "hidden lg:block" : "hidden"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-3 py-3 sm:px-4 lg:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {WORKSPACE_OPTIONS.map((workspace) => (
              <button
                key={workspace.key}
                type="button"
                onClick={() => setActiveWorkspace(workspace.key)}
                className={`shrink-0 rounded-md px-3 py-2 text-xs sm:text-sm ${
                  effectiveWorkspace === workspace.key
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {workspace.title}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            {activeWorkspaceInfo?.description}
          </p>
        </div>
      </div>

      {effectiveWorkspace === "dicom" ? (
        <PacsDicomViewer />
      ) : (
        <XrayCalibrationWorkspace
          simpleUiMode={effectiveWorkspace === "simple"}
          onOpenSimpleUi={
            isMobileViewport ? undefined : () => setActiveWorkspace("simple")
          }
          onOpenAdvancedUi={
            isMobileViewport ? undefined : () => setActiveWorkspace("photo")
          }
        />
      )}
    </div>
  );
}
