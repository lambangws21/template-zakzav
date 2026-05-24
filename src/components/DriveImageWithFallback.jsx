"use client";

import { useEffect, useMemo, useState } from "react";
import { buildDriveImageCandidates } from "@/lib/googleSheetImageUtils";

const INLINE_NO_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="12" fill="#f1f5f9"/>
      <path d="M26 86l20-24 14 16 12-14 22 22H26z" fill="#cbd5e1"/>
      <circle cx="44" cy="46" r="7" fill="#94a3b8"/>
      <text x="60" y="105" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" fill="#64748b">No Image</text>
    </svg>`
  );

export default function DriveImageWithFallback({
  src,
  driveId,
  alt,
  fallbackSrc = "/no-image.png",
  onError,
  ...imgProps
}) {
  const candidates = useMemo(() => {
    const list = buildDriveImageCandidates(src, driveId);
    if (fallbackSrc && !list.includes(fallbackSrc)) {
      list.push(fallbackSrc);
    }
    if (!list.length) list.push(INLINE_NO_IMAGE);
    return list;
  }, [src, driveId, fallbackSrc]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const currentSrc = candidates[index] || INLINE_NO_IMAGE;

  return (
    <img
      {...imgProps}
      src={currentSrc}
      alt={alt || "Image"}
      loading={imgProps.loading || "lazy"}
      decoding="async"
      referrerPolicy={imgProps.referrerPolicy || "no-referrer"}
      onError={(event) => {
        if (index < candidates.length - 1) {
          setIndex((prev) => prev + 1);
        } else if (event.currentTarget.src !== INLINE_NO_IMAGE) {
          event.currentTarget.src = INLINE_NO_IMAGE;
        }
        if (onError) onError(event);
      }}
    />
  );
}
