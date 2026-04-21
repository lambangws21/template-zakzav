"use client";

import { useEffect, useMemo, useState } from "react";
import DriveImageWithFallback from "./DriveImageWithFallback";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function PhotoPreviewModal({
  open = false,
  title = "Photo Preview",
  items = [],
  initialIndex = 0,
  onClose,
}) {
  const safeItems = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter(
            (item) => item && typeof item.imageSrc === "string" && item.imageSrc.trim(),
          )
        : [],
    [items],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (safeItems.length === 0) {
      setIndex(0);
      return;
    }
    setIndex(clamp(initialIndex, 0, safeItems.length - 1));
  }, [open, initialIndex, safeItems.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key === "ArrowRight") {
        setIndex((prev) => (prev + 1) % Math.max(safeItems.length, 1));
        return;
      }
      if (event.key === "ArrowLeft") {
        setIndex((prev) => (prev - 1 + Math.max(safeItems.length, 1)) % Math.max(safeItems.length, 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, safeItems.length]);

  if (!open) return null;

  const current = safeItems[index] || null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-[1px] sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{title}</div>
            <div className="text-[11px] text-slate-400">
              {safeItems.length > 0 ? `${index + 1} / ${safeItems.length}` : "0 / 0"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
          >
            Tutup
          </button>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_260px]">
          <div className="relative flex min-h-[320px] items-center justify-center bg-slate-950 p-4 sm:min-h-[420px]">
            {current ? (
              <>
                <DriveImageWithFallback
                  src={current.imageSrc}
                  driveId={current.driveId}
                  alt={current.name || "preview"}
                  className="max-h-[62vh] w-auto max-w-full rounded-lg object-contain"
                  loading="eager"
                />
                {safeItems.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setIndex((prev) => (prev - 1 + safeItems.length) % safeItems.length)
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 px-2.5 py-1.5 text-lg text-slate-100"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndex((prev) => (prev + 1) % safeItems.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 px-2.5 py-1.5 text-lg text-slate-100"
                    >
                      ›
                    </button>
                  </>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-slate-400">Tidak ada gambar untuk dipreview.</div>
            )}
          </div>

          <aside className="border-t border-slate-700 bg-slate-900 p-3 lg:border-l lg:border-t-0">
            {current ? (
              <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950 p-2">
                <div className="truncate text-xs font-semibold text-slate-100">
                  {current.name || "Untitled"}
                </div>
                {current.meta ? (
                  <div className="mt-1 text-[11px] text-slate-400">{current.meta}</div>
                ) : null}
              </div>
            ) : null}

            <div className="grid max-h-[260px] grid-cols-3 gap-2 overflow-auto pr-1 lg:max-h-[420px]">
              {safeItems.map((item, itemIndex) => {
                const active = itemIndex === index;
                return (
                  <button
                    key={`${item.id || item.name || itemIndex}-${itemIndex}`}
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    className={`overflow-hidden rounded-lg border ${active ? "border-cyan-400 ring-2 ring-cyan-400/40" : "border-slate-700"}`}
                  >
                    <DriveImageWithFallback
                      src={item.imageSrc}
                      driveId={item.driveId}
                      alt={item.name || "thumb"}
                      className="h-16 w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
