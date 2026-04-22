import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NotificationsBell from "./NotificationsBell";
import { useAuth } from "../../context/AuthContext";

type User = { name: string; user_type: "buyer" | "lister" | "agent" | "admin" };

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const GRADIENTS: Record<string, string> = {
  buyer:  "from-sky-500 to-sky-700",
  lister: "from-emerald-500 to-emerald-700",
  agent:  "from-cyan-500 to-cyan-700",
  admin:  "from-rose-500 to-rose-700",
};

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={isDark ? "Light mode" : "Dark mode"}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
      {isDark
        ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
      }
    </button>
  );
}

function LangToggle({ lang, onToggle }: { lang: "en" | "ar"; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={lang === "en" ? "Switch to Arabic" : "Switch to English"}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
      {lang === "en" ? "ع" : "EN"}
    </button>
  );
}

function UserMenu({ user, onClose, onLogout }: { user: User; onClose: () => void; onLogout: () => void }) {
  const { t } = useTranslation();
  const links = [
    { label: t("nav.myProfile"),   to: "/profile",   icon: "👤" },
    { label: t("nav.myFavorites"), to: "/favorites", icon: "❤️" },
    ...(user.user_type === "agent" || user.user_type === "lister"
      ? [{ label: t("nav.myListings"), to: "/my-listings", icon: "🏠" },
         { label: t("nav.listProperty"), to: "/list-property", icon: "➕" }]
      : []),
    ...(user.user_type === "admin" ? [{ label: t("nav.adminPanel"), to: "/admin", icon: "⚙️" }] : []),
  ];

  return (
    <div className="absolute end-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50 animate-fadeIn"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{user.name}</p>
        <p className="text-xs capitalize mt-0.5" style={{ color: "var(--text-muted)" }}>{user.user_type}</p>
      </div>
      <nav className="py-1">
        {links.map(({ label, to, icon }) => (
          <Link key={label} to={to} onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--surface2)"; el.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = ""; el.style.color = "var(--text-secondary)"; }}>
            <span>{icon}</span>{label}
          </Link>
        ))}
      </nav>
      <div style={{ borderTop: "1px solid var(--border)" }} className="py-1">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
          style={{ color: "var(--danger)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--danger-light)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t("nav.signOut")}
        </button>
      </div>
    </div>
  );
}

type Props = { onThemeToggle: () => void; isDark: boolean; onLangToggle: () => void; lang: "en" | "ar"; };

export default function Navbar({ onThemeToggle, isDark, onLangToggle, lang }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  function handleLogout() { setMenuOpen(false); logout(); navigate("/"); }

  return (
    <header className="fixed top-0 start-0 w-full z-50 backdrop-blur-md"
      style={{ backgroundColor: "var(--navbar-bg)", borderBottom: "1px solid var(--navbar-border)" }}>
      <div className="relative max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-4">

        {/* LEFT */}
        <nav className="flex gap-5 text-sm">
          {[{ label: t("nav.home"), to: "/" }, { label: t("nav.search"), to: "/search" }, { label: t("nav.favorites"), to: "/favorites" }].map(({ label, to }) => (
            <Link key={to} to={to} className="font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
              {label}
            </Link>
          ))}
          {user && (user.user_type === "agent" || user.user_type === "lister") && (
            <Link to="/list-property" className="font-semibold" style={{ color: "var(--accent)" }}>
              {t("nav.listProperty")}
            </Link>
          )}
        </nav>

        {/* CENTER */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link to="/" className="text-xl font-black tracking-tight" style={{ color: "var(--accent)" }}>
            {lang === "ar" ? "داري" : "Dari"}
          </Link>
        </div>

        {/* RIGHT */}
        <div className="ms-auto flex items-center gap-2">
          <LangToggle lang={lang} onToggle={onLangToggle} />
          <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />

          {/* 🔔 Notifications — only shown when logged in */}
          {user && <NotificationsBell />}

          {user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-full ps-1 pe-3 py-1 transition-all"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${GRADIENTS[user.user_type]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                  {getInitials(user.name)}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate" style={{ color: "var(--text-secondary)" }}>
                  {user.name.split(" ")[0]}
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-faint)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && <UserMenu user={user} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />}
            </div>
          ) : (
            <>
              <Link to="/login" className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--surface2)" }}>
                {t("nav.signIn")}
              </Link>
              <Link to="/signup" className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                {t("nav.signUp")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}