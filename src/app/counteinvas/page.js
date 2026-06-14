"use client";

import dynamic from "next/dynamic";

const CounteinvasWorkspace = dynamic(
  () => import("@/components/CounteinvasWorkspace"),
  { ssr: false }
);

export default function CounteinvasPage() {
  return (
    <main style={{ height: "100dvh", overflow: "hidden" }}>
      <CounteinvasWorkspace />
    </main>
  );
}
