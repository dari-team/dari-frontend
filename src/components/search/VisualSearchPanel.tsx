import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api, listingApi, type ListingResponse } from "../../lib/api";
import { mapListingResponses } from "../../lib/listingMap";
import type { Listing } from "../../data/listings";

type VisualHit = {
  listingId: string;
  title: string;
  imageUrl: string;
  similarityScore: number; // 0..100
};

export type VisualSearchPayload = {
  listings: Listing[];
  scores: Record<string, number>;
  hitImages: Record<string, string>;
  previewDataUrl: string;
};

type VisualSearchPrefilter = {
  propertyType?: string;  // "apartment" | "villa" | ... ("" means no filter)
  listingType?: "buy" | "rent" | "";
  city?: string;
  bedsMin?: number;       // 0 means no filter
};

type Props = {
  onResults: (payload: VisualSearchPayload) => void;
  onClose: () => void;
  currentFilters?: VisualSearchPrefilter;
};

export default function VisualSearchPanel({ onResults, onClose, currentFilters }: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warming, setWarming] = useState(false);
  const [error, setError]     = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function readFile(f: File) {
    if (!f.type.startsWith("image/")) {
      setError(isAr ? "يرجى رفع صورة." : "Please upload an image file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(isAr ? "الصورة أكبر من 10 ميجا." : "Image must be under 10MB.");
      return;
    }
    setError("");
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview((e.target?.result as string) || null);
    reader.readAsDataURL(f);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  }, []);

  async function handleSearch() {
    if (!file) return;
    setLoading(true);
    setError("");
    setWarming(false);

    // The CV/CLIP service is a separate free-tier app that can cold-start, so the
    // first request after idle often fails. Retry a couple of times with a
    // "warming up" hint before surfacing a hard error.
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const form = new FormData();
        form.append("Image", file);
        // Pass current page filters as metadata pre-filter so the backend only
        // scores listings matching the user's structured constraints.
        if (currentFilters?.propertyType) form.append("PropertyType", currentFilters.propertyType);
        if (currentFilters?.listingType)  form.append("ListingType",  currentFilters.listingType);
        if (currentFilters?.city)         form.append("City",         currentFilters.city);
        if (currentFilters?.bedsMin && currentFilters.bedsMin > 0) form.append("BedsMin", String(currentFilters.bedsMin));

        const { data: hits } = await api.post<VisualHit[]>(
          "/VisualSearch/search",
          form,
          { params: { topN: 20 }, headers: { "Content-Type": "multipart/form-data" } },
        );

        // Got a real response — stop retrying regardless of hit count.
        setWarming(false);

        if (!Array.isArray(hits) || hits.length === 0) {
          setError(isAr ? "لم نعثر على عقارات مشابهة." : "No visually similar properties found.");
          setLoading(false);
          return;
        }

        // Backend already returns sorted desc; collapse duplicate listingIds (a
        // listing has multiple images → keep highest score per listing).
        const bestPerListing = new Map<string, VisualHit>();
        for (const h of hits) {
          const prev = bestPerListing.get(h.listingId);
          if (!prev || h.similarityScore > prev.similarityScore) bestPerListing.set(h.listingId, h);
        }
        const ordered = Array.from(bestPerListing.values()).sort(
          (a, b) => b.similarityScore - a.similarityScore,
        );

        const fetched = await Promise.all(
          ordered.map(async (h) => {
            try {
              const { data } = await listingApi.getById(h.listingId);
              return { hit: h, listing: data as ListingResponse };
            } catch {
              return null;
            }
          }),
        );

        const validResponses = fetched.filter(
          (x): x is { hit: VisualHit; listing: ListingResponse } => x !== null,
        );
        const listings = mapListingResponses(validResponses.map((x) => x.listing));
        const scores: Record<string, number> = {};
        const hitImages: Record<string, string> = {};
        for (const { hit } of validResponses) {
          scores[hit.listingId] = hit.similarityScore;
          hitImages[hit.listingId] = hit.imageUrl;
        }

        onResults({ listings, scores, hitImages, previewDataUrl: preview ?? "" });
        onClose();
        return;
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        // No response (network/timeout) or a gateway error → likely a cold start.
        const isTransient = status === undefined || status === 502 || status === 503 || status === 504;
        if (attempt < MAX_ATTEMPTS && isTransient) {
          setWarming(true);
          await new Promise((r) => setTimeout(r, 2500 * attempt));
          continue;
        }

        const msg = (e as { response?: { data?: string } })?.response?.data;
        setWarming(false);
        setError(
          typeof msg === "string" && msg.length < 200
            ? msg
            : isAr
              ? "تعذّر البحث البصري. حاول مرة أخرى بعد لحظات."
              : "Visual search failed. Please try again in a moment.",
        );
        setLoading(false);
        return;
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(167,139,250,0.15)", border: "1px solid #a78bfa" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#a78bfa" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {isAr ? "البحث البصري" : "Visual Property Search"}
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isAr ? "ارفع صورة عقار — نبحث في صور الإعلانات المشابهة" : "Upload a photo — we match it against listing photos"}
          </p>
        </div>
        <button onClick={onClose} className="ms-auto" style={{ color: "var(--text-faint)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Drop zone / preview */}
      {!preview ? (
        <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)} onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 py-10 transition-all duration-200"
          style={{ borderColor: dragging ? "#a78bfa" : "var(--border)", background: dragging ? "rgba(167,139,250,0.08)" : "var(--surface2)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {isAr ? "اسحب صورة هنا أو اضغط للتصفح" : "Drop a property photo here"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              JPG, PNG, WEBP · {isAr ? "حجم أقصى 10 ميجا" : "max 10MB"}
            </p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden group" style={{ border: "1px solid var(--border)" }}>
          <img src={preview} alt="Uploaded" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)" }}>
            <button onClick={() => { setPreview(null); setFile(null); }}
              className="rounded-xl px-3 py-1.5 text-xs text-white transition"
              style={{ border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.6)" }}>
              {isAr ? "تغيير الصورة" : "Change photo"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs rounded-xl px-3 py-2"
          style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {preview && currentFilters && (currentFilters.propertyType || currentFilters.listingType || currentFilters.city || (currentFilters.bedsMin ?? 0) > 0) && (
        <div className="text-xs rounded-xl px-3 py-2 flex flex-wrap items-center gap-1.5"
          style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-muted)" }}>
          <span className="font-semibold">{isAr ? "تصفية مسبقة:" : "Pre-filtered by:"}</span>
          {currentFilters.propertyType && <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>{currentFilters.propertyType}</span>}
          {currentFilters.listingType  && <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>{currentFilters.listingType}</span>}
          {currentFilters.city         && <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>{currentFilters.city}</span>}
          {(currentFilters.bedsMin ?? 0) > 0 && <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>≥{currentFilters.bedsMin} {isAr ? "غرف" : "beds"}</span>}
        </div>
      )}

      {preview && (
        <button onClick={handleSearch} disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
          style={{ background: "#a78bfa" }}>
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {warming
                ? (isAr ? "جارٍ تشغيل محرك الصور…" : "Warming up the engine…")
                : (isAr ? "جارٍ البحث…" : "Searching…")}
            </>
          ) : (
            <>{isAr ? "ابحث عن عقارات مشابهة" : "Find Similar Properties"}</>
          )}
        </button>
      )}
    </div>
  );
}
