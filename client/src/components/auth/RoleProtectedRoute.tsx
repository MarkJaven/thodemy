import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../../hooks/useUser";
import { useUserRole } from "../../hooks/useUserRole";
import LoadingScreen from "../LoadingScreen";
import type { Role } from "../../types/superAdmin";

type RoleProtectedRouteProps = {
  allowedRoles: Role[];
  children: ReactNode;
};

const RoleProtectedRoute = ({ allowedRoles, children }: RoleProtectedRouteProps) => {
  const { user, isLoading, verified } = useUser();
  const { role, loading, error } = useUserRole(user?.id);

  if (isLoading || loading || !verified) {
    return <LoadingScreen />;
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
