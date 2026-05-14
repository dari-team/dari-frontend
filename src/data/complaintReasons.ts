// Predefined reasons a user can pick when reporting a listing.
// `value` matches the backend ComplaintReason enum (Models/Enums.cs):
// Spam=0, ScamOrFraud=1, IncorrectInfo=2, AlreadySoldOrRented=3,
// OffensiveContent=4, Duplicate=5, Other=6
import type { ApiComplaintReason } from "../lib/api";

export interface ComplaintReasonOption {
  value: ApiComplaintReason;
  labelEn: string;
  labelAr: string;
  icon: string;
}

export const COMPLAINT_REASONS: ComplaintReasonOption[] = [
  { value: 0, labelEn: "Spam or misleading",       labelAr: "إعلان مزعج أو مضلل",      icon: "🚫" },
  { value: 1, labelEn: "Scam or fraud",            labelAr: "احتيال أو نصب",           icon: "⚠️" },
  { value: 2, labelEn: "Incorrect information",    labelAr: "معلومات غير صحيحة",       icon: "❗" },
  { value: 3, labelEn: "Already sold or rented",   labelAr: "تم بيعه أو تأجيره",       icon: "🔒" },
  { value: 4, labelEn: "Offensive content",        labelAr: "محتوى مسيء",              icon: "🚷" },
  { value: 5, labelEn: "Duplicate listing",        labelAr: "إعلان مكرر",              icon: "📑" },
  { value: 6, labelEn: "Other",                    labelAr: "سبب آخر",                 icon: "✏️" },
];

const REASON_BY_VALUE: Record<number, ComplaintReasonOption> = Object.fromEntries(
  COMPLAINT_REASONS.map((r) => [r.value, r]),
);

export function complaintReasonLabel(value: number, isAr: boolean): string {
  const r = REASON_BY_VALUE[value];
  if (!r) return String(value);
  return isAr ? r.labelAr : r.labelEn;
}
