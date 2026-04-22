// src/lib/googleMaps.ts
// All Google Maps API calls go through the JavaScript SDK (loaded via <script> tag).
// This avoids CORS — fetch() calls to maps.googleapis.com are blocked by browsers.
// The Maps script must be loaded before calling any of these functions.
//
// ═══════════════════════════════════════════════════════════════════════════════
// REFACTORED:
//   ✗ REMOVED — getTravelMinutes()        (used DistanceMatrixService)
//   ✗ REMOVED — straightLineMinutes()     (replaced by Haversine in ranking.ts)
//   ✓ KEPT    — getPlaceSuggestions()      (wrapped with apiRequestWrapper)
//   ✓ KEPT    — geocodePlaceId()           (wrapped with apiRequestWrapper)
//   ✓ KEPT    — geocodeAddress()           (wrapped with apiRequestWrapper)
//   ✓ ADDED   — getLocalTravelMinutes()   (Haversine — zero API calls)
// ═══════════════════════════════════════════════════════════════════════════════

import { apiRequestWrapper } from "./apiMonitor";
import { calculateDistanceKm, estimateMinutesFromKm } from "./ranking";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initDariMap?: () => void;
    __dariNavigate?: (id: string) => void;
  }
}

// ── Wait for Maps SDK to be ready ─────────────────────────────────────────────
export function mapsReady(): boolean {
  return Boolean(window.google?.maps);
}

export function waitForMaps(): Promise<void> {
  if (mapsReady()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (mapsReady()) { clearInterval(interval); resolve(); }
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Google Maps SDK failed to load within 10s"));
    }, 10_000);
  });
}

// ── Places Autocomplete ───────────────────────────────────────────────────────
// Returns suggestions as the user types. Used in SearchBar, CommutePanel, ListProperty.
export async function getPlaceSuggestions(
  input: string,
  country = "eg"
): Promise<{ description: string; placeId: string }[]> {
  if (!input.trim()) return [];

  return apiRequestWrapper(
    "Places.Autocomplete",
    async () => {
      await waitForMaps();
      return new Promise<{ description: string; placeId: string }[]>((resolve) => {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input,
            componentRestrictions: { country },
            types: ["geocode", "establishment"],
          },
          (predictions: any[] | null, status: string) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
              resolve([]); return;
            }
            resolve(predictions.map((p) => ({ description: p.description, placeId: p.place_id })));
          }
        );
      });
    },
    { input: input.slice(0, 30), country }
  ).then((r) => r ?? []);
}

// ── Geocode a place ID → lat/lng ─────────────────────────────────────────────
// Used after user picks an autocomplete suggestion.
export async function geocodePlaceId(
  placeId: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  return apiRequestWrapper(
    "Geocoder.placeId",
    async () => {
      await waitForMaps();
      return new Promise<{ lat: number; lng: number; formattedAddress: string } | null>((resolve) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ placeId }, (results: any[], status: string) => {
          if (status !== "OK" || !results?.[0]) { resolve(null); return; }
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng(), formattedAddress: results[0].formatted_address });
        });
      });
    },
    { placeId }
  );
}

// ── Geocode a free-text address → lat/lng ────────────────────────────────────
// Fallback when placeId is not available.
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  return apiRequestWrapper(
    "Geocoder.address",
    async () => {
      await waitForMaps();
      return new Promise<{ lat: number; lng: number; formattedAddress: string } | null>((resolve) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { address: address + ", Egypt", region: "EG" },
          (results: any[], status: string) => {
            if (status !== "OK" || !results?.[0]) { resolve(null); return; }
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng(), formattedAddress: results[0].formatted_address });
          }
        );
      });
    },
    { address: address.slice(0, 60) }
  );
}

// ── Local distance & time (ZERO API calls) ──────────────────────────────────
// Replaces the removed Distance Matrix API.
// Re-exports from ranking.ts for backward compatibility.
export { calculateDistanceKm, estimateMinutesFromKm };

/**
 * Local travel time estimate — replaces getTravelMinutes().
 * Uses Haversine + Cairo-calibrated speed estimates.
 * ZERO Google API calls.
 */
export function getLocalTravelMinutes(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  mode: "driving" | "transit" | "walking" = "driving"
): number {
  const km = calculateDistanceKm(originLat, originLng, destLat, destLng);
  return estimateMinutesFromKm(km, mode);
}