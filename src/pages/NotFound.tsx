import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Catch-all page for unmatched routes. Without this, react-router renders an
// empty <Routes> outlet → a blank white screen with no way to navigate back.
export default function NotFound() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20"
      style={{ background: "var(--bg)" }}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="text-7xl sm:text-8xl font-black tabular-nums mb-4"
        style={{ color: "var(--accent)", lineHeight: 1 }}
      >
        404
      </div>
      <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        {isAr ? "الصفحة غير موجودة" : "Page not found"}
      </h1>
      <p className="text-sm mb-8 max-w-md" style={{ color: "var(--text-muted)" }}>
        {isAr
          ? "تعذّر العثور على الصفحة المطلوبة. ربما تم نقلها أو لم تعد متاحة."
          : "We couldn't find the page you're looking for. It may have moved or no longer exists."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          {isAr ? "العودة للرئيسية" : "Back to home"}
        </Link>
        <Link
          to="/search"
          className="rounded-xl px-5 py-2.5 text-sm font-medium transition"
          style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text-secondary)" }}
        >
          {isAr ? "تصفّح العقارات" : "Browse properties"}
        </Link>
      </div>
    </div>
  );
}
