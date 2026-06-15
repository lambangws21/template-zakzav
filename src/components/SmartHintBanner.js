"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const TYPE_CARD = {
  light: {
    info:    "border-cyan-200/70    bg-cyan-50/90    text-cyan-900",
    warning: "border-amber-200/70   bg-amber-50/90   text-amber-900",
    success: "border-emerald-200/70 bg-emerald-50/90 text-emerald-900",
    hint:    "border-violet-200/70  bg-violet-50/90  text-violet-900",
  },
  dark: {
    info:    "border-cyan-500/30    bg-cyan-400/[0.12]    text-cyan-200",
    warning: "border-amber-500/30   bg-amber-400/[0.12]   text-amber-200",
    success: "border-emerald-500/30 bg-emerald-400/[0.12] text-emerald-200",
    hint:    "border-violet-500/30  bg-violet-400/[0.12]  text-violet-200",
  },
};

const TYPE_ICON = {
  light: {
    info:    "text-cyan-500",
    warning: "text-amber-500",
    success: "text-emerald-500",
    hint:    "text-violet-500",
  },
  dark: {
    info:    "text-cyan-400",
    warning: "text-amber-400",
    success: "text-emerald-400",
    hint:    "text-violet-400",
  },
};

const TYPE_BTN = {
  info:    "bg-cyan-600    hover:bg-cyan-500",
  warning: "bg-amber-600   hover:bg-amber-500",
  success: "bg-emerald-600 hover:bg-emerald-500",
  hint:    "bg-violet-600  hover:bg-violet-500",
};

export default function SmartHintBanner({ hint, className = "" }) {
  const [dismissedKey, setDismissedKey] = useState(null);
  const { isDark } = useTheme();

  useEffect(() => {
    setDismissedKey(null);
  }, [hint?.key]);

  const visible = hint && hint.key !== dismissedKey;
  const mode    = isDark ? "dark" : "light";
  const cardCls = TYPE_CARD[mode][hint?.type] || TYPE_CARD[mode].info;
  const iconCls = TYPE_ICON[mode][hint?.type] || TYPE_ICON[mode].info;

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={hint.key}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.18)] backdrop-blur-sm ${cardCls} ${className}`}
        >
          <Lightbulb className={`h-4 w-4 shrink-0 ${iconCls}`} />
          <p className="flex-1 text-[10.5px] font-semibold leading-snug">
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
            className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition active:scale-95 ${
              isDark
                ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                : "bg-black/8  text-black/50 hover:bg-black/15 hover:text-black/80"
            }`}
            title="Tutup"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
