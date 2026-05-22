// WishlistPickerModal — compact popover that lets the user pick which wishlist
// to save a listing to, or create a new one on the fly.

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { wishlistApi, type Wishlist } from "../../lib/api";

interface Props {
  listingId: string;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSaved: (itemId: string, wishlistId: string) => void;
}

export default function WishlistPickerModal({ listingId, anchorRef, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [wishlists, setWishlists]     = useState<Wishlist[]>([]);
  const [loading, setLoading]         = useState(true);
  const [adding, setAdding]           = useState<string | null>(null);
  const [newName, setNewName]         = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [error, setError]             = useState("");
  const containerRef                  = useRef<HTMLDivElement>(null);

  // Position popover below the anchor button, clamped to viewport
  const [pos, setPos] = useState<React.CSSProperties>({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverWidth = 260;
      // Prefer aligning to the left edge of the button; shift left if it would overflow right
      let left = rect.left + window.scrollX;
      if (left + popoverWidth > window.innerWidth - 8) {
        left = window.innerWidth - popoverWidth - 8;
      }
      if (left < 8) left = 8;
      setPos({ top: rect.bottom + window.scrollY + 8, left });
    }
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  // Fetch wishlists
  useEffect(() => {
    wishlistApi.getAll()
      .then(({ data }) => setWishlists(data))
      .catch(() => setWishlists([]))
      .finally(() => setLoading(false));
  }, []);

  async function addToList(wishlistId: string, wishlistName: string) {
    setAdding(wishlistId);
    setError("");
    try {
      const { data } = await wishlistApi.add({ listingId, wishlistId });
      const newItem = data.items.find((i) => i.listingId === listingId);
      if (newItem) onSaved(newItem.id, wishlistId);
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data ?? e?.message ?? "Error";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setAdding(null);
    }
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding("new");
    setError("");
    try {
      const { data } = await wishlistApi.add({ listingId, newWishlistName: name });
      const newItem = data.items.find((i) => i.listingId === listingId);
      if (newItem) onSaved(newItem.id, data.id);
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data ?? e?.message ?? "Error";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setAdding(null);
    }
  }

  return createPortal(
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: (pos as any).top,
        left: (pos as any).left,
        zIndex: 1000,
        width: 260,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
          {isAr ? "حفظ في قائمة" : "Save to list"}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-lg leading-none">×</button>
      </div>

      {/* Body */}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <>
            {wishlists.length === 0 && !showCreate && (
              <p className="text-center py-4 text-xs" style={{ color: "var(--text-faint)" }}>
                {isAr ? "لا توجد قوائم بعد" : "No lists yet"}
              </p>
            )}
            {wishlists.map((wl) => {
              const alreadyIn = wl.items.some((i) => i.listingId === listingId);
              return (
                <button
                  key={wl.id}
                  disabled={alreadyIn || adding === wl.id}
                  onClick={() => addToList(wl.id, wl.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    opacity: alreadyIn ? 0.5 : 1,
                    cursor: alreadyIn ? "not-allowed" : "pointer",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => { if (!alreadyIn) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* List icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      style={{ color: "var(--accent)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{wl.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {wl.items.length} {isAr ? "عقار" : "properties"}
                      {alreadyIn ? (isAr ? " · محفوظ" : " · saved") : ""}
                    </p>
                  </div>
                  {adding === wl.id && (
                    <div className="h-4 w-4 rounded-full border-2 animate-spin flex-shrink-0"
                      style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                  )}
                  {alreadyIn && (
                    <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"
                      style={{ color: "#f43f5e" }}>
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="px-4 py-2 text-xs text-center" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
          {error}
        </p>
      )}

      {/* Create new list */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors"
            style={{ color: "var(--accent)", background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <span className="text-lg leading-none">+</span>
            {isAr ? "إنشاء قائمة جديدة" : "Create new list"}
          </button>
        ) : (
          <div className="px-4 py-3 flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createAndAdd(); if (e.key === "Escape") setShowCreate(false); }}
              placeholder={isAr ? "اسم القائمة" : "List name"}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
            <button
              disabled={!newName.trim() || adding === "new"}
              onClick={createAndAdd}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
                opacity: !newName.trim() || adding === "new" ? 0.5 : 1,
              }}
            >
              {adding === "new" ? "…" : (isAr ? "حفظ" : "Save")}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
