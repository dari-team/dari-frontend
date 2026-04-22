import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LocationSearch from "../search/LocationSearch";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment",  labelAr: "شقة"      },
  { value: "villa",     label: "Villa",      labelAr: "فيلا"     },
  { value: "studio",    label: "Studio",     labelAr: "استوديو"  },
  { value: "duplex",    label: "Duplex",     labelAr: "دوبلكس"   },
  { value: "penthouse", label: "Penthouse",  labelAr: "بنتهاوس"  },
];

export default function SearchBox() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [mode,         setMode]         = useState<"buy" | "rent">("buy");
  const [location,     setLocation]     = useState("");
  const [govValue,     setGovValue]     = useState("");
  const [propertyType, setPropertyType] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (mode === "rent")   params.set("type", "rent");
    if (location.trim())   params.set("q", location.trim());
    if (govValue)          params.set("city", govValue);
    if (propertyType)      params.set("prop", propertyType);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div
      className="backdrop-blur-2xl rounded-2xl p-6 w-full max-w-3xl shadow-2xl"
      style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}
    >
      {/* Buy / Rent toggle */}
      <div className="flex mb-5 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.1)" }}>
        {(["buy", "rent"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-lg font-semibold transition text-sm"
            style={
              mode === m
                ? { background: "white", color: "#1A1612", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }
                : { color: "rgba(255,255,255,0.75)" }
            }
          >
            {m === "buy" ? (isAr ? "شراء" : "Buy") : (isAr ? "إيجار" : "Rent")}
          </button>
        ))}
      </div>

      {/* Inputs row */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Location — Dubizzle-style, zero API */}
        <div className="flex-1 min-w-[200px]">
          <LocationSearch
            value={location}
            onChange={(display, gov, sub) => {
              setLocation(display);
              // Use district slug if available, otherwise governorate
              setGovValue(sub || gov);
            }}
            variant="hero"
            placeholder={isAr ? "محافظة أو حي…" : "Governorate or district…"}
            inputClassName="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
            inputStyle={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.35)",
              color: "white",
              paddingInlineStart: "2.25rem",
            }}
          />
        </div>

        {/* Property type */}
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="rounded-xl px-4 py-3 text-sm outline-none transition"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.35)",
            color: "white",
          }}
        >
          <option value="" style={{ color: "#1A1612" }}>{isAr ? "أي نوع" : "Any type"}</option>
          {PROPERTY_TYPES.map(({ value, label, labelAr }) => (
            <option key={value} value={value} style={{ color: "#1A1612" }}>
              {isAr ? labelAr : label}
            </option>
          ))}
        </select>

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="px-6 py-3 rounded-xl font-bold text-sm transition active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          {t("hero.searchBtn")}
        </button>
      </div>
    </div>
  );
}