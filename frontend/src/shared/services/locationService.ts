import * as locationsApi from "./api/v1/locations";
import { CURATED_COUNTRIES, type CountryOption, type StateOption } from "../data/locations";

function isCountriesShape(body: unknown): body is { countries: { country_code: string; country_name: string }[] } {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { countries?: unknown }).countries)
  );
}

function isStatesShape(body: unknown): body is { country_code: string; states: { state_code: string; state_name: string }[] } {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { states?: unknown }).states)
  );
}

/**
 * Reference-data lookups backing the country/state SearchableSelect fields
 * (registration and profile editing). Falls back to the local curated dataset
 * whenever the API is unreachable or returns an unexpected shape, so the form
 * always has usable options (offline-first resilience).
 */
export const locationService = {
  async getCountries(): Promise<CountryOption[]> {
    try {
      const body = await locationsApi.getCountries();
      if (isCountriesShape(body)) {
        return body.countries.map((c) => ({
          code: c.country_code,
          name: c.country_name,
          states: [],
        }));
      }
    } catch {
      // fall through to local fallback
    }
    return CURATED_COUNTRIES.map(({ code, name }) => ({ code, name, states: [] }));
  },

  async getStates(countryCode: string): Promise<StateOption[]> {
    try {
      const body = await locationsApi.getStates(countryCode);
      if (isStatesShape(body)) {
        return body.states.map((s) => ({ code: s.state_code, name: s.state_name }));
      }
    } catch {
      // fall through to local fallback
    }
    const fallback = CURATED_COUNTRIES.find((c) => c.code === countryCode.toUpperCase());
    return fallback ? fallback.states : [];
  },
};
