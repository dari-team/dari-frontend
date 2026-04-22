import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const f = (k: string) => t(`sections.footer.${k}`);

  return (
    <footer className="pt-16 pb-8" style={{ backgroundColor: "var(--bg)", borderTop: "1px solid var(--border)" }}>
      <div className="container-custom">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <h2 className="text-2xl font-black mb-4" style={{ color: "var(--accent)" }}>
              {t("hero.eyebrow") === "أذكى منصة عقارية في مصر" ? "داري" : "Dari"}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{f("desc")}</p>
          </div>

          {[
            { title: f("explore"), links: [f("buy"), f("rentLink"), f("newProjects"), f("luxury")] },
            { title: f("company"), links: [f("about"), f("careers"), f("contact"), f("privacy")] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h3 className="font-bold mb-4 text-sm" style={{ color: "var(--text)" }}>{title}</h3>
              <ul className="space-y-2 text-sm">
                {links.map((link) => (
                  <li key={link} className="cursor-pointer transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="font-bold mb-4 text-sm" style={{ color: "var(--text)" }}>{f("start")}</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{f("startDesc")}</p>
            <button className="px-6 py-3 rounded-xl font-bold text-sm transition active:scale-95"
              style={{ background: "var(--gold)", color: "#1A1612" }}>
              {f("getStarted")}
            </button>
          </div>
        </div>

        <div className="pt-6 text-sm flex flex-col md:flex-row justify-between items-center gap-3"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-faint)" }}>
          <p>{f("rights")}</p>
          <div className="flex gap-4">
            {[f("terms"), f("privacy"), f("support")].map((link) => (
              <span key={link} className="cursor-pointer transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}>
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}