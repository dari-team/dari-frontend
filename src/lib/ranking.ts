// src/lib/ranking.ts
// Multi-location weighted ranking system for properties.
// Uses ONLY local Haversine calculations — zero Google API calls.

// ── Types ─────────────────────────────────────────────────────────────────────

export type Location = { lat: number; lng: number };

export type WeightedLocation = Location & {
  weight?: number; // default: 1 (equal weight)
  label?: string;
  id?: string;
};

export type RankedProperty = {
  id: string;
  distances: number[]; // km to each location
  rawScore: number; // weighted sum of distances
  normalizedScore: number; // 0–1 score for consistency
  rank: number; // 1-based rank
};

// ── Haversine distance (km) ───────────────────────────────────────────────────

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Estimated travel minutes from distance ────────────────────────────────────

export function estimateMinutesFromKm(
  distanceKm: number,
  mode: "driving" | "walking" | "transit" = "driving"
): number {
  // Cairo-calibrated average speeds
  const speeds: Record<string, number> = {
    driving: 25, // km/h (heavy traffic)
    walking: 5,
    transit: 20,
  };
  return Math.ceil((distanceKm / speeds[mode]) * 60);
}

// ── Ranking engine ────────────────────────────────────────────────────────────

/**
 * Ranks properties by weighted distance to multiple favorite locations.
 *
 * score = w1*d1 + w2*d2 + ... + wn*dn
 *
 * - Default: equal weights (1.0 each)
 * - Lower score = closer to all locations = better rank
 * - Returns ONLY top `limit` properties (default 20)
 * - Normalizes scores to 0–1 range for consistent UI display
 *
 * @example
 * ```ts
 * const ranked = rankProperties(
 *   properties.map(p => ({ id: p.id, lat: p.lat, lng: p.lng })),
 *   [
 *     { lat: 30.05, lng: 31.23, weight: 2, label: "Work" },
 *     { lat: 30.01, lng: 31.40, weight: 1, label: "Gym" },
 *   ]
 * );
 * ```
 */
export function rankProperties(
  properties: { id: string; lat: number; lng: number }[],
  locations: WeightedLocation[],
  limit = 20
): RankedProperty[] {
  if (locations.length === 0 || properties.length === 0) return [];

  // Normalize weights: default to 1 if not specified
  const weights = locations.map((l) => l.weight ?? 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;

  // Calculate scores for all properties
  const scored = properties.map((prop) => {
    const distances = locations.map((loc) =>
      calculateDistanceKm(prop.lat, prop.lng, loc.lat, loc.lng)
    );

    const rawScore = distances.reduce(
      (sum, dist, i) => sum + (weights[i] / totalWeight) * dist,
      0
    );

    return { id: prop.id, distances, rawScore, normalizedScore: 0, rank: 0 };
  });

  // Sort ascending by score (lower = better)
  scored.sort((a, b) => a.rawScore - b.rawScore);

  // Normalize scores to 0–1 range
  const minScore = scored[0]?.rawScore ?? 0;
  const maxScore = scored[scored.length - 1]?.rawScore ?? 1;
  const range = maxScore - minScore || 1;

  const topN = scored.slice(0, limit);

  return topN.map((item, index) => ({
    ...item,
    normalizedScore: (item.rawScore - minScore) / range,
    rank: index + 1,
  }));
}

// ── Memoization cache ─────────────────────────────────────────────────────────

type RankCacheKey = string;
const rankCache = new Map<RankCacheKey, { result: RankedProperty[]; ts: number }>();
const RANK_CACHE_TTL = 5000; // 5 seconds — enough to avoid recalc during re-renders

function buildCacheKey(
  propertyIds: number[],
  locations: WeightedLocation[]
): RankCacheKey {
  const propHash = propertyIds.slice(0, 5).join(",") + ":" + propertyIds.length;
  const locHash = locations
    .map((l) => `${l.lat.toFixed(4)},${l.lng.toFixed(4)},${l.weight ?? 1}`)
    .join("|");
  return `${propHash}__${locHash}`;
}

/**
 * Memoized version of rankProperties.
 * Avoids recalculation when inputs haven't changed (within TTL).
 */
export function rankPropertiesMemoized(
  properties: { id: string; lat: number; lng: number }[],
  locations: WeightedLocation[],
  limit = 20
): RankedProperty[] {
  const key = buildCacheKey(
    properties.map((p) => p.id),
    locations
  );
  const cached = rankCache.get(key);

  if (cached && Date.now() - cached.ts < RANK_CACHE_TTL) {
    return cached.result;
  }

  const result = rankProperties(properties, locations, limit);

  // Evict old entries if cache is large
  if (rankCache.size > 50) {
    const now = Date.now();
    for (const [k, v] of rankCache) {
      if (now - v.ts > RANK_CACHE_TTL) rankCache.delete(k);
    }
  }

  rankCache.set(key, { result, ts: Date.now() });
  return result;
}