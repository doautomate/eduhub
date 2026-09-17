export interface CountrySummaryDto {
  country_code: string;
  country_name: string;
}

export interface CountriesListResponseDto {
  countries: CountrySummaryDto[];
}

export interface StateSummaryDto {
  state_code: string;
  state_name: string;
}

export interface StatesListResponseDto {
  country_code: string;
  states: StateSummaryDto[];
}

const BASE_URL = "/api/v1/locations";

export async function getCountries(): Promise<CountriesListResponseDto> {
  const response = await fetch(`${BASE_URL}/countries`);
  if (!response.ok) {
    throw new Error(`Failed to load countries (${response.status})`);
  }
  return response.json();
}

export async function getStates(countryCode: string): Promise<StatesListResponseDto> {
  const response = await fetch(`${BASE_URL}/countries/${encodeURIComponent(countryCode)}/states`);
  if (!response.ok) {
    throw new Error(`Failed to load states for ${countryCode} (${response.status})`);
  }
  return response.json();
}
