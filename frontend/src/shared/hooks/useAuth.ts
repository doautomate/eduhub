import { useCallback, useMemo } from "react";
import { authService } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import { useSessionQuery } from "./useSessionQuery";
import type { LoginPayload, RegisterPayload } from "../types/auth";

/** Public hook consumed by pages/components to perform auth actions and read session state. */
export function useAuth() {
  const { isAuthenticated, accessToken, user, setSession, clearSession } = useAuthStore();

  // T019: source the authoritative user/verified state from the server (via
  // useSessionQuery/GET /users/me) once we hold an access token, rather than
  // trusting only the locally-echoed email set at login time.
  const sessionQuery = useSessionQuery(accessToken);
  const profile = sessionQuery.data;

  const register = useCallback((payload: RegisterPayload) => authService.register(payload), []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { accessToken: token } = await authService.login(payload);
      setSession(token, { id: "", email: payload.email });
      return token;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
  }, [clearSession]);

  const mergedUser = useMemo(() => {
    if (profile) {
      return { id: profile.id, email: profile.email };
    }
    return user;
  }, [profile, user]);

  return {
    isAuthenticated,
    accessToken,
    user: mergedUser,
    profile,
    isVerified: profile?.is_verified ?? false,
    // 009-profile-onboarding-setup: undefined while the profile is still loading so
    // RequireAcademicProfile can distinguish "unknown yet" from "known incomplete".
    academicProfileComplete: profile?.academic_profile_complete,
    isProfileLoading: sessionQuery.isLoading,
    register,
    login,
    logout,
  };
}
