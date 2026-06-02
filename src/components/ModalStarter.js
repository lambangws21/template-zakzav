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

      <div className="w-full max-w-[580px] rounded-[32px] p-7 text-slate-900 starter-neu-card">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-50 text-rose-500 shadow-sm">
              <Info className="h-4 w-4" />
            </div>
            <h2 className="text-base font-black tracking-tight text-slate-900 md:text-lg">
              {title}
            </h2>
          </div>
          <p className="text-xs leading-relaxed font-semibold text-slate-600 md:text-sm">
            {description}
          </p>
        </div>

        <div className="mt-5 rounded-xl px-4 py-3.5 starter-neu-pressed">
          <p className="text-[11px] leading-relaxed font-bold tracking-wide text-slate-500 md:text-xs">
            {quickStep}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3 pt-1">
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
