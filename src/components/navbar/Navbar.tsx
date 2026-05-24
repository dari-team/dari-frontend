import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NotificationsBell from "./NotificationsBell";
import { useAuth } from "../../context/AuthContext";
import { DariMark } from "../pharaonic/Glyphs";
import Avatar from "../Avatar";

type User = {
  name: string;
  user_type: "buyer" | "lister" | "agent" | "admin";
  profilePictureUrl?: string | null;
};

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={isDark ? "Light mode" : "Dark mode"} aria-label="Toggle theme"
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0"
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
    <button onClick={onToggle} title={lang === "en" ? "Switch to Arabic" : "Switch to English"} aria-label="Toggle language"
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200 flex-shrink-0"
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  function handleLogout() { setMenuOpen(false); setMobileOpen(false); logout(); navigate("/"); }

  const navLinks = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.search"), to: "/search" },
    { label: t("nav.favorites"), to: "/favorites" },
  ];

  const isListerOrAgent = !!user && (user.user_type === "agent" || user.user_type === "lister");
  const isHome = location.pathname === "/";

  return (
    <>
      <header className="fixed top-0 start-0 w-full z-50 backdrop-blur-md safe-pt"
        style={{ backgroundColor: "var(--navbar-bg)", borderBottom: "1px solid var(--navbar-border)" }}>
        <div className="relative mx-auto max-w-[1400px] px-3 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">

          {/* MOBILE: Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* DESKTOP: LEFT NAV */}
          <nav className="hidden md:flex gap-5 text-sm">
            {navLinks.map(({ label, to }) => (
              <Link key={to} to={to} className="font-medium transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                {label}
              </Link>
            ))}
            {isListerOrAgent && (
              <Link to="/list-property" className="font-semibold" style={{ color: "var(--accent)" }}>
                {t("nav.listProperty")}
              </Link>
            )}
          </nav>

          {/* CENTER: logo (always centered absolutely on desktop, inline on mobile) */}
          <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 md:flex-none flex justify-center md:justify-start">
            <Link to="/" className="flex items-center gap-2" style={{ color: "var(--accent)" }}>
              {isHome && <DariMark size={26} />}
              <span
                className={isHome ? "ph-display tracking-wide" : "text-xl font-black tracking-tight"}
                style={isHome ? { fontSize: 26, fontWeight: 700 } : undefined}
              >
                {lang === "ar" ? "داري" : "Dari"}
              </span>
            </Link>
          </div>

          {/* RIGHT */}
          <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
            {/* hide language + theme on very small screens — available in drawer */}
            <div className="hidden xs:flex sm:flex items-center gap-2">
              <LangToggle lang={lang} onToggle={onLangToggle} />
              <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
            </div>

            {user && <NotificationsBell />}

            {user ? (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 sm:gap-2.5 rounded-full ps-1 pe-2 sm:pe-3 py-1 transition-all"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <Avatar name={user.name} src={user.profilePictureUrl} userType={user.user_type}
                    sizeClassName="w-7 h-7 sm:w-8 sm:h-8" textClassName="text-xs" />
                  <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate" style={{ color: "var(--text-secondary)" }}>
                    {user.name.split(" ")[0]}
                  </span>
                  <svg className={`hidden sm:block w-3.5 h-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-faint)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {menuOpen && <UserMenu user={user} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />}
              </div>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--surface2)" }}>
                  {t("nav.signIn")}
                </Link>
                <Link to="/signup" className="px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                  {t("nav.signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="md:hidden fixed top-0 start-0 bottom-0 z-[70] w-[82%] max-w-sm flex flex-col safe-pt"
            style={{ background: "var(--surface)", borderInlineEnd: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}
            role="dialog"
            aria-label="Navigation menu"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <Link to="/" onClick={() => setMobileOpen(false)} className="text-2xl font-black tracking-tight" style={{ color: "var(--accent)" }}>
                {lang === "ar" ? "داري" : "Dari"}
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Identity strip */}
            {user ? (
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-4"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <Avatar name={user.name} src={user.profilePictureUrl} userType={user.user_type}
                  sizeClassName="w-12 h-12" textClassName="text-sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{user.name}</p>
                  <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{user.user_type}</p>
                </div>
              </Link>
            ) : (
              <div className="flex gap-2 px-4 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "var(--surface2)" }}>
                  {t("nav.signIn")}
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-bold"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                  {t("nav.signUp")}
                </Link>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-2">
              {navLinks.map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {label}
                </Link>
              ))}
              {isListerOrAgent && (
                <>
                  <Link
                    to="/list-property"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    {t("nav.listProperty")}
                  </Link>
                  <Link
                    to="/my-listings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t("nav.myListings")}
                  </Link>
                </>
              )}
              {user?.user_type === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("nav.adminPanel")}
                </Link>
              )}
              {user && (
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("nav.myProfile")}
                </Link>
              )}
            </nav>

            {/* Drawer footer — preferences + logout */}
            <div className="px-4 py-3 safe-pb" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <LangToggle lang={lang} onToggle={onLangToggle} />
                <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {lang === "ar" ? "اللغة والمظهر" : "Language & theme"}
                </span>
              </div>
              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ color: "var(--danger)", background: "var(--danger-light)" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t("nav.signOut")}
                </button>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
