"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const XrayCalibrationWorkspace = dynamic(() => import("@/components/XrayCalibrationWorkspace"), {
  ssr: false,
  loading: () => <div className="flex h-dvh items-center justify-center">Memuat planning workspace...</div>,
});

export default function SimpleWorkspace() {
  const router = useRouter();
  return <XrayCalibrationWorkspace simpleUiMode planningUi onOpenAdvancedUi={() => router.push("/advanced")} />;
}
