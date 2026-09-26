"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LockKeyhole, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

export default function CaseAccessGate({ isOpen, onClose, children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUnlocked(false);
    setCode("");
    setError("");
    if (!isOpen) return;
    setChecking(true);
    authenticatedFetch("/api/case-access", { cache: "no-store" })
      .then((response) => { if (!cancelled) setUnlocked(response.ok); })
      .catch(() => { if (!cancelled) setError("Sesi belum dapat diverifikasi."); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  async function unlock(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/case-access", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Akses ditolak.");
      setCode("");
      setUnlocked(true);
    } catch (error) {
      setError(error.message);
    } finally { setBusy(false); }
  }

  if (!isOpen || typeof document === "undefined") return null;
  if (unlocked) return children;
  return createPortal(
    <div className="fixed inset-0 z-[99999] grid place-items-center bg-black/60 p-4">
      <form onSubmit={unlock} role="dialog" aria-modal="true" aria-label="Akses Kasusku" className="w-full max-w-[300px] rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-zinc-100">
        <div className="mb-4 flex items-center gap-2"><LockKeyhole size={18} /><h2 className="flex-1 text-sm font-semibold">Kasusku</h2><button type="button" onClick={onClose} aria-label="Tutup akses Kasusku" className="grid h-9 w-9 place-items-center rounded hover:bg-zinc-800"><X size={18} /></button></div>
        {checking ? <p role="status" className="text-xs text-zinc-400">Memeriksa akses...</p> : <>
          <label className="block text-xs text-zinc-400">Kode akses<input autoFocus type="password" inputMode="numeric" autoComplete="off" value={code} maxLength={32} onChange={(event) => setCode(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-zinc-600 bg-zinc-950 px-3 text-base text-white outline-none focus:border-cyan-500" /></label>
          {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
          <button type="submit" disabled={busy || !code} className="mt-4 h-10 w-full rounded-md bg-cyan-700 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Memeriksa..." : "Masuk"}</button>
        </>}
      </form>
    </div>, document.body,
  );
}
