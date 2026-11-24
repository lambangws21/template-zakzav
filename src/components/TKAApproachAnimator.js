"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const approaches = {
  parapatellar: { name: "Medial Parapatellar", color: "#a78bfa", description: "Arthrotomy medial patella, berlanjut proksimal melalui bagian medial tendon quadriceps.", detail: "VMO tidak dibelah melalui belly otot; eksposur luas." },
  midvastus: { name: "Midvastus", color: "#34d399", description: "Arthrotomy medial dilanjutkan dengan split searah serabut VMO.", detail: "Tendon quadriceps utama dipertahankan; sebagian serabut VMO dipisahkan." },
  subvastus: { name: "Subvastus", color: "#60a5fa", description: "Arthrotomy berada di bawah VMO, dengan elevasi otot ke arah superior.", detail: "VMO dan tendon quadriceps tidak dibelah; eksposur dapat lebih terbatas." },
};
const stages = ["Anatomi", "Jalur arthrotomy", "Eksposur sendi"];

export default function TKAApproachAnimator() {
  const [approach, setApproach] = useState("parapatellar");
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [labels, setLabels] = useState(true);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStage(s => (s + 1) % 3), 2300);
    return () => window.clearInterval(timer);
  }, [playing]);
  const a = approaches[approach];
  const path = approach === "parapatellar"
    ? "M 274 90 Q 282 136 284 182 Q 289 215 280 247 Q 268 276 271 335"
    : approach === "midvastus"
    ? "M 311 132 Q 294 155 284 183 Q 290 217 280 247 Q 268 276 271 335"
    : "M 353 189 Q 320 196 295 209 Q 284 225 280 247 Q 268 276 271 335";
  return (
    <div className="mx-auto w-full p-3 text-slate-100 sm:p-5">
      <div className="mb-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">ZAKZAV • TKA ANATOMY LAB</p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Pendekatan Bedah TKA</h2>
        <p className="mt-2 text-sm text-slate-400">Skema anterior lutut kanan • sisi medial berada di kanan gambar • bukan untuk navigasi operasi.</p>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {Object.keys(approaches).map(k => (
          <button key={k} type="button" onClick={() => { setApproach(k); setStage(0); setPlaying(false); }}
            className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${approach === k ? "border-cyan-400 bg-slate-800" : "border-slate-700 bg-slate-900 hover:bg-slate-800"}`}>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: approaches[k].color }} />{approaches[k].name}
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(250px,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#101c2b]">
          <svg viewBox="0 0 560 440" role="img" aria-label={`Ilustrasi anatomi lutut anterior dan pendekatan ${a.name}`} className="h-auto w-full">
            <defs>
              <linearGradient id="muscle" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#8e353b"/><stop offset="0.5" stopColor="#d87972"/><stop offset="1" stopColor="#922e38"/></linearGradient>
              <linearGradient id="bone" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#bda88d"/><stop offset="0.5" stopColor="#f5e7cc"/><stop offset="1" stopColor="#b6a083"/></linearGradient>
              <pattern id="fiber" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#f4b4a4" strokeWidth="0.8" opacity=".25"/></pattern>
            </defs>
            <rect width="560" height="440" fill="#101c2b" />
            <path d="M179 35 Q154 135 167 205 Q158 278 190 394 L356 394 Q386 278 367 205 Q384 127 359 35Z" fill="#f2bb97" opacity=".2" />
            <path d="M215 15 L331 15 L327 202 Q326 225 308 240 L237 240 Q217 225 216 202Z" fill="url(#bone)" stroke="#e9d7b9" strokeWidth="3" />
            <path d="M235 275 Q273 257 314 275 L316 420 L229 420Z" fill="url(#bone)" stroke="#e9d7b9" strokeWidth="3" />
            <path d="M190 24 Q205 72 226 120 Q240 156 243 183 L268 194 Q270 125 254 75 L248 24Z" fill="url(#muscle)" stroke="#ffb4a5" strokeWidth="2" />
            <path d="M190 24 Q205 72 226 120 Q240 156 243 183 L268 194 Q270 125 254 75 L248 24Z" fill="url(#fiber)" />
            <motion.g animate={{ x: approach === "subvastus" && stage === 2 ? 25 : 0, y: approach === "subvastus" && stage === 2 ? -23 : 0, rotate: approach === "subvastus" && stage === 2 ? -9 : 0 }} transition={{ duration: 0.85 }} style={{ transformOrigin: "355px 155px" }}>
              <path d="M352 25 Q330 66 310 103 Q286 142 278 195 Q302 202 326 192 Q365 164 380 105 L391 25Z" fill="url(#muscle)" stroke="#ffb4a5" strokeWidth="2" />
              <path d="M352 25 Q330 66 310 103 Q286 142 278 195 Q302 202 326 192 Q365 164 380 105 L391 25Z" fill="url(#fiber)" />
              {approach === "midvastus" && stage >= 2 && <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} d="M311 132 Q294 155 284 183" stroke="#34171d" strokeWidth="7" fill="none" strokeLinecap="round" />}
            </motion.g>
            <path d="M249 112 Q274 100 299 112 L307 190 Q308 205 295 215 L258 215 Q246 202 247 190Z" fill="#eee1c9" stroke="#fff1d7" strokeWidth="2" opacity=".95" />
            <path d="M238 220 Q275 206 310 220 Q334 241 326 279 Q315 310 275 315 Q237 308 226 280 Q218 244 238 220Z" fill="url(#bone)" stroke="#fff0d4" strokeWidth="4" />
            <path d="M245 314 Q269 327 304 314 L298 399 L250 399Z" fill="#e4d7c0" stroke="#f9edd6" strokeWidth="3" />
            <path d="M218 225 Q205 268 223 311 M328 225 Q346 271 327 310" fill="none" stroke="#c7d0d6" strokeWidth="11" opacity=".75" />
            {stage >= 1 && <motion.path key={approach} d={path} fill="none" stroke={a.color} strokeWidth="6" strokeLinecap="round" strokeDasharray="10 8" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.5 }} />}
            {stage === 2 && <motion.path initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 0.8, scale: 1 }} d="M232 221 Q275 202 317 221 L330 278 Q308 329 271 329 Q231 315 218 275Z" fill="#38bdf8" fillOpacity=".13" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 5" />}
            {labels && <g fontSize="13" fill="#e2e8f0" fontFamily="Arial, sans-serif">
              <path d="M336 92 L420 62" stroke="#d8e4ef"/><text x="425" y="60">VMO</text>
              <path d="M275 128 L112 96" stroke="#d8e4ef"/><text x="20" y="92">Quadriceps tendon</text>
              <path d="M314 258 L410 251" stroke="#d8e4ef"/><text x="415" y="255">Patella</text>
              <path d="M258 363 L111 366" stroke="#d8e4ef"/><text x="16" y="370">Patellar tendon</text>
              <path d="M219 261 L109 275" stroke="#d8e4ef"/><text x="13" y="278">Retinaculum</text>
              {stage >= 1 && <><path d="M281 240 L408 345" stroke={a.color}/><text x="410" y="348" fill={a.color}>Arthrotomy</text></>}
            </g>}
            <text x="20" y="424" fill="#94a3b8" fontSize="12">Skematik • tidak berskala • medial →</text>
          </svg>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Tahap {stage + 1} / 3</p>
            <h3 className="mt-2 text-xl font-bold">{stages[stage]}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{stage === 0 ? "Identifikasi VMO, tendon quadriceps, patella, tendon patella dan retinakulum medial." : stage === 1 ? a.description : a.detail}</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPlaying(p => !p)} className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400">{playing ? "Pause" : "▶ Play"}</button>
              <button type="button" onClick={() => { setStage(0); setPlaying(false); }} className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600">↺ Reset</button>
              <button type="button" onClick={() => { setStage(s => (s + 1) % 3); setPlaying(false); }} className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600">Next →</button>
            </div>
            <div className="flex gap-2">{stages.map((s, i) => <button type="button" key={s} onClick={() => { setStage(i); setPlaying(false); }} aria-label={`Tahap ${i + 1}: ${s}`} className={`h-2 flex-1 rounded-full ${i === stage ? "bg-cyan-400" : "bg-slate-700"}`} />)}</div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} /> Tampilkan label anatomi</label>
          </div>
        </div>
      </div>
      <p className="mt-5 text-xs leading-relaxed text-slate-400">Visualisasi konseptual untuk pendidikan. Posisi jalur, proporsi, dan pergeseran jaringan disederhanakan; tidak digunakan untuk menentukan lokasi atau panjang insisi pada pasien.</p>
    </div>
  );
}
