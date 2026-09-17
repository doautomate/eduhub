import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../shared/hooks/useAuth";

// FR-010: unauthenticated (or session-expired) users are redirected away from
// protected pages to the login page.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default ProtectedRoute;
