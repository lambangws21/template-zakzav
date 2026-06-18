"use client";

import { Info } from "lucide-react";

const STYLES = `
  /* ── Light mode ── */
  .ms-backdrop  { background: rgba(15,23,42,0.40); backdrop-filter: blur(6px); }
  .ms-card      { background: #eef2f7; box-shadow: 8px 8px 24px rgba(148,163,184,0.32), -8px -8px 24px rgba(255,255,255,0.90); border: 1px solid rgba(255,255,255,0.82); color: #0f172a; }
  .ms-pressed   { background: #e8ecf3; box-shadow: inset 2.5px 2.5px 6px rgba(148,163,184,0.32), inset -2.5px -2.5px 6px rgba(255,255,255,0.90); border: 1px solid rgba(255,255,255,0.64); }
  .ms-btn-ghost { background: transparent; color: #64748b; }
  .ms-btn-ghost:hover { color: #1e293b; }
  .ms-btn-secondary { background: #eef2f7; box-shadow: 2.5px 2.5px 6px rgba(148,163,184,0.32), -2.5px -2.5px 6px rgba(255,255,255,0.90); border: 1px solid rgba(255,255,255,0.60); color: #e11d48; }
  .ms-btn-secondary:hover { box-shadow: 1.5px 1.5px 4px rgba(148,163,184,0.26), -1.5px -1.5px 4px rgba(255,255,255,0.90); }
  .ms-icon-wrap { background: rgba(255,241,242,1); border: 1px solid rgba(254,205,211,0.70); }
  .ms-title     { color: #0f172a; }
  .ms-desc      { color: #475569; }
  .ms-hint-text { color: #64748b; }
  .ms-divider   { border-color: rgba(203,213,225,0.40); }

  /* ── Dark mode ── */
  [data-theme="dark"] .ms-backdrop  { background: rgba(0,5,18,0.72); backdrop-filter: blur(8px); }
  [data-theme="dark"] .ms-card      { background: rgba(13,19,38,0.96); box-shadow: 0 24px 64px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.10); color: #e2e8f0; }
  [data-theme="dark"] .ms-pressed   { background: rgba(7,11,24,0.80); box-shadow: inset 2px 2px 6px rgba(0,0,0,0.55), inset -1px -1px 4px rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); }
  [data-theme="dark"] .ms-btn-ghost { background: transparent; color: #475569; }
  [data-theme="dark"] .ms-btn-ghost:hover { color: #94a3b8; }
  [data-theme="dark"] .ms-btn-secondary { background: rgba(255,255,255,0.06); box-shadow: none; border: 1px solid rgba(255,255,255,0.12); color: #fb7185; }
  [data-theme="dark"] .ms-btn-secondary:hover { background: rgba(255,255,255,0.10); }
  [data-theme="dark"] .ms-icon-wrap { background: rgba(220,38,38,0.14); border: 1px solid rgba(239,68,68,0.28); }
  [data-theme="dark"] .ms-title     { color: #f1f5f9; }
  [data-theme="dark"] .ms-desc      { color: #94a3b8; }
  [data-theme="dark"] .ms-hint-text { color: #475569; }
  [data-theme="dark"] .ms-divider   { border-color: rgba(255,255,255,0.08); }
`;

const ImplantIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 2h6l.8 2.5H4.2L5 2z"/>
    <rect x="3.5" y="4.5" width="9" height="1.5" rx="0.6"/>
    <path d="M5 6 L4.5 14 M11 6 L11.5 14"/>
    <path d="M5 9.5 Q8 8.5 11 9.5"/>
  </svg>
);

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
      className="ms-backdrop fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onExit?.(); }}
    >
      <style>{STYLES}</style>

      <div className="ms-card w-full max-w-[440px] overflow-hidden rounded-[28px] p-0">

        {/* ── Top accent bar ── */}
        <div className="h-1 w-full" style={{
          background: "linear-gradient(90deg, #0ea5e9, #14b8a6, #6366f1)",
        }} />

        <div className="p-6 sm:p-7">

          {/* ── Icon + Title ── */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="ms-icon-wrap flex h-11 w-11 items-center justify-center rounded-2xl">
              <Info className="h-5 w-5 text-rose-500" />
            </div>

            <div>
              <h2 className="ms-title text-base font-black tracking-tight leading-tight md:text-lg">
                {title}
              </h2>
            </div>

            <p className="ms-desc text-[12px] leading-relaxed font-medium md:text-[13px] max-w-[340px]">
              {description}
            </p>
          </div>

          {/* ── Quick step hint ── */}
          <div className="ms-pressed mt-5 rounded-2xl px-4 py-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              </div>
              <p className="ms-hint-text text-[11px] leading-relaxed font-semibold md:text-xs">
                {quickStep}
              </p>
            </div>
          </div>

          {/* ── Mulai Templating ── */}
          {onStartTemplating && (
            <button
              type="button"
              onClick={onStartTemplating}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 text-[11px] font-black tracking-widest text-white uppercase transition-all hover:brightness-110 active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, #0891b2 0%, #0d9488 100%)",
                boxShadow: "0 4px 18px rgba(13,148,136,0.35)",
              }}
            >
              <ImplantIcon />
              Mulai Templating
            </button>
          )}

          {/* ── Footer buttons ── */}
          <div className="ms-divider mt-4 flex items-center justify-center gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onExit}
              className="ms-btn-ghost rounded-full px-5 py-2.5 text-xs font-black transition-colors"
            >
              {exitLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="ms-btn-secondary flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-black transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {confirmLabel}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
