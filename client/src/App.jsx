import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthCallback from "./pages/AuthCallback";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import DeactivatedPage from "./pages/DeactivatedPage";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import { useUserRole } from "./hooks/useUserRole";

/**
 * Renders the landing page for unauthenticated users.
 * Authenticated admins/superadmins are redirected to their dashboard
 * so the back button can never strand them on the landing page.
 */
const LandingPageGuard = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  if (authLoading || (user && roleLoading)) return null;

  if (user && role === "superadmin") return <Navigate to="/super-admin" replace />;
  if (user && role === "admin") return <Navigate to="/admin" replace />;

  return <LandingPage />;
};

/**
 * Configure application routes.
 * @returns {JSX.Element}
 */
const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPageGuard />} />
        <Route path="/auth/:mode" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/deactivated" element={<DeactivatedPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/admin/*"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "superadmin"]}>
              <AdminDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/super-admin/*"
          element={
            <RoleProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
