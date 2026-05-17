import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AgentCTA() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-20 md:py-24" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="container-custom">
        <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
            {t("sections.cta.title")}
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4" style={{ color: "var(--text)" }}>
            {t("sections.cta.title")}
          </h2>
          <p className="mb-6 sm:mb-8 max-w-xl mx-auto text-sm" style={{ color: "var(--text-muted)" }}>
            {t("sections.cta.desc")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button onClick={() => navigate("/search")}
              className="px-6 sm:px-8 py-3 rounded-xl font-bold transition active:scale-95"
              style={{ background: "var(--gold)", color: "#1A1612" }}>
              {t("sections.cta.browse")}
            </button>
            <button onClick={() => navigate("/signup")}
              className="px-6 sm:px-8 py-3 rounded-xl font-semibold transition"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
              {t("sections.cta.becomeAgent")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}