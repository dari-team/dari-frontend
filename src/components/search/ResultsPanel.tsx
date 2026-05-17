import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Listing } from "../../data/listings";
import ListingCard from "./ListingCard";

type CommuteLocation = { id: string; label: string; color: string };

type Props = {
  listings: Listing[];
  sort: string;
  setSort: (value: string) => void;
  view: "split" | "map" | "list";
  favorites?: number[];
  onToggleFavorite?: (id: string) => void;
  onHoverListing?: (id: string | null) => void;
  commuteTimesPerListing?: Map<string, Map<string, number>>;
  commuteLocations?: CommuteLocation[];
  commuteRanks?: Map<string, number>;
  hasSavedPlaces?: boolean;
  visualScores?: Record<string, number>;
};

export default function ResultsPanel({
  listings, sort, setSort, view, onHoverListing,
  commuteTimesPerListing, commuteLocations, commuteRanks, hasSavedPlaces, visualScores,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageSize = view === "list" ? 18 : 8;
  useEffect(() => { setPage(1); }, [listings]);

  const totalPages = Math.max(1, Math.ceil(listings.length / pageSize));
  const paginated  = listings.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  const btnBase: React.CSSProperties = { background: "var(--surface2)", color: "var(--text-secondary)" };

  return (
    <aside className="h-full w-full flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="flex-shrink-0 px-4 sm:px-5 py-3 sm:py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1 className="text-base sm:text-lg font-bold" style={{ color: "var(--text)" }}>{t("search.realEstate")}</h1>
        <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {listings.length} {t("search.listingsAround")}
        </p>
      </div>

      <div className="flex-shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-xs font-semibold uppercase" style={{ color: "var(--text-faint)" }}>{t("search.sort.label")}</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="text-sm rounded-full px-3 py-1 outline-none flex-1 sm:flex-none"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="newest">{t("search.sort.newest")}</option>
          <option value="priceLow">{t("search.sort.priceLow")}</option>
          <option value="priceHigh">{t("search.sort.priceHigh")}</option>
          {hasSavedPlaces && <option value="nearest">{isAr ? "الأقرب" : "Nearest"}</option>}
        </select>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 [scrollbar-width:none]">
        {listings.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color:"var(--text-muted)" }}>
            {isAr ? "لا توجد إعلانات" : "No listings found"}
          </p>
        ) : (
          <div className={view === "list" ? "grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3 sm:gap-4"}>
            {paginated.map((item, i) => {
              const rawMap = commuteTimesPerListing?.get(item.id);
              const commuteTimes = (rawMap && commuteLocations && commuteLocations.length > 0)
                ? commuteLocations.map(loc => ({
                    locId: loc.id,
                    label: loc.label,
                    minutes: rawMap.get(loc.id) ?? 0,
                    color: loc.color,
                  }))
                : undefined;
              return (
                <div key={item.id} onMouseEnter={() => onHoverListing?.(item.id)} onMouseLeave={() => onHoverListing?.(null)}>
                  <ListingCard listing={item} gradientIndex={i} commuteTimes={commuteTimes} commuteRank={commuteRanks?.get(item.id)} matchScore={visualScores?.[item.id]} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-faint)" }}>
            {t("common.page")} {page} {t("common.of")} {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-full text-sm disabled:opacity-30 transition" style={btnBase}>‹</button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`e${i}`} className="w-8 text-center text-sm" style={{ color: "var(--text-faint)" }}>…</span>
              ) : (
                <button key={p} onClick={() => handlePageChange(p)}
                  className="w-8 h-8 rounded-full text-sm font-medium transition"
                  style={page === p ? { background: "var(--accent)", color: "var(--accent-text)" } : btnBase}>
                  {p}
                </button>
              )
            )}
            <button onClick={() => handlePageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-full text-sm disabled:opacity-30 transition" style={btnBase}>›</button>
          </div>
        </div>
      )}
    </aside>
  );
}