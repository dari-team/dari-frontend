// src/hooks/useSavedPlaces.ts
// Manages saved places (work, school, family, etc.) for commute time calculations

import { useState, useEffect, useCallback } from "react";

export type SavedPlace = {
  id: string;
  label: string;
  type: "work" | "school" | "gym" | "family" | "other";
  address: string;
  lat: number;
  lng: number;
  maxMinutes: number;
  color: string;
};

const STORAGE_KEY = "dari:savedPlaces";

const TYPE_COLORS: Record<SavedPlace["type"], string> = {
  work: "#3b82f6",    // blue
  school: "#22c55e",  // green
  gym: "#f59e0b",     // amber
  family: "#ec4899",  // pink
  other: "#8b5cf6",   // purple
};

// Distinct palette so multiple places always get unique colors regardless of type
export const LOCATION_PALETTE = [
  "#3b82f6", // blue
  "#ec4899", // pink
  "#22c55e", // green
  "#f97316", // orange
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ef4444", // red
  "#eab308", // yellow
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function loadPlaces(): SavedPlace[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePlaces(places: SavedPlace[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {}
}

export function useSavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>(loadPlaces);

  useEffect(() => {
    savePlaces(places);
  }, [places]);

  const addPlace = useCallback((
    data: Omit<SavedPlace, "id" | "color">
  ) => {
    setPlaces((prev) => {
      const color = LOCATION_PALETTE[prev.length % LOCATION_PALETTE.length];
      const newPlace: SavedPlace = { ...data, id: uid(), color };
      return [...prev, newPlace];
    });
  }, []);

  const removePlace = useCallback((id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePlace = useCallback((id: string, updates: Partial<SavedPlace>) => {
    setPlaces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const clearPlaces = useCallback(() => {
    setPlaces([]);
  }, []);

  return {
    places,
    addPlace,
    removePlace,
    updatePlace,
    clearPlaces,
    hasPlaces: places.length > 0,
  };
}

export { TYPE_COLORS };