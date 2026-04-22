// src/hooks/useSubscription.ts
// Reads subscription_end_date and max_listings from the current user (mock).
// In production: replace MOCK_SUBSCRIPTION with data from your auth context / API.

export type SubscriptionStatus = "active" | "expiring_soon" | "expired" | "none";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan_name: string;
  plan_name_ar: string;
  end_date: string | null;          // ISO string  →  users.subscription_end_date
  max_listings: number;             // users.max_listings
  current_listings: number;         // count of non-rejected listings owned by user
  days_remaining: number;           // computed
  can_add_listing: boolean;         // max_listings === 0 → unlimited; else current < max
}

// ── Mock — replace with your auth context / API call ─────────────────────────
// Change these values to test different states:
//   status "active":        end_date far future
//   status "expiring_soon": end_date within 7 days
//   status "expired":       end_date in the past
//   status "none":          user_type is "buyer"

const MOCK_SUBSCRIPTION = {
  user_type:        "agent",           // "buyer" | "lister" | "agent"
  subscription_end_date: (() => {
    // Change to test: new Date(Date.now() + 3 * 86_400_000).toISOString()  → expiring in 3 days
    //                 new Date(Date.now() - 86_400_000).toISOString()      → expired yesterday
    return new Date(Date.now() + 45 * 86_400_000).toISOString(); // 45 days from now
  })(),
  max_listings:     5,   // 0 = unlimited (annual agent plan)
  current_listings: 3,   // how many active/pending listings user currently has
  plan_name:        "Agent Monthly",
  plan_name_ar:     "وكيل شهري",
};

export function useSubscription(): SubscriptionInfo {
  const {
    user_type,
    subscription_end_date,
    max_listings,
    current_listings,
    plan_name,
    plan_name_ar,
  } = MOCK_SUBSCRIPTION;

  // Buyers have no subscription
  if (user_type === "buyer") {
    return { status:"none", plan_name:"", plan_name_ar:"", end_date:null, max_listings:0, current_listings:0, days_remaining:0, can_add_listing:false };
  }

  const endDate    = new Date(subscription_end_date);
  const now        = new Date();
  const msLeft     = endDate.getTime() - now.getTime();
  const daysLeft   = Math.ceil(msLeft / 86_400_000);

  let status: SubscriptionStatus;
  if (daysLeft < 0)  status = "expired";
  else if (daysLeft <= 7) status = "expiring_soon";
  else               status = "active";

  const can_add_listing =
    status !== "expired" &&
    (max_listings === 0 || current_listings < max_listings);

  return {
    status,
    plan_name,
    plan_name_ar,
    end_date: subscription_end_date,
    max_listings,
    current_listings,
    days_remaining: Math.max(0, daysLeft),
    can_add_listing,
  };
}