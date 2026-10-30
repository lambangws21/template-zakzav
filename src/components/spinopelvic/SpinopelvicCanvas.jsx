"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { drawLine, drawPoint, screenToImagePoint } from "@/lib/hka/geometry";

const POINT_STYLE = {
  bicoxofemoralCenter: { label: "BFC", color: "#facc15" },
  sacralEndplateMidpoint: { label: "S1-MP", color: "#38bdf8" },
};

export function SpinopelvicCanvas({ title, imageFile, activePoint, points, setPoints }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageReady, setImageReady] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  const imageUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (!imageUrl) {
      imageRef.current = null;
      setImageReady(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageReady(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
        setTransform({
          scale,
          offsetX: (canvas.width - img.width * scale) / 2,
          offsetY: (canvas.height - img.height * scale) / 2,
        });
      }
    };
    img.src = imageUrl;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (img && imageReady) {
      ctx.translate(transform.offsetX, transform.offsetY);
      ctx.scale(transform.scale, transform.scale);
      ctx.drawImage(img, 0, 0);

      const { bicoxofemoralCenter, sacralEndplateMidpoint } = points;
      drawLine(ctx, bicoxofemoralCenter, sacralEndplateMidpoint, "#a78bfa", 3);
      drawPoint(ctx, bicoxofemoralCenter, POINT_STYLE.bicoxofemoralCenter.label, POINT_STYLE.bicoxofemoralCenter.color);
      drawPoint(ctx, sacralEndplateMidpoint, POINT_STYLE.sacralEndplateMidpoint.label, POINT_STYLE.sacralEndplateMidpoint.color);
    } else {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "16px Arial";
      ctx.fillText("Upload lateral X-ray", 24, 40);
    }
    ctx.restore();
  }, [imageReady, points, transform]);

  function handleClick(event) {
    const canvas = canvasRef.current;
    if (!canvas || !activePoint || !imageReady) return;
    const point = screenToImagePoint(event, canvas, transform);
    setPoints((prev) => ({ ...prev, [activePoint]: point }));
  }

  function zoomBy(factor) {
    setTransform((prev) => ({ ...prev, scale: Math.max(0.1, Math.min(6, prev.scale * factor)) }));
  }

  function handleWheel(event) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1);
  }

  // Same pinch-to-zoom fallback as XrayCanvas.jsx — scroll-wheel zoom has no
  // touch equivalent, and this canvas is used on tablets/phones too.
  const pinchDistanceRef = useRef(null);

  function handleTouchStart(event) {
    if (event.touches.length === 2) {
      const [a, b] = event.touches;
      pinchDistanceRef.current = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    }
  }

  function handleTouchMove(event) {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const [a, b] = event.touches;
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    if (pinchDistanceRef.current) {
      zoomBy(dist / pinchDistanceRef.current);
    }
    pinchDistanceRef.current = dist;
  }

  function handleTouchEnd(event) {
    if (event.touches.length < 2) pinchDistanceRef.current = null;
  }

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <p className="mb-2 text-sm font-semibold text-slate-700">{title}</p>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={640}
          height={780}
          onClick={handleClick}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="h-[55vh] w-full cursor-crosshair rounded-xl bg-slate-900 object-contain touch-none"
        />
        <div className="absolute bottom-2 right-2 flex gap-1 rounded-lg bg-white/90 p-1 shadow-md">
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Perbesar"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Perkecil"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setTransform({ scale: 1, offsetX: 0, offsetY: 0 })} aria-label="Reset zoom"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Scroll atau cubit (pinch) untuk zoom. Klik canvas untuk memasang landmark aktif ({activePoint ? POINT_STYLE[activePoint]?.label : "—"}).
      </p>
    </div>
  );
}
