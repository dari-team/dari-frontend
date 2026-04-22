import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi, extractErrorMessage } from "../lib/api";

function useAuthPageTheme() {
  useEffect(() => {
    const saved = localStorage.getItem("dari:theme");
    document.documentElement.classList.toggle("dark", saved !== "light");
    const lang = localStorage.getItem("dari:lang") || "en";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);
}

export default function ResetPasswordPage() {
  useAuthPageTheme();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!email || !code || !password) { setError("Fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), code.trim(), password);
      navigate("/login", { state: { resetSuccess: true } });
    } catch (err) {
      setError(extractErrorMessage(err, "Reset failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(""); setInfo("");
    if (!email) { setError("Enter your email first."); return; }
    setResending(true);
    try {
      await authApi.resendResetCode(email.trim());
      setInfo("A new reset code was sent.");
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't resend code."));
    } finally {
      setResending(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text)", width: "100%", borderRadius: 12,
    padding: "10px 16px", fontSize: 14, outline: "none",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
          style={{ background: "var(--accent-light)" }} />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black tracking-tight" style={{ color: "var(--accent)" }}>Dari</Link>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Choose a new password</p>
        </div>
        <div className="rounded-3xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Reset password</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Enter the 6-digit code from your email and your new password.
          </p>
          {error && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm"
              style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>{error}</div>
          )}
          {info && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm"
              style={{ border: "1px solid var(--success)", background: "var(--success-light)", color: "var(--success)" }}>{info}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>Code</label>
              <input inputMode="numeric" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                style={{ ...inputStyle, letterSpacing: "0.4em", textAlign: "center", fontSize: 18 }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>New password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" style={{ ...inputStyle, paddingInlineEnd: 44 }} />
                <button type="button" onClick={() => setShowPass((s) => !s)}
                  className="absolute end-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>Confirm password</label>
              <input type={showPass ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 mt-2"
              style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: loading ? 0.6 : 1 }}>
              {loading ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Resetting…</> : "Reset password"}
            </button>
          </form>

          <button onClick={handleResend} disabled={resending}
            className="w-full mt-3 rounded-xl py-2.5 text-sm font-medium transition"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)", opacity: resending ? 0.6 : 1 }}>
            {resending ? "Resending…" : "Resend code"}
          </button>
        </div>
        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          Back to{" "}
          <Link to="/login" className="font-semibold" style={{ color: "var(--accent)" }}>sign in</Link>
        </p>
      </div>
    </div>
  );
}
