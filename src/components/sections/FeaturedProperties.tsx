import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listingApi } from "../../lib/api";
import { mapListingResponses } from "../../lib/listingMap";
import type { Listing } from "../../data/listings";
import { Hieroglyph, SectionHeader } from "../pharaonic/Glyphs";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US").format(price);
}

export default function FeaturedProperties() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [properties, setProperties] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Prefer featured flagged listings; if none exist yet, fall back to the most
  // recent 4 approved listings so the landing page never shows an empty grid.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await listingApi.getFeatured();
        let items = mapListingResponses(res.data);
        if (items.length === 0) {
          const fb = await listingApi.getAll();
          items = mapListingResponses(fb.data);
        }
        if (alive) setProperties(items.slice(0, 4));
      } catch {
        if (alive) setProperties([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const TAGS: Record<string, string> = { New: isAr ? "جديد" : "New", Hot: isAr ? "مطلوب" : "Hot", Featured: isAr ? "مميز" : "Featured" };

  return (
    <section className="py-16 sm:py-24" style={{ backgroundColor: "var(--bg-secondary)" }} dir={isAr ? "rtl" : "ltr"}>
      <div className="container-custom">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <SectionHeader
            eyebrow={isAr ? "مختارة لك" : "Handpicked For You"}
            title={t("sections.featured")}
            subtitle={t("sections.featuredDesc")}
            glyph="lotus"
          />
          <button
            onClick={() => navigate("/search")}
            className="ph-btn-ghost inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold self-start sm:self-auto sm:mb-12"
          >
            <Hieroglyph kind="eye" size={16} color="currentColor" strokeWidth={1.6} />
            {t("sections.viewAll")}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="ph-temple-card h-[320px] animate-pulse" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16 rounded" style={{ border: "1px dashed var(--border)", background: "var(--surface)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {isAr ? "لا توجد عقارات متاحة بعد." : "No listings available yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mt-2">
            {properties.map((p) => (
              <article
                key={p.id}
                onClick={() => navigate(`/listing/${p.id}?source=direct`)}
                className="ph-temple-card ph-hoverable overflow-hidden cursor-pointer group"
              >
                <div className="relative h-[200px] overflow-hidden" style={{ background: "var(--surface2)" }}>
                  {p.images[0] ? (
                    <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: "var(--text-faint)" }}>🏛️</div>
                  )}
                  {p.badge && (
                    <div
                      className="absolute top-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{ insetInlineStart: 12, background: "var(--gold-gradient)", color: "#1F1A12", borderRadius: 2 }}
                    >
                      {TAGS[p.badge] ?? p.badge}
                    </div>
                  )}
                  <div
                    className="absolute bottom-3 px-3 py-1.5 text-xs tracking-wide"
                    style={{ insetInlineStart: 12, background: "var(--text)", color: "var(--bg)", borderRadius: 2 }}
                  >
                    EGP {formatPrice(p.priceValue)}
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <h3 className="ph-display line-clamp-1" style={{ fontSize: 21, fontWeight: 500, color: "var(--text)", lineHeight: 1.1 }}>
                    {p.title}
                  </h3>
                  <p className="text-sm mt-1.5 mb-4 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <Hieroglyph kind="ankh" size={12} color="var(--gold-deep)" strokeWidth={1.6} />
                    {p.location}
                  </p>
                  <div className="flex justify-between pt-3.5 text-sm" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <span><strong className="ph-display" style={{ color: "var(--text)", fontSize: 17, fontWeight: 600 }}>{p.beds}</strong> {t("listing.beds")}</span>
                    <span><strong className="ph-display" style={{ color: "var(--text)", fontSize: 17, fontWeight: 600 }}>{p.baths}</strong> {t("listing.baths")}</span>
                    <span><strong className="ph-display" style={{ color: "var(--text)", fontSize: 17, fontWeight: 600 }}>{p.sqft}</strong> {t("listing.area")}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
