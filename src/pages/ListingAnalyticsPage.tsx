import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { agentApi, extractErrorMessage, type ListingAnalytics } from "../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Stat({ label, value, sub, color = "var(--accent)" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs mt-0.5 font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
      {sub && <p className="text-xs mt-1 font-semibold" style={{ color }}>{sub}</p>}
    </div>
  );
}

function BarChart({ trend }: { trend: { date: string; count: number }[] }) {
  const max = Math.max(...trend.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {trend.map((d, i) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            <div className="absolute bottom-full mb-2 start-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-md)" }}>
              <p className="font-semibold">{d.count} views</p>
              <p style={{ color: "var(--text-faint)" }}>{shortDate(d.date)}</p>
            </div>
            <div className="w-full rounded-t-sm transition-all duration-200"
              style={{ height: `${pct}%`, minHeight: 4, background: d.count > 0 ? "var(--accent)" : "var(--surface2)" }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListingAnalyticsPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { id } = useParams<{ id: string }>();

  const [data, setData]       = useState<ListingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    agentApi.getListingAnalytics(id)
      .then((res) => { setData(res.data); setLoading(false); })
      .catch((e) => { setError(extractErrorMessage(e, "Failed to load analytics")); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{isAr ? "جارٍ التحميل…" : "Loading analytics…"}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4" style={{ background: "var(--bg)" }}>
        <div className="max-w-4xl mx-auto text-center py-16 rounded-2xl"
          style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>
          <p className="text-sm">{error ?? (isAr ? "لم يُعثر على بيانات." : "No data found.")}</p>
          <Link to="/my-listings" className="mt-4 inline-block text-xs underline"
            style={{ color: "var(--text-muted)" }}>
            {isAr ? "العودة لإعلاناتي" : "Back to My Listings"}
          </Link>
        </div>
      </div>
    );
  }

  const convRate = data.conversionRate.toFixed(1);
  const avgDaily = data.viewsPerDay.toFixed(1);

  const totalInq = data.inquiryStatusBreakdown.pending + data.inquiryStatusBreakdown.responded + data.inquiryStatusBreakdown.closed;
  const total = data.trafficSources.search + data.trafficSources.direct + data.trafficSources.saved + data.trafficSources.map;
  const trafficPct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const TRAFFIC = [
    { label: isAr ? "بحث"    : "Search", pct: trafficPct(data.trafficSources.search), color: "var(--accent)"   },
    { label: isAr ? "مباشر"  : "Direct", pct: trafficPct(data.trafficSources.direct), color: "#f59e0b"         },
    { label: isAr ? "مفضلة"  : "Saved",  pct: trafficPct(data.trafficSources.saved),  color: "#a78bfa"         },
    { label: isAr ? "خريطة"  : "Map",    pct: trafficPct(data.trafficSources.map),    color: "var(--success)"  },
  ];

  const INQ_STATUS = [
    { label: isAr ? "معلق"    : "Pending",   count: data.inquiryStatusBreakdown.pending,   color: "#f59e0b"           },
    { label: isAr ? "تم الرد" : "Responded", count: data.inquiryStatusBreakdown.responded, color: "var(--accent)"    },
    { label: isAr ? "مغلق"    : "Closed",    count: data.inquiryStatusBreakdown.closed,    color: "var(--text-faint)" },
  ];

  const tips: string[] = isAr
    ? [
        `معدل التحويل (${convRate}%) ${Number(convRate) >= 2 ? "فوق المتوسط 👍 — واصل الرد السريع." : "يمكن تحسينه — رد على الاستفسارات فورًا."}`,
        `معظم الزيارات من ${TRAFFIC.sort((a, b) => b.pct - a.pct)[0].label} — اجعل ${
          TRAFFIC[0].label === "بحث" ? "عنوانك غنيًا بالكلمات المفتاحية" : "رابط الإعلان مشاركًا على منصات التواصل"
        }.`,
        data.aiQualityScore != null
          ? `تقييم الجودة ${data.aiQualityScore}/10${data.aiQualityScore < 8 ? " — إضافة صور أكثر ترفع الظهور." : " — ممتاز!"}`
          : "لم يتم احتساب تقييم الجودة بعد — أضف وصفًا تفصيليًا وصورًا.",
      ]
    : [
        `Your conversion rate (${convRate}%) is ${Number(convRate) >= 2 ? "above average 👍 — keep responding quickly." : "improvable — reply to inquiries promptly."}`,
        `Most traffic comes from ${TRAFFIC.sort((a, b) => b.pct - a.pct)[0].label} — ${
          TRAFFIC[0].label === "Search" ? "keep your title and description keyword-rich." : "share your listing link on social platforms."
        }`,
        data.aiQualityScore != null
          ? `AI Quality Score is ${data.aiQualityScore}/10${data.aiQualityScore < 8 ? " — more photos can boost visibility." : " — excellent!"}`
          : "Quality score not calculated yet — add a detailed description and more photos.",
      ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }}>
          <Link to="/my-listings" className="hover:underline transition" style={{ color: "var(--text-faint)" }}>
            {isAr ? "إعلاناتي" : "My Listings"}
          </Link>
          <span>›</span>
          <span className="truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>{data.title}</span>
          <span>›</span>
          <span style={{ color: "var(--accent)" }}>{isAr ? "الإحصائيات" : "Analytics"}</span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>{data.title}</h1>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                ID: {data.listingId.slice(0, 8)}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link to={`/listing/${data.listingId}?source=direct`}
                className="rounded-xl px-3 py-2 text-xs font-medium transition"
                style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                {isAr ? "عرض الإعلان" : "View Listing"}
              </Link>
              <Link to={`/listings/${data.listingId}/edit`}
                className="rounded-xl px-3 py-2 text-xs font-medium transition"
                style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                {isAr ? "تعديل" : "Edit"}
              </Link>
            </div>
          </div>
          {(data.aiQualityScore != null || data.lifestyleScore != null) && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              {data.aiQualityScore != null && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{isAr ? "تقييم الجودة:" : "AI Quality Score:"}</span>
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{data.aiQualityScore}/10</span>
                </div>
              )}
              {data.lifestyleScore != null && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#a78bfa" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{isAr ? "تقييم الأسلوب:" : "Lifestyle Score:"}</span>
                  <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>{data.lifestyleScore}/10</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label={isAr ? "إجمالي المشاهدات" : "Total Views"}      value={data.totalViews}           sub={`~${avgDaily}/${isAr ? "يوم" : "day"}`} color="var(--accent)"   />
          <Stat label={isAr ? "الاستفسارات"       : "Total Inquiries"}  value={data.totalInquiries}       sub={`${convRate}% conv.`}                    color="#f59e0b"         />
          <Stat label={isAr ? "تقييم الجودة"      : "Quality Score"}    value={data.aiQualityScore != null ? `${data.aiQualityScore}/10` : "—"} sub={isAr ? "تقييم AI" : "AI assessed"} color="#a78bfa" />
          <Stat label={isAr ? "تقييم الأسلوب"     : "Lifestyle Score"}  value={data.lifestyleScore  != null ? `${data.lifestyleScore}/10`  : "—"} sub={isAr ? "تقييم AI" : "AI assessed"} color="var(--success)" />
        </div>

        {/* 14-day trend chart */}
        <div className="rounded-2xl p-6 space-y-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                {isAr ? "المشاهدات (14 يومًا)" : "Views — Last 14 Days"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {isAr ? "ضع المؤشر على العمود لرؤية التاريخ" : "Hover a bar to see the date"}
              </p>
            </div>
          </div>
          <BarChart trend={data.viewsTrend14d} />
          {/* Date labels — show every ~3rd */}
          <div className="flex gap-1">
            {data.viewsTrend14d.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                {i % 3 === 0 && (
                  <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                    {new Date(d.date).getDate()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Traffic sources + Inquiry breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 space-y-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {isAr ? "مصادر الزيارات" : "Traffic Sources"}
            </h2>
            {TRAFFIC.map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                  <div className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
            {total === 0 && (
              <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
                {isAr ? "لا توجد بيانات مصادر بعد" : "No source data yet"}
              </p>
            )}
          </div>

          <div className="rounded-2xl p-5 space-y-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {isAr ? "حالة الاستفسارات" : "Inquiry Status"}
            </h2>
            {totalInq === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--text-faint)" }}>
                {isAr ? "لا توجد استفسارات بعد" : "No inquiries yet"}
              </p>
            ) : (
              INQ_STATUS.map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-sm flex-1 font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{count}</span>
                </div>
              ))
            )}
            <Link to="/inquiries"
              className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition mt-2"
              style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
              {isAr ? "عرض كل الاستفسارات →" : "View All Inquiries →"}
            </Link>
          </div>
        </div>

        {/* Performance tips */}
        <div className="rounded-2xl p-5 space-y-3" style={{ border: "1px solid var(--accent)", background: "var(--accent-light)" }}>
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <h2 className="text-sm font-bold" style={{ color: "var(--accent)" }}>
              {isAr ? "نصائح لتحسين الأداء" : "Performance Tips"}
            </h2>
          </div>
          <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }}>›</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
