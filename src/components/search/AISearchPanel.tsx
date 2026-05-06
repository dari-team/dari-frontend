import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  aiSearchApi,
  extractErrorMessage,
  type AiSearchMeta,
  type AiSearchQuotaStatus,
  type ListingResponse,
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

// Backwards-compat shape consumed by Search.tsx#handleAISearch (and VisualSearchPanel).
// The new fields aiListings/aiMeta let the page render the FTS-ranked listings
// directly instead of re-fetching via /Filter (which would lose street ranking).
export type ParsedFilters = {
  listingType?: "buy" | "rent";
  priceMin?: number;
  priceMax?: number;
  beds?: number;
  baths?: number;
  propertyType?: string;
  city?: string;
  finishing?: string;
  areaMin?: number;
  areaMax?: number;
  naturalSummary: string;
  aiListings?: ListingResponse[];
  aiMeta?: AiSearchMeta;
};

type Props = { onResults: (f: ParsedFilters) => void; onClose: () => void };

const MIN_WORDS = 7;
const MAX_WORDS = 20;

const EXAMPLES_EN = [
  "3-bedroom apartment in Maadi under 2 million",
  "Villa in New Cairo with 4 bedrooms cash payment",
  "Furnished studio in Zamalek for rent around 25k",
  "Apartment for a family of 5 in Nasr City installment",
];
const EXAMPLES_AR = [
  "شقة 3 غرف في المعادي تحت 2 مليون",
  "فيلا في الشيخ زايد 4 غرف كاش أو تقسيط",
  "استوديو مفروش في الزمالك حوالي 25 ألف",
  "شقة لعيلة من 5 في مدينة نصر بتقسيط",
];

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

// Claude-style precise reset: "today at 4:42 PM" / "tomorrow at …" / "Monday at …"
function formatQuotaError(
  used: number,
  limit: number | null,
  resetAtUtc: string,
  isAr: boolean,
): string {
  const reset = new Date(resetAtUtc);
  const now = new Date();
  const sameDay = reset.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = reset.toDateString() === tomorrow.toDateString();

  const time = reset.toLocaleTimeString(isAr ? "ar-EG" : "en-US", {
    hour: "numeric", minute: "2-digit",
  });
  const weekday = reset.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "long" });
  const when = sameDay
    ? (isAr ? `اليوم الساعة ${time}` : `today at ${time}`)
    : isTomorrow
      ? (isAr ? `غدًا الساعة ${time}` : `tomorrow at ${time}`)
      : (isAr ? `${weekday} الساعة ${time}` : `${weekday} at ${time}`);

  const lim = limit ?? 3;
  return isAr
    ? `وصلت لحد البحث الذكي الأسبوعي (${used}/${lim}). ارجع ${when}.`
    : `AI search limit reached (${used}/${lim}). Come back ${when}.`;
}

function formatPrice(p: number, isRent: boolean, isAr: boolean): string {
  const fmt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`
      : v >= 1_000   ? `${Math.round(v / 1_000)}K`
      : String(v);
  const prefix = isAr ? "ج.م" : "EGP";
  const suffix = isRent ? (isAr ? "/شهر" : "/mo") : "";
  return `${prefix} ${fmt(p)}${suffix}`;
}

function listingTypeIsRent(lt: string | null | undefined): boolean {
  if (!lt) return false;
  const v = lt.toLowerCase();
  return v === "rent" || v === "forrent" || v === "for_rent";
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AISearchPanel({ onResults, onClose }: Props) {
  const { t: _t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<AiSearchMeta | null>(null);
  const [results, setResults] = useState<ListingResponse[]>([]);
  const [quota, setQuota] = useState<AiSearchQuotaStatus | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    inputRef.current?.focus();
    aiSearchApi.quota()
      .then((r) => setQuota(r.data))
      .catch(() => { /* non-fatal */ });
  }, [isAuthenticated]);

  // ── Login gate ─────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--accent-light)", border: "1px solid var(--accent)" }}>
          <span style={{ color: "var(--accent)", fontSize: 22 }}>✨</span>
        </div>
        <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
          {isAr ? "سجل الدخول لتجربة البحث الذكي" : "Log in to try AI search"}
        </h3>
        <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
          {isAr
            ? "كل حساب يحصل على 3 عمليات بحث ذكية مجانية أسبوعيًا"
            : "Every account gets 3 free AI searches per week"}
        </p>
        <button
          onClick={() => navigate("/login", { state: { from: location.pathname + location.search } })}
          className="rounded-xl px-5 py-2 text-sm font-bold transition"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          {isAr ? "سجل الدخول للتجربة ←" : "Login to try →"}
        </button>
        <button onClick={onClose} className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
          {isAr ? "إغلاق" : "Close"}
        </button>
      </div>
    );
  }

  const examples = isAr ? EXAMPLES_AR : EXAMPLES_EN;
  const wordCount = countWords(query);
  const tooShort = wordCount > 0 && wordCount < MIN_WORDS;
  const tooLong  = wordCount > MAX_WORDS;
  const ready = !!query.trim() && !tooShort && !tooLong && quota?.allowed !== false && !loading;

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    const w = countWords(q);
    if (w < MIN_WORDS) {
      setError(isAr
        ? `الرجاء كتابة ${MIN_WORDS} كلمات على الأقل (الحالي: ${w})`
        : `Please write at least ${MIN_WORDS} words (current: ${w})`);
      return;
    }
    if (w > MAX_WORDS) {
      setError(isAr
        ? `الحد الأقصى ${MAX_WORDS} كلمة (الحالي: ${w})`
        : `Maximum ${MAX_WORDS} words (current: ${w})`);
      return;
    }
    setLoading(true); setError(""); setMeta(null); setResults([]);
    try {
      const res = await aiSearchApi.search(q);
      setMeta(res.data.meta);
      setResults(res.data.results);
      try {
        const qr = await aiSearchApi.quota();
        setQuota(qr.data);
      } catch { /* ignore */ }
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const code = data?.code as string | undefined;
      if (status === 429 && code === "WEEKLY_QUOTA_EXCEEDED") {
        setError(formatQuotaError(data.used ?? 3, data.limit ?? 3, data.resetAtUtc ?? new Date().toISOString(), isAr));
        setQuota({
          limit: data.limit ?? 3,
          used: data.used ?? 3,
          remaining: 0,
          allowed: false,
          resetAtUtc: data.resetAtUtc ?? new Date().toISOString(),
        });
      } else if (status === 503 && code === "AI_SERVICE_QUOTA") {
        setError(isAr
          ? "خدمة الذكاء الاصطناعي وصلت للحد اليومي. تتجدد الساعة 12 منتصف الليل بتوقيت المحيط الهادئ."
          : "AI service is at capacity for today. Resets at midnight Pacific.");
      } else {
        setError(extractErrorMessage(e, isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!meta) return;
    const pf = meta.parsedFilters;
    const ltLc = (pf.listingType ?? "").toLowerCase();
    const mappedListingType: "buy" | "rent" | undefined =
      ltLc === "rent" || ltLc === "forrent" || ltLc === "for_rent" ? "rent"
      : ltLc === "sale" || ltLc === "buy" || ltLc === "forsale" || ltLc === "for_sale" ? "buy"
      : undefined;
    const summary = pf.location
      ? (isAr ? `${pf.propertyType ?? ""} في ${pf.location}` : `${pf.propertyType ?? ""} in ${pf.location}`).trim()
      : query;
    const payload: ParsedFilters = {
      listingType: mappedListingType,
      priceMin: pf.priceMin ?? undefined,
      priceMax: pf.priceMax ?? undefined,
      beds: pf.bedrooms ?? pf.suggestedBedrooms ?? undefined,
      baths: pf.bathrooms ?? undefined,
      propertyType: pf.propertyType ?? undefined,
      city: pf.location ?? undefined,
      finishing: pf.finishingLevel ?? undefined,
      areaMin: pf.areaMin ?? undefined,
      naturalSummary: summary,
      aiListings: results,
      aiMeta: meta,
    };
    onResults(payload);
    onClose();
  }

  function handleReset() {
    setQuery("");
    setMeta(null);
    setResults([]);
    setError("");
    inputRef.current?.focus();
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--accent-light), var(--accent-light))",
            border: "1px solid var(--accent)",
          }}>
          <span style={{ color: "var(--accent)", fontSize: 18 }}>✨</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {isAr ? "البحث الذكي" : "AI Property Search"}
            </h3>
            <span
              className="text-[10px] font-bold rounded px-1.5 py-0.5"
              style={{ background: "var(--accent-light)", color: "var(--accent-text)", border: "1px solid var(--accent)" }}
            >
              BETA
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isAr ? "صف ما تبحث عنه بالعربية أو الإنجليزية" : "Describe what you're looking for"}
          </p>
        </div>
        <button onClick={onClose} aria-label={isAr ? "إغلاق" : "Close"}
          className="transition" style={{ color: "var(--text-faint)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Input */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (ready) handleSearch();
            }
          }}
          rows={2}
          placeholder={isAr ? "شقة 3 غرف في المعادي تحت 2 مليون…" : "e.g. 3-bedroom apartment in Maadi under 2 million…"}
          dir={isAr ? "rtl" : "ltr"}
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface2)",
            color: "var(--text)",
            padding: "12px 44px 12px 16px",
            unicodeBidi: "plaintext",
          }}
          className="w-full rounded-2xl text-sm resize-none outline-none transition-all duration-200 focus:ring-2"
        />
        <button
          onClick={handleSearch}
          disabled={!ready}
          aria-label={isAr ? "بحث" : "Search"}
          className="absolute end-3 bottom-3 w-7 h-7 rounded-lg flex items-center justify-center transition disabled:opacity-40"
          style={{
            background: "var(--accent)",
            boxShadow: ready ? "0 0 12px var(--accent)" : "none",
          }}
        >
          {loading
            ? <span className="w-3 h-3 border-2 rounded-full animate-spin"
                style={{ borderColor: "transparent", borderTopColor: "var(--accent-text)" }} />
            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                style={{ color: "var(--accent-text)", transform: isAr ? "scaleX(-1)" : undefined }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>}
        </button>
      </div>

      {/* Word counter + quota chip */}
      <div className="flex items-center justify-between text-xs">
        <span style={{
          color: tooShort || tooLong ? "var(--danger)" : wordCount >= MIN_WORDS && wordCount <= MAX_WORDS ? "var(--success)" : "var(--text-muted)",
        }}>
          {wordCount}/{MAX_WORDS} {isAr ? "كلمة" : "words"}
        </span>
        {quota && (
          quota.unlimited ? (
            <span className="rounded-full px-2 py-0.5 font-bold text-[11px]"
              style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-light)" }}>
              ★ {isAr ? "مدير · غير محدود" : "Admin · Unlimited"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <span className="flex gap-1">
                {Array.from({ length: quota.limit ?? 3 }).map((_, i) => (
                  <span key={i} className="inline-block w-2 h-2 rounded-full"
                    style={{
                      background: i < quota.used ? "var(--text-faint)" : "var(--accent)",
                      opacity: i < quota.used ? 0.4 : 1,
                    }} />
                ))}
              </span>
              <span>
                {isAr
                  ? `${quota.remaining ?? 0} متبقي هذا الأسبوع`
                  : `${quota.remaining ?? 0} left this week`}
              </span>
            </span>
          )
        )}
      </div>

      {/* Quota-exceeded banner (replaces examples when out of quota and no result yet) */}
      {quota && !quota.allowed && !meta && (
        <div className="rounded-2xl p-4 flex flex-col gap-1"
          style={{ border: "1px solid var(--warning)", background: "var(--warning-light)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--warning)" }}>
            ⏳ {isAr ? "وصلت لحد البحث الذكي الأسبوعي" : "Weekly AI search limit reached"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {formatQuotaError(quota.used, quota.limit, quota.resetAtUtc, isAr)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {isAr
              ? "يمكنك الاستمرار في استخدام الفلاتر العادية بالأعلى في هذه الأثناء."
              : "You can keep using the regular filters above in the meantime."}
          </p>
        </div>
      )}

      {/* Examples */}
      {!meta && !loading && !(quota && !quota.allowed) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {isAr ? "جرب واحد من ده:" : "Try one:"}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex) => (
              <button key={ex}
                onClick={() => { setQuery(ex); setError(""); }}
                className="rounded-full px-3 py-1 text-xs transition truncate max-w-[260px]"
                style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-muted)" }}
                dir={isAr ? "rtl" : "ltr"}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-2xl p-4 animate-pulse"
          style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}>
          <div className="h-3 rounded w-1/3 mb-3" style={{ background: "var(--border)" }} />
          <div className="h-2 rounded w-2/3 mb-2" style={{ background: "var(--border)" }} />
          <div className="h-2 rounded w-1/2" style={{ background: "var(--border)" }} />
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            {isAr ? "جاري التحليل…" : "Analyzing…"}
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="text-xs rounded-xl px-3 py-2 flex items-start gap-2"
          style={{ border: "1px solid var(--warning)", background: "var(--warning-light)", color: "var(--warning)" }}>
          <span>⚠</span><span>{error}</span>
        </p>
      )}

      {/* Result */}
      {meta && !loading && (
        <ResultCard
          meta={meta}
          results={results}
          isAr={isAr}
          onApply={handleApply}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// ── Result card ──────────────────────────────────────────────────────────────
function ResultCard({
  meta,
  results,
  isAr,
  onApply,
  onReset,
}: {
  meta: AiSearchMeta;
  results: ListingResponse[];
  isAr: boolean;
  onApply: () => void;
  onReset: () => void;
}) {
  const tier = meta.streetMatch;
  const stripColor =
    tier === "exact"  ? { bg: "var(--success-light)", fg: "var(--success)", border: "var(--success)" }
    : tier === "partial" ? { bg: "var(--warning-light)", fg: "var(--warning)", border: "var(--warning)" }
    : { bg: "var(--surface2)", fg: "var(--text-muted)", border: "var(--border)" };

  const stripLabel =
    tier === "exact"   ? (isAr ? "تطابق الشارع" : "Street match")
    : tier === "partial" ? (isAr ? "تطابق جزئي" : "Partial match")
    : (isAr ? "تطابق المدينة" : "City match");

  const pf = meta.parsedFilters;
  const isRent = listingTypeIsRent(pf.listingType);
  const top3 = results.slice(0, 3);
  const more = Math.max(0, results.length - 3);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${stripColor.border}` }}>
      {/* Color-coded strip */}
      <div className="px-4 py-2 flex items-center justify-between text-xs font-bold"
        style={{ background: stripColor.bg, color: stripColor.fg }}>
        <span>{stripLabel} · {meta.resultCount} {isAr ? "نتيجة" : "results"}</span>
        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
          {meta.latencyAiMs + meta.latencyDbMs}ms
        </span>
      </div>

      <div className="p-4 space-y-3" style={{ background: "var(--surface)" }}>
        {/* Fallback notice — Problem 8: never silent */}
        {meta.notice && (
          <p className="text-xs rounded-xl px-3 py-2"
            style={{ border: "1px solid var(--warning)", background: "var(--warning-light)", color: "var(--warning)" }}>
            💡 {meta.notice}
          </p>
        )}

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {pf.listingType && <Chip icon="🏷️" label={pf.listingType} />}
          {pf.propertyType && <Chip icon="🏠" label={pf.propertyType} />}
          {pf.location && <Chip icon="📍" label={pf.location} highlight />}
          {pf.locationText && <Chip icon="🛣" label={pf.locationText} highlight />}
          {pf.bedrooms != null && <Chip icon="🛏" label={`${pf.bedrooms}+ ${isAr ? "غرف" : "beds"}`} />}
          {pf.bedrooms == null && pf.suggestedBedrooms != null && (
            <Chip icon="👨‍👩‍👧" label={`${isAr ? "مقترح" : "suggested"}: ${pf.suggestedBedrooms} ${isAr ? "غرف" : "beds"}`} />
          )}
          {(pf.priceMin != null || pf.priceMax != null) && (
            <Chip
              icon="💰"
              label={
                pf.priceMin != null && pf.priceMax != null
                  ? `${formatPrice(pf.priceMin, isRent, isAr)} – ${formatPrice(pf.priceMax, isRent, isAr)}`
                  : pf.priceMax != null
                    ? `≤ ${formatPrice(pf.priceMax, isRent, isAr)}`
                    : `≥ ${formatPrice(pf.priceMin!, isRent, isAr)}`
              }
            />
          )}
          {pf.finishingLevel && <Chip icon="✨" label={pf.finishingLevel} />}
          {pf.paymentMethod && <Chip icon="💳" label={pf.paymentMethod} />}
          {pf.maxDownPayment != null && (
            <Chip icon="📥" label={`${isAr ? "مقدم حتى" : "down ≤"} ${formatPrice(pf.maxDownPayment, false, isAr)}`} />
          )}
          {pf.nearMetro && <Chip icon="🚇" label={pf.nearMetro} />}
        </div>

        {/* Top 3 thumbnails */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {top3.map((r) => {
              const cover = r.coverImageUrl || r.images?.[0]?.url || "";
              return (
                <div key={r.id} className="relative rounded-xl overflow-hidden aspect-[4/3]"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {cover
                    ? <img src={cover} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full" style={{ background: "var(--border)" }} />}
                  <div className="absolute inset-x-0 bottom-0 px-2 py-1 text-[11px] font-bold"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
                      color: "white",
                    }}>
                    {formatPrice(r.price, r.listingType === 1, isAr)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {more > 0 && (
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            +{more} {isAr ? "أخرى" : "more"}
          </p>
        )}

        {/* Plausibility corrections */}
        {meta.corrections.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
              {meta.corrections.length} {isAr ? "تصحيحات تلقائية" : "auto-corrections"}
            </summary>
            <ul className="mt-1 space-y-0.5 ps-3" style={{ color: "var(--text-faint)" }}>
              {meta.corrections.map((c, i) => (
                <li key={i}>
                  {c.field}: {c.reasonCode} ({String(c.originalValue ?? "—")} → {String(c.newValue ?? "—")})
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button onClick={onReset}
            className="rounded-xl px-3 py-2 text-xs transition"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)", background: "transparent" }}>
            ↺ {isAr ? "جديد" : "New"}
          </button>
          <button
            onClick={onApply}
            disabled={results.length === 0}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-50"
            style={{
              background: results.length === 0 ? "var(--border)" : "var(--accent)",
              color: results.length === 0 ? "var(--text-muted)" : "var(--accent-text)",
              boxShadow: results.length === 0 ? "none" : "0 0 12px var(--accent)",
            }}
          >
            {results.length === 0
              ? (isAr ? "لا نتائج" : "No results")
              : isAr
                ? `إظهار ${results.length} على الخريطة ←`
                : `Show ${results.length} on map →`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label, highlight }: { icon: string; label: string; highlight?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full text-[11px] px-2 py-1"
      style={{
        border: highlight ? "1px solid var(--accent)" : "1px solid var(--border)",
        background: highlight ? "var(--accent-light)" : "var(--surface2)",
        color: highlight ? "var(--accent-text)" : "var(--text-secondary)",
      }}
    >
      <span>{icon}</span><span>{label}</span>
    </span>
  );
}
