import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PlacesAutocomplete from "./PlacesAutocomplete";
// REMOVED: getTravelMinutes, straightLineMinutes (Distance Matrix API)
// All distance calculations now use local Haversine via ranking.ts

// ── Types ─────────────────────────────────────────────────────────────────────
export type CommuteLocation = {
  id: string;
  label: string;
  type: "work" | "school" | "gym" | "family" | "other";
  address: string;
  lat: number | null;
  lng: number | null;
  maxMinutes: number;
};

export type CommuteFilters = {
  locations: CommuteLocation[];
  mode: "driving" | "walking";
};

// REMOVED: getRealTravelMinutes() — was calling Distance Matrix API ($10/1K calls)
// Search.tsx already uses local Haversine calculations for all commute times

// ── Constants ─────────────────────────────────────────────────────────────────
type Props = { 
  onApply: (f: CommuteFilters) => void; 
  onClose: () => void;
  savedPlaces?: CommuteLocation[];
  onAddPlace?: (loc: CommuteLocation) => void;
  onRemovePlace?: (id: string) => void;
  onUpdatePlace?: (id: string, maxMinutes: number) => void;
};

const PLACE_TYPES = [
  { value:"work"   as const, icon:"💼", label:"Work",    labelAr:"عمل"    },
  { value:"school" as const, icon:"🏫", label:"School",  labelAr:"مدرسة"  },
  { value:"gym"    as const, icon:"🏋️", label:"Gym",     labelAr:"نادي"   },
  { value:"family" as const, icon:"❤️", label:"Family",  labelAr:"أهل"    },
  { value:"other"  as const, icon:"📍", label:"Other",   labelAr:"أخرى"   },
];
const TRAVEL_MODES = [
  { value:"driving" as const, icon:"🚗", label:"Driving",  labelAr:"سيارة"    },
];
const TIME_PRESETS = [10, 15, 20, 30, 45, 60];

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Star rating component ─────────────────────────────────────────────────────
function LocationCard({ loc, onRemove, onUpdateTime, isAr }: {
  loc: CommuteLocation; onRemove: () => void;
  onUpdateTime: (m: number) => void; isAr: boolean;
}) {
  const info = PLACE_TYPES.find((t) => t.value === loc.type);
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{info?.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color:"var(--text)" }}>{loc.label}</p>
            <p className="text-xs truncate" style={{ color:"var(--text-faint)" }}>{loc.address}</p>
          </div>
        </div>
        <button onClick={onRemove} style={{ color:"var(--text-faint)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div>
        <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>
          {isAr ? "أقصى وقت تنقل" : "Max commute time"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TIME_PRESETS.map((m) => (
            <button key={m} onClick={() => onUpdateTime(m)}
              className="rounded-full px-3 py-1 text-xs font-semibold transition"
              style={{
                border:`1px solid ${loc.maxMinutes===m?"var(--accent)":"var(--border)"}`,
                background: loc.maxMinutes===m?"var(--accent-light)":"transparent",
                color: loc.maxMinutes===m?"var(--accent)":"var(--text-muted)",
              }}>
              {m}{isAr?"د":"min"}
            </button>
          ))}
        </div>
      </div>

      {loc.lat !== null && (
        <p className="text-xs flex items-center gap-1" style={{ color:"var(--success)" }}>
          ✓ {isAr?"تم تحديد الموقع":"Located"} — {loc.lat.toFixed(4)}, {loc.lng?.toFixed(4)}
        </p>
      )}
    </div>
  );
}

// ── Add location form ─────────────────────────────────────────────────────────
function AddForm({ onAdd, isAr }: { onAdd: (loc: CommuteLocation) => void; isAr: boolean }) {
  const [type,    setType]    = useState<CommuteLocation["type"]>("work");
  const [label,   setLabel]   = useState("");
  const [address, setAddress] = useState("");
  const [coords,  setCoords]  = useState<{ lat: number; lng: number } | null>(null);
  const [err,     setErr]     = useState("");

  const iStyle: React.CSSProperties = {
    width:"100%", borderRadius:10, border:"1px solid var(--border)",
    background:"var(--surface2)", padding:"8px 12px",
    fontSize:13, color:"var(--text)", outline:"none",
  };

  function handleSelectPlace(result: { description: string; lat: number; lng: number }) {
    setAddress(result.description);
    setCoords({ lat: result.lat, lng: result.lng });
    setErr("");
  }

  function handleAdd() {
    if (!label.trim())  { setErr(isAr?"أدخل اسم الموقع.":"Enter a location name."); return; }
    if (!address.trim()){ setErr(isAr?"أدخل العنوان.":"Enter an address."); return; }
    if (!coords)        { setErr(isAr?"اختر من الاقتراحات لتحديد الموقع.":"Pick from suggestions to locate."); return; }

    onAdd({
      id: uid(), type, label: label.trim(), address,
      lat: coords.lat, lng: coords.lng, maxMinutes: 30,
    });
    setLabel(""); setAddress(""); setCoords(null); setErr("");
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ border:"1px solid var(--border)", background:"var(--surface2)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:"var(--text-muted)" }}>
        {isAr ? "إضافة موقع" : "Add a location"}
      </p>

      {/* Type pills */}
      <div className="flex flex-wrap gap-1.5">
        {PLACE_TYPES.map(({ value, icon, label: lbl, labelAr }) => (
          <button key={value} onClick={() => setType(value)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition flex items-center gap-1"
            style={{
              border:`1px solid ${type===value?"var(--accent)":"var(--border)"}`,
              background: type===value?"var(--accent-light)":"transparent",
              color: type===value?"var(--accent)":"var(--text-muted)",
            }}>
            {icon} {isAr?labelAr:lbl}
          </button>
        ))}
      </div>

      {/* Name */}
      <input value={label} onChange={(e) => setLabel(e.target.value)}
        placeholder={isAr?"اسم الموقع (مثال: شغلي)":"Location name (e.g. My Office)"}
        style={iStyle} dir={isAr?"rtl":"ltr"} />

      {/* Address with Places Autocomplete */}
      <PlacesAutocomplete
        value={address}
        onChange={(v) => { setAddress(v); setCoords(null); setErr(""); }}
        onSelect={handleSelectPlace}
        placeholder={isAr?"ابحث عن العنوان…":"Search address…"}
        inputStyle={iStyle}
        country="eg"
      />

      {err && <p className="text-xs" style={{ color:"var(--danger)" }}>{err}</p>}

      {coords && (
        <p className="text-xs" style={{ color:"var(--success)" }}>
          ✓ {isAr?"تم تحديد الموقع بنجاح":"Location confirmed"} ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
        </p>
      )}

      <button onClick={handleAdd} disabled={!label.trim() || !coords}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-40"
        style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text-secondary)" }}>
        + {isAr?"إضافة الموقع":"Add Location"}
      </button>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function CommuteSearchPanel({ 
  onApply, 
  onClose, 
  savedPlaces = [],
  onAddPlace,
  onRemovePlace,
  onUpdatePlace,
}: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  
  // Use savedPlaces from props, or fallback to local state if no props provided
  const [localLocations, setLocalLocations] = useState<CommuteLocation[]>([]);
  const locations = savedPlaces.length > 0 || onAddPlace ? savedPlaces : localLocations;
  
  const [mode, setMode] = useState<CommuteFilters["mode"]>("driving");

  const addLocation = useCallback((loc: CommuteLocation) => {
    if (onAddPlace) {
      onAddPlace(loc);
    } else {
      setLocalLocations((p) => [...p, loc]);
    }
  }, [onAddPlace]);
  
  const removeLocation = (id: string) => {
    if (onRemovePlace) {
      onRemovePlace(id);
    } else {
      setLocalLocations((p) => p.filter((l) => l.id !== id));
    }
  };
  
  const updateTime = (id: string, m: number) => {
    if (onUpdatePlace) {
      onUpdatePlace(id, m);
    } else {
      setLocalLocations((p) => p.map((l) => l.id === id ? { ...l, maxMinutes: m } : l));
    }
  };

  const readyLocations = locations.filter((l) => l.lat !== null);

  return (
    <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pe-1">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:"rgba(245,158,11,0.15)", border:"1px solid #f59e0b" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color:"#f59e0b" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color:"var(--text)" }}>
            {isAr ? "البحث بوقت التنقل" : "Commute Time Search"}
          </h3>
          <p className="text-xs" style={{ color:"var(--text-muted)" }}>
            {isAr ? "حساب فوري للمسافات" : "Instant distance calculation"}
          </p>
        </div>
        <button onClick={onClose} className="ms-auto" style={{ color:"var(--text-faint)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Travel mode */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:"var(--text-muted)" }}>
          {isAr ? "وسيلة التنقل" : "Travel mode"}
        </p>
        <div className="flex gap-2">
          {TRAVEL_MODES.map(({ value, icon, label, labelAr }) => (
            <button key={value} onClick={() => setMode(value)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition"
              style={{
                border:`1px solid ${mode===value?"#f59e0b":"var(--border)"}`,
                background: mode===value?"rgba(245,158,11,0.1)":"var(--surface2)",
                color: mode===value?"#f59e0b":"var(--text-muted)",
              }}>
              {icon} {isAr?labelAr:label}
            </button>
          ))}
        </div>
      </div>

      {/* Existing locations */}
      {locations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:"var(--text-muted)" }}>
            {isAr ? "مواقعك" : "Your locations"} ({locations.length})
          </p>
          {locations.map((loc) => (
            <LocationCard key={loc.id} loc={loc} isAr={isAr}
              onRemove={() => removeLocation(loc.id)}
              onUpdateTime={(m) => updateTime(loc.id, m)} />
          ))}
        </div>
      )}

      {/* Add form */}
      <AddForm onAdd={addLocation} isAr={isAr} />

      {/* Apply */}
      {readyLocations.length > 0 && (
        <button
          onClick={() => { onApply({ locations: readyLocations, mode }); onClose(); }}
          className="w-full rounded-xl py-3 text-sm font-bold transition"
          style={{ background:"#f59e0b", color:"#1A1612", boxShadow:"0 4px 12px rgba(245,158,11,0.3)" }}>
          {isAr
            ? `البحث بالقرب من ${readyLocations.length} موقع ←`
            : `Search Near ${readyLocations.length} Location${readyLocations.length>1?"s":""} →`}
        </button>
      )}
    </div>
  );
}