"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { logOut } from "@/lib/authServices";
import { useTheme } from "@/hooks/useTheme";

export default function LogoutButton({ collapsed = false, variant = "sidebar" }) {
  const { isDark } = useTheme();
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    setConfirming(false);
    logOut();
  };

  if (variant === "header") {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          title="Logout"
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-500/[0.08] text-rose-400 transition hover:bg-rose-500/15 hover:text-rose-300 active:scale-95"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>

        <AnimatePresence>
          {confirming && (
            <ConfirmDialog
              isDark={isDark}
              onConfirm={handleConfirm}
              onCancel={() => setConfirming(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // sidebar variant
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {!collapsed && (
          <span style={{
            flex: 1, fontSize: 10,
            color: isDark ? "#64748b" : "#94a3b8",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
          }}>
            {typeof window !== "undefined" ? "" : ""}
          </span>
        )}
        <button
          onClick={() => setConfirming(true)}
          title="Logout"
          style={{
            all: "unset", cursor: "pointer", flexShrink: 0,
            width: 28, height: 28, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#f87171",
            background: isDark ? "rgba(248,113,113,0.08)" : "rgba(239,68,68,0.06)",
            border: `1px solid ${isDark ? "rgba(248,113,113,0.18)" : "rgba(239,68,68,0.14)"}`,
            transition: "all 0.15s",
          }}
        >
          <LogOut size={13} />
        </button>
      </div>

      <AnimatePresence>
        {confirming && (
          <ConfirmDialog
            isDark={isDark}
            onConfirm={handleConfirm}
            onCancel={() => setConfirming(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ConfirmDialog({ isDark, onConfirm, onCancel }) {
  const bg      = isDark ? "#1a2438" : "#f1f5f9";
  const border  = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.75)";
  const shadow  = isDark
    ? "0 16px 48px rgba(0,5,20,0.70), 0 2px 8px rgba(0,5,20,0.40)"
    : "0 16px 48px rgba(148,163,184,0.32), 0 2px 8px rgba(148,163,184,0.18)";
  const text    = isDark ? "#c8d5e8" : "#334155";
  const subtext = isDark ? "#64748b" : "#94a3b8";

  return (
    <motion.div
      key="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: isDark ? "rgba(0,5,20,0.55)" : "rgba(15,23,42,0.35)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <motion.div
        key="dialog"
        initial={{ opacity: 0, scale: 0.93, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 10 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 320, borderRadius: 24, padding: "1.5rem",
          background: bg, border: `1px solid ${border}`, boxShadow: shadow,
        }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 14, marginBottom: "1rem",
          background: isDark ? "rgba(248,113,113,0.12)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${isDark ? "rgba(248,113,113,0.22)" : "rgba(239,68,68,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <LogOut size={18} color="#f87171" />
        </div>

        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: text, marginBottom: "0.35rem" }}>
          Keluar dari akun?
        </p>
        <p style={{ fontSize: "0.75rem", color: subtext, marginBottom: "1.25rem", lineHeight: 1.5 }}>
          Sesi kamu akan diakhiri dan kamu perlu login kembali untuk mengakses workspace.
        </p>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, borderRadius: 12, padding: "0.6rem",
              fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              color: subtext, background: "transparent",
              border: `1px solid ${border}`, transition: "all 0.15s",
            }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, borderRadius: 12, padding: "0.6rem",
              fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
              color: "#fff", background: "#ef4444",
              border: "1px solid rgba(239,68,68,0.4)",
              boxShadow: "0 2px 8px rgba(239,68,68,0.28)",
              transition: "all 0.15s",
            }}
          >
            Ya, Logout
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
