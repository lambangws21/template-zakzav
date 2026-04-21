"use client";

import { ExternalLink, Layers, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT, parseSheetRawText } from "@/lib/googleSheetImageUtils";
import DriveImageWithFallback from "./DriveImageWithFallback";

export default function GoogleSheetDrivePicker({ onUseImage }) {
  const [endpoint, setEndpoint] = useState(DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("Masukkan URL Apps Script / CSV Google Sheet.");

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(selectedId)) || null,
    [items, selectedId],
  );

  const loadFromEndpoint = useCallback(async () => {
    const url = String(endpoint || "").trim();
    if (!url) {
      setNotice("URL endpoint belum diisi.");
      return;
    }

    setIsLoading(true);
    try {
      const proxyUrl = `/api/google-sheet-images?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const proxyPayload = await response.json();
      if (!proxyPayload?.ok || typeof proxyPayload.payload !== "string") {
        throw new Error(proxyPayload?.error || "proxy payload invalid");
      }
      const rawText = proxyPayload.payload;
      const normalized = parseSheetRawText(rawText);
      setItems(normalized);
      setSelectedId(normalized[0]?.id || null);
      setNotice(
        normalized.length > 0
          ? `Berhasil load ${normalized.length} gambar dari sheet.`
          : "Data berhasil dibaca, tapi tidak ada URL gambar valid.",
      );
    } catch (error) {
      setNotice(
        `Gagal load endpoint sheet: ${error instanceof Error ? error.message : "unknown error"}.`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  const handleUseSelected = useCallback(() => {
    if (!selectedItem) {
      setNotice("Pilih gambar dulu.");
      return;
    }
    onUseImage?.(selectedItem);
  }, [onUseImage, selectedItem]);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          Google Sheet / Drive
        </span>
        <button
          type="button"
          onClick={() => {
            void loadFromEndpoint();
          }}
          disabled={isLoading}
          className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Load..." : "Load"}
        </button>
      </div>

      <input
        type="text"
        value={endpoint}
        onChange={(event) => setEndpoint(event.target.value)}
        placeholder="URL Apps Script / CSV Google Sheet"
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700"
      />

      <div className="grid grid-cols-[1fr_auto] gap-1.5">
        <select
          value={selectedId || ""}
          onChange={(event) => setSelectedId(event.target.value || null)}
          disabled={items.length === 0}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {items.length === 0 ? (
            <option value="">Belum ada gambar</option>
          ) : (
            items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))
          )}
        </select>
        <button
          type="button"
          onClick={handleUseSelected}
          disabled={!selectedItem}
          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Layers className="h-3.5 w-3.5" />
          Layer
        </button>
      </div>

      {selectedItem ? (
        <div className="flex items-center gap-2 rounded border border-slate-200 bg-white p-1.5">
          <DriveImageWithFallback
            src={selectedItem.imageSrc}
            driveId={selectedItem.driveId}
            alt={selectedItem.name}
            className="h-12 w-12 rounded border border-slate-200 object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-slate-700">{selectedItem.name}</div>
            <a
              href={selectedItem.imageSrc}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-cyan-700"
            >
              Open URL
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : null}

      <div className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
        {notice}
      </div>
    </div>
  );
}
