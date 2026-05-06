// src/pages/Search.tsx
// Clean, optimized search page with single-row header

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import FiltersPanel from "../components/search/FiltersPanel";
import MapView from "../components/search/MapView";
import ResultsPanel from "../components/search/ResultsPanel";
import SavedPlacesPanel from "../components/search/SavedPlacesPanel";
import AISearchPanel, { type ParsedFilters } from "../components/search/AISearchPanel";
import VisualSearchPanel from "../components/search/VisualSearchPanel";
import CommuteSearchPanel, { type CommuteFilters } from "../components/search/CommuteSearchPanel";
import { getCachedGeocode } from "../lib/googleMapsCache";
import { useBackendListings } from "../hooks/useBackendListings";
import { useSavedPlaces, LOCATION_PALETTE } from "../hooks/useSavedPlaces";
import { isInBounds, getNearestListings, type MapBounds } from "../hooks/useMapState";
import { rankPropertiesMemoized, calculateDistanceKm, estimateMinutesFromKm } from "../lib/ranking";
import { mapListingResponses } from "../lib/listingMap";
import { toCanonicalEn } from "../data/egyptLocations";
import type { Listing } from "../data/listings";

// ── Types ─────────────────────────────────────────────────────────────────────
type Filters = {
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

type SearchState = {
  filters: Filters;
  sort: string;
  view: "split" | "map" | "list";
  favorites: string[];
};

type SearchMode = "text" | "ai" | "visual" | "commute";

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "dari:searchState";

const DEFAULT_FILTERS: Filters = {
  listingType: "buy",
  priceMin: 0,
  priceMax: 10_000_000,
  beds: 0,
  baths: 0,
  propertyType: "",
  city: "",
  finishing: "",
  listingKind: "",
};

const DEFAULT_STATE: SearchState = {
  filters: DEFAULT_FILTERS,
  sort: "newest",
  view: "split",
  favorites: [],
};

// Map governorate/district slug to city string used in listings
const SLUG_TO_CITY: Record<string, string> = {
  "cairo": "Cairo", "giza": "Giza", "alexandria": "Alexandria",
  "north-coast": "North Coast", "ain-sokhna": "Sokhna",
  "red-sea": "Red Sea", "south-sinai": "South Sinai",
  "new-cairo": "Cairo", "fifth-settlement": "Cairo", "nasr-city": "Cairo",
  "heliopolis": "Cairo", "maadi": "Cairo", "zamalek": "Cairo",
  "downtown": "Cairo", "rehab": "Cairo", "shorouk": "Cairo",
  "new-capital": "Cairo", "obour": "Cairo",
  "sheikh-zayed": "Giza", "6th-october": "Giza", "dokki": "Giza",
  "mohandessin": "Giza", "haram": "Giza", "hadayek-ahram": "Giza",
  "smouha": "Alexandria", "stanley": "Alexandria", "montazah": "Alexandria",
};

// Map slug to display name for geocoding
const SLUG_TO_NAME: Record<string, string> = {
  "cairo": "Cairo", "giza": "Giza", "alexandria": "Alexandria",
  "north-coast": "North Coast", "ain-sokhna": "Ain Sokhna",
  "red-sea": "Hurghada", "south-sinai": "Sharm El Sheikh",
  "new-cairo": "New Cairo", "fifth-settlement": "Fifth Settlement",
  "nasr-city": "Nasr City", "heliopolis": "Heliopolis",
  "maadi": "Maadi", "zamalek": "Zamalek", "downtown": "Downtown Cairo",
  "rehab": "Rehab City", "shorouk": "Shorouk City", "new-capital": "New Administrative Capital",
  "obour": "Obour City", "sheikh-zayed": "Sheikh Zayed City",
  "6th-october": "6th of October City", "dokki": "Dokki", "mohandessin": "Mohandessin",
  "haram": "Haram", "hadayek-ahram": "Hadayek El Ahram",
  "smouha": "Smouha", "stanley": "Stanley", "montazah": "Montazah",
};

// ── URL param keys ────────────────────────────────────────────────────────────
const P = {
  type: "type", priceMin: "min", priceMax: "max",
  beds: "beds", baths: "baths", propType: "prop",
  city: "city", sort: "sort", view: "view", q: "q",
  finishing: "fin", listingKind: "kind",
} as const;

function filtersToParams(filters: Filters, sort: string, view: string, textSearch: string): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.listingType !== DEFAULT_FILTERS.listingType) p.set(P.type, filters.listingType);
  if (filters.priceMin > DEFAULT_FILTERS.priceMin) p.set(P.priceMin, String(filters.priceMin));
  if (filters.priceMax < DEFAULT_FILTERS.priceMax) p.set(P.priceMax, String(filters.priceMax));
  if (filters.beds > 0) p.set(P.beds, String(filters.beds));
  if (filters.baths > 0) p.set(P.baths, String(filters.baths));
  if (filters.propertyType) p.set(P.propType, filters.propertyType);
  if (filters.city) p.set(P.city, filters.city);
  if (filters.finishing) p.set(P.finishing, filters.finishing);
  if (filters.listingKind) p.set(P.listingKind, filters.listingKind);
  if (textSearch) p.set(P.q, textSearch);
  if (sort !== DEFAULT_STATE.sort) p.set(P.sort, sort);
  if (view !== DEFAULT_STATE.view) p.set(P.view, view);
  return p;
}

function paramsToState(params: URLSearchParams): { filters: Filters; sort: string; view: SearchState["view"]; textSearch: string; areaSlug: string } {
  const toInt = (key: string, fallback: number) => {
    const n = parseInt(params.get(key) ?? "", 10);
    return isNaN(n) ? fallback : n;
  };
  const rawView = params.get(P.view);
  const view: SearchState["view"] =
    rawView === "map" || rawView === "list" || rawView === "split" ? rawView : DEFAULT_STATE.view;
  const rawType = params.get(P.type);
  const areaSlug = params.get(P.city) ?? "";
  const cityFromSlug = toCanonicalEn(areaSlug) || SLUG_TO_CITY[areaSlug] || areaSlug;
  
  return {
    filters: {
      listingType: rawType === "rent" ? "rent" : "buy",
      priceMin: toInt(P.priceMin, DEFAULT_FILTERS.priceMin),
      priceMax: toInt(P.priceMax, DEFAULT_FILTERS.priceMax),
      beds: toInt(P.beds, DEFAULT_FILTERS.beds),
      baths: toInt(P.baths, DEFAULT_FILTERS.baths),
      propertyType: params.get(P.propType) ?? DEFAULT_FILTERS.propertyType,
      city: cityFromSlug,
      finishing: params.get(P.finishing) ?? DEFAULT_FILTERS.finishing,
      listingKind: params.get(P.listingKind) ?? DEFAULT_FILTERS.listingKind,
    },
    sort: params.get(P.sort) ?? DEFAULT_STATE.sort,
    view,
    textSearch: params.get(P.q) ?? "",
    areaSlug,
  };
}

function loadFavorites(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<SearchState>;
    return Array.isArray(parsed.favorites) ? parsed.favorites : [];
  } catch { return []; }
}

function saveFavorites(favorites: string[]) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, favorites }));
  } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Search() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [searchParams, setSearchParams] = useSearchParams();
  const { filters: urlFilters, sort: urlSort, view: urlView, textSearch: urlTextSearch, areaSlug } = paramsToState(searchParams);

  const [filters, setFiltersRaw] = useState<Filters>(urlFilters);
  const [sort, setSortRaw] = useState(urlSort);
  const [view, setViewRaw] = useState<SearchState["view"]>(urlView);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [textSearch, setTextSearch] = useState(urlTextSearch);

  // Real listings from backend (/api/Listing/filter), debounced on filter change.
  const { listings: filterListings, loading: listingsLoading, error: listingsError } = useBackendListings(filters);

  // Special search modes
  const [searchMode, setSearchMode] = useState<SearchMode>("text");
  const [aiFilters, setAiFilters] = useState<ParsedFilters | null>(null);
  // When AI search is active, render its FTS-ranked listings directly (preserves
  // street-match ordering that /Filter would lose).
  const [aiListings, setAiListings] = useState<Listing[] | null>(null);
  const listings = aiListings ?? filterListings;
  const [commuteFilters, setCommuteFilters] = useState<CommuteFilters | null>(null);
  const [openPanel, setOpenPanel] = useState<SearchMode | null>(null);
  const [aiSummary, setAiSummary] = useState("");

  // Auth gating for AI / Visual / Commute search modes
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toggleAuthedPanel = useCallback(
    (mode: "ai" | "visual" | "commute") => {
      if (!isAuthenticated) {
        navigate("/login", { state: { from: location.pathname + location.search } });
        return;
      }
      setOpenPanel((prev) => (prev === mode ? null : mode));
    },
    [isAuthenticated, navigate, location.pathname, location.search],
  );

  // Map state
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [showSavedPlacesPanel, setShowSavedPlacesPanel] = useState(false);
  
  // City coordinates for map centering (timestamp forces re-trigger for same location)
  const [selectedCityCoords, setSelectedCityCoords] = useState<{lat: number; lng: number; _t?: number} | null>(null);

  // Real commute times from Google Distance Matrix
  const [commuteMinutes, setCommuteMinutes] = useState<Map<string, Map<string, number>>>(new Map());

  // Saved places hook
  const { places: savedPlaces, addPlace, removePlace, updatePlace, hasPlaces } = useSavedPlaces();
  
  const panelRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const hasGeocodedInitial = useRef(false);

  // Geocode area from URL params on initial load
  useEffect(() => {
    if (hasGeocodedInitial.current || !areaSlug) return;
    hasGeocodedInitial.current = true;
    
    const areaName = SLUG_TO_NAME[areaSlug] || areaSlug;
    const searchQuery = `${areaName}, Egypt`;
    
    getCachedGeocode(searchQuery).then((result) => {
      if (result) {
        setSelectedCityCoords({ lat: result.lat, lng: result.lng });
      }
    });
  }, [areaSlug]);

  // Sync URL params (skip first render)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSearchParams(filtersToParams(filters, sort, view, textSearch), { replace: true });
  }, [filters, sort, view, textSearch, setSearchParams]);

  useEffect(() => { saveFavorites(favorites); }, [favorites]);
  
  // Close panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpenPanel(null);
    }
    if (openPanel) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openPanel]);

  const setFilters = (f: Filters) => setFiltersRaw(f);
  const setSort = (s: string) => setSortRaw(s);
  const setView = (v: SearchState["view"]) => setViewRaw(v);
  const resetFilters = () => {
    setFiltersRaw(DEFAULT_FILTERS);
    setAiFilters(null);
    setAiListings(null);
    setCommuteFilters(null);
    setSearchMode("text");
    setTextSearch("");
    setAiSummary("");
    setSelectedCityCoords(null);
  };

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);

  // ── Handle city selection from FiltersPanel ─────────────────────────────────
  const handleCitySelect = useCallback((coords: { lat: number; lng: number } | null) => {
    setSelectedCityCoords(coords ? { ...coords, _t: Date.now() } : null);
  }, []);

  // ── Handle AI/Visual search results ─────────────────────────────────────────
  function handleAISearch(parsed: ParsedFilters) {
    setSearchMode("ai");
    setAiFilters(parsed);
    setAiSummary(parsed.naturalSummary);
    setOpenPanel(null);
    if (parsed.aiListings && parsed.aiListings.length > 0) {
      setAiListings(mapListingResponses(parsed.aiListings));
    } else {
      setAiListings([]);
    }
    setFiltersRaw((prev) => ({
      ...prev,
      listingType: (parsed.listingType as "buy" | "rent") ?? prev.listingType,
      priceMin: parsed.priceMin ?? prev.priceMin,
      priceMax: parsed.priceMax ?? prev.priceMax,
      beds: parsed.beds ?? prev.beds,
      baths: parsed.baths ?? prev.baths,
      propertyType: parsed.propertyType ?? prev.propertyType,
      city: parsed.city ?? prev.city,
    }));
  }

  // Leaving AI mode → fall back to /Filter results.
  useEffect(() => {
    if (searchMode !== "ai") setAiListings(null);
  }, [searchMode]);

  // ── Handle Commute search ────────────────────────────────────────────────────
  function handleCommuteSearch(cf: CommuteFilters) {
    setSearchMode("commute");
    setCommuteFilters(cf);
    setCommuteMinutes(new Map());
    setOpenPanel(null);
  }

  // ── Commute times via Haversine (instant, no API) ───────────────────────────
  // REFACTORED: Uses shared calculateDistanceKm + estimateMinutesFromKm from ranking.ts
  useEffect(() => {
    if (searchMode !== "commute" || !commuteFilters || commuteFilters.locations.length === 0) {
      setCommuteMinutes(new Map());
      return;
    }

    const readyLocs = commuteFilters.locations.filter((l) => l.lat !== null && l.lng !== null);
    if (readyLocs.length === 0) return;

    const mode = commuteFilters.mode;
    const allListings = listings.filter((l) => l.lat && l.lng);
    const results = new Map<string, Map<string, number>>();

    for (const listing of allListings) {
      const timesForListing = new Map<string, number>();
      for (const loc of readyLocs) {
        const km = calculateDistanceKm(listing.lat, listing.lng, loc.lat!, loc.lng!);
        const mins = estimateMinutesFromKm(km, mode);
        timesForListing.set(loc.id, mins);
      }
      results.set(listing.id, timesForListing);
    }

    setCommuteMinutes(results);
  }, [commuteFilters, searchMode]);

  // ── Calculate commute times for saved places ──────────────────────────────────
  const [savedPlaceMinutes, setSavedPlaceMinutes] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (savedPlaces.length === 0 || searchMode === "commute") {
      setSavedPlaceMinutes(new Map());
      return;
    }

    const visibleListings = mapBounds
      ? listings.filter((l) => l.lat && l.lng && isInBounds(l, mapBounds)).slice(0, 20)
      : listings.filter((l) => l.lat && l.lng).slice(0, 20);

    // REFACTORED: Uses shared calculateDistanceKm from ranking.ts
    function calcCommuteTimes() {
      const results = new Map<string, number>();

      for (const listing of visibleListings) {
        let minMinutes = Infinity;

        for (const place of savedPlaces) {
          if (place.lat == null || place.lng == null) continue;
          const km = calculateDistanceKm(listing.lat, listing.lng, place.lat, place.lng);
          const mins = estimateMinutesFromKm(km, "driving");
          minMinutes = Math.min(minMinutes, mins);
        }

        if (minMinutes !== Infinity) results.set(listing.id, minMinutes);
      }

      setSavedPlaceMinutes(results);
    }

    calcCommuteTimes();
  }, [savedPlaces, searchMode, mapBounds]);

  // ── Filtered + sorted listings ───────────────────────────────────────────────
  const filteredListings = useMemo(() => {
    let data = listings.filter((item) => {
      if (item.listingType !== filters.listingType) return false;
      if (item.priceValue < filters.priceMin) return false;
      if (item.priceValue > filters.priceMax) return false;
      if (filters.beds > 0 && item.beds < filters.beds) return false;
      if (filters.baths > 0 && item.baths < filters.baths) return false;
      if (filters.propertyType !== "" && item.propertyType !== filters.propertyType) return false;
      if (filters.city !== "" && item.city !== filters.city) return false;
      if (filters.finishing !== "" && (item as any).finishing !== filters.finishing) return false;
      if (filters.listingKind !== "" && item.listingKind !== filters.listingKind) return false;

      if (textSearch.trim()) {
        const q = textSearch.toLowerCase();
        const haystack = `${item.title} ${item.city} ${item.area} ${item.location} ${item.propertyType}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (searchMode === "commute" && commuteFilters && commuteFilters.locations.length > 0) {
        if (!item.lat || !item.lng) return false;

        if (commuteMinutes.size > 0) {
          const timesForListing = commuteMinutes.get(item.id);
          if (!timesForListing) return false;
          
          const readyLocs = commuteFilters.locations.filter(l => l.lat !== null && l.lng !== null);
          if (readyLocs.length === 0) return false;
          const totalMins = readyLocs.reduce((sum, loc) => sum + (timesForListing.get(loc.id) ?? 9999), 0);
          const avgMins = totalMins / readyLocs.length;
          const avgMax = readyLocs.reduce((sum, loc) => sum + loc.maxMinutes, 0) / readyLocs.length;
          if (avgMins > avgMax) return false;
        } else {
          return true;
        }
      }

      return true;
    });

    // ── Sorting logic ────────────────────────────────────────────────────────
    // Priority: commute ranking (if active) > "nearest" sort > user sort
    // When commute mode has >= 2 locations, ranking is the ONLY ordering.

    const isCommuteRanking = searchMode === "commute" && commuteMinutes.size > 0
      && commuteFilters && commuteFilters.locations.length >= 2;

    if (isCommuteRanking) {
      // Commute ranking overrides ALL other sorts
      const locList = commuteFilters!.locations.filter((l) => l.lat !== null);
      data = [...data].sort((a, b) => {
        const timesA = commuteMinutes.get(a.id);
        const timesB = commuteMinutes.get(b.id);
        const scoreA = timesA ? locList.reduce((s, loc) => s + (timesA.get(loc.id) ?? 999) / Math.max(loc.maxMinutes, 1), 0) : Infinity;
        const scoreB = timesB ? locList.reduce((s, loc) => s + (timesB.get(loc.id) ?? 999) / Math.max(loc.maxMinutes, 1), 0) : Infinity;
        return scoreA - scoreB;
      });
    } else if (sort === "nearest" && savedPlaces.length > 0) {
      // Weighted multi-location ranking via rankProperties
      const ranked = rankPropertiesMemoized(
        data.filter((l) => l.lat && l.lng).map((l) => ({ id: l.id, lat: l.lat, lng: l.lng })),
        savedPlaces.map((p) => ({ lat: p.lat, lng: p.lng, weight: 1, label: p.label, id: p.id })),
        data.length
      );
      const rankMap = new Map(ranked.map((r) => [r.id, r.rank]));
      data = [...data].sort((a, b) => {
        const rankA = rankMap.get(a.id) ?? Infinity;
        const rankB = rankMap.get(b.id) ?? Infinity;
        return rankA - rankB;
      });
    } else {
      // Standard user-selected sort
      if (sort === "priceLow") data = [...data].sort((a, b) => a.priceValue - b.priceValue);
      else if (sort === "priceHigh") data = [...data].sort((a, b) => b.priceValue - a.priceValue);
      // Backend already returns listings in roughly insertion order; preserve it
      // as "newest" since ids are Guids (no numeric comparison).
      else data = [...data];
    }

    return data;
  }, [listings, filters, sort, textSearch, searchMode, commuteFilters, commuteMinutes, savedPlaces]);

  // ── Simple single-number commute minutes (for map pins) ──────────────────────
  const commuteMinutesDisplay = useMemo(() => {
    const result = new Map<string, number>();
    commuteMinutes.forEach((timesMap, listingId) => {
      const vals: number[] = [];
      timesMap.forEach((mins) => { if (mins > 0) vals.push(mins); });
      if (vals.length > 0) {
        result.set(listingId, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
      }
    });
    return result;
  }, [commuteMinutes]);

  // ── Commute score = sum of (actual / max) ratios, lower is better ─────────────
  const commuteRanks = useMemo<Map<string, number>>(() => {
    if (!commuteFilters || commuteMinutes.size === 0) return new Map();
    const locList = commuteFilters.locations.filter((l) => l.lat !== null);
    if (locList.length === 0) return new Map();
    const scores: { id: string; score: number }[] = [];
    commuteMinutes.forEach((timesMap, listingId) => {
      const score = locList.reduce((sum, loc) => {
        const mins = timesMap.get(loc.id) ?? 999;
        return sum + mins / Math.max(loc.maxMinutes, 1);
      }, 0);
      scores.push({ id: listingId, score });
    });
    scores.sort((a, b) => a.score - b.score);
    const ranks = new Map<string, number>();
    scores.slice(0, 20).forEach(({ id }, i) => ranks.set(id, i + 1));
    return ranks;
  }, [commuteMinutes, commuteFilters]);

  // ── Commute locations array for MapView (stable reference) ──────────────────
  const commuteLocationsForMap = useMemo(() => {
    if (searchMode !== "commute" || !commuteFilters) return undefined;
    return commuteFilters.locations
      .filter(l => l.lat !== null)
      .map((loc, idx) => ({
        id: loc.id,
        label: loc.label,
        color: LOCATION_PALETTE[idx % LOCATION_PALETTE.length],
      }));
  }, [searchMode, commuteFilters]);
  // Each location gets a unique palette color based on its index
  const commuteLocationsAsSavedPlaces = useMemo(() => {
    if (searchMode !== "commute" || !commuteFilters) return savedPlaces;
    return commuteFilters.locations
      .filter((l) => l.lat !== null && l.lng !== null)
      .map((loc, idx) => ({
        id: loc.id,
        label: loc.label,
        type: loc.type,
        address: loc.address,
        lat: loc.lat as number,
        lng: loc.lng as number,
        maxMinutes: loc.maxMinutes,
        color: LOCATION_PALETTE[idx % LOCATION_PALETTE.length],
      }));
  }, [searchMode, commuteFilters, savedPlaces]);

  // ── Per-listing distances to saved places (outside commute mode) ─────────────
  // Provides the same Map<listingId, Map<placeId, minutes>> shape that commute mode uses
  // so ResultsPanel can display distance badges for saved places too
  const savedPlaceTimesPerListing = useMemo(() => {
    if (savedPlaces.length === 0 || searchMode === "commute") return undefined;
    const result = new Map<string, Map<string, number>>();
    const relevantListings = filteredListings.filter((l) => l.lat && l.lng);
    for (const listing of relevantListings) {
      const times = new Map<string, number>();
      for (const place of savedPlaces) {
        if (place.lat == null || place.lng == null) continue;
        const km = calculateDistanceKm(listing.lat, listing.lng, place.lat, place.lng);
        times.set(place.id, estimateMinutesFromKm(km, "driving"));
      }
      result.set(listing.id, times);
    }
    return result;
  }, [filteredListings, savedPlaces, searchMode]);

  // Location metadata for ResultsPanel display (color + label per saved place)
  const savedPlaceLocationsForPanel = useMemo(() => {
    if (savedPlaces.length === 0 || searchMode === "commute") return undefined;
    return savedPlaces.map((p, idx) => ({
      id: p.id,
      label: p.label,
      color: LOCATION_PALETTE[idx % LOCATION_PALETTE.length],
    }));
  }, [savedPlaces, searchMode]);

  // Single-number average minutes per listing for saved places (used as MapView fallback)
  // Computed from the same raw data as savedPlaceTimesPerListing → avg, NOT min
  const savedPlaceMinutesAvg = useMemo(() => {
    if (!savedPlaceTimesPerListing) return new Map<string, number>();
    const result = new Map<string, number>();
    savedPlaceTimesPerListing.forEach((timesMap, listingId) => {
      const vals: number[] = [];
      timesMap.forEach((mins) => { if (mins > 0) vals.push(mins); });
      if (vals.length > 0) {
        result.set(listingId, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
      }
    });
    return result;
  }, [savedPlaceTimesPerListing]);

  const activeFilterCount = [
    filters.priceMin > 0,
    filters.priceMax < (filters.listingType === "rent" ? 200_000 : 10_000_000),
    filters.beds > 0,
    filters.baths > 0,
    filters.propertyType !== "",
    filters.city !== "",
  ].filter(Boolean).length;

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)", background: "var(--bg)", color: "var(--text)" }}>

      {/* ═══ HEADER - Single clean row ═══ */}
      <div className="relative z-20 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="px-4 py-2.5 flex items-center justify-between gap-3" ref={panelRef}>
          
          {/* LEFT: Filters + Search Tools */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Rent / Buy toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              {([{ value: "buy" as const, label: isAr ? "شراء" : "Buy", color: "#06b6d4" }, { value: "rent" as const, label: isAr ? "إيجار" : "Rent", color: "#10b981" }]).map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => {
                    const isRent = value === "rent";
                    setFilters({
                      ...filters,
                      listingType: value,
                      priceMin: 0,
                      priceMax: isRent ? 200_000 : 10_000_000,
                    });
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition"
                  style={{
                    background: filters.listingType === value ? color : "transparent",
                    color: filters.listingType === value ? "white" : "var(--text-muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Standard Filters */}
            <FiltersPanel
              filters={filters}
              setFilters={setFilters}
              onCitySelect={handleCitySelect}
            />

            {/* Divider */}
            <div className="h-6 w-px mx-1" style={{ background: "var(--border)" }} />

            {/* AI Search Tools - Compact buttons */}
            <div className="flex items-center gap-1.5">
              {/* AI Search */}
              <button
                onClick={() => toggleAuthedPanel("ai")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  searchMode === "ai" ? "bg-cyan-500/15 text-cyan-500 border-cyan-500/50" : ""
                }`}
                style={searchMode !== "ai" ? { background: "var(--surface2)", color: "var(--text-muted)" } : { border: "1px solid" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="hidden sm:inline">{isAr ? "ذكي" : "AI"}</span>
              </button>

              {/* Visual Search */}
              <button
                onClick={() => toggleAuthedPanel("visual")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  searchMode === "visual" ? "bg-violet-500/15 text-violet-500 border-violet-500/50" : ""
                }`}
                style={searchMode !== "visual" ? { background: "var(--surface2)", color: "var(--text-muted)" } : { border: "1px solid" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">{isAr ? "صورة" : "Image"}</span>
              </button>

              {/* Commute Search */}
              <button
                onClick={() => toggleAuthedPanel("commute")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  searchMode === "commute" ? "bg-amber-500/15 text-amber-500 border-amber-500/50" : ""
                }`}
                style={searchMode !== "commute" ? { background: "var(--surface2)", color: "var(--text-muted)" } : { border: "1px solid" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">{isAr ? "تنقل" : "Commute"}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px mx-1" style={{ background: "var(--border)" }} />

            {/* My Places */}
            <button
              onClick={() => setShowSavedPlacesPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                background: hasPlaces ? "rgba(59,130,246,0.1)" : "var(--surface2)",
                color: hasPlaces ? "#3b82f6" : "var(--text-muted)",
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isAr ? "أماكني" : "Places"}
              {hasPlaces && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold bg-blue-500 text-white">
                  {savedPlaces.length}
                </span>
              )}
            </button>

            {/* Reset - only show if filters active */}
            {(activeFilterCount > 0 || searchMode !== "text") && (
              <button 
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {isAr ? "مسح" : "Clear"}
              </button>
            )}

            {/* Results count */}
            <span className="text-xs px-2" style={{ color: "var(--text-faint)" }}>
              {filteredListings.length} {isAr ? "نتيجة" : "results"}
            </span>
          </div>

          {/* RIGHT: View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--surface2)" }}>
            {(["split", "map", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition"
                style={{
                  background: view === v ? "var(--accent)" : "transparent",
                  color: view === v ? "var(--accent-text)" : "var(--text-muted)",
                }}
              >
                {v === "split" ? (isAr ? "مزدوج" : "Split") : v === "map" ? (isAr ? "خريطة" : "Map") : (isAr ? "قائمة" : "List")}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown panels */}
        {openPanel && (
          <div className={`absolute top-full mt-2 z-50 rounded-2xl p-5 animate-fadeIn ${openPanel === "ai" ? "start-4 w-full max-w-2xl" : "start-4 end-4"}`}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            {openPanel === "ai" && <AISearchPanel onResults={handleAISearch} onClose={() => setOpenPanel(null)} />}
            {openPanel === "visual" && <VisualSearchPanel onResults={handleAISearch} onClose={() => setOpenPanel(null)} />}
            {openPanel === "commute" && <CommuteSearchPanel 
              onApply={handleCommuteSearch}    
              onClose={() => setOpenPanel(null)}
              savedPlaces={savedPlaces.map(p => ({ ...p, lat: p.lat, lng: p.lng }))}
              onAddPlace={(loc) => addPlace({
                type: loc.type,
                label: loc.label,
                address: loc.address,
                lat: loc.lat!,
                lng: loc.lng!,
                maxMinutes: loc.maxMinutes,
              })}
              onRemovePlace={removePlace}
              onUpdatePlace={(id, maxMinutes) => updatePlace(id, { maxMinutes })}
            />}
          </div>
        )}
      </div>

      {/* AI mode banner */}
      {searchMode === "ai" && aiFilters && (
        <div
          className="px-4 py-2.5 flex items-center gap-3 text-xs"
          style={{
            borderBottom: "1px solid var(--accent)",
            background: "linear-gradient(90deg, var(--accent-light) 0%, var(--surface) 60%)",
          }}
        >
          <span style={{ color: "var(--accent)", fontSize: 14 }}>✨</span>
          <span className="font-bold" style={{ color: "var(--accent-text)" }}>
            {isAr ? "البحث الذكي نشط" : "AI Search Active"}
          </span>
          {aiSummary && (
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              · {aiSummary}
            </span>
          )}
          <div className="ms-auto flex items-center gap-2">
            <button
              onClick={() => setOpenPanel("ai")}
              className="rounded-md px-2 py-1 text-xs transition"
              style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "transparent" }}
            >
              ↺ {isAr ? "تعديل" : "Refine"}
            </button>
            <button
              onClick={() => {
                setSearchMode("text");
                setAiFilters(null);
                setAiSummary("");
                setAiListings(null);
              }}
              className="rounded-md px-2 py-1 text-xs transition"
              style={{ border: "1px solid var(--border)", color: "var(--text-muted)", background: "transparent" }}
            >
              ✕ {isAr ? "مسح" : "Clear"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ CONTENT ═══ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Map */}
        <div className={`${view === "split" ? "w-[60%]" : "w-full"} h-full`}
          style={{ display: view === "list" ? "none" : "block" }}>
          <MapView
            listings={filteredListings}
            hoveredId={hoveredId}
            savedPlaces={commuteLocationsAsSavedPlaces}
            showNearestBadges={true}
            showCommuteZones={true}
            showSavedPlaces={true}
            commuteMinutes={searchMode === "commute" ? commuteMinutesDisplay : savedPlaceMinutesAvg}
            commuteMinutesRaw={searchMode === "commute" ? commuteMinutes : savedPlaceTimesPerListing}
            commuteLocations={searchMode === "commute" ? commuteLocationsForMap : savedPlaceLocationsForPanel}
            commuteRanks={searchMode === "commute" ? commuteRanks : undefined}
            onBoundsChange={handleBoundsChange}
            onMarkerHover={setHoveredId}
            centerOn={selectedCityCoords}
          />
        </div>

        {/* Results */}
        {(view === "split" || view === "list") && (
          <div className={`${view === "split" ? "w-[40%]" : "w-full"} h-full min-h-0 overflow-hidden`}
            style={view === "split" ? { borderInlineStart: "1px solid var(--border)" } : {}}>
            
            {/* Loading indicator for commute */}
            {searchMode === "commute" && commuteFilters && commuteMinutes.size === 0 && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs"
                style={{ borderBottom: "1px solid var(--border)", background: "rgba(245,158,11,0.08)", color: "#f59e0b" }}>
                <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin flex-shrink-0"
                  style={{ borderColor: "rgba(245,158,11,0.3)", borderTopColor: "#f59e0b" }} />
                {isAr ? "جارٍ حساب أوقات التنقل..." : "Calculating commute times..."}
              </div>
            )}

            {filteredListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-16 px-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  🔍
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {isAr ? "لا توجد نتائج" : "No results found"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {isAr ? "جرب تغيير الفلاتر" : "Try adjusting your filters"}
                  </p>
                </div>
                <button onClick={resetFilters} className="rounded-xl px-4 py-2 text-xs font-medium transition"
                  style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                  {isAr ? "إعادة الفلاتر" : "Reset filters"}
                </button>
              </div>
            ) : (
              <ResultsPanel
                listings={filteredListings}
                sort={sort}
                setSort={setSort}
                view={view}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onHoverListing={setHoveredId}
                commuteTimesPerListing={searchMode === "commute" ? commuteMinutes : savedPlaceTimesPerListing}
                commuteLocations={searchMode === "commute" ? commuteLocationsForMap : savedPlaceLocationsForPanel}
                commuteRanks={searchMode === "commute" ? commuteRanks : undefined}
                hasSavedPlaces={hasPlaces}
              />
            )}
          </div>
        )}
      </div>

      {/* Saved Places Modal */}
      {showSavedPlacesPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowSavedPlacesPanel(false); }}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: "var(--surface)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <SavedPlacesPanel
              places={savedPlaces}
              onAddPlace={addPlace}
              onRemovePlace={removePlace}
              onUpdatePlace={updatePlace}
              onClose={() => setShowSavedPlacesPanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}