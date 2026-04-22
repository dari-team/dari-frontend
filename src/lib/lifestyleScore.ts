// src/lib/lifestyleScore.ts
// Lifestyle & Convenience Score — 4 categories (school, hospital, transport, market), 3 grouped API requests, radius 2000m

import { getCachedLifestyleScore, setCachedLifestyleScore } from "./googleMapsCache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = any;

declare global {
  interface Window {
    google: G;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type NearbyPlace = {
  name: string;
  type: string;
  distance: number; // meters
  icon: string;
};

export type CategoryBreakdown = {
  school: number;    // 0–5
  hospital: number;  // 0–5
  transport: number; // 0–5
  market: number;    // 0–5
};

export type CategoryDistances = {
  school: number | null;    // meters, null = not found
  hospital: number | null;
  transport: number | null;
  market: number | null;
};

export type LifestyleScoreResult = {
  score: number; // 0–10 with one decimal
  breakdown: CategoryBreakdown;
  distances: CategoryDistances;
  nearbyPlaces: NearbyPlace[];
  calculatedAt: string;
};

// ── Categories ────────────────────────────────────────────────────────────────

type Category = "school" | "hospital" | "transport" | "market";

const ALL_CATEGORIES: Category[] = ["school", "hospital", "transport", "market"];

const CATEGORY_MATCHERS: { category: Category; match: (types: string[]) => boolean; icon: string }[] = [
  {
    category: "school",
    match: (types) => types.some((t) => t.includes("school") || t.includes("university")),
    icon: "🏫",
  },
  {
    category: "hospital",
    match: (types) => types.some((t) => t.includes("hospital") || t.includes("clinic")),
    icon: "🏥",
  },
  {
    category: "transport",
    match: (types) => types.some((t) => t.includes("station") || t.includes("transit")),
    icon: "🚇",
  },
  {
    category: "market",
    match: (types) => types.some((t) => t.includes("supermarket") || t.includes("grocery")),
    icon: "🛒",
  },
];

// ── Scoring ───────────────────────────────────────────────────────────────────

function distanceToScore(distanceKm: number): number {
  if (distanceKm <= 0.5) return 5;
  if (distanceKm <= 1.0) return 4;
  if (distanceKm <= 1.5) return 3;
  if (distanceKm <= 2.0) return 2;
  return 0;
}

const WEIGHTS: Record<Category, number> = {
  school: 3,
  hospital: 2,
  transport: 2,
  market: 2,
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((s, w) => s + w, 0); // 9

// ── Haversine ─────────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Maps SDK ──────────────────────────────────────────────────────────────────

function waitForMaps(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps?.places) { resolve(); return; }
    const check = setInterval(() => {
      if (window.google?.maps?.places) { clearInterval(check); resolve(); }
    }, 100);
    setTimeout(() => { clearInterval(check); resolve(); }, 10_000);
  });
}

function nearbySearchPromise(service: G, location: G, type: string): Promise<G[]> {
  return new Promise((resolve) => {
    service.nearbySearch(
      { location, radius: 2000, type },
      (results: G, status: string) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          resolve([]);
        }
      }
    );
  });
}

// ── Process results ───────────────────────────────────────────────────────────

function processResults(
  lat: number,
  lng: number,
  allPlaces: G[]
): { breakdown: CategoryBreakdown; distances: CategoryDistances; score: number; nearbyPlaces: NearbyPlace[] } {

  const nearest: Record<Category, { dist: number; name: string }> = {
    school:    { dist: Infinity, name: "" },
    hospital:  { dist: Infinity, name: "" },
    transport: { dist: Infinity, name: "" },
    market:    { dist: Infinity, name: "" },
  };

  const nearbyPlaces: NearbyPlace[] = [];

  for (const place of allPlaces) {
    if (!place.geometry?.location || !place.types || !place.name) continue;

    const pLat = place.geometry.location.lat();
    const pLng = place.geometry.location.lng();
    const dist = haversineMeters(lat, lng, pLat, pLng);

    for (const { category, match, icon } of CATEGORY_MATCHERS) {
      if (match(place.types)) {
        if (dist < nearest[category].dist) {
          nearest[category] = { dist, name: place.name };
        }
        const count = nearbyPlaces.filter((p) => p.type === category).length;
        if (count < 3) {
          nearbyPlaces.push({ name: place.name, type: category, distance: Math.round(dist), icon });
        }
        // no break — a place can match multiple categories
      }
    }
  }

  // Build breakdown (0–5 raw) and distances (meters)
  const breakdown: CategoryBreakdown = { school: 0, hospital: 0, transport: 0, market: 0 };
  const distances: CategoryDistances = { school: null, hospital: null, transport: null, market: null };

  let weightedTotal = 0;
  for (const cat of ALL_CATEGORIES) {
    const distM = nearest[cat].dist;
    if (distM !== Infinity) {
      distances[cat] = Math.round(distM);
      const distKm = distM / 1000;
      const raw = distanceToScore(distKm);
      breakdown[cat] = raw;
      weightedTotal += raw * WEIGHTS[cat];
    }
    // If Infinity: breakdown stays 0, distances stays null
  }

  const maxPossible = 5 * TOTAL_WEIGHT || 1;
  const score = Math.min(10, Math.max(0, Math.round((weightedTotal / maxPossible) * 100) / 10));

  nearbyPlaces.sort((a, b) => a.distance - b.distance);

  // Debug
  console.log(`[Lifestyle] ${allPlaces.length} places processed:`);
  for (const cat of ALL_CATEGORIES) {
    const n = nearest[cat];
    console.log(`  ${cat}: ${n.dist === Infinity ? "not found" : `${n.name} (${Math.round(n.dist)}m) → ${breakdown[cat]}/5`}`);
  }

  return { breakdown, distances, score, nearbyPlaces };
}

// ── Public: pure scoring (no API) ─────────────────────────────────────────────

export function lifestyleScoreOutOf10(
  propertyLat: number,
  propertyLng: number,
  amenities: { lat: number; lng: number; types: string[]; name: string }[]
): number {
  const nearest: Record<Category, number> = {
    school: Infinity, hospital: Infinity, transport: Infinity, market: Infinity,
  };

  for (const amenity of amenities) {
    const dist = haversineMeters(propertyLat, propertyLng, amenity.lat, amenity.lng);
    for (const { category, match } of CATEGORY_MATCHERS) {
      if (match(amenity.types) && dist < nearest[category]) {
        nearest[category] = dist;
      }
    }
  }

  let weightedTotal = 0;
  for (const cat of ALL_CATEGORIES) {
    const distKm = nearest[cat] === Infinity ? Infinity : nearest[cat] / 1000;
    weightedTotal += distanceToScore(distKm) * WEIGHTS[cat];
  }

  const maxPossible = 5 * TOTAL_WEIGHT || 1;
  return Math.min(10, Math.max(0, Math.round((weightedTotal / maxPossible) * 100) / 10));
}

// ── Public: full calculation — 3 grouped requests ─────────────────────────────
/**
 * 3 grouped API requests, radius 2000m:
 *   Group A: "school"          → schools, universities
 *   Group B: "transit_station" → metro, bus, train stations
 *   Group C: "supermarket"     → supermarkets, groceries
 * Hospital is matched from the above results via types.
 * Results deduplicated by place_id.
 */
export async function calculateLifestyleScore(
  lat: number,
  lng: number
): Promise<LifestyleScoreResult> {
  const cached = getCachedLifestyleScore(lat, lng);
  if (cached) {
    console.log("[Lifestyle] Cache HIT:", lat.toFixed(3), lng.toFixed(3));
    return cached;
  }

  await waitForMaps();

  const location = new window.google.maps.LatLng(lat, lng);
  const dummyDiv = document.createElement("div");
  const service = new window.google.maps.places.PlacesService(dummyDiv);

  // 3 grouped requests
  const [groupA, groupB, groupC] = await Promise.all([
    nearbySearchPromise(service, location, "school"),          // school + hospital
    nearbySearchPromise(service, location, "transit_station"),  // transport
    nearbySearchPromise(service, location, "supermarket"),      // market
  ]);

  // Merge and deduplicate
  const combined = [...groupA, ...groupB, ...groupC];
  const uniquePlaces = Array.from(
    new Map(combined.filter((p) => p.place_id).map((p) => [p.place_id, p])).values()
  );

  console.log(`[Lifestyle] 3 requests: A=${groupA.length} B=${groupB.length} C=${groupC.length} → ${uniquePlaces.length} unique`);

  const { breakdown, distances, score, nearbyPlaces } = processResults(lat, lng, uniquePlaces);

  const result: LifestyleScoreResult = {
    score,
    breakdown,
    distances,
    nearbyPlaces: nearbyPlaces.slice(0, 15),
    calculatedAt: new Date().toISOString(),
  };

  setCachedLifestyleScore(lat, lng, result);
  console.log("[Lifestyle] Score:", score, "/10");

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getScoreLabel(score: number): { label: string; labelAr: string; color: string } {
  if (score >= 8) return { label: "Excellent", labelAr: "ممتاز", color: "#22c55e" };
  if (score >= 6) return { label: "Very Good", labelAr: "جيد جداً", color: "#84cc16" };
  if (score >= 4) return { label: "Good", labelAr: "جيد", color: "#f59e0b" };
  if (score >= 2) return { label: "Fair", labelAr: "مقبول", color: "#f97316" };
  return { label: "Limited", labelAr: "محدود", color: "#ef4444" };
}

export function getCategoryLabel(category: keyof CategoryBreakdown): { label: string; labelAr: string; icon: string } {
  const labels: Record<keyof CategoryBreakdown, { label: string; labelAr: string; icon: string }> = {
    school:    { label: "Schools",    labelAr: "المدارس",     icon: "🏫" },
    hospital:  { label: "Hospitals",  labelAr: "المستشفيات",  icon: "🏥" },
    transport: { label: "Transport",  labelAr: "المواصلات",   icon: "🚇" },
    market:    { label: "Markets",    labelAr: "الأسواق",     icon: "🛒" },
  };
  return labels[category];
}
