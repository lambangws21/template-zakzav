import ImagingWorkspaceShell from "@/components/ImagingWorkspaceShell";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-[#f3f6fa]">
      <div className="pointer-events-none fixed right-3 top-3 z-50 sm:right-4 sm:top-4">
        <Link
          href="/google-sheet-drive"
          className="pointer-events-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm"
        >
          Sheet Drive Manager
        </Link>
      </div>
      <ImagingWorkspaceShell />
    </main>
  );
}
