import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localizeListingTitle } from "../../lib/localizeListing";
import { getScoreLabel } from "../../lib/lifestyleScore";
import type { Listing } from "../../data/listings";
import { useAuth } from "../../context/AuthContext";
import { useWishlistSave } from "../../hooks/useWishlistSave";
import WishlistPickerModal from "./WishlistPickerModal";

export type CommuteTimeEntry = { locId: string; label: string; minutes: number; color: string };

type Props = { listing: Listing; gradientIndex?: number; commuteTimes?: CommuteTimeEntry[]; commuteScore?: number; commuteRank?: number; matchScore?: number; rankKind?: "lifestyle" | "quality"; };

export default function ListingCard({ listing, commuteTimes, commuteRank, matchScore, rankKind }: Props) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { isAuthenticated } = useAuth();
  const { isSaved, toggleSave, saving, markSaved } = useWishlistSave();
  const [imgError, setImgError]       = useState(false);
  const [hovered, setHovered]         = useState(false);
  const [saveErr, setSaveErr]         = useState("");
  const [showPicker, setShowPicker]   = useState(false);
  const heartBtnRef                   = useRef<HTMLButtonElement>(null);

  const listingId = listing.id.toString();
  const saved = isSaved(listingId);

  const coverImage = !imgError && listing.images?.length ? listing.images[0] : null;
  const isRent = listing.listingType === "rent";
  const localTitle = localizeListingTitle(listing, isAr);

  // When the user ranks by lifestyle / listing quality, surface that score on the card.
  const rankScore = rankKind === "lifestyle" ? listing.lifestyleScore?.score
                  : rankKind === "quality"   ? (listing.aiQualityScore ?? undefined)
                  : undefined;
  const rankColor = typeof rankScore === "number" ? getScoreLabel(rankScore).color : "var(--text-faint)";

  const badgeLabel = listing.badge
    ? ({ New: isAr?"جديد":"New", "Open Sat": isAr?"مفتوح السبت":"Open Sat", "Price Cut": isAr?"تخفيض":"Price Cut", "Hot Home": isAr?"مطلوب":"Hot Home", Exclusive: isAr?"حصري":"Exclusive", Premium: isAr?"مميز":"Premium" }[listing.badge] ?? listing.badge)
    : null;

  return (
    <article
      onClick={() => navigate(`/listing/${listing.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group cursor-pointer overflow-hidden rounded-2xl transition-all duration-250"
      style={{
        background: "var(--surface)",
        border: `1px solid ${hovered ? "var(--accent)" : "var(--border)"}`,
        boxShadow: hovered ? "var(--shadow-lg)" : "var(--shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "",
      }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden" style={{ background: "var(--surface2)" }}>
        {coverImage ? (
          <img src={coverImage} alt={localTitle} onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--surface2), var(--bg-secondary))" }}>
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-faint)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21V12h6v9" />
            </svg>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Badge */}
        {badgeLabel && (
          <div className="absolute top-3 start-3">
            <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "var(--gold)", color: "#1A1612" }}>
              {badgeLabel}
            </span>
          </div>
        )}

        {/* Visual similarity chip (only in visual search mode) */}
        {typeof matchScore === "number" && (
          <div className="absolute top-3 start-3" style={{ marginTop: badgeLabel ? 28 : 0 }}>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{
                background: "rgba(167,139,250,0.95)",
                color: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
              title={isAr ? "نسبة التشابه البصري" : "Visual similarity"}
            >
              🎯 {Math.round(matchScore)}% {isAr ? "تشابه" : "match"}
            </span>
          </div>
        )}

        {/* Rank-by score chip — visible when results are ranked by lifestyle / quality */}
        {rankKind && (
          <div className="absolute top-3 start-3" style={{ marginTop: badgeLabel ? 28 : 0 }}>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{
                background: typeof rankScore === "number" ? rankColor : "rgba(0,0,0,0.55)",
                color: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
              title={rankKind === "lifestyle"
                ? (isAr ? "درجة الموقع والخدمات" : "Lifestyle score")
                : (isAr ? "تقييم جودة الإعلان" : "Listing quality score")}
            >
              {rankKind === "lifestyle" ? "🌿" : "🏆"}{" "}
              {typeof rankScore === "number" ? `${rankScore.toFixed(1)}/10` : (isAr ? "غير مقيّم" : "Unrated")}
            </span>
          </div>
        )}

        {/* Save button */}
        <button
          ref={heartBtnRef}
          disabled={saving}
          onClick={async (e) => {
            e.stopPropagation();
            if (!isAuthenticated) { navigate("/login"); return; }
            if (saved) {
              // Already saved → unsave directly
              const { error } = await toggleSave(listingId);
              if (error && error !== "login") { setSaveErr(error); setTimeout(() => setSaveErr(""), 3000); }
            } else {
              // Not saved → open wishlist picker
              setShowPicker(true);
            }
          }}
          className="absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-full transition-all"
          style={{
            background: saved ? "rgba(244,63,94,0.15)" : "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${saved ? "rgba(244,63,94,0.4)" : "rgba(255,255,255,0.2)"}`,
            opacity: saving ? 0.6 : 1,
          }}
          aria-label={saved ? t("listing.saved") : t("listing.save")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor"
            fill={saved ? "currentColor" : "none"}
            style={{ color: saved ? "#f43f5e" : "white" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        {/* Wishlist picker popover */}
        {showPicker && (
          <WishlistPickerModal
            listingId={listingId}
            anchorRef={heartBtnRef}
            onClose={() => setShowPicker(false)}
            onSaved={(itemId, wishlistId) => {
              markSaved(listingId, itemId, wishlistId);
              setShowPicker(false);
            }}
          />
        )}

        {/* Inline save error toast */}
        {saveErr && (
          <div className="absolute bottom-2 start-2 end-2 rounded-lg px-2 py-1 text-[11px] font-medium text-white text-center"
            style={{ background: "rgba(239,68,68,0.9)", backdropFilter: "blur(4px)" }}>
            {saveErr}
          </div>
        )}

        {/* Image count */}
        {listing.images?.length > 1 && (
          <div className="absolute bottom-3 end-3 flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white backdrop-blur"
            style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {listing.images.length}
          </div>
        )}

        {/* Sale/Rent pill */}
        <div className="absolute bottom-3 start-3">
          <span className="rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ background: isRent ? "var(--success)" : "var(--accent)", color: isRent ? "white" : "var(--accent-text)" }}>
            {isRent ? t("listing.forRent") : t("listing.forSale")}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black truncate" style={{ color: "var(--text)" }}>{listing.price}</p>
            <p className="mt-0.5 text-sm font-medium truncate" style={{ color: "var(--text-secondary)" }}>{localTitle}</p>
          </div>
          <span className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold"
            style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            {listing.sqft?.toLocaleString()} {t("listing.area")}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
          <span><strong style={{ color: "var(--text)" }}>{listing.beds}</strong> {t("listing.beds")}</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span><strong style={{ color: "var(--text)" }}>{listing.baths}</strong> {t("listing.baths")}</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span className="capitalize">{listing.propertyType}</span>
        </div>

        <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: "var(--text-faint)" }}>
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {listing.location}
        </p>

        {/* Commute times — avg primary, breakdown secondary */}
        {commuteTimes && commuteTimes.length > 0 && (() => {
          const valid = commuteTimes.filter(ct => ct.minutes > 0);
          if (valid.length === 0) return null;
          const avg = Math.round(valid.reduce((s, ct) => s + ct.minutes, 0) / valid.length);
          const col = avg <= 15 ? "#10b981" : avg <= 30 ? "#f59e0b" : "#ef4444";
          return (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                    style={{ background: `${col}18`, border: `1px solid ${col}44` }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: col }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-black leading-tight" style={{ color: col }}>
                      {avg} min{valid.length > 1 ? " avg" : ""}
                    </p>
                    <p className="text-xs leading-tight" style={{ color: "var(--text-faint)" }}>
                      {valid.length === 1 ? `to ${valid[0].label}` : `avg · ${valid.map(ct => `${ct.label} ${ct.minutes}m`).join(", ")}`}
                    </p>
                  </div>
                </div>
                {commuteRank !== undefined && commuteRank <= 20 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                    🏆 #{commuteRank}
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </article>
  );
}