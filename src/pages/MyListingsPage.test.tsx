import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyListingsPage from "./MyListingsPage";
import type { ListingResponse } from "../lib/api";

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("react-i18next", () => ({
  // t passes the key straight through, so we assert on i18n keys.
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    status: "active", plan_name: "Agent Plan", plan_name_ar: "", end_date: null,
    max_listings: 30, current_listings: 1, days_remaining: 0, can_add_listing: true, loading: false,
  }),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    listingApi: { ...actual.listingApi, getMine: vi.fn(), delete: vi.fn() },
  };
});

const { listingApi } = await import("../lib/api");

function buildListing(over: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: "L1", listerId: "U1", title: "Test Apartment", description: "",
    titleAr: null, titleEn: null, descriptionAr: null, descriptionEn: null,
    price: 2_500_000, bedrooms: 3, bathrooms: 2, areaSize: 120,
    propertyType: 0, finishing: null, listingType: 0, listingKind: 0,
    paymentMethod: 0, completionStatus: null, referenceNumber: 1,
    status: 1, isApproved: true, isFeatured: false, viewCount: 5,
    coverImageUrl: null, lifestyleScore: null, lifestyleScoreBreakdown: null,
    lifestyleScoreCalculatedAt: null, aiGeneratedDescription: null,
    aiStandardizedFinishing: null, aiGeneratedTags: null, aiQualityScore: null,
    amenities: [], createdAt: "", updatedAt: "",
    address: { street: "", streetAr: null, streetLatin: null, city: "Cairo", region: "New Cairo", country: "Egypt", latitude: 30, longitude: 31 },
    images: [], lister: null,
    ...over,
  };
}

describe("MyListingsPage — lister delete", () => {
  beforeEach(() => {
    vi.mocked(listingApi.getMine).mockReset();
    vi.mocked(listingApi.delete).mockReset();
  });

  it("deletes a listing after confirmation and removes it from the list", async () => {
    const user = userEvent.setup();
    vi.mocked(listingApi.getMine).mockResolvedValue({ data: [buildListing()] } as never);
    vi.mocked(listingApi.delete).mockResolvedValue({ data: "ok" } as never);

    render(<MyListingsPage />);

    // Listing loads.
    expect(await screen.findByText("Test Apartment")).toBeInTheDocument();

    // First click reveals the confirm step (no API call yet).
    await user.click(screen.getByText("myListings.delete"));
    expect(listingApi.delete).not.toHaveBeenCalled();
    expect(screen.getByText("myListings.deleteConfirm")).toBeInTheDocument();

    // Confirming calls DELETE with the listing id and drops the row.
    await user.click(screen.getByText("myListings.deleteYes"));
    expect(listingApi.delete).toHaveBeenCalledWith("L1");
    await waitFor(() => expect(screen.queryByText("Test Apartment")).not.toBeInTheDocument());
  });

  it("cancel keeps the listing and never calls the API", async () => {
    const user = userEvent.setup();
    vi.mocked(listingApi.getMine).mockResolvedValue({ data: [buildListing()] } as never);

    render(<MyListingsPage />);
    await screen.findByText("Test Apartment");

    await user.click(screen.getByText("myListings.delete"));
    await user.click(screen.getByText("myListings.cancel"));

    expect(listingApi.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Test Apartment")).toBeInTheDocument();
  });
});
