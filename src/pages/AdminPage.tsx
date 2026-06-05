import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  adminApi,
  extractErrorMessage,
  ComplaintStatusEnum,
  type AdminListing,
  type AdminUser,
  type AdminStats,
  type AdminComplaint,
  type ApiComplaintStatus,
} from "../lib/api";
import { complaintReasonLabel } from "../data/complaintReasons";

// ── Listing helpers ─────────────────────────────────────────────────────────
type ListingStatus = "pending" | "active" | "rejected";

function listingStatusOf(l: AdminListing): ListingStatus {
  // Backend ListingStatus: Draft=0, Active=1, Archived=2, Sold=3, Rented=4, Pending=5
  if (l.status === 2) return "rejected";
  if (l.isApproved && l.status === 1) return "active";
  return "pending";
}

function propertyTypeLabel(n: number): string {
  return ["Apartment","Villa","Studio","Duplex","Penthouse","Office","Shop","Land"][n] ?? "Property";
}
function propertyIcon(n: number): string {
  return ["🏢","🏡","🛏️","🏘️","🌇","🏢","🏬","🌍"][n] ?? "🏠";
}

function fmt(n: number) { return n.toLocaleString(); }
function fmtPrice(n: number, type: number) { return type===1 ? `EGP ${fmt(n)}/mo` : `EGP ${fmt(n)}`; }
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const days = Math.floor(d / 86_400_000);
  if (days > 30) return new Date(iso).toLocaleDateString("en-EG", { day:"numeric", month:"short", year:"numeric" });
  if (days > 0)  return `${days}d ago`;
  const hrs = Math.floor(d / 3_600_000);
  return hrs > 0 ? `${hrs}h ago` : "Just now";
}

const LISTING_STATUS_STYLE: Record<ListingStatus, React.CSSProperties> = {
  pending:  { background:"rgba(245,158,11,0.12)", color:"#f59e0b",        border:"1px solid rgba(245,158,11,0.35)" },
  active:   { background:"var(--success-light)",  color:"var(--success)", border:"1px solid var(--success)" },
  rejected: { background:"var(--danger-light)",   color:"var(--danger)",  border:"1px solid var(--danger)" },
};

// ── User helpers ─────────────────────────────────────────────────────────────
const USER_STATUS_LABEL = ["Pending", "Active", "Suspended", "Banned"] as const;
const USER_STATUS_LABEL_AR = ["قيد الانتظار", "نشط", "موقوف مؤقتًا", "محظور"] as const;

const USER_STATUS_STYLE: Record<number, React.CSSProperties> = {
  0: { background:"rgba(245,158,11,0.12)", color:"#f59e0b",        border:"1px solid rgba(245,158,11,0.35)" },
  1: { background:"var(--success-light)",  color:"var(--success)", border:"1px solid var(--success)" },
  2: { background:"rgba(245,158,11,0.18)", color:"#d97706",        border:"1px solid #f59e0b" },
  3: { background:"var(--danger-light)",   color:"var(--danger)",  border:"1px solid var(--danger)" },
};

function userTypeLabel(t: number): string {
  return ["Customer", "Lister", "Admin"][t] ?? "Unknown";
}

// Role label that matches the navbar: a Lister with listerType Agent (1) shows
// as "Agent", an individual Lister shows as "Lister".
function roleLabel(userType: number, listerType: number | null): string {
  if (userType === 1) return listerType === 1 ? "Agent" : "Lister";
  return userTypeLabel(userType);
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, badge }:{ label:string; value:number|string; icon:string; accent:string; badge?:number }) {
  return (
    <div className="rounded-2xl p-5 relative" style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 end-3 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background:"var(--danger)", color:"white" }}>{badge}</span>
      )}
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-black tabular-nums" style={{ color:accent }}>{value}</div>
      <div className="text-xs mt-0.5 font-medium uppercase tracking-wide" style={{ color:"var(--text-muted)" }}>{label}</div>
    </div>
  );
}

// ── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({ listing, onConfirm, onCancel }:{
  listing: AdminListing;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [reason, setReason] = useState("");
  const PRESETS = [
    "Missing property photos.",
    "Incomplete listing details.",
    "Price appears unrealistic for listed area.",
    "Property description is insufficient.",
    "Duplicate listing detected.",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background:"rgba(0,0,0,0.6)" }} onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background:"var(--surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-xl)" }}>
        <h3 className="text-base font-bold mb-1" style={{ color:"var(--text)" }}>
          {isAr ? "رفض الإعلان" : "Reject Listing"}
        </h3>
        <p className="text-xs mb-4 truncate" style={{ color:"var(--text-muted)" }}>"{listing.title}"</p>

        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:"var(--text-faint)" }}>
          {isAr ? "أسباب شائعة" : "Common reasons"}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setReason(p)}
              className="text-xs rounded-full px-3 py-1 transition"
              style={{
                border:`1px solid ${reason===p?"var(--danger)":"var(--border)"}`,
                background: reason===p?"var(--danger-light)":"var(--surface2)",
                color: reason===p?"var(--danger)":"var(--text-muted)",
              }}>
              {p}
            </button>
          ))}
        </div>

        <textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3}
          placeholder={isAr ? "أو اكتب سببًا مخصصًا…" : "Or write a custom reason…"}
          className="w-full rounded-xl text-sm resize-none outline-none mb-4"
          style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", padding:"10px 12px" }} />

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-40"
            style={{ background:"var(--danger)", color:"white" }}>
            {isAr ? "رفض الإعلان" : "Reject Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Listings tab ─────────────────────────────────────────────────────────────
function ListingsTab({ onChange }: { onChange: () => void }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ListingStatus|"all">("pending");
  const [rejectTarget, setRejectTarget] = useState<AdminListing|null>(null);
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [actingId, setActingId] = useState<string|null>(null);
  const [featureIds, setFeatureIds] = useState<Set<string>>(new Set());

  function toggleFeature(id: string) {
    setFeatureIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.listListings();
      setListings(res.data.data);
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to load listings"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    setActingId(id);
    try {
      await adminApi.approveListing(id, featureIds.has(id));
      setFeatureIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      await load(); onChange();
    }
    catch (e) { alert(extractErrorMessage(e, "Failed to approve")); }
    finally { setActingId(null); }
  }
  async function reApprove(id: string) {
    setActingId(id);
    try { await adminApi.reApproveListing(id); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to re-approve")); }
    finally { setActingId(null); }
  }
  async function unpublish(id: string) {
    if (!confirm(isAr ? "إلغاء نشر هذا الإعلان؟" : "Unpublish this listing?")) return;
    setActingId(id);
    try { await adminApi.unpublishListing(id); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to unpublish")); }
    finally { setActingId(null); }
  }
  async function reject(id: string, reason: string) {
    setActingId(id);
    try { await adminApi.rejectListing(id, reason); await load(); setRejectTarget(null); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to reject")); }
    finally { setActingId(null); }
  }
  async function hardDelete(id: string, title: string) {
    if (!confirm(isAr ? `حذف "${title}" نهائيًا؟ لا يمكن التراجع.` : `Permanently delete "${title}"? This cannot be undone.`)) return;
    setActingId(id);
    try { await adminApi.deleteListing(id); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to delete")); }
    finally { setActingId(null); }
  }

  const withStatus = listings.map((l) => ({ l, s: listingStatusOf(l) }));
  const filtered = filter==="all" ? withStatus : withStatus.filter(({s}) => s===filter);
  const counts = {
    all: withStatus.length,
    pending:  withStatus.filter(({s})=>s==="pending").length,
    active:   withStatus.filter(({s})=>s==="active").length,
    rejected: withStatus.filter(({s})=>s==="rejected").length,
  };

  const TABS: { v: ListingStatus|"all"; label: string; labelAr: string }[] = [
    { v:"all",      label:"All",      labelAr:"الكل"            },
    { v:"pending",  label:"Pending",  labelAr:"قيد المراجعة"    },
    { v:"active",   label:"Active",   labelAr:"نشط"             },
    { v:"rejected", label:"Rejected", labelAr:"مرفوض"           },
  ];

  if (loading) return <div className="text-center py-16 rounded-2xl" style={{ border:"1px dashed var(--border)" }}>
    <p className="text-sm" style={{ color:"var(--text-muted)" }}>{isAr?"جارٍ التحميل…":"Loading…"}</p>
  </div>;
  if (error) return <div className="text-center py-16 rounded-2xl" style={{ border:"1px solid var(--danger)", background:"var(--danger-light)", color:"var(--danger)" }}>
    <p className="text-sm">{error}</p>
    <button onClick={load} className="mt-3 text-xs underline">{isAr?"إعادة المحاولة":"Retry"}</button>
  </div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
        {TABS.map(({ v, label, labelAr }) => (
          <button key={v} onClick={() => setFilter(v)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
            style={{ background:filter===v?"var(--surface2)":"transparent", color:filter===v?"var(--text)":"var(--text-faint)" }}>
            {isAr ? labelAr : label}
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background:"var(--surface2)", color:"var(--text-muted)" }}>
              {counts[v]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ border:"1px dashed var(--border)" }}>
          <p className="text-3xl mb-2">🏠</p>
          <p className="text-sm" style={{ color:"var(--text-muted)" }}>
            {isAr ? "لا توجد إعلانات" : "No listings in this category"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ l, s }) => (
            <div key={l.id} className="rounded-2xl overflow-hidden transition-all"
              style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <div className="flex items-start gap-4 p-4">
                <div className="w-20 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden"
                  style={{ background:"var(--surface2)", border:"1px solid var(--border)" }}>
                  {l.coverImageUrl
                    ? <img src={l.coverImageUrl} alt="" className="w-full h-full object-cover" />
                    : propertyIcon(l.propertyType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate" style={{ color:"var(--text)" }}>{l.title}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={LISTING_STATUS_STYLE[s]}>{s}</span>
                        {l.lister?.isVerified && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                            style={{ background:"var(--accent-light, rgba(59,130,246,0.12))", color:"var(--accent)", border:"1px solid var(--accent)" }}>
                            ✓ {isAr ? "بائع موثق" : "Verified"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>
                        {l.address?.city ?? "—"} · {propertyTypeLabel(l.propertyType)} · {l.areaSize}m²{l.bedrooms>0?` · ${l.bedrooms}bd`:""}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color:"var(--text-faint)" }}>
                        #{l.id.slice(0,8)} · {isAr?"بواسطة":"by"} {l.lister?.name ?? "—"} · {isAr?"مشاهدات:":"Views:"} {l.viewCount}
                      </p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color:"var(--accent)" }}>{fmtPrice(l.price, l.listingType)}</p>
                      <p className="text-[10px] mt-0.5" style={{ color:"var(--text-faint)" }}>{timeAgo(l.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {s === "pending" && (
                      <>
                        <button onClick={() => approve(l.id)} disabled={actingId===l.id}
                          className="rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                          style={{ background:"var(--success)", color:"white" }}>
                          {isAr?"موافقة":"Approve"}
                        </button>
                        <button onClick={() => setRejectTarget(l)} disabled={actingId===l.id}
                          className="rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                          style={{ background:"var(--danger)", color:"white" }}>
                          {isAr?"رفض":"Reject"}
                        </button>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none ms-1"
                          style={{ color: featureIds.has(l.id) ? "var(--gold-deep, #b8860b)" : "var(--text-muted)" }}>
                          <input type="checkbox" checked={featureIds.has(l.id)} disabled={actingId===l.id}
                            onChange={() => toggleFeature(l.id)}
                            style={{ accentColor: "var(--gold-deep, #b8860b)" }} />
                          {isAr ? "تمييز في الصفحة الرئيسية" : "Feature on homepage"}
                        </label>
                      </>
                    )}
                    {s === "active" && (
                      <button onClick={() => unpublish(l.id)} disabled={actingId===l.id}
                        className="rounded-xl px-4 py-2 text-xs font-medium transition disabled:opacity-50"
                        style={{ border:"1px solid var(--danger)", color:"var(--danger)", background:"var(--danger-light)" }}>
                        {isAr?"إلغاء النشر":"Unpublish"}
                      </button>
                    )}
                    {s === "rejected" && (
                      <button onClick={() => reApprove(l.id)} disabled={actingId===l.id}
                        className="rounded-xl px-4 py-2 text-xs font-medium transition disabled:opacity-50"
                        style={{ border:"1px solid var(--success)", color:"var(--success)", background:"var(--success-light)" }}>
                        {isAr?"إعادة الموافقة":"Re-approve"}
                      </button>
                    )}
                    <Link to={`/listing/${l.id}?source=direct`}
                      className="rounded-xl px-4 py-2 text-xs font-medium transition"
                      style={{ border:"1px solid var(--border)", color:"var(--text-muted)", background:"var(--surface2)" }}>
                      {isAr?"عرض":"View"}
                    </Link>
                    <button onClick={() => hardDelete(l.id, l.title)} disabled={actingId===l.id}
                      className="rounded-xl px-3 py-2 text-xs transition disabled:opacity-50"
                      style={{ color:"var(--danger)", background:"transparent" }}>
                      {isAr?"حذف نهائي":"Delete"}
                    </button>
                    <button onClick={() => setExpandedId(expandedId===l.id?null:l.id)}
                      className="text-xs transition ms-auto" style={{ color:"var(--text-faint)" }}>
                      {expandedId===l.id?(isAr?"طي ↑":"Collapse ↑"):(isAr?"تفاصيل ↓":"Details ↓")}
                    </button>
                  </div>
                </div>
              </div>

              {expandedId === l.id && (
                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
                  style={{ borderTop:"1px solid var(--border)", paddingTop:12 }}>
                  {[
                    [isAr?"نوع الإعلان":"Type",    l.listingType===1?"rent":"sale"],
                    [isAr?"النوع":"Property",      propertyTypeLabel(l.propertyType)],
                    [isAr?"المساحة":"Area",        `${l.areaSize} m²`],
                    [isAr?"المشاهدات":"Views",     String(l.viewCount)],
                  ].map(([k,v])=>(
                    <div key={k as string} className="rounded-xl p-3" style={{ background:"var(--surface2)", border:"1px solid var(--border)" }}>
                      <p className="text-[10px] uppercase font-bold mb-0.5" style={{ color:"var(--text-faint)" }}>{k}</p>
                      <p className="text-sm font-semibold capitalize" style={{ color:"var(--text)" }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectModal
          listing={rejectTarget}
          onConfirm={(reason) => reject(rejectTarget.id, reason)}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

// ── Suspend modal ────────────────────────────────────────────────────────────
function SuspendModal({ user, onConfirm, onCancel }:{
  user: AdminUser;
  onConfirm: (days: number, reason: string) => void;
  onCancel: () => void;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background:"rgba(0,0,0,0.6)" }} onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
        <h3 className="text-base font-bold mb-1" style={{ color:"var(--text)" }}>
          {isAr ? "إيقاف المستخدم مؤقتًا" : "Suspend User"}
        </h3>
        <p className="text-xs mb-4 truncate" style={{ color:"var(--text-muted)" }}>{user.name} · {user.email}</p>

        <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:"var(--text-faint)" }}>
          {isAr ? "المدة (أيام)" : "Duration (days)"}
        </label>
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {[1, 3, 7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className="text-xs rounded-full px-3 py-1 transition"
              style={{
                border:`1px solid ${days===d?"#f59e0b":"var(--border)"}`,
                background: days===d?"rgba(245,158,11,0.15)":"var(--surface2)",
                color: days===d?"#d97706":"var(--text-muted)",
              }}>
              {d}d
            </button>
          ))}
          <input type="number" min={1} max={365} value={days}
            onChange={(e)=>setDays(Math.max(1, Number(e.target.value)||1))}
            className="w-20 rounded-full px-3 py-1 text-xs outline-none"
            style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)" }} />
        </div>

        <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color:"var(--text-faint)" }}>
          {isAr ? "السبب" : "Reason"}
        </label>
        <textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3}
          placeholder={isAr ? "اكتب السبب…" : "Reason for suspension…"}
          className="w-full rounded-xl text-sm resize-none outline-none mb-4"
          style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", padding:"10px 12px" }} />

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium"
            style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={() => onConfirm(days, reason.trim())}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition"
            style={{ background:"#f59e0b", color:"white" }}>
            {isAr ? `إيقاف ${days} يوم` : `Suspend ${days}d`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User detail drawer ───────────────────────────────────────────────────────
function UserDetailDrawer({ userId, onClose, onChange }:{
  userId: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [data, setData] = useState<{ profile: AdminUser; stats: { listingCount: number; inquiryCount: number; totalViews: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showSuspend, setShowSuspend] = useState(false);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await adminApi.getUser(userId);
      setData(r.data.data);
    } catch (e) {
      setErr(extractErrorMessage(e, "Failed to load user"));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [userId]);

  async function ban() {
    const reason = prompt(isAr ? "سبب الحظر (اختياري):" : "Ban reason (optional):") ?? "";
    if (!confirm(isAr ? "حظر هذا المستخدم نهائيًا؟" : "Permanently ban this user?")) return;
    setActing(true);
    try { await adminApi.banUser(userId, reason || undefined); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to ban")); }
    finally { setActing(false); }
  }
  async function reactivate() {
    setActing(true);
    try { await adminApi.reactivateUser(userId); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to reactivate")); }
    finally { setActing(false); }
  }
  async function toggleVerify() {
    setActing(true);
    try { await adminApi.setVerified(userId, !data!.profile.isVerified); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to update verification")); }
    finally { setActing(false); }
  }
  async function changeRole(role: string) {
    setActing(true);
    try { await adminApi.assignRole(userId, role); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to assign role")); }
    finally { setActing(false); }
  }
  async function changeMaxListings() {
    const current = data?.profile.maxListings ?? 0;
    const input = prompt(isAr ? "الحد الأقصى للإعلانات (0 = غير محدود):" : "Max listings (0 = unlimited):", String(current));
    if (input == null) return;
    const n = parseInt(input, 10);
    if (isNaN(n) || n < 0) { alert(isAr ? "أدخل رقمًا صحيحًا (0 أو أكثر)." : "Enter a valid number (0 or more)."); return; }
    setActing(true);
    try { await adminApi.setMaxListings(userId, n); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to update listing cap")); }
    finally { setActing(false); }
  }
  async function hardDelete() {
    if (!confirm(isAr ? "حذف هذا المستخدم نهائيًا مع كل بياناته؟" : "Permanently delete this user and all their data?")) return;
    setActing(true);
    try { await adminApi.deleteUser(userId); onClose(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to delete user")); setActing(false); }
  }
  async function doSuspend(days: number, reason: string) {
    setActing(true);
    try { await adminApi.suspendUser(userId, days, reason || undefined); setShowSuspend(false); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to suspend")); }
    finally { setActing(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background:"rgba(0,0,0,0.55)" }} onClick={onClose} />
      <div className="relative w-full max-w-md h-full overflow-y-auto p-6"
        style={{ background:"var(--surface)", borderInlineStart:"1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color:"var(--text)" }}>
            {isAr ? "ملف المستخدم" : "User Profile"}
          </h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color:"var(--text-faint)" }}>×</button>
        </div>

        {loading && <p className="text-sm" style={{ color:"var(--text-muted)" }}>{isAr?"جارٍ التحميل…":"Loading…"}</p>}
        {err && <p className="text-sm" style={{ color:"var(--danger)" }}>{err}</p>}

        {data && (
          <>
            <div className="rounded-2xl p-4 mb-4" style={{ background:"var(--surface2)", border:"1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ background:"var(--accent-light, rgba(59,130,246,0.12))", color:"var(--accent)" }}>
                  {(data.profile.name || data.profile.email || "?").slice(0,1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold truncate" style={{ color:"var(--text)" }}>{data.profile.name}</h3>
                    {data.profile.isVerified && (
                      <span title={isAr?"موثق":"Verified"} className="text-[11px] font-bold inline-flex items-center justify-center w-5 h-5 rounded-full"
                        style={{ background:"var(--accent)", color:"white" }}>✓</span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color:"var(--text-muted)" }}>{data.profile.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={USER_STATUS_STYLE[data.profile.accountStatus]}>
                      {(isAr ? USER_STATUS_LABEL_AR : USER_STATUS_LABEL)[data.profile.accountStatus]}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background:"var(--surface)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>
                      {userTypeLabel(data.profile.userType)}
                    </span>
                    {data.profile.userType === 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background:"var(--surface)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>
                        {data.profile.listerType === 1 ? (isAr?"وكيل":"Agent") : (isAr?"بائع فردي":"Individual")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {data.profile.accountStatus === 2 && data.profile.suspendedUntil && (
                <p className="mt-3 text-xs" style={{ color:"#d97706" }}>
                  {isAr ? "موقوف حتى:" : "Suspended until:"} {new Date(data.profile.suspendedUntil).toLocaleString()}
                  {data.profile.suspensionReason && <> · {data.profile.suspensionReason}</>}
                </p>
              )}
              {data.profile.accountStatus === 3 && (
                <p className="mt-3 text-xs" style={{ color:"var(--danger)" }}>
                  {isAr ? "محظور نهائيًا" : "Permanently banned"}
                  {data.profile.banReason && <> · {data.profile.banReason}</>}
                </p>
              )}
              {data.profile.userType === 1 && data.profile.subscriptionEndDate && (
                <p className="mt-2 text-xs" style={{ color:"var(--text-muted)" }}>
                  {isAr ? "الاشتراك حتى:" : "Subscription until:"} {new Date(data.profile.subscriptionEndDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatCard label={isAr?"الإعلانات":"Listings"} value={data.stats.listingCount} icon="🏠" accent="var(--accent)" />
              <StatCard label={isAr?"الاستفسارات":"Inquiries"} value={data.stats.inquiryCount} icon="💬" accent="var(--success)" />
              <StatCard label={isAr?"المشاهدات":"Views"} value={data.stats.totalViews} icon="👁" accent="#f59e0b" />
            </div>

            <h4 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:"var(--text-faint)" }}>
              {isAr ? "الإجراءات" : "Actions"}
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {data.profile.accountStatus !== 1 && (
                <button onClick={reactivate} disabled={acting}
                  className="rounded-xl py-2 text-xs font-bold disabled:opacity-50"
                  style={{ background:"var(--success)", color:"white" }}>
                  {isAr?"إعادة التفعيل":"Reactivate"}
                </button>
              )}
              {data.profile.accountStatus !== 2 && data.profile.accountStatus !== 3 && (
                <button onClick={()=>setShowSuspend(true)} disabled={acting}
                  className="rounded-xl py-2 text-xs font-bold disabled:opacity-50"
                  style={{ background:"#f59e0b", color:"white" }}>
                  {isAr?"إيقاف مؤقت":"Suspend"}
                </button>
              )}
              {data.profile.accountStatus !== 3 && (
                <button onClick={ban} disabled={acting}
                  className="rounded-xl py-2 text-xs font-bold disabled:opacity-50"
                  style={{ background:"var(--danger)", color:"white" }}>
                  {isAr?"حظر نهائي":"Ban"}
                </button>
              )}
              {data.profile.userType === 1 && (
                <button onClick={toggleVerify} disabled={acting}
                  className="rounded-xl py-2 text-xs font-bold disabled:opacity-50"
                  style={{
                    background: data.profile.isVerified ? "var(--surface2)" : "var(--accent)",
                    color: data.profile.isVerified ? "var(--text)" : "white",
                    border: data.profile.isVerified ? "1px solid var(--border)" : "none",
                  }}>
                  {data.profile.isVerified ? (isAr?"إلغاء التوثيق":"Unverify") : (isAr?"توثيق":"Verify")}
                </button>
              )}
            </div>

            <h4 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:"var(--text-faint)" }}>
              {isAr ? "الدور" : "Role"}
            </h4>
            <div className="flex gap-2 mb-4 flex-wrap">
              {["Customer","Lister","Admin"].map((r) => (
                <button key={r} onClick={()=>changeRole(r)} disabled={acting || data.profile.roles.includes(r)}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  style={{
                    background: data.profile.roles.includes(r) ? "var(--accent-light, rgba(59,130,246,0.12))" : "var(--surface2)",
                    color: data.profile.roles.includes(r) ? "var(--accent)" : "var(--text-muted)",
                    border:"1px solid var(--border)",
                  }}>
                  {r}{data.profile.roles.includes(r) ? " ✓" : ""}
                </button>
              ))}
            </div>

            {/* Listing cap (listers/agents only) */}
            {data.profile.userType === 1 && (
              <>
                <h4 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:"var(--text-faint)" }}>
                  {isAr ? "حد الإعلانات" : "Listing Cap"}
                </h4>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-semibold" style={{ color:"var(--text)" }}>
                    {data.profile.maxListings === 0 ? (isAr?"غير محدود":"Unlimited") : data.profile.maxListings}
                  </span>
                  <button onClick={changeMaxListings} disabled={acting}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    style={{ background:"var(--surface2)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>
                    {isAr ? "تغيير" : "Change"}
                  </button>
                </div>
              </>
            )}

            <button onClick={hardDelete} disabled={acting}
              className="w-full rounded-xl py-2.5 text-xs font-bold disabled:opacity-50"
              style={{ border:"1px solid var(--danger)", color:"var(--danger)", background:"transparent" }}>
              {isAr?"حذف المستخدم نهائيًا":"Permanently Delete User"}
            </button>
          </>
        )}

        {showSuspend && data && (
          <SuspendModal user={data.profile} onConfirm={doSuspend} onCancel={() => setShowSuspend(false)} />
        )}
      </div>
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────
function UsersTab({ onChange }: { onChange: () => void }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all"|"active"|"suspended"|"banned"|"pending">("all");
  const [roleFilter, setRoleFilter] = useState<"all"|"Customer"|"Lister"|"Admin">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await adminApi.listUsers();
      setUsers(r.data.data);
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to load users"));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const s = search.toLowerCase();
        if (!(u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.userName?.toLowerCase().includes(s))) return false;
      }
      if (statusFilter !== "all") {
        const map = { pending:0, active:1, suspended:2, banned:3 } as const;
        if (u.accountStatus !== map[statusFilter]) return false;
      }
      if (roleFilter !== "all") {
        if (!u.roles.some((r) => r.toLowerCase() === roleFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [users, search, statusFilter, roleFilter]);

  if (loading) return <div className="text-center py-16 rounded-2xl" style={{ border:"1px dashed var(--border)" }}>
    <p className="text-sm" style={{ color:"var(--text-muted)" }}>{isAr?"جارٍ التحميل…":"Loading…"}</p>
  </div>;
  if (error) return <div className="text-center py-16 rounded-2xl" style={{ border:"1px solid var(--danger)", background:"var(--danger-light)", color:"var(--danger)" }}>
    <p className="text-sm">{error}</p>
    <button onClick={load} className="mt-3 text-xs underline">{isAr?"إعادة المحاولة":"Retry"}</button>
  </div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? "بحث بالاسم أو البريد…" : "Search name or email…"}
          className="rounded-xl text-sm outline-none flex-1 min-w-[200px]"
          style={{ border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", padding:"10px 14px" }}
        />
        <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)}
          className="rounded-xl text-sm outline-none px-3 py-2"
          style={{ border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)" }}>
          <option value="all">{isAr?"كل الحالات":"All statuses"}</option>
          <option value="active">{isAr?"نشط":"Active"}</option>
          <option value="suspended">{isAr?"موقوف":"Suspended"}</option>
          <option value="banned">{isAr?"محظور":"Banned"}</option>
          <option value="pending">{isAr?"قيد الانتظار":"Pending"}</option>
        </select>
        <select value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value as any)}
          className="rounded-xl text-sm outline-none px-3 py-2"
          style={{ border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)" }}>
          <option value="all">{isAr?"كل الأدوار":"All roles"}</option>
          <option value="Customer">{isAr?"عميل":"Customer"}</option>
          <option value="Lister">{isAr?"بائع/وكيل":"Lister/Agent"}</option>
          <option value="Admin">{isAr?"مشرف":"Admin"}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ border:"1px dashed var(--border)" }}>
          <p className="text-3xl mb-2">👥</p>
          <p className="text-sm" style={{ color:"var(--text-muted)" }}>{isAr?"لا يوجد مستخدمون":"No users match"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-2xl p-4 transition cursor-pointer hover:opacity-90"
              onClick={()=>setOpenId(u.id)}
              style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background:"var(--accent-light, rgba(59,130,246,0.12))", color:"var(--accent)" }}>
                  {(u.name || u.email || "?").slice(0,1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-semibold truncate" style={{ color:"var(--text)" }}>{u.name}</h3>
                    {u.isVerified && (
                      <span title={isAr?"موثق":"Verified"} className="text-[10px] font-bold inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0"
                        style={{ background:"var(--accent)", color:"white" }}>✓</span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={USER_STATUS_STYLE[u.accountStatus]}>
                      {(isAr ? USER_STATUS_LABEL_AR : USER_STATUS_LABEL)[u.accountStatus]}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background:"var(--surface2)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>
                      {roleLabel(u.userType, u.listerType)}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color:"var(--text-muted)" }}>{u.email}</p>
                </div>
                <span className="text-xs" style={{ color:"var(--text-faint)" }}>{timeAgo(u.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {openId && (
        <UserDetailDrawer
          userId={openId}
          onClose={()=>setOpenId(null)}
          onChange={() => { load(); onChange(); }}
        />
      )}
    </div>
  );
}

// ── Complaints tab ───────────────────────────────────────────────────────────
const COMPLAINT_STATUS_STYLE: Record<number, React.CSSProperties> = {
  0: { background:"var(--danger-light)", color:"var(--danger)" },                       // Open
  1: { background:"var(--surface2)", color:"var(--text-muted)" },                       // Reviewed
  2: { background:"var(--surface2)", color:"var(--text-faint)" },                       // Dismissed
  3: { background:"var(--success-light, rgba(34,197,94,0.12))", color:"var(--success)" },// ActionTaken
};

function ComplaintsTab({ onChange }: { onChange: () => void }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all"|"open">("open");
  const [actingId, setActingId] = useState<string|null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.listComplaints();
      setComplaints(res.data.data);
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to load complaints"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function resolve(id: string, status: ApiComplaintStatus) {
    setActingId(id);
    try { await adminApi.resolveComplaint(id, status); await load(); onChange(); }
    catch (e) { alert(extractErrorMessage(e, "Failed to update complaint")); }
    finally { setActingId(null); }
  }

  const statusLabel = (s: number) => {
    const map: Record<number,[string,string]> = {
      0: ["Open","مفتوح"], 1: ["Reviewed","تمت المراجعة"],
      2: ["Dismissed","مرفوض"], 3: ["Action Taken","تم اتخاذ إجراء"],
    };
    return isAr ? map[s][1] : map[s][0];
  };

  const filtered = filter === "open"
    ? complaints.filter((c) => c.status === ComplaintStatusEnum.Open)
    : complaints;
  const openCount = complaints.filter((c) => c.status === ComplaintStatusEnum.Open).length;

  if (loading) return <div className="text-center py-16 rounded-2xl" style={{ border:"1px dashed var(--border)" }}>
    <p className="text-sm" style={{ color:"var(--text-muted)" }}>{isAr?"جارٍ التحميل…":"Loading…"}</p>
  </div>;
  if (error) return <div className="text-center py-16 rounded-2xl" style={{ border:"1px solid var(--danger)", background:"var(--danger-light)", color:"var(--danger)" }}>
    <p className="text-sm">{error}</p>
    <button onClick={load} className="mt-3 text-xs underline">{isAr?"إعادة المحاولة":"Retry"}</button>
  </div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
        {([
          { v:"open" as const, label:"Open",   labelAr:"مفتوح", count: openCount },
          { v:"all"  as const, label:"All",    labelAr:"الكل",  count: complaints.length },
        ]).map(({ v, label, labelAr, count }) => (
          <button key={v} onClick={() => setFilter(v)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
            style={{ background:filter===v?"var(--surface2)":"transparent", color:filter===v?"var(--text)":"var(--text-faint)" }}>
            {isAr ? labelAr : label}
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background:"var(--surface2)", color:"var(--text-muted)" }}>{count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ border:"1px dashed var(--border)" }}>
          <p className="text-3xl mb-2">⚐</p>
          <p className="text-sm" style={{ color:"var(--text-muted)" }}>
            {isAr ? "لا توجد بلاغات" : "No complaints in this category"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl p-4"
              style={{ border:"1px solid var(--border)", background:"var(--surface)" }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold" style={{ color:"var(--text)" }}>
                      {complaintReasonLabel(c.reason, isAr)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={COMPLAINT_STATUS_STYLE[c.status]}>{statusLabel(c.status)}</span>
                  </div>
                  <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                    {isAr ? "الإعلان: " : "Listing: "}
                    <Link to={`/listings/${c.listingId}`} className="underline" style={{ color:"var(--accent)" }}>
                      {c.listingTitle ?? c.listingId.slice(0,8)}
                    </Link>
                    {c.listingReferenceNumber ? ` · #${c.listingReferenceNumber}` : ""}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color:"var(--text-faint)" }}>
                    {isAr ? "المُبلِّغ: " : "Reporter: "}
                    {c.reporter ? `${c.reporter.name} (${c.reporter.email})` : "—"}
                    {" · "}
                    {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                  {c.details && (
                    <p className="text-xs mt-2 rounded-lg px-3 py-2"
                      style={{ background:"var(--surface2)", color:"var(--text-secondary)" }}>
                      “{c.details}”
                    </p>
                  )}
                </div>
              </div>
              {c.status === ComplaintStatusEnum.Open && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button disabled={actingId===c.id}
                    onClick={() => resolve(c.id, ComplaintStatusEnum.Reviewed as ApiComplaintStatus)}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                    style={{ border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-secondary)" }}>
                    {isAr ? "تمت المراجعة" : "Mark reviewed"}
                  </button>
                  <button disabled={actingId===c.id}
                    onClick={() => resolve(c.id, ComplaintStatusEnum.ActionTaken as ApiComplaintStatus)}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                    style={{ border:"1px solid var(--success)", background:"var(--success-light, rgba(34,197,94,0.12))", color:"var(--success)" }}>
                    {isAr ? "تم اتخاذ إجراء" : "Action taken"}
                  </button>
                  <button disabled={actingId===c.id}
                    onClick={() => resolve(c.id, ComplaintStatusEnum.Dismissed as ApiComplaintStatus)}
                    className="text-xs font-semibold rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                    style={{ border:"1px solid var(--border)", background:"transparent", color:"var(--text-faint)" }}>
                    {isAr ? "تجاهل" : "Dismiss"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [tab, setTab] = useState<"listings"|"users"|"complaints">("listings");
  const [stats, setStats] = useState<AdminStats | null>(null);

  async function loadStats() {
    try { const r = await adminApi.getStats(); setStats(r.data); }
    catch { /* best-effort */ }
  }
  useEffect(() => { loadStats(); }, []);

  return (
    <div className="min-h-screen pt-6 sm:pt-10 pb-10 sm:pb-16 px-4 sm:px-6" style={{ background:"var(--bg)" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background:"var(--danger-light)", border:"1px solid var(--danger)" }}>⚙️</div>
            <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>
              {isAr ? "لوحة الإدارة" : "Admin Panel"}
            </h1>
          </div>
          <p className="text-sm ms-11" style={{ color:"var(--text-muted)" }}>
            {isAr ? "إدارة الإعلانات والمستخدمين" : "Manage listings and users across the platform"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label={isAr?"قيد المراجعة":"Pending Review"} value={stats?.listings.pendingListings ?? "—"} icon="⏳" accent="#f59e0b" badge={stats?.listings.pendingListings ?? 0} />
          <StatCard label={isAr?"إجمالي الإعلانات":"Total Listings"} value={stats?.listings.totalListings ?? "—"} icon="🏠" accent="var(--accent)" />
          <StatCard label={isAr?"المستخدمون":"Users"} value={stats?.users.totalUsers ?? "—"} icon="👥" accent="var(--success)" />
          <StatCard label={isAr?"محظور/موقوف":"Banned/Susp."} value={(stats ? stats.users.bannedUsers + stats.users.suspendedUsers : "—")} icon="🚫" accent="var(--danger)" />
          <StatCard label={isAr?"بلاغات مفتوحة":"Open Complaints"} value={stats?.complaints.openComplaints ?? "—"} icon="⚐" accent="var(--danger)" badge={stats?.complaints.openComplaints ?? 0} />
        </div>

        <div className="flex gap-1 rounded-xl p-1 w-full sm:w-fit overflow-x-auto no-scrollbar" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
          {[
            { v:"listings"   as const, label:"Listings",   labelAr:"الإعلانات",  badge: stats?.listings.pendingListings ?? 0 },
            { v:"users"      as const, label:"Users",      labelAr:"المستخدمون", badge: 0 },
            { v:"complaints" as const, label:"Complaints", labelAr:"البلاغات",   badge: stats?.complaints.openComplaints ?? 0 },
          ].map(({ v, label, labelAr, badge }) => (
            <button key={v} onClick={() => setTab(v)}
              className="flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 whitespace-nowrap"
              style={{ background:tab===v?"var(--surface2)":"transparent", color:tab===v?"var(--text)":"var(--text-faint)" }}>
              {isAr ? labelAr : label}
              {badge > 0 && (
                <span className="text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background:"var(--danger)", color:"white" }}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "listings" && <ListingsTab onChange={loadStats} />}
        {tab === "users" && <UsersTab onChange={loadStats} />}
        {tab === "complaints" && <ComplaintsTab onChange={loadStats} />}
      </div>
    </div>
  );
}
