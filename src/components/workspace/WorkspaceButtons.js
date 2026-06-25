"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Bone, ChartSpline, CircleDot, DraftingCompass, HandGrab, LensConcave, Maximize2,
  MessageSquare, Paintbrush, PencilLine, Redo2, RulerDimensionLine,
  Slice, SplinePointer, Target, Undo2, ZoomIn, ZoomOut,
} from "lucide-react";
import {
  SOFT_RAISED_CLASS,
  SOFT_PRESSED_CLASS,
  SOFT_SURFACE_CLASS,
  SOFT_INSET_CLASS,
} from "@/lib/uiTokens";
import {
  BUTTON_HOVER,
  BUTTON_TAP,
  KNOB_START_DEG,
  KNOB_SWEEP_DEG,
  triggerMobileHaptic,
  setMobilePanelPreview,
} from "../../lib/xray/workspaceUtils";
import Icon from "./Icon";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getSoftToneClass(tone = "slate", active = false) {
  const toneClass =
    tone === "emerald"
      ? active
        ? "text-emerald-700"
        : "text-emerald-600 hover:text-emerald-700"
      : tone === "rose"
        ? active
          ? "text-rose-700"
          : "text-rose-600 hover:text-rose-700"
        : tone === "amber"
          ? active
            ? "text-amber-700"
            : "text-amber-600 hover:text-amber-700"
          : active
            ? "text-slate-800"
            : "text-slate-500 hover:text-slate-700";

  return `${active ? SOFT_PRESSED_CLASS : SOFT_RAISED_CLASS} ${toneClass}`;
}

export function IconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  tone = "slate",
  className = "",
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={() => {
        if (!disabled) triggerMobileHaptic();
      }}
      aria-label={label}
      title={label}
      disabled={disabled}
      whileHover={disabled ? undefined : BUTTON_HOVER}
      whileTap={disabled ? undefined : BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-10 w-10 items-center justify-center transition sm:h-9 sm:w-9 ${getSoftToneClass(
        tone,
        active,
      )} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      <Icon name={icon} className="h-[18px] w-[18px]" />
    </motion.button>
  );
}

export function LayerToolbarActionButton({
  icon,
  label,
  onClick,
  active = false,
  className = "",
  iconClassName = "h-4 w-4",
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={() => triggerMobileHaptic()}
      aria-label={label}
      title={label}
      whileHover={BUTTON_HOVER}
      whileTap={BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-8 w-8 items-center justify-center transition ${getSoftToneClass(
        "slate",
        active,
      )} ${className}`}
    >
    <Icon name={icon} className={iconClassName} />
  </motion.button>
  );
}

const TOOL_ICON_COMPONENTS = {
  draw: PencilLine,
  freeLine: SplinePointer,
  pan: HandGrab,
  cut: Slice,
  brush: Paintbrush,
  centerFinder: Target,
  axisBuilder: Bone,
  guideBuilder: RulerDimensionLine,
  annotation: MessageSquare,
  angle: DraftingCompass,
  circle: CircleDot,
  hka: ChartSpline,
  dorr: LensConcave,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  fit: Maximize2,
  undo: Undo2,
  redo: Redo2,
};

export function ToolIconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  className = "",
}) {
  const ToolIcon = TOOL_ICON_COMPONENTS[icon];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={() => {
        if (!disabled) triggerMobileHaptic();
      }}
      aria-label={label}
      title={label}
      disabled={disabled}
      whileHover={disabled ? undefined : BUTTON_HOVER}
      whileTap={disabled ? undefined : BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-10 w-10 items-center justify-center transition sm:h-9 sm:w-9 ${getSoftToneClass(
        "slate",
        active,
      )} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {ToolIcon ? (
        <ToolIcon className="h-4 w-4" strokeWidth={2} />
      ) : (
        <Icon name={icon} />
      )}
    </motion.button>
  );
}

export function ColorSwatchButton({
  color,
  active = false,
  onClick,
  label = "Pilih warna",
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={() => triggerMobileHaptic()}
      aria-label={label}
      title={label}
      whileHover={BUTTON_HOVER}
      whileTap={BUTTON_TAP}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`inline-flex h-8 w-8 items-center justify-center border-0 transition ${
        active ? SOFT_PRESSED_CLASS : SOFT_RAISED_CLASS
      }`}
    >
      <span
        className="h-[18px] w-[18px] rounded-full border border-white/70"
        style={{ backgroundColor: color }}
      />
    </motion.button>
  );
}

export function CompactSliderField({
  label,
  valueText,
  min,
  max,
  step = 1,
  value,
  onChange,
  onDecrease,
  onIncrease,
  decreaseIcon = "minus",
  increaseIcon = "plus",
  disabled = false,
  controlStyle = "knob",
}) {
  const knobRef = useRef(null);
  const [isKnobDragging, setIsKnobDragging] = useState(false);
  const [canUseMobilePreview, setCanUseMobilePreview] = useState(false);
  const [isPreviewOverlayForced, setIsPreviewOverlayForced] = useState(false);
  const previewOverlayTimeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(
      "(max-width: 1023px) and (pointer: coarse)",
    );
    const update = () => setCanUseMobilePreview(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(
    () => () => {
      if (previewOverlayTimeoutRef.current !== null) {
        window.clearTimeout(previewOverlayTimeoutRef.current);
      }
    },
    [],
  );

  const forcePreviewOverlay = useCallback(
    (durationMs = 120) => {
      if (!canUseMobilePreview || typeof window === "undefined") return;
      if (previewOverlayTimeoutRef.current !== null) {
        window.clearTimeout(previewOverlayTimeoutRef.current);
      }
      setMobilePanelPreview(true, durationMs);
      setIsPreviewOverlayForced(true);
      previewOverlayTimeoutRef.current = window.setTimeout(() => {
        setIsPreviewOverlayForced(false);
        previewOverlayTimeoutRef.current = null;
      }, durationMs);
    },
    [canUseMobilePreview],
  );

  const emitValueChange = useCallback(
    (nextValue) => {
      onChange?.({
        target: {
          value: String(nextValue),
        },
      });
    },
    [onChange],
  );

  const updateKnobValueFromPoint = useCallback(
    (clientX, clientY) => {
      if (!knobRef.current || disabled) return;
      const rect = knobRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const normalizedAngle = (angleDeg + 360) % 360;
      const relative = (normalizedAngle - KNOB_START_DEG + 360) % 360;
      const clampedRelative =
        relative <= KNOB_SWEEP_DEG
          ? relative
          : 360 - relative < relative - KNOB_SWEEP_DEG
            ? 0
            : KNOB_SWEEP_DEG;
      const ratio = clamp(clampedRelative / KNOB_SWEEP_DEG, 0, 1);
      const rawValue = min + ratio * (max - min);
      const snappedValue = min + Math.round((rawValue - min) / step) * step;
      const safeValue = clamp(Number(snappedValue.toFixed(4)), min, max);
      emitValueChange(safeValue);
    },
    [disabled, emitValueChange, max, min, step],
  );

  useEffect(() => {
    if (!isKnobDragging) return undefined;

    const handlePointerMove = (event) => {
      updateKnobValueFromPoint(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      setIsKnobDragging(false);
      setMobilePanelPreview(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isKnobDragging, updateKnobValueFromPoint]);

  const knobRatio = clamp(
    (Number(value) - min) / Math.max(max - min, 0.0001),
    0,
    1,
  );
  const knobAngle = KNOB_START_DEG + knobRatio * KNOB_SWEEP_DEG;
  const knobRad = (knobAngle * Math.PI) / 180;
  const knobDotRadius = 18;
  const knobDotX = 44 + Math.cos(knobRad) * knobDotRadius;
  const knobDotY = 44 + Math.sin(knobRad) * knobDotRadius;
  const showPreviewOverlay =
    canUseMobilePreview && (isKnobDragging || isPreviewOverlayForced);

  const handleStepDecrease = useCallback(() => {
    if (disabled) return;
    onDecrease?.();
    forcePreviewOverlay();
  }, [disabled, forcePreviewOverlay, onDecrease]);

  const handleStepIncrease = useCallback(() => {
    if (disabled) return;
    onIncrease?.();
    forcePreviewOverlay();
  }, [disabled, forcePreviewOverlay, onIncrease]);

  const controlContent = (
    <div
      className={`px-3 py-2.5 ${
        showPreviewOverlay
          ? "rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,rgba(248,250,252,0.34)_0%,rgba(237,242,247,0.26)_100%)] shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur-xl"
          : SOFT_SURFACE_CLASS
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-[12px] text-slate-700">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">{valueText}</span>
      </div>
      {controlStyle === "knob" ? (
        <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-end gap-3">
          <div className="flex items-center gap-2 pb-1">
            <IconButton
              icon={decreaseIcon}
              label={`${label} kurang`}
              onClick={handleStepDecrease}
              disabled={disabled}
              className="h-10 w-10 shrink-0"
            />
            <IconButton
              icon={increaseIcon}
              label={`${label} tambah`}
              onClick={handleStepIncrease}
              disabled={disabled}
              className="h-10 w-10 shrink-0"
            />
          </div>
          <div />
          <div
            ref={knobRef}
            onPointerDown={(event) => {
              if (disabled) return;
              event.preventDefault();
              setMobilePanelPreview(true);
              setIsKnobDragging(true);
              updateKnobValueFromPoint(event.clientX, event.clientY);
            }}
            className={`relative h-[88px] w-[88px] shrink-0 touch-none ${
              disabled
                ? "cursor-not-allowed opacity-45"
                : "cursor-grab active:cursor-grabbing"
            }`}
            role="slider"
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={Number(value)}
            tabIndex={disabled ? -1 : 0}
          >
            {Array.from({ length: 16 }).map((_, index) => {
              const ratio = index / 15;
              const tickAngle =
                (KNOB_START_DEG + ratio * KNOB_SWEEP_DEG) * (Math.PI / 180);
              const tickX = 44 + Math.cos(tickAngle) * 42;
              const tickY = 44 + Math.sin(tickAngle) * 42;
              return (
                <span
                  key={`${label}-tick-${index}`}
                  className="absolute h-3 w-px rounded-full bg-slate-300/80"
                  style={{
                    left: tickX,
                    top: tickY,
                    transform: `translate(-50%, -50%) rotate(${KNOB_START_DEG + ratio * KNOB_SWEEP_DEG + 90}deg)`,
                    opacity: index % 5 === 0 ? 1 : 0.7,
                  }}
                />
              );
            })}
            <div
              className={`absolute inset-0 rounded-full ${SOFT_RAISED_CLASS}`}
            />
            <div
              className={`absolute inset-[8px] rounded-full ${SOFT_INSET_CLASS}`}
            />
            <div
              className={`absolute inset-[16px] rounded-full ${SOFT_SURFACE_CLASS}`}
            />
            <span
              className={`absolute h-6 w-6 rounded-full border border-slate-300/70 ${SOFT_RAISED_CLASS}`}
              style={{
                left: knobDotX,
                top: knobDotY,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <IconButton
            icon={decreaseIcon}
            label={`${label} kurang`}
            onClick={handleStepDecrease}
            disabled={disabled}
            className="h-10 w-10 shrink-0"
          />
          <div className={`${SOFT_INSET_CLASS} flex min-w-0 flex-1 px-2 py-2`}>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={onChange}
              disabled={disabled}
              className="min-w-0 flex-1 accent-slate-400 disabled:cursor-not-allowed disabled:opacity-45"
            />
          </div>
          <IconButton
            icon={increaseIcon}
            label={`${label} tambah`}
            onClick={handleStepIncrease}
            disabled={disabled}
            className="h-10 w-10 shrink-0"
          />
        </div>
      )}
    </div>
  );

  if (showPreviewOverlay && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+116px)] left-3 z-[85]">
        {controlContent}
      </div>,
      document.body,
    );
  }

  return controlContent;
}
