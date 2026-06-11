"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X } from "lucide-react";

const TYPE_CARD = {
  info:    "border-cyan-100/80    bg-cyan-50/80    text-cyan-800",
  warning: "border-amber-100/80   bg-amber-50/80   text-amber-800",
  success: "border-emerald-100/80 bg-emerald-50/80 text-emerald-800",
  hint:    "border-violet-100/80  bg-violet-50/80  text-violet-800",
};

const TYPE_ICON = {
  info:    "text-cyan-500",
  warning: "text-amber-500",
  success: "text-emerald-500",
  hint:    "text-violet-500",
};

const TYPE_BTN = {
  info:    "bg-cyan-600    hover:bg-cyan-500",
  warning: "bg-amber-600   hover:bg-amber-500",
  success: "bg-emerald-600 hover:bg-emerald-500",
  hint:    "bg-violet-600  hover:bg-violet-500",
};

export default function SmartHintBanner({ hint, className = "" }) {
  const [dismissedKey, setDismissedKey] = useState(null);

  // Auto-reset dismiss when hint key changes
  useEffect(() => {
    setDismissedKey(null);
  }, [hint?.key]);

  const visible = hint && hint.key !== dismissedKey;

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={hint.key}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          className={`flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[2px_2px_8px_rgba(148,163,184,0.18)] backdrop-blur-sm ${
            TYPE_CARD[hint.type] || TYPE_CARD.info
          } ${className}`}
        >
          <Lightbulb
            className={`h-3.5 w-3.5 shrink-0 ${TYPE_ICON[hint.type] || TYPE_ICON.info}`}
          />
          <p className="flex-1 text-[10px] font-bold leading-snug">
            {hint.text}
          </p>
          {hint.actionLabel && hint.onAction && (
            <button
              type="button"
              onClick={hint.onAction}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[9px] font-black text-white transition active:scale-95 ${
                TYPE_BTN[hint.type] || TYPE_BTN.info
              }`}
            >
              {hint.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissedKey(hint.key)}
            className="shrink-0 opacity-40 transition hover:opacity-80 active:scale-95"
            title="Tutup"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
