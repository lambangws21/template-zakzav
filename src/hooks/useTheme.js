"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "zakzav-theme";
const DARK = "dark";
const LIGHT = "light";

function getInitialTheme() {
  if (typeof window === "undefined") return LIGHT;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === DARK || stored === LIGHT) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK : LIGHT;
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === DARK) {
    root.setAttribute("data-theme", DARK);
  } else {
    root.removeAttribute("data-theme");
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(LIGHT);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === DARK ? LIGHT : DARK;
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, isDark: theme === DARK, toggle };
}
