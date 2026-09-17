import { authService } from "../../authService";

type TokenGetter = () => string | null;
type TokenSetter = (token: string) => void;
type OnRefreshFailure = () => void;

/**
 * Wraps fetch so protected requests carry the in-memory access token and
 * transparently retry once via a silent refresh on a 401. If the refresh also
 * fails, `onRefreshFailure` is invoked so the caller can redirect to /login.
 */
export function createAuthenticatedFetch(
  getToken: TokenGetter,
  setToken: TokenSetter,
  onRefreshFailure: OnRefreshFailure,
) {
  return async function authenticatedFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> {
    const attempt = async (): Promise<Response> => {
      const token = getToken();
      const headers = new Headers(init.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers, credentials: "include" });
    };

    let response = await attempt();
    if (response.status === 401) {
      try {
        const { accessToken } = await authService.refresh();
        setToken(accessToken);
        response = await attempt();
      } catch {
        onRefreshFailure();
      }
    }
    return response;
  };
}
