"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { buildDriveImageCandidates } from "@/lib/googleSheetImageUtils";

export default function DriveImageWithFallback({
  src = "",
  driveId = "",
  alt = "",
  className = "",
  loading = "lazy",
  style,
  ...rest
}) {
  const candidates = useMemo(() => {
    const list = Array.isArray(buildDriveImageCandidates(src, driveId))
      ? buildDriveImageCandidates(src, driveId).filter(Boolean)
      : [];
    if (!list.includes("/no-image.png")) {
      list.push("/no-image.png");
    }
    return list;
  }, [driveId, src]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [finalFailed, setFinalFailed] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setFinalFailed(false);
  }, [candidates]);

  const activeSrc = candidates[candidateIndex] || "";

  if (!activeSrc || finalFailed) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
        style={style}
        title="No image"
        {...rest}
      >
        <ImageOff size={16} />
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
      style={style}
      {...rest}
      onError={() => {
        setCandidateIndex((prev) => {
          if (prev >= candidates.length - 1) {
            setFinalFailed(true);
            return prev;
          }
          return prev + 1;
        });
      }}
    />
  );
}
