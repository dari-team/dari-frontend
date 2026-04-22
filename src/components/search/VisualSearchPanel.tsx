import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ParsedFilters } from "./AISearchPanel";

type Props = { onResults: (f: ParsedFilters) => void; onClose: () => void; };

async function analyzePropertyImage(base64: string, mediaType: string): Promise<ParsedFilters> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 400,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text",  text: `Analyze this property image for the Egyptian market. Return JSON only:\n{"propertyType":"apartment"|"villa"|"studio"|"duplex"|"penthouse"|"office"|"shop"|"land"|null,"finishing":"fully_finished"|"semi_finished"|"core_shell"|"furnished"|"unfurnished"|null,"listingType":"buy"|"rent"|null,"beds":N|null,"naturalSummary":"one English sentence describing type and style"}` }
      ]}],
    }),
  });
  const data = await res.json();
  const p = JSON.parse((data.content?.[0]?.text || "{}").replace(/```json|```/g,"").trim());
  return { propertyType: p.propertyType??undefined, finishing: p.finishing??undefined, listingType: p.listingType??undefined, beds: p.beds??undefined, naturalSummary: p.naturalSummary||"Property matching this style" };
}

export default function VisualSearchPanel({ onResults, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [preview, setPreview] = useState<string|null>(null);
  const [b64, setB64]         = useState("");
  const [mtype, setMtype]     = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [parsed, setParsed]   = useState<ParsedFilters|null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    if (!file.type.startsWith("image/")) { setError(isAr ? "يرجى رفع صورة." : "Please upload an image file."); return; }
    if (file.size > 5*1024*1024) { setError(isAr ? "الصورة أكبر من 5 ميجا." : "Image must be under 5MB."); return; }
    setError(""); setParsed(null);
    const reader = new FileReader();
    reader.onload = (e) => { const r = e.target?.result as string; setPreview(r); setB64(r.split(",")[1]); setMtype(file.type); };
    reader.readAsDataURL(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }, []);

  async function handleAnalyze() {
    if (!b64) return;
    setLoading(true); setError("");
    try { setParsed(await analyzePropertyImage(b64, mtype)); }
    catch { setError(isAr ? "تعذّر تحليل الصورة." : "Could not analyze the image."); }
    finally { setLoading(false); }
  }

  const tagStyle: React.CSSProperties = { display:"inline-flex", alignItems:"center", gap:4, borderRadius:999, border:"1px solid var(--border)", background:"var(--surface2)", padding:"2px 10px", fontSize:11, color:"var(--text-secondary)" };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:"rgba(167,139,250,0.15)", border:"1px solid #a78bfa" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color:"#a78bfa" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color:"var(--text)" }}>{isAr ? "البحث البصري" : "Visual Property Search"}</h3>
          <p className="text-xs" style={{ color:"var(--text-muted)" }}>{isAr ? "ارفع صورة عقار — الذكاء الاصطناعي يجد مشابهاً" : "Upload a property photo — AI finds similar listings"}</p>
        </div>
        <button onClick={onClose} className="ms-auto" style={{ color:"var(--text-faint)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Drop zone */}
      {!preview ? (
        <div onDragOver={(e)=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 py-10 transition-all duration-200"
          style={{ borderColor: dragging ? "#a78bfa" : "var(--border)", background: dragging ? "rgba(167,139,250,0.08)" : "var(--surface2)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color:"var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color:"var(--text)" }}>{isAr ? "اسحب صورة هنا أو اضغط للتصفح" : "Drop a property photo here"}</p>
            <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>JPG, PNG, WEBP · {isAr ? "حجم أقصى 5 ميجا" : "max 5MB"}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden group" style={{ border:"1px solid var(--border)" }}>
          <img src={preview} alt="Uploaded" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center" style={{ background:"rgba(0,0,0,0.4)" }}>
            <button onClick={() => { setPreview(null); setB64(""); setParsed(null); }}
              className="rounded-xl px-3 py-1.5 text-xs text-white transition" style={{ border:"1px solid rgba(255,255,255,0.3)", background:"rgba(0,0,0,0.6)" }}>
              {isAr ? "تغيير الصورة" : "Change photo"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs rounded-xl px-3 py-2" style={{ border:"1px solid var(--danger)", background:"var(--danger-light)", color:"var(--danger)" }}>{error}</p>}

      {preview && !parsed && (
        <button onClick={handleAnalyze} disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
          style={{ background:"#a78bfa" }}>
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isAr ? "جارٍ التحليل…" : "Analyzing…"}</>
            : <>{isAr ? "ابحث عن عقارات مشابهة" : "Find Similar Properties"}</>
          }
        </button>
      )}

      {parsed && (
        <div className="rounded-2xl p-4 space-y-3" style={{ border:"1px solid #a78bfa", background:"rgba(167,139,250,0.08)" }}>
          <p className="text-xs font-medium" style={{ color:"#a78bfa" }}>{parsed.naturalSummary}</p>
          <div className="flex flex-wrap gap-1.5">
            {parsed.propertyType && <span style={tagStyle}>🏠 {parsed.propertyType}</span>}
            {parsed.finishing     && <span style={tagStyle}>✨ {parsed.finishing.replace(/_/g," ")}</span>}
            {parsed.beds          && <span style={tagStyle}>🛏 ~{parsed.beds} {isAr ? "غرف" : "beds"}</span>}
          </div>
          <button onClick={() => { onResults(parsed); onClose(); }}
            className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition"
            style={{ background:"#a78bfa" }}>
            {isAr ? "عرض عقارات مشابهة ←" : "Show Similar Listings →"}
          </button>
        </div>
      )}
    </div>
  );
}