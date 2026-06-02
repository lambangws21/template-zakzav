"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";

const SimpleCalibrationWorkspace = dynamic(
  () => import("@/components/XrayCalibrationWorkspace"),
  { ssr: false }
);

export default function SimpleUiPage() {
  useEffect(() => {
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
  }, []);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#f3f6fa]">
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
