// LoginPage.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { Hieroglyph, type GlyphKind } from "../components/pharaonic/Glyphs";
import { AuthTopControls, AuthArtPanel } from "../components/pharaonic/AuthArt";
import { useAuthPagePrefs } from "../components/pharaonic/authPrefs";

function Field({
  icon, label, type = "text", value, onChange, placeholder, trailing,
}: {
  icon: GlyphKind; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; trailing?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="ph-eyebrow block mb-1.5" style={{ fontSize: 9 }}>{label}</span>
      <div className="relative">
        <div className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ insetInlineStart: 14, color: "var(--gold-deep)" }}>
          <Hieroglyph kind={icon} size={16} color="currentColor" strokeWidth={1.6} />
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md text-sm outline-none transition"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text)", padding: "13px 14px", paddingInlineStart: 42, paddingInlineEnd: trailing ? 44 : 14 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        {trailing}
      </div>
    </label>
  );
}

export default function LoginPage() {
  const { dark, lang, toggleTheme, toggleLang } = useAuthPagePrefs();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const auth = useAuth();
  const isAr = lang === "ar";

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";
  const verifiedEmail = (location.state as { verifiedEmail?: string } | null)?.verifiedEmail ?? "";
  const resetSuccess = (location.state as { resetSuccess?: boolean } | null)?.resetSuccess;

  const [email, setEmail]       = useState(verifiedEmail);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState<string>(() => {
    if (verifiedEmail) return "Email verified. You can now sign in.";
    if (resetSuccess) return "Password reset. You can now sign in.";
    return "";
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError(""); setInfo("");
    const res = await auth.login(email.trim(), password);
    setLoading(false);
    if (res.ok) { navigate(from, { replace: true }); return; }
    if (res.requiresVerification) { navigate("/verify-email", { state: { email: email.trim() } }); return; }
    setError(res.error ?? "Login failed.");
  }

  async function handleGoogleCredential(cred: CredentialResponse) {
    if (!cred.credential) { setError("Google did not return a credential."); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      const res = await auth.loginWithGoogle(cred.credential);
      setLoading(false);
      if (res.ok) { navigate(from || "/", { replace: true }); return; }
      if (res.needsProfile) { navigate("/complete-profile", { replace: true, state: res.needsProfile }); return; }
      setError(res.error ?? "Google sign-in failed.");
    } catch {
      setLoading(false);
      setError("Google sign-in failed. Please try again.");
    }
  }

  return (
    <div className="pharaonic min-h-screen grid lg:grid-cols-[1.1fr_1fr]" dir={isAr ? "rtl" : "ltr"} style={{ background: "var(--bg)", color: "var(--text)" }}>
      <AuthArtPanel
        lang={lang}
        headline={<>{isAr ? "ابحث عن منزلك" : "Find your home,"}<br /><em className="ph-gold-text" style={{ fontStyle: "italic", fontWeight: 600 }}>{isAr ? "في أرض الفراعنة." : "in the land of pharaohs."}</em></>}
        sub={isAr
          ? "انضم إلى آلاف الباحثين عن منزل أحلامهم في مصر — مع إعلانات موثقة وتجربة بحث ذكية."
          : "Join thousands finding their dream home across Egypt — with verified listings and a smarter way to search."}
      />

      <main className="relative flex items-center justify-center px-5 py-14 sm:px-12 safe-pt safe-pb">
        <AuthTopControls dark={dark} lang={lang} toggleTheme={toggleTheme} toggleLang={toggleLang} />

        <div className="w-full max-w-[440px]">
          <div className="flex items-center gap-3.5 mb-7" style={{ color: "var(--gold)" }}>
            <hr className="flex-1 border-0 border-t" style={{ borderColor: "var(--border)" }} />
            <Hieroglyph kind="sun" size={26} color="var(--gold)" strokeWidth={1.4} />
            <hr className="flex-1 border-0 border-t" style={{ borderColor: "var(--border)" }} />
          </div>

          <h1 className="ph-display text-center" style={{ fontSize: 44, fontWeight: 500, color: "var(--text)", lineHeight: 1.05 }}>
            {isAr ? "أهلاً بعودتك" : "Welcome back"}
          </h1>
          <p className="text-center text-sm mt-2.5 mb-8" style={{ color: "var(--text-muted)" }}>
            {isAr ? "ادخل إلى منزلك الرقمي" : "Step into your digital house"}
          </p>

          <div className="flex p-1 rounded-md mb-6" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <button className="flex-1 py-2.5 rounded text-sm font-bold" style={{ background: "var(--gold-gradient)", color: "#1F1A12" }}>
              {t("auth.login.signIn")}
            </button>
            <button onClick={() => navigate("/signup")} className="flex-1 py-2.5 rounded text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              {t("nav.signUp")}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md px-4 py-3 text-sm" style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>{error}</div>
          )}
          {info && !error && (
            <div className="mb-4 rounded-md px-4 py-3 text-sm" style={{ border: "1px solid var(--success)", background: "var(--success-light)", color: "var(--success)" }}>{info}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <Field icon="eye" type="email" label={t("auth.login.email")} value={email} onChange={setEmail} placeholder="you@dari.eg" />
            <Field
              icon="djed"
              type={showPass ? "text" : "password"}
              label={t("auth.login.password")}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              trailing={
                <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute end-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              }
            />

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <input type="checkbox" style={{ accentColor: "var(--gold)" }} />
                {isAr ? "تذكرني" : "Remember me"}
              </label>
              <Link to="/forgot-password" className="font-semibold" style={{ color: "var(--gold-deep)" }}>{t("auth.login.forgot")}</Link>
            </div>

            <button type="submit" disabled={loading} className="ph-btn-gold w-full rounded-md py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-2" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />{t("auth.login.signingIn")}</>
                : <><Hieroglyph kind="ankh" size={14} color="currentColor" strokeWidth={1.6} />{t("auth.login.signIn")}</>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5" style={{ color: "var(--text-faint)" }}>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs uppercase tracking-widest">{isAr ? "أو" : "or"}</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleGoogleCredential} onError={() => setError("Google sign-in was cancelled or failed.")} useOneTap={false} theme="outline" />
          </div>

          <p className="text-center text-sm mt-7" style={{ color: "var(--text-muted)" }}>
            {t("auth.login.noAccount")}{" "}
            <Link to="/signup" className="font-bold" style={{ color: "var(--gold-deep)" }}>{t("auth.login.create")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
