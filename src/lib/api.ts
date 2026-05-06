// Centralized axios client + typed helpers for /api/Auth/*.
// baseURL is "/api" so requests flow through the Vite dev proxy (see vite.config.ts)
// to the DARI_API backend at https://localhost:7199.

import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "dari:token";
export const USER_KEY  = "dari:user";

// Dispatched whenever the token is invalidated server-side (401).
// AuthContext subscribes to it to clear in-memory state.
export const AUTH_UNAUTHORIZED_EVENT = "dari:auth:unauthorized";

export const api = axios.create({
  baseURL: "/api",
  // Some endpoints (register, verify-email, resend-code, etc.) return text/plain.
  // Leave transformResponse as default — axios will keep strings as strings
  // when the content-type is not JSON.
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      // Let AuthContext react — don't force-clear here because the /login
      // endpoint itself returns 401 for bad creds / unverified users, and
      // that shouldn't wipe an existing session.
      const url = err.config?.url ?? "";
      const isLoginCall = url.includes("/Auth/login");
      if (!isLoginCall) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }
    }
    return Promise.reject(err);
  }
);

// ── Backend DTOs ──────────────────────────────────────────────────────────────
// Enums are sent as integers — backend uses System.Text.Json with no
// JsonStringEnumConverter, so string names are rejected.

// UserType:    Customer=0, Lister=1, Admin=2
// CustomerType: Buyer=0, Renter=1
// ListerType:   Individual=0, Agent=1
export type ApiUserType     = 0 | 1 | 2;
export type ApiCustomerType = 0 | 1;
export type ApiListerType   = 0 | 1;

export const UserTypeEnum     = { Customer: 0, Lister: 1, Admin: 2 } as const;
export const CustomerTypeEnum = { Buyer: 0, Renter: 1 } as const;
export const ListerTypeEnum   = { Individual: 0, Agent: 1 } as const;

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  userType: ApiUserType;
  customerType?: ApiCustomerType | null;
  listerType?: ApiListerType | null;
  agencyName?: string | null;
  licenseNumber?: string | null;
}

export interface LoginResponse {
  token: string;
  email: string;
  name: string;
  role: string | null;
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  userType: ApiUserType;
  customerType: ApiCustomerType | null;
  listerType: ApiListerType | null;
  agencyName: string | null;
  licenseNumber: string | null;
}

export interface UpdateProfilePayload {
  name?: string | null;
  phoneNumber?: string | null;
  customerType?: ApiCustomerType | null;
  listerType?: ApiListerType | null;
  agencyName?: string | null;
  licenseNumber?: string | null;
}

// ── Typed endpoint helpers ────────────────────────────────────────────────────

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<string>("/Auth/register", payload),

  login: (email: string, password: string) =>
    api.post<LoginResponse>("/Auth/login", { email, password }),

  getProfile: () => api.get<ProfileResponse>("/Auth/profile"),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.put<{ message: string }>("/Auth/update-profile", payload),

  verifyEmail: (email: string, code: string) =>
    api.post<string>("/Auth/verify-email", { email, code }),

  // Backend binds this from [FromBody] string — send a raw JSON string.
  resendVerifyCode: (email: string) =>
    api.post<string>("/Auth/resend-code", JSON.stringify(email), {
      headers: { "Content-Type": "application/json" },
    }),

  forgotPassword: (email: string) =>
    api.post<string>("/Auth/forgot-password", { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post<string>("/Auth/reset-password", { email, code, newPassword }),

  resendResetCode: (email: string) =>
    api.post<string>("/Auth/resend-reset-code", { email }),

  // Social login — backend binds [FromBody] string, so send a raw JSON string.
  // Response is EITHER a LoginResponse (existing user) OR { needsProfile: true, email, name } (new user).
  googleLogin: (idToken: string) =>
    api.post<LoginResponse | GoogleNeedsProfile>("/Auth/google-login", JSON.stringify(idToken), {
      headers: { "Content-Type": "application/json" },
    }),

  googleComplete: (payload: GoogleCompletePayload) =>
    api.post<LoginResponse>("/Auth/google-complete", payload),

  microsoftLogin: (idToken: string) =>
    api.post<LoginResponse>("/Auth/microsoft-login", JSON.stringify(idToken), {
      headers: { "Content-Type": "application/json" },
    }),
};

export interface GoogleNeedsProfile {
  needsProfile: true;
  email: string;
  name: string;
}

export interface GoogleCompletePayload {
  idToken: string;
  userType: ApiUserType;
  customerType?: ApiCustomerType | null;
  listerType?: ApiListerType | null;
  agencyName?: string | null;
  licenseNumber?: string | null;
  phoneNumber?: string | null;
}

// ── Inquiry types ─────────────────────────────────────────────────────────────
// InquiryStatus: Pending=0, Responded=1, Closed=2
export type InquiryStatus = 0 | 1 | 2;

export interface InquiryMessage {
  id: string;
  senderId: string;
  text: string;
  sentAt: string;
  readAt: string | null;
}

export interface Inquiry {
  id: string;
  customerId: string;
  customerName: string;
  listerId: string;
  listerName: string;
  listingId: string;
  listingTitle: string;
  listingCity: string;
  listingPrice: number;
  listingType: number | null;
  status: InquiryStatus;
  createdAt: string;
  messages: InquiryMessage[];
}

export const inquiryApi = {
  // Buyer: get my sent inquiries
  getMy: () => api.get<Inquiry[]>("/Inquiry/my"),

  // Lister / Agent: get received inquiries
  getReceived: () => api.get<Inquiry[]>("/Inquiry/received"),

  // Both: get one inquiry by id
  getById: (id: string) => api.get<Inquiry>(`/Inquiry/${id}`),

  // Buyer: create a new inquiry on a listing
  create: (listingId: string, message: string) =>
    api.post<Inquiry>("/Inquiry", { listingId, message }),

  // Both: send a message in an existing inquiry
  sendMessage: (inquiryId: string, text: string) =>
    api.post<InquiryMessage>(`/Inquiry/${inquiryId}/messages`, { text }),

  // Both: close an inquiry
  close: (inquiryId: string) =>
    api.put<string>(`/Inquiry/close/${inquiryId}`),
};

// ── Wishlist types ────────────────────────────────────────────────────────────
export interface WishlistItem {
  id: string;
  listingId: string;
  rating: number | null;
  addedAt: string;
  addedBy: string;
  // enriched by backend
  listingTitle: string;
  listingPrice: number;
  listingCity: string;
  listingType: number | null;
}

export interface WishlistCollaborator {
  id: string;
  userId: string;
  addedAt: string;
  // enriched by backend
  name: string;
  email: string;
}

export interface Wishlist {
  id: string;
  name: string;
  isShared: boolean;
  createdAt: string;
  items: WishlistItem[];
  collaborators: WishlistCollaborator[];
}

export const wishlistApi = {
  // GET /api/Wishlist — all wishlists (enriched)
  getAll: () => api.get<Wishlist[]>("/Wishlist"),

  // POST /api/Wishlist — create wishlist (ListingId optional) or add listing to wishlist
  add: (payload: {
    listingId?: string;
    wishlistId?: string;
    newWishlistName?: string;
    isShared?: boolean;
  }) => api.post<Wishlist>("/Wishlist", payload),

  // PATCH /api/Wishlist/{id} — rename or toggle isShared
  update: (id: string, payload: { name?: string; isShared?: boolean }) =>
    api.patch<Wishlist>(`/Wishlist/${id}`, payload),

  // DELETE /api/Wishlist/{id}
  deleteWishlist: (id: string) => api.delete<string>(`/Wishlist/${id}`),

  // DELETE /api/Wishlist/items/{itemId}
  removeItem: (itemId: string) => api.delete<string>(`/Wishlist/items/${itemId}`),

  // PATCH /api/Wishlist/items/{itemId}/rating
  rateItem: (itemId: string, rating: number | null) =>
    api.patch(`/Wishlist/items/${itemId}/rating`, { rating }),

  // POST /api/Wishlist/collaborators
  addCollaborator: (wishlistId: string, email: string) =>
    api.post<WishlistCollaborator>("/Wishlist/collaborators", { wishlistId, email }),

  // DELETE /api/Wishlist/collaborators/{id}
  removeCollaborator: (collaboratorId: string) =>
    api.delete<string>(`/Wishlist/collaborators/${collaboratorId}`),
};

// ── Listings ──────────────────────────────────────────────────────────────────

export type ApiPropertyType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ApiListingType  = 0 | 1;

// Backend enum order (Models/PropertyType.cs):
// Apartment=0, Villa=1, Studio=2, Duplex=3, Penthouse=4, Office=5, Shop=6, Land=7
export const PropertyTypeEnum = {
  Apartment: 0, Villa: 1, Studio: 2, Duplex: 3,
  Penthouse: 4, Office: 5, Shop: 6, Land: 7,
} as const;

// ListingType: Sale=0, Rent=1
export const ListingTypeEnum = { Sale: 0, Rent: 1 } as const;

// ListingKind: Residential=0, Commercial=1
export type ApiListingKind = 0 | 1;
export const ListingKindEnum = { Residential: 0, Commercial: 1 } as const;

export interface CreateImageRequest {
  url: string;
  publicId: string;
  format?: string | null;
  bytes?: number | null;
  width: number;
  height: number;
  sortOrder: number;
}

export interface CreateAddressRequest {
  street: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSize: number;
  propertyType: ApiPropertyType;
  finishing?: string | null;
  listingType: ApiListingType;
  listingKind?: ApiListingKind | null;
  address: CreateAddressRequest;
  images: CreateImageRequest[];
  lifestyleScore?: number | null;
  lifestyleScoreBreakdown?: string | null; // JSON string
}

export interface ListingResponse {
  id: string;
  listerId: string;
  title: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSize: number;
  propertyType: ApiPropertyType;
  finishing: string | null;
  listingType: ApiListingType;
  listingKind: ApiListingKind | null;
  status: number;
  isApproved: boolean;
  isFeatured: boolean;
  viewCount: number;
  coverImageUrl: string | null;
  lifestyleScore: number | null;
  lifestyleScoreBreakdown: string | null;
  lifestyleScoreCalculatedAt: string | null;
  aiGeneratedDescription: string | null;
  aiStandardizedFinishing: string | null;
  aiGeneratedTags: string | null;
  aiQualityScore: number | null;
  createdAt: string;
  updatedAt: string;
  address: {
    street: string; city: string; region: string; country: string;
    latitude: number; longitude: number;
  } | null;
  images: { id: string; url: string; publicId: string | null; width: number; height: number; sortOrder: number }[];
}

// Filter params for GET /api/Listing/filter — everything optional.
export interface ListingFilterParams {
  minPrice?: number | null;
  maxPrice?: number | null;
  bedrooms?: number | null;   // >= semantics ("3+")
  bathrooms?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  propertyType?: ApiPropertyType | null;
  listingType?: ApiListingType | null;
  listingKind?: ApiListingKind | null;
  finishing?: string | null;
  city?: string | null;
  region?: string | null;
}

// Where the user landed on a listing detail page — feeds ListingView analytics
export type ListingViewSource = "search" | "direct" | "saved" | "map";

export const listingApi = {
  create: (payload: CreateListingRequest) =>
    api.post<ListingResponse>("/Listing", payload),

  update: (id: string, payload: CreateListingRequest) =>
    api.put<ListingResponse>(`/Listing/${id}`, payload),

  // `source` is query-stringed so backend can classify the visit.
  getById: (id: string, source: ListingViewSource = "direct") =>
    api.get<ListingResponse>(`/Listing/${id}`, { params: { source } }),

  getAll: () => api.get<ListingResponse[]>("/Listing"),

  getMine: () => api.get<ListingResponse[]>("/Listing/my"),

  getFeatured: () => api.get<ListingResponse[]>("/Listing/featured"),

  // GET /api/Listing/filter — backend strips null/undefined params automatically.
  filter: (params: ListingFilterParams) => {
    const cleaned: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== "") cleaned[k] = v as string | number;
    }
    return api.get<ListingResponse[]>("/Listing/filter", { params: cleaned });
  },

  delete: (id: string) => api.delete<string>(`/Listing/${id}`),

  // ── Admin moderation (legacy helpers — prefer adminApi.* below) ────────────
  getPending: () => api.get<{ data: AdminListing[] }>("/admin/listings", { params: { status: "pending" } })
    .then((r) => ({ data: r.data.data.map(adminListingToResponse) })),

  approve: (id: string) =>
    api.put<{ message: string }>(`/admin/listings/${id}/approve`),

  reject: (id: string, reason?: string) =>
    api.put<{ message: string }>(`/admin/listings/${id}/reject`, { rejectionReason: reason ?? "Did not meet listing guidelines." }),

  unpublish: (id: string) =>
    api.patch<{ message: string }>(`/admin/listings/${id}/unpublish`),

  reApprove: (id: string) =>
    api.patch<{ message: string }>(`/admin/listings/${id}/re-approve`),

  adminDelete: (id: string) =>
    api.delete<{ message: string }>(`/admin/listings/${id}`),
};

// ── Admin DTOs ───────────────────────────────────────────────────────────────

export interface AdminListing {
  id: string;
  title: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSize: number;
  propertyType: ApiPropertyType;
  listingType: ApiListingType;
  listingKind: ApiListingKind | null;
  status: number;
  isApproved: boolean;
  isFeatured: boolean;
  viewCount: number;
  coverImageUrl: string | null;
  rejectionReason: string | null;
  aiQualityScore: number | null;
  lifestyleScore: number | null;
  createdAt: string;
  updatedAt: string;
  address: { street: string; city: string; region: string; country: string } | null;
  lister: { id: string; name: string; userName: string; email: string; isVerified: boolean } | null;
  images: { id: string; url: string; sortOrder: number }[];
}

// Adapter so legacy components consuming ListingResponse keep working when we
// switched listingApi.getPending to admin routes.
function adminListingToResponse(l: AdminListing): ListingResponse {
  return {
    id: l.id,
    listerId: l.lister?.id ?? "",
    title: l.title,
    description: l.description,
    price: l.price,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    areaSize: l.areaSize,
    propertyType: l.propertyType,
    finishing: null,
    listingType: l.listingType,
    listingKind: l.listingKind,
    status: l.status,
    isApproved: l.isApproved,
    isFeatured: l.isFeatured,
    viewCount: l.viewCount,
    coverImageUrl: l.coverImageUrl,
    lifestyleScore: l.lifestyleScore,
    lifestyleScoreBreakdown: null,
    lifestyleScoreCalculatedAt: null,
    aiGeneratedDescription: null,
    aiStandardizedFinishing: null,
    aiGeneratedTags: null,
    aiQualityScore: l.aiQualityScore,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    address: l.address ? { ...l.address, latitude: 0, longitude: 0 } : null,
    images: l.images.map((i) => ({
      id: i.id, url: i.url, publicId: null, width: 0, height: 0, sortOrder: i.sortOrder,
    })),
  };
}

export interface AdminUser {
  id: string;
  userName: string | null;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  accountStatus: number; // Pending=0, Active=1, Suspended=2, Banned=3
  userType: number;      // Customer=0, Lister=1, Admin=2
  customerType: number | null;
  listerType: number | null;  // Individual=0, Agent=1
  agencyName: string | null;
  licenseNumber: string | null;
  isVerified: boolean;
  maxListings: number;
  subscriptionEndDate: string | null;
  suspendedUntil: string | null;
  suspensionReason: string | null;
  banReason: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export interface AdminUserDetail {
  profile: AdminUser;
  stats: { listingCount: number; inquiryCount: number; totalViews: number };
}

export interface AdminStats {
  users:    { totalUsers: number; suspendedUsers: number; bannedUsers: number; verifiedListers: number };
  listings: { totalListings: number; pendingListings: number; activeListings: number; rejectedListings: number; totalViews: number };
  inquiries:{ totalInquiries: number; openInquiries: number };
}

export interface AdminInquirySummary {
  id: string;
  status: number;
  createdAt: string;
  listingId: string;
  listingTitle: string | null;
  customer: { id: string; name: string; email: string } | null;
  lister:   { id: string; name: string; email: string } | null;
  messageCount: number;
}

export interface AdminInquiryDetail {
  id: string;
  status: number;
  createdAt: string;
  listing:  { id: string; title: string; price: number } | null;
  customer: { id: string; name: string; email: string } | null;
  lister:   { id: string; name: string; email: string } | null;
  messages: { id: string; senderId: string; text: string; sentAt: string; readAt: string | null }[];
}

export const adminApi = {
  // Stats
  getStats: () => api.get<AdminStats>("/admin/stats"),

  // Users
  listUsers: (params?: { search?: string; status?: string; role?: string }) =>
    api.get<{ data: AdminUser[] }>("/admin/users", { params }),

  getUser: (id: string) =>
    api.get<{ data: AdminUserDetail }>(`/admin/users/${id}`),

  banUser: (id: string, reason?: string) =>
    api.put<{ message: string }>(`/admin/users/${id}/ban`, { reason: reason ?? null }),

  suspendUser: (id: string, days: number, reason?: string) =>
    api.patch<{ message: string; suspendedUntil: string }>(`/admin/users/${id}/suspend`, { days, reason: reason ?? null }),

  reactivateUser: (id: string) =>
    api.patch<{ message: string }>(`/admin/users/${id}/reactivate`),

  setVerified: (id: string, isVerified?: boolean) =>
    api.patch<{ message: string; isVerified: boolean }>(`/admin/users/${id}/verify`, { isVerified: isVerified ?? null }),

  assignRole: (id: string, role: string) =>
    api.put<{ message: string }>(`/admin/users/${id}/role`, { role }),

  deleteUser: (id: string) =>
    api.delete<{ message: string }>(`/admin/users/${id}`),

  // Listings
  listListings: (params?: { status?: string }) =>
    api.get<{ data: AdminListing[] }>("/admin/listings", { params }),

  getListing: (id: string) =>
    api.get<{ data: AdminListing }>(`/admin/listings/${id}`),

  approveListing:   (id: string) => api.put<{ message: string }>(`/admin/listings/${id}/approve`),
  rejectListing:    (id: string, rejectionReason: string) =>
    api.put<{ message: string }>(`/admin/listings/${id}/reject`, { rejectionReason }),
  unpublishListing: (id: string) => api.patch<{ message: string }>(`/admin/listings/${id}/unpublish`),
  reApproveListing: (id: string) => api.patch<{ message: string }>(`/admin/listings/${id}/re-approve`),
  deleteListing:    (id: string) => api.delete<{ message: string }>(`/admin/listings/${id}`),

  // Inquiries
  listInquiries: (params?: { status?: string }) =>
    api.get<{ data: AdminInquirySummary[] }>("/admin/inquiries", { params }),

  getInquiry: (id: string) =>
    api.get<{ data: AdminInquiryDetail }>(`/admin/inquiries/${id}`),

  deleteInquiry: (id: string) =>
    api.delete<{ message: string }>(`/admin/inquiries/${id}`),

  deleteMessage: (id: string) =>
    api.delete<{ message: string }>(`/admin/messages/${id}`),

  // Notifications
  sendNotification: (payload: { userId?: string; role?: string; title: string; body: string }) =>
    api.post<{ message: string; recipients: number }>("/admin/notifications", payload),
};

// ── Payment (simulated) ──────────────────────────────────────────────────────
export const paymentApi = {
  // Backend marks IsVerified=true and extends subscription on success.
  confirm: (planId: string) =>
    api.post<{ message: string; isVerified: boolean; subscriptionEndDate: string; maxListings: number; planId: string }>(
      "/payment/confirm", { planId }
    ),
};

// ── Agent dashboard + analytics ──────────────────────────────────────────────

export interface AgentStats {
  totalListings: number;
  activeListings: number;
  totalInquiries: number;
  pendingInquiries: number;
  totalViews: number;
  savedCount: number;
  subscriptionStatus: "active" | "inactive";
  subscriptionExpiry: string | null;
  maxListings: number;
  isVerified: boolean;
}

export interface ListingAnalytics {
  listingId: string;
  title: string;
  totalViews: number;
  viewsPerDay: number;
  totalInquiries: number;
  conversionRate: number;
  aiQualityScore: number | null;
  lifestyleScore: number | null;
  viewsTrend14d: { date: string; count: number }[];
  trafficSources: { search: number; direct: number; saved: number; map: number };
  inquiryStatusBreakdown: { pending: number; responded: number; closed: number };
}

export const agentApi = {
  getStats: () => api.get<AgentStats>("/agent/stats"),
  getListingAnalytics: (id: string) =>
    api.get<ListingAnalytics>(`/agent/listings/${id}/analytics`),
};

// ── Platform stats (public, for landing/about pages) ─────────────────────────

export interface PlatformStats {
  totalActiveListings: number;
  avgPriceSale: number;
  avgPriceRent: number;
  topCities: { city: string; count: number }[];
  totalRegisteredUsers: number;
}

export const platformApi = {
  getStats: () => api.get<PlatformStats>("/platform/stats"),
};

// ── Images (Cloudinary signed direct upload) ──────────────────────────────────

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
  allowedFormats: string;
  maxFileSizeBytes: number;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export const imagesApi = {
  // 1) Ask backend for a signature.
  signUpload: () => api.post<SignedUploadParams>("/images/sign-upload"),

  // 2) Upload the file directly from browser → Cloudinary.
  //    Doesn't go through our backend or axios interceptor (Cloudinary rejects extra headers).
  uploadToCloudinary: async (file: File, signed: SignedUploadParams): Promise<CloudinaryUploadResult> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", signed.apiKey);
    fd.append("timestamp", String(signed.timestamp));
    fd.append("signature", signed.signature);
    fd.append("folder", signed.folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`Cloudinary upload failed: ${msg}`);
    }
    return (await res.json()) as CloudinaryUploadResult;
  },
};

// ── AI helpers (Groq) ─────────────────────────────────────────────────────────

export interface AIDescriptionRequest {
  title: string;
  propertyType: string;
  listingType: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSize: number;
  finishing?: string | null;
  location?: string | null;
  language?: "ar" | "en";
}

export interface AIDescriptionResponse {
  description: string;
  tags: string[];
}

export interface StandardizeListingResponse {
  title: string | null;
  propertyType: string | null;
  listingType: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSize: number | null;
  finishing: string | null;
  city: string | null;
  description: string | null;
  tags: string[] | null;
}

export interface ScoreListingRequest {
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSize: number;
  finishing?: string | null;
  city?: string | null;
  photoCount: number;
}

export interface ScoreListingResponse {
  overallScore: number;
  completeness: number;
  descriptionQuality: number;
  credibility: number;
  photoScore: number;
  verdict: "poor" | "fair" | "good" | "excellent";
  suggestions: string[];
}

export const aiApi = {
  generateDescription: (payload: AIDescriptionRequest) =>
    api.post<AIDescriptionResponse>("/AiListingAssistant/generate-description", payload),

  generateAndApply: (listingId: string, payload: AIDescriptionRequest) =>
    api.post<{ description: string; tags: string[] }>(
      `/AiListingAssistant/generate-and-apply/${listingId}`,
      payload
    ),

  standardize: (rawText: string) =>
    api.post<StandardizeListingResponse>("/AiListingAssistant/standardize", { rawText }),

  scoreListing: (payload: ScoreListingRequest) =>
    api.post<ScoreListingResponse>("/AiListingAssistant/score-listing", payload),
};

// ── AI Search (Gemini-backed FTS pipeline) ───────────────────────────────────
// Backend route group: /api/AiSearch/*
//   POST /search   — full pipeline (parse → search → fallback). JWT required.
//   GET  /quota    — current weekly quota for caller. JWT required.
//   POST /extract  — parse-only diagnostic, no DB.

export interface AiParsedFilters {
  propertyType: string | null;
  listingType: string | null;
  location: string | null;
  locationText: string | null;
  nearMetro: string | null;
  priceMin: number | null;
  priceMax: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  suggestedBedrooms: number | null;
  areaMin: number | null;
  finishingLevel: string | null;
  paymentMethod: string | null;
  maxDownPayment: number | null;
}

export interface AiSearchCorrection {
  field: string;
  reasonCode: string;
  originalValue: string | number | null;
  newValue: string | number | null;
}

export interface AiSearchMeta {
  streetMatch: "exact" | "partial" | "none";
  fallbackApplied: boolean;
  resultCount: number;
  tierBreakdown: { exact: number; partial: number; none: number };
  parsedFilters: AiParsedFilters;
  corrections: AiSearchCorrection[];
  language: "ar" | "en" | "mixed";
  latencyAiMs: number;
  latencyDbMs: number;
  retryUsed: boolean;
  notice: string | null;
}

export interface AiSearchResponse {
  results: ListingResponse[];
  meta: AiSearchMeta;
}

export interface AiSearchQuotaStatus {
  limit: number | null;
  used: number;
  remaining: number | null;
  allowed: boolean;
  resetAtUtc: string;
  unlimited?: boolean;
}

export interface AiExtractResponse {
  parsedFilters: AiParsedFilters;
  language: "ar" | "en" | "mixed";
  corrections: AiSearchCorrection[];
}

export const aiSearchApi = {
  search:  (query: string) => api.post<AiSearchResponse>("/AiSearch/search", { query }),
  quota:   ()              => api.get<AiSearchQuotaStatus>("/AiSearch/quota"),
  extract: (query: string) => api.post<AiExtractResponse>("/AiSearch/extract", { query }),
};

// Normalize an axios error into a user-facing string.
// Backend returns a mix of: plain strings, IdentityError[] arrays, and ModelState objects.
export function extractErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!(err instanceof AxiosError)) return fallback;
  const data = err.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (Array.isArray(data)) {
    // IdentityError[] — each has a `description`.
    const msg = data.map((e) => e?.description).filter(Boolean).join(" ");
    if (msg) return msg;
  }
  if (data && typeof data === "object") {
    // ModelState { errors: { Field: [messages] } } or flat { Field: [messages] }.
    const obj = (data as any).errors ?? data;
    if (obj && typeof obj === "object") {
      const parts: string[] = [];
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (Array.isArray(v)) parts.push(...v);
        else if (typeof v === "string") parts.push(v);
      }
      if (parts.length) return parts.join(" ");
    }
    if (typeof (data as any).title === "string") return (data as any).title;
  }
  return err.message || fallback;
}
