import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listingApi } from "../../lib/api";
import { mapListingResponses } from "../../lib/listingMap";
import type { Listing } from "../../data/listings";

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

  const TAGS: Record<string, string> = { New: isAr?"جديد":"New", Hot: isAr?"مطلوب":"Hot", Featured: isAr?"مميز":"Featured" };

  return (
    <section className="py-20" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="container-custom">

        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
              {isAr ? "مختارة لك" : "Handpicked For You"}
            </p>
            <h2 className="text-3xl font-black" style={{ color: "var(--text)" }}>
              {t("sections.featured")}
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {t("sections.featuredDesc")}
            </p>
          </div>

          <button
            onClick={() => navigate("/search")}
            className="text-sm font-semibold transition-colors flex items-center gap-1"
            style={{ color: "var(--accent)" }}
          >
            {t("sections.viewAll")}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl h-[310px] animate-pulse"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16 rounded-2xl"
            style={{ border: "1px dashed var(--border)", background: "var(--surface)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {isAr ? "لا توجد عقارات متاحة بعد." : "No listings available yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {properties.map((p) => (
              <article
                key={p.id}
                onClick={() => navigate(`/listing/${p.id}?source=direct`)}
                className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "var(--shadow-xl)";
                  el.style.borderColor = "var(--accent)";
                  el.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "var(--shadow-sm)";
                  el.style.borderColor = "var(--border)";
                  el.style.transform = "";
                }}
              >
                {/* Image */}
                <div className="relative h-[185px] overflow-hidden" style={{ background: "var(--surface2)" }}>
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl"
                      style={{ color: "var(--text-faint)" }}>🏠</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Price badge */}
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg text-xs font-bold shadow-lg"
                    style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                    EGP {formatPrice(p.priceValue)}
                  </div>

                  {/* Tag */}
                  {p.badge && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: "var(--gold)", color: "#1A1612" }}>
                      {TAGS[p.badge] ?? p.badge}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-[14px] mb-1 line-clamp-1 transition-colors"
                    style={{ color: "var(--text)" }}>
                    {p.title}
                  </h3>
                  <p className="text-sm mb-3 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {p.location}
                  </p>

                  <div className="flex justify-between text-sm pt-3"
                    style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <span><strong style={{ color: "var(--text)" }}>{p.beds}</strong> {t("listing.beds")}</span>
                    <span><strong style={{ color: "var(--text)" }}>{p.baths}</strong> {t("listing.baths")}</span>
                    <span><strong style={{ color: "var(--text)" }}>{p.sqft}</strong> {t("listing.area")}</span>
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
