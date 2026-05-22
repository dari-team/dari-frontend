import { useTranslation } from "react-i18next";
import { DariMark, Hieroglyph } from "../pharaonic/Glyphs";

export default function Footer() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const f = (k: string) => t(`sections.footer.${k}`);
  const dim = "var(--footer-fg-dim)";

  return (
    <footer
      className="pt-14 sm:pt-20 pb-10 safe-pb relative z-10"
      style={{ background: "var(--footer-bg)", color: "var(--footer-fg)" }}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="container-custom">
        {/* sun-disk divider */}
        <div className="flex items-center gap-3.5 mb-12" style={{ color: "var(--gold-2)" }}>
          <hr className="flex-1 border-0 border-t" style={{ borderColor: "var(--gold)", opacity: 0.4 }} />
          <Hieroglyph kind="sun" size={30} color="var(--gold-2)" strokeWidth={1.4} />
          <hr className="flex-1 border-0 border-t" style={{ borderColor: "var(--gold)", opacity: 0.4 }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8 sm:gap-12 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <DariMark size={34} />
              <span className="ph-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: ".05em" }}>
                {isAr ? "داري" : "Dari"}
              </span>
            </div>
            <p className="mt-4 text-sm" style={{ color: dim, lineHeight: 1.6, maxWidth: 320 }}>{f("desc")}</p>
          </div>

          {[
            { title: f("explore"), links: [f("buy"), f("rentLink"), f("newProjects"), f("luxury")] },
            { title: f("company"), links: [f("about"), f("careers"), f("contact"), f("privacy")] },
          ].map(({ title, links }) => (
            <div key={title}>
              <div className="ph-eyebrow mb-4" style={{ color: "var(--gold-2)" }}>{title}</div>
              <ul className="space-y-2.5 text-sm">
                {links.map((link) => (
                  <li
                    key={link}
                    className="cursor-pointer transition-colors"
                    style={{ color: dim }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--footer-fg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = dim)}
                  >
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 md:col-span-1">
            <div className="ph-eyebrow mb-4" style={{ color: "var(--gold-2)" }}>{f("start")}</div>
            <p className="text-sm mb-4" style={{ color: dim, lineHeight: 1.6 }}>{f("startDesc")}</p>
            <button className="ph-btn-gold px-6 py-3 rounded-lg text-sm font-bold">{f("getStarted")}</button>
          </div>
        </div>

        <div
          className="pt-7 flex flex-col md:flex-row justify-between items-center gap-3 text-xs tracking-wide text-center"
          style={{ borderTop: "1px solid var(--footer-line)", color: "var(--footer-fg-faint)" }}
        >
          <span>{f("rights")}</span>
          <div className="flex gap-5">
            {[f("terms"), f("privacy"), f("support")].map((link) => (
              <span key={link} className="cursor-pointer transition-colors hover:opacity-100" style={{ opacity: 0.8 }}>
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
