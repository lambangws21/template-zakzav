"use client";
import { useEffect, useState } from "react";

export default function NavClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="flex flex-col items-center leading-none select-none">
      <span className="font-mono text-[13px] font-black tracking-tight text-slate-800">{timeStr}</span>
      <span className="text-[9px] font-semibold tracking-wide text-slate-400">{dateStr}</span>
    </div>
  );
}
