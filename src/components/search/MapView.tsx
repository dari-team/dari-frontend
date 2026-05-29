// src/components/search/MapView.tsx
// Enhanced map with clustering, commute zones, nearest listings, draw area, and centerOn support

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Listing } from "../../data/listings";
import type { SavedPlace } from "../../hooks/useSavedPlaces";
import { getNearestListings, type MapBounds } from "../../hooks/useMapState";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = any;

declare global {
  interface Window {
    google: G;
    initDariMap?: () => void;
    __dariNavigate?: (id: string) => void;
  }
}

type CommuteEntry = { locId: string; label: string; minutes: number; color: string };

type Props = {
  listings: Listing[];
  hoveredId?: number | null;
  savedPlaces?: SavedPlace[];
  showNearestBadges?: boolean;
  showCommuteZones?: boolean;
  showSavedPlaces?: boolean;
  commuteMinutes?: Map<string, number>;
  // Raw per-location times: listingId → Map<locId, minutes>
  commuteMinutesRaw?: Map<string, Map<string, number>>;
  // Ordered location metadata for colors/labels
  commuteLocations?: { id: string; label: string; color: string }[];
  commuteRanks?: Map<string, number>;
  onBoundsChange?: (bounds: MapBounds) => void;
  onMarkerHover?: (id: string | null) => void;
  centerOn?: { lat: number; lng: number } | null;
};

// ── Price label formatter ──────────────────────────────────────────────────────
function pinLabel(price: number, type: string): string {
  if (type === "rent") return price >= 1000 ? `${(price / 1000).toFixed(0)}K` : `${price}`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${(price / 1_000).toFixed(0)}K`;
  return String(price);
}

// ── SVG price pin ──────────────────────────────────────────────────────────────
function pinSvg(
  label: string,
  fill: string,
  rank?: number,
  isHovered?: boolean,
  commuteTimes?: CommuteEntry[],
): string {
  const w = Math.max(56, label.length * 8 + 20);
  const h = 32;
  const scale = isHovered ? 1.15 : 1;
  const shadow = isHovered ? 4 : 2;
  const showRank = rank !== undefined && rank <= 20;

  // Build per-location time labels below the pin — show all entries
  const times = commuteTimes ?? [];
  const timeRowH = times.length > 0 ? times.length * 14 + 4 : 0;
  const totalH = h + 14 + timeRowH; // pin + tail + time rows

  const rankBadge = showRank
    ? `<circle cx="${w - 4}" cy="8" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
       <text x="${w - 4}" y="12" font-family="system-ui,sans-serif" font-size="9" font-weight="700" fill="white" text-anchor="middle">${rank}</text>`
    : "";

  const nearestRing = showRank
    ? `<circle cx="${w / 2 + 6}" cy="${h / 2 + 4}" r="${h / 2 + 8}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4 2" opacity="0.9"/>`
    : "";

  // Stack each location time on its own line with its color
  const timeLabels = times.map((ct, i) => {
    const y = h + 16 + i * 14;
    const display = ct.minutes > 0 ? `${ct.minutes}min` : "…";
    return `<text x="${w / 2 + 6}" y="${y}" font-family="system-ui,sans-serif" font-size="10" fill="${ct.color}" text-anchor="middle" font-weight="700">${display}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 20}" height="${totalH + 4}" viewBox="0 0 ${w + 20} ${totalH + 4}">
    <defs><filter id="sh${rank || 0}"><feDropShadow dx="0" dy="${shadow}" stdDeviation="${shadow}" flood-opacity="0.25"/></filter></defs>
    <g transform="scale(${scale}) translate(${(1 - scale) * (w + 20) / 2}, ${(1 - scale) * (totalH + 4) / 2})">
      ${nearestRing}
      <rect x="6" y="4" width="${w}" height="${h}" rx="${h / 2}" ry="${h / 2}" fill="${fill}" stroke="white" stroke-width="2" filter="url(#sh${rank || 0})"/>
      <text x="${w / 2 + 6}" y="${h / 2 + 6}" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="white" text-anchor="middle">${label}</text>
      <polygon points="${w / 2 + 2},${h + 4} ${w / 2 + 10},${h + 4} ${w / 2 + 6},${h + 12}" fill="${fill}"/>
      ${rankBadge}
      ${timeLabels}
    </g>
  </svg>`;
}

function pinIcon(label: string, fill: string, rank?: number, isHovered?: boolean, commuteTimes?: CommuteEntry[]) {
  const w = Math.max(56, label.length * 8 + 20);
  const times = commuteTimes ?? [];
  const timeRowH = times.length > 0 ? times.length * 14 + 4 : 0;
  const totalH = 32 + 14 + timeRowH;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg(label, fill, rank, isHovered, commuteTimes)),
    anchor: new window.google.maps.Point((w + 20) / 2, 44),
    scaledSize: new window.google.maps.Size(w + 20, totalH + 4),
  };
}

function pinColor(isRent: boolean, isDark: boolean): string {
  return isDark ? (isRent ? "#10b981" : "#06b6d4") : (isRent ? "#16a34a" : "#1B5E87");
}

// ── Cluster icon ───────────────────────────────────────────────────────────────
function clusterSvg(count: number, isDark: boolean): string {
  const size = Math.min(60, 30 + count * 2);
  const bgColor = isDark ? "#3b82f6" : "#1B5E87";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${bgColor}" stroke="white" stroke-width="3"/>
    <text x="${size/2}" y="${size/2 + 5}" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="white" text-anchor="middle">${count}</text>
  </svg>`;
}

// ── Saved place marker SVG ─────────────────────────────────────────────────────
function savedPlaceSvg(label: string, color: string, icon: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">
    <defs><filter id="plsh"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter></defs>
    <path d="M24 52C24 52 42 34 42 20C42 10.059 33.941 2 24 2C14.059 2 6 10.059 6 20C6 34 24 52 24 52Z" fill="${color}" stroke="white" stroke-width="2" filter="url(#plsh)"/>
    <circle cx="24" cy="20" r="12" fill="white"/>
    <text x="24" y="24" font-family="system-ui,sans-serif" font-size="14" text-anchor="middle">${icon}</text>
  </svg>`;
}

// ── Dark map style ─────────────────────────────────────────────────────────────
const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2e2e4e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212140" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const PLACE_ICONS: Record<string, string> = { work: "💼", school: "🏫", gym: "🏋️", family: "❤️", other: "📍" };

// ── Component ──────────────────────────────────────────────────────────────────
export default function MapView({
  listings,
  hoveredId,
  savedPlaces = [],
  showNearestBadges = true,
  showCommuteZones = true,
  showSavedPlaces = true,
  commuteMinutes,
  commuteMinutesRaw,
  commuteLocations,
  commuteRanks,
  onBoundsChange,
  onMarkerHover,
  centerOn,
}: Props) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<G>(null);
  const markersRef = useRef<Map<string, G>>(new Map());
  const clusterMarkersRef = useRef<G[]>([]);
  const savedPlaceMarkersRef = useRef<Map<string, G>>(new Map());
  const commuteCirclesRef = useRef<Map<string, G>>(new Map());
  const infoWindowRef = useRef<G>(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));
  const [isLocating, setIsLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const nearestRankings = useMemo(() => {
    if (!showNearestBadges || savedPlaces.length === 0) return new Map<string, number>();
    return getNearestListings(listings, savedPlaces, 20);
  }, [listings, savedPlaces, showNearestBadges]);

  // ── Initialize map ───────────────────────────────────────────────────────────
  // REFACTORED: Removed isDark from deps to prevent map re-creation on theme toggle.
  // Theme changes are handled by the separate setOptions effect below.
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstance.current) return;

    // With loading=async, window.google.maps can exist before the enums
    // (e.g. ControlPosition) are populated. Wait until they're ready.
    if (!window.google?.maps?.ControlPosition) {
      window.setTimeout(initMap, 50);
      return;
    }

    const currentIsDark = document.documentElement.classList.contains("dark");

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 30.0444, lng: 31.2357 },
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: { position: window.google.maps.ControlPosition.LEFT_BOTTOM },
      styles: currentIsDark ? DARK_STYLE : [],
      gestureHandling: "greedy",
    });

    infoWindowRef.current = new window.google.maps.InfoWindow();

    let boundsTimeout: number;
    mapInstance.current.addListener("bounds_changed", () => {
      clearTimeout(boundsTimeout);
      boundsTimeout = window.setTimeout(() => {
        const bounds = mapInstance.current?.getBounds();
        if (bounds && onBoundsChange) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          onBoundsChange({ north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() });
        }
      }, 300);
    });

    setMapReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBoundsChange]);

  // ── Load Maps script ─────────────────────────────────────────────────────────
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;

    if (window.google?.maps) {
      initMap();
      return;
    }

    if (document.getElementById("dari-gmaps")) {
      window.initDariMap = initMap;
      return;
    }

    window.initDariMap = initMap;
    const s = document.createElement("script");
    s.id = "dari-gmaps";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initDariMap&libraries=places&loading=async`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, [initMap]);

  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setOptions({ styles: isDark ? DARK_STYLE : [] });
  }, [isDark]);

  // ── Center on location when centerOn changes ────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps || !centerOn) return;

    // Pan to location and zoom in
    mapInstance.current.setCenter(centerOn);
    mapInstance.current.setZoom(14);
  }, [centerOn]);

  // ── Simple grid-based clustering ─────────────────────────────────────────────
  const clusteredData = useMemo(() => {
    if (listings.length === 0) return { singles: [], clusters: [] };
    
    const zoom = mapInstance.current?.getZoom() || 11;
    const gridSize = 0.02 / Math.pow(2, zoom - 10); // Adaptive grid size
    
    const grid = new Map<string, Listing[]>();
    
    listings.forEach(listing => {
      const gridX = Math.floor(listing.lng / gridSize);
      const gridY = Math.floor(listing.lat / gridSize);
      const key = `${gridX},${gridY}`;
      
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(listing);
    });
    
    const singles: Listing[] = [];
    const clusters: { lat: number; lng: number; count: number; listings: Listing[] }[] = [];
    
    grid.forEach((items) => {
      if (items.length === 1) {
        singles.push(items[0]);
      } else if (items.length > 1) {
        const avgLat = items.reduce((s, l) => s + l.lat, 0) / items.length;
        const avgLng = items.reduce((s, l) => s + l.lng, 0) / items.length;
        clusters.push({ lat: avgLat, lng: avgLng, count: items.length, listings: items });
      }
    });
    
    return { singles, clusters };
  }, [listings]);

  // ── Sync markers ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps) return;

    const map = mapInstance.current;
    const current = markersRef.current;
    
    // Clear old cluster markers
    clusterMarkersRef.current.forEach(m => m.setMap(null));
    clusterMarkersRef.current = [];

    // Remove old listing markers
    const newIds = new Set(clusteredData.singles.map((l) => l.id));
    current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        marker.setMap(null);
        current.delete(id);
      }
    });

    // Add/update single markers
    clusteredData.singles.forEach((listing) => {
      const label = pinLabel(listing.priceValue, listing.listingType);
      const isRent = listing.listingType === "rent";
      const rank = nearestRankings.get(listing.id);
      const commuteRank = commuteRanks?.get(listing.id);
      const effectiveRank = commuteRank ?? (showNearestBadges ? rank : undefined);
      const isHovered = listing.id === hoveredId;
      const fill = isHovered ? "#f59e0b" : pinColor(isRent, isDark);

      // Show single average commute time on pin
      let commuteTimes: CommuteEntry[] | undefined;
      if (commuteMinutesRaw && commuteLocations && commuteLocations.length > 0) {
        const rawMap = commuteMinutesRaw.get(listing.id);
        if (rawMap) {
          const vals = commuteLocations.map(loc => rawMap.get(loc.id) ?? 0).filter(m => m > 0);
          if (vals.length > 0) {
            const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
            const col = avg <= 15 ? "#10b981" : avg <= 30 ? "#f59e0b" : "#ef4444";
            commuteTimes = [{ locId: "avg", label: "", minutes: avg, color: col }];
          }
        }
      } else {
        const minutes = commuteMinutes?.get(listing.id);
        if (minutes !== undefined) {
          const col = minutes <= 15 ? "#10b981" : minutes <= 30 ? "#f59e0b" : "#ef4444";
          commuteTimes = [{ locId: "single", label: "", minutes, color: col }];
        }
      }

      const icon = pinIcon(label, fill, effectiveRank, isHovered, commuteTimes);

      if (current.has(listing.id)) {
        const marker = current.get(listing.id);
        marker.setIcon(icon);
        marker.setZIndex(isHovered ? 9999 : rank ? 1000 - rank : 1);
        return;
      }

      const marker = new window.google.maps.Marker({
        position: { lat: listing.lat, lng: listing.lng },
        map,
        icon,
        title: listing.title,
        optimized: false,
        zIndex: rank ? 1000 - rank : 1,
      });

      marker.addListener("mouseover", () => onMarkerHover?.(listing.id));
      marker.addListener("mouseout", () => onMarkerHover?.(null));
      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;
        const cover = listing.images?.[0] ?? "";
        const rentBadge = listing.listingType === "rent";
        const commuteRankDisplay = commuteRanks?.get(listing.id);

        // Build commute HTML — avg as primary, breakdown as subtitle
        let commuteHtml = "";
        if (commuteMinutesRaw && commuteLocations && commuteLocations.length > 0) {
          const rawMap = commuteMinutesRaw.get(listing.id);
          if (rawMap) {
            const vals = commuteLocations.map(loc => rawMap.get(loc.id) ?? 0).filter(m => m > 0);
            if (vals.length > 0) {
              const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
              const col = avg <= 15 ? "#10b981" : avg <= 30 ? "#f59e0b" : "#ef4444";
              const breakdown = commuteLocations.map(loc => `${loc.label}: ${rawMap.get(loc.id) ?? 0}m`).join(" · ");
              commuteHtml = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:${col}18;border:1px solid ${col}44;flex-shrink:0">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="${col}" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div>
                    <div style="font-size:13px;font-weight:800;color:${col}">${avg} min${commuteLocations.length > 1 ? " avg" : ""}</div>
                    <div style="font-size:10px;color:#999">${breakdown}</div>
                  </div>
                </div>`;
            }
          }
        } else {
          const minutesDisplay = commuteMinutes?.get(listing.id);
          if (minutesDisplay) {
            const col = minutesDisplay <= 15 ? "#10b981" : minutesDisplay <= 30 ? "#f59e0b" : "#ef4444";
            commuteHtml = `<p style="margin:0 0 8px;font-size:13px;font-weight:800;color:${col}">⏱ ${minutesDisplay} min</p>`;
          }
        }

        const rankHtml = commuteRankDisplay
          ? `<p style="margin:4px 0 0;font-size:11px;color:#f59e0b;font-weight:700">🏆 #${commuteRankDisplay} ${isAr ? "أفضل تطابق" : "best commute match"}</p>`
          : "";

        infoWindowRef.current.setContent(`
          <div style="width:240px;font-family:system-ui,sans-serif;border-radius:12px;overflow:hidden;cursor:pointer" onclick="window.__dariNavigate('${listing.id}')">
            ${cover ? `<img src="${cover}" style="width:100%;height:130px;object-fit:cover;display:block"/>` : ""}
            <div style="padding:12px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
                <span style="font-size:16px;font-weight:800;color:#111">${listing.price}</span>
                <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;background:${rentBadge ? "#10b981" : "#06b6d4"};color:white">${rentBadge ? (isAr ? "إيجار" : "Rent") : (isAr ? "بيع" : "Sale")}</span>
              </div>
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${listing.title}</p>
              <p style="margin:0 0 8px;font-size:11px;color:#888">${listing.location}</p>
              ${commuteHtml}
              ${rankHtml}
              <div style="display:flex;gap:12px;font-size:11px;color:#555;border-top:1px solid #eee;padding-top:8px;margin-top:6px">
                <span>🛏 ${listing.beds}</span><span>🚿 ${listing.baths}</span><span>📐 ${listing.sqft}m²</span>
              </div>
            </div>
            <div style="padding:0 12px 12px">
              <div style="background:#1B5E87;color:white;text-align:center;padding:8px;border-radius:8px;font-size:12px;font-weight:700">${isAr ? "عرض التفاصيل ←" : "View Details →"}</div>
            </div>
          </div>
        `);
        infoWindowRef.current.open(map, marker);
      });

      current.set(listing.id, marker);
    });

    // Add cluster markers
    clusteredData.clusters.forEach((cluster) => {
      const size = Math.min(60, 30 + cluster.count * 2);
      const marker = new window.google.maps.Marker({
        position: { lat: cluster.lat, lng: cluster.lng },
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(clusterSvg(cluster.count, isDark))}`,
          scaledSize: new window.google.maps.Size(size, size),
          anchor: new window.google.maps.Point(size / 2, size / 2),
        },
        zIndex: 500,
      });

      marker.addListener("click", () => {
        const bounds = new window.google.maps.LatLngBounds();
        cluster.listings.forEach(l => bounds.extend({ lat: l.lat, lng: l.lng }));
        map.fitBounds(bounds, { padding: 50 });
      });

      clusterMarkersRef.current.push(marker);
    });

    window.__dariNavigate = (id: string) => {
      infoWindowRef.current?.close();
      navigate(`/listing/${id}`);
    };
  }, [clusteredData, isDark, navigate, nearestRankings, hoveredId, commuteMinutes, commuteMinutesRaw, commuteLocations, commuteRanks, showNearestBadges, onMarkerHover, isAr]);

  // ── Saved place markers ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps || !showSavedPlaces) return;

    const map = mapInstance.current;
    const current = savedPlaceMarkersRef.current;
    const newIds = new Set(savedPlaces.map((p) => p.id));

    current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        marker.setMap(null);
        current.delete(id);
      }
    });

    savedPlaces.forEach((place) => {
      if (current.has(place.id)) return;

      const icon = PLACE_ICONS[place.type] || "📍";
      const marker = new window.google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(savedPlaceSvg(place.label, place.color, icon)),
          anchor: new window.google.maps.Point(24, 52),
          scaledSize: new window.google.maps.Size(48, 56),
        },
        title: place.label,
        zIndex: 2000,
      });

      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;
        infoWindowRef.current.setContent(`
          <div style="padding:12px;font-family:system-ui,sans-serif;min-width:150px">
            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111">${icon} ${place.label}</p>
            <p style="margin:0;font-size:12px;color:#666">${place.address}</p>
            <p style="margin:8px 0 0;font-size:11px;color:${place.color};font-weight:600">${isAr ? "أقصى وقت:" : "Max:"} ${place.maxMinutes} ${isAr ? "دقيقة" : "min"}</p>
          </div>
        `);
        infoWindowRef.current.open(map, marker);
      });

      current.set(place.id, marker);
    });
  }, [savedPlaces, showSavedPlaces, isAr]);

  // ── Commute zone circles ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps || !showCommuteZones) return;

    const map = mapInstance.current;
    const current = commuteCirclesRef.current;
    const newIds = new Set(savedPlaces.map((p) => p.id));

    current.forEach((circle, id) => {
      if (!newIds.has(id)) {
        circle.setMap(null);
        current.delete(id);
      }
    });

    savedPlaces.forEach((place) => {
      const radiusMeters = place.maxMinutes * 500;

      if (current.has(place.id)) {
        current.get(place.id).setRadius(radiusMeters);
        return;
      }

      const circle = new window.google.maps.Circle({
        map,
        center: { lat: place.lat, lng: place.lng },
        radius: radiusMeters,
        strokeColor: place.color,
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: place.color,
        fillOpacity: 0.08,
        zIndex: 50,
      });

      current.set(place.id, circle);
    });
  }, [savedPlaces, showCommuteZones]);

  // ── Auto-fit bounds ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps || listings.length === 0 || centerOn) return;

    const bounds = new window.google.maps.LatLngBounds();
    listings.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));
    savedPlaces.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));

    mapInstance.current.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });

    const listener = window.google.maps.event.addListenerOnce(mapInstance.current, "bounds_changed", () => {
      if ((mapInstance.current?.getZoom() ?? 0) > 15) mapInstance.current?.setZoom(15);
    });

    return () => window.google.maps.event.removeListener(listener);
  }, [listings, savedPlaces, centerOn]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation || !mapInstance.current) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapInstance.current?.setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        mapInstance.current?.setZoom(14);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleToggleDark = useCallback(() => setIsDark((prev) => !prev), []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{isAr ? "جارٍ تحميل الخريطة..." : "Loading map…"}</p>
          </div>
        </div>
      )}

      {listings.length > 0 && (
        <div className="absolute top-3 start-3 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-md)" }}>
          {listings.length} {isAr ? "إعلان" : `listing${listings.length !== 1 ? "s" : ""}`}
        </div>
      )}

      {savedPlaces.length > 0 && showNearestBadges && (
        <div className="absolute top-3 start-24 rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", color: "#ef4444", boxShadow: "var(--shadow-md)" }}>
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-red-500 text-white">20</span>
          {isAr ? "الأقرب" : "Nearest"}
        </div>
      )}


      <div className="absolute bottom-20 start-3 flex flex-col gap-2">
        <button onClick={handleLocateMe} disabled={isLocating} className="w-10 h-10 rounded-full flex items-center justify-center transition"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", color: isLocating ? "var(--accent)" : "var(--text)" }} title={isAr ? "موقعي الحالي" : "My location"}>
          {isLocating ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><circle cx="12" cy="11" r="3" fill="currentColor" /></svg>}
        </button>
        <button onClick={handleToggleDark} className="w-10 h-10 rounded-full flex items-center justify-center transition"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", color: "var(--text)" }} title={isDark ? (isAr ? "الوضع الفاتح" : "Light mode") : (isAr ? "الوضع الداكن" : "Dark mode")}>
          {isDark ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
        </button>
      </div>

      {savedPlaces.length > 0 && (
        <div className="absolute bottom-3 start-3 rounded-lg px-3 py-2 text-[10px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
          <div className="flex flex-wrap gap-3 items-center" style={{ color: "var(--text-muted)" }}>
            {showNearestBadges && <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "#ef4444" }} /><span>{isAr ? "أقرب ٢٠" : "Nearest 20"}</span></div>}
            {showCommuteZones && <div className="flex items-center gap-1"><div className="w-3 h-[2px] rounded" style={{ background: "#3b82f6" }} /><span>{isAr ? "منطقة التنقل" : "Commute zone"}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}