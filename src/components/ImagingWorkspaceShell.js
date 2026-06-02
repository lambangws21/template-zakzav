"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const PacsDicomViewer = dynamic(() => import("@/components/PacsDicomViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
      Loading PACS Viewer...
    </div>
  ),
});

const XrayCalibrationWorkspace = dynamic(
  () => import("@/components/XrayCalibrationWorkspace"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Loading Photo Workspace...
      </div>
    ),
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

export default function ImagingWorkspaceShell() {
  const [activeWorkspace, setActiveWorkspace] = useState("simple");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
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

  const activeWorkspaceInfo = useMemo(
    () => WORKSPACE_OPTIONS.find((item) => item.key === effectiveWorkspace),
    [effectiveWorkspace],
  );

  return (
    <div className="min-h-screen w-full">
      <div className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white/95 backdrop-blur lg:block">
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
