import { useTranslation } from "react-i18next";
import SearchBox from "./SearchBox";

export default function Hero() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const stats = [
    { value: "50,000+", label: t("hero.stats.listings")     },
    { value: "27",      label: t("hero.stats.governorates") },
    { value: "AI",      label: t("hero.stats.aiSearch")     },
  ];

  return (
    <section className="relative min-h-[560px] sm:min-h-[620px] md:h-[650px] flex items-center justify-center overflow-visible py-12 sm:py-16 md:py-0">
      <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c" alt="Egyptian property"
        className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 dark:bg-black/65 bg-black/45" />
      <div className="absolute inset-0 dark:opacity-0 opacity-60"
        style={{ background: "linear-gradient(135deg, rgba(201,149,42,0.25) 0%, rgba(192,90,43,0.15) 50%, rgba(27,94,135,0.20) 100%)" }} />

      <div className="relative text-center flex flex-col items-center w-full max-w-3xl px-4 sm:px-6 animate-fadeUp">
        <div className="flex items-center gap-2 mb-4 sm:mb-5 px-3 sm:px-4 py-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <span className="text-sm">🇪🇬</span>
          <span className="text-xs sm:text-sm font-medium text-white/90 text-center">{t("hero.eyebrow")}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 text-white leading-tight drop-shadow-lg" dir={isAr ? "rtl" : "ltr"}>
          {t("hero.title")}<br />
          <span style={{ color: "#FFD97D" }}>{t("hero.titleHighlight")}</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 md:mb-10 text-white/80 max-w-xl px-2">{t("hero.subtitle")}</p>

        {/* SearchBox needs high z-index for dropdown */}
        <div className="relative z-50 w-full">
          <SearchBox />
        </div>

        {/* Stats - low z-index so dropdown can overlay */}
        <div className="relative z-10 flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 mt-6 sm:mt-8 md:mt-10">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-xl sm:text-2xl font-black text-white drop-shadow">{value}</p>
              <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 font-medium uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}