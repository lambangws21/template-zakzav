"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  function handleWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    setTransform((prev) => ({ ...prev, scale: Math.max(0.1, Math.min(6, prev.scale * factor)) }));
  }

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <p className="mb-2 text-sm font-semibold text-slate-700">{title}</p>
      <canvas
        ref={canvasRef}
        width={640}
        height={780}
        onClick={handleClick}
        onWheel={handleWheel}
        className="h-[55vh] w-full cursor-crosshair rounded-xl bg-slate-900 object-contain"
      />
      <p className="mt-2 text-xs text-slate-500">
        Scroll untuk zoom. Klik canvas untuk memasang landmark aktif ({activePoint ? POINT_STYLE[activePoint]?.label : "—"}).
      </p>
    </div>
  );
}
