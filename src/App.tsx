import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing              from "./pages/Landing";
import Search               from "./pages/Search";
import ListingPage          from "./pages/ListingPage";
import Favorites            from "./pages/Favorites";
import ProfilePage          from "./pages/ProfilePage";
import ListPropertyPage     from "./pages/ListPropertyPage";
import MyListingsPage       from "./pages/MyListingsPage";
import InquiriesPage        from "./pages/InquiriesPage";
import ListingAnalyticsPage from "./pages/ListingAnalyticsPage";
import LoginPage            from "./pages/LoginPage";
import SignupPage           from "./pages/SignupPage";
import VerifyEmailPage      from "./pages/VerifyEmailPage";
import ForgotPasswordPage   from "./pages/ForgotPasswordPage";
import ResetPasswordPage    from "./pages/ResetPasswordPage";
import CompleteProfilePage  from "./pages/CompleteProfilePage";
import PaymentPage          from "./pages/PaymentPage";
import AdminPage            from "./pages/AdminPage";
import AgentDashboardPage   from "./pages/AgentDashboardPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages — no navbar, but self-apply theme */}
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/signup"           element={<SignupPage />} />
        <Route path="/verify-email"     element={<VerifyEmailPage />} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/payment"          element={<PaymentPage />} />

        {/* Main app — with navbar + theme from MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/"                         element={<Landing />} />
          <Route path="/search"                   element={<Search />} />
          {/* Both routes point to same page — cards use /listing/:id, breadcrumbs use /listings/:id */}
          <Route path="/listing/:id"              element={<ProtectedRoute><ListingPage /></ProtectedRoute>} />
          <Route path="/listings/:id"             element={<ProtectedRoute><ListingPage /></ProtectedRoute>} />
          <Route path="/favorites"                element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/profile"                  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/list-property"            element={<ProtectedRoute><ListPropertyPage /></ProtectedRoute>} />
          <Route path="/listings/:id/edit"        element={<ProtectedRoute><ListPropertyPage /></ProtectedRoute>} />
          <Route path="/my-listings"              element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} />
          <Route path="/inquiries"                element={<ProtectedRoute><InquiriesPage /></ProtectedRoute>} />
          <Route path="/listings/:id/analytics"   element={<ProtectedRoute><ListingAnalyticsPage /></ProtectedRoute>} />
          <Route path="/admin"                    element={<ProtectedRoute roles={["admin"]}><AdminPage /></ProtectedRoute>} />
          <Route path="/agent/dashboard"          element={<ProtectedRoute roles={["lister","agent"]}><AgentDashboardPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
