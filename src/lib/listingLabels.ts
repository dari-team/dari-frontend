// Bilingual display helpers for listing fields that are stored as language-neutral
// enums/numbers (property type, price). The listing mapper bakes English-only
// strings (e.g. "EGP 75,000 / month"); these let the UI render the viewer's
// language at display time instead.

import type { Listing } from "../data/listings";

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
