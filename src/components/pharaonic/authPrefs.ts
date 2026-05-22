// Non-component helpers for the pharaonic auth pages (kept out of the component
// file so React Fast Refresh stays happy).
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Auth pages live outside MainLayout, so they manage their own theme + language.
export function useAuthPagePrefs() {
  const { i18n } = useTranslation();
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("dari:theme") !== "light");
  const [lang, setLang] = useState<"en" | "ar">(() => (localStorage.getItem("dari:lang") as "en" | "ar") || "en");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("dari:theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    i18n.changeLanguage(lang);
    localStorage.setItem("dari:lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, i18n]);

  return {
    dark, lang,
    toggleTheme: () => setDark((d) => !d),
    toggleLang: () => setLang((l) => (l === "en" ? "ar" : "en")),
  };
}

export const iconBtn: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 10, background: "var(--surface)",
  border: "1px solid var(--border)", color: "var(--text-muted)",
  display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
