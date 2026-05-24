"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ImageIcon, Loader2, RefreshCcw, Search } from "lucide-react";
import { FloatingSelectField } from "@/components/FloatingFields";
import DriveImageWithFallback from "@/components/DriveImageWithFallback.jsx";
import {
  buildGoogleDriveDirectImageUrl,
  extractDriveIdFromRecord,
  toSafeImageSrc,
} from "@/lib/googleDriveImage";

const GOOGLE_SHEET_ENDPOINT =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT ||
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzuQk2jdWiJT8ANVR3XdoFQiWInwMGnJM9ZtHUHIf6MipXdNs5moRMx4NV-nXzfJ_6q/exec";

const ACTION_LIST_CANDIDATES = [
  "list_instrument_profiles",
  "read_instrument_profiles",
  "listinstrumentprofiles",
  "readinstrumentprofiles",
  "list",
  "read",
];
const INSTRUMENT_PROFILE_SHEET_NAME = "InstrumentProfiles";

const PROCEDURES = [
  { key: "tkr", label: "TKR" },
  { key: "thr", label: "THR" },
  { key: "bipolar", label: "Bipolar" },
  { key: "stem", label: "Stem" },
];

function normalizeProcedureKey(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (raw === "tkr" || raw === "thr" || raw === "bipolar" || raw === "stem") return raw;
  return "";
}

function normalizeCatalogNo(value) {
  return String(value || "").trim().toUpperCase();
}

function parseJsonSafe(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseCsvRows(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitCsv = (line) =>
    line
      .split(",")
      .map((item) => String(item || "").trim().replace(/^"|"$/g, ""));

  const headers = splitCsv(lines[0]).map((header) => header.toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsv(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] || "";
    });
    rows.push(row);
  }
  return rows;
}

function extractRowsFromRemote(remote) {
  if (!remote || typeof remote !== "object") return [];
  const direct =
    (Array.isArray(remote.items) && remote.items) ||
    (Array.isArray(remote.rows) && remote.rows) ||
    (Array.isArray(remote.instrumentProfiles) && remote.instrumentProfiles) ||
    (Array.isArray(remote?.data?.instrumentProfiles) && remote.data.instrumentProfiles) ||
    (Array.isArray(remote.data) && remote.data) ||
    [];
  if (direct.length) return direct;
  if (Array.isArray(remote.payload)) return remote.payload;

  const parsedPayload = parseJsonSafe(remote.payload);
  if (parsedPayload && typeof parsedPayload === "object") {
    return extractRowsFromRemote(parsedPayload);
  }
  if (typeof remote.payload === "string") {
    return parseCsvRows(remote.payload);
  }
  return [];
}

function parseTagMetadata(value) {
  const raw = String(value || "").trim();
  if (!raw) return {};
  const parsedJson = parseJsonSafe(raw);
  if (parsedJson && typeof parsedJson === "object" && !Array.isArray(parsedJson)) return parsedJson;

  const meta = {};
  raw.split(/[;|]/).forEach((segment) => {
    const entry = String(segment || "").trim();
    if (!entry) return;
    const equalIndex = entry.indexOf("=");
    const colonIndex = entry.indexOf(":");
    const dividerIndex =
      equalIndex >= 0 && colonIndex >= 0
        ? Math.min(equalIndex, colonIndex)
        : Math.max(equalIndex, colonIndex);
    if (dividerIndex <= 0) return;
    const key = entry.slice(0, dividerIndex).trim();
    const val = entry.slice(dividerIndex + 1).trim();
    if (!key || !val) return;
    meta[key] = val;
  });
  return meta;
}

function driveIdToImageUrl(driveId) {
  const id = String(driveId || "").trim();
  if (!id) return "";
  return buildGoogleDriveDirectImageUrl(id);
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const meta = parseTagMetadata(row?.tags || row?.tag || row?.metadata || row?.meta);
      const procedureKey = normalizeProcedureKey(
        row?.procedureKey ||
          row?.procedure ||
          row?.systemKey ||
          row?.system ||
          row?.tindakan ||
          row?.operation ||
          meta?.procedureKey ||
          meta?.procedure ||
          meta?.systemKey ||
          meta?.system
      );
      const catalogNo = normalizeCatalogNo(
        row?.catalogNo ||
          row?.code ||
          row?.kode ||
          row?.itemCode ||
          row?.catalogno ||
          meta?.catalogNo ||
          meta?.code ||
          meta?.kode
      );
      const qtyRaw = Number(
        row?.qty || row?.piece || row?.pieces || row?.pcs || row?.jumlah || meta?.qty || 1
      );
      const driveId = extractDriveIdFromRecord({ ...(meta || {}), ...(row || {}) });
      const imageSource =
        driveIdToImageUrl(driveId) ||
        String(
          row?.imageSrc ||
            row?.imageUrl ||
            row?.photoUrl ||
            row?.photourl ||
            row?.image ||
            meta?.imageSrc ||
            meta?.imageUrl ||
            ""
        ).trim();

      return {
        id: String(row?.id || "").trim() || `${procedureKey}-${catalogNo}`,
        procedureKey,
        catalogNo,
        name: String(
          row?.name ||
            row?.description ||
            row?.deskripsi ||
            row?.instrument ||
            meta?.name ||
            meta?.description ||
            ""
        ).trim(),
        category:
          String(
            row?.category ||
              row?.group ||
              row?.kategori ||
              row?.groupName ||
              meta?.category ||
              meta?.group ||
              "Tray"
          ).trim() || "Tray",
        qty: Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.round(qtyRaw) : 1,
        driveId,
        imageUrl: toSafeImageSrc(imageSource, ""),
      };
    })
    .filter((row) => row.procedureKey && row.catalogNo && row.name)
    .sort((a, b) => {
      if (a.procedureKey !== b.procedureKey) {
        return a.procedureKey.localeCompare(b.procedureKey);
      }
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.catalogNo.localeCompare(b.catalogNo);
    });
}

function procedureLabel(key) {
  return PROCEDURES.find((item) => item.key === key)?.label || key.toUpperCase();
}

function extractRemoteRawText(remote) {
  const raw = remote?.raw;
  return typeof raw === "string" ? raw.trim() : "";
}

function isHtmlPayload(text) {
  const raw = String(text || "").trim().toLowerCase();
  return raw.startsWith("<!doctype html") || raw.startsWith("<html");
}

export default function InstrumentProfilesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [procedureFilter, setProcedureFilter] = useState("all");

  const loadProfiles = useCallback(async (silent = false) => {
    if (!silent) setMessage("");
    setLoading(true);

    try {
      let rows = [];
      let lastError = "";
      let htmlPayloadDetected = false;

      for (const actionName of ACTION_LIST_CANDIDATES) {
        const response = await fetch("/api/google-sheet-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: GOOGLE_SHEET_ENDPOINT,
            action: actionName,
            sheet: INSTRUMENT_PROFILE_SHEET_NAME,
            sheetName: INSTRUMENT_PROFILE_SHEET_NAME,
            table: INSTRUMENT_PROFILE_SHEET_NAME,
          }),
        });
        const result = await response.json();
        const remote = result?.remote || result || {};
        const remoteRaw = extractRemoteRawText(remote);
        if (isHtmlPayload(remoteRaw)) {
          htmlPayloadDetected = true;
          lastError =
            "Endpoint Apps Script mengembalikan halaman HTML. Pastikan URL `.../exec` valid dan Web App sudah deploy dengan akses publik.";
          continue;
        }
        const remoteStatus = String(remote?.status || "").toLowerCase();
        const remoteOk =
          typeof remote?.ok === "boolean"
            ? remote.ok
            : remoteStatus
              ? remoteStatus !== "error"
              : true;

        if (!response.ok || !result?.ok || !remoteOk) {
          lastError = remote?.error || remote?.message || result?.error || `HTTP ${response.status}`;
          continue;
        }

        rows = extractRowsFromRemote(remote);
        if (rows.length) break;
      }

      if (!rows.length) {
        const queryParams = new URLSearchParams({
          sheet: INSTRUMENT_PROFILE_SHEET_NAME,
          sheetName: INSTRUMENT_PROFILE_SHEET_NAME,
          table: INSTRUMENT_PROFILE_SHEET_NAME,
        });
        const response = await fetch(`/api/google-sheet-images?${queryParams.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const result = await response.json();
        const remote = result?.remote || result || {};
        const remoteRaw = extractRemoteRawText(remote);
        if (isHtmlPayload(remoteRaw)) {
          htmlPayloadDetected = true;
          throw new Error(
            "Endpoint Apps Script mengembalikan halaman HTML. Pastikan URL `.../exec` valid dan Web App sudah deploy dengan akses publik."
          );
        }
        const remoteStatus = String(remote?.status || "").toLowerCase();
        const remoteOk =
          typeof remote?.ok === "boolean"
            ? remote.ok
            : remoteStatus
              ? remoteStatus !== "error"
              : true;
        if (!response.ok || !result?.ok || !remoteOk) {
          throw new Error(
            remote?.error ||
              remote?.message ||
              result?.error ||
              lastError ||
              `Request gagal (HTTP ${response.status}).`
          );
        }
        rows = extractRowsFromRemote(remote);
      }

      if (!rows.length && htmlPayloadDetected) {
        throw new Error(
          lastError ||
            "Endpoint Apps Script tidak mengembalikan JSON data. Cek deploy Web App dan permission akses."
        );
      }

      const normalized = normalizeRows(rows);
      setItems(normalized);
      if (!silent) setMessage(`InstrumentProfiles berhasil dimuat (${normalized.length} item).`);
    } catch (error) {
      setMessage(error?.message || "Gagal memuat InstrumentProfiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles(true);
  }, [loadProfiles]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (procedureFilter !== "all" && item.procedureKey !== procedureFilter) return false;
      if (!q) return true;
      return [item.catalogNo, item.name, item.category, item.procedureKey]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, procedureFilter, query]);

  const grouped = useMemo(() => {
    const groupedByProcedure = new Map();
    filteredItems.forEach((item) => {
      const pk = item.procedureKey;
      const category = item.category || "Tray";
      if (!groupedByProcedure.has(pk)) groupedByProcedure.set(pk, new Map());
      const categoryMap = groupedByProcedure.get(pk);
      if (!categoryMap.has(category)) categoryMap.set(category, []);
      categoryMap.get(category).push(item);
    });
    return Array.from(groupedByProcedure.entries());
  }, [filteredItems]);

  const withPhotoCount = useMemo(
    () => filteredItems.filter((item) => Boolean(item.imageUrl)).length,
    [filteredItems]
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
      <section className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold md:text-2xl">UI Instrument Profiles</h1>
              <p className="mt-1 text-sm text-slate-500">
                Menampilkan data sheet <span className="font-semibold">InstrumentProfiles</span> dari Apps Script.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadProfiles()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                Refresh
              </button>
              <Link
                href="/ceklist-instrument-normed"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <ArrowLeft size={14} />
                Kembali ke Checklist
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Item</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{filteredItems.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Dengan Foto</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{withPhotoCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Procedure Aktif</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {procedureFilter === "all" ? "ALL" : procedureLabel(procedureFilter)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[200px_1fr]">
            <FloatingSelectField
              value={procedureFilter}
              onChange={(event) => setProcedureFilter(event.target.value)}
              label="Procedure"
              selectClassName="border-slate-200 focus:border-slate-900"
            >
              <option value="all">Semua Procedure</option>
              {PROCEDURES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </FloatingSelectField>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder=" "
                className="peer h-12 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 pt-5 text-sm outline-none transition focus:border-slate-900"
              />
              <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 rounded bg-white px-1 text-sm text-slate-500 transition-all duration-150 peer-focus:top-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-slate-700 peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-[11px] peer-[&:not(:placeholder-shown)]:font-semibold peer-[&:not(:placeholder-shown)]:text-slate-700">
                Cari kode, nama, atau kategori
              </span>
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        ) : null}

        <section className="space-y-3">
          {grouped.map(([procedureKey, categoryMap]) => (
            <article
              key={procedureKey}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{procedureLabel(procedureKey)}</p>
                <p className="text-xs text-slate-500">
                  {Array.from(categoryMap.values()).reduce((sum, rows) => sum + rows.length, 0)} item
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {Array.from(categoryMap.entries()).map(([category, rows]) => (
                  <details key={`${procedureKey}-${category}`} open className="group">
                    <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-slate-700">
                      {category} <span className="text-xs text-slate-500">({rows.length})</span>
                    </summary>
                    <div className="space-y-2 px-3 pb-3">
                      {rows.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <DriveImageWithFallback
                              src={item.imageUrl}
                              driveId={item.driveId}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase text-slate-500">{item.catalogNo}</p>
                            <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">Piece: {item.qty}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </article>
          ))}

          {!grouped.length && !loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
              Data InstrumentProfiles tidak ditemukan.
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
