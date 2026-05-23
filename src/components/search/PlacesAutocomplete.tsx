// src/components/search/PlacesAutocomplete.tsx
// Reusable Google Places autocomplete dropdown with AGGRESSIVE caching.
// Used in: SearchBar (text search), CommuteSearchPanel, ListPropertyPage.

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  getCachedAutocompleteSuggestions, 
  getCachedPlaceDetails,
  resetAutocompleteSession,
  getCachedGeocode,
} from "../../lib/googleMapsCache";

type Suggestion = { description: string; placeId: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: { description: string; lat: number; lng: number; placeId: string }) => void;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  inputClassName?: string;
  country?: string;
  autoFocus?: boolean;
  /** When true, shows a "Get Coordinates" button so user can type manually and geocode once */
  allowManual?: boolean;
};

export default function PlacesAutocomplete({
  value, onChange, onSelect,
  placeholder = "Search location…",
  inputStyle = {}, inputClassName = "",
  country = "eg", autoFocus = false,
  allowManual = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [manualMode,  setManualMode]  = useState(false);
  const [geocoding,   setGeocoding]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const menuRef     = useRef<HTMLDivElement>(null);
  // Suggestions render in a portal (position: fixed) so scroll/overflow ancestors
  // (e.g. the commute panel's overflow-y-auto) can't clip the list.
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Fetch suggestions with 400ms debounce
  // Triggers on EVERY input change via [value, country] deps
  // Cache is keyed by full query string — no prefix matching
  // Skipped entirely in manual mode
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // In manual mode, don't fetch autocomplete suggestions
    if (manualMode) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    
    const trimmedValue = value.trim();
    
    // Rule: Don't call API for short queries (< 3 chars)
    if (!trimmedValue || trimmedValue.length < 3) { 
      setSuggestions([]); 
      setOpen(false); 
      return; 
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      
      try {
        const results = await getCachedAutocompleteSuggestions(trimmedValue, country);
        const mapped = results.map((r) => ({
          description: r.description,
          placeId: r.placeId,
        }));
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
        setActiveIdx(-1);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Autocomplete error:", err);
        setSuggestions([]);
      }
      
      setLoading(false);
    }, 400); // 400ms debounce

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, country, manualMode]);

  // Close on outside click (ignore clicks inside the portalled menu too)
  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Track the input's viewport position so the fixed portal menu stays anchored
  // even as ancestors scroll or the window resizes.
  useLayoutEffect(() => {
    if (!open || suggestions.length === 0) { setMenuPos(null); return; }
    function update() {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, suggestions.length]);

  // Handle selection with cached place details
  const handleSelect = useCallback(async (suggestion: Suggestion) => {
    onChange(suggestion.description);
    setOpen(false);
    setSuggestions([]);
    
    if (onSelect) {
      // Use cached place details (7-day cache)
      const details = await getCachedPlaceDetails(suggestion.placeId);
      if (details) {
        onSelect({ 
          description: suggestion.description, 
          lat: details.lat, 
          lng: details.lng, 
          placeId: suggestion.placeId 
        });
      }
    }
  }, [onChange, onSelect]);

  // Handle manual geocoding — user typed address freely, clicks "Get Coordinates"
  const handleManualGeocode = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 3) return;

    setGeocoding(true);
    try {
      const result = await getCachedGeocode(trimmed);
      if (result && onSelect) {
        onSelect({
          description: trimmed,
          lat: result.lat,
          lng: result.lng,
          placeId: "",
        });
      }
    } catch (err) {
      console.error("Manual geocode error:", err);
    }
    setGeocoding(false);
  }, [value, onSelect]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (manualMode) {
      // In manual mode, Enter triggers geocoding
      if (e.key === "Enter") { e.preventDefault(); handleManualGeocode(); }
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); }
    if (e.key === "Escape")     { setOpen(false); }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex gap-1.5 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => !manualMode && suggestions.length > 0 && setOpen(true)}
            placeholder={manualMode ? "Type full address…" : placeholder}
            autoFocus={autoFocus}
            className={inputClassName}
            style={inputStyle}
            autoComplete="off"
          />

          {/* Loading spinner inside input */}
          {(loading || geocoding) && (
            <div className="absolute end-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                style={{ borderColor:"var(--border)", borderTopColor:"var(--accent)" }} />
            </div>
          )}
        </div>

        {/* Manual mode: "Get Coordinates" button */}
        {allowManual && manualMode && (
          <button
            type="button"
            onClick={handleManualGeocode}
            disabled={geocoding || value.trim().length < 3}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition whitespace-nowrap disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            {geocoding ? "…" : "📍 Get Coordinates"}
          </button>
        )}

        {/* Toggle between autocomplete and manual mode */}
        {allowManual && (
          <button
            type="button"
            onClick={() => { setManualMode((m) => !m); setSuggestions([]); setOpen(false); }}
            className="shrink-0 rounded-lg px-2 py-2 text-xs transition"
            style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            title={manualMode ? "Switch to autocomplete" : "Type manually"}
          >
            {manualMode ? "🔍" : "✏️"}
          </button>
        )}
      </div>

      {/* Suggestions dropdown — only in autocomplete mode.
          Portalled to <body> with fixed positioning so overflow/scroll ancestors
          (e.g. the commute panel) can't clip the list. */}
      {!manualMode && open && suggestions.length > 0 && menuPos && createPortal(
        <div
          ref={menuRef}
          className="rounded-xl shadow-xl"
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 9999,
            maxHeight: "min(45vh, 320px)",
            overflowY: "auto",
            background:"var(--surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-xl)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(s); }}
              onMouseEnter={() => setActiveIdx(i)}
              className="w-full text-start px-4 py-2.5 text-sm flex items-center gap-3 transition"
              style={{
                background: i === activeIdx ? "var(--surface2)" : "transparent",
                color: "var(--text-secondary)",
              }}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" style={{ color:"var(--accent)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span className="truncate">{s.description}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}