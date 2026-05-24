// Resolves a listing's title/description to the viewer's language.
//
// The backend fills bilingual fields (titleAr/titleEn/descriptionAr/
// descriptionEn) once at create time via Gemini. The lister writes in one
// language; both are stored. Here we pick the side matching the current UI
// language and fall back to the original `title`/`description` when the
// translation is missing — e.g. legacy listings created before this feature,
// or rows where the Gemini call failed. Mirrors the streetAr/streetLatin pick.

import type { Listing } from "../data/listings";

type LocalizableListing = Pick<
  Listing,
  "title" | "description" | "titleAr" | "titleEn" | "descriptionAr" | "descriptionEn"
>;

function pick(translated: string | null | undefined, original: string): string {
  const t = translated?.trim();
  return t ? t : original;
}

export function localizeListingTitle(listing: LocalizableListing, isAr: boolean): string {
  return pick(isAr ? listing.titleAr : listing.titleEn, listing.title);
}

export function localizeListingDescription(listing: LocalizableListing, isAr: boolean): string {
  return pick(isAr ? listing.descriptionAr : listing.descriptionEn, listing.description);
}

export function localizeListingText(listing: LocalizableListing, isAr: boolean) {
  return {
    title: localizeListingTitle(listing, isAr),
    description: localizeListingDescription(listing, isAr),
  };
}
