import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/hooks/useAuth";

/**
 * FR-001/FR-006/FR-009: gates authenticated-only pages behind a completed
 * academic profile (Board + Standard). Assumes it is always rendered inside
 * ProtectedRoute (so the caller is already known to be authenticated) - it
 * only decides between "send to /profile/setup" and "render children".
 */
export function RequireAcademicProfile({ children }: { children: ReactNode }) {
  const { academicProfileComplete, isProfileLoading } = useAuth();
  const location = useLocation();

  // Don't redirect while the profile is still loading (avoids a false-positive
  // bounce before we know the real completeness state).
  if (isProfileLoading) {
    return <>{children}</>;
  }

  const isSetupPage = location.pathname === "/profile/setup";

  if (academicProfileComplete === false && !isSetupPage) {
    return <Navigate to="/profile/setup" replace />;
  }

  // US2: once the profile is complete, the setup page itself is no longer
  // reachable - send the user to the landing page instead of re-showing it.
  if (academicProfileComplete === true && isSetupPage) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default RequireAcademicProfile;
