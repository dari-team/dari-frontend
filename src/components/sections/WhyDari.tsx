import { Search, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function WhyDari() {
  const { t } = useTranslation();

  const features = [
    { title: t("sections.features.search"),   desc: t("sections.features.searchDesc"),   icon: <Search size={26} /> },
    { title: t("sections.features.verified"),  desc: t("sections.features.verifiedDesc"), icon: <ShieldCheck size={26} /> },
    { title: t("sections.features.modern"),    desc: t("sections.features.modernDesc"),   icon: <Sparkles size={26} /> },
  ];

  return (
    <section className="py-20" style={{ backgroundColor: "var(--bg)" }}>
      <div className="container-custom">
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
            {t("sections.whyDari")}
          </p>
          <h2 className="text-3xl font-black" style={{ color: "var(--text)" }}>{t("sections.whyDari")}</h2>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>{t("sections.whyDariDesc")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((item) => (
            <div key={item.title}
              className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"; }}>
              <div className="w-12 h-12 flex items-center justify-center rounded-xl mb-4"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                {item.icon}
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>{item.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}