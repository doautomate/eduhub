import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/userService";
import type { UserProfile } from "../types/user";

/**
 * Canonical TanStack Query key for the session/profile cache
 * (010-home-profile-widget: also used directly by `HomeProfileWidget` to write the
 * just-saved profile into this same cache entry, so it MUST stay in sync with the
 * key `useQuery` below is registered under).
 */
export function sessionQueryKey(accessToken: string | null) {
  return ["session", accessToken] as const;
}

/**
 * Wraps `GET /api/v1/users/me` in TanStack Query (constitution VI: server state is
 * owned by TanStack Query, not ad hoc component state). Enabled only once an access
 * token exists; consumers (e.g. `useAuth`) merge `data`/`isVerified` with the
 * in-memory session state.
 */
export function useSessionQuery(accessToken: string | null) {
  return useQuery<UserProfile>({
    queryKey: sessionQueryKey(accessToken),
    queryFn: () => userService.getProfile(accessToken as string),
    enabled: accessToken !== null,
    staleTime: 30_000,
    retry: false,
  });
}

export default useSessionQuery;
