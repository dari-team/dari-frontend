import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Listing } from "../data/listings";
import { AMENITIES, AMENITY_GROUP_LABELS, AMENITY_GROUP_ORDER } from "../data/amenities";
import ListingCard from "../components/search/ListingCard";
import LifestyleBreakdown from "../components/listing/LifestyleBreakdown";
import ReportListingModal from "../components/listing/ReportListingModal";
import { useAuth } from "../context/AuthContext";
import { inquiryApi, extractErrorMessage, listingApi, type ListingViewSource } from "../lib/api";
import { mapListingResponse, mapListingResponses } from "../lib/listingMap";
import { useWishlistSave } from "../hooks/useWishlistSave";

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoRow({ label,value }:{ label:string; value:string }) {
  return (
    <div className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom:"1px solid var(--border-light)" }}>
      <span className="text-xs" style={{ color:"var(--text-faint)" }}>{label}</span>
      <span className="text-xs font-semibold capitalize" style={{ color:"var(--text)" }}>{value}</span>
    </div>
  );
}

function FieldError({ msg }:{ msg?:string }) {
  if (!msg) return null;
  return <p className="text-[11px] mt-0.5 ps-1" style={{ color:"var(--danger)" }}>{msg}</p>;
}

function ImagePlaceholder({ title }:{ title:string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
      style={{ background:"linear-gradient(135deg, var(--surface2), var(--bg-secondary))" }}>
      <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color:"var(--text-faint)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 21V12h6v9" />
      </svg>
      <p className="text-xs text-center px-6" style={{ color:"var(--text-faint)" }}>{title}</p>
    </div>
  );
}

// ── Contact / Inquiry section ─────────────────────────────────────────────────
function ContactSection({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isBuyer = isAuthenticated && user?.user_type === "buyer";
  const isLister = isAuthenticated && (user?.user_type === "lister" || user?.user_type === "agent");

  const [message, setMessage] = useState(`Hi, I'm interested in "${listingTitle}". Could you provide more details?`);
  const [status,  setStatus]  = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const [errMsg,  setErrMsg]  = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 10) {
      setErrMsg("Message must be at least 10 characters."); return;
    }
    setStatus("loading"); setErrMsg("");
    try {
      await inquiryApi.create(listingId, message.trim());
      setStatus("success");
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to send inquiry.");
      if (msg.toLowerCase().includes("already have an open inquiry")) {
        setStatus("duplicate");
      } else {
        setStatus("error");
        setErrMsg(msg);
      }
    }
  }

  // ── Not logged in ──
  if (!isAuthenticated) return (
    <div className="text-center py-2 space-y-3">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sign in to contact the lister about this property.</p>
      <button
        onClick={() => navigate("/login", { state: { from: { pathname: window.location.pathname } } })}
        className="w-full rounded-xl py-2.5 text-sm font-bold transition active:scale-95"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
        Sign in to Inquire
      </button>
    </div>
  );

  // ── Lister / agent viewing ──
  if (isLister) return (
    <p className="text-xs text-center py-2" style={{ color: "var(--text-faint)" }}>
      You're signed in as a lister. Inquiries are for buyers.
    </p>
  );

  // ── Sent successfully ──
  if (status === "success") return (
    <div className="py-4 text-center space-y-2">
      <p className="text-2xl">✅</p>
      <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>Inquiry sent!</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>The lister has been notified and will reply soon.</p>
      <Link to="/inquiries" className="text-xs font-semibold transition" style={{ color: "var(--accent)" }}>
        View my inquiries →
      </Link>
    </div>
  );

  // ── Duplicate open inquiry ──
  if (status === "duplicate") return (
    <div className="py-4 text-center space-y-2">
      <p className="text-2xl">💬</p>
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>You already have an open inquiry</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Continue the conversation from your inquiries page.</p>
      <Link to="/inquiries" className="text-xs font-semibold transition" style={{ color: "var(--accent)" }}>
        Go to my inquiries →
      </Link>
    </div>
  );

  // ── Buyer form ──
  return (
    <form onSubmit={handleSend} noValidate className="space-y-2.5">
      {status === "error" && errMsg && (
        <div className="rounded-xl px-3 py-2.5 text-xs" style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>
          ⚠️ {errMsg}
        </div>
      )}
      <textarea
        rows={3}
        value={message}
        onChange={(e) => { setMessage(e.target.value); setErrMsg(""); }}
        placeholder={`Hi, I'm interested in "${listingTitle}"...`}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition resize-none"
        style={{ border: `1px solid ${errMsg ? "var(--danger)" : "var(--border)"}`, background: "var(--surface2)", color: "var(--text)" }}
      />
      {errMsg && <p className="text-[11px] ps-1" style={{ color: "var(--danger)" }}>{errMsg}</p>}
      <button
        type="submit"
        disabled={status === "loading" || !message.trim()}
        className="w-full rounded-xl py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
        {status === "loading"
          ? <><span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Sending…</>
          : "Send Inquiry"
        }
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ListingPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isSaved, toggleSave, saving: savingWishlist } = useWishlistSave();
  const { id = "" } = useParams();
  const routerLocation = useLocation();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [imgErrors,   setImgErrors]   = useState<Set<number>>(new Set());
  const [saveErr,     setSaveErr]     = useState("");
  const [showReport,  setShowReport]  = useState(false);

  const saved = isSaved(id);

  // Classify the visit source for ListingView analytics. If user came from
  // /search we log "search"; otherwise "direct". Map/saved are tagged by callers
  // that use ?source= in the query string directly.
  useEffect(() => {
    if (!id) return;
    setActiveImage(0);
    setImgErrors(new Set());
    setLoading(true);

    const urlSource = new URLSearchParams(routerLocation.search).get("source");
    const referrerIsSearch = document.referrer.includes("/search");
    const source: ListingViewSource =
      (urlSource as ListingViewSource) ||
      (referrerIsSearch ? "search" : "direct");

    listingApi
      .getById(id)
      .then((res) => {
        setListing(mapListingResponse(res.data));
        setLoading(false);
        // Record the view separately so the GET stays a pure read. Deduped and
        // owner-excluded server-side; failures must not affect the page.
        listingApi.recordView(id, source).catch(() => {});
      })
      .catch(() => {
        setListing(null);
        setLoading(false);
      });
  }, [id, routerLocation.search]);

  // Fetch similar listings once main listing lands — filter by city, exclude self.
  useEffect(() => {
    if (!listing) return;
    listingApi
      .filter({ city: listing.city })
      .then((res) => {
        const mapped = mapListingResponses(res.data).filter((l) => l.id !== listing.id).slice(0, 4);
        setSimilarListings(mapped);
      })
      .catch(() => setSimilarListings([]));
  }, [listing?.id, listing?.city]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
      <div className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
        <span className="w-4 h-4 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        {isAr ? "جار التحميل…" : "Loading…"}
      </div>
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
      <div className="text-center space-y-3">
        <p className="text-4xl">🏚</p>
        <h1 className="text-xl font-bold" style={{ color:"var(--text)" }}>
          {isAr ? "الإعلان غير موجود" : "Listing not found"}
        </h1>
        <Link to="/search" className="inline-block text-sm" style={{ color:"var(--accent)" }}>← {t("listing.back")}</Link>
      </div>
    </div>
  );

  const rawImages = listing.images ?? [];
  const validImages = rawImages.filter((_,i)=>!imgErrors.has(i));
  const hasImages = validImages.length > 0;
  const safeActive = Math.min(activeImage, Math.max(0,validImages.length-1));
  const prev = ()=>setActiveImage((c)=>(c-1+validImages.length)%validImages.length);
  const next = ()=>setActiveImage((c)=>(c+1)%validImages.length);
  const handleImgError = (rawIdx:number)=>setImgErrors((p)=>new Set(p).add(rawIdx));

  const isRent = listing.listingType === "rent";

  // Real lister shown in the contact card (replaces the old hardcoded agent).
  const lister = listing.lister;
  const listerName = lister?.name?.trim() || (isAr ? "صاحب الإعلان" : "Property owner");
  const listerInitials =
    listerName.split(/\s+/).map((w) => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "?";
  const listerIsAgent = lister?.listerType === 1;
  const listerRole = listerIsAgent
    ? (isAr ? "وكيل عقاري" : "Property Agent")
    : (isAr ? "صاحب العقار" : "Property Owner");
  const listerPhone = lister?.phoneNumber?.trim() || "";

  // Canonical finishing values stored by the listing form.
  const FINISHING_LABELS: Record<string,string> = {
    fully_finished: isAr?"تشطيب كامل":"Fully Finished",
    semi_finished:  isAr?"نص تشطيب":"Semi Finished",
    core_shell:     isAr?"هيكل":"Core & Shell",
    furnished:      isAr?"مفروش":"Furnished",
    unfurnished:    isAr?"غير مفروش":"Unfurnished",
  };
  const finishingText = listing.finishing
    ? (FINISHING_LABELS[listing.finishing] ?? listing.finishing)
    : null;
  // Street/unit as entered on the form — Arabic UI prefers streetAr, else streetLatin,
  // falling back to the raw typed street. Shown only when the lister provided one.
  const streetText = (isAr
    ? (listing.streetAr || listing.street)
    : (listing.streetLatin || listing.street))?.trim() || null;

  // Payment method: Cash=0, Installments=1, Both=2
  const PAYMENT_LABELS: Record<number,string> = {
    0: isAr?"كاش":"Cash",
    1: isAr?"تقسيط":"Installments",
    2: isAr?"كاش أو تقسيط":"Cash or Installments",
  };
  // Completion status: Ready=0, OffPlan=1
  const COMPLETION_LABELS: Record<number,string> = {
    0: isAr?"جاهز للسكن":"Ready to move",
    1: isAr?"تحت الإنشاء":"Off-plan",
  };

  return (
    <div className="pb-20" style={{ background:"var(--bg)", color:"var(--text)" }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes imgReveal{ from{opacity:0;transform:scale(1.03)} to{opacity:1;transform:scale(1)} }
        .fade-up    { animation:fadeUp    280ms ease-out forwards; }
        .img-reveal { animation:imgReveal 260ms ease-out forwards; }
      `}</style>

      {/* ── HERO GALLERY ── */}
      <div className="relative w-full" style={{ height: "min(50vh, 380px)", minHeight: 220 }}>
        {hasImages ? (
          <img key={safeActive} src={validImages[safeActive]} alt={listing.title}
            onError={()=>handleImgError(rawImages.indexOf(validImages[safeActive]))}
            className="img-reveal absolute inset-0 h-full w-full object-cover" />
        ) : (
          <ImagePlaceholder title={listing.title} />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Top nav */}
        <div className="absolute top-0 start-0 end-0 flex items-center justify-between gap-2 px-3 sm:px-5 pt-3 sm:pt-4 flex-wrap">
          <Link to="/search"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white backdrop-blur transition"
            style={{ border:"1px solid rgba(255,255,255,0.2)", background:"rgba(0,0,0,0.4)" }}>
            {isAr ? "→ العودة للبحث" : "← Back to search"}
          </Link>
          <div className="flex items-center gap-2">
            <button
              disabled={savingWishlist}
              onClick={async () => {
                if (!isAuthenticated) { navigate("/login"); return; }
                const { error } = await toggleSave(id);
                if (error && error !== "login") { setSaveErr(error); setTimeout(() => setSaveErr(""), 3500); }
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur transition"
              style={{
                border: `1px solid ${saved?"rgba(244,63,94,0.5)":"rgba(255,255,255,0.2)"}`,
                background: saved?"rgba(244,63,94,0.2)":"rgba(0,0,0,0.4)",
                color: saved?"#f43f5e":"white",
                opacity: savingWishlist ? 0.6 : 1,
              }}>
              <svg className="h-3.5 w-3.5" fill={saved?"currentColor":"none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {savingWishlist ? "…" : saved ? t("listing.saved") : t("listing.save")}
            </button>
            {saveErr && (
              <span className="rounded-full px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
                style={{ background:"rgba(239,68,68,0.85)", border:"1px solid rgba(239,68,68,0.4)" }}>
                {saveErr}
              </span>
            )}
            <span className="rounded-full px-3 py-1.5 text-xs font-bold"
              style={{ background:isRent?"var(--success)":"var(--accent)", color:"white" }}>
              {isRent ? t("listing.forRent") : t("listing.forSale")}
            </span>
          </div>
        </div>

        {/* Arrows */}
        {validImages.length > 1 && (
          <>
            <button onClick={prev} aria-label={isAr ? "السابق" : "Previous"}
              className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-lg text-white backdrop-blur transition"
              style={{ border:"1px solid rgba(255,255,255,0.2)", background:"rgba(0,0,0,0.5)" }}>‹</button>
            <button onClick={next} aria-label="Next"
              className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-lg text-white backdrop-blur transition"
              style={{ border:"1px solid rgba(255,255,255,0.2)", background:"rgba(0,0,0,0.5)" }}>›</button>
          </>
        )}

        {/* Dots */}
        {validImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {validImages.map((_,i)=>(
              <button key={i} onClick={()=>setActiveImage(i)}
                className="rounded-full transition-all"
                style={{ width:i===safeActive?24:8, height:8, background:i===safeActive?"var(--accent)":"rgba(255,255,255,0.4)" }} />
            ))}
          </div>
        )}

        {listing.badge && (
          <div className="absolute bottom-5 start-5">
            <span className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg" style={{ background:"var(--gold)", color:"#1A1612" }}>
              {listing.badge}
            </span>
          </div>
        )}

        {/* Thumbnail strip — hide on small screens (dots are enough) */}
        {validImages.length > 1 && (
          <div className="hidden sm:flex absolute bottom-4 end-4 gap-1.5">
            {validImages.map((img,i)=>(
              <button key={i} onClick={()=>setActiveImage(i)}
                className="overflow-hidden rounded-lg border-2 transition"
                style={{ width:52, height:36, borderColor:i===safeActive?"var(--accent)":"transparent", opacity:i===safeActive?1:0.6 }}>
                <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 fade-up">

        {/* Price + Title */}
        <div className="flex flex-wrap items-end justify-between gap-4 py-5" style={{ borderBottom:"1px solid var(--border)" }}>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color:"var(--text)" }}>{listing.price}</p>
            </div>
            <h1 className="mt-1 text-lg font-semibold" style={{ color:"var(--text-secondary)" }}>{listing.title}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm" style={{ color:"var(--text-muted)" }}>
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color:"var(--accent)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {listing.location}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { icon:"🛏", val:`${listing.beds} ${t("listing.beds")}`  },
              { icon:"🚿", val:`${listing.baths} ${t("listing.baths")}`},
              { icon:"📐", val:`${listing.sqft} ${t("listing.area")}` },
              ...(finishingText ? [{ icon:"✨", val: finishingText }] : []),
            ].map(({ icon,val })=>(
              <div key={val} className="flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
                <span className="text-base">{icon}</span>
                <span className="text-xs font-medium whitespace-nowrap" style={{ color:"var(--text-secondary)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TWO COLUMN LAYOUT ── */}
        <div className="grid gap-4 sm:gap-6 pb-10 pt-4 sm:pt-6 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* LEFT */}
          <div className="space-y-5">

            {/* About */}
            <section className="rounded-2xl p-5" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color:"var(--text-muted)" }}>{t("listing.about")}</h2>
              {listing.description
                ? <p className="text-sm leading-7" style={{ color:"var(--text-secondary)" }}>{listing.description}</p>
                : <p className="text-sm italic" style={{ color:"var(--text-faint)" }}>
                    {isAr ? "لا يوجد وصف متاح." : "No description available."}
                  </p>
              }
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  finishingText ? `✨ ${finishingText}` : null,
                  listing.propertyType, listing.city, listing.area,
                ].filter(Boolean).map((tag)=>(
                  <span key={tag} className="rounded-full px-3 py-1 text-xs capitalize" style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Amenities — every amenity shown; ✓ if the property has it, ✕ if not */}
            <section className="rounded-2xl p-5" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color:"var(--text-muted)" }}>
                  {isAr ? "وسائل الراحة" : "Amenities"}
                </h2>
                <span className="text-xs" style={{ color:"var(--text-faint)" }}>
                  {listing.amenities.length}/{AMENITIES.length}
                </span>
              </div>
              <div className="space-y-5">
                {AMENITY_GROUP_ORDER.map((group) => (
                  <div key={group}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color:"var(--text-faint)" }}>
                      {isAr ? AMENITY_GROUP_LABELS[group].ar : AMENITY_GROUP_LABELS[group].en}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {AMENITIES.filter((a) => a.group === group).map((a) => {
                        const has = listing.amenities.includes(a.key);
                        return (
                          <div
                            key={a.key}
                            className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition"
                            style={{
                              border: `1px solid ${has ? "var(--accent)" : "var(--border)"}`,
                              background: has ? "var(--accent-light)" : "var(--surface2)",
                              opacity: has ? 1 : 0.55,
                            }}
                          >
                            <span className="text-base shrink-0" style={{ filter: has ? "none" : "grayscale(1)" }}>{a.icon}</span>
                            <span
                              className="text-xs font-medium leading-tight flex-1"
                              style={{ color: has ? "var(--accent)" : "var(--text-muted)", textDecoration: has ? "none" : "line-through" }}
                            >
                              {isAr ? a.labelAr : a.labelEn}
                            </span>
                            <span className="text-xs font-bold shrink-0" style={{ color: has ? "var(--success)" : "var(--text-faint)" }}>
                              {has ? "✓" : "✕"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Lifestyle Score — from calculated data */}
            {listing.lifestyleScore ? (
              <LifestyleBreakdown data={listing.lifestyleScore} />
            ) : (
              <section className="rounded-2xl p-5" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color:"var(--text-muted)" }}>{isAr ? "درجة الموقع" : "Lifestyle Score"}</h2>
                </div>
                <p className="text-xs text-center py-4" style={{ color:"var(--text-faint)" }}>
                  {isAr ? "لم تُحسب بعد." : "Not yet calculated."}
                </p>
              </section>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-4 lg:sticky lg:top-6 self-start">

            {/* Agent + inquiry card */}
            <section className="rounded-2xl overflow-hidden shadow-xl" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              {/* Lister */}
              <div className="p-4" style={{ borderBottom:"1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2"
                    style={{ background:"linear-gradient(135deg, var(--accent), var(--accent-hover))", ringColor:"var(--accent-light)" }}>
                    {listerInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate" style={{ color:"var(--text)" }}>{listerName}</p>
                      {lister?.isVerified && (
                        <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color:"var(--accent)" }}>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-[11px]" style={{ color:"var(--text-muted)" }}>{listerRole}</p>
                    {lister?.agencyName && (
                      <p className="text-[11px] font-medium truncate" style={{ color:"var(--accent)" }}>{lister.agencyName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Call CTA — only when the lister has a phone number on file */}
              {listerPhone && (
                <div className="p-4" style={{ borderBottom:"1px solid var(--border)", background:"var(--surface2)" }}>
                  <a href={`tel:${listerPhone}`}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold transition active:scale-95"
                    style={{ background:"var(--accent)", color:"var(--accent-text)", boxShadow:"0 4px 12px var(--accent-light)" }}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {t("listing.callAgent")} · {listerPhone}
                  </a>
                </div>
              )}

              {/* Inquiry / Contact */}
              <div className="p-4">
                <h3 className="text-xs font-semibold mb-3" style={{ color:"var(--text-muted)" }}>
                  {t("listing.sendInquiry")}
                </h3>
                <ContactSection listingId={id} listingTitle={listing.title} />
              </div>
            </section>

            {/* Details */}
            <section className="rounded-2xl p-4" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:"var(--text-faint)" }}>{t("listing.details")}</h3>
              <InfoRow label={isAr?"فئة العقار":"Kind"}              value={listing.listingKind === "commercial" ? (isAr?"تجاري":"Commercial") : (isAr?"سكني":"Residential")} />
              <InfoRow label={isAr?"نوع الإعلان":"Listing type"}    value={isRent?t("listing.forRent"):t("listing.forSale")} />
              <InfoRow label={isAr?"العقار":"Property"}              value={listing.propertyType} />
              {finishingText && (
                <InfoRow label={isAr?"التشطيب":"Finishing"}          value={finishingText} />
              )}
              <InfoRow label={isAr?"طريقة الدفع":"Payment"}          value={PAYMENT_LABELS[listing.paymentMethod]} />
              {listing.completionStatus !== null && (
                <InfoRow label={isAr?"حالة التسليم":"Completion"}    value={COMPLETION_LABELS[listing.completionStatus]} />
              )}
              {streetText && (
                <InfoRow label={isAr?"الشارع / الوحدة":"Street / Unit"} value={streetText} />
              )}
              <InfoRow label={isAr?"المدينة":"City"}                 value={listing.city} />
              <InfoRow label={isAr?"المنطقة":"Area"}                 value={listing.area} />
              <InfoRow label={isAr?"رقم الإعلان":"Listing No."}      value={listing.referenceNumber ? String(listing.referenceNumber) : `#${listing.id.slice(0,8)}`} />
            </section>
          </aside>
        </div>

        {/* ── LISTING NUMBER + REPORT ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4"
          style={{ borderTop:"1px solid var(--border)" }}>
          <p className="text-xs" style={{ color:"var(--text-faint)" }}>
            {isAr ? "رقم الإعلان" : "Listing number"}{" "}
            <span className="font-semibold tabular-nums" style={{ color:"var(--text-secondary)" }}>
              {listing.referenceNumber ? listing.referenceNumber : `#${listing.id.slice(0,8)}`}
            </span>
          </p>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                navigate("/login", { state: { from: { pathname: window.location.pathname } } });
                return;
              }
              setShowReport(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium transition"
            style={{ color:"var(--text-muted)" }}
          >
            <span style={{ color:"var(--danger)" }}>⚐</span>
            {isAr ? "الإبلاغ عن هذا الإعلان" : "Report this listing"}
          </button>
        </div>

        {showReport && (
          <ReportListingModal
            listingId={id}
            listingTitle={listing.title}
            onClose={() => setShowReport(false)}
          />
        )}

        {/* ── SIMILAR LISTINGS ── */}
        <section className="pt-6 pb-16" style={{ borderTop:"1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold" style={{ color:"var(--text)" }}>{t("listing.similar")}</h2>
              <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>
                {similarListings.length > 0
                  ? `${similarListings.length} ${isAr?"عقار في":"propert${similarListings.length===1?\"y\":\"ies\"} in"} ${listing.city}`
                  : `${isAr?"لا يوجد في":"No matches in"} ${listing.city}`}
              </p>
            </div>
            {similarListings.length > 0 && (
              <Link to={`/search?city=${encodeURIComponent(listing.city)}`}
                className="text-xs transition" style={{ color:"var(--accent)" }}>
                {isAr?`عرض الكل في ${listing.city}`:` View all in ${listing.city} →`}
              </Link>
            )}
          </div>

          {similarListings.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similarListings.map((l)=><ListingCard key={l.id} listing={l} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl text-center" style={{ border:"1px dashed var(--border)", background:"var(--surface)" }}>
              <span className="text-4xl mb-3">🏙</span>
              <p className="text-sm font-semibold" style={{ color:"var(--text-secondary)" }}>{isAr?"لا توجد عقارات مشابهة":"No similar listings right now"}</p>
              <p className="text-xs mt-1 mb-4" style={{ color:"var(--text-faint)" }}>
                {isAr?`لا يوجد عقارات أخرى في ${listing.city} حاليًا.`:`We couldn't find other properties in ${listing.city} at the moment.`}
              </p>
              <Link to="/search"
                className="rounded-full px-4 py-2 text-xs transition"
                style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
                {isAr?"تصفح جميع الإعلانات ←":"Browse all listings →"}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}