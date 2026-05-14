// Canonical amenities list — single source of truth for the Add Listing form,
// the search Filters panel, and the Listing detail page.
//
// Keys are stable strings persisted on the backend (JSON array on Listing.Amenities).
// Never rename a key once shipped — existing listings store it verbatim.
// Labels are tuned for the Egyptian market (natural gas, elevators, compounds,
// backup generators all matter here in a way generic Gulf lists ignore).

export type AmenityGroup = "essentials" | "comfort" | "compound" | "premium";

export interface Amenity {
  key: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  group: AmenityGroup;
}

export const AMENITIES: Amenity[] = [
  // ── Essentials ──────────────────────────────────────────────────────────────
  { key: "elevator",          labelEn: "Elevator",          labelAr: "أسانسير",          icon: "🛗", group: "essentials" },
  { key: "covered_parking",   labelEn: "Covered Parking",   labelAr: "جراج / باركينج",   icon: "🅿️", group: "essentials" },
  { key: "natural_gas",       labelEn: "Natural Gas",       labelAr: "غاز طبيعي",        icon: "🔥", group: "essentials" },
  { key: "security",          labelEn: "24/7 Security",     labelAr: "أمن على مدار اليوم", icon: "🛡️", group: "essentials" },
  { key: "backup_generator",  labelEn: "Backup Generator",  labelAr: "مولد كهرباء",      icon: "⚡", group: "essentials" },
  { key: "utility_meters",    labelEn: "Water & Electricity Meters", labelAr: "عدادات مياه وكهرباء", icon: "📟", group: "essentials" },

  // ── Comfort ─────────────────────────────────────────────────────────────────
  { key: "central_ac",        labelEn: "Central A/C",       labelAr: "تكييف مركزي",      icon: "❄️", group: "comfort" },
  { key: "built_in_wardrobes",labelEn: "Built-in Wardrobes",labelAr: "دواليب حائط",      icon: "🚪", group: "comfort" },
  { key: "maids_room",        labelEn: "Maid's Room",       labelAr: "غرفة خادمة",       icon: "🧹", group: "comfort" },
  { key: "balcony",           labelEn: "Balcony / Terrace", labelAr: "بلكونة / تراس",    icon: "🌅", group: "comfort" },
  { key: "private_roof",      labelEn: "Private Roof",      labelAr: "روف خاص",          icon: "🏙️", group: "comfort" },
  { key: "storage_room",      labelEn: "Storage Room",      labelAr: "غرفة تخزين",       icon: "📦", group: "comfort" },
  { key: "intercom",          labelEn: "Intercom",          labelAr: "إنتركم",           icon: "📞", group: "comfort" },
  { key: "internet",          labelEn: "Internet / Satellite", labelAr: "إنترنت / دش",   icon: "📶", group: "comfort" },

  // ── Compound / Shared ───────────────────────────────────────────────────────
  { key: "within_compound",   labelEn: "Within a Compound", labelAr: "داخل كمبوند",      icon: "🏘️", group: "compound" },
  { key: "shared_pool",       labelEn: "Shared Pool",       labelAr: "حمام سباحة مشترك", icon: "🏊", group: "compound" },
  { key: "shared_gym",        labelEn: "Shared Gym",        labelAr: "جيم",              icon: "🏋️", group: "compound" },
  { key: "kids_play_area",    labelEn: "Kids Play Area",    labelAr: "منطقة ألعاب أطفال", icon: "🛝", group: "compound" },
  { key: "landscaped_gardens",labelEn: "Landscaped Gardens",labelAr: "حدائق",            icon: "🌳", group: "compound" },

  // ── Premium ─────────────────────────────────────────────────────────────────
  { key: "private_garden",    labelEn: "Private Garden",    labelAr: "حديقة خاصة",       icon: "🌷", group: "premium" },
  { key: "private_pool",      labelEn: "Private Pool",      labelAr: "حمام سباحة خاص",   icon: "🏖️", group: "premium" },
  { key: "private_jacuzzi",   labelEn: "Private Jacuzzi",   labelAr: "جاكوزي خاص",       icon: "🛁", group: "premium" },
  { key: "water_view",        labelEn: "Water View",        labelAr: "إطلالة على الماء", icon: "🌊", group: "premium" },
  { key: "landmark_view",     labelEn: "Landmark View",     labelAr: "إطلالة مميزة",     icon: "🏛️", group: "premium" },
  { key: "pets_allowed",      labelEn: "Pets Allowed",      labelAr: "مسموح بالحيوانات", icon: "🐾", group: "premium" },
];

export const AMENITY_GROUP_LABELS: Record<AmenityGroup, { en: string; ar: string }> = {
  essentials: { en: "Essentials",       ar: "الأساسيات" },
  comfort:    { en: "Comfort",          ar: "وسائل الراحة" },
  compound:   { en: "Compound & Shared",ar: "الكمبوند والمرافق المشتركة" },
  premium:    { en: "Premium",          ar: "مميزات إضافية" },
};

export const AMENITY_GROUP_ORDER: AmenityGroup[] = ["essentials", "comfort", "compound", "premium"];

const AMENITY_BY_KEY: Record<string, Amenity> = Object.fromEntries(
  AMENITIES.map((a) => [a.key, a]),
);

export function getAmenity(key: string): Amenity | undefined {
  return AMENITY_BY_KEY[key];
}

export function amenityLabel(key: string, isAr: boolean): string {
  const a = AMENITY_BY_KEY[key];
  if (!a) return key;
  return isAr ? a.labelAr : a.labelEn;
}

// Keep only keys that exist in the canonical list — guards against stale or
// malformed data coming back from the API.
export function sanitizeAmenities(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return keys.filter((k): k is string => typeof k === "string" && k in AMENITY_BY_KEY);
}
