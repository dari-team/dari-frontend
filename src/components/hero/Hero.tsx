import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SearchBox from "./SearchBox";
import { Hieroglyph, type GlyphKind } from "../pharaonic/Glyphs";
import { platformApi } from "../../lib/api";

const STEP_CLIP =
  "polygon(0 28px, 12px 28px, 12px 18px, 24px 18px, 24px 8px, calc(100% - 24px) 8px, calc(100% - 24px) 18px, calc(100% - 12px) 18px, calc(100% - 12px) 28px, 100% 28px, 100% 100%, 0 100%)";

function TempleFrame() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <div className="relative" style={{ padding: 14 }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ clipPath: STEP_CLIP, WebkitClipPath: STEP_CLIP, border: "1.5px solid var(--gold)" }}
      />
      <div className="relative overflow-hidden" style={{ borderRadius: 2, boxShadow: "var(--shadow-xl)" }}>
        <img
          src="https://images.unsplash.com/photo-1568322445389-f64ac2515020?q=80&w=1800"
          alt=""
          className="block w-full object-cover"
          style={{ height: "min(600px, 64vh)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 30%, rgba(20,12,2,0.42) 100%)" }}
        />
        <div className="absolute bottom-4 flex justify-between items-end" style={{ insetInlineStart: 16, insetInlineEnd: 16, color: "#F5EDDC" }}>
          <div>
            <div className="ph-eyebrow" style={{ color: "rgba(245,237,220,.75)", fontSize: 9 }}>
              {isAr ? "عقار مميز · الشيخ زايد" : "Featured · Sheikh Zayed"}
            </div>
            <div className="ph-display" style={{ fontSize: 22, marginTop: 4 }}>
              {isAr ? "فيلا فاخرة · 6 غرف" : "Villa · 6 BR · Garden"}
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(245,237,220,.15)", border: "1px solid rgba(245,237,220,.30)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          >
            <Hieroglyph kind="sun" size={14} color="#F5EDDC" strokeWidth={1.4} />
            <span className="text-[11px] font-semibold tracking-widest">EGP 28.5M</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [activeListings, setActiveListings] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    platformApi
      .getStats()
      .then((res) => {
        if (!cancelled) setActiveListings(res.data.totalActiveListings);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const stats: { value: string; label: string; glyph: GlyphKind }[] = [
    { value: activeListings == null ? "—" : activeListings.toLocaleString(), label: t("hero.stats.listings"), glyph: "scarab" },
    { value: "27",      label: t("hero.stats.governorates"), glyph: "pyramid" },
    { value: "AI",      label: t("hero.stats.aiSearch"),     glyph: "feather" },
  ];

  return (
    <section className="relative pt-12 pb-24 sm:pt-16 lg:pt-20 lg:pb-32" dir={isAr ? "rtl" : "ltr"}>
      <div className="container-custom grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
        {/* LEFT — copy + (mobile search) + stats */}
        <div className="ph-fadeUp">
          <div
            className="ph-glass inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full"
            style={{ border: "1px solid var(--gold)" }}
          >
            <span className="ph-sun-disk" />
            <span className="ph-eyebrow" style={{ fontSize: 10 }}>{t("hero.eyebrow")}</span>
          </div>

          <h1
            className="ph-display ph-fadeUp ph-d1 mt-6"
            style={{ fontSize: "clamp(2.75rem, 7vw, 6rem)", lineHeight: 0.95, color: "var(--text)", fontWeight: 500, letterSpacing: "-0.015em" }}
          >
            {t("hero.title")}
            <br />
            <span className="inline-flex items-center gap-3">
              <em className="ph-gold-text" style={{ fontStyle: "italic", fontWeight: 600 }}>
                {t("hero.titleHighlight")}
              </em>
              <Hieroglyph kind="ankh" size={56} color="var(--gold)" strokeWidth={1.2} />
            </span>
          </h1>

          <p className="ph-fadeUp ph-d2 mt-6 text-base sm:text-lg" style={{ color: "var(--text-muted)", maxWidth: 540, lineHeight: 1.55 }}>
            {t("hero.subtitle")}
          </p>

          {/* Search — in-flow on mobile/tablet (floats over the image on lg, see right column) */}
          {/* relative z-30: lifts this stacking context above the stats row (ph-d4) so the
              location dropdown isn't covered by the stat icons/labels below it */}
          <div className="ph-fadeUp ph-d3 mt-7 lg:hidden relative z-30">
            <SearchBox />
          </div>

          <div
            className="ph-fadeUp ph-d4 flex flex-wrap gap-6 sm:gap-9 mt-9 pt-7"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <Hieroglyph kind={s.glyph} size={26} color="var(--gold)" strokeWidth={1.3} />
                <div>
                  <div className="ph-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{s.value}</div>
                  <div className="ph-eyebrow mt-1" style={{ fontSize: 9 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — temple-frame image with floating search box (lg+) */}
        <div className="ph-fadeUp ph-d3 relative hidden lg:block">
          <TempleFrame />
          <div className="absolute z-20" style={{ insetInlineStart: -40, insetInlineEnd: 24, bottom: -44 }}>
            <SearchBox />
          </div>
        </div>
      </div>
    </section>
  );
}
