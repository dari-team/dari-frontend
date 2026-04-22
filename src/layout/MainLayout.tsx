import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../components/navbar/Navbar";
import SubscriptionBanner from "../components/subscription/SubscriptionBanner";

export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("dari:theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("dari:theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

export function useLang() {
  const { i18n } = useTranslation();
  const [lang, setLangState] = useState<"en" | "ar">(
    () => (localStorage.getItem("dari:lang") as "en" | "ar") || "en"
  );

  useEffect(() => {
    i18n.changeLanguage(lang);
    localStorage.setItem("dari:lang", lang);
    // RTL for Arabic
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, i18n]);

  const toggle = () => setLangState((l) => (l === "en" ? "ar" : "en"));
  return { lang, toggle };
}

export default function MainLayout() {
  const { dark, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang }  = useLang();

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      <Navbar
        onThemeToggle={toggleTheme}
        isDark={dark}
        onLangToggle={toggleLang}
        lang={lang}
      />
      <SubscriptionBanner />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}