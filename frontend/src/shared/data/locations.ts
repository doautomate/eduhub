export interface StateOption {
  code: string;
  name: string;
}

export interface CountryOption {
  code: string;
  name: string;
  states: StateOption[];
}

/**
 * Local mirror of the backend's curated 6-country dataset
 * (`backend/src/data/locations.py`). Used as an offline-first fallback so the
 * registration/profile forms always have usable options even if the
 * `GET /api/v1/locations/*` calls are slow, mocked, or unreachable - the
 * authoritative source of truth remains the backend API (FR-010/FR-012).
 */
export const CURATED_COUNTRIES: CountryOption[] = [
  {
    code: "IN",
    name: "India",
    states: [
      { code: "AP", name: "Andhra Pradesh" },
      { code: "DL", name: "Delhi" },
      { code: "GJ", name: "Gujarat" },
      { code: "KA", name: "Karnataka" },
      { code: "MH", name: "Maharashtra" },
      { code: "TN", name: "Tamil Nadu" },
      { code: "TG", name: "Telangana" },
      { code: "UP", name: "Uttar Pradesh" },
      { code: "WB", name: "West Bengal" },
    ],
  },
  {
    code: "US",
    name: "United States",
    states: [
      { code: "CA", name: "California" },
      { code: "FL", name: "Florida" },
      { code: "IL", name: "Illinois" },
      { code: "NY", name: "New York" },
      { code: "TX", name: "Texas" },
      { code: "WA", name: "Washington" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    states: [
      { code: "ENG", name: "England" },
      { code: "NIR", name: "Northern Ireland" },
      { code: "SCT", name: "Scotland" },
      { code: "WLS", name: "Wales" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    states: [
      { code: "AB", name: "Alberta" },
      { code: "BC", name: "British Columbia" },
      { code: "ON", name: "Ontario" },
      { code: "QC", name: "Quebec" },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    states: [
      { code: "NSW", name: "New South Wales" },
      { code: "QLD", name: "Queensland" },
      { code: "VIC", name: "Victoria" },
      { code: "WA", name: "Western Australia" },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    states: [
      { code: "BY", name: "Bavaria" },
      { code: "BE", name: "Berlin" },
      { code: "HE", name: "Hesse" },
      { code: "NW", name: "North Rhine-Westphalia" },
    ],
  },
];
