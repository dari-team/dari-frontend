import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Role = "buyer" | "lister" | "agent" | "admin";

// Redirects to /login if the user isn't authenticated. Preserves the attempted
// location in state so LoginPage can bounce them back after signing in.
// When `roles` is provided, also bounces users who are signed in but lack the
// required role back to /.
export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    // Don't redirect while we're still rehydrating the profile — render nothing
    // briefly. Matches the minimal-chrome feel of the auth pages.
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--text-muted)" }}
      >
        <span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && user && !roles.includes(user.user_type as Role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
