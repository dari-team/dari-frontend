// useWishlistSave — global hook for the heart / save button on listing cards.
//
// Behaviour:
//  • On mount (if authenticated), loads all wishlists once and builds an in-memory
//    map of  listingId → { itemId, wishlistId }  so isSaved() is instant.
//  • toggleSave(listingId):
//      – Not saved → adds to the "Favorites" wishlist.
//          If no "Favorites" exists yet, creates it (and optionally any wishlists) first.
//      – Already saved → removes the item from whichever wishlist contains it.
//  • Not authenticated → returns { error: "login" } so the caller can redirect.

import { useState, useEffect, useCallback, useRef } from "react";
import { wishlistApi, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const DEFAULT_LIST_NAME = "Favorites";

interface SavedEntry { itemId: string; wishlistId: string; }

export function useWishlistSave() {
  const { isAuthenticated } = useAuth();

  // listingId → { itemId, wishlistId }
  const [savedMap, setSavedMap]             = useState<Map<string, SavedEntry>>(new Map());
  const [defaultWishlistId, setDefaultWishlistId] = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const loaded                              = useRef(false);

  // ── Load once on auth ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setSavedMap(new Map());
      setDefaultWishlistId(null);
      loaded.current = false;
      return;
    }
    if (loaded.current) return;
    loaded.current = true;

    wishlistApi.getAll().then(({ data }) => {
      const map = new Map<string, SavedEntry>();
      let favId: string | null = null;

      for (const wl of data) {
        if (!favId && wl.name === DEFAULT_LIST_NAME) favId = wl.id;
        for (const item of wl.items) {
          map.set(item.listingId, { itemId: item.id, wishlistId: wl.id });
        }
      }
      // Fallback: first wishlist if no "Favorites" found
      if (!favId && data.length > 0) favId = data[0].id;

      setSavedMap(map);
      setDefaultWishlistId(favId);
    }).catch(() => { /* silent — non-critical */ });
  }, [isAuthenticated]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isSaved = useCallback(
    (listingId: string) => savedMap.has(listingId),
    [savedMap],
  );

  const toggleSave = useCallback(
    async (listingId: string): Promise<{ error?: string }> => {
      if (!isAuthenticated) return { error: "login" };
      if (saving) return {};

      const existing = savedMap.get(listingId);

      // ── UNSAVE ─────────────────────────────────────────────────────────────
      if (existing) {
        // Optimistic removal
        setSavedMap((m) => { const next = new Map(m); next.delete(listingId); return next; });
        try {
          await wishlistApi.removeItem(existing.itemId);
          return {};
        } catch (e) {
          // Revert
          setSavedMap((m) => new Map(m).set(listingId, existing));
          return { error: extractErrorMessage(e) };
        }
      }

      // ── SAVE ───────────────────────────────────────────────────────────────
      setSaving(true);
      try {
        let res;
        let wishlistId = defaultWishlistId;

        if (wishlistId) {
          // Add to existing default wishlist
          res = await wishlistApi.add({ listingId, wishlistId });
        } else {
          // Create "Favorites" and add listing in one request
          res = await wishlistApi.add({ listingId, newWishlistName: DEFAULT_LIST_NAME });
          wishlistId = res.data.id;
          setDefaultWishlistId(wishlistId);
        }

        // Find the new item in the response
        const newItem = res.data.items.find((i) => i.listingId === listingId);
        if (newItem && wishlistId) {
          setSavedMap((m) => new Map(m).set(listingId, { itemId: newItem.id, wishlistId }));
        }
        return {};
      } catch (e) {
        return { error: extractErrorMessage(e) };
      } finally {
        setSaving(false);
      }
    },
    [isAuthenticated, saving, savedMap, defaultWishlistId],
  );

  // Called by WishlistPickerModal after a successful save so card heart turns red
  const markSaved = useCallback(
    (listingId: string, itemId: string, wishlistId: string) => {
      setSavedMap((m) => new Map(m).set(listingId, { itemId, wishlistId }));
    },
    [],
  );

  return { isSaved, toggleSave, saving, markSaved };
}
