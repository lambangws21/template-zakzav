"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logOut } from "@/lib/authServices";

const PUBLIC_PATHS = ["/login"];

export default function AppAuthGate({ children }) {
  const { user, loading, userStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!user && !isPublic) {
      router.replace("/login");
    } else if (user && isPublic && userStatus !== "pending") {
      router.replace("/");
    }
  }, [user, loading, pathname, router, userStatus]);

  if (loading) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center"
        style={{ background: "var(--soft-surface-bg)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-transparent border-t-cyan-400" />
          <span className="text-xs font-semibold text-slate-400">Memuat sesi...</span>
        </div>
      </div>
    );
  }

  // Akun sudah dibuat tapi belum disetujui admin
  if (user && userStatus === "pending") {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center px-4"
        style={{ background: "var(--soft-surface-bg)" }}
      >
        <div
          className="w-full max-w-sm text-center"
          style={{
            borderRadius: 28,
            padding: "2rem",
            border: "1px solid var(--soft-border)",
            background: "var(--soft-raised-bg)",
            boxShadow: "var(--soft-shadow-raised)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              border: "1px solid var(--soft-border)",
              background: "var(--soft-inset-bg)",
              boxShadow: "var(--soft-shadow-inset)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--soft-text-hi)",
              marginBottom: "0.5rem",
            }}
          >
            Menunggu Persetujuan
          </h2>
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--soft-text)",
              opacity: 0.7,
              lineHeight: 1.6,
              marginBottom: "1.5rem",
            }}
          >
            Akun kamu sudah terdaftar. Admin akan mereview dan menyetujui akses
            secepatnya. Kamu akan otomatis masuk begitu disetujui.
          </p>
          <p
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--soft-text)",
              opacity: 0.5,
              marginBottom: "1.25rem",
            }}
          >
            {user.email}
          </p>
          <button
            type="button"
            onClick={() => logOut()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: 14,
              border: "1px solid var(--soft-border)",
              background: "var(--soft-inset-bg)",
              boxShadow: "var(--soft-shadow-inset)",
              padding: "0.55rem 1rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--soft-text)",
              cursor: "pointer",
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);
  if (!user && !isPublic) return null;

  return <>{children}</>;
}
