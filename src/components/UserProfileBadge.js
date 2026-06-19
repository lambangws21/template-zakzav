"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Shield, ChevronDown, BarChart2 } from "lucide-react";
import { logOut } from "@/lib/authServices";
import { useAuth } from "@/context/AuthContext";

// ─── Konfirmasi logout (reuse dari LogoutButton) ───────────────────────────────

function ConfirmLogout({ user, onConfirm, onCancel }) {
  const initial = user?.email?.[0]?.toUpperCase() || "?";
  const email   = user?.email || "—";
  const name    = user?.displayName || email.split("@")[0];

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCancel}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-6"
        style={{ background: "rgba(4,6,18,0.80)", backdropFilter: "blur(10px)" }}
      >
        <motion.div
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

            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
              <LogOut className="h-10 w-10" style={{ color: "#d94f4f", strokeWidth: 1.4 }} />
            </div>

            <p className="mt-1 text-[22px] font-black leading-tight text-white">Keluar dari akun?</p>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#6b7d9e" }}>
              Sesi kerja Anda akan berakhir. Anda perlu login kembali untuk mengakses workspace Anda.
            </p>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onCancel}
                className="flex-1 rounded-2xl py-3 text-[13px] font-black text-white transition hover:brightness-110 active:scale-95"
                style={{ background: "#0d1526" }}>
                Batal
              </button>
              <button type="button" onClick={onConfirm}
                className="flex-1 rounded-2xl py-3 text-[13px] font-black text-white transition hover:brightness-110 active:scale-95"
                style={{ background: "#c0392b", boxShadow: "0 4px 16px rgba(192,57,43,0.4)" }}>
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

// ─── Dropdown menu ────────────────────────────────────────────────────────────

function ProfileDropdown({ user, anchorRef, onClose, onLogout, onAnalytics }) {
  const email   = user?.email || "—";
  const name    = user?.displayName || email.split("@")[0];
  const initial = email[0]?.toUpperCase() || "?";

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ type: "spring", damping: 22, stiffness: 350 }}
        className="fixed z-[9990] overflow-hidden rounded-2xl shadow-2xl"
        style={{
          top: (anchorRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
          right: window.innerWidth - (anchorRef.current?.getBoundingClientRect().right ?? 0),
          minWidth: 220,
          background: "var(--soft-raised-bg)",
          border: "1px solid var(--soft-border)",
        }}
      >
        {/* Profile header */}
        <div className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: "var(--soft-border)" }}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-black text-white shadow">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black" style={{ color: "var(--soft-text-hi)" }}>{name}</p>
            <p className="truncate text-[9px] opacity-50" style={{ color: "var(--soft-text)" }}>{email}</p>
          </div>
        </div>

        {/* Status */}
        <div className="border-b px-4 py-2.5" style={{ borderColor: "var(--soft-border)" }}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-[9px] font-black" style={{ color: "var(--soft-text)" }}>Sesi aktif</span>
            <Shield className="ml-auto h-3 w-3 text-sky-400" />
          </div>
        </div>

        {/* Actions */}
        <div className="p-2 space-y-0.5">
          {onAnalytics && (
            <button
              type="button"
              onClick={() => { onAnalytics(); onClose(); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] font-black transition hover:bg-violet-500/10"
              style={{ color: "var(--soft-text-hi)" }}
            >
              <BarChart2 className="h-3.5 w-3.5 shrink-0 text-violet-500" />
              Analitik Kasus
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] font-black text-rose-400 transition hover:bg-rose-500/10"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Keluar dari akun
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserProfileBadge({ className = "", onAnalytics }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef(null);

  const email   = user?.email || "";
  const initial = email[0]?.toUpperCase() || "?";
  const name    = user?.displayName || email.split("@")[0] || "User";

  const handleLogoutClick = () => {
    setOpen(false);
    setConfirming(true);
  };

  const handleConfirm = () => {
    setConfirming(false);
    logOut();
  };

  if (!user) return null;

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full p-1 transition active:scale-95 ${className}`}
        style={{ background: "transparent", border: "none" }}
      >
        {/* Avatar — selalu tampil di semua ukuran */}
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-md"
          style={{ background: "linear-gradient(135deg, #38bdf8, #4f46e5)", minWidth: "2rem" }}
        >
          {initial}
        </span>

        {/* Nama + chevron — hanya desktop */}
        <span className="hidden sm:block max-w-[80px] truncate text-[9px] font-black" style={{ color: "var(--soft-text)" }}>
          {name}
        </span>
        <ChevronDown
          className={`hidden sm:block h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--soft-text)", opacity: 0.5 }}
        />
      </button>

      {open && (
        <ProfileDropdown
          user={user}
          anchorRef={ref}
          onClose={() => setOpen(false)}
          onLogout={handleLogoutClick}
          onAnalytics={onAnalytics}
        />
      )}

      {confirming && (
        <ConfirmLogout
          user={user}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
