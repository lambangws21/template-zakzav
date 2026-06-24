// Shared utilities and constants for workspace UI components

export const BUTTON_HOVER = { scale: 1.03, y: -1 };
export const BUTTON_TAP = { scale: 0.97 };
export const KNOB_START_DEG = 135;
export const KNOB_SWEEP_DEG = 270;
export const MOBILE_PANEL_PREVIEW_EVENT = "xray-mobile-panel-preview";

let mobilePanelPreviewTimeoutId = null;

export function triggerMobileHaptic(pattern = 8) {
  if (typeof window === "undefined") return;
  const navigatorRef = window.navigator;
  const supportsCoarsePointer =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : false;

  if (!supportsCoarsePointer) return;
  if (!navigatorRef || typeof navigatorRef.vibrate !== "function") return;

  navigatorRef.vibrate(pattern);
}

export function setMobilePanelPreview(active, durationMs = 0) {
  if (typeof window === "undefined") return;

  if (mobilePanelPreviewTimeoutId !== null) {
    window.clearTimeout(mobilePanelPreviewTimeoutId);
    mobilePanelPreviewTimeoutId = null;
  }

  window.dispatchEvent(
    new CustomEvent(MOBILE_PANEL_PREVIEW_EVENT, {
      detail: { active },
    }),
  );

  if (active && durationMs > 0) {
    mobilePanelPreviewTimeoutId = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(MOBILE_PANEL_PREVIEW_EVENT, {
          detail: { active: false },
        }),
      );
      mobilePanelPreviewTimeoutId = null;
    }, durationMs);
  }
}
