import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const areas = [
  { name: "New Cairo",     image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200", count: 120 },
  { name: "Zamalek",       image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200", count: 54  },
  { name: "Sheikh Zayed",  image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200", count: 89  },
  { name: "Maadi",         image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200", count: 67  },
];

export default function ExploreAreas() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="container-custom">
        <div className="mb-6 sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
            {t("sections.exploreAreas")}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text)" }}>{t("sections.exploreAreas")}</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t("sections.exploreDesc")}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          {areas.map((area) => (
            <button key={area.name} onClick={() => navigate(`/search?city=${encodeURIComponent(area.name)}`)}
              className="relative h-[180px] sm:h-[220px] md:h-[260px] rounded-2xl overflow-hidden group cursor-pointer transition duration-300 hover:-translate-y-2 text-left w-full"
              style={{ boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-xl)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}>
              <img src={area.image} alt={area.name}
                className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex justify-between items-end text-white">
                <div className="min-w-0">
                  <span className="font-bold text-sm sm:text-lg block truncate">{area.name}</span>
                  <span className="text-[11px] sm:text-xs text-white/60">{area.count} {t("search.listings")}</span>
                </div>
                <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition text-sm font-medium">View →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}