"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT,
  parseSheetRawText,
} from "@/lib/googleSheetImageUtils";
import DriveImageWithFallback from "./DriveImageWithFallback";
import PhotoPreviewModal from "./PhotoPreviewModal";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const TEXT_INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-800 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100";
const FILE_INPUT_CLASS =
  "block w-full cursor-pointer rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1 file:text-[11px] file:text-white";

function SpinIndicator({ spinning = false, dark = false }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${dark ? "border-slate-400/40 border-t-slate-900" : "border-white/45 border-t-white"} ${spinning ? "animate-spin" : ""}`}
      aria-hidden="true"
    />
  );
}

function createQueueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function stripFileExtension(fileName) {
  const value = String(fileName || "").trim();
  if (!value) return "";
  return value.replace(/\.[^.]+$/, "");
}

function queueStatusLabel(status) {
  if (status === "uploading") return "Uploading";
  if (status === "done") return "Uploaded";
  if (status === "error") return "Error";
  return "Pending";
}

function queueStatusClass(status) {
  if (status === "uploading") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "error") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "unknown error";
}

async function parseApiResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

export default function GoogleSheetDriveManager() {
  const [endpoint, setEndpoint] = useState(DEFAULT_GOOGLE_SHEET_IMAGE_ENDPOINT);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState("Masukkan endpoint Apps Script lalu klik Load List.");
  const [rawResponse, setRawResponse] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [createDriveId, setCreateDriveId] = useState("");

  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDriveId, setEditDriveId] = useState("");
  const [editFile, setEditFile] = useState(null);

  const [uploadQueue, setUploadQueue] = useState([]);
  const [activeQueueId, setActiveQueueId] = useState(null);
  const [previewModalState, setPreviewModalState] = useState({
    open: false,
    title: "Preview",
    items: [],
    initialIndex: 0,
  });

  const uploadInputRef = useRef(null);
  const queueRef = useRef([]);

  useEffect(() => {
    queueRef.current = uploadQueue;
  }, [uploadQueue]);

  useEffect(
    () => () => {
      for (const queueItem of queueRef.current) {
        if (queueItem?.previewUrl && String(queueItem.previewUrl).startsWith("blob:")) {
          URL.revokeObjectURL(queueItem.previewUrl);
        }
      }
    },
    [],
  );

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(selectedId)) || null,
    [items, selectedId],
  );
  const activeQueueItem = useMemo(
    () => uploadQueue.find((item) => String(item.id) === String(activeQueueId)) || null,
    [activeQueueId, uploadQueue],
  );
  const queueStats = useMemo(() => {
    const total = uploadQueue.length;
    const done = uploadQueue.filter((item) => item.status === "done").length;
    const uploading = uploadQueue.filter((item) => item.status === "uploading").length;
    const error = uploadQueue.filter((item) => item.status === "error").length;
    const pending = uploadQueue.filter((item) => item.status === "pending").length;
    return { total, done, uploading, error, pending };
  }, [uploadQueue]);
  const endpointHost = useMemo(() => {
    const value = String(endpoint || "").trim();
    if (!value) return "-";
    try {
      return new URL(value).host;
    } catch {
      return "URL tidak valid";
    }
  }, [endpoint]);
  const noticeTone = useMemo(() => {
    const message = String(notice || "").toLowerCase();
    if (message.includes("gagal") || message.includes("error")) {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }
    if (message.includes("berhasil")) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    return "border-slate-200 bg-slate-50 text-slate-700";
  }, [notice]);

  useEffect(() => {
    if (!selectedItem) return;
    setEditName(selectedItem.name || "");
    setEditTags(selectedItem.tags || "");
    setEditDriveId(selectedItem.driveId || "");
    setEditFile(null);
  }, [selectedItem]);

  useEffect(() => {
    if (uploadQueue.length === 0) {
      if (activeQueueId !== null) setActiveQueueId(null);
      return;
    }
    const stillExists = uploadQueue.some((item) => String(item.id) === String(activeQueueId));
    if (!stillExists) {
      setActiveQueueId(uploadQueue[0].id);
    }
  }, [activeQueueId, uploadQueue]);

  const openPreviewModal = useCallback((title, previewItems, initialIndex = 0) => {
    setPreviewModalState({
      open: true,
      title,
      items: previewItems,
      initialIndex,
    });
  }, []);

  const closePreviewModal = useCallback(() => {
    setPreviewModalState((prev) => ({ ...prev, open: false }));
  }, []);

  const openGalleryPreview = useCallback(
    (targetId) => {
      const previewItems = items
        .filter((item) => item?.imageSrc)
        .map((item) => ({
          id: item.id,
          name: item.name || "Untitled",
          imageSrc: item.imageSrc,
          driveId: item.driveId || "",
          meta: item.driveId ? `driveId: ${item.driveId}` : "",
        }));
      if (previewItems.length === 0) return;
      const index = Math.max(
        0,
        previewItems.findIndex((item) => String(item.id) === String(targetId)),
      );
      openPreviewModal("Gallery Preview", previewItems, index);
    },
    [items, openPreviewModal],
  );

  const openQueuePreview = useCallback(
    (targetId) => {
      const previewItems = uploadQueue
        .filter((item) => item?.previewUrl)
        .map((item) => ({
          id: item.id,
          name: item.customName || item.name || "Untitled",
          imageSrc: item.previewUrl,
          meta: `${formatFileSize(item.size)} • ${queueStatusLabel(item.status)}`,
        }));
      if (previewItems.length === 0) return;
      const index = Math.max(
        0,
        previewItems.findIndex((item) => String(item.id) === String(targetId)),
      );
      openPreviewModal("Upload Queue Preview", previewItems, index);
    },
    [openPreviewModal, uploadQueue],
  );

  const updateQueueItem = useCallback((itemId, patch) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  }, []);

  const getEndpoint = useCallback(() => {
    const url = String(endpoint || "").trim();
    if (!url) {
      setNotice("Endpoint wajib diisi.");
      return "";
    }
    return url;
  }, [endpoint]);

  const loadItems = useCallback(async () => {
    const url = getEndpoint();
    if (!url) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/google-sheet-images?url=${encodeURIComponent(url)}`, {
        cache: "no-store",
      });
      const payload = await parseApiResponse(response);
      if (typeof payload.payload !== "string") {
        throw new Error("Payload list tidak valid.");
      }

      const nextItems = parseSheetRawText(payload.payload);
      setItems(nextItems);
      setSelectedId((prev) => {
        const stillExists = nextItems.some((item) => String(item.id) === String(prev));
        if (stillExists) return prev;
        return nextItems[0]?.id || null;
      });
      setRawResponse(payload.payload.slice(0, 4000));
      setNotice(
        nextItems.length > 0
          ? `Berhasil memuat ${nextItems.length} item dari Google Sheet.`
          : "List kosong. Tambahkan item baru lewat form create.",
      );
    } catch (error) {
      setNotice(`Gagal load list: ${getErrorMessage(error)}.`);
    } finally {
      setIsLoading(false);
    }
  }, [getEndpoint]);

  const appendFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    let rejectedType = 0;
    let rejectedSize = 0;
    const nextItems = [];

    for (const file of files) {
      if (!String(file?.type || "").startsWith("image/")) {
        rejectedType += 1;
        continue;
      }
      if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
        rejectedSize += 1;
        continue;
      }
      nextItems.push({
        id: createQueueId(),
        file,
        name: file.name || "untitled-image",
        customName: stripFileExtension(file.name || "untitled-image"),
        customTags: String(createTags || "").trim(),
        size: Number(file.size || 0),
        previewUrl: URL.createObjectURL(file),
        status: "pending",
        message: "Menunggu upload",
      });
    }

    if (nextItems.length > 0) {
      setUploadQueue((prev) => [...prev, ...nextItems]);
      setActiveQueueId((prev) => prev || nextItems[0].id);
    }

    if (rejectedType > 0 || rejectedSize > 0) {
      setNotice(
        `File ditambahkan: ${nextItems.length}. Ditolak: type ${rejectedType}, size ${rejectedSize} (maks ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB).`,
      );
      return;
    }

    if (nextItems.length > 0) {
      setNotice(`${nextItems.length} file ditambahkan ke antrean upload.`);
    }
  }, [createTags]);

  const removeQueueItem = useCallback((itemId) => {
    setUploadQueue((prev) => {
      const target = prev.find((item) => item.id === itemId);
      if (target?.previewUrl && String(target.previewUrl).startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== itemId);
    });
  }, []);

  const clearUploadedQueue = useCallback(() => {
    setUploadQueue((prev) => {
      const next = [];
      for (const item of prev) {
        if (item.status === "done") {
          if (item.previewUrl && String(item.previewUrl).startsWith("blob:")) {
            URL.revokeObjectURL(item.previewUrl);
          }
          continue;
        }
        next.push(item);
      }
      return next;
    });
  }, []);

  const clearAllQueue = useCallback(() => {
    setUploadQueue((prev) => {
      for (const item of prev) {
        if (item.previewUrl && String(item.previewUrl).startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
      return [];
    });
  }, []);

  const handleCreateByDriveId = useCallback(async () => {
    const url = getEndpoint();
    if (!url) return;
    const driveId = String(createDriveId || "").trim();
    if (!driveId) {
      setNotice("Isi Drive ID dulu untuk create manual.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/google-sheet-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          action: "create",
          item: {
            name: String(createName || "").trim() || `Drive ${driveId.slice(0, 8)}`,
            tags: String(createTags || "").trim(),
            driveId,
          },
        }),
      });
      const payload = await parseApiResponse(response);
      setRawResponse(JSON.stringify(payload.remote || payload, null, 2).slice(0, 4000));
      setNotice("Create via Drive ID berhasil.");
      setCreateDriveId("");
      await loadItems();
    } catch (error) {
      setNotice(`Create Drive ID gagal: ${getErrorMessage(error)}.`);
    } finally {
      setIsCreating(false);
    }
  }, [createDriveId, createName, createTags, getEndpoint, loadItems]);

  const handleUploadMany = useCallback(async () => {
    const url = getEndpoint();
    if (!url) return;

    const targetQueue = uploadQueue.filter(
      (item) => item.status === "pending" || item.status === "error",
    );
    if (targetQueue.length === 0) {
      setNotice("Tidak ada file pending untuk diupload.");
      return;
    }

    setIsBatchUploading(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < targetQueue.length; i += 1) {
        const queueItem = targetQueue[i];
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueItem.id
              ? { ...item, status: "uploading", message: `Uploading ${i + 1}/${targetQueue.length}` }
              : item,
          ),
        );

        try {
          const imageDataUrl = await readFileAsDataUrl(queueItem.file);
          if (!imageDataUrl) throw new Error("File tidak terbaca.");

          const baseName = queueItem.name.replace(/\.[^.]+$/, "");
          const namePrefix = String(createName || "").trim();
          const queueCustomName = String(queueItem.customName || "").trim();
          const queueCustomTags = String(queueItem.customTags || "").trim();
          const itemName =
            queueCustomName ||
            (namePrefix.length > 0
              ? targetQueue.length === 1
                ? namePrefix
                : `${namePrefix} - ${baseName}`
              : baseName);

          const response = await fetch("/api/google-sheet-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url,
              action: "create",
              item: {
                name: itemName || queueItem.name,
                tags: queueCustomTags || String(createTags || "").trim(),
                fileName: queueItem.file.name || queueItem.name,
                mimeType: queueItem.file.type || "application/octet-stream",
                imageDataUrl,
              },
            }),
          });
          const payload = await parseApiResponse(response);
          setRawResponse(JSON.stringify(payload.remote || payload, null, 2).slice(0, 4000));
          successCount += 1;
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === queueItem.id
                ? { ...item, status: "done", message: "Uploaded" }
                : item,
            ),
          );
        } catch (error) {
          failedCount += 1;
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === queueItem.id
                ? { ...item, status: "error", message: getErrorMessage(error) }
                : item,
            ),
          );
        }
      }
    } finally {
      setIsBatchUploading(false);
    }

    setNotice(`Bulk upload selesai. Berhasil ${successCount}, gagal ${failedCount}.`);
    await loadItems();
  }, [createName, createTags, getEndpoint, loadItems, uploadQueue]);

  const handleUpdate = useCallback(async () => {
    const url = getEndpoint();
    if (!url) return;
    if (!selectedItem) {
      setNotice("Pilih item dulu untuk update.");
      return;
    }

    setIsUpdating(true);
    try {
      let imageDataUrl = "";
      if (editFile) {
        imageDataUrl = await readFileAsDataUrl(editFile);
        if (!imageDataUrl) throw new Error("File update tidak terbaca.");
      }

      const response = await fetch("/api/google-sheet-images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          action: "update",
          id: selectedItem.id,
          item: {
            id: selectedItem.id,
            name: String(editName || "").trim() || selectedItem.name || "Untitled Image",
            tags: String(editTags || "").trim(),
            driveId: String(editDriveId || "").trim(),
            fileName: editFile?.name || "",
            mimeType: editFile?.type || "application/octet-stream",
            imageDataUrl,
          },
        }),
      });

      const payload = await parseApiResponse(response);
      setRawResponse(JSON.stringify(payload.remote || payload, null, 2).slice(0, 4000));
      setNotice(`Update "${selectedItem.name}" berhasil dikirim.`);
      setEditFile(null);
      await loadItems();
    } catch (error) {
      setNotice(`Update gagal: ${getErrorMessage(error)}.`);
    } finally {
      setIsUpdating(false);
    }
  }, [editDriveId, editFile, editName, editTags, getEndpoint, loadItems, selectedItem]);

  const handleDelete = useCallback(async () => {
    const url = getEndpoint();
    if (!url) return;
    if (!selectedItem) {
      setNotice("Pilih item dulu untuk delete.");
      return;
    }
    const confirmed = window.confirm(`Hapus "${selectedItem.name}"?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/google-sheet-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          action: "delete",
          id: selectedItem.id,
          item: selectedItem,
        }),
      });

      const payload = await parseApiResponse(response);
      setRawResponse(JSON.stringify(payload.remote || payload, null, 2).slice(0, 4000));
      setNotice(`Delete "${selectedItem.name}" berhasil dikirim.`);
      await loadItems();
    } catch (error) {
      setNotice(`Delete gagal: ${getErrorMessage(error)}.`);
    } finally {
      setIsDeleting(false);
    }
  }, [getEndpoint, loadItems, selectedItem]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-50 p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-cyan-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                <span aria-hidden="true">✦</span>
                Google Drive CRUD
              </div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Upload Banyak File, CRUD, dan Preview Gambar
              </h1>
              <p className="text-xs text-slate-600 sm:text-sm">
                Upload massal langsung ke Drive + simpan metadata di Sheet. Preview memakai
                `driveId`.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Kembali ke Workspace
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] text-slate-500">Total Item</div>
              <div className="mt-0.5 text-lg font-semibold text-slate-900">{items.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] text-slate-500">Queue</div>
              <div className="mt-0.5 text-lg font-semibold text-slate-900">{queueStats.total}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] text-slate-500">Uploaded</div>
              <div className="mt-0.5 text-lg font-semibold text-emerald-700">{queueStats.done}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] text-slate-500">Endpoint Host</div>
              <div className="mt-0.5 truncate text-sm font-medium text-slate-900">{endpointHost}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Endpoint Apps Script
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className={TEXT_INPUT_CLASS}
            />
            <button
              type="button"
              onClick={() => {
                void loadItems();
              }}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SpinIndicator spinning={isLoading} />
              {isLoading ? "Loading..." : "Load List"}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <span aria-hidden="true">🗂️</span>
                Gallery Data ({items.length})
              </div>
              <button
                type="button"
                onClick={() => {
                  void loadItems();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700"
              >
                <span aria-hidden="true">↻</span>
                Refresh
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
                <div className="mx-auto text-3xl text-slate-400">🖼️</div>
                <p className="mt-2 text-xs text-slate-500">
                  Belum ada data. Jalankan upload atau create manual.
                </p>
              </div>
            ) : (
              <div className="grid max-h-[72vh] grid-cols-1 gap-3 overflow-auto pr-1 sm:grid-cols-2">
                {items.map((item) => {
                  const active = String(item.id) === String(selectedId);
                  return (
                    <div
                      key={item.id}
                      className={`overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-cyan-400 ring-2 ring-cyan-100" : "border-slate-200"}`}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="block w-full"
                        >
                          <DriveImageWithFallback
                            src={item.imageSrc}
                            driveId={item.driveId}
                            alt={item.name}
                            className="h-36 w-full object-cover"
                            loading="lazy"
                          />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/40 to-transparent" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openGalleryPreview(item.id)}
                          className="absolute right-2 top-2 rounded-lg bg-slate-900/85 px-2 py-1 text-[10px] text-white"
                        >
                          Preview
                        </button>
                      </div>
                      <div className="space-y-1 p-2.5">
                        <div className="truncate text-xs font-semibold text-slate-800">{item.name}</div>
                        <div className="truncate text-[11px] text-slate-500">id: {item.id}</div>
                        <div className="truncate text-[11px] text-slate-500">
                          driveId: {item.driveId || "-"}
                        </div>
                        <a
                          href={item.imageSrc}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-700"
                        >
                          Open image
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md">
              <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <span aria-hidden="true">⤴</span>
                Multi Upload
              </div>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  appendFiles(event.target.files);
                  event.target.value = "";
                }}
                className="hidden"
              />

              <div
                role="button"
                tabIndex={0}
                onClick={() => uploadInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    uploadInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragOver(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragOver(false);
                  appendFiles(event.dataTransfer.files);
                }}
                className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${isDragOver ? "border-cyan-400 bg-cyan-50/70" : "border-slate-300 bg-white/70 hover:bg-white"}`}
              >
                <div className="text-2xl">⤴</div>
                <div className="mt-1 text-sm font-semibold text-slate-700">
                  Drop and drop or browse files
                </div>
                <div className="text-xs text-slate-500">
                  Maksimum {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB per file
                </div>
              </div>

              <div className="mt-4 text-xs font-semibold text-slate-700">Attachments:</div>
              <div className="mt-2 space-y-2">
                {uploadQueue.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2 text-[11px] text-slate-500">
                    Belum ada file di antrean.
                  </div>
                ) : (
                  uploadQueue.map((item) => (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 rounded-xl border bg-white px-3 py-2 ${String(activeQueueId) === String(item.id) ? "border-cyan-400 ring-2 ring-cyan-100" : "border-slate-200"}`}
                    >
                      <span aria-hidden="true" className="text-slate-400">
                        🖼️
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveQueueId(item.id)}
                        className="truncate text-left text-xs font-medium text-slate-700 hover:text-cyan-700"
                      >
                        {item.customName || stripFileExtension(item.name) || item.name}
                      </button>
                      <div className="text-[11px] text-slate-500">{formatFileSize(item.size)}</div>
                      <button
                        type="button"
                        onClick={() => openQueuePreview(item.id)}
                        className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600"
                      >
                        👁
                      </button>
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] ${queueStatusClass(item.status)}`}
                        >
                          {queueStatusLabel(item.status)}
                        </span>
                        <button
                          type="button"
                          disabled={item.status === "uploading" || isBatchUploading}
                          onClick={() => removeQueueItem(item.id)}
                          className="rounded-md px-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-40"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleUploadMany();
                  }}
                  disabled={isBatchUploading || queueStats.pending + queueStats.error < 1}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SpinIndicator spinning={isBatchUploading} />
                  {isBatchUploading ? "Uploading..." : "Upload Semua"}
                </button>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                >
                  Tambah File
                </button>
                <button
                  type="button"
                  onClick={clearUploadedQueue}
                  disabled={queueStats.done < 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-45"
                >
                  Clear Uploaded
                </button>
                <button
                  type="button"
                  onClick={clearAllQueue}
                  disabled={queueStats.total < 1 || isBatchUploading}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-45"
                >
                  Clear All
                </button>
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Thumbnails
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {uploadQueue.map((item) => (
                    <button
                      key={`thumb-${item.id}`}
                      type="button"
                      onClick={() => setActiveQueueId(item.id)}
                      className={`group relative h-20 min-w-28 overflow-hidden rounded-xl border bg-white ${String(activeQueueId) === String(item.id) ? "border-cyan-400 ring-2 ring-cyan-100" : "border-slate-200"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-1 py-1 text-left text-[10px] text-white">
                        {formatFileSize(item.size)}
                      </div>
                      <div className="pointer-events-none absolute left-1 top-1 rounded bg-slate-900/70 px-1 py-0.5 text-[9px] text-white">
                        {item.customName || stripFileExtension(item.name)}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="h-20 min-w-20 rounded-xl border border-dashed border-slate-300 bg-white text-2xl text-slate-400"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 text-xs font-semibold text-slate-700">
                  File Dipilih Untuk Upload
                </div>
                {!activeQueueItem ? (
                  <div className="text-[11px] text-slate-500">
                    Klik thumbnail atau nama file pada attachments untuk memilih file.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_1fr]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeQueueItem.previewUrl}
                      alt={activeQueueItem.name}
                      className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                    />
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={activeQueueItem.customName || ""}
                        onChange={(event) =>
                          updateQueueItem(activeQueueItem.id, {
                            customName: event.target.value,
                          })
                        }
                        placeholder="Nama upload file ini"
                        className={TEXT_INPUT_CLASS}
                      />
                      <input
                        type="text"
                        value={activeQueueItem.customTags || ""}
                        onChange={(event) =>
                          updateQueueItem(activeQueueItem.id, {
                            customTags: event.target.value,
                          })
                        }
                        placeholder="Tags upload file ini"
                        className={TEXT_INPUT_CLASS}
                      />
                      <div className="text-[11px] text-slate-500">
                        File asli: {activeQueueItem.name} • {formatFileSize(activeQueueItem.size)} •{" "}
                        {queueStatusLabel(activeQueueItem.status)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-xs font-semibold text-slate-700">Defaults & Manual Create</div>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Nama default / prefix (opsional)"
                    className={TEXT_INPUT_CLASS}
                  />
                  <input
                    type="text"
                    value={createTags}
                    onChange={(event) => setCreateTags(event.target.value)}
                    placeholder="Tags default (contoh: implant,left)"
                    className={TEXT_INPUT_CLASS}
                  />
                  <input
                    type="text"
                    value={createDriveId}
                    onChange={(event) => setCreateDriveId(event.target.value)}
                    placeholder="Drive ID manual (opsional)"
                    className={TEXT_INPUT_CLASS}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleCreateByDriveId();
                  }}
                  disabled={isCreating}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create by Drive ID"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md">
              <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <span aria-hidden="true">⚙</span>
                Update / Delete
              </div>

              {!selectedItem ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 text-xs text-slate-500">
                  Pilih item di gallery dulu untuk edit atau hapus.
                </div>
              ) : (
                <>
                  <div className="mb-2 rounded-xl border border-slate-200 bg-white p-2">
                    <div className="truncate text-xs font-semibold text-slate-800">
                      {selectedItem.name}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">id: {selectedItem.id}</div>
                  </div>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      placeholder="Nama"
                      className={TEXT_INPUT_CLASS}
                    />
                    <input
                      type="text"
                      value={editTags}
                      onChange={(event) => setEditTags(event.target.value)}
                      placeholder="Tags"
                      className={TEXT_INPUT_CLASS}
                    />
                    <input
                      type="text"
                      value={editDriveId}
                      onChange={(event) => setEditDriveId(event.target.value)}
                      placeholder="Drive ID"
                      className={TEXT_INPUT_CLASS}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setEditFile(event.target.files?.[0] || null)}
                      className={FILE_INPUT_CLASS}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleUpdate();
                      }}
                      disabled={isUpdating}
                      className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? "Updating..." : "Update"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDelete();
                      }}
                      disabled={isDeleting}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span aria-hidden="true">🗑</span>
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur-md">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Status
          </div>
          <div className={`rounded-xl border px-3 py-2 text-xs ${noticeTone}`}>{notice}</div>
          {rawResponse ? (
            <pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-[10px] text-slate-100">
              {rawResponse}
            </pre>
          ) : null}
        </section>
      </div>

      <PhotoPreviewModal
        open={previewModalState.open}
        title={previewModalState.title}
        items={previewModalState.items}
        initialIndex={previewModalState.initialIndex}
        onClose={closePreviewModal}
      />
    </main>
  );
}
