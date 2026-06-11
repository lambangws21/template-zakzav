"use client";

import { Info } from "lucide-react";

const MODAL_STARTER_STYLES = `
  .starter-neu-card {
    background: #eef2f7;
    box-shadow: 6px 6px 18px rgba(148, 163, 184, 0.34), -6px -6px 18px rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.78);
  }
  .starter-neu-pressed {
    background: #edf1f6;
    box-shadow: inset 2px 2px 5px rgba(148, 163, 184, 0.34), inset -2px -2px 5px rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.62);
  }
  .starter-neu-button {
    background: #eef2f7;
    box-shadow: 2.5px 2.5px 6px rgba(148, 163, 184, 0.34), -2.5px -2.5px 6px rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.58);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .starter-neu-button:hover {
    box-shadow: 1.5px 1.5px 4px rgba(148, 163, 184, 0.3), -1.5px -1.5px 4px rgba(255, 255, 255, 0.9);
    transform: translateY(0.5px);
  }
  .starter-neu-button:active {
    box-shadow: inset 1.5px 1.5px 4px rgba(148, 163, 184, 0.32), inset -1.5px -1.5px 4px rgba(255, 255, 255, 0.9);
    transform: translateY(1px);
  }
`;

export default function ModalStarter({
  open = false,
  title = "Kalibrasi Wajib Sebelum Ukur",
  description = "Untuk hasil ukuran akurat, tarik garis kalibrasi pada ruler X-ray (contoh 13 cm), lalu isi nilai aktual dan simpan kalibrasi sebelum melakukan measurement.",
  quickStep = "Langkah cepat: Upload gambar, tarik garis di ruler, simpan kalibrasi, lalu mulai ukur.",
  exitLabel = "Keluar",
  confirmLabel = "Saya Mengerti",
  onExit,
  onConfirm,
  onStartTemplating,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-[4px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onExit?.();
        }
      }}
    >
      <style>{MODAL_STARTER_STYLES}</style>

      <div className="w-full max-w-[480px] rounded-[32px] p-7 text-slate-900 text-center starter-neu-card">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-rose-500 shadow-sm">
            <Info className="h-5 w-5" />
          </div>
          <h2 className="text-base font-black tracking-tight text-slate-900 md:text-lg">
            {title}
          </h2>
          <p className="text-xs leading-relaxed font-semibold text-slate-500 md:text-sm">
            {description}
          </p>
        </div>

        <div className="mt-5 rounded-xl px-4 py-3.5 starter-neu-pressed">
          <p className="text-[11px] leading-relaxed font-bold tracking-wide text-slate-500 md:text-xs">
            {quickStep}
          </p>
        </div>

        {onStartTemplating && (
          <button
            type="button"
            onClick={onStartTemplating}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-700 py-3 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-all hover:from-cyan-500 hover:to-cyan-600 active:scale-[0.99]"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 2h6l.8 2.5H4.2L5 2z"/>
              <rect x="3.5" y="4.5" width="9" height="1.5" rx="0.6"/>
              <path d="M5 6 L4.5 14 M11 6 L11.5 14"/>
              <path d="M5 9.5 Q8 8.5 11 9.5"/>
            </svg>
            Mulai Templating
          </button>
        )}

        <div className="mt-4 flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onExit}
            className="rounded-full px-5 py-2.5 text-xs font-black text-slate-500 transition-colors duration-200 hover:text-slate-800"
          >
            {exitLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-black text-rose-600 starter-neu-button hover:scale-[1.01] active:scale-[0.99]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
