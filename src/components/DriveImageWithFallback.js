"use client";

import { useEffect, useMemo, useState } from "react";
import { buildDriveImageCandidates } from "@/lib/googleSheetImageUtils";

export default function DriveImageWithFallback({
  src = "",
  driveId = "",
  alt = "",
  className = "",
  loading = "lazy",
}) {
  const candidates = useMemo(
    () => buildDriveImageCandidates(src, driveId),
    [driveId, src],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  const activeSrc = candidates[candidateIndex] || "";

  if (!activeSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-[11px] text-slate-500 ${className}`}
      >
        No Preview
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={activeSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        setCandidateIndex((prev) => {
          if (prev >= candidates.length - 1) return prev;
          return prev + 1;
        });
      }}
    />
  );
}
