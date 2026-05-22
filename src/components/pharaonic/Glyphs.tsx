// Pharaonic decorative atoms — used only on the landing / login / signup pages.
import type { ReactNode } from "react";

export type GlyphKind =
  | "ankh" | "eye" | "lotus" | "sun" | "feather" | "scarab" | "djed" | "pyramid";

export function Hieroglyph({
  size = 20,
  kind = "ankh",
  color = "currentColor",
  strokeWidth = 1.6,
}: {
  size?: number;
  kind?: GlyphKind;
  color?: string;
  strokeWidth?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "-15 -15 30 30",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "ankh":
      return (
        <svg {...props}>
          <ellipse cx="0" cy="-6" rx="5" ry="6" />
          <line x1="0" y1="0" x2="0" y2="13" />
          <line x1="-7" y1="5" x2="7" y2="5" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M-12 0 Q0 -8 12 0 Q0 8 -12 0 Z" />
          <circle cx="0" cy="0" r="3" />
          <path d="M-1 3 Q-3 9 -8 9" />
          <path d="M12 1 L14 4" />
        </svg>
      );
    case "lotus":
      return (
        <svg {...props}>
          <path d="M0 11 Q-10 3 -12 -8 Q-6 -3 0 -7 Q6 -3 12 -8 Q10 3 0 11 Z" />
          <line x1="0" y1="11" x2="0" y2="-7" />
        </svg>
      );
    case "sun":
      return (
        <svg {...props}>
          <circle cx="0" cy="0" r="4" />
          <g stroke={color}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line
                key={a}
                x1={Math.cos((a * Math.PI) / 180) * 7}
                y1={Math.sin((a * Math.PI) / 180) * 7}
                x2={Math.cos((a * Math.PI) / 180) * 11}
                y2={Math.sin((a * Math.PI) / 180) * 11}
              />
            ))}
          </g>
        </svg>
      );
    case "feather":
      return (
        <svg {...props}>
          <path d="M0 -12 Q-4 0 -2 12 L2 12 Q4 0 0 -12 Z" />
          <line x1="-2" y1="-4" x2="2" y2="-4" />
          <line x1="-2" y1="2" x2="2" y2="2" />
          <line x1="-2" y1="8" x2="2" y2="8" />
        </svg>
      );
    case "scarab":
      return (
        <svg {...props}>
          <ellipse cx="0" cy="2" rx="8" ry="10" />
          <ellipse cx="0" cy="-7" rx="4.5" ry="3" />
          <line x1="0" y1="-4" x2="0" y2="11" />
          <path d="M-8 -1 Q-12 1 -13 5" />
          <path d="M8 -1 Q12 1 13 5" />
        </svg>
      );
    case "djed":
      return (
        <svg {...props}>
          <line x1="0" y1="-12" x2="0" y2="12" />
          <line x1="-6" y1="-12" x2="6" y2="-12" />
          <line x1="-6" y1="-8" x2="6" y2="-8" />
          <line x1="-6" y1="-4" x2="6" y2="-4" />
          <line x1="-6" y1="0" x2="6" y2="0" />
          <line x1="-8" y1="12" x2="8" y2="12" />
        </svg>
      );
    case "pyramid":
      return (
        <svg {...props}>
          <path d="M-12 9 L0 -12 L12 9 Z" />
          <line x1="0" y1="-12" x2="-3" y2="9" />
        </svg>
      );
    default:
      return null;
  }
}

// Wadjet-eye logo mark
export function DariMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden="true">
      <circle cx="0" cy="0" r="18" fill="none" stroke="var(--gold)" strokeWidth="1.4" />
      <circle cx="0" cy="0" r="14" fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.4" />
      <g fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-10 0 Q0 -7 10 0 Q0 7 -10 0 Z" />
        <circle cx="0" cy="0" r="2.4" fill="var(--gold)" />
        <path d="M10 1 L13 4" />
        <path d="M-1 3 Q-2 8 -6 8" />
      </g>
    </svg>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  glyph = "lotus",
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  align?: "left" | "center";
  glyph?: GlyphKind;
}) {
  const center = align === "center";
  return (
    <div className={`mb-10 sm:mb-12 ${center ? "text-center" : "text-start"}`}>
      <div className={`flex items-center gap-2.5 mb-3.5 ${center ? "justify-center" : "justify-start"}`}>
        <Hieroglyph kind={glyph} size={18} color="var(--gold)" strokeWidth={1.4} />
        <span className="ph-eyebrow">{eyebrow}</span>
        <Hieroglyph kind={glyph} size={18} color="var(--gold)" strokeWidth={1.4} />
      </div>
      <h2
        className="ph-display leading-[1.05] m-0"
        style={{ fontSize: "clamp(2rem, 4.5vw, 3.4rem)", color: "var(--text)", fontWeight: 500 }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-3.5 text-sm sm:text-base ${center ? "mx-auto" : ""}`}
          style={{ color: "var(--text-muted)", maxWidth: 580 }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
