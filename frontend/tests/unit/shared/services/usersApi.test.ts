import { describe, expect, it, vi, afterEach } from "vitest";
import { getMe, updateMe, updatePersonalDetails } from "../../../../src/shared/services/api/v1/users";
import { ApiError } from "../../../../src/shared/types/auth";

function mockFetchResponse(status: number, body: unknown, ok = status >= 200 && status < 300) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    } as Response),
  );
}

function mockFetchResponseWithBadJson(status: number, ok = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const PROFILE = {
  id: "1",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  mobile_number: "+15551234567",
  country: "IN",
  state_province: "KA",
  pin_code: "560001",
  created_at: "2026-01-01T00:00:00Z",
};

describe("users api client", () => {
  describe("getMe", () => {
    it("resolves with the profile on success and sends the bearer token", async () => {
      mockFetchResponse(200, PROFILE);
      await expect(getMe("tok")).resolves.toEqual(PROFILE);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/v1/users/me");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    });

    it("throws ApiError with the server detail on failure", async () => {
      mockFetchResponse(401, { detail: "Not authenticated." }, false);
      await expect(getMe("bad-tok")).rejects.toMatchObject({
        status: 401,
        detail: "Not authenticated.",
      });
    });

    it("falls back to a generic message when the error body is not valid JSON", async () => {
      mockFetchResponseWithBadJson(500);
      await expect(getMe("tok")).rejects.toMatchObject({
        status: 500,
        detail: "Request failed.",
      });
    });
  });

  describe("updateMe", () => {
    it("PATCHes the snake_case payload and resolves with the updated profile", async () => {
      const updated = { ...PROFILE, country: "US", state_province: "CA", pin_code: "94105" };
      mockFetchResponse(200, updated);

      await expect(
        updateMe("tok", { country: "US", stateProvince: "CA", pinCode: "94105" }),
      ).resolves.toEqual(updated);

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/v1/users/me");
      expect(init?.method).toBe("PATCH");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
      expect(JSON.parse(init?.body as string)).toEqual({
        country: "US",
        state_province: "CA",
        pin_code: "94105",
        house_number: null,
        apartment_building: null,
      });
    });

    it("includes house_number/apartment_building in the payload when provided (013-profile-popover-management)", async () => {
      mockFetchResponse(200, PROFILE);

      await updateMe("tok", {
        country: "IN",
        stateProvince: "KA",
        pinCode: "560001",
        houseNumber: "12B",
        apartmentBuilding: "Sunrise Apartments",
      });

      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect(JSON.parse(init?.body as string)).toEqual({
        country: "IN",
        state_province: "KA",
        pin_code: "560001",
        house_number: "12B",
        apartment_building: "Sunrise Apartments",
      });
    });

    it("throws ApiError with the server detail on a 422 mismatch", async () => {
      mockFetchResponse(422, { detail: "State/Province must belong to the selected country." }, false);
      await expect(
        updateMe("tok", { country: "US", stateProvince: "KA", pinCode: "560001" }),
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("updatePersonalDetails", () => {
    it("PATCHes the mobile number and resolves with the updated profile", async () => {
      const updated = { ...PROFILE, mobile_number: "+15559998888" };
      mockFetchResponse(200, updated);

      await expect(
        updatePersonalDetails("tok", { mobileNumber: "+15559998888" }),
      ).resolves.toEqual(updated);

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/v1/users/me/personal-details");
      expect(init?.method).toBe("PATCH");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
      expect(JSON.parse(init?.body as string)).toEqual({ mobile_number: "+15559998888" });
    });

    it("throws ApiError with the server detail on a 409 duplicate", async () => {
      mockFetchResponse(
        409,
        { detail: "This mobile number is already associated with another account." },
        false,
      );
      await expect(
        updatePersonalDetails("tok", { mobileNumber: "+15551110000" }),
      ).rejects.toBeInstanceOf(ApiError);
    });
  });
});
