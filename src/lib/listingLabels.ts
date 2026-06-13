// Bilingual display helpers for listing fields that are stored as language-neutral
// enums/numbers (property type, price). The listing mapper bakes English-only
// strings (e.g. "EGP 75,000 / month"); these let the UI render the viewer's
// language at display time instead.

import type { Listing } from "../data/listings";
import { EGYPT_LOCATIONS } from "../data/egyptLocations";

// English (lowercased) → Arabic lookup for every governorate and sub-area.
const EN_TO_AR_PLACE: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const gov of EGYPT_LOCATIONS) {
    m.set(gov.en.toLowerCase(), gov.ar);
    for (const sa of gov.subAreas) m.set(sa.en.toLowerCase(), sa.ar);
  }
  return m;
})();

// Localizes a "Area, City" display string to Arabic. Each comma-separated part is
// looked up independently; unknown parts (or already-Arabic ones) are kept as-is.
export function localizeLocation(location: string, isAr: boolean): string {
  if (!isAr || !location) return location;
  return location
    .split(",")
    .map((part) => EN_TO_AR_PLACE.get(part.trim().toLowerCase()) ?? part.trim())
    .join("، ");
}

const PROPERTY_TYPE_LABELS: Record<string, [string, string]> = {
  apartment: ["Apartment", "شقة"],
  villa:     ["Villa", "فيلا"],
  studio:    ["Studio", "استوديو"],
  duplex:    ["Duplex", "دوبلكس"],
  penthouse: ["Penthouse", "بنتهاوس"],
  townhouse: ["Townhouse", "تاون هاوس"],
};

export function propertyTypeLabel(type: string, isAr: boolean): string {
  const entry = PROPERTY_TYPE_LABELS[type?.toLowerCase?.() ?? ""];
  if (entry) return entry[isAr ? 1 : 0];
  // Unknown type: title-case the raw value as a safe fallback.
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : type;
}

export function formatListingPrice(
  priceValue: number,
  listingType: Listing["listingType"],
  isAr: boolean,
): string {
  const formatted = new Intl.NumberFormat("en-EG").format(priceValue);
  if (listingType === "rent") {
    return isAr ? `EGP ${formatted} / شهر` : `EGP ${formatted} / month`;
  }
  return `EGP ${formatted}`;
}
