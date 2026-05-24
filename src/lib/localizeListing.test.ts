import { describe, it, expect } from "vitest";
import {
  localizeListingTitle,
  localizeListingDescription,
  localizeListingText,
} from "./localizeListing";
import type { Listing } from "../data/listings";

// Minimal listing factory — only the fields the localizer reads matter.
function make(over: Partial<Listing> = {}): Listing {
  return {
    id: "L1",
    title: "Original title",
    description: "Original description",
    price: "EGP 1",
    priceValue: 1,
    beds: 1,
    baths: 1,
    sqft: 50,
    location: "",
    city: "",
    area: "",
    listingType: "buy",
    propertyType: "apartment",
    images: [],
    lat: 0,
    lng: 0,
    amenities: [],
    paymentMethod: 0,
    completionStatus: null,
    referenceNumber: 0,
    ...over,
  };
}

describe("localizeListing", () => {
  const bilingual = make({
    title: "شقة في التجمع",
    description: "وصف عربي",
    titleAr: "شقة في التجمع",
    titleEn: "Apartment in 5th Settlement",
    descriptionAr: "وصف عربي",
    descriptionEn: "English description",
  });

  it("picks the English side when UI is not Arabic", () => {
    expect(localizeListingTitle(bilingual, false)).toBe("Apartment in 5th Settlement");
    expect(localizeListingDescription(bilingual, false)).toBe("English description");
  });

  it("picks the Arabic side when UI is Arabic", () => {
    expect(localizeListingTitle(bilingual, true)).toBe("شقة في التجمع");
    expect(localizeListingDescription(bilingual, true)).toBe("وصف عربي");
  });

  it("falls back to the original when the translation is null (legacy/failed rows)", () => {
    const legacy = make({
      title: "Original title",
      description: "Original description",
      titleAr: null,
      titleEn: null,
      descriptionAr: null,
      descriptionEn: null,
    });
    expect(localizeListingTitle(legacy, true)).toBe("Original title");
    expect(localizeListingTitle(legacy, false)).toBe("Original title");
    expect(localizeListingDescription(legacy, true)).toBe("Original description");
  });

  it("falls back when the translation is an empty/whitespace string", () => {
    const blank = make({ title: "Original title", titleEn: "   " });
    expect(localizeListingTitle(blank, false)).toBe("Original title");
  });

  it("localizeListingText returns both resolved fields together", () => {
    expect(localizeListingText(bilingual, false)).toEqual({
      title: "Apartment in 5th Settlement",
      description: "English description",
    });
  });
});
