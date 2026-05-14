import { useState } from "react";
import { useTranslation } from "react-i18next";
import { COMPLAINT_REASONS } from "../../data/complaintReasons";
import { complaintApi, extractErrorMessage, type ApiComplaintReason } from "../../lib/api";

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

// Modal a logged-in user opens from a listing to report it to the admins.
export default function ReportListingModal({
  listingId,
  listingTitle,
  onClose,
}: {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [reason, setReason] = useState<ApiComplaintReason | null>(null);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason === null) {
      setErrMsg(isAr ? "اختر سبب البلاغ." : "Please pick a reason.");
      return;
    }
    setStatus("loading");
    setErrMsg("");
    try {
      await complaintApi.create(listingId, reason, details);
      setStatus("success");
    } catch (err) {
      const msg = extractErrorMessage(err, isAr ? "تعذّر إرسال البلاغ." : "Failed to submit report.");
      if (msg.toLowerCase().includes("already have an open report")) {
        setStatus("duplicate");
      } else {
        setStatus("error");
        setErrMsg(msg);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <span>⚐</span> {isAr ? "الإبلاغ عن هذا الإعلان" : "Report this listing"}
          </h3>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: "var(--text-faint)" }}>✕</button>
        </div>

        {/* Success / duplicate states */}
        {status === "success" || status === "duplicate" ? (
          <div className="px-5 py-8 text-center space-y-2">
            <p className="text-3xl">{status === "success" ? "✅" : "💬"}</p>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {status === "success"
                ? (isAr ? "تم إرسال البلاغ" : "Report submitted")
                : (isAr ? "لديك بلاغ مفتوح بالفعل" : "You already reported this")}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {status === "success"
                ? (isAr ? "سيقوم فريق الإدارة بمراجعته قريبًا." : "Our team will review it shortly.")
                : (isAr ? "بلاغك السابق لا يزال قيد المراجعة." : "Your earlier report is still under review.")}
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl px-5 py-2 text-sm font-semibold transition"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {isAr
                ? `لماذا تريد الإبلاغ عن "${listingTitle}"؟`
                : `Why are you reporting "${listingTitle}"?`}
            </p>

            {/* Reason options */}
            <div className="space-y-1.5">
              {COMPLAINT_REASONS.map((r) => {
                const checked = reason === r.value;
                return (
                  <label
                    key={r.value}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition"
                    style={{
                      border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                      background: checked ? "var(--accent-light)" : "var(--surface2)",
                    }}
                  >
                    <input
                      type="radio"
                      name="reason"
                      checked={checked}
                      onChange={() => { setReason(r.value); setErrMsg(""); }}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="text-base">{r.icon}</span>
                    <span className="text-sm" style={{ color: checked ? "var(--accent)" : "var(--text-secondary)" }}>
                      {isAr ? r.labelAr : r.labelEn}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Optional details */}
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              placeholder={isAr ? "تفاصيل إضافية (اختياري)…" : "Additional details (optional)…"}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }}
            />

            {errMsg && (
              <p className="text-[11px]" style={{ color: "var(--danger)" }}>⚠️ {errMsg}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
                style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-50"
                style={{ background: "var(--danger)", color: "white" }}
              >
                {status === "loading"
                  ? (isAr ? "جارٍ الإرسال…" : "Submitting…")
                  : (isAr ? "إرسال البلاغ" : "Submit report")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
