"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const SimpleCalibrationWorkspace = dynamic(
  () => import("@/components/XrayCalibrationWorkspace"),
  { ssr: false }
);

export default function SimpleUiPage() {
  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-[#f3f6fa]">
      <div className="pointer-events-none fixed right-3 top-3 z-50 flex gap-2 sm:right-4 sm:top-4">
        <Link
          href="/team-access"
          className="pointer-events-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm"
        >
          Team Access
        </Link>
        <Link
          href="/google-sheet-drive"
          className="pointer-events-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm"
        >
          My Drive
        </Link>
      </div>

      <SimpleCalibrationWorkspace simpleUiMode />
    </main>
  );
}
