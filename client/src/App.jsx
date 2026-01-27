import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthCallback from "./pages/AuthCallback";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";

/**
 * Configure application routes.
 * @returns {JSX.Element}
 */
const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/:mode" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/super-admin"
          element={
            <RoleProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/auth/register" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
