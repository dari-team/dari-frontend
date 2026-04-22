// LocationSearch.tsx — Dubizzle-style location picker
// Two variants:
//   "hero"    — dark glass card (landing page), two-column gov→sub tree
//   "compact" — adapts to theme (search page), single-column list
// Zero API calls — pure static data

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { EGYPT_LOCATIONS, FLAT_LOCATIONS, type FlatLocation } from "../../data/egyptLocations";

interface Props {
  value: string;
  onChange: (display: string, govValue: string, subValue?: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  variant?: "hero" | "compact";
}

// Approximate coordinates for major Egyptian locations
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  "cairo": { lat: 30.0444, lng: 31.2357 },
  "giza": { lat: 30.0131, lng: 31.2089 },
  "alexandria": { lat: 31.2001, lng: 29.9187 },
  "new-cairo": { lat: 30.0300, lng: 31.4700 },
  "6th-of-october": { lat: 29.9601, lng: 30.9276 },
  "north-coast": { lat: 31.0500, lng: 28.0000 },
  "ain-sokhna": { lat: 29.5833, lng: 32.3167 },
  "heliopolis": { lat: 30.0866, lng: 31.3227 },
  "maadi": { lat: 29.9602, lng: 31.2569 },
  "zamalek": { lat: 30.0623, lng: 31.2186 },
  "nasr-city": { lat: 30.0511, lng: 31.3656 },
  "mohandessin": { lat: 30.0545, lng: 31.2002 },
  "dokki": { lat: 30.0380, lng: 31.2120 },
  "sheikh-zayed": { lat: 30.0392, lng: 30.9855 },
  "new-capital": { lat: 30.0200, lng: 31.7300 },
  "hurghada": { lat: 27.2579, lng: 33.8116 },
  "sharm": { lat: 27.9158, lng: 34.3300 },
  "5th-settlement": { lat: 30.0074, lng: 31.4913 },
  "rehab": { lat: 30.0592, lng: 31.4924 },
  "madinaty": { lat: 30.1000, lng: 31.6300 },
  "shorouk": { lat: 30.1167, lng: 31.6167 },
};

function getLocationCoords(govValue: string, subValue?: string): { lat: number; lng: number } | undefined {
  // Try sub-area first, then governorate
  const subKey = subValue?.toLowerCase().replace(/\s+/g, "-");
  const govKey = govValue?.toLowerCase().replace(/\s+/g, "-");
  
  if (subKey && LOCATION_COORDS[subKey]) return LOCATION_COORDS[subKey];
  if (govKey && LOCATION_COORDS[govKey]) return LOCATION_COORDS[govKey];
  
  // Default to Cairo
  return LOCATION_COORDS["cairo"];
}

export default function LocationSearch({
  value,
  onChange,
  placeholder,
  inputClassName = "",
  inputStyle = {},
  variant = "compact",
}: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const isHero = variant === "hero";

  const [query, setQuery]         = useState(value);
  const [open, setOpen]           = useState(false);
  const [activeGov, setActiveGov] = useState(EGYPT_LOCATIONS[0]?.value ?? "");
  const containerRef              = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered: FlatLocation[] = query.trim().length === 0 ? [] :
    FLAT_LOCATIONS.filter(loc =>
      loc.searchKey.includes(query.toLowerCase()) ||
      loc.displayAr.includes(query)
    ).slice(0, 20);

  const showFiltered = open && query.trim().length > 0;
  const showTree     = open && query.trim().length === 0;

  const activeGovernorate = EGYPT_LOCATIONS.find(g => g.value === activeGov);

  function select(loc: FlatLocation) {
    const display = isAr ? loc.displayAr : loc.displayEn;
    setQuery(display);
    setOpen(false);
    const coords = getLocationCoords(loc.govValue, loc.subValue);
    onChange(display, loc.govValue, loc.subValue, coords);
  }

  function selectGov(gov: typeof EGYPT_LOCATIONS[0]) {
    const display = isAr ? gov.ar : gov.en;
    setQuery(display);
    setOpen(false);
    const coords = getLocationCoords(gov.value);
    onChange(display, gov.value, undefined, coords);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleFocus() {
    setOpen(true);
  }

  function handleClear() {
    setQuery("");
    onChange("", "", undefined, undefined);
    setOpen(true);
    inputRef.current?.focus();
  }

  // ── Dropdown colours — theme-aware ──────────────────────────────────────────
  const isDark = document.documentElement.classList.contains("dark");
  
  const dropdownStyle: React.CSSProperties = {
    background: isDark ? "#1f2937" : "#ffffff",
    border: `1px solid ${isDark ? "#374151" : "#e2e8f0"}`,
    boxShadow: isDark 
      ? "0 24px 64px rgba(0,0,0,0.5)" 
      : "0 24px 64px rgba(0,0,0,0.22)",
    borderRadius: 16,
    overflow: "hidden",
    minWidth: 300,
  };

  const textColor = isDark ? "#f3f4f6" : "#1a202c";
  const mutedColor = isDark ? "#9ca3af" : "#94a3b8";
  const hoverBg = isDark ? "#374151" : "#f8f9fa";
  const accentColor = "#C9A84C";
  const accentBg = isDark ? "rgba(201,168,76,0.15)" : "#fef9ee";
  const borderColor = isDark ? "#374151" : "#e2e8f0";

  const govActiveStyle: React.CSSProperties = {
    background: accentBg,
    color: accentColor,
    borderInlineStart: `3px solid ${accentColor}`,
    fontWeight: 600,
  };
  const govIdleStyle: React.CSSProperties = {
    background: "transparent",
    color: textColor,
    borderInlineStart: "3px solid transparent",
  };

  // ── Icon colour: white for hero (dark bg), muted for compact ──────────────
  const iconColor = isHero ? "rgba(255,255,255,0.65)" : mutedColor;
  const clearColor = isHero ? "rgba(255,255,255,0.8)" : (isDark ? "#9ca3af" : "#64748b");

  return (
    <div ref={containerRef} className="relative w-full" style={{ zIndex: open ? 99999 : "auto" }}>
      {/* ── Input ── */}
      <div className="relative">
        <svg
          className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ color: iconColor }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          placeholder={placeholder ?? (isAr ? "محافظة أو حي…" : "Governorate or district…")}
          className={`ps-9 pe-8 ${inputClassName}`}
          style={inputStyle}
          autoComplete="off"
          dir={isAr ? "rtl" : "ltr"}
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute end-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full transition opacity-60 hover:opacity-100"
            style={{ color: clearColor }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && (showFiltered || showTree) && (
        <div
          className="absolute top-full start-0 mt-2"
          style={{
            ...dropdownStyle,
            width: isHero ? 480 : "100%",
            minWidth: isHero ? 480 : 280,
            zIndex: 99999,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >

          {/* Filtered list */}
          {showFiltered && (
            <div className="max-h-72 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm" style={{ color: mutedColor }}>
                  {isAr ? "لا توجد نتائج" : "No results found"}
                </div>
              ) : filtered.map((loc, i) => (
                <button
                  key={i}
                  onClick={() => select(loc)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors"
                  style={{ color: textColor }}
                  onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: accentColor }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium" style={{ color: textColor }}>
                      {isAr ? loc.displayAr : loc.displayEn}
                    </div>
                    {loc.subValue && (
                      <div className="text-xs mt-0.5" style={{ color: mutedColor }}>
                        {isAr ? loc.govAr : loc.govEn}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Two-column tree */}
          {showTree && isHero && (
            <div className="flex" style={{ height: 320 }}>
              {/* Left: governorates */}
              <div className="w-44 shrink-0 overflow-y-auto py-2"
                style={{ borderInlineEnd: `1px solid ${borderColor}` }}>
                {EGYPT_LOCATIONS.map(gov => {
                  const active = activeGov === gov.value;
                  return (
                    <button key={gov.value}
                      onClick={() => setActiveGov(gov.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-start text-sm transition-colors"
                      style={active ? govActiveStyle : govIdleStyle}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = hoverBg; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span>{isAr ? gov.ar : gov.en}</span>
                      <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>

              {/* Right: sub-areas */}
              <div className="flex-1 overflow-y-auto py-2">
                {activeGovernorate && (
                  <>
                    {/* All of [Gov] */}
                    <button
                      onClick={() => selectGov(activeGovernorate)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-start text-sm font-semibold transition-colors"
                      style={{ color: accentColor }}
                      onMouseEnter={e => (e.currentTarget.style.background = accentBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      {isAr ? `كل ${activeGovernorate.ar}` : `All of ${activeGovernorate.en}`}
                    </button>

                    <div style={{ height: 1, background: borderColor, margin: "0 16px 4px" }} />

                    {activeGovernorate.subAreas.map(sub => (
                      <button key={sub.value}
                        onClick={() => select({
                          govValue: activeGovernorate.value,
                          govEn: activeGovernorate.en,
                          govAr: activeGovernorate.ar,
                          subValue: sub.value,
                          subEn: sub.en,
                          subAr: sub.ar,
                          displayEn: `${sub.en}, ${activeGovernorate.en}`,
                          displayAr: `${sub.ar}، ${activeGovernorate.ar}`,
                          searchKey: "",
                        })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full flex items-center gap-2 px-4 py-2 text-start text-sm transition-colors"
                        style={{ color: textColor }}
                        onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: accentColor, opacity: 0.6 }} />
                        {isAr ? sub.ar : sub.en}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Compact tree (search page — single column browse) */}
          {showTree && !isHero && (
            <div className="max-h-80 overflow-y-auto py-2">
              {EGYPT_LOCATIONS.map(gov => (
                <div key={gov.value}>
                  {/* Gov header — click to select whole governorate */}
                  <button
                    onClick={() => selectGov(gov)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full flex items-center gap-2 px-4 py-2 text-start transition-colors"
                    style={{ color: accentColor }}
                    onMouseEnter={e => (e.currentTarget.style.background = accentBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isAr ? gov.ar : gov.en}
                    </span>
                  </button>

                  {/* Top 6 sub-areas */}
                  {gov.subAreas.slice(0, 6).map(sub => (
                    <button key={sub.value}
                      onClick={() => select({
                        govValue: gov.value, govEn: gov.en, govAr: gov.ar,
                        subValue: sub.value, subEn: sub.en, subAr: sub.ar,
                        displayEn: `${sub.en}, ${gov.en}`,
                        displayAr: `${sub.ar}، ${gov.ar}`,
                        searchKey: "",
                      })}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full flex items-center gap-2 ps-8 pe-4 py-1.5 text-start text-sm transition-colors"
                      style={{ color: textColor }}
                      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: mutedColor }} />
                      {isAr ? sub.ar : sub.en}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}