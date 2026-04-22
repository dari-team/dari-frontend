// src/components/subscription/SubscriptionBanner.tsx
// Shows a dismissible banner below the navbar when subscription is expiring or expired.
// Reads from useSubscription() — no props needed.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription";

export default function SubscriptionBanner() {
  const sub = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Only show for agents/listers with active/expiring/expired subscription
  if (dismissed || sub.status === "none" || sub.status === "active") return null;

  const isExpired  = sub.status === "expired";
  const isAr = document.documentElement.dir === "rtl";

  const bgColor    = isExpired ? "var(--danger-light)"           : "rgba(245,158,11,0.1)";
  const border     = isExpired ? "1px solid var(--danger)"       : "1px solid rgba(245,158,11,0.4)";
  const textColor  = isExpired ? "var(--danger)"                 : "#f59e0b";
  const icon       = isExpired ? "🚫" : "⏰";

  const message = isExpired
    ? (isAr
        ? `انتهى اشتراكك في ${sub.plan_name_ar}. لن تظهر إعلاناتك حتى تجدد.`
        : `Your ${sub.plan_name} subscription has expired. Your listings are hidden until you renew.`)
    : (isAr
        ? `ينتهي اشتراكك ${sub.plan_name_ar} خلال ${sub.days_remaining} يوم. جدد الآن لتتجنب الانقطاع.`
        : `Your ${sub.plan_name} subscription expires in ${sub.days_remaining} day${sub.days_remaining !== 1 ? "s" : ""}. Renew now to avoid interruption.`);

  return (
    <div className="fixed top-16 start-0 end-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{ background: bgColor, borderBottom: border }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base flex-shrink-0">{icon}</span>
        <p className="text-xs font-medium truncate" style={{ color: textColor }}>{message}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link to="/payment" className="text-xs font-bold underline transition"
          style={{ color: textColor }}>
          {isAr ? "تجديد الآن" : "Renew now"}
        </Link>
        <button onClick={() => setDismissed(true)} className="transition opacity-60 hover:opacity-100"
          style={{ color: textColor }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}