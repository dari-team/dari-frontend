import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, extractErrorMessage } from "../lib/api";

function useAuthPageTheme() {
  useEffect(() => {
    const saved = localStorage.getItem("dari:theme");
    document.documentElement.classList.toggle("dark", saved !== "light");
    const lang = localStorage.getItem("dari:lang") || "en";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);
}

export default function ForgotPasswordPage() {
  useAuthPageTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) { setError("Please enter your email."); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't send reset code."));
    } finally {
      setLoading(false);
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
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Reset your password</p>
        </div>
        <div className="rounded-3xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Forgot password</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Enter your email and we'll send you a 6-digit code to reset your password.
          </p>
          {error && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm"
              style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 mt-2"
              style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: loading ? 0.6 : 1 }}>
              {loading ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Sending…</> : "Send reset code"}
            </button>
          </form>
        </div>
        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          Back to{" "}
          <Link to="/login" className="font-semibold" style={{ color: "var(--accent)" }}>sign in</Link>
        </p>
      </div>
    </div>
  );
}
