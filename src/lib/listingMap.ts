// Map backend `ListingResponse` → frontend `Listing` shape used by Search/Map/Card.
// Backend uses integer enums + { address, images } subobjects; frontend uses
// lowercase string types + flat fields (beds/baths/sqft/city/area/lat/lng).

import type { ListingResponse, ApiPropertyType, ApiListingType } from "./api";
import type { Listing } from "../data/listings";
import type { LifestyleScoreResult } from "./lifestyleScore";
import { sanitizeAmenities } from "../data/amenities";

// Backend PropertyType enum (from Models/Enums.cs):
// Apartment=0, Villa=1, Townhouse=2, Studio=3
// (api.ts declares a wider range but the DB enum only has 4 — any new additions
// land here as "apartment" fallback so UI doesn't crash.)
const PROPERTY_TYPE_MAP: Record<number, Listing["propertyType"]> = {
  0: "apartment",
  1: "villa",
  2: "villa",       // Townhouse — closest match in the frontend union
  3: "studio",
  4: "penthouse",
  5: "apartment",   // Office — UI doesn't have a dedicated tile, fall back
  6: "apartment",   // Shop
  7: "apartment",   // Land
};

// Backend ListingType: ForSale=0 → "buy", ForRent=1 → "rent"
const LISTING_TYPE_MAP: Record<number, Listing["listingType"]> = {
  0: "buy",
  1: "rent",
};

function formatPrice(priceValue: number, listingType: Listing["listingType"]): string {
  const formatted = new Intl.NumberFormat("en-EG").format(priceValue);
  return listingType === "rent"
    ? `EGP ${formatted} / month`
    : `EGP ${formatted}`;
}

// `LifestyleScoreBreakdown` is stored as a JSON string on the backend.
// Safe-parse it into the shape the frontend expects (a full LifestyleScoreResult).
// Returns undefined if the payload is missing or malformed.
function parseLifestyleScore(
  score: number | null,
  breakdownJson: string | null,
  calculatedAt: string | null,
): LifestyleScoreResult | undefined {
  if (score == null || !breakdownJson) return undefined;
  try {
    const parsed = JSON.parse(breakdownJson);
    // breakdown is saved as a CategoryBreakdown; full LifestyleScoreResult also
    // needs distances + nearbyPlaces. If the stored JSON is already the full
    // result, trust it; otherwise wrap the breakdown with empty extras.
    if (parsed && typeof parsed === "object" && "breakdown" in parsed) {
      return parsed as LifestyleScoreResult;
    }
    return {
      score,
      breakdown: parsed,
      distances: { school: null, hospital: null, transport: null, market: null } as any,
      nearbyPlaces: [],
      calculatedAt: calculatedAt ?? new Date().toISOString(),
    };
  } catch {
    return undefined;
  }
}

export function mapListingResponse(r: ListingResponse): Listing {
  const listingType = LISTING_TYPE_MAP[r.listingType as ApiListingType] ?? "buy";
  const propertyType = PROPERTY_TYPE_MAP[r.propertyType as ApiPropertyType] ?? "apartment";
  const listingKind: Listing["listingKind"] = r.listingKind === 1 ? "commercial" : "residential";

  const city = r.address?.city ?? "";
  const area = r.address?.region ?? "";
  const location = [area, city].filter(Boolean).join(", ") || city;
  const street = r.address?.street ?? null;
  const streetAr = r.address?.streetAr ?? null;
  const streetLatin = r.address?.streetLatin ?? null;

  // Cover first, then the rest in sortOrder (already sorted by the backend DTO).
  const galleryUrls = r.images.map((i) => i.url);
  const images = r.coverImageUrl
    ? [r.coverImageUrl, ...galleryUrls.filter((u) => u !== r.coverImageUrl)]
    : galleryUrls;

  return {
    id: r.id,
    title: r.title,
    price: formatPrice(r.price, listingType),
    priceValue: r.price,
    beds: r.bedrooms,
    baths: r.bathrooms,
    sqft: Math.round(r.areaSize),
    location,
    city,
    area,
    street,
    streetAr,
    streetLatin,
    description: r.description ?? "",
    badge: r.isFeatured ? "Featured" : undefined,
    finishing: r.finishing ?? null,
    listingType,
    listingKind,
    propertyType,
    images,
    // Backend sends decimal → JSON number; coord fields are already numbers.
    lat: Number(r.address?.latitude ?? 0),
    lng: Number(r.address?.longitude ?? 0),
    lifestyleScore: parseLifestyleScore(
      r.lifestyleScore,
      r.lifestyleScoreBreakdown,
      r.lifestyleScoreCalculatedAt,
    ),
    amenities: sanitizeAmenities(r.amenities),
    paymentMethod: (r.paymentMethod ?? 0) as Listing["paymentMethod"],
    completionStatus: (r.completionStatus ?? null) as Listing["completionStatus"],
    referenceNumber: r.referenceNumber ?? 0,
    lister: r.lister
      ? {
          id: r.lister.id,
          name: r.lister.name,
          agencyName: r.lister.agencyName,
          phoneNumber: r.lister.phoneNumber,
          listerType: r.lister.listerType,
          isVerified: r.lister.isVerified,
        }
      : undefined,
  };
}

export function mapListingResponses(list: ListingResponse[]): Listing[] {
  return list.map(mapListingResponse);
}
