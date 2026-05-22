"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  Eraser,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { buildAdminMasterSeedRows } from "../master-seed-data";
import DriveImageWithFallback from "@/components/DriveImageWithFallback";
import { extractDriveFileId, normalizeImageUrl } from "@/lib/googleSheetImageUtils";

const GOOGLE_SHEET_ENDPOINT =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT ||
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
  "";

const ACTION_LIST_CANDIDATES = [
  "list_instrument_profiles",
  "read_instrument_profiles",
  "list",
  "read",
];
const ACTION_CREATE = "create_instrument_profile";
const ACTION_UPDATE = "update_instrument_profile";
const ACTION_DELETE = "delete_instrument_profile";
const ACTION_SCAN_ORPHAN_DRIVE_FILES = "scan_orphan_drive_files";
const ACTION_DELETE_ORPHAN_DRIVE_FILES = "delete_orphan_drive_files";
const INSTRUMENT_PROFILE_SHEET_NAME = "InstrumentProfiles";
const PREVIEW_ZOOM_MIN = 1;
const PREVIEW_ZOOM_MAX = 3;
const PREVIEW_ZOOM_STEP = 0.25;

const PROCEDURES = [
  { key: "tkr", label: "TKR" },
  { key: "thr", label: "THR" },
  { key: "bipolar", label: "Bipolar" },
  { key: "stem", label: "Stem" },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeProcedureKey(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (raw === "tkr" || raw === "thr" || raw === "bipolar" || raw === "stem") {
    return raw;
  }
  return "";
}

function normalizeCatalogNo(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function isMobileViewportNow() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1279px)").matches;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = value;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDateTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const procedureKey = normalizeProcedureKey(
        row?.procedureKey || row?.procedure || row?.systemKey
      );
      const catalogNo = normalizeCatalogNo(row?.catalogNo || row?.code);
      const qtyValue = Number(row?.qty || row?.piece || 1);

      const driveId = extractDriveFileId(
        row?.driveId ||
          row?.driveid ||
          row?.drive_id ||
          row?.["drive id"] ||
          row?.fileId ||
          row?.file_id ||
          row?.googleDriveId ||
          row?.imageSrc ||
          row?.imageUrl ||
          row?.photoUrl ||
          row?.image ||
          ""
      );
      const imageUrl = normalizeImageUrl(
        String(row?.imageSrc || row?.imageUrl || row?.photoUrl || row?.image || "").trim(),
        driveId
      );

      return {
        id: String(row?.id || "").trim() || `${procedureKey}-${catalogNo}`,
        procedureKey,
        catalogNo,
        name: String(row?.name || "").trim(),
        category: String(row?.category || "Tray").trim() || "Tray",
        qty: Number.isFinite(qtyValue) && qtyValue > 0 ? Math.round(qtyValue) : 1,
        driveId,
        imageUrl,
        updatedAt: String(row?.updatedAt || "").trim(),
      };
    })
    .filter((row) => row.procedureKey && row.catalogNo && row.name)
    .sort((a, b) => {
      if (a.procedureKey !== b.procedureKey) {
        return a.procedureKey.localeCompare(b.procedureKey);
      }
      return a.catalogNo.localeCompare(b.catalogNo);
    });
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

function extractProfileRowsFromRemote(remote) {
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
    return extractProfileRowsFromRemote(parsedPayload);
  }

  if (typeof remote.payload === "string") {
    return parseCsvRows(remote.payload);
  }

  return [];
}

const INITIAL_FORM = {
  procedureKey: "tkr",
  catalogNo: "",
  name: "",
  category: "Tray",
  qty: "1",
};

export default function AdminInstrumentProfilePage() {
  const [items, setItems] = useState([]);
  const [filterProcedure, setFilterProcedure] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [driveInput, setDriveInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [scanningOrphans, setScanningOrphans] = useState(false);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [orphanScanReport, setOrphanScanReport] = useState(null);
  const [orphanScanRows, setOrphanScanRows] = useState([]);
  const [orphanDuplicateGroups, setOrphanDuplicateGroups] = useState([]);
  const [orphanScanFolderName, setOrphanScanFolderName] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [focusItemId, setFocusItemId] = useState("");
  const [highlightItemId, setHighlightItemId] = useState("");
  const [previewItemId, setPreviewItemId] = useState("");
  const [previewZoom, setPreviewZoom] = useState(PREVIEW_ZOOM_MIN);
  const itemRefs = useRef(new Map());

  const filteredItems = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filterProcedure !== "all" && item.procedureKey !== filterProcedure) return false;
      if (!search) return true;
      return [item.catalogNo, item.name, item.category, item.procedureKey]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [filterProcedure, items, searchQuery]);

  const previewIndex = useMemo(() => {
    if (!previewItemId) return -1;
    return filteredItems.findIndex((item) => item.id === previewItemId);
  }, [filteredItems, previewItemId]);

  const previewItem =
    previewIndex >= 0
      ? filteredItems[previewIndex]
      : items.find((item) => item.id === previewItemId) || null;
  const previewHasPrev = previewIndex > 0;
  const previewHasNext = previewIndex >= 0 && previewIndex < filteredItems.length - 1;

  const openPreview = useCallback((itemId) => {
    if (!itemId) return;
    setPreviewItemId(String(itemId));
  }, []);

  const closePreview = useCallback(() => {
    setPreviewItemId("");
  }, []);

  const zoomInPreview = useCallback(() => {
    setPreviewZoom((prev) =>
      Math.min(PREVIEW_ZOOM_MAX, Number((prev + PREVIEW_ZOOM_STEP).toFixed(2)))
    );
  }, []);

  const zoomOutPreview = useCallback(() => {
    setPreviewZoom((prev) =>
      Math.max(PREVIEW_ZOOM_MIN, Number((prev - PREVIEW_ZOOM_STEP).toFixed(2)))
    );
  }, []);

  const resetPreviewZoom = useCallback(() => {
    setPreviewZoom(PREVIEW_ZOOM_MIN);
  }, []);

  const onPreviewWheel = useCallback((event) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? PREVIEW_ZOOM_STEP : -PREVIEW_ZOOM_STEP;
    setPreviewZoom((prev) => {
      const next = Number((prev + delta).toFixed(2));
      return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, next));
    });
  }, []);

  const goToPrevPreview = useCallback(() => {
    if (!previewHasPrev) return;
    const prevItem = filteredItems[previewIndex - 1];
    if (prevItem?.id) setPreviewItemId(prevItem.id);
  }, [filteredItems, previewHasPrev, previewIndex]);

  const goToNextPreview = useCallback(() => {
    if (!previewHasNext) return;
    const nextItem = filteredItems[previewIndex + 1];
    if (nextItem?.id) setPreviewItemId(nextItem.id);
  }, [filteredItems, previewHasNext, previewIndex]);

  const notify = useCallback((type, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const callAction = useCallback(async (action, payload = {}) => {
    if (!GOOGLE_SHEET_ENDPOINT) {
      throw new Error("NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT belum diisi.");
    }

    const response = await fetch("/api/google-sheet-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: GOOGLE_SHEET_ENDPOINT,
        action,
        sheet: INSTRUMENT_PROFILE_SHEET_NAME,
        sheetName: INSTRUMENT_PROFILE_SHEET_NAME,
        table: INSTRUMENT_PROFILE_SHEET_NAME,
        ...payload,
      }),
    });

    const result = await response.json();
    const remote = result?.remote || result || {};
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
          `Request gagal (HTTP ${response.status}).`
      );
    }

    return remote;
  }, []);

  const loadProfiles = useCallback(async (silent = false) => {
    if (!silent) setMessage("");
    setLoading(true);
    try {
      let rows = [];
      let lastError = "";

      for (const actionName of ACTION_LIST_CANDIDATES) {
        try {
          const remote = await callAction(actionName);
          rows = extractProfileRowsFromRemote(remote);
          if (rows.length) break;
        } catch (error) {
          lastError = error?.message || "Gagal membaca profile instrument.";
        }
      }

      if (!rows.length && lastError) {
        throw new Error(lastError);
      }

      const normalized = normalizeRows(rows);
      setItems(normalized);
      if (!silent) {
        setMessage(`Data profile ter-sync (${normalized.length} item).`);
      }
    } catch (error) {
      setMessage(error?.message || "Gagal memuat data profile.");
    } finally {
      setLoading(false);
    }
  }, [callAction]);

  useEffect(() => {
    loadProfiles(true);
  }, [loadProfiles]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 1279px)");
    const updateViewport = () => setIsMobileViewport(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileFormOpen(false);
      return undefined;
    }
    if (!mobileFormOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileViewport, mobileFormOpen]);

  useEffect(() => {
    if (!focusItemId) return undefined;
    const target = itemRefs.current.get(focusItemId);
    if (!target) return undefined;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightItemId(focusItemId);
    setFocusItemId("");
    const timer = window.setTimeout(() => {
      setHighlightItemId((current) => (current === focusItemId ? "" : current));
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [focusItemId, items]);

  useEffect(() => {
    setPreviewZoom(PREVIEW_ZOOM_MIN);
  }, [previewItemId]);

  useEffect(() => {
    if (!previewItemId) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closePreview();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevPreview();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextPreview();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewItemId, closePreview, goToPrevPreview, goToNextPreview]);

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditId("");
    setImageFile(null);
    setImagePreview("");
    setDriveInput("");
    setMobileFormOpen(false);
  }

  function startEdit(item) {
    const shouldOpenModal = isMobileViewportNow();
    setEditId(item.id);
    setForm({
      procedureKey: item.procedureKey,
      catalogNo: item.catalogNo,
      name: item.name,
      category: item.category || "Tray",
      qty: String(item.qty || 1),
    });
    setImageFile(null);
    setImagePreview(item.imageUrl || "");
    setDriveInput(item.driveId || "");
    if (shouldOpenModal) {
      setIsMobileViewport(true);
      setMobileFormOpen(true);
    }
  }

  function openMobileCreateForm() {
    setForm(INITIAL_FORM);
    setEditId("");
    setImageFile(null);
    setImagePreview("");
    setDriveInput("");
    setMobileFormOpen(true);
  }

  async function onPickImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSizeMb = 4;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setMessage(`Ukuran foto maksimal ${maxSizeMb} MB.`);
      return;
    }

    setImageFile(file);
    const base64 = await fileToBase64(file);
    setImagePreview(base64);
  }

  async function fetchLocalImageAsDataUrl(imageUrl) {
    if (!imageUrl || !String(imageUrl).startsWith("/")) return "";
    const response = await fetch(imageUrl);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await fileToBase64(blob);
  }

  async function handleSeedAllMasterToSheet() {
    setMessage("");

    const confirmed = window.confirm(
      "Masukkan semua master checklist (TKR/THR/Bipolar/Stem) ke Google Sheet sekarang?"
    );
    if (!confirmed) return;

    setBulkSaving(true);
    try {
      const rows = buildAdminMasterSeedRows();
      const imageCache = new Map();
      let successCount = 0;
      let photoUploadedCount = 0;
      const errors = [];

      for (const row of rows) {
        const item = {
          id: String(row.id || `${row.procedureKey}-${row.catalogNo}`).trim(),
          procedureKey: String(row.procedureKey || "").trim(),
          catalogNo: normalizeCatalogNo(row.catalogNo),
          name: String(row.name || "").trim(),
          category: String(row.category || "Tray").trim() || "Tray",
          qty: Number(row.qty || 1),
        };

        const imageUrl = String(row.imageUrl || "").trim();
        if (imageUrl.startsWith("/")) {
          if (!imageCache.has(imageUrl)) {
            const dataUrl = await fetchLocalImageAsDataUrl(imageUrl);
            imageCache.set(imageUrl, dataUrl || "");
          }
          const dataUrl = imageCache.get(imageUrl) || "";
          if (dataUrl) {
            const ext = imageUrl.split(".").pop()?.toLowerCase() || "jpg";
            item.imageDataUrl = dataUrl;
            item.mimeType = ext === "png" ? "image/png" : "image/jpeg";
            item.fileName = `${item.procedureKey}-${item.catalogNo}.${ext === "png" ? "png" : "jpg"}`;
          }
        }

        try {
          await callAction(ACTION_CREATE, {
            id: item.id,
            item,
            deleteOldDriveFile: false,
          });
          successCount += 1;
          if (item.imageDataUrl) photoUploadedCount += 1;
        } catch (error) {
          errors.push(`${item.procedureKey.toUpperCase()} ${item.catalogNo}`);
        }
      }

      await loadProfiles(true);
      const errorSuffix = errors.length ? ` Gagal ${errors.length} item.` : "";
      setMessage(
        `Seed selesai: ${successCount}/${rows.length} item masuk sheet, foto terupload ${photoUploadedCount}.${errorSuffix}`
      );
      if (errors.length) {
        console.error("Seed instrument profile errors", errors.slice(0, 50));
      }
    } catch (error) {
      setMessage(error?.message || "Gagal seed master checklist ke Google Sheet.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function scanDriveOrphans({ silent = false } = {}) {
    if (!silent) setMessage("");
    setScanningOrphans(true);
    try {
      const remote = await callAction(ACTION_SCAN_ORPHAN_DRIVE_FILES, {
        maxScan: 10000,
        previewLimit: 30,
      });
      const summary = remote?.summary || {};
      const rows = Array.isArray(remote?.orphanFiles) ? remote.orphanFiles : [];
      const groups = Array.isArray(remote?.duplicates?.orphanGroups)
        ? remote.duplicates.orphanGroups
        : [];
      const nextReport = {
        scanned: Number(summary.scanned || 0),
        usedInScannedFolder: Number(summary.usedInScannedFolder || 0),
        orphanInScannedFolder: Number(summary.orphanInScannedFolder || 0),
        previewCount: Number(summary.previewCount || 0),
        scanTruncated: Boolean(summary.scanTruncated),
        maxScan: Number(summary.maxScan || 0),
        at: new Date().toISOString(),
      };
      setOrphanScanReport(nextReport);
      setOrphanScanRows(rows);
      setOrphanDuplicateGroups(groups);
      setOrphanScanFolderName(String(remote?.folderName || ""));
      if (!silent) {
        setMessage(
          `Scan Drive selesai. Scanned ${nextReport.scanned} · orphan ${nextReport.orphanInScannedFolder} · used ${nextReport.usedInScannedFolder}.`
        );
        notify(
          nextReport.orphanInScannedFolder > 0 ? "warning" : "success",
          nextReport.orphanInScannedFolder > 0
            ? `Scan selesai: ditemukan ${nextReport.orphanInScannedFolder} file orphan.`
            : "Scan selesai: tidak ada orphan file."
        );
      }
      return nextReport;
    } catch (error) {
      if (!silent) {
        setMessage(error?.message || "Gagal scan file orphan di Drive.");
        notify("error", error?.message || "Gagal scan file orphan di Drive.");
      }
      return null;
    } finally {
      setScanningOrphans(false);
    }
  }

  async function handleCleanOrphans(onlyDuplicates) {
    const confirmed = window.confirm(
      onlyDuplicates
        ? "Hapus file orphan yang duplikat saja (masuk Trash)?"
        : "Hapus semua file orphan (masuk Trash)?"
    );
    if (!confirmed) return;

    setMessage("");
    setCleaningOrphans(true);
    try {
      const remote = await callAction(ACTION_DELETE_ORPHAN_DRIVE_FILES, {
        confirmDelete: true,
        onlyDuplicates: Boolean(onlyDuplicates),
        maxDelete: 3000,
        maxScan: 10000,
        previewLimit: 3000,
      });
      const summary = remote?.summary || {};
      const deleted = Number(summary.deleted || 0);
      const failed = Number(summary.failed || 0);
      const mode = String(
        summary.mode || (onlyDuplicates ? "duplicates-only" : "all-orphans")
      );
      setMessage(
        `Clean Drive selesai (${mode}). Deleted ${deleted} file · failed ${failed} file.`
      );
      notify("success", `Clean selesai: ${deleted} file di-trash, ${failed} gagal.`);
      await scanDriveOrphans({ silent: true });
    } catch (error) {
      setMessage(error?.message || "Gagal membersihkan file orphan.");
      notify("error", error?.message || "Gagal membersihkan file orphan.");
    } finally {
      setCleaningOrphans(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const procedureKey = normalizeProcedureKey(form.procedureKey);
    const catalogNo = normalizeCatalogNo(form.catalogNo);
    const name = String(form.name || "").trim();
    const category = String(form.category || "Tray").trim() || "Tray";
    const qtyValue = Number(form.qty || 1);
    const driveIdInput = extractDriveFileId(driveInput);

    if (!procedureKey || !catalogNo || !name) {
      setMessage("Procedure, Kode, dan Deskripsi wajib diisi.");
      return;
    }
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      setMessage("Piece harus lebih dari 0.");
      return;
    }

    setSaving(true);
    try {
      let imageDataUrl = "";
      let mimeType = "";
      let fileName = "";
      if (imageFile) {
        imageDataUrl = await fileToBase64(imageFile);
        mimeType = imageFile.type || "";
        fileName = imageFile.name || "";
      }

      const payloadItem = {
        id: editId || `${procedureKey}-${catalogNo}`,
        procedureKey,
        catalogNo,
        name,
        category,
        qty: Math.round(qtyValue),
      };

      if (driveIdInput) {
        payloadItem.driveId = driveIdInput;
      }

      if (imageDataUrl) {
        payloadItem.imageDataUrl = imageDataUrl;
        payloadItem.mimeType = mimeType || "image/jpeg";
        payloadItem.fileName = fileName || `${procedureKey}-${catalogNo}.jpg`;
      }

      const submitPayload = {
        id: payloadItem.id,
        item: payloadItem,
        deleteOldDriveFile: true,
      };

      if (editId) {
        try {
          await callAction(ACTION_UPDATE, submitPayload);
        } catch (error) {
          const msg = String(error?.message || "").toLowerCase();
          const shouldFallbackToCreate =
            msg.includes("tidak ditemukan") || msg.includes("not found");
          if (!shouldFallbackToCreate) throw error;
          await callAction(ACTION_CREATE, submitPayload);
        }
      } else {
        await callAction(ACTION_CREATE, submitPayload);
      }

      setFilterProcedure(procedureKey);
      setSearchQuery(catalogNo);
      resetForm();
      await loadProfiles(true);
      setFocusItemId(payloadItem.id);
      setMessage(
        editId
          ? `Instrument ${catalogNo} berhasil diupdate dan data sudah di-refresh.`
          : `Instrument ${catalogNo} berhasil ditambahkan dan data sudah di-refresh.`
      );
      notify(
        "success",
        editId
          ? `Update ${catalogNo} berhasil.`
          : `Tambah ${catalogNo} berhasil.`
      );
    } catch (error) {
      const rawError = String(error?.message || "");
      if (rawError.toLowerCase().includes("driveapp")) {
        setMessage(
          "Upload dari Apps Script ditolak (DriveApp). Isi kolom Drive ID/Link dengan file yang sudah diupload ke Google Drive, lalu klik Update lagi."
        );
        notify(
          "error",
          "Upload ditolak Apps Script (DriveApp). Gunakan Drive ID/Link."
        );
      } else {
        setMessage(rawError || "Gagal menyimpan instrument.");
        notify("error", rawError || "Gagal menyimpan instrument.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Hapus instrument ${item.catalogNo} - ${item.name}?`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setMessage("");
    try {
      await callAction(ACTION_DELETE, {
        id: item.id,
        deleteDriveFile: true,
      });
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      if (editId === item.id) resetForm();
      setMessage("Instrument berhasil dihapus.");
      notify("success", `${item.catalogNo} berhasil dihapus.`);
    } catch (error) {
      setMessage(error?.message || "Gagal menghapus instrument.");
      notify("error", error?.message || "Gagal menghapus instrument.");
    } finally {
      setDeletingId("");
    }
  }

  function renderEditorForm(options = {}) {
    const inModal = Boolean(options.inModal);
    return (
      <form
        onSubmit={handleSubmit}
        className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
          inModal ? "max-h-[85vh] overflow-y-auto" : ""
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? "Edit Instrument" : "Tambah Instrument"}
          </h2>
          <div className="flex items-center gap-2">
            {editId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
                Batal Edit
              </button>
            ) : null}
            {inModal ? (
              <button
                type="button"
                onClick={() => setMobileFormOpen(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
                Tutup
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <select
            value={form.procedureKey}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, procedureKey: event.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            {PROCEDURES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            value={form.catalogNo}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, catalogNo: event.target.value.toUpperCase() }))
            }
            placeholder="Kode instrument *"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />

          <input
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Deskripsi instrument *"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="Group"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <input
              value={form.qty}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, qty: event.target.value }))
              }
              type="number"
              min={1}
              placeholder="Piece"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Upload size={14} />
            Upload Foto Instrument
            <input
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="hidden"
            />
          </label>

          <input
            value={driveInput}
            onChange={(event) => setDriveInput(event.target.value)}
            placeholder="Drive ID / Link (opsional, untuk override foto)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />

          {imagePreview ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
              <DriveImageWithFallback
                src={imagePreview}
                alt="Preview instrument"
                className="h-28 w-full rounded-lg object-cover"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : editId ? <Save size={15} /> : <Plus size={15} />}
            {editId ? "Update Instrument" : "Tambah Instrument"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold md:text-2xl">
                Admin · Manager Foto Checklist Instrument
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Upload, update, dan hapus foto instrument. Data disimpan ke Google Sheet + Drive.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadProfiles()}
                disabled={
                  loading ||
                  saving ||
                  bulkSaving ||
                  scanningOrphans ||
                  cleaningOrphans
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                Refresh
              </button>
              <button
                type="button"
                onClick={() => scanDriveOrphans()}
                disabled={
                  loading ||
                  saving ||
                  bulkSaving ||
                  scanningOrphans ||
                  cleaningOrphans
                }
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scanningOrphans ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                Scan Drive
              </button>
              <button
                type="button"
                onClick={() => handleCleanOrphans(true)}
                disabled={
                  loading ||
                  saving ||
                  bulkSaving ||
                  scanningOrphans ||
                  cleaningOrphans
                }
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cleaningOrphans ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Eraser size={14} />
                )}
                Clean Duplikat
              </button>
              <button
                type="button"
                onClick={handleSeedAllMasterToSheet}
                disabled={
                  bulkSaving ||
                  saving ||
                  loading ||
                  scanningOrphans ||
                  cleaningOrphans
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Seed Semua Checklist
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

        {isMobileViewport ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openMobileCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={14} />
              Tambah Instrument
            </button>
          </div>
        ) : null}

        <section className={`grid gap-4 ${isMobileViewport ? "" : "lg:grid-cols-[340px_1fr]"}`}>
          {!isMobileViewport ? renderEditorForm() : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 grid gap-2 md:grid-cols-[160px_1fr]">
              <select
                value={filterProcedure}
                onChange={(event) => setFilterProcedure(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              >
                <option value="all">Semua Procedure</option>
                {PROCEDURES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari kode, nama, atau group"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-2">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  ref={(element) => {
                    if (element) itemRefs.current.set(item.id, element);
                    else itemRefs.current.delete(item.id);
                  }}
                  className={`rounded-xl border bg-slate-50 p-3 transition ${
                    highlightItemId === item.id
                      ? "border-emerald-300 ring-2 ring-emerald-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <DriveImageWithFallback
                        src={item.imageUrl}
                        driveId={item.driveId}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        {item.procedureKey}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.catalogNo} · {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.category} · Piece: {item.qty}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openPreview(item.id)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                        title="Preview"
                      >
                        <ImageIcon size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="rounded-lg border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Hapus"
                      >
                        {deletingId === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {!filteredItems.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                  Data instrument tidak ditemukan.
                </div>
              ) : null}
            </div>
          </section>
        </section>

        {isMobileViewport && mobileFormOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3"
            onClick={() => setMobileFormOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-2 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {renderEditorForm({ inModal: true })}
            </div>
          </div>
        ) : null}

        <AnimatePresence>
          {previewItem ? (
            <motion.div
              key="admin-preview-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3"
              onClick={closePreview}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {String(previewItem.procedureKey || "").toUpperCase()} · {previewItem.category || "Tray"}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {previewItem.catalogNo} · {previewItem.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goToPrevPreview}
                      disabled={!previewHasPrev}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={goToNextPreview}
                      disabled={!previewHasNext}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={closePreview}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                      aria-label="Tutup preview"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Zoom {Math.round(previewZoom * 100)}%
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={zoomOutPreview}
                          disabled={previewZoom <= PREVIEW_ZOOM_MIN}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={zoomInPreview}
                          disabled={previewZoom >= PREVIEW_ZOOM_MAX}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={resetPreviewZoom}
                          disabled={previewZoom === PREVIEW_ZOOM_MIN}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          100%
                        </button>
                      </div>
                    </div>
                    <div
                      className="flex h-60 w-full items-center justify-center overflow-hidden"
                      onWheel={onPreviewWheel}
                    >
                      {previewItem.imageUrl ? (
                        <DriveImageWithFallback
                          src={previewItem.imageUrl}
                          driveId={previewItem.driveId}
                          alt={previewItem.name}
                          className="h-full w-full object-contain transition-transform duration-150"
                          style={{
                            transform: `scale(${previewZoom})`,
                            transformOrigin: "center center",
                          }}
                        />
                      ) : (
                        <div className="flex h-60 w-full flex-col items-center justify-center gap-1 text-slate-400">
                          <ImageIcon size={26} />
                          <p className="text-xs font-medium">No image</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-slate-700">
                      <span className="font-semibold">ID:</span> {previewItem.id}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Kode:</span> {previewItem.catalogNo}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Deskripsi:</span> {previewItem.name}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Piece:</span> {previewItem.qty}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold">Drive ID:</span> {previewItem.driveId || "-"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {previewIndex >= 0
                        ? `Item ${previewIndex + 1} dari ${filteredItems.length}`
                        : ""}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Shortcut: ← Prev · → Next · Esc Close
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {message ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        ) : null}

        {orphanScanReport ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-900 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 font-semibold">
              <AlertTriangle size={14} />
              Ringkasan Scan Drive
            </div>
            <p className="mt-1">
              {orphanScanFolderName ? `folder ${orphanScanFolderName} · ` : ""}
              scanned {orphanScanReport.scanned} · orphan {orphanScanReport.orphanInScannedFolder} · used{" "}
              {orphanScanReport.usedInScannedFolder} · preview {orphanScanReport.previewCount}
              {orphanScanReport.scanTruncated ? ` · truncated (max ${orphanScanReport.maxScan})` : ""}
            </p>
            {orphanDuplicateGroups.length ? (
              <div className="mt-2">
                <p className="font-semibold">Duplikat terdeteksi:</p>
                <ul className="mt-1 space-y-1">
                  {orphanDuplicateGroups.slice(0, 5).map((group) => (
                    <li key={group.key} className="rounded-md bg-white/70 px-2 py-1">
                      {group.count} file · key: {group.key}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {orphanScanRows.length ? (
              <div className="mt-2 overflow-x-auto rounded-lg border border-indigo-100 bg-white/80">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="bg-indigo-100/80 text-indigo-900">
                    <tr>
                      <th className="px-2 py-1.5">Nama File</th>
                      <th className="px-2 py-1.5">Drive ID</th>
                      <th className="px-2 py-1.5">Size</th>
                      <th className="px-2 py-1.5">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orphanScanRows.slice(0, 30).map((row) => (
                      <tr key={row.driveId} className="border-t border-indigo-100">
                        <td className="px-2 py-1.5">
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-700 underline-offset-2 hover:underline"
                            title={row.name}
                          >
                            {row.name || "Untitled"}
                          </a>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px]">
                          {String(row.driveId || "").slice(0, 14)}...
                        </td>
                        <td className="px-2 py-1.5">{formatBytes(row.sizeBytes)}</td>
                        <td className="px-2 py-1.5">{formatDateTime(row.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {notifications.length ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`pointer-events-auto rounded-lg border px-3 py-2 text-xs shadow-lg ${
                item.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : item.type === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {item.text}
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
