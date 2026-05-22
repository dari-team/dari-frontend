import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  wishlistApi, extractErrorMessage,
  type Wishlist, type WishlistItem, type WishlistCollaborator,
} from "../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

// ── StarRating ────────────────────────────────────────────────────────────────
function StarRating({
  rating, onChange, readonly = false,
}: { rating: number | null; onChange?: (r: number | null) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} disabled={readonly}
          onClick={() => onChange?.(rating === star ? null : star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(null)}
          className="transition-transform disabled:cursor-default"
          style={{ transform: !readonly && hovered && hovered >= star ? "scale(1.2)" : "scale(1)" }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24"
            fill={display >= star ? "#f59e0b" : "none"}
            stroke={display >= star ? "#f59e0b" : "var(--border)"}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      ))}
      {rating != null && !readonly && (
        <button onClick={() => onChange?.(null)} className="ms-1 text-[10px] transition"
          style={{ color: "var(--text-faint)" }}>✕</button>
      )}
    </div>
  );
}

function HeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

// ── Create / Rename wishlist modal ────────────────────────────────────────────
function WishlistModal({
  mode, initial, onConfirm, onClose, saving,
}: {
  mode: "create" | "rename";
  initial?: string;
  onConfirm: (name: string, shared: boolean) => void;
  onClose: () => void;
  saving?: boolean;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [name, setName]     = useState(initial ?? "");
  const [shared, setShared] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
        <h3 className="text-base font-bold mb-4" style={{ color: "var(--text)" }}>
          {mode === "create" ? (isAr ? "قائمة جديدة" : "New Wishlist") : (isAr ? "تغيير الاسم" : "Rename Wishlist")}
        </h3>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onConfirm(name.trim(), shared)}
          placeholder={isAr ? "اسم القائمة…" : "Wishlist name…"}
          className="w-full rounded-xl text-sm outline-none mb-4"
          style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", padding: "10px 14px" }} />
        {mode === "create" && (
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <div className="relative w-10 h-5">
              <input type="checkbox" className="sr-only" checked={shared} onChange={(e) => setShared(e.target.checked)} />
              <div className="w-10 h-5 rounded-full transition-colors" style={{ background: shared ? "var(--accent)" : "var(--border)" }} />
              <div className="absolute top-0.5 start-0.5 w-4 h-4 rounded-full transition-transform bg-white shadow"
                style={{ transform: shared ? "translateX(20px)" : "translateX(0)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{isAr ? "قائمة مشتركة" : "Shared list"}</p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {isAr ? "يمكن للمتعاونين الإضافة" : "Collaborators can add properties"}
              </p>
            </div>
          </label>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={() => name.trim() && onConfirm(name.trim(), shared)}
            disabled={!name.trim() || saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            {saving && <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
            {mode === "create" ? (isAr ? "إنشاء" : "Create") : (isAr ? "حفظ" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Collaborator modal ────────────────────────────────────────────────────────
function CollaboratorModal({
  wishlist, onAdd, onRemove, onClose,
}: {
  wishlist: Wishlist;
  onAdd: (email: string) => Promise<void>;
  onRemove: (collaboratorId: string) => Promise<void>;
  onClose: () => void;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [adding,  setAdding]  = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleAdd() {
    if (!email.trim() || !email.includes("@")) { setError(isAr ? "بريد غير صالح" : "Invalid email"); return; }
    setAdding(true); setError("");
    try {
      await onAdd(email.trim());
      setEmail("");
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to add collaborator."));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try { await onRemove(id); }
    catch (e) { setError(extractErrorMessage(e, "Failed to remove.")); }
    finally { setRemoving(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--text)" }}>
          {isAr ? "إدارة المتعاونين" : "Manage Collaborators"}
        </h3>
        <p className="text-xs mb-4 truncate" style={{ color: "var(--text-muted)" }}>"{wishlist.name}"</p>

        {wishlist.collaborators.length > 0 && (
          <div className="space-y-2 mb-4">
            {wishlist.collaborators.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-hover))" }}>
                  {initials(c.name || c.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{c.name || c.email}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-faint)" }}>{c.email}</p>
                </div>
                <button onClick={() => handleRemove(c.id)}
                  disabled={removing === c.id}
                  className="text-xs transition disabled:opacity-50"
                  style={{ color: "var(--danger)" }}>
                  {removing === c.id ? "…" : (isAr ? "إزالة" : "Remove")}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>
          {isAr ? "إضافة متعاون" : "Add collaborator"}
        </p>
        <div className="flex gap-2 mb-2">
          <input value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={isAr ? "البريد الإلكتروني…" : "Email address…"}
            className="flex-1 rounded-xl text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", padding: "8px 12px" }} />
          <button onClick={handleAdd} disabled={adding}
            className="rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-50 flex items-center gap-1.5"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            {adding && <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
            {isAr ? "إضافة" : "Add"}
          </button>
        </div>
        {error && <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>{error}</p>}

        <button onClick={onClose}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition mt-2"
          style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
          {isAr ? "إغلاق" : "Done"}
        </button>
      </div>
    </div>
  );
}

// ── Wishlist item card ────────────────────────────────────────────────────────
function WishlistItemCard({
  item, onRemove, onRate,
}: { item: WishlistItem; onRemove: () => void; onRate: (r: number | null) => void }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [removing, setRemoving] = useState(false);
  const isRent = item.listingType === 1;

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => onRemove(), 280);
  }

  return (
    <article
      className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        opacity: removing ? 0 : 1,
        transform: removing ? "scale(0.92)" : undefined,
        transition: removing ? "all 280ms ease" : undefined,
      }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-xl)"; el.style.borderColor = "var(--accent)"; el.style.transform = "translateY(-3px)"; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-sm)"; el.style.borderColor = "var(--border)"; el.style.transform = ""; }}
    >
      {/* Image placeholder / hero */}
      <div className="relative h-44 overflow-hidden flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,var(--surface2),var(--bg-secondary,var(--surface)))" }}
        onClick={() => navigate(`/listing/${item.listingId}`)}>
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-faint)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 21V12h6v9" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Remove button */}
        <button onClick={handleRemove}
          className="absolute top-2 end-2 w-8 h-8 rounded-full flex items-center justify-center transition"
          style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <HeartIcon filled className="h-4 w-4" style={{ color: "#f43f5e" } as React.CSSProperties} />
        </button>
        {/* Type pill */}
        <div className="absolute bottom-2 start-2">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            style={{ background: isRent ? "var(--success)" : "var(--accent)", color: "white" }}>
            {isRent ? (isAr ? "إيجار" : "Rent") : (isAr ? "بيع" : "Sale")}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3" onClick={() => navigate(`/listing/${item.listingId}`)}>
        <p className="text-base font-black leading-tight" style={{ color: "var(--text)" }}>
          EGP {item.listingPrice.toLocaleString()}
        </p>
        <p className="text-xs font-medium mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
          {item.listingTitle || "—"}
        </p>
        {item.listingCity && (
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-faint)" }}>
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {item.listingCity}
          </p>
        )}
      </div>

      {/* Star rating */}
      <div className="px-3 pb-3 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
        <StarRating rating={item.rating} onChange={onRate} />
        {item.rating != null && (
          <span className="text-[10px] font-semibold" style={{ color: "#f59e0b" }}>{item.rating}/5</span>
        )}
      </div>
    </article>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function WishlistSidebar({
  wishlists, activeId, onSelect, onCreate, isAr,
}: { wishlists: Wishlist[]; activeId: string; onSelect: (id: string) => void; onCreate: () => void; isAr: boolean }) {
  return (
    <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
          {isAr ? "قوائمي" : "My Lists"}
        </p>
        <button onClick={onCreate}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition"
          style={{ background: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--accent)" }}
          title={isAr ? "قائمة جديدة" : "New list"}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      {wishlists.map((wl) => {
        const active = wl.id === activeId;
        return (
          <button key={wl.id} onClick={() => onSelect(wl.id)}
            className="w-full text-start rounded-xl px-4 py-3 transition-all"
            style={{
              background: active ? "var(--accent-light)" : "var(--surface)",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              color: active ? "var(--accent)" : "var(--text-secondary)",
            }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{wl.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: active ? "var(--accent)" : "var(--text-faint)" }}>
                  {wl.items.length} {isAr ? "عقار" : "listing"}{!isAr && wl.items.length !== 1 ? "s" : ""}
                  {wl.isShared && " · 🔗"}
                </p>
              </div>
              {wl.isShared && wl.collaborators.length > 0 && (
                <div className="flex -space-x-1 flex-shrink-0">
                  {wl.collaborators.slice(0, 2).map((c) => (
                    <div key={c.id} className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white ring-1"
                      style={{ background: "var(--accent-hover)" }}>
                      {initials(c.name || c.email)[0]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FavoritesPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [activeId,  setActiveId]  = useState<string>("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [modal,     setModal]     = useState<"create" | "rename" | "collab" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [actionErr, setActionErr] = useState("");

  // Load wishlists from backend
  const load = useCallback(async () => {
    setLoading(true); setError(""); setForbidden(false);
    try {
      const res = await wishlistApi.getAll();
      setWishlists(res.data);
      if (res.data.length > 0 && !activeId) setActiveId(res.data[0].id);
    } catch (e) {
      // 403 = authenticated but role not allowed (wishlists are buyer-only).
      // Show a friendly notice rather than a raw error + pointless Retry.
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setForbidden(true);
      } else {
        setError(extractErrorMessage(e, "Failed to load wishlists."));
      }
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const active = wishlists.find((w) => w.id === activeId);

  // ── Create wishlist ─────────────────────────────────────────────────────────
  async function createWishlist(name: string, isShared: boolean) {
    setSaving(true); setActionErr("");
    try {
      const res = await wishlistApi.add({ newWishlistName: name, isShared });
      setWishlists((p) => [res.data, ...p]);
      setActiveId(res.data.id);
      setModal(null);
    } catch (e) {
      setActionErr(extractErrorMessage(e, "Failed to create wishlist."));
    } finally {
      setSaving(false);
    }
  }

  // ── Rename wishlist ─────────────────────────────────────────────────────────
  async function renameWishlist(name: string) {
    if (!active) return;
    setSaving(true); setActionErr("");
    try {
      const res = await wishlistApi.update(active.id, { name });
      setWishlists((p) => p.map((w) => w.id === active.id ? res.data : w));
      setModal(null);
    } catch (e) {
      setActionErr(extractErrorMessage(e, "Failed to rename."));
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle IsShared ─────────────────────────────────────────────────────────
  async function toggleShared() {
    if (!active) return;
    setActionErr("");
    try {
      const res = await wishlistApi.update(active.id, { isShared: !active.isShared });
      setWishlists((p) => p.map((w) => w.id === active.id ? res.data : w));
    } catch (e) {
      setActionErr(extractErrorMessage(e, "Failed to update sharing."));
    }
  }

  // ── Delete wishlist ─────────────────────────────────────────────────────────
  async function deleteWishlist() {
    if (!active) return;
    setActionErr("");
    try {
      await wishlistApi.deleteWishlist(active.id);
      const remaining = wishlists.filter((w) => w.id !== active.id);
      setWishlists(remaining);
      setActiveId(remaining[0]?.id ?? "");
      setShowDeleteConfirm(false);
    } catch (e) {
      setActionErr(extractErrorMessage(e, "Failed to delete."));
    }
  }

  // ── Remove item ─────────────────────────────────────────────────────────────
  async function removeItem(itemId: string) {
    setActionErr("");
    try {
      await wishlistApi.removeItem(itemId);
      setWishlists((p) => p.map((w) =>
        w.id === activeId ? { ...w, items: w.items.filter((i) => i.id !== itemId) } : w
      ));
    } catch (e) {
      setActionErr(extractErrorMessage(e, "Failed to remove item."));
    }
  }

  // ── Rate item ───────────────────────────────────────────────────────────────
  async function rateItem(itemId: string, rating: number | null) {
    // Optimistic update
    setWishlists((p) => p.map((w) =>
      w.id === activeId ? { ...w, items: w.items.map((i) => i.id === itemId ? { ...i, rating } : i) } : w
    ));
    try {
      await wishlistApi.rateItem(itemId, rating);
    } catch (e) {
      // Revert on error
      setActionErr(extractErrorMessage(e, "Failed to update rating."));
      load();
    }
  }

  // ── Add collaborator ────────────────────────────────────────────────────────
  async function addCollaborator(email: string) {
    if (!active) return;
    const res = await wishlistApi.addCollaborator(active.id, email);
    setWishlists((p) => p.map((w) =>
      w.id === activeId
        ? { ...w, collaborators: [...w.collaborators, res.data as WishlistCollaborator] }
        : w
    ));
  }

  // ── Remove collaborator ─────────────────────────────────────────────────────
  async function removeCollaborator(collaboratorId: string) {
    await wishlistApi.removeCollaborator(collaboratorId);
    setWishlists((p) => p.map((w) =>
      w.id === activeId
        ? { ...w, collaborators: w.collaborators.filter((c) => c.id !== collaboratorId) }
        : w
    ));
  }

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <span className="w-8 h-8 border-2 border-current/20 border-t-current rounded-full animate-spin" style={{ color: "var(--accent)" }} />
    </div>
  );

  if (forbidden) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-5xl">❤️</p>
        <p className="text-lg font-bold" style={{ color: "var(--text)" }}>
          {isAr ? "المفضلة متاحة لحسابات المشترين" : "Wishlists are for buyer accounts"}
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {isAr
            ? "حساب المُعلِن لا يمكنه حفظ العقارات في المفضلة. تصفّح الإعلانات أو أدر عقاراتك بدلاً من ذلك."
            : "Lister and agent accounts can't save properties to wishlists. Browse listings or manage your own properties instead."}
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Link to="/search"
            className="rounded-full px-5 py-2.5 text-sm font-bold transition"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            {isAr ? "تصفح الإعلانات" : "Browse listings"}
          </Link>
          <Link to="/my-listings"
            className="rounded-full px-5 py-2.5 text-sm font-semibold transition"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)" }}>
            {isAr ? "عقاراتي" : "My listings"}
          </Link>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="text-center space-y-3">
        <p className="text-4xl">⚠️</p>
        <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
        <button onClick={load} className="rounded-full px-5 py-2 text-sm font-bold transition"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}>Retry</button>
      </div>
    </div>
  );

  if (!active) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="text-center space-y-4">
        <p className="text-4xl">❤️</p>
        <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{isAr ? "لا توجد قوائم" : "No wishlists yet"}</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {isAr ? "أنشئ قائمة لحفظ العقارات المفضلة" : "Create a list to save your favourite properties"}
        </p>
        <button onClick={() => setModal("create")}
          className="rounded-full px-6 py-3 text-sm font-bold transition"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
          {isAr ? "إنشاء قائمة" : "Create a list"}
        </button>
      </div>
      {modal === "create" && (
        <WishlistModal mode="create" saving={saving} onConfirm={createWishlist} onClose={() => setModal(null)} />
      )}
    </div>
  );

  return (
    <>
      <style>{`@keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="pt-10 pb-6 flex flex-wrap items-center justify-between gap-4"
            style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "var(--danger-light)", border: "1px solid var(--danger)" }}>
                <HeartIcon filled className="h-4 w-4" style={{ color: "var(--danger)" } as React.CSSProperties} />
              </div>
              <div>
                <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                  {isAr ? "المفضلة" : "Wishlists"}
                </h1>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {wishlists.length} {isAr ? "قائمة" : "list"}{!isAr && wishlists.length !== 1 ? "s" : ""} ·{" "}
                  {wishlists.reduce((s, w) => s + w.items.length, 0)} {isAr ? "عقار محفوظ" : "saved listings"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/search"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)" }}>
                + {isAr ? "إضافة عقارات" : "Add listings"}
              </Link>
              <button onClick={() => setModal("create")}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                + {isAr ? "قائمة جديدة" : "New list"}
              </button>
            </div>
          </div>

          {actionErr && (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>
              ⚠️ {actionErr}
              <button onClick={() => setActionErr("")} className="ms-3 underline text-xs">Dismiss</button>
            </div>
          )}

          {/* Body */}
          <div className="flex gap-8 pt-6">

            {/* Sidebar (desktop) */}
            <WishlistSidebar
              wishlists={wishlists} activeId={activeId}
              onSelect={setActiveId} onCreate={() => setModal("create")} isAr={isAr}
            />

            {/* Mobile selector */}
            <div className="lg:hidden w-full mb-4">
              <select value={activeId} onChange={(e) => setActiveId(e.target.value)}
                className="w-full rounded-xl text-sm outline-none px-4 py-3"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}>
                {wishlists.map((wl) => (
                  <option key={wl.id} value={wl.id}>{wl.name} ({wl.items.length})</option>
                ))}
              </select>
            </div>

            {/* Main area */}
            <div className="flex-1 min-w-0">

              {/* Wishlist header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{active.name}</h2>
                    {active.isShared && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
                        🔗 {isAr ? "مشتركة" : "Shared"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {active.items.length} {isAr ? "عقار" : "listing"}{!isAr && active.items.length !== 1 ? "s" : ""}
                    {active.collaborators.length > 0 && ` · ${active.collaborators.length} ${isAr ? "متعاون" : "collaborator"}${!isAr && active.collaborators.length !== 1 ? "s" : ""}`}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setModal("rename")}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium transition"
                    style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                    ✏️ {isAr ? "تغيير الاسم" : "Rename"}
                  </button>
                  <button onClick={toggleShared}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      border: `1px solid ${active.isShared ? "var(--accent)" : "var(--border)"}`,
                      background: active.isShared ? "var(--accent-light)" : "var(--surface2)",
                      color: active.isShared ? "var(--accent)" : "var(--text-secondary)",
                    }}>
                    🔗 {active.isShared ? (isAr ? "إلغاء المشاركة" : "Unshare") : (isAr ? "مشاركة" : "Share")}
                  </button>
                  {active.isShared && (
                    <button onClick={() => setModal("collab")}
                      className="rounded-xl px-3 py-1.5 text-xs font-medium transition"
                      style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                      👥 {isAr ? "المتعاونون" : "Collaborators"} ({active.collaborators.length})
                    </button>
                  )}
                  {wishlists.length > 0 && (
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-xl px-3 py-1.5 text-xs font-medium transition"
                      style={{ border: "1px solid var(--danger)", background: "var(--danger-light)", color: "var(--danger)" }}>
                      🗑 {isAr ? "حذف" : "Delete"}
                    </button>
                  )}
                </div>
              </div>

              {/* Collaborators strip */}
              {active.isShared && active.collaborators.length > 0 && (
                <div className="flex items-center gap-2 mb-5 rounded-xl px-4 py-3"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {isAr ? "متعاونون:" : "Shared with:"}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {active.collaborators.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <div className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                          style={{ background: "var(--accent)" }}>
                          {initials(c.name || c.email)[0]}
                        </div>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{c.name || c.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {active.items.length === 0 ? (
                <div className="text-center py-24 rounded-2xl"
                  style={{ border: "1px dashed var(--border)", background: "var(--surface)" }}>
                  <p className="text-4xl mb-3">🏡</p>
                  <p className="text-base font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
                    {isAr ? "القائمة فارغة" : "This list is empty"}
                  </p>
                  <p className="text-sm mb-5" style={{ color: "var(--text-faint)" }}>
                    {isAr ? "تصفح الإعلانات وأضف عقارات" : "Browse listings and save properties to this list"}
                  </p>
                  <Link to="/search"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition"
                    style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                    {isAr ? "تصفح الإعلانات" : "Browse Listings"}
                  </Link>
                </div>
              ) : (
                <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {active.items.map((item, idx) => (
                    <div key={item.id} style={{ animation: `cardIn 300ms ease-out ${idx * 50}ms both` }}>
                      <WishlistItemCard
                        item={item}
                        onRemove={() => removeItem(item.id)}
                        onRate={(r) => rateItem(item.id, r)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Rating summary */}
              {active.items.some((x) => x.rating != null) && (
                <div className="mt-8 rounded-2xl p-5"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-faint)" }}>
                    {isAr ? "ملخص التقييمات" : "Rating Summary"}
                  </p>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = active.items.filter((x) => x.rating === star).length;
                      const pct   = active.items.length > 0 ? (count / active.items.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1 w-16 flex-shrink-0">
                            <span style={{ color: "var(--text-muted)" }}>{star}</span>
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#f59e0b">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </div>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#f59e0b" }} />
                          </div>
                          <span className="w-6 text-end" style={{ color: "var(--text-faint)" }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "create" && (
        <WishlistModal mode="create" saving={saving} onConfirm={createWishlist} onClose={() => setModal(null)} />
      )}
      {modal === "rename" && (
        <WishlistModal mode="rename" initial={active.name} saving={saving}
          onConfirm={(name) => renameWishlist(name)} onClose={() => setModal(null)} />
      )}
      {modal === "collab" && (
        <CollaboratorModal wishlist={active}
          onAdd={addCollaborator} onRemove={removeCollaborator} onClose={() => setModal(null)} />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
            <h3 className="text-base font-bold mb-2" style={{ color: "var(--text)" }}>
              {isAr ? "حذف القائمة؟" : "Delete this list?"}
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              {isAr
                ? `سيتم حذف "${active.name}" مع جميع العقارات المحفوظة.`
                : `"${active.name}" and all ${active.items.length} saved listings will be permanently removed.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
                style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={deleteWishlist}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition"
                style={{ background: "var(--danger)", color: "white" }}>
                {isAr ? "حذف" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
