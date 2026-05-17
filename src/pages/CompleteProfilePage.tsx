// CompleteProfilePage.tsx
// Shown after Google sign-in when the backend reports { needsProfile: true }.
// Collects account type + (for lister/agent) agency/license + phone, then
// calls /Auth/google-complete to create the account and log the user in.

import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { toApiTypes, type UiUserType } from "../lib/userTypeMap";

function useAuthPageTheme() {
  useEffect(() => {
    const saved = localStorage.getItem("dari:theme");
    document.documentElement.classList.toggle("dark", saved !== "light");
    const lang = localStorage.getItem("dari:lang") || "en";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);
}

type NavState = { idToken: string; email: string; name: string } | null;

const USER_TYPES: { value: UiUserType; icon: string; label: string; desc: string }[] = [
  { value: "buyer",  icon: "🔍", label: "Buyer / Renter", desc: "Browse and save listings, contact agents." },
  { value: "lister", icon: "🏠", label: "Seller",         desc: "Post your own property listings." },
  { value: "agent",  icon: "🏢", label: "Agent",          desc: "Manage multiple listings on behalf of clients." },
];

export default function CompleteProfilePage() {
  useAuthPageTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const auth = useAuth();
  const state = (location.state as NavState) ?? null;

  const [selected, setSelected] = useState<UiUserType | null>(null);
  const [phone, setPhone]       = useState("");
  const [agency, setAgency]     = useState("");
  const [license, setLicense]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]           = useState("");

  // If someone lands here directly without Google state, bounce to /login.
  if (!state?.idToken) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state?.idToken) return;
    if (!selected) { setErr("Please choose an account type."); return; }
    if (!phone.trim()) { setErr("Phone number is required."); return; }
    if (!/^\d{11}$/.test(phone.trim())) { setErr("Phone number must be exactly 11 digits (e.g. 01000000000)."); return; }
    setSubmitting(true); setErr("");
    const typeMap = toApiTypes(selected);
    const res = await auth.completeGoogleProfile({
      idToken: state.idToken,
      userType: typeMap.userType,
      customerType: typeMap.customerType ?? null,
      listerType: typeMap.listerType ?? null,
      agencyName: selected === "buyer" ? null : (agency.trim() || null),
      licenseNumber: selected === "buyer" ? null : (license.trim() || null),
      phoneNumber: phone.trim() || null,
    });
    setSubmitting(false);
    if (res.ok) { navigate("/", { replace: true }); return; }
    setErr(res.error ?? "Could not finish sign-up.");
  }

  const isAr = t("hero.eyebrow") === "أذكى منصة عقارية في مصر";
  const needsLister = selected === "lister" || selected === "agent";

  const inputStyle: React.CSSProperties = {
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text)", width: "100%", borderRadius: 12,
    padding: "10px 16px", fontSize: 14, outline: "none",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 sm:py-16 safe-pt safe-pb"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{ background: "var(--accent-light)" }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-black tracking-tight" style={{ color: "var(--accent)" }}>
            {isAr ? "داري" : "Dari"}
          </Link>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Welcome, {state.name || state.email}. Let's finish setting up your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl p-7 space-y-5 shadow-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
          <div>
            <h1 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Choose your account type</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>You can change this later in your profile.</p>
          </div>

          <div className="space-y-2">
            {USER_TYPES.map((opt) => {
              const isSel = selected === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => setSelected(opt.value)}
                  className="w-full text-left rounded-2xl p-3 transition"
                  style={{
                    border: `1px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                    background: isSel ? "var(--accent-light)" : "var(--surface2)",
                  }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none">{opt.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{opt.label}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.desc}</div>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: isSel ? "var(--accent)" : "var(--border)" }}>
                      {isSel && <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX" maxLength={11} style={inputStyle} />
          </div>

          {needsLister && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                  {selected === "agent" ? "Agency name" : "Agency name (optional)"}
                </label>
                <input type="text" value={agency} onChange={(e) => setAgency(e.target.value)}
                  placeholder="e.g. Dari Realty" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                  License number (optional)
                </label>
                <input type="text" value={license} onChange={(e) => setLicense(e.target.value)}
                  placeholder="Optional" style={inputStyle} />
              </div>
            </>
          )}

          {err && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>
              {err}
            </div>
          )}

          <button type="submit" disabled={submitting || !selected}
            className="w-full rounded-xl py-3 text-sm font-bold transition flex items-center justify-center gap-2"
            style={{
              background: selected ? "var(--accent)" : "var(--surface2)",
              color: selected ? "var(--accent-text)" : "var(--text-faint)",
              opacity: submitting ? 0.6 : 1,
            }}>
            {submitting
              ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Finishing…</>
              : "Finish sign-up"}
          </button>

          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Signed in as <span style={{ color: "var(--text)" }}>{state.email}</span>.{" "}
            <Link to="/login" className="transition" style={{ color: "var(--accent)" }}>Use another account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
