import { useTranslation } from "react-i18next";
import { Hieroglyph, SectionHeader, type GlyphKind } from "../pharaonic/Glyphs";

export default function WhyDari() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const features: { glyph: GlyphKind; title: string; desc: string }[] = [
    { glyph: "eye",     title: t("sections.features.search"),   desc: t("sections.features.searchDesc") },
    { glyph: "feather", title: t("sections.features.verified"), desc: t("sections.features.verifiedDesc") },
    { glyph: "scarab",  title: t("sections.features.modern"),   desc: t("sections.features.modernDesc") },
  ];

  return (
    <section className="py-16 sm:py-24" dir={isAr ? "rtl" : "ltr"}>
      <div className="container-custom">
        <SectionHeader eyebrow={`· ${t("sections.whyDari")} ·`} title={t("sections.whyDari")} subtitle={t("sections.whyDariDesc")} align="center" glyph="sun" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-7">
          {features.map((f, i) => (
            <div key={f.title} className="ph-temple-card text-center px-7 pt-11 pb-9">
              <div
                className="ph-medallion relative mx-auto mb-6 grid place-items-center rounded-full"
                style={{ width: 92, height: 92, border: "1.5px solid var(--gold)" }}
              >
                <Hieroglyph kind={f.glyph} size={42} color="var(--gold-deep)" strokeWidth={1.4} />
                <div className="ph-eyebrow absolute -top-2.5 px-2" style={{ background: "var(--surface)", fontSize: 10 }}>0{i + 1}</div>
              </div>
              <h3 className="ph-display mb-3" style={{ fontSize: 25, fontWeight: 500, color: "var(--text)" }}>{f.title}</h3>
              <p className="text-sm sm:text-[15px]" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
