import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Hieroglyph, type GlyphKind } from "../pharaonic/Glyphs";

const areas: { name: string; nameAr: string; image: string; glyph: GlyphKind; big?: boolean }[] = [
  { name: "New Cairo",    nameAr: "القاهرة الجديدة", image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200", glyph: "pyramid", big: true },
  { name: "Zamalek",      nameAr: "الزمالك",         image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200", glyph: "lotus" },
  { name: "Sheikh Zayed", nameAr: "الشيخ زايد",      image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200", glyph: "sun" },
  { name: "Maadi",        nameAr: "المعادي",         image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200", glyph: "scarab" },
  { name: "North Coast",  nameAr: "الساحل الشمالي",  image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200", glyph: "feather" },
  { name: "Gouna",        nameAr: "الجونة",          image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200", glyph: "ankh" },
];

export default function ExploreAreas() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  return (
    <section className="py-16 sm:py-24" dir={isAr ? "rtl" : "ltr"}>
      <div className="container-custom">
        <div className="mb-8 sm:mb-12">
          <div className="ph-eyebrow mb-3.5">· {t("sections.exploreAreas")} ·</div>
          <h2 className="ph-display m-0 leading-none" style={{ fontSize: "clamp(2.25rem, 5.5vw, 4rem)", fontWeight: 500, color: "var(--text)" }}>
            {t("sections.exploreAreas")}
          </h2>
          <p className="mt-3.5 text-sm sm:text-base" style={{ color: "var(--text-muted)", maxWidth: 480 }}>
            {t("sections.exploreDesc")}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 auto-rows-[180px] sm:auto-rows-[220px] gap-3 sm:gap-4">
          {areas.map((area) => (
            <button
              key={area.name}
              onClick={() => navigate(`/search?city=${encodeURIComponent(area.name)}`)}
              className={`ph-lotus-card group relative overflow-hidden text-start ${
                area.big ? "col-span-2 row-span-2" : ""
              }`}
              style={{ background: "var(--surface2)" }}
            >
              <img
                src={area.image}
                alt={area.name}
                className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,12,2,0) 35%, rgba(20,12,2,.85) 100%)" }} />
              <span className="ph-corner tl" /><span className="ph-corner tr" /><span className="ph-corner bl" /><span className="ph-corner br" />
              <div className="absolute bottom-4" style={{ insetInlineStart: 16, insetInlineEnd: 16, color: "#F5EDDC" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Hieroglyph kind={area.glyph} size={area.big ? 24 : 18} color="var(--gold-2)" strokeWidth={1.5} />
                  <span className="ph-eyebrow" style={{ color: "var(--gold-2)", fontSize: 9 }}>{area.nameAr}</span>
                </div>
                <div className="ph-display leading-none" style={{ fontSize: area.big ? "clamp(2rem,4vw,3.25rem)" : "clamp(1.4rem,3vw,1.9rem)", fontWeight: 500 }}>
                  {isAr ? area.nameAr : area.name}
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs tracking-widest" style={{ color: "rgba(245,237,220,.7)" }}>
                    100+ {t("search.listings")}
                  </span>
                  <span className="text-xs tracking-widest" style={{ color: "var(--gold-2)" }}>{isAr ? "←" : "→"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
