import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Hieroglyph } from "../pharaonic/Glyphs";

export default function AgentCTA() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  return (
    <section className="py-16 sm:py-24" dir={isAr ? "rtl" : "ltr"}>
      <div className="container-custom">
        <div
          className="relative overflow-hidden text-center px-6 py-14 sm:px-16 sm:py-20"
          style={{
            borderRadius: 4,
            border: "1.5px solid var(--gold)",
            background: "linear-gradient(135deg, var(--surface2) 0%, var(--bg-3) 100%)",
          }}
        >
          {(["tl", "tr", "bl", "br"] as const).map((c) => (
            <div
              key={c}
              className="absolute"
              style={{
                top: c[0] === "t" ? 16 : undefined,
                bottom: c[0] === "b" ? 16 : undefined,
                left: c[1] === "l" ? 16 : undefined,
                right: c[1] === "r" ? 16 : undefined,
              }}
            >
              <Hieroglyph kind="djed" size={26} color="var(--gold)" strokeWidth={1.4} />
            </div>
          ))}

          <p className="ph-eyebrow mb-4">{isAr ? "انضم إلى داري" : "Join Dari"}</p>
          <h2 className="ph-display mx-auto" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", fontWeight: 500, lineHeight: 1.05, color: "var(--text)", maxWidth: 700 }}>
            {t("sections.cta.title")}
          </h2>
          <p className="mx-auto mt-4 text-sm sm:text-base" style={{ color: "var(--text-muted)", maxWidth: 580, lineHeight: 1.6 }}>
            {t("sections.cta.desc")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3.5 mt-8">
            <button onClick={() => navigate("/search")} className="ph-btn-gold px-7 py-3.5 rounded-lg text-sm font-bold">
              {t("sections.cta.browse")}
            </button>
            <button onClick={() => navigate("/signup")} className="ph-btn-ghost px-7 py-3.5 rounded-lg text-sm font-semibold">
              {t("sections.cta.becomeAgent")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
