import { describe, expect, it, vi, afterEach } from "vitest";
import { createAuthenticatedFetch } from "../../../../src/shared/services/api/middleware/auth";
import { authService } from "../../../../src/shared/services/authService";

vi.mock("../../../../src/shared/services/authService", () => ({
  authService: {
    refresh: vi.fn(),
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(authService.refresh).mockReset();
});

describe("createAuthenticatedFetch", () => {
  it("attaches the Authorization header when a token is available", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const authenticatedFetch = createAuthenticatedFetch(
      () => "tok-abc",
      () => {},
      () => {},
    );
    await authenticatedFetch("/api/v1/resource");

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer tok-abc");
    expect(init.credentials).toBe("include");
  });

  it("does not attach an Authorization header when no token is available", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const authenticatedFetch = createAuthenticatedFetch(
      () => null,
      () => {},
      () => {},
    );
    await authenticatedFetch("/api/v1/resource");

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).has("Authorization")).toBe(false);
  });

  it("retries once via silent refresh after a 401 and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401 } as Response)
      .mockResolvedValueOnce({ status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(authService.refresh).mockResolvedValue({ accessToken: "tok-new", expiresIn: 900 });

    const setToken = vi.fn();
    const onRefreshFailure = vi.fn();
    const authenticatedFetch = createAuthenticatedFetch(() => "tok-old", setToken, onRefreshFailure);

    const response = await authenticatedFetch("/api/v1/resource");

    expect(response.status).toBe(200);
    expect(setToken).toHaveBeenCalledWith("tok-new");
    expect(onRefreshFailure).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invokes onRefreshFailure when the silent refresh also fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 401 } as Response);
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(authService.refresh).mockRejectedValue(new Error("refresh failed"));

    const onRefreshFailure = vi.fn();
    const authenticatedFetch = createAuthenticatedFetch(() => "tok-old", () => {}, onRefreshFailure);

    const response = await authenticatedFetch("/api/v1/resource");

    expect(response.status).toBe(401);
    expect(onRefreshFailure).toHaveBeenCalledOnce();
  });
});
