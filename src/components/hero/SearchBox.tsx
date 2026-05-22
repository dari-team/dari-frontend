import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LocationSearch from "../search/LocationSearch";
import { Hieroglyph } from "../pharaonic/Glyphs";

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
      className="w-full"
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--gold)",
        borderRadius: 10,
        boxShadow: "var(--shadow-xl)",
        padding: 14,
      }}
    >
      {/* Buy / Rent toggle */}
      <div className="flex mb-3 rounded-md p-1" style={{ background: "var(--bg-secondary)" }}>
        {(["buy", "rent"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2.5 rounded font-semibold transition text-sm"
            style={
              mode === m
                ? { background: "var(--gold-gradient)", color: "#1F1A12", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--text-muted)" }
            }
          >
            {m === "buy" ? (isAr ? "شراء" : "Buy") : (isAr ? "إيجار" : "Rent")}
          </button>
        ))}
      </div>

      {/* Inputs — stack on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-2 sm:flex-wrap items-stretch sm:items-center">
        <div className="w-full sm:flex-1 sm:min-w-[180px] relative">
          <div className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none" style={{ insetInlineStart: 12, color: "var(--gold-deep)" }}>
            <Hieroglyph kind="eye" size={16} color="currentColor" strokeWidth={1.6} />
          </div>
          <LocationSearch
            value={location}
            onChange={(display, gov, sub) => {
              setLocation(display);
              setGovValue(sub || gov);
            }}
            variant="hero"
            placeholder={isAr ? "محافظة أو حي…" : "Governorate or district…"}
            inputClassName="w-full rounded-md text-sm outline-none transition"
            inputStyle={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: "11px 12px",
              paddingInlineStart: "2.25rem",
            }}
          />
        </div>

        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="w-full sm:w-auto rounded-md px-3 py-3 text-sm outline-none transition sm:min-w-[130px]"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <option value="">{isAr ? "أي نوع" : "Any type"}</option>
          {PROPERTY_TYPES.map(({ value, label, labelAr }) => (
            <option key={value} value={value}>{isAr ? labelAr : label}</option>
          ))}
        </select>

        <button
          onClick={handleSearch}
          className="ph-btn-gold w-full sm:w-auto px-6 py-3 rounded-md font-bold text-sm active:scale-95"
        >
          {t("hero.searchBtn")}
        </button>
      </div>
    </div>
  );
}
