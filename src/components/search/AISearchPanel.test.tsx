import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AISearchPanel from "./AISearchPanel";
import type { AiSearchResponse, AiSearchMeta, AiSearchQuotaStatus, ListingResponse } from "../../lib/api";

// ── Mocks ────────────────────────────────────────────────────────────────────
let mockLanguage = "en";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: mockLanguage },
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/search", search: "" }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api")>("../../lib/api");
  return {
    ...actual,
    aiSearchApi: {
      search: vi.fn(),
      quota: vi.fn(),
      extract: vi.fn(),
    },
    extractErrorMessage: (_e: unknown, fallback?: string) => fallback ?? "error",
  };
});

const { aiSearchApi } = await import("../../lib/api");

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildListing(over: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: "L1",
    listerId: "U1",
    title: "Test listing",
    description: "",
    price: 2_500_000,
    bedrooms: 3,
    bathrooms: 2,
    areaSize: 120,
    propertyType: 0,
    finishing: null,
    listingType: 0,
    listingKind: 0,
    status: 1,
    isApproved: true,
    isFeatured: false,
    viewCount: 0,
    coverImageUrl: null,
    lifestyleScore: null,
    lifestyleScoreBreakdown: null,
    lifestyleScoreCalculatedAt: null,
    aiGeneratedDescription: null,
    aiStandardizedFinishing: null,
    aiGeneratedTags: null,
    aiQualityScore: null,
    createdAt: "",
    updatedAt: "",
    address: { street: "", city: "Cairo", region: "", country: "Egypt", latitude: 0, longitude: 0 },
    images: [],
    ...over,
  };
}

function buildMeta(over: Partial<AiSearchMeta> = {}): AiSearchMeta {
  return {
    streetMatch: "exact",
    fallbackApplied: false,
    resultCount: 1,
    tierBreakdown: { exact: 1, partial: 0, none: 0 },
    parsedFilters: {
      propertyType: "apartment",
      listingType: "sale",
      location: "Maadi",
      locationText: null,
      nearMetro: null,
      priceMin: null,
      priceMax: 2_000_000,
      bedrooms: 3,
      bathrooms: null,
      suggestedBedrooms: null,
      areaMin: null,
      finishingLevel: null,
      paymentMethod: null,
      maxDownPayment: null,
    },
    corrections: [],
    language: "en",
    latencyAiMs: 200,
    latencyDbMs: 50,
    retryUsed: false,
    notice: null,
    ...over,
  };
}

function buildResponse(over: Partial<AiSearchResponse> = {}): AiSearchResponse {
  return {
    results: [buildListing()],
    meta: buildMeta(),
    ...over,
  };
}

const defaultQuota: AiSearchQuotaStatus = {
  limit: 3, used: 0, remaining: 3, allowed: true,
  resetAtUtc: new Date(Date.now() + 7 * 86400_000).toISOString(),
};

const QUERY = "3 bedroom apartment in Maadi under 2 million";

beforeEach(() => {
  mockLanguage = "en";
  vi.clearAllMocks();
  (aiSearchApi.quota as any).mockResolvedValue({ data: defaultQuota });
  (aiSearchApi.search as any).mockResolvedValue({ data: buildResponse() });
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("AISearchPanel", () => {
  it("renders LTR English UI by default", async () => {
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/AI Property Search/i)).toBeInTheDocument();
    const ta = screen.getByPlaceholderText(/3-bedroom apartment in Maadi/i) as HTMLTextAreaElement;
    expect(ta.dir).toBe("ltr");
  });

  it("renders RTL Arabic UI when language is ar", async () => {
    mockLanguage = "ar";
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/البحث الذكي/)).toBeInTheDocument();
    const ta = screen.getByPlaceholderText(/شقة/) as HTMLTextAreaElement;
    expect(ta.dir).toBe("rtl");
  });

  it("disables submit while loading", async () => {
    let resolve!: (v: any) => void;
    (aiSearchApi.search as any).mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment in Maadi/i);
    await userEvent.type(ta, QUERY);
    await userEvent.keyboard("{Enter}");
    const btn = screen.getByLabelText("Search") as HTMLButtonElement;
    await waitFor(() => expect(btn).toBeDisabled());
    resolve({ data: buildResponse() });
  });

  it("renders fallback notice when meta.notice is set", async () => {
    (aiSearchApi.search as any).mockResolvedValue({
      data: buildResponse({ meta: buildMeta({ notice: "Fell back to city-only search.", fallbackApplied: true }) }),
    });
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment/i);
    await userEvent.type(ta, QUERY);
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText(/Fell back to city-only search/i)).toBeInTheDocument();
  });

  it("does NOT render notice when fallback not applied", async () => {
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment/i);
    await userEvent.type(ta, QUERY);
    await userEvent.keyboard("{Enter}");
    await screen.findByText(/Street match/i);
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();
  });

  it("renders parsed filter chips", async () => {
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment/i);
    await userEvent.type(ta, QUERY);
    await userEvent.keyboard("{Enter}");
    // Wait for result to render, then verify chips appear (matches may exist in
    // examples/placeholder too — getAllByText is fine).
    await screen.findByText(/Street match/i);
    expect(screen.getAllByText(/apartment/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Maadi")).toBeInTheDocument();
    expect(screen.getByText(/3\+ beds/)).toBeInTheDocument();
  });

  it("renders plausibility corrections in details", async () => {
    (aiSearchApi.search as any).mockResolvedValue({
      data: buildResponse({
        meta: buildMeta({
          corrections: [
            { field: "priceMax", reasonCode: "ABOVE_MARKET", originalValue: 100, newValue: 2_000_000 },
          ],
        }),
      }),
    });
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment/i);
    await userEvent.type(ta, QUERY);
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText(/1 auto-corrections/i)).toBeInTheDocument();
  });

  it("calls onResults with mapped fields when Apply clicked", async () => {
    const onResults = vi.fn();
    render(<AISearchPanel onResults={onResults} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment/i);
    await userEvent.type(ta, QUERY);
    await userEvent.keyboard("{Enter}");
    const apply = await screen.findByRole("button", { name: /Show 1 on map/i });
    await userEvent.click(apply);
    expect(onResults).toHaveBeenCalledTimes(1);
    const arg = onResults.mock.calls[0][0];
    expect(arg.listingType).toBe("buy");
    expect(arg.priceMax).toBe(2_000_000);
    expect(arg.beds).toBe(3);
    expect(arg.city).toBe("Maadi");
    expect(arg.aiListings).toHaveLength(1);
    expect(arg.aiMeta).toBeTruthy();
  });

  it("shows error message on API failure", async () => {
    (aiSearchApi.search as any).mockRejectedValue({ response: { status: 500, data: "boom" } });
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment/i);
    await userEvent.type(ta, QUERY);
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it("renders Arabic fallback notice", async () => {
    mockLanguage = "ar";
    (aiSearchApi.search as any).mockResolvedValue({
      data: buildResponse({ meta: buildMeta({ notice: "تم التوسعة إلى المدينة", fallbackApplied: true }) }),
    });
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/شقة/);
    await userEvent.type(ta, "شقة 3 غرف في المعادي تحت 2 مليون");
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText(/تم التوسعة/)).toBeInTheDocument();
  });

  it("uses suggestedBedrooms when bedrooms is null", async () => {
    (aiSearchApi.search as any).mockResolvedValue({
      data: buildResponse({
        meta: buildMeta({
          parsedFilters: {
            ...buildMeta().parsedFilters,
            bedrooms: null,
            suggestedBedrooms: 4,
          },
        }),
      }),
    });
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment/i);
    await userEvent.type(ta, QUERY);
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText(/suggested.*4/i)).toBeInTheDocument();
  });

  it("blocks submit when query is too short (< 7 words)", async () => {
    render(<AISearchPanel onResults={vi.fn()} onClose={vi.fn()} />);
    const ta = await screen.findByPlaceholderText(/3-bedroom apartment/i);
    await userEvent.type(ta, "tiny query");
    const btn = screen.getByLabelText("Search") as HTMLButtonElement;
    expect(btn).toBeDisabled();
    expect(aiSearchApi.search).not.toHaveBeenCalled();
  });
});
