import { Link } from "react-router-dom";
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

          {([
            // Explore links route into the real search page with the right filters.
            { title: f("explore"), links: [
              { label: f("buy"),         to: "/search?type=buy" },
              { label: f("rentLink"),    to: "/search?type=rent" },
              { label: f("newProjects"), to: "/search?completion=offplan" },
              { label: f("luxury"),      to: "/search?sort=priceHigh" },
            ] },
            // Company links have no content pages yet — render as plain labels
            // rather than fake (dead) links.
            { title: f("company"), links: [
              { label: f("about") }, { label: f("careers") }, { label: f("contact") }, { label: f("privacy") },
            ] },
          ] as { title: string; links: { label: string; to?: string }[] }[]).map(({ title, links }) => (
            <div key={title}>
              <div className="ph-eyebrow mb-4" style={{ color: "var(--gold-2)" }}>{title}</div>
              <ul className="space-y-2.5 text-sm">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    {to ? (
                      <Link
                        to={to}
                        className="cursor-pointer transition-colors"
                        style={{ color: dim }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--footer-fg)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = dim)}
                      >
                        {label}
                      </Link>
                    ) : (
                      <span style={{ color: dim }}>{label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 md:col-span-1">
            <div className="ph-eyebrow mb-4" style={{ color: "var(--gold-2)" }}>{f("start")}</div>
            <p className="text-sm mb-4" style={{ color: dim, lineHeight: 1.6 }}>{f("startDesc")}</p>
            <Link to="/search" className="ph-btn-gold px-6 py-3 rounded-lg text-sm font-bold inline-block">{f("getStarted")}</Link>
          </div>
        </div>

        <div
          className="pt-7 flex flex-col md:flex-row justify-between items-center gap-3 text-xs tracking-wide text-center"
          style={{ borderTop: "1px solid var(--footer-line)", color: "var(--footer-fg-faint)" }}
        >
          <span>{f("rights")}</span>
          <div className="flex gap-5">
            {[f("terms"), f("privacy"), f("support")].map((link) => (
              <span key={link} style={{ opacity: 0.8 }}>
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
