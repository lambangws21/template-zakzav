"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Database,
  Eraser,
  LayoutDashboard,
  Image as ImageIcon,
  Loader2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { buildMasterSeedRows } from "../master-seed-data";
import DriveImageWithFallback from "@/components/DriveImageWithFallback.jsx";
import {
  FloatingInputField,
  FloatingSelectField,
  FloatingTextareaField,
} from "@/components/FloatingFields";
import { extractDriveFileId, normalizeImageUrl } from "@/lib/googleSheetImageUtils";

const GOOGLE_SHEET_ENDPOINT =
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT ||
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzuQk2jdWiJT8ANVR3XdoFQiWInwMGnJM9ZtHUHIf6MipXdNs5moRMx4NV-nXzfJ_6q/exec";

const PROFILE_TYPE_OPTIONS = [
  { key: "instrument", label: "Instrument" },
  { key: "implant", label: "Implant" },
];
const PROFILE_SHEET_BY_TYPE = {
  instrument: "InstrumentProfiles",
  implant: "ImplantProfiles",
};
const ACTION_LIST_CANDIDATES_BY_TYPE = {
  instrument: [
    "list_instrument_profiles",
    "read_instrument_profiles",
    "list",
    "read",
  ],
  implant: [
    "list_implant_profiles",
    "read_implant_profiles",
    "list",
    "read",
  ],
};
const ACTION_CREATE_BY_TYPE = {
  instrument: "create_instrument_profile",
  implant: "create_implant_profile",
};
const ACTION_UPDATE_BY_TYPE = {
  instrument: "update_instrument_profile",
  implant: "update_implant_profile",
};
const ACTION_DELETE_BY_TYPE = {
  instrument: "delete_instrument_profile",
  implant: "delete_implant_profile",
};
const ACTION_SCAN_ORPHAN_DRIVE_FILES = "scan_orphan_drive_files";
const ACTION_DELETE_ORPHAN_DRIVE_FILES = "delete_orphan_drive_files";
const ACTION_USAGE_SNAPSHOT_CANDIDATES = [
  "snapshot",
  "overview",
  "read_all",
  "list_all",
  "all",
];
const ACTION_USAGE_LIST_CANDIDATES = [
  "list_implant_usage",
  "read_implant_usage",
  "listimplantusage",
  "readimplantusage",
];
const USAGE_REFRESH_INTERVAL_MS = 20_000;
const PREVIEW_ZOOM_MIN = 1;
const PREVIEW_ZOOM_MAX = 3;
const PREVIEW_ZOOM_STEP = 0.25;
const DEFAULT_SIGNATURE_ROLE_OPTIONS = [
  "Dokter",
  "Asisten Dokter",
  "Nurse",
  "TS / Sales",
  "Logistik",
];

const PROCEDURES = [
  { key: "tkr", label: "TKR" },
  { key: "thr", label: "THR" },
  { key: "bipolar", label: "Bipolar" },
  { key: "stem", label: "Stem" },
];

const ADMIN_SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "usage", label: "Implant Monitor", icon: ClipboardList },
  { key: "instruments", label: "Instrument", icon: Database },
];

const ACTION_USAGE_REVIEW_UPDATE_CANDIDATES = [
  "update_implant_usage_review",
  "updateimplantusagereview",
  "set_implant_usage_review_status",
  "setimplantusagereviewstatus",
  "update_implant_usage_submission",
  "updateimplantusagesubmission",
];

const REVIEW_STATUS_OPTIONS = [
  { value: "reviewed", label: "Reviewed" },
  { value: "follow_up", label: "Follow Up" },
  { value: "resolved", label: "Resolved" },
];

function createEmptySignatureRow(index) {
  return {
    id: `sig-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    signatureId: "",
    roleLabel: DEFAULT_SIGNATURE_ROLE_OPTIONS[0],
    personName: "",
  };
}

function createUsageManageInitialForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    submissionId: "",
    operationDate: today,
    doctorName: "",
    hospitalName: "",
    repAssist: "",
    systemName: "",
    invoiceTo: "",
    patientName: "",
    medrec: "",
    region: "",
    slotsCount: 0,
    slotsWithPhoto: 0,
    signaturesCount: 0,
    signaturesWithPhoto: 0,
    note: "",
    reviewStatus: "",
  };
}

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

function toObjectSafe(value) {
  return value && typeof value === "object" ? value : {};
}

function toArraySafe(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeUsageSnapshotFromRemote(remote) {
  const root = toObjectSafe(remote);
  const rootData = toObjectSafe(root.data);

  const submissions = toArraySafe(
    root.implantUsageSubmissions || rootData.implantUsageSubmissions
  );
  const items = toArraySafe(root.implantUsageItems || rootData.implantUsageItems);
  const signatures = toArraySafe(
    root.implantUsageSignatures || rootData.implantUsageSignatures
  );

  const counts = toObjectSafe(root.counts);
  const submissionsCount = Number(counts.implantUsageSubmissions || submissions.length || 0);
  const itemsCount = Number(counts.implantUsageItems || items.length || 0);
  const signaturesCount = Number(counts.implantUsageSignatures || signatures.length || 0);

  return {
    submissions,
    items,
    signatures,
    counts: {
      submissions: Number.isFinite(submissionsCount) ? submissionsCount : submissions.length,
      items: Number.isFinite(itemsCount) ? itemsCount : items.length,
      signatures: Number.isFinite(signaturesCount) ? signaturesCount : signatures.length,
    },
  };
}

function toTimeValue(dateString) {
  const parsed = new Date(String(dateString || ""));
  const value = parsed.getTime();
  return Number.isFinite(value) ? value : 0;
}

function getUsageRowKey(row, index) {
  const submissionId = String(row?.submissionId || "").trim();
  const createdAt = String(row?.createdAt || row?.operationDate || "").trim();
  const patientName = String(row?.patientName || "").trim();
  return `${submissionId || "submission"}-${createdAt || "time"}-${patientName || "patient"}-${index}`;
}

const INITIAL_FORM = {
  procedureKey: "tkr",
  catalogNo: "",
  name: "",
  category: "Tray",
  qty: "1",
};

export default function AdminInstrumentProfilePage() {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [checkingAccessCode, setCheckingAccessCode] = useState(false);
  const [items, setItems] = useState([]);
  const [profileType, setProfileType] = useState("instrument");
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
  const [usageMonitorLoading, setUsageMonitorLoading] = useState(false);
  const [usageMonitorError, setUsageMonitorError] = useState("");
  const [usageMonitorAt, setUsageMonitorAt] = useState("");
  const [usageSubmissions, setUsageSubmissions] = useState([]);
  const [usageItems, setUsageItems] = useState([]);
  const [usageSignatures, setUsageSignatures] = useState([]);
  const [usageCounts, setUsageCounts] = useState({
    submissions: 0,
    items: 0,
    signatures: 0,
  });
  const [usageAutoRefresh, setUsageAutoRefresh] = useState(true);
  const [usageManageForm, setUsageManageForm] = useState(createUsageManageInitialForm);
  const [usageSignatureRows, setUsageSignatureRows] = useState([]);
  const [usageSlotPhotoFile, setUsageSlotPhotoFile] = useState(null);
  const [usageSignaturePhotoFile, setUsageSignaturePhotoFile] = useState(null);
  const [usageFormSaving, setUsageFormSaving] = useState(false);
  const [usageFormMessage, setUsageFormMessage] = useState("");
  const [usageManageMode, setUsageManageMode] = useState("create");
  const [usageManageModalOpen, setUsageManageModalOpen] = useState(false);
  const [usageReviewSaving, setUsageReviewSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [focusItemId, setFocusItemId] = useState("");
  const [highlightItemId, setHighlightItemId] = useState("");
  const [previewItemId, setPreviewItemId] = useState("");
  const [previewZoom, setPreviewZoom] = useState(PREVIEW_ZOOM_MIN);
  const itemRefs = useRef(new Map());
  const usageRequestRef = useRef(false);

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

  const usageIntegrityRows = useMemo(() => {
    if (!usageSubmissions.length) return [];
    const itemCountBySubmission = usageItems.reduce((map, row) => {
      const key = String(row?.submissionId || "").trim();
      if (!key) return map;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
    const signatureCountBySubmission = usageSignatures.reduce((map, row) => {
      const key = String(row?.submissionId || "").trim();
      if (!key) return map;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());

    return usageSubmissions
      .map((submission) => {
        const submissionId = String(
          submission?.submissionId || submission?.id || ""
        ).trim();
        const expectedItems = Number(submission?.slotsCount || 0);
        const expectedSignatures = Number(submission?.signaturesCount || 0);
        const actualItems = itemCountBySubmission.get(submissionId) || 0;
        const actualSignatures = signatureCountBySubmission.get(submissionId) || 0;
        const slotsWithPhoto = Number(submission?.slotsWithPhoto || 0);
        const signaturesWithPhoto = Number(submission?.signaturesWithPhoto || 0);
        return {
          submissionId,
          submission,
          createdAt: String(submission?.createdAt || ""),
          operationDate: String(submission?.operationDate || ""),
          doctorName: String(submission?.doctorName || ""),
          patientName: String(submission?.patientName || ""),
          hospitalName: String(submission?.hospitalName || ""),
          reviewStatus: String(
            submission?.reviewStatus ||
              submission?.statusReview ||
              submission?.review_state ||
              ""
          )
            .trim()
            .toLowerCase(),
          reviewNote: String(submission?.reviewNote || submission?.review_note || "").trim(),
          expectedItems: Number.isFinite(expectedItems) ? expectedItems : 0,
          expectedSignatures: Number.isFinite(expectedSignatures) ? expectedSignatures : 0,
          slotsWithPhoto: Number.isFinite(slotsWithPhoto) ? slotsWithPhoto : 0,
          signaturesWithPhoto: Number.isFinite(signaturesWithPhoto)
            ? signaturesWithPhoto
            : 0,
          actualItems,
          actualSignatures,
          mismatch:
            (Number.isFinite(expectedItems) ? expectedItems : 0) !== actualItems ||
            (Number.isFinite(expectedSignatures) ? expectedSignatures : 0) !==
              actualSignatures,
        };
      })
      .sort((a, b) => toTimeValue(b.createdAt) - toTimeValue(a.createdAt));
  }, [usageItems, usageSignatures, usageSubmissions]);

  const usageMismatchCount = useMemo(
    () => usageIntegrityRows.reduce((total, row) => total + (row.mismatch ? 1 : 0), 0),
    [usageIntegrityRows]
  );

  const usageRowsForTable = useMemo(
    () => usageIntegrityRows.slice(0, 25),
    [usageIntegrityRows]
  );
  const monitorNeedsScroll = usageRowsForTable.length > 10;

  const profilesWithImageCount = useMemo(
    () => items.filter((item) => Boolean(String(item.driveId || item.imageUrl || "").trim())).length,
    [items]
  );
  const profilesWithoutImageCount = Math.max(0, items.length - profilesWithImageCount);
  const imageCoveragePercent = items.length
    ? Math.round((profilesWithImageCount / items.length) * 100)
    : 0;
  const reviewDoneCount = useMemo(
    () =>
      usageIntegrityRows.filter((row) =>
        ["reviewed", "resolved"].includes(String(row.reviewStatus || "").trim().toLowerCase())
      ).length,
    [usageIntegrityRows]
  );
  const reviewProgressPercent = usageIntegrityRows.length
    ? Math.round((reviewDoneCount / usageIntegrityRows.length) * 100)
    : 0;
  const procedureSummary = useMemo(
    () =>
      PROCEDURES.map((procedure) => {
        const procedureItems = items.filter((item) => item.procedureKey === procedure.key);
        const withImage = procedureItems.filter((item) =>
          Boolean(String(item.driveId || item.imageUrl || "").trim())
        ).length;
        return {
          ...procedure,
          total: procedureItems.length,
          withImage,
          withoutImage: Math.max(0, procedureItems.length - withImage),
        };
      }),
    [items]
  );
  const recentSubmissionRows = useMemo(() => usageIntegrityRows.slice(0, 5), [usageIntegrityRows]);
  const recentUpdatedInstruments = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const bValue = toTimeValue(b.updatedAt || b.createdAt);
        const aValue = toTimeValue(a.updatedAt || a.createdAt);
        return bValue - aValue;
      })
      .slice(0, 6);
  }, [items]);

  const selectedManagedSubmission = useMemo(() => {
    const submissionId = String(usageManageForm.submissionId || "").trim();
    if (!submissionId) return null;
    return (
      usageSubmissions.find(
        (row) => String(row?.submissionId || "").trim() === submissionId
      ) || null
    );
  }, [usageManageForm.submissionId, usageSubmissions]);

  const selectedManagedUsageItems = useMemo(() => {
    const submissionId = String(usageManageForm.submissionId || "").trim();
    if (!submissionId) return [];
    const matched = usageItems.filter(
      (row) => String(row?.submissionId || "").trim() === submissionId
    );
    if (matched.length) return matched;
    const slotsJson = parseJsonSafe(selectedManagedSubmission?.slotsJson || "[]");
    return Array.isArray(slotsJson) ? slotsJson : [];
  }, [selectedManagedSubmission, usageItems, usageManageForm.submissionId]);

  const selectedManagedUsageSignatures = useMemo(() => {
    const submissionId = String(usageManageForm.submissionId || "").trim();
    if (!submissionId) return [];
    const matched = usageSignatures.filter(
      (row) => String(row?.submissionId || "").trim() === submissionId
    );
    if (matched.length) return matched;
    const signaturesJson = parseJsonSafe(selectedManagedSubmission?.signaturesJson || "[]");
    return Array.isArray(signaturesJson) ? signaturesJson : [];
  }, [selectedManagedSubmission, usageManageForm.submissionId, usageSignatures]);

  const showOverviewSection = activeSection === "overview";
  const showUsageSection = activeSection === "usage";
  const showInstrumentSection = activeSection === "instruments";

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

  const verifyAdminCode = useCallback(async (code) => {
    const response = await fetch("/api/ceklist-admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.ok || !result?.authorized) {
      throw new Error(String(result?.error || "Kode akses salah."));
    }
    return true;
  }, []);

  const handleAccessSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const code = String(accessCodeInput || "").trim();
      if (!code) {
        setAccessCodeError("Kode akses wajib diisi.");
        return;
      }
      setCheckingAccessCode(true);
      try {
        await verifyAdminCode(code);
        setAccessCodeError("");
        setAccessCodeInput("");
        setIsAdminUnlocked(true);
      } catch (error) {
        setAccessCodeError(String(error?.message || "Kode akses salah."));
      } finally {
        setCheckingAccessCode(false);
      }
    },
    [accessCodeInput, verifyAdminCode]
  );

  const callAction = useCallback(async (action, payload = {}, options = {}) => {
    if (!GOOGLE_SHEET_ENDPOINT) {
      throw new Error("NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT belum diisi.");
    }

    const targetProfileType =
      options && options.profileType ? String(options.profileType) : profileType;
    const targetSheet =
      PROFILE_SHEET_BY_TYPE[targetProfileType] || PROFILE_SHEET_BY_TYPE.instrument;

    const response = await fetch("/api/google-sheet-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: GOOGLE_SHEET_ENDPOINT,
        action,
        sheet: targetSheet,
        sheetName: targetSheet,
        table: targetSheet,
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
  }, [profileType]);

  const callActionGet = useCallback(async (action, payload = {}) => {
    if (!GOOGLE_SHEET_ENDPOINT) {
      throw new Error("NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT belum diisi.");
    }

    const query = new URLSearchParams({
      url: GOOGLE_SHEET_ENDPOINT,
      action: String(action || ""),
    });
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      query.set(key, String(value));
    });

    const response = await fetch(`/api/google-sheet-images?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
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
          `Request GET gagal (HTTP ${response.status}).`
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
      const listActions =
        ACTION_LIST_CANDIDATES_BY_TYPE[profileType] ||
        ACTION_LIST_CANDIDATES_BY_TYPE.instrument;
      const profileLabel =
        PROFILE_TYPE_OPTIONS.find((option) => option.key === profileType)?.label ||
        "Profile";

      for (const actionName of listActions) {
        try {
          const remote = await callAction(actionName);
          rows = extractProfileRowsFromRemote(remote);
          if (rows.length) break;
        } catch (error) {
          lastError = error?.message || `Gagal membaca profile ${profileLabel.toLowerCase()}.`;
        }
      }

      if (!rows.length && lastError) {
        throw new Error(lastError);
      }

      const normalized = normalizeRows(rows);
      setItems(normalized);
      if (!silent) {
        setMessage(`Data profile ${profileLabel} ter-sync (${normalized.length} item).`);
      }
    } catch (error) {
      setMessage(error?.message || "Gagal memuat data profile.");
    } finally {
      setLoading(false);
    }
  }, [callAction, profileType]);

  const loadUsageMonitor = useCallback(
    async (silent = false) => {
      if (usageRequestRef.current) return;
      usageRequestRef.current = true;
      setUsageMonitorLoading(true);
      if (!silent) setUsageMonitorError("");

      try {
        let snapshot = null;
        let lastError = "";

        for (const actionName of ACTION_USAGE_SNAPSHOT_CANDIDATES) {
          try {
            const remote = await callActionGet(actionName, {});
            const normalized = normalizeUsageSnapshotFromRemote(remote);
            if (
              normalized.submissions.length ||
              normalized.items.length ||
              normalized.signatures.length
            ) {
              snapshot = normalized;
              break;
            }
            if (actionName === "all" && !snapshot) snapshot = normalized;
          } catch (error) {
            lastError = String(error?.message || "Gagal mengambil snapshot implant usage.");
          }
        }

        if (!snapshot) {
          for (const actionName of ACTION_USAGE_SNAPSHOT_CANDIDATES) {
            try {
              const remote = await callAction(actionName, {});
              const normalized = normalizeUsageSnapshotFromRemote(remote);
              if (
                normalized.submissions.length ||
                normalized.items.length ||
                normalized.signatures.length
              ) {
                snapshot = normalized;
                break;
              }
              if (actionName === "all" && !snapshot) snapshot = normalized;
            } catch (error) {
              lastError = String(
                error?.message || "Gagal mengambil snapshot implant usage via POST."
              );
            }
          }
        }

        if (!snapshot) {
          for (const actionName of ACTION_USAGE_LIST_CANDIDATES) {
            try {
              const remote = await callActionGet(actionName, {});
              const submissions = toArraySafe(remote?.items);
              snapshot = {
                submissions,
                items: [],
                signatures: [],
                counts: {
                  submissions: submissions.length,
                  items: 0,
                  signatures: 0,
                },
              };
              break;
            } catch (error) {
              lastError = String(error?.message || "Gagal mengambil data submission.");
            }
          }
        }

        if (!snapshot) {
          for (const actionName of ACTION_USAGE_LIST_CANDIDATES) {
            try {
              const remote = await callAction(actionName, {});
              const submissions = toArraySafe(remote?.items);
              snapshot = {
                submissions,
                items: [],
                signatures: [],
                counts: {
                  submissions: submissions.length,
                  items: 0,
                  signatures: 0,
                },
              };
              break;
            } catch (error) {
              lastError = String(error?.message || "Gagal mengambil data submission via POST.");
            }
          }
        }

        if (!snapshot) {
          throw new Error(lastError || "Data implant usage belum bisa dibaca.");
        }

        setUsageSubmissions(snapshot.submissions);
        setUsageItems(snapshot.items);
        setUsageSignatures(snapshot.signatures);
        setUsageCounts(snapshot.counts);
        setUsageMonitorAt(new Date().toISOString());
        if (!silent) {
          setMessage(
            `Monitor implant usage di-refresh (${snapshot.counts.submissions} submission).`
          );
        }
      } catch (error) {
        const msg = String(error?.message || "Gagal memuat monitor implant usage.");
        setUsageMonitorError(msg);
      } finally {
        usageRequestRef.current = false;
        setUsageMonitorLoading(false);
      }
    },
    [callAction, callActionGet]
  );

  useEffect(() => {
    if (!isAdminUnlocked) return;
    loadProfiles(true);
    loadUsageMonitor(true);
  }, [isAdminUnlocked, loadProfiles, loadUsageMonitor]);

  useEffect(() => {
    if (!isAdminUnlocked) return;
    setFilterProcedure("all");
    setSearchQuery("");
    setEditId("");
    setImageFile(null);
    setImagePreview("");
    setDriveInput("");
    loadProfiles(true);
  }, [isAdminUnlocked, loadProfiles, profileType]);

  useEffect(() => {
    if (!isAdminUnlocked || !usageAutoRefresh) return undefined;
    const timer = window.setInterval(() => {
      loadUsageMonitor(true);
    }, USAGE_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAdminUnlocked, loadUsageMonitor, usageAutoRefresh]);

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
      setMobileSidebarOpen(false);
      return undefined;
    }
    return undefined;
  }, [isMobileViewport]);

  const handleSelectSection = useCallback(
    (sectionKey) => {
      setActiveSection(sectionKey);
      if (isMobileViewport) setMobileSidebarOpen(false);
    },
    [isMobileViewport]
  );

  useEffect(() => {
    const isAnyModalOpen =
      mobileFormOpen || previewItemId !== "" || usageManageModalOpen;
    if (!isAnyModalOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileFormOpen, previewItemId, usageManageModalOpen]);

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

  useEffect(() => {
    if (!usageManageModalOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setUsageManageModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [usageManageModalOpen]);

  useEffect(() => {
    const count = Math.max(0, Math.floor(Number(usageManageForm.signaturesCount || 0)));
    setUsageSignatureRows((prev) => {
      if (prev.length === count) return prev;
      if (prev.length > count) return prev.slice(0, count);
      const next = [...prev];
      for (let index = prev.length; index < count; index += 1) {
        next.push(createEmptySignatureRow(index + 1));
      }
      return next;
    });
  }, [usageManageForm.signaturesCount]);

  function resetUsageManageForm() {
    setUsageManageMode("create");
    setUsageManageForm(createUsageManageInitialForm());
    setUsageSignatureRows([]);
    setUsageSlotPhotoFile(null);
    setUsageSignaturePhotoFile(null);
    setUsageFormMessage("");
  }

  function openUsageManageModalManual() {
    resetUsageManageForm();
    setUsageManageModalOpen(true);
    setActiveSection("usage");
  }

  function closeUsageManageModal() {
    setUsageManageModalOpen(false);
  }

  function prefillUsageManageForm(submissionId) {
    const submission = usageSubmissions.find(
      (row) => String(row?.submissionId || "").trim() === String(submissionId || "").trim()
    );
    if (!submission) return;
    const signaturesJson = parseJsonSafe(submission?.signaturesJson || "[]");
    const signaturesFromSubmission = Array.isArray(signaturesJson)
      ? signaturesJson
      : [];

    const nextCount = Number(submission?.signaturesCount || signaturesFromSubmission.length || 0);
    const preparedRows = [];
    for (let index = 0; index < nextCount; index += 1) {
      const source = signaturesFromSubmission[index] || {};
      preparedRows.push({
        id: `sig-prefill-${index}-${Date.now()}`,
        signatureId:
          String(source?.signatureId || source?.id || `${index + 1}`).trim(),
        roleLabel:
          String(source?.roleLabel || source?.role || DEFAULT_SIGNATURE_ROLE_OPTIONS[0]).trim() ||
          DEFAULT_SIGNATURE_ROLE_OPTIONS[0],
        personName: String(source?.personName || source?.name || "").trim(),
      });
    }

    setUsageManageMode("manage");
    setUsageManageForm({
      submissionId: String(submission?.submissionId || "").trim(),
      operationDate: String(submission?.operationDate || "").trim() || new Date().toISOString().slice(0, 10),
      doctorName: String(submission?.doctorName || "").trim(),
      hospitalName: String(submission?.hospitalName || "").trim(),
      repAssist: String(submission?.repAssist || "").trim(),
      systemName: String(submission?.systemName || "").trim(),
      invoiceTo: String(submission?.invoiceTo || "").trim(),
      patientName: String(submission?.patientName || "").trim(),
      medrec: String(submission?.medrec || "").trim(),
      region: String(submission?.region || "").trim(),
      slotsCount: Number(submission?.slotsCount || 0),
      slotsWithPhoto: Number(submission?.slotsWithPhoto || 0),
      signaturesCount: nextCount,
      signaturesWithPhoto: Number(submission?.signaturesWithPhoto || 0),
      note: String(submission?.reviewNote || "").trim(),
      reviewStatus: String(
        submission?.reviewStatus || submission?.statusReview || submission?.review_state || ""
      )
        .trim()
        .toLowerCase(),
    });
    setUsageSignatureRows(preparedRows);
    setUsageSlotPhotoFile(null);
    setUsageSignaturePhotoFile(null);
    setUsageFormMessage(
      `Mode kelola aktif untuk submission ${String(submission?.submissionId || "").trim()}.`
    );
    setUsageManageModalOpen(true);
    setActiveSection("usage");
  }

  function handleUsageFormChange(key, value) {
    setUsageManageForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleUsageSignatureRowChange(rowId, key, value) {
    setUsageSignatureRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row))
    );
  }

  async function handleUsageManageSubmit(event) {
    event.preventDefault();
    setUsageFormMessage("");

    const slotsCount = Math.max(0, Math.floor(Number(usageManageForm.slotsCount || 0)));
    const slotsWithPhoto = Math.max(
      0,
      Math.min(slotsCount, Math.floor(Number(usageManageForm.slotsWithPhoto || 0)))
    );
    const signaturesCount = Math.max(
      0,
      Math.floor(Number(usageManageForm.signaturesCount || 0))
    );
    const signaturesWithPhoto = Math.max(
      0,
      Math.min(signaturesCount, Math.floor(Number(usageManageForm.signaturesWithPhoto || 0)))
    );

    if (!usageManageForm.operationDate || !usageManageForm.hospitalName) {
      setUsageFormMessage("Tanggal operasi dan rumah sakit wajib diisi.");
      return;
    }

    if (slotsWithPhoto > 0 && !usageSlotPhotoFile) {
      setUsageFormMessage("Isi foto slot (shared) jika slotsWithPhoto > 0.");
      return;
    }
    if (signaturesWithPhoto > 0 && !usageSignaturePhotoFile) {
      setUsageFormMessage("Isi foto signature (shared) jika signaturesWithPhoto > 0.");
      return;
    }

    setUsageFormSaving(true);
    try {
      const slotPhotoDataUrl = usageSlotPhotoFile
        ? await fileToBase64(usageSlotPhotoFile)
        : "";
      const signaturePhotoDataUrl = usageSignaturePhotoFile
        ? await fileToBase64(usageSignaturePhotoFile)
        : "";
      const slotPhotoMime =
        slotPhotoDataUrl.match(/^data:([^;]+);base64,/)?.[1] || "image/jpeg";
      const signaturePhotoMime =
        signaturePhotoDataUrl.match(/^data:([^;]+);base64,/)?.[1] || "image/jpeg";

      const slots = Array.from({ length: slotsCount }, (_, index) => ({
        slotNumber: index + 1,
        label: `Slot ${index + 1}`,
        implantName: "-",
        implantCode: "-",
        imageUpload:
          index < slotsWithPhoto && slotPhotoDataUrl
            ? {
                fileName: `slot-${index + 1}-${Date.now()}.jpg`,
                mimeType: slotPhotoMime,
                dataUrl: slotPhotoDataUrl,
              }
            : null,
      }));

      const signatureRowsForSubmit = usageSignatureRows.slice(0, signaturesCount);
      const signatures = Array.from({ length: signaturesCount }, (_, index) => {
        const row = signatureRowsForSubmit[index] || createEmptySignatureRow(index + 1);
        return {
          signatureNumber: index + 1,
          signatureId:
            String(row.signatureId || "").trim() || `${usageManageForm.submissionId || "manual"}-${index + 1}`,
          roleLabel: String(row.roleLabel || DEFAULT_SIGNATURE_ROLE_OPTIONS[0]).trim(),
          personName: String(row.personName || "").trim(),
          imageUpload:
            index < signaturesWithPhoto && signaturePhotoDataUrl
              ? {
                  fileName: `signature-${index + 1}-${Date.now()}.jpg`,
                  mimeType: signaturePhotoMime,
                  dataUrl: signaturePhotoDataUrl,
                }
              : null,
        };
      });

      await callAction("create_implant_usage", {
        action: "create_implant_usage",
        data: {
          source: "admin-implant-usage-manager",
          submissionId: String(usageManageForm.submissionId || "").trim() || undefined,
          operationDate: usageManageForm.operationDate,
          doctorName: String(usageManageForm.doctorName || "").trim(),
          hospitalName: String(usageManageForm.hospitalName || "").trim(),
          repAssist: String(usageManageForm.repAssist || "").trim(),
          systemName: String(usageManageForm.systemName || "").trim(),
          invoiceTo:
            String(usageManageForm.invoiceTo || "").trim() ||
            String(usageManageForm.hospitalName || "").trim(),
          patientName: String(usageManageForm.patientName || "").trim(),
          medrec: String(usageManageForm.medrec || "").trim(),
          region:
            String(usageManageForm.region || "").trim() ||
            String(usageManageForm.hospitalName || "").trim(),
          note: String(usageManageForm.note || "").trim(),
          checklist: [],
          slots,
          signatures,
        },
      });

      await loadUsageMonitor(true);
      setUsageFormMessage("Data implant usage/signatures berhasil disimpan.");
      notify("success", "Implant usage/signatures berhasil disimpan.");
      resetUsageManageForm();
      setUsageManageModalOpen(false);
    } catch (error) {
      const msg = String(error?.message || "Gagal menyimpan data implant usage.");
      setUsageFormMessage(msg);
      notify("error", msg);
    } finally {
      setUsageFormSaving(false);
    }
  }

  async function handleUsageReviewStatusUpdate(nextStatus) {
    const submissionId = String(usageManageForm.submissionId || "").trim();
    if (!submissionId) {
      setUsageFormMessage("Submission ID tidak ditemukan.");
      return;
    }
    const normalizedStatus = String(nextStatus || "").trim().toLowerCase();
    if (!normalizedStatus) return;

    setUsageReviewSaving(true);
    let lastError = "";
    try {
      for (const actionName of ACTION_USAGE_REVIEW_UPDATE_CANDIDATES) {
        try {
          await callAction(actionName, {
            submissionId,
            reviewStatus: normalizedStatus,
            reviewNote: String(usageManageForm.note || "").trim(),
            reviewedAt: new Date().toISOString(),
            reviewedBy: "admin-ui",
            item: {
              submissionId,
              reviewStatus: normalizedStatus,
              reviewNote: String(usageManageForm.note || "").trim(),
              reviewedAt: new Date().toISOString(),
              reviewedBy: "admin-ui",
            },
            data: {
              submissionId,
              reviewStatus: normalizedStatus,
              reviewNote: String(usageManageForm.note || "").trim(),
              reviewedAt: new Date().toISOString(),
              reviewedBy: "admin-ui",
            },
          });

          setUsageManageForm((prev) => ({ ...prev, reviewStatus: normalizedStatus }));
          setUsageFormMessage(`Status review diupdate: ${normalizedStatus}.`);
          notify("success", `Status ${normalizedStatus} tersimpan.`);
          await loadUsageMonitor(true);
          return;
        } catch (error) {
          lastError = String(error?.message || "Gagal update status review.");
        }
      }

      throw new Error(
        lastError ||
          "Action review status belum tersedia di Apps Script. Tambahkan endpoint review update lalu deploy ulang."
      );
    } catch (error) {
      const msg = String(
        error?.message || "Gagal update review status ke Google Sheet."
      );
      setUsageFormMessage(msg);
      notify("error", msg);
    } finally {
      setUsageReviewSaving(false);
    }
  }

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
    const seedCode = window.prompt("Masukkan kode untuk Seed Master:");
    if (seedCode === null) return;
    if (!String(seedCode).trim()) {
      setMessage("Kode seed wajib diisi.");
      notify("error", "Kode seed wajib diisi.");
      return;
    }
    try {
      await verifyAdminCode(seedCode);
    } catch (error) {
      const msg = String(error?.message || "Kode seed salah.");
      setMessage(`${msg} Proses dibatalkan.`);
      notify("error", msg);
      return;
    }

    const confirmed = window.confirm(
      "Masukkan semua master checklist (TKR/THR/Bipolar/Stem) ke Google Sheet sekarang?"
    );
    if (!confirmed) return;

    setBulkSaving(true);
    try {
      if (profileType !== "instrument") {
        throw new Error("Seed master hanya untuk sheet InstrumentProfiles.");
      }
      const rows = buildMasterSeedRows();
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
          await callAction(ACTION_CREATE_BY_TYPE.instrument, {
            id: item.id,
            item,
            deleteOldDriveFile: false,
          }, { profileType: "instrument" });
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
      const createAction =
        ACTION_CREATE_BY_TYPE[profileType] || ACTION_CREATE_BY_TYPE.instrument;
      const updateAction =
        ACTION_UPDATE_BY_TYPE[profileType] || ACTION_UPDATE_BY_TYPE.instrument;
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
          await callAction(updateAction, submitPayload);
        } catch (error) {
          const msg = String(error?.message || "").toLowerCase();
          const shouldFallbackToCreate =
            msg.includes("tidak ditemukan") || msg.includes("not found");
          if (!shouldFallbackToCreate) throw error;
          await callAction(createAction, submitPayload);
        }
      } else {
        await callAction(createAction, submitPayload);
      }

      setFilterProcedure(procedureKey);
      setSearchQuery(catalogNo);
      resetForm();
      await loadProfiles(true);
      setFocusItemId(payloadItem.id);
      setMessage(
        editId
          ? `${profileType === "implant" ? "Implant" : "Instrument"} ${catalogNo} berhasil diupdate dan data sudah di-refresh.`
          : `${profileType === "implant" ? "Implant" : "Instrument"} ${catalogNo} berhasil ditambahkan dan data sudah di-refresh.`
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
        setMessage(
          rawError || `Gagal menyimpan ${profileType === "implant" ? "implant" : "instrument"}.`
        );
        notify(
          "error",
          rawError || `Gagal menyimpan ${profileType === "implant" ? "implant" : "instrument"}.`
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Hapus ${profileType === "implant" ? "implant" : "instrument"} ${item.catalogNo} - ${item.name}?`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setMessage("");
    try {
      const deleteAction =
        ACTION_DELETE_BY_TYPE[profileType] || ACTION_DELETE_BY_TYPE.instrument;
      await callAction(deleteAction, {
        id: item.id,
        deleteDriveFile: true,
      });
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      if (editId === item.id) resetForm();
      setMessage(`${profileType === "implant" ? "Implant" : "Instrument"} berhasil dihapus.`);
      notify("success", `${item.catalogNo} berhasil dihapus.`);
    } catch (error) {
      setMessage(
        error?.message ||
          `Gagal menghapus ${profileType === "implant" ? "implant" : "instrument"}.`
      );
      notify(
        "error",
        error?.message ||
          `Gagal menghapus ${profileType === "implant" ? "implant" : "instrument"}.`
      );
    } finally {
      setDeletingId("");
    }
  }

  function renderEditorForm(options = {}) {
    const inModal = Boolean(options.inModal);
    const entityLabel = profileType === "implant" ? "Implant" : "Instrument";
    return (
      <form
        onSubmit={handleSubmit}
        className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
          inModal ? "max-h-[85vh] overflow-y-auto" : ""
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            {editId ? `Edit ${entityLabel}` : `Tambah ${entityLabel}`}
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
          <FloatingSelectField
            value={form.procedureKey}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, procedureKey: event.target.value }))
            }
            label="Procedure"
            selectClassName="border-slate-200 focus:border-slate-900"
          >
            {PROCEDURES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </FloatingSelectField>

          <FloatingInputField
            value={form.catalogNo}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, catalogNo: event.target.value.toUpperCase() }))
            }
            label={`Kode ${entityLabel.toLowerCase()}`}
            required
            inputClassName="border-slate-200 focus:border-slate-900"
          />

          <FloatingInputField
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            label={`Deskripsi ${entityLabel.toLowerCase()}`}
            required
            inputClassName="border-slate-200 focus:border-slate-900"
          />

          <div className="grid grid-cols-2 gap-2">
            <FloatingInputField
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              label="Group"
              inputClassName="border-slate-200 focus:border-slate-900"
            />
            <FloatingInputField
              value={form.qty}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, qty: event.target.value }))
              }
              type="number"
              min={1}
              label="Piece"
              inputClassName="border-slate-200 focus:border-slate-900"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Upload size={14} />
            Upload Foto {entityLabel}
            <input
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="hidden"
            />
          </label>

          <FloatingInputField
            value={driveInput}
            onChange={(event) => setDriveInput(event.target.value)}
            label="Drive ID / Link (opsional)"
            inputClassName="border-slate-200 focus:border-slate-900"
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
            {editId ? `Update ${entityLabel}` : `Tambah ${entityLabel}`}
          </button>
        </div>
      </form>
    );
  }

  if (!isAdminUnlocked) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
        <section className="mx-auto max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-lg font-bold md:text-xl">Admin Access</h1>
            <p className="mt-1 text-sm text-slate-500">
              Masukkan kode untuk membuka halaman admin checklist instrument.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleAccessSubmit}>
              <FloatingInputField
                value={accessCodeInput}
                onChange={(event) => {
                  setAccessCodeInput(event.target.value);
                  if (accessCodeError) setAccessCodeError("");
                }}
                type="password"
                label="Kode akses"
                inputClassName="border-slate-200 focus:border-slate-900"
              />
              {accessCodeError ? (
                <p className="text-xs font-medium text-rose-600">{accessCodeError}</p>
              ) : null}
              <button
                type="submit"
                disabled={checkingAccessCode}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingAccessCode ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    Verifikasi...
                  </span>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>
            <Link
              href="/ceklist-instrument-normed"
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={14} />
              Kembali ke Checklist
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold md:text-2xl">
                Admin · Manager Foto Checklist {profileType === "implant" ? "Implant" : "Instrument"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {profileType === "implant"
                  ? "Sheet aktif: ImplantProfiles. Data implant terpisah dari instrument."
                  : "Sheet aktif: InstrumentProfiles. Data instrument terpisah dari implant."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                {PROFILE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setProfileType(option.key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      profileType === option.key
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
                onClick={() => loadUsageMonitor()}
                disabled={
                  usageMonitorLoading ||
                  loading ||
                  saving ||
                  bulkSaving ||
                  scanningOrphans ||
                  cleaningOrphans
                }
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {usageMonitorLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCcw size={14} />
                )}
                Refresh Monitor
              </button>
              <button
                type="button"
                onClick={() => setUsageAutoRefresh((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                  usageAutoRefresh
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {usageAutoRefresh ? "Auto Monitor ON" : "Auto Monitor OFF"}
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
                  profileType !== "instrument" ||
                  scanningOrphans ||
                  cleaningOrphans
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {profileType === "instrument" ? "Seed Master Instrument" : "Seed Nonaktif (Implant)"}
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

        <div className="sticky top-2 z-20 -mx-1 px-1 pb-1 xl:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Buka menu admin"
            >
              <Menu size={16} />
            </button>
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
              {ADMIN_SECTIONS.map((sectionItem) => (
                <button
                  key={sectionItem.key}
                  type="button"
                  onClick={() => handleSelectSection(sectionItem.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                    activeSection === sectionItem.key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <sectionItem.icon size={14} />
                  {sectionItem.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[220px_1fr]">
          <aside
            className={`hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:block ${
              sidebarCollapsed ? "w-[70px]" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              {!sidebarCollapsed ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Admin Menu
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                title={sidebarCollapsed ? "Buka sidebar" : "Kecilkan sidebar"}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
              </button>
            </div>
            <nav className="space-y-1">
              {ADMIN_SECTIONS.map((sectionItem) => (
                <button
                  key={sectionItem.key}
                  type="button"
                  onClick={() => handleSelectSection(sectionItem.key)}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium transition ${
                    activeSection === sectionItem.key
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  } ${sidebarCollapsed ? "justify-center" : ""}`}
                  title={sectionItem.label}
                >
                  <sectionItem.icon size={15} />
                  {!sidebarCollapsed ? <span>{sectionItem.label}</span> : null}
                </button>
              ))}
            </nav>
          </aside>

          <div className="space-y-5">
        {showOverviewSection ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 md:text-base">Dashboard Admin</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ringkasan data instrument, foto, dan review submission.
                </p>
              </div>
              <p className="text-[11px] text-slate-500">
                Last monitor sync: {usageMonitorAt ? formatDateTime(usageMonitorAt) : "-"}
              </p>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Total Instrument
                </p>
                <p className="text-lg font-bold text-slate-900">{items.length}</p>
              </article>
              <article className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Ada Foto Profil
                </p>
                <p className="text-lg font-bold text-emerald-900">{profilesWithImageCount}</p>
              </article>
              <article className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Belum Ada Foto
                </p>
                <p className="text-lg font-bold text-amber-900">{profilesWithoutImageCount}</p>
              </article>
              <article className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Review Selesai
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {reviewDoneCount}/{usageIntegrityRows.length}
                </p>
              </article>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Ada foto = item memiliki driveId/imageSrc. Belum ada foto = item belum punya foto profil.
            </p>

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.3fr_1fr]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">Kelengkapan Foto</p>
                  <p className="text-xs font-bold text-slate-900">{imageCoveragePercent}%</p>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${imageCoveragePercent}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">Progress Review</p>
                  <p className="text-xs font-bold text-slate-900">{reviewProgressPercent}%</p>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-slate-200">
                  <div
                    className="h-2.5 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${reviewProgressPercent}%` }}
                  />
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {procedureSummary.map((procedure) => (
                    <button
                      key={procedure.key}
                      type="button"
                      onClick={() => {
                        setFilterProcedure(procedure.key);
                        setActiveSection("instruments");
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-left hover:bg-slate-100"
                    >
                      <p className="text-[11px] font-semibold uppercase text-slate-500">
                        {procedure.label}
                      </p>
                      <p className="text-sm font-bold text-slate-900">{procedure.total} item</p>
                      <p className="text-[11px] text-slate-500">
                        Ada foto: {procedure.withImage} · Belum ada: {procedure.withoutImage}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Quick Action</p>
                <div className="mt-2 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection("usage")}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Buka Implant Monitor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("instruments")}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Kelola {profileType === "implant" ? "Implant" : "Instrument"}
                  </button>
                  <button
                    type="button"
                    onClick={openUsageManageModalManual}
                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Input Usage Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isMobileViewport) openMobileCreateForm();
                      else setActiveSection("instruments");
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Tambah {profileType === "implant" ? "Implant" : "Instrument"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Submission Terbaru</p>
                <div className="mt-2 space-y-2">
                  {recentSubmissionRows.map((row, index) => (
                    <div
                      key={getUsageRowKey(row, index)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2"
                    >
                      <p className="font-mono text-[11px] text-slate-700">{row.submissionId || "-"}</p>
                      <p className="text-xs font-semibold text-slate-900">
                        {row.doctorName || "-"} · {row.hospitalName || "-"}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500">
                          {formatDateTime(row.createdAt || row.operationDate)}
                        </p>
                        <button
                          type="button"
                          onClick={() => prefillUsageManageForm(row.submissionId)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Kelola
                        </button>
                      </div>
                    </div>
                  ))}
                  {!recentSubmissionRows.length ? (
                    <p className="text-xs text-slate-500">Belum ada submission.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Instrument Terakhir Diupdate</p>
                <div className="mt-2 space-y-2">
                  {recentUpdatedInstruments.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {item.catalogNo} · {item.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.procedureKey.toUpperCase()} · {item.updatedAt ? formatDateTime(item.updatedAt) : "No timestamp"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          startEdit(item);
                          setActiveSection("instruments");
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                  {!recentUpdatedInstruments.length ? (
                    <p className="text-xs text-slate-500">Belum ada data instrument.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section
          className={`rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm ${
            showUsageSection ? "" : "hidden"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-emerald-900 md:text-base">
                Monitor Realtime · Implant Usage
              </h2>
              <p className="mt-0.5 text-xs text-emerald-800">
                Sheet: ImplantUsageSubmissions, ImplantUsageItems, ImplantUsageSignatures
              </p>
            </div>
            <p className="text-[11px] text-emerald-800">
              Last sync: {usageMonitorAt ? formatDateTime(usageMonitorAt) : "-"}
            </p>
          </div>

          {usageMonitorError ? (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {usageMonitorError}
            </p>
          ) : null}

          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Submissions
              </p>
              <p className="text-lg font-bold text-emerald-900">{usageCounts.submissions}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Items
              </p>
              <p className="text-lg font-bold text-emerald-900">{usageCounts.items}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Signatures
              </p>
              <p className="text-lg font-bold text-emerald-900">{usageCounts.signatures}</p>
            </div>
            <div
              className={`rounded-xl border px-3 py-2 ${
                usageMismatchCount > 0
                  ? "border-amber-300 bg-amber-50"
                  : "border-emerald-200 bg-white"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Mismatch
              </p>
              <p
                className={`text-lg font-bold ${
                  usageMismatchCount > 0 ? "text-amber-700" : "text-emerald-900"
                }`}
              >
                {usageMismatchCount}
              </p>
            </div>
          </div>

          {isMobileViewport ? (
            <div className="mt-3 space-y-2">
              {usageRowsForTable.map((row, index) => (
                <article
                  key={getUsageRowKey(row, index)}
                  className={`rounded-xl border px-3 py-2 ${
                    row.mismatch ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-[11px] text-slate-700">{row.submissionId || "-"}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          row.mismatch ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {row.mismatch ? "Perlu cek" : "OK"}
                      </span>
                      {row.reviewStatus ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {row.reviewStatus}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-900">
                    {row.doctorName || "-"} · {row.hospitalName || "-"}
                  </p>
                  <p className="text-xs text-slate-600">Pasien: {row.patientName || "-"}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatDateTime(row.createdAt || row.operationDate)}
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                    <p>
                      Item: {row.actualItems} / {row.expectedItems}
                    </p>
                    <p>
                      Sign: {row.actualSignatures} / {row.expectedSignatures}
                    </p>
                    <p>Foto item: {row.slotsWithPhoto}</p>
                    <p>Foto sign: {row.signaturesWithPhoto}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => prefillUsageManageForm(row.submissionId)}
                    className="mt-2 inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Kelola
                  </button>
                </article>
              ))}
              {!usageRowsForTable.length ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
                  Belum ada data implant usage.
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={`mt-3 overflow-x-auto rounded-xl border border-emerald-200 bg-white ${
                monitorNeedsScroll ? "max-h-[540px] overflow-y-auto" : ""
              }`}
            >
            <table className="min-w-[760px] text-left text-xs">
              <thead className="bg-emerald-100/80 text-emerald-900">
                <tr>
                  <th className="px-3 py-2 font-semibold">Submission</th>
                  <th className="px-3 py-2 font-semibold">Waktu</th>
                  <th className="px-3 py-2 font-semibold">Dokter / RS</th>
                  <th className="px-3 py-2 font-semibold">Pasien</th>
                  <th className="px-3 py-2 font-semibold">Items</th>
                  <th className="px-3 py-2 font-semibold">Signatures</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {usageRowsForTable.map((row, index) => (
                  <tr
                    key={getUsageRowKey(row, index)}
                    className={row.mismatch ? "bg-amber-50/70" : "bg-white"}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-700">
                      {row.submissionId || "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatDateTime(row.createdAt || row.operationDate)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="max-w-[220px] truncate">{row.doctorName || "-"}</div>
                      <div className="max-w-[220px] truncate text-slate-500">
                        {row.hospitalName || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.patientName || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.actualItems} / {row.expectedItems}
                      <div className="text-[10px] text-slate-500">
                        photo: {row.slotsWithPhoto}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.actualSignatures} / {row.expectedSignatures}
                      <div className="text-[10px] text-slate-500">
                        photo: {row.signaturesWithPhoto}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            row.mismatch
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {row.mismatch ? "Perlu cek" : "OK"}
                        </span>
                        {row.reviewStatus ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {row.reviewStatus}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => prefillUsageManageForm(row.submissionId)}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Kelola
                      </button>
                    </td>
                  </tr>
                ))}
                {!usageRowsForTable.length ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-slate-500">
                      Belum ada data implant usage.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          )}
        </section>

        <section
          className={`rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm ${
            showUsageSection ? "" : "hidden"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-blue-900 md:text-base">
                Management · Implant Usage
              </h2>
              <p className="mt-0.5 text-xs text-blue-800">
                Kelola data submission lewat modal agar UI lebih clean.
              </p>
            </div>
            <button
              type="button"
              onClick={openUsageManageModalManual}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Plus size={13} />
              Kelola Manual
            </button>
          </div>
        </section>

        {showInstrumentSection ? (
          <>
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
                  <FloatingSelectField
                    value={filterProcedure}
                    onChange={(event) => setFilterProcedure(event.target.value)}
                    label="Filter Procedure"
                    selectClassName="border-slate-200 focus:border-slate-900"
                  >
                    <option value="all">Semua Procedure</option>
                    {PROCEDURES.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </FloatingSelectField>
                  <FloatingInputField
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    label="Cari kode, nama, atau group"
                    inputClassName="border-slate-200 focus:border-slate-900"
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
          </>
        ) : null}
          </div>
        </div>

        {isMobileViewport && mobileSidebarOpen ? (
          <div
            className="fixed inset-0 z-50 bg-slate-900/45 xl:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <aside
              className="h-full w-[280px] max-w-[82vw] border-r border-slate-200 bg-white p-3 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Menu Admin
                </p>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
              <nav className="space-y-1">
                {ADMIN_SECTIONS.map((sectionItem) => (
                  <button
                    key={sectionItem.key}
                    type="button"
                    onClick={() => handleSelectSection(sectionItem.key)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium ${
                      activeSection === sectionItem.key
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <sectionItem.icon size={15} />
                    <span>{sectionItem.label}</span>
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        ) : null}

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

        {usageManageModalOpen ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-3"
            onClick={closeUsageManageModal}
          >
            <div
              className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {usageManageMode === "manage"
                      ? "Kelola Submission Implant Usage"
                      : "Input Manual Implant Usage"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {usageManageForm.submissionId
                      ? `Submission: ${usageManageForm.submissionId}`
                      : "Belum ada submission ID"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeUsageManageModal}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[78vh] overflow-y-auto pr-1">
                <form onSubmit={handleUsageManageSubmit} className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-4">
                    <FloatingInputField
                      value={usageManageForm.submissionId}
                      onChange={(event) => handleUsageFormChange("submissionId", event.target.value)}
                      label="Submission ID (opsional)"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.operationDate}
                      onChange={(event) => handleUsageFormChange("operationDate", event.target.value)}
                      type="date"
                      label="Tanggal Operasi"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.doctorName}
                      onChange={(event) => handleUsageFormChange("doctorName", event.target.value)}
                      label="Doctor"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.hospitalName}
                      onChange={(event) => handleUsageFormChange("hospitalName", event.target.value)}
                      label="Hospital"
                      required
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-4">
                    <FloatingInputField
                      value={usageManageForm.repAssist}
                      onChange={(event) => handleUsageFormChange("repAssist", event.target.value)}
                      label="Rep / Assist"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.systemName}
                      onChange={(event) => handleUsageFormChange("systemName", event.target.value)}
                      label="System"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.patientName}
                      onChange={(event) => handleUsageFormChange("patientName", event.target.value)}
                      label="Patient"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.medrec}
                      onChange={(event) => handleUsageFormChange("medrec", event.target.value)}
                      label="Medrec"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-4">
                    <FloatingInputField
                      value={usageManageForm.slotsCount}
                      onChange={(event) =>
                        handleUsageFormChange("slotsCount", Number(event.target.value || 0))
                      }
                      type="number"
                      min={0}
                      label="slotsCount"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.slotsWithPhoto}
                      onChange={(event) =>
                        handleUsageFormChange("slotsWithPhoto", Number(event.target.value || 0))
                      }
                      type="number"
                      min={0}
                      label="slotsWithPhoto"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.signaturesCount}
                      onChange={(event) =>
                        handleUsageFormChange("signaturesCount", Number(event.target.value || 0))
                      }
                      type="number"
                      min={0}
                      label="signaturesCount"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                    <FloatingInputField
                      value={usageManageForm.signaturesWithPhoto}
                      onChange={(event) =>
                        handleUsageFormChange(
                          "signaturesWithPhoto",
                          Number(event.target.value || 0)
                        )
                      }
                      type="number"
                      min={0}
                      label="signaturesWithPhoto"
                      inputClassName="border-blue-200 focus:border-blue-500"
                    />
                  </div>

                  <FloatingTextareaField
                    value={usageManageForm.note}
                    onChange={(event) => handleUsageFormChange("note", event.target.value)}
                    label="Catatan review (opsional)"
                    rows={2}
                    textareaClassName="border-blue-200 focus:border-blue-500"
                  />

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-800">Aksi Review Status</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {REVIEW_STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleUsageReviewStatusUpdate(option.value)}
                          disabled={usageReviewSaving || !usageManageForm.submissionId}
                          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                            String(usageManageForm.reviewStatus || "").trim() === option.value
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {usageReviewSaving ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Action ini butuh endpoint Apps Script untuk update review status.
                    </p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                      Slot Photo (shared)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setUsageSlotPhotoFile(event.target.files?.[0] || null)
                        }
                        className="block w-full text-[11px]"
                      />
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                      Signature Photo (shared)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          setUsageSignaturePhotoFile(event.target.files?.[0] || null)
                        }
                        className="block w-full text-[11px]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-blue-200 bg-white p-3">
                      <p className="text-xs font-semibold text-blue-800">
                        Checklist Implant Signatures ({usageSignatureRows.length})
                      </p>
                      <div className="mt-2 space-y-2">
                        {usageSignatureRows.map((row, index) => (
                          <div key={row.id} className="grid gap-2 md:grid-cols-[110px_150px_1fr]">
                            <FloatingInputField
                              value={row.signatureId}
                              onChange={(event) =>
                                handleUsageSignatureRowChange(
                                  row.id,
                                  "signatureId",
                                  event.target.value
                                )
                              }
                              label={`Sig ID ${index + 1}`}
                              inputClassName="h-10 rounded-lg border-blue-200 px-2 pb-1 pt-5 text-xs focus:border-blue-500"
                            />
                            <FloatingSelectField
                              value={row.roleLabel}
                              onChange={(event) =>
                                handleUsageSignatureRowChange(
                                  row.id,
                                  "roleLabel",
                                  event.target.value
                                )
                              }
                              label="Role"
                              selectClassName="h-10 rounded-lg border-blue-200 px-2 pb-1 pt-5 text-xs focus:border-blue-500"
                            >
                              {DEFAULT_SIGNATURE_ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </FloatingSelectField>
                            <FloatingInputField
                              value={row.personName}
                              onChange={(event) =>
                                handleUsageSignatureRowChange(
                                  row.id,
                                  "personName",
                                  event.target.value
                                )
                              }
                              label="Nama penanda tangan"
                              inputClassName="h-10 rounded-lg border-blue-200 px-2 pb-1 pt-5 text-xs focus:border-blue-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">
                        Snapshot Submission
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <p>Items: {selectedManagedUsageItems.length}</p>
                        <p>Signatures: {selectedManagedUsageSignatures.length}</p>
                        <p>Review status: {usageManageForm.reviewStatus || "-"}</p>
                      </div>
                    </div>
                  </div>

                  {usageFormMessage ? (
                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      {usageFormMessage}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetUsageManageForm}
                      className="inline-flex items-center rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Reset Form
                    </button>
                    <button
                      type="submit"
                      disabled={usageFormSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {usageFormSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Simpan Implant Usage + Signatures
                    </button>
                  </div>
                </form>
              </div>
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
