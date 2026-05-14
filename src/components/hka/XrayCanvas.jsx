"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { drawLine, drawPoint, screenToImagePoint } from "@/lib/hka/geometry";

export function XrayCanvas({
  imageFile,
  mode,
  activePoint,
  points,
  setPoints,
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageReady, setImageReady] = useState(false);
  const [transform, setTransform] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const imageUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    if (!imageUrl) {
      imageRef.current = null;
      setImageReady(false);
      return undefined;
    }

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageReady(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const scale =
          Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
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

      if (mode === "full") {
        drawLine(ctx, points.femoralHead, points.kneeCenter, "#facc15", 4);
        drawLine(ctx, points.kneeCenter, points.ankleCenter, "#22c55e", 4);
        drawPoint(ctx, points.femoralHead, "CFH", "#facc15");
        drawPoint(ctx, points.kneeCenter, "CK", "#f97316");
        drawPoint(ctx, points.ankleCenter, "CA", "#22c55e");
      }

      if (mode === "fta") {
        drawLine(
          ctx,
          points.femurMidshaft10cm,
          points.femoralNotch,
          "#facc15",
          4,
        );
        drawLine(
          ctx,
          points.tibiaMidshaft4cm,
          points.tibiaMidshaft10cm,
          "#22c55e",
          4,
        );
        drawPoint(ctx, points.femurMidshaft10cm, "Fem2 shaft", "#facc15");
        drawPoint(ctx, points.femoralNotch, "Notch", "#f97316");
        drawPoint(ctx, points.tibiaMidshaft4cm, "Tib1 4cm", "#22c55e");
        drawPoint(ctx, points.tibiaMidshaft10cm, "Tib1 10cm", "#38bdf8");
      }
    } else {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "18px Arial";
      ctx.fillText(
        "Upload full-length X-ray / AP knee terlebih dahulu",
        40,
        60,
      );
    }

    ctx.restore();
  }, [imageReady, mode, points, transform]);

  function handleClick(event) {
    const canvas = canvasRef.current;
    if (!canvas || !activePoint || !imageReady) return;

    const point = screenToImagePoint(event, canvas, transform);
    setPoints((prev) => ({ ...prev, [activePoint]: point }));
  }

  function handleWheel(event) {
    event.preventDefault();
    const zoomIntensity = 0.1;
    const nextScale =
      event.deltaY < 0
        ? transform.scale * (1 + zoomIntensity)
        : transform.scale * (1 - zoomIntensity);
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(6, nextScale)),
    }));
  }

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <canvas
        ref={canvasRef}
        width={900}
        height={1100}
        onClick={handleClick}
        onWheel={handleWheel}
        className="h-[72vh] w-full cursor-crosshair rounded-xl bg-slate-900 object-contain"
      />
      <p className="mt-2 text-xs text-slate-500">
        Scroll untuk zoom. Klik canvas untuk memasang landmark aktif.
      </p>
    </div>
  );
}
