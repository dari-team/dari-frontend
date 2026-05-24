const GRADIENTS: Record<string, string> = {
  buyer:  "from-sky-500 to-sky-700",
  lister: "from-emerald-500 to-emerald-700",
  agent:  "from-cyan-500 to-cyan-700",
  admin:  "from-rose-500 to-rose-700",
};

function getInitials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type Props = {
  name: string;
  src?: string | null;
  userType?: "buyer" | "lister" | "agent" | "admin";
  /** Tailwind width/height classes, e.g. "w-8 h-8 sm:w-9 sm:h-9". */
  sizeClassName?: string;
  /** Tailwind text-size class for the initials fallback. */
  textClassName?: string;
  className?: string;
};

/** User avatar: shows the profile picture when present, otherwise a
 *  gradient circle with the user's initials. */
export default function Avatar({
  name,
  src,
  userType,
  sizeClassName = "w-8 h-8",
  textClassName = "text-xs",
  className = "",
}: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClassName} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }
  const grad = (userType && GRADIENTS[userType]) ?? "from-slate-500 to-slate-700";
  return (
    <div
      className={`${sizeClassName} ${textClassName} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
