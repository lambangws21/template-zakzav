"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Loader2,
  FolderOpen,
  RefreshCcw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  ImageIcon,
  HardDriveUpload,
} from "lucide-react";

const ENDPOINT = process.env.NEXT_PUBLIC_GOOGLE_SHEET_IMAGE_ENDPOINT || "";

// ─── Konfigurasi folder ───────────────────────────────────────────────────────
// Folder utama berisi kategori-kategori implant
const LIBRARY_FOLDER_ID =
  process.env.NEXT_PUBLIC_DRIVE_IMPLANT_LIBRARY_FOLDER_ID || "";

// Subfolder yang sudah diketahui ID-nya — ditampilkan langsung tanpa Apps Script
// Nama diambil otomatis dari Drive, ID daftar ini sebagai sumber kebenaran
const KNOWN_SUBFOLDER_IDS = [
  "125UKUo7PiTBwlU5xOQzUSQ0644JYJdw0",
  "13ztEkGdXbcMlmF-nXEpoYqnEpU58nNAv",
  "14RB7ffoyK6jpBtVRtBAneVYcIeZ_iCMV",
  "1jqQEOS-jczIwHr7jmB_krfwBiIw6RBhe",
];

// ─── Emoji per kata kunci nama folder ────────────────────────────────────────
const CATEGORY_EMOJI = {
  "stem femur": "🦴", stem: "🦴", femur: "🦴",
  cup: "⊙", acetabular: "⊙",
  head: "🔵", bipolar: "🔵",
  insert: "📦", tibial: "🦵",
  patella: "⭕", revision: "🔧",
  augment: "🧩", liner: "🫧",
};

function getCategoryEmoji(name = "") {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return "📁";
}

// ─── Helpers fetch ────────────────────────────────────────────────────────────

/** Ambil nama-nama folder dari route /api/google-drive-folder */
async function fetchFolderNames(ids) {
  if (!ids.length) return {};
  try {
    const res = await fetch(
      `/api/google-drive-folder?ids=${ids.join(",")}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    const map = {};
    for (const f of json?.folders || []) {
      if (f.id && f.name) map[f.id] = f.name;
    }
    return map;
  } catch {
    return {};
  }
}

/** Ambil daftar gambar dalam folder via Apps Script */
async function fetchFolderImages(folderId) {
  if (!ENDPOINT || !folderId) return null;
  try {
    const params = new URLSearchParams({
      url: ENDPOINT,
      action: "list_drive_folder",
      folderId,
      withFiles: "true",
    });
    const res = await fetch(`/api/google-sheet-images?${params}`, {
      cache: "no-store",
    });
    const json = await res.json();
    return json?.remote?.ok ? json.remote : null;
  } catch {
    return null;
  }
}

// ─── Image card ───────────────────────────────────────────────────────────────

function ImageCard({ img, onSelect }) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  const src = `/api/google-drive-image?driveId=${img.id}`;
  const label = img.name.replace(/\.[^.]+$/, "");

  return (
    <button
      type="button"
      onClick={() => onSelect({ ...img, src, label })}
      className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-800/60 transition hover:border-sky-500/60 hover:ring-1 hover:ring-sky-500/40 active:scale-95"
    >
      {!err ? (
        <img
          src={src}
          alt={label}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErr(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-600">
          <ImageIcon className="h-5 w-5" />
          <span className="px-1 text-center text-[7px]">Gagal muat</span>
        </div>
      )}
      {!loaded && !err && (
        <div className="absolute inset-0 animate-pulse bg-slate-700/50" />
      )}
      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/90 px-2 pb-2 pt-5 transition-transform group-hover:translate-y-0">
        <p className="truncate text-[8px] font-black text-white">{label}</p>
      </div>
    </button>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({ id, name, onClick }) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3.5 text-left transition hover:border-sky-500/30 hover:bg-white/[0.08] active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-700/60 text-2xl">
        {getCategoryEmoji(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-black text-white leading-tight">
          {name}
        </p>
        <p className="mt-0.5 text-[9px] text-slate-500">Ketuk untuk lihat gambar</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
    </motion.button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DriveImplantLibraryPanel({ isOpen, onClose, onSelect }) {
  // categories: [{ id, name }]
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // active folder view
  const [activeCategory, setActiveCategory] = useState(null);
  const [images, setImages] = useState([]);
  const [loadingImgs, setLoadingImgs] = useState(false);
  const [appsScriptMissing, setAppsScriptMissing] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // ── Load category names ──────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    setLoadingCats(true);
    setError("");

    // Resolusi nama selalu dari known IDs + opsional dari Apps Script
    const nameMap = await fetchFolderNames(KNOWN_SUBFOLDER_IDS);

    const cats = KNOWN_SUBFOLDER_IDS.map((id) => ({
      id,
      name: nameMap[id] || `Folder (${id.slice(0, 8)}…)`,
    }));

    // Jika folder library dikonfigurasi DAN Apps Script tersedia, coba ambil
    // subfolder dinamis (mungkin ada kategori baru yang belum ada di KNOWN list)
    if (LIBRARY_FOLDER_ID && ENDPOINT) {
      try {
        const params = new URLSearchParams({
          url: ENDPOINT,
          action: "list_drive_folder",
          folderId: LIBRARY_FOLDER_ID,
          withFiles: "false",
        });
        const res = await fetch(`/api/google-sheet-images?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json?.remote?.ok && Array.isArray(json.remote.subfolders)) {
          const dynamic = json.remote.subfolders;
          const existingIds = new Set(cats.map((c) => c.id));
          for (const sub of dynamic) {
            if (!existingIds.has(sub.id)) {
              cats.push({ id: sub.id, name: sub.name || sub.id });
            }
          }
        }
      } catch {
        // Apps Script belum diperbarui — biarkan saja, KNOWN list tetap tampil
      }
    }

    setCategories(cats);
    setLoadingCats(false);
  }, []);

  // ── Load images inside a folder ──────────────────────────────────────────
  const loadImages = useCallback(async (cat) => {
    setActiveCategory(cat);
    setImages([]);
    setSearch("");
    setAppsScriptMissing(false);
    setLoadingImgs(true);

    const data = await fetchFolderImages(cat.id);

    if (!data) {
      setAppsScriptMissing(true);
    } else {
      setImages(data.files || []);
    }
    setLoadingImgs(false);
  }, []);

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setActiveCategory(null);
    setImages([]);
    setSearch("");
    setError("");
    setAppsScriptMissing(false);
    loadCategories();
  }, [isOpen, loadCategories]);

  const filtered = images.filter(
    (img) => !search || img.name.toLowerCase().includes(search.toLowerCase())
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-end justify-center bg-slate-950/65 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="flex w-full max-w-[min(100%,660px)] flex-col overflow-hidden rounded-t-[28px] border border-white/[0.08] bg-[#0d1526] shadow-2xl sm:rounded-[28px]"
            style={{ maxHeight: "92dvh" }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* ── Header ── */}
            <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#080f1d] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-600">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-white">
                  Library Implant Drive
                </p>
                <p className="mt-0.5 text-[9px] leading-none text-slate-400">
                  {activeCategory
                    ? activeCategory.name
                    : `${categories.length} kategori tersedia`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {activeCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory(null);
                      setImages([]);
                      setSearch("");
                    }}
                    className="flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1.5 text-[10px] font-black text-slate-300 transition hover:bg-white/15"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Kembali
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(null);
                    setImages([]);
                    loadCategories();
                  }}
                  disabled={loadingCats}
                  title="Refresh"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-slate-400 transition hover:bg-white/15 disabled:opacity-40"
                >
                  <RefreshCcw
                    className={`h-3.5 w-3.5 ${loadingCats ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-slate-400 transition hover:bg-white/15"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">
              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-red-800/50 bg-red-950/30 px-3 py-2.5"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                    <p className="text-[10px] text-red-300">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Daftar kategori ── */}
              {!activeCategory && (
                <div className="p-4 space-y-2">
                  {loadingCats ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-xs">Mengambil nama folder dari Drive...</span>
                    </div>
                  ) : (
                    <>
                      <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Pilih Kategori Implant
                      </p>
                      <div className="space-y-1.5">
                        {categories.map((cat) => (
                          <CategoryCard
                            key={cat.id}
                            id={cat.id}
                            name={cat.name}
                            onClick={() => loadImages(cat)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Grid gambar ── */}
              {activeCategory && (
                <div className="space-y-3 p-4">
                  {/* Apps Script belum diperbarui */}
                  {appsScriptMissing && !loadingImgs && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 rounded-2xl border border-amber-700/40 bg-amber-950/30 px-4 py-3.5"
                    >
                      <HardDriveUpload className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-[11px] font-black text-amber-300">
                          Apps Script belum diperbarui
                        </p>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-amber-500">
                          Untuk menampilkan gambar di dalam folder, perbarui Google Apps Script
                          kamu dengan kode yang ada di file{" "}
                          <span className="font-black text-amber-300">
                            APPSCRIPT_UPDATE.gs
                          </span>{" "}
                          lalu deploy ulang.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Search */}
                  {!appsScriptMissing && !loadingImgs && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Cari di ${activeCategory.name}...`}
                        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none transition focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                      />
                    </div>
                  )}

                  {/* Loading */}
                  {loadingImgs && (
                    <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-xs">Memuat gambar dari Drive...</span>
                    </div>
                  )}

                  {/* Empty */}
                  {!loadingImgs && !appsScriptMissing && filtered.length === 0 && (
                    <div className="py-16 text-center">
                      <ImageIcon className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                      <p className="text-xs text-slate-500">
                        {search
                          ? `Tidak ada gambar cocok "${search}"`
                          : "Tidak ada gambar di folder ini."}
                      </p>
                    </div>
                  )}

                  {/* Grid */}
                  {!loadingImgs && filtered.length > 0 && (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {filtered.length} gambar · {activeCategory.name}
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {filtered.map((img) => (
                          <ImageCard
                            key={img.id}
                            img={img}
                            onSelect={(item) => {
                              onSelect?.(item);
                              onClose();
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 border-t border-white/[0.07] px-5 py-3">
              <p className="text-center text-[9px] text-slate-600">
                Nama folder dari Google Drive · Gambar ter-cache 5 menit
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
