// Shared neumorphic soft-UI design tokens
// Background & shadow pakai CSS custom properties → otomatis dark mode responsive
// Definisi CSS vars-nya ada di app.css (:root = light, [data-theme="dark"] = dark)

export const SOFT_SURFACE_CLASS =
  "rounded-[24px] border border-[var(--soft-border)] [background:var(--soft-surface-bg)] shadow-[var(--soft-shadow-surface)]";

export const SOFT_RAISED_CLASS =
  "rounded-[18px] border border-[var(--soft-border)] [background:var(--soft-raised-bg)] shadow-[var(--soft-shadow-raised)]";

export const SOFT_PRESSED_CLASS =
  "rounded-[18px] border border-[var(--soft-border)] [background:var(--soft-pressed-bg)] shadow-[var(--soft-shadow-pressed)]";

export const SOFT_INSET_CLASS =
  "rounded-[18px] border border-[var(--soft-border)] [background:var(--soft-inset-bg)] shadow-[var(--soft-shadow-inset)]";

export const SOFT_INPUT_CLASS = `${SOFT_INSET_CLASS} px-3 py-2 text-xs text-[var(--soft-text)] outline-none`;

export const SOFT_SELECT_CLASS = `${SOFT_RAISED_CLASS} px-3 py-2 text-xs text-[var(--soft-text)] outline-none`;

export const SOFT_TEXT_BUTTON_CLASS = `${SOFT_RAISED_CLASS} px-3 py-2 text-xs font-medium text-[var(--soft-text)] transition hover:text-[var(--soft-text-hi)]`;

export const SOFT_DANGER_BUTTON_CLASS = `${SOFT_RAISED_CLASS} px-3 py-2 text-xs font-medium text-rose-500 transition hover:text-rose-400`;

export const SOFT_PRIMARY_BUTTON_CLASS =
  "rounded-[18px] border border-[var(--soft-primary-border)] [background:var(--soft-primary-bg)] px-3 py-2 text-xs font-medium text-slate-800 shadow-[var(--soft-shadow-primary)] transition hover:text-slate-900";

export const SOFT_DARK_BUTTON_CLASS =
  "rounded-[18px] border border-[#2a3246] bg-[linear-gradient(180deg,#30394f_0%,#1f2636_100%)] px-3 py-2 text-xs font-medium text-white shadow-[8px_8px_18px_rgba(15,23,42,0.26),-2px_-2px_8px_rgba(255,255,255,0.08)] transition";

export const SOFT_PANEL_CLASS = `${SOFT_SURFACE_CLASS} p-3`;

export const SOFT_CARD_CLASS = `${SOFT_SURFACE_CLASS} p-2.5`;

export const SOFT_SECTION_CLASS = `${SOFT_SURFACE_CLASS} flex flex-col gap-2 p-2.5`;

export const SOFT_TINT_CARD_CLASS = `${SOFT_SURFACE_CLASS}`;

export const SOFT_FLOAT_SURFACE_CLASS =
  "rounded-[24px] border border-[var(--soft-float-border)] [background:var(--soft-float-bg)] shadow-[var(--soft-shadow-float)] backdrop-blur";

// Reusable Framer Motion variants untuk panel/modal
export const PANEL_VARIANTS = {
  hidden:  { opacity: 0, y: 8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12, ease: "easeIn" } },
};

export const MODAL_VARIANTS = {
  hidden:  { opacity: 0, scale: 0.95, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.15, ease: "easeIn" } },
};

export const OVERLAY_VARIANTS = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.12 } },
};

export const SLIDE_RIGHT_VARIANTS = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, x: -8, transition: { duration: 0.12, ease: "easeIn" } },
};

export const SLIDE_UP_VARIANTS = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: 10, transition: { duration: 0.12, ease: "easeIn" } },
};
