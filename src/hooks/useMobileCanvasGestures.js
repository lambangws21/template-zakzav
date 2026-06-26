"use client";

import { useCallback, useEffect, useRef } from "react";

export default function useMobileCanvasGestures({
  enabled = false,
  overlayCanvasRef,
  mobileCanvasMode = "pan",
  mobileToolMode = "move",
  longPressMs = 460,
  longPressCancelDistance = 10,
  doubleTapMs = 360,
  doubleTapDistance = 28,
} = {}) {
  const activePointerIdRef = useRef(null);
  const gesturePointersRef = useRef(new Map());
  const pinchGestureRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const longPressPointerRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  const clearLongPress = useCallback(() => {
    if (
      longPressTimeoutRef.current !== null &&
      typeof window !== "undefined"
    ) {
      window.clearTimeout(longPressTimeoutRef.current);
    }
    longPressTimeoutRef.current = null;
    longPressPointerRef.current = null;
  }, []);

  const capturePointer = useCallback(
    (event) => {
      if (!Number.isFinite(event?.pointerId)) {
        return false;
      }

      activePointerIdRef.current = event.pointerId;
      const canvas = overlayCanvasRef?.current;
      if (!canvas || typeof canvas.setPointerCapture !== "function") {
        return true;
      }

      if (canvas.hasPointerCapture?.(event.pointerId)) {
        return true;
      }

      try {
        canvas.setPointerCapture(event.pointerId);
        return true;
      } catch {
        // Some mobile browsers reject capture during gesture handoff. Keep the
        // pointer id so fallback touch events do not finish the drag early.
        return false;
      }
    },
    [overlayCanvasRef],
  );

  const releaseActivePointerCapture = useCallback(() => {
    const canvas = overlayCanvasRef?.current;
    const activePointerId = activePointerIdRef.current;
    if (
      canvas &&
      activePointerId !== null &&
      canvas.hasPointerCapture?.(activePointerId)
    ) {
      try {
        canvas.releasePointerCapture(activePointerId);
      } catch {
        // ignore stale pointer capture
      }
    }
    activePointerIdRef.current = null;
  }, [overlayCanvasRef]);

  const trackGesturePointer = useCallback((pointerId, point) => {
    if (!Number.isFinite(pointerId) || !point) return;
    gesturePointersRef.current.set(pointerId, {
      x: point.x,
      y: point.y,
    });
  }, []);

  const removeGesturePointer = useCallback((pointerId) => {
    if (Number.isFinite(pointerId)) {
      gesturePointersRef.current.delete(pointerId);
      return;
    }
    gesturePointersRef.current.clear();
  }, []);

  const clearGesturePointers = useCallback(() => {
    gesturePointersRef.current.clear();
  }, []);

  const getGestureSnapshot = useCallback(() => {
    const points = Array.from(gesturePointersRef.current.values());
    if (points.length < 2) return null;
    const first = points[0];
    const second = points[1];
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    const angle = Math.atan2(second.y - first.y, second.x - first.x);
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    if (!Number.isFinite(distance) || distance <= 1) return null;
    return { centerX, centerY, distance, angle };
  }, []);

  const consumeDoubleTap = useCallback(
    (point, now = Date.now()) => {
      if (!enabled || !point) return false;
      const previousTap = lastTapRef.current;
      const tapDistance = Math.hypot(
        point.x - previousTap.x,
        point.y - previousTap.y,
      );
      if (
        now - previousTap.time <= doubleTapMs &&
        tapDistance <= doubleTapDistance
      ) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        return true;
      }
      lastTapRef.current = { time: now, x: point.x, y: point.y };
      return false;
    },
    [doubleTapDistance, doubleTapMs, enabled],
  );

  const canUseLongPressMove = useCallback(
    () => enabled && mobileCanvasMode === "pan",
    [enabled, mobileCanvasMode],
  );

  const startLongPress = useCallback(
    (pointerId, point, onLongPress, options = {}) => {
      clearLongPress();
      if (
        !enabled ||
        !canUseLongPressMove() ||
        !Number.isFinite(pointerId) ||
        !point ||
        typeof window === "undefined"
      ) {
        return false;
      }

      longPressPointerRef.current = {
        pointerId,
        startX: point.x,
        startY: point.y,
      };
      longPressTimeoutRef.current = window.setTimeout(() => {
        const pressState = longPressPointerRef.current;
        const currentPoint = gesturePointersRef.current.get(pointerId);
        longPressTimeoutRef.current = null;
        if (!pressState || !currentPoint) return;
        if (
          !options.allowMovement &&
          Math.hypot(
            currentPoint.x - pressState.startX,
            currentPoint.y - pressState.startY,
          ) > longPressCancelDistance
        ) {
          return;
        }
        onLongPress?.({ pointerId, point: currentPoint, pressState });
      }, longPressMs);
      return true;
    },
    [
      canUseLongPressMove,
      clearLongPress,
      enabled,
      longPressCancelDistance,
      longPressMs,
    ],
  );

  const cancelLongPressIfMoved = useCallback(
    (pointerId, point) => {
      const pressState = longPressPointerRef.current;
      if (
        !pressState ||
        pressState.pointerId !== pointerId ||
        !point ||
        Math.hypot(point.x - pressState.startX, point.y - pressState.startY) <=
          longPressCancelDistance
      ) {
        return false;
      }
      clearLongPress();
      return true;
    },
    [clearLongPress, longPressCancelDistance],
  );

  const startPinchGesture = useCallback(({ snapshot, anchor, scale }) => {
    if (!snapshot || !anchor || !Number.isFinite(scale)) return false;
    pinchGestureRef.current = {
      startDistance: snapshot.distance,
      startScale: scale,
      anchorX: anchor.x,
      anchorY: anchor.y,
    };
    return true;
  }, []);

  const clearPinchGesture = useCallback(() => {
    pinchGestureRef.current = null;
  }, []);

  const shouldBlockLayerBodyMove = useCallback(
    ({ isTouchLikePointer = true } = {}) =>
      enabled && isTouchLikePointer && mobileToolMode !== "move",
    [enabled, mobileToolMode],
  );

  const shouldBlockTransformHandle = useCallback(
    ({ isTouchLikePointer = true, isRotateHandle = false } = {}) =>
      enabled &&
      isTouchLikePointer &&
      ((mobileToolMode === "scale" && isRotateHandle) ||
        (mobileToolMode === "rotate" && !isRotateHandle)),
    [enabled, mobileToolMode],
  );

  const getLayerBodyMoveGuardNotice = useCallback(
    () =>
      mobileToolMode === "scale"
        ? "Scale Mode aktif. Gunakan handle sudut/sisi untuk resize, bukan badan layer."
        : "Rotate Mode aktif. Gunakan handle rotate atau tombol rotasi.",
    [mobileToolMode],
  );

  const getTransformHandleGuardNotice = useCallback(
    () =>
      mobileToolMode === "scale"
        ? "Scale Mode aktif. Gunakan handle sudut/sisi, bukan rotate."
        : "Rotate Mode aktif. Gunakan handle rotate.",
    [mobileToolMode],
  );

  const resetGestureState = useCallback(() => {
    clearLongPress();
    gesturePointersRef.current.clear();
    pinchGestureRef.current = null;
    lastTapRef.current = { time: 0, x: 0, y: 0 };
    releaseActivePointerCapture();
  }, [clearLongPress, releaseActivePointerCapture]);

  useEffect(() => () => resetGestureState(), [resetGestureState]);

  return {
    activePointerIdRef,
    gesturePointersRef,
    pinchGestureRef,
    capturePointer,
    releaseActivePointerCapture,
    trackGesturePointer,
    removeGesturePointer,
    clearGesturePointers,
    getGestureSnapshot,
    consumeDoubleTap,
    clearLongPress,
    canUseLongPressMove,
    startLongPress,
    cancelLongPressIfMoved,
    startPinchGesture,
    clearPinchGesture,
    shouldBlockLayerBodyMove,
    shouldBlockTransformHandle,
    getLayerBodyMoveGuardNotice,
    getTransformHandleGuardNotice,
    resetGestureState,
  };
}
