"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SOFT_RAISED_CLASS, SOFT_SURFACE_CLASS } from "@/lib/uiTokens";

export default function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-slate-500 ${SOFT_RAISED_CLASS}`}
        aria-label="Info"
      >
        !
      </button>
      <AnimatePresence>
        {open ? (
          <motion.span
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`pointer-events-none absolute top-[120%] left-1/2 z-30 w-56 -translate-x-1/2 px-3 py-2 text-[11px] leading-snug text-slate-600 ${SOFT_SURFACE_CLASS}`}
          >
            {text}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
