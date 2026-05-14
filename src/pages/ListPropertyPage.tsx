import { useState, useEffect } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ImageUploadStep, { type UploadedImage } from "../components/listing/ImageUploadStep";
import { useSubscription } from "../hooks/useSubscription";
import { useAuth } from "../context/AuthContext";
import LocationSearch from "../components/search/LocationSearch";
import { AMENITIES, AMENITY_GROUP_LABELS, AMENITY_GROUP_ORDER } from "../data/amenities";
import { calculateLifestyleScore, type LifestyleScoreResult } from "../lib/lifestyleScore";
import LifestyleScoreBadge from "../components/listing/LifestyleScoreBadge";
import {
  listingApi,
  aiApi,
  PropertyTypeEnum,
  ListingTypeEnum,
  extractErrorMessage,
  type CreateListingRequest,
  type StandardizeListingResponse,
  type ScoreListingResponse,
} from "../lib/api";

type ListingType  = "sale" | "rent";
type PropertyType = "apartment"|"villa"|"studio"|"duplex"|"penthouse"|"office"|"shop"|"land";
type FinishingType = "fully_finished"|"semi_finished"|"core_shell"|"furnished"|"unfurnished";
type ListingKindType = "residential" | "commercial";
type AddressForm  = { street:string; city:string; region:string; country:string; latitude:number|null; longitude:number|null; };
type ListingForm  = { title:string; description:string; price:string; bedrooms:string; bathrooms:string; area_size:string; property_type:PropertyType|""; finishing:FinishingType|""; listing_type:ListingType; listing_kind:ListingKindType; tags:string[]; amenities:string[]; ai_generated_description:string; ai_standardized_finishing:string; ai_quality_score:string; ai_lifestyle_score:string; };

const PROPERTY_TYPES = [
  { value:"apartment" as PropertyType, label:"Apartment", labelAr:"شقة" },
  { value:"villa"     as PropertyType, label:"Villa",     labelAr:"فيلا" },
  { value:"studio"    as PropertyType, label:"Studio",    labelAr:"استوديو" },
  { value:"duplex"    as PropertyType, label:"Duplex",    labelAr:"دوبلكس" },
  { value:"penthouse" as PropertyType, label:"Penthouse", labelAr:"بنتهاوس" },
  { value:"office"    as PropertyType, label:"Office",    labelAr:"مكتب" },
  { value:"shop"      as PropertyType, label:"Shop",      labelAr:"محل" },
  { value:"land"      as PropertyType, label:"Land",      labelAr:"أرض" },
];

const FINISHING_TYPES = [
  { value:"fully_finished" as FinishingType, label:"Fully Finished", labelAr:"تشطيب كامل" },
  { value:"semi_finished"  as FinishingType, label:"Semi Finished",  labelAr:"نص تشطيب" },
  { value:"core_shell"     as FinishingType, label:"Core & Shell",   labelAr:"هيكل" },
  { value:"furnished"      as FinishingType, label:"Furnished",      labelAr:"مفروش" },
  { value:"unfurnished"    as FinishingType, label:"Unfurnished",    labelAr:"غير مفروش" },
];

const EG_CITIES = ["Cairo","Giza","Alexandria","New Cairo","6th of October","Heliopolis","Maadi","Zamalek","New Administrative Capital","North Coast","Ain Sokhna"];

// ── Steps: Basics → Location → Photos → Details → AI → Review ─────────────────
const STEPS_KEYS = ["basics","location","photos","details","ai","review"] as const;

// REFACTORED: Use cached geocoding (30-day TTL) instead of direct API call
import { getCachedGeocode } from "../lib/googleMapsCache";

function containsArabic(t: string) { return /[\u0600-\u06FF]/.test(t); }

// Wrapper to match existing call signature — now uses 30-day cache
async function geocodeAddress(street: string, city: string, region: string) {
  const query = [street, region, city, "Egypt"].filter(Boolean).join(", ");
  const result = await getCachedGeocode(query);
  if (!result) return null;
  return { lat: result.lat, lon: result.lng, resolvedWith: result.formattedAddress };
}

function StepBar({ current }: { current: number }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const labels: Record<string, string> = {
    basics:   isAr ? "الأساسيات" : "Basics",
    location: isAr ? "الموقع"    : "Location",
    photos:   isAr ? "الصور"     : "Photos",
    details:  isAr ? "التفاصيل"  : "Details",
    ai:       isAr ? "الذكاء"    : "AI",
    review:   isAr ? "المراجعة"  : "Review",
  };
  const steps = STEPS_KEYS.map((k) => labels[k] || k);
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300"
              style={{ background: i < current ? "var(--accent)" : "var(--surface)", borderColor: i <= current ? "var(--accent)" : "var(--border)", color: i < current ? "var(--accent-text)" : i === current ? "var(--accent)" : "var(--text-faint)" }}>
              {i < current ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : i + 1}
            </div>
            <span className="text-xs mt-1.5 font-medium hidden sm:block" style={{ color: i === current ? "var(--accent)" : i < current ? "var(--text-muted)" : "var(--text-faint)" }}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className="flex-1 h-0.5 mx-1 transition-all duration-500" style={{ background: i < current ? "var(--accent)" : "var(--border)" }} />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, hint, children, required }: { label:string; hint?:string; children:React.ReactNode; required?:boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label} {required && <span style={{ color: "var(--accent)" }}>*</span>}
      </label>
      {hint && <p className="text-xs" style={{ color: "var(--text-faint)" }}>{hint}</p>}
      {children}
    </div>
  );
}

const iStyle: React.CSSProperties = { width:"100%", borderRadius:12, border:"1px solid var(--border)", background:"var(--surface2)", padding:"10px 16px", fontSize:14, color:"var(--text)", outline:"none" };

function ToggleButton({ active, onClick, children }: { active:boolean; onClick:()=>void; children:React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border py-3 text-sm font-semibold transition-all duration-200 text-center"
      style={{ border:`1px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent-light)" : "var(--surface2)", color: active ? "var(--accent)" : "var(--text-muted)" }}>
      {children}
    </button>
  );
}

export default function ListPropertyPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { id } = useParams<{ id?: string }>();
  const sub = useSubscription();
  const { user } = useAuth();
  const currentUserType = user?.user_type ?? "buyer";

  // ── Edit mode: detect from route /listings/:id/edit ──────────────────────
  const isEditMode = Boolean(id);
  // Prefill from GET /api/listings/:id is wired in Phase 4
  const existingData: null | {
    form: { title:string; description:string; price:string; bedrooms:string; bathrooms:string; area_size:string; property_type:string; finishing:string; listing_type:string; };
    address: { street:string; city:string; region:string; country:string; latitude:number|null; longitude:number|null; };
  } = null;

  if (currentUserType === "buyer" || currentUserType === "admin") return <Navigate to="/" replace />;

  // ── Subscription gate: block creating new listings if quota exceeded or expired ──
  // Edit mode is always allowed (editing doesn't consume quota)
  if (!isEditMode && !sub.can_add_listing) {
    const isExpired = sub.status === "expired";
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background:"var(--bg)" }}>
        <div className="text-center max-w-sm space-y-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto"
            style={{ background:"var(--danger-light)", border:"1px solid var(--danger)" }}>
            {isExpired ? "🚫" : "📋"}
          </div>

          <div>
            <h2 className="text-2xl font-bold" style={{ color:"var(--text)" }}>
              {isExpired
                ? (isAr ? "الاشتراك منتهي" : "Subscription Expired")
                : (isAr ? "وصلت للحد الأقصى" : "Listing Limit Reached")}
            </h2>
            <p className="text-sm mt-2" style={{ color:"var(--text-muted)" }}>
              {isExpired
                ? (isAr
                    ? `انتهى اشتراك ${sub.plan_name_ar} الخاص بك. جدد لتتمكن من إضافة إعلانات.`
                    : `Your ${sub.plan_name} subscription has expired. Renew to continue adding listings.`)
                : (isAr
                    ? `استخدمت ${sub.current_listings} من ${sub.max_listings} إعلانات في خطتك. ارقِّ للحصول على المزيد.`
                    : `You've used ${sub.current_listings} of ${sub.max_listings} listings in your plan. Upgrade to add more.`)}
            </p>
          </div>

          {/* Quota progress bar (only for limit reached, not expired) */}
          {!isExpired && sub.max_listings > 0 && (
            <div className="rounded-2xl p-4 space-y-2" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <div className="flex justify-between text-xs" style={{ color:"var(--text-muted)" }}>
                <span>{isAr ? "الإعلانات المستخدمة" : "Listings used"}</span>
                <span className="font-bold" style={{ color:"var(--danger)" }}>
                  {sub.current_listings}/{sub.max_listings}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background:"var(--border)" }}>
                <div className="h-full rounded-full" style={{ width:"100%", background:"var(--danger)" }} />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Link to="/my-listings"
              className="rounded-xl px-5 py-2.5 text-sm font-medium transition"
              style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
              {isAr ? "إعلاناتي" : "My Listings"}
            </Link>
            <Link to="/payment"
              className="rounded-xl px-5 py-2.5 text-sm font-bold transition"
              style={{ background:"var(--accent)", color:"var(--accent-text)" }}>
              {isExpired
                ? (isAr ? "تجديد الاشتراك" : "Renew Subscription")
                : (isAr ? "ترقية الخطة" : "Upgrade Plan")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [step, setStep]     = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState(
    existingData?.address.latitude
      ? `✓ ${existingData.address.latitude.toFixed(5)}, ${existingData.address.longitude?.toFixed(5)}`
      : ""
  );
  const [form, setForm] = useState<ListingForm>({
    title:                     existingData?.form.title                || "",
    description:               existingData?.form.description          || "",
    price:                     existingData?.form.price                || "",
    bedrooms:                  existingData?.form.bedrooms             || "",
    bathrooms:                 existingData?.form.bathrooms            || "",
    area_size:                 existingData?.form.area_size            || "",
    property_type:             (existingData?.form.property_type       || "") as PropertyType | "",
    finishing:                 (existingData?.form.finishing           || "") as FinishingType | "",
    listing_type:              (existingData?.form.listing_type        || "sale") as ListingType,
    listing_kind:              (existingData?.form.listing_kind        || "residential") as ListingKindType,
    tags:                      [],
    amenities:                 [],
    ai_generated_description:  "",
    ai_standardized_finishing: "",
    ai_quality_score:          "",
    ai_lifestyle_score:        "",
  });

  const [address, setAddress] = useState<AddressForm>({
    street:    existingData?.address.street    || "",
    city:      existingData?.address.city      || "",
    region:    existingData?.address.region    || "",
    country:   existingData?.address.country   || "Egypt",
    latitude:  existingData?.address.latitude  ?? null,
    longitude: existingData?.address.longitude ?? null,
  });

  // ── Images state (maps to DB images table) ────────────────────────────────
  const [images, setImages] = useState<UploadedImage[]>([]);

  const setF = (k:keyof ListingForm, v:string) => setForm((p) => ({...p,[k]:v}));
  const setA = (k:keyof AddressForm, v:string|number|null) => setAddress((p) => ({...p,[k]:v}));
  const toggleAmenity = (key:string) => setForm((p) => ({
    ...p,
    amenities: p.amenities.includes(key) ? p.amenities.filter((a) => a !== key) : [...p.amenities, key],
  }));

  async function handleGeocode() {
    if (!address.street && !address.city) {
      setGeocodeMsg(isAr ? "⚠ أدخل العنوان أو اختر من الاقتراحات." : "⚠ Enter an address or pick from suggestions.");
      return;
    }
    setGeocoding(true);
    setGeocodeMsg(isAr ? "جارٍ تحديد الموقع عبر Google…" : "Locating via Google Maps…");
    const result = await geocodeAddress(address.street, address.city, address.region);
    if (result) {
      setAddress((p) => ({ ...p, latitude: result.lat, longitude: result.lon }));
      setGeocodeMsg(`✓ ${result.lat.toFixed(5)}, ${result.lon.toFixed(5)}  ·  "${result.resolvedWith}"`);
      // Calculate lifestyle score now that we have coordinates
      triggerLifestyleScore(result.lat, result.lon);
    } else {
      setGeocodeMsg(isAr ? "⚠ تعذّر تحديد الإحداثيات. أدخلها يدويًا." : "⚠ Could not locate address. Enter coordinates manually.");
    }
    setGeocoding(false);
  }

  // AI state
  const [aiRawInput, setAiRawInput]     = useState("");
  const [aiLoading, setAiLoading]       = useState<"desc"|"std"|"score"|null>(null);
  const [aiGenDesc, setAiGenDesc]       = useState("");
  const [aiStdData, setAiStdData]       = useState<StandardizeListingResponse | null>(null);
  const [aiScore, setAiScore]           = useState<ScoreListingResponse | null>(null);
  const [aiError, setAiError]           = useState("");
  const [aiLang, setAiLang]             = useState<"ar"|"en">("ar");

  async function generateDescription() {
    if (!form.title || !form.property_type || !form.listing_type || !form.price) {
      setAiError(isAr ? "أكمل البيانات الأساسية أولاً (العنوان، النوع، السعر)." : "Complete basic info first (title, type, price).");
      return;
    }
    setAiLoading("desc");
    setAiError("");
    setAiGenDesc(""); // clear previous so each generation is fresh
    try {
      const res = await aiApi.generateDescription({
        title: form.title,
        propertyType: form.property_type,
        listingType: form.listing_type,
        price: parseFloat(form.price) || 0,
        bedrooms: parseInt(form.bedrooms) || 0,
        bathrooms: parseInt(form.bathrooms) || 0,
        areaSize: parseFloat(form.area_size) || 0,
        finishing: form.finishing || null,
        location: address.city || null,
        language: aiLang,
      });
      setAiGenDesc(res.data.description);
    } catch (err) {
      setAiError(extractErrorMessage(err, isAr ? "فشل توليد الوصف." : "Failed to generate description."));
    } finally {
      setAiLoading(null);
    }
  }

  async function standardizeData() {
    if (!aiRawInput.trim()) { setAiError(isAr ? "الصق نص الإعلان أولاً." : "Paste Arabic listing text first."); return; }
    setAiLoading("std");
    setAiError("");
    setAiStdData(null);
    try {
      const res = await aiApi.standardize(aiRawInput.trim());
      setAiStdData(res.data);
    } catch (err) {
      setAiError(extractErrorMessage(err, isAr ? "فشل استخراج البيانات." : "Failed to extract data."));
    } finally {
      setAiLoading(null);
    }
  }

  function applyStdData() {
    if (!aiStdData) return;
    const d = aiStdData;
    setForm((f) => ({
      ...f,
      ...(d.title        ? { title: d.title }                      : {}),
      ...(d.propertyType ? { property_type: d.propertyType as any }: {}),
      ...(d.listingType  ? { listing_type: d.listingType as any }  : {}),
      ...(d.price        ? { price: String(d.price) }              : {}),
      ...(d.bedrooms     ? { bedrooms: String(d.bedrooms) }        : {}),
      ...(d.bathrooms    ? { bathrooms: String(d.bathrooms) }      : {}),
      ...(d.areaSize     ? { area_size: String(d.areaSize) }       : {}),
      ...(d.finishing    ? { finishing: d.finishing as any }       : {}),
      ...(d.description  ? { description: d.description }         : {}),
      ...(d.tags?.length ? { tags: d.tags }                        : {}),
    }));
    if (d.city) setAddress((a) => ({ ...a, city: d.city! }));
  }

  async function scoreMyListing() {
    setAiLoading("score");
    setAiError("");
    setAiScore(null);
    try {
      const res = await aiApi.scoreListing({
        title: form.title,
        description: form.description,
        propertyType: form.property_type,
        listingType: form.listing_type,
        price: parseFloat(form.price) || 0,
        bedrooms: parseInt(form.bedrooms) || 0,
        bathrooms: parseInt(form.bathrooms) || 0,
        areaSize: parseFloat(form.area_size) || 0,
        finishing: form.finishing || null,
        city: address.city || null,
        photoCount: images.filter((i) => i.uploaded).length,
      });
      setAiScore(res.data);
    } catch (err) {
      setAiError(extractErrorMessage(err, isAr ? "فشل تقييم الإعلان." : "Failed to score listing."));
    } finally {
      setAiLoading(null);
    }
  }

  // Step validation
  const canNext = [
    form.title && form.listing_type && form.property_type && form.price,  // 0: basics
    address.city && address.latitude != null && address.longitude != null,  // 1: location
    images.filter((i) => i.uploaded).length >= 3,                           // 2: photos (min 3)
    form.bedrooms && form.bathrooms && form.area_size && form.finishing,   // 3: details
    true,                                                                   // 4: AI (optional)
    true,                                                                   // 5: review
  ][step];

  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [lifestyleScoreResult, setLifestyleScoreResult] = useState<LifestyleScoreResult | null>(null);
  const [scoredCoords, setScoredCoords] = useState<string>("");

  // Calculate lifestyle score for specific coordinates
  // Tracks which coords the score belongs to, so stale scores are never shown
  async function triggerLifestyleScore(lat: number, lng: number) {
    const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    // Skip if already calculated for these exact coordinates
    if (coordKey === scoredCoords && lifestyleScoreResult) return;

    setIsCalculatingScore(true);
    setLifestyleScoreResult(null); // clear stale score immediately
    try {
      const result = await calculateLifestyleScore(lat, lng);
      setScoredCoords(coordKey);
      setLifestyleScoreResult(result);
    } catch (err) {
      console.error("Failed to calculate lifestyle score:", err);
    }
    setIsCalculatingScore(false);
  }

  async function handleSubmit() {
    setSubmitError(null);

    // Validation
    if (form.description.trim().length < 10) {
      setSubmitError(isAr ? "الوصف مطلوب (10 أحرف على الأقل)." : "Description is required (10+ characters).");
      return;
    }
    const uploadedImages = images.filter((i) => i.uploaded && i.url && i.publicId);
    if (uploadedImages.length < 3) {
      setSubmitError(isAr ? "يجب رفع 3 صور على الأقل." : "At least 3 uploaded photos are required.");
      return;
    }
    if (!form.property_type) {
      setSubmitError(isAr ? "اختر نوع العقار." : "Select a property type.");
      return;
    }
    if (!address.latitude || !address.longitude) {
      setSubmitError(isAr ? "حدد موقع العقار على الخريطة." : "Locate the property on the map.");
      return;
    }

    // Ensure lifestyle score matches current coordinates
    let lifestyleScore: LifestyleScoreResult | null = null;
    const currentKey = `${address.latitude.toFixed(5)},${address.longitude.toFixed(5)}`;
    if (lifestyleScoreResult && scoredCoords === currentKey) {
      lifestyleScore = lifestyleScoreResult;
    } else {
      setIsCalculatingScore(true);
      try {
        lifestyleScore = await calculateLifestyleScore(address.latitude, address.longitude);
        setLifestyleScoreResult(lifestyleScore);
        setScoredCoords(currentKey);
      } catch (err) {
        console.error("Failed to calculate lifestyle score:", err);
      }
      setIsCalculatingScore(false);
    }

    const payload: CreateListingRequest = {
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      bedrooms: parseInt(form.bedrooms) || 0,
      bathrooms: parseInt(form.bathrooms) || 0,
      areaSize: parseFloat(form.area_size),
      propertyType: PropertyTypeEnum[
        (form.property_type.charAt(0).toUpperCase() + form.property_type.slice(1)) as keyof typeof PropertyTypeEnum
      ],
      finishing: form.finishing || null,
      listingType: form.listing_type === "rent" ? ListingTypeEnum.Rent : ListingTypeEnum.Sale,
      listingKind: form.listing_kind === "commercial" ? 1 : 0,
      address: {
        street: address.street,
        city: address.city,
        region: address.region,
        country: address.country || "Egypt",
        latitude: address.latitude,
        longitude: address.longitude,
      },
      images: uploadedImages.map((i, idx) => ({
        url: i.url!,
        publicId: i.publicId!,
        format: i.format ?? null,
        bytes: i.bytes ?? null,
        width: i.width ?? 0,
        height: i.height ?? 0,
        sortOrder: idx,
      })),
      lifestyleScore: lifestyleScore ? lifestyleScore.score : null,
      lifestyleScoreBreakdown: lifestyleScore ? JSON.stringify(lifestyleScore.breakdown) : null,
      amenities: form.amenities,
    };

    setSubmitting(true);
    try {
      if (isEditMode && id) {
        await listingApi.update(id, payload);
      } else {
        await listingApi.create(payload);
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(extractErrorMessage(err, isAr ? "فشل إرسال الإعلان." : "Failed to submit listing."));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background:"var(--bg)" }}>
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto"
            style={{ background:"var(--success-light)", border:"1px solid var(--success)" }}>
            {isEditMode ? "✏️" : "🎉"}
          </div>
          <h2 className="text-2xl font-bold" style={{ color:"var(--text)" }}>
            {isEditMode
              ? (isAr ? "تم حفظ التغييرات!" : "Changes Saved!")
              : (isAr ? "تم إرسال الإعلان!" : "Listing Submitted!")}
          </h2>
          <p className="text-sm" style={{ color:"var(--text-muted)" }}>
            {isEditMode
              ? (isAr ? "تم تحديث إعلانك وسيتم مراجعته من قِبَل الإدارة." : "Your listing has been updated and sent for re-review.")
              : (isAr ? "تم إرسال إعلانك للمراجعة. ستتلقى إشعارًا بعد الموافقة." : "Your listing has been submitted for review. You'll be notified once it's approved.")}
          </p>
          {images.length > 0 && <p className="text-xs" style={{ color:"var(--text-faint)" }}>{images.filter((i)=>i.uploaded).length} {isAr?"صورة مرفوعة":"photos uploaded"}.</p>}
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSubmitted(false); setStep(0); if (!isEditMode) setImages([]); }}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
              style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
              {isEditMode ? (isAr?"تعديل أكثر":"Edit More") : (isAr?"إضافة آخر":"Add Another")}
            </button>
            <a href="/my-listings" className="rounded-xl px-5 py-2.5 text-sm font-bold transition"
              style={{ background:"var(--accent)", color:"var(--accent-text)" }}>
              {isAr ? "إعلاناتي" : "My Listings"}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4" style={{ background:"var(--bg)" }}>
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{ background:"var(--accent-light)", border:"1px solid var(--accent)" }}>
            {isEditMode ? "✏️" : "🏠"}
          </div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>
            {isEditMode
              ? (isAr ? "تعديل الإعلان" : "Edit Listing")
              : (currentUserType === "agent" ? (isAr ? "إضافة إعلان جديد" : "Add New Listing") : (isAr ? "أضف عقارك" : "List Your Property"))}
          </h1>
        </div>
        <p className="text-sm ps-11" style={{ color:"var(--text-muted)" }}>
          {isEditMode
            ? (isAr ? "عدّل تفاصيل إعلانك. سيُعاد مراجعته بعد الحفظ." : "Update your listing details. It will be re-reviewed after saving.")
            : (currentUserType === "agent"
                ? (isAr ? "أدخل التفاصيل أدناه. استخدم أدوات الذكاء الاصطناعي لوصف احترافي." : "Fill in the details below. Use the AI tools to write professional descriptions.")
                : (isAr ? "أكمل النموذج لإضافة عقارك. سيتم مراجعته قبل النشر." : "Complete the form to list your property. It will be reviewed before going live."))}
        </p>

        {/* Edit mode notice banner */}
        {isEditMode && existingData && (
          <div className="mt-3 ms-11 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs"
            style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.35)", color:"#f59e0b" }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <span>
              {isAr ? `تعديل الإعلان #${id} — "${existingData.form.title}"` : `Editing listing #${id} — "${existingData.form.title}"`}
            </span>
          </div>
        )}

        {/* Edit mode: listing not found warning */}
        {isEditMode && !existingData && (
          <div className="mt-3 ms-11 rounded-xl px-4 py-2.5 text-xs"
            style={{ background:"var(--danger-light)", border:"1px solid var(--danger)", color:"var(--danger)" }}>
            {isAr ? "⚠️ لم يتم العثور على الإعلان. قد لا تمتلك صلاحية تعديله." : "⚠️ Listing not found or you don't have permission to edit it."}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        <StepBar current={step} />

        {/* ── Step 0: Basics ── */}
        {step === 0 && (
          <div className="space-y-5">
            <Field label={isAr ? "نوع الإعلان" : "Listing Kind"} required>
              <div className="grid grid-cols-2 gap-3">
                <ToggleButton active={form.listing_kind==="residential"} onClick={()=>setF("listing_kind","residential")}>
                  🏠 {isAr ? "سكني" : "Residential"}
                </ToggleButton>
                <ToggleButton active={form.listing_kind==="commercial"} onClick={()=>setF("listing_kind","commercial")}>
                  🏢 {isAr ? "تجاري" : "Commercial"}
                </ToggleButton>
              </div>
            </Field>
            <Field label={isAr ? "نوع العرض" : "Listing Type"} required>
              <div className="grid grid-cols-2 gap-3">
                <ToggleButton active={form.listing_type==="sale"} onClick={()=>setF("listing_type","sale")}>🏷️ {isAr ? "للبيع" : "For Sale"}</ToggleButton>
                <ToggleButton active={form.listing_type==="rent"} onClick={()=>setF("listing_type","rent")}>🔑 {isAr ? "للإيجار" : "For Rent"}</ToggleButton>
              </div>
            </Field>
            <Field label={isAr ? "نوع العقار" : "Property Type"} required>
              <div className="grid grid-cols-4 gap-2">
                {PROPERTY_TYPES.map(({value,label,labelAr})=>(
                  <ToggleButton key={value} active={form.property_type===value} onClick={()=>{
                    const kind: ListingKindType = ["office","shop","land"].includes(value) ? "commercial" : "residential";
                    setForm(f=>({...f, property_type:value, listing_kind:kind}));
                  }}>
                    <span className="block text-xs" style={{ color: form.property_type===value?"var(--accent)":"var(--text-secondary)" }}>{label}</span>
                    <span className="block text-[10px]" style={{ color:"var(--text-faint)" }}>{labelAr}</span>
                  </ToggleButton>
                ))}
              </div>
            </Field>
            <Field label="Title" hint="A clear, descriptive title (shown in search results)" required>
              <input type="text" value={form.title} onChange={(e)=>setF("title",e.target.value)} placeholder="e.g. Spacious 3BR Apartment in New Cairo" style={iStyle} />
            </Field>
            <Field label="Price (EGP)" required>
              {/* Live-format with thousands separators while typing.
                  We store digits-only in form.price so existing parseFloat
                  call sites keep working unchanged. */}
              <input
                type="text"
                inputMode="numeric"
                value={form.price ? Number(form.price).toLocaleString("en-US") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "");
                  setF("price", digits);
                }}
                placeholder={form.listing_type === "rent" ? "Monthly rent" : "Sale price"}
                style={iStyle}
              />
            </Field>
          </div>
        )}

        {/* ── Step 1: Location ── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Location picker — Dubizzle-style, zero API calls */}
            <Field label={isAr ? "الموقع" : "Location"} hint={isAr ? "اختر المحافظة ثم الحي" : "Select governorate then district"} required>
              <LocationSearch
                value={address.city && address.region ? `${address.region}, ${address.city}` : address.city || ""}
                onChange={(display, govValue, subValue) => {
                  // Map govValue (slug) to human-readable city name
                  const cityMap: Record<string,string> = {
                    "cairo":"Cairo","giza":"Giza","alexandria":"Alexandria",
                    "north-coast":"North Coast","ain-sokhna":"Ain Sokhna",
                    "red-sea":"Red Sea","south-sinai":"South Sinai",
                    "qalyubia":"Qalyubia","dakahlia":"Dakahlia","sharqia":"Sharqia",
                    "gharbia":"Gharbia","beheira":"Beheira","port-said":"Port Said",
                    "ismailia":"Ismailia","suez":"Suez","fayoum":"Fayoum",
                    "luxor":"Luxor","aswan":"Aswan",
                  };
                  const city = cityMap[govValue] || display;
                  setAddress((p) => ({ ...p, city, region: subValue || "" }));
                }}
                variant="compact"
                placeholder={isAr ? "اختر المحافظة أو الحي…" : "Select governorate or district…"}
                inputStyle={{ ...iStyle }}
              />
            </Field>

            <Field label={isAr ? "الشارع / رقم الوحدة (اختياري)" : "Street / Unit (optional)"}>
              <input type="text" value={address.street} onChange={(e) => setA("street", e.target.value)}
                placeholder={isAr ? "مثال: ١٥ شارع البنفسج" : "e.g. 15 El-Banafseg St"}
                style={iStyle} />
            </Field>

            {/* Coordinates card */}
            <div className="rounded-2xl p-5 space-y-4" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color:"var(--text)" }}>
                    {isAr ? "الإحداثيات" : "Coordinates"}
                  </p>
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                    {isAr ? "تُعبَّأ تلقائيًا عند الاختيار من الاقتراحات أعلاه" : "Auto-filled when you pick from suggestions above"}
                  </p>
                </div>
              </div>

              {geocodeMsg && (
                <div className="text-xs rounded-xl px-4 py-2.5 break-all"
                  style={{
                    background: geocodeMsg.startsWith("✓") ? "var(--success-light)" : geocodeMsg.startsWith("⚠") ? "rgba(245,158,11,0.1)" : "var(--accent-light)",
                    border: `1px solid ${geocodeMsg.startsWith("✓") ? "var(--success)" : geocodeMsg.startsWith("⚠") ? "rgba(245,158,11,0.4)" : "var(--accent)"}`,
                    color: geocodeMsg.startsWith("✓") ? "var(--success)" : geocodeMsg.startsWith("⚠") ? "#f59e0b" : "var(--accent)",
                  }}>
                  {geocodeMsg}
                </div>
              )}

              {/* Manual geocode fallback button */}
              <button onClick={handleGeocode} disabled={geocoding}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
                style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
                {geocoding
                  ? <><span className="animate-spin inline-block">⟳</span> {isAr ? "جارٍ التحديد…" : "Locating via Google…"}</>
                  : <>{isAr ? "📍 تحديد الإحداثيات من العنوان" : "📍 Get Coordinates from Address"}</>
                }
              </button>

              <p className="text-xs" style={{ color:"var(--text-faint)" }}>
                {isAr ? "أو أدخل يدويًا:" : "Or enter manually:"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: isAr ? "خط العرض" : "Latitude",  key:"latitude",  ph:"30.044420"  },
                  { label: isAr ? "خط الطول" : "Longitude", key:"longitude", ph:"31.235712" },
                ].map(({ label, key, ph }) => (
                  <div key={key}>
                    <label className="text-xs mb-1 block" style={{ color:"var(--text-faint)" }}>{label}</label>
                    <input type="number" step="0.000001"
                      value={(address[key as keyof AddressForm] as number | null) ?? ""}
                      onChange={(e) => setA(key as keyof AddressForm, e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder={ph} style={iStyle} />
                  </div>
                ))}
              </div>

              {/* Lifestyle Score — calculated when coordinates are available */}
              {isCalculatingScore && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="animate-spin">⟳</span>
                  {isAr ? "جارٍ حساب درجة الموقع…" : "Calculating lifestyle score…"}
                </div>
              )}
              {lifestyleScoreResult && !isCalculatingScore && (
                <div className="rounded-xl overflow-hidden"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {/* Score header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <LifestyleScoreBadge score={lifestyleScoreResult.score} size="md" />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {lifestyleScoreResult.score}/10
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {isAr ? "درجة الموقع والخدمات" : "Lifestyle & Convenience Score"}
                      </p>
                    </div>
                  </div>

                  {/* Per-category breakdown */}
                  <div className="px-4 pb-2 space-y-1">
                    {(Object.entries(lifestyleScoreResult.breakdown) as [string, number][]).map(([cat, score]) => {
                      const icons: Record<string, string> = { school: "🏫", hospital: "🏥", transport: "🚇", market: "🛒" };
                      const labels: Record<string, string> = isAr
                        ? { school: "المدارس", hospital: "المستشفيات", transport: "المواصلات", market: "الأسواق" }
                        : { school: "Schools", hospital: "Hospitals", transport: "Transport", market: "Markets" };
                      const distM = (lifestyleScoreResult.distances as Record<string, number | null>)?.[cat] ?? null;
                      const distLabel = distM === null ? "—" : distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}km`;
                      return (
                        <div key={cat} className="flex items-center justify-between text-xs py-0.5">
                          <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                            <span>{icons[cat] ?? "📍"}</span>
                            {labels[cat] ?? cat}
                          </span>
                          <span className="flex items-center gap-2">
                            <span style={{ color: "var(--text-faint)" }}>{distLabel}</span>
                            <span className="font-semibold" style={{ color: score >= 4 ? "#22c55e" : score >= 2 ? "#f59e0b" : "var(--text-faint)" }}>
                              {score}/5
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Disclaimer */}
                  <div className="px-4 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-faint)" }}>
                      <span title={isAr
                        ? "تُحسب درجة الموقع عند إضافة الإعلان وقد تتغير مع تحديث الأماكن القريبة."
                        : "Lifestyle score is calculated at listing time and may change as nearby places update."
                      }>ⓘ</span>
                      {isAr
                        ? "تُحسب عند الإضافة وقد تتغير."
                        : "Calculated at listing time. May change as nearby places update."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Photos ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold" style={{ color:"var(--text)" }}>
                {isAr ? "صور العقار" : "Property Photos"}
              </h2>
              <p className="text-sm mt-0.5" style={{ color:"var(--text-muted)" }}>
                {isAr
                  ? "أضف صوراً لجذب المزيد من المشترين. الصورة الأولى ستكون صورة الغلاف."
                  : "Add photos to attract more buyers. The first photo will be the cover image."}
              </p>
            </div>

            <ImageUploadStep images={images} onChange={setImages} />

            <p className="text-xs text-center" style={{ color:"var(--text-faint)" }}>
              {isAr
                ? "الصور اختيارية — يمكنك إضافتها لاحقًا من إعلاناتي."
                : "Photos are optional — you can add them later from My Listings."}
            </p>
          </div>
        )}

        {/* ── Step 3: Details ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {[{label:"Bedrooms",k:"bedrooms",ph:"3"},{label:"Bathrooms",k:"bathrooms",ph:"2"},{label:"Area (m²)",k:"area_size",ph:"120"}].map(({label,k,ph})=>(
                <Field key={k} label={label} required>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <input type="number" min="0" value={(form as any)[k]} onChange={(e)=>setF(k as keyof ListingForm,e.target.value)} placeholder={ph} style={iStyle} />
                </Field>
              ))}
            </div>
            <Field label="Finishing" required>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FINISHING_TYPES.map(({value,label,labelAr})=>(
                  <ToggleButton key={value} active={form.finishing===value} onClick={()=>setF("finishing",value)}>
                    <span className="block text-xs" style={{ color:form.finishing===value?"var(--accent)":"var(--text-secondary)" }}>{label}</span>
                    <span className="block text-[10px]" style={{ color:"var(--text-faint)" }}>{labelAr}</span>
                  </ToggleButton>
                ))}
              </div>
            </Field>
            <Field
              label={isAr?"وسائل الراحة":"Amenities"}
              hint={isAr?"اختياري — اختر كل ما ينطبق على العقار":"Optional — select everything the property has"}
            >
              <div className="space-y-4">
                {AMENITY_GROUP_ORDER.map((group) => (
                  <div key={group}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color:"var(--text-faint)" }}>
                      {isAr ? AMENITY_GROUP_LABELS[group].ar : AMENITY_GROUP_LABELS[group].en}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AMENITIES.filter((a) => a.group === group).map((a) => {
                        const active = form.amenities.includes(a.key);
                        return (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() => toggleAmenity(a.key)}
                            className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start transition-all duration-150"
                            style={{
                              border:`1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                              background: active ? "var(--accent-light)" : "var(--surface2)",
                            }}
                          >
                            <span className="text-base shrink-0">{a.icon}</span>
                            <span className="text-xs font-medium leading-tight" style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}>
                              {isAr ? a.labelAr : a.labelEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Field>
            <Field label={isAr?"الوصف":"Description"} hint={isAr?"اختياري — أو استخدم الذكاء الاصطناعي في الخطوة التالية":"Optional — or generate with AI in the next step"}>
              <textarea rows={4} value={form.description} onChange={(e)=>setF("description",e.target.value)}
                placeholder={isAr?"اكتب وصفًا للعقار...":"Describe the property..."}
                style={{...iStyle,resize:"none"}} />
            </Field>
            {currentUserType === "lister" && (
              <div className="rounded-xl px-4 py-3 text-xs" style={{ border:"1px solid rgba(245,158,11,0.3)", background:"rgba(245,158,11,0.08)", color:"#f59e0b" }}>
                ℹ️ {isAr
                  ? <span>كحساب بائع يمكنك إضافة <strong>عقار واحد</strong>. ارقِّ إلى وكيل للحصول على عدد غير محدود.</span>
                  : <span>{isAr ? <>كحساب بائع يمكنك إضافة <strong>عقار واحد</strong>. ارقِّ إلى وكيل للحصول على عدد غير محدود.</> : <>As a Seller account, you can list <strong>1 property</strong>. Upgrade to Agent for unlimited.</>}</span>}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: AI ── */}
        {step === 4 && (
          <div className="space-y-8">
            {/* AI Description Generator */}
            <div className="rounded-2xl p-6 space-y-4" style={{ border:"1px solid var(--accent)", background:"var(--accent-light)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"var(--surface)", border:"1px solid var(--accent)" }}>✨</div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold" style={{ color:"var(--accent)" }}>
                    {isAr ? "مولّد الوصف بالذكاء الاصطناعي" : "AI Description Generator"}
                  </h3>
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                    {isAr ? "يكتب وصفًا احترافيًا تلقائيًا — كل توليد فريد ومختلف" : "Auto-writes a unique professional description each time"}
                  </p>
                </div>
              </div>

              {/* Language toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>{isAr?"اللغة:":"Language:"}</span>
                <div className="flex rounded-lg overflow-hidden" style={{ border:"1px solid var(--border)" }}>
                  {(["ar","en"] as const).map(lang => (
                    <button key={lang} onClick={() => setAiLang(lang)}
                      className="px-3 py-1 text-xs font-semibold transition"
                      style={{
                        background: aiLang === lang ? "var(--accent)" : "var(--surface2)",
                        color: aiLang === lang ? "var(--accent-text)" : "var(--text-muted)",
                      }}>
                      {lang === "ar" ? "عربي" : "English"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={generateDescription} disabled={!!aiLoading}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                  style={{ background:"var(--accent)", color:"var(--accent-text)" }}>
                  {aiLoading==="desc"
                    ? <><span className="animate-spin">⟳</span> {isAr?"جارٍ التوليد…":"Generating…"}</>
                    : `✨ ${aiGenDesc ? (isAr?"إعادة التوليد":"Regenerate") : (isAr?"توليد وصف":"Generate Description")}`}
                </button>
                {aiGenDesc && (
                  <span className="text-xs" style={{ color:"var(--text-faint)" }}>
                    {isAr?"لم يعجبك الوصف؟ اضغط إعادة التوليد للحصول على نص مختلف":"Not happy? Click Regenerate for a different result"}
                  </span>
                )}
              </div>

              {aiGenDesc && (
                <div className="space-y-3">
                  <div className={`rounded-xl p-4 text-sm leading-relaxed ${aiLang==="ar"?"text-right":""}`}
                    dir={aiLang==="ar"?"rtl":"ltr"}
                    style={{ border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-secondary)" }}>
                    {aiGenDesc}
                  </div>
                  <button onClick={() => { setF("ai_generated_description", aiGenDesc); setF("description", aiGenDesc); }}
                    className="text-xs rounded-xl px-4 py-2 font-semibold transition"
                    style={{ border:"1px solid var(--success)", background:"var(--success-light)", color:"var(--success)" }}>
                    ✓ {isAr?"تطبيق على الإعلان":"Apply to listing"}
                  </button>
                </div>
              )}
            </div>

            {/* AI Data Standardizer */}
            <div className="rounded-2xl p-6 space-y-4" style={{ border:"1px solid rgba(245,158,11,0.4)", background:"rgba(245,158,11,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.4)" }}>🔬</div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color:"#f59e0b" }}>
                    {isAr ? "موحّد البيانات بالذكاء الاصطناعي" : "AI Data Standardizer"}
                  </h3>
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                    {isAr ? "الصق إعلانًا عربيًا خامًا — الذكاء الاصطناعي يستخرج الحقول ويملأ النموذج" : "Paste a raw Arabic listing — AI extracts fields and fills the form"}
                  </p>
                </div>
              </div>
              <textarea value={aiRawInput} onChange={(e) => setAiRawInput(e.target.value)} rows={4}
                placeholder={isAr ? "الصق نص الإعلان هنا (عربي أو إنجليزي)..." : "Paste listing text here (Arabic or English)..."}
                style={{ ...iStyle, resize:"none" }} />
              <button onClick={standardizeData} disabled={!!aiLoading}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                style={{ background:"#f59e0b", color:"#1A1612" }}>
                {aiLoading === "std"
                  ? <><span className="animate-spin">⟳</span> {isAr ? "جارٍ المعالجة…" : "Processing…"}</>
                  : `🔬 ${isAr ? "استخراج وتوحيد" : "Standardize & Extract"}`}
              </button>

              {aiStdData && (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden" style={{ border:"1px solid var(--border)" }}>
                    {([
                      [isAr?"العنوان":"Title",        aiStdData.title],
                      [isAr?"نوع العقار":"Type",       aiStdData.propertyType],
                      [isAr?"نوع الإعلان":"Listing",   aiStdData.listingType],
                      [isAr?"السعر":"Price",           aiStdData.price != null ? `${aiStdData.price.toLocaleString()} EGP` : null],
                      [isAr?"غرف النوم":"Bedrooms",    aiStdData.bedrooms],
                      [isAr?"الحمامات":"Bathrooms",    aiStdData.bathrooms],
                      [isAr?"المساحة":"Area",          aiStdData.areaSize != null ? `${aiStdData.areaSize} m²` : null],
                      [isAr?"التشطيب":"Finishing",     aiStdData.finishing],
                      [isAr?"المدينة":"City",          aiStdData.city],
                    ] as [string, string | number | null | undefined][]).filter(([,v]) => v != null).map(([label, val], i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm"
                        style={{ borderBottom:"1px solid var(--border)", background: i%2===0 ? "var(--surface)" : "var(--surface2)" }}>
                        <span style={{ color:"var(--text-faint)" }}>{label}</span>
                        <span className="font-semibold" style={{ color:"var(--text)" }}>{String(val)}</span>
                      </div>
                    ))}
                    {aiStdData.description && (
                      <div className="px-4 py-3 text-sm text-right" dir="rtl"
                        style={{ background:"var(--surface)", color:"var(--text-secondary)", borderTop:"1px solid var(--border)" }}>
                        {aiStdData.description}
                      </div>
                    )}
                    {aiStdData.tags && aiStdData.tags.length > 0 && (
                      <div className="px-4 py-3" style={{ background:"var(--surface2)", borderTop:"1px solid var(--border)" }}>
                        <p className="text-[10px] font-semibold mb-1.5" style={{ color:"var(--text-faint)" }}>
                          {isAr ? "التاجات المقترحة" : "Suggested Tags"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiStdData.tags.map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background:"rgba(245,158,11,0.15)", color:"#f59e0b", border:"1px solid rgba(245,158,11,0.3)" }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={applyStdData}
                    className="text-xs rounded-xl px-4 py-2 font-semibold transition"
                    style={{ border:"1px solid #f59e0b", background:"rgba(245,158,11,0.12)", color:"#f59e0b" }}>
                    ✓ {isAr ? "تطبيق على النموذج" : "Apply to form"}
                  </button>
                </div>
              )}
            </div>

            {/* AI Quality & Authenticity Scoring */}
            <div className="rounded-2xl p-6 space-y-4" style={{ border:"1px solid rgba(139,92,246,0.4)", background:"rgba(139,92,246,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.4)" }}>🏆</div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color:"#8b5cf6" }}>
                    {isAr ? "تقييم جودة الإعلان" : "Listing Quality & Authenticity Score"}
                  </h3>
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                    {isAr ? "يقيّم الاكتمال والوصف والمصداقية والصور" : "Evaluates completeness, description quality, credibility & photos"}
                  </p>
                </div>
              </div>
              <button onClick={scoreMyListing} disabled={!!aiLoading}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                style={{ background:"#8b5cf6", color:"white" }}>
                {aiLoading === "score"
                  ? <><span className="animate-spin">⟳</span> {isAr ? "جارٍ التقييم…" : "Scoring…"}</>
                  : `🏆 ${isAr ? "تقييم إعلاني" : "Score My Listing"}`}
              </button>

              {aiScore && (() => {
                const s = aiScore;
                const verdictColor = s.verdict === "excellent" ? "#22c55e" : s.verdict === "good" ? "#3b82f6" : s.verdict === "fair" ? "#f59e0b" : "#ef4444";
                const verdictLabel = { excellent: isAr?"ممتاز":"Excellent", good: isAr?"جيد":"Good", fair: isAr?"مقبول":"Fair", poor: isAr?"ضعيف":"Poor" }[s.verdict];
                const bar = (val: number, color: string) => (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background:"var(--surface2)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width:`${val}%`, background:color }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right" style={{ color }}>{val}</span>
                  </div>
                );
                return (
                  <div className="space-y-4">
                    {/* Overall score circle */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ border:`3px solid ${verdictColor}`, background:`${verdictColor}18` }}>
                        <span className="text-xl font-black" style={{ color:verdictColor }}>{s.overallScore}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color:verdictColor }}>{verdictLabel}</p>
                        <p className="text-xs" style={{ color:"var(--text-faint)" }}>{isAr?"النتيجة الإجمالية من 100":"Overall score out of 100"}</p>
                      </div>
                    </div>
                    {/* Breakdown bars with weights */}
                    <div className="space-y-3 text-xs">
                      {([
                        { label: isAr?"الاكتمال":"Completeness",         val: s.completeness,      color:"#3b82f6", weight:30 },
                        { label: isAr?"جودة الوصف":"Description Quality", val: s.descriptionQuality,color:"#8b5cf6", weight:30 },
                        { label: isAr?"المصداقية":"Credibility",           val: s.credibility,       color:"#22c55e", weight:20 },
                        { label: isAr?"الصور":"Photos",                    val: s.photoScore,        color:"#f59e0b", weight:20 },
                      ] as { label:string; val:number; color:string; weight:number }[]).map(({ label, val, color, weight }) => (
                        <div key={label}>
                          <div className="flex justify-between mb-1">
                            <span style={{ color:"var(--text-muted)" }}>{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                style={{ background:`${color}18`, color }}>
                                ×{weight}%
                              </span>
                              <span className="font-bold" style={{ color }}>{val}</span>
                            </div>
                          </div>
                          {bar(val, color)}
                        </div>
                      ))}
                    </div>
                    {/* Suggestions */}
                    {s.suggestions?.length > 0 && (
                      <div className="rounded-xl p-3 space-y-1.5" style={{ background:"var(--surface2)", border:"1px solid var(--border)" }}>
                        <p className="text-xs font-semibold" style={{ color:"var(--text-muted)" }}>
                          💡 {isAr?"اقتراحات للتحسين":"Improvement tips"}
                        </p>
                        {s.suggestions.map((tip, i) => (
                          <p key={i} className="text-xs" style={{ color:"var(--text-secondary)" }}>• {tip}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {aiError && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ border:"1px solid var(--danger)", background:"var(--danger-light)", color:"var(--danger)" }}>
                {aiError}
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Review ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid var(--border)" }}>
              {[
                [isAr?"العنوان":"Title",       form.title],
                [isAr?"فئة العقار":"Kind",     form.listing_kind==="commercial"?(isAr?"تجاري":"Commercial"):(isAr?"سكني":"Residential")],
                [isAr?"نوع الإعلان":"Type",    form.listing_type==="sale"?(isAr?"للبيع":"For Sale"):(isAr?"للإيجار":"For Rent")],
                [isAr?"العقار":"Property",     isAr ? PROPERTY_TYPES.find((p)=>p.value===form.property_type)?.labelAr||"" : PROPERTY_TYPES.find((p)=>p.value===form.property_type)?.label||""],
                [isAr?"السعر":"Price",         form.price?`EGP ${Number(form.price).toLocaleString()}`:""],
                [isAr?"غرف/حمامات":"Beds / Baths", `${form.bedrooms} ${isAr?"غرف":"beds"} · ${form.bathrooms} ${isAr?"حمامات":"baths"}`],
                [isAr?"المساحة":"Area",        form.area_size?`${form.area_size} m²`:""],
                [isAr?"التشطيب":"Finishing",   isAr ? FINISHING_TYPES.find((f)=>f.value===form.finishing)?.labelAr||"" : FINISHING_TYPES.find((f)=>f.value===form.finishing)?.label||""],
                [isAr?"وسائل الراحة":"Amenities", form.amenities.length>0 ? form.amenities.map((k)=>{const a=AMENITIES.find((x)=>x.key===k); return a?(isAr?a.labelAr:a.labelEn):k;}).join(isAr?"، ":", ") : ""],
                [isAr?"العنوان":"Address",      [address.street,address.city,address.region,address.country].filter(Boolean).join(", ")],
                [isAr?"الإحداثيات":"Coordinates", address.latitude?`${address.latitude.toFixed(5)}, ${address.longitude?.toFixed(5)}`:(isAr?"لم يتم التحديد":"Not geocoded")],
                [isAr?"الصور":"Photos",        images.length>0?`${images.filter((i)=>i.uploaded).length} ${isAr?"مرفوعة":"uploaded"}`:(isAr?"لا توجد صور":"No photos added")],
                [isAr?"وصف الذكاء الاصطناعي":"AI Desc", form.ai_generated_description?(isAr?"✓ تم التوليد":"✓ Generated"):"—"],
              ].map(([label,value],i)=>(
                <div key={label as string} className="flex items-start gap-4 px-5 py-3.5" style={{ background:i%2===0?"var(--surface2)":"var(--surface)" }}>
                  <span className="text-xs font-semibold uppercase tracking-widest w-28 flex-shrink-0 pt-0.5" style={{ color:"var(--text-faint)" }}>{label}</span>
                  <span className="text-sm" style={{ color:value?"var(--text-secondary)":"var(--text-faint)" }}>{value||"—"}</span>
                </div>
              ))}
            </div>

            {/* Photo preview strip */}
            {images.length > 0 && (
              <div className="rounded-2xl p-4 space-y-3" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:"var(--text-faint)" }}>Photos ({images.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <div key={img.localId} className="relative flex-shrink-0 rounded-lg overflow-hidden" style={{ width:80, height:60, border: idx===0?"2px solid var(--accent)":"1px solid var(--border)" }}>
                      <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                      {idx===0&&<span className="absolute bottom-0.5 start-0.5 text-[9px] font-bold px-1 rounded" style={{ background:"var(--accent)", color:"var(--accent-text)" }}>{isAr?"غلاف":"Cover"}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.ai_generated_description&&(
              <div className="rounded-2xl p-5" style={{ border:"1px solid var(--accent)", background:"var(--accent-light)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:"var(--accent)" }}>
                  {isAr?"الوصف العربي بالذكاء الاصطناعي":"AI Arabic Description"}
                </p>
                <p className="text-sm leading-relaxed text-right" dir="rtl" style={{ color:"var(--text-secondary)" }}>{form.ai_generated_description}</p>
              </div>
            )}
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background:"var(--danger-light)", color:"var(--danger)", border:"1px solid var(--danger)" }}>
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop:"1px solid var(--border)" }}>
          <button onClick={()=>setStep((s)=>s-1)} disabled={step===0} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition disabled:opacity-30" style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
            ← Back
          </button>
          <span className="text-xs" style={{ color:"var(--text-faint)" }}>{step+1} / {STEPS_KEYS.length}</span>
          {step < STEPS_KEYS.length - 1 ? (
            <button onClick={()=>setStep((s)=>s+1)} disabled={!canNext} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition" style={{ background:"var(--accent)", color:"var(--accent-text)", opacity:canNext?1:0.4 }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isCalculatingScore || submitting} className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition disabled:opacity-70" style={{ background:"var(--success)", color:"white" }}>
              {isCalculatingScore ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isAr ? "جاري حساب درجة الموقع..." : "Calculating location score..."}
                </>
              ) : submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isAr ? "جاري الإرسال..." : "Submitting..."}
                </>
              ) : isEditMode ? (isAr ? "💾 حفظ التغييرات" : "💾 Save Changes") : (isAr ? "🚀 إرسال الإعلان" : "🚀 Submit Listing")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
