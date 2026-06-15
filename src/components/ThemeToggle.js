"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle({ className = "" }) {
  const { isDark, toggle } = useTheme();

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
      className={`relative flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-200 ${
        isDark
          ? "border-sky-500/30 bg-[linear-gradient(135deg,#0f172a,#1e3a5f)]"
          : "border-white/80 bg-[linear-gradient(135deg,#f0f9ff,#e0f2fe)]"
      } ${className}`}
      style={{ minWidth: 52 }}
    >
      {/* Track */}
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`relative flex h-6 w-6 items-center justify-center rounded-full shadow-md ${
          isDark
            ? "ml-auto bg-[linear-gradient(135deg,#0ea5e9,#6366f1)]"
            : "mr-auto bg-white"
        }`}
      >
        {isDark ? (
          /* Moon */
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        ) : (
          /* Sun */
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2" x2="12" y2="4"/>
            <line x1="12" y1="20" x2="12" y2="22"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="2" y1="12" x2="4" y2="12"/>
            <line x1="20" y1="12" x2="22" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        )}
      </motion.span>
    </motion.button>
  );
}
