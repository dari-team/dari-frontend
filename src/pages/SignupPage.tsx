import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { authApi, extractErrorMessage } from "../lib/api";
import { toApiTypes, type UiUserType as UiType } from "../lib/userTypeMap";
import { useAuth } from "../context/AuthContext";

function useAuthPageTheme() {
  useEffect(() => {
    const saved = localStorage.getItem("dari:theme");
    document.documentElement.classList.toggle("dark", saved !== "light");
    const lang = localStorage.getItem("dari:lang") || "en";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);
}

type UserType = "buyer" | "lister" | "agent";
type Step = "credentials" | "type" | "subscription";

const USER_TYPES = [
  { value: "buyer"  as UserType, icon: "🔍", color: "text-sky-400",     border: "border-sky-500",     bg: "bg-sky-500/10",     features: ["Browse all listings","Save to wishlists","Contact agents","AI & visual search","Commute time filter"], sub: false },
  { value: "lister" as UserType, icon: "🏠", color: "text-emerald-400", border: "border-emerald-500", bg: "bg-emerald-500/10", features: ["1 free listing","Receive inquiries","AI listing assistant","View analytics","Upgrade for more"], sub: false },
  { value: "agent"  as UserType, icon: "🏢", color: "text-amber-400",   border: "border-amber-500",   bg: "bg-amber-500/10",   features: ["Unlimited listings","Priority placement","Advanced analytics","Verified badge","Agency profile","AI tools"], sub: true },
];

const AGENT_PLANS = [
  { id: "agent_monthly",   name: "Monthly",   nameAr: "شهري",      price: 499,  period: "/ month",    badge: null,       color: "cyan"    },
  { id: "agent_quarterly", name: "Quarterly", nameAr: "ربع سنوي",  price: 1299, period: "/ 3 months", badge: "Save 13%", color: "amber"   },
  { id: "agent_annual",    name: "Annual",    nameAr: "سنوي",       price: 3999, period: "/ year",     badge: "Best Value", color: "emerald" },
];
const LISTER_PLANS = [
  { id: "lister_basic", name: "Basic",       nameAr: "أساسي",    price: 0,   period: "free",      badge: null,      color: "slate" },
  { id: "lister_plus",  name: "Seller Plus", nameAr: "بائع بلس", price: 199, period: "/ month",   badge: "Popular", color: "cyan"  },
  { id: "lister_pro",   name: "Seller Pro",  nameAr: "بائع برو", price: 399, period: "/ month",   badge: null,      color: "emerald" },
];

const COLOR_STYLES: Record<string, { text: string; border: string; bg: string }> = {
  cyan:    { text: "var(--accent)",       border: "var(--accent)",       bg: "var(--accent-light)" },
  amber:   { text: "#f59e0b",             border: "#f59e0b",             bg: "rgba(245,158,11,0.1)" },
  emerald: { text: "var(--success)",      border: "var(--success)",      bg: "var(--success-light)" },
  slate:   { text: "var(--text-muted)",   border: "var(--border)",       bg: "var(--surface2)" },
};

function StepDots({ step }: { step: Step }) {
  const steps: Step[] = ["credentials", "type", "subscription"];
  const cur = steps.indexOf(step);
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {steps.map((s, i) => (
        <div key={s} className="rounded-full transition-all duration-300"
          style={{ width: i === cur ? 24 : 8, height: 8, background: i <= cur ? "var(--accent)" : "var(--surface2)" }} />
      ))}
    </div>
  );
}

export default function SignupPage() {
  useAuthPageTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const auth = useAuth();

  const [step, setStep]         = useState<Step>("credentials");
  const [userType, setUserType] = useState<UserType>("buyer");
  const [creds, setCreds]       = useState<{ name: string; email: string; password: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  // ── Credentials step ──────────────────────────────────────────────────────
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [credErr, setCredErr]   = useState("");
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const inputStyle: React.CSSProperties = {
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text)", width: "100%", borderRadius: 12,
    padding: "10px 16px", fontSize: 14, outline: "none",
  };

  function handleCredentials() {
    if (!name.trim() || !email.trim() || !password) { setCredErr("Please fill in all fields."); return; }
    if (password.length < 8) { setCredErr("Password must be at least 8 characters."); return; }
    setCreds({ name: name.trim(), email: email.trim(), password });
    setStep("type");
  }

  async function registerAndGoVerify(ui: UiType) {
    if (!creds) return false;
    setSubmitting(true); setSubmitErr("");
    try {
      const typeMap = toApiTypes(ui);
      await authApi.register({
        name: creds.name,
        email: creds.email,
        password: creds.password,
        ...typeMap,
      });
      navigate("/verify-email", { state: { email: creds.email } });
      return true;
    } catch (err) {
      setSubmitErr(extractErrorMessage(err, "Registration failed."));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleType() {
    if (!selectedType) return;
    setUserType(selectedType);
    if (selectedType === "buyer") {
      await registerAndGoVerify("buyer");
      return;
    }
    setStep("subscription");
  }

  async function handleSubscription() {
    if (!selectedPlan) return;
    // Subscription is a placeholder — billing is not wired yet. All plans create
    // the account immediately; the selected plan is remembered for future billing.
    if (selectedPlan) {
      try { localStorage.setItem("dari:pendingPlan", selectedPlan); } catch { /* ignore */ }
    }
    const uiType: UiType = userType === "agent" ? "agent" : "lister";
    await registerAndGoVerify(uiType);
  }

  const plans = userType === "agent" ? AGENT_PLANS : LISTER_PLANS;
  const isAr = t("hero.eyebrow") === "أذكى منصة عقارية في مصر";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{ background: "var(--accent-light)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black tracking-tight" style={{ color: "var(--accent)" }}>
            {isAr ? "داري" : "Dari"}
          </Link>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>{t("auth.signup.title")}</p>
        </div>

        <div className="rounded-3xl p-8 shadow-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
          <StepDots step={step} />

          {/* ── Step 1: Credentials ── */}
          {step === "credentials" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{t("auth.signup.title")}</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t("auth.signup.subtitle")}</p>
              </div>
              {credErr && <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--danger-light)", border: "1px solid var(--danger)", color: "var(--danger)" }}>{credErr}</div>}

              {[
                { label: t("auth.signup.name"),  val: name,     set: setName,  type: "text",  ph: t("auth.signup.namePlaceholder") },
                { label: t("auth.signup.email"), val: email,    set: setEmail, type: "email", ph: t("auth.signup.emailPlaceholder") },
              ].map(({ label, val, set, type, ph }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
                  <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={inputStyle} />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>{t("auth.signup.password")}</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.signup.passwordPlaceholder")} style={{ ...inputStyle, paddingInlineEnd: 44 }} />
                  <button type="button" onClick={() => setShowPass((s) => !s)}
                    className="absolute end-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all"
                        style={{ background: password.length >= i*3 ? (password.length >= 12 ? "var(--success)" : password.length >= 8 ? "#f59e0b" : "var(--danger)") : "var(--border)" }} />
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleCredentials}
                className="w-full rounded-xl py-3 text-sm font-bold transition mt-2"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                {t("auth.signup.continue")}
              </button>

              {/* Social login divider + Google */}
              <div className="flex items-center gap-3 mt-4" style={{ color: "var(--text-faint)" }}>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-xs uppercase tracking-widest">or</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>
              <div className="flex justify-center mt-3">
                <GoogleLogin
                  onSuccess={async (cred: CredentialResponse) => {
                    if (!cred.credential) { setCredErr("Google did not return a credential."); return; }
                    setCredErr("");
                    const res = await auth.loginWithGoogle(cred.credential);
                    if (res.ok) { navigate("/", { replace: true }); return; }
                    if (res.needsProfile) { navigate("/complete-profile", { state: res.needsProfile }); return; }
                    setCredErr(res.error ?? "Google sign-in failed.");
                  }}
                  onError={() => setCredErr("Google sign-in was cancelled or failed.")}
                  useOneTap={false}
                  theme="outline"
                  width="320"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Account type ── */}
          {step === "type" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{t("auth.signup.typeTitle")}</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t("auth.signup.typeDesc")}</p>
              </div>
              <div className="space-y-3">
                {USER_TYPES.map((t_) => {
                  const isSelected = selectedType === t_.value;
                  return (
                    <button key={t_.value} onClick={() => setSelectedType(t_.value)}
                      className="w-full text-left rounded-2xl border p-4 transition-all duration-200"
                      style={{ border: `1px solid ${isSelected ? `var(--accent)` : "var(--border)"}`, background: isSelected ? "var(--accent-light)" : "var(--surface2)" }}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{t_.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: isSelected ? "var(--accent)" : "var(--text)" }}>
                              {t_.value === "buyer" ? t("auth.signup.buyer") : t_.value === "lister" ? t("auth.signup.seller") : t("auth.signup.agent")}
                            </span>
                            {t_.sub && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>{t("auth.signup.subscriptionRequired")}</span>}
                          </div>
                          {isSelected && (
                            <ul className="mt-3 space-y-1">
                              {t_.features.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--accent)" }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {f}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                          style={{ borderColor: isSelected ? "var(--accent)" : "var(--border)" }}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--accent)" }} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {submitErr && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>{submitErr}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep("credentials")} disabled={submitting}
                  className="flex-1 rounded-xl py-3 text-sm font-medium transition"
                  style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                  {t("auth.signup.back")}
                </button>
                <button onClick={handleType} disabled={!selectedType || submitting}
                  className="flex-1 rounded-xl py-3 text-sm font-bold transition flex items-center justify-center gap-2"
                  style={{ background: selectedType ? "var(--accent)" : "var(--surface2)", color: selectedType ? "var(--accent-text)" : "var(--text-faint)", opacity: selectedType ? (submitting ? 0.6 : 1) : 0.5 }}>
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />…</>
                    : (selectedType === "agent" ? t("auth.signup.choosePlan") : t("auth.signup.createAccount"))}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Subscription ── */}
          {step === "subscription" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                  {userType === "agent" ? t("auth.subscription.agentTitle") : t("auth.subscription.sellerTitle")}
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t("auth.subscription.currency")}</p>
              </div>
              <div className="space-y-3">
                {plans.map((plan) => {
                  const c = COLOR_STYLES[plan.color];
                  const isSel = selectedPlan === plan.id;
                  return (
                    <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                      className="w-full text-left rounded-2xl p-4 transition-all duration-200"
                      style={{ border: `1px solid ${isSel ? c.border : "var(--border)"}`, background: isSel ? c.bg : "var(--surface2)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: isSel ? c.text : "var(--text)" }}>{plan.name}</span>
                            <span className="text-xs" style={{ color: "var(--text-faint)" }}>{plan.nameAr}</span>
                            {plan.badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>{plan.badge}</span>}
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-black" style={{ color: isSel ? c.text : "var(--text)" }}>
                              {plan.price === 0 ? "Free" : `EGP ${plan.price.toLocaleString()}`}
                            </span>
                            {plan.price > 0 && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{plan.period}</span>}
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                          style={{ borderColor: isSel ? c.border : "var(--border)" }}>
                          {isSel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.text }} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {submitErr && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>{submitErr}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep("type")} disabled={submitting}
                  className="flex-1 rounded-xl py-3 text-sm font-medium transition"
                  style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                  {t("auth.signup.back")}
                </button>
                <button onClick={handleSubscription} disabled={!selectedPlan || submitting}
                  className="flex-1 rounded-xl py-3 text-sm font-bold transition flex items-center justify-center gap-2"
                  style={{ background: selectedPlan ? "var(--accent)" : "var(--surface2)", color: selectedPlan ? "var(--accent-text)" : "var(--text-faint)", opacity: selectedPlan ? (submitting ? 0.6 : 1) : 0.5 }}>
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />…</>
                    : t("auth.subscription.createFree")}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          {t("auth.signup.alreadyHave")}{" "}
          <Link to="/login" className="font-semibold" style={{ color: "var(--accent)" }}>{t("auth.signup.signIn")}</Link>
        </p>
      </div>
    </div>
  );
}