// src/hooks/useSubscription.ts
// Subscription / listing-quota info derived from the real authenticated user.
//   • user_type        → from auth context
//   • current_listings → live count of the user's non-rejected listings (/Listing/my)
//   • max_listings     → from /agent/stats when available, else a role default
//   • subscription     → from /agent/stats (subscriptionExpiry / subscriptionStatus)

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { agentApi, listingApi } from "../lib/api";

export type SubscriptionStatus = "active" | "expiring_soon" | "expired" | "none";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan_name: string;
  plan_name_ar: string;
  end_date: string | null;          // ISO string  →  users.subscription_end_date
  max_listings: number;             // 0 = unlimited
  current_listings: number;         // count of non-rejected listings owned by user
  days_remaining: number;           // computed
  can_add_listing: boolean;         // max_listings === 0 → unlimited; else current < max
  loading: boolean;                 // true while live data is being fetched
}

// Free-tier default caps, used until /agent/stats responds (or if it isn't
// available for the role). Individual listers get 1 free listing; agents get a
// demo allowance that the backend overrides once the real plan is loaded.
const DEFAULT_MAX: Record<string, number> = {
  lister: 1,
  agent: 5,
};

const NONE: SubscriptionInfo = {
  status: "none",
  plan_name: "",
  plan_name_ar: "",
  end_date: null,
  max_listings: 0,
  current_listings: 0,
  days_remaining: 0,
  can_add_listing: false,
  loading: false,
};

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const ui = user?.user_type ?? "buyer";
  const canList = ui === "lister" || ui === "agent";

  const [maxListings, setMaxListings] = useState<number | null>(null);
  const [endDate, setEndDate]         = useState<string | null>(null);
  const [currentListings, setCurrent] = useState<number | null>(null);
  const [loading, setLoading]         = useState<boolean>(canList);

  useEffect(() => {
    if (!canList) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([agentApi.getStats(), listingApi.getMine()])
      .then(([statsRes, mineRes]) => {
        if (cancelled) return;
        if (statsRes.status === "fulfilled") {
          setMaxListings(statsRes.value.data.maxListings);
          setEndDate(statsRes.value.data.subscriptionExpiry);
        }
        if (mineRes.status === "fulfilled") {
          // Quota counts non-rejected listings (status 2 === rejected).
          setCurrent(mineRes.value.data.filter((l) => l.status !== 2).length);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, canList]);

  if (!canList) return NONE;

  const max_listings     = maxListings ?? DEFAULT_MAX[ui] ?? 1;
  const current_listings = currentListings ?? 0;

  let status: SubscriptionStatus = "active";
  let days_remaining = 0;
  if (endDate) {
    const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
    days_remaining = Math.max(0, daysLeft);
    if (daysLeft < 0) status = "expired";
    else if (daysLeft <= 7) status = "expiring_soon";
    else status = "active";
  }

  const can_add_listing =
    status !== "expired" && (max_listings === 0 || current_listings < max_listings);

  const isAgent = ui === "agent";
  return {
    status,
    plan_name: isAgent ? "Agent Plan" : "Free Plan",
    plan_name_ar: isAgent ? "خطة الوكيل" : "الخطة المجانية",
    end_date: endDate,
    max_listings,
    current_listings,
    days_remaining,
    can_add_listing,
    loading,
  };
}
