"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";

const FILTERS = [
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
  { key: "all", label: "Semua" },
];

function formatDate(value) {
  if (!value) return "Belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum tersedia";
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function UserApprovalAdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busyUid, setBusyUid] = useState("");
  const [message, setMessage] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Gagal memuat akun.");
      setUsers(Array.isArray(result.users) ? result.users : []);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Gagal memuat akun." });
      if (String(error.message).includes("Otorisasi admin")) setUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, []);

  async function unlock(event) {
    event.preventDefault();
    setChecking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ceklist-admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.authorized) throw new Error(result.error || "Kode admin salah.");
      setUnlocked(true);
      setCode("");
      await loadUsers();
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Kode admin salah." });
    } finally {
      setChecking(false);
    }
  }

  async function updateStatus(uid, status) {
    setBusyUid(uid);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Perubahan gagal.");
      setUsers((current) => current.map((user) => (user.uid === uid ? { ...user, status } : user)));
      setMessage({
        type: "success",
        text: status === "approved" ? "Akun berhasil disetujui." : "Permintaan akun ditolak.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Perubahan gagal." });
    } finally {
      setBusyUid("");
    }
  }

  const counts = useMemo(
    () => ({
      all: users.length,
      pending: users.filter((user) => user.status === "pending").length,
      approved: users.filter((user) => user.status === "approved").length,
      rejected: users.filter((user) => user.status === "rejected").length,
    }),
    [users],
  );

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesFilter = filter === "all" || user.status === filter;
      const matchesQuery = !needle || `${user.email} ${user.displayName} ${user.uid}`.toLowerCase().includes(needle);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, users]);

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <form onSubmit={unlock} className="w-full max-w-sm rounded-[28px] border border-white/10 bg-slate-900 p-7 shadow-2xl">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <LockKeyhole size={26} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-400">Admin Access</p>
          <h1 className="mt-2 text-2xl font-black">Persetujuan akun</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Masukkan kode admin untuk melihat dan memproses akun yang mendaftar.</p>
          <label className="mt-6 block text-xs font-bold text-slate-300" htmlFor="admin-code">Kode admin</label>
          <div className="relative mt-2">
            <input
              id="admin-code"
              type={showCode ? "text" : "password"}
              autoComplete="current-password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 py-3 pl-4 pr-12 outline-none focus:border-cyan-400"
              placeholder="Masukkan kode akses"
            />
            <button
              type="button"
              onClick={() => setShowCode((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-cyan-300"
              aria-label={showCode ? "Sembunyikan kode admin" : "Tampilkan kode admin"}
              title={showCode ? "Sembunyikan kode" : "Tampilkan kode"}
            >
              {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Masukkan nilai yang sama dengan <code className="text-slate-400">CHECKLIST_ADMIN_CODE</code> di environment server.
          </p>
          {message && <p className="mt-3 text-sm text-rose-400">{message.text}</p>}
          <button disabled={checking || !code.trim()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:opacity-50">
            {checking ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            Buka dashboard
          </button>
          <Link href="/" className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300"><ArrowLeft size={14} /> Kembali ke aplikasi</Link>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-[26px] bg-slate-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft size={14} /> Kembali</Link>
            <div className="flex items-center gap-3"><UserCheck className="text-cyan-400" /><h1 className="text-2xl font-black">Persetujuan Akun</h1></div>
            <p className="mt-2 text-sm text-slate-400">Kelola akses pengguna dari satu tempat.</p>
          </div>
          <button onClick={loadUsers} disabled={loading} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50">
            <RefreshCw className={loading ? "animate-spin" : ""} size={17} /> Segarkan
          </button>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FILTERS.map((item) => (
            <button key={item.key} onClick={() => setFilter(item.key)} className={`rounded-2xl border p-4 text-left transition ${filter === item.key ? "border-cyan-500 bg-cyan-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <p className="text-2xl font-black">{counts[item.key] || 0}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{item.label}</p>
            </button>
          ))}
        </section>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Cari email, nama, atau UID..." />
        </div>

        {message && <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{message.text}</div>}

        <section className="mt-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
          ) : visibleUsers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">Tidak ada akun pada kategori ini.</div>
          ) : visibleUsers.map((user) => (
            <article key={user.uid} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 font-black text-white">{(user.email || "?")[0].toUpperCase()}</div>
                    <div className="min-w-0"><p className="truncate font-black">{user.email || "Tanpa email"}</p><p className="truncate text-xs text-slate-400">{user.uid}</p></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className={`rounded-full px-2.5 py-1 ${user.status === "approved" ? "bg-emerald-100 text-emerald-700" : user.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{user.status}</span>
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-500"><Clock3 size={12} /> {formatDate(user.createdAt)}</span>
                    {user.emailVerified && <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-blue-700"><Check size={12} /> Email terverifikasi</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.status !== "rejected" && <button disabled={busyUid === user.uid} onClick={() => updateStatus(user.uid, "rejected")} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"><UserX size={15} /> Tolak</button>}
                  {user.status !== "approved" && <button disabled={busyUid === user.uid} onClick={() => updateStatus(user.uid, "approved")} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-600 disabled:opacity-50">{busyUid === user.uid ? <Loader2 className="animate-spin" size={15} /> : <UserCheck size={15} />} Setujui</button>}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
