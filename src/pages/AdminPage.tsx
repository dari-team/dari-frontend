import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listingApi, extractErrorMessage, type ListingResponse } from "../lib/api";

// Backend ListingStatus: Pending=0, Active=1, Rejected=2
type ListingStatus = "pending" | "active" | "rejected";

function statusOf(l: ListingResponse): ListingStatus {
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

function RejectModal({ listing, onConfirm, onCancel }:{
  listing: ListingResponse;
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

function ListingsTab() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ListingStatus|"all">("pending");
  const [rejectTarget, setRejectTarget] = useState<ListingResponse|null>(null);
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [actingId, setActingId] = useState<string|null>(null);

  // Pull the union of pending + all approved listings so every tab has data.
  // Admin's pending queue is the common case — load it first, then enrich.
  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [pendingRes, allRes] = await Promise.all([
        listingApi.getPending(),
        listingApi.getAll(),
      ]);
      // Merge on id, pending takes precedence (has freshest status)
      const map = new Map<string, ListingResponse>();
      for (const l of allRes.data) map.set(l.id, l);
      for (const l of pendingRes.data) map.set(l.id, l);
      setListings(Array.from(map.values()));
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to load listings"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function approve(id: string) {
    setActingId(id);
    try {
      await listingApi.approve(id);
      await loadAll();
    } catch (e) {
      alert(extractErrorMessage(e, "Failed to approve listing"));
    } finally {
      setActingId(null);
    }
  }
  async function reject(id: string, reason: string) {
    setActingId(id);
    try {
      await listingApi.reject(id, reason);
      await loadAll();
      setRejectTarget(null);
    } catch (e) {
      alert(extractErrorMessage(e, "Failed to reject listing"));
    } finally {
      setActingId(null);
    }
  }

  const withStatus = listings.map((l) => ({ l, s: statusOf(l) }));
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

  if (loading) {
    return (
      <div className="text-center py-16 rounded-2xl" style={{ border:"1px dashed var(--border)" }}>
        <p className="text-sm" style={{ color:"var(--text-muted)" }}>{isAr?"جارٍ التحميل…":"Loading…"}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-16 rounded-2xl" style={{ border:"1px solid var(--danger)", background:"var(--danger-light)", color:"var(--danger)" }}>
        <p className="text-sm">{error}</p>
        <button onClick={loadAll} className="mt-3 text-xs underline">{isAr?"إعادة المحاولة":"Retry"}</button>
      </div>
    );
  }

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
                      </div>
                      <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>
                        {l.address?.city ?? "—"} · {propertyTypeLabel(l.propertyType)} · {l.areaSize}m²{l.bedrooms>0?` · ${l.bedrooms}bd`:""}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color:"var(--text-faint)" }}>
                        #{l.id.slice(0,8)} · {isAr?"مشاهدات:":"Views:"} {l.viewCount}
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
                          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                          style={{ background:"var(--success)", color:"white" }}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                          </svg>
                          {isAr?"موافقة":"Approve"}
                        </button>
                        <button onClick={() => setRejectTarget(l)} disabled={actingId===l.id}
                          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                          style={{ background:"var(--danger)", color:"white" }}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          {isAr?"رفض":"Reject"}
                        </button>
                      </>
                    )}
                    {s === "active" && (
                      <button onClick={() => setRejectTarget(l)} disabled={actingId===l.id}
                        className="rounded-xl px-4 py-2 text-xs font-medium transition disabled:opacity-50"
                        style={{ border:"1px solid var(--danger)", color:"var(--danger)", background:"var(--danger-light)" }}>
                        {isAr?"إلغاء النشر":"Unpublish"}
                      </button>
                    )}
                    {s === "rejected" && (
                      <button onClick={() => approve(l.id)} disabled={actingId===l.id}
                        className="rounded-xl px-4 py-2 text-xs font-medium transition disabled:opacity-50"
                        style={{ border:"1px solid var(--success)", color:"var(--success)", background:"var(--success-light)" }}>
                        {isAr?"إعادة النشر":"Re-approve"}
                      </button>
                    )}
                    <Link to={`/listing/${l.id}?source=direct`}
                      className="rounded-xl px-4 py-2 text-xs font-medium transition"
                      style={{ border:"1px solid var(--border)", color:"var(--text-muted)", background:"var(--surface2)" }}>
                      {isAr?"عرض":"View"}
                    </Link>
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

// Users management is deferred — backend admin user endpoints aren't built yet.
// The tab stays so nav is consistent but it shows a "coming soon" notice.
function UsersTabStub() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <div className="text-center py-16 rounded-2xl" style={{ border:"1px dashed var(--border)", background:"var(--surface)" }}>
      <p className="text-3xl mb-2">👥</p>
      <p className="text-sm font-semibold" style={{ color:"var(--text)" }}>
        {isAr ? "إدارة المستخدمين — قريبًا" : "User management — coming soon"}
      </p>
      <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>
        {isAr ? "واجهات الإدارة الخاصة بالمستخدمين قيد التطوير." : "Admin user endpoints are still being built on the backend."}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [tab, setTab] = useState<"listings"|"users">("listings");
  const [kpi, setKpi] = useState<{ pending: number; total: number }>({ pending: 0, total: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [p, all] = await Promise.all([listingApi.getPending(), listingApi.getAll()]);
        setKpi({ pending: p.data.length, total: all.data.length + p.data.length });
      } catch { /* KPI is best-effort */ }
    })();
  }, [tab]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4" style={{ background:"var(--bg)" }}>
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={isAr?"قيد المراجعة":"Pending Review"}   value={kpi.pending}   icon="⏳" accent="#f59e0b"        badge={kpi.pending} />
          <StatCard label={isAr?"إجمالي الإعلانات":"Total Listings"} value={kpi.total}    icon="🏠" accent="var(--accent)"  />
          <StatCard label={isAr?"المستخدمون":"Users"}               value="—"            icon="👥" accent="var(--success)" />
          <StatCard label={isAr?"حسابات معلقة":"Suspended"}         value="—"            icon="🚫" accent="var(--danger)"  />
        </div>

        <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
          {[
            { v:"listings" as const, label:"Listings", labelAr:"الإعلانات", badge:kpi.pending },
            { v:"users"    as const, label:"Users",    labelAr:"المستخدمون", badge:0 },
          ].map(({ v, label, labelAr, badge }) => (
            <button key={v} onClick={() => setTab(v)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
              style={{ background:tab===v?"var(--surface2)":"transparent", color:tab===v?"var(--text)":"var(--text-faint)" }}>
              {isAr ? labelAr : label}
              {badge > 0 && (
                <span className="text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background:"var(--danger)", color:"white" }}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "listings" ? <ListingsTab /> : <UsersTabStub />}
      </div>
    </div>
  );
}
