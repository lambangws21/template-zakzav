"use client";

import dynamic from "next/dynamic";

const XrayCalibrationWorkspace = dynamic(() => import("../XrayCalibrationWorkspace"), { ssr: false });

export default function AdvancedWorkspace({ onOpenSimpleUi } = {}) {
  return <XrayCalibrationWorkspace simpleUiMode={false} onOpenSimpleUi={onOpenSimpleUi} />;
}
