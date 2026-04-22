import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import AISearchPanel, { type ParsedFilters } from "./AISearchPanel";
import VisualSearchPanel from "./VisualSearchPanel";
import CommuteSearchPanel, { type CommuteFilters, type CommuteLocation } from "./CommuteSearchPanel";
import LocationSearch from "./LocationSearch";

type SearchMode = "text" | "ai" | "visual" | "commute";
type Props = {
  onAISearch?: (filters: ParsedFilters) => void;
  onCommuteSearch?: (filters: CommuteFilters) => void;
  onTextSearch?: (value: string) => void;
  onLocationSelect?: (display: string, govValue: string, subValue?: string) => void;
  // Saved places integration
  savedPlaces?: CommuteLocation[];
  onAddPlace?: (loc: CommuteLocation) => void;
  onRemovePlace?: (id: string) => void;
  onUpdatePlace?: (id: string, maxMinutes: number) => void;
};

export function NoResultsBanner({ mode, onReset }: { mode?: SearchMode; onReset: () => void }) {
  const { t } = useTranslation();
  const messages: Record<SearchMode, { emoji: string; title: string; sub: string }> = {
    text:    { emoji: "🔍", title: t("search.noResults.text"),    sub: t("search.noResults.textSub") },
    ai:      { emoji: "🤖", title: t("search.noResults.ai"),      sub: t("search.noResults.aiSub") },
    visual:  { emoji: "🖼️", title: t("search.noResults.visual"),  sub: t("search.noResults.visualSub") },
    commute: { emoji: "🕐", title: t("search.noResults.commute"), sub: t("search.noResults.commuteSub") },
  };
  const msg = messages[mode ?? "text"];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        {msg.emoji}
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{msg.title}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{msg.sub}</p>
      </div>
      <button onClick={onReset} className="rounded-xl px-4 py-2 text-xs font-medium transition"
        style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
        {t("search.noResults.resetBtn")}
      </button>
    </div>
  );
}

const MODES = [
  { id: "ai" as const,      label: "aiSearch", activeColor: "border-cyan-500 bg-cyan-500/15 text-cyan-300",     dotColor: "bg-cyan-400",
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
  { id: "visual" as const,  label: "visual",   activeColor: "border-violet-500 bg-violet-500/15 text-violet-300", dotColor: "bg-violet-400",
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { id: "commute" as const, label: "commute",  activeColor: "border-amber-500 bg-amber-500/15 text-amber-300",   dotColor: "bg-amber-400",
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
] as const;

export default function SearchBar({ 
  onAISearch, 
  onCommuteSearch, 
  onTextSearch,
  onLocationSelect,
  savedPlaces,
  onAddPlace,
  onRemovePlace,
  onUpdatePlace,
}: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [mode, setMode]           = useState<SearchMode>("text");
  const [panelOpen, setPanelOpen] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false);
    }
    if (panelOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  const isSpecial = mode !== "text";

  function clearMode() { setMode("text"); setPanelOpen(false); setAiSummary(""); }
  function handleAIResults(f: ParsedFilters) { setAiSummary(f.naturalSummary); onAISearch?.(f); setPanelOpen(false); }
  function handleVisualResults(f: ParsedFilters) { setAiSummary(f.naturalSummary); onAISearch?.(f); setPanelOpen(false); }
  function handleCommuteApply(f: CommuteFilters) {
    onCommuteSearch?.(f); setPanelOpen(false);
  }

  // Generate commute summary from savedPlaces (reactive)
  const commuteSummaryText = useMemo(() => {
    if (!savedPlaces || savedPlaces.length === 0) return "";
    const maxTime = Math.max(...savedPlaces.map(p => p.maxMinutes));
    const names = savedPlaces.map(p => p.label).join(", ");
    return `≤${maxTime}min from ${names}`;
  }, [savedPlaces]);

  return (
    <div className="relative" ref={panelRef}>
      <div className="flex items-center gap-2">

        {!isSpecial && (
          <div className="relative flex-1">
            <LocationSearch
              value={textValue}
              onChange={(display, govValue, subValue) => {
                setTextValue(display);
                onTextSearch?.(display);
                onLocationSelect?.(display, govValue, subValue);
              }}
              variant="compact"
              placeholder={isAr ? "محافظة أو حي أو مدينة…" : "Governorate, district or city…"}
              inputClassName="w-full h-11 rounded-full text-sm outline-none transition"
              inputStyle={{ border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", paddingInlineStart:"1rem", paddingInlineEnd:"1rem" }}
            />
          </div>
        )}

        {isSpecial && (
          <div className="flex-1">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${MODES.find((m) => m.id === mode)?.activeColor}`}>
              {MODES.find((m) => m.id === mode)?.icon}
              <span className="max-w-[200px] truncate">{mode === "commute" ? commuteSummaryText : aiSummary || t(`search.${MODES.find((m) => m.id === mode)?.label}`)}</span>
              <button onClick={clearMode} className="ms-1 opacity-60 hover:opacity-100">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}

        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <button key={m.id}
              onClick={() => isActive ? setPanelOpen((o) => !o) : (() => { setMode(m.id); setPanelOpen(true); })()}
              className={`relative shrink-0 h-11 px-3.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${isActive ? m.activeColor : ""}`}
              style={!isActive ? { border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)" } : {}}>
              {isActive && <span className={`w-1.5 h-1.5 rounded-full ${m.dotColor} animate-pulse`} />}
              {m.icon}
              <span className="hidden sm:inline">{t(`search.${m.label}`)}</span>
            </button>
          );
        })}
      </div>

      {panelOpen && isSpecial && (
        <div className="absolute top-full start-0 end-0 mt-2 z-50 rounded-2xl p-5 animate-fadeIn"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
          {mode === "ai"      && <AISearchPanel      onResults={handleAIResults}    onClose={() => setPanelOpen(false)} />}
          {mode === "visual"  && <VisualSearchPanel  onResults={handleVisualResults} onClose={() => setPanelOpen(false)} />}
          {mode === "commute" && <CommuteSearchPanel 
            onApply={handleCommuteApply}    
            onClose={() => setPanelOpen(false)}
            savedPlaces={savedPlaces}
            onAddPlace={onAddPlace}
            onRemovePlace={onRemovePlace}
            onUpdatePlace={onUpdatePlace}
          />}
        </div>
      )}
    </div>
  );
}