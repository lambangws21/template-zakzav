"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, logOut } from "@/lib/authServices";
import { firebaseClientError } from "@/lib/firebaseClient";

const AuthContext = createContext({ user: null, loading: true, userStatus: null, authError: null });
const AUTH_STARTUP_TIMEOUT_MS = 12000;
const AUTH_STARTUP_TIMEOUT_MESSAGE =
  "Pemeriksaan sesi terlalu lama. Periksa koneksi lalu coba lagi.";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authAttempt, setAuthAttempt] = useState(0);
  const inactivityTimer = useRef(null);
  const unsubDoc = useRef(null);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (auth.currentUser) logOut();
    }, 3600000); // 1 jam
  };

  const retryAuth = useCallback(() => {
    setAuthError(null);
    setLoading(true);
    setAuthAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    if (!auth || !db) {
      setAuthError(firebaseClientError || "Firebase Auth tidak tersedia.");
      setLoading(false);
      return;
    }
    setAuthError(null);
    setLoading(true);
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const target = new URL(rawUrl, window.location.href);
      if (target.origin !== window.location.origin || !target.pathname.startsWith("/api/")) {
        return nativeFetch(input, init);
      }
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (auth.currentUser && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${await auth.currentUser.getIdToken()}`);
      }
      return nativeFetch(input, { ...init, headers });
    };

    const authStartupTimer = window.setTimeout(() => {
      setAuthError(AUTH_STARTUP_TIMEOUT_MESSAGE);
      setLoading(false);
    }, AUTH_STARTUP_TIMEOUT_MS);

    const unsubAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        window.clearTimeout(authStartupTimer);
        setAuthError(null);
        // Bersihkan listener Firestore sebelumnya
        if (unsubDoc.current) {
          unsubDoc.current();
          unsubDoc.current = null;
        }

        setUser(currentUser);

        if (currentUser) {
          resetInactivityTimer();
          // Jangan menahan seluruh UI sambil menunggu Firestore. Default tetap
          // fail-closed sampai dokumen status pengguna berhasil dibaca.
          setUserStatus("pending");
          setLoading(false);
          // Listen status user dari Firestore secara real-time
          unsubDoc.current = onSnapshot(
            doc(db, "users", currentUser.uid),
            (snap) => {
              setUserStatus(snap.exists() ? snap.data().status : "pending");
            },
            () => {
              setUserStatus("pending");
            },
          );
        } else {
          if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
          setUserStatus(null);
          setLoading(false);
        }
      },
      (error) => {
        window.clearTimeout(authStartupTimer);
        setAuthError(
          error?.message || "Sesi login gagal diperiksa. Silakan coba lagi.",
        );
        setLoading(false);
      },
    );

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      if (auth.currentUser) resetInactivityTimer();
    };
    events.forEach((e) => window.addEventListener(e, handleActivity));

    return () => {
      unsubAuth();
      if (unsubDoc.current) unsubDoc.current();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      window.clearTimeout(authStartupTimer);
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      window.fetch = nativeFetch;
    };
  }, [authAttempt]);

  return (
    <AuthContext.Provider
      value={{ user, loading, userStatus, authError, retryAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
