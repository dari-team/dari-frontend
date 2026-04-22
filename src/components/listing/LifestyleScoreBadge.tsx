// src/components/listing/LifestyleScoreBadge.tsx
// Small badge showing lifestyle score - used on listing cards

import { getScoreLabel } from "../../lib/lifestyleScore";
import { useTranslation } from "react-i18next";

type Props = {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  onClick?: () => void;
};

export default function LifestyleScoreBadge({
  score,
  size = "md",
  showLabel = false,
  onClick,
}: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { label, labelAr, color } = getScoreLabel(score);

  const sizes = {
    sm: { badge: "w-8 h-8 text-xs", ring: 2 },
    md: { badge: "w-10 h-10 text-sm", ring: 3 },
    lg: { badge: "w-14 h-14 text-base", ring: 4 },
  };

  const { badge, ring } = sizes[size];

  // Calculate the stroke dasharray for the progress ring
  const circumference = 2 * Math.PI * 18; // radius = 18
  const progress = (score / 10) * circumference;

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 ${onClick ? "cursor-pointer hover:scale-105 transition-transform" : "cursor-default"}`}
      title={isAr ? `درجة الموقع: ${score}/10` : `Lifestyle Score: ${score}/10`}
    >
      <div className={`relative ${badge} flex items-center justify-center`}>
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth={ring}
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="50%"
            cy="50%"
            r="18"
            fill="none"
            stroke={color}
            strokeWidth={ring}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* Score number */}
        <span className="font-bold" style={{ color }}>
          {score}
        </span>
      </div>

      {showLabel && (
        <span className="text-xs font-medium" style={{ color }}>
          {isAr ? labelAr : label}
        </span>
      )}
    </button>
  );
}