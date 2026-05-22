// Tiled hieroglyph "temple wall" backdrop. Renders an SVG <pattern> stroked with
// currentColor so the wrapper (.ph-hiero-backdrop / .ph-hiero-panel) controls hue
// and opacity per theme. One tile = 180×320 with three carved columns.
import { useId } from "react";

export default function HieroBackdrop({
  className = "ph-hiero-backdrop",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const patternId = `hiero-${id}`;
  return (
    <div className={className} style={style} aria-hidden="true">
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid">
        <defs>
          <pattern id={patternId} width="180" height="320" patternUnits="userSpaceOnUse">
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="0" y1="0" x2="0" y2="320" strokeWidth="0.8" opacity="0.5" />
              <line x1="60" y1="0" x2="60" y2="320" strokeWidth="0.8" opacity="0.5" />
              <line x1="120" y1="0" x2="120" y2="320" strokeWidth="0.8" opacity="0.5" />
              {/* column 1 */}
              <g transform="translate(30,24)"><ellipse cx="0" cy="-6" rx="6" ry="7" /><line x1="0" y1="1" x2="0" y2="18" /><line x1="-8" y1="6" x2="8" y2="6" /></g>
              <g transform="translate(30,68)"><path d="M-13 0 Q0 -8 13 0 Q0 8 -13 0 Z" /><circle cx="0" cy="0" r="3" /><path d="M13 1 L18 5" /><path d="M-2 3 Q-3 10 -8 10" /></g>
              <g transform="translate(30,112)"><path d="M-12 4 Q-6 -8 0 -10 Q6 -8 10 4 Q6 6 0 6 Q-6 6 -12 4 Z" /><circle cx="-3" cy="-6" r="1.5" /><line x1="-12" y1="4" x2="-16" y2="10" /></g>
              <g transform="translate(30,150)"><path d="M-14 -4 L-7 -1 L0 -4 L7 -1 L14 -4" /><path d="M-14 1 L-7 4 L0 1 L7 4 L14 1" /></g>
              <g transform="translate(30,182)"><path d="M0 -14 Q-5 0 -3 14 L3 14 Q5 0 0 -14 Z" /><line x1="-3" y1="-6" x2="3" y2="-6" /><line x1="-3" y1="0" x2="3" y2="0" /></g>
              <g transform="translate(30,222)"><ellipse cx="0" cy="2" rx="9" ry="11" /><ellipse cx="0" cy="-7" rx="5" ry="3" /><line x1="0" y1="-4" x2="0" y2="13" /></g>
              <g transform="translate(30,264)"><line x1="0" y1="-12" x2="0" y2="12" /><line x1="-6" y1="-12" x2="6" y2="-12" /><line x1="-6" y1="-7" x2="6" y2="-7" /><line x1="-6" y1="-2" x2="6" y2="-2" /><line x1="-6" y1="3" x2="6" y2="3" /><line x1="-8" y1="12" x2="8" y2="12" /></g>
              {/* column 2 */}
              <g transform="translate(90,24)"><circle cx="0" cy="0" r="5" /><circle cx="0" cy="0" r="9" strokeDasharray="2 2" /></g>
              <g transform="translate(90,64)"><path d="M0 12 Q-11 4 -13 -8 Q-7 -3 0 -7 Q7 -3 13 -8 Q11 4 0 12 Z" /></g>
              <g transform="translate(90,104)"><path d="M-13 9 L0 -12 L13 9 Z" /><line x1="0" y1="-12" x2="-3" y2="9" /></g>
              <g transform="translate(90,144)"><rect x="-12" y="-7" width="24" height="14" rx="7" /><line x1="-6" y1="-3" x2="-6" y2="3" /><line x1="0" y1="-3" x2="0" y2="3" /><line x1="6" y1="-3" x2="6" y2="3" /></g>
              <g transform="translate(90,182)"><path d="M-6 -12 Q-9 -10 -9 -7 L-3 13" /><line x1="6" y1="-12" x2="-2" y2="13" /></g>
              <g transform="translate(90,222)"><line x1="0" y1="-13" x2="0" y2="13" /><path d="M-5 -13 Q-3 -18 0 -16 Q3 -18 5 -13" /></g>
              <g transform="translate(90,260)"><path d="M-8 12 Q-8 4 0 0 Q8 -4 6 -10 Q4 -14 0 -12" /><ellipse cx="-1" cy="-12" rx="3" ry="2" /></g>
              <g transform="translate(90,300)"><path d="M-10 -4 Q-10 6 0 8 Q10 6 10 -4 Z" /></g>
              {/* column 3 */}
              <g transform="translate(150,24)"><path d="M-13 0 Q0 -8 13 0 Q0 8 -13 0 Z" /><circle cx="0" cy="0" r="3" /></g>
              <g transform="translate(150,64)"><ellipse cx="0" cy="-6" rx="6" ry="7" /><line x1="0" y1="1" x2="0" y2="18" /><line x1="-8" y1="6" x2="8" y2="6" /></g>
              <g transform="translate(150,108)"><circle cx="0" cy="-10" r="3" /><path d="M-2 -7 L-4 0 L-8 6" /><path d="M2 -7 L8 -4" /><path d="M-4 0 L-4 8 L4 8 L4 4" /></g>
              <g transform="translate(150,144)"><ellipse cx="0" cy="0" rx="11" ry="4" /><line x1="-8" y1="0" x2="8" y2="0" /></g>
              <g transform="translate(150,176)"><path d="M-10 4 Q-10 -6 0 -7 Q10 -6 10 4 Z" /></g>
              <g transform="translate(150,212)"><path d="M-7 8 L-7 -2 L-10 -10 L-6 -8 L-2 -10 L0 -2 L0 8 Z" /></g>
              <g transform="translate(150,250)"><path d="M-13 9 L0 -12 L13 9 Z" /></g>
              <g transform="translate(150,288)"><path d="M-14 -4 L-7 -1 L0 -4 L7 -1 L14 -4" /><path d="M-14 1 L-7 4 L0 1 L7 4 L14 1" /></g>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
