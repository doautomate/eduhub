import { afterEach, describe, expect, it, vi } from "vitest";

import { CURATED_COUNTRIES } from "../../../../src/shared/data/locations";
import { locationService } from "../../../../src/shared/services/locationService";

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    } as Response),
  );
}

function mockFetchRejects() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("locationService.getCountries", () => {
  it("returns the API-mapped countries on a well-formed response", async () => {
    mockFetchResponse({
      countries: [{ country_code: "FR", country_name: "France" }],
    });

    await expect(locationService.getCountries()).resolves.toEqual([
      { code: "FR", name: "France", states: [] },
    ]);
  });

  it("falls back to the curated dataset when fetch rejects", async () => {
    mockFetchRejects();
    const result = await locationService.getCountries();
    expect(result).toEqual(
      CURATED_COUNTRIES.map(({ code, name }) => ({ code, name, states: [] })),
    );
  });

  it("falls back to the curated dataset when the response has an unexpected shape", async () => {
    mockFetchResponse({ unexpected: true });
    const result = await locationService.getCountries();
    expect(result).toEqual(
      CURATED_COUNTRIES.map(({ code, name }) => ({ code, name, states: [] })),
    );
  });
});

describe("locationService.getStates", () => {
  it("returns the API-mapped states on a well-formed response", async () => {
    mockFetchResponse({
      country_code: "FR",
      states: [{ state_code: "IDF", state_name: "Île-de-France" }],
    });

    await expect(locationService.getStates("FR")).resolves.toEqual([
      { code: "IDF", name: "Île-de-France" },
    ]);
  });

  it("falls back to the curated dataset's states when fetch rejects", async () => {
    mockFetchRejects();
    const result = await locationService.getStates("in");
    const curatedIndia = CURATED_COUNTRIES.find((c) => c.code === "IN");
    expect(result).toEqual(curatedIndia?.states);
  });

  it("falls back to an empty array when fetch rejects for a country not in the curated dataset", async () => {
    mockFetchRejects();
    await expect(locationService.getStates("ZZ")).resolves.toEqual([]);
  });

  it("falls back to the curated dataset when the response has an unexpected shape", async () => {
    mockFetchResponse({ unexpected: true });
    const result = await locationService.getStates("US");
    const curatedUs = CURATED_COUNTRIES.find((c) => c.code === "US");
    expect(result).toEqual(curatedUs?.states);
  });
});
