import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../../hooks/useUser";
import { useUserRole } from "../../hooks/useUserRole";
import type { Role } from "../../types/superAdmin";

type RoleProtectedRouteProps = {
  allowedRoles: Role[];
  children: ReactNode;
};

const RoleProtectedRoute = ({ allowedRoles, children }: RoleProtectedRouteProps) => {
  const { user, isLoading, verified } = useUser();
  const { role, loading, error } = useUserRole(user?.id);

  if (isLoading || loading || !verified) {
    return (
      <div className="min-h-screen bg-ink-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
          <p className="text-sm text-slate-400">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (error || !role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
