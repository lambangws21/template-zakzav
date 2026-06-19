"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { logOut } from "@/lib/authServices";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";

// ─── Konfirmasi Dialog (portal) ────────────────────────────────────────────────

function ConfirmDialog({ user, onConfirm, onCancel }) {
  const initial = user?.email?.[0]?.toUpperCase() || "?";
  const email   = user?.email || "—";
  const name    = user?.displayName || email.split("@")[0];

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCancel}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-6"
        style={{ background: "rgba(4,6,18,0.80)", backdropFilter: "blur(10px)" }}
      >
        <motion.div
          key="dialog"
          initial={{ opacity: 0, scale: 0.86, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.86, y: 24 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[300px]"
        >
          {/* Avatar floating above card */}
          <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2">
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-[26px] font-black text-white shadow-2xl"
              style={{
                background: "radial-gradient(circle at 35% 35%, #e05555, #a31515)",
                boxShadow: "0 0 0 4px #1a2440, 0 8px 24px rgba(180,20,20,0.5)",
              }}
            >
              {initial}
            </div>
          </div>

          {/* Card */}
          <div
            className="overflow-hidden rounded-[28px] px-6 pb-6 pt-12 text-center"
            style={{ background: "#1a2440", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-[15px] font-black text-white">{name}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{email}</p>

            <div className="my-4 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

            {/* Logout icon */}
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
              <LogOut className="h-10 w-10" style={{ color: "#d94f4f", strokeWidth: 1.4 }} />
            </div>

            <p className="text-[11px] font-medium" style={{ color: "#8899bb" }}>Konfirmasi Keluar</p>
            <p className="mt-1 text-[22px] font-black leading-tight text-white">Keluar dari akun?</p>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#6b7d9e" }}>
              Sesi kerja Anda akan berakhir. Anda perlu login kembali untuk mengakses workspace Anda.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-2xl py-3 text-[13px] font-black text-white transition hover:brightness-110 active:scale-95"
                style={{ background: "#0d1526" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-2xl py-3 text-[13px] font-black text-white transition hover:brightness-110 active:scale-95"
                style={{ background: "#c0392b", boxShadow: "0 4px 16px rgba(192,57,43,0.4)" }}
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── LogoutButton ─────────────────────────────────────────────────────────────

export default function LogoutButton({ collapsed = false, variant = "sidebar" }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    setConfirming(false);
    logOut();
  };

  // ── header variant ───────────────────────────────────────────────────────────
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
        {confirming && <ConfirmDialog user={user} onConfirm={handleConfirm} onCancel={() => setConfirming(false)} />}
      </>
    );
  }

  // ── compact variant ──────────────────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          title="Logout"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-400 transition active:scale-95 hover:bg-rose-500/20"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
        {confirming && <ConfirmDialog user={user} onConfirm={handleConfirm} onCancel={() => setConfirming(false)} />}
      </>
    );
  }

  // ── sidebar variant ──────────────────────────────────────────────────────────
  const email   = user?.email || "";
  const initial = email[0]?.toUpperCase() || "?";
  const name    = user?.displayName || email.split("@")[0] || "User";

  return (
    <>
      <div className="flex items-center gap-2 min-w-0">
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[9px] font-black text-white">
              {initial}
            </div>
            <span className="min-w-0 flex-1 truncate text-[9px] font-bold"
              style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              {name}
            </span>
          </div>
        )}
        <button
          type="button"
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
      {confirming && <ConfirmDialog user={user} onConfirm={handleConfirm} onCancel={() => setConfirming(false)} />}
    </>
  );
}
