import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

export type ParsedFilters = {
  listingType?: "buy" | "rent";
  priceMin?: number; priceMax?: number;
  beds?: number; baths?: number;
  propertyType?: string; city?: string;
  finishing?: string; areaMin?: number; areaMax?: number;
  naturalSummary: string;
};

type Props = { onResults: (f: ParsedFilters) => void; onClose: () => void; };

const EXAMPLES_EN = [
  "3-bedroom apartment in Nasr City under 1 million",
  "Villa for rent in New Cairo under 50k/month",
  "Studio fully furnished in Zamalek or Maadi",
  "Land for sale in 6th of October over 500m²",
  "Penthouse with 4 beds in Heliopolis",
];
const EXAMPLES_AR = [
  "شقة 3 غرف في مدينة نصر بسعر أقل من مليون",
  "فيلا للإيجار في التجمع الخامس أقل من 50 ألف شهريًا",
  "استوديو مفروش بالكامل في الزمالك أو المعادي",
  "أرض للبيع في 6 أكتوبر أكبر من 500 متر",
  "بنتهاوس بـ 4 غرف في مصر الجديدة",
];

async function parseNaturalSearch(query: string): Promise<ParsedFilters> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 400,
      messages: [{ role: "user", content: `You are a real estate search parser for Egypt. Extract filters from: "${query}"\nReturn JSON only:\n{"listingType":"buy"|"rent"|null,"priceMin":N|null,"priceMax":N|null,"beds":N|null,"baths":N|null,"propertyType":"apartment"|"villa"|"studio"|"duplex"|"penthouse"|"office"|"shop"|"land"|null,"city":"english name"|null,"finishing":null,"naturalSummary":"one English sentence"}\nEgyptian: مليون=1000000, ألف=1000, k=1000. مدينة نصر=Nasr City, القاهرة=Cairo.` }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() || "{}";
  const p = JSON.parse(text.replace(/```json|```/g, "").trim());
  return { listingType: p.listingType ?? undefined, priceMin: p.priceMin ?? undefined, priceMax: p.priceMax ?? undefined, beds: p.beds ?? undefined, baths: p.baths ?? undefined, propertyType: p.propertyType ?? undefined, city: p.city ?? undefined, naturalSummary: p.naturalSummary || query };
}

export default function AISearchPanel({ onResults, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [query, setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [parsed, setParsed] = useState<ParsedFilters | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const examples = isAr ? EXAMPLES_AR : EXAMPLES_EN;

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true); setError(""); setParsed(null);
    try { setParsed(await parseNaturalSearch(query.trim())); }
    catch { setError(isAr ? "حدث خطأ. حاول مرة أخرى." : "Couldn't parse your search. Please try again."); }
    finally { setLoading(false); }
  }

  const tagStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    borderRadius: 999, border: "1px solid var(--border)",
    background: "var(--surface2)", padding: "2px 10px",
    fontSize: 11, color: "var(--text-secondary)",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent-light)", border: "1px solid var(--accent)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--accent)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {isAr ? "البحث الذكي" : "AI Property Search"}
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isAr ? "صف ما تبحث عنه بالعربية أو الإنجليزية" : "Describe what you're looking for in Arabic or English"}
          </p>
        </div>
        <button onClick={onClose} className="ms-auto transition" style={{ color: "var(--text-faint)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Input */}
      <div className="relative">
        <textarea ref={inputRef} value={query}
          onChange={(e) => { setQuery(e.target.value); setParsed(null); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
          rows={2}
          placeholder={isAr ? "شقة 3 غرف في مدينة نصر…" : "e.g. 3BR apartment in New Cairo under 2M…"}
          dir={isAr ? "rtl" : "ltr"}
          className="w-full rounded-2xl text-sm resize-none outline-none transition-all duration-200"
          style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", padding: "12px 44px 12px 16px" }} />
        <button onClick={handleSearch} disabled={!query.trim() || loading}
          className="absolute end-3 bottom-3 w-7 h-7 rounded-lg flex items-center justify-center transition disabled:opacity-40"
          style={{ background: "var(--accent)" }}>
          {loading
            ? <span className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "var(--accent-text)30", borderTopColor: "var(--accent-text)" }} />
            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--accent-text)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" /></svg>
          }
        </button>
      </div>

      {/* Examples */}
      {!parsed && !loading && (
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button key={ex} onClick={() => { setQuery(ex); setParsed(null); setError(""); }}
              className="rounded-full px-3 py-1 text-xs transition truncate max-w-[200px]"
              style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-muted)" }}
              dir={isAr ? "rtl" : "ltr"}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs rounded-xl px-3 py-2" style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>{error}</p>
      )}

      {/* Result */}
      {parsed && (
        <div className="rounded-2xl p-4 space-y-3" style={{ border: "1px solid var(--success)", background: "var(--success-light)" }}>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--success)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-xs font-medium" style={{ color: "var(--success)" }}>{parsed.naturalSummary}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parsed.listingType  && <span style={tagStyle}>🏷️ {parsed.listingType === "buy" ? (isAr ? "للبيع" : "For Sale") : (isAr ? "للإيجار" : "For Rent")}</span>}
            {parsed.propertyType && <span style={tagStyle}>🏠 {parsed.propertyType}</span>}
            {parsed.city         && <span style={tagStyle}>📍 {parsed.city}</span>}
            {parsed.beds         && <span style={tagStyle}>🛏 {parsed.beds}+ {isAr ? "غرف" : "beds"}</span>}
            {parsed.priceMax     && <span style={tagStyle}>💰 max {parsed.priceMax.toLocaleString()}</span>}
          </div>
          <button onClick={() => { onResults(parsed); onClose(); }}
            className="w-full rounded-xl py-2.5 text-sm font-bold transition"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            {isAr ? "تطبيق البحث ←" : "Apply Search →"}
          </button>
        </div>
      )}
    </div>
  );
}