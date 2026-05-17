// LoginPage.tsx
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";

// Auth pages handle their own theme class since they live outside MainLayout
function useAuthPageTheme() {
  useEffect(() => {
    const saved = localStorage.getItem("dari:theme");
    document.documentElement.classList.toggle("dark", saved !== "light");
    const lang = localStorage.getItem("dari:lang") || "en";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);
}

export default function LoginPage() {
  useAuthPageTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const auth = useAuth();

  // Preserve a ?redirect target or state.from set by ProtectedRoute.
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
    if (res.ok) {
      navigate(from, { replace: true });
      return;
    }
    if (res.requiresVerification) {
      navigate("/verify-email", { state: { email: email.trim() } });
      return;
    }
    setError(res.error ?? "Login failed.");
  }

  async function handleGoogleCredential(cred: CredentialResponse) {
    if (!cred.credential) { setError("Google did not return a credential."); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      const res = await auth.loginWithGoogle(cred.credential);
      setLoading(false);
      if (res.ok) { navigate(from || "/", { replace: true }); return; }
      if (res.needsProfile) {
        navigate("/complete-profile", { replace: true, state: res.needsProfile });
        return;
      }
      setError(res.error ?? "Google sign-in failed.");
    } catch {
      setLoading(false);
      setError("Google sign-in failed. Please try again.");
    }
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 sm:py-16 safe-pt safe-pb"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
          style={{ background: "var(--accent-light)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black tracking-tight" style={{ color: "var(--accent)" }}>
            {t("hero.eyebrow") === "أذكى منصة عقارية في مصر" ? "داري" : "Dari"}
          </Link>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>{t("auth.login.welcome")}</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
          <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text)" }}>{t("auth.login.title")}</h1>

          {error && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>{error}</div>
          )}
          {info && !error && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid var(--success)", background: "var(--success-light)", color: "var(--success)" }}>{info}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: t("auth.login.email"), val: email, set: setEmail, type: "email", ph: "you@example.com" },
              { label: t("auth.login.password"), val: password, set: setPassword, type: showPass ? "text" : "password", ph: "••••••••" },
            ].map(({ label, val, set, type, ph }) => (
              <div key={label}>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
                <div className="relative">
                  <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                    className={inputCls}
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                  {label === t("auth.login.password") && (
                    <button type="button" onClick={() => setShowPass((s) => !s)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 transition"
                      style={{ color: "var(--text-faint)" }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                </div>
                {label === t("auth.login.password") && (
                  <div className="flex justify-end mt-1.5">
                    <Link to="/forgot-password" className="text-xs transition" style={{ color: "var(--text-faint)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}>
                      {t("auth.login.forgot")}
                    </Link>
                  </div>
                )}
              </div>
            ))}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 mt-2"
              style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: loading ? 0.6 : 1 }}>
              {loading ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />{t("auth.login.signingIn")}</> : t("auth.login.signIn")}
            </button>
          </form>

          {/* Social login divider + providers */}
          <div className="flex items-center gap-3 my-5" style={{ color: "var(--text-faint)" }}>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <GoogleLogin
              onSuccess={handleGoogleCredential}
              onError={() => setError("Google sign-in was cancelled or failed.")}
              useOneTap={false}
              theme="outline"
            />
          </div>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          {t("auth.login.noAccount")}{" "}
          <Link to="/signup" className="font-semibold transition" style={{ color: "var(--accent)" }}>{t("auth.login.create")}</Link>
        </p>
      </div>
    </div>
  );
}