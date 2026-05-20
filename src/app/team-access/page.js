"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardCopy,
  ExternalLink,
  QrCode,
  CheckCircle2,
} from "lucide-react";

const TEAM_ENTRIES = [
  {
    key: "xray",
    title: "X-ray Calibration",
    description: "Kalibrasi X-ray dan pengukuran gambar.",
    path: "/",
  },
  {
    key: "drive",
    title: "Google Drive Sheet",
    description: "Kelola data gambar dan sinkronisasi Google Sheet/Drive.",
    path: "/google-sheet-drive",
  },
  {
    key: "checklist",
    title: "Checklist Instrument",
    description: "Checklist tray instrument untuk tim.",
    path: "/ceklist-instrument-normed",
  },
];

const getQrImageUrl = (value) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    value
  )}`;

const normalizeBaseUrl = (raw) => {
  const value = String(raw || "").trim().replace(/\/$/, "");
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
};

export default function TeamAccessPage() {
  const [copyState, setCopyState] = useState(null);
  const [runtimeOrigin, setRuntimeOrigin] = useState("");

  const envBaseUrl = useMemo(() => {
    const envBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
    if (envBase) return envBase;

    const vercelProd = normalizeBaseUrl(
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    );
    if (vercelProd) return vercelProd;

    const vercelPreview = normalizeBaseUrl(process.env.NEXT_PUBLIC_VERCEL_URL);
    if (vercelPreview) return vercelPreview;

    return "";
  }, []);

  useEffect(() => {
    if (envBaseUrl) return;
    if (typeof window === "undefined") return;
    setRuntimeOrigin(window.location.origin);
  }, [envBaseUrl]);

  const baseUrl = envBaseUrl || runtimeOrigin;

  const entries = useMemo(
    () =>
      TEAM_ENTRIES.map((item) => ({
        ...item,
        absoluteUrl: baseUrl ? `${baseUrl}${item.path}` : item.path,
      })),
    [baseUrl]
  );

  const copyLink = async (entryKey, value) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      }
      setCopyState(entryKey);
      setTimeout(() => {
        setCopyState((prev) => (prev === entryKey ? null : prev));
      }, 1500);
    } catch (_error) {
      setCopyState(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f6fa] px-4 py-6 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <QrCode size={14} /> Team Access
          </div>
          <h1 className="mt-2 text-xl font-bold sm:text-3xl">Link & QR Akses Tim</h1>
          <p className="mt-1 text-sm text-slate-500">
            Scan QR atau share link langsung ke tim tanpa buka menu utama.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {entries.map((item) => (
            <article
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.description}</p>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={getQrImageUrl(item.absoluteUrl)}
                  alt={`QR ${item.title}`}
                  className="mx-auto h-44 w-44 rounded-lg bg-white object-contain"
                />
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] break-all text-slate-600">
                {item.absoluteUrl}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(item.key, item.absoluteUrl)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {copyState === item.key ? (
                    <>
                      <CheckCircle2 size={14} /> Tersalin
                    </>
                  ) : (
                    <>
                      <ClipboardCopy size={14} /> Copy
                    </>
                  )}
                </button>
                <Link
                  href={item.path}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <ExternalLink size={14} /> Buka
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
