// src/components/search/SavedPlacesPanel.tsx
// Panel for managing saved places (work, school, family, etc.)

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SavedPlace } from "../../hooks/useSavedPlaces";
import { TYPE_COLORS } from "../../hooks/useSavedPlaces";
import PlacesAutocomplete from "./PlacesAutocomplete";

type Props = {
  places: SavedPlace[];
  onAddPlace: (data: Omit<SavedPlace, "id" | "color">) => void;
  onRemovePlace: (id: string) => void;
  onUpdatePlace: (id: string, updates: Partial<SavedPlace>) => void;
  onClose: () => void;
};

const PLACE_TYPES: { value: SavedPlace["type"]; icon: string; label: string; labelAr: string }[] = [
  { value: "work", icon: "💼", label: "Work", labelAr: "عمل" },
  { value: "school", icon: "🏫", label: "School", labelAr: "مدرسة" },
  { value: "gym", icon: "🏋️", label: "Gym", labelAr: "نادي" },
  { value: "family", icon: "❤️", label: "Family", labelAr: "أهل" },
  { value: "other", icon: "📍", label: "Other", labelAr: "أخرى" },
];

const TIME_PRESETS = [10, 15, 20, 30, 45, 60];

function PlaceCard({
  place,
  onRemove,
  onUpdateTime,
  isAr,
}: {
  place: SavedPlace;
  onRemove: () => void;
  onUpdateTime: (minutes: number) => void;
  isAr: boolean;
}) {
  const typeInfo = PLACE_TYPES.find((t) => t.value === place.type);

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        background: "var(--surface)",
        border: `1px solid ${place.color}30`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
            style={{ background: `${place.color}20` }}
          >
            {typeInfo?.icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
              {place.label}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-faint)" }}>
              {place.address}
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-500/10 transition"
          style={{ color: "var(--danger)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {TIME_PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => onUpdateTime(m)}
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold transition"
            style={{
              border: `1px solid ${place.maxMinutes === m ? place.color : "var(--border)"}`,
              background: place.maxMinutes === m ? `${place.color}20` : "transparent",
              color: place.maxMinutes === m ? place.color : "var(--text-muted)",
            }}
          >
            {m}{isAr ? "د" : "min"}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddPlaceForm({
  onAdd,
  isAr,
}: {
  onAdd: (data: Omit<SavedPlace, "id" | "color">) => void;
  isAr: boolean;
}) {
  const [type, setType] = useState<SavedPlace["type"]>("work");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    padding: "8px 12px",
    fontSize: 13,
    color: "var(--text)",
    outline: "none",
  };

  function handleSelectPlace(result: { description: string; lat: number; lng: number; placeId?: string }) {
    setAddress(result.description);
    setCoords({ lat: result.lat, lng: result.lng });
    setError("");
  }

  function handleAdd() {
    if (!label.trim()) {
      setError(isAr ? "أدخل اسم الموقع" : "Enter a name");
      return;
    }
    if (!coords) {
      setError(isAr ? "اختر من الاقتراحات" : "Pick from suggestions");
      return;
    }

    onAdd({
      type,
      label: label.trim(),
      address,
      lat: coords.lat,
      lng: coords.lng,
      maxMinutes: 30,
    });

    // Reset form
    setLabel("");
    setAddress("");
    setCoords(null);
    setError("");
    setIsExpanded(false);
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition"
        style={{
          background: "var(--surface2)",
          border: "1px dashed var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {isAr ? "إضافة موقع جديد" : "Add new place"}
      </button>
    );
  }

  return (
    <div
      className="rounded-xl p-3 space-y-3"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
          {isAr ? "إضافة موقع" : "Add place"}
        </span>
        <button onClick={() => setIsExpanded(false)} style={{ color: "var(--text-faint)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Type pills */}
      <div className="flex flex-wrap gap-1.5">
        {PLACE_TYPES.map(({ value, icon, label: lbl, labelAr }) => (
          <button
            key={value}
            onClick={() => setType(value)}
            className="rounded-full px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1"
            style={{
              border: `1px solid ${type === value ? TYPE_COLORS[value] : "var(--border)"}`,
              background: type === value ? `${TYPE_COLORS[value]}20` : "transparent",
              color: type === value ? TYPE_COLORS[value] : "var(--text-muted)",
            }}
          >
            {icon} {isAr ? labelAr : lbl}
          </button>
        ))}
      </div>

      {/* Name */}
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={isAr ? "اسم الموقع (مثال: شغلي)" : "Name (e.g. My Office)"}
        style={inputStyle}
        dir={isAr ? "rtl" : "ltr"}
      />

      {/* Address with Places Autocomplete */}
      <PlacesAutocomplete
        value={address}
        onChange={(v) => {
          setAddress(v);
          setCoords(null);
          setError("");
        }}
        onSelect={handleSelectPlace}
        placeholder={isAr ? "ابحث عن العنوان…" : "Search address…"}
        inputStyle={inputStyle}
        country="eg"
      />

      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {coords && (
        <p className="text-xs flex items-center gap-1" style={{ color: "var(--success)" }}>
          ✓ {isAr ? "تم تحديد الموقع" : "Location confirmed"}
        </p>
      )}

      <button
        onClick={handleAdd}
        disabled={!label.trim() || !coords}
        className="w-full rounded-lg py-2 text-sm font-semibold transition disabled:opacity-40"
        style={{
          background: TYPE_COLORS[type],
          color: "white",
        }}
      >
        {isAr ? "إضافة" : "Add"}
      </button>
    </div>
  );
}

export default function SavedPlacesPanel({
  places,
  onAddPlace,
  onRemovePlace,
  onUpdatePlace,
  onClose,
}: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  return (
    <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pe-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.15)", border: "1px solid #3b82f6" }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: "#3b82f6" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {isAr ? "الأماكن المحفوظة" : "Saved Places"}
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isAr ? "أماكنك المهمة للتنقل" : "Your important commute destinations"}
          </p>
        </div>
        <button onClick={onClose} className="ms-auto" style={{ color: "var(--text-faint)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Info banner */}
      {places.length === 0 && (
        <div
          className="rounded-xl p-3 text-xs"
          style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
        >
          {isAr
            ? "أضف أماكنك المهمة (العمل، المدرسة، إلخ) لنجد لك العقارات الأقرب إليها ونعرضها بشكل مميز على الخريطة."
            : "Add your important places (work, school, etc.) and we'll find the nearest listings and highlight them on the map."}
        </div>
      )}

      {/* Existing places */}
      {places.length > 0 && (
        <div className="space-y-2">
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isAr={isAr}
              onRemove={() => onRemovePlace(place.id)}
              onUpdateTime={(m) => onUpdatePlace(place.id, { maxMinutes: m })}
            />
          ))}
        </div>
      )}

      {/* Add form */}
      <AddPlaceForm onAdd={onAddPlace} isAr={isAr} />

      {/* Stats */}
      {places.length > 0 && (
        <div
          className="rounded-xl p-3 flex items-center justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {isAr ? "أقرب ٢٠ عقار" : "Nearest 20 listings"}
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {isAr ? "محددة بدائرة حمراء" : "Marked with red circle"}
            </p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              border: "2px solid #ef4444",
              background: "rgba(239,68,68,0.1)",
            }}
          >
            <span className="text-xs font-bold" style={{ color: "#ef4444" }}>
              20
            </span>
          </div>
        </div>
      )}
    </div>
  );
}