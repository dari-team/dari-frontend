// The Dari brand lockup (house mark + "DARI · داري · Intelligent Real estate").
//
// The source art is white line-work on transparency, so it reads on dark
// surfaces as-is. For light surfaces we ship a pre-recolored navy variant
// (generated from the same master) — crisper than filtering a raster at runtime.
//
//   variant="white" → for dark backgrounds (default)
//   variant="navy"  → for light backgrounds
type Props = {
  height?: number;
  variant?: "white" | "navy";
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function DariLogo({
  height = 36,
  variant = "white",
  alt = "Dari — Intelligent Real estate",
  className,
  style,
}: Props) {
  const src = variant === "navy" ? "/dari-logo-dark.png" : "/dari-logo.png";
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      style={{ height, width: "auto", display: "block", userSelect: "none", ...style }}
      className={className}
    />
  );
}
