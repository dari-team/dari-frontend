import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { agentApi, extractErrorMessage, type AgentStats } from "../lib/api";

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, accent = "var(--accent)", badge,
}: {
  icon: string; label: string; value: string | number; sub?: string;
  accent?: string; badge?: number;
}) {
  return (
    <div className="relative rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 end-3 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
          {badge}
        </span>
      )}
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-black tabular-nums leading-none" style={{ color: accent }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-xs mt-1 font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</div>
      {sub && <div className="text-xs mt-1 font-semibold" style={{ color: "var(--text-faint)" }}>{sub}</div>}
    </div>
  );
}

function SubscriptionBanner({ stats, isAr }: { stats: AgentStats; isAr: boolean }) {
  const isActive  = stats.subscriptionStatus === "active";
  const expiry    = stats.subscriptionExpiry ? new Date(stats.subscriptionExpiry) : null;
  const daysLeft  = expiry ? Math.ceil((expiry.getTime() - Date.now()) / 86_400_000) : null;
  const urgent    = daysLeft !== null && daysLeft <= 7;

  const borderColor = isActive ? (urgent ? "var(--danger)" : "var(--success)") : "rgba(245,158,11,0.5)";
  const bg          = isActive ? (urgent ? "var(--danger-light)" : "var(--success-light)") : "rgba(245,158,11,0.08)";
  const textColor   = isActive ? (urgent ? "var(--danger)" : "var(--success)") : "#f59e0b";

  return (
    <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
      style={{ border: `1px solid ${borderColor}`, background: bg }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{isActive ? (urgent ? "⚠️" : "✅") : "🔒"}</span>
        <div>
          <p className="text-sm font-bold" style={{ color: textColor }}>
            {isActive
              ? (urgent
                ? (isAr ? `ينتهي الاشتراك خلال ${daysLeft} أيام!` : `Subscription expires in ${daysLeft} days!`)
                : (isAr ? "اشتراكك نشط" : "Subscription Active"))
              : (isAr ? "اشتراكك غير نشط" : "Subscription Inactive")}
          </p>
          <p className="text-xs mt-0.5" style={{ color: textColor, opacity: 0.8 }}>
            {isActive && expiry
              ? (isAr ? `ينتهي: ${expiry.toLocaleDateString("ar-EG")}` : `Expires: ${expiry.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`)
              : (isAr ? `${stats.activeListings}/${stats.maxListings} إعلانات نشطة` : `${stats.activeListings}/${stats.maxListings} active listings`)}
          </p>
        </div>
      </div>
      <Link to="/payment"
        className="rounded-xl px-4 py-2 text-xs font-bold transition flex-shrink-0"
        style={{ background: textColor, color: "white" }}>
        {isAr ? (isActive ? "تجديد" : "اشترك الآن") : (isActive ? "Renew" : "Subscribe Now")}
      </Link>
    </div>
  );
}

// ── Quick actions ──────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: "➕", labelEn: "New Listing",   labelAr: "إعلان جديد",    to: "/list-property"  },
  { icon: "🏠", labelEn: "My Listings",   labelAr: "إعلاناتي",      to: "/my-listings"    },
  { icon: "💬", labelEn: "Inquiries",     labelAr: "الاستفسارات",   to: "/inquiries"      },
  { icon: "❤️", labelEn: "Saved",         labelAr: "المحفوظات",     to: "/favorites"      },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentDashboardPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [stats,   setStats]   = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    agentApi.getStats()
      .then((res) => { setStats(res.data); setLoading(false); })
      .catch((e)  => { setError(extractErrorMessage(e, "Failed to load stats")); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-6 sm:pt-10 pb-10 sm:pb-16 px-4 sm:px-6 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{isAr ? "جارٍ التحميل…" : "Loading dashboard…"}</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen pt-6 sm:pt-10 pb-10 sm:pb-16 px-4 sm:px-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-4xl mx-auto text-center py-16 rounded-2xl"
          style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>
          <p className="text-sm">{error ?? (isAr ? "تعذّر التحميل." : "Could not load data.")}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-xs underline"
            style={{ color: "var(--danger)" }}>
            {isAr ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  const listingUtilPct = stats.maxListings > 0
    ? Math.round((stats.activeListings / stats.maxListings) * 100)
    : 0;

  return (
    <div className="min-h-screen pt-6 sm:pt-10 pb-10 sm:pb-16 px-4 sm:px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{ background: "var(--accent-light)", border: "1px solid var(--accent)" }}>📊</div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                {isAr ? "لوحة التحكم" : "Agent Dashboard"}
              </h1>
              {stats.isVerified && (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {isAr ? "موثّق" : "Verified"}
                </span>
              )}
            </div>
            <p className="text-sm ms-10" style={{ color: "var(--text-muted)" }}>
              {isAr ? "نظرة عامة على أداء إعلاناتك" : "Overview of your listing performance"}
            </p>
          </div>
        </div>

        {/* Subscription banner */}
        <SubscriptionBanner stats={stats} isAr={isAr} />

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard icon="🏠" label={isAr ? "إجمالي الإعلانات"  : "Total Listings"}   value={stats.totalListings}   accent="var(--accent)"   />
          <KpiCard icon="✅" label={isAr ? "إعلانات نشطة"      : "Active Listings"}   value={stats.activeListings}  accent="var(--success)"  />
          <KpiCard icon="👁️" label={isAr ? "المشاهدات"         : "Total Views"}       value={stats.totalViews}      accent="#a78bfa"         />
          <KpiCard icon="❤️" label={isAr ? "المحفوظات"         : "Saved"}             value={stats.savedCount}      accent="#f472b6"         />
          <KpiCard icon="💬" label={isAr ? "الاستفسارات"       : "Inquiries"}         value={stats.totalInquiries}  accent="#f59e0b"
            badge={stats.pendingInquiries > 0 ? stats.pendingInquiries : undefined} />
          <KpiCard icon="⏳" label={isAr ? "استفسارات معلقة"   : "Pending Inquiries"} value={stats.pendingInquiries} accent="var(--danger)"  />
        </div>

        {/* Listing utilisation bar */}
        <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              {isAr ? "استخدام الإعلانات" : "Listing Slots Used"}
            </span>
            <span className="font-bold tabular-nums" style={{ color: listingUtilPct >= 90 ? "var(--danger)" : "var(--accent)" }}>
              {stats.activeListings} / {stats.maxListings}
            </span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
            <div className="h-3 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(listingUtilPct, 100)}%`,
                background: listingUtilPct >= 90 ? "var(--danger)" : listingUtilPct >= 70 ? "#f59e0b" : "var(--accent)",
              }} />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
            {listingUtilPct >= 90
              ? (isAr ? "وصلت لحد الإعلانات — جدّد اشتراكك للمزيد." : "Near your limit — upgrade to add more listings.")
              : (isAr ? `${stats.maxListings - stats.activeListings} فتحة متاحة` : `${stats.maxListings - stats.activeListings} slots available`)}
          </p>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            {isAr ? "إجراءات سريعة" : "Quick Actions"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ icon, labelEn, labelAr, to }) => (
              <Link key={to} to={to}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl py-5 text-sm font-semibold transition group"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                  (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                  (e.currentTarget as HTMLElement).style.background = "var(--accent-light)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                }}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs">{isAr ? labelAr : labelEn}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA: view individual listing analytics */}
        <div className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
          style={{ border: "1px dashed var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                {isAr ? "تحليلات الإعلانات" : "Per-Listing Analytics"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {isAr ? "شاهد مشاهدات واستفسارات كل إعلان بالتفصيل"
                       : "See detailed views and inquiry trends for each listing"}
              </p>
            </div>
          </div>
          <Link to="/my-listings"
            className="rounded-xl px-4 py-2 text-xs font-bold transition flex-shrink-0"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            {isAr ? "عرض إعلاناتي" : "Go to My Listings"}
          </Link>
        </div>

      </div>
    </div>
  );
}
