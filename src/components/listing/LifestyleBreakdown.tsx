// src/components/listing/LifestyleBreakdown.tsx

import { useTranslation } from "react-i18next";
import {
  type LifestyleScoreResult,
  type CategoryBreakdown,
  getScoreLabel,
  getCategoryLabel,
} from "../../lib/lifestyleScore";

type Props = {
  data: LifestyleScoreResult;
  onClose?: () => void;
};

function formatDist(m: number | null, isAr: boolean): string {
  if (m === null) return isAr ? "غير متوفر" : "N/A";
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export default function LifestyleBreakdown({ data, onClose }: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { label, labelAr, color } = getScoreLabel(data.score);

  const categories = Object.keys(data.breakdown) as (keyof CategoryBreakdown)[];

  return (
    <div className="rounded-2xl p-5 space-y-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ background: `${color}15`, border: `2px solid ${color}`, color }}>
            {data.score}
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {isAr ? "درجة الموقع والخدمات" : "Lifestyle & Convenience Score"}
            </h3>
            <p className="text-xs font-semibold" style={{ color }}>
              {isAr ? labelAr : label}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1" style={{ color: "var(--text-faint)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category breakdown with distances */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {isAr ? "التفاصيل" : "Breakdown"}
        </p>
        {categories.map((cat) => {
          const score = data.breakdown[cat];
          const dist = data.distances?.[cat] ?? null;
          const { label: catLabel, labelAr: catLabelAr, icon } = getCategoryLabel(cat);
          const pct = (score / 5) * 100;

          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{isAr ? catLabelAr : catLabel}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span style={{ color: "var(--text-faint)" }}>{formatDist(dist, isAr)}</span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>{score}/5</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Nearby places */}
      {data.nearbyPlaces.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {isAr ? "أماكن قريبة" : "Nearby Places"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {data.nearbyPlaces.slice(0, 8).map((place, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <span className="text-base flex-shrink-0">{place.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" style={{ color: "var(--text-secondary)" }}>{place.name}</p>
                  <p style={{ color: "var(--text-faint)" }}>
                    {place.distance < 1000 ? `${place.distance}m` : `${(place.distance / 1000).toFixed(1)}km`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-center pt-2 flex items-center justify-center gap-1"
        style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border)" }}>
        <span title={isAr
          ? "تُحسب درجة الموقع عند إضافة الإعلان وقد تتغير مع تحديث الأماكن القريبة."
          : "Lifestyle score is calculated at listing time and may change as nearby places update."
        }>ⓘ</span>
        {isAr
          ? "تُحسب عند الإضافة وقد تتغير مع تحديث الأماكن القريبة."
          : "Calculated at listing time. May change as nearby places update."}
      </p>
    </div>
  );
}