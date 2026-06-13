import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import LocationSearch from "./LocationSearch";
import { toCanonicalEn } from "../../data/egyptLocations";
import { getCachedGeocode } from "../../lib/googleMapsCache";
import { AMENITIES, AMENITY_GROUP_LABELS, AMENITY_GROUP_ORDER } from "../../data/amenities";

// ── Types ─────────────────────────────────────────────────────────────────────
type Filters = {
  listingType: "buy" | "rent" | "all";
  priceMin: number;
  priceMax: number;
  beds: number;
  baths: number;
  propertyType: string;
  city: string;
  finishing: string;
  listingKind: string; // "" | "residential" | "commercial"
  amenities: string[]; // amenity keys — see src/data/amenities.ts
  paymentMethod: string; // "" | "cash" | "installments"
  completionStatus: string; // "" | "ready" | "offplan"
};
type Props = {
  filters: Filters;
  setFilters: (f: Filters) => void;
  onChange?: (f: Partial<Filters>) => void;
  onCitySelect?: (coords: { lat: number; lng: number } | null) => void;
};

const BUY_MAX  = 30_000_000;
const RENT_MAX =    200_000;
const STEP_BUY  =   100_000;
const STEP_RENT =     1_000;

function fmtEGP(n: number, isRent: boolean): string {
  if (isRent) {
    if (n >= 1_000) return `EGP ${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
    return `EGP ${n.toLocaleString()}`;
  }
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000)     return `EGP ${(n / 1_000).toFixed(0)}K`;
  return `EGP ${n.toLocaleString()}`;
}

function PillButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap"
      style={{
        border:     `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "var(--accent-light)" : "var(--surface)",
        color:      active ? "var(--accent)"       : "var(--text-secondary)",
        boxShadow:  "var(--shadow-sm)",
      }}
    >
      {label}
      <svg
        className={`w-3.5 h-3.5 transition-transform ${active ? "rotate-180" : ""}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function ToggleBtn({ value, current, onClick, label }: { value: number; current: number; onClick: (v: number) => void; label: string }) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
      style={{
        border:     `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "var(--accent-light)" : "transparent",
        color:      active ? "var(--accent)"       : "var(--text-muted)",
      }}
    >
      {label}
    </button>
  );
}

// Preset price bands — one click sets both min+max. Keeps typical buyer/renter
// brackets obvious without having to drag sliders or type EGP totals.
const BUY_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Under 2M",    min: 0,          max: 2_000_000 },
  { label: "2M – 5M",     min: 2_000_000,  max: 5_000_000 },
  { label: "5M – 10M",    min: 5_000_000,  max: 10_000_000 },
  { label: "10M – 20M",   min: 10_000_000, max: 20_000_000 },
  { label: "20M+",        min: 20_000_000, max: BUY_MAX },
];
// Rent buckets are intentionally far lower than buy (Egyptian rents start
// around EGP 5K/mo). First preset starts at 5K, NOT at the 2M buy floor.
const RENT_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Under 5K",    min: 0,          max: 5_000 },
  { label: "5K – 10K",    min: 5_000,      max: 10_000 },
  { label: "10K – 20K",   min: 10_000,     max: 20_000 },
  { label: "20K – 50K",   min: 20_000,     max: 50_000 },
  { label: "50K – 100K",  min: 50_000,     max: 100_000 },
  { label: "100K+",       min: 100_000,    max: RENT_MAX },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function FiltersPanel({ filters, setFilters, onChange, onCitySelect }: Props) {
  const { t: _t, i18n } = useTranslation();
  const isAr   = i18n.language === "ar";
  const isRent = filters.listingType === "rent";

  // priceMode flips the buy panel between "list price" (total) and
  // "monthly payment" (estimated mortgage). Rent is always monthly.
  const [priceMode,  setPriceMode]  = useState<"list" | "monthly">("list");
  const monthlyView = isRent || priceMode === "monthly";

  // When in monthly view the buckets, abs cap, and step have to drop to
  // rent-magnitude numbers — a monthly mortgage payment is ~5K–200K, not 2M+.
  const absMax = monthlyView ? RENT_MAX : BUY_MAX;
  const step   = monthlyView ? STEP_RENT : STEP_BUY;

  const PROPERTY_TYPES = [
    { value: "",          label: isAr ? "الكل" : "All",       icon: "🏠" },
    { value: "apartment", label: isAr ? "شقة" : "Apartment",  icon: "🏢" },
    { value: "villa",     label: isAr ? "فيلا" : "Villa",     icon: "🏡" },
    { value: "studio",    label: isAr ? "ستوديو" : "Studio",  icon: "🛏️" },
    { value: "duplex",    label: isAr ? "دوبلكس" : "Duplex",  icon: "🏘️" },
    { value: "penthouse", label: isAr ? "بنتهاوس" : "Penthouse", icon: "🌇" },
  ];

  const FINISHING_OPTIONS = [
    { value: "",                label: isAr ? "الكل"        : "Any" },
    { value: "fully_finished",  label: isAr ? "تشطيب كامل"  : "Fully Finished" },
    { value: "semi_finished",   label: isAr ? "نص تشطيب"    : "Semi Finished" },
    { value: "core_shell",      label: isAr ? "هيكل"        : "Core & Shell" },
    { value: "furnished",       label: isAr ? "مفروش"       : "Furnished" },
    { value: "unfurnished",     label: isAr ? "غير مفروش"   : "Unfurnished" },
  ];

  const PAYMENT_OPTIONS = [
    { value: "",             label: isAr ? "الكل"    : "Any",          icon: "💳" },
    { value: "cash",         label: isAr ? "كاش"     : "Cash",         icon: "💵" },
    { value: "installments", label: isAr ? "تقسيط"   : "Installments", icon: "🗓️" },
  ];

  const COMPLETION_OPTIONS = [
    { value: "",        label: isAr ? "الكل"          : "Any",      icon: "🏠" },
    { value: "offplan", label: isAr ? "تحت الإنشاء"   : "Off-plan", icon: "🏗️" },
    { value: "ready",   label: isAr ? "جاهز للسكن"    : "Ready",    icon: "✅" },
  ];

  const [openPanel,  setOpenPanel]  = useState<"price" | "beds" | "city" | "type" | "finishing" | "amenities" | "payment" | "completion" | null>(null);

  // ── Mobile dropdowns ──────────────────────────────────────────────────────────
  // On mobile the filter pills live in a horizontally-scrollable row (overflow-x:
  // auto), which ALSO clips vertical overflow — so an absolutely-positioned panel
  // gets cut off and looks broken. Fix: on mobile render the panel as a fixed,
  // full-width sheet anchored just below the filter bar, escaping the clip.
  const rootRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Where the mobile sheet starts (just under the filter bar). Measured on open so
  // it tracks the real bar height regardless of how the pills wrapped/scrolled.
  const [sheetTop, setSheetTop] = useState(0);
  useLayoutEffect(() => {
    if (!isMobile || !openPanel || !rootRef.current) return;
    setSheetTop(rootRef.current.getBoundingClientRect().bottom + 8);
  }, [isMobile, openPanel]);

  const [draftMin,   setDraftMin]   = useState(filters.priceMin);
  const [draftMax,   setDraftMax]   = useState(Math.min(filters.priceMax, absMax));
  const [draftBeds,  setDraftBeds]  = useState(filters.beds);
  const [draftBaths, setDraftBaths] = useState(filters.baths);
  const [draftCity,  setDraftCity]  = useState(filters.city);
  const [cityDisplay,setCityDisplay]= useState(filters.city);
  const [draftAmenities, setDraftAmenities] = useState<string[]>(filters.amenities);

  // Sync drafts when listing type changes (rent/buy toggle)
  useEffect(() => {
    setDraftMin(filters.priceMin);
    setDraftMax(Math.min(filters.priceMax, absMax));
  }, [filters.listingType, filters.priceMin, filters.priceMax, absMax]);

  const panelPos: React.CSSProperties = isAr ? { right: 0 } : { left: 0 };

  const [draftPropType, setDraftPropType] = useState(filters.propertyType);

  const toggle = (panel: "price" | "beds" | "city" | "type" | "finishing" | "amenities" | "payment" | "completion") => {
    if (openPanel === panel) { setOpenPanel(null); return; }
    if (panel === "price") { setDraftMin(filters.priceMin); setDraftMax(Math.min(filters.priceMax, absMax)); }
    if (panel === "beds")  { setDraftBeds(filters.beds); setDraftBaths(filters.baths); }
    if (panel === "city")  { setDraftCity(filters.city); setCityDisplay(filters.city); }
    if (panel === "type") { setDraftPropType(filters.propertyType); }
    if (panel === "amenities") { setDraftAmenities(filters.amenities); }
    setOpenPanel(panel);
  };
  const close = () => setOpenPanel(null);

  const applyAmenities = () => {
    const u = { ...filters, amenities: draftAmenities };
    setFilters(u); onChange?.(u); close();
  };
  const toggleDraftAmenity = (key: string) =>
    setDraftAmenities((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const applyPrice = () => {
    const noLimit = monthlyView ? RENT_MAX : BUY_MAX;
    const realMax = draftMax >= absMax ? noLimit : draftMax;
    // A price range only makes sense within one pricing scale, so couple the mode
    // to the listing type: "List Price" filters sale listings, "Monthly Payment"
    // filters rentals. Without this, an "All" search mixes sale totals with monthly
    // rents (a 75k/month rental wrongly matched a "list price ≤ 2M" filter).
    const listingType = filters.listingType === "all" ? (monthlyView ? "rent" : "buy") : filters.listingType;
    const u = { ...filters, listingType, priceMin: draftMin, priceMax: realMax };
    setFilters(u); onChange?.(u); close();
  };

  // When the price-mode toggle flips between list / monthly inside buy mode,
  // the buckets and abs cap shift wildly. Reset drafts so the user doesn't
  // see "Under 2M" still selected after switching to "Monthly Payment".
  useEffect(() => {
    setDraftMin(0);
    setDraftMax(monthlyView ? RENT_MAX : BUY_MAX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMode]);
  const applyBeds = () => {
    const u = { ...filters, beds: draftBeds, baths: draftBaths };
    setFilters(u); onChange?.(u); close();
  };
  
  const applyCity = async () => {
    const u = { ...filters, city: draftCity };
    setFilters(u); onChange?.(u); close();
    
    // Use Google Maps Geocoding to get real coordinates
    if (cityDisplay) {
      const searchQuery = `${cityDisplay}, Egypt`;
      const result = await getCachedGeocode(searchQuery);
      if (result) {
        onCitySelect?.({ lat: result.lat, lng: result.lng });
      } else {
        onCitySelect?.(null);
      }
    } else {
      onCitySelect?.(null);
    }
  };

  // ── Labels ──────────────────────────────────────────────────────────────────
  const priceLabel = () => {
    const mn = filters.priceMin; const mx = filters.priceMax;
    const noMax = mx >= absMax;
    if (!mn && noMax) return isAr ? "السعر" : "Price";
    const sfx = monthlyView ? (isAr ? "/شهر" : "/mo") : "";
    if (!mn)    return `${isAr ? "حتى" : "Up to"} ${fmtEGP(mx, monthlyView)}${sfx}`;
    if (noMax)  return `${fmtEGP(mn, monthlyView)}+${sfx}`;
    return `${fmtEGP(mn, monthlyView)} – ${fmtEGP(mx, monthlyView)}${sfx}`;
  };

  const bedsLabel = () => {
    const parts: string[] = [];
    if (filters.beds  > 0) parts.push(`${filters.beds}+ ${isAr ? "غرف" : "bd"}`);
    if (filters.baths > 0) parts.push(`${filters.baths}+ ${isAr ? "حمام" : "ba"}`);
    return parts.length ? parts.join(", ") : (isAr ? "الغرف والحمامات" : "Beds & Baths");
  };

  const cityLabel = () => {
    if (!filters.city) return isAr ? "كل مصر" : "All Egypt";
    return cityDisplay || filters.city;
  };

  const amenitiesLabel = () => {
    const n = filters.amenities.length;
    if (n === 0) return isAr ? "وسائل الراحة" : "Amenities";
    return isAr ? `وسائل الراحة (${n})` : `Amenities (${n})`;
  };

  const bedsVals  = isAr ? ["أي","1+","2+","3+","4+","5+"]   : ["Any","1+","2+","3+","4+","5+"];
  const bathsVals = isAr ? ["أي","1+","2+","3+","4+"] : ["Any","1+","2+","3+","4+"];

  const panelBase: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 8px)", zIndex: 999,
    padding: 20, borderRadius: 16,
    background: "var(--surface)", border: "1px solid var(--border)",
    boxShadow: "var(--shadow-xl)",
    maxWidth: "calc(100vw - 24px)",
    ...panelPos,
  };

  // Desktop: absolute dropdown anchored to the pill. Mobile: fixed full-width
  // sheet under the bar so it isn't clipped by the scroll container. `extra` lets
  // a panel opt into its own overflow rules (e.g. the city panel keeps its
  // autocomplete visible). Pass the desktop pixel width; it's ignored on mobile.
  const panel = (width: number, extra?: React.CSSProperties): React.CSSProperties =>
    isMobile
      ? {
          position: "fixed",
          top: sheetTop,
          left: 12,
          right: 12,
          zIndex: 1000,
          padding: 20,
          borderRadius: 16,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-xl)",
          maxHeight: `calc(100dvh - ${sheetTop + 16}px)`,
          overflowY: "auto",
          ...extra,
          width: "auto",
        }
      : { ...panelBase, width, ...extra };

  const inputStyle: React.CSSProperties = {
    background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)",
    outline: "none", width: "100%", borderRadius: 10, padding: "8px 12px", fontSize: 13,
  };

  const applyBtnStyle: React.CSSProperties = {
    background: "var(--accent)", color: "var(--accent-text)", width: "100%",
    borderRadius: 12, padding: "10px 0", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
  };

  const KIND_OPTIONS = [
    { value: "",             label: isAr ? "الكل"        : "All",         icon: "🏘️" },
    { value: "residential",  label: isAr ? "سكني"        : "Residential", icon: "🏠" },
    { value: "commercial",   label: isAr ? "تجاري"       : "Commercial",  icon: "🏢" },
  ];

  return (
    <div ref={rootRef} className="flex gap-2 items-center flex-shrink-0 md:flex-shrink md:min-w-0 md:flex-wrap">

      {/* ── LISTING KIND (Residential / Commercial) ── */}
      <div className="flex rounded-full overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        {KIND_OPTIONS.map(({ value, label, icon }) => {
          const active = filters.listingKind === value;
          return (
            <button
              key={value}
              onClick={() => { const u = { ...filters, listingKind: value }; setFilters(u); onChange?.(u); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color:      active ? "var(--accent-text)" : "var(--text-secondary)",
                borderRight: value !== "commercial" ? `1px solid var(--border)` : "none",
              }}
            >
              <span>{icon}</span> {label}
            </button>
          );
        })}
      </div>

      {/* ── PRICE ── */}
      <div className="relative">
        <PillButton label={priceLabel()} active={openPanel === "price"} onClick={() => toggle("price")} />
        {openPanel === "price" && (
          <div style={panel(320)}>
            {monthlyView && (
              <div className="text-xs mb-3 px-3 py-2 rounded-xl"
                style={{ background: "var(--success-light)", border: "1px solid var(--success)", color: "var(--success)" }}>
                {isRent
                  ? (isAr ? "الأسعار شهرية (إيجار)" : "Prices are monthly (rent)")
                  : (isAr ? "تقدير الدفعة الشهرية للقرض" : "Estimated monthly mortgage payment")}
              </div>
            )}
            <div className="flex rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
              {([{ k: "list" as const, label: isAr ? "سعر القائمة" : "List Price" }, { k: "monthly" as const, label: isAr ? "دفعة شهرية" : "Monthly Payment" }]).map(({ k, label }) => (
                <button key={k} onClick={() => setPriceMode(k)} className="flex-1 py-2 text-sm transition"
                  style={{ background: priceMode === k ? "var(--surface2)" : "transparent", color: priceMode === k ? "var(--text)" : "var(--text-muted)", fontWeight: priceMode === k ? 600 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
            {/* Preset bands — snap both min+max with one tap */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(monthlyView ? RENT_PRESETS : BUY_PRESETS).map((p) => {
                const active = draftMin === p.min && draftMax === p.max;
                return (
                  <button
                    key={p.label}
                    onClick={() => { setDraftMin(p.min); setDraftMax(p.max); }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                    style={{
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-light)" : "transparent",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs mb-3" style={{ color: "var(--text-faint)" }}>
              <span>{fmtEGP(draftMin, monthlyView)}</span>
              <span>{draftMax >= absMax ? (monthlyView ? "EGP 200K+" : "EGP 30M+") : fmtEGP(draftMax, monthlyView)}</span>
            </div>
            <div className="flex gap-3 items-center mb-4">
              {([{ label: isAr ? "الحد الأدنى" : "Min", val: draftMin, set: (v: number) => setDraftMin(Math.min(v, draftMax - step)) }, { label: isAr ? "الحد الأقصى" : "Max", val: draftMax, set: (v: number) => setDraftMax(Math.max(v, draftMin + step)) }]).map(({ label, val, set }) => (
                <div key={label} style={{ flex: 1 }}>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-faint)" }}>{label}</label>
                  <input type="number" value={val === 0 ? "" : val} placeholder={isAr ? "بدون حد" : "No limit"} min={0} max={absMax} step={step}
                    onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n)) set(n); }} style={inputStyle} />
                </div>
              ))}
            </div>
            <button onClick={applyPrice} style={applyBtnStyle}>{isAr ? "تطبيق" : "Apply"}</button>
          </div>
        )}
      </div>

      {/* ── BEDS & BATHS ── */}
      <div className="relative">
        <PillButton label={bedsLabel()} active={openPanel === "beds"} onClick={() => toggle("beds")} />
        {openPanel === "beds" && (
          <div style={panel(320)}>
            {([{ heading: isAr ? "غرف النوم" : "Bedrooms", values: bedsVals, state: draftBeds, setter: setDraftBeds }, { heading: isAr ? "الحمامات" : "Bathrooms", values: bathsVals, state: draftBaths, setter: setDraftBaths }]).map(({ heading, values, state, setter }) => (
              <div key={heading} className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--accent)" }}>{heading}</p>
                <div className="flex gap-2 flex-wrap">
                  {values.map((l, i) => <ToggleBtn key={l} value={i} current={state} onClick={setter} label={l} />)}
                </div>
              </div>
            ))}
            <button onClick={applyBeds} style={applyBtnStyle}>{isAr ? "تطبيق" : "Apply"}</button>
          </div>
        )}
      </div>

      {/* ── PROPERTY TYPE ── */}
      <div className="relative">
        <PillButton
          label={filters.propertyType
            ? (PROPERTY_TYPES.find(t => t.value === filters.propertyType)?.label ?? (isAr ? "النوع" : "Type"))
            : (isAr ? "نوع العقار" : "Property Type")}
          active={openPanel === "type"}
          onClick={() => toggle("type")}
        />
        {openPanel === "type" && (
          <div style={panel(280)}>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--accent)" }}>
              {isAr ? "نوع العقار" : "Property Type"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    const u = { ...filters, propertyType: value };
                    setFilters(u); onChange?.(u); close();
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition"
                  style={{
                    border: `1px solid ${filters.propertyType === value ? "var(--accent)" : "var(--border)"}`,
                    background: filters.propertyType === value ? "var(--accent-light)" : "transparent",
                    color: filters.propertyType === value ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FINISHING ── */}
      <div className="relative">
        <PillButton
          label={filters.finishing
            ? (FINISHING_OPTIONS.find(o => o.value === filters.finishing)?.label ?? (isAr ? "التشطيب" : "Finishing"))
            : (isAr ? "التشطيب" : "Finishing")}
          active={openPanel === "finishing"}
          onClick={() => toggle("finishing")}
        />
        {openPanel === "finishing" && (
          <div style={panel(260)}>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--accent)" }}>
              {isAr ? "نوع التشطيب" : "Finishing Quality"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FINISHING_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { const u = { ...filters, finishing: value }; setFilters(u); onChange?.(u); close(); }}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition"
                  style={{
                    border: `1px solid ${filters.finishing === value ? "var(--accent)" : "var(--border)"}`,
                    background: filters.finishing === value ? "var(--accent-light)" : "transparent",
                    color: filters.finishing === value ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CITY — Dubizzle-style LocationSearch ── */}
      <div className="relative">
        <PillButton label={cityLabel()} active={openPanel === "city"} onClick={() => toggle("city")} />
        {openPanel === "city" && (
          <div style={panel(340, { padding: 0, overflowY: "visible" })}>
            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                {isAr ? "المحافظة / الحي" : "Governorate / District"}
              </span>
              {draftCity && (
                <button onClick={() => { setDraftCity(""); setCityDisplay(""); }}
                  className="text-xs underline" style={{ color: "var(--text-faint)" }}>
                  {isAr ? "مسح" : "Clear"}
                </button>
              )}
            </div>

            {/* LocationSearch embedded */}
            <div className="px-4 pb-2">
              <LocationSearch
                value={cityDisplay}
                onChange={(display, govValue, subValue) => {
                  setCityDisplay(display);
                  if (!display) {
                    setDraftCity("");
                    return;
                  }
                  // Store the CANONICAL ENGLISH name (e.g. "Sheikh Zayed" / "Giza"),
                  // not the localized "Sub، Gov" display. The backend matches this
                  // against Address.City OR Address.Region (exact, case-insensitive),
                  // and listings store district/governorate in English. Sending the
                  // raw Arabic display (e.g. "الشيخ زايد، الجيزة") matches nothing.
                  setDraftCity(toCanonicalEn(display));
                }}
                variant="compact"
                placeholder={isAr ? "ابحث عن محافظة أو حي…" : "Search governorate or district…"}
                inputClassName="w-full rounded-xl text-sm outline-none transition"
                inputStyle={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  padding: "9px 12px",
                  paddingInlineStart: "2.25rem",
                }}
              />
            </div>

            {/* All Egypt option */}
            <div className="px-4 pb-3">
              <button
                onClick={() => { setDraftCity(""); setCityDisplay(""); }}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
                style={{
                  background: !draftCity ? "var(--accent-light)" : "var(--surface2)",
                  color: !draftCity ? "var(--accent)" : "var(--text-secondary)",
                  border: `1px solid ${!draftCity ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                🇪🇬 {isAr ? "كل مصر" : "All Egypt"}
              </button>
            </div>

            {/* Apply */}
            <div className="px-4 pb-4">
              <button onClick={applyCity} style={applyBtnStyle}>{isAr ? "تطبيق" : "Apply"}</button>
            </div>
          </div>
        )}
      </div>

      {/* ── AMENITIES ── */}
      <div className="relative">
        <PillButton label={amenitiesLabel()} active={openPanel === "amenities"} onClick={() => toggle("amenities")} />
        {openPanel === "amenities" && (
          <div style={panel(360, { maxHeight: "70vh", overflowY: "auto" })}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                {isAr ? "وسائل الراحة" : "Amenities"}
              </p>
              {draftAmenities.length > 0 && (
                <button onClick={() => setDraftAmenities([])}
                  className="text-xs underline" style={{ color: "var(--text-faint)" }}>
                  {isAr ? "مسح" : "Clear"}
                </button>
              )}
            </div>
            <div className="space-y-4">
              {AMENITY_GROUP_ORDER.map((group) => (
                <div key={group}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-faint)" }}>
                    {isAr ? AMENITY_GROUP_LABELS[group].ar : AMENITY_GROUP_LABELS[group].en}
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {AMENITIES.filter((a) => a.group === group).map((a) => {
                      const checked = draftAmenities.includes(a.key);
                      return (
                        <label key={a.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition"
                          style={{ background: checked ? "var(--accent-light)" : "transparent" }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleDraftAmenity(a.key)}
                            style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
                          <span className="text-sm">{a.icon}</span>
                          <span className="text-sm" style={{ color: checked ? "var(--accent)" : "var(--text-secondary)" }}>
                            {isAr ? a.labelAr : a.labelEn}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={applyAmenities} style={{ ...applyBtnStyle, marginTop: 16 }}>
              {isAr ? "تطبيق" : "Apply"}
            </button>
          </div>
        )}
      </div>

      {/* ── PAYMENT METHOD ── */}
      <div className="relative">
        <PillButton
          label={filters.paymentMethod
            ? (PAYMENT_OPTIONS.find(o => o.value === filters.paymentMethod)?.label ?? (isAr ? "طريقة الدفع" : "Payment"))
            : (isAr ? "طريقة الدفع" : "Payment")}
          active={openPanel === "payment"}
          onClick={() => toggle("payment")}
        />
        {openPanel === "payment" && (
          <div style={panel(220)}>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--accent)" }}>
              {isAr ? "طريقة الدفع" : "Payment Method"}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {PAYMENT_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => { const u = { ...filters, paymentMethod: value }; setFilters(u); onChange?.(u); close(); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition"
                  style={{
                    border: `1px solid ${filters.paymentMethod === value ? "var(--accent)" : "var(--border)"}`,
                    background: filters.paymentMethod === value ? "var(--accent-light)" : "transparent",
                    color: filters.paymentMethod === value ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── COMPLETION STATUS ── */}
      <div className="relative">
        <PillButton
          label={filters.completionStatus
            ? (COMPLETION_OPTIONS.find(o => o.value === filters.completionStatus)?.label ?? (isAr ? "حالة التسليم" : "Completion"))
            : (isAr ? "حالة التسليم" : "Completion")}
          active={openPanel === "completion"}
          onClick={() => toggle("completion")}
        />
        {openPanel === "completion" && (
          <div style={panel(220)}>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--accent)" }}>
              {isAr ? "حالة التسليم" : "Completion Status"}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {COMPLETION_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => { const u = { ...filters, completionStatus: value }; setFilters(u); onChange?.(u); close(); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition"
                  style={{
                    border: `1px solid ${filters.completionStatus === value ? "var(--accent)" : "var(--border)"}`,
                    background: filters.completionStatus === value ? "var(--accent-light)" : "transparent",
                    color: filters.completionStatus === value ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {openPanel && <div className="fixed inset-0 z-40" onClick={close} />}
    </div>
  );
}