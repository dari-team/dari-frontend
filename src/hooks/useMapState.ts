// src/hooks/useMapState.ts
// Manages map viewport, clustering, and viewport-based filtering

import { useState, useCallback, useRef, useEffect } from "react";
import type { Listing } from "../data/listings";
import type { SavedPlace } from "./useSavedPlaces";

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type MapState = {
  center: { lat: number; lng: number };
  zoom: number;
  bounds: MapBounds | null;
  isDarkMode: boolean;
  isDrawMode: boolean;
  drawArea: { lat: number; lng: number; radius: number } | null;
  showNearestBadges: boolean;
  showCommuteZones: boolean;
  showSavedPlaces: boolean;
};

const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 }; // Cairo
const DEFAULT_ZOOM = 11;

// Calculate distance between two points (Haversine formula)
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate average distance from a listing to all saved places
export function getAverageDistanceToPlaces(
  listing: Listing,
  places: SavedPlace[]
): number {
  if (places.length === 0) return Infinity;
  const distances = places.map((place) =>
    haversineDistance(listing.lat, listing.lng, place.lat, place.lng)
  );
  return distances.reduce((sum, d) => sum + d, 0) / distances.length;
}

// Get the nearest N listings to saved places
export function getNearestListings(
  listings: Listing[],
  places: SavedPlace[],
  count: number = 20
): Map<string, number> {
  if (places.length === 0) return new Map();

  const withDistance = listings
    .filter((l) => l.lat && l.lng)
    .map((listing) => ({
      id: listing.id,
      avgDistance: getAverageDistanceToPlaces(listing, places),
    }))
    .sort((a, b) => a.avgDistance - b.avgDistance)
    .slice(0, count);

  return new Map(withDistance.map((item, index) => [item.id, index + 1]));
}

// Check if a listing is within the map bounds
export function isInBounds(listing: Listing, bounds: MapBounds | null): boolean {
  if (!bounds) return true;
  return (
    listing.lat >= bounds.south &&
    listing.lat <= bounds.north &&
    listing.lng >= bounds.west &&
    listing.lng <= bounds.east
  );
}

// Check if a listing is within a drawn circle
export function isInDrawArea(
  listing: Listing,
  drawArea: { lat: number; lng: number; radius: number } | null
): boolean {
  if (!drawArea) return true;
  const distance = haversineDistance(
    listing.lat, listing.lng,
    drawArea.lat, drawArea.lng
  );
  return distance <= drawArea.radius;
}

export function useMapState() {
  const [state, setState] = useState<MapState>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bounds: null,
    isDarkMode: document.documentElement.classList.contains("dark"),
    isDrawMode: false,
    drawArea: null,
    showNearestBadges: true,
    showCommuteZones: true,
    showSavedPlaces: true,
  });

  const debounceRef = useRef<number | null>(null);

  const updateBounds = useCallback((bounds: MapBounds) => {
    // Debounce bounds updates
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setState((prev) => ({ ...prev, bounds }));
    }, 300);
  }, []);

  const setCenter = useCallback((center: { lat: number; lng: number }) => {
    setState((prev) => ({ ...prev, center }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setState((prev) => ({ ...prev, isDarkMode: !prev.isDarkMode }));
  }, []);

  const toggleDrawMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDrawMode: !prev.isDrawMode,
      drawArea: prev.isDrawMode ? null : prev.drawArea, // Clear draw area when exiting
    }));
  }, []);

  const setDrawArea = useCallback((area: { lat: number; lng: number; radius: number } | null) => {
    setState((prev) => ({ ...prev, drawArea: area, isDrawMode: false }));
  }, []);

  const clearDrawArea = useCallback(() => {
    setState((prev) => ({ ...prev, drawArea: null }));
  }, []);

  const toggleNearestBadges = useCallback(() => {
    setState((prev) => ({ ...prev, showNearestBadges: !prev.showNearestBadges }));
  }, []);

  const toggleCommuteZones = useCallback(() => {
    setState((prev) => ({ ...prev, showCommuteZones: !prev.showCommuteZones }));
  }, []);

  const toggleSavedPlaces = useCallback(() => {
    setState((prev) => ({ ...prev, showSavedPlaces: !prev.showSavedPlaces }));
  }, []);

  // Detect current location
  const detectLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setState((prev) => ({ ...prev, center: coords }));
          resolve(coords);
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    ...state,
    updateBounds,
    setCenter,
    setZoom,
    toggleDarkMode,
    toggleDrawMode,
    setDrawArea,
    clearDrawArea,
    toggleNearestBadges,
    toggleCommuteZones,
    toggleSavedPlaces,
    detectLocation,
  };
}