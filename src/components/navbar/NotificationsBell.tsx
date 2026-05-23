import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { notificationApi, type ApiNotification } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const POLL_INTERVAL_MS = 45_000;

// Backend NotificationType is an int; map it to a display "kind".
// 0 NewMessage · 1 InquiryResponse · 2 ListingApproved · 3 ListingRejected · 4 NewMatch
// NewMatch (4) is reused for both "New Inquiry" and admin broadcasts, so we
// disambiguate by the stored title.
type Kind = "message" | "inquiry" | "approved" | "rejected" | "system";

function resolveKind(n: ApiNotification): Kind {
  switch (n.type) {
    case 0:  return "message";
    case 1:  return "inquiry";
    case 2:  return "approved";
    case 3:  return "rejected";
    case 4:  return /inquir/i.test(n.title) ? "inquiry" : "system";
    default: return "system";
  }
}

const ARABIC_TITLES: Record<Kind, string> = {
  message:  "رسالة جديدة",
  inquiry:  "استفسار جديد",
  approved: "تم قبول الإعلان",
  rejected: "تحديث على إعلانك",
  system:   "إشعار من الإدارة",
};

function linkForKind(kind: Kind): string | undefined {
  switch (kind) {
    case "message":
    case "inquiry":  return "/inquiries";
    case "approved":
    case "rejected": return "/my-listings";
    default:         return undefined;
  }
}

function timeAgo(iso: string, isAr: boolean): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff/60_000);
  const hours = Math.floor(mins/60);
  const days  = Math.floor(hours/24);
  if (isAr) {
    if (days  > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (mins  > 0) return `منذ ${mins} دقيقة`;
    return "الآن";
  }
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "Just now";
}

function typeStyle(kind: Kind): { icon:string; color:string; bg:string } {
  switch (kind) {
    case "inquiry":  return { icon:"💬", color:"var(--accent)",   bg:"var(--accent-light)" };
    case "message":  return { icon:"↩️", color:"var(--accent)",   bg:"var(--accent-light)" };
    case "approved": return { icon:"✅", color:"var(--success)",  bg:"var(--success-light)" };
    case "rejected": return { icon:"❌", color:"var(--danger)",   bg:"var(--danger-light)" };
    default:         return { icon:"🔔", color:"var(--text-muted)",bg:"var(--surface2)" };
  }
}

export default function NotificationsBell() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === "ar";
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.seen).length;

  const load = useCallback(async () => {
    try {
      const { data } = await notificationApi.list();
      if (Array.isArray(data)) setNotifications(data);
    } catch {
      // Backend may be unreachable (e.g. Azure F1 quota); keep last known list.
    }
  }, []);

  // Fetch on mount and poll while signed in.
  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    load();
    const t = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [user, load]);

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function markSeen(id: string) {
    setNotifications((prev) => prev.map((n) => n.id===id ? {...n,seen:true} : n));
    notificationApi.markSeen(id).catch(() => {});
  }
  function markAllSeen() {
    const unread = notifications.filter((n) => !n.seen);
    setNotifications((prev) => prev.map((n) => ({...n,seen:true})));
    unread.forEach((n) => notificationApi.markSeen(n.id).catch(() => {}));
  }
  function handleClick(n: ApiNotification) {
    if (!n.seen) markSeen(n.id);
    setOpen(false);
    const link = linkForKind(resolveKind(n));
    if (link) navigate(link);
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell */}
      <button onClick={() => setOpen((o) => { const next = !o; if (next) load(); return next; })}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{ background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text-muted)" }}
        aria-label={isAr ? "الإشعارات" : "Notifications"}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 flex items-center justify-center rounded-full text-[10px] font-black"
            style={{ width: unreadCount>9?18:16, height:16, background:"var(--danger)", color:"white", border:"2px solid var(--bg)" }}>
            {unreadCount>9?"9+":unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute end-0 top-full mt-2 rounded-2xl overflow-hidden z-50 animate-fadeIn"
          style={{ width:340, background:"var(--surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-xl)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:"1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold" style={{ color:"var(--text)" }}>{isAr ? "الإشعارات" : "Notifications"}</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:"var(--danger)", color:"white" }}>{unreadCount} {isAr ? "جديد" : "new"}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllSeen} className="text-xs font-medium" style={{ color:"var(--accent)" }}>
                {isAr ? "تحديد الكل كمقروء" : "Mark all read"}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm" style={{ color:"var(--text-muted)" }}>{isAr ? "لا توجد إشعارات" : "No notifications yet"}</p>
              </div>
            ) : notifications.map((n) => {
              const kind = resolveKind(n);
              const s = typeStyle(kind);
              const title = isAr ? ARABIC_TITLES[kind] : n.title;
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-start transition-all"
                  style={{ background: !n.seen?"var(--accent-light)":"transparent", borderBottom:"1px solid var(--border-light)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = !n.seen?"var(--accent-light)":"transparent")}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background:s.bg, border:`1px solid ${s.color}30` }}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold" style={{ color:"var(--text)" }}>{title}</p>
                      <span className="text-[10px] flex-shrink-0" style={{ color:"var(--text-faint)" }}>{timeAgo(n.createdAt, isAr)}</span>
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color:"var(--text-muted)" }}>{n.body}</p>
                  </div>
                  {!n.seen && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background:"var(--accent)" }} />}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 text-center" style={{ borderTop:"1px solid var(--border)" }}>
              <button onClick={() => setOpen(false)} className="text-xs font-medium transition" style={{ color:"var(--text-faint)" }}>
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}