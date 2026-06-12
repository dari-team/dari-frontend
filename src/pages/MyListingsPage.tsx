// ── MyListingsPage.tsx ────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscription } from "../hooks/useSubscription";
import {
  listingApi,
  extractErrorMessage,
  type ListingResponse,
} from "../lib/api";

type Status = "all" | "active" | "pending" | "rejected";

function statusOf(l: ListingResponse): "active" | "pending" | "rejected" {
  if (l.status === 2) return "rejected";
  if (l.isApproved && l.status === 1) return "active";
  return "pending";
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  active: {
    background: "var(--success-light)",
    color: "var(--success)",
    border: "1px solid var(--success)",
  },
  pending: {
    background: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
    border: "1px solid rgba(245,158,11,0.4)",
  },
  rejected: {
    background: "var(--danger-light)",
    color: "var(--danger)",
    border: "1px solid var(--danger)",
  },
};

function fmt(n: number) {
  return n.toLocaleString();
}
function fmtPrice(n: number, type: number) {
  return type === 1 ? `EGP ${fmt(n)}/mo` : `EGP ${fmt(n)}`;
}

function ListingRow({ l, onDelete }: { l: ListingResponse; onDelete: (id: string) => Promise<void> }) {
  const { t } = useTranslation();
  const s = statusOf(l);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDelError(null);
    try {
      await onDelete(l.id);
      // Parent drops the row from the list on success, so this component unmounts.
    } catch (e) {
      setDelError(extractErrorMessage(e, t("myListings.deleteFailed")));
      setDeleting(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 group"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--accent)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border)")
      }
    >
      <div className="flex">
        <div
          className="w-28 sm:w-36 flex-shrink-0 relative overflow-hidden"
          style={{ background: "var(--surface2)" }}
        >
          {l.coverImageUrl ? (
            <img
              src={l.coverImageUrl}
              alt=""
              className="w-full h-full object-cover absolute inset-0"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: "var(--text-faint)" }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
              </svg>
            </div>
          )}
          <div className="absolute top-2 start-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
              style={STATUS_STYLE[s]}
            >
              {s}
            </span>
          </div>
        </div>
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className="text-sm font-semibold truncate"
                style={{ color: "var(--text)" }}
              >
                {l.title}
              </h3>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--text-faint)" }}
              >
                {l.address?.city ?? "—"} · {l.areaSize}m²
              </p>
            </div>
            <p
              className="text-sm font-bold flex-shrink-0"
              style={{ color: "var(--accent)" }}
            >
              {fmtPrice(l.price, l.listingType)}
            </p>
          </div>
          <div
            className="flex items-center gap-4 mt-3 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {fmt(l.viewCount)} {t("myListings.views")}
            </span>
          </div>

          {s === "rejected" && l.rejectionReason && (
            <div
              className="mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2 text-xs"
              style={{
                background: "var(--danger-light)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
              }}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                <strong>{t("myListings.rejectionReview")}:</strong>{" "}
                {l.rejectionReason}
              </span>
            </div>
          )}
          {confirming ? (
            <div
              className="flex items-center gap-2 mt-3 flex-wrap rounded-xl px-3 py-2.5"
              style={{ background: "var(--danger-light)", border: "1px solid var(--danger)" }}
            >
              <span className="text-xs font-semibold flex-1 min-w-0" style={{ color: "var(--danger)" }}>
                {delError ?? t("myListings.deleteConfirm")}
              </span>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="text-xs rounded-lg px-3 py-1.5 font-bold transition disabled:opacity-60"
                style={{ background: "var(--danger)", color: "white" }}
              >
                {deleting ? t("myListings.deleting") : t("myListings.deleteYes")}
              </button>
              <button
                onClick={() => { setConfirming(false); setDelError(null); }}
                disabled={deleting}
                className="text-xs rounded-lg px-3 py-1.5 transition disabled:opacity-60"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                {t("myListings.cancel")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-3">
              {[
                {
                  label: t("myListings.view"),
                  to: `/listing/${l.id}`,
                  style: {
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  },
                },
                {
                  label: t("myListings.edit"),
                  to: `/listings/${l.id}/edit`,
                  style: {
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  },
                },
                {
                  label: t("myListings.analytics"),
                  to: `/listings/${l.id}/analytics`,
                  style: {
                    border: "1px solid rgba(139,92,246,0.4)",
                    color: "#a78bfa",
                  },
                },
              ].map(({ label, to, style }) => (
                <Link
                  key={label}
                  to={to}
                  className="text-xs rounded-lg px-3 py-1.5 transition"
                  style={style}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = style.color)
                  }
                >
                  {label}
                </Link>
              ))}
              {/* Delete — owner-only action (My Listings only shows the lister's own
                  listings, and the backend re-checks ownership on DELETE). */}
              <button
                onClick={() => setConfirming(true)}
                className="text-xs rounded-lg px-3 py-1.5 transition ms-auto"
                style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
              >
                {t("myListings.delete")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyListingsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const sub = useSubscription();
  const [tab, setTab] = useState<Status>("all");
  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listingApi.getMine();
        setListings(res.data);
      } catch (e) {
        setError(extractErrorMessage(e, "Failed to load listings"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Delete a listing the lister owns. Backend (DELETE /Listing/:id) re-verifies
  // ownership and removes the Cloudinary assets; on success we drop the row.
  const handleDelete = async (id: string) => {
    await listingApi.delete(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const withStatus = listings.map((l) => ({ l, s: statusOf(l) }));
  const filtered =
    tab === "all" ? withStatus : withStatus.filter(({ s }) => s === tab);
  const counts = {
    all: withStatus.length,
    active: withStatus.filter(({ s }) => s === "active").length,
    pending: withStatus.filter(({ s }) => s === "pending").length,
    rejected: withStatus.filter(({ s }) => s === "rejected").length,
  };

  return (
    <div
      className="min-h-screen pt-6 sm:pt-10 pb-10 sm:pb-16 px-4 sm:px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {t("myListings.title")}
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {counts.all} {t("myListings.total")} · {counts.active}{" "}
              {t("myListings.active")}
            </p>

            {sub.status !== "none" && sub.max_listings > 0 && (
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="w-40 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (sub.current_listings / sub.max_listings) * 100)}%`,
                      background:
                        sub.current_listings >= sub.max_listings
                          ? "var(--danger)"
                          : sub.current_listings >= sub.max_listings * 0.8
                            ? "#f59e0b"
                            : "var(--success)",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {sub.current_listings}/{sub.max_listings}{" "}
                  {isAr ? "إعلانات مستخدمة" : "listings used"}
                </span>
              </div>
            )}
            {sub.status !== "none" && sub.max_listings === 0 && (
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: "var(--success)" }}
              >
                ∞ {isAr ? "إعلانات غير محدودة" : "Unlimited listings"}
              </p>
            )}
          </div>

          {sub.can_add_listing ? (
            <Link
              to="/list-property"
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("myListings.addListing")}
            </Link>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold opacity-50 cursor-not-allowed"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                {t("myListings.addListing")}
              </div>
              <Link
                to="/payment"
                className="text-xs underline transition"
                style={{ color: "var(--danger)" }}
              >
                {sub.status === "expired"
                  ? isAr
                    ? "جدد اشتراكك"
                    : "Renew subscription"
                  : isAr
                    ? "ترقية الخطة"
                    : "Upgrade plan"}
              </Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 rounded-xl p-1 mb-6 w-fit"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {(["all", "active", "pending", "rejected"] as Status[]).map((v) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 capitalize"
              style={{
                background: tab === v ? "var(--surface2)" : "transparent",
                color: tab === v ? "var(--text)" : "var(--text-faint)",
              }}
            >
              {t(`myListings.tabs.${v}`)}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: "var(--surface2)",
                  color: "var(--text-muted)",
                }}
              >
                {counts[v]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {isAr ? "جارٍ التحميل…" : "Loading…"}
            </p>
          </div>
        ) : error ? (
          <div
            className="text-center py-20 rounded-2xl"
            style={{
              border: "1px solid var(--danger)",
              background: "var(--danger-light)",
              color: "var(--danger)",
            }}
          >
            <p className="text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}
            >
              🏠
            </div>
            <p
              className="font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("myListings.noListings")}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-faint)" }}>
              {tab === "all"
                ? t("myListings.startAdding")
                : t("myListings.noStatus", { status: tab })}
            </p>
            {tab === "all" && (
              <Link
                to="/list-property"
                className="inline-flex items-center gap-2 mt-4 rounded-xl px-5 py-2.5 text-sm font-bold transition"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-text)",
                }}
              >
                + {t("myListings.addListing")}
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(({ l }) => (
              <ListingRow key={l.id} l={l} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyListingsPage;
