"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, LogIn } from "lucide-react";
import { signInWithEmail } from "@/lib/authServices";

const LOGIN_STYLES = `
  .lp-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: var(--soft-surface-bg);
  }
  .lp-card {
    width: 100%;
    max-width: 380px;
    border-radius: 28px;
    padding: 2rem;
    border: 1px solid var(--soft-border);
    background: var(--soft-raised-bg);
    box-shadow: var(--soft-shadow-raised);
  }
  .lp-input {
    width: 100%;
    border-radius: 14px;
    border: 1px solid var(--soft-border);
    background: var(--soft-inset-bg);
    box-shadow: var(--soft-shadow-inset);
    padding: 0.65rem 0.85rem;
    font-size: 0.8125rem;
    color: var(--soft-text);
    outline: none;
    transition: box-shadow 0.15s;
    box-sizing: border-box;
  }
  .lp-input:focus {
    box-shadow: var(--soft-shadow-inset), 0 0 0 2px rgba(6,182,212,0.22);
  }
  .lp-input::placeholder { color: var(--soft-text-dim, #94a3b8); opacity: 0.6; }
  .lp-btn-primary {
    width: 100%;
    border-radius: 16px;
    border: 1px solid var(--soft-primary-border);
    background: var(--soft-primary-bg);
    box-shadow: var(--soft-shadow-primary);
    padding: 0.7rem 1rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #0f172a;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: opacity 0.15s, transform 0.1s;
  }
  .lp-btn-primary:hover:not(:disabled) { opacity: 0.88; }
  .lp-btn-primary:active:not(:disabled) { transform: scale(0.98); }
  .lp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .lp-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--soft-text);
    margin-bottom: 0.35rem;
    display: block;
  }
  .lp-error {
    border-radius: 12px;
    border: 1px solid rgba(248,113,113,0.25);
    background: rgba(239,68,68,0.08);
    color: #fca5a5;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.55rem 0.8rem;
    text-align: center;
  }
  .lp-icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: 22px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.25rem;
    box-shadow: 0 4px 20px rgba(14,165,233,0.25), 0 0 0 1px rgba(56,189,248,0.15);
  }
  .lp-pw-wrap { position: relative; }
  .lp-pw-toggle {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--soft-text);
    opacity: 0.5;
    padding: 0;
    display: flex;
    align-items: center;
  }
  .lp-pw-toggle:hover { opacity: 0.85; }
`;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await signInWithEmail(email, password);

    if (err) {
      const msg =
        err.includes("user-not-found") ||
        err.includes("wrong-password") ||
        err.includes("invalid-credential")
          ? "Email atau password tidak valid."
          : "Terjadi kesalahan. Coba lagi.";
      setError(msg);
      setLoading(false);
      return;
    }

    router.replace("/");
  };

  return (
    <main className="lp-root">
      <style>{LOGIN_STYLES}</style>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="lp-card"
      >
        <div className="lp-icon-wrap">
          <img src="/animate-zakzav.svg" alt="ZakZav" width={72} height={72} style={{ display: "block" }} />
        </div>

        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--soft-text-hi)", marginBottom: "0.3rem" }}>
            Selamat Datang
          </h1>
          <p style={{ fontSize: "0.78rem", color: "var(--soft-text)", opacity: 0.7 }}>
            Masuk untuk mengakses workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="lp-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="lp-input"
              type="email"
              placeholder="email@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="lp-label" htmlFor="password">Password</label>
            <div className="lp-pw-wrap">
              <input
                id="password"
                className="lp-input"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                style={{ paddingRight: "2.5rem" }}
              />
              <button type="button" className="lp-pw-toggle" onClick={() => setShowPw((s) => !s)} tabIndex={-1}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="lp-error"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" className="lp-btn-primary" disabled={loading} style={{ marginTop: "0.25rem" }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
