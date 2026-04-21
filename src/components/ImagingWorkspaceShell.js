"use client";

import { useMemo, useState } from "react";
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
    key: "dicom",
    title: "DICOM Viewer",
    description: "Untuk file DICOM (.dcm) dengan tools PACS (WL, Pan, Zoom, Length).",
  },
  {
    key: "photo",
    title: "Upload X-ray",
    description:
      "Untuk file X-ray (.jpg, .jpeg, .png) dengan tools calibrasi (pan, zoom, length).",
  },
];

export default function ImagingWorkspaceShell() {
  const [activeWorkspace, setActiveWorkspace] = useState("dicom");

  const activeWorkspaceInfo = useMemo(
    () => WORKSPACE_OPTIONS.find((item) => item.key === activeWorkspace),
    [activeWorkspace],
  );

  return (
    <div className="min-h-screen w-full">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-3 py-3 sm:px-4 lg:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {WORKSPACE_OPTIONS.map((workspace) => (
              <button
                key={workspace.key}
                type="button"
                onClick={() => setActiveWorkspace(workspace.key)}
                className={`shrink-0 rounded-md px-3 py-2 text-xs sm:text-sm ${
                  activeWorkspace === workspace.key
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {workspace.title}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600">{activeWorkspaceInfo?.description}</p>
        </div>
      </div>

      {activeWorkspace === "dicom" ? <PacsDicomViewer /> : <XrayCalibrationWorkspace />}
    </div>
  );
}
