// Fetches listings from the backend filter endpoint, maps to frontend shape.
// Separate from useMapState — this owns network state (loading/error/data).

import { useEffect, useRef, useState } from "react";
import {
  listingApi,
  PropertyTypeEnum,
  ListingTypeEnum,
  ListingKindEnum,
  type ListingFilterParams,
  type ApiPropertyType,
  type ApiListingKind,
} from "../lib/api";
import { mapListingResponses } from "../lib/listingMap";
import type { Listing } from "../data/listings";

// Frontend filter shape → backend ListingFilterParams.
// `propertyType` is the lowercase string used in Search ("apartment" | "villa" | ...).
// `listingType` is "buy" | "rent".
export type UiFilters = {
  listingType: "buy" | "rent";
  priceMin: number;
  priceMax: number;
  beds: number;
  baths: number;
  propertyType: string;
  city: string;
  finishing: string;
  listingKind: string; // "" | "residential" | "commercial"
};

// Case-insensitive lookup — Filter's values come from PROPERTY_TYPES pills.
function propertyTypeToEnum(v: string): ApiPropertyType | null {
  if (!v) return null;
  const key = (v.charAt(0).toUpperCase() + v.slice(1)) as keyof typeof PropertyTypeEnum;
  const n = PropertyTypeEnum[key];
  return (typeof n === "number" ? n : null) as ApiPropertyType | null;
}

function toParams(f: UiFilters, absMax: number): ListingFilterParams {
  return {
    listingType: f.listingType === "rent" ? ListingTypeEnum.Rent : ListingTypeEnum.Sale,
    // Only send bounds that the user actually set — backend treats null as "no bound".
    minPrice: f.priceMin > 0 ? f.priceMin : null,
    maxPrice: f.priceMax < absMax ? f.priceMax : null,
    bedrooms: f.beds > 0 ? f.beds : null,
    bathrooms: f.baths > 0 ? f.baths : null,
    propertyType: propertyTypeToEnum(f.propertyType),
    // The UI uses a free-form city string; backend does exact match on address.city
    // OR address.region. Send as `city` — "City not found" collapses to empty list,
    // which is the honest answer.
    city: f.city || null,
    finishing: f.finishing || null,
    listingKind: f.listingKind === "residential"
      ? ListingKindEnum.Residential as ApiListingKind
      : f.listingKind === "commercial"
        ? ListingKindEnum.Commercial as ApiListingKind
        : null,
  };
}

export function useBackendListings(filters: UiFilters) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Debounce identical filter changes so slider drags / type-ahead don't storm
  // the backend. 300ms is fine for humans.
  const reqSeq = useRef(0);

  useEffect(() => {
    const myReq = ++reqSeq.current;
    setLoading(true);
    setError(null);

    const absMax = filters.listingType === "rent" ? 200_000 : 30_000_000;
    const params = toParams(filters, absMax);

    const handle = setTimeout(() => {
      listingApi
        .filter(params)
        .then((res) => {
          if (reqSeq.current !== myReq) return; // stale
          setListings(mapListingResponses(res.data));
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (reqSeq.current !== myReq) return;
          setError(err instanceof Error ? err.message : "Failed to load listings.");
          setListings([]);
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(handle);
  }, [
    filters.listingType,
    filters.priceMin,
    filters.priceMax,
    filters.beds,
    filters.baths,
    filters.propertyType,
    filters.city,
    filters.finishing,
    filters.listingKind,
  ]);

  return { listings, loading, error };
}
