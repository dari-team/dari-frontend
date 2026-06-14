// Shared pieces for the pharaonic auth pages (Login / Signup): the decorative
// art panel and the top theme/language controls.
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Hieroglyph, type GlyphKind } from "./Glyphs";
import HieroBackdrop from "./HieroBackdrop";
import { iconBtn } from "./authPrefs";
import DariLogo from "../brand/DariLogo";

export function AuthTopControls({
  dark, lang, toggleTheme, toggleLang,
}: { dark: boolean; lang: "en" | "ar"; toggleTheme: () => void; toggleLang: () => void }) {
  return (
    <div className="absolute top-7 flex gap-2 z-10" style={{ insetInlineEnd: 28 }}>
      <button onClick={toggleLang} style={iconBtn} title="Language">{lang === "en" ? "ع" : "EN"}</button>
      <button onClick={toggleTheme} style={iconBtn} title="Theme">
        {dark
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>}
      </button>
    </div>
  );
}

export function AuthArtPanel({ lang, headline, sub }: { lang: "en" | "ar"; headline: React.ReactNode; sub: string }) {
  const { t } = useTranslation();
  const isAr = lang === "ar";
  const stats: { v: string; l: string; g: GlyphKind }[] = [
    { v: "50K+", l: t("hero.stats.listings"),     g: "scarab" },
    { v: "27",   l: t("hero.stats.governorates"), g: "pyramid" },
    { v: "AI",   l: t("hero.stats.aiSearch"),     g: "feather" },
  ];
  return (
    <aside className="relative overflow-hidden hidden lg:block" style={{ background: "#0E1428" }}>
      <img
        src="https://images.unsplash.com/photo-1568322445389-f64ac2515020?q=80&w=1800"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.35 }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(20,12,2,.55) 0%, rgba(31,77,143,.45) 100%)" }} />
      <HieroBackdrop className="ph-hiero-panel" style={{ color: "#F2C865", opacity: 0.5, mixBlendMode: "screen" }} />

      <div className="absolute top-8 flex items-center gap-3" style={{ insetInlineStart: 32 }}>
        <Link to="/" className="flex items-center no-underline">
          <DariLogo variant="white" height={46} />
        </Link>
      </div>

      <div className="relative z-[2] h-full flex flex-col justify-center px-14">
        <div className="flex items-center gap-3.5 mb-5">
          <Hieroglyph kind="ankh" size={34} color="#F2C865" strokeWidth={1.3} />
          <span className="ph-eyebrow" style={{ color: "#F2C865", fontSize: 11 }}>{isAr ? "بيت من النيل" : "House of the Nile"}</span>
        </div>
        <h2 className="ph-display" style={{ fontSize: "clamp(2.5rem,4vw,4rem)", lineHeight: 1.0, fontWeight: 500, color: "#F8EFD6", letterSpacing: "-0.01em" }}>
          {headline}
        </h2>
        <p className="mt-5 text-base" style={{ color: "rgba(245,237,220,.78)", maxWidth: 440, lineHeight: 1.6 }}>{sub}</p>
        <div className="flex gap-9 mt-12 pt-7" style={{ borderTop: "1px solid rgba(245,237,220,.18)" }}>
          {stats.map((s) => (
            <div key={s.l} className="flex items-center gap-2.5">
              <Hieroglyph kind={s.g} size={22} color="#F2C865" strokeWidth={1.3} />
              <div>
                <div className="ph-display" style={{ fontSize: 22, fontWeight: 700, color: "#F8EFD6", lineHeight: 1 }}>{s.v}</div>
                <div className="ph-eyebrow" style={{ fontSize: 8, color: "rgba(245,237,220,.65)", marginTop: 3 }}>{s.l}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
