"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, logOut } from "@/lib/authServices";

const AuthContext = createContext({ user: null, loading: true, userStatus: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null);
  const inactivityTimer = useRef(null);
  const unsubDoc = useRef(null);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (auth.currentUser) logOut();
    }, 3600000); // 1 jam
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      // Bersihkan listener Firestore sebelumnya
      if (unsubDoc.current) {
        unsubDoc.current();
        unsubDoc.current = null;
      }

      setUser(currentUser);

      if (currentUser) {
        resetInactivityTimer();
        // Listen status user dari Firestore secara real-time
        unsubDoc.current = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
          // Jika tidak ada dokumen (misal akun admin lama), anggap approved
          setUserStatus(snap.exists() ? snap.data().status : "approved");
          setLoading(false);
        });
      } else {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        setUserStatus(null);
        setLoading(false);
      }
    });

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      if (auth.currentUser) resetInactivityTimer();
    };
    events.forEach((e) => window.addEventListener(e, handleActivity));

    return () => {
      unsubAuth();
      if (unsubDoc.current) unsubDoc.current();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
