import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { imagesApi, adminApi, wishlistApi, inquiryApi, listingApi } from "../lib/api";
import type { StoredUser } from "../lib/userTypeMap";

// Real stat counts resolved from the API per role. Keys map 1:1 to the cards in
// StatsGrid; any key left undefined renders the "—" placeholder.
type ProfileCounts = {
  saved?: number; inquiriesSent?: number; inquiriesReceived?: number; pendingInquiries?: number;
  myListings?: number; activeListings?: number; totalViews?: number;
  adminListings?: number; adminPending?: number; adminUsers?: number;
  adminAgents?: number; adminOpenInquiries?: number; adminViews?: number;
};

// View-model combining real auth user + UI-only placeholders for fields the
// /Auth/profile endpoint doesn't return yet (listing counts, inquiries, etc).
// Those will come from dedicated endpoints later; for now render "—".
type ProfileView = {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_type: "buyer" | "lister" | "agent" | "admin";
  agency_name: string;
  is_verified: boolean;
  license_number: string;
  subscription_end_date: string | null;
  created_at: string | null;
  profile_pic: string | null;
};

function toView(u: StoredUser): ProfileView {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phoneNumber ?? "",
    user_type: u.user_type,
    agency_name: u.agencyName ?? "",
    is_verified: true, // logged-in users have passed email verification
    license_number: u.licenseNumber ?? "",
    subscription_end_date: null,
    created_at: null,
    profile_pic: u.profilePictureUrl ?? null,
  };
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-EG", { year: "numeric", month: "short", day: "numeric" });
}

const TYPE_LABELS: Record<string, [string, string]> = {
  buyer:  ["Buyer",         "مشتري"],
  lister: ["Seller",        "بائع"],
  agent:  ["Agent",         "وكيل"],
  admin:  ["Administrator", "مدير"],
};
const TYPE_ACCENT: Record<string, string> = {
  buyer: "#38bdf8", lister: "#34d399", agent: "#fbbf24", admin: "#f43f5e",
};

// ── Stat card (link-able) ─────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent = "var(--accent)", to, badge }: {
  label: string; value: string | number; icon: React.ReactNode;
  accent?: string; to?: string; badge?: number;
}) {
  const inner = (
    <div
      className="relative rounded-2xl p-5 overflow-hidden group transition-all duration-300"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-sm)",
        cursor: to ? "pointer" : "default",
      }}
      onMouseEnter={(e) => { if (to) { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent)"; el.style.boxShadow = "var(--shadow-md)"; } }}
      onMouseLeave={(e) => { if (to) { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.boxShadow = "var(--shadow-sm)"; } }}
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 end-3 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
          style={{ background: "#f59e0b", color: "#1A1612" }}>{badge}</span>
      )}
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
        style={{ background: `${accent}18`, border: `1px solid ${accent}35`, color: accent }}>
        {icon}
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-xs mt-0.5 font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>{label}</div>
      {to && (
        <div className="flex items-center gap-1 mt-2 text-[11px] transition-colors" style={{ color: "var(--text-faint)" }}>
          View <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>{children}</span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditProfileModal({ user, onClose }: { user: ProfileView; onClose: () => void }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const [name, setName]   = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const iStyle: React.CSSProperties = {
    width: "100%", borderRadius: 12, border: "1px solid var(--border)",
    background: "var(--surface2)", padding: "10px 16px", fontSize: 14,
    color: "var(--text)", outline: "none",
  };

  async function handleSave() {
    setSaving(true); setErr("");
    const res = await auth.updateProfile({
      name: name.trim() || null,
      phoneNumber: phone.trim() || null,
    });
    setSaving(false);
    if (res.ok) onClose();
    else setErr(res.error ?? "Update failed.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
        <button onClick={onClose} className="absolute top-4 end-4 transition" style={{ color: "var(--text-faint)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-lg font-bold mb-6" style={{ color: "var(--text)" }}>{t("profile.editProfile")}</h2>
        {err && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm"
            style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>{err}</div>
        )}
        <div className="space-y-4">
          {[
            { lbl: t("profile.fullName"), val: name,  set: setName,  type: "text" },
            { lbl: t("profile.phone"),    val: phone, set: setPhone, type: "tel"  },
          ].map(({ lbl, val, set, type }) => (
            <div key={lbl}>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>{lbl}</label>
              <input type={type} value={val} onChange={(e) => set(e.target.value)} style={iStyle} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>{t("profile.email")}</label>
            <input disabled value={user.email} style={{ ...iStyle, opacity: 0.5, cursor: "not-allowed" }} />
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{t("profile.emailCannotChange")}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
            {t("profile.cancel")}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2"
            style={{ background: "var(--accent)", color: "var(--accent-text)", opacity: saving ? 0.6 : 1 }}>
            {saving ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Saving…</> : t("profile.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Avatar with upload overlay ─────────────────────────────────────────────────
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB — matches backend CloudinaryOptions

function AvatarUploader({ url, initials, accent, verified }: {
  url: string | null; initials: string; accent: string; verified: boolean;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const auth = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(file: File) {
    setErr("");
    if (!file.type.startsWith("image/")) {
      setErr(isAr ? "الرجاء اختيار صورة." : "Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setErr(isAr ? "الحجم الأقصى 5 ميجا." : "Max file size is 5MB.");
      return;
    }
    setBusy(true);
    try {
      const { data: signed } = await imagesApi.signUpload();
      const result = await imagesApi.uploadToCloudinary(file, signed);
      const res = await auth.updateProfile({ profilePictureUrl: result.secure_url });
      if (!res.ok) throw new Error(res.error ?? "save failed");
    } catch {
      setErr(isAr ? "فشل رفع الصورة." : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold text-white shadow-lg"
        style={url ? { background: "var(--surface2)" } : { background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}>
        {url ? <img src={url} alt={isAr ? "الصورة الشخصية" : "Profile picture"} className="w-full h-full object-cover" /> : initials}
      </div>

      {/* Uploading spinner overlay */}
      {busy && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Upload button (camera) — bottom-start so it doesn't clash with the verified badge */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={isAr ? "تغيير الصورة الشخصية" : "Change profile picture"}
        className="absolute -bottom-1 -start-1 w-7 h-7 rounded-full border-2 flex items-center justify-center transition disabled:opacity-50"
        style={{ background: accent, borderColor: "var(--surface)", color: "#fff" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {verified && (
        <div className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full border-2 flex items-center justify-center"
          style={{ background: "var(--success)", borderColor: "var(--surface)" }}>
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {err && (
        <p className="absolute top-full mt-1 start-0 whitespace-nowrap text-[10px] font-medium" style={{ color: "var(--danger)" }}>{err}</p>
      )}
    </div>
  );
}

// ── Stat grids per role ───────────────────────────────────────────────────────
const ICONS = {
  heart:    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  chat:     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  home:     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  building: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  check:    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  clock:    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  eye:      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  bookmark: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
};

// Until listing/inquiry stats endpoints are wired up, show "—" placeholders.
const DASH = "—";

function StatsGrid({ user, t, c }: { user: ProfileView; t: (k: string) => string; c: ProfileCounts }) {
  const CYAN = "var(--accent)", AMBER = "#f59e0b", ROSE = "var(--danger)",
        GREEN = "var(--success)", VIOLET = "#a78bfa", SKY = "#38bdf8";
  const { user_type: ut } = user;
  const v = (n?: number): string | number => (typeof n === "number" ? n : DASH);

  if (ut === "buyer") return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard to="/favorites"  label={t("profile.stats.savedListings")}  value={v(c.saved)}         accent={ROSE}  icon={ICONS.heart} />
      <StatCard to="/inquiries"  label={t("profile.stats.inquiriesSent")}  value={v(c.inquiriesSent)} accent={CYAN}  icon={ICONS.chat} />
    </div>
  );
  if (ut === "lister") return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard to="/my-listings" label={t("profile.stats.myListing")}          value={v(c.myListings)}        accent={GREEN}  icon={ICONS.home} />
      <StatCard to="/inquiries"   label={t("profile.stats.inquiriesReceived")}  value={v(c.inquiriesReceived)} accent={CYAN}   icon={ICONS.chat} />
      <StatCard to="/favorites"   label={t("profile.stats.savedListings")}      value={v(c.saved)}             accent={ROSE}   icon={ICONS.heart} />
      <StatCard to="/my-listings" label={t("profile.stats.listingViews")}       value={v(c.totalViews)}        accent={VIOLET} icon={ICONS.eye} />
    </div>
  );
  if (ut === "agent") return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <StatCard to="/my-listings"              label={t("profile.stats.totalListings")}    value={v(c.myListings)}        accent={AMBER}  icon={ICONS.building} />
      <StatCard to="/my-listings?status=active" label={t("profile.stats.activeListings")}  value={v(c.activeListings)}    accent={GREEN}  icon={ICONS.check} />
      <StatCard to="/inquiries"                label={t("profile.stats.pendingInquiries")} value={v(c.pendingInquiries)}  accent={ROSE}   icon={ICONS.clock} />
      <StatCard to="/inquiries"                label={t("profile.stats.totalInquiries")}   value={v(c.inquiriesReceived)} accent={CYAN}   icon={ICONS.chat} />
      <StatCard to="/my-listings"              label={t("profile.stats.totalViews")}       value={v(c.totalViews)}        accent={VIOLET} icon={ICONS.eye} />
      <StatCard to="/favorites"                label={t("profile.stats.savedListings")}    value={v(c.saved)}             accent={SKY}    icon={ICONS.bookmark} />
    </div>
  );
  // admin
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <StatCard to="/admin/listings"  label="Total Listings"    value={v(c.adminListings)}      accent={AMBER}  icon={ICONS.building} />
      <StatCard to="/admin/listings"  label="Pending Approval"  value={v(c.adminPending)}       accent={ROSE}   icon={ICONS.clock} />
      <StatCard to="/admin/users"     label="Total Users"       value={v(c.adminUsers)}         accent={CYAN}   icon={ICONS.check} />
      <StatCard to="/admin/users"     label="Active Agents"     value={v(c.adminAgents)}        accent={GREEN}  icon={ICONS.check} />
      <StatCard to="/admin/complaints" label="Open Inquiries"   value={v(c.adminOpenInquiries)} accent={VIOLET} icon={ICONS.chat} />
      <StatCard to="/admin/listings"  label="Platform Views"    value={v(c.adminViews)}         accent={SKY}    icon={ICONS.eye} />
    </div>
  );
}

function QuickActions({ user, t }: { user: ProfileView; t: (k: string) => string; isAr: boolean }) {
  const actions: Record<string, { label: string; to: string; icon: string; hi?: boolean }[]> = {
    buyer:  [{ label: t("profile.actions.browseListings"), to: "/search",        icon: "🔍" }, { label: t("profile.actions.myFavorites"), to: "/favorites", icon: "❤️" }],
    lister: [{ label: t("profile.actions.myListing"),     to: "/my-listings",   icon: "🏠" }, { label: t("profile.actions.inquiries"),   to: "/inquiries",  icon: "💬" }],
    agent:  [{ label: t("profile.actions.addListing"),    to: "/list-property", icon: "➕", hi: true }, { label: t("profile.actions.myListings"), to: "/my-listings", icon: "🏘️" }, { label: t("profile.actions.inquiries"), to: "/inquiries", icon: "💬" }, { label: t("profile.actions.saved"), to: "/favorites", icon: "❤️" }],
    admin:  [{ label: t("profile.actions.approveListings"), to: "/admin/listings", icon: "✅", hi: true }, { label: t("profile.actions.manageUsers"), to: "/admin/users", icon: "👥" }, { label: t("profile.actions.analytics"), to: "/admin/analytics", icon: "📊" }],
  };
  return (
    <div className="flex flex-wrap gap-3">
      {(actions[user.user_type] ?? []).map(({ label, to, icon, hi }) => (
        <Link key={label} to={to}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200"
          style={hi
            ? { border: "1px solid var(--accent)", background: "var(--accent-light)", color: "var(--accent)" }
            : { border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
          <span>{icon}</span>{label}
        </Link>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { user: authUser } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [counts, setCounts] = useState<ProfileCounts>({});

  // Resolve real stat counts per role. Admin reuses the existing /admin/stats
  // endpoint; other roles derive counts from their wishlist / inquiries / listings.
  // Failures are swallowed so any unavailable stat just stays a "—" placeholder.
  const userType = authUser?.user_type;
  useEffect(() => {
    if (!userType) return;
    let cancelled = false;
    (async () => {
      try {
        if (userType === "admin") {
          const { data } = await adminApi.getStats();
          if (!cancelled) setCounts({
            adminListings: data.listings.totalListings,
            adminPending: data.listings.pendingListings,
            adminUsers: data.users.totalUsers,
            adminAgents: data.users.verifiedListers,
            adminOpenInquiries: data.inquiries.openInquiries,
            adminViews: data.listings.totalViews,
          });
          return;
        }
        const [wRes, iRes, lRes] = await Promise.allSettled([
          wishlistApi.getAll(),
          userType === "buyer" ? inquiryApi.getMy() : inquiryApi.getReceived(),
          userType === "lister" || userType === "agent" ? listingApi.getMine() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const next: ProfileCounts = {};
        if (wRes.status === "fulfilled") next.saved = wRes.value.data.reduce((s, w) => s + w.items.length, 0);
        if (iRes.status === "fulfilled") {
          const inq = iRes.value.data;
          next.inquiriesSent = inq.length;
          next.inquiriesReceived = inq.length;
          next.pendingInquiries = inq.filter((x) => x.status === 0).length;
        }
        if (lRes.status === "fulfilled" && lRes.value) {
          const ls = lRes.value.data;
          next.myListings = ls.length;
          next.activeListings = ls.filter((l) => l.isApproved && l.status === 1).length;
          next.totalViews = ls.reduce((s, l) => s + (l.viewCount ?? 0), 0);
        }
        setCounts(next);
      } catch { /* leave placeholders */ }
    })();
    return () => { cancelled = true; };
  }, [userType]);

  if (!authUser) {
    // Should be blocked by ProtectedRoute, but just in case.
    return null;
  }

  const user = toView(authUser);
  const accentColor = TYPE_ACCENT[user.user_type] ?? "var(--accent)";
  const typeLabel   = TYPE_LABELS[user.user_type]?.[isAr ? 1 : 0] ?? user.user_type;

  return (
    <>
      <div className="min-h-screen pt-6 sm:pt-10 pb-10 sm:pb-16 px-4 sm:px-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">

          {/* Hero card */}
          <div className="relative rounded-3xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-md)" }}>
            <div className="absolute top-0 start-0 end-0 h-1" style={{ background: `linear-gradient(to end, ${accentColor}, transparent)` }} />

            <div className="p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <AvatarUploader url={user.profile_pic} initials={getInitials(user.name)} accent={accentColor} verified={user.is_verified} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>{user.name}</h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                    style={{ color: accentColor, borderColor: `${accentColor}50`, background: `${accentColor}15` }}>
                    {typeLabel}
                  </span>
                  {user.is_verified && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border"
                      style={{ color: "var(--success)", borderColor: "var(--success)40", background: "var(--success-light)" }}>
                      {t("profile.verified")}
                    </span>
                  )}
                </div>
                <p className="text-sm mb-0.5" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                <p className="text-sm" style={{ color: "var(--text-faint)" }}>{user.phone || "—"}</p>
                {user.user_type === "agent" && user.agency_name && (
                  <p className="text-sm mt-1 font-medium" style={{ color: "var(--accent)" }}>{user.agency_name}</p>
                )}
              </div>

              <button onClick={() => setShowEdit(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition flex-shrink-0"
                style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {t("profile.editProfile")}
              </button>
            </div>

            {/* Meta strip */}
            {user.user_type === "agent" && (
              <div className="px-6 sm:px-8 py-3 flex flex-wrap gap-6 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <span>{t("profile.license")} <strong style={{ color: "var(--text)" }}>{user.license_number || "—"}</strong></span>
                <span>{t("profile.subscriptionUntil")} <strong style={{ color: "var(--text)" }}>{formatDate(user.subscription_end_date)}</strong></span>
                <span>{t("profile.memberSince")} <strong style={{ color: "var(--text)" }}>{formatDate(user.created_at)}</strong></span>
              </div>
            )}
            {(user.user_type === "buyer" || user.user_type === "lister") && (
              <div className="px-6 sm:px-8 py-3 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {t("profile.memberSince")} <strong style={{ color: "var(--text)" }}>{formatDate(user.created_at)}</strong>
              </div>
            )}
          </div>

          {/* Stats */}
          <div>
            <SectionTitle>{t("profile.overview")}</SectionTitle>
            <StatsGrid user={user} t={t} c={counts} />
          </div>

          {/* Quick Actions */}
          <div>
            <SectionTitle>{t("profile.quickActions")}</SectionTitle>
            <QuickActions user={user} t={t} isAr={isAr} />
          </div>
        </div>
      </div>
      {showEdit && <EditProfileModal user={user} onClose={() => setShowEdit(false)} />}
    </>
  );
}
