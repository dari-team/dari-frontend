// src/lib/googleMapsCache.ts
// Aggressive caching system to reduce Google Maps API calls by 70%+
//
// ═══════════════════════════════════════════════════════════════════════════════
// REFACTORED:
//   ✗ REMOVED — getCachedDistance()   (used DistanceMatrixService — $10/1K calls)
//   ✗ REMOVED — DISTANCE cache key   (no longer needed)
//   ✓ ADDED   — apiRequestWrapper    (structured logging + retry on all API calls)
//   ✓ ADDED   — in-flight dedup      (prevents duplicate concurrent requests)
//   ✓ KEPT    — 30-day geocode TTL   (addresses are permanent)
//   ✓ KEPT    — session token logic   (fixed: reset only on place selection)
// ═══════════════════════════════════════════════════════════════════════════════

import { apiRequestWrapper } from "./apiMonitor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = any;

declare global {
  interface Window {
    google: G;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHE STORAGE (localStorage with TTL)
// ══════════════════════════════════════════════════════════════════════════════

const CACHE_KEYS = {
  AUTOCOMPLETE: "dari:cache:autocomplete",
  PLACE_DETAILS: "dari:cache:placeDetails",
  GEOCODE: "dari:cache:geocode",
  // REMOVED: DISTANCE — no longer using Distance Matrix API
  LIFESTYLE: "dari:cache:lifestyle",
};

const CACHE_TTL = {
  AUTOCOMPLETE: 24 * 60 * 60 * 1000, // 24 hours
  PLACE_DETAILS: 7 * 24 * 60 * 60 * 1000, // 7 days (places don't change often)
  GEOCODE: 30 * 24 * 60 * 60 * 1000, // 30 days (addresses are permanent)
  LIFESTYLE: 30 * 24 * 60 * 60 * 1000, // 30 days
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

type CacheStore<T> = Record<string, CacheEntry<T>>;

function getCache<T>(key: string): CacheStore<T> {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setCache<T>(key: string, store: CacheStore<T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(store));
  } catch {
    // Storage full - clear old entries
    localStorage.removeItem(key);
  }
}

function getCacheEntry<T>(cacheKey: string, queryKey: string, ttl: number): T | null {
  const cache = getCache<T>(cacheKey);
  const entry = cache[queryKey];
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() - entry.timestamp > ttl) {
    delete cache[queryKey];
    setCache(cacheKey, cache);
    return null;
  }
  
  return entry.data;
}

function setCacheEntry<T>(cacheKey: string, queryKey: string, data: T): void {
  const cache = getCache<T>(cacheKey);
  
  // Limit cache size (keep max 500 entries)
  const keys = Object.keys(cache);
  if (keys.length > 500) {
    // Remove oldest 100 entries
    const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
    sorted.slice(0, 100).forEach((k) => delete cache[k]);
  }
  
  cache[queryKey] = { data, timestamp: Date.now() };
  setCache(cacheKey, cache);
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-FLIGHT REQUEST DEDUPLICATION
// Prevents duplicate concurrent requests for the same key
// ══════════════════════════════════════════════════════════════════════════════

const inflightRequests = new Map<string, Promise<any>>();

function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTOCOMPLETE WITH AGGRESSIVE OPTIMIZATION
// ══════════════════════════════════════════════════════════════════════════════

export type AutocompleteSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

// Session token for billing optimization (groups requests into one session)
// FIXED: Token is reused across keystrokes, reset ONLY after place selection
let currentSessionToken: G = null;

function getSessionToken(): G {
  // Create token lazily — reuse across entire search session
  if (!currentSessionToken && window.google?.maps?.places) {
    currentSessionToken = new window.google.maps.places.AutocompleteSessionToken();
  }
  return currentSessionToken;
}

// Reset session after place selection (important for billing!)
export function resetAutocompleteSession(): void {
  currentSessionToken = null;
}

// Pending request tracking to prevent duplicates
let pendingAutocompleteRequest: AbortController | null = null;

/**
 * Get autocomplete suggestions with aggressive caching
 * - Caches for 24 hours
 * - Uses session tokens (one per search session, reset on selection)
 * - Cancels previous pending requests
 * - Only calls API if query length >= 3
 * - 300ms debounce handled by PlacesAutocomplete component
 */
export async function getCachedAutocompleteSuggestions(
  query: string,
  country: string = "eg"
): Promise<AutocompleteSuggestion[]> {
  // Rule: Don't call API for short or empty queries
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length < 3) {
    return [];
  }

  const cacheKey = `${country}:${normalizedQuery}`;

  // Check cache first — ALWAYS before API call
  const cached = getCacheEntry<AutocompleteSuggestion[]>(
    CACHE_KEYS.AUTOCOMPLETE,
    cacheKey,
    CACHE_TTL.AUTOCOMPLETE
  );
  
  if (cached) {
    console.log("[Cache HIT] Autocomplete:", normalizedQuery);
    return cached;
  }

  // NOTE: Prefix cache match REMOVED — it was the root cause of suggestions
  // freezing after ~5 characters. When user typed "nasr c", the prefix match
  // returned cached results for "nasr" and never made a fresh API call.
  // Cache now only returns exact query matches, which is correct behavior.

  // Cancel any pending request
  if (pendingAutocompleteRequest) {
    pendingAutocompleteRequest.abort();
  }

  // Wait for Google Maps to load
  if (!window.google?.maps?.places) {
    let waited = 0;
    while (!window.google?.maps?.places && waited < 5000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
    }
    if (!window.google?.maps?.places) {
      console.error("[Autocomplete] Google Maps not loaded");
      return [];
    }
  }

  const controller = new AbortController();
  pendingAutocompleteRequest = controller;

  const result = await apiRequestWrapper(
    "Places.AutocompleteSession",
    () => new Promise<AutocompleteSuggestion[]>((resolve) => {
      const service = new window.google.maps.places.AutocompleteService();

      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country },
          sessionToken: getSessionToken(),
        },
        (predictions: G, status: string) => {
          // Check if request was cancelled
          if (controller.signal.aborted) {
            resolve([]);
            return;
          }

          pendingAutocompleteRequest = null;

          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !predictions
          ) {
            resolve([]);
            return;
          }

          const results: AutocompleteSuggestion[] = predictions.map((p: G) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting.main_text,
            secondaryText: p.structured_formatting.secondary_text || "",
          }));

          // Cache the results
          setCacheEntry(CACHE_KEYS.AUTOCOMPLETE, cacheKey, results);
          console.log("[Cache MISS] Autocomplete:", normalizedQuery, "- Cached now");

          resolve(results);
        }
      );
    }),
    { query: normalizedQuery.slice(0, 30), country }
  );

  return result ?? [];
}

// ══════════════════════════════════════════════════════════════════════════════
// PLACE DETAILS WITH PERMANENT CACHING
// ══════════════════════════════════════════════════════════════════════════════

export type PlaceDetails = {
  placeId: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  name?: string;
};

/**
 * Get place details with permanent caching (7 days)
 * Places don't change location, so we can cache aggressively
 * Deduplicates in-flight requests for the same placeId
 */
export async function getCachedPlaceDetails(
  placeId: string
): Promise<PlaceDetails | null> {
  // Check cache first — ALWAYS before API call
  const cached = getCacheEntry<PlaceDetails>(
    CACHE_KEYS.PLACE_DETAILS,
    placeId,
    CACHE_TTL.PLACE_DETAILS
  );

  if (cached) {
    console.log("[Cache HIT] Place details:", placeId);
    // Reset session after using cached place (billing optimization)
    resetAutocompleteSession();
    return cached;
  }

  if (!window.google?.maps?.places) {
    return null;
  }

  // Deduplicate concurrent requests for the same placeId
  return dedup(`placeDetails:${placeId}`, () =>
    apiRequestWrapper(
      "Places.GetDetails",
      () => new Promise<PlaceDetails | null>((resolve) => {
        const dummyDiv = document.createElement("div");
        const service = new window.google.maps.places.PlacesService(dummyDiv);

        service.getDetails(
          {
            placeId,
            // ONLY request necessary fields to reduce cost!
            fields: ["geometry", "formatted_address", "name"],
            sessionToken: getSessionToken(),
          },
          (place: G, status: string) => {
            // Reset session after place selection
            resetAutocompleteSession();

            if (
              status !== window.google.maps.places.PlacesServiceStatus.OK ||
              !place?.geometry?.location
            ) {
              resolve(null);
              return;
            }

            const result: PlaceDetails = {
              placeId,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              formattedAddress: place.formatted_address || "",
              name: place.name,
            };

            // Cache permanently (7 days)
            setCacheEntry(CACHE_KEYS.PLACE_DETAILS, placeId, result);
            console.log("[Cache MISS] Place details:", placeId, "- Cached now");

            resolve(result);
          }
        );
      }),
      { placeId }
    )
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GEOCODING WITH PERMANENT CACHING
// ══════════════════════════════════════════════════════════════════════════════

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

/**
 * Geocode address with 30-day cache
 * Addresses don't change, so we cache very aggressively
 * Only calls API when coordinates are genuinely missing
 * Deduplicates concurrent requests for the same address
 */
export async function getCachedGeocode(
  address: string
): Promise<GeocodeResult | null> {
  const normalizedAddress = address.toLowerCase().trim();

  // Guard: don't call API for empty or too-short addresses
  if (!normalizedAddress || normalizedAddress.length < 2) {
    return null;
  }

  // Check cache first — ALWAYS before API call
  const cached = getCacheEntry<GeocodeResult>(
    CACHE_KEYS.GEOCODE,
    normalizedAddress,
    CACHE_TTL.GEOCODE
  );

  if (cached) {
    console.log("[Cache HIT] Geocode:", normalizedAddress);
    return cached;
  }

  if (!window.google?.maps) {
    return null;
  }

  // Deduplicate concurrent requests for the same address
  return dedup(`geocode:${normalizedAddress}`, () =>
    apiRequestWrapper(
      "Geocoder.address",
      () => new Promise<GeocodeResult | null>((resolve) => {
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode(
          {
            address,
            componentRestrictions: { country: "eg" },
          },
          (results: G, status: string) => {
            if (
              status !== window.google.maps.GeocoderStatus.OK ||
              !results?.[0]?.geometry?.location
            ) {
              resolve(null);
              return;
            }

            const location = results[0].geometry.location;
            const result: GeocodeResult = {
              lat: location.lat(),
              lng: location.lng(),
              formattedAddress: results[0].formatted_address || address,
            };

            // Cache for 30 days
            setCacheEntry(CACHE_KEYS.GEOCODE, normalizedAddress, result);
            console.log("[Cache MISS] Geocode:", normalizedAddress, "- Cached now");

            resolve(result);
          }
        );
      }),
      { address: normalizedAddress.slice(0, 60) }
    )
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DISTANCE — NOW 100% LOCAL (Haversine)
// ══════════════════════════════════════════════════════════════════════════════
// The entire getCachedDistance() function has been REMOVED.
// All distance calculations now use the Haversine formula from ranking.ts.
// This eliminates the Distance Matrix API ($10 per 1,000 elements).
//
// For backward compatibility, import from ranking.ts:
//   import { calculateDistanceKm, estimateMinutesFromKm } from "./ranking";
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// LIFESTYLE SCORE CACHING
// ══════════════════════════════════════════════════════════════════════════════

import type { LifestyleScoreResult } from "./lifestyleScore";

/**
 * Get cached lifestyle score for a location
 * Cached for 30 days since nearby places don't change often
 * Validates that cached data matches current schema (school/hospital/market)
 */
export function getCachedLifestyleScore(
  lat: number,
  lng: number
): LifestyleScoreResult | null {
  // Round coordinates to increase cache hits (within ~100m)
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

  const cached = getCacheEntry<LifestyleScoreResult>(
    CACHE_KEYS.LIFESTYLE,
    cacheKey,
    CACHE_TTL.LIFESTYLE
  );

  if (cached) {
    // Validate breakdown has current 4-category schema — reject stale cache
    const keys = Object.keys(cached.breakdown ?? {});
    const required = ["school", "hospital", "transport", "market"];
    const hasGym = keys.includes("gym");
    if (!required.every((k) => keys.includes(k)) || hasGym || !cached.distances) {
      console.log("[Cache STALE] Lifestyle score has old schema, discarding:", cacheKey, keys);
      const store = getCache<LifestyleScoreResult>(CACHE_KEYS.LIFESTYLE);
      delete store[cacheKey];
      setCache(CACHE_KEYS.LIFESTYLE, store);
      return null;
    }
    console.log("[Cache HIT] Lifestyle score:", cacheKey);
    return cached;
  }

  return null;
}

/**
 * Cache lifestyle score for a location
 */
export function setCachedLifestyleScore(
  lat: number,
  lng: number,
  score: LifestyleScoreResult
): void {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  setCacheEntry(CACHE_KEYS.LIFESTYLE, cacheKey, score);
  console.log("[Cache SET] Lifestyle score:", cacheKey);
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY: Clear all caches (for debugging/admin)
// ══════════════════════════════════════════════════════════════════════════════

export function clearAllCaches(): void {
  Object.values(CACHE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
  // Also clear legacy distance cache if it exists
  localStorage.removeItem("dari:cache:distance");
  console.log("[Cache] All caches cleared");
}

export function getCacheStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  
  Object.entries(CACHE_KEYS).forEach(([name, key]) => {
    const cache = getCache<unknown>(key);
    stats[name] = Object.keys(cache).length;
  });
  
  return stats;
}